'use client';

import React, { useState, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  ShieldCheck,
  KeyRound,
  Lock,
  ArrowRight,
  AlertTriangle,
  RefreshCw,
  HelpCircle,
} from 'lucide-react';
import { fetchApi } from '@/lib/api-client';

function AdminMfaContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const tempToken = searchParams.get('temp_token') || '';
  const returnTo = searchParams.get('returnTo') || '/dashboard/admin';

  const [code, setCode] = useState('');
  const [useRecoveryCode, setUseRecoveryCode] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      const res: any = await fetchApi<any>('/api/admin/auth/mfa/verify', {
        method: 'POST',
        body: JSON.stringify({
          temp_token: tempToken,
          mfa_code: code.trim(),
          is_recovery_code: useRecoveryCode,
        }),
      });

      if (res && res.success) {
        // Successfully verified MFA
        router.push(decodeURIComponent(returnTo));
      } else {
        setError(res?.error?.message || res?.message || 'Invalid authentication code.');
      }
    } catch (err: any) {
      setError(err?.message || 'MFA verification failed. Please check your code and try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col justify-center items-center px-4 py-12 bg-slate-950 text-slate-100 relative overflow-hidden font-sans">
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#1e293b15_1px,transparent_1px),linear-gradient(to_bottom,#1e293b15_1px,transparent_1px)] bg-[size:4rem_4rem]" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_60%_50%_at_50%_0%,rgba(239,68,68,0.15),rgba(255,255,255,0))]" />

      <div className="w-full max-w-md relative space-y-6 z-10">
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center p-3 rounded-2xl bg-gradient-to-tr from-red-600 to-rose-500 text-white shadow-xl shadow-red-500/20 mb-2 ring-1 ring-red-500/30">
            <KeyRound className="h-8 w-8" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-white">Two-Factor Authentication</h1>
          <p className="text-sm text-slate-400">
            {useRecoveryCode
              ? 'Enter one of your emergency 8-character backup recovery codes.'
              : 'Enter the 6-digit code from your authenticator app (Google Authenticator, 1Password, Authy).'}
          </p>
        </div>

        <div className="p-6 rounded-2xl bg-slate-900/90 border border-slate-800 shadow-2xl backdrop-blur-xl">
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="p-3 rounded-lg bg-red-950/50 border border-red-500/50 text-red-200 text-xs flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 shrink-0 text-red-400" />
                <span>{error}</span>
              </div>
            )}

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-slate-300">
                {useRecoveryCode ? 'Emergency Recovery Code' : '6-Digit TOTP Security Code'}
              </label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                <input
                  type="text"
                  required
                  autoFocus
                  maxLength={useRecoveryCode ? 16 : 6}
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  placeholder={useRecoveryCode ? 'XXXX-XXXX' : '000000'}
                  className="w-full pl-10 pr-4 py-3 rounded-xl bg-slate-950 border border-slate-800 focus:border-red-500 focus:ring-1 focus:ring-red-500 text-lg tracking-widest font-mono text-center text-white placeholder-slate-600 outline-none transition-all"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading || code.trim().length === 0}
              className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white text-sm font-semibold shadow-lg shadow-red-600/20 hover:shadow-red-600/30 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed group cursor-pointer"
            >
              {isLoading ? (
                <>
                  <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Validating Code...</span>
                </>
              ) : (
                <>
                  <span>Verify Identity</span>
                  <ArrowRight className="h-4 w-4 group-hover:translate-x-0.5 transition-transform" />
                </>
              )}
            </button>

            <div className="pt-2 border-t border-slate-800 text-center">
              <button
                type="button"
                onClick={() => {
                  setUseRecoveryCode(!useRecoveryCode);
                  setCode('');
                  setError(null);
                }}
                className="text-xs text-slate-400 hover:text-slate-200 transition-colors inline-flex items-center gap-1.5"
              >
                <HelpCircle className="h-3.5 w-3.5" />
                {useRecoveryCode ? 'Use 6-digit TOTP app code instead' : 'Lost your phone? Use a backup recovery code'}
              </button>
            </div>
          </form>
        </div>

        <div className="text-center">
          <Link href="/admin/login" className="text-xs text-slate-500 hover:text-slate-300 transition-colors">
            ← Cancel and return to Admin Login
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function AdminMfaPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-slate-950 text-slate-400">
          <div className="h-6 w-6 border-2 border-red-500/30 border-t-red-500 rounded-full animate-spin" />
        </div>
      }
    >
      <AdminMfaContent />
    </Suspense>
  );
}
