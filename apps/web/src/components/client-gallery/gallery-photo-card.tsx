'use client';

import React, { useState } from 'react';
import { Heart, Check, Download, Eye } from 'lucide-react';
import { PublicPhotoItem } from './gallery-types';

interface GalleryPhotoCardProps {
  photo: PublicPhotoItem;
  index: number;
  onOpenLightbox: (index: number) => void;
  onToggleFavorite: (photoId: string) => void;
  onToggleSelect: (photoId: string) => void;
  onDownloadSingle?: (photoId: string) => void;
  isFavorited: boolean;
  isSelected: boolean;
}

export const GalleryPhotoCard: React.FC<GalleryPhotoCardProps> = ({
  photo,
  index,
  onOpenLightbox,
  onToggleFavorite,
  onToggleSelect,
  onDownloadSingle,
  isFavorited,
  isSelected,
}) => {
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState(false);

  const displayUrl = photo.md_url || photo.thumbnail_url || photo.original_url;

  return (
    <div
      className={`group relative overflow-hidden rounded-xl sm:rounded-2xl bg-slate-900 border transition-all duration-300 cursor-pointer ${
        isSelected
          ? 'border-indigo-500 ring-2 ring-indigo-500/60 shadow-lg shadow-indigo-500/15'
          : 'border-slate-800/80 hover:border-slate-700 hover:shadow-xl hover:shadow-black/40'
      }`}
      onClick={() => onOpenLightbox(index)}
    >
      {/* Aspect Ratio Container */}
      <div className="relative w-full aspect-[4/3] sm:aspect-auto sm:h-72 overflow-hidden bg-slate-950">
        {/* Shimmer Placeholder Skeleton */}
        {!loaded && !error && (
          <div className="absolute inset-0 bg-slate-900/90 animate-pulse flex items-center justify-center">
            <div className="w-8 h-8 rounded-full border border-slate-800 bg-slate-850" />
          </div>
        )}

        <img
          src={displayUrl}
          alt={photo.original_filename || `Photo ${index + 1}`}
          loading="lazy"
          onLoad={() => setLoaded(true)}
          onError={() => {
            setError(true);
            setLoaded(true);
          }}
          className={`w-full h-full object-cover object-center transition-transform duration-500 group-hover:scale-105 ${
            loaded ? 'opacity-100' : 'opacity-0'
          }`}
        />

        {/* Hover / Active Gradient Scrim */}
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950/70 via-transparent to-black/20 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none" />

        {/* Selected Overlay Indicator */}
        {isSelected && (
          <div className="absolute inset-0 bg-indigo-950/20 border-2 border-indigo-500 pointer-events-none" />
        )}

        {/* Top Right Quick Actions (Select & Favorite) - 44px touch targets on mobile */}
        <div className="absolute top-2 right-2 sm:top-3 sm:right-3 z-10 flex items-center space-x-1 sm:space-x-1.5 opacity-90 sm:opacity-0 sm:group-hover:opacity-100 focus-within:opacity-100 transition-opacity duration-200">
          {/* Heart Favorite Button */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onToggleFavorite(photo.id);
            }}
            aria-label={isFavorited ? 'Remove from favorites' : 'Add to favorites'}
            title={isFavorited ? 'Remove from favorites' : 'Add to favorites'}
            className={`min-h-[44px] min-w-[44px] sm:min-h-[36px] sm:min-w-[36px] p-2 sm:p-2 rounded-xl backdrop-blur-md border flex items-center justify-center transition-transform active:scale-95 ${
              isFavorited
                ? 'bg-rose-500 text-white border-rose-400 shadow-md shadow-rose-500/20 scale-105'
                : 'bg-slate-900/80 text-slate-300 border-slate-700/80 hover:text-rose-400 hover:bg-slate-800'
            }`}
          >
            <Heart className={`w-4 h-4 ${isFavorited ? 'fill-current' : ''}`} />
          </button>

          {/* Selection Checkbox Button */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onToggleSelect(photo.id);
            }}
            aria-label={isSelected ? 'Deselect photo' : 'Select photo'}
            title={isSelected ? 'Deselect photo' : 'Select photo'}
            className={`min-h-[44px] min-w-[44px] sm:min-h-[36px] sm:min-w-[36px] p-2 sm:p-2 rounded-xl backdrop-blur-md border flex items-center justify-center transition-transform active:scale-95 ${
              isSelected
                ? 'bg-indigo-600 text-white border-indigo-400 shadow-md shadow-indigo-600/20 scale-105'
                : 'bg-slate-900/80 text-slate-300 border-slate-700/80 hover:text-indigo-400 hover:bg-slate-800'
            }`}
          >
            <Check className="w-4 h-4" />
          </button>
        </div>

        {/* Bottom Overlay Info & Download */}
        <div className="absolute bottom-2 inset-x-2 sm:bottom-3 sm:inset-x-3 z-10 hidden sm:flex items-center justify-between opacity-0 group-hover:opacity-100 transition-opacity duration-200">
          <span className="text-xs text-slate-200 font-medium truncate max-w-[70%] drop-shadow">
            {photo.original_filename || `Photo #${index + 1}`}
          </span>

          <div className="flex items-center space-x-1">
            {onDownloadSingle && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onDownloadSingle(photo.id);
                }}
                title="Download Photo"
                aria-label="Download Photo"
                className="p-1.5 rounded-lg bg-slate-900/80 text-slate-300 hover:text-white border border-slate-700/80 backdrop-blur-md transition-colors"
              >
                <Download className="w-3.5 h-3.5" />
              </button>
            )}
            <div className="p-1.5 rounded-lg bg-slate-900/80 text-slate-300 border border-slate-700/80 backdrop-blur-md">
              <Eye className="w-3.5 h-3.5" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

