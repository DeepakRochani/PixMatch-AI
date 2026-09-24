'use client';

import React, { useState, useEffect } from 'react';
import {
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Clock,
  ShieldCheck,
  Zap,
  ArrowRight,
  RefreshCw,
  Image as ImageIcon,
  FolderPlus,
  BookOpen,
  SlidersHorizontal,
  ChevronRight,
  Layers,
  Check,
  X,
  Loader2,
} from 'lucide-react';
import {
  GalleryHealthDTO,
  GalleryCompletenessDTO,
  CopilotAttentionSummaryDTO,
  CopilotRecommendationDTO,
  CoverRecommendationDTO,
  SmartAlbumSuggestionDTO,
} from '@pixmatch/types';
import { fetchApi } from '@/lib/api-client';
import { CopilotChat } from './CopilotChat';

interface GallerySummary {
  id: string;
  title: string;
  photo_count: number;
}

export function CopilotDashboard() {
  const [galleries, setGalleries] = useState<GallerySummary[]>([]);
  const [selectedGalleryId, setSelectedGalleryId] = useState<string>('');
  const [health, setHealth] = useState<GalleryHealthDTO | null>(null);
  const [completeness, setCompleteness] = useState<GalleryCompletenessDTO | null>(null);
  const [attention, setAttention] = useState<CopilotAttentionSummaryDTO | null>(null);
  const [coverRecs, setCoverRecs] = useState<CoverRecommendationDTO[]>([]);
  const [albumSuggestions, setAlbumSuggestions] = useState<SmartAlbumSuggestionDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'checklist' | 'chat'>('overview');

  // Approval Modal State
  const [pendingApproval, setPendingApproval] = useState<{
    actionType: string;
    title: string;
    description: string;
    payload: any;
  } | null>(null);

  useEffect(() => {
    fetchGalleries();
  }, []);

  useEffect(() => {
    if (selectedGalleryId) {
      loadGalleryCopilotData(selectedGalleryId);
    }
  }, [selectedGalleryId]);

  const fetchGalleries = async () => {
    try {
      setLoading(true);
      const res = await fetchApi<any>('/api/v1/galleries');
      if (res.success && res.data && res.data.length > 0) {
        setGalleries(res.data);
        setSelectedGalleryId(res.data[0].id);
      }
    } catch (err) {
      console.error('Failed to fetch galleries:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadGalleryCopilotData = async (galleryId: string) => {
    try {
      setLoading(true);
      const [healthRes, attRes] = await Promise.all([
        fetchApi<any>(`/api/v1/copilot/galleries/${galleryId}/health`),
        fetchApi<any>(`/api/v1/copilot/galleries/${galleryId}/attention`),
      ]);

      if (healthRes.success && healthRes.data) {
        setHealth(healthRes.data);
      }
      if (attRes.success && attRes.data) {
        setAttention(attRes.data);
      }
    } catch (err) {
      console.error('Failed to load gallery copilot data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handlePrepareGallery = async () => {
    if (!selectedGalleryId) return;
    setActionLoading('PREPARE');
    try {
      const res = await fetchApi<any>(`/api/v1/copilot/galleries/${selectedGalleryId}/prepare`, {
        method: 'POST',
        body: JSON.stringify({
          auto_select_cover: true,
          generate_smart_albums: true,
          generate_event_story: true,
          retry_failed_jobs: true,
        }),
      });

      if (res.success) {
        await loadGalleryCopilotData(selectedGalleryId);
      }
    } catch (err) {
      console.error('Failed to prepare gallery:', err);
    } finally {
      setActionLoading(null);
    }
  };

  const selectedGallery = galleries.find((g) => g.id === selectedGalleryId);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'READY':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-xs font-semibold">
            <CheckCircle2 className="w-3.5 h-3.5" />
            Ready to Publish
          </span>
        );
      case 'ALMOST_READY':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20 text-xs font-semibold">
            <Clock className="w-3.5 h-3.5" />
            Almost Ready
          </span>
        );
      case 'NEEDS_ATTENTION':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-orange-500/10 text-orange-400 border border-orange-500/20 text-xs font-semibold">
            <AlertTriangle className="w-3.5 h-3.5" />
            Needs Attention
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-500/10 text-rose-400 border border-rose-500/20 text-xs font-semibold">
            <XCircle className="w-3.5 h-3.5" />
            Blocked
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-primary to-accent flex items-center justify-center text-white shadow-lg shadow-primary/25">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white tracking-tight">AI Photographer Copilot</h1>
              <p className="text-xs sm:text-sm text-muted">
                Your gallery assistant — see what needs attention and prepare galleries faster.
              </p>
            </div>
          </div>
        </div>

        {/* Gallery Selector */}
        <div className="flex items-center gap-3">
          <label htmlFor="gallery-select" className="text-xs text-muted font-medium">
            Active Gallery:
          </label>
          <select
            id="gallery-select"
            value={selectedGalleryId}
            onChange={(e) => setSelectedGalleryId(e.target.value)}
            className="bg-card border border-card-border rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-primary transition-all cursor-pointer"
          >
            {galleries.map((g) => (
              <option key={g.id} value={g.id}>
                {g.title}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Columns: Health, Attention & Actions */}
        <div className="lg:col-span-2 space-y-6">
          {/* Health Scorecard Banner */}
          {health && (
            <div className="bg-gradient-to-r from-card/80 to-surface/80 backdrop-blur border border-card-border rounded-2xl p-6 shadow-xl relative overflow-hidden">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div className="space-y-2">
                  <div className="flex items-center gap-3">
                    {getStatusBadge(health.status)}
                    <span className="text-xs text-muted">
                      Calculated {new Date(health.calculated_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <h2 className="text-xl font-bold text-white tracking-tight">{health.gallery_title}</h2>
                  <p className="text-xs sm:text-sm text-muted max-w-lg leading-relaxed">{health.status_explanation}</p>
                </div>

                {/* Score Dial */}
                <div className="flex items-center gap-4 bg-surface/60 border border-card-border/80 px-5 py-4 rounded-xl self-start md:self-auto">
                  <div className="text-right">
                    <div className="text-2xl font-black text-white">{health.score}</div>
                    <div className="text-[10px] uppercase font-bold text-muted tracking-wider">Readiness Score</div>
                  </div>
                  <div className="w-12 h-12 rounded-full border-4 border-primary/20 border-t-primary flex items-center justify-center text-primary font-bold text-sm">
                    {health.score}%
                  </div>
                </div>
              </div>

              {/* Quick Action Button */}
              <div className="mt-6 pt-4 border-t border-card-border/60 flex flex-wrap items-center justify-between gap-3">
                <div className="text-xs text-muted">
                  One-click automated preparation evaluates covers, duplicates, chapters, and retry jobs.
                </div>
                <button
                  onClick={handlePrepareGallery}
                  disabled={actionLoading === 'PREPARE'}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-primary to-accent hover:opacity-95 text-white text-xs font-semibold shadow-md shadow-primary/20 transition-all disabled:opacity-50"
                >
                  {actionLoading === 'PREPARE' ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Zap className="w-4 h-4" />
                  )}
                  Prepare Gallery
                </button>
              </div>
            </div>
          )}

          {/* Operational Dimension Breakdown */}
          {health && (
            <div className="bg-card/60 backdrop-blur border border-card-border rounded-xl p-5 shadow-sm space-y-4">
              <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-primary" />
                Operational Readiness Breakdown
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {health.categories.map((cat) => (
                  <div
                    key={cat.key}
                    className="p-3.5 rounded-lg bg-surface/60 border border-card-border/70 flex flex-col justify-between space-y-2"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium text-white">{cat.label}</span>
                      <span
                        className={`text-xs font-bold ${
                          cat.score >= 90
                            ? 'text-emerald-400'
                            : cat.score >= 70
                            ? 'text-amber-400'
                            : 'text-rose-400'
                        }`}
                      >
                        {cat.score}%
                      </span>
                    </div>
                    <div className="w-full bg-card-border/50 h-1.5 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full ${
                          cat.score >= 90
                            ? 'bg-emerald-500'
                            : cat.score >= 70
                            ? 'bg-amber-500'
                            : 'bg-rose-500'
                        }`}
                        style={{ width: `${cat.score}%` }}
                      />
                    </div>
                    <p className="text-[11px] text-muted truncate">{cat.explanation}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* WHAT NEEDS YOUR ATTENTION */}
          {attention && attention.top_attention_items.length > 0 && (
            <div className="bg-card/60 backdrop-blur border border-card-border rounded-xl p-5 shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-400" />
                  What Needs Your Attention ({attention.total_unresolved})
                </h3>
              </div>

              <div className="space-y-2.5">
                {attention.top_attention_items.map((item) => (
                  <div
                    key={item.id}
                    className="p-3.5 rounded-lg bg-surface/70 border border-card-border flex items-center justify-between gap-4 hover:border-primary/30 transition-all"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span
                          className={`w-2 h-2 rounded-full ${
                            item.severity === 'CRITICAL' || item.severity === 'HIGH'
                              ? 'bg-rose-500'
                              : item.severity === 'MEDIUM'
                              ? 'bg-amber-500'
                              : 'bg-emerald-500'
                          }`}
                        />
                        <h4 className="text-xs font-semibold text-white">{item.title}</h4>
                      </div>
                      <p className="text-[11px] text-muted">{item.description}</p>
                    </div>

                    <button
                      onClick={() => handlePrepareGallery()}
                      className="px-3 py-1.5 rounded-lg bg-primary/10 hover:bg-primary/20 text-primary border border-primary/20 text-xs font-medium transition-all whitespace-nowrap"
                    >
                      {item.action_label}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right 1 Column: Chat Assistant */}
        <div className="lg:col-span-1">
          <CopilotChat
            galleryId={selectedGalleryId}
            galleryTitle={selectedGallery?.title}
            onActionTriggered={(type) => {
              if (type === 'PREPARE') handlePrepareGallery();
            }}
          />
        </div>
      </div>
    </div>
  );
}
