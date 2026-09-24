'use client';

import React from 'react';
import { Download, Heart, X, Loader2 } from 'lucide-react';

interface SelectionBarProps {
  selectedCount: number;
  totalPhotos: number;
  onClearSelection: () => void;
  onSelectAll: () => void;
  onDownloadSelected: () => void;
  onFavoriteSelected: () => void;
  downloading?: boolean;
}

export const SelectionBar: React.FC<SelectionBarProps> = ({
  selectedCount,
  totalPhotos,
  onClearSelection,
  onSelectAll,
  onDownloadSelected,
  onFavoriteSelected,
  downloading = false,
}) => {
  if (selectedCount === 0) return null;

  return (
    <div className="fixed bottom-0 sm:bottom-6 inset-x-0 z-40 flex justify-center px-2 sm:px-4 pb-safe pointer-events-none animate-in slide-in-from-bottom-6 duration-300">
      <div className="w-full max-w-xl bg-slate-900/95 backdrop-blur-2xl border border-indigo-500/40 rounded-t-2xl sm:rounded-2xl p-2.5 sm:p-4 shadow-2xl shadow-black/90 flex items-center justify-between gap-2 sm:gap-4 pointer-events-auto">
        {/* Count and Select All */}
        <div className="flex items-center space-x-2 sm:space-x-3 min-w-0">
          <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg sm:rounded-xl bg-indigo-600/25 border border-indigo-500/30 text-indigo-300 flex items-center justify-center font-bold text-xs sm:text-sm flex-shrink-0">
            {selectedCount}
          </div>
          <div className="min-w-0">
            <div className="text-xs sm:text-sm font-semibold text-white truncate">
              {selectedCount} <span className="hidden xs:inline">{selectedCount === 1 ? 'Selected' : 'Selected'}</span>
            </div>
            <button
              onClick={selectedCount < totalPhotos ? onSelectAll : onClearSelection}
              className="text-[10px] sm:text-[11px] text-slate-400 hover:text-indigo-300 transition-colors block truncate"
            >
              {selectedCount < totalPhotos ? 'Select All' : 'Deselect All'}
            </button>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center space-x-1.5 sm:space-x-2 flex-shrink-0">
          {/* Favorite Selected */}
          <button
            onClick={onFavoriteSelected}
            title="Favorite selected"
            aria-label="Favorite selected"
            className="min-h-[40px] min-w-[40px] sm:min-h-0 sm:min-w-0 p-2 sm:px-3 sm:py-2 bg-slate-800 hover:bg-slate-700 text-rose-400 hover:text-rose-300 border border-slate-700 rounded-xl text-xs font-semibold flex items-center justify-center space-x-1.5 transition-colors"
          >
            <Heart className="w-3.5 h-3.5 sm:w-4 sm:h-4 fill-current" />
            <span className="hidden md:inline">Favorite</span>
          </button>

          {/* Download Selected */}
          <button
            onClick={onDownloadSelected}
            disabled={downloading}
            aria-label={`Download ${selectedCount} selected photos`}
            className="min-h-[40px] px-3 py-2 sm:px-4 sm:py-2 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white rounded-xl text-xs sm:text-sm font-semibold flex items-center justify-center space-x-1.5 shadow-lg shadow-indigo-600/25 transition-all disabled:opacity-50"
          >
            {downloading ? (
              <>
                <Loader2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 animate-spin" />
                <span className="hidden xs:inline">Preparing...</span>
              </>
            ) : (
              <>
                <Download className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                <span>Download ({selectedCount})</span>
              </>
            )}
          </button>

          {/* Clear Button */}
          <button
            onClick={onClearSelection}
            title="Clear selection"
            aria-label="Clear selection"
            className="min-h-[40px] min-w-[40px] sm:min-h-0 sm:min-w-0 p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition-colors flex items-center justify-center"
          >
            <X className="w-4 h-4 sm:w-5 sm:h-5" />
          </button>
        </div>
      </div>
    </div>
  );
};

