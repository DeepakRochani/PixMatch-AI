'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  UserCheck,
  Search,
  Filter,
  AlertCircle,
  CheckCircle2,
  XCircle,
  Send,
  PlusCircle,
  Clock,
  Sparkles,
  TrendingUp,
} from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import { GrowthNavTabs } from '@/components/dashboard/GrowthNavTabs';
import { ClientReactivationCandidateDTO } from '@pixmatch/types';

export default function ReactivationHubPage() {
  const router = useRouter();
  const { token, studio } = useAuth();
  const [loading, setLoading] = useState(true);
  const [candidates, setCandidates] = useState<ClientReactivationCandidateDTO[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState('');
  const [minDays, setMinDays] = useState('60');
  const [excludeSuppressed, setExcludeSuppressed] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchCandidates = async () => {
    try {
      setLoading(true);
      setError(null);
      const params = new URLSearchParams();
      if (search) params.append('search', search);
      if (minDays) params.append('min_days_inactive', minDays);
      if (excludeSuppressed) params.append('exclude_suppressed', 'true');

      const res = await fetch(`/api/v1/growth/reactivation/candidates?${params.toString()}`, {
        headers: {
          Authorization: `Bearer ${token}`,
          'x-studio-id': studio?.id || '',
        },
      });

      if (!res.ok) {
        throw new Error('Failed to load reactivation candidates');
      }

      const json = await res.json();
      setCandidates(json.data?.candidates || []);
    } catch (err: any) {
      setError(err.message || 'Error fetching reactivation candidates');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token) {
      fetchCandidates();
    }
  }, [token, search, minDays, excludeSuppressed]);

  const toggleSelect = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedIds(next);
  };

  const selectAllEligible = () => {
    const eligible = candidates.filter((c) => c.suppression_status === 'AVAILABLE').map((c) => c.client_id);
    setSelectedIds(new Set(eligible));
  };

  const clearSelection = () => {
    setSelectedIds(new Set());
  };

  const handleLaunchCampaignWithSelected = () => {
    const ids = Array.from(selectedIds).join(',');
    router.push(`/dashboard/growth/campaigns/new?client_ids=${encodeURIComponent(ids)}`);
  };

  return (
    <div className="p-6 md:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-lg bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center">
              <UserCheck className="h-4 w-4" />
            </div>
            <h1 className="text-2xl font-bold text-white tracking-tight">Client Reactivation Hub</h1>
          </div>
          <p className="text-xs md:text-sm text-muted mt-1">
            Prioritized dormant clients ranked by deterministic engagement score with automatic suppression filtering.
          </p>
        </div>

        {selectedIds.size > 0 && (
          <div className="flex items-center gap-2.5">
            <button
              onClick={handleLaunchCampaignWithSelected}
              className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-primary to-accent hover:from-primary/90 text-white text-xs font-bold rounded-lg shadow-sm shadow-primary/20 transition-all"
            >
              <Send className="h-3.5 w-3.5" />
              Build Campaign ({selectedIds.size} selected)
            </button>
          </div>
        )}
      </div>

      <GrowthNavTabs />

      {/* Filter Bar */}
      <div className="p-4 rounded-xl bg-card border border-card-border flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex flex-1 items-center gap-3 w-full">
          <div className="relative flex-1">
            <Search className="h-4 w-4 text-muted absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search clients by name or email..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3.5 py-2 bg-card-border/20 border border-card-border text-xs rounded-lg text-white placeholder-muted focus:outline-none focus:border-primary"
            />
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-muted whitespace-nowrap">Inactive For:</span>
            <select
              value={minDays}
              onChange={(e) => setMinDays(e.target.value)}
              className="bg-card-border/20 border border-card-border text-xs rounded-lg px-2.5 py-2 text-white focus:outline-none focus:border-primary"
            >
              <option value="30">30+ Days</option>
              <option value="60">60+ Days</option>
              <option value="90">90+ Days</option>
              <option value="180">180+ Days</option>
              <option value="365">1+ Year</option>
            </select>
          </div>
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto justify-between md:justify-end">
          <label className="flex items-center gap-2 text-xs text-muted cursor-pointer select-none">
            <input
              type="checkbox"
              checked={excludeSuppressed}
              onChange={(e) => setExcludeSuppressed(e.target.checked)}
              className="rounded bg-card-border border-card-border text-primary focus:ring-0"
            />
            <span>Exclude Suppressed / Unsubscribed</span>
          </label>

          <div className="flex items-center gap-2">
            <button
              onClick={selectAllEligible}
              className="px-2.5 py-1.5 bg-card-border/30 hover:bg-card-border/50 text-[11px] font-semibold text-white rounded-lg transition"
            >
              Select All
            </button>
            {selectedIds.size > 0 && (
              <button
                onClick={clearSelection}
                className="px-2.5 py-1.5 text-[11px] font-semibold text-muted hover:text-white transition"
              >
                Clear
              </button>
            )}
          </div>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs flex items-center gap-2">
          <AlertCircle className="h-4 w-4" />
          <span>{error}</span>
        </div>
      )}

      {/* Candidates Table */}
      <div className="p-5 rounded-2xl bg-card border border-card-border shadow-sm">
        {loading ? (
          <div className="py-16 text-center text-xs text-muted">Calculating deterministic re-engagement scores...</div>
        ) : candidates.length === 0 ? (
          <div className="py-16 text-center text-xs text-muted">
            No reactivation candidates found matching current filter criteria.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-muted">
              <thead className="border-b border-card-border text-[11px] uppercase tracking-wider text-muted/70">
                <tr>
                  <th className="pb-3 w-10"></th>
                  <th className="pb-3 font-semibold">Client Name & Email</th>
                  <th className="pb-3 font-semibold text-center">Inactivity</th>
                  <th className="pb-3 font-semibold text-center">Galleries</th>
                  <th className="pb-3 font-semibold text-right">Lifetime Revenue</th>
                  <th className="pb-3 font-semibold text-center">Re-engagement Score</th>
                  <th className="pb-3 font-semibold">Recommended Angle</th>
                  <th className="pb-3 font-semibold text-center">Consent / Status</th>
                  <th className="pb-3 font-semibold text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-card-border/40">
                {candidates.map((c) => {
                  const isEligible = c.suppression_status === 'AVAILABLE';
                  const isSelected = selectedIds.has(c.client_id);

                  return (
                    <tr
                      key={c.client_id}
                      className={`hover:bg-card-border/20 transition-colors ${
                        isSelected ? 'bg-primary/5' : ''
                      }`}
                    >
                      <td className="py-3.5">
                        <input
                          type="checkbox"
                          disabled={!isEligible}
                          checked={isSelected}
                          onChange={() => toggleSelect(c.client_id)}
                          className="rounded bg-card-border border-card-border text-primary focus:ring-0 disabled:opacity-30"
                        />
                      </td>
                      <td className="py-3.5">
                        <div className="font-semibold text-white">{c.name}</div>
                        <div className="text-[11px] text-muted">{c.email}</div>
                      </td>
                      <td className="py-3.5 text-center font-mono">
                        <span className="flex items-center justify-center gap-1 text-muted">
                          <Clock className="h-3 w-3" />
                          {c.days_inactive}d
                        </span>
                      </td>
                      <td className="py-3.5 text-center font-mono text-white">{c.past_galleries_count}</td>
                      <td className="py-3.5 text-right font-mono font-bold text-accent">
                        ₹{c.recorded_revenue.toLocaleString('en-IN')}
                      </td>
                      <td className="py-3.5 text-center">
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-[11px] font-mono font-bold ${
                            c.reengagement_score >= 70
                              ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                              : c.reengagement_score >= 40
                              ? 'bg-amber-500/15 text-amber-400 border border-amber-500/30'
                              : 'bg-card-border/60 text-muted'
                          }`}
                        >
                          {c.reengagement_score}/100
                        </span>
                      </td>
                      <td className="py-3.5">
                        <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-primary/10 text-primary border border-primary/20">
                          {c.recommended_angle}
                        </span>
                      </td>
                      <td className="py-3.5 text-center">
                        {c.suppression_status === 'AVAILABLE' ? (
                          <span className="inline-flex items-center gap-1 text-[11px] text-emerald-400 font-medium">
                            <CheckCircle2 className="h-3.5 w-3.5" /> Available
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[11px] text-red-400 font-medium">
                            <XCircle className="h-3.5 w-3.5" /> {c.suppression_status}
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 text-right">
                        {isEligible ? (
                          <Link
                            href={`/dashboard/growth/campaigns/new?client_ids=${c.client_id}&angle=${encodeURIComponent(
                              c.recommended_angle
                            )}`}
                            className="inline-flex items-center gap-1 px-2.5 py-1 bg-primary/15 hover:bg-primary/25 text-primary border border-primary/30 text-[11px] font-semibold rounded-lg transition"
                          >
                            <Send className="h-3 w-3" /> Outreach
                          </Link>
                        ) : (
                          <span className="text-[11px] text-muted italic">Suppressed</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
