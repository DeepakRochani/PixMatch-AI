'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { DashboardHeader } from '@/components/layout/DashboardHeader';
import { fetchApi } from '@/lib/api-client';
import { formatDate } from '@pixmatch/ui';
import {
  Users,
  Activity,
  TrendingUp,
  AlertTriangle,
  Send,
  Sparkles,
  RefreshCw,
  Clock,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  Filter,
  Check,
  X,
  MessageSquare,
  Flame,
  ChevronRight,
  Layers,
  Calendar
} from 'lucide-react';
import {
  ClientIntelligenceOverviewDTO,
  ClientFollowUpRecommendationDTO,
  ClientEngagementState,
  ClientFollowUpPriority,
  ClientFollowUpType,
  ClientFollowUpStatus
} from '@pixmatch/types';

export default function ClientIntelligencePage() {
  const [overview, setOverview] = useState<ClientIntelligenceOverviewDTO | null>(null);
  const [followUps, setFollowUps] = useState<ClientFollowUpRecommendationDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [scanning, setScanning] = useState(false);
  const [recalculating, setRecalculating] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>('PENDING');
  const [priorityFilter, setPriorityFilter] = useState<string>('ALL');

  // Draft Creation Modal
  const [draftModalOpen, setDraftModalOpen] = useState(false);
  const [selectedFollowUp, setSelectedFollowUp] = useState<ClientFollowUpRecommendationDTO | null>(null);
  const [draftSubject, setDraftSubject] = useState('');
  const [draftBody, setDraftBody] = useState('');
  const [creatingDraft, setCreatingDraft] = useState(false);
  const [draftSuccess, setDraftSuccess] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [overviewRes, followUpsRes] = await Promise.all([
        fetchApi('/client-intelligence/overview'),
        fetchApi(`/client-intelligence/followups?status=${statusFilter}${priorityFilter !== 'ALL' ? `&priority=${priorityFilter}` : ''}`)
      ]);

      if (overviewRes?.success && overviewRes.data) {
        setOverview(overviewRes.data);
      }
      if (followUpsRes?.success && followUpsRes.data) {
        setFollowUps(followUpsRes.data);
      }
    } catch (err) {
      console.error('Failed to load client intelligence:', err);
    } finally {
      setLoading(false);
    }
  }, [statusFilter, priorityFilter]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleScanFollowUps = async () => {
    setScanning(true);
    try {
      const res = await fetchApi('/client-intelligence/followups/scan', {
        method: 'POST',
        body: JSON.stringify({}),
      });
      if (res?.success) {
        await loadData();
      }
    } catch (err) {
      console.error('Failed to scan follow-ups:', err);
    } finally {
      setScanning(false);
    }
  };

  const handleBulkRecalculate = async () => {
    setRecalculating(true);
    try {
      const res = await fetchApi('/client-intelligence/bulk-recalculate', {
        method: 'POST',
      });
      if (res?.success) {
        await loadData();
      }
    } catch (err) {
      console.error('Failed to recalculate engagement:', err);
    } finally {
      setRecalculating(false);
    }
  };

  const handleDismissFollowUp = async (id: string) => {
    try {
      const res = await fetchApi(`/client-intelligence/followups/${id}/dismiss`, {
        method: 'POST',
        body: JSON.stringify({ reason: 'Dismissed by photographer from intelligence dashboard' }),
      });
      if (res?.success) {
        loadData();
      }
    } catch (err) {
      console.error('Failed to dismiss follow-up:', err);
    }
  };

  const openDraftModal = (followUp: ClientFollowUpRecommendationDTO) => {
    setSelectedFollowUp(followUp);
    setDraftSubject(`Update regarding your gallery: ${followUp.suggestedSubject || followUp.title}`);
    setDraftBody(
      followUp.suggestedBody ||
      `Hi ${followUp.clientName || 'there'},\n\nI hope you're doing well! I wanted to check in regarding your photo gallery and see if you need any assistance.\n\nBest regards,\nYour Studio Team`
    );
    setDraftModalOpen(true);
    setDraftSuccess(false);
  };

  const handleSaveDraft = async () => {
    if (!selectedFollowUp) return;
    setCreatingDraft(true);
    try {
      const res = await fetchApi('/client-intelligence/communications/drafts', {
        method: 'POST',
        body: JSON.stringify({
          clientId: selectedFollowUp.clientId,
          galleryId: selectedFollowUp.galleryId,
          followUpRecommendationId: selectedFollowUp.id,
          subject: draftSubject,
          bodyText: draftBody,
          recipientEmail: selectedFollowUp.clientEmail,
          channel: 'EMAIL',
        }),
      });

      if (res?.success) {
        setDraftSuccess(true);
        setTimeout(() => {
          setDraftModalOpen(false);
          loadData();
        }, 1200);
      }
    } catch (err) {
      console.error('Failed to create draft:', err);
    } finally {
      setCreatingDraft(false);
    }
  };

  const getEngagementBadgeClass = (state: ClientEngagementState) => {
    switch (state) {
      case ClientEngagementState.ENGAGED:
        return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
      case ClientEngagementState.ACTIVE:
        return 'bg-blue-500/10 text-blue-400 border-blue-500/20';
      case ClientEngagementState.LOW_ENGAGEMENT:
        return 'bg-amber-500/10 text-amber-400 border-amber-500/20';
      case ClientEngagementState.AT_RISK:
        return 'bg-rose-500/10 text-rose-400 border-rose-500/20';
      case ClientEngagementState.INACTIVE:
        return 'bg-zinc-500/10 text-zinc-400 border-zinc-500/20';
      case ClientEngagementState.COMPLETED:
        return 'bg-purple-500/10 text-purple-400 border-purple-500/20';
      default:
        return 'bg-teal-500/10 text-teal-400 border-teal-500/20';
    }
  };

  const getPriorityBadgeClass = (priority: ClientFollowUpPriority | string) => {
    switch (priority) {
      case ClientFollowUpPriority.URGENT:
      case 'URGENT':
        return 'bg-rose-500/15 text-rose-400 border-rose-500/30';
      case ClientFollowUpPriority.HIGH:
      case 'HIGH':
        return 'bg-amber-500/15 text-amber-400 border-amber-500/30';
      case ClientFollowUpPriority.MEDIUM:
      case 'MEDIUM':
        return 'bg-blue-500/15 text-blue-400 border-blue-500/30';
      default:
        return 'bg-zinc-500/15 text-zinc-400 border-zinc-500/30';
    }
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col">
      <DashboardHeader
        title="Client Intelligence & Retention"
        subtitle="AI-assisted engagement scoring, lifecycle state tracking, and review-gated follow-ups"
      />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Header Title & Actions */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-zinc-800/80 pb-6">
          <div>
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-gradient-to-br from-indigo-500/20 to-purple-500/20 border border-indigo-500/30">
                <Sparkles className="w-6 h-6 text-indigo-400" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-white tracking-tight">Client Intelligence & Retention</h1>
                <p className="text-sm text-zinc-400">
                  AI-assisted engagement scoring, lifecycle state tracking, and review-gated follow-up recommendations.
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handleBulkRecalculate}
              disabled={recalculating}
              className="px-3.5 py-2 text-xs font-medium rounded-lg border border-zinc-700 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 flex items-center gap-2 transition disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${recalculating ? 'animate-spin' : ''}`} />
              Recalculate Scores
            </button>

            <button
              onClick={handleScanFollowUps}
              disabled={scanning}
              className="px-4 py-2 text-xs font-medium rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white flex items-center gap-2 transition shadow-sm disabled:opacity-50"
            >
              <Activity className={`w-3.5 h-3.5 ${scanning ? 'animate-spin' : ''}`} />
              Scan Follow-ups
            </button>

            <Link
              href="/dashboard/clients/communications"
              className="px-4 py-2 text-xs font-medium rounded-lg border border-indigo-500/30 bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-300 flex items-center gap-2 transition"
            >
              <MessageSquare className="w-3.5 h-3.5 text-indigo-400" />
              Communication Center
            </Link>
          </div>
        </div>

        {/* Top Metric Cards */}
        {overview && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-zinc-900/60 border border-zinc-800/80 rounded-xl p-5 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-zinc-400 uppercase tracking-wider">Total Clients</span>
                <Users className="w-4 h-4 text-indigo-400" />
              </div>
              <div className="mt-3 flex items-baseline gap-2">
                <span className="text-3xl font-bold text-white">{overview.totalClients}</span>
                <span className="text-xs text-zinc-500">studio-scoped</span>
              </div>
            </div>

            <div className="bg-zinc-900/60 border border-zinc-800/80 rounded-xl p-5 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-zinc-400 uppercase tracking-wider">Avg Engagement</span>
                <TrendingUp className="w-4 h-4 text-emerald-400" />
              </div>
              <div className="mt-3 flex items-baseline gap-2">
                <span className="text-3xl font-bold text-emerald-400">{overview.averageEngagementScore}</span>
                <span className="text-xs text-zinc-500">/ 100</span>
              </div>
            </div>

            <div className="bg-zinc-900/60 border border-zinc-800/80 rounded-xl p-5 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-zinc-400 uppercase tracking-wider">Pending Follow-ups</span>
                <AlertTriangle className="w-4 h-4 text-amber-400" />
              </div>
              <div className="mt-3 flex items-baseline gap-2">
                <span className="text-3xl font-bold text-amber-400">{overview.pendingFollowUpsCount}</span>
                <span className="text-xs text-zinc-500">actionable</span>
              </div>
            </div>

            <div className="bg-zinc-900/60 border border-zinc-800/80 rounded-xl p-5 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-zinc-400 uppercase tracking-wider">Communication Drafts</span>
                <Send className="w-4 h-4 text-blue-400" />
              </div>
              <div className="mt-3 flex items-baseline gap-2">
                <span className="text-3xl font-bold text-blue-400">{overview.pendingDraftsCount}</span>
                <span className="text-xs text-zinc-500">awaiting review</span>
              </div>
            </div>
          </div>
        )}

        {/* Engagement Distribution & Recent Stage Shifts */}
        {overview && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Distribution */}
            <div className="bg-zinc-900/60 border border-zinc-800/80 rounded-xl p-5 lg:col-span-1 flex flex-col justify-between">
              <div>
                <h2 className="text-sm font-semibold text-white flex items-center gap-2 mb-4">
                  <Layers className="w-4 h-4 text-indigo-400" />
                  Client Engagement Breakdown
                </h2>
                <div className="space-y-3">
                  {overview.engagementDistribution && Object.entries(overview.engagementDistribution).map(([state, count]) => {
                    const numCount = Number(count) || 0;
                    const total = overview.totalClients || 1;
                    const pct = Math.round((numCount / total) * 100);
                    return (
                      <div key={state} className="space-y-1">
                        <div className="flex justify-between text-xs">
                          <span className="text-zinc-300 font-medium">{state.replace('_', ' ')}</span>
                          <span className="text-zinc-400">{numCount} ({pct}%)</span>
                        </div>
                        <div className="w-full bg-zinc-800 h-2 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all ${
                              state === 'ENGAGED' ? 'bg-emerald-500' :
                              state === 'ACTIVE' ? 'bg-blue-500' :
                              state === 'LOW_ENGAGEMENT' ? 'bg-amber-500' :
                              state === 'AT_RISK' ? 'bg-rose-500' :
                              state === 'COMPLETED' ? 'bg-purple-500' : 'bg-zinc-600'
                            }`}
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="mt-6 pt-4 border-t border-zinc-800 text-xs text-zinc-500 flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                Deterministic scoring with recency decay (0–100 scale)
              </div>
            </div>

            {/* Recent Stage Transitions */}
            <div className="bg-zinc-900/60 border border-zinc-800/80 rounded-xl p-5 lg:col-span-2">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-sm font-semibold text-white flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-indigo-400" />
                  Recent Journey Progression
                </h2>
                <span className="text-xs text-zinc-500">Live Lifecycle Events</span>
              </div>

              {!overview.recentStageTransitions || overview.recentStageTransitions.length === 0 ? (
                <div className="p-8 text-center text-zinc-500 text-sm">
                  No recent journey stage transitions logged yet.
                </div>
              ) : (
                <div className="divide-y divide-zinc-800/60">
                  {overview.recentStageTransitions.map((t) => (
                    <div key={t.clientId} className="py-3 flex items-center justify-between gap-4">
                      <div className="min-w-0 flex-1">
                        <Link
                          href={`/dashboard/clients/${t.clientId}`}
                          className="text-sm font-medium text-white hover:text-indigo-400 transition truncate block"
                        >
                          {t.clientName}
                        </Link>
                        <div className="flex items-center gap-2 mt-1 text-xs text-zinc-400">
                          <span className="text-zinc-500">{t.previousStage || 'START'}</span>
                          <ChevronRight className="w-3 h-3 text-zinc-600" />
                          <span className="text-indigo-300 font-semibold">{t.currentStage}</span>
                        </div>
                      </div>
                      <div className="text-right">
                        <span className="text-xs text-zinc-500 block">
                          {formatDate(new Date(t.enteredStageAt))}
                        </span>
                        <Link
                          href={`/dashboard/clients/${t.clientId}`}
                          className="text-xs text-indigo-400 hover:underline mt-0.5 inline-flex items-center gap-1"
                        >
                          View 360 <ArrowRight className="w-2.5 h-2.5" />
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Follow-up Recommendations Section */}
        <div className="bg-zinc-900/60 border border-zinc-800/80 rounded-xl p-6 shadow-sm space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-base font-semibold text-white flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-400" />
                Follow-up Recommendations
              </h2>
              <p className="text-xs text-zinc-400 mt-0.5">
                Fact-grounded opportunities to reconnect with inactive or waiting clients.
              </p>
            </div>

            {/* Filters */}
            <div className="flex items-center gap-2">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="bg-zinc-950 border border-zinc-800 text-xs rounded-lg px-2.5 py-1.5 text-zinc-300 focus:outline-none focus:border-indigo-500"
              >
                <option value="PENDING">Pending Only</option>
                <option value="DISMISSED">Dismissed</option>
                <option value="DRAFTED">Drafted</option>
                <option value="SENT">Sent</option>
                <option value="EXPIRED">Expired</option>
              </select>

              <select
                value={priorityFilter}
                onChange={(e) => setPriorityFilter(e.target.value)}
                className="bg-zinc-950 border border-zinc-800 text-xs rounded-lg px-2.5 py-1.5 text-zinc-300 focus:outline-none focus:border-indigo-500"
              >
                <option value="ALL">All Priorities</option>
                <option value="URGENT">Urgent</option>
                <option value="HIGH">High</option>
                <option value="MEDIUM">Medium</option>
                <option value="LOW">Low</option>
              </select>
            </div>
          </div>

          {/* List of Follow-up recommendations */}
          {loading ? (
            <div className="py-12 text-center text-zinc-500 text-sm">Loading intelligence data...</div>
          ) : followUps.length === 0 ? (
            <div className="py-12 text-center text-zinc-500 text-sm border border-dashed border-zinc-800 rounded-lg">
              No follow-up recommendations matching the current filter.
            </div>
          ) : (
            <div className="space-y-3">
              {followUps.map((rec) => (
                <div
                  key={rec.id}
                  className="bg-zinc-950 border border-zinc-800/80 rounded-xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:border-zinc-700 transition"
                >
                  <div className="space-y-1.5 min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={`text-[10px] font-semibold uppercase px-2 py-0.5 rounded-full border ${getPriorityBadgeClass(rec.priority)}`}>
                        {rec.priority}
                      </span>
                      <span className="text-[10px] font-medium bg-zinc-800 text-zinc-300 px-2 py-0.5 rounded-full">
                        {rec.type.replace('_', ' ')}
                      </span>
                      {rec.clientName && (
                        <Link
                          href={`/dashboard/clients/${rec.clientId}`}
                          className="text-xs font-semibold text-indigo-400 hover:underline"
                        >
                          {rec.clientName}
                        </Link>
                      )}
                      {rec.galleryTitle && (
                        <span className="text-xs text-zinc-500">
                          in gallery <span className="text-zinc-300">{rec.galleryTitle}</span>
                        </span>
                      )}
                    </div>
                    <h3 className="text-sm font-medium text-white">{rec.title}</h3>
                    <p className="text-xs text-zinc-400">{rec.description}</p>
                    {rec.reason && (
                      <p className="text-[11px] text-zinc-500 italic">Trigger: {rec.reason}</p>
                    )}
                  </div>

                  <div className="flex items-center gap-2 self-end md:self-center">
                    {rec.status === 'PENDING' && (
                      <>
                        <button
                          onClick={() => openDraftModal(rec)}
                          className="px-3 py-1.5 text-xs font-medium bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg flex items-center gap-1.5 transition shadow-sm"
                        >
                          <Send className="w-3 h-3" />
                          Draft Message
                        </button>
                        <button
                          onClick={() => handleDismissFollowUp(rec.id)}
                          className="px-2.5 py-1.5 text-xs font-medium text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 rounded-lg transition"
                        >
                          Dismiss
                        </button>
                      </>
                    )}
                    {rec.status !== 'PENDING' && (
                      <span className="text-xs px-2.5 py-1 rounded bg-zinc-800 text-zinc-400 font-medium">
                        {rec.status}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>

      {/* Message Draft Modal */}
      {draftModalOpen && selectedFollowUp && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl max-w-xl w-full p-6 shadow-2xl space-y-5">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-4">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-indigo-400" />
                <h3 className="text-base font-semibold text-white">Create Message Draft</h3>
              </div>
              <button
                onClick={() => setDraftModalOpen(false)}
                className="text-zinc-400 hover:text-white p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="bg-indigo-500/10 border border-indigo-500/20 rounded-lg p-3 text-xs text-indigo-300">
              Drafts are saved for your review. No messages are sent until you explicitly approve them in the Communication Center.
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-zinc-400 mb-1">Recipient</label>
                <input
                  type="text"
                  disabled
                  value={`${selectedFollowUp.clientName || 'Client'} (${selectedFollowUp.clientEmail || 'No email'})`}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-xs text-zinc-400"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-400 mb-1">Subject</label>
                <input
                  type="text"
                  value={draftSubject}
                  onChange={(e) => setDraftSubject(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-400 mb-1">Message Body</label>
                <textarea
                  rows={6}
                  value={draftBody}
                  onChange={(e) => setDraftBody(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-3 text-xs text-white focus:outline-none focus:border-indigo-500 resize-none font-mono"
                />
              </div>
            </div>

            <div className="flex items-center justify-between border-t border-zinc-800 pt-4">
              <span className="text-xs text-zinc-500">Channel: Email</span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setDraftModalOpen(false)}
                  className="px-3.5 py-2 text-xs font-medium text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-lg transition"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveDraft}
                  disabled={creatingDraft || draftSuccess}
                  className="px-4 py-2 text-xs font-medium bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg flex items-center gap-1.5 transition disabled:opacity-50"
                >
                  {draftSuccess ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                      Saved to Review Queue!
                    </>
                  ) : creatingDraft ? (
                    'Saving Draft...'
                  ) : (
                    'Save Draft for Review'
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
