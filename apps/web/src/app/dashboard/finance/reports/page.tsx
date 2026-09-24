'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  FileSpreadsheet,
  TrendingUp,
  Scale,
  BookOpen,
  DollarSign,
  Receipt,
  CheckCheck,
  Award,
  Sparkles,
  Lock,
  Download,
  AlertTriangle,
  RefreshCw,
  ArrowUpRight,
  ArrowDownLeft,
  ChevronRight,
  ShieldCheck,
  Layers,
} from 'lucide-react';
import { FinanceNavTabs } from '@/components/dashboard/FinanceNavTabs';
import { ReportsNavTabs } from '@/components/dashboard/ReportsNavTabs';
import { fetchApi } from '@/lib/api-client';

export default function FinanceReportsOverviewPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pnl, setPnl] = useState<any>(null);
  const [balanceSheet, setBalanceSheet] = useState<any>(null);
  const [reconciliation, setReconciliation] = useState<any>(null);
  const [closeStatus, setCloseStatus] = useState<any>(null);
  const [anomalies, setAnomalies] = useState<any[]>([]);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [pnlRes, bsRes, recRes, closeRes, anomRes] = await Promise.all([
        fetchApi('/finance/reports/profit-loss'),
        fetchApi('/finance/reports/balance-sheet'),
        fetchApi('/finance/reports/reconciliation/overview'),
        fetchApi('/finance/reports/month-end-close/checklist'),
        fetchApi('/finance/reports/anomalies'),
      ]);

      if (pnlRes && !pnlRes.error) setPnl(pnlRes.data || (pnlRes as any));
      if (bsRes && !bsRes.error) setBalanceSheet(bsRes.data || (bsRes as any));
      if (recRes && !recRes.error) setReconciliation(recRes.data || (recRes as any));
      if (closeRes && !closeRes.error) setCloseStatus(closeRes.data || (closeRes as any));
      if (anomRes && !anomRes.error) setAnomalies(anomRes.data?.anomalies || (anomRes as any).anomalies || []);
    } catch (err: any) {
      setError(err.message || 'Failed to load financial reporting overview');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const formatCurrency = (paise?: number, currency = 'INR') => {
    const val = (paise || 0) / 100;
    const sym = currency === 'INR' ? '₹' : '$';
    return `${sym}${val.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2.5">
            <FileSpreadsheet className="h-7 w-7 text-cyan-400" />
            Financial Reporting & Statements 2.0
          </h1>
          <p className="text-sm text-muted mt-1">
            Audit-grade double-entry financial statements, multi-system reconciliation, and compliance intelligence.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href="/dashboard/finance/reports/exports"
            className="flex items-center gap-1.5 px-3.5 py-2 bg-card-border/60 hover:bg-card-border text-white rounded-lg text-xs font-semibold transition"
          >
            <Download className="h-3.5 w-3.5 text-cyan-400" />
            Accountant Packager
          </Link>
          <button
            onClick={loadData}
            disabled={loading}
            className="flex items-center gap-1.5 px-3 py-2 bg-card-bg border border-card-border rounded-lg text-xs font-medium text-white hover:bg-card-border/40 transition"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
            Refresh
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

      {/* Snapshot KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-5 rounded-2xl bg-card-bg border border-card-border hover:border-cyan-500/30 transition shadow-sm">
          <div className="flex items-center justify-between text-xs text-muted">
            <span>Operating Revenue</span>
            <span className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-400">
              <TrendingUp className="h-4 w-4" />
            </span>
          </div>
          <div className="text-2xl font-bold text-white mt-2">
            {formatCurrency(pnl?.total_revenue || 0)}
          </div>
          <div className="text-xs text-emerald-400 mt-1 flex items-center gap-1">
            <span>Gross Margin: {pnl?.gross_margin_percentage || 0}%</span>
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-card-bg border border-card-border hover:border-cyan-500/30 transition shadow-sm">
          <div className="flex items-center justify-between text-xs text-muted">
            <span>Net Profit</span>
            <span className="p-1.5 rounded-lg bg-cyan-500/10 text-cyan-400">
              <DollarSign className="h-4 w-4" />
            </span>
          </div>
          <div className={`text-2xl font-bold mt-2 ${(pnl?.net_profit || 0) >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
            {formatCurrency(pnl?.net_profit || 0)}
          </div>
          <div className="text-xs text-muted mt-1">
            Net Margin: {pnl?.net_margin_percentage || 0}%
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-card-bg border border-card-border hover:border-cyan-500/30 transition shadow-sm">
          <div className="flex items-center justify-between text-xs text-muted">
            <span>Balance Sheet Equity</span>
            <span className="p-1.5 rounded-lg bg-indigo-500/10 text-indigo-400">
              <Scale className="h-4 w-4" />
            </span>
          </div>
          <div className="text-2xl font-bold text-white mt-2">
            {formatCurrency(balanceSheet?.total_equity || 0)}
          </div>
          <div className="text-xs mt-1 flex items-center gap-1.5">
            {balanceSheet?.is_balanced ? (
              <span className="text-emerald-400 flex items-center gap-1">
                <ShieldCheck className="h-3 w-3" /> Balanced (A = L + E)
              </span>
            ) : (
              <span className="text-rose-400 flex items-center gap-1">
                <AlertTriangle className="h-3 w-3" /> Out of Balance
              </span>
            )}
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-card-bg border border-card-border hover:border-cyan-500/30 transition shadow-sm">
          <div className="flex items-center justify-between text-xs text-muted">
            <span>Month-End Close</span>
            <span className="p-1.5 rounded-lg bg-amber-500/10 text-amber-400">
              <Lock className="h-4 w-4" />
            </span>
          </div>
          <div className="text-2xl font-bold text-white mt-2">
            {closeStatus?.completion_percentage || 0}%
          </div>
          <div className="text-xs text-muted mt-1">
            {closeStatus?.passed_items_count || 0} of {closeStatus?.total_items_count || 14} checklist passed
          </div>
        </div>
      </div>

      {/* Primary Statement Launchpad Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <Link
          href="/dashboard/finance/reports/profit-loss"
          className="p-6 rounded-2xl bg-card-bg border border-card-border hover:border-cyan-500/40 hover:bg-card-bg/80 transition group flex flex-col justify-between"
        >
          <div>
            <div className="w-10 h-10 rounded-xl bg-cyan-500/10 text-cyan-400 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
              <TrendingUp className="h-5 w-5" />
            </div>
            <h3 className="text-base font-semibold text-white group-hover:text-cyan-400 transition-colors">
              Profit & Loss Statement
            </h3>
            <p className="text-xs text-muted mt-1.5">
              Operating revenue, direct shoot costs, gross profit, overhead expenses, EBITDA, and net earnings with period comparisons.
            </p>
          </div>
          <div className="flex items-center text-xs font-semibold text-cyan-400 mt-5">
            <span>View P&L Statement</span>
            <ChevronRight className="h-4 w-4 ml-1 group-hover:translate-x-1 transition-transform" />
          </div>
        </Link>

        <Link
          href="/dashboard/finance/reports/balance-sheet"
          className="p-6 rounded-2xl bg-card-bg border border-card-border hover:border-indigo-500/40 hover:bg-card-bg/80 transition group flex flex-col justify-between"
        >
          <div>
            <div className="w-10 h-10 rounded-xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
              <Scale className="h-5 w-5" />
            </div>
            <h3 className="text-base font-semibold text-white group-hover:text-indigo-400 transition-colors">
              Balance Sheet
            </h3>
            <p className="text-xs text-muted mt-1.5">
              Assets (Bank, AR, Equipment), Liabilities (AP, Taxes, Unearned Revenue), and Studio Equity with formal accounting equation proofs.
            </p>
          </div>
          <div className="flex items-center text-xs font-semibold text-indigo-400 mt-5">
            <span>View Balance Sheet</span>
            <ChevronRight className="h-4 w-4 ml-1 group-hover:translate-x-1 transition-transform" />
          </div>
        </Link>

        <Link
          href="/dashboard/finance/reports/trial-balance"
          className="p-6 rounded-2xl bg-card-bg border border-card-border hover:border-emerald-500/40 hover:bg-card-bg/80 transition group flex flex-col justify-between"
        >
          <div>
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
              <BookOpen className="h-5 w-5" />
            </div>
            <h3 className="text-base font-semibold text-white group-hover:text-emerald-400 transition-colors">
              Trial Balance
            </h3>
            <p className="text-xs text-muted mt-1.5">
              Authoritative debit and credit balances for all Chart of Accounts items verifying ledger equality and journal integrity.
            </p>
          </div>
          <div className="flex items-center text-xs font-semibold text-emerald-400 mt-5">
            <span>View Trial Balance</span>
            <ChevronRight className="h-4 w-4 ml-1 group-hover:translate-x-1 transition-transform" />
          </div>
        </Link>
      </div>

      {/* Secondary Statements Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Link
          href="/dashboard/finance/reports/cash-flow"
          className="p-4 rounded-xl bg-card-bg border border-card-border hover:border-cyan-500/30 transition flex items-center justify-between"
        >
          <div className="flex items-center gap-3">
            <DollarSign className="h-5 w-5 text-cyan-400" />
            <div>
              <div className="text-sm font-medium text-white">Cash Flow Statement</div>
              <div className="text-[11px] text-muted">Operating, Investing & Financing</div>
            </div>
          </div>
          <ChevronRight className="h-4 w-4 text-muted" />
        </Link>

        <Link
          href="/dashboard/finance/reports/ar-aging"
          className="p-4 rounded-xl bg-card-bg border border-card-border hover:border-cyan-500/30 transition flex items-center justify-between"
        >
          <div className="flex items-center gap-3">
            <ArrowDownLeft className="h-5 w-5 text-emerald-400" />
            <div>
              <div className="text-sm font-medium text-white">AR Aging Analysis</div>
              <div className="text-[11px] text-muted">0-30, 31-60, 61-90, 90+ buckets</div>
            </div>
          </div>
          <ChevronRight className="h-4 w-4 text-muted" />
        </Link>

        <Link
          href="/dashboard/finance/reports/ap-aging"
          className="p-4 rounded-xl bg-card-bg border border-card-border hover:border-cyan-500/30 transition flex items-center justify-between"
        >
          <div className="flex items-center gap-3">
            <ArrowUpRight className="h-5 w-5 text-rose-400" />
            <div>
              <div className="text-sm font-medium text-white">AP Aging Analysis</div>
              <div className="text-[11px] text-muted">Vendor & subcontractor payables</div>
            </div>
          </div>
          <ChevronRight className="h-4 w-4 text-muted" />
        </Link>

        <Link
          href="/dashboard/finance/reports/reconciliation"
          className="p-4 rounded-xl bg-card-bg border border-card-border hover:border-cyan-500/30 transition flex items-center justify-between"
        >
          <div className="flex items-center gap-3">
            <CheckCheck className="h-5 w-5 text-amber-400" />
            <div>
              <div className="text-sm font-medium text-white">Reconciliation Hub</div>
              <div className="text-[11px] text-muted">GL vs Subledgers vs Tax vs Bank</div>
            </div>
          </div>
          <ChevronRight className="h-4 w-4 text-muted" />
        </Link>
      </div>

      {/* Anomalies and Discrepancy Alert Box */}
      {anomalies.length > 0 && (
        <div className="p-6 rounded-2xl bg-card-bg border border-amber-500/30 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-400 flex items-center justify-center">
                <AlertTriangle className="h-4 w-4" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-white">
                  Active Financial Anomalies & Outliers ({anomalies.length})
                </h3>
                <p className="text-xs text-muted">
                  Deterministic auditing detected unbilled shoots, tax variances, or excessive overdue balances.
                </p>
              </div>
            </div>
            <Link
              href="/dashboard/finance/reports/reconciliation"
              className="text-xs font-semibold text-amber-400 hover:underline flex items-center gap-1"
            >
              Resolve All <ChevronRight className="h-3.5 w-3.5" />
            </Link>
          </div>

          <div className="divide-y divide-card-border/40">
            {anomalies.slice(0, 3).map((anom: any) => (
              <div key={anom.id} className="py-3 flex items-center justify-between text-xs">
                <div>
                  <span className="font-semibold text-white">{anom.title}</span>
                  <p className="text-muted text-[11px] mt-0.5">{anom.description}</p>
                </div>
                <div className="text-right">
                  <span className="font-mono text-amber-400 font-semibold">{formatCurrency(anom.discrepancy_amount)}</span>
                  <div className="text-[10px] text-muted uppercase mt-0.5">{anom.severity}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
