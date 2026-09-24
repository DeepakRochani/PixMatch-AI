'use client';

import React from 'react';
import Link from 'next/link';
import { Camera, Sparkles, ArrowRight } from 'lucide-react';
import { useAuth } from '@/lib/auth-context';

export function Navbar() {
  const { user } = useAuth();

  return (
    <header className="sticky top-0 z-50 w-full border-b border-card-border bg-background/80 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <Link href="/" className="flex items-center gap-3 group">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-tr from-primary to-accent text-white shadow-lg shadow-primary/20 group-hover:scale-105 transition-transform">
            <Camera className="h-5 w-5" />
          </div>
          <div className="flex flex-col">
            <span className="text-lg font-bold tracking-tight text-white flex items-center gap-1.5">
              PixMatch <span className="text-primary text-xs font-semibold px-1.5 py-0.5 rounded bg-primary/10 border border-primary/20">AI</span>
            </span>
            <span className="text-[10px] text-muted -mt-1 tracking-wider uppercase">Photo Delivery SaaS</span>
          </div>
        </Link>

        <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-muted">
          <Link href="#features" className="hover:text-white transition-colors">Features</Link>
          <Link href="#workflow" className="hover:text-white transition-colors">How It Works</Link>
          <Link href="/pricing" className="hover:text-white transition-colors">Pricing</Link>
          <Link href="/gallery/sophia-and-liam-wedding" className="text-accent hover:text-accent/80 transition-colors flex items-center gap-1">
            <Sparkles className="h-3.5 w-3.5" /> Demo Gallery
          </Link>
        </nav>

        <div className="flex items-center gap-3">
          {user ? (
            <Link
              href={user.role === 'SUPER_ADMIN' ? '/admin' : '/dashboard'}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-primary hover:bg-primary-hover rounded-lg transition shadow-md shadow-primary/25"
            >
              Open Dashboard
              <ArrowRight className="h-4 w-4" />
            </Link>
          ) : (
            <>
              <Link
                href="/login"
                className="px-4 py-2 text-sm font-medium text-muted hover:text-white transition"
              >
                Sign In
              </Link>
              <Link
                href="/register"
                className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-primary hover:bg-primary-hover rounded-lg transition shadow-md shadow-primary/25"
              >
                Get Started
                <ArrowRight className="h-4 w-4" />
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
