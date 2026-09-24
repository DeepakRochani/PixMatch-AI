/**
 * Business Intelligence Controller — PIXMatch AI Phase 18
 * Controller endpoints for transactions, aggregation, forecasting, goals, insights, and exports.
 */

import { FastifyRequest, FastifyReply } from 'fastify';
import { BusinessTransactionService } from './business-transaction.service.js';
import { BusinessAggregationService } from './business-aggregation.service.js';
import { BusinessGoalService } from './business-goal.service.js';
import { BusinessForecastService } from './business-forecast.service.js';
import { BusinessInsightService } from './business-insight.service.js';
import { BusinessAdminService } from './business-admin.service.js';
import { BusinessForecastMetric, BusinessForecastPeriod, BusinessInsightStatus } from '@pixmatch/types';

export class BusinessController {
  private static getStudioId(req: FastifyRequest): string {
    const user = (req as any).user;
    const studioId = user?.studio_id || user?.studioId || (req.headers['x-studio-id'] as string);
    if (!studioId) {
      throw new Error('Studio ID is required');
    }
    return studioId;
  }

  // ==========================================
  // TRANSACTIONS
  // ==========================================

  static async createTransaction(req: FastifyRequest, reply: FastifyReply) {
    try {
      const studioId = BusinessController.getStudioId(req);
      const userId = (req as any).user?.id;
      const transaction = await BusinessTransactionService.createTransaction(
        studioId,
        req.body as any,
        userId
      );
      return reply.code(201).send(transaction);
    } catch (err: any) {
      return reply.code(400).send({ error: err.message });
    }
  }

  static async getTransaction(req: FastifyRequest<{ Params: { transactionId: string } }>, reply: FastifyReply) {
    try {
      const studioId = BusinessController.getStudioId(req);
      const transaction = await BusinessTransactionService.getTransactionById(
        studioId,
        req.params.transactionId
      );
      return reply.send(transaction);
    } catch (err: any) {
      return reply.code(404).send({ error: err.message });
    }
  }

  static async listTransactions(req: FastifyRequest<{ Querystring: any }>, reply: FastifyReply) {
    try {
      const studioId = BusinessController.getStudioId(req);
      const result = await BusinessTransactionService.listTransactions(studioId, req.query);
      return reply.send(result);
    } catch (err: any) {
      return reply.code(400).send({ error: err.message });
    }
  }

  static async updateTransaction(
    req: FastifyRequest<{ Params: { transactionId: string } }>,
    reply: FastifyReply
  ) {
    try {
      const studioId = BusinessController.getStudioId(req);
      const userId = (req as any).user?.id;
      const transaction = await BusinessTransactionService.updateTransaction(
        studioId,
        req.params.transactionId,
        req.body as any,
        userId
      );
      return reply.send(transaction);
    } catch (err: any) {
      return reply.code(400).send({ error: err.message });
    }
  }

  static async voidTransaction(
    req: FastifyRequest<{ Params: { transactionId: string } }>,
    reply: FastifyReply
  ) {
    try {
      const studioId = BusinessController.getStudioId(req);
      const userId = (req as any).user?.id;
      const transaction = await BusinessTransactionService.voidTransaction(
        studioId,
        req.params.transactionId,
        req.body as any,
        userId
      );
      return reply.send(transaction);
    } catch (err: any) {
      return reply.code(400).send({ error: err.message });
    }
  }

  static async exportTransactionsCsv(req: FastifyRequest<{ Querystring: any }>, reply: FastifyReply) {
    try {
      const studioId = BusinessController.getStudioId(req);
      const csv = await BusinessTransactionService.exportTransactionsCsv(studioId, req.query);
      return reply
        .header('Content-Type', 'text/csv; charset=utf-8')
        .header('Content-Disposition', 'attachment; filename="business-transactions.csv"')
        .send(csv);
    } catch (err: any) {
      return reply.code(400).send({ error: err.message });
    }
  }

  // ==========================================
  // AGGREGATION & REPORTING
  // ==========================================

  static async getOverview(req: FastifyRequest<{ Querystring: any }>, reply: FastifyReply) {
    try {
      const studioId = BusinessController.getStudioId(req);
      const overview = await BusinessAggregationService.getOverview(studioId, req.query);
      return reply.send(overview);
    } catch (err: any) {
      return reply.code(400).send({ error: err.message });
    }
  }

