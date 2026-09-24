'use client';

import React, { useState, useEffect, use } from 'react';
import { fetchApi } from '@/lib/api-client';
import { PhotoProofingSessionDTO, ProofingReviewDecision } from '@pixmatch/types';

export default function ProjectProofingTabPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const projectId = resolvedParams.id;

  const [sessions, setSessions] = useState<PhotoProofingSessionDTO[]>([]);
  const [loading, setLoading] = useState(true);

  const loadSessions = async () => {
    setLoading(true);
    const res = await fetchApi<PhotoProofingSessionDTO[]>(`/v1/proofing/sessions?project_id=${projectId}`);
    if (res.success && res.data) {
      setSessions(res.data);
    }
    setLoading(false);
  };

  useEffect(() => {
    loadSessions();
  }, [projectId]);

  return (
    <div className="p-6 space-y-6 text-slate-100 font-sans">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold">Project Client Proofing</h2>
          <p className="text-xs text-slate-400 mt-0.5">Proofing sessions and photo selections linked to this project.</p>
        </div>
      </div>

      {loading ? (
        <div className="py-12 text-center text-slate-500 text-xs">Loading project proofing data...</div>
      ) : sessions.length === 0 ? (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 text-center space-y-3">
          <p className="text-3xl">🖼️</p>
          <h3 className="font-semibold text-sm">No Active Proofing Session</h3>
          <p className="text-xs text-slate-400 max-w-sm mx-auto">
            Create a proofing session from the Proofing Dashboard to allow clients to select photos.
          </p>
        </div>
      ) : (
        <div className="grid gap-4">
          {sessions.map((s) => (
            <div key={s.id} className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-sm text-slate-200">{s.name}</h3>
                  <p className="text-xs text-slate-400">{s.gallery?.title} • Status: <strong className="text-indigo-400">{s.status}</strong></p>
                </div>
                <span className="text-xs px-2.5 py-1 rounded-full bg-slate-800 border border-slate-700 font-medium">
                  {s.quota?.selected_count} / {s.quota?.included_count} Selected
                </span>
              </div>

              {s.quota?.extra_count && s.quota.extra_count > 0 ? (
                <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs p-3 rounded-xl flex items-center justify-between">
                  <span>Extra Photos Surcharge ({s.quota.extra_count} photos)</span>
                  <span className="font-bold">{s.quota.formatted_extra_total}</span>
                </div>
              ) : null}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
