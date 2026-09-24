'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  Plus,
  Trash2,
  Zap,
  Save,
  ShieldAlert,
  HelpCircle,
  AlertCircle,
  CheckCircle2,
} from 'lucide-react';
import {
  AutomationActionType,
  AutomationTriggerType,
  CreateAutomationWorkflowDTO,
} from '@pixmatch/types';

const AVAILABLE_ACTIONS = [
  { value: AutomationActionType.PROCESS_PHOTOS, label: 'Process Photos', isSafe: true },
  { value: AutomationActionType.RETRY_FAILED_PROCESSING, label: 'Retry Failed Processing', isSafe: true },
  { value: AutomationActionType.RUN_PHOTO_INTELLIGENCE, label: 'Run Photo AI Intelligence', isSafe: true },
  { value: AutomationActionType.RUN_FACE_INDEXING, label: 'Index Faces', isSafe: true },
  { value: AutomationActionType.RUN_EVENT_INTELLIGENCE, label: 'Analyze Event Intelligence', isSafe: true },
  { value: AutomationActionType.GENERATE_SMART_ALBUMS, label: 'Generate Smart Albums', isSafe: true },
  { value: AutomationActionType.GENERATE_EVENT_STORY, label: 'Generate Event Story', isSafe: true },
  { value: AutomationActionType.GENERATE_COVER_RECOMMENDATION, label: 'Generate Cover Recommendation', isSafe: true },
  { value: AutomationActionType.GENERATE_HIGHLIGHT_RECOMMENDATIONS, label: 'Generate Highlight Recommendations', isSafe: true },
  { value: AutomationActionType.RUN_GALLERY_HEALTH_CHECK, label: 'Run Gallery Health Check', isSafe: true },
  { value: AutomationActionType.RUN_COMPLETENESS_CHECK, label: 'Run Completeness Check', isSafe: true },
  { value: AutomationActionType.SEND_STUDIO_NOTIFICATION, label: 'Send Studio Notification', isSafe: true },
  { value: AutomationActionType.CREATE_APPROVAL_REQUEST, label: 'Create Approval Request', isSafe: false },
  { value: AutomationActionType.APPLY_COVER, label: 'Apply Cover Photo', isSafe: false },
  { value: AutomationActionType.PUBLISH_GALLERY, label: 'Publish Gallery', isSafe: false },
  { value: AutomationActionType.SEND_CLIENT_EMAIL, label: 'Send Client Email', isSafe: false },
  { value: AutomationActionType.DELETE_PHOTOS, label: 'Delete Low Quality / Duplicate Photos', isSafe: false },
];

