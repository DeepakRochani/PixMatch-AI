'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Zap,
  Plus,
  Play,
  CheckCircle2,
  Clock,
  AlertTriangle,
  XCircle,
  Copy,
  Trash2,
  Edit,
  ArrowRight,
  ShieldAlert,
  Sparkles,
  Layers,
  ChevronRight,
  RotateCcw,
  Pause,
  Check,
  X,
  ExternalLink,
} from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import {
  AutomationWorkflowDTO,
  AutomationTemplateDTO,
  AutomationRunDTO,
  AutomationApprovalDTO,
  AutomationTelemetryDTO,
  AutomationApprovalStatus,
  AutomationRunStatus,
} from '@pixmatch/types';

export default function AutomationCenterPage() {
  const { user, studio } = useAuth();

  const [activeTab, setActiveTab] = useState<'workflows' | 'templates' | 'running' | 'approvals' | 'history'>('workflows');
  const [workflows, setWorkflows] = useState<AutomationWorkflowDTO[]>([]);
  const [templates, setTemplates] = useState<AutomationTemplateDTO[]>([]);
  const [runs, setRuns] = useState<AutomationRunDTO[]>([]);
  const [approvals, setApprovals] = useState<AutomationApprovalDTO[]>([]);
  const [telemetry, setTelemetry] = useState<AutomationTelemetryDTO | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [actionSuccessMsg, setActionSuccessMsg] = useState<string | null>(null);

  const fetchData = async () => {
    try {
      setIsLoading(true);
      const [wfRes, tmplRes, runsRes, appRes, telRes] = await Promise.all([
        fetch('/api/v1/automation/workflows'),
        fetch('/api/v1/automation/templates'),
        fetch('/api/v1/automation/runs'),
        fetch('/api/v1/automation/approvals'),
        fetch('/api/v1/automation/telemetry'),
      ]);

      if (wfRes.ok) setWorkflows(await wfRes.json());
      if (tmplRes.ok) setTemplates(await tmplRes.json());
      if (runsRes.ok) setRuns(await runsRes.json());
      if (appRes.ok) setApprovals(await appRes.json());
      if (telRes.ok) setTelemetry(await telRes.json());
    } catch (e) {
      console.error('Failed to load automation center data:', e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleRunWorkflow = async (workflowId: string) => {
    try {
      const res = await fetch(`/api/v1/automation/workflows/${workflowId}/run`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      if (res.ok) {
        showSuccess('Workflow triggered successfully');
        fetchData();
      }
    } catch (e) {
      console.error('Failed to run workflow:', e);
    }
  };

  const handleToggleWorkflow = async (workflowId: string, currentEnabled: boolean) => {
    try {
      const action = currentEnabled ? 'disable' : 'enable';
      const res = await fetch(`/api/v1/automation/workflows/${workflowId}/${action}`, { method: 'POST' });
      if (res.ok) {
        showSuccess(`Workflow ${action}d`);
        fetchData();
      }
    } catch (e) {
      console.error('Failed to toggle workflow:', e);
    }
  };

  const handleDuplicateWorkflow = async (workflowId: string) => {
    try {
      const res = await fetch(`/api/v1/automation/workflows/${workflowId}/duplicate`, { method: 'POST' });
      if (res.ok) {
        showSuccess('Workflow duplicated');
        fetchData();
      }
    } catch (e) {
      console.error('Failed to duplicate workflow:', e);
    }
  };

  const handleDeleteWorkflow = async (workflowId: string) => {
    if (!confirm('Are you sure you want to delete this workflow? (Execution logs will be preserved)')) return;
    try {
      const res = await fetch(`/api/v1/automation/workflows/${workflowId}`, { method: 'DELETE' });
      if (res.ok) {
        showSuccess('Workflow deleted');
        fetchData();
      }
    } catch (e) {
      console.error('Failed to delete workflow:', e);
    }
  };

  const handleUseTemplate = async (templateId: string) => {
    try {
      const res = await fetch(`/api/v1/automation/templates/${templateId}/use`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      if (res.ok) {
        showSuccess('Workflow created from template');
        setActiveTab('workflows');
        fetchData();
      }
    } catch (e) {
      console.error('Failed to instantiate template:', e);
    }
  };

  const handleApprove = async (approvalId: string) => {
    try {
      const res = await fetch(`/api/v1/automation/approvals/${approvalId}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      if (res.ok) {
        showSuccess('Action approved and workflow resumed');
        fetchData();
      }
    } catch (e) {
      console.error('Approval failed:', e);
    }
  };

  const handleReject = async (approvalId: string) => {
    try {
      const res = await fetch(`/api/v1/automation/approvals/${approvalId}/reject`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      if (res.ok) {
        showSuccess('Action rejected');
        fetchData();
      }
    } catch (e) {
      console.error('Rejection failed:', e);
    }
  };

  const showSuccess = (msg: string) => {
    setActionSuccessMsg(msg);
    setTimeout(() => setActionSuccessMsg(null), 4000);
  };

  const runningRuns = runs.filter((r) => r.status === AutomationRunStatus.RUNNING || r.status === AutomationRunStatus.QUEUED);
  const pendingApprovals = approvals.filter((a) => a.status === AutomationApprovalStatus.PENDING);

  return (
    <div className="space-y-8 max-w-7xl mx-auto p-4 md:p-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-card-border pb-6">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-gradient-to-tr from-amber-500/20 to-primary/20 text-primary border border-primary/20">
              <Zap className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
                Automation Center
              </h1>
              <p className="text-sm text-muted">
                Automate repetitive gallery work while keeping control of important actions.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/dashboard/automation/new"
            className="flex items-center gap-2 bg-primary hover:bg-primary/90 text-white px-4 py-2.5 rounded-xl text-sm font-semibold transition shadow-md shadow-primary/25"
          >
            <Plus className="h-4 w-4" /> Create Workflow
          </Link>
        </div>
      </div>

      {/* Success Notification Banner */}
      {actionSuccessMsg && (
        <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-sm flex items-center justify-between animate-fadeIn">
          <span className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-emerald-400" /> {actionSuccessMsg}
          </span>
          <button onClick={() => setActionSuccessMsg(null)} className="text-muted hover:text-white">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Top 5 Metric Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <div className="p-5 rounded-2xl bg-card border border-card-border">
          <div className="text-xs font-medium text-muted uppercase tracking-wider">Active Workflows</div>
          <div className="text-2xl font-bold text-white mt-1.5">{telemetry?.active_workflows || workflows.filter((w) => w.enabled).length}</div>
          <div className="text-xs text-muted mt-1">{workflows.length} total defined</div>
        </div>

        <div className="p-5 rounded-2xl bg-card border border-card-border">
          <div className="text-xs font-medium text-muted uppercase tracking-wider">Running</div>
          <div className="text-2xl font-bold text-amber-400 mt-1.5">{runningRuns.length}</div>
          <div className="text-xs text-muted mt-1">active pipeline runs</div>
        </div>

        <div className="p-5 rounded-2xl bg-card border border-card-border relative overflow-hidden">
          <div className="text-xs font-medium text-muted uppercase tracking-wider">Waiting Approval</div>
          <div className="text-2xl font-bold text-indigo-400 mt-1.5">{pendingApprovals.length}</div>
          <div className="text-xs text-muted mt-1">photographer review</div>
          {pendingApprovals.length > 0 && (
            <div className="absolute top-3 right-3 w-2.5 h-2.5 rounded-full bg-indigo-500 animate-pulse" />
          )}
        </div>

        <div className="p-5 rounded-2xl bg-card border border-card-border">
          <div className="text-xs font-medium text-muted uppercase tracking-wider">Completed Today</div>
          <div className="text-2xl font-bold text-emerald-400 mt-1.5">{telemetry?.runs_today || 0}</div>
          <div className="text-xs text-emerald-400/80 mt-1">{telemetry?.success_rate || 100}% success rate</div>
        </div>

        <div className="p-5 rounded-2xl bg-card border border-card-border">
          <div className="text-xs font-medium text-muted uppercase tracking-wider">Failed</div>
          <div className="text-2xl font-bold text-rose-400 mt-1.5">{telemetry?.runs_by_status?.failed || 0}</div>
          <div className="text-xs text-muted mt-1">automatic recovery enabled</div>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="flex border-b border-card-border overflow-x-auto scrollbar-none gap-2">
        {[
          { id: 'workflows', label: 'Active Automations', count: workflows.length },
          { id: 'templates', label: 'Workflow Templates', count: templates.length },
          { id: 'running', label: 'Running Workflows', count: runningRuns.length },
          { id: 'approvals', label: 'Approval Queue', count: pendingApprovals.length, badgeColor: 'bg-indigo-500/20 text-indigo-300' },
          { id: 'history', label: 'Recent Executions', count: runs.length },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`px-4 py-3 text-sm font-medium border-b-2 flex items-center gap-2 whitespace-nowrap transition-colors ${
              activeTab === tab.id
                ? 'border-primary text-primary font-semibold'
                : 'border-transparent text-muted hover:text-white'
            }`}
          >
            {tab.label}
            {tab.count !== undefined && (
              <span className={`text-[11px] px-2 py-0.5 rounded-full font-medium ${tab.badgeColor || 'bg-card-border text-muted'}`}>
                {tab.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Tab 1: Active Automations */}
      {activeTab === 'workflows' && (
        <div className="space-y-4">
          {workflows.length === 0 ? (
            <div className="text-center py-16 bg-card rounded-2xl border border-card-border p-8">
              <Zap className="h-12 w-12 text-muted mx-auto mb-3 opacity-40" />
              <h3 className="text-lg font-semibold text-white">No custom automations created yet</h3>
              <p className="text-sm text-muted max-w-md mx-auto mt-1 mb-6">
                Start from a pre-built template or build a custom automated workflow to process photos, run AI face indexing, and organize albums.
              </p>
              <div className="flex justify-center gap-4">
                <button
                  onClick={() => setActiveTab('templates')}
                  className="px-4 py-2 bg-card-border hover:bg-card-border/80 text-white rounded-xl text-sm font-medium transition"
                >
                  Browse Templates
                </button>
                <Link
                  href="/dashboard/automation/new"
                  className="px-4 py-2 bg-primary hover:bg-primary/90 text-white rounded-xl text-sm font-medium transition"
                >
                  Create Custom Workflow
                </Link>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {workflows.map((wf) => (
                <div key={wf.id} className="p-5 rounded-2xl bg-card border border-card-border hover:border-primary/40 transition flex flex-col justify-between">
                  <div>
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h3 className="font-semibold text-white text-base">{wf.name}</h3>
                        <p className="text-xs text-muted mt-0.5 line-clamp-2">{wf.description || 'No description provided'}</p>
                      </div>
                      <span className={`text-[11px] font-semibold px-2.5 py-1 rounded-full uppercase tracking-wider ${
                        wf.enabled ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-zinc-500/10 text-zinc-400 border border-zinc-500/20'
                      }`}>
                        {wf.enabled ? 'Active' : 'Disabled'}
                      </span>
                    </div>

                    <div className="mt-4 pt-3 border-t border-card-border/60 flex items-center justify-between text-xs text-muted">
                      <div>
                        Trigger: <span className="text-zinc-300 font-medium">{wf.trigger_type.replace(/_/g, ' ')}</span>
                      </div>
                      <div>
                        Steps: <span className="text-zinc-300 font-medium">{wf.workflow_config?.steps?.length || 0}</span>
                      </div>
                      <div>
                        Success: <span className="text-emerald-400 font-medium">{wf.success_rate || 100}%</span>
                      </div>
                    </div>
                  </div>

                  <div className="mt-5 pt-3 border-t border-card-border/60 flex items-center justify-between gap-2">
                    <button
                      onClick={() => handleRunWorkflow(wf.id)}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-primary/20 hover:bg-primary/30 text-primary border border-primary/30 rounded-lg text-xs font-semibold transition"
                    >
                      <Play className="h-3.5 w-3.5 fill-current" /> Run Now
                    </button>

                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => handleToggleWorkflow(wf.id, wf.enabled)}
                        className="px-2.5 py-1.5 text-xs font-medium text-muted hover:text-white bg-card-border/40 hover:bg-card-border rounded-lg transition"
                      >
                        {wf.enabled ? 'Disable' : 'Enable'}
                      </button>
                      <button
                        onClick={() => handleDuplicateWorkflow(wf.id)}
                        className="p-1.5 text-muted hover:text-white bg-card-border/40 hover:bg-card-border rounded-lg transition"
                        title="Duplicate"
                      >
                        <Copy className="h-3.5 w-3.5" />
                      </button>
                      <Link
                        href={`/dashboard/automation/${wf.id}`}
                        className="p-1.5 text-muted hover:text-white bg-card-border/40 hover:bg-card-border rounded-lg transition"
                        title="Edit"
                      >
                        <Edit className="h-3.5 w-3.5" />
                      </Link>
                      <button
                        onClick={() => handleDeleteWorkflow(wf.id)}
                        className="p-1.5 text-rose-400/80 hover:text-rose-400 bg-rose-500/10 hover:bg-rose-500/20 rounded-lg transition"
                        title="Delete"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tab 2: Workflow Templates */}
      {activeTab === 'templates' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {templates.map((tmpl) => (
            <div key={tmpl.id} className="p-6 rounded-2xl bg-card border border-card-border flex flex-col justify-between hover:border-primary/40 transition">
              <div>
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20 uppercase tracking-wider">
                    {tmpl.category}
                  </span>
                  <span className="text-xs text-muted">
                    {tmpl.workflow_config?.steps?.length || 0} Steps
                  </span>
                </div>

                <h3 className="font-bold text-white text-lg mt-3">{tmpl.name}</h3>
                <p className="text-xs text-muted mt-1.5 leading-relaxed">{tmpl.description}</p>

                <div className="mt-4 pt-3 border-t border-card-border/60">
                  <div className="text-[11px] uppercase font-semibold text-muted tracking-wider mb-2">Key Steps:</div>
                  <ul className="space-y-1.5">
                    {tmpl.workflow_config?.steps?.slice(0, 4).map((s: any, idx: number) => (
                      <li key={idx} className="text-xs text-zinc-300 flex items-center gap-2">
                        <CheckCircle2 className="h-3.5 w-3.5 text-primary flex-shrink-0" />
                        <span className="truncate">{s.name || s.action}</span>
                      </li>
                    ))}
                    {(tmpl.workflow_config?.steps?.length || 0) > 4 && (
                      <li className="text-xs text-muted pl-5">+ {(tmpl.workflow_config?.steps?.length || 0) - 4} more steps</li>
                    )}
                  </ul>
                </div>
              </div>

              <div className="mt-6 pt-4 border-t border-card-border">
                <button
                  onClick={() => handleUseTemplate(tmpl.id)}
                  className="w-full flex items-center justify-center gap-2 bg-primary/20 hover:bg-primary/30 text-primary border border-primary/30 py-2.5 rounded-xl text-sm font-semibold transition"
                >
                  <Sparkles className="h-4 w-4" /> Use Template
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Tab 3: Running Workflows */}
      {activeTab === 'running' && (
        <div className="space-y-4">
          {runningRuns.length === 0 ? (
            <div className="text-center py-16 bg-card rounded-2xl border border-card-border p-8">
              <Clock className="h-12 w-12 text-muted mx-auto mb-3 opacity-40" />
              <h3 className="text-base font-semibold text-white">No active workflows currently running</h3>
              <p className="text-xs text-muted mt-1">Trigger a manual workflow or upload photos to observe live execution.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {runningRuns.map((r) => (
                <div key={r.id} className="p-5 rounded-2xl bg-card border border-card-border flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-3">
                      <span className="p-2 rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/20">
                        <Zap className="h-4 w-4 animate-pulse" />
                      </span>
                      <div>
                        <h4 className="font-semibold text-white text-sm">{r.workflow_name || 'Automated Gallery Prep'}</h4>
                        <div className="text-xs text-muted flex items-center gap-3 mt-0.5">
                          <span>Gallery: <strong className="text-zinc-300">{r.gallery_title || 'Studio Global'}</strong></span>
                          <span>•</span>
                          <span>Current Step: <strong className="text-amber-300">{r.current_step || 'Initializing'}</strong></span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <Link
                      href={`/dashboard/automation/runs/${r.id}`}
                      className="px-3.5 py-1.5 bg-primary/20 hover:bg-primary/30 text-primary border border-primary/30 rounded-lg text-xs font-semibold transition flex items-center gap-1.5"
                    >
                      Inspect Timeline <ArrowRight className="h-3 w-3" />
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tab 4: Approval Queue */}
      {activeTab === 'approvals' && (
        <div className="space-y-4">
          {pendingApprovals.length === 0 ? (
            <div className="text-center py-16 bg-card rounded-2xl border border-card-border p-8">
              <CheckCircle2 className="h-12 w-12 text-emerald-400 mx-auto mb-3 opacity-50" />
              <h3 className="text-base font-semibold text-white">Approval Queue is Clean</h3>
              <p className="text-xs text-muted mt-1">No automated actions are waiting for your approval right now.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {pendingApprovals.map((app) => (
                <div key={app.id} className="p-6 rounded-2xl bg-card border border-indigo-500/30 flex flex-col md:flex-row md:items-center justify-between gap-6 shadow-lg shadow-indigo-500/5">
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 uppercase tracking-wider">
                        Approval Required
                      </span>
                      <span className="text-xs text-muted">{new Date(app.requested_at).toLocaleTimeString()}</span>
                    </div>
                    <h4 className="text-base font-bold text-white">{app.title}</h4>
                    <p className="text-sm text-zinc-300">{app.description}</p>
                  </div>

                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => handleReject(app.id)}
                      className="px-4 py-2 bg-card-border hover:bg-card-border/80 text-zinc-300 rounded-xl text-sm font-semibold transition flex items-center gap-1.5"
                    >
                      <X className="h-4 w-4 text-rose-400" /> Reject
                    </button>
                    <button
                      onClick={() => handleApprove(app.id)}
                      className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-sm font-semibold transition flex items-center gap-1.5 shadow-md shadow-emerald-600/20"
                    >
                      <Check className="h-4 w-4" /> Approve & Resume
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tab 5: Recent Executions History */}
      {activeTab === 'history' && (
        <div className="space-y-3">
          {runs.length === 0 ? (
            <div className="text-center py-16 bg-card rounded-2xl border border-card-border p-8">
              <Clock className="h-12 w-12 text-muted mx-auto mb-3 opacity-40" />
              <h3 className="text-base font-semibold text-white">No historical executions yet</h3>
            </div>
          ) : (
            <div className="rounded-2xl bg-card border border-card-border overflow-hidden">
              <div className="divide-y divide-card-border">
                {runs.map((r) => (
                  <div key={r.id} className="p-4 hover:bg-card-border/20 transition flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      {r.status === AutomationRunStatus.COMPLETED && <CheckCircle2 className="h-5 w-5 text-emerald-400 flex-shrink-0" />}
                      {r.status === AutomationRunStatus.PARTIAL && <AlertTriangle className="h-5 w-5 text-amber-400 flex-shrink-0" />}
                      {r.status === AutomationRunStatus.FAILED && <XCircle className="h-5 w-5 text-rose-400 flex-shrink-0" />}
                      {r.status === AutomationRunStatus.RUNNING && <Clock className="h-5 w-5 text-amber-300 animate-spin flex-shrink-0" />}
                      {r.status === AutomationRunStatus.WAITING_APPROVAL && <ShieldAlert className="h-5 w-5 text-indigo-400 flex-shrink-0" />}
                      {r.status === AutomationRunStatus.CANCELLED && <XCircle className="h-5 w-5 text-zinc-500 flex-shrink-0" />}

                      <div>
                        <div className="text-sm font-semibold text-white flex items-center gap-2">
                          {r.workflow_name || 'Workflow Run'}
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${
                            r.status === 'COMPLETED' ? 'bg-emerald-500/10 text-emerald-400' :
                            r.status === 'FAILED' ? 'bg-rose-500/10 text-rose-400' :
                            r.status === 'WAITING_APPROVAL' ? 'bg-indigo-500/10 text-indigo-400' :
                            'bg-zinc-500/10 text-zinc-400'
                          }`}>
                            {r.status}
                          </span>
                        </div>
                        <div className="text-xs text-muted flex items-center gap-3 mt-0.5">
                          <span>Gallery: {r.gallery_title || 'Global'}</span>
                          <span>•</span>
                          <span>Trigger: {r.trigger}</span>
                          <span>•</span>
                          <span>{new Date(r.started_at).toLocaleString()}</span>
                        </div>
                      </div>
                    </div>

                    <Link
                      href={`/dashboard/automation/runs/${r.id}`}
                      className="text-xs font-semibold text-primary hover:text-primary/80 flex items-center gap-1"
                    >
                      Details <ChevronRight className="h-4 w-4" />
                    </Link>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
