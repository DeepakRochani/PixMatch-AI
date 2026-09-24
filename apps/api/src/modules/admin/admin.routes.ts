import { FastifyInstance } from 'fastify';
import { AdminController } from './admin.controller.js';
import {
  authenticate,
  requireSuperAdmin,
  requireAdminPermission,
  requireAnyAdminPermission,
} from '../../middlewares/auth.js';
import { AdminPermission } from '@pixmatch/types';

export async function adminRoutes(fastify: FastifyInstance) {
  const adminAuth = { preHandler: [authenticate, requireSuperAdmin] };
  const perm = (p: AdminPermission) => ({ preHandler: [authenticate, requireAdminPermission(p)] });
  const anyPerm = (ps: AdminPermission[]) => ({ preHandler: [authenticate, requireAnyAdminPermission(ps)] });

  // Overview & Legacy Stats
  fastify.get('/overview', anyPerm([AdminPermission.STUDIOS_VIEW, AdminPermission.ANALYTICS_VIEW]), AdminController.getOverview);
  fastify.get('/stats', anyPerm([AdminPermission.STUDIOS_VIEW, AdminPermission.ANALYTICS_VIEW]), AdminController.getOverview);

  // Studios
  fastify.get('/studios', perm(AdminPermission.STUDIOS_VIEW), AdminController.listStudios);
  fastify.get('/studios/:id', perm(AdminPermission.STUDIOS_VIEW), AdminController.getStudioDetail);
  fastify.post('/studios/:id/suspend', perm(AdminPermission.STUDIOS_SUSPEND), AdminController.suspendStudio);
  fastify.post('/studios/:id/reactivate', perm(AdminPermission.STUDIOS_SUSPEND), AdminController.reactivateStudio);
  fastify.post('/studios/:id/recalculate-usage', perm(AdminPermission.STUDIOS_MANAGE), AdminController.recalculateUsage);

  // Users
  fastify.get('/users', perm(AdminPermission.USERS_VIEW), AdminController.listUsers);
  fastify.get('/users/:id', perm(AdminPermission.USERS_VIEW), AdminController.getUserDetail);
  fastify.post('/users/:id/suspend', perm(AdminPermission.USERS_SUSPEND), AdminController.suspendUser);
  fastify.post('/users/:id/reactivate', perm(AdminPermission.USERS_SUSPEND), AdminController.reactivateUser);

  // Subscriptions
  fastify.get('/subscriptions', perm(AdminPermission.SUBSCRIPTIONS_VIEW), AdminController.listSubscriptions);

  // Plans
  fastify.get('/plans', perm(AdminPermission.PLANS_VIEW), AdminController.listPlans);
  fastify.post('/plans', perm(AdminPermission.PLANS_MANAGE), AdminController.createPlan);
  fastify.patch('/plans/:id', perm(AdminPermission.PLANS_MANAGE), AdminController.updatePlan);
  fastify.post('/plans/:id/archive', perm(AdminPermission.PLANS_MANAGE), AdminController.archivePlan);

  // Revenue
  fastify.get('/revenue', perm(AdminPermission.PLATFORM_REVENUE_VIEW), AdminController.getRevenue);

  // Platform Usage
  fastify.get('/usage', perm(AdminPermission.AI_USAGE_VIEW), AdminController.getPlatformUsage);

  // AI Operations
  fastify.get('/ai', perm(AdminPermission.AI_USAGE_VIEW), AdminController.getAiOperations);

  // Storage Operations
  fastify.get('/storage', perm(AdminPermission.STORAGE_VIEW), AdminController.getStorageOperations);
  fastify.get('/storage/oauth/google/status', perm(AdminPermission.STORAGE_VIEW), AdminController.getGoogleOAuthStatus);

  // Jobs
  fastify.get('/jobs', perm(AdminPermission.JOBS_VIEW), AdminController.listJobs);
  fastify.post('/jobs/:id/retry', perm(AdminPermission.JOBS_MANAGE), AdminController.retryJob);

  // System Health
  fastify.get('/system', perm(AdminPermission.SYSTEM_HEALTH_VIEW), AdminController.getSystemHealth);

  // Audit Logs
  fastify.get('/audit', perm(AdminPermission.AUDIT_VIEW), AdminController.listAuditLogs);

  // Global Search
  fastify.get('/search', anyPerm([AdminPermission.STUDIOS_VIEW, AdminPermission.USERS_VIEW]), AdminController.search);

  // =============================================================
  // PHASE 40: NEW ROUTES
  // =============================================================

  // Feature Flags
  fastify.get('/features', perm(AdminPermission.FEATURE_FLAGS_VIEW), AdminController.listFeatureFlags);
  fastify.post('/features', perm(AdminPermission.FEATURE_FLAGS_MANAGE), AdminController.createFeatureFlag);
  fastify.patch('/features/:id', perm(AdminPermission.FEATURE_FLAGS_MANAGE), AdminController.updateFeatureFlag);

  // Support Cases
  fastify.get('/support', perm(AdminPermission.SUPPORT_VIEW), AdminController.listSupportCases);
  fastify.get('/support/:id', perm(AdminPermission.SUPPORT_VIEW), AdminController.getSupportCaseDetail);
  fastify.post('/support', perm(AdminPermission.SUPPORT_MANAGE), AdminController.createSupportCase);
  fastify.patch('/support/:id', perm(AdminPermission.SUPPORT_MANAGE), AdminController.updateSupportCase);

  // Incidents
  fastify.get('/incidents', perm(AdminPermission.INCIDENTS_VIEW), AdminController.listIncidents);
  fastify.get('/incidents/:id', perm(AdminPermission.INCIDENTS_VIEW), AdminController.getIncidentDetail);
  fastify.post('/incidents', perm(AdminPermission.INCIDENTS_MANAGE), AdminController.createIncident);
  fastify.patch('/incidents/:id', perm(AdminPermission.INCIDENTS_MANAGE), AdminController.updateIncident);

  // Platform Alerts
  fastify.get('/alerts', perm(AdminPermission.ALERTS_VIEW), AdminController.listAlerts);
  fastify.post('/alerts', perm(AdminPermission.ALERTS_MANAGE), AdminController.createAlert);
  fastify.post('/alerts/:id/acknowledge', perm(AdminPermission.ALERTS_MANAGE), AdminController.acknowledgeAlert);
  fastify.post('/alerts/:id/resolve', perm(AdminPermission.ALERTS_MANAGE), AdminController.resolveAlert);

  // Settings & Maintenance
  fastify.get('/settings', perm(AdminPermission.SETTINGS_VIEW), AdminController.listSettings);
  fastify.put('/settings/:key', perm(AdminPermission.SETTINGS_MANAGE), AdminController.updateSetting);
  fastify.get('/maintenance', perm(AdminPermission.SYSTEM_HEALTH_VIEW), AdminController.getMaintenanceMode);
  fastify.post('/maintenance', perm(AdminPermission.SETTINGS_MANAGE), AdminController.setMaintenanceMode);

  // Analytics & Health Score
  fastify.get('/analytics', perm(AdminPermission.ANALYTICS_VIEW), AdminController.getPlatformAnalytics);
  fastify.get('/health-score', anyPerm([AdminPermission.SYSTEM_HEALTH_VIEW, AdminPermission.ANALYTICS_VIEW]), AdminController.getPlatformHealthScore);

  // Security Center
  fastify.get('/security', perm(AdminPermission.SECURITY_VIEW), AdminController.getSecurityOverview);

  // Exports
  fastify.get('/export/studios', perm(AdminPermission.STUDIOS_VIEW), AdminController.exportStudiosCsv);
  fastify.get('/export/users', perm(AdminPermission.USERS_VIEW), AdminController.exportUsersCsv);
  fastify.get('/export/audit', perm(AdminPermission.AUDIT_VIEW), AdminController.exportAuditCsv);

  // Copilot Tools
  fastify.get('/copilot/tools', anyPerm([AdminPermission.STUDIOS_VIEW, AdminPermission.SYSTEM_HEALTH_VIEW]), AdminController.listCopilotTools);
  fastify.post('/copilot/execute', anyPerm([AdminPermission.STUDIOS_VIEW, AdminPermission.SYSTEM_HEALTH_VIEW]), AdminController.executeCopilotTool);
}
