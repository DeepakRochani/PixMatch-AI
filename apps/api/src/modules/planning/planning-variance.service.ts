/**
 * Studio Planning Variance Service — PIXMatch AI Phase 39
 * Analyzes plan vs actual variances with contextual favorable/unfavorable tagging and severity thresholds.
 */

import { prisma } from '@pixmatch/database';
import {
  BusinessPlanTargetType,
  VarianceSeverity,
  IPlanningVarianceItemDTO,
  IPlanVsActualDTO,
} from '@pixmatch/types';
import { StudioPlanTargetService } from './plan-target.service';

export class StudioPlanningVarianceService {
  /**
   * Get comprehensive Plan vs Actual matrix for a business plan
   */
  static async getPlanVsActual(
    studioId: string,
    planId: string,
    periodQuarter?: number,
    periodMonth?: number
  ): Promise<IPlanVsActualDTO> {
    const plan = await prisma.studioBusinessPlan.findFirst({
      where: { id: planId, studioId },
      include: {
        targets: true,
      },
    });

    if (!plan) throw new Error(`Plan ${planId} not found`);

    // Filter targets by requested period
    const targets = plan.targets.filter((t) => {
      if (periodMonth !== undefined) return t.periodMonth === periodMonth;
      if (periodQuarter !== undefined) return t.periodQuarter === periodQuarter;
      return t.periodMonth === null && t.periodQuarter === null;
    });

    const varianceItems: IPlanningVarianceItemDTO[] = [];
    let favorableCount = 0;
    let unfavorableCount = 0;
    let criticalCount = 0;

    for (const target of targets) {
      const planned = Number(target.plannedValue);
      const actual = target.actualValue !== null && target.actualValue !== undefined ? Number(target.actualValue) : null;

      const item = this.computeVarianceItem(
        target.targetType as BusinessPlanTargetType,
        target.unit,
        planned,
        actual,
        target.periodQuarter,
        target.periodMonth,
        target.notes
      );

      varianceItems.push(item);

      if (item.isFavorable === true) favorableCount++;
      if (item.isFavorable === false) unfavorableCount++;
      if (item.severity === VarianceSeverity.CRITICAL) criticalCount++;
    }

    return {
      businessPlanId: planId,
      planName: plan.name,
      fiscalYear: plan.fiscalYear,
      periodQuarter: periodQuarter || null,
      periodMonth: periodMonth || null,
      summary: {
        totalTargets: targets.length,
        favorableCount,
        unfavorableCount,
        criticalCount,
        hasCriticalVariance: criticalCount > 0,
      },
      items: varianceItems,
    };
  }

  /**
   * Compute variance details for a single target
   */
  static computeVarianceItem(
    targetType: BusinessPlanTargetType,
    unit: string,
    planned: number,
    actual: number | null,
    periodQuarter?: number | null,
    periodMonth?: number | null,
    notes?: string | null
  ): IPlanningVarianceItemDTO {
    if (actual === null) {
      return {
        targetType,
        unit,
        plannedValue: planned,
        actualValue: null,
        variance: null,
        variancePercent: null,
        isFavorable: null,
        severity: VarianceSeverity.NEGLIGIBLE,
        periodQuarter: periodQuarter || null,
        periodMonth: periodMonth || null,
        analysis: 'Actual data not yet available for this period.',
        notes: notes || null,
      };
    }

    const variance = actual - planned;
    const variancePercent = planned !== 0 ? (variance / Math.abs(planned)) * 100 : null;
    const absVariancePct = variancePercent !== null ? Math.abs(variancePercent) : 0;

    // Contextual favorable determination
    const isFavorable = this.isVarianceFavorable(targetType, variance);

    // Severity calculation
    let severity = VarianceSeverity.NEGLIGIBLE;
    if (absVariancePct >= 30) {
      severity = VarianceSeverity.CRITICAL;
    } else if (absVariancePct >= 15) {
      severity = VarianceSeverity.SIGNIFICANT;
    } else if (absVariancePct >= 5) {
      severity = VarianceSeverity.MODERATE;
    }

    // Generate diagnostic insight
    const analysis = this.generateVarianceAnalysis(targetType, variancePercent, isFavorable, severity);

    return {
      targetType,
      unit,
      plannedValue: planned,
      actualValue: actual,
      variance,
      variancePercent: variancePercent !== null ? Math.round(variancePercent * 100) / 100 : null,
      isFavorable,
      severity,
      periodQuarter: periodQuarter || null,
      periodMonth: periodMonth || null,
      analysis,
      notes: notes || null,
    };
  }

