'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  DollarSign,
  TrendingUp,
  TrendingDown,
  Receipt,
  Wallet,
  Building2,
  ArrowDownLeft,
  ArrowUpRight,
  PiggyBank,
  CheckCircle2,
  AlertTriangle,
  FileSpreadsheet,
  Plus,
  RefreshCw,
  Activity,
} from 'lucide-react';
import { FinanceNavTabs } from '@/components/dashboard/FinanceNavTabs';
import { fetchApi } from '@/lib/api-client';

export default function FinancialDashboardPage() {
  const [loading, setLoading] = useState(true);
  const [dashboard, setDashboard] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const loadDashboard = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetchApi('/finance/dashboard');
      if (res && !res.error) {
        setDashboard(res.data || res);
      } else {
        // Fallback demo structure if empty
        setDashboard({
          accounts: [],
          total_liquidity_cents: 0,
          cash_flow: {
            total_cash_in_cents: 0,
            total_cash_out_cents: 0,
            net_cash_flow_cents: 0,
            receivables_due_cents: 0,
            payables_due_cents: 0,
          },
          aging: {
            receivables: { current_cents: 0, days_1_30_cents: 0, days_31_60_cents: 0, days_61_90_cents: 0, days_over_90_cents: 0, total_cents: 0 },
            payables: { current_cents: 0, days_1_30_cents: 0, days_31_60_cents: 0, days_61_90_cents: 0, days_over_90_cents: 0, total_cents: 0 },
          },
          recent_expenses: [],
        });
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load financial dashboard');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboard();
  }, []);

  const formatCents = (cents?: number) => {
    const val = (cents || 0) / 100;
    return `$${val.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2.5">
            <Wallet className="h-7 w-7 text-primary" />
            Studio Financial Operations & Profitability 2.0
          </h1>
          <p className="text-sm text-muted mt-1">
            Real-time cash flow, bank liquidity, expense lifecycle approvals, accounts aging, and job profitability.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={loadDashboard}
            className="flex items-center gap-1.5 px-3 py-2 bg-card-bg border border-card-border rounded-lg text-xs font-medium text-white hover:bg-card-border/40 transition"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Refresh
          </button>
          <Link
            href="/dashboard/finance/expenses"
            className="flex items-center gap-1.5 px-3.5 py-2 bg-primary hover:bg-primary-hover text-black rounded-lg text-xs font-semibold shadow-sm transition"
          >
            <Plus className="h-4 w-4" />
            Record Expense
          </Link>
        </div>
      </div>

      <FinanceNavTabs />

      {error && (
        <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm flex items-center gap-2">
          <AlertTriangle className="h-5 w-5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Liquidity */}
        <div className="p-5 rounded-2xl bg-card-bg border border-card-border flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted">Total Available Liquidity</span>
            <div className="h-8 w-8 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-400">
              <Wallet className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold text-white">
              {formatCents(dashboard?.total_liquidity_cents || 0)}
            </div>
            <p className="text-xs text-muted mt-1">Across all verified studio accounts</p>
          </div>
        </div>

        {/* Total Cash In */}
        <div className="p-5 rounded-2xl bg-card-bg border border-card-border flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted">Cash Collected (Period)</span>
            <div className="h-8 w-8 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-400">
              <ArrowDownLeft className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold text-emerald-400">
              {formatCents(dashboard?.cash_flow?.total_cash_in_cents || 0)}
            </div>
            <p className="text-xs text-muted mt-1">Client payments & receivables settled</p>
          </div>
        </div>

        {/* Total Cash Out */}
        <div className="p-5 rounded-2xl bg-card-bg border border-card-border flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted">Total Expenses Paid</span>
            <div className="h-8 w-8 rounded-lg bg-rose-500/10 flex items-center justify-center text-rose-400">
              <ArrowUpRight className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold text-rose-400">
              {formatCents(dashboard?.cash_flow?.total_cash_out_cents || 0)}
            </div>
            <p className="text-xs text-muted mt-1">Direct costs, labor, and vendor payables</p>
          </div>
        </div>

        {/* Net Cash Flow */}
        <div className="p-5 rounded-2xl bg-card-bg border border-card-border flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted">Net Cash Flow</span>
            <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
              <TrendingUp className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className={`text-2xl font-bold ${(dashboard?.cash_flow?.net_cash_flow_cents || 0) >= 0 ? 'text-white' : 'text-rose-400'}`}>
              {formatCents(dashboard?.cash_flow?.net_cash_flow_cents || 0)}
            </div>
            <p className="text-xs text-muted mt-1">Operational surplus / margin</p>
          </div>
        </div>
      </div>

      {/* Grid: Aging Summary & Accounts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Receivables & Payables Aging */}
        <div className="p-5 rounded-2xl bg-card-bg border border-card-border space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold text-white flex items-center gap-2">
              <Activity className="h-4 w-4 text-primary" />
              Outstanding Balance Aging
            </h2>
            <Link href="/dashboard/finance/receivables" className="text-xs text-primary hover:underline">
              View Aging Schedule &rarr;
            </Link>
          </div>

          <div className="space-y-3">
            <div className="p-3.5 rounded-xl bg-card-border/30 flex items-center justify-between">
              <div>
                <span className="text-xs text-muted">Uncollected Client Receivables</span>
                <div className="text-lg font-bold text-emerald-400">
                  {formatCents(dashboard?.aging?.receivables?.total_cents || dashboard?.cash_flow?.receivables_due_cents || 0)}
                </div>
              </div>
              <div className="text-right text-xs text-muted space-y-0.5">
                <div>Current: {formatCents(dashboard?.aging?.receivables?.current_cents || 0)}</div>
                <div className="text-amber-400">1-30d: {formatCents(dashboard?.aging?.receivables?.days_1_30_cents || 0)}</div>
                <div className="text-rose-400">&gt;60d: {formatCents((dashboard?.aging?.receivables?.days_61_90_cents || 0) + (dashboard?.aging?.receivables?.days_over_90_cents || 0))}</div>
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-card-border/30 flex items-center justify-between">
              <div>
                <span className="text-xs text-muted">Outstanding Vendor Payables</span>
                <div className="text-lg font-bold text-rose-400">
                  {formatCents(dashboard?.aging?.payables?.total_cents || dashboard?.cash_flow?.payables_due_cents || 0)}
                </div>
              </div>
              <div className="text-right text-xs text-muted space-y-0.5">
                <div>Current: {formatCents(dashboard?.aging?.payables?.current_cents || 0)}</div>
                <div className="text-amber-400">1-30d: {formatCents(dashboard?.aging?.payables?.days_1_30_cents || 0)}</div>
                <div className="text-rose-400">&gt;60d: {formatCents((dashboard?.aging?.payables?.days_61_90_cents || 0) + (dashboard?.aging?.payables?.days_over_90_cents || 0))}</div>
              </div>
            </div>
          </div>
        </div>

        {/* Studio Accounts */}
        <div className="p-5 rounded-2xl bg-card-bg border border-card-border space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold text-white flex items-center gap-2">
              <Wallet className="h-4 w-4 text-primary" />
              Studio Financial Accounts
            </h2>
            <Link href="/dashboard/finance/accounts" className="text-xs text-primary hover:underline">
              Manage Accounts &rarr;
            </Link>
          </div>

          <div className="space-y-2.5">
            {dashboard?.accounts && dashboard.accounts.length > 0 ? (
              dashboard.accounts.map((acc: any) => (
                <div key={acc.id} className="p-3 rounded-xl bg-card-border/30 flex items-center justify-between">
                  <div>
                    <div className="text-sm font-medium text-white">{acc.name}</div>
                    <div className="text-xs text-muted uppercase tracking-wider">{acc.account_type} &bull; {acc.currency || 'USD'}</div>
                  </div>
                  <div className="text-base font-bold text-white">
                    {formatCents(acc.current_balance_cents)}
                  </div>
                </div>
              ))
            ) : (
              <div className="p-6 text-center text-muted text-xs bg-card-border/20 rounded-xl">
                No bank or cash accounts configured yet.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Quick Nav Modules */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <Link href="/dashboard/finance/expenses" className="p-4 rounded-xl bg-card-bg border border-card-border hover:border-primary/50 text-center transition group">
          <Receipt className="h-6 w-6 mx-auto text-primary group-hover:scale-110 transition" />
          <div className="text-xs font-semibold text-white mt-2">Expenses</div>
          <div className="text-[10px] text-muted">Approvals & tracking</div>
        </Link>
        <Link href="/dashboard/finance/vendors" className="p-4 rounded-xl bg-card-bg border border-card-border hover:border-primary/50 text-center transition group">
          <Building2 className="h-6 w-6 mx-auto text-emerald-400 group-hover:scale-110 transition" />
          <div className="text-xs font-semibold text-white mt-2">Vendors</div>
          <div className="text-[10px] text-muted">Suppliers & terms</div>
        </Link>
        <Link href="/dashboard/finance/receivables" className="p-4 rounded-xl bg-card-bg border border-card-border hover:border-primary/50 text-center transition group">
          <ArrowDownLeft className="h-6 w-6 mx-auto text-amber-400 group-hover:scale-110 transition" />
          <div className="text-xs font-semibold text-white mt-2">Receivables</div>
          <div className="text-[10px] text-muted">Invoices & reminders</div>
        </Link>
        <Link href="/dashboard/finance/payables" className="p-4 rounded-xl bg-card-bg border border-card-border hover:border-primary/50 text-center transition group">
          <ArrowUpRight className="h-6 w-6 mx-auto text-rose-400 group-hover:scale-110 transition" />
          <div className="text-xs font-semibold text-white mt-2">Payables</div>
          <div className="text-[10px] text-muted">Bills & payouts</div>
        </Link>
        <Link href="/dashboard/finance/profitability" className="p-4 rounded-xl bg-card-bg border border-card-border hover:border-primary/50 text-center transition group">
          <TrendingUp className="h-6 w-6 mx-auto text-purple-400 group-hover:scale-110 transition" />
          <div className="text-xs font-semibold text-white mt-2">Profitability</div>
          <div className="text-[10px] text-muted">Projects & margins</div>
        </Link>
        <Link href="/dashboard/finance/reports" className="p-4 rounded-xl bg-card-bg border border-card-border hover:border-primary/50 text-center transition group">
          <FileSpreadsheet className="h-6 w-6 mx-auto text-cyan-400 group-hover:scale-110 transition" />
          <div className="text-xs font-semibold text-white mt-2">Reports</div>
          <div className="text-[10px] text-muted">Taxes & CSV exports</div>
        </Link>
      </div>
    </div>
  );
}
