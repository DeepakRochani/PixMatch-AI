'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  Sparkles,
  Users,
  FolderPlus,
  Star,
  Copy,
  Activity,
  RefreshCw,
  Check,
  Edit2,
  Trash2,
  Eye,
  EyeOff,
  Plus,
  Loader2,
  Sliders,
  CheckCircle2,
  AlertTriangle,
  Layers,
  ChevronRight,
  Maximize2,
  ShieldCheck,
  X,
  Camera,
  Sun,
  Zap,
} from 'lucide-react';
import { fetchApi } from '@/lib/api-client';
import { formatBytes, formatDate } from '@pixmatch/ui';
import { EventIntelligenceHub } from './EventIntelligenceHub';
import { BookOpen } from 'lucide-react';

interface AiIntelligenceCenterProps {
  galleryId: string;
  gallery: any;
  onRefreshGallery: () => void;
}

type AiSubTab = 'overview' | 'event-story' | 'people' | 'smart-albums' | 'best-shots' | 'duplicates' | 'quality';

export function AiIntelligenceCenter({ galleryId, gallery, onRefreshGallery }: AiIntelligenceCenterProps) {
  const [subTab, setSubTab] = useState<AiSubTab>('overview');
  const [loading, setLoading] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [actionMessage, setActionMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Overview Data
  const [overview, setOverview] = useState<any>(null);

  // People Clusters
  const [people, setPeople] = useState<any[]>([]);
  const [renameClusterId, setRenameClusterId] = useState<string | null>(null);
  const [newClusterName, setNewClusterName] = useState('');
  const [mergeSourceCluster, setMergeSourceCluster] = useState<any | null>(null);
  const [mergeTargetId, setMergeTargetId] = useState<string>('');

  // Smart Albums
  const [smartAlbums, setSmartAlbums] = useState<any[]>([]);
  const [showCreateAlbumModal, setShowCreateAlbumModal] = useState(false);
  const [albumName, setAlbumName] = useState('');
  const [albumDesc, setAlbumDesc] = useState('');
  const [albumField, setAlbumField] = useState('overall_score');
  const [albumOperator, setAlbumOperator] = useState('gte');
  const [albumValue, setAlbumValue] = useState('80');
  const [albumClientVisible, setAlbumClientVisible] = useState(true);
  const [viewingAlbumPhotos, setViewingAlbumPhotos] = useState<{ album: any; photos: any[] } | null>(null);

  // Best Shots
  const [bestShots, setBestShots] = useState<any[]>([]);

  // Duplicates
  const [duplicates, setDuplicates] = useState<any[]>([]);

  // Quality Summary
  const [qualitySummary, setQualitySummary] = useState<any>(null);

  // Load Data based on sub-tab
  const loadData = useCallback(async () => {
    setLoading(true);
    setActionMessage(null);
    try {
      if (subTab === 'overview') {
        const res = await fetchApi(`/galleries/${galleryId}/ai/overview`);
        if (res.success && res.data) setOverview(res.data);
      } else if (subTab === 'people') {
        const res = await fetchApi(`/galleries/${galleryId}/ai/people`);
        if (res.success && res.data) setPeople(res.data.people || []);
      } else if (subTab === 'smart-albums') {
        const res = await fetchApi(`/galleries/${galleryId}/smart-albums`);
        if (res.success && res.data) setSmartAlbums(res.data.smart_albums || []);
      } else if (subTab === 'best-shots') {
        const res = await fetchApi(`/galleries/${galleryId}/ai/best-shots?limit=50`);
        if (res.success && res.data) setBestShots(res.data.best_shots || []);
      } else if (subTab === 'duplicates') {
        const res = await fetchApi(`/galleries/${galleryId}/ai/duplicates`);
        if (res.success && res.data) setDuplicates(res.data.duplicates || []);
      } else if (subTab === 'quality') {
        const res = await fetchApi(`/galleries/${galleryId}/ai/quality`);
        if (res.success && res.data) setQualitySummary(res.data);
      }
    } catch {
      // Fallback
    } finally {
      setLoading(false);
    }
  }, [galleryId, subTab]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Run full intelligence analysis
  const handleRunAnalysis = async () => {
    setAnalyzing(true);
    setActionMessage(null);
    try {
      const res = await fetchApi(`/galleries/${galleryId}/ai/analyze`, { method: 'POST' });
      if (res.success) {
        setActionMessage({
          type: 'success',
          text: `AI Photo Intelligence Pipeline executed successfully on ${res.data?.totalEnqueued || 'all'} photos!`,
        });
        loadData();
        onRefreshGallery();
      } else {
        setActionMessage({ type: 'error', text: res.error?.message || 'Failed to trigger AI analysis' });
      }
    } catch (err: any) {
      setActionMessage({ type: 'error', text: err.message || 'Error executing AI analysis' });
    } finally {
      setAnalyzing(false);
    }
  };

  // Rename person cluster
  const handleRenamePerson = async (clusterId: string) => {
    if (!newClusterName.trim()) return;
    try {
      const res = await fetchApi(`/galleries/${galleryId}/ai/people/${clusterId}/rename`, {
        method: 'POST',
        body: JSON.stringify({ name: newClusterName.trim() }),
      });
      if (res.success) {
        setRenameClusterId(null);
        setNewClusterName('');
        loadData();
      }
    } catch {}
  };

  // Merge person cluster
  const handleMergePerson = async () => {
    if (!mergeSourceCluster || !mergeTargetId) return;
    try {
      const res = await fetchApi(`/galleries/${galleryId}/ai/people/${mergeSourceCluster.id}/merge`, {
        method: 'POST',
        body: JSON.stringify({ targetClusterId: mergeTargetId }),
      });
      if (res.success) {
        setMergeSourceCluster(null);
        setMergeTargetId('');
        loadData();
      }
    } catch {}
  };

  // Create Smart Album
  const handleCreateSmartAlbum = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!albumName.trim()) return;

    let parsedVal: any = albumValue;
    if (['overall_score', 'sharpness_score', 'noise_score', 'contrast_score', 'composition_score'].includes(albumField)) {
      parsedVal = parseFloat(albumValue) || 0;
    }

    const rule_json = {
      conditions: [
        {
          field: albumField,
          operator: albumOperator,
          value: parsedVal,
        },
      ],
      combinator: 'AND',
    };

    try {
      const res = await fetchApi(`/galleries/${galleryId}/smart-albums`, {
        method: 'POST',
        body: JSON.stringify({
          name: albumName.trim(),
          description: albumDesc.trim() || undefined,
          rule_json,
          is_visible_to_client: albumClientVisible,
        }),
      });

      if (res.success) {
        setShowCreateAlbumModal(false);
        setAlbumName('');
        setAlbumDesc('');
        loadData();
      }
    } catch {}
  };

  // Delete Smart Album
  const handleDeleteSmartAlbum = async (albumId: string) => {
    if (!confirm('Are you sure you want to delete this Smart Album?')) return;
    try {
      await fetchApi(`/galleries/${galleryId}/smart-albums/${albumId}`, { method: 'DELETE' });
      loadData();
    } catch {}
  };

  // Toggle Smart Album Client Visibility
  const handleToggleVisibility = async (album: any) => {
    try {
      await fetchApi(`/galleries/${galleryId}/smart-albums/${album.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ is_visible_to_client: !album.is_visible_to_client }),
      });
      loadData();
    } catch {}
  };

  // View Smart Album Photos
  const handleViewSmartAlbumPhotos = async (album: any) => {
    try {
      const res = await fetchApi(`/galleries/${galleryId}/smart-albums/${album.id}/photos?limit=50`);
      if (res.success && res.data) {
        setViewingAlbumPhotos({ album, photos: res.data.photos || [] });
      }
    } catch {}
  };

  return (
    <div className="space-y-6">
      {/* Top Banner with Run Intelligence Trigger */}
      <div className="p-6 rounded-2xl bg-[#0B0F19] border border-card-border flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5">
            <Sparkles className="h-5 w-5 text-amber-400" />
            <h3 className="text-base font-bold text-white">AI Photo Intelligence & Smart Albums</h3>
            <span className="px-2 py-0.5 rounded-full bg-amber-400/10 text-amber-400 text-[10px] font-bold uppercase tracking-wider border border-amber-400/20">
              Phase 12
            </span>
          </div>
          <p className="text-xs text-muted max-w-2xl">
            Automated multi-signal quality scoring, face clustering, duplicate detection, and dynamic rule-based Smart Albums.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={handleRunAnalysis}
            disabled={analyzing}
            className="px-4 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-primary text-white text-xs font-bold hover:opacity-90 transition flex items-center gap-2 shadow-lg shadow-amber-500/20 disabled:opacity-50 cursor-pointer"
          >
            {analyzing ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
            <span>{analyzing ? 'Analyzing Gallery...' : 'Run Full AI Analysis'}</span>
          </button>
        </div>
      </div>

      {actionMessage && (
        <div
          className={`p-4 rounded-xl text-xs font-semibold flex items-center gap-2.5 ${
            actionMessage.type === 'success'
              ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-400'
              : 'bg-red-500/10 border border-red-500/20 text-red-400'
          }`}
        >
          {actionMessage.type === 'success' ? <CheckCircle2 className="h-4 w-4" /> : <AlertTriangle className="h-4 w-4" />}
          <span>{actionMessage.text}</span>
        </div>
      )}

      {/* Sub-Navigation Tabs */}
      <div className="flex items-center gap-1.5 overflow-x-auto border-b border-card-border pb-px scrollbar-none">
        {[
          { id: 'overview', label: 'Overview & Metrics', icon: Activity },
          { id: 'event-story', label: 'Event Story & Chapters', icon: BookOpen },
          { id: 'people', label: `People Clusters (${people.length || overview?.total_people_clusters || 0})`, icon: Users },
          { id: 'smart-albums', label: `Smart Albums (${smartAlbums.length || overview?.smart_albums_count || 0})`, icon: FolderPlus },
          { id: 'best-shots', label: 'Best Shots', icon: Star },
          { id: 'duplicates', label: 'Duplicates & Stacks', icon: Copy },
          { id: 'quality', label: 'Quality Insights', icon: Sliders },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = subTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setSubTab(tab.id as AiSubTab)}
              className={`flex items-center gap-2 px-3.5 py-2.5 rounded-t-xl text-xs font-semibold transition border-b-2 whitespace-nowrap cursor-pointer ${
                isActive
                  ? 'border-amber-400 text-white bg-card/60'
                  : 'border-transparent text-muted hover:text-white hover:bg-card/30'
              }`}
            >
              <Icon className={`h-3.5 w-3.5 ${isActive ? 'text-amber-400' : 'text-muted'}`} />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* SUB-TAB: EVENT STORY & CHAPTERS (Phase 13) */}
      {subTab === 'event-story' && (
        <EventIntelligenceHub
          galleryId={galleryId}
          gallery={gallery}
          onRefreshGallery={onRefreshGallery}
        />
      )}

      {loading && !overview && subTab === 'overview' && (
        <div className="py-16 text-center text-muted text-xs flex items-center justify-center gap-2">
          <Loader2 className="h-4 w-4 animate-spin text-primary" /> Loading AI Intelligence data...
        </div>
      )}

      {/* SUB-TAB 1: OVERVIEW */}
      {subTab === 'overview' && overview && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
            <div className="p-4 rounded-2xl bg-card border border-card-border space-y-1">
              <p className="text-[11px] font-semibold text-muted">Analyzed Photos</p>
              <p className="text-xl font-bold text-white">{overview.analyzed_photos_count} / {overview.total_photos}</p>
              <p className="text-[10px] text-muted">Quality analyzed</p>
            </div>
            <div className="p-4 rounded-2xl bg-card border border-card-border space-y-1">
              <p className="text-[11px] font-semibold text-muted">Average Quality</p>
              <p className="text-xl font-bold text-amber-400">{overview.average_quality_score?.toFixed(1) || '—'}/100</p>
              <p className="text-[10px] text-muted">Composite rating</p>
            </div>
            <div className="p-4 rounded-2xl bg-card border border-card-border space-y-1">
              <p className="text-[11px] font-semibold text-muted">Identified People</p>
              <p className="text-xl font-bold text-cyan-400">{overview.total_people_clusters}</p>
              <p className="text-[10px] text-muted">Face clusters</p>
            </div>
            <div className="p-4 rounded-2xl bg-card border border-card-border space-y-1">
              <p className="text-[11px] font-semibold text-muted">Smart Albums</p>
              <p className="text-xl font-bold text-purple-400">{overview.smart_albums_count}</p>
              <p className="text-[10px] text-muted">Auto-curated sets</p>
            </div>
            <div className="p-4 rounded-2xl bg-card border border-card-border space-y-1">
              <p className="text-[11px] font-semibold text-muted">Duplicate Groups</p>
              <p className="text-xl font-bold text-red-400">{overview.duplicate_groups_count}</p>
              <p className="text-[10px] text-muted">Near & exact matches</p>
            </div>
            <div className="p-4 rounded-2xl bg-card border border-card-border space-y-1">
              <p className="text-[11px] font-semibold text-muted">Blurry Photos</p>
              <p className="text-xl font-bold text-zinc-400">{overview.blurry_photos_count}</p>
              <p className="text-[10px] text-muted">Flagged by Laplacian</p>
            </div>
          </div>

          {/* Quick Scene & Moment Breakdown */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="p-6 rounded-2xl bg-card border border-card-border space-y-4">
              <h4 className="text-sm font-bold text-white flex items-center gap-2">
                <Camera className="h-4 w-4 text-primary" /> Scene Classifications
              </h4>
              <div className="space-y-2">
                {Object.entries(overview.scene_breakdown || {}).length === 0 ? (
                  <p className="text-xs text-muted">No scene classifications recorded yet. Run AI analysis above.</p>
                ) : (
                  Object.entries(overview.scene_breakdown || {}).map(([scene, count]) => (
                    <div key={scene} className="flex items-center justify-between text-xs py-1 border-b border-card-border/30">
                      <span className="font-semibold text-white uppercase text-[11px]">{scene.replace(/_/g, ' ')}</span>
                      <span className="px-2 py-0.5 rounded-md bg-background border border-card-border font-mono text-muted">
                        {count as number} photos
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="p-6 rounded-2xl bg-card border border-card-border space-y-4">
              <h4 className="text-sm font-bold text-white flex items-center gap-2">
                <Sun className="h-4 w-4 text-amber-400" /> Exposure & Focus Breakdown
              </h4>
              <div className="space-y-2">
                {Object.entries(overview.exposure_breakdown || {}).length === 0 ? (
                  <p className="text-xs text-muted">No exposure analysis recorded yet.</p>
                ) : (
                  Object.entries(overview.exposure_breakdown || {}).map(([exp, count]) => (
                    <div key={exp} className="flex items-center justify-between text-xs py-1 border-b border-card-border/30">
                      <span className="font-semibold text-white uppercase text-[11px]">{exp}</span>
                      <span className="px-2 py-0.5 rounded-md bg-background border border-card-border font-mono text-muted">
                        {count as number} photos
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SUB-TAB 2: PEOPLE CLUSTERS */}
      {subTab === 'people' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="text-sm font-bold text-white">Identified People Clusters</h4>
              <p className="text-xs text-muted">
                DBSCAN clustered face embeddings. Rename or merge duplicate people clusters.
              </p>
            </div>
          </div>

          {people.length === 0 ? (
            <div className="p-12 text-center rounded-2xl bg-card border border-card-border text-xs text-muted space-y-2">
              <Users className="h-8 w-8 text-muted mx-auto" />
              <p>No people clusters generated yet. Run Full AI Analysis to discover faces.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {people.map((person) => (
                <div key={person.id} className="p-4 rounded-2xl bg-card border border-card-border space-y-3">
                  <div className="flex items-center justify-between">
                    {renameClusterId === person.id ? (
                      <div className="flex items-center gap-1.5 flex-1 mr-2">
                        <input
                          type="text"
                          value={newClusterName}
                          onChange={(e) => setNewClusterName(e.target.value)}
                          className="px-2 py-1 rounded-lg bg-background border border-card-border text-xs text-white flex-1"
                          autoFocus
                        />
                        <button
                          onClick={() => handleRenamePerson(person.id)}
                          className="p-1 bg-emerald-500/20 text-emerald-400 rounded-md"
                        >
                          <Check className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => setRenameClusterId(null)}
                          className="p-1 bg-card border text-muted rounded-md"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-white text-xs">{person.name}</span>
                        <button
                          onClick={() => {
                            setRenameClusterId(person.id);
                            setNewClusterName(person.name);
                          }}
                          className="text-muted hover:text-white p-0.5"
                        >
                          <Edit2 className="h-3 w-3" />
                        </button>
                      </div>
                    )}
                    <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded-md bg-background border border-card-border text-muted">
                      {person.photo_count} photos
                    </span>
                  </div>

                  {/* Sample Photos */}
                  <div className="grid grid-cols-4 gap-1.5 aspect-[4/1]">
                    {(person.sample_photos || []).slice(0, 4).map((p: any, i: number) => (
                      <div key={i} className="rounded-lg overflow-hidden bg-background border border-card-border aspect-square">
                        <img src={p.thumbnail_url} alt="" className="w-full h-full object-cover" />
                      </div>
                    ))}
                  </div>

                  <div className="pt-2 border-t border-card-border flex items-center justify-between text-[11px]">
                    <span className="text-muted font-mono">{person.face_count} faces</span>
                    <button
                      onClick={() => setMergeSourceCluster(person)}
                      className="text-primary font-semibold hover:underline"
                    >
                      Merge with...
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* SUB-TAB 3: SMART ALBUMS */}
      {subTab === 'smart-albums' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="text-sm font-bold text-white">Rule-Based Smart Albums</h4>
              <p className="text-xs text-muted">
                Dynamic virtual photo collections evaluated in real-time from AST rule sets.
              </p>
            </div>
            <button
              onClick={() => setShowCreateAlbumModal(true)}
              className="px-3.5 py-2 rounded-xl bg-primary text-white text-xs font-bold hover:bg-primary-hover transition flex items-center gap-1.5 cursor-pointer"
            >
              <Plus className="h-3.5 w-3.5" />
              New Smart Album
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {smartAlbums.map((album) => (
              <div key={album.id} className="p-5 rounded-2xl bg-card border border-card-border space-y-3 flex flex-col justify-between">
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-white text-sm">{album.name}</span>
                      <span
                        className={`text-[9px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wider ${
                          album.type === 'SYSTEM'
                            ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                            : 'bg-purple-500/10 text-purple-400 border border-purple-500/20'
                        }`}
                      >
                        {album.type}
                      </span>
                    </div>
                    {album.type !== 'SYSTEM' && (
                      <button
                        onClick={() => handleDeleteSmartAlbum(album.id)}
                        className="text-muted hover:text-red-400 p-1"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                  <p className="text-xs text-muted">{album.description || 'Custom Smart Album condition'}</p>
                </div>

                <div className="p-2.5 rounded-xl bg-background border border-card-border text-[11px] font-mono text-muted truncate">
                  Rule: {JSON.stringify(album.rule_json?.conditions?.[0] || album.rule_json)}
                </div>

                <div className="pt-3 border-t border-card-border flex items-center justify-between text-xs">
                  <button
                    onClick={() => handleToggleVisibility(album)}
                    className="flex items-center gap-1.5 text-muted hover:text-white transition"
                    title="Toggle client visibility"
                  >
                    {album.is_visible_to_client ? (
                      <>
                        <Eye className="h-3.5 w-3.5 text-emerald-400" />
                        <span className="text-[11px] text-emerald-400 font-semibold">Client Visible</span>
                      </>
                    ) : (
                      <>
                        <EyeOff className="h-3.5 w-3.5 text-zinc-500" />
                        <span className="text-[11px] text-zinc-500">Photographer Only</span>
                      </>
                    )}
                  </button>

                  <button
                    onClick={() => handleViewSmartAlbumPhotos(album)}
                    className="text-primary font-bold hover:underline"
                  >
                    View Matching Photos →
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* SUB-TAB 4: BEST SHOTS */}
      {subTab === 'best-shots' && (
        <div className="space-y-6">
          <div>
            <h4 className="text-sm font-bold text-white">AI Best-Shot Selection</h4>
            <p className="text-xs text-muted">
              Photos ranked by composite weighted scoring: sharpness (35%), exposure (25%), contrast (15%), composition (15%), and noise (10%).
            </p>
          </div>

          {bestShots.length === 0 ? (
            <div className="p-12 text-center rounded-2xl bg-card border border-card-border text-xs text-muted">
              No best-shot rankings available. Run AI analysis to compute scores.
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
              {bestShots.map((item, idx) => (
                <div key={item.photo_id} className="group relative aspect-square rounded-xl overflow-hidden bg-background border border-card-border">
                  <img src={item.thumbnail_url} alt="" className="w-full h-full object-cover" />
                  <div className="absolute top-2 left-2 px-2 py-0.5 rounded-md bg-amber-500/90 text-black text-[10px] font-bold shadow">
                    #{idx + 1} ({item.score.toFixed(0)} pts)
                  </div>
                  <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 via-black/50 to-transparent p-2 pt-4 flex flex-col text-white text-[9px]">
                    <span className="font-semibold truncate">{item.original_filename}</span>
                    <span className="text-zinc-400">{item.scene || 'PHOTO'} • {item.exposure}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* SUB-TAB 5: DUPLICATES */}
      {subTab === 'duplicates' && (
        <div className="space-y-6">
          <div>
            <h4 className="text-sm font-bold text-white">Duplicates & Near-Duplicate Stacks</h4>
            <p className="text-xs text-muted">
              Exact file hash matches and 64-bit difference hash (dHash) perceptual clustering (Hamming distance &le; 10).
            </p>
          </div>

          {duplicates.length === 0 ? (
            <div className="p-12 text-center rounded-2xl bg-card border border-card-border text-xs text-muted">
              No duplicate or burst shot clusters detected in this gallery.
            </div>
          ) : (
            <div className="space-y-4">
              {duplicates.map((group, gIdx) => (
                <div key={gIdx} className="p-5 rounded-2xl bg-card border border-card-border space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-white uppercase tracking-wider">
                      Cluster Group #{gIdx + 1} ({group.photos.length} photos)
                    </span>
                    <span className="text-[10px] text-muted font-mono">
                      Distance: {group.hamming_distance !== undefined ? group.hamming_distance : 0} bits
                    </span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-3">
                    {group.photos.map((p: any) => (
                      <div key={p.id} className="relative aspect-square rounded-xl overflow-hidden bg-background border border-card-border">
                        <img src={p.thumbnail_url} alt="" className="w-full h-full object-cover" />
                        <div className="absolute bottom-0 inset-x-0 bg-black/80 p-1.5 text-[9px] text-center font-mono text-zinc-300 truncate">
                          {p.original_filename}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* SUB-TAB 6: QUALITY SUMMARY */}
      {subTab === 'quality' && (
        <div className="space-y-6">
          <div>
            <h4 className="text-sm font-bold text-white">Quality Analysis Breakdown</h4>
            <p className="text-xs text-muted">
              Technical image metrics: sharpness, exposure histogram, noise level, and rule-of-thirds composition.
            </p>
          </div>

          {qualitySummary ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="p-6 rounded-2xl bg-card border border-card-border space-y-4">
                <h5 className="text-xs font-bold text-muted uppercase tracking-wider">Exposure Distribution</h5>
                <div className="space-y-2 text-xs">
                  <div className="flex justify-between py-1 border-b border-card-border/30">
                    <span className="text-emerald-400 font-semibold">Normal (Balanced)</span>
                    <span className="font-mono text-white">{qualitySummary.exposure?.normal_count || 0}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-card-border/30">
                    <span className="text-amber-400 font-semibold">Underexposed (&lt;60)</span>
                    <span className="font-mono text-white">{qualitySummary.exposure?.under_count || 0}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-card-border/30">
                    <span className="text-red-400 font-semibold">Overexposed (&gt;195)</span>
                    <span className="font-mono text-white">{qualitySummary.exposure?.over_count || 0}</span>
                  </div>
                </div>
              </div>

              <div className="p-6 rounded-2xl bg-card border border-card-border space-y-4">
                <h5 className="text-xs font-bold text-muted uppercase tracking-wider">Sharpness & Focus</h5>
                <div className="space-y-2 text-xs">
                  <div className="flex justify-between py-1 border-b border-card-border/30">
                    <span className="text-emerald-400 font-semibold">Tack Sharp (&gt;75)</span>
                    <span className="font-mono text-white">{qualitySummary.sharpness?.sharp_count || 0}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-card-border/30">
                    <span className="text-zinc-400 font-semibold">Moderate / Soft</span>
                    <span className="font-mono text-white">{qualitySummary.sharpness?.moderate_count || 0}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-card-border/30">
                    <span className="text-red-400 font-semibold">Blurry Flagged (&lt;45)</span>
                    <span className="font-mono text-white">{qualitySummary.sharpness?.blurry_count || 0}</span>
                  </div>
                </div>
              </div>

              <div className="p-6 rounded-2xl bg-card border border-card-border space-y-4">
                <h5 className="text-xs font-bold text-muted uppercase tracking-wider">Averages</h5>
                <div className="space-y-2 text-xs">
                  <div className="flex justify-between py-1 border-b border-card-border/30">
                    <span className="text-muted">Avg Sharpness Score</span>
                    <span className="font-mono text-white">{qualitySummary.sharpness?.avg_sharpness?.toFixed(1) || '—'} / 100</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-card-border/30">
                    <span className="text-muted">Avg Contrast Score</span>
                    <span className="font-mono text-white">{qualitySummary.avg_contrast?.toFixed(1) || '—'} / 100</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-card-border/30">
                    <span className="text-muted">Avg Composition Score</span>
                    <span className="font-mono text-white">{qualitySummary.avg_composition?.toFixed(1) || '—'} / 100</span>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="p-12 text-center rounded-2xl bg-card border border-card-border text-xs text-muted">
              Quality summary not loaded. Run Full AI Analysis above.
            </div>
          )}
        </div>
      )}

      {/* CREATE SMART ALBUM MODAL */}
      {showCreateAlbumModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <form
            onSubmit={handleCreateSmartAlbum}
            className="bg-card border border-card-border rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl"
          >
            <div className="flex items-center justify-between border-b border-card-border pb-3">
              <h3 className="text-sm font-bold text-white">Create Custom Smart Album</h3>
              <button onClick={() => setShowCreateAlbumModal(false)} className="text-muted hover:text-white">
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="text-muted font-medium">Smart Album Name *</label>
                <input
                  type="text"
                  placeholder="e.g. 5-Star Highlights, High Exposure Shots"
                  value={albumName}
                  onChange={(e) => setAlbumName(e.target.value)}
                  className="w-full mt-1 px-3 py-2 rounded-xl bg-background border border-card-border text-white text-xs"
                  required
                />
              </div>

              <div>
                <label className="text-muted font-medium">Description</label>
                <input
                  type="text"
                  placeholder="Optional notes"
                  value={albumDesc}
                  onChange={(e) => setAlbumDesc(e.target.value)}
                  className="w-full mt-1 px-3 py-2 rounded-xl bg-background border border-card-border text-white text-xs"
                />
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="text-muted font-medium">Field</label>
                  <select
                    value={albumField}
                    onChange={(e) => setAlbumField(e.target.value)}
                    className="w-full mt-1 px-2.5 py-2 rounded-xl bg-background border border-card-border text-white text-xs"
                  >
                    <option value="overall_score">Overall Score</option>
                    <option value="sharpness_score">Sharpness</option>
                    <option value="scene">Scene Category</option>
                    <option value="exposure_class">Exposure Class</option>
                    <option value="is_blurry">Is Blurry</option>
                  </select>
                </div>

                <div>
                  <label className="text-muted font-medium">Operator</label>
                  <select
                    value={albumOperator}
                    onChange={(e) => setAlbumOperator(e.target.value)}
                    className="w-full mt-1 px-2.5 py-2 rounded-xl bg-background border border-card-border text-white text-xs"
                  >
                    <option value="gte">&gt;= (Greater/Equal)</option>
                    <option value="gt">&gt; (Greater)</option>
                    <option value="lte">&lt;= (Less/Equal)</option>
                    <option value="lt">&lt; (Less)</option>
                    <option value="eq">== (Equals)</option>
                  </select>
                </div>

                <div>
                  <label className="text-muted font-medium">Value</label>
                  <input
                    type="text"
                    value={albumValue}
                    onChange={(e) => setAlbumValue(e.target.value)}
                    className="w-full mt-1 px-3 py-2 rounded-xl bg-background border border-card-border text-white text-xs"
                    required
                  />
                </div>
              </div>

              <div className="flex items-center gap-2 pt-2">
                <input
                  type="checkbox"
                  id="clientVisible"
                  checked={albumClientVisible}
                  onChange={(e) => setAlbumClientVisible(e.target.checked)}
                  className="rounded border-card-border"
                />
                <label htmlFor="clientVisible" className="text-muted text-xs cursor-pointer">
                  Visible to clients in public gallery
                </label>
              </div>
            </div>

            <div className="flex items-center gap-2 pt-3 border-t border-card-border">
              <button
                type="button"
                onClick={() => setShowCreateAlbumModal(false)}
                className="flex-1 py-2 rounded-xl bg-card border border-card-border text-xs font-semibold text-muted hover:text-white"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="flex-1 py-2 rounded-xl bg-primary text-white text-xs font-bold hover:bg-primary-hover"
              >
                Create Smart Album
              </button>
            </div>
          </form>
        </div>
      )}

      {/* MERGE CLUSTER MODAL */}
      {mergeSourceCluster && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-card border border-card-border rounded-2xl max-w-sm w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-card-border pb-3">
              <h3 className="text-sm font-bold text-white">Merge Person Cluster</h3>
              <button onClick={() => setMergeSourceCluster(null)} className="text-muted hover:text-white">
                <X className="h-4 w-4" />
              </button>
            </div>

            <p className="text-xs text-muted">
              Merge all faces from <strong className="text-white">{mergeSourceCluster.name}</strong> into another person:
            </p>

            <select
              value={mergeTargetId}
              onChange={(e) => setMergeTargetId(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-background border border-card-border text-xs text-white"
            >
              <option value="">Select target person...</option>
              {people
                .filter((p) => p.id !== mergeSourceCluster.id)
                .map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} ({p.photo_count} photos)
                  </option>
                ))}
            </select>

            <div className="flex items-center gap-2 pt-2 border-t border-card-border">
              <button
                onClick={() => setMergeSourceCluster(null)}
                className="flex-1 py-2 rounded-xl bg-card border border-card-border text-xs text-muted hover:text-white"
              >
                Cancel
              </button>
              <button
                onClick={handleMergePerson}
                disabled={!mergeTargetId}
                className="flex-1 py-2 rounded-xl bg-primary text-white text-xs font-bold hover:bg-primary-hover disabled:opacity-50"
              >
                Merge Clusters
              </button>
            </div>
          </div>
        </div>
      )}

      {/* VIEW SMART ALBUM PHOTOS MODAL */}
      {viewingAlbumPhotos && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-card border border-card-border rounded-2xl max-w-3xl w-full max-h-[80vh] flex flex-col shadow-2xl overflow-hidden">
            <div className="p-4 border-b border-card-border flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-white">{viewingAlbumPhotos.album.name}</h3>
                <p className="text-xs text-muted">{viewingAlbumPhotos.photos.length} photos matched by rule engine</p>
              </div>
              <button onClick={() => setViewingAlbumPhotos(null)} className="text-muted hover:text-white">
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="p-4 flex-1 overflow-y-auto grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3">
              {viewingAlbumPhotos.photos.map((p: any) => (
                <div key={p.id} className="aspect-square rounded-xl overflow-hidden bg-background border border-card-border relative">
                  <img src={p.thumbnail_url} alt="" className="w-full h-full object-cover" />
                  <div className="absolute bottom-0 inset-x-0 bg-black/80 p-1 text-[8px] font-mono text-zinc-300 text-center truncate">
                    {p.original_filename}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
