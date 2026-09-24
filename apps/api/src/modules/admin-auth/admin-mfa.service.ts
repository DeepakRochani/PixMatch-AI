import { prisma } from '@pixmatch/database';
import { AdminMfaStatus, AdminMfaDTO, AdminMfaEnrollResponseDTO } from '@pixmatch/types';
import {
  generateBase32Secret,
  generateTotpCode,
  verifyTotpCode,
  generateTotpUri,
  generateRecoveryCodes,
  verifyAndConsumeRecoveryCode,
  encryptMfaSecret,
  decryptMfaSecret,
} from '@pixmatch/auth';
import { AdminRateLimiterService } from './admin-rate-limiter.service.js';
import { AdminAuditService } from './admin-audit.service.js';
import { AdminAuthEventType } from '@pixmatch/types';

export class AdminMfaService {
  // In-memory fallback for testing
  private static mockMfaStore = new Map<
    string,
    {
      id: string;
      admin_user_id: string;
      secret_encrypted: string;
      status: AdminMfaStatus;
      recovery_codes_hashes: string[];
      enrolled_at?: Date | null;
      last_verified_at?: Date | null;
      failed_attempts_count: number;
      locked_until?: Date | null;
      last_used_timestep?: number;
    }
  >();

  // Replay prevention store: adminUserId -> lastUsedTimeStep
  private static lastUsedTimeSteps = new Map<string, number>();

  public static async getMfaStatus(adminUserId: string): Promise<AdminMfaDTO> {
    try {
      if (process.env.DATABASE_URL && prisma && (prisma as any).platformAdminMfa) {
        const record = await (prisma as any).platformAdminMfa.findUnique({
          where: { admin_user_id: adminUserId },
        });
        if (record) {
          const hashes = Array.isArray(record.recovery_codes_hashes)
            ? (record.recovery_codes_hashes as string[])
            : JSON.parse((record.recovery_codes_hashes as string) || '[]');
          return {
            id: record.id,
            admin_user_id: record.admin_user_id,
            status: record.status as AdminMfaStatus,
            enrolled_at: record.enrolled_at,
            last_verified_at: record.last_verified_at,
            failed_attempts_count: record.failed_attempts_count,
            locked_until: record.locked_until,
            recovery_codes_remaining: hashes.length,
          };
        }
      }
    } catch {
      // Fallback
    }

    const mock = this.mockMfaStore.get(adminUserId);
    if (mock) {
      return {
        id: mock.id,
        admin_user_id: mock.admin_user_id,
        status: mock.status,
        enrolled_at: mock.enrolled_at,
        last_verified_at: mock.last_verified_at,
        failed_attempts_count: mock.failed_attempts_count,
        locked_until: mock.locked_until,
        recovery_codes_remaining: mock.recovery_codes_hashes.length,
      };
    }

    return {
      id: `mfa_${adminUserId}`,
      admin_user_id: adminUserId,
      status: AdminMfaStatus.DISABLED,
      recovery_codes_remaining: 0,
    };
  }

  public static async initiateEnrollment(
    adminUserId: string,
    email: string
  ): Promise<AdminMfaEnrollResponseDTO> {
    const secret = generateBase32Secret(20);
    const encryptedSecret = encryptMfaSecret(secret);
    const uri = generateTotpUri(email, secret);
    const { rawCodes, hashedCodes } = generateRecoveryCodes(8);

    try {
      if (process.env.DATABASE_URL && prisma && (prisma as any).platformAdminMfa) {
        await (prisma as any).platformAdminMfa.upsert({
          where: { admin_user_id: adminUserId },
          create: {
            admin_user_id: adminUserId,
            secret_encrypted: encryptedSecret,
            status: AdminMfaStatus.PENDING_VERIFICATION,
            recovery_codes_hashes: hashedCodes,
          },
          update: {
            secret_encrypted: encryptedSecret,
            status: AdminMfaStatus.PENDING_VERIFICATION,
            recovery_codes_hashes: hashedCodes,
            failed_attempts_count: 0,
            locked_until: null,
          },
        });
      }
    } catch {
      // Fallback
    }

    this.mockMfaStore.set(adminUserId, {
      id: `mfa_${adminUserId}`,
      admin_user_id: adminUserId,
      secret_encrypted: encryptedSecret,
      status: AdminMfaStatus.PENDING_VERIFICATION,
      recovery_codes_hashes: hashedCodes,
      failed_attempts_count: 0,
      locked_until: null,
    });

    return {
      secret,
      qr_code_uri: uri,
      recovery_codes: rawCodes,
    };
  }

