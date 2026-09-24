'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Flag,
  RotateCcw,
  ShieldAlert,
  ShieldCheck,
  CheckCircle2,
  Clock,
  Layers,
  ChevronLeft,
  AlertTriangle,
  Play,
  History,
  Sliders,
} from 'lucide-react';
import { PlatformFeatureFlagV2DTO, FeatureFlagVersionDTO } from '@pixmatch/types';

function FeatureFlagDetailContent() {
  const params = useParams();
  const router = useRouter();
  const flagId = params.flagId as string;

  const [flag, setFlag] = useState<PlatformFeatureFlagV2DTO | null>(null);
  const [versions, setVersions] = useState<FeatureFlagVersionDTO[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [testSubject, setTestSubject] = useState<string>('studio_demo_123');
  const [evalResult, setEvalResult] = useState<any>(null);
  const [evaluating, setEvaluating] = useState<boolean>(false);
  const [rollbackVersion, setRollbackVersion] = useState<number | null>(null);

  const fetchFlagDetail = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/admin/releases/feature-flags/${flagId}`);
      if (res.ok) {
        const d = await res.json();
        if (d.success) {
          setFlag(d.data);
          // fetch versions
          const vRes = await fetch(`/api/admin/releases/feature-flags/${flagId}/versions`);
          if (vRes.ok) {
            const vData = await vRes.json();
            if (vData.success) setVersions(vData.data);
          }
        }
      }
    } catch (e) {
      console.error('Failed to load flag details:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (flagId) fetchFlagDetail();
  }, [flagId]);

  const handleEvaluate = async () => {
    if (!flag) return;
    try {
      setEvaluating(true);
      const res = await fetch('/api/admin/releases/feature-flags/evaluate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          key: flag.key,
          subjectId: testSubject,
          studioId: testSubject,
          plan: 'PRO',
          environment: 'PROD',
        }),
      });
      if (res.ok) {
        const d = await res.json();
        if (d.success) setEvalResult(d.data);
      }
    } catch (e) {
      console.error('Failed to evaluate flag:', e);
    } finally {
      setEvaluating(false);
    }
  };

  const handleRollback = async (targetVer: number) => {
    if (!confirm(`Are you sure you want to roll back ${flag?.key} to version v${targetVer}?`)) return;
    try {
      const res = await fetch(`/api/admin/releases/feature-flags/${flagId}/rollback`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ targetVersion: targetVer, reason: `Admin triggered UI rollback to v${targetVer}` }),
      });
      if (res.ok) {
        await fetchFlagDetail();
        alert(`Successfully rolled back to v${targetVer}`);
      }
    } catch (e) {
      console.error('Rollback error:', e);
    }
  };

  if (loading || !flag) {
    return (
      <div className="p-8 text-slate-400 bg-[#0B0F17] min-h-screen">
        Loading feature flag configuration...
      </div>
    );
  }

  return (
    <div className="p-6 md:p-8 space-y-6 bg-[#0B0F17] min-h-screen text-slate-100">
      {/* Back & Breadcrumb */}
      <div className="space-y-3 border-b border-card-border/80 pb-6">
        <Link
          href="/dashboard/admin/releases/feature-flags"
          className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-white transition"
        >
          <ChevronLeft className="h-4 w-4" />
          <span>Back to Flag Catalog</span>
        </Link>

        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="font-mono text-xs font-bold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
                {flag.key}
              </span>
              <span className="text-xs text-slate-400 font-mono">v{flag.version}</span>
            </div>
            <h1 className="text-2xl font-bold text-white">{flag.name}</h1>
            <p className="text-slate-400 text-sm mt-0.5">{flag.description || 'No description provided.'}</p>
          </div>

          <div className="flex items-center gap-3">
            <span
              className={`px-3 py-1 rounded-lg text-xs font-bold ${
                flag.state === 'ACTIVE'
                  ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                  : 'bg-slate-700/30 text-slate-400 border border-slate-600'
              }`}
            >
              STATE: {flag.state}
            </span>
          </div>
        </div>
      </div>

      {/* Flag Settings & Rules Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Flag Config Summary */}
        <div className="lg:col-span-2 space-y-6">
          <div className="p-6 rounded-xl bg-[#0F1623] border border-card-border/80 space-y-4">
            <h2 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <Sliders className="h-4 w-4 text-amber-400" />
              Targeting & Rollout Configuration
            </h2>

            <div className="grid grid-cols-2 gap-4 text-xs">
              <div className="p-3 rounded-lg bg-[#0B0F17] border border-card-border/40">
                <span className="text-slate-400">Flag Type</span>
                <p className="text-white font-semibold mt-0.5 font-mono">{flag.type}</p>
              </div>
              <div className="p-3 rounded-lg bg-[#0B0F17] border border-card-border/40">
                <span className="text-slate-400">Default Value / State</span>
                <p className="text-white font-semibold mt-0.5">{flag.enabled ? 'True (Enabled)' : 'False (Disabled)'}</p>
              </div>
              <div className="p-3 rounded-lg bg-[#0B0F17] border border-card-border/40">
                <span className="text-slate-400">Percentage Rollout</span>
                <p className="text-amber-400 font-bold mt-0.5 font-mono">{flag.percentage ?? 0}%</p>
              </div>
              <div className="p-3 rounded-lg bg-[#0B0F17] border border-card-border/40">
                <span className="text-slate-400">Target Environments</span>
                <p className="text-white font-semibold mt-0.5 font-mono">
                  {flag.environments?.length ? flag.environments.join(', ') : 'ALL (DEV, STAGING, PROD)'}
                </p>
              </div>
            </div>

            {/* Targeting Lists */}
            <div className="space-y-2 pt-2 border-t border-card-border/40 text-xs">
              <div>
                <span className="text-slate-400">Allowed Subscription Plans:</span>
                <span className="ml-2 font-mono text-white">
                  {flag.allowedPlans?.length ? flag.allowedPlans.join(', ') : 'All Subscription Plans'}
                </span>
              </div>
              <div>
                <span className="text-slate-400">Allowed Studios:</span>
                <span className="ml-2 font-mono text-white">
                  {flag.allowedStudios?.length ? `${flag.allowedStudios.length} studios configured` : 'Global / All Studios'}
                </span>
              </div>
              <div>
                <span className="text-slate-400">Blocked Studios:</span>
                <span className="ml-2 font-mono text-white">
                  {flag.blockedStudios?.length ? `${flag.blockedStudios.length} studios blocked` : 'None'}
                </span>
              </div>
            </div>
          </div>

          {/* Test Bucketing Evaluator */}
          <div className="p-6 rounded-xl bg-[#0F1623] border border-card-border/80 space-y-4">
            <h2 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <Play className="h-4 w-4 text-blue-400" />
              Deterministic Bucketing Simulator
            </h2>
            <p className="text-slate-400 text-xs">
              Test deterministic SHA-256 bucketing against subject ID or studio ID without affecting production traffic.
            </p>

            <div className="flex gap-3">
              <input
                type="text"
                placeholder="Enter Subject ID / Studio ID (e.g. studio_demo_1)"
                value={testSubject}
                onChange={(e) => setTestSubject(e.target.value)}
                className="flex-1 px-3 py-2 bg-[#0B0F17] border border-card-border/70 rounded-lg text-xs text-white font-mono"
              />
              <button
                onClick={handleEvaluate}
                disabled={evaluating}
                className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white font-bold text-xs rounded-lg transition disabled:opacity-50"
              >
                {evaluating ? 'Simulating...' : 'Evaluate Flag'}
              </button>
            </div>

            {evalResult && (
              <div className="p-4 rounded-lg bg-[#0B0F17] border border-blue-500/30 space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Evaluation Result:</span>
                  <span
                    className={`font-bold px-2 py-0.5 rounded text-[11px] ${
                      evalResult.enabled
                        ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                        : 'bg-red-500/20 text-red-400 border border-red-500/30'
                    }`}
                  >
                    {evalResult.enabled ? 'ENABLED' : 'DISABLED'}
                  </span>
                </div>
                <div className="flex items-center justify-between font-mono text-[11px] text-slate-400">
                  <span>Computed Hash Bucket:</span>
                  <span className="text-amber-400 font-bold">{evalResult.bucket ?? '--'} / 100</span>
                </div>
                <div className="flex items-center justify-between text-[11px] text-slate-400">
                  <span>Reason:</span>
                  <span className="text-slate-200">{evalResult.reason}</span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Version History & Rollback */}
        <div className="p-6 rounded-xl bg-[#0F1623] border border-card-border/80 space-y-4">
          <h2 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
            <History className="h-4 w-4 text-purple-400" />
            Snapshot Version History
          </h2>
          <p className="text-slate-400 text-xs">
            Every update creates an immutable snapshot. You can roll back safely at any point.
          </p>

          <div className="space-y-3 text-xs max-h-[420px] overflow-y-auto pr-1">
            {versions.length === 0 ? (
              <p className="text-slate-500 italic">No previous versions captured yet.</p>
            ) : (
              versions.map((ver) => (
                <div
                  key={ver.id}
                  className={`p-3 rounded-lg border transition ${
                    ver.version === flag.version
                      ? 'bg-amber-500/10 border-amber-500/40'
                      : 'bg-[#0B0F17] border-card-border/50 hover:border-slate-500'
                  }`}
                >
                  <div className="flex items-center justify-between font-mono">
                    <span className="font-bold text-white">v{ver.version}</span>
                    {ver.version === flag.version && (
                      <span className="text-[10px] text-amber-400 font-bold uppercase">CURRENT</span>
                    )}
                  </div>
                  <p className="text-slate-400 text-[11px] mt-1">
                    {new Date(ver.createdAt || ver.created_at || Date.now()).toLocaleString()}
                  </p>
                  <p className="text-slate-300 text-[11px] mt-1 italic font-sans">
                    {ver.changeReason || 'Direct update'}
                  </p>
                  {ver.version !== flag.version && (
                    <button
                      onClick={() => handleRollback(ver.version)}
                      className="mt-2 text-xs font-semibold text-purple-400 hover:text-purple-300 flex items-center gap-1"
                    >
                      <RotateCcw className="h-3 w-3" />
                      <span>Rollback to this version</span>
                    </button>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function FeatureFlagDetailPage() {
  return (
    <Suspense fallback={<div className="p-8 text-slate-400">Loading Flag Detail...</div>}>
      <FeatureFlagDetailContent />
    </Suspense>
  );
}
