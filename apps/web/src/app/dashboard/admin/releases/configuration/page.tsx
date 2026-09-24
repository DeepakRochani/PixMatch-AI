'use client';

import React, { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import {
  Sliders,
  Search,
  Filter,
  Lock,
  RefreshCw,
  Plus,
  ShieldCheck,
  ArrowUpRight,
  Eye,
  EyeOff,
  ChevronRight,
  AlertTriangle,
} from 'lucide-react';
import { PlatformConfigurationDTO, PlatformConfigCategory, PlatformEnvironment } from '@pixmatch/types';

function PlatformConfigurationCatalogContent() {
  const [configs, setConfigs] = useState<PlatformConfigurationDTO[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [search, setSearch] = useState<string>('');
  const [categoryFilter, setCategoryFilter] = useState<string>('ALL');
  const [envFilter, setEnvFilter] = useState<string>('PROD');

  const fetchConfigs = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/admin/releases/configuration?environment=${envFilter}`);
      if (res.ok) {
        const d = await res.json();
        if (d.success) setConfigs(d.data);
      }
    } catch (e) {
      console.error('Failed to load configurations:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchConfigs();
  }, [envFilter]);

  const filteredConfigs = configs.filter((c) => {
    const keyMatch = (c.key || '').toLowerCase().includes(search.toLowerCase());
    const descMatch = (c.description || '').toLowerCase().includes(search.toLowerCase());
    const matchQuery = keyMatch || descMatch;
    const matchCategory = categoryFilter === 'ALL' || c.category === categoryFilter;
    return matchQuery && matchCategory;
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
          <span className="text-white font-medium">Platform Configuration</span>
        </div>

        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-white flex items-center gap-2.5">
              <Sliders className="h-7 w-7 text-blue-400" />
              Platform Configuration Catalog
            </h1>
            <p className="text-slate-400 text-sm mt-1">
              Dynamic platform parameters with strict secret separation, schema validation, and risk-classified diffs.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={fetchConfigs}
              className="flex items-center gap-2 px-3 py-2 rounded-lg bg-card-border/30 hover:bg-card-border/60 border border-card-border text-xs font-semibold text-slate-200 transition"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
              <span>Refresh</span>
            </button>
            <Link
              href="/dashboard/admin/releases/changes"
              className="flex items-center gap-2 px-3 py-2 rounded-lg bg-blue-500 hover:bg-blue-600 text-white text-xs font-bold transition shadow-md shadow-blue-500/20"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>Propose Config Change</span>
            </Link>
          </div>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="flex flex-col md:flex-row gap-3 items-center justify-between">
        <div className="relative w-full md:w-80">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
          <input
            type="text"
            placeholder="Search config key, description..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-[#0F1623] border border-card-border/70 rounded-lg text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
          />
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto overflow-x-auto">
          <select
            value={envFilter}
            onChange={(e) => setEnvFilter(e.target.value)}
            className="px-3 py-2 bg-[#0F1623] border border-card-border/70 rounded-lg text-xs font-mono text-amber-400 focus:outline-none focus:border-blue-500"
          >
            <option value="DEV">DEV Environment</option>
            <option value="STAGING">STAGING Environment</option>
            <option value="PROD">PROD Environment</option>
          </select>

          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="px-3 py-2 bg-[#0F1623] border border-card-border/70 rounded-lg text-xs text-slate-300 focus:outline-none focus:border-blue-500"
          >
            <option value="ALL">All Categories</option>
            <option value="SYSTEM">System</option>
            <option value="AI_PROCESSING">AI Processing</option>
            <option value="SECURITY">Security</option>
            <option value="STORAGE">Storage</option>
            <option value="BILLING">Billing</option>
            <option value="NOTIFICATIONS">Notifications</option>
            <option value="INTEGRATIONS">Integrations</option>
          </select>
        </div>
      </div>

      {/* Config Table */}
      <div className="rounded-xl border border-card-border/80 bg-[#0F1623] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#0B0F17] border-b border-card-border/80 text-slate-400 font-semibold uppercase tracking-wider">
              <tr>
                <th className="p-4">Configuration Key</th>
                <th className="p-4">Category</th>
                <th className="p-4">Type</th>
                <th className="p-4">Active Value</th>
                <th className="p-4">Version</th>
                <th className="p-4">Security / Secrets</th>
                <th className="p-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-card-border/40 text-slate-300">
              {filteredConfigs.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-slate-500">
                    {loading ? 'Loading configurations...' : 'No configurations found.'}
                  </td>
                </tr>
              ) : (
                filteredConfigs.map((cfg) => (
                  <tr key={cfg.id} className="hover:bg-[#131C2D] transition">
                    <td className="p-4 font-mono font-semibold text-white">
                      <div>
                        <span>{cfg.key}</span>
                        <p className="text-[11px] font-sans text-slate-400 font-normal mt-0.5">{cfg.description}</p>
                      </div>
                    </td>
                    <td className="p-4">
                      <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-800 text-slate-300 border border-slate-700">
                        {cfg.category}
                      </span>
                    </td>
                    <td className="p-4 font-mono text-[11px] text-blue-400">{cfg.type}</td>
                    <td className="p-4 font-mono">
                      {cfg.isSecret ? (
                        <span className="px-2 py-0.5 rounded text-[10px] bg-red-500/10 text-red-400 border border-red-500/20 flex items-center gap-1 w-fit">
                          <Lock className="h-3 w-3" />
                          <span>[REDACTED]</span>
                        </span>
                      ) : (
                        <span className="max-w-[200px] truncate block text-slate-200">
                          {typeof cfg.value === 'object' ? JSON.stringify(cfg.value) : String(cfg.value)}
                        </span>
                      )}
                    </td>
                    <td className="p-4 font-mono text-slate-400">v{cfg.version}</td>
                    <td className="p-4">
                      {cfg.isSecret ? (
                        <span className="text-[11px] text-red-400 font-medium">Encrypted Reference</span>
                      ) : (
                        <span className="text-[11px] text-emerald-400 font-medium">Standard Parameter</span>
                      )}
                    </td>
                    <td className="p-4 text-right">
                      <Link
                        href={`/dashboard/admin/releases/configuration/${cfg.key}`}
                        className="inline-flex items-center gap-1 text-blue-400 hover:text-blue-300 font-semibold"
                      >
                        <span>Inspect & Diff</span>
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

export default function PlatformConfigurationCatalogPage() {
  return (
    <Suspense fallback={<div className="p-8 text-slate-400">Loading Configuration Catalog...</div>}>
      <PlatformConfigurationCatalogContent />
    </Suspense>
  );
}
