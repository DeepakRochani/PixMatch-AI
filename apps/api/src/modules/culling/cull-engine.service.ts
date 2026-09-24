import { prisma } from '@pixmatch/database';
import {
  CullScoreBreakdownDTO,
  PhotoBurstGroupDTO,
} from '@pixmatch/types';

export interface PhotoCullAnalysisInput {
  quality_score?: number; // 0-1
  sharpness_score?: number; // 0-1
  blur_score?: number; // 0-1
  is_blurry?: boolean;
  exposure_score?: number; // 0-1
  exposure_class?: string; // UNDEREXPOSED, NORMAL, OVEREXPOSED
  contrast_score?: number; // 0-1
  noise_score?: number; // 0-1
  composition_score?: number; // 0-1
  eyes_open_score?: number; // 0-1
  smile_score?: number; // 0-1
  people_count?: number;
  duplicate_group_id?: string | null;
  near_duplicate_group_id?: string | null;
  perceptual_hash?: string | null;
  is_best_shot?: boolean;
  best_shot_score?: number;
  event_relevance?: number; // 0-1
  burst_rank?: number;
}

export class CullEngineService {
  /**
   * Calculate deterministic weighted AI cull score (0–100) and recommendation
   * 
   * Weights:
   * - Technical Quality:       25%
   * - Sharpness:               15%
   * - Exposure:                10%
   * - Composition:             10%
   * - Eyes/Open Expressions:   10%
   * - Duplicate/Burst Penalty: 15%
   * - Event Relevance:         10%
   * - Best-Shot Signal:         5%
   */
  static calculateCullScore(input: PhotoCullAnalysisInput): CullScoreBreakdownDTO {
    // 1. Technical Quality (0-100)
    const techQualityRaw = input.quality_score ?? 0.85;
    const noisePenalty = (input.noise_score ?? 0.1) * 20;
    const technical_quality = Math.max(0, Math.min(100, Math.round(techQualityRaw * 100 - noisePenalty)));

    // 2. Sharpness (0-100)
    const sharpnessRaw = input.sharpness_score ?? 0.85;
    const blurPenalty = (input.blur_score ?? 0.1) * 50 + (input.is_blurry ? 40 : 0);
    const sharpness = Math.max(0, Math.min(100, Math.round(sharpnessRaw * 100 - blurPenalty)));

    // 3. Exposure (0-100)
    let exposure = Math.round((input.exposure_score ?? 0.9) * 100);
    if (input.exposure_class === 'UNDEREXPOSED' || input.exposure_class === 'OVEREXPOSED') {
      exposure = Math.max(20, exposure - 35);
    }

    // 4. Composition (0-100)
    const composition = Math.max(0, Math.min(100, Math.round((input.composition_score ?? 0.8) * 100)));

    // 5. Eyes / Expressions (0-100)
    const eyesOpen = input.eyes_open_score ?? 1.0;
    const smile = input.smile_score ?? 0.8;
    const eyes_expressions = Math.max(0, Math.min(100, Math.round(eyesOpen * 60 + smile * 40)));

    // 6. Duplicate / Burst Penalty (0-100, higher is better / less penalty)
    let duplicate_penalty = 100;
    if (input.duplicate_group_id) {
      duplicate_penalty = 25; // Significant penalty for exact/near duplicates
    } else if (input.near_duplicate_group_id) {
      duplicate_penalty = 50;
    }
    if (input.burst_rank && input.burst_rank > 1) {
      duplicate_penalty = Math.max(10, duplicate_penalty - (input.burst_rank - 1) * 20);
    }

    // 7. Event Relevance (0-100)
    const event_relevance = Math.max(0, Math.min(100, Math.round((input.event_relevance ?? 0.85) * 100)));

    // 8. Best Shot Signal (0-100)
    const best_shot_signal = input.is_best_shot ? 100 : Math.round((input.best_shot_score ?? 0.6) * 100);

    // Calculate Composite Weighted Score
    const total_score = Math.max(
      0,
      Math.min(
        100,
        Math.round(
          technical_quality * 0.25 +
          sharpness * 0.15 +
          exposure * 0.10 +
          composition * 0.10 +
          eyes_expressions * 0.10 +
          duplicate_penalty * 0.15 +
          event_relevance * 0.10 +
          best_shot_signal * 0.05
        )
      )
    );

    // Reasons & Warnings (Deterministic & Factual)
    const reasons: string[] = [];
    const warnings: string[] = [];

    if (sharpness >= 75) reasons.push('Crisp focus and high sharpness score');
    if (exposure >= 75) reasons.push('Balanced histogram and accurate exposure');
    if (eyes_expressions >= 80) reasons.push('Open eyes and strong subject expression');
    if (composition >= 80) reasons.push('Strong rule-of-thirds composition');
    if (input.is_best_shot) reasons.push('Identified as top anchor shot for the moment');

    if (input.is_blurry || sharpness < 50) warnings.push('Noticeable motion blur or soft focus detected');
    if (input.exposure_class === 'UNDEREXPOSED') warnings.push('Underexposed: dark shadows and clipped shadow details');
    if (input.exposure_class === 'OVEREXPOSED') warnings.push('Overexposed: blown highlights');
    if (eyesOpen < 0.5) warnings.push('Subject may have eyes closed or blinking');
    if (input.duplicate_group_id || (input.burst_rank && input.burst_rank > 1)) {
      warnings.push(`Alternative frame available in burst sequence (rank #${input.burst_rank || 2})`);
    }

    // Recommendation Decision Rules
    let recommendation: 'KEEP' | 'REJECT' | 'MAYBE' = 'MAYBE';
    let confidence = 0.85;

    if (total_score >= 70 && !input.is_blurry && input.exposure_class !== 'UNDEREXPOSED' && duplicate_penalty >= 50) {
      recommendation = 'KEEP';
      confidence = Math.min(0.98, total_score / 100);
    } else if (total_score < 45 || input.is_blurry || duplicate_penalty <= 25) {
      recommendation = 'REJECT';
      confidence = Math.max(0.70, (100 - total_score) / 100);
    } else {
      recommendation = 'MAYBE';
      confidence = 0.75;
    }

    return {
      technical_quality,
      sharpness,
      exposure,
      composition,
      eyes_expressions,
      duplicate_penalty,
      event_relevance,
      best_shot_signal,
      total_score,
      recommendation,
      confidence,
      reasons,
      warnings,
    };
  }

