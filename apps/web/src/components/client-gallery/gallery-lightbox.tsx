'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  X,
  ChevronLeft,
  ChevronRight,
  Heart,
  Check,
  Download,
  Info,
  ZoomIn,
  ZoomOut,
  Calendar,
  FileText,
  Sparkles,
  Layers,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { PublicPhotoItem } from './gallery-types';

interface GalleryLightboxProps {
  photos: PublicPhotoItem[];
  initialIndex: number;
  isOpen: boolean;
  onClose: () => void;
  onToggleFavorite: (photoId: string) => void;
  onToggleSelect: (photoId: string) => void;
  onDownloadSingle?: (photoId: string) => void;
  favorites: Set<string>;
  selected: Set<string>;
  gallerySlug?: string;
  onSelectPhotoById?: (photoId: string) => void;
}

export const GalleryLightbox: React.FC<GalleryLightboxProps> = ({
  photos,
  initialIndex,
  isOpen,
  onClose,
  onToggleFavorite,
  onToggleSelect,
  onDownloadSingle,
  favorites,
  selected,
  gallerySlug,
  onSelectPhotoById,
}) => {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [showInfo, setShowInfo] = useState(false);
  const [showSimilar, setShowSimilar] = useState(false);
  const [similarPhotos, setSimilarPhotos] = useState<any[]>([]);
  const [loadingSimilar, setLoadingSimilar] = useState(false);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [touchStart, setTouchStart] = useState<number | null>(null);

  useEffect(() => {
    setCurrentIndex(initialIndex);
    setZoomLevel(1);
  }, [initialIndex, isOpen]);

  const currentPhoto = photos[currentIndex];
  const currentPhotoId = currentPhoto?.id;

  useEffect(() => {
    if (!showSimilar || !currentPhotoId || !gallerySlug) return;
    setLoadingSimilar(true);
    fetch(`/api/v1/galleries/public/${gallerySlug}/photos/${currentPhotoId}/similar?limit=8`)
      .then((res) => (res.ok ? res.json() : { similar_photos: [] }))
      .then((data) => setSimilarPhotos(data.similar_photos || []))
      .catch(() => setSimilarPhotos([]))
      .finally(() => setLoadingSimilar(false));
  }, [showSimilar, currentPhotoId, gallerySlug]);

  const handleNext = useCallback(() => {
    setZoomLevel(1);
    setCurrentIndex((prev) => (prev < photos.length - 1 ? prev + 1 : 0));
  }, [photos.length]);

  const handlePrev = useCallback(() => {
    setZoomLevel(1);
    setCurrentIndex((prev) => (prev > 0 ? prev - 1 : photos.length - 1));
  }, [photos.length]);

  // Keyboard navigation
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      } else if (e.key === 'ArrowRight') {
        handleNext();
      } else if (e.key === 'ArrowLeft') {
        handlePrev();
      } else if (e.key === 'f' || e.key === 'F') {
        if (currentPhoto) onToggleFavorite(currentPhoto.id);
      } else if (e.key === 's' || e.key === 'S') {
        if (currentPhoto) onToggleSelect(currentPhoto.id);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose, handleNext, handlePrev, currentPhoto, onToggleFavorite, onToggleSelect]);

  // Touch Swipe Handlers for Mobile
  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchStart(e.touches[0].clientX);
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStart === null || zoomLevel > 1) return;
    const touchEnd = e.changedTouches[0].clientX;
    const diff = touchStart - touchEnd;

    if (diff > 45) {
      handleNext();
    } else if (diff < -45) {
      handlePrev();
    }
    setTouchStart(null);
  };

  if (!isOpen || !currentPhoto) return null;

  const isFav = favorites.has(currentPhoto.id);
  const isSel = selected.has(currentPhoto.id);
  const fullImageUrl = currentPhoto.lg_url || currentPhoto.original_url || currentPhoto.thumbnail_url;

  return (
    <div
      className="fixed inset-0 z-50 bg-black/98 backdrop-blur-2xl flex flex-col justify-between select-none animate-in fade-in duration-200"
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {/* Top Header Bar with Safe-Area padding */}
      <div className="relative z-20 flex items-center justify-between px-3 sm:px-6 pt-safe py-3 bg-gradient-to-b from-black/90 via-black/60 to-transparent text-white">
        {/* Index counter */}
        <div className="text-xs sm:text-sm font-medium text-slate-300 pl-1">
          <span>{currentIndex + 1}</span>
          <span className="text-slate-500 mx-1">/</span>
          <span>{photos.length}</span>
        </div>

        {/* Action Controls - touch friendly >=44px */}
        <div className="flex items-center space-x-1 sm:space-x-2">
          {/* Zoom Toggle */}
          <button
            onClick={() => setZoomLevel((z) => (z === 1 ? 2 : 1))}
            title={zoomLevel === 1 ? 'Zoom in' : 'Reset zoom'}
            aria-label={zoomLevel === 1 ? 'Zoom in' : 'Reset zoom'}
            className="min-h-[44px] min-w-[44px] sm:min-h-[38px] sm:min-w-[38px] p-2 text-slate-300 hover:text-white bg-white/10 hover:bg-white/20 rounded-xl flex items-center justify-center transition-colors"
          >
            {zoomLevel === 1 ? <ZoomIn className="w-4 h-4 sm:w-5 sm:h-5" /> : <ZoomOut className="w-4 h-4 sm:w-5 sm:h-5" />}
          </button>

          {/* EXIF / Info Toggle */}
          <button
            onClick={() => setShowInfo(!showInfo)}
            title="Photo information"
            aria-label="Photo information"
            className={`min-h-[44px] min-w-[44px] sm:min-h-[38px] sm:min-w-[38px] p-2 rounded-xl flex items-center justify-center transition-colors ${
              showInfo
                ? 'bg-indigo-600 text-white'
                : 'text-slate-300 hover:text-white bg-white/10 hover:bg-white/20'
            }`}
          >
            <Info className="w-4 h-4 sm:w-5 sm:h-5" />
          </button>

          {/* More Like This AI Toggle */}
          {gallerySlug && (
            <button
              onClick={() => setShowSimilar(!showSimilar)}
              title="More like this photo"
              aria-label="More like this photo"
              className={`min-h-[44px] min-w-[44px] sm:min-h-[38px] sm:min-w-[38px] px-2.5 py-1.5 rounded-xl flex items-center space-x-1.5 transition-colors text-xs font-semibold ${
                showSimilar
                  ? 'bg-gradient-to-r from-indigo-500 to-purple-600 text-white shadow-lg shadow-indigo-500/25'
                  : 'text-slate-300 hover:text-white bg-white/10 hover:bg-white/20'
              }`}
            >
              <Sparkles className="w-4 h-4 text-amber-300" />
              <span className="hidden md:inline">More Like This</span>
            </button>
          )}

          {/* Heart Favorite */}
          <button
            onClick={() => onToggleFavorite(currentPhoto.id)}
            title={isFav ? 'Remove favorite (F)' : 'Add favorite (F)'}
            aria-label={isFav ? 'Remove favorite' : 'Add favorite'}
            className={`min-h-[44px] min-w-[44px] sm:min-h-[38px] sm:min-w-[38px] p-2 rounded-xl flex items-center justify-center transition-transform active:scale-95 ${
              isFav
                ? 'bg-rose-500 text-white shadow-lg shadow-rose-500/30'
                : 'text-slate-300 hover:text-rose-400 bg-white/10 hover:bg-white/20'
            }`}
          >
            <Heart className={`w-4 h-4 sm:w-5 sm:h-5 ${isFav ? 'fill-current' : ''}`} />
          </button>

          {/* Select Checkbox */}
          <button
            onClick={() => onToggleSelect(currentPhoto.id)}
            title={isSel ? 'Deselect (S)' : 'Select (S)'}
            aria-label={isSel ? 'Deselect photo' : 'Select photo'}
            className={`min-h-[44px] min-w-[44px] sm:min-h-[38px] sm:min-w-[38px] p-2 rounded-xl flex items-center justify-center transition-transform active:scale-95 ${
              isSel
                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30'
                : 'text-slate-300 hover:text-indigo-400 bg-white/10 hover:bg-white/20'
            }`}
          >
            <Check className="w-4 h-4 sm:w-5 sm:h-5" />
          </button>

          {/* Download Single */}
          {onDownloadSingle && (
            <button
              onClick={() => onDownloadSingle(currentPhoto.id)}
              title="Download photo"
              aria-label="Download photo"
              className="min-h-[44px] min-w-[44px] sm:min-h-[38px] sm:min-w-[38px] p-2 text-slate-300 hover:text-white bg-white/10 hover:bg-white/20 rounded-xl flex items-center justify-center transition-colors"
            >
              <Download className="w-4 h-4 sm:w-5 sm:h-5" />
            </button>
          )}

          {/* Close */}
          <button
            onClick={onClose}
            title="Close Lightbox (Esc)"
            aria-label="Close Lightbox"
            className="min-h-[44px] min-w-[44px] sm:min-h-[38px] sm:min-w-[38px] p-2 text-slate-300 hover:text-white bg-white/10 hover:bg-white/20 rounded-xl flex items-center justify-center transition-colors ml-1"
          >
            <X className="w-4 h-4 sm:w-5 sm:h-5" />
          </button>
        </div>
      </div>

      {/* Main Image Stage */}
      <div className="relative flex-1 flex items-center justify-center p-2 sm:p-6 overflow-hidden">
        {/* Previous Button */}
        {photos.length > 1 && (
          <button
            onClick={handlePrev}
            title="Previous Photo (Left Arrow)"
            aria-label="Previous Photo"
            className="absolute left-2 sm:left-4 z-20 min-h-[44px] min-w-[44px] p-2.5 sm:p-3 rounded-2xl bg-black/50 hover:bg-black/80 text-white/80 hover:text-white border border-white/10 backdrop-blur-md flex items-center justify-center transition-all transform hover:scale-105 active:scale-95"
          >
            <ChevronLeft className="w-5 h-5 sm:w-6 sm:h-6" />
          </button>
        )}

        {/* High-res Image */}
        <div
          className="relative max-w-full max-h-full flex items-center justify-center transition-transform duration-300 cursor-zoom-in"
          style={{ transform: `scale(${zoomLevel})` }}
          onClick={() => setZoomLevel((z) => (z === 1 ? 2 : 1))}
        >
          <img
            src={fullImageUrl}
            alt={currentPhoto.original_filename || `Photo ${currentIndex + 1}`}
            className="max-h-[78vh] sm:max-h-[82vh] max-w-[94vw] sm:max-w-[90vw] object-contain rounded-lg shadow-2xl transition-all"
          />
        </div>

        {/* Next Button */}
        {photos.length > 1 && (
          <button
            onClick={handleNext}
            title="Next Photo (Right Arrow)"
            aria-label="Next Photo"
            className="absolute right-2 sm:right-4 z-20 min-h-[44px] min-w-[44px] p-2.5 sm:p-3 rounded-2xl bg-black/50 hover:bg-black/80 text-white/80 hover:text-white border border-white/10 backdrop-blur-md flex items-center justify-center transition-all transform hover:scale-105 active:scale-95"
          >
            <ChevronRight className="w-5 h-5 sm:w-6 sm:h-6" />
          </button>
        )}

        {/* EXIF Info Drawer (Overlaid on Right) */}
        {showInfo && (
          <div className="absolute top-4 right-4 z-30 w-72 max-w-[calc(100vw-2rem)] bg-slate-900/95 border border-slate-800 backdrop-blur-xl rounded-2xl p-5 shadow-2xl text-slate-200 animate-in slide-in-from-right-5">
            <div className="flex items-center justify-between mb-4 border-b border-slate-800 pb-2">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">Photo Details</h4>
              <button
                onClick={() => setShowInfo(false)}
                className="text-slate-500 hover:text-white p-1 rounded-lg"
                aria-label="Close photo details"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <span className="text-slate-500 block mb-0.5">Filename</span>
                <span className="font-mono text-slate-200 break-all">
                  {currentPhoto.original_filename || `photo_${currentPhoto.id.slice(0, 8)}.jpg`}
                </span>
              </div>

              {currentPhoto.width && currentPhoto.height && (
                <div>
                  <span className="text-slate-500 block mb-0.5">Dimensions</span>
                  <span className="font-mono text-slate-200">
                    {currentPhoto.width} × {currentPhoto.height} px
                  </span>
                </div>
              )}

              {currentPhoto.created_at && (
                <div>
                  <span className="text-slate-500 block mb-0.5">Uploaded</span>
                  <span className="text-slate-200 font-mono">
                    {new Date(currentPhoto.created_at).toLocaleDateString()}
                  </span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* More Like This Bottom Drawer */}
        {showSimilar && (
          <div className="absolute bottom-4 left-4 right-4 sm:left-auto sm:right-4 z-30 sm:w-96 max-h-[60vh] bg-slate-900/95 border border-indigo-500/30 backdrop-blur-2xl rounded-2xl p-4 shadow-2xl text-slate-200 animate-in slide-in-from-bottom-5 overflow-y-auto">
            <div className="flex items-center justify-between mb-3 border-b border-slate-800 pb-2">
              <div className="flex items-center space-x-2">
                <div className="p-1 rounded-lg bg-indigo-500/20 text-indigo-400">
                  <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                </div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300">More Like This Photo</h4>
              </div>
              <button
                onClick={() => setShowSimilar(false)}
                className="text-slate-500 hover:text-white p-1 rounded-lg"
                aria-label="Close similar photos"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {loadingSimilar ? (
              <div className="py-8 flex flex-col items-center justify-center space-y-2 text-slate-400 text-xs">
                <div className="w-5 h-5 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
                <span>Finding similar moments...</span>
              </div>
            ) : similarPhotos.length === 0 ? (
              <p className="py-6 text-center text-xs text-slate-400">
                No matching similar photos found for this composition.
              </p>
            ) : (
              <div className="grid grid-cols-2 gap-2 max-h-72 overflow-y-auto pr-1">
                {similarPhotos.map((sim) => {
                  const targetIdx = photos.findIndex((p) => p.id === sim.id);
                  return (
                    <button
                      key={sim.id}
                      onClick={() => {
                        if (targetIdx >= 0) {
                          setCurrentIndex(targetIdx);
                        } else if (onSelectPhotoById) {
                          onSelectPhotoById(sim.id);
                        }
                      }}
                      className="group relative rounded-xl overflow-hidden aspect-[4/3] bg-slate-800 border border-slate-700 hover:border-indigo-500 transition-all text-left focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    >
                      <img
                        src={sim.thumbnail_url || sim.original_url}
                        alt=""
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-90 group-hover:opacity-100 transition-opacity flex flex-col justify-end p-2">
                        <span className="text-[10px] font-medium text-amber-300 line-clamp-1">
                          {sim.similarity_reason || 'Similar Style'}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Bottom Thumbnail Strip for Fast Scrubbing with Safe Area */}
      <div className="relative z-20 w-full bg-gradient-to-t from-black/95 via-black/80 to-transparent p-2 sm:p-3 pb-safe flex justify-center">
        <div className="flex items-center space-x-2 overflow-x-auto no-scrollbar max-w-2xl py-1 px-4">
          {photos.map((p, idx) => (
            <button
              key={p.id || `thumb-${idx}`}
              onClick={() => {
                setZoomLevel(1);
                setCurrentIndex(idx);
              }}
              aria-label={`View photo ${idx + 1}`}
              className={`relative flex-shrink-0 w-11 h-11 sm:w-12 sm:h-12 rounded-xl overflow-hidden border-2 transition-all ${
                idx === currentIndex
                  ? 'border-indigo-500 scale-110 shadow-lg shadow-indigo-500/30'
                  : 'border-transparent opacity-50 hover:opacity-100'
              }`}
            >
              <img
                src={p.thumbnail_url || p.original_url}
                alt=""
                className="w-full h-full object-cover"
              />
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

