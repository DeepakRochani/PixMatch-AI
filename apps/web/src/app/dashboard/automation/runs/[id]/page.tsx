'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import {
  ArrowLeft,
  Zap,
  CheckCircle2,
  Clock,
  AlertTriangle,
  XCircle,
  ShieldAlert,
  Play,
  Pause,
  RotateCcw,
  X,
  Check,
  ChevronRight,
  AlertCircle,
} from 'lucide-react';
import {
  AutomationRunDTO,
  AutomationRunStatus,
  AutomationStepRunStatus,
} from '@pixmatch/types';

export default function AutomationRunDetailPage() {
  const params = useParams();
  const runId = params.id as string;

  const [run, setRun] = useState<AutomationRunDTO | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const fetchRun = async () => {
    try {
      const res = await fetch(`/api/v1/automation/runs/${runId}`);
      if (!res.ok) throw new Error('Failed to load automation run');
      const data = await res.json();
      setRun(data);
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (runId) {
      fetchRun();
      const interval = setInterval(fetchRun, 3000);
      return () => clearInterval(interval);
    }
  }, [runId]);

  const handlePause = async () => {
    try {
      const res = await fetch(`/api/v1/automation/runs/${runId}/pause`, { method: 'POST' });
      if (res.ok) {
        setSuccessMsg('Run paused');
        fetchRun();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleResume = async () => {
    try {
      const res = await fetch(`/api/v1/automation/runs/${runId}/resume`, { method: 'POST' });
      if (res.ok) {
        setSuccessMsg('Run resumed');
        fetchRun();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleCancel = async () => {
    if (!confirm('Are you sure you want to cancel this workflow run?')) return;
    try {
      const res = await fetch(`/api/v1/automation/runs/${runId}/cancel`, { method: 'POST' });
      if (res.ok) {
        setSuccessMsg('Run cancelled');
        fetchRun();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleRetry = async () => {
    try {
      const res = await fetch(`/api/v1/automation/runs/${runId}/retry`, { method: 'POST' });
      if (res.ok) {
        setSuccessMsg('Retrying failed steps...');
        fetchRun();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleApprove = async (approvalId: string) => {
    try {
      const res = await fetch(`/api/v1/automation/approvals/${approvalId}/approve`, { method: 'POST' });
      if (res.ok) {
        setSuccessMsg('Action approved and workflow continued');
        fetchRun();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleReject = async (approvalId: string) => {
    try {
      const res = await fetch(`/api/v1/automation/approvals/${approvalId}/reject`, { method: 'POST' });
      if (res.ok) {
        setSuccessMsg('Action rejected');
        fetchRun();
      }
    } catch (e) {
      console.error(e);
    }
  };

  if (isLoading) {
    return <div className="p-8 text-center text-muted">Loading execution details...</div>;
  }

  if (!run) {
    return (
      <div className="max-w-4xl mx-auto p-8 text-center">
        <h2 className="text-lg font-bold text-white">Execution record not found</h2>
        <Link href="/dashboard/automation" className="text-primary mt-4 inline-block text-sm">
          Return to Automation Center
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-4 md:p-8 space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-card-border pb-5">
        <div className="flex items-center gap-3">
          <Link
            href="/dashboard/automation"
            className="p-2 rounded-xl bg-card-border/40 hover:bg-card-border text-muted hover:text-white transition"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-white">{run.workflow_name || 'Workflow Run'}</h1>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                run.status === AutomationRunStatus.COMPLETED ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' :
                run.status === AutomationRunStatus.RUNNING ? 'bg-amber-500/10 text-amber-300 border border-amber-500/20 animate-pulse' :
                run.status === AutomationRunStatus.WAITING_APPROVAL ? 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20' :
                run.status === AutomationRunStatus.FAILED ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20' :
                'bg-zinc-500/10 text-zinc-400'
              }`}>
                {run.status}
              </span>
            </div>
            <p className="text-xs text-muted mt-0.5">
              Target Gallery: <strong className="text-zinc-300">{run.gallery_title || 'Global Studio'}</strong> • Trigger: {run.trigger}
            </p>
          </div>
        </div>

        {/* Controls */}
        <div className="flex items-center gap-2">
          {run.status === AutomationRunStatus.RUNNING && (
            <button
              onClick={handlePause}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-card-border hover:bg-card-border/80 text-white rounded-lg text-xs font-medium transition"
            >
              <Pause className="h-3.5 w-3.5" /> Pause
            </button>
          )}

          {run.status === AutomationRunStatus.WAITING_APPROVAL && (
            <button
              onClick={handleResume}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-primary/20 hover:bg-primary/30 text-primary border border-primary/30 rounded-lg text-xs font-semibold transition"
            >
              <Play className="h-3.5 w-3.5" /> Resume
            </button>
          )}

          {(run.status === AutomationRunStatus.FAILED || run.status === AutomationRunStatus.PARTIAL) && (
            <button
              onClick={handleRetry}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-primary hover:bg-primary/90 text-white rounded-lg text-xs font-semibold transition shadow-sm"
            >
              <RotateCcw className="h-3.5 w-3.5" /> Retry Failed
            </button>
          )}

          {(run.status === AutomationRunStatus.RUNNING || run.status === AutomationRunStatus.WAITING_APPROVAL || run.status === AutomationRunStatus.QUEUED) && (
            <button
              onClick={handleCancel}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 rounded-lg text-xs font-medium transition"
            >
              <X className="h-3.5 w-3.5" /> Cancel Run
            </button>
          )}
        </div>
      </div>

      {successMsg && (
        <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-sm flex items-center justify-between">
          <span>{successMsg}</span>
          <button onClick={() => setSuccessMsg(null)}><X className="h-4 w-4" /></button>
        </div>
      )}

      {/* Execution Timeline */}
      <div className="p-6 rounded-2xl bg-card border border-card-border space-y-6">
        <h3 className="font-semibold text-white text-base">Execution Step Timeline</h3>

        <div className="relative pl-6 space-y-8 before:absolute before:left-2.5 before:top-3 before:bottom-3 before:w-0.5 before:bg-card-border">
          {run.step_runs?.map((step, idx) => {
            const isDone = step.status === AutomationStepRunStatus.COMPLETED;
            const isWaiting = step.status === AutomationStepRunStatus.WAITING_APPROVAL;
            const isFailed = step.status === AutomationStepRunStatus.FAILED;
            const isRunning = step.status === AutomationStepRunStatus.RUNNING;
            const isSkipped = step.status === AutomationStepRunStatus.SKIPPED;

            return (
              <div key={step.id} className="relative">
                {/* Timeline node icon */}
                <div className={`absolute -left-6 top-0.5 w-5 h-5 rounded-full flex items-center justify-center border ${
                  isDone ? 'bg-emerald-500 text-black border-emerald-400' :
                  isWaiting ? 'bg-indigo-600 text-white border-indigo-400 animate-pulse' :
                  isFailed ? 'bg-rose-500 text-white border-rose-400' :
                  isRunning ? 'bg-amber-400 text-black border-amber-300 animate-spin' :
                  'bg-card text-muted border-card-border'
                }`}>
                  {isDone && <Check className="h-3 w-3 stroke-[3]" />}
                  {isWaiting && <ShieldAlert className="h-3 w-3" />}
                  {isFailed && <X className="h-3 w-3 stroke-[3]" />}
                  {isRunning && <Clock className="h-3 w-3" />}
                  {!isDone && !isWaiting && !isFailed && !isRunning && <span className="text-[9px]">{idx + 1}</span>}
                </div>

                <div className="p-4 rounded-xl bg-[#0E131F] border border-card-border/80 ml-2 space-y-2">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <h4 className="font-semibold text-white text-sm flex items-center gap-2">
                        {step.step_key} ({step.action_type})
                      </h4>
                      <span className="text-xs text-muted">
                        Started: {new Date(step.started_at).toLocaleTimeString()}
                        {step.attempt > 1 ? ` • Attempt ${step.attempt}` : ''}
                      </span>
                    </div>

                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${
                      isDone ? 'bg-emerald-500/10 text-emerald-400' :
                      isWaiting ? 'bg-indigo-500/20 text-indigo-300' :
                      isFailed ? 'bg-rose-500/10 text-rose-400' :
                      isRunning ? 'bg-amber-500/10 text-amber-300' :
                      'bg-zinc-500/10 text-zinc-400'
                    }`}>
                      {step.status}
                    </span>
                  </div>

                  {step.error_message && (
                    <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/20 text-xs text-rose-400">
                      <strong>Error:</strong> {step.error_message}
                    </div>
                  )}

                  {step.result && (
                    <div className="p-2.5 rounded-lg bg-card-border/20 text-xs text-zinc-300 space-y-1 font-mono">
                      {Object.entries(step.result).map(([k, v]) => (
                        <div key={k} className="flex gap-2">
                          <span className="text-muted">{k}:</span>
                          <span className="text-zinc-200">{typeof v === 'object' ? JSON.stringify(v) : String(v)}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* If this step has an active approval request */}
                  {step.approval && step.approval.status === 'PENDING' && (
                    <div className="mt-3 p-4 rounded-xl bg-indigo-500/10 border border-indigo-500/30 flex flex-col md:flex-row md:items-center justify-between gap-3">
                      <div>
                        <div className="text-xs font-bold text-indigo-300 uppercase tracking-wider">Photographer Decision Required</div>
                        <div className="text-sm font-semibold text-white mt-0.5">{step.approval.title}</div>
                        <div className="text-xs text-zinc-300">{step.approval.description}</div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleReject(step.approval!.id)}
                          className="px-3 py-1.5 bg-card-border hover:bg-card-border/80 text-xs text-zinc-300 rounded-lg transition"
                        >
                          Reject
                        </button>
                        <button
                          onClick={() => handleApprove(step.approval!.id)}
                          className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-xs text-white font-semibold rounded-lg transition shadow-sm"
                        >
                          Approve
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
