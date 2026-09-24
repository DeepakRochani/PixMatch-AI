'use client';

import React, { useState, useEffect } from 'react';
import { FinanceNavTabs } from '@/components/dashboard/FinanceNavTabs';
import { TaxNavTabs } from '@/components/dashboard/TaxNavTabs';
import { Percent, Plus, RefreshCw, CheckCircle, AlertCircle } from 'lucide-react';

export default function TaxRatesPage() {
  const [loading, setLoading] = useState(true);
  const [rates, setRates] = useState<any[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const [form, setForm] = useState({
    rate_code: 'GST_18',
    name: 'GST 18% (Standard Rate)',
    rate_basis_points: 1800,
    cgst_basis_points: 900,
    sgst_basis_points: 900,
    igst_basis_points: 1800,
    cess_basis_points: 0,
    is_compound: false,
    effective_from: new Date().toISOString().split('T')[0],
  });

  const loadData = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/finance/tax/rates');
      if (res.ok) {
        const data = await res.json();
        setRates(data || []);
      }
    } catch (err) {
      console.error('Failed to load tax rates:', err);
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
      const res = await fetch('/api/finance/tax/rates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          rate_basis_points: Number(form.rate_basis_points),
          cgst_basis_points: Number(form.cgst_basis_points),
          sgst_basis_points: Number(form.sgst_basis_points),
          igst_basis_points: Number(form.igst_basis_points),
          cess_basis_points: Number(form.cess_basis_points),
          effective_from: new Date(form.effective_from),
        }),
      });
      if (res.ok) {
        setMessage({ type: 'success', text: 'Tax rate defined successfully.' });
        setShowModal(false);
        loadData();
      } else {
        const err = await res.json();
        setMessage({ type: 'error', text: err.error || 'Failed to create tax rate.' });
      }
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
            <Percent className="h-6 w-6 text-primary" />
            Tax Rates (Integer Basis Points)
          </h1>
          <p className="text-xs text-muted mt-1">
            Exact integer tax rates (100 bps = 1%) ensuring float-free GST splits (CGST + SGST = IGST)
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
            Add Tax Rate
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

      {/* Rates Table */}
      <div className="rounded-xl border border-card-border bg-card/60 overflow-hidden">
        <table className="w-full text-left text-xs">
          <thead className="bg-card-border/30 text-muted uppercase tracking-wider font-semibold border-b border-card-border">
            <tr>
              <th className="py-3 px-4">Rate Code</th>
              <th className="py-3 px-4">Name</th>
              <th className="py-3 px-4">Total Rate</th>
              <th className="py-3 px-4">CGST</th>
              <th className="py-3 px-4">SGST</th>
              <th className="py-3 px-4">IGST</th>
              <th className="py-3 px-4">CESS</th>
              <th className="py-3 px-4">Effective From</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-card-border/40">
            {loading ? (
              <tr>
                <td colSpan={8} className="text-center py-8 text-muted">Loading tax rates...</td>
              </tr>
            ) : rates.length === 0 ? (
              <tr>
                <td colSpan={8} className="text-center py-8 text-muted">
                  No tax rates configured yet.
                </td>
              </tr>
            ) : (
              rates.map((r) => (
                <tr key={r.id} className="hover:bg-card-border/20 transition-colors">
                  <td className="py-3 px-4 font-mono font-medium text-primary">{r.rate_code}</td>
                  <td className="py-3 px-4 font-medium text-white">{r.name}</td>
                  <td className="py-3 px-4 font-mono font-bold text-white">
                    {(r.rate_basis_points / 100).toFixed(2)}% ({r.rate_basis_points} bps)
                  </td>
                  <td className="py-3 px-4 font-mono text-muted">{((r.cgst_basis_points || 0) / 100).toFixed(2)}%</td>
                  <td className="py-3 px-4 font-mono text-muted">{((r.sgst_basis_points || 0) / 100).toFixed(2)}%</td>
                  <td className="py-3 px-4 font-mono text-muted">{((r.igst_basis_points || 0) / 100).toFixed(2)}%</td>
                  <td className="py-3 px-4 font-mono text-muted">{((r.cess_basis_points || 0) / 100).toFixed(2)}%</td>
                  <td className="py-3 px-4 text-muted">{new Date(r.effective_from).toLocaleDateString()}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Add Rate Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4">
          <div className="bg-card border border-card-border rounded-xl p-6 max-w-lg w-full space-y-4">
            <h3 className="text-sm font-semibold text-white">Add Tax Rate (Basis Points)</h3>
            <form onSubmit={handleCreate} className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-muted mb-1">Rate Code *</label>
                  <input
                    type="text"
                    required
                    value={form.rate_code}
                    onChange={(e) => setForm({ ...form, rate_code: e.target.value.toUpperCase() })}
                    placeholder="GST_18"
                    className="w-full px-3 py-2 rounded-lg bg-background border border-card-border text-white font-mono uppercase"
                  />
                </div>
                <div>
                  <label className="block text-muted mb-1">Rate Name *</label>
                  <input
                    type="text"
                    required
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    placeholder="GST 18%"
                    className="w-full px-3 py-2 rounded-lg bg-background border border-card-border text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-muted mb-1">Total Rate (bps) *</label>
                  <input
                    type="number"
                    required
                    value={form.rate_basis_points}
                    onChange={(e) => {
                      const val = Number(e.target.value) || 0;
                      const half = Math.floor(val / 2);
                      setForm({
                        ...form,
                        rate_basis_points: val,
                        cgst_basis_points: half,
                        sgst_basis_points: val - half,
                        igst_basis_points: val,
                      });
                    }}
                    placeholder="1800"
                    className="w-full px-3 py-2 rounded-lg bg-background border border-card-border text-white font-mono"
                  />
                  <span className="text-[10px] text-muted">{form.rate_basis_points / 100}%</span>
                </div>
                <div>
                  <label className="block text-muted mb-1">CGST (bps)</label>
                  <input
                    type="number"
                    value={form.cgst_basis_points}
                    onChange={(e) => setForm({ ...form, cgst_basis_points: Number(e.target.value) || 0 })}
                    className="w-full px-3 py-2 rounded-lg bg-background border border-card-border text-white font-mono"
                  />
                </div>
                <div>
                  <label className="block text-muted mb-1">SGST (bps)</label>
                  <input
                    type="number"
                    value={form.sgst_basis_points}
                    onChange={(e) => setForm({ ...form, sgst_basis_points: Number(e.target.value) || 0 })}
                    className="w-full px-3 py-2 rounded-lg bg-background border border-card-border text-white font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-muted mb-1">IGST (bps)</label>
                  <input
                    type="number"
                    value={form.igst_basis_points}
                    onChange={(e) => setForm({ ...form, igst_basis_points: Number(e.target.value) || 0 })}
                    className="w-full px-3 py-2 rounded-lg bg-background border border-card-border text-white font-mono"
                  />
                </div>
                <div>
                  <label className="block text-muted mb-1">CESS (bps)</label>
                  <input
                    type="number"
                    value={form.cess_basis_points}
                    onChange={(e) => setForm({ ...form, cess_basis_points: Number(e.target.value) || 0 })}
                    className="w-full px-3 py-2 rounded-lg bg-background border border-card-border text-white font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-muted mb-1">Effective Date</label>
                <input
                  type="date"
                  value={form.effective_from}
                  onChange={(e) => setForm({ ...form, effective_from: e.target.value })}
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
                  {saving ? 'Saving...' : 'Save Tax Rate'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
