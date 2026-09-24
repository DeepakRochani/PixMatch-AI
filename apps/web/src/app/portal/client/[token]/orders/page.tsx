'use client';

import React, { useState, useEffect, use } from 'react';
import Link from 'next/link';
import { fetchApi } from '@/lib/api-client';
import { IClientPortalOrderDTO } from '@pixmatch/types';

export default function ClientPortalOrdersPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const resolvedParams = use(params);
  const token = resolvedParams.token;

  const [orders, setOrders] = useState<IClientPortalOrderDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadOrders = async () => {
      setLoading(true);
      const res = await fetchApi<IClientPortalOrderDTO[]>(
        `/v1/public/client-portal/${token}/orders`
      );
      if (res.success && res.data) {
        setOrders(res.data);
      } else {
        setError(res.error?.message || 'Failed to load orders.');
      }
      setLoading(false);
    };

    loadOrders();
  }, [token]);

  if (loading) {
    return (
      <div className="space-y-4 animate-pulse">
        <div className="h-8 w-48 bg-slate-900 rounded" />
        <div className="h-44 bg-slate-900 rounded-2xl border border-slate-800" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold text-slate-100 tracking-tight">Your Orders</h1>
        <p className="text-sm text-slate-400">
          Track fulfillment status, view invoices, and manage your photo product purchases.
        </p>
      </div>

      {error ? (
        <div className="bg-rose-500/10 border border-rose-500/20 rounded-2xl p-6 text-rose-300 text-center">
          {error}
        </div>
      ) : orders.length === 0 ? (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-12 text-center space-y-3">
          <div className="w-12 h-12 bg-slate-800 rounded-full flex items-center justify-center mx-auto text-xl">
            📦
          </div>
          <h3 className="text-lg font-bold text-slate-200">No Orders Yet</h3>
          <p className="text-sm text-slate-400 max-w-sm mx-auto">
            When you order photo albums, prints, or digital collections, they will appear here.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {orders.map((o) => (
            <div
              key={o.id}
              className="bg-slate-900 border border-slate-800 rounded-2xl p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-md hover:border-slate-700 transition-colors"
            >
              <div className="space-y-1">
                <div className="flex items-center space-x-3">
                  <span className="font-bold text-slate-100 text-base">{o.order_number}</span>
                  <span className="px-2.5 py-0.5 bg-slate-800 text-slate-300 rounded-full text-xs font-medium border border-slate-700">
                    {o.status}
                  </span>
                  <span
                    className={`text-xs font-semibold ${
                      o.payment_status === 'PAID'
                        ? 'text-emerald-400'
                        : o.payment_status === 'PARTIALLY_PAID'
                        ? 'text-amber-400'
                        : 'text-slate-400'
                    }`}
                  >
                    {o.payment_status}
                  </span>
                </div>
                <p className="text-xs text-slate-400">
                  {o.project_name ? `Project: ${o.project_name} • ` : ''}
                  {o.items_count} items • {o.delivery_type} Delivery
                </p>
                <p className="text-[11px] text-slate-500">
                  Ordered on {new Date(o.created_at).toLocaleDateString()}
                </p>
              </div>

              <div className="flex items-center space-x-4">
                <div className="text-right">
                  <p className="text-base font-bold text-slate-100">
                    {o.currency} {o.total_amount.toFixed(2)}
                  </p>
                  {o.paid_amount > 0 && o.paid_amount < o.total_amount && (
                    <p className="text-xs text-slate-400">
                      Paid: {o.currency} {o.paid_amount.toFixed(2)}
                    </p>
                  )}
                </div>

                <Link
                  href={`/portal/client/${token}/orders/${o.id}`}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold transition-colors"
                >
                  View Details →
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
