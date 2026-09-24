/**
 * Highlight Ranker Service — PIXMatch AI Phase 13
 * 
 * Computes multi-signal quality, emotional valence, narrative prominence,
 * burst/duplicate suppression, and diversity distribution across event chapters.
 */

import { Photo, EventChapter, ChapterCategory, ConfidenceLevel } from '@prisma/client';

export interface HighlightCandidate {
  photo: Photo;
  qualityScore: number;
  faceCount: number;
  smileCount: number;
  sharpnessScore: number;
  aestheticScore: number;
  momentImportance: number;
  compositeScore: number;
  duplicateGroupId: string | null;
  chapterId: string | null;
  category: ChapterCategory;
  tags: string[];
}

export interface HighlightRankerOptions {
  topCount?: number;
  maxPerChapter?: number;
  duplicateSuppression?: boolean;
}

export class HighlightRankerService {
  /**
   * Ranks photos across the entire event and selected chapters to select the best highlights.
   */
  public selectHighlights(
    photos: Photo[],
    chapters: (EventChapter & { photo_ids: string[] })[],
    options: HighlightRankerOptions = {}
  ): {
    rankedCandidates: HighlightCandidate[];
    recommendedCoverPhotoId: string | null;
    chapterHighlightsMap: Record<string, string[]>;
  } {
    const topCount = options.topCount || 25;
    const maxPerChapter = options.maxPerChapter || 6;
    const duplicateSuppression = options.duplicateSuppression !== false;

    // 1. Map photo ID to chapter & category
    const photoToChapterMap = new Map<string, { chapterId: string; category: ChapterCategory }>();
    for (const ch of chapters) {
      for (const pId of ch.photo_ids) {
        photoToChapterMap.set(pId, { chapterId: ch.id, category: ch.category });
      }
    }

    // 2. Score each photo
    const candidates: HighlightCandidate[] = photos.map((p) => {
      const chInfo = photoToChapterMap.get(p.id);
      const chapterId = chInfo?.chapterId || null;
      const category = chInfo?.category || ChapterCategory.OTHER;

      // Extract Phase 12 quality & face metadata if available
      const meta = ((p as any).metadata as Record<string, any>) || {};
      const sharpness = typeof meta.sharpness === 'number' ? meta.sharpness : 0.7;
      const aesthetic = typeof meta.aesthetic_score === 'number' ? meta.aesthetic_score : 0.7;
      const faceCount = typeof meta.face_count === 'number' ? meta.face_count : (meta.faces ? (meta.faces as any[]).length : 0);
      const smileCount = typeof meta.smile_count === 'number' ? meta.smile_count : 0;
      const duplicateGroupId = (p as any).duplicate_group_id || meta.duplicate_group_id || null;

      // Moment importance weighting based on chapter category & content
      let momentWeight = 1.0;
      if (category === ChapterCategory.CEREMONY) {
        momentWeight = 1.35;
      } else if (category === ChapterCategory.PORTRAIT || category === ChapterCategory.COUPLE) {
        momentWeight = 1.25;
      } else if (category === ChapterCategory.RECEPTION || category === ChapterCategory.CELEBRATION || category === ChapterCategory.DANCE) {
        momentWeight = 1.15;
      } else if (category === ChapterCategory.PREPARATION || category === ChapterCategory.RITUAL) {
        momentWeight = 1.05;
      }

      // Emotional valence boost
      const emotionalValence = Math.min(1.0, (smileCount * 0.15) + (faceCount > 0 ? 0.2 : 0.05));
      const qualityScore = (sharpness * 0.4) + (aesthetic * 0.6);

      // Composite scoring formula (0.0 to 1.0 normalized)
      const compositeScore = Math.min(
        1.0,
        ((qualityScore * 0.4) + (emotionalValence * 0.3) + (0.3)) * momentWeight
      );

      const tags: string[] = [];
      if (qualityScore > 0.8) tags.push('HIGH_QUALITY');
      if (smileCount > 0) tags.push('JOYFUL');
      if (faceCount > 2) tags.push('GROUP');
      if (faceCount === 1 || faceCount === 2) tags.push('HERO_SUBJECT');

      return {
        photo: p,
        qualityScore,
        faceCount,
        smileCount,
        sharpnessScore: sharpness,
        aestheticScore: aesthetic,
        momentImportance: momentWeight,
        compositeScore,
        duplicateGroupId,
        chapterId,
        category,
        tags,
      };
    });

    // 3. Sort descending by composite score
    candidates.sort((a, b) => b.compositeScore - a.compositeScore);

    // 4. Select top candidates with duplicate suppression & chapter diversity quota
    const selected: HighlightCandidate[] = [];
    const seenDuplicateGroups = new Set<string>();
    const chapterCountMap: Record<string, number> = {};
    const chapterHighlightsMap: Record<string, string[]> = {};

    for (const c of candidates) {
      if (selected.length >= topCount) break;

      // Duplicate suppression
      if (duplicateSuppression && c.duplicateGroupId) {
        if (seenDuplicateGroups.has(c.duplicateGroupId)) {
          continue;
        }
      }

      // Chapter quota
      if (c.chapterId) {
        const currentCount = chapterCountMap[c.chapterId] || 0;
        if (currentCount >= maxPerChapter && selected.length < topCount * 0.8) {
          // Allow overflow only if we run low on candidates overall
          continue;
        }
        chapterCountMap[c.chapterId] = currentCount + 1;
        if (!chapterHighlightsMap[c.chapterId]) chapterHighlightsMap[c.chapterId] = [];
        chapterHighlightsMap[c.chapterId].push(c.photo.id);
      }

      if (c.duplicateGroupId) {
        seenDuplicateGroups.add(c.duplicateGroupId);
      }

      selected.push(c);
    }

    // 5. Recommended cover photo (highest aesthetic score with at least 1 face if available)
    let recommendedCoverPhotoId: string | null = null;
    const heroPortrait = selected.find((c) => c.faceCount >= 1 && c.aestheticScore >= 0.75);
    if (heroPortrait) {
      recommendedCoverPhotoId = heroPortrait.photo.id;
    } else if (selected.length > 0) {
      recommendedCoverPhotoId = selected[0].photo.id;
    } else if (photos.length > 0) {
      recommendedCoverPhotoId = photos[0].id;
    }

    return {
      rankedCandidates: selected,
      recommendedCoverPhotoId,
      chapterHighlightsMap,
    };
  }
}
