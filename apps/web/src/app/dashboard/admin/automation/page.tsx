'use client';

import React, { useEffect, useState } from 'react';
import {
  Zap,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Clock,
  ShieldAlert,
  BarChart3,
  Layers,
  Activity,
  ArrowUpRight,
} from 'lucide-react';
import { fetchApi } from '@/lib/api-client';
import { AutomationTelemetryDTO } from '@pixmatch/types';

export default function AdminAutomationTelemetryPage() {
  const [telemetry, setTelemetry] = useState<AutomationTelemetryDTO | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const loadTelemetry = async () => {
    setIsLoading(true);
    try {
      const res = await fetchApi<AutomationTelemetryDTO>('/automation/telemetry');
      if (res.success && res.data) {
        setTelemetry(res.data);
      }
    } catch (e) {
      console.error('Failed to load automation telemetry:', e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadTelemetry();
  }, []);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-card-border/80 pb-5">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2.5">
            <Zap className="h-6 w-6 text-primary" /> Automation & Orchestration Telemetry
          </h1>
          <p className="text-xs text-muted mt-1">
            Platform-wide workflow pipeline executions, DAG step throughput, approval latency, and recovery health.
          </p>
        </div>

        <button
          onClick={loadTelemetry}
          disabled={isLoading}
          className="p-2 rounded-xl bg-[#131B2A] border border-card-border/80 text-muted hover:text-white transition"
        >
          <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin text-primary' : ''}`} />
        </button>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="p-5 rounded-2xl bg-[#0B0F17] border border-card-border/80">
          <div className="text-xs font-semibold text-muted uppercase tracking-wider">Total Workflows</div>
          <div className="text-2xl font-bold text-white mt-1.5">{telemetry?.total_workflows || 0}</div>
          <div className="text-xs text-emerald-400 mt-1">{telemetry?.active_workflows || 0} active & enabled</div>
        </div>

        <div className="p-5 rounded-2xl bg-[#0B0F17] border border-card-border/80">
          <div className="text-xs font-semibold text-muted uppercase tracking-wider">Runs Executed Today</div>
          <div className="text-2xl font-bold text-primary mt-1.5">{telemetry?.runs_today || 0}</div>
          <div className="text-xs text-muted mt-1">{telemetry?.total_runs || 0} lifetime runs</div>
        </div>

        <div className="p-5 rounded-2xl bg-[#0B0F17] border border-card-border/80">
          <div className="text-xs font-semibold text-muted uppercase tracking-wider">Global Success Rate</div>
          <div className="text-2xl font-bold text-emerald-400 mt-1.5">{telemetry?.success_rate || 100}%</div>
          <div className="text-xs text-rose-400 mt-1">{telemetry?.failure_rate || 0}% failure rate</div>
        </div>

        <div className="p-5 rounded-2xl bg-[#0B0F17] border border-card-border/80">
          <div className="text-xs font-semibold text-muted uppercase tracking-wider">Approval Backlog</div>
          <div className="text-2xl font-bold text-indigo-400 mt-1.5">{telemetry?.pending_approvals_count || 0}</div>
          <div className="text-xs text-muted mt-1">avg wait: {Math.round((telemetry?.avg_approval_wait_time_ms || 0) / 1000)}s</div>
        </div>
      </div>

      {/* Execution Distribution & Performance */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Status Distribution */}
        <div className="p-6 rounded-2xl bg-[#0B0F17] border border-card-border/80 space-y-4">
          <h3 className="font-semibold text-white text-base flex items-center gap-2">
            <Activity className="h-4 w-4 text-primary" /> Execution Status Distribution
          </h3>

          <div className="space-y-3 pt-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-zinc-300 flex items-center gap-2">
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" /> Completed
              </span>
              <strong className="text-white">{telemetry?.runs_by_status?.completed || 0}</strong>
            </div>

            <div className="flex items-center justify-between text-xs">
              <span className="text-zinc-300 flex items-center gap-2">
                <Clock className="h-3.5 w-3.5 text-amber-300" /> Running / Queued
              </span>
              <strong className="text-white">{(telemetry?.runs_by_status?.running || 0) + (telemetry?.runs_by_status?.queued || 0)}</strong>
            </div>

            <div className="flex items-center justify-between text-xs">
              <span className="text-zinc-300 flex items-center gap-2">
                <ShieldAlert className="h-3.5 w-3.5 text-indigo-400" /> Waiting Approval
              </span>
              <strong className="text-white">{telemetry?.runs_by_status?.waiting_approval || 0}</strong>
            </div>

            <div className="flex items-center justify-between text-xs">
              <span className="text-zinc-300 flex items-center gap-2">
                <XCircle className="h-3.5 w-3.5 text-rose-400" /> Failed
              </span>
              <strong className="text-white">{telemetry?.runs_by_status?.failed || 0}</strong>
            </div>
          </div>
        </div>

        {/* Most Used Templates */}
        <div className="p-6 rounded-2xl bg-[#0B0F17] border border-card-border/80 space-y-4">
          <h3 className="font-semibold text-white text-base flex items-center gap-2">
            <Layers className="h-4 w-4 text-amber-400" /> Most Used System Templates
          </h3>

          <div className="space-y-3 pt-2">
            {telemetry?.most_used_templates?.map((tmpl) => (
              <div key={tmpl.template_id} className="flex items-center justify-between p-3 rounded-xl bg-card border border-card-border/60 text-xs">
                <div>
                  <div className="font-semibold text-white">{tmpl.name}</div>
                  <div className="text-muted text-[11px]">{tmpl.template_id}</div>
                </div>
                <span className="px-2.5 py-1 rounded-full bg-primary/20 text-primary font-bold">
                  {tmpl.usage_count} uses
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
