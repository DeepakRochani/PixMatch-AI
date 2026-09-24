/**
 * Studio Tax & Compliance Operations Controller — PIXMatch AI Phase 35
 */

import { FastifyRequest, FastifyReply } from 'fastify';
import { StudioTaxService } from './tax.service.js';
import { prisma } from '@pixmatch/database';
import {
  ICreateTaxRateDTO,
  IUpdateTaxRateDTO,
  ICreateTaxCategoryDTO,
  ICreateTaxItemMappingDTO,
  ICreateTaxPartyProfileDTO,
  IDetermineTaxInputDTO,
  ICreateTaxTransactionDTO,
  ICreateTaxAdjustmentDTO,
  ICreateTaxPeriodDTO,
  TaxPartyType,
  TaxTransactionType,
  TaxTransactionStatus,
  TaxPeriodStatus,
} from '@pixmatch/types';

export class StudioTaxController {
  private static getService(): StudioTaxService {
    return new StudioTaxService(prisma);
  }

  private static extractAuth(req: FastifyRequest) {
    const user = (req as any).user;
    const studioId = (req as any).studioId || (req as any).tenantId || (req.headers['x-studio-id'] as string) || user?.studioId || user?.studio_id;
    const userId = user?.id || user?.userId || 'anonymous';
    return { studioId, userId };
  }

  // --- Profile & Registrations ---
  static async getProfile(req: FastifyRequest, reply: FastifyReply) {
    const { studioId } = StudioTaxController.extractAuth(req);
    if (!studioId) return reply.status(400).send({ error: 'Missing studio identification' });

    try {
      const service = StudioTaxController.getService();
      const profile = await service.getOrCreateTaxProfile(studioId);
      return reply.status(200).send(profile);
    } catch (err: any) {
      return reply.status(400).send({ error: err.message });
    }
  }

  static async updateProfile(req: FastifyRequest<{ Body: any }>, reply: FastifyReply) {
    const { studioId, userId } = StudioTaxController.extractAuth(req);
    if (!studioId) return reply.status(400).send({ error: 'Missing studio identification' });

    try {
      const service = StudioTaxController.getService();
      const updated = await service.updateTaxProfile(studioId, req.body, userId);
      return reply.status(200).send(updated);
    } catch (err: any) {
      return reply.status(400).send({ error: err.message });
    }
  }

  static async listRegistrations(req: FastifyRequest, reply: FastifyReply) {
    const { studioId } = StudioTaxController.extractAuth(req);
    if (!studioId) return reply.status(400).send({ error: 'Missing studio identification' });

    try {
      const service = StudioTaxController.getService();
      const list = await service.listRegistrations(studioId);
      return reply.status(200).send(list);
    } catch (err: any) {
      return reply.status(400).send({ error: err.message });
    }
  }

  static async createRegistration(req: FastifyRequest<{ Body: any }>, reply: FastifyReply) {
    const { studioId, userId } = StudioTaxController.extractAuth(req);
    if (!studioId) return reply.status(400).send({ error: 'Missing studio identification' });

    try {
      const service = StudioTaxController.getService();
      const created = await service.createRegistration(studioId, req.body, userId);
      return reply.status(201).send(created);
    } catch (err: any) {
      return reply.status(400).send({ error: err.message });
    }
  }

  static async updateRegistration(req: FastifyRequest<{ Params: { id: string }; Body: any }>, reply: FastifyReply) {
    const { studioId, userId } = StudioTaxController.extractAuth(req);
    if (!studioId) return reply.status(400).send({ error: 'Missing studio identification' });

    try {
      const service = StudioTaxController.getService();
      const updated = await service.updateRegistration(studioId, req.params.id, req.body, userId);
      return reply.status(200).send(updated);
    } catch (err: any) {
      return reply.status(400).send({ error: err.message });
    }
  }

  // --- Jurisdictions & Rates ---
  static async listJurisdictions(req: FastifyRequest, reply: FastifyReply) {
    const { studioId } = StudioTaxController.extractAuth(req);
    if (!studioId) return reply.status(400).send({ error: 'Missing studio identification' });

    try {
      const service = StudioTaxController.getService();
      const list = await service.listJurisdictions(studioId);
      return reply.status(200).send(list);
    } catch (err: any) {
      return reply.status(400).send({ error: err.message });
    }
  }

  static async createJurisdiction(req: FastifyRequest<{ Body: any }>, reply: FastifyReply) {
    const { studioId, userId } = StudioTaxController.extractAuth(req);
    if (!studioId) return reply.status(400).send({ error: 'Missing studio identification' });

    try {
      const service = StudioTaxController.getService();
      const created = await service.createJurisdiction(studioId, req.body, userId);
      return reply.status(201).send(created);
    } catch (err: any) {
      return reply.status(400).send({ error: err.message });
    }
  }

