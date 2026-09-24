'use client';

import React, { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import {
  ShieldCheck,
  ArrowLeft,
  RefreshCw,
  Search,
  Filter,
  CheckCircle2,
  XCircle,
  Clock,
} from 'lucide-react';
import { PrivacyConsentRecordDTO, ConsentStatus } from '@pixmatch/types';

function ConsentLedgerContent() {
  const [consents, setConsents] = useState<PrivacyConsentRecordDTO[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [typeFilter, setTypeFilter] = useState<string>('ALL');

  const fetchConsents = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (typeFilter !== 'ALL') params.append('consentType', typeFilter);

      const res = await fetch(`/api/admin/privacy/consents?${params.toString()}`);
      if (res.ok) {
        const d = await res.json();
        if (d.success) setConsents(d.data || []);
      }
    } catch (e) {
      console.error('Failed to load consents:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchConsents();
  }, [typeFilter]);

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
            <ShieldCheck className="h-7 w-7 text-emerald-400" />
            Privacy & Biometric Consent Ledger
          </h1>
          <p className="text-slate-400 text-xs mt-1">
            Immutable audit records of user and client granted and revoked privacy authorizations.
          </p>
        </div>

        <button
          onClick={fetchConsents}
          className="flex items-center gap-2 px-3.5 py-2 rounded-lg bg-card-bg border border-card-border hover:bg-slate-800 text-slate-300 text-xs font-medium transition-colors"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin text-emerald-400' : ''}`} />
          Refresh
        </button>
      </div>

      {/* Consents Table */}
      <div className="rounded-xl bg-card-bg border border-card-border/80 overflow-hidden">
        <div className="p-4 bg-slate-900/80 border-b border-card-border flex items-center justify-between">
          <h2 className="text-xs font-bold text-white uppercase tracking-wider">
            Consent Events ({consents.length})
          </h2>
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-400">Filter Type:</span>
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1 text-xs text-slate-200"
            >
              <option value="ALL">All Types</option>
              <option value="BIOMETRIC_FACE_SEARCH">BIOMETRIC_FACE_SEARCH</option>
              <option value="MARKETING_COMMUNICATIONS">MARKETING_COMMUNICATIONS</option>
              <option value="ESSENTIAL_COOKIES">ESSENTIAL_COOKIES</option>
            </select>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-900/60 border-b border-card-border text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
              <tr>
                <th className="px-4 py-3.5">Consent Type</th>
                <th className="px-4 py-3.5">Status</th>
                <th className="px-4 py-3.5">Purpose</th>
                <th className="px-4 py-3.5">Policy Version</th>
                <th className="px-4 py-3.5">Consented At</th>
                <th className="px-4 py-3.5">Revoked At</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-mono">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center text-slate-400 font-sans">
                    Loading consent events...
                  </td>
                </tr>
              ) : consents.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center text-slate-400 font-sans">
                    No consent events recorded.
                  </td>
                </tr>
              ) : consents.map((c) => (
                <tr key={c.id} className="hover:bg-slate-800/40 transition-colors">
                  <td className="px-4 py-3.5 font-bold text-white">
                    {c.consentType}
                  </td>
                  <td className="px-4 py-3.5">
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase border ${
                        c.status === ConsentStatus.GRANTED
                          ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                          : 'bg-red-500/10 text-red-400 border-red-500/20'
                      }`}
                    >
                      {c.status}
                    </span>
                  </td>
                  <td className="px-4 py-3.5 font-sans text-slate-300">
                    {c.purpose}
                  </td>
                  <td className="px-4 py-3.5 text-slate-400">
                    v{c.version}
                  </td>
                  <td className="px-4 py-3.5 text-slate-400 font-sans text-[11px]">
                    {new Date(c.consentedAt).toLocaleString()}
                  </td>
                  <td className="px-4 py-3.5 text-slate-400 font-sans text-[11px]">
                    {c.revokedAt ? new Date(c.revokedAt).toLocaleString() : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export default function ConsentLedgerPage() {
  return (
    <Suspense fallback={<div className="p-8 text-slate-400">Loading Consent Ledger...</div>}>
      <ConsentLedgerContent />
    </Suspense>
  );
}
