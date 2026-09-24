'use client';

import React from 'react';
import { GalleryPhotoCard } from './gallery-photo-card';
import { PublicPhotoItem, GridDensity } from './gallery-types';
import { Image as ImageIcon } from 'lucide-react';

interface GalleryGridProps {
  photos: PublicPhotoItem[];
  onOpenLightbox: (index: number) => void;
  onToggleFavorite: (photoId: string) => void;
  onToggleSelect: (photoId: string) => void;
  onDownloadSingle?: (photoId: string) => void;
  favorites: Set<string>;
  selected: Set<string>;
  gridDensity: GridDensity;
  loadingMore?: boolean;
  hasMore?: boolean;
  loadMoreRef?: (node?: Element | null) => void;
  emptyMessage?: string;
  emptyAction?: {
    label: string;
    onClick: () => void;
  };
}

export const GalleryGrid: React.FC<GalleryGridProps> = ({
  photos,
  onOpenLightbox,
  onToggleFavorite,
  onToggleSelect,
  onDownloadSingle,
  favorites,
  selected,
  gridDensity,
  loadingMore = false,
  hasMore = false,
  loadMoreRef,
  emptyMessage,
  emptyAction,
}) => {
  if (photos.length === 0) {
    return (
      <div className="py-20 sm:py-28 px-4 text-center max-w-md mx-auto flex flex-col items-center">
        <div className="w-16 h-16 rounded-3xl bg-slate-900 border border-slate-800 text-slate-500 flex items-center justify-center mb-4 shadow-inner">
          <ImageIcon className="w-8 h-8 text-slate-400" />
        </div>
        <h3 className="text-lg font-bold text-slate-200 mb-1">No Photographs Found</h3>
        <p className="text-xs sm:text-sm text-slate-400 mb-6">
          {emptyMessage || 'No images match the currently selected filter or search.'}
        </p>
        {emptyAction && (
          <button
            onClick={emptyAction.onClick}
            className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-xl shadow-lg shadow-indigo-600/20 transition-all min-h-[44px]"
          >
            {emptyAction.label}
          </button>
        )}
      </div>
    );
  }

  // Balanced responsive columns: 2 cols on mobile (<640px), 3 cols on tablet (640-1024px), 4-5 on desktop
  const gridClass =
    gridDensity === 'COMPACT'
      ? 'grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-2 sm:gap-3'
      : gridDensity === 'LARGE'
      ? 'grid-cols-1 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-5'
      : 'grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-4 gap-2.5 sm:gap-4';

  return (
    <div className="w-full pb-28 sm:pb-24">
      <div className={`grid ${gridClass}`}>
        {photos.map((photo, index) => (
          <GalleryPhotoCard
            key={photo.id || `photo-${index}`}
            photo={photo}
            index={index}
            onOpenLightbox={onOpenLightbox}
            onToggleFavorite={onToggleFavorite}
            onToggleSelect={onToggleSelect}
            onDownloadSingle={onDownloadSingle}
            isFavorited={favorites.has(photo.id)}
            isSelected={selected.has(photo.id)}
          />
        ))}
      </div>

      {/* Infinite Scroll Anchor & Spinner */}
      {hasMore && (
        <div ref={loadMoreRef} className="py-12 flex justify-center items-center">
          {loadingMore && (
            <div className="flex items-center space-x-2 text-xs font-medium text-slate-400 bg-slate-900/80 px-4 py-2 rounded-full border border-slate-800 backdrop-blur-md">
              <div className="w-4 h-4 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
              <span>Loading more photographs...</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

