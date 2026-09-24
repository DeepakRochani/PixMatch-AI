'use client';

import React, { useState } from 'react';
import { X, Copy, Check, Share2, QrCode, MessageCircle, Mail } from 'lucide-react';

interface ShareDialogProps {
  isOpen: boolean;
  onClose: () => void;
  galleryTitle: string;
  galleryUrl: string;
}

export const ShareDialog: React.FC<ShareDialogProps> = ({
  isOpen,
  onClose,
  galleryTitle,
  galleryUrl,
}) => {
  const [copied, setCopied] = useState(false);
  const [showQr, setShowQr] = useState(false);

  if (!isOpen) return null;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(galleryUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  };

  const handleNativeShare = async () => {
    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({
          title: galleryTitle,
          text: `View photos from ${galleryTitle}`,
          url: galleryUrl,
        });
      } catch {
        // User cancelled or share failed
      }
    }
  };

  const whatsappUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(
    `Check out photos from ${galleryTitle}: ${galleryUrl}`
  )}`;
  const mailUrl = `mailto:?subject=${encodeURIComponent(galleryTitle)}&body=${encodeURIComponent(
    `You can view the photos here: ${galleryUrl}`
  )}`;

  // Quick QR code image generated via standard public API
  const qrCodeImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=240x240&data=${encodeURIComponent(
    galleryUrl
  )}`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
      <div
        className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl p-5 sm:p-6 text-slate-100 relative max-h-[92vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2.5 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
          aria-label="Close share dialog"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center space-x-3 mb-5 pr-10">
          <div className="p-2.5 rounded-2xl bg-indigo-500/15 text-indigo-400 border border-indigo-500/20">
            <Share2 className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base sm:text-lg font-bold text-white">Share Gallery</h3>
            <p className="text-xs text-slate-400">Invite friends and guests to view this collection</p>
          </div>
        </div>

        {/* Copy Link Input */}
        <div className="space-y-2 mb-5">
          <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Gallery Link</label>
          <div className="flex items-center space-x-2">
            <input
              type="text"
              readOnly
              value={galleryUrl}
              className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-slate-300 font-mono focus:outline-none select-all min-h-[44px]"
            />
            <button
              onClick={handleCopy}
              className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-xl flex items-center justify-center space-x-1.5 transition-colors shadow-lg shadow-indigo-600/20 min-h-[44px]"
            >
              {copied ? (
                <>
                  <Check className="w-4 h-4 text-emerald-300" />
                  <span>Copied</span>
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4" />
                  <span>Copy</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="grid grid-cols-3 gap-2 sm:gap-2.5 mb-5">
          {typeof navigator !== 'undefined' && typeof navigator.share === 'function' && (
            <button
              onClick={handleNativeShare}
              className="p-3 bg-slate-800 hover:bg-slate-750 border border-slate-700/70 rounded-xl flex flex-col items-center justify-center space-y-1.5 text-xs font-medium text-slate-200 transition-colors min-h-[48px]"
            >
              <Share2 className="w-4 h-4 text-indigo-400" />
              <span>Share</span>
            </button>
          )}

          <a
            href={whatsappUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="p-3 bg-slate-800 hover:bg-slate-750 border border-slate-700/70 rounded-xl flex flex-col items-center justify-center space-y-1.5 text-xs font-medium text-slate-200 transition-colors min-h-[48px]"
          >
            <MessageCircle className="w-4 h-4 text-emerald-400" />
            <span>WhatsApp</span>
          </a>

          <a
            href={mailUrl}
            className="p-3 bg-slate-800 hover:bg-slate-750 border border-slate-700/70 rounded-xl flex flex-col items-center justify-center space-y-1.5 text-xs font-medium text-slate-200 transition-colors min-h-[48px]"
          >
            <Mail className="w-4 h-4 text-sky-400" />
            <span>Email</span>
          </a>

          <button
            onClick={() => setShowQr(!showQr)}
            className="p-3 bg-slate-800 hover:bg-slate-750 border border-slate-700/70 rounded-xl flex flex-col items-center justify-center space-y-1.5 text-xs font-medium text-slate-200 transition-colors min-h-[48px]"
          >
            <QrCode className="w-4 h-4 text-violet-400" />
            <span>{showQr ? 'Hide QR' : 'QR Code'}</span>
          </button>
        </div>

        {/* QR Code Section */}
        {showQr && (
          <div className="p-4 bg-slate-950 border border-slate-800 rounded-2xl flex flex-col items-center justify-center animate-in zoom-in-95 duration-200">
            <div className="p-3 bg-white rounded-xl shadow-md mb-2">
              <img src={qrCodeImageUrl} alt="Gallery QR Code" className="w-40 h-40 sm:w-44 sm:h-44 object-contain" />
            </div>
            <p className="text-[11px] text-slate-400">Scan with a phone camera to view</p>
          </div>
        )}
      </div>
    </div>
  );
};
