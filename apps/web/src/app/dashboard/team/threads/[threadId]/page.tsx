'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { fetchApi } from '@/lib/api-client';

interface Message {
  id: string;
  author_member_id: string;
  author_name?: string;
  message_type: string;
  content: string;
  parent_message_id?: string;
  is_edited: boolean;
  is_deleted: boolean;
  created_at: string;
  acknowledgements_count?: number;
  has_acknowledged?: boolean;
}

interface ThreadDetail {
  id: string;
  studio_id: string;
  title: string;
  type: string;
  status: string;
  priority: string;
  project_id?: string;
  task_id?: string;
  shoot_session_id?: string;
  client_id?: string;
  created_by_member_id: string;
  created_by_name?: string;
  message_count: number;
  created_at: string;
}

export default function ThreadDetailPage() {
  const params = useParams();
  const threadId = params?.threadId as string;

  const [thread, setThread] = useState<ThreadDetail | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [replyText, setReplyText] = useState('');
  const [messageType, setMessageType] = useState('DISCUSSION');
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const loadData = async () => {
    if (!threadId) return;
    setLoading(true);
    try {
      const [threadRes, messagesRes] = await Promise.all([
        fetchApi<any>(`/v1/team/collaboration/threads/${threadId}`),
        fetchApi<any>(`/v1/team/collaboration/threads/${threadId}/messages`),
      ]);

      const threadData = (threadRes as any)?.data || threadRes;
      const messagesData = (messagesRes as any)?.data || messagesRes;

      if (threadData) {
        setThread(threadData.thread || threadData);
      }
      if (messagesData) {
        setMessages(messagesData.messages || (Array.isArray(messagesData) ? messagesData : []));
      }
    } catch (err) {
      console.error('Failed to load thread data', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [threadId]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!replyText.trim()) return;

    setSubmitting(true);
    setErrorMsg('');

    try {
      const res = await fetchApi<any>(`/v1/team/collaboration/threads/${threadId}/messages`, {
        method: 'POST',
        body: JSON.stringify({
          content: replyText.trim(),
          message_type: messageType,
        }),
      });

      if (res?.success || (res as any)?.id) {
        setReplyText('');
        loadData();
      } else {
        setErrorMsg(res?.error?.message || 'Failed to send message');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'An error occurred');
    } finally {
      setSubmitting(false);
    }
  };

  const handleAcknowledge = async (messageId: string) => {
    try {
      await fetchApi<any>(`/v1/team/collaboration/messages/${messageId}/acknowledge`, {
        method: 'POST',
      });
      loadData();
    } catch (err) {
      console.error('Failed to acknowledge message', err);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-6 md:p-8">
      {/* Header */}
      <div className="border-b border-slate-800 pb-6 mb-6">
        <div className="flex items-center gap-3 text-xs text-slate-400 mb-2">
          <Link href="/dashboard/team/collaboration" className="hover:text-slate-200">
            ← Back to Threads
          </Link>
          <span>/</span>
          <span>{thread?.type.replace(/_/g, ' ') || 'Thread'}</span>
        </div>

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span
              className={`px-2.5 py-0.5 rounded text-xs font-bold uppercase ${
                thread?.priority === 'URGENT'
                  ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                  : 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30'
              }`}
            >
              {thread?.priority || 'NORMAL'}
            </span>
            <h1 className="text-xl md:text-2xl font-bold text-white">{thread?.title}</h1>
          </div>

          <div className="flex items-center gap-2">
            <span
              className={`text-xs px-2.5 py-1 rounded-full font-medium ${
                thread?.status === 'OPEN'
                  ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                  : 'bg-slate-800 text-slate-400'
              }`}
            >
              {thread?.status}
            </span>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center p-16">
          <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Main Message Stream */}
          <div className="lg:col-span-3 space-y-4">
            <div className="space-y-3">
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`p-4 rounded-xl border ${
                    msg.message_type === 'BLOCKER'
                      ? 'bg-red-950/20 border-red-900/40'
                      : msg.message_type === 'INTERNAL_NOTE'
                      ? 'bg-amber-950/20 border-amber-900/30'
                      : msg.message_type === 'DECISION'
                      ? 'bg-emerald-950/20 border-emerald-900/30'
                      : 'bg-slate-900/60 border-slate-800/80'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-slate-800 flex items-center justify-center text-xs font-bold text-slate-300">
                        {(msg.author_name || 'U')[0]}
                      </div>
                      <span className="text-xs font-semibold text-slate-200">
                        {msg.author_name || 'Team Member'}
                      </span>
                      <span className="text-[10px] px-2 py-0.5 rounded font-mono uppercase bg-slate-950/60 text-slate-400 border border-slate-800">
                        {msg.message_type}
                      </span>
                    </div>

                    <span className="text-[11px] text-slate-500">
                      {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>

                  <p className="text-sm text-slate-300 leading-relaxed whitespace-pre-wrap">
                    {msg.content}
                  </p>

                  <div className="flex items-center gap-3 mt-3 pt-2 border-t border-slate-800/50">
                    <button
                      onClick={() => handleAcknowledge(msg.id)}
                      className="text-xs text-slate-400 hover:text-indigo-400 flex items-center gap-1 transition-colors"
                    >
                      <span>👍</span>
                      <span>Acknowledge</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Message Composer */}
            <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 mt-6">
              {errorMsg && (
                <div className="mb-3 p-2.5 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-xs">
                  {errorMsg}
                </div>
              )}

              <form onSubmit={handleSendMessage} className="space-y-3">
                <div className="flex items-center gap-3">
                  <span className="text-xs text-slate-400">Post as:</span>
                  <select
                    value={messageType}
                    onChange={(e) => setMessageType(e.target.value)}
                    className="px-2.5 py-1 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-300 focus:outline-none focus:border-indigo-500"
                  >
                    <option value="DISCUSSION">Discussion</option>
                    <option value="INTERNAL_NOTE">Internal Note</option>
                    <option value="DECISION">Studio Decision</option>
                    <option value="HANDOFF">Work Handoff</option>
                    <option value="BLOCKER">Report Blocker</option>
                    <option value="HELP_REQUEST">Help Request</option>
                  </select>
                </div>

                <textarea
                  rows={3}
                  placeholder="Add to thread... use @ to mention teammates"
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-sm text-slate-200 focus:outline-none focus:border-indigo-500"
                />

                <div className="flex items-center justify-between pt-1">
                  <span className="text-[11px] text-slate-500">
                    Internal only • Hidden from client portals
                  </span>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="px-4 py-2 text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg transition-colors disabled:opacity-50"
                  >
                    {submitting ? 'Posting...' : 'Post Message'}
                  </button>
                </div>
              </form>
            </div>
          </div>

          {/* Context Sidebar */}
          <div className="space-y-4">
            <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-4">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">
                Thread Details
              </h3>
              <div className="space-y-2 text-xs">
                <div className="flex justify-between py-1 border-b border-slate-800/60">
                  <span className="text-slate-500">Type</span>
                  <span className="text-slate-300 font-mono">{thread?.type}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-800/60">
                  <span className="text-slate-500">Priority</span>
                  <span className="text-slate-300">{thread?.priority}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-800/60">
                  <span className="text-slate-500">Status</span>
                  <span className="text-slate-300">{thread?.status}</span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-slate-500">Messages</span>
                  <span className="text-slate-300">{messages.length}</span>
                </div>
              </div>
            </div>

            <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-4">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                Security & Isolation
              </h3>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                This collaboration thread is strictly internal to studio staff. Zero data is shared with clients, public galleries, or downloads.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
