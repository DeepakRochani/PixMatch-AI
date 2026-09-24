import { FastifyRequest, FastifyReply } from 'fastify';
import { assertTenantAccess } from '@pixmatch/auth';
import { UserRole } from '@pixmatch/types';

declare module 'fastify' {
  interface FastifyRequest {
    studioId?: string;
  }
}

export async function requireTenant(request: FastifyRequest, reply: FastifyReply) {
  if (!request.user) {
    return reply.status(401).send({
      success: false,
      error: { code: 'UNAUTHORIZED', message: 'Authentication required' },
    });
  }

  // Super Admin can pass studioId as query or header, or fallback to user studioId
  const requestedStudioId =
    (request.headers['x-studio-id'] as string) ||
    (request.query as { studioId?: string })?.studioId ||
    request.user.studioId;

  if (!requestedStudioId && request.user.role !== UserRole.SUPER_ADMIN) {
    return reply.status(400).send({
      success: false,
      error: { code: 'STUDIO_REQUIRED', message: 'No active studio associated with this request' },
    });
  }

  if (requestedStudioId) {
    try {
      assertTenantAccess(request.user, requestedStudioId);
      request.studioId = requestedStudioId;
    } catch (err: unknown) {
      return reply.status(403).send({
        success: false,
        error: { code: 'TENANT_VIOLATION', message: err instanceof Error ? err.message : 'Tenant access denied' },
      });
    }
  }
}
