'use client';

import React, { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import {
  Clock,
  ArrowLeft,
  Activity,
  ShieldAlert,
  Play,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  FileText,
} from 'lucide-react';
import { DataRetentionPolicyDTO } from '@pixmatch/types';

function RetentionPageContent() {
  const [policies, setPolicies] = useState<DataRetentionPolicyDTO[]>([]);
  const [evalResults, setEvalResults] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [evaluating, setEvaluating] = useState<boolean>(false);

  const fetchPolicies = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/admin/privacy/retention/policies');
      if (res.ok) {
        const d = await res.json();
        if (d.success) setPolicies(d.data || []);
      }
    } catch (e) {
      console.error('Failed to load retention policies:', e);
    } finally {
      setLoading(false);
    }
  };

  const handleEvaluate = async () => {
    try {
      setEvaluating(true);
      const res = await fetch('/api/admin/privacy/retention/evaluate', {
        method: 'POST',
      });
      if (res.ok) {
        const d = await res.json();
        if (d.success) setEvalResults(d.data || []);
      }
    } catch (e) {
      console.error('Failed to evaluate retention:', e);
    } finally {
      setEvaluating(false);
    }
  };

  useEffect(() => {
    fetchPolicies();
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
            <Clock className="h-7 w-7 text-purple-400" />
            Data Retention & Expiration Management
          </h1>
          <p className="text-slate-400 text-xs mt-1">
            Statutory retention schedules, biometric expiration thresholds, and automated retention evaluation.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleEvaluate}
            disabled={evaluating}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white text-xs font-semibold shadow-lg shadow-purple-500/20 transition-all"
          >
            <Play className={`h-3.5 w-3.5 ${evaluating ? 'animate-spin' : ''}`} />
            {evaluating ? 'Evaluating...' : 'Evaluate Retention Rules'}
          </button>
        </div>
      </div>

      {/* Evaluation Results Banner (if evaluated) */}
      {evalResults.length > 0 && (
        <div className="p-5 rounded-xl bg-purple-950/20 border border-purple-500/30 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold text-purple-300 uppercase tracking-wider flex items-center gap-2">
              <Activity className="h-4 w-4 text-purple-400" />
              Retention Evaluation Results ({evalResults.length} Policies Evaluated)
            </h3>
            <span className="text-[11px] text-purple-400">
              Evaluated {new Date().toLocaleTimeString()}
            </span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {evalResults.map((r, i) => (
              <div key={i} className="p-3 bg-slate-900/90 rounded-lg border border-slate-800 text-xs">
                <div className="font-semibold text-white">{r.policyName}</div>
                <div className="mt-2 flex justify-between text-[11px]">
                  <span className="text-slate-400">Eligible Records:</span>
                  <span className="font-mono text-amber-400">{r.eligibleRecordsCount}</span>
                </div>
                <div className="flex justify-between text-[11px] mt-1">
                  <span className="text-slate-400">Blocked by Legal Hold:</span>
                  <span className="font-mono text-red-400">{r.blockedByLegalHoldCount}</span>
                </div>
                <div className="flex justify-between text-[11px] mt-1">
                  <span className="text-slate-400">Actionable:</span>
                  <span className="font-mono text-emerald-400">{r.actionableRecordsCount}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Retention Policies Table */}
      <div className="rounded-xl bg-card-bg border border-card-border/80 overflow-hidden">
        <div className="p-4 bg-slate-900/80 border-b border-card-border flex items-center justify-between">
          <h2 className="text-xs font-bold text-white uppercase tracking-wider">
            Configured Retention Policies ({policies.length})
          </h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-900/60 border-b border-card-border text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
              <tr>
                <th className="px-4 py-3.5">Policy Name</th>
                <th className="px-4 py-3.5">Classification</th>
                <th className="px-4 py-3.5">Duration</th>
                <th className="px-4 py-3.5">Action</th>
                <th className="px-4 py-3.5">Trigger</th>
                <th className="px-4 py-3.5">Legal Justification</th>
                <th className="px-4 py-3.5">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-slate-400">
                    Loading retention policies...
                  </td>
                </tr>
              ) : policies.map((p) => (
                <tr key={p.id} className="hover:bg-slate-800/40 transition-colors">
                  <td className="px-4 py-3.5">
                    <div className="font-semibold text-white">{p.name}</div>
                    <div className="text-[11px] text-slate-400 mt-0.5">{p.description}</div>
                  </td>
                  <td className="px-4 py-3.5 font-mono text-[11px]">
                    {p.classification || 'ALL'}
                  </td>
                  <td className="px-4 py-3.5 font-bold text-emerald-400">
                    {p.durationDays} days ({Math.round(p.durationDays / 365 * 10) / 10} yrs)
                  </td>
                  <td className="px-4 py-3.5 font-mono text-[11px] text-purple-300">
                    {p.action}
                  </td>
                  <td className="px-4 py-3.5 font-mono text-[11px] text-slate-400">
                    {p.trigger}
                  </td>
                  <td className="px-4 py-3.5 text-slate-400 max-w-xs text-[11px]">
                    {p.legalJustification}
                  </td>
                  <td className="px-4 py-3.5">
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                      Active
                    </span>
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

export default function RetentionPage() {
  return (
    <Suspense fallback={<div className="p-8 text-slate-400">Loading Retention Management...</div>}>
      <RetentionPageContent />
    </Suspense>
  );
}
