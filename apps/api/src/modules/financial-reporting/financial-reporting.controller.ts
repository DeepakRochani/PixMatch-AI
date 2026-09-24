/**
 * Studio Financial Reporting, Statements & Compliance Controller — PIXMatch AI Phase 37
 */

import { FastifyRequest, FastifyReply } from 'fastify';
import { StudioFinancialReportingService } from './financial-reporting.service';
import { prisma } from '@pixmatch/database';
import {
  StudioFinancialReportType,
  ICreateReportExportDTO,
  ICreateReportScheduleDTO,
  IUpdateReportScheduleDTO,
  IUpdateAnomalyStatusDTO,
} from '@pixmatch/types';

export class StudioFinancialReportingController {
  private static getService(): StudioFinancialReportingService {
    return new StudioFinancialReportingService(prisma);
  }

  private static extractAuth(req: FastifyRequest) {
    const user = (req as any).user;
    const studioId = (req as any).studioId || (req as any).tenantId || req.headers['x-studio-id'] || user?.studioId || user?.studio_id;
    const userId = user?.id || user?.userId || 'anonymous';
    return { studioId, userId };
  }

  // --- OVERVIEW DASHBOARD ---

  static async getDashboardOverview(req: FastifyRequest<{ Querystring: { currency?: string } }>, reply: FastifyReply) {
    const { studioId } = StudioFinancialReportingController.extractAuth(req);
    if (!studioId) return reply.status(400).send({ error: 'Missing studio identification' });

    try {
      const service = StudioFinancialReportingController.getService();
      const result = await service.getFinancialOverviewDashboard(studioId, req.query.currency);
      return reply.status(200).send(result);
    } catch (err: any) {
      return reply.status(400).send({ error: err.message });
    }
  }

  // --- STATEMENTS & ACCOUNTING REPORTS ---

  static async getProfitAndLoss(
    req: FastifyRequest<{ Querystring: { start_date?: string; end_date?: string; currency?: string } }>,
    reply: FastifyReply
  ) {
    const { studioId } = StudioFinancialReportingController.extractAuth(req);
    if (!studioId) return reply.status(400).send({ error: 'Missing studio identification' });

    try {
      const service = StudioFinancialReportingController.getService();
      const sDate = req.query.start_date || '1970-01-01';
      const eDate = req.query.end_date || '2099-12-31';
      const result = await service.getProfitAndLoss(studioId, sDate, eDate, req.query.currency);
      return reply.status(200).send(result);
    } catch (err: any) {
      return reply.status(400).send({ error: err.message });
    }
  }

  static async getBalanceSheet(
    req: FastifyRequest<{ Querystring: { as_of_date?: string; currency?: string } }>,
    reply: FastifyReply
  ) {
    const { studioId } = StudioFinancialReportingController.extractAuth(req);
    if (!studioId) return reply.status(400).send({ error: 'Missing studio identification' });

    try {
      const service = StudioFinancialReportingController.getService();
      const result = await service.getBalanceSheet(studioId, req.query.as_of_date, req.query.currency);
      return reply.status(200).send(result);
    } catch (err: any) {
      return reply.status(400).send({ error: err.message });
    }
  }

  static async getTrialBalance(
    req: FastifyRequest<{ Querystring: { as_of_date?: string; currency?: string } }>,
    reply: FastifyReply
  ) {
    const { studioId } = StudioFinancialReportingController.extractAuth(req);
    if (!studioId) return reply.status(400).send({ error: 'Missing studio identification' });

    try {
      const service = StudioFinancialReportingController.getService();
      const result = await service.getTrialBalance(studioId, req.query);
      return reply.status(200).send(result);
    } catch (err: any) {
      return reply.status(400).send({ error: err.message });
    }
  }

