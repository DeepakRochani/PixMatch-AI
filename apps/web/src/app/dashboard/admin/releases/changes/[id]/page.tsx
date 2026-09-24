'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  GitPullRequest,
  ChevronLeft,
  CheckCircle2,
  XCircle,
  ShieldCheck,
  ShieldAlert,
  Clock,
  Play,
  UserCheck,
  AlertTriangle,
} from 'lucide-react';
import { PlatformChangeRequestDTO, PlatformChangeApprovalDTO, ChangeRequestStatus } from '@pixmatch/types';

function ChangeRequestDetailContent() {
  const params = useParams();
  const router = useRouter();
  const requestId = params.id as string;

  const [request, setRequest] = useState<PlatformChangeRequestDTO | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [acting, setActing] = useState<boolean>(false);
  const [comment, setComment] = useState<string>('');

  const fetchRequest = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/admin/releases/changes/${requestId}`);
      if (res.ok) {
        const d = await res.json();
        if (d.success) setRequest(d.data);
      }
    } catch (e) {
      console.error('Failed to load change request:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (requestId) fetchRequest();
  }, [requestId]);

  const handleApprove = async () => {
    try {
      setActing(true);
      const res = await fetch(`/api/admin/releases/changes/${requestId}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ decision: 'APPROVED', comment: comment || 'Approved in Admin UI' }),
      });
      if (res.ok) {
        await fetchRequest();
        alert('Approval recorded successfully!');
      } else {
        const err = await res.json();
        alert(`Approval failed: ${err.message || err.error}`);
      }
    } catch (e) {
      console.error('Approval error:', e);
    } finally {
      setActing(false);
    }
  };

  const handleExecute = async () => {
    try {
      setActing(true);
      const res = await fetch(`/api/admin/releases/changes/${requestId}/execute`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      if (res.ok) {
        await fetchRequest();
        alert('Change executed successfully and snapshot recorded!');
      } else {
        const err = await res.json();
        alert(`Execution failed: ${err.message || err.error}`);
      }
    } catch (e) {
      console.error('Execution error:', e);
    } finally {
      setActing(false);
    }
  };

  if (loading || !request) {
    return (
      <div className="p-8 text-slate-400 bg-[#0B0F17] min-h-screen">
        Loading change request details...
      </div>
    );
  }

  return (
    <div className="p-6 md:p-8 space-y-6 bg-[#0B0F17] min-h-screen text-slate-100">
      {/* Header */}
      <div className="space-y-3 border-b border-card-border/80 pb-6">
        <Link
          href="/dashboard/admin/releases/changes"
          className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-white transition"
        >
          <ChevronLeft className="h-4 w-4" />
          <span>Back to Change Queue</span>
        </Link>

        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="font-mono text-xs font-bold text-purple-400 bg-purple-500/10 px-2 py-0.5 rounded border border-purple-500/20">
                CR-{request.id.slice(0, 8)}
              </span>
              <span
                className={`text-xs px-2 py-0.5 rounded font-bold ${
                  request.riskLevel === 'CRITICAL'
                    ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                    : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                }`}
              >
                RISK: {request.riskLevel}
              </span>
            </div>
            <h1 className="text-2xl font-bold text-white">{request.title}</h1>
            <p className="text-slate-400 text-sm mt-0.5 font-mono">Target: {request.targetKey}</p>
          </div>

          <div className="flex items-center gap-3">
            <span
              className={`px-3 py-1 rounded-lg text-xs font-bold ${
                request.status === ChangeRequestStatus.PENDING_APPROVAL
                  ? 'bg-purple-500/15 text-purple-400 border border-purple-500/30'
                  : request.status === ChangeRequestStatus.APPROVED
                  ? 'bg-blue-500/15 text-blue-400 border border-blue-500/30'
                  : request.status === ChangeRequestStatus.COMPLETED
                  ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                  : request.status === ChangeRequestStatus.EXECUTING
                  ? 'bg-amber-500/15 text-amber-400 border border-amber-500/30'
                  : 'bg-slate-700/30 text-slate-400 border border-slate-600'
              }`}
            >
              STATUS: {request.status}
            </span>
          </div>
        </div>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {/* Metadata Card */}
          <div className="p-6 rounded-xl bg-[#0F1623] border border-card-border/80 space-y-4">
            <h2 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <GitPullRequest className="h-4 w-4 text-purple-400" />
              Proposed Changes & Payload
            </h2>

            <div className="p-3 rounded-lg bg-[#0B0F17] border border-card-border/40 text-xs space-y-1">
              <span className="text-slate-400 font-semibold">Business Justification / Reason:</span>
              <p className="text-slate-200">{request.reason}</p>
            </div>

            <div className="space-y-2">
              <span className="text-xs text-slate-400 font-semibold">Proposed Value Payload:</span>
              <pre className="p-4 bg-[#0B0F17] rounded-lg text-slate-200 font-mono text-xs overflow-x-auto border border-card-border/50">
                {JSON.stringify(request.proposedValue || request.diff_payload, null, 2)}
              </pre>
            </div>
          </div>

          {/* Impact Analysis & Validation Card */}
          <div className="p-6 rounded-xl bg-[#0F1623] border border-card-border/80 space-y-4">
            <h2 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <ShieldAlert className="h-4 w-4 text-amber-400" />
              Automated Impact Analysis
            </h2>
            <div className="grid grid-cols-2 gap-4 text-xs">
              <div className="p-3 rounded-lg bg-[#0B0F17] border border-card-border/40">
                <span className="text-slate-400">Environment</span>
                <p className="text-amber-400 font-bold mt-0.5 font-mono">{request.environment}</p>
              </div>
              <div className="p-3 rounded-lg bg-[#0B0F17] border border-card-border/40">
                <span className="text-slate-400">Required Sign-offs</span>
                <p className="text-white font-bold mt-0.5">
                  {request.riskLevel === 'CRITICAL' ? '2 (Two-Person Rule)' : '1 (Single Admin)'}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Approvals & Execution Action */}
        <div className="space-y-6">
          <div className="p-6 rounded-xl bg-[#0F1623] border border-card-border/80 space-y-4">
            <h2 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <UserCheck className="h-4 w-4 text-emerald-400" />
              Recorded Approvals
            </h2>

            <div className="space-y-3 text-xs">
              {request.approvals && request.approvals.length > 0 ? (
                request.approvals.map((app) => (
                  <div key={app.id} className="p-3 rounded-lg bg-[#0B0F17] border border-card-border/40 space-y-1">
                    <div className="flex items-center justify-between font-mono">
                      <span className="font-semibold text-white">Admin ID: {app.approver_id || app.approverId}</span>
                      <span className="text-emerald-400 font-bold">{app.decision}</span>
                    </div>
                    {(app.comment || app.reason) && (
                      <p className="text-slate-400 italic text-[11px]">"{app.comment || app.reason}"</p>
                    )}
                    <p className="text-[10px] text-slate-500">
                      {new Date(app.decided_at || app.createdAt || Date.now()).toLocaleString()}
                    </p>
                  </div>
                ))
              ) : (
                <p className="text-slate-500 italic">No approvals submitted yet.</p>
              )}
            </div>

            {/* Approval Controls */}
            {request.status === ChangeRequestStatus.PENDING_APPROVAL && (
              <div className="pt-4 border-t border-card-border/50 space-y-3">
                <input
                  type="text"
                  placeholder="Review comments..."
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  className="w-full px-3 py-2 bg-[#0B0F17] border border-card-border/70 rounded-lg text-xs text-white"
                />
                <button
                  onClick={handleApprove}
                  disabled={acting}
                  className="w-full py-2 bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold text-xs rounded-lg transition disabled:opacity-50"
                >
                  {acting ? 'Processing...' : 'Sign & Approve Change'}
                </button>
              </div>
            )}

            {/* Execution Controls */}
            {request.status === ChangeRequestStatus.APPROVED && (
              <div className="pt-4 border-t border-card-border/50">
                <button
                  onClick={handleExecute}
                  disabled={acting}
                  className="w-full py-2 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs rounded-lg transition flex items-center justify-center gap-1.5 shadow-md shadow-amber-500/20"
                >
                  <Play className="h-3.5 w-3.5" />
                  <span>Execute & Apply Live</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ChangeRequestDetailPage() {
  return (
    <Suspense fallback={<div className="p-8 text-slate-400">Loading Change Request...</div>}>
      <ChangeRequestDetailContent />
    </Suspense>
  );
}
