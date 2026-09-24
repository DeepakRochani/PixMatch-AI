/**
 * Public Portal Controller — PixMatch AI Phase 21
 * Public endpoints for clients to view/accept proposals, sign contracts, and view bookings without logging in.
 */

import { FastifyRequest, FastifyReply } from 'fastify';
import { PublicPortalService } from './public-portal.service.js';

export class PublicPortalController {
  private static getClientIp(req: FastifyRequest): string {
    return (
      (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ||
      req.ip ||
      '127.0.0.1'
    );
  }

  private static getUserAgent(req: FastifyRequest): string {
    return req.headers['user-agent'] || 'Unknown Client';
  }

  // --- Public Proposals ---
  static async getProposal(req: FastifyRequest, reply: FastifyReply) {
    try {
      const { token } = req.params as { token: string };
      const ip = PublicPortalController.getClientIp(req);
      const ua = PublicPortalController.getUserAgent(req);
      const data = await PublicPortalService.getProposalByToken(token, ip, ua);
      return reply.send({ success: true, data });
    } catch (err: any) {
      return reply.status(404).send({ success: false, error: err.message });
    }
  }

  static async acceptProposal(req: FastifyRequest, reply: FastifyReply) {
    try {
      const { token } = req.params as { token: string };
      const ip = PublicPortalController.getClientIp(req);
      const ua = PublicPortalController.getUserAgent(req);
      const body = req.body as any;
      const data = await PublicPortalService.acceptProposalByToken(token, body, ip, ua);
      return reply.send({ success: true, data, message: 'Proposal accepted successfully!' });
    } catch (err: any) {
      return reply.status(400).send({ success: false, error: err.message });
    }
  }

  static async rejectProposal(req: FastifyRequest, reply: FastifyReply) {
    try {
      const { token } = req.params as { token: string };
      const ip = PublicPortalController.getClientIp(req);
      const ua = PublicPortalController.getUserAgent(req);
      const body = req.body as any;
      const result = await PublicPortalService.rejectProposalByToken(token, body, ip, ua);
      return reply.send({ success: true, message: result.message });
    } catch (err: any) {
      return reply.status(400).send({ success: false, error: err.message });
    }
  }

  // --- Public Contracts ---
  static async getContract(req: FastifyRequest, reply: FastifyReply) {
    try {
      const { token } = req.params as { token: string };
      const ip = PublicPortalController.getClientIp(req);
      const ua = PublicPortalController.getUserAgent(req);
      const data = await PublicPortalService.getContractByToken(token, ip, ua);
      return reply.send({ success: true, data });
    } catch (err: any) {
      return reply.status(404).send({ success: false, error: err.message });
    }
  }

  static async signContract(req: FastifyRequest, reply: FastifyReply) {
    try {
      const { token } = req.params as { token: string };
      const ip = PublicPortalController.getClientIp(req);
      const ua = PublicPortalController.getUserAgent(req);
      const body = req.body as any;
      const data = await PublicPortalService.signContractByToken(token, body, ip, ua);
      return reply.send({ success: true, data, message: 'Contract signed and verified successfully!' });
    } catch (err: any) {
      return reply.status(400).send({ success: false, error: err.message });
    }
  }

  static async rejectContract(req: FastifyRequest, reply: FastifyReply) {
    try {
      const { token } = req.params as { token: string };
      const body = req.body as any;
      const result = await PublicPortalService.rejectContractByToken(token, body);
      return reply.send({ success: true, message: result.message });
    } catch (err: any) {
      return reply.status(400).send({ success: false, error: err.message });
    }
  }

  // --- Public Booking ---
  static async getBooking(req: FastifyRequest, reply: FastifyReply) {
    try {
      const { token } = req.params as { token: string };
      const data = await PublicPortalService.getBookingByToken(token);
      return reply.send({ success: true, data });
    } catch (err: any) {
      return reply.status(404).send({ success: false, error: err.message });
    }
  }
}