  static async getCashFlow(
    req: FastifyRequest<{ Querystring: { start_date?: string; end_date?: string; currency?: string; method?: 'DIRECT' | 'INDIRECT' } }>,
    reply: FastifyReply
  ) {
    const { studioId } = StudioFinancialReportingController.extractAuth(req);
    if (!studioId) return reply.status(400).send({ error: 'Missing studio identification' });

    try {
      const service = StudioFinancialReportingController.getService();
      const result = await service.getCashFlow(
        studioId,
        req.query.start_date,
        req.query.end_date,
        req.query.currency,
        req.query.method
      );
      return reply.status(200).send(result);
    } catch (err: any) {
      return reply.status(400).send({ error: err.message });
    }
  }

  static async getGeneralLedger(
    req: FastifyRequest<{ Querystring: { start_date?: string; end_date?: string; account_id?: string; page?: string; limit?: string } }>,
    reply: FastifyReply
  ) {
    const { studioId } = StudioFinancialReportingController.extractAuth(req);
    if (!studioId) return reply.status(400).send({ error: 'Missing studio identification' });

    try {
      const service = StudioFinancialReportingController.getService();
      const page = req.query.page ? parseInt(req.query.page, 10) : 1;
      const limit = req.query.limit ? parseInt(req.query.limit, 10) : 100;
      const result = await service.getGeneralLedger(
        studioId,
        req.query.start_date,
        req.query.end_date,
        req.query.account_id,
        page,
        limit
      );
      return reply.status(200).send(result);
    } catch (err: any) {
      return reply.status(400).send({ error: err.message });
    }
  }

  static async getFinancialPosition(
    req: FastifyRequest<{ Querystring: { as_of_date?: string; currency?: string } }>,
    reply: FastifyReply
  ) {
    const { studioId } = StudioFinancialReportingController.extractAuth(req);
    if (!studioId) return reply.status(400).send({ error: 'Missing studio identification' });

    try {
      const service = StudioFinancialReportingController.getService();
      const result = await service.getFinancialPosition(studioId, req.query.as_of_date, req.query.currency);
      return reply.status(200).send(result);
    } catch (err: any) {
      return reply.status(400).send({ error: err.message });
    }
  }

  // --- SUBLEDGER & OPERATIONS REPORTS ---

  static async getArAging(
    req: FastifyRequest<{ Querystring: { as_of_date?: string; currency?: string } }>,
    reply: FastifyReply
  ) {
    const { studioId } = StudioFinancialReportingController.extractAuth(req);
    if (!studioId) return reply.status(400).send({ error: 'Missing studio identification' });

    try {
      const service = StudioFinancialReportingController.getService();
      const result = await service.getArAgingReport(studioId, req.query.as_of_date, req.query.currency);
      return reply.status(200).send(result);
    } catch (err: any) {
      return reply.status(400).send({ error: err.message });
    }
  }

  static async getApAging(
    req: FastifyRequest<{ Querystring: { as_of_date?: string; currency?: string } }>,
    reply: FastifyReply
  ) {
    const { studioId } = StudioFinancialReportingController.extractAuth(req);
    if (!studioId) return reply.status(400).send({ error: 'Missing studio identification' });

    try {
      const service = StudioFinancialReportingController.getService();
      const result = await service.getApAgingReport(studioId, req.query.as_of_date, req.query.currency);
      return reply.status(200).send(result);
    } catch (err: any) {
      return reply.status(400).send({ error: err.message });
    }
  }

  static async getRevenueReport(
    req: FastifyRequest<{ Querystring: { start_date?: string; end_date?: string; currency?: string } }>,
    reply: FastifyReply
  ) {
    const { studioId } = StudioFinancialReportingController.extractAuth(req);
    if (!studioId) return reply.status(400).send({ error: 'Missing studio identification' });

    try {
      const service = StudioFinancialReportingController.getService();
      const result = await service.getRevenueReport(studioId, req.query.start_date, req.query.end_date, req.query.currency);
      return reply.status(200).send(result);
    } catch (err: any) {
      return reply.status(400).send({ error: err.message });
    }
  }

