'use client';

import React, { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import {
  Activity,
  Rocket,
  RotateCcw,
  ShieldAlert,
  AlertTriangle,
  CheckCircle2,
  RefreshCw,
  Clock,
  Zap,
} from 'lucide-react';
import { PlatformReleaseDTO, ReleaseHealthStatus, PlatformReleaseStatus } from '@pixmatch/types';

function ReleaseHealthDashboardContent() {
  const [releases, setReleases] = useState<PlatformReleaseDTO[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [acting, setActing] = useState<boolean>(false);

  const fetchReleases = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/admin/releases/releases');
      if (res.ok) {
        const d = await res.json();
        if (d.success) setReleases(d.data);
      }
    } catch (e) {
      console.error('Failed to load releases:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReleases();
  }, []);

  const handleRollback = async (id: string, name: string) => {
    if (!confirm(`Trigger emergency rollback for release "${name}"?`)) return;
    try {
      setActing(true);
      const res = await fetch(`/api/admin/releases/releases/${id}/rollback`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: 'Admin triggered emergency rollback due to SLO deviation' }),
      });
      if (res.ok) {
        await fetchReleases();
        alert(`Release "${name}" rolled back successfully.`);
      } else {
        const err = await res.json();
        alert(`Rollback failed: ${err.message || err.error}`);
      }
    } catch (e) {
      console.error('Rollback error:', e);
    } finally {
      setActing(false);
    }
  };

  return (
    <div className="p-6 md:p-8 space-y-6 bg-[#0B0F17] min-h-screen text-slate-100">
      {/* Header */}
      <div className="space-y-3 border-b border-card-border/80 pb-6">
        <div className="flex items-center gap-2 text-xs text-slate-400">
          <Link href="/dashboard/admin/releases" className="hover:text-amber-400 transition">
            Releases & Config
          </Link>
          <span>/</span>
          <span className="text-white font-medium">Release Health & SLOs</span>
        </div>

        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-white flex items-center gap-2.5">
              <Activity className="h-7 w-7 text-emerald-400" />
              Release Health & Automated Safety Center
            </h1>
            <p className="text-slate-400 text-sm mt-1">
              Live SLO error-budget telemetry, progressive stage gates, and guarded automated rollback.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={fetchReleases}
              className="flex items-center gap-2 px-3.5 py-2 rounded-lg bg-card-border/30 hover:bg-card-border/60 border border-card-border text-xs font-semibold text-slate-200 transition"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
              <span>Refresh Health</span>
            </button>
          </div>
        </div>
      </div>

      {/* Releases Cards */}
      <div className="grid grid-cols-1 gap-6">
        {releases.length === 0 ? (
          <div className="p-8 rounded-xl bg-[#0F1623] border border-card-border/80 text-center text-slate-500">
            {loading ? 'Loading releases telemetry...' : 'No releases currently tracked in this cycle.'}
          </div>
        ) : (
          releases.map((rel) => (
            <div
              key={rel.id}
              className="p-6 rounded-xl bg-[#0F1623] border border-card-border/80 space-y-5 hover:border-emerald-500/30 transition"
            >
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 border-b border-card-border/50 pb-4">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-mono text-xs font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                      {rel.version}
                    </span>
                    <span className="text-xs font-mono text-slate-400 font-bold">{rel.environment}</span>
                  </div>
                  <h3 className="text-lg font-bold text-white">{rel.name}</h3>
                  <p className="text-slate-400 text-xs mt-0.5">{rel.description}</p>
                </div>

                <div className="flex items-center gap-3">
                  <span
                    className={`px-3 py-1 rounded-lg text-xs font-bold ${
                      rel.healthStatus === 'HEALTHY'
                        ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                        : rel.healthStatus === 'DEGRADED'
                        ? 'bg-amber-500/15 text-amber-400 border border-amber-500/30'
                        : rel.healthStatus === 'UNHEALTHY'
                        ? 'bg-red-500/15 text-red-400 border border-red-500/30'
                        : 'bg-slate-700/30 text-slate-400 border border-slate-600'
                    }`}
                  >
                    HEALTH: {rel.healthStatus}
                  </span>
                  <span className="px-3 py-1 rounded-lg text-xs font-mono font-bold bg-blue-500/10 text-blue-400 border border-blue-500/20">
                    {rel.status}
                  </span>
                </div>
              </div>

              {/* Health Telemetry Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
                <div className="p-3 rounded-lg bg-[#0B0F17] border border-card-border/40">
                  <span className="text-slate-400">Rollout Percentage</span>
                  <p className="text-amber-400 font-mono font-bold text-base mt-0.5">{rel.rolloutPercentage}%</p>
                </div>
                <div className="p-3 rounded-lg bg-[#0B0F17] border border-card-border/40">
                  <span className="text-slate-400">SLO / Health Status</span>
                  <p className="text-emerald-400 font-mono font-bold text-base mt-0.5">{rel.healthStatus}</p>
                </div>
                <div className="p-3 rounded-lg bg-[#0B0F17] border border-card-border/40">
                  <span className="text-slate-400">Deployed At</span>
                  <p className="text-slate-200 text-xs mt-1">
                    {rel.deployedAt ? new Date(rel.deployedAt).toLocaleString() : 'Not deployed yet'}
                  </p>
                </div>
                <div className="p-3 rounded-lg bg-[#0B0F17] border border-card-border/40 flex items-center justify-center">
                  {(rel.status === PlatformReleaseStatus.ACTIVE || rel.status === PlatformReleaseStatus.DEPLOYING || rel.status === PlatformReleaseStatus.HEALTH_CHECK) && (
                    <button
                      onClick={() => handleRollback(rel.id, rel.name || rel.version)}
                      disabled={acting}
                      className="w-full py-2 bg-red-500/15 hover:bg-red-500/25 text-red-400 border border-red-500/30 font-bold rounded-lg transition flex items-center justify-center gap-1.5"
                    >
                      <RotateCcw className="h-3.5 w-3.5" />
                      <span>Guarded Rollback</span>
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

export default function ReleaseHealthDashboardPage() {
  return (
    <Suspense fallback={<div className="p-8 text-slate-400">Loading Release Health...</div>}>
      <ReleaseHealthDashboardContent />
    </Suspense>
  );
}
