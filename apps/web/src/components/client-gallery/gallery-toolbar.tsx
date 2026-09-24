'use client';

import React, { useState } from 'react';
import { Sparkles, Heart, CheckSquare, Grid3X3, Grid2X2, LayoutGrid, X, BookOpen, Search, Compass } from 'lucide-react';
import { ViewFilter, GridDensity, PublicSmartAlbumItem } from './gallery-types';

interface GalleryToolbarProps {
  activeFilter: ViewFilter;
  onFilterChange: (filter: ViewFilter) => void;
  totalPhotos: number;
  totalFavorites: number;
  totalSelected: number;
  totalAiMatches?: number;
  onClearAiFilter?: () => void;
  smartAlbums?: PublicSmartAlbumItem[];
  selectedSmartAlbumId?: string | null;
  onSelectSmartAlbum?: (album: PublicSmartAlbumItem) => void;
  gridDensity: GridDensity;
  onGridDensityChange: (density: GridDensity) => void;
  onOpenStory?: () => void;
  hasStory?: boolean;
  searchQuery?: string;
  onSearchChange?: (q: string) => void;
  onClearSearch?: () => void;
  isHomeActive?: boolean;
  onToggleHome?: () => void;
}

export const GalleryToolbar: React.FC<GalleryToolbarProps> = ({
  activeFilter,
  onFilterChange,
  totalPhotos,
  totalFavorites,
  totalSelected,
  totalAiMatches = 0,
  onClearAiFilter,
  smartAlbums = [],
  selectedSmartAlbumId,
  onSelectSmartAlbum,
  gridDensity,
  onGridDensityChange,
  onOpenStory,
  hasStory = true,
  searchQuery = '',
  onSearchChange,
  onClearSearch,
  isHomeActive = false,
  onToggleHome,
}) => {
  const [showSearchInput, setShowSearchInput] = useState(Boolean(searchQuery));

  return (
    <div className="sticky top-0 z-30 w-full bg-slate-950/85 backdrop-blur-xl border-b border-slate-800/80 transition-all">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 space-y-2">
        <div className="flex flex-wrap items-center justify-between gap-3">
          {/* Filter Navigation Tabs */}
          <div className="flex items-center space-x-1.5 overflow-x-auto no-scrollbar py-1">
            {onToggleHome && (
              <button
                onClick={onToggleHome}
                className={`px-3.5 py-1.5 rounded-xl text-xs sm:text-sm font-semibold flex items-center space-x-1.5 transition-all whitespace-nowrap ${
                  isHomeActive
                    ? 'bg-gradient-to-r from-purple-600/30 to-indigo-600/30 text-purple-300 border border-purple-500/40 shadow-sm'
                    : 'text-slate-400 hover:text-purple-300 hover:bg-slate-900/60'
                }`}
              >
                <Sparkles className="w-3.5 h-3.5 text-purple-400" />
                <span>Personalized Home</span>
              </button>
            )}

            {onOpenStory && (
              <button
                onClick={onOpenStory}
                className="px-3.5 py-1.5 rounded-xl text-xs sm:text-sm font-semibold flex items-center space-x-1.5 transition-all whitespace-nowrap bg-purple-500/10 text-purple-300 border border-purple-500/30 hover:bg-purple-500/20"
              >
                <BookOpen className="w-3.5 h-3.5 text-purple-400" />
                <span>Event Story</span>
              </button>
            )}

            <button
              onClick={() => {
                if (isHomeActive && onToggleHome) onToggleHome();
                onFilterChange('ALL');
              }}
              className={`px-3.5 py-1.5 rounded-xl text-xs sm:text-sm font-semibold transition-all whitespace-nowrap ${
                activeFilter === 'ALL' && !isHomeActive
                  ? 'bg-slate-800 text-white shadow-sm border border-slate-700'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60'
              }`}
            >
              All Photos ({totalPhotos})
            </button>

            {totalFavorites > 0 && (
              <button
                onClick={() => {
                  if (isHomeActive && onToggleHome) onToggleHome();
                  onFilterChange('FAVORITES');
                }}
                className={`px-3.5 py-1.5 rounded-xl text-xs sm:text-sm font-semibold flex items-center space-x-1.5 transition-all whitespace-nowrap ${
                  activeFilter === 'FAVORITES'
                    ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                    : 'text-slate-400 hover:text-rose-400 hover:bg-slate-900/60'
                }`}
              >
                <Heart className="w-3.5 h-3.5 fill-rose-500 text-rose-500" />
                <span>Favorites ({totalFavorites})</span>
              </button>
            )}

            {totalSelected > 0 && (
              <button
                onClick={() => {
                  if (isHomeActive && onToggleHome) onToggleHome();
                  onFilterChange('SELECTED');
                }}
                className={`px-3.5 py-1.5 rounded-xl text-xs sm:text-sm font-semibold flex items-center space-x-1.5 transition-all whitespace-nowrap ${
                  activeFilter === 'SELECTED'
                    ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30'
                    : 'text-slate-400 hover:text-indigo-400 hover:bg-slate-900/60'
                }`}
              >
                <CheckSquare className="w-3.5 h-3.5 text-indigo-400" />
                <span>Selected ({totalSelected})</span>
              </button>
            )}

            {totalAiMatches > 0 && (
              <div className="flex items-center space-x-1">
                <button
                  onClick={() => {
                    if (isHomeActive && onToggleHome) onToggleHome();
                    onFilterChange('AI_MATCHES');
                  }}
                  className={`px-3.5 py-1.5 rounded-xl text-xs sm:text-sm font-semibold flex items-center space-x-1.5 transition-all whitespace-nowrap ${
                    activeFilter === 'AI_MATCHES'
                      ? 'bg-gradient-to-r from-indigo-600/30 to-violet-600/30 text-indigo-200 border border-indigo-500/40 shadow-sm'
                      : 'text-slate-400 hover:text-indigo-300 hover:bg-slate-900/60'
                  }`}
                >
                  <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                  <span>My Photos ({totalAiMatches})</span>
                </button>
                {onClearAiFilter && (
                  <button
                    onClick={onClearAiFilter}
                    title="Clear selfie search results"
                    className="p-1.5 text-slate-500 hover:text-slate-300 rounded-lg hover:bg-slate-900 transition-colors"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            )}

            {/* Smart Albums Pills */}
            {smartAlbums.map((album) => {
              const isSelected = activeFilter === 'SMART_ALBUM' && selectedSmartAlbumId === album.id;
              return (
                <button
                  key={album.id}
                  onClick={() => {
                    if (isHomeActive && onToggleHome) onToggleHome();
                    onSelectSmartAlbum && onSelectSmartAlbum(album);
                  }}
                  className={`px-3 py-1.5 rounded-xl text-xs sm:text-sm font-semibold transition-all whitespace-nowrap flex items-center space-x-1.5 ${
                    isSelected
                      ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30 shadow-sm'
                      : 'text-slate-400 hover:text-amber-300 hover:bg-slate-900/60'
                  }`}
                >
                  <Sparkles className="w-3 h-3 text-amber-400" />
                  <span>{album.name}</span>
                </button>
              );
            })}
          </div>

          {/* Right Tools: Search Button & Grid Density */}
          <div className="flex items-center space-x-2">
            {onSearchChange && (
              <button
                onClick={() => setShowSearchInput((prev) => !prev)}
                className={`p-2 rounded-xl border text-xs font-semibold flex items-center gap-1.5 transition ${
                  showSearchInput || searchQuery
                    ? 'bg-indigo-600/20 border-indigo-500/40 text-indigo-300'
                    : 'bg-slate-900/80 border-slate-800 text-slate-400 hover:text-white'
                }`}
                title="Search Gallery"
              >
                <Search className="w-4 h-4" />
                <span className="hidden md:inline">Search</span>
              </button>
            )}

            {/* Grid Density Switcher */}
            <div className="hidden sm:flex items-center space-x-1 bg-slate-900/80 p-1 rounded-xl border border-slate-800">
              <button
                onClick={() => onGridDensityChange('COMPACT')}
                title="Compact Grid"
                className={`p-1.5 rounded-lg transition-colors ${
                  gridDensity === 'COMPACT'
                    ? 'bg-slate-800 text-indigo-400 shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Grid3X3 className="w-4 h-4" />
              </button>
              <button
                onClick={() => onGridDensityChange('COMFORTABLE')}
                title="Comfortable Grid"
                className={`p-1.5 rounded-lg transition-colors ${
                  gridDensity === 'COMFORTABLE'
                    ? 'bg-slate-800 text-indigo-400 shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Grid2X2 className="w-4 h-4" />
              </button>
              <button
                onClick={() => onGridDensityChange('LARGE')}
                title="Large Grid"
                className={`p-1.5 rounded-lg transition-colors ${
                  gridDensity === 'LARGE'
                    ? 'bg-slate-800 text-indigo-400 shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <LayoutGrid className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Expandable Safe Search Field */}
        {showSearchInput && onSearchChange && (
          <div className="pt-2 border-t border-slate-800/60 flex items-center gap-2 animate-in fade-in duration-150">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search tags, scenes, moments (e.g. 'couple', 'ceremony', 'dance', 'cake')..."
                value={searchQuery}
                onChange={(e) => onSearchChange(e.target.value)}
                className="w-full bg-slate-900/90 border border-slate-700/80 rounded-xl pl-9 pr-8 py-1.5 text-xs sm:text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
              />
              {searchQuery && onClearSearch && (
                <button
                  onClick={onClearSearch}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
