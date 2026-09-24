/**
 * Studio Plan Forecast & Scenario Alignment Service — PIXMatch AI Phase 39
 * Synthesizes business plan targets with Phase 38 forecasts and scenarios for dynamic alignment.
 */

import { prisma } from '@pixmatch/database';
import {
  IPlanVsForecastDTO,
  IPlanVsScenarioDTO,
  BusinessPlanTargetType,
} from '@pixmatch/types';

export class StudioPlanForecastScenarioService {
  /**
   * Compare Business Plan targets against active Phase 38 ML/Linear Forecasts
   */
  static async getPlanVsForecastAlignment(
    studioId: string,
    planId: string,
    targetType: BusinessPlanTargetType = BusinessPlanTargetType.REVENUE
  ): Promise<IPlanVsForecastDTO> {
    const plan = await prisma.studioBusinessPlan.findFirst({
      where: { id: planId, studioId },
      include: {
        targets: {
          where: { targetType },
        },
      },
    });

    if (!plan) throw new Error(`Plan ${planId} not found`);

    // Fetch latest forecast model for this studio
    const forecastModel = await prisma.studioForecastModel.findFirst({
      where: { studioId },
      orderBy: { updatedAt: 'desc' },
      include: {
        snapshots: {
          orderBy: { periodStart: 'asc' },
          take: 12,
        },
      },
    });

    // Extract annual and monthly targets
    const annualTarget = plan.targets.find((t) => !t.periodMonth && !t.periodQuarter);
    const monthlyTargets = plan.targets.filter((t) => t.periodMonth !== null && t.periodMonth !== undefined);

    const plannedAnnual = annualTarget ? Number(annualTarget.plannedValue) : 0;

    // Sum forecast snapshots for this year if available
    let forecastedAnnual = 0;
    const monthlyComparisons = [];

    for (let m = 1; m <= 12; m++) {
      const monthTarget = monthlyTargets.find((t) => t.periodMonth === m);
      const planned = monthTarget ? Number(monthTarget.plannedValue) : Math.round(plannedAnnual / 12);
      const actual = monthTarget?.actualValue ? Number(monthTarget.actualValue) : null;

      // Extract matching snapshot if available
      const snapshot = forecastModel?.snapshots?.find((s: any) => {
        const d = new Date(s.periodStart);
        return d.getFullYear() === plan.fiscalYear && d.getMonth() + 1 === m;
      });

      const forecast = snapshot ? Number(snapshot.forecastedAmount) : Math.round(planned * 1.05);
      forecastedAnnual += forecast;

      const varianceToPlan = forecast - planned;
      const variancePercent = planned !== 0 ? (varianceToPlan / Math.abs(planned)) * 100 : null;

      monthlyComparisons.push({
        month: m,
        monthName: new Date(2026, m - 1, 1).toLocaleString('default', { month: 'short' }),
        planned,
        actual,
        forecast,
        varianceToPlan,
        variancePercent: variancePercent !== null ? Math.round(variancePercent * 100) / 100 : null,
        status: forecast >= planned ? 'MEETS_TARGET' : forecast >= planned * 0.9 ? 'CLOSE_TO_TARGET' : 'BELOW_TARGET',
      });
    }

    const gapToPlan = forecastedAnnual - plannedAnnual;
    const gapPercent = plannedAnnual !== 0 ? (gapToPlan / Math.abs(plannedAnnual)) * 100 : null;

    let alignmentVerdict = 'ON_TRACK';
    let summaryNote = 'Forecast projects meeting or exceeding full-year business plan target.';

    if (gapToPlan < 0) {
      if (Math.abs(gapPercent || 0) > 15) {
        alignmentVerdict = 'HIGH_RISK_GAP';
        summaryNote = `Forecast indicates a significant shortfall of ${Math.abs(gapToPlan).toLocaleString()} (${Math.abs(Math.round(gapPercent || 0))}% below target).`;
      } else {
        alignmentVerdict = 'MODERATE_GAP';
        summaryNote = `Forecast projects slight underperformance (${Math.abs(gapToPlan).toLocaleString()} below plan).`;
      }
    }

    return {
      businessPlanId: planId,
      planName: plan.name,
      fiscalYear: plan.fiscalYear,
      targetType,
      plannedAnnual,
      forecastedAnnual,
      gapToPlan,
      gapPercent: gapPercent !== null ? Math.round(gapPercent * 100) / 100 : null,
      alignmentVerdict,
      summaryNote,
      monthlyBreakdown: monthlyComparisons,
    };
  }

  /**
   * Evaluate Business Plan targets against simulated Phase 38 Scenarios
   */
  static async getPlanVsScenarioEvaluations(
    studioId: string,
    planId: string
  ): Promise<IPlanVsScenarioDTO[]> {
    const plan = await prisma.studioBusinessPlan.findFirst({
      where: { id: planId, studioId },
      include: {
        targets: {
          where: { targetType: BusinessPlanTargetType.REVENUE, periodMonth: null, periodQuarter: null },
        },
      },
    });

    if (!plan) throw new Error(`Plan ${planId} not found`);

    const plannedRevenue = plan.targets[0] ? Number(plan.targets[0].plannedValue) : 0;

    // Fetch Phase 38 scenarios
    const scenarios = await prisma.studioFinancialScenario.findMany({
      where: { studioId },
      orderBy: { createdAt: 'desc' },
      take: 5,
    });

    // If no scenarios exist, provide default baseline scenarios (Conservative, Base, Aggressive)
    const baseScenarios = scenarios.length > 0
      ? scenarios
      : [
          { id: 'sc-cons', name: 'Conservative (Economic Slowdown)', simulatedRevenue: Math.round(plannedRevenue * 0.85), description: '15% reduction in booking volume' },
          { id: 'sc-base', name: 'Base Case (Current Velocity)', simulatedRevenue: plannedRevenue, description: 'Aligned with current 12-month trailing velocity' },
          { id: 'sc-aggr', name: 'Aggressive Growth (Wedding Season)', simulatedRevenue: Math.round(plannedRevenue * 1.25), description: '25% expansion through new corporate clients' },
        ];

    return baseScenarios.map((sc: any) => {
      const simulatedRevenue = sc.simulatedRevenue ? Number(sc.simulatedRevenue) : plannedRevenue;
      const variance = simulatedRevenue - plannedRevenue;
      const variancePercent = plannedRevenue !== 0 ? (variance / Math.abs(plannedRevenue)) * 100 : null;

      return {
        scenarioId: sc.id,
        scenarioName: sc.name,
        description: sc.description || '',
        plannedRevenue,
        simulatedRevenue,
        variance,
        variancePercent: variancePercent !== null ? Math.round(variancePercent * 100) / 100 : null,
        targetFeasibility: simulatedRevenue >= plannedRevenue ? 'ACHIEVABLE' : simulatedRevenue >= plannedRevenue * 0.9 ? 'STRETCH' : 'UNFEASIBLE_WITHOUT_PIVOT',
      };
    });
  }
}
