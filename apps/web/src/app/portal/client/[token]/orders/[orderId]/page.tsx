'use client';

import React, { useState, useEffect, use } from 'react';
import Link from 'next/link';
import { fetchApi } from '@/lib/api-client';

export default function ClientPortalOrderDetailPage({
  params,
}: {
  params: Promise<{ token: string; orderId: string }>;
}) {
  const resolvedParams = use(params);
  const token = resolvedParams.token;
  const orderId = resolvedParams.orderId;

  const [order, setOrder] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadOrder = async () => {
      setLoading(true);
      const res = await fetchApi<any>(
        `/v1/public/client-portal/${token}/orders/${orderId}`
      );
      if (res.success && res.data) {
        setOrder(res.data);
      } else {
        setError(res.error?.message || 'Failed to load order details.');
      }
      setLoading(false);
    };

    loadOrder();
  }, [token, orderId]);

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-8 w-48 bg-slate-900 rounded" />
        <div className="h-64 bg-slate-900 rounded-2xl border border-slate-800" />
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="bg-rose-500/10 border border-rose-500/20 rounded-2xl p-6 text-rose-300 text-center">
        {error || 'Order detail not available.'}
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="space-y-3">
        <Link
          href={`/portal/client/${token}/orders`}
          className="inline-flex items-center text-xs font-semibold text-slate-400 hover:text-slate-200 transition-colors"
        >
          ← Back to all orders
        </Link>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center space-x-3">
              <span className="text-2xl font-extrabold text-slate-100">{order.order_number}</span>
              <span className="px-2.5 py-0.5 bg-slate-800 text-slate-300 rounded-full text-xs font-medium border border-slate-700">
                {order.status}
              </span>
            </div>
            {order.project_name && (
              <p className="text-xs text-slate-400 mt-1">Project: {order.project_name}</p>
            )}
            <p className="text-xs text-slate-500">
              Ordered on {new Date(order.created_at).toLocaleDateString()}
            </p>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 text-right">
            <p className="text-xs text-slate-400">Total Order Amount</p>
            <p className="text-xl font-bold text-slate-100">
              {order.currency} {order.total_amount?.toFixed(2)}
            </p>
            <p className="text-xs text-emerald-400 font-semibold mt-0.5">{order.payment_status}</p>
          </div>
        </div>
      </div>

      {/* Items Table */}
      <section className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-md">
        <div className="p-5 border-b border-slate-800">
          <h2 className="text-base font-bold text-slate-100">Order Items</h2>
        </div>
        <div className="divide-y divide-slate-800">
          {order.items?.map((item: any) => (
            <div key={item.id} className="p-4 sm:p-5 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-slate-200 text-sm">{item.item_name}</h3>
                <p className="text-xs text-slate-400">
                  Type: {item.product_type} • Quantity: {item.quantity}
                  {item.photo_count > 0 && ` • ${item.photo_count} attached photos`}
                </p>
              </div>
              <div className="text-right">
                <p className="text-sm font-bold text-slate-100">
                  {order.currency} {item.total?.toFixed(2)}
                </p>
                <p className="text-xs text-slate-500">
                  ({order.currency} {item.unit_price?.toFixed(2)} each)
                </p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Digital Packages */}
      {order.packages?.length > 0 && (
        <section className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
          <h2 className="text-base font-bold text-slate-100">Digital Deliverables</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {order.packages.map((pkg: any) => (
              <div
                key={pkg.id}
                className="bg-slate-950/60 border border-slate-800 rounded-xl p-4 flex items-center justify-between"
              >
                <div>
                  <h3 className="font-bold text-slate-200 text-sm">{pkg.name}</h3>
                  <p className="text-xs text-slate-400">{pkg.photo_count} Photos</p>
                </div>
                <Link
                  href={`/portal/client/${token}/downloads`}
                  className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold"
                >
                  Downloads Page
                </Link>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Deliveries */}
      {order.deliveries?.length > 0 && (
        <section className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
          <h2 className="text-base font-bold text-slate-100">Shipment & Delivery</h2>
          <div className="space-y-3">
            {order.deliveries.map((d: any) => (
              <div
                key={d.id}
                className="bg-slate-950/60 border border-slate-800 rounded-xl p-4 flex items-center justify-between"
              >
                <div>
                  <p className="font-bold text-slate-200 text-sm">Status: {d.status}</p>
                  {d.courier && (
                    <p className="text-xs text-slate-400">
                      Courier: {d.courier}{' '}
                      {d.tracking_number && `• Tracking: ${d.tracking_number}`}
                    </p>
                  )}
                </div>
                <Link
                  href={`/portal/client/${token}/delivery`}
                  className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-lg text-xs font-semibold"
                >
                  Delivery Tracker
                </Link>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
