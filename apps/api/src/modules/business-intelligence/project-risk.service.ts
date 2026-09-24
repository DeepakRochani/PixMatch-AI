/**
 * Project Performance & Risk Intelligence Service — PIXMatch AI Phase 38
 *
 * Deterministic Project Health & Financial Risk Classifier:
 * - Statuses: ON_TRACK, FINANCIAL_RISK, DELIVERY_RISK, PAYMENT_RISK, COMPLETED
 * - Risk types: MARGIN_BELOW_THRESHOLD, BUDGET_EXCEEDED, RECEIVABLE_OVERDUE, COST_SPIKE, REVENUE_BELOW_EXPECTED, DEADLINE_TASK_INCOMPLETE
 * - Strictly operational project classification — NO individual employee rankings.
 */

import {
  BiProjectOperationalStatus,
  IBiProjectPerformanceDTO,
  IBiProjectRiskDTO,
} from '@pixmatch/types';

export interface IProjectRawFinancialInput {
  id: string;
  project_id: string;
  title: string;
  client_name?: string | null;
  status: string; // 'DRAFT', 'IN_PROGRESS', 'REVIEW', 'COMPLETED', 'ARCHIVED'
  currency?: string;
  budget_minor?: number;
  revenue_minor: number;
  cogs_minor: number;
  expenses_minor: number;
  collected_minor: number;
  outstanding_minor: number;
  deadline?: Date | string | null;
  total_tasks_count?: number;
  completed_tasks_count?: number;
  overdue_tasks_count?: number;
  overdue_receivable_minor?: number;
  min_target_margin_bps?: number; // default 3000 bps (30%)
}

export class ProjectRiskService {
  /**
   * Evaluate a single project's financial and operational performance.
   */
  public static evaluateProject(input: IProjectRawFinancialInput): IBiProjectPerformanceDTO {
    const currency = input.currency || 'INR';
    const revenue_minor = Math.max(0, Math.round(input.revenue_minor || 0));
    const cogs_minor = Math.max(0, Math.round(input.cogs_minor || 0));
    const expenses_minor = Math.max(0, Math.round(input.expenses_minor || 0));
    const total_cost_minor = cogs_minor + expenses_minor;
    const profit_minor = revenue_minor - total_cost_minor;

    const margin_bps =
      revenue_minor > 0 ? Math.round((profit_minor / revenue_minor) * 10000) : 0;

    const collected_minor = Math.max(0, Math.round(input.collected_minor || 0));
    const outstanding_minor = Math.max(0, Math.round(input.outstanding_minor || 0));
    const budget_minor = Math.max(0, Math.round(input.budget_minor || 0));
    const targetMarginBps = input.min_target_margin_bps ?? 3000;

    const totalTasks = input.total_tasks_count || 0;
    const completedTasks = input.completed_tasks_count || 0;
    const completion_pct = totalTasks > 0 ? Math.min(100, Math.round((completedTasks / totalTasks) * 100)) : 0;

    const risks: IBiProjectRiskDTO[] = [];
    const now = new Date();

    // 1. Deadline & Schedule checks
    let deadline_status: 'ON_TIME' | 'APPROACHING' | 'OVERDUE' = 'ON_TIME';
    if (input.deadline) {
      const deadlineDate = new Date(input.deadline);
      const diffDays = (deadlineDate.getTime() - now.getTime()) / (1000 * 3600 * 24);

      if (diffDays < 0 && input.status !== 'COMPLETED' && input.status !== 'ARCHIVED') {
        deadline_status = 'OVERDUE';
        risks.push({
          risk_type: 'DEADLINE_TASK_INCOMPLETE',
          severity: 'HIGH',
          source: 'PROJECT_SCHEDULE',
          reason: `Project deadline passed on ${deadlineDate.toISOString().slice(0, 10)} with ${totalTasks - completedTasks} incomplete tasks.`,
          detected_at: now.toISOString(),
        });
      } else if (diffDays <= 7 && input.status !== 'COMPLETED') {
        deadline_status = 'APPROACHING';
        if (completion_pct < 60) {
          risks.push({
            risk_type: 'DEADLINE_TASK_INCOMPLETE',
            severity: 'MEDIUM',
            source: 'PROJECT_SCHEDULE',
            reason: `Deadline in ${Math.ceil(diffDays)} days but project is only ${completion_pct}% complete.`,
            detected_at: now.toISOString(),
          });
        }
      }
    }

    // 2. Financial Margin Risk
    if (revenue_minor > 0 && margin_bps < targetMarginBps) {
      const severity = margin_bps < 1000 ? 'HIGH' : 'MEDIUM';
      risks.push({
        risk_type: 'MARGIN_BELOW_THRESHOLD',
        severity,
        source: 'FINANCIAL_MARGIN',
        reason: `Profit margin (${(margin_bps / 100).toFixed(1)}%) is below target threshold (${(targetMarginBps / 100).toFixed(1)}%).`,
        amount_minor: Math.abs(profit_minor),
        detected_at: now.toISOString(),
      });
    }

    // 3. Budget Overrun Risk
    if (budget_minor > 0 && total_cost_minor > budget_minor) {
      const overrunMinor = total_cost_minor - budget_minor;
      risks.push({
        risk_type: 'BUDGET_EXCEEDED',
        severity: 'HIGH',
        source: 'FINANCIAL_BUDGET',
        reason: `Total costs exceed budget by ${(overrunMinor / 100).toFixed(2)} ${currency}.`,
        amount_minor: overrunMinor,
        detected_at: now.toISOString(),
      });
    }

    // 4. Overdue Receivables / Payment Risk
    const overdueReceivable = Math.max(0, Math.round(input.overdue_receivable_minor || 0));
    if (overdueReceivable > 0) {
      risks.push({
        risk_type: 'RECEIVABLE_OVERDUE',
        severity: overdueReceivable > 5000000 ? 'HIGH' : 'MEDIUM',
        source: 'INVOICING_AR',
        reason: `Overdue receivable of ${(overdueReceivable / 100).toFixed(2)} ${currency} pending client payment.`,
        amount_minor: overdueReceivable,
        detected_at: now.toISOString(),
      });
    }

    // 5. Determine Operational Classification
    let operational_status: BiProjectOperationalStatus = 'ON_TRACK';

    if (input.status === 'COMPLETED' || input.status === 'ARCHIVED') {
      operational_status = 'COMPLETED';
    } else if (risks.some((r) => r.risk_type === 'MARGIN_BELOW_THRESHOLD' || r.risk_type === 'BUDGET_EXCEEDED')) {
      operational_status = 'FINANCIAL_RISK';
    } else if (risks.some((r) => r.risk_type === 'RECEIVABLE_OVERDUE')) {
      operational_status = 'PAYMENT_RISK';
    } else if (risks.some((r) => r.risk_type === 'DEADLINE_TASK_INCOMPLETE') || (input.overdue_tasks_count || 0) > 0) {
      operational_status = 'DELIVERY_RISK';
    }

    return {
      id: input.id,
      project_id: input.project_id,
      title: input.title,
      client_name: input.client_name,
      currency,
      operational_status,
      revenue_minor,
      cogs_minor,
      expenses_minor,
      profit_minor,
      margin_bps,
      payment_collected_minor: collected_minor,
      payment_outstanding_minor: outstanding_minor,
      completion_pct,
      deadline_status,
      risks,
    };
  }

  /**
   * Evaluate a collection of projects.
   */
  public static evaluateProjects(projects: IProjectRawFinancialInput[]): IBiProjectPerformanceDTO[] {
    return projects.map((p) => ProjectRiskService.evaluateProject(p));
  }
}
