'use client';

import React from 'react';
import Link from 'next/link';
import { Bell, Plus, ShieldAlert, Sparkles } from 'lucide-react';
import { useAuth } from '@/lib/auth-context';

export function DashboardHeader({ title, subtitle }: { title: string; subtitle?: string }) {
  const { user, studio } = useAuth();

  return (
    <header className="h-16 border-b border-card-border bg-card/60 backdrop-blur-md px-6 flex items-center justify-between sticky top-0 z-40">
      <div>
        <h1 className="text-lg font-bold text-white tracking-tight">{title}</h1>
        {subtitle && <p className="text-xs text-muted -mt-0.5">{subtitle}</p>}
      </div>

      <div className="flex items-center gap-4">
        {user?.role === 'SUPER_ADMIN' && (
          <Link
            href="/admin"
            className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold bg-amber-500/15 text-amber-400 border border-amber-500/30 rounded-lg hover:bg-amber-500/25 transition"
          >
            <ShieldAlert className="h-3.5 w-3.5" /> Super Admin
          </Link>
        )}

        <Link
          href="/dashboard/galleries/new"
          className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-white bg-primary hover:bg-primary-hover rounded-lg transition shadow-md shadow-primary/20"
        >
          <Plus className="h-4 w-4" />
          New Gallery
        </Link>

        <div className="h-6 w-px bg-card-border" />

        {/* User profile capsule */}
        <div className="flex items-center gap-3">
          <img
            src={user?.avatar_url || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80'}
            alt={user?.name || 'User'}
            className="h-8 w-8 rounded-full border border-card-border object-cover"
          />
          <div className="hidden sm:block text-left">
            <p className="text-xs font-semibold text-white line-clamp-1">{user?.name || 'Photographer'}</p>
            <p className="text-[10px] text-muted line-clamp-1">{studio?.name || 'Studio'}</p>
          </div>
        </div>
      </div>
    </header>
  );
}