export default function NewWorkflowPage() {
  const router = useRouter();

  const [name, setName] = useState('My Automated Gallery Prep');
  const [description, setDescription] = useState('Automates photo processing, AI face indexing, and gallery completeness audits.');
  const [triggerType, setTriggerType] = useState<AutomationTriggerType>(AutomationTriggerType.UPLOAD_COMPLETED);

  const [steps, setSteps] = useState<Array<{ id: string; name: string; action: AutomationActionType; dependsOn: string[] }>>([
    { id: 'process', name: 'Process Photos', action: AutomationActionType.PROCESS_PHOTOS, dependsOn: [] },
    { id: 'intelligence', name: 'Run Photo Intelligence', action: AutomationActionType.RUN_PHOTO_INTELLIGENCE, dependsOn: ['process'] },
    { id: 'face_index', name: 'Index Faces', action: AutomationActionType.RUN_FACE_INDEXING, dependsOn: ['process'] },
    { id: 'health_check', name: 'Run Gallery Health Check', action: AutomationActionType.RUN_GALLERY_HEALTH_CHECK, dependsOn: ['intelligence', 'face_index'] },
  ]);

  const [retryFailedStep, setRetryFailedStep] = useState(true);
  const [maxRetries, setMaxRetries] = useState(3);
  const [continueOnFailure, setContinueOnFailure] = useState(false);
  const [notifyOnFailure, setNotifyOnFailure] = useState(true);

  const [isSaving, setIsSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleAddStep = () => {
    const newId = `step_${steps.length + 1}`;
    const prevId = steps.length > 0 ? steps[steps.length - 1].id : undefined;
    setSteps([
      ...steps,
      {
        id: newId,
        name: 'New Step',
        action: AutomationActionType.RUN_COMPLETENESS_CHECK,
        dependsOn: prevId ? [prevId] : [],
      },
    ]);
  };

  const handleRemoveStep = (index: number) => {
    const removedId = steps[index].id;
    const updated = steps.filter((_, i) => i !== index).map((s) => ({
      ...s,
      dependsOn: s.dependsOn.filter((d) => d !== removedId),
    }));
    setSteps(updated);
  };

  const handleSave = async () => {
    setErrorMsg(null);
    if (!name.trim()) {
      setErrorMsg('Workflow name is required');
      return;
    }
    if (steps.length === 0) {
      setErrorMsg('Workflow must contain at least one step');
      return;
    }

    const payload: CreateAutomationWorkflowDTO = {
      name,
      description,
      trigger_type: triggerType,
      workflow_config: {
        version: 1,
        steps: steps.map((s) => ({
          id: s.id,
          name: s.name,
          action: s.action,
          dependsOn: s.dependsOn,
        })),
        failureHandling: {
          retryFailedStep,
          maxRetries,
          continueOnNonCriticalFailure: continueOnFailure,
          notifyOnFailure,
        },
      },
    };

    try {
      setIsSaving(true);
      const res = await fetch('/api/v1/automation/workflows', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to save workflow');
      }

      router.push('/dashboard/automation');
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-4 md:p-8 space-y-8">
      {/* Top Header */}
      <div className="flex items-center justify-between border-b border-card-border pb-5">
        <div className="flex items-center gap-3">
          <Link
            href="/dashboard/automation"
            className="p-2 rounded-xl bg-card-border/40 hover:bg-card-border text-muted hover:text-white transition"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div>
            <h1 className="text-xl font-bold text-white">Create Automation Workflow</h1>
            <p className="text-xs text-muted">Build a repeatable, controlled pipeline for automated gallery operations.</p>
          </div>
        </div>

        <button
          onClick={handleSave}
          disabled={isSaving}
          className="flex items-center gap-2 bg-primary hover:bg-primary/90 text-white px-5 py-2.5 rounded-xl text-sm font-semibold transition shadow-md shadow-primary/25 disabled:opacity-50"
        >
          <Save className="h-4 w-4" /> {isSaving ? 'Saving...' : 'Save Workflow'}
        </button>
      </div>

      {errorMsg && (
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-sm flex items-center gap-2">
          <AlertCircle className="h-5 w-5 flex-shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* General Settings */}
      <div className="p-6 rounded-2xl bg-card border border-card-border space-y-5">
        <h3 className="font-semibold text-white text-base">1. Workflow Details & Trigger</h3>

        <div className="space-y-4">
          <div>
            <label className="text-xs font-semibold text-zinc-300 block mb-1.5">Workflow Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full bg-[#0E131F] border border-card-border rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-primary"
              placeholder="e.g. Wedding Auto Prep"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-zinc-300 block mb-1.5">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              className="w-full bg-[#0E131F] border border-card-border rounded-xl px-4 py-2 text-sm text-white focus:outline-none focus:border-primary"
              placeholder="Explain what this automation does..."
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-zinc-300 block mb-1.5">Trigger Condition</label>
            <select
              value={triggerType}
              onChange={(e) => setTriggerType(e.target.value as AutomationTriggerType)}
              className="w-full bg-[#0E131F] border border-card-border rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-primary"
            >
              <option value={AutomationTriggerType.UPLOAD_COMPLETED}>When Gallery Upload Completes (UPLOAD_COMPLETED)</option>
              <option value={AutomationTriggerType.PROCESSING_COMPLETED}>When Photos Finish Processing (PROCESSING_COMPLETED)</option>
              <option value={AutomationTriggerType.PROCESSING_FAILED}>When Processing Fails (PROCESSING_FAILED)</option>
              <option value={AutomationTriggerType.GALLERY_CREATED}>When New Gallery Created (GALLERY_CREATED)</option>
              <option value={AutomationTriggerType.SCHEDULED}>On a Recurring Schedule (SCHEDULED)</option>
              <option value={AutomationTriggerType.MANUAL}>Manual Trigger Only (MANUAL)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Vertical Step Builder */}
      <div className="p-6 rounded-2xl bg-card border border-card-border space-y-5">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-semibold text-white text-base">2. Pipeline Execution Steps</h3>
            <p className="text-xs text-muted">Steps will execute sequentially or in parallel based on their dependency configuration.</p>
          </div>
          <button
            onClick={handleAddStep}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-primary/20 hover:bg-primary/30 text-primary border border-primary/30 rounded-xl text-xs font-semibold transition"
          >
            <Plus className="h-3.5 w-3.5" /> Add Step
          </button>
        </div>

        <div className="space-y-4">
          {steps.map((step, idx) => {
            const actionDef = AVAILABLE_ACTIONS.find((a) => a.value === step.action);
            return (
              <div key={step.id} className="p-4 rounded-xl bg-[#0E131F] border border-card-border flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-7 h-7 rounded-full bg-primary/20 text-primary font-bold text-xs flex items-center justify-center flex-shrink-0">
                    {idx + 1}
                  </div>
                  <div>
                    <input
                      type="text"
                      value={step.name}
                      onChange={(e) => {
                        const updated = [...steps];
                        updated[idx].name = e.target.value;
                        setSteps(updated);
                      }}
                      className="bg-transparent text-sm font-semibold text-white focus:outline-none border-b border-transparent focus:border-primary pb-0.5"
                    />
                    <div className="text-xs text-muted mt-1">ID: <code className="text-zinc-400">{step.id}</code></div>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                  <select
                    value={step.action}
                    onChange={(e) => {
                      const updated = [...steps];
                      updated[idx].action = e.target.value as AutomationActionType;
                      setSteps(updated);
                    }}
                    className="bg-card border border-card-border rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-primary"
                  >
                    {AVAILABLE_ACTIONS.map((a) => (
                      <option key={a.value} value={a.value}>
                        {a.label} {!a.isSafe ? '(Approval Required)' : ''}
                      </option>
                    ))}
                  </select>

                  {!actionDef?.isSafe && (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                      Approval Gated
                    </span>
                  )}

                  <button
                    onClick={() => handleRemoveStep(idx)}
                    disabled={steps.length <= 1}
                    className="p-1.5 text-muted hover:text-rose-400 transition disabled:opacity-30"
                    title="Remove Step"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Failure Handling & Notifications */}
      <div className="p-6 rounded-2xl bg-card border border-card-border space-y-5">
        <h3 className="font-semibold text-white text-base">3. Failure Handling & Policies</h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-4 rounded-xl bg-[#0E131F] border border-card-border flex items-center justify-between">
            <div>
              <div className="text-xs font-semibold text-white">Retry Failed Steps</div>
              <div className="text-[11px] text-muted">Automatically retry transient failures</div>
            </div>
            <input
              type="checkbox"
              checked={retryFailedStep}
              onChange={(e) => setRetryFailedStep(e.target.checked)}
              className="h-4 w-4 rounded accent-primary cursor-pointer"
            />
          </div>

          <div className="p-4 rounded-xl bg-[#0E131F] border border-card-border flex items-center justify-between">
            <div>
              <div className="text-xs font-semibold text-white">Max Retries</div>
              <div className="text-[11px] text-muted">Bounded attempts before pausing</div>
            </div>
            <select
              value={maxRetries}
              onChange={(e) => setMaxRetries(parseInt(e.target.value, 10))}
              className="bg-card border border-card-border rounded-lg px-3 py-1 text-xs text-white"
            >
              <option value={1}>1 Retry</option>
              <option value={2}>2 Retries</option>
              <option value={3}>3 Retries</option>
              <option value={5}>5 Retries</option>
            </select>
          </div>

          <div className="p-4 rounded-xl bg-[#0E131F] border border-card-border flex items-center justify-between">
            <div>
              <div className="text-xs font-semibold text-white">Continue on Non-Critical Failure</div>
              <div className="text-[11px] text-muted">Progress other independent steps</div>
            </div>
            <input
              type="checkbox"
              checked={continueOnFailure}
              onChange={(e) => setContinueOnFailure(e.target.checked)}
              className="h-4 w-4 rounded accent-primary cursor-pointer"
            />
          </div>

          <div className="p-4 rounded-xl bg-[#0E131F] border border-card-border flex items-center justify-between">
            <div>
              <div className="text-xs font-semibold text-white">Notify Studio on Failure</div>
              <div className="text-[11px] text-muted">Send in-app alert when step fails</div>
            </div>
            <input
              type="checkbox"
              checked={notifyOnFailure}
              onChange={(e) => setNotifyOnFailure(e.target.checked)}
              className="h-4 w-4 rounded accent-primary cursor-pointer"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
