'use client';

import React, { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import {
  Truck,
  CheckCircle2,
  Clock,
  ExternalLink,
  PackageCheck,
  AlertCircle,
  Calendar,
  Send,
  Loader2,
  Receipt
} from 'lucide-react';
import type { IClientPortalDeliveryDTO } from '@pixmatch/types';

export default function ClientPortalDeliveryPage() {
  const params = useParams();
  const token = params?.token as string;

  const [deliveries, setDeliveries] = useState<IClientPortalDeliveryDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Modal / Confirm state
  const [confirmingDelivery, setConfirmingDelivery] = useState<IClientPortalDeliveryDTO | null>(null);
  const [feedback, setFeedback] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  useEffect(() => {
    async function fetchDeliveries() {
      if (!token) return;
      try {
        setLoading(true);
        const res = await fetch(`/api/client-portal/public/delivery?token=${token}`, { credentials: 'omit' });
        if (!res.ok) throw new Error(`Delivery fetch failed (${res.status})`);
        const json = await res.json();
        setDeliveries(json.deliveries || []);
      } catch (err: any) {
        setError(err.message || 'Unable to load delivery tracking details.');
      } finally {
        setLoading(false);
      }
    }
    fetchDeliveries();
  }, [token]);

  const handleConfirmDelivery = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!confirmingDelivery) return;

    try {
      setSubmitting(true);
      const res = await fetch('/api/client-portal/public/delivery/confirm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token,
          delivery_id: confirmingDelivery.id,
          feedback: feedback.trim() || undefined
        })
      });

      if (!res.ok) throw new Error(`Confirmation failed (${res.status})`);
      const updatedDelivery: IClientPortalDeliveryDTO = await res.json();

      setDeliveries(prev =>
        prev.map(d => (d.id === updatedDelivery.id ? updatedDelivery : d))
      );
      setActionSuccess('Delivery confirmed! Thank you for letting us know your order arrived.');
      setConfirmingDelivery(null);
      setFeedback('');
    } catch (err: any) {
      alert(err.message || 'Error confirming delivery receipt.');
    } finally {
      setSubmitting(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'DELIVERED':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
            Delivered
          </span>
        );
      case 'SHIPPED':
      case 'IN_TRANSIT':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300">
            <Truck className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
            In Transit
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300">
            <Clock className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
            Processing
          </span>
        );
    }
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
          Deliveries &amp; Tracking
        </h1>
        <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
          Track shipments, physical prints, and confirm receipt when your packages arrive.
        </p>
      </div>

      {actionSuccess && (
        <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 flex items-center gap-3">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
          <p className="text-sm font-medium text-emerald-900 dark:text-emerald-200">{actionSuccess}</p>
        </div>
      )}

      {loading ? (
        <div className="py-20 flex flex-col items-center justify-center gap-3">
          <Loader2 className="w-8 h-8 text-[var(--brand-primary)] animate-spin" />
          <p className="text-sm text-slate-500">Loading your deliveries...</p>
        </div>
      ) : error ? (
        <div className="p-4 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 shrink-0" />
          <p className="text-sm text-red-800 dark:text-red-300">{error}</p>
        </div>
      ) : deliveries.length === 0 ? (
        <div className="py-16 text-center border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-2xl p-8">
          <Truck className="w-12 h-12 text-slate-300 dark:text-slate-700 mx-auto mb-3" />
          <h3 className="text-base font-semibold text-slate-900 dark:text-white">No Physical Deliveries Yet</h3>
          <p className="text-sm text-slate-500 max-w-md mx-auto mt-1">
            Physical print orders and lab shipments will appear here with tracking numbers and progress updates.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {deliveries.map((delivery) => (
            <div
              key={delivery.id}
              className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-5"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-800 pb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-[var(--brand-primary)]/10 flex items-center justify-center text-[var(--brand-primary)] shrink-0">
                    <Truck className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-slate-900 dark:text-white">
                      Order #{delivery.order_number}
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Method: {delivery.delivery_type}
                    </p>
                  </div>
                </div>
                <div>{getStatusBadge(delivery.status)}</div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs sm:text-sm">
                {delivery.courier && (
                  <div>
                    <span className="text-slate-500 dark:text-slate-400 block">Courier</span>
                    <span className="font-medium text-slate-900 dark:text-slate-200">{delivery.courier}</span>
                  </div>
                )}
                {delivery.tracking_number && (
                  <div>
                    <span className="text-slate-500 dark:text-slate-400 block">Tracking Number</span>
                    <span className="font-mono font-medium text-slate-900 dark:text-slate-200">
                      {delivery.tracking_number}
                    </span>
                  </div>
                )}
                {delivery.shipped_at && (
                  <div>
                    <span className="text-slate-500 dark:text-slate-400 block">Shipped Date</span>
                    <span className="font-medium text-slate-900 dark:text-slate-200">
                      {new Date(delivery.shipped_at).toLocaleDateString()}
                    </span>
                  </div>
                )}
              </div>

              {/* Actions & Confirmation Info */}
              <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                <div className="flex items-center gap-2">
                  {delivery.tracking_url && (
                    <a
                      href={delivery.tracking_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition"
                    >
                      Track Package <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  )}
                  <Link
                    href={`/portal/client/${token}/orders/${delivery.order_id}`}
                    className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition"
                  >
                    View Order <Receipt className="w-3.5 h-3.5" />
                  </Link>
                </div>

                {delivery.is_confirmed || delivery.delivered_at ? (
                  <div className="text-xs text-emerald-600 dark:text-emerald-400 font-medium flex items-center gap-1.5">
                    <PackageCheck className="w-4 h-4" />
                    Confirmed received{delivery.delivered_at ? ` on ${new Date(delivery.delivered_at).toLocaleDateString()}` : ''}
                  </div>
                ) : delivery.can_confirm ? (
                  <button
                    onClick={() => setConfirmingDelivery(delivery)}
                    className="px-4 py-2 rounded-xl text-xs font-semibold text-white bg-[var(--brand-primary)] hover:opacity-90 shadow-sm transition"
                  >
                    Confirm Delivery Receipt
                  </button>
                ) : null}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Confirmation Modal */}
      {confirmingDelivery && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-md rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 shadow-xl space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                <PackageCheck className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">Confirm Package Receipt</h3>
                <p className="text-xs text-slate-500">Order #{confirmingDelivery.order_number}</p>
              </div>
            </div>

            <form onSubmit={handleConfirmDelivery} className="space-y-4">
              <p className="text-xs text-slate-600 dark:text-slate-400">
                Please let us know if your package arrived in great condition. You can optionally leave feedback for the studio.
              </p>

              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Feedback / Notes (Optional)
                </label>
                <textarea
                  value={feedback}
                  onChange={(e) => setFeedback(e.target.value)}
                  placeholder="e.g. Prints look beautiful! Thank you so much."
                  rows={3}
                  className="w-full text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-2.5 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[var(--brand-primary)]"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setConfirmingDelivery(null)}
                  disabled={submitting}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold text-white bg-[var(--brand-primary)] hover:opacity-90 shadow-sm transition"
                >
                  {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                  Confirm Delivery
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
