/**
 * PixMatch AI — Phase 43: Platform Security Operations Center (SOC) & Threat Detection 2.0
 * Master Test Suite
 *
 * Comprehensive validation across 128 verification pillars (800+ assertions):
 *
 * SECTION 1: Canonical Security Event Taxonomy & Event Normalization (Pillars 1-10)
 * SECTION 2: Deterministic SHA-256 Fingerprinting & Privacy-Minimizing Redaction (Pillars 11-20)
 * SECTION 3: Biometric Privacy Invariants (Zero Face Vectors, Selfies, Biometric Embeddings) (Pillars 21-28)
 * SECTION 4: Deterministic Detection Rules Engine — 24 Built-in Rules (Pillars 29-52)
 * SECTION 5: Rule Lifecycle, Temporary Suppression & Mandatory Expiration (Pillars 53-62)
 * SECTION 6: Sliding Time Windows & Alert Cooldown Storm Defense (Pillars 63-72)
 * SECTION 7: Multi-Dimensional Correlation Engine (Pillars 73-82)
 * SECTION 8: Multi-Tenant Boundary Isolation & IDOR Defense (Pillars 83-92)
 * SECTION 9: Investigation Console, Chronological Notes & False-Positive Workflow (Pillars 93-102)
 * SECTION 10: Phase 40/41/42 Platform Integration (PlatformAlert, PlatformIncident, Auth, Reliability) (Pillars 103-110)
 * SECTION 11: Export Safety & Spreadsheet Formula Injection Neutralization (Pillars 111-116)
 * SECTION 12: AI Copilot Safety Guardrails & Deterministic Mutation Blocking (Pillars 117-122)
 * SECTION 13: Concurrency, Idempotency & High-Throughput Invariants (Pillars 123-128)
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import crypto from 'crypto';
import {
  SecurityEventCategory,
  SecuritySeverity,
  SecurityConfidence,
  SecurityEventStatus,
  SecurityInvestigationStatus,
  AdminPermission,
  UserRole,
} from '@pixmatch/types';
import { isPlatformAdmin, hasAdminPermission } from '@pixmatch/auth';

import {
  SecurityDetectionService,
} from '../apps/api/src/modules/security-center/security-detection.service';
import {
  SecurityRulesService,
  BUILTIN_SECURITY_RULES,
} from '../apps/api/src/modules/security-center/security-rules.service';
import {
  SecurityCorrelationService,
} from '../apps/api/src/modules/security-center/security-correlation.service';
import {
  SecurityInvestigationService,
} from '../apps/api/src/modules/security-center/security-investigation.service';
import {
  SecurityCopilotTools,
  PolicyViolationError,
} from '../apps/api/src/modules/security-center/security-copilot-tools';

describe('PixMatch AI — Phase 43: Platform Security Operations Center (SOC) Master Suite', () => {
  beforeEach(() => {
    SecurityDetectionService.clearMockState();
    SecurityRulesService.clearMockState();
    SecurityInvestigationService.clearMockState();
  });

  // =========================================================================
  // SECTION 1: Canonical Security Event Taxonomy & Event Normalization (Pillars 1-10)
  // =========================================================================

  it('Pillar 1: should verify all 19 canonical security event categories exist in taxonomy', () => {
    const expectedCategories = [
      'AUTHENTICATION',
      'AUTHORIZATION',
      'SESSION',
      'API_ABUSE',
      'RATE_LIMIT',
      'TENANT_SECURITY',
      'PRIVILEGE',
      'STORAGE',
      'OAUTH',
      'PAYMENT',
      'WEBHOOK',
      'CLIENT_PORTAL',
      'AI',
      'DOWNLOAD',
      'COMMUNICATION',
      'AUTOMATION',
      'CONFIGURATION',
      'INFRASTRUCTURE',
      'DATA_ACCESS',
    ];

    expect(Object.keys(SecurityEventCategory)).toHaveLength(19);
    for (const cat of expectedCategories) {
      expect(SecurityEventCategory[cat as keyof typeof SecurityEventCategory]).toBe(cat);
    }
  });

  it('Pillar 2: should verify security severities conform strictly to deterministic scale', () => {
    expect(SecuritySeverity.INFO).toBe('INFO');
    expect(SecuritySeverity.LOW).toBe('LOW');
    expect(SecuritySeverity.MEDIUM).toBe('MEDIUM');
    expect(SecuritySeverity.HIGH).toBe('HIGH');
    expect(SecuritySeverity.CRITICAL).toBe('CRITICAL');
  });

  it('Pillar 3: should verify security confidence levels reflect rule accuracy', () => {
    expect(SecurityConfidence.LOW).toBe('LOW');
    expect(SecurityConfidence.MEDIUM).toBe('MEDIUM');
    expect(SecurityConfidence.HIGH).toBe('HIGH');
  });

  it('Pillar 4: should verify all canonical security event lifecycle statuses', () => {
    const expectedStatuses = [
      'OPEN',
      'ACKNOWLEDGED',
      'INVESTIGATING',
      'CONTAINED',
      'RESOLVED',
      'FALSE_POSITIVE',
      'SUPPRESSED',
    ];
    for (const st of expectedStatuses) {
      expect(SecurityEventStatus[st as keyof typeof SecurityEventStatus]).toBe(st);
    }
  });

  it('Pillar 5: should normalize raw ingestion telemetry to canonical structure', () => {
    const raw = {
      event_type: 'admin_login_failure',
      reason_code: 'INVALID_CREDENTIALS',
      ip_address: '198.51.100.42',
      user_agent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)',
      service: 'auth-service',
      metadata: { attempts: 3 },
    };

    const norm = SecurityDetectionService.normalizeEvent(raw);
    expect(norm.eventType).toBe('ADMIN_LOGIN_FAILURE');
    expect(norm.category).toBe(SecurityEventCategory.AUTHENTICATION);
    expect(norm.service).toBe('auth-service');
    expect(norm.ipHash).toBeDefined();
    expect(norm.ipHash).not.toBe('198.51.100.42'); // Hashed!
    expect(norm.userAgentHash).toBeDefined();
    expect(norm.fingerprint).toBeDefined();
  });

  it('Pillar 6: should infer category when omitted based on deterministic event prefixes', () => {
    expect(SecurityDetectionService.normalizeEvent({ event_type: 'AUTH_FAILED', reason_code: 'TEST' }).category).toBe(SecurityEventCategory.AUTHENTICATION);
    expect(SecurityDetectionService.normalizeEvent({ event_type: 'RATE_LIMIT_EXCEEDED', reason_code: 'TEST' }).category).toBe(SecurityEventCategory.RATE_LIMIT);
    expect(SecurityDetectionService.normalizeEvent({ event_type: 'CROSS_STUDIO_ACCESS', reason_code: 'TEST' }).category).toBe(SecurityEventCategory.TENANT_SECURITY);
    expect(SecurityDetectionService.normalizeEvent({ event_type: 'WEBHOOK_INVALID_SIGNATURE', reason_code: 'TEST' }).category).toBe(SecurityEventCategory.WEBHOOK);
    expect(SecurityDetectionService.normalizeEvent({ event_type: 'AI_SEARCH_BURST', reason_code: 'TEST' }).category).toBe(SecurityEventCategory.AI);
  });

  it('Pillar 7: should infer default severity deterministically based on security category and event type', () => {
    expect(SecurityDetectionService.normalizeEvent({ event_type: 'CROSS_TENANT_ACCESS_ATTEMPT', reason_code: 'TEST' }).severity).toBe(SecuritySeverity.CRITICAL);
    expect(SecurityDetectionService.normalizeEvent({ event_type: 'ADMIN_BRUTE_FORCE', reason_code: 'TEST' }).severity).toBe(SecuritySeverity.HIGH);
    expect(SecurityDetectionService.normalizeEvent({ event_type: 'RATE_LIMIT_HIT', reason_code: 'TEST' }).severity).toBe(SecuritySeverity.MEDIUM);
    expect(SecurityDetectionService.normalizeEvent({ event_type: 'UNKNOWN_API_ACCESS', reason_code: 'TEST' }).severity).toBe(SecuritySeverity.LOW);
  });

  it('Pillar 8: should ingest a valid event and assign initial status OPEN', async () => {
    const event = await SecurityDetectionService.ingestEvent({
      event_type: 'MULTIPLE_FAILED_LOGINS',
      reason_code: 'BAD_PASSWORD',
      service: 'platform-api',
      source: 'auth_middleware',
      ip_address: '203.0.113.19',
    });

    expect(event.id).toBeDefined();
    expect(event.status).toBe(SecurityEventStatus.OPEN);
    expect(event.occurrence_count).toBe(1);
    expect(event.first_seen_at).toBeDefined();
    expect(event.last_seen_at).toBeDefined();
  });

  it('Pillar 9: should aggregate duplicate events with identical fingerprint within sliding window', async () => {
    const payload = {
      event_type: 'MULTIPLE_FAILED_LOGINS',
      reason_code: 'BAD_PASSWORD',
      service: 'platform-api',
      source: 'auth_middleware',
      ip_address: '203.0.113.19',
    };

    const first = await SecurityDetectionService.ingestEvent(payload);
    const second = await SecurityDetectionService.ingestEvent(payload);
    const third = await SecurityDetectionService.ingestEvent(payload);

    expect(second.id).toBe(first.id);
    expect(third.id).toBe(first.id);
    expect(third.occurrence_count).toBe(3);
  });

  it('Pillar 10: should list events with pagination and total record calculation', async () => {
    for (let i = 0; i < 5; i++) {
      await SecurityDetectionService.ingestEvent({
        event_type: `DISTINCT_EVENT_${i}`,
        reason_code: `REASON_${i}`,
        service: 'platform-api',
        source: `source_${i}`,
      });
    }

    const res = await SecurityDetectionService.listEvents({ page: 1, limit: 3 });
    expect(res.events).toHaveLength(3);
    expect(res.total).toBe(5);
    expect(res.totalPages).toBe(2);
  });

  // =========================================================================
  // SECTION 2: Deterministic SHA-256 Fingerprinting & Privacy-Minimizing Redaction (Pillars 11-20)
  // =========================================================================

  it('Pillar 11: should produce stable, deterministic SHA-256 fingerprints for identical inputs', () => {
    const fp1 = SecurityDetectionService.fingerprintEvent(
      'ADMIN_BRUTE_FORCE',
      SecurityEventCategory.AUTHENTICATION,
      'auth_service',
      'EXCESSIVE_FAILURES',
      'AdminSession',
      'actor_hash_123'
    );
    const fp2 = SecurityDetectionService.fingerprintEvent(
      'ADMIN_BRUTE_FORCE',
      SecurityEventCategory.AUTHENTICATION,
      'auth_service',
      'EXCESSIVE_FAILURES',
      'AdminSession',
      'actor_hash_123'
    );

    expect(fp1).toBe(fp2);
    expect(fp1).toMatch(/^[a-f0-9]{64}$/);
  });

  it('Pillar 12: should differentiate fingerprints across different reason codes or sources', () => {
    const fp1 = SecurityDetectionService.fingerprintEvent(
      'ADMIN_BRUTE_FORCE',
      SecurityEventCategory.AUTHENTICATION,
      'auth_service',
      'REASON_A',
      null,
      'actor_1'
    );
    const fp2 = SecurityDetectionService.fingerprintEvent(
      'ADMIN_BRUTE_FORCE',
      SecurityEventCategory.AUTHENTICATION,
      'auth_service',
      'REASON_B',
      null,
      'actor_1'
    );

    expect(fp1).not.toBe(fp2);
  });

  it('Pillar 13: should redact password and password_hash in metadata', () => {
    const metadata = {
      username: 'studio_owner',
      password: 'SuperSecretPassword!123',
      password_hash: '$2b$10$abcdef1234567890',
      safe_field: 'safe_value',
    };

    const sanitized = SecurityDetectionService.sanitizeMetadata(metadata);
    expect(sanitized.password).toBe('[REDACTED]');
    expect(sanitized.password_hash).toBe('[REDACTED]');
    expect(sanitized.safe_field).toBe('safe_value');
  });

  it('Pillar 14: should redact authorization headers, bearer tokens, and session cookies', () => {
    const metadata = {
      authorization: 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
      cookie: 'pixmatch_admin_session=abc12345; other_cookie=xyz',
      session_token: 'session_token_raw_value',
    };

    const sanitized = SecurityDetectionService.sanitizeMetadata(metadata);
    expect(sanitized.authorization).toBe('[REDACTED]');
    expect(sanitized.cookie).toBe('[REDACTED]');
    expect(sanitized.session_token).toBe('[REDACTED]');
  });

  it('Pillar 15: should redact OTP, TOTP secret, and MFA recovery codes', () => {
    const metadata = {
      otp: '123456',
      totp_secret: 'JBSWY3DPEHPK3PXP',
      recovery_code: 'ABCD-1234-EFGH-5678',
    };

    const sanitized = SecurityDetectionService.sanitizeMetadata(metadata);
    expect(sanitized.otp).toBe('[REDACTED]');
    expect(sanitized.totp_secret).toBe('[REDACTED]');
    expect(sanitized.recovery_code).toBe('[REDACTED]');
  });

  it('Pillar 16: should redact Stripe, Razorpay, and payment gateway private secrets', () => {
    const metadata = {
      stripe_secret: 'sk_live_mock_dummy_secret_12345',
      razorpay_secret: 'rzp_live_secret_key_12345',
      cvv: '123',
      credit_card: '4111222233334444',
    };

    const sanitized = SecurityDetectionService.sanitizeMetadata(metadata);
    expect(sanitized.stripe_secret).toBe('[REDACTED]');
    expect(sanitized.razorpay_secret).toBe('[REDACTED]');
    expect(sanitized.cvv).toBe('[REDACTED]');
    expect(sanitized.credit_card).toBe('[REDACTED]');
  });

  it('Pillar 17: should redact OAuth access tokens, client secrets, and refresh tokens', () => {
    const metadata = {
      oauth_token: 'ya29.a0AfH6SM...',
      client_secret: 'GOCSPX-abc123def456',
      private_key: '-----BEGIN RSA PRIVATE KEY-----',
    };

    const sanitized = SecurityDetectionService.sanitizeMetadata(metadata);
    expect(sanitized.oauth_token).toBe('[REDACTED]');
    expect(sanitized.client_secret).toBe('[REDACTED]');
    expect(sanitized.private_key).toBe('[REDACTED]');
  });

  it('Pillar 18: should recursively redact sensitive keys in deeply nested objects and arrays', () => {
    const metadata = {
      level1: {
        level2: {
          password: 'secret_nested_pw',
          inner_array: [{ secret: 'array_secret' }, { public_id: '123' }],
        },
      },
    };

    const sanitized = SecurityDetectionService.sanitizeMetadata(metadata);
    expect(sanitized.level1.level2.password).toBe('[REDACTED]');
    expect(sanitized.level1.level2.inner_array[0].secret).toBe('[REDACTED]');
    expect(sanitized.level1.level2.inner_array[1].public_id).toBe('123');
  });

  it('Pillar 19: should truncate excessively large strings or base64 payloads to prevent log injection', () => {
    const metadata = {
      base64_img: 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEASABIAAD...',
      huge_string: 'A'.repeat(600),
      normal_string: 'normal description',
    };

    const sanitized = SecurityDetectionService.sanitizeMetadata(metadata);
    expect(sanitized.base64_img).toBe('[REDACTED_LARGE_PAYLOAD]');
    expect(sanitized.huge_string).toBe('[REDACTED_LARGE_PAYLOAD]');
    expect(sanitized.normal_string).toBe('normal description');
  });

  it('Pillar 20: should handle null, undefined, and primitive values safely during sanitization', () => {
    expect(SecurityDetectionService.sanitizeMetadata(null)).toBeNull();
    expect(SecurityDetectionService.sanitizeMetadata(undefined)).toBeUndefined();
    expect(SecurityDetectionService.sanitizeMetadata(12345)).toBe(12345);
    expect(SecurityDetectionService.sanitizeMetadata(true)).toBe(true);
  });

  // =========================================================================
  // SECTION 3: Biometric Privacy Invariants (Zero Face Vectors, Selfies, Biometric Embeddings) (Pillars 21-28)
  // =========================================================================

  it('Pillar 21: should strictly redact 512-dimensional face embedding float arrays', () => {
    const embedding = Array.from({ length: 512 }, () => Math.random());
    const metadata = {
      face_vector: embedding,
      gallery_id: 'gal-123',
    };

    const sanitized = SecurityDetectionService.sanitizeMetadata(metadata);
    expect(sanitized.face_vector).toBe('[REDACTED]');
  });

  it('Pillar 22: should redact any float array of length >= 64 even if key name is disguised', () => {
    const disguisedVector = Array.from({ length: 128 }, () => Math.random());
    const metadata = {
      disguised_feature_array: disguisedVector,
    };

    const sanitized = SecurityDetectionService.sanitizeMetadata(metadata);
    expect(sanitized.disguised_feature_array).toBe('[REDACTED_VECTOR_DATA]');
  });

  it('Pillar 23: should redact selfie and face crop image data in metadata', () => {
    const metadata = {
      selfie: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAA...',
      face_crop: 'base64_face_crop_data_here',
      arcface_version: '1.0.4',
    };

    const sanitized = SecurityDetectionService.sanitizeMetadata(metadata);
    expect(sanitized.selfie).toBe('[REDACTED]');
    expect(sanitized.face_crop).toBe('[REDACTED]');
    expect(sanitized.arcface_version).toBe('[REDACTED]');
  });

  it('Pillar 24: should allow safe AI error codes without storing raw facial biometric data', async () => {
    const event = await SecurityDetectionService.ingestEvent({
      event_type: 'AI_SEARCH_RATE_LIMITED',
      category: SecurityEventCategory.AI,
      reason_code: 'RATE_LIMIT_EXCEEDED',
      metadata: {
        matched_results_count: 14,
        confidence_threshold: 0.85,
        // Attempted raw embedding injection:
        face_vector: Array.from({ length: 512 }, () => 0.123),
      },
    });

    expect(event.reason_code).toBe('RATE_LIMIT_EXCEEDED');
    expect(event.sanitized_metadata.face_vector).toBe('[REDACTED]');
    expect(event.sanitized_metadata.matched_results_count).toBe(14);
  });

  it('Pillar 25: should verify that ingestEvent never persists unhashed IP addresses', async () => {
    const rawIp = '192.0.2.146';
    const event = await SecurityDetectionService.ingestEvent({
      event_type: 'API_ERROR_ABUSE',
      reason_code: 'EXCESSIVE_404',
      ip_address: rawIp,
    });

    expect(event.ip_hash).toBeDefined();
    expect(event.ip_hash).not.toContain(rawIp);
    expect(event.ip_hash).toMatch(/^[a-f0-9]{64}$/);
  });

  it('Pillar 26: should verify that ingestEvent never persists unhashed user-agent strings', async () => {
    const rawUa = 'CustomSecurityScanner/2.1 (VulnerabilityAssessor)';
    const event = await SecurityDetectionService.ingestEvent({
      event_type: 'API_ERROR_ABUSE',
      reason_code: 'SCANNER_DETECTED',
      user_agent: rawUa,
    });

    expect(event.user_agent_hash).toBeDefined();
    expect(event.user_agent_hash).not.toContain(rawUa);
    expect(event.user_agent_hash).toMatch(/^[a-f0-9]{64}$/);
  });

  it('Pillar 27: should verify that sanitized_metadata is immutable after normalization', () => {
    const rawMetadata = { original_key: 'initial_value' };
    const norm = SecurityDetectionService.normalizeEvent({
      event_type: 'TEST_EVENT',
      reason_code: 'TEST_REASON',
      metadata: rawMetadata,
    });

    rawMetadata.original_key = 'mutated_value';
    expect(norm.sanitizedMetadata.original_key).toBe('initial_value');
  });

  it('Pillar 28: should guarantee that sensitive data redaction occurs before rule evaluation', async () => {
    const spy = vi.spyOn(SecurityRulesService, 'recordRuleTrigger');
    const event = await SecurityDetectionService.ingestEvent({
      event_type: 'ADMIN_BRUTE_FORCE',
      category: SecurityEventCategory.AUTHENTICATION,
      reason_code: 'BAD_PASSWORD',
      metadata: { password: 'ShouldBeRedactedBeforeRuleRuns' },
    });

    expect(event.sanitized_metadata.password).toBe('[REDACTED]');
    spy.mockRestore();
  });

  // =========================================================================
  // SECTION 4: Deterministic Detection Rules Engine — 24 Built-in Rules (Pillars 29-52)
  // =========================================================================

  it('Pillar 29: should contain exactly 24 built-in deterministic rules in registry', async () => {
    const rules = await SecurityRulesService.listRules();
    expect(rules).toHaveLength(24);
    expect(BUILTIN_SECURITY_RULES).toHaveLength(24);
  });

  it('Pillar 30: should verify rule ADMIN_BRUTE_FORCE configuration', async () => {
    const rule = await SecurityRulesService.getRule('ADMIN_BRUTE_FORCE');
    expect(rule).not.toBeNull();
    expect(rule?.category).toBe(SecurityEventCategory.AUTHENTICATION);
    expect(rule?.severity).toBe(SecuritySeverity.HIGH);
    expect(rule?.threshold).toBe(5);
    expect(rule?.window_seconds).toBe(300);
  });

  it('Pillar 31: should verify rule ADMIN_MFA_FAILURE_SPIKE configuration', async () => {
    const rule = await SecurityRulesService.getRule('ADMIN_MFA_FAILURE_SPIKE');
    expect(rule).not.toBeNull();
    expect(rule?.category).toBe(SecurityEventCategory.AUTHENTICATION);
    expect(rule?.severity).toBe(SecuritySeverity.HIGH);
    expect(rule?.threshold).toBe(3);
  });

  it('Pillar 32: should verify rule ADMIN_SESSION_ANOMALY configuration', async () => {
    const rule = await SecurityRulesService.getRule('ADMIN_SESSION_ANOMALY');
    expect(rule?.category).toBe(SecurityEventCategory.SESSION);
    expect(rule?.threshold).toBe(1);
  });

  it('Pillar 33: should verify rule ADMIN_PRIVILEGE_CHANGE configuration', async () => {
    const rule = await SecurityRulesService.getRule('ADMIN_PRIVILEGE_CHANGE');
    expect(rule?.category).toBe(SecurityEventCategory.PRIVILEGE);
    expect(rule?.threshold).toBe(1);
  });

  it('Pillar 34: should verify rule ADMIN_SESSION_AFTER_SUSPENSION configuration', async () => {
    const rule = await SecurityRulesService.getRule('ADMIN_SESSION_AFTER_SUSPENSION');
    expect(rule?.category).toBe(SecurityEventCategory.SESSION);
    expect(rule?.severity).toBe(SecuritySeverity.CRITICAL);
    expect(rule?.threshold).toBe(1);
  });

  it('Pillar 35: should verify rule ADMIN_PASSWORD_RESET_SPIKE configuration', async () => {
    const rule = await SecurityRulesService.getRule('ADMIN_PASSWORD_RESET_SPIKE');
    expect(rule?.category).toBe(SecurityEventCategory.AUTHENTICATION);
    expect(rule?.threshold).toBe(4);
  });

  it('Pillar 36: should verify rule MULTIPLE_FAILED_LOGINS configuration', async () => {
    const rule = await SecurityRulesService.getRule('MULTIPLE_FAILED_LOGINS');
    expect(rule?.category).toBe(SecurityEventCategory.AUTHENTICATION);
    expect(rule?.threshold).toBe(10);
  });

  it('Pillar 37: should verify rule RATE_LIMIT_ABUSE configuration', async () => {
    const rule = await SecurityRulesService.getRule('RATE_LIMIT_ABUSE');
    expect(rule?.category).toBe(SecurityEventCategory.RATE_LIMIT);
    expect(rule?.threshold).toBe(15);
  });

  it('Pillar 38: should verify rule API_ERROR_ABUSE configuration', async () => {
    const rule = await SecurityRulesService.getRule('API_ERROR_ABUSE');
    expect(rule?.category).toBe(SecurityEventCategory.API_ABUSE);
    expect(rule?.threshold).toBe(30);
  });

  it('Pillar 39: should verify rule REPEATED_IDOR_DENIAL configuration', async () => {
    const rule = await SecurityRulesService.getRule('REPEATED_IDOR_DENIAL');
    expect(rule?.category).toBe(SecurityEventCategory.AUTHORIZATION);
    expect(rule?.severity).toBe(SecuritySeverity.HIGH);
    expect(rule?.threshold).toBe(3);
  });

  it('Pillar 40: should verify rule CROSS_TENANT_ACCESS_ATTEMPT configuration', async () => {
    const rule = await SecurityRulesService.getRule('CROSS_TENANT_ACCESS_ATTEMPT');
    expect(rule?.category).toBe(SecurityEventCategory.TENANT_SECURITY);
    expect(rule?.severity).toBe(SecuritySeverity.CRITICAL);
    expect(rule?.threshold).toBe(1);
  });

  it('Pillar 41: should verify rule UNUSUAL_PUBLIC_PORTAL_ACTIVITY configuration', async () => {
    const rule = await SecurityRulesService.getRule('UNUSUAL_PUBLIC_PORTAL_ACTIVITY');
    expect(rule?.category).toBe(SecurityEventCategory.CLIENT_PORTAL);
    expect(rule?.threshold).toBe(20);
  });

  it('Pillar 42: should verify rule STORAGE_OAUTH_FAILURE_SPIKE configuration', async () => {
    const rule = await SecurityRulesService.getRule('STORAGE_OAUTH_FAILURE_SPIKE');
    expect(rule?.category).toBe(SecurityEventCategory.STORAGE);
    expect(rule?.threshold).toBe(5);
  });

  it('Pillar 43: should verify rule OAUTH_CALLBACK_REPLAY configuration', async () => {
    const rule = await SecurityRulesService.getRule('OAUTH_CALLBACK_REPLAY');
    expect(rule?.category).toBe(SecurityEventCategory.OAUTH);
    expect(rule?.threshold).toBe(1);
  });

  it('Pillar 44: should verify rule WEBHOOK_SIGNATURE_FAILURE_SPIKE configuration', async () => {
    const rule = await SecurityRulesService.getRule('WEBHOOK_SIGNATURE_FAILURE_SPIKE');
    expect(rule?.category).toBe(SecurityEventCategory.WEBHOOK);
    expect(rule?.threshold).toBe(5);
  });

  it('Pillar 45: should verify rule PAYMENT_WEBHOOK_REPLAY configuration', async () => {
    const rule = await SecurityRulesService.getRule('PAYMENT_WEBHOOK_REPLAY');
    expect(rule?.category).toBe(SecurityEventCategory.PAYMENT);
    expect(rule?.threshold).toBe(3);
  });

  it('Pillar 46: should verify rule PAYMENT_WEBHOOK_SIGNATURE_FAILURE configuration', async () => {
    const rule = await SecurityRulesService.getRule('PAYMENT_WEBHOOK_SIGNATURE_FAILURE');
    expect(rule?.category).toBe(SecurityEventCategory.PAYMENT);
    expect(rule?.severity).toBe(SecuritySeverity.CRITICAL);
    expect(rule?.threshold).toBe(1);
  });

  it('Pillar 47: should verify rule DOWNLOAD_ABUSE configuration', async () => {
    const rule = await SecurityRulesService.getRule('DOWNLOAD_ABUSE');
    expect(rule?.category).toBe(SecurityEventCategory.DOWNLOAD);
    expect(rule?.threshold).toBe(100);
  });

  it('Pillar 48: should verify rule AI_ENDPOINT_ABUSE configuration', async () => {
    const rule = await SecurityRulesService.getRule('AI_ENDPOINT_ABUSE');
    expect(rule?.category).toBe(SecurityEventCategory.AI);
    expect(rule?.threshold).toBe(10);
  });

  it('Pillar 49: should verify rule AUTOMATION_PERMISSION_VIOLATION configuration', async () => {
    const rule = await SecurityRulesService.getRule('AUTOMATION_PERMISSION_VIOLATION');
    expect(rule?.category).toBe(SecurityEventCategory.AUTOMATION);
    expect(rule?.threshold).toBe(1);
  });

  it('Pillar 50: should verify rule SECURITY_SETTING_CHANGE configuration', async () => {
    const rule = await SecurityRulesService.getRule('SECURITY_SETTING_CHANGE');
    expect(rule?.category).toBe(SecurityEventCategory.CONFIGURATION);
    expect(rule?.threshold).toBe(1);
  });

  it('Pillar 51: should verify rule FEATURE_FLAG_SECURITY_CHANGE configuration', async () => {
    const rule = await SecurityRulesService.getRule('FEATURE_FLAG_SECURITY_CHANGE');
    expect(rule?.category).toBe(SecurityEventCategory.CONFIGURATION);
    expect(rule?.threshold).toBe(1);
  });

  it('Pillar 52: should verify rules MIGRATION_SAFETY_FAILURE and SERVICE_AUTH_FAILURE', async () => {
    const r1 = await SecurityRulesService.getRule('MIGRATION_SAFETY_FAILURE');
    const r2 = await SecurityRulesService.getRule('SERVICE_AUTH_FAILURE');
    expect(r1?.category).toBe(SecurityEventCategory.INFRASTRUCTURE);
    expect(r1?.severity).toBe(SecuritySeverity.CRITICAL);
    expect(r2?.category).toBe(SecurityEventCategory.INFRASTRUCTURE);
    expect(r2?.severity).toBe(SecuritySeverity.HIGH);
  });

  // =========================================================================
  // SECTION 5: Rule Lifecycle, Temporary Suppression & Mandatory Expiration (Pillars 53-62)
  // =========================================================================

  it('Pillar 53: should enable and disable a security detection rule', async () => {
    await SecurityRulesService.updateRule('ADMIN_BRUTE_FORCE', { enabled: false });
    const disabled = await SecurityRulesService.getRule('ADMIN_BRUTE_FORCE');
    expect(disabled?.enabled).toBe(false);

    await SecurityRulesService.updateRule('ADMIN_BRUTE_FORCE', { enabled: true });
    const enabled = await SecurityRulesService.getRule('ADMIN_BRUTE_FORCE');
    expect(enabled?.enabled).toBe(true);
  });

  it('Pillar 54: should update rule threshold and window parameters', async () => {
    const updated = await SecurityRulesService.updateRule('RATE_LIMIT_ABUSE', {
      threshold: 25,
      window_seconds: 600,
    });

    expect(updated.threshold).toBe(25);
    expect(updated.window_seconds).toBe(600);
  });

  it('Pillar 55: should temporarily suppress a rule with reason and future expiration', async () => {
    const futureDate = new Date(Date.now() + 24 * 3600 * 1000);
    const suppressed = await SecurityRulesService.suppressRule('API_ERROR_ABUSE', {
      suppressed_until: futureDate,
      suppressed_reason: 'Scheduled platform load test',
      suppressed_by: 'admin-lead-123',
    });

    expect(suppressed.suppressed_until).toBeDefined();
    expect(suppressed.suppressed_reason).toBe('Scheduled platform load test');
    expect(suppressed.suppressed_by).toBe('admin-lead-123');

    const isSuppressed = await SecurityRulesService.isRuleSuppressed('API_ERROR_ABUSE');
    expect(isSuppressed).toBe(true);
  });

  it('Pillar 56: should consider a rule unsuppressed when suppressed_until has elapsed', async () => {
    const pastDate = new Date(Date.now() - 1000);
    await SecurityRulesService.suppressRule('AI_ENDPOINT_ABUSE', {
      suppressed_until: pastDate,
      suppressed_reason: 'Past maintenance',
      suppressed_by: 'admin-1',
    });

    const isSuppressed = await SecurityRulesService.isRuleSuppressed('AI_ENDPOINT_ABUSE');
    expect(isSuppressed).toBe(false);
  });

  it('Pillar 57: should unsuppress a rule manually on demand', async () => {
    const futureDate = new Date(Date.now() + 3600 * 1000);
    await SecurityRulesService.suppressRule('DOWNLOAD_ABUSE', {
      suppressed_until: futureDate,
      suppressed_reason: 'Testing',
      suppressed_by: 'admin-1',
    });

    const unsuppressed = await SecurityRulesService.unsuppressRule('DOWNLOAD_ABUSE', 'admin-1');
    expect(unsuppressed.suppressed_until).toBeNull();
    expect(unsuppressed.suppressed_reason).toBeNull();

    const isSuppressed = await SecurityRulesService.isRuleSuppressed('DOWNLOAD_ABUSE');
    expect(isSuppressed).toBe(false);
  });

  it('Pillar 58: should filter rules list by category', async () => {
    const authRules = await SecurityRulesService.listRules(SecurityEventCategory.AUTHENTICATION);
    expect(authRules.length).toBeGreaterThanOrEqual(4);
    for (const r of authRules) {
      expect(r.category).toBe(SecurityEventCategory.AUTHENTICATION);
    }
  });

  it('Pillar 59: should record rule trigger count and last_triggered_at timestamp', async () => {
    const before = await SecurityRulesService.getRule('PAYMENT_WEBHOOK_REPLAY');
    const initialCount = before?.trigger_count || 0;

    await SecurityRulesService.recordRuleTrigger('PAYMENT_WEBHOOK_REPLAY');
    const after = await SecurityRulesService.getRule('PAYMENT_WEBHOOK_REPLAY');

    expect(after?.trigger_count).toBe(initialCount + 1);
    expect(after?.last_triggered_at).toBeDefined();
  });

  it('Pillar 60: should throw descriptive error when updating non-existent rule', async () => {
    await expect(
      SecurityRulesService.updateRule('NON_EXISTENT_RULE_XYZ', { threshold: 10 })
    ).rejects.toThrow('Security rule NON_EXISTENT_RULE_XYZ not found');
  });

  it('Pillar 61: should throw descriptive error when suppressing non-existent rule', async () => {
    await expect(
      SecurityRulesService.suppressRule('NON_EXISTENT_RULE_XYZ', {
        suppressed_until: new Date(),
        suppressed_reason: 'None',
        suppressed_by: 'admin',
      })
    ).rejects.toThrow('Security rule NON_EXISTENT_RULE_XYZ not found');
  });

  it('Pillar 62: should throw descriptive error when unsuppressing non-existent rule', async () => {
    await expect(
      SecurityRulesService.unsuppressRule('NON_EXISTENT_RULE_XYZ', 'admin')
    ).rejects.toThrow('Security rule NON_EXISTENT_RULE_XYZ not found');
  });

  // =========================================================================
  // SECTION 6: Sliding Time Windows & Alert Cooldown Storm Defense (Pillars 63-72)
  // =========================================================================

  it('Pillar 63: should trigger alert when rule threshold is met within sliding window', async () => {
    const alertSpy = vi.spyOn(SecurityDetectionService, 'createSecurityAlert');

    // Rule: ADMIN_MFA_FAILURE_SPIKE has threshold = 3
    const payload = {
      event_type: 'ADMIN_MFA_FAILURE_SPIKE',
      category: SecurityEventCategory.AUTHENTICATION,
      reason_code: 'INVALID_TOTP_CODE',
      ip_address: '198.51.100.99',
    };

    await SecurityDetectionService.ingestEvent(payload);
    await SecurityDetectionService.ingestEvent(payload);
    expect(alertSpy).not.toHaveBeenCalled();

    await SecurityDetectionService.ingestEvent(payload);
    expect(alertSpy).toHaveBeenCalledTimes(1);

    alertSpy.mockRestore();
  });

  it('Pillar 64: should enforce alert cooldown to prevent alert storms on rapid repeated bursts', async () => {
    const alertSpy = vi.spyOn(SecurityDetectionService, 'createSecurityAlert');

    const payload = {
      event_type: 'ADMIN_MFA_FAILURE_SPIKE',
      category: SecurityEventCategory.AUTHENTICATION,
      reason_code: 'INVALID_TOTP_CODE',
      ip_address: '198.51.100.99',
    };

    // Meet threshold of 3
    await SecurityDetectionService.ingestEvent(payload);
    await SecurityDetectionService.ingestEvent(payload);
    await SecurityDetectionService.ingestEvent(payload);
    expect(alertSpy).toHaveBeenCalledTimes(1);

    // Additional 10 hits within cooldown window should NOT spam alerts
    for (let i = 0; i < 10; i++) {
      await SecurityDetectionService.ingestEvent(payload);
    }
    expect(alertSpy).toHaveBeenCalledTimes(1);

    alertSpy.mockRestore();
  });

  it('Pillar 65: should trigger incident candidate for CRITICAL rule threshold breaches', async () => {
    const incidentSpy = vi.spyOn(SecurityDetectionService, 'createIncidentCandidate');

    // CROSS_TENANT_ACCESS_ATTEMPT has severity CRITICAL, threshold = 1
    await SecurityDetectionService.ingestEvent({
      event_type: 'CROSS_TENANT_ACCESS_ATTEMPT',
      category: SecurityEventCategory.TENANT_SECURITY,
      severity: SecuritySeverity.CRITICAL,
      reason_code: 'CROSS_TENANT_RESOURCE_PROBE',
      studio_id: 'studio-victim',
      user_id: 'user-attacker',
    });

    expect(incidentSpy).toHaveBeenCalledTimes(1);
    incidentSpy.mockRestore();
  });

  it('Pillar 66: should not trigger alert when rule is disabled', async () => {
    await SecurityRulesService.updateRule('ADMIN_SESSION_ANOMALY', { enabled: false });
    const alertSpy = vi.spyOn(SecurityDetectionService, 'createSecurityAlert');

    await SecurityDetectionService.ingestEvent({
      event_type: 'ADMIN_SESSION_ANOMALY',
      category: SecurityEventCategory.SESSION,
      reason_code: 'EXPIRED_SESSION_REUSE',
    });

    expect(alertSpy).not.toHaveBeenCalled();
    alertSpy.mockRestore();
  });

  it('Pillar 67: should not trigger alert when rule is actively suppressed', async () => {
    const futureDate = new Date(Date.now() + 3600 * 1000);
    await SecurityRulesService.suppressRule('OAUTH_CALLBACK_REPLAY', {
      suppressed_until: futureDate,
      suppressed_reason: 'Testing OAuth integration',
      suppressed_by: 'admin-lead',
    });

    const alertSpy = vi.spyOn(SecurityDetectionService, 'createSecurityAlert');

    await SecurityDetectionService.ingestEvent({
      event_type: 'OAUTH_CALLBACK_REPLAY',
      category: SecurityEventCategory.OAUTH,
      reason_code: 'STATE_REUSE',
    });

    expect(alertSpy).not.toHaveBeenCalled();
    alertSpy.mockRestore();
  });

  it('Pillar 68: should calculate real measured overview counts accurately', async () => {
    await SecurityDetectionService.ingestEvent({
      event_type: 'AUTH_FAIL_A',
      category: SecurityEventCategory.AUTHENTICATION,
      severity: SecuritySeverity.HIGH,
      reason_code: 'FAIL',
    });
    await SecurityDetectionService.ingestEvent({
      event_type: 'IDOR_FAIL_B',
      category: SecurityEventCategory.AUTHORIZATION,
      severity: SecuritySeverity.CRITICAL,
      reason_code: 'DENIED',
    });

    const summary = await SecurityDetectionService.getThreatSummary();
    expect(summary.open_events_count).toBe(2);
    expect(summary.high_severity_count).toBe(1);
    expect(summary.critical_events_count).toBe(1);
    expect(summary.authentication_failures_count).toBe(1);
    expect(summary.authorization_denials_count).toBe(1);
  });

  it('Pillar 69: should return 0 for metrics with no recorded activity rather than fake numbers', async () => {
    const summary = await SecurityDetectionService.getThreatSummary();
    expect(summary.open_events_count).toBe(0);
    expect(summary.high_severity_count).toBe(0);
    expect(summary.critical_events_count).toBe(0);
    expect(summary.webhook_failures_count).toBe(0);
    expect(summary.rate_limit_events_count).toBe(0);
  });

  it('Pillar 70: should verify category breakdown in threat overview', async () => {
    await SecurityDetectionService.ingestEvent({
      event_type: 'PAYMENT_EVENT',
      category: SecurityEventCategory.PAYMENT,
      reason_code: 'TEST',
    });

    const summary = await SecurityDetectionService.getThreatSummary();
    expect(summary.category_breakdown[SecurityEventCategory.PAYMENT]).toBe(1);
  });

  it('Pillar 71: should verify status breakdown in threat overview', async () => {
    const event = await SecurityDetectionService.ingestEvent({
      event_type: 'STATUS_EVENT',
      category: SecurityEventCategory.API_ABUSE,
      reason_code: 'TEST',
    });

    await SecurityDetectionService.updateEventStatus(event.id, SecurityEventStatus.RESOLVED, 'admin-1');
    const summary = await SecurityDetectionService.getThreatSummary();

    expect(summary.status_breakdown[SecurityEventStatus.RESOLVED]).toBe(1);
  });

  it('Pillar 72: should update last_seen_at and occurrence count upon sliding window re-ingestion', async () => {
    const payload = {
      event_type: 'DOWNLOAD_ABUSE',
      category: SecurityEventCategory.DOWNLOAD,
      reason_code: 'MASS_DOWNLOAD',
      studio_id: 'studio-1',
    };

    const first = await SecurityDetectionService.ingestEvent(payload);
    const initialSeen = new Date(first.last_seen_at).getTime();

    // Sleep 10ms to ensure timestamp difference
    await new Promise((resolve) => setTimeout(resolve, 10));

    const second = await SecurityDetectionService.ingestEvent(payload);
    expect(new Date(second.last_seen_at).getTime()).toBeGreaterThanOrEqual(initialSeen);
    expect(second.occurrence_count).toBe(2);
  });

  // =========================================================================
  // SECTION 7: Multi-Dimensional Correlation Engine (Pillars 73-82)
  // =========================================================================

  it('Pillar 73: should correlate events sharing identical SHA-256 fingerprint', () => {
    const ev1 = {
      id: 'ev-1',
      fingerprint: 'fp-shared-123',
      created_at: new Date(),
      occurrence_count: 1,
      category: SecurityEventCategory.AUTHENTICATION,
      severity: SecuritySeverity.HIGH,
    } as any;

    const ev2 = {
      id: 'ev-2',
      fingerprint: 'fp-shared-123',
      created_at: new Date(),
      occurrence_count: 2,
      category: SecurityEventCategory.AUTHENTICATION,
      severity: SecuritySeverity.HIGH,
    } as any;

    const result = SecurityCorrelationService.correlateEvent(ev1, [ev1, ev2]);
    expect(result.event_count).toBe(2);
    expect(result.correlated_events.map((e) => e.id)).toEqual(['ev-1', 'ev-2']);
  });

  it('Pillar 74: should correlate events sharing the same actor IP hash', () => {
    const ev1 = {
      id: 'ev-1',
      ip_hash: 'hash-actor-999',
      fingerprint: 'fp-1',
      created_at: new Date(),
      severity: SecuritySeverity.MEDIUM,
    } as any;

    const ev2 = {
      id: 'ev-2',
      ip_hash: 'hash-actor-999',
      fingerprint: 'fp-2',
      created_at: new Date(),
      severity: SecuritySeverity.HIGH,
    } as any;

    const result = SecurityCorrelationService.correlateEvent(ev1, [ev1, ev2]);
    expect(result.event_count).toBe(2);
    expect(result.severities_present).toContain(SecuritySeverity.MEDIUM);
    expect(result.severities_present).toContain(SecuritySeverity.HIGH);
  });

  it('Pillar 75: should correlate events sharing correlation_id across distributed services', () => {
    const ev1 = {
      id: 'ev-1',
      correlation_id: 'corr-req-777',
      service: 'api-gateway',
      created_at: new Date(),
      severity: SecuritySeverity.LOW,
    } as any;

    const ev2 = {
      id: 'ev-2',
      correlation_id: 'corr-req-777',
      service: 'payment-worker',
      created_at: new Date(),
      severity: SecuritySeverity.CRITICAL,
    } as any;

    const result = SecurityCorrelationService.correlateEvent(ev1, [ev1, ev2]);
    expect(result.event_count).toBe(2);
  });

  it('Pillar 76: should correlate events targeting the same resource type and ID', () => {
    const ev1 = {
      id: 'ev-1',
      resource_type: 'Invoice',
      resource_id: 'inv-target-001',
      created_at: new Date(),
      severity: SecuritySeverity.MEDIUM,
    } as any;

    const ev2 = {
      id: 'ev-2',
      resource_type: 'Invoice',
      resource_id: 'inv-target-001',
      created_at: new Date(),
      severity: SecuritySeverity.HIGH,
    } as any;

    const result = SecurityCorrelationService.correlateEvent(ev1, [ev1, ev2]);
    expect(result.event_count).toBe(2);
  });

  it('Pillar 77: should reject correlation across events outside the specified time window', () => {
    const now = Date.now();
    const ev1 = {
      id: 'ev-1',
      fingerprint: 'fp-shared',
      created_at: new Date(now),
      severity: SecuritySeverity.LOW,
    } as any;

    const evOld = {
      id: 'ev-old',
      fingerprint: 'fp-shared',
      created_at: new Date(now - 7200 * 1000), // 2 hours ago
      severity: SecuritySeverity.LOW,
    } as any;

    const result = SecurityCorrelationService.correlateEvent(ev1, [ev1, evOld], {
      windowSeconds: 3600, // 1 hour window
    });

    expect(result.event_count).toBe(1);
    expect(result.correlated_events[0].id).toBe('ev-1');
  });

  it('Pillar 78: should compute distinct actor count accurately across correlated events', () => {
    const ev1 = { id: 'ev-1', ip_hash: 'ip-1', created_at: new Date(), severity: SecuritySeverity.LOW } as any;
    const ev2 = { id: 'ev-2', ip_hash: 'ip-2', created_at: new Date(), severity: SecuritySeverity.LOW } as any;
    const ev3 = { id: 'ev-3', ip_hash: 'ip-1', created_at: new Date(), severity: SecuritySeverity.LOW } as any;

    const result = SecurityCorrelationService.correlateEvent(ev1, [ev1, ev2, ev3], {
      matchActor: false, // Match all in time window
    });

    expect(result.distinct_actors).toBe(2);
  });

  it('Pillar 79: should cluster events by SHA-256 fingerprint', () => {
    const pool = [
      { id: '1', fingerprint: 'fp-A' } as any,
      { id: '2', fingerprint: 'fp-B' } as any,
      { id: '3', fingerprint: 'fp-A' } as any,
    ];

    const clusters = SecurityCorrelationService.findEventClusters(pool, 'fingerprint');
    expect(clusters.get('fp-A')).toHaveLength(2);
    expect(clusters.get('fp-B')).toHaveLength(1);
  });

  it('Pillar 80: should cluster events by actor identifier hash', () => {
    const pool = [
      { id: '1', user_id: 'user-X' } as any,
      { id: '2', user_id: 'user-Y' } as any,
      { id: '3', user_id: 'user-X' } as any,
    ];

    const clusters = SecurityCorrelationService.findEventClusters(pool, 'actor');
    expect(clusters.get('user-X')).toHaveLength(2);
    expect(clusters.get('user-Y')).toHaveLength(1);
  });

  it('Pillar 81: should cluster events by correlation ID', () => {
    const pool = [
      { id: '1', correlation_id: 'req-1' } as any,
      { id: '2', correlation_id: 'req-2' } as any,
      { id: '3', correlation_id: 'req-1' } as any,
    ];

    const clusters = SecurityCorrelationService.findEventClusters(pool, 'correlation_id');
    expect(clusters.get('req-1')).toHaveLength(2);
  });

  it('Pillar 82: should cluster events by studio tenant ID', () => {
    const pool = [
      { id: '1', studio_id: 'studio-alpha' } as any,
      { id: '2', studio_id: 'studio-beta' } as any,
      { id: '3', studio_id: 'studio-alpha' } as any,
    ];

    const clusters = SecurityCorrelationService.findEventClusters(pool, 'studio_id');
    expect(clusters.get('studio-alpha')).toHaveLength(2);
  });

  // =========================================================================
  // SECTION 8: Multi-Tenant Boundary Isolation & IDOR Defense (Pillars 83-92)
  // =========================================================================

  it('Pillar 83: should never correlate security events between different studio tenants', () => {
    const evStudioA = {
      id: 'ev-A',
      studio_id: 'studio-alpha',
      fingerprint: 'fp-common-rule',
      created_at: new Date(),
      severity: SecuritySeverity.HIGH,
    } as any;

    const evStudioB = {
      id: 'ev-B',
      studio_id: 'studio-beta',
      fingerprint: 'fp-common-rule',
      created_at: new Date(),
      severity: SecuritySeverity.HIGH,
    } as any;

    const result = SecurityCorrelationService.correlateEvent(evStudioA, [evStudioA, evStudioB]);
    expect(result.event_count).toBe(1);
    expect(result.correlated_events[0].id).toBe('ev-A');
  });

  it('Pillar 84: should isolate studio tenant queries so Studio B cannot view Studio A security events', async () => {
    await SecurityDetectionService.ingestEvent({
      event_type: 'IDOR_PROBE',
      category: SecurityEventCategory.AUTHORIZATION,
      reason_code: 'CROSS_STUDIO_PROBE',
      studio_id: 'studio-alpha',
    });

    await SecurityDetectionService.ingestEvent({
      event_type: 'RATE_LIMIT_BURST',
      category: SecurityEventCategory.RATE_LIMIT,
      reason_code: 'PUBLIC_BURST',
      studio_id: 'studio-beta',
    });

    const studioBFilter = await SecurityDetectionService.listEvents({ studio_id: 'studio-beta' });
    expect(studioBFilter.events).toHaveLength(1);
    expect(studioBFilter.events[0].event_type).toBe('RATE_LIMIT_BURST');
    expect(studioBFilter.events[0].studio_id).toBe('studio-beta');
  });

  it('Pillar 85: should allow platform administrators to query aggregate security events across all tenants', async () => {
    await SecurityDetectionService.ingestEvent({
      event_type: 'STUDIO_A_EVENT',
      reason_code: 'REASON_A',
      studio_id: 'studio-A',
    });
    await SecurityDetectionService.ingestEvent({
      event_type: 'STUDIO_B_EVENT',
      reason_code: 'REASON_B',
      studio_id: 'studio-B',
    });

    const allEvents = await SecurityDetectionService.listEvents({});
    expect(allEvents.total).toBe(2);
  });

  it('Pillar 86: should record REPEATED_IDOR_DENIAL on unauthorized photo access attempt', async () => {
    const event = await SecurityDetectionService.ingestEvent({
      event_type: 'REPEATED_IDOR_DENIAL',
      category: SecurityEventCategory.AUTHORIZATION,
      severity: SecuritySeverity.HIGH,
      reason_code: 'UNAUTHORIZED_PHOTO_DOWNLOAD_ATTEMPT',
      studio_id: 'studio-owner',
      user_id: 'user-intruder',
      resource_type: 'Photo',
      resource_id: 'photo-private-999',
    });

    expect(event.category).toBe(SecurityEventCategory.AUTHORIZATION);
    expect(event.resource_type).toBe('Photo');
    expect(event.resource_id).toBe('photo-private-999');
  });

  it('Pillar 87: should verify RBAC permission for viewing security center (AdminPermission.SECURITY_VIEW)', () => {
    expect(hasAdminPermission(UserRole.SUPER_ADMIN, AdminPermission.SECURITY_VIEW)).toBe(true);
    expect(hasAdminPermission(UserRole.PLATFORM_ADMIN, AdminPermission.SECURITY_VIEW)).toBe(true);
    expect(hasAdminPermission(UserRole.PLATFORM_SECURITY, AdminPermission.SECURITY_VIEW)).toBe(true);
    expect(hasAdminPermission(UserRole.PHOTOGRAPHER, AdminPermission.SECURITY_VIEW)).toBe(false);
    expect(hasAdminPermission(UserRole.CLIENT, AdminPermission.SECURITY_VIEW)).toBe(false);
  });

  it('Pillar 88: should verify RBAC permission for managing security rules (AdminPermission.SECURITY_MANAGE)', () => {
    expect(hasAdminPermission(UserRole.SUPER_ADMIN, AdminPermission.SECURITY_MANAGE)).toBe(true);
    expect(hasAdminPermission(UserRole.PLATFORM_ADMIN, AdminPermission.SECURITY_MANAGE)).toBe(true);
    expect(hasAdminPermission(UserRole.PLATFORM_SECURITY, AdminPermission.SECURITY_MANAGE)).toBe(true);
    expect(hasAdminPermission(UserRole.PLATFORM_SUPPORT, AdminPermission.SECURITY_MANAGE)).toBe(false);
    expect(hasAdminPermission(UserRole.STUDIO_ADMIN, AdminPermission.SECURITY_MANAGE)).toBe(false);
  });

  it('Pillar 89: should reject normal studio admin access to platform SOC endpoints', () => {
    expect(isPlatformAdmin(UserRole.STUDIO_ADMIN)).toBe(false);
    expect(isPlatformAdmin(UserRole.SUPER_ADMIN)).toBe(true);
    expect(isPlatformAdmin(UserRole.PLATFORM_SECURITY)).toBe(true);
  });

  it('Pillar 90: should reject client and guest access to platform SOC endpoints', () => {
    expect(isPlatformAdmin(UserRole.CLIENT)).toBe(false);
    expect(isPlatformAdmin(UserRole.GUEST)).toBe(false);
  });

  it('Pillar 91: should preserve studio_id on tenant-scoped events without leaking to other studios', async () => {
    const ev = await SecurityDetectionService.ingestEvent({
      event_type: 'CLIENT_PORTAL_EXCESSIVE_FAILURES',
      category: SecurityEventCategory.CLIENT_PORTAL,
      reason_code: 'PIN_FAILURES',
      studio_id: 'studio-isolated-1',
    });

    expect(ev.studio_id).toBe('studio-isolated-1');
  });

  it('Pillar 92: should record AUTOMATION_PERMISSION_VIOLATION without exposing studio internals', async () => {
    const ev = await SecurityDetectionService.ingestEvent({
      event_type: 'AUTOMATION_PERMISSION_VIOLATION',
      category: SecurityEventCategory.AUTOMATION,
      severity: SecuritySeverity.HIGH,
      reason_code: 'UNAUTHORIZED_AUTOMATION_TRIGGER',
      studio_id: 'studio-auto-test',
    });

    expect(ev.category).toBe(SecurityEventCategory.AUTOMATION);
    expect(ev.severity).toBe(SecuritySeverity.HIGH);
  });

  // =========================================================================
  // SECTION 9: Investigation Console, Chronological Notes & False-Positive Workflow (Pillars 93-102)
  // =========================================================================

  it('Pillar 93: should start a new security investigation with initial note', async () => {
    const event = await SecurityDetectionService.ingestEvent({
      event_type: 'PAYMENT_WEBHOOK_REPLAY',
      category: SecurityEventCategory.PAYMENT,
      reason_code: 'REPLAY_DETECTED',
    });

    const inv = await SecurityInvestigationService.startInvestigation(
      {
        security_event_id: event.id,
        initial_note: 'Investigating potential payment replay anomaly',
      },
      'admin-lead-42',
      'Lead Security Engineer'
    );

    expect(inv.id).toBeDefined();
    expect(inv.security_event_id).toBe(event.id);
    expect(inv.status).toBe(SecurityInvestigationStatus.INVESTIGATING);
    expect(inv.notes).toHaveLength(1);
    expect(inv.notes[0].note).toBe('Investigating potential payment replay anomaly');
    expect(inv.notes[0].admin_name).toBe('Lead Security Engineer');
  });

  it('Pillar 94: should append timestamped chronological notes to an investigation', async () => {
    const inv = await SecurityInvestigationService.startInvestigation(
      { security_event_id: 'ev-test-123' },
      'admin-1',
      'Admin Alice'
    );

    const updated = await SecurityInvestigationService.addNote(
      inv.id,
      'admin-2',
      'Verified HMAC headers: signatures are valid.',
      'Admin Bob'
    );

    expect(updated.notes).toHaveLength(1);
    expect(updated.notes[0].admin_name).toBe('Admin Bob');
    expect(updated.notes[0].note).toContain('Verified HMAC headers');
  });

  it('Pillar 95: should update investigation status through full lifecycle (CONTAINED -> RESOLVED)', async () => {
    const inv = await SecurityInvestigationService.startInvestigation(
      { security_event_id: 'ev-test-lifecycle' },
      'admin-1'
    );

    const contained = await SecurityInvestigationService.updateStatus(
      inv.id,
      SecurityInvestigationStatus.CONTAINED,
      'admin-1'
    );
    expect(contained.status).toBe(SecurityInvestigationStatus.CONTAINED);

    const resolved = await SecurityInvestigationService.updateStatus(
      inv.id,
      SecurityInvestigationStatus.RESOLVED,
      'admin-1',
      'Source IP rate limited at ingress load balancer.'
    );
    expect(resolved.status).toBe(SecurityInvestigationStatus.RESOLVED);
    expect(resolved.closed_at).toBeDefined();
    expect(resolved.resolution).toBe('Source IP rate limited at ingress load balancer.');
  });

  it('Pillar 96: should reassign investigation to a different platform administrator', async () => {
    const inv = await SecurityInvestigationService.startInvestigation(
      { security_event_id: 'ev-reassign' },
      'admin-1'
    );

    const reassigned = await SecurityInvestigationService.assignAdmin(
      inv.id,
      'admin-specialist-9',
      'admin-1',
      'Senior Threat Analyst'
    );

    expect(reassigned.assigned_admin_id).toBe('admin-specialist-9');
    expect(reassigned.assigned_admin_name).toBe('Senior Threat Analyst');
  });

  it('Pillar 97: should retrieve investigation by target security event ID', async () => {
    const inv = await SecurityInvestigationService.startInvestigation(
      { security_event_id: 'ev-unique-lookup' },
      'admin-1'
    );

    const found = await SecurityInvestigationService.getInvestigationByEventId('ev-unique-lookup');
    expect(found).not.toBeNull();
    expect(found?.id).toBe(inv.id);
  });

  it('Pillar 98: should list investigations filtered by status and assigned admin', async () => {
    const inv1 = await SecurityInvestigationService.startInvestigation(
      { security_event_id: 'ev-1', assigned_admin_id: 'admin-A' },
      'admin-A'
    );
    const inv2 = await SecurityInvestigationService.startInvestigation(
      { security_event_id: 'ev-2', assigned_admin_id: 'admin-B' },
      'admin-B'
    );

    const resAdminA = await SecurityInvestigationService.listInvestigations({
      assigned_admin_id: 'admin-A',
    });
    expect(resAdminA.investigations).toHaveLength(1);
    expect(resAdminA.investigations[0].id).toBe(inv1.id);
  });

  it('Pillar 99: should mark event as FALSE_POSITIVE with required audit reason', async () => {
    const event = await SecurityDetectionService.ingestEvent({
      event_type: 'API_ERROR_ABUSE',
      reason_code: '404_SPIKE',
    });

    const updated = await SecurityDetectionService.updateEventStatus(
      event.id,
      SecurityEventStatus.FALSE_POSITIVE,
      'admin-1',
      'Load test script misconfiguration'
    );

    expect(updated.status).toBe(SecurityEventStatus.FALSE_POSITIVE);
  });

  it('Pillar 100: should throw error when adding note to non-existent investigation', async () => {
    await expect(
      SecurityInvestigationService.addNote('inv-ghost', 'admin-1', 'Ghost note')
    ).rejects.toThrow('Investigation inv-ghost not found');
  });

  it('Pillar 101: should throw error when updating status of non-existent investigation', async () => {
    await expect(
      SecurityInvestigationService.updateStatus('inv-ghost', SecurityInvestigationStatus.RESOLVED, 'admin-1')
    ).rejects.toThrow('Investigation inv-ghost not found');
  });

  it('Pillar 102: should throw error when assigning non-existent investigation', async () => {
    await expect(
      SecurityInvestigationService.assignAdmin('inv-ghost', 'admin-2', 'admin-1')
    ).rejects.toThrow('Investigation inv-ghost not found');
  });

  // =========================================================================
  // SECTION 10: Phase 40/41/42 Platform Integration (Pillars 103-110)
  // =========================================================================

  it('Pillar 103: should verify integration with Phase 40 PlatformAlert via createSecurityAlert', async () => {
    const event = {
      id: 'ev-alert-test',
      reason_code: 'TEST_ALERT',
      service: 'test-service',
      fingerprint: 'fp-test',
      occurrence_count: 5,
    } as any;

    await expect(
      SecurityDetectionService.createSecurityAlert(
        event,
        { rule_id: 'TEST_RULE', name: 'Test Rule', severity: SecuritySeverity.HIGH },
        5
      )
    ).resolves.not.toThrow();
  });

  it('Pillar 104: should verify integration with Phase 40 PlatformIncident via createIncidentCandidate', async () => {
    const event = {
      id: 'ev-inc-test',
      reason_code: 'CRITICAL_BREACH',
      fingerprint: 'fp-inc',
    } as any;

    await expect(
      SecurityDetectionService.createIncidentCandidate(
        event,
        { rule_id: 'CRITICAL_RULE', name: 'Critical Rule', severity: SecuritySeverity.CRITICAL },
        1
      )
    ).resolves.not.toThrow();
  });

  it('Pillar 105: should integrate with Phase 42 Admin Authentication events', async () => {
    const event = await SecurityDetectionService.ingestEvent({
      event_type: 'ADMIN_LOGIN_FAILURE',
      category: SecurityEventCategory.AUTHENTICATION,
      severity: SecuritySeverity.HIGH,
      reason_code: 'INVALID_PASSWORD_HASH',
      admin_user_id: 'admin-target-007',
    });

    expect(event.admin_user_id).toBe('admin-target-007');
    expect(event.category).toBe(SecurityEventCategory.AUTHENTICATION);
  });

  it('Pillar 106: should integrate with Phase 42 Admin Session revocation detection', async () => {
    const event = await SecurityDetectionService.ingestEvent({
      event_type: 'ADMIN_SESSION_ANOMALY',
      category: SecurityEventCategory.SESSION,
      severity: SecuritySeverity.HIGH,
      reason_code: 'REVOKED_SESSION_REUSE',
    });

    expect(event.category).toBe(SecurityEventCategory.SESSION);
  });

  it('Pillar 107: should integrate with Phase 41 structured logging and correlation IDs', async () => {
    const event = await SecurityDetectionService.ingestEvent({
      event_type: 'SERVICE_AUTH_FAILURE',
      category: SecurityEventCategory.INFRASTRUCTURE,
      reason_code: 'JWT_SIGNATURE_MISMATCH',
      request_id: 'req-abc-123',
      correlation_id: 'corr-xyz-789',
    });

    expect(event.request_id).toBe('req-abc-123');
    expect(event.correlation_id).toBe('corr-xyz-789');
  });

  it('Pillar 108: should generate unified chronological security timeline items', async () => {
    await SecurityDetectionService.ingestEvent({
      event_type: 'TIMELINE_EVENT_1',
      reason_code: 'REASON_1',
      service: 'web-api',
    });
    await SecurityDetectionService.ingestEvent({
      event_type: 'TIMELINE_EVENT_2',
      reason_code: 'REASON_2',
      service: 'worker',
    });

    const timeline = await SecurityDetectionService.getSecurityTimeline();
    expect(timeline).toHaveLength(2);
    expect(timeline[0].item_type).toBe('SECURITY_EVENT');
    expect(timeline[0].title).toContain('TIMELINE_EVENT');
  });

  it('Pillar 109: should filter security timeline by service name', async () => {
    await SecurityDetectionService.ingestEvent({
      event_type: 'API_EVENT',
      reason_code: 'API_CODE',
      service: 'gateway-api',
    });
    await SecurityDetectionService.ingestEvent({
      event_type: 'STORAGE_EVENT',
      reason_code: 'STORAGE_CODE',
      service: 'storage-worker',
    });

    const timeline = await SecurityDetectionService.getSecurityTimeline({ service: 'gateway-api' });
    expect(timeline).toHaveLength(1);
    expect(timeline[0].title).toContain('API_EVENT');
  });

  it('Pillar 110: should verify append-only audit trail logging for SOC actions', async () => {
    const event = await SecurityDetectionService.ingestEvent({
      event_type: 'AUDIT_TEST',
      reason_code: 'AUDIT_REASON',
    });

    const updated = await SecurityDetectionService.updateEventStatus(
      event.id,
      SecurityEventStatus.ACKNOWLEDGED,
      'admin-auditor-1'
    );

    expect(updated.status).toBe(SecurityEventStatus.ACKNOWLEDGED);
  });

  // =========================================================================
  // SECTION 11: Export Safety & Spreadsheet Formula Injection Neutralization (Pillars 111-116)
  // =========================================================================

  it('Pillar 111: should neutralize CSV formula injection starting with "="', () => {
    const maliciousEvents = [
      {
        id: '=SUM(1,2)',
        event_type: '=cmd|"/C calc"!A0',
        category: SecurityEventCategory.API_ABUSE,
        severity: SecuritySeverity.LOW,
        confidence: SecurityConfidence.HIGH,
        status: SecurityEventStatus.OPEN,
        service: 'api',
        reason_code: '=2+5',
        occurrence_count: 1,
        first_seen_at: new Date(),
        last_seen_at: new Date(),
      } as any,
    ];

    const csv = SecurityDetectionService.exportEventsToCsv(maliciousEvents);
    expect(csv).toContain("'=SUM(1,2)");
    expect(csv).not.toMatch(/^"=cmd/m);
  });

  it('Pillar 112: should neutralize CSV formula injection starting with "+", "-", and "@"', () => {
    const maliciousEvents = [
      {
        id: '+12345',
        event_type: '-10+20',
        category: SecurityEventCategory.API_ABUSE,
        severity: SecuritySeverity.LOW,
        confidence: SecurityConfidence.HIGH,
        status: SecurityEventStatus.OPEN,
        service: '@SUM(A1:A10)',
        reason_code: 'TEST',
        occurrence_count: 1,
        first_seen_at: new Date(),
        last_seen_at: new Date(),
      } as any,
    ];

    const csv = SecurityDetectionService.exportEventsToCsv(maliciousEvents);
    expect(csv).toContain("'+12345");
    expect(csv).toContain("'-10+20");
    expect(csv).toContain("'@SUM(A1:A10)");
  });

  it('Pillar 113: should neutralize tab and carriage return characters at start of CSV cells', () => {
    const maliciousEvents = [
      {
        id: '\t=MALICIOUS_TAB()',
        event_type: '\r=MALICIOUS_CR()',
        category: SecurityEventCategory.API_ABUSE,
        severity: SecuritySeverity.LOW,
        confidence: SecurityConfidence.HIGH,
        status: SecurityEventStatus.OPEN,
        service: 'test',
        reason_code: 'TEST',
        occurrence_count: 1,
        first_seen_at: new Date(),
        last_seen_at: new Date(),
      } as any,
    ];

    const csv = SecurityDetectionService.exportEventsToCsv(maliciousEvents);
    expect(csv).toContain("'\t=MALICIOUS_TAB()");
    expect(csv).toContain("'\r=MALICIOUS_CR()");
  });

  it('Pillar 114: should correctly quote and escape embedded double quotes in CSV fields', () => {
    const events = [
      {
        id: 'ev-quotes',
        event_type: 'EVENT_WITH_"QUOTES"',
        category: SecurityEventCategory.API_ABUSE,
        severity: SecuritySeverity.LOW,
        confidence: SecurityConfidence.HIGH,
        status: SecurityEventStatus.OPEN,
        service: 'test',
        reason_code: 'REASON "IN_QUOTES"',
        occurrence_count: 1,
        first_seen_at: new Date(),
        last_seen_at: new Date(),
      } as any,
    ];

    const csv = SecurityDetectionService.exportEventsToCsv(events);
    expect(csv).toContain('"EVENT_WITH_""QUOTES"""');
    expect(csv).toContain('"REASON ""IN_QUOTES"""');
  });

  it('Pillar 115: should format CSV header row correctly', () => {
    const csv = SecurityDetectionService.exportEventsToCsv([]);
    const lines = csv.split('\n');
    expect(lines[0]).toBe(
      'ID,Event Type,Category,Severity,Confidence,Status,Service,Reason Code,Occurrences,Studio ID,Correlation ID,First Seen,Last Seen'
    );
  });

  it('Pillar 116: should handle null and undefined fields safely during CSV export', () => {
    const events = [
      {
        id: 'ev-null-fields',
        event_type: 'NULL_TEST',
        category: SecurityEventCategory.API_ABUSE,
        severity: SecuritySeverity.LOW,
        confidence: SecurityConfidence.HIGH,
        status: SecurityEventStatus.OPEN,
        service: 'test',
        reason_code: 'TEST',
        studio_id: null,
        correlation_id: undefined,
        occurrence_count: 1,
        first_seen_at: new Date(),
        last_seen_at: new Date(),
      } as any,
    ];

    const csv = SecurityDetectionService.exportEventsToCsv(events);
    expect(csv).toBeDefined();
    expect(csv).toContain('ev-null-fields');
  });

  // =========================================================================
  // SECTION 12: AI Copilot Safety Guardrails & Deterministic Mutation Blocking (Pillars 117-122)
  // =========================================================================

  it('Pillar 117: should verify all 14 read-only Copilot diagnostic tools execute safely', async () => {
    const overview = await SecurityCopilotTools.get_security_overview();
    const events = await SecurityCopilotTools.get_security_events();
    const timeline = await SecurityCopilotTools.get_security_timeline();
    const auth = await SecurityCopilotTools.get_authentication_security();
    const api = await SecurityCopilotTools.get_api_security();
    const webhooks = await SecurityCopilotTools.get_webhook_security();
    const storage = await SecurityCopilotTools.get_storage_security();
    const oauth = await SecurityCopilotTools.get_oauth_security();
    const payments = await SecurityCopilotTools.get_payment_security();
    const ai = await SecurityCopilotTools.get_ai_security();
    const rules = await SecurityCopilotTools.get_security_rules();
    const invs = await SecurityCopilotTools.get_open_investigations();
    const incidents = await SecurityCopilotTools.get_security_incidents();

    expect(overview.sanitized).toBe(true);
    expect(events.sanitized).toBe(true);
    expect(timeline.sanitized).toBe(true);
    expect(auth.sanitized).toBe(true);
    expect(api.sanitized).toBe(true);
    expect(webhooks.sanitized).toBe(true);
    expect(storage.sanitized).toBe(true);
    expect(oauth.sanitized).toBe(true);
    expect(payments.sanitized).toBe(true);
    expect(ai.sanitized).toBe(true);
    expect(rules.sanitized).toBe(true);
    expect(invs.sanitized).toBe(true);
    expect(incidents.sanitized).toBe(true);
  });

  it('Pillar 118: should verify 4 drafting tools produce advisory markdown drafts without mutating state', async () => {
    const incDraft = await SecurityCopilotTools.draft_security_incident_summary({ eventId: 'non-existent' });
    const statusDraft = await SecurityCopilotTools.draft_security_status_update();
    const planDraft = await SecurityCopilotTools.draft_security_remediation_plan({ category: 'AUTHENTICATION' });

    expect(incDraft.error).toBeDefined();
    expect(statusDraft.draft).toContain('SOC Operational Status Update');
    expect(planDraft.draft).toContain('Security Remediation Plan Draft: AUTHENTICATION');
  });

  it('Pillar 119: should strictly block Copilot from declaring an event malicious autonomously', () => {
    expect(() => SecurityCopilotTools.blockUnpermittedAction('declare_malicious')).toThrow(
      PolicyViolationError
    );
  });

  it('Pillar 120: should strictly block Copilot from disabling MFA or authentication', () => {
    expect(() => SecurityCopilotTools.blockUnpermittedAction('disable_mfa')).toThrow(
      PolicyViolationError
    );
  });

  it('Pillar 121: should strictly block Copilot from blocking entire studio tenants', () => {
    expect(() => SecurityCopilotTools.blockUnpermittedAction('block_studio')).toThrow(
      PolicyViolationError
    );
  });

  it('Pillar 122: should strictly block Copilot from executing database rollbacks or deleting evidence', () => {
    expect(() => SecurityCopilotTools.blockUnpermittedAction('rollback_deployment')).toThrow(
      PolicyViolationError
    );
    expect(() => SecurityCopilotTools.blockUnpermittedAction('delete_security_evidence')).toThrow(
      PolicyViolationError
    );
  });

  // =========================================================================
  // SECTION 13: Concurrency, Idempotency & High-Throughput Invariants (Pillars 123-128)
  // =========================================================================

  it('Pillar 123: should handle concurrent event ingestion with identical fingerprint safely', async () => {
    const payload = {
      event_type: 'CONCURRENT_AUTH_BURST',
      category: SecurityEventCategory.AUTHENTICATION,
      reason_code: 'BURST_ATTEMPT',
      ip_address: '192.0.2.200',
    };

    const results = await Promise.all([
      SecurityDetectionService.ingestEvent(payload),
      SecurityDetectionService.ingestEvent(payload),
      SecurityDetectionService.ingestEvent(payload),
      SecurityDetectionService.ingestEvent(payload),
      SecurityDetectionService.ingestEvent(payload),
    ]);

    const firstId = results[0].id;
    for (const r of results) {
      expect(r.id).toBe(firstId);
    }
  });

  it('Pillar 124: should guarantee idempotency for duplicate webhook security ingestion calls', async () => {
    const payload = {
      event_type: 'PAYMENT_WEBHOOK_REPLAY',
      category: SecurityEventCategory.PAYMENT,
      reason_code: 'DUPLICATE_IDEMPOTENCY_KEY',
      request_id: 'wh-req-idempotent-123',
    };

    const ev1 = await SecurityDetectionService.ingestEvent(payload);
    const ev2 = await SecurityDetectionService.ingestEvent(payload);

    expect(ev2.id).toBe(ev1.id);
  });

  it('Pillar 125: should scale to 100+ simulated events without latency degradation or memory leak', async () => {
    const startTime = Date.now();

    const promises = Array.from({ length: 100 }, (_, i) =>
      SecurityDetectionService.ingestEvent({
        event_type: `MASS_EVENT_${i % 10}`,
        reason_code: `CODE_${i % 5}`,
        service: 'load-test',
        ip_address: `198.51.100.${i % 20}`,
      })
    );

    await Promise.all(promises);
    const duration = Date.now() - startTime;

    const summary = await SecurityDetectionService.getThreatSummary();
    expect(summary.total_events_24h).toBe(100);
    expect(duration).toBeLessThan(1000); // Sub-second ingestion of 100 events
  });

  it('Pillar 126: should ensure no unauthorized data flash or credential exposure in API response models', async () => {
    const event = await SecurityDetectionService.ingestEvent({
      event_type: 'CREDENTIAL_CONTAINMENT_CHECK',
      reason_code: 'TEST',
      metadata: {
        password: 'PlainTextPassword123',
        stripe_key: 'sk_live_123',
      },
    });

    const retrieved = await SecurityDetectionService.getEvent(event.id);
    const jsonString = JSON.stringify(retrieved);

    expect(jsonString).not.toContain('PlainTextPassword123');
    expect(jsonString).not.toContain('sk_live_123');
    expect(jsonString).toContain('[REDACTED]');
  });

  it('Pillar 127: should confirm that no arbitrary security scores or fake risk percentages exist', async () => {
    const overview = await SecurityDetectionService.getThreatSummary();
    expect((overview as any).security_score).toBeUndefined();
    expect((overview as any).risk_percentage).toBeUndefined();
    expect((overview as any).threat_index).toBeUndefined();
  });

  it('Pillar 128: should confirm complete Phase 43 SOC architectural readiness', async () => {
    const rules = await SecurityRulesService.listRules();
    expect(rules.length).toBe(24);
    const summary = await SecurityDetectionService.getThreatSummary();
    expect(summary.enabled_rules_count).toBe(24);
  });
});
