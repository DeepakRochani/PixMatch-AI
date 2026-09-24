/**
 * Growth Routes — PixMatch AI Phase 19
 * Fastify route registration for AI Business Growth & Marketing Intelligence.
 */

import { FastifyInstance } from 'fastify';
import { GrowthController } from './growth.controller.js';
import { authenticate } from '../../middlewares/auth.js';

export async function growthRoutes(app: FastifyInstance) {
  // Public Tracking Endpoints (No Auth)
  app.get('/track/open', GrowthController.trackOpen);
  app.get('/track/click', GrowthController.trackClick);

  // Authenticated Growth Routes
  app.register(async (authed) => {
    authed.addHook('onRequest', authenticate);

    // Command Center & Overview
    authed.get('/overview', GrowthController.getOverview);

    // Opportunities
    authed.get('/opportunities', GrowthController.listOpportunities);
    authed.post('/opportunities/scan', GrowthController.scanOpportunities);
    authed.get('/opportunities/:opportunityId', GrowthController.getOpportunity);
    authed.patch('/opportunities/:opportunityId/status', GrowthController.updateOpportunityStatus);

    // Reactivation Hub
    authed.get('/reactivation/candidates', GrowthController.getReactivationCandidates);

    // Campaign Management
    authed.post('/campaigns/preview', GrowthController.previewRecipients);
    authed.post('/campaigns', GrowthController.createCampaignDraft);
    authed.get('/campaigns', GrowthController.listCampaigns);
    authed.get('/campaigns/:campaignId', GrowthController.getCampaign);
    authed.patch('/campaigns/:campaignId', GrowthController.updateCampaignDraft);
    authed.delete('/campaigns/:campaignId', GrowthController.deleteCampaign);

    // Strict Human Approval Gate
    authed.post('/campaigns/:campaignId/approve', GrowthController.approveCampaign);

    // Scheduling & Dispatch
    authed.post('/campaigns/:campaignId/schedule', GrowthController.scheduleCampaign);
    authed.post('/campaigns/:campaignId/dispatch', GrowthController.dispatchCampaign);

    // Campaign Recipients & Export
    authed.get('/campaigns/:campaignId/recipients', GrowthController.listCampaignRecipients);
    authed.get('/campaigns/:campaignId/recipients/export/csv', GrowthController.exportCampaignRecipientsCsv);

    // Performance & ROI
    authed.get('/campaigns/:campaignId/performance', GrowthController.getCampaignPerformance);

    // Services & Seasonal Analysis
    authed.get('/services', GrowthController.getServiceGrowth);

    // Goals
    authed.get('/goals', GrowthController.listGoals);
    authed.post('/goals', GrowthController.createGoal);

    // Super Admin Telemetry
    authed.get('/admin/telemetry', GrowthController.getAdminTelemetry);
  });
}
