'use client';

import React from 'react';
import { Sparkles, Heart, Check, Download, ArrowRight, RefreshCw } from 'lucide-react';
import { AiMatchItem, PublicPhotoItem } from '../gallery-types';

interface MatchResultsProps {
  matches: AiMatchItem[];
  totalMatches: number;
  searchTimeMs?: number;
  onApplyMatchesToGallery: () => void;
  onSelectAllMatches: () => void;
  onDownloadAllMatches: () => void;
  onResetSearch: () => void;
  onOpenLightboxWithPhoto: (photo: PublicPhotoItem) => void;
  favorites: Set<string>;
  selected: Set<string>;
  onToggleFavorite: (photoId: string) => void;
  onToggleSelect: (photoId: string) => void;
}

export const MatchResults: React.FC<MatchResultsProps> = ({
  matches,
  totalMatches,
  searchTimeMs,
  onApplyMatchesToGallery,
  onSelectAllMatches,
  onDownloadAllMatches,
  onResetSearch,
  onOpenLightboxWithPhoto,
  favorites,
  selected,
  onToggleFavorite,
  onToggleSelect,
}) => {
  if (matches.length === 0) {
    return (
      <div className="w-full max-w-md mx-auto text-center py-6 sm:py-8">
        <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-3xl bg-slate-950 border border-slate-800 text-slate-400 flex items-center justify-center mx-auto mb-4">
          <Sparkles className="w-7 h-7 sm:w-8 sm:h-8 text-indigo-400" />
        </div>
        <h3 className="text-lg sm:text-xl font-bold text-white mb-2">We Couldn&apos;t Find Your Photos</h3>
        <p className="text-xs sm:text-sm text-slate-400 mb-5 leading-relaxed">
          Try another selfie to help our face search locate your photos:
        </p>

        <div className="bg-slate-950/70 border border-slate-800/80 rounded-2xl p-4 mb-6 text-left text-xs text-slate-300 space-y-2">
          <div className="flex items-center space-x-2">
            <span className="text-indigo-400">•</span>
            <span>Use good, front-facing lighting</span>
          </div>
          <div className="flex items-center space-x-2">
            <span className="text-indigo-400">•</span>
            <span>Ensure your face is clearly visible without sunglasses</span>
          </div>
          <div className="flex items-center space-x-2">
            <span className="text-indigo-400">•</span>
            <span>Only you in the selfie frame</span>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-2.5">
          <button
            onClick={onResetSearch}
            className="w-full sm:w-auto px-6 py-3 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white text-xs font-semibold rounded-xl shadow-lg transition-all min-h-[44px]"
          >
            Try Another Selfie
          </button>
          <button
            onClick={onApplyMatchesToGallery}
            className="w-full sm:w-auto px-5 py-3 bg-slate-800 hover:bg-slate-750 text-slate-300 text-xs font-semibold rounded-xl border border-slate-700 transition-all min-h-[44px]"
          >
            Back to Gallery
          </button>
        </div>
      </div>
    );
  }

  // Split into Best Matches and More Possible Matches
  const bestMatches = matches.filter((m) => (m.confidence ?? m.similarity_score) >= 0.7);
  const possibleMatches = matches.filter((m) => (m.confidence ?? m.similarity_score) < 0.7);

  return (
    <div className="w-full space-y-6">
      {/* Results Header Banner */}
      <div className="bg-gradient-to-r from-indigo-950/60 via-purple-950/40 to-slate-950 p-4 sm:p-5 rounded-2xl border border-indigo-500/30 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center space-x-3">
          <div className="p-2.5 bg-indigo-600/20 text-indigo-400 rounded-xl border border-indigo-500/30">
            <Sparkles className="w-5 h-5 text-amber-300" />
          </div>
          <div>
            <h3 className="text-base sm:text-lg font-bold text-white">
              Found {totalMatches} {totalMatches === 1 ? 'Photo' : 'Photos'} of You
            </h3>
            <p className="text-xs text-indigo-200/70">
              Matched across event gallery {searchTimeMs ? `in ${searchTimeMs}ms` : ''}
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2 w-full sm:w-auto justify-end">
          <button
            onClick={onSelectAllMatches}
            className="px-3 py-2 bg-slate-900/80 hover:bg-slate-800 text-slate-200 border border-slate-700/80 rounded-xl text-xs font-medium flex items-center space-x-1.5 transition-colors min-h-[40px]"
          >
            <Check className="w-3.5 h-3.5 text-indigo-400" />
            <span>Select All</span>
          </button>

          <button
            onClick={onApplyMatchesToGallery}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-medium flex items-center space-x-1.5 shadow-md shadow-indigo-600/20 transition-all min-h-[40px]"
          >
            <span>View in Gallery</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Best Matches Section */}
      {bestMatches.length > 0 && (
        <div className="space-y-3">
          <h4 className="text-xs uppercase font-bold tracking-wider text-slate-400">
            Best Matches ({bestMatches.length})
          </h4>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2.5 sm:gap-3">
            {bestMatches.map((m, idx) => {
              const photo = m.photo || {
                id: m.photo_id,
                original_url: m.thumbnail_url || '',
                thumbnail_url: m.thumbnail_url || '',
                similarity_score: m.similarity_score,
                confidence: m.confidence,
              };
              const isFav = favorites.has(photo.id);
              const isSel = selected.has(photo.id);

              return (
                <div
                  key={photo.id || idx}
                  onClick={() => onOpenLightboxWithPhoto(photo as PublicPhotoItem)}
                  className="group relative aspect-square bg-slate-950 rounded-xl sm:rounded-2xl overflow-hidden border border-indigo-500/40 hover:border-indigo-400 cursor-pointer shadow-md transition-all"
                >
                  <img
                    src={photo.thumbnail_url || photo.original_url}
                    alt=""
                    className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />

                  {/* Favorite & Select Buttons */}
                  <div className="absolute top-2 right-2 flex space-x-1 opacity-90 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onToggleFavorite(photo.id);
                      }}
                      aria-label="Toggle favorite"
                      className={`p-1.5 sm:p-2 rounded-lg backdrop-blur-md transition-colors ${
                        isFav ? 'bg-rose-500 text-white' : 'bg-black/60 text-slate-200'
                      }`}
                    >
                      <Heart className={`w-3.5 h-3.5 ${isFav ? 'fill-current' : ''}`} />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onToggleSelect(photo.id);
                      }}
                      aria-label="Toggle selection"
                      className={`p-1.5 sm:p-2 rounded-lg backdrop-blur-md transition-colors ${
                        isSel ? 'bg-indigo-600 text-white' : 'bg-black/60 text-slate-200'
                      }`}
                    >
                      <Check className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Possible Matches Section */}
      {possibleMatches.length > 0 && (
        <div className="space-y-3 pt-3 border-t border-slate-800/80">
          <h4 className="text-xs uppercase font-bold tracking-wider text-slate-400">
            More Possible Matches ({possibleMatches.length})
          </h4>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2.5 sm:gap-3">
            {possibleMatches.map((m, idx) => {
              const photo = m.photo || {
                id: m.photo_id,
                original_url: m.thumbnail_url || '',
                thumbnail_url: m.thumbnail_url || '',
                similarity_score: m.similarity_score,
                confidence: m.confidence,
              };
              const isFav = favorites.has(photo.id);
              const isSel = selected.has(photo.id);

              return (
                <div
                  key={photo.id || idx}
                  onClick={() => onOpenLightboxWithPhoto(photo as PublicPhotoItem)}
                  className="group relative aspect-square bg-slate-950 rounded-xl sm:rounded-2xl overflow-hidden border border-slate-800 hover:border-slate-700 cursor-pointer shadow-md transition-all"
                >
                  <img
                    src={photo.thumbnail_url || photo.original_url}
                    alt=""
                    className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />

                  <div className="absolute top-2 right-2 flex space-x-1 opacity-90 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onToggleFavorite(photo.id);
                      }}
                      aria-label="Toggle favorite"
                      className={`p-1.5 sm:p-2 rounded-lg backdrop-blur-md transition-colors ${
                        isFav ? 'bg-rose-500 text-white' : 'bg-black/60 text-slate-200'
                      }`}
                    >
                      <Heart className={`w-3.5 h-3.5 ${isFav ? 'fill-current' : ''}`} />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onToggleSelect(photo.id);
                      }}
                      aria-label="Toggle selection"
                      className={`p-1.5 sm:p-2 rounded-lg backdrop-blur-md transition-colors ${
                        isSel ? 'bg-indigo-600 text-white' : 'bg-black/60 text-slate-200'
                      }`}
                    >
                      <Check className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Bottom Footer Actions */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 border-t border-slate-800">
        <button
          onClick={onResetSearch}
          className="text-xs text-slate-400 hover:text-white flex items-center space-x-1.5 transition-colors p-2"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Scan another photo</span>
        </button>

        <button
          onClick={onDownloadAllMatches}
          className="w-full sm:w-auto px-4 py-2.5 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white rounded-xl text-xs font-semibold flex items-center justify-center space-x-1.5 shadow-lg shadow-indigo-600/20 transition-all min-h-[44px]"
        >
          <Download className="w-3.5 h-3.5" />
          <span>Download All Matched Photos</span>
        </button>
      </div>
    </div>
  );
};

