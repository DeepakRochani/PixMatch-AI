'use client';

import React, { useState, useEffect } from 'react';
import {
  PieChart,
  DollarSign,
  TrendingUp,
  Receipt,
  Layers,
  ArrowRight,
} from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import { BusinessNavTabs } from '@/components/dashboard/BusinessNavTabs';
import { BusinessRevenueBreakdownDTO, BusinessOverviewDTO } from '@pixmatch/types';

export default function BusinessProfitabilityPage() {
  const { token, studio } = useAuth();
  const [loading, setLoading] = useState(true);
  const [overview, setOverview] = useState<BusinessOverviewDTO | null>(null);
  const [revBreakdown, setRevBreakdown] = useState<BusinessRevenueBreakdownDTO[]>([]);
  const [expBreakdown, setExpBreakdown] = useState<BusinessRevenueBreakdownDTO[]>([]);

  useEffect(() => {
    async function loadData() {
      if (!token) return;
      try {
        setLoading(true);
        const [oRes, rRes, eRes] = await Promise.all([
          fetch('/api/v1/business/overview', {
            headers: { Authorization: `Bearer ${token}`, 'x-studio-id': studio?.id || '' },
          }),
          fetch('/api/v1/business/breakdown/revenue', {
            headers: { Authorization: `Bearer ${token}`, 'x-studio-id': studio?.id || '' },
          }),
          fetch('/api/v1/business/breakdown/expenses', {
            headers: { Authorization: `Bearer ${token}`, 'x-studio-id': studio?.id || '' },
          }),
        ]);

        if (oRes.ok) setOverview(await oRes.json());
        if (rRes.ok) setRevBreakdown(await rRes.json());
        if (eRes.ok) setExpBreakdown(await eRes.json());
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [token]);

  const currency = studio?.currency || 'USD';

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold text-white tracking-tight">
          Profitability & Cost Analysis
        </h1>
        <p className="text-sm text-muted mt-1">
          Detailed income vs expense categorization, operating expense ratios, and net profit margins.
        </p>
      </div>

      <BusinessNavTabs />

      {loading ? (
        <div className="py-20 text-center text-xs text-muted">Calculating profit and expense breakdowns...</div>
      ) : (
        <div className="space-y-6">
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-5 rounded-2xl bg-card border border-card-border space-y-2">
              <span className="text-xs font-semibold text-muted uppercase">Gross Revenue</span>
              <p className="text-2xl font-bold text-emerald-400">
                {currency} {overview?.total_revenue?.toLocaleString(undefined, { minimumFractionDigits: 2 }) || '0.00'}
              </p>
              <p className="text-[11px] text-muted">100% of recorded client earnings</p>
            </div>

            <div className="p-5 rounded-2xl bg-card border border-card-border space-y-2">
              <span className="text-xs font-semibold text-muted uppercase">Operating Expenses</span>
              <p className="text-2xl font-bold text-amber-400">
                {currency} {overview?.total_expenses?.toLocaleString(undefined, { minimumFractionDigits: 2 }) || '0.00'}
              </p>
              <p className="text-[11px] text-muted">
                {overview?.total_revenue && overview.total_revenue > 0
                  ? `${((overview.total_expenses / overview.total_revenue) * 100).toFixed(1)}% of revenue`
                  : '0% of revenue'}
              </p>
            </div>

            <div className="p-5 rounded-2xl bg-card border border-card-border space-y-2">
              <span className="text-xs font-semibold text-muted uppercase">Net Profit & Margin</span>
              <p className="text-2xl font-bold text-white">
                {currency} {overview?.net_profit?.toLocaleString(undefined, { minimumFractionDigits: 2 }) || '0.00'}
              </p>
              <p className="text-[11px] font-bold text-primary">
                {overview?.profit_margin_pct || 0}% Net Profit Margin
              </p>
            </div>
          </div>

          {/* Breakdown Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Revenue Categories */}
            <div className="p-6 rounded-2xl bg-card border border-card-border space-y-4">
              <div className="flex items-center gap-2">
                <DollarSign className="h-4 w-4 text-emerald-400" />
                <h3 className="text-sm font-bold text-white">Revenue Sources by Category</h3>
              </div>

              {revBreakdown.length === 0 ? (
                <p className="text-xs text-muted py-4">No revenue transactions recorded.</p>
              ) : (
                <div className="space-y-3">
                  {revBreakdown.map((r, idx) => (
                    <div key={idx} className="space-y-1.5">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-semibold text-white">{r.category}</span>
                        <span className="text-muted font-mono">
                          {currency} {r.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })} ({r.percentage}%)
                        </span>
                      </div>
                      <div className="h-2 w-full rounded-full bg-card-border overflow-hidden">
                        <div
                          className="h-full rounded-full bg-emerald-400"
                          style={{ width: `${r.percentage}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Expense Categories */}
            <div className="p-6 rounded-2xl bg-card border border-card-border space-y-4">
              <div className="flex items-center gap-2">
                <Receipt className="h-4 w-4 text-amber-400" />
                <h3 className="text-sm font-bold text-white">Expense Distribution by Category</h3>
              </div>

              {expBreakdown.length === 0 ? (
                <p className="text-xs text-muted py-4">No expense transactions recorded.</p>
              ) : (
                <div className="space-y-3">
                  {expBreakdown.map((e, idx) => (
                    <div key={idx} className="space-y-1.5">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-semibold text-white">{e.category}</span>
                        <span className="text-muted font-mono">
                          {currency} {e.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })} ({e.percentage}%)
                        </span>
                      </div>
                      <div className="h-2 w-full rounded-full bg-card-border overflow-hidden">
                        <div
                          className="h-full rounded-full bg-amber-400"
                          style={{ width: `${e.percentage}%` }}
                        />
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
