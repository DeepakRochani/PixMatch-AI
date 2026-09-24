'use client';

import React, { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import {
  AlertTriangle,
  RefreshCw,
  Search,
  CheckCircle2,
  Clock,
  ShieldAlert,
  ChevronRight,
  Eye,
  Sliders,
} from 'lucide-react';
import { ConfigurationDriftEventDTO, DriftStatus } from '@pixmatch/types';

function DriftMonitorContent() {
  const [events, setEvents] = useState<ConfigurationDriftEventDTO[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [scanning, setScanning] = useState<boolean>(false);
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  const fetchDrift = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/admin/releases/drift');
      if (res.ok) {
        const d = await res.json();
        if (d.success) setEvents(d.data);
      }
    } catch (e) {
      console.error('Failed to load drift events:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDrift();
  }, []);

  const handleScan = async () => {
    try {
      setScanning(true);
      const res = await fetch('/api/admin/releases/drift/scan', { method: 'POST' });
      if (res.ok) {
        await fetchDrift();
        alert('Environment drift scan completed.');
      }
    } catch (e) {
      console.error('Scan error:', e);
    } finally {
      setScanning(false);
    }
  };

  const handleAcknowledge = async (id: string) => {
    try {
      const res = await fetch(`/api/admin/releases/drift/${id}/acknowledge`, { method: 'POST' });
      if (res.ok) {
        await fetchDrift();
      }
    } catch (e) {
      console.error('Acknowledge error:', e);
    }
  };

  const filteredEvents = events.filter((ev) => {
    if (statusFilter === 'ALL') return true;
    return ev.status === statusFilter;
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
          <span className="text-white font-medium">Drift Monitor</span>
        </div>

        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-white flex items-center gap-2.5">
              <AlertTriangle className="h-7 w-7 text-amber-400" />
              Configuration Drift & Integrity Monitor
            </h1>
            <p className="text-slate-400 text-sm mt-1">
              Continuous detection of out-of-band configuration changes and environment parameter deviations.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handleScan}
              disabled={scanning}
              className="flex items-center gap-2 px-3.5 py-2 rounded-lg bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs transition shadow-md shadow-amber-500/20 disabled:opacity-50"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${scanning ? 'animate-spin' : ''}`} />
              <span>{scanning ? 'Scanning Matrix...' : 'Trigger Drift Scan'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 bg-[#0F1623] border border-card-border/70 rounded-lg text-xs text-slate-300 focus:outline-none focus:border-amber-500"
          >
            <option value="ALL">All Drift Statuses</option>
            <option value="DETECTED">Detected (Unacknowledged)</option>
            <option value="ACKNOWLEDGED">Acknowledged</option>
            <option value="RESOLVED">Resolved / Synced</option>
          </select>
        </div>
      </div>

      {/* Events Table */}
      <div className="rounded-xl border border-card-border/80 bg-[#0F1623] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#0B0F17] border-b border-card-border/80 text-slate-400 font-semibold uppercase tracking-wider">
              <tr>
                <th className="p-4">Key / Parameter</th>
                <th className="p-4">Environment</th>
                <th className="p-4">Expected vs Actual</th>
                <th className="p-4">Drift Status</th>
                <th className="p-4">Detected At</th>
                <th className="p-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-card-border/40 text-slate-300">
              {filteredEvents.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-slate-500">
                    {loading ? 'Loading drift events...' : 'No configuration drift events detected.'}
                  </td>
                </tr>
              ) : (
                filteredEvents.map((ev) => (
                  <tr key={ev.id} className="hover:bg-[#131C2D] transition">
                    <td className="p-4 font-mono font-semibold text-white">{ev.key}</td>
                    <td className="p-4 font-mono text-amber-400">{ev.environment}</td>
                    <td className="p-4 font-mono text-[11px]">
                      <span className="text-slate-400">Exp: {JSON.stringify(ev.expectedValue ?? ev.expected_value)}</span>
                      <span className="text-red-400 block font-bold">Act: {JSON.stringify(ev.actualValue ?? ev.actual_value)}</span>
                    </td>
                    <td className="p-4">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          ev.status === 'DETECTED'
                            ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                            : ev.status === 'ACKNOWLEDGED'
                            ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                            : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                        }`}
                      >
                        {ev.status}
                      </span>
                    </td>
                    <td className="p-4 text-slate-400 text-[11px]">
                      {new Date(ev.detectedAt || ev.detected_at || Date.now()).toLocaleString()}
                    </td>
                    <td className="p-4 text-right">
                      {ev.status === 'DETECTED' && (
                        <button
                          onClick={() => handleAcknowledge(ev.id)}
                          className="px-2.5 py-1 bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/30 font-semibold rounded text-[11px] transition"
                        >
                          Acknowledge
                        </button>
                      )}
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

export default function DriftMonitorPage() {
  return (
    <Suspense fallback={<div className="p-8 text-slate-400">Loading Drift Monitor...</div>}>
      <DriftMonitorContent />
    </Suspense>
  );
}
