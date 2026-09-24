'use client';

import React, { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import {
  Layers,
  Plus,
  ArrowLeft,
  CheckCircle2,
  Clock,
  Sparkles,
  ArrowRight,
  FolderOpen,
  Image as ImageIcon,
} from 'lucide-react';
import { PhotoCullSessionDTO } from '@pixmatch/types';

export default function ProjectCullingTabPage() {
  const { id: projectId } = useParams<{ id: string }>();
  const [sessions, setSessions] = useState<PhotoCullSessionDTO[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    async function loadSessions() {
      try {
        setIsLoading(true);
        const res = await fetch(`/api/v1/culling/sessions?projectId=${projectId}`);
        if (res.ok) {
          const data = await res.json();
          setSessions(data.sessions || data.data || []);
        }
      } catch (err) {
        console.error('Failed to load project culling sessions', err);
      } finally {
        setIsLoading(false);
      }
    }
    if (projectId) {
      loadSessions();
    }
  }, [projectId]);

  return (
    <div className="space-y-6 p-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between border-b border-zinc-800 pb-4">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Layers className="w-5 h-5 text-violet-400" />
            <span>Project Culling Sessions</span>
          </h2>
          <p className="text-xs text-zinc-400 mt-0.5">
            AI-assisted photo culling, sharpness analysis, and burst grouping for this project.
          </p>
        </div>
        <Link
          href={`/dashboard/culling/new?projectId=${projectId}`}
          className="flex items-center gap-2 px-3.5 py-1.5 rounded-lg bg-violet-600 hover:bg-violet-500 text-white font-medium text-xs transition"
        >
          <Plus className="w-4 h-4" />
          <span>New Session</span>
        </Link>
      </div>

      {isLoading ? (
        <div className="p-8 text-center text-zinc-500 text-xs">Loading sessions...</div>
      ) : sessions.length === 0 ? (
        <div className="p-10 rounded-xl bg-zinc-900/40 border border-dashed border-zinc-800 text-center space-y-2">
          <FolderOpen className="w-8 h-8 text-zinc-600 mx-auto" />
          <h4 className="text-sm font-medium text-zinc-300">No Culling Sessions for this Project</h4>
          <p className="text-xs text-zinc-500">Create a culling session once project media is ingested.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {sessions.map((s) => (
            <div key={s.id} className="p-5 rounded-xl bg-zinc-900/60 border border-zinc-800 space-y-3">
              <div className="flex justify-between items-start">
                <div>
                  <span className="text-[10px] font-semibold uppercase px-2 py-0.5 rounded bg-zinc-800 text-zinc-300">
                    {s.status}
                  </span>
                  <h4 className="text-base font-semibold text-white mt-2">{s.name}</h4>
                </div>
              </div>
              <div className="text-xs text-zinc-400">
                Photos: {s.reviewed_count} / {s.total_photos} ({s.kept_count} Kept, {s.rejected_count} Rejected)
              </div>
              <div className="pt-3 border-t border-zinc-800/80 flex justify-end">
                <Link
                  href={`/dashboard/culling/${s.id}`}
                  className="text-xs font-semibold text-violet-400 hover:text-violet-300 flex items-center gap-1"
                >
                  <span>Open Culler</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
