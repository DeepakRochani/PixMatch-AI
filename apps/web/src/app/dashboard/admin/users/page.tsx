'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  Users,
  Search,
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
  ShieldAlert,
  RefreshCw,
  CheckCircle2,
  XCircle,
  ArrowUpDown,
  ExternalLink,
} from 'lucide-react';
import { fetchApi } from '@/lib/api-client';
import { AdminUserItemDTO } from '@pixmatch/types';

export default function AdminUsersPage() {
  const [users, setUsers] = useState<AdminUserItemDTO[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [limit] = useState(15);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [sortBy, setSortBy] = useState('created_at');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [isLoading, setIsLoading] = useState(true);
  const [actionInProgress, setActionInProgress] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const loadUsers = async () => {
    setIsLoading(true);
    setMessage(null);
    try {
      const queryParams = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
        sortBy,
        sortOrder,
        ...(search ? { search } : {}),
        ...(roleFilter ? { role: roleFilter } : {}),
        ...(statusFilter ? { status: statusFilter } : {}),
      });

      const res = await fetchApi<{
        users: AdminUserItemDTO[];
        total: number;
        page: number;
        limit: number;
        total_pages: number;
      }>(`/admin/users?${queryParams.toString()}`);

      if (res.success && res.data) {
        setUsers(res.data.users || []);
        setTotal(res.data.total || 0);
        setTotalPages(res.data.total_pages || 1);
      }
    } catch (_err) {
      setMessage({ type: 'error', text: 'Failed to load users catalog' });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, [page, roleFilter, statusFilter, sortBy, sortOrder]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    loadUsers();
  };

  const handleSuspend = async (userId: string) => {
    if (!confirm('Suspend this user account?')) return;
    setActionInProgress(userId);
    try {
      const res = await fetchApi(`/admin/users/${userId}/suspend`, {
        method: 'POST',
        body: JSON.stringify({ reason: 'Admin panel manual user suspension' }),
      });
      if (res.success) {
        setMessage({ type: 'success', text: 'User suspended successfully.' });
        loadUsers();
      } else {
        setMessage({ type: 'error', text: res.error?.message || 'Failed to suspend user' });
      }
    } finally {
      setActionInProgress(null);
    }
  };

  const handleReactivate = async (userId: string) => {
    setActionInProgress(userId);
    try {
      const res = await fetchApi(`/admin/users/${userId}/reactivate`, { method: 'POST' });
      if (res.success) {
        setMessage({ type: 'success', text: 'User reactivated successfully.' });
        loadUsers();
      } else {
        setMessage({ type: 'error', text: res.error?.message || 'Failed to reactivate user' });
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
            <Users className="h-6 w-6 text-blue-400" /> Platform Users
          </h1>
          <p className="text-xs text-muted mt-1">
            Global directory of photographers, studio staff, clients, and platform operators.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs text-muted font-mono">{total} total user{total === 1 ? '' : 's'}</span>
          <button
            onClick={() => loadUsers()}
            disabled={isLoading}
            className="p-2 rounded-xl bg-[#131B2A] border border-card-border/80 text-muted hover:text-white transition"
            title="Refresh"
          >
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin text-blue-400' : ''}`} />
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
            placeholder="Search by name or email..."
            className="w-full bg-[#131B2A] border border-card-border/80 rounded-xl pl-9 pr-4 py-2 text-xs text-white placeholder-muted focus:outline-none focus:border-blue-500/50"
          />
        </form>

        <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto">
          {/* Role Filter */}
          <select
            value={roleFilter}
            onChange={(e) => {
              setRoleFilter(e.target.value);
              setPage(1);
            }}
            className="bg-[#131B2A] border border-card-border/80 rounded-xl px-3 py-2 text-xs text-white focus:outline-none"
          >
            <option value="">All Roles</option>
            <option value="SUPER_ADMIN">Super Admin</option>
            <option value="STUDIO_OWNER">Studio Owner</option>
            <option value="PHOTOGRAPHER">Photographer</option>
            <option value="CLIENT">Client</option>
          </select>

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

          <button
            onClick={() => {
              setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
              setPage(1);
            }}
            className="px-3 py-2 rounded-xl bg-[#131B2A] border border-card-border/80 text-xs font-semibold text-white flex items-center gap-1.5 hover:border-card-border"
          >
            <ArrowUpDown className="h-3.5 w-3.5 text-blue-400" />
            <span>{sortOrder === 'asc' ? 'Ascending' : 'Descending'}</span>
          </button>
        </div>
      </div>

      {/* Users Table */}
      <div className="rounded-2xl bg-[#0E1422] border border-card-border/80 overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#131B2A]/70 text-[10px] uppercase font-bold text-muted border-b border-card-border/80">
              <tr>
                <th className="px-5 py-3.5">User</th>
                <th className="px-5 py-3.5">Role</th>
                <th className="px-5 py-3.5">Status</th>
                <th className="px-5 py-3.5">Associated Studios</th>
                <th className="px-5 py-3.5">Created</th>
                <th className="px-5 py-3.5">Last Active</th>
                <th className="px-5 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-card-border/40 text-muted">
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-muted">
                    <div className="flex flex-col items-center gap-2">
                      <RefreshCw className="h-6 w-6 animate-spin text-blue-400" />
                      <span>Loading user directory...</span>
                    </div>
                  </td>
                </tr>
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-muted">
                    No users found matching search criteria.
                  </td>
                </tr>
              ) : (
                users.map((u) => (
                  <tr key={u.id} className="hover:bg-card-border/20 transition">
                    {/* User */}
                    <td className="px-5 py-4 font-semibold text-white">
                      <Link
                        href={`/dashboard/admin/users/${u.id}`}
                        className="hover:text-blue-300 flex items-center gap-1.5 group"
                      >
                        <span>{u.name}</span>
                        <ExternalLink className="h-3 w-3 opacity-0 group-hover:opacity-100 text-blue-400 transition" />
                      </Link>
                      <span className="block text-[10px] text-muted font-mono">{u.email}</span>
                    </td>

                    {/* Role */}
                    <td className="px-5 py-4">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase ${
                          u.role === 'SUPER_ADMIN'
                            ? 'bg-amber-500/15 text-amber-300 border border-amber-500/30'
                            : 'bg-card-border text-white'
                        }`}
                      >
                        {u.role}
                      </span>
                    </td>

                    {/* Status */}
                    <td className="px-5 py-4">
                      {u.is_suspended ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-red-500/10 text-red-400 border border-red-500/20 text-[10px] font-bold uppercase">
                          <XCircle className="h-3 w-3" /> Suspended
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px] font-bold uppercase">
                          <CheckCircle2 className="h-3 w-3" /> Active
                        </span>
                      )}
                    </td>

                    {/* Studios */}
                    <td className="px-5 py-4">
                      {u.primary_studio_name ? (
                        <div className="flex flex-col gap-0.5">
                          <span className="text-xs text-white font-medium">{u.primary_studio_name}</span>
                          {u.studios_count > 1 && (
                            <span className="text-[10px] text-muted">+{u.studios_count - 1} more</span>
                          )}
                        </div>
                      ) : (
                        <span className="text-[10px] text-muted/60">No studio memberships</span>
                      )}
                    </td>

                    {/* Created */}
                    <td className="px-5 py-4 text-[10px] font-mono">
                      {new Date(u.created_at).toLocaleDateString()}
                    </td>

                    {/* Last Active */}
                    <td className="px-5 py-4 text-[10px] font-mono">
                      {u.last_activity_at ? new Date(u.last_activity_at).toLocaleDateString() : '—'}
                    </td>

                    {/* Actions */}
                    <td className="px-5 py-4 text-right space-x-1.5 whitespace-nowrap">
                      {u.is_suspended ? (
                        <button
                          onClick={() => handleReactivate(u.id)}
                          disabled={actionInProgress === u.id}
                          className="px-2.5 py-1 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 hover:bg-emerald-500/30 text-[10px] font-bold transition"
                        >
                          Reactivate
                        </button>
                      ) : (
                        <button
                          onClick={() => handleSuspend(u.id)}
                          disabled={actionInProgress === u.id || u.role === 'SUPER_ADMIN'}
                          className="px-2.5 py-1 rounded bg-red-500/20 text-red-300 border border-red-500/30 hover:bg-red-500/30 text-[10px] font-bold transition disabled:opacity-40"
                          title={u.role === 'SUPER_ADMIN' ? 'Cannot suspend Super Admin' : 'Suspend user'}
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

        {/* Pagination */}
        <div className="p-4 bg-[#131B2A]/40 border-t border-card-border/80 flex items-center justify-between text-xs text-muted">
          <span>
            Page {page} of {totalPages} ({total} users total)
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
