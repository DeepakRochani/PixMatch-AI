'use client';

import React, { useState } from 'react';
import {
  X,
  Trash2,
  RefreshCw,
  Sparkles,
  Image as ImageIcon,
  FolderInput,
  Download,
  Calendar,
  Layers,
  HardDrive,
  CheckCircle2,
  AlertCircle,
  Loader2,
} from 'lucide-react';
import { formatBytes, formatDate } from '@pixmatch/ui';
import { fetchApi } from '@/lib/api-client';

export interface PhotoItem {
  id: string;
  studio_id: string;
  gallery_id: string;
  album_id?: string | null;
  storage_provider?: string;
  storage_path: string;
  original_url: string;
  thumbnail_url?: string | null;
  original_filename?: string | null;
  file_hash?: string | null;
  width?: number | null;
  height?: number | null;
  file_size: number;
  mime_type: string;
  processing_status: string;
  face_count?: number;
  is_face_indexed?: boolean;
  is_cover?: boolean;
  sort_order?: number;
  created_at: string;
  album?: { id: string; title: string } | null;
  versions?: Array<{
    id: string;
    version_type: string;
    url: string;
    width?: number | null;
    height?: number | null;
    file_size?: number;
  }>;
}

interface PhotoDetailModalProps {
  photo: PhotoItem | null;
  isOpen: boolean;
  onClose: () => void;
  galleryId: string;
  albums: Array<{ id: string; title: string }>;
  onPhotoUpdated: () => void;
  onDeleteRequested: (photo: PhotoItem) => void;
}

