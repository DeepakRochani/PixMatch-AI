/**
 * Contracts Controller — PixMatch AI Phase 21
 * REST endpoints for managing legal agreements, contract templates, and signatures.
 */

import { FastifyRequest, FastifyReply } from 'fastify';
import { ContractService } from './contract.service.js';

export class ContractsController {
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
    return (req.user as any)?.id || (req.user as any)?.userId || 'system-user';
  }

  // --- Templates ---
  static async listTemplates(req: FastifyRequest, reply: FastifyReply) {
    try {
      const studioId = ContractsController.getStudioId(req);
      const { category } = (req.query as any) || {};
      const templates = await ContractService.listTemplates(studioId, category);
      return reply.send({ success: true, data: templates });
    } catch (err: any) {
      return reply.status(400).send({ success: false, error: err.message });
    }
  }

  static async getTemplate(req: FastifyRequest, reply: FastifyReply) {
    try {
      const studioId = ContractsController.getStudioId(req);
      const { id } = req.params as { id: string };
      const template = await ContractService.getTemplate(studioId, id);
      return reply.send({ success: true, data: template });
    } catch (err: any) {
      return reply.status(404).send({ success: false, error: err.message });
    }
  }

  static async createTemplate(req: FastifyRequest, reply: FastifyReply) {
    try {
      const studioId = ContractsController.getStudioId(req);
      const body = req.body as any;
      const template = await ContractService.createTemplate(studioId, body);
      return reply.status(201).send({ success: true, data: template });
    } catch (err: any) {
      return reply.status(400).send({ success: false, error: err.message });
    }
  }

  static async updateTemplate(req: FastifyRequest, reply: FastifyReply) {
    try {
      const studioId = ContractsController.getStudioId(req);
      const { id } = req.params as { id: string };
      const body = req.body as any;
      const template = await ContractService.updateTemplate(studioId, id, body);
      return reply.send({ success: true, data: template });
    } catch (err: any) {
      return reply.status(400).send({ success: false, error: err.message });
    }
  }

  static async deleteTemplate(req: FastifyRequest, reply: FastifyReply) {
    try {
      const studioId = ContractsController.getStudioId(req);
      const { id } = req.params as { id: string };
      await ContractService.deleteTemplate(studioId, id);
      return reply.send({ success: true, message: 'Template deleted successfully' });
    } catch (err: any) {
      return reply.status(400).send({ success: false, error: err.message });
    }
  }

  // --- Contracts ---
  static async listContracts(req: FastifyRequest, reply: FastifyReply) {
    try {
      const studioId = ContractsController.getStudioId(req);
      const query = req.query as any;
      const result = await ContractService.listContracts(studioId, query);
      return reply.send({ success: true, data: result.contracts, total: result.total, page: result.page, limit: result.limit });
    } catch (err: any) {
      return reply.status(400).send({ success: false, error: err.message });
    }
  }

  static async getContract(req: FastifyRequest, reply: FastifyReply) {
    try {
      const studioId = ContractsController.getStudioId(req);
      const { id } = req.params as { id: string };
      const contract = await ContractService.getContract(studioId, id);
      return reply.send({ success: true, data: contract });
    } catch (err: any) {
      return reply.status(404).send({ success: false, error: err.message });
    }
  }

  static async createContract(req: FastifyRequest, reply: FastifyReply) {
    try {
      const studioId = ContractsController.getStudioId(req);
      const userId = ContractsController.getUserId(req);
      const body = req.body as any;
      const contract = await ContractService.createContract(studioId, userId, body);
      return reply.status(201).send({ success: true, data: contract });
    } catch (err: any) {
      return reply.status(400).send({ success: false, error: err.message });
    }
  }

  static async updateContract(req: FastifyRequest, reply: FastifyReply) {
    try {
      const studioId = ContractsController.getStudioId(req);
      const { id } = req.params as { id: string };
      const body = req.body as any;
      const contract = await ContractService.updateContract(studioId, id, body);
      return reply.send({ success: true, data: contract });
    } catch (err: any) {
      return reply.status(400).send({ success: false, error: err.message });
    }
  }

  static async sendContract(req: FastifyRequest, reply: FastifyReply) {
    try {
      const studioId = ContractsController.getStudioId(req);
      const { id } = req.params as { id: string };
      const body = (req.body as any) || {};
      const result = await ContractService.sendContract(studioId, id, body);
      return reply.send({ success: true, data: result.contract, public_url: result.public_url, token: result.token });
    } catch (err: any) {
      return reply.status(400).send({ success: false, error: err.message });
    }
  }

  static async countersignContract(req: FastifyRequest, reply: FastifyReply) {
    try {
      const studioId = ContractsController.getStudioId(req);
      const userId = ContractsController.getUserId(req);
      const { id } = req.params as { id: string };
      const contract = await ContractService.countersignContract(studioId, userId, id);
      return reply.send({ success: true, data: contract });
    } catch (err: any) {
      return reply.status(400).send({ success: false, error: err.message });
    }
  }

  static async voidContract(req: FastifyRequest, reply: FastifyReply) {
    try {
      const studioId = ContractsController.getStudioId(req);
      const { id } = req.params as { id: string };
      const { reason } = (req.body as any) || {};
      const contract = await ContractService.voidContract(studioId, id, reason);
      return reply.send({ success: true, data: contract });
    } catch (err: any) {
      return reply.status(400).send({ success: false, error: err.message });
    }
  }

  static async deleteContract(req: FastifyRequest, reply: FastifyReply) {
    try {
      const studioId = ContractsController.getStudioId(req);
      const { id } = req.params as { id: string };
      await ContractService.deleteContract(studioId, id);
      return reply.send({ success: true, message: 'Contract deleted successfully' });
    } catch (err: any) {
      return reply.status(400).send({ success: false, error: err.message });
    }
  }
}
