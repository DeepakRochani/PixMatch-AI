'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Receipt,
  Search,
  Download,
  Calendar,
  DollarSign,
  FileCheck,
  ArrowUpRight,
} from 'lucide-react';
import { FinanceNavTabs } from '@/components/dashboard/FinanceNavTabs';
import { InvoicingNavTabs } from '@/components/dashboard/InvoicingNavTabs';
import { fetchApi } from '@/lib/api-client';

export default function ReceiptsRegisterPage() {
  const [receipts, setReceipts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadReceipts();
  }, []);

  const loadReceipts = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetchApi('/finance/invoicing/receipts');
      if (res && !res.error) {
        setReceipts(res.data || res);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load receipts.');
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amountMinor: number = 0, currency: string = 'INR') => {
    const symbol = currency === 'INR' ? '₹' : '$';
    return `${symbol}${(amountMinor / 100).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;
  };

  const filtered = receipts.filter((r) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      r.receipt_number?.toLowerCase().includes(q) ||
      r.invoice_id?.toLowerCase().includes(q) ||
      r.payment_method?.toLowerCase().includes(q)
    );
  });

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2.5">
            <Receipt className="h-7 w-7 text-primary" />
            Official Receipts Register
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Immutable issued payment receipts with atomic numbering & remaining balance verification.
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
            placeholder="Search receipt #, invoice ID..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-xs bg-card-border/30 border border-card-border rounded-xl text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
          />
        </div>
      </div>

      {/* Receipts Table */}
      <div className="bg-card border border-card-border rounded-2xl shadow-sm overflow-hidden">
        {loading ? (
          <div className="text-center py-16 text-muted-foreground text-xs">
            Loading receipts...
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground text-xs">
            No issued receipts found. Receipts are automatically generated when payments are recorded.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-card-border bg-card/60 text-muted-foreground">
                  <th className="py-3 px-4">Receipt #</th>
                  <th className="py-3 px-3">Date</th>
                  <th className="py-3 px-3">Method</th>
                  <th className="py-3 px-4 text-right">Amount Paid</th>
                  <th className="py-3 px-4 text-right">Remaining Balance</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-card-border/60">
                {filtered.map((r) => (
                  <tr key={r.id} className="hover:bg-card-border/20 transition">
                    <td className="py-3 px-4 font-semibold text-foreground flex items-center gap-1.5">
                      <FileCheck className="h-4 w-4 text-emerald-400" />
                      {r.receipt_number}
                    </td>
                    <td className="py-3 px-3 text-muted-foreground">
                      {new Date(r.receipt_date).toLocaleDateString()}
                    </td>
                    <td className="py-3 px-3 text-foreground font-medium">{r.payment_method}</td>
                    <td className="py-3 px-4 text-right font-bold text-emerald-400">
                      {formatCurrency(r.amount_minor, r.currency)}
                    </td>
                    <td className="py-3 px-4 text-right font-semibold text-amber-400">
                      {formatCurrency(r.remaining_balance_minor, r.currency)}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <Link
                        href={`/dashboard/finance/invoicing/invoices/${r.invoice_id}`}
                        className="text-xs text-primary hover:underline font-medium"
                      >
                        View Invoice
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
