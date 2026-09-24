'use client';

import React, { useState, useEffect, use } from 'react';
import Link from 'next/link';
import {
  Target,
  ArrowLeft,
  CheckCircle2,
  AlertTriangle,
  FileSpreadsheet,
  Plus,
  Lock,
  RefreshCw,
  Sliders,
  Layers,
  Calendar,
  Download,
  Copy,
  Check,
  ChevronRight,
  Sparkles,
} from 'lucide-react';
import { PlanningNavTabs } from '@/components/dashboard/PlanningNavTabs';
import { fetchApi } from '@/lib/api-client';
import {
  BusinessPlanStatus,
  BusinessPlanTargetType,
  StrategicObjectiveType,
  StrategicInitiativePriority,
  StrategicInitiativeStatus,
} from '@pixmatch/types';

export default function PlanDetailPage({ params }: { params: Promise<{ planId: string }> }) {
  const resolvedParams = use(params);
  const planId = resolvedParams.planId;

  const [plan, setPlan] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'TARGETS' | 'OBJECTIVES' | 'BUDGETS' | 'REVIEWS' | 'AUDIT'>('TARGETS');
  const [transitioning, setTransitioning] = useState(false);

  // New Objective Modal / Form State
  const [showNewObjModal, setShowNewObjModal] = useState(false);
  const [newObjTitle, setNewObjTitle] = useState('');
  const [newObjDesc, setNewObjDesc] = useState('');
  const [newObjCat, setNewObjCat] = useState<StrategicObjectiveType>(StrategicObjectiveType.EXPANSION);

  // New Review Modal State
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [reviewPeriod, setReviewPeriod] = useState('Q1 QBR');
  const [reviewNotes, setReviewNotes] = useState('');

  const loadPlan = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetchApi(`/planning/plans/${planId}`);
      setPlan(res.data || (res as any));
    } catch (err: any) {
      console.error('Failed to load plan details:', err);
      setError(err.message || 'Failed to load business plan');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPlan();
  }, [planId]);

  const handleStatusTransition = async (newStatus: BusinessPlanStatus) => {
    setTransitioning(true);
    try {
      await fetchApi(`/planning/plans/${planId}/transition`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
      await loadPlan();
    } catch (err: any) {
      alert(`Status transition failed: ${err.message}`);
    } finally {
      setTransitioning(false);
    }
  };

  const handleRebaseline = async () => {
    if (!confirm('Re-baseline this plan to create a new DRAFT version?')) return;
    try {
      const res = await fetchApi(`/planning/plans/${planId}/rebaseline`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: 'Manual re-baseline from plan details view' }),
      });
      const newPlan = res.data || (res as any);
      window.location.href = `/dashboard/planning/plans/${newPlan.id}`;
    } catch (err: any) {
      alert(`Re-baseline failed: ${err.message}`);
    }
  };

  const handleCreateObjective = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await fetchApi(`/planning/plans/${planId}/objectives`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: newObjTitle,
          description: newObjDesc,
          category: newObjCat,
        }),
      });
      setShowNewObjModal(false);
      setNewObjTitle('');
      setNewObjDesc('');
      await loadPlan();
    } catch (err: any) {
      alert(`Failed to create objective: ${err.message}`);
    }
  };

  const handleCreateReview = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await fetchApi(`/planning/plans/${planId}/reviews`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reviewPeriod,
          reviewDate: new Date().toISOString(),
          status: 'COMPLETED',
          operationalNotes: reviewNotes,
        }),
      });
      setShowReviewModal(false);
      setReviewNotes('');
      await loadPlan();
    } catch (err: any) {
      alert(`Failed to record review: ${err.message}`);
    }
  };

  if (loading) {
    return (
      <div className="p-16 flex flex-col items-center justify-center space-y-4">
        <RefreshCw className="w-8 h-8 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground">Loading plan...</p>
      </div>
    );
  }

  if (error || !plan) {
    return (
      <div className="p-6 max-w-5xl mx-auto space-y-4">
        <Link href="/dashboard/planning/plans" className="inline-flex items-center gap-2 text-xs text-primary font-medium hover:underline">
          <ArrowLeft className="w-4 h-4" /> Back to Plans
        </Link>
        <div className="p-6 rounded-2xl bg-destructive/10 border border-destructive/20 text-destructive">
          <h3 className="font-bold">Error Loading Plan</h3>
          <p className="text-sm mt-1">{error || 'Plan not found'}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link
            href="/dashboard/planning/plans"
            className="p-2 rounded-lg border border-border/60 hover:bg-muted/50 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold tracking-tight">{plan.name}</h1>
              <span className="px-2 py-0.5 rounded-md text-xs font-bold bg-primary/10 text-primary border border-primary/20">
                v{plan.version}
              </span>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-muted text-muted-foreground border">
                {plan.status}
              </span>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              FY{plan.fiscalYear} • Type: {plan.type} • Currency: {plan.currency}
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 flex-wrap">
          {plan.status === 'DRAFT' && (
            <button
              onClick={() => handleStatusTransition(BusinessPlanStatus.IN_REVIEW)}
              disabled={transitioning}
              className="px-3 py-1.5 text-xs font-medium border border-amber-500/40 text-amber-500 rounded-lg hover:bg-amber-500/10 transition-colors"
            >
              Submit for Review
            </button>
          )}

          {plan.status === 'IN_REVIEW' && (
            <button
              onClick={() => handleStatusTransition(BusinessPlanStatus.APPROVED)}
              disabled={transitioning}
              className="px-3 py-1.5 text-xs font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Approve Plan
            </button>
          )}

          {plan.status === 'APPROVED' && (
            <button
              onClick={() => handleStatusTransition(BusinessPlanStatus.ACTIVE)}
              disabled={transitioning}
              className="px-3 py-1.5 text-xs font-semibold bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors shadow-sm"
            >
              Activate Plan
            </button>
          )}

          {plan.status === 'ACTIVE' && (
            <button
              onClick={() => handleStatusTransition(BusinessPlanStatus.LOCKED)}
              disabled={transitioning}
              className="px-3 py-1.5 text-xs font-medium border border-purple-500/40 text-purple-500 rounded-lg hover:bg-purple-500/10 transition-colors flex items-center gap-1"
            >
              <Lock className="w-3 h-3" /> Lock Plan
            </button>
          )}

          <button
            onClick={handleRebaseline}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium border border-border rounded-lg hover:bg-muted/50 transition-colors"
          >
            <Copy className="w-3.5 h-3.5" /> Re-baseline
          </button>

          <a
            href={`/api/planning/plans/${plan.id}/export/csv`}
            download
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium border border-border rounded-lg hover:bg-muted/50 transition-colors"
          >
            <Download className="w-3.5 h-3.5" /> Export CSV
          </a>
        </div>
      </div>

      <PlanningNavTabs />

      {/* Navigation Subtabs */}
      <div className="flex items-center gap-2 border-b border-border/40 pb-2 overflow-x-auto">
        {[
          { key: 'TARGETS', label: `Plan Targets (${plan.targets?.length || 0})` },
          { key: 'OBJECTIVES', label: `Strategic Objectives (${plan.strategicObjectives?.length || 0})` },
          { key: 'BUDGETS', label: 'Budget Allocations' },
          { key: 'REVIEWS', label: `QBRs & Reviews (${plan.reviews?.length || 0})` },
          { key: 'AUDIT', label: `Audit Log (${plan.audits?.length || 0})` },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key as any)}
            className={`px-4 py-2 rounded-lg text-xs font-semibold transition-colors ${
              activeTab === tab.key
                ? 'bg-primary text-primary-foreground shadow-sm'
                : 'text-muted-foreground hover:bg-muted/50'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Contents */}
      {activeTab === 'TARGETS' && (
        <div className="space-y-4">
          <div className="p-6 rounded-2xl border border-border/60 bg-card">
            <h3 className="text-base font-bold mb-4">Baseline Target Allocations</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-border/60 text-muted-foreground font-semibold">
                    <th className="py-2.5 px-3">Target Type</th>
                    <th className="py-2.5 px-3">Unit</th>
                    <th className="py-2.5 px-3">Period</th>
                    <th className="py-2.5 px-3 text-right">Planned Target</th>
                    <th className="py-2.5 px-3 text-right">Actual Recorded</th>
                    <th className="py-2.5 px-3 text-right">Progress</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/40">
                  {plan.targets.map((t: any) => {
                    const planned = Number(t.plannedValue);
                    const actual = t.actualValue !== null ? Number(t.actualValue) : null;
                    const pct = actual !== null && planned > 0 ? Math.round((actual / planned) * 100) : null;

                    return (
                      <tr key={t.id} className="hover:bg-muted/20">
                        <td className="py-2.5 px-3 font-semibold">{t.targetType}</td>
                        <td className="py-2.5 px-3 text-muted-foreground">{t.unit}</td>
                        <td className="py-2.5 px-3">
                          {t.periodMonth ? `Month ${t.periodMonth}` : t.periodQuarter ? `Quarter ${t.periodQuarter}` : 'Annual Full Year'}
                        </td>
                        <td className="py-2.5 px-3 text-right font-bold">
                          {t.unit === 'CURRENCY' ? `₹${planned.toLocaleString()}` : planned.toLocaleString()}
                        </td>
                        <td className="py-2.5 px-3 text-right font-medium">
                          {actual !== null
                            ? t.unit === 'CURRENCY'
                              ? `₹${actual.toLocaleString()}`
                              : actual.toLocaleString()
                            : '—'}
                        </td>
                        <td className="py-2.5 px-3 text-right font-bold text-primary">
                          {pct !== null ? `${pct}%` : '—'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'OBJECTIVES' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold">Strategic Objectives & Milestones</h3>
            <button
              onClick={() => setShowNewObjModal(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors shadow-sm"
            >
              <Plus className="w-3.5 h-3.5" /> Add Objective
            </button>
          </div>

          {plan.strategicObjectives?.length === 0 ? (
            <div className="p-8 border border-dashed border-border rounded-2xl text-center text-xs text-muted-foreground">
              No strategic objectives defined yet. Add key initiatives to track multi-phase studio scaling.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {plan.strategicObjectives.map((obj: any) => (
                <div key={obj.id} className="p-5 rounded-2xl border border-border/60 bg-card space-y-4">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <span className="text-[10px] font-bold text-primary uppercase tracking-wider">
                        {obj.category}
                      </span>
                      <h4 className="text-sm font-bold mt-0.5">{obj.title}</h4>
                      <p className="text-xs text-muted-foreground mt-1">{obj.description}</p>
                    </div>
                  </div>

                  <div className="space-y-2 pt-2 border-t border-border/40">
                    <div className="text-[11px] font-semibold text-muted-foreground">
                      Initiatives ({obj.initiatives?.length || 0})
                    </div>
                    {obj.initiatives?.map((init: any) => (
                      <div key={init.id} className="p-3 rounded-xl bg-muted/40 border border-border/40 space-y-1.5 text-xs">
                        <div className="flex items-center justify-between font-semibold">
                          <span>{init.title}</span>
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-primary/10 text-primary">
                            {init.status}
                          </span>
                        </div>
                        <p className="text-[11px] text-muted-foreground">{init.description}</p>
                        <div className="text-[10px] text-muted-foreground flex items-center justify-between pt-1">
                          <span>Budget: ₹{init.estimatedBudget ? Number(init.estimatedBudget).toLocaleString() : '0'}</span>
                          <span>Priority: {init.priority}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === 'REVIEWS' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold">Quarterly Business Reviews (QBR) & Cadence</h3>
            <button
              onClick={() => setShowReviewModal(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors shadow-sm"
            >
              <Plus className="w-3.5 h-3.5" /> Record QBR
            </button>
          </div>

          {plan.reviews?.length === 0 ? (
            <div className="p-8 border border-dashed border-border rounded-2xl text-center text-xs text-muted-foreground">
              No review records yet. Schedule and record quarterly business reviews to document operational learnings.
            </div>
          ) : (
            <div className="space-y-3">
              {plan.reviews.map((r: any) => (
                <div key={r.id} className="p-5 rounded-2xl border border-border/60 bg-card space-y-2 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-sm">{r.reviewPeriod}</span>
                    <span className="text-muted-foreground">{new Date(r.reviewDate).toLocaleDateString()}</span>
                  </div>
                  <p className="text-muted-foreground">{r.operationalNotes || 'No notes entered.'}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === 'AUDIT' && (
        <div className="p-6 rounded-2xl border border-border/60 bg-card space-y-4">
          <h3 className="text-base font-bold">Immutable Governance & Audit Trail</h3>
          <div className="space-y-2">
            {plan.audits?.map((a: any) => (
              <div key={a.id} className="p-3 rounded-xl bg-muted/40 border border-border/40 text-xs flex items-center justify-between">
                <div>
                  <span className="font-bold text-primary mr-2">[{a.action}]</span>
                  <span>{a.details}</span>
                </div>
                <span className="text-[11px] text-muted-foreground">{new Date(a.createdAt).toLocaleString()}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* New Objective Modal */}
      {showNewObjModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-2xl p-6 max-w-md w-full space-y-4 shadow-xl">
            <h3 className="text-base font-bold">Add Strategic Objective</h3>
            <form onSubmit={handleCreateObjective} className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-semibold">Objective Title *</label>
                <input
                  type="text"
                  required
                  value={newObjTitle}
                  onChange={(e) => setNewObjTitle(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-border bg-background"
                  placeholder="e.g. Corporate Client Acquisition Sprint"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold">Category</label>
                <select
                  value={newObjCat}
                  onChange={(e) => setNewObjCat(e.target.value as any)}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-border bg-background"
                >
                  <option value="EXPANSION">EXPANSION</option>
                  <option value="PROFITABILITY">PROFITABILITY</option>
                  <option value="EFFICIENCY">EFFICIENCY</option>
                  <option value="MARKET_PENETRATION">MARKET PENETRATION</option>
                  <option value="BRAND_AUTHORITY">BRAND AUTHORITY</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold">Description</label>
                <textarea
                  rows={2}
                  value={newObjDesc}
                  onChange={(e) => setNewObjDesc(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-border bg-background"
                  placeholder="Key strategic outcome..."
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowNewObjModal(false)}
                  className="px-3 py-1.5 text-xs border rounded-lg hover:bg-muted"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 text-xs bg-primary text-primary-foreground font-semibold rounded-lg hover:bg-primary/90"
                >
                  Add Objective
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* New Review Modal */}
      {showReviewModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-2xl p-6 max-w-md w-full space-y-4 shadow-xl">
            <h3 className="text-base font-bold">Record Business Plan Review (QBR)</h3>
            <form onSubmit={handleCreateReview} className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-semibold">Review Period *</label>
                <input
                  type="text"
                  required
                  value={reviewPeriod}
                  onChange={(e) => setReviewPeriod(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-border bg-background"
                  placeholder="e.g. Q1 2026 Executive Review"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold">Operational Findings & Learnings</label>
                <textarea
                  rows={3}
                  value={reviewNotes}
                  onChange={(e) => setReviewNotes(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-border bg-background"
                  placeholder="Key revenue variances, team capacity bottlenecks, action items..."
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowReviewModal(false)}
                  className="px-3 py-1.5 text-xs border rounded-lg hover:bg-muted"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 text-xs bg-primary text-primary-foreground font-semibold rounded-lg hover:bg-primary/90"
                >
                  Save Review
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
