import { hashMetadataIdentifier } from '@pixmatch/auth';

interface RateLimitEntry {
  attempts: number;
  firstAttemptAt: number;
  lastAttemptAt: number;
  lockedUntil?: number;
}

export class AdminRateLimiterService {
  private static ipLimits = new Map<string, RateLimitEntry>();
  private static accountLimits = new Map<string, RateLimitEntry>();
  private static combinedLimits = new Map<string, RateLimitEntry>();
  private static mfaLimits = new Map<string, RateLimitEntry>();
  private static passwordResetLimits = new Map<string, RateLimitEntry>();

  // Configurable thresholds
  public static MAX_IP_ATTEMPTS = 10;
  public static IP_WINDOW_MS = 15 * 60 * 1000; // 15 mins
  public static IP_LOCKOUT_MS = 15 * 60 * 1000;

  public static MAX_ACCOUNT_ATTEMPTS = 5;
  public static ACCOUNT_WINDOW_MS = 15 * 60 * 1000; // 15 mins
  public static ACCOUNT_LOCKOUT_MS = 15 * 60 * 1000;

  public static MAX_COMBINED_ATTEMPTS = 5;
  public static COMBINED_WINDOW_MS = 10 * 60 * 1000; // 10 mins
  public static COMBINED_LOCKOUT_MS = 10 * 60 * 1000;

  public static MAX_MFA_ATTEMPTS = 5;
  public static MFA_WINDOW_MS = 10 * 60 * 1000; // 10 mins
  public static MFA_LOCKOUT_MS = 10 * 60 * 1000;

  public static MAX_RESET_ATTEMPTS = 3;
  public static RESET_WINDOW_MS = 15 * 60 * 1000; // 15 mins

  private static checkBucket(
    map: Map<string, RateLimitEntry>,
    key: string,
    maxAttempts: number,
    windowMs: number,
    lockoutMs?: number
  ): { allowed: boolean; remaining: number; retryAfterSeconds?: number } {
    const now = Date.now();
    const entry = map.get(key);

    if (!entry) {
      return { allowed: true, remaining: maxAttempts };
    }

    // Check if locked
    if (entry.lockedUntil && entry.lockedUntil > now) {
      const retryAfterSeconds = Math.ceil((entry.lockedUntil - now) / 1000);
      return { allowed: false, remaining: 0, retryAfterSeconds };
    }

    // Check if window expired
    if (now - entry.firstAttemptAt > windowMs) {
      map.delete(key);
      return { allowed: true, remaining: maxAttempts };
    }

    if (entry.attempts >= maxAttempts) {
      const lockDuration = lockoutMs || windowMs;
      entry.lockedUntil = now + lockDuration;
      const retryAfterSeconds = Math.ceil(lockDuration / 1000);
      return { allowed: false, remaining: 0, retryAfterSeconds };
    }

    return { allowed: true, remaining: maxAttempts - entry.attempts };
  }

  private static recordFailure(
    map: Map<string, RateLimitEntry>,
    key: string,
    maxAttempts: number,
    windowMs: number,
    lockoutMs?: number
  ): void {
    const now = Date.now();
    const entry = map.get(key);

    if (!entry || now - entry.firstAttemptAt > windowMs) {
      map.set(key, {
        attempts: 1,
        firstAttemptAt: now,
        lastAttemptAt: now,
      });
      return;
    }

    entry.attempts += 1;
    entry.lastAttemptAt = now;

    if (entry.attempts >= maxAttempts) {
      entry.lockedUntil = now + (lockoutMs || windowMs);
    }
  }

  // ------------------------------------------
  // LOGIN RATE LIMITING
  // ------------------------------------------