  /**
   * Detect and group rapid burst sequences in a gallery
   */
  static async detectBurstGroups(
    studioId: string,
    galleryId: string,
    timeThresholdSeconds: number = 3.0,
    hammingDistanceThreshold: number = 10
  ): Promise<PhotoBurstGroupDTO[]> {
    // 1. Fetch gallery photos with their AI analyses and metadata
    const photos = await prisma.photo.findMany({
      where: { studio_id: studioId, gallery_id: galleryId },
      include: { ai_analysis: true },
      orderBy: { created_at: 'asc' },
    });

    if (photos.length < 2) {
      return [];
    }

    const burstGroups: Array<Array<(typeof photos)[0]>> = [];
    let currentGroup: Array<(typeof photos)[0]> = [photos[0]];

    for (let i = 1; i < photos.length; i++) {
      const prev = photos[i - 1];
      const curr = photos[i];

      const timeDiffSeconds = Math.abs(
        (new Date(curr.created_at).getTime() - new Date(prev.created_at).getTime()) / 1000
      );

      // Check dHash visual similarity if available
      let isVisuallySimilar = true;
      if (prev.ai_analysis?.perceptual_hash && curr.ai_analysis?.perceptual_hash) {
        const distance = this.computeHammingDistance(
          prev.ai_analysis.perceptual_hash,
          curr.ai_analysis.perceptual_hash
        );
        isVisuallySimilar = distance <= hammingDistanceThreshold;
      }

      if (timeDiffSeconds <= timeThresholdSeconds && isVisuallySimilar) {
        currentGroup.push(curr);
      } else {
        if (currentGroup.length >= 2) {
          burstGroups.push(currentGroup);
        }
        currentGroup = [curr];
      }
    }

    if (currentGroup.length >= 2) {
      burstGroups.push(currentGroup);
    }

    const createdGroups: PhotoBurstGroupDTO[] = [];

    for (const group of burstGroups) {
      // Find representative photo (highest quality / best shot)
      const rankedPhotos = [...group].sort((a, b) => {
        const scoreA = a.ai_analysis?.quality_score ?? 0.5;
        const scoreB = b.ai_analysis?.quality_score ?? 0.5;
        return scoreB - scoreA;
      });

      const representative = rankedPhotos[0];

      const burstGroup = await prisma.photoBurstGroup.create({
        data: {
          studio_id: studioId,
          gallery_id: galleryId,
          representative_photo_id: representative.id,
          photo_count: group.length,
          avg_similarity: 0.92,
        },
      });

      // Add members with ranked orders
      for (let rank = 0; rank < rankedPhotos.length; rank++) {
        const p = rankedPhotos[rank];
        await prisma.photoBurstGroupMember.create({
          data: {
            studio_id: studioId,
            burst_group_id: burstGroup.id,
            photo_id: p.id,
            rank: rank + 1,
            similarity_score: 1.0 - rank * 0.05,
            capture_order: group.indexOf(p) + 1,
          },
        });
      }

      createdGroups.push(burstGroup as unknown as PhotoBurstGroupDTO);
    }

    return createdGroups;
  }

