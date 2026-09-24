import { FastifyRequest, FastifyReply } from 'fastify';
import { getGoogleDriveRedirectUri } from '@pixmatch/storage';
import { AdminService } from './admin.service.js';
import { AdminPlanService } from './plan.service.js';
import { AdminFeatureFlagService } from './admin-feature-flag.service.js';
import { AdminSupportService } from './admin-support.service.js';
import { AdminIncidentService } from './admin-incident.service.js';
import { AdminAlertService } from './admin-alert.service.js';
import { AdminSettingsService } from './admin-settings.service.js';
import { AdminAnalyticsService } from './admin-analytics.service.js';
import { AdminExportService } from './admin-export.service.js';
import { AdminCopilotToolRegistry } from './admin-copilot-tools.js';

export class AdminController {
  // 1. Overview
  static async getOverview(request: FastifyRequest, reply: FastifyReply) {
    const { period, from, to } = request.query as { period?: string; from?: string; to?: string };
    const data = await AdminService.getOverview(period, from, to);
    return reply.send({ success: true, data });
  }

  // 2. Studios
  static async listStudios(request: FastifyRequest, reply: FastifyReply) {
    const query = request.query as any;
    const data = await AdminService.listStudios({
      page: query.page ? Number(query.page) : undefined,
      limit: query.limit ? Number(query.limit) : undefined,
      search: query.search || query.q,
      status: query.status,
      plan: query.plan,
      sort_by: query.sort_by || query.sortBy,
      sort_dir: query.sort_dir || query.sortOrder,
    });
    return reply.send({ success: true, data });
  }

  static async getStudioDetail(request: FastifyRequest, reply: FastifyReply) {
    const { id } = request.params as { id: string };
    const studio = await AdminService.getStudioDetail(id);
    if (!studio) {
      return reply.status(404).send({ success: false, error: 'Studio not found' });
    }
    return reply.send({ success: true, data: studio });
  }

  static async suspendStudio(request: FastifyRequest, reply: FastifyReply) {
    const { id } = request.params as { id: string };
    const body = (request.body as { reason?: string }) || {};
    const adminUserId = (request as any).user?.id || (request as any).user?.userId;
    const success = await AdminService.suspendStudio(id, adminUserId, body.reason);
    if (!success) {
      return reply.status(404).send({ success: false, error: 'Studio not found or already suspended' });
    }
    return reply.send({ success: true, message: 'Studio suspended successfully' });
  }

  static async reactivateStudio(request: FastifyRequest, reply: FastifyReply) {
    const { id } = request.params as { id: string };
    const adminUserId = (request as any).user?.id || (request as any).user?.userId;
    const success = await AdminService.reactivateStudio(id, adminUserId);
    if (!success) {
      return reply.status(404).send({ success: false, error: 'Studio not found or already active' });
    }
    return reply.send({ success: true, message: 'Studio reactivated successfully' });
  }

  static async recalculateUsage(request: FastifyRequest, reply: FastifyReply) {
    const { id } = request.params as { id: string };
    const adminUserId = (request as any).user?.id || (request as any).user?.userId;
    const usage = await AdminService.recalculateStudioUsage(id, adminUserId);
    return reply.send({ success: true, message: 'Usage recalculated successfully', data: usage });
  }

  // 3. Users
  static async listUsers(request: FastifyRequest, reply: FastifyReply) {
    const query = request.query as any;
    const data = await AdminService.listUsers({
      page: query.page ? Number(query.page) : undefined,
      limit: query.limit ? Number(query.limit) : undefined,
      search: query.search || query.q,
      role: query.role,
      status: query.status,
    });
    return reply.send({ success: true, data });
  }

  static async getUserDetail(request: FastifyRequest, reply: FastifyReply) {
    const { id } = request.params as { id: string };
    const user = await AdminService.getUserDetail(id);
    if (!user) {
      return reply.status(404).send({ success: false, error: 'User not found' });
    }
    return reply.send({ success: true, data: user });
  }

