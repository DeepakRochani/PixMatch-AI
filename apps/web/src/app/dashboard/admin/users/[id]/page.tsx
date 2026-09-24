'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import {
  Users,
  Building2,
  ShieldCheck,
  ShieldAlert,
  ArrowLeft,
  CheckCircle2,
  XCircle,
  RefreshCw,
  AlertTriangle,
  Activity,
} from 'lucide-react';
import { fetchApi } from '@/lib/api-client';
import { AdminUserDetailDTO } from '@pixmatch/types';

export default function AdminUserDetailPage() {
  const params = useParams();
  const userId = params.id as string;

  const [detail, setDetail] = useState<AdminUserDetailDTO | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const loadUserDetail = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetchApi<AdminUserDetailDTO>(`/admin/users/${userId}`);
      if (res.success && res.data) {
        setDetail(res.data);
      } else {
        setError(res.error?.message || 'User not found');
      }
    } catch {
      setError('Failed to connect to API server');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (userId) {
      loadUserDetail();
    }
  }, [userId]);

  const handleSuspend = async () => {
    if (!confirm('Suspend this user account?')) return;
    try {
      const res = await fetchApi(`/admin/users/${userId}/suspend`, {
        method: 'POST',
        body: JSON.stringify({ reason: 'Admin panel manual action' }),
      });
      if (res.success) {
        setActionMessage({ type: 'success', text: 'User suspended successfully.' });
        loadUserDetail();
      } else {
        setActionMessage({ type: 'error', text: res.error?.message || 'Action failed' });
      }
    } catch {
      setActionMessage({ type: 'error', text: 'Network failure' });
    }
  };

  const handleReactivate = async () => {
    try {
      const res = await fetchApi(`/admin/users/${userId}/reactivate`, { method: 'POST' });
      if (res.success) {
        setActionMessage({ type: 'success', text: 'User reactivated successfully.' });
        loadUserDetail();
      } else {
        setActionMessage({ type: 'error', text: res.error?.message || 'Action failed' });
      }
    } catch {
      setActionMessage({ type: 'error', text: 'Network failure' });
    }
  };

  if (isLoading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <div className="flex flex-col items-center gap-2">
          <RefreshCw className="h-6 w-6 animate-spin text-blue-400" />
          <span className="text-xs text-muted">Loading user profile...</span>
        </div>
      </div>
    );
  }

  if (error || !detail) {
    return (
      <div className="p-8 text-center space-y-4">
        <AlertTriangle className="h-10 w-10 text-red-400 mx-auto" />
        <h2 className="text-lg font-bold text-white">User Not Found</h2>
        <p className="text-xs text-muted">{error || 'The requested user account does not exist.'}</p>
        <Link
          href="/dashboard/admin/users"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-card-border text-xs font-semibold text-white"
        >
          <ArrowLeft className="h-4 w-4" /> Back to Users List
        </Link>
      </div>
    );
  }

  const u = detail.user;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link
            href="/dashboard/admin/users"
            className="p-2 rounded-xl bg-[#131B2A] border border-card-border/80 text-muted hover:text-white transition"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-2xl font-bold tracking-tight text-white">{u.name}</h1>
              {u.is_suspended ? (
                <span className="px-2.5 py-0.5 rounded bg-red-500/10 text-red-400 border border-red-500/20 text-[10px] font-bold uppercase">
                  Suspended
                </span>
              ) : (
                <span className="px-2.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px] font-bold uppercase">
                  Active
                </span>
              )}
            </div>
            <p className="text-xs text-muted font-mono mt-0.5">{u.email} • ID: {u.id}</p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          {u.is_suspended ? (
            <button
              onClick={handleReactivate}
              className="px-3 py-1.5 rounded-xl bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 hover:bg-emerald-500/30 text-xs font-bold transition"
            >
              Reactivate User
            </button>
          ) : (
            <button
              onClick={handleSuspend}
              disabled={u.role === 'SUPER_ADMIN'}
              className="px-3 py-1.5 rounded-xl bg-red-500/20 text-red-300 border border-red-500/30 hover:bg-red-500/30 text-xs font-bold transition disabled:opacity-40"
              title={u.role === 'SUPER_ADMIN' ? 'Cannot suspend Super Admin' : 'Suspend user account'}
            >
              Suspend User
            </button>
          )}
        </div>
      </div>

      {actionMessage && (
        <div
          className={`p-4 rounded-xl border text-xs flex items-center justify-between ${
            actionMessage.type === 'success'
              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
              : 'bg-red-500/10 border-red-500/30 text-red-300'
          }`}
        >
          <span>{actionMessage.text}</span>
          <button onClick={() => setActionMessage(null)} className="text-xs underline ml-4">
            Dismiss
          </button>
        </div>
      )}

      {/* Grid: Profile & Memberships */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Profile Card */}
        <div className="rounded-2xl bg-[#0E1422] border border-card-border/80 p-6 space-y-4">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <Users className="h-4 w-4 text-blue-400" /> Account Profile
          </h3>
          <div className="space-y-3 text-xs">
            <div className="flex justify-between">
              <span className="text-muted">Full Name:</span>
              <span className="font-semibold text-white">{u.name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted">Email Address:</span>
              <span className="font-mono text-white">{u.email}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted">Platform Role:</span>
              <span className="font-bold text-amber-300 font-mono uppercase">{u.role}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted">Registered:</span>
              <span className="font-mono text-white">{new Date(u.created_at).toLocaleString()}</span>
            </div>
          </div>
        </div>

        {/* Studio Memberships */}
        <div className="rounded-2xl bg-[#0E1422] border border-card-border/80 p-6 space-y-4">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <Building2 className="h-4 w-4 text-amber-400" /> Studio Memberships
          </h3>
          {detail.memberships.length === 0 ? (
            <p className="text-xs text-muted">No studio memberships found for this user.</p>
          ) : (
            <div className="space-y-2">
              {detail.memberships.map((m) => (
                <div
                  key={m.studio_id}
                  className="p-3 rounded-xl bg-[#131B2A] border border-card-border/60 flex justify-between items-center text-xs"
                >
                  <div>
                    <span className="font-semibold text-white">{m.studio_name}</span>
                    <span className="block text-[10px] text-muted font-mono">{m.studio_slug}</span>
                  </div>
                  <span className="px-2 py-0.5 rounded bg-card-border text-white text-[10px] font-mono uppercase">
                    {m.role}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Audit Trail */}
      <div className="rounded-2xl bg-[#0E1422] border border-card-border/80 p-6 space-y-4">
        <h3 className="text-sm font-bold text-white flex items-center gap-2">
          <ShieldAlert className="h-4 w-4 text-amber-400" /> User Audit & Activity Log
        </h3>
        {detail.recent_activity.length === 0 ? (
          <p className="text-xs text-muted">No audit events recorded for this user.</p>
        ) : (
          <div className="space-y-2 text-xs">
            {detail.recent_activity.map((log) => (
              <div key={log.id} className="p-3 rounded-xl bg-[#131B2A] flex justify-between items-center">
                <div>
                  <span className="font-bold text-amber-400">{log.action}</span>
                  <span className="block text-[10px] text-muted">Resource: {log.resource_type}</span>
                </div>
                <span className="text-[10px] font-mono text-muted">{new Date(log.created_at).toLocaleString()}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
