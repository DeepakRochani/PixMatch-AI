'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Camera, Lock, Mail, User, Building, ArrowRight } from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import { fetchApi } from '@/lib/api-client';

export default function RegisterPage() {
  const router = useRouter();
  const { setAuthSession } = useAuth();
  const [name, setName] = useState('');
  const [studioName, setStudioName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const res = await fetchApi('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ name, studioName, email, password }),
    });

    if (res.success && res.data) {
      setAuthSession(res.data.user, res.data.studio, res.data.token);
      router.push('/dashboard');
    } else {
      setError(res.error?.message || 'Registration failed');
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex flex-col justify-center items-center px-4 py-12 bg-background relative overflow-hidden">
      <div className="w-full max-w-md relative space-y-8">
        <div className="text-center space-y-2">
          <Link href="/" className="inline-flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-tr from-primary to-accent text-white shadow-xl shadow-primary/20">
              <Camera className="h-6 w-6" />
            </div>
          </Link>
          <h1 className="text-2xl font-bold text-white tracking-tight">Create Studio Workspace</h1>
          <p className="text-sm text-muted">Join PixMatch AI and elevate your client experience</p>
        </div>

        <form onSubmit={handleSubmit} className="p-8 rounded-2xl bg-card border border-card-border space-y-4 shadow-2xl">
          {error && (
            <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-xs text-red-400 font-medium">
              {error}
            </div>
          )}

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-muted">Your Name</label>
            <div className="relative">
              <User className="absolute left-3.5 top-3 h-4 w-4 text-muted" />
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Elena Rostova"
                className="w-full pl-10 pr-4 py-2.5 rounded-lg bg-background border border-card-border text-sm text-white placeholder-muted focus:outline-none focus:border-primary transition"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-muted">Studio / Business Name</label>
            <div className="relative">
              <Building className="absolute left-3.5 top-3 h-4 w-4 text-muted" />
              <input
                type="text"
                required
                value={studioName}
                onChange={(e) => setStudioName(e.target.value)}
                placeholder="Rostova Fine Art Photography"
                className="w-full pl-10 pr-4 py-2.5 rounded-lg bg-background border border-card-border text-sm text-white placeholder-muted focus:outline-none focus:border-primary transition"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-muted">Email Address</label>
            <div className="relative">
              <Mail className="absolute left-3.5 top-3 h-4 w-4 text-muted" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="elena@rostovaphoto.com"
                className="w-full pl-10 pr-4 py-2.5 rounded-lg bg-background border border-card-border text-sm text-white placeholder-muted focus:outline-none focus:border-primary transition"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-muted">Password</label>
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
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-primary hover:bg-primary-hover text-white font-semibold transition shadow-lg shadow-primary/25 disabled:opacity-50 text-sm mt-2"
          >
            {loading ? 'Creating Workspace...' : 'Create Studio Account'}
            <ArrowRight className="h-4 w-4" />
          </button>

          <p className="text-center text-xs text-muted pt-2">
            Already have an account?{' '}
            <Link href="/login" className="text-primary hover:underline font-medium">
              Sign In
            </Link>
          </p>
        </form>
      </div>
    </div>
  );
}
