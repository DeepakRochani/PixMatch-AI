'use client';

import React, { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import {
  ShieldCheck,
  ShieldAlert,
  AlertTriangle,
  Flame,
  Zap,
  Activity,
  Lock,
  Download,
  Filter,
  RefreshCw,
  Search,
  ExternalLink,
  CheckCircle2,
  XCircle,
  Eye,
} from 'lucide-react';
import {
  SecurityOverviewMetricsDTO,
  PlatformSecurityEventDTO,
  SecuritySeverity,
  SecurityEventStatus,
} from '@pixmatch/types';

function SecurityCenterContent() {
  const [metrics, setMetrics] = useState<SecurityOverviewMetricsDTO | null>(null);
  const [recentEvents, setRecentEvents] = useState<PlatformSecurityEventDTO[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);

  const fetchData = async () => {
    try {
      setRefreshing(true);
      const [overviewRes, eventsRes] = await Promise.all([
        fetch('/api/admin/security-center/overview'),
        fetch('/api/admin/security-center/events?limit=10'),
      ]);

      if (overviewRes.ok) {
        const d = await overviewRes.json();
        if (d.success) setMetrics(d.data);
      }
      if (eventsRes.ok) {
        const d = await eventsRes.json();
        if (d.success) setRecentEvents(d.data.events || []);
      }
    } catch (e) {
      console.error('Failed to load SOC overview:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const getSeverityBadge = (severity: SecuritySeverity | string) => {
    switch (severity) {
      case 'CRITICAL':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-red-500/20 text-red-400 border border-red-500/30">
            <Flame className="h-3 w-3" /> CRITICAL
          </span>
        );
      case 'HIGH':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-500/20 text-amber-400 border border-amber-500/30">
            <AlertTriangle className="h-3 w-3" /> HIGH
          </span>
        );
      case 'MEDIUM':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-yellow-500/20 text-yellow-400 border border-yellow-500/30">
            MEDIUM
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-blue-500/20 text-blue-400 border border-blue-500/30">
            LOW / INFO
          </span>
        );
    }
  };

  const getStatusBadge = (status: SecurityEventStatus | string) => {
    switch (status) {
      case 'OPEN':
        return (
          <span className="px-2 py-0.5 rounded text-xs font-semibold bg-red-500/10 text-red-400 border border-red-500/20">
            OPEN
          </span>
        );
      case 'INVESTIGATING':
        return (
          <span className="px-2 py-0.5 rounded text-xs font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20">
            INVESTIGATING
          </span>
        );
      case 'RESOLVED':
        return (
          <span className="px-2 py-0.5 rounded text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            RESOLVED
          </span>
        );
      case 'FALSE_POSITIVE':
        return (
          <span className="px-2 py-0.5 rounded text-xs font-semibold bg-gray-500/10 text-gray-400 border border-gray-500/20">
            FALSE POSITIVE
          </span>
        );
      default:
        return (
          <span className="px-2 py-0.5 rounded text-xs font-semibold bg-zinc-700 text-zinc-300">
            {status}
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-card-border/80 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-red-500/10 border border-red-500/30 text-red-400">
              <ShieldCheck className="h-5 w-5" />
            </span>
            <h1 className="text-2xl font-bold tracking-tight text-white">
              Platform Security Operations Center (SOC 2.0)
            </h1>
          </div>
          <p className="text-xs text-muted mt-1">
            Deterministic threat detection, real-time security event ingestion, multi-tenant isolation, and investigation console.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={fetchData}
            disabled={refreshing}
            className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-card-border/60 hover:bg-card-border text-xs font-semibold text-white transition border border-card-border"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? 'animate-spin text-amber-400' : ''}`} />
            Refresh
          </button>
          <Link
            href="/dashboard/admin/security-center/events"
            className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-xs font-semibold text-white transition shadow-lg shadow-red-600/20"
          >
            <ShieldAlert className="h-3.5 w-3.5" />
            View Threat Events
          </Link>
        </div>
      </div>

      {/* Metrics Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
        <div className="p-4 rounded-xl bg-[#0E1422] border border-red-500/30 space-y-1">
          <p className="text-[10px] font-bold text-red-400 uppercase tracking-wider">Open Events</p>
          <p className="text-2xl font-extrabold text-white">
            {loading ? '...' : metrics?.open_events_count ?? 0}
          </p>
        </div>

        <div className="p-4 rounded-xl bg-[#0E1422] border border-amber-500/30 space-y-1">
          <p className="text-[10px] font-bold text-amber-400 uppercase tracking-wider">High Severity</p>
          <p className="text-2xl font-extrabold text-white">
            {loading ? '...' : metrics?.high_severity_count ?? 0}
          </p>
        </div>

        <div className="p-4 rounded-xl bg-[#0E1422] border border-card-border space-y-1">
          <p className="text-[10px] font-bold text-muted uppercase tracking-wider">Critical Events</p>
          <p className="text-2xl font-extrabold text-white">
            {loading ? '...' : metrics?.critical_events_count ?? 0}
          </p>
        </div>

        <div className="p-4 rounded-xl bg-[#0E1422] border border-card-border space-y-1">
          <p className="text-[10px] font-bold text-muted uppercase tracking-wider">Auth Failures</p>
          <p className="text-2xl font-extrabold text-white">
            {loading ? '...' : metrics?.authentication_failures_count ?? 0}
          </p>
        </div>

        <div className="p-4 rounded-xl bg-[#0E1422] border border-card-border space-y-1">
          <p className="text-[10px] font-bold text-muted uppercase tracking-wider">IDOR Denials</p>
          <p className="text-2xl font-extrabold text-white">
            {loading ? '...' : metrics?.authorization_denials_count ?? 0}
          </p>
        </div>

        <div className="p-4 rounded-xl bg-[#0E1422] border border-card-border space-y-1">
          <p className="text-[10px] font-bold text-muted uppercase tracking-wider">Webhook Failures</p>
          <p className="text-2xl font-extrabold text-white">
            {loading ? '...' : metrics?.webhook_failures_count ?? 0}
          </p>
        </div>

        <div className="p-4 rounded-xl bg-[#0E1422] border border-card-border space-y-1">
          <p className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider">Active Rules</p>
          <p className="text-2xl font-extrabold text-white">
            {loading ? '...' : metrics?.enabled_rules_count ?? 24}
          </p>
        </div>
      </div>

      {/* Quick Access Modules */}
      <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <Link
          href="/dashboard/admin/security-center/authentication"
          className="p-3.5 rounded-xl bg-[#0B0F17] hover:bg-[#0E1422] border border-card-border transition flex items-center gap-3 group"
        >
          <div className="h-9 w-9 rounded-lg bg-blue-500/10 border border-blue-500/30 flex items-center justify-center text-blue-400 group-hover:scale-105 transition">
            <Lock className="h-4 w-4" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-white">Auth Security</h4>
            <p className="text-[10px] text-muted">Admin & Studio MFA</p>
          </div>
        </Link>

        <Link
          href="/dashboard/admin/security-center/api"
          className="p-3.5 rounded-xl bg-[#0B0F17] hover:bg-[#0E1422] border border-card-border transition flex items-center gap-3 group"
        >
          <div className="h-9 w-9 rounded-lg bg-purple-500/10 border border-purple-500/30 flex items-center justify-center text-purple-400 group-hover:scale-105 transition">
            <Activity className="h-4 w-4" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-white">API & Rate Limits</h4>
            <p className="text-[10px] text-muted">IDOR & Throttles</p>
          </div>
        </Link>

        <Link
          href="/dashboard/admin/security-center/webhooks"
          className="p-3.5 rounded-xl bg-[#0B0F17] hover:bg-[#0E1422] border border-card-border transition flex items-center gap-3 group"
        >
          <div className="h-9 w-9 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 group-hover:scale-105 transition">
            <Zap className="h-4 w-4" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-white">Webhook Integrity</h4>
            <p className="text-[10px] text-muted">Signatures & Replay</p>
          </div>
        </Link>

        <Link
          href="/dashboard/admin/security-center/investigations"
          className="p-3.5 rounded-xl bg-[#0B0F17] hover:bg-[#0E1422] border border-card-border transition flex items-center gap-3 group"
        >
          <div className="h-9 w-9 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 group-hover:scale-105 transition">
            <AlertTriangle className="h-4 w-4" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-white">Investigations</h4>
            <p className="text-[10px] text-muted">Active Cases & Notes</p>
          </div>
        </Link>

        <Link
          href="/dashboard/admin/security-center/rules"
          className="p-3.5 rounded-xl bg-[#0B0F17] hover:bg-[#0E1422] border border-card-border transition flex items-center gap-3 group"
        >
          <div className="h-9 w-9 rounded-lg bg-rose-500/10 border border-rose-500/30 flex items-center justify-center text-rose-400 group-hover:scale-105 transition">
            <ShieldAlert className="h-4 w-4" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-white">Detection Rules</h4>
            <p className="text-[10px] text-muted">24 Engine Rules</p>
          </div>
        </Link>

        <Link
          href="/dashboard/admin/security-center/timeline"
          className="p-3.5 rounded-xl bg-[#0B0F17] hover:bg-[#0E1422] border border-card-border transition flex items-center gap-3 group"
        >
          <div className="h-9 w-9 rounded-lg bg-teal-500/10 border border-teal-500/30 flex items-center justify-center text-teal-400 group-hover:scale-105 transition">
            <Activity className="h-4 w-4" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-white">Security Timeline</h4>
            <p className="text-[10px] text-muted">Unified Audit Chrono</p>
          </div>
        </Link>
      </div>

      {/* Recent Threat Events */}
      <div className="rounded-2xl bg-[#0B0F17] border border-card-border overflow-hidden">
        <div className="p-4 sm:p-5 border-b border-card-border/80 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShieldAlert className="h-4 w-4 text-red-400" />
            <h3 className="text-sm font-bold text-white">Recent Security Detections</h3>
          </div>
          <Link
            href="/dashboard/admin/security-center/events"
            className="text-xs font-semibold text-amber-400 hover:text-amber-300 flex items-center gap-1 transition"
          >
            View all <ExternalLink className="h-3 w-3" />
          </Link>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#0E1422] border-b border-card-border/80 text-muted uppercase font-semibold text-[10px] tracking-wider">
              <tr>
                <th className="p-3 pl-5">Event Type</th>
                <th className="p-3">Category</th>
                <th className="p-3">Severity</th>
                <th className="p-3">Occurrences</th>
                <th className="p-3">Service</th>
                <th className="p-3">Status</th>
                <th className="p-3">Last Seen</th>
                <th className="p-3 pr-5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-card-border/40 text-foreground">
              {loading ? (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-muted">
                    Loading security event stream...
                  </td>
                </tr>
              ) : recentEvents.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-muted">
                    No open security threats detected. Platform telemetry is nominal.
                  </td>
                </tr>
              ) : (
                recentEvents.map((ev) => (
                  <tr key={ev.id} className="hover:bg-card-border/20 transition">
                    <td className="p-3 pl-5 font-semibold text-white flex items-center gap-2">
                      <span className="font-mono text-xs">{ev.event_type}</span>
                    </td>
                    <td className="p-3 text-muted">{ev.category}</td>
                    <td className="p-3">{getSeverityBadge(ev.severity)}</td>
                    <td className="p-3 font-semibold text-white">{ev.occurrence_count}</td>
                    <td className="p-3 text-muted font-mono">{ev.service}</td>
                    <td className="p-3">{getStatusBadge(ev.status)}</td>
                    <td className="p-3 text-muted text-[11px]">
                      {new Date(ev.last_seen_at).toLocaleTimeString()}
                    </td>
                    <td className="p-3 pr-5 text-right">
                      <Link
                        href={`/dashboard/admin/security-center/events/${ev.id}`}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-card-border/60 hover:bg-card-border text-[11px] font-semibold text-white transition border border-card-border/60"
                      >
                        <Eye className="h-3 w-3" /> Inspect
                      </Link>
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

export default function SecurityCenterPage() {
  return (
    <Suspense
      fallback={
        <div className="p-8 text-center text-muted text-xs">
          Loading Security Center...
        </div>
      }
    >
      <SecurityCenterContent />
    </Suspense>
  );
}
