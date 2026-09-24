/**
 * Studio Financial Operations & Profitability Controller — PIXMatch AI Phase 33
 */

import { FastifyRequest, FastifyReply } from 'fastify';
import { StudioFinancialOperationsService } from './financial-operations.service.js';
import { prisma } from '@pixmatch/database';
import {
  ICreateFinancialAccountDTO,
  ICreateExpenseCategoryDTO,
  ICreateVendorDTO,
  ICreateExpenseDTO,
  IRecordExpensePaymentDTO,
  ICreateBudgetDTO,
} from '@pixmatch/types';

export class StudioFinancialOperationsController {
  private static getService(): StudioFinancialOperationsService {
    return new StudioFinancialOperationsService(prisma);
  }

  private static extractAuth(req: FastifyRequest) {
    const user = (req as any).user;
    const studioId = (req as any).studioId || (req as any).tenantId || req.headers['x-studio-id'] || user?.studioId || user?.studio_id;
    const userId = user?.id || user?.userId || 'anonymous';
    return { studioId, userId };
  }

  // --- ACCOUNTS ---

  static async createAccount(req: FastifyRequest<{ Body: ICreateFinancialAccountDTO }>, reply: FastifyReply) {
    const { studioId, userId } = StudioFinancialOperationsController.extractAuth(req);
    if (!studioId) return reply.status(400).send({ error: 'Missing studio identification' });

    try {
      const service = StudioFinancialOperationsController.getService();
      const result = await service.createAccount(studioId, req.body, userId);
      return reply.status(201).send(result);
    } catch (err: any) {
      return reply.status(400).send({ error: err.message });
    }
  }

  static async listAccounts(req: FastifyRequest<{ Querystring: { is_active?: string } }>, reply: FastifyReply) {
    const { studioId } = StudioFinancialOperationsController.extractAuth(req);
    if (!studioId) return reply.status(400).send({ error: 'Missing studio identification' });

    try {
      const service = StudioFinancialOperationsController.getService();
      const isActive = req.query.is_active !== undefined ? req.query.is_active === 'true' : undefined;
      const result = await service.listAccounts(studioId, { is_active: isActive });
      return reply.status(200).send(result);
    } catch (err: any) {
      return reply.status(400).send({ error: err.message });
    }
  }

  static async updateAccount(
    req: FastifyRequest<{ Params: { accountId: string }; Body: any }>,
    reply: FastifyReply
  ) {
    const { studioId, userId } = StudioFinancialOperationsController.extractAuth(req);
    const { accountId } = req.params;
    if (!studioId) return reply.status(400).send({ error: 'Missing studio identification' });

    try {
      const service = StudioFinancialOperationsController.getService();
      const result = await service.updateAccount(studioId, accountId, req.body as any, userId);
      return reply.status(200).send(result);
    } catch (err: any) {
      return reply.status(400).send({ error: err.message });
    }
  }

  // --- CATEGORIES ---

  static async createCategory(req: FastifyRequest<{ Body: ICreateExpenseCategoryDTO }>, reply: FastifyReply) {
    const { studioId } = StudioFinancialOperationsController.extractAuth(req);
    if (!studioId) return reply.status(400).send({ error: 'Missing studio identification' });

    try {
      const service = StudioFinancialOperationsController.getService();
      const result = await service.createCategory(studioId, req.body);
      return reply.status(201).send(result);
    } catch (err: any) {
      return reply.status(400).send({ error: err.message });
    }
  }

  static async listCategories(req: FastifyRequest, reply: FastifyReply) {
    const { studioId } = StudioFinancialOperationsController.extractAuth(req);
    if (!studioId) return reply.status(400).send({ error: 'Missing studio identification' });

    try {
      const service = StudioFinancialOperationsController.getService();
      const result = await service.listCategories(studioId);
      return reply.status(200).send(result);
    } catch (err: any) {
      return reply.status(400).send({ error: err.message });
    }
  }

  // --- VENDORS ---

