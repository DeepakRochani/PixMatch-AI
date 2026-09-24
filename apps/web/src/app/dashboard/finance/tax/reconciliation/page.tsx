'use client';

import React, { useState, useEffect } from 'react';
import { FinanceNavTabs } from '@/components/dashboard/FinanceNavTabs';
import { TaxNavTabs } from '@/components/dashboard/TaxNavTabs';
import { CheckCheck, RefreshCw, AlertTriangle, ShieldCheck, CheckCircle2 } from 'lucide-react';

export default function TaxReconciliationPage() {
  const [loading, setLoading] = useState(true);
  const [periods, setPeriods] = useState<any[]>([]);
  const [selectedPeriodId, setSelectedPeriodId] = useState<string>('');
  const [reconciling, setReconciling] = useState(false);
  const [reconciliationResult, setReconciliationResult] = useState<any | null>(null);

  const loadPeriods = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/finance/tax/periods');
      if (res.ok) {
        const data = await res.json();
        setPeriods(data || []);
        if (data && data.length > 0) {
          setSelectedPeriodId(data[0].id);
        }
      }
    } catch (err) {
      console.error('Failed to load tax periods:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPeriods();
  }, []);

  const runReconciliation = async () => {
    if (!selectedPeriodId) return;
    try {
      setReconciling(true);
      const res = await fetch(`/api/finance/tax/periods/${selectedPeriodId}/reconcile`, { method: 'POST' });
      if (res.ok) {
        const data = await res.json();
        setReconciliationResult(data);
      }
    } catch (err) {
      console.error('Reconciliation failed:', err);
    } finally {
      setReconciling(false);
    }
  };

  const formatCurrency = (minor: number) => {
    const major = (minor || 0) / 100;
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 2,
    }).format(major);
  };

  return (
    <div className="min-h-screen bg-background text-foreground p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
            <CheckCheck className="h-6 w-6 text-primary" />
            Tax Sub-Ledger vs General Ledger Reconciliation
          </h1>
          <p className="text-xs text-muted mt-1">
            Automated double-entry reconciliation verifying subledger tax balances against Phase 34 GL accounts
          </p>
        </div>
        <button
          onClick={loadPeriods}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-card-border bg-card hover:bg-card-border/50 text-xs text-muted hover:text-white transition-all"
        >
          <RefreshCw className="h-3.5 w-3.5" />
          Refresh
        </button>
      </div>

      <FinanceNavTabs />
      <TaxNavTabs />

      {/* Period Selection & Trigger */}
      <div className="p-4 rounded-xl border border-card-border bg-card/60 backdrop-blur flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <label className="text-xs font-medium text-muted">Select Tax Period:</label>
          <select
            value={selectedPeriodId}
            onChange={(e) => setSelectedPeriodId(e.target.value)}
            className="px-3 py-1.5 rounded-lg bg-background border border-card-border text-xs text-white"
          >
            {periods.map((p) => (
              <option key={p.id} value={p.id}>
                {p.period_name} ({p.period_code}) — {p.status}
              </option>
            ))}
          </select>
        </div>
        <button
          onClick={runReconciliation}
          disabled={reconciling || !selectedPeriodId}
          className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-primary hover:bg-primary-hover text-white text-xs font-semibold shadow disabled:opacity-50 transition-all"
        >
          <CheckCheck className="h-4 w-4" />
          {reconciling ? 'Running Double-Entry Reconciliation...' : 'Run Ledger Reconciliation'}
        </button>
      </div>

      {/* Result Cards */}
      {reconciliationResult && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Status Card */}
            <div className={`p-5 rounded-xl border flex flex-col justify-between ${
              reconciliationResult.status === 'MATCHED'
                ? 'bg-emerald-500/10 border-emerald-500/20'
                : 'bg-rose-500/10 border-rose-500/20'
            }`}>
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-muted">Reconciliation Status</span>
                {reconciliationResult.status === 'MATCHED' ? (
                  <ShieldCheck className="h-5 w-5 text-emerald-400" />
                ) : (
                  <AlertTriangle className="h-5 w-5 text-rose-400" />
                )}
              </div>
              <div className="text-2xl font-bold text-white mt-3 font-mono">
                {reconciliationResult.status}
              </div>
              <p className="text-[11px] text-muted mt-2">
                Discrepancy: {formatCurrency(reconciliationResult.discrepancy_amount_minor || 0)}
              </p>
            </div>

            {/* Subledger Tax Card */}
            <div className="p-5 rounded-xl border border-card-border bg-card/50 flex flex-col justify-between">
              <span className="text-xs font-medium text-muted">Tax Sub-Ledger Total</span>
              <div className="text-2xl font-bold text-white mt-3 font-mono">
                {formatCurrency(reconciliationResult.tax_module_tax_minor || 0)}
              </div>
              <p className="text-[11px] text-muted mt-2">Sum of posted tax transactions</p>
            </div>

            {/* General Ledger Total Card */}
            <div className="p-5 rounded-xl border border-card-border bg-card/50 flex flex-col justify-between">
              <span className="text-xs font-medium text-muted">General Ledger Tax Balances</span>
              <div className="text-2xl font-bold text-white mt-3 font-mono">
                {formatCurrency(reconciliationResult.ledger_tax_minor || 0)}
              </div>
              <p className="text-[11px] text-muted mt-2">GL Account Net Debits/Credits</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
