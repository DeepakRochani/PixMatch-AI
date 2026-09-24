'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { DashboardHeader } from '@/components/layout/DashboardHeader';
import { fetchApi } from '@/lib/api-client';
import { formatDate } from '@pixmatch/ui';
import { ShareModal } from '@/components/dashboard/ShareModal';
import { ConfirmationModal } from '@/components/dashboard/ConfirmationModal';
import {
  Images,
  Plus,
  Search,
  SlidersHorizontal,
  LayoutGrid,
  List,
  ExternalLink,
  MoreVertical,
  Share2,
  Copy,
  Archive,
  Trash2,
  Sparkles,
  Heart,
  CheckSquare,
  Users,
  Eye,
  Loader2,
  RefreshCw,
  Clock,
  Lock,
  Globe,
  ArchiveRestore,
} from 'lucide-react';

interface GalleryItem {
  id: string;
  studio_id: string;
  title: string;
  slug: string;
  event_type: string;
  event_date: string;
  description?: string;
  cover_photo_url?: string;
  access_type: string;
  status: 'DRAFT' | 'ACTIVE' | 'ARCHIVED';
  enable_ai_face_search: boolean;
  ai_indexing_status: string;
  photo_count: number;
  face_count: number;
  client_views: number;
  favorites_count: number;
  selections_count: number;
  album_count: number;
  updated_at: string;
}