  static async getRevenueTrend(req: FastifyRequest<{ Querystring: any }>, reply: FastifyReply) {
    try {
      const studioId = BusinessController.getStudioId(req);
      const trend = await BusinessAggregationService.getRevenueTrend(studioId, req.query);
      return reply.send(trend);
    } catch (err: any) {
      return reply.code(400).send({ error: err.message });
    }
  }

  static async getRevenueBreakdown(req: FastifyRequest<{ Querystring: any }>, reply: FastifyReply) {
    try {
      const studioId = BusinessController.getStudioId(req);
      const breakdown = await BusinessAggregationService.getRevenueBreakdown(studioId, req.query);
      return reply.send(breakdown);
    } catch (err: any) {
      return reply.code(400).send({ error: err.message });
    }
  }

  static async getExpenseBreakdown(req: FastifyRequest<{ Querystring: any }>, reply: FastifyReply) {
    try {
      const studioId = BusinessController.getStudioId(req);
      const breakdown = await BusinessAggregationService.getExpenseBreakdown(studioId, req.query);
      return reply.send(breakdown);
    } catch (err: any) {
      return reply.code(400).send({ error: err.message });
    }
  }

  static async getStudioPerformance(req: FastifyRequest<{ Querystring: any }>, reply: FastifyReply) {
    try {
      const studioId = BusinessController.getStudioId(req);
      const perf = await BusinessAggregationService.getStudioPerformanceMetrics(studioId, req.query);
      return reply.send(perf);
    } catch (err: any) {
      return reply.code(400).send({ error: err.message });
    }
  }

  static async getServicePerformance(req: FastifyRequest<{ Querystring: any }>, reply: FastifyReply) {
    try {
      const studioId = BusinessController.getStudioId(req);
      const perf = await BusinessAggregationService.getServicePerformance(studioId, req.query);
      return reply.send(perf);
    } catch (err: any) {
      return reply.code(400).send({ error: err.message });
    }
  }

  static async getGalleryToBusinessFunnel(req: FastifyRequest<{ Querystring: any }>, reply: FastifyReply) {
    try {
      const studioId = BusinessController.getStudioId(req);
      const funnel = await BusinessAggregationService.getGalleryToBusinessFunnel(studioId, req.query);
      return reply.send(funnel);
    } catch (err: any) {
      return reply.code(400).send({ error: err.message });
    }
  }

  static async getClientBusinessSummary(req: FastifyRequest<{ Querystring: any }>, reply: FastifyReply) {
    try {
      const studioId = BusinessController.getStudioId(req);
      const clients = await BusinessAggregationService.getClientBusinessSummary(studioId, req.query);
      return reply.send(clients);
    } catch (err: any) {
      return reply.code(400).send({ error: err.message });
    }
  }

  // ==========================================
  // GOALS
  // ==========================================

  static async createGoal(req: FastifyRequest, reply: FastifyReply) {
    try {
      const studioId = BusinessController.getStudioId(req);
      const userId = (req as any).user?.id;
      const goal = await BusinessGoalService.createGoal(studioId, req.body as any, userId);
      return reply.code(201).send(goal);
    } catch (err: any) {
      return reply.code(400).send({ error: err.message });
    }
  }

  static async listGoals(req: FastifyRequest<{ Querystring: any }>, reply: FastifyReply) {
    try {
      const studioId = BusinessController.getStudioId(req);
      const goals = await BusinessGoalService.listGoals(studioId, req.query);
      return reply.send(goals);
    } catch (err: any) {
      return reply.code(400).send({ error: err.message });
    }
  }

  static async getGoal(req: FastifyRequest<{ Params: { goalId: string } }>, reply: FastifyReply) {
    try {
      const studioId = BusinessController.getStudioId(req);
      const goal = await BusinessGoalService.getGoalById(studioId, req.params.goalId);
      return reply.send(goal);
    } catch (err: any) {
      return reply.code(404).send({ error: err.message });
    }
  }

