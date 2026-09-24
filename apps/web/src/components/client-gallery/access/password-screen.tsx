'use client';

import React, { useState } from 'react';
import { Lock, ArrowRight, Loader2, ShieldCheck, Building2 } from 'lucide-react';

interface PasswordScreenProps {
  galleryTitle?: string;
  studioName?: string;
  studioLogoUrl?: string | null;
  onVerify: (password: string) => Promise<boolean>;
  error?: string | null;
}

export const PasswordScreen: React.FC<PasswordScreenProps> = ({
  galleryTitle = 'Private Gallery',
  studioName = 'Photography Studio',
  studioLogoUrl,
  onVerify,
  error: initialError,
}) => {
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(initialError || null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password.trim()) {
      setError('Please enter the gallery access password or PIN');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const success = await onVerify(password);
      if (!success) {
        setError('Incorrect password. Please verify with the event host or photographer.');
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Authentication failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-center items-center px-4 pt-safe pb-safe relative overflow-hidden selection:bg-indigo-500 selection:text-white">
      {/* Background ambient glow */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 left-1/2 -translate-x-1/2 translate-y-1/2 w-96 h-96 bg-violet-600/10 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-md bg-slate-900/90 backdrop-blur-xl border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl relative z-10 text-center">
        {/* Studio Branding */}
        <div className="flex items-center justify-center space-x-2 text-xs uppercase tracking-widest text-slate-400 font-medium mb-6">
          {studioLogoUrl ? (
            <img src={studioLogoUrl} alt={studioName} className="h-6 w-auto object-contain rounded" />
          ) : (
            <Building2 className="w-4 h-4 text-indigo-400" />
          )}
          <span className="truncate max-w-[200px]">{studioName}</span>
        </div>

        <div className="w-14 h-14 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center mx-auto mb-4">
          <Lock className="w-7 h-7" />
        </div>

        <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white mb-2">{galleryTitle}</h1>
        <p className="text-xs sm:text-sm text-slate-400 mb-6">
          This client collection is password protected. Enter the PIN or password provided by the host.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="relative">
            <input
              type="password"
              placeholder="Enter PIN or Password"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                if (error) setError(null);
              }}
              autoFocus
              className="w-full px-4 py-3.5 bg-slate-950/80 border border-slate-700 rounded-2xl text-center text-lg tracking-wider placeholder:tracking-normal placeholder:text-xs sm:placeholder:text-sm placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all text-white min-h-[48px]"
            />
          </div>

          {error && (
            <div className="p-3 bg-red-950/60 border border-red-500/30 rounded-xl text-red-300 text-xs font-medium animate-in fade-in">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white font-semibold rounded-2xl shadow-lg shadow-indigo-600/20 flex items-center justify-center space-x-2 transition-all disabled:opacity-50 min-h-[48px]"
          >
            {loading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                <span>Unlocking...</span>
              </>
            ) : (
              <>
                <span>View Photos</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        <div className="mt-8 pt-6 border-t border-slate-800/80 flex items-center justify-center space-x-2 text-[11px] text-slate-500">
          <ShieldCheck className="w-3.5 h-3.5 text-slate-400" />
          <span>Secured by PixMatch AI Client Gallery</span>
        </div>
      </div>
    </div>
  );
};

