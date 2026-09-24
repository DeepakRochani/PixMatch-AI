/**
 * Studio Planning Controller — PIXMatch AI Phase 39
 * Orchestrates business plans, target variance, budget alignment, and strategic initiatives.
 */

import { FastifyRequest, FastifyReply } from 'fastify';
import { StudioBusinessPlanService } from './business-plan.service';
import { StudioPlanTargetService } from './plan-target.service';
import { StudioPlanningVarianceService } from './planning-variance.service';
import { StudioPlanHealthService } from './plan-health.service';
import { StudioPlanningBudgetService } from './planning-budget.service';
import { StudioStrategicInitiativeService } from './strategic-initiative.service';
import { StudioPlanForecastScenarioService } from './plan-forecast-scenario.service';
import { StudioPlanReviewService } from './plan-review.service';
import { StudioPlanningExportService } from './planning-export.service';
import {
  BusinessPlanType,
  BusinessPlanStatus,
  BusinessPlanTargetType,
} from '@pixmatch/types';

export class StudioPlanningController {
  private static extractStudioId(req: FastifyRequest): string {
    const studioId = (req.headers['x-studio-id'] as string) || (req as any).user?.studioId || (req.query as any)?.studioId;
    if (!studioId) {
      throw new Error('Studio ID is required (header x-studio-id or auth context)');
    }
    return studioId;
  }

  private static extractUserId(req: FastifyRequest): string {
    return (req as any).user?.id || (req.headers['x-user-id'] as string) || 'system-user';
  }

  // ==================== DASHBOARD & HEALTH ====================

  static async getDashboardOverview(req: FastifyRequest, reply: FastifyReply) {
    try {
      const studioId = StudioPlanningController.extractStudioId(req);
      const query = req.query as any;
      const fiscalYear = query.fiscalYear ? parseInt(query.fiscalYear, 10) : undefined;

      const activePlan = await StudioBusinessPlanService.getActivePlan(studioId, fiscalYear);

      if (!activePlan) {
        return reply.send({
          hasActivePlan: false,
          activePlan: null,
          health: null,
          varianceSummary: null,
          message: 'No active business plan found for this fiscal year.',
        });
      }

      const [health, variance, budgetComp, objectives] = await Promise.all([
        StudioPlanHealthService.evaluatePlanHealth(studioId, activePlan.id),
        StudioPlanningVarianceService.getPlanVsActual(studioId, activePlan.id),
        StudioPlanningBudgetService.getPlanBudgetComparison(studioId, activePlan.id),
        StudioStrategicInitiativeService.listPlanObjectives(studioId, activePlan.id),
      ]);

      return reply.send({
        hasActivePlan: true,
        activePlan: {
          id: activePlan.id,
          name: activePlan.name,
          version: activePlan.version,
          status: activePlan.status,
          fiscalYear: activePlan.fiscalYear,
          currency: activePlan.currency,
          startDate: activePlan.startDate,
          endDate: activePlan.endDate,
        },
        health,
        varianceSummary: variance.summary,
        keyVariances: variance.items.filter((i) => i.isFavorable === false || i.severity !== 'NEGLIGIBLE').slice(0, 5),
        budgetSummary: {
          totalPlannedExpense: budgetComp.totalPlannedExpense,
          totalBudgetedAmount: budgetComp.totalBudgetedAmount,
          totalActualSpent: budgetComp.totalActualSpent,
          totalVariance: budgetComp.totalVariance,
          totalVariancePercent: budgetComp.totalVariancePercent,
        },
        strategicProgress: {
          totalObjectives: objectives.length,
          totalInitiatives: objectives.reduce((s, o) => s + o.totalInitiatives, 0),
          completedInitiatives: objectives.reduce((s, o) => s + o.completedInitiatives, 0),
        },
      });
    } catch (err: any) {
      return reply.status(400).send({ error: err.message });
    }
  }

  static async getPlanHealth(req: FastifyRequest, reply: FastifyReply) {
    try {
      const studioId = StudioPlanningController.extractStudioId(req);
      const { planId } = req.params as { planId: string };
      const health = await StudioPlanHealthService.evaluatePlanHealth(studioId, planId);
      return reply.send(health);
    } catch (err: any) {
      return reply.status(400).send({ error: err.message });
    }
  }

  // ==================== BUSINESS PLANS ====================