  static async listRates(req: FastifyRequest, reply: FastifyReply) {
    const { studioId } = StudioTaxController.extractAuth(req);
    if (!studioId) return reply.status(400).send({ error: 'Missing studio identification' });

    try {
      const service = StudioTaxController.getService();
      const list = await service.listTaxRates(studioId);
      return reply.status(200).send(list);
    } catch (err: any) {
      return reply.status(400).send({ error: err.message });
    }
  }

  static async createRate(req: FastifyRequest<{ Body: ICreateTaxRateDTO }>, reply: FastifyReply) {
    const { studioId, userId } = StudioTaxController.extractAuth(req);
    if (!studioId) return reply.status(400).send({ error: 'Missing studio identification' });

    try {
      const service = StudioTaxController.getService();
      const created = await service.createTaxRate(studioId, req.body, userId);
      return reply.status(201).send(created);
    } catch (err: any) {
      return reply.status(400).send({ error: err.message });
    }
  }

  static async updateRate(req: FastifyRequest<{ Params: { id: string }; Body: IUpdateTaxRateDTO }>, reply: FastifyReply) {
    const { studioId, userId } = StudioTaxController.extractAuth(req);
    if (!studioId) return reply.status(400).send({ error: 'Missing studio identification' });

    try {
      const service = StudioTaxController.getService();
      const updated = await service.updateTaxRate(studioId, req.params.id, req.body, userId);
      return reply.status(200).send(updated);
    } catch (err: any) {
      return reply.status(400).send({ error: err.message });
    }
  }

  // --- Categories & Item Mappings ---
  static async listCategories(req: FastifyRequest, reply: FastifyReply) {
    const { studioId } = StudioTaxController.extractAuth(req);
    if (!studioId) return reply.status(400).send({ error: 'Missing studio identification' });

    try {
      const service = StudioTaxController.getService();
      const list = await service.listTaxCategories(studioId);
      return reply.status(200).send(list);
    } catch (err: any) {
      return reply.status(400).send({ error: err.message });
    }
  }

  static async createCategory(req: FastifyRequest<{ Body: ICreateTaxCategoryDTO }>, reply: FastifyReply) {
    const { studioId, userId } = StudioTaxController.extractAuth(req);
    if (!studioId) return reply.status(400).send({ error: 'Missing studio identification' });

    try {
      const service = StudioTaxController.getService();
      const created = await service.createTaxCategory(studioId, req.body, userId);
      return reply.status(201).send(created);
    } catch (err: any) {
      return reply.status(400).send({ error: err.message });
    }
  }

  static async listItemMappings(req: FastifyRequest, reply: FastifyReply) {
    const { studioId } = StudioTaxController.extractAuth(req);
    if (!studioId) return reply.status(400).send({ error: 'Missing studio identification' });

    try {
      const service = StudioTaxController.getService();
      const list = await service.listItemMappings(studioId);
      return reply.status(200).send(list);
    } catch (err: any) {
      return reply.status(400).send({ error: err.message });
    }
  }

  static async createItemMapping(req: FastifyRequest<{ Body: ICreateTaxItemMappingDTO }>, reply: FastifyReply) {
    const { studioId, userId } = StudioTaxController.extractAuth(req);
    if (!studioId) return reply.status(400).send({ error: 'Missing studio identification' });

    try {
      const service = StudioTaxController.getService();
      const created = await service.createItemMapping(studioId, req.body, userId);
      return reply.status(201).send(created);
    } catch (err: any) {
      return reply.status(400).send({ error: err.message });
    }
  }

  // --- Party Profiles ---
  static async getPartyProfile(req: FastifyRequest<{ Querystring: { party_type?: string; party_id?: string } }>, reply: FastifyReply) {
    const { studioId } = StudioTaxController.extractAuth(req);
    if (!studioId) return reply.status(400).send({ error: 'Missing studio identification' });

    try {
      const service = StudioTaxController.getService();
      const partyType = (req.query.party_type as TaxPartyType) || TaxPartyType.CLIENT;
      const partyId = req.query.party_id as string;
      const profile = await service.getPartyProfile(studioId, partyType, partyId);
      return reply.status(200).send(profile);
    } catch (err: any) {
      return reply.status(400).send({ error: err.message });
    }
  }

  static async upsertPartyProfile(req: FastifyRequest<{ Body: ICreateTaxPartyProfileDTO }>, reply: FastifyReply) {
    const { studioId, userId } = StudioTaxController.extractAuth(req);
    if (!studioId) return reply.status(400).send({ error: 'Missing studio identification' });

    try {
      const service = StudioTaxController.getService();
      const profile = await service.upsertPartyProfile(studioId, req.body, userId);
      return reply.status(200).send(profile);
    } catch (err: any) {
      return reply.status(400).send({ error: err.message });
    }
  }

