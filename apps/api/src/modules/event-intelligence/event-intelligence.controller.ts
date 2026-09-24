/**
 * Event Intelligence Controller — PIXMatch AI Phase 13
 */

import { FastifyRequest, FastifyReply } from 'fastify';
import { EventIntelligenceService } from './event-intelligence.service.js';
import { EventType, StoryTone, StoryLength, ChapterCategory, StoryStatus } from '@prisma/client';

export class EventIntelligenceController {
  private static service = new EventIntelligenceService();

  /**
   * POST /api/v1/galleries/:galleryId/event-intelligence/analyze
   * Initiates or runs full Event Intelligence analysis for a gallery.
   */
  static async analyzeGallery(request: FastifyRequest, reply: FastifyReply) {
    const user = (request as any).user;
    const { galleryId } = request.params as { galleryId: string };
    const body = (request.body as any) || {};

    if (!user || !user.studioId) {
      return reply.status(401).send({ statusCode: 401, error: 'Unauthorized', message: 'Studio authentication required' });
    }

    try {
      const result = await EventIntelligenceController.service.analyzeGallery(user.studioId, galleryId, {
        forceReanalyze: body.forceReanalyze ?? true,
        minGapMinutes: body.minGapMinutes,
        maxGapMinutes: body.maxGapMinutes,
        targetChapterCount: body.targetChapterCount,
        storyTone: body.storyTone,
        storyLength: body.storyLength,
      });

      return reply.status(200).send({
        success: true,
        data: result,
      });
    } catch (err: any) {
      request.log.error(err, 'Event intelligence analysis failed');
      return reply.status(err.message?.includes('not found') ? 404 : 500).send({
        statusCode: err.message?.includes('not found') ? 404 : 500,
        error: 'Event Analysis Failed',
        message: err.message || 'Failed to analyze gallery event intelligence',
      });
    }
  }

  /**
   * GET /api/v1/galleries/:galleryId/event-intelligence
   * Retrieves full Event Intelligence (type, confidence, timeline, chapters, highlights, stories).
   */
  static async getEventIntelligence(request: FastifyRequest, reply: FastifyReply) {
    const user = (request as any).user;
    const { galleryId } = request.params as { galleryId: string };

    if (!user || !user.studioId) {
      return reply.status(401).send({ statusCode: 401, error: 'Unauthorized', message: 'Studio authentication required' });
    }

    try {
      const result = await EventIntelligenceController.service.getEventIntelligence(user.studioId, galleryId);
      if (!result) {
        return reply.status(404).send({
          statusCode: 404,
          error: 'Not Found',
          message: 'No event intelligence record found for this gallery',
        });
      }

      return reply.status(200).send({
        success: true,
        data: result,
      });
    } catch (err: any) {
      return reply.status(500).send({
        statusCode: 500,
        error: 'Internal Server Error',
        message: err.message || 'Failed to fetch event intelligence',
      });
    }
  }

  /**
   * PATCH /api/v1/galleries/:galleryId/event-intelligence
   * Updates manual overrides (e.g. manual event type).
   */
  static async updateEventIntelligence(request: FastifyRequest, reply: FastifyReply) {
    const user = (request as any).user;
    const { galleryId } = request.params as { galleryId: string };
    const body = (request.body as { manual_event_type?: EventType }) || {};

    if (!user || !user.studioId) {
      return reply.status(401).send({ statusCode: 401, error: 'Unauthorized', message: 'Studio authentication required' });
    }

    try {
      const result = await EventIntelligenceController.service.updateEventIntelligence(user.studioId, galleryId, body);
      return reply.status(200).send({
        success: true,
        data: result,
      });
    } catch (err: any) {
      return reply.status(500).send({
        statusCode: 500,
        error: 'Update Failed',
        message: err.message || 'Failed to update event intelligence',
      });
    }
  }

  /**
   * PATCH /api/v1/galleries/:galleryId/event-intelligence/chapters/:chapterId
   * Updates chapter title, category, cover photo, visibility.
   */
  static async updateChapter(request: FastifyRequest, reply: FastifyReply) {
    const user = (request as any).user;
    const { galleryId, chapterId } = request.params as { galleryId: string; chapterId: string };
    const body = (request.body as any) || {};

    if (!user || !user.studioId) {
      return reply.status(401).send({ statusCode: 401, error: 'Unauthorized', message: 'Studio authentication required' });
    }

    try {
      const result = await EventIntelligenceController.service.updateChapter(user.studioId, galleryId, chapterId, body);
      return reply.status(200).send({
        success: true,
        data: result,
      });
    } catch (err: any) {
      return reply.status(500).send({
        statusCode: 500,
        error: 'Chapter Update Failed',
        message: err.message || 'Failed to update chapter',
      });
    }
  }

  /**
   * POST /api/v1/galleries/:galleryId/event-intelligence/chapters/merge
   * Merges multiple chapters into one.
   */
  static async mergeChapters(request: FastifyRequest, reply: FastifyReply) {
    const user = (request as any).user;
    const { galleryId } = request.params as { galleryId: string };
    const { sourceChapterIds, newTitle, newCategory } = (request.body as {
      sourceChapterIds: string[];
      newTitle: string;
      newCategory: ChapterCategory;
    }) || {};

    if (!user || !user.studioId) {
      return reply.status(401).send({ statusCode: 401, error: 'Unauthorized', message: 'Studio authentication required' });
    }

    try {
      const result = await EventIntelligenceController.service.mergeChapters(
        user.studioId,
        galleryId,
        sourceChapterIds,
        newTitle,
        newCategory
      );
      return reply.status(200).send({
        success: true,
        data: result,
      });
    } catch (err: any) {
      return reply.status(400).send({
        statusCode: 400,
        error: 'Chapter Merge Failed',
        message: err.message || 'Failed to merge chapters',
      });
    }
  }

