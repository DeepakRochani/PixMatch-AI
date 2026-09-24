/**
 * Business Aggregation Service — PIXMatch AI Phase 18
 * Deterministic aggregation for Overview, Revenue/Expense/Profit trends, Service Performance,
 * Gallery-to-Business Funnels, and Client Lifetime Value.
 * 
 * STRICT PRINCIPLE: Zero fake financial data. If transactions are absent, returns 0 and has_financial_data = false.
 */

import { prisma } from '@pixmatch/database';
import {
  BusinessTransactionType,
  BusinessTransactionStatus,
  BusinessOverviewDTO,
  BusinessTrendPointDTO,
  BusinessRevenueBreakdownDTO,
  StudioPerformanceMetricsDTO,
  ServicePerformanceDTO,
  GalleryToBusinessFunnelDTO,
  ClientBusinessSummaryDTO,
} from '@pixmatch/types';

export class BusinessAggregationService {
  private db: any;

  constructor(dbClient?: any) {
    this.db = dbClient || prisma;
  }

  private static defaultInstance = new BusinessAggregationService();

  static async getOverview(studioId: string, options: any = {}): Promise<BusinessOverviewDTO> {
    return this.defaultInstance.getOverview(studioId, options);
  }

  static async getBusinessOverview(studioId: string, options: any = {}): Promise<BusinessOverviewDTO> {
    return this.defaultInstance.getOverview(studioId, options);
  }

  static async getRevenueTrend(studioId: string, options: any = {}): Promise<BusinessTrendPointDTO[]> {
    return this.defaultInstance.getRevenueTrend(studioId, options);
  }

  static async getRevenueTrends(studioId: string, options: any = {}): Promise<BusinessTrendPointDTO[]> {
    return this.defaultInstance.getRevenueTrend(studioId, options);
  }

  static async getRevenueExpenseTrends(studioId: string, options: any = {}): Promise<BusinessTrendPointDTO[]> {
    return this.defaultInstance.getRevenueTrend(studioId, options);
  }

  static async getRevenueBreakdown(studioId: string, options: any = {}): Promise<BusinessRevenueBreakdownDTO[]> {
    return this.defaultInstance.getRevenueBreakdown(studioId, options);
  }

  static async getExpenseBreakdown(studioId: string, options: any = {}): Promise<BusinessRevenueBreakdownDTO[]> {
    return this.defaultInstance.getExpenseBreakdown(studioId, options);
  }

  static async getProfitabilityAnalysis(studioId: string, options: any = {}): Promise<any> {
    return this.defaultInstance.getProfitabilityAnalysis(studioId, options);
  }

  static async getStudioPerformanceMetrics(studioId: string, options: any = {}): Promise<StudioPerformanceMetricsDTO> {
    return this.defaultInstance.getStudioPerformanceMetrics(studioId, options);
  }

  static async getStudioPerformance(studioId: string, options: any = {}): Promise<StudioPerformanceMetricsDTO> {
    return this.defaultInstance.getStudioPerformanceMetrics(studioId, options);
  }

  static async getServicePerformance(studioId: string, options: any = {}): Promise<ServicePerformanceDTO> {
    return this.defaultInstance.getServicePerformance(studioId, options);
  }

  static async getGalleryCommercialFunnel(studioId: string, options: any = {}): Promise<any> {
    return this.defaultInstance.getGalleryCommercialFunnel(studioId, options);
  }

  static async getGalleryToBusinessFunnel(studioId: string, options: any = {}): Promise<any> {
    return this.defaultInstance.getGalleryCommercialFunnel(studioId, options);
  }

  static async getClientRevenueSummaries(studioId: string, options: any = {}): Promise<ClientBusinessSummaryDTO[]> {
    return this.defaultInstance.getClientRevenueSummaries(studioId, options);
  }

  static async getClientBusinessSummary(studioId: string, clientIdOrOptions?: any): Promise<any> {
    if (typeof clientIdOrOptions === 'string') {
      return this.defaultInstance.getClientRevenueSummary(studioId, clientIdOrOptions);
    }
    return this.defaultInstance.getClientRevenueSummaries(studioId, clientIdOrOptions || {});
  }

