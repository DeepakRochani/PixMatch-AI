import { FastifyRequest, FastifyReply } from 'fastify';
import { hasAdminPermission, verifyAccessToken, isPlatformAdmin } from '@pixmatch/auth';
import { AdminPermission, UserRole, AdminSessionDTO, AuthTokenPayload } from '@pixmatch/types';
import { AdminAuthService } from './admin-auth.service.js';

declare module 'fastify' {
  interface FastifyRequest {
    adminSession?: AdminSessionDTO;
  }
}

/**
 * Extracts admin session token from either:
 * 1. Dedicated admin cookie: `pixmatch_admin_session`
 * 2. Authorization header: `Bearer <token>`
 */
export function extractAdminToken(request: FastifyRequest): string | null {
  // 1. Check cookies if cookie parser is available
  const cookieHeader = request.headers.cookie;
  if (cookieHeader) {
    const cookies = cookieHeader.split(';').reduce((acc, c) => {
      const [key, val] = c.trim().split('=');
      if (key && val) acc[key] = decodeURIComponent(val);
      return acc;
    }, {} as Record<string, string>);

    if (cookies['pixmatch_admin_session']) {
      return cookies['pixmatch_admin_session'];
    }
  }

  // 2. Check Authorization header
  const authHeader = request.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.split(' ')[1];
  }

  return null;
}

/**
 * Server-side Route Guard for all Platform Admin operations
 */
export async function requirePlatformAdminSession(request: FastifyRequest, reply: FastifyReply) {
  const token = extractAdminToken(request);

  if (!token) {
    return reply.status(401).send({
      success: false,
      error: {
        code: 'UNAUTHORIZED_ADMIN',
        message: 'Platform administrator authentication required. Missing admin session.',
      },
    });
  }

  // 1. Attempt validation as Phase 42 Admin Session
  const sessionValidation = await AdminAuthService.validateSession(token, {
    ip: request.ip,
    userAgent: request.headers['user-agent'] as string,
  });

  if (sessionValidation.valid && sessionValidation.session && sessionValidation.admin) {
    request.adminSession = sessionValidation.session;
    request.user = {
      userId: sessionValidation.admin.id,
      email: sessionValidation.admin.email,
      role: sessionValidation.admin.role as UserRole,
      studioId: undefined, // Platform Administrators have global scope
    };
    return;
  }

  // 2. Backward-compatible fallback for Legacy Super Admin JWTs (if role is Platform Admin)
  const legacyPayload = verifyAccessToken(token);
  if (legacyPayload && isPlatformAdmin(legacyPayload.role)) {
    request.user = legacyPayload;
    return;
  }

  // 3. Reject normal user sessions / studio member tokens / expired tokens
  return reply.status(401).send({
    success: false,
    error: {
      code: 'INVALID_ADMIN_SESSION',
      message: sessionValidation.reason || 'Admin session is invalid, expired, or revoked.',
    },
  });
}

/**
 * Granular Permission Guard for Platform Admin Routes
 */
export function requirePlatformAdminPermission(permission: AdminPermission) {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    // 1. Ensure platform admin session is authenticated
    if (!request.user || !isPlatformAdmin(request.user.role)) {
      await requirePlatformAdminSession(request, reply);
      if (reply.sent) return;
    }

    if (!request.user) {
      return reply.status(401).send({
        success: false,
        error: { code: 'UNAUTHORIZED_ADMIN', message: 'Authentication required.' },
      });
    }

    // 2. Super Admin bypasses all individual permission checks
    if (request.user.role === UserRole.SUPER_ADMIN) {
      return;
    }

    // 3. Verify specific permission
    if (!hasAdminPermission(request.user.role, permission)) {
      return reply.status(403).send({
        success: false,
        error: {
          code: 'FORBIDDEN_ADMIN_PERMISSION',
          message: `Access denied. Administrator requires platform permission: ${permission}.`,
        },
      });
    }
  };
}

/**
 * Any-of Permission Guard for Platform Admin Routes
 */
export function requireAnyPlatformAdminPermission(permissions: AdminPermission[]) {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    if (!request.user || !isPlatformAdmin(request.user.role)) {
      await requirePlatformAdminSession(request, reply);
      if (reply.sent) return;
    }

    if (!request.user) {
      return reply.status(401).send({
        success: false,
        error: { code: 'UNAUTHORIZED_ADMIN', message: 'Authentication required.' },
      });
    }

    if (request.user.role === UserRole.SUPER_ADMIN) {
      return;
    }

    const hasAny = permissions.some((p) => hasAdminPermission(request.user!.role, p));
    if (!hasAny) {
      return reply.status(403).send({
        success: false,
        error: {
          code: 'FORBIDDEN_ADMIN_PERMISSION',
          message: `Access denied. Administrator requires one of permissions: ${permissions.join(', ')}.`,
        },
      });
    }
  };
}

/**
 * Security Headers for Administrator Endpoints
 */
export async function adminSecurityHeaders(_request: FastifyRequest, reply: FastifyReply) {
  reply.header('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  reply.header('Pragma', 'no-cache');
  reply.header('Expires', '0');
  reply.header('X-Content-Type-Options', 'nosniff');
  reply.header('X-Frame-Options', 'DENY');
  reply.header('Referrer-Policy', 'no-referrer');
}
