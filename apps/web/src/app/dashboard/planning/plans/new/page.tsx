'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Target,
  ArrowLeft,
  CheckCircle2,
  AlertTriangle,
  FileSpreadsheet,
  Plus,
  Trash2,
  Calculator,
} from 'lucide-react';
import { PlanningNavTabs } from '@/components/dashboard/PlanningNavTabs';
import { fetchApi } from '@/lib/api-client';
import { BusinessPlanType, BusinessPlanTargetType } from '@pixmatch/types';

export default function NewBusinessPlanPage() {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form State
  const currentYear = new Date().getFullYear();
  const [name, setName] = useState(`Studio Annual Plan FY${currentYear}`);
  const [description, setDescription] = useState('Annual strategic revenue, expense, and booking targets.');
  const [type, setType] = useState<BusinessPlanType>(BusinessPlanType.ANNUAL);
  const [fiscalYear, setFiscalYear] = useState<number>(currentYear);
  const [currency, setCurrency] = useState('INR');

  // Annual Target Quick Inputs
  const [annualRevenue, setAnnualRevenue] = useState<number>(5000000); // 50 Lakhs
  const [annualExpense, setAnnualExpense] = useState<number>(2000000); // 20 Lakhs
  const [annualBookings, setAnnualBookings] = useState<number>(60);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      // Build reconciled annual and 12 monthly targets
      const targets = [];

      // 1. Annual Revenue & 12 Monthly breakdown
      targets.push({
        targetType: BusinessPlanTargetType.REVENUE,
        unit: 'CURRENCY',
        plannedValue: annualRevenue,
        periodYear: fiscalYear,
      });

      const monthlyRev = Math.round(annualRevenue / 12);
      for (let m = 1; m <= 12; m++) {
        // adjust last month for rounding
        const val = m === 12 ? annualRevenue - monthlyRev * 11 : monthlyRev;
        targets.push({
          targetType: BusinessPlanTargetType.REVENUE,
          unit: 'CURRENCY',
          plannedValue: val,
          periodYear: fiscalYear,
          periodMonth: m,
        });
      }

      // 2. Annual Expenses & 12 Monthly breakdown
      targets.push({
        targetType: BusinessPlanTargetType.EXPENSES,
        unit: 'CURRENCY',
        plannedValue: annualExpense,
        periodYear: fiscalYear,
      });

      const monthlyExp = Math.round(annualExpense / 12);
      for (let m = 1; m <= 12; m++) {
        const val = m === 12 ? annualExpense - monthlyExp * 11 : monthlyExp;
        targets.push({
          targetType: BusinessPlanTargetType.EXPENSES,
          unit: 'CURRENCY',
          plannedValue: val,
          periodYear: fiscalYear,
          periodMonth: m,
        });
      }

      // 3. Annual Bookings & 12 Monthly breakdown
      targets.push({
        targetType: BusinessPlanTargetType.BOOKINGS_COUNT,
        unit: 'NUMBER',
        plannedValue: annualBookings,
        periodYear: fiscalYear,
      });

      const monthlyBookings = Math.round(annualBookings / 12);
      for (let m = 1; m <= 12; m++) {
        const val = m === 12 ? annualBookings - monthlyBookings * 11 : monthlyBookings;
        targets.push({
          targetType: BusinessPlanTargetType.BOOKINGS_COUNT,
          unit: 'NUMBER',
          plannedValue: val,
          periodYear: fiscalYear,
          periodMonth: m,
        });
      }

      const payload = {
        name,
        description,
        type,
        fiscalYear,
        currency,
        targets,
      };

      const res = await fetchApi('/planning/plans', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const plan = res.data || (res as any);

      router.push(`/dashboard/planning/plans/${plan.id}`);
    } catch (err: any) {
      console.error('Failed to create plan:', err);
      setError(err.message || 'Failed to create business plan');
      setSubmitting(false);
    }
  };

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link
          href="/dashboard/planning/plans"
          className="p-2 rounded-lg border border-border/60 hover:bg-muted/50 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Create Business Plan</h1>
          <p className="text-sm text-muted-foreground">
            Configure financial and operational target baselines for your studio.
          </p>
        </div>
      </div>

      <PlanningNavTabs />

      {error && (
        <div className="p-4 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-sm flex items-center gap-3">
          <AlertTriangle className="w-5 h-5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="p-6 rounded-2xl border border-border/60 bg-card space-y-6">
          <h3 className="text-base font-bold border-b border-border/40 pb-3">1. Plan Metadata & Scope</h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5 md:col-span-2">
              <label className="text-xs font-semibold text-foreground">Plan Name *</label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3.5 py-2 text-sm rounded-lg border border-border bg-background focus:ring-1 focus:ring-primary focus:outline-none"
                placeholder="e.g. Studio Growth Plan FY2026"
              />
            </div>

            <div className="space-y-1.5 md:col-span-2">
              <label className="text-xs font-semibold text-foreground">Description</label>
              <textarea
                rows={2}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full px-3.5 py-2 text-sm rounded-lg border border-border bg-background focus:ring-1 focus:ring-primary focus:outline-none"
                placeholder="Core strategic objectives and revenue model"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">Plan Type</label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value as BusinessPlanType)}
                className="w-full px-3.5 py-2 text-sm rounded-lg border border-border bg-background focus:ring-1 focus:ring-primary focus:outline-none"
              >
                <option value="ANNUAL">ANNUAL</option>
                <option value="QUARTERLY">QUARTERLY</option>
                <option value="MULTI_YEAR">MULTI YEAR</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">Fiscal Year</label>
              <input
                type="number"
                required
                value={fiscalYear}
                onChange={(e) => setFiscalYear(parseInt(e.target.value, 10))}
                className="w-full px-3.5 py-2 text-sm rounded-lg border border-border bg-background focus:ring-1 focus:ring-primary focus:outline-none"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">Base Currency</label>
              <input
                type="text"
                required
                value={currency}
                onChange={(e) => setCurrency(e.target.value.toUpperCase())}
                className="w-full px-3.5 py-2 text-sm rounded-lg border border-border bg-background focus:ring-1 focus:ring-primary focus:outline-none"
              />
            </div>
          </div>
        </div>

        <div className="p-6 rounded-2xl border border-border/60 bg-card space-y-6">
          <div className="flex items-center justify-between border-b border-border/40 pb-3">
            <div>
              <h3 className="text-base font-bold">2. Core Annual Targets Baseline</h3>
              <p className="text-xs text-muted-foreground">
                Annual targets are automatically distributed and reconciled across all 12 fiscal months.
              </p>
            </div>
            <span className="flex items-center gap-1 text-xs font-semibold text-emerald-500 bg-emerald-500/10 px-2.5 py-1 rounded-md">
              <Calculator className="w-3.5 h-3.5" /> Auto-Reconciled
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            <div className="p-4 rounded-xl bg-muted/40 border border-border/40 space-y-2">
              <label className="text-xs font-semibold text-muted-foreground">Annual Revenue Target (₹)</label>
              <input
                type="number"
                required
                value={annualRevenue}
                onChange={(e) => setAnnualRevenue(parseFloat(e.target.value) || 0)}
                className="w-full px-3.5 py-2 text-base font-bold rounded-lg border border-border bg-background focus:ring-1 focus:ring-primary focus:outline-none"
              />
              <p className="text-[11px] text-muted-foreground">
                Monthly Avg: ₹{Math.round(annualRevenue / 12).toLocaleString()}
              </p>
            </div>

            <div className="p-4 rounded-xl bg-muted/40 border border-border/40 space-y-2">
              <label className="text-xs font-semibold text-muted-foreground">Annual Expense Cap (₹)</label>
              <input
                type="number"
                required
                value={annualExpense}
                onChange={(e) => setAnnualExpense(parseFloat(e.target.value) || 0)}
                className="w-full px-3.5 py-2 text-base font-bold rounded-lg border border-border bg-background focus:ring-1 focus:ring-primary focus:outline-none"
              />
              <p className="text-[11px] text-muted-foreground">
                Monthly Avg: ₹{Math.round(annualExpense / 12).toLocaleString()}
              </p>
            </div>

            <div className="p-4 rounded-xl bg-muted/40 border border-border/40 space-y-2">
              <label className="text-xs font-semibold text-muted-foreground">Annual Bookings Count</label>
              <input
                type="number"
                required
                value={annualBookings}
                onChange={(e) => setAnnualBookings(parseInt(e.target.value, 10) || 0)}
                className="w-full px-3.5 py-2 text-base font-bold rounded-lg border border-border bg-background focus:ring-1 focus:ring-primary focus:outline-none"
              />
              <p className="text-[11px] text-muted-foreground">
                Monthly Avg: {(annualBookings / 12).toFixed(1)} shoots
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 pt-2">
          <Link
            href="/dashboard/planning/plans"
            className="px-4 py-2.5 text-xs font-medium border border-border rounded-lg hover:bg-muted/50 transition-colors"
          >
            Cancel
          </Link>
          <button
            type="submit"
            disabled={submitting}
            className="flex items-center gap-2 px-5 py-2.5 text-xs font-semibold bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors shadow-sm disabled:opacity-50"
          >
            {submitting ? 'Creating Plan...' : 'Create Draft Plan'}
          </button>
        </div>
      </form>
    </div>
  );
}