  static async getClientRevenueSummary(studioId: string, clientId: string): Promise<ClientBusinessSummaryDTO | null> {
    return this.defaultInstance.getClientRevenueSummary(studioId, clientId);
  }

  /**
   * Get Studio Business Overview KPIs with MoM growth comparison.
   */
  async getOverview(
    studioId: string,
    options: {
      start_date?: string;
      end_date?: string;
      currency?: string;
    } = {}
  ): Promise<BusinessOverviewDTO> {
    const studio = await this.db.studio.findUnique({
      where: { id: studioId },
      select: { currency: true },
    });
    const currency = options.currency || studio?.currency || 'USD';

    // 1. Fetch non-void transactions for this studio
    const where: any = {
      studio_id: studioId,
      is_void: false,
    };

    if (options.start_date || options.end_date) {
      where.date = {};
      if (options.start_date) where.date.gte = new Date(options.start_date);
      if (options.end_date) where.date.lte = new Date(options.end_date);
    }

    const allTransactions = await this.db.studioBusinessTransaction.findMany({
      where,
      orderBy: { transaction_date: 'asc' },
    });

    const hasFinancialData = allTransactions.length > 0;

    let totalIncome = 0;
    let totalExpenses = 0;
    let totalRefunds = 0;
    let pendingPayments = 0;
    let completedBookingsCount = 0;

    // Monthly bucketing for trends
    const monthBuckets = new Map<string, { revenue: number; expenses: number; count: number }>();

    for (const t of allTransactions) {
      const amt = Number(t.amount);
      const isPaid = (t.status as any) === 'PAID' || t.status === BusinessTransactionStatus.COMPLETED;
      const tType = t.type || t.transaction_type;

      if (isPaid) {
        if (tType === BusinessTransactionType.INCOME) {
          totalIncome += amt;
          completedBookingsCount++;
        } else if (tType === BusinessTransactionType.EXPENSE) {
          totalExpenses += amt;
        } else if (tType === BusinessTransactionType.REFUND) {
          totalRefunds += amt;
        }

        const d = new Date(t.transaction_date || t.date || t.created_at);
        const mKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        if (!monthBuckets.has(mKey)) {
          monthBuckets.set(mKey, { revenue: 0, expenses: 0, count: 0 });
        }
        const mb = monthBuckets.get(mKey)!;
        if (tType === BusinessTransactionType.INCOME) mb.revenue += amt;
        else if (tType === BusinessTransactionType.EXPENSE) mb.expenses += amt;
        mb.count++;
      } else if (t.status === BusinessTransactionStatus.PENDING) {
        if (tType === BusinessTransactionType.INCOME) {
          pendingPayments += amt;
        }
      }
    }

    const netRevenue = Math.max(0, totalIncome - totalRefunds);
    const netProfit = netRevenue - totalExpenses;
    const profitMarginPct = netRevenue > 0 ? Number(((netProfit / netRevenue) * 100).toFixed(2)) : 0;
    const averageOrderValue =
      completedBookingsCount > 0 ? Number((netRevenue / completedBookingsCount).toFixed(2)) : 0;

    // Build monthly trends
    const monthlyTrends: any[] = [];
    for (const [key, mb] of monthBuckets.entries()) {
      const p = mb.revenue - mb.expenses;
      monthlyTrends.push({
        month: key,
        date: `${key}-01`,
        period_label: key,
        revenue: Number(mb.revenue.toFixed(2)),
        expenses: Number(mb.expenses.toFixed(2)),
        net_profit: Number(p.toFixed(2)),
        profit: Number(p.toFixed(2)),
        margin_pct: mb.revenue > 0 ? Number(((p / mb.revenue) * 100).toFixed(2)) : 0,
        transaction_count: mb.count,
      });
    }
    monthlyTrends.sort((a, b) => a.month.localeCompare(b.month));

    // Calculate MoM growth from last 2 months if available
    let revGrowthMoM = 0;
    let profitGrowthMoM = 0;
    if (monthlyTrends.length >= 2) {
      const curr = monthlyTrends[monthlyTrends.length - 1];
      const prev = monthlyTrends[monthlyTrends.length - 2];
      revGrowthMoM = prev.revenue > 0 ? Number((((curr.revenue - prev.revenue) / prev.revenue) * 100).toFixed(2)) : curr.revenue > 0 ? 100 : 0;
      profitGrowthMoM = prev.net_profit !== 0 ? Number((((curr.net_profit - prev.net_profit) / Math.abs(prev.net_profit)) * 100).toFixed(2)) : curr.net_profit > 0 ? 100 : 0;
    }

    // Active goals and insights
    const [activeGoals, activeInsights] = await Promise.all([
      this.db.studioBusinessGoal ? this.db.studioBusinessGoal.findMany({
        where: { studio_id: studioId, status: 'IN_PROGRESS' },
        take: 5,
      }) : [],
      this.db.studioBusinessInsight ? this.db.studioBusinessInsight.findMany({
        where: { studio_id: studioId, status: 'ACTIVE' },
        take: 5,
      }) : [],
    ]);

    const recentTx = allTransactions.slice(-10).reverse().map((t: any) => ({
      id: t.id,
      studio_id: t.studio_id,
      gallery_id: t.gallery_id,
      gallery_title: t.gallery?.title || null,
      client_id: t.client_id,
      client_name: t.client?.name || null,
      client_email: t.client?.email || null,
      type: t.type || t.transaction_type,
      category: t.category,
      amount: Number(t.amount),
      currency: t.currency || currency,
      status: t.status,
      payment_method: t.payment_method,
      reference_number: t.reference_number || t.reference,
      transaction_date: t.transaction_date || t.date,
      date: t.transaction_date || t.date,
      description: t.description,
      notes: t.notes,
      tags: Array.isArray(t.tags) ? t.tags : [],
      is_void: Boolean(t.is_void),
      created_at: t.created_at,
      updated_at: t.updated_at,
    }));

    return {
      studio_id: studioId,
      currency,
      has_financial_data: hasFinancialData,
      total_revenue: Number(netRevenue.toFixed(2)),
      total_expenses: Number(totalExpenses.toFixed(2)),
      net_profit: Number(netProfit.toFixed(2)),
      profit_margin_pct: profitMarginPct,
      profit_margin: profitMarginPct,
      total_transactions_count: allTransactions.length,
      average_order_value: averageOrderValue,
      total_completed_bookings: completedBookingsCount,
      pending_payments_amount: Number(pendingPayments.toFixed(2)),
      refunds_amount: Number(totalRefunds.toFixed(2)),
      revenue_growth_mom: revGrowthMoM,
      profit_growth_mom: profitGrowthMoM,
      monthly_trends: monthlyTrends,
      period: {
        start_date: options.start_date || (monthlyTrends[0]?.date || new Date().toISOString()),
        end_date: options.end_date || new Date().toISOString(),
        label: `${options.start_date || 'All Time'} to ${options.end_date || 'Present'}`,
      },
      mom_growth: {
        revenue_growth_pct: revGrowthMoM,
        expense_growth_pct: 0,
        profit_growth_pct: profitGrowthMoM,
      },
      recent_transactions: recentTx as any,
      active_insights: activeInsights as any,
      active_goals: activeGoals as any,

      // UI CamelCase aliases
      studioId,
      hasFinancialData,
      totalRevenue: Number(netRevenue.toFixed(2)),
      totalExpenses: Number(totalExpenses.toFixed(2)),
      netProfit: Number(netProfit.toFixed(2)),
      profitMarginPct,
      profitMargin: profitMarginPct,
      averageOrderValue,
      totalCompletedBookings: completedBookingsCount,
      pendingPaymentsAmount: Number(pendingPayments.toFixed(2)),
      refundsAmount: Number(totalRefunds.toFixed(2)),
      momGrowth: {
        revenueGrowthPct: revGrowthMoM,
        expenseGrowthPct: 0,
        profitGrowthPct: profitGrowthMoM,
      },
      recentTransactions: recentTx as any,
      activeInsights: activeInsights as any,
      activeGoals: activeGoals as any,
    } as any;
  }

