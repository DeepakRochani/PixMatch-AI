'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { fetchApi } from '@/lib/api-client';
import {
  IFulfillmentOrder,
  IFulfillmentAnalyticsSummaryDTO,
  FulfillmentOrderStatus,
  FulfillmentPaymentStatus,
  FulfillmentDeliveryType,
} from '@pixmatch/types';

export default function StudioFulfillmentDashboardPage() {
  const [orders, setOrders] = useState<IFulfillmentOrder[]>([]);
  const [summary, setSummary] = useState<IFulfillmentAnalyticsSummaryDTO | null>(null);
  const [proofingSessions, setProofingSessions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'ALL' | 'PENDING' | 'PROCESSING' | 'READY' | 'DELIVERED'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // Create Order Modal
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [creationMode, setCreationMode] = useState<'PROOFING' | 'MANUAL'>('PROOFING');
  const [selectedProofingSessionId, setSelectedProofingSessionId] = useState('');
  const [clientName, setClientName] = useState('');
  const [clientEmail, setClientEmail] = useState('');
  const [orderNotes, setOrderNotes] = useState('');
  const [creating, setCreating] = useState(false);
  const [createdOrder, setCreatedOrder] = useState<any | null>(null);

  const loadData = async () => {
    setLoading(true);
    const [summaryRes, ordersRes, proofingRes] = await Promise.all([
      fetchApi<IFulfillmentAnalyticsSummaryDTO>('/v1/fulfillment/analytics/summary'),
      fetchApi<IFulfillmentOrder[]>('/v1/fulfillment/orders'),
      fetchApi<any[]>('/v1/proofing/sessions'),
    ]);

    if (summaryRes.success && summaryRes.data) setSummary(summaryRes.data);
    if (ordersRes.success && ordersRes.data) setOrders(ordersRes.data);
    if (proofingRes.success && proofingRes.data) {
      const list = Array.isArray(proofingRes.data) ? proofingRes.data : (proofingRes.data as any).sessions || [];
      // Filter sessions that are submitted or approved
      setProofingSessions(list.filter((s: any) => s.status === 'APPROVED' || s.status === 'SUBMITTED' || s.status === 'ACTIVE'));
    }
    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleCreateOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);

    let res: any;
    if (creationMode === 'PROOFING') {
      if (!selectedProofingSessionId) return;
      res = await fetchApi<any>('/v1/fulfillment/orders/from-proofing', {
        method: 'POST',
        body: JSON.stringify({
          proofing_session_id: selectedProofingSessionId,
          notes: orderNotes.trim() || undefined,
        }),
      });
    } else {
      if (!clientName.trim()) return;
      res = await fetchApi<any>('/v1/fulfillment/orders/manual', {
        method: 'POST',
        body: JSON.stringify({
          client_name: clientName.trim(),
          client_email: clientEmail.trim() || undefined,
          notes: orderNotes.trim() || undefined,
          items: [
            {
              item_name: 'Digital Gallery Delivery',
              product_type: 'DIGITAL_DOWNLOAD',
              quantity: 1,
              unit_price_cents: 0,
            },
          ],
        }),
      });
    }

    setCreating(false);
    if (res.success && res.data) {
      setCreatedOrder(res.data);
      loadData();
    } else {
      alert(res.error?.message || 'Failed to create fulfillment order.');
    }
  };

  const filteredOrders = orders.filter((o) => {
    const matchesSearch =
      o.order_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (o.client_name && o.client_name.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (o.client_email && o.client_email.toLowerCase().includes(searchQuery.toLowerCase()));

    if (!matchesSearch) return false;

    if (activeTab === 'PENDING') return o.status === FulfillmentOrderStatus.DRAFT || o.status === FulfillmentOrderStatus.PAYMENT_PENDING;
    if (activeTab === 'PROCESSING') return o.status === FulfillmentOrderStatus.PROCESSING || o.status === FulfillmentOrderStatus.PRINTING_LAB;
    if (activeTab === 'READY') return o.status === FulfillmentOrderStatus.READY_FOR_DELIVERY || o.status === FulfillmentOrderStatus.OUT_FOR_DELIVERY;
    if (activeTab === 'DELIVERED') return o.status === FulfillmentOrderStatus.DELIVERED || o.status === FulfillmentOrderStatus.COMPLETED;
    return true;
  });

  return (
    <div className="p-6 lg:p-10 max-w-7xl mx-auto space-y-8 text-slate-100 font-sans">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Photo Fulfillment & Delivery</h1>
          <p className="text-slate-400 text-sm mt-1">
            Manage client orders, print/lab shipments, high-res digital delivery packages, and client delivery confirmation.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/dashboard/fulfillment/products"
            className="bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold px-4 py-2.5 rounded-xl transition border border-slate-700 flex items-center gap-2"
          >
            <span>📦</span> Product Catalog
          </Link>

          <button
            onClick={() => {
              setCreatedOrder(null);
              setIsCreateModalOpen(true);
            }}
            className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold px-4 py-2.5 rounded-xl transition shadow-lg shadow-indigo-600/25 flex items-center gap-2"
          >
            <span>+</span> Create Fulfillment Order
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-1">
          <p className="text-xs font-medium text-slate-400">Total Orders</p>
          <p className="text-2xl font-bold text-indigo-400">{summary?.total_orders || 0}</p>
          <p className="text-[11px] text-slate-500">{(summary?.ready_orders ?? summary?.by_status?.READY_FOR_DELIVERY ?? 0)} ready to ship</p>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-1">
          <p className="text-xs font-medium text-slate-400">In Production / Lab</p>
          <p className="text-2xl font-bold text-amber-400">
            {summary?.in_production_orders ?? ((summary?.by_status?.PROCESSING || 0) + (summary?.by_status?.PRINTING_LAB || 0))}
          </p>
          <p className="text-[11px] text-slate-500">Printing, framing, binding</p>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-1">
          <p className="text-xs font-medium text-slate-400">Completed / Delivered</p>
          <p className="text-2xl font-bold text-emerald-400">
            {summary?.delivered_orders ?? ((summary?.by_status?.DELIVERED || 0) + (summary?.by_status?.COMPLETED || 0))}
          </p>
          <p className="text-[11px] text-slate-500">{summary?.total_downloads || 0} digital downloads</p>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-1">
          <p className="text-xs font-medium text-slate-400">Total Revenue</p>
          <p className="text-2xl font-bold text-emerald-400">
            {summary?.formatted_revenue || `$${((summary?.total_revenue || 0) / 100).toFixed(2)}`}
          </p>
          <p className="text-[11px] text-slate-500">
            {summary?.formatted_collected || `$${((summary?.total_revenue || 0) / 100).toFixed(2)}`} collected
          </p>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-1">
          <p className="text-xs font-medium text-slate-400">Avg. Order Value</p>
          <p className="text-2xl font-bold text-indigo-300">
            {summary?.formatted_aov || `$${((summary?.average_order_value || 0) / 100).toFixed(2)}`}
          </p>
          <p className="text-[11px] text-slate-500">Across digital & prints</p>
        </div>
      </div>

      {/* Orders Table & Search/Filter Controls */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden space-y-4 p-6">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800 pb-4">
          {/* Tab Pills */}
          <div className="flex items-center gap-2">
            {(['ALL', 'PENDING', 'PROCESSING', 'READY', 'DELIVERED'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${
                  activeTab === tab
                    ? 'bg-indigo-600 text-white'
                    : 'bg-slate-800 text-slate-400 hover:text-slate-200'
                }`}
              >
                {tab.charAt(0) + tab.slice(1).toLowerCase()}
              </button>
            ))}
          </div>

          {/* Search Input */}
          <div className="w-full sm:w-64">
            <input
              type="text"
              placeholder="Search by order #, client, email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
            />
          </div>
        </div>

        {/* Table */}
        {loading ? (
          <div className="py-12 text-center text-slate-500 text-xs">Loading fulfillment orders...</div>
        ) : filteredOrders.length === 0 ? (
          <div className="py-12 text-center text-slate-500 text-xs">No fulfillment orders found.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="text-slate-400 border-b border-slate-800 font-medium">
                <tr>
                  <th className="pb-3 px-3">Order Number</th>
                  <th className="pb-3 px-3">Client</th>
                  <th className="pb-3 px-3">Fulfillment Type</th>
                  <th className="pb-3 px-3">Status</th>
                  <th className="pb-3 px-3">Payment</th>
                  <th className="pb-3 px-3">Amount</th>
                  <th className="pb-3 px-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {filteredOrders.map((order) => {
                  const isPaid = order.payment_status === FulfillmentPaymentStatus.PAID;
                  const isFullyDelivered = order.status === FulfillmentOrderStatus.DELIVERED || order.status === FulfillmentOrderStatus.COMPLETED;

                  return (
                    <tr key={order.id} className="hover:bg-slate-800/30 transition">
                      <td className="py-3.5 px-3 font-semibold text-slate-200">
                        <Link href={`/dashboard/fulfillment/${order.id}`} className="hover:text-indigo-400 font-mono">
                          {order.order_number}
                        </Link>
                      </td>
                      <td className="py-3.5 px-3">
                        <p className="text-slate-200 font-medium">{order.client_name || 'Client'}</p>
                        <p className="text-[11px] text-slate-400">{order.client_email || '—'}</p>
                      </td>
                      <td className="py-3.5 px-3">
                        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-medium bg-slate-800 border border-slate-700 text-slate-300">
                          {order.delivery_type === FulfillmentDeliveryType.DIGITAL_DOWNLOAD && '⚡ Digital Download'}
                          {order.delivery_type === FulfillmentDeliveryType.PHYSICAL_SHIPMENT && '📦 Physical Print/Album'}
                          {order.delivery_type === FulfillmentDeliveryType.HYBRID && '⚡📦 Hybrid Delivery'}
                          {order.delivery_type === FulfillmentDeliveryType.STUDIO_PICKUP && '🏢 Studio Pickup'}
                        </span>
                      </td>
                      <td className="py-3.5 px-3">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                            isFullyDelivered
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
                      </td>
                      <td className="py-3.5 px-3">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                            isPaid
                              ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                              : order.payment_status === FulfillmentPaymentStatus.PARTIALLY_PAID
                              ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                              : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                          }`}
                        >
                          {order.payment_status.replace(/_/g, ' ')}
                        </span>
                      </td>
                      <td className="py-3.5 px-3 text-slate-200 font-semibold">
                        {(((order.total_price_cents ?? Math.round((order.total_amount || 0) * 100))) / 100).toLocaleString('en-US', {
                          style: 'currency',
                          currency: order.currency || 'USD',
                        })}
                      </td>
                      <td className="py-3.5 px-3 text-right">
                        <Link
                          href={`/dashboard/fulfillment/${order.id}`}
                          className="px-3 py-1 bg-slate-800 hover:bg-slate-700 text-indigo-300 hover:text-indigo-200 rounded-lg text-xs font-medium transition"
                        >
                          Manage Order →
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Create Order Modal */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 max-w-md w-full space-y-5 shadow-2xl">
            <div>
              <h3 className="text-lg font-bold">New Fulfillment Order</h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Generate an order from an approved proofing selection or build a custom manual order.
              </p>
            </div>

            {createdOrder ? (
              <div className="space-y-4">
                <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 p-4 rounded-xl text-xs space-y-2">
                  <p className="font-semibold">✓ Order Created Successfully!</p>
                  <p className="text-slate-300">Order Number: <span className="font-mono text-indigo-300">{createdOrder.order_number}</span></p>
                  {createdOrder.raw_token && (
                    <>
                      <p className="text-slate-300">Client Direct Delivery URL:</p>
                      <input
                        type="text"
                        readOnly
                        value={`${typeof window !== 'undefined' ? window.location.origin : ''}/portal/order/${createdOrder.raw_token}`}
                        className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-xs font-mono text-indigo-300"
                      />
                    </>
                  )}
                </div>
                <div className="flex items-center gap-3">
                  <Link
                    href={`/dashboard/fulfillment/${createdOrder.id}`}
                    className="flex-1 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold py-2.5 rounded-xl text-center transition"
                  >
                    Open Order Details
                  </Link>
                  <button
                    onClick={() => {
                      setIsCreateModalOpen(false);
                      setCreatedOrder(null);
                    }}
                    className="px-4 py-2.5 bg-slate-800 text-slate-300 text-xs rounded-xl"
                  >
                    Close
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleCreateOrder} className="space-y-4 text-xs">
                {/* Creation Mode Toggle */}
                <div className="grid grid-cols-2 gap-2 bg-slate-950 p-1 rounded-xl border border-slate-800">
                  <button
                    type="button"
                    onClick={() => setCreationMode('PROOFING')}
                    className={`py-1.5 rounded-lg font-medium transition ${
                      creationMode === 'PROOFING' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    From Proofing Session
                  </button>
                  <button
                    type="button"
                    onClick={() => setCreationMode('MANUAL')}
                    className={`py-1.5 rounded-lg font-medium transition ${
                      creationMode === 'MANUAL' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    Manual Order
                  </button>
                </div>

                {creationMode === 'PROOFING' ? (
                  <div>
                    <label className="block text-slate-400 mb-1">Approved Proofing Session</label>
                    <select
                      value={selectedProofingSessionId}
                      onChange={(e) => setSelectedProofingSessionId(e.target.value)}
                      className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-slate-200 focus:outline-none"
                      required
                    >
                      <option value="">Select an approved proofing session...</option>
                      {proofingSessions.map((ps) => (
                        <option key={ps.id} value={ps.id}>
                          {ps.name} ({ps.status})
                        </option>
                      ))}
                    </select>
                  </div>
                ) : (
                  <>
                    <div>
                      <label className="block text-slate-400 mb-1">Client Name</label>
                      <input
                        type="text"
                        placeholder="e.g. Eleanor Vance"
                        value={clientName}
                        onChange={(e) => setClientName(e.target.value)}
                        className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-slate-200 focus:outline-none"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-slate-400 mb-1">Client Email (Optional)</label>
                      <input
                        type="email"
                        placeholder="client@example.com"
                        value={clientEmail}
                        onChange={(e) => setClientEmail(e.target.value)}
                        className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-slate-200 focus:outline-none"
                      />
                    </div>
                  </>
                )}

                <div>
                  <label className="block text-slate-400 mb-1">Order Notes (Optional)</label>
                  <textarea
                    rows={2}
                    placeholder="Instructions for lab or packaging notes..."
                    value={orderNotes}
                    onChange={(e) => setOrderNotes(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-slate-200 focus:outline-none"
                  />
                </div>

                <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
                  <button
                    type="button"
                    onClick={() => setIsCreateModalOpen(false)}
                    className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={creating}
                    className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-800 text-white rounded-xl font-semibold"
                  >
                    {creating ? 'Creating...' : 'Create Order'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
