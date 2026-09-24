'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import {
  Sliders,
  ChevronLeft,
  Lock,
  RotateCcw,
  CheckCircle2,
  AlertTriangle,
  History,
  ShieldAlert,
  GitCommit,
  Layers,
} from 'lucide-react';
import { PlatformConfigurationDTO, ConfigurationDiffDTO } from '@pixmatch/types';

function ConfigurationDetailContent() {
  const params = useParams();
  const configKey = params.key as string;

  const [config, setConfig] = useState<PlatformConfigurationDTO | null>(null);
  const [diff, setDiff] = useState<ConfigurationDiffDTO | null>(null);
  const [newValueInput, setNewValueInput] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);

  const fetchConfig = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/admin/releases/configuration/${configKey}?environment=PROD`);
      if (res.ok) {
        const d = await res.json();
        if (d.success) {
          setConfig(d.data);
          setNewValueInput(
            d.data.isSecret
              ? ''
              : typeof d.data.value === 'object'
              ? JSON.stringify(d.data.value, null, 2)
              : String(d.data.value)
          );
        }
      }
    } catch (e) {
      console.error('Failed to load configuration:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (configKey) fetchConfig();
  }, [configKey]);

  const handleComputeDiff = async () => {
    if (!config) return;
    try {
      let parsedVal: any = newValueInput;
      if (config.type === 'NUMBER') parsedVal = Number(newValueInput);
      else if (config.type === 'BOOLEAN') parsedVal = newValueInput === 'true';
      else if (config.type === 'JSON') {
        try {
          parsedVal = JSON.parse(newValueInput);
        } catch (e) {
          alert('Invalid JSON');
          return;
        }
      }

      const res = await fetch('/api/admin/releases/configuration/diff', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          key: config.key,
          environment: 'PROD',
          proposedValue: parsedVal,
        }),
      });

      if (res.ok) {
        const d = await res.json();
        if (d.success) setDiff(d.data);
      }
    } catch (e) {
      console.error('Diff calculation error:', e);
    }
  };

  if (loading || !config) {
    return (
      <div className="p-8 text-slate-400 bg-[#0B0F17] min-h-screen">
        Loading configuration key details...
      </div>
    );
  }

  return (
    <div className="p-6 md:p-8 space-y-6 bg-[#0B0F17] min-h-screen text-slate-100">
      {/* Breadcrumb & Header */}
      <div className="space-y-3 border-b border-card-border/80 pb-6">
        <Link
          href="/dashboard/admin/releases/configuration"
          className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-white transition"
        >
          <ChevronLeft className="h-4 w-4" />
          <span>Back to Configuration Catalog</span>
        </Link>

        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="font-mono text-xs font-bold text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded border border-blue-500/20">
                {config.key}
              </span>
              <span className="text-xs text-slate-400 font-mono">v{config.version}</span>
            </div>
            <h1 className="text-2xl font-bold text-white">{config.key}</h1>
            <p className="text-slate-400 text-sm mt-0.5">{config.description || 'No description provided.'}</p>
          </div>

          <div className="flex items-center gap-3">
            <span className="px-3 py-1 rounded-lg text-xs font-mono font-bold bg-amber-500/15 text-amber-400 border border-amber-500/30">
              ENV: {config.environment}
            </span>
          </div>
        </div>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Metadata & Diff Testing */}
        <div className="lg:col-span-2 space-y-6">
          <div className="p-6 rounded-xl bg-[#0F1623] border border-card-border/80 space-y-4">
            <h2 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <Sliders className="h-4 w-4 text-blue-400" />
              Configuration Metadata & Validation Contract
            </h2>

            <div className="grid grid-cols-2 gap-4 text-xs">
              <div className="p-3 rounded-lg bg-[#0B0F17] border border-card-border/40">
                <span className="text-slate-400">Category</span>
                <p className="text-white font-semibold mt-0.5">{config.category}</p>
              </div>
              <div className="p-3 rounded-lg bg-[#0B0F17] border border-card-border/40">
                <span className="text-slate-400">Data Type</span>
                <p className="text-blue-400 font-mono font-semibold mt-0.5">{config.type}</p>
              </div>
              <div className="p-3 rounded-lg bg-[#0B0F17] border border-card-border/40">
                <span className="text-slate-400">Secret / Sensitive</span>
                <p className="text-white font-semibold mt-0.5">
                  {config.isSecret ? (
                    <span className="text-red-400 flex items-center gap-1">
                      <Lock className="h-3 w-3" /> Yes (Redacted)
                    </span>
                  ) : (
                    <span className="text-emerald-400">No (Public Parameter)</span>
                  )}
                </p>
              </div>
              <div className="p-3 rounded-lg bg-[#0B0F17] border border-card-border/40">
                <span className="text-slate-400">Active Version</span>
                <p className="text-white font-mono font-semibold mt-0.5">v{config.version}</p>
              </div>
            </div>

            {config.validationRules && (
              <div className="pt-2 border-t border-card-border/40 space-y-2 text-xs">
                <p className="text-slate-400 font-semibold">Active Validation Constraints:</p>
                <pre className="p-3 bg-[#0B0F17] rounded-lg text-slate-300 font-mono text-[11px] overflow-x-auto border border-card-border/40">
                  {JSON.stringify(config.validationRules, null, 2)}
                </pre>
              </div>
            )}
          </div>

          {/* Diff & Risk Simulator */}
          <div className="p-6 rounded-xl bg-[#0F1623] border border-card-border/80 space-y-4">
            <h2 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <GitCommit className="h-4 w-4 text-purple-400" />
              Live Diff & Risk Engine
            </h2>
            <p className="text-slate-400 text-xs">
              Preview proposed value mutations and automatically calculate risk classification level.
            </p>

            <div className="space-y-3">
              <label className="text-xs text-slate-400">Proposed New Value:</label>
              <textarea
                rows={4}
                value={newValueInput}
                onChange={(e) => setNewValueInput(e.target.value)}
                placeholder={config.isSecret ? 'Enter new secret payload (will be encrypted)' : 'Enter value...'}
                className="w-full p-3 bg-[#0B0F17] border border-card-border/70 rounded-lg text-xs font-mono text-white focus:outline-none focus:border-blue-500"
              />
              <button
                onClick={handleComputeDiff}
                className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs rounded-lg transition"
              >
                Compute Live Diff & Risk
              </button>
            </div>

            {diff && (
              <div className="p-4 rounded-lg bg-[#0B0F17] border border-purple-500/30 space-y-3 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Assessed Risk Level:</span>
                  <span
                    className={`font-bold px-2 py-0.5 rounded text-[11px] ${
                      diff.riskLevel === 'CRITICAL'
                        ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                        : diff.riskLevel === 'HIGH'
                        ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                        : 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                    }`}
                  >
                    {diff.riskLevel}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-3 font-mono text-[11px]">
                  <div className="p-2.5 rounded bg-red-950/20 border border-red-900/30">
                    <span className="text-red-400 font-bold block mb-1">Previous:</span>
                    <span className="text-slate-300">
                      {typeof diff.previousValue === 'object'
                        ? JSON.stringify(diff.previousValue)
                        : String(diff.previousValue)}
                    </span>
                  </div>
                  <div className="p-2.5 rounded bg-emerald-950/20 border border-emerald-900/30">
                    <span className="text-emerald-400 font-bold block mb-1">Proposed:</span>
                    <span className="text-slate-300">
                      {typeof diff.proposedValue === 'object'
                        ? JSON.stringify(diff.proposedValue)
                        : String(diff.proposedValue)}
                    </span>
                  </div>
                </div>

                <div className="pt-2 text-right">
                  <Link
                    href="/dashboard/admin/releases/changes"
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs transition"
                  >
                    Create Change Request for this Diff
                  </Link>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Governance Rules */}
        <div className="p-6 rounded-xl bg-[#0F1623] border border-card-border/80 space-y-4">
          <h2 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
            <ShieldAlert className="h-4 w-4 text-amber-400" />
            Governance & Approval Safeguards
          </h2>
          <p className="text-slate-400 text-xs">
            Direct database changes in Production are blocked. All updates require formal change requests.
          </p>

          <div className="space-y-3 text-xs text-slate-300">
            <div className="p-3 rounded-lg bg-[#0B0F17] border border-card-border/40 space-y-1">
              <span className="font-semibold text-white">LOW / MEDIUM Risk:</span>
              <p className="text-slate-400 text-[11px]">Requires single authorized admin approval.</p>
            </div>
            <div className="p-3 rounded-lg bg-[#0B0F17] border border-card-border/40 space-y-1">
              <span className="font-semibold text-white">HIGH / CRITICAL Risk:</span>
              <p className="text-slate-400 text-[11px]">
                Requires mandatory Two-Person Approval (dual sign-off) and automatic notification broadcast.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ConfigurationDetailPage() {
  return (
    <Suspense fallback={<div className="p-8 text-slate-400">Loading Configuration...</div>}>
      <ConfigurationDetailContent />
    </Suspense>
  );
}