export default function GalleriesListPage() {
  const [galleries, setGalleries] = useState<GalleryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [sortBy, setSortBy] = useState('NEWEST');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  // Modals state
  const [sharingGallery, setSharingGallery] = useState<GalleryItem | null>(null);
  const [galleryToDelete, setGalleryToDelete] = useState<GalleryItem | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);

  const loadGalleries = useCallback(async (isSilent = false) => {
    if (!isSilent) setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search.trim()) params.append('search', search.trim());
      if (statusFilter !== 'ALL') params.append('status', statusFilter);
      if (sortBy) params.append('sort', sortBy);

      const res = await fetchApi(`/galleries?${params.toString()}`);
      if (res.success && res.data) {
        setGalleries(res.data);
      }
    } finally {
      setLoading(false);
    }
  }, [search, statusFilter, sortBy]);

  useEffect(() => {
    const timer = setTimeout(() => {
      loadGalleries();
    }, 250);
    return () => clearTimeout(timer);
  }, [loadGalleries]);

  const handleDuplicate = async (gallery: GalleryItem) => {
    setActionLoading(true);
    try {
      const res = await fetchApi(`/galleries/${gallery.id}/duplicate`, { method: 'POST' });
      if (res.success) {
        loadGalleries(true);
      }
    } finally {
      setActionLoading(false);
      setActiveMenuId(null);
    }
  };

  const handleArchive = async (gallery: GalleryItem) => {
    setActionLoading(true);
    try {
      const endpoint = gallery.status === 'ARCHIVED' ? `/galleries/${gallery.id}/restore` : `/galleries/${gallery.id}/archive`;
      const res = await fetchApi(endpoint, { method: 'POST' });
      if (res.success) {
        loadGalleries(true);
      }
    } finally {
      setActionLoading(false);
      setActiveMenuId(null);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!galleryToDelete) return;
    setActionLoading(true);
    try {
      const res = await fetchApi(`/galleries/${galleryToDelete.id}`, { method: 'DELETE' });
      if (res.success) {
        setGalleryToDelete(null);
        loadGalleries(true);
      }
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="flex-1 min-h-screen bg-background flex flex-col" onClick={() => setActiveMenuId(null)}>
      <DashboardHeader
        title="Galleries"
        subtitle="Manage photo events, client distribution, and AI face indexing"
      />

      <div className="p-6 sm:p-8 max-w-7xl mx-auto w-full space-y-6">
        {/* Top Control Bar */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          {/* Search Box */}
          <div className="relative flex-1 max-w-md">
            <Search className="h-4 w-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-muted" />
            <input
              type="text"
              placeholder="Search by title, description, or event..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-card border border-card-border rounded-xl pl-9 pr-4 py-2.5 text-xs text-white placeholder:text-muted outline-none focus:border-primary transition"
            />
          </div>

          {/* Filters, Sorters & View Switcher */}
          <div className="flex items-center gap-3 flex-wrap">
            {/* Status Filter */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-card border border-card-border rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-primary transition"
            >
              <option value="ALL">All Status</option>
              <option value="ACTIVE">Active</option>
              <option value="DRAFT">Drafts</option>
              <option value="ARCHIVED">Archived</option>
              <option value="PROCESSING">Processing</option>
              <option value="AI_INDEXING">AI Indexing</option>
              <option value="COMPLETED">Completed</option>
            </select>

            {/* Sorter */}
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="bg-card border border-card-border rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-primary transition"
            >
              <option value="NEWEST">Newest First</option>
              <option value="OLDEST">Oldest First</option>
              <option value="NAME_ASC">Name (A-Z)</option>
              <option value="NAME_DESC">Name (Z-A)</option>
              <option value="UPDATED">Recently Updated</option>
            </select>

            {/* View Mode Toggle */}
            <div className="flex items-center bg-card border border-card-border rounded-xl p-1">
              <button
                onClick={() => setViewMode('grid')}
                className={`p-1.5 rounded-lg transition ${
                  viewMode === 'grid' ? 'bg-primary text-white' : 'text-muted hover:text-white'
                }`}
                title="Grid View"
              >
                <LayoutGrid className="h-4 w-4" />
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`p-1.5 rounded-lg transition ${
                  viewMode === 'list' ? 'bg-primary text-white' : 'text-muted hover:text-white'
                }`}
                title="List View"
              >
                <List className="h-4 w-4" />
              </button>
            </div>

            {/* Create Button */}
            <Link
              href="/dashboard/galleries/new"
              className="px-4 py-2 text-xs font-bold bg-primary hover:bg-primary-hover text-white rounded-xl transition shadow-md shadow-primary/20 flex items-center gap-1.5"
            >
              <Plus className="h-4 w-4" />
              New Gallery
            </Link>
          </div>
        </div>

        {/* Galleries Content */}
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 animate-pulse">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-72 bg-card border border-card-border rounded-2xl" />
            ))}
          </div>
        ) : galleries.length > 0 ? (
          viewMode === 'grid' ? (
            /* Grid View */
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {galleries.map((gallery) => (
                <div
                  key={gallery.id}
                  className="bg-card border border-card-border rounded-2xl overflow-hidden hover:border-primary/50 transition duration-300 flex flex-col group shadow-sm"
                >
                  {/* Gallery Cover Photo */}
                  <div className="h-48 w-full bg-card-border/60 relative overflow-hidden">
                    {gallery.cover_photo_url ? (
                      <img
                        src={gallery.cover_photo_url}
                        alt={gallery.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition duration-500"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-card-border/40 text-muted">
                        <Images className="h-10 w-10 opacity-60" />
                      </div>
                    )}

                    {/* Top status badges */}
                    <div className="absolute top-3 left-3 flex items-center gap-1.5">
                      <span
                        className={`px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider backdrop-blur-md shadow-md ${
                          gallery.status === 'ACTIVE'
                            ? 'bg-emerald-500/80 text-white'
                            : gallery.status === 'ARCHIVED'
                            ? 'bg-zinc-700/80 text-zinc-300'
                            : 'bg-amber-500/80 text-white'
                        }`}
                      >
                        {gallery.status}
                      </span>

                      {gallery.enable_ai_face_search && (
                        <span className="px-2 py-1 rounded-lg text-[10px] font-semibold bg-primary/80 text-white backdrop-blur-md flex items-center gap-1 shadow-md">
                          <Sparkles className="h-3 w-3" /> AI Face Search
                        </span>
                      )}
                    </div>

                    {/* Top Action Menu */}
                    <div className="absolute top-3 right-3" onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={() => setActiveMenuId(activeMenuId === gallery.id ? null : gallery.id)}
                        className="p-1.5 rounded-xl bg-black/60 text-white backdrop-blur-md hover:bg-black/80 transition"
                      >
                        <MoreVertical className="h-4 w-4" />
                      </button>

                      {activeMenuId === gallery.id && (
                        <div className="absolute right-0 mt-1 w-44 bg-card border border-card-border rounded-xl shadow-xl py-1.5 z-30 divide-y divide-card-border/40">
                          <div className="py-1">
                            <button
                              onClick={() => {
                                setSharingGallery(gallery);
                                setActiveMenuId(null);
                              }}
                              className="w-full px-3 py-1.5 text-xs text-left text-muted hover:text-white hover:bg-card-border/40 flex items-center gap-2"
                            >
                              <Share2 className="h-3.5 w-3.5" /> Share Gallery
                            </button>
                            <button
                              onClick={() => handleDuplicate(gallery)}
                              className="w-full px-3 py-1.5 text-xs text-left text-muted hover:text-white hover:bg-card-border/40 flex items-center gap-2"
                            >
                              <Copy className="h-3.5 w-3.5" /> Duplicate
                            </button>
                          </div>
                          <div className="py-1">
                            <button
                              onClick={() => handleArchive(gallery)}
                              className="w-full px-3 py-1.5 text-xs text-left text-muted hover:text-white hover:bg-card-border/40 flex items-center gap-2"
                            >
                              {gallery.status === 'ARCHIVED' ? (
                                <>
                                  <ArchiveRestore className="h-3.5 w-3.5" /> Restore
                                </>
                              ) : (
                                <>
                                  <Archive className="h-3.5 w-3.5" /> Archive
                                </>
                              )}
                            </button>
                            <button
                              onClick={() => {
                                setGalleryToDelete(gallery);
                                setActiveMenuId(null);
                              }}
                              className="w-full px-3 py-1.5 text-xs text-left text-red-400 hover:bg-red-500/10 flex items-center gap-2"
                            >
                              <Trash2 className="h-3.5 w-3.5" /> Delete
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Body Info */}
                  <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
                    <div>
                      <Link
                        href={`/dashboard/galleries/${gallery.id}`}
                        className="text-base font-bold text-white hover:text-primary transition line-clamp-1"
                      >
                        {gallery.title}
                      </Link>
                      <div className="flex items-center gap-2 text-xs text-muted mt-1">
                        <span>{gallery.event_type}</span>
                        <span>•</span>
                        <span>{formatDate(gallery.event_date)}</span>
                      </div>
                    </div>

                    {/* Stats Grid */}
                    <div className="grid grid-cols-4 gap-2 pt-3 border-t border-card-border/40 text-center text-xs">
                      <div className="space-y-0.5">
                        <p className="text-white font-bold">{gallery.photo_count}</p>
                        <p className="text-[10px] text-muted">Photos</p>
                      </div>
                      <div className="space-y-0.5">
                        <p className="text-white font-bold">{gallery.client_views}</p>
                        <p className="text-[10px] text-muted">Views</p>
                      </div>
                      <div className="space-y-0.5">
                        <p className="text-white font-bold">{gallery.favorites_count}</p>
                        <p className="text-[10px] text-muted">Favorites</p>
                      </div>
                      <div className="space-y-0.5">
                        <p className="text-white font-bold">{gallery.selections_count}</p>
                        <p className="text-[10px] text-muted">Selected</p>
                      </div>
                    </div>

                    {/* Bottom Actions */}
                    <div className="flex items-center justify-between pt-2">
                      <Link
                        href={`/gallery/${gallery.slug}`}
                        target="_blank"
                        className="text-xs font-semibold text-muted hover:text-white flex items-center gap-1.5 transition"
                      >
                        Preview <ExternalLink className="h-3.5 w-3.5" />
                      </Link>

                      <Link
                        href={`/dashboard/galleries/${gallery.id}`}
                        className="px-4 py-1.5 text-xs font-bold text-white bg-primary hover:bg-primary-hover rounded-xl transition shadow-md shadow-primary/20"
                      >
                        Manage
                      </Link>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            /* List View */
            <div className="bg-card border border-card-border rounded-2xl overflow-hidden divide-y divide-card-border/40">
              {galleries.map((gallery) => (
                <div
                  key={gallery.id}
                  className="p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 hover:bg-card-border/20 transition group"
                >
                  <div className="flex items-center gap-4 min-w-0">
                    <div className="h-14 w-14 rounded-xl overflow-hidden bg-card-border flex-shrink-0 relative">
                      {gallery.cover_photo_url ? (
                        <img src={gallery.cover_photo_url} alt={gallery.title} className="h-full w-full object-cover" />
                      ) : (
                        <div className="h-full w-full flex items-center justify-center bg-card-border/50 text-muted">
                          <Images className="h-6 w-6" />
                        </div>
                      )}
                    </div>

                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <Link
                          href={`/dashboard/galleries/${gallery.id}`}
                          className="text-sm font-bold text-white hover:text-primary transition truncate"
                        >
                          {gallery.title}
                        </Link>
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                            gallery.status === 'ACTIVE'
                              ? 'bg-emerald-500/15 text-emerald-400'
                              : gallery.status === 'ARCHIVED'
                              ? 'bg-zinc-700/50 text-zinc-400'
                              : 'bg-amber-500/15 text-amber-400'
                          }`}
                        >
                          {gallery.status}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 text-xs text-muted mt-0.5">
                        <span>{gallery.event_type}</span>
                        <span>•</span>
                        <span>{formatDate(gallery.event_date)}</span>
                        <span>•</span>
                        <span className="text-white font-medium">{gallery.photo_count} photos</span>
                        <span>•</span>
                        <span>{gallery.client_views} views</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 self-end sm:self-center">
                    <button
                      onClick={() => setSharingGallery(gallery)}
                      className="p-2 rounded-xl text-muted hover:text-white hover:bg-card-border transition"
                      title="Share"
                    >
                      <Share2 className="h-4 w-4" />
                    </button>

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
          )
        ) : (
          <div className="bg-card border border-dashed border-card-border rounded-2xl p-12 text-center space-y-3">
            <Images className="h-12 w-12 text-muted mx-auto" />
            <p className="text-base font-bold text-white">No matching galleries found</p>
            <p className="text-xs text-muted max-w-md mx-auto">
              {search || statusFilter !== 'ALL'
                ? 'Try adjusting your search query or status filter.'
                : 'Create your first photography gallery to get started.'}
            </p>
            <Link
              href="/dashboard/galleries/new"
              className="inline-flex items-center gap-2 px-5 py-2.5 text-xs font-bold text-white bg-primary hover:bg-primary-hover rounded-xl transition shadow-md shadow-primary/20 mt-2"
            >
              <Plus className="h-4 w-4" /> Create Gallery
            </Link>
          </div>
        )}
      </div>

      {/* Share Modal */}
      <ShareModal
        isOpen={!!sharingGallery}
        onClose={() => setSharingGallery(null)}
        gallery={sharingGallery}
      />

      {/* Delete Confirmation Modal */}
      <ConfirmationModal
        isOpen={!!galleryToDelete}
        onClose={() => setGalleryToDelete(null)}
        onConfirm={handleDeleteConfirm}
        title="Delete Gallery"
        message={`Are you sure you want to permanently delete "${galleryToDelete?.title}"? All photographs, AI face embeddings, albums, and client favorites will be permanently removed.`}
        confirmLabel="Delete Gallery"
        isDestructive={true}
        loading={actionLoading}
      />
    </div>
  );
}
