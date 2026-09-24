'use client';

import React, { useState, useEffect } from 'react';
import { fetchApi } from '@/lib/api-client';
import { formatDate } from '@pixmatch/ui';
import { Building2, Search, ExternalLink, ShieldCheck } from 'lucide-react';

export default function AdminStudiosPage() {
  const [studios, setStudios] = useState<any[]>([
    {
      id: 'std-1',
      name: 'Lumière Studios',
      slug: 'lumiere-studios',
      website: 'https://lumiere.example.com',
      gallery_count: 2,
      photo_count: 84,
      member_count: 2,
      client_count: 2,
      created_at: new Date('2026-01-15').toISOString(),
    },
    {
      id: 'std-2',
      name: 'Apex Portraiture Studio',
      slug: 'apex-portraiture',
      website: 'https://apexphotos.example.com',
      gallery_count: 1,
      photo_count: 40,
      member_count: 1,
      client_count: 0,
      created_at: new Date('2026-02-10').toISOString(),
    },
  ]);

  useEffect(() => {
    async function load() {
      const res = await fetchApi('/admin/studios');
      if (res.success && res.data) {
        setStudios(res.data);
      }
    }
    load();
  }, []);

  return (
    <div className="flex-1 flex flex-col min-h-screen">
      <header className="h-16 border-b border-card-border bg-card/60 backdrop-blur-md px-6 flex items-center justify-between sticky top-0 z-40">
        <div>
          <h1 className="text-lg font-bold text-white tracking-tight">Studio Tenants</h1>
          <p className="text-xs text-muted">Manage all registered multi-tenant studio organizations</p>
        </div>
      </header>

      <main className="flex-1 p-6 sm:p-8 space-y-6 max-w-7xl">
        <div className="rounded-2xl bg-card border border-card-border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-card-border bg-background/50 text-xs font-semibold text-muted uppercase tracking-wider">
                <tr>
                  <th className="p-4 pl-6">Studio Name</th>
                  <th className="p-4">Slug / Tenant ID</th>
                  <th className="p-4">Website</th>
                  <th className="p-4">Members</th>
                  <th className="p-4">Galleries</th>
                  <th className="p-4">Photos</th>
                  <th className="p-4 pr-6">Joined</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-card-border text-xs">
                {studios.map((s) => (
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
                    <td className="p-4 text-primary">
                      {s.website ? (
                        <a href={s.website} target="_blank" className="hover:underline flex items-center gap-1">
                          {s.website.replace('https://', '')} <ExternalLink className="h-3 w-3" />
                        </a>
                      ) : (
                        '—'
                      )}
                    </td>
                    <td className="p-4 text-white font-semibold">{s.member_count || 1}</td>
                    <td className="p-4 text-white font-semibold">{s.gallery_count || 0}</td>
                    <td className="p-4 text-white font-semibold">{s.photo_count || 0}</td>
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
