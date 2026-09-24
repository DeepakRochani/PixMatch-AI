'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams } from 'next/navigation';
import {
  PublicGalleryData,
  PublicPhotoItem,
  AiMatchItem,
  PublicSmartAlbumItem,
  ViewFilter,
  GridDensity,
  GalleryHeader,
  GalleryToolbar,
  GalleryGrid,
  GalleryLightbox,
  SelectionBar,
  FindMyPhotosDialog,
  PasswordScreen,
  ExpiredScreen,
  PrivateScreen,
  ShareDialog,
  PersonalizedHome,
} from '@/components/client-gallery';
import { Loader2, AlertCircle } from 'lucide-react';

export default function ClientPublicGalleryPage() {
  const params = useParams();
  const slug = params?.slug as string;

  const [gallery, setGallery] = useState<PublicGalleryData | null>(null);
  const [photos, setPhotos] = useState<PublicPhotoItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorStatus, setErrorStatus] = useState<number | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Password / Access State
  const [isLocked, setIsLocked] = useState(false);

  // Client Session Token (30-day anonymous session)
  const [sessionToken, setSessionToken] = useState<string | null>(null);

  // Filters & Layout State
  const [activeFilter, setActiveFilter] = useState<ViewFilter>('PERSONALIZED_HOME');
  const [gridDensity, setGridDensity] = useState<GridDensity>('COMFORTABLE');
  const [favorites, setFavorites] = useState<Set<string>>(new Set());
  const [selected, setSelected] = useState<Set<string>>(new Set());

  // Search State
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<PublicPhotoItem[]>([]);
  const [searching, setSearching] = useState(false);

  // Smart Albums State
  const [smartAlbums, setSmartAlbums] = useState<PublicSmartAlbumItem[]>([]);
  const [selectedSmartAlbum, setSelectedSmartAlbum] = useState<PublicSmartAlbumItem | null>(null);
  const [smartAlbumPhotos, setSmartAlbumPhotos] = useState<PublicPhotoItem[]>([]);

  // AI Matches State
  const [aiMatches, setAiMatches] = useState<AiMatchItem[]>([]);

  // Dialogs & Lightbox
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const [showAiModal, setShowAiModal] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [bulkDownloading, setBulkDownloading] = useState(false);

  // Pagination / Infinite Scrolling
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const observerTarget = useRef<HTMLDivElement>(null);

  // Session storage key
  const storageKey = `pm_client_session_${slug}`;

  // 1. Initial Load of Gallery
  const loadGallery = useCallback(
    async (providedPassword?: string) => {
      setLoading(true);
      setErrorStatus(null);
      setErrorMessage(null);

      const savedToken = typeof window !== 'undefined' ? localStorage.getItem(storageKey) : null;
      const headers: Record<string, string> = {};
      if (savedToken) {
        headers['x-gallery-session'] = savedToken;
      }
      if (providedPassword) {
        headers['x-gallery-password'] = providedPassword;
      }

      try {
        const res = await fetch(`/api/v1/galleries/public/${slug}`, {
          headers,
        });

        const data = await res.json();

        if (res.status === 401) {
          // Password required
          setIsLocked(true);
          setGallery(data.gallery || null);
          setLoading(false);
          return;
        }

        if (!res.ok) {
          setErrorStatus(res.status);
          setErrorMessage(data.message || 'Unable to load gallery');
          setLoading(false);
          return;
        }

        const galleryData: PublicGalleryData = data.gallery;
        const initialPhotos: PublicPhotoItem[] = data.photos || [];

        setGallery(galleryData);
        setPhotos(initialPhotos);
        setNextCursor(data.pagination?.nextCursor || null);
        setHasMore(Boolean(data.pagination?.hasMore));
        setIsLocked(false);

        // Store session token if returned
        if (data.session?.token) {
          setSessionToken(data.session.token);
          if (typeof window !== 'undefined') {
            localStorage.setItem(storageKey, data.session.token);
          }
        }

        // Initialize favorites and selections from decorated payload
        const favSet = new Set<string>();
        const selSet = new Set<string>();
        initialPhotos.forEach((p) => {
          if (p.is_favorited) favSet.add(p.id);
          if (p.is_selected) selSet.add(p.id);
        });
        setFavorites(favSet);
        setSelected(selSet);

        // Fetch Public Smart Albums (Phase 12)
        try {
          const saRes = await fetch(`/api/v1/galleries/public/${slug}/smart-albums`, { headers });
          if (saRes.ok) {
            const saData = await saRes.json();
            setSmartAlbums(saData.smart_albums || []);
          }
        } catch {}
      } catch (err: unknown) {
        setErrorStatus(500);
        setErrorMessage(err instanceof Error ? err.message : 'Network error loading gallery');
      } finally {
        setLoading(false);
      }
    },
    [slug, storageKey]
  );

  useEffect(() => {
    if (slug) {
      loadGallery();
    }
  }, [slug, loadGallery]);

  // 2. Infinite Scroll Trigger
  const loadMorePhotos = useCallback(async () => {
    if (!nextCursor || loadingMore || !hasMore) return;
    setLoadingMore(true);

    try {
      const headers: Record<string, string> = {};
      const savedToken = sessionToken || (typeof window !== 'undefined' ? localStorage.getItem(storageKey) : null);
      if (savedToken) {
        headers['x-gallery-session'] = savedToken;
      }

      const res = await fetch(`/api/v1/galleries/public/${slug}/photos?cursor=${nextCursor}&limit=40`, {
        headers,
      });
      const data = await res.json();

      if (res.ok && data.photos) {
        const newPhotos: PublicPhotoItem[] = data.photos;
        setPhotos((prev) => [...prev, ...newPhotos]);
        setNextCursor(data.pagination?.nextCursor || null);
        setHasMore(Boolean(data.pagination?.hasMore));

        // Update fav and sel sets
        setFavorites((prev) => {
          const updated = new Set(prev);
          newPhotos.forEach((p) => {
            if (p.is_favorited) updated.add(p.id);
          });
          return updated;
        });
        setSelected((prev) => {
          const updated = new Set(prev);
          newPhotos.forEach((p) => {
            if (p.is_selected) updated.add(p.id);
          });
          return updated;
        });
      }
    } catch {
      // Ignore background fetch error
    } finally {
      setLoadingMore(false);
    }
  }, [nextCursor, loadingMore, hasMore, slug, sessionToken, storageKey]);

  useEffect(() => {
    const target = observerTarget.current;
    if (!target) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !loadingMore) {
          loadMorePhotos();
        }
      },
      { threshold: 0.1 }
    );

    observer.observe(target);
    return () => observer.disconnect();
  }, [hasMore, loadingMore, loadMorePhotos]);

  // 3. Password Verification Handler
  const handleVerifyPassword = async (password: string): Promise<boolean> => {
    try {
      const res = await fetch(`/api/v1/galleries/public/${slug}/verify-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });

      const data = await res.json();
      if (res.ok && data.verified) {
        if (data.session?.token) {
          setSessionToken(data.session.token);
          if (typeof window !== 'undefined') {
            localStorage.setItem(storageKey, data.session.token);
          }
        }
        await loadGallery(password);
        return true;
      }
      return false;
    } catch {
      return false;
    }
  };

  // 4. Toggle Favorite Handler
  const handleToggleFavorite = async (photoId: string) => {
    // Optimistic Update
    setFavorites((prev) => {
      const updated = new Set(prev);
      if (updated.has(photoId)) {
        updated.delete(photoId);
      } else {
        updated.add(photoId);
      }
      return updated;
    });

    try {
      const savedToken = sessionToken || (typeof window !== 'undefined' ? localStorage.getItem(storageKey) : null);
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (savedToken) headers['x-gallery-session'] = savedToken;

      await fetch(`/api/v1/galleries/public/${slug}/favorites/toggle`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ photoId }),
      });

      // Track activity in background
      recordActivity('FAVORITE', photoId);
    } catch {
      // Silent error fallback
    }
  };

  // Helper: Record Client Activity
  const recordActivity = useCallback(
    async (eventType: string, photoId?: string, metadata?: Record<string, any>) => {
      try {
        const savedToken = sessionToken || (typeof window !== 'undefined' ? localStorage.getItem(storageKey) : null);
        const headers: Record<string, string> = { 'Content-Type': 'application/json' };
        if (savedToken) headers['x-gallery-session'] = savedToken;

        await fetch(`/api/v1/galleries/public/${slug}/activity`, {
          method: 'POST',
          headers,
          body: JSON.stringify({
            event_type: eventType,
            photo_id: photoId,
            metadata,
          }),
        });
      } catch {
        // Silent
      }
    },
    [slug, sessionToken, storageKey]
  );

  // Search execution handler
  const handleSearchChange = useCallback(
    async (query: string) => {
      setSearchQuery(query);
      if (!query.trim()) {
        setSearchResults([]);
        if (activeFilter === 'SEARCH') {
          setActiveFilter('ALL');
        }
        return;
      }

      setSearching(true);
      try {
        const savedToken = sessionToken || (typeof window !== 'undefined' ? localStorage.getItem(storageKey) : null);
        const headers: Record<string, string> = {};
        if (savedToken) headers['x-gallery-session'] = savedToken;

        const res = await fetch(`/api/v1/galleries/public/${slug}/search?q=${encodeURIComponent(query)}`, {
          headers,
        });

        if (res.ok) {
          const data = await res.json();
          if (data.redirect_to_find_my_photos) {
            setShowAiModal(true);
            setSearching(false);
            return;
          }
          setSearchResults(data.results || []);
          setActiveFilter('SEARCH');
        }
      } catch {
        // Fallback
      } finally {
        setSearching(false);
      }
    },
    [slug, sessionToken, storageKey, activeFilter]
  );

  // 5. Toggle Selection Handler
  const handleToggleSelect = async (photoId: string) => {
    // Optimistic Update
    setSelected((prev) => {
      const updated = new Set(prev);
      if (updated.has(photoId)) {
        updated.delete(photoId);
      } else {
        updated.add(photoId);
      }
      return updated;
    });

    try {
      const savedToken = sessionToken || (typeof window !== 'undefined' ? localStorage.getItem(storageKey) : null);
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (savedToken) headers['x-gallery-session'] = savedToken;

      await fetch(`/api/v1/galleries/public/${slug}/selections/toggle`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ photoId }),
      });
    } catch {
      // Silent fallback
    }
  };

  // 6. Bulk Selection Actions
  const handleSelectAll = async () => {
    const allIds = photos.map((p) => p.id);
    setSelected(new Set(allIds));

    try {
      const savedToken = sessionToken || (typeof window !== 'undefined' ? localStorage.getItem(storageKey) : null);
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (savedToken) headers['x-gallery-session'] = savedToken;

      await fetch(`/api/v1/galleries/public/${slug}/selections/batch`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ photoIds: allIds, action: 'set' }),
      });
    } catch {
      // Silent
    }
  };

  const handleClearSelection = async () => {
    setSelected(new Set());
    try {
      const savedToken = sessionToken || (typeof window !== 'undefined' ? localStorage.getItem(storageKey) : null);
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (savedToken) headers['x-gallery-session'] = savedToken;

      await fetch(`/api/v1/galleries/public/${slug}/selections/batch`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ photoIds: [], action: 'set' }),
      });
    } catch {
      // Silent
    }
  };

  const handleFavoriteAllSelected = async () => {
    const selectedIds = Array.from(selected);
    setFavorites((prev) => {
      const updated = new Set(prev);
      selectedIds.forEach((id) => updated.add(id));
      return updated;
    });

    // Batch toggle favorites sequentially or in parallel
    for (const id of selectedIds) {
      handleToggleFavorite(id);
    }
  };

  // 7. Single Download Handler
  const handleDownloadSingle = async (photoId: string) => {
    try {
      const savedToken = sessionToken || (typeof window !== 'undefined' ? localStorage.getItem(storageKey) : null);
      const headers: Record<string, string> = {};
      if (savedToken) headers['x-gallery-session'] = savedToken;

      const res = await fetch(`/api/v1/galleries/public/${slug}/photos/${photoId}/download`, {
        headers,
      });
      const data = await res.json();

      if (res.ok && data.downloadUrl) {
        window.open(data.downloadUrl, '_blank');
      } else {
        alert(data.message || 'Download not permitted or unavailable.');
      }
    } catch {
      alert('Unable to initiate download.');
    }
  };

  // 8. Bulk Download Handler (ZIP)
  const handleDownloadBulk = async (photoIds?: string[]) => {
    setBulkDownloading(true);
    try {
      const savedToken = sessionToken || (typeof window !== 'undefined' ? localStorage.getItem(storageKey) : null);
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (savedToken) headers['x-gallery-session'] = savedToken;

      const res = await fetch(`/api/v1/galleries/public/${slug}/download/bulk`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ photoIds: photoIds || Array.from(selected) }),
      });

      const data = await res.json();
      if (res.ok) {
        alert(data.message || 'Bulk download ZIP archive is being generated.');
      } else {
        alert(data.message || 'Bulk download not available for this gallery.');
      }
    } catch {
      alert('Failed to request bulk download.');
    } finally {
      setBulkDownloading(false);
    }
  };

  // 9. AI Matches Handling
  const handleMatchesFound = (matches: AiMatchItem[]) => {
    setAiMatches(matches);
    setActiveFilter('AI_MATCHES');
  };

  // 10. Smart Album Selection Handling
  const handleSelectSmartAlbum = async (album: PublicSmartAlbumItem) => {
    setSelectedSmartAlbum(album);
    setActiveFilter('SMART_ALBUM');

    try {
      const savedToken = sessionToken || (typeof window !== 'undefined' ? localStorage.getItem(storageKey) : null);
      const headers: Record<string, string> = {};
      if (savedToken) headers['x-gallery-session'] = savedToken;

      const res = await fetch(`/api/v1/galleries/public/${slug}/smart-albums/${album.id}/photos?limit=100`, {
        headers,
      });
      if (res.ok) {
        const data = await res.json();
        setSmartAlbumPhotos(data.photos || []);
      }
    } catch {
      // fallback
    }
  };

  // 11. Filtered Photos computation
  const filteredPhotos = React.useMemo(() => {
    if (activeFilter === 'SEARCH') {
      return searchResults;
    }
    if (activeFilter === 'FAVORITES') {
      return photos.filter((p) => favorites.has(p.id));
    }
    if (activeFilter === 'SELECTED') {
      return photos.filter((p) => selected.has(p.id));
    }
    if (activeFilter === 'SMART_ALBUM') {
      return smartAlbumPhotos;
    }
    if (activeFilter === 'AI_MATCHES') {
      const matchMap = new Map(aiMatches.map((m) => [m.photo_id, m]));
      return photos
        .filter((p) => matchMap.has(p.id))
        .map((p) => {
          const match = matchMap.get(p.id);
          return {
            ...p,
            similarity_score: match?.similarity_score,
            confidence: match?.confidence,
          };
        });
    }
    return photos;
  }, [photos, activeFilter, favorites, selected, aiMatches, smartAlbumPhotos, searchResults]);

  // Loading Screen
  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-slate-300">
        <div className="w-10 h-10 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mb-4" />
        <p className="text-xs font-semibold tracking-wider uppercase text-slate-500">Loading Gallery...</p>
      </div>
    );
  }

  // Locked Screen
  if (isLocked) {
    return (
      <PasswordScreen
        galleryTitle={gallery?.title}
        studioName={gallery?.studio?.name}
        studioLogoUrl={gallery?.studio?.logo_url}
        onVerify={handleVerifyPassword}
      />
    );
  }

  // Expired Screen
  if (errorStatus === 410 || gallery?.is_expired) {
    return (
      <ExpiredScreen
        galleryTitle={gallery?.title}
        studioName={gallery?.studio?.name}
        studioLogoUrl={gallery?.studio?.logo_url}
        studioWebsite={gallery?.studio?.website}
      />
    );
  }

  // Private Screen
  if (errorStatus === 403 || gallery?.access_type === 'PRIVATE') {
    return (
      <PrivateScreen
        galleryTitle={gallery?.title}
        studioName={gallery?.studio?.name}
        studioLogoUrl={gallery?.studio?.logo_url}
      />
    );
  }

  // Not Found or Fatal Error
  if (errorStatus === 404 || !gallery) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4 text-center">
        <div className="w-14 h-14 rounded-2xl bg-slate-900 border border-slate-800 text-slate-500 flex items-center justify-center mb-4">
          <AlertCircle className="w-7 h-7" />
        </div>
        <h2 className="text-xl font-bold text-white mb-2">Gallery Not Found</h2>
        <p className="text-xs sm:text-sm text-slate-400 max-w-sm mb-6">
          {errorMessage || 'The requested photo gallery could not be found or has been removed.'}
        </p>
      </div>
    );
  }

  const galleryUrl = typeof window !== 'undefined' ? window.location.href : '';

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col selection:bg-indigo-500 selection:text-white">
      {/* 1. Gallery Header Banner */}
      <GalleryHeader
        gallery={gallery}
        onOpenAiSearch={() => setShowAiModal(true)}
        onOpenShare={() => setShowShareModal(true)}
        onBulkDownload={gallery.bulk_download_enabled ? () => handleDownloadBulk() : undefined}
      />

      {/* 2. Gallery Toolbar Controls */}
      <GalleryToolbar
        activeFilter={activeFilter}
        onFilterChange={setActiveFilter}
        totalPhotos={photos.length}
        totalFavorites={favorites.size}
        totalSelected={selected.size}
        totalAiMatches={aiMatches.length}
        onClearAiFilter={() => {
          setAiMatches([]);
          setActiveFilter('ALL');
        }}
        smartAlbums={smartAlbums}
        selectedSmartAlbumId={selectedSmartAlbum?.id}
        onSelectSmartAlbum={handleSelectSmartAlbum}
        gridDensity={gridDensity}
        onGridDensityChange={setGridDensity}
        searchQuery={searchQuery}
        onSearchChange={handleSearchChange}
      />

      {/* 3. Main Discovery or Grid Content */}
      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        {activeFilter === 'PERSONALIZED_HOME' ? (
          <PersonalizedHome
            gallery={gallery}
            sessionId={sessionToken || undefined}
            onOpenFindMyPhotos={() => setShowAiModal(true)}
            onViewAllPhotos={() => setActiveFilter('ALL')}
            onSelectSmartAlbum={(albumId) => {
              const targetAlbum = smartAlbums.find((a) => a.id === albumId);
              if (targetAlbum) {
                handleSelectSmartAlbum(targetAlbum);
              }
            }}
            onSelectPhoto={(photoId) => {
              const idx = photos.findIndex((p) => p.id === photoId);
              if (idx >= 0) {
                setLightboxIndex(idx);
                recordActivity('PHOTO_VIEW', photoId);
              }
            }}
            onToggleFavorite={handleToggleFavorite}
            onToggleSelect={handleToggleSelect}
            favorites={favorites}
            selected={selected}
          />
        ) : (
          <GalleryGrid
            photos={filteredPhotos}
            onOpenLightbox={(idx) => {
              setLightboxIndex(idx);
              const p = filteredPhotos[idx];
              if (p) recordActivity('PHOTO_VIEW', p.id);
            }}
            onToggleFavorite={handleToggleFavorite}
            onToggleSelect={handleToggleSelect}
            onDownloadSingle={gallery.downloads_enabled ? handleDownloadSingle : undefined}
            favorites={favorites}
            selected={selected}
            gridDensity={gridDensity}
            loadingMore={loadingMore}
            hasMore={hasMore && activeFilter === 'ALL'}
            loadMoreRef={(node) => {
              if (node) observerTarget.current = node as HTMLDivElement;
            }}
            emptyMessage={
              activeFilter === 'SEARCH'
                ? `No photos found matching "${searchQuery}". Try searching for scenes (e.g., sunset, portraits) or moments.`
                : activeFilter === 'FAVORITES'
                ? 'You have not favorited any photographs yet. Click the heart icon on any photo to save your favorites.'
                : activeFilter === 'SELECTED'
                ? 'No photos selected. Check photos to perform bulk actions.'
                : activeFilter === 'AI_MATCHES'
                ? 'No face matches found for your selfie search.'
                : 'This gallery does not have any processed photos yet.'
            }
            emptyAction={
              activeFilter !== 'ALL'
                ? {
                    label: 'View All Photos',
                    onClick: () => {
                      setActiveFilter('ALL');
                      setSearchQuery('');
                    },
                  }
                : undefined
            }
          />
        )}
      </main>

      {/* 4. Sticky Selection Bar for Bulk Actions */}
      <SelectionBar
        selectedCount={selected.size}
        totalPhotos={photos.length}
        onClearSelection={handleClearSelection}
        onSelectAll={handleSelectAll}
        onDownloadSelected={() => handleDownloadBulk(Array.from(selected))}
        onFavoriteSelected={handleFavoriteAllSelected}
        downloading={bulkDownloading}
      />

      {/* 5. Fullscreen Lightbox */}
      {lightboxIndex !== null && (
        <GalleryLightbox
          photos={filteredPhotos}
          initialIndex={lightboxIndex}
          isOpen={lightboxIndex !== null}
          gallerySlug={gallery.slug}
          onClose={() => setLightboxIndex(null)}
          onToggleFavorite={handleToggleFavorite}
          onToggleSelect={handleToggleSelect}
          onDownloadSingle={gallery.downloads_enabled ? handleDownloadSingle : undefined}
          favorites={favorites}
          selected={selected}
          onSelectPhotoById={(photoId) => {
            const idx = photos.findIndex((p) => p.id === photoId);
            if (idx >= 0) {
              setLightboxIndex(idx);
              recordActivity('PHOTO_VIEW', photoId);
            }
          }}
        />
      )}

      {/* 6. "Find My Photos" AI Experience Modal */}
      {showAiModal && (
        <FindMyPhotosDialog
          isOpen={showAiModal}
          onClose={() => setShowAiModal(false)}
          gallerySlug={gallery.slug}
          galleryTitle={gallery.title}
          onMatchesFound={handleMatchesFound}
          onOpenLightboxWithPhoto={(p) => {
            const idx = filteredPhotos.findIndex((item) => item.id === p.id);
            if (idx >= 0) {
              setLightboxIndex(idx);
            } else {
              setPhotos((prev) => [p, ...prev]);
              setLightboxIndex(0);
            }
            setShowAiModal(false);
          }}
          favorites={favorites}
          selected={selected}
          onToggleFavorite={handleToggleFavorite}
          onToggleSelect={handleToggleSelect}
          onDownloadBulk={handleDownloadBulk}
        />
      )}

      {/* 7. Share Dialog */}
      {showShareModal && (
        <ShareDialog
          isOpen={showShareModal}
          onClose={() => setShowShareModal(false)}
          galleryTitle={gallery.title}
          galleryUrl={galleryUrl}
        />
      )}
    </div>
  );
}
