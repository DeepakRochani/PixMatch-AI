'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Layers,
  ArrowLeft,
  Check,
  X,
  HelpCircle,
  RotateCcw,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  Eye,
  Sliders,
  Filter,
  Grid,
  Maximize2,
  Lock,
  Unlock,
  Star,
  Tag,
  ShieldCheck,
  Zap,
} from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import {
  PhotoCullCandidateDTO,
  PhotoCullSessionDTO,
  CullDecisionType,
  CullRecommendation,
} from '@pixmatch/types';

export default function CullingWorkspacePage() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const router = useRouter();
  const { user, studio } = useAuth();

  const [session, setSession] = useState<PhotoCullSessionDTO | null>(null);
  const [candidates, setCandidates] = useState<PhotoCullCandidateDTO[]>([]);
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [viewMode, setViewMode] = useState<'single' | 'grid' | 'compare'>('single');
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [filterDecision, setFilterDecision] = useState<string>('ALL');
  const [isLocked, setIsLocked] = useState<boolean>(true);
  const [undoHistory, setUndoHistory] = useState<string[]>([]);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);

  const fetchSessionData = async () => {
    try {
      setIsLoading(true);
      const [sessRes, candRes] = await Promise.all([
        fetch(`/api/v1/culling/sessions/${sessionId}`),
        fetch(`/api/v1/culling/sessions/${sessionId}/candidates`),
      ]);

      if (sessRes.ok) {
        const sData = await sessRes.json();
        setSession(sData.session || sData.data);
      }
      if (candRes.ok) {
        const cData = await candRes.json();
        setCandidates(cData.candidates || cData.data || []);
      }
    } catch (err) {
      console.error('Failed to load session details', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (sessionId) {
      fetchSessionData();
    }
  }, [sessionId]);

  const currentPhoto = candidates[currentIndex] || null;

  const handleDecision = useCallback(
    async (decision: CullDecisionType) => {
      if (!currentPhoto || !sessionId || isProcessing) return;
      try {
        setIsProcessing(true);
        const res = await fetch(`/api/v1/culling/sessions/${sessionId}/decisions`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            photo_id: currentPhoto.photo_id,
            decision,
          }),
        });

        if (res.ok) {
          // Update local candidate state
          setCandidates((prev) =>
            prev.map((c, i) =>
              i === currentIndex
                ? {
                    ...c,
                    decision: {
                      ...c.decision!,
                      decision,
                      decided_at: new Date().toISOString(),
                    },
                  }
                : c
            )
          );
          setUndoHistory((prev) => [currentPhoto.photo_id, ...prev]);

          // Auto-advance to next photo if in single view
          if (currentIndex < candidates.length - 1) {
            setCurrentIndex((prev) => prev + 1);
          }
        }
      } catch (err) {
        console.error('Failed to record decision', err);
      } finally {
        setIsProcessing(false);
      }
    },
    [currentPhoto, sessionId, currentIndex, candidates.length, isProcessing]
  );

  const handleUndo = async () => {
    if (undoHistory.length === 0 || !sessionId || isProcessing) return;
    const lastPhotoId = undoHistory[0];
    try {
      setIsProcessing(true);
      const res = await fetch(`/api/v1/culling/sessions/${sessionId}/undo`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      if (res.ok) {
        setUndoHistory((prev) => prev.slice(1));
        const prevIdx = candidates.findIndex((c) => c.photo_id === lastPhotoId);
        if (prevIdx !== -1) {
          setCurrentIndex(prevIdx);
        }
        await fetchSessionData();
      }
    } catch (err) {
      console.error('Failed to undo decision', err);
    } finally {
      setIsProcessing(false);
    }
  };

  // Keyboard navigation & decision shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      switch (e.key.toLowerCase()) {
        case 'k':
        case '1':
          e.preventDefault();
          handleDecision(CullDecisionType.PHOTOGRAPHER_KEEP);
          break;
        case 'x':
        case '2':
          e.preventDefault();
          handleDecision(CullDecisionType.PHOTOGRAPHER_REJECT);
          break;
        case 'm':
        case '3':
          e.preventDefault();
          handleDecision(CullDecisionType.PHOTOGRAPHER_MAYBE);
          break;
        case 'arrowleft':
        case 'j':
          e.preventDefault();
          setCurrentIndex((prev) => Math.max(0, prev - 1));
          break;
        case 'arrowright':
        case 'l':
          e.preventDefault();
          setCurrentIndex((prev) => Math.min(candidates.length - 1, prev + 1));
          break;
        case 'z':
          if (e.metaKey || e.ctrlKey) {
            e.preventDefault();
            handleUndo();
          }
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleDecision, candidates.length]);

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] bg-zinc-950 text-white overflow-hidden">
      {/* Top Action Bar */}
      <header className="h-14 border-b border-zinc-800 px-6 flex items-center justify-between bg-zinc-900/80 backdrop-blur-md">
        <div className="flex items-center gap-4">
          <Link
            href="/dashboard/culling"
            className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-sm font-semibold text-white flex items-center gap-2">
              <span>{session?.name || 'Culling Workspace'}</span>
              <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-violet-500/10 text-violet-400 border border-violet-500/20">
                AI ASSISTED
              </span>
            </h1>
            <p className="text-[11px] text-zinc-400">
              Photo {currentIndex + 1} of {candidates.length}
            </p>
          </div>
        </div>

        {/* View mode toggle & Undo */}
        <div className="flex items-center gap-2">
          <button
            onClick={handleUndo}
            disabled={undoHistory.length === 0 || isProcessing}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 disabled:opacity-40 text-xs text-zinc-300 transition"
            title="Undo Last Decision (Cmd+Z)"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Undo</span>
          </button>
          <div className="h-4 w-px bg-zinc-800 mx-1" />
          <div className="flex rounded-lg bg-zinc-800/80 p-0.5 border border-zinc-700/50">
            <button
              onClick={() => setViewMode('single')}
              className={`px-3 py-1 rounded text-xs font-medium transition ${
                viewMode === 'single' ? 'bg-zinc-700 text-white' : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              Single
            </button>
            <button
              onClick={() => setViewMode('grid')}
              className={`px-3 py-1 rounded text-xs font-medium transition ${
                viewMode === 'grid' ? 'bg-zinc-700 text-white' : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              Grid
            </button>
          </div>
        </div>
      </header>

      {/* Main Workspace Layout */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left / Center Viewport */}
        <div className="flex-1 flex flex-col bg-black/60 relative">
          {isLoading ? (
            <div className="flex-1 flex items-center justify-center text-zinc-500 text-sm">
              Loading candidates and AI scores...
            </div>
          ) : candidates.length === 0 ? (
            <div className="flex-1 flex items-center justify-center text-zinc-500 text-sm">
              No photos in this culling session.
            </div>
          ) : viewMode === 'single' && currentPhoto ? (
            <div className="flex-1 flex items-center justify-center p-6 relative">
              <div className="max-w-4xl max-h-[70vh] rounded-xl overflow-hidden border border-zinc-800 bg-zinc-900 shadow-2xl relative flex items-center justify-center">
                {/* Fallback image preview container */}
                <div className="w-[600px] h-[400px] bg-zinc-900 flex flex-col items-center justify-center text-zinc-500 relative">
                  <span className="text-zinc-400 font-mono text-sm">{currentPhoto.filename}</span>
                  <span className="text-xs text-zinc-600 mt-1">
                    {currentPhoto.camera_make} {currentPhoto.camera_model} • ISO {currentPhoto.iso} • {currentPhoto.shutter_speed}
                  </span>

                  {/* AI Recommendation Badge Overlay */}
                  <div className="absolute top-4 left-4 flex items-center gap-2">
                    <span
                      className={`px-2.5 py-1 rounded-full text-xs font-bold uppercase tracking-wider backdrop-blur-md shadow-lg ${
                        currentPhoto.ai_recommendation === 'KEEP'
                          ? 'bg-emerald-500/80 text-white'
                          : currentPhoto.ai_recommendation === 'REJECT'
                          ? 'bg-rose-500/80 text-white'
                          : 'bg-amber-500/80 text-white'
                      }`}
                    >
                      AI: {currentPhoto.ai_recommendation} ({currentPhoto.ai_score}/100)
                    </span>
                    {currentPhoto.is_burst_best && (
                      <span className="px-2 py-1 rounded-full text-xs font-bold bg-amber-400 text-black flex items-center gap-1 shadow-lg">
                        <Star className="w-3 h-3 fill-current" /> Best of Burst
                      </span>
                    )}
                  </div>

                  {/* Photographer Decision Badge Overlay */}
                  {currentPhoto.decision?.decision && (
                    <div className="absolute top-4 right-4">
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider border ${
                          currentPhoto.decision.decision === 'KEEP'
                            ? 'bg-emerald-600 text-white border-emerald-400'
                            : currentPhoto.decision.decision === 'REJECT'
                            ? 'bg-rose-600 text-white border-rose-400'
                            : 'bg-amber-600 text-white border-amber-400'
                        }`}
                      >
                        ✓ {currentPhoto.decision.decision}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Prev / Next floating triggers */}
              <button
                onClick={() => setCurrentIndex((prev) => Math.max(0, prev - 1))}
                disabled={currentIndex === 0}
                className="absolute left-4 p-3 rounded-full bg-zinc-900/80 border border-zinc-800 text-zinc-300 hover:text-white disabled:opacity-20 transition"
              >
                <ChevronLeft className="w-6 h-6" />
              </button>
              <button
                onClick={() => setCurrentIndex((prev) => Math.min(candidates.length - 1, prev + 1))}
                disabled={currentIndex === candidates.length - 1}
                className="absolute right-4 p-3 rounded-full bg-zinc-900/80 border border-zinc-800 text-zinc-300 hover:text-white disabled:opacity-20 transition"
              >
                <ChevronRight className="w-6 h-6" />
              </button>
            </div>
          ) : (
            /* Grid View */
            <div className="flex-1 overflow-y-auto p-6 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
              {candidates.map((c, idx) => (
                <div
                  key={c.photo_id}
                  onClick={() => {
                    setCurrentIndex(idx);
                    setViewMode('single');
                  }}
                  className={`p-2 rounded-xl bg-zinc-900 border cursor-pointer transition relative group ${
                    currentIndex === idx
                      ? 'border-violet-500 ring-2 ring-violet-500/20'
                      : 'border-zinc-800 hover:border-zinc-700'
                  }`}
                >
                  <div className="aspect-[3/2] bg-zinc-950 rounded-lg flex flex-col items-center justify-center text-xs text-zinc-500 p-2">
                    <span className="font-mono text-[10px] text-zinc-400 truncate w-full text-center">
                      {c.filename}
                    </span>
                    <span className="text-[10px] text-zinc-600 mt-1">Score: {c.ai_score}</span>
                  </div>

                  {c.decision?.decision && (
                    <div className="absolute top-3 right-3">
                      <span
                        className={`w-2.5 h-2.5 rounded-full inline-block ${
                          c.decision.decision === 'KEEP'
                            ? 'bg-emerald-400'
                            : c.decision.decision === 'REJECT'
                            ? 'bg-rose-400'
                            : 'bg-amber-400'
                        }`}
                      />
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Bottom Hotkey Decision Ribbon */}
          <div className="h-16 border-t border-zinc-800 px-8 flex items-center justify-between bg-zinc-900/90">
            <div className="flex items-center gap-2 text-xs text-zinc-500">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>Non-destructive: Rejections never delete physical source files.</span>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={() => handleDecision(CullDecisionType.PHOTOGRAPHER_KEEP)}
                disabled={isProcessing || !currentPhoto}
                className="flex items-center gap-2 px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs transition shadow-lg shadow-emerald-600/20"
              >
                <Check className="w-4 h-4" />
                <span>KEEP [K]</span>
              </button>
              <button
                onClick={() => handleDecision(CullDecisionType.PHOTOGRAPHER_MAYBE)}
                disabled={isProcessing || !currentPhoto}
                className="flex items-center gap-2 px-5 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs transition shadow-lg shadow-amber-600/20"
              >
                <HelpCircle className="w-4 h-4" />
                <span>MAYBE [M]</span>
              </button>
              <button
                onClick={() => handleDecision(CullDecisionType.PHOTOGRAPHER_REJECT)}
                disabled={isProcessing || !currentPhoto}
                className="flex items-center gap-2 px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs transition shadow-lg shadow-rose-600/20"
              >
                <X className="w-4 h-4" />
                <span>REJECT [X]</span>
              </button>
            </div>
          </div>
        </div>

        {/* Right Inspector Drawer (Score Breakdown & EXIF) */}
        {currentPhoto && (
          <aside className="w-80 border-l border-zinc-800 bg-zinc-900/60 p-6 flex flex-col justify-between overflow-y-auto">
            <div className="space-y-6">
              <div>
                <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-1">
                  Deterministic AI Score
                </h3>
                <div className="flex items-baseline gap-2">
                  <span className="text-4xl font-black text-white">{currentPhoto.ai_score}</span>
                  <span className="text-xs text-zinc-500">/ 100</span>
                </div>
              </div>

              {/* 8-Factor Score Breakdown */}
              <div className="space-y-3">
                <h4 className="text-xs font-medium text-zinc-400">Score Dimensions</h4>
                {currentPhoto.score_breakdown && (
                  <div className="space-y-2 text-xs">
                    <div className="flex justify-between items-center text-zinc-300">
                      <span>Sharpness (15%)</span>
                      <span className="font-mono text-zinc-400">{currentPhoto.score_breakdown.sharpness}/100</span>
                    </div>
                    <div className="flex justify-between items-center text-zinc-300">
                      <span>Exposure (10%)</span>
                      <span className="font-mono text-zinc-400">{currentPhoto.score_breakdown.exposure}/100</span>
                    </div>
                    <div className="flex justify-between items-center text-zinc-300">
                      <span>Composition (10%)</span>
                      <span className="font-mono text-zinc-400">{currentPhoto.score_breakdown.composition}/100</span>
                    </div>
                    <div className="flex justify-between items-center text-zinc-300">
                      <span>Expressions (10%)</span>
                      <span className="font-mono text-zinc-400">{currentPhoto.score_breakdown.eyes_expressions}/100</span>
                    </div>
                    <div className="flex justify-between items-center text-zinc-300">
                      <span>Technical Quality (25%)</span>
                      <span className="font-mono text-zinc-400">{currentPhoto.score_breakdown.technical_quality}/100</span>
                    </div>
                    <div className="flex justify-between items-center text-zinc-300">
                      <span>Event Relevance (10%)</span>
                      <span className="font-mono text-zinc-400">{currentPhoto.score_breakdown.event_relevance}/100</span>
                    </div>
                  </div>
                )}
              </div>

              {/* EXIF Metadata */}
              <div className="space-y-2 pt-4 border-t border-zinc-800 text-xs">
                <h4 className="font-medium text-zinc-400">Camera Metadata</h4>
                <div className="grid grid-cols-2 gap-2 text-zinc-300">
                  <div>
                    <span className="text-zinc-500 block text-[10px]">Aperture</span>
                    <span className="font-mono">{currentPhoto.aperture || 'f/2.8'}</span>
                  </div>
                  <div>
                    <span className="text-zinc-500 block text-[10px]">Shutter</span>
                    <span className="font-mono">{currentPhoto.shutter_speed || '1/250s'}</span>
                  </div>
                  <div>
                    <span className="text-zinc-500 block text-[10px]">ISO</span>
                    <span className="font-mono">{currentPhoto.iso || '400'}</span>
                  </div>
                  <div>
                    <span className="text-zinc-500 block text-[10px]">Focal Length</span>
                    <span className="font-mono">{currentPhoto.focal_length || '85mm'}</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="pt-6 border-t border-zinc-800 text-[11px] text-zinc-500 space-y-1">
              <div>Session ID: {sessionId}</div>
              <div>Hotkeys: K (Keep), X (Reject), M (Maybe), Arrows (Nav)</div>
            </div>
          </aside>
        )}
      </div>
    </div>
  );
}