  static async listPlans(req: FastifyRequest, reply: FastifyReply) {
    try {
      const studioId = StudioPlanningController.extractStudioId(req);
      const { type, status } = req.query as { type?: BusinessPlanType; status?: BusinessPlanStatus };
      const plans = await StudioBusinessPlanService.listPlans(studioId, type, status);
      return reply.send(plans);
    } catch (err: any) {
      return reply.status(400).send({ error: err.message });
    }
  }

  static async getPlanById(req: FastifyRequest, reply: FastifyReply) {
    try {
      const studioId = StudioPlanningController.extractStudioId(req);
      const { planId } = req.params as { planId: string };
      const plan = await StudioBusinessPlanService.getPlanById(studioId, planId);
      return reply.send(plan);
    } catch (err: any) {
      return reply.status(404).send({ error: err.message });
    }
  }

  static async getActivePlan(req: FastifyRequest, reply: FastifyReply) {
    try {
      const studioId = StudioPlanningController.extractStudioId(req);
      const { fiscalYear } = req.query as { fiscalYear?: string };
      const plan = await StudioBusinessPlanService.getActivePlan(
        studioId,
        fiscalYear ? parseInt(fiscalYear, 10) : undefined
      );
      return reply.send(plan);
    } catch (err: any) {
      return reply.status(400).send({ error: err.message });
    }
  }

  static async createPlan(req: FastifyRequest, reply: FastifyReply) {
    try {
      const studioId = StudioPlanningController.extractStudioId(req);
      const userId = StudioPlanningController.extractUserId(req);
      const plan = await StudioBusinessPlanService.createPlan(studioId, userId, req.body as any);
      return reply.status(201).send(plan);
    } catch (err: any) {
      return reply.status(400).send({ error: err.message });
    }
  }

  static async updatePlan(req: FastifyRequest, reply: FastifyReply) {
    try {
      const studioId = StudioPlanningController.extractStudioId(req);
      const userId = StudioPlanningController.extractUserId(req);
      const { planId } = req.params as { planId: string };
      const plan = await StudioBusinessPlanService.updatePlan(studioId, planId, userId, req.body as any);
      return reply.send(plan);
    } catch (err: any) {
      return reply.status(400).send({ error: err.message });
    }
  }

  static async transitionStatus(req: FastifyRequest, reply: FastifyReply) {
    try {
      const studioId = StudioPlanningController.extractStudioId(req);
      const userId = StudioPlanningController.extractUserId(req);
      const { planId } = req.params as { planId: string };
      const { status, reason } = req.body as { status: BusinessPlanStatus; reason?: string };

      const plan = await StudioBusinessPlanService.transitionStatus(studioId, planId, userId, status, reason);
      return reply.send(plan);
    } catch (err: any) {
      return reply.status(400).send({ error: err.message });
    }
  }

  static async rebaselinePlan(req: FastifyRequest, reply: FastifyReply) {
    try {
      const studioId = StudioPlanningController.extractStudioId(req);
      const userId = StudioPlanningController.extractUserId(req);
      const { planId } = req.params as { planId: string };
      const { name, reason } = (req.body as any) || {};

      const newPlan = await StudioBusinessPlanService.rebaselinePlan(studioId, planId, userId, name, reason);
      return reply.status(201).send(newPlan);
    } catch (err: any) {
      return reply.status(400).send({ error: err.message });
    }
  }

  // ==================== TARGETS & VARIANCE ====================

  static async getPlanTargets(req: FastifyRequest, reply: FastifyReply) {
    try {
      const studioId = StudioPlanningController.extractStudioId(req);
      const { planId } = req.params as { planId: string };
      const { targetType, periodQuarter, periodMonth } = req.query as any;

      const targets = await StudioPlanTargetService.getPlanTargets(
        studioId,
        planId,
        targetType,
        periodQuarter ? parseInt(periodQuarter, 10) : undefined,
        periodMonth ? parseInt(periodMonth, 10) : undefined
      );
      return reply.send(targets);
    } catch (err: any) {
      return reply.status(400).send({ error: err.message });
    }
  }

  static async upsertTarget(req: FastifyRequest, reply: FastifyReply) {
    try {
      const studioId = StudioPlanningController.extractStudioId(req);
      const { planId } = req.params as { planId: string };
      const target = await StudioPlanTargetService.upsertTarget(studioId, planId, req.body as any);
      return reply.send(target);
    } catch (err: any) {
      return reply.status(400).send({ error: err.message });
    }
  }

