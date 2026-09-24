/**
 * Event Intelligence Routes — PIXMatch AI Phase 13
 */

import { FastifyInstance } from 'fastify';
import { EventIntelligenceController } from './event-intelligence.controller.js';
import { authenticate } from '../../middlewares/auth.js';
import { requireTenant } from '../../middlewares/tenant.js';

export async function eventIntelligenceRoutes(fastify: FastifyInstance) {
  // Public Client Gallery Story Route
  fastify.get('/public/:slug/story', EventIntelligenceController.getPublicEventStory);
  fastify.get('/public/:slug/event-story', EventIntelligenceController.getPublicEventStory);

  // Authenticated Studio/Photographer Routes
  fastify.post(
    '/galleries/:galleryId/analyze',
    { preHandler: [authenticate, requireTenant] },
    EventIntelligenceController.analyzeGallery
  );

  fastify.get(
    '/galleries/:galleryId',
    { preHandler: [authenticate, requireTenant] },
    EventIntelligenceController.getEventIntelligence
  );

  fastify.patch(
    '/galleries/:galleryId',
    { preHandler: [authenticate, requireTenant] },
    EventIntelligenceController.updateEventIntelligence
  );

  // Chapter Routes
  fastify.patch(
    '/galleries/:galleryId/chapters/:chapterId',
    { preHandler: [authenticate, requireTenant] },
    EventIntelligenceController.updateChapter
  );

  fastify.post(
    '/galleries/:galleryId/chapters/merge',
    { preHandler: [authenticate, requireTenant] },
    EventIntelligenceController.mergeChapters
  );

  fastify.post(
    '/galleries/:galleryId/chapters/:chapterId/split',
    { preHandler: [authenticate, requireTenant] },
    EventIntelligenceController.splitChapter
  );

  // Highlight Routes
  fastify.patch(
    '/galleries/:galleryId/highlights/:highlightId',
    { preHandler: [authenticate, requireTenant] },
    EventIntelligenceController.updateHighlight
  );

  // Story Routes
  fastify.post(
    '/galleries/:galleryId/stories/regenerate',
    { preHandler: [authenticate, requireTenant] },
    EventIntelligenceController.regenerateStory
  );

  fastify.patch(
    '/galleries/:galleryId/stories/:storyId',
    { preHandler: [authenticate, requireTenant] },
    EventIntelligenceController.updateStory
  );
}
