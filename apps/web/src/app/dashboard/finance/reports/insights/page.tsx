'use client';

import React, { useState, useEffect } from 'react';
import {
  Sparkles,
  RefreshCw,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  Lightbulb,
  CheckCircle2,
  Calendar,
  Layers,
} from 'lucide-react';
import { FinanceNavTabs } from '@/components/dashboard/FinanceNavTabs';
import { ReportsNavTabs } from '@/components/dashboard/ReportsNavTabs';
import { fetchApi } from '@/lib/api-client';

export default function FinancialInsightsPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [insights, setInsights] = useState<any>(null);
  const [comparison, setComparison] = useState<any>(null);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [insRes, compRes] = await Promise.all([
        fetchApi('/finance/reports/insights'),
        fetchApi('/finance/reports/compare-periods'),
      ]);

      if (insRes && !insRes.error) setInsights(insRes.data || insRes);
      if (compRes && !compRes.error) setComparison(compRes.data || compRes);
    } catch (err: any) {
      setError(err.message || 'Failed to load Financial Insights');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const formatCurrency = (paise?: number, currency = 'INR') => {
    const val = (paise || 0) / 100;
    const sym = currency === 'INR' ? '₹' : '$';
    return `${sym}${val.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2.5">
            <Sparkles className="h-7 w-7 text-cyan-400" />
            Financial Intelligence & Trend Insights
          </h1>
          <p className="text-sm text-muted mt-1">
            Automated trend synthesis, period-over-period variance commentary, and strategic studio margin recommendations.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={loadData}
            disabled={loading}
            className="flex items-center gap-1.5 px-3 py-2 bg-card-bg border border-card-border rounded-lg text-xs font-medium text-white hover:bg-card-border/40 transition"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
            Refresh Intelligence
          </button>
        </div>
      </div>

      <FinanceNavTabs />
      <ReportsNavTabs />

      {error && (
        <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm flex items-center gap-2">
          <AlertTriangle className="h-5 w-5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Executive Commentary Card */}
      {insights && (
        <div className="p-6 rounded-2xl bg-gradient-to-r from-cyan-950/40 via-card-bg to-indigo-950/30 border border-cyan-500/30 space-y-3">
          <div className="flex items-center gap-2 text-cyan-400 text-xs font-bold uppercase tracking-wider">
            <Sparkles className="h-4 w-4" />
            Executive Narrative Summary
          </div>
          <p className="text-sm text-white leading-relaxed">
            {insights.summary_commentary || 'Studio revenue and operational metrics remain in healthy standing across the current accounting period.'}
          </p>
        </div>
      )}

      {/* Insights Grid */}
      {insights && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {insights.insights?.map((item: any, idx: number) => (
            <div key={idx} className="p-5 rounded-2xl bg-card-bg border border-card-border space-y-2">
              <div className="flex items-center gap-2">
                {item.type === 'POSITIVE' ? (
                  <TrendingUp className="h-5 w-5 text-emerald-400" />
                ) : item.type === 'NEGATIVE' ? (
                  <TrendingDown className="h-5 w-5 text-rose-400" />
                ) : (
                  <Lightbulb className="h-5 w-5 text-amber-400" />
                )}
                <h3 className="text-sm font-bold text-white">{item.title}</h3>
              </div>
              <p className="text-xs text-muted leading-relaxed">{item.description}</p>
            </div>
          ))}
        </div>
      )}

      {/* Period Comparison Table */}
      {comparison && (
        <div className="p-6 rounded-2xl bg-card-bg border border-card-border space-y-4">
          <h3 className="text-base font-bold text-white">Period-over-Period Performance Matrix</h3>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-4 rounded-xl bg-card-border/30">
              <span className="text-xs text-muted">Prior Period Revenue</span>
              <div className="text-lg font-bold text-white mt-1">
                {formatCurrency(comparison.period1?.revenue)}
              </div>
            </div>

            <div className="p-4 rounded-xl bg-card-border/30">
              <span className="text-xs text-muted">Current Period Revenue</span>
              <div className="text-lg font-bold text-cyan-400 mt-1">
                {formatCurrency(comparison.period2?.revenue)}
              </div>
            </div>

            <div className="p-4 rounded-xl bg-card-border/30">
              <span className="text-xs text-muted">Growth Variance</span>
              <div className={`text-lg font-bold mt-1 ${comparison.growth_percentage >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                {comparison.growth_percentage >= 0 ? '+' : ''}{comparison.growth_percentage}%
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
