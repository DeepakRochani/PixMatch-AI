'use client';

import React, { useState, useEffect } from 'react';
import { fetchApi } from '@/lib/api-client';
import { formatDate } from '@pixmatch/ui';
import { Users, ShieldAlert, Mail } from 'lucide-react';

export default function AdminUsersPage() {
  const [users, setUsers] = useState<any[]>([
    {
      id: 'u-1',
      name: 'System Admin',
      email: 'admin@pixmatch.ai',
      role: 'SUPER_ADMIN',
      studios: [{ studio_name: 'Platform HQ', role: 'OWNER' }],
      created_at: new Date('2026-01-01').toISOString(),
    },
    {
      id: 'u-2',
      name: 'Alex Rivera',
      email: 'alex@lumiere.com',
      role: 'STUDIO_OWNER',
      studios: [{ studio_name: 'Lumière Studios', role: 'OWNER' }],
      created_at: new Date('2026-01-15').toISOString(),
    },
    {
      id: 'u-3',
      name: 'Sarah Chen',
      email: 'sarah@lumiere.com',
      role: 'STUDIO_MEMBER',
      studios: [{ studio_name: 'Lumière Studios', role: 'PHOTOGRAPHER' }],
      created_at: new Date('2026-02-01').toISOString(),
    },
    {
      id: 'u-4',
      name: 'Marcus Vance',
      email: 'marcus@apexphotos.com',
      role: 'STUDIO_OWNER',
      studios: [{ studio_name: 'Apex Portraiture Studio', role: 'OWNER' }],
      created_at: new Date('2026-02-10').toISOString(),
    },
  ]);

  useEffect(() => {
    async function load() {
      const res = await fetchApi('/admin/users');
      if (res.success && res.data) {
        setUsers(res.data);
      }
    }
    load();
  }, []);

  return (
    <div className="flex-1 flex flex-col min-h-screen">
      <header className="h-16 border-b border-card-border bg-card/60 backdrop-blur-md px-6 flex items-center justify-between sticky top-0 z-40">
        <div>
          <h1 className="text-lg font-bold text-white tracking-tight">Users & Role Access</h1>
          <p className="text-xs text-muted">Platform-wide user roster and role assignments</p>
        </div>
      </header>

      <main className="flex-1 p-6 sm:p-8 space-y-6 max-w-7xl">
        <div className="rounded-2xl bg-card border border-card-border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-card-border bg-background/50 text-xs font-semibold text-muted uppercase tracking-wider">
                <tr>
                  <th className="p-4 pl-6">User Name</th>
                  <th className="p-4">Email Address</th>
                  <th className="p-4">Global Role</th>
                  <th className="p-4">Studio Membership</th>
                  <th className="p-4 pr-6">Registered</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-card-border text-xs">
                {users.map((u) => (
                  <tr key={u.id} className="hover:bg-card-border/20 transition">
                    <td className="p-4 pl-6 font-semibold text-white">
                      <div className="flex items-center gap-3">
                        <div className="h-8 w-8 rounded-full bg-card-border flex items-center justify-center font-bold text-white">
                          {u.name.charAt(0)}
                        </div>
                        <span>{u.name}</span>
                      </div>
                    </td>
                    <td className="p-4 text-muted">
                      <span className="flex items-center gap-1.5 text-white">
                        <Mail className="h-3 w-3 text-muted" /> {u.email}
                      </span>
                    </td>
                    <td className="p-4">
                      <span
                        className={`px-2.5 py-0.5 rounded-full font-bold text-[11px] border ${
                          u.role === 'SUPER_ADMIN'
                            ? 'bg-amber-500/15 text-amber-300 border-amber-500/30'
                            : u.role === 'STUDIO_OWNER'
                            ? 'bg-primary/15 text-primary border-primary/30'
                            : 'bg-card-border text-muted'
                        }`}
                      >
                        {u.role}
                      </span>
                    </td>
                    <td className="p-4 text-white">
                      {u.studios && u.studios[0] ? (
                        <span>
                          {u.studios[0].studio_name} ({u.studios[0].role})
                        </span>
                      ) : (
                        '—'
                      )}
                    </td>
                    <td className="p-4 pr-6 text-muted">{formatDate(u.created_at)}</td>
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
