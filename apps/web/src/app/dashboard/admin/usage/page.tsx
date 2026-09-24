'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  HardDrive,
  Images,
  Sparkles,
  Download,
  Mail,
  AlertTriangle,
  RefreshCw,
  Building2,
  ExternalLink,
} from 'lucide-react';
import { fetchApi } from '@/lib/api-client';
import { AdminPlatformUsageDTO } from '@pixmatch/types';

function formatBytes(bytes: number): string {
  if (!bytes || bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

export default function AdminUsagePage() {
  const [data, setData] = useState<AdminPlatformUsageDTO | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const loadUsage = async () => {
    setIsLoading(true);
    try {
      const res = await fetchApi<AdminPlatformUsageDTO>('/admin/usage');
      if (res.success && res.data) {
        setData(res.data);
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadUsage();
  }, []);

  const totals = data?.totals;
  const consumers = data?.top_consumers;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2.5">
            <HardDrive className="h-6 w-6 text-rose-400" /> Platform Resource Usage
          </h1>
          <p className="text-xs text-muted mt-1">
            Global footprint of storage bytes, photos, AI index vectors, bandwidth downloads, and quota warnings.
          </p>
        </div>

        <button
          onClick={() => loadUsage()}
          disabled={isLoading}
          className="p-2 rounded-xl bg-[#131B2A] border border-card-border/80 text-muted hover:text-white transition"
        >
          <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin text-rose-400' : ''}`} />
        </button>
      </div>

      {/* Global Resource Totals */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="p-4 rounded-xl bg-[#0E1422] border border-card-border/80 text-center">
          <span className="text-[11px] text-muted block">Storage Used</span>
          <span className="text-base font-extrabold text-white font-mono">
            {totals ? formatBytes(totals.storage_bytes) : '—'}
          </span>
        </div>
        <div className="p-4 rounded-xl bg-[#0E1422] border border-card-border/80 text-center">
          <span className="text-[11px] text-muted block">Total Photos</span>
          <span className="text-base font-extrabold text-cyan-400 font-mono">
            {totals ? totals.photos_count.toLocaleString() : '—'}
          </span>
        </div>
        <div className="p-4 rounded-xl bg-[#0E1422] border border-card-border/80 text-center">
          <span className="text-[11px] text-muted block">Total Galleries</span>
          <span className="text-base font-extrabold text-white font-mono">
            {totals ? totals.galleries_count.toLocaleString() : '—'}
          </span>
        </div>
        <div className="p-4 rounded-xl bg-[#0E1422] border border-card-border/80 text-center">
          <span className="text-[11px] text-muted block">AI Indexed</span>
          <span className="text-base font-extrabold text-amber-400 font-mono">
            {totals ? totals.ai_indexed_photos_count.toLocaleString() : '—'}
          </span>
        </div>
        <div className="p-4 rounded-xl bg-[#0E1422] border border-card-border/80 text-center">
          <span className="text-[11px] text-muted block">AI Searches</span>
          <span className="text-base font-extrabold text-purple-400 font-mono">
            {totals ? totals.ai_searches_count.toLocaleString() : '—'}
          </span>
        </div>
        <div className="p-4 rounded-xl bg-[#0E1422] border border-card-border/80 text-center">
          <span className="text-[11px] text-muted block">ZIP Downloads</span>
          <span className="text-base font-extrabold text-emerald-400 font-mono">
            {totals ? totals.downloads_count.toLocaleString() : '—'}
          </span>
        </div>
      </div>

      {/* Quota Threshold Warnings Section */}
      <div className="rounded-2xl bg-[#0E1422] border border-card-border/80 p-6 space-y-4">
        <h3 className="text-sm font-bold text-white flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 text-amber-400" /> Quota Threshold Warnings (80% / 90% / 100%)
        </h3>
        <p className="text-xs text-muted">
          Tenants approaching or reaching storage and AI indexing limits. Accounts are monitored non-destructively without sudden disruption.
        </p>

        {data?.usage_warnings && data.usage_warnings.length > 0 ? (
          <div className="space-y-2 pt-2">
            {data.usage_warnings.map((w, i) => (
              <div
                key={i}
                className={`p-3.5 rounded-xl border flex items-center justify-between text-xs ${
                  w.usage_percent >= 100
                    ? 'bg-red-500/10 border-red-500/30 text-red-300'
                    : w.usage_percent >= 90
                    ? 'bg-amber-500/10 border-amber-500/30 text-amber-300'
                    : 'bg-blue-500/10 border-blue-500/30 text-blue-300'
                }`}
              >
                <div className="flex items-center gap-3">
                  <span className="px-2 py-0.5 rounded font-mono font-bold uppercase text-[10px] bg-black/40">
                    {w.tier}
                  </span>
                  <div>
                    <span className="font-bold text-white">{w.studio_name}</span>
                    <span className="text-muted ml-2">Resource: {w.metric}</span>
                  </div>
                </div>
                <span className="font-mono text-[11px] text-amber-300 font-bold">
                  {w.usage_percent}% of limit
                </span>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-xs text-muted pt-2">No studios currently exceeding the 80% quota threshold.</p>
        )}
      </div>

      {/* Top Consumers Leaderboards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Top Storage Studios */}
        <div className="rounded-2xl bg-[#0E1422] border border-card-border/80 p-6 space-y-4">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <HardDrive className="h-4 w-4 text-rose-400" /> Top Storage Consumers
          </h3>
          <div className="space-y-2 text-xs">
            {consumers?.storage && consumers.storage.length > 0 ? (
              consumers.storage.map((s, idx) => (
                <div key={s.studio_id} className="p-3 rounded-xl bg-[#131B2A] flex justify-between items-center">
                  <div className="flex items-center gap-2.5">
                    <span className="font-mono text-muted font-bold text-[10px]">#{idx + 1}</span>
                    <Link
                      href={`/dashboard/admin/studios/${s.studio_id}`}
                      className="font-semibold text-white hover:text-rose-300 transition flex items-center gap-1"
                    >
                      {s.studio_name}
                    </Link>
                  </div>
                  <span className="font-mono font-bold text-rose-300">{formatBytes(s.bytes)}</span>
                </div>
              ))
            ) : (
              <p className="text-xs text-muted">No storage telemetry available.</p>
            )}
          </div>
        </div>

        {/* Top AI Consumers */}
        <div className="rounded-2xl bg-[#0E1422] border border-card-border/80 p-6 space-y-4">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-amber-400" /> Top AI Vector Index Studios
          </h3>
          <div className="space-y-2 text-xs">
            {consumers?.ai_searches && consumers.ai_searches.length > 0 ? (
              consumers.ai_searches.map((s, idx) => (
                <div key={s.studio_id} className="p-3 rounded-xl bg-[#131B2A] flex justify-between items-center">
                  <div className="flex items-center gap-2.5">
                    <span className="font-mono text-muted font-bold text-[10px]">#{idx + 1}</span>
                    <Link
                      href={`/dashboard/admin/studios/${s.studio_id}`}
                      className="font-semibold text-white hover:text-amber-300 transition flex items-center gap-1"
                    >
                      {s.studio_name}
                    </Link>
                  </div>
                  <span className="font-mono font-bold text-amber-300">{s.count.toLocaleString()} searches</span>
                </div>
              ))
            ) : (
              <p className="text-xs text-muted">No AI usage telemetry available.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
