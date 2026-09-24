'use client';

import React, { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import {
  GitPullRequest,
  Search,
  Filter,
  Plus,
  ArrowUpRight,
  ShieldCheck,
  AlertTriangle,
  RefreshCw,
  CheckCircle2,
  XCircle,
  Clock,
  ChevronRight,
  UserCheck,
} from 'lucide-react';
import { PlatformChangeRequestDTO, ChangeRiskLevel, ChangeRequestStatus } from '@pixmatch/types';

function ChangeRequestQueueContent() {
  const [requests, setRequests] = useState<PlatformChangeRequestDTO[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [riskFilter, setRiskFilter] = useState<string>('ALL');
  const [search, setSearch] = useState<string>('');

  const fetchRequests = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/admin/releases/changes');
      if (res.ok) {
        const d = await res.json();
        if (d.success) setRequests(d.data);
      }
    } catch (e) {
      console.error('Failed to load change requests:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
  }, []);

  const filteredRequests = requests.filter((r) => {
    const titleStr = r.title || '';
    const reasonStr = r.reason || r.description || '';
    const keyStr = r.targetKey || r.target_resource_key || '';
    const matchQuery =
      titleStr.toLowerCase().includes(search.toLowerCase()) ||
      reasonStr.toLowerCase().includes(search.toLowerCase()) ||
      keyStr.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === 'ALL' || r.status === statusFilter;
    const matchRisk = riskFilter === 'ALL' || (r.riskLevel || r.risk_level) === riskFilter;
    return matchQuery && matchStatus && matchRisk;
  });

  return (
    <div className="p-6 md:p-8 space-y-6 bg-[#0B0F17] min-h-screen text-slate-100">
      {/* Header */}
      <div className="space-y-3 border-b border-card-border/80 pb-6">
        <div className="flex items-center gap-2 text-xs text-slate-400">
          <Link href="/dashboard/admin/releases" className="hover:text-amber-400 transition">
            Releases & Config
          </Link>
          <span>/</span>
          <span className="text-white font-medium">Change Requests</span>
        </div>

        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-white flex items-center gap-2.5">
              <GitPullRequest className="h-7 w-7 text-purple-400" />
              Change Request & Approvals Queue
            </h1>
            <p className="text-slate-400 text-sm mt-1">
              Governed pipeline enforcing Separation of Duties, Two-Person Approval for critical risk, and automated execution.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={fetchRequests}
              className="flex items-center gap-2 px-3 py-2 rounded-lg bg-card-border/30 hover:bg-card-border/60 border border-card-border text-xs font-semibold text-slate-200 transition"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
              <span>Refresh</span>
            </button>
          </div>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="flex flex-col md:flex-row gap-3 items-center justify-between">
        <div className="relative w-full md:w-80">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
          <input
            type="text"
            placeholder="Search change title, key, reason..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-[#0F1623] border border-card-border/70 rounded-lg text-xs text-white placeholder-slate-500 focus:outline-none focus:border-purple-500"
          />
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto overflow-x-auto">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 bg-[#0F1623] border border-card-border/70 rounded-lg text-xs text-slate-300 focus:outline-none focus:border-purple-500"
          >
            <option value="ALL">All Statuses</option>
            <option value={ChangeRequestStatus.PENDING_APPROVAL}>Pending Approval</option>
            <option value={ChangeRequestStatus.APPROVED}>Approved</option>
            <option value={ChangeRequestStatus.EXECUTING}>Executing</option>
            <option value={ChangeRequestStatus.COMPLETED}>Completed</option>
            <option value={ChangeRequestStatus.FAILED}>Failed</option>
            <option value={ChangeRequestStatus.CANCELLED}>Cancelled</option>
          </select>

          <select
            value={riskFilter}
            onChange={(e) => setRiskFilter(e.target.value)}
            className="px-3 py-2 bg-[#0F1623] border border-card-border/70 rounded-lg text-xs text-slate-300 focus:outline-none focus:border-purple-500"
          >
            <option value="ALL">All Risk Levels</option>
            <option value="LOW">Low</option>
            <option value="MEDIUM">Medium</option>
            <option value="HIGH">High</option>
            <option value="CRITICAL">Critical</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="rounded-xl border border-card-border/80 bg-[#0F1623] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#0B0F17] border-b border-card-border/80 text-slate-400 font-semibold uppercase tracking-wider">
              <tr>
                <th className="p-4">Title & Target</th>
                <th className="p-4">Type</th>
                <th className="p-4">Risk Level</th>
                <th className="p-4">Status</th>
                <th className="p-4">Environment</th>
                <th className="p-4">Approvals</th>
                <th className="p-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-card-border/40 text-slate-300">
              {filteredRequests.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-slate-500">
                    {loading ? 'Loading change requests...' : 'No change requests found matching criteria.'}
                  </td>
                </tr>
              ) : (
                filteredRequests.map((req) => (
                  <tr key={req.id} className="hover:bg-[#131C2D] transition">
                    <td className="p-4 font-semibold text-white">
                      <div>
                        <span>{req.title}</span>
                        <p className="text-[11px] font-mono text-slate-400 font-normal mt-0.5">{req.targetKey}</p>
                      </div>
                    </td>
                    <td className="p-4 font-mono text-[11px] text-slate-300">{req.type}</td>
                    <td className="p-4">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          req.riskLevel === 'CRITICAL'
                            ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                            : req.riskLevel === 'HIGH'
                            ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                            : 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                        }`}
                      >
                        {req.riskLevel}
                      </span>
                    </td>
                    <td className="p-4">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          req.status === ChangeRequestStatus.PENDING_APPROVAL
                            ? 'bg-purple-500/15 text-purple-400 border border-purple-500/30'
                            : req.status === ChangeRequestStatus.APPROVED
                            ? 'bg-blue-500/15 text-blue-400 border border-blue-500/30'
                            : req.status === ChangeRequestStatus.COMPLETED
                            ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                            : req.status === ChangeRequestStatus.EXECUTING
                            ? 'bg-amber-500/15 text-amber-400 border border-amber-500/30'
                            : 'bg-slate-700/30 text-slate-400 border border-slate-600'
                        }`}
                      >
                        {req.status}
                      </span>
                    </td>
                    <td className="p-4 font-mono text-slate-300">{req.environment}</td>
                    <td className="p-4">
                      <span className="font-mono text-xs">
                        {req.approvals?.length ?? 0} / {req.riskLevel === 'CRITICAL' ? '2 (Two-Person)' : '1'}
                      </span>
                    </td>
                    <td className="p-4 text-right">
                      <Link
                        href={`/dashboard/admin/releases/changes/${req.id}`}
                        className="inline-flex items-center gap-1 text-purple-400 hover:text-purple-300 font-semibold"
                      >
                        <span>Review & Approve</span>
                        <ChevronRight className="h-3.5 w-3.5" />
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export default function ChangeRequestsPage() {
  return (
    <Suspense fallback={<div className="p-8 text-slate-400">Loading Change Requests...</div>}>
      <ChangeRequestQueueContent />
    </Suspense>
  );
}
