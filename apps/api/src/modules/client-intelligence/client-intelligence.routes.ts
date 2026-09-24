/**
 * Client Intelligence Routes — PIXMatch AI Phase 17
 * Registers Fastify endpoints for Client 360, Engagement Scoring, Journey State, Insights, Follow-ups & Communications.
 */

import { FastifyInstance } from 'fastify';
import { ClientIntelligenceController } from './client-intelligence.controller.js';
import { authenticate } from '../../middlewares/auth.js';

export async function clientIntelligenceRoutes(app: FastifyInstance) {
  // All endpoints require studio authentication
  app.addHook('onRequest', authenticate);

  // Studio overview & aggregates
  app.get('/overview', ClientIntelligenceController.getStudioOverview);
  app.post('/bulk-recalculate', ClientIntelligenceController.bulkRecalculateEngagement);

  // Follow-up Recommendations
  app.get('/followups', ClientIntelligenceController.getFollowUps);
  app.post('/followups/scan', ClientIntelligenceController.scanFollowUps);
  app.post('/followups/:followUpId/dismiss', ClientIntelligenceController.dismissFollowUp);

  // Communications & Drafts
  app.get('/communications', ClientIntelligenceController.getCommunications);
  app.post('/communications/drafts', ClientIntelligenceController.createDraft);
  app.patch('/communications/drafts/:draftId', ClientIntelligenceController.updateDraft);
  app.post('/communications/drafts/:draftId/approve-and-send', ClientIntelligenceController.approveAndSendDraft);
  app.post('/communications/drafts/:draftId/cancel', ClientIntelligenceController.cancelDraft);

  // Specific Client 360 & Intelligence
  app.get('/clients/:clientId/360', ClientIntelligenceController.getClient360);
  app.get('/clients/:clientId/timeline', ClientIntelligenceController.getClientTimeline);
  app.get('/clients/:clientId/engagement', ClientIntelligenceController.getEngagementProfile);
  app.post('/clients/:clientId/engagement/recalculate', ClientIntelligenceController.recalculateEngagement);
  app.get('/clients/:clientId/journey', ClientIntelligenceController.getJourneyState);
  app.post('/clients/:clientId/journey/update', ClientIntelligenceController.updateJourneyState);
  app.post('/clients/:clientId/journey/check-return', ClientIntelligenceController.checkReturnClient);
  app.get('/clients/:clientId/insights', ClientIntelligenceController.getInsights);
  app.post('/clients/:clientId/insights/generate', ClientIntelligenceController.generateInsights);
  app.post('/insights/:insightId/resolve', ClientIntelligenceController.resolveInsight);

  // Admin telemetry
  app.get('/admin/telemetry', ClientIntelligenceController.getAdminTelemetry);
}
