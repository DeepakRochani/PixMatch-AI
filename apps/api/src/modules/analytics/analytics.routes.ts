import { FastifyInstance } from 'fastify';
import { AnalyticsController } from './analytics.controller.js';
import { authenticate } from '../../middlewares/auth.js';
import { requireTenant } from '../../middlewares/tenant.js';

export async function analyticsRoutes(fastify: FastifyInstance) {
  const preHandler = [authenticate, requireTenant];

  fastify.get('/overview', { preHandler }, AnalyticsController.getOverview);
  fastify.get('/timeseries', { preHandler }, AnalyticsController.getTimeseries);
  fastify.get('/galleries', { preHandler }, AnalyticsController.getGalleries);
  fastify.get('/galleries/:id', { preHandler }, AnalyticsController.getGalleryDetail);
  fastify.get('/clients', { preHandler }, AnalyticsController.getClients);
  fastify.get('/ai', { preHandler }, AnalyticsController.getAi);
  fastify.get('/storage', { preHandler }, AnalyticsController.getStorage);
  fastify.get('/downloads', { preHandler }, AnalyticsController.getDownloads);
  fastify.get('/export', { preHandler }, AnalyticsController.exportData);
  fastify.post('/aggregate', { preHandler }, AnalyticsController.triggerAggregate);
  fastify.post('/backfill', { preHandler }, AnalyticsController.triggerBackfill);
}