  public static async confirmEnrollment(
    adminUserId: string,
    code: string,
    enforce = false
  ): Promise<{ success: boolean; message?: string }> {
    let encryptedSecret: string | null = null;

    try {
      if (process.env.DATABASE_URL && prisma && (prisma as any).platformAdminMfa) {
        const record = await (prisma as any).platformAdminMfa.findUnique({
          where: { admin_user_id: adminUserId },
        });
        if (record) {
          encryptedSecret = record.secret_encrypted;
        }
      }
    } catch {
      // Fallback
    }

    if (!encryptedSecret) {
      const mock = this.mockMfaStore.get(adminUserId);
      if (mock) encryptedSecret = mock.secret_encrypted;
    }

    if (!encryptedSecret) {
      return { success: false, message: 'No MFA enrollment in progress.' };
    }

    const secret = decryptMfaSecret(encryptedSecret);
    const isValid = verifyTotpCode(secret, code);

    if (!isValid) {
      return { success: false, message: 'Invalid verification code.' };
    }

    const newStatus = enforce ? AdminMfaStatus.ENFORCED : AdminMfaStatus.ENABLED;
    const now = new Date();

    try {
      if (process.env.DATABASE_URL && prisma && (prisma as any).platformAdminMfa) {
        await (prisma as any).platformAdminMfa.update({
          where: { admin_user_id: adminUserId },
          data: {
            status: newStatus,
            enrolled_at: now,
            last_verified_at: now,
          },
        });
      }
    } catch {
      // Fallback
    }

    const mock = this.mockMfaStore.get(adminUserId);
    if (mock) {
      mock.status = newStatus;
      mock.enrolled_at = now;
      mock.last_verified_at = now;
    }

    await AdminAuditService.recordEvent({
      admin_user_id: adminUserId,
      event_type: AdminAuthEventType.ADMIN_MFA_ENROLLED,
      status: 'SUCCESS',
      details: `MFA enrollment completed with status: ${newStatus}`,
    });

    return { success: true };
  }

