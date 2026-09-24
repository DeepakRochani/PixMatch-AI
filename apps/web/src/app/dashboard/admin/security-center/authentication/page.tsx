'use client';

import React, { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { Lock, ArrowLeft, ShieldAlert, Eye, RefreshCw } from 'lucide-react';
import { PlatformSecurityEventDTO } from '@pixmatch/types';

function AuthenticationSecurityContent() {
  const [events, setEvents] = useState<PlatformSecurityEventDTO[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  const fetchAuthEvents = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/admin/security-center/authentication');
      if (res.ok) {
        const d = await res.json();
        if (d.success) setEvents(d.data.events || []);
      }
    } catch (e) {
      console.error('Failed to load auth security events:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAuthEvents();
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-card-border/80 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <Link
              href="/dashboard/admin/security-center"
              className="p-1 rounded-lg bg-card-border/60 hover:bg-card-border text-muted hover:text-white transition"
            >
              <ArrowLeft className="h-4 w-4" />
            </Link>
            <h1 className="text-2xl font-bold tracking-tight text-white">Authentication & Session Security</h1>
          </div>
          <p className="text-xs text-muted mt-1">
            Monitoring administrator login failures, MFA/TOTP rejections, password reset spikes, and suspended session activity.
          </p>
        </div>

        <button
          onClick={fetchAuthEvents}
          className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-card-border/60 hover:bg-card-border text-xs font-semibold text-white transition border border-card-border"
        >
          <RefreshCw className="h-3.5 w-3.5" /> Refresh
        </button>
      </div>

      <div className="rounded-2xl bg-[#0B0F17] border border-card-border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#0E1422] border-b border-card-border/80 text-muted uppercase font-semibold text-[10px] tracking-wider">
              <tr>
                <th className="p-3 pl-5">Event Type</th>
                <th className="p-3">Severity</th>
                <th className="p-3">Reason Code</th>
                <th className="p-3">Occurrences</th>
                <th className="p-3">Actor / IP Hash</th>
                <th className="p-3">Last Seen</th>
                <th className="p-3 pr-5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-card-border/40 text-foreground">
              {loading ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-muted">
                    Loading authentication events...
                  </td>
                </tr>
              ) : events.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-muted">
                    No authentication security events recorded.
                  </td>
                </tr>
              ) : (
                events.map((ev) => (
                  <tr key={ev.id} className="hover:bg-card-border/20 transition">
                    <td className="p-3 pl-5 font-semibold text-white font-mono">{ev.event_type}</td>
                    <td className="p-3">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20">
                        {ev.severity}
                      </span>
                    </td>
                    <td className="p-3 font-mono text-[11px] text-zinc-300">{ev.reason_code}</td>
                    <td className="p-3 font-semibold text-white">{ev.occurrence_count}</td>
                    <td className="p-3 font-mono text-[11px] text-muted truncate max-w-xs">
                      {ev.admin_user_id || ev.user_id || ev.ip_hash || 'Anonymous'}
                    </td>
                    <td className="p-3 text-muted text-[11px]">
                      {new Date(ev.last_seen_at).toLocaleTimeString()}
                    </td>
                    <td className="p-3 pr-5 text-right">
                      <Link
                        href={`/dashboard/admin/security-center/events/${ev.id}`}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-card-border/60 hover:bg-card-border text-[11px] font-semibold text-white transition border border-card-border/60"
                      >
                        <Eye className="h-3 w-3" /> Inspect
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

export default function AuthenticationSecurityPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-muted text-xs">Loading Auth Security...</div>}>
      <AuthenticationSecurityContent />
    </Suspense>
  );
}
