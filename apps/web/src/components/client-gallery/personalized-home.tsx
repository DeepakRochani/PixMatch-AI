'use client';

import React from 'react';
import {
  Sparkles,
  Search,
  BookOpen,
  Heart,
  CheckSquare,
  Layers,
  Star,
  Clock,
  ArrowRight,
  Compass,
  Grid,
} from 'lucide-react';
import { PersonalizedClientHomeDTO, PhotoRecommendationDTO } from '@pixmatch/types';
import { PublicGalleryData, PublicPhotoItem } from './gallery-types';

export interface PersonalizedHomeProps {
  homeData?: PersonalizedClientHomeDTO | null;
  gallery?: PublicGalleryData | null;
  gallerySlug?: string;
  sessionId?: string;
  continueWhereLeftOff?: {
    last_gallery_id?: string | null;
    last_gallery_name?: string | null;
    last_album_id?: string | null;
    last_album_name?: string | null;
    last_photo_id?: string | null;
    last_photo_thumbnail_url?: string | null;
    last_photo_index?: number | null;
    last_scroll_position?: number | null;
    last_viewed_at?: Date | string | null;
    view_mode?: string | null;
    active_tab?: string | null;
  } | null;
  onContinueWhereLeftOff?: () => void;
  onOpenAiSearch?: () => void;
  onOpenFindMyPhotos?: () => void;
  onOpenStory?: () => void;
  onBrowseAll?: () => void;
  onViewAllPhotos?: () => void;
  onViewFavorites?: () => void;
  onViewSelections?: () => void;
  onSelectSmartAlbum?: (albumId: string) => void;
  onSelectChapter?: (chapterId: string) => void;
  onOpenLightboxWithPhoto?: (photo: PublicPhotoItem) => void;
  onSelectPhoto?: (photoId: string) => void;
  favorites?: Set<string>;
  selected?: Set<string>;
  onToggleFavorite?: (photoId: string) => void;
  onToggleSelect?: (photoId: string) => void;
}

