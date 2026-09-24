/**
 * Public Portal Routes — PixMatch AI Phase 21
 * No authentication required — uses cryptographic token verification.
 */

import { FastifyInstance } from 'fastify';
import { PublicPortalController } from './public-portal.controller.js';

export async function publicPortalRoutes(app: FastifyInstance) {
  // Public Proposals
  app.get('/proposal/:token', PublicPortalController.getProposal);
  app.post('/proposal/:token/accept', PublicPortalController.acceptProposal);
  app.post('/proposal/:token/reject', PublicPortalController.rejectProposal);

  // Public Contracts
  app.get('/contract/:token', PublicPortalController.getContract);
  app.post('/contract/:token/sign', PublicPortalController.signContract);
  app.post('/contract/:token/reject', PublicPortalController.rejectContract);

  // Public Booking
  app.get('/booking/:token', PublicPortalController.getBooking);
}
