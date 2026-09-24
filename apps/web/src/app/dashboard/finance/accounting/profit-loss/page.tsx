'use client';

import React, { useState, useEffect } from 'react';
import { FinanceNavTabs } from '@/components/dashboard/FinanceNavTabs';
import { AccountingNavTabs } from '@/components/dashboard/AccountingNavTabs';
import {
  TrendingUp,
  Download,
  RefreshCw,
  ArrowUpRight,
  ArrowDownLeft,
  Calendar,
} from 'lucide-react';

export default function ProfitAndLossPage() {
  const [pnl, setPnl] = useState<any>(null);
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [loading, setLoading] = useState(true);

  const fetchPnl = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (fromDate) params.append('from_date', fromDate);
      if (toDate) params.append('to_date', toDate);

      const res = await fetch(`/api/finance/accounting/profit-loss?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setPnl(data);
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPnl();
  }, [fromDate, toDate]);

  const formatCurrency = (minor: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(minor / 100);
  };

  const handleExportCSV = () => {
    if (!pnl) return;
    const rows = [['Category', 'Account Code', 'Account Name', 'Amount ($)']];

    rows.push(['REVENUE', '', '', '']);
    (pnl.revenue_accounts || []).forEach((r: any) => {
      rows.push(['Revenue', r.account_code, `"${r.account_name.replace(/"/g, '""')}"`, (r.total_minor / 100).toFixed(2)]);
    });
    rows.push(['TOTAL REVENUE', '', '', (pnl.total_revenue_minor / 100).toFixed(2)]);

    rows.push(['COST OF GOODS SOLD', '', '', '']);
    (pnl.cogs_accounts || []).forEach((r: any) => {
      rows.push(['COGS', r.account_code, `"${r.account_name.replace(/"/g, '""')}"`, (r.total_minor / 100).toFixed(2)]);
    });
    rows.push(['GROSS PROFIT', '', '', (pnl.gross_profit_minor / 100).toFixed(2)]);

    rows.push(['OPERATING EXPENSES', '', '', '']);
    (pnl.expense_accounts || []).forEach((r: any) => {
      rows.push(['Operating Expense', r.account_code, `"${r.account_name.replace(/"/g, '""')}"`, (r.total_minor / 100).toFixed(2)]);
    });
    rows.push(['TOTAL EXPENSES', '', '', (pnl.total_expenses_minor / 100).toFixed(2)]);

    rows.push(['NET PROFIT / (LOSS)', '', '', (pnl.net_profit_minor / 100).toFixed(2)]);

    const csvContent = 'data:text/csv;charset=utf-8,' + rows.map((e) => e.join(',')).join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `profit_and_loss_${new Date().toISOString().split('T')[0]}.csv`);
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
            <TrendingUp className="h-6 w-6 text-emerald-400" />
            Profit & Loss Statement
          </h1>
          <p className="text-sm text-muted">
            Formal accounting income statement derived from posted revenue, COGS, and expense journal entries.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={fetchPnl}
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

      {/* Date Filter Bar */}
      <div className="p-4 bg-card border border-card-border/60 rounded-xl flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-3">
          <div>
            <label className="block text-[10px] text-muted uppercase font-bold mb-1">From Date</label>
            <input
              type="date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              className="bg-surface-dark border border-card-border rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-primary"
            />
          </div>
          <div>
            <label className="block text-[10px] text-muted uppercase font-bold mb-1">To Date</label>
            <input
              type="date"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
              className="bg-surface-dark border border-card-border rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-primary"
            />
          </div>
        </div>

        {pnl && (
          <div className="flex items-center gap-6 font-mono text-xs">
            <div>
              <span className="text-muted text-[10px] block uppercase">Gross Profit</span>
              <span className="font-bold text-white">{formatCurrency(pnl.gross_profit_minor)}</span>
            </div>
            <div>
              <span className="text-muted text-[10px] block uppercase">Net Profit</span>
              <span className={`font-bold ${pnl.net_profit_minor >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                {formatCurrency(pnl.net_profit_minor)}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Income Statement Sections */}
      {loading ? (
        <div className="p-12 text-center text-muted text-xs bg-card border border-card-border rounded-xl">
          Loading profit & loss statement...
        </div>
      ) : !pnl ? (
        <div className="p-12 text-center text-muted text-xs bg-card border border-card-border rounded-xl">
          No accounting transactions recorded in this period.
        </div>
      ) : (
        <div className="bg-card border border-card-border/60 rounded-xl overflow-hidden shadow-sm divide-y divide-card-border/60">
          {/* Revenue Section */}
          <div className="p-5 space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold text-white uppercase tracking-wider">Revenue</h2>
              <span className="font-mono text-sm font-bold text-emerald-400">
                {formatCurrency(pnl.total_revenue_minor)}
              </span>
            </div>
            <div className="space-y-1 pl-4">
              {pnl.revenue_accounts.length === 0 ? (
                <div className="text-xs text-muted italic">No revenue recorded in period.</div>
              ) : (
                pnl.revenue_accounts.map((acc: any) => (
                  <div key={acc.account_id} className="flex items-center justify-between text-xs py-1">
                    <span className="text-muted">
                      <span className="font-mono text-primary mr-2">{acc.account_code}</span>
                      {acc.account_name}
                    </span>
                    <span className="font-mono font-medium text-white">{formatCurrency(acc.total_minor)}</span>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Cost of Goods Sold Section */}
          <div className="p-5 space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold text-white uppercase tracking-wider">Cost of Goods Sold (COGS)</h2>
              <span className="font-mono text-sm font-bold text-rose-400">
                {formatCurrency(pnl.total_cogs_minor)}
              </span>
            </div>
            <div className="space-y-1 pl-4">
              {pnl.cogs_accounts.length === 0 ? (
                <div className="text-xs text-muted italic">No COGS recorded in period.</div>
              ) : (
                pnl.cogs_accounts.map((acc: any) => (
                  <div key={acc.account_id} className="flex items-center justify-between text-xs py-1">
                    <span className="text-muted">
                      <span className="font-mono text-primary mr-2">{acc.account_code}</span>
                      {acc.account_name}
                    </span>
                    <span className="font-mono font-medium text-white">{formatCurrency(acc.total_minor)}</span>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Gross Profit Summary */}
          <div className="p-5 bg-surface-dark/40 flex items-center justify-between">
            <span className="text-sm font-bold text-white">GROSS PROFIT</span>
            <span className="font-mono text-sm font-bold text-white">
              {formatCurrency(pnl.gross_profit_minor)}
            </span>
          </div>

          {/* Operating Expenses Section */}
          <div className="p-5 space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold text-white uppercase tracking-wider">Operating Expenses</h2>
              <span className="font-mono text-sm font-bold text-rose-400">
                {formatCurrency(pnl.total_expenses_minor)}
              </span>
            </div>
            <div className="space-y-1 pl-4">
              {pnl.expense_accounts.length === 0 ? (
                <div className="text-xs text-muted italic">No operating expenses recorded in period.</div>
              ) : (
                pnl.expense_accounts.map((acc: any) => (
                  <div key={acc.account_id} className="flex items-center justify-between text-xs py-1">
                    <span className="text-muted">
                      <span className="font-mono text-primary mr-2">{acc.account_code}</span>
                      {acc.account_name}
                    </span>
                    <span className="font-mono font-medium text-white">{formatCurrency(acc.total_minor)}</span>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Net Profit Summary */}
          <div className="p-5 bg-surface-dark/80 flex items-center justify-between border-t-2 border-card-border">
            <div>
              <span className="text-base font-extrabold text-white block">NET PROFIT / (LOSS)</span>
              <span className="text-xs text-muted">Total Revenue - Total COGS - Total Operating Expenses</span>
            </div>
            <span className={`font-mono text-lg font-extrabold ${pnl.net_profit_minor >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
              {formatCurrency(pnl.net_profit_minor)}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
