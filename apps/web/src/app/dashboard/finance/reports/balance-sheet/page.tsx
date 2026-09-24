'use client';

import React, { useState, useEffect } from 'react';
import {
  Scale,
  RefreshCw,
  Download,
  AlertTriangle,
  Calendar,
  ShieldCheck,
  CheckCircle2,
  Building2,
  Wallet,
} from 'lucide-react';
import { FinanceNavTabs } from '@/components/dashboard/FinanceNavTabs';
import { ReportsNavTabs } from '@/components/dashboard/ReportsNavTabs';
import { fetchApi } from '@/lib/api-client';

export default function BalanceSheetPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [report, setReport] = useState<any>(null);
  const [asOfDate, setAsOfDate] = useState<string>(() => new Date().toISOString().split('T')[0]);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetchApi(`/finance/reports/balance-sheet?asOfDate=${asOfDate}`);
      if (res && !res.error) {
        setReport(res.data || res);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load Balance Sheet');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleExportCSV = () => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('pixmatch_token') : '';
    const studioId = typeof window !== 'undefined' ? localStorage.getItem('pixmatch_studio_id') : '';
    window.open(`/api/v1/finance/reports/export/csv?type=BALANCE_SHEET&asOfDate=${asOfDate}&token=${token}&studioId=${studioId}`, '_blank');
  };

  const handleExportPDF = () => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('pixmatch_token') : '';
    const studioId = typeof window !== 'undefined' ? localStorage.getItem('pixmatch_studio_id') : '';
    window.open(`/api/v1/finance/reports/export/pdf?type=BALANCE_SHEET&asOfDate=${asOfDate}&token=${token}&studioId=${studioId}`, '_blank');
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
            <Scale className="h-7 w-7 text-indigo-400" />
            Balance Sheet (Statement of Financial Position)
          </h1>
          <p className="text-sm text-muted mt-1">
            Formal double-entry statement of Assets, Liabilities, and Equity with mathematical balance verification ($Assets = Liabilities + Equity$).
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={handleExportPDF}
            className="flex items-center gap-1.5 px-3 py-2 bg-card-border/60 hover:bg-card-border text-white rounded-lg text-xs font-semibold transition"
          >
            <Download className="h-3.5 w-3.5 text-indigo-400" />
            PDF
          </button>
          <button
            onClick={handleExportCSV}
            className="flex items-center gap-1.5 px-3 py-2 bg-indigo-500/20 hover:bg-indigo-500/30 text-indigo-300 border border-indigo-500/30 rounded-lg text-xs font-semibold transition"
          >
            <Download className="h-3.5 w-3.5" />
            Safe CSV
          </button>
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

      {/* Date Filter Bar */}
      <div className="p-4 rounded-xl bg-card-bg border border-card-border flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 text-xs text-muted">
            <Calendar className="h-4 w-4 text-indigo-400" />
            <span>As of Date:</span>
            <input
              type="date"
              value={asOfDate}
              onChange={(e) => setAsOfDate(e.target.value)}
              className="px-2.5 py-1.5 bg-card-border/40 border border-card-border rounded-lg text-xs text-white"
            />
          </div>
          <button
            onClick={loadData}
            className="px-3 py-1.5 bg-primary text-black rounded-lg text-xs font-semibold hover:bg-primary-hover transition"
          >
            Update Statement
          </button>
        </div>

        {report && (
          <div className="flex items-center gap-2">
            {report.is_balanced ? (
              <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-semibold">
                <ShieldCheck className="h-4 w-4" /> Balanced: Assets = Liabilities + Equity
              </span>
            ) : (
              <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs font-semibold">
                <AlertTriangle className="h-4 w-4" /> Out of Balance Variance: {formatCurrency(report.variance, report.currency)}
              </span>
            )}
          </div>
        )}
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm flex items-center gap-2">
          <AlertTriangle className="h-5 w-5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Key Balance Sheet Metrics */}
      {report && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="p-5 rounded-2xl bg-card-bg border border-card-border">
            <span className="text-xs text-muted">Total Assets</span>
            <div className="text-2xl font-bold text-white mt-1.5">
              {formatCurrency(report.total_assets, report.currency)}
            </div>
            <div className="text-[11px] text-muted mt-1">Current + Non-Current Assets</div>
          </div>

          <div className="p-5 rounded-2xl bg-card-bg border border-card-border">
            <span className="text-xs text-muted">Total Liabilities</span>
            <div className="text-2xl font-bold text-rose-400 mt-1.5">
              {formatCurrency(report.total_liabilities, report.currency)}
            </div>
            <div className="text-[11px] text-muted mt-1">Payables, Taxes & Unearned Revenue</div>
          </div>

          <div className="p-5 rounded-2xl bg-card-bg border border-card-border">
            <span className="text-xs text-muted">Total Studio Equity</span>
            <div className="text-2xl font-bold text-indigo-400 mt-1.5">
              {formatCurrency(report.total_equity, report.currency)}
            </div>
            <div className="text-[11px] text-muted mt-1">Retained Earnings + Capital</div>
          </div>
        </div>
      )}

      {/* Balance Sheet Statement Content */}
      {report && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Assets Column */}
          <div className="p-6 rounded-2xl bg-card-bg border border-card-border space-y-6">
            <div className="border-b border-card-border pb-3 flex items-center justify-between">
              <h2 className="text-base font-bold text-white uppercase tracking-wider">Assets</h2>
              <span className="text-xs font-mono font-bold text-white">{formatCurrency(report.total_assets, report.currency)}</span>
            </div>

            {/* Current Assets */}
            <div className="space-y-2">
              <div className="text-xs font-semibold text-cyan-400">Current Assets</div>
              <div className="divide-y divide-card-border/30">
                {report.current_assets?.map((item: any) => (
                  <div key={item.account_code} className="py-2.5 flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-muted">{item.account_code}</span>
                      <span className="text-white">{item.account_name}</span>
                    </div>
                    <span className="font-mono text-white">{formatCurrency(item.balance, report.currency)}</span>
                  </div>
                ))}
              </div>
              <div className="py-2 flex items-center justify-between text-xs font-semibold border-t border-card-border text-white">
                <span>Total Current Assets</span>
                <span className="font-mono">{formatCurrency(report.total_current_assets, report.currency)}</span>
              </div>
            </div>

            {/* Non-Current Assets */}
            <div className="space-y-2 pt-2">
              <div className="text-xs font-semibold text-indigo-400">Non-Current Assets (Equipment / Studio Assets)</div>
              <div className="divide-y divide-card-border/30">
                {report.non_current_assets?.map((item: any) => (
                  <div key={item.account_code} className="py-2.5 flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-muted">{item.account_code}</span>
                      <span className="text-white">{item.account_name}</span>
                    </div>
                    <span className="font-mono text-white">{formatCurrency(item.balance, report.currency)}</span>
                  </div>
                ))}
              </div>
              <div className="py-2 flex items-center justify-between text-xs font-semibold border-t border-card-border text-white">
                <span>Total Non-Current Assets</span>
                <span className="font-mono">{formatCurrency(report.total_non_current_assets, report.currency)}</span>
              </div>
            </div>

            {/* Total Assets Summary */}
            <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-between text-sm font-bold text-white">
              <span>TOTAL ASSETS</span>
              <span className="font-mono text-emerald-400">{formatCurrency(report.total_assets, report.currency)}</span>
            </div>
          </div>

          {/* Liabilities & Equity Column */}
          <div className="p-6 rounded-2xl bg-card-bg border border-card-border space-y-6">
            <div className="border-b border-card-border pb-3 flex items-center justify-between">
              <h2 className="text-base font-bold text-white uppercase tracking-wider">Liabilities & Equity</h2>
              <span className="text-xs font-mono font-bold text-white">{formatCurrency(report.total_liabilities_and_equity, report.currency)}</span>
            </div>

            {/* Current Liabilities */}
            <div className="space-y-2">
              <div className="text-xs font-semibold text-rose-400">Current Liabilities</div>
              <div className="divide-y divide-card-border/30">
                {report.current_liabilities?.map((item: any) => (
                  <div key={item.account_code} className="py-2.5 flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-muted">{item.account_code}</span>
                      <span className="text-white">{item.account_name}</span>
                    </div>
                    <span className="font-mono text-white">{formatCurrency(item.balance, report.currency)}</span>
                  </div>
                ))}
              </div>
              <div className="py-2 flex items-center justify-between text-xs font-semibold border-t border-card-border text-white">
                <span>Total Current Liabilities</span>
                <span className="font-mono text-rose-400">{formatCurrency(report.total_current_liabilities, report.currency)}</span>
              </div>
            </div>

            {/* Equity Section */}
            <div className="space-y-2 pt-2">
              <div className="text-xs font-semibold text-indigo-400">Studio Equity</div>
              <div className="divide-y divide-card-border/30">
                {report.equity_breakdown?.map((item: any) => (
                  <div key={item.account_code || item.name} className="py-2.5 flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-muted">{item.account_code}</span>
                      <span className="text-white">{item.account_name || item.name}</span>
                    </div>
                    <span className="font-mono text-white">{formatCurrency(item.balance || item.amount, report.currency)}</span>
                  </div>
                ))}
              </div>
              <div className="py-2 flex items-center justify-between text-xs font-semibold border-t border-card-border text-white">
                <span>Total Equity</span>
                <span className="font-mono text-indigo-400">{formatCurrency(report.total_equity, report.currency)}</span>
              </div>
            </div>

            {/* Total Liabilities & Equity Summary */}
            <div className="p-4 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-between text-sm font-bold text-white">
              <span>TOTAL LIABILITIES & EQUITY</span>
              <span className="font-mono text-indigo-400">{formatCurrency(report.total_liabilities_and_equity, report.currency)}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
