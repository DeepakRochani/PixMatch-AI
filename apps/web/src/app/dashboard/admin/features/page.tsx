'use client';

import React, { useEffect, useState } from 'react';
import {
  Flag,
  Plus,
  RefreshCw,
  Search,
  Sliders,
  ToggleLeft,
  ToggleRight,
} from 'lucide-react';
import { fetchApi } from '@/lib/api-client';
import { PlatformFeatureFlagDTO, FeatureFlagScope } from '@pixmatch/types';

export default function AdminFeatureFlagsPage() {
  const [flags, setFlags] = useState<PlatformFeatureFlagDTO[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [scopeFilter, setScopeFilter] = useState<string>('ALL');
  const [isCreating, setIsCreating] = useState(false);
  const [newFlag, setNewFlag] = useState({
    key: '',
    name: '',
    description: '',
    enabled: false,
    scope: FeatureFlagScope.GLOBAL,
    rollout_pct: 100,
  });

  const loadFlags = async () => {
    setIsLoading(true);
    try {
      const res = await fetchApi<PlatformFeatureFlagDTO[]>('/admin/feature-flags');
      if (res.success && res.data) {
        setFlags(res.data);
      }
    } catch (err) {
      console.error('Failed to load feature flags', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadFlags();
  }, []);

  const handleToggle = async (flag: PlatformFeatureFlagDTO) => {
    try {
      await fetchApi(`/admin/feature-flags/${flag.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ enabled: !flag.enabled }),
      });
      loadFlags();
    } catch (err) {
      console.error('Failed to update feature flag', err);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await fetchApi('/admin/feature-flags', {
        method: 'POST',
        body: JSON.stringify(newFlag),
      });
      setIsCreating(false);
      setNewFlag({
        key: '',
        name: '',
        description: '',
        enabled: false,
        scope: FeatureFlagScope.GLOBAL,
        rollout_pct: 100,
      });
      loadFlags();
    } catch (err) {
      console.error('Failed to create feature flag', err);
    }
  };

  const filteredFlags = flags.filter((f) => {
    const matchesSearch =
      f.key.toLowerCase().includes(search.toLowerCase()) ||
      f.name.toLowerCase().includes(search.toLowerCase());
    const matchesScope = scopeFilter === 'ALL' || f.scope === scopeFilter;
    return matchesSearch && matchesScope;
  });

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2.5">
            <Flag className="h-6 w-6 text-amber-400" /> Feature Flags & Toggles
          </h1>
          <p className="text-xs text-muted mt-1">
            Centrally manage platform feature gates, targeted rollouts, and percentage-based Canary deployments.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => loadFlags()}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-card-border/40 hover:bg-card-border/70 text-xs font-semibold text-white transition"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? 'animate-spin' : ''}`} /> Refresh
          </button>
          <button
            onClick={() => setIsCreating(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-black text-xs font-bold transition shadow-lg shadow-amber-500/20"
          >
            <Plus className="h-4 w-4" /> New Feature Flag
          </button>
        </div>
      </div>

      {/* Creation Modal / Inline Drawer */}
      {isCreating && (
        <div className="rounded-2xl border border-amber-500/30 bg-[#0E1422] p-6 space-y-4 shadow-xl">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Sliders className="h-4 w-4 text-amber-400" /> Create Platform Feature Flag
            </h3>
            <button
              onClick={() => setIsCreating(false)}
              className="text-muted hover:text-white text-xs font-medium"
            >
              Cancel
            </button>
          </div>
          <form onSubmit={handleCreate} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-medium text-muted block mb-1">Flag Key (e.g. AI_BATCH_PROCESSING)</label>
              <input
                type="text"
                required
                value={newFlag.key}
                onChange={(e) => setNewFlag({ ...newFlag, key: e.target.value.toUpperCase().replace(/\s+/g, '_') })}
                className="w-full px-3 py-2 rounded-xl bg-[#070A0F] border border-card-border text-white text-xs font-mono focus:border-amber-500 outline-none"
                placeholder="FLAG_IDENTIFIER"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-muted block mb-1">Display Name</label>
              <input
                type="text"
                required
                value={newFlag.name}
                onChange={(e) => setNewFlag({ ...newFlag, name: e.target.value })}
                className="w-full px-3 py-2 rounded-xl bg-[#070A0F] border border-card-border text-white text-xs focus:border-amber-500 outline-none"
                placeholder="AI Batch Processing Engine"
              />
            </div>
            <div className="md:col-span-2">
              <label className="text-xs font-medium text-muted block mb-1">Description</label>
              <input
                type="text"
                value={newFlag.description}
                onChange={(e) => setNewFlag({ ...newFlag, description: e.target.value })}
                className="w-full px-3 py-2 rounded-xl bg-[#070A0F] border border-card-border text-white text-xs focus:border-amber-500 outline-none"
                placeholder="Enables high-throughput distributed AI photo processing"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-muted block mb-1">Scope</label>
              <select
                value={newFlag.scope}
                onChange={(e) => setNewFlag({ ...newFlag, scope: e.target.value as FeatureFlagScope })}
                className="w-full px-3 py-2 rounded-xl bg-[#070A0F] border border-card-border text-white text-xs focus:border-amber-500 outline-none"
              >
                <option value={FeatureFlagScope.GLOBAL}>GLOBAL</option>
                <option value={FeatureFlagScope.PLAN}>PLAN-SPECIFIC</option>
                <option value={FeatureFlagScope.STUDIO}>STUDIO-SPECIFIC</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-muted block mb-1">Rollout Percentage ({newFlag.rollout_pct}%)</label>
              <input
                type="range"
                min="0"
                max="100"
                value={newFlag.rollout_pct}
                onChange={(e) => setNewFlag({ ...newFlag, rollout_pct: parseInt(e.target.value, 10) })}
                className="w-full accent-amber-500 cursor-pointer"
              />
            </div>
            <div className="md:col-span-2 flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setIsCreating(false)}
                className="px-4 py-2 rounded-xl bg-card-border/40 text-xs font-semibold text-white hover:bg-card-border transition"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-black text-xs font-bold transition shadow-lg shadow-amber-500/20"
              >
                Deploy Flag
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Filter Bar */}
      <div className="flex flex-col sm:flex-row gap-3 items-center justify-between bg-[#0E1422] p-4 rounded-2xl border border-card-border">
        <div className="relative w-full sm:w-80">
          <Search className="h-4 w-4 absolute left-3 top-2.5 text-muted" />
          <input
            type="text"
            placeholder="Search flags by key or name..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 rounded-xl bg-[#070A0F] border border-card-border text-white text-xs focus:border-amber-500 outline-none"
          />
        </div>
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <span className="text-xs text-muted whitespace-nowrap">Scope:</span>
          <select
            value={scopeFilter}
            onChange={(e) => setScopeFilter(e.target.value)}
            className="px-3 py-1.5 rounded-xl bg-[#070A0F] border border-card-border text-white text-xs focus:border-amber-500 outline-none"
          >
            <option value="ALL">All Scopes</option>
            <option value={FeatureFlagScope.GLOBAL}>GLOBAL</option>
            <option value={FeatureFlagScope.PLAN}>PLAN</option>
            <option value={FeatureFlagScope.STUDIO}>STUDIO</option>
          </select>
        </div>
      </div>

      {/* Flags List */}
      <div className="grid grid-cols-1 gap-4">
        {filteredFlags.map((flag) => (
          <div
            key={flag.id}
            className="flex flex-col md:flex-row md:items-center justify-between p-5 rounded-2xl bg-[#0E1422] border border-card-border hover:border-card-border/80 transition gap-4"
          >
            <div className="space-y-1.5">
              <div className="flex items-center gap-2.5">
                <span className="font-mono text-xs font-bold text-amber-400 px-2 py-0.5 rounded bg-amber-500/10 border border-amber-500/20">
                  {flag.key}
                </span>
                <span className="text-sm font-semibold text-white">{flag.name}</span>
                <span className="text-[10px] uppercase tracking-wider font-semibold px-2 py-0.5 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20">
                  {flag.scope}
                </span>
              </div>
              <p className="text-xs text-muted">{flag.description || 'No description provided'}</p>
              <div className="flex items-center gap-4 text-[11px] text-muted/80 pt-1">
                <span>Rollout: <strong className="text-white font-mono">{flag.rollout_pct}%</strong></span>
                {flag.plan_tier && (
                  <span>Plan: <strong className="text-white font-mono">{flag.plan_tier}</strong></span>
                )}
                {flag.studio_id && (
                  <span>Studio: <strong className="text-white font-mono">{flag.studio_id}</strong></span>
                )}
                <span>Updated: {new Date(flag.updated_at).toLocaleString()}</span>
              </div>
            </div>

            <div className="flex items-center gap-3 self-end md:self-center">
              <button
                onClick={() => handleToggle(flag)}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition ${
                  flag.enabled
                    ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/20'
                    : 'bg-red-500/15 text-red-400 border border-red-500/30 hover:bg-red-500/20'
                }`}
              >
                {flag.enabled ? (
                  <>
                    <ToggleRight className="h-4 w-4" /> ENABLED
                  </>
                ) : (
                  <>
                    <ToggleLeft className="h-4 w-4" /> DISABLED
                  </>
                )}
              </button>
            </div>
          </div>
        ))}

        {filteredFlags.length === 0 && !isLoading && (
          <div className="p-12 text-center rounded-2xl bg-[#0E1422] border border-card-border space-y-3">
            <Flag className="h-8 w-8 text-muted mx-auto" />
            <p className="text-xs text-muted">No feature flags match your search query.</p>
          </div>
        )}
      </div>
    </div>
  );
}