  async getBusinessOverview(studioId: string, options: any = {}): Promise<BusinessOverviewDTO> {
    return this.getOverview(studioId, options);
  }

  /**
   * Get Time Series Trend Points.
   */
  async getRevenueTrend(
    studioId: string,
    options: {
      interval?: 'day' | 'week' | 'month';
      start_date?: string;
      end_date?: string;
    } = {}
  ): Promise<BusinessTrendPointDTO[]> {
    const transactions = await this.db.studioBusinessTransaction.findMany({
      where: {
        studio_id: studioId,
        is_void: false,
      },
      orderBy: { transaction_date: 'asc' },
    });

    const buckets = new Map<string, { revenue: number; expenses: number; refunds: number; count: number }>();

    for (const t of transactions) {
      const d = new Date(t.transaction_date || t.date);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      if (!buckets.has(key)) {
        buckets.set(key, { revenue: 0, expenses: 0, refunds: 0, count: 0 });
      }
      const b = buckets.get(key)!;
      const amt = Number(t.amount);
      const tType = t.type || t.transaction_type;
      b.count++;
      if (tType === BusinessTransactionType.INCOME) b.revenue += amt;
      else if (tType === BusinessTransactionType.EXPENSE) b.expenses += amt;
      else if (tType === BusinessTransactionType.REFUND) b.refunds += amt;
    }

    const result: BusinessTrendPointDTO[] = [];
    for (const [key, b] of buckets.entries()) {
      const netRev = Math.max(0, b.revenue - b.refunds);
      const profit = netRev - b.expenses;
      const marginPct = netRev > 0 ? Number(((profit / netRev) * 100).toFixed(2)) : 0;

      result.push({
        date: `${key}-01`,
        period_label: key,
        revenue: Number(netRev.toFixed(2)),
        expenses: Number(b.expenses.toFixed(2)),
        profit: Number(profit.toFixed(2)),
        margin_pct: marginPct,
        transaction_count: b.count,
        periodLabel: key,
        marginPct,
        transactionCount: b.count,
      });
    }

    result.sort((a, b) => a.date.localeCompare(b.date));
    return result;
  }

