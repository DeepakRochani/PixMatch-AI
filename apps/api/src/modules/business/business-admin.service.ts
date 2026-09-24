/**
 * Business Admin Service — PIXMatch AI Phase 18
 * Platform-wide studio business intelligence aggregate telemetry for Super Admins.
 */

import { prisma } from '@pixmatch/database';
import {
  AdminStudioBusinessTelemetryDTO,
  BusinessTransactionType,
  BusinessTransactionStatus,
} from '@pixmatch/types';

export class BusinessAdminService {
  private db: any;

  constructor(dbClient?: any) {
    this.db = dbClient || prisma;
  }

  private static defaultInstance = new BusinessAdminService();

  static async getAdminTelemetry(): Promise<AdminStudioBusinessTelemetryDTO | any> {
    return this.defaultInstance.getAdminTelemetry();
  }

  static async getAdminBusinessOverview(): Promise<AdminStudioBusinessTelemetryDTO | any> {
    return this.defaultInstance.getAdminTelemetry();
  }

  /**
   * Aggregate platform-wide studio business telemetry.
   */
  async getAdminTelemetry(): Promise<AdminStudioBusinessTelemetryDTO | any> {
    const totalStudios = await this.db.studio.count();
    const transactions = await this.db.studioBusinessTransaction.findMany({
      where: { is_void: false },
    });

    const activeStudioIds = new Set(transactions.map((t: any) => t.studio_id));
    const studiosWithDataCount = activeStudioIds.size;

    let aggregateIncome = 0;
    let aggregateExpense = 0;
    let aggregateRefund = 0;

    const studioTotals = new Map<
      string,
      { studio_id: string; studio_name: string; revenue: number; count: number; currency: string }
    >();

    for (const t of transactions) {
      const amt = Number(t.amount);
      const cur = t.currency || 'USD';
      const sId = t.studio_id;
      const sName = t.studio?.name || `Studio ${sId}`;

      if (!studioTotals.has(sId)) {
        studioTotals.set(sId, {
          studio_id: sId,
          studio_name: sName,
          revenue: 0,
          count: 0,
          currency: cur,
        });
      }
      const st = studioTotals.get(sId)!;
      st.count++;

      const tType = t.type || t.transaction_type;
      if (tType === BusinessTransactionType.INCOME) {
        aggregateIncome += amt;
        st.revenue += amt;
      } else if (tType === BusinessTransactionType.EXPENSE) {
        aggregateExpense += amt;
      } else if (tType === BusinessTransactionType.REFUND) {
        aggregateRefund += amt;
        st.revenue -= amt;
      }
    }

    const netRevenue = Math.max(0, aggregateIncome - aggregateRefund);
    const netProfit = netRevenue - aggregateExpense;
    const avgMargin = netRevenue > 0 ? Number(((netProfit / netRevenue) * 100).toFixed(2)) : 0;

    const topStudios = Array.from(studioTotals.values())
      .map((st) => ({
        studio_id: st.studio_id,
        studio_name: st.studio_name,
        total_revenue: Number(st.revenue.toFixed(2)),
        transaction_count: st.count,
        currency: st.currency,
      }))
      .sort((a, b) => b.total_revenue - a.total_revenue)
      .slice(0, 10);

    return {
      total_studios: totalStudios,
      total_studios_count: totalStudios,
      studios_with_data_count: studiosWithDataCount,
      studios_with_business_data: studiosWithDataCount,
      aggregate_gross_revenue: Number(aggregateIncome.toFixed(2)),
      platform_gross_studio_revenue: Number(aggregateIncome.toFixed(2)),
      aggregate_net_revenue: Number(netRevenue.toFixed(2)),
      aggregate_total_expenses: Number(aggregateExpense.toFixed(2)),
      aggregate_net_profit: Number(netProfit.toFixed(2)),
      platform_net_studio_profit: Number(netProfit.toFixed(2)),
      platform_average_margin_pct: avgMargin,
      platform_average_margin: avgMargin,
      top_earning_studios: topStudios,
      active_goals_count: 0,
      total_insights_count: 0,
      acknowledged_insights_count: 0,
      volume_by_currency: [],
      timeseries_30d: [],

      // CamelCase UI aliases
      totalStudios,
      studiosWithDataCount,
      aggregateGrossRevenue: Number(aggregateIncome.toFixed(2)),
      aggregateNetRevenue: Number(netRevenue.toFixed(2)),
      aggregateTotalExpenses: Number(aggregateExpense.toFixed(2)),
      aggregateNetProfit: Number(netProfit.toFixed(2)),
      platformAverageMarginPct: avgMargin,
      topEarningStudios: topStudios,
    };
  }

  async getAdminBusinessOverview(): Promise<AdminStudioBusinessTelemetryDTO | any> {
    return this.getAdminTelemetry();
  }
}
