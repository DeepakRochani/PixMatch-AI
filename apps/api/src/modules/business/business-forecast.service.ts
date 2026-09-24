/**
 * Business Forecast Service — PIXMatch AI Phase 18
 * Deterministic statistical forecasting using weighted linear regression and moving averages.
 * 
 * STRICT PRINCIPLE: No LLM hallucination of financial numbers. Requires >= 3 periods of historical
 * transaction data to output high/medium confidence forecasts; otherwise yields INSUFFICIENT_DATA.
 */

import { prisma } from '@pixmatch/database';
import {
  BusinessForecastMetric,
  BusinessForecastPeriod,
  BusinessForecastConfidence,
  StudioBusinessForecastDTO,
  BusinessTransactionType,
  BusinessTransactionStatus,
} from '@pixmatch/types';

export class BusinessForecastService {
  private db: any;

  constructor(dbClient?: any) {
    this.db = dbClient || prisma;
  }

  private static defaultInstance = new BusinessForecastService();

  static async generateForecast(
    studioId: string,
    metric: BusinessForecastMetric = BusinessForecastMetric.REVENUE,
    period: BusinessForecastPeriod = BusinessForecastPeriod.NEXT_MONTH
  ): Promise<StudioBusinessForecastDTO | any> {
    return this.defaultInstance.generateForecast(studioId, metric, period);
  }