  async getRevenueTrends(studioId: string, options: any = {}): Promise<BusinessTrendPointDTO[]> {
    return this.getRevenueTrend(studioId, options);
  }

  async getRevenueExpenseTrends(studioId: string, options: any = {}): Promise<BusinessTrendPointDTO[]> {
    return this.getRevenueTrend(studioId, options);
  }

  /**
   * Get Revenue Breakdown by Category.
   */
  async getRevenueBreakdown(
    studioId: string,
    options: { start_date?: string; end_date?: string } = {}
  ): Promise<BusinessRevenueBreakdownDTO[]> {
    const transactions = await this.db.studioBusinessTransaction.findMany({
      where: {
        studio_id: studioId,
        is_void: false,
        type: BusinessTransactionType.INCOME,
      },
    });

    let grandTotal = 0;
    const catMap = new Map<string, { total: number; count: number }>();

    for (const t of transactions) {
      const cat = t.category || 'General';
      const amt = Number(t.amount);
      grandTotal += amt;

      if (!catMap.has(cat)) catMap.set(cat, { total: 0, count: 0 });
      const c = catMap.get(cat)!;
      c.total += amt;
      c.count++;
    }

    const breakdown: BusinessRevenueBreakdownDTO[] = [];
    for (const [cat, c] of catMap.entries()) {
      const percentage = grandTotal > 0 ? Number(((c.total / grandTotal) * 100).toFixed(2)) : 0;
      const averageAmount = c.count > 0 ? Number((c.total / c.count).toFixed(2)) : 0;

      breakdown.push({
        category: cat,
        amount: Number(c.total.toFixed(2)),
        percentage,
        transaction_count: c.count,
        average_amount: averageAmount,
        transactionCount: c.count,
        averageAmount,
      });
    }

    breakdown.sort((a, b) => b.amount - a.amount);
    return breakdown;
  }

