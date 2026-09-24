'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { DashboardHeader } from '@/components/layout/DashboardHeader';
import { useAuth } from '@/lib/auth-context';
import { fetchApi } from '@/lib/api-client';
import { formatBytes, formatDate } from '@pixmatch/ui';
import {
  Images,
  Camera,
  HardDrive,
  Sparkles,
  Users,
  Heart,
  CheckSquare,
  ArrowUpRight,
  Plus,
  Cpu,
  CheckCircle2,
  Clock,
  ExternalLink,
  Loader2,
  RefreshCw,
  AlertCircle,
  FolderPlus,
} from 'lucide-react';

interface DashboardData {
  metrics: {
    totalGalleries: number;
    totalPhotos: number;
    aiIndexedPhotos: number;
    totalClients: number;
    storageUsedBytes: number;
    aiSearches: number;
    clientVisits: number;
    totalFavorites: number;
    totalSelections: number;
    downloadsCount: number;
  };
  recentGalleries: Array<{
    id: string;
    title: string;
    slug: string;
    cover_photo_url?: string;
    event_type: string;
    event_date: string;
    status: string;
    photo_count: number;
    client_count: number;
    favorites_count: number;
    selections_count: number;
    client_views: number;
  }>;
  recentJobs: Array<{
    id: string;
    job_type: string;
    status: string;
    progress: number;
    created_at: string;
  }>;
}

