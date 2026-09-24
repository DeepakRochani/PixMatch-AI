import Fastify, { FastifyInstance } from 'fastify';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import rateLimit from '@fastify/rate-limit';
import multipart from '@fastify/multipart';
import fastifyStatic from '@fastify/static';
import path from 'path';
import { errorHandler } from './middlewares/errorHandler.js';
import { authRoutes } from './modules/auth/auth.routes.js';
import { galleriesRoutes } from './modules/galleries/galleries.routes.js';
import { photosRoutes } from './modules/photos/photos.routes.js';
import { storageRoutes } from './modules/storage/storage.routes.js';
import { processingRoutes } from './modules/processing/processing.routes.js';
import { clientsRoutes } from './modules/clients/clients.routes.js';
import { studiosRoutes } from './modules/studios/studios.routes.js';
import { subscriptionsRoutes } from './modules/subscriptions/subscriptions.routes.js';
import { billingRoutes } from './modules/billing/billing.routes.js';
import { analyticsRoutes } from './modules/analytics/analytics.routes.js';
import { adminRoutes } from './modules/admin/admin.routes.js';
import { adminEmailRoutes } from './modules/admin/admin.email.routes.js';
import { notificationRoutes } from './modules/notifications/notification.routes.js';
import { emailRoutes } from './modules/email/email.routes.js';
import { aiRoutes } from './modules/ai/ai.routes.js';
import { eventIntelligenceRoutes } from './modules/event-intelligence/event-intelligence.routes.js';
import { copilotRoutes } from './modules/copilot/copilot.routes.js';
import { automationRoutes } from './modules/automation/automation.routes.js';
import { clientIntelligenceRoutes } from './modules/client-intelligence/client-intelligence.routes.js';
import { businessRoutes } from './modules/business/business.routes.js';
import { growthRoutes } from './modules/growth/growth.routes.js';
import { operationsRoutes } from './modules/operations/operations.routes.js';
import { proposalsRoutes } from './modules/operations/proposals.routes.js';
import { contractsRoutes } from './modules/operations/contracts.routes.js';
import { publicPortalRoutes } from './modules/operations/public-portal.routes.js';
import { calendarRoutes } from './modules/calendar/calendar.routes.js';
import { productionRoutes } from './modules/production/production.routes.js';
import { proofingRoutes } from './modules/proofing/proofing.routes.js';
import { fulfillmentRoutes } from './modules/fulfillment/fulfillment.routes.js';
import { clientPortalRoutes } from './modules/client-portal/client-portal.routes.js';
import { communicationRoutes } from './modules/communication/communication.routes.js';
import { teamRoutes } from './modules/team/team.routes.js';
import { teamCollaborationRoutes } from './modules/team-collaboration/team-collaboration.routes.js';
import { financialOperationsRoutes } from './modules/financial-operations/financial-operations.routes.js';
import { accountingRoutes } from './modules/accounting/accounting.routes.js';
import { taxRoutes } from './modules/tax/tax.routes.js';
import { invoicingRoutes } from './modules/invoicing/invoicing.routes.js';
import { financialReportingRoutes } from './modules/financial-reporting/financial-reporting.routes.js';
import { businessIntelligenceRoutes } from './modules/business-intelligence/business-intelligence.routes.js';
import { planningRoutes } from './modules/planning/planning.routes.js';
import { publicHealthRoutes, reliabilityAdminRoutes } from './modules/reliability/reliability.routes.js';
import { adminAuthRoutes } from './modules/admin-auth/admin-auth.routes.js';
import { securityCenterRoutes } from './modules/security-center/security-center.routes.js';
import { privacyRoutes } from './modules/privacy/privacy.routes.js';
import { releaseRoutes } from './modules/releases/release.routes.js';

