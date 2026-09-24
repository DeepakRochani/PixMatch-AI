/**
 * Revenue Forecast Service — PIXMatch AI Phase 38
 *
 * Deterministic Revenue Forecasting:
 * - Categories: ACTUAL, COMMITTED, EXPECTED, PIPELINE, FORECAST
 * - Methods: MOVING_AVERAGE, WEIGHTED_MOVING_AVERAGE, EXPONENTIAL_SMOOTHING, LINEAR_TREND
 * - Confidence levels: HIGH, MEDIUM, LOW with mathematical reasoning
 * - Model versioning for reproducibility
 * - Safe integer minor units (paise/cents)
 */

import {
  BiForecastCategory,
  BiForecastMethod,
  BiForecastConfidence,
  IBiRevenueForecastDTO,
} from '@pixmatch/types';

export interface IHistoricalPeriodData {
  period_label: string; // e.g. "2026-03", "2026-04"
  actual_minor: number;
}

export interface ICommittedPipelineData {
  signed_contracts_minor: number;
  confirmed_bookings_minor: number;
  issued_invoices_minor: number;
  open_opportunities: Array<{
    id: string;
    title: string;
    value_minor: number;
    probability_pct: number; // 0 to 100
  }>;
}

export class RevenueForecastService {
  private static readonly MODEL_NAME_PREFIX = 'REV_FCST_';
  private static readonly MODEL_VERSION = '1.0.0';

  /**
   * Forecast future revenue using deterministic statistical methods.
   */
  public static calculateForecast(
    historicalData: IHistoricalPeriodData[],
    pipelineData: ICommittedPipelineData,
    method: BiForecastMethod = 'WEIGHTED_MOVING_AVERAGE',
    forecastHorizonMonths: number = 3,
    currency: string = 'INR'
  ): IBiRevenueForecastDTO {
    const historicalPeriodsCount = historicalData.length;

    // 1. Calculate committed revenue:
    // Signed contracts + Confirmed bookings + Issued unpaid invoices
    const committed_minor =
      pipelineData.signed_contracts_minor +
      pipelineData.confirmed_bookings_minor +
      pipelineData.issued_invoices_minor;

    // 2. Calculate pipeline revenue (all open opportunities unweighted)
    let pipeline_minor = 0;
    let expected_minor = 0;

    for (const opp of pipelineData.open_opportunities) {
      const val = Math.max(0, Math.round(opp.value_minor || 0));
      pipeline_minor += val;

      const prob = Math.min(100, Math.max(0, opp.probability_pct ?? 0));
      // weighted calculation
      expected_minor += Math.round((val * prob) / 100);
    }

    // Expected revenue also incorporates committed baseline
    const total_expected_minor = committed_minor + expected_minor;

    // 3. Historical actuals sum
    const actual_minor = historicalData.reduce((acc, d) => acc + Math.max(0, Math.round(d.actual_minor || 0)), 0);

    // 4. Calculate statistical forecast based on historical data
    const values = historicalData.map((d) => Math.max(0, Math.round(d.actual_minor || 0)));
    const { projectedMonthly, confidenceLevel, confidenceReason, rangeStdDev } =
      RevenueForecastService.computeMethodProjection(values, method, forecastHorizonMonths);

    const forecast_minor = projectedMonthly.reduce((a, b) => a + b, 0);

    // Forecast range if variance is computable
    let forecast_range_minor: { lower: number; upper: number } | null = null;
    if (rangeStdDev > 0 && historicalPeriodsCount >= 3) {
      const margin = Math.round(rangeStdDev * 1.96 * Math.sqrt(forecastHorizonMonths));
      forecast_range_minor = {
        lower: Math.max(0, forecast_minor - margin),
        upper: forecast_minor + margin,
      };
    }

    // Monthly breakdown construction
    const breakdown_by_month: IBiRevenueForecastDTO['breakdown_by_month'] = [];
    const now = new Date();

    for (let i = 0; i < forecastHorizonMonths; i++) {
      const futureDate = new Date(now.getFullYear(), now.getMonth() + i + 1, 1);
      const monthLabel = `${futureDate.getFullYear()}-${String(futureDate.getMonth() + 1).padStart(2, '0')}`;
      const monthlyForecast = projectedMonthly[i] || 0;
      const monthlyCommitted = Math.round(committed_minor / forecastHorizonMonths);
      const monthlyExpected = Math.round(total_expected_minor / forecastHorizonMonths);
      const monthlyPipeline = Math.round(pipeline_minor / forecastHorizonMonths);

      const monthlyStdDev = rangeStdDev;
      const lower = monthlyStdDev > 0 ? Math.max(0, Math.round(monthlyForecast - monthlyStdDev * 1.96)) : undefined;
      const upper = monthlyStdDev > 0 ? Math.round(monthlyForecast + monthlyStdDev * 1.96) : undefined;

      breakdown_by_month.push({
        month: monthLabel,
        actual_minor: 0,
        committed_minor: monthlyCommitted,
        expected_minor: monthlyExpected,
        pipeline_minor: monthlyPipeline,
        forecast_minor: monthlyForecast,
        lower_bound_minor: lower,
        upper_bound_minor: upper,
      });
    }

    return {
      method,
      model_name: `${RevenueForecastService.MODEL_NAME_PREFIX}${method}_V1`,
      model_version: RevenueForecastService.MODEL_VERSION,
      historical_periods: historicalPeriodsCount,
      forecast_period: `${forecastHorizonMonths}M`,
      confidence_level: confidenceLevel,
      confidence_reason: confidenceReason,
      generated_at: new Date().toISOString(),
      currency,
      actual_minor,
      committed_minor,
      expected_minor: total_expected_minor,
      pipeline_minor,
      forecast_minor,
      forecast_range_minor,
      breakdown_by_month,
    };
  }

