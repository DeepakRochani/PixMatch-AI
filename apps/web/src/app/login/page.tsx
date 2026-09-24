'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Camera, Lock, Mail, ArrowRight, Sparkles } from 'lucide-react';
import { useAuth } from '@/lib/auth-context';

export default function LoginPage() {
  const router = useRouter();
  const { login, loginWithGoogle, isLoading } = useAuth();
  const [email, setEmail] = useState('alex@lumiere.com');
  const [password, setPassword] = useState('Password123!');
  const [error, setError] = useState<string | null>(null);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const res = await login(email, password);
    if (res.success) {
      if (email === 'admin@pixmatch.ai') {
        router.push('/admin');
      } else {
        router.push('/dashboard');
      }
    } else {
      setError(res.error || 'Invalid credentials');
    }
  };

  const handleGoogleSignIn = async () => {
    setError(null);
    setIsGoogleLoading(true);
    const res = await loginWithGoogle();
    setIsGoogleLoading(false);
    if (res.success) {
      router.push('/dashboard');
    } else {
      setError(res.error || 'Google sign in failed');
    }
  };

  const handleQuickLogin = (role: 'owner' | 'admin' | 'tenant2') => {
    if (role === 'owner') {
      setEmail('alex@lumiere.com');
      setPassword('Password123!');
    } else if (role === 'admin') {
      setEmail('admin@pixmatch.ai');
      setPassword('Password123!');
    } else if (role === 'tenant2') {
      setEmail('marcus@apexphotos.com');
      setPassword('Password123!');
    }
  };

  return (
    <div className="min-h-screen flex flex-col justify-center items-center px-4 py-12 bg-background relative overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_60%_60%_at_50%_30%,rgba(59,130,246,0.1),rgba(255,255,255,0))]" />

      <div className="w-full max-w-md relative space-y-8">
        <div className="text-center space-y-2">
          <Link href="/" className="inline-flex items-center gap-3 group">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-tr from-primary to-accent text-white shadow-xl shadow-primary/20">
              <Camera className="h-6 w-6" />
            </div>
          </Link>
          <h1 className="text-2xl font-bold text-white tracking-tight">Welcome to PixMatch AI</h1>
          <p className="text-sm text-muted">Sign in to your studio workspace</p>
        </div>

        {/* Demo Quick Select Buttons */}
        <div className="p-4 rounded-xl bg-card border border-card-border space-y-2.5">
          <p className="text-xs font-semibold text-muted uppercase tracking-wider flex items-center gap-1.5">
            <Sparkles className="h-3.5 w-3.5 text-accent" /> One-Click Demo Sign In
          </p>
          <div className="grid grid-cols-3 gap-2">
            <button
              type="button"
              onClick={() => handleQuickLogin('owner')}
              className={`p-2 rounded-lg border text-xs font-medium transition text-center ${
                email === 'alex@lumiere.com'
                  ? 'bg-primary/20 border-primary text-white font-semibold'
                  : 'border-card-border text-muted hover:text-white hover:bg-card-border/30'
              }`}
            >
              Studio Owner
            </button>
            <button
              type="button"
              onClick={() => handleQuickLogin('admin')}
              className={`p-2 rounded-lg border text-xs font-medium transition text-center ${
                email === 'admin@pixmatch.ai'
                  ? 'bg-amber-500/20 border-amber-500/40 text-amber-300 font-semibold'
                  : 'border-card-border text-muted hover:text-white hover:bg-card-border/30'
              }`}
            >
              Super Admin
            </button>
            <button
              type="button"
              onClick={() => handleQuickLogin('tenant2')}
              className={`p-2 rounded-lg border text-xs font-medium transition text-center ${
                email === 'marcus@apexphotos.com'
                  ? 'bg-primary/20 border-primary text-white font-semibold'
                  : 'border-card-border text-muted hover:text-white hover:bg-card-border/30'
              }`}
            >
              Tenant 2
            </button>
          </div>
        </div>

        {/* Login Form */}
        <div className="p-8 rounded-2xl bg-card border border-card-border space-y-5 shadow-2xl">
          {error && (
            <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-xs text-red-400 font-medium">
              {error}
            </div>
          )}

          {/* Google Sign In Button */}
          <button
            type="button"
            onClick={handleGoogleSignIn}
            disabled={isGoogleLoading || isLoading}
            className="w-full flex items-center justify-center gap-3 py-3 px-4 rounded-xl bg-white hover:bg-slate-100 text-slate-800 font-semibold transition shadow-md disabled:opacity-60 text-sm border border-slate-200"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
              />
            </svg>
            {isGoogleLoading ? 'Connecting to Google...' : 'Sign in with Google'}
          </button>

          <div className="relative flex items-center justify-center my-4">
            <div className="border-t border-card-border w-full" />
            <span className="bg-card px-3 text-xs text-muted uppercase tracking-wider">or with email</span>
            <div className="border-t border-card-border w-full" />
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted">Email Address</label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-3 h-4 w-4 text-muted" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@studio.com"
                  className="w-full pl-10 pr-4 py-2.5 rounded-lg bg-background border border-card-border text-sm text-white placeholder-muted focus:outline-none focus:border-primary transition"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <div className="flex justify-between items-center">
                <label className="text-xs font-semibold text-muted">Password</label>
                <a href="#" className="text-xs text-primary hover:underline">Forgot?</a>
              </div>
              <div className="relative">
                <Lock className="absolute left-3.5 top-3 h-4 w-4 text-muted" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-10 pr-4 py-2.5 rounded-lg bg-background border border-card-border text-sm text-white placeholder-muted focus:outline-none focus:border-primary transition"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading || isGoogleLoading}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-primary hover:bg-primary-hover text-white font-semibold transition shadow-lg shadow-primary/25 disabled:opacity-50 text-sm"
            >
              {isLoading ? 'Signing In...' : 'Sign In with Email'}
              <ArrowRight className="h-4 w-4" />
            </button>
          </form>

          <p className="text-center text-xs text-muted pt-2">
            Don&apos;t have a studio workspace?{' '}
            <Link href="/register" className="text-primary hover:underline font-medium">
              Register Studio
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
