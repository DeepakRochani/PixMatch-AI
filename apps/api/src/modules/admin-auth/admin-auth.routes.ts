import { FastifyInstance } from 'fastify';
import { AdminAuthController } from './admin-auth.controller.js';
import {
  requirePlatformAdminSession,
  adminSecurityHeaders,
} from './admin-auth.middleware.js';

export async function adminAuthRoutes(fastify: FastifyInstance) {
  // Apply admin security headers (no-store, nosniff, DENY, no-referrer)
  fastify.addHook('preHandler', adminSecurityHeaders);

  // ------------------------------------------
  // PUBLIC ADMIN AUTH ROUTES
  // ------------------------------------------
  fastify.post('/login', AdminAuthController.login);
  fastify.get('/session', AdminAuthController.getSession);
  fastify.post('/logout', AdminAuthController.logout);
  fastify.post('/forgot-password', AdminAuthController.forgotPassword);
  fastify.post('/reset-password', AdminAuthController.resetPassword);
  fastify.post('/invitations/accept', AdminAuthController.acceptInvitation);
  fastify.get('/security-stats', AdminAuthController.getSecurityStats);

  // ------------------------------------------
  // PROTECTED ADMIN AUTH & SESSION ROUTES
  // ------------------------------------------
  fastify.post('/logout-all', { preHandler: [requirePlatformAdminSession] }, AdminAuthController.logoutAll);
  fastify.get('/sessions', { preHandler: [requirePlatformAdminSession] }, AdminAuthController.listSessions);
  fastify.post('/sessions/:id/revoke', { preHandler: [requirePlatformAdminSession] }, AdminAuthController.revokeSession);

  // ------------------------------------------
  // PROTECTED MFA ROUTES
  // ------------------------------------------
  fastify.post('/mfa/verify', AdminAuthController.verifyMfa);
  fastify.post('/mfa/enroll', { preHandler: [requirePlatformAdminSession] }, AdminAuthController.enrollMfa);
  fastify.post('/mfa/confirm', { preHandler: [requirePlatformAdminSession] }, AdminAuthController.confirmMfa);
  fastify.post('/mfa/disable', { preHandler: [requirePlatformAdminSession] }, AdminAuthController.disableMfa);

  // ------------------------------------------
  // PROTECTED INVITATION MANAGEMENT
  // ------------------------------------------
  fastify.post('/invitations', { preHandler: [requirePlatformAdminSession] }, AdminAuthController.createInvitation);
}