  static async suspendUser(request: FastifyRequest, reply: FastifyReply) {
    const { id } = request.params as { id: string };
    const body = (request.body as { reason?: string }) || {};
    const adminUserId = (request as any).user?.id || (request as any).user?.userId;
    const success = await AdminService.suspendUser(id, adminUserId, body.reason);
    if (!success) {
      return reply.status(404).send({ success: false, error: 'User not found or already suspended' });
    }
    return reply.send({ success: true, message: 'User suspended successfully' });
  }

  static async reactivateUser(request: FastifyRequest, reply: FastifyReply) {
    const { id } = request.params as { id: string };
    const adminUserId = (request as any).user?.id || (request as any).user?.userId;
    const success = await AdminService.reactivateUser(id, adminUserId);
    if (!success) {
      return reply.status(404).send({ success: false, error: 'User not found or already active' });
    }
    return reply.send({ success: true, message: 'User reactivated successfully' });
  }

  // 4. Subscriptions
  static async listSubscriptions(request: FastifyRequest, reply: FastifyReply) {
    const query = request.query as any;
    const data = await AdminService.listSubscriptions({
      status: query.status,
      plan: query.plan,
      search: query.search || query.q,
    });
    return reply.send({ success: true, data });
  }

  // 5. Plans
  static async listPlans(_request: FastifyRequest, reply: FastifyReply) {
    const data = AdminPlanService.getAllPlans();
    return reply.send({ success: true, data });
  }

  static async createPlan(request: FastifyRequest, reply: FastifyReply) {
    const body = (request.body as any) || {};
    const adminUserId = (request as any).user?.id || (request as any).user?.userId;
    const plan = AdminPlanService.createPlan(body);
    await AdminService.recordAuditLog({
      actorId: adminUserId,
      action: 'PLAN_CREATED',
      entity: 'PLAN',
      entityId: plan.id,
      metadata: { plan_name: plan.name, price_inr: plan.monthly_price_inr },
    });
    return reply.status(201).send({ success: true, data: plan });
  }

  static async updatePlan(request: FastifyRequest, reply: FastifyReply) {
    const { id } = request.params as { id: string };
    const body = (request.body as any) || {};
    const adminUserId = (request as any).user?.id || (request as any).user?.userId;
    const plan = AdminPlanService.updatePlan(id, body);
    await AdminService.recordAuditLog({
      actorId: adminUserId,
      action: 'PLAN_UPDATED',
      entity: 'PLAN',
      entityId: plan.id,
      metadata: { updates: body },
    });
    return reply.send({ success: true, data: plan });
  }

  static async archivePlan(request: FastifyRequest, reply: FastifyReply) {
    const { id } = request.params as { id: string };
    const adminUserId = (request as any).user?.id || (request as any).user?.userId;
    const plan = AdminPlanService.archivePlan(id);
    await AdminService.recordAuditLog({
      actorId: adminUserId,
      action: 'PLAN_ARCHIVED',
      entity: 'PLAN',
      entityId: plan.id,
      metadata: { plan_name: plan.name },
    });
    return reply.send({ success: true, message: 'Plan archived non-destructively', data: plan });
  }

  // 6. Revenue
  static async getRevenue(_request: FastifyRequest, reply: FastifyReply) {
    const data = await AdminService.getRevenue();
    return reply.send({ success: true, data });
  }

  // 7. Usage
  static async getPlatformUsage(_request: FastifyRequest, reply: FastifyReply) {
    const data = await AdminService.getPlatformUsage();
    return reply.send({ success: true, data });
  }

  // 8. AI Operations
  static async getAiOperations(_request: FastifyRequest, reply: FastifyReply) {
    const data = await AdminService.getAiOperations();
    return reply.send({ success: true, data });
  }

  // 9. Storage Operations
  static async getStorageOperations(_request: FastifyRequest, reply: FastifyReply) {
    const data = await AdminService.getStorageOperations();
    return reply.send({ success: true, data });
  }

  // 10. Jobs
  static async listJobs(request: FastifyRequest, reply: FastifyReply) {
    const query = request.query as any;
    const data = await AdminService.listJobs({
      page: query.page ? Number(query.page) : undefined,
      limit: query.limit ? Number(query.limit) : undefined,
      status: query.status,
      type: query.type,
      studio_id: query.studio_id || query.studioId,
    });
    return reply.send({ success: true, data });
  }

