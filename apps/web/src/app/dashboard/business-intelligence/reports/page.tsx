'use client';

import React, { useState, useEffect } from 'react';
import {
  FileText,
  Download,
  Calendar,
  DollarSign,
  TrendingUp,
  Activity,
  AlertTriangle,
  RefreshCw,
  Sparkles,
  ShieldCheck,
} from 'lucide-react';
import { BiNavTabs } from '@/components/dashboard/BiNavTabs';
import { fetchApi } from '@/lib/api-client';
import { IBiManagementReportDTO } from '@pixmatch/types';

export default function BusinessIntelligenceReportsPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [report, setReport] = useState<IBiManagementReportDTO | null>(null);
  const [exporting, setExporting] = useState<string | null>(null);

  const loadReport = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetchApi('/business-intelligence/reports');
      if (res && !res.error) {
        setReport(res.data || (res as any));
      }
    } catch (err: any) {
      setError(err.message || 'Failed to generate management report');
    } finally {
      setLoading(false);
    }
  };

  const handleExportCsv = async () => {
    setExporting('csv');
    try {
      const res = await fetch('/api/business-intelligence/reports/export/csv');
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Studio_BI_Report_${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
    } catch (err) {
      console.error('Failed to download CSV', err);
    } finally {
      setExporting(null);
    }
  };

  const handleExportPdf = async () => {
    setExporting('pdf');
    try {
      const res = await fetch('/api/business-intelligence/reports/export/pdf');
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Studio_BI_Report_${new Date().toISOString().slice(0, 10)}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
    } catch (err) {
      console.error('Failed to download PDF', err);
    } finally {
      setExporting(null);
    }
  };

  useEffect(() => {
    loadReport();
  }, []);

  const currency = report?.currency || 'INR';

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
              <FileText className="w-6 h-6 text-indigo-500" />
              Management Business Intelligence Report
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              Executive business summary, performance KPIs, forecast models, and decision insights.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handleExportCsv}
              disabled={exporting === 'csv' || loading}
              className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-lg bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-750 transition-colors shadow-sm"
            >
              <Download className="w-4 h-4 text-emerald-600" />
              {exporting === 'csv' ? 'Exporting...' : 'Export CSV'}
            </button>
            <button
              onClick={handleExportPdf}
              disabled={exporting === 'pdf' || loading}
              className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-lg bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-750 transition-colors shadow-sm"
            >
              <Download className="w-4 h-4 text-indigo-600" />
              {exporting === 'pdf' ? 'Exporting...' : 'Export PDF'}
            </button>
            <button
              onClick={loadReport}
              disabled={loading}
              className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm transition-colors"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              Re-generate
            </button>
          </div>
        </div>

        {/* Navigation Tabs */}
        <BiNavTabs activeTab="reports" />

        {error && (
          <div className="p-4 rounded-lg bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 text-red-800 dark:text-red-300 flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 flex-shrink-0" />
            <span className="text-sm">{error}</span>
          </div>
        )}

        {report && (
          <div className="space-y-6">
            {/* Executive Summary Section */}
            <div className="bg-white dark:bg-gray-800 p-6 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm space-y-3">
              <h2 className="text-lg font-bold flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-indigo-500" />
                Executive Summary
              </h2>
              <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed bg-gray-50 dark:bg-gray-750/50 p-4 rounded-lg border border-gray-100 dark:border-gray-700">
                {report.executive_summary}
              </p>
            </div>

            {/* Core Financial Indicators */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="bg-white dark:bg-gray-800 p-5 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
                <span className="text-xs font-medium text-gray-400 uppercase">Gross Revenue</span>
                <p className="text-2xl font-bold mt-1">
                  {(report.revenue.gross_revenue_minor / 100).toLocaleString()} {currency}
                </p>
                <span className="text-xs text-emerald-600">
                  Collected: {(report.revenue.collected_revenue_minor / 100).toLocaleString()} {currency}
                </span>
              </div>
              <div className="bg-white dark:bg-gray-800 p-5 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
                <span className="text-xs font-medium text-gray-400 uppercase">Operating Net Profit</span>
                <p className="text-2xl font-bold mt-1 text-indigo-600 dark:text-indigo-400">
                  {(report.profitability.net_profit_minor / 100).toLocaleString()} {currency}
                </p>
                <span className="text-xs text-gray-500">
                  Margin: {(report.profitability.net_margin_bps / 100).toFixed(1)}%
                </span>
              </div>
              <div className="bg-white dark:bg-gray-800 p-5 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
                <span className="text-xs font-medium text-gray-400 uppercase">Liquid Cash Position</span>
                <p className="text-2xl font-bold mt-1 text-blue-600 dark:text-blue-400">
                  {(report.cash.cash_balance_minor / 100).toLocaleString()} {currency}
                </p>
                <span className="text-xs text-gray-500">
                  Active Projects: {report.projects.active_count}
                </span>
              </div>
            </div>

            {/* Complete KPI Table */}
            <div className="bg-white dark:bg-gray-800 p-6 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm space-y-4">
              <h2 className="text-lg font-bold">Comprehensive Performance Indicators</h2>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-gray-50 dark:bg-gray-750 text-gray-500 dark:text-gray-400 uppercase font-semibold">
                    <tr>
                      <th className="py-2.5 px-3">Metric Name</th>
                      <th className="py-2.5 px-3">Value</th>
                      <th className="py-2.5 px-3">Change %</th>
                      <th className="py-2.5 px-3">Trend</th>
                      <th className="py-2.5 px-3">Formula</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                    {report.kpis.map((kpi) => (
                      <tr key={kpi.id} className="hover:bg-gray-50/50 dark:hover:bg-gray-750/30">
                        <td className="py-2.5 px-3 font-semibold">{kpi.name}</td>
                        <td className="py-2.5 px-3 font-bold">{kpi.formatted_value}</td>
                        <td className="py-2.5 px-3">
                          {kpi.change_pct !== null ? (
                            <span className={kpi.change_pct >= 0 ? 'text-emerald-600 font-semibold' : 'text-red-600 font-semibold'}>
                              {kpi.change_pct >= 0 ? `+${kpi.change_pct}%` : `${kpi.change_pct}%`}
                            </span>
                          ) : (
                            <span className="text-gray-400">N/A</span>
                          )}
                        </td>
                        <td className="py-2.5 px-3">
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-gray-100 dark:bg-gray-700">
                            {kpi.trend}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-gray-500 dark:text-gray-400 font-mono text-[11px]">
                          {kpi.formula}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