export default function DashboardOverviewPage() {
  const { user, studio } = useAuth();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = useCallback(async (isSilent = false) => {
    if (!isSilent) setLoading(true);
    else setRefreshing(true);

    try {
      const res = await fetchApi('/analytics/overview');
      if (res.success && res.data) {
        setData(res.data);
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadData();

    // Sensible polling interval (15s) with document visibility check
    const interval = setInterval(() => {
      if (typeof document !== 'undefined' && document.visibilityState === 'visible') {
        loadData(true);
      }
    }, 15000);

    return () => clearInterval(interval);
  }, [loadData]);

  const metrics = data?.metrics || {
    totalGalleries: 0,
    totalPhotos: 0,
    aiIndexedPhotos: 0,
    totalClients: 0,
    storageUsedBytes: 0,
    aiSearches: 0,
    clientVisits: 0,
    totalFavorites: 0,
    totalSelections: 0,
    downloadsCount: 0,
  };

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
  };

  return (
    <div className="flex-1 min-h-screen bg-background flex flex-col">
      <DashboardHeader
        title={`${getGreeting()}, ${user?.name?.split(' ')[0] || 'Photographer'}`}
        subtitle={`Studio overview for ${studio?.name || 'PixMatch Studio'}`}
      />

      <div className="p-6 sm:p-8 max-w-7xl mx-auto w-full space-y-8">
        {/* Top Action Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-card border border-card-border p-6 rounded-2xl shadow-sm">
          <div className="space-y-1">
            <h2 className="text-xl font-bold text-white tracking-tight">Studio Workspace</h2>
            <p className="text-xs text-muted">Manage your client events, AI face indexing, and photo distribution</p>
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            <button
              onClick={() => loadData(true)}
              disabled={refreshing}
              className="p-2.5 rounded-xl bg-card-border/40 hover:bg-card-border text-muted hover:text-white transition disabled:opacity-50"
              title="Refresh Stats"
            >
              <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
            </button>

            <Link
              href="/dashboard/storage"
              className="px-4 py-2 text-xs font-semibold bg-card-border hover:bg-card-border/80 text-white rounded-xl transition flex items-center gap-2"
            >
              <HardDrive className="h-4 w-4 text-muted" />
              Storage
            </Link>

            <Link
              href="/dashboard/galleries/new"
              className="px-5 py-2 text-xs font-bold bg-primary hover:bg-primary-hover text-white rounded-xl transition shadow-md shadow-primary/20 flex items-center gap-2"
            >
              <Plus className="h-4 w-4" />
              New Gallery
            </Link>
          </div>
        </div>

        {/* Real Database Metric Stat Cards */}
        {loading ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 animate-pulse">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-28 bg-card border border-card-border rounded-2xl" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {/* Total Galleries */}
            <div className="bg-card border border-card-border p-5 rounded-2xl shadow-sm hover:border-card-border/80 transition space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-muted">Galleries</span>
                <div className="p-2 rounded-xl bg-primary/10 text-primary">
                  <Images className="h-4 w-4" />
                </div>
              </div>
              <p className="text-2xl font-bold text-white tracking-tight">{metrics.totalGalleries}</p>
              <p className="text-[11px] text-muted">Active & Drafts</p>
            </div>

            {/* Total Photos */}
            <div className="bg-card border border-card-border p-5 rounded-2xl shadow-sm hover:border-card-border/80 transition space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-muted">Total Photos</span>
                <div className="p-2 rounded-xl bg-accent/10 text-accent">
                  <Camera className="h-4 w-4" />
                </div>
              </div>
              <p className="text-2xl font-bold text-white tracking-tight">{metrics.totalPhotos}</p>
              <p className="text-[11px] text-muted">{formatBytes(metrics.storageUsedBytes)} storage</p>
            </div>

            {/* AI Indexed Photos */}
            <div className="bg-card border border-card-border p-5 rounded-2xl shadow-sm hover:border-card-border/80 transition space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-muted">AI Indexed</span>
                <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400">
                  <Sparkles className="h-4 w-4" />
                </div>
              </div>
              <p className="text-2xl font-bold text-white tracking-tight">{metrics.aiIndexedPhotos}</p>
              <p className="text-[11px] text-muted">buffalo_l embeddings</p>
            </div>

            {/* Client Views */}
            <div className="bg-card border border-card-border p-5 rounded-2xl shadow-sm hover:border-card-border/80 transition space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-muted">Client Views</span>
                <div className="p-2 rounded-xl bg-blue-500/10 text-blue-400">
                  <Users className="h-4 w-4" />
                </div>
              </div>
              <p className="text-2xl font-bold text-white tracking-tight">{metrics.clientVisits}</p>
              <p className="text-[11px] text-muted">Guest sessions</p>
            </div>

            {/* Favorites */}
            <div className="bg-card border border-card-border p-5 rounded-2xl shadow-sm hover:border-card-border/80 transition space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-muted">Favorites</span>
                <div className="p-2 rounded-xl bg-rose-500/10 text-rose-400">
                  <Heart className="h-4 w-4" />
                </div>
              </div>
              <p className="text-2xl font-bold text-white tracking-tight">{metrics.totalFavorites}</p>
              <p className="text-[11px] text-muted">Client starred</p>
            </div>

            {/* Selections */}
            <div className="bg-card border border-card-border p-5 rounded-2xl shadow-sm hover:border-card-border/80 transition space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-muted">Selections</span>
                <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400">
                  <CheckSquare className="h-4 w-4" />
                </div>
              </div>
              <p className="text-2xl font-bold text-white tracking-tight">{metrics.totalSelections}</p>
              <p className="text-[11px] text-muted">{metrics.downloadsCount} download jobs</p>
            </div>
          </div>
        )}

        {/* Main Content Grid: Recent Galleries + Processing Activity */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Recent Galleries List (2 Cols) */}
          <div className="lg:col-span-2 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-white tracking-tight flex items-center gap-2">
                <Images className="h-4 w-4 text-primary" />
                Recent Galleries
              </h3>
              <Link
                href="/dashboard/galleries"
                className="text-xs font-semibold text-primary hover:text-accent transition flex items-center gap-1"
              >
                View all <ArrowUpRight className="h-3.5 w-3.5" />
              </Link>
            </div>

            {data?.recentGalleries && data.recentGalleries.length > 0 ? (
              <div className="space-y-3">
                {data.recentGalleries.map((gallery) => (
                  <div
                    key={gallery.id}
                    className="bg-card border border-card-border rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 hover:border-primary/40 transition group"
                  >
                    <div className="flex items-center gap-4 min-w-0">
                      <div className="h-14 w-14 rounded-xl overflow-hidden bg-card-border flex-shrink-0 relative">
                        {gallery.cover_photo_url ? (
                          <img
                            src={gallery.cover_photo_url}
                            alt={gallery.title}
                            className="h-full w-full object-cover group-hover:scale-105 transition duration-300"
                          />
                        ) : (
                          <div className="h-full w-full flex items-center justify-center bg-card-border/50 text-muted">
                            <Images className="h-6 w-6" />
                          </div>
                        )}
                      </div>

                      <div className="min-w-0">
                        <Link
                          href={`/dashboard/galleries/${gallery.id}`}
                          className="text-sm font-bold text-white hover:text-primary transition truncate block"
                        >
                          {gallery.title}
                        </Link>
                        <div className="flex items-center gap-2 text-xs text-muted mt-0.5">
                          <span>{gallery.event_type}</span>
                          <span>•</span>
                          <span>{formatDate(gallery.event_date)}</span>
                          <span>•</span>
                          <span className="text-white font-medium">{gallery.photo_count} photos</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 self-end sm:self-center">
                      <Link
                        href={`/gallery/${gallery.slug}`}
                        target="_blank"
                        className="px-3 py-1.5 text-xs font-semibold text-muted hover:text-white bg-card-border/40 hover:bg-card-border rounded-xl transition flex items-center gap-1.5"
                      >
                        Preview <ExternalLink className="h-3 w-3" />
                      </Link>

                      <Link
                        href={`/dashboard/galleries/${gallery.id}`}
                        className="px-4 py-1.5 text-xs font-semibold bg-primary hover:bg-primary-hover text-white rounded-xl transition shadow-sm"
                      >
                        Manage
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="bg-card border border-dashed border-card-border rounded-2xl p-10 text-center space-y-3">
                <Images className="h-10 w-10 text-muted mx-auto" />
                <p className="text-sm font-semibold text-white">No galleries created yet</p>
                <p className="text-xs text-muted max-w-sm mx-auto">
                  Create your first photography gallery to upload photos and enable AI face search.
                </p>
                <Link
                  href="/dashboard/galleries/new"
                  className="inline-flex items-center gap-2 px-4 py-2 text-xs font-bold text-white bg-primary hover:bg-primary-hover rounded-xl transition shadow-md shadow-primary/20 mt-2"
                >
                  <Plus className="h-4 w-4" /> Create Gallery
                </Link>
              </div>
            )}
          </div>

          {/* Processing Activity (1 Col) */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-white tracking-tight flex items-center gap-2">
                <Cpu className="h-4 w-4 text-accent" />
                Processing Activity
              </h3>
              <Link
                href="/dashboard/processing"
                className="text-xs font-semibold text-primary hover:text-accent transition"
              >
                View all
              </Link>
            </div>

            <div className="bg-card border border-card-border rounded-2xl p-5 space-y-4">
              {data?.recentJobs && data.recentJobs.length > 0 ? (
                <div className="space-y-3 divide-y divide-card-border/40">
                  {data.recentJobs.map((job) => (
                    <div key={job.id} className="pt-3 first:pt-0 space-y-1.5">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-semibold text-white truncate max-w-[150px]">
                          {job.job_type.replace(/_/g, ' ')}
                        </span>
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                            job.status === 'COMPLETED'
                              ? 'bg-emerald-500/15 text-emerald-400'
                              : job.status === 'FAILED'
                              ? 'bg-red-500/15 text-red-400'
                              : 'bg-primary/15 text-primary'
                          }`}
                        >
                          {job.status}
                        </span>
                      </div>

                      <div className="w-full bg-card-border/60 rounded-full h-1.5 overflow-hidden">
                        <div
                          className={`h-1.5 rounded-full ${
                            job.status === 'COMPLETED'
                              ? 'bg-emerald-400'
                              : job.status === 'FAILED'
                              ? 'bg-red-400'
                              : 'bg-primary'
                          }`}
                          style={{ width: `${job.progress || 100}%` }}
                        />
                      </div>

                      <div className="flex justify-between text-[10px] text-muted">
                        <span>{job.progress}%</span>
                        <span>{formatDate(job.created_at)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="py-8 text-center space-y-2">
                  <CheckCircle2 className="h-8 w-8 text-emerald-400/80 mx-auto" />
                  <p className="text-xs font-semibold text-white">All processing queues clear</p>
                  <p className="text-[11px] text-muted">No active photo or AI background jobs.</p>
                </div>
              )}
            </div>

            {/* Quick Actions Card */}
            <div className="bg-card border border-card-border rounded-2xl p-5 space-y-3">
              <h4 className="text-xs font-bold text-white tracking-tight uppercase tracking-wider text-muted">
                Quick Shortcuts
              </h4>
              <div className="grid grid-cols-2 gap-2 text-xs font-semibold">
                <Link
                  href="/dashboard/galleries/new"
                  className="p-3 bg-card-border/20 hover:bg-card-border/50 border border-card-border/40 rounded-xl text-white transition flex flex-col items-center justify-center gap-1.5 text-center"
                >
                  <FolderPlus className="h-4 w-4 text-primary" />
                  New Gallery
                </Link>
                <Link
                  href="/dashboard/storage"
                  className="p-3 bg-card-border/20 hover:bg-card-border/50 border border-card-border/40 rounded-xl text-white transition flex flex-col items-center justify-center gap-1.5 text-center"
                >
                  <HardDrive className="h-4 w-4 text-accent" />
                  Connect Cloud
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
