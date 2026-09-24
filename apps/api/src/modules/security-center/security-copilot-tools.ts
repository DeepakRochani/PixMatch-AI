import {
  SecurityDetectionService,
} from './security-detection.service.js';
import {
  SecurityRulesService,
} from './security-rules.service.js';
import {
  SecurityInvestigationService,
} from './security-investigation.service.js';
import {
  SecurityEventCategory,
  SecurityEventStatus,
} from '@pixmatch/types';

export class PolicyViolationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'PolicyViolationError';
  }
}

export interface CopilotToolResult {
  tool: string;
  data?: any;
  draft?: string;
  error?: string;
  sanitized: boolean;
}

export class SecurityCopilotTools {
  // -------------------------------------------------------------
  // READ-ONLY TOOLS (14 TOOLS)
  // -------------------------------------------------------------

  static async get_security_overview(): Promise<CopilotToolResult> {
    const summary = await SecurityDetectionService.getThreatSummary();
    return { tool: 'get_security_overview', data: summary, sanitized: true };
  }

  static async get_security_events(filter: any = {}): Promise<CopilotToolResult> {
    const result = await SecurityDetectionService.listEvents(filter);
    return { tool: 'get_security_events', data: result, sanitized: true };
  }

  static async get_security_event(params: { id: string }): Promise<CopilotToolResult> {
    const event = await SecurityDetectionService.getEvent(params.id);
    return { tool: 'get_security_event', data: event, sanitized: true };
  }

  static async get_security_timeline(filter: any = {}): Promise<CopilotToolResult> {
    const timeline = await SecurityDetectionService.getSecurityTimeline(filter);
    return { tool: 'get_security_timeline', data: timeline, sanitized: true };
  }

  static async get_authentication_security(): Promise<CopilotToolResult> {
    const events = await SecurityDetectionService.listEvents({
      category: SecurityEventCategory.AUTHENTICATION,
      limit: 50,
    });
    return { tool: 'get_authentication_security', data: events, sanitized: true };
  }

  static async get_api_security(): Promise<CopilotToolResult> {
    const events = await SecurityDetectionService.listEvents({
      category: SecurityEventCategory.API_ABUSE,
      limit: 50,
    });
    return { tool: 'get_api_security', data: events, sanitized: true };
  }

  static async get_webhook_security(): Promise<CopilotToolResult> {
    const events = await SecurityDetectionService.listEvents({
      category: SecurityEventCategory.WEBHOOK,
      limit: 50,
    });
    return { tool: 'get_webhook_security', data: events, sanitized: true };
  }

  static async get_storage_security(): Promise<CopilotToolResult> {
    const events = await SecurityDetectionService.listEvents({
      category: SecurityEventCategory.STORAGE,
      limit: 50,
    });
    return { tool: 'get_storage_security', data: events, sanitized: true };
  }

  static async get_oauth_security(): Promise<CopilotToolResult> {
    const events = await SecurityDetectionService.listEvents({
      category: SecurityEventCategory.OAUTH,
      limit: 50,
    });
    return { tool: 'get_oauth_security', data: events, sanitized: true };
  }

  static async get_payment_security(): Promise<CopilotToolResult> {
    const events = await SecurityDetectionService.listEvents({
      category: SecurityEventCategory.PAYMENT,
      limit: 50,
    });
    return { tool: 'get_payment_security', data: events, sanitized: true };
  }

  static async get_ai_security(): Promise<CopilotToolResult> {
    const events = await SecurityDetectionService.listEvents({
      category: SecurityEventCategory.AI,
      limit: 50,
    });
    return { tool: 'get_ai_security', data: events, sanitized: true };
  }

  static async get_security_rules(): Promise<CopilotToolResult> {
    const rules = await SecurityRulesService.listRules();
    return { tool: 'get_security_rules', data: rules, sanitized: true };
  }

  static async get_open_investigations(): Promise<CopilotToolResult> {
    const result = await SecurityInvestigationService.listInvestigations({
      status: SecurityEventStatus.OPEN,
    });
    return { tool: 'get_open_investigations', data: result, sanitized: true };
  }

  static async get_security_incidents(): Promise<CopilotToolResult> {
    const result = await SecurityDetectionService.listEvents({
      severity: 'CRITICAL',
      limit: 20,
    });
    return { tool: 'get_security_incidents', data: result, sanitized: true };
  }

