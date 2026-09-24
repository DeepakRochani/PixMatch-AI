'use client';

import React, { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import {
  Database,
  Search,
  Filter,
  RefreshCw,
  Eye,
  ShieldCheck,
  HardDrive,
  Lock,
  Sparkles,
  Layers,
  ArrowLeft,
} from 'lucide-react';
import { PlatformDataAssetDTO, DataClassification, DataCategory, DataOwnerType } from '@pixmatch/types';

function DataInventoryContent() {
  const [assets, setAssets] = useState<PlatformDataAssetDTO[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [search, setSearch] = useState<string>('');
  const [classificationFilter, setClassificationFilter] = useState<string>('ALL');
  const [categoryFilter, setCategoryFilter] = useState<string>('ALL');

  const fetchAssets = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (search) params.append('search', search);
      if (classificationFilter !== 'ALL') params.append('classification', classificationFilter);
      if (categoryFilter !== 'ALL') params.append('category', categoryFilter);

      const res = await fetch(`/api/admin/privacy/assets?${params.toString()}`);
      if (res.ok) {
        const d = await res.json();
        if (d.success) setAssets(d.data || []);
      }
    } catch (e) {
      console.error('Failed to load data assets:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAssets();
  }, [classificationFilter, categoryFilter]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchAssets();
  };

  const getClassificationBadge = (cls: DataClassification) => {
    switch (cls) {
      case DataClassification.BIOMETRIC:
        return 'bg-pink-500/10 text-pink-400 border-pink-500/30';
      case DataClassification.AUTHENTICATION_SECRET:
        return 'bg-red-500/10 text-red-400 border-red-500/30';
      case DataClassification.FINANCIAL:
        return 'bg-amber-500/10 text-amber-400 border-amber-500/30';
      case DataClassification.CONFIDENTIAL:
        return 'bg-purple-500/10 text-purple-400 border-purple-500/30';
      case DataClassification.PERSONAL:
        return 'bg-blue-500/10 text-blue-400 border-blue-500/30';
      case DataClassification.SECURITY_DATA:
        return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30';
      case DataClassification.INTERNAL:
        return 'bg-slate-500/10 text-slate-300 border-slate-500/30';
      case DataClassification.PUBLIC:
        return 'bg-teal-500/10 text-teal-400 border-teal-500/30';
      default:
        return 'bg-gray-500/10 text-gray-400 border-gray-500/30';
    }
  };

  return (
    <div className="p-6 md:p-8 space-y-6 bg-[#0B0F17] min-h-screen text-slate-100">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-card-border/80 pb-6">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Link
              href="/dashboard/admin/privacy"
              className="text-xs text-slate-400 hover:text-emerald-400 flex items-center gap-1 transition-colors"
            >
              <ArrowLeft className="h-3 w-3" /> Back to Privacy Center
            </Link>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2.5">
            <Database className="h-7 w-7 text-emerald-400" />
            Platform Data Inventory & Catalog
          </h1>
          <p className="text-slate-400 text-xs mt-1">
            Canonical record of all platform data assets, storage engines, sensitivity tags, and retention baselines.
          </p>
        </div>

        <button
          onClick={fetchAssets}
          className="flex items-center gap-2 px-3.5 py-2 rounded-lg bg-card-bg border border-card-border hover:bg-slate-800 text-slate-300 text-xs font-medium transition-colors"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin text-emerald-400' : ''}`} />
          Refresh
        </button>
      </div>

      {/* Filters Bar */}
      <div className="p-4 rounded-xl bg-card-bg border border-card-border/80 flex flex-col md:flex-row items-center justify-between gap-4">
        <form onSubmit={handleSearchSubmit} className="relative w-full md:w-96">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search assets by name, key, table..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-slate-900/90 border border-slate-700/80 rounded-lg text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
          />
        </form>

        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          <div className="flex items-center gap-2">
            <Filter className="h-3.5 w-3.5 text-slate-400" />
            <span className="text-xs text-slate-400">Classification:</span>
            <select
              value={classificationFilter}
              onChange={(e) => setClassificationFilter(e.target.value)}
              className="bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-emerald-500"
            >
              <option value="ALL">All Classifications</option>
              {Object.values(DataClassification).map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-400">Category:</span>
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-emerald-500"
            >
              <option value="ALL">All Categories</option>
              {Object.values(DataCategory).map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Inventory Table */}
      <div className="rounded-xl bg-card-bg border border-card-border/80 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-900/90 border-b border-card-border text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
              <tr>
                <th className="px-4 py-3.5">Asset Name & Key</th>
                <th className="px-4 py-3.5">Classification</th>
                <th className="px-4 py-3.5">Category</th>
                <th className="px-4 py-3.5">Owner / Storage</th>
                <th className="px-4 py-3.5">Data Sensitivity</th>
                <th className="px-4 py-3.5">Retention</th>
                <th className="px-4 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-mono">
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-slate-400 font-sans">
                    Loading data assets...
                  </td>
                </tr>
              ) : assets.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-slate-400 font-sans">
                    No data assets match the filter criteria.
                  </td>
                </tr>
              ) : (
                assets.map((asset) => (
                  <tr key={asset.id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="px-4 py-3.5 font-sans">
                      <div className="font-semibold text-white text-xs">{asset.name}</div>
                      <div className="text-[11px] text-slate-400 font-mono mt-0.5">{asset.assetKey}</div>
                    </td>
                    <td className="px-4 py-3.5">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase border ${getClassificationBadge(asset.classification)}`}>
                        {asset.classification}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 font-sans text-slate-300">
                      {asset.category}
                    </td>
                    <td className="px-4 py-3.5 font-sans">
                      <div className="text-slate-300 text-xs">{asset.ownerType}</div>
                      <div className="text-[11px] text-slate-400 font-mono mt-0.5">{asset.storageEngine} {asset.tableName ? `(${asset.tableName})` : ''}</div>
                    </td>
                    <td className="px-4 py-3.5 font-sans">
                      <div className="flex flex-wrap gap-1">
                        {asset.biometricData && (
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-pink-500/10 text-pink-400 border border-pink-500/20">
                            Biometric
                          </span>
                        )}
                        {asset.financialData && (
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20">
                            Financial
                          </span>
                        )}
                        {asset.sensitivePersonalData && (
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-red-500/10 text-red-400 border border-red-500/20">
                            Sensitive PII
                          </span>
                        )}
                        {asset.personalData && !asset.sensitivePersonalData && !asset.biometricData && (
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-blue-500/10 text-blue-400 border border-blue-500/20">
                            PII
                          </span>
                        )}
                        {!asset.personalData && !asset.financialData && (
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-slate-700/50 text-slate-400">
                            Technical / System
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3.5 font-sans text-slate-300">
                      {asset.retentionDays ? `${asset.retentionDays} days` : 'Permanent / Inactive'}
                    </td>
                    <td className="px-4 py-3.5 text-right font-sans">
                      <Link
                        href={`/dashboard/admin/privacy/data-inventory/${asset.id}`}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium border border-slate-700 transition-colors"
                      >
                        <Eye className="h-3 w-3 text-emerald-400" />
                        View
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

export default function DataInventoryPage() {
  return (
    <Suspense fallback={<div className="p-8 text-slate-400">Loading Data Inventory...</div>}>
      <DataInventoryContent />
    </Suspense>
  );
}
