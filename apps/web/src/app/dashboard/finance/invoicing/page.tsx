'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Receipt,
  FileText,
  DollarSign,
  TrendingUp,
  AlertTriangle,
  Clock,
  CheckCircle2,
  Plus,
  ArrowUpRight,
  CreditCard,
  Calendar,
  RefreshCw,
  Search,
  ExternalLink,
  ShieldCheck,
  Percent,
} from 'lucide-react';
import { FinanceNavTabs } from '@/components/dashboard/FinanceNavTabs';
import { InvoicingNavTabs } from '@/components/dashboard/InvoicingNavTabs';
import { fetchApi } from '@/lib/api-client';

export default function InvoicingDashboardPage() {
  const [loading, setLoading] = useState(true);
  const [metrics, setMetrics] = useState<any>(null);
  const [recentInvoices, setRecentInvoices] = useState<any[]>([]);
  const [aging, setAging] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [evaluating, setEvaluating] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [mRes, invRes, ageRes] = await Promise.all([
        fetchApi('/finance/invoicing/metrics'),
        fetchApi('/finance/invoicing/invoices?limit=5'),
        fetchApi('/finance/invoicing/reports/aging'),
      ]);

      if (mRes && !mRes.error) {
        setMetrics(mRes.data || mRes);
      }
      if (invRes && !invRes.error) {
        setRecentInvoices(invRes.data || invRes);
      }
      if (ageRes && !ageRes.error) {
        setAging(ageRes.data || ageRes);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load invoicing metrics.');
    } finally {
      setLoading(false);
    }
  };

  const handleEvaluateOverdue = async () => {
    setEvaluating(true);
    try {
      await fetchApi('/finance/invoicing/overdue/evaluate', { method: 'POST' });
      await loadData();
    } catch (err: any) {
      console.error(err);
    } finally {
      setEvaluating(false);
    }
  };

  const formatCurrency = (amountMinor: number = 0, currency: string = 'INR') => {
    const symbol = currency === 'INR' ? '₹' : '$';
    return `${symbol}${(amountMinor / 100).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;
  };

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2.5">
            <Receipt className="h-7 w-7 text-primary" />
            Studio Invoicing & Business Payments 2.0
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Commercial invoicing, online payments, partial settlements, installment schedules & collections.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleEvaluateOverdue}
            disabled={evaluating}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium bg-card hover:bg-card-border/60 border border-card-border rounded-lg text-foreground transition"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${evaluating ? 'animate-spin' : ''}`} />
            Run Overdue Engine
          </button>
          <Link
            href="/dashboard/finance/invoicing/create"
            className="flex items-center gap-2 px-4 py-2 text-xs font-semibold bg-primary hover:bg-primary/90 text-primary-foreground rounded-lg shadow-sm transition"
          >
            <Plus className="h-4 w-4" />
            New Invoice
          </Link>
        </div>
      </div>

      <FinanceNavTabs />
      <InvoicingNavTabs />

      {/* Metrics Row 1: Core Financials */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-card border border-card-border p-5 rounded-2xl shadow-sm">
          <div className="flex items-center justify-between text-muted-foreground mb-2">
            <span className="text-xs font-medium">Total Invoiced</span>
            <div className="p-2 bg-primary/10 text-primary rounded-xl">
              <FileText className="h-4 w-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-foreground">
            {formatCurrency(metrics?.total_invoiced_minor || 0)}
          </div>
          <p className="text-xs text-muted-foreground mt-1.5">
            {metrics?.invoices_count || 0} commercial invoices created
          </p>
        </div>

        <div className="bg-card border border-card-border p-5 rounded-2xl shadow-sm">
          <div className="flex items-center justify-between text-muted-foreground mb-2">
            <span className="text-xs font-medium">Collected Revenue</span>
            <div className="p-2 bg-emerald-500/10 text-emerald-500 rounded-xl">
              <DollarSign className="h-4 w-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-emerald-500">
            {formatCurrency(metrics?.total_collected_minor || 0)}
          </div>
          <p className="text-xs text-muted-foreground mt-1.5">
            Collection Rate: <span className="text-emerald-400 font-semibold">{metrics?.collection_rate_percentage || 0}%</span>
          </p>
        </div>

        <div className="bg-card border border-card-border p-5 rounded-2xl shadow-sm">
          <div className="flex items-center justify-between text-muted-foreground mb-2">
            <span className="text-xs font-medium">Outstanding Balance</span>
            <div className="p-2 bg-amber-500/10 text-amber-500 rounded-xl">
              <Clock className="h-4 w-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-amber-500">
            {formatCurrency(metrics?.total_outstanding_minor || 0)}
          </div>
          <p className="text-xs text-muted-foreground mt-1.5">
            Awaiting client payment settlement
          </p>
        </div>

        <div className="bg-card border border-card-border p-5 rounded-2xl shadow-sm">
          <div className="flex items-center justify-between text-muted-foreground mb-2">
            <span className="text-xs font-medium">Overdue Collections</span>
            <div className="p-2 bg-red-500/10 text-red-500 rounded-xl">
              <AlertTriangle className="h-4 w-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-red-500">
            {formatCurrency(metrics?.total_overdue_minor || 0)}
          </div>
          <p className="text-xs text-muted-foreground mt-1.5">
            {metrics?.overdue_count || 0} overdue invoices past terms
          </p>
        </div>
      </div>

      {/* Aging Analysis & Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Aging Breakdown */}
        <div className="lg:col-span-2 bg-card border border-card-border p-6 rounded-2xl shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-semibold text-foreground">Receivables Overdue Aging</h3>
              <p className="text-xs text-muted-foreground">Aging distribution of unpaid invoices</p>
            </div>
            <Link
              href="/dashboard/finance/invoicing/collections"
              className="text-xs text-primary hover:underline flex items-center gap-1 font-medium"
            >
              Manage Collections <ArrowUpRight className="h-3.5 w-3.5" />
            </Link>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
            <div className="p-3.5 bg-card/60 border border-card-border/60 rounded-xl">
              <span className="text-[11px] font-medium text-muted-foreground uppercase">0 - 30 Days</span>
              <p className="text-base font-bold text-foreground mt-1">
                {formatCurrency(aging?.current_30_minor || 0)}
              </p>
            </div>
            <div className="p-3.5 bg-card/60 border border-card-border/60 rounded-xl">
              <span className="text-[11px] font-medium text-amber-400 uppercase">31 - 60 Days</span>
              <p className="text-base font-bold text-amber-400 mt-1">
                {formatCurrency(aging?.days_31_60_minor || 0)}
              </p>
            </div>
            <div className="p-3.5 bg-card/60 border border-card-border/60 rounded-xl">
              <span className="text-[11px] font-medium text-orange-400 uppercase">61 - 90 Days</span>
              <p className="text-base font-bold text-orange-400 mt-1">
                {formatCurrency(aging?.days_61_90_minor || 0)}
              </p>
            </div>
            <div className="p-3.5 bg-card/60 border border-card-border/60 rounded-xl">
              <span className="text-[11px] font-medium text-red-400 uppercase">90+ Days</span>
              <p className="text-base font-bold text-red-400 mt-1">
                {formatCurrency(aging?.days_over_90_minor || 0)}
              </p>
            </div>
          </div>
        </div>

        {/* Quick Actions & Gateway Status */}
        <div className="bg-card border border-card-border p-6 rounded-2xl shadow-sm space-y-4 flex flex-col justify-between">
          <div>
            <h3 className="text-base font-semibold text-foreground">Commercial Integrations</h3>
            <p className="text-xs text-muted-foreground">Connected upstream and downstream financial pipelines</p>

            <div className="mt-4 space-y-2.5 text-xs">
              <div className="flex items-center justify-between p-2.5 rounded-lg bg-card-border/20 border border-card-border/40">
                <span className="font-medium text-foreground">Phase 35 Tax Engine (GST)</span>
                <span className="text-emerald-400 flex items-center gap-1 font-semibold">
                  <CheckCircle2 className="h-3.5 w-3.5" /> Active
                </span>
              </div>
              <div className="flex items-center justify-between p-2.5 rounded-lg bg-card-border/20 border border-card-border/40">
                <span className="font-medium text-foreground">Phase 34 General Ledger</span>
                <span className="text-emerald-400 flex items-center gap-1 font-semibold">
                  <CheckCircle2 className="h-3.5 w-3.5" /> Synced
                </span>
              </div>
              <div className="flex items-center justify-between p-2.5 rounded-lg bg-card-border/20 border border-card-border/40">
                <span className="font-medium text-foreground">Phase 33 Receivables</span>
                <span className="text-emerald-400 flex items-center gap-1 font-semibold">
                  <CheckCircle2 className="h-3.5 w-3.5" /> Linked
                </span>
              </div>
            </div>
          </div>

          <Link
            href="/dashboard/finance/invoicing/payments"
            className="w-full py-2.5 px-4 bg-card hover:bg-card-border/60 border border-card-border rounded-xl text-xs font-semibold text-center text-foreground transition block"
          >
            Record Offline Payment & Settlement
          </Link>
        </div>
      </div>

      {/* Recent Invoices Table */}
      <div className="bg-card border border-card-border rounded-2xl p-6 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-base font-semibold text-foreground">Recent Commercial Invoices</h3>
            <p className="text-xs text-muted-foreground">Latest invoices generated across contracts, bookings, and custom orders</p>
          </div>
          <Link
            href="/dashboard/finance/invoicing/invoices"
            className="text-xs text-primary hover:underline flex items-center gap-1 font-medium"
          >
            View All Invoices <ArrowUpRight className="h-3.5 w-3.5" />
          </Link>
        </div>

        {recentInvoices.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground text-xs">
            No invoices generated yet. Click "New Invoice" to create your first commercial invoice.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-card-border text-muted-foreground">
                  <th className="py-3 px-3">Invoice #</th>
                  <th className="py-3 px-3">Date</th>
                  <th className="py-3 px-3">Due Date</th>
                  <th className="py-3 px-3 text-right">Total</th>
                  <th className="py-3 px-3 text-right">Paid</th>
                  <th className="py-3 px-3 text-right">Balance Due</th>
                  <th className="py-3 px-3 text-center">Status</th>
                  <th className="py-3 px-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-card-border/60">
                {recentInvoices.map((inv) => (
                  <tr key={inv.id} className="hover:bg-card-border/20 transition">
                    <td className="py-3 px-3 font-semibold text-foreground">
                      <Link href={`/dashboard/finance/invoicing/invoices/${inv.id}`} className="hover:text-primary">
                        {inv.invoice_number}
                      </Link>
                    </td>
                    <td className="py-3 px-3 text-muted-foreground">
                      {new Date(inv.invoice_date).toLocaleDateString()}
                    </td>
                    <td className="py-3 px-3 text-muted-foreground">
                      {new Date(inv.due_date).toLocaleDateString()}
                    </td>
                    <td className="py-3 px-3 text-right font-medium text-foreground">
                      {formatCurrency(inv.total_minor, inv.currency)}
                    </td>
                    <td className="py-3 px-3 text-right text-emerald-400">
                      {formatCurrency(inv.amount_paid_minor, inv.currency)}
                    </td>
                    <td className="py-3 px-3 text-right font-semibold text-amber-400">
                      {formatCurrency(inv.amount_due_minor, inv.currency)}
                    </td>
                    <td className="py-3 px-3 text-center">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          inv.status === 'PAID'
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                            : inv.status === 'OVERDUE'
                            ? 'bg-red-500/10 text-red-400 border border-red-500/20'
                            : inv.status === 'PARTIALLY_PAID'
                            ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                            : 'bg-primary/10 text-primary border border-primary/20'
                        }`}
                      >
                        {inv.status}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-right">
                      <Link
                        href={`/dashboard/finance/invoicing/invoices/${inv.id}`}
                        className="text-xs text-primary hover:underline font-medium"
                      >
                        View Details
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
