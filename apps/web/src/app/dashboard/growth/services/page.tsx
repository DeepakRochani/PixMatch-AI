'use client';

import React, { useState, useEffect } from 'react';
import {
  Layers,
  TrendingUp,
  AlertCircle,
  Calendar,
  Sparkles,
  ArrowRight,
  ChevronRight,
  PieChart,
} from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import { GrowthNavTabs } from '@/components/dashboard/GrowthNavTabs';
import { ServiceGrowthDTO } from '@pixmatch/types';

export default function ServicesGrowthPage() {
  const { token, studio } = useAuth();
  const [loading, setLoading] = useState(true);
  const [services, setServices] = useState<ServiceGrowthDTO[]>([]);
  const [error, setError] = useState<string | null>(null);

  const fetchServices = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch('/api/v1/growth/services', {
        headers: {
          Authorization: `Bearer ${token}`,
          'x-studio-id': studio?.id || '',
        },
      });

      if (!res.ok) {
        throw new Error('Failed to load service growth data');
      }

      const json = await res.json();
      setServices(json.data?.services || []);
    } catch (err: any) {
      setError(err.message || 'Error loading services');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token) {
      fetchServices();
    }
  }, [token]);

  return (
    <div className="p-6 md:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-lg bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 flex items-center justify-center">
              <Layers className="h-4 w-4" />
            </div>
            <h1 className="text-2xl font-bold text-white tracking-tight">Services & Seasonal Demand</h1>
          </div>
          <p className="text-xs md:text-sm text-muted mt-1">
            Analyze photography package performance, repeat booking rates, and seasonal quarterly fluctuations.
          </p>
        </div>
      </div>

      <GrowthNavTabs />

      {error && (
        <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs flex items-center gap-2">
          <AlertCircle className="h-4 w-4" />
          <span>{error}</span>
        </div>
      )}

      {/* Services Breakdown Cards */}
      <div className="space-y-4">
        {loading ? (
          <div className="py-16 text-center text-xs text-muted">Calculating service growth metrics...</div>
        ) : services.length === 0 ? (
          <div className="py-16 text-center text-xs text-muted">No service data recorded yet.</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {services.map((s, idx) => (
              <div
                key={idx}
                className="p-5 rounded-2xl bg-card border border-card-border space-y-4 shadow-sm hover:border-primary/40 transition-all"
              >
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <h3 className="text-sm font-bold text-white">{s.service_name}</h3>
                    <p className="text-[11px] text-muted">{s.gallery_count} total galleries / deliveries</p>
                  </div>
                  <span
                    className={`px-2.5 py-0.5 rounded text-[10px] font-bold ${
                      s.status === 'SURGING'
                        ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                        : 'bg-card-border/60 text-muted'
                    }`}
                  >
                    {s.status} (+{s.growth_trend_pct}%)
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-2 p-3 rounded-xl bg-card-border/20 border border-card-border/40 text-center">
                  <div>
                    <span className="text-[10px] text-muted uppercase font-semibold">Total Revenue</span>
                    <div className="text-xs font-bold text-accent font-mono mt-0.5">
                      ₹{s.total_revenue.toLocaleString('en-IN')}
                    </div>
                  </div>
                  <div>
                    <span className="text-[10px] text-muted uppercase font-semibold">Avg / Job</span>
                    <div className="text-xs font-bold text-white font-mono mt-0.5">
                      ₹{s.average_revenue_per_gallery.toLocaleString('en-IN')}
                    </div>
                  </div>
                  <div>
                    <span className="text-[10px] text-muted uppercase font-semibold">Repeat Rate</span>
                    <div className="text-xs font-bold text-emerald-400 font-mono mt-0.5">
                      {s.repeat_client_rate_pct !== null ? `${s.repeat_client_rate_pct}%` : 'N/A'}
                    </div>
                  </div>
                </div>

                {/* Quarterly Seasonal Volume */}
                <div className="space-y-1.5">
                  <span className="text-[11px] font-semibold text-muted">Seasonal Quarterly Distribution:</span>
                  <div className="grid grid-cols-4 gap-1.5 text-center text-[10px]">
                    {s.seasonal_patterns.map((q) => (
                      <div key={q.quarter} className="p-1.5 rounded-lg bg-card-border/30 border border-card-border/40">
                        <span className="font-bold text-white">{q.quarter}</span>
                        <div className="font-mono text-muted">{q.volume_share_pct}%</div>
                      </div>
                    ))}
                  </div>
                </div>

                {s.recommended_growth_action && (
                  <div className="p-3 rounded-xl bg-primary/10 border border-primary/20 text-xs text-primary space-y-1">
                    <span className="font-bold flex items-center gap-1">
                      <Sparkles className="h-3 w-3" /> Growth Action:
                    </span>
                    <p className="text-[11px] text-muted">{s.recommended_growth_action}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
