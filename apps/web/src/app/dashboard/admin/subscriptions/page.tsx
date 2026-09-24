'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  CreditCard,
  Search,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  ExternalLink,
} from 'lucide-react';
import { fetchApi } from '@/lib/api-client';
import { AdminSubscriptionItemDTO } from '@pixmatch/types';

function formatINR(amountPaise: number): string {
  if (isNaN(amountPaise)) return '₹0';
  const rupees = amountPaise / 100;
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(rupees);
}

export default function AdminSubscriptionsPage() {
  const [subscriptions, setSubscriptions] = useState<AdminSubscriptionItemDTO[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [limit] = useState(15);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [planFilter, setPlanFilter] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  const loadSubscriptions = async () => {
    setIsLoading(true);
    try {
      const queryParams = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
        ...(search ? { search } : {}),
        ...(statusFilter ? { status: statusFilter } : {}),
        ...(planFilter ? { plan: planFilter } : {}),
      });

      const res = await fetchApi<{
        subscriptions: AdminSubscriptionItemDTO[];
        total: number;
        page: number;
        limit: number;
        total_pages: number;
      }>(`/admin/subscriptions?${queryParams.toString()}`);

      if (res.success && res.data) {
        setSubscriptions(res.data.subscriptions || []);
        setTotal(res.data.total || 0);
        setTotalPages(res.data.total_pages || 1);
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadSubscriptions();
  }, [page, statusFilter, planFilter]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    loadSubscriptions();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2.5">
            <CreditCard className="h-6 w-6 text-emerald-400" /> Platform Subscriptions
          </h1>
          <p className="text-xs text-muted mt-1">
            Authoritative billing subscriptions synchronized with Stripe and Razorpay gateways.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs text-muted font-mono">{total} total subscription{total === 1 ? '' : 's'}</span>
          <button
            onClick={() => loadSubscriptions()}
            disabled={isLoading}
            className="p-2 rounded-xl bg-[#131B2A] border border-card-border/80 text-muted hover:text-white transition"
          >
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin text-emerald-400' : ''}`} />
          </button>
        </div>
      </div>

      {/* Toolbar */}
      <div className="rounded-2xl bg-[#0E1422] border border-card-border/80 p-4 flex flex-col md:flex-row gap-3 items-center justify-between">
        <form onSubmit={handleSearchSubmit} className="relative w-full md:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by studio name or slug..."
            className="w-full bg-[#131B2A] border border-card-border/80 rounded-xl pl-9 pr-4 py-2 text-xs text-white placeholder-muted focus:outline-none focus:border-emerald-500/50"
          />
        </form>

        <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto">
          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setPage(1);
            }}
            className="bg-[#131B2A] border border-card-border/80 rounded-xl px-3 py-2 text-xs text-white focus:outline-none"
          >
            <option value="">All Statuses</option>
            <option value="ACTIVE">Active</option>
            <option value="TRIALING">Trialing</option>
            <option value="PAST_DUE">Past Due</option>
            <option value="CANCELLED">Cancelled</option>
            <option value="INCOMPLETE">Incomplete</option>
            <option value="UNPAID">Unpaid</option>
          </select>

          {/* Plan Filter */}
          <select
            value={planFilter}
            onChange={(e) => {
              setPlanFilter(e.target.value);
              setPage(1);
            }}
            className="bg-[#131B2A] border border-card-border/80 rounded-xl px-3 py-2 text-xs text-white focus:outline-none"
          >
            <option value="">All Plans</option>
            <option value="FREE">Free</option>
            <option value="STARTER">Starter</option>
            <option value="PRO">Professional</option>
            <option value="STUDIO">Studio</option>
            <option value="ENTERPRISE">Enterprise</option>
          </select>
        </div>
      </div>

      {/* Subscriptions Table */}
      <div className="rounded-2xl bg-[#0E1422] border border-card-border/80 overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#131B2A]/70 text-[10px] uppercase font-bold text-muted border-b border-card-border/80">
              <tr>
                <th className="px-5 py-3.5">Studio</th>
                <th className="px-5 py-3.5">Plan</th>
                <th className="px-5 py-3.5">Status</th>
                <th className="px-5 py-3.5">Amount</th>
                <th className="px-5 py-3.5">Interval</th>
                <th className="px-5 py-3.5">Provider</th>
                <th className="px-5 py-3.5">Current Period</th>
                <th className="px-5 py-3.5">Cancel at Period End</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-card-border/40 text-muted">
              {isLoading ? (
                <tr>
                  <td colSpan={8} className="px-6 py-12 text-center text-muted">
                    <div className="flex flex-col items-center gap-2">
                      <RefreshCw className="h-6 w-6 animate-spin text-emerald-400" />
                      <span>Loading subscriptions...</span>
                    </div>
                  </td>
                </tr>
              ) : subscriptions.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-6 py-12 text-center text-muted">
                    No subscriptions found.
                  </td>
                </tr>
              ) : (
                subscriptions.map((s) => (
                  <tr key={s.id} className="hover:bg-card-border/20 transition">
                    {/* Studio */}
                    <td className="px-5 py-4 font-semibold text-white">
                      <Link
                        href={`/dashboard/admin/studios/${s.studio_id}`}
                        className="hover:text-emerald-300 flex items-center gap-1.5 group"
                      >
                        <span>{s.studio_name}</span>
                        <ExternalLink className="h-3 w-3 opacity-0 group-hover:opacity-100 text-emerald-400 transition" />
                      </Link>
                      <span className="block text-[10px] text-muted font-mono">{s.studio_slug}</span>
                    </td>

                    {/* Plan */}
                    <td className="px-5 py-4 font-bold text-white font-mono uppercase">
                      {s.plan}
                    </td>

                    {/* Status */}
                    <td className="px-5 py-4">
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                          s.status === 'ACTIVE'
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                            : s.status === 'PAST_DUE'
                            ? 'bg-red-500/10 text-red-400 border border-red-500/20'
                            : 'bg-card-border text-white'
                        }`}
                      >
                        {s.status}
                      </span>
                    </td>

                    {/* Amount */}
                    <td className="px-5 py-4 font-mono font-bold text-white">
                      {formatINR(s.amount)}
                    </td>

                    {/* Interval */}
                    <td className="px-5 py-4 capitalize">{s.interval}</td>

                    {/* Provider */}
                    <td className="px-5 py-4 font-mono text-[11px] uppercase">{s.provider}</td>

                    {/* Current Period */}
                    <td className="px-5 py-4 text-[10px] font-mono">
                      {new Date(s.current_period_start).toLocaleDateString()} – {new Date(s.current_period_end).toLocaleDateString()}
                    </td>

                    {/* Cancel at End */}
                    <td className="px-5 py-4">
                      {s.cancel_at_period_end ? (
                        <span className="text-amber-400 text-[10px] font-bold">Yes (Ending)</span>
                      ) : (
                        <span className="text-muted text-[10px]">No (Auto-renews)</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="p-4 bg-[#131B2A]/40 border-t border-card-border/80 flex items-center justify-between text-xs text-muted">
          <span>
            Page {page} of {totalPages} ({total} subscriptions total)
          </span>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1 || isLoading}
              className="p-1.5 rounded-lg bg-[#131B2A] border border-card-border/80 text-white disabled:opacity-40"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages || isLoading}
              className="p-1.5 rounded-lg bg-[#131B2A] border border-card-border/80 text-white disabled:opacity-40"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
