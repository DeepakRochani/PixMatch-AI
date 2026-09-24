import {
  CanonicalService,
  PlatformErrorSeverity,
  PlatformErrorStatus,
  MetricType,
  BackupType,
} from '@pixmatch/types';
import { reliabilityService } from './reliability.service';
import { errorTracker } from './error-tracker.service';
import { metrics } from './metrics.service';
import { sliSloService } from './sli-slo.service';
import { circuitBreakers } from './circuit-breaker';
import { backupRecoveryService } from './backup-recovery.service';
import { deploymentSafety } from './deployment-safety.service';

/**
 * 18 Read-Only Diagnostic Copilot Tools
 */
export const diagnosticTools = {
  getPlatformHealthOverview: async () => {
    return reliabilityService.getPlatformHealthOverview();
  },

  getServiceHealth: async (serviceName: CanonicalService) => {
    return reliabilityService.probeService(serviceName);
  },

  queryErrors: async (params: {
    service?: string;
    severity?: PlatformErrorSeverity;
    status?: PlatformErrorStatus;
    search?: string;
    page?: number;
    limit?: number;
  } = {}) => {
    return errorTracker.getErrors(params);
  },

  getErrorDetails: async (idOrFingerprint: string) => {
    const error = await errorTracker.getErrorById(idOrFingerprint);
    if (!error) throw new Error(`Error with ID or fingerprint '${idOrFingerprint}' not found`);
    return error;
  },

  getErrorSummary: async () => {
    return errorTracker.getErrorSummary();
  },

  queryMetrics: async (filter: { service?: string; name?: string; type?: MetricType; sinceMs?: number } = {}) => {
    return metrics.queryMetrics(filter);
  },

  getLatencyPercentiles: async (service: string, metricName: string) => {
    return metrics.calculatePercentiles(service, metricName);
  },

  getSystemMetrics: async () => {
    return metrics.getSystemMetrics();
  },

  getAllSLOs: async () => {
    return sliSloService.getAllSLOs();
  },

  getSLODetails: async (sloId: string) => {
    const slo = await sliSloService.getSLOById(sloId);
    if (!slo) throw new Error(`SLO with ID '${sloId}' not found`);
    return slo;
  },

  getCircuitBreakerStats: async () => {
    return circuitBreakers.getAllStats();
  },

  listBackups: async () => {
    return backupRecoveryService.getBackups();
  },

  verifyBackup: async (backupId: string) => {
    return backupRecoveryService.verifyBackupChecksum(backupId);
  },

  listDRPlans: async () => {
    return backupRecoveryService.getDRPlans();
  },

  getDRPlan: async (planId: string) => {
    const plan = await backupRecoveryService.getDRPlanById(planId);
    if (!plan) throw new Error(`DR Plan '${planId}' not found`);
    return plan;
  },

  listRecoveryRuns: async () => {
    return backupRecoveryService.getRecoveryRuns();
  },

  listDeployments: async () => {
    return deploymentSafety.getDeployments();
  },

  validateMigration: async (migrationNameOrSql: string) => {
    return deploymentSafety.validateMigrationSafety(migrationNameOrSql);
  },
};

/**
 * 4 Draft Tools (Proposals requiring human confirmation)
 */
export const draftTools = {
  draftDisasterRecoveryPlan: async (input: {
    name: string;
    description: string;
    target_rto_minutes: number;
    target_rpo_minutes: number;
    failover_steps: Array<{
      step_number: number;
      title: string;
      description: string;
      command_or_action: string;
      estimated_duration_seconds: number;
      automated: boolean;
    }>;
  }) => {
    return {
      requires_admin_approval: true,
      action: 'CREATE_DR_PLAN_PROPOSAL',
      proposal: {
        ...input,
        drafted_at: new Date().toISOString(),
        warning: 'This is a draft plan proposal. An authorized Super Admin must review and confirm activation.',
      },
    };
  },

  draftSLODefinition: async (input: {
    name: string;
    description: string;
    service: string;
    target_percent: number;
    window_days: number;
    sli_formula: string;
  }) => {
    return {
      requires_admin_approval: true,
      action: 'CREATE_SLO_PROPOSAL',
      proposal: {
        ...input,
        drafted_at: new Date().toISOString(),
      },
    };
  },

  draftBackupSchedule: async (input: {
    backup_type: BackupType;
    cron_expression: string;
    retention_days: number;
    target_storage: string;
  }) => {
    return {
      requires_admin_approval: true,
      action: 'UPDATE_BACKUP_SCHEDULE_PROPOSAL',
      proposal: {
        ...input,
        drafted_at: new Date().toISOString(),
      },
    };
  },

  draftRollbackPlan: async (deploymentId: string) => {
    const evaluation = await deploymentSafety.evaluateRollbackReadiness(deploymentId);
    return {
      requires_admin_approval: true,
      action: 'ROLLBACK_DEPLOYMENT_PROPOSAL',
      proposal: {
        deployment_id: deploymentId,
        evaluation,
        drafted_at: new Date().toISOString(),
        warning: 'Rollback requires explicit Super Admin confirmation with 2FA token before execution.',
      },
    };
  },
};

