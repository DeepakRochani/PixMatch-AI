import { FastifyInstance } from 'fastify';
import { GalleriesController } from './galleries.controller.js';
import { ClientGalleryController } from './client-gallery.controller.js';
import { AiController } from '../ai/ai.controller.js';
import { EventIntelligenceController } from '../event-intelligence/event-intelligence.controller.js';
import { authenticate } from '../../middlewares/auth.js';
import { requireTenant } from '../../middlewares/tenant.js';

export async function galleriesRoutes(fastify: FastifyInstance) {
  // -------------------------------------------------------------
  // Public Client Gallery Core Routes (Phase 5 - FROZEN)
  // -------------------------------------------------------------
  fastify.get('/public/:slug', ClientGalleryController.getPublicGallery);
  fastify.get('/public/:slug/photos', ClientGalleryController.listPublicPhotos);
  fastify.post('/public/:slug/access', ClientGalleryController.verifyPassword);

  // Client Favorites
  fastify.get('/public/:slug/favorites', ClientGalleryController.listFavorites);
  fastify.post('/public/:slug/favorites/:photoId', ClientGalleryController.toggleFavorite);

  // Client Selections
  fastify.get('/public/:slug/selections', ClientGalleryController.listSelections);
  fastify.post('/public/:slug/selections/:photoId', ClientGalleryController.toggleSelection);
  fastify.post('/public/:slug/selections/batch', ClientGalleryController.batchSelect);

  // Client Downloads
  fastify.get('/public/:slug/photos/:photoId/download', ClientGalleryController.downloadSinglePhoto);
  fastify.post('/public/:slug/download-bulk', ClientGalleryController.requestBulkDownload);

  // AI Selfie Search on Gallery
  fastify.post('/public/:slug/selfie-search', AiController.searchSelfiePublic);

  // Phase 12: Public Smart Albums
  fastify.get('/public/:slug/smart-albums', AiController.getPublicSmartAlbums);
  fastify.get('/public/:slug/smart-albums/:albumId/photos', AiController.getPublicSmartAlbumPhotos);

  // Phase 13: Public Event Story & Chapters
  fastify.get('/public/:slug/event-story', EventIntelligenceController.getPublicEventStory);

  // Phase 14: AI Personalization & Photo Discovery
  fastify.get('/public/:slug/personalized', ClientGalleryController.getPersonalizedHome);
  fastify.get('/public/:slug/recommendations', ClientGalleryController.getRecommendations);
  fastify.get('/public/:slug/photos/:photoId/similar', ClientGalleryController.getSimilarPhotos);
  fastify.get('/public/:slug/search', ClientGalleryController.searchGallery);
  fastify.get('/public/:slug/recently-viewed', ClientGalleryController.getRecentlyViewed);
  fastify.post('/public/:slug/activity', ClientGalleryController.recordActivity);

  // -------------------------------------------------------------
  // Authenticated Studio/Photographer Routes (Phase 6)
  // -------------------------------------------------------------
  // Studio Dashboard Stats
  fastify.get('/stats', { preHandler: [authenticate, requireTenant] }, GalleriesController.getDashboardStats);

  // Gallery CRUD & List
  fastify.get('/', { preHandler: [authenticate, requireTenant] }, GalleriesController.list);
  fastify.post('/', { preHandler: [authenticate, requireTenant] }, GalleriesController.create);
  fastify.get('/:id', { preHandler: [authenticate, requireTenant] }, GalleriesController.getById);
  fastify.patch('/:id', { preHandler: [authenticate, requireTenant] }, GalleriesController.update);
  fastify.delete('/:id', { preHandler: [authenticate, requireTenant] }, GalleriesController.delete);

  // Lifecycle & Workspace Operations
  fastify.post('/:id/archive', { preHandler: [authenticate, requireTenant] }, GalleriesController.archive);
  fastify.post('/:id/restore', { preHandler: [authenticate, requireTenant] }, GalleriesController.restore);
  fastify.post('/:id/duplicate', { preHandler: [authenticate, requireTenant] }, GalleriesController.duplicate);
  fastify.get('/:id/overview', { preHandler: [authenticate, requireTenant] }, GalleriesController.getOverview);

  // Photographer Photos Management
  fastify.get('/:id/photos', { preHandler: [authenticate, requireTenant] }, GalleriesController.listPhotos);
  fastify.post('/:id/photos/bulk-action', { preHandler: [authenticate, requireTenant] }, GalleriesController.bulkPhotoAction);
  fastify.post('/:id/photos/reorder', { preHandler: [authenticate, requireTenant] }, GalleriesController.reorderPhotos);
  fastify.post('/:id/cover', { preHandler: [authenticate, requireTenant] }, GalleriesController.setCoverPhoto);

  // Albums / Categories Management
  fastify.get('/:id/albums', { preHandler: [authenticate, requireTenant] }, GalleriesController.listAlbums);
  fastify.post('/:id/albums', { preHandler: [authenticate, requireTenant] }, GalleriesController.createAlbum);
  fastify.patch('/:id/albums/:albumId', { preHandler: [authenticate, requireTenant] }, GalleriesController.updateAlbum);
  fastify.delete('/:id/albums/:albumId', { preHandler: [authenticate, requireTenant] }, GalleriesController.deleteAlbum);
  fastify.post('/:id/albums/:albumId/photos', { preHandler: [authenticate, requireTenant] }, GalleriesController.movePhotosToAlbum);

  // Client Activity & Oversight
  fastify.get('/:id/favorites', { preHandler: [authenticate, requireTenant] }, GalleriesController.getFavorites);
  fastify.get('/:id/selections', { preHandler: [authenticate, requireTenant] }, GalleriesController.getSelections);
  fastify.get('/:id/downloads', { preHandler: [authenticate, requireTenant] }, GalleriesController.getDownloads);
  fastify.get('/:id/activity', { preHandler: [authenticate, requireTenant] }, GalleriesController.getActivity);
  fastify.get('/:id/processing', { preHandler: [authenticate, requireTenant] }, GalleriesController.getProcessingStatus);

  // AI Face Indexing & Status
  fastify.get('/:id/ai-status', { preHandler: [authenticate, requireTenant] }, AiController.getGalleryAiStatus);
  fastify.post('/:id/reindex', { preHandler: [authenticate, requireTenant] }, GalleriesController.reindexGalleryAi);
  fastify.post('/:id/ai/reindex', { preHandler: [authenticate, requireTenant] }, GalleriesController.reindexGalleryAi);
  fastify.post('/:id/ai/retry-failed', { preHandler: [authenticate, requireTenant] }, GalleriesController.retryFailedJobs);

  // -------------------------------------------------------------
  // Phase 12: Advanced AI Photo Intelligence & Smart Albums
  // -------------------------------------------------------------
  fastify.get('/:id/ai/overview', { preHandler: [authenticate, requireTenant] }, AiController.getAiOverview);
  fastify.post('/:id/ai/analyze', { preHandler: [authenticate, requireTenant] }, AiController.analyzeGallery);
  fastify.post('/:id/ai/analyze-selected', { preHandler: [authenticate, requireTenant] }, AiController.analyzeSelectedPhotos);
  fastify.get('/:id/ai/duplicates', { preHandler: [authenticate, requireTenant] }, AiController.getDuplicates);
  fastify.get('/:id/ai/best-shots', { preHandler: [authenticate, requireTenant] }, AiController.getBestShots);
  fastify.get('/:id/ai/quality', { preHandler: [authenticate, requireTenant] }, AiController.getQuality);
  fastify.get('/:id/ai/people', { preHandler: [authenticate, requireTenant] }, AiController.listPeople);
  fastify.post('/:id/ai/people/:clusterId/rename', { preHandler: [authenticate, requireTenant] }, AiController.renamePersonCluster);
  fastify.post('/:id/ai/people/:clusterId/merge', { preHandler: [authenticate, requireTenant] }, AiController.mergePersonClusters);

  // Smart Albums (Studio)
  fastify.get('/:id/smart-albums', { preHandler: [authenticate, requireTenant] }, AiController.listSmartAlbums);
  fastify.post('/:id/smart-albums', { preHandler: [authenticate, requireTenant] }, AiController.createSmartAlbum);
  fastify.patch('/:id/smart-albums/:albumId', { preHandler: [authenticate, requireTenant] }, AiController.updateSmartAlbum);
  fastify.delete('/:id/smart-albums/:albumId', { preHandler: [authenticate, requireTenant] }, AiController.deleteSmartAlbum);
  fastify.get('/:id/smart-albums/:albumId/photos', { preHandler: [authenticate, requireTenant] }, AiController.getSmartAlbumPhotos);

  // -------------------------------------------------------------
  // Phase 7: Client CRM & Gallery Delivery Workflow
  // -------------------------------------------------------------
  fastify.post('/:id/assign-client', { preHandler: [authenticate, requireTenant] }, GalleriesController.assignClient);
  fastify.delete('/:id/unassign-client/:clientId', { preHandler: [authenticate, requireTenant] }, GalleriesController.unassignClient);
  fastify.post('/:id/delivery/send', { preHandler: [authenticate, requireTenant] }, GalleriesController.sendDelivery);
  fastify.post('/:id/delivery/reminder', { preHandler: [authenticate, requireTenant] }, GalleriesController.sendReminder);
  fastify.get('/:id/delivery', { preHandler: [authenticate, requireTenant] }, GalleriesController.getDeliveryInfo);
  fastify.get('/:id/delivery/activity', { preHandler: [authenticate, requireTenant] }, GalleriesController.getDeliveryActivity);
}
