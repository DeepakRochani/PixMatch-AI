import { FastifyRequest, FastifyReply } from 'fastify';
import { verifyAccessToken, hasAdminPermission } from '@pixmatch/auth';
import { AuthTokenPayload, UserRole, AdminPermission } from '@pixmatch/types';

declare module 'fastify' {
  interface FastifyRequest {
    user?: AuthTokenPayload;
  }
}

export async function authenticate(request: FastifyRequest, reply: FastifyReply) {
  const authHeader = request.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return reply.status(401).send({
      success: false,
      error: { code: 'UNAUTHORIZED', message: 'Authentication required. Missing Bearer token.' },
    });
  }

  const token = authHeader.split(' ')[1];
  const payload = verifyAccessToken(token);

  if (!payload) {
    return reply.status(401).send({
      success: false,
      error: { code: 'INVALID_TOKEN', message: 'Token is invalid or expired.' },
    });
  }

  request.user = payload;
}

export function requireRole(allowedRoles: UserRole[]) {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    if (!request.user) {
      return reply.status(401).send({
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'Authentication required.' },
      });
    }

    if (!allowedRoles.includes(request.user.role)) {
      return reply.status(403).send({
        success: false,
        error: {
          code: 'FORBIDDEN',
          message: `Access denied. Requires role: ${allowedRoles.join(' or ')}.`,
        },
      });
    }
  };
}

export async function requireSuperAdmin(request: FastifyRequest, reply: FastifyReply) {
  if (!request.user) {
    return reply.status(401).send({
      success: false,
      error: { code: 'UNAUTHORIZED', message: 'Authentication required.' },
    });
  }

  if (request.user.role !== UserRole.SUPER_ADMIN) {
    return reply.status(403).send({
      success: false,
      error: {
        code: 'FORBIDDEN',
        message: 'Access denied. Requires SUPER_ADMIN privileges.',
      },
    });
  }
}

export function requireAdminPermission(permission: AdminPermission) {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    if (!request.user) {
      return reply.status(401).send({
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'Authentication required.' },
      });
    }

    if (!hasAdminPermission(request.user.role, permission)) {
      return reply.status(403).send({
        success: false,
        error: {
          code: 'FORBIDDEN',
          message: `Access denied. Requires platform permission: ${permission}.`,
        },
      });
    }
  };
}

export function requireAnyAdminPermission(permissions: AdminPermission[]) {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    if (!request.user) {
      return reply.status(401).send({
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'Authentication required.' },
      });
    }

    const hasAny = permissions.some((p) => hasAdminPermission(request.user!.role, p));
    if (!hasAny) {
      return reply.status(403).send({
        success: false,
        error: {
          code: 'FORBIDDEN',
          message: `Access denied. Requires one of permissions: ${permissions.join(', ')}.`,
        },
      });
    }
  };
}


