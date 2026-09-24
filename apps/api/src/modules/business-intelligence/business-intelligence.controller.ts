/**
 * Studio Business Intelligence, Forecasting & Decision Intelligence 2.0 Controller — PIXMatch AI Phase 38
 */

import { FastifyRequest, FastifyReply } from 'fastify';
import { StudioBusinessIntelligenceService } from './business-intelligence.service';
import { prisma } from '@pixmatch/database';
import { BiForecastMethod, BiPeriodType, BiComparisonType, IBiScenarioParameters } from '@pixmatch/types';

export class StudioBusinessIntelligenceController {
  private static getService(): StudioBusinessIntelligenceService {
    return new StudioBusinessIntelligenceService(prisma);
  }

  private static extractAuth(req: FastifyRequest) {
    const user = (req as any).user;
    const studioId =
      (req as any).studioId ||
      (req as any).tenantId ||
      req.headers['x-studio-id'] ||
      user?.studioId ||
      user?.studio_id;
    const userId = user?.id || user?.userId || 'anonymous';
    return { studioId, userId };
  }

  // --- EXECUTIVE DASHBOARD ---

  static async getDashboard(
    req: FastifyRequest<{ Querystring: { period?: string; currency?: string } }>,
    reply: FastifyReply
  ) {
    const { studioId } = StudioBusinessIntelligenceController.extractAuth(req);
    if (!studioId) return reply.status(400).send({ error: 'Missing studio identification' });

    try {
      const service = StudioBusinessIntelligenceController.getService();
      const result = await service.getExecutiveDashboard(
        studioId,
        req.query.period,
        req.query.currency
      );
      return reply.status(200).send(result);
    } catch (err: any) {
      return reply.status(400).send({ error: err.message });
    }
  }

  // --- KPIS ---

  static async getKpis(
    req: FastifyRequest<{ Querystring: { period?: string; currency?: string } }>,
    reply: FastifyReply
  ) {
    const { studioId } = StudioBusinessIntelligenceController.extractAuth(req);
    if (!studioId) return reply.status(400).send({ error: 'Missing studio identification' });

    try {
      const service = StudioBusinessIntelligenceController.getService();
      const result = await service.getBusinessKpis(
        studioId,
        req.query.period,
        req.query.currency
      );
      return reply.status(200).send(result);
    } catch (err: any) {
      return reply.status(400).send({ error: err.message });
    }
  }

  static async getKpiDefinitions(req: FastifyRequest, reply: FastifyReply) {
    try {
      const service = StudioBusinessIntelligenceController.getService();
      const result = service.getKpiDefinitions();
      return reply.status(200).send(result);
    } catch (err: any) {
      return reply.status(400).send({ error: err.message });
    }
  }

  // --- TRENDS ---

  static async getRevenueTrend(
    req: FastifyRequest<{ Querystring: { period?: string; currency?: string } }>,
    reply: FastifyReply
  ) {
    const { studioId } = StudioBusinessIntelligenceController.extractAuth(req);
    if (!studioId) return reply.status(400).send({ error: 'Missing studio identification' });

    try {
      const service = StudioBusinessIntelligenceController.getService();
      const result = await service.getRevenueTrend(studioId, req.query.period, req.query.currency);
      return reply.status(200).send(result);
    } catch (err: any) {
      return reply.status(400).send({ error: err.message });
    }
  }

  static async getProfitTrend(
    req: FastifyRequest<{ Querystring: { period?: string; currency?: string } }>,
    reply: FastifyReply
  ) {
    const { studioId } = StudioBusinessIntelligenceController.extractAuth(req);
    if (!studioId) return reply.status(400).send({ error: 'Missing studio identification' });

    try {
      const service = StudioBusinessIntelligenceController.getService();
      const result = await service.getProfitTrend(studioId, req.query.period, req.query.currency);
      return reply.status(200).send(result);
    } catch (err: any) {
      return reply.status(400).send({ error: err.message });
    }
  }

