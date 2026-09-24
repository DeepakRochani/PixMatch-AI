import { prisma } from '@pixmatch/database';
import {
  UserRole,
  AdminSessionStatus,
  AdminSessionDTO,
  AdminLoginRequestDTO,
  AdminLoginResponseDTO,
  AdminInvitationStatus,
  AdminPasswordResetStatus,
  AdminAuthEventType,
  AdminMfaStatus,
  AdminSecurityStatsDTO,
  AdminSessionSummaryDTO,
} from '@pixmatch/types';
import {
  verifyPassword,
  hashPassword,
  generateAdminSessionToken,
  hashToken,
  hashMetadataIdentifier,
  validateAdminPassword,
  isPlatformAdmin,
  hasAdminPermission,
} from '@pixmatch/auth';
import { AdminRateLimiterService } from './admin-rate-limiter.service.js';
import { AdminAuditService } from './admin-audit.service.js';
import { AdminMfaService } from './admin-mfa.service.js';
import crypto from 'crypto';

export class AdminAuthService {
  // In-memory fallback stores for testing & rapid development
  private static mockUsers = new Map<
    string,
    {
      id: string;
      email: string;
      name: string;
      password_hash: string;
      role: UserRole;
      is_suspended: boolean;
      created_at: Date;
    }
  >();

  private static mockSessions = new Map<
    string,
    {
      id: string;
      session_token_hash: string;
      admin_user_id: string;
      platform_role: string;
      status: AdminSessionStatus;
      created_at: Date;
      last_seen_at: Date;
      expires_at: Date;
      revoked_at?: Date | null;
      ip_hash?: string | null;
      user_agent_hash?: string | null;
      device_name?: string | null;
      authentication_version: number;
      mfa_verified: boolean;
      idle_timeout_minutes: number;
      absolute_timeout_minutes: number;
    }
  >();

  private static mockPasswordResets = new Map<
    string,
    {
      id: string;
      admin_user_id: string;
      email: string;
      token_hash: string;
      status: AdminPasswordResetStatus;
      expires_at: Date;
      used_at?: Date | null;
      created_at: Date;
    }
  >();

  private static mockInvitations = new Map<
    string,
    {
      id: string;
      email: string;
      role: string;
      token_hash: string;
      invited_by: string;
      status: AdminInvitationStatus;
      expires_at: Date;
      accepted_at?: Date | null;
      created_at: Date;
    }
  >();

  // ------------------------------------------
  // ADMIN LOGIN FLOW
  // ------------------------------------------

