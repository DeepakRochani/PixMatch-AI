'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  Mail,
  Send,
  CheckCircle2,
  AlertCircle,
  Clock,
  Layers,
  Settings,
  ListFilter,
  RefreshCw,
  ExternalLink,
  ShieldCheck,
  TrendingUp,
} from 'lucide-react';
import { fetchApi } from '@/lib/api-client';
import { AdminEmailOverviewDTO } from '@pixmatch/types';

export default function AdminEmailOverviewPage() {
  const [data, setData] = useState<AdminEmailOverviewDTO | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const loadOverview = async () => {
    setIsLoading(true);
    try {
      const res = await fetchApi<AdminEmailOverviewDTO>('/admin/email');
      if (res.success && res.data) {
        setData(res.data);
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadOverview();
  }, []);

  const totals = data?.totals;
  const provider = data?.provider;

  return (
    <div className="space-y-6">
      {/* Header & Sub-navigation */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2.5">
            <Mail className="h-6 w-6 text-amber-400" /> Email Operations Center
          </h1>
          <p className="text-xs text-muted mt-1">
            Real-time delivery tracking, multi-provider health, transactional queue metrics, and template management.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => loadOverview()}
            disabled={isLoading}
            className="p-2 rounded-xl bg-[#131B2A] border border-card-border/80 text-muted hover:text-white transition"
            title="Refresh overview"
          >
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin text-amber-400' : ''}`} />
          </button>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-card-border pb-3 overflow-x-auto">
        <Link
          href="/dashboard/admin/email"
          className="px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-amber-500/15 text-amber-300 border border-amber-500/30"
        >
          Overview
        </Link>
        <Link
          href="/dashboard/admin/email/logs"
          className="px-3.5 py-1.5 rounded-lg text-xs font-semibold text-muted hover:text-white hover:bg-card-border/30 transition flex items-center gap-1.5"
        >
          <ListFilter className="h-3.5 w-3.5" /> Delivery Logs
        </Link>
        <Link
          href="/dashboard/admin/email/templates"
          className="px-3.5 py-1.5 rounded-lg text-xs font-semibold text-muted hover:text-white hover:bg-card-border/30 transition flex items-center gap-1.5"
        >
          <Layers className="h-3.5 w-3.5" /> Templates
        </Link>
        <Link
          href="/dashboard/admin/email/settings"
          className="px-3.5 py-1.5 rounded-lg text-xs font-semibold text-muted hover:text-white hover:bg-card-border/30 transition flex items-center gap-1.5"
        >
          <Settings className="h-3.5 w-3.5" /> Provider Settings
        </Link>
      </div>

      {/* Provider Status Banner */}
      <div className="rounded-2xl bg-[#0E1422] border border-card-border p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-xl">
        <div className="flex items-center gap-3.5">
          <div className="h-11 w-11 rounded-xl bg-gradient-to-tr from-amber-500/20 to-orange-500/20 border border-amber-500/30 flex items-center justify-center text-amber-300">
            <Mail className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold text-white">Active Provider: {provider?.type || 'CONSOLE_DEV'}</span>
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                provider?.status === 'CONNECTED'
                  ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30'
                  : 'bg-amber-500/15 text-amber-300 border border-amber-500/30'
              }`}>
                {provider?.status || 'CONNECTED'}
              </span>
            </div>
            <p className="text-xs text-muted mt-0.5">
              Sender: <span className="font-mono text-white/90">{provider?.from_name} &lt;{provider?.from_address}&gt;</span>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/dashboard/admin/email/settings"
            className="px-3 py-1.5 rounded-lg bg-card-border/40 hover:bg-card-border text-xs font-medium text-white transition flex items-center gap-1.5"
          >
            <Settings className="h-3.5 w-3.5" /> Manage Provider
          </Link>
          <Link
            href="/dashboard/admin/email/templates"
            className="px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-600 text-xs font-semibold text-black transition flex items-center gap-1.5 shadow-md shadow-amber-500/20"
          >
            <Send className="h-3.5 w-3.5" /> Test Dispatch
          </Link>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="rounded-2xl bg-[#0E1422] border border-card-border p-4.5 space-y-2 shadow-lg">
          <div className="flex items-center justify-between text-muted">
            <span className="text-xs font-medium uppercase tracking-wider">Total Dispatches</span>
            <Send className="h-4 w-4 text-blue-400" />
          </div>
          <div className="text-2xl font-black text-white">{totals?.total_emails ?? 0}</div>
          <div className="text-[11px] text-muted">All recorded email jobs</div>
        </div>

        <div className="rounded-2xl bg-[#0E1422] border border-card-border p-4.5 space-y-2 shadow-lg">
          <div className="flex items-center justify-between text-muted">
            <span className="text-xs font-medium uppercase tracking-wider">Delivery Rate</span>
            <CheckCircle2 className="h-4 w-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-black text-emerald-400">{totals?.delivery_rate_pct ?? 100}%</div>
          <div className="text-[11px] text-emerald-500/80">Successful sends & deliveries</div>
        </div>

        <div className="rounded-2xl bg-[#0E1422] border border-card-border p-4.5 space-y-2 shadow-lg">
          <div className="flex items-center justify-between text-muted">
            <span className="text-xs font-medium uppercase tracking-wider">Failure Rate</span>
            <AlertCircle className="h-4 w-4 text-rose-400" />
          </div>
          <div className="text-2xl font-black text-rose-400">{totals?.failure_rate_pct ?? 0}%</div>
          <div className="text-[11px] text-rose-400/80">{totals?.failed ?? 0} failed dispatches</div>
        </div>

        <div className="rounded-2xl bg-[#0E1422] border border-card-border p-4.5 space-y-2 shadow-lg">
          <div className="flex items-center justify-between text-muted">
            <span className="text-xs font-medium uppercase tracking-wider">Bounce Rate</span>
            <TrendingUp className="h-4 w-4 text-amber-400" />
          </div>
          <div className="text-2xl font-black text-amber-400">{totals?.bounce_rate_pct ?? 0}%</div>
          <div className="text-[11px] text-muted">{totals?.bounced ?? 0} hard bounces recorded</div>
        </div>

        <div className="rounded-2xl bg-[#0E1422] border border-card-border p-4.5 space-y-2 shadow-lg">
          <div className="flex items-center justify-between text-muted">
            <span className="text-xs font-medium uppercase tracking-wider">Queue Depth</span>
            <Clock className="h-4 w-4 text-indigo-400" />
          </div>
          <div className="text-2xl font-black text-white">{totals?.queue_depth ?? 0}</div>
          <div className="text-[11px] text-muted">Queued + In processing</div>
        </div>
      </div>

      {/* Recent Dispatches & Activity */}
      <div className="rounded-2xl bg-[#0E1422] border border-card-border p-5 space-y-4 shadow-xl">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold text-white tracking-tight flex items-center gap-2">
            <Clock className="h-4 w-4 text-amber-400" /> Recent Email Dispatches
          </h2>
          <Link
            href="/dashboard/admin/email/logs"
            className="text-xs font-semibold text-amber-400 hover:text-amber-300 flex items-center gap-1"
          >
            View All Logs <ExternalLink className="h-3 w-3" />
          </Link>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-muted">
            <thead className="bg-[#080C14] text-[11px] uppercase tracking-wider text-muted/70 border-b border-card-border">
              <tr>
                <th className="py-2.5 px-3">Recipient</th>
                <th className="py-2.5 px-3">Template / Event</th>
                <th className="py-2.5 px-3">Subject</th>
                <th className="py-2.5 px-3">Studio</th>
                <th className="py-2.5 px-3">Status</th>
                <th className="py-2.5 px-3">Time</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-card-border/40">
              {(!data?.recent_activity || data.recent_activity.length === 0) ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-muted">
                    No recent email dispatches recorded yet.
                  </td>
                </tr>
              ) : (
                data.recent_activity.map((item) => (
                  <tr key={item.id} className="hover:bg-card-border/10 transition">
                    <td className="py-2.5 px-3 font-mono text-white/90">
                      {item.recipient}
                    </td>
                    <td className="py-2.5 px-3">
                      <span className="px-2 py-0.5 rounded bg-card-border/40 text-[10px] font-mono text-amber-300">
                        {item.template_key}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-white max-w-[200px] truncate">
                      {item.subject}
                    </td>
                    <td className="py-2.5 px-3 text-muted">
                      {item.studio_name || 'System'}
                    </td>
                    <td className="py-2.5 px-3">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                        item.status === 'SENT' || item.status === 'DELIVERED'
                          ? 'bg-emerald-500/15 text-emerald-300'
                          : item.status === 'FAILED'
                          ? 'bg-red-500/15 text-red-300'
                          : item.status === 'BOUNCED'
                          ? 'bg-amber-500/15 text-amber-300'
                          : 'bg-blue-500/15 text-blue-300'
                      }`}>
                        {item.status}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-muted">
                      {new Date(item.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