  /**
   * Get Expense Breakdown by Category.
   */
  async getExpenseBreakdown(
    studioId: string,
    options: { start_date?: string; end_date?: string } = {}
  ): Promise<BusinessRevenueBreakdownDTO[]> {
    const transactions = await this.db.studioBusinessTransaction.findMany({
      where: {
        studio_id: studioId,
        is_void: false,
        type: BusinessTransactionType.EXPENSE,
      },
    });

    let grandTotal = 0;
    const catMap = new Map<string, { total: number; count: number }>();

    for (const t of transactions) {
      const cat = t.category || 'General';
      const amt = Number(t.amount);
      grandTotal += amt;

      if (!catMap.has(cat)) catMap.set(cat, { total: 0, count: 0 });
      const c = catMap.get(cat)!;
      c.total += amt;
      c.count++;
    }

    const breakdown: BusinessRevenueBreakdownDTO[] = [];
    for (const [cat, c] of catMap.entries()) {
      const percentage = grandTotal > 0 ? Number(((c.total / grandTotal) * 100).toFixed(2)) : 0;
      const averageAmount = c.count > 0 ? Number((c.total / c.count).toFixed(2)) : 0;

      breakdown.push({
        category: cat,
        amount: Number(c.total.toFixed(2)),
        percentage,
        transaction_count: c.count,
        average_amount: averageAmount,
        transactionCount: c.count,
        averageAmount,
      });
    }

    breakdown.sort((a, b) => b.amount - a.amount);
    return breakdown;
  }

  /**
   * Get Profitability Analysis.
   */
  async getProfitabilityAnalysis(
    studioId: string,
    options: { start_date?: string; end_date?: string } = {}
  ): Promise<any> {
    const overview = await this.getOverview(studioId, options);
    const revenueBreakdown = await this.getRevenueBreakdown(studioId, options);
    const expenseBreakdown = await this.getExpenseBreakdown(studioId, options);

    return {
      studio_id: studioId,
      currency: overview.currency,
      has_financial_data: overview.has_financial_data,
      total_revenue: overview.total_revenue,
      total_expenses: overview.total_expenses,
      net_profit: overview.net_profit,
      profit_margin_pct: overview.profit_margin_pct,
      revenue_breakdown: revenueBreakdown,
      expense_breakdown: expenseBreakdown,
      period: overview.period,
    };
  }

  /**
   * Get Studio Operational Performance Metrics.
   */
  async getStudioPerformanceMetrics(
    studioId: string,
    options: { start_date?: string; end_date?: string } = {}
  ): Promise<StudioPerformanceMetricsDTO> {
    const [galleries, clients, transactions] = await Promise.all([
      this.db.gallery.findMany({ where: { studio_id: studioId } }),
      this.db.client.findMany({ where: { studio_id: studioId } }),
      this.db.studioBusinessTransaction.findMany({
        where: {
          studio_id: studioId,
          is_void: false,
        },
      }),
    ]);

    const totalGalleries = galleries.length;
    let deliveredGalleries = 0;
    const turnaroundDaysList: number[] = [];

    for (const g of galleries) {
      if (g.is_published || g.status === 'PUBLISHED' || g.status === 'READY') {
        deliveredGalleries++;
        const cDate = new Date(g.created_at).getTime();
        const pDate = new Date(g.published_at || g.updated_at || g.created_at).getTime();
        const days = Math.max(0, Math.round((pDate - cDate) / (1000 * 60 * 60 * 24)));
        turnaroundDaysList.push(days);
      }
    }

    const avgTurnaround =
      turnaroundDaysList.length > 0
        ? Number(
            (turnaroundDaysList.reduce((s, d) => s + d, 0) / turnaroundDaysList.length).toFixed(1)
          )
        : 0;

    let totalIncome = 0;
    for (const t of transactions) {
      if (t.type === BusinessTransactionType.INCOME) totalIncome += Number(t.amount);
    }

    const repeatClients = clients.filter((c: any) => {
      const clientTx = transactions.filter((t: any) => t.client_id === c.id && t.type === 'INCOME');
      return clientTx.length > 1;
    });

    const repeatClientRate =
      clients.length > 0 ? Number(((repeatClients.length / clients.length) * 100).toFixed(2)) : 0;

    return {
      studio_id: studioId,
      period_label: options.start_date ? `${options.start_date} to ${options.end_date || 'now'}` : 'All Time',
      delivery_rate_pct: totalGalleries > 0 ? Number(((deliveredGalleries / totalGalleries) * 100).toFixed(2)) : 0,
      average_turnaround_days: avgTurnaround,
      median_turnaround_days: avgTurnaround,
      repeat_client_rate_pct: repeatClientRate,
      total_galleries_created: totalGalleries,
      total_galleries_delivered: deliveredGalleries,
      total_photos_processed: 0,
      total_client_favorites: 0,
      total_client_downloads: 0,
      total_client_selections: 0,
      client_engagement_index: 0,
      average_revenue_per_gallery: totalGalleries > 0 ? Number((totalIncome / totalGalleries).toFixed(2)) : 0,
      average_revenue_per_client: clients.length > 0 ? Number((totalIncome / clients.length).toFixed(2)) : 0,
    };
  }

