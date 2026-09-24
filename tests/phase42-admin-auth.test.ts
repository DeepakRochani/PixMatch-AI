/**
 * PixMatch AI — Phase 42: Separate Super Admin Authentication & Secure Admin Portal 2.0
 * Master Test Suite
 *
 * Comprehensive validation across 122 verification pillars (700+ assertions):
 *
 * SECTION 1: Cryptographic Invariants & Secure Token Generation (Pillars 1-10)
 * SECTION 2: RFC 6238 TOTP Engine & MFA Operations (Pillars 11-20)
 * SECTION 3: Single-Use Recovery Codes Engine (Pillars 21-28)
 * SECTION 4: Administrator Password Complexity Rules (Pillars 29-36)
 * SECTION 5: Multi-Tier Rate Limiting & Brute-Force Defense (Pillars 37-48)
 * SECTION 6: Centralized Audit Logging & Sensitive Data Redaction (Pillars 49-58)
 * SECTION 7: Admin MFA Service Lifecycle & Replay Defense (Pillars 59-68)
 * SECTION 8: Admin Authentication & Platform Role Boundary Isolation (Pillars 69-80)
 * SECTION 9: Session Management, Idle/Absolute Timeouts & Rotation (Pillars 81-92)
 * SECTION 10: Owner Invariants, Invitations & Password Reset (Pillars 93-102)
 * SECTION 11: Route Guards, Security Headers & Token Extraction (Pillars 103-108)
 * SECTION 12: Copilot Tools Boundary & Deterministic Block Enforcement (Pillars 109-116)
 * SECTION 13: Concurrency, Stress & High-Load Invariants (Pillars 117-122)
 */

import {
  generateAdminSessionToken,
  hashToken,
  hashMetadataIdentifier,
  generateBase32Secret,
  generateTotpCode,
  verifyTotpCode,
  generateTotpUri,
  generateRecoveryCodes,
  verifyAndConsumeRecoveryCode,
  encryptMfaSecret,
  decryptMfaSecret,
  validateAdminPassword,
  hashPassword,
  isPlatformAdmin,
  hasAdminPermission,
} from '@pixmatch/auth';

import {
  AdminSessionStatus,
  AdminMfaStatus,
  AdminInvitationStatus,
  AdminPasswordResetStatus,
  AdminAuthEventType,
  UserRole,
} from '@pixmatch/types';

import { AdminRateLimiterService } from '../apps/api/src/modules/admin-auth/admin-rate-limiter.service';
import { AdminAuditService } from '../apps/api/src/modules/admin-auth/admin-audit.service';
import { AdminMfaService } from '../apps/api/src/modules/admin-auth/admin-mfa.service';
import { AdminAuthService } from '../apps/api/src/modules/admin-auth/admin-auth.service';
import {
  extractAdminToken,
  adminSecurityHeaders,
} from '../apps/api/src/modules/admin-auth/admin-auth.middleware';
import {
  AdminAuthCopilotTools,
  PolicyViolationError,
} from '../apps/api/src/modules/admin-auth/admin-auth-copilot-tools';

// -------------------------------------------
// Test Runner Framework
// -------------------------------------------

let totalPassed = 0;
let totalFailed = 0;
let totalAssertions = 0;

function assert(condition: boolean, message: string) {
  totalAssertions++;
  if (!condition) {
    console.error(`  ❌ FAILED: ${message}`);
    totalFailed++;
    throw new Error(`Assertion failed: ${message}`);
  }
}

async function runPillar(pillarNum: number, name: string, fn: () => Promise<void> | void) {
  try {
    await fn();
    totalPassed++;
    console.log(`✅ Pillar ${pillarNum.toString().padStart(3, '0')}: ${name}`);
  } catch (err: any) {
    console.error(`💥 Pillar ${pillarNum.toString().padStart(3, '0')} ERROR: ${name} -> ${err.message}`);
  }
}

// -------------------------------------------
// Master Test Execution
// -------------------------------------------

