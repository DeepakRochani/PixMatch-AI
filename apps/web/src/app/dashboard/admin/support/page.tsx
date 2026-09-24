'use client';

import React, { useEffect, useState } from 'react';
import {
  LifeBuoy,
  Plus,
  RefreshCw,
  Search,
  Sliders,
} from 'lucide-react';
import { fetchApi } from '@/lib/api-client';
import { PlatformSupportCaseDTO, SupportCasePriority, SupportCaseStatus } from '@pixmatch/types';

export default function AdminSupportPage() {
  const [cases, setCases] = useState<PlatformSupportCaseDTO[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [isCreating, setIsCreating] = useState(false);
  const [newCase, setNewCase] = useState({
    subject: '',
    description: '',
    priority: SupportCasePriority.MEDIUM,
    studio_id: '',
  });

  const loadCases = async () => {
    setIsLoading(true);
    try {
      const res = await fetchApi<{ total: number; cases: PlatformSupportCaseDTO[] }>('/admin/support/cases');
      if (res.success && res.data) {
        setCases(res.data.cases || []);
      }
    } catch (err) {
      console.error('Failed to load support cases', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadCases();
  }, []);

  const handleCreateCase = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await fetchApi('/admin/support/cases', {
        method: 'POST',
        body: JSON.stringify(newCase),
      });
      setIsCreating(false);
      setNewCase({
        subject: '',
        description: '',
        priority: SupportCasePriority.MEDIUM,
        studio_id: '',
      });
      loadCases();
    } catch (err) {
      console.error('Failed to create support case', err);
    }
  };

  const handleUpdateStatus = async (id: string, status: SupportCaseStatus) => {
    try {
      await fetchApi(`/admin/support/cases/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({ status }),
      });
      loadCases();
    } catch (err) {
      console.error('Failed to update case status', err);
    }
  };

  const filteredCases = cases.filter((c) => {
    const matchesSearch =
      c.subject.toLowerCase().includes(search.toLowerCase()) ||
      (c.studio_id?.toLowerCase().includes(search.toLowerCase()) ?? false);
    const matchesStatus = statusFilter === 'ALL' || c.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const getPriorityBadge = (priority: SupportCasePriority) => {
    switch (priority) {
      case SupportCasePriority.URGENT:
        return 'bg-red-500/20 text-red-400 border-red-500/30 font-bold';
      case SupportCasePriority.HIGH:
        return 'bg-amber-500/20 text-amber-400 border-amber-500/30';
      case SupportCasePriority.MEDIUM:
        return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
      case SupportCasePriority.LOW:
      default:
        return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2.5">
            <LifeBuoy className="h-6 w-6 text-amber-400" /> Platform Support Cases & Disputes
          </h1>
          <p className="text-xs text-muted mt-1">
            Track studio disputes, SLA deadlines, ticket assignments, and resolution notes.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => loadCases()}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-card-border/40 hover:bg-card-border/70 text-xs font-semibold text-white transition"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? 'animate-spin' : ''}`} /> Refresh
          </button>
          <button
            onClick={() => setIsCreating(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-black text-xs font-bold transition shadow-lg shadow-amber-500/20"
          >
            <Plus className="h-4 w-4" /> New Case
          </button>
        </div>
      </div>

      {/* Creation Modal / Inline Drawer */}
      {isCreating && (
        <div className="rounded-2xl border border-amber-500/30 bg-[#0E1422] p-6 space-y-4 shadow-xl">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Sliders className="h-4 w-4 text-amber-400" /> Open Support Case
            </h3>
            <button
              onClick={() => setIsCreating(false)}
              className="text-muted hover:text-white text-xs font-medium"
            >
              Cancel
            </button>
          </div>
          <form onSubmit={handleCreateCase} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="text-xs font-medium text-muted block mb-1">Subject</label>
              <input
                type="text"
                required
                value={newCase.subject}
                onChange={(e) => setNewCase({ ...newCase, subject: e.target.value })}
                className="w-full px-3 py-2 rounded-xl bg-[#070A0F] border border-card-border text-white text-xs focus:border-amber-500 outline-none"
                placeholder="Billing Discrepancy on Studio Subscription Renewal"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-muted block mb-1">Priority</label>
              <select
                value={newCase.priority}
                onChange={(e) => setNewCase({ ...newCase, priority: e.target.value as SupportCasePriority })}
                className="w-full px-3 py-2 rounded-xl bg-[#070A0F] border border-card-border text-white text-xs focus:border-amber-500 outline-none"
              >
                <option value={SupportCasePriority.LOW}>LOW (&lt;48h SLA)</option>
                <option value={SupportCasePriority.MEDIUM}>MEDIUM (&lt;24h SLA)</option>
                <option value={SupportCasePriority.HIGH}>HIGH (&lt;4h SLA)</option>
                <option value={SupportCasePriority.URGENT}>URGENT (&lt;2h SLA)</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-muted block mb-1">Studio ID (Optional)</label>
              <input
                type="text"
                value={newCase.studio_id}
                onChange={(e) => setNewCase({ ...newCase, studio_id: e.target.value })}
                className="w-full px-3 py-2 rounded-xl bg-[#070A0F] border border-card-border text-white text-xs font-mono focus:border-amber-500 outline-none"
                placeholder="studio_abc123"
              />
            </div>
            <div className="md:col-span-2">
              <label className="text-xs font-medium text-muted block mb-1">Description</label>
              <textarea
                required
                rows={3}
                value={newCase.description}
                onChange={(e) => setNewCase({ ...newCase, description: e.target.value })}
                className="w-full px-3 py-2 rounded-xl bg-[#070A0F] border border-card-border text-white text-xs focus:border-amber-500 outline-none"
                placeholder="Tenant reported unauthorized subscription upgrade attempt..."
              />
            </div>
            <div className="md:col-span-2 flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setIsCreating(false)}
                className="px-4 py-2 rounded-xl bg-card-border/40 text-xs font-semibold text-white hover:bg-card-border transition"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-black text-xs font-bold transition shadow-lg shadow-amber-500/20"
              >
                Create Support Case
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Filter Bar */}
      <div className="flex flex-col sm:flex-row gap-3 items-center justify-between bg-[#0E1422] p-4 rounded-2xl border border-card-border">
        <div className="relative w-full sm:w-80">
          <Search className="h-4 w-4 absolute left-3 top-2.5 text-muted" />
          <input
            type="text"
            placeholder="Search cases by subject or studio ID..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 rounded-xl bg-[#070A0F] border border-card-border text-white text-xs focus:border-amber-500 outline-none"
          />
        </div>
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <span className="text-xs text-muted whitespace-nowrap">Status:</span>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-1.5 rounded-xl bg-[#070A0F] border border-card-border text-white text-xs focus:border-amber-500 outline-none"
          >
            <option value="ALL">All Statuses</option>
            <option value={SupportCaseStatus.OPEN}>OPEN</option>
            <option value={SupportCaseStatus.IN_PROGRESS}>IN_PROGRESS</option>
            <option value={SupportCaseStatus.RESOLVED}>RESOLVED</option>
            <option value={SupportCaseStatus.CLOSED}>CLOSED</option>
          </select>
        </div>
      </div>

      {/* Cases List */}
      <div className="grid grid-cols-1 gap-4">
        {filteredCases.map((c) => (
          <div
            key={c.id}
            className="flex flex-col md:flex-row md:items-center justify-between p-5 rounded-2xl bg-[#0E1422] border border-card-border hover:border-card-border/80 transition gap-4"
          >
            <div className="space-y-1.5">
              <div className="flex items-center gap-2.5">
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded border uppercase tracking-wider ${getPriorityBadge(c.priority)}`}>
                  {c.priority}
                </span>
                <span className="text-sm font-semibold text-white">{c.subject}</span>
                <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-[#070A0F] text-muted border border-card-border">
                  {c.status}
                </span>
              </div>
              <p className="text-xs text-muted">{c.description}</p>
              <div className="flex items-center gap-4 text-[11px] text-muted/80 pt-1">
                {c.studio_id && <span>Studio: <strong className="text-white font-mono">{c.studio_id}</strong></span>}
                <span>Created: {new Date(c.created_at).toLocaleString()}</span>
                {c.resolved_at && (
                  <span className="text-emerald-400">Resolved: {new Date(c.resolved_at).toLocaleString()}</span>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2 self-end md:self-center">
              {c.status !== SupportCaseStatus.CLOSED && (
                <select
                  value={c.status}
                  onChange={(e) => handleUpdateStatus(c.id, e.target.value as SupportCaseStatus)}
                  className="px-3 py-1.5 rounded-xl bg-[#070A0F] border border-card-border text-white text-xs focus:border-amber-500 outline-none"
                >
                  <option value={SupportCaseStatus.OPEN}>OPEN</option>
                  <option value={SupportCaseStatus.IN_PROGRESS}>IN_PROGRESS</option>
                  <option value={SupportCaseStatus.RESOLVED}>RESOLVED</option>
                  <option value={SupportCaseStatus.CLOSED}>CLOSED</option>
                </select>
              )}
            </div>
          </div>
        ))}

        {filteredCases.length === 0 && !isLoading && (
          <div className="p-12 text-center rounded-2xl bg-[#0E1422] border border-card-border space-y-3">
            <LifeBuoy className="h-8 w-8 text-muted mx-auto" />
            <p className="text-xs text-muted">No support cases match your criteria.</p>
          </div>
        )}
      </div>
    </div>
  );
}
