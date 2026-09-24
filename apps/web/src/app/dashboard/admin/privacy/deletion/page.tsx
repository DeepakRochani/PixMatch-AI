'use client';

import React, { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import {
  Trash2,
  ArrowLeft,
  AlertTriangle,
  ShieldAlert,
  ShieldCheck,
  CheckCircle2,
  XCircle,
  Eye,
  RefreshCw,
  Search,
  Lock,
} from 'lucide-react';
import { DataDeletionExecutionDTO } from '@pixmatch/types';

function DeletionConsoleContent() {
  const [subjectEmail, setSubjectEmail] = useState<string>('');
  const [approverId, setApproverId] = useState<string>('admin-governance-officer');
  const [preview, setPreview] = useState<any | null>(null);
  const [previewing, setPreviewing] = useState<boolean>(false);
  const [executing, setExecuting] = useState<boolean>(false);
  const [executions, setExecutions] = useState<DataDeletionExecutionDTO[]>([]);
  const [loadingHistory, setLoadingHistory] = useState<boolean>(true);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const fetchExecutions = async () => {
    try {
      setLoadingHistory(true);
      const res = await fetch('/api/admin/privacy/deletion/executions');
      if (res.ok) {
        const d = await res.json();
        if (d.success) setExecutions(d.data || []);
      }
    } catch (e) {
      console.error('Failed to load deletion history:', e);
    } finally {
      setLoadingHistory(false);
    }
  };

  const handlePreview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!subjectEmail) return;
    try {
      setPreviewing(true);
      setStatusMessage(null);
      setPreview(null);
      const res = await fetch('/api/admin/privacy/deletion/preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subjectEmail }),
      });
      if (res.ok) {
        const d = await res.json();
        if (d.success) setPreview(d.data);
      }
    } catch (e: any) {
      setStatusMessage({ type: 'error', text: e.message || 'Failed to preview deletion' });
    } finally {
      setPreviewing(false);
    }
  };

  const handleExecute = async () => {
    if (!subjectEmail || !approverId) return;
    try {
      setExecuting(true);
      setStatusMessage(null);
      const res = await fetch('/api/admin/privacy/deletion/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subjectEmail,
          approvedByAdminId: approverId,
        }),
      });
      const d = await res.json();
      if (res.ok && d.success) {
        setStatusMessage({
          type: 'success',
          text: `Deletion executed successfully! Purged ${d.data.itemsDeletedCount} records, Anonymized ${d.data.itemsAnonymizedCount} records.`,
        });
        setPreview(null);
        setSubjectEmail('');
        fetchExecutions();
      } else {
        setStatusMessage({ type: 'error', text: d.error || 'Deletion execution blocked or failed.' });
      }
    } catch (e: any) {
      setStatusMessage({ type: 'error', text: e.message || 'Execution error.' });
    } finally {
      setExecuting(false);
    }
  };

  useEffect(() => {
    fetchExecutions();
  }, []);

  return (
    <div className="p-6 md:p-8 space-y-8 bg-[#0B0F17] min-h-screen text-slate-100">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-card-border/80 pb-6">
        <div>
          <Link
            href="/dashboard/admin/privacy"
            className="text-xs text-slate-400 hover:text-emerald-400 flex items-center gap-1 mb-2 transition-colors"
          >
            <ArrowLeft className="h-3 w-3" /> Back to Privacy Center
          </Link>
          <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2.5">
            <Trash2 className="h-7 w-7 text-rose-500" />
            Data Deletion & Anonymization Console
          </h1>
          <p className="text-slate-400 text-xs mt-1">
            Dependency preview graphs, active legal hold blockers, mandatory human approval, and verifiable deletion certificates.
          </p>
        </div>

        <button
          onClick={fetchExecutions}
          className="flex items-center gap-2 px-3.5 py-2 rounded-lg bg-card-bg border border-card-border hover:bg-slate-800 text-slate-300 text-xs font-medium transition-colors"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${loadingHistory ? 'animate-spin text-rose-500' : ''}`} />
          Refresh
        </button>
      </div>

      {statusMessage && (
        <div
          className={`p-4 rounded-xl border text-xs flex items-center gap-2.5 ${
            statusMessage.type === 'success'
              ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-300'
              : 'bg-red-950/40 border-red-500/40 text-red-300'
          }`}
        >
          {statusMessage.type === 'success' ? <CheckCircle2 className="h-4 w-4" /> : <AlertTriangle className="h-4 w-4" />}
          {statusMessage.text}
        </div>
      )}

      {/* Step 1: Lookup & Dependency Preview */}
      <div className="p-5 rounded-xl bg-card-bg border border-card-border space-y-4">
        <h2 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
          <Search className="h-4 w-4 text-rose-400" />
          Step 1: Calculate Dependency Preview Graph
        </h2>
        <form onSubmit={handlePreview} className="flex flex-col md:flex-row items-center gap-4">
          <input
            type="email"
            placeholder="Subject user or client email address..."
            value={subjectEmail}
            onChange={(e) => setSubjectEmail(e.target.value)}
            required
            className="flex-1 px-4 py-2.5 bg-slate-900 border border-slate-700 rounded-lg text-xs text-white placeholder-slate-500 focus:outline-none focus:border-rose-500"
          />
          <button
            type="submit"
            disabled={previewing}
            className="px-5 py-2.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold border border-slate-700 transition-all"
          >
            {previewing ? 'Analyzing Dependencies...' : 'Calculate Preview'}
          </button>
        </form>

        {preview && (
          <div className="mt-6 p-5 rounded-xl bg-slate-900/90 border border-slate-800 space-y-5">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-white uppercase tracking-wider">
                Deletion Impact Assessment for {preview.subjectEmail}
              </h3>
              {preview.canProceed ? (
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center gap-1">
                  <CheckCircle2 className="h-3 w-3" /> Ready for Human Approval
                </span>
              ) : (
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-red-500/10 text-red-400 border border-red-500/20 flex items-center gap-1">
                  <ShieldAlert className="h-3 w-3" /> Deletion Blocked by Legal Hold
                </span>
              )}
            </div>

            {/* Legal Holds Block Notice */}
            {!preview.canProceed && (
              <div className="p-3.5 rounded-lg bg-red-950/40 border border-red-500/40 text-red-200 text-xs">
                <div className="font-semibold flex items-center gap-1.5">
                  <Lock className="h-4 w-4" />
                  Active Legal Hold Preservation Active
                </div>
                <p className="mt-1 text-[11px] text-red-300">
                  Case {preview.legalHoldsBlocking[0]?.caseNumber}: {preview.legalHoldsBlocking[0]?.name}. Data deletion is legally restricted until released by legal counsel.
                </p>
              </div>
            )}

            {/* Dependency Metrics */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              <div className="p-3 bg-slate-950 rounded-lg border border-slate-800">
                <span className="text-slate-400 text-[11px]">Client CRM Records:</span>
                <div className="font-bold text-white mt-1">{preview.dependencies.clientProfilesCount}</div>
              </div>
              <div className="p-3 bg-slate-950 rounded-lg border border-slate-800">
                <span className="text-slate-400 text-[11px]">Face Biometric Embeddings:</span>
                <div className="font-bold text-pink-400 mt-1">{preview.dependencies.faceEncodingsCount} (To Purge)</div>
              </div>
              <div className="p-3 bg-slate-950 rounded-lg border border-slate-800">
                <span className="text-slate-400 text-[11px]">Financial Invoices:</span>
                <div className="font-bold text-amber-400 mt-1">{preview.dependencies.invoicesCount} (To Scrub PII)</div>
              </div>
              <div className="p-3 bg-slate-950 rounded-lg border border-slate-800">
                <span className="text-slate-400 text-[11px]">User Account:</span>
                <div className="font-bold text-blue-400 mt-1">{preview.dependencies.userAccount ? 'Present (To Anonymize)' : 'None'}</div>
              </div>
            </div>

            {/* Step 2: Human Approval & Execution */}
            {preview.canProceed && (
              <div className="pt-4 border-t border-slate-800 space-y-4">
                <div className="flex flex-col sm:flex-row items-center gap-4">
                  <div className="w-full sm:w-80">
                    <label className="text-[11px] text-slate-400 block mb-1">
                      Mandatory Admin Approver ID:
                    </label>
                    <input
                      type="text"
                      value={approverId}
                      onChange={(e) => setApproverId(e.target.value)}
                      required
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-xs text-white"
                    />
                  </div>
                  <button
                    onClick={handleExecute}
                    disabled={executing || !approverId}
                    className="w-full sm:w-auto mt-5 px-6 py-2.5 rounded-lg bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white text-xs font-bold shadow-lg shadow-red-500/20 transition-all"
                  >
                    {executing ? 'Executing Irreversible Purge...' : 'Approve & Execute Irreversible Deletion'}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Deletion History Table */}
      <div className="rounded-xl bg-card-bg border border-card-border/80 overflow-hidden">
        <div className="p-4 bg-slate-900/80 border-b border-card-border">
          <h2 className="text-xs font-bold text-white uppercase tracking-wider">
            Executed Deletion Certificates ({executions.length})
          </h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-900/60 border-b border-card-border text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
              <tr>
                <th className="px-4 py-3.5">Subject Email</th>
                <th className="px-4 py-3.5">State</th>
                <th className="px-4 py-3.5">Items Purged</th>
                <th className="px-4 py-3.5">Items Anonymized</th>
                <th className="px-4 py-3.5">Approved By</th>
                <th className="px-4 py-3.5">Executed At</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-mono">
              {loadingHistory ? (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center text-slate-400 font-sans">
                    Loading deletion records...
                  </td>
                </tr>
              ) : executions.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center text-slate-400 font-sans">
                    No deletion executions recorded.
                  </td>
                </tr>
              ) : executions.map((ex) => (
                <tr key={ex.id} className="hover:bg-slate-800/40 transition-colors">
                  <td className="px-4 py-3.5 font-sans font-semibold text-white">
                    {ex.subjectEmail}
                  </td>
                  <td className="px-4 py-3.5">
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                      {ex.state}
                    </span>
                  </td>
                  <td className="px-4 py-3.5 text-pink-400 font-bold">
                    {ex.itemsDeletedCount}
                  </td>
                  <td className="px-4 py-3.5 text-blue-400 font-bold">
                    {ex.itemsAnonymizedCount}
                  </td>
                  <td className="px-4 py-3.5 text-slate-300 font-sans">
                    {ex.approvedByAdminId || 'System'}
                  </td>
                  <td className="px-4 py-3.5 text-slate-400 font-sans text-[11px]">
                    {ex.completedAt ? new Date(ex.completedAt).toLocaleString() : 'Processing'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export default function DeletionPage() {
  return (
    <Suspense fallback={<div className="p-8 text-slate-400">Loading Deletion Console...</div>}>
      <DeletionConsoleContent />
    </Suspense>
  );
}
