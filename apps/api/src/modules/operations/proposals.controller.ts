/**
 * Proposals Controller — PixMatch AI Phase 21
 * REST endpoints for managing quotes, revisions, itemized deliverables, and proposal sharing.
 */

import { FastifyRequest, FastifyReply } from 'fastify';
import { ProposalService } from './proposal.service.js';

export class ProposalsController {
  private static getStudioId(req: FastifyRequest): string {
    const studioId =
      (req.headers['x-studio-id'] as string) ||
      (req.user as any)?.studio_id ||
      (req.user as any)?.studioId ||
      (req.query as any)?.studio_id ||
      (req.query as any)?.studioId ||
      (req.body as any)?.studio_id;

    if (!studioId) {
      throw new Error('Studio ID is required');
    }
    return studioId;
  }

  private static getUserId(req: FastifyRequest): string {
    return (req.user as any)?.id || (req.user as any)?.userId || null;
  }

  static async listProposals(req: FastifyRequest, reply: FastifyReply) {
    try {
      const studioId = ProposalsController.getStudioId(req);
      const query = req.query as any;
      const result = await ProposalService.listProposals(studioId, query);
      return reply.send({ success: true, data: result.proposals, total: result.total, page: result.page, limit: result.limit });
    } catch (err: any) {
      return reply.status(400).send({ success: false, error: err.message });
    }
  }

  static async getProposal(req: FastifyRequest, reply: FastifyReply) {
    try {
      const studioId = ProposalsController.getStudioId(req);
      const { id } = req.params as { id: string };
      const proposal = await ProposalService.getProposal(studioId, id);
      return reply.send({ success: true, data: proposal });
    } catch (err: any) {
      return reply.status(404).send({ success: false, error: err.message });
    }
  }

  static async createProposal(req: FastifyRequest, reply: FastifyReply) {
    try {
      const studioId = ProposalsController.getStudioId(req);
      const userId = ProposalsController.getUserId(req);
      const body = req.body as any;
      const proposal = await ProposalService.createProposal(studioId, userId, body);
      return reply.status(201).send({ success: true, data: proposal });
    } catch (err: any) {
      return reply.status(400).send({ success: false, error: err.message });
    }
  }

  static async updateProposal(req: FastifyRequest, reply: FastifyReply) {
    try {
      const studioId = ProposalsController.getStudioId(req);
      const userId = ProposalsController.getUserId(req);
      const { id } = req.params as { id: string };
      const body = req.body as any;
      const proposal = await ProposalService.updateProposal(studioId, userId, id, body);
      return reply.send({ success: true, data: proposal });
    } catch (err: any) {
      return reply.status(400).send({ success: false, error: err.message });
    }
  }

  static async sendProposal(req: FastifyRequest, reply: FastifyReply) {
    try {
      const studioId = ProposalsController.getStudioId(req);
      const { id } = req.params as { id: string };
      const body = (req.body as any) || {};
      const result = await ProposalService.sendProposal(studioId, id, body);
      return reply.send({ success: true, data: result.proposal, public_url: result.public_url, token: result.token });
    } catch (err: any) {
      return reply.status(400).send({ success: false, error: err.message });
    }
  }

  static async voidProposal(req: FastifyRequest, reply: FastifyReply) {
    try {
      const studioId = ProposalsController.getStudioId(req);
      const { id } = req.params as { id: string };
      const { reason } = (req.body as any) || {};
      const proposal = await ProposalService.voidProposal(studioId, id, reason);
      return reply.send({ success: true, data: proposal });
    } catch (err: any) {
      return reply.status(400).send({ success: false, error: err.message });
    }
  }

  static async duplicateProposal(req: FastifyRequest, reply: FastifyReply) {
    try {
      const studioId = ProposalsController.getStudioId(req);
      const userId = ProposalsController.getUserId(req);
      const { id } = req.params as { id: string };
      const proposal = await ProposalService.duplicateProposal(studioId, userId, id);
      return reply.status(201).send({ success: true, data: proposal });
    } catch (err: any) {
      return reply.status(400).send({ success: false, error: err.message });
    }
  }

  static async deleteProposal(req: FastifyRequest, reply: FastifyReply) {
    try {
      const studioId = ProposalsController.getStudioId(req);
      const { id } = req.params as { id: string };
      await ProposalService.deleteProposal(studioId, id);
      return reply.send({ success: true, message: 'Proposal deleted successfully' });
    } catch (err: any) {
      return reply.status(400).send({ success: false, error: err.message });
    }
  }
}
