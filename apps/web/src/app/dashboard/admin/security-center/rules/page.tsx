'use client';

import React, { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import {
  Zap,
  ArrowLeft,
  ShieldCheck,
  ShieldAlert,
  AlertTriangle,
  Flame,
  Clock,
  Edit2,
  CheckCircle2,
  XCircle,
  ToggleLeft,
  ToggleRight,
} from 'lucide-react';
import {
  PlatformSecurityRuleDTO,
  SecurityEventCategory,
  SecuritySeverity,
} from '@pixmatch/types';

function RulesContent() {
  const [rules, setRules] = useState<PlatformSecurityRuleDTO[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [selectedCategory, setSelectedCategory] = useState<string>('');

  // Suppression Modal State
  const [suppressTarget, setSuppressTarget] = useState<PlatformSecurityRuleDTO | null>(null);
  const [suppressHours, setSuppressHours] = useState<number>(24);
  const [suppressReason, setSuppressReason] = useState<string>('');
  const [submitting, setSubmitting] = useState<boolean>(false);

  // Edit Modal State
  const [editTarget, setEditTarget] = useState<PlatformSecurityRuleDTO | null>(null);
  const [editThreshold, setEditThreshold] = useState<number>(5);
  const [editWindow, setEditWindow] = useState<number>(300);

  const fetchRules = async () => {
    try {
      setLoading(true);
      const q = selectedCategory ? `?category=${selectedCategory}` : '';
      const res = await fetch(`/api/admin/security-center/rules${q}`);
      if (res.ok) {
        const d = await res.json();
        if (d.success) setRules(d.data || []);
      }
    } catch (e) {
      console.error('Failed to load rules:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRules();
  }, [selectedCategory]);

  const handleToggleRule = async (rule: PlatformSecurityRuleDTO) => {
    try {
      const res = await fetch(`/api/admin/security-center/rules/${rule.rule_id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled: !rule.enabled }),
      });
      if (res.ok) await fetchRules();
    } catch (e) {
      console.error('Failed to toggle rule:', e);
    }
  };

  const handleSuppressSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!suppressTarget || !suppressReason.trim()) return;

    try {
      setSubmitting(true);
      const expiry = new Date(Date.now() + suppressHours * 3600 * 1000).toISOString();
      const res = await fetch(`/api/admin/security-center/rules/${suppressTarget.rule_id}/suppress`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          suppressed_until: expiry,
          suppressed_reason: suppressReason,
        }),
      });
      if (res.ok) {
        setSuppressTarget(null);
        setSuppressReason('');
        await fetchRules();
      }
    } catch (e) {
      console.error('Failed to suppress rule:', e);
    } finally {
      setSubmitting(false);
    }
  };

  const handleUnsuppress = async (ruleId: string) => {
    try {
      const res = await fetch(`/api/admin/security-center/rules/${ruleId}/unsuppress`, {
        method: 'POST',
      });
      if (res.ok) await fetchRules();
    } catch (e) {
      console.error('Failed to unsuppress rule:', e);
    }
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editTarget) return;

    try {
      setSubmitting(true);
      const res = await fetch(`/api/admin/security-center/rules/${editTarget.rule_id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          threshold: editThreshold,
          window_seconds: editWindow,
        }),
      });
      if (res.ok) {
        setEditTarget(null);
        await fetchRules();
      }
    } catch (e) {
      console.error('Failed to update rule:', e);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-card-border/80 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <Link
              href="/dashboard/admin/security-center"
              className="p-1 rounded-lg bg-card-border/60 hover:bg-card-border text-muted hover:text-white transition"
            >
              <ArrowLeft className="h-4 w-4" />
            </Link>
            <h1 className="text-2xl font-bold tracking-tight text-white">Threat Detection Rules</h1>
          </div>
          <p className="text-xs text-muted mt-1">
            24 deterministic SOC rules governing authentication, session anomalies, API abuse, IDOR, and webhooks.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="px-3 py-2 rounded-xl bg-[#0E1422] border border-card-border text-xs text-white focus:outline-none focus:border-amber-500"
          >
            <option value="">All Categories</option>
            {Object.values(SecurityEventCategory).map((cat) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Rules Table */}
      <div className="rounded-2xl bg-[#0B0F17] border border-card-border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#0E1422] border-b border-card-border/80 text-muted uppercase font-semibold text-[10px] tracking-wider">
              <tr>
                <th className="p-3 pl-5">Rule ID & Name</th>
                <th className="p-3">Category</th>
                <th className="p-3">Severity</th>
                <th className="p-3">Threshold</th>
                <th className="p-3">Window</th>
                <th className="p-3">Status</th>
                <th className="p-3 pr-5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-card-border/40 text-foreground">
              {loading ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-muted">
                    Loading detection rules...
                  </td>
                </tr>
              ) : (
                rules.map((r) => {
                  const isSuppressed = r.suppressed_until && new Date(r.suppressed_until) > new Date();

                  return (
                    <tr key={r.rule_id} className="hover:bg-card-border/20 transition">
                      <td className="p-3 pl-5 space-y-0.5">
                        <div className="font-mono text-xs font-bold text-white flex items-center gap-2">
                          <Zap className="h-3 w-3 text-amber-400" />
                          {r.rule_id}
                        </div>
                        <p className="text-[11px] text-muted">{r.name}</p>
                      </td>
                      <td className="p-3 text-muted">{r.category}</td>
                      <td className="p-3">
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20">
                          {r.severity}
                        </span>
                      </td>
                      <td className="p-3 font-semibold text-white">{r.threshold} hits</td>
                      <td className="p-3 text-muted">{r.window_seconds}s</td>
                      <td className="p-3">
                        {isSuppressed ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-purple-500/10 text-purple-400 border border-purple-500/20">
                            <Clock className="h-3 w-3" /> Suppressed
                          </span>
                        ) : r.enabled ? (
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                            Active
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-zinc-700 text-zinc-400">
                            Disabled
                          </span>
                        )}
                      </td>
                      <td className="p-3 pr-5 text-right space-x-2">
                        <button
                          onClick={() => {
                            setEditTarget(r);
                            setEditThreshold(r.threshold);
                            setEditWindow(r.window_seconds);
                          }}
                          className="px-2.5 py-1 rounded-lg bg-card-border/60 hover:bg-card-border text-[11px] font-semibold text-white transition border border-card-border"
                        >
                          Edit
                        </button>

                        {isSuppressed ? (
                          <button
                            onClick={() => handleUnsuppress(r.rule_id)}
                            className="px-2.5 py-1 rounded-lg bg-purple-600/80 hover:bg-purple-600 text-[11px] font-semibold text-white transition"
                          >
                            Unsuppress
                          </button>
                        ) : (
                          <button
                            onClick={() => {
                              setSuppressTarget(r);
                              setSuppressReason('');
                            }}
                            className="px-2.5 py-1 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-[11px] font-semibold text-zinc-300 transition"
                          >
                            Suppress
                          </button>
                        )}

                        <button
                          onClick={() => handleToggleRule(r)}
                          className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition ${
                            r.enabled
                              ? 'bg-red-950/60 hover:bg-red-900/60 text-red-300 border border-red-800/40'
                              : 'bg-emerald-950/60 hover:bg-emerald-900/60 text-emerald-300 border border-emerald-800/40'
                          }`}
                        >
                          {r.enabled ? 'Disable' : 'Enable'}
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Suppression Modal */}
      {suppressTarget && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
          <div className="max-w-md w-full rounded-2xl bg-[#0E1422] border border-card-border p-6 space-y-4 shadow-2xl">
            <h3 className="text-base font-bold text-white">
              Temporary Rule Suppression: <span className="font-mono text-amber-400">{suppressTarget.rule_id}</span>
            </h3>
            <p className="text-xs text-muted leading-relaxed">
              Suppression temporarily mutes automated platform alerts for this rule. An audit log entry is recorded with mandatory expiration.
            </p>
            <form onSubmit={handleSuppressSubmit} className="space-y-4">
              <div>
                <label className="text-[10px] text-muted uppercase font-bold">Duration (Hours)</label>
                <select
                  value={suppressHours}
                  onChange={(e) => setSuppressHours(Number(e.target.value))}
                  className="w-full mt-1 p-2.5 rounded-xl bg-[#070A0F] border border-card-border text-xs text-white focus:outline-none focus:border-amber-500"
                >
                  <option value={1}>1 Hour</option>
                  <option value={6}>6 Hours</option>
                  <option value={24}>24 Hours</option>
                  <option value={72}>72 Hours</option>
                  <option value={168}>7 Days</option>
                </select>
              </div>

              <div>
                <label className="text-[10px] text-muted uppercase font-bold">Mandatory Justification</label>
                <textarea
                  required
                  rows={3}
                  placeholder="Explain why this rule is being temporarily suppressed (e.g. scheduled load testing)..."
                  value={suppressReason}
                  onChange={(e) => setSuppressReason(e.target.value)}
                  className="w-full mt-1 p-3 rounded-xl bg-[#070A0F] border border-card-border text-xs text-white placeholder-muted focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setSuppressTarget(null)}
                  className="px-3 py-2 rounded-xl bg-card-border/60 hover:bg-card-border text-xs font-semibold text-white transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting || !suppressReason.trim()}
                  className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-xs font-semibold text-white transition"
                >
                  Apply Temporary Suppression
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Thresholds Modal */}
      {editTarget && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
          <div className="max-w-md w-full rounded-2xl bg-[#0E1422] border border-card-border p-6 space-y-4 shadow-2xl">
            <h3 className="text-base font-bold text-white">
              Configure Thresholds: <span className="font-mono text-amber-400">{editTarget.rule_id}</span>
            </h3>
            <form onSubmit={handleEditSubmit} className="space-y-4">
              <div>
                <label className="text-[10px] text-muted uppercase font-bold">Detection Threshold (Hits)</label>
                <input
                  type="number"
                  min={1}
                  max={1000}
                  value={editThreshold}
                  onChange={(e) => setEditThreshold(Number(e.target.value))}
                  className="w-full mt-1 p-2.5 rounded-xl bg-[#070A0F] border border-card-border text-xs text-white focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="text-[10px] text-muted uppercase font-bold">Sliding Window (Seconds)</label>
                <input
                  type="number"
                  min={10}
                  max={86400}
                  value={editWindow}
                  onChange={(e) => setEditWindow(Number(e.target.value))}
                  className="w-full mt-1 p-2.5 rounded-xl bg-[#070A0F] border border-card-border text-xs text-white focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setEditTarget(null)}
                  className="px-3 py-2 rounded-xl bg-card-border/60 hover:bg-card-border text-xs font-semibold text-white transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-xs font-semibold text-white transition"
                >
                  Save Parameters
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default function RulesPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-muted text-xs">Loading Detection Rules...</div>}>
      <RulesContent />
    </Suspense>
  );
}
