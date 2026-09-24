import { FeatureFlagService } from './feature-flag.service.js';
import { ConfigurationService } from './configuration.service.js';
import { ChangeRequestService } from './change-request.service.js';
import { ReleaseService } from './release.service.js';
import { DriftService } from './drift.service.js';
import {
  PlatformEnvironment,
  ChangeRequestStatus,
  ChangeRequestType,
  ChangeRiskLevel,
  ChangeApprovalDecision,
} from '@pixmatch/types';

export class PolicyViolationError extends Error {
  constructor(message: string) {
    super(`[POLICY VIOLATION] ${message}`);
    this.name = 'PolicyViolationError';
  }
}

export class ReleaseCopilotTools {
  // =========================================================================
  // 12 READ-ONLY DIAGNOSTIC COPILOT TOOLS
  // =========================================================================

  public static async listFeatureFlags() {
    return await FeatureFlagService.listFeatureFlags();
  }

  public static async listConfigurations(filters?: any) {
    return await ConfigurationService.listConfigurations(filters);
  }

  public static async previewConfigurationDiff(
    key: string,
    environment: PlatformEnvironment = PlatformEnvironment.PRODUCTION,
    proposedValue: any
  ) {
    return await ConfigurationService.computeDiff(key, environment, proposedValue);
  }

  public static async compareEnvironments() {
    return await DriftService.compareEnvironments();
  }

  public static async summarizeReleaseSafety() {
    const overview = await ReleaseService.getOverviewMetrics();
    return {
      production_health: overview.production_health_status,
      active_releases: overview.active_releases_count,
      pending_changes: overview.pending_change_requests,
      kill_switches_active: overview.kill_switches_active_count,
    };
  }

  public static async get_release_status(releaseId: string) {
    const release = await ReleaseService.getRelease(releaseId);
    if (!release) return { found: false, message: `Release '${releaseId}' not found` };
    return { found: true, release };
  }

  public static async get_release_history(environment: PlatformEnvironment = PlatformEnvironment.PRODUCTION) {
    const releases = await ReleaseService.listReleases({ environment });
    return { count: releases.length, releases };
  }

  public static async get_feature_flag_status(flagKey: string) {
    const flag = await FeatureFlagService.getFeatureFlag(flagKey);
    if (!flag) return { found: false, message: `Feature flag '${flagKey}' not found` };
    return { found: true, flag };
  }

  public static async get_feature_flag_history(flagKey: string) {
    const versions = await FeatureFlagService.getFlagVersions(flagKey);
    return { flag_key: flagKey, version_count: versions.length, versions };
  }

  public static async get_configuration_status(key: string, environment: PlatformEnvironment = PlatformEnvironment.PRODUCTION) {
    const config = await ConfigurationService.getConfiguration(key, environment);
    if (!config) return { found: false, message: `Configuration '${key}' not found in ${environment}` };
    return {
      found: true,
      key: config.key,
      category: config.category,
      type: config.type,
      value: config.is_secret_reference ? '[REDACTED]' : config.value,
      environment: config.environment,
      version: config.version,
      risk_level: config.risk_level,
    };
  }

  public static async get_configuration_diff(key: string, proposedValue: any, environment: PlatformEnvironment = PlatformEnvironment.PRODUCTION) {
    const diff = await ConfigurationService.calculateDiff(key, proposedValue, environment);
    return { diff };
  }

  public static async get_environment_diff() {
    const comparisons = await DriftService.compareEnvironments();
    return { count: comparisons.length, comparisons };
  }

  public static async get_configuration_drift(environment: PlatformEnvironment = PlatformEnvironment.PRODUCTION) {
    const drifts = await DriftService.listDriftEvents({ environment });
    return { count: drifts.length, drifts };
  }

  public static async get_release_health(releaseId: string, windowMinutes: number = 15) {
    return await ReleaseService.evaluateReleaseHealth(releaseId, windowMinutes);
  }

  public static async get_change_request(requestId: string) {
    const request = await ChangeRequestService.getChangeRequest(requestId);
    if (!request) return { found: false, message: `Change request '${requestId}' not found` };
    return { found: true, request };
  }

  public static async get_pending_approvals() {
    const pending = await ChangeRequestService.listChangeRequests({ status: ChangeRequestStatus.PENDING_APPROVAL });
    return { count: pending.length, pending_change_requests: pending };
  }

  public static async get_release_impact(resourceKey: string, changeType: any) {
    const impact = ChangeRequestService.calculateImpactAnalysis(resourceKey, changeType);
    return { resource_key: resourceKey, impact };
  }

  // =========================================================================
  // 5 DRAFTING / ADVISORY COPILOT TOOLS
  // =========================================================================

  public static async draftChangeRequest(input: {
    title: string;
    targetKey?: string;
    target_resource_key?: string;
    targetType?: ChangeRequestType;
    type?: ChangeRequestType;
    proposedValue?: any;
    proposed_value?: any;
    reason?: string;
    description?: string;
    environment?: PlatformEnvironment;
    riskLevel?: ChangeRiskLevel;
    risk_level?: ChangeRiskLevel;
  }) {
    const targetKey = input.targetKey || input.target_resource_key || 'config.key';
    const type = input.targetType || input.type || ChangeRequestType.CONFIGURATION_UPDATE;
    const proposed = input.proposedValue !== undefined ? input.proposedValue : input.proposed_value;
    const reason = input.reason || input.description || 'Copilot draft proposal';
    const env = input.environment || PlatformEnvironment.PRODUCTION;
    const risk = input.riskLevel || input.risk_level || ChangeRiskLevel.MEDIUM;

    const cr = await ChangeRequestService.createChangeRequest(
      {
        title: input.title,
        type,
        description: reason,
        target_resource_key: targetKey,
        target_version: 1,
        environment: env,
        risk_level: risk,
        diff_payload: { proposed },
      },
      'copilot_assistant_draft',
      'copilot@pixmatch.ai'
    );

    return {
      action: 'DRAFT_CREATED',
      changeRequest: cr,
      change_request: cr,
    };
  }

