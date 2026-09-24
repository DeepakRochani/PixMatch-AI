'use client';

import React, { useState, useEffect } from 'react';
import {
  Receipt,
  RefreshCw,
  Download,
  AlertTriangle,
  Calendar,
  PieChart,
  BarChart3,
  TrendingUp,
  Tag,
} from 'lucide-react';
import { FinanceNavTabs } from '@/components/dashboard/FinanceNavTabs';
import { ReportsNavTabs } from '@/components/dashboard/ReportsNavTabs';
import { fetchApi } from '@/lib/api-client';

export default function RevenueAndExpensesReportPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [report, setReport] = useState<any>(null);
  const [fromDate, setFromDate] = useState<string>(() => {
    const d = new Date(new Date().getFullYear(), 0, 1);
    return d.toISOString().split('T')[0];
  });
  const [toDate, setToDate] = useState<string>(() => new Date().toISOString().split('T')[0]);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetchApi(`/finance/reports/revenue-breakdown?fromDate=${fromDate}&toDate=${toDate}`);
      if (res && !res.error) {
        setReport(res.data || res);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load Revenue & Expense breakdown');
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
    window.open(`/api/v1/finance/reports/export/csv?type=REVENUE_BREAKDOWN&fromDate=${fromDate}&toDate=${toDate}&token=${token}&studioId=${studioId}`, '_blank');
  };

  const handleExportPDF = () => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('pixmatch_token') : '';
    const studioId = typeof window !== 'undefined' ? localStorage.getItem('pixmatch_studio_id') : '';
    window.open(`/api/v1/finance/reports/export/pdf?type=REVENUE_BREAKDOWN&fromDate=${fromDate}&toDate=${toDate}&token=${token}&studioId=${studioId}`, '_blank');
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
            <Receipt className="h-7 w-7 text-cyan-400" />
            Revenue & Expense Deep Analytics
          </h1>
          <p className="text-sm text-muted mt-1">
            Multidimensional categorization of revenues by shoot type, package, add-on, client tier, and expense cost center.
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

      {/* Breakdown Grids */}
      {report && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Revenue by Shoot Type */}
          <div className="p-6 rounded-2xl bg-card-bg border border-card-border space-y-4">
            <div className="flex items-center justify-between border-b border-card-border pb-3">
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <Tag className="h-4 w-4 text-cyan-400" />
                Revenue by Shoot Type
              </h2>
              <span className="text-xs font-mono font-bold text-emerald-400">
                {formatCurrency(report.total_revenue, report.currency)}
              </span>
            </div>

            <div className="space-y-3">
              {report.by_shoot_type?.map((item: any) => (
                <div key={item.shoot_type} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-white font-medium capitalize">{item.shoot_type || 'General'}</span>
                    <span className="font-mono text-white">{formatCurrency(item.amount, report.currency)} ({item.percentage}%)</span>
                  </div>
                  <div className="h-2 w-full bg-card-border/40 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-cyan-400 rounded-full transition-all"
                      style={{ width: `${item.percentage || 0}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Expenses by Category */}
          <div className="p-6 rounded-2xl bg-card-bg border border-card-border space-y-4">
            <div className="flex items-center justify-between border-b border-card-border pb-3">
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <BarChart3 className="h-4 w-4 text-rose-400" />
                Expenses by Cost Center
              </h2>
              <span className="text-xs font-mono font-bold text-rose-400">
                {formatCurrency(report.total_expenses, report.currency)}
              </span>
            </div>

            <div className="space-y-3">
              {report.by_expense_category?.map((item: any) => (
                <div key={item.category} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-white font-medium capitalize">{item.category}</span>
                    <span className="font-mono text-white">{formatCurrency(item.amount, report.currency)} ({item.percentage}%)</span>
                  </div>
                  <div className="h-2 w-full bg-card-border/40 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-rose-400 rounded-full transition-all"
                      style={{ width: `${item.percentage || 0}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