  public static async verifyMfaCode(
    adminUserId: string,
    codeOrRecovery: string,
    isRecoveryCode = false
  ): Promise<{ success: boolean; message?: string; isRecoveryUsed?: boolean }> {
    // 1. Rate Limit Check
    const rateLimit = AdminRateLimiterService.checkMfaLimit(adminUserId);
    if (!rateLimit.allowed) {
      await AdminAuditService.recordEvent({
        admin_user_id: adminUserId,
        event_type: AdminAuthEventType.ADMIN_MFA_FAILED,
        status: 'RATE_LIMITED',
        details: 'MFA rate limit exceeded. Temporary lockout.',
      });
      return {
        success: false,
        message: `Too many failed MFA verification attempts. Please try again in ${rateLimit.retryAfterSeconds || 60} seconds.`,
      };
    }

    let record: any = null;
    try {
      if (process.env.DATABASE_URL && prisma && (prisma as any).platformAdminMfa) {
        record = await (prisma as any).platformAdminMfa.findUnique({
          where: { admin_user_id: adminUserId },
        });
      }
    } catch {
      // Fallback
    }

    if (!record) {
      record = this.mockMfaStore.get(adminUserId);
    }

    if (!record || (record.status !== AdminMfaStatus.ENABLED && record.status !== AdminMfaStatus.ENFORCED)) {
      return { success: false, message: 'MFA is not enabled for this administrator.' };
    }

    const rawHashes: string[] = Array.isArray(record.recovery_codes_hashes)
      ? record.recovery_codes_hashes
      : JSON.parse(record.recovery_codes_hashes || '[]');

    // 2. Recovery Code Path
    if (isRecoveryCode || codeOrRecovery.includes('-')) {
      const consumption = verifyAndConsumeRecoveryCode(codeOrRecovery, rawHashes);
      if (consumption.valid) {
        // Update remaining recovery codes
        try {
          if (process.env.DATABASE_URL && prisma && (prisma as any).platformAdminMfa) {
            await (prisma as any).platformAdminMfa.update({
              where: { admin_user_id: adminUserId },
              data: {
                recovery_codes_hashes: consumption.remainingHashedCodes,
                last_verified_at: new Date(),
                failed_attempts_count: 0,
              },
            });
          }
        } catch {
          // Fallback
        }

        if (this.mockMfaStore.has(adminUserId)) {
          const m = this.mockMfaStore.get(adminUserId)!;
          m.recovery_codes_hashes = consumption.remainingHashedCodes;
          m.last_verified_at = new Date();
          m.failed_attempts_count = 0;
        }

        AdminRateLimiterService.clearMfaFailures(adminUserId);

        await AdminAuditService.recordEvent({
          admin_user_id: adminUserId,
          event_type: AdminAuthEventType.ADMIN_MFA_VERIFIED,
          status: 'SUCCESS',
          details: `MFA verified using one-time recovery code. Remaining codes: ${consumption.remainingHashedCodes.length}`,
        });

        return { success: true, isRecoveryUsed: true };
      } else {
        AdminRateLimiterService.recordMfaFailure(adminUserId);
        await AdminAuditService.recordEvent({
          admin_user_id: adminUserId,
          event_type: AdminAuthEventType.ADMIN_MFA_FAILED,
          status: 'FAILURE',
          details: 'Invalid MFA recovery code provided.',
        });
        return { success: false, message: 'Invalid or already used recovery code.' };
      }
    }

    // 3. Standard TOTP Verification
    const secret = decryptMfaSecret(record.secret_encrypted);
    const now = Date.now();
    const currentStep = Math.floor(now / 1000 / 30);

    const isValid = verifyTotpCode(secret, codeOrRecovery, 30, 1, now);

    if (!isValid) {
      AdminRateLimiterService.recordMfaFailure(adminUserId);
      await AdminAuditService.recordEvent({
        admin_user_id: adminUserId,
        event_type: AdminAuthEventType.ADMIN_MFA_FAILED,
        status: 'FAILURE',
        details: 'Invalid TOTP verification code.',
      });
      return { success: false, message: 'Invalid 6-digit authentication code.' };
    }

    // 4. Replay Prevention: Check if this exact timestep was already consumed
    const lastUsedStep = this.lastUsedTimeSteps.get(adminUserId);
    if (lastUsedStep && lastUsedStep >= currentStep) {
      await AdminAuditService.recordEvent({
        admin_user_id: adminUserId,
        event_type: AdminAuthEventType.ADMIN_MFA_FAILED,
        status: 'REPLAY_REJECTED',
        details: 'MFA token replay rejected (code already consumed in current window).',
      });
      return { success: false, message: 'This code has already been used (Replay blocked). Please wait for the next 30-second token.' };
    }

    this.lastUsedTimeSteps.set(adminUserId, currentStep);
    AdminRateLimiterService.clearMfaFailures(adminUserId);

    try {
      if (process.env.DATABASE_URL && prisma && (prisma as any).platformAdminMfa) {
        await (prisma as any).platformAdminMfa.update({
          where: { admin_user_id: adminUserId },
          data: {
            last_verified_at: new Date(),
            failed_attempts_count: 0,
          },
        });
      }
    } catch {
      // Fallback
    }

    if (this.mockMfaStore.has(adminUserId)) {
      const m = this.mockMfaStore.get(adminUserId)!;
      m.last_verified_at = new Date();
      m.failed_attempts_count = 0;
    }

    await AdminAuditService.recordEvent({
      admin_user_id: adminUserId,
      event_type: AdminAuthEventType.ADMIN_MFA_VERIFIED,
      status: 'SUCCESS',
      details: 'MFA TOTP code verified successfully.',
    });

    return { success: true };
  }

  public static async verifyRecoveryCode(
    adminUserId: string,
    recoveryCode: string
  ): Promise<{ success: boolean; message?: string }> {
    return this.verifyMfaCode(adminUserId, recoveryCode, true);
  }

  public static async disableMfa(
    adminUserId: string,
    authorizedByAdminId: string
  ): Promise<{ success: boolean; message?: string }> {
    try {
      if (process.env.DATABASE_URL && prisma && (prisma as any).platformAdminMfa) {
        await (prisma as any).platformAdminMfa.update({
          where: { admin_user_id: adminUserId },
          data: {
            status: AdminMfaStatus.DISABLED,
          },
        });
      }
    } catch {
      // Fallback
    }

    const mock = this.mockMfaStore.get(adminUserId);
    if (mock) {
      mock.status = AdminMfaStatus.DISABLED;
    }

    await AdminAuditService.recordEvent({
      admin_user_id: adminUserId,
      event_type: AdminAuthEventType.ADMIN_MFA_DISABLED,
      status: 'SUCCESS',
      details: `MFA disabled by administrator ${authorizedByAdminId}`,
    });

    return { success: true };
  }

  public static resetMockStore(): void {
    this.mockMfaStore.clear();
    this.lastUsedTimeSteps.clear();
  }
}
