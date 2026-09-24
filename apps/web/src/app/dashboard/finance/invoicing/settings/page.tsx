'use client';

import React, { useState, useEffect } from 'react';
import {
  Settings,
  ShieldCheck,
  Building2,
  CreditCard,
  Percent,
  CheckCircle2,
  Save,
} from 'lucide-react';
import { FinanceNavTabs } from '@/components/dashboard/FinanceNavTabs';
import { InvoicingNavTabs } from '@/components/dashboard/InvoicingNavTabs';
import { fetchApi } from '@/lib/api-client';

export default function InvoicingSettingsPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [form, setForm] = useState({
    default_payment_terms_days: 14,
    default_currency: 'INR',
    default_notes: 'Thank you for choosing our photography services.',
    default_terms: 'Payment is due within 14 days of invoice date.',
    default_late_fee_bps: 200, // 2%
    auto_reminders_enabled: true,
    require_approval_for_reminders: true,
    allow_partial_payments: true,
    allow_online_payments: true,
    public_portal_enabled: true,
  });

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    setLoading(true);
    try {
      const res = await fetchApi('/finance/invoicing/settings');
      if (res && !res.error) {
        setForm((prev) => ({ ...prev, ...(res.data || res) }));
      }
    } catch (err: any) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSuccess(false);
    try {
      const res = await fetchApi('/finance/invoicing/settings', {
        method: 'PATCH',
        body: JSON.stringify(form),
      });
      if (res && !res.error) {
        setSuccess(true);
        setTimeout(() => setSuccess(false), 3000);
      } else {
        setError(res?.error?.message || 'Failed to save settings.');
      }
    } catch (err: any) {
      setError(err.message || 'Error saving settings.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p-6 space-y-6 max-w-4xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2.5">
            <Settings className="h-7 w-7 text-primary" />
            Invoicing & Payment Policies
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Configure studio default currencies, standard payment terms, late fees, and portal settings.
          </p>
        </div>
      </div>

      <FinanceNavTabs />
      <InvoicingNavTabs />

      {success && (
        <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl text-emerald-400 text-xs flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          Settings saved successfully.
        </div>
      )}

      {error && (
        <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-2xl text-red-400 text-xs">
          {error}
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-6">
        <div className="bg-card border border-card-border rounded-2xl p-6 shadow-sm space-y-4">
          <h3 className="text-sm font-semibold text-foreground">Commercial Defaults</h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-medium text-muted-foreground block mb-1">
                Default Currency
              </label>
              <select
                value={form.default_currency}
                onChange={(e) => setForm({ ...form, default_currency: e.target.value })}
                className="w-full px-3 py-2 text-xs bg-card-border/30 border border-card-border rounded-xl text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
              >
                <option value="INR">INR (₹)</option>
                <option value="USD">USD ($)</option>
                <option value="EUR">EUR (€)</option>
                <option value="GBP">GBP (£)</option>
              </select>
            </div>

            <div>
              <label className="text-xs font-medium text-muted-foreground block mb-1">
                Standard Payment Terms (Days)
              </label>
              <input
                type="number"
                min="0"
                value={form.default_payment_terms_days}
                onChange={(e) =>
                  setForm({ ...form, default_payment_terms_days: Number(e.target.value) })
                }
                className="w-full px-3 py-2 text-xs bg-card-border/30 border border-card-border rounded-xl text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-medium text-muted-foreground block mb-1">
              Default Invoice Notes
            </label>
            <textarea
              rows={2}
              value={form.default_notes}
              onChange={(e) => setForm({ ...form, default_notes: e.target.value })}
              className="w-full px-3 py-2 text-xs bg-card-border/30 border border-card-border rounded-xl text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>

          <div>
            <label className="text-xs font-medium text-muted-foreground block mb-1">
              Default Terms & Conditions
            </label>
            <textarea
              rows={2}
              value={form.default_terms}
              onChange={(e) => setForm({ ...form, default_terms: e.target.value })}
              className="w-full px-3 py-2 text-xs bg-card-border/30 border border-card-border rounded-xl text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>
        </div>

        <div className="bg-card border border-card-border rounded-2xl p-6 shadow-sm space-y-4">
          <h3 className="text-sm font-semibold text-foreground">Portal & Payment Rules</h3>

          <div className="space-y-3">
            <div className="flex items-center justify-between p-3.5 bg-card-border/20 border border-card-border/50 rounded-xl">
              <div>
                <p className="text-xs font-semibold text-foreground">Public Payment Portal</p>
                <span className="text-[10px] text-muted-foreground">
                  Allow clients to pay via /pay/[token] links
                </span>
              </div>
              <input
                type="checkbox"
                checked={form.public_portal_enabled}
                onChange={(e) => setForm({ ...form, public_portal_enabled: e.target.checked })}
                className="rounded text-primary focus:ring-primary h-4 w-4"
              />
            </div>

            <div className="flex items-center justify-between p-3.5 bg-card-border/20 border border-card-border/50 rounded-xl">
              <div>
                <p className="text-xs font-semibold text-foreground">Allow Partial Payments</p>
                <span className="text-[10px] text-muted-foreground">
                  Clients can settle installments and deposits incrementally
                </span>
              </div>
              <input
                type="checkbox"
                checked={form.allow_partial_payments}
                onChange={(e) => setForm({ ...form, allow_partial_payments: e.target.checked })}
                className="rounded text-primary focus:ring-primary h-4 w-4"
              />
            </div>

            <div className="flex items-center justify-between p-3.5 bg-card-border/20 border border-card-border/50 rounded-xl">
              <div>
                <p className="text-xs font-semibold text-foreground">Require Human Approval for Reminders</p>
                <span className="text-[10px] text-muted-foreground">
                  Draft reminders for staff verification before dispatching
                </span>
              </div>
              <input
                type="checkbox"
                checked={form.require_approval_for_reminders}
                onChange={(e) =>
                  setForm({ ...form, require_approval_for_reminders: e.target.checked })
                }
                className="rounded text-primary focus:ring-primary h-4 w-4"
              />
            </div>
          </div>
        </div>

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={saving}
            className="flex items-center gap-2 px-6 py-2.5 bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-bold rounded-xl shadow-md transition disabled:opacity-50"
          >
            <Save className="h-4 w-4" />
            {saving ? 'Saving...' : 'Save Invoicing Policies'}
          </button>
        </div>
      </form>
    </div>
  );
}
