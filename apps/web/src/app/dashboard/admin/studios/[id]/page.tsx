'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import {
  Building2,
  Users,
  CreditCard,
  HardDrive,
  Images,
  Sparkles,
  Activity,
  Receipt,
  ShieldAlert,
  ArrowLeft,
  CheckCircle2,
  XCircle,
  RefreshCw,
  AlertTriangle,
  ExternalLink,
} from 'lucide-react';
import { fetchApi } from '@/lib/api-client';
import { AdminStudioDetailDTO } from '@pixmatch/types';

function formatBytes(bytes: number): string {
  if (!bytes || bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

function formatINR(amountPaise: number): string {
  if (isNaN(amountPaise)) return '₹0';
  const rupees = amountPaise / 100;
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(rupees);
}

export default function AdminStudioDetailPage() {
  const params = useParams();
  const studioId = params.id as string;

  const [detail, setDetail] = useState<AdminStudioDetailDTO | null>(null);
  const [activeTab, setActiveTab] = useState<
    | 'overview'
    | 'members'
    | 'subscription'
    | 'usage'
    | 'galleries'
    | 'storage'
    | 'activity'
    | 'invoices'
    | 'audit'
  >('overview');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const loadStudioDetail = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetchApi<AdminStudioDetailDTO>(`/admin/studios/${studioId}`);
      if (res.success && res.data) {
        setDetail(res.data);
      } else {
        setError(res.error?.message || 'Studio not found');
      }
    } catch (_err) {
      setError('Failed to connect to API server');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (studioId) {
      loadStudioDetail();
    }
  }, [studioId]);

  const handleSuspend = async () => {
    if (!confirm('Suspend this studio? All customer assets and AI indices will be preserved.')) return;
    try {
      const res = await fetchApi(`/admin/studios/${studioId}/suspend`, {
        method: 'POST',
        body: JSON.stringify({ reason: 'Admin manual action from detail page' }),
      });
      if (res.success) {
        setActionMessage({ type: 'success', text: 'Studio suspended successfully.' });
        loadStudioDetail();
      } else {
        setActionMessage({ type: 'error', text: res.error?.message || 'Action failed' });
      }
    } catch {
      setActionMessage({ type: 'error', text: 'Network failure' });
    }
  };

  const handleReactivate = async () => {
    try {
      const res = await fetchApi(`/admin/studios/${studioId}/reactivate`, { method: 'POST' });
      if (res.success) {
        setActionMessage({ type: 'success', text: 'Studio reactivated successfully.' });
        loadStudioDetail();
      } else {
        setActionMessage({ type: 'error', text: res.error?.message || 'Action failed' });
      }
    } catch {
      setActionMessage({ type: 'error', text: 'Network failure' });
    }
  };

  const handleRecalculateUsage = async () => {
    try {
      const res = await fetchApi(`/admin/studios/${studioId}/recalculate-usage`, { method: 'POST' });
      if (res.success) {
        setActionMessage({ type: 'success', text: 'Storage and AI usage recalculated.' });
        loadStudioDetail();
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
          <RefreshCw className="h-6 w-6 animate-spin text-amber-400" />
          <span className="text-xs text-muted">Loading studio metadata...</span>
        </div>
      </div>
    );
  }

  if (error || !detail) {
    return (
      <div className="p-8 text-center space-y-4">
        <AlertTriangle className="h-10 w-10 text-red-400 mx-auto" />
        <h2 className="text-lg font-bold text-white">Studio Not Found</h2>
        <p className="text-xs text-muted">{error || 'The requested studio does not exist.'}</p>
        <Link
          href="/dashboard/admin/studios"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-card-border text-xs font-semibold text-white"
        >
          <ArrowLeft className="h-4 w-4" /> Back to Studios List
        </Link>
      </div>
    );
  }

  const s = detail.studio;

  return (
    <div className="space-y-6">
      {/* Back Button & Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link
            href="/dashboard/admin/studios"
            className="p-2 rounded-xl bg-[#131B2A] border border-card-border/80 text-muted hover:text-white transition"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-2xl font-bold tracking-tight text-white">{s.name}</h1>
              {s.is_suspended ? (
                <span className="px-2.5 py-0.5 rounded bg-red-500/10 text-red-400 border border-red-500/20 text-[10px] font-bold uppercase">
                  Suspended
                </span>
              ) : (
                <span className="px-2.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px] font-bold uppercase">
                  Active
                </span>
              )}
            </div>
            <p className="text-xs text-muted font-mono mt-0.5">{s.slug} • ID: {s.id}</p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          <button
            onClick={handleRecalculateUsage}
            className="px-3 py-1.5 rounded-xl bg-[#131B2A] border border-card-border/80 text-xs font-semibold text-white hover:border-amber-500/40 transition"
          >
            Recalculate Usage
          </button>
          {s.is_suspended ? (
            <button
              onClick={handleReactivate}
              className="px-3 py-1.5 rounded-xl bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 hover:bg-emerald-500/30 text-xs font-bold transition"
            >
              Reactivate Studio
            </button>
          ) : (
            <button
              onClick={handleSuspend}
              className="px-3 py-1.5 rounded-xl bg-red-500/20 text-red-300 border border-red-500/30 hover:bg-red-500/30 text-xs font-bold transition"
            >
              Suspend Studio
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

      {/* Tabs Navigation */}
      <div className="border-b border-card-border/80 flex gap-2 overflow-x-auto pb-1 text-xs">
        {[
          { id: 'overview', label: 'Overview', icon: Building2 },
          { id: 'members', label: `Members (${detail.members.length})`, icon: Users },
          { id: 'subscription', label: 'Subscription', icon: CreditCard },
          { id: 'usage', label: 'Usage & Limits', icon: HardDrive },
          { id: 'galleries', label: `Galleries (${detail.galleries.length})`, icon: Images },
          { id: 'storage', label: `Storage (${detail.storage_connections.length})`, icon: HardDrive },
          { id: 'activity', label: 'Activity', icon: Activity },
          { id: 'invoices', label: `Invoices (${detail.invoices.length})`, icon: Receipt },
          { id: 'audit', label: `Audit (${detail.recent_audit_logs.length})`, icon: ShieldAlert },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 px-3.5 py-2.5 font-semibold rounded-xl transition whitespace-nowrap ${
                isActive
                  ? 'bg-amber-500/15 text-amber-300 border border-amber-500/30'
                  : 'text-muted hover:text-white hover:bg-card-border/30'
              }`}
            >
              <Icon className={`h-4 w-4 ${isActive ? 'text-amber-400' : 'text-muted'}`} />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Tab Contents */}
      {/* 1. Overview Tab */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="md:col-span-2 rounded-2xl bg-[#0E1422] border border-card-border/80 p-6 space-y-4">
            <h3 className="text-sm font-bold text-white">Studio Profile</h3>
            <div className="grid grid-cols-2 gap-4 text-xs">
              <div>
                <span className="text-muted block text-[11px]">Owner Name</span>
                <span className="font-semibold text-white">{s.owner_name || '—'}</span>
              </div>
              <div>
                <span className="text-muted block text-[11px]">Owner Email</span>
                <span className="font-semibold text-white">{s.owner_email || '—'}</span>
              </div>
              <div>
                <span className="text-muted block text-[11px]">Website</span>
                <span className="font-semibold text-white">{s.website || 'None configured'}</span>
              </div>
              <div>
                <span className="text-muted block text-[11px]">Created At</span>
                <span className="font-mono text-white">{new Date(s.created_at).toLocaleString()}</span>
              </div>
            </div>
          </div>

          <div className="rounded-2xl bg-[#0E1422] border border-card-border/80 p-6 space-y-4">
            <h3 className="text-sm font-bold text-white">Current Footprint</h3>
            <div className="space-y-3 text-xs">
              <div className="flex justify-between">
                <span className="text-muted">Total Galleries:</span>
                <span className="font-bold text-white">{s.gallery_count}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted">Total Photos:</span>
                <span className="font-bold text-white">{s.photo_count.toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted">Storage Used:</span>
                <span className="font-bold text-white">{formatBytes(s.storage_used_bytes)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted">AI Searches:</span>
                <span className="font-bold text-amber-300">{s.ai_search_count}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 2. Members Tab */}
      {activeTab === 'members' && (
        <div className="rounded-2xl bg-[#0E1422] border border-card-border/80 overflow-hidden">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#131B2A]/70 text-[10px] uppercase font-bold text-muted border-b border-card-border/80">
              <tr>
                <th className="px-5 py-3">Member</th>
                <th className="px-5 py-3">Role</th>
                <th className="px-5 py-3">Joined</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-card-border/40 text-muted">
              {detail.members.map((m) => (
                <tr key={m.id}>
                  <td className="px-5 py-3 font-semibold text-white">
                    {m.name}
                    <span className="block text-[10px] text-muted">{m.email}</span>
                  </td>
                  <td className="px-5 py-3">
                    <span className="px-2 py-0.5 rounded bg-card-border text-white text-[10px] font-mono uppercase">
                      {m.role}
                    </span>
                  </td>
                  <td className="px-5 py-3 font-mono text-[10px]">
                    {new Date(m.created_at).toLocaleDateString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* 3. Subscription Tab */}
      {activeTab === 'subscription' && (
        <div className="rounded-2xl bg-[#0E1422] border border-card-border/80 p-6 space-y-4">
          <h3 className="text-sm font-bold text-white">Subscription & Tier Details</h3>
          {detail.subscription ? (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
              <div>
                <span className="text-muted block text-[11px]">Plan</span>
                <span className="font-bold text-white font-mono uppercase">{detail.subscription.plan}</span>
              </div>
              <div>
                <span className="text-muted block text-[11px]">Status</span>
                <span className="font-bold text-emerald-400 uppercase">{detail.subscription.status}</span>
              </div>
              <div>
                <span className="text-muted block text-[11px]">Billing Interval</span>
                <span className="font-medium text-white">{detail.subscription.billing_interval || 'monthly'}</span>
              </div>
              <div>
                <span className="text-muted block text-[11px]">Provider</span>
                <span className="font-medium text-white">Stripe / Platform</span>
              </div>
            </div>
          ) : (
            <p className="text-xs text-muted">No active subscription record found for this studio (Default Free tier).</p>
          )}
        </div>
      )}

      {/* 4. Usage & Limits Tab */}
      {activeTab === 'usage' && (
        <div className="rounded-2xl bg-[#0E1422] border border-card-border/80 p-6 space-y-4">
          <h3 className="text-sm font-bold text-white">Resource Consumption & Quotas</h3>
          <div className="space-y-4 text-xs">
            <div>
              <div className="flex justify-between mb-1">
                <span className="text-muted">Storage: {formatBytes(s.storage_used_bytes)}</span>
                <span className="font-bold text-white">{formatBytes(s.storage_used_bytes)} used</span>
              </div>
              <div className="w-full bg-[#131B2A] rounded-full h-2">
                <div className="bg-amber-500 h-2 rounded-full" style={{ width: '35%' }} />
              </div>
            </div>
            <div>
              <div className="flex justify-between mb-1">
                <span className="text-muted">AI Searches: {s.ai_search_count} searches</span>
                <span className="font-bold text-cyan-400">{s.ai_search_count} used</span>
              </div>
              <div className="w-full bg-[#131B2A] rounded-full h-2">
                <div className="bg-cyan-500 h-2 rounded-full" style={{ width: '25%' }} />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 5. Galleries Tab */}
      {activeTab === 'galleries' && (
        <div className="rounded-2xl bg-[#0E1422] border border-card-border/80 overflow-hidden">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#131B2A]/70 text-[10px] uppercase font-bold text-muted border-b border-card-border/80">
              <tr>
                <th className="px-5 py-3">Gallery Title</th>
                <th className="px-5 py-3">Status</th>
                <th className="px-5 py-3 text-center">Photos</th>
                <th className="px-5 py-3">Created</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-card-border/40 text-muted">
              {detail.galleries.map((g) => (
                <tr key={g.id}>
                  <td className="px-5 py-3 font-semibold text-white">{g.title}</td>
                  <td className="px-5 py-3">
                    <span className="px-2 py-0.5 rounded bg-card-border text-white text-[10px] uppercase">
                      {g.status}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-center font-mono text-white">{g.photo_count}</td>
                  <td className="px-5 py-3 font-mono text-[10px]">{new Date(g.created_at).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* 6. Storage Tab */}
      {activeTab === 'storage' && (
        <div className="rounded-2xl bg-[#0E1422] border border-card-border/80 p-6 space-y-4">
          <h3 className="text-sm font-bold text-white">Connected Cloud Providers</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {detail.storage_connections.map((conn) => (
              <div key={conn.id} className="p-4 rounded-xl bg-[#131B2A] border border-card-border text-xs space-y-2">
                <div className="flex justify-between items-center">
                  <span className="font-bold text-white uppercase">{conn.provider}</span>
                  <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 font-bold uppercase">
                    {conn.status}
                  </span>
                </div>
                <p className="text-[11px] text-muted">Storage: {formatBytes(conn.storage_used_bytes)}</p>
                <p className="text-[10px] text-muted font-mono">
                  Connected: {new Date(conn.created_at).toLocaleDateString()}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 7. Activity Tab */}
      {activeTab === 'activity' && (
        <div className="rounded-2xl bg-[#0E1422] border border-card-border/80 p-6 space-y-3">
          <h3 className="text-sm font-bold text-white">Recent Studio Events</h3>
          <div className="space-y-2 text-xs">
            {detail.recent_audit_logs.map((act) => (
              <div key={act.id} className="p-3 rounded-xl bg-[#131B2A] flex justify-between items-center">
                <div>
                  <span className="font-semibold text-white">{act.action}</span>
                  <span className="block text-[10px] text-muted font-mono">{act.resource_type}</span>
                </div>
                <span className="text-[10px] font-mono text-muted">{new Date(act.created_at).toLocaleTimeString()}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 8. Invoices Tab */}
      {activeTab === 'invoices' && (
        <div className="rounded-2xl bg-[#0E1422] border border-card-border/80 overflow-hidden">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#131B2A]/70 text-[10px] uppercase font-bold text-muted border-b border-card-border/80">
              <tr>
                <th className="px-5 py-3">Invoice ID</th>
                <th className="px-5 py-3">Amount</th>
                <th className="px-5 py-3">Status</th>
                <th className="px-5 py-3">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-card-border/40 text-muted">
              {detail.invoices.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-5 py-6 text-center text-muted">
                    No historical invoices recorded.
                  </td>
                </tr>
              ) : (
                detail.invoices.map((inv) => (
                  <tr key={inv.id}>
                    <td className="px-5 py-3 font-mono text-white">{inv.id.slice(0, 12)}</td>
                    <td className="px-5 py-3 font-bold text-white">{formatINR(inv.amount)}</td>
                    <td className="px-5 py-3">
                      <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 text-[10px] font-bold uppercase">
                        {inv.status}
                      </span>
                    </td>
                    <td className="px-5 py-3 font-mono text-[10px]">
                      {new Date(inv.created_at).toLocaleDateString()}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* 9. Audit Tab */}
      {activeTab === 'audit' && (
        <div className="rounded-2xl bg-[#0E1422] border border-card-border/80 p-6 space-y-3">
          <h3 className="text-sm font-bold text-white">Append-Only Studio Audit Trail</h3>
          <div className="space-y-2 text-xs">
            {detail.recent_audit_logs.map((log) => (
              <div key={log.id} className="p-3 rounded-xl bg-[#131B2A] flex justify-between items-center">
                <div>
                  <span className="font-bold text-amber-400">{log.action}</span>
                  <span className="block text-[10px] text-muted">
                    {log.resource_type}
                  </span>
                </div>
                <span className="text-[10px] font-mono text-muted">{new Date(log.created_at).toLocaleString()}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
