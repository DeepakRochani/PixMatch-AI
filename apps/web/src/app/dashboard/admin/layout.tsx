'use client';

import React from 'react';
import { useAuth } from '@/lib/auth-context';
import { AdminSidebar } from '@/components/layout/AdminSidebar';
import { AdminHeader } from '@/components/layout/AdminHeader';
import { ShieldAlert, ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { UserRole } from '@pixmatch/types';

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#070A0F] text-white">
        <div className="flex flex-col items-center gap-4">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-amber-500 border-t-transparent shadow-lg shadow-amber-500/20" />
          <p className="text-xs font-semibold text-muted tracking-wider uppercase">
            Verifying Super Admin Authorization...
          </p>
        </div>
      </div>
    );
  }

  const isPlatformRole = [
    UserRole.SUPER_ADMIN,
    UserRole.PLATFORM_ADMIN,
    UserRole.PLATFORM_SUPPORT,
    UserRole.PLATFORM_FINANCE,
    UserRole.PLATFORM_OPERATIONS,
    UserRole.PLATFORM_SECURITY,
    UserRole.PLATFORM_ANALYST,
    UserRole.PLATFORM_VIEWER,
  ].includes(user?.role as any);

  if (!isPlatformRole) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#070A0F] p-4">
        <div className="max-w-md w-full rounded-2xl bg-[#0E1422] border border-red-500/30 p-8 text-center space-y-6 shadow-2xl">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-red-500/10 border border-red-500/30 text-red-400">
            <ShieldAlert className="h-8 w-8" />
          </div>
          <div className="space-y-2">
            <h2 className="text-xl font-bold text-white tracking-tight">Platform Admin Privileges Required</h2>
            <p className="text-xs text-muted leading-relaxed">
              Access to the Platform Admin Operations & Governance Center is restricted to authorized platform personnel. Your current role is{' '}
              <span className="font-semibold text-white px-2 py-0.5 rounded bg-card-border">{user?.role || 'GUEST'}</span>.
            </p>
          </div>
          <div className="pt-2 flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              href="/dashboard"
              className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-card-border hover:bg-card-border/80 text-xs font-semibold text-white transition"
            >
              <ArrowLeft className="h-4 w-4" /> Return to Studio Dashboard
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-[#070A0F] text-foreground">
      <AdminSidebar />
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        <AdminHeader />
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 space-y-6">
          {children}
        </main>
      </div>
    </div>
  );
}
