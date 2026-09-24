'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Megaphone,
  PlusCircle,
  Search,
  Filter,
  CheckCircle2,
  Clock,
  AlertCircle,
  TrendingUp,
  ChevronRight,
  Eye,
  Send,
  Calendar,
} from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import { GrowthNavTabs } from '@/components/dashboard/GrowthNavTabs';
import { MarketingCampaignDTO, MarketingCampaignStatus } from '@pixmatch/types';

export default function CampaignsListPage() {
  const { token, studio } = useAuth();
  const [loading, setLoading] = useState(true);
  const [campaigns, setCampaigns] = useState<MarketingCampaignDTO[]>([]);
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [search, setSearch] = useState('');
  const [error, setError] = useState<string | null>(null);

  const fetchCampaigns = async () => {
    try {
      setLoading(true);
      setError(null);
      const params = new URLSearchParams();
      if (statusFilter !== 'ALL') params.append('status', statusFilter);
      if (search) params.append('search', search);

      const res = await fetch(`/api/v1/growth/campaigns?${params.toString()}`, {
        headers: {
          Authorization: `Bearer ${token}`,
          'x-studio-id': studio?.id || '',
        },
      });

      if (!res.ok) {
        throw new Error('Failed to load marketing campaigns');
      }

      const json = await res.json();
      setCampaigns(json.data?.campaigns || []);
    } catch (err: any) {
      setError(err.message || 'Error fetching campaigns');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token) {
      fetchCampaigns();
    }
  }, [token, statusFilter, search]);

  return (
    <div className="p-6 md:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-lg bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center justify-center">
              <Megaphone className="h-4 w-4" />
            </div>
            <h1 className="text-2xl font-bold text-white tracking-tight">Marketing Campaigns</h1>
          </div>
          <p className="text-xs md:text-sm text-muted mt-1">
            Build, review, approve, and track email campaigns with zero unapproved auto-sends and complete suppression isolation.
          </p>
        </div>

        <Link
          href="/dashboard/growth/campaigns/new"
          className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-primary to-accent hover:from-primary/90 text-white text-xs font-bold rounded-lg shadow-sm shadow-primary/20 transition-all self-start md:self-auto"
        >
          <PlusCircle className="h-4 w-4" />
          Create New Campaign
        </Link>
      </div>

      <GrowthNavTabs />

      {/* Filter Bar */}
      <div className="p-4 rounded-xl bg-card border border-card-border flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative flex-1 w-full">
          <Search className="h-4 w-4 text-muted absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search campaigns by name or subject line..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3.5 py-2 bg-card-border/20 border border-card-border text-xs rounded-lg text-white placeholder-muted focus:outline-none focus:border-primary"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Filter className="h-3.5 w-3.5 text-muted" />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-card-border/20 border border-card-border text-xs rounded-lg px-2.5 py-2 text-white focus:outline-none focus:border-primary"
          >
            <option value="ALL">All Statuses</option>
            <option value="DRAFT">Drafts</option>
            <option value="APPROVED">Approved (Ready)</option>
            <option value="SCHEDULED">Scheduled</option>
            <option value="COMPLETED">Completed</option>
          </select>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs flex items-center gap-2">
          <AlertCircle className="h-4 w-4" />
          <span>{error}</span>
        </div>
      )}

      {/* Campaigns Table */}
      <div className="p-5 rounded-2xl bg-card border border-card-border shadow-sm">
        {loading ? (
          <div className="py-16 text-center text-xs text-muted">Loading marketing campaigns...</div>
        ) : campaigns.length === 0 ? (
          <div className="py-16 text-center text-xs text-muted space-y-3">
            <p>No campaigns found.</p>
            <Link
              href="/dashboard/growth/campaigns/new"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-primary/20 hover:bg-primary/30 text-primary border border-primary/40 text-xs font-semibold rounded-lg transition"
            >
              <PlusCircle className="h-3.5 w-3.5" /> Create Campaign Draft
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-muted">
              <thead className="border-b border-card-border text-[11px] uppercase tracking-wider text-muted/70">
                <tr>
                  <th className="pb-3 font-semibold">Campaign & Subject</th>
                  <th className="pb-3 font-semibold text-center">Status</th>
                  <th className="pb-3 font-semibold text-right">Recipients</th>
                  <th className="pb-3 font-semibold text-right">Delivered</th>
                  <th className="pb-3 font-semibold text-right">Opened</th>
                  <th className="pb-3 font-semibold text-right">Clicked</th>
                  <th className="pb-3 font-semibold text-right">Converted</th>
                  <th className="pb-3 font-semibold text-right">Attributed Revenue</th>
                  <th className="pb-3 font-semibold text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-card-border/40">
                {campaigns.map((c) => (
                  <tr key={c.id} className="hover:bg-card-border/20 transition-colors">
                    <td className="py-3.5">
                      <Link
                        href={`/dashboard/growth/campaigns/${c.id}`}
                        className="font-semibold text-white hover:text-primary transition-colors flex items-center gap-1"
                      >
                        {c.name}
                        <ChevronRight className="h-3 w-3 text-muted" />
                      </Link>
                      <div className="text-[11px] text-muted line-clamp-1">{c.subject}</div>
                    </td>
                    <td className="py-3.5 text-center">
                      <span
                        className={`px-2.5 py-0.5 rounded text-[10px] font-bold ${
                          c.status === 'COMPLETED'
                            ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                            : c.status === 'APPROVED'
                            ? 'bg-indigo-500/15 text-indigo-400 border border-indigo-500/30'
                            : c.status === 'SCHEDULED'
                            ? 'bg-amber-500/15 text-amber-400 border border-amber-500/30'
                            : 'bg-card-border/60 text-muted'
                        }`}
                      >
                        {c.status}
                      </span>
                    </td>
                    <td className="py-3.5 text-right font-mono text-white">{c.recipient_count || 0}</td>
                    <td className="py-3.5 text-right font-mono text-muted">{c.delivered_count || 0}</td>
                    <td className="py-3.5 text-right font-mono text-muted">{c.opened_count || 0}</td>
                    <td className="py-3.5 text-right font-mono text-muted">{c.clicked_count || 0}</td>
                    <td className="py-3.5 text-right font-mono font-bold text-emerald-400">{c.converted_count || 0}</td>
                    <td className="py-3.5 text-right font-mono font-bold text-accent">
                      ₹{(c.total_revenue || 0).toLocaleString('en-IN')}
                    </td>
                    <td className="py-3.5 text-right">
                      <Link
                        href={`/dashboard/growth/campaigns/${c.id}`}
                        className="inline-flex items-center gap-1 px-2.5 py-1 bg-card-border/40 hover:bg-card-border/70 text-white text-[11px] font-semibold rounded-lg transition"
                      >
                        <Eye className="h-3 w-3" /> Details
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