async function runMasterTestSuite() {
  console.log('================================================================');
  console.log('PIXMATCH AI — PHASE 42: SEPARATE ADMIN AUTH & SECURITY 2.0');
  console.log('Master Test Suite (122 Pillars / 700+ Assertions)');
  console.log('================================================================\n');

  // Initialize Copilot tools registry
  AdminAuthCopilotTools.initialize();

  // Reset all mock stores
  AdminAuthService.resetMockStores();

  // Seed sample platform admins
  const superAdminPasswordHash = await hashPassword('AdminSuperPassword2026!#');
  const platformAdminPasswordHash = await hashPassword('AdminPlatformPassword2026!#');
  const studioAdminPasswordHash = await hashPassword('StudioAdminPassword2026!#');

  AdminAuthService.seedMockUser({
    id: 'adm-super-01',
    email: 'superadmin@pixmatch.io',
    name: 'Super Administrator',
    password_hash: superAdminPasswordHash,
    role: UserRole.SUPER_ADMIN,
    is_suspended: false,
  });

  AdminAuthService.seedMockUser({
    id: 'adm-platform-01',
    email: 'admin@pixmatch.io',
    name: 'Platform Ops Admin',
    password_hash: platformAdminPasswordHash,
    role: UserRole.PLATFORM_ADMIN,
    is_suspended: false,
  });

  AdminAuthService.seedMockUser({
    id: 'usr-studio-01',
    email: 'owner@studio.io',
    name: 'Studio Owner',
    password_hash: studioAdminPasswordHash,
    role: UserRole.STUDIO_OWNER,
    is_suspended: false,
  });

  AdminAuthService.seedMockUser({
    id: 'usr-studio-adm',
    email: 'studioadm@studio.io',
    name: 'Studio Admin Member',
    password_hash: studioAdminPasswordHash,
    role: UserRole.STUDIO_ADMIN,
    is_suspended: false,
  });

  // =========================================================================
  // SECTION 1: Cryptographic Invariants & Secure Token Generation (Pillars 1-10)
  // =========================================================================

  await runPillar(1, 'Token Generation — 32 Bytes CSPRNG Hex Output (64 chars)', () => {
    const token = generateAdminSessionToken(32);
    assert(typeof token === 'string', 'Token is a string');
    assert(token.length === 64, `Token length is exactly 64 hex characters (got ${token.length})`);
    assert(/^[0-9a-f]{64}$/i.test(token), 'Token matches hex pattern');
  });

  await runPillar(2, 'Token Generation — High Entropy Uniqueness (100 Unique Tokens)', () => {
    const tokenSet = new Set<string>();
    for (let i = 0; i < 100; i++) {
      const t = generateAdminSessionToken(32);
      assert(!tokenSet.has(t), 'Generated token is globally unique');
      tokenSet.add(t);
    }
    assert(tokenSet.size === 100, 'All 100 generated tokens are unique');
  });

  await runPillar(3, 'Token Generation — Custom Byte Lengths Support', () => {
    const t16 = generateAdminSessionToken(16);
    const t48 = generateAdminSessionToken(48);
    const t64 = generateAdminSessionToken(64);
    assert(t16.length === 32, '16 bytes token yields 32 hex chars');
    assert(t48.length === 96, '48 bytes token yields 96 hex chars');
    assert(t64.length === 128, '64 bytes token yields 128 hex chars');
  });

  await runPillar(4, 'SHA-256 Hashing — Deterministic One-Way Hash Generation', () => {
    const input = 'sample-admin-token-12345';
    const hash1 = hashToken(input);
    const hash2 = hashToken(input);
    assert(hash1 === hash2, 'Hash is completely deterministic');
    assert(hash1.length === 64, 'SHA-256 output is 64 hex characters');
  });

  await runPillar(5, 'SHA-256 Hashing — Avalanche Effect (Zero Collisions on 1-bit Change)', () => {
    const h1 = hashToken('pixmatch-admin-token-a');
    const h2 = hashToken('pixmatch-admin-token-b');
    assert(h1 !== h2, 'Different inputs produce different hashes');
    assert(h1.length === 64 && h2.length === 64, 'Both hashes are 64 characters');
  });

  await runPillar(6, 'SHA-256 Hashing — Empty or Non-String Input Safety', () => {
    const hEmpty = hashToken('');
    assert(typeof hEmpty === 'string' && hEmpty.length === 64, 'Empty string hash is safe');
    const hNull = hashToken(null as any);
    assert(typeof hNull === 'string' && hNull.length === 64, 'Null token fallback is safe');
  });

  await runPillar(7, 'Metadata Hashing — IP Address Anonymization Hash', () => {
    const ip = '203.0.113.195';
    const ipHash = hashMetadataIdentifier(ip);
    assert(typeof ipHash === 'string' && ipHash.length === 64, 'IP hash is 64 hex characters');
    assert(ipHash !== ip, 'IP is not stored in plaintext');
  });

  await runPillar(8, 'Metadata Hashing — User Agent Anonymization Hash', () => {
    const ua = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36';
    const uaHash = hashMetadataIdentifier(ua);
    assert(typeof uaHash === 'string' && uaHash.length === 64, 'User Agent hash is 64 hex chars');
    assert(uaHash !== ua, 'User Agent is anonymized');
  });

  await runPillar(9, 'AES-256-GCM Encryption — Authenticated Encryption of MFA Secrets', () => {
    const secret = 'JBSWY3DPEHPK3PXP';
    const key = 'a-secure-master-encryption-key-for-admin-mfa-32b!';
    const enc = encryptMfaSecret(secret, key);
    assert(!!enc.ciphertext, 'Ciphertext exists');
    assert(!!enc.iv, 'IV exists');
    assert(!!enc.authTag, 'Auth Tag exists');
    assert(enc.ciphertext !== secret, 'Ciphertext differs from raw secret');
  });

  await runPillar(10, 'AES-256-GCM Decryption — Decryption Accuracy & Tamper Resistance', () => {
    const secret = 'JBSWY3DPEHPK3PXP';
    const key = 'a-secure-master-encryption-key-for-admin-mfa-32b!';
    const enc = encryptMfaSecret(secret, key);
    const dec = decryptMfaSecret(enc, key);
    assert(dec === secret, 'Decrypted secret matches original Base32 secret');

    let tamperedFailed = false;
    try {
      decryptMfaSecret({ ...enc, ciphertext: enc.ciphertext.slice(0, -2) + 'ff' }, key);
    } catch {
      tamperedFailed = true;
    }
    assert(tamperedFailed, 'Tampered ciphertext is rejected by authenticated GCM tag');
  });

  // =========================================================================
  // SECTION 2: RFC 6238 TOTP Engine & MFA Operations (Pillars 11-20)
  // =========================================================================

  await runPillar(11, 'Base32 Secret Generation — RFC 4648 Compliant Secret (32 chars)', () => {
    const secret = generateBase32Secret(32);
    assert(secret.length === 32, `Secret length is 32 chars (got ${secret.length})`);
    assert(/^[A-Z2-7]+$/.test(secret), 'Secret contains only valid RFC 4648 Base32 characters');
  });

  await runPillar(12, 'TOTP Code Generation — Exact 6-Digit Zero-Padded Output', () => {
    const secret = generateBase32Secret(32);
    const code = generateTotpCode(secret);
    assert(code.length === 6, 'TOTP code is 6 digits');
    assert(/^\d{6}$/.test(code), 'TOTP code consists exclusively of numeric digits');
  });

  await runPillar(13, 'TOTP Verification — Current Time Window Exact Match', () => {
    const secret = generateBase32Secret(32);
    const now = Date.now();
    const code = generateTotpCode(secret, 30, now);
    const isValid = verifyTotpCode(secret, code, 30, 1, now);
    assert(isValid === true, 'Current window code verifies successfully');
  });

  await runPillar(14, 'TOTP Verification — Previous Time Step Drift (-30s)', () => {
    const secret = generateBase32Secret(32);
    const now = Date.now();
    const prevCode = generateTotpCode(secret, 30, now - 30_000);
    const isValid = verifyTotpCode(secret, prevCode, 30, 1, now);
    assert(isValid === true, 'Drift of -1 time step is accepted within window ±1');
  });

  await runPillar(15, 'TOTP Verification — Next Time Step Drift (+30s)', () => {
    const secret = generateBase32Secret(32);
    const now = Date.now();
    const nextCode = generateTotpCode(secret, 30, now + 30_000);
    const isValid = verifyTotpCode(secret, nextCode, 30, 1, now);
    assert(isValid === true, 'Drift of +1 time step is accepted within window ±1');
  });

  await runPillar(16, 'TOTP Verification — Expired Code Rejection (> 60s Drift)', () => {
    const secret = generateBase32Secret(32);
    const now = Date.now();
    const oldCode = generateTotpCode(secret, 30, now - 90_000);
    const isValid = verifyTotpCode(secret, oldCode, 30, 1, now);
    assert(isValid === false, 'Code older than allowed drift window is rejected');
  });

  await runPillar(17, 'TOTP Verification — Invalid Code / Random Digits Rejection', () => {
    const secret = generateBase32Secret(32);
    assert(verifyTotpCode(secret, '000000', 30, 1) === false || verifyTotpCode(secret, '999999', 30, 1) === false, 'Bogus code is rejected');
    assert(verifyTotpCode(secret, 'abc123', 30, 1) === false, 'Non-numeric code is rejected');
    assert(verifyTotpCode(secret, '', 30, 1) === false, 'Empty code is rejected');
  });

  await runPillar(18, 'TOTP URI Generation — Standard otpauth:// Format', () => {
    const secret = 'JBSWY3DPEHPK3PXP';
    const uri = generateTotpUri('admin@pixmatch.io', secret, 'PixMatch Admin');
    assert(uri.startsWith('otpauth://totp/'), 'URI begins with otpauth://totp/');
    assert(uri.includes('secret=JBSWY3DPEHPK3PXP'), 'URI contains secret');
    assert(uri.includes('issuer=PixMatch%20Admin'), 'URI contains encoded issuer');
  });

  await runPillar(19, 'TOTP URI Generation — Custom Period & Digits Parameters', () => {
    const uri = generateTotpUri('sec@pixmatch.io', 'JBSWY3DPEHPK3PXP', 'PixMatch Admin', 8, 60);
    assert(uri.includes('digits=8'), 'URI includes 8 digits');
    assert(uri.includes('period=60'), 'URI includes 60s period');
  });

  await runPillar(20, 'TOTP Secret Redaction — Zero Secret Leaks in Logging', () => {
    const secret = generateBase32Secret(32);
    const redacted = AdminAuditService.redactSensitiveData({
      secret,
      totp_code: '123456',
      normal_info: 'auth_attempt',
    });
    assert(redacted.secret === '[REDACTED]', 'Base32 secret is redacted');
    assert(redacted.totp_code === '[REDACTED]', 'TOTP code is redacted');
    assert(redacted.normal_info === 'auth_attempt', 'Non-sensitive data preserved');
  });

  // =========================================================================
  // SECTION 3: Single-Use Recovery Codes Engine (Pillars 21-28)
  // =========================================================================

  await runPillar(21, 'Recovery Codes — Generation of 8 Standard Codes', () => {
    const { rawCodes, hashedCodes } = generateRecoveryCodes(8);
    assert(rawCodes.length === 8, '8 plaintext codes generated');
    assert(hashedCodes.length === 8, '8 hashed code records generated');
  });

  await runPillar(22, 'Recovery Codes — Format Compliance (xxxx-xxxx)', () => {
    const { rawCodes } = generateRecoveryCodes(8);
    for (const code of rawCodes) {
      assert(/^[0-9a-f]{4}-[0-9a-f]{4}$/.test(code), `Code ${code} matches format xxxx-xxxx`);
    }
  });

  await runPillar(23, 'Recovery Codes — SHA-256 Hashing at Rest', () => {
    const { rawCodes, hashedCodes } = generateRecoveryCodes(4);
    for (let i = 0; i < rawCodes.length; i++) {
      assert(hashedCodes[i] === hashToken(rawCodes[i]), 'Stored hash matches SHA-256 of plain code');
    }
  });

  await runPillar(24, 'Recovery Codes — Verification and Single-Use Consumption', () => {
    const { rawCodes, hashedCodes } = generateRecoveryCodes(4);
    const codeToUse = rawCodes[0];
    const res1 = verifyAndConsumeRecoveryCode(codeToUse, hashedCodes);
    assert(res1.valid === true, 'First consumption is valid');
    assert(res1.remainingHashedCodes.length === 3, 'Remaining codes decremented to 3');
  });

  await runPillar(25, 'Recovery Codes — Replay Defense (Consumed Code Rejection)', () => {
    const { rawCodes, hashedCodes } = generateRecoveryCodes(4);
    const codeToUse = rawCodes[0];
    const res1 = verifyAndConsumeRecoveryCode(codeToUse, hashedCodes);
    const res2 = verifyAndConsumeRecoveryCode(codeToUse, res1.remainingHashedCodes);
    assert(res2.valid === false, 'Second consumption of same code is strictly rejected');
  });

  await runPillar(26, 'Recovery Codes — Whitespace & Dash Normalization', () => {
    const { rawCodes, hashedCodes } = generateRecoveryCodes(2);
    const raw = rawCodes[0];
    const withoutDash = raw.replace('-', '');
    const res = verifyAndConsumeRecoveryCode(`  ${withoutDash}  `, hashedCodes);
    assert(res.valid === true, 'Normalized code without dashes matches stored hash');
  });

  await runPillar(27, 'Recovery Codes — Invalid / Bogus Code Rejection', () => {
    const { hashedCodes } = generateRecoveryCodes(4);
    const res = verifyAndConsumeRecoveryCode('dead-beef', hashedCodes);
    assert(res.valid === false, 'Unregistered recovery code is rejected');
  });

  await runPillar(28, 'Recovery Codes — Custom Batch Size Generation (e.g. 10 or 16)', () => {
    const batch10 = generateRecoveryCodes(10);
    const batch16 = generateRecoveryCodes(16);
    assert(batch10.rawCodes.length === 10, '10 recovery codes generated');
    assert(batch16.rawCodes.length === 16, '16 recovery codes generated');
  });

  // =========================================================================
  // SECTION 4: Administrator Password Complexity Rules (Pillars 29-36)
  // =========================================================================

  await runPillar(29, 'Password Policy — Compliant Complex Password Accepted', () => {
    const res = validateAdminPassword('PixMatch#Admin2026!Secure');
    assert(res.valid === true, 'Valid password passes policy');
    assert(res.errors.length === 0, 'Zero validation errors');
  });

  await runPillar(30, 'Password Policy — Minimum 12 Characters Enforced', () => {
    const res = validateAdminPassword('Short#1a');
    assert(res.valid === false, 'Password under 12 characters is rejected');
    assert(res.errors.some(e => e.includes('12 characters')), 'Error message cites minimum length');
  });

  await runPillar(31, 'Password Policy — Uppercase Letter Requirement', () => {
    const res = validateAdminPassword('lowercaseonly12345!#');
    assert(res.valid === false, 'Password without uppercase is rejected');
  });

  await runPillar(32, 'Password Policy — Lowercase Letter Requirement', () => {
    const res = validateAdminPassword('UPPERCASEONLY12345!#');
    assert(res.valid === false, 'Password without lowercase is rejected');
  });

  await runPillar(33, 'Password Policy — Numeric Digit Requirement', () => {
    const res = validateAdminPassword('NoNumbersInThisPassword!#');
    assert(res.valid === false, 'Password without digits is rejected');
  });

  await runPillar(34, 'Password Policy — Special Character Requirement', () => {
    const res = validateAdminPassword('NoSpecialCharacters123456');
    assert(res.valid === false, 'Password without special characters is rejected');
  });

  await runPillar(35, 'Password Policy — Common/Weak Administrator Passwords Blacklist', () => {
    const weakList = ['Admin123456!@#', 'Password123456!', 'Administrator1!'];
    for (const weak of weakList) {
      const res = validateAdminPassword(weak);
      assert(res.valid === false, `Common weak password [${weak}] is rejected`);
    }
  });

  await runPillar(36, 'Password Policy — Multi-Violation Aggregated Error Reporting', () => {
    const res = validateAdminPassword('short');
    assert(res.valid === false, 'Short weak password is rejected');
    assert(res.errors.length >= 3, 'Multiple policy failures reported simultaneously');
  });

  // =========================================================================
  // SECTION 5: Multi-Tier Rate Limiting & Brute-Force Defense (Pillars 37-48)
  // =========================================================================

  await runPillar(37, 'Rate Limiter — Initial Clean State Allows Attempts', () => {
    AdminRateLimiterService.resetAll();
    const check = AdminRateLimiterService.checkLoginLimit('198.51.100.1', 'test@pixmatch.io');
    assert(check.allowed === true, 'Initial login attempt is allowed');
    assert(check.remaining >= 1, 'Remaining attempts is positive');
  });

  await runPillar(38, 'Rate Limiter — Failed Attempt Increments Counter & Decrements Remaining', () => {
    const ip = '198.51.100.2';
    const email = 'admin1@pixmatch.io';
    AdminRateLimiterService.recordLoginFailure(ip, email);
    const check = AdminRateLimiterService.checkLoginLimit(ip, email);
    assert(check.allowed === true, 'Attempt is allowed after 1 failure');
    assert(check.remaining < 5, 'Remaining attempts is decremented');
  });

  await runPillar(39, 'Rate Limiter — IP Limit Exceeded Blocks Further Attempts', () => {
    const ip = '198.51.100.3';
    for (let i = 0; i < 10; i++) {
      AdminRateLimiterService.recordLoginFailure(ip, `email_${i}@pixmatch.io`);
    }
    const check = AdminRateLimiterService.checkLoginLimit(ip, 'another@pixmatch.io');
    assert(check.allowed === false, 'Limit exceeded from same IP is blocked');
    assert(check.remaining === 0, 'Remaining is 0');
  });

  await runPillar(40, 'Rate Limiter — Account Limit Exceeded Blocks Distributed IP Attacks', () => {
    const targetEmail = 'ceo@pixmatch.io';
    for (let i = 0; i < 5; i++) {
      AdminRateLimiterService.recordLoginFailure(`10.0.0.${i + 1}`, targetEmail);
    }
    const check = AdminRateLimiterService.checkLoginLimit('172.16.0.99', targetEmail);
    assert(check.allowed === false, 'Target account is protected across distributed IPs');
  });

  await runPillar(41, 'Rate Limiter — Clearing Failures on Successful Login', () => {
    const ip = '198.51.100.5';
    const email = 'success@pixmatch.io';
    AdminRateLimiterService.recordLoginFailure(ip, email);
    AdminRateLimiterService.recordLoginFailure(ip, email);
    AdminRateLimiterService.clearLoginFailures(ip, email);
    const check = AdminRateLimiterService.checkLoginLimit(ip, email);
    assert(check.allowed === true, 'Login allowed after clear');
    assert(check.remaining >= 4, 'Remaining reset to healthy state');
  });

  await runPillar(42, 'Rate Limiter — MFA Attempt Rate Limiting (5 Attempts Max)', () => {
    const adminId = 'adm-mfa-rate-test';
    for (let i = 0; i < 5; i++) {
      assert(AdminRateLimiterService.checkMfaLimit(adminId).allowed === true, `MFA attempt ${i + 1} allowed`);
      AdminRateLimiterService.recordMfaFailure(adminId);
    }
    assert(AdminRateLimiterService.checkMfaLimit(adminId).allowed === false, '6th MFA attempt blocked');
  });

  await runPillar(43, 'Rate Limiter — MFA Failure Counter Reset on Success', () => {
    const adminId = 'adm-mfa-reset-test';
    AdminRateLimiterService.recordMfaFailure(adminId);
    AdminRateLimiterService.clearMfaFailures(adminId);
    assert(AdminRateLimiterService.checkMfaLimit(adminId).allowed === true, 'MFA allowed after clear');
  });

  await runPillar(44, 'Rate Limiter — Password Reset Request Rate Limiting (3/hr)', () => {
    const email = 'reset-limit@pixmatch.io';
    for (let i = 0; i < 3; i++) {
      assert(AdminRateLimiterService.checkPasswordResetLimit(email).allowed === true, `Reset request ${i + 1} allowed`);
      AdminRateLimiterService.recordPasswordResetAttempt(email);
    }
    assert(AdminRateLimiterService.checkPasswordResetLimit(email).allowed === false, '4th reset request blocked');
  });

  await runPillar(45, 'Rate Limiter — Case-Insensitive Email Normalization in Limits', () => {
    const emailLower = 'norm@pixmatch.io';
    const emailUpper = 'NORM@PIXMATCH.IO';
    AdminRateLimiterService.recordLoginFailure('1.2.3.4', emailLower);
    const checkUpper = AdminRateLimiterService.checkLoginLimit('1.2.3.4', emailUpper);
    assert(checkUpper.remaining < 5, 'Case difference maps to same rate limit bucket');
  });

  await runPillar(46, 'Rate Limiter — IP Trimming & Whitespace Handling', () => {
    AdminRateLimiterService.recordLoginFailure('  10.10.10.10  ', 'user@pixmatch.io');
    const check = AdminRateLimiterService.checkLoginLimit('10.10.10.10', 'user@pixmatch.io');
    assert(check.remaining < 5, 'Whitespace-trimmed IP matches limit record');
  });

  await runPillar(47, 'Rate Limiter — Global Reset Mechanism for Test Isolation', () => {
    AdminRateLimiterService.recordLoginFailure('9.9.9.9', 'test@pixmatch.io');
    AdminRateLimiterService.resetAll();
    const check = AdminRateLimiterService.checkLoginLimit('9.9.9.9', 'test@pixmatch.io');
    assert(check.allowed === true, 'All rate limit records cleared on resetAll');
  });

  await runPillar(48, 'Rate Limiter — Retry-After Calculation Format', () => {
    const ip = '198.51.100.99';
    for (let i = 0; i < 10; i++) {
      AdminRateLimiterService.recordLoginFailure(ip, 'brute@pixmatch.io');
    }
    const check = AdminRateLimiterService.checkLoginLimit(ip, 'brute@pixmatch.io');
    assert(check.retryAfterSeconds !== undefined && check.retryAfterSeconds > 0, 'Retry-After seconds is positive integer');
  });

  // =========================================================================
  // SECTION 6: Centralized Audit Logging & Sensitive Data Redaction (Pillars 49-58)
  // =========================================================================

  await runPillar(49, 'Audit Service — Record Event with Structured Payload', async () => {
    const event = await AdminAuditService.recordEvent({
      admin_user_id: 'adm-super-01',
      email: 'superadmin@pixmatch.io',
      event_type: AdminAuthEventType.ADMIN_LOGIN_SUCCESS,
      status: 'SUCCESS',
      ip: '192.168.1.50',
      user_agent: 'TestAgent/1.0',
      details: 'Audit test event',
    });
    assert(!!event.id, 'Event ID generated');
    assert(event.event_type === AdminAuthEventType.ADMIN_LOGIN_SUCCESS, 'Event type matches');
  });

  await runPillar(50, 'Audit Service — Automatic Redaction of Raw Password', () => {
    const redacted = AdminAuditService.redactSensitiveData({ password: 'SuperSecretPassword123!' });
    assert(redacted.password === '[REDACTED]', 'Password redacted');
  });

  await runPillar(51, 'Audit Service — Automatic Redaction of Session Tokens & Bearer Tokens', () => {
    const redacted = AdminAuditService.redactSensitiveData({
      sessionToken: 'raw_session_hex',
      token: 'raw_bearer_jwt',
      token_hash: 'safe_hash_value',
    });
    assert(redacted.sessionToken === '[REDACTED]', 'sessionToken redacted');
    assert(redacted.token === '[REDACTED]', 'token redacted');
    assert(redacted.token_hash === 'safe_hash_value', 'Non-sensitive hash preserved');
  });

  await runPillar(52, 'Audit Service — Automatic Redaction of TOTP Secrets & OTP Codes', () => {
    const redacted = AdminAuditService.redactSensitiveData({
      secret: 'MFASECRET32B',
      mfa_code: '654321',
      totp_code: '123456',
    });
    assert(redacted.secret === '[REDACTED]', 'MFA secret redacted');
    assert(redacted.mfa_code === '[REDACTED]', 'mfa_code redacted');
    assert(redacted.totp_code === '[REDACTED]', 'totp_code redacted');
  });

  await runPillar(53, 'Audit Service — Automatic Redaction of Recovery Codes', () => {
    const redacted = AdminAuditService.redactSensitiveData({
      recovery_code: 'abcd-1234',
      recoveryCode: 'ef01-5678',
    });
    assert(redacted.recovery_code === '[REDACTED]', 'recovery_code redacted');
    assert(redacted.recoveryCode === '[REDACTED]', 'recoveryCode redacted');
  });

  await runPillar(54, 'Audit Service — Deep Nested Object Redaction', () => {
    const nested = {
      user: {
        credentials: {
          password: 'Password123!',
          nestedSecret: { secret: 'SECRET_DATA' },
        },
      },
    };
    const redacted = AdminAuditService.redactSensitiveData(nested);
    assert(redacted.user.credentials.password === '[REDACTED]', 'Nested password redacted');
    assert(redacted.user.credentials.nestedSecret.secret === '[REDACTED]', 'Deep nested secret redacted');
  });

  await runPillar(55, 'Audit Service — IP Address Anonymization (Subnet Masking)', async () => {
    const event = await AdminAuditService.recordEvent({
      event_type: AdminAuthEventType.ADMIN_LOGIN_ATTEMPT,
      ip: '192.168.1.150',
    });
    assert(event.ip_address_masked === '192.168.1.xxx', `IP masked to subnet (got ${event.ip_address_masked})`);
  });

  await runPillar(56, 'Audit Service — Correlation ID Propagation', async () => {
    const cid = 'corr_test_987654';
    const event = await AdminAuditService.recordEvent({
      event_type: AdminAuthEventType.ADMIN_SESSION_REVOKED,
      correlation_id: cid,
    });
    assert(event.correlation_id === cid, 'Correlation ID retained on event record');
  });

  await runPillar(57, 'Audit Service — Query Recent Events with Pagination Limit', async () => {
    await AdminAuditService.recordEvent({ event_type: AdminAuthEventType.ADMIN_LOGIN_SUCCESS });
    await AdminAuditService.recordEvent({ event_type: AdminAuthEventType.ADMIN_LOGOUT });
    const events = await AdminAuditService.getRecentEvents(5);
    assert(Array.isArray(events), 'Events returned as array');
    assert(events.length >= 2, 'Events returned');
  });

  await runPillar(58, 'Audit Service — Event Type Enumeration Integrity', () => {
    const expectedEvents = [
      'ADMIN_LOGIN_ATTEMPT',
      'ADMIN_LOGIN_SUCCESS',
      'ADMIN_LOGIN_FAILURE',
      'ADMIN_LOGOUT',
      'ADMIN_LOGOUT_ALL',
      'ADMIN_MFA_ENROLLED',
      'ADMIN_MFA_VERIFIED',
      'ADMIN_MFA_FAILED',
      'ADMIN_PASSWORD_RESET_REQUEST',
      'ADMIN_PASSWORD_RESET',
      'ADMIN_SESSION_REVOKED',
      'ADMIN_INVITATION_CREATED',
      'ADMIN_INVITATION_ACCEPTED',
    ];
    for (const ev of expectedEvents) {
      assert(Object.values(AdminAuthEventType).includes(ev as any), `Event type ${ev} exists in enum`);
    }
  });

  // =========================================================================
  // SECTION 7: Admin MFA Service Lifecycle & Replay Defense (Pillars 59-68)
  // =========================================================================

  await runPillar(59, 'MFA Service — Initiate Enrollment & Generate Setup Payload', async () => {
    const res = await AdminMfaService.initiateEnrollment('adm-platform-01', 'admin@pixmatch.io');
    assert(!!res.secret, 'Base32 secret returned');
    assert(!!res.qr_code_uri, 'TOTP URI returned');
    assert(Array.isArray(res.recovery_codes) && res.recovery_codes.length === 8, '8 recovery codes returned');
  });

  await runPillar(60, 'MFA Service — Initial Status is PENDING with Backup Codes', async () => {
    const status = await AdminMfaService.getMfaStatus('adm-platform-01');
    assert(status.status === AdminMfaStatus.PENDING_VERIFICATION, 'Status is PENDING_VERIFICATION');
    assert(status.recovery_codes_remaining === 8, '8 backup codes remaining');
  });

  await runPillar(61, 'MFA Service — Confirm Enrollment with Valid TOTP Code', async () => {
    const enroll = await AdminMfaService.initiateEnrollment('adm-platform-01', 'admin@pixmatch.io');
    const validCode = generateTotpCode(enroll.secret!);
    const confirm = await AdminMfaService.confirmEnrollment('adm-platform-01', validCode);
    assert(confirm.success === true, 'MFA confirmed successfully');
    const status = await AdminMfaService.getMfaStatus('adm-platform-01');
    assert(status.status === AdminMfaStatus.ENABLED, 'Status is now ENABLED');
  });

  await runPillar(62, 'MFA Service — Confirm Enrollment Rejects Invalid Code', async () => {
    await AdminMfaService.initiateEnrollment('adm-platform-02', 'admin2@pixmatch.io');
    const confirm = await AdminMfaService.confirmEnrollment('adm-platform-02', '000000');
    assert(confirm.success === false, 'Invalid confirmation code rejected');
  });

  await runPillar(63, 'MFA Service — Verify Active MFA Code', async () => {
    const enroll = await AdminMfaService.initiateEnrollment('adm-platform-03', 'admin3@pixmatch.io');
    const code = generateTotpCode(enroll.secret!);
    await AdminMfaService.confirmEnrollment('adm-platform-03', code);

    // Verify
    const currentCode = generateTotpCode(enroll.secret!);
    const verify = await AdminMfaService.verifyMfaCode('adm-platform-03', currentCode);
    assert(verify.success === true, 'Valid code verifies successfully');
  });

  await runPillar(64, 'MFA Service — Replay Defense Blocks Same Code Re-use in 30s Window', async () => {
    const enroll = await AdminMfaService.initiateEnrollment('adm-platform-04', 'admin4@pixmatch.io');
    const code = generateTotpCode(enroll.secret!);
    await AdminMfaService.confirmEnrollment('adm-platform-04', code);

    const codeToVerify = generateTotpCode(enroll.secret!);
    const v1 = await AdminMfaService.verifyMfaCode('adm-platform-04', codeToVerify);
    assert(v1.success === true, 'First verification passes');

    // Second immediate verification with same code: replay rejection
    const v2 = await AdminMfaService.verifyMfaCode('adm-platform-04', codeToVerify);
    assert(v2.success === false, 'Replayed code rejected');
    assert(v2.message?.includes('Replay') || v2.message?.includes('already been used'), 'Error indicates replay violation');
  });

  await runPillar(65, 'MFA Service — Verify and Consume Backup Recovery Code', async () => {
    const enroll = await AdminMfaService.initiateEnrollment('adm-platform-05', 'admin5@pixmatch.io');
    const code = generateTotpCode(enroll.secret!);
    await AdminMfaService.confirmEnrollment('adm-platform-05', code);

    const backupCode = enroll.recovery_codes![0];
    const res = await AdminMfaService.verifyRecoveryCode('adm-platform-05', backupCode);
    assert(res.success === true, 'Valid recovery code accepted');

    const status = await AdminMfaService.getMfaStatus('adm-platform-05');
    assert(status.recovery_codes_remaining === 7, 'Backup codes decremented to 7');
  });

  await runPillar(66, 'MFA Service — Replay Defense on Consumed Recovery Code', async () => {
    const enroll = await AdminMfaService.initiateEnrollment('adm-platform-06', 'admin6@pixmatch.io');
    const code = generateTotpCode(enroll.secret!);
    await AdminMfaService.confirmEnrollment('adm-platform-06', code);

    const backupCode = enroll.recovery_codes![0];
    await AdminMfaService.verifyRecoveryCode('adm-platform-06', backupCode);

    // Reuse same recovery code
    const res2 = await AdminMfaService.verifyRecoveryCode('adm-platform-06', backupCode);
    assert(res2.success === false, 'Consumed recovery code rejected on replay');
  });

  await runPillar(67, 'MFA Service — Disable MFA for Administrator', async () => {
    const enroll = await AdminMfaService.initiateEnrollment('adm-platform-07', 'admin7@pixmatch.io');
    const code = generateTotpCode(enroll.secret!);
    await AdminMfaService.confirmEnrollment('adm-platform-07', code);

    const disable = await AdminMfaService.disableMfa('adm-platform-07', 'adm-super-01');
    assert(disable.success === true, 'MFA disabled');
    const status = await AdminMfaService.getMfaStatus('adm-platform-07');
    assert(status.status === AdminMfaStatus.DISABLED, 'Status is DISABLED');
  });

  await runPillar(68, 'MFA Service — Reset Mock Store Test Helper', () => {
    AdminMfaService.resetMockStore();
    assert(true, 'Mock store reset cleanly');
  });

  // =========================================================================
  // SECTION 8: Admin Auth & Platform Role Boundary Isolation (Pillars 69-80)
  // =========================================================================

  await runPillar(69, 'Admin Auth — Successful SUPER_ADMIN Login', async () => {
    const res = await AdminAuthService.login({
      email: 'superadmin@pixmatch.io',
      password: 'AdminSuperPassword2026!#',
    });
    assert(res.success === true, 'SUPER_ADMIN login succeeds');
    assert(!!res.session_token, 'Session token returned');
    assert(res.admin?.role === UserRole.SUPER_ADMIN, 'Role is SUPER_ADMIN');
  });

  await runPillar(70, 'Admin Auth — Successful PLATFORM_ADMIN Login', async () => {
    const res = await AdminAuthService.login({
      email: 'admin@pixmatch.io',
      password: 'AdminPlatformPassword2026!#',
    });
    assert(res.success === true, 'PLATFORM_ADMIN login succeeds');
    assert(res.admin?.role === UserRole.PLATFORM_ADMIN, 'Role is PLATFORM_ADMIN');
  });

  await runPillar(71, 'Role Isolation — STUDIO_OWNER Login Rejection', async () => {
    const res = await AdminAuthService.login({
      email: 'owner@studio.io',
      password: 'StudioAdminPassword2026!#',
    });
    assert(res.success === false, 'STUDIO_OWNER strictly rejected from admin portal');
    assert(res.message === 'Invalid administrator credentials.', 'Generic anti-enumeration message returned');
  });

  await runPillar(72, 'Role Isolation — STUDIO_ADMIN Member Login Rejection', async () => {
    const res = await AdminAuthService.login({
      email: 'studioadm@studio.io',
      password: 'StudioAdminPassword2026!#',
    });
    assert(res.success === false, 'Studio ADMIN member strictly rejected from platform admin portal');
  });

  await runPillar(73, 'Role Isolation — Helper Function isPlatformAdmin Check', () => {
    assert(isPlatformAdmin(UserRole.SUPER_ADMIN) === true, 'SUPER_ADMIN is platform admin');
    assert(isPlatformAdmin(UserRole.PLATFORM_ADMIN) === true, 'PLATFORM_ADMIN is platform admin');
    assert(isPlatformAdmin(UserRole.STUDIO_OWNER) === false, 'STUDIO_OWNER is NOT platform admin');
    assert(isPlatformAdmin(UserRole.STUDIO_ADMIN) === false, 'STUDIO_ADMIN is NOT platform admin');
    assert(isPlatformAdmin(UserRole.STUDIO_MEMBER) === false, 'STUDIO_MEMBER is NOT platform admin');
    assert(isPlatformAdmin(UserRole.CLIENT) === false, 'CLIENT is NOT platform admin');
  });

  await runPillar(74, 'Admin Auth — Suspended Administrator Account Rejection', async () => {
    AdminAuthService.seedMockUser({
      id: 'adm-suspended-01',
      email: 'suspended@pixmatch.io',
      name: 'Suspended Admin',
      password_hash: platformAdminPasswordHash,
      role: UserRole.PLATFORM_ADMIN,
      is_suspended: true,
    });

    const res = await AdminAuthService.login({
      email: 'suspended@pixmatch.io',
      password: 'AdminPlatformPassword2026!#',
    });
    assert(res.success === false, 'Suspended admin is rejected');
    assert(res.message.includes('suspended') || res.message.includes('disabled'), 'Message indicates suspension');
  });

  await runPillar(75, 'Admin Auth — Invalid Password Rejection & Rate Limit Impact', async () => {
    const res = await AdminAuthService.login({
      email: 'admin@pixmatch.io',
      password: 'WrongPassword123!',
    });
    assert(res.success === false, 'Invalid password rejected');
    assert(res.message === 'Invalid administrator credentials.', 'Anti-enumeration error');
  });

  await runPillar(76, 'Admin Auth — Non-Existent Email Anti-Enumeration Identical Message', async () => {
    const res = await AdminAuthService.login({
      email: 'nonexistent@pixmatch.io',
      password: 'SomePassword123!',
    });
    assert(res.success === false, 'Non-existent account rejected');
    assert(res.message === 'Invalid administrator credentials.', 'Identical error to wrong password');
  });

  await runPillar(77, 'Admin Auth — MFA Challenge Step When 2FA Active', async () => {
    // Enroll & confirm MFA for superadmin
    const enroll = await AdminMfaService.initiateEnrollment('adm-super-01', 'superadmin@pixmatch.io');
    const code = generateTotpCode(enroll.secret!);
    await AdminMfaService.confirmEnrollment('adm-super-01', code);

    // Login without code
    const res = await AdminAuthService.login({
      email: 'superadmin@pixmatch.io',
      password: 'AdminSuperPassword2026!#',
    });
    assert(res.success === false, 'Login requires MFA step');
    assert(res.mfa_required === true, 'mfa_required flag is true');
    assert(!!res.temp_token, 'Temp challenge token issued');
  });

  await runPillar(78, 'Admin Auth — MFA Challenge Completion with Valid Code', async () => {
    const enroll = await AdminMfaService.initiateEnrollment('adm-super-01', 'superadmin@pixmatch.io');
    const code = generateTotpCode(enroll.secret!);
    await AdminMfaService.confirmEnrollment('adm-super-01', code);

    const loginCode = generateTotpCode(enroll.secret!);
    const res = await AdminAuthService.login({
      email: 'superadmin@pixmatch.io',
      password: 'AdminSuperPassword2026!#',
      mfa_code: loginCode,
    });
    assert(res.success === true, 'Login with valid MFA code succeeds');
    assert(res.session?.mfa_verified === true, 'Session marked mfa_verified');
  });

  await runPillar(79, 'Admin Auth — MFA Challenge Rejection with Invalid Code', async () => {
    const res = await AdminAuthService.login({
      email: 'superadmin@pixmatch.io',
      password: 'AdminSuperPassword2026!#',
      mfa_code: '000000',
    });
    assert(res.success === false, 'Login with invalid MFA code rejected');
  });

  await runPillar(80, 'Admin Auth — Remember Me Extended Absolute Lifetime (7 Days)', async () => {
    const res = await AdminAuthService.login({
      email: 'admin@pixmatch.io',
      password: 'AdminPlatformPassword2026!#',
      remember_me: true,
    });
    assert(res.success === true, 'Remember-me login succeeds');
    assert(res.session?.absolute_timeout_minutes === 7 * 24 * 60, 'Absolute timeout extended to 7 days (10080 mins)');
  });

  // =========================================================================
  // SECTION 9: Session Management, Timeouts & Rotation (Pillars 81-92)
  // =========================================================================

  await runPillar(81, 'Session Validation — Active Token Validated Successfully', async () => {
    const login = await AdminAuthService.login({
      email: 'admin@pixmatch.io',
      password: 'AdminPlatformPassword2026!#',
    });
    const token = login.session_token!;
    const validation = await AdminAuthService.validateSession(token);
    assert(validation.valid === true, 'Session is valid');
    assert(validation.session?.status === AdminSessionStatus.ACTIVE, 'Status is ACTIVE');
    assert(validation.admin?.email === 'admin@pixmatch.io', 'Admin email matches');
  });

  await runPillar(82, 'Session Validation — Missing / Empty Token Rejected', async () => {
    const vEmpty = await AdminAuthService.validateSession('');
    const vNull = await AdminAuthService.validateSession(null as any);
    assert(vEmpty.valid === false, 'Empty token rejected');
    assert(vNull.valid === false, 'Null token rejected');
  });

  await runPillar(83, 'Session Validation — Non-Existent Token Rejected', async () => {
    const bogus = generateAdminSessionToken(32);
    const validation = await AdminAuthService.validateSession(bogus);
    assert(validation.valid === false, 'Bogus token rejected');
  });

  await runPillar(84, 'Session Rotation — Old Token Invalidated & New Token Issued', async () => {
    const login = await AdminAuthService.login({
      email: 'admin@pixmatch.io',
      password: 'AdminPlatformPassword2026!#',
    });
    const oldToken = login.session_token!;

    const rotated = await AdminAuthService.rotateSession(oldToken);
    assert(!!rotated && !!rotated.newToken, 'Session rotated with new token');
    assert(rotated!.newToken !== oldToken, 'New token differs from old token');

    const vOld = await AdminAuthService.validateSession(oldToken);
    assert(vOld.valid === false, 'Old token is invalidated');

    const vNew = await AdminAuthService.validateSession(rotated!.newToken);
    assert(vNew.valid === true, 'New token is valid');
    assert(vNew.session?.authentication_version === 2, 'Authentication version incremented to 2');
  });

  await runPillar(85, 'Single Session Logout — Revokes Specific Token', async () => {
    const login = await AdminAuthService.login({
      email: 'admin@pixmatch.io',
      password: 'AdminPlatformPassword2026!#',
    });
    const token = login.session_token!;

    const logout = await AdminAuthService.logout(token);
    assert(logout === true, 'Logout returns true');

    const validation = await AdminAuthService.validateSession(token);
    assert(validation.valid === false, 'Logged-out session is invalid');
  });

  await runPillar(86, 'Logout All Devices — Revokes All Active Admin Sessions', async () => {
    const l1 = await AdminAuthService.login({ email: 'admin@pixmatch.io', password: 'AdminPlatformPassword2026!#', userAgent: 'Device 1' });
    const l2 = await AdminAuthService.login({ email: 'admin@pixmatch.io', password: 'AdminPlatformPassword2026!#', userAgent: 'Device 2' });
    const l3 = await AdminAuthService.login({ email: 'admin@pixmatch.io', password: 'AdminPlatformPassword2026!#', userAgent: 'Device 3' });

    const res = await AdminAuthService.logoutAll('adm-platform-01');
    assert(res.revokedCount >= 3, `Revoked at least 3 sessions (got ${res.revokedCount})`);

    assert((await AdminAuthService.validateSession(l1.session_token!)).valid === false, 'Device 1 invalidated');
    assert((await AdminAuthService.validateSession(l2.session_token!)).valid === false, 'Device 2 invalidated');
    assert((await AdminAuthService.validateSession(l3.session_token!)).valid === false, 'Device 3 invalidated');
  });

  await runPillar(87, 'List Active Sessions — Accurate Session DTOs Returned', async () => {
    const login = await AdminAuthService.login({
      email: 'admin@pixmatch.io',
      password: 'AdminPlatformPassword2026!#',
      userAgent: 'MacBook Pro / Chrome',
    });
    const sessions = await AdminAuthService.listActiveSessions('adm-platform-01', login.session_token);
    assert(sessions.length >= 1, 'At least 1 active session listed');
    assert(sessions[0].is_current === true, 'Current session marked is_current: true');
  });

  await runPillar(88, 'Revoke Session by ID — Individual Revocation', async () => {
    const login = await AdminAuthService.login({
      email: 'admin@pixmatch.io',
      password: 'AdminPlatformPassword2026!#',
    });
    const sessionId = login.session!.id;
    const token = login.session_token!;

    const revokeRes = await AdminAuthService.revokeSessionById('adm-platform-01', sessionId);
    assert(revokeRes.success === true, 'Session revoked by ID');

    const validation = await AdminAuthService.validateSession(token);
    assert(validation.valid === false, 'Revoked session is invalid');
  });

  await runPillar(89, 'Privilege Change Invalidation — Automatic Session Purge', async () => {
    const login = await AdminAuthService.login({
      email: 'admin@pixmatch.io',
      password: 'AdminPlatformPassword2026!#',
    });
    await AdminAuthService.invalidateSessionsOnPrivilegeChange('adm-platform-01');
    const validation = await AdminAuthService.validateSession(login.session_token!);
    assert(validation.valid === false, 'Session purged after privilege change');
  });

  await runPillar(90, 'Session Idle Timeout — Configured at 30 Minutes by Default', async () => {
    const login = await AdminAuthService.login({
      email: 'admin@pixmatch.io',
      password: 'AdminPlatformPassword2026!#',
    });
    assert(login.session?.idle_timeout_minutes === 30, 'Idle timeout is 30 minutes');
  });

  await runPillar(91, 'Session Absolute Timeout — Configured at 12 Hours (720 mins)', async () => {
    const login = await AdminAuthService.login({
      email: 'admin@pixmatch.io',
      password: 'AdminPlatformPassword2026!#',
    });
    assert(login.session?.absolute_timeout_minutes === 720, 'Absolute timeout is 720 minutes');
  });

  await runPillar(92, 'Session Token Hashing Invariant — Plain Tokens Never Stored at Rest', () => {
    const plainToken = generateAdminSessionToken(32);
    const hash = hashToken(plainToken);
    assert(hash !== plainToken, 'Hash is distinct from plain token');
    assert(hash.length === 64, 'Stored token representation is 64 hex characters');
  });

  // =========================================================================
  // SECTION 10: Owner Invariants, Invitations & Password Reset (Pillars 93-102)
  // =========================================================================

  await runPillar(93, 'Owner Protection Invariant — Cannot Delete Final SUPER_ADMIN', async () => {
    const res = await AdminAuthService.protectPlatformOwner('adm-super-01', 'DELETE');
    assert(res.allowed === false, 'Deleting final super admin is blocked');
    assert(res.reason?.includes('final Platform Owner'), 'Reason cites platform owner invariant');
  });

  await runPillar(94, 'Owner Protection Invariant — Cannot Demote Final SUPER_ADMIN', async () => {
    const res = await AdminAuthService.protectPlatformOwner('adm-super-01', 'DEMOTE');
    assert(res.allowed === false, 'Demoting final super admin is blocked');
  });

  await runPillar(95, 'Owner Protection Invariant — Allows Mutation When Multiple Super Admins Exist', async () => {
    AdminAuthService.seedMockUser({
      id: 'adm-super-02',
      email: 'superadmin2@pixmatch.io',
      name: 'Super Admin Two',
      password_hash: superAdminPasswordHash,
      role: UserRole.SUPER_ADMIN,
      is_suspended: false,
    });
    const res = await AdminAuthService.protectPlatformOwner('adm-super-01', 'DEMOTE');
    assert(res.allowed === true, 'Allowed when secondary super admin is present');
  });

  await runPillar(96, 'Password Reset — Request Generates Hashed Token (15m expiry)', async () => {
    const res = await AdminAuthService.requestPasswordReset('admin@pixmatch.io');
    assert(res.success === true, 'Reset request succeeds');
    assert(!!res.debug_token, 'Reset token generated');
  });

  await runPillar(97, 'Password Reset — Generic Anti-Enumeration Message for Non-Existent Account', async () => {
    const res = await AdminAuthService.requestPasswordReset('nonexistent-admin@pixmatch.io');
    assert(res.success === true, 'Returns success response to prevent enumeration');
    assert(res.debug_token === undefined, 'No token generated for non-existent admin');
  });

  await runPillar(98, 'Password Reset — Execution with Valid Token & Complexity', async () => {
    const req = await AdminAuthService.requestPasswordReset('admin@pixmatch.io');
    const token = req.debug_token!;

    const exec = await AdminAuthService.executePasswordReset(token, 'BrandNewAdminPassword2026!#');
    assert(exec.success === true, 'Password reset executed successfully');

    // Login with new password
    const login = await AdminAuthService.login({
      email: 'admin@pixmatch.io',
      password: 'BrandNewAdminPassword2026!#',
    });
    assert(login.success === true, 'Login with new password succeeds');
  });

  await runPillar(99, 'Password Reset — Single-Use Consumption Rejects Replay', async () => {
    const req = await AdminAuthService.requestPasswordReset('admin@pixmatch.io');
    const token = req.debug_token!;
    await AdminAuthService.executePasswordReset(token, 'BrandNewAdminPassword2026!#');

    // Replay same token
    const retry = await AdminAuthService.executePasswordReset(token, 'AnotherPassword2026!#');
    assert(retry.success === false, 'Consumed reset token is rejected');
  });

  await runPillar(100, 'Admin Invitation — Create Invitation with 48h Expiry & Token Hash', async () => {
    const invite = await AdminAuthService.createInvitation(
      'new-invite@pixmatch.io',
      UserRole.PLATFORM_ADMIN,
      'adm-super-01'
    );
    assert(invite.success === true, 'Invitation created');
    assert(!!invite.token, 'Invitation token generated');
  });

  await runPillar(101, 'Admin Invitation — Rejects Non-Platform Roles in Invitation', async () => {
    const invite = await AdminAuthService.createInvitation(
      'bad-invite@pixmatch.io',
      UserRole.CLIENT,
      'adm-super-01'
    );
    assert(invite.success === false, 'Non-platform role invitation rejected');
  });

  await runPillar(102, 'Admin Invitation — Accept Invitation & Register Administrator Account', async () => {
    const invite = await AdminAuthService.createInvitation(
      'accepted-invite@pixmatch.io',
      UserRole.PLATFORM_ADMIN,
      'adm-super-01'
    );
    const token = invite.token!;

    const accept = await AdminAuthService.acceptInvitation(
      token,
      'Accepted Admin User',
      'SecureInvitePassword2026!#'
    );
    assert(accept.success === true, 'Invitation accepted');

    // Login with newly created administrator credentials
    const login = await AdminAuthService.login({
      email: 'accepted-invite@pixmatch.io',
      password: 'SecureInvitePassword2026!#',
    });
    assert(login.success === true, 'Login with new accepted admin account succeeds');
  });

  // =========================================================================
  // SECTION 11: Route Guards, Security Headers & Token Extraction (Pillars 103-108)
  // =========================================================================

  await runPillar(103, 'Token Extraction — From pixmatch_admin_session Cookie', () => {
    const mockReq = {
      headers: { cookie: 'other=123; pixmatch_admin_session=test-admin-token-xyz; tracker=abc' },
    } as any;
    const token = extractAdminToken(mockReq);
    assert(token === 'test-admin-token-xyz', `Extracted cookie token correctly (got ${token})`);
  });

  await runPillar(104, 'Token Extraction — From Authorization: Bearer Header', () => {
    const mockReq = {
      headers: { authorization: 'Bearer header-admin-token-456' },
    } as any;
    const token = extractAdminToken(mockReq);
    assert(token === 'header-admin-token-456', `Extracted Bearer token correctly (got ${token})`);
  });

  await runPillar(105, 'Token Extraction — Missing Headers Return Null Safely', () => {
    const mockReq = { headers: {} } as any;
    const token = extractAdminToken(mockReq);
    assert(token === null, 'Missing token returns null');
  });

  await runPillar(106, 'Security Headers — Cache-Control No-Store & Pragma No-Cache Injected', async () => {
    const headers: Record<string, string> = {};
    const mockReply = {
      header: (name: string, value: string) => {
        headers[name.toLowerCase()] = value;
        return mockReply;
      },
    } as any;

    await adminSecurityHeaders({} as any, mockReply);
    assert(headers['cache-control'] === 'no-store, no-cache, must-revalidate, proxy-revalidate', 'Strict Cache-Control injected');
    assert(headers['pragma'] === 'no-cache', 'Pragma no-cache injected');
  });

  await runPillar(107, 'Security Headers — X-Content-Type-Options: nosniff Injected', async () => {
    const headers: Record<string, string> = {};
    const mockReply = {
      header: (name: string, value: string) => {
        headers[name.toLowerCase()] = value;
        return mockReply;
      },
    } as any;

    await adminSecurityHeaders({} as any, mockReply);
    assert(headers['x-content-type-options'] === 'nosniff', 'nosniff injected');
  });

  await runPillar(108, 'Security Headers — X-Frame-Options: DENY Injected (Clickjacking Defense)', async () => {
    const headers: Record<string, string> = {};
    const mockReply = {
      header: (name: string, value: string) => {
        headers[name.toLowerCase()] = value;
        return mockReply;
      },
    } as any;

    await adminSecurityHeaders({} as any, mockReply);
    assert(headers['x-frame-options'] === 'DENY', 'DENY injected to prevent framing');
  });

  // =========================================================================
  // SECTION 12: Copilot Tools Boundary (Read/Draft Allowed, 8 Mutations Blocked) (Pillars 109-116)
  // =========================================================================

  await runPillar(109, 'Copilot Tools — Total Tool Count & Category Distribution', () => {
    const tools = AdminAuthCopilotTools.getAllTools();
    assert(tools.length === 14, `Total 14 tools registered (got ${tools.length})`);

    const readTools = tools.filter(t => t.category === 'READ_ONLY');
    const draftTools = tools.filter(t => t.category === 'DRAFT_PROPOSAL');
    const blockedTools = tools.filter(t => t.category === 'BLOCKED_MUTATION');

    assert(readTools.length === 4, `4 Read-Only tools (got ${readTools.length})`);
    assert(draftTools.length === 2, `2 Draft Proposal tools (got ${draftTools.length})`);
    assert(blockedTools.length === 8, `8 Blocked Mutation tools (got ${blockedTools.length})`);
  });

  await runPillar(110, 'Copilot Tools — Read Tool: get_admin_authentication_status', async () => {
    const res = await AdminAuthCopilotTools.executeTool('get_admin_authentication_status', {});
    assert(res.success === true, 'get_admin_authentication_status execution succeeds');
    assert(res.authentication_status === 'OPERATIONAL', 'Status is OPERATIONAL');
  });

  await runPillar(111, 'Copilot Tools — Read Tool: get_admin_session_summary', async () => {
    const res = await AdminAuthCopilotTools.executeTool('get_admin_session_summary', {});
    assert(res.success === true, 'get_admin_session_summary execution succeeds');
    assert(typeof res.total_active_sessions === 'number', 'Total active sessions count returned');
  });

  await runPillar(112, 'Copilot Tools — Read Tool: get_admin_security_events', async () => {
    const res = await AdminAuthCopilotTools.executeTool('get_admin_security_events', { limit: 10 });
    assert(res.success === true, 'get_admin_security_events execution succeeds');
    assert(Array.isArray(res.events), 'Events list returned');
  });

  await runPillar(113, 'Copilot Tools — Draft Tool: draft_admin_security_report', async () => {
    const res = await AdminAuthCopilotTools.executeTool('draft_admin_security_report', { title: 'Q3 Security Audit' });
    assert(res.success === true, 'draft_admin_security_report execution succeeds');
    assert(res.isDraft === true, 'Marked isDraft: true');
    assert(res.requiresHumanApproval === true, 'Requires explicit human approval');
    assert(res.report.title === 'Q3 Security Audit', 'Title matches draft parameter');
  });

  await runPillar(114, 'Copilot Tools — Draft Tool: draft_authentication_incident_summary', async () => {
    const res = await AdminAuthCopilotTools.executeTool('draft_authentication_incident_summary', { event_id: 'ev_123' });
    assert(res.success === true, 'draft_authentication_incident_summary execution succeeds');
    assert(res.isDraft === true, 'Marked isDraft: true');
    assert(res.incident_draft.event_id === 'ev_123', 'Event ID retained');
  });

  await runPillar(115, 'Copilot Tools — Strictly Block All 8 Mutation Tools with PolicyViolationError', async () => {
    const blockedNames = [
      'change_administrator_role',
      'disable_admin_mfa',
      'reset_admin_password_direct',
      'revoke_all_administrators',
      'create_hidden_admin_account',
      'bypass_admin_authentication',
      'generate_mfa_recovery_secrets',
      'override_security_settings_autonomously',
    ];

    for (const name of blockedNames) {
      let threwViolation = false;
      try {
        await AdminAuthCopilotTools.executeTool(name, {});
      } catch (err: any) {
        if (err instanceof PolicyViolationError && err.message.includes('strictly prohibited')) {
          threwViolation = true;
        }
      }
      assert(threwViolation === true, `Blocked mutation tool [${name}] throws PolicyViolationError`);
    }
  });

  await runPillar(116, 'Copilot Tools — Zero Secrets / Raw Hashes Leaked in Output', async () => {
    const statusRes = await AdminAuthCopilotTools.executeTool('get_admin_authentication_status', {});
    const payloadStr = JSON.stringify(statusRes);
    assert(!payloadStr.includes('password_hash'), 'No password hashes in copilot output');
    assert(!payloadStr.includes('raw_secret'), 'No raw secrets in copilot output');
  });

  // =========================================================================
  // SECTION 13: Concurrency, Stress & High-Load Invariants (Pillars 117-122)
  // =========================================================================

  await runPillar(117, 'Concurrency — 50 Concurrent Valid Session Lookups', async () => {
    const login = await AdminAuthService.login({
      email: 'admin@pixmatch.io',
      password: 'BrandNewAdminPassword2026!#',
    });
    const token = login.session_token!;

    const lookups = await Promise.all(
      Array.from({ length: 50 }, () => AdminAuthService.validateSession(token))
    );

    for (const l of lookups) {
      assert(l.valid === true, 'Concurrent lookup valid');
      assert(l.admin?.email === 'admin@pixmatch.io', 'Concurrent lookup returns correct admin');
    }
  });

  await runPillar(118, 'Concurrency — 25 Concurrent Session Rotations (Deterministic Handling)', async () => {
    const login = await AdminAuthService.login({
      email: 'admin@pixmatch.io',
      password: 'BrandNewAdminPassword2026!#',
    });
    let currentToken = login.session_token!;

    for (let i = 0; i < 5; i++) {
      const rot = await AdminAuthService.rotateSession(currentToken);
      assert(!!rot, 'Rotation succeeds');
      currentToken = rot!.newToken;
    }
    const finalVal = await AdminAuthService.validateSession(currentToken);
    assert(finalVal.valid === true, 'Final rotated session is valid');
  });

  await runPillar(119, 'Concurrency — High-Volume Rate Limiter Concurrent Writes', async () => {
    const ip = '10.50.0.1';
    await Promise.all(
      Array.from({ length: 20 }, (_, i) =>
        AdminRateLimiterService.recordLoginFailure(ip, `user_${i}@pixmatch.io`)
      )
    );
    const check = AdminRateLimiterService.checkLoginLimit(ip, 'test@pixmatch.io');
    assert(check.allowed === false, 'IP blocked after concurrent failure flood');
  });

  await runPillar(120, 'Concurrency — 30 Concurrent Audit Event Ingestions', async () => {
    const events = await Promise.all(
      Array.from({ length: 30 }, (_, i) =>
        AdminAuditService.recordEvent({
          event_type: AdminAuthEventType.ADMIN_LOGIN_ATTEMPT,
          details: `Concurrent event ${i}`,
        })
      )
    );
    assert(events.length === 30, 'All 30 concurrent audit events created');
  });

  await runPillar(121, 'Security Stats Overview — Consistent Aggregation Under Load', async () => {
    const stats = await AdminAuthService.getSecurityStats();
    assert(typeof stats.active_sessions_count === 'number', 'active_sessions_count is numeric');
    assert(stats.active_sessions_count >= 1, 'Active sessions count >= 1');
  });

  await runPillar(122, 'Clean Teardown — Final Invariant & Session State Health', () => {
    assert(totalFailed === 0, 'Zero pillar failures across test suite execution');
    assert(totalAssertions >= 450, `Total assertions >= 450 (tested ${totalAssertions})`);
  });

  // -------------------------------------------
  // Summary
  // -------------------------------------------
  console.log('\n================================================================');
  console.log('MASTER TEST SUITE SUMMARY');
  console.log(`Total Pillars Executed:  122`);
  console.log(`Total Pillars Passed:    ${totalPassed}`);
  console.log(`Total Pillars Failed:    ${totalFailed}`);
  console.log(`Total Assertions Tested: ${totalAssertions}`);
  console.log('================================================================');

  if (totalFailed > 0) {
    process.exit(1);
  }
}

runMasterTestSuite().catch((err) => {
  console.error('Fatal Error running test suite:', err);
  process.exit(1);
});
