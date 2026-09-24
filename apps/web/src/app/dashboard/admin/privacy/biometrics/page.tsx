'use client';

import React, { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import {
  Sparkles,
  ArrowLeft,
  ShieldCheck,
  Lock,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  Zap,
} from 'lucide-react';

function BiometricsGovernanceContent() {
  const [data, setData] = useState<any | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  const fetchStatus = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/admin/privacy/biometrics');
      if (res.ok) {
        const d = await res.json();
        if (d.success) setData(d.data);
      }
    } catch (e) {
      console.error('Failed to load biometrics governance status:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStatus();
  }, []);

  return (
    <div className="p-6 md:p-8 space-y-8 bg-[#0B0F17] min-h-screen text-slate-100">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-card-border/80 pb-6">
        <div>
          <Link
            href="/dashboard/admin/privacy"
            className="text-xs text-slate-400 hover:text-emerald-400 flex items-center gap-1 mb-2 transition-colors"
          >
            <ArrowLeft className="h-3 w-3" /> Back to Privacy Center
          </Link>
          <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2.5">
            <Sparkles className="h-7 w-7 text-pink-400" />
            Biometric Data Governance & AI Face Search Safeguards
          </h1>
          <p className="text-slate-400 text-xs mt-1">
            Verification of strict mathematical vector isolation, zero vector exposure, and consent-gated search pipelines.
          </p>
        </div>

        <button
          onClick={fetchStatus}
          className="flex items-center gap-2 px-3.5 py-2 rounded-lg bg-card-bg border border-card-border hover:bg-slate-800 text-slate-300 text-xs font-medium transition-colors"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin text-pink-400' : ''}`} />
          Refresh
        </button>
      </div>

      {/* Guarantee Banner */}
      <div className="p-5 rounded-xl bg-pink-950/20 border border-pink-500/30 flex items-start gap-4">
        <div className="p-2.5 rounded-lg bg-pink-500/10 text-pink-400">
          <ShieldCheck className="h-6 w-6" />
        </div>
        <div className="space-y-1">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            Zero Vector Exposure Architecture Active
          </h3>
          <p className="text-xs text-pink-200/80 leading-relaxed">
            Raw 512-dimensional ArcFace mathematical embeddings are strictly quarantined in internal database vector indexes. They are NEVER returned via API endpoints, exports, client browsers, logs, or AI Copilot tools.
          </p>
        </div>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <div className="p-5 rounded-xl bg-card-bg border border-card-border">
          <span className="text-xs font-medium text-slate-400">Face Vector Index Count</span>
          <div className="mt-3 text-3xl font-bold text-white font-mono">
            {loading ? '...' : data?.activeFaceEncodings ?? 0}
          </div>
          <p className="text-[11px] text-pink-400 mt-1">pgvector Isolated</p>
        </div>

        <div className="p-5 rounded-xl bg-card-bg border border-card-border">
          <span className="text-xs font-medium text-slate-400">Registered Reference Selfies</span>
          <div className="mt-3 text-3xl font-bold text-white font-mono">
            {loading ? '...' : data?.registeredSelfies ?? 0}
          </div>
          <p className="text-[11px] text-slate-400 mt-1">Encrypted at rest</p>
        </div>

        <div className="p-5 rounded-xl bg-card-bg border border-card-border">
          <span className="text-xs font-medium text-slate-400">Active Biometric Consents</span>
          <div className="mt-3 text-3xl font-bold text-emerald-400 font-mono">
            {loading ? '...' : data?.consentActiveCount ?? 0}
          </div>
          <p className="text-[11px] text-slate-400 mt-1">Gated search authorization</p>
        </div>

        <div className="p-5 rounded-xl bg-card-bg border border-card-border">
          <span className="text-xs font-medium text-slate-400">Vector Purge TTL</span>
          <div className="mt-3 text-3xl font-bold text-purple-400 font-mono">
            {loading ? '...' : data?.vectorPurgePolicyDays ?? 365} Days
          </div>
          <p className="text-[11px] text-slate-400 mt-1">Auto-expiration rule</p>
        </div>
      </div>

      {/* Security Controls */}
      <div className="p-5 rounded-xl bg-card-bg border border-card-border space-y-3">
        <h3 className="text-xs font-bold text-white uppercase tracking-wider">
          Enforced Technical Safeguards
        </h3>
        <ul className="space-y-2 text-xs text-slate-300">
          {(data?.securityControls || [
            'Isolated vector storage in pgvector / Postgres',
            'AES-256 encryption at rest',
            'Zero vector embedding output in UI, API, exports, and Copilot tools',
            'Strict cascade purge upon client/user deletion or consent revocation',
            'Explicit legal basis: Explicit User Consent',
          ]).map((ctrl: string, i: number) => (
            <li key={i} className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
              <span>{ctrl}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

export default function BiometricsPage() {
  return (
    <Suspense fallback={<div className="p-8 text-slate-400">Loading Biometrics Governance...</div>}>
      <BiometricsGovernanceContent />
    </Suspense>
  );
}
