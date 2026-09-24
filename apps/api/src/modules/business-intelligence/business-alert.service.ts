/**
 * Business Alert Service — PIXMatch AI Phase 38
 *
 * Deterministic Business Health Alerts:
 * - 12 Trigger Types:
 *   REVENUE_DROP, PROFIT_DROP, CASH_RISK, AR_SPIKE, OVERDUE_SPIKE,
 *   PIPELINE_DROP, BOOKING_GAP, CAPACITY_OVERLOAD, PROJECT_MARGIN_RISK,
 *   EXPENSE_SPIKE, TAX_LIABILITY_CHANGE, RECONCILIATION_EXCEPTION
 * - Lifecycle: OPEN, ACKNOWLEDGED, RESOLVED, DISMISSED
 * - Severity: INFO, LOW, MEDIUM, HIGH, CRITICAL
 * - Integration with Phase 37 anomalies & audit trails
 */

import {
  BiAlertType,
  BiAlertSeverity,
  BiAlertStatus,
  IBiAlertDTO,
} from '@pixmatch/types';

export interface IAlertEvaluationMetrics {
  studio_id: string;
  currency?: string;
  current_revenue_minor: number;
  baseline_revenue_minor: number;
  current_net_profit_minor: number;
  baseline_net_profit_minor: number;
  current_cash_minor: number;
  projected_30d_cash_minor: number;
  min_cash_reserve_minor: number;
  current_ar_minor: number;
  baseline_ar_minor: number;
  overdue_ar_minor: number;
  current_pipeline_minor: number;
  baseline_pipeline_minor: number;
  upcoming_30d_booking_density_pct: number;
  team_utilization_bps: number;
  low_margin_projects_count: number;
  current_expenses_minor: number;
  baseline_expenses_minor: number;
  upcoming_tax_liability_minor: number;
  baseline_tax_liability_minor: number;
  unreconciled_transactions_count: number;
}

