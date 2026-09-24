import { FastifyInstance } from 'fastify';
import { ProcessingController } from './processing.controller.js';
import { authenticate } from '../../middlewares/auth.js';
import { requireTenant } from '../../middlewares/tenant.js';

export async function processingRoutes(fastify: FastifyInstance) {
  fastify.get('/jobs', { preHandler: [authenticate, requireTenant] }, ProcessingController.listJobs);
  fastify.get('/jobs/:id', { preHandler: [authenticate, requireTenant] }, ProcessingController.getJob);
  fastify.post('/jobs/:id/retry', { preHandler: [authenticate, requireTenant] }, ProcessingController.retryJob);
}