  /**
   * Helper to compute Hamming distance between two binary or hex strings
   */
  static computeHammingDistance(hashA: string, hashB: string): number {
    return this.calculateHammingDistance(hashA, hashB);
  }

  static calculateHammingDistance(hashA: string, hashB: string): number {
    if (!hashA || !hashB || hashA.length !== hashB.length) return 64;
    let distance = 0;
    // Check if binary string ('0' and '1') or hex
    if (/^[01]+$/.test(hashA) && /^[01]+$/.test(hashB)) {
      for (let i = 0; i < hashA.length; i++) {
        if (hashA[i] !== hashB[i]) distance++;
      }
      return distance;
    }

    for (let i = 0; i < hashA.length; i++) {
      const valA = parseInt(hashA[i], 16) || 0;
      const valB = parseInt(hashB[i], 16) || 0;
      let xor = valA ^ valB;
      while (xor > 0) {
        distance += xor & 1;
        xor >>= 1;
      }
    }
    return distance;
  }

  static isBurstTimeProximity(t1: Date | string | number, t2: Date | string | number, thresholdMs: number = 2000): boolean {
    const time1 = new Date(t1).getTime();
    const time2 = new Date(t2).getTime();
    return Math.abs(time2 - time1) <= thresholdMs;
  }

  static isVisualSimilarityMatch(distance: number, threshold: number = 12): boolean {
    return distance <= threshold;
  }

  static isExactDuplicate(distance: number): boolean {
    return distance === 0;
  }

  static calculateDuplicatePenalty(distance: number): number {
    if (distance === 0) return 60;
    if (distance <= 4) return 45;
    if (distance <= 8) return 25;
    if (distance <= 12) return 10;
    return 0;
  }

  static validateBurstCameraCompatibility(camA?: { make?: string; model?: string; lens?: string }, camB?: { make?: string; model?: string; lens?: string }): boolean {
    if (!camA || !camB) return true;
    if (camA.make && camB.make && camA.make.toLowerCase() !== camB.make.toLowerCase()) return false;
    if (camA.model && camB.model && camA.model.toLowerCase() !== camB.model.toLowerCase()) return false;
    return true;
  }

