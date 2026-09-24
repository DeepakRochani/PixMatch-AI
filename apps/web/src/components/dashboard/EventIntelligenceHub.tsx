'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  Sparkles,
  BookOpen,
  Calendar,
  Layers,
  Star,
  RefreshCw,
  Edit2,
  Check,
  Eye,
  EyeOff,
  GitMerge,
  Scissors,
  Share2,
  Loader2,
  Clock,
  Award,
  ChevronRight,
  Sliders,
  CheckCircle2,
  AlertCircle,
  FileText,
  Volume2,
} from 'lucide-react';
import { fetchApi } from '@/lib/api-client';

interface EventIntelligenceHubProps {
  galleryId: string;
  gallery: any;
  onRefreshGallery?: () => void;
}

export function EventIntelligenceHub({ galleryId, gallery, onRefreshGallery }: EventIntelligenceHubProps) {
  const [data, setData] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);
  const [activeTab, setActiveTab] = useState<'timeline' | 'highlights' | 'story'>('timeline');
  const [actionMessage, setActionMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Story state
  const [storyTone, setStoryTone] = useState<string>('CELEBRATORY');
  const [storyLength, setStoryLength] = useState<string>('STANDARD');
  const [photographerNotes, setPhotographerNotes] = useState<string>('');
  const [regeneratingStory, setRegeneratingStory] = useState(false);
  const [editingStory, setEditingStory] = useState(false);
  const [editedHeadline, setEditedHeadline] = useState('');
  const [editedSummary, setEditedSummary] = useState('');
  const [editedBody, setEditedBody] = useState('');

  // Chapter edit/merge/split state
  const [selectedChapterIds, setSelectedChapterIds] = useState<string[]>([]);
  const [mergeTitle, setMergeTitle] = useState('');
  const [mergeCategory, setMergeCategory] = useState('GENERAL');
  const [showMergeModal, setShowMergeModal] = useState(false);
  const [editingChapter, setEditingChapter] = useState<any | null>(null);
  const [chapterTitle, setChapterTitle] = useState('');
  const [chapterCategory, setChapterCategory] = useState('');

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetchApi(`/api/v1/event-intelligence/galleries/${galleryId}`);
      if (res && res.data) {
        setData(res.data);
        const story = res.data.stories?.[0];
        if (story) {
          setStoryTone(story.tone || 'CELEBRATORY');
          setStoryLength(story.length || 'STANDARD');
          setEditedHeadline(story.headline || '');
          setEditedSummary(story.summary || '');
          setEditedBody(story.body || '');
        }
      }
    } catch (err: any) {
      console.warn('Failed to load event intelligence:', err);
    } finally {
      setLoading(false);
    }
  }, [galleryId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleAnalyze = async () => {
    setAnalyzing(true);
    setActionMessage(null);
    try {
      const res = await fetchApi(`/api/v1/event-intelligence/galleries/${galleryId}/analyze`, {
        method: 'POST',
        body: JSON.stringify({
          forceReanalyze: true,
          storyTone,
          storyLength,
        }),
      });
      if (res && res.data) {
        setData(res.data);
        setActionMessage({ type: 'success', text: `Event analyzed successfully! Detected ${res.data.detectedEventType.replace(/_/g, ' ')} with ${res.data.totalChapters} chapters.` });
        if (onRefreshGallery) onRefreshGallery();
      }
    } catch (err: any) {
      setActionMessage({ type: 'error', text: err.message || 'Failed to analyze event.' });
    } finally {
      setAnalyzing(false);
    }
  };

  const handleManualEventType = async (newType: string) => {
    try {
      const res = await fetchApi(`/api/v1/event-intelligence/galleries/${galleryId}`, {
        method: 'PATCH',
        body: JSON.stringify({ manual_event_type: newType }),
      });
      if (res && res.data) {
        setData((prev: any) => ({ ...prev, manualEventType: newType, effectiveEventType: newType }));
        setActionMessage({ type: 'success', text: `Event type updated to ${newType.replace(/_/g, ' ')}.` });
      }
    } catch (err: any) {
      setActionMessage({ type: 'error', text: err.message || 'Failed to update event type.' });
    }
  };

  const handleToggleHighlightPin = async (highlightId: string, currentPinned: boolean) => {
    try {
      await fetchApi(`/api/v1/event-intelligence/galleries/${galleryId}/highlights/${highlightId}`, {
        method: 'PATCH',
        body: JSON.stringify({ isPinned: !currentPinned }),
      });
      setData((prev: any) => ({
        ...prev,
        highlights: prev.highlights.map((h: any) => h.id === highlightId ? { ...h, isPinned: !currentPinned } : h),
      }));
    } catch (err: any) {
      setActionMessage({ type: 'error', text: 'Failed to update highlight pin status' });
    }
  };

  const handleToggleHighlightSuppress = async (highlightId: string, currentSuppressed: boolean) => {
    try {
      await fetchApi(`/api/v1/event-intelligence/galleries/${galleryId}/highlights/${highlightId}`, {
        method: 'PATCH',
        body: JSON.stringify({ isSuppressed: !currentSuppressed }),
      });
      setData((prev: any) => ({
        ...prev,
        highlights: prev.highlights.map((h: any) => h.id === highlightId ? { ...h, isSuppressed: !currentSuppressed } : h),
      }));
    } catch (err: any) {
      setActionMessage({ type: 'error', text: 'Failed to update highlight status' });
    }
  };

  const handleRegenerateStory = async () => {
    setRegeneratingStory(true);
    setActionMessage(null);
    try {
      const res = await fetchApi(`/api/v1/event-intelligence/galleries/${galleryId}/stories/regenerate`, {
        method: 'POST',
        body: JSON.stringify({
          tone: storyTone,
          length: storyLength,
          photographerNotes,
        }),
      });
      if (res && res.data) {
        setData((prev: any) => ({
          ...prev,
          stories: [res.data, ...(prev.stories || [])],
        }));
        setEditedHeadline(res.data.headline);
        setEditedSummary(res.data.summary);
        setEditedBody(res.data.body);
        setActionMessage({ type: 'success', text: 'AI Event Story regenerated with updated tone and notes!' });
      }
    } catch (err: any) {
      setActionMessage({ type: 'error', text: err.message || 'Failed to regenerate story' });
    } finally {
      setRegeneratingStory(false);
    }
  };

  const handleSaveStoryEdit = async () => {
    const currentStory = data?.stories?.[0];
    if (!currentStory) return;
    try {
      const res = await fetchApi(`/api/v1/event-intelligence/galleries/${galleryId}/stories/${currentStory.id}`, {
        method: 'PATCH',
        body: JSON.stringify({
          headline: editedHeadline,
          summary: editedSummary,
          body: editedBody,
        }),
      });
      if (res && res.data) {
        setData((prev: any) => ({
          ...prev,
          stories: [res.data, ...(prev.stories?.slice(1) || [])],
        }));
        setEditingStory(false);
        setActionMessage({ type: 'success', text: 'Story edits saved successfully!' });
      }
    } catch (err: any) {
      setActionMessage({ type: 'error', text: err.message || 'Failed to save story edits' });
    }
  };

  const handleMergeChapters = async () => {
    if (selectedChapterIds.length < 2 || !mergeTitle.trim()) return;
    try {
      const res = await fetchApi(`/api/v1/event-intelligence/galleries/${galleryId}/chapters/merge`, {
        method: 'POST',
        body: JSON.stringify({
          sourceChapterIds: selectedChapterIds,
          newTitle: mergeTitle,
          newCategory: mergeCategory,
        }),
      });
      if (res && res.data) {
        setSelectedChapterIds([]);
        setShowMergeModal(false);
        setMergeTitle('');
        await loadData();
        setActionMessage({ type: 'success', text: 'Chapters merged successfully!' });
      }
    } catch (err: any) {
      setActionMessage({ type: 'error', text: err.message || 'Failed to merge chapters' });
    }
  };

  const handleSaveChapterEdit = async () => {
    if (!editingChapter) return;
    try {
      await fetchApi(`/api/v1/event-intelligence/galleries/${galleryId}/chapters/${editingChapter.id}`, {
        method: 'PATCH',
        body: JSON.stringify({
          title: chapterTitle,
          category: chapterCategory,
        }),
      });
      setEditingChapter(null);
      await loadData();
      setActionMessage({ type: 'success', text: 'Chapter updated!' });
    } catch (err: any) {
      setActionMessage({ type: 'error', text: err.message || 'Failed to update chapter' });
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-slate-400">
        <Loader2 className="w-8 h-8 animate-spin text-purple-500 mb-3" />
        <p>Loading Event Intelligence & Storytelling...</p>
      </div>
    );
  }

  const effectiveType = data?.effectiveEventType || 'OTHER';
  const confidence = data?.confidence || 'MEDIUM';
  const chapters = data?.chapters || [];
  const highlights = data?.highlights || [];
  const story = data?.stories?.[0] || null;

  return (
    <div className="space-y-6">
      {/* Action Notification */}
      {actionMessage && (
        <div className={`p-4 rounded-xl flex items-center gap-3 text-sm font-medium ${
          actionMessage.type === 'success' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
        }`}>
          {actionMessage.type === 'success' ? <CheckCircle2 className="w-5 h-5 flex-shrink-0" /> : <AlertCircle className="w-5 h-5 flex-shrink-0" />}
          <span className="flex-1">{actionMessage.text}</span>
          <button onClick={() => setActionMessage(null)} className="opacity-70 hover:opacity-100">&times;</button>
        </div>
      )}

      {/* Header Banner */}
      <div className="bg-gradient-to-r from-purple-950/40 via-indigo-950/30 to-slate-900 border border-purple-500/20 rounded-2xl p-6 relative overflow-hidden">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-purple-500/20 text-purple-300 border border-purple-500/30">
                <Sparkles className="w-3.5 h-3.5" />
                Phase 13: Event Intelligence
              </span>
              <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold border ${
                confidence === 'HIGH' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' :
                confidence === 'MEDIUM' ? 'bg-amber-500/10 text-amber-400 border-amber-500/30' : 'bg-slate-700/50 text-slate-400 border-slate-600'
              }`}>
                {confidence} Confidence
              </span>
            </div>
            <h2 className="text-2xl font-bold text-white flex items-center gap-3">
              {effectiveType.replace(/_/g, ' ')}
              <span className="text-sm font-normal text-slate-400">
                ({chapters.length} Chapters · {highlights.length} Highlights)
              </span>
            </h2>
            <p className="text-sm text-slate-400 mt-1 max-w-2xl">
              Chronological timeline clustering, quality diversity ranking, and fact-grounded customizable narrative storytelling.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Event Type Override */}
            <select
              value={effectiveType}
              onChange={(e) => handleManualEventType(e.target.value)}
              className="bg-slate-900/80 text-white text-xs border border-purple-500/30 rounded-xl px-3 py-2.5 outline-none hover:border-purple-400 transition"
            >
              <option value="WEDDING">Wedding</option>
              <option value="RECEPTION">Reception</option>
              <option value="BIRTHDAY">Birthday</option>
              <option value="CORPORATE">Corporate</option>
              <option value="CONCERT">Concert / Live</option>
              <option value="SPORTS">Sports Event</option>
              <option value="PORTRAIT_SESSION">Portrait Session</option>
              <option value="FASHION">Fashion Show</option>
              <option value="FESTIVAL">Festival</option>
              <option value="FAMILY_GATHERING">Family Gathering</option>
              <option value="GRADUATION">Graduation</option>
              <option value="OTHER">Other Gathering</option>
            </select>

            <button
              onClick={handleAnalyze}
              disabled={analyzing}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white text-xs font-semibold shadow-lg shadow-purple-900/20 transition disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${analyzing ? 'animate-spin' : ''}`} />
              {analyzing ? 'Analyzing Timeline...' : 'Analyze Event'}
            </button>
          </div>
        </div>

        {/* Signals Detected Pills */}
        {data?.signalsDetected && data.signalsDetected.length > 0 && (
          <div className="mt-4 pt-4 border-t border-purple-500/10 flex flex-wrap items-center gap-2">
            <span className="text-xs text-slate-500 font-medium">Detected Signals:</span>
            {data.signalsDetected.map((sig: string, idx: number) => (
              <span key={idx} className="px-2 py-0.5 rounded-md bg-slate-800/80 text-slate-300 text-[11px] border border-slate-700">
                {sig}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Navigation Sub-Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-800 pb-2">
        <button
          onClick={() => setActiveTab('timeline')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition ${
            activeTab === 'timeline' ? 'bg-purple-600 text-white shadow' : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
          }`}
        >
          <Layers className="w-4 h-4" />
          Timeline & Chapters ({chapters.length})
        </button>
        <button
          onClick={() => setActiveTab('highlights')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition ${
            activeTab === 'highlights' ? 'bg-purple-600 text-white shadow' : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
          }`}
        >
          <Star className="w-4 h-4" />
          Curated Highlights ({highlights.length})
        </button>
        <button
          onClick={() => setActiveTab('story')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition ${
            activeTab === 'story' ? 'bg-purple-600 text-white shadow' : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
          }`}
        >
          <BookOpen className="w-4 h-4" />
          Event Story & Narrative
        </button>
      </div>

      {/* 1. TIMELINE & CHAPTERS TAB */}
      {activeTab === 'timeline' && (
        <div className="space-y-4">
          {/* Chapter Actions Bar */}
          <div className="flex items-center justify-between">
            <p className="text-xs text-slate-400">
              Select multiple chapters to merge or click any chapter to customize its title and category.
            </p>
            {selectedChapterIds.length >= 2 && (
              <button
                onClick={() => setShowMergeModal(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 text-white text-xs font-medium hover:bg-indigo-500 transition"
              >
                <GitMerge className="w-3.5 h-3.5" />
                Merge {selectedChapterIds.length} Selected Chapters
              </button>
            )}
          </div>

          {chapters.length === 0 ? (
            <div className="p-12 text-center border border-dashed border-slate-800 rounded-2xl">
              <Calendar className="w-10 h-10 text-slate-600 mx-auto mb-2" />
              <p className="text-sm text-slate-400">No event chapters generated yet.</p>
              <button
                onClick={handleAnalyze}
                className="mt-4 px-4 py-2 rounded-xl bg-purple-600 text-white text-xs font-semibold hover:bg-purple-500 transition"
              >
                Run Event Intelligence
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {chapters.map((ch: any, idx: number) => {
                const isSelected = selectedChapterIds.includes(ch.id);
                return (
                  <div
                    key={ch.id}
                    className={`bg-slate-900/60 border rounded-2xl p-5 transition relative flex flex-col justify-between ${
                      isSelected ? 'border-purple-500 bg-purple-950/20' : 'border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between gap-2 mb-3">
                        <span className="text-[11px] font-bold text-purple-400 uppercase tracking-wider">
                          Chapter {idx + 1}
                        </span>
                        <div className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedChapterIds((prev) => [...prev, ch.id]);
                              } else {
                                setSelectedChapterIds((prev) => prev.filter((id) => id !== ch.id));
                              }
                            }}
                            className="w-4 h-4 rounded text-purple-600 bg-slate-800 border-slate-700"
                            title="Select for merge"
                          />
                          <button
                            onClick={() => {
                              setEditingChapter(ch);
                              setChapterTitle(ch.title);
                              setChapterCategory(ch.category);
                            }}
                            className="p-1 text-slate-400 hover:text-white transition"
                            title="Edit Chapter"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      <h3 className="text-base font-semibold text-white mb-1">{ch.title}</h3>
                      <div className="flex items-center gap-2 mb-3">
                        <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-slate-800 text-slate-300 border border-slate-700">
                          {ch.category.replace(/_/g, ' ')}
                        </span>
                        <span className="text-xs text-slate-500">
                          {ch.photoCount} photos
                        </span>
                      </div>

                      {ch.startTime && (
                        <p className="text-[11px] text-slate-400 flex items-center gap-1">
                          <Clock className="w-3 h-3 text-slate-500" />
                          {new Date(ch.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          {ch.endTime && ` — ${new Date(ch.endTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`}
                        </p>
                      )}
                    </div>

                    <div className="mt-4 pt-3 border-t border-slate-800/60 flex items-center justify-between text-xs text-slate-500">
                      <span>{ch.isVisible ? 'Visible to Clients' : 'Hidden from Clients'}</span>
                      <button
                        onClick={async () => {
                          await fetchApi(`/api/v1/event-intelligence/galleries/${galleryId}/chapters/${ch.id}`, {
                            method: 'PATCH',
                            body: JSON.stringify({ is_visible: !ch.isVisible }),
                          });
                          await loadData();
                        }}
                        className="text-slate-400 hover:text-white transition flex items-center gap-1"
                      >
                        {ch.isVisible ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                        {ch.isVisible ? 'Hide' : 'Show'}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* 2. CURATED HIGHLIGHTS TAB */}
      {activeTab === 'highlights' && (
        <div className="space-y-4">
          <p className="text-xs text-slate-400">
            Top moment highlights scored by visual quality, emotional valence, and narrative prominence with burst duplicate suppression.
          </p>

          {highlights.length === 0 ? (
            <div className="p-12 text-center border border-dashed border-slate-800 rounded-2xl">
              <Star className="w-10 h-10 text-slate-600 mx-auto mb-2" />
              <p className="text-sm text-slate-400">No highlights generated yet.</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
              {highlights.map((hl: any) => (
                <div
                  key={hl.id}
                  className={`group relative rounded-2xl overflow-hidden border bg-slate-900 transition flex flex-col ${
                    hl.isPinned ? 'border-amber-500/50 shadow-md shadow-amber-950/20' :
                    hl.isSuppressed ? 'border-rose-900/40 opacity-40' : 'border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <div className="aspect-[4/3] bg-slate-950 relative overflow-hidden">
                    {hl.photo?.thumbnailUrl || hl.photo?.url ? (
                      <img
                        src={hl.photo.thumbnailUrl || hl.photo.url}
                        alt="Highlight"
                        className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                        loading="lazy"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-slate-700">Photo</div>
                    )}

                    {/* Rank Badge */}
                    <div className="absolute top-2 left-2 px-2 py-0.5 rounded-full bg-slate-900/90 text-white font-bold text-[10px] backdrop-blur-md border border-slate-700">
                      #{hl.rank}
                    </div>

                    {/* Pinned Badge */}
                    {hl.isPinned && (
                      <div className="absolute top-2 right-2 px-2 py-0.5 rounded-full bg-amber-500 text-slate-950 font-bold text-[10px] flex items-center gap-1 shadow">
                        <Star className="w-2.5 h-2.5 fill-current" /> Pinned
                      </div>
                    )}
                  </div>

                  <div className="p-3 flex flex-col justify-between flex-1">
                    <div className="space-y-1 mb-3">
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="text-slate-400">Composite Score</span>
                        <span className="text-purple-400 font-bold">{Math.round((hl.compositeScore || 0) * 100)}%</span>
                      </div>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {hl.tags?.map((t: string, i: number) => (
                          <span key={i} className="text-[9px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-300">
                            {t}
                          </span>
                        ))}
                      </div>
                    </div>

                    <div className="flex items-center justify-between border-t border-slate-800/80 pt-2 text-xs">
                      <button
                        onClick={() => handleToggleHighlightPin(hl.id, hl.isPinned)}
                        className={`text-[11px] font-medium flex items-center gap-1 ${
                          hl.isPinned ? 'text-amber-400' : 'text-slate-400 hover:text-white'
                        }`}
                      >
                        <Star className={`w-3 h-3 ${hl.isPinned ? 'fill-current' : ''}`} />
                        {hl.isPinned ? 'Pinned' : 'Pin'}
                      </button>

                      <button
                        onClick={() => handleToggleHighlightSuppress(hl.id, hl.isSuppressed)}
                        className="text-[11px] text-slate-500 hover:text-rose-400 transition"
                      >
                        {hl.isSuppressed ? 'Restore' : 'Suppress'}
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* 3. EVENT STORY & NARRATIVE TAB */}
      {activeTab === 'story' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Story Controls */}
          <div className="lg:col-span-1 bg-slate-900/60 border border-slate-800 rounded-2xl p-5 space-y-4">
            <h3 className="text-base font-semibold text-white flex items-center gap-2">
              <Sliders className="w-4 h-4 text-purple-400" />
              Story Controls & Tone
            </h3>

            <div>
              <label className="text-xs font-medium text-slate-400 block mb-1">Narrative Tone</label>
              <select
                value={storyTone}
                onChange={(e) => setStoryTone(e.target.value)}
                className="w-full bg-slate-900 text-white text-xs border border-slate-700 rounded-xl p-2.5 outline-none focus:border-purple-500"
              >
                <option value="CELEBRATORY">Celebratory (Joyful, energetic)</option>
                <option value="EDITORIAL">Editorial (Artistic, polished)</option>
                <option value="EMOTIONAL">Emotional (Heartfelt, intimate)</option>
                <option value="CINEMATIC">Cinematic (Dramatic, expansive)</option>
                <option value="DOCUMENTARY">Documentary (Authentic, natural)</option>
                <option value="MINIMAL">Minimal (Concise, essential)</option>
              </select>
            </div>

            <div>
              <label className="text-xs font-medium text-slate-400 block mb-1">Story Length</label>
              <select
                value={storyLength}
                onChange={(e) => setStoryLength(e.target.value)}
                className="w-full bg-slate-900 text-white text-xs border border-slate-700 rounded-xl p-2.5 outline-none focus:border-purple-500"
              >
                <option value="CONCISE">Concise (1-2 paragraphs)</option>
                <option value="STANDARD">Standard (3-4 paragraphs)</option>
                <option value="DETAILED">Detailed (Comprehensive chapter arc)</option>
                <option value="EXPANDED">Expanded (Full narrative with notes)</option>
              </select>
            </div>

            <div>
              <label className="text-xs font-medium text-slate-400 block mb-1">Photographer Notes (Optional)</label>
              <textarea
                value={photographerNotes}
                onChange={(e) => setPhotographerNotes(e.target.value)}
                placeholder="E.g., Golden hour sunset ceremony overlooking the valley..."
                className="w-full bg-slate-900 text-white text-xs border border-slate-700 rounded-xl p-2.5 outline-none focus:border-purple-500 min-h-[90px]"
              />
            </div>

            <button
              onClick={handleRegenerateStory}
              disabled={regeneratingStory}
              className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold transition disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${regeneratingStory ? 'animate-spin' : ''}`} />
              {regeneratingStory ? 'Generating Story...' : 'Regenerate AI Story'}
            </button>
          </div>

          {/* Story Viewer & Editor */}
          <div className="lg:col-span-2 bg-slate-900/60 border border-slate-800 rounded-2xl p-6 space-y-5">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div>
                <span className="text-xs text-purple-400 font-semibold uppercase tracking-wider">
                  Fact-Grounded Narrative
                </span>
                <h3 className="text-xl font-bold text-white mt-0.5">
                  {story ? story.headline : 'Event Story Preview'}
                </h3>
              </div>

              {story && (
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setEditingStory(!editingStory)}
                    className="px-3 py-1.5 rounded-lg border border-slate-700 text-xs text-slate-300 hover:text-white hover:bg-slate-800 transition flex items-center gap-1.5"
                  >
                    <Edit2 className="w-3 h-3" />
                    {editingStory ? 'Cancel' : 'Edit Story'}
                  </button>
                </div>
              )}
            </div>

            {!story ? (
              <div className="p-12 text-center text-slate-400">
                <FileText className="w-8 h-8 text-slate-600 mx-auto mb-2" />
                <p className="text-sm">No story generated yet. Click &quot;Analyze Event&quot; or &quot;Regenerate AI Story&quot;.</p>
              </div>
            ) : editingStory ? (
              <div className="space-y-4">
                <div>
                  <label className="text-xs text-slate-400 block mb-1">Headline</label>
                  <input
                    type="text"
                    value={editedHeadline}
                    onChange={(e) => setEditedHeadline(e.target.value)}
                    className="w-full bg-slate-900 text-white text-sm border border-slate-700 rounded-xl p-2.5 outline-none focus:border-purple-500"
                  />
                </div>
                <div>
                  <label className="text-xs text-slate-400 block mb-1">Executive Summary</label>
                  <textarea
                    value={editedSummary}
                    onChange={(e) => setEditedSummary(e.target.value)}
                    className="w-full bg-slate-900 text-white text-xs border border-slate-700 rounded-xl p-2.5 outline-none focus:border-purple-500 min-h-[70px]"
                  />
                </div>
                <div>
                  <label className="text-xs text-slate-400 block mb-1">Story Body</label>
                  <textarea
                    value={editedBody}
                    onChange={(e) => setEditedBody(e.target.value)}
                    className="w-full bg-slate-900 text-white text-xs border border-slate-700 rounded-xl p-3 outline-none focus:border-purple-500 min-h-[220px] font-mono leading-relaxed"
                  />
                </div>
                <button
                  onClick={handleSaveStoryEdit}
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold transition flex items-center gap-1.5"
                >
                  <Check className="w-3.5 h-3.5" />
                  Save Edits
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="p-4 rounded-xl bg-purple-950/20 border border-purple-500/20 text-xs text-purple-200 leading-relaxed">
                  <strong>Summary: </strong> {story.summary}
                </div>

                <div className="text-sm text-slate-300 leading-relaxed whitespace-pre-line bg-slate-950/40 p-5 rounded-xl border border-slate-800/80 font-serif">
                  {story.body}
                </div>

                {/* Chapter Summaries Accordion / Pills */}
                {story.chapterSummaries && Object.keys(story.chapterSummaries).length > 0 && (
                  <div className="mt-4 pt-4 border-t border-slate-800">
                    <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                      Chapter Summaries
                    </h4>
                    <div className="space-y-2">
                      {Object.entries(story.chapterSummaries).map(([chId, summary]: [string, any]) => (
                        <div key={chId} className="p-3 rounded-lg bg-slate-900/90 border border-slate-800 text-xs text-slate-300">
                          {summary}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Edit Chapter Modal */}
      {editingChapter && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 space-y-4">
            <h3 className="text-lg font-bold text-white">Edit Chapter</h3>
            <div>
              <label className="text-xs text-slate-400 block mb-1">Chapter Title</label>
              <input
                type="text"
                value={chapterTitle}
                onChange={(e) => setChapterTitle(e.target.value)}
                className="w-full bg-slate-950 text-white text-sm border border-slate-700 rounded-xl p-2.5 outline-none focus:border-purple-500"
              />
            </div>
            <div>
              <label className="text-xs text-slate-400 block mb-1">Category</label>
              <select
                value={chapterCategory}
                onChange={(e) => setChapterCategory(e.target.value)}
                className="w-full bg-slate-950 text-white text-xs border border-slate-700 rounded-xl p-2.5 outline-none focus:border-purple-500"
              >
                <option value="PREPARATION">Preparation</option>
                <option value="CEREMONY">Ceremony</option>
                <option value="KEY_MOMENTS">Key Moments</option>
                <option value="PORTRAITS">Portraits</option>
                <option value="COUPLE_SESSION">Couple Session</option>
                <option value="FAMILY_PHOTOS">Family Photos</option>
                <option value="RECEPTION">Reception</option>
                <option value="SPEECHES">Speeches</option>
                <option value="PARTY">Party</option>
                <option value="DETAILS">Details</option>
                <option value="GENERAL">General</option>
              </select>
            </div>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setEditingChapter(null)}
                className="px-4 py-2 rounded-xl text-xs text-slate-400 hover:text-white"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveChapterEdit}
                className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Merge Chapters Modal */}
      {showMergeModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 space-y-4">
            <h3 className="text-lg font-bold text-white">Merge Selected Chapters</h3>
            <p className="text-xs text-slate-400">
              Merging {selectedChapterIds.length} chapters will consolidate all photos into one chapter in chronological sequence.
            </p>
            <div>
              <label className="text-xs text-slate-400 block mb-1">New Chapter Title</label>
              <input
                type="text"
                value={mergeTitle}
                onChange={(e) => setMergeTitle(e.target.value)}
                placeholder="E.g., Complete Ceremony & Speeches"
                className="w-full bg-slate-950 text-white text-sm border border-slate-700 rounded-xl p-2.5 outline-none focus:border-purple-500"
              />
            </div>
            <div>
              <label className="text-xs text-slate-400 block mb-1">Category</label>
              <select
                value={mergeCategory}
                onChange={(e) => setMergeCategory(e.target.value)}
                className="w-full bg-slate-950 text-white text-xs border border-slate-700 rounded-xl p-2.5 outline-none focus:border-purple-500"
              >
                <option value="CEREMONY">Ceremony</option>
                <option value="RECEPTION">Reception</option>
                <option value="KEY_MOMENTS">Key Moments</option>
                <option value="PORTRAITS">Portraits</option>
                <option value="PARTY">Party</option>
                <option value="GENERAL">General</option>
              </select>
            </div>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setShowMergeModal(false)}
                className="px-4 py-2 rounded-xl text-xs text-slate-400 hover:text-white"
              >
                Cancel
              </button>
              <button
                onClick={handleMergeChapters}
                disabled={!mergeTitle.trim()}
                className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold disabled:opacity-50"
              >
                Merge Chapters
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
