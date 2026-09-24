'use client';

import React, { useState, useEffect } from 'react';
import { FinanceNavTabs } from '@/components/dashboard/FinanceNavTabs';
import { AccountingNavTabs } from '@/components/dashboard/AccountingNavTabs';
import {
  CalendarDays,
  Plus,
  Lock,
  Unlock,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
} from 'lucide-react';

interface Period {
  id: string;
  name: string;
  start_date: string;
  end_date: string;
  status: 'OPEN' | 'CLOSED' | 'LOCKED';
  closed_at?: string;
  closed_by?: string;
}

export default function AccountingPeriodsPage() {
  const [periods, setPeriods] = useState<Period[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [name, setName] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  const fetchPeriods = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/finance/accounting/periods');
      if (res.ok) {
        const data = await res.json();
        setPeriods(data.periods || []);
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPeriods();
  }, []);

  const handleCreatePeriod = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSaving(true);
      const res = await fetch('/api/finance/accounting/periods', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          start_date: startDate,
          end_date: endDate,
        }),
      });
      if (res.ok) {
        setMessage({ text: 'Accounting period created successfully', type: 'success' });
        setShowModal(false);
        setName('');
        setStartDate('');
        setEndDate('');
        fetchPeriods();
      } else {
        const err = await res.json();
        setMessage({ text: err.error || 'Failed to create period', type: 'error' });
      }
    } catch {
      setMessage({ text: 'Error creating period', type: 'error' });
    } finally {
      setSaving(false);
    }
  };

  const handleClosePeriod = async (id: string) => {
    if (!confirm('Are you sure you want to CLOSE this accounting period? Journal entries cannot be posted to closed periods.')) return;
    try {
      const res = await fetch(`/api/finance/accounting/periods/${id}/close`, { method: 'POST' });
      if (res.ok) {
        setMessage({ text: 'Accounting period closed', type: 'success' });
        fetchPeriods();
      } else {
        const err = await res.json();
        setMessage({ text: err.error || 'Failed to close period', type: 'error' });
      }
    } catch {
      // ignore
    }
  };

  const handleReopenPeriod = async (id: string) => {
    const reason = prompt('Reason for reopening this closed accounting period:', 'Audit adjustments');
    if (!reason) return;
    try {
      const res = await fetch(`/api/finance/accounting/periods/${id}/reopen`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason }),
      });
      if (res.ok) {
        setMessage({ text: 'Accounting period reopened', type: 'success' });
        fetchPeriods();
      } else {
        const err = await res.json();
        setMessage({ text: err.error || 'Failed to reopen period', type: 'error' });
      }
    } catch {
      // ignore
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
            <CalendarDays className="h-6 w-6 text-primary" />
            Accounting Periods
          </h1>
          <p className="text-sm text-muted">
            Manage fiscal periods, period locking, and prevent unauthorized historical journal postings.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={fetchPeriods}
            className="flex items-center gap-2 px-3 py-2 bg-card hover:bg-card-border/40 text-muted hover:text-white rounded-lg text-xs font-semibold border border-card-border transition-all"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Refresh
          </button>
          <button
            onClick={() => setShowModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-primary hover:bg-primary/90 text-white rounded-lg text-xs font-semibold transition-all shadow-md shadow-primary/20"
          >
            <Plus className="h-4 w-4" />
            New Period
          </button>
        </div>
      </div>

      <FinanceNavTabs />
      <AccountingNavTabs />

      {message && (
        <div className={`p-3 rounded-lg text-xs font-semibold ${
          message.type === 'success' ? 'bg-emerald-950/40 text-emerald-300 border border-emerald-800/40' : 'bg-rose-950/40 text-rose-300 border border-rose-800/40'
        }`}>
          {message.text}
        </div>
      )}

      {/* Periods Table */}
      <div className="bg-card border border-card-border/60 rounded-xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-surface-dark/80 text-muted uppercase text-[10px] tracking-wider border-b border-card-border/60">
              <tr>
                <th className="py-3 px-4">Period Name</th>
                <th className="py-3 px-4">Start Date</th>
                <th className="py-3 px-4">End Date</th>
                <th className="py-3 px-4 text-center">Status</th>
                <th className="py-3 px-4">Closed At</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-card-border/40 text-white">
              {loading ? (
                <tr>
                  <td colSpan={6} className="text-center py-8 text-muted">
                    Loading periods...
                  </td>
                </tr>
              ) : periods.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-8 text-muted">
                    No accounting periods configured. Add a fiscal period to enable period lock controls.
                  </td>
                </tr>
              ) : (
                periods.map((p) => (
                  <tr key={p.id} className="hover:bg-surface-dark/40 transition-colors">
                    <td className="py-3 px-4 font-semibold text-primary">{p.name}</td>
                    <td className="py-3 px-4 text-muted">{new Date(p.start_date).toLocaleDateString()}</td>
                    <td className="py-3 px-4 text-muted">{new Date(p.end_date).toLocaleDateString()}</td>
                    <td className="py-3 px-4 text-center">
                      <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded text-[10px] font-bold border ${
                        p.status === 'OPEN'
                          ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                          : p.status === 'CLOSED'
                          ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                          : 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                      }`}>
                        {p.status === 'OPEN' ? <Unlock className="h-3 w-3" /> : <Lock className="h-3 w-3" />}
                        {p.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-muted">
                      {p.closed_at ? new Date(p.closed_at).toLocaleString() : '—'}
                    </td>
                    <td className="py-3 px-4 text-right">
                      {p.status === 'OPEN' && (
                        <button
                          onClick={() => handleClosePeriod(p.id)}
                          className="px-2.5 py-1 bg-amber-950/40 hover:bg-amber-900/60 text-amber-300 border border-amber-800/40 rounded text-[11px] font-semibold transition-all"
                        >
                          Close Period
                        </button>
                      )}
                      {p.status === 'CLOSED' && (
                        <button
                          onClick={() => handleReopenPeriod(p.id)}
                          className="px-2.5 py-1 bg-emerald-950/40 hover:bg-emerald-900/60 text-emerald-300 border border-emerald-800/40 rounded text-[11px] font-semibold transition-all"
                        >
                          Reopen Period
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create Period Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="bg-card border border-card-border rounded-xl max-w-md w-full p-6 space-y-4 shadow-xl">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <Plus className="h-5 w-5 text-primary" />
              New Accounting Period
            </h2>
            <form onSubmit={handleCreatePeriod} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-muted mb-1">Period Name</label>
                <input
                  type="text"
                  placeholder="e.g. Q4 2026 Fiscal Quarter"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-surface-dark border border-card-border rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-primary"
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-semibold text-muted mb-1">Start Date</label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full bg-surface-dark border border-card-border rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-primary"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-muted mb-1">End Date</label>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full bg-surface-dark border border-card-border rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-primary"
                    required
                  />
                </div>
              </div>
              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-3 py-2 rounded-lg text-xs font-semibold text-muted hover:text-white bg-card-border/30 hover:bg-card-border/60 transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-4 py-2 rounded-lg text-xs font-semibold text-white bg-primary hover:bg-primary/90 transition-all disabled:opacity-50"
                >
                  {saving ? 'Creating...' : 'Create Period'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
