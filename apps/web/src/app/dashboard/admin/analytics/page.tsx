'use client';

import React, { useEffect, useState } from 'react';
import {
  BarChart3,
  TrendingUp,
  Activity,
  Download,
  RefreshCw,
  DollarSign,
  Users,
  Building2,
  HardDrive,
  Cpu,
  ShieldCheck,
  Percent,
} from 'lucide-react';
import { fetchApi } from '@/lib/api-client';
import { PlatformAnalyticsMetricsDTO, PlatformHealthScoreDTO } from '@pixmatch/types';

function formatINR(amountPaise: number): string {
  if (isNaN(amountPaise)) return '₹0';
  const rupees = amountPaise / 100;
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(rupees);
}

export default function AdminAnalyticsPage() {
  const [analytics, setAnalytics] = useState<PlatformAnalyticsMetricsDTO | null>(null);
  const [health, setHealth] = useState<PlatformHealthScoreDTO | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [period, setPeriod] = useState<string>('30d');

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [analyticsRes, healthRes] = await Promise.all([
        fetchApi<PlatformAnalyticsMetricsDTO>(`/admin/analytics/summary?period=${period}`),
        fetchApi<PlatformHealthScoreDTO>('/admin/health/score'),
      ]);
      if (analyticsRes.success && analyticsRes.data) {
        setAnalytics(analyticsRes.data);
      }
      if (healthRes.success && healthRes.data) {
        setHealth(healthRes.data);
      }
    } catch (err) {
      console.error('Failed to load platform analytics', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [period]);

  const handleExportCSV = (entity: string) => {
    window.open(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000'}/api/admin/export/csv?entity=${entity}&period=${period}`, '_blank');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2.5">
            <BarChart3 className="h-6 w-6 text-amber-400" /> Platform Executive Analytics & Health
          </h1>
          <p className="text-xs text-muted mt-1">
            SaaS growth dynamics, recurring revenue velocity, churn metrics, and 7-dimension platform health score.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <select
            value={period}
            onChange={(e) => setPeriod(e.target.value)}
            className="px-3.5 py-2 rounded-xl bg-[#0E1422] border border-card-border text-white text-xs font-semibold focus:border-amber-500 outline-none"
          >
            <option value="7d">Last 7 Days</option>
            <option value="30d">Last 30 Days</option>
            <option value="90d">Last 90 Days</option>
            <option value="1y">Last Year</option>
          </select>
          <button
            onClick={() => loadData()}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-card-border/40 hover:bg-card-border/70 text-xs font-semibold text-white transition"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? 'animate-spin' : ''}`} /> Refresh
          </button>
        </div>
      </div>

      {/* 7-Dimension Health Score Card */}
      {health && (
        <div className="p-6 rounded-2xl bg-gradient-to-r from-[#0E1422] to-[#121B2E] border border-card-border shadow-xl space-y-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <ShieldCheck className="h-5 w-5 text-emerald-400" />
                <h3 className="text-sm font-bold text-white">7-Dimension Platform Health Index</h3>
              </div>
              <p className="text-xs text-muted mt-1">{health.summary}</p>
            </div>
            <div className="flex items-center gap-3">
              <div className="text-right">
                <span className="text-2xl font-black text-emerald-400">{health.overall_score}/100</span>
                <span className="block text-[10px] uppercase tracking-wider text-muted font-bold">Overall System Health</span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-3 pt-2">
            {health.dimensions?.map((dim, idx) => (
              <div key={idx} className="p-3 rounded-xl bg-[#070A0F]/60 border border-card-border space-y-1">
                <span className="text-[10px] text-muted font-medium truncate block">{dim.dimension}</span>
                <span className="text-sm font-bold text-white block">{dim.score}%</span>
                <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded border uppercase inline-block ${
                  dim.status === 'HEALTHY' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                }`}>
                  {dim.status}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Metric Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-5 rounded-2xl bg-[#0E1422] border border-card-border space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-muted">Monthly Recurring Revenue (MRR)</span>
            <DollarSign className="h-4 w-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-black text-white">
            {analytics ? formatINR(analytics.mrr_minor) : '—'}
          </div>
          <p className="text-[11px] text-muted">
            ARR Run Rate: <span className="text-white font-mono">{analytics ? formatINR(analytics.arr_minor) : '—'}</span>
          </p>
        </div>

        <div className="p-5 rounded-2xl bg-[#0E1422] border border-card-border space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-muted">Studio Growth Rate</span>
            <Building2 className="h-4 w-4 text-blue-400" />
          </div>
          <div className="text-2xl font-black text-white">
            {analytics ? `+${analytics.studio_growth_rate_pct}%` : '—'}
          </div>
          <p className="text-[11px] text-muted">Active Studios expansion 30d</p>
        </div>

        <div className="p-5 rounded-2xl bg-[#0E1422] border border-card-border space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-muted">Net Revenue Retention (NRR)</span>
            <TrendingUp className="h-4 w-4 text-amber-400" />
          </div>
          <div className="text-2xl font-black text-white">
            {analytics ? `${(analytics.net_revenue_retention_bps / 100).toFixed(1)}%` : '—'}
          </div>
          <p className="text-[11px] text-muted">
            Churn Rate: <span className="text-white font-mono">{analytics ? `${(analytics.churn_rate_bps / 100).toFixed(2)}%` : '—'}</span>
          </p>
        </div>

        <div className="p-5 rounded-2xl bg-[#0E1422] border border-card-border space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-muted">AI Adoption Rate</span>
            <Cpu className="h-4 w-4 text-purple-400" />
          </div>
          <div className="text-2xl font-black text-white">
            {analytics ? `${(analytics.ai_adoption_rate_bps / 100).toFixed(1)}%` : '—'}
          </div>
          <p className="text-[11px] text-muted">Tenant AI facial match usage</p>
        </div>
      </div>

      {/* Export Section */}
      <div className="p-6 rounded-2xl bg-[#0E1422] border border-card-border space-y-4">
        <h3 className="text-sm font-bold text-white flex items-center gap-2">
          <Download className="h-4 w-4 text-amber-400" /> Administrative Telemetry & CSV Reports
        </h3>
        <p className="text-xs text-muted">
          All CSV exports are protected against spreadsheet formula injection attacks (`=`, `+`, `-`, `@` escaped).
        </p>
        <div className="flex flex-wrap gap-3 pt-2">
          <button
            onClick={() => handleExportCSV('studios')}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-card-border/40 hover:bg-card-border/70 text-xs font-semibold text-white transition"
          >
            <Download className="h-3.5 w-3.5 text-amber-400" /> Export Studios CSV
          </button>
          <button
            onClick={() => handleExportCSV('users')}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-card-border/40 hover:bg-card-border/70 text-xs font-semibold text-white transition"
          >
            <Download className="h-3.5 w-3.5 text-blue-400" /> Export Users CSV
          </button>
          <button
            onClick={() => handleExportCSV('incidents')}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-card-border/40 hover:bg-card-border/70 text-xs font-semibold text-white transition"
          >
            <Download className="h-3.5 w-3.5 text-red-400" /> Export Incidents CSV
          </button>
          <button
            onClick={() => handleExportCSV('alerts')}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-card-border/40 hover:bg-card-border/70 text-xs font-semibold text-white transition"
          >
            <Download className="h-3.5 w-3.5 text-purple-400" /> Export Alerts CSV
          </button>
        </div>
      </div>
    </div>
  );
}
