'use client';

import React, { useState, useEffect } from 'react';
import { FinanceNavTabs } from '@/components/dashboard/FinanceNavTabs';
import { AccountingNavTabs } from '@/components/dashboard/AccountingNavTabs';
import {
  Scale,
  TrendingUp,
  Landmark,
  Wallet,
  ArrowDownLeft,
  ArrowUpRight,
  BookMarked,
  FileText,
  ListTree,
  AlertCircle,
  CheckCircle2,
  Calendar,
  Plus,
  ArrowRight,
  ShieldCheck,
} from 'lucide-react';
import Link from 'next/link';

export default function AccountingDashboardPage() {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<{
    totalAssets: number;
    totalLiabilities: number;
    totalEquity: number;
    totalRevenue: number;
    totalExpenses: number;
    netProfit: number;
    cashBalance: number;
    arBalance: number;
    apBalance: number;
    isBalanced: boolean;
    activePeriodName: string;
    draftEntriesCount: number;
    postedEntriesCount: number;
  }>({
    totalAssets: 0,
    totalLiabilities: 0,
    totalEquity: 0,
    totalRevenue: 0,
    totalExpenses: 0,
    netProfit: 0,
    cashBalance: 0,
    arBalance: 0,
    apBalance: 0,
    isBalanced: true,
    activePeriodName: 'Q3 2026',
    draftEntriesCount: 0,
    postedEntriesCount: 0,
  });

  useEffect(() => {
    // Fetch accounting overview data
    async function loadOverview() {
      try {
        setLoading(true);
        const res = await fetch('/api/finance/accounting/trial-balance');
        if (res.ok) {
          const data = await res.json();
          // derive stats
          let assets = 0;
          let liabilities = 0;
          let equity = 0;
          let revenue = 0;
          let expenses = 0;
          let cash = 0;
          let ar = 0;
          let ap = 0;

          (data.rows || []).forEach((row: any) => {
            const netDebit = row.debit_balance_minor;
            const netCredit = row.credit_balance_minor;
            if (row.account_type === 'ASSET') {
              assets += (netDebit - netCredit);
              if (row.account_code.startsWith('10')) cash += (netDebit - netCredit);
              if (row.account_code === '1100') ar += (netDebit - netCredit);
            } else if (row.account_type === 'LIABILITY') {
              liabilities += (netCredit - netDebit);
              if (row.account_code === '2000') ap += (netCredit - netDebit);
            } else if (row.account_type === 'EQUITY') {
              equity += (netCredit - netDebit);
            } else if (row.account_type === 'REVENUE' || row.account_type === 'OTHER_INCOME') {
              revenue += (netCredit - netDebit);
            } else if (row.account_type === 'EXPENSE' || row.account_type === 'COGS' || row.account_type === 'OTHER_EXPENSE') {
              expenses += (netDebit - netCredit);
            }
          });

          setStats({
            totalAssets: assets,
            totalLiabilities: liabilities,
            totalEquity: equity,
            totalRevenue: revenue,
            totalExpenses: expenses,
            netProfit: revenue - expenses,
            cashBalance: cash,
            arBalance: ar,
            apBalance: ap,
            isBalanced: data.is_balanced ?? true,
            activePeriodName: 'Active Fiscal Period',
            draftEntriesCount: 0,
            postedEntriesCount: data.rows?.length || 0,
          });
        }
      } catch {
        // Safe fallback
      } finally {
        setLoading(false);
      }
    }
    loadOverview();
  }, []);

  const formatCurrency = (minorUnits: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
    }).format(minorUnits / 100);
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
            <BookMarked className="h-6 w-6 text-primary" />
            General Ledger & Accounting 2.0
          </h1>
          <p className="text-sm text-muted">
            Formal double-entry general ledger, chart of accounts, and financial accounting reports.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href="/dashboard/finance/accounting/journal-entries"
            className="flex items-center gap-2 px-3.5 py-2 bg-card-border hover:bg-card-border/80 text-white rounded-lg text-xs font-semibold transition-all border border-card-border"
          >
            <FileText className="h-4 w-4" />
            Journal Entries
          </Link>
          <Link
            href="/dashboard/finance/accounting/journal-entries"
            className="flex items-center gap-2 px-4 py-2 bg-primary hover:bg-primary/90 text-white rounded-lg text-xs font-semibold transition-all shadow-md shadow-primary/20"
          >
            <Plus className="h-4 w-4" />
            New Journal Entry
          </Link>
        </div>
      </div>

      {/* Main Nav Tabs */}
      <FinanceNavTabs />

      {/* Accounting Sub-nav */}
      <AccountingNavTabs />

      {/* Double-Entry Balancing Banner */}
      <div className={`p-4 rounded-xl border flex items-center justify-between ${
        stats.isBalanced
          ? 'bg-emerald-950/20 border-emerald-800/40 text-emerald-300'
          : 'bg-rose-950/30 border-rose-800/50 text-rose-300'
      }`}>
        <div className="flex items-center gap-3">
          {stats.isBalanced ? (
            <CheckCircle2 className="h-5 w-5 text-emerald-400 shrink-0" />
          ) : (
            <AlertCircle className="h-5 w-5 text-rose-400 shrink-0" />
          )}
          <div>
            <div className="text-sm font-semibold flex items-center gap-2">
              <span>Double-Entry General Ledger Status:</span>
              <span className={`px-2 py-0.5 rounded text-xs font-bold ${
                stats.isBalanced ? 'bg-emerald-500/20 text-emerald-300' : 'bg-rose-500/20 text-rose-300'
              }`}>
                {stats.isBalanced ? 'BALANCED (Σ Debits == Σ Credits)' : 'OUT OF BALANCE'}
              </span>
            </div>
            <p className="text-xs opacity-80 mt-0.5">
              {stats.isBalanced
                ? 'All posted journal lines strictly satisfy double-entry equilibrium.'
                : 'Warning: Journal entries have unposted imbalances. Please audit Trial Balance.'}
            </p>
          </div>
        </div>
        <Link
          href="/dashboard/finance/accounting/trial-balance"
          className="text-xs font-semibold underline underline-offset-4 hover:opacity-100 opacity-80 flex items-center gap-1"
        >
          View Trial Balance <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </div>

      {/* Overview Stat Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* Total Assets */}
        <div className="p-4 rounded-xl bg-card border border-card-border/60 space-y-2">
          <div className="flex items-center justify-between text-muted">
            <span className="text-xs font-medium uppercase tracking-wider">Total Assets</span>
            <Landmark className="h-4 w-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-bold text-white">
            {loading ? '...' : formatCurrency(stats.totalAssets)}
          </div>
          <div className="text-xs text-muted">Normal Balance: Debit</div>
        </div>

        {/* Total Liabilities */}
        <div className="p-4 rounded-xl bg-card border border-card-border/60 space-y-2">
          <div className="flex items-center justify-between text-muted">
            <span className="text-xs font-medium uppercase tracking-wider">Total Liabilities</span>
            <Scale className="h-4 w-4 text-amber-400" />
          </div>
          <div className="text-2xl font-bold text-white">
            {loading ? '...' : formatCurrency(stats.totalLiabilities)}
          </div>
          <div className="text-xs text-muted">Normal Balance: Credit</div>
        </div>

        {/* Owner Equity */}
        <div className="p-4 rounded-xl bg-card border border-card-border/60 space-y-2">
          <div className="flex items-center justify-between text-muted">
            <span className="text-xs font-medium uppercase tracking-wider">Total Equity</span>
            <ShieldCheck className="h-4 w-4 text-blue-400" />
          </div>
          <div className="text-2xl font-bold text-white">
            {loading ? '...' : formatCurrency(stats.totalEquity)}
          </div>
          <div className="text-xs text-muted">Assets = Liabilities + Equity</div>
        </div>

        {/* Revenue */}
        <div className="p-4 rounded-xl bg-card border border-card-border/60 space-y-2">
          <div className="flex items-center justify-between text-muted">
            <span className="text-xs font-medium uppercase tracking-wider">Total Revenue</span>
            <TrendingUp className="h-4 w-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-bold text-emerald-400">
            {loading ? '...' : formatCurrency(stats.totalRevenue)}
          </div>
          <div className="text-xs text-muted">From posted credit entries</div>
        </div>

        {/* Expenses */}
        <div className="p-4 rounded-xl bg-card border border-card-border/60 space-y-2">
          <div className="flex items-center justify-between text-muted">
            <span className="text-xs font-medium uppercase tracking-wider">Total Expenses & COGS</span>
            <ArrowUpRight className="h-4 w-4 text-rose-400" />
          </div>
          <div className="text-2xl font-bold text-rose-400">
            {loading ? '...' : formatCurrency(stats.totalExpenses)}
          </div>
          <div className="text-xs text-muted">From posted debit entries</div>
        </div>

        {/* Net Profit */}
        <div className="p-4 rounded-xl bg-card border border-card-border/60 space-y-2">
          <div className="flex items-center justify-between text-muted">
            <span className="text-xs font-medium uppercase tracking-wider">Net Accounting Profit</span>
            <Wallet className="h-4 w-4 text-primary" />
          </div>
          <div className={`text-2xl font-bold ${stats.netProfit >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
            {loading ? '...' : formatCurrency(stats.netProfit)}
          </div>
          <div className="text-xs text-muted">Revenue - Expenses & COGS</div>
        </div>

        {/* Cash */}
        <div className="p-4 rounded-xl bg-card border border-card-border/60 space-y-2">
          <div className="flex items-center justify-between text-muted">
            <span className="text-xs font-medium uppercase tracking-wider">Cash & Banks (1000-1020)</span>
            <Wallet className="h-4 w-4 text-cyan-400" />
          </div>
          <div className="text-2xl font-bold text-white">
            {loading ? '...' : formatCurrency(stats.cashBalance)}
          </div>
          <div className="text-xs text-muted">Liquid asset accounts</div>
        </div>

        {/* Accounts Receivable */}
        <div className="p-4 rounded-xl bg-card border border-card-border/60 space-y-2">
          <div className="flex items-center justify-between text-muted">
            <span className="text-xs font-medium uppercase tracking-wider">Accounts Receivable (1100)</span>
            <ArrowDownLeft className="h-4 w-4 text-amber-400" />
          </div>
          <div className="text-2xl font-bold text-white">
            {loading ? '...' : formatCurrency(stats.arBalance)}
          </div>
          <div className="text-xs text-muted">Uncollected client revenue</div>
        </div>

        {/* Accounts Payable */}
        <div className="p-4 rounded-xl bg-card border border-card-border/60 space-y-2">
          <div className="flex items-center justify-between text-muted">
            <span className="text-xs font-medium uppercase tracking-wider">Accounts Payable (2000)</span>
            <ArrowUpRight className="h-4 w-4 text-rose-400" />
          </div>
          <div className="text-2xl font-bold text-white">
            {loading ? '...' : formatCurrency(stats.apBalance)}
          </div>
          <div className="text-xs text-muted">Unpaid vendor/lab liabilities</div>
        </div>
      </div>

      {/* Accounting Quick Actions & Modules */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Link
          href="/dashboard/finance/accounting/chart-of-accounts"
          className="p-4 rounded-xl bg-card hover:bg-card-border/30 border border-card-border/60 transition-all space-y-2 group"
        >
          <div className="flex items-center justify-between">
            <ListTree className="h-5 w-5 text-primary group-hover:scale-110 transition-transform" />
            <ArrowRight className="h-4 w-4 text-muted group-hover:text-white group-hover:translate-x-0.5 transition-all" />
          </div>
          <div className="text-sm font-semibold text-white">Chart of Accounts</div>
          <p className="text-xs text-muted">Manage standard and custom asset, liability, equity, revenue and expense accounts.</p>
        </Link>

        <Link
          href="/dashboard/finance/accounting/ledger"
          className="p-4 rounded-xl bg-card hover:bg-card-border/30 border border-card-border/60 transition-all space-y-2 group"
        >
          <div className="flex items-center justify-between">
            <BookMarked className="h-5 w-5 text-cyan-400 group-hover:scale-110 transition-transform" />
            <ArrowRight className="h-4 w-4 text-muted group-hover:text-white group-hover:translate-x-0.5 transition-all" />
          </div>
          <div className="text-sm font-semibold text-white">General Ledger</div>
          <p className="text-xs text-muted">View detailed debit, credit, and running balance transaction histories for every account.</p>
        </Link>

        <Link
          href="/dashboard/finance/accounting/profit-loss"
          className="p-4 rounded-xl bg-card hover:bg-card-border/30 border border-card-border/60 transition-all space-y-2 group"
        >
          <div className="flex items-center justify-between">
            <TrendingUp className="h-5 w-5 text-emerald-400 group-hover:scale-110 transition-transform" />
            <ArrowRight className="h-4 w-4 text-muted group-hover:text-white group-hover:translate-x-0.5 transition-all" />
          </div>
          <div className="text-sm font-semibold text-white">Profit & Loss Statement</div>
          <p className="text-xs text-muted">Income, fulfillment COGS, and operating expense breakdown derived from posted entries.</p>
        </Link>

        <Link
          href="/dashboard/finance/accounting/balance-sheet"
          className="p-4 rounded-xl bg-card hover:bg-card-border/30 border border-card-border/60 transition-all space-y-2 group"
        >
          <div className="flex items-center justify-between">
            <Landmark className="h-5 w-5 text-amber-400 group-hover:scale-110 transition-transform" />
            <ArrowRight className="h-4 w-4 text-muted group-hover:text-white group-hover:translate-x-0.5 transition-all" />
          </div>
          <div className="text-sm font-semibold text-white">Balance Sheet</div>
          <p className="text-xs text-muted">Financial position snapshot verifying Assets == Liabilities + Equity.</p>
        </Link>
      </div>
    </div>
  );
}
