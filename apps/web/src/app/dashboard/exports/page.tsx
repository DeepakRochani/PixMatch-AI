'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Download,
  Plus,
  Play,
  CheckCircle2,
  Clock,
  AlertTriangle,
  FileArchive,
  RefreshCw,
  HardDrive,
  ShieldCheck,
  Tag,
  Check,
  X,
  Layers,
  ArrowRight,
} from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import {
  PhotoExportJobDTO,
  PhotoExportPresetDTO,
  ExportSummaryDTO,
  ExportJobStatus,
} from '@pixmatch/types';

export default function ExportsOverviewPage() {
  const { user, studio } = useAuth();

  const [jobs, setJobs] = useState<PhotoExportJobDTO[]>([]);
  const [presets, setPresets] = useState<PhotoExportPresetDTO[]>([]);
  const [summary, setSummary] = useState<ExportSummaryDTO | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [activeTab, setActiveTab] = useState<'jobs' | 'presets'>('jobs');

  const fetchData = async () => {
    try {
      setIsLoading(true);
      const [jobsRes, presetsRes, summaryRes] = await Promise.all([
        fetch('/api/v1/exports/jobs'),
        fetch('/api/v1/exports/presets'),
        fetch('/api/v1/culling/analytics/export-summary'),
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
      console.error('Failed to load exports overview', err);
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
            <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
              <Download className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white tracking-tight">Media Exports & Delivery Packaging</h1>
              <p className="text-sm text-zinc-400 mt-0.5">
                Batch rendering, multi-format delivery presets, checksum integrity verification, and metadata privacy policies.
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
            href="/dashboard/exports/new"
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-sm transition shadow-lg shadow-emerald-600/20"
          >
            <Plus className="w-4 h-4" />
            <span>Create Export Job</span>
          </Link>
        </div>
      </div>

      {/* Analytics KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-5 rounded-xl bg-zinc-900/60 border border-zinc-800 backdrop-blur-sm">
          <div className="flex items-center justify-between text-zinc-400 text-sm mb-2">
            <span>Total Exports Dispatched</span>
            <FileArchive className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-3xl font-bold text-white tracking-tight">
            {summary?.total_export_jobs?.toLocaleString() || '0'}
          </div>
          <div className="text-xs text-zinc-500 mt-2">
            <span className="text-emerald-400 font-medium">{summary?.success_rate_percent || 100}%</span> success rate
          </div>
        </div>

        <div className="p-5 rounded-xl bg-zinc-900/60 border border-zinc-800 backdrop-blur-sm">
          <div className="flex items-center justify-between text-zinc-400 text-sm mb-2">
            <span>Rendered Artifacts</span>
            <HardDrive className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="text-3xl font-bold text-cyan-400 tracking-tight">
            {summary?.total_artifacts_rendered?.toLocaleString() || '0'}
          </div>
          <div className="text-xs text-zinc-500 mt-2">Verified with SHA-256 checksums</div>
        </div>

        <div className="p-5 rounded-xl bg-zinc-900/60 border border-zinc-800 backdrop-blur-sm">
          <div className="flex items-center justify-between text-zinc-400 text-sm mb-2">
            <span>Data Delivered</span>
            <Download className="w-4 h-4 text-violet-400" />
          </div>
          <div className="text-3xl font-bold text-violet-400 tracking-tight">
            {summary?.total_bytes_exported_formatted || '0 GB'}
          </div>
          <div className="text-xs text-zinc-500 mt-2">WebP, JPEG & ZIP packages</div>
        </div>

        <div className="p-5 rounded-xl bg-zinc-900/60 border border-zinc-800 backdrop-blur-sm">
          <div className="flex items-center justify-between text-zinc-400 text-sm mb-2">
            <span>Active Export Presets</span>
            <Tag className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-3xl font-bold text-amber-400 tracking-tight">
            {presets.length || 5}
          </div>
          <div className="text-xs text-zinc-500 mt-2">Web, Print, Story, & Proof</div>
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
          Export Jobs
        </button>
        <button
          onClick={() => setActiveTab('presets')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
            activeTab === 'presets' ? 'bg-zinc-800 text-white' : 'text-zinc-400 hover:text-white'
          }`}
        >
          Export Presets
        </button>
      </div>

      {/* Tab Content */}
      {activeTab === 'jobs' ? (
        <div className="space-y-4">
          {jobs.length === 0 ? (
            <div className="p-12 rounded-2xl bg-zinc-900/40 border border-dashed border-zinc-800 text-center text-zinc-500">
              No export jobs yet. Dispatch an export batch from a completed culling or editing session.
            </div>
          ) : (
            <div className="divide-y divide-zinc-800/80 rounded-2xl bg-zinc-900/50 border border-zinc-800 overflow-hidden">
              {jobs.map((j) => (
                <div key={j.id} className="p-4 flex items-center justify-between hover:bg-zinc-800/30 transition">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-zinc-800 text-zinc-300">
                      <FileArchive className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="text-sm font-semibold text-white flex items-center gap-2">
                        <span>Batch #{j.id.slice(0, 8)}</span>
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-semibold uppercase ${
                            j.status === 'COMPLETED'
                              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                              : j.status === 'FAILED'
                              ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                              : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                          }`}
                        >
                          {j.status}
                        </span>
                      </div>
                      <div className="text-xs text-zinc-500 mt-0.5">
                        Format: <span className="text-zinc-300">{j.target_format}</span> • Photos:{' '}
                        <span className="text-zinc-300">
                          {j.processed_items ?? j.processed_photos ?? 0} / {j.total_items ?? j.total_photos ?? 0}
                        </span>{' '}
                        • Created: {new Date(j.created_at).toLocaleDateString()}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    {j.download_url && (
                      <a
                        href={j.download_url}
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold transition"
                      >
                        <Download className="w-3.5 h-3.5" />
                        <span>Download ZIP</span>
                      </a>
                    )}
                  </div>
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
                  {p.format} • {p.quality}
                </span>
                {p.is_system && (
                  <span className="text-[10px] text-zinc-500 uppercase tracking-wider font-semibold">
                    System Preset
                  </span>
                )}
              </div>
              <h3 className="text-base font-bold text-white">{p.name}</h3>
              <p className="text-xs text-zinc-400">{p.description || 'Export resolution preset'}</p>
              <div className="pt-2 text-[11px] text-zinc-500 space-y-0.5 border-t border-zinc-800/80">
                <div>Max Resolution: {p.max_width ? `${p.max_width}px` : 'Original Dimension'}</div>
                <div>Metadata: {p.metadata_policy}</div>
                <div>Watermark: {p.watermark_enabled ? 'Enabled' : 'Disabled'}</div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
