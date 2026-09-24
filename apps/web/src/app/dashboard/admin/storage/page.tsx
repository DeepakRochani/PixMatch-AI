'use client';

import React, { useEffect, useState } from 'react';
import {
  HardDrive,
  Cloud,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  Lock,
} from 'lucide-react';
import { fetchApi } from '@/lib/api-client';
import { AdminStorageOperationsDTO } from '@pixmatch/types';

function formatBytes(bytes: number): string {
  if (!bytes || bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

export default function AdminStorageOperationsPage() {
  const [data, setData] = useState<AdminStorageOperationsDTO | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const loadStorageOps = async () => {
    setIsLoading(true);
    try {
      const res = await fetchApi<AdminStorageOperationsDTO>('/admin/storage');
      if (res.success && res.data) {
        setData(res.data);
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadStorageOps();
  }, []);

  const totals = data?.totals;
  const conns = data?.connections;

  const providers = [
    { name: 'Platform Local Storage', bytes: totals?.platform_bytes || 0 },
    { name: 'Google Drive', bytes: totals?.google_drive_bytes || 0 },
    { name: 'Dropbox', bytes: totals?.dropbox_bytes || 0 },
    { name: 'OneDrive', bytes: totals?.onedrive_bytes || 0 },
    { name: 'AWS S3', bytes: totals?.s3_bytes || 0 },
    { name: 'Cloudflare R2', bytes: totals?.r2_bytes || 0 },
    { name: 'External URL Storage', bytes: totals?.external_url_bytes || 0 },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2.5">
            <HardDrive className="h-6 w-6 text-rose-400" /> Multi-Cloud Storage Operations
          </h1>
          <p className="text-xs text-muted mt-1">
            Global distribution across Platform Local Storage, Google Drive, Dropbox, OneDrive, AWS S3, Cloudflare R2, and External URLs.
          </p>
        </div>

        <button
          onClick={() => loadStorageOps()}
          disabled={isLoading}
          className="p-2 rounded-xl bg-[#131B2A] border border-card-border/80 text-muted hover:text-white transition"
        >
          <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin text-rose-400' : ''}`} />
        </button>
      </div>

      {/* Zero Credential Exposure Banner */}
      <div className="rounded-2xl bg-emerald-500/10 border border-emerald-500/30 p-4 flex items-center gap-3 text-xs text-emerald-200">
        <Lock className="h-4 w-4 text-emerald-400 flex-shrink-0" />
        <span>
          <strong>Credential Protection:</strong> OAuth tokens, S3 secret access keys, encryption secrets, and direct customer original download URLs are strictly sanitized and never returned in admin API responses.
        </span>
      </div>

      {/* Provider Distribution Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {providers.map((p) => (
          <div key={p.name} className="rounded-2xl bg-[#0E1422] border border-card-border/80 p-5 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-white uppercase font-mono">{p.name}</span>
              <Cloud className="h-4 w-4 text-rose-400" />
            </div>
            <p className="text-xl font-extrabold text-white font-mono">{formatBytes(p.bytes)}</p>
            <div className="flex justify-between text-[10px] text-muted">
              <span>Encrypted & Indexed</span>
              <span>{conns?.connected_studios_count || 0} studios</span>
            </div>
          </div>
        ))}
      </div>

      {/* Storage Health & Sync Diagnostics */}
      <div className="rounded-2xl bg-[#0E1422] border border-card-border/80 p-6 space-y-4">
        <h3 className="text-sm font-bold text-white flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4 text-emerald-400" /> Provider Sync Diagnostics & Error Monitor
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
          <div className="p-4 rounded-xl bg-[#131B2A] border border-card-border space-y-1">
            <span className="text-muted block">Sync Failures</span>
            <span className="text-lg font-bold text-emerald-400 font-mono">{conns?.sync_failures_count || 0}</span>
            <span className="text-[10px] text-muted block">Auto-retried in BullMQ background queue</span>
          </div>

          <div className="p-4 rounded-xl bg-[#131B2A] border border-card-border space-y-1">
            <span className="text-muted block">Missing Remote Objects</span>
            <span className="text-lg font-bold text-emerald-400 font-mono">{conns?.missing_files_count || 0}</span>
            <span className="text-[10px] text-muted block">Consistent with cloud trash policies</span>
          </div>

          <div className="p-4 rounded-xl bg-[#131B2A] border border-card-border space-y-1">
            <span className="text-muted block">Stale OAuth Connections</span>
            <span className="text-lg font-bold text-emerald-400 font-mono">{conns?.stale_connections_count || 0}</span>
            <span className="text-[10px] text-muted block">Tokens refreshed via background scheduler</span>
          </div>
        </div>
      </div>
    </div>
  );
}
