'use client';

import React, { useState, useEffect, use } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  UserCheck,
  ShieldCheck,
  CheckCircle2,
  XCircle,
  Clock,
  Download,
  Trash2,
  FileText,
  AlertTriangle,
} from 'lucide-react';
import { PlatformPrivacyRequestDTO, PrivacyRequestStatus } from '@pixmatch/types';

export default function PrivacyRequestDetailPage({ params }: { params: Promise<{ requestId: string }> }) {
  const resolvedParams = use(params);
  const { requestId } = resolvedParams;

  const [reqData, setReqData] = useState<PlatformPrivacyRequestDTO | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [updating, setUpdating] = useState<boolean>(false);
  const [actionMessage, setActionMessage] = useState<string | null>(null);

  const fetchRequest = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/admin/privacy/requests/${requestId}`);
      if (res.ok) {
        const d = await res.json();
        if (d.success) setReqData(d.data);
      }
    } catch (e) {
      console.error('Failed to load request:', e);
    } finally {
      setLoading(false);
    }
  };

  const handleStatusUpdate = async (status: PrivacyRequestStatus, rejectionReason?: string) => {
    try {
      setUpdating(true);
      setActionMessage(null);
      const res = await fetch(`/api/admin/privacy/requests/${requestId}/status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status, rejectionReason }),
      });
      if (res.ok) {
        const d = await res.json();
        if (d.success) {
          setReqData(d.data);
          setActionMessage(`Request status updated to ${status}`);
        }
      }
    } catch (e) {
      console.error('Failed to update status:', e);
    } finally {
      setUpdating(false);
    }
  };

  useEffect(() => {
    fetchRequest();
  }, [requestId]);

  if (loading) {
    return <div className="p-8 text-slate-400 bg-[#0B0F17] min-h-screen">Loading request details...</div>;
  }

  if (!reqData) {
    return (
      <div className="p-8 space-y-4 bg-[#0B0F17] min-h-screen text-slate-100">
        <Link href="/dashboard/admin/privacy/requests" className="text-xs text-slate-400 hover:text-emerald-400 flex items-center gap-1">
          <ArrowLeft className="h-3 w-3" /> Back to Requests
        </Link>
        <div className="p-6 rounded-xl bg-card-bg border border-red-500/30 text-red-400 text-sm">
          Privacy request not found.
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 md:p-8 space-y-8 bg-[#0B0F17] min-h-screen text-slate-100">
      {/* Header */}
      <div className="space-y-2 border-b border-card-border/80 pb-6">
        <Link
          href="/dashboard/admin/privacy/requests"
          className="text-xs text-slate-400 hover:text-emerald-400 flex items-center gap-1 transition-colors"
        >
          <ArrowLeft className="h-3 w-3" /> Back to Privacy Requests
        </Link>
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-semibold tracking-wider uppercase bg-teal-500/10 text-teal-400 border border-teal-500/20">
                {reqData.requestType}
              </span>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-semibold tracking-wider uppercase bg-slate-800 text-slate-300">
                {reqData.actorType}
              </span>
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2.5">
              <UserCheck className="h-7 w-7 text-teal-400" />
              Privacy Request: {reqData.subjectEmail}
            </h1>
            <p className="text-slate-400 text-xs font-mono mt-0.5">Request ID: {reqData.id}</p>
          </div>

          <div className="flex items-center gap-2">
            {reqData.status !== PrivacyRequestStatus.COMPLETED && (
              <button
                onClick={() => handleStatusUpdate(PrivacyRequestStatus.COMPLETED)}
                disabled={updating}
                className="px-3.5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold transition-colors"
              >
                Mark Fulfilled & Completed
              </button>
            )}
            {reqData.status !== PrivacyRequestStatus.REJECTED && (
              <button
                onClick={() => handleStatusUpdate(PrivacyRequestStatus.REJECTED, 'Request does not meet verification thresholds or conflicts with legal hold.')}
                disabled={updating}
                className="px-3.5 py-2 rounded-lg bg-red-900/60 hover:bg-red-800 text-red-200 border border-red-700/60 text-xs font-medium transition-colors"
              >
                Reject Request
              </button>
            )}
          </div>
        </div>
      </div>

      {actionMessage && (
        <div className="p-4 rounded-xl bg-emerald-950/30 border border-emerald-500/40 text-emerald-300 text-xs flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4" />
          {actionMessage}
        </div>
      )}

      {/* Request Details Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="p-5 rounded-xl bg-card-bg border border-card-border space-y-3">
          <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
            Subject Information
          </h3>
          <div className="space-y-2 text-xs">
            <div className="flex justify-between py-1 border-b border-slate-800">
              <span className="text-slate-400">Subject Email:</span>
              <span className="font-semibold text-white">{reqData.subjectEmail}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-800">
              <span className="text-slate-400">Subject Display Name:</span>
              <span className="text-slate-200">{reqData.subjectName || 'Not specified'}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-800">
              <span className="text-slate-400">Actor Type:</span>
              <span className="text-slate-200">{reqData.actorType}</span>
            </div>
            <div className="flex justify-between py-1">
              <span className="text-slate-400">Identity Verification:</span>
              <span className={reqData.identityVerified ? 'text-emerald-400 font-semibold' : 'text-amber-400 font-semibold'}>
                {reqData.identityVerified ? 'Verified' : 'Pending Verification Challenge'}
              </span>
            </div>
          </div>
        </div>

        <div className="p-5 rounded-xl bg-card-bg border border-card-border space-y-3">
          <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
            Compliance & Deadlines
          </h3>
          <div className="space-y-2 text-xs">
            <div className="flex justify-between py-1 border-b border-slate-800">
              <span className="text-slate-400">Current Status:</span>
              <span className="font-bold text-teal-400">{reqData.status}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-800">
              <span className="text-slate-400">Statutory Deadline (30d):</span>
              <span className="font-mono text-amber-400">{new Date(reqData.deadline).toLocaleString()}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-800">
              <span className="text-slate-400">Submitted At:</span>
              <span className="text-slate-300">{new Date(reqData.createdAt).toLocaleString()}</span>
            </div>
            <div className="flex justify-between py-1">
              <span className="text-slate-400">Completed At:</span>
              <span className="text-slate-300">{reqData.completedAt ? new Date(reqData.completedAt).toLocaleString() : 'Pending'}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Fulfillment Actions */}
      <div className="p-5 rounded-xl bg-card-bg border border-card-border space-y-4">
        <h3 className="text-xs font-semibold text-white uppercase tracking-wider flex items-center gap-2">
          <FileText className="h-4 w-4 text-emerald-400" />
          Fulfillment Actions
        </h3>
        <div className="flex flex-wrap gap-4">
          <Link
            href={`/dashboard/admin/privacy/exports`}
            className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold transition-colors shadow-lg shadow-blue-500/20"
          >
            <Download className="h-4 w-4" />
            Generate SAR Export Package
          </Link>
          <Link
            href={`/dashboard/admin/privacy/deletion`}
            className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold transition-colors shadow-lg shadow-rose-500/20"
          >
            <Trash2 className="h-4 w-4" />
            Launch Deletion Console
          </Link>
        </div>
      </div>
    </div>
  );
}