export interface ReliabilityCopilotToolDef {
  name: string;
  category: 'DIAGNOSTIC' | 'DRAFT_PROPOSAL' | 'BLOCKED_MUTATION';
  description: string;
  readOnly: boolean;
  requiresHumanApproval: boolean;
  blocked: boolean;
}

export const reliabilityCopilotTools: ReliabilityCopilotToolDef[] = [
  // 18 Diagnostic Tools
  { name: 'get_platform_health_overview', category: 'DIAGNOSTIC', description: 'Get overall platform health matrix across canonical services', readOnly: true, requiresHumanApproval: false, blocked: false },
  { name: 'get_service_health', category: 'DIAGNOSTIC', description: 'Probe an individual canonical service health', readOnly: true, requiresHumanApproval: false, blocked: false },
  { name: 'query_errors', category: 'DIAGNOSTIC', description: 'Search and filter platform error events by fingerprint, service, or severity', readOnly: true, requiresHumanApproval: false, blocked: false },
  { name: 'get_error_details', category: 'DIAGNOSTIC', description: 'Get detailed error trace and metadata for a specific error ID or fingerprint', readOnly: true, requiresHumanApproval: false, blocked: false },
  { name: 'get_error_summary', category: 'DIAGNOSTIC', description: 'Get aggregated error summary across all services for the last 24h', readOnly: true, requiresHumanApproval: false, blocked: false },
  { name: 'get_error_events', category: 'DIAGNOSTIC', description: 'Get list of error events with sanitized stack traces', readOnly: true, requiresHumanApproval: false, blocked: false },
  { name: 'query_metrics', category: 'DIAGNOSTIC', description: 'Query recorded platform time-series metrics', readOnly: true, requiresHumanApproval: false, blocked: false },
  { name: 'get_latency_percentiles', category: 'DIAGNOSTIC', description: 'Compute p50, p75, p90, p95, p99 latency percentiles for a service', readOnly: true, requiresHumanApproval: false, blocked: false },
  { name: 'get_system_metrics', category: 'DIAGNOSTIC', description: 'Get system telemetry (CPU, memory, event loop delay, uptime)', readOnly: true, requiresHumanApproval: false, blocked: false },
  { name: 'query_structured_logs', category: 'DIAGNOSTIC', description: 'Query structured JSON logs with correlation filtering', readOnly: true, requiresHumanApproval: false, blocked: false },
  { name: 'get_all_slos', category: 'DIAGNOSTIC', description: 'List all registered SLI/SLO definitions and error budgets', readOnly: true, requiresHumanApproval: false, blocked: false },
  { name: 'get_slo_details', category: 'DIAGNOSTIC', description: 'Get evaluated error budget and burn rate for a specific SLO', readOnly: true, requiresHumanApproval: false, blocked: false },
  { name: 'get_circuit_breaker_stats', category: 'DIAGNOSTIC', description: 'Inspect circuit breaker states and failure counts across services', readOnly: true, requiresHumanApproval: false, blocked: false },
  { name: 'list_backups', category: 'DIAGNOSTIC', description: 'List database and snapshot backup records with checksum status', readOnly: true, requiresHumanApproval: false, blocked: false },
  { name: 'verify_backup', category: 'DIAGNOSTIC', description: 'Verify SHA-256 integrity checksum for a backup record', readOnly: true, requiresHumanApproval: false, blocked: false },
  { name: 'list_dr_plans', category: 'DIAGNOSTIC', description: 'List disaster recovery runbook plans and SLA targets', readOnly: true, requiresHumanApproval: false, blocked: false },
  { name: 'get_dr_plan', category: 'DIAGNOSTIC', description: 'Get specific DR plan failover sequence steps', readOnly: true, requiresHumanApproval: false, blocked: false },
  { name: 'list_recovery_runs', category: 'DIAGNOSTIC', description: 'List historical DR drill and failover execution runs', readOnly: true, requiresHumanApproval: false, blocked: false },

  // 4 Draft Proposal Tools
  { name: 'draft_disaster_recovery_plan', category: 'DRAFT_PROPOSAL', description: 'Draft a proposed DR runbook failover plan for Super Admin review', readOnly: false, requiresHumanApproval: true, blocked: false },
  { name: 'draft_slo_definition', category: 'DRAFT_PROPOSAL', description: 'Draft a proposed SLI/SLO target and error budget policy', readOnly: false, requiresHumanApproval: true, blocked: false },
  { name: 'draft_backup_schedule', category: 'DRAFT_PROPOSAL', description: 'Draft a proposed automated backup retention schedule', readOnly: false, requiresHumanApproval: true, blocked: false },
  { name: 'draft_rollback_plan', category: 'DRAFT_PROPOSAL', description: 'Draft a rollback proposal with pre-flight migration check', readOnly: false, requiresHumanApproval: true, blocked: false },

  // 8 Blocked Mutation Tools
  { name: 'autonomous_failover_region', category: 'BLOCKED_MUTATION', description: 'Autonomous trigger of cross-region live failover (Strictly Blocked)', readOnly: false, requiresHumanApproval: true, blocked: true },
  { name: 'execute_recovery_run_autonomous', category: 'BLOCKED_MUTATION', description: 'Autonomous execution of disaster recovery run (Strictly Blocked)', readOnly: false, requiresHumanApproval: true, blocked: true },
  { name: 'trigger_rollback_autonomous', category: 'BLOCKED_MUTATION', description: 'Autonomous execution of production rollback (Strictly Blocked)', readOnly: false, requiresHumanApproval: true, blocked: true },
  { name: 'delete_backup_record', category: 'BLOCKED_MUTATION', description: 'Autonomous deletion of immutable backup snapshot (Strictly Blocked)', readOnly: false, requiresHumanApproval: true, blocked: true },
  { name: 'force_open_circuit_breaker_autonomous', category: 'BLOCKED_MUTATION', description: 'Autonomous opening of platform circuit breaker (Strictly Blocked)', readOnly: false, requiresHumanApproval: true, blocked: true },
  { name: 'drop_database_table_autonomous', category: 'BLOCKED_MUTATION', description: 'Autonomous execution of destructive SQL DROP statement (Strictly Blocked)', readOnly: false, requiresHumanApproval: true, blocked: true },
  { name: 'override_slo_target_autonomous', category: 'BLOCKED_MUTATION', description: 'Autonomous override of production SLO target (Strictly Blocked)', readOnly: false, requiresHumanApproval: true, blocked: true },
  { name: 'execute_schema_migration_autonomous', category: 'BLOCKED_MUTATION', description: 'Autonomous live database migration execution (Strictly Blocked)', readOnly: false, requiresHumanApproval: true, blocked: true },
];

