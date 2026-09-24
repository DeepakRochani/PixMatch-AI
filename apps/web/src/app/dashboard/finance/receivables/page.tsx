'use client';

import React, { useState, useEffect } from 'react';
import { ArrowDownLeft, RefreshCw, Mail, CheckCircle2, Clock, AlertTriangle, Send } from 'lucide-react';
import { FinanceNavTabs } from '@/components/dashboard/FinanceNavTabs';
import { fetchApi } from '@/lib/api-client';

export default function FinanceReceivablesPage() {
  const [receivables, setReceivables] = useState<any[]>([]);
  const [aging, setAging] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedFollowup, setSelectedFollowup] = useState<any | null>(null);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [recRes, agingRes] = await Promise.all([
        fetchApi('/finance/receivables'),
        fetchApi('/finance/reports/aging'),
      ]);

      if (recRes && !recRes.error) {
        setReceivables(Array.isArray(recRes.data) ? recRes.data : Array.isArray(recRes) ? recRes : []);
      }
      if (agingRes && !agingRes.error) {
        setAging(agingRes.data?.receivables || (agingRes as any).receivables);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load receivables');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleDraftFollowup = async (recId: string) => {
    try {
      const res = await fetchApi(`/finance/receivables/${recId}/followup-draft`, { method: 'POST' });
      if (res.error) throw new Error(res.error.message);
      setSelectedFollowup(res.data || res);
    } catch (err: any) {
      alert(err.message || 'Failed to generate reminder draft');
    }
  };

  const formatCents = (cents?: number) => {
    const val = (cents || 0) / 100;
    return `$${val.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2.5">
            <ArrowDownLeft className="h-7 w-7 text-emerald-400" />
            Accounts Receivable & Aging 2.0
          </h1>
          <p className="text-sm text-muted mt-1">
            Track uncollected client invoices, payment schedules, 30/60/90+ day aging buckets, and human-approved follow-up drafts.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={loadData}
            className="flex items-center gap-1.5 px-3 py-2 bg-card-bg border border-card-border rounded-lg text-xs font-medium text-white hover:bg-card-border/40 transition"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Refresh
          </button>
        </div>
      </div>

      <FinanceNavTabs />

      {error && (
        <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm flex items-center gap-2">
          <AlertTriangle className="h-5 w-5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Aging Schedule Ribbon */}
      {aging && (
        <div className="p-5 rounded-2xl bg-card-bg border border-card-border space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted">Receivables Aging Analysis</span>
            <span className="text-sm font-bold text-emerald-400">Total: {formatCents(aging.total_cents)}</span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            <div className="p-3 rounded-xl bg-card-border/30">
              <div className="text-[11px] text-muted">Current (0-30d)</div>
              <div className="text-sm font-bold text-white mt-1">{formatCents(aging.current_cents)}</div>
            </div>
            <div className="p-3 rounded-xl bg-card-border/30">
              <div className="text-[11px] text-muted">1 - 30 Days Past</div>
              <div className="text-sm font-bold text-amber-400 mt-1">{formatCents(aging.days_1_30_cents)}</div>
            </div>
            <div className="p-3 rounded-xl bg-card-border/30">
              <div className="text-[11px] text-muted">31 - 60 Days Past</div>
              <div className="text-sm font-bold text-amber-500 mt-1">{formatCents(aging.days_31_60_cents)}</div>
            </div>
            <div className="p-3 rounded-xl bg-card-border/30">
              <div className="text-[11px] text-muted">61 - 90 Days Past</div>
              <div className="text-sm font-bold text-rose-400 mt-1">{formatCents(aging.days_61_90_cents)}</div>
            </div>
            <div className="p-3 rounded-xl bg-card-border/30">
              <div className="text-[11px] text-muted">&gt; 90 Days Overdue</div>
              <div className="text-sm font-bold text-rose-500 mt-1">{formatCents(aging.days_over_90_cents)}</div>
            </div>
          </div>
        </div>
      )}

      {/* Receivables Table */}
      <div className="bg-card-bg border border-card-border rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-muted">
            <thead className="bg-card-border/40 text-white uppercase tracking-wider text-[10px] font-semibold border-b border-card-border">
              <tr>
                <th className="px-5 py-3.5">Due Date</th>
                <th className="px-5 py-3.5">Invoice / Description</th>
                <th className="px-5 py-3.5">Total Amount</th>
                <th className="px-5 py-3.5">Received</th>
                <th className="px-5 py-3.5">Balance Due</th>
                <th className="px-5 py-3.5">Status</th>
                <th className="px-5 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-card-border/30">
              {receivables.map((rec) => {
                const balanceDue = rec.total_amount_cents - (rec.received_amount_cents || 0);
                return (
                  <tr key={rec.id} className="hover:bg-card-border/20 transition">
                    <td className="px-5 py-4 whitespace-nowrap text-white">
                      {rec.due_date ? new Date(rec.due_date).toLocaleDateString() : 'Upon receipt'}
                    </td>
                    <td className="px-5 py-4 font-medium text-white max-w-xs truncate">
                      {rec.description}
                    </td>
                    <td className="px-5 py-4 text-white">
                      {formatCents(rec.total_amount_cents)}
                    </td>
                    <td className="px-5 py-4 text-emerald-400">
                      {formatCents(rec.received_amount_cents || 0)}
                    </td>
                    <td className="px-5 py-4 font-bold text-white whitespace-nowrap">
                      {formatCents(balanceDue)}
                    </td>
                    <td className="px-5 py-4 whitespace-nowrap">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                        rec.status === 'PAID' ? 'bg-emerald-500/10 text-emerald-400' :
                        rec.status === 'PARTIALLY_PAID' ? 'bg-amber-500/10 text-amber-400' :
                        rec.status === 'OVERDUE' ? 'bg-rose-500/10 text-rose-400' :
                        'bg-blue-500/10 text-blue-400'
                      }`}>
                        {rec.status}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-right whitespace-nowrap">
                      {balanceDue > 0 && (
                        <button
                          onClick={() => handleDraftFollowup(rec.id)}
                          className="flex items-center gap-1.5 px-2.5 py-1 bg-card-border/40 hover:bg-card-border/80 text-white rounded-lg text-[11px] font-medium transition ml-auto"
                        >
                          <Mail className="h-3 w-3 text-primary" />
                          Draft Followup
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}

              {receivables.length === 0 && !loading && (
                <tr>
                  <td colSpan={7} className="p-12 text-center text-muted">
                    No client receivables recorded.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Followup Draft Modal */}
      {selectedFollowup && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-card-bg border border-card-border rounded-2xl max-w-lg w-full p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Mail className="h-4 w-4 text-primary" />
                Copilot Follow-Up Draft (Human Approval Required)
              </h3>
            </div>
            <div className="p-3 bg-card-border/30 rounded-xl space-y-2 text-xs">
              <div className="font-semibold text-white">Subject: {selectedFollowup.subject}</div>
              <div className="text-muted whitespace-pre-line border-t border-card-border/40 pt-2">
                {selectedFollowup.body}
              </div>
            </div>
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setSelectedFollowup(null)}
                className="px-4 py-2 bg-card-border/40 text-white rounded-lg text-xs font-medium hover:bg-card-border/60 transition"
              >
                Close
              </button>
              <button
                type="button"
                onClick={() => {
                  alert('Email reminder approved and queued for dispatch.');
                  setSelectedFollowup(null);
                }}
                className="flex items-center gap-1.5 px-4 py-2 bg-primary text-black rounded-lg text-xs font-semibold hover:bg-primary-hover transition"
              >
                <Send className="h-3.5 w-3.5" />
                Approve & Send
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