  static async getCashTrend(
    req: FastifyRequest<{ Querystring: { period?: string; currency?: string } }>,
    reply: FastifyReply
  ) {
    const { studioId } = StudioBusinessIntelligenceController.extractAuth(req);
    if (!studioId) return reply.status(400).send({ error: 'Missing studio identification' });

    try {
      const service = StudioBusinessIntelligenceController.getService();
      const result = await service.getCashTrend(studioId, req.query.period, req.query.currency);
      return reply.status(200).send(result);
    } catch (err: any) {
      return reply.status(400).send({ error: err.message });
    }
  }

  static async getPipelineTrend(
    req: FastifyRequest<{ Querystring: { period?: string; currency?: string } }>,
    reply: FastifyReply
  ) {
    const { studioId } = StudioBusinessIntelligenceController.extractAuth(req);
    if (!studioId) return reply.status(400).send({ error: 'Missing studio identification' });

    try {
      const service = StudioBusinessIntelligenceController.getService();
      const result = await service.getPipelineTrend(studioId, req.query.period, req.query.currency);
      return reply.status(200).send(result);
    } catch (err: any) {
      return reply.status(400).send({ error: err.message });
    }
  }

  static async getBookingTrend(
    req: FastifyRequest<{ Querystring: { period?: string; currency?: string } }>,
    reply: FastifyReply
  ) {
    const { studioId } = StudioBusinessIntelligenceController.extractAuth(req);
    if (!studioId) return reply.status(400).send({ error: 'Missing studio identification' });

    try {
      const service = StudioBusinessIntelligenceController.getService();
      const result = await service.getBookingTrend(studioId, req.query.period, req.query.currency);
      return reply.status(200).send(result);
    } catch (err: any) {
      return reply.status(400).send({ error: err.message });
    }
  }

  // --- PROJECTS, CLIENTS, TEAM ---

  static async getProjects(
    req: FastifyRequest<{ Querystring: { status?: string; currency?: string } }>,
    reply: FastifyReply
  ) {
    const { studioId } = StudioBusinessIntelligenceController.extractAuth(req);
    if (!studioId) return reply.status(400).send({ error: 'Missing studio identification' });

    try {
      const service = StudioBusinessIntelligenceController.getService();
      const result = await service.getProjectPerformance(
        studioId,
        req.query.status,
        req.query.currency
      );
      return reply.status(200).send(result);
    } catch (err: any) {
      return reply.status(400).send({ error: err.message });
    }
  }

  static async getClients(
    req: FastifyRequest<{ Querystring: { limit?: string; currency?: string } }>,
    reply: FastifyReply
  ) {
    const { studioId } = StudioBusinessIntelligenceController.extractAuth(req);
    if (!studioId) return reply.status(400).send({ error: 'Missing studio identification' });

    try {
      const service = StudioBusinessIntelligenceController.getService();
      const limit = req.query.limit ? parseInt(req.query.limit, 10) : 50;
      const result = await service.getClientBusinessMetrics(studioId, limit, req.query.currency);
      return reply.status(200).send(result);
    } catch (err: any) {
      return reply.status(400).send({ error: err.message });
    }
  }

  static async getTeamCapacity(
    req: FastifyRequest<{ Querystring: { horizon_days?: string } }>,
    reply: FastifyReply
  ) {
    const { studioId } = StudioBusinessIntelligenceController.extractAuth(req);
    if (!studioId) return reply.status(400).send({ error: 'Missing studio identification' });

    try {
      const service = StudioBusinessIntelligenceController.getService();
      const horizonDays = req.query.horizon_days ? parseInt(req.query.horizon_days, 10) : 30;
      const result = await service.getTeamCapacityMetrics(studioId, horizonDays);
      return reply.status(200).send(result);
    } catch (err: any) {
      return reply.status(400).send({ error: err.message });
    }
  }

  // --- ALERTS & INSIGHTS ---

