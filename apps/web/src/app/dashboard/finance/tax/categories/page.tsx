'use client';

import React, { useState, useEffect } from 'react';
import { FinanceNavTabs } from '@/components/dashboard/FinanceNavTabs';
import { TaxNavTabs } from '@/components/dashboard/TaxNavTabs';
import { Tags, Plus, RefreshCw, CheckCircle, AlertCircle } from 'lucide-react';

export default function TaxCategoriesPage() {
  const [loading, setLoading] = useState(true);
  const [categories, setCategories] = useState<any[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const [form, setForm] = useState({
    category_code: '',
    name: '',
    description: '',
    taxability: 'TAXABLE',
    default_sac_hsn_code: '998381',
    is_service: true,
  });

  const loadData = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/finance/tax/categories');
      if (res.ok) {
        const data = await res.json();
        setCategories(data || []);
      }
    } catch (err) {
      console.error('Failed to load tax categories:', err);
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
      const res = await fetch('/api/finance/tax/categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      if (res.ok) {
        setMessage({ type: 'success', text: 'Tax category created successfully.' });
        setShowModal(false);
        loadData();
      } else {
        const err = await res.json();
        setMessage({ type: 'error', text: err.error || 'Failed to create category.' });
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
            <Tags className="h-6 w-6 text-primary" />
            Tax Categories & Classification
          </h1>
          <p className="text-xs text-muted mt-1">
            Classify services and goods by taxability (Taxable, Exempt, Nil Rated, Non-GST) and default SAC codes
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
            Add Category
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

      {/* Categories Table */}
      <div className="rounded-xl border border-card-border bg-card/60 overflow-hidden">
        <table className="w-full text-left text-xs">
          <thead className="bg-card-border/30 text-muted uppercase tracking-wider font-semibold border-b border-card-border">
            <tr>
              <th className="py-3 px-4">Code</th>
              <th className="py-3 px-4">Category Name</th>
              <th className="py-3 px-4">Taxability</th>
              <th className="py-3 px-4">Type</th>
              <th className="py-3 px-4">Default SAC / HSN</th>
              <th className="py-3 px-4">Active</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-card-border/40">
            {loading ? (
              <tr>
                <td colSpan={6} className="text-center py-8 text-muted">Loading categories...</td>
              </tr>
            ) : categories.length === 0 ? (
              <tr>
                <td colSpan={6} className="text-center py-8 text-muted">
                  No tax categories defined yet.
                </td>
              </tr>
            ) : (
              categories.map((cat) => (
                <tr key={cat.id} className="hover:bg-card-border/20 transition-colors">
                  <td className="py-3 px-4 font-mono font-medium text-primary">{cat.category_code}</td>
                  <td className="py-3 px-4 font-medium text-white">{cat.name}</td>
                  <td className="py-3 px-4">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-mono ${
                      cat.taxability === 'TAXABLE'
                        ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                        : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                    }`}>
                      {cat.taxability}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-muted">{cat.is_service ? 'Service (SAC)' : 'Goods (HSN)'}</td>
                  <td className="py-3 px-4 font-mono text-white/90">{cat.default_sac_hsn_code || '-'}</td>
                  <td className="py-3 px-4 text-muted">{cat.is_active ? 'Yes' : 'No'}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Add Category Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4">
          <div className="bg-card border border-card-border rounded-xl p-6 max-w-md w-full space-y-4">
            <h3 className="text-sm font-semibold text-white">Add Tax Category</h3>
            <form onSubmit={handleCreate} className="space-y-3 text-xs">
              <div>
                <label className="block text-muted mb-1">Category Code *</label>
                <input
                  type="text"
                  required
                  value={form.category_code}
                  onChange={(e) => setForm({ ...form, category_code: e.target.value.toUpperCase() })}
                  placeholder="e.g. PHOTO_SERVICES"
                  className="w-full px-3 py-2 rounded-lg bg-background border border-card-border text-white font-mono uppercase"
                />
              </div>

              <div>
                <label className="block text-muted mb-1">Category Name *</label>
                <input
                  type="text"
                  required
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="e.g. Commercial Photography"
                  className="w-full px-3 py-2 rounded-lg bg-background border border-card-border text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-muted mb-1">Taxability</label>
                  <select
                    value={form.taxability}
                    onChange={(e) => setForm({ ...form, taxability: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg bg-background border border-card-border text-white"
                  >
                    <option value="TAXABLE">Taxable</option>
                    <option value="EXEMPT">Exempt</option>
                    <option value="NIL_RATED">Nil Rated</option>
                    <option value="NON_GST">Non-GST</option>
                  </select>
                </div>
                <div>
                  <label className="block text-muted mb-1">Default SAC / HSN</label>
                  <input
                    type="text"
                    value={form.default_sac_hsn_code}
                    onChange={(e) => setForm({ ...form, default_sac_hsn_code: e.target.value })}
                    placeholder="998381"
                    className="w-full px-3 py-2 rounded-lg bg-background border border-card-border text-white font-mono"
                  />
                </div>
              </div>

              <div className="flex items-center gap-4 pt-2">
                <label className="flex items-center gap-2 cursor-pointer text-white">
                  <input
                    type="checkbox"
                    checked={form.is_service}
                    onChange={(e) => setForm({ ...form, is_service: e.target.checked })}
                    className="rounded border-card-border text-primary h-4 w-4 bg-background"
                  />
                  Is Service (SAC Code)
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
                  {saving ? 'Creating...' : 'Save Category'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
