'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Target,
  Plus,
  RefreshCw,
  AlertTriangle,
  ArrowUpRight,
  Layers,
  Calendar,
  Lock,
  CheckCircle2,
  AlertCircle,
  Copy,
  ChevronRight,
} from 'lucide-react';
import { PlanningNavTabs } from '@/components/dashboard/PlanningNavTabs';
import { fetchApi } from '@/lib/api-client';
import { BusinessPlanStatus, BusinessPlanType } from '@pixmatch/types';

export default function BusinessPlansListPage() {
  const [plans, setPlans] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  const loadPlans = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetchApi('/planning/plans');
      const data = res.data || (res as any);
      setPlans(Array.isArray(data) ? data : []);
    } catch (err: any) {
      console.error('Failed to load business plans:', err);
      setError(err.message || 'Failed to load business plans');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPlans();
  }, []);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'ACTIVE':
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">ACTIVE</span>;
      case 'APPROVED':
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-500/10 text-blue-500 border border-blue-500/20">APPROVED</span>;
      case 'IN_REVIEW':
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-500 border border-amber-500/20">IN REVIEW</span>;
      case 'DRAFT':
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-muted text-muted-foreground border border-border">DRAFT</span>;
      case 'LOCKED':
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-purple-500/10 text-purple-500 border border-purple-500/20 flex items-center gap-1"><Lock className="w-3 h-3" /> LOCKED</span>;
      case 'SUPERSEDED':
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-muted text-muted-foreground">SUPERSEDED</span>;
      default:
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-muted text-muted-foreground">{status}</span>;
    }
  };

  const filteredPlans = plans.filter((p) => {
    if (statusFilter === 'ALL') return true;
    return p.status === statusFilter;
  });

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Business Plans & Roadmaps</h1>
          <p className="text-sm text-muted-foreground">
            Manage multi-year, annual, and quarterly studio business plans with immutable version control.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={loadPlans}
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

      <PlanningNavTabs />

      {error && (
        <div className="p-4 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-sm flex items-center gap-3">
          <AlertTriangle className="w-5 h-5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 border-b border-border/40 pb-3">
        {['ALL', 'ACTIVE', 'APPROVED', 'IN_REVIEW', 'DRAFT', 'LOCKED', 'SUPERSEDED'].map((st) => (
          <button
            key={st}
            onClick={() => setStatusFilter(st)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              statusFilter === st
                ? 'bg-primary text-primary-foreground font-semibold shadow-sm'
                : 'text-muted-foreground hover:bg-muted/60'
            }`}
          >
            {st}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center p-16 space-y-4">
          <RefreshCw className="w-8 h-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Loading business plans...</p>
        </div>
      ) : filteredPlans.length === 0 ? (
        <div className="p-12 border border-dashed border-border rounded-2xl text-center space-y-4 bg-muted/20">
          <div className="mx-auto w-12 h-12 rounded-full bg-primary/10 text-primary flex items-center justify-center">
            <Target className="w-6 h-6" />
          </div>
          <h3 className="text-lg font-semibold">No Business Plans Found</h3>
          <p className="text-sm text-muted-foreground max-w-md mx-auto">
            {statusFilter !== 'ALL'
              ? `No plans currently in ${statusFilter} status.`
              : 'Create your first business plan to start setting financial and operational targets.'}
          </p>
          <Link
            href="/dashboard/planning/plans/new"
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
          >
            <Plus className="w-4 h-4" /> Create New Plan
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredPlans.map((plan) => (
            <div
              key={plan.id}
              className="p-5 rounded-2xl border border-border/60 bg-card hover:border-primary/40 transition-all shadow-sm flex flex-col justify-between"
            >
              <div className="space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <span className="text-[11px] font-semibold text-primary uppercase tracking-wider">
                      FY{plan.fiscalYear} • {plan.type}
                    </span>
                    <h3 className="text-base font-bold mt-0.5 leading-snug">{plan.name}</h3>
                  </div>
                  {getStatusBadge(plan.status)}
                </div>

                <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                  {plan.description || 'No description provided.'}
                </p>

                <div className="grid grid-cols-2 gap-2 pt-2 border-t border-border/40 text-xs">
                  <div>
                    <span className="text-muted-foreground">Version:</span>
                    <span className="font-semibold ml-1">v{plan.version}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Targets:</span>
                    <span className="font-semibold ml-1">{plan.targets?.length || 0}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Objectives:</span>
                    <span className="font-semibold ml-1">{plan.strategicObjectives?.length || 0}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Currency:</span>
                    <span className="font-semibold ml-1">{plan.currency}</span>
                  </div>
                </div>
              </div>

              <div className="pt-4 mt-4 border-t border-border/40 flex items-center justify-between">
                <span className="text-[11px] text-muted-foreground">
                  Updated {new Date(plan.updatedAt).toLocaleDateString()}
                </span>
                <Link
                  href={`/dashboard/planning/plans/${plan.id}`}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
                >
                  View Details <ChevronRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