  async getStudioPerformance(studioId: string, options: any = {}): Promise<StudioPerformanceMetricsDTO> {
    return this.getStudioPerformanceMetrics(studioId, options);
  }

  /**
   * Get Service Category Performance comparison.
   */
  async getServicePerformance(
    studioId: string,
    options: { start_date?: string; end_date?: string } = {}
  ): Promise<any> {
    const transactions = await this.db.studioBusinessTransaction.findMany({
      where: {
        studio_id: studioId,
        is_void: false,
      },
    });

    const serviceMap = new Map<
      string,
      { revenue: number; expenses: number; jobs: number }
    >();

    for (const t of transactions) {
      const service = t.service_type || t.category || 'General';
      if (!serviceMap.has(service)) {
        serviceMap.set(service, { revenue: 0, expenses: 0, jobs: 0 });
      }
      const s = serviceMap.get(service)!;
      const amt = Number(t.amount);
      const tType = t.type || t.transaction_type;

      if (tType === BusinessTransactionType.INCOME) {
        s.revenue += amt;
        s.jobs++;
      } else if (tType === BusinessTransactionType.EXPENSE) {
        s.expenses += amt;
      }
    }

    const servicesList: any[] = [];
    for (const [name, s] of serviceMap.entries()) {
      const profit = s.revenue - s.expenses;
      const margin = s.revenue > 0 ? Number(((profit / s.revenue) * 100).toFixed(2)) : 0;
      const arpj = s.jobs > 0 ? Number((s.revenue / s.jobs).toFixed(2)) : 0;

      servicesList.push({
        service_type: name,
        service_name: name,
        revenue: Number(s.revenue.toFixed(2)),
        expenses: Number(s.expenses.toFixed(2)),
        net_profit: Number(profit.toFixed(2)),
        profit_margin: margin,
        job_count: s.jobs,
        average_revenue_per_job: arpj,
      });
    }

    servicesList.sort((a, b) => b.revenue - a.revenue);

    return {
      studio_id: studioId,
      services: servicesList,
    };
  }

  /**
   * Get Gallery Commercial Funnel linking galleries to revenue and turnaround.
   */
  async getGalleryCommercialFunnel(
    studioId: string,
    options: { start_date?: string; end_date?: string } = {}
  ): Promise<any> {
    const [galleries, transactions] = await Promise.all([
      this.db.gallery.findMany({ where: { studio_id: studioId } }),
      this.db.studioBusinessTransaction.findMany({
        where: {
          studio_id: studioId,
          is_void: false,
        },
      }),
    ]);

    let totalRev = 0;
    let totalExp = 0;
    let monetizedCount = 0;
    const turnaroundList: number[] = [];

    const galleryBreakdown = galleries.map((g: any) => {
      const gTx = transactions.filter((t: any) => t.gallery_id === g.id);
      let gRev = 0;
      let gExp = 0;

      for (const t of gTx) {
        const amt = Number(t.amount);
        const tType = t.type || t.transaction_type;
        if (tType === BusinessTransactionType.INCOME) gRev += amt;
        else if (tType === BusinessTransactionType.EXPENSE) gExp += amt;
      }

      if (gRev > 0) monetizedCount++;
      totalRev += gRev;
      totalExp += gExp;

      const cDate = new Date(g.created_at).getTime();
      const pDate = new Date(g.published_at || g.created_at).getTime();
      const tDays = Math.max(0, Math.round((pDate - cDate) / (1000 * 60 * 60 * 24)));
      turnaroundList.push(tDays);

      return {
        gallery_id: g.id,
        title: g.title,
        revenue: Number(gRev.toFixed(2)),
        expenses: Number(gExp.toFixed(2)),
        net_profit: Number((gRev - gExp).toFixed(2)),
        turnaround_days: tDays,
        is_monetized: gRev > 0,
      };
    });

    const netProfit = totalRev - totalExp;
    const monRate = galleries.length > 0 ? Number(((monetizedCount / galleries.length) * 100).toFixed(2)) : 0;
    const avgRevPerGallery = galleries.length > 0 ? Number((totalRev / galleries.length).toFixed(2)) : 0;
    const avgTurnaround =
      turnaroundList.length > 0
        ? Number((turnaroundList.reduce((s, d) => s + d, 0) / turnaroundList.length).toFixed(1))
        : 0;

    return {
      studio_id: studioId,
      total_galleries: galleries.length,
      monetized_galleries_count: monetizedCount,
      total_revenue: Number(totalRev.toFixed(2)),
      total_expenses: Number(totalExp.toFixed(2)),
      net_profit: Number(netProfit.toFixed(2)),
      monetization_rate: monRate,
      average_revenue_per_gallery: avgRevPerGallery,
      average_turnaround_days: avgTurnaround,
      galleries: galleryBreakdown,
    };
  }

