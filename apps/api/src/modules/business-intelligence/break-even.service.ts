/**
 * Break-Even Intelligence Service — PIXMatch AI Phase 38
 *
 * Deterministic Break-Even Analysis:
 * - Fixed Costs / Contribution Margin %
 * - Break-even Projects = Break-even Revenue / Average Project Value
 * - Safe handling for zero or negative contribution margins (returns null, never NaN/Infinity)
 */

import { IBiBreakEvenDTO } from '@pixmatch/types';

export interface IBreakEvenRawInputs {
  currency?: string;
  fixed_costs_minor: number;
  variable_cost_ratio_bps: number; // e.g. 3500 bps (35%)
  average_project_value_minor: number;
}

export class BreakEvenService {
  /**
   * Calculate break-even revenue and project volume safely.
   */
  public static calculateBreakEven(inputs: IBreakEvenRawInputs): IBiBreakEvenDTO {
    const currency = inputs.currency || 'INR';
    const fixedCosts = Math.max(0, Math.round(inputs.fixed_costs_minor || 0));
    const variableRatioBps = Math.max(0, Math.round(inputs.variable_cost_ratio_bps || 0));
    const avgProjectValue = Math.max(0, Math.round(inputs.average_project_value_minor || 0));

    // Contribution Margin = 100% - Variable Cost Ratio %
    const contributionMarginBps = Math.max(-10000, 10000 - variableRatioBps);

    // If contribution margin is <= 0%, studio loses money on every unit and cannot cover fixed costs
    if (contributionMarginBps <= 0) {
      return {
        currency,
        fixed_costs_minor: fixedCosts,
        variable_cost_ratio_bps: variableRatioBps,
        contribution_margin_bps: contributionMarginBps,
        average_project_value_minor: avgProjectValue,
        break_even_revenue_minor: null,
        break_even_projects_count: null,
        is_achievable: false,
        warning_message:
          'Negative or zero contribution margin: variable costs meet or exceed 100% of revenue. Fixed costs cannot be covered.',
      };
    }

    const contributionMarginRate = contributionMarginBps / 10000;

    // Break-Even Revenue = Fixed Costs / Contribution Margin %
    const breakEvenRev = Math.round(fixedCosts / contributionMarginRate);

    // Break-Even Projects Count = Break-Even Revenue / Average Project Value
    let breakEvenProjects: number | null = null;
    if (avgProjectValue > 0) {
      breakEvenProjects = Math.ceil(breakEvenRev / avgProjectValue);
    }

    return {
      currency,
      fixed_costs_minor: fixedCosts,
      variable_cost_ratio_bps: variableRatioBps,
      contribution_margin_bps: contributionMarginBps,
      average_project_value_minor: avgProjectValue,
      break_even_revenue_minor: breakEvenRev,
      break_even_projects_count: breakEvenProjects,
      is_achievable: true,
      warning_message: null,
    };
  }
}