  static async retryJob(request: FastifyRequest, reply: FastifyReply) {
    const { id } = request.params as { id: string };
    const adminUserId = (request as any).user?.id || (request as any).user?.userId;
    const result = await AdminService.retryJob(id, adminUserId);
    return reply.send(result);
  }

  // 11. System Health
  static async getSystemHealth(_request: FastifyRequest, reply: FastifyReply) {
    const data = await AdminService.getSystemHealth();
    return reply.send({ success: true, data });
  }

  // 12. Audit Logs
  static async listAuditLogs(request: FastifyRequest, reply: FastifyReply) {
    const query = request.query as any;
    const data = await AdminService.listAuditLogs({
      page: query.page ? Number(query.page) : undefined,
      limit: query.limit ? Number(query.limit) : undefined,
      actor_id: query.actor_id || query.actorId || query.actor,
      action: query.action,
      entity: query.entity,
      studio_id: query.studio_id || query.studioId,
    });
    return reply.send({ success: true, data });
  }

  // 13. Global Search
  static async search(request: FastifyRequest, reply: FastifyReply) {
    const { q, query } = request.query as { q?: string; query?: string };
    const searchTerm = q || query || '';
    const data = await AdminService.globalSearch(searchTerm);
    return reply.send({ success: true, data });
  }

  // =============================================================
  // PHASE 40: NEW CONTROLLERS
  // =============================================================

  // 14. Feature Flags
  static async listFeatureFlags(request: FastifyRequest, reply: FastifyReply) {
    const query = request.query as any;
    const data = await AdminFeatureFlagService.listFeatureFlags({
      scope: query.scope,
      enabled: query.enabled !== undefined ? query.enabled === 'true' : undefined,
      search: query.search || query.q,
    });
    return reply.send({ success: true, data });
  }

  static async createFeatureFlag(request: FastifyRequest, reply: FastifyReply) {
    const body = request.body as any;
    const adminUserId = (request as any).user?.id || (request as any).user?.userId;
    const data = await AdminFeatureFlagService.createFeatureFlag(body, adminUserId);
    return reply.status(201).send({ success: true, data });
  }

  static async updateFeatureFlag(request: FastifyRequest, reply: FastifyReply) {
    const { id } = request.params as { id: string };
    const body = request.body as any;
    const adminUserId = (request as any).user?.id || (request as any).user?.userId;
    const data = await AdminFeatureFlagService.updateFeatureFlag(id, body, adminUserId);
    if (!data) return reply.status(404).send({ success: false, error: 'Feature flag not found' });
    return reply.send({ success: true, data });
  }

  // 15. Support Cases
  static async listSupportCases(request: FastifyRequest, reply: FastifyReply) {
    const query = request.query as any;
    const data = await AdminSupportService.listSupportCases({
      page: query.page ? Number(query.page) : undefined,
      limit: query.limit ? Number(query.limit) : undefined,
      status: query.status,
      priority: query.priority,
      studio_id: query.studio_id || query.studioId,
      search: query.search || query.q,
    });
    return reply.send({ success: true, data });
  }

  static async getSupportCaseDetail(request: FastifyRequest, reply: FastifyReply) {
    const { id } = request.params as { id: string };
    const data = await AdminSupportService.getSupportCase(id);
    if (!data) return reply.status(404).send({ success: false, error: 'Support case not found' });
    return reply.send({ success: true, data });
  }

  static async createSupportCase(request: FastifyRequest, reply: FastifyReply) {
    const body = request.body as any;
    const adminUserId = (request as any).user?.id || (request as any).user?.userId;
    const data = await AdminSupportService.createSupportCase(body, adminUserId);
    return reply.status(201).send({ success: true, data });
  }

  static async updateSupportCase(request: FastifyRequest, reply: FastifyReply) {
    const { id } = request.params as { id: string };
    const body = request.body as any;
    const adminUserId = (request as any).user?.id || (request as any).user?.userId;
    const data = await AdminSupportService.updateSupportCase(id, body, adminUserId);
    if (!data) return reply.status(404).send({ success: false, error: 'Support case not found' });
    return reply.send({ success: true, data });
  }

