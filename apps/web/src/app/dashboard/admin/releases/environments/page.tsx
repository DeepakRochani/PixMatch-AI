'use client';

import React, { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import {
  Layers,
  Search,
  RefreshCw,
  AlertTriangle,
  CheckCircle2,
  Lock,
  ArrowRight,
} from 'lucide-react';
import { EnvironmentComparisonItemDTO } from '@pixmatch/types';

function MultiEnvironmentComparisonContent() {
  const [comparisons, setComparisons] = useState<EnvironmentComparisonItemDTO[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [filterMismatchOnly, setFilterMismatchOnly] = useState<boolean>(false);
  const [search, setSearch] = useState<string>('');

  const fetchComparison = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/admin/releases/environments/compare');
      if (res.ok) {
        const d = await res.json();
        if (d.success) setComparisons(d.data);
      }
    } catch (e) {
      console.error('Failed to load environment comparison:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchComparison();
  }, []);

  const filteredItems = comparisons.filter((item) => {
    const keyStr = item.key || item.resource_key || '';
    const matchQuery = keyStr.toLowerCase().includes(search.toLowerCase());
    const matchMismatch = filterMismatchOnly ? !item.match : true;
    return matchQuery && matchMismatch;
  });

  return (
    <div className="p-6 md:p-8 space-y-6 bg-[#0B0F17] min-h-screen text-slate-100">
      {/* Header */}
      <div className="space-y-3 border-b border-card-border/80 pb-6">
        <div className="flex items-center gap-2 text-xs text-slate-400">
          <Link href="/dashboard/admin/releases" className="hover:text-amber-400 transition">
            Releases & Config
          </Link>
          <span>/</span>
          <span className="text-white font-medium">Multi-Environment Comparison</span>
        </div>

        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-white flex items-center gap-2.5">
              <Layers className="h-7 w-7 text-emerald-400" />
              Multi-Environment Comparison Matrix
            </h1>
            <p className="text-slate-400 text-sm mt-1">
              Side-by-side comparison across Development, Staging, and Production environments.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={fetchComparison}
              className="flex items-center gap-2 px-3 py-2 rounded-lg bg-card-border/30 hover:bg-card-border/60 border border-card-border text-xs font-semibold text-slate-200 transition"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
              <span>Refresh Matrix</span>
            </button>
          </div>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="flex flex-col md:flex-row gap-3 items-center justify-between">
        <div className="relative w-full md:w-80">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
          <input
            type="text"
            placeholder="Search key..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-[#0F1623] border border-card-border/70 rounded-lg text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
          />
        </div>

        <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer">
          <input
            type="checkbox"
            checked={filterMismatchOnly}
            onChange={(e) => setFilterMismatchOnly(e.target.checked)}
            className="rounded border-slate-700 text-amber-500 focus:ring-0"
          />
          <span>Show Environment Mismatches Only</span>
        </label>
      </div>

      {/* Matrix Table */}
      <div className="rounded-xl border border-card-border/80 bg-[#0F1623] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#0B0F17] border-b border-card-border/80 text-slate-400 font-semibold uppercase tracking-wider">
              <tr>
                <th className="p-4">Key / Parameter</th>
                <th className="p-4">Dev</th>
                <th className="p-4">Staging</th>
                <th className="p-4">Production</th>
                <th className="p-4 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-card-border/40 text-slate-300">
              {filteredItems.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-slate-500">
                    {loading ? 'Comparing environments...' : 'No configuration matrix items found.'}
                  </td>
                </tr>
              ) : (
                filteredItems.map((item, idx) => (
                  <tr key={item.key || item.resource_key || idx} className="hover:bg-[#131C2D] transition">
                    <td className="p-4 font-mono font-semibold text-white">
                      <span>{item.key || item.resource_key}</span>
                      {item.isSecret && (
                        <span className="ml-2 inline-flex items-center gap-0.5 text-[10px] text-red-400">
                          <Lock className="h-2.5 w-2.5" /> Secret
                        </span>
                      )}
                    </td>
                    <td className="p-4 font-mono text-slate-400">
                      {typeof item.devValue === 'object' ? JSON.stringify(item.devValue) : String(item.devValue ?? '--')}
                    </td>
                    <td className="p-4 font-mono text-slate-300">
                      {typeof item.stagingValue === 'object' ? JSON.stringify(item.stagingValue) : String(item.stagingValue ?? '--')}
                    </td>
                    <td className="p-4 font-mono text-amber-400 font-semibold">
                      {typeof item.prodValue === 'object' ? JSON.stringify(item.prodValue) : String(item.prodValue ?? '--')}
                    </td>
                    <td className="p-4 text-center">
                      {item.match ? (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                          SYNCED
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20">
                          DIFFERENT
                        </span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export default function MultiEnvironmentPage() {
  return (
    <Suspense fallback={<div className="p-8 text-slate-400">Loading Environment Matrix...</div>}>
      <MultiEnvironmentComparisonContent />
    </Suspense>
  );
}
