'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  X,
  Copy,
  Check,
  QrCode,
  ExternalLink,
  ShieldCheck,
  Lock,
  Globe,
  Share2,
  Download,
} from 'lucide-react';

interface ShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  gallery: {
    id: string;
    title: string;
    slug: string;
    access_type: string;
    password_hash?: string | null;
    expires_at?: string | null;
  } | null;
}

export function ShareModal({ isOpen, onClose, gallery }: ShareModalProps) {
  const [copied, setCopied] = useState(false);

  if (!isOpen || !gallery) return null;

  const publicUrl = typeof window !== 'undefined'
    ? `${window.location.origin}/gallery/${gallery.slug}`
    : `/gallery/${gallery.slug}`;

  const qrImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=240x240&data=${encodeURIComponent(
    publicUrl
  )}&bgcolor=12141a&color=ffffff&margin=10`;

  const handleCopy = () => {
    navigator.clipboard.writeText(publicUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
      <div className="bg-card border border-card-border rounded-2xl w-full max-w-md overflow-hidden shadow-2xl flex flex-col">
        {/* Header */}
        <div className="p-5 border-b border-card-border flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold text-white tracking-tight flex items-center gap-2">
              <Share2 className="h-5 w-5 text-primary" />
              Share Client Gallery
            </h3>
            <p className="text-xs text-muted">Share this link or QR code with your clients and guests</p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-muted hover:text-white hover:bg-card-border/50 transition"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-5 text-center">
          {/* QR Code Container */}
          <div className="flex flex-col items-center justify-center">
            <div className="p-3 bg-card-border/30 border border-card-border rounded-2xl shadow-inner">
              <img
                src={qrImageUrl}
                alt="Gallery QR Code"
                className="w-48 h-48 rounded-xl object-contain"
              />
            </div>
            <p className="text-[11px] text-muted mt-2">Scan with smartphone camera to open gallery</p>
          </div>

          {/* Direct Link Input */}
          <div className="space-y-1.5 text-left">
            <label className="text-[11px] font-semibold text-muted uppercase tracking-wider">Public Gallery URL</label>
            <div className="flex items-center gap-2">
              <input
                type="text"
                readOnly
                value={publicUrl}
                className="w-full bg-card-border/20 border border-card-border rounded-xl px-3.5 py-2.5 text-white text-xs font-mono outline-none select-all"
              />
              <button
                onClick={handleCopy}
                className="px-4 py-2.5 bg-primary hover:bg-primary-hover text-white text-xs font-semibold rounded-xl transition flex items-center gap-1.5 shadow-md shadow-primary/20 flex-shrink-0"
              >
                {copied ? (
                  <>
                    <Check className="h-4 w-4" />
                    Copied
                  </>
                ) : (
                  <>
                    <Copy className="h-4 w-4" />
                    Copy
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Access Status Summary */}
          <div className="bg-card-border/20 border border-card-border/40 rounded-xl p-3 text-left flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              {gallery.access_type === 'PASSWORD' ? (
                <Lock className="h-4 w-4 text-amber-400" />
              ) : gallery.access_type === 'PRIVATE' ? (
                <ShieldCheck className="h-4 w-4 text-red-400" />
              ) : (
                <Globe className="h-4 w-4 text-emerald-400" />
              )}
              <span className="text-muted">Access Mode:</span>
              <span className="text-white font-semibold">{gallery.access_type}</span>
            </div>

            <Link
              href={`/gallery/${gallery.slug}`}
              target="_blank"
              className="text-primary hover:text-accent font-semibold flex items-center gap-1 text-xs"
            >
              Preview <ExternalLink className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-card-border bg-card/90 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 text-xs font-semibold text-white bg-card-border/60 hover:bg-card-border rounded-xl transition"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
