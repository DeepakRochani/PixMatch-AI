import { FastifyInstance } from 'fastify';
import { SecurityCenterController } from './security-center.controller.js';
import {
  requirePlatformAdminSession,
  requirePlatformAdminPermission,
} from '../admin-auth/admin-auth.middleware.js';
import { AdminPermission } from '@pixmatch/types';

export async function securityCenterRoutes(fastify: FastifyInstance) {
  // Common authentication & permission guards for all SOC routes
  fastify.addHook('preHandler', requirePlatformAdminSession);

  // Overview & Read-only Views
  fastify.get(
    '/overview',
    { preHandler: requirePlatformAdminPermission(AdminPermission.SECURITY_VIEW) },
    SecurityCenterController.getOverview
  );

  fastify.get(
    '/events',
    { preHandler: requirePlatformAdminPermission(AdminPermission.SECURITY_VIEW) },
    SecurityCenterController.listEvents
  );

  fastify.get(
    '/events/:id',
    { preHandler: requirePlatformAdminPermission(AdminPermission.SECURITY_VIEW) },
    SecurityCenterController.getEvent
  );

  fastify.post(
    '/events/:id/status',
    { preHandler: requirePlatformAdminPermission(AdminPermission.SECURITY_MANAGE) },
    SecurityCenterController.updateEventStatus
  );

  fastify.post(
    '/events/:id/false-positive',
    { preHandler: requirePlatformAdminPermission(AdminPermission.SECURITY_MANAGE) },
    SecurityCenterController.markFalsePositive
  );

  // Investigations
  fastify.get(
    '/investigations',
    { preHandler: requirePlatformAdminPermission(AdminPermission.SECURITY_VIEW) },
    SecurityCenterController.listInvestigations
  );

  fastify.post(
    '/investigations',
    { preHandler: requirePlatformAdminPermission(AdminPermission.SECURITY_MANAGE) },
    SecurityCenterController.createInvestigation
  );

  fastify.get(
    '/investigations/:id',
    { preHandler: requirePlatformAdminPermission(AdminPermission.SECURITY_VIEW) },
    SecurityCenterController.getInvestigation
  );

  fastify.post(
    '/investigations/:id/notes',
    { preHandler: requirePlatformAdminPermission(AdminPermission.SECURITY_MANAGE) },
    SecurityCenterController.addInvestigationNote
  );

  fastify.post(
    '/investigations/:id/status',
    { preHandler: requirePlatformAdminPermission(AdminPermission.SECURITY_MANAGE) },
    SecurityCenterController.updateInvestigationStatus
  );

  fastify.post(
    '/investigations/:id/assign',
    { preHandler: requirePlatformAdminPermission(AdminPermission.SECURITY_MANAGE) },
    SecurityCenterController.assignInvestigation
  );

  // Detection Rules
  fastify.get(
    '/rules',
    { preHandler: requirePlatformAdminPermission(AdminPermission.SECURITY_VIEW) },
    SecurityCenterController.listRules
  );

  fastify.patch(
    '/rules/:ruleId',
    { preHandler: requirePlatformAdminPermission(AdminPermission.SECURITY_MANAGE) },
    SecurityCenterController.updateRule
  );

  fastify.post(
    '/rules/:ruleId/suppress',
    { preHandler: requirePlatformAdminPermission(AdminPermission.SECURITY_MANAGE) },
    SecurityCenterController.suppressRule
  );

  fastify.post(
    '/rules/:ruleId/unsuppress',
    { preHandler: requirePlatformAdminPermission(AdminPermission.SECURITY_MANAGE) },
    SecurityCenterController.unsuppressRule
  );

  // Timeline
  fastify.get(
    '/timeline',
    { preHandler: requirePlatformAdminPermission(AdminPermission.SECURITY_VIEW) },
    SecurityCenterController.getTimeline
  );

  // Dedicated Domain Drill-downs
  fastify.get(
    '/authentication',
    { preHandler: requirePlatformAdminPermission(AdminPermission.SECURITY_VIEW) },
    SecurityCenterController.getAuthenticationSecurity
  );

  fastify.get(
    '/api',
    { preHandler: requirePlatformAdminPermission(AdminPermission.SECURITY_VIEW) },
    SecurityCenterController.getApiSecurity
  );

  fastify.get(
    '/webhooks',
    { preHandler: requirePlatformAdminPermission(AdminPermission.SECURITY_VIEW) },
    SecurityCenterController.getWebhookSecurity
  );

  fastify.get(
    '/storage',
    { preHandler: requirePlatformAdminPermission(AdminPermission.SECURITY_VIEW) },
    SecurityCenterController.getStorageSecurity
  );

  fastify.get(
    '/oauth',
    { preHandler: requirePlatformAdminPermission(AdminPermission.SECURITY_VIEW) },
    SecurityCenterController.getOauthSecurity
  );

  fastify.get(
    '/payments',
    { preHandler: requirePlatformAdminPermission(AdminPermission.SECURITY_VIEW) },
    SecurityCenterController.getPaymentsSecurity
  );

  fastify.get(
    '/ai',
    { preHandler: requirePlatformAdminPermission(AdminPermission.SECURITY_VIEW) },
    SecurityCenterController.getAiSecurity
  );

  // Export
  fastify.get(
    '/export/csv',
    { preHandler: requirePlatformAdminPermission(AdminPermission.SECURITY_VIEW) },
    SecurityCenterController.exportCsv
  );

  fastify.get(
    '/export/json',
    { preHandler: requirePlatformAdminPermission(AdminPermission.SECURITY_VIEW) },
    SecurityCenterController.exportJson
  );
}
