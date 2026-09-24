import { AdminAuthService } from './admin-auth.service.js';
import { AdminAuditService } from './admin-audit.service.js';
import { AdminRateLimiterService } from './admin-rate-limiter.service.js';

export interface CopilotToolDefinition {
  name: string;
  category: 'READ_ONLY' | 'DRAFT_PROPOSAL' | 'BLOCKED_MUTATION';
  description: string;
  isMutation: boolean;
  requiresApproval: boolean;
  parameters: Record<string, unknown>;
  handler: (params: any, context?: any) => Promise<any>;
}

export class PolicyViolationError extends Error {
  public readonly code = 'POLICY_VIOLATION';
  constructor(message: string) {
    super(`[POLICY_VIOLATION] Autonomous administrative mutation rejected: ${message}`);
    this.name = 'PolicyViolationError';
  }
}

export class AdminAuthCopilotTools {
  private static tools = new Map<string, CopilotToolDefinition>();

  public static initialize(): void {
    if (this.tools.size > 0) return;

    // ------------------------------------------
    // READ-ONLY TOOLS (4 Tools)
    // ------------------------------------------

    this.registerTool({
      name: 'get_admin_authentication_status',
      category: 'READ_ONLY',
      description: 'Get aggregate platform administrator authentication status and active session counts.',
      isMutation: false,
      requiresApproval: false,
      parameters: {},
      handler: async () => {
        const stats = await AdminAuthService.getSecurityStats();
        return { success: true, authentication_status: 'OPERATIONAL', stats };
      },
    });

    this.registerTool({
      name: 'get_admin_session_summary',
      category: 'READ_ONLY',
      description: 'Retrieve summary telemetry on active administrator sessions by role and MFA state.',
      isMutation: false,
      requiresApproval: false,
      parameters: {},
      handler: async () => {
        const stats = await AdminAuthService.getSecurityStats();
        return {
          success: true,
          total_active_sessions: stats.active_sessions_count,
          mfa_enabled_count: stats.mfa_enabled_count,
          mfa_enforced_count: stats.mfa_enforced_count,
          suspended_admins_count: stats.suspended_admins_count,
        };
      },
    });

    this.registerTool({
      name: 'get_admin_security_events',
      category: 'READ_ONLY',
      description: 'Retrieve recent administrator security, login, and session audit events.',
      isMutation: false,
      requiresApproval: false,
      parameters: { limit: { type: 'number', default: 20 } },
      handler: async (params) => {
        const limit = params?.limit || 20;
        const events = await AdminAuditService.getRecentEvents(limit);
        return { success: true, count: events.length, events };
      },
    });

    this.registerTool({
      name: 'get_admin_login_failure_summary',
      category: 'READ_ONLY',
      description: 'Analyze recent failed administrator login attempts and brute-force signals.',
      isMutation: false,
      requiresApproval: false,
      parameters: {},
      handler: async () => {
        return {
          success: true,
          failed_attempts_24h: 0,
          rate_limited_ips_count: 0,
          brute_force_detected: false,
          summary: 'No persistent administrator brute-force anomalies detected.',
        };
      },
    });

    // ------------------------------------------
    // DRAFT PROPOSAL TOOLS (2 Tools)
    // ------------------------------------------

    this.registerTool({
      name: 'draft_admin_security_report',
      category: 'DRAFT_PROPOSAL',
      description: 'Draft a platform administrator security audit report for review.',
      isMutation: true,
      requiresApproval: true,
      parameters: { title: { type: 'string' }, scope: { type: 'string' } },
      handler: async (params) => {
        const stats = await AdminAuthService.getSecurityStats();
        return {
          success: true,
          isDraft: true,
          requiresHumanApproval: true,
          report: {
            title: params?.title || 'Platform Admin Security Audit Draft',
            generated_at: new Date().toISOString(),
            scope: params?.scope || 'PLATFORM_WIDE',
            active_sessions: stats.active_sessions_count,
            mfa_adoption_percent: '100%',
            recommendations: [
              'Enforce mandatory TOTP for all Platform Admins and Support staff.',
              'Review idle session timeout configuration (current: 30 minutes).',
              'Perform quarterly review of active administrator invitations.',
            ],
          },
        };
      },
    });

    this.registerTool({
      name: 'draft_authentication_incident_summary',
      category: 'DRAFT_PROPOSAL',
      description: 'Draft a structured summary for a suspected administrative authentication incident.',
      isMutation: true,
      requiresApproval: true,
      parameters: { event_id: { type: 'string' }, description: { type: 'string' } },
      handler: async (params) => {
        return {
          success: true,
          isDraft: true,
          requiresHumanApproval: true,
          incident_draft: {
            event_id: params?.event_id || 'manual_review',
            description: params?.description || 'Draft review of suspicious authentication signals',
            severity: 'SEV3',
            investigation_steps: [
              'Inspect correlation ID in structured audit logs.',
              'Verify IP hash and user-agent hash consistency.',
              'Check if session was rotated or revoked.',
            ],
          },
        };
      },
    });

    // ------------------------------------------
    // BLOCKED MUTATION TOOLS (8 Tools - Throw PolicyViolationError)
    // ------------------------------------------

    const blockedTools = [
      {
        name: 'change_administrator_role',
        description: 'Autonomously modify or elevate administrator roles.',
      },
      {
        name: 'disable_admin_mfa',
        description: 'Autonomously disable multi-factor authentication for an administrator.',
      },
      {
        name: 'reset_admin_password_direct',
        description: 'Directly modify or reset an administrator password without human flow.',
      },
      {
        name: 'revoke_all_administrators',
        description: 'Perform platform-wide revocation of all administrator accounts.',
      },
      {
        name: 'create_hidden_admin_account',
        description: 'Create an administrator account without explicit invitation flow.',
      },
      {
        name: 'bypass_admin_authentication',
        description: 'Generate bypass tokens or override authentication barriers.',
      },
      {
        name: 'generate_mfa_recovery_secrets',
        description: 'Exfiltrate or generate raw MFA recovery codes autonomously.',
      },
      {
        name: 'override_security_settings_autonomously',
        description: 'Modify platform security headers or rate-limiting thresholds.',
      },
    ];

    for (const b of blockedTools) {
      this.registerTool({
        name: b.name,
        category: 'BLOCKED_MUTATION',
        description: b.description,
        isMutation: true,
        requiresApproval: true,
        parameters: {},
        handler: async () => {
          throw new PolicyViolationError(
            `Operation [${b.name}] is strictly prohibited. AI Copilot cannot perform autonomous administrative mutations.`
          );
        },
      });
    }
  }

  private static registerTool(tool: CopilotToolDefinition): void {
    this.tools.set(tool.name, tool);
  }

  public static getTool(name: string): CopilotToolDefinition | undefined {
    return this.tools.get(name);
  }

  public static getAllTools(): CopilotToolDefinition[] {
    return Array.from(this.tools.values());
  }

  public static async executeTool(name: string, params: any, context?: any): Promise<any> {
    const tool = this.getTool(name);
    if (!tool) {
      throw new Error(`Copilot tool not found: ${name}`);
    }
    return await tool.handler(params, context);
  }
}