  static async getExpenseReport(
    req: FastifyRequest<{ Querystring: { start_date?: string; end_date?: string; currency?: string } }>,
    reply: FastifyReply
  ) {
    const { studioId } = StudioFinancialReportingController.extractAuth(req);
    if (!studioId) return reply.status(400).send({ error: 'Missing studio identification' });

    try {
      const service = StudioFinancialReportingController.getService();
      const result = await service.getExpenseReport(studioId, req.query.start_date, req.query.end_date, req.query.currency);
      return reply.status(200).send(result);
    } catch (err: any) {
      return reply.status(400).send({ error: err.message });
    }
  }

  static async getProjectProfitability(
    req: FastifyRequest<{ Querystring: { start_date?: string; end_date?: string; currency?: string } }>,
    reply: FastifyReply
  ) {
    const { studioId } = StudioFinancialReportingController.extractAuth(req);
    if (!studioId) return reply.status(400).send({ error: 'Missing studio identification' });

    try {
      const service = StudioFinancialReportingController.getService();
      const result = await service.getProjectProfitabilityReport(studioId, req.query.start_date, req.query.end_date, req.query.currency);
      return reply.status(200).send(result);
    } catch (err: any) {
      return reply.status(400).send({ error: err.message });
    }
  }

  // --- TAX & COMPLIANCE ---

  static async getTaxSummary(
    req: FastifyRequest<{ Querystring: { start_date?: string; end_date?: string; currency?: string } }>,
    reply: FastifyReply
  ) {
    const { studioId } = StudioFinancialReportingController.extractAuth(req);
    if (!studioId) return reply.status(400).send({ error: 'Missing studio identification' });

    try {
      const service = StudioFinancialReportingController.getService();
      const result = await service.getTaxSummaryReport(studioId, req.query.start_date, req.query.end_date, req.query.currency);
      return reply.status(200).send(result);
    } catch (err: any) {
      return reply.status(400).send({ error: err.message });
    }
  }

  static async getGstCompliance(
    req: FastifyRequest<{ Querystring: { start_date?: string; end_date?: string; currency?: string } }>,
    reply: FastifyReply
  ) {
    const { studioId } = StudioFinancialReportingController.extractAuth(req);
    if (!studioId) return reply.status(400).send({ error: 'Missing studio identification' });

    try {
      const service = StudioFinancialReportingController.getService();
      const result = await service.getGstComplianceReport(studioId, req.query.start_date, req.query.end_date, req.query.currency);
      return reply.status(200).send(result);
    } catch (err: any) {
      return reply.status(400).send({ error: err.message });
    }
  }

  static async getTaxReconciliation(
    req: FastifyRequest<{ Querystring: { start_date?: string; end_date?: string; currency?: string } }>,
    reply: FastifyReply
  ) {
    const { studioId } = StudioFinancialReportingController.extractAuth(req);
    if (!studioId) return reply.status(400).send({ error: 'Missing studio identification' });

    try {
      const service = StudioFinancialReportingController.getService();
      const result = await service.reconcileTaxWithLedger(studioId, req.query.start_date, req.query.end_date, req.query.currency);
      return reply.status(200).send(result);
    } catch (err: any) {
      return reply.status(400).send({ error: err.message });
    }
  }

  static async getReconciliationOverview(req: FastifyRequest, reply: FastifyReply) {
    const { studioId } = StudioFinancialReportingController.extractAuth(req);
    if (!studioId) return reply.status(400).send({ error: 'Missing studio identification' });

    try {
      const service = StudioFinancialReportingController.getService();
      const result = await service.getReconciliationOverview(studioId);
      return reply.status(200).send(result);
    } catch (err: any) {
      return reply.status(400).send({ error: err.message });
    }
  }

  // --- ANOMALIES & INSIGHTS ---

  static async getAnomalies(req: FastifyRequest, reply: FastifyReply) {
    const { studioId } = StudioFinancialReportingController.extractAuth(req);
    if (!studioId) return reply.status(400).send({ error: 'Missing studio identification' });

    try {
      const service = StudioFinancialReportingController.getService();
      const result = await service.detectFinancialAnomalies(studioId);
      return reply.status(200).send(result);
    } catch (err: any) {
      return reply.status(400).send({ error: err.message });
    }
  }

