'use client';

import React, { useEffect, useState } from 'react';
import {
  AlertTriangle,
  RefreshCw,
  CheckCircle,
  ShieldAlert,
  CheckCheck,
} from 'lucide-react';
import { fetchApi } from '@/lib/api-client';
import { PlatformAlertDTO, PlatformAlertSeverity, PlatformAlertStatus } from '@pixmatch/types';

export default function AdminAlertsPage() {
  const [alerts, setAlerts] = useState<PlatformAlertDTO[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>('OPEN');
  const [severityFilter, setSeverityFilter] = useState<string>('ALL');

  const loadAlerts = async () => {
    setIsLoading(true);
    try {
      const query = statusFilter === 'ALL' ? '' : `?status=${statusFilter}`;
      const res = await fetchApi<PlatformAlertDTO[]>(`/admin/alerts${query}`);
      if (res.success && res.data) {
        setAlerts(res.data);
      }
    } catch (err) {
      console.error('Failed to load platform alerts', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadAlerts();
  }, [statusFilter]);

  const handleAcknowledge = async (alertId: string) => {
    try {
      await fetchApi(`/admin/alerts/${alertId}/acknowledge`, { method: 'POST' });
      loadAlerts();
    } catch (err) {
      console.error('Failed to acknowledge alert', err);
    }
  };

  const handleResolve = async (alertId: string) => {
    try {
      await fetchApi(`/admin/alerts/${alertId}/resolve`, { method: 'POST' });
      loadAlerts();
    } catch (err) {
      console.error('Failed to resolve alert', err);
    }
  };

  const filteredAlerts = alerts.filter((a) =>
    severityFilter === 'ALL' ? true : a.severity === severityFilter
  );

  const getSeverityBadge = (severity: PlatformAlertSeverity) => {
    switch (severity) {
      case PlatformAlertSeverity.CRITICAL:
        return 'bg-red-500/20 text-red-400 border-red-500/30';
      case PlatformAlertSeverity.WARNING:
        return 'bg-amber-500/20 text-amber-400 border-amber-500/30';
      case PlatformAlertSeverity.INFO:
      default:
        return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2.5">
            <AlertTriangle className="h-6 w-6 text-amber-400" /> Platform Alerts & Watchdogs
          </h1>
          <p className="text-xs text-muted mt-1">
            Real-time threshold triggers, GPU queue pressure alerts, error spikes, and security anomaly monitors.
          </p>
        </div>
        <button
          onClick={() => loadAlerts()}
          className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-card-border/40 hover:bg-card-border/70 text-xs font-semibold text-white transition self-start"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? 'animate-spin' : ''}`} /> Refresh
        </button>
      </div>

      {/* Filter Toolbar */}
      <div className="flex flex-wrap gap-4 items-center justify-between bg-[#0E1422] p-4 rounded-2xl border border-card-border">
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted">Status:</span>
          {['OPEN', 'ACKNOWLEDGED', 'RESOLVED', 'ALL'].map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
                statusFilter === st
                  ? 'bg-amber-500 text-black shadow-md shadow-amber-500/20'
                  : 'bg-[#070A0F] text-muted hover:text-white border border-card-border'
              }`}
            >
              {st}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs text-muted">Severity:</span>
          <select
            value={severityFilter}
            onChange={(e) => setSeverityFilter(e.target.value)}
            className="px-3 py-1.5 rounded-xl bg-[#070A0F] border border-card-border text-white text-xs focus:border-amber-500 outline-none"
          >
            <option value="ALL">All Severities</option>
            <option value={PlatformAlertSeverity.CRITICAL}>CRITICAL</option>
            <option value={PlatformAlertSeverity.WARNING}>WARNING</option>
            <option value={PlatformAlertSeverity.INFO}>INFO</option>
          </select>
        </div>
      </div>

      {/* Alerts Grid */}
      <div className="space-y-3">
        {filteredAlerts.map((alert) => (
          <div
            key={alert.id}
            className="p-5 rounded-2xl bg-[#0E1422] border border-card-border hover:border-card-border/80 transition flex flex-col md:flex-row md:items-center justify-between gap-4"
          >
            <div className="space-y-1.5">
              <div className="flex items-center gap-2.5">
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded border uppercase tracking-wider ${getSeverityBadge(alert.severity)}`}>
                  {alert.severity}
                </span>
                <span className="text-sm font-bold text-white">{alert.title}</span>
                <span className="text-xs font-mono text-muted">({alert.type})</span>
              </div>
              <p className="text-xs text-muted">{alert.message}</p>
              <div className="flex items-center gap-4 text-[11px] text-muted/70 pt-1">
                <span>Triggered: {new Date(alert.created_at).toLocaleString()}</span>
                {alert.studio_id && <span>Target Studio: <strong className="text-white font-mono">{alert.studio_id}</strong></span>}
                {alert.resolved_at && (
                  <span className="text-emerald-400">Resolved: {new Date(alert.resolved_at).toLocaleString()}</span>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2.5 self-end md:self-center">
              {alert.status === PlatformAlertStatus.OPEN && (
                <button
                  onClick={() => handleAcknowledge(alert.id)}
                  className="px-3 py-1.5 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-300 text-xs font-bold hover:bg-amber-500/25 transition"
                >
                  Acknowledge
                </button>
              )}
              {alert.status !== PlatformAlertStatus.RESOLVED && (
                <button
                  onClick={() => handleResolve(alert.id)}
                  className="px-3.5 py-1.5 rounded-xl bg-emerald-500 text-black text-xs font-bold hover:bg-emerald-400 transition flex items-center gap-1.5 shadow-md shadow-emerald-500/20"
                >
                  <CheckCheck className="h-3.5 w-3.5" /> Resolve
                </button>
              )}
              {alert.status === PlatformAlertStatus.RESOLVED && (
                <span className="flex items-center gap-1 text-xs font-semibold text-emerald-400 px-3 py-1.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
                  <CheckCircle className="h-3.5 w-3.5" /> Resolved
                </span>
              )}
            </div>
          </div>
        ))}

        {filteredAlerts.length === 0 && !isLoading && (
          <div className="p-12 text-center rounded-2xl bg-[#0E1422] border border-card-border space-y-2">
            <CheckCircle className="h-8 w-8 text-emerald-400 mx-auto" />
            <h3 className="text-sm font-bold text-white">All Watchdogs Clear</h3>
            <p className="text-xs text-muted">No active platform alerts matching current criteria.</p>
          </div>
        )}
      </div>
    </div>
  );
}
