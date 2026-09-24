'use client';

import React from 'react';
import { ShieldAlert, Building2, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

interface PrivateScreenProps {
  galleryTitle?: string;
  studioName?: string;
  studioLogoUrl?: string | null;
}

export const PrivateScreen: React.FC<PrivateScreenProps> = ({
  galleryTitle = 'Private Gallery',
  studioName = 'Photography Studio',
  studioLogoUrl,
}) => {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-center items-center px-4 relative overflow-hidden">
      <div className="w-full max-w-md bg-slate-900/80 backdrop-blur-xl border border-slate-800 rounded-2xl p-8 shadow-2xl relative z-10 text-center">
        <div className="flex items-center justify-center space-x-2 text-xs uppercase tracking-widest text-slate-400 font-semibold mb-6">
          {studioLogoUrl ? (
            <img src={studioLogoUrl} alt={studioName} className="h-6 w-auto object-contain rounded" />
          ) : (
            <Building2 className="w-4 h-4 text-indigo-400" />
          )}
          <span>{studioName}</span>
        </div>

        <div className="w-14 h-14 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-400 flex items-center justify-center mx-auto mb-4">
          <ShieldAlert className="w-7 h-7" />
        </div>

        <h1 className="text-2xl font-bold tracking-tight text-white mb-2">{galleryTitle}</h1>
        <p className="text-sm text-slate-400 mb-6">
          This gallery is currently set to Private by the photographer and is not open to public viewing.
        </p>

        <Link
          href="/"
          className="inline-flex items-center space-x-2 px-5 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-sm font-medium rounded-xl border border-slate-700 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Return Home</span>
        </Link>
      </div>
    </div>
  );
};
