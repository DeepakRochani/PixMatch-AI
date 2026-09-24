'use client';

import React, { useState, useEffect } from 'react';
import {
  TrendingUp,
  Building2,
  Receipt,
  DollarSign,
  Target,
  Sparkles,
  PieChart,
  ShieldAlert,
  ArrowUpRight,
} from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import { AdminStudioBusinessTelemetryDTO } from '@pixmatch/types';

export default function AdminBusinessTelemetryPage() {
  const { token, user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [telemetry, setTelemetry] = useState<AdminStudioBusinessTelemetryDTO | null>(null);

  useEffect(() => {
    async function loadTelemetry() {
      if (!token) return;
      try {
        setLoading(true);
        const res = await fetch('/api/v1/business/admin/telemetry', {
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
              Platform Studio Business Telemetry
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20">
              Super Admin
            </span>
          </div>
          <p className="text-sm text-muted mt-1">
            Aggregate studio business adoption, GMV throughput volume, and currency distributions across the network.
          </p>
        </div>
      </div>

      {loading ? (
        <div className="py-20 text-center text-xs text-muted">Aggregating platform-wide telemetry...</div>
      ) : telemetry ? (
        <div className="space-y-6">
          {/* Top Platform KPIs */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-5 rounded-2xl bg-card border border-card-border space-y-2">
              <span className="text-xs font-semibold text-muted uppercase">Tracked Studio Revenue</span>
              <p className="text-2xl font-bold font-mono text-emerald-400">
                ${telemetry.aggregate_tracked_revenue.toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </p>
              <p className="text-[11px] text-muted">{telemetry.aggregate_transactions_count} total client transactions</p>
            </div>

            <div className="p-5 rounded-2xl bg-card border border-card-border space-y-2">
              <span className="text-xs font-semibold text-muted uppercase">Studio BI Adoption</span>
              <p className="text-2xl font-bold text-white">{telemetry.business_intelligence_adoption_pct}%</p>
              <p className="text-[11px] text-muted">
                {telemetry.studios_with_business_data} of {telemetry.total_studios} studios tracking revenue
              </p>
            </div>

            <div className="p-5 rounded-2xl bg-card border border-card-border space-y-2">
              <span className="text-xs font-semibold text-muted uppercase">Active Targets</span>
              <p className="text-2xl font-bold text-accent">{telemetry.total_active_goals}</p>
              <p className="text-[11px] text-muted">Business targets currently being pursued</p>
            </div>

            <div className="p-5 rounded-2xl bg-card border border-card-border space-y-2">
              <span className="text-xs font-semibold text-muted uppercase">Anomaly Insights</span>
              <p className="text-2xl font-bold text-amber-400">{telemetry.total_insights_generated}</p>
              <p className="text-[11px] text-muted">{telemetry.insights_acknowledged_pct}% resolution rate</p>
            </div>
          </div>

          {/* Top Studios by Volume & Currency Distribution */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Top Studios */}
            <div className="p-6 rounded-2xl bg-card border border-card-border space-y-4">
              <div className="flex items-center gap-2">
                <Building2 className="h-4 w-4 text-primary" />
                <h3 className="text-sm font-bold text-white">Top Studios by Recorded Revenue</h3>
              </div>

              {telemetry.top_studios_by_revenue.length === 0 ? (
                <p className="text-xs text-muted py-4">No studio financial volume recorded yet.</p>
              ) : (
                <div className="divide-y divide-card-border/60 text-xs">
                  {telemetry.top_studios_by_revenue.map((s, idx) => (
                    <div key={idx} className="py-3 flex items-center justify-between">
                      <div>
                        <p className="font-semibold text-white">{s.studio_name}</p>
                        <p className="text-[11px] text-muted font-mono">{s.transaction_count} transactions</p>
                      </div>
                      <span className="font-bold font-mono text-emerald-400">
                        {s.currency} {s.recorded_revenue.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Currency Distribution */}
            <div className="p-6 rounded-2xl bg-card border border-card-border space-y-4">
              <div className="flex items-center gap-2">
                <PieChart className="h-4 w-4 text-accent" />
                <h3 className="text-sm font-bold text-white">Currency Distribution</h3>
              </div>

              {telemetry.currency_distribution.length === 0 ? (
                <p className="text-xs text-muted py-4">No multi-currency volume recorded.</p>
              ) : (
                <div className="space-y-3">
                  {telemetry.currency_distribution.map((c, idx) => (
                    <div key={idx} className="p-3.5 rounded-xl bg-card-border/20 border border-card-border/40 flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2.5">
                        <span className="px-2 py-1 rounded bg-accent/20 text-accent font-bold font-mono">
                          {c.currency}
                        </span>
                        <span className="text-muted">{c.count} transactions</span>
                      </div>
                      <span className="font-mono font-bold text-white">
                        {c.currency} {c.total_volume.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
