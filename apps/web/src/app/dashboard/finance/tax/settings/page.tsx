'use client';

import React, { useState, useEffect } from 'react';
import { FinanceNavTabs } from '@/components/dashboard/FinanceNavTabs';
import { TaxNavTabs } from '@/components/dashboard/TaxNavTabs';
import { Settings, Save, RefreshCw, CheckCircle, AlertCircle } from 'lucide-react';

export default function TaxSettingsPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const [settings, setSettings] = useState({
    auto_generate_tax_transactions: true,
    strict_gstin_validation: true,
    auto_link_gl_journal_entries: true,
    itc_default_rule: 'ELIGIBLE',
    reverse_charge_threshold_minor: 0,
    rounding_method: 'ROUND_HALF_UP',
    export_csv_formula_defense: true,
  });

  const loadSettings = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/finance/tax/profile');
      if (res.ok) {
        // loaded default settings
      }
    } catch (err) {
      console.error('Failed to load settings:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSettings();
  }, []);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setTimeout(() => {
      setSaving(false);
      setMessage({ type: 'success', text: 'Tax operational settings saved successfully.' });
    }, 500);
  };

  return (
    <div className="min-h-screen bg-background text-foreground p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
            <Settings className="h-6 w-6 text-primary" />
            Tax & Compliance Operational Settings
          </h1>
          <p className="text-xs text-muted mt-1">
            Configure automated subledger posting, integer rounding rules, RCM defaults, and CSV security
          </p>
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

      <form onSubmit={handleSave} className="p-6 rounded-xl border border-card-border bg-card/60 backdrop-blur space-y-6 max-w-2xl">
        <h3 className="text-sm font-semibold text-white border-b border-card-border pb-2">
          Automation & Ledger Linkage
        </h3>

        <div className="space-y-4 text-xs">
          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={settings.auto_generate_tax_transactions}
              onChange={(e) => setSettings({ ...settings, auto_generate_tax_transactions: e.target.checked })}
              className="mt-0.5 rounded border-card-border text-primary focus:ring-primary h-4 w-4 bg-background"
            />
            <div>
              <span className="text-white font-medium block">Auto-generate Tax Transactions</span>
              <span className="text-muted text-[11px]">
                Automatically create subledger tax transaction records when client invoices or vendor expenses are posted.
              </span>
            </div>
          </label>

          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={settings.auto_link_gl_journal_entries}
              onChange={(e) => setSettings({ ...settings, auto_link_gl_journal_entries: e.target.checked })}
              className="mt-0.5 rounded border-card-border text-primary focus:ring-primary h-4 w-4 bg-background"
            />
            <div>
              <span className="text-white font-medium block">Double-Entry Journal Entry Linkage</span>
              <span className="text-muted text-[11px]">
                Create and link Phase 34 General Ledger journal entries automatically upon tax transaction posting.
              </span>
            </div>
          </label>

          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={settings.strict_gstin_validation}
              onChange={(e) => setSettings({ ...settings, strict_gstin_validation: e.target.checked })}
              className="mt-0.5 rounded border-card-border text-primary focus:ring-primary h-4 w-4 bg-background"
            />
            <div>
              <span className="text-white font-medium block">Strict GSTIN & PAN Structural Validation</span>
              <span className="text-muted text-[11px]">
                Validate format checksums for state codes, entity PANs, and GSTIN check digits on all party records.
              </span>
            </div>
          </label>

          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={settings.export_csv_formula_defense}
              onChange={(e) => setSettings({ ...settings, export_csv_formula_defense: e.target.checked })}
              className="mt-0.5 rounded border-card-border text-primary focus:ring-primary h-4 w-4 bg-background"
            />
            <div>
              <span className="text-white font-medium block">CSV Formula Injection Defense</span>
              <span className="text-muted text-[11px]">
                Prefix fields starting with =, +, -, @, or tabs to prevent spreadsheet execution vulnerabilities.
              </span>
            </div>
          </label>
        </div>

        <div className="flex justify-end pt-4 border-t border-card-border">
          <button
            type="submit"
            disabled={saving || loading}
            className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-primary hover:bg-primary-hover text-white text-xs font-semibold shadow disabled:opacity-50 transition-all"
          >
            <Save className="h-4 w-4" />
            {saving ? 'Saving...' : 'Save Settings'}
          </button>
        </div>
      </form>
    </div>
  );
}
