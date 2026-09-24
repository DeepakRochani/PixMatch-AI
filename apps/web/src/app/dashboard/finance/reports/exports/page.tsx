'use client';

import React, { useState, useEffect } from 'react';
import {
  Download,
  RefreshCw,
  FileSpreadsheet,
  FileText,
  Calendar,
  Layers,
  ShieldCheck,
  AlertTriangle,
  Clock,
  Plus,
  Send,
} from 'lucide-react';
import { FinanceNavTabs } from '@/components/dashboard/FinanceNavTabs';
import { ReportsNavTabs } from '@/components/dashboard/ReportsNavTabs';
import { fetchApi } from '@/lib/api-client';

export default function ExportsAndSchedulesPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [schedules, setSchedules] = useState<any[]>([]);
  const [exportsList, setExportsList] = useState<any[]>([]);
  const [creatingSchedule, setCreatingSchedule] = useState(false);
  const [reportType, setReportType] = useState('PROFIT_LOSS');
  const [frequency, setFrequency] = useState('MONTHLY');
  const [recipients, setRecipients] = useState('');

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [schedRes, expRes] = await Promise.all([
        fetchApi('/finance/reports/schedules'),
        fetchApi('/finance/reports/exports'),
      ]);

      if (schedRes && !schedRes.error) setSchedules(schedRes.data?.schedules || (schedRes as any).schedules || []);
      if (expRes && !expRes.error) setExportsList(expRes.data?.exports || (expRes as any).exports || []);
    } catch (err: any) {
      setError(err.message || 'Failed to load exports and schedules');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleCreateSchedule = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await fetchApi('/finance/reports/schedules', {
        method: 'POST',
        body: JSON.stringify({
          report_type: reportType,
          frequency,
          recipients: recipients.split(',').map((r) => r.trim()).filter(Boolean),
          format: 'PDF',
          include_csv: true,
        }),
      });
      setCreatingSchedule(false);
      setRecipients('');
      loadData();
    } catch (err: any) {
      alert(err.message || 'Failed to create schedule');
    }
  };

  const handleDownloadHandoff = () => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('pixmatch_token') : '';
    const studioId = typeof window !== 'undefined' ? localStorage.getItem('pixmatch_studio_id') : '';
    window.open(`/api/v1/finance/reports/export/accountant-handoff?token=${token}&studioId=${studioId}`, '_blank');
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2.5">
            <Download className="h-7 w-7 text-cyan-400" />
            Audit Exports, Accountant Packages & Automated Schedules
          </h1>
          <p className="text-sm text-muted mt-1">
            Formula-injection safe CSV exports, full accountant handoff packages, and recurring report delivery automation.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleDownloadHandoff}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-primary hover:bg-primary-hover text-black rounded-lg text-xs font-semibold transition"
          >
            <Download className="h-3.5 w-3.5" />
            Download Accountant Package
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

      {error && (
        <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm flex items-center gap-2">
          <AlertTriangle className="h-5 w-5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Quick Export Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="p-5 rounded-2xl bg-card-bg border border-card-border space-y-3 flex flex-col justify-between">
          <div>
            <div className="w-9 h-9 rounded-xl bg-cyan-500/10 text-cyan-400 flex items-center justify-center mb-3">
              <FileSpreadsheet className="h-4 w-4" />
            </div>
            <h3 className="text-sm font-bold text-white">Trial Balance (CSV / PDF)</h3>
            <p className="text-xs text-muted mt-1">
              Complete general ledger account debit and credit summary with formula-injection neutralization.
            </p>
          </div>
          <button
            onClick={() => {
              const token = typeof window !== 'undefined' ? localStorage.getItem('pixmatch_token') : '';
              const studioId = typeof window !== 'undefined' ? localStorage.getItem('pixmatch_studio_id') : '';
              window.open(`/api/v1/finance/reports/export/csv?type=TRIAL_BALANCE&token=${token}&studioId=${studioId}`, '_blank');
            }}
            className="w-full flex items-center justify-center gap-1.5 py-2 bg-card-border/50 hover:bg-card-border text-white rounded-lg text-xs font-semibold transition"
          >
            <Download className="h-3.5 w-3.5 text-cyan-400" />
            Export Safe CSV
          </button>
        </div>

        <div className="p-5 rounded-2xl bg-card-bg border border-card-border space-y-3 flex flex-col justify-between">
          <div>
            <div className="w-9 h-9 rounded-xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center mb-3">
              <FileText className="h-4 w-4" />
            </div>
            <h3 className="text-sm font-bold text-white">Full P&L & Balance Sheet Pack</h3>
            <p className="text-xs text-muted mt-1">
              Formatted multi-page financial statements package ready for tax accountants and bank audits.
            </p>
          </div>
          <button
            onClick={() => {
              const token = typeof window !== 'undefined' ? localStorage.getItem('pixmatch_token') : '';
              const studioId = typeof window !== 'undefined' ? localStorage.getItem('pixmatch_studio_id') : '';
              window.open(`/api/v1/finance/reports/export/pdf?type=PROFIT_LOSS&token=${token}&studioId=${studioId}`, '_blank');
            }}
            className="w-full flex items-center justify-center gap-1.5 py-2 bg-card-border/50 hover:bg-card-border text-white rounded-lg text-xs font-semibold transition"
          >
            <Download className="h-3.5 w-3.5 text-indigo-400" />
            Export PDF Statement
          </button>
        </div>

        <div className="p-5 rounded-2xl bg-card-bg border border-card-border space-y-3 flex flex-col justify-between">
          <div>
            <div className="w-9 h-9 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center mb-3">
              <ShieldCheck className="h-4 w-4" />
            </div>
            <h3 className="text-sm font-bold text-white">Tax & GST Filing Bundle</h3>
            <p className="text-xs text-muted mt-1">
              GSTR-1, GSTR-3B, Input Tax Credit schedules, and tax reconciliation ledger notes.
            </p>
          </div>
          <button
            onClick={() => {
              const token = typeof window !== 'undefined' ? localStorage.getItem('pixmatch_token') : '';
              const studioId = typeof window !== 'undefined' ? localStorage.getItem('pixmatch_studio_id') : '';
              window.open(`/api/v1/finance/reports/export/csv?type=TAX_SUMMARY&token=${token}&studioId=${studioId}`, '_blank');
            }}
            className="w-full flex items-center justify-center gap-1.5 py-2 bg-card-border/50 hover:bg-card-border text-white rounded-lg text-xs font-semibold transition"
          >
            <Download className="h-3.5 w-3.5 text-emerald-400" />
            Export GST Schedules
          </button>
        </div>
      </div>

      {/* Automated Schedules Section */}
      <div className="p-6 rounded-2xl bg-card-bg border border-card-border space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold text-white">Automated Recurring Report Deliveries</h3>
            <p className="text-xs text-muted mt-0.5">
              Scheduled dispatch of financial statements to founders, accountants, and finance managers.
            </p>
          </div>
          <button
            onClick={() => setCreatingSchedule(!creatingSchedule)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-500/30 rounded-lg text-xs font-semibold transition"
          >
            <Plus className="h-3.5 w-3.5" />
            Create Schedule
          </button>
        </div>

        {creatingSchedule && (
          <form onSubmit={handleCreateSchedule} className="p-4 rounded-xl bg-card-border/30 border border-card-border space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
              <div>
                <label className="block text-muted mb-1">Report Type</label>
                <select
                  value={reportType}
                  onChange={(e) => setReportType(e.target.value)}
                  className="w-full px-2.5 py-1.5 bg-card-border/40 border border-card-border rounded-lg text-white"
                >
                  <option value="PROFIT_LOSS">Profit & Loss</option>
                  <option value="BALANCE_SHEET">Balance Sheet</option>
                  <option value="TRIAL_BALANCE">Trial Balance</option>
                  <option value="TAX_SUMMARY">Tax Summary</option>
                  <option value="ACCOUNTANT_HANDOFF">Accountant Handoff Pack</option>
                </select>
              </div>

              <div>
                <label className="block text-muted mb-1">Frequency</label>
                <select
                  value={frequency}
                  onChange={(e) => setFrequency(e.target.value)}
                  className="w-full px-2.5 py-1.5 bg-card-border/40 border border-card-border rounded-lg text-white"
                >
                  <option value="WEEKLY">Weekly</option>
                  <option value="MONTHLY">Monthly</option>
                  <option value="QUARTERLY">Quarterly</option>
                </select>
              </div>

              <div>
                <label className="block text-muted mb-1">Recipients (comma separated)</label>
                <input
                  type="text"
                  placeholder="ca@firm.com, founder@studio.com"
                  value={recipients}
                  onChange={(e) => setRecipients(e.target.value)}
                  className="w-full px-2.5 py-1.5 bg-card-border/40 border border-card-border rounded-lg text-white"
                  required
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setCreatingSchedule(false)}
                className="px-3 py-1.5 bg-card-border/40 text-muted rounded-lg text-xs"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-1.5 bg-primary text-black rounded-lg text-xs font-semibold hover:bg-primary-hover"
              >
                Save Schedule
              </button>
            </div>
          </form>
        )}

        <div className="divide-y divide-card-border/30">
          {schedules.map((s: any) => (
            <div key={s.id} className="py-3 flex items-center justify-between text-xs">
              <div>
                <span className="font-bold text-white">{s.report_type}</span>
                <span className="ml-2 px-2 py-0.5 rounded bg-cyan-500/10 text-cyan-400 text-[10px] font-semibold uppercase">
                  {s.frequency}
                </span>
                <div className="text-muted text-[11px] mt-0.5">Recipients: {s.recipients?.join(', ')}</div>
              </div>
              <span className="text-emerald-400 font-semibold text-[11px]">ACTIVE</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
