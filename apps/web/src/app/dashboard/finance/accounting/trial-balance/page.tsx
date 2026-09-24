'use client';

import React, { useState, useEffect } from 'react';
import { FinanceNavTabs } from '@/components/dashboard/FinanceNavTabs';
import { AccountingNavTabs } from '@/components/dashboard/AccountingNavTabs';
import {
  Scale,
  Download,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';

export default function TrialBalancePage() {
  const [tb, setTb] = useState<any>(null);
  const [asOfDate, setAsOfDate] = useState(new Date().toISOString().split('T')[0]);
  const [loading, setLoading] = useState(true);

  const fetchTrialBalance = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/finance/accounting/trial-balance?as_of_date=${asOfDate}`);
      if (res.ok) {
        const data = await res.json();
        setTb(data);
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTrialBalance();
  }, [asOfDate]);

  const formatCurrency = (cents: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(cents / 100);
  };

  const handleExportCSV = () => {
    if (!tb?.rows) return;
    const rows = [
      ['Account Code', 'Account Name', 'Type', 'Total Debits ($)', 'Total Credits ($)', 'Net Debit Balance ($)', 'Net Credit Balance ($)'],
    ];

    tb.rows.forEach((r: any) => {
      rows.push([
        r.account_code,
        `"${r.account_name.replace(/"/g, '""')}"`,
        r.account_type,
        (r.debit_total_minor / 100).toFixed(2),
        (r.credit_total_minor / 100).toFixed(2),
        (r.debit_balance_minor / 100).toFixed(2),
        (r.credit_balance_minor / 100).toFixed(2),
      ]);
    });

    rows.push([
      'TOTALS',
      '',
      '',
      (tb.total_debit_minor / 100).toFixed(2),
      (tb.total_credit_minor / 100).toFixed(2),
      (tb.total_debit_minor / 100).toFixed(2),
      (tb.total_credit_minor / 100).toFixed(2),
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + rows.map((e) => e.join(',')).join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `trial_balance_${asOfDate}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
            <Scale className="h-6 w-6 text-primary" />
            Trial Balance
          </h1>
          <p className="text-sm text-muted">
            Formal double-entry balancing verification for all studio chart of accounts.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={fetchTrialBalance}
            className="flex items-center gap-2 px-3 py-2 bg-card hover:bg-card-border/40 text-muted hover:text-white rounded-lg text-xs font-semibold border border-card-border transition-all"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Refresh
          </button>
          <button
            onClick={handleExportCSV}
            className="flex items-center gap-2 px-3.5 py-2 bg-card-border/60 hover:bg-card-border text-white rounded-lg text-xs font-semibold transition-all border border-card-border"
          >
            <Download className="h-4 w-4" />
            Export CSV
          </button>
        </div>
      </div>

      <FinanceNavTabs />
      <AccountingNavTabs />

      {/* Balancing Status Banner */}
      {tb && (
        <div className={`p-4 rounded-xl border flex items-center justify-between ${
          tb.is_balanced
            ? 'bg-emerald-950/20 border-emerald-800/40 text-emerald-300'
            : 'bg-rose-950/30 border-rose-800/50 text-rose-300'
        }`}>
          <div className="flex items-center gap-3">
            {tb.is_balanced ? (
              <CheckCircle2 className="h-6 w-6 text-emerald-400 shrink-0" />
            ) : (
              <AlertCircle className="h-6 w-6 text-rose-400 shrink-0" />
            )}
            <div>
              <div className="text-sm font-bold flex items-center gap-2">
                <span>TRIAL BALANCE STATUS:</span>
                <span className={`px-2.5 py-0.5 rounded text-xs font-extrabold ${
                  tb.is_balanced ? 'bg-emerald-500/20 text-emerald-300' : 'bg-rose-500/20 text-rose-300'
                }`}>
                  {tb.is_balanced ? 'BALANCED' : 'OUT OF BALANCE'}
                </span>
              </div>
              <p className="text-xs opacity-80 mt-0.5">
                {tb.is_balanced
                  ? `Total Debits (${formatCurrency(tb.total_debit_minor)}) == Total Credits (${formatCurrency(tb.total_credit_minor)})`
                  : `Discrepancy: ${formatCurrency(Math.abs(tb.total_debit_minor - tb.total_credit_minor))}. Out of balance transactions detected.`}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 text-xs">
            <span className="text-muted">As of:</span>
            <input
              type="date"
              value={asOfDate}
              onChange={(e) => setAsOfDate(e.target.value)}
              className="bg-surface-dark border border-card-border rounded px-2.5 py-1 text-xs text-white focus:outline-none focus:border-primary"
            />
          </div>
        </div>
      )}

      {/* Trial Balance Table */}
      <div className="bg-card border border-card-border/60 rounded-xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-surface-dark/80 text-muted uppercase text-[10px] tracking-wider border-b border-card-border/60">
              <tr>
                <th className="py-3 px-4 w-28">Account Code</th>
                <th className="py-3 px-4">Account Name</th>
                <th className="py-3 px-4 w-32">Type</th>
                <th className="py-3 px-4 w-36 text-right">Debit Activity ($)</th>
                <th className="py-3 px-4 w-36 text-right">Credit Activity ($)</th>
                <th className="py-3 px-4 w-36 text-right">Debit Balance ($)</th>
                <th className="py-3 px-4 w-36 text-right">Credit Balance ($)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-card-border/40 text-white font-mono">
              {loading ? (
                <tr>
                  <td colSpan={7} className="text-center py-8 text-muted font-sans">
                    Loading trial balance...
                  </td>
                </tr>
              ) : !tb?.rows || tb.rows.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-8 text-muted font-sans">
                    No accounts found for trial balance.
                  </td>
                </tr>
              ) : (
                tb.rows.map((row: any) => (
                  <tr key={row.account_id} className="hover:bg-surface-dark/40 transition-colors">
                    <td className="py-2.5 px-4 font-bold text-primary">{row.account_code}</td>
                    <td className="py-2.5 px-4 font-sans font-medium text-white">{row.account_name}</td>
                    <td className="py-2.5 px-4 font-sans text-[11px] text-muted">{row.account_type}</td>
                    <td className="py-2.5 px-4 text-right text-muted">
                      {row.debit_total_minor > 0 ? formatCurrency(row.debit_total_minor) : '—'}
                    </td>
                    <td className="py-2.5 px-4 text-right text-muted">
                      {row.credit_total_minor > 0 ? formatCurrency(row.credit_total_minor) : '—'}
                    </td>
                    <td className="py-2.5 px-4 text-right text-emerald-400 font-bold">
                      {row.debit_balance_minor > 0 ? formatCurrency(row.debit_balance_minor) : '—'}
                    </td>
                    <td className="py-2.5 px-4 text-right text-rose-400 font-bold">
                      {row.credit_balance_minor > 0 ? formatCurrency(row.credit_balance_minor) : '—'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
            {tb && (
              <tfoot className="bg-surface-dark/90 font-mono font-bold border-t-2 border-card-border">
                <tr>
                  <td colSpan={3} className="py-3 px-4 text-right uppercase text-muted text-[10px] font-sans">
                    Total Equilibrium
                  </td>
                  <td className="py-3 px-4 text-right text-muted text-xs">
                    {formatCurrency(tb.total_debit_minor)}
                  </td>
                  <td className="py-3 px-4 text-right text-muted text-xs">
                    {formatCurrency(tb.total_credit_minor)}
                  </td>
                  <td className="py-3 px-4 text-right text-emerald-400 text-xs">
                    {formatCurrency(tb.total_debit_minor)}
                  </td>
                  <td className="py-3 px-4 text-right text-rose-400 text-xs">
                    {formatCurrency(tb.total_credit_minor)}
                  </td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>
    </div>
  );
}
