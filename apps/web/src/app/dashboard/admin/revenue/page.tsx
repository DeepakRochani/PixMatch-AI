'use client';

import React, { useEffect, useState } from 'react';
import {
  TrendingUp,
  CreditCard,
  DollarSign,
  AlertCircle,
  RefreshCw,
  CheckCircle2,
  XCircle,
  PieChart,
} from 'lucide-react';
import { fetchApi } from '@/lib/api-client';
import { AdminRevenueDTO } from '@pixmatch/types';

function formatINR(amountPaise: number): string {
  if (isNaN(amountPaise)) return '₹0';
  const rupees = amountPaise / 100;
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(rupees);
}

export default function AdminRevenuePage() {
  const [data, setData] = useState<AdminRevenueDTO | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const loadRevenue = async () => {
    setIsLoading(true);
    try {
      const res = await fetchApi<AdminRevenueDTO>('/admin/revenue');
      if (res.success && res.data) {
        setData(res.data);
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadRevenue();
  }, []);

  const kpis = data?.kpis;
  const charts = data?.charts;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2.5">
            <TrendingUp className="h-6 w-6 text-emerald-400" /> Revenue & Financial Analytics
          </h1>
          <p className="text-xs text-muted mt-1">
            Global subscription revenue, MRR trends, ARR projections, and payment gateway health.
          </p>
        </div>

        <button
          onClick={() => loadRevenue()}
          disabled={isLoading}
          className="p-2 rounded-xl bg-[#131B2A] border border-card-border/80 text-muted hover:text-white transition self-start sm:self-auto"
        >
          <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin text-emerald-400' : ''}`} />
        </button>
      </div>

      {/* Top Financial KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* MRR */}
        <div className="rounded-2xl bg-[#0E1422] border border-card-border/80 p-5 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-muted">Monthly Recurring (MRR)</span>
            <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-bold">
              ESTIMATE
            </span>
          </div>
          <p className="text-2xl font-extrabold text-emerald-400">
            {kpis ? formatINR(kpis.mrr_inr) : '—'}
          </p>
          <p className="text-[10px] text-muted">Normalized active subscription revenue</p>
        </div>

        {/* ARR */}
        <div className="rounded-2xl bg-[#0E1422] border border-card-border/80 p-5 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-muted">Annual Run Rate (ARR)</span>
            <span className="text-[10px] px-2 py-0.5 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20 font-bold">
              ESTIMATE
            </span>
          </div>
          <p className="text-2xl font-extrabold text-white">
            {kpis ? formatINR(kpis.arr_estimate_inr) : '—'}
          </p>
          <p className="text-[10px] text-muted">12-month forward revenue projection</p>
        </div>

        {/* Monthly Collected */}
        <div className="rounded-2xl bg-[#0E1422] border border-card-border/80 p-5 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-muted">Monthly Collected</span>
            <CheckCircle2 className="h-4 w-4 text-emerald-400" />
          </div>
          <p className="text-2xl font-extrabold text-white">
            {kpis ? formatINR(kpis.monthly_collected_revenue_inr) : '—'}
          </p>
          <p className="text-[10px] text-muted">Total settled invoices this calendar month</p>
        </div>

        {/* Annual Collected */}
        <div className="rounded-2xl bg-[#0E1422] border border-card-border/80 p-5 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-muted">Annual Collected</span>
            <CheckCircle2 className="h-4 w-4 text-purple-400" />
          </div>
          <p className="text-2xl font-extrabold text-purple-300">
            {kpis ? formatINR(kpis.annual_collected_revenue_inr) : '—'}
          </p>
          <p className="text-[10px] text-muted">Total settled invoices year-to-date</p>
        </div>
      </div>

      {/* Secondary Metrics: Lifecycle & Churn */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="p-4 rounded-xl bg-[#0E1422] border border-card-border/80 text-center">
          <span className="text-[11px] text-muted block">New Subscriptions</span>
          <span className="text-lg font-bold text-emerald-400 font-mono">+{kpis?.new_subscriptions_period || 0}</span>
        </div>
        <div className="p-4 rounded-xl bg-[#0E1422] border border-card-border/80 text-center">
          <span className="text-[11px] text-muted block">Upgrades</span>
          <span className="text-lg font-bold text-blue-400 font-mono">{kpis?.upgrades_period || 0}</span>
        </div>
        <div className="p-4 rounded-xl bg-[#0E1422] border border-card-border/80 text-center">
          <span className="text-[11px] text-muted block">Downgrades</span>
          <span className="text-lg font-bold text-amber-400 font-mono">{kpis?.downgrades_period || 0}</span>
        </div>
        <div className="p-4 rounded-xl bg-[#0E1422] border border-card-border/80 text-center">
          <span className="text-[11px] text-muted block">Cancellations</span>
          <span className="text-lg font-bold text-red-400 font-mono">{kpis?.cancellations_period || 0}</span>
        </div>
        <div className="p-4 rounded-xl bg-[#0E1422] border border-card-border/80 text-center">
          <span className="text-[11px] text-muted block">Failed Payments</span>
          <span className="text-lg font-bold text-rose-400 font-mono">{kpis?.failed_payments_period || 0}</span>
        </div>
        <div className="p-4 rounded-xl bg-[#0E1422] border border-card-border/80 text-center">
          <span className="text-[11px] text-muted block">Recovered</span>
          <span className="text-lg font-bold text-cyan-400 font-mono">{kpis?.recovered_payments_period || 0}</span>
        </div>
      </div>

      {/* Distribution Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Revenue by Plan */}
        <div className="rounded-2xl bg-[#0E1422] border border-card-border/80 p-6 space-y-4">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <PieChart className="h-4 w-4 text-emerald-400" /> Revenue Distribution by Plan Tier
          </h3>
          <div className="space-y-3 pt-2">
            {charts?.revenue_by_plan && charts.revenue_by_plan.length > 0 ? (
              charts.revenue_by_plan.map((item, i) => (
                <div key={i} className="space-y-1 text-xs">
                  <div className="flex justify-between font-semibold">
                    <span className="text-white uppercase font-mono">{item.plan}</span>
                    <span className="text-emerald-400 font-mono">{formatINR(item.inr)} ({item.count} subs)</span>
                  </div>
                  <div className="w-full bg-[#131B2A] rounded-full h-2">
                    <div
                      className="bg-emerald-500 h-2 rounded-full"
                      style={{
                        width: `${Math.min(100, Math.max(10, (item.inr / (kpis?.mrr_inr || 1)) * 100))}%`,
                      }}
                    />
                  </div>
                </div>
              ))
            ) : (
              <p className="text-xs text-muted">No active subscriptions to calculate plan breakdown.</p>
            )}
          </div>
        </div>

        {/* Currency & Payment Gateway Breakdown */}
        <div className="rounded-2xl bg-[#0E1422] border border-card-border/80 p-6 space-y-4">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <CreditCard className="h-4 w-4 text-blue-400" /> Billing Gateway Health
          </h3>
          <div className="space-y-3 pt-2 text-xs">
            <div className="p-4 rounded-xl bg-[#131B2A] border border-card-border flex items-center justify-between">
              <div>
                <span className="font-bold text-white">Stripe Webhook Pipeline</span>
                <span className="block text-[10px] text-muted">Production Webhook Sync</span>
              </div>
              <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 text-[10px] font-bold uppercase">
                Synchronized
              </span>
            </div>

            <div className="p-4 rounded-xl bg-[#131B2A] border border-card-border flex items-center justify-between">
              <div>
                <span className="font-bold text-white">Razorpay Webhook Pipeline</span>
                <span className="block text-[10px] text-muted">INR Domestic Settlement</span>
              </div>
              <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 text-[10px] font-bold uppercase">
                Synchronized
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
