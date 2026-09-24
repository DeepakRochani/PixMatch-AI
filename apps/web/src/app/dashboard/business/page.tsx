'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  DollarSign,
  TrendingUp,
  TrendingDown,
  Receipt,
  Target,
  Sparkles,
  ArrowUpRight,
  Plus,
  FileText,
  AlertCircle,
  CheckCircle2,
  Calendar,
  Layers,
  ArrowRight,
} from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import { BusinessNavTabs } from '@/components/dashboard/BusinessNavTabs';
import { BusinessOverviewDTO } from '@pixmatch/types';

export default function BusinessOverviewPage() {
  const { token, studio } = useAuth();
  const [loading, setLoading] = useState(true);
  const [overview, setOverview] = useState<BusinessOverviewDTO | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchOverview = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch('/api/v1/business/overview', {
        headers: {
          Authorization: `Bearer ${token}`,
          'x-studio-id': studio?.id || '',
        },
      });

      if (!res.ok) {
        throw new Error('Failed to fetch business overview');
      }

      const data = await res.json();
      setOverview(data);
    } catch (err: any) {
      setError(err.message || 'Error loading financial overview');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token) {
      fetchOverview();
    }
  }, [token]);

  const currency = overview?.currency || studio?.currency || 'USD';

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-6">
      {/* Top Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl md:text-3xl font-bold text-white tracking-tight">
              Studio Business Intelligence
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              Phase 18 Live
            </span>
          </div>
          <p className="text-sm text-muted mt-1">
            Track real photographer revenue, operating costs, profit margins, and deterministic forecasting.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/dashboard/business/revenue"
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold bg-primary text-white hover:bg-primary/90 shadow-md shadow-primary/20 transition"
          >
            <Plus className="h-4 w-4" />
            Record Transaction
          </Link>
          <Link
            href="/dashboard/business/goals"
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold bg-card border border-card-border text-white hover:bg-card-border/40 transition"
          >
            <Target className="h-4 w-4 text-accent" />
            Set Goal
          </Link>
        </div>
      </div>

      {/* Navigation Subtabs */}
      <BusinessNavTabs />

      {/* Strict Separation Notice */}
      <div className="px-4 py-3 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-between text-xs text-blue-300">
        <span className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-blue-400 animate-pulse" />
          <strong>Studio Financial Isolation:</strong> These figures represent client income and expenses recorded by your studio, completely independent of your PixMatch SaaS software subscription.
        </span>
        <Link href="/dashboard/subscription" className="text-blue-400 hover:underline flex items-center gap-1">
          Manage SaaS Plan <ArrowRight className="h-3 w-3" />
        </Link>
      </div>

      {/* Loading state */}
      {loading ? (
        <div className="py-20 text-center space-y-3">
          <div className="h-8 w-8 rounded-full border-2 border-primary border-t-transparent animate-spin mx-auto" />
          <p className="text-xs text-muted">Calculating business aggregates and financial KPIs...</p>
        </div>
      ) : error ? (
        <div className="p-6 rounded-2xl bg-red-500/10 border border-red-500/20 text-center text-red-400 text-sm">
          {error}
        </div>
      ) : !overview?.has_financial_data ? (
        /* Zero Fake Financial Data State */
        <div className="p-8 md:p-12 rounded-2xl bg-card border border-card-border text-center space-y-4 max-w-2xl mx-auto my-8">
          <div className="h-16 w-16 rounded-2xl bg-primary/10 border border-primary/20 text-primary flex items-center justify-center mx-auto">
            <Receipt className="h-8 w-8" />
          </div>
          <div className="space-y-1">
            <h3 className="text-lg font-bold text-white">Business revenue data not available yet</h3>
            <p className="text-xs text-muted leading-relaxed">
              PixMatch AI guarantees <strong>100% zero fake financial estimations</strong>. We never guess your revenue from gallery counts or downloads. Record your first client payment or expense to unlock real-time profit tracking.
            </p>
          </div>
          <div className="pt-2">
            <Link
              href="/dashboard/business/revenue"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-semibold bg-primary text-white hover:bg-primary/90 shadow-md shadow-primary/25 transition"
            >
              <Plus className="h-4 w-4" />
              Record First Client Transaction
            </Link>
          </div>
        </div>
      ) : (
        /* Active Financial Dashboard */
        <div className="space-y-6">
          {/* Top Metric Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Total Revenue */}
            <div className="p-5 rounded-2xl bg-card border border-card-border space-y-3 hover:border-emerald-500/30 transition">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-muted uppercase tracking-wider">
                  Net Revenue
                </span>
                <div className="h-8 w-8 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
                  <DollarSign className="h-4 w-4" />
                </div>
              </div>
              <div>
                <p className="text-2xl font-bold text-white tracking-tight">
                  {currency} {overview.total_revenue.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </p>
                <div className="flex items-center gap-1.5 mt-1">
                  {overview.mom_growth.revenue_growth_pct >= 0 ? (
                    <span className="text-[11px] font-semibold text-emerald-400 flex items-center">
                      <TrendingUp className="h-3 w-3 mr-0.5" /> +{overview.mom_growth.revenue_growth_pct}%
                    </span>
                  ) : (
                    <span className="text-[11px] font-semibold text-red-400 flex items-center">
                      <TrendingDown className="h-3 w-3 mr-0.5" /> {overview.mom_growth.revenue_growth_pct}%
                    </span>
                  )}
                  <span className="text-[10px] text-muted">vs previous period</span>
                </div>
              </div>
            </div>

            {/* Operating Expenses */}
            <div className="p-5 rounded-2xl bg-card border border-card-border space-y-3 hover:border-amber-500/30 transition">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-muted uppercase tracking-wider">
                  Expenses
                </span>
                <div className="h-8 w-8 rounded-lg bg-amber-500/10 text-amber-400 flex items-center justify-center">
                  <Receipt className="h-4 w-4" />
                </div>
              </div>
              <div>
                <p className="text-2xl font-bold text-white tracking-tight">
                  {currency} {overview.total_expenses.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </p>
                <div className="flex items-center gap-1.5 mt-1">
                  <span className="text-[11px] text-muted">
                    {overview.mom_growth.expense_growth_pct >= 0 ? '+' : ''}{overview.mom_growth.expense_growth_pct}% vs last period
                  </span>
                </div>
              </div>
            </div>

            {/* Net Profit & Margin */}
            <div className="p-5 rounded-2xl bg-card border border-card-border space-y-3 hover:border-primary/30 transition">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-muted uppercase tracking-wider">
                  Net Profit
                </span>
                <div className="h-8 w-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                  <TrendingUp className="h-4 w-4" />
                </div>
              </div>
              <div>
                <p className="text-2xl font-bold text-white tracking-tight">
                  {currency} {overview.net_profit.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </p>
                <div className="flex items-center gap-2 mt-1">
                  <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-primary/20 text-primary">
                    {overview.profit_margin_pct}% Margin
                  </span>
                </div>
              </div>
            </div>

            {/* Average Order Value & Bookings */}
            <div className="p-5 rounded-2xl bg-card border border-card-border space-y-3 hover:border-purple-500/30 transition">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-muted uppercase tracking-wider">
                  Avg Order Value
                </span>
                <div className="h-8 w-8 rounded-lg bg-purple-500/10 text-purple-400 flex items-center justify-center">
                  <Layers className="h-4 w-4" />
                </div>
              </div>
              <div>
                <p className="text-2xl font-bold text-white tracking-tight">
                  {currency} {overview.average_order_value.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </p>
                <p className="text-[11px] text-muted mt-1">
                  Across {overview.total_completed_bookings} completed bookings
                </p>
              </div>
            </div>
          </div>

          {/* Quick Hub Grid (Insights, Goals, Recent Transactions) */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left 2 Cols: Recent Transactions & Active Goals */}
            <div className="lg:col-span-2 space-y-6">
              {/* Recent Transactions Card */}
              <div className="p-6 rounded-2xl bg-card border border-card-border space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Receipt className="h-4 w-4 text-primary" />
                    <h3 className="text-sm font-bold text-white">Recent Transactions</h3>
                  </div>
                  <Link
                    href="/dashboard/business/revenue"
                    className="text-xs text-primary hover:underline flex items-center gap-1 font-semibold"
                  >
                    View All Ledger <ArrowUpRight className="h-3.5 w-3.5" />
                  </Link>
                </div>

                <div className="divide-y divide-card-border/60">
                  {overview.recent_transactions.slice(0, 5).map((t) => (
                    <div key={t.id} className="py-3 flex items-center justify-between gap-4">
                      <div className="flex items-center gap-3 min-w-0">
                        <div
                          className={`h-8 w-8 rounded-lg flex items-center justify-center text-xs font-bold ${
                            t.type === 'INCOME'
                              ? 'bg-emerald-500/15 text-emerald-400'
                              : t.type === 'EXPENSE'
                              ? 'bg-amber-500/15 text-amber-400'
                              : 'bg-red-500/15 text-red-400'
                          }`}
                        >
                          {t.type === 'INCOME' ? '+' : '-'}
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-semibold text-white truncate">
                            {t.category} {t.client_name ? `• ${t.client_name}` : ''}
                          </p>
                          <p className="text-[11px] text-muted truncate">
                            {new Date(t.transaction_date).toISOString().split('T')[0]} {t.gallery_title ? `| ${t.gallery_title}` : ''}
                          </p>
                        </div>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <p
                          className={`text-xs font-bold ${
                            t.type === 'INCOME'
                              ? 'text-emerald-400'
                              : t.type === 'EXPENSE'
                              ? 'text-amber-400'
                              : 'text-red-400'
                          }`}
                        >
                          {t.type === 'INCOME' ? '+' : '-'}{currency} {t.amount.toFixed(2)}
                        </p>
                        <span className="text-[10px] text-muted capitalize">{t.status.toLowerCase()}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Active Goals Card */}
              <div className="p-6 rounded-2xl bg-card border border-card-border space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Target className="h-4 w-4 text-accent" />
                    <h3 className="text-sm font-bold text-white">Active Business Goals</h3>
                  </div>
                  <Link
                    href="/dashboard/business/goals"
                    className="text-xs text-accent hover:underline flex items-center gap-1 font-semibold"
                  >
                    Manage Targets <ArrowUpRight className="h-3.5 w-3.5" />
                  </Link>
                </div>

                {overview.active_goals.length === 0 ? (
                  <p className="text-xs text-muted py-3">No active business goals set for this period.</p>
                ) : (
                  <div className="space-y-4">
                    {overview.active_goals.map((g) => (
                      <div key={g.id} className="p-4 rounded-xl bg-card-border/20 border border-card-border/40 space-y-2">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-semibold text-white">{g.title}</span>
                          <span className="text-muted font-mono">
                            {g.current_value.toLocaleString()} / {g.target_value.toLocaleString()} ({g.progress_pct}%)
                          </span>
                        </div>
                        <div className="h-2 w-full rounded-full bg-card-border overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all duration-500 ${
                              g.progress_pct >= 100
                                ? 'bg-emerald-400'
                                : g.progress_pct >= 60
                                ? 'bg-primary'
                                : 'bg-amber-400'
                            }`}
                            style={{ width: `${Math.min(100, g.progress_pct)}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Right Col: Anomaly Insights & Forecasting Shortcut */}
            <div className="space-y-6">
              {/* Financial Anomaly Insights Feed */}
              <div className="p-6 rounded-2xl bg-card border border-card-border space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-amber-400" />
                    <h3 className="text-sm font-bold text-white">Proactive Insights</h3>
                  </div>
                  <Link
                    href="/dashboard/business/insights"
                    className="text-xs text-amber-400 hover:underline flex items-center gap-1 font-semibold"
                  >
                    View All <ArrowUpRight className="h-3.5 w-3.5" />
                  </Link>
                </div>

                {overview.active_insights.length === 0 ? (
                  <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-300 space-y-1">
                    <p className="font-semibold flex items-center gap-1.5">
                      <CheckCircle2 className="h-3.5 w-3.5" /> Operations Stable
                    </p>
                    <p className="text-[11px] text-muted">
                      No anomalous revenue drops or expense surges detected across your baseline.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {overview.active_insights.map((ins) => (
                      <div
                        key={ins.id}
                        className={`p-3.5 rounded-xl border text-xs space-y-1.5 ${
                          ins.severity === 'HIGH' || ins.severity === 'CRITICAL'
                            ? 'bg-red-500/10 border-red-500/20 text-red-300'
                            : ins.severity === 'MEDIUM'
                            ? 'bg-amber-500/10 border-amber-500/20 text-amber-300'
                            : 'bg-primary/10 border-primary/20 text-blue-300'
                        }`}
                      >
                        <p className="font-bold">{ins.title}</p>
                        <p className="text-[11px] text-muted leading-relaxed">{ins.description}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Forecasting Preview Card */}
              <div className="p-6 rounded-2xl bg-gradient-to-br from-primary/10 via-accent/5 to-transparent border border-primary/20 space-y-4">
                <div className="flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-primary" />
                  <h3 className="text-sm font-bold text-white">Statistical Forecast</h3>
                </div>
                <p className="text-xs text-muted leading-relaxed">
                  Project next month and next quarter revenue with mathematical confidence intervals and rolling trends.
                </p>
                <Link
                  href="/dashboard/business/forecast"
                  className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold bg-primary text-white hover:bg-primary/90 transition shadow-md shadow-primary/20"
                >
                  Explore Projections <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
