'use client';

import React, { useEffect, useState } from 'react';
import {
  ShieldAlert,
  Search,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  Lock,
  Code,
  X,
  Calendar,
} from 'lucide-react';
import { fetchApi } from '@/lib/api-client';
import { AdminAuditLogDTO } from '@pixmatch/types';

export default function AdminAuditPage() {
  const [logs, setLogs] = useState<AdminAuditLogDTO[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [limit] = useState(15);
  const [totalPages, setTotalPages] = useState(1);
  const [actionFilter, setActionFilter] = useState('');
  const [entityFilter, setEntityFilter] = useState('');
  const [search, setSearch] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [selectedMetadata, setSelectedMetadata] = useState<{ action: string; meta: any } | null>(null);

  const loadLogs = async () => {
    setIsLoading(true);
    try {
      const queryParams = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
        ...(actionFilter ? { action: actionFilter } : {}),
        ...(entityFilter ? { entity: entityFilter } : {}),
        ...(search ? { search } : {}),
      });

      const res = await fetchApi<{
        logs: AdminAuditLogDTO[];
        total: number;
        page: number;
        limit: number;
        total_pages: number;
      }>(`/admin/audit?${queryParams.toString()}`);

      if (res.success && res.data) {
        setLogs(res.data.logs || []);
        setTotal(res.data.total || 0);
        setTotalPages(res.data.total_pages || 1);
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadLogs();
  }, [page, actionFilter, entityFilter]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    loadLogs();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2.5">
            <ShieldAlert className="h-6 w-6 text-amber-400" /> Platform Security & Audit Logs
          </h1>
          <p className="text-xs text-muted mt-1">
            Strictly append-only security event trail documenting all administrative operations and tenant modifications.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs text-muted font-mono">{total} total event{total === 1 ? '' : 's'}</span>
          <button
            onClick={() => loadLogs()}
            disabled={isLoading}
            className="p-2 rounded-xl bg-[#131B2A] border border-card-border/80 text-muted hover:text-white transition"
          >
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin text-amber-400' : ''}`} />
          </button>
        </div>
      </div>

      {/* Append-Only Guarantee Banner */}
      <div className="rounded-2xl bg-amber-500/10 border border-amber-500/30 p-4 flex items-center gap-3 text-xs text-amber-200">
        <Lock className="h-4 w-4 text-amber-400 flex-shrink-0" />
        <span>
          <strong>Immutable Audit Trail:</strong> Security audit logs are append-only. There is no administrative endpoint or interface capable of modifying or deleting historical audit log records.
        </span>
      </div>

      {/* Toolbar */}
      <div className="rounded-2xl bg-[#0E1422] border border-card-border/80 p-4 flex flex-col md:flex-row gap-3 items-center justify-between">
        <form onSubmit={handleSearchSubmit} className="relative w-full md:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search action or entity ID..."
            className="w-full bg-[#131B2A] border border-card-border/80 rounded-xl pl-9 pr-4 py-2 text-xs text-white placeholder-muted focus:outline-none focus:border-amber-500/50"
          />
        </form>

        <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto">
          {/* Action Filter */}
          <select
            value={actionFilter}
            onChange={(e) => {
              setActionFilter(e.target.value);
              setPage(1);
            }}
            className="bg-[#131B2A] border border-card-border/80 rounded-xl px-3 py-2 text-xs text-white focus:outline-none"
          >
            <option value="">All Actions</option>
            <option value="ADMIN_LOGIN">ADMIN_LOGIN</option>
            <option value="STUDIO_SUSPENDED">STUDIO_SUSPENDED</option>
            <option value="STUDIO_REACTIVATED">STUDIO_REACTIVATED</option>
            <option value="USER_SUSPENDED">USER_SUSPENDED</option>
            <option value="USER_REACTIVATED">USER_REACTIVATED</option>
            <option value="PLAN_CREATED">PLAN_CREATED</option>
            <option value="PLAN_UPDATED">PLAN_UPDATED</option>
            <option value="PLAN_ARCHIVED">PLAN_ARCHIVED</option>
            <option value="JOB_RETRIED">JOB_RETRIED</option>
            <option value="USAGE_RECALCULATED">USAGE_RECALCULATED</option>
          </select>

          {/* Entity Filter */}
          <select
            value={entityFilter}
            onChange={(e) => {
              setEntityFilter(e.target.value);
              setPage(1);
            }}
            className="bg-[#131B2A] border border-card-border/80 rounded-xl px-3 py-2 text-xs text-white focus:outline-none"
          >
            <option value="">All Entities</option>
            <option value="STUDIO">STUDIO</option>
            <option value="USER">USER</option>
            <option value="PLAN">PLAN</option>
            <option value="JOB">JOB</option>
            <option value="ADMIN">ADMIN</option>
          </select>
        </div>
      </div>

      {/* Audit Table */}
      <div className="rounded-2xl bg-[#0E1422] border border-card-border/80 overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#131B2A]/70 text-[10px] uppercase font-bold text-muted border-b border-card-border/80">
              <tr>
                <th className="px-5 py-3.5">Timestamp</th>
                <th className="px-5 py-3.5">Actor</th>
                <th className="px-5 py-3.5">Action</th>
                <th className="px-5 py-3.5">Entity</th>
                <th className="px-5 py-3.5">Entity ID</th>
                <th className="px-5 py-3.5 text-right">Metadata</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-card-border/40 text-muted">
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-muted">
                    <div className="flex flex-col items-center gap-2">
                      <RefreshCw className="h-6 w-6 animate-spin text-amber-400" />
                      <span>Loading audit records...</span>
                    </div>
                  </td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-muted">
                    No audit records matching criteria.
                  </td>
                </tr>
              ) : (
                logs.map((log) => (
                  <tr key={log.id} className="hover:bg-card-border/20 transition">
                    {/* Timestamp */}
                    <td className="px-5 py-4 font-mono text-[10px] text-white">
                      {new Date(log.timestamp).toLocaleString()}
                    </td>

                    {/* Actor */}
                    <td className="px-5 py-4">
                      <span className="font-semibold text-white">{log.actor_name || 'System Operator'}</span>
                      <span className="block text-[10px] text-muted font-mono">{log.actor_email || log.actor_role}</span>
                    </td>

                    {/* Action */}
                    <td className="px-5 py-4">
                      <span className="px-2 py-0.5 rounded bg-amber-500/10 text-amber-300 border border-amber-500/20 text-[10px] font-mono font-bold uppercase">
                        {log.action}
                      </span>
                    </td>

                    {/* Entity */}
                    <td className="px-5 py-4 font-bold text-white uppercase font-mono text-[10px]">
                      {log.entity}
                    </td>

                    {/* Entity ID */}
                    <td className="px-5 py-4 font-mono text-[10px] text-muted">
                      {log.entity_id || '—'}
                    </td>

                    {/* Metadata */}
                    <td className="px-5 py-4 text-right">
                      {log.metadata ? (
                        <button
                          onClick={() => setSelectedMetadata({ action: log.action, meta: log.metadata })}
                          className="px-2 py-1 rounded bg-[#131B2A] border border-card-border text-[10px] font-semibold text-white hover:border-amber-500/40 inline-flex items-center gap-1"
                        >
                          <Code className="h-3 w-3 text-amber-400" /> View JSON
                        </button>
                      ) : (
                        <span className="text-[10px] text-muted">—</span>
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
            Page {page} of {totalPages} ({total} events total)
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

      {/* Metadata JSON Viewer Modal */}
      {selectedMetadata && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#0E1422] border border-card-border rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-card-border pb-3">
              <h3 className="text-sm font-bold text-white font-mono">Event Metadata: {selectedMetadata.action}</h3>
              <button onClick={() => setSelectedMetadata(null)} className="text-muted hover:text-white">
                <X className="h-4 w-4" />
              </button>
            </div>
            <pre className="p-4 rounded-xl bg-[#131B2A] border border-card-border/80 text-[11px] font-mono text-amber-300 overflow-x-auto max-h-72">
              {JSON.stringify(selectedMetadata.meta, null, 2)}
            </pre>
            <div className="flex justify-end">
              <button
                onClick={() => setSelectedMetadata(null)}
                className="px-4 py-2 rounded-xl bg-card-border text-white text-xs font-semibold hover:bg-card-border/80"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
