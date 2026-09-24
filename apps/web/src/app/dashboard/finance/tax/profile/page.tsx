'use client';

import React, { useState, useEffect } from 'react';
import { FinanceNavTabs } from '@/components/dashboard/FinanceNavTabs';
import { TaxNavTabs } from '@/components/dashboard/TaxNavTabs';
import { Building2, Save, CheckCircle, AlertCircle, RefreshCw } from 'lucide-react';

export default function TaxProfilePage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const [form, setForm] = useState({
    legal_name: '',
    trade_name: '',
    entity_type: 'PRIVATE_LIMITED',
    pan_number: '',
    tan_number: '',
    cin_number: '',
    is_gst_registered: true,
    composition_scheme: false,
    default_place_of_supply: 'MH',
    default_tax_rate_bps: 1800,
    address_line1: '',
    city: '',
    state_code: 'MH',
    state_name: 'Maharashtra',
    postal_code: '',
    country: 'IND',
  });

  const loadProfile = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/finance/tax/profile');
      if (res.ok) {
        const data = await res.json();
        if (data) {
          setForm({
            legal_name: data.legal_name || '',
            trade_name: data.trade_name || '',
            entity_type: data.entity_type || 'PRIVATE_LIMITED',
            pan_number: data.pan_number || '',
            tan_number: data.tan_number || '',
            cin_number: data.cin_number || '',
            is_gst_registered: !!data.is_gst_registered,
            composition_scheme: !!data.composition_scheme,
            default_place_of_supply: data.default_place_of_supply || 'MH',
            default_tax_rate_bps: data.default_tax_rate_bps || 1800,
            address_line1: data.address_line1 || '',
            city: data.city || '',
            state_code: data.state_code || 'MH',
            state_name: data.state_name || 'Maharashtra',
            postal_code: data.postal_code || '',
            country: data.country || 'IND',
          });
        }
      }
    } catch (err) {
      console.error('Failed to fetch tax profile:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProfile();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSaving(true);
      setMessage(null);
      const res = await fetch('/api/finance/tax/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      if (res.ok) {
        setMessage({ type: 'success', text: 'Tax profile updated successfully.' });
      } else {
        const err = await res.json();
        setMessage({ type: 'error', text: err.error || 'Failed to save tax profile.' });
      }
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'An unexpected error occurred.' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
            <Building2 className="h-6 w-6 text-primary" />
            Studio Legal Entity & Tax Profile
          </h1>
          <p className="text-xs text-muted mt-1">
            Maintain your legal identity, PAN, entity classification, and default tax parameters
          </p>
        </div>
        <button
          onClick={loadProfile}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-card-border bg-card hover:bg-card-border/50 text-xs text-muted hover:text-white transition-all"
        >
          <RefreshCw className="h-3.5 w-3.5" />
          Reload
        </button>
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

      <form onSubmit={handleSave} className="p-6 rounded-xl border border-card-border bg-card/60 backdrop-blur space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Legal Information */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-white border-b border-card-border pb-2">
              Legal Identity & Registration
            </h3>

            <div>
              <label className="block text-xs font-medium text-muted mb-1">Legal Entity Name *</label>
              <input
                type="text"
                required
                value={form.legal_name}
                onChange={(e) => setForm({ ...form, legal_name: e.target.value })}
                className="w-full px-3 py-2 rounded-lg bg-background border border-card-border text-sm text-white focus:outline-none focus:border-primary"
                placeholder="e.g. Luminary Studios Private Limited"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-muted mb-1">Trade / Brand Name</label>
              <input
                type="text"
                value={form.trade_name}
                onChange={(e) => setForm({ ...form, trade_name: e.target.value })}
                className="w-full px-3 py-2 rounded-lg bg-background border border-card-border text-sm text-white focus:outline-none focus:border-primary"
                placeholder="e.g. Luminary Media"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-muted mb-1">Entity Structure</label>
              <select
                value={form.entity_type}
                onChange={(e) => setForm({ ...form, entity_type: e.target.value })}
                className="w-full px-3 py-2 rounded-lg bg-background border border-card-border text-sm text-white focus:outline-none focus:border-primary"
              >
                <option value="PROPRIETORSHIP">Proprietorship</option>
                <option value="PARTNERSHIP">Partnership</option>
                <option value="LLP">Limited Liability Partnership (LLP)</option>
                <option value="PRIVATE_LIMITED">Private Limited Company</option>
                <option value="PUBLIC_LIMITED">Public Limited Company</option>
                <option value="INDIVIDUAL">Individual / Freelancer</option>
              </select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-muted mb-1">Permanent Account Number (PAN) *</label>
                <input
                  type="text"
                  required
                  maxLength={10}
                  value={form.pan_number}
                  onChange={(e) => setForm({ ...form, pan_number: e.target.value.toUpperCase() })}
                  className="w-full px-3 py-2 rounded-lg bg-background border border-card-border text-sm font-mono text-white uppercase focus:outline-none focus:border-primary"
                  placeholder="e.g. AABCL1234F"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-muted mb-1">TAN Number</label>
                <input
                  type="text"
                  maxLength={10}
                  value={form.tan_number}
                  onChange={(e) => setForm({ ...form, tan_number: e.target.value.toUpperCase() })}
                  className="w-full px-3 py-2 rounded-lg bg-background border border-card-border text-sm font-mono text-white uppercase focus:outline-none focus:border-primary"
                  placeholder="e.g. MUMK12345E"
                />
              </div>
            </div>
          </div>

          {/* Tax Configurations & Address */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-white border-b border-card-border pb-2">
              Tax Classification & Default Parameters
            </h3>

            <div className="flex items-center gap-6 pt-1">
              <label className="flex items-center gap-2 cursor-pointer text-xs text-white">
                <input
                  type="checkbox"
                  checked={form.is_gst_registered}
                  onChange={(e) => setForm({ ...form, is_gst_registered: e.target.checked })}
                  className="rounded border-card-border text-primary focus:ring-primary h-4 w-4 bg-background"
                />
                GST Registered
              </label>

              <label className="flex items-center gap-2 cursor-pointer text-xs text-white">
                <input
                  type="checkbox"
                  checked={form.composition_scheme}
                  onChange={(e) => setForm({ ...form, composition_scheme: e.target.checked })}
                  className="rounded border-card-border text-primary focus:ring-primary h-4 w-4 bg-background"
                />
                Composition Scheme
              </label>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-muted mb-1">Home State Code</label>
                <input
                  type="text"
                  value={form.state_code}
                  onChange={(e) => setForm({ ...form, state_code: e.target.value.toUpperCase() })}
                  className="w-full px-3 py-2 rounded-lg bg-background border border-card-border text-sm font-mono text-white uppercase focus:outline-none focus:border-primary"
                  placeholder="e.g. MH, DL, KA"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-muted mb-1">Default Rate (bps)</label>
                <input
                  type="number"
                  value={form.default_tax_rate_bps}
                  onChange={(e) => setForm({ ...form, default_tax_rate_bps: parseInt(e.target.value) || 0 })}
                  className="w-full px-3 py-2 rounded-lg bg-background border border-card-border text-sm font-mono text-white focus:outline-none focus:border-primary"
                  placeholder="1800 for 18%"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-muted mb-1">Registered Address</label>
              <input
                type="text"
                value={form.address_line1}
                onChange={(e) => setForm({ ...form, address_line1: e.target.value })}
                className="w-full px-3 py-2 rounded-lg bg-background border border-card-border text-sm text-white focus:outline-none focus:border-primary"
                placeholder="Street address / Studio Building"
              />
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-medium text-muted mb-1">City</label>
                <input
                  type="text"
                  value={form.city}
                  onChange={(e) => setForm({ ...form, city: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg bg-background border border-card-border text-sm text-white focus:outline-none focus:border-primary"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-muted mb-1">State Name</label>
                <input
                  type="text"
                  value={form.state_name}
                  onChange={(e) => setForm({ ...form, state_name: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg bg-background border border-card-border text-sm text-white focus:outline-none focus:border-primary"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-muted mb-1">PIN / Postal</label>
                <input
                  type="text"
                  value={form.postal_code}
                  onChange={(e) => setForm({ ...form, postal_code: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg bg-background border border-card-border text-sm font-mono text-white focus:outline-none focus:border-primary"
                />
              </div>
            </div>
          </div>
        </div>

        <div className="flex justify-end pt-4 border-t border-card-border">
          <button
            type="submit"
            disabled={saving || loading}
            className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-primary hover:bg-primary-hover text-white text-xs font-semibold shadow disabled:opacity-50 transition-all"
          >
            <Save className="h-4 w-4" />
            {saving ? 'Saving Profile...' : 'Save Tax Profile'}
          </button>
        </div>
      </form>
    </div>
  );
}