export function buildApp(): FastifyInstance {
  const app = Fastify({
    logger: {
      level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
    },
  });

  // Security Headers
  app.register(helmet, {
    crossOriginResourcePolicy: false, // allow loading local images from web frontend
  });

  // CORS
  app.register(cors, {
    origin: true,
    credentials: true,
  });

  // Rate Limiting
  app.register(rateLimit, {
    max: 1000,
    timeWindow: '1 minute',
  });

  // Multipart uploads (up to 50MB per file)
  app.register(multipart, {
    limits: {
      fileSize: 50 * 1024 * 1024,
    },
  });

  // Static files for Platform Storage uploads
  const uploadsDir = path.resolve(process.cwd(), 'uploads');
  app.register(fastifyStatic, {
    root: uploadsDir,
    prefix: '/uploads/',
  });

  // Global Error Handler
  app.setErrorHandler(errorHandler);

  // Health Check
  app.get('/api/health', async () => ({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    service: 'pixmatch-api',
    version: '0.1.0',
  }));

  // API Routes
  app.register(authRoutes, { prefix: '/api/auth' });
  app.register(authRoutes, { prefix: '/api/v1/auth' });
  app.register(galleriesRoutes, { prefix: '/api/galleries' });
  app.register(galleriesRoutes, { prefix: '/api/v1/galleries' });
  app.register(photosRoutes, { prefix: '/api/photos' });
  app.register(photosRoutes, { prefix: '/api/v1/photos' });
  app.register(storageRoutes, { prefix: '/api/storage' });
  app.register(processingRoutes, { prefix: '/api/processing' });
  app.register(clientsRoutes, { prefix: '/api/clients' });
  app.register(studiosRoutes, { prefix: '/api/studios' });
  app.register(subscriptionsRoutes, { prefix: '/api/subscriptions' });
  app.register(billingRoutes, { prefix: '/api/billing' });
  app.register(analyticsRoutes, { prefix: '/api/analytics' });
  app.register(adminAuthRoutes, { prefix: '/api/admin/auth' });
  app.register(adminAuthRoutes, { prefix: '/api/v1/admin/auth' });
  app.register(adminRoutes, { prefix: '/api/admin' });
  app.register(adminRoutes, { prefix: '/api/v1/admin' });
  app.register(adminEmailRoutes, { prefix: '/api' });
  app.register(adminEmailRoutes, { prefix: '/api/v1' });
  app.register(notificationRoutes, { prefix: '/api' });
  app.register(notificationRoutes, { prefix: '/api/v1' });
  app.register(emailRoutes, { prefix: '/api' });
  app.register(emailRoutes, { prefix: '/api/v1' });
  app.register(aiRoutes, { prefix: '/api/ai' });
  app.register(aiRoutes, { prefix: '/api/v1/ai' });
  app.register(eventIntelligenceRoutes, { prefix: '/api/event-intelligence' });
  app.register(eventIntelligenceRoutes, { prefix: '/api/v1/event-intelligence' });
  app.register(copilotRoutes, { prefix: '/api/copilot' });
  app.register(copilotRoutes, { prefix: '/api/v1/copilot' });
  app.register(automationRoutes, { prefix: '/api/automation' });
  app.register(automationRoutes, { prefix: '/api/v1/automation' });
  app.register(clientIntelligenceRoutes, { prefix: '/api/client-intelligence' });
  app.register(clientIntelligenceRoutes, { prefix: '/api/v1/client-intelligence' });
  app.register(businessRoutes, { prefix: '/api/business' });
  app.register(businessRoutes, { prefix: '/api/v1/business' });
  app.register(growthRoutes, { prefix: '/api/growth' });
  app.register(growthRoutes, { prefix: '/api/v1/growth' });
  app.register(operationsRoutes, { prefix: '/api/operations' });
  app.register(operationsRoutes, { prefix: '/api/v1/operations' });
  app.register(proposalsRoutes, { prefix: '/api/proposals' });
  app.register(proposalsRoutes, { prefix: '/api/v1/proposals' });
  app.register(contractsRoutes, { prefix: '/api/contracts' });
  app.register(contractsRoutes, { prefix: '/api/v1/contracts' });
  app.register(publicPortalRoutes, { prefix: '/api/public' });
  app.register(publicPortalRoutes, { prefix: '/api/v1/public' });
  app.register(calendarRoutes, { prefix: '/api/calendar' });
  app.register(calendarRoutes, { prefix: '/api/v1/calendar' });
  app.register(productionRoutes, { prefix: '/api/production' });
  app.register(productionRoutes, { prefix: '/api/v1/production' });
  app.register(productionRoutes, { prefix: '/api/v1/operations/production' });
  app.register(proofingRoutes, { prefix: '/api/proofing' });
  app.register(proofingRoutes, { prefix: '/api/v1/proofing' });
  app.register(fulfillmentRoutes, { prefix: '/api/fulfillment' });
  app.register(fulfillmentRoutes, { prefix: '/api/v1/fulfillment' });
  app.register(clientPortalRoutes, { prefix: '/api' });
  app.register(clientPortalRoutes, { prefix: '/api/v1' });
  app.register(communicationRoutes, { prefix: '/api/communication' });
  app.register(communicationRoutes, { prefix: '/api/v1/communication' });
  app.register(teamRoutes, { prefix: '/api/team' });
  app.register(teamRoutes, { prefix: '/api/v1/team' });
  app.register(teamCollaborationRoutes, { prefix: '/api/team/collaboration' });
  app.register(teamCollaborationRoutes, { prefix: '/api/v1/team/collaboration' });
  app.register(financialOperationsRoutes, { prefix: '/api/finance' });
  app.register(financialOperationsRoutes, { prefix: '/api/v1/finance' });
  app.register(accountingRoutes, { prefix: '/api/finance/accounting' });
  app.register(accountingRoutes, { prefix: '/api/v1/finance/accounting' });
  app.register(taxRoutes, { prefix: '/api/finance/tax' });
  app.register(taxRoutes, { prefix: '/api/v1/finance/tax' });
  app.register(invoicingRoutes, { prefix: '/api/finance/invoicing' });
  app.register(invoicingRoutes, { prefix: '/api/v1/finance/invoicing' });
  app.register(financialReportingRoutes, { prefix: '/api/finance/reports' });
  app.register(financialReportingRoutes, { prefix: '/api/v1/finance/reports' });
  app.register(businessIntelligenceRoutes, { prefix: '/api/business-intelligence' });
  app.register(businessIntelligenceRoutes, { prefix: '/api/v1/business-intelligence' });
  app.register(planningRoutes, { prefix: '/api/planning' });
  app.register(planningRoutes, { prefix: '/api/v1/planning' });
  app.register(publicHealthRoutes);
  app.register(reliabilityAdminRoutes, { prefix: '/api/admin/reliability' });
  app.register(reliabilityAdminRoutes, { prefix: '/api/v1/admin/reliability' });
  app.register(securityCenterRoutes, { prefix: '/api/admin/security-center' });
  app.register(securityCenterRoutes, { prefix: '/api/v1/admin/security-center' });
  app.register(privacyRoutes, { prefix: '/api/admin/privacy' });
  app.register(privacyRoutes, { prefix: '/api/v1/admin/privacy' });
  app.register(releaseRoutes, { prefix: '/api/admin/releases' });
  app.register(releaseRoutes, { prefix: '/api/v1/admin/releases' });

  return app;
}
