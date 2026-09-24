'use client';

import React, { useState, useEffect } from 'react';
import { FinanceNavTabs } from '@/components/dashboard/FinanceNavTabs';
import { AccountingNavTabs } from '@/components/dashboard/AccountingNavTabs';
import {
  Landmark,
  Download,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  ShieldCheck,
  Scale,
} from 'lucide-react';

export default function BalanceSheetPage() {
  const [bs, setBs] = useState<any>(null);
  const [asOfDate, setAsOfDate] = useState(new Date().toISOString().split('T')[0]);
  const [loading, setLoading] = useState(true);

  const fetchBalanceSheet = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/finance/accounting/balance-sheet?as_of_date=${asOfDate}`);
      if (res.ok) {
        const data = await res.json();
        setBs(data);
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBalanceSheet();
  }, [asOfDate]);

  const formatCurrency = (cents: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(cents / 100);
  };

  const handleExportCSV = () => {
    if (!bs) return;
    const rows = [['Category', 'Account Code', 'Account Name', 'Amount ($)']];

    rows.push(['ASSETS', '', '', '']);
    (bs.asset_accounts || []).forEach((a: any) => {
      rows.push(['Asset', a.account_code, `"${a.account_name.replace(/"/g, '""')}"`, (a.balance_minor / 100).toFixed(2)]);
    });
    rows.push(['TOTAL ASSETS', '', '', (bs.total_assets_minor / 100).toFixed(2)]);

    rows.push(['LIABILITIES', '', '', '']);
    (bs.liability_accounts || []).forEach((l: any) => {
      rows.push(['Liability', l.account_code, `"${l.account_name.replace(/"/g, '""')}"`, (l.balance_minor / 100).toFixed(2)]);
    });
    rows.push(['TOTAL LIABILITIES', '', '', (bs.total_liabilities_minor / 100).toFixed(2)]);

    rows.push(['EQUITY', '', '', '']);
    (bs.equity_accounts || []).forEach((e: any) => {
      rows.push(['Equity', e.account_code, `"${e.account_name.replace(/"/g, '""')}"`, (e.balance_minor / 100).toFixed(2)]);
    });
    rows.push(['Retained Earnings', '3900', 'Accumulated Net Profit', (bs.retained_earnings_minor / 100).toFixed(2)]);
    rows.push(['TOTAL EQUITY', '', '', (bs.total_equity_minor / 100).toFixed(2)]);
    rows.push(['TOTAL LIABILITIES AND EQUITY', '', '', (bs.total_liabilities_and_equity_minor / 100).toFixed(2)]);

    const csvContent = 'data:text/csv;charset=utf-8,' + rows.map((e) => e.join(',')).join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `balance_sheet_${asOfDate}.csv`);
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
            <Landmark className="h-6 w-6 text-amber-400" />
            Balance Sheet
          </h1>
          <p className="text-sm text-muted">
            Formal statement of financial position verifying Assets = Liabilities + Owner Equity.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={fetchBalanceSheet}
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

      {/* Accounting Invariant Verification Banner */}
      {bs && (
        <div className={`p-4 rounded-xl border flex items-center justify-between ${
          bs.is_balanced
            ? 'bg-emerald-950/20 border-emerald-800/40 text-emerald-300'
            : 'bg-rose-950/30 border-rose-800/50 text-rose-300'
        }`}>
          <div className="flex items-center gap-3">
            {bs.is_balanced ? (
              <CheckCircle2 className="h-6 w-6 text-emerald-400 shrink-0" />
            ) : (
              <AlertCircle className="h-6 w-6 text-rose-400 shrink-0" />
            )}
            <div>
              <div className="text-sm font-bold flex items-center gap-2">
                <span>BALANCE SHEET EQUILIBRIUM:</span>
                <span className={`px-2.5 py-0.5 rounded text-xs font-extrabold ${
                  bs.is_balanced ? 'bg-emerald-500/20 text-emerald-300' : 'bg-rose-500/20 text-rose-300'
                }`}>
                  {bs.is_balanced ? 'BALANCED (Assets == Liabilities + Equity)' : 'OUT OF BALANCE'}
                </span>
              </div>
              <p className="text-xs opacity-80 mt-0.5">
                Total Assets ({formatCurrency(bs.total_assets_minor)}) = Total Liabilities ({formatCurrency(bs.total_liabilities_minor)}) + Total Equity ({formatCurrency(bs.total_equity_minor)})
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

      {/* Balance Sheet Columns / Sections */}
      {loading ? (
        <div className="p-12 text-center text-muted text-xs bg-card border border-card-border rounded-xl">
          Loading balance sheet...
        </div>
      ) : !bs ? (
        <div className="p-12 text-center text-muted text-xs bg-card border border-card-border rounded-xl">
          No accounting records found.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Left Column: ASSETS */}
          <div className="bg-card border border-card-border/60 rounded-xl overflow-hidden shadow-sm flex flex-col justify-between">
            <div className="p-5 space-y-4">
              <div className="flex items-center justify-between border-b border-card-border/60 pb-3">
                <h2 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                  <Landmark className="h-4 w-4 text-emerald-400" />
                  Assets
                </h2>
                <span className="font-mono text-sm font-bold text-emerald-400">
                  {formatCurrency(bs.total_assets_minor)}
                </span>
              </div>

              <div className="space-y-2">
                {bs.asset_accounts.length === 0 ? (
                  <div className="text-xs text-muted italic">No asset accounts recorded.</div>
                ) : (
                  bs.asset_accounts.map((acc: any) => (
                    <div key={acc.account_id} className="flex items-center justify-between text-xs py-1 border-b border-card-border/20">
                      <span className="text-muted">
                        <span className="font-mono text-primary mr-2">{acc.account_code}</span>
                        {acc.account_name}
                      </span>
                      <span className="font-mono font-medium text-white">{formatCurrency(acc.balance_minor)}</span>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="p-4 bg-surface-dark/70 border-t border-card-border/80 flex items-center justify-between font-mono font-bold text-xs">
              <span className="text-white uppercase font-sans">Total Assets</span>
              <span className="text-emerald-400">{formatCurrency(bs.total_assets_minor)}</span>
            </div>
          </div>

          {/* Right Column: LIABILITIES & EQUITY */}
          <div className="space-y-6">
            {/* Liabilities */}
            <div className="bg-card border border-card-border/60 rounded-xl overflow-hidden shadow-sm">
              <div className="p-5 space-y-4">
                <div className="flex items-center justify-between border-b border-card-border/60 pb-3">
                  <h2 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                    <Scale className="h-4 w-4 text-rose-400" />
                    Liabilities
                  </h2>
                  <span className="font-mono text-sm font-bold text-rose-400">
                    {formatCurrency(bs.total_liabilities_minor)}
                  </span>
                </div>

                <div className="space-y-2">
                  {bs.liability_accounts.length === 0 ? (
                    <div className="text-xs text-muted italic">No liability accounts recorded.</div>
                  ) : (
                    bs.liability_accounts.map((acc: any) => (
                      <div key={acc.account_id} className="flex items-center justify-between text-xs py-1 border-b border-card-border/20">
                        <span className="text-muted">
                          <span className="font-mono text-primary mr-2">{acc.account_code}</span>
                          {acc.account_name}
                        </span>
                        <span className="font-mono font-medium text-white">{formatCurrency(acc.balance_minor)}</span>
                      </div>
                    ))
                  )}
                </div>
              </div>

              <div className="p-4 bg-surface-dark/70 border-t border-card-border/80 flex items-center justify-between font-mono font-bold text-xs">
                <span className="text-white uppercase font-sans">Total Liabilities</span>
                <span className="text-rose-400">{formatCurrency(bs.total_liabilities_minor)}</span>
              </div>
            </div>

            {/* Equity */}
            <div className="bg-card border border-card-border/60 rounded-xl overflow-hidden shadow-sm">
              <div className="p-5 space-y-4">
                <div className="flex items-center justify-between border-b border-card-border/60 pb-3">
                  <h2 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                    <ShieldCheck className="h-4 w-4 text-blue-400" />
                    Equity
                  </h2>
                  <span className="font-mono text-sm font-bold text-blue-400">
                    {formatCurrency(bs.total_equity_minor)}
                  </span>
                </div>

                <div className="space-y-2">
                  {bs.equity_accounts.map((acc: any) => (
                    <div key={acc.account_id} className="flex items-center justify-between text-xs py-1 border-b border-card-border/20">
                      <span className="text-muted">
                        <span className="font-mono text-primary mr-2">{acc.account_code}</span>
                        {acc.account_name}
                      </span>
                      <span className="font-mono font-medium text-white">{formatCurrency(acc.balance_minor)}</span>
                    </div>
                  ))}
                  <div className="flex items-center justify-between text-xs py-1 border-b border-card-border/20">
                    <span className="text-muted">
                      <span className="font-mono text-primary mr-2">3900</span>
                      Retained Earnings / Accumulated Profit
                    </span>
                    <span className="font-mono font-medium text-white">{formatCurrency(bs.retained_earnings_minor)}</span>
                  </div>
                </div>
              </div>

              <div className="p-4 bg-surface-dark/70 border-t border-card-border/80 flex items-center justify-between font-mono font-bold text-xs">
                <span className="text-white uppercase font-sans">Total Equity</span>
                <span className="text-blue-400">{formatCurrency(bs.total_equity_minor)}</span>
              </div>
            </div>

            {/* Total Liabilities & Equity Summary */}
            <div className="p-4 bg-surface-dark/90 border border-card-border rounded-xl flex items-center justify-between font-mono font-extrabold text-sm">
              <span className="text-white uppercase font-sans">Total Liabilities & Equity</span>
              <span className="text-primary">{formatCurrency(bs.total_liabilities_and_equity_minor)}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
