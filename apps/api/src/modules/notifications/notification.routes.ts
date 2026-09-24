import { FastifyInstance } from 'fastify';
import { NotificationController } from './notification.controller.js';
import { authenticate } from '../../middlewares/auth.js';

export async function notificationRoutes(fastify: FastifyInstance) {
  // Public or internal dispatch endpoint (authenticated)
  fastify.post('/notifications/dispatch', { preHandler: [authenticate] }, NotificationController.dispatch);
  fastify.post('/notifications/send', { preHandler: [authenticate] }, NotificationController.dispatch);

  // Photographer notification preferences
  fastify.get('/notifications/preferences', { preHandler: [authenticate] }, NotificationController.getPreferences);
  fastify.put('/notifications/preferences', { preHandler: [authenticate] }, NotificationController.updatePreferences);
}
