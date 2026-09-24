'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { fetchApi } from '@/lib/api-client';
import { formatBytes, formatDate } from '@pixmatch/ui';
import {
  ShieldAlert,
  Building2,
  Users,
  Images,
  HardDrive,
  Activity,
  CheckCircle2,
  TrendingUp,
} from 'lucide-react';

export default function SuperAdminOverviewPage() {
  const [data, setData] = useState<any>({
    stats: {
      totalStudios: 2,
      totalUsers: 3,
      totalGalleries: 3,
      totalPhotos: 124,
      globalStorageUsedBytes: 1420000000,
      systemHealth: 'OPERATIONAL',
      uptime: 14200,
    },
    recentStudios: [
      {
        id: 'std-1',
        name: 'Lumière Studios',
        slug: 'lumiere-studios',
        plan: 'PRO',
        gallery_count: 2,
        photo_count: 84,
        member_count: 2,
        created_at: new Date().toISOString(),
      },
      {
        id: 'std-2',
        name: 'Apex Portraiture Studio',
        slug: 'apex-portraiture',
        plan: 'STARTER',
        gallery_count: 1,
        photo_count: 40,
        member_count: 1,
        created_at: new Date().toISOString(),
      },
    ],
  });

  useEffect(() => {
    async function loadStats() {
      const res = await fetchApi('/admin/stats');
      if (res.success && res.data) {
        setData(res.data);
      }
    }
    loadStats();
  }, []);

  return (
    <div className="flex-1 flex flex-col min-h-screen">
      <header className="h-16 border-b border-card-border bg-card/60 backdrop-blur-md px-6 flex items-center justify-between sticky top-0 z-40">
        <div>
          <h1 className="text-lg font-bold text-white tracking-tight flex items-center gap-2">
            <ShieldAlert className="h-5 w-5 text-amber-400" /> Super Admin Platform Control
          </h1>
          <p className="text-xs text-muted -mt-0.5">Global tenant oversight and system telemetry</p>
        </div>

        <div className="flex items-center gap-2">
          <span className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-xs font-bold">
            <CheckCircle2 className="h-3.5 w-3.5" /> All Systems Nominal
          </span>
        </div>
      </header>

      <main className="flex-1 p-6 sm:p-8 space-y-8 max-w-7xl">
        {/* Global Metric Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-6 rounded-2xl bg-card border border-card-border space-y-2">
            <div className="flex items-center justify-between text-muted">
              <span className="text-xs font-semibold">Total Studio Tenants</span>
              <Building2 className="h-4 w-4 text-primary" />
            </div>
            <p className="text-3xl font-extrabold text-white">{data.stats.totalStudios}</p>
            <p className="text-[11px] text-muted">Active photographer organizations</p>
          </div>

          <div className="p-6 rounded-2xl bg-card border border-card-border space-y-2">
            <div className="flex items-center justify-between text-muted">
              <span className="text-xs font-semibold">Global Users</span>
              <Users className="h-4 w-4 text-purple-400" />
            </div>
            <p className="text-3xl font-extrabold text-white">{data.stats.totalUsers}</p>
            <p className="text-[11px] text-muted">Registered platform accounts</p>
          </div>

          <div className="p-6 rounded-2xl bg-card border border-card-border space-y-2">
            <div className="flex items-center justify-between text-muted">
              <span className="text-xs font-semibold">Global Galleries</span>
              <Images className="h-4 w-4 text-emerald-400" />
            </div>
            <p className="text-3xl font-extrabold text-white">{data.stats.totalGalleries}</p>
            <p className="text-[11px] text-muted">Delivered collections</p>
          </div>

          <div className="p-6 rounded-2xl bg-card border border-card-border space-y-2">
            <div className="flex items-center justify-between text-muted">
              <span className="text-xs font-semibold">Global Storage Consumed</span>
              <HardDrive className="h-4 w-4 text-amber-400" />
            </div>
            <p className="text-3xl font-extrabold text-white">{formatBytes(data.stats.globalStorageUsedBytes)}</p>
            <p className="text-[11px] text-muted">Across all storage clusters</p>
          </div>
        </div>

        {/* Studio Tenant Directory */}
        <div className="rounded-2xl bg-card border border-card-border overflow-hidden space-y-0">
          <div className="p-6 border-b border-card-border flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-white">Registered Studio Tenants</h3>
              <p className="text-xs text-muted">Inspect isolation boundaries and subscriber usage</p>
            </div>
            <Link
              href="/admin/studios"
              className="text-xs font-semibold text-primary hover:underline"
            >
              View all tenants →
            </Link>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-card-border bg-background/50 text-xs font-semibold text-muted uppercase tracking-wider">
                <tr>
                  <th className="p-4 pl-6">Studio Name</th>
                  <th className="p-4">Tenant Identifier</th>
                  <th className="p-4">Subscription Plan</th>
                  <th className="p-4">Galleries</th>
                  <th className="p-4">Photos</th>
                  <th className="p-4 pr-6">Created</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-card-border text-xs">
                {data.recentStudios.map((s: any) => (
                  <tr key={s.id} className="hover:bg-card-border/20 transition">
                    <td className="p-4 pl-6 font-semibold text-white">
                      <div className="flex items-center gap-3">
                        <div className="h-8 w-8 rounded-lg bg-primary/20 text-primary flex items-center justify-center font-bold">
                          {s.name.charAt(0)}
                        </div>
                        <span>{s.name}</span>
                      </div>
                    </td>
                    <td className="p-4 font-mono text-muted">{s.slug}</td>
                    <td className="p-4">
                      <span className="px-2.5 py-1 rounded-full bg-primary/10 text-primary font-bold border border-primary/20">
                        {s.plan}
                      </span>
                    </td>
                    <td className="p-4 text-white font-semibold">{s.gallery_count}</td>
                    <td className="p-4 text-white font-semibold">{s.photo_count}</td>
                    <td className="p-4 pr-6 text-muted">{formatDate(s.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  );
}
