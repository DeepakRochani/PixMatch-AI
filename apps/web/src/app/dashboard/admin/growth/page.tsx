'use client';

import React, { useState, useEffect } from 'react';
import {
  TrendingUp,
  Building2,
  Mail,
  Send,
  Target,
  Sparkles,
  PieChart,
  ShieldCheck,
  ArrowUpRight,
  DollarSign,
  Percent,
} from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import { AdminGrowthTelemetryDTO } from '@pixmatch/types';

export default function AdminGrowthTelemetryPage() {
  const { token } = useAuth();
  const [loading, setLoading] = useState(true);
  const [telemetry, setTelemetry] = useState<AdminGrowthTelemetryDTO | null>(null);

  useEffect(() => {
    async function loadTelemetry() {
      if (!token) return;
      try {
        setLoading(true);
        const res = await fetch('/api/v1/growth/admin/telemetry', {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) setTelemetry(await res.json());
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    loadTelemetry();
  }, [token]);

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl md:text-3xl font-bold text-white tracking-tight">
              Platform Growth & Marketing Telemetry
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20">
              Super Admin
            </span>
          </div>
          <p className="text-sm text-muted mt-1">
            Aggregate studio growth intelligence adoption, campaign throughput, conversion attribution, and platform-wide growth revenue metrics.
          </p>
        </div>
      </div>

      {loading ? (
        <div className="py-20 text-center text-xs text-muted">Aggregating platform-wide growth telemetry...</div>
      ) : telemetry ? (
        <div className="space-y-6">
          {/* Top Platform KPIs */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-5 rounded-2xl bg-card border border-card-border space-y-2">
              <span className="text-xs font-semibold text-muted uppercase">Attributed Growth Revenue</span>
              <p className="text-2xl font-bold font-mono text-emerald-400">
                ${telemetry.total_attributed_growth_revenue.toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </p>
              <p className="text-[11px] text-muted">{telemetry.total_marketing_conversions} verified client conversions</p>
            </div>

            <div className="p-5 rounded-2xl bg-card border border-card-border space-y-2">
              <span className="text-xs font-semibold text-muted uppercase">Growth Adoption</span>
              <p className="text-2xl font-bold text-white">{telemetry.growth_adoption_rate_pct}%</p>
              <p className="text-[11px] text-muted">
                {telemetry.studios_with_growth_adoption} of {telemetry.total_studios} studios actively running campaigns
              </p>
            </div>

            <div className="p-5 rounded-2xl bg-card border border-card-border space-y-2">
              <span className="text-xs font-semibold text-muted uppercase">Campaigns Dispatched</span>
              <p className="text-2xl font-bold text-accent">{telemetry.total_campaigns_dispatched}</p>
              <p className="text-[11px] text-muted">
                {telemetry.total_campaigns_approved} of {telemetry.total_campaigns_created} approved by humans
              </p>
            </div>

            <div className="p-5 rounded-2xl bg-card border border-card-border space-y-2">
              <span className="text-xs font-semibold text-muted uppercase">Opportunities Generated</span>
              <p className="text-2xl font-bold text-amber-400">{telemetry.total_opportunities_generated}</p>
              <p className="text-[11px] text-muted">
                {telemetry.total_opportunities_converted} converted to bookings
              </p>
            </div>
          </div>

          {/* Marketing Delivery Funnel & Average ROI */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="p-6 rounded-2xl bg-card border border-card-border space-y-4 lg:col-span-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Mail className="h-4 w-4 text-primary" />
                  <h2 className="text-sm font-semibold text-white uppercase tracking-wider">
                    Platform Delivery & Conversion Funnel
                  </h2>
                </div>
                <span className="text-xs text-muted">Aggregated across all campaigns</span>
              </div>

              <div className="grid grid-cols-3 gap-4 pt-2">
                <div className="p-4 rounded-xl bg-background border border-card-border text-center">
                  <span className="text-[11px] font-semibold text-muted uppercase">Emails Sent</span>
                  <p className="text-2xl font-bold font-mono text-white mt-1">
                    {telemetry.total_marketing_emails_sent.toLocaleString()}
                  </p>
                </div>

                <div className="p-4 rounded-xl bg-background border border-card-border text-center">
                  <span className="text-[11px] font-semibold text-muted uppercase">Delivered</span>
                  <p className="text-2xl font-bold font-mono text-cyan-400 mt-1">
                    {telemetry.total_marketing_emails_delivered.toLocaleString()}
                  </p>
                </div>

                <div className="p-4 rounded-xl bg-background border border-card-border text-center">
                  <span className="text-[11px] font-semibold text-muted uppercase">Conversions</span>
                  <p className="text-2xl font-bold font-mono text-emerald-400 mt-1">
                    {telemetry.total_marketing_conversions.toLocaleString()}
                  </p>
                </div>
              </div>
            </div>

            <div className="p-6 rounded-2xl bg-card border border-card-border space-y-4 flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <Percent className="h-4 w-4 text-emerald-400" />
                  <h2 className="text-sm font-semibold text-white uppercase tracking-wider">
                    Average Campaign ROI
                  </h2>
                </div>
                <p className="text-xs text-muted mt-1">Attributed return across active marketing budgets</p>
              </div>

              <div className="py-4 text-center">
                <p className="text-4xl font-black font-mono text-emerald-400">
                  {telemetry.average_campaign_roi_pct !== null ? `+${telemetry.average_campaign_roi_pct}%` : 'N/A'}
                </p>
                <span className="text-[11px] text-muted block mt-1">Net attributed ROI</span>
              </div>

              <div className="text-[11px] text-muted flex items-center gap-1 justify-center">
                <ShieldCheck className="h-3.5 w-3.5 text-primary" />
                Human approval required for all dispatches
              </div>
            </div>
          </div>

          {/* Top Studios & Objective Distribution */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Top Studios */}
            <div className="p-6 rounded-2xl bg-card border border-card-border space-y-4">
              <div className="flex items-center gap-2">
                <Building2 className="h-4 w-4 text-primary" />
                <h2 className="text-sm font-semibold text-white uppercase tracking-wider">
                  Top Growth Studios by Attributed Revenue
                </h2>
              </div>
              {telemetry.top_growth_studios.length === 0 ? (
                <div className="py-8 text-center text-xs text-muted">No studio campaign data recorded yet.</div>
              ) : (
                <div className="space-y-3">
                  {telemetry.top_growth_studios.map((st, idx) => (
                    <div
                      key={st.studio_id}
                      className="flex items-center justify-between p-3 rounded-xl bg-background border border-card-border text-sm"
                    >
                      <div className="flex items-center gap-3">
                        <span className="w-5 h-5 rounded-full bg-card flex items-center justify-center text-xs font-mono text-muted">
                          {idx + 1}
                        </span>
                        <div>
                          <p className="font-semibold text-white">{st.studio_name}</p>
                          <p className="text-xs text-muted">
                            {st.campaigns_count} campaigns • {st.conversions_count} conversions
                          </p>
                        </div>
                      </div>
                      <span className="font-mono font-bold text-emerald-400">
                        ${st.attributed_revenue.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Campaign Objective Breakdown */}
            <div className="p-6 rounded-2xl bg-card border border-card-border space-y-4">
              <div className="flex items-center gap-2">
                <PieChart className="h-4 w-4 text-accent" />
                <h2 className="text-sm font-semibold text-white uppercase tracking-wider">
                  Campaign Objective Breakdown
                </h2>
              </div>
              {telemetry.campaign_objective_distribution.length === 0 ? (
                <div className="py-8 text-center text-xs text-muted">No campaigns created yet.</div>
              ) : (
                <div className="space-y-3">
                  {telemetry.campaign_objective_distribution.map(obj => (
                    <div
                      key={obj.objective}
                      className="flex items-center justify-between p-3 rounded-xl bg-background border border-card-border text-sm"
                    >
                      <div>
                        <p className="font-semibold text-white">{obj.objective.replace(/_/g, ' ')}</p>
                        <p className="text-xs text-muted">{obj.count} campaigns created</p>
                      </div>
                      <span className="font-mono font-bold text-white">
                        ${obj.revenue.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      ) : (
        <div className="py-20 text-center text-xs text-muted">Failed to load growth telemetry.</div>
      )}
    </div>
  );
}
