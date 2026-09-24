/**
 * Proposals Routes — PixMatch AI Phase 21
 */

import { FastifyInstance } from 'fastify';
import { ProposalsController } from './proposals.controller.js';
import { authenticate } from '../../middlewares/auth.js';

export async function proposalsRoutes(app: FastifyInstance) {
  app.register(async (authed) => {
    authed.addHook('onRequest', authenticate);

    authed.get('/', ProposalsController.listProposals);
    authed.get('/:id', ProposalsController.getProposal);
    authed.post('/', ProposalsController.createProposal);
    authed.patch('/:id', ProposalsController.updateProposal);
    authed.post('/:id/send', ProposalsController.sendProposal);
    authed.post('/:id/void', ProposalsController.voidProposal);
    authed.post('/:id/duplicate', ProposalsController.duplicateProposal);
    authed.delete('/:id', ProposalsController.deleteProposal);
  });
}
