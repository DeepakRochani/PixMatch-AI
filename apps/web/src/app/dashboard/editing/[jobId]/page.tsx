'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Sliders,
  ArrowLeft,
  Sparkles,
  Check,
  RotateCcw,
  Save,
  Wand2,
  Layers,
  Eye,
  SplitSquareVertical,
  ShieldCheck,
} from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import {
  PhotoEditJobDTO,
  PhotoEditSuggestionDTO,
  PhotoEditVersionDTO,
  EditParametersDTO,
} from '@pixmatch/types';

export default function EditJobInspectorPage() {
  const { jobId } = useParams<{ jobId: string }>();
  const router = useRouter();
  const { user, studio } = useAuth();

  const [job, setJob] = useState<PhotoEditJobDTO | null>(null);
  const [suggestions, setSuggestions] = useState<PhotoEditSuggestionDTO[]>([]);
  const [versions, setVersions] = useState<PhotoEditVersionDTO[]>([]);
  const [params, setParams] = useState<EditParametersDTO>({
    exposure: 0,
    contrast: 0,
    highlights: 0,
    shadows: 0,
    temperature: 0,
    tint: 0,
    saturation: 0,
    sharpness: 0,
  });
  const [showOriginal, setShowOriginal] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSaving, setIsSaving] = useState<boolean>(false);

  const fetchJobData = async () => {
    try {
      setIsLoading(true);
      const [jobRes, suggRes, verRes] = await Promise.all([
        fetch(`/api/v1/editing/jobs/${jobId}`),
        fetch(`/api/v1/editing/jobs/${jobId}/suggestions`),
        fetch(`/api/v1/editing/jobs/${jobId}/versions`),
      ]);

      if (jobRes.ok) {
        const jData = await jobRes.json();
        const foundJob = jData.job || jData.data;
        setJob(foundJob);
        if (foundJob?.parameters) {
          setParams((prev) => ({ ...prev, ...foundJob.parameters }));
        }
      }
      if (suggRes.ok) {
        const sData = await suggRes.json();
        setSuggestions(sData.suggestions || sData.data || []);
      }
      if (verRes.ok) {
        const vData = await verRes.json();
        setVersions(vData.versions || vData.data || []);
      }
    } catch (err) {
      console.error('Failed to load edit job data', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (jobId) {
      fetchJobData();
    }
  }, [jobId]);

  const handleParamChange = (field: keyof EditParametersDTO, val: number) => {
    setParams((prev) => ({ ...prev, [field]: val }));
  };

  const handleApplySuggestion = async (suggestion: PhotoEditSuggestionDTO) => {
    const changes = suggestion.parameter_changes || suggestion.suggested_params;
    if (changes) {
      setParams((prev) => ({ ...prev, ...changes }));
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] bg-zinc-950 text-white overflow-hidden">
      {/* Header */}
      <header className="h-14 border-b border-zinc-800 px-6 flex items-center justify-between bg-zinc-900/80 backdrop-blur-md">
        <div className="flex items-center gap-4">
          <Link
            href="/dashboard/editing"
            className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-sm font-semibold text-white flex items-center gap-2">
              <span>Edit Job #{jobId?.slice(0, 8)}</span>
              <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                NON-DESTRUCTIVE DERIVATIVE
              </span>
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onMouseDown={() => setShowOriginal(true)}
            onMouseUp={() => setShowOriginal(false)}
            onMouseLeave={() => setShowOriginal(false)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-xs text-zinc-300 transition"
          >
            <Eye className="w-3.5 h-3.5" />
            <span>Hold to View Original</span>
          </button>
          <button
            onClick={() => {}}
            disabled={isSaving}
            className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-xs font-semibold text-white transition shadow-lg shadow-cyan-600/20"
          >
            <Save className="w-3.5 h-3.5" />
            <span>Save Version</span>
          </button>
        </div>
      </header>

      {/* Main Layout */}
      <div className="flex-1 flex overflow-hidden">
        {/* Canvas / Preview */}
        <div className="flex-1 bg-black/60 flex items-center justify-center p-6 relative">
          <div className="w-[600px] h-[400px] rounded-xl bg-zinc-900 border border-zinc-800 flex flex-col items-center justify-center relative shadow-2xl overflow-hidden">
            <span className="text-sm font-mono text-zinc-400">
              {showOriginal ? 'ORIGINAL MASTER PREVIEW' : 'EDITED DERIVATIVE PREVIEW'}
            </span>
            <span className="text-xs text-zinc-600 mt-1">
              Exposure: {params.exposure} • Contrast: {params.contrast} • Temp: {params.temperature}
            </span>

            {showOriginal && (
              <div className="absolute top-4 left-4 px-2.5 py-1 rounded bg-amber-500 text-black text-xs font-bold shadow">
                ORIGINAL MASTER
              </div>
            )}
          </div>
        </div>

        {/* Right Adjustment Controls Drawer */}
        <aside className="w-88 border-l border-zinc-800 bg-zinc-900/60 p-6 overflow-y-auto space-y-6">
          {/* AI Suggestions Box */}
          {suggestions.length > 0 && (
            <div className="p-4 rounded-xl bg-violet-500/10 border border-violet-500/20 space-y-2.5">
              <div className="flex items-center gap-2 text-violet-400 text-xs font-semibold">
                <Sparkles className="w-4 h-4" />
                <span>AI Auto-Enhance Suggestions</span>
              </div>
              <p className="text-xs text-zinc-300">
                {suggestions[0].explanation || 'Auto exposure and color balance recommendation.'}
              </p>
              <button
                onClick={() => handleApplySuggestion(suggestions[0])}
                className="w-full py-1.5 rounded-lg bg-violet-600 hover:bg-violet-500 text-white font-semibold text-xs transition"
              >
                Apply AI Adjustments
              </button>
            </div>
          )}

          {/* Tone & Color Adjustment Sliders */}
          <div className="space-y-4">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-400">Tone & Exposure</h3>

            <div className="space-y-3 text-xs">
              <div>
                <div className="flex justify-between text-zinc-300 mb-1">
                  <span>Exposure</span>
                  <span className="font-mono text-zinc-400">{params.exposure}</span>
                </div>
                <input
                  type="range"
                  min="-100"
                  max="100"
                  value={params.exposure || 0}
                  onChange={(e) => handleParamChange('exposure', parseInt(e.target.value))}
                  className="w-full accent-cyan-500 h-1.5 bg-zinc-800 rounded-lg appearance-none cursor-pointer"
                />
              </div>

              <div>
                <div className="flex justify-between text-zinc-300 mb-1">
                  <span>Contrast</span>
                  <span className="font-mono text-zinc-400">{params.contrast}</span>
                </div>
                <input
                  type="range"
                  min="-100"
                  max="100"
                  value={params.contrast || 0}
                  onChange={(e) => handleParamChange('contrast', parseInt(e.target.value))}
                  className="w-full accent-cyan-500 h-1.5 bg-zinc-800 rounded-lg appearance-none cursor-pointer"
                />
              </div>

              <div>
                <div className="flex justify-between text-zinc-300 mb-1">
                  <span>Highlights</span>
                  <span className="font-mono text-zinc-400">{params.highlights}</span>
                </div>
                <input
                  type="range"
                  min="-100"
                  max="100"
                  value={params.highlights || 0}
                  onChange={(e) => handleParamChange('highlights', parseInt(e.target.value))}
                  className="w-full accent-cyan-500 h-1.5 bg-zinc-800 rounded-lg appearance-none cursor-pointer"
                />
              </div>

              <div>
                <div className="flex justify-between text-zinc-300 mb-1">
                  <span>Shadows</span>
                  <span className="font-mono text-zinc-400">{params.shadows}</span>
                </div>
                <input
                  type="range"
                  min="-100"
                  max="100"
                  value={params.shadows || 0}
                  onChange={(e) => handleParamChange('shadows', parseInt(e.target.value))}
                  className="w-full accent-cyan-500 h-1.5 bg-zinc-800 rounded-lg appearance-none cursor-pointer"
                />
              </div>
            </div>
          </div>

          {/* Color Balance */}
          <div className="space-y-4 pt-4 border-t border-zinc-800">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-400">Color Balance</h3>

            <div className="space-y-3 text-xs">
              <div>
                <div className="flex justify-between text-zinc-300 mb-1">
                  <span>Temperature</span>
                  <span className="font-mono text-zinc-400">{params.temperature}</span>
                </div>
                <input
                  type="range"
                  min="-100"
                  max="100"
                  value={params.temperature || 0}
                  onChange={(e) => handleParamChange('temperature', parseInt(e.target.value))}
                  className="w-full accent-cyan-500 h-1.5 bg-zinc-800 rounded-lg appearance-none cursor-pointer"
                />
              </div>

              <div>
                <div className="flex justify-between text-zinc-300 mb-1">
                  <span>Tint</span>
                  <span className="font-mono text-zinc-400">{params.tint}</span>
                </div>
                <input
                  type="range"
                  min="-100"
                  max="100"
                  value={params.tint || 0}
                  onChange={(e) => handleParamChange('tint', parseInt(e.target.value))}
                  className="w-full accent-cyan-500 h-1.5 bg-zinc-800 rounded-lg appearance-none cursor-pointer"
                />
              </div>

              <div>
                <div className="flex justify-between text-zinc-300 mb-1">
                  <span>Saturation</span>
                  <span className="font-mono text-zinc-400">{params.saturation}</span>
                </div>
                <input
                  type="range"
                  min="-100"
                  max="100"
                  value={params.saturation || 0}
                  onChange={(e) => handleParamChange('saturation', parseInt(e.target.value))}
                  className="w-full accent-cyan-500 h-1.5 bg-zinc-800 rounded-lg appearance-none cursor-pointer"
                />
              </div>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
