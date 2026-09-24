'use client';

import React from 'react';
import { Clock, Building2, Mail, ExternalLink } from 'lucide-react';

interface ExpiredScreenProps {
  galleryTitle?: string;
  studioName?: string;
  studioLogoUrl?: string | null;
  studioWebsite?: string | null;
}

export const ExpiredScreen: React.FC<ExpiredScreenProps> = ({
  galleryTitle = 'Gallery Expired',
  studioName = 'Photography Studio',
  studioLogoUrl,
  studioWebsite,
}) => {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-center items-center px-4 relative overflow-hidden">
      <div className="w-full max-w-md bg-slate-900/80 backdrop-blur-xl border border-slate-800 rounded-2xl p-8 shadow-2xl relative z-10 text-center">
        {/* Studio Branding */}
        <div className="flex items-center justify-center space-x-2 text-xs uppercase tracking-widest text-slate-400 font-semibold mb-6">
          {studioLogoUrl ? (
            <img src={studioLogoUrl} alt={studioName} className="h-6 w-auto object-contain rounded" />
          ) : (
            <Building2 className="w-4 h-4 text-amber-400" />
          )}
          <span>{studioName}</span>
        </div>

        <div className="w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center mx-auto mb-4">
          <Clock className="w-7 h-7" />
        </div>

        <h1 className="text-2xl font-bold tracking-tight text-white mb-2">{galleryTitle}</h1>
        <p className="text-sm text-slate-400 mb-6">
          The public viewing window for this photo collection has concluded. If you are the client or need archival access, please reach out to the studio.
        </p>

        {studioWebsite && (
          <a
            href={studioWebsite.startsWith('http') ? studioWebsite : `https://${studioWebsite}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center space-x-2 px-5 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-sm font-medium rounded-xl border border-slate-700 transition-colors"
          >
            <span>Contact {studioName}</span>
            <ExternalLink className="w-4 h-4" />
          </a>
        )}
      </div>
    </div>
  );
};
