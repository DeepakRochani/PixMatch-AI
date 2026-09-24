/**
 * Studio Financial Accounting & General Ledger Controller — PIXMatch AI Phase 34
 */

import { FastifyRequest, FastifyReply } from 'fastify';
import { StudioAccountingService } from './accounting.service.js';
import { prisma } from '@pixmatch/database';
import {
  ICreateChartOfAccountDTO,
  IUpdateChartOfAccountDTO,
  ICreateAccountingMappingDTO,
  ICreateJournalEntryDTO,
  ICreateAccountingPeriodDTO,
  IOpeningBalanceDTO,
  ChartOfAccountType,
} from '@pixmatch/types';

export class StudioAccountingController {
  private static getService(): StudioAccountingService {
    return new StudioAccountingService(prisma);
  }

  private static extractAuth(req: FastifyRequest) {
    const user = (req as any).user;
    const studioId = (req as any).studioId || (req as any).tenantId || req.headers['x-studio-id'] || user?.studioId || user?.studio_id;
    const userId = user?.id || user?.userId || 'anonymous';
    return { studioId, userId };
  }

  // --- CHART OF ACCOUNTS ---

  static async initializeDefaults(req: FastifyRequest, reply: FastifyReply) {
    const { studioId, userId } = StudioAccountingController.extractAuth(req);
    if (!studioId) return reply.status(400).send({ error: 'Missing studio identification' });

    try {
      const service = StudioAccountingController.getService();
      const result = await service.initializeDefaultChartOfAccounts(studioId, userId);
      return reply.status(200).send(result);
    } catch (err: any) {
      return reply.status(400).send({ error: err.message });
    }
  }

  static async createAccount(req: FastifyRequest<{ Body: ICreateChartOfAccountDTO }>, reply: FastifyReply) {
    const { studioId, userId } = StudioAccountingController.extractAuth(req);
    if (!studioId) return reply.status(400).send({ error: 'Missing studio identification' });

    try {
      const service = StudioAccountingController.getService();
      const result = await service.createAccount(studioId, req.body, userId);
      return reply.status(201).send(result);
    } catch (err: any) {
      return reply.status(400).send({ error: err.message });
    }
  }

  static async listAccounts(req: FastifyRequest<{ Querystring: { account_type?: string; is_active?: string } }>, reply: FastifyReply) {
    const { studioId } = StudioAccountingController.extractAuth(req);
    if (!studioId) return reply.status(400).send({ error: 'Missing studio identification' });

    try {
      const service = StudioAccountingController.getService();
      const isActive = req.query.is_active !== undefined ? req.query.is_active === 'true' : undefined;
      const result = await service.listAccounts(studioId, {
        account_type: req.query.account_type as ChartOfAccountType,
        is_active: isActive,
      });
      return reply.status(200).send(result);
    } catch (err: any) {
      return reply.status(400).send({ error: err.message });
    }
  }

  static async getAccountById(req: FastifyRequest<{ Params: { accountId: string } }>, reply: FastifyReply) {
    const { studioId } = StudioAccountingController.extractAuth(req);
    if (!studioId) return reply.status(400).send({ error: 'Missing studio identification' });

    try {
      const service = StudioAccountingController.getService();
      const result = await service.getAccountById(studioId, req.params.accountId);
      return reply.status(200).send(result);
    } catch (err: any) {
      return reply.status(404).send({ error: err.message });
    }
  }

  static async updateAccount(req: FastifyRequest<{ Params: { accountId: string }; Body: IUpdateChartOfAccountDTO }>, reply: FastifyReply) {
    const { studioId, userId } = StudioAccountingController.extractAuth(req);
    if (!studioId) return reply.status(400).send({ error: 'Missing studio identification' });

    try {
      const service = StudioAccountingController.getService();
      const result = await service.updateAccount(studioId, req.params.accountId, req.body, userId);
      return reply.status(200).send(result);
    } catch (err: any) {
      return reply.status(400).send({ error: err.message });
    }
  }

  static async archiveAccount(req: FastifyRequest<{ Params: { accountId: string } }>, reply: FastifyReply) {
    const { studioId, userId } = StudioAccountingController.extractAuth(req);
    if (!studioId) return reply.status(400).send({ error: 'Missing studio identification' });

    try {
      const service = StudioAccountingController.getService();
      const result = await service.archiveAccount(studioId, req.params.accountId, userId);
      return reply.status(200).send(result);
    } catch (err: any) {
      return reply.status(400).send({ error: err.message });
    }
  }

  // --- MAPPINGS ---

  static async listMappings(req: FastifyRequest, reply: FastifyReply) {
    const { studioId } = StudioAccountingController.extractAuth(req);
    if (!studioId) return reply.status(400).send({ error: 'Missing studio identification' });

    try {
      const service = StudioAccountingController.getService();
      const result = await service.listMappings(studioId);
      return reply.status(200).send(result);
    } catch (err: any) {
      return reply.status(400).send({ error: err.message });
    }
  }

