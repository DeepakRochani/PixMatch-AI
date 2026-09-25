'use client';

import React, { useState, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  ShieldAlert,
  ShieldCheck,
  Lock,
  Mail,
  ArrowRight,
  Eye,
  EyeOff,
  AlertTriangle,
  KeyRound,
  Fingerprint,
} from 'lucide-react';
import { fetchApi } from '@/lib/api-client';

function AdminLoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const returnTo = searchParams.get('returnTo') || '/dashboard/admin';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Validate redirect target (Anti-Open-Redirect)
  const sanitizeReturnTo = (url: string): string => {
    if (!url || typeof url !== 'string') return '/dashboard/admin';
    if (url.startsWith('//') || url.startsWith('http://') || url.startsWith('https://') || url.startsWith('javascript:')) {
      return '/dashboard/admin';
    }
    if (url.startsWith('/dashboard/admin') || url.startsWith('/admin')) {
      return url;
    }
    return '/dashboard/admin';
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      const res: any = await fetchApi<any>('/api/admin/auth/login', {
        method: 'POST',
        body: JSON.stringify({
          email: email.trim(),
          password,
          remember_me: rememberMe,
        }),
      });

      if (res && res.success) {
        if (res.mfa_required || res.data?.mfa_required) {
          // Redirect to MFA verification with temp token
          const tempToken = res.temp_token || res.data?.temp_token || '';
          const safeTarget = encodeURIComponent(sanitizeReturnTo(returnTo));
          router.push(`/admin/mfa?temp_token=${encodeURIComponent(tempToken)}&returnTo=${safeTarget}`);
        } else {
          // Store session token in localStorage as well for Bearer fallback
          const sessionToken = res.session_token || res.data?.session_token;
          if (sessionToken) {
            localStorage.setItem('pixmatch_admin_token', sessionToken);
          }
          router.push(sanitizeReturnTo(returnTo));
        }
      } else {
        setError(res?.error?.message || res?.message || 'Invalid administrator credentials.');
      }
    } catch (err: any) {
      setError(err?.message || 'Administrator authentication service unavailable.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleQuickSelect = (role: 'superadmin' | 'security' | 'support') => {
    if (role === 'superadmin') {
      setEmail('superadmin@pixmatch.ai');
      setPassword('Password123!');
    } else if (role === 'security') {
      setEmail('security@pixmatch.ai');
      setPassword('Password123!');
    } else if (role === 'support') {
      setEmail('support@pixmatch.ai');
      setPassword('Password123!');
    }
  };

  return (
    <div className="min-h-screen flex flex-col justify-center items-center px-4 py-12 bg-slate-950 text-slate-100 relative overflow-hidden font-sans">
      {/* Dynamic Grid Background */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#1e293b15_1px,transparent_1px),linear-gradient(to_bottom,#1e293b15_1px,transparent_1px)] bg-[size:4rem_4rem]" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_60%_50%_at_50%_0%,rgba(239,68,68,0.15),rgba(255,255,255,0))]" />

      <div className="w-full max-w-md relative space-y-6 z-10">
        {/* Header Branding */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center p-3 rounded-2xl bg-gradient-to-tr from-red-600 to-rose-500 text-white shadow-xl shadow-red-500/20 mb-2 ring-1 ring-red-500/30">
            <ShieldAlert className="h-8 w-8" />
          </div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-red-950/60 border border-red-500/30 text-red-400 text-xs font-semibold tracking-wide uppercase">
            <Fingerprint className="h-3.5 w-3.5" />
            Platform Admin Gateway
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-white">Platform Administration</h1>
          <p className="text-sm text-slate-400">Restricted zone for authorized PixMatch AI engineers & operators</p>
        </div>

        {/* Security Warning Notice */}
        <div className="p-3.5 rounded-xl bg-amber-950/30 border border-amber-500/30 text-amber-300 text-xs flex items-start gap-2.5">
          <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5 text-amber-400" />
          <p className="leading-relaxed">
            <strong className="font-semibold text-amber-200">Authorized Personnel Only:</strong> All access attempts are
            fingerprinted, rate-limited, and cryptographically logged.
          </p>
        </div>

        {/* Quick Demo Credentials Selector */}
        <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800 space-y-2">
          <div className="flex items-center justify-between text-xs text-slate-400 font-medium">
            <span>Demo Administrator Roles:</span>
            <span className="text-[10px] bg-slate-800 px-2 py-0.5 rounded text-slate-300">Phase 42 Ready</span>
          </div>
          <div className="grid grid-cols-3 gap-2">
            <button
              type="button"
              onClick={() => handleQuickSelect('superadmin')}
              className="px-2.5 py-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-800 border border-slate-700 text-xs font-medium text-slate-200 transition-colors text-center"
            >
              Super Admin
            </button>
            <button
              type="button"
              onClick={() => handleQuickSelect('security')}
              className="px-2.5 py-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-800 border border-slate-700 text-xs font-medium text-slate-200 transition-colors text-center"
            >
              Security
            </button>
            <button
              type="button"
              onClick={() => handleQuickSelect('support')}
              className="px-2.5 py-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-800 border border-slate-700 text-xs font-medium text-slate-200 transition-colors text-center"
            >
              Support
            </button>
          </div>
        </div>

        {/* Login Card */}
        <div className="p-6 rounded-2xl bg-slate-900/90 border border-slate-800 shadow-2xl backdrop-blur-xl">
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="p-3 rounded-lg bg-red-950/50 border border-red-500/50 text-red-200 text-xs flex items-center gap-2 animate-shake">
                <AlertTriangle className="h-4 w-4 shrink-0 text-red-400" />
                <span>{error}</span>
              </div>
            )}

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-slate-300">Admin Email Address</label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@pixmatch.ai"
                  autoComplete="username"
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 focus:border-red-500 focus:ring-1 focus:ring-red-500 text-sm text-white placeholder-slate-600 outline-none transition-all"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-medium text-slate-300">Admin Password</label>
                <Link
                  href="/admin/forgot-password"
                  className="text-xs text-red-400 hover:text-red-300 transition-colors font-medium"
                >
                  Forgot password?
                </Link>
              </div>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  autoComplete="current-password"
                  className="w-full pl-10 pr-10 py-2.5 rounded-xl bg-slate-950 border border-slate-800 focus:border-red-500 focus:ring-1 focus:ring-red-500 text-sm text-white placeholder-slate-600 outline-none transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between pt-1">
              <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-400 select-none">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="rounded bg-slate-950 border-slate-800 text-red-500 focus:ring-red-500 h-3.5 w-3.5"
                />
                Remember this workstation (7 days)
              </label>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white text-sm font-semibold shadow-lg shadow-red-600/20 hover:shadow-red-600/30 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed group cursor-pointer"
            >
              {isLoading ? (
                <>
                  <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Verifying Credentials...</span>
                </>
              ) : (
                <>
                  <span>Authenticate to Admin Portal</span>
                  <ArrowRight className="h-4 w-4 group-hover:translate-x-0.5 transition-transform" />
                </>
              )}
            </button>
          </form>
        </div>

        {/* Footer Link back to standard photographer login */}
        <div className="text-center">
          <p className="text-xs text-slate-500">
            Studio owner or photographer?{' '}
            <Link href="/login" className="text-slate-400 hover:text-slate-200 underline font-medium">
              Go to Standard Studio Login
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

export default function AdminLoginPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-slate-950 text-slate-400">
          <div className="h-6 w-6 border-2 border-red-500/30 border-t-red-500 rounded-full animate-spin" />
        </div>
      }
    >
      <AdminLoginContent />
    </Suspense>
  );
}
