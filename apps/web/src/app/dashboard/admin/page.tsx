'use client';

import React, { useEffect, useState } from 'react';
import {
  Building2,
  Users,
  CreditCard,
  TrendingUp,
  Images,
  HardDrive,
  Sparkles,
  AlertTriangle,
  Calendar,
  RefreshCw,
  ArrowUpRight,
  ShieldCheck,
  CheckCircle2,
  Activity,
  UserCheck,
} from 'lucide-react';
import { fetchApi } from '@/lib/api-client';
import { AdminOverviewDTO, AdminAlertItemDTO } from '@pixmatch/types';

function formatBytes(bytes: number): string {
  if (!bytes || bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

function formatINR(amountPaise: number): string {
  if (isNaN(amountPaise)) return '₹0';
  const rupees = amountPaise / 100;
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(rupees);
}

export default function AdminDashboardPage() {
  const [data, setData] = useState<AdminOverviewDTO | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [period, setPeriod] = useState<string>('30d');
  const [error, setError] = useState<string | null>(null);

  const loadData = async (selectedPeriod = period) => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetchApi<AdminOverviewDTO>(`/admin/overview?period=${selectedPeriod}`);
      if (res.success && res.data) {
        setData(res.data);
      } else {
        setError(res.error?.message || 'Failed to load platform overview metrics');
      }
    } catch (err: any) {
      setError(err.message || 'Network error connecting to Admin API');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData(period);
  }, [period]);

  const kpis = data?.kpis;

  return (
    <div className="space-y-6">
      {/* Page Title & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2.5">
            Super Admin Control Center
          </h1>
          <p className="text-xs text-muted mt-1">
            Global operational overview, tenant telemetry, and system-wide intelligence.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          {/* Time Preset Selector */}
          <div className="inline-flex rounded-xl bg-[#131B2A] border border-card-border/80 p-1 text-xs">
            {[
              { id: 'today', label: 'Today' },
              { id: '7d', label: '7 Days' },
              { id: '30d', label: '30 Days' },
              { id: '90d', label: '90 Days' },
              { id: 'year', label: 'This Year' },
            ].map((t) => (
              <button
                key={t.id}
                onClick={() => setPeriod(t.id)}
                className={`px-3 py-1.5 rounded-lg font-semibold transition ${
                  period === t.id
                    ? 'bg-amber-500 text-black shadow-sm'
                    : 'text-muted hover:text-white'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          <button
            onClick={() => loadData()}
            disabled={isLoading}
            className="p-2 rounded-xl bg-[#131B2A] border border-card-border/80 text-muted hover:text-white hover:border-amber-500/40 transition"
            title="Refresh Data"
          >
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin text-amber-400' : ''}`} />
          </button>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs flex items-center gap-3">
          <AlertTriangle className="h-4 w-4 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Top KPI Metric Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total & Active Studios */}
        <div className="rounded-2xl bg-[#0E1422] border border-card-border/80 p-5 space-y-2 hover:border-amber-500/30 transition">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-muted">Total Studios</span>
            <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400">
              <Building2 className="h-4 w-4" />
            </div>
          </div>
          <div className="flex items-baseline justify-between">
            <span className="text-2xl font-extrabold text-white">
              {kpis ? kpis.total_studios.toLocaleString() : '—'}
            </span>
            <span className="text-[11px] font-semibold text-emerald-400">
              {kpis ? `${kpis.active_studios} active` : '—'}
            </span>
          </div>
          <p className="text-[10px] text-muted/70">
            {kpis && kpis.suspended_studios > 0
              ? `${kpis.suspended_studios} suspended studio accounts`
              : 'Zero suspended studios'}
          </p>
        </div>

        {/* Total Users */}
        <div className="rounded-2xl bg-[#0E1422] border border-card-border/80 p-5 space-y-2 hover:border-blue-500/30 transition">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-muted">Platform Users</span>
            <div className="p-2 rounded-xl bg-blue-500/10 text-blue-400">
              <Users className="h-4 w-4" />
            </div>
          </div>
          <div className="flex items-baseline justify-between">
            <span className="text-2xl font-extrabold text-white">
              {kpis ? kpis.total_users.toLocaleString() : '—'}
            </span>
            <span className="text-[11px] font-semibold text-blue-400">
              {kpis ? `${kpis.client_contacts} clients` : '—'}
            </span>
          </div>
          <p className="text-[10px] text-muted/70">Registered photographers & studio staff</p>
        </div>

        {/* Active Subscriptions & MRR */}
        <div className="rounded-2xl bg-[#0E1422] border border-card-border/80 p-5 space-y-2 hover:border-emerald-500/30 transition">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-muted">Monthly Recurring (MRR)</span>
            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400">
              <TrendingUp className="h-4 w-4" />
            </div>
          </div>
          <div className="flex items-baseline justify-between">
            <span className="text-2xl font-extrabold text-emerald-400">
              {kpis ? formatINR(kpis.mrr_inr) : '—'}
            </span>
            <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-bold">
              ESTIMATE
            </span>
          </div>
          <p className="text-[10px] text-muted/70">
            {kpis ? `ARR: ${formatINR(kpis.arr_estimate_inr)}` : 'ARR calculation pending'}
          </p>
        </div>

        {/* Subscriptions Status */}
        <div className="rounded-2xl bg-[#0E1422] border border-card-border/80 p-5 space-y-2 hover:border-purple-500/30 transition">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-muted">Active Subscriptions</span>
            <div className="p-2 rounded-xl bg-purple-500/10 text-purple-400">
              <CreditCard className="h-4 w-4" />
            </div>
          </div>
          <div className="flex items-baseline justify-between">
            <span className="text-2xl font-extrabold text-white">
              {kpis ? kpis.active_subscriptions.toLocaleString() : '—'}
            </span>
            <span className="text-[11px] font-semibold text-purple-400">
              {kpis ? `${kpis.trial_accounts} trialing` : '—'}
            </span>
          </div>
          <p className="text-[10px] text-muted/70">
            {kpis && kpis.past_due_accounts > 0
              ? `⚠️ ${kpis.past_due_accounts} past due`
              : 'All subscriptions in good standing'}
          </p>
        </div>
      </div>

      {/* Second Row KPI Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Galleries & Photos */}
        <div className="rounded-2xl bg-[#0E1422] border border-card-border/80 p-5 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-muted">Galleries & Photos</span>
            <div className="p-2 rounded-xl bg-cyan-500/10 text-cyan-400">
              <Images className="h-4 w-4" />
            </div>
          </div>
          <div className="flex items-baseline justify-between">
            <span className="text-2xl font-extrabold text-white">
              {kpis ? kpis.total_photos.toLocaleString() : '—'}
            </span>
            <span className="text-[11px] font-semibold text-cyan-400">
              {kpis ? `${kpis.total_galleries} galleries` : '—'}
            </span>
          </div>
          <p className="text-[10px] text-muted/70">Total customer photos uploaded</p>
        </div>

        {/* AI Indexed Photos */}
        <div className="rounded-2xl bg-[#0E1422] border border-card-border/80 p-5 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-muted">AI Indexed Photos</span>
            <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400">
              <Sparkles className="h-4 w-4" />
            </div>
          </div>
          <div className="flex items-baseline justify-between">
            <span className="text-2xl font-extrabold text-amber-400">
              {kpis ? kpis.ai_indexed_photos.toLocaleString() : '—'}
            </span>
            <span className="text-[11px] font-semibold text-amber-300">
              {kpis ? `${kpis.ai_searches_period} searches` : '—'}
            </span>
          </div>
          <p className="text-[10px] text-muted/70">Indexed in pgvector 512-d space</p>
        </div>

        {/* Storage Used */}
        <div className="rounded-2xl bg-[#0E1422] border border-card-border/80 p-5 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-muted">Storage Consumed</span>
            <div className="p-2 rounded-xl bg-rose-500/10 text-rose-400">
              <HardDrive className="h-4 w-4" />
            </div>
          </div>
          <div className="flex items-baseline justify-between">
            <span className="text-2xl font-extrabold text-white">
              {kpis ? formatBytes(kpis.storage_used_bytes) : '—'}
            </span>
            <span className="text-[11px] font-semibold text-rose-400">Across providers</span>
          </div>
          <p className="text-[10px] text-muted/70">Platform, S3, R2 & Cloud Drives</p>
        </div>

        {/* System Status */}
        <div className="rounded-2xl bg-[#0E1422] border border-card-border/80 p-5 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-muted">Platform Health</span>
            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400">
              <Activity className="h-4 w-4" />
            </div>
          </div>
          <div className="flex items-baseline justify-between">
            <span className="text-2xl font-extrabold text-emerald-400 flex items-center gap-2">
              <span className="h-3 w-3 rounded-full bg-emerald-400 animate-pulse" />
              HEALTHY
            </span>
            <span className="text-[11px] font-semibold text-emerald-400">9 Core Services</span>
          </div>
          <p className="text-[10px] text-muted/70">PostgreSQL, Redis, BullMQ, AI Service</p>
        </div>
      </div>

      {/* Operational Alerts Section */}
      <div className="rounded-2xl bg-[#0E1422] border border-card-border/80 p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <AlertTriangle className="h-5 w-5 text-amber-400" />
            <h2 className="text-base font-bold text-white tracking-tight">Operational Alerts</h2>
          </div>
          <span className="text-xs text-muted">
            {data?.alerts.length || 0} active alert{data?.alerts.length === 1 ? '' : 's'}
          </span>
        </div>

        {data?.alerts && data.alerts.length > 0 ? (
          <div className="space-y-2.5">
            {data.alerts.map((alert, idx) => (
              <div
                key={idx}
                className={`p-4 rounded-xl border flex items-start gap-3.5 transition ${
                  alert.type === 'CRITICAL'
                    ? 'bg-red-500/10 border-red-500/30 text-red-300'
                    : alert.type === 'WARNING'
                    ? 'bg-amber-500/10 border-amber-500/30 text-amber-300'
                    : 'bg-blue-500/10 border-blue-500/30 text-blue-300'
                }`}
              >
                <AlertTriangle
                  className={`h-4 w-4 flex-shrink-0 mt-0.5 ${
                    alert.type === 'CRITICAL'
                      ? 'text-red-400'
                      : alert.type === 'WARNING'
                      ? 'text-amber-400'
                      : 'text-blue-400'
                  }`}
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-bold uppercase tracking-wider">{alert.title || alert.category}</span>
                    <span className="text-[10px] font-mono text-muted">
                      {new Date(alert.timestamp).toLocaleTimeString()}
                    </span>
                  </div>
                  <p className="text-xs text-white/90 mt-0.5">{alert.description}</p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-6 rounded-xl bg-emerald-500/5 border border-emerald-500/20 text-center space-y-2">
            <CheckCircle2 className="h-8 w-8 text-emerald-400 mx-auto" />
            <p className="text-xs font-semibold text-emerald-300">No active platform alerts</p>
            <p className="text-[11px] text-muted">
              All processing queues, storage sync connections, and billing pipelines are running smoothly.
            </p>
          </div>
        )}
      </div>

      {/* Growth Trends & Telemetry Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Studio & User Growth */}
        <div className="rounded-2xl bg-[#0E1422] border border-card-border/80 p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-white tracking-tight flex items-center gap-2">
              <Building2 className="h-4 w-4 text-amber-400" /> Studio & Tenant Growth
            </h3>
            <span className="text-[11px] font-mono text-muted">{period.toUpperCase()}</span>
          </div>

          <div className="h-56 flex items-end gap-2 pt-4">
            {data?.charts?.studio_growth && data.charts.studio_growth.length > 0 ? (
              data.charts.studio_growth.map((point, idx) => {
                const maxVal = Math.max(...data.charts.studio_growth.map((p) => p.value), 1);
                const heightPct = Math.max(15, Math.round((point.value / maxVal) * 100));
                return (
                  <div key={idx} className="flex-1 flex flex-col items-center gap-1.5 group">
                    <div
                      style={{ height: `${heightPct}%` }}
                      className="w-full rounded-t-lg bg-gradient-to-t from-amber-500/40 to-amber-400 group-hover:from-amber-400 group-hover:to-amber-300 transition-all cursor-pointer relative"
                    >
                      <div className="absolute -top-7 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 bg-black/90 text-amber-300 text-[10px] font-bold px-1.5 py-0.5 rounded shadow pointer-events-none transition whitespace-nowrap z-10">
                        {point.value} studios
                      </div>
                    </div>
                    <span className="text-[9px] font-mono text-muted truncate max-w-full">
                      {point.date.slice(5) || point.date}
                    </span>
                  </div>
                );
              })
            ) : (
              <div className="w-full h-full flex items-center justify-center text-xs text-muted">
                No historical growth points in selected range
              </div>
            )}
          </div>
        </div>

        {/* Photos Processed & AI Usage */}
        <div className="rounded-2xl bg-[#0E1422] border border-card-border/80 p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-white tracking-tight flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-cyan-400" /> Photos Ingested & AI Indexed
            </h3>
            <span className="text-[11px] font-mono text-muted">{period.toUpperCase()}</span>
          </div>

          <div className="h-56 flex items-end gap-2 pt-4">
            {data?.charts?.photos_processed && data.charts.photos_processed.length > 0 ? (
              data.charts.photos_processed.map((point, idx) => {
                const maxVal = Math.max(...data.charts.photos_processed.map((p) => p.count), 1);
                const heightPct = Math.max(15, Math.round((point.count / maxVal) * 100));
                return (
                  <div key={idx} className="flex-1 flex flex-col items-center gap-1.5 group">
                    <div
                      style={{ height: `${heightPct}%` }}
                      className="w-full rounded-t-lg bg-gradient-to-t from-cyan-500/40 to-cyan-400 group-hover:from-cyan-400 group-hover:to-cyan-300 transition-all cursor-pointer relative"
                    >
                      <div className="absolute -top-7 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 bg-black/90 text-cyan-300 text-[10px] font-bold px-1.5 py-0.5 rounded shadow pointer-events-none transition whitespace-nowrap z-10">
                        {point.count} photos
                      </div>
                    </div>
                    <span className="text-[9px] font-mono text-muted truncate max-w-full">
                      {point.date.slice(5) || point.date}
                    </span>
                  </div>
                );
              })
            ) : (
              <div className="w-full h-full flex items-center justify-center text-xs text-muted">
                No photo processing telemetry in selected range
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
