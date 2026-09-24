'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { fetchApi } from '@/lib/api-client';

interface AttentionData {
  member_id: string;
  total_attention_count: number;
  critical_attention_count: number;
  pending_handoffs: Array<{
    id: string;
    title: string;
    description: string;
    from_member_name?: string;
    created_at: string;
    thread_id: string;
  }>;
  open_blockers: Array<{
    id: string;
    title: string;
    severity: string;
    reporter_name?: string;
    created_at: string;
    thread_id: string;
  }>;
  unread_mentions: Array<{
    id: string;
    thread_id: string;
    message_id: string;
    content: string;
    author_name?: string;
    created_at: string;
  }>;
  urgent_help_requests: Array<{
    id: string;
    title: string;
    priority: string;
    category: string;
    requester_name?: string;
    created_at: string;
    thread_id: string;
  }>;
}

export default function TeamAttentionCenterPage() {
  const [attention, setAttention] = useState<AttentionData | null>(null);
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    setLoading(true);
    try {
      const res = await fetchApi<any>('/v1/team/collaboration/attention');
      const data = (res as any)?.data || res;
      setAttention(data?.attention || data);
    } catch (err) {
      console.error('Failed to load attention data', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleAcceptHandoff = async (handoffId: string) => {
    try {
      await fetchApi<any>(`/v1/team/collaboration/handoffs/${handoffId}/accept`, {
        method: 'POST',
      });
      loadData();
    } catch (err) {
      console.error('Failed to accept handoff', err);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-6 md:p-8">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-6 mb-8">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-white">
              Team Attention Center
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20">
              Priority Inbox
            </span>
          </div>
          <p className="text-sm text-slate-400 mt-1">
            Zero in on what needs your immediate review, acceptance, unblocking, or response.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/dashboard/team/collaboration"
            className="inline-flex items-center px-4 py-2 text-sm font-medium rounded-lg bg-slate-900 border border-slate-800 text-slate-300 hover:bg-slate-800 transition-colors"
          >
            ← Back to All Threads
          </Link>
          <button
            onClick={loadData}
            className="px-3.5 py-2 text-xs font-semibold bg-indigo-600/20 text-indigo-300 border border-indigo-500/30 rounded-lg hover:bg-indigo-600/30 transition-colors"
          >
            Refresh
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center p-16">
          <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <div className="space-y-8">
          {/* Summary Metric Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5">
              <span className="text-xs font-medium text-slate-400">Pending Handoffs</span>
              <p className="text-3xl font-bold text-amber-400 mt-2">
                {attention?.pending_handoffs?.length || 0}
              </p>
              <span className="text-[11px] text-slate-500 mt-1 block">Awaiting your sign-off</span>
            </div>

            <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5">
              <span className="text-xs font-medium text-slate-400">Active Blockers</span>
              <p className="text-3xl font-bold text-red-400 mt-2">
                {attention?.open_blockers?.length || 0}
              </p>
              <span className="text-[11px] text-slate-500 mt-1 block">Impacting your projects</span>
            </div>

            <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5">
              <span className="text-xs font-medium text-slate-400">Unread @Mentions</span>
              <p className="text-3xl font-bold text-indigo-400 mt-2">
                {attention?.unread_mentions?.length || 0}
              </p>
              <span className="text-[11px] text-slate-500 mt-1 block">Team direct callouts</span>
            </div>

            <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5">
              <span className="text-xs font-medium text-slate-400">Urgent Help Requests</span>
              <p className="text-3xl font-bold text-purple-400 mt-2">
                {attention?.urgent_help_requests?.length || 0}
              </p>
              <span className="text-[11px] text-slate-500 mt-1 block">Triage / assistance needed</span>
            </div>
          </div>

          {/* Section 1: Pending Work Handoffs */}
          <div className="space-y-4">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-amber-400" />
              Work Handoffs Assigned to You
            </h2>

            {(!attention?.pending_handoffs || attention.pending_handoffs.length === 0) ? (
              <div className="bg-slate-900/30 border border-slate-800/80 rounded-xl p-6 text-center text-slate-400 text-xs">
                No pending handoffs. You are completely caught up!
              </div>
            ) : (
              <div className="grid gap-3">
                {attention.pending_handoffs.map((h) => (
                  <div
                    key={h.id}
                    className="bg-slate-900/60 border border-amber-500/30 rounded-xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-4"
                  >
                    <div>
                      <h4 className="font-semibold text-slate-200">{h.title}</h4>
                      <p className="text-xs text-slate-400 mt-1">{h.description}</p>
                      <span className="text-[11px] text-slate-500 mt-2 block">
                        From: {h.from_member_name || 'Studio Colleague'} • Received{' '}
                        {new Date(h.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 self-end md:self-center">
                      <Link
                        href={`/dashboard/team/threads/${h.thread_id}`}
                        className="px-3 py-1.5 text-xs font-semibold bg-slate-800 text-slate-300 rounded-lg hover:bg-slate-700 transition-colors"
                      >
                        View Thread
                      </Link>
                      <button
                        onClick={() => handleAcceptHandoff(h.id)}
                        className="px-3 py-1.5 text-xs font-semibold bg-amber-600 hover:bg-amber-500 text-white rounded-lg transition-colors shadow-sm"
                      >
                        Accept Handoff
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Section 2: Unread Mentions */}
          <div className="space-y-4">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-indigo-400" />
              Unread Team Mentions (@)
            </h2>

            {(!attention?.unread_mentions || attention.unread_mentions.length === 0) ? (
              <div className="bg-slate-900/30 border border-slate-800/80 rounded-xl p-6 text-center text-slate-400 text-xs">
                No unread mentions.
              </div>
            ) : (
              <div className="grid gap-3">
                {attention.unread_mentions.map((m) => (
                  <Link
                    key={m.id}
                    href={`/dashboard/team/threads/${m.thread_id}`}
                    className="block bg-slate-900/60 hover:bg-slate-900 border border-indigo-500/20 hover:border-indigo-500/40 rounded-xl p-4 transition-all"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-indigo-400">
                        {m.author_name || 'Teammate'} mentioned you:
                      </span>
                      <span className="text-[11px] text-slate-500">
                        {new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    <p className="text-xs text-slate-300 mt-1.5 italic bg-slate-950/60 p-2.5 rounded-lg border border-slate-800/60">
                      "{m.content}"
                    </p>
                  </Link>
                ))}
              </div>
            )}
          </div>

          {/* Section 3: Active Blockers */}
          <div className="space-y-4">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-red-400" />
              Critical & High Severity Blockers
            </h2>

            {(!attention?.open_blockers || attention.open_blockers.length === 0) ? (
              <div className="bg-slate-900/30 border border-slate-800/80 rounded-xl p-6 text-center text-slate-400 text-xs">
                No active blockers reported.
              </div>
            ) : (
              <div className="grid gap-3">
                {attention.open_blockers.map((b) => (
                  <div
                    key={b.id}
                    className="bg-red-950/20 border border-red-900/40 rounded-xl p-4 flex items-center justify-between gap-4"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-red-500 text-white">
                          {b.severity}
                        </span>
                        <h4 className="font-semibold text-red-200">{b.title}</h4>
                      </div>
                      <span className="text-[11px] text-slate-400 mt-1 block">
                        Reported by {b.reporter_name || 'Team Member'}
                      </span>
                    </div>

                    <Link
                      href={`/dashboard/team/threads/${b.thread_id}`}
                      className="px-3 py-1.5 text-xs font-semibold bg-red-900/40 hover:bg-red-900/60 text-red-200 rounded-lg transition-colors border border-red-800/50"
                    >
                      Resolve in Thread
                    </Link>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
