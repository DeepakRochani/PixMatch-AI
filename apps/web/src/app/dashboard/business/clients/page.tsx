'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Users,
  DollarSign,
  Search,
  Sparkles,
  ArrowUpRight,
  TrendingUp,
  UserCheck,
  Calendar,
} from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import { BusinessNavTabs } from '@/components/dashboard/BusinessNavTabs';
import { ClientBusinessSummaryDTO } from '@pixmatch/types';

export default function BusinessClientsPage() {
  const { token, studio } = useAuth();
  const [loading, setLoading] = useState(true);
  const [clients, setClients] = useState<ClientBusinessSummaryDTO[]>([]);
  const [search, setSearch] = useState('');

  const fetchClients = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (search.trim()) params.append('search', search.trim());
      params.append('limit', '100');

      const res = await fetch(`/api/v1/business/clients/summary?${params.toString()}`, {
        headers: {
          Authorization: `Bearer ${token}`,
          'x-studio-id': studio?.id || '',
        },
      });
      if (res.ok) {
        setClients(await res.json());
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token) {
      fetchClients();
    }
  }, [token]);

  const currency = studio?.currency || 'USD';

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-white tracking-tight">
            Client Lifetime Value & Revenue
          </h1>
          <p className="text-sm text-muted mt-1">
            Track client spending history, booking frequency, average order value, and repeat client status.
          </p>
        </div>

        <div className="relative max-w-xs w-full">
          <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-muted" />
          <input
            type="text"
            placeholder="Search clients..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && fetchClients()}
            className="w-full pl-9 pr-3 py-1.5 rounded-lg bg-card border border-card-border text-xs text-white focus:outline-none focus:border-primary"
          />
        </div>
      </div>

      <BusinessNavTabs />

      {loading ? (
        <div className="py-20 text-center text-xs text-muted">Calculating client financial summaries...</div>
      ) : clients.length === 0 ? (
        <div className="py-16 text-center text-xs text-muted">No clients found matching search.</div>
      ) : (
        <div className="rounded-2xl bg-card border border-card-border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-card-border/20 border-b border-card-border text-muted font-semibold">
                <tr>
                  <th className="p-3.5">Client Name</th>
                  <th className="p-3.5">Lifetime Net Revenue</th>
                  <th className="p-3.5">Completed Bookings</th>
                  <th className="p-3.5">Avg Order Value (AOV)</th>
                  <th className="p-3.5">Client Type</th>
                  <th className="p-3.5">Engagement Score</th>
                  <th className="p-3.5 text-right">CRM Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-card-border/60">
                {clients.map((c) => (
                  <tr key={c.client_id} className="hover:bg-card-border/20 transition">
                    <td className="p-3.5">
                      <div>
                        <p className="font-semibold text-white">{c.name}</p>
                        <p className="text-[11px] text-muted">{c.email}</p>
                      </div>
                    </td>
                    <td className="p-3.5 font-bold font-mono text-emerald-400">
                      {currency} {c.net_revenue.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </td>
                    <td className="p-3.5 text-white font-mono">{c.total_bookings}</td>
                    <td className="p-3.5 font-mono text-muted">
                      {currency} {c.average_order_value.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </td>
                    <td className="p-3.5">
                      {c.is_repeat_client ? (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-purple-500/15 text-purple-300 border border-purple-500/30">
                          REPEAT CLIENT
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-card-border/40 text-muted">
                          First-Time
                        </span>
                      )}
                    </td>
                    <td className="p-3.5">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-white">{c.engagement_score}</span>
                        <div className="w-16 h-1.5 rounded-full bg-card-border overflow-hidden">
                          <div
                            className="h-full bg-accent rounded-full"
                            style={{ width: `${Math.min(100, c.engagement_score)}%` }}
                          />
                        </div>
                      </div>
                    </td>
                    <td className="p-3.5 text-right">
                      <Link
                        href={`/dashboard/clients?clientId=${c.client_id}`}
                        className="px-2.5 py-1 rounded text-[11px] font-medium text-primary hover:underline inline-flex items-center gap-1"
                      >
                        Client 360 <ArrowUpRight className="h-3 w-3" />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
