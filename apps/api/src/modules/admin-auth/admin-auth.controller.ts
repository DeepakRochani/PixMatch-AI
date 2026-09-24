import { FastifyRequest, FastifyReply } from 'fastify';
import { AdminAuthService } from './admin-auth.service.js';
import { AdminMfaService } from './admin-mfa.service.js';
import { extractAdminToken } from './admin-auth.middleware.js';
import {
  AdminLoginRequestDTO,
  AdminPasswordResetRequestDTO,
  AdminPasswordResetExecuteDTO,
  AdminInvitationCreateDTO,
  AdminInvitationAcceptDTO,
  AdminMfaVerifyRequestDTO,
  UserRole,
} from '@pixmatch/types';

export class AdminAuthController {
  /**
   * Helper to set secure admin cookie
   */
  private static setAdminSessionCookie(reply: FastifyReply, sessionToken: string, maxAgeSeconds = 12 * 3600): void {
    const isProduction = process.env.NODE_ENV === 'production';
    const cookieOptions = [
      `pixmatch_admin_session=${encodeURIComponent(sessionToken)}`,
      'HttpOnly',
      'Path=/',
      'SameSite=Strict',
      `Max-Age=${maxAgeSeconds}`,
      ...(isProduction ? ['Secure'] : []),
    ];
    reply.header('Set-Cookie', cookieOptions.join('; '));
  }

  /**
   * Helper to clear admin session cookie
   */
  private static clearAdminSessionCookie(reply: FastifyReply): void {
    const isProduction = process.env.NODE_ENV === 'production';
    const cookieOptions = [
      'pixmatch_admin_session=',
      'HttpOnly',
      'Path=/',
      'SameSite=Strict',
      'Max-Age=0',
      'Expires=Thu, 01 Jan 1970 00:00:00 GMT',
      ...(isProduction ? ['Secure'] : []),
    ];
    reply.header('Set-Cookie', cookieOptions.join('; '));
  }

  // ------------------------------------------
  // AUTHENTICATION ENDPOINTS
  // ------------------------------------------

  public static async login(request: FastifyRequest, reply: FastifyReply) {
    const body = (request.body || {}) as AdminLoginRequestDTO;
    const ip = request.ip || '127.0.0.1';
    const userAgent = request.headers['user-agent'] as string;
    const requestId = request.headers['x-request-id'] as string;
    const correlationId = request.headers['x-correlation-id'] as string;

    const result = await AdminAuthService.login(body, {
      ip,
      userAgent,
      requestId,
      correlationId,
    });

    if (!result.success) {
      if (result.mfa_required) {
        return reply.status(200).send(result);
      }
      return reply.status(401).send({
        success: false,
        error: { code: 'AUTHENTICATION_FAILED', message: result.message || 'Invalid administrator credentials.' },
      });
    }

    if (result.session_token) {
      const maxAge = body.remember_me ? 7 * 24 * 3600 : 12 * 3600;
      AdminAuthController.setAdminSessionCookie(reply, result.session_token, maxAge);
    }

    return reply.status(200).send(result);
  }

  public static async getSession(request: FastifyRequest, reply: FastifyReply) {
    const token = extractAdminToken(request);
    if (!token) {
      return reply.status(401).send({
        success: false,
        authenticated: false,
        error: { code: 'UNAUTHORIZED_ADMIN', message: 'No active administrator session.' },
      });
    }

    const validation = await AdminAuthService.validateSession(token, {
      ip: request.ip,
      userAgent: request.headers['user-agent'] as string,
    });

    if (!validation.valid || !validation.session || !validation.admin) {
      AdminAuthController.clearAdminSessionCookie(reply);
      return reply.status(401).send({
        success: false,
        authenticated: false,
        error: { code: 'SESSION_INVALID', message: validation.reason || 'Admin session is invalid or expired.' },
      });
    }

    const mfaStatus = await AdminMfaService.getMfaStatus(validation.admin.id);

    return reply.status(200).send({
      success: true,
      authenticated: true,
      session: validation.session,
      admin: validation.admin,
      mfa_state: mfaStatus.status,
    });
  }

  public static async logout(request: FastifyRequest, reply: FastifyReply) {
    const token = extractAdminToken(request);
    if (token) {
      await AdminAuthService.logout(token, {
        ip: request.ip,
        userAgent: request.headers['user-agent'] as string,
        requestId: request.headers['x-request-id'] as string,
        correlationId: request.headers['x-correlation-id'] as string,
      });
    }

    AdminAuthController.clearAdminSessionCookie(reply);
    return reply.status(200).send({ success: true, message: 'Logged out successfully.' });
  }

  public static async logoutAll(request: FastifyRequest, reply: FastifyReply) {
    if (!request.user) {
      return reply.status(401).send({ success: false, error: { code: 'UNAUTHORIZED' } });
    }

    const result = await AdminAuthService.logoutAll(request.user.userId, request.user.userId, {
      ip: request.ip,
      userAgent: request.headers['user-agent'] as string,
    });

    AdminAuthController.clearAdminSessionCookie(reply);
    return reply.status(200).send({
      success: true,
      revoked_sessions_count: result.revokedCount,
      message: 'All administrator sessions revoked.',
    });
  }

  public static async listSessions(request: FastifyRequest, reply: FastifyReply) {
    if (!request.user) {
      return reply.status(401).send({ success: false, error: { code: 'UNAUTHORIZED' } });
    }

    const currentToken = extractAdminToken(request) || undefined;
    const sessions = await AdminAuthService.listActiveSessions(request.user.userId, currentToken);
    return reply.status(200).send({ success: true, sessions });
  }