  // --- Tax Determination Calculation Endpoint ---
  static async calculateTax(req: FastifyRequest<{ Body: IDetermineTaxInputDTO }>, reply: FastifyReply) {
    const { studioId } = StudioTaxController.extractAuth(req);
    if (!studioId) return reply.status(400).send({ error: 'Missing studio identification' });

    try {
      const service = StudioTaxController.getService();
      const result = await service.determineTax({
        ...req.body,
        studio_id: studioId,
      });
      return reply.status(200).send(result);
    } catch (err: any) {
      return reply.status(400).send({ error: err.message });
    }
  }

  // --- Tax Transactions ---
  static async listTransactions(req: FastifyRequest<{ Querystring: { transaction_type?: string; status?: string; start_date?: string; end_date?: string } }>, reply: FastifyReply) {
    const { studioId } = StudioTaxController.extractAuth(req);
    if (!studioId) return reply.status(400).send({ error: 'Missing studio identification' });

    try {
      const service = StudioTaxController.getService();
      const list = await service.listTaxTransactions(studioId, {
        transaction_type: req.query.transaction_type as TaxTransactionType,
        status: req.query.status as TaxTransactionStatus,
        start_date: req.query.start_date ? new Date(req.query.start_date) : undefined,
        end_date: req.query.end_date ? new Date(req.query.end_date) : undefined,
      });
      return reply.status(200).send(list);
    } catch (err: any) {
      return reply.status(400).send({ error: err.message });
    }
  }

  static async getTransaction(req: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) {
    const { studioId } = StudioTaxController.extractAuth(req);
    if (!studioId) return reply.status(400).send({ error: 'Missing studio identification' });

    try {
      const service = StudioTaxController.getService();
      const item = await service.getTaxTransaction(studioId, req.params.id);
      return reply.status(200).send(item);
    } catch (err: any) {
      return reply.status(404).send({ error: err.message });
    }
  }

  static async createTransaction(req: FastifyRequest<{ Body: ICreateTaxTransactionDTO }>, reply: FastifyReply) {
    const { studioId, userId } = StudioTaxController.extractAuth(req);
    if (!studioId) return reply.status(400).send({ error: 'Missing studio identification' });

    try {
      const service = StudioTaxController.getService();
      const item = await service.createTaxTransaction(studioId, req.body, userId);
      return reply.status(201).send(item);
    } catch (err: any) {
      return reply.status(400).send({ error: err.message });
    }
  }

  static async postTransaction(req: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) {
    const { studioId, userId } = StudioTaxController.extractAuth(req);
    if (!studioId) return reply.status(400).send({ error: 'Missing studio identification' });

    try {
      const service = StudioTaxController.getService();
      const item = await service.postTaxTransaction(studioId, req.params.id, userId);
      return reply.status(200).send(item);
    } catch (err: any) {
      return reply.status(400).send({ error: err.message });
    }
  }

  static async voidTransaction(req: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) {
    const { studioId, userId } = StudioTaxController.extractAuth(req);
    if (!studioId) return reply.status(400).send({ error: 'Missing studio identification' });

    try {
      const service = StudioTaxController.getService();
      const item = await service.voidTaxTransaction(studioId, req.params.id, userId);
      return reply.status(200).send(item);
    } catch (err: any) {
      return reply.status(400).send({ error: err.message });
    }
  }

  static async reverseTransaction(req: FastifyRequest<{ Params: { id: string }; Body: { reason: string } }>, reply: FastifyReply) {
    const { studioId, userId } = StudioTaxController.extractAuth(req);
    if (!studioId) return reply.status(400).send({ error: 'Missing studio identification' });

    try {
      const service = StudioTaxController.getService();
      const item = await service.reverseTaxTransaction(studioId, req.params.id, req.body?.reason || 'Reversal requested', userId);
      return reply.status(200).send(item);
    } catch (err: any) {
      return reply.status(400).send({ error: err.message });
    }
  }

  static async createAdjustment(req: FastifyRequest<{ Body: ICreateTaxAdjustmentDTO }>, reply: FastifyReply) {
    const { studioId, userId } = StudioTaxController.extractAuth(req);
    if (!studioId) return reply.status(400).send({ error: 'Missing studio identification' });

    try {
      const service = StudioTaxController.getService();
      const item = await service.createTaxAdjustment(studioId, req.body, userId);
      return reply.status(201).send(item);
    } catch (err: any) {
      return reply.status(400).send({ error: err.message });
    }
  }

  // --- Periods & Reconciliation ---
  static async listPeriods(req: FastifyRequest, reply: FastifyReply) {
    const { studioId } = StudioTaxController.extractAuth(req);
    if (!studioId) return reply.status(400).send({ error: 'Missing studio identification' });

    try {
      const service = StudioTaxController.getService();
      const list = await service.listTaxPeriods(studioId);
      return reply.status(200).send(list);
    } catch (err: any) {
      return reply.status(400).send({ error: err.message });
    }
  }

