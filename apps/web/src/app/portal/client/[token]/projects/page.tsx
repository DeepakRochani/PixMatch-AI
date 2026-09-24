'use client';

import React, { useState, useEffect, use } from 'react';
import Link from 'next/link';
import { fetchApi } from '@/lib/api-client';
import { IClientPortalProjectDTO } from '@pixmatch/types';

export default function ClientPortalProjectsPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const resolvedParams = use(params);
  const token = resolvedParams.token;

  const [projects, setProjects] = useState<IClientPortalProjectDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadProjects = async () => {
      setLoading(true);
      const res = await fetchApi<IClientPortalProjectDTO[]>(
        `/v1/public/client-portal/${token}/projects`
      );
      if (res.success && res.data) {
        setProjects(res.data);
      } else {
        setError(res.error?.message || 'Failed to load client projects.');
      }
      setLoading(false);
    };

    loadProjects();
  }, [token]);

  if (loading) {
    return (
      <div className="space-y-4 animate-pulse">
        <div className="h-8 w-48 bg-slate-900 rounded" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="h-44 bg-slate-900 rounded-2xl border border-slate-800" />
          <div className="h-44 bg-slate-900 rounded-2xl border border-slate-800" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-100 tracking-tight">Your Projects</h1>
          <p className="text-sm text-slate-400">
            View all photography collections and active assignments.
          </p>
        </div>
      </div>

      {error ? (
        <div className="bg-rose-500/10 border border-rose-500/20 rounded-2xl p-6 text-rose-300 text-center">
          {error}
        </div>
      ) : projects.length === 0 ? (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-12 text-center space-y-3">
          <div className="w-12 h-12 bg-slate-800 rounded-full flex items-center justify-center mx-auto text-xl">
            📁
          </div>
          <h3 className="text-lg font-bold text-slate-200">No Projects Found</h3>
          <p className="text-sm text-slate-400 max-w-sm mx-auto">
            Your studio has not yet assigned any projects to your client portal.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {projects.map((p) => (
            <div
              key={p.id}
              className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-md hover:border-slate-700 transition-all space-y-4 flex flex-col justify-between"
            >
              <div className="space-y-2">
                <div className="flex items-start justify-between">
                  <span className="text-xs font-semibold text-indigo-400 uppercase tracking-wider">
                    {p.project_type.replace(/_/g, ' ')}
                  </span>
                  <span className="px-2.5 py-0.5 bg-slate-800 text-slate-300 border border-slate-700 rounded-full text-xs font-medium">
                    {p.status}
                  </span>
                </div>
                <h3 className="text-xl font-bold text-slate-100">{p.name}</h3>
                {p.location && <p className="text-xs text-slate-400">📍 {p.location}</p>}
                {p.event_date && (
                  <p className="text-xs text-slate-400">
                    📅 {new Date(p.event_date).toLocaleDateString()}
                  </p>
                )}
                {p.description && (
                  <p className="text-xs text-slate-400 line-clamp-2 pt-1">{p.description}</p>
                )}
              </div>

              <div className="pt-4 border-t border-slate-800/80 flex items-center justify-between">
                <div className="text-xs text-slate-400 space-x-3">
                  <span>{p.galleries_count} Galleries</span>
                  <span>•</span>
                  <span>{p.orders_count} Orders</span>
                </div>

                <div className="flex items-center space-x-2">
                  {p.primary_gallery_slug && (
                    <Link
                      href={`/gallery/${p.primary_gallery_slug}`}
                      target="_blank"
                      className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-semibold transition-colors"
                    >
                      Gallery
                    </Link>
                  )}
                  <Link
                    href={`/portal/client/${token}/projects/${p.id}`}
                    className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-lg text-xs font-semibold transition-colors"
                  >
                    Details →
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
