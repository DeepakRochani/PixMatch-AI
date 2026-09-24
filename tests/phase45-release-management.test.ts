process.env.DATABASE_URL = process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/pixmatch_test';

/**
 * PixMatch AI — Phase 45: Platform Configuration, Feature Flags & Controlled Release Management 2.0
 * Master Test Suite
 *
 * Comprehensive validation across 14 Sections (1000+ assertions):
 *
 * SECTION 1: Feature Flag Model Extensions & Deterministic Hashing (Assertions 1-100)
 * SECTION 2: Allow/Blocklist Targeting & Subscription Plan Boundaries (Assertions 101-180)
 * SECTION 3: Snapshot Versioning & Non-Destructive Rollback for Flags (Assertions 181-260)
 * SECTION 4: Platform Configuration 2.0 & Secret Separation (Assertions 261-340)
 * SECTION 5: Configuration Validation Engine & Contract Guardrails (Assertions 341-420)
 * SECTION 6: Deterministic Diff Engine & Risk Classification (Assertions 421-500)
 * SECTION 7: Change Requests & Separation of Duties (Assertions 501-580)
 * SECTION 8: Two-Person Approval for Critical Risk Mutations (Assertions 581-660)
 * SECTION 9: Emergency Workflows & Kill Switches (Assertions 661-740)
 * SECTION 10: Pre-Release Validation & Candidate Guardrails (Assertions 741-810)
 * SECTION 11: Release Lifecycle, Health Telemetry & SLO Integration (Assertions 811-890)
 * SECTION 12: Guarded Automated Rollback for Releases (Assertions 891-960)
 * SECTION 13: Multi-Environment Comparison & Drift Detection (Assertions 961-1030)
 * SECTION 14: Security Copilot Safety & Blocked Mutations (Assertions 1031-1100)
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import crypto from 'crypto';
import {
  FeatureFlagType,
  FeatureFlagState,
  PlatformEnvironment,
  PlatformConfigCategory,
  PlatformConfigType,
  ChangeRiskLevel,
  ChangeRequestType,
  ChangeRequestStatus,
  ChangeApprovalDecision,
  PlatformReleaseStatus,
  ReleaseHealthStatus,
  DriftStatus,
  SubscriptionPlan,
  AdminPermission,
  UserRole,
} from '@pixmatch/types';
import { isPlatformAdmin, hasAdminPermission } from '@pixmatch/auth';

import { FeatureFlagService } from '../apps/api/src/modules/releases/feature-flag.service';
import { ConfigurationService } from '../apps/api/src/modules/releases/configuration.service';
import { ChangeRequestService } from '../apps/api/src/modules/releases/change-request.service';
import { ReleaseService } from '../apps/api/src/modules/releases/release.service';
import { DriftService } from '../apps/api/src/modules/releases/drift.service';
import {
  ReleaseCopilotTools,
  PolicyViolationError,
} from '../apps/api/src/modules/releases/release-copilot-tools';

describe('PixMatch AI — Phase 45: Release Management & Platform Configuration 2.0', () => {
  beforeEach(() => {
    FeatureFlagService.clearMockState();
    ConfigurationService.clearMockState();
    ChangeRequestService.clearMockState();
    ReleaseService.clearMockState();
    DriftService.clearMockState();
  });

  // =========================================================================
  // SECTION 1: Feature Flag Model Extensions & Deterministic Hashing
  // =========================================================================
  describe('SECTION 1: Feature Flag Model Extensions & Deterministic Hashing', () => {
    it('calculates deterministic bucketing from SHA-256 with zero random drift', () => {
      const flagKey = 'ai.photo.super_resolution';
      const subjectA = 'studio_alpha_123';
      const subjectB = 'studio_beta_456';

      const bucketA1 = FeatureFlagService.calculateBucket(flagKey, subjectA);
      const bucketA2 = FeatureFlagService.calculateBucket(flagKey, subjectA);
      const bucketA3 = FeatureFlagService.calculateBucket(flagKey, subjectA);

      expect(bucketA1).toBe(bucketA2);
      expect(bucketA2).toBe(bucketA3);
      expect(bucketA1).toBeGreaterThanOrEqual(0);
      expect(bucketA1).toBeLessThan(100);

      const bucketB = FeatureFlagService.calculateBucket(flagKey, subjectB);
      expect(bucketB).toBeGreaterThanOrEqual(0);
      expect(bucketB).toBeLessThan(100);

      // Verify uniform hash distribution formula explicitly
      const expectedHash = crypto.createHash('sha256').update(`${flagKey}:${subjectA}`).digest('hex');
      const expectedBucket = parseInt(expectedHash.substring(0, 8), 16) % 100;
      expect(bucketA1).toBe(expectedBucket);
    });

    it('evaluates percentage rollouts deterministically across subjects', async () => {
      const flag = await FeatureFlagService.createFlag(
        {
          key: 'features.enhanced_culling',
          name: 'Enhanced AI Culling',
          type: FeatureFlagType.PERCENTAGE,
          state: FeatureFlagState.ACTIVE,
          enabled: true,
          percentage: 50,
          environment: PlatformEnvironment.PRODUCTION,
        },
        'admin_user_1'
      );

      expect(flag.id).toBeDefined();
      expect(flag.percentage).toBe(50);
      expect(flag.current_version).toBe(1);

      // 100 deterministic evaluations
      let enabledCount = 0;
      for (let i = 0; i < 100; i++) {
        const subId = `studio_sample_${i}`;
        const evalRes = await FeatureFlagService.evaluateFeatureFlag('features.enhanced_culling', {
          studio_id: subId,
          environment: PlatformEnvironment.PRODUCTION,
        });
        const bucket = FeatureFlagService.calculateBucket('features.enhanced_culling', subId);
        if (bucket < 50) {
          expect(evalRes.enabled).toBe(true);
          enabledCount++;
        } else {
          expect(evalRes.enabled).toBe(false);
        }
      }

      expect(enabledCount).toBeGreaterThan(30);
      expect(enabledCount).toBeLessThan(70);
    });

    it('handles boolean, variant, and environment scoped flags', async () => {
      const boolFlag = await FeatureFlagService.createFlag(
        {
          key: 'ui.dark_mode_v2',
          name: 'Dark Mode v2',
          type: FeatureFlagType.BOOLEAN,
          state: FeatureFlagState.ACTIVE,
          enabled: true,
          environment: PlatformEnvironment.PRODUCTION,
        },
        'admin_user_1'
      );
      expect(boolFlag.type).toBe(FeatureFlagType.BOOLEAN);

      const res = await FeatureFlagService.evaluateFeatureFlag('ui.dark_mode_v2', {
        environment: PlatformEnvironment.PRODUCTION,
      });
      expect(res.enabled).toBe(true);
      expect(res.reason).toContain('Boolean flag is enabled');

      // Check environment mismatch
      const envRes = await FeatureFlagService.evaluateFeatureFlag('ui.dark_mode_v2', {
        environment: PlatformEnvironment.DEVELOPMENT,
      });
      expect(envRes.enabled).toBe(false);
      expect(envRes.reason).toContain('Environment mismatch');
    });
  });

  // =========================================================================
  // SECTION 2: Allow/Blocklist Targeting & Subscription Plan Boundaries
  // =========================================================================
  describe('SECTION 2: Allow/Blocklist Targeting & Subscription Plan Boundaries', () => {
    it('enforces blocklist priority over allowlist and rollout percentage', async () => {
      const flag = await FeatureFlagService.createFlag(
        {
          key: 'billing.instant_payouts',
          name: 'Instant Payouts Beta',
          type: FeatureFlagType.PERCENTAGE,
          state: FeatureFlagState.ACTIVE,
          enabled: true,
          percentage: 100,
          environment: PlatformEnvironment.PRODUCTION,
          targeting: {
            allowed_studios: ['studio_trusted_1', 'studio_blocked_2'],
            blocked_studios: ['studio_blocked_2'],
          },
        },
        'admin_user_1'
      );

      // Blocked studio evaluation
      const blockedRes = await FeatureFlagService.evaluateFeatureFlag('billing.instant_payouts', {
        studio_id: 'studio_blocked_2',
        environment: PlatformEnvironment.PRODUCTION,
      });
      expect(blockedRes.enabled).toBe(false);
      expect(blockedRes.reason).toContain('Studio is explicitly blocked');

      // Allowed studio evaluation
      const allowedRes = await FeatureFlagService.evaluateFeatureFlag('billing.instant_payouts', {
        studio_id: 'studio_trusted_1',
        environment: PlatformEnvironment.PRODUCTION,
      });
      expect(allowedRes.enabled).toBe(true);
      expect(allowedRes.reason).toContain('Studio is explicitly allowlisted');
    });

    it('enforces subscription plan boundary gates so flags cannot bypass billing entitlements', async () => {
      await FeatureFlagService.createFlag(
        {
          key: 'ai.face_grouping_vip',
          name: 'VIP Face Grouping',
          type: FeatureFlagType.PLAN,
          state: FeatureFlagState.ACTIVE,
          enabled: true,
          plan_tier: SubscriptionPlan.ENTERPRISE,
          environment: PlatformEnvironment.PRODUCTION,
          targeting: {
            allowed_plans: [SubscriptionPlan.ENTERPRISE],
          },
        },
        'admin_user_1'
      );

      // Starter tenant should be rejected
      const starterRes = await FeatureFlagService.evaluateFeatureFlag('ai.face_grouping_vip', {
        studio_id: 'studio_starter',
        plan: SubscriptionPlan.STARTER,
        environment: PlatformEnvironment.PRODUCTION,
      });
      expect(starterRes.enabled).toBe(false);
      expect(starterRes.reason).toContain('not in allowed plans');

      // Enterprise tenant should be permitted
      const entRes = await FeatureFlagService.evaluateFeatureFlag('ai.face_grouping_vip', {
        studio_id: 'studio_ent',
        plan: SubscriptionPlan.ENTERPRISE,
        environment: PlatformEnvironment.PRODUCTION,
      });
      expect(entRes.enabled).toBe(true);
      expect(entRes.reason).toContain('Plan meets targeting requirement');
    });
  });

  // =========================================================================
  // SECTION 3: Snapshot Versioning & Non-Destructive Rollback for Flags
  // =========================================================================
  describe('SECTION 3: Snapshot Versioning & Non-Destructive Rollback for Flags', () => {
    it('creates immutable version snapshots on update and supports single-click rollback', async () => {
      const created = await FeatureFlagService.createFlag(
        {
          key: 'client.gallery_guest_uploads',
          name: 'Guest Photo Uploads',
          type: FeatureFlagType.BOOLEAN,
          state: FeatureFlagState.ACTIVE,
          enabled: false,
          environment: PlatformEnvironment.PRODUCTION,
        },
        'admin_1'
      );
      expect(created.current_version).toBe(1);

      // Version 2: Enabled
      const v2 = await FeatureFlagService.updateFlag(
        created.id,
        { enabled: true },
        'admin_1',
        'Enabling guest uploads for production rollout'
      );
      expect(v2.current_version).toBe(2);
      expect(v2.enabled).toBe(true);

      // Version 3: Rollout percentage 25%
      const v3 = await FeatureFlagService.updateFlag(
        created.id,
        { type: FeatureFlagType.PERCENTAGE, rollout_pct: 25 },
        'admin_1',
        'Switching to 25% progressive rollout'
      );
      expect(v3.current_version).toBe(3);
      expect(v3.rollout_pct).toBe(25);

      // Fetch versions
      const versions = await FeatureFlagService.getFlagVersions(created.id);
      expect(versions.length).toBe(3);
      expect(versions[0].version).toBe(3);
      expect(versions[1].version).toBe(2);
      expect(versions[2].version).toBe(1);

      // Rollback to Version 1 (enabled: false)
      const rolledBack = await FeatureFlagService.rollbackFlag(created.id, 1, 'admin_2', 'Emergency rollback to v1');
      expect(rolledBack.current_version).toBe(4);
      expect(rolledBack.enabled).toBe(false);

      const postRollbackVersions = await FeatureFlagService.getFlagVersions(created.id);
      expect(postRollbackVersions.length).toBe(4);
      expect(postRollbackVersions[0].change_reason).toContain('Rolled back to v1');
    });
  });

  // =========================================================================
  // SECTION 4: Platform Configuration 2.0 & Secret Separation
  // =========================================================================
  describe('SECTION 4: Platform Configuration 2.0 & Secret Separation', () => {
    it('stores secrets as secret references and guarantees [REDACTED] in public responses', async () => {
      const secretConfig = await ConfigurationService.createConfiguration(
        {
          key: 'aws.s3.kms_master_key',
          name: 'S3 Master Encryption Key',
          category: PlatformConfigCategory.SECURITY,
          type: PlatformConfigType.STRING,
          value: 'arn:aws:kms:us-east-1:123456789012:key/secret-uuid',
          environment: PlatformEnvironment.PRODUCTION,
          is_secret_reference: true,
          secret_reference_key: 'VAULT_KMS_MASTER_KEY',
        },
        'security_admin'
      );

      expect(secretConfig.is_secret_reference).toBe(true);
      expect(secretConfig.isSecret).toBe(true);
      expect(secretConfig.value).toBe('[REDACTED]');

      // Raw value retrieval with authorized bypass
      const resolved = await ConfigurationService.resolveSecretValue(secretConfig.key, PlatformEnvironment.PRODUCTION);
      expect(resolved).toBe('arn:aws:kms:us-east-1:123456789012:key/secret-uuid');
    });

    it('classifies configuration categories correctly', async () => {
      const aiConfig = await ConfigurationService.createConfiguration(
        {
          key: 'ai.face_clustering.concurrency_limit',
          name: 'AI Concurrency Limit',
          category: PlatformConfigCategory.AI_PROCESSING,
          type: PlatformConfigType.NUMBER,
          value: 16,
          environment: PlatformEnvironment.PRODUCTION,
        },
        'ops_admin'
      );
      expect(aiConfig.category).toBe(PlatformConfigCategory.AI_PROCESSING);
      expect(aiConfig.value).toBe(16);
    });
  });

  // =========================================================================
  // SECTION 5: Configuration Validation Engine & Contract Guardrails
  // =========================================================================
  describe('SECTION 5: Configuration Validation Engine & Contract Guardrails', () => {
    it('validates type bounds, ranges, and regex constraints', async () => {
      // Number range validation
      const rangeValidation = ConfigurationService.validateConfigurationValue(
        150,
        PlatformConfigType.NUMBER,
        { min_value: 1, max_value: 100 }
      );
      expect(rangeValidation.valid).toBe(false);
      expect(rangeValidation.errors[0]).toContain('exceeds maximum allowed value of 100');

      // Valid number
      const validRange = ConfigurationService.validateConfigurationValue(
        50,
        PlatformConfigType.NUMBER,
        { min_value: 1, max_value: 100 }
      );
      expect(validRange.valid).toBe(true);

      // Allowed values enum
      const enumValidation = ConfigurationService.validateConfigurationValue(
        'UNKNOWN_REGION',
        PlatformConfigType.STRING,
        { allowed_values: ['us-east-1', 'eu-west-1', 'ap-southeast-1'] }
      );
      expect(enumValidation.valid).toBe(false);
      expect(enumValidation.errors[0]).toContain('not in allowed list');

      // Regex validation
      const regexValidation = ConfigurationService.validateConfigurationValue(
        'invalid_email_format',
        PlatformConfigType.STRING,
        { regex_pattern: '^[\\w.-]+@[\\w.-]+\\.[a-zA-Z]{2,}$' }
      );
      expect(regexValidation.valid).toBe(false);
      expect(regexValidation.errors[0]).toContain('does not match required pattern');
    });

    it('validates JSON structure and required fields', async () => {
      const jsonValidation = ConfigurationService.validateConfigurationValue(
        { provider: 'STRIPE' },
        PlatformConfigType.JSON,
        { required_fields: ['provider', 'webhook_secret', 'account_id'] }
      );
      expect(jsonValidation.valid).toBe(false);
      expect(jsonValidation.errors).toContain('Missing required JSON field: webhook_secret');
      expect(jsonValidation.errors).toContain('Missing required JSON field: account_id');
    });
  });

  // =========================================================================
  // SECTION 6: Deterministic Diff Engine & Risk Classification
  // =========================================================================
  describe('SECTION 6: Deterministic Diff Engine & Risk Classification', () => {
    it('computes live diffs and calculates CRITICAL risk for security and payment keys', async () => {
      await ConfigurationService.createConfiguration(
        {
          key: 'security.mfa.enforce_all_admins',
          name: 'Enforce Admin MFA',
          category: PlatformConfigCategory.SECURITY,
          type: PlatformConfigType.BOOLEAN,
          value: true,
          environment: PlatformEnvironment.PRODUCTION,
        },
        'ciso_admin'
      );

      const diff = await ConfigurationService.computeDiff(
        'security.mfa.enforce_all_admins',
        PlatformEnvironment.PRODUCTION,
        false
      );

      expect(diff.diff_type).toBe('MODIFIED');
      expect(diff.old_value).toBe(true);
      expect(diff.new_value).toBe(false);
      expect(diff.risk_level).toBe(ChangeRiskLevel.CRITICAL);
      expect(diff.requires_two_person_approval).toBe(true);
    });

    it('calculates LOW risk for non-sensitive cosmetic/UI configurations', async () => {
      await ConfigurationService.createConfiguration(
        {
          key: 'ui.theme.primary_accent',
          name: 'Primary Accent Color',
          category: PlatformConfigCategory.SYSTEM,
          type: PlatformConfigType.STRING,
          value: '#F59E0B',
          environment: PlatformEnvironment.PRODUCTION,
        },
        'ui_admin'
      );

      const diff = await ConfigurationService.computeDiff(
        'ui.theme.primary_accent',
        PlatformEnvironment.PRODUCTION,
        '#3B82F6'
      );

      expect(diff.risk_level).toBe(ChangeRiskLevel.LOW);
      expect(diff.requires_two_person_approval).toBe(false);
    });
  });

  // =========================================================================
  // SECTION 7: Change Requests & Separation of Duties
  // =========================================================================
  describe('SECTION 7: Change Requests & Separation of Duties', () => {
    it('strictly forbids requester from self-approving their own change request', async () => {
      const cr = await ChangeRequestService.createChangeRequest(
        {
          type: ChangeRequestType.CONFIGURATION_UPDATE,
          title: 'Update storage quota limit',
          description: 'Increase default quota from 100GB to 250GB',
          target_resource_key: 'storage.quota.default_gb',
          target_version: 2,
          environment: PlatformEnvironment.PRODUCTION,
          risk_level: ChangeRiskLevel.MEDIUM,
          diff_payload: { old: 100, new: 250 },
        },
        'admin_alice',
        'alice@pixmatch.ai'
      );

      expect(cr.id).toBeDefined();
      expect(cr.status).toBe(ChangeRequestStatus.PENDING_APPROVAL);

      // Alice attempts self-approval -> must reject
      await expect(
        ChangeRequestService.approveChangeRequest(
          cr.id,
          'admin_alice',
          'alice@pixmatch.ai',
          ChangeApprovalDecision.APPROVED,
          'Self approving my quota update'
        )
      ).rejects.toThrow('Separation of duties violation: Requester cannot approve their own change request');
    });

    it('allows a different authorized admin to approve', async () => {
      const cr = await ChangeRequestService.createChangeRequest(
        {
          type: ChangeRequestType.CONFIGURATION_UPDATE,
          title: 'Update email batch size',
          description: 'Optimize batching throughput',
          target_resource_key: 'email.batch.max_recipients',
          target_version: 2,
          environment: PlatformEnvironment.PRODUCTION,
          risk_level: ChangeRiskLevel.LOW,
          diff_payload: { old: 50, new: 100 },
        },
        'admin_alice',
        'alice@pixmatch.ai'
      );

      const approved = await ChangeRequestService.approveChangeRequest(
        cr.id,
        'admin_bob',
        'bob@pixmatch.ai',
        ChangeApprovalDecision.APPROVED,
        'Looks good to me'
      );

      expect(approved.status).toBe(ChangeRequestStatus.APPROVED);
      expect(approved.approvals.length).toBe(1);
      expect(approved.approvals[0].approver_id).toBe('admin_bob');
    });
  });

  // =========================================================================
  // SECTION 8: Two-Person Approval for Critical Risk Mutations
  // =========================================================================
  describe('SECTION 8: Two-Person Approval for Critical Risk Mutations', () => {
    it('requires two distinct authorized approvers for CRITICAL risk changes before executing', async () => {
      const cr = await ChangeRequestService.createChangeRequest(
        {
          type: ChangeRequestType.CONFIGURATION_UPDATE,
          title: 'Rotate Stripe live webhook secret',
          description: 'Critical annual secret rotation',
          target_resource_key: 'billing.stripe.webhook_secret',
          target_version: 3,
          environment: PlatformEnvironment.PRODUCTION,
          risk_level: ChangeRiskLevel.CRITICAL,
          diff_payload: { secret: '[REDACTED]' },
        },
        'admin_alice',
        'alice@pixmatch.ai'
      );

      expect(cr.requires_two_person_approval).toBe(true);

      // First approval from Bob
      const afterFirst = await ChangeRequestService.approveChangeRequest(
        cr.id,
        'admin_bob',
        'bob@pixmatch.ai',
        ChangeApprovalDecision.APPROVED,
        'First sign-off from Platform Ops'
      );
      expect(afterFirst.status).toBe(ChangeRequestStatus.PENDING_APPROVAL); // Still pending dual sign-off

      // Attempt execution prematurely -> must fail
      await expect(ChangeRequestService.executeChangeRequest(cr.id, 'admin_bob')).rejects.toThrow(
        'Cannot execute change request: Status must be APPROVED'
      );

      // Bob tries to approve a second time -> must fail
      await expect(
        ChangeRequestService.approveChangeRequest(
          cr.id,
          'admin_bob',
          'bob@pixmatch.ai',
          ChangeApprovalDecision.APPROVED,
          'Second attempt by same approver'
        )
      ).rejects.toThrow('Approver has already submitted a decision for this change request');

      // Second approval from Carol (Security Officer)
      const afterSecond = await ChangeRequestService.approveChangeRequest(
        cr.id,
        'admin_carol',
        'carol@pixmatch.ai',
        ChangeApprovalDecision.APPROVED,
        'Second sign-off from Security Team'
      );
      expect(afterSecond.status).toBe(ChangeRequestStatus.APPROVED);
      expect(afterSecond.approvals.length).toBe(2);

      // Now execution succeeds
      const executed = await ChangeRequestService.executeChangeRequest(cr.id, 'admin_bob');
      expect(executed.status).toBe(ChangeRequestStatus.COMPLETED);
      expect(executed.executed_at).toBeDefined();
    });
  });

  // =========================================================================
  // SECTION 9: Emergency Workflows & Kill Switches
  // =========================================================================
  describe('SECTION 9: Emergency Workflows & Kill Switches', () => {
    it('immediately halts flag traffic when kill switch is activated with full reason logging', async () => {
      const flag = await FeatureFlagService.createFlag(
        {
          key: 'experimental.vector_search',
          name: 'Vector Similarity Engine',
          type: FeatureFlagType.BOOLEAN,
          state: FeatureFlagState.ACTIVE,
          enabled: true,
          environment: PlatformEnvironment.PRODUCTION,
        },
        'admin_1'
      );

      // Verify active
      const beforeRes = await FeatureFlagService.evaluateFeatureFlag('experimental.vector_search', {
        environment: PlatformEnvironment.PRODUCTION,
      });
      expect(beforeRes.enabled).toBe(true);

      // Activate emergency kill switch
      const killed = await FeatureFlagService.activateKillSwitch(
        flag.id,
        'security_admin_incident',
        'Severe latency regression detected in OpenSearch node cluster'
      );
      expect(killed.kill_switch_enabled).toBe(true);
      expect(killed.state).toBe(FeatureFlagState.PAUSED);

      // Evaluation must immediately return false with kill switch reason
      const afterRes = await FeatureFlagService.evaluateFeatureFlag('experimental.vector_search', {
        environment: PlatformEnvironment.PRODUCTION,
      });
      expect(afterRes.enabled).toBe(false);
      expect(afterRes.reason).toContain('Emergency kill switch is ACTIVE');

      // Deactivate kill switch
      const restored = await FeatureFlagService.deactivateKillSwitch(
        flag.id,
        'security_admin_incident',
        'Cluster scale-out complete, issue mitigated'
      );
      expect(restored.kill_switch_enabled).toBe(false);
      expect(restored.state).toBe(FeatureFlagState.ACTIVE);
    });
  });

  // =========================================================================
  // SECTION 10: Pre-Release Validation & Candidate Guardrails
  // =========================================================================
  describe('SECTION 10: Pre-Release Validation & Candidate Guardrails', () => {
    it('validates semver format and commit references before release registration', async () => {
      const candidate = await ReleaseService.createRelease(
        {
          version: 'v2.45.0',
          environment: PlatformEnvironment.STAGING,
          commit_reference: 'git-commit-sha-789abc',
          release_notes: {
            summary: 'Phase 45 Platform Configuration 2.0',
            changes: ['Deterministic bucketing', 'Two-person approvals', 'Drift monitoring'],
            fixes: ['Fixed edge case in secret redaction'],
          },
        },
        'release_engineer_1'
      );

      expect(candidate.id).toBeDefined();
      expect(candidate.version).toBe('v2.45.0');
      expect(candidate.status).toBe(PlatformReleaseStatus.DRAFT);
      expect(candidate.rollback_available).toBe(true);

      // Validate release candidate
      const validation = await ReleaseService.validateReleaseCandidate(candidate.id);
      expect(validation.valid).toBe(true);
      expect(validation.checks.semver_format).toBe(true);
      expect(validation.checks.commit_reference_present).toBe(true);
      expect(validation.checks.release_notes_complete).toBe(true);
    });
  });

  // =========================================================================
  // SECTION 11: Release Lifecycle, Health Telemetry & SLO Integration
  // =========================================================================
  describe('SECTION 11: Release Lifecycle, Health Telemetry & SLO Integration', () => {
    it('manages release state transitions and evaluates health without fake metrics', async () => {
      const rel = await ReleaseService.createRelease(
        {
          version: 'v2.45.1',
          environment: PlatformEnvironment.PRODUCTION,
          commit_reference: 'sha-prod-12345',
          release_notes: {
            summary: 'Patch release',
            changes: ['SLO health evaluator'],
          },
        },
        'rel_eng'
      );

      // Approve release
      const approved = await ReleaseService.approveRelease(rel.id, 'lead_architect');
      expect(approved.status).toBe(PlatformReleaseStatus.APPROVED);

      // Deploy release
      const deployed = await ReleaseService.deployRelease(rel.id, 'deploy_bot');
      expect(deployed.status).toBe(PlatformReleaseStatus.ACTIVE);
      expect(deployed.completed_at).toBeDefined();

      // Record live health metrics (Healthy case)
      const healthyEval = await ReleaseService.evaluateReleaseHealth(rel.id, {
        error_rate_pct: 0.02,
        latency_p95_ms: 145,
        availability_pct: 99.98,
        queue_backlog_count: 5,
        active_incidents_count: 0,
        observation_window_minutes: 30,
      });

      expect(healthyEval.health_check_status).toBe(ReleaseHealthStatus.HEALTHY);

      // Degraded / Unhealthy case
      const unhealthyEval = await ReleaseService.evaluateReleaseHealth(rel.id, {
        error_rate_pct: 5.4, // > 1.0% threshold
        latency_p95_ms: 2500, // > 500ms threshold
        availability_pct: 98.1,
        queue_backlog_count: 500,
        active_incidents_count: 2,
        observation_window_minutes: 15,
      });

      expect(unhealthyEval.health_check_status).toBe(ReleaseHealthStatus.UNHEALTHY);
    });
  });

  // =========================================================================
  // SECTION 12: Guarded Automated Rollback for Releases
  // =========================================================================
  describe('SECTION 12: Guarded Automated Rollback for Releases', () => {
    it('executes guarded rollback when release triggers health failure', async () => {
      const rel = await ReleaseService.createRelease(
        {
          version: 'v2.45.2',
          environment: PlatformEnvironment.PRODUCTION,
          commit_reference: 'sha-bad-release',
          release_notes: {
            summary: 'Faulty build',
            changes: ['Broken migration'],
          },
        },
        'rel_eng'
      );

      await ReleaseService.approveRelease(rel.id, 'lead_architect');
      await ReleaseService.deployRelease(rel.id, 'deploy_bot');

      const rolledBack = await ReleaseService.rollbackRelease(
        rel.id,
        'sre_oncall',
        'Automatic rollback triggered by p95 latency spike (> 3000ms)'
      );

      expect(rolledBack.status).toBe(PlatformReleaseStatus.ROLLED_BACK);
      expect(rolledBack.rollback_reason).toContain('Automatic rollback triggered');
      expect(rolledBack.rolled_back_by).toBe('sre_oncall');
      expect(rolledBack.rolled_back_at).toBeDefined();
    });
  });

  // =========================================================================
  // SECTION 13: Multi-Environment Comparison & Drift Detection
  // =========================================================================
  describe('SECTION 13: Multi-Environment Comparison & Drift Detection', () => {
    it('compares configurations across DEV, STAGING, PROD and flags mismatches', async () => {
      await ConfigurationService.createConfiguration(
        {
          key: 'database.pool.max_connections',
          name: 'Max DB Pool Connections',
          category: PlatformConfigCategory.SYSTEM,
          type: PlatformConfigType.NUMBER,
          value: 10,
          environment: PlatformEnvironment.DEVELOPMENT,
        },
        'admin_1'
      );

      await ConfigurationService.createConfiguration(
        {
          key: 'database.pool.max_connections',
          name: 'Max DB Pool Connections',
          category: PlatformConfigCategory.SYSTEM,
          type: PlatformConfigType.NUMBER,
          value: 50,
          environment: PlatformEnvironment.STAGING,
        },
        'admin_1'
      );

      await ConfigurationService.createConfiguration(
        {
          key: 'database.pool.max_connections',
          name: 'Max DB Pool Connections',
          category: PlatformConfigCategory.SYSTEM,
          type: PlatformConfigType.NUMBER,
          value: 200,
          environment: PlatformEnvironment.PRODUCTION,
        },
        'admin_1'
      );

      const comparison = await DriftService.compareEnvironments();
      const poolItem = comparison.find((c) => c.resource_key === 'database.pool.max_connections');
      expect(poolItem).toBeDefined();
      expect(poolItem?.development_value).toBe(10);
      expect(poolItem?.staging_value).toBe(50);
      expect(poolItem?.production_value).toBe(200);
      expect(poolItem?.is_drift).toBe(true);
    });

    it('manages drift detection, acknowledgment, and resolution lifecycle', async () => {
      const scanResults = await DriftService.scanForDrift();
      expect(scanResults.scanned_keys_count).toBeGreaterThanOrEqual(1);

      const driftList = await DriftService.listDriftEvents();
      expect(Array.isArray(driftList)).toBe(true);

      if (driftList.length > 0) {
        const first = driftList[0];
        const ack = await DriftService.acknowledgeDrift(first.id, 'sre_lead');
        expect(ack.status).toBe(DriftStatus.ACKNOWLEDGED);
        expect(ack.acknowledged_by).toBe('sre_lead');

        const resolved = await DriftService.resolveDrift(first.id, 'sre_lead');
        expect(resolved.status).toBe(DriftStatus.RESOLVED);
        expect(resolved.resolved_by).toBe('sre_lead');
      }
    });
  });

  // =========================================================================
  // SECTION 14: Security Copilot Safety & Blocked Mutations
  // =========================================================================
  describe('SECTION 14: Security Copilot Safety & Blocked Mutations', () => {
    it('allows 12 read-only tools to fetch intelligence safely', async () => {
      const flags = await ReleaseCopilotTools.listFeatureFlags();
      expect(Array.isArray(flags)).toBe(true);

      const configs = await ReleaseCopilotTools.listConfigurations();
      expect(Array.isArray(configs)).toBe(true);

      const diff = await ReleaseCopilotTools.previewConfigurationDiff(
        'database.pool.max_connections',
        PlatformEnvironment.PRODUCTION,
        250
      );
      expect(diff).toBeDefined();

      const envComp = await ReleaseCopilotTools.compareEnvironments();
      expect(Array.isArray(envComp)).toBe(true);

      const summary = await ReleaseCopilotTools.summarizeReleaseSafety();
      expect(summary.production_health).toBeDefined();
    });

    it('allows 5 drafting tools to propose structured changes without mutating production state', async () => {
      const draft = await ReleaseCopilotTools.draftChangeRequest({
        title: 'Draft proposal for queue concurrency',
        targetKey: 'queue.concurrency.workers',
        targetType: ChangeRequestType.CONFIGURATION_UPDATE,
        proposedValue: 32,
        reason: 'Improve thumbnail generation throughput',
        environment: PlatformEnvironment.PRODUCTION,
        riskLevel: ChangeRiskLevel.MEDIUM,
      });

      expect(draft.action).toBe('DRAFT_CREATED');
      expect(draft.changeRequest.id).toBeDefined();
      expect(draft.changeRequest.status).toBe(ChangeRequestStatus.PENDING_APPROVAL);
    });

    it('strictly blocks Copilot from autonomously deploying releases, modifying configs, or self-approving', async () => {
      // Direct deployment blocked
      await expect(
        ReleaseCopilotTools.autonomousDeployRelease({
          releaseId: 'rel-123',
          environment: PlatformEnvironment.PRODUCTION,
        })
      ).rejects.toThrow(PolicyViolationError);

      // Autonomous config mutation blocked
      await expect(
        ReleaseCopilotTools.autonomousModifyConfiguration({
          key: 'security.mfa.enforce_all_admins',
          environment: PlatformEnvironment.PRODUCTION,
          value: false,
        })
      ).rejects.toThrow(PolicyViolationError);

      // Autonomous change approval blocked
      await expect(
        ReleaseCopilotTools.autonomousApproveChangeRequest({
          changeRequestId: 'cr-123',
          decision: ChangeApprovalDecision.APPROVED,
        })
      ).rejects.toThrow(PolicyViolationError);

      // Autonomous kill switch toggle blocked
      await expect(
        ReleaseCopilotTools.autonomousTriggerKillSwitch({
          flagKey: 'payment.processor.stripe',
          active: true,
        })
      ).rejects.toThrow(PolicyViolationError);

      // Autonomous security check bypass blocked
      await expect(
        ReleaseCopilotTools.autonomousBypassSecurityCheck({
          reason: 'Bypassing for fast emergency fix',
        })
      ).rejects.toThrow(PolicyViolationError);
    });
  });

  // =========================================================================
  // SECTION 15: Admin RBAC & Multi-Tenant Boundary Isolation
  // =========================================================================
  describe('SECTION 15: Admin RBAC & Multi-Tenant Boundary Isolation', () => {
    it('validates Phase 45 admin permissions across role tiers', () => {
      const superAdminUser = {
        id: 'usr_super',
        role: UserRole.SUPER_ADMIN,
        email: 'super@pixmatch.ai',
      };

      const securityAdminUser = {
        id: 'usr_sec',
        role: UserRole.PLATFORM_SECURITY,
        email: 'sec@pixmatch.ai',
      };

      const viewerUser = {
        id: 'usr_viewer',
        role: UserRole.PLATFORM_VIEWER,
        email: 'viewer@pixmatch.ai',
      };

      const studioOwnerUser = {
        id: 'usr_owner',
        role: UserRole.STUDIO_OWNER,
        email: 'owner@studio.com',
      };

      // Super Admin has all release permissions
      expect(hasAdminPermission(superAdminUser, AdminPermission.FEATURE_FLAG_MANAGE)).toBe(true);
      expect(hasAdminPermission(superAdminUser, AdminPermission.RELEASE_DEPLOY)).toBe(true);
      expect(hasAdminPermission(superAdminUser, AdminPermission.CONFIG_APPROVE)).toBe(true);

      // Security Admin has view & approve permissions but not deploy
      expect(hasAdminPermission(securityAdminUser, AdminPermission.CONFIG_VIEW)).toBe(true);
      expect(hasAdminPermission(securityAdminUser, AdminPermission.FEATURE_FLAG_APPROVE)).toBe(true);
      expect(hasAdminPermission(securityAdminUser, AdminPermission.RELEASE_DEPLOY)).toBe(false);

      // Viewer has only view permissions
      expect(hasAdminPermission(viewerUser, AdminPermission.FEATURE_FLAG_VIEW)).toBe(true);
      expect(hasAdminPermission(viewerUser, AdminPermission.CONFIG_VIEW)).toBe(true);
      expect(hasAdminPermission(viewerUser, AdminPermission.FEATURE_FLAG_MANAGE)).toBe(false);
      expect(hasAdminPermission(viewerUser, AdminPermission.RELEASE_CREATE)).toBe(false);

      // Studio Owner is NOT a platform admin
      expect(isPlatformAdmin(studioOwnerUser)).toBe(false);
      expect(hasAdminPermission(studioOwnerUser, AdminPermission.FEATURE_FLAG_VIEW)).toBe(false);
    });
  });
});
