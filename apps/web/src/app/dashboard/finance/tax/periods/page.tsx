'use client';

import React, { useState, useEffect } from 'react';
import { FinanceNavTabs } from '@/components/dashboard/FinanceNavTabs';
import { TaxNavTabs } from '@/components/dashboard/TaxNavTabs';
import { Calendar, Plus, RefreshCw, CheckCircle, AlertCircle, Play, Check, Lock } from 'lucide-react';

export default function TaxPeriodsPage() {
  const [loading, setLoading] = useState(true);
  const [periods, setPeriods] = useState<any[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const [form, setForm] = useState({
    period_code: '2026-Q3',
    period_name: 'Q3 2026 Tax Filing Period',
    period_type: 'QUARTERLY',
    start_date: '2026-07-01',
    end_date: '2026-09-30',
    due_date: '2026-10-20',
  });

  const loadData = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/finance/tax/periods');
      if (res.ok) {
        const data = await res.json();
        setPeriods(data || []);
      }
    } catch (err) {
      console.error('Failed to load tax periods:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSaving(true);
      setMessage(null);
      const res = await fetch('/api/finance/tax/periods', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          start_date: new Date(form.start_date),
          end_date: new Date(form.end_date),
          due_date: new Date(form.due_date),
        }),
      });
      if (res.ok) {
        setMessage({ type: 'success', text: 'Tax period created successfully.' });
        setShowModal(false);
        loadData();
      } else {
        const err = await res.json();
        setMessage({ type: 'error', text: err.error || 'Failed to create period.' });
      }
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message });
    } finally {
      setSaving(false);
    }
  };

  const handleTransition = async (id: string, action: 'review' | 'ready' | 'close') => {
    try {
      setActionLoading(true);
      setMessage(null);
      const res = await fetch(`/api/finance/tax/periods/${id}/${action}`, { method: 'POST' });
      if (res.ok) {
        setMessage({ type: 'success', text: `Period status advanced to ${action.toUpperCase()}.` });
        loadData();
      } else {
        const err = await res.json();
        setMessage({ type: 'error', text: err.error || 'Status update failed.' });
      }
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message });
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
            <Calendar className="h-6 w-6 text-primary" />
            Tax Periods & Filing Lifecycles
          </h1>
          <p className="text-xs text-muted mt-1">
            Manage tax period lifecycles: Open → Under Review → Ready to File → Closed
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={loadData}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-card-border bg-card hover:bg-card-border/50 text-xs text-muted hover:text-white transition-all"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Refresh
          </button>
          <button
            onClick={() => setShowModal(true)}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-primary hover:bg-primary-hover text-white text-xs font-semibold shadow transition-all"
          >
            <Plus className="h-3.5 w-3.5" />
            Open New Period
          </button>
        </div>
      </div>

      <FinanceNavTabs />
      <TaxNavTabs />

      {message && (
        <div
          className={`p-3 rounded-lg border text-xs flex items-center gap-2 ${
            message.type === 'success'
              ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
              : 'bg-rose-500/10 border-rose-500/20 text-rose-400'
          }`}
        >
          {message.type === 'success' ? <CheckCircle className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
          {message.text}
        </div>
      )}

      {/* Periods Table */}
      <div className="rounded-xl border border-card-border bg-card/60 overflow-hidden">
        <table className="w-full text-left text-xs">
          <thead className="bg-card-border/30 text-muted uppercase tracking-wider font-semibold border-b border-card-border">
            <tr>
              <th className="py-3 px-4">Period Code</th>
              <th className="py-3 px-4">Period Name</th>
              <th className="py-3 px-4">Type</th>
              <th className="py-3 px-4">Date Range</th>
              <th className="py-3 px-4">Due Date</th>
              <th className="py-3 px-4">Status</th>
              <th className="py-3 px-4 text-right">Workflow Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-card-border/40">
            {loading ? (
              <tr>
                <td colSpan={7} className="text-center py-8 text-muted">Loading tax periods...</td>
              </tr>
            ) : periods.length === 0 ? (
              <tr>
                <td colSpan={7} className="text-center py-8 text-muted">
                  No tax periods configured. Click "Open New Period" to initialize.
                </td>
              </tr>
            ) : (
              periods.map((p) => (
                <tr key={p.id} className="hover:bg-card-border/20 transition-colors">
                  <td className="py-3 px-4 font-mono font-medium text-primary">{p.period_code}</td>
                  <td className="py-3 px-4 font-medium text-white">{p.period_name}</td>
                  <td className="py-3 px-4 text-muted">{p.period_type}</td>
                  <td className="py-3 px-4 text-white/90">
                    {new Date(p.start_date).toLocaleDateString()} – {new Date(p.end_date).toLocaleDateString()}
                  </td>
                  <td className="py-3 px-4 font-mono text-amber-400/90">{p.due_date ? new Date(p.due_date).toLocaleDateString() : '-'}</td>
                  <td className="py-3 px-4">
                    <span className={`px-2 py-0.5 rounded text-[10px] ${
                      p.status === 'CLOSED'
                        ? 'bg-muted/20 text-muted border border-muted/30'
                        : p.status === 'READY_TO_FILE'
                        ? 'bg-primary/20 text-primary border border-primary/30 font-semibold'
                        : p.status === 'REVIEW'
                        ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                        : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                    }`}>
                      {p.status}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      {p.status === 'OPEN' && (
                        <button
                          onClick={() => handleTransition(p.id, 'review')}
                          disabled={actionLoading}
                          className="px-2.5 py-1 rounded bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[10px] font-medium transition-all flex items-center gap-1"
                        >
                          <Play className="h-3 w-3" />
                          Start Review
                        </button>
                      )}
                      {p.status === 'REVIEW' && (
                        <button
                          onClick={() => handleTransition(p.id, 'ready')}
                          disabled={actionLoading}
                          className="px-2.5 py-1 rounded bg-primary/20 hover:bg-primary/30 text-primary border border-primary/30 text-[10px] font-medium transition-all flex items-center gap-1"
                        >
                          <Check className="h-3 w-3" />
                          Ready to File
                        </button>
                      )}
                      {p.status === 'READY_TO_FILE' && (
                        <button
                          onClick={() => handleTransition(p.id, 'close')}
                          disabled={actionLoading}
                          className="px-2.5 py-1 rounded bg-muted/20 hover:bg-muted/30 text-white border border-card-border text-[10px] font-medium transition-all flex items-center gap-1"
                        >
                          <Lock className="h-3 w-3" />
                          Close Period
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Add Period Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4">
          <div className="bg-card border border-card-border rounded-xl p-6 max-w-md w-full space-y-4">
            <h3 className="text-sm font-semibold text-white">Open New Tax Period</h3>
            <form onSubmit={handleCreate} className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-muted mb-1">Period Code *</label>
                  <input
                    type="text"
                    required
                    value={form.period_code}
                    onChange={(e) => setForm({ ...form, period_code: e.target.value })}
                    placeholder="2026-Q3"
                    className="w-full px-3 py-2 rounded-lg bg-background border border-card-border text-white font-mono"
                  />
                </div>
                <div>
                  <label className="block text-muted mb-1">Period Type</label>
                  <select
                    value={form.period_type}
                    onChange={(e) => setForm({ ...form, period_type: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg bg-background border border-card-border text-white"
                  >
                    <option value="MONTHLY">Monthly</option>
                    <option value="QUARTERLY">Quarterly</option>
                    <option value="ANNUAL">Annual</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-muted mb-1">Period Name *</label>
                <input
                  type="text"
                  required
                  value={form.period_name}
                  onChange={(e) => setForm({ ...form, period_name: e.target.value })}
                  placeholder="Q3 2026 Tax Filing"
                  className="w-full px-3 py-2 rounded-lg bg-background border border-card-border text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-muted mb-1">Start Date *</label>
                  <input
                    type="date"
                    required
                    value={form.start_date}
                    onChange={(e) => setForm({ ...form, start_date: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg bg-background border border-card-border text-white"
                  />
                </div>
                <div>
                  <label className="block text-muted mb-1">End Date *</label>
                  <input
                    type="date"
                    required
                    value={form.end_date}
                    onChange={(e) => setForm({ ...form, end_date: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg bg-background border border-card-border text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-muted mb-1">Filing Due Date</label>
                <input
                  type="date"
                  value={form.due_date}
                  onChange={(e) => setForm({ ...form, due_date: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg bg-background border border-card-border text-white"
                />
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t border-card-border">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-3 py-1.5 rounded-lg border border-card-border text-muted hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-4 py-1.5 rounded-lg bg-primary hover:bg-primary-hover text-white font-semibold"
                >
                  {saving ? 'Creating...' : 'Open Period'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
