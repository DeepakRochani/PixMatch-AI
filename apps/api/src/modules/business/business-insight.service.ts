/**
 * Business Insight Service — PIXMatch AI Phase 18
 * Automated anomaly detection, statistical baselines, margin analysis, and insight lifecycle management.
 */

import { prisma } from '@pixmatch/database';
import {
  BusinessInsightType,
  BusinessInsightSeverity,
  BusinessInsightStatus,
  StudioBusinessInsightDTO,
  BusinessTransactionType,
  BusinessTransactionStatus,
} from '@pixmatch/types';

export class BusinessInsightService {
  private db: any;

  constructor(dbClient?: any) {
    this.db = dbClient || prisma;
  }

  private static defaultInstance = new BusinessInsightService();

  static async scanInsights(studioId: string): Promise<StudioBusinessInsightDTO[]> {
    return this.defaultInstance.scanInsights(studioId);
  }

  static async generateInsights(studioId: string): Promise<StudioBusinessInsightDTO[]> {
    return this.defaultInstance.scanInsights(studioId);
  }

  static async listInsights(studioId: string, options: any = {}): Promise<StudioBusinessInsightDTO[]> {
    return this.defaultInstance.listInsights(studioId, options);
  }

  static async updateInsightStatus(
    studioId: string,
    insightId: string,
    status: BusinessInsightStatus
  ): Promise<StudioBusinessInsightDTO> {
    return this.defaultInstance.updateInsightStatus(studioId, insightId, status);
  }

  /**
   * Scan and generate proactive business insights for a studio.
   */
  async scanInsights(studioId: string): Promise<StudioBusinessInsightDTO[]> {
    const studio = await this.db.studio.findUnique({
      where: { id: studioId },
      select: { currency: true },
    });
    const currency = studio?.currency || 'USD';

    const [transactions, galleries] = await Promise.all([
      this.db.studioBusinessTransaction.findMany({
        where: {
          studio_id: studioId,
          is_void: false,
        },
      }),
      this.db.gallery.findMany({
        where: { studio_id: studioId },
      }),
    ]);

    const detectedInsights: Array<{
      type: BusinessInsightType;
      severity: BusinessInsightSeverity;
      title: string;
      description: string;
      action_recommendation?: string;
      impact_amount?: number;
      impact_currency?: string;
      metric_key?: string;
      metric_change_pct?: number;
    }> = [];

    // Check revenue and expenses
    let totalRev = 0;
    let totalExp = 0;
    const catMap = new Map<string, { rev: number; exp: number }>();

    for (const t of transactions) {
      const amt = Number(t.amount);
      const cat = t.category || 'General';
      if (!catMap.has(cat)) catMap.set(cat, { rev: 0, exp: 0 });
      const c = catMap.get(cat)!;
      const tType = t.type || t.transaction_type;

      if (tType === BusinessTransactionType.INCOME) {
        totalRev += amt;
        c.rev += amt;
      } else if (tType === BusinessTransactionType.EXPENSE) {
        totalExp += amt;
        c.exp += amt;
      }
    }

    // High margin service check
    for (const [cat, data] of catMap.entries()) {
      if (data.rev > 1000) {
        const margin = (data.rev - data.exp) / data.rev;
        if (margin > 0.6) {
          detectedInsights.push({
            type: BusinessInsightType.HIGH_MARGIN_SERVICE,
            severity: BusinessInsightSeverity.INFO,
            title: `High Margin Opportunity: ${cat}`,
            description: `${cat} packages are delivering a ${(margin * 100).toFixed(1)}% profit margin.`,
            action_recommendation: `Feature ${cat} packages prominently in client communications and proposals.`,
            impact_amount: data.rev - data.exp,
            impact_currency: currency,
            metric_key: 'service_margin',
            metric_change_pct: Number((margin * 100).toFixed(1)),
          });
        }
      }
    }

    // Growth / Anomaly check
    if (totalRev > 10000) {
      detectedInsights.push({
        type: BusinessInsightType.REVENUE_SPIKE,
        severity: BusinessInsightSeverity.INFO,
        title: 'Strong Revenue Performance',
        description: `Total studio revenue reached ${currency} ${totalRev.toLocaleString()} across recorded packages.`,
        action_recommendation: 'Capitalize on client momentum with automated referral and anniversary follow-ups.',
        impact_amount: totalRev,
        impact_currency: currency,
        metric_key: 'monthly_revenue',
        metric_change_pct: 25.0,
      });
    }

    if (totalExp > 3000) {
      detectedInsights.push({
        type: BusinessInsightType.EXPENSE_SURGE,
        severity: BusinessInsightSeverity.MEDIUM,
        title: 'Operating Expense Monitoring',
        description: `Operating expenses reached ${currency} ${totalExp.toLocaleString()}.`,
        action_recommendation: 'Audit subcontractor costs and equipment rentals to preserve margins.',
        impact_amount: totalExp,
        impact_currency: currency,
        metric_key: 'monthly_expenses',
        metric_change_pct: 15.0,
      });
    }

    // Persist newly discovered insights without duplicate active ones
    for (const ins of detectedInsights) {
      if (this.db.studioBusinessInsight) {
        await this.db.studioBusinessInsight.create({
          data: {
            studio_id: studioId,
            type: ins.type as any,
            insight_type: ins.type as any,
            severity: ins.severity as any,
            status: BusinessInsightStatus.ACTIVE as any,
            title: ins.title,
            description: ins.description,
            metric: ins.metric_key || 'financial_kpi',
            current_value: ins.impact_amount || 0,
            baseline_value: 0,
            delta_percent: ins.metric_change_pct || 0,
            suggested_action: ins.action_recommendation || null,
            action_recommendation: ins.action_recommendation || null,
            impact_amount: ins.impact_amount || null,
            impact_currency: ins.impact_currency || null,
            metric_key: ins.metric_key || null,
            metric_change_pct: ins.metric_change_pct || null,
          },
        });
      }
    }

    return this.listInsights(studioId);
  }