  static async getAlerts(req: FastifyRequest, reply: FastifyReply) {
    const { studioId } = StudioBusinessIntelligenceController.extractAuth(req);
    if (!studioId) return reply.status(400).send({ error: 'Missing studio identification' });

    try {
      const service = StudioBusinessIntelligenceController.getService();
      const dashboard = await service.getExecutiveDashboard(studioId);
      return reply.status(200).send(dashboard.alerts);
    } catch (err: any) {
      return reply.status(400).send({ error: err.message });
    }
  }

  static async getInsights(req: FastifyRequest, reply: FastifyReply) {
    const { studioId } = StudioBusinessIntelligenceController.extractAuth(req);
    if (!studioId) return reply.status(400).send({ error: 'Missing studio identification' });

    try {
      const service = StudioBusinessIntelligenceController.getService();
      const dashboard = await service.getExecutiveDashboard(studioId);
      return reply.status(200).send(dashboard.insights);
    } catch (err: any) {
      return reply.status(400).send({ error: err.message });
    }
  }

  // --- FORECASTS ---

  static async getForecasts(
    req: FastifyRequest<{ Querystring: { method?: BiForecastMethod; currency?: string } }>,
    reply: FastifyReply
  ) {
    const { studioId } = StudioBusinessIntelligenceController.extractAuth(req);
    if (!studioId) return reply.status(400).send({ error: 'Missing studio identification' });

    try {
      const service = StudioBusinessIntelligenceController.getService();
      const result = await service.getForecasts(
        studioId,
        req.query.method || 'WEIGHTED_MOVING_AVERAGE',
        req.query.currency
      );
      return reply.status(200).send(result);
    } catch (err: any) {
      return reply.status(400).send({ error: err.message });
    }
  }

  // --- SCENARIOS & SENSITIVITY ---

  static async runScenario(
    req: FastifyRequest<{ Body: IBiScenarioParameters; Querystring: { currency?: string } }>,
    reply: FastifyReply
  ) {
    const { studioId } = StudioBusinessIntelligenceController.extractAuth(req);
    if (!studioId) return reply.status(400).send({ error: 'Missing studio identification' });

    try {
      const service = StudioBusinessIntelligenceController.getService();
      const result = await service.runScenario(studioId, req.body, req.query.currency);
      return reply.status(200).send(result);
    } catch (err: any) {
      return reply.status(400).send({ error: err.message });
    }
  }

  static async getSensitivity(
    req: FastifyRequest<{
      Querystring: { dimension?: 'REVENUE' | 'EXPENSE' | 'BOOKINGS' | 'AVERAGE_PROJECT_VALUE'; currency?: string };
    }>,
    reply: FastifyReply
  ) {
    const { studioId } = StudioBusinessIntelligenceController.extractAuth(req);
    if (!studioId) return reply.status(400).send({ error: 'Missing studio identification' });

    try {
      const service = StudioBusinessIntelligenceController.getService();
      const result = await service.getSensitivityAnalysis(
        studioId,
        req.query.dimension || 'REVENUE',
        req.query.currency
      );
      return reply.status(200).send(result);
    } catch (err: any) {
      return reply.status(400).send({ error: err.message });
    }
  }

  // --- BREAK-EVEN, GOALS, SCORECARD, SEASONALITY ---

  static async getBreakEven(
    req: FastifyRequest<{ Querystring: { currency?: string } }>,
    reply: FastifyReply
  ) {
    const { studioId } = StudioBusinessIntelligenceController.extractAuth(req);
    if (!studioId) return reply.status(400).send({ error: 'Missing studio identification' });

    try {
      const service = StudioBusinessIntelligenceController.getService();
      const result = await service.getBreakEvenAnalysis(studioId, req.query.currency);
      return reply.status(200).send(result);
    } catch (err: any) {
      return reply.status(400).send({ error: err.message });
    }
  }