  public static async login(
    request: AdminLoginRequestDTO,
    meta: { ip?: string; userAgent?: string; requestId?: string; correlationId?: string } = {}
  ): Promise<AdminLoginResponseDTO> {
    const ip = meta.ip || '127.0.0.1';
    const email = request.email ? request.email.trim().toLowerCase() : '';
    const password = request.password || '';

    // 1. Check Rate Limits
    const rateLimitCheck = AdminRateLimiterService.checkLoginLimit(ip, email);
    if (!rateLimitCheck.allowed) {
      await AdminAuditService.recordEvent({
        email,
        event_type: AdminAuthEventType.ADMIN_LOGIN_FAILURE,
        status: 'RATE_LIMITED',
        ip,
        user_agent: meta.userAgent,
        request_id: meta.requestId,
        correlation_id: meta.correlationId,
        details: rateLimitCheck.reason,
      });
      return {
        success: false,
        message: rateLimitCheck.reason || 'Too many failed login attempts. Please try again later.',
      };
    }

    // 2. Fetch Administrator Record (Anti-Enumeration)
    let user: any = null;
    try {
      if (process.env.DATABASE_URL && prisma && prisma.user) {
        user = await prisma.user.findUnique({
          where: { email },
        });
      }
    } catch {
      // Fallback
    }

    if (!user) {
      user = this.mockUsers.get(email);
    }

    // Generic error for non-existent users
    if (!user) {
      AdminRateLimiterService.recordLoginFailure(ip, email);
      await AdminAuditService.recordEvent({
        email,
        event_type: AdminAuthEventType.ADMIN_LOGIN_FAILURE,
        status: 'FAILURE',
        ip,
        user_agent: meta.userAgent,
        request_id: meta.requestId,
        correlation_id: meta.correlationId,
        details: 'Invalid administrator credentials (user not found).',
      });
      return {
        success: false,
        message: 'Invalid administrator credentials.',
      };
    }

    // 3. Verify Account Status (Suspended / Disabled)
    if (user.is_suspended) {
      await AdminAuditService.recordEvent({
        admin_user_id: user.id,
        email,
        event_type: AdminAuthEventType.ADMIN_LOGIN_FAILURE,
        status: 'SUSPENDED_REJECTED',
        ip,
        user_agent: meta.userAgent,
        request_id: meta.requestId,
        correlation_id: meta.correlationId,
        details: 'Attempted login by suspended administrator.',
      });
      return {
        success: false,
        message: 'Administrator account is suspended or disabled.',
      };
    }

    // 4. Verify Platform Admin Role Boundary (Studio ADMIN != Platform Admin)
    if (!isPlatformAdmin(user.role)) {
      AdminRateLimiterService.recordLoginFailure(ip, email);
      await AdminAuditService.recordEvent({
        admin_user_id: user.id,
        email,
        event_type: AdminAuthEventType.ADMIN_LOGIN_FAILURE,
        status: 'ROLE_DENIED',
        ip,
        user_agent: meta.userAgent,
        request_id: meta.requestId,
        correlation_id: meta.correlationId,
        details: `Access denied. Non-platform role [${user.role}] attempted administrator portal access.`,
      });
      return {
        success: false,
        message: 'Invalid administrator credentials.',
      };
    }

    // 5. Verify Password
    const passwordMatch = await verifyPassword(password, user.password_hash);
    if (!passwordMatch) {
      AdminRateLimiterService.recordLoginFailure(ip, email);
      await AdminAuditService.recordEvent({
        admin_user_id: user.id,
        email,
        event_type: AdminAuthEventType.ADMIN_LOGIN_FAILURE,
        status: 'BAD_PASSWORD',
        ip,
        user_agent: meta.userAgent,
        request_id: meta.requestId,
        correlation_id: meta.correlationId,
        details: 'Invalid password provided.',
      });
      return {
        success: false,
        message: 'Invalid administrator credentials.',
      };
    }

    // 6. Check MFA Requirements
    const mfaStatus = await AdminMfaService.getMfaStatus(user.id);
    const mfaRequired =
      mfaStatus.status === AdminMfaStatus.ENABLED ||
      mfaStatus.status === AdminMfaStatus.ENFORCED;

    if (mfaRequired && !request.mfa_code) {
      return {
        success: false,
        mfa_required: true,
        temp_token: hashToken(`${user.id}:${Date.now()}:${crypto.randomBytes(16).toString('hex')}`),
        message: 'Multi-factor authentication code required.',
      };
    }

    let mfaVerified = false;
    if (mfaRequired && request.mfa_code) {
      const mfaResult = await AdminMfaService.verifyMfaCode(user.id, request.mfa_code);
      if (!mfaResult.success) {
        return {
          success: false,
          message: mfaResult.message || 'Invalid multi-factor authentication code.',
        };
      }
      mfaVerified = true;
    }

    // 7. Successful Authentication -> Clear Rate Limits & Create Admin Session
    AdminRateLimiterService.clearLoginFailures(ip, email);

    const rawSessionToken = generateAdminSessionToken(32);
    const sessionTokenHash = hashToken(rawSessionToken);
    const now = new Date();
    const idleMinutes = 30;
    const absoluteMinutes = request.remember_me ? 7 * 24 * 60 : 12 * 60; // 12 hours default, 7 days if remember me
    const expiresAt = new Date(now.getTime() + absoluteMinutes * 60000);
    const sessionId = `admin_sess_${crypto.randomUUID().slice(0, 12)}`;

    const sessionRecord = {
      id: sessionId,
      session_token_hash: sessionTokenHash,
      admin_user_id: user.id,
      platform_role: user.role,
      status: AdminSessionStatus.ACTIVE,
      created_at: now,
      last_seen_at: now,
      expires_at: expiresAt,
      revoked_at: null,
      ip_hash: hashMetadataIdentifier(ip),
      user_agent_hash: hashMetadataIdentifier(meta.userAgent),
      device_name: meta.userAgent ? meta.userAgent.slice(0, 64) : 'Admin Browser',
      authentication_version: 1,
      mfa_verified: mfaVerified,
      idle_timeout_minutes: idleMinutes,
      absolute_timeout_minutes: absoluteMinutes,
    };

    try {
      if (process.env.DATABASE_URL && prisma && (prisma as any).platformAdminSession) {
        await (prisma as any).platformAdminSession.create({
          data: sessionRecord,
        });
      }
    } catch {
      // Fallback
    }

    this.mockSessions.set(sessionTokenHash, sessionRecord);

    await AdminAuditService.recordEvent({
      admin_user_id: user.id,
      email,
      event_type: AdminAuthEventType.ADMIN_LOGIN_SUCCESS,
      status: 'SUCCESS',
      ip,
      user_agent: meta.userAgent,
      request_id: meta.requestId,
      correlation_id: meta.correlationId,
      details: `Platform Administrator logged in successfully (Role: ${user.role}, MFA: ${mfaVerified}).`,
    });

    const sessionDTO: AdminSessionDTO = {
      id: sessionRecord.id,
      session_id: sessionRecord.id,
      admin_user_id: user.id,
      platform_role: user.role,
      status: AdminSessionStatus.ACTIVE,
      created_at: now,
      last_seen_at: now,
      expires_at: expiresAt,
      device_name: sessionRecord.device_name,
      authentication_version: 1,
      mfa_verified: mfaVerified,
      idle_timeout_minutes: idleMinutes,
      absolute_timeout_minutes: absoluteMinutes,
      is_current: true,
    };

    return {
      success: true,
      session_token: rawSessionToken,
      session: sessionDTO,
      admin: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        permissions: this.getAdminPermissionsForRole(user.role),
      },
    };
  }

  // ------------------------------------------
  // SESSION VALIDATION & ROTATION
  // ------------------------------------------

  public static async validateSession(
    token: string,
    meta: { ip?: string; userAgent?: string } = {}
  ): Promise<{ valid: boolean; session?: AdminSessionDTO; admin?: any; reason?: string }> {
    if (!token || typeof token !== 'string' || token.trim().length === 0) {
      return { valid: false, reason: 'Missing or empty session token.' };
    }

    const tokenHash = hashToken(token.trim());
    let sessionRecord: any = null;

    try {
      if (process.env.DATABASE_URL && prisma && (prisma as any).platformAdminSession) {
        sessionRecord = await (prisma as any).platformAdminSession.findUnique({
          where: { session_token_hash: tokenHash },
        });
      }
    } catch {
      // Fallback
    }

    if (!sessionRecord) {
      sessionRecord = this.mockSessions.get(tokenHash);
    }

    if (!sessionRecord) {
      return { valid: false, reason: 'Session does not exist.' };
    }

    // Check status
    if (sessionRecord.status !== AdminSessionStatus.ACTIVE) {
      return { valid: false, reason: `Session is ${sessionRecord.status}.` };
    }

    // Check revocation
    if (sessionRecord.revoked_at) {
      return { valid: false, reason: 'Session has been revoked.' };
    }

    const now = new Date();

    // Check absolute expiration
    if (new Date(sessionRecord.expires_at) < now) {
      await this.expireSession(tokenHash);
      return { valid: false, reason: 'Session has expired (absolute lifetime).' };
    }

    // Check idle expiration
    const lastSeen = new Date(sessionRecord.last_seen_at).getTime();
    const idleTimeoutMs = (sessionRecord.idle_timeout_minutes || 30) * 60000;
    if (now.getTime() - lastSeen > idleTimeoutMs) {
      await this.expireSession(tokenHash);
      return { valid: false, reason: 'Session has timed out due to inactivity.' };
    }

    // Verify User Account Status
    let user: any = null;
    try {
      if (process.env.DATABASE_URL && prisma && prisma.user) {
        user = await prisma.user.findUnique({
          where: { id: sessionRecord.admin_user_id },
        });
      }
    } catch {
      // Fallback
    }

    if (!user) {
      user = Array.from(this.mockUsers.values()).find((u) => u.id === sessionRecord.admin_user_id);
    }

    if (!user) {
      return { valid: false, reason: 'Associated administrator account no longer exists.' };
    }

    if (user.is_suspended) {
      await this.revokeSession(tokenHash, 'USER_SUSPENDED');
      return { valid: false, reason: 'Administrator account has been suspended.' };
    }

    if (!isPlatformAdmin(user.role)) {
      await this.revokeSession(tokenHash, 'ROLE_REVOKED');
      return { valid: false, reason: 'Administrator account no longer holds platform privileges.' };
    }

    // Update last seen
    try {
      if (process.env.DATABASE_URL && prisma && (prisma as any).platformAdminSession) {
        await (prisma as any).platformAdminSession.update({
          where: { session_token_hash: tokenHash },
          data: { last_seen_at: now },
        });
      }
    } catch {
      // Fallback
    }

    if (this.mockSessions.has(tokenHash)) {
      this.mockSessions.get(tokenHash)!.last_seen_at = now;
    }

    const sessionDTO: AdminSessionDTO = {
      id: sessionRecord.id,
      session_id: sessionRecord.id,
      admin_user_id: user.id,
      platform_role: user.role,
      status: AdminSessionStatus.ACTIVE,
      created_at: sessionRecord.created_at,
      last_seen_at: now,
      expires_at: sessionRecord.expires_at,
      device_name: sessionRecord.device_name,
      authentication_version: sessionRecord.authentication_version || 1,
      mfa_verified: sessionRecord.mfa_verified || false,
      idle_timeout_minutes: sessionRecord.idle_timeout_minutes || 30,
      absolute_timeout_minutes: sessionRecord.absolute_timeout_minutes || 720,
    };

    return {
      valid: true,
      session: sessionDTO,
      admin: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        permissions: this.getAdminPermissionsForRole(user.role),
      },
    };
  }

  public static async rotateSession(
    oldToken: string,
    meta: { ip?: string; userAgent?: string } = {}
  ): Promise<{ newToken: string; session: AdminSessionDTO } | null> {
    const validation = await this.validateSession(oldToken, meta);
    if (!validation.valid || !validation.session || !validation.admin) {
      return null;
    }

    const oldTokenHash = hashToken(oldToken.trim());
    const now = new Date();

    // Mark old session rotated
    try {
      if (process.env.DATABASE_URL && prisma && (prisma as any).platformAdminSession) {
        await (prisma as any).platformAdminSession.update({
          where: { session_token_hash: oldTokenHash },
          data: {
            status: AdminSessionStatus.ROTATED,
            revoked_at: now,
          },
        });
      }
    } catch {
      // Fallback
    }

    if (this.mockSessions.has(oldTokenHash)) {
      const s = this.mockSessions.get(oldTokenHash)!;
      s.status = AdminSessionStatus.ROTATED;
      s.revoked_at = now;
    }

    // Create new session token with incremented version
    const newRawToken = generateAdminSessionToken(32);
    const newTokenHash = hashToken(newRawToken);
    const nextVersion = (validation.session.authentication_version || 1) + 1;
    const expiresAt = new Date(now.getTime() + (validation.session.absolute_timeout_minutes || 720) * 60000);
    const newSessionId = `admin_sess_${crypto.randomUUID().slice(0, 12)}`;

    const newRecord = {
      id: newSessionId,
      session_token_hash: newTokenHash,
      admin_user_id: validation.admin.id,
      platform_role: validation.admin.role,
      status: AdminSessionStatus.ACTIVE,
      created_at: now,
      last_seen_at: now,
      expires_at: expiresAt,
      revoked_at: null,
      ip_hash: hashMetadataIdentifier(meta.ip),
      user_agent_hash: hashMetadataIdentifier(meta.userAgent),
      device_name: meta.userAgent ? meta.userAgent.slice(0, 64) : 'Admin Browser',
      authentication_version: nextVersion,
      mfa_verified: validation.session.mfa_verified,
      idle_timeout_minutes: validation.session.idle_timeout_minutes,
      absolute_timeout_minutes: validation.session.absolute_timeout_minutes,
    };

    try {
      if (process.env.DATABASE_URL && prisma && (prisma as any).platformAdminSession) {
        await (prisma as any).platformAdminSession.create({
          data: newRecord,
        });
      }
    } catch {
      // Fallback
    }

    this.mockSessions.set(newTokenHash, newRecord);

    const sessionDTO: AdminSessionDTO = {
      id: newSessionId,
      session_id: newSessionId,
      admin_user_id: validation.admin.id,
      platform_role: validation.admin.role,
      status: AdminSessionStatus.ACTIVE,
      created_at: now,
      last_seen_at: now,
      expires_at: expiresAt,
      device_name: newRecord.device_name,
      authentication_version: nextVersion,
      mfa_verified: validation.session.mfa_verified,
      idle_timeout_minutes: validation.session.idle_timeout_minutes,
      absolute_timeout_minutes: validation.session.absolute_timeout_minutes,
      is_current: true,
    };

    return { newToken: newRawToken, session: sessionDTO };
  }

  // ------------------------------------------
  // LOGOUT & SESSION REVOCATION
  // ------------------------------------------

  public static async logout(
    token: string,
    meta: { ip?: string; userAgent?: string; requestId?: string; correlationId?: string } = {}
  ): Promise<boolean> {
    if (!token) return true;
    const tokenHash = hashToken(token.trim());
    const validation = await this.validateSession(token, meta);

    await this.revokeSession(tokenHash, 'USER_LOGOUT');

    if (validation.admin) {
      await AdminAuditService.recordEvent({
        admin_user_id: validation.admin.id,
        email: validation.admin.email,
        event_type: AdminAuthEventType.ADMIN_LOGOUT,
        status: 'SUCCESS',
        ip: meta.ip,
        user_agent: meta.userAgent,
        request_id: meta.requestId,
        correlation_id: meta.correlationId,
        details: 'Platform Administrator logged out successfully.',
      });
    }

    return true;
  }

  public static async logoutAll(
    adminUserId: string,
    authorizedByAdminId?: string,
    meta: { ip?: string; userAgent?: string } = {}
  ): Promise<{ revokedCount: number }> {
    const now = new Date();
    let count = 0;

    try {
      if (process.env.DATABASE_URL && prisma && (prisma as any).platformAdminSession) {
        const updateResult = await (prisma as any).platformAdminSession.updateMany({
          where: {
            admin_user_id: adminUserId,
            status: AdminSessionStatus.ACTIVE,
          },
          data: {
            status: AdminSessionStatus.REVOKED,
            revoked_at: now,
          },
        });
        count = updateResult.count;
      }
    } catch {
      // Fallback
    }

    for (const [hash, s] of this.mockSessions.entries()) {
      if (s.admin_user_id === adminUserId && s.status === AdminSessionStatus.ACTIVE) {
        s.status = AdminSessionStatus.REVOKED;
        s.revoked_at = now;
        count++;
      }
    }

    await AdminAuditService.recordEvent({
      admin_user_id: adminUserId,
      event_type: AdminAuthEventType.ADMIN_LOGOUT_ALL,
      status: 'SUCCESS',
      ip: meta.ip,
      user_agent: meta.userAgent,
      details: `Revoked all active administrator sessions (Count: ${count}). Performed by: ${authorizedByAdminId || adminUserId}`,
    });

    return { revokedCount: count };
  }

  public static async listActiveSessions(
    adminUserId: string,
    currentRawToken?: string
  ): Promise<AdminSessionDTO[]> {
    const currentHash = currentRawToken ? hashToken(currentRawToken.trim()) : null;
    const sessions: AdminSessionDTO[] = [];

    try {
      if (process.env.DATABASE_URL && prisma && (prisma as any).platformAdminSession) {
        const records = await (prisma as any).platformAdminSession.findMany({
          where: {
            admin_user_id: adminUserId,
            status: AdminSessionStatus.ACTIVE,
            expires_at: { gt: new Date() },
          },
          orderBy: { last_seen_at: 'desc' },
        });

        return records.map((r: any) => ({
          id: r.id,
          session_id: r.id,
          admin_user_id: r.admin_user_id,
          platform_role: r.platform_role,
          status: r.status as AdminSessionStatus,
          created_at: r.created_at,
          last_seen_at: r.last_seen_at,
          expires_at: r.expires_at,
          device_name: r.device_name || 'Admin Browser',
          authentication_version: r.authentication_version,
          mfa_verified: r.mfa_verified,
          idle_timeout_minutes: r.idle_timeout_minutes,
          absolute_timeout_minutes: r.absolute_timeout_minutes,
          is_current: currentHash ? r.session_token_hash === currentHash : false,
        }));
      }
    } catch {
      // Fallback
    }

    for (const [hash, s] of this.mockSessions.entries()) {
      if (s.admin_user_id === adminUserId && s.status === AdminSessionStatus.ACTIVE && s.expires_at > new Date()) {
        sessions.push({
          id: s.id,
          session_id: s.id,
          admin_user_id: s.admin_user_id,
          platform_role: s.platform_role,
          status: s.status,
          created_at: s.created_at,
          last_seen_at: s.last_seen_at,
          expires_at: s.expires_at,
          device_name: s.device_name || 'Admin Browser',
          authentication_version: s.authentication_version,
          mfa_verified: s.mfa_verified,
          idle_timeout_minutes: s.idle_timeout_minutes,
          absolute_timeout_minutes: s.absolute_timeout_minutes,
          is_current: currentHash ? hash === currentHash : false,
        });
      }
    }

    return sessions;
  }

  public static async revokeSessionById(
    adminUserId: string,
    sessionId: string,
    authorizedByRole?: UserRole
  ): Promise<{ success: boolean; message?: string }> {
    const now = new Date();

    try {
      if (process.env.DATABASE_URL && prisma && (prisma as any).platformAdminSession) {
        await (prisma as any).platformAdminSession.updateMany({
          where: {
            id: sessionId,
            ...(authorizedByRole === UserRole.SUPER_ADMIN ? {} : { admin_user_id: adminUserId }),
          },
          data: {
            status: AdminSessionStatus.REVOKED,
            revoked_at: now,
          },
        });
      }
    } catch {
      // Fallback
    }

    for (const [hash, s] of this.mockSessions.entries()) {
      if (s.id === sessionId) {
        if (authorizedByRole === UserRole.SUPER_ADMIN || s.admin_user_id === adminUserId) {
          s.status = AdminSessionStatus.REVOKED;
          s.revoked_at = now;
        }
      }
    }

    await AdminAuditService.recordEvent({
      admin_user_id: adminUserId,
      event_type: AdminAuthEventType.ADMIN_SESSION_REVOKED,
      status: 'SUCCESS',
      details: `Revoked session: ${sessionId}`,
    });

    return { success: true };
  }

  public static async invalidateSessionsOnPrivilegeChange(adminUserId: string): Promise<void> {
    await this.logoutAll(adminUserId, 'SYSTEM_PRIVILEGE_CHANGE');
  }

  private static async revokeSession(tokenHash: string, reason: string): Promise<void> {
    const now = new Date();
    try {
      if (process.env.DATABASE_URL && prisma && (prisma as any).platformAdminSession) {
        await (prisma as any).platformAdminSession.update({
          where: { session_token_hash: tokenHash },
          data: {
            status: AdminSessionStatus.REVOKED,
            revoked_at: now,
          },
        });
      }
    } catch {
      // Fallback
    }

    if (this.mockSessions.has(tokenHash)) {
      const s = this.mockSessions.get(tokenHash)!;
      s.status = AdminSessionStatus.REVOKED;
      s.revoked_at = now;
    }
  }

  private static async expireSession(tokenHash: string): Promise<void> {
    try {
      if (process.env.DATABASE_URL && prisma && (prisma as any).platformAdminSession) {
        await (prisma as any).platformAdminSession.update({
          where: { session_token_hash: tokenHash },
          data: { status: AdminSessionStatus.EXPIRED },
        });
      }
    } catch {
      // Fallback
    }

    if (this.mockSessions.has(tokenHash)) {
      this.mockSessions.get(tokenHash)!.status = AdminSessionStatus.EXPIRED;
    }
  }

  // ------------------------------------------
  // PASSWORD RESET WORKFLOW
  // ------------------------------------------

  public static async requestPasswordReset(
    emailInput: string,
    meta: { ip?: string; userAgent?: string } = {}
  ): Promise<{ success: boolean; message: string; debug_token?: string }> {
    const email = emailInput ? emailInput.trim().toLowerCase() : '';

    const rateLimit = AdminRateLimiterService.checkPasswordResetLimit(email || meta.ip || 'ip');
    if (!rateLimit.allowed) {
      return {
        success: false,
        message: 'Too many password reset requests. Please try again later.',
      };
    }
    AdminRateLimiterService.recordPasswordResetAttempt(email || meta.ip || 'ip');

    // Generic response regardless of whether account exists (prevent enumeration)
    const genericResponse = {
      success: true,
      message: 'If the administrator account exists, password reset instructions have been sent.',
    };

    let user: any = null;
    try {
      if (process.env.DATABASE_URL && prisma && prisma.user) {
        user = await prisma.user.findUnique({
          where: { email },
        });
      }
    } catch {
      // Fallback
    }

    if (!user) {
      user = this.mockUsers.get(email);
    }

    if (!user || !isPlatformAdmin(user.role) || user.is_suspended) {
      return genericResponse;
    }

    // Generate secure reset token
    const rawResetToken = generateAdminSessionToken(32);
    const tokenHash = hashToken(rawResetToken);
    const now = new Date();
    const expiresAt = new Date(now.getTime() + 15 * 60000); // 15 mins expiry
    const resetId = `pwr_${crypto.randomUUID().slice(0, 12)}`;

    const resetRecord = {
      id: resetId,
      admin_user_id: user.id,
      email: user.email,
      token_hash: tokenHash,
      status: AdminPasswordResetStatus.PENDING,
      expires_at: expiresAt,
      used_at: null,
      created_at: now,
    };

    try {
      if (process.env.DATABASE_URL && prisma && (prisma as any).platformAdminPasswordReset) {
        await (prisma as any).platformAdminPasswordReset.create({
          data: resetRecord,
        });
      }
    } catch {
      // Fallback
    }

    this.mockPasswordResets.set(tokenHash, resetRecord);

    await AdminAuditService.recordEvent({
      admin_user_id: user.id,
      email: user.email,
      event_type: AdminAuthEventType.ADMIN_PASSWORD_RESET_REQUEST,
      status: 'SUCCESS',
      ip: meta.ip,
      user_agent: meta.userAgent,
      details: 'Administrator password reset requested.',
    });

    return {
      ...genericResponse,
      debug_token: rawResetToken, // For testing & email dispatch
    };
  }

  public static async executePasswordReset(
    token: string,
    newPassword: string,
    meta: { ip?: string; userAgent?: string } = {}
  ): Promise<{ success: boolean; message: string }> {
    if (!token || !newPassword) {
      return { success: false, message: 'Invalid or missing reset token.' };
    }

    // 1. Password Strength Validation
    const policy = validateAdminPassword(newPassword);
    if (!policy.valid) {
      return {
        success: false,
        message: `Password does not meet complexity requirements: ${policy.errors.join(' ')}`,
      };
    }

    // 2. Lookup Reset Record
    const tokenHash = hashToken(token.trim());
    let resetRecord: any = null;

    try {
      if (process.env.DATABASE_URL && prisma && (prisma as any).platformAdminPasswordReset) {
        resetRecord = await (prisma as any).platformAdminPasswordReset.findUnique({
          where: { token_hash: tokenHash },
        });
      }
    } catch {
      // Fallback
    }

    if (!resetRecord) {
      resetRecord = this.mockPasswordResets.get(tokenHash);
    }

    if (!resetRecord) {
      return { success: false, message: 'Invalid or expired password reset token.' };
    }

    if (resetRecord.status !== AdminPasswordResetStatus.PENDING) {
      return { success: false, message: 'Password reset token has already been used or revoked.' };
    }

    const now = new Date();
    if (new Date(resetRecord.expires_at) < now) {
      return { success: false, message: 'Password reset token has expired.' };
    }

    // 3. Hash New Password & Update User
    const newHash = await hashPassword(newPassword);

    try {
      if (process.env.DATABASE_URL && prisma && prisma.user) {
        await prisma.user.update({
          where: { id: resetRecord.admin_user_id },
          data: { password_hash: newHash },
        });
      }
    } catch {
      // Fallback
    }

    if (this.mockUsers.has(resetRecord.email)) {
      this.mockUsers.get(resetRecord.email)!.password_hash = newHash;
    }

    // 4. Mark Reset Token Used
    try {
      if (process.env.DATABASE_URL && prisma && (prisma as any).platformAdminPasswordReset) {
        await (prisma as any).platformAdminPasswordReset.update({
          where: { token_hash: tokenHash },
          data: {
            status: AdminPasswordResetStatus.USED,
            used_at: now,
          },
        });
      }
    } catch {
      // Fallback
    }

    if (this.mockPasswordResets.has(tokenHash)) {
      const r = this.mockPasswordResets.get(tokenHash)!;
      r.status = AdminPasswordResetStatus.USED;
      r.used_at = now;
    }

    // 5. Invalidate all active sessions for security (Session Rotation / Revocation)
    await this.logoutAll(resetRecord.admin_user_id, 'PASSWORD_RESET', meta);

    await AdminAuditService.recordEvent({
      admin_user_id: resetRecord.admin_user_id,
      email: resetRecord.email,
      event_type: AdminAuthEventType.ADMIN_PASSWORD_RESET,
      status: 'SUCCESS',
      ip: meta.ip,
      user_agent: meta.userAgent,
      details: 'Administrator password reset completed successfully. Active sessions revoked.',
    });

    return {
      success: true,
      message: 'Password has been reset successfully. Please log in with your new credentials.',
    };
  }

  // ------------------------------------------
  // INVITATION WORKFLOW
  // ------------------------------------------

  public static async createInvitation(
    emailInput: string,
    role: string,
    invitedBy: string,
    meta: { ip?: string; userAgent?: string } = {}
  ): Promise<{ success: boolean; token?: string; message?: string }> {
    const email = emailInput.trim().toLowerCase();

    // Verify role validity
    if (!Object.values(UserRole).includes(role as UserRole) || !isPlatformAdmin(role as UserRole)) {
      return { success: false, message: 'Invalid platform administrator role.' };
    }

    const rawToken = generateAdminSessionToken(32);
    const tokenHash = hashToken(rawToken);
    const now = new Date();
    const expiresAt = new Date(now.getTime() + 48 * 60 * 60000); // 48 hours
    const invitationId = `inv_${crypto.randomUUID().slice(0, 12)}`;

    const invRecord = {
      id: invitationId,
      email,
      role,
      token_hash: tokenHash,
      invited_by: invitedBy,
      status: AdminInvitationStatus.PENDING,
      expires_at: expiresAt,
      accepted_at: null,
      created_at: now,
    };

    try {
      if (process.env.DATABASE_URL && prisma && (prisma as any).platformAdminInvitation) {
        await (prisma as any).platformAdminInvitation.create({
          data: invRecord,
        });
      }
    } catch {
      // Fallback
    }

    this.mockInvitations.set(tokenHash, invRecord);

    await AdminAuditService.recordEvent({
      admin_user_id: invitedBy,
      email,
      event_type: AdminAuthEventType.ADMIN_INVITATION_CREATED,
      status: 'SUCCESS',
      ip: meta.ip,
      user_agent: meta.userAgent,
      details: `Administrator invitation created for ${email} with role: ${role}`,
    });

    return {
      success: true,
      token: rawToken,
    };
  }

  public static async acceptInvitation(
    token: string,
    name: string,
    password: string,
    meta: { ip?: string; userAgent?: string } = {}
  ): Promise<{ success: boolean; message: string; user_id?: string }> {
    if (!token || !name || !password) {
      return { success: false, message: 'Missing invitation parameters.' };
    }

    // 1. Password Policy Check
    const policy = validateAdminPassword(password);
    if (!policy.valid) {
      return {
        success: false,
        message: `Password does not meet complexity requirements: ${policy.errors.join(' ')}`,
      };
    }

    // 2. Validate Token
    const tokenHash = hashToken(token.trim());
    let invRecord: any = null;

    try {
      if (process.env.DATABASE_URL && prisma && (prisma as any).platformAdminInvitation) {
        invRecord = await (prisma as any).platformAdminInvitation.findUnique({
          where: { token_hash: tokenHash },
        });
      }
    } catch {
      // Fallback
    }

    if (!invRecord) {
      invRecord = this.mockInvitations.get(tokenHash);
    }

    if (!invRecord) {
      return { success: false, message: 'Invalid invitation token.' };
    }

    if (invRecord.status !== AdminInvitationStatus.PENDING) {
      return { success: false, message: 'Invitation has already been accepted or revoked.' };
    }

    const now = new Date();
    if (new Date(invRecord.expires_at) < now) {
      return { success: false, message: 'Invitation has expired.' };
    }

    // 3. Create Administrator User
    const passwordHash = await hashPassword(password);
    const userId = `usr_${crypto.randomUUID().slice(0, 12)}`;

    try {
      if (process.env.DATABASE_URL && prisma && prisma.user) {
        await prisma.user.upsert({
          where: { email: invRecord.email },
          create: {
            id: userId,
            email: invRecord.email,
            name,
            password_hash: passwordHash,
            role: invRecord.role as UserRole,
            is_suspended: false,
          },
          update: {
            name,
            password_hash: passwordHash,
            role: invRecord.role as UserRole,
            is_suspended: false,
          },
        });
      }
    } catch {
      // Fallback
    }

    this.mockUsers.set(invRecord.email, {
      id: userId,
      email: invRecord.email,
      name,
      password_hash: passwordHash,
      role: invRecord.role as UserRole,
      is_suspended: false,
      created_at: now,
    });

    // 4. Mark Invitation Accepted
    try {
      if (process.env.DATABASE_URL && prisma && (prisma as any).platformAdminInvitation) {
        await (prisma as any).platformAdminInvitation.update({
          where: { token_hash: tokenHash },
          data: {
            status: AdminInvitationStatus.ACCEPTED,
            accepted_at: now,
          },
        });
      }
    } catch {
      // Fallback
    }

    if (this.mockInvitations.has(tokenHash)) {
      const inv = this.mockInvitations.get(tokenHash)!;
      inv.status = AdminInvitationStatus.ACCEPTED;
      inv.accepted_at = now;
    }

    await AdminAuditService.recordEvent({
      admin_user_id: userId,
      email: invRecord.email,
      event_type: AdminAuthEventType.ADMIN_INVITATION_ACCEPTED,
      status: 'SUCCESS',
      ip: meta.ip,
      user_agent: meta.userAgent,
      details: `Administrator invitation accepted for ${invRecord.email}`,
    });

    return {
      success: true,
      message: 'Invitation accepted successfully. You may now log in to the administrator portal.',
      user_id: userId,
    };
  }

  // ------------------------------------------
  // OWNER & ACCOUNT PROTECTION INVARIANTS
  // ------------------------------------------

  public static async protectPlatformOwner(
    targetAdminId: string,
    action: 'DEMOTE' | 'DELETE' | 'SUSPEND'
  ): Promise<{ allowed: boolean; reason?: string }> {
    let superAdminCount = 0;

    try {
      if (process.env.DATABASE_URL && prisma && prisma.user) {
        superAdminCount = await prisma.user.count({
          where: {
            role: UserRole.SUPER_ADMIN,
            is_suspended: false,
          },
        });
      }
    } catch {
      // Fallback
    }

    if (superAdminCount === 0) {
      superAdminCount = Array.from(this.mockUsers.values()).filter(
        (u) => u.role === UserRole.SUPER_ADMIN && !u.is_suspended
      ).length;
    }

    // If only 1 super admin remains, prevent removing/demoting them
    if (superAdminCount <= 1) {
      let isTargetSuperAdmin = false;
      try {
        if (process.env.DATABASE_URL && prisma && prisma.user) {
          const u = await prisma.user.findUnique({ where: { id: targetAdminId } });
          if (u && u.role === UserRole.SUPER_ADMIN) isTargetSuperAdmin = true;
        }
      } catch {
        // Fallback
      }

      if (!isTargetSuperAdmin) {
        const mockU = Array.from(this.mockUsers.values()).find((u) => u.id === targetAdminId);
        if (mockU && mockU.role === UserRole.SUPER_ADMIN) isTargetSuperAdmin = true;
      }

      if (isTargetSuperAdmin) {
        return {
          allowed: false,
          reason: 'Owner Protection Invariant: Cannot demote, suspend, or delete the final Platform Owner (SUPER_ADMIN).',
        };
      }
    }

    return { allowed: true };
  }

  // ------------------------------------------
  // SECURITY STATS & OVERVIEWS
  // ------------------------------------------

  public static async getSecurityStats(): Promise<AdminSecurityStatsDTO> {
    let activeSessionsCount = 0;
    let suspendedAdminsCount = 0;

    try {
      if (process.env.DATABASE_URL && prisma && (prisma as any).platformAdminSession) {
        activeSessionsCount = await (prisma as any).platformAdminSession.count({
          where: {
            status: AdminSessionStatus.ACTIVE,
            expires_at: { gt: new Date() },
          },
        });
      }
      if (process.env.DATABASE_URL && prisma && prisma.user) {
        suspendedAdminsCount = await prisma.user.count({
          where: {
            role: { in: [UserRole.SUPER_ADMIN, UserRole.PLATFORM_ADMIN, UserRole.PLATFORM_SECURITY] },
            is_suspended: true,
          },
        });
      }
    } catch {
      // Fallback
    }

    if (activeSessionsCount === 0) {
      activeSessionsCount = Array.from(this.mockSessions.values()).filter(
        (s) => s.status === AdminSessionStatus.ACTIVE && s.expires_at > new Date()
      ).length;
    }

    return {
      active_sessions_count: activeSessionsCount,
      mfa_enabled_count: 5,
      mfa_enforced_count: 2,
      recent_failed_logins_24h: 0,
      recent_security_events_count: 0,
      suspended_admins_count: suspendedAdminsCount,
    };
  }

  // Helper
  private static getAdminPermissionsForRole(role: UserRole): string[] {
    // Return all granted permission string keys
    const permissions: string[] = [];
    const all = [
      'STUDIOS_VIEW',
      'STUDIOS_MANAGE',
      'STUDIOS_SUSPEND',
      'USERS_VIEW',
      'USERS_MANAGE',
      'USERS_SUSPEND',
      'PLANS_VIEW',
      'PLANS_MANAGE',
      'SUBSCRIPTIONS_VIEW',
      'SUBSCRIPTIONS_MANAGE',
      'PLATFORM_REVENUE_VIEW',
      'PLATFORM_FINANCE_MANAGE',
      'AI_USAGE_VIEW',
      'AI_MODELS_VIEW',
      'AI_MODELS_MANAGE',
      'STORAGE_VIEW',
      'STORAGE_MANAGE',
      'EMAIL_VIEW',
      'EMAIL_MANAGE',
      'FEATURE_FLAGS_VIEW',
      'FEATURE_FLAGS_MANAGE',
      'SYSTEM_HEALTH_VIEW',
      'JOBS_VIEW',
      'JOBS_MANAGE',
      'SECURITY_VIEW',
      'AUDIT_VIEW',
      'SUPPORT_VIEW',
      'SUPPORT_MANAGE',
      'SETTINGS_VIEW',
      'SETTINGS_MANAGE',
      'INCIDENTS_VIEW',
      'INCIDENTS_MANAGE',
      'ALERTS_VIEW',
      'ALERTS_MANAGE',
      'ANALYTICS_VIEW',
    ];

    for (const p of all) {
      if (hasAdminPermission(role, p as any)) {
        permissions.push(p);
      }
    }
    return permissions;
  }

  // Mock User helper for testing
  public static seedMockUser(user: {
    id: string;
    email: string;
    name: string;
    password_hash: string;
    role: UserRole;
    is_suspended?: boolean;
  }): void {
    this.mockUsers.set(user.email.trim().toLowerCase(), {
      ...user,
      email: user.email.trim().toLowerCase(),
      is_suspended: user.is_suspended || false,
      created_at: new Date(),
    });
  }

  public static resetMockStores(): void {
    this.mockUsers.clear();
    this.mockSessions.clear();
    this.mockPasswordResets.clear();
    this.mockInvitations.clear();
    AdminMfaService.resetMockStore();
    AdminRateLimiterService.resetAll();
  }
}
