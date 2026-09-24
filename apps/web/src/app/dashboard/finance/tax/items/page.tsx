'use client';

import React, { useState, useEffect } from 'react';
import { FinanceNavTabs } from '@/components/dashboard/FinanceNavTabs';
import { TaxNavTabs } from '@/components/dashboard/TaxNavTabs';
import { Package, Plus, RefreshCw, CheckCircle, AlertCircle } from 'lucide-react';

export default function TaxItemsMappingPage() {
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [rates, setRates] = useState<any[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const [form, setForm] = useState({
    item_type: 'SERVICE',
    item_code: 'PHOTO_WEDDING',
    item_name: 'Wedding Photography Package',
    sac_hsn_code: '998381',
    description: 'Commercial and event photography service',
    tax_category_id: '',
    tax_rate_id: '',
    reverse_charge: false,
    itc_eligibility: 'ELIGIBLE',
  });

  const loadData = async () => {
    try {
      setLoading(true);
      const [itemsRes, catRes, rateRes] = await Promise.all([
        fetch('/api/finance/tax/items'),
        fetch('/api/finance/tax/categories'),
        fetch('/api/finance/tax/rates'),
      ]);

      if (itemsRes.ok) setItems(await itemsRes.json());
      if (catRes.ok) setCategories(await catRes.json());
      if (rateRes.ok) setRates(await rateRes.json());
    } catch (err) {
      console.error('Failed to load item mappings:', err);
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
      const res = await fetch('/api/finance/tax/items', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      if (res.ok) {
        setMessage({ type: 'success', text: 'Item tax mapping saved successfully.' });
        setShowModal(false);
        loadData();
      } else {
        const err = await res.json();
        setMessage({ type: 'error', text: err.error || 'Failed to save item mapping.' });
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
            <Package className="h-6 w-6 text-primary" />
            SAC / HSN Product & Service Mappings
          </h1>
          <p className="text-xs text-muted mt-1">
            Map catalog products, packages, deliverables, and service lines to official SAC/HSN codes and tax rates
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
            Add Mapping
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

      {/* Items Table */}
      <div className="rounded-xl border border-card-border bg-card/60 overflow-hidden">
        <table className="w-full text-left text-xs">
          <thead className="bg-card-border/30 text-muted uppercase tracking-wider font-semibold border-b border-card-border">
            <tr>
              <th className="py-3 px-4">Item Code</th>
              <th className="py-3 px-4">Name</th>
              <th className="py-3 px-4">SAC / HSN</th>
              <th className="py-3 px-4">Type</th>
              <th className="py-3 px-4">Tax Rate</th>
              <th className="py-3 px-4">ITC Status</th>
              <th className="py-3 px-4">RCM</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-card-border/40">
            {loading ? (
              <tr>
                <td colSpan={7} className="text-center py-8 text-muted">Loading mappings...</td>
              </tr>
            ) : items.length === 0 ? (
              <tr>
                <td colSpan={7} className="text-center py-8 text-muted">
                  No SAC/HSN item mappings found. Add your photography packages and service lines here.
                </td>
              </tr>
            ) : (
              items.map((it) => (
                <tr key={it.id} className="hover:bg-card-border/20 transition-colors">
                  <td className="py-3 px-4 font-mono font-medium text-primary">{it.item_code}</td>
                  <td className="py-3 px-4 font-medium text-white">{it.item_name}</td>
                  <td className="py-3 px-4 font-mono text-white/90">{it.sac_hsn_code}</td>
                  <td className="py-3 px-4 text-muted">{it.item_type}</td>
                  <td className="py-3 px-4 font-mono text-white">
                    {it.tax_rate ? `${(it.tax_rate.rate_basis_points / 100).toFixed(2)}%` : 'Default'}
                  </td>
                  <td className="py-3 px-4">
                    <span className={`px-2 py-0.5 rounded text-[10px] ${
                      it.itc_eligibility === 'ELIGIBLE'
                        ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                        : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                    }`}>
                      {it.itc_eligibility}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-muted">{it.reverse_charge ? 'Yes' : 'No'}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Add Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4">
          <div className="bg-card border border-card-border rounded-xl p-6 max-w-md w-full space-y-4">
            <h3 className="text-sm font-semibold text-white">Add SAC/HSN Item Mapping</h3>
            <form onSubmit={handleCreate} className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-muted mb-1">Item Code *</label>
                  <input
                    type="text"
                    required
                    value={form.item_code}
                    onChange={(e) => setForm({ ...form, item_code: e.target.value.toUpperCase() })}
                    placeholder="e.g. PHOTO_EVENT"
                    className="w-full px-3 py-2 rounded-lg bg-background border border-card-border text-white font-mono uppercase"
                  />
                </div>
                <div>
                  <label className="block text-muted mb-1">SAC / HSN Code *</label>
                  <input
                    type="text"
                    required
                    value={form.sac_hsn_code}
                    onChange={(e) => setForm({ ...form, sac_hsn_code: e.target.value })}
                    placeholder="998381"
                    className="w-full px-3 py-2 rounded-lg bg-background border border-card-border text-white font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-muted mb-1">Item Name *</label>
                <input
                  type="text"
                  required
                  value={form.item_name}
                  onChange={(e) => setForm({ ...form, item_name: e.target.value })}
                  placeholder="e.g. Event Photography Service"
                  className="w-full px-3 py-2 rounded-lg bg-background border border-card-border text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-muted mb-1">Item Type</label>
                  <select
                    value={form.item_type}
                    onChange={(e) => setForm({ ...form, item_type: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg bg-background border border-card-border text-white"
                  >
                    <option value="SERVICE">Service (SAC)</option>
                    <option value="GOODS">Goods / Prints (HSN)</option>
                    <option value="PACKAGE">Package Bundle</option>
                  </select>
                </div>
                <div>
                  <label className="block text-muted mb-1">Tax Rate</label>
                  <select
                    value={form.tax_rate_id}
                    onChange={(e) => setForm({ ...form, tax_rate_id: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg bg-background border border-card-border text-white"
                  >
                    <option value="">Default Rate</option>
                    {rates.map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.name} ({(r.rate_basis_points / 100).toFixed(2)}%)
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex items-center gap-4 pt-2">
                <label className="flex items-center gap-2 cursor-pointer text-white">
                  <input
                    type="checkbox"
                    checked={form.reverse_charge}
                    onChange={(e) => setForm({ ...form, reverse_charge: e.target.checked })}
                    className="rounded border-card-border text-primary h-4 w-4 bg-background"
                  />
                  Reverse Charge (RCM)
                </label>
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
                  {saving ? 'Saving...' : 'Save Mapping'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
