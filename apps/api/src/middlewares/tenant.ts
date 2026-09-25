import { FastifyRequest, FastifyReply } from 'fastify';
import { assertTenantAccess, isPlatformAdmin } from '@pixmatch/auth';
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

  // Determine requested studio ID:
  // For Super Admins / Platform Admins, allow header / query param to inspect another tenant
  // For regular studio users, prioritize their verified authenticated studioId from token
  let requestedStudioId: string | undefined;

  if (isPlatformAdmin(request.user.role)) {
    requestedStudioId =
      (request.headers['x-studio-id'] as string) ||
      (request.query as { studioId?: string })?.studioId ||
      request.user.studioId;
  } else {
    // For regular users, prioritize token's verified studioId over client-supplied header
    requestedStudioId =
      request.user.studioId ||
      (request.headers['x-studio-id'] as string) ||
      (request.query as { studioId?: string })?.studioId;
  }

  if (!requestedStudioId && !isPlatformAdmin(request.user.role)) {
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
