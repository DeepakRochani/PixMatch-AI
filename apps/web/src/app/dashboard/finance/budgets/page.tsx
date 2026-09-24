'use client';

import React, { useState, useEffect } from 'react';
import { PiggyBank, Plus, RefreshCw, AlertTriangle, CheckCircle2, TrendingUp, BarChart2 } from 'lucide-react';
import { FinanceNavTabs } from '@/components/dashboard/FinanceNavTabs';
import { fetchApi } from '@/lib/api-client';

export default function FinanceBudgetsPage() {
  const [budgets, setBudgets] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [showModal, setShowModal] = useState(false);
  const [name, setName] = useState('');
  const [amount, setAmount] = useState('');
  const [periodType, setPeriodType] = useState('MONTHLY');
  const [categoryId, setCategoryId] = useState('');
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState(new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0]);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [budRes, catRes] = await Promise.all([
        fetchApi('/finance/budgets'),
        fetchApi('/finance/categories'),
      ]);

      if (budRes && !budRes.error) {
        setBudgets(Array.isArray(budRes.data) ? budRes.data : Array.isArray(budRes) ? budRes : []);
      }
      if (catRes && !catRes.error) {
        setCategories(Array.isArray(catRes.data) ? catRes.data : Array.isArray(catRes) ? catRes : []);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load budgets');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const amount_cents = Math.round(parseFloat(amount) * 100);
      const res = await fetchApi('/finance/budgets', {
        method: 'POST',
        body: JSON.stringify({
          name,
          amount_cents,
          period_type: periodType,
          category_id: categoryId || undefined,
          start_date: startDate,
          end_date: endDate,
        }),
      });

      if (res.error) throw new Error(res.error.message);
      setShowModal(false);
      setName('');
      setAmount('');
      loadData();
    } catch (err: any) {
      alert(err.message || 'Error creating budget');
    }
  };

  const formatCents = (cents?: number) => {
    const val = (cents || 0) / 100;
    return `$${val.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2.5">
            <PiggyBank className="h-7 w-7 text-primary" />
            Budget & Spend Variance Control
          </h1>
          <p className="text-sm text-muted mt-1">
            Set periodic studio expense budgets, project cost caps, and monitor real-time spend variance.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={loadData}
            className="flex items-center gap-1.5 px-3 py-2 bg-card-bg border border-card-border rounded-lg text-xs font-medium text-white hover:bg-card-border/40 transition"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Refresh
          </button>
          <button
            onClick={() => setShowModal(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-primary hover:bg-primary-hover text-black rounded-lg text-xs font-semibold shadow-sm transition"
          >
            <Plus className="h-4 w-4" />
            Create Budget
          </button>
        </div>
      </div>

      <FinanceNavTabs />

      {error && (
        <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm flex items-center gap-2">
          <AlertTriangle className="h-5 w-5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Budgets Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {budgets.map((b) => {
          const actualCents = b.entries?.reduce((sum: number, e: any) => sum + (e.actual_amount_cents || 0), 0) || 0;
          const varianceCents = b.amount_cents - actualCents;
          const percentUsed = Math.min(100, Math.round((actualCents / (b.amount_cents || 1)) * 100));

          return (
            <div key={b.id} className="p-5 rounded-2xl bg-card-bg border border-card-border flex flex-col justify-between space-y-4">
              <div>
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-semibold tracking-wider text-primary uppercase bg-primary/10 px-2 py-0.5 rounded-full">
                    {b.period_type}
                  </span>
                  <span className="text-xs text-muted">
                    {new Date(b.start_date).toLocaleDateString()} - {new Date(b.end_date).toLocaleDateString()}
                  </span>
                </div>
                <h3 className="text-base font-semibold text-white mt-2">{b.name}</h3>
                {b.category?.name && <p className="text-xs text-muted">Category: {b.category.name}</p>}
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted">Spend Progress</span>
                  <span className="text-white font-medium">{percentUsed}%</span>
                </div>
                <div className="w-full h-2 rounded-full bg-card-border/50 overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${
                      percentUsed > 90 ? 'bg-rose-500' : percentUsed > 70 ? 'bg-amber-500' : 'bg-primary'
                    }`}
                    style={{ width: `${percentUsed}%` }}
                  />
                </div>
                <div className="flex items-center justify-between text-xs pt-1">
                  <div>
                    <span className="text-[10px] text-muted block">Budgeted</span>
                    <span className="font-semibold text-white">{formatCents(b.amount_cents)}</span>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] text-muted block">Actual Spend</span>
                    <span className="font-semibold text-white">{formatCents(actualCents)}</span>
                  </div>
                </div>
              </div>

              <div className="pt-3 border-t border-card-border/40 flex items-center justify-between text-xs">
                <span className="text-muted">Remaining Variance:</span>
                <span className={`font-bold ${varianceCents >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                  {formatCents(varianceCents)}
                </span>
              </div>
            </div>
          );
        })}

        {budgets.length === 0 && !loading && (
          <div className="col-span-full p-12 text-center rounded-2xl bg-card-bg border border-card-border text-muted">
            <PiggyBank className="h-12 w-12 mx-auto text-muted mb-3" />
            <h3 className="text-sm font-semibold text-white">No budgets configured</h3>
            <p className="text-xs text-muted mt-1">Create monthly operational budgets or project spending caps.</p>
          </div>
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-card-bg border border-card-border rounded-2xl max-w-md w-full p-6 space-y-4">
            <h3 className="text-lg font-bold text-white">Create Budget</h3>
            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-muted mb-1">Budget Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Q3 Marketing & Gear Maintenance"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3 py-2 bg-card-border/40 border border-card-border rounded-lg text-sm text-white focus:outline-none focus:border-primary"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-muted mb-1">Budget Amount ($)</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="w-full px-3 py-2 bg-card-border/40 border border-card-border rounded-lg text-sm text-white focus:outline-none focus:border-primary"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-muted mb-1">Period</label>
                  <select
                    value={periodType}
                    onChange={(e) => setPeriodType(e.target.value)}
                    className="w-full px-3 py-2 bg-card-border/40 border border-card-border rounded-lg text-sm text-white focus:outline-none focus:border-primary"
                  >
                    <option value="MONTHLY">Monthly</option>
                    <option value="QUARTERLY">Quarterly</option>
                    <option value="YEARLY">Yearly</option>
                    <option value="CUSTOM">Custom Range</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-muted mb-1">Start Date</label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full px-3 py-2 bg-card-border/40 border border-card-border rounded-lg text-sm text-white focus:outline-none focus:border-primary"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-muted mb-1">End Date</label>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full px-3 py-2 bg-card-border/40 border border-card-border rounded-lg text-sm text-white focus:outline-none focus:border-primary"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 bg-card-border/40 text-white rounded-lg text-xs font-medium hover:bg-card-border/60 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-primary text-black rounded-lg text-xs font-semibold hover:bg-primary-hover transition"
                >
                  Save Budget
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
