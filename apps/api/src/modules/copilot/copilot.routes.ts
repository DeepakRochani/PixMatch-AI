/**
 * Copilot Routes — PIXMatch AI Phase 15
 * Registers Fastify endpoints for AI Photographer Copilot.
 */

import { FastifyInstance } from 'fastify';
import { CopilotController } from './copilot.controller.js';
import { authenticate } from '../../middlewares/auth.js';

export async function copilotRoutes(app: FastifyInstance) {
  // All Copilot endpoints require studio authentication
  app.addHook('onRequest', authenticate);

  // Gallery Health & Readiness
  app.get('/galleries/:galleryId/health', CopilotController.getGalleryHealth);
  app.get('/galleries/:galleryId/attention', CopilotController.getAttentionSummary);
  app.get('/galleries/:galleryId/recommendations', CopilotController.getRecommendations);
  app.post('/galleries/:galleryId/prepare', CopilotController.prepareGallery);

  // Studio-wide Attention Summary
  app.get('/attention', CopilotController.getAttentionSummary);

  // Conversations & Chat Assistant
  app.get('/conversations', CopilotController.listConversations);
  app.post('/conversations', CopilotController.getOrCreateConversation);
  app.post('/conversations/:id/messages', CopilotController.sendMessage);

  // Actions & Approval Workflow
  app.post('/actions/:id/approve', CopilotController.approveAction);
  app.post('/actions/:id/reject', CopilotController.rejectAction);

  // Recommendation Dismiss / Resolve
  app.post('/recommendations/:id/dismiss', CopilotController.dismissRecommendation);
  app.post('/recommendations/:id/resolve', CopilotController.resolveRecommendation);

  // Super Admin Telemetry
  app.get('/admin/telemetry', CopilotController.getTelemetry);
}
