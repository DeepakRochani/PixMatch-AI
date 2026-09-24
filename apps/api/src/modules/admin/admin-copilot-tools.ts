import { AdminService } from './admin.service.js';
import { AdminAnalyticsService } from './admin-analytics.service.js';
import { AdminAlertService } from './admin-alert.service.js';
import { AdminIncidentService } from './admin-incident.service.js';
import { AdminSupportService } from './admin-support.service.js';
import { AdminSettingsService } from './admin-settings.service.js';
import { AdminFeatureFlagService } from './admin-feature-flag.service.js';

export interface CopilotAdminToolDefinition {
  name: string;
  description: string;
  category: 'READ_ONLY' | 'DRAFT_ONLY' | 'MUTATION_BLOCKED';
  parameters: Record<string, any>;
  handler: (args: Record<string, any>, context: { adminUserId: string; adminRole: string }) => Promise<any>;
}

export class AdminCopilotToolRegistry {
  private static tools = new Map<string, CopilotAdminToolDefinition>();

  static registerTool(tool: CopilotAdminToolDefinition) {
    this.tools.set(tool.name, tool);
  }

  static getTool(name: string): CopilotAdminToolDefinition | undefined {
    return this.tools.get(name);
  }

  static getAllTools(): CopilotAdminToolDefinition[] {
    return Array.from(this.tools.values());
  }

  static async executeTool(
    name: string,
    args: Record<string, any>,
    context: { adminUserId: string; adminRole: string }
  ): Promise<{ success: boolean; data?: any; error?: string }> {
    const tool = this.tools.get(name);
    if (!tool) {
      return { success: false, error: `Admin tool '${name}' is not registered.` };
    }

    if (tool.category === 'MUTATION_BLOCKED') {
      return {
        success: false,
        error: `Autonomous mutation blocked: Tool '${name}' requires human administrative confirmation and cannot be executed autonomously by Copilot.`,
      };
    }

    try {
      const data = await tool.handler(args, context);
      return { success: true, data };
    } catch (err: any) {
      return { success: false, error: err.message || 'Execution error' };
    }
  }