  /**
   * POST /api/v1/galleries/:galleryId/event-intelligence/chapters/:chapterId/split
   * Splits a chapter at a given photo.
   */
  static async splitChapter(request: FastifyRequest, reply: FastifyReply) {
    const user = (request as any).user;
    const { galleryId, chapterId } = request.params as { galleryId: string; chapterId: string };
    const { splitPhotoId, newChapterTitle } = (request.body as {
      splitPhotoId: string;
      newChapterTitle: string;
    }) || {};

    if (!user || !user.studioId) {
      return reply.status(401).send({ statusCode: 401, error: 'Unauthorized', message: 'Studio authentication required' });
    }

    try {
      const result = await EventIntelligenceController.service.splitChapter(
        user.studioId,
        galleryId,
        chapterId,
        splitPhotoId,
        newChapterTitle
      );
      return reply.status(200).send({
        success: true,
        data: result,
      });
    } catch (err: any) {
      return reply.status(400).send({
        statusCode: 400,
        error: 'Chapter Split Failed',
        message: err.message || 'Failed to split chapter',
      });
    }
  }

  /**
   * PATCH /api/v1/galleries/:galleryId/event-intelligence/highlights/:highlightId
   * Pinned or suppressed toggling.
   */
  static async updateHighlight(request: FastifyRequest, reply: FastifyReply) {
    const user = (request as any).user;
    const { galleryId, highlightId } = request.params as { galleryId: string; highlightId: string };
    const { isPinned, isSuppressed } = (request.body as { isPinned?: boolean; isSuppressed?: boolean }) || {};

    if (!user || !user.studioId) {
      return reply.status(401).send({ statusCode: 401, error: 'Unauthorized', message: 'Studio authentication required' });
    }

    try {
      let result;
      if (typeof isPinned === 'boolean') {
        result = await EventIntelligenceController.service.toggleHighlightPin(user.studioId, galleryId, highlightId, isPinned);
      } else if (typeof isSuppressed === 'boolean') {
        result = await EventIntelligenceController.service.toggleHighlightSuppression(user.studioId, galleryId, highlightId, isSuppressed);
      } else {
        return reply.status(400).send({ statusCode: 400, error: 'Bad Request', message: 'Provide isPinned or isSuppressed' });
      }

      return reply.status(200).send({
        success: true,
        data: result,
      });
    } catch (err: any) {
      return reply.status(500).send({
        statusCode: 500,
        error: 'Highlight Update Failed',
        message: err.message || 'Failed to update highlight',
      });
    }
  }

  /**
   * POST /api/v1/galleries/:galleryId/event-intelligence/stories/regenerate
   */
  static async regenerateStory(request: FastifyRequest, reply: FastifyReply) {
    const user = (request as any).user;
    const { galleryId } = request.params as { galleryId: string };
    const { tone, length, photographerNotes } = (request.body as {
      tone?: StoryTone;
      length?: StoryLength;
      photographerNotes?: string;
    }) || {};

    if (!user || !user.studioId) {
      return reply.status(401).send({ statusCode: 401, error: 'Unauthorized', message: 'Studio authentication required' });
    }

    try {
      const result = await EventIntelligenceController.service.regenerateStory(user.studioId, galleryId, {
        tone: (tone as any) || StoryTone.ELEGANT,
        length: (length as any) || StoryLength.MEDIUM,
        photographerNotes,
      });

      return reply.status(200).send({
        success: true,
        data: result,
      });
    } catch (err: any) {
      return reply.status(500).send({
        statusCode: 500,
        error: 'Story Generation Failed',
        message: err.message || 'Failed to generate event story',
      });
    }
  }

  /**
   * PATCH /api/v1/galleries/:galleryId/event-intelligence/stories/:storyId
   */
  static async updateStory(request: FastifyRequest, reply: FastifyReply) {
    const user = (request as any).user;
    const { galleryId, storyId } = request.params as { galleryId: string; storyId: string };
    const body = (request.body as any) || {};

    if (!user || !user.studioId) {
      return reply.status(401).send({ statusCode: 401, error: 'Unauthorized', message: 'Studio authentication required' });
    }

    try {
      const result = await EventIntelligenceController.service.updateStory(user.studioId, galleryId, storyId, body);
      return reply.status(200).send({
        success: true,
        data: result,
      });
    } catch (err: any) {
      return reply.status(500).send({
        statusCode: 500,
        error: 'Story Update Failed',
        message: err.message || 'Failed to update story',
      });
    }
  }

  /**
   * GET /api/public/gallery/:slug/event-story
   * Public Client Gallery Event Story Endpoint.
   */
  static async getPublicEventStory(request: FastifyRequest, reply: FastifyReply) {
    const { slug } = request.params as { slug: string };
    if (!slug) {
      return reply.status(400).send({ statusCode: 400, error: 'Bad Request', message: 'Gallery slug required' });
    }

    try {
      const result = await EventIntelligenceController.service.getPublicEventStory(slug);
      if (!result) {
        return reply.status(404).send({
          statusCode: 404,
          error: 'Not Found',
          message: 'No public event story available for this gallery',
        });
      }

      return reply.status(200).send({
        success: true,
        data: result,
      });
    } catch (err: any) {
      return reply.status(500).send({
        statusCode: 500,
        error: 'Internal Server Error',
        message: err.message || 'Failed to fetch public event story',
      });
    }
  }
}
