'use client';

import React, { useState, useEffect } from 'react';
import {
  Layers,
  RefreshCw,
  Download,
  AlertTriangle,
  Calendar,
  Search,
  Filter,
} from 'lucide-react';
import { FinanceNavTabs } from '@/components/dashboard/FinanceNavTabs';
import { ReportsNavTabs } from '@/components/dashboard/ReportsNavTabs';
import { fetchApi } from '@/lib/api-client';

export default function GeneralLedgerReportPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [report, setReport] = useState<any>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [fromDate, setFromDate] = useState<string>(() => {
    const d = new Date(new Date().getFullYear(), 0, 1);
    return d.toISOString().split('T')[0];
  });
  const [toDate, setToDate] = useState<string>(() => new Date().toISOString().split('T')[0]);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetchApi(`/finance/reports/general-ledger?fromDate=${fromDate}&toDate=${toDate}`);
      if (res && !res.error) {
        setReport(res.data || res);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load General Ledger report');
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
    window.open(`/api/v1/finance/reports/export/csv?type=GENERAL_LEDGER&fromDate=${fromDate}&toDate=${toDate}&token=${token}&studioId=${studioId}`, '_blank');
  };

  const handleExportPDF = () => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('pixmatch_token') : '';
    const studioId = typeof window !== 'undefined' ? localStorage.getItem('pixmatch_studio_id') : '';
    window.open(`/api/v1/finance/reports/export/pdf?type=GENERAL_LEDGER&fromDate=${fromDate}&toDate=${toDate}&token=${token}&studioId=${studioId}`, '_blank');
  };

  const formatCurrency = (paise?: number, currency = 'INR') => {
    const val = (paise || 0) / 100;
    const sym = currency === 'INR' ? '₹' : '$';
    return `${sym}${val.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const filteredAccounts = report?.accounts?.filter((acc: any) =>
    acc.account_code?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    acc.account_name?.toLowerCase().includes(searchTerm.toLowerCase())
  ) || [];

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2.5">
            <Layers className="h-7 w-7 text-cyan-400" />
            General Ledger Detail Report
          </h1>
          <p className="text-sm text-muted mt-1">
            Complete debit/credit transaction journal history, running balances, and audit trails per Chart of Accounts.
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

      {/* Date & Filter Bar */}
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

        <div className="relative">
          <Search className="h-3.5 w-3.5 text-muted absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search account code or name..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-8 pr-3 py-1.5 bg-card-border/40 border border-card-border rounded-lg text-xs text-white placeholder-muted focus:outline-none focus:border-cyan-400"
          />
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm flex items-center gap-2">
          <AlertTriangle className="h-5 w-5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Account Ledgers List */}
      {report && (
        <div className="space-y-6">
          {filteredAccounts.map((acc: any) => (
            <div key={acc.account_id || acc.account_code} className="p-6 rounded-2xl bg-card-bg border border-card-border space-y-4">
              <div className="flex items-center justify-between border-b border-card-border pb-3">
                <div className="flex items-center gap-3">
                  <span className="px-2.5 py-1 rounded-md bg-cyan-500/10 text-cyan-400 font-mono text-xs font-bold">
                    {acc.account_code}
                  </span>
                  <div>
                    <h3 className="text-sm font-bold text-white">{acc.account_name}</h3>
                    <span className="text-[10px] text-muted uppercase">{acc.account_type}</span>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-xs text-muted">Ending Balance:</span>
                  <div className="text-sm font-mono font-bold text-white">{formatCurrency(acc.ending_balance, report.currency)}</div>
                </div>
              </div>

              {/* Transactions Table */}
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-card-border/40 text-muted uppercase text-[10px]">
                      <th className="py-2 px-3">Date</th>
                      <th className="py-2 px-3">Journal Entry #</th>
                      <th className="py-2 px-3">Description</th>
                      <th className="py-2 px-3 text-right">Debit</th>
                      <th className="py-2 px-3 text-right">Credit</th>
                      <th className="py-2 px-3 text-right">Running Balance</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-card-border/20">
                    <tr className="text-muted italic bg-card-border/10">
                      <td colSpan={5} className="py-1.5 px-3">Opening Balance</td>
                      <td className="py-1.5 px-3 font-mono text-right font-medium text-white">
                        {formatCurrency(acc.opening_balance, report.currency)}
                      </td>
                    </tr>
                    {acc.lines?.map((line: any) => (
                      <tr key={line.line_id || line.id} className="hover:bg-card-border/20 transition">
                        <td className="py-2 px-3 font-mono text-muted">{new Date(line.entry_date).toLocaleDateString()}</td>
                        <td className="py-2 px-3 font-mono text-cyan-400">{line.entry_number || line.journal_entry_id}</td>
                        <td className="py-2 px-3 text-white">{line.description || '—'}</td>
                        <td className="py-2 px-3 font-mono text-right text-white">
                          {line.debit_paise > 0 ? formatCurrency(line.debit_paise, report.currency) : '—'}
                        </td>
                        <td className="py-2 px-3 font-mono text-right text-white">
                          {line.credit_paise > 0 ? formatCurrency(line.credit_paise, report.currency) : '—'}
                        </td>
                        <td className="py-2 px-3 font-mono text-right font-semibold text-cyan-300">
                          {formatCurrency(line.running_balance, report.currency)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