  static async refreshActuals(req: FastifyRequest, reply: FastifyReply) {
    try {
      const studioId = StudioPlanningController.extractStudioId(req);
      const { planId } = req.params as { planId: string };
      const targets = await StudioPlanTargetService.refreshActuals(studioId, planId);
      return reply.send(targets);
    } catch (err: any) {
      return reply.status(400).send({ error: err.message });
    }
  }

  static async getPlanVsActual(req: FastifyRequest, reply: FastifyReply) {
    try {
      const studioId = StudioPlanningController.extractStudioId(req);
      const { planId } = req.params as { planId: string };
      const { periodQuarter, periodMonth } = req.query as any;

      const variance = await StudioPlanningVarianceService.getPlanVsActual(
        studioId,
        planId,
        periodQuarter ? parseInt(periodQuarter, 10) : undefined,
        periodMonth ? parseInt(periodMonth, 10) : undefined
      );
      return reply.send(variance);
    } catch (err: any) {
      return reply.status(400).send({ error: err.message });
    }
  }

  // ==================== BUDGETS ====================

  static async getBudgetComparison(req: FastifyRequest, reply: FastifyReply) {
    try {
      const studioId = StudioPlanningController.extractStudioId(req);
      const { planId } = req.params as { planId: string };
      const { periodQuarter, periodMonth } = req.query as any;

      const comp = await StudioPlanningBudgetService.getPlanBudgetComparison(
        studioId,
        planId,
        periodQuarter ? parseInt(periodQuarter, 10) : undefined,
        periodMonth ? parseInt(periodMonth, 10) : undefined
      );
      return reply.send(comp);
    } catch (err: any) {
      return reply.status(400).send({ error: err.message });
    }
  }

  // ==================== STRATEGIC INITIATIVES ====================

  static async listObjectives(req: FastifyRequest, reply: FastifyReply) {
    try {
      const studioId = StudioPlanningController.extractStudioId(req);
      const { planId } = req.params as { planId: string };
      const objectives = await StudioStrategicInitiativeService.listPlanObjectives(studioId, planId);
      return reply.send(objectives);
    } catch (err: any) {
      return reply.status(400).send({ error: err.message });
    }
  }

  static async createObjective(req: FastifyRequest, reply: FastifyReply) {
    try {
      const studioId = StudioPlanningController.extractStudioId(req);
      const { planId } = req.params as { planId: string };
      const obj = await StudioStrategicInitiativeService.createObjective(studioId, planId, req.body as any);
      return reply.status(201).send(obj);
    } catch (err: any) {
      return reply.status(400).send({ error: err.message });
    }
  }

  static async updateObjective(req: FastifyRequest, reply: FastifyReply) {
    try {
      const studioId = StudioPlanningController.extractStudioId(req);
      const { objectiveId } = req.params as { objectiveId: string };
      const obj = await StudioStrategicInitiativeService.updateObjective(studioId, objectiveId, req.body as any);
      return reply.send(obj);
    } catch (err: any) {
      return reply.status(400).send({ error: err.message });
    }
  }

  static async deleteObjective(req: FastifyRequest, reply: FastifyReply) {
    try {
      const studioId = StudioPlanningController.extractStudioId(req);
      const { objectiveId } = req.params as { objectiveId: string };
      await StudioStrategicInitiativeService.deleteObjective(studioId, objectiveId);
      return reply.send({ success: true });
    } catch (err: any) {
      return reply.status(400).send({ error: err.message });
    }
  }

  static async createInitiative(req: FastifyRequest, reply: FastifyReply) {
    try {
      const studioId = StudioPlanningController.extractStudioId(req);
      const { objectiveId } = req.params as { objectiveId: string };
      const init = await StudioStrategicInitiativeService.createInitiative(studioId, objectiveId, req.body as any);
      return reply.status(201).send(init);
    } catch (err: any) {
      return reply.status(400).send({ error: err.message });
    }
  }

  static async updateInitiative(req: FastifyRequest, reply: FastifyReply) {
    try {
      const studioId = StudioPlanningController.extractStudioId(req);
      const { initiativeId } = req.params as { initiativeId: string };
      const init = await StudioStrategicInitiativeService.updateInitiative(studioId, initiativeId, req.body as any);
      return reply.send(init);
    } catch (err: any) {
      return reply.status(400).send({ error: err.message });
    }
  }

