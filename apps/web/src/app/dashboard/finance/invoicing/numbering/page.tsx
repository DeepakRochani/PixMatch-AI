'use client';

import React, { useState, useEffect } from 'react';
import {
  Hash,
  Save,
  CheckCircle2,
  ShieldCheck,
  Building2,
  Info,
} from 'lucide-react';
import { FinanceNavTabs } from '@/components/dashboard/FinanceNavTabs';
import { InvoicingNavTabs } from '@/components/dashboard/InvoicingNavTabs';
import { fetchApi } from '@/lib/api-client';

export default function NumberingSettingsPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [form, setForm] = useState({
    invoice_number_prefix: 'INV',
    invoice_number_include_fy: true,
    invoice_number_sequence_padding: 6,
    credit_note_prefix: 'CN',
    debit_note_prefix: 'DN',
    receipt_prefix: 'RCP',
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
        setError(res?.error?.message || 'Failed to update numbering.');
      }
    } catch (err: any) {
      setError(err.message || 'Error updating numbering.');
    } finally {
      setSaving(false);
    }
  };

  // Preview computed format
  const fyString = '2026-27';
  const paddingSample = '1'.padStart(form.invoice_number_sequence_padding || 6, '0');
  const previewInvoice = form.invoice_number_include_fy
    ? `${form.invoice_number_prefix}/${fyString}/${paddingSample}`
    : `${form.invoice_number_prefix}/${paddingSample}`;
  const previewReceipt = `${form.receipt_prefix}/${fyString}/${paddingSample}`;
  const previewCredit = `${form.credit_note_prefix}/${fyString}/${paddingSample}`;

  return (
    <div className="p-6 space-y-6 max-w-4xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2.5">
            <Hash className="h-7 w-7 text-primary" />
            Atomic Numbering & Sequences
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Configure atomic document prefixes, fiscal year inclusion, and padding rules for invoices, receipts, and notes.
          </p>
        </div>
      </div>

      <FinanceNavTabs />
      <InvoicingNavTabs />

      {success && (
        <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl text-emerald-400 text-xs flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          Numbering configuration updated.
        </div>
      )}

      {/* Preview Box */}
      <div className="bg-primary/10 border border-primary/20 p-5 rounded-2xl space-y-2">
        <span className="text-xs font-semibold text-primary block">Live Sequence Number Preview</span>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1 text-xs">
          <div className="p-3 bg-card rounded-xl border border-card-border">
            <span className="text-[10px] text-muted-foreground block">Invoice Sample</span>
            <span className="font-mono font-bold text-foreground text-sm">{previewInvoice}</span>
          </div>
          <div className="p-3 bg-card rounded-xl border border-card-border">
            <span className="text-[10px] text-muted-foreground block">Receipt Sample</span>
            <span className="font-mono font-bold text-emerald-400 text-sm">{previewReceipt}</span>
          </div>
          <div className="p-3 bg-card rounded-xl border border-card-border">
            <span className="text-[10px] text-muted-foreground block">Credit Note Sample</span>
            <span className="font-mono font-bold text-amber-400 text-sm">{previewCredit}</span>
          </div>
        </div>
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        <div className="bg-card border border-card-border rounded-2xl p-6 shadow-sm space-y-4">
          <h3 className="text-sm font-semibold text-foreground">Document Series Prefixes</h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-medium text-muted-foreground block mb-1">
                Invoice Prefix
              </label>
              <input
                type="text"
                value={form.invoice_number_prefix}
                onChange={(e) => setForm({ ...form, invoice_number_prefix: e.target.value })}
                className="w-full px-3 py-2 text-xs bg-card-border/30 border border-card-border rounded-xl text-foreground focus:outline-none focus:ring-1 focus:ring-primary font-mono"
              />
            </div>

            <div>
              <label className="text-xs font-medium text-muted-foreground block mb-1">
                Receipt Prefix
              </label>
              <input
                type="text"
                value={form.receipt_prefix}
                onChange={(e) => setForm({ ...form, receipt_prefix: e.target.value })}
                className="w-full px-3 py-2 text-xs bg-card-border/30 border border-card-border rounded-xl text-foreground focus:outline-none focus:ring-1 focus:ring-primary font-mono"
              />
            </div>

            <div>
              <label className="text-xs font-medium text-muted-foreground block mb-1">
                Credit Note Prefix
              </label>
              <input
                type="text"
                value={form.credit_note_prefix}
                onChange={(e) => setForm({ ...form, credit_note_prefix: e.target.value })}
                className="w-full px-3 py-2 text-xs bg-card-border/30 border border-card-border rounded-xl text-foreground focus:outline-none focus:ring-1 focus:ring-primary font-mono"
              />
            </div>

            <div>
              <label className="text-xs font-medium text-muted-foreground block mb-1">
                Debit Note Prefix
              </label>
              <input
                type="text"
                value={form.debit_note_prefix}
                onChange={(e) => setForm({ ...form, debit_note_prefix: e.target.value })}
                className="w-full px-3 py-2 text-xs bg-card-border/30 border border-card-border rounded-xl text-foreground focus:outline-none focus:ring-1 focus:ring-primary font-mono"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
            <div>
              <label className="text-xs font-medium text-muted-foreground block mb-1">
                Sequence Zero-Padding (Digits)
              </label>
              <input
                type="number"
                min="3"
                max="10"
                value={form.invoice_number_sequence_padding}
                onChange={(e) =>
                  setForm({ ...form, invoice_number_sequence_padding: Number(e.target.value) })
                }
                className="w-full px-3 py-2 text-xs bg-card-border/30 border border-card-border rounded-xl text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>

            <div className="flex items-center gap-3 pt-5">
              <input
                type="checkbox"
                id="include_fy"
                checked={form.invoice_number_include_fy}
                onChange={(e) =>
                  setForm({ ...form, invoice_number_include_fy: e.target.checked })
                }
                className="rounded text-primary focus:ring-primary h-4 w-4"
              />
              <label htmlFor="include_fy" className="text-xs font-medium text-foreground cursor-pointer">
                Include Financial Year in sequence (e.g. 2026-27)
              </label>
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
            {saving ? 'Saving...' : 'Save Numbering Policies'}
          </button>
        </div>
      </form>
    </div>
  );
}
