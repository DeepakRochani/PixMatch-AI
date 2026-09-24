'use client';

import React, { useState, useEffect } from 'react';
import {
  ArrowDownLeft,
  RefreshCw,
  Download,
  AlertTriangle,
  Calendar,
  Search,
  User,
  Clock,
} from 'lucide-react';
import { FinanceNavTabs } from '@/components/dashboard/FinanceNavTabs';
import { ReportsNavTabs } from '@/components/dashboard/ReportsNavTabs';
import { fetchApi } from '@/lib/api-client';

export default function ARAgingReportPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [report, setReport] = useState<any>(null);
  const [asOfDate, setAsOfDate] = useState<string>(() => new Date().toISOString().split('T')[0]);
  const [searchTerm, setSearchTerm] = useState('');

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetchApi(`/finance/reports/ar-aging?asOfDate=${asOfDate}`);
      if (res && !res.error) {
        setReport(res.data || res);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load AR Aging report');
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
    window.open(`/api/v1/finance/reports/export/csv?type=AR_AGING&asOfDate=${asOfDate}&token=${token}&studioId=${studioId}`, '_blank');
  };

  const handleExportPDF = () => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('pixmatch_token') : '';
    const studioId = typeof window !== 'undefined' ? localStorage.getItem('pixmatch_studio_id') : '';
    window.open(`/api/v1/finance/reports/export/pdf?type=AR_AGING&asOfDate=${asOfDate}&token=${token}&studioId=${studioId}`, '_blank');
  };

  const formatCurrency = (paise?: number, currency = 'INR') => {
    const val = (paise || 0) / 100;
    const sym = currency === 'INR' ? '₹' : '$';
    return `${sym}${val.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const filteredClients = report?.clients?.filter((c: any) =>
    c.client_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.client_email?.toLowerCase().includes(searchTerm.toLowerCase())
  ) || [];

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2.5">
            <ArrowDownLeft className="h-7 w-7 text-emerald-400" />
            Accounts Receivable (AR) Aging Report
          </h1>
          <p className="text-sm text-muted mt-1">
            Client receivable aging across 0-30, 31-60, 61-90, and 90+ day buckets with invoice collection status.
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={handleExportPDF}
            className="flex items-center gap-1.5 px-3 py-2 bg-card-border/60 hover:bg-card-border text-white rounded-lg text-xs font-semibold transition"
          >
            <Download className="h-3.5 w-3.5 text-emerald-400" />
            PDF
          </button>
          <button
            onClick={handleExportCSV}
            className="flex items-center gap-1.5 px-3 py-2 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/30 rounded-lg text-xs font-semibold transition"
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

      {/* Date & Filter Bar */}
      <div className="p-4 rounded-xl bg-card-bg border border-card-border flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 text-xs text-muted">
            <Calendar className="h-4 w-4 text-emerald-400" />
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
            Apply Date
          </button>
        </div>

        <div className="relative">
          <Search className="h-3.5 w-3.5 text-muted absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search client name or email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-8 pr-3 py-1.5 bg-card-border/40 border border-card-border rounded-lg text-xs text-white placeholder-muted focus:outline-none focus:border-emerald-400"
          />
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm flex items-center gap-2">
          <AlertTriangle className="h-5 w-5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Aging Bucket Summary Cards */}
      {report && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <div className="p-4 rounded-xl bg-card-bg border border-card-border">
            <span className="text-[11px] text-muted">Total Outstanding</span>
            <div className="text-lg font-bold text-white mt-1">
              {formatCurrency(report.total_outstanding, report.currency)}
            </div>
          </div>
          <div className="p-4 rounded-xl bg-card-bg border border-card-border">
            <span className="text-[11px] text-emerald-400">Current (Not Due)</span>
            <div className="text-lg font-bold text-emerald-400 mt-1">
              {formatCurrency(report.total_current, report.currency)}
            </div>
          </div>
          <div className="p-4 rounded-xl bg-card-bg border border-card-border">
            <span className="text-[11px] text-cyan-400">1 - 30 Days</span>
            <div className="text-lg font-bold text-cyan-400 mt-1">
              {formatCurrency(report.total_1_to_30, report.currency)}
            </div>
          </div>
          <div className="p-4 rounded-xl bg-card-bg border border-card-border">
            <span className="text-[11px] text-amber-400">31 - 60 Days</span>
            <div className="text-lg font-bold text-amber-400 mt-1">
              {formatCurrency(report.total_31_to_60, report.currency)}
            </div>
          </div>
          <div className="p-4 rounded-xl bg-card-bg border border-card-border">
            <span className="text-[11px] text-orange-400">61 - 90 Days</span>
            <div className="text-lg font-bold text-orange-400 mt-1">
              {formatCurrency(report.total_61_to_90, report.currency)}
            </div>
          </div>
          <div className="p-4 rounded-xl bg-card-bg border border-card-border">
            <span className="text-[11px] text-rose-400">90+ Days (Overdue)</span>
            <div className="text-lg font-bold text-rose-400 mt-1">
              {formatCurrency(report.total_over_90, report.currency)}
            </div>
          </div>
        </div>
      )}

      {/* AR Aging Table */}
      {report && (
        <div className="p-6 rounded-2xl bg-card-bg border border-card-border space-y-4">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-card-border text-muted uppercase text-[10px]">
                  <th className="py-3 px-3">Client</th>
                  <th className="py-3 px-3 text-right">Current</th>
                  <th className="py-3 px-3 text-right">1-30 Days</th>
                  <th className="py-3 px-3 text-right">31-60 Days</th>
                  <th className="py-3 px-3 text-right">61-90 Days</th>
                  <th className="py-3 px-3 text-right">90+ Days</th>
                  <th className="py-3 px-3 text-right">Total Balance</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-card-border/30">
                {filteredClients.map((client: any) => (
                  <tr key={client.client_id} className="hover:bg-card-border/20 transition">
                    <td className="py-3 px-3">
                      <div className="font-semibold text-white">{client.client_name}</div>
                      <div className="text-[10px] text-muted">{client.client_email}</div>
                    </td>
                    <td className="py-3 px-3 font-mono text-right text-white">
                      {client.current > 0 ? formatCurrency(client.current, report.currency) : '—'}
                    </td>
                    <td className="py-3 px-3 font-mono text-right text-cyan-300">
                      {client.days_1_to_30 > 0 ? formatCurrency(client.days_1_to_30, report.currency) : '—'}
                    </td>
                    <td className="py-3 px-3 font-mono text-right text-amber-300">
                      {client.days_31_to_60 > 0 ? formatCurrency(client.days_31_to_60, report.currency) : '—'}
                    </td>
                    <td className="py-3 px-3 font-mono text-right text-orange-300">
                      {client.days_61_to_90 > 0 ? formatCurrency(client.days_61_to_90, report.currency) : '—'}
                    </td>
                    <td className="py-3 px-3 font-mono text-right text-rose-400 font-semibold">
                      {client.days_over_90 > 0 ? formatCurrency(client.days_over_90, report.currency) : '—'}
                    </td>
                    <td className="py-3 px-3 font-mono text-right font-bold text-white">
                      {formatCurrency(client.total_outstanding, report.currency)}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-card-border font-bold text-xs bg-card-border/20 text-white">
                  <td className="py-3.5 px-3">TOTAL RECEIVABLES</td>
                  <td className="py-3.5 px-3 font-mono text-right text-emerald-400">{formatCurrency(report.total_current, report.currency)}</td>
                  <td className="py-3.5 px-3 font-mono text-right text-cyan-400">{formatCurrency(report.total_1_to_30, report.currency)}</td>
                  <td className="py-3.5 px-3 font-mono text-right text-amber-400">{formatCurrency(report.total_31_to_60, report.currency)}</td>
                  <td className="py-3.5 px-3 font-mono text-right text-orange-400">{formatCurrency(report.total_61_to_90, report.currency)}</td>
                  <td className="py-3.5 px-3 font-mono text-right text-rose-400">{formatCurrency(report.total_over_90, report.currency)}</td>
                  <td className="py-3.5 px-3 font-mono text-right font-bold text-white">{formatCurrency(report.total_outstanding, report.currency)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