  public static async revokeSession(request: FastifyRequest, reply: FastifyReply) {
    if (!request.user) {
      return reply.status(401).send({ success: false, error: { code: 'UNAUTHORIZED' } });
    }

    const params = request.params as { id: string };
    const result = await AdminAuthService.revokeSessionById(request.user.userId, params.id, request.user.role);
    return reply.status(200).send(result);
  }

  // ------------------------------------------
  // MFA ENDPOINTS
  // ------------------------------------------

  public static async verifyMfa(request: FastifyRequest, reply: FastifyReply) {
    const body = (request.body || {}) as AdminMfaVerifyRequestDTO;
    const token = body.session_token || extractAdminToken(request);

    let adminUserId: string | null = null;
    if (request.user) {
      adminUserId = request.user.userId;
    } else if (token) {
      const val = await AdminAuthService.validateSession(token);
      if (val.admin) adminUserId = val.admin.id;
    }

    if (!adminUserId) {
      return reply.status(401).send({
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'No administrator context found for MFA verification.' },
      });
    }

    const result = await AdminMfaService.verifyMfaCode(adminUserId, body.mfa_code, body.is_recovery_code);
    if (!result.success) {
      return reply.status(400).send({
        success: false,
        error: { code: 'MFA_FAILED', message: result.message || 'Invalid MFA code.' },
      });
    }

    return reply.status(200).send({ success: true, message: 'MFA verified successfully.' });
  }

  public static async enrollMfa(request: FastifyRequest, reply: FastifyReply) {
    if (!request.user) {
      return reply.status(401).send({ success: false, error: { code: 'UNAUTHORIZED' } });
    }

    const enrollment = await AdminMfaService.initiateEnrollment(request.user.userId, request.user.email);
    return reply.status(200).send({ success: true, ...enrollment });
  }

  public static async confirmMfa(request: FastifyRequest, reply: FastifyReply) {
    if (!request.user) {
      return reply.status(401).send({ success: false, error: { code: 'UNAUTHORIZED' } });
    }

    const body = (request.body || {}) as { code: string; enforce?: boolean };
    const result = await AdminMfaService.confirmEnrollment(request.user.userId, body.code, body.enforce);

    if (!result.success) {
      return reply.status(400).send({ success: false, error: { code: 'MFA_CONFIRM_FAILED', message: result.message } });
    }

    return reply.status(200).send({ success: true, message: 'MFA enrolled and activated.' });
  }

  public static async disableMfa(request: FastifyRequest, reply: FastifyReply) {
    if (!request.user) {
      return reply.status(401).send({ success: false, error: { code: 'UNAUTHORIZED' } });
    }

    const result = await AdminMfaService.disableMfa(request.user.userId, request.user.userId);
    return reply.status(200).send(result);
  }

  // ------------------------------------------
  // PASSWORD RESET ENDPOINTS
  // ------------------------------------------

  public static async forgotPassword(request: FastifyRequest, reply: FastifyReply) {
    const body = (request.body || {}) as AdminPasswordResetRequestDTO;
    const result = await AdminAuthService.requestPasswordReset(body.email, {
      ip: request.ip,
      userAgent: request.headers['user-agent'] as string,
    });
    return reply.status(200).send(result);
  }

  public static async resetPassword(request: FastifyRequest, reply: FastifyReply) {
    const body = (request.body || {}) as AdminPasswordResetExecuteDTO;
    const result = await AdminAuthService.executePasswordReset(body.token, body.new_password, {
      ip: request.ip,
      userAgent: request.headers['user-agent'] as string,
    });

    if (!result.success) {
      return reply.status(400).send({ success: false, error: { code: 'RESET_FAILED', message: result.message } });
    }

    return reply.status(200).send(result);
  }

  // ------------------------------------------
  // INVITATION ENDPOINTS
  // ------------------------------------------

  public static async createInvitation(request: FastifyRequest, reply: FastifyReply) {
    if (!request.user || request.user.role !== UserRole.SUPER_ADMIN) {
      return reply.status(403).send({
        success: false,
        error: { code: 'FORBIDDEN', message: 'Only SUPER_ADMIN can invite new platform administrators.' },
      });
    }

    const body = (request.body || {}) as AdminInvitationCreateDTO;
    const result = await AdminAuthService.createInvitation(body.email, body.role, request.user.userId, {
      ip: request.ip,
      userAgent: request.headers['user-agent'] as string,
    });

    if (!result.success) {
      return reply.status(400).send({ success: false, error: { code: 'INVITATION_FAILED', message: result.message } });
    }

    return reply.status(201).send(result);
  }

  public static async acceptInvitation(request: FastifyRequest, reply: FastifyReply) {
    const body = (request.body || {}) as AdminInvitationAcceptDTO;
    const result = await AdminAuthService.acceptInvitation(body.token, body.name, body.password, {
      ip: request.ip,
      userAgent: request.headers['user-agent'] as string,
    });

    if (!result.success) {
      return reply.status(400).send({ success: false, error: { code: 'INVITATION_ACCEPT_FAILED', message: result.message } });
    }

    return reply.status(200).send(result);
  }

  // ------------------------------------------
  // SECURITY STATS
  // ------------------------------------------

  public static async getSecurityStats(request: FastifyRequest, reply: FastifyReply) {
    const stats = await AdminAuthService.getSecurityStats();
    return reply.status(200).send({ success: true, stats });
  }
}
