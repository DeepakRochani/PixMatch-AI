'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Camera, Lock, Mail, ArrowRight, ShieldAlert, Sparkles, Building } from 'lucide-react';
import { useAuth } from '@/lib/auth-context';

export default function LoginPage() {
  const router = useRouter();
  const { login, isLoading } = useAuth();
  const [email, setEmail] = useState('alex@lumiere.com');
  const [password, setPassword] = useState('Password123!');
  const [error, setError] = useState<string | null>(null);

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
            <Sparkles className="h-3.5 w-3.5 text-accent" /> One-Click Role Sign In
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
        <form onSubmit={handleSubmit} className="p-8 rounded-2xl bg-card border border-card-border space-y-5 shadow-2xl">
          {error && (
            <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-xs text-red-400 font-medium">
              {error}
            </div>
          )}

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
            disabled={isLoading}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-primary hover:bg-primary-hover text-white font-semibold transition shadow-lg shadow-primary/25 disabled:opacity-50 text-sm"
          >
            {isLoading ? 'Signing In...' : 'Sign In'}
            <ArrowRight className="h-4 w-4" />
          </button>

          <p className="text-center text-xs text-muted">
            Don&apos;t have a studio workspace?{' '}
            <Link href="/register" className="text-primary hover:underline font-medium">
              Register Studio
            </Link>
          </p>
        </form>
      </div>
    </div>
  );
}
