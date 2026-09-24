'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Compass,
  Target,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  ShieldCheck,
  RefreshCw,
  Plus,
  ArrowUpRight,
  FileSpreadsheet,
  Download,
  Calendar,
  Layers,
  Activity,
  BarChart3,
  Sliders,
  Sparkles,
} from 'lucide-react';
import { PlanningNavTabs } from '@/components/dashboard/PlanningNavTabs';
import { fetchApi } from '@/lib/api-client';
import {
  PlanHealthStatus,
  IPlanHealthDTO,
  IPlanHealthDimensionDTO,
} from '@pixmatch/types';

export default function PlanningDashboardPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [overview, setOverview] = useState<any>(null);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetchApi('/planning/overview');
      setOverview(res.data || (res as any));
    } catch (err: any) {
      console.error('Failed to load planning overview:', err);
      setError(err.message || 'Failed to load business planning overview');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const getHealthBadge = (status: PlanHealthStatus | string) => {
    switch (status) {
      case 'ON_TRACK':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
            <CheckCircle2 className="w-3.5 h-3.5" /> ON TRACK
          </span>
        );
      case 'WATCH':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-500 border border-amber-500/20">
            <AlertCircle className="w-3.5 h-3.5" /> WATCH
          </span>
        );
      case 'AT_RISK':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-rose-500/10 text-rose-500 border border-rose-500/20">
            <AlertTriangle className="w-3.5 h-3.5" /> AT RISK
          </span>
        );
      case 'BLOCKED':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-red-600/10 text-red-600 border border-red-600/20">
            <AlertTriangle className="w-3.5 h-3.5" /> BLOCKED
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-muted text-muted-foreground">
            <HelpCircle className="w-3.5 h-3.5" /> UNKNOWN
          </span>
        );
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-primary/10 text-primary border border-primary/20">
              <Compass className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">Studio Business Planning & Strategy</h1>
              <p className="text-sm text-muted-foreground">
                Plan vs Actuals variance matrix, 8-dimension health scoring, and multi-year strategic roadmap.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={loadData}
            disabled={loading}
            className="flex items-center gap-2 px-3 py-2 text-xs font-medium border border-border/60 rounded-lg hover:bg-muted/50 transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
          <Link
            href="/dashboard/planning/plans/new"
            className="flex items-center gap-2 px-4 py-2 text-xs font-medium bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors shadow-sm"
          >
            <Plus className="w-4 h-4" />
            Create Plan
          </Link>
        </div>
      </div>

      {/* Navigation Tabs */}
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
          <p className="text-sm text-muted-foreground">Evaluating studio business plans & health matrix...</p>
        </div>
      ) : !overview?.hasActivePlan ? (
        <div className="p-12 border border-dashed border-border rounded-2xl text-center space-y-4 bg-muted/20">
          <div className="mx-auto w-12 h-12 rounded-full bg-primary/10 text-primary flex items-center justify-center">
            <Target className="w-6 h-6" />
          </div>
          <h3 className="text-lg font-semibold">No Active Business Plan Found</h3>
          <p className="text-sm text-muted-foreground max-w-md mx-auto">
            Create an annual or quarterly business plan with revenue, expense, and booking targets to enable real-time variance tracking.
          </p>
          <Link
            href="/dashboard/planning/plans/new"
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors shadow-sm"
          >
            <Plus className="w-4 h-4" />
            Create FY{new Date().getFullYear()} Business Plan
          </Link>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Active Plan Executive Banner */}
          <div className="p-6 rounded-2xl border border-border/60 bg-gradient-to-br from-card/80 to-card shadow-sm space-y-6">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-border/40 pb-5">
              <div>
                <div className="flex items-center gap-3">
                  <h2 className="text-xl font-bold">{overview.activePlan.name}</h2>
                  <span className="px-2.5 py-0.5 rounded-md text-xs font-medium bg-primary/10 text-primary border border-primary/20">
                    v{overview.activePlan.version}
                  </span>
                  {getHealthBadge(overview.health.overallStatus)}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Fiscal Year {overview.activePlan.fiscalYear} • Period: {new Date(overview.activePlan.startDate).toLocaleDateString()} – {new Date(overview.activePlan.endDate).toLocaleDateString()} • Currency: {overview.activePlan.currency}
                </p>
              </div>

              <div className="flex items-center gap-4">
                <div className="text-right">
                  <div className="text-2xl font-black tracking-tight text-primary">
                    {overview.health.overallScore} / 100
                  </div>
                  <div className="text-xs text-muted-foreground font-medium">Composite Health Score</div>
                </div>
                <Link
                  href={`/dashboard/planning/plans/${overview.activePlan.id}`}
                  className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium border border-border rounded-lg hover:bg-muted/50 transition-colors"
                >
                  Manage Plan <ArrowUpRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>

            {/* Quick Metrics Grid */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="p-4 rounded-xl bg-muted/40 border border-border/40">
                <div className="text-xs text-muted-foreground font-medium flex items-center justify-between">
                  <span>Targets Tracked</span>
                  <Target className="w-4 h-4 text-primary" />
                </div>
                <div className="text-xl font-bold mt-1">{overview.varianceSummary?.totalTargets || 0}</div>
                <div className="text-xs text-muted-foreground mt-1">
                  {overview.varianceSummary?.favorableCount || 0} Favorable • {overview.varianceSummary?.unfavorableCount || 0} Unfavorable
                </div>
              </div>

              <div className="p-4 rounded-xl bg-muted/40 border border-border/40">
                <div className="text-xs text-muted-foreground font-medium flex items-center justify-between">
                  <span>Planned Budget</span>
                  <FileSpreadsheet className="w-4 h-4 text-emerald-500" />
                </div>
                <div className="text-xl font-bold mt-1">
                  ₹{(overview.budgetSummary?.totalPlannedExpense || 0).toLocaleString()}
                </div>
                <div className="text-xs text-muted-foreground mt-1">
                  Spent: ₹{(overview.budgetSummary?.totalActualSpent || 0).toLocaleString()}
                </div>
              </div>

              <div className="p-4 rounded-xl bg-muted/40 border border-border/40">
                <div className="text-xs text-muted-foreground font-medium flex items-center justify-between">
                  <span>Strategic Initiatives</span>
                  <Layers className="w-4 h-4 text-purple-500" />
                </div>
                <div className="text-xl font-bold mt-1">
                  {overview.strategicProgress?.completedInitiatives || 0} / {overview.strategicProgress?.totalInitiatives || 0}
                </div>
                <div className="text-xs text-muted-foreground mt-1">
                  Across {overview.strategicProgress?.totalObjectives || 0} Objectives
                </div>
              </div>

              <div className="p-4 rounded-xl bg-muted/40 border border-border/40">
                <div className="text-xs text-muted-foreground font-medium flex items-center justify-between">
                  <span>Critical Variances</span>
                  <AlertTriangle className={`w-4 h-4 ${overview.varianceSummary?.criticalCount > 0 ? 'text-rose-500' : 'text-muted-foreground'}`} />
                </div>
                <div className={`text-xl font-bold mt-1 ${overview.varianceSummary?.criticalCount > 0 ? 'text-rose-500' : 'text-foreground'}`}>
                  {overview.varianceSummary?.criticalCount || 0}
                </div>
                <div className="text-xs text-muted-foreground mt-1">
                  {overview.varianceSummary?.criticalCount > 0 ? 'Requires attention' : 'Within tolerance'}
                </div>
              </div>
            </div>
          </div>

          {/* 8-Dimension Health Matrix */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold">8-Dimension Strategic Health Matrix</h3>
                <p className="text-xs text-muted-foreground">Comprehensive multi-dimensional health audit across studio operations.</p>
              </div>
              <span className="text-xs text-muted-foreground">
                Evaluated: {new Date(overview.health.evaluatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {overview.health.dimensions.map((dim: IPlanHealthDimensionDTO) => (
                <div
                  key={dim.dimension}
                  className={`p-4 rounded-xl border transition-all ${
                    dim.status === 'ON_TRACK'
                      ? 'bg-card/80 border-border/60 hover:border-emerald-500/40'
                      : dim.status === 'WATCH'
                      ? 'bg-amber-500/5 border-amber-500/30'
                      : 'bg-rose-500/5 border-rose-500/30'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                        {dim.dimension.replace('_', ' ')}
                      </span>
                      <h4 className="text-sm font-bold mt-0.5">{dim.label}</h4>
                    </div>
                    {getHealthBadge(dim.status)}
                  </div>

                  <div className="mt-3">
                    <div className="flex items-baseline justify-between">
                      <span className="text-xs text-muted-foreground font-medium">{dim.metric}</span>
                      <span className="text-sm font-bold">{dim.score !== null ? `${dim.score}%` : '—'}</span>
                    </div>
                    {dim.score !== null && (
                      <div className="w-full bg-muted/60 rounded-full h-1.5 mt-1.5 overflow-hidden">
                        <div
                          className={`h-full rounded-full ${
                            dim.status === 'ON_TRACK' ? 'bg-emerald-500' : dim.status === 'WATCH' ? 'bg-amber-500' : 'bg-rose-500'
                          }`}
                          style={{ width: `${Math.min(100, Math.max(0, dim.score))}%` }}
                        />
                      </div>
                    )}
                  </div>

                  <p className="text-xs text-muted-foreground mt-2.5 leading-relaxed">{dim.reason}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Executive Recommendations & Key Variances */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Recommendations */}
            <div className="lg:col-span-2 p-5 rounded-2xl border border-border/60 bg-card space-y-4">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-primary" />
                <h3 className="text-base font-bold">Executive Strategic Recommendations</h3>
              </div>
              <div className="space-y-2.5">
                {overview.health.recommendations.map((rec: string, idx: number) => (
                  <div
                    key={idx}
                    className="p-3 rounded-xl bg-muted/30 border border-border/40 text-xs text-foreground/90 flex items-start gap-2.5 leading-relaxed"
                  >
                    <CheckCircle2 className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                    <span>{rec}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Top Variances to Monitor */}
            <div className="p-5 rounded-2xl border border-border/60 bg-card space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-base font-bold">Key Target Variances</h3>
                <Link href="/dashboard/planning/variance" className="text-xs text-primary font-medium hover:underline">
                  View All
                </Link>
              </div>

              {overview.keyVariances?.length === 0 ? (
                <p className="text-xs text-muted-foreground py-4 text-center">
                  All targets tracking within standard tolerance.
                </p>
              ) : (
                <div className="space-y-2">
                  {overview.keyVariances.map((v: any, idx: number) => (
                    <div key={idx} className="p-2.5 rounded-lg bg-muted/40 border border-border/40 text-xs flex items-center justify-between">
                      <div>
                        <div className="font-semibold">{v.targetType}</div>
                        <div className="text-[11px] text-muted-foreground">
                          Plan: {v.plannedValue} • Actual: {v.actualValue ?? 'N/A'}
                        </div>
                      </div>
                      <div className="text-right">
                        <span
                          className={`font-bold ${
                            v.isFavorable ? 'text-emerald-500' : 'text-rose-500'
                          }`}
                        >
                          {v.variancePercent !== null ? `${v.variancePercent > 0 ? '+' : ''}${v.variancePercent}%` : '—'}
                        </span>
                        <div className="text-[10px] text-muted-foreground uppercase">{v.severity}</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
