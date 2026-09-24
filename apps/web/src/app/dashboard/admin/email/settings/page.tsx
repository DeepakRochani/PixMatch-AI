'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  Settings,
  Mail,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Layers,
  ListFilter,
  Lock,
  Activity,
  Server,
} from 'lucide-react';
import { fetchApi } from '@/lib/api-client';
import { AdminEmailSettingsDTO } from '@pixmatch/types';

export default function AdminEmailSettingsPage() {
  const [settings, setSettings] = useState<AdminEmailSettingsDTO | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [testResult, setTestResult] = useState<{ ok: boolean; message: string; latency_ms?: number } | null>(null);
  const [isTesting, setIsTesting] = useState(false);

  const loadSettings = async () => {
    setIsLoading(true);
    try {
      const res = await fetchApi<AdminEmailSettingsDTO>('/admin/email/settings');
      if (res.success && res.data) {
        setSettings(res.data);
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadSettings();
  }, []);

  const handleTestConnection = async () => {
    setIsTesting(true);
    setTestResult(null);
    try {
      const res = await fetchApi<any>('/admin/email/settings/test', {
        method: 'POST',
      });
      if (res.success && res.data) {
        setTestResult(res.data);
      } else {
        setTestResult({
          ok: false,
          message: res.error?.message || 'Connection test failed',
        });
      }
    } catch (err: any) {
      setTestResult({
        ok: false,
        message: err.message || 'Error connecting to provider service',
      });
    } finally {
      setIsTesting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2.5">
            <Settings className="h-6 w-6 text-amber-400" /> Email Provider Configuration
          </h1>
          <p className="text-xs text-muted mt-1">
            Production provider status, connection diagnostics, and sender verification.
          </p>
        </div>

        <button
          onClick={() => loadSettings()}
          disabled={isLoading}
          className="p-2 rounded-xl bg-[#131B2A] border border-card-border/80 text-muted hover:text-white transition self-start sm:self-auto"
        >
          <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin text-amber-400' : ''}`} />
        </button>
      </div>

      {/* Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-card-border pb-3 overflow-x-auto">
        <Link
          href="/dashboard/admin/email"
          className="px-3.5 py-1.5 rounded-lg text-xs font-semibold text-muted hover:text-white hover:bg-card-border/30 transition"
        >
          Overview
        </Link>
        <Link
          href="/dashboard/admin/email/logs"
          className="px-3.5 py-1.5 rounded-lg text-xs font-semibold text-muted hover:text-white hover:bg-card-border/30 transition flex items-center gap-1.5"
        >
          <ListFilter className="h-3.5 w-3.5" /> Delivery Logs
        </Link>
        <Link
          href="/dashboard/admin/email/templates"
          className="px-3.5 py-1.5 rounded-lg text-xs font-semibold text-muted hover:text-white hover:bg-card-border/30 transition flex items-center gap-1.5"
        >
          <Layers className="h-3.5 w-3.5" /> Templates
        </Link>
        <Link
          href="/dashboard/admin/email/settings"
          className="px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-amber-500/15 text-amber-300 border border-amber-500/30 flex items-center gap-1.5"
        >
          <Settings className="h-3.5 w-3.5" /> Provider Settings
        </Link>
      </div>

      {/* Security Privacy Notice */}
      <div className="rounded-2xl bg-[#0E1422] border border-card-border p-4.5 flex items-center gap-3.5 shadow-lg">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex-shrink-0">
          <Lock className="h-5 w-5" />
        </div>
        <div>
          <div className="text-xs font-bold text-white tracking-tight flex items-center gap-2">
            Zero Credential Exposure Guarantee
          </div>
          <p className="text-[11px] text-muted mt-0.5 leading-relaxed">
            API keys, SMTP passwords, and webhook secrets are loaded strictly from server environment secrets and never rendered in API responses or UI components.
          </p>
        </div>
      </div>

      {/* Active Provider Card */}
      <div className="rounded-2xl bg-[#0E1422] border border-card-border p-6 space-y-5 shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-card-border pb-4">
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-xl bg-gradient-to-tr from-amber-500 to-orange-600 flex items-center justify-center text-black font-black text-base shadow-lg shadow-amber-500/20">
              <Server className="h-6 w-6 text-black" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-white tracking-tight">
                  Provider: {settings?.provider || 'CONSOLE_DEV'}
                </h2>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                  settings?.status === 'CONNECTED'
                    ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30'
                    : 'bg-amber-500/15 text-amber-300 border border-amber-500/30'
                }`}>
                  {settings?.status || 'CONNECTED'}
                </span>
              </div>
              <p className="text-xs text-muted mt-0.5">
                {settings?.provider === 'RESEND' ? 'Resend REST API Delivery Gateway' :
                 settings?.provider === 'SMTP' ? 'Custom SMTP Relay Server' :
                 'Safe Console Development Provider (Local / Test)'}
              </p>
            </div>
          </div>

          <button
            onClick={handleTestConnection}
            disabled={isTesting}
            className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-black text-xs font-semibold flex items-center gap-1.5 transition shadow-md shadow-amber-500/20 self-start sm:self-auto"
          >
            <Activity className={`h-3.5 w-3.5 ${isTesting ? 'animate-spin' : ''}`} />
            {isTesting ? 'Testing...' : 'Test Connection'}
          </button>
        </div>

        {/* Test Result Alert */}
        {testResult && (
          <div className={`p-4 rounded-xl border text-xs flex items-center justify-between gap-3 ${
            testResult.ok
              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
              : 'bg-red-500/10 border-red-500/30 text-red-300'
          }`}>
            <div className="flex items-center gap-2">
              {testResult.ok ? <CheckCircle2 className="h-4 w-4 text-emerald-400" /> : <AlertCircle className="h-4 w-4 text-red-400" />}
              <span>{testResult.message}</span>
            </div>
            {testResult.latency_ms !== undefined && (
              <span className="font-mono text-[11px] opacity-80">{testResult.latency_ms} ms</span>
            )}
          </div>
        )}

        {/* Configuration Details Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-4 rounded-xl bg-[#070A0F] border border-card-border space-y-1">
            <div className="text-[10px] uppercase text-muted font-semibold">From Sender Name</div>
            <div className="text-sm font-semibold text-white">{settings?.from_name || 'PixMatch AI'}</div>
          </div>

          <div className="p-4 rounded-xl bg-[#070A0F] border border-card-border space-y-1">
            <div className="text-[10px] uppercase text-muted font-semibold">From Sender Address</div>
            <div className="text-sm font-mono text-amber-300">{settings?.from_address || 'notifications@pixmatch.ai'}</div>
          </div>

          <div className="p-4 rounded-xl bg-[#070A0F] border border-card-border space-y-1">
            <div className="text-[10px] uppercase text-muted font-semibold">Reply-To Address</div>
            <div className="text-sm font-mono text-white/90">{settings?.reply_to || 'support@pixmatch.ai'}</div>
          </div>

          <div className="p-4 rounded-xl bg-[#070A0F] border border-card-border space-y-1">
            <div className="text-[10px] uppercase text-muted font-semibold">Credentials State</div>
            <div className="text-sm font-semibold flex items-center gap-2">
              {settings?.has_api_key || settings?.provider === 'CONSOLE_DEV' ? (
                <span className="text-emerald-400 flex items-center gap-1"><CheckCircle2 className="h-3.5 w-3.5" /> Configured in Environment</span>
              ) : (
                <span className="text-amber-400 flex items-center gap-1"><AlertCircle className="h-3.5 w-3.5" /> Not Configured</span>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
