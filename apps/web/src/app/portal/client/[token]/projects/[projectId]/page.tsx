'use client';

import React, { useState, useEffect, use } from 'react';
import Link from 'next/link';
import { fetchApi } from '@/lib/api-client';
import { IClientPortalProjectDetailDTO } from '@pixmatch/types';

export default function ClientPortalProjectDetailPage({
  params,
}: {
  params: Promise<{ token: string; projectId: string }>;
}) {
  const resolvedParams = use(params);
  const token = resolvedParams.token;
  const projectId = resolvedParams.projectId;

  const [detail, setDetail] = useState<IClientPortalProjectDetailDTO | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  const loadDetail = async () => {
    setLoading(true);
    const res = await fetchApi<IClientPortalProjectDetailDTO>(
      `/v1/public/client-portal/${token}/projects/${projectId}`
    );
    if (res.success && res.data) {
      setDetail(res.data);
    } else {
      setError(res.error?.message || 'Failed to load project details.');
    }
    setLoading(false);
  };

  useEffect(() => {
    loadDetail();
  }, [token, projectId]);

  const handleDownload = async (packageId: string) => {
    setDownloadingId(packageId);
    const res = await fetchApi<{ download_url: string; filename: string }>(
      `/v1/public/client-portal/${token}/downloads/${packageId}/file`
    );
    setDownloadingId(null);
    if (res.success && res.data?.download_url) {
      window.open(res.data.download_url, '_blank');
      loadDetail();
    } else {
      alert(res.error?.message || 'Failed to download package.');
    }
  };

  const handleConfirmDelivery = async (deliveryId: string) => {
    const res = await fetchApi(
      `/v1/public/client-portal/${token}/delivery/${deliveryId}/confirm`,
      { method: 'POST' }
    );
    if (res.success) {
      alert('Delivery confirmed! Thank you.');
      loadDetail();
    } else {
      alert(res.error?.message || 'Failed to confirm delivery.');
    }
  };

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-10 w-64 bg-slate-900 rounded" />
        <div className="h-64 bg-slate-900 rounded-2xl border border-slate-800" />
      </div>
    );
  }

  if (error || !detail) {
    return (
      <div className="bg-rose-500/10 border border-rose-500/20 rounded-2xl p-6 text-rose-300 text-center">
        {error || 'Project detail not available.'}
      </div>
    );
  }

  const { project, galleries, proofing_sessions, selections_summary, orders, downloads, delivery_items } =
    detail;

  return (
    <div className="space-y-8">
      {/* Back Link & Header */}
      <div className="space-y-3">
        <Link
          href={`/portal/client/${token}/projects`}
          className="inline-flex items-center text-xs font-semibold text-slate-400 hover:text-slate-200 transition-colors"
        >
          ← Back to all projects
        </Link>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center space-x-2">
              <span className="text-xs font-semibold text-indigo-400 uppercase tracking-wider">
                {project.project_type.replace(/_/g, ' ')}
              </span>
              <span className="px-2.5 py-0.5 bg-slate-800 text-slate-300 border border-slate-700 rounded-full text-xs font-medium">
                {project.status}
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-100 tracking-tight mt-1">
              {project.name}
            </h1>
            {project.event_date && (
              <p className="text-xs text-slate-400 mt-0.5">
                📅 Event Date: {new Date(project.event_date).toLocaleDateString()}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Galleries Section */}
      <section className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-slate-100">Project Galleries</h2>
          <span className="text-xs text-slate-400">{galleries.length} Total</span>
        </div>

        {galleries.length === 0 ? (
          <p className="text-xs text-slate-500 py-4 text-center">
            No public galleries attached to this project yet.
          </p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {galleries.map((g) => (
              <div
                key={g.id}
                className="bg-slate-950/60 border border-slate-800 rounded-xl p-4 space-y-3 flex flex-col justify-between hover:border-slate-700 transition-colors"
              >
                <div>
                  <h3 className="font-bold text-slate-200 text-sm">{g.title}</h3>
                  <p className="text-xs text-slate-400 mt-0.5">{g.photo_count} Photos</p>
                </div>
                <div className="flex items-center space-x-2 pt-2 border-t border-slate-800/80">
                  <Link
                    href={`/gallery/${g.slug}`}
                    target="_blank"
                    className="flex-1 text-center py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-semibold transition-colors"
                  >
                    View Gallery
                  </Link>
                  <Link
                    href={`/gallery/${g.slug}/find`}
                    target="_blank"
                    className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 rounded-lg text-xs font-semibold transition-colors"
                  >
                    Find Me 🔍
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Proofing & Selections Section */}
      {proofing_sessions.length > 0 && (
        <section className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-slate-100">Proofing & Selections</h2>
            <div className="flex items-center space-x-3 text-xs text-slate-400">
              <span className="text-emerald-400">
                ⭐ {selections_summary.selected_count} Selected
              </span>
              <span>❤️ {selections_summary.favorites_count} Favorites</span>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {proofing_sessions.map((ps) => (
              <div
                key={ps.id}
                className="bg-slate-950/60 border border-slate-800 rounded-xl p-4 space-y-3"
              >
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-slate-200 text-sm">{ps.title}</h3>
                  <span className="px-2.5 py-0.5 bg-indigo-500/20 text-indigo-300 rounded-full text-xs font-medium">
                    {ps.status}
                  </span>
                </div>
                <div className="text-xs text-slate-400 space-y-1">
                  <p>
                    Progress:{' '}
                    <span className="font-semibold text-slate-200">
                      {ps.selected_count} / {ps.required_count || 'Flexible'} selections
                    </span>
                  </p>
                  {ps.deadline && (
                    <p>Deadline: {new Date(ps.deadline).toLocaleDateString()}</p>
                  )}
                </div>
                {ps.public_token && (
                  <Link
                    href={`/proofing/${ps.public_token}`}
                    target="_blank"
                    className="block w-full text-center py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-semibold transition-colors mt-2"
                  >
                    Open Proofing Session →
                  </Link>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Digital Downloads Section */}
      {downloads.length > 0 && (
        <section className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
          <h2 className="text-lg font-bold text-slate-100">Digital Downloads</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {downloads.map((pkg) => (
              <div
                key={pkg.id}
                className="bg-slate-950/60 border border-slate-800 rounded-xl p-4 flex items-center justify-between"
              >
                <div>
                  <h3 className="font-bold text-slate-200 text-sm">{pkg.name}</h3>
                  <p className="text-xs text-slate-400">
                    {pkg.photo_count} Photos • {pkg.file_size_formatted}
                  </p>
                  {pkg.expires_at && (
                    <p className="text-[10px] text-slate-500">
                      Expires: {new Date(pkg.expires_at).toLocaleDateString()}
                    </p>
                  )}
                </div>
                <button
                  onClick={() => handleDownload(pkg.id)}
                  disabled={!pkg.is_ready || pkg.is_expired || downloadingId === pkg.id}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white rounded-lg text-xs font-semibold transition-colors"
                >
                  {downloadingId === pkg.id
                    ? 'Preparing...'
                    : pkg.is_expired
                    ? 'Expired'
                    : 'Download ZIP'}
                </button>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Delivery Tracking Section */}
      {delivery_items.length > 0 && (
        <section className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
          <h2 className="text-lg font-bold text-slate-100">Delivery Status</h2>
          <div className="space-y-3">
            {delivery_items.map((d) => (
              <div
                key={d.id}
                className="bg-slate-950/60 border border-slate-800 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
              >
                <div>
                  <div className="flex items-center space-x-2">
                    <span className="font-bold text-slate-200 text-sm">
                      Order #{d.order_number}
                    </span>
                    <span className="px-2 py-0.5 bg-slate-800 text-slate-300 rounded text-xs">
                      {d.delivery_type}
                    </span>
                  </div>
                  {d.courier && (
                    <p className="text-xs text-slate-400 mt-0.5">
                      Carrier: {d.courier}{' '}
                      {d.tracking_number && `• Tracking: ${d.tracking_number}`}
                    </p>
                  )}
                  <p className="text-xs text-slate-400">Status: {d.status}</p>
                </div>

                {d.can_confirm && (
                  <button
                    onClick={() => handleConfirmDelivery(d.id)}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold transition-colors"
                  >
                    Confirm Delivery Receipt
                  </button>
                )}
                {d.is_confirmed && (
                  <span className="text-xs font-semibold text-emerald-400 flex items-center space-x-1">
                    <span>✓</span>
                    <span>Receipt Confirmed</span>
                  </span>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Orders Section */}
      {orders.length > 0 && (
        <section className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
          <h2 className="text-lg font-bold text-slate-100">Fulfillment Orders</h2>
          <div className="space-y-2">
            {orders.map((o) => (
              <Link
                key={o.id}
                href={`/portal/client/${token}/orders/${o.id}`}
                className="block bg-slate-950/60 border border-slate-800 hover:border-slate-700 rounded-xl p-4 transition-colors"
              >
                <div className="flex items-center justify-between text-sm font-semibold text-slate-200">
                  <span>{o.order_number}</span>
                  <span>
                    {o.currency} {o.total_amount.toFixed(2)}
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs text-slate-400 mt-1">
                  <span>{o.items_count} items • {o.delivery_type}</span>
                  <span className="text-emerald-400">{o.payment_status}</span>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
