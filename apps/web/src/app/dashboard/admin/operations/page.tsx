'use client';

import React, { useState, useEffect } from 'react';
import {
  Layers,
  Building2,
  Camera,
  Clock,
  Activity,
  AlertTriangle,
  CheckCircle2,
  RefreshCw,
  Search,
  ChevronRight,
  ShieldAlert,
} from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import Link from 'next/link';

export default function AdminOperationsProductionPage() {
  const { token } = useAuth();
  const [loading, setLoading] = useState(true);
  const [metrics, setMetrics] = useState<any>({
    total_in_production: 0,
    total_completed: 0,
    shoots_today: 0,
    turnaround_at_risk: 0,
    avg_turnaround_days: 14,
    stage_breakdown: {},
  });

  const fetchAdminOperations = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/v1/operations/production/summary', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (res.ok) {
        const json = await res.json();
        setMetrics(json.data || {});
      }
    } catch (err) {
      console.error('Error fetching admin operations production:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token) {
      fetchAdminOperations();
    }
  }, [token]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-white tracking-tight flex items-center gap-2.5">
            <Layers className="h-6 w-6 text-amber-400" />
            Platform Studio Production Oversight
          </h1>
          <p className="text-xs text-muted mt-1">
            Real-time multi-tenant monitoring of shoot schedules, production bottlenecks, and delivery turnaround.
          </p>
        </div>

        <button
          onClick={fetchAdminOperations}
          disabled={loading}
          className="flex items-center gap-2 px-3.5 py-2 rounded-lg bg-card-border/60 hover:bg-card-border text-white text-xs font-semibold border border-card-border transition"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
          Refresh Stats
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-[#0E1422] border border-card-border rounded-xl p-4 space-y-1">
          <span className="text-[10px] font-bold text-muted uppercase">Active Production</span>
          <div className="flex items-baseline justify-between">
            <span className="text-2xl font-black text-white">{metrics.total_in_production || 0}</span>
            <Camera className="h-5 w-5 text-amber-400" />
          </div>
          <p className="text-[10px] text-muted">Across all active studios</p>
        </div>

        <div className="bg-[#0E1422] border border-card-border rounded-xl p-4 space-y-1">
          <span className="text-[10px] font-bold text-muted uppercase">Live Shoots Scheduled</span>
          <div className="flex items-baseline justify-between">
            <span className="text-2xl font-black text-indigo-400">{metrics.shoots_today || 0}</span>
            <Clock className="h-5 w-5 text-indigo-400" />
          </div>
          <p className="text-[10px] text-muted">Shoots active today</p>
        </div>

        <div className="bg-[#0E1422] border border-card-border rounded-xl p-4 space-y-1">
          <span className="text-[10px] font-bold text-muted uppercase">Turnaround At Risk</span>
          <div className="flex items-baseline justify-between">
            <span className="text-2xl font-black text-red-400">{metrics.turnaround_at_risk || 0}</span>
            <ShieldAlert className="h-5 w-5 text-red-400" />
          </div>
          <p className="text-[10px] text-muted">Projects approaching SLA limits</p>
        </div>

        <div className="bg-[#0E1422] border border-card-border rounded-xl p-4 space-y-1">
          <span className="text-[10px] font-bold text-muted uppercase">Avg Turnaround Cycle</span>
          <div className="flex items-baseline justify-between">
            <span className="text-2xl font-black text-emerald-400">{metrics.avg_turnaround_days || 14}d</span>
            <Activity className="h-5 w-5 text-emerald-400" />
          </div>
          <p className="text-[10px] text-muted">Booking to client gallery delivery</p>
        </div>
      </div>

      {/* Production Health Advisory */}
      <div className="bg-[#0E1422] border border-card-border rounded-xl p-6 space-y-4">
        <h3 className="text-sm font-bold text-white uppercase tracking-wider">
          Operational Production Health
        </h3>
        <p className="text-xs text-muted leading-relaxed">
          Production stage transitions operate deterministically through 11 validated phases. All multi-tenant queries enforce tenant studio isolation. Health scores (0-100) are generated dynamically across 8 operational dimensions without impacting recorded financial balances.
        </p>
      </div>
    </div>
  );
}
