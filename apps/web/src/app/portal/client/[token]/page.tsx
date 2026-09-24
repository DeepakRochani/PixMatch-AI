'use client';

import React, { useState, useEffect, use } from 'react';
import Link from 'next/link';
import { fetchApi } from '@/lib/api-client';
import { IClientPortalHomeDTO } from '@pixmatch/types';

export default function ClientPortalHomePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const resolvedParams = use(params);
  const token = resolvedParams.token;

  const [home, setHome] = useState<IClientPortalHomeDTO | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadHome = async () => {
      setLoading(true);
      const res = await fetchApi<IClientPortalHomeDTO>(
        `/v1/public/client-portal/${token}/home`
      );
      if (res.success && res.data) {
        setHome(res.data);
      } else {
        setError(res.error?.message || 'Failed to load client home dashboard.');
      }
      setLoading(false);
    };

    loadHome();
  }, [token]);

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-32 bg-slate-900 rounded-2xl border border-slate-800" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="h-48 bg-slate-900 rounded-2xl border border-slate-800 col-span-2" />
          <div className="h-48 bg-slate-900 rounded-2xl border border-slate-800" />
        </div>
      </div>
    );
  }

  if (error || !home) {
    return (
      <div className="bg-rose-500/10 border border-rose-500/20 rounded-2xl p-6 text-rose-300 text-center">
        {error || 'Unable to load your client portal.'}
      </div>
    );
  }

  const { branding, active_project, projects, recent_activity, orders_summary, quick_stats } =
    home;
  const secondaryColor = branding?.secondary_color || '#4F46E5';

  return (
    <div className="space-y-8">
      {/* Welcome Hero Banner */}
      <section className="bg-gradient-to-br from-slate-900 via-slate-900 to-indigo-950/40 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-xl relative overflow-hidden">
        <div className="relative z-10 max-w-2xl space-y-3">
          <span className="inline-block px-3 py-1 bg-indigo-500/20 border border-indigo-500/30 text-indigo-300 rounded-full text-xs font-semibold uppercase tracking-wider">
            Client Portal
          </span>
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-slate-100 tracking-tight">
            Welcome back, {home.session.client_name}
          </h1>
          <p className="text-slate-400 text-sm sm:text-base leading-relaxed">
            Access your curated photography galleries, proofing sessions, digital downloads,
            and order delivery updates all in one place.
          </p>
        </div>

        {/* Quick KPI Pills */}
        <div className="relative z-10 grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 mt-6 pt-6 border-t border-slate-800/80">
          <div className="bg-slate-950/40 rounded-xl p-3 border border-slate-800/60">
            <p className="text-xs text-slate-400">Projects</p>
            <p className="text-xl font-bold text-slate-100">{quick_stats.total_projects}</p>
          </div>
          <div className="bg-slate-950/40 rounded-xl p-3 border border-slate-800/60">
            <p className="text-xs text-slate-400">Galleries</p>
            <p className="text-xl font-bold text-slate-100">{quick_stats.total_galleries}</p>
          </div>
          <div className="bg-slate-950/40 rounded-xl p-3 border border-slate-800/60">
            <p className="text-xs text-slate-400">Downloads</p>
            <p className="text-xl font-bold text-slate-100">
              {quick_stats.total_downloads_available}
            </p>
          </div>
          <div className="bg-slate-950/40 rounded-xl p-3 border border-slate-800/60">
            <p className="text-xs text-slate-400">Proofing</p>
            <p className="text-xl font-bold text-indigo-400">
              {quick_stats.pending_proofing_sessions > 0
                ? `${quick_stats.pending_proofing_sessions} Active`
                : 'Up to date'}
            </p>
          </div>
        </div>
      </section>

      {/* Active Project Highlight */}
      {active_project && (
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-slate-100 tracking-tight">Active Project</h2>
            <Link
              href={`/portal/client/${token}/projects/${active_project.id}`}
              className="text-xs font-semibold text-indigo-400 hover:text-indigo-300 transition-colors"
            >
              View Details →
            </Link>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-md hover:border-slate-700 transition-all space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <span className="text-xs font-medium text-slate-400">
                  {active_project.project_type.replace(/_/g, ' ')}
                </span>
                <h3 className="text-xl font-bold text-slate-100">{active_project.name}</h3>
                {active_project.location && (
                  <p className="text-xs text-slate-400 mt-0.5">📍 {active_project.location}</p>
                )}
              </div>
              <div className="flex items-center space-x-2">
                <span className="px-3 py-1 bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 rounded-full text-xs font-medium">
                  {active_project.status}
                </span>
              </div>
            </div>

            {/* Quick Actions for Active Project */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
              {active_project.primary_gallery_slug ? (
                <Link
                  href={`/gallery/${active_project.primary_gallery_slug}`}
                  target="_blank"
                  className="flex items-center justify-center space-x-2 px-4 py-3 rounded-xl font-semibold text-sm text-white shadow-md transition-all hover:opacity-95"
                  style={{ backgroundColor: secondaryColor }}
                >
                  <span>🖼️</span>
                  <span>Open Gallery</span>
                </Link>
              ) : (
                <Link
                  href={`/portal/client/${token}/projects/${active_project.id}`}
                  className="flex items-center justify-center space-x-2 px-4 py-3 rounded-xl font-semibold text-sm bg-slate-800 text-slate-200 hover:bg-slate-700 transition-all"
                >
                  <span>📁</span>
                  <span>View Project</span>
                </Link>
              )}

              {active_project.primary_gallery_slug && (
                <Link
                  href={`/gallery/${active_project.primary_gallery_slug}/find`}
                  target="_blank"
                  className="flex items-center justify-center space-x-2 px-4 py-3 rounded-xl font-semibold text-sm bg-slate-800 text-slate-200 hover:bg-slate-700 border border-slate-700 transition-all"
                >
                  <span>🔍</span>
                  <span>Find My Photos</span>
                </Link>
              )}

              {active_project.available_downloads_count > 0 ? (
                <Link
                  href={`/portal/client/${token}/downloads`}
                  className="flex items-center justify-center space-x-2 px-4 py-3 rounded-xl font-semibold text-sm bg-emerald-600/20 text-emerald-300 border border-emerald-500/30 hover:bg-emerald-600/30 transition-all"
                >
                  <span>⬇️</span>
                  <span>Download Photos ({active_project.available_downloads_count})</span>
                </Link>
              ) : (
                <Link
                  href={`/portal/client/${token}/orders`}
                  className="flex items-center justify-center space-x-2 px-4 py-3 rounded-xl font-semibold text-sm bg-slate-800 text-slate-200 hover:bg-slate-700 border border-slate-700 transition-all"
                >
                  <span>📦</span>
                  <span>View Orders</span>
                </Link>
              )}
            </div>
          </div>
        </section>
      )}

      {/* Two Column Layout: Projects & Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left 2 Cols: Projects Grid */}
        <section className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-slate-100 tracking-tight">Your Projects</h2>
            <Link
              href={`/portal/client/${token}/projects`}
              className="text-xs font-semibold text-indigo-400 hover:text-indigo-300"
            >
              See all ({projects.length})
            </Link>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {projects.map((proj) => (
              <Link
                key={proj.id}
                href={`/portal/client/${token}/projects/${proj.id}`}
                className="bg-slate-900 border border-slate-800 rounded-2xl p-5 hover:border-slate-700 hover:bg-slate-900/80 transition-all space-y-3 group"
              >
                <div className="flex items-start justify-between">
                  <span className="text-[11px] font-semibold text-indigo-400 uppercase tracking-wider">
                    {proj.project_type}
                  </span>
                  <span className="text-xs text-slate-500">{proj.status}</span>
                </div>
                <div>
                  <h4 className="font-bold text-slate-100 group-hover:text-indigo-300 transition-colors">
                    {proj.name}
                  </h4>
                  {proj.event_date && (
                    <p className="text-xs text-slate-400 mt-0.5">
                      📅 {new Date(proj.event_date).toLocaleDateString()}
                    </p>
                  )}
                </div>
                <div className="pt-2 border-t border-slate-800/60 flex items-center justify-between text-xs text-slate-400">
                  <span>{proj.galleries_count} Galleries</span>
                  <span>{proj.orders_count} Orders</span>
                </div>
              </Link>
            ))}
          </div>
        </section>

        {/* Right 1 Col: Recent Activity & Orders Teaser */}
        <section className="space-y-6">
          {/* Recent Activity */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
            <h3 className="text-base font-bold text-slate-100 tracking-tight">Recent Activity</h3>
            {recent_activity.length === 0 ? (
              <p className="text-xs text-slate-500 py-4 text-center">No recent activity recorded.</p>
            ) : (
              <div className="space-y-3">
                {recent_activity.slice(0, 5).map((act) => (
                  <div key={act.id} className="flex items-start space-x-3 text-xs">
                    <div className="w-2 h-2 rounded-full bg-indigo-500 mt-1.5 flex-shrink-0" />
                    <div>
                      <p className="font-semibold text-slate-200">{act.title}</p>
                      <p className="text-slate-400">{act.description}</p>
                      <p className="text-[10px] text-slate-500 mt-0.5">
                        {new Date(act.occurred_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Recent Orders */}
          {orders_summary.recent_orders.length > 0 && (
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-base font-bold text-slate-100">Orders</h3>
                <Link
                  href={`/portal/client/${token}/orders`}
                  className="text-xs font-semibold text-indigo-400"
                >
                  View All
                </Link>
              </div>
              <div className="space-y-2">
                {orders_summary.recent_orders.slice(0, 3).map((o) => (
                  <Link
                    key={o.id}
                    href={`/portal/client/${token}/orders/${o.id}`}
                    className="block p-3 bg-slate-950/50 rounded-xl border border-slate-800/80 hover:border-slate-700 text-xs transition-colors"
                  >
                    <div className="flex items-center justify-between font-medium text-slate-200">
                      <span>{o.order_number}</span>
                      <span>
                        {o.currency} {o.total_amount.toFixed(2)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-slate-400 mt-1">
                      <span>{o.status}</span>
                      <span className="text-[11px] text-emerald-400">{o.payment_status}</span>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