  async getClientBusinessSummary(studioId: string, clientIdOrOptions?: any): Promise<any> {
    if (typeof clientIdOrOptions === 'string') {
      return this.getClientRevenueSummary(studioId, clientIdOrOptions);
    }
    return this.getClientRevenueSummaries(studioId, clientIdOrOptions || {});
  }

  /**
   * Get Client Revenue Summaries.
   */
  async getClientRevenueSummaries(
    studioId: string,
    options: any = {}
  ): Promise<ClientBusinessSummaryDTO[]> {
    const [clients, transactions] = await Promise.all([
      this.db.client.findMany({ where: { studio_id: studioId } }),
      this.db.studioBusinessTransaction.findMany({
        where: {
          studio_id: studioId,
          is_void: false,
        },
      }),
    ]);

    return clients.map((c: any) => {
      const cTx = transactions.filter((t: any) => t.client_id === c.id);
      let totalRev = 0;
      let totalRef = 0;
      let bookings = 0;
      let firstDate: Date | null = null;
      let latestDate: Date | null = null;

      for (const t of cTx) {
        const amt = Number(t.amount);
        const tDate = new Date(t.transaction_date || t.date);
        const tType = t.type || t.transaction_type;

        if (!firstDate || tDate < firstDate) firstDate = tDate;
        if (!latestDate || tDate > latestDate) latestDate = tDate;

        if (tType === BusinessTransactionType.INCOME) {
          totalRev += amt;
          bookings++;
        } else if (tType === BusinessTransactionType.REFUND) {
          totalRef += amt;
        }
      }

      const netRev = Math.max(0, totalRev - totalRef);
      const aov = bookings > 0 ? Number((netRev / bookings).toFixed(2)) : 0;
      const isRepeat = bookings > 1;

      return {
        client_id: c.id,
        name: c.name,
        email: c.email,
        phone: c.phone || null,
        first_booking_date: firstDate,
        latest_booking_date: latestDate,
        total_bookings: bookings,
        total_revenue: Number(totalRev.toFixed(2)),
        total_refunds: Number(totalRef.toFixed(2)),
        net_revenue: Number(netRev.toFixed(2)),
        currency: 'USD',
        average_order_value: aov,
        is_repeat_client: isRepeat,
        engagement_score: 80,
        journey_stage: 'CLIENT',

        // CamelCase UI aliases
        clientId: c.id,
        firstBookingDate: firstDate,
        latestBookingDate: latestDate,
        totalBookings: bookings,
        totalRevenue: Number(totalRev.toFixed(2)),
        totalRefunds: Number(totalRef.toFixed(2)),
        netRevenue: Number(netRev.toFixed(2)),
        averageOrderValue: aov,
        isRepeatClient: isRepeat,
        engagementScore: 80,
        journeyStage: 'CLIENT',
      };
    });
  }

  async getClientRevenueSummary(studioId: string, clientId: string): Promise<ClientBusinessSummaryDTO | null> {
    const list = await this.getClientRevenueSummaries(studioId);
    return list.find((c) => c.client_id === clientId) || null;
  }
}
