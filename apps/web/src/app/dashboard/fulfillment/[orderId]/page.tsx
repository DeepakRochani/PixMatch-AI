'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { fetchApi } from '@/lib/api-client';
import {
  IFulfillmentOrder,
  FulfillmentOrderStatus,
  FulfillmentPaymentStatus,
  FulfillmentDeliveryType,
  FulfillmentDeliveryStatus,
} from '@pixmatch/types';

export default function StudioOrderDetailPage() {
  const params = useParams();
  const router = useRouter();
  const orderId = params?.orderId as string;

  const [order, setOrder] = useState<IFulfillmentOrder | null>(null);
  const [loading, setLoading] = useState(true);

  // Modals / Actions state
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState<number>(0);
  const [paymentMethod, setPaymentMethod] = useState('STRIPE');
  const [paymentNotes, setPaymentNotes] = useState('');
  const [recordingPayment, setRecordingPayment] = useState(false);

  const [isShipmentModalOpen, setIsShipmentModalOpen] = useState(false);
  const [courierName, setCourierName] = useState('FedEx');
  const [trackingNumber, setTrackingNumber] = useState('');
  const [trackingUrl, setTrackingUrl] = useState('');
  const [creatingShipment, setCreatingShipment] = useState(false);

  const [isPackageModalOpen, setIsPackageModalOpen] = useState(false);
  const [packageName, setPackageName] = useState('High-Resolution Master Delivery');
  const [packageExpiryDays, setPackageExpiryDays] = useState(30);
  const [creatingPackage, setCreatingPackage] = useState(false);

  const [actionLoading, setActionLoading] = useState(false);

  const loadOrder = async () => {
    if (!orderId) return;
    setLoading(true);
    const res = await fetchApi<IFulfillmentOrder>(`/v1/fulfillment/orders/${orderId}`);
    if (res.success && res.data) {
      setOrder(res.data);
      const totalCents = res.data.total_price_cents ?? Math.round((res.data.total_amount || 0) * 100);
      const paidCents = res.data.paid_amount_cents ?? Math.round((res.data.paid_amount || 0) * 100);
      const balance = (totalCents - paidCents) / 100;
      setPaymentAmount(Math.max(0, balance));
    }
    setLoading(false);
  };

  useEffect(() => {
    loadOrder();
  }, [orderId]);

  const handleStatusChange = async (newStatus: FulfillmentOrderStatus) => {
    if (!order) return;
    setActionLoading(true);
    const res = await fetchApi(`/v1/fulfillment/orders/${order.id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status: newStatus }),
    });
    setActionLoading(false);
    if (res.success) {
      loadOrder();
    } else {
      alert(res.error?.message || 'Failed to update order status.');
    }
  };

  const handleRecordPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!order || paymentAmount <= 0) return;
    setRecordingPayment(true);

    const res = await fetchApi(`/v1/fulfillment/orders/${order.id}/payments`, {
      method: 'POST',
      body: JSON.stringify({
        amount_cents: Math.round(paymentAmount * 100),
        currency: order.currency || 'USD',
        payment_method: paymentMethod,
        notes: paymentNotes.trim() || undefined,
      }),
    });

    setRecordingPayment(false);
    if (res.success) {
      setIsPaymentModalOpen(false);
      setPaymentNotes('');
      loadOrder();
    } else {
      alert(res.error?.message || 'Failed to record payment.');
    }
  };

  const handleCreateShipment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!order) return;
    setCreatingShipment(true);

    const res = await fetchApi(`/v1/fulfillment/orders/${order.id}/deliveries/physical`, {
      method: 'POST',
      body: JSON.stringify({
        courier_name: courierName.trim(),
        tracking_number: trackingNumber.trim() || undefined,
        tracking_url: trackingUrl.trim() || undefined,
        delivery_status: FulfillmentDeliveryStatus.DISPATCHED,
      }),
    });

    setCreatingShipment(false);
    if (res.success) {
      setIsShipmentModalOpen(false);
      setTrackingNumber('');
      setTrackingUrl('');
      loadOrder();
    } else {
      alert(res.error?.message || 'Failed to create shipment.');
    }
  };

  const handleCreatePackage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!order) return;
    setCreatingPackage(true);

    const expiry = new Date();
    expiry.setDate(expiry.getDate() + packageExpiryDays);

    const res = await fetchApi(`/v1/fulfillment/orders/${order.id}/packages/digital`, {
      method: 'POST',
      body: JSON.stringify({
        name: packageName.trim(),
        expires_at: expiry.toISOString(),
        max_downloads: 15,
      }),
    });

    setCreatingPackage(false);
    if (res.success) {
      setIsPackageModalOpen(false);
      loadOrder();
    } else {
      alert(res.error?.message || 'Failed to create digital package.');
    }
  };

  if (loading) {
    return (
      <div className="p-10 max-w-6xl mx-auto text-center text-slate-500 text-sm">
        Loading order details...
      </div>
    );
  }

  if (!order) {
    return (
      <div className="p-10 max-w-6xl mx-auto text-center space-y-4">
        <p className="text-slate-400">Order not found.</p>
        <Link href="/dashboard/fulfillment" className="text-indigo-400 hover:underline text-xs">
          ← Back to Fulfillment Dashboard
        </Link>
      </div>
    );
  }

  const isPaid = order.payment_status === FulfillmentPaymentStatus.PAID;
  const orderTotalCents = order.total_price_cents ?? Math.round((order.total_amount || 0) * 100);
  const orderPaidCents = order.paid_amount_cents ?? Math.round((order.paid_amount || 0) * 100);
  const balanceCents = orderTotalCents - orderPaidCents;

  return (
    <div className="p-6 lg:p-10 max-w-6xl mx-auto space-y-8 text-slate-100 font-sans">
      {/* Breadcrumb & Navigation */}
      <div className="flex items-center justify-between">
        <Link
          href="/dashboard/fulfillment"
          className="text-xs text-slate-400 hover:text-slate-200 transition flex items-center gap-1.5"
        >
          <span>←</span> Back to Fulfillment Dashboard
        </Link>
        <div className="flex items-center gap-2">
          {order.raw_token && (
            <a
              href={`/portal/order/${order.raw_token}`}
              target="_blank"
              rel="noopener noreferrer"
              className="bg-slate-800 hover:bg-slate-700 text-indigo-300 text-xs font-semibold px-3 py-1.5 rounded-lg border border-slate-700 transition flex items-center gap-1.5"
            >
              <span>🌐</span> Open Client Delivery Portal ↗
            </a>
          )}
        </div>
      </div>

      {/* Header Banner */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold font-mono text-slate-100">{order.order_number}</h1>
            <span
              className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                order.status === FulfillmentOrderStatus.DELIVERED || order.status === FulfillmentOrderStatus.COMPLETED
                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                  : order.status === FulfillmentOrderStatus.READY_FOR_DELIVERY
                  ? 'bg-indigo-500/20 text-indigo-400 border border-indigo-500/30'
                  : order.status === FulfillmentOrderStatus.PRINTING_LAB || order.status === FulfillmentOrderStatus.PROCESSING
                  ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                  : 'bg-slate-800 text-slate-400 border border-slate-700'
              }`}
            >
              {order.status.replace(/_/g, ' ')}
            </span>
            <span
              className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                isPaid
                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                  : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
              }`}
            >
              {order.payment_status.replace(/_/g, ' ')}
            </span>
          </div>
          <p className="text-slate-400 text-xs mt-1">
            Client: <strong className="text-slate-200">{order.client_name || 'Client'}</strong> ({order.client_email || 'No email'}) • Created {new Date(order.created_at).toLocaleDateString()}
          </p>
        </div>

        {/* Status Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          {order.status === FulfillmentOrderStatus.DRAFT && (
            <button
              disabled={actionLoading}
              onClick={() => handleStatusChange(FulfillmentOrderStatus.PAYMENT_PENDING)}
              className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold px-3.5 py-2 rounded-xl transition"
            >
              Request Payment
            </button>
          )}

          {(order.status === FulfillmentOrderStatus.PAYMENT_PENDING || order.status === FulfillmentOrderStatus.DRAFT) && (
            <button
              disabled={actionLoading}
              onClick={() => handleStatusChange(FulfillmentOrderStatus.PROCESSING)}
              className="bg-amber-600 hover:bg-amber-500 text-white text-xs font-semibold px-3.5 py-2 rounded-xl transition"
            >
              Start Processing
            </button>
          )}

          {order.status === FulfillmentOrderStatus.PROCESSING && (
            <button
              disabled={actionLoading}
              onClick={() => handleStatusChange(FulfillmentOrderStatus.PRINTING_LAB)}
              className="bg-amber-600 hover:bg-amber-500 text-white text-xs font-semibold px-3.5 py-2 rounded-xl transition"
            >
              Send to Printing Lab
            </button>
          )}

          {(order.status === FulfillmentOrderStatus.PROCESSING || order.status === FulfillmentOrderStatus.PRINTING_LAB) && (
            <button
              disabled={actionLoading}
              onClick={() => handleStatusChange(FulfillmentOrderStatus.READY_FOR_DELIVERY)}
              className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold px-3.5 py-2 rounded-xl transition"
            >
              ✓ Mark Ready for Delivery
            </button>
          )}

          {order.status === FulfillmentOrderStatus.READY_FOR_DELIVERY && (
            <button
              disabled={actionLoading}
              onClick={() => handleStatusChange(FulfillmentOrderStatus.DELIVERED)}
              className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold px-3.5 py-2 rounded-xl transition"
            >
              ✓ Mark Delivered
            </button>
          )}
        </div>
      </div>

      {/* Grid: Order Items & Delivery Details */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Items & Packages */}
        <div className="lg:col-span-2 space-y-6">
          {/* Order Items */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
            <h3 className="text-sm font-bold text-slate-200 uppercase tracking-wider">Order Items</h3>
            <div className="divide-y divide-slate-800/60">
              {order.items?.map((item) => (
                <div key={item.id} className="py-3.5 flex items-start justify-between gap-4">
                  <div className="space-y-1">
                    <p className="text-xs font-semibold text-slate-200">{item.item_name}</p>
                    <p className="text-[11px] text-slate-400">
                      Type: {item.product_type} • Qty: {item.quantity} {item.variant_name ? `• Variant: ${item.variant_name}` : ''}
                    </p>
                    {item.photos && item.photos.length > 0 && (
                      <div className="flex items-center gap-1.5 pt-1">
                        {item.photos.slice(0, 5).map((p) => (
                          <div key={p.id} className="w-8 h-8 rounded bg-slate-800 overflow-hidden border border-slate-700">
                            <img src={p.photo?.thumbnail_url || ''} alt="" className="w-full h-full object-cover" />
                          </div>
                        ))}
                        {item.photos.length > 5 && (
                          <span className="text-[10px] text-slate-400">+{item.photos.length - 5} more</span>
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
          </div>

          {/* Digital Delivery Packages */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-200 uppercase tracking-wider">Digital Download Packages</h3>
              <button
                onClick={() => setIsPackageModalOpen(true)}
                className="bg-slate-800 hover:bg-slate-700 text-indigo-300 text-xs font-medium px-3 py-1.5 rounded-lg transition border border-slate-700"
              >
                + Create Package
              </button>
            </div>

            {order.packages && order.packages.length > 0 ? (
              <div className="space-y-3">
                {order.packages.map((pkg) => (
                  <div key={pkg.id} className="bg-slate-950/50 border border-slate-800 rounded-xl p-4 space-y-2">
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-semibold text-slate-200">{pkg.name}</p>
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">
                        {pkg.download_count} Downloads
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400">
                      Expires: {pkg.expires_at ? new Date(pkg.expires_at).toLocaleDateString() : 'Never'} • Max: {pkg.max_downloads || 'Unlimited'}
                    </p>
                    {pkg.downloads && pkg.downloads.length > 0 && (
                      <div className="pt-2 border-t border-slate-800/60 text-[10px] text-slate-500">
                        Last downloaded {new Date(pkg.downloads[0].downloaded_at).toLocaleString()}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-slate-500 py-3">No digital download packages created yet.</p>
            )}
          </div>

          {/* Physical Deliveries & Shipments */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-200 uppercase tracking-wider">Physical Shipments & Lab Tracking</h3>
              <button
                onClick={() => setIsShipmentModalOpen(true)}
                className="bg-slate-800 hover:bg-slate-700 text-indigo-300 text-xs font-medium px-3 py-1.5 rounded-lg transition border border-slate-700"
              >
                + Add Shipment
              </button>
            </div>

            {order.deliveries && order.deliveries.length > 0 ? (
              <div className="space-y-3">
                {order.deliveries.map((del) => (
                  <div key={del.id} className="bg-slate-950/50 border border-slate-800 rounded-xl p-4 space-y-2">
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-semibold text-slate-200">
                        {del.courier_name} {del.tracking_number ? `• ${del.tracking_number}` : ''}
                      </p>
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/30">
                        {del.status}
                      </span>
                    </div>
                    {del.tracking_url && (
                      <a
                        href={del.tracking_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[11px] text-indigo-400 hover:underline block"
                      >
                        Track Package on Courier Website ↗
                      </a>
                    )}
                    {del.shipped_at && (
                      <p className="text-[11px] text-slate-400">Shipped: {new Date(del.shipped_at).toLocaleDateString()}</p>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-slate-500 py-3">No physical shipments tracked for this order.</p>
            )}
          </div>
        </div>

        {/* Right 1 Col: Financials & Payments */}
        <div className="space-y-6">
          {/* Financial Summary */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
            <h3 className="text-sm font-bold text-slate-200 uppercase tracking-wider">Financial Overview</h3>

            <div className="space-y-2 text-xs divide-y divide-slate-800/60">
              <div className="flex justify-between pt-1">
                <span className="text-slate-400">Subtotal</span>
                <span className="text-slate-200">
                  {((order.subtotal_cents ?? Math.round((order.subtotal || 0) * 100)) / 100).toLocaleString('en-US', {
                    style: 'currency',
                    currency: order.currency || 'USD',
                  })}
                </span>
              </div>
              <div className="flex justify-between pt-2">
                <span className="text-slate-400">Tax</span>
                <span className="text-slate-200">
                  {((order.tax_cents ?? Math.round((order.tax_total || 0) * 100)) / 100).toLocaleString('en-US', {
                    style: 'currency',
                    currency: order.currency || 'USD',
                  })}
                </span>
              </div>
              <div className="flex justify-between pt-2">
                <span className="text-slate-400">Shipping</span>
                <span className="text-slate-200">
                  {((order.shipping_cents || 0) / 100).toLocaleString('en-US', {
                    style: 'currency',
                    currency: order.currency || 'USD',
                  })}
                </span>
              </div>
              <div className="flex justify-between pt-2 font-bold text-sm text-slate-100">
                <span>Total Amount</span>
                <span>
                  {(orderTotalCents / 100).toLocaleString('en-US', {
                    style: 'currency',
                    currency: order.currency || 'USD',
                  })}
                </span>
              </div>
              <div className="flex justify-between pt-2 text-emerald-400 font-semibold">
                <span>Paid to Date</span>
                <span>
                  {(orderPaidCents / 100).toLocaleString('en-US', {
                    style: 'currency',
                    currency: order.currency || 'USD',
                  })}
                </span>
              </div>
              <div className="flex justify-between pt-2 text-rose-400 font-semibold">
                <span>Balance Due</span>
                <span>
                  {(Math.max(0, balanceCents) / 100).toLocaleString('en-US', {
                    style: 'currency',
                    currency: order.currency || 'USD',
                  })}
                </span>
              </div>
            </div>

            <button
              onClick={() => setIsPaymentModalOpen(true)}
              className="w-full bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold py-2.5 rounded-xl transition shadow-lg shadow-indigo-600/25"
            >
              + Record Payment
            </button>
          </div>

          {/* Payment Transactions Log */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-3">
            <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider">Payment History</h3>
            {order.payments && order.payments.length > 0 ? (
              <div className="space-y-2 text-xs">
                {order.payments.map((p) => (
                  <div key={p.id} className="bg-slate-950 p-3 rounded-xl border border-slate-800 space-y-1">
                    <div className="flex justify-between font-semibold text-slate-200">
                      <span>{p.payment_method}</span>
                      <span className="text-emerald-400">
                        +{(p.amount_cents / 100).toLocaleString('en-US', {
                          style: 'currency',
                          currency: p.currency || 'USD',
                        })}
                      </span>
                    </div>
                    <p className="text-[10px] text-slate-500">{new Date(p.created_at).toLocaleString()}</p>
                    {p.notes && <p className="text-[10px] text-slate-400 italic">{p.notes}</p>}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-slate-500">No payments recorded yet.</p>
            )}
          </div>
        </div>
      </div>

      {/* Record Payment Modal */}
      {isPaymentModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 max-w-sm w-full space-y-4 shadow-2xl">
            <h3 className="text-base font-bold">Record Client Payment</h3>
            <p className="text-xs text-slate-400">
              Automatically creates an INCOME transaction in Phase 18 Studio Business Intelligence.
            </p>

            <form onSubmit={handleRecordPayment} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-400 mb-1">Amount ($)</label>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  value={paymentAmount}
                  onChange={(e) => setPaymentAmount(Number(e.target.value))}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-slate-200 focus:outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1">Payment Method</label>
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-slate-200 focus:outline-none"
                >
                  <option value="STRIPE">Stripe</option>
                  <option value="BANK_TRANSFER">Bank Transfer / ACH</option>
                  <option value="CASH">Cash</option>
                  <option value="CARD_POS">In-person POS Terminal</option>
                  <option value="OTHER">Other</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-400 mb-1">Notes / Transaction ID</label>
                <input
                  type="text"
                  placeholder="e.g. ch_3M5x..."
                  value={paymentNotes}
                  onChange={(e) => setPaymentNotes(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-slate-200 focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsPaymentModalOpen(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={recordingPayment}
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-800 text-white rounded-xl font-semibold"
                >
                  {recordingPayment ? 'Recording...' : 'Record Payment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Shipment Modal */}
      {isShipmentModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 max-w-sm w-full space-y-4 shadow-2xl">
            <h3 className="text-base font-bold">Add Physical Shipment</h3>
            <p className="text-xs text-slate-400">Track courier details and lab delivery progress.</p>

            <form onSubmit={handleCreateShipment} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-400 mb-1">Courier Name</label>
                <input
                  type="text"
                  placeholder="FedEx, UPS, DHL..."
                  value={courierName}
                  onChange={(e) => setCourierName(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-slate-200 focus:outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1">Tracking Number</label>
                <input
                  type="text"
                  placeholder="e.g. 78291829102"
                  value={trackingNumber}
                  onChange={(e) => setTrackingNumber(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-slate-200 font-mono focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1">Tracking URL (Optional)</label>
                <input
                  type="url"
                  placeholder="https://..."
                  value={trackingUrl}
                  onChange={(e) => setTrackingUrl(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-slate-200 focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsShipmentModalOpen(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creatingShipment}
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-800 text-white rounded-xl font-semibold"
                >
                  {creatingShipment ? 'Saving...' : 'Add Shipment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Package Modal */}
      {isPackageModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 max-w-sm w-full space-y-4 shadow-2xl">
            <h3 className="text-base font-bold">Create Digital Package</h3>
            <p className="text-xs text-slate-400">Bundle high-res deliverables with secure download telemetry.</p>

            <form onSubmit={handleCreatePackage} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-400 mb-1">Package Title</label>
                <input
                  type="text"
                  value={packageName}
                  onChange={(e) => setPackageName(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-slate-200 focus:outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1">Expiry (Days from now)</label>
                <input
                  type="number"
                  min={1}
                  value={packageExpiryDays}
                  onChange={(e) => setPackageExpiryDays(Number(e.target.value))}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-slate-200 focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsPackageModalOpen(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creatingPackage}
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-800 text-white rounded-xl font-semibold"
                >
                  {creatingPackage ? 'Creating...' : 'Create Package'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
