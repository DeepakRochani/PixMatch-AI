'use client';

import React, { useEffect, useState } from 'react';
import {
  Calendar,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Clock,
  ShieldCheck,
  Activity,
  Layers,
  Users,
  Link,
  CalendarCheck2,
  RotateCw,
} from 'lucide-react';
import { fetchApi } from '@/lib/api-client';

export default function AdminCalendarTelemetryPage() {
  const [summary, setSummary] = useState<any>(null);
  const [connections, setConnections] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [sumRes, connRes] = await Promise.all([
        fetchApi<any>('/calendar/summary'),
        fetchApi<any[]>('/calendar/connections'),
      ]);
      if (sumRes.success && sumRes.data) {
        setSummary(sumRes.data);
      }
      if (connRes.success && connRes.data) {
        setConnections(connRes.data);
      }
    } catch (e) {
      console.error('Failed to load calendar telemetry:', e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-card-border/80 pb-5">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2.5">
            <Calendar className="h-6 w-6 text-primary" /> Calendar & Scheduling Telemetry
          </h1>
          <p className="text-xs text-muted mt-1">
            Studio booking volume, external calendar sync health, provider integration status, and conflict diagnostics.
          </p>
        </div>

        <button
          onClick={loadData}
          disabled={isLoading}
          className="p-2 rounded-xl bg-[#131B2A] border border-card-border/80 text-muted hover:text-white transition"
        >
          <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin text-primary' : ''}`} />
        </button>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="p-5 rounded-2xl bg-[#0B0F17] border border-card-border/80">
          <div className="text-xs font-semibold text-muted uppercase tracking-wider">Total Scheduled Events</div>
          <div className="text-2xl font-bold text-white mt-1.5">{summary?.total_events || 0}</div>
          <div className="text-xs text-emerald-400 mt-1">{summary?.upcoming_events || 0} upcoming sessions</div>
        </div>

        <div className="p-5 rounded-2xl bg-[#0B0F17] border border-card-border/80">
          <div className="text-xs font-semibold text-muted uppercase tracking-wider">Completed Shoots</div>
          <div className="text-2xl font-bold text-primary mt-1.5">{summary?.completed_events || 0}</div>
          <div className="text-xs text-muted mt-1">{summary?.cancelled_events || 0} cancelled</div>
        </div>

        <div className="p-5 rounded-2xl bg-[#0B0F17] border border-card-border/80">
          <div className="text-xs font-semibold text-muted uppercase tracking-wider">Active Resources</div>
          <div className="text-2xl font-bold text-indigo-400 mt-1.5">{summary?.active_resources || 0}</div>
          <div className="text-xs text-muted mt-1">photographers, rooms & gear</div>
        </div>

        <div className="p-5 rounded-2xl bg-[#0B0F17] border border-card-border/80">
          <div className="text-xs font-semibold text-muted uppercase tracking-wider">Pending Bookings</div>
          <div className="text-2xl font-bold text-amber-400 mt-1.5">{summary?.pending_requests || 0}</div>
          <div className="text-xs text-muted mt-1">awaiting confirmation</div>
        </div>
      </div>

      {/* Sync Health & Connections */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Connected Calendar Providers */}
        <div className="p-6 rounded-2xl bg-[#0B0F17] border border-card-border/80 space-y-4">
          <h3 className="font-semibold text-white text-base flex items-center gap-2">
            <RotateCw className="h-4 w-4 text-primary" /> External Calendar Sync Status
          </h3>

          {connections && connections.length > 0 ? (
            <div className="divide-y divide-card-border/40">
              {connections.map((c) => (
                <div key={c.id} className="py-3.5 flex items-center justify-between">
                  <div>
                    <div className="text-sm font-medium text-white flex items-center gap-2">
                      <span className="capitalize">{c.provider.toLowerCase()} Calendar</span>
                      <span
                        className={`text-[10px] font-mono px-2 py-0.5 rounded-md border ${
                          c.status === 'CONNECTED'
                            ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                            : 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                        }`}
                      >
                        {c.status}
                      </span>
                    </div>
                    <div className="text-xs text-muted mt-0.5">
                      Calendar: {c.calendar_name || c.calendar_id || 'Primary'} • Direction: {c.sync_direction}
                    </div>
                  </div>

                  <div className="text-right text-xs text-muted">
                    <div>Last synced:</div>
                    <div className="font-mono text-white/80">
                      {c.last_synced_at ? new Date(c.last_synced_at).toLocaleTimeString() : 'Never'}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-8 text-center text-xs text-muted">
              No external calendar connections configured for this studio tenant.
            </div>
          )}
        </div>

        {/* Security & Health Invariants */}
        <div className="p-6 rounded-2xl bg-[#0B0F17] border border-card-border/80 space-y-4">
          <h3 className="font-semibold text-white text-base flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-emerald-400" /> Scheduling Engine Invariants
          </h3>

          <div className="space-y-3 pt-1">
            <div className="p-3.5 rounded-xl bg-[#131B2A]/50 border border-card-border/60 flex items-start gap-3 text-xs">
              <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" />
              <div>
                <span className="font-semibold text-white">Revenue Separation Guard</span>
                <p className="text-muted mt-0.5">
                  Booking requests and session types do NOT recognize financial revenue until recorded via Phase 18 payment transactions.
                </p>
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-[#131B2A]/50 border border-card-border/60 flex items-start gap-3 text-xs">
              <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" />
              <div>
                <span className="font-semibold text-white">Cryptographic Public Tokens</span>
                <p className="text-muted mt-0.5">
                  Public booking links and iCal feeds are indexed exclusively via SHA-256 hashes of 32-byte cryptographic random tokens.
                </p>
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-[#131B2A]/50 border border-card-border/60 flex items-start gap-3 text-xs">
              <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" />
              <div>
                <span className="font-semibold text-white">Multi-Tenant Resource Isolation</span>
                <p className="text-muted mt-0.5">
                  All conflict queries and slot generations enforce explicit studio tenant boundaries with indexed timezone handling.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
