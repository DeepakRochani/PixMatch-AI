'use client';

import React, { useState, useEffect } from 'react';
import {
  CheckCheck,
  RefreshCw,
  AlertTriangle,
  ShieldCheck,
  Calendar,
  CheckCircle2,
  XCircle,
  HelpCircle,
  ChevronRight,
} from 'lucide-react';
import { FinanceNavTabs } from '@/components/dashboard/FinanceNavTabs';
import { ReportsNavTabs } from '@/components/dashboard/ReportsNavTabs';
import { fetchApi } from '@/lib/api-client';

export default function ReconciliationHubPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [overview, setOverview] = useState<any>(null);
  const [anomalies, setAnomalies] = useState<any[]>([]);
  const [resolvingId, setResolvingId] = useState<string | null>(null);
  const [resolutionNote, setResolutionNote] = useState('');

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [recRes, anomRes] = await Promise.all([
        fetchApi('/finance/reports/reconciliation/overview'),
        fetchApi('/finance/reports/anomalies'),
      ]);

      if (recRes && !recRes.error) setOverview(recRes.data || (recRes as any));
      if (anomRes && !anomRes.error) setAnomalies(anomRes.data?.anomalies || (anomRes as any).anomalies || []);
    } catch (err: any) {
      setError(err.message || 'Failed to load Reconciliation status');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleResolve = async (anomalyId: string) => {
    try {
      await fetchApi(`/finance/reports/anomalies/${anomalyId}/resolve`, {
        method: 'POST',
        body: JSON.stringify({ resolution_note: resolutionNote || 'Resolved via reconciliation hub' }),
      });
      setResolvingId(null);
      setResolutionNote('');
      loadData();
    } catch (err: any) {
      alert(err.message || 'Failed to resolve anomaly');
    }
  };

  const formatCurrency = (paise?: number, currency = 'INR') => {
    const val = (paise || 0) / 100;
    const sym = currency === 'INR' ? '₹' : '$';
    return `${sym}${val.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2.5">
            <CheckCheck className="h-7 w-7 text-amber-400" />
            Financial Reconciliation & Ledger Integrity
          </h1>
          <p className="text-sm text-muted mt-1">
            Automated multi-system reconciliation matrix checking General Ledger postings against Invoices, Tax Records, Payments, and Bank Feeds.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={loadData}
            disabled={loading}
            className="flex items-center gap-1.5 px-3 py-2 bg-card-bg border border-card-border rounded-lg text-xs font-medium text-white hover:bg-card-border/40 transition"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
            Run Integrity Audit
          </button>
        </div>
      </div>

      <FinanceNavTabs />
      <ReportsNavTabs />

      {error && (
        <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm flex items-center gap-2">
          <AlertTriangle className="h-5 w-5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Overview Status Banner */}
      {overview && (
        <div className={`p-6 rounded-2xl border flex flex-col md:flex-row md:items-center md:justify-between gap-4 ${
          overview.overall_status === 'RECONCILED'
            ? 'bg-emerald-500/10 border-emerald-500/30'
            : 'bg-amber-500/10 border-amber-500/30'
        }`}>
          <div className="flex items-center gap-3">
            <div className={`p-2.5 rounded-xl ${overview.overall_status === 'RECONCILED' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-amber-500/20 text-amber-400'}`}>
              {overview.overall_status === 'RECONCILED' ? <ShieldCheck className="h-6 w-6" /> : <AlertTriangle className="h-6 w-6" />}
            </div>
            <div>
              <h2 className="text-base font-bold text-white">
                Multi-System Integrity Status: <span className="uppercase">{overview.overall_status}</span>
              </h2>
              <p className="text-xs text-muted mt-0.5">
                {overview.overall_status === 'RECONCILED'
                  ? 'All subledgers (Invoices, Tax Transactions, Payments, Bank) match the General Ledger balances with 0 paise variance.'
                  : 'Variances or unresolved discrepancies detected between upstream subledgers and posted ledger balances.'}
              </p>
            </div>
          </div>
          <div className="text-right">
            <span className="text-xs text-muted">Total Net Variance:</span>
            <div className={`text-xl font-mono font-bold ${overview.total_variance_paise === 0 ? 'text-emerald-400' : 'text-amber-400'}`}>
              {formatCurrency(overview.total_variance_paise)}
            </div>
          </div>
        </div>
      )}

      {/* Subsystem Matrix Grid */}
      {overview && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Invoices vs AR Ledger */}
          <div className="p-5 rounded-2xl bg-card-bg border border-card-border space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-white">Invoices vs AR Ledger</span>
              {overview.invoices_vs_ar_status === 'MATCHED' ? (
                <CheckCircle2 className="h-4 w-4 text-emerald-400" />
              ) : (
                <AlertTriangle className="h-4 w-4 text-amber-400" />
              )}
            </div>
            <div className="text-xs text-muted">
              Invoiced Total: {formatCurrency(overview.invoice_subledger_paise)}
            </div>
            <div className="text-xs text-muted">
              GL AR Total: {formatCurrency(overview.gl_ar_paise)}
            </div>
            <div className="pt-2 border-t border-card-border flex justify-between text-xs font-mono">
              <span className="text-muted">Variance:</span>
              <span className={overview.invoice_variance_paise === 0 ? 'text-emerald-400' : 'text-amber-400'}>
                {formatCurrency(overview.invoice_variance_paise)}
              </span>
            </div>
          </div>

          {/* Tax Engine vs GL Tax */}
          <div className="p-5 rounded-2xl bg-card-bg border border-card-border space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-white">Tax Engine vs GL Tax</span>
              {overview.tax_engine_status === 'MATCHED' ? (
                <CheckCircle2 className="h-4 w-4 text-emerald-400" />
              ) : (
                <AlertTriangle className="h-4 w-4 text-amber-400" />
              )}
            </div>
            <div className="text-xs text-muted">
              Tax Records: {formatCurrency(overview.tax_records_paise)}
            </div>
            <div className="text-xs text-muted">
              GL Tax Accounts: {formatCurrency(overview.gl_tax_paise)}
            </div>
            <div className="pt-2 border-t border-card-border flex justify-between text-xs font-mono">
              <span className="text-muted">Variance:</span>
              <span className={overview.tax_variance_paise === 0 ? 'text-emerald-400' : 'text-amber-400'}>
                {formatCurrency(overview.tax_variance_paise)}
              </span>
            </div>
          </div>

          {/* Payments vs Bank Ledger */}
          <div className="p-5 rounded-2xl bg-card-bg border border-card-border space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-white">Payments vs Cash GL</span>
              {overview.payments_status === 'MATCHED' ? (
                <CheckCircle2 className="h-4 w-4 text-emerald-400" />
              ) : (
                <AlertTriangle className="h-4 w-4 text-amber-400" />
              )}
            </div>
            <div className="text-xs text-muted">
              Payment Transactions: {formatCurrency(overview.payments_paise)}
            </div>
            <div className="text-xs text-muted">
              GL Cash Debits: {formatCurrency(overview.gl_cash_paise)}
            </div>
            <div className="pt-2 border-t border-card-border flex justify-between text-xs font-mono">
              <span className="text-muted">Variance:</span>
              <span className={overview.payments_variance_paise === 0 ? 'text-emerald-400' : 'text-amber-400'}>
                {formatCurrency(overview.payments_variance_paise)}
              </span>
            </div>
          </div>

          {/* Unearned Revenue Audit */}
          <div className="p-5 rounded-2xl bg-card-bg border border-card-border space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-white">Retainers & Unearned</span>
              {overview.retainers_status === 'MATCHED' ? (
                <CheckCircle2 className="h-4 w-4 text-emerald-400" />
              ) : (
                <AlertTriangle className="h-4 w-4 text-amber-400" />
              )}
            </div>
            <div className="text-xs text-muted">
              Retainer Balances: {formatCurrency(overview.retainers_paise)}
            </div>
            <div className="text-xs text-muted">
              GL Liability (2050): {formatCurrency(overview.gl_unearned_paise)}
            </div>
            <div className="pt-2 border-t border-card-border flex justify-between text-xs font-mono">
              <span className="text-muted">Variance:</span>
              <span className={overview.retainer_variance_paise === 0 ? 'text-emerald-400' : 'text-amber-400'}>
                {formatCurrency(overview.retainer_variance_paise)}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Discrepancies & Anomalies Ledger */}
      <div className="p-6 rounded-2xl bg-card-bg border border-card-border space-y-4">
        <h3 className="text-base font-bold text-white">
          Active Discrepancies & Anomaly Audit Trail ({anomalies.length})
        </h3>

        {anomalies.length === 0 ? (
          <div className="py-8 text-center text-muted text-xs">
            <CheckCircle2 className="h-8 w-8 text-emerald-400 mx-auto mb-2" />
            No active anomalies or ledger discrepancies detected.
          </div>
        ) : (
          <div className="divide-y divide-card-border/40">
            {anomalies.map((anom: any) => (
              <div key={anom.id} className="py-4 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <div>
                    <span className="font-bold text-white">{anom.title}</span>
                    <p className="text-muted text-[11px] mt-0.5">{anom.description}</p>
                  </div>
                  <div className="text-right">
                    <span className="font-mono font-bold text-amber-400">{formatCurrency(anom.discrepancy_amount)}</span>
                    <div className="text-[10px] text-muted uppercase mt-0.5">{anom.severity} • {anom.status}</div>
                  </div>
                </div>

                {resolvingId === anom.id ? (
                  <div className="pt-2 flex items-center gap-2">
                    <input
                      type="text"
                      placeholder="Enter resolution notes / audit memo..."
                      value={resolutionNote}
                      onChange={(e) => setResolutionNote(e.target.value)}
                      className="flex-1 px-3 py-1.5 bg-card-border/40 border border-card-border rounded-lg text-xs text-white"
                    />
                    <button
                      onClick={() => handleResolve(anom.id)}
                      className="px-3 py-1.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg text-xs font-semibold"
                    >
                      Confirm Resolution
                    </button>
                    <button
                      onClick={() => setResolvingId(null)}
                      className="px-2.5 py-1.5 bg-card-border/40 text-muted rounded-lg text-xs"
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <div className="flex justify-end pt-1">
                    <button
                      onClick={() => setResolvingId(anom.id)}
                      className="text-xs text-cyan-400 hover:underline font-semibold"
                    >
                      Resolve Discrepancy
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
