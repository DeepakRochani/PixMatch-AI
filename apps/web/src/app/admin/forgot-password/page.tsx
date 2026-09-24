'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Mail, ArrowRight, ShieldCheck, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { fetchApi } from '@/lib/api-client';

export default function AdminForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      await fetchApi<any>('/api/admin/auth/forgot-password', {
        method: 'POST',
        body: JSON.stringify({ email: email.trim() }),
      });
      setSubmitted(true);
    } catch (err: any) {
      setError(err?.message || 'Password reset request failed. Please try again.');
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
            <Mail className="h-8 w-8" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-white">Reset Admin Password</h1>
          <p className="text-sm text-slate-400">
            Enter your platform administrator email to receive secure one-time reset instructions.
          </p>
        </div>

        <div className="p-6 rounded-2xl bg-slate-900/90 border border-slate-800 shadow-2xl backdrop-blur-xl">
          {submitted ? (
            <div className="space-y-4 text-center py-3">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-400">
                <CheckCircle2 className="h-6 w-6" />
              </div>
              <div className="space-y-2">
                <h3 className="text-base font-semibold text-white">Instructions Dispatched</h3>
                <p className="text-xs text-slate-400 leading-relaxed">
                  If the administrator account exists and holds platform privileges, a secure single-use link has been sent to your registered email address.
                </p>
              </div>
              <div className="pt-2">
                <Link
                  href="/admin/login"
                  className="inline-flex items-center gap-1.5 text-xs font-medium text-red-400 hover:text-red-300"
                >
                  ← Return to Admin Login
                </Link>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div className="p-3 rounded-lg bg-red-950/50 border border-red-500/50 text-red-200 text-xs flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 shrink-0 text-red-400" />
                  <span>{error}</span>
                </div>
              )}

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-slate-300">Administrator Email</label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="admin@pixmatch.ai"
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 focus:border-red-500 focus:ring-1 focus:ring-red-500 text-sm text-white placeholder-slate-600 outline-none transition-all"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading || !email}
                className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white text-sm font-semibold shadow-lg shadow-red-600/20 hover:shadow-red-600/30 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed group cursor-pointer"
              >
                {isLoading ? (
                  <>
                    <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>Processing Request...</span>
                  </>
                ) : (
                  <>
                    <span>Send Reset Instructions</span>
                    <ArrowRight className="h-4 w-4 group-hover:translate-x-0.5 transition-transform" />
                  </>
                )}
              </button>

              <div className="text-center pt-2">
                <Link href="/admin/login" className="text-xs text-slate-400 hover:text-slate-200 transition-colors">
                  ← Back to Administrator Login
                </Link>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
