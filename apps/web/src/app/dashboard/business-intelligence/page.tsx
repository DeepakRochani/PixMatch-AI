'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  TrendingUp,
  DollarSign,
  Briefcase,
  Users,
  AlertTriangle,
  FileText,
  Sliders,
  Sparkles,
  ShieldCheck,
  RefreshCw,
  ArrowUpRight,
  ArrowDownLeft,
  ChevronRight,
  Target,
  Layers,
  Calendar,
  Activity,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
} from 'lucide-react';
import { BiNavTabs } from '@/components/dashboard/BiNavTabs';
import { fetchApi } from '@/lib/api-client';
import {
  IBiExecutiveDashboardDTO,
  IBiRevenueForecastDTO,
  IBiCashForecastDTO,
  IBiScenarioResults,
  IBiBreakEvenDTO,
} from '@pixmatch/types';

export default function BusinessIntelligenceDashboardPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dashboard, setDashboard] = useState<IBiExecutiveDashboardDTO | null>(null);
  const [forecasts, setForecasts] = useState<{
    revenue_forecast: IBiRevenueForecastDTO;
    cash_forecast: IBiCashForecastDTO;
  } | null>(null);
  const [breakEven, setBreakEven] = useState<IBiBreakEvenDTO | null>(null);

  // Scenario Simulator State
  const [simRevPct, setSimRevPct] = useState<number>(10);
  const [simExpPct, setSimExpPct] = useState<number>(0);
  const [simBookingPct, setSimBookingPct] = useState<number>(0);
  const [scenarioResult, setScenarioResult] = useState<IBiScenarioResults | null>(null);
  const [scenarioLoading, setScenarioLoading] = useState(false);

  // Active Forecast Method
  const [forecastMethod, setForecastMethod] = useState<string>('WEIGHTED_MOVING_AVERAGE');

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [dashRes, fcstRes, beRes] = await Promise.all([
        fetchApi('/business-intelligence/dashboard'),
        fetchApi(`/business-intelligence/forecasts?method=${forecastMethod}`),
        fetchApi('/business-intelligence/break-even'),
      ]);

      if (dashRes && !dashRes.error) {
        setDashboard(dashRes.data || (dashRes as any));
      }
      if (fcstRes && !fcstRes.error) {
        setForecasts(fcstRes.data || (fcstRes as any));
      }
      if (beRes && !beRes.error) {
        setBreakEven(beRes.data || (beRes as any));
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load business intelligence dashboard');
    } finally {
      setLoading(false);
    }
  };

  const runSimulation = async () => {
    setScenarioLoading(true);
    try {
      const res = await fetchApi('/business-intelligence/scenarios', {
        method: 'POST',
        body: JSON.stringify({
          revenue_change_pct: simRevPct,
          expense_change_pct: simExpPct,
          booking_change_pct: simBookingPct,
        }),
      });
      if (res && !res.error) {
        setScenarioResult(res.data || (res as any));
      }
    } catch (err: any) {
      console.error('Failed to run scenario simulation', err);
    } finally {
      setScenarioLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [forecastMethod]);

  const currency = dashboard?.currency || 'INR';

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
              <Sparkles className="w-6 h-6 text-indigo-500" />
              Studio Business Intelligence & Forecasting 2.0
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              Deterministic management decision support, multi-horizon forecasts, and scenario simulations.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={loadData}
              disabled={loading}
              className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-lg bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-750 transition-colors shadow-sm"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
            <Link
              href="/dashboard/business-intelligence/reports"
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm transition-colors"
            >
              <FileText className="w-4 h-4" />
              Management Reports
            </Link>
          </div>
        </div>

        {/* Navigation Tabs */}
        <BiNavTabs activeTab="overview" />

        {error && (
          <div className="p-4 rounded-lg bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 text-red-800 dark:text-red-300 flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 flex-shrink-0" />
            <span className="text-sm">{error}</span>
          </div>
        )}

        {/* 1. KEY PERFORMANCE INDICATORS GRID */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Revenue */}
          <div className="bg-white dark:bg-gray-800 p-5 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Gross Revenue
              </span>
              <DollarSign className="w-5 h-5 text-emerald-500" />
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl font-bold">
                {dashboard
                  ? `${(dashboard.revenue_overview.gross_revenue_minor / 100).toLocaleString()} ${currency}`
                  : '—'}
              </span>
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Collected: {(dashboard?.revenue_overview.collected_revenue_minor || 0) / 100} {currency}
            </p>
          </div>

          {/* Net Profit & Margin */}
          <div className="bg-white dark:bg-gray-800 p-5 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Net Operating Profit
              </span>
              <TrendingUp className="w-5 h-5 text-indigo-500" />
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl font-bold">
                {dashboard
                  ? `${(dashboard.profit_overview.net_profit_minor / 100).toLocaleString()} ${currency}`
                  : '—'}
              </span>
              <span className="text-xs font-medium text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded">
                {dashboard ? `${(dashboard.profit_overview.net_margin_bps / 100).toFixed(1)}%` : '—'}
              </span>
            </div>
            <p className="text-xs text-gray-500 mt-1">Operating margin target: ≥20%</p>
          </div>

          {/* Cash Position */}
          <div className="bg-white dark:bg-gray-800 p-5 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Cash Balance
              </span>
              <Activity className="w-5 h-5 text-blue-500" />
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl font-bold">
                {dashboard
                  ? `${(dashboard.cash_overview.cash_balance_minor / 100).toLocaleString()} ${currency}`
                  : '—'}
              </span>
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Overdue AR: {(dashboard?.cash_overview.overdue_receivables_minor || 0) / 100} {currency}
            </p>
          </div>

          {/* Team Capacity Utilization */}
          <div className="bg-white dark:bg-gray-800 p-5 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Team Utilization
              </span>
              <Users className="w-5 h-5 text-purple-500" />
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl font-bold">
                {dashboard
                  ? `${(dashboard.team_overview.capacity_utilization_bps / 100).toFixed(1)}%`
                  : '—'}
              </span>
              <span className="text-xs font-medium text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-950/40 px-2 py-0.5 rounded">
                {dashboard?.team_overview.total_members || 0} Members
              </span>
            </div>
            <p className="text-xs text-gray-500 mt-1">
              {dashboard?.project_overview.active_count || 0} active projects
            </p>
          </div>
        </div>

        {/* 2. BUSINESS SCORECARD & HEALTH DIMENSIONS */}
        {dashboard?.scorecard && (
          <div className="bg-white dark:bg-gray-800 p-6 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-lg font-bold flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5 text-indigo-500" />
                  Studio Business Scorecard
                </h2>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                  Transparent 7-dimension operational health metrics based on real financial and operational data.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
              {dashboard.scorecard.dimensions.map((dim) => (
                <div
                  key={dim.id}
                  className="p-3.5 rounded-lg border border-gray-100 dark:border-gray-700/60 bg-gray-50/50 dark:bg-gray-750/30"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-gray-600 dark:text-gray-300">
                      {dim.name}
                    </span>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                        dim.status === 'HEALTHY'
                          ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300'
                          : dim.status === 'WATCH'
                          ? 'bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300'
                          : 'bg-red-100 dark:bg-red-950/60 text-red-700 dark:text-red-300'
                      }`}
                    >
                      {dim.status}
                    </span>
                  </div>
                  <div className="mt-2 text-sm font-bold">{dim.actual_value}</div>
                  <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-1 line-clamp-2">
                    {dim.reason}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 3. REVENUE FORECASTING ENGINE */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 bg-white dark:bg-gray-800 p-6 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-bold flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-indigo-500" />
                  Deterministic Revenue Forecast
                </h2>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Model: {forecasts?.revenue_forecast.model_name || 'WEIGHTED_MOVING_AVERAGE_V1'} (Confidence: {forecasts?.revenue_forecast.confidence_level || 'MEDIUM'})
                </p>
              </div>

              {/* Method Selector */}
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-500">Method:</span>
                <select
                  value={forecastMethod}
                  onChange={(e) => setForecastMethod(e.target.value)}
                  className="text-xs bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded px-2 py-1"
                >
                  <option value="WEIGHTED_MOVING_AVERAGE">Weighted Moving Avg</option>
                  <option value="MOVING_AVERAGE">Simple Moving Avg</option>
                  <option value="EXPONENTIAL_SMOOTHING">Exponential Smoothing</option>
                  <option value="LINEAR_TREND">Linear Trend</option>
                </select>
              </div>
            </div>

            {/* Forecast Categories Breakdown */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-3 bg-gray-50 dark:bg-gray-750/50 rounded-lg border border-gray-100 dark:border-gray-700">
              <div>
                <span className="text-[10px] font-bold text-gray-400 uppercase">Committed</span>
                <p className="text-sm font-bold text-emerald-600 dark:text-emerald-400">
                  {forecasts ? `${(forecasts.revenue_forecast.committed_minor / 100).toLocaleString()} ${currency}` : '—'}
                </p>
              </div>
              <div>
                <span className="text-[10px] font-bold text-gray-400 uppercase">Expected</span>
                <p className="text-sm font-bold text-indigo-600 dark:text-indigo-400">
                  {forecasts ? `${(forecasts.revenue_forecast.expected_minor / 100).toLocaleString()} ${currency}` : '—'}
                </p>
              </div>
              <div>
                <span className="text-[10px] font-bold text-gray-400 uppercase">Pipeline</span>
                <p className="text-sm font-bold text-amber-600 dark:text-amber-400">
                  {forecasts ? `${(forecasts.revenue_forecast.pipeline_minor / 100).toLocaleString()} ${currency}` : '—'}
                </p>
              </div>
              <div>
                <span className="text-[10px] font-bold text-gray-400 uppercase">3M Forecast</span>
                <p className="text-sm font-bold text-purple-600 dark:text-purple-400">
                  {forecasts ? `${(forecasts.revenue_forecast.forecast_minor / 100).toLocaleString()} ${currency}` : '—'}
                </p>
              </div>
            </div>

            {/* Monthly Forecast Breakdown Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-gray-50 dark:bg-gray-750 text-gray-500 dark:text-gray-400 uppercase font-semibold">
                  <tr>
                    <th className="py-2.5 px-3">Horizon Month</th>
                    <th className="py-2.5 px-3">Committed</th>
                    <th className="py-2.5 px-3">Expected</th>
                    <th className="py-2.5 px-3">Projected Forecast</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                  {forecasts?.revenue_forecast.breakdown_by_month.map((m) => (
                    <tr key={m.month} className="hover:bg-gray-50/50 dark:hover:bg-gray-750/30">
                      <td className="py-2.5 px-3 font-medium">{m.month}</td>
                      <td className="py-2.5 px-3">{(m.committed_minor / 100).toLocaleString()} {currency}</td>
                      <td className="py-2.5 px-3">{(m.expected_minor / 100).toLocaleString()} {currency}</td>
                      <td className="py-2.5 px-3 font-bold text-indigo-600 dark:text-indigo-400">
                        {(m.forecast_minor / 100).toLocaleString()} {currency}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="text-[11px] text-gray-500 italic">
              Confidence Rationale: {forecasts?.revenue_forecast.confidence_reason}
            </p>
          </div>

          {/* 4. CASH FLOW MULTI-HORIZON OUTLOOK */}
          <div className="bg-white dark:bg-gray-800 p-6 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm space-y-4">
            <div>
              <h2 className="text-lg font-bold flex items-center gap-2">
                <Activity className="w-5 h-5 text-blue-500" />
                Cash Runway Forecast
              </h2>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Deterministic 7, 30, 60, 90 days liquidity projections.
              </p>
            </div>

            <div className="space-y-3">
              {forecasts?.cash_forecast.projections.map((p) => (
                <div
                  key={p.horizon_days}
                  className={`p-3 rounded-lg border ${
                    p.cash_risk_detected
                      ? 'border-red-200 dark:border-red-800/80 bg-red-50/40 dark:bg-red-950/20'
                      : 'border-gray-100 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-750/30'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold">{p.horizon_label}</span>
                    <span
                      className={`text-xs font-bold ${
                        p.projected_ending_cash_minor < 0
                          ? 'text-red-600 dark:text-red-400'
                          : 'text-emerald-600 dark:text-emerald-400'
                      }`}
                    >
                      {(p.projected_ending_cash_minor / 100).toLocaleString()} {currency}
                    </span>
                  </div>
                  <div className="mt-1 flex justify-between text-[11px] text-gray-500">
                    <span>Inflows: +{(p.known_inflows_minor + p.scheduled_inflows_minor) / 100}</span>
                    <span>Outflows: -{(p.known_outflows_minor + p.scheduled_outflows_minor) / 100}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* 5. SCENARIO PLANNER & SENSITIVITY SIMULATOR */}
        <div className="bg-white dark:bg-gray-800 p-6 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold flex items-center gap-2">
                <Sliders className="w-5 h-5 text-indigo-500" />
                Business Scenario Planner & Simulation
              </h2>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Isolated sandbox for what-if simulations. Does not mutate source-of-truth records.
              </p>
            </div>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300">
              SIMULATION ONLY
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="text-xs font-medium text-gray-600 dark:text-gray-300">
                Revenue Shift: {simRevPct > 0 ? `+${simRevPct}%` : `${simRevPct}%`}
              </label>
              <input
                type="range"
                min="-30"
                max="50"
                step="5"
                value={simRevPct}
                onChange={(e) => setSimRevPct(Number(e.target.value))}
                className="w-full mt-2"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600 dark:text-gray-300">
                Expense Shift: {simExpPct > 0 ? `+${simExpPct}%` : `${simExpPct}%`}
              </label>
              <input
                type="range"
                min="-30"
                max="50"
                step="5"
                value={simExpPct}
                onChange={(e) => setSimExpPct(Number(e.target.value))}
                className="w-full mt-2"
              />
            </div>
            <div className="flex items-end">
              <button
                onClick={runSimulation}
                disabled={scenarioLoading}
                className="w-full py-2 px-4 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-sm transition-colors"
              >
                {scenarioLoading ? 'Simulating...' : 'Run Scenario Simulation'}
              </button>
            </div>
          </div>

          {scenarioResult && (
            <div className="mt-4 p-4 rounded-lg bg-indigo-50/50 dark:bg-indigo-950/20 border border-indigo-100 dark:border-indigo-900/60 grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div>
                <span className="text-[10px] font-bold text-gray-400 uppercase">Projected Revenue</span>
                <p className="text-sm font-bold text-gray-900 dark:text-gray-100">
                  {(scenarioResult.projected_revenue_minor / 100).toLocaleString()} {currency}
                </p>
                <span className="text-[10px] text-emerald-600">
                  {scenarioResult.revenue_delta_minor >= 0 ? '+' : ''}
                  {(scenarioResult.revenue_delta_minor / 100).toLocaleString()}
                </span>
              </div>
              <div>
                <span className="text-[10px] font-bold text-gray-400 uppercase">Projected Expenses</span>
                <p className="text-sm font-bold text-gray-900 dark:text-gray-100">
                  {(scenarioResult.projected_expenses_minor / 100).toLocaleString()} {currency}
                </p>
              </div>
              <div>
                <span className="text-[10px] font-bold text-gray-400 uppercase">Projected Net Profit</span>
                <p className="text-sm font-bold text-indigo-600 dark:text-indigo-400">
                  {(scenarioResult.projected_profit_minor / 100).toLocaleString()} {currency}
                </p>
              </div>
              <div>
                <span className="text-[10px] font-bold text-gray-400 uppercase">Projected Margin</span>
                <p className="text-sm font-bold text-purple-600 dark:text-purple-400">
                  {(scenarioResult.projected_margin_bps / 100).toFixed(1)}%
                </p>
              </div>
            </div>
          )}
        </div>

        {/* 6. BUSINESS ALERTS & DECISION INSIGHTS */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Alerts */}
          <div className="bg-white dark:bg-gray-800 p-6 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm space-y-4">
            <h2 className="text-lg font-bold flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-amber-500" />
              Business Health Alerts ({dashboard?.alerts.length || 0})
            </h2>
            <div className="space-y-3">
              {dashboard?.alerts && dashboard.alerts.length > 0 ? (
                dashboard.alerts.map((alert) => (
                  <div
                    key={alert.id}
                    className="p-3 rounded-lg border border-gray-100 dark:border-gray-700 bg-gray-50/60 dark:bg-gray-750/40"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold">{alert.title}</span>
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300">
                        {alert.severity}
                      </span>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">{alert.description}</p>
                  </div>
                ))
              ) : (
                <p className="text-xs text-gray-500">No active alerts. All operations within normal bands.</p>
              )}
            </div>
          </div>

          {/* Decision Insights */}
          <div className="bg-white dark:bg-gray-800 p-6 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm space-y-4">
            <h2 className="text-lg font-bold flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-indigo-500" />
              Decision Support Insights
            </h2>
            <div className="space-y-3">
              {dashboard?.insights && dashboard.insights.length > 0 ? (
                dashboard.insights.map((insight) => (
                  <div
                    key={insight.id}
                    className="p-3 rounded-lg border border-indigo-100 dark:border-indigo-900/40 bg-indigo-50/30 dark:bg-indigo-950/10"
                  >
                    <span className="text-xs font-bold text-indigo-950 dark:text-indigo-200">
                      {insight.title}
                    </span>
                    <p className="text-xs text-gray-600 dark:text-gray-300 mt-1">{insight.explanation}</p>
                    {insight.suggested_review && (
                      <p className="text-[11px] font-medium text-indigo-600 dark:text-indigo-400 mt-1.5">
                        👉 {insight.suggested_review}
                      </p>
                    )}
                  </div>
                ))
              ) : (
                <p className="text-xs text-gray-500">No active insights generated.</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
