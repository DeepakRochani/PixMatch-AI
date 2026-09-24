import { FastifyError, FastifyRequest, FastifyReply } from 'fastify';
import { ZodError } from 'zod';
import { TenantIsolationError } from '@pixmatch/auth';

export function errorHandler(error: FastifyError, request: FastifyRequest, reply: FastifyReply) {
  // Log error internally with sanitized context
  request.log.error(error);

  if (error instanceof ZodError) {
    return reply.status(400).send({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Invalid request input data',
        details: error.flatten().fieldErrors,
      },
    });
  }

  if (error instanceof TenantIsolationError) {
    return reply.status(403).send({
      success: false,
      error: {
        code: 'TENANT_VIOLATION',
        message: error.message,
      },
    });
  }

  const statusCode = error.statusCode || 500;
  const isProd = process.env.NODE_ENV === 'production';

  // In production, mask internal 500 details to prevent leaking connection strings, stack traces, or paths
  let safeMessage = error.message || 'An unexpected server error occurred';
  if (statusCode === 500 && isProd) {
    safeMessage = 'An internal server error occurred. Please try again or contact support.';
  }

  return reply.status(statusCode).send({
    success: false,
    error: {
      code: error.code || (statusCode === 500 ? 'INTERNAL_SERVER_ERROR' : 'REQUEST_ERROR'),
      message: safeMessage,
    },
  });
}
