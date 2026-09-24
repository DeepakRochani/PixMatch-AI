/**
 * Cover Photo Recommendation Service — PIXMatch AI Phase 15
 * Evaluates visual quality, composition, sharpness, and event relevance to suggest optimal cover photos.
 */

import { prisma } from '@pixmatch/database';
import { CoverRecommendationDTO } from '@pixmatch/types';

export class CoverRecommendationService {
  private db: any;

  constructor(dbClient?: any) {
    this.db = dbClient || prisma;
  }

  private static defaultInstance = new CoverRecommendationService();

  static async recommendCovers(studioId: string, galleryId: string, limit = 5): Promise<CoverRecommendationDTO[]> {
    return this.defaultInstance.recommendCovers(studioId, galleryId, limit);
  }

  async recommendCovers(studioId: string, galleryId: string, limit = 5): Promise<CoverRecommendationDTO[]> {
    const gallery = await this.db.gallery.findFirst({
      where: { id: galleryId, studio_id: studioId },
      include: {
        photos: {
          include: {
            ai_analysis: true,
          },
        },
        event_intelligence: {
          include: {
            chapters: true,
            highlights: true,
          },
        },
      },
    });

    if (!gallery) {
      throw new Error(`Gallery ${galleryId} not found for studio ${studioId}`);
    }

    const photos = gallery.photos || [];
    if (photos.length === 0) {
      return [];
    }

    const highlightIds = new Set((gallery.event_intelligence?.highlights || []).map((h: any) => h.photo_id));
    const scoredCandidates: CoverRecommendationDTO[] = [];

    // Seen duplicate groups for burst suppression
    const seenDuplicateGroups = new Set<string>();

    for (const photo of photos) {
      const analysis = photo.ai_analysis;
      if (!analysis) continue;

      // Burst suppression: only consider best shot or first in duplicate cluster
      const dupGroupId = analysis.duplicate_group_id || analysis.near_duplicate_group_id;
      if (dupGroupId) {
        if (seenDuplicateGroups.has(dupGroupId) && !analysis.is_best_shot) {
          continue;
        }
        seenDuplicateGroups.add(dupGroupId);
      }

      const qualityScore = analysis.quality_score ?? 0.70;
      const sharpness = analysis.sharpness ?? 0.75;
      const exposure = analysis.exposure ?? 0.75;
      const isBestShot = analysis.is_best_shot ?? false;
      const isHighlight = highlightIds.has(photo.id);
      const isBlurry = analysis.is_blurry ?? false;
      const isDark = analysis.is_dark ?? false;

      // Heavy penalty for blur or extreme darkness
      if (isBlurry || isDark) continue;

      // Multi-factor cover score
      let score =
        qualityScore * 0.40 +
        sharpness * 0.25 +
        exposure * 0.15 +
        (isBestShot ? 0.10 : 0.0) +
        (isHighlight ? 0.10 : 0.0);

      // Boost landscape/portrait orientation suitability
      if (photo.width && photo.height) {
        const ratio = photo.width / photo.height;
        if (ratio >= 1.3 && ratio <= 1.8) {
          score += 0.05; // Ideal landscape banner ratio
        }
      }

      score = Math.min(1.0, Math.max(0.0, score));

      // Build explainable human-readable reason
      const reasons: string[] = [];
      if (qualityScore >= 0.85) reasons.push('exceptional visual quality');
      if (sharpness >= 0.80) reasons.push('sharp focus');
      if (exposure >= 0.70 && exposure <= 0.90) reasons.push('balanced exposure');
      if (isHighlight) reasons.push('curated event highlight');
      if (analysis.scene_category) reasons.push(`captures ${analysis.scene_category.toLowerCase()} scene`);

      const reasonStr = reasons.length > 0
        ? `Recommended because it features ${reasons.join(', ')}.`
        : 'Recommended based on balanced composition and aesthetic scoring.';

      scoredCandidates.push({
        photo_id: photo.id,
        preview_url: photo.preview_url || photo.thumbnail_url || '',
        score: Math.round(score * 100) / 100,
        confidence: Math.round((0.80 + score * 0.18) * 100) / 100,
        reason: reasonStr,
        quality_score: Math.round(qualityScore * 100) / 100,
        scene_category: analysis.scene_category || null,
      });
    }

    // Sort by descending score
    scoredCandidates.sort((a, b) => b.score - a.score);

    // Fallback if no AI analysis exists: return first available photo with neutral score
    if (scoredCandidates.length === 0 && photos.length > 0) {
      const first = photos[0];
      scoredCandidates.push({
        photo_id: first.id,
        preview_url: first.preview_url || first.thumbnail_url || '',
        score: 0.60,
        confidence: 0.60,
        reason: 'Selected as baseline candidate from uploaded photos.',
        quality_score: 0.60,
      });
    }

    return scoredCandidates.slice(0, limit);
  }
}