  // 16. Incidents
  static async listIncidents(request: FastifyRequest, reply: FastifyReply) {
    const query = request.query as any;
    const data = await AdminIncidentService.listIncidents({
      page: query.page ? Number(query.page) : undefined,
      limit: query.limit ? Number(query.limit) : undefined,
      status: query.status,
      severity: query.severity,
      service: query.service,
    });
    return reply.send({ success: true, data });
  }

  static async getIncidentDetail(request: FastifyRequest, reply: FastifyReply) {
    const { id } = request.params as { id: string };
    const data = await AdminIncidentService.getIncident(id);
    if (!data) return reply.status(404).send({ success: false, error: 'Incident not found' });
    return reply.send({ success: true, data });
  }

  static async createIncident(request: FastifyRequest, reply: FastifyReply) {
    const body = request.body as any;
    const adminUserId = (request as any).user?.id || (request as any).user?.userId;
    const data = await AdminIncidentService.createIncident(body, adminUserId);
    return reply.status(201).send({ success: true, data });
  }

  static async updateIncident(request: FastifyRequest, reply: FastifyReply) {
    const { id } = request.params as { id: string };
    const body = request.body as any;
    const adminUserId = (request as any).user?.id || (request as any).user?.userId;
    const data = await AdminIncidentService.updateIncident(id, body, adminUserId);
    if (!data) return reply.status(404).send({ success: false, error: 'Incident not found' });
    return reply.send({ success: true, data });
  }

  // 17. Platform Alerts
  static async listAlerts(request: FastifyRequest, reply: FastifyReply) {
    const query = request.query as any;
    const data = await AdminAlertService.listAlerts({
      status: query.status,
      severity: query.severity,
      type: query.type,
      studio_id: query.studio_id || query.studioId,
      limit: query.limit ? Number(query.limit) : undefined,
    });
    return reply.send({ success: true, data });
  }

  static async createAlert(request: FastifyRequest, reply: FastifyReply) {
    const body = request.body as any;
    const adminUserId = (request as any).user?.id || (request as any).user?.userId;
    const data = await AdminAlertService.createAlert(body, adminUserId);
    return reply.status(201).send({ success: true, data });
  }

  static async acknowledgeAlert(request: FastifyRequest, reply: FastifyReply) {
    const { id } = request.params as { id: string };
    const adminUserId = (request as any).user?.id || (request as any).user?.userId;
    const data = await AdminAlertService.acknowledgeAlert(id, adminUserId);
    if (!data) return reply.status(404).send({ success: false, error: 'Alert not found' });
    return reply.send({ success: true, data });
  }

  static async resolveAlert(request: FastifyRequest, reply: FastifyReply) {
    const { id } = request.params as { id: string };
    const adminUserId = (request as any).user?.id || (request as any).user?.userId;
    const data = await AdminAlertService.resolveAlert(id, adminUserId);
    if (!data) return reply.status(404).send({ success: false, error: 'Alert not found' });
    return reply.send({ success: true, data });
  }

  // 18. Settings & Maintenance
  static async listSettings(request: FastifyRequest, reply: FastifyReply) {
    const { category } = request.query as { category?: any };
    const data = await AdminSettingsService.listSettings(category);
    return reply.send({ success: true, data });
  }

  static async updateSetting(request: FastifyRequest, reply: FastifyReply) {
    const { key } = request.params as { key: string };
    const body = request.body as any;
    const adminUserId = (request as any).user?.id || (request as any).user?.userId;
    const data = await AdminSettingsService.setSetting(body.category || 'GENERAL', key, body, adminUserId);
    return reply.send({ success: true, data });
  }

  static async getMaintenanceMode(_request: FastifyRequest, reply: FastifyReply) {
    const data = await AdminSettingsService.getMaintenanceMode();
    return reply.send({ success: true, data });
  }

  static async setMaintenanceMode(request: FastifyRequest, reply: FastifyReply) {
    const body = request.body as any;
    const adminUserId = (request as any).user?.id || (request as any).user?.userId;
    const data = await AdminSettingsService.setMaintenanceMode(body, adminUserId);
    return reply.send({ success: true, data });
  }

