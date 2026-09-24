import { FastifyInstance } from 'fastify';
import { StorageController } from './storage.controller.js';
import { authenticate } from '../../middlewares/auth.js';
import { requireTenant } from '../../middlewares/tenant.js';

export async function storageRoutes(fastify: FastifyInstance) {
  // Public OAuth callback (can be called from provider redirect)
  fastify.get('/oauth/:provider/callback', StorageController.handleOAuthCallback);

  // Available providers metadata
  fastify.get('/providers', { preHandler: [authenticate, requireTenant] }, StorageController.listAvailableProviders);

  // Direct provider connection (S3, Cloudflare R2, Generic S3, External URL)
  fastify.post('/connect', { preHandler: [authenticate, requireTenant] }, StorageController.connectProvider);

  // Connection testing before saving
  fastify.post('/test-config', { preHandler: [authenticate, requireTenant] }, StorageController.testConfig);

  // Protected storage routes
  fastify.get('/connections', { preHandler: [authenticate, requireTenant] }, StorageController.listConnections);
  fastify.get('/oauth/:provider/authorize', { preHandler: [authenticate, requireTenant] }, StorageController.getAuthorizeUrl);
  fastify.post('/connections/:id/test', { preHandler: [authenticate, requireTenant] }, StorageController.testConnectionById);
  fastify.post('/connections/:id/browse', { preHandler: [authenticate, requireTenant] }, StorageController.browseFolders);
  fastify.post('/connections/:id/select-folder', { preHandler: [authenticate, requireTenant] }, StorageController.selectFolder);
  fastify.post('/connections/:id/sync', { preHandler: [authenticate, requireTenant] }, StorageController.triggerSync);
  fastify.get('/sync-jobs/:id', { preHandler: [authenticate, requireTenant] }, StorageController.getSyncJobStatus);
  fastify.delete('/connections/:id', { preHandler: [authenticate, requireTenant] }, StorageController.disconnectConnection);
  fastify.get('/test/:provider', { preHandler: [authenticate, requireTenant] }, StorageController.testConnection);
}

