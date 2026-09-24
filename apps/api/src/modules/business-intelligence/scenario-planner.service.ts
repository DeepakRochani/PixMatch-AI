/**
 * Business Scenario Planner & Sensitivity Analysis Service — PIXMatch AI Phase 38
 *
 * Isolated Simulation Engine:
 * - Deterministic what-if simulations for revenue, expenses, bookings, conversion, pricing, and capacity
 * - Multi-scenario Sensitivity Analysis (Base, Downside, Upside)
 * - Strict isolation: ZERO persistence to financial or operational source-of-truth records
 * - Output marked unambiguously: label: "SCENARIO_NOT_ACTUAL", is_simulation: true
 */

import {
  IBiScenarioParameters,
  IBiScenarioResults,
  IBiSensitivityAnalysisDTO,
} from '@pixmatch/types';

export interface IBaselineFinancialContext {
  currency?: string;
  baseline_revenue_minor: number;
  baseline_expenses_minor: number;
  baseline_cash_minor: number;
  baseline_utilization_bps: number;
}

export class ScenarioPlannerService {
  /**
   * Run a simulation based on hypothetical parameters.
   */
  public static runScenario(
    baseline: IBaselineFinancialContext,
    params: IBiScenarioParameters
  ): IBiScenarioResults {
    const currency = baseline.currency || 'INR';
    const baseRev = Math.max(0, Math.round(baseline.baseline_revenue_minor || 0));
    const baseExp = Math.max(0, Math.round(baseline.baseline_expenses_minor || 0));
    const baseCash = Math.round(baseline.baseline_cash_minor || 0);
    const baseUtil = Math.max(0, Math.round(baseline.baseline_utilization_bps || 0));

    // 1. Revenue Adjustments:
    // Direct revenue change % + impact of booking change % + conversion change % + avg project value change %
    let revMultiplier = 1.0 + (params.revenue_change_pct || 0) / 100;

    if (params.booking_change_pct) {
      revMultiplier *= 1.0 + params.booking_change_pct / 100;
    }
    if (params.conversion_change_pct) {
      revMultiplier *= 1.0 + params.conversion_change_pct / 100;
    }
    if (params.avg_project_value_change_pct) {
      revMultiplier *= 1.0 + params.avg_project_value_change_pct / 100;
    }

    const projected_revenue_minor = Math.max(0, Math.round(baseRev * revMultiplier));
    const revenue_delta_minor = projected_revenue_minor - baseRev;

    // 2. Expense Adjustments:
    // Direct expense change % + variable cost elasticity (assuming 30% variable costs linked to revenue delta) + new hire costs
    let expMultiplier = 1.0 + (params.expense_change_pct || 0) / 100;
    let newHireExpenseMinor = 0;
    if (params.new_hire_count && params.new_hire_count > 0) {
      // Estimate 50,000 INR (5000000 minor) per monthly hire benchmark if not specified
      newHireExpenseMinor = params.new_hire_count * 5000000;
    }

    const projected_expenses_minor = Math.max(
      0,
      Math.round(baseExp * expMultiplier + newHireExpenseMinor)
    );
    const expenses_delta_minor = projected_expenses_minor - baseExp;

    // 3. Profit & Margin:
    const baseline_profit_minor = baseRev - baseExp;
    const projected_profit_minor = projected_revenue_minor - projected_expenses_minor;
    const profit_delta_minor = projected_profit_minor - baseline_profit_minor;

    const baseline_margin_bps =
      baseRev > 0 ? Math.round((baseline_profit_minor / baseRev) * 10000) : 0;
    const projected_margin_bps =
      projected_revenue_minor > 0
        ? Math.round((projected_profit_minor / projected_revenue_minor) * 10000)
        : 0;

    // 4. Cash Impact:
    // Net cash impact equals revenue delta minus expense delta
    const projected_cash_minor = baseCash + revenue_delta_minor - expenses_delta_minor;

    // 5. Utilization Impact:
    let capacityMultiplier = 1.0 + (params.capacity_change_pct || 0) / 100;
    if (params.new_hire_count && params.new_hire_count > 0) {
      capacityMultiplier += params.new_hire_count * 0.2; // Each hire adds ~20% capacity
    }

    const projected_utilization_bps =
      capacityMultiplier > 0
        ? Math.round((baseUtil * revMultiplier) / capacityMultiplier)
        : baseUtil;

    return {
      is_simulation: true,
      label: 'SCENARIO_NOT_ACTUAL',
      currency,
      baseline_revenue_minor: baseRev,
      projected_revenue_minor,
      revenue_delta_minor,
      baseline_expenses_minor: baseExp,
      projected_expenses_minor,
      expenses_delta_minor,
      baseline_profit_minor,
      projected_profit_minor,
      profit_delta_minor,
      baseline_margin_bps,
      projected_margin_bps,
      baseline_cash_minor: baseCash,
      projected_cash_minor,
      baseline_utilization_bps: baseUtil,
      projected_utilization_bps,
    };
  }

