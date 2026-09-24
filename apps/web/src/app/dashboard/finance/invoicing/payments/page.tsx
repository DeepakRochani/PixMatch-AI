'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  CreditCard,
  Search,
  Filter,
  Download,
  Calendar,
  DollarSign,
  ArrowUpRight,
  ShieldCheck,
  RotateCcw,
} from 'lucide-react';
import { FinanceNavTabs } from '@/components/dashboard/FinanceNavTabs';
import { InvoicingNavTabs } from '@/components/dashboard/InvoicingNavTabs';
import { fetchApi } from '@/lib/api-client';

export default function PaymentsListPage() {
  const [payments, setPayments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadPayments();
  }, []);

  const loadPayments = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetchApi('/finance/invoicing/payments');
      if (res && !res.error) {
        setPayments(res.data || res);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load payments.');
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amountMinor: number = 0, currency: string = 'INR') => {
    const symbol = currency === 'INR' ? '₹' : '$';
    return `${symbol}${(amountMinor / 100).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;
  };

  const filtered = payments.filter((p) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      p.external_reference?.toLowerCase().includes(q) ||
      p.invoice?.invoice_number?.toLowerCase().includes(q) ||
      p.payment_method?.toLowerCase().includes(q)
    );
  });

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2.5">
            <CreditCard className="h-7 w-7 text-primary" />
            Payment Settlements & Transactions
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Reconciled payments, online gateway events, bank wires, and refund logs.
          </p>
        </div>
      </div>

      <FinanceNavTabs />
      <InvoicingNavTabs />

      {/* Search Bar */}
      <div className="bg-card border border-card-border p-4 rounded-2xl flex items-center justify-between">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search reference, invoice #, method..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-xs bg-card-border/30 border border-card-border rounded-xl text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
          />
        </div>
      </div>

      {/* Payments Table */}
      <div className="bg-card border border-card-border rounded-2xl shadow-sm overflow-hidden">
        {loading ? (
          <div className="text-center py-16 text-muted-foreground text-xs">
            Loading payments...
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground text-xs">
            No payment settlements found.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-card-border bg-card/60 text-muted-foreground">
                  <th className="py-3 px-4">Date</th>
                  <th className="py-3 px-3">Invoice #</th>
                  <th className="py-3 px-3">Method</th>
                  <th className="py-3 px-3">Reference</th>
                  <th className="py-3 px-4 text-right">Amount</th>
                  <th className="py-3 px-3 text-center">Status</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-card-border/60">
                {filtered.map((p) => (
                  <tr key={p.id} className="hover:bg-card-border/20 transition">
                    <td className="py-3 px-4 text-muted-foreground">
                      {new Date(p.payment_date).toLocaleDateString()}
                    </td>
                    <td className="py-3 px-3 font-semibold text-foreground">
                      <Link
                        href={`/dashboard/finance/invoicing/invoices/${p.invoice_id}`}
                        className="text-primary hover:underline"
                      >
                        {p.invoice?.invoice_number || 'View Invoice'}
                      </Link>
                    </td>
                    <td className="py-3 px-3 text-foreground font-medium">{p.payment_method}</td>
                    <td className="py-3 px-3 font-mono text-muted-foreground">{p.external_reference || '-'}</td>
                    <td className="py-3 px-4 text-right font-bold text-emerald-400">
                      {formatCurrency(p.amount_minor, p.currency)}
                    </td>
                    <td className="py-3 px-3 text-center">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          p.status === 'SUCCEEDED'
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                            : p.status === 'REFUNDED'
                            ? 'bg-purple-500/10 text-purple-400 border border-purple-500/20'
                            : 'bg-primary/10 text-primary border border-primary/20'
                        }`}
                      >
                        {p.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <Link
                        href={`/dashboard/finance/invoicing/invoices/${p.invoice_id}`}
                        className="text-xs text-primary hover:underline font-medium"
                      >
                        Invoice Details
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