  static async updateAnomaly(
    req: FastifyRequest<{ Params: { id: string }; Body: IUpdateAnomalyStatusDTO }>,
    reply: FastifyReply
  ) {
    const { studioId, userId } = StudioFinancialReportingController.extractAuth(req);
    if (!studioId) return reply.status(400).send({ error: 'Missing studio identification' });

    try {
      const service = StudioFinancialReportingController.getService();
      const result = await service.updateAnomalyStatus(studioId, req.params.id, req.body, userId);
      return reply.status(200).send(result);
    } catch (err: any) {
      return reply.status(400).send({ error: err.message });
    }
  }

  static async getInsights(
    req: FastifyRequest<{
      Querystring: {
        current_start?: string;
        current_end?: string;
        previous_start?: string;
        previous_end?: string;
        currency?: string;
      };
    }>,
    reply: FastifyReply
  ) {
    const { studioId } = StudioFinancialReportingController.extractAuth(req);
    if (!studioId) return reply.status(400).send({ error: 'Missing studio identification' });

    try {
      const service = StudioFinancialReportingController.getService();
      const now = new Date();
      const cStart = req.query.current_start || new Date(now.getFullYear(), now.getMonth(), 1);
      const cEnd = req.query.current_end || now;
      const result = await service.getFinancialInsights(
        studioId,
        cStart,
        cEnd,
        req.query.previous_start,
        req.query.previous_end,
        req.query.currency
      );
      return reply.status(200).send(result);
    } catch (err: any) {
      return reply.status(400).send({ error: err.message });
    }
  }

  // --- MONTH-END CLOSE ---

  static async getMonthEndCloseStatus(
    req: FastifyRequest<{ Querystring: { period_id?: string } }>,
    reply: FastifyReply
  ) {
    const { studioId } = StudioFinancialReportingController.extractAuth(req);
    if (!studioId) return reply.status(400).send({ error: 'Missing studio identification' });

    try {
      const service = StudioFinancialReportingController.getService();
      const result = await service.getMonthEndCloseStatus(studioId, req.query.period_id);
      return reply.status(200).send(result);
    } catch (err: any) {
      return reply.status(400).send({ error: err.message });
    }
  }

  static async executeMonthEndClose(
    req: FastifyRequest<{ Body: { period_id: string } }>,
    reply: FastifyReply
  ) {
    const { studioId, userId } = StudioFinancialReportingController.extractAuth(req);
    if (!studioId) return reply.status(400).send({ error: 'Missing studio identification' });

    try {
      const service = StudioFinancialReportingController.getService();
      const result = await service.executeMonthEndClose(studioId, req.body.period_id, userId);
      return reply.status(200).send(result);
    } catch (err: any) {
      return reply.status(400).send({ error: err.message });
    }
  }

  // --- EXPORTS & ACCOUNTANT HANDOFF ---

  static async exportReportCsv(
    req: FastifyRequest<{ Querystring: { report_type: StudioFinancialReportType; start_date?: string; end_date?: string; currency?: string } }>,
    reply: FastifyReply
  ) {
    const { studioId } = StudioFinancialReportingController.extractAuth(req);
    if (!studioId) return reply.status(400).send({ error: 'Missing studio identification' });

    try {
      const service = StudioFinancialReportingController.getService();
      const csv = await service.exportCsvReport(studioId, req.query.report_type, {
        period_start: req.query.start_date,
        period_end: req.query.end_date,
        currency: req.query.currency,
      });

      return reply
        .header('Content-Type', 'text/csv; charset=utf-8')
        .header('Content-Disposition', `attachment; filename="${req.query.report_type.toLowerCase()}_${Date.now()}.csv"`)
        .send(csv);
    } catch (err: any) {
      return reply.status(400).send({ error: err.message });
    }
  }

