'use client';

import React, { useState, useEffect, use } from 'react';
import { fetchApi } from '@/lib/api-client';
import { IClientPortalDownloadDTO } from '@pixmatch/types';

export default function ClientPortalDownloadsPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const resolvedParams = use(params);
  const token = resolvedParams.token;

  const [downloads, setDownloads] = useState<IClientPortalDownloadDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  const loadDownloads = async () => {
    setLoading(true);
    const res = await fetchApi<IClientPortalDownloadDTO[]>(
      `/v1/public/client-portal/${token}/downloads`
    );
    if (res.success && res.data) {
      setDownloads(res.data);
    } else {
      setError(res.error?.message || 'Failed to load downloads.');
    }
    setLoading(false);
  };

  useEffect(() => {
    loadDownloads();
  }, [token]);

  const handleDownload = async (packageId: string) => {
    setDownloadingId(packageId);
    const res = await fetchApi<{ download_url: string; filename: string }>(
      `/v1/public/client-portal/${token}/downloads/${packageId}/file`
    );
    setDownloadingId(null);
    if (res.success && res.data?.download_url) {
      window.open(res.data.download_url, '_blank');
      loadDownloads();
    } else {
      alert(res.error?.message || 'Failed to generate secure download URL.');
    }
  };

  if (loading) {
    return (
      <div className="space-y-4 animate-pulse">
        <div className="h-8 w-48 bg-slate-900 rounded" />
        <div className="h-44 bg-slate-900 rounded-2xl border border-slate-800" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold text-slate-100 tracking-tight">
          Digital Downloads
        </h1>
        <p className="text-sm text-slate-400">
          Download your high-resolution original photos and curated digital packages.
        </p>
      </div>

      {error ? (
        <div className="bg-rose-500/10 border border-rose-500/20 rounded-2xl p-6 text-rose-300 text-center">
          {error}
        </div>
      ) : downloads.length === 0 ? (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-12 text-center space-y-3">
          <div className="w-12 h-12 bg-slate-800 rounded-full flex items-center justify-center mx-auto text-xl">
            ⬇️
          </div>
          <h3 className="text-lg font-bold text-slate-200">No Downloads Available</h3>
          <p className="text-sm text-slate-400 max-w-sm mx-auto">
            When digital packages or high-res photo archives are ready, they will appear here for
            download.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {downloads.map((pkg) => (
            <div
              key={pkg.id}
              className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-md hover:border-slate-700 transition-all flex flex-col justify-between space-y-4"
            >
              <div className="space-y-2">
                <div className="flex items-start justify-between">
                  <h3 className="text-lg font-bold text-slate-100">{pkg.name}</h3>
                  <span
                    className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      pkg.is_expired
                        ? 'bg-rose-500/20 text-rose-300'
                        : pkg.is_ready
                        ? 'bg-emerald-500/20 text-emerald-300'
                        : 'bg-amber-500/20 text-amber-300'
                    }`}
                  >
                    {pkg.is_expired ? 'Expired' : pkg.is_ready ? 'Ready' : 'Processing'}
                  </span>
                </div>
                {pkg.project_name && (
                  <p className="text-xs text-slate-400">Project: {pkg.project_name}</p>
                )}
                <p className="text-xs text-slate-400">
                  {pkg.photo_count} Photos • File size: {pkg.file_size_formatted}
                </p>
                {pkg.downloads_remaining !== null && (
                  <p className="text-xs text-slate-500">
                    Remaining downloads: {pkg.downloads_remaining}
                  </p>
                )}
                {pkg.expires_at && (
                  <p className="text-[11px] text-slate-500">
                    Expires on {new Date(pkg.expires_at).toLocaleDateString()}
                  </p>
                )}
              </div>

              <div className="pt-4 border-t border-slate-800/80">
                <button
                  onClick={() => handleDownload(pkg.id)}
                  disabled={!pkg.is_ready || pkg.is_expired || downloadingId === pkg.id}
                  className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white rounded-xl text-sm font-semibold transition-all shadow-md flex items-center justify-center space-x-2"
                >
                  <span>⬇️</span>
                  <span>
                    {downloadingId === pkg.id
                      ? 'Generating Secure Link...'
                      : pkg.is_expired
                      ? 'Download Link Expired'
                      : 'Download ZIP Archive'}
                  </span>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
