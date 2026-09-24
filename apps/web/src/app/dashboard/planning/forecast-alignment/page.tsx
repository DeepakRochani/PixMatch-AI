'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  TrendingUp,
  RefreshCw,
  AlertTriangle,
  CheckCircle2,
  AlertCircle,
  BarChart3,
  Calendar,
} from 'lucide-react';
import { PlanningNavTabs } from '@/components/dashboard/PlanningNavTabs';
import { fetchApi } from '@/lib/api-client';
import { IPlanVsForecastDTO } from '@pixmatch/types';

export default function ForecastAlignmentPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activePlan, setActivePlan] = useState<any>(null);
  const [alignment, setAlignment] = useState<IPlanVsForecastDTO | null>(null);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const planRes = await fetchApi('/planning/plans/active');
      const plan = (planRes.data || planRes) as any;
      if (!plan || (plan as any).error) {
        setLoading(false);
        return;
      }
      setActivePlan(plan);

      const alignRes = await fetchApi(`/planning/plans/${plan.id}/forecast-alignment`);
      const alignData = (alignRes.data || alignRes) as any;
      setAlignment(alignData);
    } catch (err: any) {
      console.error('Failed to load forecast alignment:', err);
      setError(err.message || 'Failed to load forecast alignment');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Forecast Pacing & Plan Alignment</h1>
          <p className="text-sm text-muted-foreground">
            Compare planned annual targets against Phase 38 machine learning & seasonal forecast projections.
          </p>
        </div>

        <button
          onClick={loadData}
          disabled={loading}
          className="flex items-center gap-2 px-3 py-2 text-xs font-medium border border-border/60 rounded-lg hover:bg-muted/50 transition-colors"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      <PlanningNavTabs />

      {error && (
        <div className="p-4 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-sm flex items-center gap-3">
          <AlertTriangle className="w-5 h-5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {loading ? (
        <div className="flex flex-col items-center justify-center p-16 space-y-4">
          <RefreshCw className="w-8 h-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Aligning business plan with ML forecast models...</p>
        </div>
      ) : !alignment ? (
        <div className="p-12 border border-dashed border-border rounded-2xl text-center space-y-3 bg-muted/20">
          <h3 className="text-base font-semibold">No Active Business Plan</h3>
          <p className="text-xs text-muted-foreground">Activate a business plan to view forecast alignment.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Executive Gap Banner */}
          <div className="p-6 rounded-2xl border border-border/60 bg-card shadow-sm space-y-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border/40 pb-4">
              <div>
                <span className="text-xs font-semibold text-primary uppercase tracking-wider">
                  FY{alignment.fiscalYear} • {alignment.targetType} Alignment
                </span>
                <h3 className="text-xl font-bold mt-0.5">{alignment.summaryNote}</h3>
              </div>

              <span
                className={`px-3 py-1 rounded-full text-xs font-bold ${
                  alignment.alignmentVerdict === 'ON_TRACK'
                    ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20'
                    : 'bg-amber-500/10 text-amber-500 border border-amber-500/20'
                }`}
              >
                {alignment.alignmentVerdict.replace('_', ' ')}
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-4 rounded-xl bg-muted/40 border border-border/40">
                <div className="text-xs text-muted-foreground font-medium">Planned Full-Year Target</div>
                <div className="text-2xl font-bold mt-1">₹{alignment.plannedAnnual.toLocaleString()}</div>
              </div>

              <div className="p-4 rounded-xl bg-muted/40 border border-border/40">
                <div className="text-xs text-muted-foreground font-medium">ML Projected Full-Year</div>
                <div className="text-2xl font-bold mt-1 text-primary">
                  ₹{alignment.forecastedAnnual.toLocaleString()}
                </div>
              </div>

              <div className="p-4 rounded-xl bg-muted/40 border border-border/40">
                <div className="text-xs text-muted-foreground font-medium">Projected Plan Gap</div>
                <div
                  className={`text-2xl font-bold mt-1 ${
                    alignment.gapToPlan >= 0 ? 'text-emerald-500' : 'text-rose-500'
                  }`}
                >
                  {alignment.gapToPlan >= 0 ? '+' : ''}₹{alignment.gapToPlan.toLocaleString()}
                </div>
                <div className="text-xs text-muted-foreground mt-0.5">
                  {alignment.gapPercent !== null ? `${alignment.gapPercent > 0 ? '+' : ''}${alignment.gapPercent}% vs Target` : ''}
                </div>
              </div>
            </div>
          </div>

          {/* Monthly Forecast Breakdown */}
          <div className="p-6 rounded-2xl border border-border/60 bg-card overflow-x-auto shadow-sm">
            <h3 className="text-base font-bold mb-4">12-Month Pacing Breakdown</h3>
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-border/60 text-muted-foreground font-semibold">
                  <th className="py-2.5 px-3">Month</th>
                  <th className="py-2.5 px-3 text-right">Plan Target</th>
                  <th className="py-2.5 px-3 text-right">Actual Recorded</th>
                  <th className="py-2.5 px-3 text-right">ML Forecast</th>
                  <th className="py-2.5 px-3 text-right">Variance to Plan</th>
                  <th className="py-2.5 px-3 text-right">Variance %</th>
                  <th className="py-2.5 px-3 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/40">
                {alignment.monthlyBreakdown?.map((m) => (
                  <tr key={m.month} className="hover:bg-muted/20">
                    <td className="py-2.5 px-3 font-semibold">{m.monthName}</td>
                    <td className="py-2.5 px-3 text-right font-medium">₹{m.planned.toLocaleString()}</td>
                    <td className="py-2.5 px-3 text-right font-medium">
                      {m.actual !== null ? `₹${m.actual.toLocaleString()}` : '—'}
                    </td>
                    <td className="py-2.5 px-3 text-right font-bold text-primary">₹{m.forecast.toLocaleString()}</td>
                    <td className="py-2.5 px-3 text-right font-semibold">
                      {m.varianceToPlan > 0 ? '+' : ''}₹{m.varianceToPlan.toLocaleString()}
                    </td>
                    <td className="py-2.5 px-3 text-right font-bold">
                      <span className={m.varianceToPlan >= 0 ? 'text-emerald-500' : 'text-amber-500'}>
                        {m.variancePercent !== null ? `${m.variancePercent > 0 ? '+' : ''}${m.variancePercent}%` : '—'}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-center">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                          m.status === 'MEETS_TARGET'
                            ? 'bg-emerald-500/10 text-emerald-500'
                            : m.status === 'CLOSE_TO_TARGET'
                            ? 'bg-amber-500/10 text-amber-500'
                            : 'bg-rose-500/10 text-rose-500'
                        }`}
                      >
                        {m.status.replace('_', ' ')}
                      </span>
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
