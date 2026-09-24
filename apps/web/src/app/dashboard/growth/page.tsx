'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Rocket,
  AlertTriangle,
  UserCheck,
  Megaphone,
  CheckCircle2,
  TrendingUp,
  Sparkles,
  RefreshCw,
  ArrowRight,
  Clock,
  Send,
  PlusCircle,
  Calendar,
  Layers,
  ChevronRight,
} from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import { GrowthNavTabs } from '@/components/dashboard/GrowthNavTabs';
import { GrowthOverviewDTO } from '@pixmatch/types';

export default function GrowthOverviewPage() {
  const { token, studio } = useAuth();
  const [loading, setLoading] = useState(true);
  const [scanning, setScanning] = useState(false);
  const [overview, setOverview] = useState<GrowthOverviewDTO | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchOverview = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch('/api/v1/growth/overview', {
        headers: {
          Authorization: `Bearer ${token}`,
          'x-studio-id': studio?.id || '',
        },
      });

      if (!res.ok) {
        throw new Error('Failed to fetch growth overview');
      }

      const json = await res.json();
      setOverview(json.data || json);
    } catch (err: any) {
      setError(err.message || 'Error loading growth data');
    } finally {
      setLoading(false);
    }
  };

  const handleScan = async () => {
    try {
      setScanning(true);
      const res = await fetch('/api/v1/growth/opportunities/scan', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'x-studio-id': studio?.id || '',
        },
      });
      if (res.ok) {
        await fetchOverview();
      }
    } catch (err) {
      console.error('Scan error:', err);
    } finally {
      setScanning(false);
    }
  };

  useEffect(() => {
    if (token) {
      fetchOverview();
    }
  }, [token]);

  return (
    <div className="p-6 md:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-lg bg-gradient-to-tr from-primary to-accent flex items-center justify-center text-white shadow-md shadow-primary/20">
              <Rocket className="h-4 w-4" />
            </div>
            <h1 className="text-2xl font-bold text-white tracking-tight">AI Business Growth & Marketing</h1>
          </div>
          <p className="text-xs md:text-sm text-muted mt-1">
            Data-driven client re-engagement, seasonal demand opportunities, and safe marketing campaign execution.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={handleScan}
            disabled={scanning}
            className="flex items-center gap-2 px-3.5 py-2 bg-card border border-card-border hover:bg-card-border/40 text-xs font-semibold text-white rounded-lg transition-all disabled:opacity-50"
          >
            <RefreshCw className={`h-3.5 w-3.5 text-primary ${scanning ? 'animate-spin' : ''}`} />
            {scanning ? 'Scanning Opportunities...' : 'Scan Opportunities'}
          </button>
          <Link
            href="/dashboard/growth/campaigns/new"
            className="flex items-center gap-2 px-3.5 py-2 bg-gradient-to-r from-primary to-accent hover:from-primary/90 text-xs font-bold text-white rounded-lg shadow-sm shadow-primary/20 transition-all"
          >
            <PlusCircle className="h-4 w-4" />
            New Campaign
          </Link>
        </div>
      </div>

      <GrowthNavTabs />

      {error && (
        <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3.5">
        <div className="p-4 rounded-xl bg-card border border-card-border shadow-sm">
          <div className="flex items-center justify-between text-muted mb-2">
            <span className="text-[11px] font-semibold uppercase tracking-wider">Active Opportunities</span>
            <Sparkles className="h-4 w-4 text-primary" />
          </div>
          <div className="text-xl font-bold text-white">
            {loading ? '...' : overview?.kpis.active_opportunities_count ?? 0}
          </div>
          <p className="text-[10px] text-muted mt-1">Ready for action</p>
        </div>

        <div className="p-4 rounded-xl bg-card border border-card-border shadow-sm">
          <div className="flex items-center justify-between text-muted mb-2">
            <span className="text-[11px] font-semibold uppercase tracking-wider">Urgent Attention</span>
            <AlertTriangle className="h-4 w-4 text-red-400" />
          </div>
          <div className="text-xl font-bold text-red-400">
            {loading ? '...' : overview?.kpis.urgent_opportunities_count ?? 0}
          </div>
          <p className="text-[10px] text-muted mt-1">High priority targets</p>
        </div>

        <div className="p-4 rounded-xl bg-card border border-card-border shadow-sm">
          <div className="flex items-center justify-between text-muted mb-2">
            <span className="text-[11px] font-semibold uppercase tracking-wider">Reactivation Targets</span>
            <UserCheck className="h-4 w-4 text-emerald-400" />
          </div>
          <div className="text-xl font-bold text-emerald-400">
            {loading ? '...' : overview?.kpis.reactivation_candidates_count ?? 0}
          </div>
          <p className="text-[10px] text-muted mt-1">Dormant past clients</p>
        </div>

        <div className="p-4 rounded-xl bg-card border border-card-border shadow-sm">
          <div className="flex items-center justify-between text-muted mb-2">
            <span className="text-[11px] font-semibold uppercase tracking-wider">Active Campaigns</span>
            <Megaphone className="h-4 w-4 text-amber-400" />
          </div>
          <div className="text-xl font-bold text-white">
            {loading ? '...' : overview?.kpis.active_campaigns_count ?? 0}
          </div>
          <p className="text-[10px] text-muted mt-1">In draft / scheduled</p>
        </div>

        <div className="p-4 rounded-xl bg-card border border-card-border shadow-sm">
          <div className="flex items-center justify-between text-muted mb-2">
            <span className="text-[11px] font-semibold uppercase tracking-wider">Conversions</span>
            <CheckCircle2 className="h-4 w-4 text-indigo-400" />
          </div>
          <div className="text-xl font-bold text-white">
            {loading ? '...' : overview?.kpis.total_campaign_conversions ?? 0}
          </div>
          <p className="text-[10px] text-muted mt-1">Attributed bookings</p>
        </div>

        <div className="p-4 rounded-xl bg-card border border-card-border shadow-sm">
          <div className="flex items-center justify-between text-muted mb-2">
            <span className="text-[11px] font-semibold uppercase tracking-wider">Attributed Revenue</span>
            <TrendingUp className="h-4 w-4 text-accent" />
          </div>
          <div className="text-xl font-bold text-accent">
            {loading ? '...' : `₹${(overview?.kpis.total_attributed_revenue ?? 0).toLocaleString('en-IN')}`}
          </div>
          <p className="text-[10px] text-muted mt-1">Verified growth revenue</p>
        </div>
      </div>

      {/* Main Grid: Opportunities & Seasonal Prep */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Top Growth Opportunities */}
        <div className="lg:col-span-2 space-y-4">
          <div className="p-5 rounded-2xl bg-card border border-card-border shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-primary" />
                <h2 className="text-sm font-bold text-white">Prioritized Growth Opportunities</h2>
              </div>
              <Link
                href="/dashboard/growth/reactivation"
                className="text-xs font-semibold text-primary hover:text-accent flex items-center gap-1 transition-colors"
              >
                View all <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>

            {loading ? (
              <div className="py-12 text-center text-xs text-muted">Analyzing studio growth opportunities...</div>
            ) : !overview?.top_opportunities || overview.top_opportunities.length === 0 ? (
              <div className="py-10 text-center text-xs text-muted bg-card-border/10 rounded-xl border border-dashed border-card-border">
                No active growth opportunities detected. Click &quot;Scan Opportunities&quot; to inspect your client database.
              </div>
            ) : (
              <div className="space-y-3">
                {overview.top_opportunities.map((opp) => (
                  <div
                    key={opp.id}
                    className="p-4 rounded-xl bg-card-border/20 border border-card-border/60 hover:border-primary/40 transition-all flex flex-col md:flex-row md:items-center justify-between gap-3"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            opp.priority === 'URGENT' || opp.priority === 'HIGH'
                              ? 'bg-red-500/15 text-red-400 border border-red-500/30'
                              : 'bg-primary/15 text-primary border border-primary/30'
                          }`}
                        >
                          {opp.priority}
                        </span>
                        <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-card-border/40 text-muted">
                          {opp.type.replace(/_/g, ' ')}
                        </span>
                        <span className="text-[10px] text-muted">
                          Confidence: {Math.round(opp.confidence_score * 100)}% ({opp.confidence_level})
                        </span>
                      </div>
                      <h3 className="text-xs font-semibold text-white">{opp.title}</h3>
                      <p className="text-[11px] text-muted line-clamp-2">{opp.description}</p>
                    </div>

                    <div className="flex items-center gap-2 flex-shrink-0">
                      <Link
                        href={`/dashboard/growth/campaigns/new?angle=${encodeURIComponent(opp.type)}&client_id=${opp.client_id || ''}`}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-primary/20 hover:bg-primary/30 text-primary border border-primary/40 text-xs font-semibold rounded-lg transition-all"
                      >
                        <Send className="h-3.5 w-3.5" />
                        Launch Campaign
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Recent Campaigns Overview */}
          <div className="p-5 rounded-2xl bg-card border border-card-border shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Megaphone className="h-4 w-4 text-amber-400" />
                <h2 className="text-sm font-bold text-white">Recent Marketing Campaigns</h2>
              </div>
              <Link
                href="/dashboard/growth/campaigns"
                className="text-xs font-semibold text-primary hover:text-accent flex items-center gap-1 transition-colors"
              >
                View all campaigns <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>

            {loading ? (
              <div className="py-8 text-center text-xs text-muted">Loading campaigns...</div>
            ) : !overview?.recent_campaigns || overview.recent_campaigns.length === 0 ? (
              <div className="py-8 text-center text-xs text-muted bg-card-border/10 rounded-xl border border-dashed border-card-border">
                No campaigns created yet. Build your first campaign with AI suggestions and human approval.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-muted">
                  <thead className="border-b border-card-border text-[11px] uppercase tracking-wider text-muted/70">
                    <tr>
                      <th className="pb-2.5 font-semibold">Campaign Name</th>
                      <th className="pb-2.5 font-semibold">Status</th>
                      <th className="pb-2.5 font-semibold text-right">Recipients</th>
                      <th className="pb-2.5 font-semibold text-right">Converted</th>
                      <th className="pb-2.5 font-semibold text-right">Attributed Revenue</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-card-border/40">
                    {overview.recent_campaigns.map((c) => (
                      <tr key={c.id} className="hover:bg-card-border/20 transition-colors">
                        <td className="py-3 font-semibold text-white">
                          <Link href={`/dashboard/growth/campaigns/${c.id}`} className="hover:text-primary transition-colors flex items-center gap-1.5">
                            {c.name}
                            <ChevronRight className="h-3 w-3 text-muted" />
                          </Link>
                        </td>
                        <td className="py-3">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              c.status === 'COMPLETED'
                                ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                                : c.status === 'APPROVED'
                                ? 'bg-indigo-500/15 text-indigo-400 border border-indigo-500/30'
                                : 'bg-card-border/60 text-muted'
                            }`}
                          >
                            {c.status}
                          </span>
                        </td>
                        <td className="py-3 text-right text-white font-mono">{c.recipient_count || 0}</td>
                        <td className="py-3 text-right text-emerald-400 font-mono font-bold">{c.converted_count || 0}</td>
                        <td className="py-3 text-right text-accent font-mono font-bold">
                          ₹{(c.total_revenue || 0).toLocaleString('en-IN')}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* Right Sidebar: Seasonal Alerts & Service Growth */}
        <div className="space-y-4">
          {/* Seasonal Demand Alerts */}
          <div className="p-5 rounded-2xl bg-card border border-card-border shadow-sm">
            <div className="flex items-center gap-2 mb-3">
              <Calendar className="h-4 w-4 text-indigo-400" />
              <h2 className="text-sm font-bold text-white">Seasonal Demand Planning</h2>
            </div>
            <div className="space-y-3">
              {overview?.seasonal_alerts?.map((alert, idx) => (
                <div key={idx} className="p-3.5 rounded-xl bg-card-border/20 border border-card-border/60 space-y-1.5">
                  <div className="flex items-center justify-between text-xs font-semibold text-white">
                    <span>{alert.season_name}</span>
                    <span className="text-[10px] text-amber-400 font-mono flex items-center gap-1">
                      <Clock className="h-3 w-3" /> {alert.recommended_campaign_prep_days}d lead
                    </span>
                  </div>
                  <p className="text-[11px] text-muted">{alert.message}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Service Growth Highlights */}
          <div className="p-5 rounded-2xl bg-card border border-card-border shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Layers className="h-4 w-4 text-accent" />
                <h2 className="text-sm font-bold text-white">Service Growth Highlights</h2>
              </div>
              <Link href="/dashboard/growth/services" className="text-xs text-primary hover:text-accent font-semibold">
                Explore
              </Link>
            </div>
            <div className="space-y-2.5">
              {overview?.service_growth_highlights?.map((service, idx) => (
                <div key={idx} className="flex items-center justify-between p-2.5 rounded-lg bg-card-border/10 border border-card-border/40 text-xs">
                  <div>
                    <p className="font-semibold text-white">{service.category}</p>
                    <p className="text-[10px] text-muted font-mono">{service.booking_count} bookings • ₹{service.revenue.toLocaleString('en-IN')}</p>
                  </div>
                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                      service.status === 'SURGING'
                        ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                        : 'bg-card-border/40 text-muted'
                    }`}
                  >
                    +{service.trend_pct}%
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
