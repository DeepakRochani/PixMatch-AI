'use client';

import React, { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import {
  ShieldCheck,
  ShieldAlert,
  Database,
  Layers,
  Activity,
  UserCheck,
  AlertTriangle,
  Sparkles,
  RefreshCw,
  ArrowUpRight,
  Lock,
  Globe,
  FileText,
  Trash2,
  Clock,
  CheckCircle2,
  XCircle,
} from 'lucide-react';
import { PrivacyOverviewMetricsDTO } from '@pixmatch/types';

function PrivacyCenterOverviewContent() {
  const [metrics, setMetrics] = useState<PrivacyOverviewMetricsDTO | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);

  const fetchData = async () => {
    try {
      setRefreshing(true);
      const res = await fetch('/api/admin/privacy/overview');
      if (res.ok) {
        const d = await res.json();
        if (d.success) setMetrics(d.data);
      }
    } catch (e) {
      console.error('Failed to load privacy overview:', e);
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
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-semibold tracking-wider uppercase bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              Governance 2.0
            </span>
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-semibold tracking-wider uppercase bg-blue-500/10 text-blue-400 border border-blue-500/20">
              Zero Vector Exposure
            </span>
          </div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-white flex items-center gap-2.5">
            <ShieldCheck className="h-8 w-8 text-emerald-400" />
            Platform Data Governance & Privacy Center
          </h1>
          <p className="text-slate-400 text-sm mt-1">
            Canonical data classifications, statutory retention schedules, Subject Access Requests, and biometric AI safeguards.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={fetchData}
            disabled={refreshing}
            className="flex items-center gap-2 px-3.5 py-2 rounded-lg bg-card-bg border border-card-border hover:bg-slate-800 text-slate-300 text-xs font-medium transition-colors"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? 'animate-spin text-emerald-400' : ''}`} />
            Refresh
          </button>
          <Link
            href="/dashboard/admin/privacy/requests"
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-semibold shadow-lg shadow-emerald-500/20 transition-all"
          >
            <UserCheck className="h-4 w-4" />
            View Privacy Requests
          </Link>
        </div>
      </div>

      {/* Primary KPI Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <div className="p-5 rounded-xl bg-card-bg border border-card-border/80 relative overflow-hidden group hover:border-emerald-500/40 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400">Total Data Assets</span>
            <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400">
              <Database className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-4 flex items-baseline gap-2">
            <span className="text-3xl font-bold text-white tracking-tight">
              {loading ? '...' : metrics?.totalDataAssets ?? 30}
            </span>
            <span className="text-xs text-emerald-400 font-medium">100% Cataloged</span>
          </div>
          <p className="text-[11px] text-slate-400 mt-2">
            {metrics?.personalDataAssetsCount ?? 14} personal • {metrics?.sensitivePersonalDataAssetsCount ?? 4} sensitive • {metrics?.biometricDataAssetsCount ?? 2} biometric
          </p>
        </div>

        <div className="p-5 rounded-xl bg-card-bg border border-card-border/80 relative overflow-hidden group hover:border-blue-500/40 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400">Active Privacy Requests</span>
            <div className="p-2 rounded-lg bg-blue-500/10 text-blue-400">
              <UserCheck className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-4 flex items-baseline gap-2">
            <span className="text-3xl font-bold text-white tracking-tight">
              {loading ? '...' : metrics?.pendingPrivacyRequests ?? 0}
            </span>
            <span className="text-xs text-slate-400 font-medium">
              / {metrics?.totalPrivacyRequests ?? 0} Total
            </span>
          </div>
          <p className="text-[11px] text-slate-400 mt-2">
            {metrics?.completedPrivacyRequests ?? 0} fulfilled • {metrics?.rejectedPrivacyRequests ?? 0} rejected
          </p>
        </div>

        <div className="p-5 rounded-xl bg-card-bg border border-card-border/80 relative overflow-hidden group hover:border-amber-500/40 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400">Active Legal Holds</span>
            <div className="p-2 rounded-lg bg-amber-500/10 text-amber-400">
              <ShieldAlert className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-4 flex items-baseline gap-2">
            <span className="text-3xl font-bold text-white tracking-tight">
              {loading ? '...' : metrics?.activeLegalHolds ?? 0}
            </span>
            <span className="text-xs text-amber-400 font-medium">Preservation Active</span>
          </div>
          <p className="text-[11px] text-slate-400 mt-2">
            Protected against automated retention purge
          </p>
        </div>

        <div className="p-5 rounded-xl bg-card-bg border border-card-border/80 relative overflow-hidden group hover:border-purple-500/40 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400">Retention Policies</span>
            <div className="p-2 rounded-lg bg-purple-500/10 text-purple-400">
              <Activity className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-4 flex items-baseline gap-2">
            <span className="text-3xl font-bold text-white tracking-tight">
              {loading ? '...' : metrics?.activeRetentionPolicies ?? 5}
            </span>
            <span className="text-xs text-purple-400 font-medium">Automated Rules</span>
          </div>
          <p className="text-[11px] text-slate-400 mt-2">
            {metrics?.completedDeletionsCount ?? 0} executed deletions audited
          </p>
        </div>
      </div>

      {/* Navigation Quick Access Modules */}
      <div>
        <h2 className="text-base font-semibold text-white mb-4 flex items-center gap-2">
          <Layers className="h-4 w-4 text-emerald-400" />
          Governance & Compliance Subsystems
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <Link
            href="/dashboard/admin/privacy/data-inventory"
            className="p-4 rounded-xl bg-card-bg border border-card-border hover:border-emerald-500/50 hover:bg-slate-800/60 transition-all group"
          >
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-lg bg-emerald-500/10 text-emerald-400 group-hover:scale-105 transition-transform">
                  <Database className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-white group-hover:text-emerald-400 transition-colors">
                    Data Inventory & Catalog
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    30+ canonical assets, classifications & sensitivity tags
                  </p>
                </div>
              </div>
              <ArrowUpRight className="h-4 w-4 text-slate-400 group-hover:text-emerald-400 transition-colors" />
            </div>
          </Link>

          <Link
            href="/dashboard/admin/privacy/lineage"
            className="p-4 rounded-xl bg-card-bg border border-card-border hover:border-emerald-500/50 hover:bg-slate-800/60 transition-all group"
          >
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-lg bg-blue-500/10 text-blue-400 group-hover:scale-105 transition-transform">
                  <Layers className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-white group-hover:text-blue-400 transition-colors">
                    Data Lineage & Flow Graph
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Ingest to storage, AI embedding transformations & GL sync
                  </p>
                </div>
              </div>
              <ArrowUpRight className="h-4 w-4 text-slate-400 group-hover:text-blue-400 transition-colors" />
            </div>
          </Link>

          <Link
            href="/dashboard/admin/privacy/retention"
            className="p-4 rounded-xl bg-card-bg border border-card-border hover:border-emerald-500/50 hover:bg-slate-800/60 transition-all group"
          >
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-lg bg-purple-500/10 text-purple-400 group-hover:scale-105 transition-transform">
                  <Clock className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-white group-hover:text-purple-400 transition-colors">
                    Retention & Expiration
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Statutory 7yr financial rules, biometric 365d TTL & log purges
                  </p>
                </div>
              </div>
              <ArrowUpRight className="h-4 w-4 text-slate-400 group-hover:text-purple-400 transition-colors" />
            </div>
          </Link>

          <Link
            href="/dashboard/admin/privacy/requests"
            className="p-4 rounded-xl bg-card-bg border border-card-border hover:border-emerald-500/50 hover:bg-slate-800/60 transition-all group"
          >
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-lg bg-teal-500/10 text-teal-400 group-hover:scale-105 transition-transform">
                  <UserCheck className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-white group-hover:text-teal-400 transition-colors">
                    Privacy & SAR Requests
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Subject access, deletion, rectification & identity verification
                  </p>
                </div>
              </div>
              <ArrowUpRight className="h-4 w-4 text-slate-400 group-hover:text-teal-400 transition-colors" />
            </div>
          </Link>

          <Link
            href="/dashboard/admin/privacy/exports"
            className="p-4 rounded-xl bg-card-bg border border-card-border hover:border-emerald-500/50 hover:bg-slate-800/60 transition-all group"
          >
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-lg bg-sky-500/10 text-sky-400 group-hover:scale-105 transition-transform">
                  <FileText className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-white group-hover:text-sky-400 transition-colors">
                    SAR Export Packages
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Formula-sanitized CSV & JSON packages with token hashing
                  </p>
                </div>
              </div>
              <ArrowUpRight className="h-4 w-4 text-slate-400 group-hover:text-sky-400 transition-colors" />
            </div>
          </Link>

          <Link
            href="/dashboard/admin/privacy/deletion"
            className="p-4 rounded-xl bg-card-bg border border-card-border hover:border-emerald-500/50 hover:bg-slate-800/60 transition-all group"
          >
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-lg bg-rose-500/10 text-rose-400 group-hover:scale-105 transition-transform">
                  <Trash2 className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-white group-hover:text-rose-400 transition-colors">
                    Deletion Console
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Dependency preview, human approval gate & certificates
                  </p>
                </div>
              </div>
              <ArrowUpRight className="h-4 w-4 text-slate-400 group-hover:text-rose-400 transition-colors" />
            </div>
          </Link>

          <Link
            href="/dashboard/admin/privacy/legal-holds"
            className="p-4 rounded-xl bg-card-bg border border-card-border hover:border-emerald-500/50 hover:bg-slate-800/60 transition-all group"
          >
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-lg bg-amber-500/10 text-amber-400 group-hover:scale-105 transition-transform">
                  <Lock className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-white group-hover:text-amber-400 transition-colors">
                    Legal Holds Manager
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Litigation preservation, custodian tracking & release log
                  </p>
                </div>
              </div>
              <ArrowUpRight className="h-4 w-4 text-slate-400 group-hover:text-amber-400 transition-colors" />
            </div>
          </Link>

          <Link
            href="/dashboard/admin/privacy/access-reviews"
            className="p-4 rounded-xl bg-card-bg border border-card-border hover:border-emerald-500/50 hover:bg-slate-800/60 transition-all group"
          >
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-lg bg-indigo-500/10 text-indigo-400 group-hover:scale-105 transition-transform">
                  <CheckCircle2 className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-white group-hover:text-indigo-400 transition-colors">
                    Periodic Access Reviews
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Quarterly privilege audits, findings & revocation tracking
                  </p>
                </div>
              </div>
              <ArrowUpRight className="h-4 w-4 text-slate-400 group-hover:text-indigo-400 transition-colors" />
            </div>
          </Link>

          <Link
            href="/dashboard/admin/privacy/providers"
            className="p-4 rounded-xl bg-card-bg border border-card-border hover:border-emerald-500/50 hover:bg-slate-800/60 transition-all group"
          >
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-lg bg-cyan-500/10 text-cyan-400 group-hover:scale-105 transition-transform">
                  <Globe className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-white group-hover:text-cyan-400 transition-colors">
                    Subprocessors & Providers
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Stripe, Cloudflare, Sentry, AWS & external storage DPAs
                  </p>
                </div>
              </div>
              <ArrowUpRight className="h-4 w-4 text-slate-400 group-hover:text-cyan-400 transition-colors" />
            </div>
          </Link>

          <Link
            href="/dashboard/admin/privacy/biometrics"
            className="p-4 rounded-xl bg-card-bg border border-card-border hover:border-emerald-500/50 hover:bg-slate-800/60 transition-all group"
          >
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-lg bg-pink-500/10 text-pink-400 group-hover:scale-105 transition-transform">
                  <Sparkles className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-white group-hover:text-pink-400 transition-colors">
                    Biometrics & AI Face Search
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Zero vector exposure verification & consent guardrails
                  </p>
                </div>
              </div>
              <ArrowUpRight className="h-4 w-4 text-slate-400 group-hover:text-pink-400 transition-colors" />
            </div>
          </Link>

          <Link
            href="/dashboard/admin/privacy/consent"
            className="p-4 rounded-xl bg-card-bg border border-card-border hover:border-emerald-500/50 hover:bg-slate-800/60 transition-all group"
          >
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-lg bg-emerald-500/10 text-emerald-400 group-hover:scale-105 transition-transform">
                  <ShieldCheck className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-white group-hover:text-emerald-400 transition-colors">
                    Privacy Consent Ledger
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Immutable logs of granted & revoked biometric/cookie consents
                  </p>
                </div>
              </div>
              <ArrowUpRight className="h-4 w-4 text-slate-400 group-hover:text-emerald-400 transition-colors" />
            </div>
          </Link>
        </div>
      </div>

      {/* Statutory Legal & Security Notice */}
      <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 text-xs text-slate-400 leading-relaxed">
        <p className="font-semibold text-slate-300 mb-1 flex items-center gap-1.5">
          <ShieldAlert className="h-4 w-4 text-amber-400" />
          Data Governance Architecture & Statutory Boundary Notice
        </p>
        PixMatch AI provides technical data governance, privacy workflows, and statutory retention engines to assist studios and platform administrators in meeting privacy best practices. These controls enforce strict data minimization, zero vector exposure, and irreversible pseudonymization. PixMatch software does not constitute official legal certification under GDPR, DPDP, SOC 2, ISO 27001, or HIPAA.
      </div>
    </div>
  );
}

export default function PrivacyCenterOverviewPage() {
  return (
    <Suspense fallback={<div className="p-8 text-slate-400">Loading Privacy Center...</div>}>
      <PrivacyCenterOverviewContent />
    </Suspense>
  );
}
