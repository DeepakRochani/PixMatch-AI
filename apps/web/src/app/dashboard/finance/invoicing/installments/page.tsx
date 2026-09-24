'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  CalendarDays,
  Search,
  Calendar,
  DollarSign,
  Clock,
  CheckCircle2,
  AlertTriangle,
} from 'lucide-react';
import { FinanceNavTabs } from '@/components/dashboard/FinanceNavTabs';
import { InvoicingNavTabs } from '@/components/dashboard/InvoicingNavTabs';
import { fetchApi } from '@/lib/api-client';

export default function InstallmentsPage() {
  const [installments, setInstallments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadInstallments();
  }, []);

  const loadInstallments = async () => {
    setLoading(true);
    try {
      // Load recent installments
      const res = await fetchApi('/finance/invoicing/invoices');
      if (res && !res.error) {
        // Collect installments from invoices
        const all: any[] = [];
        (res.data || res || []).forEach((inv: any) => {
          if (inv.installments) {
            inv.installments.forEach((inst: any) => {
              all.push({ ...inst, invoice_number: inv.invoice_number, currency: inv.currency });
            });
          }
        });
        setInstallments(all);
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
            <CalendarDays className="h-7 w-7 text-primary" />
            Installment Schedules & Milestone Payments
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Track multi-phase wedding installments, booking deposits, and milestone payment tranches.
          </p>
        </div>
      </div>

      <FinanceNavTabs />
      <InvoicingNavTabs />

      <div className="bg-card border border-card-border rounded-2xl shadow-sm overflow-hidden p-6">
        <h3 className="text-base font-semibold text-foreground mb-4">Configured Installment Milestones</h3>

        {loading ? (
          <div className="text-center py-12 text-muted-foreground text-xs">
            Loading installment schedules...
          </div>
        ) : installments.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground text-xs">
            No installment schedules configured yet. You can split any commercial invoice into multi-part milestone payments from its invoice details view.
          </div>
        ) : (
          <div className="overflow-x-auto border border-card-border/60 rounded-xl">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-card-border bg-card/60 text-muted-foreground">
                  <th className="py-3 px-4">Invoice #</th>
                  <th className="py-3 px-3">Sequence</th>
                  <th className="py-3 px-3">Due Date</th>
                  <th className="py-3 px-4 text-right">Target Amount</th>
                  <th className="py-3 px-4 text-right">Amount Paid</th>
                  <th className="py-3 px-3 text-center">Status</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-card-border/60">
                {installments.map((inst) => (
                  <tr key={inst.id} className="hover:bg-card-border/20 transition">
                    <td className="py-3 px-4 font-semibold text-foreground">
                      {inst.invoice_number}
                    </td>
                    <td className="py-3 px-3 text-muted-foreground">Installment #{inst.sequence}</td>
                    <td className="py-3 px-3 text-muted-foreground">
                      {new Date(inst.due_date).toLocaleDateString()}
                    </td>
                    <td className="py-3 px-4 text-right font-bold text-foreground">
                      {formatCurrency(inst.amount_minor, inst.currency)}
                    </td>
                    <td className="py-3 px-4 text-right text-emerald-400 font-medium">
                      {formatCurrency(inst.paid_minor, inst.currency)}
                    </td>
                    <td className="py-3 px-3 text-center">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-primary/10 text-primary border border-primary/20">
                        {inst.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <Link
                        href={`/dashboard/finance/invoicing/invoices/${inst.invoice_id}`}
                        className="text-xs text-primary hover:underline font-medium"
                      >
                        Manage
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