  /**
   * Determine whether a positive variance is favorable or unfavorable based on target type
   */
  static isVarianceFavorable(targetType: BusinessPlanTargetType, variance: number): boolean {
    if (variance === 0) return true;

    // For these metric types, higher actual is favorable:
    const higherIsBetter = [
      BusinessPlanTargetType.REVENUE,
      BusinessPlanTargetType.COLLECTION,
      BusinessPlanTargetType.COLLECTION_RATE_BPS,
      BusinessPlanTargetType.PROFIT,
      BusinessPlanTargetType.MARGIN,
      BusinessPlanTargetType.GROSS_PROFIT,
      BusinessPlanTargetType.GROSS_MARGIN_BPS,
      BusinessPlanTargetType.NET_PROFIT,
      BusinessPlanTargetType.NET_MARGIN_PERCENT,
      BusinessPlanTargetType.CASH_RESERVE_MINIMUM,
      BusinessPlanTargetType.CASH,
      BusinessPlanTargetType.BOOKINGS_COUNT,
      BusinessPlanTargetType.BOOKINGS,
      BusinessPlanTargetType.PROJECTS,
      BusinessPlanTargetType.ORDERS,
      BusinessPlanTargetType.PIPELINE_VALUE,
      BusinessPlanTargetType.PIPELINE,
      BusinessPlanTargetType.NEW_CLIENTS,
      BusinessPlanTargetType.REPEAT_CLIENTS,
      BusinessPlanTargetType.CLIENT_ACQUISITIONS,
      BusinessPlanTargetType.CLIENT_ACQUISITION_COUNT,
      BusinessPlanTargetType.ACTIVE_CLIENTS_COUNT,
      BusinessPlanTargetType.CLIENT_RETENTION_RATE_BPS,
      BusinessPlanTargetType.LEAD_CONVERSION_RATE_BPS,
      BusinessPlanTargetType.AVERAGE_ORDER_VALUE,
      BusinessPlanTargetType.CLIENT_SATISFACTION_NPS,
      BusinessPlanTargetType.REVENUE_PER_PROJECT,
      BusinessPlanTargetType.TEAM_UTILIZATION_PERCENT,
      BusinessPlanTargetType.UTILIZATION,
      BusinessPlanTargetType.CAPACITY,
    ];

    // For these metric types, lower actual is favorable:
    const lowerIsBetter = [
      BusinessPlanTargetType.EXPENSES,
      BusinessPlanTargetType.EXPENSE_BUDGET_CAP,
      BusinessPlanTargetType.PROJECT_DELIVERY_TIME_DAYS,
    ];

    if (higherIsBetter.includes(targetType)) {
      return variance > 0;
    }

    if (lowerIsBetter.includes(targetType)) {
      return variance < 0;
    }

    // For neutral/utilization targets:
    return Math.abs(variance) <= 5;
  }

  /**
   * Generate human-readable diagnostic insight
   */
  private static generateVarianceAnalysis(
    targetType: BusinessPlanTargetType,
    variancePercent: number | null,
    isFavorable: boolean,
    severity: VarianceSeverity
  ): string {
    if (variancePercent === null) return 'No baseline plan value for percentage calculation.';

    const pctStr = `${Math.abs(Math.round(variancePercent * 10) / 10)}%`;
    const direction = variancePercent > 0 ? 'above' : 'below';

    if (isFavorable) {
      if (severity === VarianceSeverity.NEGLIGIBLE) return `On track. Tracking within standard operating tolerances.`;
      return `Favorable outperformance: ${pctStr} ${direction} plan target.`;
    } else {
      if (severity === VarianceSeverity.CRITICAL) {
        return `CRITICAL UNFAVORABLE VARIANCE: ${pctStr} ${direction} planned target. Immediate management intervention required.`;
      }
      if (severity === VarianceSeverity.SIGNIFICANT) {
        return `Significant unfavorable deviation: ${pctStr} ${direction} target. Review drivers and adjust execution.`;
      }
      if (severity === VarianceSeverity.MODERATE) {
        return `Moderate deviation (${pctStr} ${direction} target). Monitor next cycle for trend reversal.`;
      }
      return `Minor unfavorable variation (${pctStr} ${direction} target).`;
    }
  }
}
