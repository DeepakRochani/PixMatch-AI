'use client';

import React from 'react';
import { Sparkles, Share2, Download, Calendar, MapPin, Image as ImageIcon, Building2 } from 'lucide-react';
import { PublicGalleryData } from './gallery-types';

interface GalleryHeaderProps {
  gallery: PublicGalleryData;
  onOpenAiSearch: () => void;
  onOpenShare: () => void;
  onBulkDownload?: () => void;
}

export const GalleryHeader: React.FC<GalleryHeaderProps> = ({
  gallery,
  onOpenAiSearch,
  onOpenShare,
  onBulkDownload,
}) => {
  const formattedDate = gallery.event_date
    ? new Date(gallery.event_date).toLocaleDateString('en-US', {
        month: 'long',
        day: 'numeric',
        year: 'numeric',
      })
    : null;

  return (
    <header className="relative w-full overflow-hidden bg-slate-950 text-white border-b border-slate-800/60">
      {/* Cover / Hero Imagery with Ambient Backdrop */}
      {gallery.cover_photo_url ? (
        <div className="absolute inset-0 z-0">
          <img
            src={gallery.cover_photo_url}
            alt={gallery.title}
            className="w-full h-full object-cover object-center filter brightness-[0.30] scale-105 transform transition-transform duration-1000"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/70 to-slate-950/40" />
        </div>
      ) : (
        <div className="absolute inset-0 z-0 bg-gradient-to-b from-indigo-950/30 via-slate-950 to-slate-950" />
      )}

      {/* Top Utility Bar for Studio Name and Share */}
      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-4 sm:pt-6 flex items-center justify-between">
        {/* Studio Branding */}
        <div className="flex items-center space-x-2 px-3 py-1.5 rounded-full bg-white/10 backdrop-blur-md border border-white/10 text-[11px] sm:text-xs tracking-wider uppercase font-medium text-slate-200 shadow-sm">
          {gallery.studio.logo_url ? (
            <img
              src={gallery.studio.logo_url}
              alt={gallery.studio.name}
              className="h-4 w-auto object-contain rounded"
            />
          ) : (
            <Building2 className="w-3.5 h-3.5 text-indigo-400" />
          )}
          <span className="truncate max-w-[140px] sm:max-w-xs">{gallery.studio.name}</span>
        </div>

        {/* Quick Top Share Button */}
        <button
          onClick={onOpenShare}
          aria-label="Share Gallery"
          className="min-h-[44px] min-w-[44px] sm:min-h-0 sm:min-w-0 px-3 py-1.5 bg-white/10 hover:bg-white/20 text-slate-200 border border-white/10 rounded-full text-xs font-medium backdrop-blur-md flex items-center justify-center space-x-1.5 transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500"
        >
          <Share2 className="w-3.5 h-3.5 text-slate-300" />
          <span className="hidden sm:inline">Share</span>
        </button>
      </div>

      {/* Hero Content Container */}
      <div className="relative z-10 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 pb-10 sm:pt-10 sm:pb-14 flex flex-col items-center text-center">
        {/* Gallery Title */}
        <h1 className="text-2xl sm:text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight text-white leading-tight mb-3 sm:mb-4 drop-shadow-md">
          {gallery.title}
        </h1>

        {/* Metadata Details (Date, Location, Total Photos) */}
        <div className="flex flex-wrap items-center justify-center gap-3 sm:gap-6 text-xs sm:text-sm text-slate-300/90 mb-6 sm:mb-8 font-normal">
          {formattedDate && (
            <div className="flex items-center space-x-1.5">
              <Calendar className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-indigo-400" />
              <span>{formattedDate}</span>
            </div>
          )}
          {gallery.location && (
            <div className="flex items-center space-x-1.5">
              <MapPin className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-violet-400" />
              <span>{gallery.location}</span>
            </div>
          )}
          <div className="flex items-center space-x-1.5">
            <ImageIcon className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-slate-400" />
            <span>{gallery.total_photos} Photos</span>
          </div>
        </div>

        {/* Primary CTA - Find My Photos */}
        {gallery.enable_ai_face_search && (
          <div className="w-full max-w-md flex flex-col items-center mb-4">
            <button
              onClick={onOpenAiSearch}
              className="w-full sm:w-auto px-7 py-3.5 bg-gradient-to-r from-indigo-600 via-violet-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-semibold text-sm sm:text-base rounded-2xl shadow-xl shadow-indigo-600/25 flex items-center justify-center space-x-2.5 transition-all transform hover:-translate-y-0.5 active:translate-y-0 min-h-[48px]"
            >
              <Sparkles className="w-5 h-5 text-amber-300" />
              <span>Find My Photos</span>
            </button>
            <p className="text-[11px] sm:text-xs text-slate-400 mt-2">
              Take a selfie and find the photos you&apos;re in
            </p>
          </div>
        )}

        {/* Secondary Download Action if enabled */}
        {gallery.bulk_download_enabled && onBulkDownload && (
          <button
            onClick={onBulkDownload}
            className="mt-2 text-xs font-medium text-slate-400 hover:text-slate-200 inline-flex items-center space-x-1.5 transition-colors p-2"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Download All Gallery Photos</span>
          </button>
        )}
      </div>
    </header>
  );
};

