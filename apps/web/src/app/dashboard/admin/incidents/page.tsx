'use client';

import React, { useEffect, useState } from 'react';
import {
  Flame,
  Plus,
  RefreshCw,
  Sliders,
} from 'lucide-react';
import { fetchApi } from '@/lib/api-client';
import { PlatformIncidentDTO, IncidentSeverity, IncidentStatus } from '@pixmatch/types';

export default function AdminIncidentsPage() {
  const [incidents, setIncidents] = useState<PlatformIncidentDTO[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDeclaring, setIsDeclaring] = useState(false);
  const [newIncident, setNewIncident] = useState({
    title: '',
    description: '',
    severity: IncidentSeverity.SEV2,
    affected_service: 'AI_INFERENCE_PIPELINE',
  });

  const loadIncidents = async () => {
    setIsLoading(true);
    try {
      const res = await fetchApi<{ total: number; incidents: PlatformIncidentDTO[] }>('/admin/incidents');
      if (res.success && res.data) {
        setIncidents(res.data.incidents || []);
      }
    } catch (err) {
      console.error('Failed to load incidents', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadIncidents();
  }, []);

  const handleDeclare = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await fetchApi('/admin/incidents', {
        method: 'POST',
        body: JSON.stringify(newIncident),
      });
      setIsDeclaring(false);
      setNewIncident({
        title: '',
        description: '',
        severity: IncidentSeverity.SEV2,
        affected_service: 'AI_INFERENCE_PIPELINE',
      });
      loadIncidents();
    } catch (err) {
      console.error('Failed to declare incident', err);
    }
  };

  const handleUpdateStatus = async (id: string, status: IncidentStatus) => {
    try {
      await fetchApi(`/admin/incidents/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({ status }),
      });
      loadIncidents();
    } catch (err) {
      console.error('Failed to update incident status', err);
    }
  };

  const getSeverityBadge = (sev: IncidentSeverity) => {
    switch (sev) {
      case IncidentSeverity.SEV1:
        return 'bg-red-500 text-white font-bold animate-pulse';
      case IncidentSeverity.SEV2:
        return 'bg-amber-500/20 text-amber-400 border-amber-500/30';
      case IncidentSeverity.SEV3:
        return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
      case IncidentSeverity.SEV4:
      default:
        return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2.5">
            <Flame className="h-6 w-6 text-red-400" /> Incident Command & Outage Management
          </h1>
          <p className="text-xs text-muted mt-1">
            Real-time SEV1–SEV4 triage, service outage mitigation timelines, and postmortem tracking.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => loadIncidents()}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-card-border/40 hover:bg-card-border/70 text-xs font-semibold text-white transition"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? 'animate-spin' : ''}`} /> Refresh
          </button>
          <button
            onClick={() => setIsDeclaring(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-red-500 to-red-600 hover:from-red-400 hover:to-red-500 text-white text-xs font-bold transition shadow-lg shadow-red-500/20"
          >
            <Plus className="h-4 w-4" /> Declare Incident
          </button>
        </div>
      </div>

      {/* Declare Incident Drawer */}
      {isDeclaring && (
        <div className="rounded-2xl border border-red-500/30 bg-[#0E1422] p-6 space-y-4 shadow-xl">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Sliders className="h-4 w-4 text-red-400" /> Declare New System Incident
            </h3>
            <button
              onClick={() => setIsDeclaring(false)}
              className="text-muted hover:text-white text-xs font-medium"
            >
              Cancel
            </button>
          </div>
          <form onSubmit={handleDeclare} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="text-xs font-medium text-muted block mb-1">Incident Title</label>
              <input
                type="text"
                required
                value={newIncident.title}
                onChange={(e) => setNewIncident({ ...newIncident, title: e.target.value })}
                className="w-full px-3 py-2 rounded-xl bg-[#070A0F] border border-card-border text-white text-xs focus:border-red-500 outline-none"
                placeholder="High Latency in Distributed Face Embeddings Worker Pool"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-muted block mb-1">Severity Level</label>
              <select
                value={newIncident.severity}
                onChange={(e) => setNewIncident({ ...newIncident, severity: e.target.value as IncidentSeverity })}
                className="w-full px-3 py-2 rounded-xl bg-[#070A0F] border border-card-border text-white text-xs focus:border-red-500 outline-none"
              >
                <option value={IncidentSeverity.SEV1}>SEV1 - Critical Outage</option>
                <option value={IncidentSeverity.SEV2}>SEV2 - Degraded Service</option>
                <option value={IncidentSeverity.SEV3}>SEV3 - Minor Performance Issue</option>
                <option value={IncidentSeverity.SEV4}>SEV4 - Low Impact / Cosmetic</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-muted block mb-1">Affected Service</label>
              <input
                type="text"
                required
                value={newIncident.affected_service}
                onChange={(e) => setNewIncident({ ...newIncident, affected_service: e.target.value })}
                className="w-full px-3 py-2 rounded-xl bg-[#070A0F] border border-card-border text-white text-xs font-mono focus:border-red-500 outline-none"
                placeholder="AI_INFERENCE"
              />
            </div>
            <div className="md:col-span-2">
              <label className="text-xs font-medium text-muted block mb-1">Description</label>
              <textarea
                required
                rows={3}
                value={newIncident.description}
                onChange={(e) => setNewIncident({ ...newIncident, description: e.target.value })}
                className="w-full px-3 py-2 rounded-xl bg-[#070A0F] border border-card-border text-white text-xs focus:border-red-500 outline-none"
                placeholder="Worker queue processing delay exceeded 120s threshold..."
              />
            </div>
            <div className="md:col-span-2 flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setIsDeclaring(false)}
                className="px-4 py-2 rounded-xl bg-card-border/40 text-xs font-semibold text-white hover:bg-card-border transition"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2 rounded-xl bg-red-500 hover:bg-red-400 text-white text-xs font-bold transition shadow-lg shadow-red-500/20"
              >
                Declare Outage
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Incidents List */}
      <div className="grid grid-cols-1 gap-4">
        {incidents.map((incident) => (
          <div
            key={incident.id}
            className="flex flex-col md:flex-row md:items-center justify-between p-5 rounded-2xl bg-[#0E1422] border border-card-border hover:border-card-border/80 transition gap-4"
          >
            <div className="space-y-1.5">
              <div className="flex items-center gap-2.5">
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded border uppercase tracking-wider ${getSeverityBadge(incident.severity)}`}>
                  {incident.severity}
                </span>
                <span className="text-sm font-semibold text-white">{incident.title}</span>
                <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-[#070A0F] text-muted border border-card-border">
                  {incident.affected_service}
                </span>
              </div>
              <p className="text-xs text-muted">{incident.description}</p>
              <div className="flex items-center gap-4 text-[11px] text-muted/80 pt-1">
                <span>Status: <strong className="text-white font-mono">{incident.status}</strong></span>
                <span>Started: {new Date(incident.started_at).toLocaleString()}</span>
                {incident.resolved_at && (
                  <span className="text-emerald-400">Resolved: {new Date(incident.resolved_at).toLocaleString()}</span>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2 self-end md:self-center">
              {incident.status !== IncidentStatus.RESOLVED && (
                <select
                  value={incident.status}
                  onChange={(e) => handleUpdateStatus(incident.id, e.target.value as IncidentStatus)}
                  className="px-3 py-1.5 rounded-xl bg-[#070A0F] border border-card-border text-white text-xs focus:border-red-500 outline-none"
                >
                  <option value={IncidentStatus.DETECTED}>DETECTED</option>
                  <option value={IncidentStatus.INVESTIGATING}>INVESTIGATING</option>
                  <option value={IncidentStatus.MITIGATING}>MITIGATING</option>
                  <option value={IncidentStatus.RESOLVED}>RESOLVED</option>
                  <option value={IncidentStatus.CLOSED}>CLOSED</option>
                </select>
              )}
            </div>
          </div>
        ))}

        {incidents.length === 0 && !isLoading && (
          <div className="p-12 text-center rounded-2xl bg-[#0E1422] border border-card-border space-y-3">
            <Flame className="h-8 w-8 text-muted mx-auto" />
            <p className="text-xs text-muted">No active incidents. System operational.</p>
          </div>
        )}
      </div>
    </div>
  );
}