  static async createVendor(req: FastifyRequest<{ Body: ICreateVendorDTO }>, reply: FastifyReply) {
    const { studioId, userId } = StudioFinancialOperationsController.extractAuth(req);
    if (!studioId) return reply.status(400).send({ error: 'Missing studio identification' });

    try {
      const service = StudioFinancialOperationsController.getService();
      const result = await service.createVendor(studioId, req.body, userId);
      return reply.status(201).send(result);
    } catch (err: any) {
      return reply.status(400).send({ error: err.message });
    }
  }

  static async listVendors(req: FastifyRequest<{ Querystring: any }>, reply: FastifyReply) {
    const { studioId } = StudioFinancialOperationsController.extractAuth(req);
    if (!studioId) return reply.status(400).send({ error: 'Missing studio identification' });

    try {
      const service = StudioFinancialOperationsController.getService();
      const result = await service.listVendors(studioId, req.query as any);
      return reply.status(200).send(result);
    } catch (err: any) {
      return reply.status(400).send({ error: err.message });
    }
  }

  static async updateVendor(
    req: FastifyRequest<{ Params: { vendorId: string }; Body: any }>,
    reply: FastifyReply
  ) {
    const { studioId, userId } = StudioFinancialOperationsController.extractAuth(req);
    const { vendorId } = req.params;
    if (!studioId) return reply.status(400).send({ error: 'Missing studio identification' });

    try {
      const service = StudioFinancialOperationsController.getService();
      const result = await service.updateVendor(studioId, vendorId, req.body as any, userId);
      return reply.status(200).send(result);
    } catch (err: any) {
      return reply.status(400).send({ error: err.message });
    }
  }

  static async deleteVendor(
    req: FastifyRequest<{ Params: { vendorId: string } }>,
    reply: FastifyReply
  ) {
    const { studioId, userId } = StudioFinancialOperationsController.extractAuth(req);
    const { vendorId } = req.params;
    if (!studioId) return reply.status(400).send({ error: 'Missing studio identification' });

    try {
      const service = StudioFinancialOperationsController.getService();
      await service.deleteVendor(studioId, vendorId, userId);
      return reply.status(204).send();
    } catch (err: any) {
      return reply.status(400).send({ error: err.message });
    }
  }

  // --- EXPENSES ---

  static async createExpense(req: FastifyRequest<{ Body: ICreateExpenseDTO }>, reply: FastifyReply) {
    const { studioId, userId } = StudioFinancialOperationsController.extractAuth(req);
    if (!studioId) return reply.status(400).send({ error: 'Missing studio identification' });

    try {
      const service = StudioFinancialOperationsController.getService();
      const result = await service.createExpense(studioId, userId, req.body);
      return reply.status(201).send(result);
    } catch (err: any) {
      return reply.status(400).send({ error: err.message });
    }
  }

  static async listExpenses(req: FastifyRequest<{ Querystring: any }>, reply: FastifyReply) {
    const { studioId } = StudioFinancialOperationsController.extractAuth(req);
    if (!studioId) return reply.status(400).send({ error: 'Missing studio identification' });

    try {
      const service = StudioFinancialOperationsController.getService();
      const result = await service.listExpenses(studioId, req.query as any);
      return reply.status(200).send(result);
    } catch (err: any) {
      return reply.status(400).send({ error: err.message });
    }
  }

  static async getExpense(req: FastifyRequest<{ Params: { expenseId: string } }>, reply: FastifyReply) {
    const { studioId } = StudioFinancialOperationsController.extractAuth(req);
    const { expenseId } = req.params;
    if (!studioId) return reply.status(400).send({ error: 'Missing studio identification' });

    try {
      const service = StudioFinancialOperationsController.getService();
      const result = await service.getExpenseById(studioId, expenseId);
      return reply.status(200).send(result);
    } catch (err: any) {
      return reply.status(404).send({ error: err.message });
    }
  }

