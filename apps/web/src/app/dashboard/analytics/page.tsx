'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { DashboardHeader } from '@/components/layout/DashboardHeader';
import { fetchApi } from '@/lib/api-client';
import { formatBytes, formatDate } from '@pixmatch/ui';
import {
  TrendingUp,
  TrendingDown,
  Eye,
  Heart,
  CheckSquare,
  Download,
  Sparkles,
  Users,
  HardDrive,
  Calendar,
  DownloadCloud,
  FileSpreadsheet,
  FileCode,
  RefreshCw,
  ArrowRight,
  ShieldCheck,
  AlertCircle,
  ExternalLink,
  ChevronRight,
  Layers,
  BarChart3,
  Clock,
  CheckCircle2,
} from 'lucide-react';
import {
  AnalyticsOverviewDTO,
  AnalyticsTimeseriesPointDTO,
  GalleryAnalyticsItemDTO,
  ClientAnalyticsSummaryDTO,
  AiAnalyticsSummaryDTO,
  StorageAnalyticsSummaryDTO,
  DownloadAnalyticsSummaryDTO,
} from '@pixmatch/types';

export default function StudioAnalyticsPage() {
  const [preset, setPreset] = useState<'today' | '7d' | '30d' | '90d' | 'year'>('30d');
  const [activeTab, setActiveTab] = useState<'galleries' | 'clients' | 'ai' | 'storage'>('galleries');
  const [chartMetric, setChartMetric] = useState<'gallery_views' | 'favorites' | 'selections' | 'downloads' | 'find_my_photos_searches'>('gallery_views');

  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Data states
  const [overview, setOverview] = useState<AnalyticsOverviewDTO | null>(null);
  const [timeseries, setTimeseries] = useState<AnalyticsTimeseriesPointDTO[]>([]);
  const [galleries, setGalleries] = useState<GalleryAnalyticsItemDTO[]>([]);
  const [clients, setClients] = useState<ClientAnalyticsSummaryDTO | null>(null);
  const [aiStats, setAiStats] = useState<AiAnalyticsSummaryDTO | null>(null);
  const [storage, setStorage] = useState<StorageAnalyticsSummaryDTO | null>(null);
  const [downloads, setDownloads] = useState<DownloadAnalyticsSummaryDTO | null>(null);

  const loadAllAnalytics = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [ovRes, tsRes, galRes, cliRes, aiRes, stRes, dlRes] = await Promise.all([
        fetchApi<AnalyticsOverviewDTO>(`/analytics/overview?preset=${preset}`),
        fetchApi<{ points: AnalyticsTimeseriesPointDTO[] }>(`/analytics/timeseries?preset=${preset}`),
        fetchApi<{ galleries: GalleryAnalyticsItemDTO[] }>(`/analytics/galleries?preset=${preset}`),
        fetchApi<ClientAnalyticsSummaryDTO>(`/analytics/clients?preset=${preset}`),
        fetchApi<AiAnalyticsSummaryDTO>(`/analytics/ai?preset=${preset}`),
        fetchApi<StorageAnalyticsSummaryDTO>('/analytics/storage'),
        fetchApi<DownloadAnalyticsSummaryDTO>(`/analytics/downloads?preset=${preset}`),
      ]);

      if (ovRes.success && ovRes.data) setOverview(ovRes.data);
      if (tsRes.success && tsRes.data) setTimeseries(tsRes.data.points || []);
      if (galRes.success && galRes.data) setGalleries(galRes.data.galleries || []);
      if (cliRes.success && cliRes.data) setClients(cliRes.data);
      if (aiRes.success && aiRes.data) setAiStats(aiRes.data);
      if (stRes.success && stRes.data) setStorage(stRes.data);
      if (dlRes.success && dlRes.data) setDownloads(dlRes.data);
    } catch (err: unknown) {
      setError('Failed to load studio analytics data. Please check your network connection.');
    } finally {
      setLoading(false);
    }
  }, [preset]);

  useEffect(() => {
    loadAllAnalytics();
  }, [loadAllAnalytics]);

  const handleExport = async (format: 'csv' | 'json') => {
    setExporting(true);
    try {
      if (format === 'json') {
        const res = await fetchApi(`/analytics/export?preset=${preset}&format=json`);
        if (res.success && res.data) {
          const blob = new Blob([JSON.stringify(res.data, null, 2)], { type: 'application/json' });
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `pixmatch-analytics-${preset}-${new Date().toISOString().slice(0, 10)}.json`;
          a.click();
          URL.revokeObjectURL(url);
        }
      } else {
        const token = typeof window !== 'undefined' ? localStorage.getItem('pixmatch_token') : '';
        const response = await fetch(`http://localhost:3001/api/v1/analytics/export?preset=${preset}&format=csv`, {
          headers: {
            Authorization: `Bearer ${token}`,
            'x-studio-id': typeof window !== 'undefined' ? localStorage.getItem('pixmatch_studio_id') || '' : '',
          },
        });
        if (response.ok) {
          const text = await response.text();
          const blob = new Blob([text], { type: 'text/csv;charset=utf-8;' });
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `pixmatch-analytics-${preset}-${new Date().toISOString().slice(0, 10)}.csv`;
          a.click();
          URL.revokeObjectURL(url);
        }
      }
    } finally {
      setExporting(false);
    }
  };

  // Chart max value calculation
  const maxChartValue = Math.max(
    ...timeseries.map((p) => p[chartMetric] || 0),
    1
  );

  return (
    <div className="flex-1 min-h-screen bg-background flex flex-col">
      <DashboardHeader
        title="Studio Analytics & Intelligence"
        subtitle="Track visitor velocity, client engagement, AI face search usage, and delivery conversions"
      />

      <main className="flex-1 p-6 sm:p-8 max-w-7xl mx-auto w-full space-y-8">
        {/* Top Controls Bar: Presets & Actions */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-card border border-card-border p-5 rounded-2xl shadow-sm">
          {/* Preset Pills */}
          <div className="flex items-center gap-1.5 p-1 bg-card-border/30 rounded-xl overflow-x-auto">
            {(['today', '7d', '30d', '90d', 'year'] as const).map((p) => (
              <button
                key={p}
                onClick={() => setPreset(p)}
                className={`px-3.5 py-1.5 text-xs font-bold rounded-lg transition whitespace-nowrap ${
                  preset === p
                    ? 'bg-primary text-white shadow-sm'
                    : 'text-muted hover:text-white hover:bg-card-border/50'
                }`}
              >
                {p === 'today' ? 'Today' : p === '7d' ? 'Last 7 Days' : p === '30d' ? 'Last 30 Days' : p === '90d' ? 'Last 90 Days' : 'This Year'}
              </button>
            ))}
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-2.5 flex-wrap">
            <button
              onClick={() => loadAllAnalytics()}
              disabled={loading}
              className="p-2.5 rounded-xl bg-card-border/40 hover:bg-card-border text-muted hover:text-white transition disabled:opacity-50"
              title="Refresh Analytics"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            </button>

            <button
              onClick={() => handleExport('csv')}
              disabled={exporting || loading}
              className="px-4 py-2 text-xs font-bold bg-card-border hover:bg-card-border/80 text-white rounded-xl transition flex items-center gap-2 shadow-sm disabled:opacity-50"
            >
              <FileSpreadsheet className="h-4 w-4 text-emerald-400" />
              Export CSV
            </button>

            <button
              onClick={() => handleExport('json')}
              disabled={exporting || loading}
              className="px-4 py-2 text-xs font-bold bg-card-border hover:bg-card-border/80 text-white rounded-xl transition flex items-center gap-2 shadow-sm disabled:opacity-50"
            >
              <FileCode className="h-4 w-4 text-blue-400" />
              Export JSON
            </button>
          </div>
        </div>

        {/* Deterministic Insight Engine Banner */}
        {overview?.deterministic_insights && overview.deterministic_insights.length > 0 && (
          <div className="p-4 rounded-2xl bg-gradient-to-r from-primary/10 via-accent/10 to-transparent border border-primary/20 flex items-center gap-3">
            <Sparkles className="h-5 w-5 text-primary flex-shrink-0" />
            <div className="flex-1 space-y-0.5 text-xs">
              <span className="font-bold text-white uppercase tracking-wider text-[10px]">Studio Intelligence Insight</span>
              <p className="text-muted font-medium">{overview.deterministic_insights.join(' ')}</p>
            </div>
          </div>
        )}

        {/* Top KPI Cards (6 Grid) */}
        {loading && !overview ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 animate-pulse">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-28 bg-card border border-card-border rounded-2xl" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {/* Gallery Views */}
            <div className="bg-card border border-card-border p-5 rounded-2xl space-y-2 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-muted">Gallery Views</span>
                <Eye className="h-4 w-4 text-primary" />
              </div>
              <p className="text-2xl font-extrabold text-white tracking-tight">
                {overview?.metrics.gallery_views.current.toLocaleString() || 0}
              </p>
              <div className="flex items-center gap-1 text-[11px]">
                {overview?.metrics.gallery_views.trend === 'UP' ? (
                  <span className="text-emerald-400 font-semibold flex items-center gap-0.5">
                    <TrendingUp className="h-3 w-3" /> +{overview.metrics.gallery_views.change_percentage}%
                  </span>
                ) : overview?.metrics.gallery_views.trend === 'DOWN' ? (
                  <span className="text-rose-400 font-semibold flex items-center gap-0.5">
                    <TrendingDown className="h-3 w-3" /> {overview.metrics.gallery_views.change_percentage}%
                  </span>
                ) : (
                  <span className="text-muted">0% change</span>
                )}
                <span className="text-muted/70 text-[10px]">vs prior</span>
              </div>
            </div>

            {/* Unique Visitors */}
            <div className="bg-card border border-card-border p-5 rounded-2xl space-y-2 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-muted">Unique Visitors</span>
                <Users className="h-4 w-4 text-blue-400" />
              </div>
              <p className="text-2xl font-extrabold text-white tracking-tight">
                {overview?.metrics.unique_visitors.current.toLocaleString() || 0}
              </p>
              <div className="flex items-center gap-1 text-[11px]">
                {overview?.metrics.unique_visitors.trend === 'UP' ? (
                  <span className="text-emerald-400 font-semibold flex items-center gap-0.5">
                    <TrendingUp className="h-3 w-3" /> +{overview.metrics.unique_visitors.change_percentage}%
                  </span>
                ) : overview?.metrics.unique_visitors.trend === 'DOWN' ? (
                  <span className="text-rose-400 font-semibold flex items-center gap-0.5">
                    <TrendingDown className="h-3 w-3" /> {overview.metrics.unique_visitors.change_percentage}%
                  </span>
                ) : (
                  <span className="text-muted">0% change</span>
                )}
                <span className="text-muted/70 text-[10px]">vs prior</span>
              </div>
            </div>

            {/* Favorites */}
            <div className="bg-card border border-card-border p-5 rounded-2xl space-y-2 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-muted">Favorites</span>
                <Heart className="h-4 w-4 text-rose-400" />
              </div>
              <p className="text-2xl font-extrabold text-white tracking-tight">
                {overview?.metrics.favorites.current.toLocaleString() || 0}
              </p>
              <div className="flex items-center gap-1 text-[11px]">
                {overview?.metrics.favorites.trend === 'UP' ? (
                  <span className="text-emerald-400 font-semibold flex items-center gap-0.5">
                    <TrendingUp className="h-3 w-3" /> +{overview.metrics.favorites.change_percentage}%
                  </span>
                ) : (
                  <span className="text-muted">
                    {overview?.metrics.favorites.change_percentage || 0}% change
                  </span>
                )}
                <span className="text-muted/70 text-[10px]">vs prior</span>
              </div>
            </div>

            {/* Selections */}
            <div className="bg-card border border-card-border p-5 rounded-2xl space-y-2 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-muted">Selections</span>
                <CheckSquare className="h-4 w-4 text-amber-400" />
              </div>
              <p className="text-2xl font-extrabold text-white tracking-tight">
                {overview?.metrics.selections.current.toLocaleString() || 0}
              </p>
              <div className="flex items-center gap-1 text-[11px]">
                {overview?.metrics.selections.trend === 'UP' ? (
                  <span className="text-emerald-400 font-semibold flex items-center gap-0.5">
                    <TrendingUp className="h-3 w-3" /> +{overview.metrics.selections.change_percentage}%
                  </span>
                ) : (
                  <span className="text-muted">{overview?.metrics.selections.change_percentage || 0}%</span>
                )}
                <span className="text-muted/70 text-[10px]">vs prior</span>
              </div>
            </div>

            {/* Downloads */}
            <div className="bg-card border border-card-border p-5 rounded-2xl space-y-2 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-muted">Downloads</span>
                <Download className="h-4 w-4 text-emerald-400" />
              </div>
              <p className="text-2xl font-extrabold text-white tracking-tight">
                {overview?.metrics.downloads.current.toLocaleString() || 0}
              </p>
              <div className="flex items-center gap-1 text-[11px]">
                <span className="text-muted font-medium">
                  {formatBytes(overview?.metrics.download_bytes.current || 0)} transferred
                </span>
              </div>
            </div>

            {/* AI Searches */}
            <div className="bg-card border border-card-border p-5 rounded-2xl space-y-2 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-muted">Find My Photos</span>
                <Sparkles className="h-4 w-4 text-accent" />
              </div>
              <p className="text-2xl font-extrabold text-white tracking-tight">
                {overview?.metrics.find_my_photos_searches.current.toLocaleString() || 0}
              </p>
              <div className="flex items-center gap-1 text-[11px]">
                <span className="text-emerald-400 font-semibold">
                  {overview?.metrics.match_rate_percentage.current || 0}% match rate
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Interactive Timeseries Chart */}
        <div className="p-6 rounded-2xl bg-card border border-card-border space-y-6 shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h3 className="text-base font-bold text-white">Engagement Velocity Timeline</h3>
              <p className="text-xs text-muted">Daily distribution of client interactions across active galleries</p>
            </div>

            {/* Metric Switcher Tabs */}
            <div className="flex items-center gap-1 p-1 bg-card-border/30 rounded-xl overflow-x-auto">
              {[
                { key: 'gallery_views', label: 'Views' },
                { key: 'favorites', label: 'Favorites' },
                { key: 'selections', label: 'Selections' },
                { key: 'downloads', label: 'Downloads' },
                { key: 'find_my_photos_searches', label: 'AI Searches' },
              ].map((m) => (
                <button
                  key={m.key}
                  onClick={() => setChartMetric(m.key as any)}
                  className={`px-3 py-1 text-xs font-semibold rounded-lg transition whitespace-nowrap ${
                    chartMetric === m.key ? 'bg-primary text-white' : 'text-muted hover:text-white'
                  }`}
                >
                  {m.label}
                </button>
              ))}
            </div>
          </div>

          {/* Timeseries Visualizer */}
          {timeseries.length > 0 ? (
            <div className="h-56 flex items-end justify-between gap-1.5 pt-6 pb-2 px-2 border-b border-card-border overflow-x-auto">
              {timeseries.map((pt) => {
                const val = pt[chartMetric] || 0;
                const heightPercent = maxChartValue > 0 ? Math.max((val / maxChartValue) * 100, 4) : 4;
                return (
                  <div key={pt.date} className="flex-1 min-w-[24px] flex flex-col items-center gap-2 h-full justify-end group">
                    <div className="text-[10px] text-muted opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                      {val}
                    </div>
                    <div
                      className="w-full max-w-[36px] bg-gradient-to-t from-primary to-accent rounded-t-md transition-all group-hover:brightness-125"
                      style={{ height: `${heightPercent}%` }}
                    />
                    <span className="text-[10px] text-muted font-medium truncate w-full text-center">
                      {pt.date.slice(5)}
                    </span>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="h-48 flex items-center justify-center text-xs text-muted">
              No activity recorded during this period.
            </div>
          )}
        </div>

        {/* Engagement Funnel Card */}
        {overview?.engagement_funnel && (
          <div className="p-6 rounded-2xl bg-card border border-card-border space-y-4 shadow-sm">
            <h3 className="text-base font-bold text-white">Gallery Delivery & Conversion Funnel</h3>
            <p className="text-xs text-muted">Conversion progression from initial send to client high-res download</p>

            <div className="grid grid-cols-2 md:grid-cols-6 gap-3 pt-2">
              {[
                { stage: '1. Delivered', count: overview.engagement_funnel.delivered, color: 'text-muted' },
                { stage: '2. Opened', count: overview.engagement_funnel.opened, color: 'text-blue-400' },
                { stage: '3. Viewed', count: overview.engagement_funnel.viewed, color: 'text-primary' },
                { stage: '4. Favorited', count: overview.engagement_funnel.favorited, color: 'text-rose-400' },
                { stage: '5. Selected', count: overview.engagement_funnel.selected, color: 'text-amber-400' },
                { stage: '6. Downloaded', count: overview.engagement_funnel.downloaded, color: 'text-emerald-400' },
              ].map((step, idx) => (
                <div key={step.stage} className="p-4 rounded-xl bg-card-border/20 border border-card-border/40 space-y-1 text-center">
                  <span className="text-[11px] font-semibold text-muted">{step.stage}</span>
                  <p className={`text-xl font-extrabold ${step.color}`}>{step.count.toLocaleString()}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 4 Deep-Dive Sub-Tabs */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 border-b border-card-border pb-2 overflow-x-auto">
            {[
              { id: 'galleries', label: 'Galleries Leaderboard', icon: Layers },
              { id: 'clients', label: 'Client Intelligence', icon: Users },
              { id: 'ai', label: 'AI Face Recognition', icon: Sparkles },
              { id: 'storage', label: 'Storage & Downloads', icon: HardDrive },
            ].map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`px-4 py-2 text-xs font-bold rounded-xl transition flex items-center gap-2 whitespace-nowrap ${
                    activeTab === tab.id
                      ? 'bg-card border border-card-border text-white shadow-sm'
                      : 'text-muted hover:text-white hover:bg-card/50'
                  }`}
                >
                  <Icon className="h-4 w-4 text-primary" />
                  {tab.label}
                </button>
              );
            })}
          </div>

          {/* Tab 1: Galleries Leaderboard */}
          {activeTab === 'galleries' && (
            <div className="bg-card border border-card-border rounded-2xl overflow-hidden shadow-sm">
              <div className="p-5 border-b border-card-border flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-bold text-white">Top Performing Galleries</h4>
                  <p className="text-xs text-muted">Ranked by composite engagement score (views, favorites, selections, downloads)</p>
                </div>
              </div>

              {galleries.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-card-border/60 text-muted font-semibold uppercase tracking-wider text-[10px]">
                        <th className="py-3 px-4">Gallery</th>
                        <th className="py-3 px-4">Photos</th>
                        <th className="py-3 px-4">Views</th>
                        <th className="py-3 px-4">Favorites</th>
                        <th className="py-3 px-4">Selections</th>
                        <th className="py-3 px-4">Downloads</th>
                        <th className="py-3 px-4">AI Searches</th>
                        <th className="py-3 px-4">Score</th>
                        <th className="py-3 px-4 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-card-border/40">
                      {galleries.map((g) => (
                        <tr key={g.id} className="hover:bg-card-border/20 transition">
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-3">
                              <div className="h-10 w-10 rounded-lg overflow-hidden bg-card-border flex-shrink-0">
                                {g.cover_photo_url ? (
                                  <img src={g.cover_photo_url} alt={g.title} className="h-full w-full object-cover" />
                                ) : (
                                  <div className="h-full w-full flex items-center justify-center text-muted font-bold">
                                    {g.title.slice(0, 1)}
                                  </div>
                                )}
                              </div>
                              <div className="min-w-0">
                                <Link
                                  href={`/dashboard/galleries/${g.id}`}
                                  className="font-bold text-white hover:text-primary transition truncate block"
                                >
                                  {g.title}
                                </Link>
                                <span className="text-[11px] text-muted">{g.event_type} • {formatDate(g.event_date)}</span>
                              </div>
                            </div>
                          </td>
                          <td className="py-3 px-4 text-muted font-medium">{g.photo_count}</td>
                          <td className="py-3 px-4 font-bold text-white">{g.views_count}</td>
                          <td className="py-3 px-4 text-rose-400 font-semibold">{g.favorites_count}</td>
                          <td className="py-3 px-4 text-amber-400 font-semibold">{g.selections_count}</td>
                          <td className="py-3 px-4 text-emerald-400 font-semibold">{g.downloads_count}</td>
                          <td className="py-3 px-4 text-blue-400 font-semibold">{g.ai_searches_count}</td>
                          <td className="py-3 px-4">
                            <span className="px-2 py-0.5 rounded-md bg-primary/10 text-primary font-extrabold text-[11px]">
                              {g.engagement_score}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-right">
                            <Link
                              href={`/dashboard/galleries/${g.id}`}
                              className="px-3 py-1 bg-card-border hover:bg-card-border/80 text-white rounded-lg text-xs font-semibold transition"
                            >
                              Manage
                            </Link>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="p-8 text-center text-xs text-muted">No galleries found in this studio.</div>
              )}
            </div>
          )}

          {/* Tab 2: Client Intelligence */}
          {activeTab === 'clients' && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="p-5 rounded-2xl bg-card border border-card-border space-y-1">
                  <span className="text-xs text-muted font-medium">Total Clients</span>
                  <p className="text-2xl font-bold text-white">{clients?.total_clients || 0}</p>
                </div>
                <div className="p-5 rounded-2xl bg-card border border-card-border space-y-1">
                  <span className="text-xs text-muted font-medium">New Clients (Period)</span>
                  <p className="text-2xl font-bold text-emerald-400">+{clients?.new_clients_in_period || 0}</p>
                </div>
                <div className="p-5 rounded-2xl bg-card border border-card-border space-y-1">
                  <span className="text-xs text-muted font-medium">Active Clients</span>
                  <p className="text-2xl font-bold text-blue-400">{clients?.active_clients_in_period || 0}</p>
                </div>
                <div className="p-5 rounded-2xl bg-card border border-card-border space-y-1">
                  <span className="text-xs text-muted font-medium">Clients with Galleries</span>
                  <p className="text-2xl font-bold text-primary">{clients?.clients_with_galleries_count || 0}</p>
                </div>
              </div>

              <div className="bg-card border border-card-border rounded-2xl overflow-hidden shadow-sm">
                <div className="p-5 border-b border-card-border flex items-center justify-between">
                  <h4 className="text-sm font-bold text-white">Top Active Clients</h4>
                  <Link href="/dashboard/clients" className="text-xs font-semibold text-primary hover:text-accent">
                    Open CRM →
                  </Link>
                </div>

                {clients?.top_active_clients && clients.top_active_clients.length > 0 ? (
                  <div className="divide-y divide-card-border/40">
                    {clients.top_active_clients.map((c) => (
                      <div key={c.id} className="p-4 flex items-center justify-between hover:bg-card-border/20 transition">
                        <div className="space-y-0.5">
                          <Link href={`/dashboard/clients/${c.id}`} className="text-sm font-bold text-white hover:text-primary">
                            {c.name}
                          </Link>
                          <p className="text-xs text-muted">{c.email} • {c.galleries_count} galleries assigned</p>
                        </div>
                        <span className="text-xs text-muted">
                          {c.last_activity_at ? formatDate(c.last_activity_at) : 'No recent activity'}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-8 text-center text-xs text-muted">No client records found.</div>
                )}
              </div>
            </div>
          )}

          {/* Tab 3: AI Face Recognition */}
          {activeTab === 'ai' && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="p-5 rounded-2xl bg-card border border-card-border space-y-1">
                  <span className="text-xs text-muted font-medium">Total AI Searches</span>
                  <p className="text-2xl font-bold text-white">{aiStats?.total_searches || 0}</p>
                </div>
                <div className="p-5 rounded-2xl bg-card border border-card-border space-y-1">
                  <span className="text-xs text-muted font-medium">Overall Match Rate</span>
                  <p className="text-2xl font-bold text-emerald-400">{aiStats?.match_rate_percentage || 0}%</p>
                </div>
                <div className="p-5 rounded-2xl bg-card border border-card-border space-y-1">
                  <span className="text-xs text-muted font-medium">Faces Indexed</span>
                  <p className="text-2xl font-bold text-blue-400">{aiStats?.faces_indexed_count || 0}</p>
                </div>
                <div className="p-5 rounded-2xl bg-card border border-card-border space-y-1">
                  <span className="text-xs text-muted font-medium">Avg Search Latency</span>
                  <p className="text-2xl font-bold text-primary">{aiStats?.avg_processing_time_ms || 0}ms</p>
                </div>
              </div>

              <div className="p-6 rounded-2xl bg-card border border-card-border space-y-4">
                <h4 className="text-sm font-bold text-white flex items-center gap-2">
                  <ShieldCheck className="h-4 w-4 text-emerald-400" />
                  Biometric Privacy & Compliance Architecture
                </h4>
                <p className="text-xs text-muted leading-relaxed">
                  PixMatch AI processes visitor selfies strictly in-memory during vector similarity search.
                  No raw selfies, facial embeddings, or biometric templates are ever persisted to disk or stored in CRM tables.
                  Public gallery searches are strictly isolated to the respective gallery and studio.
                </p>
              </div>
            </div>
          )}

          {/* Tab 4: Storage & Downloads */}
          {activeTab === 'storage' && (
            <div className="space-y-4">
              <div className="p-6 rounded-2xl bg-card border border-card-border space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-bold text-white">Storage Quota Utilization</h4>
                  <span className="text-xs font-bold text-primary">{storage?.usage_percentage || 0}% Used</span>
                </div>

                <div className="w-full bg-card-border/60 rounded-full h-2.5 overflow-hidden">
                  <div
                    className="h-2.5 rounded-full bg-gradient-to-r from-primary to-accent"
                    style={{ width: `${storage?.usage_percentage || 0}%` }}
                  />
                </div>

                <div className="flex justify-between text-xs text-muted">
                  <span>{formatBytes(storage?.total_storage_bytes || 0)} used</span>
                  <span>{formatBytes(storage?.storage_limit_bytes || 0)} limit</span>
                </div>
              </div>

              {/* Galleries storage table */}
              <div className="bg-card border border-card-border rounded-2xl overflow-hidden shadow-sm">
                <div className="p-5 border-b border-card-border">
                  <h4 className="text-sm font-bold text-white">Storage by Gallery</h4>
                </div>

                {storage?.galleries_breakdown && storage.galleries_breakdown.length > 0 ? (
                  <div className="divide-y divide-card-border/40">
                    {storage.galleries_breakdown.map((g) => (
                      <div key={g.gallery_id} className="p-4 flex items-center justify-between text-xs">
                        <div className="space-y-0.5">
                          <span className="font-bold text-white">{g.title}</span>
                          <p className="text-[11px] text-muted">{g.photo_count} photos</p>
                        </div>
                        <div className="text-right">
                          <span className="font-bold text-white">{formatBytes(g.storage_bytes)}</span>
                          <p className="text-[10px] text-muted">{g.percentage_of_total}% of total</p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-8 text-center text-xs text-muted">No storage breakdown available.</div>
                )}
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
