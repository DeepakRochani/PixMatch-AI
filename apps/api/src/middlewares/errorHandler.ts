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

  // Explicitly handle database configuration / missing DATABASE_URL errors
  if (
    error.name === 'PrismaClientInitializationError' ||
    error.message?.includes('DATABASE_URL') ||
    error.message?.includes('Environment variable not found: DATABASE_URL')
  ) {
    return reply.status(503).send({
      success: false,
      error: {
        code: 'DATABASE_UNAVAILABLE',
        message: 'The requested operation could not be completed because the server database configuration is unavailable.',
      },
    });
  }

  // Sanitize internal Prisma schema / validation details
  if (
    error.name === 'PrismaClientValidationError' ||
    error.name === 'PrismaClientKnownRequestError' ||
    error.message?.includes('schema.prisma') ||
    error.message?.includes('.prisma')
  ) {
    return reply.status(500).send({
      success: false,
      error: {
        code: 'DATABASE_ERROR',
        message: 'A database operation could not be completed. Please try again or contact support.',
      },
    });
  }

  // Mask internal 500 details to prevent leaking connection strings, stack traces, or source paths
  let safeMessage = error.message || 'An unexpected server error occurred';
  if (statusCode === 500 || isProd) {
    if (
      isProd ||
      safeMessage.includes('node_modules') ||
      safeMessage.includes('.ts:') ||
      safeMessage.includes('hashPassword') ||
      safeMessage.includes('password_hash') ||
      safeMessage.includes('/Users/') ||
      safeMessage.includes('/var/task/')
    ) {
      safeMessage = 'An internal server error occurred. Please try again or contact support.';
    }
  }

  return reply.status(statusCode).send({
    success: false,
    error: {
      code: error.code || (statusCode === 500 ? 'INTERNAL_SERVER_ERROR' : 'REQUEST_ERROR'),
      message: safeMessage,
    },
  });
}
