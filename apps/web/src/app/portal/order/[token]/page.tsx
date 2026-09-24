'use client';

import React, { useState, useEffect, use } from 'react';
import { fetchApi } from '@/lib/api-client';
import {
  IFulfillmentPublicOrderDTO,
  FulfillmentOrderStatus,
  FulfillmentPaymentStatus,
  FulfillmentDeliveryType,
} from '@pixmatch/types';

export default function ClientOrderDeliveryPortalPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const resolvedParams = use(params);
  const token = resolvedParams.token;

  const [order, setOrder] = useState<IFulfillmentPublicOrderDTO | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Download state
  const [downloadingPackageId, setDownloadingPackageId] = useState<string | null>(null);
  const [downloadError, setDownloadError] = useState<string | null>(null);

  // Delivery confirmation state
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
  const [clientRating, setClientRating] = useState<number>(5);
  const [clientFeedback, setClientFeedback] = useState('');
  const [confirming, setConfirming] = useState(false);

  const loadOrder = async () => {
    setLoading(true);
    setError(null);
    const res = await fetchApi<IFulfillmentPublicOrderDTO>(`/v1/fulfillment/public/${token}`);
    if (res.success && res.data) {
      setOrder(res.data);
    } else {
      setError(res.error?.message || 'Failed to load order delivery details. The link may be invalid.');
    }
    setLoading(false);
  };

  useEffect(() => {
    loadOrder();
  }, [token]);

  const handleDownloadPackage = async (packageId: string) => {
    setDownloadingPackageId(packageId);
    setDownloadError(null);

    const res = await fetchApi<{ download_url: string; expires_at: string; package_name: string }>(
      `/v1/fulfillment/public/${token}/packages/${packageId}/download-url`
    );

    setDownloadingPackageId(null);
    if (res.success && res.data?.download_url) {
      // Trigger browser download or redirect
      window.open(res.data.download_url, '_blank');
      // Refresh package download counts
      loadOrder();
    } else {
      setDownloadError(res.error?.message || 'Failed to generate secure download link.');
    }
  };

  const handleConfirmDelivery = async (e: React.FormEvent) => {
    e.preventDefault();
    setConfirming(true);

    const res = await fetchApi(`/v1/fulfillment/public/${token}/confirm-delivery`, {
      method: 'POST',
      body: JSON.stringify({
        notes: clientFeedback.trim() || undefined,
      }),
    });

    setConfirming(false);
    if (res.success) {
      setIsConfirmModalOpen(false);
      loadOrder();
    } else {
      alert(res.error?.message || 'Failed to confirm delivery.');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="w-12 h-12 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-slate-400 font-medium">Loading your delivery portal...</p>
        </div>
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-4">
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 max-w-md w-full text-center space-y-4 shadow-2xl">
          <div className="w-14 h-14 bg-rose-500/10 border border-rose-500/20 text-rose-400 rounded-2xl flex items-center justify-center mx-auto text-2xl">
            ⚠️
          </div>
          <h1 className="text-xl font-semibold">Delivery Portal Unavailable</h1>
          <p className="text-slate-400 text-sm">{error || 'This order delivery link is invalid or expired.'}</p>
        </div>
      </div>
    );
  }

  const isDelivered = order.status === FulfillmentOrderStatus.DELIVERED || order.status === FulfillmentOrderStatus.COMPLETED || !!order.client_confirmed_at;
  const isPaid = order.payment_status === FulfillmentPaymentStatus.PAID;

  // Compute active stage for progress tracker
  let activeStep = 1;
  if (order.status === FulfillmentOrderStatus.PROCESSING || order.status === FulfillmentOrderStatus.PRINTING_LAB) {
    activeStep = 2;
  } else if (order.status === FulfillmentOrderStatus.READY_FOR_DELIVERY || order.status === FulfillmentOrderStatus.OUT_FOR_DELIVERY) {
    activeStep = 3;
  } else if (isDelivered) {
    activeStep = 4;
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans selection:bg-indigo-500 selection:text-white">
      {/* Brand Header */}
      <header className="bg-slate-900/90 border-b border-slate-800 sticky top-0 z-40 backdrop-blur-md px-6 py-4">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-indigo-600 flex items-center justify-center text-white font-bold text-lg shadow-lg shadow-indigo-600/30">
              📸
            </div>
            <div>
              <h1 className="text-base font-bold text-slate-100">{order.studio?.name || order.studio_name || 'Photography Studio'}</h1>
              <p className="text-[11px] text-slate-400">Client Order & Delivery Portal</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="font-mono text-xs text-slate-300 bg-slate-800 px-3 py-1 rounded-lg border border-slate-700">
              #{order.order_number}
            </span>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-5xl mx-auto p-6 lg:p-10 space-y-8">
        {/* Order Status Banner */}
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 lg:p-8 space-y-6 shadow-xl relative overflow-hidden">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <span className="text-xs uppercase tracking-wider font-semibold text-indigo-400">
                Order Status
              </span>
              <h2 className="text-2xl font-bold text-slate-100 mt-1">
                {isDelivered
                  ? 'Your Photos Have Been Delivered! 🎉'
                  : order.status === FulfillmentOrderStatus.READY_FOR_DELIVERY
                  ? 'Your Photos Are Ready for Delivery! 🚀'
                  : order.status === FulfillmentOrderStatus.PRINTING_LAB
                  ? 'In Production with Fine Art Print Lab 🖼️'
                  : 'Order Confirmed & In Preparation ✨'}
              </h2>
              <p className="text-xs text-slate-400 mt-1">
                Hello <strong className="text-slate-200">{order.client_name || 'Valued Client'}</strong>! Thank you for ordering your customized photography deliverables.
              </p>
            </div>

            {/* Delivery Confirmation Badge or Trigger */}
            <div>
              {order.client_confirmed_at ? (
                <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs px-4 py-2.5 rounded-xl font-semibold flex items-center gap-2">
                  <span>✓</span> Delivery Confirmed by Client
                </div>
              ) : (
                <button
                  onClick={() => setIsConfirmModalOpen(true)}
                  className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold px-4 py-2.5 rounded-xl transition shadow-lg shadow-emerald-600/25 flex items-center gap-2"
                >
                  <span>✓</span> Confirm Order Received
                </button>
              )}
            </div>
          </div>

          {/* Stepper Progress Bar */}
          <div className="grid grid-cols-4 gap-2 pt-4 border-t border-slate-800/80">
            {[
              { num: 1, title: 'Order Placed', desc: 'Selections verified' },
              { num: 2, title: 'In Production', desc: 'Editing & lab printing' },
              { num: 3, title: 'Ready / Shipped', desc: 'Dispatched to you' },
              { num: 4, title: 'Delivered', desc: 'Ready to enjoy' },
            ].map((step) => (
              <div key={step.num} className="space-y-1.5">
                <div
                  className={`h-1.5 rounded-full transition-all ${
                    activeStep >= step.num ? 'bg-indigo-500' : 'bg-slate-800'
                  }`}
                />
                <div>
                  <p className={`text-xs font-semibold ${activeStep >= step.num ? 'text-slate-200' : 'text-slate-500'}`}>
                    {step.title}
                  </p>
                  <p className="text-[10px] text-slate-500 hidden sm:block">{step.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Digital Downloads Section (If packages exist) */}
        {(order.packages || order.digital_packages) && ((order.packages || order.digital_packages)!.length > 0) && (
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 lg:p-8 space-y-6 shadow-xl">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold text-slate-100 flex items-center gap-2">
                  <span>⚡</span> High-Resolution Digital Downloads
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Download full-resolution, master-retouched photography files for printing and archiving.
                </p>
              </div>
            </div>

            {downloadError && (
              <div className="bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs p-3 rounded-xl">
                {downloadError}
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {(order.packages || order.digital_packages)!.map((pkg) => (
                <div
                  key={pkg.id}
                  className="bg-slate-950 border border-slate-800/80 rounded-2xl p-5 flex flex-col justify-between space-y-4 hover:border-slate-700 transition"
                >
                  <div className="space-y-1">
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">
                      ZIP Archive • Master Edits
                    </span>
                    <h4 className="text-sm font-bold text-slate-100 pt-1">{pkg.name}</h4>
                    <p className="text-xs text-slate-400">
                      Expires: {pkg.expires_at ? new Date(pkg.expires_at).toLocaleDateString() : 'Never'}
                    </p>
                  </div>

                  <button
                    disabled={downloadingPackageId === pkg.id}
                    onClick={() => handleDownloadPackage(pkg.id)}
                    className="w-full bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-800 text-white text-xs font-semibold py-2.5 rounded-xl transition shadow-lg shadow-indigo-600/25 flex items-center justify-center gap-2"
                  >
                    <span>📥</span>
                    <span>
                      {downloadingPackageId === pkg.id ? 'Generating Secure Link...' : 'Download Master Files'}
                    </span>
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Physical Deliveries & Shipments Section */}
        {order.deliveries && order.deliveries.length > 0 && (
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 lg:p-8 space-y-6 shadow-xl">
            <div>
              <h3 className="text-lg font-bold text-slate-100 flex items-center gap-2">
                <span>📦</span> Physical Prints & Album Shipments
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Track your package from our professional fine art printing lab directly to your door.
              </p>
            </div>

            <div className="space-y-4">
              {order.deliveries.map((del) => (
                <div key={del.id} className="bg-slate-950 border border-slate-800 rounded-2xl p-5 space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="text-xs font-bold text-slate-200">
                        {del.courier_name || del.courier || 'Courier'} {del.tracking_number ? `• Tracking #${del.tracking_number}` : ''}
                      </p>
                      {del.shipped_at && (
                        <p className="text-[11px] text-slate-400">Shipped on {new Date(del.shipped_at).toLocaleDateString()}</p>
                      )}
                    </div>

                    <span className="text-[10px] font-semibold px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/30">
                      {del.status.replace(/_/g, ' ')}
                    </span>
                  </div>

                  {del.tracking_url && (
                    <a
                      href={del.tracking_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 text-xs text-indigo-400 hover:text-indigo-300 font-semibold transition"
                    >
                      <span>Track Shipment on {del.courier_name} ↗</span>
                    </a>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Itemized Receipt & Order Summary */}
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 lg:p-8 space-y-6 shadow-xl">
          <h3 className="text-lg font-bold text-slate-100">Order Summary & Items</h3>

          <div className="divide-y divide-slate-800/60">
            {order.items?.map((item) => (
              <div key={item.id} className="py-4 flex items-start justify-between gap-4">
                <div className="space-y-1">
                  <p className="text-xs font-bold text-slate-200">{item.item_name}</p>
                  <p className="text-[11px] text-slate-400">
                    Quantity: {item.quantity} {item.variant_name ? `• ${item.variant_name}` : ''}
                  </p>
                  {item.photos && item.photos.length > 0 && (
                    <div className="flex items-center gap-1.5 pt-1.5">
                      {item.photos.slice(0, 6).map((p) => (
                        <div key={p.id} className="w-9 h-9 rounded-lg bg-slate-800 overflow-hidden border border-slate-700">
                          <img src={p.thumbnail_url || p.photo?.thumbnail_url || ''} alt="" className="w-full h-full object-cover" />
                        </div>
                      ))}
                      {item.photos.length > 6 && (
                        <span className="text-[10px] text-slate-400">+{item.photos.length - 6} more</span>
                      )}
                    </div>
                  )}
                </div>

                <div className="text-right">
                  <p className="text-xs font-semibold text-slate-200">
                    {(((item.quantity || 1) * (item.unit_price_cents ?? Math.round((item.unit_price || 0) * 100))) / 100).toLocaleString('en-US', {
                      style: 'currency',
                      currency: order.currency || 'USD',
                    })}
                  </p>
                  <span className="text-[10px] text-slate-500">{item.status}</span>
                </div>
              </div>
            ))}
          </div>

          {/* Pricing Totals */}
          <div className="pt-4 border-t border-slate-800 space-y-2 text-xs">
            <div className="flex justify-between text-slate-400">
              <span>Subtotal</span>
              <span>
                {((order.subtotal_cents ?? Math.round((order.subtotal || 0) * 100)) / 100).toLocaleString('en-US', {
                  style: 'currency',
                  currency: order.currency || 'USD',
                })}
              </span>
            </div>
            {order.shipping_cents && order.shipping_cents > 0 ? (
              <div className="flex justify-between text-slate-400">
                <span>Shipping</span>
                <span>
                  {(order.shipping_cents / 100).toLocaleString('en-US', {
                    style: 'currency',
                    currency: order.currency || 'USD',
                  })}
                </span>
              </div>
            ) : null}
            <div className="flex justify-between font-bold text-sm text-slate-100 pt-2 border-t border-slate-800">
              <span>Total</span>
              <span>
                {((order.total_price_cents ?? Math.round((order.total_amount || 0) * 100)) / 100).toLocaleString('en-US', {
                  style: 'currency',
                  currency: order.currency || 'USD',
                })}
              </span>
            </div>
            <div className="flex justify-between font-semibold text-xs text-emerald-400">
              <span>Paid to Date</span>
              <span>
                {((order.paid_amount_cents ?? Math.round((order.paid_amount || 0) * 100)) / 100).toLocaleString('en-US', {
                  style: 'currency',
                  currency: order.currency || 'USD',
                })}
              </span>
            </div>
          </div>
        </div>
      </main>

      {/* Confirm Delivery Modal */}
      {isConfirmModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 lg:p-8 max-w-md w-full space-y-5 shadow-2xl">
            <div>
              <h3 className="text-lg font-bold">Confirm Delivery Receipt</h3>
              <p className="text-xs text-slate-400 mt-1">
                Let your photographer know that you have safely received your deliverables.
              </p>
            </div>

            <form onSubmit={handleConfirmDelivery} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-400 mb-1.5">How would you rate your experience?</label>
                <div className="flex items-center gap-2">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setClientRating(star)}
                      className={`text-xl transition ${
                        clientRating >= star ? 'text-amber-400' : 'text-slate-700 hover:text-slate-500'
                      }`}
                    >
                      ★
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-slate-400 mb-1">Feedback / Thank you note (Optional)</label>
                <textarea
                  rows={3}
                  placeholder="Everything looks stunning! Thank you so much..."
                  value={clientFeedback}
                  onChange={(e) => setClientFeedback(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl p-3 text-slate-200 focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsConfirmModalOpen(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={confirming}
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-800 text-white rounded-xl font-semibold"
                >
                  {confirming ? 'Submitting...' : 'Confirm Delivery'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
