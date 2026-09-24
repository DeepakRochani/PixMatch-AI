'use client';

import React, { useState, useEffect } from 'react';
import { fetchApi } from '@/lib/api-client';
import {
  PhotoProofingSessionDTO,
  ProofingSummaryDTO,
  ProofingSessionStatus,
  ProofingReviewDecision,
} from '@pixmatch/types';

export default function StudioProofingDashboardPage() {
  const [sessions, setSessions] = useState<PhotoProofingSessionDTO[]>([]);
  const [summary, setSummary] = useState<ProofingSummaryDTO | null>(null);
  const [galleries, setGalleries] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'ALL' | 'ACTIVE' | 'SUBMITTED' | 'APPROVED'>('ALL');

  // Create Modal State
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [newSessionName, setNewSessionName] = useState('');
  const [selectedGalleryId, setSelectedGalleryId] = useState('');
  const [includedCount, setIncludedCount] = useState(30);
  const [minSelections, setMinSelections] = useState(1);
  const [extraPrice, setExtraPrice] = useState(5.0);
  const [pinCode, setPinCode] = useState('');
  const [deadlineDays, setDeadlineDays] = useState(14);
  const [creating, setCreating] = useState(false);
  const [createdTokenLink, setCreatedTokenLink] = useState<string | null>(null);

  // Review Drawer State
  const [selectedSession, setSelectedSession] = useState<PhotoProofingSessionDTO | null>(null);
  const [isReviewDrawerOpen, setIsReviewDrawerOpen] = useState(false);
  const [reviewNotes, setReviewNotes] = useState('');
  const [reviewing, setReviewing] = useState(false);

  // Load Data
  const loadData = async () => {
    setLoading(true);
    const [summaryRes, sessionsRes, galleriesRes] = await Promise.all([
      fetchApi<ProofingSummaryDTO>('/v1/proofing/summary'),
      fetchApi<PhotoProofingSessionDTO[]>('/v1/proofing/sessions'),
      fetchApi<any[]>('/v1/galleries'),
    ]);

    if (summaryRes.success && summaryRes.data) setSummary(summaryRes.data);
    if (sessionsRes.success && sessionsRes.data) setSessions(sessionsRes.data);
    if (galleriesRes.success && galleriesRes.data) {
      setGalleries(Array.isArray(galleriesRes.data) ? galleriesRes.data : (galleriesRes.data as any).galleries || []);
    }
    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, []);

  // Handle Create Session
  const handleCreateSession = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedGalleryId || !newSessionName.trim()) return;

    setCreating(true);
    const deadline = new Date();
    deadline.setDate(deadline.getDate() + deadlineDays);

    const res = await fetchApi<any>('/v1/proofing/sessions', {
      method: 'POST',
      body: JSON.stringify({
        name: newSessionName.trim(),
        gallery_id: selectedGalleryId,
        deadline_at: deadline.toISOString(),
        pin_code: pinCode.trim() || undefined,
        rules: {
          included_count: Number(includedCount),
          min_selections: Number(minSelections),
          extra_price_cents: Math.round(Number(extraPrice) * 100),
          allow_extras: true,
        },
      }),
    });

    setCreating(false);
    if (res.success && res.data) {
      const rawToken = res.data.raw_token;
      if (rawToken && typeof window !== 'undefined') {
        const link = `${window.location.origin}/portal/proofing/${rawToken}`;
        setCreatedTokenLink(link);
      }
      loadData();
    } else {
      alert(res.error?.message || 'Failed to create proofing session.');
    }
  };

  // Handle Review Decision
  const handleReviewDecision = async (decision: ProofingReviewDecision) => {
    if (!selectedSession) return;
    setReviewing(true);

    const res = await fetchApi(`/v1/proofing/sessions/${selectedSession.id}/review`, {
      method: 'POST',
      body: JSON.stringify({
        decision,
        feedback_notes: reviewNotes,
        auto_create_edit_jobs: true,
        advance_production_stage: true,
      }),
    });

    setReviewing(false);
    if (res.success) {
      setIsReviewDrawerOpen(false);
      setSelectedSession(null);
      setReviewNotes('');
      loadData();
    } else {
      alert(res.error?.message || 'Failed to submit review.');
    }
  };

  // Filtered Sessions
  const filteredSessions = sessions.filter((s) => {
    if (activeTab === 'ACTIVE') return s.status === ProofingSessionStatus.ACTIVE || s.status === ProofingSessionStatus.CLIENT_REVIEWING;
    if (activeTab === 'SUBMITTED') return s.status === ProofingSessionStatus.SUBMITTED;
    if (activeTab === 'APPROVED') return s.status === ProofingSessionStatus.APPROVED;
    return true;
  });

  return (
    <div className="p-6 lg:p-10 max-w-7xl mx-auto space-y-8 text-slate-100 font-sans">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Client Proofing & Selection</h1>
          <p className="text-slate-400 text-sm mt-1">
            Manage client photo selection quotas, pinpoint retouching notes, and auto-queue master editing.
          </p>
        </div>

        <button
          onClick={() => {
            setCreatedTokenLink(null);
            setIsCreateModalOpen(true);
          }}
          className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold px-4 py-2.5 rounded-xl transition shadow-lg shadow-indigo-600/25 flex items-center gap-2"
        >
          <span>+</span> Create Proofing Session
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-1">
          <p className="text-xs font-medium text-slate-400">Active Sessions</p>
          <p className="text-2xl font-bold text-indigo-400">{summary?.active_sessions || 0}</p>
          <p className="text-[11px] text-slate-500">Clients currently reviewing</p>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-1">
          <p className="text-xs font-medium text-slate-400">Submitted for Review</p>
          <p className="text-2xl font-bold text-amber-400">{summary?.submitted_sessions || 0}</p>
          <p className="text-[11px] text-slate-500">Awaiting photographer sign-off</p>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-1">
          <p className="text-xs font-medium text-slate-400">Approved for Editing</p>
          <p className="text-2xl font-bold text-emerald-400">{summary?.approved_sessions || 0}</p>
          <p className="text-[11px] text-slate-500">Handoff to Phase 24 queue</p>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-1">
          <p className="text-xs font-medium text-slate-400">Extra Photo Revenue</p>
          <p className="text-2xl font-bold text-emerald-400">{summary?.formatted_extra_revenue || '$0.00'}</p>
          <p className="text-[11px] text-slate-500">{summary?.extra_photos_ordered || 0} upsell photos ordered</p>
        </div>
      </div>

      {/* Sessions Table & Filter Tabs */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden space-y-4 p-6">
        {/* Tab Pills */}
        <div className="flex items-center gap-2 border-b border-slate-800 pb-4">
          {(['ALL', 'ACTIVE', 'SUBMITTED', 'APPROVED'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${
                activeTab === tab
                  ? 'bg-indigo-600 text-white'
                  : 'bg-slate-800 text-slate-400 hover:text-slate-200'
              }`}
            >
              {tab.charAt(0) + tab.slice(1).toLowerCase()}
            </button>
          ))}
        </div>

        {/* Table */}
        {loading ? (
          <div className="py-12 text-center text-slate-500 text-xs">Loading sessions...</div>
        ) : filteredSessions.length === 0 ? (
          <div className="py-12 text-center text-slate-500 text-xs">No proofing sessions found.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="text-slate-400 border-b border-slate-800 font-medium">
                <tr>
                  <th className="pb-3 px-3">Session Name</th>
                  <th className="pb-3 px-3">Gallery</th>
                  <th className="pb-3 px-3">Status</th>
                  <th className="pb-3 px-3">Selection Progress</th>
                  <th className="pb-3 px-3">Extras Surcharge</th>
                  <th className="pb-3 px-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {filteredSessions.map((s) => {
                  const quota = s.quota;
                  return (
                    <tr key={s.id} className="hover:bg-slate-800/30 transition">
                      <td className="py-3.5 px-3 font-semibold text-slate-200">
                        {s.name}
                        {s.has_pin && <span className="ml-1.5 text-indigo-400 text-[10px]">🔒 PIN</span>}
                      </td>
                      <td className="py-3.5 px-3 text-slate-400">{s.gallery?.title || 'Unknown Gallery'}</td>
                      <td className="py-3.5 px-3">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                          s.status === 'APPROVED' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' :
                          s.status === 'SUBMITTED' ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' :
                          s.status === 'CHANGES_REQUESTED' ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30' :
                          'bg-indigo-500/20 text-indigo-400 border border-indigo-500/30'
                        }`}>
                          {s.status}
                        </span>
                      </td>
                      <td className="py-3.5 px-3 text-slate-300">
                        <div className="space-y-1 w-32">
                          <div className="flex justify-between text-[11px]">
                            <span>{quota?.selected_count || 0} / {quota?.included_count || 30}</span>
                            <span className="text-amber-400">★ {quota?.favorites_count || 0}</span>
                          </div>
                          <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                            <div
                              className="bg-indigo-500 h-full rounded-full"
                              style={{
                                width: `${Math.min(100, ((quota?.selected_count || 0) / (quota?.included_count || 30)) * 100)}%`,
                              }}
                            />
                          </div>
                        </div>
                      </td>
                      <td className="py-3.5 px-3 text-emerald-400 font-medium">
                        {quota?.extra_count && quota.extra_count > 0 ? quota.formatted_extra_total : '—'}
                      </td>
                      <td className="py-3.5 px-3 text-right space-x-2">
                        <button
                          onClick={async () => {
                            const res = await fetchApi<PhotoProofingSessionDTO>(`/v1/proofing/sessions/${s.id}`);
                            if (res.success && res.data) {
                              setSelectedSession(res.data);
                              setIsReviewDrawerOpen(true);
                            }
                          }}
                          className="px-3 py-1 bg-slate-800 hover:bg-slate-700 text-indigo-300 hover:text-indigo-200 rounded-lg text-xs font-medium transition"
                        >
                          {s.status === 'SUBMITTED' ? 'Review & Approve' : 'View Details'}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Create Session Modal */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 max-w-md w-full space-y-5 shadow-2xl">
            <div>
              <h3 className="text-lg font-bold">New Client Proofing Session</h3>
              <p className="text-xs text-slate-400 mt-0.5">Generate a dedicated client selection workspace with quota controls.</p>
            </div>

            {createdTokenLink ? (
              <div className="space-y-4">
                <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 p-4 rounded-xl text-xs space-y-2">
                  <p className="font-semibold">✓ Proofing Session Created Successfully!</p>
                  <p className="text-slate-300">Share this direct link with your client:</p>
                  <input
                    type="text"
                    readOnly
                    value={createdTokenLink}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-xs font-mono text-indigo-300"
                  />
                </div>
                <button
                  onClick={() => {
                    setIsCreateModalOpen(false);
                    setCreatedTokenLink(null);
                  }}
                  className="w-full bg-indigo-600 text-white text-xs font-semibold py-2.5 rounded-xl"
                >
                  Done
                </button>
              </div>
            ) : (
              <form onSubmit={handleCreateSession} className="space-y-4 text-xs">
                <div>
                  <label className="block text-slate-400 mb-1">Session Name</label>
                  <input
                    type="text"
                    placeholder="e.g. Eleanor & Lucas Wedding Selection"
                    value={newSessionName}
                    onChange={(e) => setNewSessionName(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-slate-200 focus:outline-none"
                    required
                  />
                </div>

                <div>
                  <label className="block text-slate-400 mb-1">Target Gallery</label>
                  <select
                    value={selectedGalleryId}
                    onChange={(e) => setSelectedGalleryId(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-slate-200 focus:outline-none"
                    required
                  >
                    <option value="">Select a gallery...</option>
                    {galleries.map((g) => (
                      <option key={g.id} value={g.id}>
                        {g.title} ({g.photos?.length || g.photo_count || 0} photos)
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-400 mb-1">Included Photos</label>
                    <input
                      type="number"
                      min={1}
                      value={includedCount}
                      onChange={(e) => setIncludedCount(Number(e.target.value))}
                      className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-slate-200 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-400 mb-1">Extra Photo Price ($)</label>
                    <input
                      type="number"
                      step="0.5"
                      min={0}
                      value={extraPrice}
                      onChange={(e) => setExtraPrice(Number(e.target.value))}
                      className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-slate-200 focus:outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-400 mb-1">PIN Protection (Optional)</label>
                    <input
                      type="text"
                      placeholder="e.g. 1234"
                      value={pinCode}
                      onChange={(e) => setPinCode(e.target.value)}
                      className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-slate-200 font-mono focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-400 mb-1">Deadline (Days)</label>
                    <input
                      type="number"
                      min={1}
                      value={deadlineDays}
                      onChange={(e) => setDeadlineDays(Number(e.target.value))}
                      className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-slate-200 focus:outline-none"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
                  <button
                    type="button"
                    onClick={() => setIsCreateModalOpen(false)}
                    className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={creating}
                    className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-800 text-white rounded-xl font-semibold"
                  >
                    {creating ? 'Creating...' : 'Create Session'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* Review & Details Drawer */}
      {isReviewDrawerOpen && selectedSession && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex justify-end">
          <div className="w-full max-w-2xl bg-slate-900 border-l border-slate-800 h-full flex flex-col p-6 space-y-6 overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div>
                <h3 className="text-lg font-bold">{selectedSession.name}</h3>
                <p className="text-xs text-slate-400">Status: <span className="text-indigo-400 font-semibold">{selectedSession.status}</span></p>
              </div>
              <button
                onClick={() => setIsReviewDrawerOpen(false)}
                className="text-slate-400 hover:text-slate-200 p-2 rounded-lg bg-slate-800"
              >
                ✕
              </button>
            </div>

            {/* Quota breakdown */}
            <div className="bg-slate-800/60 border border-slate-700/60 rounded-xl p-4 grid grid-cols-3 gap-3 text-xs">
              <div>
                <span className="text-slate-400 block">Selected</span>
                <span className="font-bold text-slate-100 text-sm">{selectedSession.quota?.selected_count} photos</span>
              </div>
              <div>
                <span className="text-slate-400 block">Included</span>
                <span className="font-bold text-slate-100 text-sm">{selectedSession.quota?.included_count} photos</span>
              </div>
              <div>
                <span className="text-slate-400 block">Extra Charge</span>
                <span className="font-bold text-emerald-400 text-sm">{selectedSession.quota?.formatted_extra_total || '$0.00'}</span>
              </div>
            </div>

            {/* Selected Photos Preview */}
            <div className="space-y-2">
              <h4 className="text-xs font-semibold text-slate-300">Client Selected Photos ({selectedSession.items?.filter((i) => i.status === 'SELECTED').length})</h4>
              <div className="grid grid-cols-4 gap-2 max-h-56 overflow-y-auto p-1">
                {selectedSession.items?.filter((i) => i.status === 'SELECTED').map((item) => (
                  <div key={item.id} className="aspect-[4/3] rounded-lg overflow-hidden bg-slate-950 border border-slate-800 relative">
                    <img src={item.photo?.thumbnail_url || item.photo?.original_url || ''} alt="" className="w-full h-full object-cover" />
                    {item.is_favorite && <span className="absolute top-1 left-1 text-amber-400 text-[10px]">★</span>}
                  </div>
                ))}
              </div>
            </div>

            {/* Photographer Actions */}
            <div className="space-y-3 pt-4 border-t border-slate-800 text-xs">
              <h4 className="font-semibold text-slate-300">Photographer Sign-off</h4>
              <textarea
                rows={2}
                placeholder="Notes for client or post-production team..."
                value={reviewNotes}
                onChange={(e) => setReviewNotes(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2.5 text-slate-200 focus:outline-none"
              />

              <div className="flex items-center gap-3">
                <button
                  disabled={reviewing}
                  onClick={() => handleReviewDecision(ProofingReviewDecision.APPROVED_FOR_EDITING)}
                  className="flex-1 bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-800 text-white font-semibold py-2.5 rounded-xl transition"
                >
                  ✓ Approve & Queue Editing (Phase 24)
                </button>
                <button
                  disabled={reviewing}
                  onClick={() => handleReviewDecision(ProofingReviewDecision.REVISION_REQUIRED)}
                  className="px-4 bg-amber-600 hover:bg-amber-500 disabled:bg-slate-800 text-white font-semibold py-2.5 rounded-xl transition"
                >
                  Request Changes
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
