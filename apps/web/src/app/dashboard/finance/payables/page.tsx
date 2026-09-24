'use client';

import React, { useState, useEffect } from 'react';
import { ArrowUpRight, RefreshCw, Building2, CheckCircle2, Clock, AlertTriangle, CreditCard } from 'lucide-react';
import { FinanceNavTabs } from '@/components/dashboard/FinanceNavTabs';
import { fetchApi } from '@/lib/api-client';

export default function FinancePayablesPage() {
  const [payables, setPayables] = useState<any[]>([]);
  const [aging, setAging] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [payRes, agingRes] = await Promise.all([
        fetchApi('/finance/payables'),
        fetchApi('/finance/reports/aging'),
      ]);

      if (payRes && !payRes.error) {
        setPayables(Array.isArray(payRes.data) ? payRes.data : Array.isArray(payRes) ? payRes : []);
      }
      if (agingRes && !agingRes.error) {
        setAging(agingRes.data?.payables || (agingRes as any).payables);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load payables');
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
            <ArrowUpRight className="h-7 w-7 text-rose-400" />
            Accounts Payable & Vendor Obligations
          </h1>
          <p className="text-sm text-muted mt-1">
            Track lab print bills, freelance contractor invoices, upcoming dues, and vendor settlements.
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

      {/* Aging Schedule Ribbon */}
      {aging && (
        <div className="p-5 rounded-2xl bg-card-bg border border-card-border space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted">Payables Aging Analysis</span>
            <span className="text-sm font-bold text-rose-400">Total Due: {formatCents(aging.total_cents)}</span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            <div className="p-3 rounded-xl bg-card-border/30">
              <div className="text-[11px] text-muted">Current (0-30d)</div>
              <div className="text-sm font-bold text-white mt-1">{formatCents(aging.current_cents)}</div>
            </div>
            <div className="p-3 rounded-xl bg-card-border/30">
              <div className="text-[11px] text-muted">1 - 30 Days Due</div>
              <div className="text-sm font-bold text-amber-400 mt-1">{formatCents(aging.days_1_30_cents)}</div>
            </div>
            <div className="p-3 rounded-xl bg-card-border/30">
              <div className="text-[11px] text-muted">31 - 60 Days Due</div>
              <div className="text-sm font-bold text-amber-500 mt-1">{formatCents(aging.days_31_60_cents)}</div>
            </div>
            <div className="p-3 rounded-xl bg-card-border/30">
              <div className="text-[11px] text-muted">61 - 90 Days Due</div>
              <div className="text-sm font-bold text-rose-400 mt-1">{formatCents(aging.days_61_90_cents)}</div>
            </div>
            <div className="p-3 rounded-xl bg-card-border/30">
              <div className="text-[11px] text-muted">&gt; 90 Days Overdue</div>
              <div className="text-sm font-bold text-rose-500 mt-1">{formatCents(aging.days_over_90_cents)}</div>
            </div>
          </div>
        </div>
      )}

      {/* Payables Table */}
      <div className="bg-card-bg border border-card-border rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-muted">
            <thead className="bg-card-border/40 text-white uppercase tracking-wider text-[10px] font-semibold border-b border-card-border">
              <tr>
                <th className="px-5 py-3.5">Due Date</th>
                <th className="px-5 py-3.5">Vendor / Obligation</th>
                <th className="px-5 py-3.5">Description</th>
                <th className="px-5 py-3.5">Total Amount</th>
                <th className="px-5 py-3.5">Paid</th>
                <th className="px-5 py-3.5">Balance Due</th>
                <th className="px-5 py-3.5">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-card-border/30">
              {payables.map((p) => {
                const balanceDue = p.amount_cents - (p.paid_amount_cents || 0);
                return (
                  <tr key={p.id} className="hover:bg-card-border/20 transition">
                    <td className="px-5 py-4 whitespace-nowrap text-white">
                      {p.due_date ? new Date(p.due_date).toLocaleDateString() : 'Net 30'}
                    </td>
                    <td className="px-5 py-4 font-semibold text-white">
                      {p.vendor?.name || 'Contractor'}
                    </td>
                    <td className="px-5 py-4 text-white max-w-xs truncate">
                      {p.description}
                    </td>
                    <td className="px-5 py-4 text-white">
                      {formatCents(p.amount_cents)}
                    </td>
                    <td className="px-5 py-4 text-emerald-400">
                      {formatCents(p.paid_amount_cents || 0)}
                    </td>
                    <td className="px-5 py-4 font-bold text-white whitespace-nowrap">
                      {formatCents(balanceDue)}
                    </td>
                    <td className="px-5 py-4 whitespace-nowrap">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                        p.status === 'PAID' ? 'bg-emerald-500/10 text-emerald-400' :
                        p.status === 'PARTIALLY_PAID' ? 'bg-amber-500/10 text-amber-400' :
                        p.status === 'OVERDUE' ? 'bg-rose-500/10 text-rose-400' :
                        'bg-blue-500/10 text-blue-400'
                      }`}>
                        {p.status}
                      </span>
                    </td>
                  </tr>
                );
              })}

              {payables.length === 0 && !loading && (
                <tr>
                  <td colSpan={7} className="p-12 text-center text-muted">
                    No vendor payables currently open.
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
