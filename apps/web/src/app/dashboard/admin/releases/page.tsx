'use client';

import React, { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import {
  Rocket,
  Flag,
  Settings,
  GitPullRequest,
  Activity,
  AlertTriangle,
  Layers,
  RefreshCw,
  ShieldCheck,
  ArrowUpRight,
  CheckCircle2,
  XCircle,
  Clock,
  Zap,
  Sliders,
  ShieldAlert,
} from 'lucide-react';
import { ReleaseOverviewMetricsDTO } from '@pixmatch/types';

function ReleaseCommandCenterContent() {
  const [metrics, setMetrics] = useState<ReleaseOverviewMetricsDTO | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);

  const fetchData = async () => {
    try {
      setRefreshing(true);
      const res = await fetch('/api/admin/releases/overview');
      if (res.ok) {
        const d = await res.json();
        if (d.success) setMetrics(d.data);
      }
    } catch (e) {
      console.error('Failed to load release overview:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  return (
    <div className="p-6 md:p-8 space-y-8 bg-[#0B0F17] min-h-screen text-slate-100">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-card-border/80 pb-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-semibold tracking-wider uppercase bg-amber-500/10 text-amber-400 border border-amber-500/20">
              Release Management 2.0
            </span>
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-semibold tracking-wider uppercase bg-blue-500/10 text-blue-400 border border-blue-500/20">
              Deterministic Bucketing & Two-Person Approval
            </span>
          </div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-white flex items-center gap-2.5">
            <Rocket className="h-8 w-8 text-amber-400" />
            Release & Platform Configuration Control Center
          </h1>
          <p className="text-slate-400 text-sm mt-1">
            Governed feature flag rollouts, validated dynamic configurations, multi-environment drift detection, and guarded progressive releases.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={fetchData}
            disabled={refreshing}
            className="flex items-center gap-2 px-3.5 py-2 rounded-lg bg-card-border/30 hover:bg-card-border/60 border border-card-border text-xs font-semibold text-slate-200 transition disabled:opacity-50"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? 'animate-spin' : ''}`} />
            <span>Refresh Telemetry</span>
          </button>
          <Link
            href="/dashboard/admin/releases/changes"
            className="flex items-center gap-2 px-3.5 py-2 rounded-lg bg-amber-500 hover:bg-amber-600 text-slate-950 text-xs font-bold transition shadow-md shadow-amber-500/20"
          >
            <GitPullRequest className="h-3.5 w-3.5" />
            <span>Change Requests</span>
          </Link>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-5 rounded-xl bg-[#0F1623] border border-card-border/60 hover:border-amber-500/40 transition">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Active Feature Flags</span>
            <Flag className="h-4 w-4 text-amber-400" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold text-white">{metrics?.activeFeatureFlags ?? '--'}</span>
            <span className="text-xs text-slate-400">/ {metrics?.totalFeatureFlags ?? '--'} total</span>
          </div>
          <div className="mt-3 flex items-center justify-between text-[11px] text-slate-400 pt-2 border-t border-card-border/40">
            <span>Rollout & Targeting</span>
            <Link href="/dashboard/admin/releases/feature-flags" className="text-amber-400 hover:underline flex items-center gap-0.5">
              Manage <ArrowUpRight className="h-3 w-3" />
            </Link>
          </div>
        </div>

        <div className="p-5 rounded-xl bg-[#0F1623] border border-card-border/60 hover:border-blue-500/40 transition">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Dynamic Configurations</span>
            <Settings className="h-4 w-4 text-blue-400" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold text-white">{metrics?.totalConfigurations ?? '--'}</span>
            <span className="text-xs text-slate-400">managed keys</span>
          </div>
          <div className="mt-3 flex items-center justify-between text-[11px] text-slate-400 pt-2 border-t border-card-border/40">
            <span>Secret-Redacted</span>
            <Link href="/dashboard/admin/releases/configuration" className="text-blue-400 hover:underline flex items-center gap-0.5">
              Inspect <ArrowUpRight className="h-3 w-3" />
            </Link>
          </div>
        </div>

        <div className="p-5 rounded-xl bg-[#0F1623] border border-card-border/60 hover:border-purple-500/40 transition">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Pending Approvals</span>
            <GitPullRequest className="h-4 w-4 text-purple-400" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold text-white">{metrics?.pendingChangeRequests ?? 0}</span>
            <span className="text-xs text-purple-400 font-medium">awaiting review</span>
          </div>
          <div className="mt-3 flex items-center justify-between text-[11px] text-slate-400 pt-2 border-t border-card-border/40">
            <span>Separation of Duties</span>
            <Link href="/dashboard/admin/releases/changes" className="text-purple-400 hover:underline flex items-center gap-0.5">
              Review Queue <ArrowUpRight className="h-3 w-3" />
            </Link>
          </div>
        </div>

        <div className="p-5 rounded-xl bg-[#0F1623] border border-card-border/60 hover:border-emerald-500/40 transition">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Drift & Integrity</span>
            <Layers className="h-4 w-4 text-emerald-400" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold text-emerald-400">
              {metrics?.unresolvedDriftEvents === 0 ? 'SYNCHRONIZED' : `${metrics?.unresolvedDriftEvents ?? 0} DRIFT`}
            </span>
          </div>
          <div className="mt-3 flex items-center justify-between text-[11px] text-slate-400 pt-2 border-t border-card-border/40">
            <span>Dev / Staging / Prod</span>
            <Link href="/dashboard/admin/releases/drift" className="text-emerald-400 hover:underline flex items-center gap-0.5">
              Drift Monitor <ArrowUpRight className="h-3 w-3" />
            </Link>
          </div>
        </div>
      </div>

      {/* Navigation Quick Links Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Link
          href="/dashboard/admin/releases/feature-flags"
          className="p-6 rounded-xl bg-gradient-to-br from-[#0F1623] to-[#121B2B] border border-card-border/80 hover:border-amber-500/40 transition group space-y-3"
        >
          <div className="h-10 w-10 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 group-hover:scale-105 transition">
            <Flag className="h-5 w-5" />
          </div>
          <h3 className="text-lg font-bold text-white group-hover:text-amber-300 transition flex items-center justify-between">
            <span>Feature Flag Catalog</span>
            <ArrowUpRight className="h-4 w-4 text-slate-500 group-hover:text-amber-400" />
          </h3>
          <p className="text-slate-400 text-xs leading-relaxed">
            Deterministic percentage hashing, studio allow/blocklist targeting, subscription plan boundary gates, and instant kill switches.
          </p>
        </Link>

        <Link
          href="/dashboard/admin/releases/configuration"
          className="p-6 rounded-xl bg-gradient-to-br from-[#0F1623] to-[#121B2B] border border-card-border/80 hover:border-blue-500/40 transition group space-y-3"
        >
          <div className="h-10 w-10 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400 group-hover:scale-105 transition">
            <Sliders className="h-5 w-5" />
          </div>
          <h3 className="text-lg font-bold text-white group-hover:text-blue-300 transition flex items-center justify-between">
            <span>Platform Configuration</span>
            <ArrowUpRight className="h-4 w-4 text-slate-500 group-hover:text-blue-400" />
          </h3>
          <p className="text-slate-400 text-xs leading-relaxed">
            Strict secret separation, schema validation, non-destructive version snapshots, and deterministic diff calculation.
          </p>
        </Link>

        <Link
          href="/dashboard/admin/releases/health"
          className="p-6 rounded-xl bg-gradient-to-br from-[#0F1623] to-[#121B2B] border border-card-border/80 hover:border-emerald-500/40 transition group space-y-3"
        >
          <div className="h-10 w-10 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 group-hover:scale-105 transition">
            <Activity className="h-5 w-5" />
          </div>
          <h3 className="text-lg font-bold text-white group-hover:text-emerald-300 transition flex items-center justify-between">
            <span>Release Health & SLOs</span>
            <ArrowUpRight className="h-4 w-4 text-slate-500 group-hover:text-emerald-400" />
          </h3>
          <p className="text-slate-400 text-xs leading-relaxed">
            Automated health evaluations, error-budget integration, pre-release impact analysis, and single-click guarded rollback.
          </p>
        </Link>
      </div>

      {/* Active Releases & Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="p-6 rounded-xl bg-[#0F1623] border border-card-border/70 space-y-4">
          <div className="flex items-center justify-between border-b border-card-border/50 pb-3">
            <h3 className="font-bold text-white text-sm flex items-center gap-2">
              <Rocket className="h-4 w-4 text-amber-400" />
              Active Releases & Deployments
            </h3>
            <span className="text-xs text-slate-400">{metrics?.activeReleases ?? 0} active</span>
          </div>

          <div className="space-y-3 text-xs">
            <div className="p-3 rounded-lg bg-[#0B0F17] border border-card-border/50 flex items-center justify-between">
              <div>
                <p className="font-semibold text-white">Production Release v2.45.0</p>
                <p className="text-slate-400 text-[11px]">PROD • Progressive Rollout (25%)</p>
              </div>
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                HEALTHY
              </span>
            </div>

            <div className="p-3 rounded-lg bg-[#0B0F17] border border-card-border/50 flex items-center justify-between">
              <div>
                <p className="font-semibold text-white">Staging Candidate v2.46.0-rc1</p>
                <p className="text-slate-400 text-[11px]">STAGING • Soak Testing</p>
              </div>
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-500/10 text-blue-400 border border-blue-500/20">
                IN PROGRESS
              </span>
            </div>
          </div>
        </div>

        <div className="p-6 rounded-xl bg-[#0F1623] border border-card-border/70 space-y-4">
          <div className="flex items-center justify-between border-b border-card-border/50 pb-3">
            <h3 className="font-bold text-white text-sm flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-purple-400" />
              Governance & Safety Rules
            </h3>
            <span className="text-xs text-purple-400 font-mono">SOC2 COMPLIANT</span>
          </div>

          <ul className="space-y-2.5 text-xs text-slate-300">
            <li className="flex items-start gap-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-400 flex-shrink-0 mt-0.5" />
              <span><strong>Separation of Duties:</strong> Requesters cannot self-approve their own changes.</span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-400 flex-shrink-0 mt-0.5" />
              <span><strong>Two-Person Approval:</strong> Critical risk mutations require dual authorized sign-offs.</span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-400 flex-shrink-0 mt-0.5" />
              <span><strong>Deterministic Rollouts:</strong> SHA-256 subject bucketing with zero random client drift.</span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-400 flex-shrink-0 mt-0.5" />
              <span><strong>Plan Boundaries:</strong> Feature flags cannot unlock features above tenant subscription tiers.</span>
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}

export default function ReleaseCommandCenterPage() {
  return (
    <Suspense fallback={<div className="p-8 text-slate-400">Loading Release Control Center...</div>}>
      <ReleaseCommandCenterContent />
    </Suspense>
  );
}
