'use client';

import React, { useState, useEffect } from 'react';
import {
  DollarSign,
  RefreshCw,
  Download,
  AlertTriangle,
  Calendar,
  Activity,
  ArrowUpRight,
  ArrowDownLeft,
} from 'lucide-react';
import { FinanceNavTabs } from '@/components/dashboard/FinanceNavTabs';
import { ReportsNavTabs } from '@/components/dashboard/ReportsNavTabs';
import { fetchApi } from '@/lib/api-client';

export default function CashFlowPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [report, setReport] = useState<any>(null);
  const [fromDate, setFromDate] = useState<string>(() => {
    const d = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
    return d.toISOString().split('T')[0];
  });
  const [toDate, setToDate] = useState<string>(() => new Date().toISOString().split('T')[0]);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetchApi(`/finance/reports/cash-flow?fromDate=${fromDate}&toDate=${toDate}`);
      if (res && !res.error) {
        setReport(res.data || res);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load Cash Flow Statement');
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
    window.open(`/api/v1/finance/reports/export/csv?type=CASH_FLOW&fromDate=${fromDate}&toDate=${toDate}&token=${token}&studioId=${studioId}`, '_blank');
  };

  const handleExportPDF = () => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('pixmatch_token') : '';
    const studioId = typeof window !== 'undefined' ? localStorage.getItem('pixmatch_studio_id') : '';
    window.open(`/api/v1/finance/reports/export/pdf?type=CASH_FLOW&fromDate=${fromDate}&toDate=${toDate}&token=${token}&studioId=${studioId}`, '_blank');
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
            <DollarSign className="h-7 w-7 text-cyan-400" />
            Statement of Cash Flows
          </h1>
          <p className="text-sm text-muted mt-1">
            Cash movements categorized by Operating, Investing, and Financing activities with opening and closing cash reconciliation.
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

      {/* Date Filter Bar */}
      <div className="p-4 rounded-xl bg-card-bg border border-card-border flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
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
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm flex items-center gap-2">
          <AlertTriangle className="h-5 w-5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Cash Flow Summary Cards */}
      {report && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="p-5 rounded-2xl bg-card-bg border border-card-border">
            <span className="text-xs text-muted">Beginning Cash Balance</span>
            <div className="text-2xl font-bold text-white mt-1.5">
              {formatCurrency(report.beginning_cash, report.currency)}
            </div>
            <div className="text-[11px] text-muted mt-1">At start of period</div>
          </div>

          <div className="p-5 rounded-2xl bg-card-bg border border-card-border">
            <span className="text-xs text-muted">Net Cash Flow Change</span>
            <div className={`text-2xl font-bold mt-1.5 ${report.net_cash_flow >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
              {formatCurrency(report.net_cash_flow, report.currency)}
            </div>
            <div className="text-[11px] text-muted mt-1">Operating + Investing + Financing</div>
          </div>

          <div className="p-5 rounded-2xl bg-card-bg border border-card-border">
            <span className="text-xs text-muted">Ending Cash Balance</span>
            <div className="text-2xl font-bold text-cyan-400 mt-1.5">
              {formatCurrency(report.ending_cash, report.currency)}
            </div>
            <div className="text-[11px] text-muted mt-1">Reconciled bank & cash total</div>
          </div>
        </div>
      )}

      {/* Detailed Cash Flow Statement */}
      {report && (
        <div className="p-6 rounded-2xl bg-card-bg border border-card-border space-y-6">
          <div className="border-b border-card-border pb-3 flex items-center justify-between">
            <h2 className="text-base font-bold text-white uppercase tracking-wider">Cash Flow Breakdown</h2>
            <span className="text-xs text-muted font-medium">{report.period_label}</span>
          </div>

          {/* Operating Activities */}
          <div className="space-y-2">
            <div className="text-xs font-bold text-emerald-400 uppercase tracking-wider">1. Cash Flows from Operating Activities</div>
            <div className="divide-y divide-card-border/30">
              {report.operating_activities?.map((item: any, idx: number) => (
                <div key={idx} className="py-2.5 flex items-center justify-between text-xs">
                  <span className="text-white">{item.description}</span>
                  <span className={`font-mono font-semibold ${item.amount >= 0 ? 'text-white' : 'text-rose-400'}`}>
                    {formatCurrency(item.amount, report.currency)}
                  </span>
                </div>
              ))}
            </div>
            <div className="py-2.5 flex items-center justify-between text-xs font-bold border-t border-card-border text-white bg-card-border/20 px-3 rounded-lg">
              <span>Net Cash from Operating Activities</span>
              <span className="font-mono text-emerald-400">{formatCurrency(report.net_operating_cash, report.currency)}</span>
            </div>
          </div>

          {/* Investing Activities */}
          <div className="space-y-2 pt-2">
            <div className="text-xs font-bold text-indigo-400 uppercase tracking-wider">2. Cash Flows from Investing Activities</div>
            <div className="divide-y divide-card-border/30">
              {report.investing_activities?.map((item: any, idx: number) => (
                <div key={idx} className="py-2.5 flex items-center justify-between text-xs">
                  <span className="text-white">{item.description}</span>
                  <span className={`font-mono font-semibold ${item.amount >= 0 ? 'text-white' : 'text-rose-400'}`}>
                    {formatCurrency(item.amount, report.currency)}
                  </span>
                </div>
              ))}
            </div>
            <div className="py-2.5 flex items-center justify-between text-xs font-bold border-t border-card-border text-white bg-card-border/20 px-3 rounded-lg">
              <span>Net Cash from Investing Activities</span>
              <span className="font-mono">{formatCurrency(report.net_investing_cash, report.currency)}</span>
            </div>
          </div>

          {/* Financing Activities */}
          <div className="space-y-2 pt-2">
            <div className="text-xs font-bold text-cyan-400 uppercase tracking-wider">3. Cash Flows from Financing Activities</div>
            <div className="divide-y divide-card-border/30">
              {report.financing_activities?.map((item: any, idx: number) => (
                <div key={idx} className="py-2.5 flex items-center justify-between text-xs">
                  <span className="text-white">{item.description}</span>
                  <span className={`font-mono font-semibold ${item.amount >= 0 ? 'text-white' : 'text-rose-400'}`}>
                    {formatCurrency(item.amount, report.currency)}
                  </span>
                </div>
              ))}
            </div>
            <div className="py-2.5 flex items-center justify-between text-xs font-bold border-t border-card-border text-white bg-card-border/20 px-3 rounded-lg">
              <span>Net Cash from Financing Activities</span>
              <span className="font-mono">{formatCurrency(report.net_financing_cash, report.currency)}</span>
            </div>
          </div>

          {/* Reconciliation Proof Box */}
          <div className="p-4 rounded-xl bg-cyan-500/10 border border-cyan-500/20 space-y-2 text-xs">
            <div className="flex items-center justify-between font-bold text-white">
              <span>NET INCREASE / (DECREASE) IN CASH</span>
              <span className="font-mono text-sm">{formatCurrency(report.net_cash_flow, report.currency)}</span>
            </div>
            <div className="flex items-center justify-between text-muted">
              <span>Cash at Beginning of Period</span>
              <span className="font-mono">{formatCurrency(report.beginning_cash, report.currency)}</span>
            </div>
            <div className="flex items-center justify-between font-bold text-cyan-400 border-t border-cyan-500/20 pt-1.5 text-sm">
              <span>CASH AT END OF PERIOD</span>
              <span className="font-mono">{formatCurrency(report.ending_cash, report.currency)}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
