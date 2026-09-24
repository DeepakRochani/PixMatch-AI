'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Sliders,
  RefreshCw,
  AlertTriangle,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  ArrowUpRight,
} from 'lucide-react';
import { PlanningNavTabs } from '@/components/dashboard/PlanningNavTabs';
import { fetchApi } from '@/lib/api-client';
import { IPlanVsScenarioDTO } from '@pixmatch/types';

export default function ScenarioEvaluationPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activePlan, setActivePlan] = useState<any>(null);
  const [scenarios, setScenarios] = useState<IPlanVsScenarioDTO[]>([]);

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

      const scRes = await fetchApi(`/planning/plans/${plan.id}/scenarios`);
      const scData = (scRes.data || scRes) as any;
      setScenarios(Array.isArray(scData) ? scData : []);
    } catch (err: any) {
      console.error('Failed to load scenario evaluations:', err);
      setError(err.message || 'Failed to load scenario evaluations');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const getFeasibilityBadge = (feasibility: string) => {
    switch (feasibility) {
      case 'ACHIEVABLE':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
            ACHIEVABLE
          </span>
        );
      case 'STRETCH':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-500 border border-amber-500/20">
            STRETCH
          </span>
        );
      case 'UNFEASIBLE_WITHOUT_PIVOT':
      default:
        return (
          <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-500/10 text-rose-500 border border-rose-500/20">
            UNFEASIBLE WITHOUT PIVOT
          </span>
        );
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Scenario Feasibility Evaluation</h1>
          <p className="text-sm text-muted-foreground">
            Stress-test business plan targets against macroeconomic, seasonal, and capacity scenarios.
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
          <p className="text-sm text-muted-foreground">Evaluating simulated scenario models...</p>
        </div>
      ) : scenarios.length === 0 ? (
        <div className="p-12 border border-dashed border-border rounded-2xl text-center space-y-3 bg-muted/20">
          <h3 className="text-base font-semibold">No Scenarios Available</h3>
          <p className="text-xs text-muted-foreground">Activate a business plan to stress test against scenarios.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {scenarios.map((sc) => (
            <div
              key={sc.scenarioId}
              className="p-6 rounded-2xl border border-border/60 bg-card flex flex-col justify-between space-y-4 shadow-sm"
            >
              <div className="space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <h3 className="text-base font-bold">{sc.scenarioName}</h3>
                  {getFeasibilityBadge(sc.targetFeasibility)}
                </div>

                <p className="text-xs text-muted-foreground leading-relaxed">{sc.description}</p>

                <div className="space-y-2 pt-3 border-t border-border/40 text-xs">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Planned Revenue:</span>
                    <span className="font-semibold">₹{sc.plannedRevenue.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Simulated Revenue:</span>
                    <span className="font-bold text-primary">₹{sc.simulatedRevenue.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Simulated Variance:</span>
                    <span className={`font-bold ${sc.variance >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                      {sc.variance >= 0 ? '+' : ''}₹{sc.variance.toLocaleString()} ({sc.variancePercent}%)
                    </span>
                  </div>
                </div>
              </div>

              <div className="pt-3 border-t border-border/40 text-[11px] text-muted-foreground">
                Feasibility Status: <span className="font-semibold text-foreground">{sc.targetFeasibility.replace(/_/g, ' ')}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
