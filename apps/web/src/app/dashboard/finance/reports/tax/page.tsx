'use client';

import React, { useState, useEffect } from 'react';
import {
  Scale,
  RefreshCw,
  Download,
  AlertTriangle,
  Calendar,
  ShieldCheck,
  Building2,
  FileCheck2,
} from 'lucide-react';
import { FinanceNavTabs } from '@/components/dashboard/FinanceNavTabs';
import { ReportsNavTabs } from '@/components/dashboard/ReportsNavTabs';
import { fetchApi } from '@/lib/api-client';

export default function TaxSummaryReportPage() {
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
      const res = await fetchApi(`/finance/reports/tax-summary?fromDate=${fromDate}&toDate=${toDate}`);
      if (res && !res.error) {
        setReport(res.data || res);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load Tax Summary');
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
    window.open(`/api/v1/finance/reports/export/csv?type=TAX_SUMMARY&fromDate=${fromDate}&toDate=${toDate}&token=${token}&studioId=${studioId}`, '_blank');
  };

  const handleExportPDF = () => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('pixmatch_token') : '';
    const studioId = typeof window !== 'undefined' ? localStorage.getItem('pixmatch_studio_id') : '';
    window.open(`/api/v1/finance/reports/export/pdf?type=TAX_SUMMARY&fromDate=${fromDate}&toDate=${toDate}&token=${token}&studioId=${studioId}`, '_blank');
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
            <Scale className="h-7 w-7 text-cyan-400" />
            Tax & GST Compliance Summary
          </h1>
          <p className="text-sm text-muted mt-1">
            GSTR-1 (Output GST / Sales), GSTR-3B (Input Tax Credit / Purchases), and Net Tax Obligation reporting.
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

      {/* Summary KPI Cards */}
      {report && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="p-5 rounded-2xl bg-card-bg border border-card-border">
            <span className="text-xs text-muted">Output Tax (Sales Tax Collected)</span>
            <div className="text-2xl font-bold text-white mt-1.5">
              {formatCurrency(report.output_tax_paise, report.currency)}
            </div>
            <div className="text-[11px] text-muted mt-1">From issued client invoices</div>
          </div>

          <div className="p-5 rounded-2xl bg-card-bg border border-card-border">
            <span className="text-xs text-muted">Input Tax Credit (ITC Paid)</span>
            <div className="text-2xl font-bold text-rose-400 mt-1.5">
              {formatCurrency(report.input_tax_paise, report.currency)}
            </div>
            <div className="text-[11px] text-muted mt-1">Claimable on vendor purchases</div>
          </div>

          <div className="p-5 rounded-2xl bg-card-bg border border-card-border">
            <span className="text-xs text-muted">Net Tax Remittance Due</span>
            <div className={`text-2xl font-bold mt-1.5 ${report.net_tax_payable >= 0 ? 'text-cyan-400' : 'text-emerald-400'}`}>
              {formatCurrency(report.net_tax_payable, report.currency)}
            </div>
            <div className="text-[11px] text-muted mt-1">Payable to tax authority</div>
          </div>
        </div>
      )}

      {/* Tax Component Breakdown (CGST / SGST / IGST) */}
      {report && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="p-5 rounded-2xl bg-card-bg border border-card-border space-y-2">
            <span className="text-xs font-bold text-cyan-400 uppercase tracking-wider">CGST (Central GST)</span>
            <div className="flex justify-between text-xs pt-1">
              <span className="text-muted">Output:</span>
              <span className="font-mono text-white">{formatCurrency(report.cgst_output_paise, report.currency)}</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-muted">Input Credit:</span>
              <span className="font-mono text-rose-300">{formatCurrency(report.cgst_input_paise, report.currency)}</span>
            </div>
            <div className="flex justify-between text-xs font-bold border-t border-card-border pt-1.5 text-white">
              <span>Net CGST:</span>
              <span className="font-mono">{formatCurrency(report.cgst_output_paise - report.cgst_input_paise, report.currency)}</span>
            </div>
          </div>

          <div className="p-5 rounded-2xl bg-card-bg border border-card-border space-y-2">
            <span className="text-xs font-bold text-indigo-400 uppercase tracking-wider">SGST (State GST)</span>
            <div className="flex justify-between text-xs pt-1">
              <span className="text-muted">Output:</span>
              <span className="font-mono text-white">{formatCurrency(report.sgst_output_paise, report.currency)}</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-muted">Input Credit:</span>
              <span className="font-mono text-rose-300">{formatCurrency(report.sgst_input_paise, report.currency)}</span>
            </div>
            <div className="flex justify-between text-xs font-bold border-t border-card-border pt-1.5 text-white">
              <span>Net SGST:</span>
              <span className="font-mono">{formatCurrency(report.sgst_output_paise - report.sgst_input_paise, report.currency)}</span>
            </div>
          </div>

          <div className="p-5 rounded-2xl bg-card-bg border border-card-border space-y-2">
            <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider">IGST (Integrated GST)</span>
            <div className="flex justify-between text-xs pt-1">
              <span className="text-muted">Output:</span>
              <span className="font-mono text-white">{formatCurrency(report.igst_output_paise, report.currency)}</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-muted">Input Credit:</span>
              <span className="font-mono text-rose-300">{formatCurrency(report.igst_input_paise, report.currency)}</span>
            </div>
            <div className="flex justify-between text-xs font-bold border-t border-card-border pt-1.5 text-white">
              <span>Net IGST:</span>
              <span className="font-mono">{formatCurrency(report.igst_output_paise - report.igst_input_paise, report.currency)}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
