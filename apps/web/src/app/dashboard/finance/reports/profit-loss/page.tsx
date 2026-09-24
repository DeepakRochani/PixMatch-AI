'use client';

import React, { useState, useEffect } from 'react';
import {
  TrendingUp,
  RefreshCw,
  Download,
  AlertTriangle,
  Calendar,
  Layers,
  ArrowDownRight,
  ArrowUpRight,
  ChevronDown,
} from 'lucide-react';
import { FinanceNavTabs } from '@/components/dashboard/FinanceNavTabs';
import { ReportsNavTabs } from '@/components/dashboard/ReportsNavTabs';
import { fetchApi } from '@/lib/api-client';

export default function ProfitAndLossPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [report, setReport] = useState<any>(null);
  const [comparison, setComparison] = useState<string>('NONE');
  const [fromDate, setFromDate] = useState<string>(() => {
    const d = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
    return d.toISOString().split('T')[0];
  });
  const [toDate, setToDate] = useState<string>(() => {
    return new Date().toISOString().split('T')[0];
  });

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      let url = `/finance/reports/profit-loss?fromDate=${fromDate}&toDate=${toDate}`;
      if (comparison !== 'NONE') {
        url += `&comparison=${comparison}`;
      }
      const res = await fetchApi(url);
      if (res && !res.error) {
        setReport(res.data || res);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load Profit & Loss statement');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [comparison]);

  const handleExportCSV = () => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('pixmatch_token') : '';
    const studioId = typeof window !== 'undefined' ? localStorage.getItem('pixmatch_studio_id') : '';
    window.open(`/api/v1/finance/reports/export/csv?type=PROFIT_LOSS&fromDate=${fromDate}&toDate=${toDate}&token=${token}&studioId=${studioId}`, '_blank');
  };

  const handleExportPDF = () => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('pixmatch_token') : '';
    const studioId = typeof window !== 'undefined' ? localStorage.getItem('pixmatch_studio_id') : '';
    window.open(`/api/v1/finance/reports/export/pdf?type=PROFIT_LOSS&fromDate=${fromDate}&toDate=${toDate}&token=${token}&studioId=${studioId}`, '_blank');
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
            <TrendingUp className="h-7 w-7 text-cyan-400" />
            Profit & Loss Statement (Income Statement)
          </h1>
          <p className="text-sm text-muted mt-1">
            Authoritative operating revenue, direct shoot costs, gross profit, overhead expenses, EBITDA, and net earnings.
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={handleExportPDF}
            className="flex items-center gap-1.5 px-3 py-2 bg-card-border/60 hover:bg-card-border text-white rounded-lg text-xs font-semibold transition"
          >
            <Download className="h-3.5 w-3.5 text-cyan-400" />
            PDF
          </button>
          <button
            onClick={handleExportCSV}
            className="flex items-center gap-1.5 px-3 py-2 bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-500/30 rounded-lg text-xs font-semibold transition"
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

      {/* Filter Bar */}
      <div className="p-4 rounded-xl bg-card-bg border border-card-border flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-2 text-xs text-muted">
            <Calendar className="h-4 w-4 text-cyan-400" />
            <span>From:</span>
            <input
              type="date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              className="px-2.5 py-1.5 bg-card-border/40 border border-card-border rounded-lg text-xs text-white"
            />
          </div>
          <div className="flex items-center gap-2 text-xs text-muted">
            <span>To:</span>
            <input
              type="date"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
              className="px-2.5 py-1.5 bg-card-border/40 border border-card-border rounded-lg text-xs text-white"
            />
          </div>
          <button
            onClick={loadData}
            className="px-3 py-1.5 bg-primary text-black rounded-lg text-xs font-semibold hover:bg-primary-hover transition"
          >
            Apply Dates
          </button>
        </div>

        <div className="flex items-center gap-2 text-xs">
          <span className="text-muted">Compare With:</span>
          <select
            value={comparison}
            onChange={(e) => setComparison(e.target.value)}
            className="px-3 py-1.5 bg-card-border/40 border border-card-border rounded-lg text-xs text-white focus:outline-none focus:border-cyan-400"
          >
            <option value="NONE">No Comparison</option>
            <option value="PREVIOUS_PERIOD">Previous Period (MoM / QoQ)</option>
            <option value="PREVIOUS_YEAR">Same Period Last Year (YoY)</option>
          </select>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm flex items-center gap-2">
          <AlertTriangle className="h-5 w-5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Summary KPI Highlights */}
      {report && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-5 rounded-2xl bg-card-bg border border-card-border">
            <span className="text-xs text-muted">Total Revenue</span>
            <div className="text-2xl font-bold text-white mt-1.5">
              {formatCurrency(report.total_revenue, report.currency)}
            </div>
            <div className="text-[11px] text-muted mt-1">{report.period_label}</div>
          </div>

          <div className="p-5 rounded-2xl bg-card-bg border border-card-border">
            <span className="text-xs text-muted">Gross Profit</span>
            <div className="text-2xl font-bold text-emerald-400 mt-1.5">
              {formatCurrency(report.gross_profit, report.currency)}
            </div>
            <div className="text-[11px] text-emerald-400 mt-1">
              Gross Margin: {report.gross_margin_percentage}%
            </div>
          </div>

          <div className="p-5 rounded-2xl bg-card-bg border border-card-border">
            <span className="text-xs text-muted">Operating Expenses</span>
            <div className="text-2xl font-bold text-rose-400 mt-1.5">
              {formatCurrency(report.total_operating_expenses, report.currency)}
            </div>
            <div className="text-[11px] text-muted mt-1">Overhead & Admin</div>
          </div>

          <div className="p-5 rounded-2xl bg-card-bg border border-card-border">
            <span className="text-xs text-muted">Net Income (Profit)</span>
            <div className={`text-2xl font-bold mt-1.5 ${report.net_profit >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
              {formatCurrency(report.net_profit, report.currency)}
            </div>
            <div className="text-[11px] text-muted mt-1">
              Net Margin: {report.net_margin_percentage}% ({report.net_margin_bps} bps)
            </div>
          </div>
        </div>
      )}

      {/* Detailed P&L Statement Table */}
      {report && (
        <div className="p-6 rounded-2xl bg-card-bg border border-card-border space-y-6">
          <div className="flex items-center justify-between border-b border-card-border pb-4">
            <div>
              <h2 className="text-lg font-bold text-white">Statement of Financial Performance</h2>
              <p className="text-xs text-muted mt-0.5">Basis: Accrual Accounting (Paise Integer Precision)</p>
            </div>
            <span className="px-2.5 py-1 rounded-full bg-cyan-500/10 text-cyan-400 text-xs font-semibold">
              {report.period_label}
            </span>
          </div>

          {/* Revenue Section */}
          <div className="space-y-2">
            <div className="text-xs font-bold text-cyan-400 uppercase tracking-wider">Revenue</div>
            <div className="divide-y divide-card-border/30">
              {report.revenue_breakdown?.map((item: any) => (
                <div key={item.account_code || item.category} className="py-2.5 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-muted">{item.account_code}</span>
                    <span className="text-white font-medium">{item.account_name || item.category}</span>
                  </div>
                  <span className="font-mono text-white font-semibold">{formatCurrency(item.amount, report.currency)}</span>
                </div>
              ))}
            </div>
            <div className="py-2.5 flex items-center justify-between text-xs font-bold border-t border-card-border text-white bg-card-border/20 px-3 rounded-lg">
              <span>Total Operating Revenue</span>
              <span className="font-mono text-emerald-400">{formatCurrency(report.total_revenue, report.currency)}</span>
            </div>
          </div>

          {/* COGS Section */}
          <div className="space-y-2 pt-2">
            <div className="text-xs font-bold text-amber-400 uppercase tracking-wider">Cost of Goods Sold (Direct Shoot & Production Costs)</div>
            <div className="divide-y divide-card-border/30">
              {report.cogs_breakdown?.map((item: any) => (
                <div key={item.account_code || item.category} className="py-2.5 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-muted">{item.account_code}</span>
                    <span className="text-white font-medium">{item.account_name || item.category}</span>
                  </div>
                  <span className="font-mono text-rose-300">{formatCurrency(item.amount, report.currency)}</span>
                </div>
              ))}
            </div>
            <div className="py-2.5 flex items-center justify-between text-xs font-bold border-t border-card-border text-white bg-card-border/20 px-3 rounded-lg">
              <span>Total Cost of Goods Sold</span>
              <span className="font-mono text-rose-400">{formatCurrency(report.total_cogs, report.currency)}</span>
            </div>
          </div>

          {/* Gross Profit Subtotal */}
          <div className="p-3.5 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-between text-sm font-bold text-white">
            <span>GROSS PROFIT (Revenue - COGS)</span>
            <span className="font-mono text-emerald-400">{formatCurrency(report.gross_profit, report.currency)} ({report.gross_margin_percentage}%)</span>
          </div>

          {/* Operating Expenses Section */}
          <div className="space-y-2 pt-2">
            <div className="text-xs font-bold text-rose-400 uppercase tracking-wider">Operating & General Administrative Expenses</div>
            <div className="divide-y divide-card-border/30">
              {report.operating_expenses_breakdown?.map((item: any) => (
                <div key={item.account_code || item.category} className="py-2.5 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-muted">{item.account_code}</span>
                    <span className="text-white font-medium">{item.account_name || item.category}</span>
                  </div>
                  <span className="font-mono text-white">{formatCurrency(item.amount, report.currency)}</span>
                </div>
              ))}
            </div>
            <div className="py-2.5 flex items-center justify-between text-xs font-bold border-t border-card-border text-white bg-card-border/20 px-3 rounded-lg">
              <span>Total Operating Expenses</span>
              <span className="font-mono text-rose-400">{formatCurrency(report.total_operating_expenses, report.currency)}</span>
            </div>
          </div>

          {/* EBITDA Subtotal */}
          <div className="p-3.5 rounded-xl bg-card-border/40 flex items-center justify-between text-xs font-semibold text-white">
            <span>Operating Profit / EBITDA</span>
            <span className="font-mono">{formatCurrency(report.ebitda, report.currency)}</span>
          </div>

          {/* Net Income Final Total */}
          <div className={`p-5 rounded-xl border flex items-center justify-between text-base font-bold ${
            report.net_profit >= 0 ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' : 'bg-rose-500/10 border-rose-500/30 text-rose-400'
          }`}>
            <span>NET INCOME / (NET LOSS)</span>
            <span className="font-mono text-xl">{formatCurrency(report.net_profit, report.currency)}</span>
          </div>
        </div>
      )}
    </div>
  );
}