  static async createPeriod(req: FastifyRequest<{ Body: ICreateTaxPeriodDTO }>, reply: FastifyReply) {
    const { studioId, userId } = StudioTaxController.extractAuth(req);
    if (!studioId) return reply.status(400).send({ error: 'Missing studio identification' });

    try {
      const service = StudioTaxController.getService();
      const item = await service.createTaxPeriod(studioId, req.body, userId);
      return reply.status(201).send(item);
    } catch (err: any) {
      return reply.status(400).send({ error: err.message });
    }
  }

  static async reviewPeriod(req: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) {
    const { studioId, userId } = StudioTaxController.extractAuth(req);
    if (!studioId) return reply.status(400).send({ error: 'Missing studio identification' });

    try {
      const service = StudioTaxController.getService();
      const item = await service.transitionPeriodStatus(studioId, req.params.id, TaxPeriodStatus.REVIEW, userId);
      return reply.status(200).send(item);
    } catch (err: any) {
      return reply.status(400).send({ error: err.message });
    }
  }

  static async readyPeriod(req: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) {
    const { studioId, userId } = StudioTaxController.extractAuth(req);
    if (!studioId) return reply.status(400).send({ error: 'Missing studio identification' });

    try {
      const service = StudioTaxController.getService();
      const item = await service.transitionPeriodStatus(studioId, req.params.id, TaxPeriodStatus.READY_TO_FILE, userId);
      return reply.status(200).send(item);
    } catch (err: any) {
      return reply.status(400).send({ error: err.message });
    }
  }

  static async closePeriod(req: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) {
    const { studioId, userId } = StudioTaxController.extractAuth(req);
    if (!studioId) return reply.status(400).send({ error: 'Missing studio identification' });

    try {
      const service = StudioTaxController.getService();
      const item = await service.transitionPeriodStatus(studioId, req.params.id, TaxPeriodStatus.CLOSED, userId);
      return reply.status(200).send(item);
    } catch (err: any) {
      return reply.status(400).send({ error: err.message });
    }
  }

  static async reconcilePeriod(req: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) {
    const { studioId, userId } = StudioTaxController.extractAuth(req);
    if (!studioId) return reply.status(400).send({ error: 'Missing studio identification' });

    try {
      const service = StudioTaxController.getService();
      const result = await service.reconcileTaxWithLedger(studioId, req.params.id, userId);
      return reply.status(200).send(result);
    } catch (err: any) {
      return reply.status(400).send({ error: err.message });
    }
  }

  // --- Compliance & Reports ---
  static async getCompliance(req: FastifyRequest, reply: FastifyReply) {
    const { studioId } = StudioTaxController.extractAuth(req);
    if (!studioId) return reply.status(400).send({ error: 'Missing studio identification' });

    try {
      const service = StudioTaxController.getService();
      const result = await service.runComplianceChecks(studioId);
      return reply.status(200).send(result);
    } catch (err: any) {
      return reply.status(400).send({ error: err.message });
    }
  }

  static async getSummary(req: FastifyRequest<{ Querystring: { start_date?: string; end_date?: string } }>, reply: FastifyReply) {
    const { studioId } = StudioTaxController.extractAuth(req);
    if (!studioId) return reply.status(400).send({ error: 'Missing studio identification' });

    try {
      const service = StudioTaxController.getService();
      const start = req.query.start_date ? new Date(req.query.start_date) : undefined;
      const end = req.query.end_date ? new Date(req.query.end_date) : undefined;
      const result = await service.getTaxSummary(studioId, start, end);
      return reply.status(200).send(result);
    } catch (err: any) {
      return reply.status(400).send({ error: err.message });
    }
  }

  static async exportCsv(req: FastifyRequest<{ Querystring: { report_type?: string; start_date?: string; end_date?: string } }>, reply: FastifyReply) {
    const { studioId } = StudioTaxController.extractAuth(req);
    if (!studioId) return reply.status(400).send({ error: 'Missing studio identification' });

    try {
      const service = StudioTaxController.getService();
      const start = req.query.start_date ? new Date(req.query.start_date) : undefined;
      const end = req.query.end_date ? new Date(req.query.end_date) : undefined;
      const reportType = req.query.report_type || 'SUMMARY';
      const csv = await service.exportTaxCsv(studioId, reportType, start, end);

      reply.header('Content-Type', 'text/csv');
      reply.header('Content-Disposition', `attachment; filename="tax-report-${Date.now()}.csv"`);
      return reply.status(200).send(csv);
    } catch (err: any) {
      return reply.status(400).send({ error: err.message });
    }
  }
}
