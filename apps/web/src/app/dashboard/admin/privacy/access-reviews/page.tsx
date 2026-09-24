'use client';

import React, { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import {
  CheckCircle2,
  ArrowLeft,
  RefreshCw,
  Plus,
  ShieldCheck,
  Clock,
  AlertTriangle,
  UserCheck,
} from 'lucide-react';
import { DataAccessReviewDTO, AccessReviewStatus } from '@pixmatch/types';

function AccessReviewsContent() {
  const [reviews, setReviews] = useState<DataAccessReviewDTO[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  const fetchReviews = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/admin/privacy/access-reviews');
      if (res.ok) {
        const d = await res.json();
        if (d.success) setReviews(d.data || []);
      }
    } catch (e) {
      console.error('Failed to load access reviews:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReviews();
  }, []);

  return (
    <div className="p-6 md:p-8 space-y-8 bg-[#0B0F17] min-h-screen text-slate-100">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-card-border/80 pb-6">
        <div>
          <Link
            href="/dashboard/admin/privacy"
            className="text-xs text-slate-400 hover:text-emerald-400 flex items-center gap-1 mb-2 transition-colors"
          >
            <ArrowLeft className="h-3 w-3" /> Back to Privacy Center
          </Link>
          <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2.5">
            <CheckCircle2 className="h-7 w-7 text-indigo-400" />
            Periodic Data Access Reviews
          </h1>
          <p className="text-slate-400 text-xs mt-1">
            Conduct and track quarterly access reviews across sensitive data assets and administrative roles.
          </p>
        </div>

        <button
          onClick={fetchReviews}
          className="flex items-center gap-2 px-3.5 py-2 rounded-lg bg-card-bg border border-card-border hover:bg-slate-800 text-slate-300 text-xs font-medium transition-colors"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin text-indigo-400' : ''}`} />
          Refresh
        </button>
      </div>

      <div className="rounded-xl bg-card-bg border border-card-border/80 overflow-hidden">
        <div className="p-4 bg-slate-900/80 border-b border-card-border">
          <h2 className="text-xs font-bold text-white uppercase tracking-wider">
            Scheduled & Completed Access Reviews ({reviews.length})
          </h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-900/60 border-b border-card-border text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
              <tr>
                <th className="px-4 py-3.5">Review Title</th>
                <th className="px-4 py-3.5">Status</th>
                <th className="px-4 py-3.5">Target Assets</th>
                <th className="px-4 py-3.5">Due Date</th>
                <th className="px-4 py-3.5">Revocations</th>
                <th className="px-4 py-3.5">Findings</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center text-slate-400">
                    Loading access reviews...
                  </td>
                </tr>
              ) : reviews.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center text-slate-400">
                    No access reviews scheduled.
                  </td>
                </tr>
              ) : reviews.map((r) => (
                <tr key={r.id} className="hover:bg-slate-800/40 transition-colors">
                  <td className="px-4 py-3.5 font-semibold text-white">
                    {r.title}
                  </td>
                  <td className="px-4 py-3.5">
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                      {r.status}
                    </span>
                  </td>
                  <td className="px-4 py-3.5 text-slate-300 font-mono">
                    {r.assetIds.length} Assets
                  </td>
                  <td className="px-4 py-3.5 text-slate-400 font-mono">
                    {new Date(r.dueDate).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3.5 text-amber-400 font-bold">
                    {r.revocationsCount}
                  </td>
                  <td className="px-4 py-3.5 text-slate-400 text-[11px] max-w-xs">
                    {r.findingsSummary || 'No adverse findings'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export default function AccessReviewsPage() {
  return (
    <Suspense fallback={<div className="p-8 text-slate-400">Loading Access Reviews...</div>}>
      <AccessReviewsContent />
    </Suspense>
  );
}