  static async createMilestone(req: FastifyRequest, reply: FastifyReply) {
    try {
      const studioId = StudioPlanningController.extractStudioId(req);
      const { initiativeId } = req.params as { initiativeId: string };
      const m = await StudioStrategicInitiativeService.createMilestone(studioId, initiativeId, req.body as any);
      return reply.status(201).send(m);
    } catch (err: any) {
      return reply.status(400).send({ error: err.message });
    }
  }

  static async updateMilestone(req: FastifyRequest, reply: FastifyReply) {
    try {
      const studioId = StudioPlanningController.extractStudioId(req);
      const { milestoneId } = req.params as { milestoneId: string };
      const m = await StudioStrategicInitiativeService.updateMilestone(studioId, milestoneId, req.body as any);
      return reply.send(m);
    } catch (err: any) {
      return reply.status(400).send({ error: err.message });
    }
  }

  // ==================== FORECASTS & SCENARIOS ====================

  static async getPlanVsForecast(req: FastifyRequest, reply: FastifyReply) {
    try {
      const studioId = StudioPlanningController.extractStudioId(req);
      const { planId } = req.params as { planId: string };
      const { targetType } = req.query as { targetType?: BusinessPlanTargetType };
      const alignment = await StudioPlanForecastScenarioService.getPlanVsForecastAlignment(studioId, planId, targetType);
      return reply.send(alignment);
    } catch (err: any) {
      return reply.status(400).send({ error: err.message });
    }
  }

  static async getPlanVsScenarios(req: FastifyRequest, reply: FastifyReply) {
    try {
      const studioId = StudioPlanningController.extractStudioId(req);
      const { planId } = req.params as { planId: string };
      const evaluations = await StudioPlanForecastScenarioService.getPlanVsScenarioEvaluations(studioId, planId);
      return reply.send(evaluations);
    } catch (err: any) {
      return reply.status(400).send({ error: err.message });
    }
  }

  // ==================== REVIEWS ====================

  static async listReviews(req: FastifyRequest, reply: FastifyReply) {
    try {
      const studioId = StudioPlanningController.extractStudioId(req);
      const { planId } = req.params as { planId: string };
      const reviews = await StudioPlanReviewService.listPlanReviews(studioId, planId);
      return reply.send(reviews);
    } catch (err: any) {
      return reply.status(400).send({ error: err.message });
    }
  }

  static async createReview(req: FastifyRequest, reply: FastifyReply) {
    try {
      const studioId = StudioPlanningController.extractStudioId(req);
      const userId = StudioPlanningController.extractUserId(req);
      const { planId } = req.params as { planId: string };
      const review = await StudioPlanReviewService.createReview(studioId, planId, {
        ...(req.body as any),
        reviewerId: userId,
      });
      return reply.status(201).send(review);
    } catch (err: any) {
      return reply.status(400).send({ error: err.message });
    }
  }

  static async updateReview(req: FastifyRequest, reply: FastifyReply) {
    try {
      const studioId = StudioPlanningController.extractStudioId(req);
      const { reviewId } = req.params as { reviewId: string };
      const review = await StudioPlanReviewService.updateReview(studioId, reviewId, req.body as any);
      return reply.send(review);
    } catch (err: any) {
      return reply.status(400).send({ error: err.message });
    }
  }

  // ==================== EXPORTS ====================

  static async exportVarianceCsv(req: FastifyRequest, reply: FastifyReply) {
    try {
      const studioId = StudioPlanningController.extractStudioId(req);
      const { planId } = req.params as { planId: string };
      const csv = await StudioPlanningExportService.exportPlanVarianceCsv(studioId, planId);

      reply.header('Content-Type', 'text/csv');
      reply.header('Content-Disposition', `attachment; filename="plan-variance-${planId}.csv"`);
      return reply.send(csv);
    } catch (err: any) {
      return reply.status(400).send({ error: err.message });
    }
  }

  static async exportPlanJson(req: FastifyRequest, reply: FastifyReply) {
    try {
      const studioId = StudioPlanningController.extractStudioId(req);
      const { planId } = req.params as { planId: string };
      const json = await StudioPlanningExportService.exportPlanJson(studioId, planId);
      return reply.send(json);
    } catch (err: any) {
      return reply.status(400).send({ error: err.message });
    }
  }
}