  static async approveExpense(
    req: FastifyRequest<{ Params: { expenseId: string }; Body: { approved: boolean; notes?: string } }>,
    reply: FastifyReply
  ) {
    const { studioId, userId } = StudioFinancialOperationsController.extractAuth(req);
    const { expenseId } = req.params;
    if (!studioId) return reply.status(400).send({ error: 'Missing studio identification' });

    try {
      const service = StudioFinancialOperationsController.getService();
      const result = await service.approveExpense(
        studioId,
        expenseId,
        userId,
        req.body.approved,
        req.body.notes
      );
      return reply.status(200).send(result);
    } catch (err: any) {
      return reply.status(400).send({ error: err.message });
    }
  }

  static async voidExpense(
    req: FastifyRequest<{ Params: { expenseId: string }; Body: { void_reason: string } }>,
    reply: FastifyReply
  ) {
    const { studioId, userId } = StudioFinancialOperationsController.extractAuth(req);
    const { expenseId } = req.params;
    if (!studioId) return reply.status(400).send({ error: 'Missing studio identification' });

    try {
      const service = StudioFinancialOperationsController.getService();
      const result = await service.voidExpense(studioId, expenseId, userId, req.body.void_reason);
      return reply.status(200).send(result);
    } catch (err: any) {
      return reply.status(400).send({ error: err.message });
    }
  }

  // --- PAYMENTS ---

  static async recordExpensePayment(
    req: FastifyRequest<{ Body: IRecordExpensePaymentDTO }>,
    reply: FastifyReply
  ) {
    const { studioId, userId } = StudioFinancialOperationsController.extractAuth(req);
    if (!studioId) return reply.status(400).send({ error: 'Missing studio identification' });

    try {
      const service = StudioFinancialOperationsController.getService();
      const result = await service.recordExpensePayment(studioId, userId, req.body);
      return reply.status(201).send(result);
    } catch (err: any) {
      return reply.status(400).send({ error: err.message });
    }
  }

  // --- RECEIVABLES & PAYABLES ---

  static async listReceivables(req: FastifyRequest<{ Querystring: any }>, reply: FastifyReply) {
    const { studioId } = StudioFinancialOperationsController.extractAuth(req);
    if (!studioId) return reply.status(400).send({ error: 'Missing studio identification' });

    try {
      const service = StudioFinancialOperationsController.getService();
      const result = await service.listReceivables(studioId, req.query as any);
      return reply.status(200).send(result);
    } catch (err: any) {
      return reply.status(400).send({ error: err.message });
    }
  }

  static async listPayables(req: FastifyRequest<{ Querystring: any }>, reply: FastifyReply) {
    const { studioId } = StudioFinancialOperationsController.extractAuth(req);
    if (!studioId) return reply.status(400).send({ error: 'Missing studio identification' });

    try {
      const service = StudioFinancialOperationsController.getService();
      const result = await service.listPayables(studioId, req.query as any);
      return reply.status(200).send(result);
    } catch (err: any) {
      return reply.status(400).send({ error: err.message });
    }
  }

  // --- BUDGETS & VARIANCE ---

  static async createBudget(req: FastifyRequest<{ Body: ICreateBudgetDTO }>, reply: FastifyReply) {
    const { studioId, userId } = StudioFinancialOperationsController.extractAuth(req);
    if (!studioId) return reply.status(400).send({ error: 'Missing studio identification' });

    try {
      const service = StudioFinancialOperationsController.getService();
      const result = await service.createBudget(studioId, req.body, userId);
      return reply.status(201).send(result);
    } catch (err: any) {
      return reply.status(400).send({ error: err.message });
    }
  }

  static async listBudgets(req: FastifyRequest<{ Querystring: any }>, reply: FastifyReply) {
    const { studioId } = StudioFinancialOperationsController.extractAuth(req);
    if (!studioId) return reply.status(400).send({ error: 'Missing studio identification' });

    try {
      const service = StudioFinancialOperationsController.getService();
      const result = await service.listBudgets(studioId, req.query as any);
      return reply.status(200).send(result);
    } catch (err: any) {
      return reply.status(400).send({ error: err.message });
    }
  }

