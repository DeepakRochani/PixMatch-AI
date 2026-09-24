/**
 * Event Story Recommendation Service — PIXMatch AI Phase 15
 * Recommends narrative story generation based on event classification and chapter clustering evidence.
 */

import { prisma } from '@pixmatch/database';
import { EventStoryRecommendationDTO } from '@pixmatch/types';

export class EventStoryRecommendationService {
  private db: any;

  constructor(dbClient?: any) {
    this.db = dbClient || prisma;
  }

  private static defaultInstance = new EventStoryRecommendationService();

  static async evaluateStoryReadiness(studioId: string, galleryId: string): Promise<EventStoryRecommendationDTO> {
    return this.defaultInstance.evaluateStoryReadiness(studioId, galleryId);
  }

  async evaluateStoryReadiness(studioId: string, galleryId: string): Promise<EventStoryRecommendationDTO> {
    const gallery = await this.db.gallery.findFirst({
      where: { id: galleryId, studio_id: studioId },
      include: {
        photos: { select: { id: true, created_at: true } },
        event_intelligence: {
          include: {
            chapters: true,
            story: true,
          },
        },
      },
    });

    if (!gallery) {
      throw new Error(`Gallery ${galleryId} not found for studio ${studioId}`);
    }

    const totalPhotos = (gallery.photos || []).length;
    const eventIntel = gallery.event_intelligence;
    const chapters = eventIntel?.chapters || [];
    const story = eventIntel?.story;

    const hasExistingStory = !!story && story.status === 'PUBLISHED';
    const eventType = eventIntel?.event_type || gallery.event_type || 'Event';
    const chapterCount = chapters.length;

    let canGenerate = false;
    let confidence = 0.50;
    let reason = 'Insufficient photos to generate a structured event story.';
    let suggestedTone = 'EDITORIAL';

    // Determine suggested tone based on event type
    const lowerType = (eventType || '').toLowerCase();
    if (lowerType.includes('wedding')) {
      suggestedTone = 'ELEGANT';
    } else if (lowerType.includes('birthday') || lowerType.includes('party')) {
      suggestedTone = 'CELEBRATORY';
    } else if (lowerType.includes('corporate') || lowerType.includes('conference')) {
      suggestedTone = 'EDITORIAL';
    } else if (lowerType.includes('concert') || lowerType.includes('sports')) {
      suggestedTone = 'CINEMATIC';
    } else {
      suggestedTone = 'WARM';
    }

    if (totalPhotos >= 10 || hasExistingStory) {
      canGenerate = true;
      if (chapterCount >= 2) {
        confidence = 0.90;
        reason = `Gallery has ${chapterCount} detected timeline chapters and ${totalPhotos} photos ready for story narration.`;
      } else {
        confidence = 0.70;
        reason = `Gallery has ${totalPhotos} photos. Chapters can be automatically clustered for a story narrative.`;
      }
    }

    return {
      can_generate: canGenerate,
      has_existing_story: hasExistingStory,
      event_type: eventType,
      chapter_count: chapterCount,
      confidence,
      reason,
      suggested_tone: suggestedTone,
    };
  }
}
