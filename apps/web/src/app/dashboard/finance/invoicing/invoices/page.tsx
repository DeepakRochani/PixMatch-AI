'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  FileText,
  Plus,
  Search,
  Filter,
  Download,
  Calendar,
  ChevronRight,
  ExternalLink,
  Receipt,
} from 'lucide-react';
import { FinanceNavTabs } from '@/components/dashboard/FinanceNavTabs';
import { InvoicingNavTabs } from '@/components/dashboard/InvoicingNavTabs';
import { fetchApi } from '@/lib/api-client';

export default function InvoicesListPage() {
  const [invoices, setInvoices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadInvoices();
  }, [statusFilter]);

  const loadInvoices = async () => {
    setLoading(true);
    setError(null);
    try {
      const url = statusFilter
        ? `/finance/invoicing/invoices?status=${statusFilter}`
        : `/finance/invoicing/invoices`;
      const res = await fetchApi(url);
      if (res && !res.error) {
        setInvoices(res.data || res);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load invoices.');
    } finally {
      setLoading(false);
    }
  };

  const handleExportCsv = () => {
    window.open('/api/finance/invoicing/reports/export?format=csv', '_blank');
  };

  const formatCurrency = (amountMinor: number = 0, currency: string = 'INR') => {
    const symbol = currency === 'INR' ? '₹' : '$';
    return `${symbol}${(amountMinor / 100).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;
  };

  const filtered = invoices.filter((inv) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      inv.invoice_number?.toLowerCase().includes(q) ||
      inv.client_id?.toLowerCase().includes(q) ||
      inv.notes?.toLowerCase().includes(q)
    );
  });

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2.5">
            <FileText className="h-7 w-7 text-primary" />
            Commercial Invoices
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Manage, issue, track, and dispatch studio client invoices.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleExportCsv}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium bg-card hover:bg-card-border/60 border border-card-border rounded-lg text-foreground transition"
          >
            <Download className="h-3.5 w-3.5" />
            Export Safe CSV
          </button>
          <Link
            href="/dashboard/finance/invoicing/create"
            className="flex items-center gap-2 px-4 py-2 text-xs font-semibold bg-primary hover:bg-primary/90 text-primary-foreground rounded-lg shadow-sm transition"
          >
            <Plus className="h-4 w-4" />
            Create Invoice
          </Link>
        </div>
      </div>

      <FinanceNavTabs />
      <InvoicingNavTabs />

      {/* Filter and Search Bar */}
      <div className="bg-card border border-card-border p-4 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search invoice number, client..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-xs bg-card-border/30 border border-card-border rounded-xl text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 text-xs bg-card-border/30 border border-card-border rounded-xl text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
          >
            <option value="">All Statuses</option>
            <option value="DRAFT">DRAFT</option>
            <option value="ISSUED">ISSUED</option>
            <option value="SENT">SENT</option>
            <option value="PARTIALLY_PAID">PARTIALLY PAID</option>
            <option value="PAID">PAID</option>
            <option value="OVERDUE">OVERDUE</option>
            <option value="VOID">VOID</option>
            <option value="CANCELLED">CANCELLED</option>
          </select>
        </div>
      </div>

      {/* Invoices List */}
      <div className="bg-card border border-card-border rounded-2xl shadow-sm overflow-hidden">
        {loading ? (
          <div className="text-center py-16 text-muted-foreground text-xs">
            Loading invoices...
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground text-xs">
            No invoices match the selected filters.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-card-border bg-card/60 text-muted-foreground">
                  <th className="py-3 px-4">Invoice #</th>
                  <th className="py-3 px-3">Date</th>
                  <th className="py-3 px-3">Due Date</th>
                  <th className="py-3 px-3">Client</th>
                  <th className="py-3 px-3 text-right">Subtotal</th>
                  <th className="py-3 px-3 text-right">Tax</th>
                  <th className="py-3 px-3 text-right">Total</th>
                  <th className="py-3 px-3 text-right">Paid</th>
                  <th className="py-3 px-3 text-right">Balance Due</th>
                  <th className="py-3 px-3 text-center">Status</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-card-border/60">
                {filtered.map((inv) => (
                  <tr key={inv.id} className="hover:bg-card-border/20 transition">
                    <td className="py-3 px-4 font-semibold text-foreground">
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
                    <td className="py-3 px-3 text-foreground font-medium truncate max-w-[120px]">
                      {inv.client_id || 'Direct Client'}
                    </td>
                    <td className="py-3 px-3 text-right text-muted-foreground">
                      {formatCurrency(inv.subtotal_minor, inv.currency)}
                    </td>
                    <td className="py-3 px-3 text-right text-muted-foreground">
                      {formatCurrency(inv.tax_minor, inv.currency)}
                    </td>
                    <td className="py-3 px-3 text-right font-bold text-foreground">
                      {formatCurrency(inv.total_minor, inv.currency)}
                    </td>
                    <td className="py-3 px-3 text-right text-emerald-400 font-medium">
                      {formatCurrency(inv.amount_paid_minor, inv.currency)}
                    </td>
                    <td className="py-3 px-3 text-right font-bold text-amber-400">
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
                    <td className="py-3 px-4 text-right">
                      <Link
                        href={`/dashboard/finance/invoicing/invoices/${inv.id}`}
                        className="text-xs text-primary hover:underline font-semibold"
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