  static async setMapping(req: FastifyRequest<{ Body: ICreateAccountingMappingDTO }>, reply: FastifyReply) {
    const { studioId, userId } = StudioAccountingController.extractAuth(req);
    if (!studioId) return reply.status(400).send({ error: 'Missing studio identification' });

    try {
      const service = StudioAccountingController.getService();
      const result = await service.setMapping(studioId, req.body, userId);
      return reply.status(200).send(result);
    } catch (err: any) {
      return reply.status(400).send({ error: err.message });
    }
  }

  // --- JOURNAL ENTRIES ---

  static async createJournalEntry(req: FastifyRequest<{ Body: ICreateJournalEntryDTO }>, reply: FastifyReply) {
    const { studioId, userId } = StudioAccountingController.extractAuth(req);
    if (!studioId) return reply.status(400).send({ error: 'Missing studio identification' });

    try {
      const service = StudioAccountingController.getService();
      const result = await service.createJournalEntry(studioId, req.body, userId);
      return reply.status(201).send(result);
    } catch (err: any) {
      return reply.status(400).send({ error: err.message });
    }
  }

  static async postJournalEntry(req: FastifyRequest<{ Params: { entryId: string } }>, reply: FastifyReply) {
    const { studioId, userId } = StudioAccountingController.extractAuth(req);
    if (!studioId) return reply.status(400).send({ error: 'Missing studio identification' });

    try {
      const service = StudioAccountingController.getService();
      const result = await service.postJournalEntry(studioId, req.params.entryId, userId);
      return reply.status(200).send(result);
    } catch (err: any) {
      return reply.status(400).send({ error: err.message });
    }
  }

  static async reverseJournalEntry(req: FastifyRequest<{ Params: { entryId: string }; Body: { reason: string } }>, reply: FastifyReply) {
    const { studioId, userId } = StudioAccountingController.extractAuth(req);
    if (!studioId) return reply.status(400).send({ error: 'Missing studio identification' });

    try {
      const service = StudioAccountingController.getService();
      const result = await service.reverseJournalEntry(studioId, req.params.entryId, req.body.reason, userId);
      return reply.status(200).send(result);
    } catch (err: any) {
      return reply.status(400).send({ error: err.message });
    }
  }

  static async voidDraftJournalEntry(req: FastifyRequest<{ Params: { entryId: string } }>, reply: FastifyReply) {
    const { studioId, userId } = StudioAccountingController.extractAuth(req);
    if (!studioId) return reply.status(400).send({ error: 'Missing studio identification' });

    try {
      const service = StudioAccountingController.getService();
      const result = await service.voidDraftJournalEntry(studioId, req.params.entryId, userId);
      return reply.status(200).send(result);
    } catch (err: any) {
      return reply.status(400).send({ error: err.message });
    }
  }

  // --- PERIODS & OPENING BALANCES ---

  static async listPeriods(req: FastifyRequest, reply: FastifyReply) {
    const { studioId } = StudioAccountingController.extractAuth(req);
    if (!studioId) return reply.status(400).send({ error: 'Missing studio identification' });

    try {
      const service = StudioAccountingController.getService();
      const result = await service.listPeriods(studioId);
      return reply.status(200).send(result);
    } catch (err: any) {
      return reply.status(400).send({ error: err.message });
    }
  }

  static async createPeriod(req: FastifyRequest<{ Body: ICreateAccountingPeriodDTO }>, reply: FastifyReply) {
    const { studioId, userId } = StudioAccountingController.extractAuth(req);
    if (!studioId) return reply.status(400).send({ error: 'Missing studio identification' });

    try {
      const service = StudioAccountingController.getService();
      const result = await service.createPeriod(studioId, req.body, userId);
      return reply.status(201).send(result);
    } catch (err: any) {
      return reply.status(400).send({ error: err.message });
    }
  }

  static async closePeriod(req: FastifyRequest<{ Params: { periodId: string } }>, reply: FastifyReply) {
    const { studioId, userId } = StudioAccountingController.extractAuth(req);
    if (!studioId) return reply.status(400).send({ error: 'Missing studio identification' });

    try {
      const service = StudioAccountingController.getService();
      const result = await service.closePeriod(studioId, req.params.periodId, userId);
      return reply.status(200).send(result);
    } catch (err: any) {
      return reply.status(400).send({ error: err.message });
    }
  }

  static async reopenPeriod(req: FastifyRequest<{ Params: { periodId: string }; Body: { reason: string } }>, reply: FastifyReply) {
    const { studioId, userId } = StudioAccountingController.extractAuth(req);
    if (!studioId) return reply.status(400).send({ error: 'Missing studio identification' });

    try {
      const service = StudioAccountingController.getService();
      const result = await service.reopenPeriod(studioId, req.params.periodId, req.body.reason, userId);
      return reply.status(200).send(result);
    } catch (err: any) {
      return reply.status(400).send({ error: err.message });
    }
  }