  /**
   * Deterministic projection algorithms.
   */
  private static computeMethodProjection(
    values: number[],
    method: BiForecastMethod,
    horizonMonths: number
  ): {
    projectedMonthly: number[];
    confidenceLevel: BiForecastConfidence;
    confidenceReason: string;
    rangeStdDev: number;
  } {
    const n = values.length;

    // Insufficient historical data handling (<3 periods)
    if (n === 0) {
      return {
        projectedMonthly: Array(horizonMonths).fill(0),
        confidenceLevel: 'LOW',
        confidenceReason: 'No historical periods available. Baseline projection set to zero.',
        rangeStdDev: 0,
      };
    }

    if (n < 3) {
      const avg = Math.round(values.reduce((a, b) => a + b, 0) / n);
      return {
        projectedMonthly: Array(horizonMonths).fill(avg),
        confidenceLevel: 'LOW',
        confidenceReason: `Insufficient historical periods (${n} < 3). Forecast calculated as simple average with low confidence.`,
        rangeStdDev: 0,
      };
    }

    // Standard deviation and coefficient of variation
    const mean = values.reduce((a, b) => a + b, 0) / n;
    const variance = values.reduce((acc, v) => acc + Math.pow(v - mean, 2), 0) / n;
    const stdDev = Math.sqrt(variance);
    const cv = mean > 0 ? stdDev / mean : 0; // Coefficient of variation

    // Confidence determination based on period count and volatility
    let confidenceLevel: BiForecastConfidence = 'MEDIUM';
    let confidenceReason = '';

    if (n >= 6) {
      if (cv < 0.25) {
        confidenceLevel = 'HIGH';
        confidenceReason = `Strong historical baseline (${n} periods) with low revenue volatility (${(cv * 100).toFixed(1)}% CV).`;
      } else if (cv < 0.5) {
        confidenceLevel = 'MEDIUM';
        confidenceReason = `Adequate historical baseline (${n} periods) with moderate revenue variance (${(cv * 100).toFixed(1)}% CV).`;
      } else {
        confidenceLevel = 'LOW';
        confidenceReason = `Historical data (${n} periods) exhibits high variance (${(cv * 100).toFixed(1)}% CV).`;
      }
    } else {
      // 3 to 5 periods
      if (cv < 0.3) {
        confidenceLevel = 'MEDIUM';
        confidenceReason = `Moderate historical sample (${n} periods) with stable revenue pattern.`;
      } else {
        confidenceLevel = 'LOW';
        confidenceReason = `Limited historical sample (${n} periods) with elevated volatility.`;
      }
    }

    const projectedMonthly: number[] = [];

    switch (method) {
      case 'MOVING_AVERAGE': {
        const windowSize = Math.min(n, 6);
        const windowValues = values.slice(-windowSize);
        const windowAvg = Math.round(windowValues.reduce((a, b) => a + b, 0) / windowSize);
        for (let i = 0; i < horizonMonths; i++) {
          projectedMonthly.push(Math.max(0, windowAvg));
        }
        break;
      }

      case 'WEIGHTED_MOVING_AVERAGE': {
        const windowSize = Math.min(n, 6);
        const windowValues = values.slice(-windowSize);
        let weightSum = 0;
        let weightedTotal = 0;
        for (let i = 0; i < windowSize; i++) {
          const w = i + 1; // 1, 2, 3...
          weightSum += w;
          weightedTotal += windowValues[i] * w;
        }
        const wma = Math.round(weightedTotal / weightSum);
        for (let i = 0; i < horizonMonths; i++) {
          projectedMonthly.push(Math.max(0, wma));
        }
        break;
      }

      case 'EXPONENTIAL_SMOOTHING': {
        const alpha = 0.35; // Smoothing factor
        let smoothed = values[0];
        for (let i = 1; i < n; i++) {
          smoothed = alpha * values[i] + (1 - alpha) * smoothed;
        }
        const expVal = Math.round(smoothed);
        for (let i = 0; i < horizonMonths; i++) {
          projectedMonthly.push(Math.max(0, expVal));
        }
        break;
      }

      case 'LINEAR_TREND': {
        // Simple linear regression: y = m*x + b
        let sumX = 0;
        let sumY = 0;
        let sumXY = 0;
        let sumX2 = 0;

        for (let i = 0; i < n; i++) {
          const x = i + 1;
          const y = values[i];
          sumX += x;
          sumY += y;
          sumXY += x * y;
          sumX2 += x * x;
        }

        const denominator = n * sumX2 - sumX * sumX;
        let slope = 0;
        let intercept = mean;

        if (denominator !== 0) {
          slope = (n * sumXY - sumX * sumY) / denominator;
          intercept = (sumY - slope * sumX) / n;
        }

        for (let i = 0; i < horizonMonths; i++) {
          const targetX = n + i + 1;
          const projected = Math.round(intercept + slope * targetX);
          projectedMonthly.push(Math.max(0, projected));
        }
        break;
      }
    }

    return {
      projectedMonthly,
      confidenceLevel,
      confidenceReason,
      rangeStdDev: Math.round(stdDev),
    };
  }
}
