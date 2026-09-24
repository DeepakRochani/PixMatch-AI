'use client';

import React, { useEffect, useState } from 'react';
import {
  Layers,
  Plus,
  Edit2,
  Archive,
  CheckCircle2,
  XCircle,
  RefreshCw,
  HardDrive,
  Images,
  Sparkles,
  Users,
} from 'lucide-react';
import { fetchApi } from '@/lib/api-client';
import { AdminPlanDTO } from '@pixmatch/types';

function formatBytes(bytes: number): string {
  if (!bytes || bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

function formatINR(amountPaise: number): string {
  if (isNaN(amountPaise)) return '₹0';
  const rupees = amountPaise / 100;
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(rupees);
}

export default function AdminPlansPage() {
  const [plans, setPlans] = useState<AdminPlanDTO[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState<AdminPlanDTO | null>(null);
  const [formData, setFormData] = useState<Partial<AdminPlanDTO>>({
    name: '',
    description: '',
    monthly_price_inr: 299900,
    annual_price_inr: 2999000,
    storage_limit_bytes: 200 * 1024 * 1024 * 1024,
    photo_limit: 40000,
    gallery_limit: 80,
    client_limit: 400,
    ai_search_limit: 2000,
    team_member_limit: 5,
    features: ['CLIENT_GALLERY', 'CUSTOM_BRANDING', 'ADVANCED_ANALYTICS'],
  });
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const loadPlans = async () => {
    setIsLoading(true);
    try {
      const res = await fetchApi<AdminPlanDTO[]>('/admin/plans');
      if (res.success && res.data) {
        setPlans(res.data);
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadPlans();
  }, []);

  const handleOpenCreate = () => {
    setEditingPlan(null);
    setFormData({
      id: 'CUSTOM_' + Date.now().toString(36).toUpperCase(),
      name: '',
      description: '',
      monthly_price_inr: 299900,
      annual_price_inr: 2999000,
      storage_limit_bytes: 200 * 1024 * 1024 * 1024,
      photo_limit: 40000,
      gallery_limit: 80,
      client_limit: 400,
      ai_search_limit: 2000,
      team_member_limit: 5,
      features: ['CLIENT_GALLERY', 'CUSTOM_BRANDING', 'ADVANCED_ANALYTICS'],
    });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (plan: AdminPlanDTO) => {
    setEditingPlan(plan);
    setFormData(plan);
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingPlan) {
        const res = await fetchApi(`/admin/plans/${editingPlan.id}`, {
          method: 'PATCH',
          body: JSON.stringify(formData),
        });
        if (res.success) {
          setMessage({ type: 'success', text: `Plan '${formData.name}' updated successfully.` });
          setIsModalOpen(false);
          loadPlans();
        } else {
          setMessage({ type: 'error', text: res.error?.message || 'Failed to update plan' });
        }
      } else {
        const res = await fetchApi('/admin/plans', {
          method: 'POST',
          body: JSON.stringify(formData),
        });
        if (res.success) {
          setMessage({ type: 'success', text: `Plan '${formData.name}' created successfully.` });
          setIsModalOpen(false);
          loadPlans();
        } else {
          setMessage({ type: 'error', text: res.error?.message || 'Failed to create plan' });
        }
      }
    } catch {
      setMessage({ type: 'error', text: 'Network failure' });
    }
  };

  const handleArchive = async (planId: string) => {
    if (!confirm('Archive this plan? Existing subscriptions will be preserved, but new signups will not see this plan.')) {
      return;
    }
    try {
      const res = await fetchApi(`/admin/plans/${planId}/archive`, { method: 'POST' });
      if (res.success) {
        setMessage({ type: 'success', text: 'Plan archived non-destructively.' });
        loadPlans();
      } else {
        setMessage({ type: 'error', text: res.error?.message || 'Failed to archive plan' });
      }
    } catch {
      setMessage({ type: 'error', text: 'Network failure' });
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2.5">
            <Layers className="h-6 w-6 text-amber-400" /> Subscription Plans Catalog
          </h1>
          <p className="text-xs text-muted mt-1">
            Configure platform subscription tiers, quotas, feature entitlements, and pricing structures.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleOpenCreate}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-black text-xs font-bold transition shadow-lg shadow-amber-500/20"
          >
            <Plus className="h-4 w-4" /> Create Plan
          </button>
          <button
            onClick={() => loadPlans()}
            disabled={isLoading}
            className="p-2 rounded-xl bg-[#131B2A] border border-card-border/80 text-muted hover:text-white transition"
          >
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin text-amber-400' : ''}`} />
          </button>
        </div>
      </div>

      {message && (
        <div
          className={`p-4 rounded-xl border text-xs flex items-center justify-between ${
            message.type === 'success'
              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
              : 'bg-red-500/10 border-red-500/30 text-red-300'
          }`}
        >
          <span>{message.text}</span>
          <button onClick={() => setMessage(null)} className="text-xs underline ml-4">
            Dismiss
          </button>
        </div>
      )}

      {/* Plans Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {plans.map((p) => (
          <div
            key={p.id}
            className={`rounded-2xl border p-6 flex flex-col justify-between transition ${
              p.is_archived
                ? 'bg-[#0E1422]/60 border-card-border/40 opacity-70'
                : 'bg-[#0E1422] border-card-border/80 hover:border-amber-500/30 shadow-xl'
            }`}
          >
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-bold text-white tracking-tight">{p.name}</h3>
                  <span className="text-[10px] font-mono text-muted uppercase">ID: {p.id}</span>
                </div>
                {p.is_archived ? (
                  <span className="px-2 py-0.5 rounded bg-gray-500/20 text-gray-400 text-[10px] font-bold uppercase">
                    Archived
                  </span>
                ) : (
                  <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px] font-bold uppercase">
                    Active Tier
                  </span>
                )}
              </div>

              <p className="text-xs text-muted leading-relaxed">{p.description}</p>

              <div className="p-3 rounded-xl bg-[#131B2A] border border-card-border/60 space-y-1">
                <div className="flex items-baseline justify-between">
                  <span className="text-xs text-muted">Monthly:</span>
                  <span className="text-base font-extrabold text-white font-mono">{formatINR(p.monthly_price_inr)}</span>
                </div>
                <div className="flex items-baseline justify-between">
                  <span className="text-xs text-muted">Annual:</span>
                  <span className="text-xs font-mono text-emerald-400 font-bold">{formatINR(p.annual_price_inr)}/yr</span>
                </div>
              </div>

              {/* Resource Limits List */}
              <div className="space-y-2 text-xs divide-y divide-card-border/30 pt-1">
                <div className="flex items-center justify-between py-1">
                  <span className="text-muted flex items-center gap-1.5">
                    <HardDrive className="h-3.5 w-3.5 text-amber-400" /> Storage Limit:
                  </span>
                  <span className="font-mono text-white font-semibold">
                    {p.storage_limit_bytes ? formatBytes(p.storage_limit_bytes) : 'Unlimited'}
                  </span>
                </div>
                <div className="flex items-center justify-between py-1">
                  <span className="text-muted flex items-center gap-1.5">
                    <Images className="h-3.5 w-3.5 text-cyan-400" /> Max Photos:
                  </span>
                  <span className="font-mono text-white font-semibold">
                    {p.photo_limit ? p.photo_limit.toLocaleString() : 'Unlimited'}
                  </span>
                </div>
                <div className="flex items-center justify-between py-1">
                  <span className="text-muted flex items-center gap-1.5">
                    <Sparkles className="h-3.5 w-3.5 text-purple-400" /> AI Searches:
                  </span>
                  <span className="font-mono text-white font-semibold">
                    {p.ai_search_limit ? `${p.ai_search_limit.toLocaleString()} /mo` : 'Unlimited'}
                  </span>
                </div>
                <div className="flex items-center justify-between py-1">
                  <span className="text-muted flex items-center gap-1.5">
                    <Users className="h-3.5 w-3.5 text-blue-400" /> Team Seats:
                  </span>
                  <span className="font-mono text-white font-semibold">
                    {p.team_member_limit ? `${p.team_member_limit} members` : 'Unlimited'}
                  </span>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="pt-6 border-t border-card-border/60 flex items-center justify-end gap-2 mt-4">
              <button
                onClick={() => handleOpenEdit(p)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#131B2A] border border-card-border/80 text-xs font-semibold text-white hover:border-amber-500/40 transition"
              >
                <Edit2 className="h-3 w-3" /> Edit
              </button>

              {!p.is_archived && (
                <button
                  onClick={() => handleArchive(p.id)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-red-500/10 text-red-300 border border-red-500/20 hover:bg-red-500/20 text-xs font-semibold transition"
                >
                  <Archive className="h-3 w-3" /> Archive
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Create / Edit Plan Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#0E1422] border border-card-border rounded-2xl max-w-lg w-full p-6 space-y-5 shadow-2xl overflow-y-auto max-h-[90vh]">
            <h2 className="text-lg font-bold text-white tracking-tight">
              {editingPlan ? `Edit Plan: ${editingPlan.name}` : 'Create New Subscription Plan'}
            </h2>

            <form onSubmit={handleSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block text-muted mb-1 font-semibold">Plan Name</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full bg-[#131B2A] border border-card-border rounded-xl px-3 py-2 text-white focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block text-muted mb-1 font-semibold">Description</label>
                <input
                  type="text"
                  required
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full bg-[#131B2A] border border-card-border rounded-xl px-3 py-2 text-white focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-muted mb-1 font-semibold">Monthly Price (Paise)</label>
                  <input
                    type="number"
                    required
                    value={formData.monthly_price_inr ?? 0}
                    onChange={(e) => setFormData({ ...formData, monthly_price_inr: Number(e.target.value) })}
                    className="w-full bg-[#131B2A] border border-card-border rounded-xl px-3 py-2 text-white font-mono"
                  />
                  <span className="text-[10px] text-muted">e.g. 299900 = ₹2,999</span>
                </div>
                <div>
                  <label className="block text-muted mb-1 font-semibold">Annual Price (Paise)</label>
                  <input
                    type="number"
                    required
                    value={formData.annual_price_inr ?? 0}
                    onChange={(e) => setFormData({ ...formData, annual_price_inr: Number(e.target.value) })}
                    className="w-full bg-[#131B2A] border border-card-border rounded-xl px-3 py-2 text-white font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-muted mb-1 font-semibold">Storage Limit (Bytes)</label>
                  <input
                    type="number"
                    required
                    value={formData.storage_limit_bytes ?? 0}
                    onChange={(e) => setFormData({ ...formData, storage_limit_bytes: Number(e.target.value) })}
                    className="w-full bg-[#131B2A] border border-card-border rounded-xl px-3 py-2 text-white font-mono"
                  />
                  <span className="text-[10px] text-muted">{formatBytes(formData.storage_limit_bytes || 0)}</span>
                </div>
                <div>
                  <label className="block text-muted mb-1 font-semibold">Max Photos</label>
                  <input
                    type="number"
                    required
                    value={formData.photo_limit ?? 0}
                    onChange={(e) => setFormData({ ...formData, photo_limit: Number(e.target.value) })}
                    className="w-full bg-[#131B2A] border border-card-border rounded-xl px-3 py-2 text-white font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-muted mb-1 font-semibold">AI Search Limit (/mo)</label>
                  <input
                    type="number"
                    required
                    value={formData.ai_search_limit ?? 0}
                    onChange={(e) => setFormData({ ...formData, ai_search_limit: Number(e.target.value) })}
                    className="w-full bg-[#131B2A] border border-card-border rounded-xl px-3 py-2 text-white font-mono"
                  />
                </div>
                <div>
                  <label className="block text-muted mb-1 font-semibold">Team Members Limit</label>
                  <input
                    type="number"
                    required
                    value={formData.team_member_limit ?? 0}
                    onChange={(e) => setFormData({ ...formData, team_member_limit: Number(e.target.value) })}
                    className="w-full bg-[#131B2A] border border-card-border rounded-xl px-3 py-2 text-white font-mono"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-card-border">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-card-border text-white font-semibold hover:bg-card-border/80"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-bold"
                >
                  {editingPlan ? 'Save Changes' : 'Create Plan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
