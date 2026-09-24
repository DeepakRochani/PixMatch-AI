'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { DashboardHeader } from '@/components/layout/DashboardHeader';
import { fetchApi } from '@/lib/api-client';
import { formatDate } from '@pixmatch/ui';
import {
  Send,
  Mail,
  CheckCircle2,
  AlertCircle,
  Clock,
  Edit2,
  X,
  Check,
  RefreshCw,
  Sparkles,
  ShieldCheck,
  Eye,
  Trash2,
  ChevronLeft,
  ArrowRight,
  Filter
} from 'lucide-react';
import {
  ClientCommunicationDraftDTO,
  ClientCommunicationStatus,
  ClientCommunicationChannel
} from '@pixmatch/types';

export default function CommunicationsCenterPage() {
  const [drafts, setDrafts] = useState<ClientCommunicationDraftDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  // Preview & Approve / Edit Modal
  const [activeDraft, setActiveDraft] = useState<ClientCommunicationDraftDTO | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editSubject, setEditSubject] = useState('');
  const [editBody, setEditBody] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  const loadDrafts = useCallback(async () => {
    setLoading(true);
    try {
      const query = statusFilter !== 'ALL' ? `?status=${statusFilter}` : '';
      const res = await fetchApi(`/client-intelligence/communications${query}`);
      if (res?.success && res.data) {
        setDrafts(res.data);
      }
    } catch (err) {
      console.error('Failed to load communication drafts:', err);
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    loadDrafts();
  }, [loadDrafts]);

  const openDraftModal = (draft: ClientCommunicationDraftDTO) => {
    setActiveDraft(draft);
    setEditSubject(draft.subject || '');
    setEditBody(draft.bodyText || draft.body || '');
    setIsEditing(false);
    setActionError(null);
    setActionSuccess(null);
  };

  const handleSaveEdits = async () => {
    if (!activeDraft) return;
    setActionLoading(true);
    setActionError(null);
    try {
      const res = await fetchApi(`/client-intelligence/communications/drafts/${activeDraft.id}`, {
        method: 'PATCH',
        body: JSON.stringify({
          subject: editSubject,
          bodyText: editBody,
        }),
      });

      if (res?.success && res.data) {
        setActiveDraft(res.data);
        setIsEditing(false);
        setActionSuccess('Draft edits saved successfully.');
        loadDrafts();
      } else {
        setActionError(res?.error?.message || 'Failed to save edits.');
      }
    } catch (err: any) {
      setActionError(err.message || 'Error saving edits.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleApproveAndSend = async () => {
    if (!activeDraft) return;
    setActionLoading(true);
    setActionError(null);
    try {
      const res = await fetchApi(`/client-intelligence/communications/drafts/${activeDraft.id}/approve-and-send`, {
        method: 'POST',
      });

      if (res?.success && res.data) {
        setActionSuccess('Message approved and dispatched via verified email service!');
        setTimeout(() => {
          setActiveDraft(null);
          loadDrafts();
        }, 1500);
      } else {
        setActionError(res?.error?.message || 'Approval or dispatch failed.');
      }
    } catch (err: any) {
      setActionError(err.message || 'Approval failed.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleCancelDraft = async () => {
    if (!activeDraft) return;
    setActionLoading(true);
    setActionError(null);
    try {
      const res = await fetchApi(`/client-intelligence/communications/drafts/${activeDraft.id}/cancel`, {
        method: 'POST',
        body: JSON.stringify({ reason: 'Cancelled by photographer from Communications Center' }),
      });

      if (res?.success) {
        setActionSuccess('Draft cancelled.');
        setTimeout(() => {
          setActiveDraft(null);
          loadDrafts();
        }, 1200);
      }
    } catch (err: any) {
      setActionError(err.message || 'Failed to cancel draft.');
    } finally {
      setActionLoading(false);
    }
  };

  const getStatusBadge = (status: ClientCommunicationStatus) => {
    switch (status) {
      case ClientCommunicationStatus.SENT:
        return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
      case ClientCommunicationStatus.APPROVED:
        return 'bg-blue-500/10 text-blue-400 border-blue-500/20';
      case ClientCommunicationStatus.NEEDS_REVIEW:
        return 'bg-amber-500/10 text-amber-400 border-amber-500/20';
      case ClientCommunicationStatus.DRAFT:
        return 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20';
      case ClientCommunicationStatus.FAILED:
        return 'bg-rose-500/10 text-rose-400 border-rose-500/20';
      case ClientCommunicationStatus.CANCELLED:
        return 'bg-zinc-500/10 text-zinc-400 border-zinc-500/20';
      default:
        return 'bg-zinc-500/10 text-zinc-400 border-zinc-500/20';
    }
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col">
      <DashboardHeader
        title="Communication Center"
        subtitle="Review, edit, and approve client messages before dispatch"
      />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Navigation & Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-zinc-800/80 pb-6">
          <div className="flex items-center gap-3">
            <Link
              href="/dashboard/clients/intelligence"
              className="p-2 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white transition"
            >
              <ChevronLeft className="w-5 h-5" />
            </Link>
            <div>
              <h1 className="text-2xl font-bold text-white tracking-tight">Communication Center</h1>
              <p className="text-sm text-zinc-400">
                Review, edit, and approve client messages. Strict photographer approval policy enforced before sending.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-zinc-900 border border-zinc-800 text-xs rounded-lg px-3 py-2 text-zinc-300 focus:outline-none focus:border-indigo-500"
            >
              <option value="ALL">All Statuses</option>
              <option value="NEEDS_REVIEW">Needs Review</option>
              <option value="DRAFT">Draft</option>
              <option value="APPROVED">Approved</option>
              <option value="SENT">Sent</option>
              <option value="FAILED">Failed</option>
              <option value="CANCELLED">Cancelled</option>
            </select>

            <button
              onClick={loadDrafts}
              className="p-2 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white transition"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Informational Banner */}
        <div className="bg-zinc-900/60 border border-zinc-800/80 rounded-xl p-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-500/10 rounded-lg border border-emerald-500/20 text-emerald-400">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div className="text-xs">
              <span className="font-semibold text-white block">Strict Human-in-the-Loop Protocol</span>
              <span className="text-zinc-400">
                PIXMatch AI never automatically sends unapproved messages to clients. All drafts verify email suppression lists and preferences upon dispatch.
              </span>
            </div>
          </div>
        </div>

        {/* Drafts List */}
        <div className="bg-zinc-900/60 border border-zinc-800/80 rounded-xl overflow-hidden shadow-sm">
          {loading ? (
            <div className="p-12 text-center text-zinc-500 text-sm">Loading communications queue...</div>
          ) : drafts.length === 0 ? (
            <div className="p-12 text-center text-zinc-500 text-sm">
              No communication drafts found. Generate drafts from Client Follow-up Recommendations or Client 360 profiles.
            </div>
          ) : (
            <div className="divide-y divide-zinc-800/60">
              {drafts.map((d) => (
                <div
                  key={d.id}
                  className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-zinc-900/40 transition cursor-pointer"
                  onClick={() => openDraftModal(d)}
                >
                  <div className="space-y-1.5 min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className={`text-[10px] font-semibold uppercase px-2 py-0.5 rounded-full border ${getStatusBadge(d.status)}`}>
                        {d.status.replace('_', ' ')}
                      </span>
                      <span className="text-[10px] text-zinc-400 bg-zinc-800 px-2 py-0.5 rounded">
                        {d.channel}
                      </span>
                      {(d.recipientEmail || d.client_email) && (
                        <span className="text-xs text-zinc-300 font-medium">
                          To: {d.recipientEmail || d.client_email}
                        </span>
                      )}
                    </div>
                    <h3 className="text-sm font-semibold text-white">{d.subject || 'Draft Message'}</h3>
                    <p className="text-xs text-zinc-400 line-clamp-1 font-mono">
                      {d.bodyText || d.body}
                    </p>
                    <div className="flex items-center gap-3 text-[11px] text-zinc-500">
                      <span>Created {formatDate(new Date(d.createdAt || d.created_at || new Date()))}</span>
                      {(d.sentAt || d.sent_at) && <span>Sent {formatDate(new Date((d.sentAt || d.sent_at)!))}</span>}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 self-end md:self-center" onClick={(e) => e.stopPropagation()}>
                    <button
                      onClick={() => openDraftModal(d)}
                      className="px-3.5 py-1.5 text-xs font-medium bg-zinc-800 hover:bg-zinc-700 text-zinc-200 rounded-lg flex items-center gap-1.5 transition"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      Review
                    </button>
                    {(d.status === 'NEEDS_REVIEW' || d.status === 'DRAFT') && (
                      <button
                        onClick={() => {
                          openDraftModal(d);
                        }}
                        className="px-3.5 py-1.5 text-xs font-medium bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg flex items-center gap-1.5 transition shadow-sm"
                      >
                        <Send className="w-3 h-3" />
                        Approve & Send
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>

      {/* Review / Approval / Edit Modal */}
      {activeDraft && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl max-w-2xl w-full p-6 shadow-2xl space-y-5">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-4">
              <div className="flex items-center gap-2">
                <Mail className="w-5 h-5 text-indigo-400" />
                <h3 className="text-base font-semibold text-white">Review Client Communication</h3>
              </div>
              <button
                onClick={() => setActiveDraft(null)}
                className="text-zinc-400 hover:text-white p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {actionError && (
              <div className="bg-rose-500/10 border border-rose-500/30 rounded-lg p-3 text-xs text-rose-300 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-400 flex-shrink-0" />
                <span>{actionError}</span>
              </div>
            )}

            {actionSuccess && (
              <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-lg p-3 text-xs text-emerald-300 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                <span>{actionSuccess}</span>
              </div>
            )}

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-xs">
                <div>
                  <span className="text-zinc-500 block">Recipient</span>
                  <span className="font-medium text-zinc-200">{activeDraft.recipientEmail || activeDraft.client_email || 'Client'}</span>
                </div>
                <div>
                  <span className="text-zinc-500 block">Current Status</span>
                  <span className={`inline-block mt-0.5 uppercase px-2 py-0.5 rounded border text-[10px] font-semibold ${getStatusBadge(activeDraft.status)}`}>
                    {activeDraft.status}
                  </span>
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-medium text-zinc-400">Subject</label>
                  {!isEditing && activeDraft.status !== 'SENT' && (
                    <button
                      onClick={() => setIsEditing(true)}
                      className="text-xs text-indigo-400 hover:underline flex items-center gap-1"
                    >
                      <Edit2 className="w-3 h-3" /> Edit Message
                    </button>
                  )}
                </div>
                {isEditing ? (
                  <input
                    type="text"
                    value={editSubject}
                    onChange={(e) => setEditSubject(e.target.value)}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                  />
                ) : (
                  <div className="bg-zinc-950 border border-zinc-800/80 rounded-lg px-3 py-2 text-xs text-white font-medium">
                    {activeDraft.subject || 'Draft Message'}
                  </div>
                )}
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-400 mb-1">Message Content</label>
                {isEditing ? (
                  <textarea
                    rows={8}
                    value={editBody}
                    onChange={(e) => setEditBody(e.target.value)}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-3 text-xs text-white focus:outline-none focus:border-indigo-500 resize-none font-mono"
                  />
                ) : (
                  <div className="bg-zinc-950 border border-zinc-800/80 rounded-lg p-3 text-xs text-zinc-300 font-mono whitespace-pre-wrap max-h-56 overflow-y-auto">
                    {activeDraft.bodyText || activeDraft.body}
                  </div>
                )}
              </div>
            </div>

            <div className="flex items-center justify-between border-t border-zinc-800 pt-4">
              {activeDraft.status !== 'SENT' && activeDraft.status !== 'CANCELLED' ? (
                <button
                  onClick={handleCancelDraft}
                  disabled={actionLoading}
                  className="text-xs text-rose-400 hover:text-rose-300 hover:underline"
                >
                  Cancel / Discard Draft
                </button>
              ) : (
                <span className="text-xs text-zinc-500">ID: {activeDraft.id.slice(0, 8)}...</span>
              )}

              <div className="flex items-center gap-2">
                {isEditing ? (
                  <>
                    <button
                      onClick={() => setIsEditing(false)}
                      className="px-3 py-1.5 text-xs text-zinc-400 hover:text-white"
                    >
                      Cancel Edit
                    </button>
                    <button
                      onClick={handleSaveEdits}
                      disabled={actionLoading}
                      className="px-4 py-2 text-xs font-medium bg-zinc-800 hover:bg-zinc-700 text-white rounded-lg transition"
                    >
                      Save Changes
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      onClick={() => setActiveDraft(null)}
                      className="px-3.5 py-2 text-xs font-medium text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-lg transition"
                    >
                      Close
                    </button>
                    {activeDraft.status !== 'SENT' && activeDraft.status !== 'CANCELLED' && (
                      <button
                        onClick={handleApproveAndSend}
                        disabled={actionLoading}
                        className="px-4 py-2 text-xs font-medium bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg flex items-center gap-1.5 transition shadow-sm disabled:opacity-50"
                      >
                        <Send className="w-3.5 h-3.5" />
                        {actionLoading ? 'Dispatching...' : 'Approve & Send Now'}
                      </button>
                    )}
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