  static async exportReportPdf(
    req: FastifyRequest<{ Querystring: { report_type: StudioFinancialReportType; start_date?: string; end_date?: string; currency?: string } }>,
    reply: FastifyReply
  ) {
    const { studioId } = StudioFinancialReportingController.extractAuth(req);
    if (!studioId) return reply.status(400).send({ error: 'Missing studio identification' });

    try {
      const service = StudioFinancialReportingController.getService();
      const html = await service.renderPdfReport(studioId, req.query.report_type, {
        period_start: req.query.start_date,
        period_end: req.query.end_date,
        currency: req.query.currency,
      });

      return reply.header('Content-Type', 'text/html; charset=utf-8').send(html);
    } catch (err: any) {
      return reply.status(400).send({ error: err.message });
    }
  }

  static async createExport(
    req: FastifyRequest<{ Body: ICreateReportExportDTO }>,
    reply: FastifyReply
  ) {
    const { studioId, userId } = StudioFinancialReportingController.extractAuth(req);
    if (!studioId) return reply.status(400).send({ error: 'Missing studio identification' });

    try {
      const service = StudioFinancialReportingController.getService();
      const result = await service.createExport(studioId, req.body, userId);
      return reply.status(201).send(result);
    } catch (err: any) {
      return reply.status(400).send({ error: err.message });
    }
  }

  static async getAccountantHandoff(
    req: FastifyRequest<{ Querystring: { start_date?: string; end_date?: string } }>,
    reply: FastifyReply
  ) {
    const { studioId, userId } = StudioFinancialReportingController.extractAuth(req);
    if (!studioId) return reply.status(400).send({ error: 'Missing studio identification' });

    try {
      const service = StudioFinancialReportingController.getService();
      const now = new Date();
      const sDate = req.query.start_date || new Date(now.getFullYear(), 0, 1);
      const eDate = req.query.end_date || now;
      const result = await service.generateAccountantHandoffBundle(studioId, sDate, eDate, userId);
      return reply.status(200).send(result);
    } catch (err: any) {
      return reply.status(400).send({ error: err.message });
    }
  }

  // --- SCHEDULES ---

  static async createSchedule(req: FastifyRequest<{ Body: ICreateReportScheduleDTO }>, reply: FastifyReply) {
    const { studioId } = StudioFinancialReportingController.extractAuth(req);
    if (!studioId) return reply.status(400).send({ error: 'Missing studio identification' });

    try {
      const service = StudioFinancialReportingController.getService();
      const result = await service.createSchedule(studioId, req.body);
      return reply.status(201).send(result);
    } catch (err: any) {
      return reply.status(400).send({ error: err.message });
    }
  }

  static async listSchedules(req: FastifyRequest, reply: FastifyReply) {
    const { studioId } = StudioFinancialReportingController.extractAuth(req);
    if (!studioId) return reply.status(400).send({ error: 'Missing studio identification' });

    try {
      const service = StudioFinancialReportingController.getService();
      const result = await service.listSchedules(studioId);
      return reply.status(200).send(result);
    } catch (err: any) {
      return reply.status(400).send({ error: err.message });
    }
  }

  static async updateSchedule(
    req: FastifyRequest<{ Params: { id: string }; Body: IUpdateReportScheduleDTO }>,
    reply: FastifyReply
  ) {
    const { studioId } = StudioFinancialReportingController.extractAuth(req);
    if (!studioId) return reply.status(400).send({ error: 'Missing studio identification' });

    try {
      const service = StudioFinancialReportingController.getService();
      const result = await service.updateSchedule(studioId, req.params.id, req.body);
      return reply.status(200).send(result);
    } catch (err: any) {
      return reply.status(400).send({ error: err.message });
    }
  }

  static async deleteSchedule(req: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) {
    const { studioId } = StudioFinancialReportingController.extractAuth(req);
    if (!studioId) return reply.status(400).send({ error: 'Missing studio identification' });

    try {
      const service = StudioFinancialReportingController.getService();
      const result = await service.deleteSchedule(studioId, req.params.id);
      return reply.status(200).send({ success: result });
    } catch (err: any) {
      return reply.status(400).send({ error: err.message });
    }
  }
}
