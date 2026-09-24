/**
 * Decision Insight Service — PIXMatch AI Phase 38
 *
 * Deterministic Decision Support Engine:
 * - Generates actionable business insights from real analytics data
 * - Explains WHAT happened, WHY it matters, WHAT data supports it
 * - Provides non-prescriptive review suggestions ("Consider reviewing...", "Potential area for attention...")
 * - STRICT BOUNDARY: Never issues autonomous mandates or commands.
 */

import { IBiDecisionInsightDTO } from '@pixmatch/types';

export interface IDecisionInsightContext {
  studio_id: string;
  currency?: string;
  revenue_mom_change_pct: number | null;
  profit_margin_bps: number;
  overdue_receivables_ratio_pct: number;
  conversion_rate_bps: number;
  upcoming_booking_gap: boolean;
  team_utilization_bps: number;
  at_risk_projects_count: number;
  top_revenue_client_name?: string | null;
  top_client_revenue_share_pct?: number;
}

export class DecisionInsightService {
  /**
   * Synthesize decision insights from context without hallucination or autonomous execution.
   */
  public static generateInsights(ctx: IDecisionInsightContext): IBiDecisionInsightDTO[] {
    const insights: IBiDecisionInsightDTO[] = [];
    const now = new Date();
    const studioId = ctx.studio_id;
    const currency = ctx.currency || 'INR';

    // 1. Revenue Movement Insight
    if (ctx.revenue_mom_change_pct !== null) {
      if (ctx.revenue_mom_change_pct <= -15) {
        insights.push({
          id: `insight-rev-drop-${Date.now()}`,
          studio_id: studioId,
          category: 'REVENUE',
          impact: 'NEGATIVE',
          title: `Revenue Declined by ${Math.abs(ctx.revenue_mom_change_pct).toFixed(1)}% MoM`,
          explanation: `Monthly revenue contracted by ${Math.abs(ctx.revenue_mom_change_pct).toFixed(1)}% compared to the prior month.`,
          suggested_review: 'Consider reviewing proposal win rates and scheduled shoot fulfillment velocity.',
          supporting_data: { change_pct: ctx.revenue_mom_change_pct },
          status: 'ACTIVE',
          created_at: now,
        });
      } else if (ctx.revenue_mom_change_pct >= 20) {
        insights.push({
          id: `insight-rev-growth-${Date.now()}`,
          studio_id: studioId,
          category: 'REVENUE',
          impact: 'POSITIVE',
          title: `Strong Revenue Expansion of +${ctx.revenue_mom_change_pct.toFixed(1)}% MoM`,
          explanation: `Monthly revenue expanded by ${ctx.revenue_mom_change_pct.toFixed(1)}% driven by increased project deliveries and booking completions.`,
          suggested_review: 'Consider reviewing capacity allocations to ensure fulfillment standards are sustained during high demand.',
          supporting_data: { change_pct: ctx.revenue_mom_change_pct },
          status: 'ACTIVE',
          created_at: now,
        });
      }
    }

    // 2. Profit Margin Health
    if (ctx.profit_margin_bps < 2000) {
      insights.push({
        id: `insight-margin-low-${Date.now()}`,
        studio_id: studioId,
        category: 'PROFIT',
        impact: 'CRITICAL',
        title: `Operating Margin Contracted to ${(ctx.profit_margin_bps / 100).toFixed(1)}%`,
        explanation: 'Overall operating profit margin is below the recommended 20% studio benchmark.',
        suggested_review: 'Consider reviewing direct production expenses (COGS, equipment rentals, contractor rates) for active projects.',
        supporting_data: { margin_bps: ctx.profit_margin_bps, threshold_bps: 2000 },
        status: 'ACTIVE',
        created_at: now,
      });
    }

    // 3. Receivables & Cash Conversion
    if (ctx.overdue_receivables_ratio_pct > 25) {
      insights.push({
        id: `insight-ar-overdue-${Date.now()}`,
        studio_id: studioId,
        category: 'CASH',
        impact: 'NEGATIVE',
        title: `${ctx.overdue_receivables_ratio_pct.toFixed(1)}% of Receivables Are Past Due`,
        explanation: 'A significant portion of outstanding client invoices has passed payment due dates, impacting operating cash flow.',
        suggested_review: 'Consider reviewing the collections queue and automated payment reminder settings.',
        supporting_data: { overdue_ratio_pct: ctx.overdue_receivables_ratio_pct },
        status: 'ACTIVE',
        created_at: now,
      });
    }

    // 4. Team Capacity & Utilization
    if (ctx.team_utilization_bps > 9200) {
      insights.push({
        id: `insight-capacity-high-${Date.now()}`,
        studio_id: studioId,
        category: 'CAPACITY',
        impact: 'CRITICAL',
        title: `Workforce Utilization at ${(ctx.team_utilization_bps / 100).toFixed(1)}% Capacity`,
        explanation: 'Team workload is nearing peak capacity across editing tasks and scheduled photo shoots.',
        suggested_review: 'Consider reviewing upcoming shoot distribution, project milestone dates, or contractor availability.',
        supporting_data: { utilization_bps: ctx.team_utilization_bps },
        status: 'ACTIVE',
        created_at: now,
      });
    } else if (ctx.team_utilization_bps < 4000 && ctx.team_utilization_bps > 0) {
      insights.push({
        id: `insight-capacity-low-${Date.now()}`,
        studio_id: studioId,
        category: 'CAPACITY',
        impact: 'NEUTRAL',
        title: `Excess Capacity Available (${(ctx.team_utilization_bps / 100).toFixed(1)}% Utilization)`,
        explanation: 'The team currently has substantial available bandwidth for new project bookings.',
        suggested_review: 'Consider reviewing marketing outreach and open proposals to accelerate booking intake.',
        supporting_data: { utilization_bps: ctx.team_utilization_bps },
        status: 'ACTIVE',
        created_at: now,
      });
    }

    // 5. Client Revenue Concentration Risk
    if ((ctx.top_client_revenue_share_pct || 0) > 40 && ctx.top_revenue_client_name) {
      insights.push({
        id: `insight-client-conc-${Date.now()}`,
        studio_id: studioId,
        category: 'CLIENT',
        impact: 'NEGATIVE',
        title: `Client Concentration Risk: ${ctx.top_revenue_client_name} Represents ${ctx.top_client_revenue_share_pct?.toFixed(1)}% of Revenue`,
        explanation: 'A large percentage of studio income is tied to a single client account.',
        suggested_review: 'Consider reviewing pipeline diversification across other customer segments.',
        supporting_data: { client_name: ctx.top_revenue_client_name, share_pct: ctx.top_client_revenue_share_pct },
        status: 'ACTIVE',
        created_at: now,
      });
    }

    // 6. Project Risk Concentration
    if (ctx.at_risk_projects_count > 0) {
      insights.push({
        id: `insight-proj-risk-${Date.now()}`,
        studio_id: studioId,
        category: 'PROJECT',
        impact: 'NEGATIVE',
        title: `${ctx.at_risk_projects_count} Project${ctx.at_risk_projects_count > 1 ? 's' : ''} Flagged with Financial or Delivery Risk`,
        explanation: 'Active projects have triggered risk conditions regarding budget limits, overdue deadlines, or compressed margins.',
        suggested_review: 'Consider reviewing project task blockers and cost breakdown reports.',
        supporting_data: { at_risk_count: ctx.at_risk_projects_count },
        status: 'ACTIVE',
        created_at: now,
      });
    }

    return insights;
  }
}
