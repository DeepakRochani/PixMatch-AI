'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Sliders,
  Plus,
  Play,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Sparkles,
  ArrowRight,
  RefreshCw,
  Image as ImageIcon,
  Check,
  X,
  Palette,
  Layers,
  Wand2,
} from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import { PhotoEditJobDTO, PhotoEditPresetDTO, EditingSummaryDTO } from '@pixmatch/types';

export default function EditingOverviewPage() {
  const { user, studio } = useAuth();

  const [jobs, setJobs] = useState<PhotoEditJobDTO[]>([]);
  const [presets, setPresets] = useState<PhotoEditPresetDTO[]>([]);
  const [summary, setSummary] = useState<EditingSummaryDTO | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [activeTab, setActiveTab] = useState<'jobs' | 'presets'>('jobs');

  const fetchData = async () => {
    try {
      setIsLoading(true);
      const [jobsRes, presetsRes, summaryRes] = await Promise.all([
        fetch('/api/v1/editing/jobs'),
        fetch('/api/v1/editing/presets'),
        fetch('/api/v1/culling/analytics/editing-summary'),
      ]);

      if (jobsRes.ok) {
        const jData = await jobsRes.json();
        setJobs(jData.jobs || jData.data || []);
      }
      if (presetsRes.ok) {
        const pData = await presetsRes.json();
        setPresets(pData.presets || pData.data || []);
      }
      if (summaryRes.ok) {
        const sData = await summaryRes.json();
        setSummary(sData.summary || sData.data || null);
      }
    } catch (err) {
      console.error('Failed to load editing overview', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  return (
    <div className="space-y-8 p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-zinc-800 pb-6">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400">
              <Sliders className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white tracking-tight">Non-Destructive Post-Production</h1>
              <p className="text-sm text-zinc-400 mt-0.5">
                Sharp-powered derivative processing, AI auto-enhance suggestions, and curated studio color presets.
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
            href="/dashboard/editing/new"
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white font-medium text-sm transition shadow-lg shadow-cyan-600/20"
          >
            <Plus className="w-4 h-4" />
            <span>New Edit Job</span>
          </Link>
        </div>
      </div>

      {/* Analytics KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-5 rounded-xl bg-zinc-900/60 border border-zinc-800 backdrop-blur-sm">
          <div className="flex items-center justify-between text-zinc-400 text-sm mb-2">
            <span>Total Photos Edited</span>
            <ImageIcon className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="text-3xl font-bold text-white tracking-tight">
            {summary?.total_photos_edited?.toLocaleString() || '0'}
          </div>
          <div className="text-xs text-zinc-500 mt-2">Immutable original master files preserved</div>
        </div>

        <div className="p-5 rounded-xl bg-zinc-900/60 border border-zinc-800 backdrop-blur-sm">
          <div className="flex items-center justify-between text-zinc-400 text-sm mb-2">
            <span>AI Suggestions Generated</span>
            <Wand2 className="w-4 h-4 text-violet-400" />
          </div>
          <div className="text-3xl font-bold text-violet-400 tracking-tight">
            {summary?.ai_suggestions_generated?.toLocaleString() || '0'}
          </div>
          <div className="text-xs text-zinc-500 mt-2">
            {summary?.ai_suggestions_approved_percent || 0}% approved by studio
          </div>
        </div>

        <div className="p-5 rounded-xl bg-zinc-900/60 border border-zinc-800 backdrop-blur-sm">
          <div className="flex items-center justify-between text-zinc-400 text-sm mb-2">
            <span>Active Edit Presets</span>
            <Palette className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-3xl font-bold text-emerald-400 tracking-tight">
            {presets.length || 7}
          </div>
          <div className="text-xs text-zinc-500 mt-2">7 system presets + custom presets</div>
        </div>

        <div className="p-5 rounded-xl bg-zinc-900/60 border border-zinc-800 backdrop-blur-sm">
          <div className="flex items-center justify-between text-zinc-400 text-sm mb-2">
            <span>Avg Processing Time</span>
            <Clock className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-3xl font-bold text-amber-400 tracking-tight">
            {summary?.avg_processing_time_sec || 1.2}s
          </div>
          <div className="text-xs text-zinc-500 mt-2">High-throughput pipeline</div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-4 border-b border-zinc-800 pb-2">
        <button
          onClick={() => setActiveTab('jobs')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
            activeTab === 'jobs' ? 'bg-zinc-800 text-white' : 'text-zinc-400 hover:text-white'
          }`}
        >
          Edit Queue & Jobs
        </button>
        <button
          onClick={() => setActiveTab('presets')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
            activeTab === 'presets' ? 'bg-zinc-800 text-white' : 'text-zinc-400 hover:text-white'
          }`}
        >
          Color Presets
        </button>
      </div>

      {/* Tab Content */}
      {activeTab === 'jobs' ? (
        <div className="space-y-4">
          {jobs.length === 0 ? (
            <div className="p-12 rounded-2xl bg-zinc-900/40 border border-dashed border-zinc-800 text-center text-zinc-500">
              No active editing jobs. Queue a non-destructive edit job from any gallery or culling session.
            </div>
          ) : (
            <div className="divide-y divide-zinc-800/80 rounded-2xl bg-zinc-900/50 border border-zinc-800 overflow-hidden">
              {jobs.map((j) => (
                <div key={j.id} className="p-4 flex items-center justify-between hover:bg-zinc-800/30 transition">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-zinc-800 text-zinc-300">
                      <Sliders className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="text-sm font-semibold text-white">Job #{j.id.slice(0, 8)}</div>
                      <div className="text-xs text-zinc-500">
                        Status: <span className="text-zinc-300">{j.status}</span> • Created:{' '}
                        {new Date(j.created_at).toLocaleDateString()}
                      </div>
                    </div>
                  </div>
                  <Link
                    href={`/dashboard/editing/${j.id}`}
                    className="flex items-center gap-1.5 text-xs text-cyan-400 hover:text-cyan-300 font-medium transition"
                  >
                    <span>View Inspector</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        /* Presets Grid */
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {presets.map((p) => (
            <div key={p.id} className="p-6 rounded-2xl bg-zinc-900/60 border border-zinc-800 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold px-2 py-0.5 rounded bg-zinc-800 text-zinc-300 border border-zinc-700">
                  {p.preset_type}
                </span>
                {p.is_system && (
                  <span className="text-[10px] text-zinc-500 uppercase tracking-wider font-semibold">
                    System Default
                  </span>
                )}
              </div>
              <h3 className="text-base font-bold text-white">{p.name}</h3>
              <p className="text-xs text-zinc-400 line-clamp-2">{p.description || 'Color grading preset'}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
