import { FastifyInstance } from 'fastify';
import { AiController } from './ai.controller.js';
import { authenticate } from '../../middlewares/auth.js';
import { requireTenant } from '../../middlewares/tenant.js';

export async function aiRoutes(fastify: FastifyInstance) {
  // Public Client Selfie Search (Rate Limited to 20 requests/min per IP to protect against scraping/exhaustion)
  const rateLimitConfig = {
    config: {
      rateLimit: {
        max: 20,
        timeWindow: '1 minute',
      },
    },
  };

  fastify.post('/public/gallery/:slug/selfie-search', rateLimitConfig, AiController.searchSelfiePublic);
  fastify.post('/public/selfie-search', rateLimitConfig, AiController.searchSelfiePublic);
  fastify.post('/selfie/search-public', rateLimitConfig, AiController.searchSelfiePublic);
  fastify.post('/public/:slug/selfie-search', rateLimitConfig, AiController.searchSelfiePublic);

  // Authenticated Studio routes
  fastify.post('/search/selfie', { preHandler: [authenticate, requireTenant] }, AiController.searchSelfieAuth);
  fastify.get('/gallery/:galleryId/status', { preHandler: [authenticate, requireTenant] }, AiController.getGalleryAiStatus);
  fastify.post('/gallery/:galleryId/reindex', { preHandler: [authenticate, requireTenant] }, AiController.reindexGallery);

  // Phase 12: Advanced Photo Intelligence
  fastify.get('/gallery/:galleryId/overview', { preHandler: [authenticate, requireTenant] }, AiController.getAiOverview);
  fastify.post('/gallery/:galleryId/analyze', { preHandler: [authenticate, requireTenant] }, AiController.analyzeGallery);
  fastify.post('/gallery/:galleryId/analyze-selected', { preHandler: [authenticate, requireTenant] }, AiController.analyzeSelectedPhotos);
  fastify.get('/gallery/:galleryId/duplicates', { preHandler: [authenticate, requireTenant] }, AiController.getDuplicates);
  fastify.get('/gallery/:galleryId/best-shots', { preHandler: [authenticate, requireTenant] }, AiController.getBestShots);
  fastify.get('/gallery/:galleryId/quality', { preHandler: [authenticate, requireTenant] }, AiController.getQuality);
  fastify.get('/gallery/:galleryId/people', { preHandler: [authenticate, requireTenant] }, AiController.listPeople);
  fastify.post('/gallery/:galleryId/people/:clusterId/rename', { preHandler: [authenticate, requireTenant] }, AiController.renamePersonCluster);
  fastify.post('/gallery/:galleryId/people/:clusterId/merge', { preHandler: [authenticate, requireTenant] }, AiController.mergePersonClusters);

  // Phase 12: Smart Albums
  fastify.get('/gallery/:galleryId/smart-albums', { preHandler: [authenticate, requireTenant] }, AiController.listSmartAlbums);
  fastify.post('/gallery/:galleryId/smart-albums', { preHandler: [authenticate, requireTenant] }, AiController.createSmartAlbum);
  fastify.patch('/gallery/:galleryId/smart-albums/:albumId', { preHandler: [authenticate, requireTenant] }, AiController.updateSmartAlbum);
  fastify.delete('/gallery/:galleryId/smart-albums/:albumId', { preHandler: [authenticate, requireTenant] }, AiController.deleteSmartAlbum);
  fastify.get('/gallery/:galleryId/smart-albums/:albumId/photos', { preHandler: [authenticate, requireTenant] }, AiController.getSmartAlbumPhotos);
}