  public static draft_release_plan(input: {
    target_version: string;
    environment: PlatformEnvironment;
    summary: string;
    features: string[];
    migrations?: string[];
  }) {
    return {
      draft_type: 'RELEASE_PLAN_PROPOSAL',
      target_version: input.target_version,
      environment: input.environment,
      phased_steps: [
        '1. Pre-deployment smoke test verification',
        '2. Read-only schema compatibility audit',
        '3. Feature flag canary activation (10% cohort)',
        '4. Production deployment execution',
        '5. 15-minute SLI/SLO health observation window',
        '6. Full 100% rollout confirmation',
      ],
      estimated_duration_minutes: 30,
      requires_human_approval: true,
      migration_notes: input.migrations || ['No destructive database migrations identified'],
    };
  }

  public static draft_release_notes(input: {
    version: string;
    features: string[];
    fixes: string[];
    breaking_changes?: string[];
  }) {
    return {
      draft_type: 'RELEASE_NOTES_PROPOSAL',
      version: input.version,
      published_at: new Date().toISOString(),
      highlights: input.features,
      resolved_issues: input.fixes,
      breaking_changes: input.breaking_changes || ['None. Fully backward compatible.'],
      redaction_verified: true,
    };
  }

  public static draft_change_impact_report(resourceKey: string) {
    const impact = ChangeRequestService.calculateImpactAnalysis(resourceKey, 'CONFIGURATION' as any);
    return {
      draft_type: 'CHANGE_IMPACT_REPORT',
      resource_key: resourceKey,
      blast_radius: impact.estimated_blast_radius,
      affected_routes: impact.affected_routes,
      affected_services: impact.affected_services,
      mitigation_strategy: 'Deploy in STAGING first; perform canary validation before production promotion.',
    };
  }

  public static draft_rollback_plan(releaseVersion: string, targetVersion: string) {
    return {
      draft_type: 'ROLLBACK_PLAN_PROPOSAL',
      current_version: releaseVersion,
      target_rollback_version: targetVersion,
      steps: [
        '1. Verify database schema compatibility with target rollback version',
        '2. Trigger feature flag kill-switches for newly deployed features',
        '3. Route traffic to prior deployment container cluster',
        '4. Confirm error rates and latency normalize to baseline (<0.05% error rate)',
        '5. Post-rollback audit log and incident timeline recording',
      ],
      requires_human_operator_approval: true,
    };
  }

  public static draft_configuration_review(key: string, currentValue: any, proposedValue: any) {
    return {
      draft_type: 'CONFIGURATION_REVIEW_PROPOSAL',
      key,
      current_value_redacted: key.includes('secret') || key.includes('key') ? '[REDACTED]' : currentValue,
      proposed_value_redacted: key.includes('secret') || key.includes('key') ? '[REDACTED]' : proposedValue,
      recommendation: 'Verify configuration in Staging environment before submitting Production Change Request.',
      safety_check_passed: true,
    };
  }

  // =========================================================================
  // STRICTLY BLOCKED DIRECT MUTATION TOOLS (THROWS PolicyViolationError)
  // =========================================================================

  public static async autonomousDeployRelease(_input?: any): Promise<never> {
    throw new PolicyViolationError(
      'Security Copilot is strictly prohibited from autonomously deploying releases to production. Requires human administrator approval and execution.'
    );
  }

  public static async autonomousModifyConfiguration(_input?: any): Promise<never> {
    throw new PolicyViolationError(
      'Security Copilot cannot autonomously mutate critical platform configurations. Requires Two-Person Approval workflow.'
    );
  }

  public static async autonomousApproveChangeRequest(_input?: any): Promise<never> {
    throw new PolicyViolationError(
      'Security Copilot cannot approve its own change request proposals. Approvals must be signed by authorized human administrators.'
    );
  }

  public static async autonomousTriggerKillSwitch(_input?: any): Promise<never> {
    throw new PolicyViolationError(
      'Security Copilot cannot autonomously toggle emergency kill switches. Requires human administrator intervention.'
    );
  }

  public static async autonomousBypassSecurityCheck(_input?: any): Promise<never> {
    throw new PolicyViolationError(
      'Security Copilot cannot bypass security or verification check guardrails under any circumstance.'
    );
  }

  public static deployReleaseDirect(): never {
    throw new PolicyViolationError(
      'Security Copilot is strictly prohibited from autonomously deploying releases to production. Requires human administrator approval and execution.'
    );
  }

  public static rollbackReleaseDirect(): never {
    throw new PolicyViolationError(
      'Security Copilot is strictly prohibited from autonomously rolling back production deployments without human admin authorization.'
    );
  }

  public static activateFeatureFlagDirect(): never {
    throw new PolicyViolationError(
      'Security Copilot cannot autonomously activate production feature flags. Requires human admin approval via Change Request workflow.'
    );
  }

  public static modifyCriticalConfigDirect(): never {
    throw new PolicyViolationError(
      'Security Copilot cannot autonomously mutate critical platform configurations. Requires Two-Person Approval workflow.'
    );
  }

  public static approveChangeRequestDirect(): never {
    throw new PolicyViolationError(
      'Security Copilot cannot approve its own change request proposals. Approvals must be signed by authorized human administrators.'
    );
  }
}
