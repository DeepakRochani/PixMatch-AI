'use client';

import React, { useState, useEffect } from 'react';
import {
  Gauge,
  Clock,
  CheckCircle,
  Users,
  Layers,
  Sparkles,
  TrendingUp,
  Award,
  DollarSign,
} from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import { BusinessNavTabs } from '@/components/dashboard/BusinessNavTabs';
import { StudioPerformanceMetricsDTO, ServicePerformanceDTO } from '@pixmatch/types';

export default function BusinessPerformancePage() {
  const { token, studio } = useAuth();
  const [loading, setLoading] = useState(true);
  const [metrics, setMetrics] = useState<StudioPerformanceMetricsDTO | null>(null);
  const [services, setServices] = useState<ServicePerformanceDTO[]>([]);

  useEffect(() => {
    async function loadData() {
      if (!token) return;
      try {
        setLoading(true);
        const [mRes, sRes] = await Promise.all([
          fetch('/api/v1/business/performance/studio', {
            headers: { Authorization: `Bearer ${token}`, 'x-studio-id': studio?.id || '' },
          }),
          fetch('/api/v1/business/performance/services', {
            headers: { Authorization: `Bearer ${token}`, 'x-studio-id': studio?.id || '' },
          }),
        ]);

        if (mRes.ok) setMetrics(await mRes.json());
        if (sRes.ok) setServices(await sRes.json());
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [token]);

  const currency = studio?.currency || 'USD';

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold text-white tracking-tight">
          Studio Operational Performance
        </h1>
        <p className="text-sm text-muted mt-1">
          Turnaround velocity, client retention metrics, and package profitability benchmarks.
        </p>
      </div>

      <BusinessNavTabs />

      {loading ? (
        <div className="py-20 text-center text-xs text-muted">Calculating studio performance...</div>
      ) : (
        <div className="space-y-6">
          {/* Top Operational Metrics */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-5 rounded-2xl bg-card border border-card-border space-y-2">
              <div className="flex items-center justify-between text-muted">
                <span className="text-xs font-semibold uppercase">Avg Turnaround</span>
                <Clock className="h-4 w-4 text-primary" />
              </div>
              <p className="text-2xl font-bold text-white">
                {metrics?.average_turnaround_days || 0} <span className="text-sm font-normal text-muted">days</span>
              </p>
              <p className="text-[11px] text-muted">
                Median: {metrics?.median_turnaround_days || 0} days from shoot to published
              </p>
            </div>

            <div className="p-5 rounded-2xl bg-card border border-card-border space-y-2">
              <div className="flex items-center justify-between text-muted">
                <span className="text-xs font-semibold uppercase">Delivery Rate</span>
                <CheckCircle className="h-4 w-4 text-emerald-400" />
              </div>
              <p className="text-2xl font-bold text-white">{metrics?.delivery_rate_pct || 0}%</p>
              <p className="text-[11px] text-muted">
                {metrics?.total_galleries_delivered || 0} of {metrics?.total_galleries_created || 0} galleries delivered
              </p>
            </div>

            <div className="p-5 rounded-2xl bg-card border border-card-border space-y-2">
              <div className="flex items-center justify-between text-muted">
                <span className="text-xs font-semibold uppercase">Repeat Client Rate</span>
                <Users className="h-4 w-4 text-purple-400" />
              </div>
              <p className="text-2xl font-bold text-white">{metrics?.repeat_client_rate_pct || 0}%</p>
              <p className="text-[11px] text-muted">Clients booking multiple shoots</p>
            </div>

            <div className="p-5 rounded-2xl bg-card border border-card-border space-y-2">
              <div className="flex items-center justify-between text-muted">
                <span className="text-xs font-semibold uppercase">Client Engagement</span>
                <Sparkles className="h-4 w-4 text-amber-400" />
              </div>
              <p className="text-2xl font-bold text-white">{metrics?.client_engagement_index || 0} <span className="text-sm font-normal text-muted">/ 100</span></p>
              <p className="text-[11px] text-muted">
                Favorites ({metrics?.total_client_favorites || 0}) • Downloads ({metrics?.total_client_downloads || 0})
              </p>
            </div>
          </div>

          {/* Package Performance Breakdown */}
          <div className="p-6 rounded-2xl bg-card border border-card-border space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Layers className="h-4 w-4 text-primary" />
                <h3 className="text-sm font-bold text-white">Photography Service & Package Performance</h3>
              </div>
            </div>

            {services.length === 0 ? (
              <p className="text-xs text-muted py-4">No service category data recorded yet.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-card-border/20 border-b border-card-border text-muted font-semibold">
                    <tr>
                      <th className="p-3.5">Service Category</th>
                      <th className="p-3.5">Total Revenue</th>
                      <th className="p-3.5">Expenses</th>
                      <th className="p-3.5">Net Profit</th>
                      <th className="p-3.5">Profit Margin</th>
                      <th className="p-3.5">Avg Turnaround</th>
                      <th className="p-3.5">Avg Job Value</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-card-border/60">
                    {services.map((s, idx) => (
                      <tr key={idx} className="hover:bg-card-border/20 transition">
                        <td className="p-3.5 font-semibold text-white">{s.service_category}</td>
                        <td className="p-3.5 font-mono text-emerald-400 font-bold">
                          {currency} {s.revenue.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </td>
                        <td className="p-3.5 font-mono text-amber-400">
                          {currency} {s.expenses.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </td>
                        <td className="p-3.5 font-mono text-white font-bold">
                          {currency} {s.net_profit.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </td>
                        <td className="p-3.5">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              s.profit_margin_pct >= 65
                                ? 'bg-emerald-500/10 text-emerald-400'
                                : s.profit_margin_pct >= 40
                                ? 'bg-primary/10 text-primary'
                                : 'bg-amber-500/10 text-amber-400'
                            }`}
                          >
                            {s.profit_margin_pct}%
                          </span>
                        </td>
                        <td className="p-3.5 text-muted">{s.average_turnaround_days} days</td>
                        <td className="p-3.5 font-mono text-muted">
                          {currency} {s.average_revenue_per_job.toFixed(2)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