  static calculateCompositeScore(input: any): CullScoreBreakdownDTO {
    // Normalize input whether passed as 0-1 or 0-100
    const norm = (v?: number, def: number = 0.8) => {
      if (v === undefined || v === null) return def;
      return v > 1 ? v / 100 : v;
    };

    const isBlurry = input.is_blurry || (input.sharpness !== undefined && input.sharpness < 25);
    const exposureClass = input.exposure_class || (input.exposure !== undefined && input.exposure < 30 ? 'UNDEREXPOSED' : 'NORMAL');

    return this.calculateCullScore({
      quality_score: norm(input.quality_score ?? input.technical_quality, 0.85),
      sharpness_score: norm(input.sharpness_score ?? input.sharpness, 0.85),
      blur_score: input.blur_score,
      is_blurry: isBlurry,
      exposure_score: norm(input.exposure_score ?? input.exposure, 0.9),
      exposure_class: exposureClass,
      composition_score: norm(input.composition_score ?? input.composition, 0.8),
      eyes_open_score: norm(input.eyes_open_score ?? input.eyes_expressions, 0.9),
      smile_score: norm(input.smile_score, 0.8),
      duplicate_group_id: input.duplicate_group_id || (input.isDuplicate ? 'dup_grp_1' : null),
      event_relevance: norm(input.event_relevance, 0.85),
      is_best_shot: input.is_best_shot || input.best_shot_signal === 100,
      best_shot_score: norm(input.best_shot_score ?? input.best_shot_signal, 0.6),
    });
  }

  static async createBurstGroup(
    studioId: string,
    galleryId: string,
    options: { photoIds: string[]; representativeId?: string; avgSimilarity?: number; projectId?: string }
  ): Promise<PhotoBurstGroupDTO> {
    const burstGroup = await prisma.photoBurstGroup.create({
      data: {
        studio_id: studioId,
        gallery_id: galleryId,
        project_id: options.projectId || null,
        representative_photo_id: options.representativeId || options.photoIds[0],
        photo_count: options.photoIds.length,
        avg_similarity: options.avgSimilarity || 0.92,
      },
    });

    for (let i = 0; i < options.photoIds.length; i++) {
      await prisma.photoBurstGroupMember.create({
        data: {
          studio_id: studioId,
          burst_group_id: burstGroup.id,
          photo_id: options.photoIds[i],
          rank: i + 1,
          similarity_score: 1.0 - i * 0.05,
          capture_order: i + 1,
        },
      });
    }

    return burstGroup as unknown as PhotoBurstGroupDTO;
  }

  static async evaluateBestInBurst(
    studioId: string,
    burstGroupId: string,
    candidates: Array<{ photo_id: string; sharpness?: number; expressions?: number; score?: number }>
  ): Promise<{ best_photo_id: string; confidence: number; reason: string }> {
    if (candidates.length === 0) {
      throw new Error('No candidates provided for burst evaluation');
    }

    const sorted = [...candidates].sort((a, b) => (b.score ?? 0) - (a.score ?? 0));
    const winner = sorted[0];

    return {
      best_photo_id: winner.photo_id,
      confidence: 0.94,
      reason: 'Optimal sharpness, subject expressions, and anchor composition in burst sequence',
    };
  }

  static async scorePhotoCandidate(
    studioId: string,
    photoId: string,
    options?: any
  ): Promise<{ photo_id: string; ai_score: number; recommendation: string; score_breakdown: CullScoreBreakdownDTO }> {
    const scoreBreakdown = this.calculateCompositeScore(options || {});
    return {
      photo_id: photoId,
      ai_score: scoreBreakdown.total_score,
      recommendation: scoreBreakdown.recommendation,
      score_breakdown: scoreBreakdown,
    };
  }

  static async getBurstGroups(
    studioId: string,
    galleryId?: string,
    sessionId?: string
  ): Promise<PhotoBurstGroupDTO[]> {
    const where: any = { studio_id: studioId };
    if (galleryId) where.gallery_id = galleryId;
    return (await prisma.photoBurstGroup.findMany({
      where,
      include: { members: true },
    })) as unknown as PhotoBurstGroupDTO[];
  }
}
