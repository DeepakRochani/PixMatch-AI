/**
 * Proofing Routes — PixMatch AI Phase 25
 * Registers Fastify endpoints for public client portal and authenticated studio proofing manager.
 */

import { FastifyInstance } from 'fastify';
import { authenticate } from '../../middlewares/auth.js';
import { ProofingController } from './proofing.controller.js';

export async function proofingRoutes(app: FastifyInstance) {
  // -------------------------------------------------------------
  // PUBLIC CLIENT PROOFING PORTAL ROUTES (Token Authenticated)
  // -------------------------------------------------------------
  app.get('/public/session/:token', ProofingController.getPublicSession);
  app.post('/public/session/:token/verify-pin', ProofingController.verifyPublicPin);
  app.post('/public/session/:token/items/:itemId/toggle', ProofingController.togglePublicItem);
  app.post('/public/session/:token/items/bulk-toggle', ProofingController.bulkTogglePublicItems);
  app.post('/public/session/:token/items/:itemId/comments', ProofingController.addPublicComment);
  app.get('/public/session/:token/items/:itemId/comments', ProofingController.getPublicItemComments);
  app.post('/public/session/:token/compare', ProofingController.createPublicComparison);
  app.post('/public/session/:token/compare/:comparisonId/winner', ProofingController.selectComparisonWinner);
  app.post('/public/session/:token/submit', ProofingController.submitPublicSelections);

  // -------------------------------------------------------------
  // AUTHENTICATED STUDIO PROOFING MANAGEMENT
  // -------------------------------------------------------------
  app.register(async (authed) => {
    authed.addHook('onRequest', authenticate);

    // Studio Overview & Sessions
    authed.get('/summary', ProofingController.getSummary);
    authed.get('/sessions', ProofingController.listSessions);
    authed.post('/sessions', ProofingController.createSession);
    authed.get('/sessions/:id', ProofingController.getSession);
    authed.put('/sessions/:id', ProofingController.updateSession);
    authed.delete('/sessions/:id', ProofingController.deleteSession);

    // Rules & Quotas
    authed.put('/sessions/:id/rules', ProofingController.updateRules);
    authed.get('/sessions/:id/quota', ProofingController.getSessionQuota);

    // Photographer Review & Decision
    authed.post('/sessions/:id/review', ProofingController.reviewSelections);

    // Audit Log & Comment Resolution
    authed.get('/sessions/:id/audit-log', ProofingController.getAuditLog);
    authed.patch('/comments/:commentId/resolve', ProofingController.resolveComment);
  });
}
