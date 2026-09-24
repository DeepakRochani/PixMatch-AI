import { FastifyInstance } from 'fastify';
import { PhotosController } from './photos.controller.js';
import { AiController } from '../ai/ai.controller.js';
import { authenticate } from '../../middlewares/auth.js';
import { requireTenant } from '../../middlewares/tenant.js';

export async function photosRoutes(fastify: FastifyInstance) {
  // Public client access
  fastify.get('/public/gallery/:slug', PhotosController.listPublicBySlug);
  fastify.post('/public/gallery/:slug/selfie-search', AiController.searchSelfiePublic);

  // Authenticated studio routes
  fastify.post('/upload', { preHandler: [authenticate, requireTenant] }, PhotosController.upload);
  fastify.get('/gallery/:galleryId', { preHandler: [authenticate, requireTenant] }, PhotosController.listByGallery);
  fastify.get('/gallery/:galleryId/status', { preHandler: [authenticate, requireTenant] }, PhotosController.getGalleryStatus);
  fastify.get('/:id', { preHandler: [authenticate, requireTenant] }, PhotosController.getById);
  fastify.delete('/:id', { preHandler: [authenticate, requireTenant] }, PhotosController.delete);
  fastify.post('/:id/retry', { preHandler: [authenticate, requireTenant] }, PhotosController.retry);
  fastify.get('/:id/signed-url', { preHandler: [authenticate, requireTenant] }, PhotosController.getSignedUrl);
}

