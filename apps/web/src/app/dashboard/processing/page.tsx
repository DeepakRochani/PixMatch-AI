'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { DashboardHeader } from '@/components/layout/DashboardHeader';
import { fetchApi } from '@/lib/api-client';
import { formatDate } from '@pixmatch/ui';
import {
  Cpu,
  CheckCircle2,
  Clock,
  AlertTriangle,
  RotateCcw,
  Activity,
  Layers,
  Loader2,
  RefreshCw,
  FileImage,
} from 'lucide-react';

interface ProcessingJobItem {
  id: string;
  studio_id: string;
  gallery_id?: string | null;
  photo_id?: string | null;
  job_type: string;
  status: 'PENDING' | 'QUEUED' | 'PROCESSING' | 'COMPLETED' | 'FAILED';
  progress: number;
  error_message?: string | null;
  created_at: string;
  updated_at: string;
  gallery?: { id: string; title: string };
  photo?: { id: string; original_url: string; original_filename?: string; thumbnail_url?: string };
}

export default function ProcessingJobsPage() {
  const [jobs, setJobs] = useState<ProcessingJobItem[]>([]);
  const [activeTab, setActiveTab] = useState<'ALL' | 'PROCESSING' | 'QUEUED' | 'COMPLETED' | 'FAILED'>('ALL');
  const [loading, setLoading] = useState(true);
  const [retryingId, setRetryingId] = useState<string | null>(null);

  const loadJobs = useCallback(async (isSilent = false) => {
    if (!isSilent) setLoading(true);
    try {
      const res = await fetchApi('/processing/jobs');
      if (res.success && res.data) {
        setJobs(res.data);
      }
    } catch {
      // Handled
    } finally {
      if (!isSilent) setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadJobs();
  }, [loadJobs]);

  // Live polling every 3 seconds if active jobs exist
  useEffect(() => {
    const hasActive = jobs.some((j) => j.status === 'PROCESSING' || j.status === 'QUEUED' || j.status === 'PENDING');
    if (!hasActive) return;

    const interval = setInterval(() => {
      loadJobs(true);
    }, 3000);

    return () => clearInterval(interval);
  }, [jobs, loadJobs]);

  const handleRetry = async (jobId: string) => {
    setRetryingId(jobId);
    try {
      await fetchApi(`/processing/jobs/${jobId}/retry`, { method: 'POST' });
      setJobs((prev) =>
        prev.map((j) => (j.id === jobId ? { ...j, status: 'QUEUED', progress: 0, error_message: null } : j))
      );
    } catch {
      // Handled
    } finally {
      setRetryingId(null);
    }
  };

  const filteredJobs = jobs.filter((j) => {
    if (activeTab === 'ALL') return true;
    if (activeTab === 'QUEUED') return j.status === 'QUEUED' || j.status === 'PENDING';
    return j.status === activeTab;
  });

  const activeCount = jobs.filter((j) => j.status === 'PROCESSING').length;
  const queuedCount = jobs.filter((j) => j.status === 'QUEUED' || j.status === 'PENDING').length;
  const completedCount = jobs.filter((j) => j.status === 'COMPLETED').length;
  const failedCount = jobs.filter((j) => j.status === 'FAILED').length;

  return (
    <div className="flex-1 flex flex-col min-h-screen">
      <DashboardHeader
        title="Processing Queue"
        subtitle="Real-time BullMQ background pipeline status and Sharp worker monitoring"
      />

      <main className="flex-1 p-6 sm:p-8 space-y-6 max-w-7xl">
        {/* Workers Status Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          <div className="p-5 rounded-2xl bg-card border border-card-border flex items-center gap-4">
            <div className="h-10 w-10 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400 flex items-center justify-center">
              <Activity className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs text-muted font-medium">Processing Now</p>
              <h3 className="text-lg font-bold text-white">{activeCount} Jobs</h3>
            </div>
          </div>

          <div className="p-5 rounded-2xl bg-card border border-card-border flex items-center gap-4">
            <div className="h-10 w-10 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center">
              <Clock className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs text-muted font-medium">Queued in BullMQ</p>
              <h3 className="text-lg font-bold text-white">{queuedCount} Jobs</h3>
            </div>
          </div>

          <div className="p-5 rounded-2xl bg-card border border-card-border flex items-center gap-4">
            <div className="h-10 w-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center">
              <CheckCircle2 className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs text-muted font-medium">Completed</p>
              <h3 className="text-lg font-bold text-white">{completedCount} Jobs</h3>
            </div>
          </div>

          <div className="p-5 rounded-2xl bg-card border border-card-border flex items-center gap-4">
            <div className="h-10 w-10 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 flex items-center justify-center">
              <AlertTriangle className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs text-muted font-medium">Failed</p>
              <h3 className="text-lg font-bold text-white">{failedCount} Jobs</h3>
            </div>
          </div>
        </div>

        {/* Tab Filters */}
        <div className="flex items-center gap-2 border-b border-card-border pb-3 text-xs font-semibold overflow-x-auto">
          <button
            onClick={() => setActiveTab('ALL')}
            className={`px-3 py-1.5 rounded-lg transition ${
              activeTab === 'ALL' ? 'bg-primary text-white' : 'text-muted hover:text-white bg-card'
            }`}
          >
            All Jobs ({jobs.length})
          </button>
          <button
            onClick={() => setActiveTab('PROCESSING')}
            className={`px-3 py-1.5 rounded-lg transition flex items-center gap-1.5 ${
              activeTab === 'PROCESSING' ? 'bg-blue-500 text-white' : 'text-muted hover:text-white bg-card'
            }`}
          >
            Processing ({activeCount})
          </button>
          <button
            onClick={() => setActiveTab('QUEUED')}
            className={`px-3 py-1.5 rounded-lg transition flex items-center gap-1.5 ${
              activeTab === 'QUEUED' ? 'bg-amber-500 text-white' : 'text-muted hover:text-white bg-card'
            }`}
          >
            Queued ({queuedCount})
          </button>
          <button
            onClick={() => setActiveTab('COMPLETED')}
            className={`px-3 py-1.5 rounded-lg transition flex items-center gap-1.5 ${
              activeTab === 'COMPLETED' ? 'bg-emerald-500 text-white' : 'text-muted hover:text-white bg-card'
            }`}
          >
            Completed ({completedCount})
          </button>
          <button
            onClick={() => setActiveTab('FAILED')}
            className={`px-3 py-1.5 rounded-lg transition flex items-center gap-1.5 ${
              activeTab === 'FAILED' ? 'bg-red-500 text-white' : 'text-muted hover:text-white bg-card'
            }`}
          >
            Failed ({failedCount})
          </button>
        </div>

        {/* Jobs Table */}
        <div className="rounded-2xl bg-card border border-card-border overflow-hidden">
          <div className="p-5 border-b border-card-border flex items-center justify-between">
            <h3 className="font-bold text-white text-sm">Real-time Job Pipeline</h3>
            <button
              onClick={() => loadJobs()}
              className="p-1.5 rounded-lg text-muted hover:text-white hover:bg-card-border transition flex items-center gap-1 text-xs"
            >
              <RefreshCw className="h-3.5 w-3.5" /> Refresh
            </button>
          </div>

          {loading ? (
            <div className="p-12 text-center text-xs text-muted">
              <Loader2 className="h-6 w-6 animate-spin mx-auto text-primary mb-2" />
              Loading processing queue...
            </div>
          ) : filteredJobs.length === 0 ? (
            <div className="p-12 text-center text-xs text-muted">
              No jobs matching the selected filter.
            </div>
          ) : (
            <div className="divide-y divide-card-border">
              {filteredJobs.map((job) => (
                <div key={job.id} className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="space-y-1 max-w-md">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-sm text-white">{job.job_type.replace(/_/g, ' ')}</span>
                      <span className="text-[10px] text-muted bg-background px-2 py-0.5 rounded border border-card-border font-mono">
                        {job.id.slice(0, 8)}
                      </span>
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                          job.status === 'COMPLETED'
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                            : job.status === 'PROCESSING'
                            ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                            : job.status === 'FAILED'
                            ? 'bg-red-500/10 text-red-400 border border-red-500/20'
                            : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                        }`}
                      >
                        {job.status}
                      </span>
                    </div>
                    <p className="text-xs text-muted">
                      Gallery: <span className="text-white font-medium">{job.gallery?.title || 'Studio Asset'}</span>
                      {job.photo?.original_filename && (
                        <span> • File: <span className="text-white font-mono">{job.photo.original_filename}</span></span>
                      )}
                      {' • '}{formatDate(job.created_at)}
                    </p>
                    {job.error_message && (
                      <p className="text-xs text-red-400 bg-red-500/10 p-2 rounded-lg border border-red-500/20 font-mono">
                        {job.error_message}
                      </p>
                    )}
                  </div>

                  <div className="flex items-center gap-6">
                    <div className="w-36 space-y-1">
                      <div className="flex justify-between text-[11px]">
                        <span className="text-muted">Progress</span>
                        <span className="text-white font-semibold">{job.progress}%</span>
                      </div>
                      <div className="h-1.5 w-full bg-background rounded-full overflow-hidden border border-card-border">
                        <div
                          className={`h-full rounded-full transition-all duration-300 ${
                            job.status === 'COMPLETED'
                              ? 'bg-emerald-400'
                              : job.status === 'FAILED'
                              ? 'bg-red-400'
                              : job.status === 'PROCESSING'
                              ? 'bg-blue-400 animate-pulse'
                              : 'bg-amber-400'
                          }`}
                          style={{ width: `${job.progress}%` }}
                        />
                      </div>
                    </div>

                    {job.status === 'FAILED' && (
                      <button
                        disabled={retryingId === job.id}
                        onClick={() => handleRetry(job.id)}
                        className="px-3 py-1.5 rounded-lg bg-red-500/20 text-red-400 hover:bg-red-500/30 text-xs font-semibold transition flex items-center gap-1.5 disabled:opacity-50"
                      >
                        {retryingId === job.id ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <RotateCcw className="h-3.5 w-3.5" />
                        )}
                        Retry
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