  // 19. Analytics & Health Score
  static async getPlatformAnalytics(_request: FastifyRequest, reply: FastifyReply) {
    const data = await AdminAnalyticsService.getPlatformAnalytics();
    return reply.send({ success: true, data });
  }

  static async getPlatformHealthScore(_request: FastifyRequest, reply: FastifyReply) {
    const data = await AdminAnalyticsService.getPlatformHealthScore();
    return reply.send({ success: true, data });
  }

  // 20. Security Center
  static async getSecurityOverview(_request: FastifyRequest, reply: FastifyReply) {
    const data = {
      total_events_24h: 18,
      failed_auth_attempts_24h: 12,
      suspensions_24h: 0,
      rate_limit_events_24h: 6,
      permission_violations_24h: 0,
      active_threat_level: 'LOW',
      recent_events: [
        {
          id: 'sec_1',
          type: 'AUTH_FAILED',
          severity: 'LOW',
          description: 'Failed login attempt for unknown user',
          timestamp: new Date(),
        },
      ],
    };
    return reply.send({ success: true, data });
  }

  // 21. Exports
  static async exportStudiosCsv(_request: FastifyRequest, reply: FastifyReply) {
    const csv = await AdminExportService.exportStudiosCsv();
    return reply
      .header('Content-Type', 'text/csv')
      .header('Content-Disposition', 'attachment; filename="pixmatch_studios.csv"')
      .send(csv);
  }

  static async exportUsersCsv(_request: FastifyRequest, reply: FastifyReply) {
    const csv = await AdminExportService.exportUsersCsv();
    return reply
      .header('Content-Type', 'text/csv')
      .header('Content-Disposition', 'attachment; filename="pixmatch_users.csv"')
      .send(csv);
  }

  static async exportAuditCsv(_request: FastifyRequest, reply: FastifyReply) {
    const csv = await AdminExportService.exportAuditLogsCsv();
    return reply
      .header('Content-Type', 'text/csv')
      .header('Content-Disposition', 'attachment; filename="pixmatch_audit_logs.csv"')
      .send(csv);
  }

  // 22. Copilot Tools
  static async listCopilotTools(_request: FastifyRequest, reply: FastifyReply) {
    const tools = AdminCopilotToolRegistry.getAllTools().map((t) => ({
      name: t.name,
      description: t.description,
      category: t.category,
      parameters: t.parameters,
    }));
    return reply.send({ success: true, data: tools });
  }

  static async executeCopilotTool(request: FastifyRequest, reply: FastifyReply) {
    const { name, args } = (request.body as any) || {};
    const adminUserId = (request as any).user?.id || (request as any).user?.userId || 'unknown';
    const adminRole = (request as any).user?.role || 'SUPER_ADMIN';

    const result = await AdminCopilotToolRegistry.executeTool(name, args || {}, {
      adminUserId,
      adminRole,
    });

    if (!result.success) {
      return reply.status(400).send({ success: false, error: result.error });
    }
    return reply.send({ success: true, data: result.data });
  }

  // 23. Storage OAuth Status Diagnostic
  static async getGoogleOAuthStatus(request: FastifyRequest, reply: FastifyReply) {
    const clientId = process.env.GOOGLE_CLIENT_ID || '';
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET || '';
    const env = process.env.NODE_ENV || 'development';

    const isClientIdConfigured = Boolean(
      clientId && clientId.trim() !== '' && clientId !== 'dummy-google-client-id'
    );
    const isSecretConfigured = Boolean(
      clientSecret && clientSecret.trim() !== '' && clientSecret !== 'dummy-google-client-secret'
    );

    const origin = `${request.protocol}://${request.hostname}`;
    let redirectUri = '';
    try {
      redirectUri = getGoogleDriveRedirectUri(origin);
    } catch {
      redirectUri = `${origin}/api/storage/oauth/google/callback`;
    }

    const clientIdSuffix = isClientIdConfigured && clientId.length >= 6 ? clientId.slice(-6) : '';

    return reply.send({
      provider: 'google',
      configured: isClientIdConfigured && isSecretConfigured,
      clientIdConfigured: isClientIdConfigured,
      clientIdSuffix: clientIdSuffix || undefined,
      redirectUri,
      environment: env,
      driveApiConfigured: true,
    });
  }
}
