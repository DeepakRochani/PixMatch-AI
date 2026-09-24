'use client';

import React, { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import {
  Sliders,
  Plus,
  ArrowLeft,
  Sparkles,
  ArrowRight,
  FolderOpen,
  Image as ImageIcon,
} from 'lucide-react';
import { PhotoEditJobDTO } from '@pixmatch/types';

export default function ProjectEditingTabPage() {
  const { id: projectId } = useParams<{ id: string }>();
  const [jobs, setJobs] = useState<PhotoEditJobDTO[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    async function loadJobs() {
      try {
        setIsLoading(true);
        const res = await fetch(`/api/v1/editing/jobs?projectId=${projectId}`);
        if (res.ok) {
          const data = await res.json();
          setJobs(data.jobs || data.data || []);
        }
      } catch (err) {
        console.error('Failed to load project edit jobs', err);
      } finally {
        setIsLoading(false);
      }
    }
    if (projectId) {
      loadJobs();
    }
  }, [projectId]);

  return (
    <div className="space-y-6 p-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between border-b border-zinc-800 pb-4">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Sliders className="w-5 h-5 text-cyan-400" />
            <span>Project Post-Production & Editing</span>
          </h2>
          <p className="text-xs text-zinc-400 mt-0.5">
            Non-destructive derivative edits, preset color grading, and AI enhancement suggestions.
          </p>
        </div>
        <Link
          href={`/dashboard/editing/new?projectId=${projectId}`}
          className="flex items-center gap-2 px-3.5 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white font-medium text-xs transition"
        >
          <Plus className="w-4 h-4" />
          <span>New Edit Job</span>
        </Link>
      </div>

      {isLoading ? (
        <div className="p-8 text-center text-zinc-500 text-xs">Loading edit jobs...</div>
      ) : jobs.length === 0 ? (
        <div className="p-10 rounded-xl bg-zinc-900/40 border border-dashed border-zinc-800 text-center space-y-2">
          <FolderOpen className="w-8 h-8 text-zinc-600 mx-auto" />
          <h4 className="text-sm font-medium text-zinc-300">No Edit Jobs for this Project</h4>
          <p className="text-xs text-zinc-500">Queue an edit job to apply non-destructive color grades.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {jobs.map((j) => (
            <div
              key={j.id}
              className="p-4 rounded-xl bg-zinc-900/60 border border-zinc-800 flex items-center justify-between hover:bg-zinc-800/30 transition"
            >
              <div>
                <span className="text-[10px] font-semibold uppercase px-2 py-0.5 rounded bg-zinc-800 text-zinc-300">
                  {j.status}
                </span>
                <h4 className="text-sm font-semibold text-white mt-1">Edit Job #{j.id.slice(0, 8)}</h4>
                <p className="text-xs text-zinc-500">Created {new Date(j.created_at).toLocaleDateString()}</p>
              </div>
              <Link
                href={`/dashboard/editing/${j.id}`}
                className="text-xs font-semibold text-cyan-400 hover:text-cyan-300 flex items-center gap-1"
              >
                <span>Inspector</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