export class BusinessAlertService {
  /**
   * Deterministically evaluate metrics and generate business alerts.
   */
  public static evaluateAlerts(metrics: IAlertEvaluationMetrics): IBiAlertDTO[] {
    const alerts: IBiAlertDTO[] = [];
    const now = new Date();
    const studioId = metrics.studio_id;
    const currency = metrics.currency || 'INR';

    // 1. REVENUE_DROP (>20% decline vs baseline)
    if (metrics.baseline_revenue_minor > 0) {
      const revDropPct =
        ((metrics.baseline_revenue_minor - metrics.current_revenue_minor) / metrics.baseline_revenue_minor) * 100;
      if (revDropPct >= 20) {
        alerts.push({
          id: `alert-rev-${Date.now()}`,
          studio_id: studioId,
          alert_type: 'REVENUE_DROP',
          severity: revDropPct >= 40 ? 'CRITICAL' : 'HIGH',
          status: 'OPEN',
          title: 'Significant Revenue Decline Detected',
          description: `Current period revenue is down ${revDropPct.toFixed(1)}% compared to the historical baseline (${(metrics.current_revenue_minor / 100).toFixed(2)} vs ${(metrics.baseline_revenue_minor / 100).toFixed(2)} ${currency}).`,
          baseline_value: metrics.baseline_revenue_minor,
          current_value: metrics.current_revenue_minor,
          threshold_value: 20,
          created_at: now,
        });
      }
    }

    // 2. PROFIT_DROP (>25% decline or negative profit)
    if (metrics.current_net_profit_minor < 0) {
      alerts.push({
        id: `alert-profit-neg-${Date.now()}`,
        studio_id: studioId,
        alert_type: 'PROFIT_DROP',
        severity: 'CRITICAL',
        status: 'OPEN',
        title: 'Net Operating Loss Detected',
        description: `Studio recorded a net loss of ${(Math.abs(metrics.current_net_profit_minor) / 100).toFixed(2)} ${currency} for the active period.`,
        baseline_value: metrics.baseline_net_profit_minor,
        current_value: metrics.current_net_profit_minor,
        threshold_value: 0,
        created_at: now,
      });
    } else if (metrics.baseline_net_profit_minor > 0) {
      const profitDropPct =
        ((metrics.baseline_net_profit_minor - metrics.current_net_profit_minor) / metrics.baseline_net_profit_minor) *
        100;
      if (profitDropPct >= 25) {
        alerts.push({
          id: `alert-profit-drop-${Date.now()}`,
          studio_id: studioId,
          alert_type: 'PROFIT_DROP',
          severity: 'HIGH',
          status: 'OPEN',
          title: 'Net Profit Margin Contraction',
          description: `Net profit declined by ${profitDropPct.toFixed(1)}% compared to historical average.`,
          baseline_value: metrics.baseline_net_profit_minor,
          current_value: metrics.current_net_profit_minor,
          threshold_value: 25,
          created_at: now,
        });
      }
    }

    // 3. CASH_RISK (30-day cash projection < min reserve or deficit)
    if (metrics.projected_30d_cash_minor < metrics.min_cash_reserve_minor) {
      alerts.push({
        id: `alert-cash-${Date.now()}`,
        studio_id: studioId,
        alert_type: 'CASH_RISK',
        severity: metrics.projected_30d_cash_minor < 0 ? 'CRITICAL' : 'HIGH',
        status: 'OPEN',
        title: 'Projected 30-Day Liquidity Deficit',
        description: `Projected ending cash balance (${(metrics.projected_30d_cash_minor / 100).toFixed(2)} ${currency}) is below minimum reserve (${(metrics.min_cash_reserve_minor / 100).toFixed(2)} ${currency}).`,
        baseline_value: metrics.min_cash_reserve_minor,
        current_value: metrics.projected_30d_cash_minor,
        threshold_value: metrics.min_cash_reserve_minor,
        created_at: now,
      });
    }

    // 4. AR_SPIKE (>1.5x rolling average receivables)
    if (metrics.baseline_ar_minor > 0 && metrics.current_ar_minor > metrics.baseline_ar_minor * 1.5) {
      alerts.push({
        id: `alert-ar-${Date.now()}`,
        studio_id: studioId,
        alert_type: 'AR_SPIKE',
        severity: 'MEDIUM',
        status: 'OPEN',
        title: 'Accounts Receivable Spike',
        description: `Total outstanding receivables (${(metrics.current_ar_minor / 100).toFixed(2)} ${currency}) elevated 50%+ above baseline (${(metrics.baseline_ar_minor / 100).toFixed(2)} ${currency}).`,
        baseline_value: metrics.baseline_ar_minor,
        current_value: metrics.current_ar_minor,
        threshold_value: metrics.baseline_ar_minor * 1.5,
        created_at: now,
      });
    }

    // 5. OVERDUE_SPIKE (>30% of total receivables overdue)
    if (metrics.current_ar_minor > 0) {
      const overdueRatio = (metrics.overdue_ar_minor / metrics.current_ar_minor) * 100;
      if (overdueRatio >= 30) {
        alerts.push({
          id: `alert-overdue-${Date.now()}`,
          studio_id: studioId,
          alert_type: 'OVERDUE_SPIKE',
          severity: overdueRatio >= 50 ? 'HIGH' : 'MEDIUM',
          status: 'OPEN',
          title: 'High Ratio of Overdue Receivables',
          description: `${overdueRatio.toFixed(1)}% of all outstanding receivables are overdue (${(metrics.overdue_ar_minor / 100).toFixed(2)} ${currency}).`,
          baseline_value: 0,
          current_value: metrics.overdue_ar_minor,
          threshold_value: 30,
          created_at: now,
        });
      }
    }

    // 6. PIPELINE_DROP (>30% drop in unweighted pipeline)
    if (metrics.baseline_pipeline_minor > 0) {
      const pipelineDrop =
        ((metrics.baseline_pipeline_minor - metrics.current_pipeline_minor) / metrics.baseline_pipeline_minor) * 100;
      if (pipelineDrop >= 30) {
        alerts.push({
          id: `alert-pipeline-${Date.now()}`,
          studio_id: studioId,
          alert_type: 'PIPELINE_DROP',
          severity: 'MEDIUM',
          status: 'OPEN',
          title: 'Sales Pipeline Value Contraction',
          description: `Total open pipeline value dropped ${pipelineDrop.toFixed(1)}% below historical average.`,
          baseline_value: metrics.baseline_pipeline_minor,
          current_value: metrics.current_pipeline_minor,
          threshold_value: 30,
          created_at: now,
        });
      }
    }

    // 7. BOOKING_GAP (<25% booking density in upcoming 30 days)
    if (metrics.upcoming_30d_booking_density_pct < 25) {
      alerts.push({
        id: `alert-booking-gap-${Date.now()}`,
        studio_id: studioId,
        alert_type: 'BOOKING_GAP',
        severity: 'LOW',
        status: 'OPEN',
        title: 'Upcoming Calendar Booking Gap',
        description: `Upcoming 30-day calendar booking density is only ${metrics.upcoming_30d_booking_density_pct.toFixed(1)}% of available slots.`,
        baseline_value: 50,
        current_value: metrics.upcoming_30d_booking_density_pct,
        threshold_value: 25,
        created_at: now,
      });
    }

    // 8. CAPACITY_OVERLOAD (utilization > 95%)
    if (metrics.team_utilization_bps > 9500) {
      alerts.push({
        id: `alert-capacity-${Date.now()}`,
        studio_id: studioId,
        alert_type: 'CAPACITY_OVERLOAD',
        severity: 'HIGH',
        status: 'OPEN',
        title: 'Workforce Capacity Overload Risk',
        description: `Current team capacity utilization is at ${(metrics.team_utilization_bps / 100).toFixed(1)}%, exceeding sustainable operating limits.`,
        baseline_value: 8000,
        current_value: metrics.team_utilization_bps,
        threshold_value: 9500,
        created_at: now,
      });
    }

    // 9. PROJECT_MARGIN_RISK (multiple projects below margin threshold)
    if (metrics.low_margin_projects_count > 0) {
      alerts.push({
        id: `alert-margin-risk-${Date.now()}`,
        studio_id: studioId,
        alert_type: 'PROJECT_MARGIN_RISK',
        severity: metrics.low_margin_projects_count > 3 ? 'HIGH' : 'MEDIUM',
        status: 'OPEN',
        title: 'Project Profit Margin Warning',
        description: `${metrics.low_margin_projects_count} active projects are currently yielding profit margins below target threshold (<20%).`,
        baseline_value: 0,
        current_value: metrics.low_margin_projects_count,
        threshold_value: 1,
        created_at: now,
      });
    }

    // 10. EXPENSE_SPIKE (>1.3x rolling average expense)
    if (metrics.baseline_expenses_minor > 0 && metrics.current_expenses_minor > metrics.baseline_expenses_minor * 1.3) {
      const expSpikePct =
        ((metrics.current_expenses_minor - metrics.baseline_expenses_minor) / metrics.baseline_expenses_minor) * 100;
      alerts.push({
        id: `alert-exp-${Date.now()}`,
        studio_id: studioId,
        alert_type: 'EXPENSE_SPIKE',
        severity: 'MEDIUM',
        status: 'OPEN',
        title: 'Unusual Expense Spike Detected',
        description: `Operating expenses increased by ${expSpikePct.toFixed(1)}% above rolling average (${(metrics.current_expenses_minor / 100).toFixed(2)} vs ${(metrics.baseline_expenses_minor / 100).toFixed(2)} ${currency}).`,
        baseline_value: metrics.baseline_expenses_minor,
        current_value: metrics.current_expenses_minor,
        threshold_value: 30,
        created_at: now,
      });
    }

    // 11. TAX_LIABILITY_CHANGE (>1.5x previous period tax liability)
    if (
      metrics.baseline_tax_liability_minor > 0 &&
      metrics.upcoming_tax_liability_minor > metrics.baseline_tax_liability_minor * 1.5
    ) {
      alerts.push({
        id: `alert-tax-${Date.now()}`,
        studio_id: studioId,
        alert_type: 'TAX_LIABILITY_CHANGE',
        severity: 'INFO',
        status: 'OPEN',
        title: 'Elevated Tax Liability Approaching',
        description: `Upcoming GST/Tax liability (${(metrics.upcoming_tax_liability_minor / 100).toFixed(2)} ${currency}) is 50%+ higher than prior tax period.`,
        baseline_value: metrics.baseline_tax_liability_minor,
        current_value: metrics.upcoming_tax_liability_minor,
        threshold_value: metrics.baseline_tax_liability_minor * 1.5,
        created_at: now,
      });
    }

    // 12. RECONCILIATION_EXCEPTION (unreconciled bank/gateway transactions)
    if (metrics.unreconciled_transactions_count > 0) {
      alerts.push({
        id: `alert-reconcile-${Date.now()}`,
        studio_id: studioId,
        alert_type: 'RECONCILIATION_EXCEPTION',
        severity: metrics.unreconciled_transactions_count > 10 ? 'HIGH' : 'LOW',
        status: 'OPEN',
        title: 'Unreconciled Financial Transactions',
        description: `${metrics.unreconciled_transactions_count} bank or payment gateway transactions require reconciliation.`,
        baseline_value: 0,
        current_value: metrics.unreconciled_transactions_count,
        threshold_value: 1,
        created_at: now,
      });
    }

    return alerts;
  }
}