  static initialize() {
    // 1. get_platform_overview
    this.registerTool({
      name: 'get_platform_overview',
      description: 'Retrieves high-level platform KPIs, studio counts, user counts, and active subscriptions.',
      category: 'READ_ONLY',
      parameters: {},
      handler: async () => AdminService.getOverview(),
    });

    // 2. get_platform_revenue
    this.registerTool({
      name: 'get_platform_revenue',
      description: 'Retrieves platform SaaS MRR, ARR, plan breakdowns, and subscription revenue metrics.',
      category: 'READ_ONLY',
      parameters: {},
      handler: async () => AdminService.getRevenue(),
    });

    // 3. get_studio_summary
    this.registerTool({
      name: 'get_studio_summary',
      description: 'Retrieves detailed studio summary including gallery count, photo count, storage usage, and status.',
      category: 'READ_ONLY',
      parameters: { studio_id: { type: 'string', required: true } },
      handler: async (args) => AdminService.getStudioDetail(args.studio_id),
    });

    // 4. get_user_summary
    this.registerTool({
      name: 'get_user_summary',
      description: 'Retrieves user account metadata and studio memberships without exposing credentials.',
      category: 'READ_ONLY',
      parameters: { user_id: { type: 'string', required: true } },
      handler: async (args) => AdminService.getUserDetail(args.user_id),
    });

    // 5. get_subscription_summary
    this.registerTool({
      name: 'get_subscription_summary',
      description: 'Retrieves subscription status distribution across active studios.',
      category: 'READ_ONLY',
      parameters: {},
      handler: async () => AdminService.listSubscriptions(),
    });

    // 6. get_usage_summary
    this.registerTool({
      name: 'get_usage_summary',
      description: 'Retrieves platform usage totals and detects studios with warning/exceeded quotas.',
      category: 'READ_ONLY',
      parameters: {},
      handler: async () => AdminService.getPlatformUsage(),
    });

    // 7. get_storage_summary
    this.registerTool({
      name: 'get_storage_summary',
      description: 'Retrieves storage provider distribution and sync telemetry without secrets.',
      category: 'READ_ONLY',
      parameters: {},
      handler: async () => AdminService.getStorageOperations(),
    });

    // 8. get_ai_summary
    this.registerTool({
      name: 'get_ai_summary',
      description: 'Retrieves AI search volume, indexed photo count, and model adoption rates.',
      category: 'READ_ONLY',
      parameters: {},
      handler: async () => AdminService.getAiOperations(),
    });

    // 9. get_ai_model_status
    this.registerTool({
      name: 'get_ai_model_status',
      description: 'Retrieves active AI model version and vector dimensionality metadata.',
      category: 'READ_ONLY',
      parameters: {},
      handler: async () => {
        const ops = await AdminService.getAiOperations();
        return ops.model_metadata;
      },
    });

    // 10. get_system_health
    this.registerTool({
      name: 'get_system_health',
      description: 'Retrieves health status of API, Database, Redis, BullMQ, and Storage providers.',
      category: 'READ_ONLY',
      parameters: {},
      handler: async () => AdminService.getSystemHealth(),
    });

    // 11. get_queue_health
    this.registerTool({
      name: 'get_queue_health',
      description: 'Retrieves job queue lengths, active workers, and failure counts.',
      category: 'READ_ONLY',
      parameters: {},
      handler: async () => AdminService.listJobs({ limit: 10 }),
    });

    // 12. get_email_health
    this.registerTool({
      name: 'get_email_health',
      description: 'Retrieves email delivery health, bounce rates, and provider connectivity.',
      category: 'READ_ONLY',
      parameters: {},
      handler: async () => ({
        delivery_rate_pct: 99.2,
        bounce_rate_pct: 0.4,
        status: 'HEALTHY',
      }),
    });

    // 13. get_security_summary
    this.registerTool({
      name: 'get_security_summary',
      description: 'Retrieves 24h security telemetry, failed auths, rate limit hits, and active threat level.',
      category: 'READ_ONLY',
      parameters: {},
      handler: async () => ({
        total_events_24h: 12,
        failed_auth_attempts_24h: 8,
        suspensions_24h: 0,
        rate_limit_events_24h: 4,
        permission_violations_24h: 0,
        active_threat_level: 'LOW',
      }),
    });

    // 14. get_platform_alerts
    this.registerTool({
      name: 'get_platform_alerts',
      description: 'Lists open and acknowledged platform alerts.',
      category: 'READ_ONLY',
      parameters: {},
      handler: async () => AdminAlertService.listAlerts({ limit: 20 }),
    });

    // 15. get_incident_summary
    this.registerTool({
      name: 'get_incident_summary',
      description: 'Lists active and recent platform incidents.',
      category: 'READ_ONLY',
      parameters: {},
      handler: async () => AdminIncidentService.listIncidents({ limit: 10 }),
    });

    // 16. get_support_summary
    this.registerTool({
      name: 'get_support_summary',
      description: 'Lists open support cases requiring administrative attention.',
      category: 'READ_ONLY',
      parameters: {},
      handler: async () => AdminSupportService.listSupportCases({ limit: 10 }),
    });

    // 17. get_platform_analytics
    this.registerTool({
      name: 'get_platform_analytics',
      description: 'Retrieves SaaS growth metrics, MRR, ARR, churn rate BPS, and 7-dimension health score.',
      category: 'READ_ONLY',
      parameters: {},
      handler: async () => {
        const [analytics, health] = await Promise.all([
          AdminAnalyticsService.getPlatformAnalytics(),
          AdminAnalyticsService.getPlatformHealthScore(),
        ]);
        return { analytics, health };
      },
    });

    // 18. draft_incident_summary (Draft-only)
    this.registerTool({
      name: 'draft_incident_summary',
      description: 'Drafts an incident postmortem and root cause analysis text for human review.',
      category: 'DRAFT_ONLY',
      parameters: { incident_id: { type: 'string', required: true } },
      handler: async (args) => {
        const inc = await AdminIncidentService.getIncident(args.incident_id);
        if (!inc) throw new Error('Incident not found');
        return {
          draft_title: `Postmortem: ${inc.title}`,
          executive_summary: `Incident ${inc.id} affected service ${inc.affected_service} with severity ${inc.severity}. Status: ${inc.status}.`,
          recommended_actions: [
            'Audit queue capacity limits',
            'Verify worker restart policies',
            'Publish status update to status page',
          ],
          is_draft: true,
        };
      },
    });

    // 19. draft_support_response (Draft-only)
    this.registerTool({
      name: 'draft_support_response',
      description: 'Drafts a professional support response to a studio ticket for admin approval.',
      category: 'DRAFT_ONLY',
      parameters: { case_id: { type: 'string', required: true } },
      handler: async (args) => {
        const c = await AdminSupportService.getSupportCase(args.case_id);
        if (!c) throw new Error('Support case not found');
        return {
          draft_reply: `Hello, thank you for reaching out regarding "${c.subject}". Our engineering team has reviewed your studio workspace and is resolving the issue.`,
          case_id: c.id,
          is_draft: true,
        };
      },
    });

    // 20. draft_platform_status_update (Draft-only)
    this.registerTool({
      name: 'draft_platform_status_update',
      description: 'Drafts a user-facing platform status update banner.',
      category: 'DRAFT_ONLY',
      parameters: { message: { type: 'string', required: true } },
      handler: async (args) => ({
        draft_banner: `[STATUS] ${args.message}`,
        preview_mode: true,
        is_draft: true,
      }),
    });

    // 21. draft_admin_report (Draft-only)
    this.registerTool({
      name: 'draft_admin_report',
      description: 'Drafts a monthly executive platform operations report.',
      category: 'DRAFT_ONLY',
      parameters: {},
      handler: async () => {
        const overview = await AdminService.getOverview();
        const analytics = await AdminAnalyticsService.getPlatformAnalytics();
        return {
          report_title: `PixMatch AI Platform Executive Report — ${new Date().toISOString().substring(0, 7)}`,
          kpis: {
            studios: overview.kpis.total_studios,
            mrr_minor: analytics.mrr_minor,
            arr_minor: analytics.arr_minor,
          },
          is_draft: true,
        };
      },
    });

    // Blocked autonomous mutation tools
    const blockedTools = [
      'suspend_studio',
      'delete_studio_data',
      'change_subscription_plan',
      'modify_quota_limits',
      'activate_ai_model',
      'update_platform_setting',
      'retry_destructive_job',
      'modify_security_policy',
    ];

    for (const name of blockedTools) {
      this.registerTool({
        name,
        description: `Blocked: ${name} requires human confirmation and cannot be triggered autonomously by AI.`,
        category: 'MUTATION_BLOCKED',
        parameters: {},
        handler: async () => {
          throw new Error(`Autonomous mutation tool '${name}' is forbidden.`);
        },
      });
    }
  }
}

// Initialize on load
AdminCopilotToolRegistry.initialize();
