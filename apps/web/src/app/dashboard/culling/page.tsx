'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Layers,
  Plus,
  Play,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Sparkles,
  Sliders,
  Filter,
  ArrowRight,
  RefreshCw,
  FolderOpen,
  Image as ImageIcon,
  Check,
  X,
  HelpCircle,
} from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import { PhotoCullSessionDTO, CullingSummaryDTO, CullSessionStatus } from '@pixmatch/types';

export default function CullingOverviewPage() {
  const { user, studio } = useAuth();

  const [sessions, setSessions] = useState<PhotoCullSessionDTO[]>([]);
  const [summary, setSummary] = useState<CullingSummaryDTO | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [filterStatus, setFilterStatus] = useState<string>('ALL');

  const fetchData = async () => {
    try {
      setIsLoading(true);
      const [sessionsRes, summaryRes] = await Promise.all([
        fetch('/api/v1/culling/sessions'),
        fetch('/api/v1/culling/analytics/summary'),
      ]);

      if (sessionsRes.ok) {
        const data = await sessionsRes.json();
        setSessions(data.sessions || data.data || []);
      }
      if (summaryRes.ok) {
        const data = await summaryRes.json();
        setSummary(data.summary || data.data || null);
      }
    } catch (err) {
      console.error('Failed to load culling overview', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const filteredSessions = sessions.filter((s) => {
    if (filterStatus === 'ALL') return true;
    return s.status === filterStatus;
  });

  return (
    <div className="space-y-8 p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-zinc-800 pb-6">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-violet-500/10 border border-violet-500/20 text-violet-400">
              <Layers className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white tracking-tight">AI Media Culling & Review</h1>
              <p className="text-sm text-zinc-400 mt-0.5">
                Deterministic 8-factor AI quality scoring, burst grouping, and non-destructive photographer selection.
              </p>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={fetchData}
            className="p-2 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white transition"
            title="Refresh"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
          <Link
            href="/dashboard/culling/new"
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-violet-600 hover:bg-violet-500 text-white font-medium text-sm transition shadow-lg shadow-violet-600/20"
          >
            <Plus className="w-4 h-4" />
            <span>New Culling Session</span>
          </Link>
        </div>
      </div>

      {/* Analytics Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-5 rounded-xl bg-zinc-900/60 border border-zinc-800 backdrop-blur-sm">
          <div className="flex items-center justify-between text-zinc-400 text-sm mb-2">
            <span>Total Photos Culled</span>
            <ImageIcon className="w-4 h-4 text-violet-400" />
          </div>
          <div className="text-3xl font-bold text-white tracking-tight">
            {summary?.total_photos_culled?.toLocaleString() || '0'}
          </div>
          <div className="text-xs text-zinc-500 mt-2 flex items-center gap-1.5">
            <span className="text-emerald-400 font-medium">{summary?.keep_rate_percent || 0}%</span> keep rate
          </div>
        </div>

        <div className="p-5 rounded-xl bg-zinc-900/60 border border-zinc-800 backdrop-blur-sm">
          <div className="flex items-center justify-between text-zinc-400 text-sm mb-2">
            <span>AI Keep Recommendations</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-3xl font-bold text-emerald-400 tracking-tight">
            {summary?.ai_recommended_keep?.toLocaleString() || '0'}
          </div>
          <div className="text-xs text-zinc-500 mt-2">
            {summary?.ai_agreement_rate_percent || 0}% agreement with photographer
          </div>
        </div>

        <div className="p-5 rounded-xl bg-zinc-900/60 border border-zinc-800 backdrop-blur-sm">
          <div className="flex items-center justify-between text-zinc-400 text-sm mb-2">
            <span>Burst Groups Identified</span>
            <Sparkles className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-3xl font-bold text-amber-400 tracking-tight">
            {summary?.burst_groups_detected?.toLocaleString() || '0'}
          </div>
          <div className="text-xs text-zinc-500 mt-2">
            Best shot flagged per burst sequence
          </div>
        </div>

        <div className="p-5 rounded-xl bg-zinc-900/60 border border-zinc-800 backdrop-blur-sm">
          <div className="flex items-center justify-between text-zinc-400 text-sm mb-2">
            <span>Average Cull Velocity</span>
            <Clock className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="text-3xl font-bold text-cyan-400 tracking-tight">
            {summary?.avg_cull_velocity_photos_per_min || 0}
            <span className="text-sm font-normal text-zinc-500 ml-1">img/min</span>
          </div>
          <div className="text-xs text-zinc-500 mt-2">
            Estimated {summary?.hours_saved_by_ai || 0} hrs saved by AI assistance
          </div>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 border-b border-zinc-800 pb-2">
        {['ALL', 'ANALYZING', 'IN_PROGRESS', 'COMPLETED', 'ARCHIVED'].map((st) => (
          <button
            key={st}
            onClick={() => setFilterStatus(st)}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-medium transition ${
              filterStatus === st
                ? 'bg-zinc-800 text-white border border-zinc-700'
                : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900'
            }`}
          >
            {st.replace('_', ' ')}
          </button>
        ))}
      </div>

      {/* Sessions Grid */}
      {isLoading ? (
        <div className="p-12 text-center text-zinc-500">Loading culling sessions...</div>
      ) : filteredSessions.length === 0 ? (
        <div className="p-12 rounded-2xl bg-zinc-900/40 border border-dashed border-zinc-800 text-center space-y-3">
          <FolderOpen className="w-10 h-10 text-zinc-600 mx-auto" />
          <h3 className="text-base font-medium text-zinc-300">No Culling Sessions Found</h3>
          <p className="text-sm text-zinc-500 max-w-md mx-auto">
            Launch a new culling session on an ingested gallery to automatically score sharpness, exposure, composition, and detect bursts.
          </p>
          <div className="pt-2">
            <Link
              href="/dashboard/culling/new"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-sm font-medium transition"
            >
              <Plus className="w-4 h-4" />
              <span>Create Session</span>
            </Link>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredSessions.map((s) => (
            <div
              key={s.id}
              className="p-6 rounded-2xl bg-zinc-900/70 border border-zinc-800/80 hover:border-zinc-700 transition flex flex-col justify-between group"
            >
              <div className="space-y-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <span
                      className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider mb-2 ${
                        s.status === 'COMPLETED'
                          ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                          : s.status === 'IN_PROGRESS'
                          ? 'bg-violet-500/10 text-violet-400 border border-violet-500/20'
                          : 'bg-zinc-800 text-zinc-400 border border-zinc-700'
                      }`}
                    >
                      {s.status}
                    </span>
                    <h3 className="text-lg font-semibold text-white group-hover:text-violet-400 transition line-clamp-1">
                      {s.name}
                    </h3>
                  </div>
                </div>

                {/* Progress Bar */}
                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs text-zinc-400">
                    <span>Reviewed</span>
                    <span>
                      {s.reviewed_count} / {s.total_photos} ({s.total_photos > 0 ? Math.round((s.reviewed_count / s.total_photos) * 100) : 0}%)
                    </span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-zinc-800 overflow-hidden">
                    <div
                      className="h-full bg-violet-500 rounded-full transition-all"
                      style={{
                        width: `${s.total_photos > 0 ? (s.reviewed_count / s.total_photos) * 100 : 0}%`,
                      }}
                    />
                  </div>
                </div>

                {/* Decision Breakdown */}
                <div className="grid grid-cols-3 gap-2 text-center text-xs py-2 bg-zinc-950/40 rounded-xl border border-zinc-800/50">
                  <div className="p-1">
                    <div className="font-bold text-emerald-400">{s.kept_count}</div>
                    <div className="text-[10px] text-zinc-500 uppercase">Keep</div>
                  </div>
                  <div className="p-1">
                    <div className="font-bold text-rose-400">{s.rejected_count}</div>
                    <div className="text-[10px] text-zinc-500 uppercase">Reject</div>
                  </div>
                  <div className="p-1">
                    <div className="font-bold text-amber-400">{s.maybe_count}</div>
                    <div className="text-[10px] text-zinc-500 uppercase">Maybe</div>
                  </div>
                </div>
              </div>

              <div className="pt-6 border-t border-zinc-800/80 mt-6 flex items-center justify-between">
                <span className="text-xs text-zinc-500">
                  {new Date(s.created_at).toLocaleDateString()}
                </span>
                <Link
                  href={`/dashboard/culling/${s.id}`}
                  className="flex items-center gap-1.5 text-xs font-semibold text-violet-400 hover:text-violet-300 transition"
                >
                  <span>Open Studio Culler</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
