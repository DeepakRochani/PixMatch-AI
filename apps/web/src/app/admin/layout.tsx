'use client';

import React from 'react';
import { AdminSidebar } from '@/components/layout/AdminSidebar';
import { useAuth } from '@/lib/auth-context';
import Link from 'next/link';
import { ShieldAlert, ArrowLeft } from 'lucide-react';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();

  // Guard: Must be SUPER_ADMIN
  if (user && user.role !== 'SUPER_ADMIN') {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <div className="p-8 rounded-2xl bg-card border border-red-500/30 max-w-md text-center space-y-4 shadow-2xl">
          <div className="h-12 w-12 rounded-2xl bg-red-500/10 text-red-400 border border-red-500/20 flex items-center justify-center mx-auto">
            <ShieldAlert className="h-6 w-6" />
          </div>
          <h2 className="text-lg font-bold text-white">Super Admin Access Required</h2>
          <p className="text-xs text-muted">
            Your current account ({user.email}) has role <span className="text-white font-semibold">{user.role}</span> and is not authorized to access platform administration.
          </p>
          <div className="pt-2">
            <Link
              href="/dashboard"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-white text-xs font-semibold hover:bg-primary-hover transition"
            >
              <ArrowLeft className="h-3.5 w-3.5" /> Return to Studio Dashboard
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col md:flex-row">
      <AdminSidebar />
      <div className="flex-1 flex flex-col min-w-0">
        {children}
      </div>
    </div>
  );
}