export function PhotoDetailModal({
  photo,
  isOpen,
  onClose,
  galleryId,
  albums,
  onPhotoUpdated,
  onDeleteRequested,
}: PhotoDetailModalProps) {
  const [acting, setActing] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  if (!isOpen || !photo) return null;

  const handleSetCover = async () => {
    setActing(true);
    setStatusMessage(null);
    try {
      const res = await fetchApi(`/galleries/${galleryId}/cover`, {
        method: 'POST',
        body: JSON.stringify({ photo_id: photo.id }),
      });
      if (res.success) {
        setStatusMessage('Cover photo set successfully');
        onPhotoUpdated();
      }
    } finally {
      setActing(false);
    }
  };

  const handleReprocess = async () => {
    setActing(true);
    setStatusMessage(null);
    try {
      const res = await fetchApi(`/photos/${photo.id}/retry`, {
        method: 'POST',
      });
      if (res.success) {
        setStatusMessage('Photo re-processing queued');
        onPhotoUpdated();
      }
    } finally {
      setActing(false);
    }
  };

  const handleMoveAlbum = async (albumId: string) => {
    setActing(true);
    try {
      const res = await fetchApi(`/galleries/${galleryId}/photos/bulk-action`, {
        method: 'POST',
        body: JSON.stringify({
          action: 'MOVE_TO_ALBUM',
          photo_ids: [photo.id],
          target_album_id: albumId === 'unassigned' ? null : albumId,
        }),
      });
      if (res.success) {
        setStatusMessage('Album updated');
        onPhotoUpdated();
      }
    } finally {
      setActing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in">
      <div className="bg-card border border-card-border rounded-2xl w-full max-w-5xl h-[85vh] overflow-hidden shadow-2xl flex flex-col md:flex-row">
        {/* Left: Big Photo Preview */}
        <div className="flex-1 bg-black/50 p-6 flex items-center justify-center relative overflow-hidden border-b md:border-b-0 md:border-r border-card-border">
          <img
            src={photo.thumbnail_url || photo.original_url}
            alt={photo.original_filename || 'Photo preview'}
            className="max-h-full max-w-full object-contain rounded-lg shadow-lg"
          />

          <button
            onClick={onClose}
            className="absolute top-4 left-4 md:hidden p-2 rounded-xl bg-black/60 text-white backdrop-blur-md"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Right: Inspector & Metadata Drawer */}
        <div className="w-full md:w-96 flex flex-col bg-card overflow-y-auto">
          {/* Header */}
          <div className="p-5 border-b border-card-border flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-white tracking-tight truncate max-w-[200px]">
                {photo.original_filename || 'Photograph'}
              </h3>
              <p className="text-[11px] text-muted">ID: {photo.id.slice(0, 8)}...</p>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-muted hover:text-white hover:bg-card-border/50 transition hidden md:block"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Body content */}
          <div className="p-5 space-y-5 flex-1 text-xs">
            {statusMessage && (
              <div className="p-3 bg-primary/15 border border-primary/30 rounded-xl text-primary flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4" />
                {statusMessage}
              </div>
            )}

            {/* Quick Properties */}
            <div className="space-y-3">
              <h4 className="text-[11px] font-semibold text-muted uppercase tracking-wider">Properties</h4>
              <div className="bg-card-border/20 rounded-xl p-3.5 space-y-2 border border-card-border/40">
                <div className="flex justify-between">
                  <span className="text-muted">Dimensions:</span>
                  <span className="text-white font-medium">
                    {photo.width && photo.height ? `${photo.width} × ${photo.height} px` : 'Processing'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted">File Size:</span>
                  <span className="text-white font-medium">{formatBytes(photo.file_size)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted">Format:</span>
                  <span className="text-white font-medium">{photo.mime_type}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted">Storage:</span>
                  <span className="text-white font-medium">{photo.storage_provider}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted">Uploaded:</span>
                  <span className="text-white font-medium">{formatDate(photo.created_at)}</span>
                </div>
              </div>
            </div>

            {/* Processing & AI Status */}
            <div className="space-y-3">
              <h4 className="text-[11px] font-semibold text-muted uppercase tracking-wider">AI & Processing</h4>
              <div className="bg-card-border/20 rounded-xl p-3.5 space-y-2 border border-card-border/40">
                <div className="flex justify-between items-center">
                  <span className="text-muted">Status:</span>
                  <span
                    className={`font-semibold px-2 py-0.5 rounded text-[10px] ${
                      photo.processing_status === 'COMPLETED'
                        ? 'bg-emerald-500/15 text-emerald-400'
                        : photo.processing_status === 'FAILED'
                        ? 'bg-red-500/15 text-red-400'
                        : 'bg-amber-500/15 text-amber-400'
                    }`}
                  >
                    {photo.processing_status}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted">Faces Indexed:</span>
                  <span className="text-white font-semibold flex items-center gap-1.5">
                    <Sparkles className="h-3.5 w-3.5 text-primary" />
                    {photo.face_count || 0} detected
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted">Current Album:</span>
                  <span className="text-accent font-medium">{photo.album?.title || 'Unassigned'}</span>
                </div>
              </div>
            </div>

            {/* Album Assignment Dropdown */}
            {albums.length > 0 && (
              <div className="space-y-2">
                <label className="text-[11px] font-semibold text-muted uppercase tracking-wider">Move to Album</label>
                <select
                  value={photo.album_id || 'unassigned'}
                  onChange={(e) => handleMoveAlbum(e.target.value)}
                  disabled={acting}
                  className="w-full bg-card-border/30 border border-card-border rounded-xl px-3 py-2 text-white text-xs outline-none focus:border-primary transition"
                >
                  <option value="unassigned" className="bg-card text-white">
                    Unassigned (All Photos)
                  </option>
                  {albums.map((a) => (
                    <option key={a.id} value={a.id} className="bg-card text-white">
                      {a.title}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {/* Action Footer */}
          <div className="p-4 border-t border-card-border bg-card/90 space-y-2">
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={handleSetCover}
                disabled={acting}
                className="px-3 py-2 text-xs font-semibold bg-card-border/50 hover:bg-card-border text-white rounded-xl transition flex items-center justify-center gap-1.5"
              >
                <ImageIcon className="h-3.5 w-3.5" />
                Set Cover
              </button>

              <button
                onClick={handleReprocess}
                disabled={acting}
                className="px-3 py-2 text-xs font-semibold bg-card-border/50 hover:bg-card-border text-white rounded-xl transition flex items-center justify-center gap-1.5"
              >
                <RefreshCw className="h-3.5 w-3.5" />
                Reprocess
              </button>
            </div>

            <button
              onClick={() => {
                onClose();
                onDeleteRequested(photo);
              }}
              className="w-full px-3 py-2 text-xs font-semibold text-red-400 hover:bg-red-500/10 border border-red-500/20 rounded-xl transition flex items-center justify-center gap-1.5"
            >
              <Trash2 className="h-3.5 w-3.5" />
              Delete Photo
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
