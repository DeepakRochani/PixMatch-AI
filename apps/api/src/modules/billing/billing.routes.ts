import { FastifyInstance } from 'fastify';
import { BillingController } from './billing.controller.js';
import { authenticate } from '../../middlewares/auth.js';
import { requireTenant } from '../../middlewares/tenant.js';

export async function billingRoutes(fastify: FastifyInstance) {
  // Public plan catalogue
  fastify.get('/plans', BillingController.getPlans);

  // Authenticated tenant routes
  fastify.get('/subscription', { preHandler: [authenticate, requireTenant] }, BillingController.getSubscription);
  fastify.get('/usage', { preHandler: [authenticate, requireTenant] }, BillingController.getUsage);
  fastify.get('/invoices', { preHandler: [authenticate, requireTenant] }, BillingController.getInvoices);
  fastify.post('/checkout', { preHandler: [authenticate, requireTenant] }, BillingController.createCheckout);
  fastify.post('/portal', { preHandler: [authenticate, requireTenant] }, BillingController.createPortal);
  fastify.post('/change-plan', { preHandler: [authenticate, requireTenant] }, BillingController.changePlan);
  fastify.post('/cancel', { preHandler: [authenticate, requireTenant] }, BillingController.cancelSubscription);
  fastify.post('/resume', { preHandler: [authenticate, requireTenant] }, BillingController.resumeSubscription);

  // Provider webhook callback (unauthenticated with cryptographic signature verification)
  fastify.post('/webhook', BillingController.handleWebhook);
}
