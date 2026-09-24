'use client';

import React, { useState, useEffect } from 'react';
import {
  Target,
  Plus,
  CheckCircle2,
  AlertCircle,
  TrendingUp,
  Calendar,
  Trash2,
} from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import { BusinessNavTabs } from '@/components/dashboard/BusinessNavTabs';
import {
  StudioBusinessGoalDTO,
  BusinessGoalMetricType,
  BusinessGoalPeriodType,
} from '@pixmatch/types';

export default function BusinessGoalsPage() {
  const { token, studio } = useAuth();
  const [loading, setLoading] = useState(true);
  const [goals, setGoals] = useState<StudioBusinessGoalDTO[]>([]);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    title: 'Monthly Revenue Target',
    metric_type: BusinessGoalMetricType.REVENUE,
    target_value: '10000',
    period_type: BusinessGoalPeriodType.MONTHLY,
    start_date: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0],
    end_date: new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).toISOString().split('T')[0],
    notes: '',
  });

  const fetchGoals = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/v1/business/goals', {
        headers: {
          Authorization: `Bearer ${token}`,
          'x-studio-id': studio?.id || '',
        },
      });
      if (res.ok) setGoals(await res.json());
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token) fetchGoals();
  }, [token]);

  const handleCreateGoal = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSubmitting(true);
      setError(null);
      const targetVal = parseFloat(formData.target_value);
      if (isNaN(targetVal) || targetVal <= 0) {
        throw new Error('Please provide a valid target value');
      }

      const res = await fetch('/api/v1/business/goals', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
          'x-studio-id': studio?.id || '',
        },
        body: JSON.stringify({
          ...formData,
          target_value: targetVal,
          currency: studio?.currency || 'USD',
        }),
      });

      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.error || 'Failed to create goal');
      }

      setIsCreateOpen(false);
      fetchGoals();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteGoal = async (goalId: string) => {
    if (!confirm('Are you sure you want to delete this business goal?')) return;
    try {
      await fetch(`/api/v1/business/goals/${goalId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}`, 'x-studio-id': studio?.id || '' },
      });
      fetchGoals();
    } catch (err) {
      console.error(err);
    }
  };

  const currency = studio?.currency || 'USD';

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-white tracking-tight">
            Business Targets & Goals
          </h1>
          <p className="text-sm text-muted mt-1">
            Set quarterly revenue, booking count, and gallery delivery goals with real-time automatic progress evaluation.
          </p>
        </div>

        <button
          onClick={() => {
            setError(null);
            setIsCreateOpen(true);
          }}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold bg-primary text-white hover:bg-primary/90 shadow-md shadow-primary/20 transition"
        >
          <Plus className="h-4 w-4" />
          Create New Goal
        </button>
      </div>

      <BusinessNavTabs />

      {loading ? (
        <div className="py-20 text-center text-xs text-muted">Loading business targets...</div>
      ) : goals.length === 0 ? (
        <div className="p-12 rounded-2xl bg-card border border-card-border text-center space-y-3 max-w-lg mx-auto">
          <Target className="h-12 w-12 text-muted mx-auto" />
          <h3 className="text-sm font-bold text-white">No active business goals</h3>
          <p className="text-xs text-muted">
            Create your first revenue, profit, or booking target to track studio progress.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {goals.map((g) => (
            <div
              key={g.id}
              className={`p-5 rounded-2xl bg-card border transition space-y-4 ${
                g.status === 'ACHIEVED'
                  ? 'border-emerald-500/40 bg-emerald-500/5'
                  : g.status === 'MISSED'
                  ? 'border-red-500/30'
                  : 'border-card-border hover:border-primary/40'
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <span
                    className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold uppercase mb-1.5 ${
                      g.status === 'ACHIEVED'
                        ? 'bg-emerald-500/20 text-emerald-400'
                        : g.status === 'MISSED'
                        ? 'bg-red-500/20 text-red-400'
                        : 'bg-primary/20 text-primary'
                    }`}
                  >
                    {g.status}
                  </span>
                  <h3 className="text-sm font-bold text-white line-clamp-1">{g.title}</h3>
                </div>
                <button
                  onClick={() => handleDeleteGoal(g.id)}
                  className="text-muted hover:text-red-400 p-1 rounded"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>

              <div className="space-y-2">
                <div className="flex items-baseline justify-between">
                  <span className="text-2xl font-bold font-mono text-white">
                    {g.metric_type === 'REVENUE' || g.metric_type === 'PROFIT' || g.metric_type === 'AVERAGE_ORDER_VALUE'
                      ? `${currency} `
                      : ''}
                    {g.current_value.toLocaleString()}
                  </span>
                  <span className="text-xs text-muted font-mono">
                    Target:{' '}
                    {g.metric_type === 'REVENUE' || g.metric_type === 'PROFIT' || g.metric_type === 'AVERAGE_ORDER_VALUE'
                      ? `${currency} `
                      : ''}
                    {g.target_value.toLocaleString()}
                  </span>
                </div>

                <div className="h-2.5 w-full rounded-full bg-card-border overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${
                      g.progress_pct >= 100
                        ? 'bg-emerald-400'
                        : g.progress_pct >= 60
                        ? 'bg-primary'
                        : 'bg-amber-400'
                    }`}
                    style={{ width: `${Math.min(100, g.progress_pct)}%` }}
                  />
                </div>

                <div className="flex items-center justify-between text-[11px] text-muted">
                  <span>{g.progress_pct}% Completed</span>
                  <span>{g.period_type}</span>
                </div>
              </div>

              <div className="pt-2 border-t border-card-border/60 flex items-center justify-between text-[11px] text-muted font-mono">
                <span>{new Date(g.start_date).toISOString().split('T')[0]}</span>
                <span>→</span>
                <span>{new Date(g.end_date).toISOString().split('T')[0]}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal: Create Goal */}
      {isCreateOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
          <div className="bg-card border border-card-border rounded-2xl w-full max-w-md p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-card-border">
              <h3 className="text-base font-bold text-white">Set Business Target</h3>
              <button onClick={() => setIsCreateOpen(false)} className="text-muted hover:text-white">
                ✕
              </button>
            </div>

            {error && (
              <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs">
                {error}
              </div>
            )}

            <form onSubmit={handleCreateGoal} className="space-y-4 text-xs">
              <div>
                <label className="block text-muted font-medium mb-1">Goal Title</label>
                <input
                  type="text"
                  required
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full p-2 rounded-lg bg-card-border/30 border border-card-border text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-muted font-medium mb-1">Metric Type</label>
                  <select
                    value={formData.metric_type}
                    onChange={(e) => setFormData({ ...formData, metric_type: e.target.value as any })}
                    className="w-full p-2 rounded-lg bg-card-border/30 border border-card-border text-white"
                  >
                    <option value={BusinessGoalMetricType.REVENUE}>Total Revenue</option>
                    <option value={BusinessGoalMetricType.PROFIT}>Net Profit</option>
                    <option value={BusinessGoalMetricType.BOOKINGS_COUNT}>Bookings Count</option>
                    <option value={BusinessGoalMetricType.GALLERIES_DELIVERED}>Galleries Delivered</option>
                    <option value={BusinessGoalMetricType.AVERAGE_ORDER_VALUE}>Avg Order Value</option>
                  </select>
                </div>

                <div>
                  <label className="block text-muted font-medium mb-1">Target Value</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={formData.target_value}
                    onChange={(e) => setFormData({ ...formData, target_value: e.target.value })}
                    className="w-full p-2 rounded-lg bg-card-border/30 border border-card-border text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-muted font-medium mb-1">Start Date</label>
                  <input
                    type="date"
                    required
                    value={formData.start_date}
                    onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                    className="w-full p-2 rounded-lg bg-card-border/30 border border-card-border text-white"
                  />
                </div>

                <div>
                  <label className="block text-muted font-medium mb-1">End Date</label>
                  <input
                    type="date"
                    required
                    value={formData.end_date}
                    onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                    className="w-full p-2 rounded-lg bg-card-border/30 border border-card-border text-white"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-card-border">
                <button
                  type="button"
                  onClick={() => setIsCreateOpen(false)}
                  className="px-4 py-2 rounded-xl text-muted hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 rounded-xl font-semibold bg-primary text-white hover:bg-primary/90 transition shadow-md"
                >
                  {submitting ? 'Saving...' : 'Create Goal'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
