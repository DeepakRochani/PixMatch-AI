'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  BarChart3,
  RefreshCw,
  AlertTriangle,
  Download,
  CheckCircle2,
  TrendingUp,
  TrendingDown,
  Filter,
} from 'lucide-react';
import { PlanningNavTabs } from '@/components/dashboard/PlanningNavTabs';
import { fetchApi } from '@/lib/api-client';
import { VarianceSeverity, IPlanningVarianceItemDTO } from '@pixmatch/types';

export default function TargetVarianceMatrixPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activePlan, setActivePlan] = useState<any>(null);
  const [varianceData, setVarianceData] = useState<any>(null);
  const [selectedQuarter, setSelectedQuarter] = useState<string>('ALL');

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

      const query = selectedQuarter !== 'ALL' ? `?periodQuarter=${selectedQuarter}` : '';
      const varRes = await fetchApi(`/planning/plans/${plan.id}/variance${query}`);
      const variance = (varRes.data || varRes) as any;
      setVarianceData(variance);
    } catch (err: any) {
      console.error('Failed to load variance matrix:', err);
      setError(err.message || 'Failed to load variance matrix');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [selectedQuarter]);

  const getSeverityBadge = (sev: VarianceSeverity | string) => {
    switch (sev) {
      case 'CRITICAL':
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-500/10 text-rose-500 border border-rose-500/20">CRITICAL</span>;
      case 'SIGNIFICANT':
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/10 text-amber-500 border border-amber-500/20">SIGNIFICANT</span>;
      case 'MODERATE':
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-500/10 text-blue-500 border border-blue-500/20">MODERATE</span>;
      case 'NEGLIGIBLE':
      default:
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-muted text-muted-foreground">NEGLIGIBLE</span>;
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Target & Variance Matrix</h1>
          <p className="text-sm text-muted-foreground">
            Plan vs Actual deviations across all 15 operational, sales, and financial target types.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {activePlan && (
            <a
              href={`/api/planning/plans/${activePlan.id}/export/csv`}
              download
              className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium border border-border/60 rounded-lg hover:bg-muted/50 transition-colors"
            >
              <Download className="w-3.5 h-3.5" /> Export CSV
            </a>
          )}
          <button
            onClick={loadData}
            disabled={loading}
            className="flex items-center gap-2 px-3 py-2 text-xs font-medium border border-border/60 rounded-lg hover:bg-muted/50 transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      <PlanningNavTabs />

      {error && (
        <div className="p-4 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-sm flex items-center gap-3">
          <AlertTriangle className="w-5 h-5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Quarter Filter */}
      <div className="flex items-center gap-2 border-b border-border/40 pb-3">
        <span className="text-xs text-muted-foreground font-semibold flex items-center gap-1 mr-2">
          <Filter className="w-3.5 h-3.5" /> Period:
        </span>
        {['ALL', '1', '2', '3', '4'].map((q) => (
          <button
            key={q}
            onClick={() => setSelectedQuarter(q)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              selectedQuarter === q
                ? 'bg-primary text-primary-foreground font-semibold shadow-sm'
                : 'text-muted-foreground hover:bg-muted/60'
            }`}
          >
            {q === 'ALL' ? 'Full Fiscal Year' : `Quarter ${q}`}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center p-16 space-y-4">
          <RefreshCw className="w-8 h-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Calculating variances & tolerances...</p>
        </div>
      ) : !varianceData ? (
        <div className="p-12 border border-dashed border-border rounded-2xl text-center space-y-3 bg-muted/20">
          <h3 className="text-base font-semibold">No Active Plan Targets</h3>
          <p className="text-xs text-muted-foreground">Activate a business plan to view variance matrix data.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="p-4 rounded-xl bg-card border border-border/60">
              <div className="text-xs text-muted-foreground font-medium">Total Targets Evaluated</div>
              <div className="text-2xl font-bold mt-1">{varianceData.summary?.totalTargets || 0}</div>
            </div>

            <div className="p-4 rounded-xl bg-card border border-border/60">
              <div className="text-xs text-emerald-500 font-medium flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" /> Favorable Outperformance
              </div>
              <div className="text-2xl font-bold mt-1 text-emerald-500">
                {varianceData.summary?.favorableCount || 0}
              </div>
            </div>

            <div className="p-4 rounded-xl bg-card border border-border/60">
              <div className="text-xs text-rose-500 font-medium flex items-center gap-1">
                <TrendingDown className="w-3.5 h-3.5" /> Unfavorable Deviations
              </div>
              <div className="text-2xl font-bold mt-1 text-rose-500">
                {varianceData.summary?.unfavorableCount || 0}
              </div>
            </div>

            <div className="p-4 rounded-xl bg-card border border-border/60">
              <div className="text-xs text-amber-500 font-medium flex items-center gap-1">
                <AlertTriangle className="w-3.5 h-3.5" /> Critical Alerts (&gt;30%)
              </div>
              <div className="text-2xl font-bold mt-1 text-amber-500">
                {varianceData.summary?.criticalCount || 0}
              </div>
            </div>
          </div>

          {/* Variance Matrix Table */}
          <div className="p-6 rounded-2xl border border-border/60 bg-card overflow-x-auto shadow-sm">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-border/60 text-muted-foreground font-semibold">
                  <th className="py-2.5 px-3">Target Metric</th>
                  <th className="py-2.5 px-3">Period</th>
                  <th className="py-2.5 px-3 text-right">Plan Target</th>
                  <th className="py-2.5 px-3 text-right">Actual Recorded</th>
                  <th className="py-2.5 px-3 text-right">Variance</th>
                  <th className="py-2.5 px-3 text-right">Variance %</th>
                  <th className="py-2.5 px-3 text-center">Favorable</th>
                  <th className="py-2.5 px-3">Severity</th>
                  <th className="py-2.5 px-3">Diagnostic Analysis</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/40">
                {varianceData.items?.map((item: IPlanningVarianceItemDTO, idx: number) => (
                  <tr key={idx} className="hover:bg-muted/20">
                    <td className="py-3 px-3 font-semibold">{item.targetType}</td>
                    <td className="py-3 px-3 text-muted-foreground">
                      {item.periodQuarter ? `Q${item.periodQuarter}` : 'Annual'}
                    </td>
                    <td className="py-3 px-3 text-right font-medium">
                      {item.unit === 'CURRENCY' ? `₹${item.plannedValue.toLocaleString()}` : item.plannedValue.toLocaleString()}
                    </td>
                    <td className="py-3 px-3 text-right font-medium">
                      {item.actualValue !== null
                        ? item.unit === 'CURRENCY'
                          ? `₹${item.actualValue.toLocaleString()}`
                          : item.actualValue.toLocaleString()
                        : '—'}
                    </td>
                    <td className="py-3 px-3 text-right font-bold">
                      {item.variance !== null
                        ? item.unit === 'CURRENCY'
                          ? `₹${item.variance.toLocaleString()}`
                          : item.variance.toLocaleString()
                        : '—'}
                    </td>
                    <td className="py-3 px-3 text-right font-bold">
                      {item.variancePercent !== null ? (
                        <span className={item.isFavorable ? 'text-emerald-500' : 'text-rose-500'}>
                          {item.variancePercent > 0 ? '+' : ''}{item.variancePercent}%
                        </span>
                      ) : '—'}
                    </td>
                    <td className="py-3 px-3 text-center">
                      {item.isFavorable === true ? (
                        <span className="text-emerald-500 font-bold">YES</span>
                      ) : item.isFavorable === false ? (
                        <span className="text-rose-500 font-bold">NO</span>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </td>
                    <td className="py-3 px-3">{getSeverityBadge(item.severity)}</td>
                    <td className="py-3 px-3 text-muted-foreground max-w-xs leading-relaxed">
                      {item.analysis}
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
