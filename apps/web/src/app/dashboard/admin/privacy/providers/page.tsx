'use client';

import React, { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import {
  Globe,
  ArrowLeft,
  Building2,
  ShieldCheck,
  RefreshCw,
  ExternalLink,
  CheckCircle2,
} from 'lucide-react';
import { ThirdPartyProviderMapDTO } from '@pixmatch/types';

function ProvidersContent() {
  const [providers, setProviders] = useState<ThirdPartyProviderMapDTO[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  const fetchProviders = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/admin/privacy/providers');
      if (res.ok) {
        const d = await res.json();
        if (d.success) setProviders(d.data || []);
      }
    } catch (e) {
      console.error('Failed to load providers:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProviders();
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
            <Globe className="h-7 w-7 text-cyan-400" />
            Third-Party Subprocessors & Vendor Inventory
          </h1>
          <p className="text-slate-400 text-xs mt-1">
            Data Processing Agreements (DPAs), cross-border transfer mechanisms, and subprocessor compliance tracking.
          </p>
        </div>

        <button
          onClick={fetchProviders}
          className="flex items-center gap-2 px-3.5 py-2 rounded-lg bg-card-bg border border-card-border hover:bg-slate-800 text-slate-300 text-xs font-medium transition-colors"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin text-cyan-400' : ''}`} />
          Refresh
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {providers.map((p) => (
          <div key={p.id} className="p-5 rounded-xl bg-card-bg border border-card-border hover:border-cyan-500/40 transition-all space-y-4">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-sm font-bold text-white">{p.name}</h3>
                <span className="text-[11px] text-cyan-400 font-medium">{p.category}</span>
              </div>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                {p.dpaStatus}
              </span>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              {p.purpose}
            </p>

            <div className="space-y-2 pt-2 border-t border-slate-800 text-[11px]">
              <div className="flex justify-between">
                <span className="text-slate-400">Residency:</span>
                <span className="text-slate-200">{p.countryOrRegion}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Mechanism:</span>
                <span className="text-slate-200 max-w-[180px] text-right truncate">{p.transferMechanism}</span>
              </div>
            </div>

            <div className="pt-2 border-t border-slate-800">
              <span className="text-[10px] text-slate-400 block mb-1.5 font-semibold">Certifications:</span>
              <div className="flex flex-wrap gap-1">
                {p.securityCertifications.map((c, i) => (
                  <span key={i} className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 text-[10px]">
                    {c}
                  </span>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function ProvidersPage() {
  return (
    <Suspense fallback={<div className="p-8 text-slate-400">Loading Subprocessors...</div>}>
      <ProvidersContent />
    </Suspense>
  );
}