  /**
   * Generate deterministic statistical forecast for a given metric and period.
   */
  async generateForecast(
    studioId: string,
    metric: BusinessForecastMetric = BusinessForecastMetric.REVENUE,
    period: BusinessForecastPeriod = BusinessForecastPeriod.NEXT_MONTH
  ): Promise<StudioBusinessForecastDTO | any> {
    const studio = await this.db.studio.findUnique({
      where: { id: studioId },
      select: { currency: true },
    });
    const currency = studio?.currency || 'USD';

    // 1. Fetch monthly historical data for the past 12 months
    const transactions = await this.db.studioBusinessTransaction.findMany({
      where: {
        studio_id: studioId,
        is_void: false,
      },
      orderBy: { transaction_date: 'asc' },
    });

    // 2. Bucket transactions by month YYYY-MM
    const monthlyDataMap = new Map<string, { revenue: number; expenses: number; bookings: number }>();

    for (const t of transactions) {
      const d = new Date(t.transaction_date || t.date);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      if (!monthlyDataMap.has(key)) {
        monthlyDataMap.set(key, { revenue: 0, expenses: 0, bookings: 0 });
      }
      const item = monthlyDataMap.get(key)!;
      const amt = Number(t.amount);
      const tType = t.type || t.transaction_type;
      if (tType === BusinessTransactionType.INCOME) {
        item.revenue += amt;
        item.bookings++;
      } else if (tType === BusinessTransactionType.EXPENSE) {
        item.expenses += amt;
      } else if (tType === BusinessTransactionType.REFUND) {
        item.revenue -= amt;
      }
    }

    // Extract metric values array
    const monthlySeries: number[] = [];
    const nonZeroMonths: number[] = [];

    const sortedKeys = Array.from(monthlyDataMap.keys()).sort();
    for (const key of sortedKeys) {
      const item = monthlyDataMap.get(key)!;
      let val = 0;
      const mStr = String(metric);
      if (mStr.includes('REVENUE')) {
        val = Math.max(0, item.revenue);
      } else if (mStr.includes('EXPENSE')) {
        val = Math.max(0, item.expenses);
      } else if (mStr.includes('PROFIT')) {
        val = Math.max(0, item.revenue) - item.expenses;
      } else if (mStr.includes('BOOKING')) {
        val = item.bookings;
      }

      monthlySeries.push(val);
      if (val > 0) {
        nonZeroMonths.push(val);
      }
    }

    const dataPointsCount = nonZeroMonths.length;

    // 3. Check for minimum data requirement
    if (dataPointsCount < 3) {
      return {
        metric,
        period,
        forecast_value: 0,
        projected_value: 0,
        lower_bound: 0,
        upper_bound: 0,
        confidence: BusinessForecastConfidence.LOW,
        confidence_level: BusinessForecastConfidence.LOW,
        confidence_score: 0,
        data_points_analyzed: dataPointsCount,
        currency,
        model_name: 'Insufficient data (>=3 historical periods required)',
        model_used: 'Insufficient data (>=3 historical periods required)',
        growth_rate_pct: 0,
        historical_baseline_avg: 0,
        generated_at: new Date(),
        explanation: `Insufficient historical transaction data (${dataPointsCount} of 3 required months). Record at least 3 months of business transactions for an accurate projection.`,

        // CamelCase aliases
        forecastValue: 0,
        projectedValue: 0,
        lowerBound: 0,
        upperBound: 0,
        confidenceLevel: BusinessForecastConfidence.LOW,
        confidenceScore: 0,
        dataPointsAnalyzed: dataPointsCount,
        modelName: 'Insufficient data (>=3 historical periods required)',
        modelUsed: 'Insufficient data (>=3 historical periods required)',
        growthRatePct: 0,
        historicalBaselineAvg: 0,
        generatedAt: new Date(),
      };
    }

    // 4. Calculate Weighted Linear Regression: y = m * x + b
    const n = monthlySeries.length;
    let sumW = 0;
    let sumWX = 0;
    let sumWY = 0;
    let sumWXX = 0;
    let sumWXY = 0;

    for (let i = 0; i < n; i++) {
      const x = i + 1;
      const y = monthlySeries[i];
      const w = Math.pow(1.15, i);

      sumW += w;
      sumWX += w * x;
      sumWY += w * y;
      sumWXX += w * x * x;
      sumWXY += w * x * y;
    }

    const denominator = sumW * sumWXX - sumWX * sumWX;
    let slope = denominator !== 0 ? (sumW * sumWXY - sumWX * sumWY) / denominator : 0;
    let intercept = sumW !== 0 ? (sumWY - slope * sumWX) / sumW : 0;

    // 5. Compute Forecast based on period step
    let targetX = n + 1;
    let multiplier = 1;
    if (period === BusinessForecastPeriod.NEXT_QUARTER || String(period).includes('QUARTER')) {
      targetX = n + 2;
      multiplier = 3;
    } else if (period === BusinessForecastPeriod.NEXT_YEAR || String(period).includes('YEAR')) {
      targetX = n + 6.5;
      multiplier = 12;
    }

    let projectedPerMonth = Math.max(0, slope * targetX + intercept);
    const last3Months = monthlySeries.slice(-3);
    const sma3 = last3Months.reduce((a, b) => a + b, 0) / 3;
    const blendedMonthly = 0.65 * projectedPerMonth + 0.35 * sma3;
    const finalForecastValue = Number((blendedMonthly * multiplier).toFixed(2));

    let sumSquaredResiduals = 0;
    for (let i = 0; i < n; i++) {
      const fitted = slope * (i + 1) + intercept;
      const res = monthlySeries[i] - fitted;
      sumSquaredResiduals += res * res;
    }
    const standardError = Math.sqrt(sumSquaredResiduals / Math.max(1, n - 2)) * multiplier;

    const historicalAvg = Number((nonZeroMonths.reduce((a, b) => a + b, 0) / dataPointsCount).toFixed(2));
    const growthRate = historicalAvg > 0 ? Number((((blendedMonthly - historicalAvg) / historicalAvg) * 100).toFixed(2)) : 0;

    let confidence = BusinessForecastConfidence.MEDIUM;
    let confidenceScore = 0.75;

    if (dataPointsCount >= 6 && standardError / Math.max(1, finalForecastValue) < 0.25) {
      confidence = BusinessForecastConfidence.HIGH;
      confidenceScore = 0.88;
    } else if (dataPointsCount < 4 || standardError / Math.max(1, finalForecastValue) > 0.5) {
      confidence = BusinessForecastConfidence.LOW;
      confidenceScore = 0.55;
    }

    const zScore = 1.96;
    const lowerBound = Math.max(0, Number((finalForecastValue - zScore * standardError).toFixed(2)));
    const upperBound = Number((finalForecastValue + zScore * standardError).toFixed(2));

    const explanation = `Projected ${String(metric).toLowerCase().replace('_', ' ')} is ${currency} ${finalForecastValue.toLocaleString()} based on ${dataPointsCount} months of historical trend (${growthRate >= 0 ? '+' : ''}${growthRate}% growth rate).`;

    return {
      metric,
      period,
      forecast_value: finalForecastValue,
      projected_value: finalForecastValue,
      lower_bound: lowerBound,
      upper_bound: upperBound,
      confidence,
      confidence_level: confidence,
      confidence_score: confidenceScore,
      data_points_analyzed: dataPointsCount,
      currency,
      model_name: 'Weighted Linear Trend + Moving Average',
      model_used: 'Weighted Linear Trend + Moving Average',
      growth_rate_pct: growthRate,
      historical_baseline_avg: Number((historicalAvg * multiplier).toFixed(2)),
      generated_at: new Date(),
      explanation,

      // CamelCase aliases
      forecastValue: finalForecastValue,
      projectedValue: finalForecastValue,
      lowerBound,
      upperBound,
      confidenceLevel: confidence,
      confidenceScore,
      dataPointsAnalyzed: dataPointsCount,
      modelName: 'Weighted Linear Trend + Moving Average',
      modelUsed: 'Weighted Linear Trend + Moving Average',
      growthRatePct: growthRate,
      historicalBaselineAvg: Number((historicalAvg * multiplier).toFixed(2)),
      generatedAt: new Date(),
    };
  }
}
