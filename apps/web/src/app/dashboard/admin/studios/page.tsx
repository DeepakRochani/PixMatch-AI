'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  Building2,
  Search,
  Filter,
  ArrowUpDown,
  MoreVertical,
  ChevronLeft,
  ChevronRight,
  ShieldAlert,
  ShieldCheck,
  RefreshCw,
  AlertTriangle,
  ExternalLink,
  CheckCircle2,
  XCircle,
} from 'lucide-react';
import { fetchApi } from '@/lib/api-client';
import { AdminStudioItemDTO } from '@pixmatch/types';

function formatBytes(bytes: number): string {
  if (!bytes || bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

export default function AdminStudiosPage() {
  const [studios, setStudios] = useState<AdminStudioItemDTO[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [limit] = useState(15);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [planFilter, setPlanFilter] = useState('');
  const [sortBy, setSortBy] = useState('created_at');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [isLoading, setIsLoading] = useState(true);
  const [actionInProgress, setActionInProgress] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const loadStudios = async () => {
    setIsLoading(true);
    setMessage(null);
    try {
      const queryParams = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
        sortBy,
        sortOrder,
        ...(search ? { search } : {}),
        ...(statusFilter ? { status: statusFilter } : {}),
        ...(planFilter ? { plan: planFilter } : {}),
      });

      const res = await fetchApi<{
        studios: AdminStudioItemDTO[];
        total: number;
        page: number;
        limit: number;
        total_pages: number;
      }>(`/admin/studios?${queryParams.toString()}`);

      if (res.success && res.data) {
        setStudios(res.data.studios || []);
        setTotal(res.data.total || 0);
        setTotalPages(res.data.total_pages || 1);
      }
    } catch (_err) {
      setMessage({ type: 'error', text: 'Failed to load studios catalog' });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadStudios();
  }, [page, statusFilter, planFilter, sortBy, sortOrder]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    loadStudios();
  };

  const handleSuspend = async (studioId: string) => {
    if (!confirm('Are you sure you want to suspend this studio? All galleries, photos, and AI indices will remain completely intact.')) {
      return;
    }
    setActionInProgress(studioId);
    try {
      const res = await fetchApi(`/admin/studios/${studioId}/suspend`, {
        method: 'POST',
        body: JSON.stringify({ reason: 'Admin panel manual suspension' }),
      });
      if (res.success) {
        setMessage({ type: 'success', text: 'Studio suspended successfully (data preserved).' });
        loadStudios();
      } else {
        setMessage({ type: 'error', text: res.error?.message || 'Failed to suspend studio' });
      }
    } finally {
      setActionInProgress(null);
    }
  };

  const handleReactivate = async (studioId: string) => {
    setActionInProgress(studioId);
    try {
      const res = await fetchApi(`/admin/studios/${studioId}/reactivate`, {
        method: 'POST',
      });
      if (res.success) {
        setMessage({ type: 'success', text: 'Studio reactivated successfully.' });
        loadStudios();
      } else {
        setMessage({ type: 'error', text: res.error?.message || 'Failed to reactivate studio' });
      }
    } finally {
      setActionInProgress(null);
    }
  };

  const handleRecalculateUsage = async (studioId: string) => {
    setActionInProgress(studioId);
    try {
      const res = await fetchApi(`/admin/studios/${studioId}/recalculate-usage`, {
        method: 'POST',
      });
      if (res.success) {
        setMessage({ type: 'success', text: 'Studio usage recalculated successfully.' });
        loadStudios();
      } else {
        setMessage({ type: 'error', text: res.error?.message || 'Failed to recalculate usage' });
      }
    } finally {
      setActionInProgress(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2.5">
            <Building2 className="h-6 w-6 text-amber-400" /> Studios & Tenants
          </h1>
          <p className="text-xs text-muted mt-1">
            Manage photographer studio accounts, tenant lifecycle, plans, and storage footprints.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs text-muted font-mono">{total} total studio{total === 1 ? '' : 's'}</span>
          <button
            onClick={() => loadStudios()}
            disabled={isLoading}
            className="p-2 rounded-xl bg-[#131B2A] border border-card-border/80 text-muted hover:text-white transition"
            title="Refresh"
          >
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin text-amber-400' : ''}`} />
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

      {/* Search & Filter Toolbar */}
      <div className="rounded-2xl bg-[#0E1422] border border-card-border/80 p-4 flex flex-col md:flex-row gap-3 items-center justify-between">
        <form onSubmit={handleSearchSubmit} className="relative w-full md:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by studio name or slug..."
            className="w-full bg-[#131B2A] border border-card-border/80 rounded-xl pl-9 pr-4 py-2 text-xs text-white placeholder-muted focus:outline-none focus:border-amber-500/50"
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
            <option value="ACTIVE">Active</option>
            <option value="SUSPENDED">Suspended</option>
          </select>

          {/* Plan Filter */}
          <select
            value={planFilter}
            onChange={(e) => {
              setPlanFilter(e.target.value);
              setPage(1);
            }}
            className="bg-[#131B2A] border border-card-border/80 rounded-xl px-3 py-2 text-xs text-white focus:outline-none"
          >
            <option value="">All Plans</option>
            <option value="FREE">Free</option>
            <option value="STARTER">Starter</option>
            <option value="PRO">Professional</option>
            <option value="STUDIO">Studio</option>
            <option value="ENTERPRISE">Enterprise</option>
          </select>

          {/* Sort Order */}
          <button
            onClick={() => {
              setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
              setPage(1);
            }}
            className="px-3 py-2 rounded-xl bg-[#131B2A] border border-card-border/80 text-xs font-semibold text-white flex items-center gap-1.5 hover:border-card-border"
          >
            <ArrowUpDown className="h-3.5 w-3.5 text-amber-400" />
            <span>{sortOrder === 'asc' ? 'Ascending' : 'Descending'}</span>
          </button>
        </div>
      </div>

      {/* Studios Table */}
      <div className="rounded-2xl bg-[#0E1422] border border-card-border/80 overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#131B2A]/70 text-[10px] uppercase font-bold text-muted border-b border-card-border/80">
              <tr>
                <th className="px-5 py-3.5">Studio</th>
                <th className="px-5 py-3.5">Owner</th>
                <th className="px-5 py-3.5">Plan</th>
                <th className="px-5 py-3.5">Status</th>
                <th className="px-5 py-3.5 text-center">Galleries</th>
                <th className="px-5 py-3.5 text-center">Photos</th>
                <th className="px-5 py-3.5">Storage</th>
                <th className="px-5 py-3.5">AI Usage</th>
                <th className="px-5 py-3.5">Created</th>
                <th className="px-5 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-card-border/40 text-muted">
              {isLoading ? (
                <tr>
                  <td colSpan={10} className="px-6 py-12 text-center text-muted">
                    <div className="flex flex-col items-center gap-2">
                      <RefreshCw className="h-6 w-6 animate-spin text-amber-400" />
                      <span>Loading studios data...</span>
                    </div>
                  </td>
                </tr>
              ) : studios.length === 0 ? (
                <tr>
                  <td colSpan={10} className="px-6 py-12 text-center text-muted">
                    No studios found matching the criteria.
                  </td>
                </tr>
              ) : (
                studios.map((s) => (
                  <tr key={s.id} className="hover:bg-card-border/20 transition">
                    {/* Studio */}
                    <td className="px-5 py-4 font-semibold text-white">
                      <Link
                        href={`/dashboard/admin/studios/${s.id}`}
                        className="hover:text-amber-300 flex items-center gap-1.5 group"
                      >
                        <span>{s.name}</span>
                        <ExternalLink className="h-3 w-3 opacity-0 group-hover:opacity-100 text-amber-400 transition" />
                      </Link>
                      <span className="block text-[10px] text-muted font-mono">{s.slug}</span>
                    </td>

                    {/* Owner */}
                    <td className="px-5 py-4">
                      <span className="font-medium text-white/90">{s.owner_name}</span>
                      <span className="block text-[10px] text-muted">{s.owner_email}</span>
                    </td>

                    {/* Plan */}
                    <td className="px-5 py-4">
                      <span className="px-2 py-0.5 rounded bg-card-border text-white text-[10px] font-mono font-bold uppercase">
                        {s.plan}
                      </span>
                    </td>

                    {/* Status */}
                    <td className="px-5 py-4">
                      {s.is_suspended ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-red-500/10 text-red-400 border border-red-500/20 text-[10px] font-bold uppercase">
                          <XCircle className="h-3 w-3" /> Suspended
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px] font-bold uppercase">
                          <CheckCircle2 className="h-3 w-3" /> Active
                        </span>
                      )}
                    </td>

                    {/* Galleries & Photos */}
                    <td className="px-5 py-4 text-center text-white font-mono">{s.gallery_count}</td>
                    <td className="px-5 py-4 text-center text-white font-mono">{s.photo_count.toLocaleString()}</td>

                    {/* Storage */}
                    <td className="px-5 py-4 text-white font-mono">{formatBytes(s.storage_used_bytes)}</td>

                    {/* AI Usage */}
                    <td className="px-5 py-4">
                      <span className="text-amber-300 font-mono text-[11px]">
                        {s.ai_search_count} searches
                      </span>
                    </td>

                    {/* Created */}
                    <td className="px-5 py-4 text-[10px] font-mono">
                      {new Date(s.created_at).toLocaleDateString()}
                    </td>

                    {/* Actions */}
                    <td className="px-5 py-4 text-right space-x-1.5 whitespace-nowrap">
                      <button
                        onClick={() => handleRecalculateUsage(s.id)}
                        disabled={actionInProgress === s.id}
                        className="px-2 py-1 rounded bg-[#131B2A] border border-card-border/80 hover:border-amber-500/40 text-[10px] font-semibold text-white transition"
                        title="Recalculate Storage & AI Usage"
                      >
                        Recalculate
                      </button>

                      {s.is_suspended ? (
                        <button
                          onClick={() => handleReactivate(s.id)}
                          disabled={actionInProgress === s.id}
                          className="px-2.5 py-1 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 hover:bg-emerald-500/30 text-[10px] font-bold transition"
                        >
                          Reactivate
                        </button>
                      ) : (
                        <button
                          onClick={() => handleSuspend(s.id)}
                          disabled={actionInProgress === s.id}
                          className="px-2.5 py-1 rounded bg-red-500/20 text-red-300 border border-red-500/30 hover:bg-red-500/30 text-[10px] font-bold transition"
                        >
                          Suspend
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Controls */}
        <div className="p-4 bg-[#131B2A]/40 border-t border-card-border/80 flex items-center justify-between text-xs text-muted">
          <span>
            Page {page} of {totalPages} ({total} studios total)
          </span>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1 || isLoading}
              className="p-1.5 rounded-lg bg-[#131B2A] border border-card-border/80 text-white disabled:opacity-40 hover:border-amber-500/40"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages || isLoading}
              className="p-1.5 rounded-lg bg-[#131B2A] border border-card-border/80 text-white disabled:opacity-40 hover:border-amber-500/40"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
