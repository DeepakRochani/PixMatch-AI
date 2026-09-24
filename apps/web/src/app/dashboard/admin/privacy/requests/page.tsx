'use client';

import React, { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import {
  UserCheck,
  ArrowLeft,
  Search,
  Filter,
  RefreshCw,
  Eye,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Plus,
} from 'lucide-react';
import {
  PlatformPrivacyRequestDTO,
  PrivacyRequestType,
  PrivacyRequestStatus,
  PrivacyRequestActor,
} from '@pixmatch/types';

function PrivacyRequestsListContent() {
  const [requests, setRequests] = useState<PlatformPrivacyRequestDTO[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [search, setSearch] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [typeFilter, setTypeFilter] = useState<string>('ALL');

  const fetchRequests = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (search) params.append('search', search);
      if (statusFilter !== 'ALL') params.append('status', statusFilter);
      if (typeFilter !== 'ALL') params.append('requestType', typeFilter);

      const res = await fetch(`/api/admin/privacy/requests?${params.toString()}`);
      if (res.ok) {
        const d = await res.json();
        if (d.success) setRequests(d.data || []);
      }
    } catch (e) {
      console.error('Failed to load privacy requests:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
  }, [statusFilter, typeFilter]);

  const getStatusBadge = (status: PrivacyRequestStatus) => {
    switch (status) {
      case PrivacyRequestStatus.COMPLETED:
        return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
      case PrivacyRequestStatus.IN_PROGRESS:
        return 'bg-blue-500/10 text-blue-400 border-blue-500/20';
      case PrivacyRequestStatus.IDENTITY_REVIEW:
        return 'bg-amber-500/10 text-amber-400 border-amber-500/20';
      case PrivacyRequestStatus.FLAGGED_FOR_REVIEW:
        return 'bg-purple-500/10 text-purple-400 border-purple-500/20';
      case PrivacyRequestStatus.WAITING:
        return 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20';
      case PrivacyRequestStatus.REJECTED:
      case PrivacyRequestStatus.CANCELLED:
        return 'bg-red-500/10 text-red-400 border-red-500/20';
      case PrivacyRequestStatus.RECEIVED:
      default:
        return 'bg-slate-700 text-slate-300';
    }
  };

  return (
    <div className="p-6 md:p-8 space-y-6 bg-[#0B0F17] min-h-screen text-slate-100">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-card-border/80 pb-6">
        <div>
          <Link
            href="/dashboard/admin/privacy"
            className="text-xs text-slate-400 hover:text-emerald-400 flex items-center gap-1 mb-2 transition-colors"
          >
            <ArrowLeft className="h-3 w-3" /> Back to Privacy Center
          </Link>
          <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2.5">
            <UserCheck className="h-7 w-7 text-teal-400" />
            Subject Access & Privacy Requests
          </h1>
          <p className="text-slate-400 text-xs mt-1">
            Manage subject rights requests: Access, Portability, Deletion, Rectification, and Restriction with identity validation.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={fetchRequests}
            className="flex items-center gap-2 px-3.5 py-2 rounded-lg bg-card-bg border border-card-border hover:bg-slate-800 text-slate-300 text-xs font-medium transition-colors"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin text-teal-400' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="p-4 rounded-xl bg-card-bg border border-card-border/80 flex flex-col md:flex-row items-center justify-between gap-4">
        <form onSubmit={(e) => { e.preventDefault(); fetchRequests(); }} className="relative w-full md:w-96">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search by subject email, name, details..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-slate-900/90 border border-slate-700 rounded-lg text-xs text-white placeholder-slate-500 focus:outline-none focus:border-teal-500"
          />
        </form>

        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-400">Type:</span>
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-teal-500"
            >
              <option value="ALL">All Types</option>
              {Object.values(PrivacyRequestType).map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-400">Status:</span>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-teal-500"
            >
              <option value="ALL">All Statuses</option>
              {Object.values(PrivacyRequestStatus).map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Requests Table */}
      <div className="rounded-xl bg-card-bg border border-card-border/80 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-900/90 border-b border-card-border text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
              <tr>
                <th className="px-4 py-3.5">Subject Email & Actor</th>
                <th className="px-4 py-3.5">Request Type</th>
                <th className="px-4 py-3.5">Status</th>
                <th className="px-4 py-3.5">Identity Verification</th>
                <th className="px-4 py-3.5">Statutory Deadline</th>
                <th className="px-4 py-3.5 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center text-slate-400">
                    Loading requests...
                  </td>
                </tr>
              ) : requests.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center text-slate-400">
                    No privacy requests found.
                  </td>
                </tr>
              ) : requests.map((req) => (
                <tr key={req.id} className="hover:bg-slate-800/40 transition-colors">
                  <td className="px-4 py-3.5">
                    <div className="font-semibold text-white">{req.subjectEmail}</div>
                    <div className="text-[11px] text-slate-400 mt-0.5">{req.subjectName || req.actorType}</div>
                  </td>
                  <td className="px-4 py-3.5 font-mono text-[11px] text-teal-300 font-semibold">
                    {req.requestType}
                  </td>
                  <td className="px-4 py-3.5">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border ${getStatusBadge(req.status)}`}>
                      {req.status}
                    </span>
                  </td>
                  <td className="px-4 py-3.5">
                    {req.identityVerified ? (
                      <span className="flex items-center gap-1 text-emerald-400 text-[11px]">
                        <CheckCircle2 className="h-3.5 w-3.5" /> Verified
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 text-amber-400 text-[11px]">
                        <Clock className="h-3.5 w-3.5" /> Pending Challenge
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3.5 font-mono text-[11px] text-slate-300">
                    {new Date(req.deadline).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3.5 text-right">
                    <Link
                      href={`/dashboard/admin/privacy/requests/${req.id}`}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium border border-slate-700 transition-colors"
                    >
                      <Eye className="h-3 w-3 text-teal-400" />
                      Manage
                    </Link>
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

export default function PrivacyRequestsPage() {
  return (
    <Suspense fallback={<div className="p-8 text-slate-400">Loading Privacy Requests...</div>}>
      <PrivacyRequestsListContent />
    </Suspense>
  );
}
