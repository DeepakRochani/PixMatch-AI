'use client';

import React, { useState, useEffect } from 'react';
import { FinanceNavTabs } from '@/components/dashboard/FinanceNavTabs';
import { TaxNavTabs } from '@/components/dashboard/TaxNavTabs';
import { FileSpreadsheet, Download, RefreshCw, Table, FileText } from 'lucide-react';

export default function TaxReportsPage() {
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState<any>(null);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const loadData = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (startDate) params.append('start_date', startDate);
      if (endDate) params.append('end_date', endDate);

      const res = await fetch(`/api/finance/tax/summary?${params.toString()}`);
      if (res.ok) {
        setSummary(await res.json());
      }
    } catch (err) {
      console.error('Failed to load tax summary:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const formatCurrency = (minor: number) => {
    const major = (minor || 0) / 100;
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 2,
    }).format(major);
  };

  return (
    <div className="min-h-screen bg-background text-foreground p-6 space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
            <FileSpreadsheet className="h-6 w-6 text-primary" />
            GST Returns & Operational Reports
          </h1>
          <p className="text-xs text-muted mt-1">
            Generate and export GSTR-1, GSTR-3B, and GSTR-2B operational statements with formula-injection-safe CSV downloads
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={loadData}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-card-border bg-card hover:bg-card-border/50 text-xs text-muted hover:text-white transition-all"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Refresh
          </button>
        </div>
      </div>

      <FinanceNavTabs />
      <TaxNavTabs />

      {/* Date Filter Bar */}
      <div className="p-4 rounded-xl border border-card-border bg-card/60 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <label className="text-xs text-muted">From:</label>
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="px-3 py-1.5 rounded-lg bg-background border border-card-border text-xs text-white"
          />
          <label className="text-xs text-muted">To:</label>
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="px-3 py-1.5 rounded-lg bg-background border border-card-border text-xs text-white"
          />
          <button
            onClick={loadData}
            className="px-3 py-1.5 rounded-lg bg-primary hover:bg-primary-hover text-white text-xs font-semibold"
          >
            Filter
          </button>
        </div>
      </div>

      {/* Report Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* GSTR-1 Outward Supplies */}
        <div className="p-5 rounded-xl border border-card-border bg-card/60 space-y-4 flex flex-col justify-between">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                <Table className="h-4 w-4 text-amber-400" />
                GSTR-1 Outward Supplies
              </h3>
              <span className="px-2 py-0.5 rounded text-[10px] bg-amber-500/10 text-amber-300 font-mono">B2B & B2C</span>
            </div>
            <p className="text-xs text-muted">
              Monthly / quarterly statement of outward supplies and client invoices with HSN/SAC summary.
            </p>
            <div className="p-3 rounded-lg bg-background/60 border border-card-border/60 text-xs space-y-1">
              <div className="flex justify-between text-muted">
                <span>Output Taxable:</span>
                <span className="font-mono text-white font-medium">{formatCurrency(summary?.output_tax?.taxable_amount_minor || 0)}</span>
              </div>
              <div className="flex justify-between text-muted">
                <span>Output Tax:</span>
                <span className="font-mono text-primary font-semibold">{formatCurrency(summary?.output_tax?.total_output_tax_minor || 0)}</span>
              </div>
            </div>
          </div>
          <a
            href={`/api/finance/tax/export?report_type=GSTR1&start_date=${startDate}&end_date=${endDate}`}
            download
            className="w-full flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-card-border/60 hover:bg-card-border text-white text-xs font-semibold transition-all"
          >
            <Download className="h-3.5 w-3.5" />
            Download GSTR-1 CSV
          </a>
        </div>

        {/* GSTR-3B Summary Return */}
        <div className="p-5 rounded-xl border border-card-border bg-card/60 space-y-4 flex flex-col justify-between">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                <FileText className="h-4 w-4 text-primary" />
                GSTR-3B Summary Return
              </h3>
              <span className="px-2 py-0.5 rounded text-[10px] bg-primary/10 text-primary font-mono">Net Liability</span>
            </div>
            <p className="text-xs text-muted">
              Monthly summary return for payment of tax liability after setting off eligible Input Tax Credit (ITC).
            </p>
            <div className="p-3 rounded-lg bg-background/60 border border-card-border/60 text-xs space-y-1">
              <div className="flex justify-between text-muted">
                <span>Eligible ITC:</span>
                <span className="font-mono text-emerald-400 font-medium">{formatCurrency(summary?.input_tax?.eligible_itc_minor || 0)}</span>
              </div>
              <div className="flex justify-between text-muted">
                <span>Net Payable:</span>
                <span className="font-mono text-white font-bold">{formatCurrency(summary?.net_tax_payable_minor || 0)}</span>
              </div>
            </div>
          </div>
          <a
            href={`/api/finance/tax/export?report_type=GSTR3B&start_date=${startDate}&end_date=${endDate}`}
            download
            className="w-full flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-primary hover:bg-primary-hover text-white text-xs font-semibold shadow transition-all"
          >
            <Download className="h-3.5 w-3.5" />
            Download GSTR-3B CSV
          </a>
        </div>

        {/* GSTR-2B Input Tax Credit */}
        <div className="p-5 rounded-xl border border-card-border bg-card/60 space-y-4 flex flex-col justify-between">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                <Table className="h-4 w-4 text-emerald-400" />
                GSTR-2B Purchase & ITC
              </h3>
              <span className="px-2 py-0.5 rounded text-[10px] bg-emerald-500/10 text-emerald-300 font-mono">ITC Register</span>
            </div>
            <p className="text-xs text-muted">
              Auto-drafted purchase register and eligible vs ineligible ITC statements for vendor reconciliation.
            </p>
            <div className="p-3 rounded-lg bg-background/60 border border-card-border/60 text-xs space-y-1">
              <div className="flex justify-between text-muted">
                <span>Total ITC Claimed:</span>
                <span className="font-mono text-white font-medium">{formatCurrency(summary?.input_tax?.total_input_tax_minor || 0)}</span>
              </div>
              <div className="flex justify-between text-muted">
                <span>Ineligible / Blocked:</span>
                <span className="font-mono text-rose-400 font-medium">{formatCurrency(summary?.input_tax?.ineligible_itc_minor || 0)}</span>
              </div>
            </div>
          </div>
          <a
            href={`/api/finance/tax/export?report_type=GSTR2B&start_date=${startDate}&end_date=${endDate}`}
            download
            className="w-full flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-card-border/60 hover:bg-card-border text-white text-xs font-semibold transition-all"
          >
            <Download className="h-3.5 w-3.5" />
            Download GSTR-2B CSV
          </a>
        </div>
      </div>
    </div>
  );
}
