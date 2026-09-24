import { FastifyInstance } from 'fastify';
import { SubscriptionsController } from './subscriptions.controller.js';
import { authenticate } from '../../middlewares/auth.js';
import { requireTenant } from '../../middlewares/tenant.js';

export async function subscriptionsRoutes(fastify: FastifyInstance) {
  fastify.get('/current', { preHandler: [authenticate, requireTenant] }, SubscriptionsController.getCurrent);
}