  static async updateGoal(req: FastifyRequest<{ Params: { goalId: string } }>, reply: FastifyReply) {
    try {
      const studioId = BusinessController.getStudioId(req);
      const userId = (req as any).user?.id;
      const goal = await BusinessGoalService.updateGoal(
        studioId,
        req.params.goalId,
        req.body as any,
        userId
      );
      return reply.send(goal);
    } catch (err: any) {
      return reply.code(400).send({ error: err.message });
    }
  }

  static async deleteGoal(req: FastifyRequest<{ Params: { goalId: string } }>, reply: FastifyReply) {
    try {
      const studioId = BusinessController.getStudioId(req);
      const userId = (req as any).user?.id;
      await BusinessGoalService.deleteGoal(studioId, req.params.goalId, userId);
      return reply.send({ success: true, message: 'Goal deleted successfully' });
    } catch (err: any) {
      return reply.code(400).send({ error: err.message });
    }
  }

  // ==========================================
  // FORECASTING
  // ==========================================

  static async getForecast(
    req: FastifyRequest<{ Querystring: { metric?: BusinessForecastMetric; period?: BusinessForecastPeriod } }>,
    reply: FastifyReply
  ) {
    try {
      const studioId = BusinessController.getStudioId(req);
      const forecast = await BusinessForecastService.generateForecast(
        studioId,
        req.query.metric,
        req.query.period
      );
      return reply.send(forecast);
    } catch (err: any) {
      return reply.code(400).send({ error: err.message });
    }
  }

  // ==========================================
  // INSIGHTS
  // ==========================================

  static async scanInsights(req: FastifyRequest, reply: FastifyReply) {
    try {
      const studioId = BusinessController.getStudioId(req);
      const insights = await BusinessInsightService.scanInsights(studioId);
      return reply.send(insights);
    } catch (err: any) {
      return reply.code(400).send({ error: err.message });
    }
  }

  static async listInsights(req: FastifyRequest<{ Querystring: any }>, reply: FastifyReply) {
    try {
      const studioId = BusinessController.getStudioId(req);
      const insights = await BusinessInsightService.listInsights(studioId, req.query);
      return reply.send(insights);
    } catch (err: any) {
      return reply.code(400).send({ error: err.message });
    }
  }

  static async acknowledgeInsight(
    req: FastifyRequest<{ Params: { insightId: string } }>,
    reply: FastifyReply
  ) {
    try {
      const studioId = BusinessController.getStudioId(req);
      const insight = await BusinessInsightService.updateInsightStatus(
        studioId,
        req.params.insightId,
        BusinessInsightStatus.ACKNOWLEDGED
      );
      return reply.send(insight);
    } catch (err: any) {
      return reply.code(400).send({ error: err.message });
    }
  }

  static async resolveInsight(
    req: FastifyRequest<{ Params: { insightId: string } }>,
    reply: FastifyReply
  ) {
    try {
      const studioId = BusinessController.getStudioId(req);
      const insight = await BusinessInsightService.updateInsightStatus(
        studioId,
        req.params.insightId,
        BusinessInsightStatus.RESOLVED
      );
      return reply.send(insight);
    } catch (err: any) {
      return reply.code(400).send({ error: err.message });
    }
  }

  static async dismissInsight(
    req: FastifyRequest<{ Params: { insightId: string } }>,
    reply: FastifyReply
  ) {
    try {
      const studioId = BusinessController.getStudioId(req);
      const insight = await BusinessInsightService.updateInsightStatus(
        studioId,
        req.params.insightId,
        BusinessInsightStatus.DISMISSED
      );
      return reply.send(insight);
    } catch (err: any) {
      return reply.code(400).send({ error: err.message });
    }
  }

  // ==========================================
  // ADMIN TELEMETRY
  // ==========================================

  static async getAdminTelemetry(req: FastifyRequest, reply: FastifyReply) {
    try {
      const user = (req as any).user;
      if (user?.role !== 'SUPER_ADMIN' && user?.role !== 'ADMIN') {
        return reply.code(403).send({ error: 'Super Admin privileges required' });
      }
      const telemetry = await BusinessAdminService.getAdminTelemetry();
      return reply.send(telemetry);
    } catch (err: any) {
      return reply.code(400).send({ error: err.message });
    }
  }
}