  static async createOpeningBalance(req: FastifyRequest<{ Body: IOpeningBalanceDTO }>, reply: FastifyReply) {
    const { studioId, userId } = StudioAccountingController.extractAuth(req);
    if (!studioId) return reply.status(400).send({ error: 'Missing studio identification' });

    try {
      const service = StudioAccountingController.getService();
      const result = await service.createOpeningBalance(studioId, req.body, userId);
      return reply.status(201).send(result);
    } catch (err: any) {
      return reply.status(400).send({ error: err.message });
    }
  }

  // --- REPORTS ---

  static async getTrialBalance(req: FastifyRequest<{ Querystring: { as_of?: string } }>, reply: FastifyReply) {
    const { studioId } = StudioAccountingController.extractAuth(req);
    if (!studioId) return reply.status(400).send({ error: 'Missing studio identification' });

    try {
      const service = StudioAccountingController.getService();
      const asOf = req.query.as_of ? new Date(req.query.as_of) : new Date();
      const result = await service.getTrialBalance(studioId, asOf);
      return reply.status(200).send(result);
    } catch (err: any) {
      return reply.status(400).send({ error: err.message });
    }
  }

  static async getGeneralLedger(
    req: FastifyRequest<{ Querystring: { start_date?: string; end_date?: string; account_id?: string } }>,
    reply: FastifyReply
  ) {
    const { studioId } = StudioAccountingController.extractAuth(req);
    if (!studioId) return reply.status(400).send({ error: 'Missing studio identification' });

    try {
      const service = StudioAccountingController.getService();
      const start = req.query.start_date ? new Date(req.query.start_date) : new Date('2000-01-01');
      const end = req.query.end_date ? new Date(req.query.end_date) : new Date();
      const result = await service.getGeneralLedger(studioId, start, end, req.query.account_id);
      return reply.status(200).send(result);
    } catch (err: any) {
      return reply.status(400).send({ error: err.message });
    }
  }

  static async getProfitAndLoss(
    req: FastifyRequest<{ Querystring: { start_date?: string; end_date?: string } }>,
    reply: FastifyReply
  ) {
    const { studioId } = StudioAccountingController.extractAuth(req);
    if (!studioId) return reply.status(400).send({ error: 'Missing studio identification' });

    try {
      const service = StudioAccountingController.getService();
      const start = req.query.start_date ? new Date(req.query.start_date) : new Date(new Date().getFullYear(), 0, 1);
      const end = req.query.end_date ? new Date(req.query.end_date) : new Date();
      const result = await service.getProfitAndLoss(studioId, start, end);
      return reply.status(200).send(result);
    } catch (err: any) {
      return reply.status(400).send({ error: err.message });
    }
  }

  static async getBalanceSheet(req: FastifyRequest<{ Querystring: { as_of?: string } }>, reply: FastifyReply) {
    const { studioId } = StudioAccountingController.extractAuth(req);
    if (!studioId) return reply.status(400).send({ error: 'Missing studio identification' });

    try {
      const service = StudioAccountingController.getService();
      const asOf = req.query.as_of ? new Date(req.query.as_of) : new Date();
      const result = await service.getBalanceSheet(studioId, asOf);
      return reply.status(200).send(result);
    } catch (err: any) {
      return reply.status(400).send({ error: err.message });
    }
  }

  static async exportLedgerCSV(
    req: FastifyRequest<{ Querystring: { start_date?: string; end_date?: string } }>,
    reply: FastifyReply
  ) {
    const { studioId } = StudioAccountingController.extractAuth(req);
    if (!studioId) return reply.status(400).send({ error: 'Missing studio identification' });

    try {
      const service = StudioAccountingController.getService();
      const start = req.query.start_date ? new Date(req.query.start_date) : new Date('2000-01-01');
      const end = req.query.end_date ? new Date(req.query.end_date) : new Date();
      const csv = await service.exportGeneralLedgerCSV(studioId, start, end);
      reply.header('Content-Type', 'text/csv');
      reply.header('Content-Disposition', 'attachment; filename="general_ledger.csv"');
      return reply.status(200).send(csv);
    } catch (err: any) {
      return reply.status(400).send({ error: err.message });
    }
  }

  static async exportTrialBalanceCSV(req: FastifyRequest<{ Querystring: { as_of?: string } }>, reply: FastifyReply) {
    const { studioId } = StudioAccountingController.extractAuth(req);
    if (!studioId) return reply.status(400).send({ error: 'Missing studio identification' });

    try {
      const service = StudioAccountingController.getService();
      const asOf = req.query.as_of ? new Date(req.query.as_of) : new Date();
      const csv = await service.exportTrialBalanceCSV(studioId, asOf);
      reply.header('Content-Type', 'text/csv');
      reply.header('Content-Disposition', 'attachment; filename="trial_balance.csv"');
      return reply.status(200).send(csv);
    } catch (err: any) {
      return reply.status(400).send({ error: err.message });
    }
  }
}
