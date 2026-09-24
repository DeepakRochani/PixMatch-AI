import { FastifyInstance } from 'fastify';
import { EmailController } from './email.controller.js';

export async function emailRoutes(fastify: FastifyInstance) {
  // Public delivery status query
  fastify.get('/email/status/:id', EmailController.getStatus);

  // Unsubscribe links
  fastify.get('/email/unsubscribe/:token', EmailController.getUnsubscribe);
  fastify.post('/email/unsubscribe/:token', EmailController.postUnsubscribe);

  // Inbound provider webhooks
  fastify.post('/email/webhooks/:provider', EmailController.handleWebhook);
}
