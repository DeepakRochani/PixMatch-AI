'use client';

import React, { useState, useEffect } from 'react';
import { CheckCheck, RefreshCw, Plus, AlertTriangle, CheckCircle2, ShieldCheck, Link2 } from 'lucide-react';
import { FinanceNavTabs } from '@/components/dashboard/FinanceNavTabs';
import { fetchApi } from '@/lib/api-client';

export default function FinanceReconciliationPage() {
  const [reconciliations, setReconciliations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetchApi('/finance/reconciliations');
      if (res && !res.error) {
        setReconciliations(Array.isArray(res.data) ? res.data : Array.isArray(res) ? res : []);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load reconciliations');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const formatCents = (cents?: number) => {
    const val = (cents || 0) / 100;
    return `$${val.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2.5">
            <CheckCheck className="h-7 w-7 text-primary" />
            Financial Reconciliation & Ledger Matching
          </h1>
          <p className="text-sm text-muted mt-1">
            Match bank transactions, Stripe/payment gateway settlements, client receivables, and vendor payments.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={loadData}
            className="flex items-center gap-1.5 px-3 py-2 bg-card-bg border border-card-border rounded-lg text-xs font-medium text-white hover:bg-card-border/40 transition"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Refresh
          </button>
        </div>
      </div>

      <FinanceNavTabs />

      {error && (
        <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm flex items-center gap-2">
          <AlertTriangle className="h-5 w-5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Reconciliation Table */}
      <div className="bg-card-bg border border-card-border rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-muted">
            <thead className="bg-card-border/40 text-white uppercase tracking-wider text-[10px] font-semibold border-b border-card-border">
              <tr>
                <th className="px-5 py-3.5">Reconciliation ID</th>
                <th className="px-5 py-3.5">Date Matched</th>
                <th className="px-5 py-3.5">Matched Amount</th>
                <th className="px-5 py-3.5">Linked Item</th>
                <th className="px-5 py-3.5">Status</th>
                <th className="px-5 py-3.5">Notes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-card-border/30">
              {reconciliations.map((rec) => (
                <tr key={rec.id} className="hover:bg-card-border/20 transition">
                  <td className="px-5 py-4 font-mono text-white text-[11px]">
                    {rec.id.substring(0, 8)}...
                  </td>
                  <td className="px-5 py-4 text-white">
                    {new Date(rec.created_at).toLocaleDateString()}
                  </td>
                  <td className="px-5 py-4 font-bold text-white">
                    {formatCents(rec.matched_amount_cents)}
                  </td>
                  <td className="px-5 py-4 text-primary font-medium">
                    {rec.receivable_id ? `Receivable: ${rec.receivable_id.substring(0, 8)}` : rec.payable_id ? `Payable: ${rec.payable_id.substring(0, 8)}` : 'Bank Tx'}
                  </td>
                  <td className="px-5 py-4 whitespace-nowrap">
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/10 text-emerald-400">
                      {rec.status}
                    </span>
                  </td>
                  <td className="px-5 py-4 text-muted truncate max-w-xs">
                    {rec.notes || 'Automated bank match'}
                  </td>
                </tr>
              ))}

              {reconciliations.length === 0 && !loading && (
                <tr>
                  <td colSpan={6} className="p-12 text-center text-muted">
                    No ledger reconciliations performed yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
