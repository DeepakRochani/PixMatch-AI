'use client';

import React, { useState, useEffect } from 'react';
import {
  TrendingUp,
  Brain,
  ShieldCheck,
  AlertCircle,
  BarChart3,
  Calendar,
  Layers,
  ArrowUpRight,
  Info,
} from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import { BusinessNavTabs } from '@/components/dashboard/BusinessNavTabs';
import {
  StudioBusinessForecastDTO,
  BusinessForecastMetric,
  BusinessForecastPeriod,
} from '@pixmatch/types';

export default function BusinessForecastPage() {
  const { token, studio } = useAuth();
  const [loading, setLoading] = useState(true);
  const [metric, setMetric] = useState<BusinessForecastMetric>(BusinessForecastMetric.REVENUE);
  const [period, setPeriod] = useState<BusinessForecastPeriod>(BusinessForecastPeriod.NEXT_MONTH);
  const [forecast, setForecast] = useState<StudioBusinessForecastDTO | null>(null);

  const fetchForecast = async () => {
    try {
      setLoading(true);
      const res = await fetch(
        `/api/v1/business/forecast?metric=${metric}&period=${period}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'x-studio-id': studio?.id || '',
          },
        }
      );
      if (res.ok) setForecast(await res.json());
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token) fetchForecast();
  }, [token, metric, period]);

  const currency = forecast?.currency || studio?.currency || 'USD';

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-white tracking-tight">
            Deterministic Financial Forecasting
          </h1>
          <p className="text-sm text-muted mt-1">
            Statistical projection using weighted linear regression and moving average baselines with explicit confidence intervals.
          </p>
        </div>

        {/* Controls */}
        <div className="flex items-center gap-3">
          <select
            value={metric}
            onChange={(e) => setMetric(e.target.value as any)}
            className="px-3 py-2 rounded-xl text-xs font-semibold bg-card border border-card-border text-white focus:outline-none focus:border-primary"
          >
            <option value={BusinessForecastMetric.REVENUE}>Metric: Revenue</option>
            <option value={BusinessForecastMetric.PROFIT}>Metric: Net Profit</option>
            <option value={BusinessForecastMetric.EXPENSE}>Metric: Expenses</option>
            <option value={BusinessForecastMetric.BOOKINGS_COUNT}>Metric: Bookings Count</option>
          </select>

          <select
            value={period}
            onChange={(e) => setPeriod(e.target.value as any)}
            className="px-3 py-2 rounded-xl text-xs font-semibold bg-card border border-card-border text-white focus:outline-none focus:border-primary"
          >
            <option value={BusinessForecastPeriod.NEXT_MONTH}>Horizon: Next Month</option>
            <option value={BusinessForecastPeriod.NEXT_QUARTER}>Horizon: Next Quarter</option>
            <option value={BusinessForecastPeriod.NEXT_YEAR}>Horizon: Next Year</option>
          </select>
        </div>
      </div>

      <BusinessNavTabs />

      {/* Zero AI Hallucination Guarantee Banner */}
      <div className="p-4 rounded-xl bg-purple-500/10 border border-purple-500/20 text-xs text-purple-300 flex items-center justify-between">
        <span className="flex items-center gap-2">
          <ShieldCheck className="h-4 w-4 text-purple-400" />
          <strong>Deterministic Math Guarantee:</strong> PixMatch AI uses transparent regression models and standard error calculations. Financial figures are never estimated by generative LLM guessing.
        </span>
      </div>

      {loading ? (
        <div className="py-20 text-center text-xs text-muted">Calculating statistical regression...</div>
      ) : forecast?.confidence === 'INSUFFICIENT_DATA' ? (
        <div className="p-10 rounded-2xl bg-card border border-card-border text-center space-y-3 max-w-xl mx-auto my-6">
          <div className="h-12 w-12 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center mx-auto">
            <Info className="h-6 w-6" />
          </div>
          <h3 className="text-base font-bold text-white">Insufficient Historical Data</h3>
          <p className="text-xs text-muted leading-relaxed">
            {forecast.explanation}
          </p>
        </div>
      ) : forecast ? (
        <div className="space-y-6">
          {/* Main Forecast Card */}
          <div className="p-6 md:p-8 rounded-3xl bg-gradient-to-br from-card via-card to-primary/5 border border-card-border space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <span className="px-2.5 py-1 rounded-md text-[10px] font-bold bg-primary/20 text-primary uppercase">
                  {forecast.period.replace('_', ' ')} PROJECTION
                </span>
                <h2 className="text-3xl md:text-4xl font-extrabold text-white tracking-tight mt-2">
                  {metric === 'BOOKINGS_COUNT' ? '' : `${currency} `}
                  {forecast.forecast_value.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </h2>
                <p className="text-xs text-muted mt-1 font-mono">
                  Confidence Score: {(forecast.confidence_score * 100).toFixed(0)}% • Model: {forecast.model_name}
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-card-border/30 border border-card-border/50 text-right space-y-1">
                <span className="text-[11px] font-semibold text-muted uppercase">95% Confidence Interval</span>
                <p className="text-sm font-bold font-mono text-emerald-400">
                  {currency} {forecast.lower_bound.toLocaleString()} – {currency} {forecast.upper_bound.toLocaleString()}
                </p>
                <p className="text-[10px] text-muted">Based on {forecast.data_points_analyzed} historical months</p>
              </div>
            </div>

            {/* Explanation box */}
            <div className="p-4 rounded-2xl bg-card-border/20 border border-card-border/40 text-xs text-muted leading-relaxed">
              <p className="text-white font-semibold mb-1">Model Synthesis Breakdown</p>
              {forecast.explanation}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