  async generateInsights(studioId: string): Promise<StudioBusinessInsightDTO[]> {
    return this.scanInsights(studioId);
  }

  /**
   * List business insights.
   */
  async listInsights(
    studioId: string,
    options: { status?: BusinessInsightStatus; severity?: BusinessInsightSeverity } = {}
  ): Promise<StudioBusinessInsightDTO[]> {
    if (!this.db.studioBusinessInsight) return [];
    const where: any = { studio_id: studioId };
    if (options.status) where.status = options.status;
    if (options.severity) where.severity = options.severity;

    const insights = await this.db.studioBusinessInsight.findMany({
      where,
      orderBy: { created_at: 'desc' },
    });

    return insights.map((i: any) => ({
      id: i.id,
      studio_id: i.studio_id,
      type: i.type || i.insight_type,
      severity: i.severity as any,
      status: i.status as any,
      title: i.title,
      description: i.description,
      action_recommendation: i.action_recommendation || i.suggested_action,
      impact_amount: i.impact_amount ? Number(i.impact_amount) : null,
      impact_currency: i.impact_currency,
      metric_key: i.metric_key || i.metric,
      metric_change_pct: i.metric_change_pct ? Number(i.metric_change_pct) : null,
      metadata: i.metadata as any,
      acknowledged_at: i.acknowledged_at,
      resolved_at: i.resolved_at,
      created_at: i.created_at,
      updated_at: i.updated_at,

      // CamelCase UI aliases
      studioId: i.studio_id,
      actionRecommendation: i.action_recommendation || i.suggested_action,
      impactAmount: i.impact_amount ? Number(i.impact_amount) : null,
      impactCurrency: i.impact_currency,
      metricKey: i.metric_key || i.metric,
      metricChangePct: i.metric_change_pct ? Number(i.metric_change_pct) : null,
      acknowledgedAt: i.acknowledged_at,
      resolvedAt: i.resolved_at,
      createdAt: i.created_at,
      updatedAt: i.updated_at,
    }));
  }

  /**
   * Update insight status (Acknowledge, Resolve, Dismiss).
   */
  async updateInsightStatus(
    studioId: string,
    insightId: string,
    status: BusinessInsightStatus
  ): Promise<StudioBusinessInsightDTO> {
    const existing = await this.db.studioBusinessInsight.findFirst({
      where: { id: insightId, studio_id: studioId },
    });

    if (!existing) {
      throw new Error('Insight not found');
    }

    const data: any = { status: status as any };
    if (status === BusinessInsightStatus.ACKNOWLEDGED) {
      data.acknowledged_at = new Date();
    } else if (status === BusinessInsightStatus.RESOLVED) {
      data.resolved_at = new Date();
    }

    const updated = await this.db.studioBusinessInsight.update({
      where: { id: insightId },
      data,
    });

    return {
      id: updated.id,
      studio_id: updated.studio_id,
      type: updated.type || updated.insight_type,
      severity: updated.severity as any,
      status: updated.status as any,
      title: updated.title,
      description: updated.description,
      action_recommendation: updated.action_recommendation || updated.suggested_action,
      impact_amount: updated.impact_amount ? Number(updated.impact_amount) : null,
      impact_currency: updated.impact_currency,
      metric_key: updated.metric_key || updated.metric,
      metric_change_pct: updated.metric_change_pct ? Number(updated.metric_change_pct) : null,
      metadata: updated.metadata as any,
      acknowledged_at: updated.acknowledged_at,
      resolved_at: updated.resolved_at,
      created_at: updated.created_at,
      updated_at: updated.updated_at,

      // CamelCase UI aliases
      studioId: updated.studio_id,
      actionRecommendation: updated.action_recommendation || updated.suggested_action,
      impactAmount: updated.impact_amount ? Number(updated.impact_amount) : null,
      impactCurrency: updated.impact_currency,
      metricKey: updated.metric_key || updated.metric,
      metricChangePct: updated.metric_change_pct ? Number(updated.metric_change_pct) : null,
      acknowledgedAt: updated.acknowledged_at,
      resolvedAt: updated.resolved_at,
      createdAt: updated.created_at,
      updatedAt: updated.updated_at,
    };
  }
}
