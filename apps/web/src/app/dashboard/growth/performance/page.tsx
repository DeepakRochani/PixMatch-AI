'use client';

import React, { useState, useEffect } from 'react';
import {
  BarChart3,
  Target,
  Plus,
  CheckCircle2,
  TrendingUp,
  AlertCircle,
  Clock,
  Sparkles,
  DollarSign,
  Percent,
} from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import { GrowthNavTabs } from '@/components/dashboard/GrowthNavTabs';
import { GrowthOverviewDTO, GrowthGoalDTO } from '@pixmatch/types';

export default function GrowthPerformancePage() {
  const { token, studio } = useAuth();
  const [loading, setLoading] = useState(true);
  const [overview, setOverview] = useState<GrowthOverviewDTO | null>(null);
  const [goals, setGoals] = useState<GrowthGoalDTO[]>([]);
  const [showGoalModal, setShowGoalModal] = useState(false);

  // New goal form state
  const [goalTitle, setGoalTitle] = useState('Q4 Client Reactivations');
  const [goalMetric, setGoalMetric] = useState('REACTIVATION_COUNT');
  const [goalTarget, setGoalTarget] = useState(15);
  const [goalStart, setGoalStart] = useState(new Date().toISOString().split('T')[0]);
  const [goalEnd, setGoalEnd] = useState(
    new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  );
  const [submittingGoal, setSubmittingGoal] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      const [oRes, gRes] = await Promise.all([
        fetch('/api/v1/growth/overview', {
          headers: {
            Authorization: `Bearer ${token}`,
            'x-studio-id': studio?.id || '',
          },
        }),
        fetch('/api/v1/growth/goals', {
          headers: {
            Authorization: `Bearer ${token}`,
            'x-studio-id': studio?.id || '',
          },
        }),
      ]);

      if (!oRes.ok) throw new Error('Failed to load performance metrics');

      const [oJson, gJson] = await Promise.all([oRes.json(), gRes.json()]);
      setOverview(oJson.data || oJson);
      setGoals(gJson.data?.goals || []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token) {
      fetchData();
    }
  }, [token]);

  const handleCreateGoal = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSubmittingGoal(true);
      setError(null);
      const res = await fetch('/api/v1/growth/goals', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
          'x-studio-id': studio?.id || '',
        },
        body: JSON.stringify({
          title: goalTitle,
          target_metric: goalMetric,
          target_value: Number(goalTarget),
          period_start: goalStart,
          period_end: goalEnd,
        }),
      });

      if (!res.ok) throw new Error('Failed to save growth goal');

      setShowGoalModal(false);
      await fetchData();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSubmittingGoal(false);
    }
  };

  return (
    <div className="p-6 md:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-lg bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center">
              <BarChart3 className="h-4 w-4" />
            </div>
            <h1 className="text-2xl font-bold text-white tracking-tight">Marketing Performance & Goals</h1>
          </div>
          <p className="text-xs md:text-sm text-muted mt-1">
            Track aggregate conversion funnel efficiency, campaign delivery rates, and active studio growth goals.
          </p>
        </div>

        <button
          onClick={() => setShowGoalModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-primary to-accent hover:from-primary/90 text-white text-xs font-bold rounded-lg shadow-sm shadow-primary/20 transition-all self-start md:self-auto"
        >
          <Plus className="h-4 w-4" /> Set Growth Target
        </button>
      </div>

      <GrowthNavTabs />

      {error && (
        <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs flex items-center gap-2">
          <AlertCircle className="h-4 w-4" />
          <span>{error}</span>
        </div>
      )}

      {/* Aggregate Funnel Benchmarks */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="p-5 rounded-2xl bg-card border border-card-border space-y-2">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-muted">Delivery Rate</span>
          <div className="text-2xl font-bold text-white font-mono">
            {overview?.kpis?.campaign_delivery_rate_pct !== null ? `${overview?.kpis?.campaign_delivery_rate_pct}%` : 'N/A'}
          </div>
          <p className="text-[11px] text-muted">Delivered vs sent emails</p>
        </div>

        <div className="p-5 rounded-2xl bg-card border border-card-border space-y-2">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-muted">Open Rate</span>
          <div className="text-2xl font-bold text-white font-mono">
            {overview?.kpis?.campaign_open_rate_pct !== null ? `${overview?.kpis?.campaign_open_rate_pct}%` : 'N/A'}
          </div>
          <p className="text-[11px] text-muted">Unique email opens</p>
        </div>

        <div className="p-5 rounded-2xl bg-card border border-card-border space-y-2">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-muted">Click-Through Rate</span>
          <div className="text-2xl font-bold text-white font-mono">
            {overview?.kpis?.campaign_click_rate_pct !== null ? `${overview?.kpis?.campaign_click_rate_pct}%` : 'N/A'}
          </div>
          <p className="text-[11px] text-muted">CTA button clicks</p>
        </div>

        <div className="p-5 rounded-2xl bg-card border border-card-border space-y-2">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-muted">Conversion Rate</span>
          <div className="text-2xl font-bold text-emerald-400 font-mono">
            {overview?.kpis?.campaign_conversion_rate_pct !== null ? `${overview?.kpis?.campaign_conversion_rate_pct}%` : 'N/A'}
          </div>
          <p className="text-[11px] text-muted">Bookings / transactions</p>
        </div>
      </div>

      {/* Active Growth Goals Section */}
      <div className="p-6 rounded-2xl bg-card border border-card-border space-y-4 shadow-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Target className="h-4 w-4 text-accent" />
            <h2 className="text-sm font-bold text-white">Active Studio Growth Targets</h2>
          </div>
        </div>

        {loading ? (
          <div className="py-12 text-center text-xs text-muted">Loading growth targets...</div>
        ) : goals.length === 0 ? (
          <div className="py-12 text-center text-xs text-muted bg-card-border/10 rounded-xl border border-dashed border-card-border">
            No active growth targets set. Click &quot;Set Growth Target&quot; to define quarterly reactivation or revenue milestones.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {goals.map((g) => (
              <div key={g.id} className="p-4 rounded-xl bg-card-border/20 border border-card-border/60 space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold text-white">{g.title}</h3>
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                    {g.status}
                  </span>
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs font-mono">
                    <span className="text-muted">Progress:</span>
                    <span className="font-bold text-white">
                      {g.current_value} / {g.target_value} ({g.progress_pct}%)
                    </span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-card-border/60 overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-primary to-accent transition-all duration-500"
                      style={{ width: `${Math.min(100, g.progress_pct)}%` }}
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between text-[11px] text-muted pt-1 border-t border-card-border/40">
                  <span>Metric: {g.target_metric}</span>
                  <span>Ends: {new Date(g.period_end).toLocaleDateString()}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Goal Modal */}
      {showGoalModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-card border border-card-border rounded-2xl p-6 space-y-4 shadow-xl">
            <h3 className="text-sm font-bold text-white">Set New Studio Growth Goal</h3>
            <form onSubmit={handleCreateGoal} className="space-y-3.5">
              <div className="space-y-1">
                <label className="text-xs text-muted">Goal Title</label>
                <input
                  type="text"
                  required
                  value={goalTitle}
                  onChange={(e) => setGoalTitle(e.target.value)}
                  className="w-full px-3 py-2 bg-card-border/20 border border-card-border text-xs rounded-lg text-white"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs text-muted">Metric Target</label>
                <select
                  value={goalMetric}
                  onChange={(e) => setGoalMetric(e.target.value)}
                  className="w-full px-3 py-2 bg-card-border/20 border border-card-border text-xs rounded-lg text-white"
                >
                  <option value="REACTIVATION_COUNT">Client Reactivations</option>
                  <option value="CAMPAIGN_CONVERSIONS">Campaign Conversions</option>
                  <option value="ATTRIBUTED_REVENUE">Attributed Revenue</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs text-muted">Target Value</label>
                <input
                  type="number"
                  required
                  min="1"
                  value={goalTarget}
                  onChange={(e) => setGoalTarget(Number(e.target.value))}
                  className="w-full px-3 py-2 bg-card-border/20 border border-card-border text-xs rounded-lg text-white font-mono"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <label className="text-xs text-muted">Start Date</label>
                  <input
                    type="date"
                    required
                    value={goalStart}
                    onChange={(e) => setGoalStart(e.target.value)}
                    className="w-full px-3 py-2 bg-card-border/20 border border-card-border text-xs rounded-lg text-white"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-muted">End Date</label>
                  <input
                    type="date"
                    required
                    value={goalEnd}
                    onChange={(e) => setGoalEnd(e.target.value)}
                    className="w-full px-3 py-2 bg-card-border/20 border border-card-border text-xs rounded-lg text-white"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowGoalModal(false)}
                  className="px-3 py-1.5 text-xs text-muted hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingGoal}
                  className="px-4 py-2 bg-primary hover:bg-primary/90 text-white text-xs font-bold rounded-lg"
                >
                  {submittingGoal ? 'Saving...' : 'Create Target'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
