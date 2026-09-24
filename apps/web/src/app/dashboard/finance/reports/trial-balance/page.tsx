'use client';

import React, { useState, useEffect } from 'react';
import {
  BookOpen,
  RefreshCw,
  Download,
  AlertTriangle,
  Calendar,
  ShieldCheck,
  Search,
} from 'lucide-react';
import { FinanceNavTabs } from '@/components/dashboard/FinanceNavTabs';
import { ReportsNavTabs } from '@/components/dashboard/ReportsNavTabs';
import { fetchApi } from '@/lib/api-client';

export default function TrialBalancePage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [report, setReport] = useState<any>(null);
  const [asOfDate, setAsOfDate] = useState<string>(() => new Date().toISOString().split('T')[0]);
  const [searchTerm, setSearchTerm] = useState('');

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetchApi(`/finance/reports/trial-balance?asOfDate=${asOfDate}`);
      if (res && !res.error) {
        setReport(res.data || res);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load Trial Balance');
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
    window.open(`/api/v1/finance/reports/export/csv?type=TRIAL_BALANCE&asOfDate=${asOfDate}&token=${token}&studioId=${studioId}`, '_blank');
  };

  const handleExportPDF = () => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('pixmatch_token') : '';
    const studioId = typeof window !== 'undefined' ? localStorage.getItem('pixmatch_studio_id') : '';
    window.open(`/api/v1/finance/reports/export/pdf?type=TRIAL_BALANCE&asOfDate=${asOfDate}&token=${token}&studioId=${studioId}`, '_blank');
  };

  const formatCurrency = (paise?: number, currency = 'INR') => {
    const val = (paise || 0) / 100;
    const sym = currency === 'INR' ? '₹' : '$';
    return `${sym}${val.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const filteredLines = report?.accounts?.filter((line: any) =>
    line.account_code?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    line.account_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    line.account_type?.toLowerCase().includes(searchTerm.toLowerCase())
  ) || [];

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2.5">
            <BookOpen className="h-7 w-7 text-emerald-400" />
            Trial Balance
          </h1>
          <p className="text-sm text-muted mt-1">
            Authoritative debit and credit balances for all Chart of Accounts items, verifying ledger balance ($\sum Debits = \sum Credits$).
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
            Update Trial Balance
          </button>
        </div>

        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="h-3.5 w-3.5 text-muted absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search account..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-8 pr-3 py-1.5 bg-card-border/40 border border-card-border rounded-lg text-xs text-white placeholder-muted focus:outline-none focus:border-emerald-400"
            />
          </div>

          {report && (
            <div>
              {report.is_balanced ? (
                <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-semibold">
                  <ShieldCheck className="h-4 w-4" /> Balanced: Debits = Credits
                </span>
              ) : (
                <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs font-semibold">
                  <AlertTriangle className="h-4 w-4" /> Out of Balance Variance: {formatCurrency(report.variance, report.currency)}
                </span>
              )}
            </div>
          )}
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm flex items-center gap-2">
          <AlertTriangle className="h-5 w-5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Trial Balance Table */}
      {report && (
        <div className="p-6 rounded-2xl bg-card-bg border border-card-border space-y-4">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-card-border text-muted uppercase text-[10px] tracking-wider">
                  <th className="py-3 px-4">Code</th>
                  <th className="py-3 px-4">Account Name</th>
                  <th className="py-3 px-4">Type</th>
                  <th className="py-3 px-4 text-right">Debit Balance</th>
                  <th className="py-3 px-4 text-right">Credit Balance</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-card-border/30">
                {filteredLines.map((acc: any) => (
                  <tr key={acc.account_id || acc.account_code} className="hover:bg-card-border/20 transition">
                    <td className="py-2.5 px-4 font-mono text-cyan-400 font-semibold">{acc.account_code}</td>
                    <td className="py-2.5 px-4 text-white font-medium">{acc.account_name}</td>
                    <td className="py-2.5 px-4 text-muted uppercase text-[10px]">{acc.account_type}</td>
                    <td className="py-2.5 px-4 font-mono text-right text-white">
                      {acc.debit_balance > 0 ? formatCurrency(acc.debit_balance, report.currency) : '—'}
                    </td>
                    <td className="py-2.5 px-4 font-mono text-right text-white">
                      {acc.credit_balance > 0 ? formatCurrency(acc.credit_balance, report.currency) : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-card-border font-bold text-sm bg-card-border/20 text-white">
                  <td colSpan={3} className="py-3.5 px-4">TOTALS ({report.period_label})</td>
                  <td className="py-3.5 px-4 font-mono text-right text-emerald-400">
                    {formatCurrency(report.total_debits, report.currency)}
                  </td>
                  <td className="py-3.5 px-4 font-mono text-right text-emerald-400">
                    {formatCurrency(report.total_credits, report.currency)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