  static async getBudgetVariance(
    req: FastifyRequest<{ Params: { budgetId: string } }>,
    reply: FastifyReply
  ) {
    const { studioId } = StudioFinancialOperationsController.extractAuth(req);
    const { budgetId } = req.params;
    if (!studioId) return reply.status(400).send({ error: 'Missing studio identification' });

    try {
      const service = StudioFinancialOperationsController.getService();
      const result = await service.getBudgetVariance(studioId, budgetId);
      return reply.status(200).send(result);
    } catch (err: any) {
      return reply.status(404).send({ error: err.message });
    }
  }

  // --- PROFITABILITY & SUMMARIES ---

  static async getProjectProfitability(
    req: FastifyRequest<{ Params: { projectId: string } }>,
    reply: FastifyReply
  ) {
    const { studioId } = StudioFinancialOperationsController.extractAuth(req);
    const { projectId } = req.params;
    if (!studioId) return reply.status(400).send({ error: 'Missing studio identification' });

    try {
      const service = StudioFinancialOperationsController.getService();
      const result = await service.calculateProjectProfitability(studioId, projectId);
      return reply.status(200).send(result);
    } catch (err: any) {
      return reply.status(404).send({ error: err.message });
    }
  }

  static async getClientProfitability(
    req: FastifyRequest<{ Params: { clientId: string } }>,
    reply: FastifyReply
  ) {
    const { studioId } = StudioFinancialOperationsController.extractAuth(req);
    const { clientId } = req.params;
    if (!studioId) return reply.status(400).send({ error: 'Missing studio identification' });

    try {
      const service = StudioFinancialOperationsController.getService();
      const result = await service.calculateClientProfitability(studioId, clientId);
      return reply.status(200).send(result);
    } catch (err: any) {
      return reply.status(404).send({ error: err.message });
    }
  }

  static async getCashFlowSummary(
    req: FastifyRequest<{ Querystring: { start_date?: string; end_date?: string } }>,
    reply: FastifyReply
  ) {
    const { studioId } = StudioFinancialOperationsController.extractAuth(req);
    if (!studioId) return reply.status(400).send({ error: 'Missing studio identification' });

    try {
      const service = StudioFinancialOperationsController.getService();
      const result = await service.getCashFlowSummary(studioId, req.query.start_date, req.query.end_date);
      return reply.status(200).send(result);
    } catch (err: any) {
      return reply.status(400).send({ error: err.message });
    }
  }

  static async getTaxSummary(
    req: FastifyRequest<{ Querystring: { start_date?: string; end_date?: string } }>,
    reply: FastifyReply
  ) {
    const { studioId } = StudioFinancialOperationsController.extractAuth(req);
    if (!studioId) return reply.status(400).send({ error: 'Missing studio identification' });

    try {
      const service = StudioFinancialOperationsController.getService();
      const result = await service.getTaxSummary(studioId, req.query.start_date, req.query.end_date);
      return reply.status(200).send(result);
    } catch (err: any) {
      return reply.status(400).send({ error: err.message });
    }
  }

  // --- EXPORTS ---

  static async exportExpensesCSV(req: FastifyRequest<{ Querystring: any }>, reply: FastifyReply) {
    const { studioId } = StudioFinancialOperationsController.extractAuth(req);
    if (!studioId) return reply.status(400).send({ error: 'Missing studio identification' });

    try {
      const service = StudioFinancialOperationsController.getService();
      const csv = await service.exportExpensesCSV(studioId, req.query);
      reply.header('Content-Type', 'text/csv');
      reply.header('Content-Disposition', 'attachment; filename="expenses.csv"');
      return reply.status(200).send(csv);
    } catch (err: any) {
      return reply.status(400).send({ error: err.message });
    }
  }

  static async exportAccountsCSV(req: FastifyRequest, reply: FastifyReply) {
    const { studioId } = StudioFinancialOperationsController.extractAuth(req);
    if (!studioId) return reply.status(400).send({ error: 'Missing studio identification' });

    try {
      const service = StudioFinancialOperationsController.getService();
      const csv = await service.exportAccountsCSV(studioId);
      reply.header('Content-Type', 'text/csv');
      reply.header('Content-Disposition', 'attachment; filename="financial-accounts.csv"');
      return reply.status(200).send(csv);
    } catch (err: any) {
      return reply.status(400).send({ error: err.message });
    }
  }
}
