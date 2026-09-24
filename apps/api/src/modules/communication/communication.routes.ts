/**
 * Communication Routes — PixMatch AI Phase 28
 * Registers all REST endpoints for client communications, templates, saved replies, and analytics.
 */

import { FastifyInstance } from 'fastify';
import { CommunicationController } from './communication.controller';
import { authenticate } from '../../middlewares/auth';
import { requireTenant } from '../../middlewares/tenant';

export async function communicationRoutes(fastify: FastifyInstance) {
  // All photographer studio communication endpoints require authentication and studio tenant context
  fastify.addHook('preHandler', authenticate);
  fastify.addHook('preHandler', requireTenant);

  // Conversations
  fastify.get('/conversations', CommunicationController.listConversations);
  fastify.post('/conversations', CommunicationController.createConversation);
  fastify.get('/conversations/:id', CommunicationController.getConversation);
  fastify.patch('/conversations/:id', CommunicationController.updateConversation);
  fastify.post('/conversations/:id/assign', CommunicationController.assignConversation);
  fastify.post('/conversations/:id/resolve', CommunicationController.resolveConversation);
  fastify.post('/conversations/:id/read', CommunicationController.markConversationRead);
  fastify.get('/conversations/:id/audit', CommunicationController.getConversationAudit);

  // Participants
  fastify.post('/conversations/:id/participants', CommunicationController.addParticipant);
  fastify.delete('/conversations/:id/participants/:participantId', CommunicationController.removeParticipant);

  // Messages
  fastify.post('/conversations/:id/messages', CommunicationController.sendMessage);
  fastify.patch('/messages/:id', CommunicationController.editMessage);
  fastify.delete('/messages/:id', CommunicationController.deleteMessage);
  fastify.post('/messages/:id/star', CommunicationController.starMessage);

  // Attachments
  fastify.get('/attachments/:id/download', CommunicationController.downloadAttachment);

  // Saved Replies
  fastify.get('/saved-replies', CommunicationController.listSavedReplies);
  fastify.post('/saved-replies', CommunicationController.createSavedReply);
  fastify.patch('/saved-replies/:id', CommunicationController.updateSavedReply);
  fastify.delete('/saved-replies/:id', CommunicationController.deleteSavedReply);

  // Templates
  fastify.get('/templates', CommunicationController.listTemplates);
  fastify.post('/templates', CommunicationController.createTemplate);
  fastify.get('/templates/:id', CommunicationController.getTemplate);
  fastify.patch('/templates/:id', CommunicationController.updateTemplate);
  fastify.delete('/templates/:id', CommunicationController.deleteTemplate);
  fastify.post('/templates/:id/apply', CommunicationController.applyTemplate);

  // Analytics
  fastify.get('/analytics', CommunicationController.getAnalytics);
}
