'use client';

import React, { useState, useEffect } from 'react';
import {
  Lock,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  ShieldCheck,
  Calendar,
  Layers,
  ChevronRight,
} from 'lucide-react';
import { FinanceNavTabs } from '@/components/dashboard/FinanceNavTabs';
import { ReportsNavTabs } from '@/components/dashboard/ReportsNavTabs';
import { fetchApi } from '@/lib/api-client';

export default function MonthEndClosePage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [checklist, setChecklist] = useState<any>(null);
  const [closing, setClosing] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetchApi('/finance/reports/month-end-close/checklist');
      if (res && !res.error) {
        setChecklist(res.data || res);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load Month-End Close checklist');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handlePerformClose = async () => {
    if (!confirm('Are you sure you want to lock this accounting period and generate the final close snapshot?')) {
      return;
    }
    setClosing(true);
    setError(null);
    setSuccessMessage(null);
    try {
      const res = await fetchApi('/finance/reports/month-end-close/close', {
        method: 'POST',
        body: JSON.stringify({
          period_id: checklist?.period_id,
          notes: 'Formal month-end close and period lock executed from reporting hub',
        }),
      });
      if (res && !res.error) {
        setSuccessMessage('Period closed successfully! Immutable financial snapshot generated.');
        loadData();
      }
    } catch (err: any) {
      setError(err.message || 'Failed to execute month-end close');
    } finally {
      setClosing(false);
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2.5">
            <Lock className="h-7 w-7 text-amber-400" />
            Month-End Financial Close & Period Lock
          </h1>
          <p className="text-sm text-muted mt-1">
            14-point audit readiness checklist, trial balance validation, and immutable balance snapshot capture.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handlePerformClose}
            disabled={closing || loading || (checklist && checklist.ready_for_close === false)}
            className="flex items-center gap-1.5 px-4 py-2 bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-white rounded-lg text-xs font-semibold transition"
          >
            <Lock className="h-3.5 w-3.5" />
            {closing ? 'Locking Period...' : 'Execute Formal Close'}
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

      {successMessage && (
        <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-sm flex items-center gap-2">
          <CheckCircle2 className="h-5 w-5 flex-shrink-0" />
          <span>{successMessage}</span>
        </div>
      )}

      {/* Progress & Readiness Banner */}
      {checklist && (
        <div className="p-6 rounded-2xl bg-card-bg border border-card-border space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <span className="text-xs text-muted uppercase tracking-wider">Accounting Period</span>
              <h2 className="text-lg font-bold text-white mt-0.5">{checklist.period_name || 'Current Open Period'}</h2>
            </div>
            <div className="flex items-center gap-3">
              <div className="text-right">
                <span className="text-xs text-muted">Readiness Score</span>
                <div className="text-xl font-bold text-cyan-400">{checklist.completion_percentage}%</div>
              </div>
              <div className="w-16 h-16 rounded-full border-4 border-card-border/40 flex items-center justify-center font-bold text-xs text-white">
                {checklist.passed_items_count}/{checklist.total_items_count}
              </div>
            </div>
          </div>

          <div className="h-2.5 w-full bg-card-border/40 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${
                checklist.completion_percentage === 100 ? 'bg-emerald-400' : 'bg-cyan-400'
              }`}
              style={{ width: `${checklist.completion_percentage}%` }}
            />
          </div>
        </div>
      )}

      {/* 14-Item Checklist List */}
      {checklist && (
        <div className="p-6 rounded-2xl bg-card-bg border border-card-border space-y-4">
          <h3 className="text-base font-bold text-white">Month-End Close Verification Items</h3>

          <div className="divide-y divide-card-border/30">
            {checklist.items?.map((item: any) => (
              <div key={item.id || item.code} className="py-3.5 flex items-start justify-between gap-4 text-xs">
                <div className="flex items-start gap-3">
                  <div className="mt-0.5">
                    {item.passed ? (
                      <CheckCircle2 className="h-5 w-5 text-emerald-400" />
                    ) : item.is_blocking ? (
                      <XCircle className="h-5 w-5 text-rose-400" />
                    ) : (
                      <AlertTriangle className="h-5 w-5 text-amber-400" />
                    )}
                  </div>
                  <div>
                    <div className="font-semibold text-white flex items-center gap-2">
                      <span>{item.title}</span>
                      {item.is_blocking && (
                        <span className="px-1.5 py-0.5 rounded bg-rose-500/10 text-rose-400 text-[10px] font-mono uppercase">
                          Blocking
                        </span>
                      )}
                    </div>
                    <p className="text-muted text-[11px] mt-0.5">{item.description}</p>
                  </div>
                </div>
                <div className="text-right whitespace-nowrap">
                  <span className={`font-semibold ${item.passed ? 'text-emerald-400' : 'text-rose-400'}`}>
                    {item.passed ? 'PASSED' : 'ACTION NEEDED'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