  public static checkLoginLimit(
    ip: string,
    email: string
  ): { allowed: boolean; remaining: number; reason?: string; retryAfterSeconds?: number } {
    const normalizedIp = (ip || '').trim();
    const ipKey = hashMetadataIdentifier(normalizedIp) || 'unknown_ip';
    const emailKey = (email || '').trim().toLowerCase();
    const combinedKey = `${ipKey}:${emailKey}`;

    const ipCheck = this.checkBucket(this.ipLimits, ipKey, this.MAX_IP_ATTEMPTS, this.IP_WINDOW_MS, this.IP_LOCKOUT_MS);
    if (!ipCheck.allowed) {
      return {
        allowed: false,
        remaining: 0,
        reason: 'Too many failed login attempts from this IP address. Please try again later.',
        retryAfterSeconds: ipCheck.retryAfterSeconds,
      };
    }

    const accountCheck = this.checkBucket(
      this.accountLimits,
      emailKey,
      this.MAX_ACCOUNT_ATTEMPTS,
      this.ACCOUNT_WINDOW_MS,
      this.ACCOUNT_LOCKOUT_MS
    );
    if (!accountCheck.allowed) {
      return {
        allowed: false,
        remaining: 0,
        reason: 'Too many failed login attempts for this administrator account. Please try again later.',
        retryAfterSeconds: accountCheck.retryAfterSeconds,
      };
    }

    const combinedCheck = this.checkBucket(
      this.combinedLimits,
      combinedKey,
      this.MAX_COMBINED_ATTEMPTS,
      this.COMBINED_WINDOW_MS,
      this.COMBINED_LOCKOUT_MS
    );
    if (!combinedCheck.allowed) {
      return {
        allowed: false,
        remaining: 0,
        reason: 'Too many failed login attempts. Temporary backoff enforced.',
        retryAfterSeconds: combinedCheck.retryAfterSeconds,
      };
    }

    const minRemaining = Math.min(ipCheck.remaining, accountCheck.remaining, combinedCheck.remaining);
    return { allowed: true, remaining: minRemaining };
  }

  public static recordLoginFailure(ip: string, email: string): void {
    const normalizedIp = (ip || '').trim();
    const ipKey = hashMetadataIdentifier(normalizedIp) || 'unknown_ip';
    const emailKey = (email || '').trim().toLowerCase();
    const combinedKey = `${ipKey}:${emailKey}`;

    this.recordFailure(this.ipLimits, ipKey, this.MAX_IP_ATTEMPTS, this.IP_WINDOW_MS, this.IP_LOCKOUT_MS);
    this.recordFailure(this.accountLimits, emailKey, this.MAX_ACCOUNT_ATTEMPTS, this.ACCOUNT_WINDOW_MS, this.ACCOUNT_LOCKOUT_MS);
    this.recordFailure(
      this.combinedLimits,
      combinedKey,
      this.MAX_COMBINED_ATTEMPTS,
      this.COMBINED_WINDOW_MS,
      this.COMBINED_LOCKOUT_MS
    );
  }

  public static clearLoginFailures(ip: string, email: string): void {
    const normalizedIp = (ip || '').trim();
    const ipKey = hashMetadataIdentifier(normalizedIp) || 'unknown_ip';
    const emailKey = (email || '').trim().toLowerCase();
    const combinedKey = `${ipKey}:${emailKey}`;

    this.accountLimits.delete(emailKey);
    this.combinedLimits.delete(combinedKey);
  }

  // ------------------------------------------
  // MFA RATE LIMITING
  // ------------------------------------------

  public static checkMfaLimit(adminUserId: string): { allowed: boolean; retryAfterSeconds?: number } {
    const check = this.checkBucket(
      this.mfaLimits,
      adminUserId,
      this.MAX_MFA_ATTEMPTS,
      this.MFA_WINDOW_MS,
      this.MFA_LOCKOUT_MS
    );
    return {
      allowed: check.allowed,
      retryAfterSeconds: check.retryAfterSeconds,
    };
  }

  public static recordMfaFailure(adminUserId: string): void {
    this.recordFailure(this.mfaLimits, adminUserId, this.MAX_MFA_ATTEMPTS, this.MFA_WINDOW_MS, this.MFA_LOCKOUT_MS);
  }

  public static clearMfaFailures(adminUserId: string): void {
    this.mfaLimits.delete(adminUserId);
  }

  // ------------------------------------------
  // PASSWORD RESET RATE LIMITING
  // ------------------------------------------

  public static checkPasswordResetLimit(emailOrIp: string): { allowed: boolean; retryAfterSeconds?: number } {
    const key = emailOrIp.trim().toLowerCase();
    const check = this.checkBucket(
      this.passwordResetLimits,
      key,
      this.MAX_RESET_ATTEMPTS,
      this.RESET_WINDOW_MS
    );
    return {
      allowed: check.allowed,
      retryAfterSeconds: check.retryAfterSeconds,
    };
  }

  public static recordPasswordResetAttempt(emailOrIp: string): void {
    const key = emailOrIp.trim().toLowerCase();
    this.recordFailure(this.passwordResetLimits, key, this.MAX_RESET_ATTEMPTS, this.RESET_WINDOW_MS);
  }

  // Clear all limits (for testing purposes)
  public static resetAll(): void {
    this.ipLimits.clear();
    this.accountLimits.clear();
    this.combinedLimits.clear();
    this.mfaLimits.clear();
    this.passwordResetLimits.clear();
  }
}
