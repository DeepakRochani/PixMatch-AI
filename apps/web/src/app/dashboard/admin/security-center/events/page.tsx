'use client';

import React, { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import {
  ShieldAlert,
  Search,
  Filter,
  Download,
  Flame,
  AlertTriangle,
  RefreshCw,
  Eye,
  ChevronLeft,
  ChevronRight,
  ArrowLeft,
} from 'lucide-react';
import {
  PlatformSecurityEventDTO,
  SecurityEventCategory,
  SecuritySeverity,
  SecurityEventStatus,
} from '@pixmatch/types';

function SecurityEventsContent() {
  const searchParams = useSearchParams();
  const [events, setEvents] = useState<PlatformSecurityEventDTO[]>([]);
  const [total, setTotal] = useState<number>(0);
  const [page, setPage] = useState<number>(1);
  const [limit] = useState<number>(20);
  const [loading, setLoading] = useState<boolean>(true);

  // Filters
  const [category, setCategory] = useState<string>(searchParams.get('category') || '');
  const [severity, setSeverity] = useState<string>(searchParams.get('severity') || '');
  const [status, setStatus] = useState<string>(searchParams.get('status') || '');
  const [search, setSearch] = useState<string>('');

  const fetchEvents = async () => {
    try {
      setLoading(true);
      const query = new URLSearchParams();
      if (category) query.set('category', category);
      if (severity) query.set('severity', severity);
      if (status) query.set('status', status);
      if (search) query.set('search', search);
      query.set('page', String(page));
      query.set('limit', String(limit));

      const res = await fetch(`/api/admin/security-center/events?${query.toString()}`);
      if (res.ok) {
        const d = await res.json();
        if (d.success) {
          setEvents(d.data.events || []);
          setTotal(d.data.total || 0);
        }
      }
    } catch (e) {
      console.error('Failed to load security events:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEvents();
  }, [page, category, severity, status]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchEvents();
  };

  const getSeverityBadge = (sev: SecuritySeverity | string) => {
    switch (sev) {
      case 'CRITICAL':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-red-500/20 text-red-400 border border-red-500/30">
            <Flame className="h-3 w-3" /> CRITICAL
          </span>
        );
      case 'HIGH':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-500/20 text-amber-400 border border-amber-500/30">
            <AlertTriangle className="h-3 w-3" /> HIGH
          </span>
        );
      case 'MEDIUM':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-yellow-500/20 text-yellow-400 border border-yellow-500/30">
            MEDIUM
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-blue-500/20 text-blue-400 border border-blue-500/30">
            LOW / INFO
          </span>
        );
    }
  };

  const getStatusBadge = (st: SecurityEventStatus | string) => {
    switch (st) {
      case 'OPEN':
        return <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-red-500/10 text-red-400 border border-red-500/20">OPEN</span>;
      case 'INVESTIGATING':
        return <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20">INVESTIGATING</span>;
      case 'RESOLVED':
        return <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">RESOLVED</span>;
      case 'FALSE_POSITIVE':
        return <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-gray-500/10 text-gray-400 border border-gray-500/20">FALSE POSITIVE</span>;
      default:
        return <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-zinc-700 text-zinc-300">{st}</span>;
    }
  };

  const totalPages = Math.ceil(total / limit) || 1;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-card-border/80 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <Link
              href="/dashboard/admin/security-center"
              className="p-1 rounded-lg bg-card-border/60 hover:bg-card-border text-muted hover:text-white transition"
            >
              <ArrowLeft className="h-4 w-4" />
            </Link>
            <h1 className="text-2xl font-bold tracking-tight text-white">Threat Detection Events</h1>
          </div>
          <p className="text-xs text-muted mt-1">
            Deterministic security event feed with audit-proof SHA-256 fingerprinting. Total records: {total}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <a
            href="/api/admin/security-center/export/csv"
            download
            className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-card-border/60 hover:bg-card-border text-xs font-semibold text-white transition border border-card-border"
          >
            <Download className="h-3.5 w-3.5" /> Export CSV
          </a>
          <a
            href="/api/admin/security-center/export/json"
            target="_blank"
            className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-card-border/60 hover:bg-card-border text-xs font-semibold text-white transition border border-card-border"
          >
            <Download className="h-3.5 w-3.5" /> Export JSON
          </a>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="p-4 rounded-xl bg-[#0B0F17] border border-card-border flex flex-col sm:flex-row gap-3 items-center justify-between">
        <form onSubmit={handleSearchSubmit} className="relative w-full sm:w-80">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted" />
          <input
            type="text"
            placeholder="Search event type, reason code..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 rounded-lg bg-[#0E1422] border border-card-border text-xs text-white placeholder-muted focus:outline-none focus:border-amber-500"
          />
        </form>

        <div className="flex items-center gap-2 w-full sm:w-auto overflow-x-auto">
          <select
            value={category}
            onChange={(e) => {
              setCategory(e.target.value);
              setPage(1);
            }}
            className="px-3 py-2 rounded-lg bg-[#0E1422] border border-card-border text-xs text-white focus:outline-none focus:border-amber-500"
          >
            <option value="">All Categories</option>
            {Object.values(SecurityEventCategory).map((cat) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </select>

          <select
            value={severity}
            onChange={(e) => {
              setSeverity(e.target.value);
              setPage(1);
            }}
            className="px-3 py-2 rounded-lg bg-[#0E1422] border border-card-border text-xs text-white focus:outline-none focus:border-amber-500"
          >
            <option value="">All Severities</option>
            {Object.values(SecuritySeverity).map((sev) => (
              <option key={sev} value={sev}>
                {sev}
              </option>
            ))}
          </select>

          <select
            value={status}
            onChange={(e) => {
              setStatus(e.target.value);
              setPage(1);
            }}
            className="px-3 py-2 rounded-lg bg-[#0E1422] border border-card-border text-xs text-white focus:outline-none focus:border-amber-500"
          >
            <option value="">All Statuses</option>
            {Object.values(SecurityEventStatus).map((st) => (
              <option key={st} value={st}>
                {st}
              </option>
            ))}
          </select>

          <button
            onClick={() => {
              setCategory('');
              setSeverity('');
              setStatus('');
              setSearch('');
              setPage(1);
            }}
            className="px-3 py-2 rounded-lg bg-card-border/60 hover:bg-card-border text-xs font-medium text-muted hover:text-white transition"
          >
            Reset
          </button>
        </div>
      </div>

      {/* Events Table */}
      <div className="rounded-2xl bg-[#0B0F17] border border-card-border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#0E1422] border-b border-card-border/80 text-muted uppercase font-semibold text-[10px] tracking-wider">
              <tr>
                <th className="p-3 pl-5">Event Type</th>
                <th className="p-3">Category</th>
                <th className="p-3">Severity</th>
                <th className="p-3">Reason Code</th>
                <th className="p-3">Occurrences</th>
                <th className="p-3">Service</th>
                <th className="p-3">Status</th>
                <th className="p-3">Last Seen</th>
                <th className="p-3 pr-5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-card-border/40 text-foreground">
              {loading ? (
                <tr>
                  <td colSpan={9} className="p-8 text-center text-muted">
                    Loading security event stream...
                  </td>
                </tr>
              ) : events.length === 0 ? (
                <tr>
                  <td colSpan={9} className="p-8 text-center text-muted">
                    No security events found matching current criteria.
                  </td>
                </tr>
              ) : (
                events.map((ev) => (
                  <tr key={ev.id} className="hover:bg-card-border/20 transition">
                    <td className="p-3 pl-5 font-semibold text-white font-mono">{ev.event_type}</td>
                    <td className="p-3 text-muted">{ev.category}</td>
                    <td className="p-3">{getSeverityBadge(ev.severity)}</td>
                    <td className="p-3 font-mono text-[11px] text-zinc-300">{ev.reason_code}</td>
                    <td className="p-3 font-semibold text-white">{ev.occurrence_count}</td>
                    <td className="p-3 text-muted font-mono">{ev.service}</td>
                    <td className="p-3">{getStatusBadge(ev.status)}</td>
                    <td className="p-3 text-muted text-[11px]">
                      {new Date(ev.last_seen_at).toLocaleString()}
                    </td>
                    <td className="p-3 pr-5 text-right">
                      <Link
                        href={`/dashboard/admin/security-center/events/${ev.id}`}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-card-border/60 hover:bg-card-border text-[11px] font-semibold text-white transition border border-card-border/60"
                      >
                        <Eye className="h-3 w-3" /> Details
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="p-4 border-t border-card-border/80 flex items-center justify-between text-xs text-muted">
          <p>
            Showing {events.length > 0 ? (page - 1) * limit + 1 : 0} to{' '}
            {Math.min(page * limit, total)} of {total} events
          </p>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="p-1.5 rounded-lg bg-card-border/60 hover:bg-card-border disabled:opacity-40 disabled:cursor-not-allowed text-white transition"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span className="font-semibold text-white px-2">
              Page {page} of {totalPages}
            </span>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
              className="p-1.5 rounded-lg bg-card-border/60 hover:bg-card-border disabled:opacity-40 disabled:cursor-not-allowed text-white transition"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function SecurityEventsPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-muted text-xs">Loading Security Events...</div>}>
      <SecurityEventsContent />
    </Suspense>
  );
}
