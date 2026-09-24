/**
 * Smart Album Recommendation Service — PIXMatch AI Phase 15
 * Analyzes gallery tags, scene categories, face groups, and event intelligence to suggest data-grounded Smart Albums.
 */

import { prisma } from '@pixmatch/database';
import { SmartAlbumSuggestionDTO } from '@pixmatch/types';

export class SmartAlbumRecommendationService {
  private db: any;

  constructor(dbClient?: any) {
    this.db = dbClient || prisma;
  }

  private static defaultInstance = new SmartAlbumRecommendationService();

  static async suggestAlbums(studioId: string, galleryId: string): Promise<SmartAlbumSuggestionDTO[]> {
    return this.defaultInstance.suggestAlbums(studioId, galleryId);
  }

  async suggestAlbums(studioId: string, galleryId: string): Promise<SmartAlbumSuggestionDTO[]> {
    const gallery = await this.db.gallery.findFirst({
      where: { id: galleryId, studio_id: studioId },
      include: {
        photos: {
          include: {
            ai_analysis: true,
            face_detections: { select: { id: true } },
          },
        },
        smart_albums: { select: { name: true, type: true } },
        event_intelligence: { include: { chapters: true } },
      },
    });

    if (!gallery) {
      throw new Error(`Gallery ${galleryId} not found for studio ${studioId}`);
    }

    const photos = gallery.photos || [];
    if (photos.length === 0) return [];

    const existingNames = new Set((gallery.smart_albums || []).map((a: any) => a.name.toLowerCase()));
    const suggestions: SmartAlbumSuggestionDTO[] = [];

    // 1. "Highlights / Best Shots" suggestion
    const bestShots = photos.filter((p: any) => p.ai_analysis?.is_best_shot || (p.ai_analysis?.quality_score ?? 0) >= 0.82);
    if (bestShots.length >= 5 && !existingNames.has('highlights') && !existingNames.has('best shots')) {
      suggestions.push({
        type: 'QUALITY',
        name: 'Highlights & Best Shots',
        reason: 'Curated collection of the highest quality and best composed images.',
        photo_count: bestShots.length,
        confidence: 0.95,
        evidence: [`${bestShots.length} photos with quality score >= 82%`],
      });
    }

    // 2. "People & Portraits" suggestion
    const peoplePhotos = photos.filter((p: any) => (p.face_detections?.length || 0) > 0 || p.ai_analysis?.scene_category?.toLowerCase()?.includes('portrait'));
    if (peoplePhotos.length >= 8 && !existingNames.has('portraits') && !existingNames.has('people')) {
      suggestions.push({
        type: 'PEOPLE',
        name: 'Portraits & People',
        reason: 'Photos containing clearly identified guests, couples, or portraits.',
        photo_count: peoplePhotos.length,
        confidence: 0.92,
        evidence: [`${peoplePhotos.length} photos with detected faces or portrait scene tags`],
      });
    }

    // 3. "Group Photos" suggestion
    const groupPhotos = photos.filter((p: any) => (p.face_detections?.length || 0) >= 3);
    if (groupPhotos.length >= 4 && !existingNames.has('group photos')) {
      suggestions.push({
        type: 'PEOPLE',
        name: 'Group Photos',
        reason: 'Photos containing group gatherings with 3 or more people.',
        photo_count: groupPhotos.length,
        confidence: 0.88,
        evidence: [`${groupPhotos.length} photos with 3+ faces detected`],
      });
    }

    // 4. Chapter-based suggestions
    const chapters = gallery.event_intelligence?.chapters || [];
    for (const chapter of chapters) {
      if (chapter.photo_count >= 5 && !existingNames.has(chapter.title.toLowerCase())) {
        suggestions.push({
          type: 'EVENT_CHAPTER',
          name: chapter.title,
          reason: `Auto-clustered chronological event phase: ${chapter.title}.`,
          photo_count: chapter.photo_count,
          confidence: Math.round(chapter.confidence_score * 100) / 100,
          evidence: [`Event chapter detection with ${chapter.photo_count} photos`],
        });
      }
    }

    // 5. Scene Tag based suggestions (Ceremony, Reception, Sunset, Decor)
    const tagFrequencies = new Map<string, number>();
    for (const photo of photos) {
      const tags = photo.ai_analysis?.tags || [];
      for (const tag of tags) {
        const lower = String(tag).toLowerCase().trim();
        tagFrequencies.set(lower, (tagFrequencies.get(lower) || 0) + 1);
      }
    }

    const prominentThemes = ['ceremony', 'reception', 'dance', 'decor', 'sunset', 'speeches', 'party'];
    for (const theme of prominentThemes) {
      const count = tagFrequencies.get(theme) || 0;
      const themeTitle = theme.charAt(0).toUpperCase() + theme.slice(1);
      if (count >= 6 && !existingNames.has(theme) && !existingNames.has(themeTitle.toLowerCase())) {
        suggestions.push({
          type: 'SCENE',
          name: themeTitle,
          reason: `High concentration of ${theme} moments detected in photos.`,
          photo_count: count,
          confidence: 0.85,
          evidence: [`${count} photos tagged with "${theme}"`],
        });
      }
    }

    return suggestions;
  }
}
