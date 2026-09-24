'use client';

import React, { useState, useEffect } from 'react';
import { FinanceNavTabs } from '@/components/dashboard/FinanceNavTabs';
import { AccountingNavTabs } from '@/components/dashboard/AccountingNavTabs';
import {
  FileText,
  Plus,
  Search,
  Filter,
  ArrowRight,
  CheckCircle2,
  Clock,
  RotateCcw,
  Ban,
  RefreshCw,
} from 'lucide-react';
import Link from 'next/link';

interface JournalEntry {
  id: string;
  entry_number: string;
  entry_date: string;
  posting_date?: string;
  description: string;
  reference_type?: string;
  reference_id?: string;
  status: 'DRAFT' | 'POSTED' | 'REVERSED' | 'VOID';
  currency: string;
  total_debit_minor: number;
  total_credit_minor: number;
  reversal_of_entry_id?: string;
  lines: Array<{
    id: string;
    account: { code: string; name: string };
    debit_minor: number;
    credit_minor: number;
    description?: string;
  }>;
}

export default function JournalEntriesPage() {
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [search, setSearch] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newDesc, setNewDesc] = useState('');
  const [newDate, setNewDate] = useState(new Date().toISOString().split('T')[0]);
  const [creating, setCreating] = useState(false);

  const fetchEntries = async () => {
    try {
      setLoading(true);
      const query = statusFilter !== 'ALL' ? `?status=${statusFilter}` : '';
      const res = await fetch(`/api/finance/accounting/journal-entries${query}`);
      if (res.ok) {
        const data = await res.json();
        setEntries(data.entries || []);
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEntries();
  }, [statusFilter]);

  const handleCreateDraft = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setCreating(true);
      const res = await fetch('/api/finance/accounting/journal-entries', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          entry_date: newDate,
          description: newDesc,
          currency: 'USD',
          lines: [],
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setShowCreateModal(false);
        setNewDesc('');
        window.location.href = `/dashboard/finance/accounting/journal-entries/${data.journal_entry.id}`;
      }
    } catch {
      // ignore
    } finally {
      setCreating(false);
    }
  };

  const formatCurrency = (minorUnits: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
    }).format(minorUnits / 100);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'POSTED':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <CheckCircle2 className="h-3 w-3" /> POSTED
          </span>
        );
      case 'DRAFT':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20">
            <Clock className="h-3 w-3" /> DRAFT
          </span>
        );
      case 'REVERSED':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-purple-500/10 text-purple-400 border border-purple-500/20">
            <RotateCcw className="h-3 w-3" /> REVERSED
          </span>
        );
      case 'VOID':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-zinc-500/10 text-zinc-400 border border-zinc-500/20">
            <Ban className="h-3 w-3" /> VOID
          </span>
        );
      default:
        return null;
    }
  };

  const filteredEntries = entries.filter((e) => {
    return (
      e.entry_number.toLowerCase().includes(search.toLowerCase()) ||
      e.description.toLowerCase().includes(search.toLowerCase()) ||
      (e.reference_type && e.reference_type.toLowerCase().includes(search.toLowerCase()))
    );
  });

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
            <FileText className="h-6 w-6 text-primary" />
            Journal Entries
          </h1>
          <p className="text-sm text-muted">
            Record, balance, post, and reverse double-entry accounting transactions.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={fetchEntries}
            className="flex items-center gap-2 px-3 py-2 bg-card hover:bg-card-border/40 text-muted hover:text-white rounded-lg text-xs font-semibold border border-card-border transition-all"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Refresh
          </button>
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-primary hover:bg-primary/90 text-white rounded-lg text-xs font-semibold transition-all shadow-md shadow-primary/20"
          >
            <Plus className="h-4 w-4" />
            New Journal Entry
          </button>
        </div>
      </div>

      <FinanceNavTabs />
      <AccountingNavTabs />

      {/* Filter and Search */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-4 bg-card border border-card-border/60 rounded-xl">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted" />
          <input
            type="text"
            placeholder="Search entry #, description..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-surface-dark border border-card-border rounded-lg pl-9 pr-3 py-2 text-xs text-white placeholder-muted focus:outline-none focus:border-primary"
          />
        </div>
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Filter className="h-4 w-4 text-muted shrink-0" />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-surface-dark border border-card-border rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-primary"
          >
            <option value="ALL">All Statuses</option>
            <option value="POSTED">Posted (Immutable)</option>
            <option value="DRAFT">Draft (Editable)</option>
            <option value="REVERSED">Reversed</option>
            <option value="VOID">Void</option>
          </select>
        </div>
      </div>

      {/* Journal Entries List */}
      <div className="bg-card border border-card-border/60 rounded-xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-surface-dark/80 text-muted uppercase text-[10px] tracking-wider border-b border-card-border/60">
              <tr>
                <th className="py-3 px-4">Entry #</th>
                <th className="py-3 px-4">Date</th>
                <th className="py-3 px-4">Description</th>
                <th className="py-3 px-4">Source / Ref</th>
                <th className="py-3 px-4 text-right">Debit Total</th>
                <th className="py-3 px-4 text-right">Credit Total</th>
                <th className="py-3 px-4 text-center">Status</th>
                <th className="py-3 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-card-border/40 text-white">
              {loading ? (
                <tr>
                  <td colSpan={8} className="text-center py-8 text-muted">
                    Loading journal entries...
                  </td>
                </tr>
              ) : filteredEntries.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center py-8 text-muted">
                    No journal entries found.
                  </td>
                </tr>
              ) : (
                filteredEntries.map((entry) => (
                  <tr key={entry.id} className="hover:bg-surface-dark/40 transition-colors">
                    <td className="py-3 px-4 font-mono font-bold text-primary">
                      <Link
                        href={`/dashboard/finance/accounting/journal-entries/${entry.id}`}
                        className="hover:underline"
                      >
                        {entry.entry_number}
                      </Link>
                    </td>
                    <td className="py-3 px-4 text-muted">
                      {new Date(entry.entry_date).toLocaleDateString()}
                    </td>
                    <td className="py-3 px-4 font-medium max-w-sm truncate">
                      {entry.description}
                    </td>
                    <td className="py-3 px-4 text-muted font-mono text-[11px]">
                      {entry.reference_type ? `${entry.reference_type}` : 'MANUAL'}
                    </td>
                    <td className="py-3 px-4 text-right font-mono font-semibold">
                      {formatCurrency(entry.total_debit_minor)}
                    </td>
                    <td className="py-3 px-4 text-right font-mono font-semibold">
                      {formatCurrency(entry.total_credit_minor)}
                    </td>
                    <td className="py-3 px-4 text-center">
                      {getStatusBadge(entry.status)}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <Link
                        href={`/dashboard/finance/accounting/journal-entries/${entry.id}`}
                        className="text-primary hover:text-white inline-flex items-center gap-1 font-semibold text-xs"
                      >
                        View <ArrowRight className="h-3 w-3" />
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* New Draft Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="bg-card border border-card-border rounded-xl max-w-md w-full p-6 space-y-4 shadow-xl">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <Plus className="h-5 w-5 text-primary" />
              New Journal Entry Draft
            </h2>
            <form onSubmit={handleCreateDraft} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-muted mb-1">Entry Date</label>
                <input
                  type="date"
                  value={newDate}
                  onChange={(e) => setNewDate(e.target.value)}
                  className="w-full bg-surface-dark border border-card-border rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-primary"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-muted mb-1">Description / Memo</label>
                <textarea
                  placeholder="e.g. Monthly studio equipment depreciation, manual adjustment..."
                  value={newDesc}
                  onChange={(e) => setNewDesc(e.target.value)}
                  className="w-full bg-surface-dark border border-card-border rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-primary h-24"
                  required
                />
              </div>
              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-3 py-2 rounded-lg text-xs font-semibold text-muted hover:text-white bg-card-border/30 hover:bg-card-border/60 transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  className="px-4 py-2 rounded-lg text-xs font-semibold text-white bg-primary hover:bg-primary/90 transition-all disabled:opacity-50"
                >
                  {creating ? 'Creating Draft...' : 'Open Journal Editor'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