  static async getGoals(
    req: FastifyRequest<{ Querystring: { currency?: string } }>,
    reply: FastifyReply
  ) {
    const { studioId } = StudioBusinessIntelligenceController.extractAuth(req);
    if (!studioId) return reply.status(400).send({ error: 'Missing studio identification' });

    try {
      const service = StudioBusinessIntelligenceController.getService();
      const result = await service.getGoalTracking(studioId, req.query.currency);
      return reply.status(200).send(result);
    } catch (err: any) {
      return reply.status(400).send({ error: err.message });
    }
  }

  static async getScorecard(
    req: FastifyRequest<{ Querystring: { currency?: string } }>,
    reply: FastifyReply
  ) {
    const { studioId } = StudioBusinessIntelligenceController.extractAuth(req);
    if (!studioId) return reply.status(400).send({ error: 'Missing studio identification' });

    try {
      const service = StudioBusinessIntelligenceController.getService();
      const result = await service.getBusinessScorecard(studioId, req.query.currency);
      return reply.status(200).send(result);
    } catch (err: any) {
      return reply.status(400).send({ error: err.message });
    }
  }

  static async getSeasonality(
    req: FastifyRequest<{ Querystring: { currency?: string } }>,
    reply: FastifyReply
  ) {
    const { studioId } = StudioBusinessIntelligenceController.extractAuth(req);
    if (!studioId) return reply.status(400).send({ error: 'Missing studio identification' });

    try {
      const service = StudioBusinessIntelligenceController.getService();
      const result = await service.getSeasonality(studioId, req.query.currency);
      return reply.status(200).send(result);
    } catch (err: any) {
      return reply.status(400).send({ error: err.message });
    }
  }

  // --- REPORTS & EXPORT ---

  static async getReports(
    req: FastifyRequest<{
      Querystring: { period_start?: string; period_end?: string; currency?: string };
    }>,
    reply: FastifyReply
  ) {
    const { studioId } = StudioBusinessIntelligenceController.extractAuth(req);
    if (!studioId) return reply.status(400).send({ error: 'Missing studio identification' });

    try {
      const service = StudioBusinessIntelligenceController.getService();
      const result = await service.getManagementReport(
        studioId,
        req.query.period_start,
        req.query.period_end,
        req.query.currency
      );
      return reply.status(200).send(result);
    } catch (err: any) {
      return reply.status(400).send({ error: err.message });
    }
  }

  static async exportReportCsv(
    req: FastifyRequest<{
      Querystring: { period_start?: string; period_end?: string; currency?: string };
    }>,
    reply: FastifyReply
  ) {
    const { studioId } = StudioBusinessIntelligenceController.extractAuth(req);
    if (!studioId) return reply.status(400).send({ error: 'Missing studio identification' });

    try {
      const service = StudioBusinessIntelligenceController.getService();
      const csv = await service.exportReportCsv(
        studioId,
        req.query.period_start,
        req.query.period_end,
        req.query.currency
      );
      reply.header('Content-Type', 'text/csv; charset=utf-8');
      reply.header(
        'Content-Disposition',
        `attachment; filename="BI_Management_Report_${new Date().toISOString().slice(0, 10)}.csv"`
      );
      return reply.status(200).send(csv);
    } catch (err: any) {
      return reply.status(400).send({ error: err.message });
    }
  }

  static async exportReportPdf(
    req: FastifyRequest<{
      Querystring: { period_start?: string; period_end?: string; currency?: string };
    }>,
    reply: FastifyReply
  ) {
    const { studioId } = StudioBusinessIntelligenceController.extractAuth(req);
    if (!studioId) return reply.status(400).send({ error: 'Missing studio identification' });

    try {
      const service = StudioBusinessIntelligenceController.getService();
      const pdf = await service.exportReportPdf(
        studioId,
        req.query.period_start,
        req.query.period_end,
        req.query.currency
      );
      reply.header('Content-Type', pdf.content_type);
      reply.header('Content-Disposition', `attachment; filename="${pdf.file_name}"`);
      return reply.status(200).send(pdf.buffer);
    } catch (err: any) {
      return reply.status(400).send({ error: err.message });
    }
  }
}