export function PersonalizedHome({
  homeData: initialHomeData,
  gallery,
  gallerySlug,
  sessionId,
  continueWhereLeftOff,
  onContinueWhereLeftOff,
  onOpenAiSearch,
  onOpenFindMyPhotos,
  onOpenStory,
  onBrowseAll,
  onViewAllPhotos,
  onViewFavorites,
  onViewSelections,
  onSelectSmartAlbum,
  onSelectChapter,
  onOpenLightboxWithPhoto,
  onSelectPhoto,
  favorites = new Set(),
  selected = new Set(),
  onToggleFavorite,
  onToggleSelect,
}: PersonalizedHomeProps) {
  const [fetchedData, setFetchedData] = React.useState<PersonalizedClientHomeDTO | null>(null);
  const [loading, setLoading] = React.useState(false);

  const slug = gallerySlug || gallery?.slug;

  React.useEffect(() => {
    if (initialHomeData) {
      setFetchedData(initialHomeData);
      return;
    }
    if (!slug) return;

    setLoading(true);
    const headers: Record<string, string> = {};
    if (sessionId) headers['x-gallery-session'] = sessionId;

    fetch(`/api/v1/galleries/public/${slug}/personalized`, { headers })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.home) {
          setFetchedData(data.home);
        } else if (data?.gallery_id) {
          setFetchedData(data);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [initialHomeData, slug, sessionId]);

  const homeData = initialHomeData || fetchedData;

  const handleAiSearch = onOpenFindMyPhotos || onOpenAiSearch || (() => {});
  const handleBrowseAll = onViewAllPhotos || onBrowseAll || (() => {});
  const handleStory = onOpenStory || (() => {});
  const handleFavs = onViewFavorites || (() => {});
  const handleSels = onViewSelections || (() => {});
  const handleSelectAlbum = onSelectSmartAlbum || (() => {});
  const handleSelectChap = onSelectChapter || (() => {});

  const handlePhotoClick = (item: PhotoRecommendationDTO) => {
    if (onSelectPhoto) {
      onSelectPhoto(item.photo_id);
    } else if (onOpenLightboxWithPhoto) {
      onOpenLightboxWithPhoto({
        id: item.photo_id,
        original_url: item.original_url,
        thumbnail_url: item.thumbnail_url || item.original_url,
        width: item.width,
        height: item.height,
      });
    }
  };

  if (loading && !homeData) {
    return (
      <div className="py-20 flex flex-col items-center justify-center space-y-3 text-slate-400">
        <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
        <span className="text-xs font-medium uppercase tracking-wider">Curating personalized discovery...</span>
      </div>
    );
  }

  if (!homeData) return null;

  const {
    is_first_time,
    gallery_title,
    studio_name,
    cover_photo_url,
    event_type,
    has_published_story,
    story_headline,
    story_summary,
    has_find_my_photos,
    total_photos,
    stats,
    highlights,
    recommendations,
    recently_viewed,
    chapters,
    smart_albums,
  } = homeData;

  const renderPhotoCard = (item: PhotoRecommendationDTO, index: number) => {
    const isFav = favorites.has(item.photo_id);
    const isSel = selected.has(item.photo_id);

    const publicPhoto: PublicPhotoItem = {
      id: item.photo_id,
      original_url: item.original_url,
      thumbnail_url: item.thumbnail_url || item.original_url,
      width: item.width,
      height: item.height,
    };

    return (
      <div
        key={item.id || item.photo_id || index}
        className="group relative flex-shrink-0 w-48 sm:w-56 aspect-[3/4] rounded-2xl overflow-hidden bg-slate-900 border border-slate-800/80 shadow-lg hover:border-purple-500/40 hover:shadow-purple-500/10 transition-all duration-300"
      >
        <img
          src={item.thumbnail_url || item.original_url}
          alt={item.reason || 'Recommended photo'}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          loading="lazy"
        />

        {/* Hover / Active Gradient Overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-transparent to-black/30 opacity-80 group-hover:opacity-100 transition-opacity" />

        {/* Top Badges & Actions */}
        <div className="absolute top-2.5 inset-x-2.5 flex items-center justify-between z-10">
          {item.reason_type === 'BEST_SHOT' ? (
            <span className="px-2 py-0.5 rounded-full bg-amber-500/90 text-slate-950 text-[10px] font-bold flex items-center gap-1 shadow">
              <Star className="w-2.5 h-2.5 fill-current" />
              Best Shot
            </span>
          ) : (
            <span className="px-2 py-0.5 rounded-full bg-slate-950/70 backdrop-blur-md text-slate-300 text-[10px] font-medium border border-slate-700/50">
              {item.chapter_title || 'Moment'}
            </span>
          )}

          <div className="flex items-center gap-1.5">
            {onToggleFavorite && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onToggleFavorite(item.photo_id);
                }}
                className={`p-1.5 rounded-full backdrop-blur-md transition ${
                  isFav
                    ? 'bg-rose-500 text-white'
                    : 'bg-slate-950/60 text-slate-300 hover:text-white hover:bg-slate-900'
                }`}
                title="Favorite"
              >
                <Heart className={`w-3.5 h-3.5 ${isFav ? 'fill-current' : ''}`} />
              </button>
            )}
            {onToggleSelect && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onToggleSelect(item.photo_id);
                }}
                className={`p-1.5 rounded-full backdrop-blur-md transition ${
                  isSel
                    ? 'bg-indigo-600 text-white'
                    : 'bg-slate-950/60 text-slate-300 hover:text-white hover:bg-slate-900'
                }`}
                title="Select"
              >
                <CheckSquare className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Bottom Reason & Click Trigger */}
        <div
          onClick={() => handlePhotoClick(item)}
          className="absolute bottom-0 inset-x-0 p-3 z-10 cursor-pointer"
        >
          <p className="text-[11px] font-medium text-slate-200 line-clamp-2 leading-snug drop-shadow">
            {item.reason}
          </p>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-8 pb-16">
      {/* Continue Where You Left Off Banner */}
      {continueWhereLeftOff && continueWhereLeftOff.last_photo_thumbnail_url && (
        <div className="flex items-center justify-between p-4 rounded-2xl bg-gradient-to-r from-purple-900/40 via-indigo-900/30 to-slate-900/50 border border-purple-500/30 backdrop-blur-xl shadow-lg animate-in fade-in slide-in-from-top-2">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-xl overflow-hidden bg-slate-800 border border-purple-500/40 flex-shrink-0">
              <img
                src={continueWhereLeftOff.last_photo_thumbnail_url}
                alt="Last viewed"
                className="w-full h-full object-cover"
              />
            </div>
            <div>
              <div className="text-[11px] font-bold uppercase tracking-wider text-purple-400">
                Continue Where You Left Off
              </div>
              <div className="text-xs sm:text-sm font-semibold text-white">
                {continueWhereLeftOff.last_gallery_name || 'Your Gallery'}{' '}
                {continueWhereLeftOff.last_album_name ? `· ${continueWhereLeftOff.last_album_name}` : ''}
              </div>
            </div>
          </div>
          {onContinueWhereLeftOff && (
            <button
              onClick={onContinueWhereLeftOff}
              className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold transition flex items-center gap-1.5 shadow-md shadow-purple-600/30 active:scale-95"
            >
              Resume <ArrowRight className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      )}

      {/* 1. Hero Personalized Banner */}
      <div className="relative rounded-3xl overflow-hidden border border-slate-800 bg-slate-900/60 shadow-2xl">
        {cover_photo_url && (
          <div className="absolute inset-0 z-0">
            <img
              src={cover_photo_url}
              alt={gallery_title}
              className="w-full h-full object-cover filter blur-sm opacity-25 scale-105"
            />
            <div className="absolute inset-0 bg-gradient-to-r from-slate-950 via-slate-950/80 to-slate-900/40" />
          </div>
        )}

        <div className="relative z-10 p-6 sm:p-10 max-w-3xl">
          <div className="flex items-center gap-2 mb-3">
            <span className="px-2.5 py-1 rounded-full bg-purple-500/10 border border-purple-500/30 text-purple-400 text-xs font-bold uppercase tracking-wider flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5" />
              {is_first_time ? 'Welcome to your gallery' : 'Personalized For You'}
            </span>
            <span className="text-slate-500 text-xs font-medium">· {studio_name}</span>
          </div>

          <h1 className="text-2xl sm:text-4xl font-extrabold text-white tracking-tight leading-tight mb-3">
            {gallery_title}
          </h1>

          <p className="text-slate-300 text-sm sm:text-base leading-relaxed mb-6">
            {is_first_time
              ? `Explore your collection of ${total_photos} photographs with AI face search, curated event highlights, and chronological chapters.`
              : `Welcome back! We've prepared tailored moments, recent favorites, and highlights from your event.`}
          </p>

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center gap-3">
            {has_find_my_photos && (
              <button
                onClick={handleAiSearch}
                className="px-5 py-2.5 rounded-2xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-semibold text-xs sm:text-sm shadow-lg shadow-purple-600/25 flex items-center gap-2 transition active:scale-95"
              >
                <Search className="w-4 h-4" />
                Find My Photos
              </button>
            )}

            {has_published_story && (
              <button
                onClick={handleStory}
                className="px-5 py-2.5 rounded-2xl bg-slate-800 hover:bg-slate-700 text-purple-300 hover:text-white border border-purple-500/30 font-semibold text-xs sm:text-sm flex items-center gap-2 transition active:scale-95"
              >
                <BookOpen className="w-4 h-4 text-purple-400" />
                Event Story
              </button>
            )}

            <button
              onClick={handleBrowseAll}
              className="px-5 py-2.5 rounded-2xl bg-slate-900/80 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-700 font-medium text-xs sm:text-sm flex items-center gap-2 transition"
            >
              <Grid className="w-4 h-4" />
              Browse All ({total_photos})
            </button>
          </div>
        </div>
      </div>

      {/* 2. Quick Activity Pills for Returning Clients */}
      {!is_first_time && (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          <div
            onClick={handleFavs}
            className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 hover:border-rose-500/40 transition cursor-pointer flex items-center gap-3 group"
          >
            <div className="w-10 h-10 rounded-xl bg-rose-500/10 text-rose-400 flex items-center justify-center group-hover:scale-110 transition">
              <Heart className="w-5 h-5 fill-rose-500/20" />
            </div>
            <div>
              <div className="text-sm font-bold text-white">{stats.favorites_count} Favorites</div>
              <div className="text-[11px] text-slate-400">View liked photos</div>
            </div>
          </div>

          <div
            onClick={handleSels}
            className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 hover:border-indigo-500/40 transition cursor-pointer flex items-center gap-3 group"
          >
            <div className="w-10 h-10 rounded-xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center group-hover:scale-110 transition">
              <CheckSquare className="w-5 h-5 text-indigo-400" />
            </div>
            <div>
              <div className="text-sm font-bold text-white">{stats.selections_count} Selected</div>
              <div className="text-[11px] text-slate-400">Manage client picks</div>
            </div>
          </div>

          <div
            onClick={handleBrowseAll}
            className="col-span-2 sm:col-span-1 p-4 rounded-2xl bg-slate-900/80 border border-slate-800 hover:border-purple-500/40 transition cursor-pointer flex items-center gap-3 group"
          >
            <div className="w-10 h-10 rounded-xl bg-purple-500/10 text-purple-400 flex items-center justify-center group-hover:scale-110 transition">
              <Compass className="w-5 h-5 text-purple-400" />
            </div>
            <div>
              <div className="text-sm font-bold text-white">{total_photos} Photos</div>
              <div className="text-[11px] text-slate-400">Full gallery grid</div>
            </div>
          </div>
        </div>
      )}

      {/* 3. "Recommended For You" Carousel */}
      {recommendations && recommendations.length > 0 && (
        <section className="space-y-3.5">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-purple-400" />
                Recommended For You
              </h2>
              <p className="text-xs text-slate-400">Personalized moments selected based on your gallery activity</p>
            </div>
            <button
              onClick={handleBrowseAll}
              className="text-xs text-purple-400 hover:text-purple-300 font-medium flex items-center gap-1 transition"
            >
              See All <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="flex gap-4 overflow-x-auto pb-4 no-scrollbar scroll-smooth">
            {recommendations.map((item, idx) => renderPhotoCard(item, idx))}
          </div>
        </section>
      )}

      {/* 4. "AI Highlights" Carousel */}
      {highlights && highlights.length > 0 && (
        <section className="space-y-3.5">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <Star className="w-4 h-4 text-amber-400 fill-amber-400" />
                Curated Event Highlights
              </h2>
              <p className="text-xs text-slate-400">Top standout shots selected by quality, emotion & composition</p>
            </div>
          </div>

          <div className="flex gap-4 overflow-x-auto pb-4 no-scrollbar scroll-smooth">
            {highlights.map((item, idx) => renderPhotoCard(item, idx))}
          </div>
        </section>
      )}

      {/* 5. Event Chapters Navigation */}
      {chapters && chapters.length > 0 && (
        <section className="space-y-3.5">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <Layers className="w-4 h-4 text-indigo-400" />
                Event Chapters
              </h2>
              <p className="text-xs text-slate-400">Relive the day step by step through chronological timeline chapters</p>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {chapters.map((ch, idx) => (
              <div
                key={ch.id}
                onClick={() => handleSelectChap(ch.id)}
                className="p-4 rounded-2xl bg-slate-900/70 border border-slate-800 hover:border-purple-500/40 hover:bg-slate-900 transition cursor-pointer group flex flex-col justify-between"
              >
                <div>
                  <span className="text-[10px] font-bold text-purple-400 uppercase tracking-widest block mb-1">
                    Chapter {idx + 1}
                  </span>
                  <h3 className="text-sm font-semibold text-white group-hover:text-purple-300 transition">
                    {ch.title}
                  </h3>
                </div>
                <div className="mt-3 text-[11px] text-slate-500 font-medium">
                  {ch.photo_count} photos
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* 6. Smart Albums */}
      {smart_albums && smart_albums.length > 0 && (
        <section className="space-y-3.5">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-emerald-400" />
                Smart Albums
              </h2>
              <p className="text-xs text-slate-400">Intelligent collections filtered by scene, moments & composition</p>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {smart_albums.map((sa) => (
              <div
                key={sa.id}
                onClick={() => handleSelectAlbum(sa.id)}
                className="p-4 rounded-2xl bg-slate-900/70 border border-slate-800 hover:border-emerald-500/40 hover:bg-slate-900 transition cursor-pointer group flex flex-col justify-between"
              >
                <div>
                  <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-widest block mb-1">
                    {sa.type.replace(/_/g, ' ')}
                  </span>
                  <h3 className="text-sm font-semibold text-white group-hover:text-emerald-300 transition">
                    {sa.name}
                  </h3>
                </div>
                <div className="mt-3 text-[11px] text-slate-500 font-medium">
                  {sa.photo_count || 0} photos
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* 7. Recently Viewed */}
      {recently_viewed && recently_viewed.length > 0 && (
        <section className="space-y-3.5">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <Clock className="w-4 h-4 text-slate-400" />
                Recently Viewed
              </h2>
              <p className="text-xs text-slate-400">Pick up where you left off</p>
            </div>
          </div>

          <div className="flex gap-4 overflow-x-auto pb-4 no-scrollbar scroll-smooth">
            {recently_viewed.map((item, idx) => renderPhotoCard(item, idx))}
          </div>
        </section>
      )}
    </div>
  );
}
