/**
 * Studio Planning Budget Service — PIXMatch AI Phase 39
 * Integrates business planning with Phase 33 StudioBudget & Expense Categories.
 */

import { prisma } from '@pixmatch/database';
import {
  IBudgetPlanLineDTO,
  IBudgetPlanComparisonDTO,
} from '@pixmatch/types';

export class StudioPlanningBudgetService {
  /**
   * Get budget allocation lines for a business plan
   */
  static async getPlanBudgetComparison(
    studioId: string,
    planId: string,
    periodQuarter?: number,
    periodMonth?: number
  ): Promise<IBudgetPlanComparisonDTO> {
    const plan = await prisma.studioBusinessPlan.findFirst({
      where: { id: planId, studioId },
      include: {
        targets: {
          where: {
            targetType: { in: ['EXPENSES', 'EXPENSE_BUDGET_CAP', 'REVENUE', 'NET_PROFIT'] },
          },
        },
      },
    });

    if (!plan) throw new Error(`Plan ${planId} not found`);

    // Fetch Phase 33 expense categories
    const categories = await prisma.studioExpenseCategory.findMany({
      where: { studioId },
    });

    // Fetch Phase 33 active budgets for this year
    const budgets = await prisma.studioBudget.findMany({
      where: {
        studioId,
        year: plan.fiscalYear,
        ...(periodQuarter ? { quarter: periodQuarter } : {}),
        ...(periodMonth ? { month: periodMonth } : {}),
      },
    });

    // Fetch actual expenses for this year / period
    const { startDate, endDate } = this.getPeriodRange(plan.fiscalYear, periodQuarter, periodMonth);
    const expenses = await prisma.studioExpense.findMany({
      where: {
        studioId,
        expenseDate: { gte: startDate, lte: endDate },
      },
    });

    // Aggregate expenses by category
    const actualByCategory = new Map<string, number>();
    for (const exp of expenses) {
      const catId = exp.categoryId || 'uncategorized';
      actualByCategory.set(catId, (actualByCategory.get(catId) || 0) + exp.amount);
    }

    // Planned expense target for the period
    const expenseTarget = plan.targets.find(
      (t) =>
        (t.targetType === 'EXPENSES' || t.targetType === 'EXPENSE_BUDGET_CAP') &&
        (periodMonth ? t.periodMonth === periodMonth : periodQuarter ? t.periodQuarter === periodQuarter : !t.periodMonth && !t.periodQuarter)
    );
    const totalPlannedExpense = expenseTarget ? Number(expenseTarget.plannedValue) : 0;

    // Build line items per category
    const lines: IBudgetPlanLineDTO[] = [];
    let totalBudgetedAmount = 0;
    let totalActualSpent = 0;

    for (const cat of categories) {
      const matchingBudget = budgets.find((b) => b.categoryId === cat.id);
      const budgeted = matchingBudget ? matchingBudget.budgetAmount : 0;
      const actual = actualByCategory.get(cat.id) || 0;

      // Estimate category plan allocation proportion or from budget
      const planned = budgeted > 0 ? budgeted : Math.round(totalPlannedExpense / Math.max(1, categories.length));

      totalBudgetedAmount += budgeted;
      totalActualSpent += actual;

      const variance = actual - planned;
      const variancePercent = planned !== 0 ? (variance / Math.abs(planned)) * 100 : null;
      const utilizationPercent = planned !== 0 ? (actual / planned) * 100 : null;

      lines.push({
        categoryId: cat.id,
        categoryName: cat.name,
        plannedAmount: planned,
        budgetedAmount: budgeted,
        actualSpent: actual,
        variance,
        variancePercent: variancePercent !== null ? Math.round(variancePercent * 100) / 100 : null,
        utilizationPercent: utilizationPercent !== null ? Math.round(utilizationPercent * 100) / 100 : null,
        status: actual > planned ? 'OVER_BUDGET' : actual >= planned * 0.9 ? 'NEAR_CAP' : 'ON_TRACK',
      });
    }

    const totalVariance = totalActualSpent - totalPlannedExpense;
    const totalVariancePercent = totalPlannedExpense !== 0 ? (totalVariance / Math.abs(totalPlannedExpense)) * 100 : null;

    return {
      businessPlanId: planId,
      planName: plan.name,
      fiscalYear: plan.fiscalYear,
      periodQuarter: periodQuarter || null,
      periodMonth: periodMonth || null,
      totalPlannedExpense,
      totalBudgetedAmount,
      totalActualSpent,
      totalVariance,
      totalVariancePercent: totalVariancePercent !== null ? Math.round(totalVariancePercent * 100) / 100 : null,
      lines,
    };
  }

  private static getPeriodRange(year: number, quarter?: number | null, month?: number | null) {
    if (month) {
      return {
        startDate: new Date(year, month - 1, 1, 0, 0, 0),
        endDate: new Date(year, month, 0, 23, 59, 59, 999),
      };
    }
    if (quarter) {
      const startMonth = (quarter - 1) * 3;
      return {
        startDate: new Date(year, startMonth, 1, 0, 0, 0),
        endDate: new Date(year, startMonth + 3, 0, 23, 59, 59, 999),
      };
    }
    return {
      startDate: new Date(year, 0, 1, 0, 0, 0),
      endDate: new Date(year, 11, 31, 23, 59, 59, 999),
    };
  }
}
