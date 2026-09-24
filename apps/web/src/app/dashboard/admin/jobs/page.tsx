'use client';

import React, { useEffect, useState } from 'react';
import {
  ListRestart,
  Search,
  RefreshCw,
  RotateCw,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  XCircle,
  Clock,
  Cpu,
} from 'lucide-react';
import { fetchApi } from '@/lib/api-client';
import { AdminJobItemDTO } from '@pixmatch/types';

export default function AdminJobsPage() {
  const [jobs, setJobs] = useState<AdminJobItemDTO[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [limit] = useState(15);
  const [totalPages, setTotalPages] = useState(1);
  const [statusFilter, setStatusFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [search, setSearch] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [retryingJobId, setRetryingJobId] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const loadJobs = async () => {
    setIsLoading(true);
    try {
      const queryParams = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
        ...(statusFilter ? { status: statusFilter } : {}),
        ...(typeFilter ? { type: typeFilter } : {}),
        ...(search ? { search } : {}),
      });

      const res = await fetchApi<{
        jobs: AdminJobItemDTO[];
        total: number;
        page: number;
        limit: number;
        total_pages: number;
      }>(`/admin/jobs?${queryParams.toString()}`);

      if (res.success && res.data) {
        setJobs(res.data.jobs || []);
        setTotal(res.data.total || 0);
        setTotalPages(res.data.total_pages || 1);
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadJobs();
  }, [page, statusFilter, typeFilter]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    loadJobs();
  };

  const handleRetryJob = async (jobId: string) => {
    setRetryingJobId(jobId);
    setMessage(null);
    try {
      const res = await fetchApi(`/admin/jobs/${jobId}/retry`, { method: 'POST' });
      if (res.success) {
        setMessage({ type: 'success', text: `Job ${jobId} scheduled for idempotent retry in BullMQ queue.` });
        loadJobs();
      } else {
        setMessage({ type: 'error', text: res.error?.message || 'Failed to retry job' });
      }
    } catch {
      setMessage({ type: 'error', text: 'Network failure' });
    } finally {
      setRetryingJobId(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2.5">
            <ListRestart className="h-6 w-6 text-cyan-400" /> Background Processing Jobs
          </h1>
          <p className="text-xs text-muted mt-1">
            Global BullMQ job queues, image optimization pipelines, AI face indexing tasks, and ZIP package workers.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs text-muted font-mono">{total} total job{total === 1 ? '' : 's'}</span>
          <button
            onClick={() => loadJobs()}
            disabled={isLoading}
            className="p-2 rounded-xl bg-[#131B2A] border border-card-border/80 text-muted hover:text-white transition"
          >
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin text-cyan-400' : ''}`} />
          </button>
        </div>
      </div>

      {message && (
        <div
          className={`p-4 rounded-xl border text-xs flex items-center justify-between ${
            message.type === 'success'
              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
              : 'bg-red-500/10 border-red-500/30 text-red-300'
          }`}
        >
          <span>{message.text}</span>
          <button onClick={() => setMessage(null)} className="text-xs underline ml-4">
            Dismiss
          </button>
        </div>
      )}

      {/* Toolbar */}
      <div className="rounded-2xl bg-[#0E1422] border border-card-border/80 p-4 flex flex-col md:flex-row gap-3 items-center justify-between">
        <form onSubmit={handleSearchSubmit} className="relative w-full md:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by Job ID or Studio..."
            className="w-full bg-[#131B2A] border border-card-border/80 rounded-xl pl-9 pr-4 py-2 text-xs text-white placeholder-muted focus:outline-none focus:border-cyan-500/50"
          />
        </form>

        <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto">
          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setPage(1);
            }}
            className="bg-[#131B2A] border border-card-border/80 rounded-xl px-3 py-2 text-xs text-white focus:outline-none"
          >
            <option value="">All Statuses</option>
            <option value="QUEUED">Queued</option>
            <option value="PROCESSING">Processing</option>
            <option value="COMPLETED">Completed</option>
            <option value="FAILED">Failed</option>
          </select>

          {/* Type Filter */}
          <select
            value={typeFilter}
            onChange={(e) => {
              setTypeFilter(e.target.value);
              setPage(1);
            }}
            className="bg-[#131B2A] border border-card-border/80 rounded-xl px-3 py-2 text-xs text-white focus:outline-none"
          >
            <option value="">All Job Types</option>
            <option value="PHOTO_PROCESS">Photo Processing</option>
            <option value="FACE_DETECTION">AI Face Detection</option>
            <option value="ZIP_EXPORT">ZIP Export Archive</option>
            <option value="STORAGE_SYNC">Storage Sync</option>
          </select>
        </div>
      </div>

      {/* Jobs Table */}
      <div className="rounded-2xl bg-[#0E1422] border border-card-border/80 overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#131B2A]/70 text-[10px] uppercase font-bold text-muted border-b border-card-border/80">
              <tr>
                <th className="px-5 py-3.5">Job ID & Type</th>
                <th className="px-5 py-3.5">Status</th>
                <th className="px-5 py-3.5">Progress</th>
                <th className="px-5 py-3.5">Studio / Tenant</th>
                <th className="px-5 py-3.5">Created</th>
                <th className="px-5 py-3.5">Error Info</th>
                <th className="px-5 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-card-border/40 text-muted">
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-muted">
                    <div className="flex flex-col items-center gap-2">
                      <RefreshCw className="h-6 w-6 animate-spin text-cyan-400" />
                      <span>Loading job queue telemetry...</span>
                    </div>
                  </td>
                </tr>
              ) : jobs.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-muted">
                    No processing jobs found matching criteria.
                  </td>
                </tr>
              ) : (
                jobs.map((job) => (
                  <tr key={job.id} className="hover:bg-card-border/20 transition">
                    {/* Job ID & Type */}
                    <td className="px-5 py-4 font-semibold text-white">
                      <span className="font-mono text-cyan-300 block">{job.job_type}</span>
                      <span className="text-[10px] text-muted font-mono">{job.id}</span>
                    </td>

                    {/* Status */}
                    <td className="px-5 py-4">
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                          job.status === 'COMPLETED'
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                            : job.status === 'PROCESSING'
                            ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20'
                            : job.status === 'FAILED'
                            ? 'bg-red-500/10 text-red-400 border border-red-500/20'
                            : 'bg-card-border text-white'
                        }`}
                      >
                        {job.status}
                      </span>
                    </td>

                    {/* Progress */}
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-2">
                        <div className="w-16 bg-[#131B2A] rounded-full h-1.5">
                          <div
                            className={`h-1.5 rounded-full ${
                              job.status === 'COMPLETED'
                                ? 'bg-emerald-500'
                                : job.status === 'FAILED'
                                ? 'bg-red-500'
                                : 'bg-cyan-500'
                            }`}
                            style={{ width: `${job.progress}%` }}
                          />
                        </div>
                        <span className="font-mono text-[10px] text-white">{job.progress}%</span>
                      </div>
                    </td>

                    {/* Studio */}
                    <td className="px-5 py-4">
                      <span className="text-white font-medium">{job.studio_name || 'System Queue'}</span>
                    </td>

                    {/* Created */}
                    <td className="px-5 py-4 font-mono text-[10px]">
                      {new Date(job.created_at).toLocaleTimeString()}
                    </td>

                    {/* Error */}
                    <td className="px-5 py-4 max-w-xs truncate text-[11px] text-red-300 font-mono">
                      {job.error_message || '—'}
                    </td>

                    {/* Actions */}
                    <td className="px-5 py-4 text-right">
                      {job.status === 'FAILED' && (
                        <button
                          onClick={() => handleRetryJob(job.id)}
                          disabled={retryingJobId === job.id}
                          className="flex items-center gap-1 px-2.5 py-1 rounded bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 hover:bg-cyan-500/30 text-[10px] font-bold transition ml-auto"
                        >
                          <RotateCw className={`h-3 w-3 ${retryingJobId === job.id ? 'animate-spin' : ''}`} />
                          Retry
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="p-4 bg-[#131B2A]/40 border-t border-card-border/80 flex items-center justify-between text-xs text-muted">
          <span>
            Page {page} of {totalPages} ({total} jobs total)
          </span>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1 || isLoading}
              className="p-1.5 rounded-lg bg-[#131B2A] border border-card-border/80 text-white disabled:opacity-40"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages || isLoading}
              className="p-1.5 rounded-lg bg-[#131B2A] border border-card-border/80 text-white disabled:opacity-40"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
