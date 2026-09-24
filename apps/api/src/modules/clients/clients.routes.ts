import { FastifyInstance } from 'fastify';
import { ClientsController } from './clients.controller.js';
import { authenticate } from '../../middlewares/auth.js';
import { requireTenant } from '../../middlewares/tenant.js';

export async function clientsRoutes(fastify: FastifyInstance) {
  // All photographer client CRM endpoints require authentication and studio tenant context
  fastify.addHook('preHandler', authenticate);
  fastify.addHook('preHandler', requireTenant);

  // Global CRM Operations (Registered before parameterized :id routes)
  fastify.get('/', ClientsController.list);
  fastify.post('/', ClientsController.create);
  fastify.post('/check-duplicate', ClientsController.checkDuplicate);
  fastify.get('/duplicates', ClientsController.findDuplicates);
  fastify.get('/follow-ups', ClientsController.getFollowUpsCenter);
  fastify.get('/custom-fields', ClientsController.listCustomFieldDefinitions);
  fastify.post('/custom-fields', ClientsController.createCustomFieldDefinition);
  fastify.post('/convert-lead', ClientsController.convertLead);
  fastify.post('/bulk', ClientsController.bulkAction);
  fastify.get('/export', ClientsController.exportCSV);

  // Client Specific CRUD & CRM 2.0 Endpoints
  fastify.get('/:id', ClientsController.getById);
  fastify.patch('/:id', ClientsController.update);
  fastify.delete('/:id', ClientsController.softDelete);
  fastify.post('/:id/restore', ClientsController.restore);

  // Client 360, Timeline & CRM Intelligence
  fastify.get('/:id/360', ClientsController.get360);
  fastify.get('/:id/timeline', ClientsController.getTimeline);
  fastify.get('/:id/merge-preview/:targetId', ClientsController.previewMerge);
  fastify.post('/:id/merge', ClientsController.executeMerge);
  fastify.post('/:id/custom-fields', ClientsController.setCustomFieldValue);
  fastify.post('/:id/important-dates', ClientsController.addImportantDate);
  fastify.post('/:id/notes', ClientsController.addNote);
  fastify.patch('/:id/assign', ClientsController.assign);

  // Client Relationships & Activity
  fastify.get('/:id/galleries', ClientsController.listGalleries);
  fastify.get('/:id/activity', ClientsController.listActivity);
}