  // -------------------------------------------------------------
  // DRAFTING TOOLS (4 TOOLS)
  // -------------------------------------------------------------

  static async draft_security_incident_summary(params: { eventId: string }): Promise<CopilotToolResult> {
    const event = await SecurityDetectionService.getEvent(params.eventId);
    if (!event) {
      return { tool: 'draft_security_incident_summary', error: 'Security event not found', sanitized: true };
    }

    const draft = `## Security Incident Summary Draft (Advisory Only)
**Event ID**: ${event.id}
**Category**: ${event.category}
**Deterministic Severity**: ${event.severity}
**Reason Code**: ${event.reason_code}
**Occurrences**: ${event.occurrence_count}
**Service**: ${event.service}
**First Seen**: ${new Date(event.first_seen_at).toUTCString()}
**Last Seen**: ${new Date(event.last_seen_at).toUTCString()}

### Observations
Deterministic rules detected repeated signals matching ${event.reason_code}. Evidence shows ${event.occurrence_count} recorded occurrences.

*Note: This summary is generated for human administrator review and does not constitute authoritative judgment of intent.*`;

    return { tool: 'draft_security_incident_summary', draft, sanitized: true };
  }

  static async draft_security_investigation_report(params: { investigationId: string }): Promise<CopilotToolResult> {
    const inv = await SecurityInvestigationService.getInvestigation(params.investigationId);
    if (!inv) {
      return { tool: 'draft_security_investigation_report', error: 'Investigation not found', sanitized: true };
    }

    const draft = `## Security Investigation Report Draft
**Investigation ID**: ${inv.id}
**Status**: ${inv.status}
**Assigned Admin**: ${inv.assigned_admin_name || inv.assigned_admin_id || 'Unassigned'}
**Opened At**: ${new Date(inv.opened_at).toUTCString()}

### Audit Notes
${inv.notes.map((n) => `- [${new Date(n.created_at).toUTCString()}] (${n.admin_name}): ${n.note}`).join('\n') || 'No notes recorded.'}

### Proposed Resolution
${inv.resolution || 'Pending administrative investigation and verification.'}`;

    return { tool: 'draft_security_investigation_report', draft, sanitized: true };
  }

  static async draft_security_status_update(): Promise<CopilotToolResult> {
    const summary = await SecurityDetectionService.getThreatSummary();
    const draft = `## SOC Operational Status Update
- **Open Security Events**: ${summary.open_events_count}
- **High Severity Events**: ${summary.high_severity_count}
- **Critical Severity Events**: ${summary.critical_events_count}
- **Auth Failures (24h)**: ${summary.authentication_failures_count}
- **Authorization / IDOR Denials**: ${summary.authorization_denials_count}
- **Webhook Signature Failures**: ${summary.webhook_failures_count}
- **Active Investigations**: ${summary.active_investigations_count}
- **Active Detection Rules**: ${summary.enabled_rules_count} (Suppressed: ${summary.suppressed_rules_count})`;

    return { tool: 'draft_security_status_update', draft, sanitized: true };
  }

  static async draft_security_remediation_plan(params: { category: string }): Promise<CopilotToolResult> {
    const draft = `## Security Remediation Plan Draft: ${params.category}
1. **Verification**: Verify that telemetry signals originate from distinct actor hashes and validate request headers.
2. **Containment**: If authorized, suspend compromised credentials or rotate client API secrets after confirmation.
3. **Telemetry Hardening**: Ensure affected endpoints continue enforcing rate-limiting and correlation logging.
4. **Post-Mortem**: Document root causes in the SOC investigation log.`;

    return { tool: 'draft_security_remediation_plan', draft, sanitized: true };
  }

  // -------------------------------------------------------------
  // STRICT MUTATION BLOCKER GUARD
  // -------------------------------------------------------------

  static blockUnpermittedAction(actionName: string): never {
    throw new PolicyViolationError(
      `Autonomous action '${actionName}' is strictly blocked by SOC safety policy. AI Copilot is read-only and may not declare maliciousness, mute rules, disable authentication/MFA, block studios, delete logs, or execute rollbacks.`
    );
  }
}