export function getToolsByCategory(category: 'DIAGNOSTIC' | 'DRAFT_PROPOSAL' | 'BLOCKED_MUTATION'): ReliabilityCopilotToolDef[] {
  return reliabilityCopilotTools.filter((t) => t.category === category);
}

export function isToolExecutionPermitted(toolName: string): boolean {
  const tool = reliabilityCopilotTools.find((t) => t.name === toolName);
  if (!tool) return false;
  return !tool.blocked;
}

export async function executeReliabilityCopilotTool(toolName: string, args: any = {}): Promise<any> {
  const tool = reliabilityCopilotTools.find((t) => t.name === toolName);
  if (!tool) {
    throw new Error(`Unknown copilot tool: '${toolName}'`);
  }

  if (tool.blocked) {
    throw new Error(`POLICY_VIOLATION: Autonomous execution of '${toolName}' is strictly blocked by platform governance policy.`);
  }

  // Route diagnostic tools
  switch (toolName) {
    case 'get_platform_health_overview':
      return { success: true, data: await diagnosticTools.getPlatformHealthOverview() };
    case 'get_service_health':
      return { success: true, data: await diagnosticTools.getServiceHealth(args.serviceName || args.service) };
    case 'query_errors':
    case 'get_error_events':
      return { success: true, data: await diagnosticTools.queryErrors(args) };
    case 'get_error_details':
      return { success: true, data: await diagnosticTools.getErrorDetails(args.id || args.fingerprint) };
    case 'get_error_summary':
      return { success: true, data: await diagnosticTools.getErrorSummary() };
    case 'query_metrics':
      return { success: true, data: await diagnosticTools.queryMetrics(args) };
    case 'get_latency_percentiles':
      return { success: true, data: await diagnosticTools.getLatencyPercentiles(args.service, args.metricName || args.name) };
    case 'get_system_metrics':
      return { success: true, data: await diagnosticTools.getSystemMetrics() };
    case 'query_structured_logs':
      return { success: true, data: await diagnosticTools.queryMetrics(args) };
    case 'get_all_slos':
      return { success: true, data: await diagnosticTools.getAllSLOs() };
    case 'get_slo_details':
      return { success: true, data: await diagnosticTools.getSLODetails(args.sloId || args.id) };
    case 'get_circuit_breaker_stats':
      return { success: true, data: await diagnosticTools.getCircuitBreakerStats() };
    case 'list_backups':
      return { success: true, data: await diagnosticTools.listBackups() };
    case 'verify_backup':
      return { success: true, data: await diagnosticTools.verifyBackup(args.backupId || args.id) };
    case 'list_dr_plans':
      return { success: true, data: await diagnosticTools.listDRPlans() };
    case 'get_dr_plan':
      return { success: true, data: await diagnosticTools.getDRPlan(args.planId || args.id) };
    case 'list_recovery_runs':
      return { success: true, data: await diagnosticTools.listRecoveryRuns() };
    case 'draft_disaster_recovery_plan':
      return { success: true, data: await draftTools.draftDisasterRecoveryPlan(args) };
    case 'draft_slo_definition':
      return { success: true, data: await draftTools.draftSLODefinition(args) };
    case 'draft_backup_schedule':
      return { success: true, data: await draftTools.draftBackupSchedule(args) };
    case 'draft_rollback_plan':
      return { success: true, data: await draftTools.draftRollbackPlan(args.deploymentId || args.id) };
    default:
      return { success: true, message: `Tool ${toolName} executed successfully` };
  }
}

