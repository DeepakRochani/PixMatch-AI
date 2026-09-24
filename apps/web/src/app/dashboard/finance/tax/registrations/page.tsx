'use client';

import React, { useState, useEffect } from 'react';
import { FinanceNavTabs } from '@/components/dashboard/FinanceNavTabs';
import { TaxNavTabs } from '@/components/dashboard/TaxNavTabs';
import { FileCheck, Plus, CheckCircle, AlertCircle, RefreshCw, Star } from 'lucide-react';

export default function TaxRegistrationsPage() {
  const [loading, setLoading] = useState(true);
  const [registrations, setRegistrations] = useState<any[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const [form, setForm] = useState({
    registration_type: 'GSTIN',
    registration_number: '',
    jurisdiction_code: 'IND-MH',
    jurisdiction_name: 'Maharashtra, India',
    state_code: '27',
    state_name: 'Maharashtra',
    is_primary: true,
    composition_scheme: false,
    authorized_signatory_name: '',
  });

  const loadData = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/finance/tax/registrations');
      if (res.ok) {
        const data = await res.json();
        setRegistrations(data || []);
      }
    } catch (err) {
      console.error('Failed to load registrations:', err);
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
      const res = await fetch('/api/finance/tax/registrations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      if (res.ok) {
        setMessage({ type: 'success', text: 'Tax registration added successfully.' });
        setShowModal(false);
        loadData();
      } else {
        const err = await res.json();
        setMessage({ type: 'error', text: err.error || 'Failed to add registration.' });
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
            <FileCheck className="h-6 w-6 text-primary" />
            Tax Registrations & GSTINs
          </h1>
          <p className="text-xs text-muted mt-1">
            Manage multi-state GSTINs, state codes, and legal tax jurisdictional numbers
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
            Add Registration
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

      {/* Registrations List */}
      <div className="rounded-xl border border-card-border bg-card/60 overflow-hidden">
        <table className="w-full text-left text-xs">
          <thead className="bg-card-border/30 text-muted uppercase tracking-wider font-semibold border-b border-card-border">
            <tr>
              <th className="py-3 px-4">Registration No.</th>
              <th className="py-3 px-4">Type</th>
              <th className="py-3 px-4">Jurisdiction / State</th>
              <th className="py-3 px-4">State Code</th>
              <th className="py-3 px-4">Status</th>
              <th className="py-3 px-4">Primary</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-card-border/40">
            {loading ? (
              <tr>
                <td colSpan={6} className="text-center py-8 text-muted">Loading registrations...</td>
              </tr>
            ) : registrations.length === 0 ? (
              <tr>
                <td colSpan={6} className="text-center py-8 text-muted">
                  No tax registrations configured yet. Click "Add Registration" to configure your primary GSTIN.
                </td>
              </tr>
            ) : (
              registrations.map((reg) => (
                <tr key={reg.id} className="hover:bg-card-border/20 transition-colors">
                  <td className="py-3 px-4 font-mono font-medium text-white flex items-center gap-2">
                    {reg.registration_number}
                    {reg.is_primary && (
                      <span className="p-1 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20" title="Primary GSTIN">
                        <Star className="h-3 w-3 fill-amber-400" />
                      </span>
                    )}
                  </td>
                  <td className="py-3 px-4">
                    <span className="px-2 py-0.5 rounded bg-primary/10 text-primary border border-primary/20 text-[10px] font-mono">
                      {reg.registration_type}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-white/90">{reg.jurisdiction_name || reg.state_name || 'National'}</td>
                  <td className="py-3 px-4 font-mono text-muted">{reg.state_code || '-'}</td>
                  <td className="py-3 px-4">
                    <span className="px-2 py-0.5 rounded-full text-[10px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                      {reg.status || 'ACTIVE'}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-muted">{reg.is_primary ? 'Yes' : 'No'}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Add Registration Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4">
          <div className="bg-card border border-card-border rounded-xl p-6 max-w-md w-full space-y-4">
            <h3 className="text-sm font-semibold text-white">Add New Tax Registration</h3>
            <form onSubmit={handleCreate} className="space-y-3 text-xs">
              <div>
                <label className="block text-muted mb-1">Registration Type</label>
                <select
                  value={form.registration_type}
                  onChange={(e) => setForm({ ...form, registration_type: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg bg-background border border-card-border text-white"
                >
                  <option value="GSTIN">GSTIN (India GST)</option>
                  <option value="VAT">VAT Registration</option>
                  <option value="TIN">Tax Identification Number (TIN)</option>
                  <option value="EIN">EIN (US)</option>
                </select>
              </div>

              <div>
                <label className="block text-muted mb-1">Registration Number (e.g. GSTIN) *</label>
                <input
                  type="text"
                  required
                  value={form.registration_number}
                  onChange={(e) => setForm({ ...form, registration_number: e.target.value.toUpperCase() })}
                  placeholder="27AABCL1234F1Z5"
                  className="w-full px-3 py-2 rounded-lg bg-background border border-card-border text-white font-mono uppercase"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-muted mb-1">State Code (2-digit)</label>
                  <input
                    type="text"
                    value={form.state_code}
                    onChange={(e) => setForm({ ...form, state_code: e.target.value })}
                    placeholder="27"
                    className="w-full px-3 py-2 rounded-lg bg-background border border-card-border text-white font-mono"
                  />
                </div>
                <div>
                  <label className="block text-muted mb-1">State / Province</label>
                  <input
                    type="text"
                    value={form.state_name}
                    onChange={(e) => setForm({ ...form, state_name: e.target.value })}
                    placeholder="Maharashtra"
                    className="w-full px-3 py-2 rounded-lg bg-background border border-card-border text-white"
                  />
                </div>
              </div>

              <div className="flex items-center gap-4 pt-2">
                <label className="flex items-center gap-2 cursor-pointer text-white">
                  <input
                    type="checkbox"
                    checked={form.is_primary}
                    onChange={(e) => setForm({ ...form, is_primary: e.target.checked })}
                    className="rounded border-card-border text-primary h-4 w-4 bg-background"
                  />
                  Set as Primary
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
                  {saving ? 'Adding...' : 'Save Registration'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
