'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  ClockAlert,
  AlertTriangle,
  Calendar,
  CheckCircle2,
  Clock,
  Plus,
  UserCheck,
  Building2,
  PhoneCall,
  History,
} from 'lucide-react';
import { FinanceNavTabs } from '@/components/dashboard/FinanceNavTabs';
import { InvoicingNavTabs } from '@/components/dashboard/InvoicingNavTabs';
import { fetchApi } from '@/lib/api-client';

export default function CollectionsPage() {
  const [tasks, setTasks] = useState<any[]>([]);
  const [aging, setAging] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [tRes, aRes] = await Promise.all([
        fetchApi('/finance/invoicing/collections'),
        fetchApi('/finance/invoicing/reports/aging'),
      ]);

      if (tRes && !tRes.error) {
        setTasks(tRes.data || tRes || []);
      }
      if (aRes && !aRes.error) {
        setAging(aRes.data || aRes);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amountMinor: number = 0, currency: string = 'INR') => {
    const symbol = currency === 'INR' ? '₹' : '$';
    return `${symbol}${(amountMinor / 100).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;
  };

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2.5">
            <ClockAlert className="h-7 w-7 text-red-500" />
            Collection Workflows & Receivables Aging
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Overdue recovery tasks, aging tranches, client communication logs, and payment promises.
          </p>
        </div>
      </div>

      <FinanceNavTabs />
      <InvoicingNavTabs />

      {/* Overdue Aging Matrix */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-card border border-card-border p-5 rounded-2xl shadow-sm">
          <span className="text-xs font-semibold text-muted-foreground uppercase">0 - 30 Days</span>
          <div className="text-2xl font-bold text-foreground mt-1">
            {formatCurrency(aging?.current_30_minor || 0)}
          </div>
          <p className="text-xs text-muted-foreground mt-1.5">Standard payment cycle</p>
        </div>

        <div className="bg-card border border-card-border p-5 rounded-2xl shadow-sm">
          <span className="text-xs font-semibold text-amber-400 uppercase">31 - 60 Days</span>
          <div className="text-2xl font-bold text-amber-400 mt-1">
            {formatCurrency(aging?.days_31_60_minor || 0)}
          </div>
          <p className="text-xs text-muted-foreground mt-1.5">First reminder dispatched</p>
        </div>

        <div className="bg-card border border-card-border p-5 rounded-2xl shadow-sm">
          <span className="text-xs font-semibold text-orange-400 uppercase">61 - 90 Days</span>
          <div className="text-2xl font-bold text-orange-400 mt-1">
            {formatCurrency(aging?.days_61_90_minor || 0)}
          </div>
          <p className="text-xs text-muted-foreground mt-1.5">Active collection assigned</p>
        </div>

        <div className="bg-card border border-card-border p-5 rounded-2xl shadow-sm">
          <span className="text-xs font-semibold text-red-400 uppercase">90+ Days Critical</span>
          <div className="text-2xl font-bold text-red-400 mt-1">
            {formatCurrency(aging?.days_over_90_minor || 0)}
          </div>
          <p className="text-xs text-muted-foreground mt-1.5">Escalation & legal recovery</p>
        </div>
      </div>

      {/* Collection Tasks Table */}
      <div className="bg-card border border-card-border rounded-2xl p-6 shadow-sm space-y-4">
        <h3 className="text-base font-semibold text-foreground">Active Collection Tasks</h3>

        {loading ? (
          <div className="text-center py-12 text-muted-foreground text-xs">
            Loading collection tasks...
          </div>
        ) : tasks.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground text-xs">
            No active collection tasks. All overdue invoices are currently resolved or assigned.
          </div>
        ) : (
          <div className="overflow-x-auto border border-card-border/60 rounded-xl">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-card-border bg-card/60 text-muted-foreground">
                  <th className="py-3 px-4">Invoice #</th>
                  <th className="py-3 px-3">Assigned To</th>
                  <th className="py-3 px-3">Priority</th>
                  <th className="py-3 px-3">Notes</th>
                  <th className="py-3 px-3 text-center">Status</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-card-border/60">
                {tasks.map((t) => (
                  <tr key={t.id} className="hover:bg-card-border/20 transition">
                    <td className="py-3 px-4 font-semibold text-foreground">
                      {t.invoice?.invoice_number || t.invoice_id}
                    </td>
                    <td className="py-3 px-3 text-muted-foreground">{t.assigned_to || 'Unassigned'}</td>
                    <td className="py-3 px-3">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          t.priority === 'URGENT' || t.priority === 'HIGH'
                            ? 'bg-red-500/10 text-red-400 border border-red-500/20'
                            : 'bg-primary/10 text-primary border border-primary/20'
                        }`}
                      >
                        {t.priority}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-muted-foreground max-w-xs truncate">{t.notes || '-'}</td>
                    <td className="py-3 px-3 text-center">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-card border border-card-border text-foreground">
                        {t.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <Link
                        href={`/dashboard/finance/invoicing/invoices/${t.invoice_id}`}
                        className="text-xs text-primary hover:underline font-medium"
                      >
                        Follow Up
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
