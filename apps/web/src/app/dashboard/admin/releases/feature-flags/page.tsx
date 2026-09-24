'use client';

import React, { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import {
  Flag,
  Search,
  Filter,
  Plus,
  ArrowUpRight,
  ShieldCheck,
  AlertTriangle,
  RefreshCw,
  Sliders,
  CheckCircle2,
  XCircle,
  Power,
  ChevronRight,
} from 'lucide-react';
import { PlatformFeatureFlagV2DTO, FeatureFlagType, FeatureFlagState } from '@pixmatch/types';

function FeatureFlagCatalogContent() {
  const [flags, setFlags] = useState<PlatformFeatureFlagV2DTO[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [search, setSearch] = useState<string>('');
  const [typeFilter, setTypeFilter] = useState<string>('ALL');
  const [stateFilter, setStateFilter] = useState<string>('ALL');

  const fetchFlags = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/admin/releases/feature-flags');
      if (res.ok) {
        const d = await res.json();
        if (d.success) setFlags(d.data);
      }
    } catch (e) {
      console.error('Failed to load feature flags:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFlags();
  }, []);

  const filteredFlags = flags.filter((f) => {
    const keyMatch = (f.key || '').toLowerCase().includes(search.toLowerCase());
    const nameMatch = (f.name || '').toLowerCase().includes(search.toLowerCase());
    const descMatch = (f.description || '').toLowerCase().includes(search.toLowerCase());
    const matchQuery = keyMatch || nameMatch || descMatch;
    const matchType = typeFilter === 'ALL' || f.type === typeFilter;
    const matchState = stateFilter === 'ALL' || f.state === stateFilter;
    return matchQuery && matchType && matchState;
  });

  return (
    <div className="p-6 md:p-8 space-y-6 bg-[#0B0F17] min-h-screen text-slate-100">
      {/* Breadcrumb & Header */}
      <div className="space-y-3 border-b border-card-border/80 pb-6">
        <div className="flex items-center gap-2 text-xs text-slate-400">
          <Link href="/dashboard/admin/releases" className="hover:text-amber-400 transition">
            Releases & Config
          </Link>
          <span>/</span>
          <span className="text-white font-medium">Feature Flags</span>
        </div>

        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-white flex items-center gap-2.5">
              <Flag className="h-7 w-7 text-amber-400" />
              Feature Flag Catalog
            </h1>
            <p className="text-slate-400 text-sm mt-1">
              Deterministic percentage rollouts, studio allowlists, subscription plan boundaries, and versioned states.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={fetchFlags}
              className="flex items-center gap-2 px-3 py-2 rounded-lg bg-card-border/30 hover:bg-card-border/60 border border-card-border text-xs font-semibold text-slate-200 transition"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
              <span>Refresh</span>
            </button>
            <Link
              href="/dashboard/admin/releases/changes"
              className="flex items-center gap-2 px-3.5 py-2 rounded-lg bg-amber-500 hover:bg-amber-600 text-slate-950 text-xs font-bold transition shadow-md shadow-amber-500/20"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>Propose Flag Change</span>
            </Link>
          </div>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="flex flex-col md:flex-row gap-3 items-center justify-between">
        <div className="relative w-full md:w-80">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
          <input
            type="text"
            placeholder="Search flag key, name..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-[#0F1623] border border-card-border/70 rounded-lg text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
          />
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto overflow-x-auto">
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="px-3 py-2 bg-[#0F1623] border border-card-border/70 rounded-lg text-xs text-slate-300 focus:outline-none focus:border-amber-500"
          >
            <option value="ALL">All Flag Types</option>
            <option value="BOOLEAN">Boolean</option>
            <option value="PERCENTAGE">Percentage Rollout</option>
            <option value="VARIANT">Variant</option>
            <option value="ALLOWLIST">Allowlist</option>
            <option value="PLAN">Subscription Plan</option>
            <option value="STUDIO">Studio Target</option>
            <option value="ENVIRONMENT">Environment Guard</option>
          </select>

          <select
            value={stateFilter}
            onChange={(e) => setStateFilter(e.target.value)}
            className="px-3 py-2 bg-[#0F1623] border border-card-border/70 rounded-lg text-xs text-slate-300 focus:outline-none focus:border-amber-500"
          >
            <option value="ALL">All States</option>
            <option value={FeatureFlagState.ACTIVE}>Active (Live)</option>
            <option value={FeatureFlagState.PAUSED}>Paused</option>
            <option value={FeatureFlagState.DRAFT}>Draft</option>
            <option value={FeatureFlagState.ARCHIVED}>Archived</option>
          </select>
        </div>
      </div>

      {/* Flag Table */}
      <div className="rounded-xl border border-card-border/80 bg-[#0F1623] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#0B0F17] border-b border-card-border/80 text-slate-400 font-semibold uppercase tracking-wider">
              <tr>
                <th className="p-4">Flag Key & Name</th>
                <th className="p-4">Type</th>
                <th className="p-4">State</th>
                <th className="p-4">Rollout / Value</th>
                <th className="p-4">Version</th>
                <th className="p-4">Targeting Rules</th>
                <th className="p-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-card-border/40 text-slate-300">
              {filteredFlags.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-slate-500">
                    {loading ? 'Loading feature flags...' : 'No feature flags found matching the criteria.'}
                  </td>
                </tr>
              ) : (
                filteredFlags.map((flag) => (
                  <tr key={flag.id} className="hover:bg-[#131C2D] transition">
                    <td className="p-4 font-mono font-semibold text-white">
                      <div>
                        <span>{flag.key}</span>
                        <p className="text-[11px] font-sans text-slate-400 font-normal mt-0.5">{flag.name}</p>
                      </div>
                    </td>
                    <td className="p-4">
                      <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-blue-500/10 text-blue-400 border border-blue-500/20">
                        {flag.type || flag.flag_type}
                      </span>
                    </td>
                    <td className="p-4">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          flag.state === FeatureFlagState.ACTIVE
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                            : flag.state === FeatureFlagState.PAUSED
                            ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                            : flag.state === FeatureFlagState.DRAFT
                            ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                            : 'bg-slate-700/30 text-slate-400 border border-slate-600'
                        }`}
                      >
                        {flag.state}
                      </span>
                    </td>
                    <td className="p-4 font-mono">
                      {flag.type === 'PERCENTAGE' ? (
                        <div className="flex items-center gap-2">
                          <div className="w-16 bg-slate-800 rounded-full h-1.5 overflow-hidden">
                            <div
                              className="bg-amber-400 h-full rounded-full"
                              style={{ width: `${flag.percentage ?? 0}%` }}
                            />
                          </div>
                          <span>{flag.percentage ?? 0}%</span>
                        </div>
                      ) : (
                        <span>{flag.enabled ? 'Enabled' : 'Disabled'}</span>
                      )}
                    </td>
                    <td className="p-4 font-mono text-slate-400">v{flag.version}</td>
                    <td className="p-4 text-[11px] text-slate-400">
                      {flag.allowedStudios?.length ? `${flag.allowedStudios.length} studios` : 'Global'}
                      {flag.allowedPlans?.length ? ` • ${flag.allowedPlans.join(', ')}` : ''}
                    </td>
                    <td className="p-4 text-right">
                      <Link
                        href={`/dashboard/admin/releases/feature-flags/${flag.id}`}
                        className="inline-flex items-center gap-1 text-amber-400 hover:text-amber-300 font-semibold"
                      >
                        <span>Inspect</span>
                        <ChevronRight className="h-3.5 w-3.5" />
                      </Link>
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

export default function FeatureFlagCatalogPage() {
  return (
    <Suspense fallback={<div className="p-8 text-slate-400">Loading Feature Flags...</div>}>
      <FeatureFlagCatalogContent />
    </Suspense>
  );
}