  /**
   * Run structured sensitivity analysis across Base, Downside (-15%), and Upside (+15%) cases.
   */
  public static runSensitivityAnalysis(
    baseline: IBaselineFinancialContext,
    dimension: 'REVENUE' | 'EXPENSE' | 'BOOKINGS' | 'AVERAGE_PROJECT_VALUE' = 'REVENUE'
  ): IBiSensitivityAnalysisDTO {
    const currency = baseline.currency || 'INR';

    let downsideParams: IBiScenarioParameters = { revenue_change_pct: 0, expense_change_pct: 0 };
    let baseParams: IBiScenarioParameters = { revenue_change_pct: 0, expense_change_pct: 0 };
    let upsideParams: IBiScenarioParameters = { revenue_change_pct: 0, expense_change_pct: 0 };
    let assumptions: string[] = [];

    switch (dimension) {
      case 'REVENUE':
        downsideParams = { revenue_change_pct: -15, expense_change_pct: 0 };
        baseParams = { revenue_change_pct: 0, expense_change_pct: 0 };
        upsideParams = { revenue_change_pct: 15, expense_change_pct: 0 };
        assumptions = [
          'Downside case models a 15% drop in total contracted and recognized revenue.',
          'Base case reflects current operating baseline.',
          'Upside case models a 15% expansion in total revenue with fixed overheads.',
        ];
        break;

      case 'EXPENSE':
        downsideParams = { revenue_change_pct: 0, expense_change_pct: 15 }; // Expense increase is downside
        baseParams = { revenue_change_pct: 0, expense_change_pct: 0 };
        upsideParams = { revenue_change_pct: 0, expense_change_pct: -15 }; // Expense decrease is upside
        assumptions = [
          'Downside case models a 15% inflation in operating and production expenses.',
          'Base case reflects current operating baseline.',
          'Upside case models a 15% cost optimization across overheads.',
        ];
        break;

      case 'BOOKINGS':
        downsideParams = { revenue_change_pct: 0, expense_change_pct: 0, booking_change_pct: -20 };
        baseParams = { revenue_change_pct: 0, expense_change_pct: 0, booking_change_pct: 0 };
        upsideParams = { revenue_change_pct: 0, expense_change_pct: 0, booking_change_pct: 20 };
        assumptions = [
          'Downside case models a 20% contraction in confirmed booking intake.',
          'Base case reflects current scheduled booking velocity.',
          'Upside case models a 20% increase in bookings.',
        ];
        break;

      case 'AVERAGE_PROJECT_VALUE':
        downsideParams = { revenue_change_pct: 0, expense_change_pct: 0, avg_project_value_change_pct: -10 };
        baseParams = { revenue_change_pct: 0, expense_change_pct: 0, avg_project_value_change_pct: 0 };
        upsideParams = { revenue_change_pct: 0, expense_change_pct: 0, avg_project_value_change_pct: 15 };
        assumptions = [
          'Downside case models a 10% decline in average invoice/deal size.',
          'Base case reflects current average project realization.',
          'Upside case models a 15% pricing increase across packages.',
        ];
        break;
    }

    const base_case = ScenarioPlannerService.runScenario(baseline, baseParams);
    const downside_case = ScenarioPlannerService.runScenario(baseline, downsideParams);
    const upside_case = ScenarioPlannerService.runScenario(baseline, upsideParams);

    return {
      currency,
      dimension,
      base_case,
      downside_case,
      upside_case,
      assumptions,
    };
  }
}
