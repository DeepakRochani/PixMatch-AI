'use client';

import React, { useState, useEffect, use } from 'react';
import { fetchApi } from '@/lib/api-client';
import {
  MessageSquare,
  Send,
  Paperclip,
  Clock,
  Download,
  AlertCircle,
  CheckCircle2,
  Plus,
  RefreshCw,
} from 'lucide-react';
import { IClientConversation, IClientMessage } from '@pixmatch/types';

export default function ClientPortalMessagesPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const resolvedParams = use(params);
  const token = resolvedParams.token;

  const [conversations, setConversations] = useState<IClientConversation[]>([]);
  const [selectedConv, setSelectedConv] = useState<IClientConversation | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [messageBody, setMessageBody] = useState('');
  const [sending, setSending] = useState(false);

  // New inquiry modal
  const [showNewInquiry, setShowNewInquiry] = useState(false);
  const [newSubject, setNewSubject] = useState('');
  const [newCategory, setNewCategory] = useState('GENERAL');
  const [newBody, setNewBody] = useState('');

  const loadConversations = async (keepSelected = true) => {
    try {
      setLoading(true);
      const res = await fetchApi<IClientConversation[]>(
        `/v1/public/client-portal/${token}/messages`
      );

      if (res.success && res.data) {
        const items = res.data;
        setConversations(items);
        if (items.length > 0) {
          if (keepSelected && selectedConv) {
            const cur = items.find((c) => c.id === selectedConv.id);
            if (cur) loadConversationDetail(cur.id);
            else loadConversationDetail(items[0].id);
          } else {
            loadConversationDetail(items[0].id);
          }
        }
      } else {
        setError(res.error?.message || 'Failed to load messages.');
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const loadConversationDetail = async (id: string) => {
    try {
      const res = await fetchApi<IClientConversation>(
        `/v1/public/client-portal/${token}/messages/${id}`
      );
      if (res.success && res.data) {
        setSelectedConv(res.data);
      }
    } catch {
      // Non-blocking
    }
  };

  useEffect(() => {
    loadConversations(false);
  }, [token]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedConv || !messageBody.trim() || sending) return;

    try {
      setSending(true);
      const res = await fetchApi<IClientMessage>(
        `/v1/public/client-portal/${token}/messages`,
        {
          method: 'POST',
          body: JSON.stringify({
            conversation_id: selectedConv.id,
            body: messageBody.trim(),
          }),
        }
      );

      if (res.success) {
        setMessageBody('');
        await loadConversationDetail(selectedConv.id);
      }
    } catch {
      // Non-blocking
    } finally {
      setSending(false);
    }
  };

  const handleCreateInquiry = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSubject.trim() || !newBody.trim() || sending) return;

    try {
      setSending(true);
      const res = await fetchApi<IClientMessage>(
        `/v1/public/client-portal/${token}/messages`,
        {
          method: 'POST',
          body: JSON.stringify({
            subject: newSubject.trim(),
            category: newCategory,
            body: newBody.trim(),
          }),
        }
      );

      if (res.success) {
        setShowNewInquiry(false);
        setNewSubject('');
        setNewBody('');
        await loadConversations(false);
      }
    } catch {
      // Non-blocking
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-900/60 backdrop-blur border border-slate-800 p-6 rounded-2xl">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-indigo-500/10 text-indigo-400 rounded-xl">
            <MessageSquare className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white tracking-tight">Studio Messages</h1>
            <p className="text-xs text-slate-400">
              Direct, private communication with your photography studio team
            </p>
          </div>
        </div>

        <button
          onClick={() => setShowNewInquiry(true)}
          className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold flex items-center gap-1.5 transition shadow-lg shadow-indigo-600/20"
        >
          <Plus className="h-4 w-4" />
          New Message / Inquiry
        </button>
      </div>

      {/* Main 2-Column Portal Messenger */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[600px]">
        {/* Left: Threads */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl flex flex-col overflow-hidden">
          <div className="p-4 border-b border-slate-800 flex items-center justify-between">
            <h3 className="font-bold text-xs text-slate-300 uppercase tracking-wider">Your Conversations</h3>
            <button
              onClick={() => loadConversations(true)}
              className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition"
              title="Refresh"
            >
              <RefreshCw className="h-3.5 w-3.5" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto divide-y divide-slate-800/60">
            {loading ? (
              <div className="p-8 text-center text-xs text-slate-500">Loading messages...</div>
            ) : conversations.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-500">No conversations yet.</div>
            ) : (
              conversations.map((conv) => {
                const isSelected = selectedConv?.id === conv.id;
                return (
                  <div
                    key={conv.id}
                    onClick={() => loadConversationDetail(conv.id)}
                    className={`p-4 cursor-pointer transition ${
                      isSelected
                        ? 'bg-indigo-600/10 border-l-4 border-l-indigo-500'
                        : 'hover:bg-slate-800/40'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <h4 className="font-bold text-xs text-white line-clamp-1">{conv.subject}</h4>
                      <span className="text-[10px] text-slate-500 whitespace-nowrap">
                        {conv.last_message_at
                          ? new Date(conv.last_message_at).toLocaleDateString()
                          : new Date(conv.created_at).toLocaleDateString()}
                      </span>
                    </div>

                    <p className="text-[11px] text-slate-400 line-clamp-2 mt-1">
                      {conv.last_message_preview || 'No messages.'}
                    </p>

                    <div className="flex items-center gap-2 mt-2">
                      <span className="px-2 py-0.5 rounded text-[9px] font-semibold uppercase bg-slate-800 text-slate-400">
                        {conv.category}
                      </span>
                      {conv.status === 'RESOLVED' && (
                        <span className="px-2 py-0.5 rounded text-[9px] font-semibold bg-emerald-500/20 text-emerald-400">
                          Resolved
                        </span>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right: Messages Stream & Composer */}
        <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-2xl flex flex-col overflow-hidden">
          {selectedConv ? (
            <>
              {/* Thread Header */}
              <div className="p-4 border-b border-slate-800 bg-slate-950/40 flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-sm text-white">{selectedConv.subject}</h3>
                  <p className="text-xs text-slate-400">Category: {selectedConv.category}</p>
                </div>
                <span className="text-xs px-2.5 py-1 rounded-full bg-slate-800 text-slate-300 font-medium">
                  {selectedConv.status}
                </span>
              </div>

              {/* Messages Feed */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {selectedConv.messages && selectedConv.messages.length > 0 ? (
                  selectedConv.messages.map((msg) => {
                    const isClient = msg.sender_type === 'CLIENT';
                    return (
                      <div
                        key={msg.id}
                        className={`flex gap-3 max-w-lg ${isClient ? 'ml-auto flex-row-reverse' : ''}`}
                      >
                        <div
                          className={`h-7 w-7 rounded-full flex items-center justify-center font-bold text-xs flex-shrink-0 ${
                            isClient ? 'bg-indigo-600 text-white' : 'bg-slate-800 text-slate-300'
                          }`}
                        >
                          {msg.sender_name.charAt(0)}
                        </div>

                        <div className={`space-y-1 ${isClient ? 'items-end' : ''}`}>
                          <div className="flex items-center gap-2 text-[10px] text-slate-500">
                            <span className="font-semibold text-slate-300">{msg.sender_name}</span>
                            <span>{new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                          </div>

                          <div
                            className={`p-3 rounded-2xl text-xs leading-relaxed ${
                              isClient
                                ? 'bg-indigo-600 text-white rounded-tr-none'
                                : 'bg-slate-800 text-slate-200 rounded-tl-none border border-slate-700/50'
                            }`}
                          >
                            <p className="whitespace-pre-wrap">{msg.body}</p>

                            {msg.attachments && msg.attachments.length > 0 && (
                              <div className="mt-2 pt-2 border-t border-white/10 space-y-1">
                                {msg.attachments.map((att) => (
                                  <a
                                    key={att.id}
                                    href={`/api/v1/communication/attachments/${att.id}/download`}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="flex items-center gap-2 p-1.5 rounded bg-black/20 text-[10px] font-medium"
                                  >
                                    <Paperclip className="h-3 w-3" />
                                    <span className="line-clamp-1">{att.file_name}</span>
                                    <Download className="h-3 w-3 ml-auto opacity-70" />
                                  </a>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="text-center text-xs text-slate-500 py-12">No messages yet.</div>
                )}
              </div>

              {/* Composer */}
              <form onSubmit={handleSendMessage} className="p-3 border-t border-slate-800 bg-slate-950/60 flex gap-2">
                <input
                  type="text"
                  value={messageBody}
                  onChange={(e) => setMessageBody(e.target.value)}
                  placeholder="Type a message to your studio..."
                  className="flex-1 p-2.5 rounded-xl bg-slate-900 border border-slate-800 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-indigo-500"
                />
                <button
                  type="submit"
                  disabled={sending || !messageBody.trim()}
                  className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold flex items-center gap-1.5 transition disabled:opacity-50"
                >
                  <Send className="h-3.5 w-3.5" />
                  {sending ? 'Sending...' : 'Send'}
                </button>
              </form>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
              <MessageSquare className="h-10 w-10 text-slate-600 mb-2" />
              <h3 className="font-semibold text-white text-sm">Select a conversation</h3>
              <p className="text-xs text-slate-500 mt-1">Choose a conversation from the left to view messages</p>
            </div>
          )}
        </div>
      </div>

      {/* New Inquiry Modal */}
      {showNewInquiry && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <h3 className="font-bold text-sm text-white">Start New Inquiry / Message Thread</h3>
            <form onSubmit={handleCreateInquiry} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">Subject</label>
                <input
                  type="text"
                  value={newSubject}
                  onChange={(e) => setNewSubject(e.target.value)}
                  placeholder="Question about wedding gallery selections"
                  className="w-full p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-indigo-500"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">Category</label>
                <select
                  value={newCategory}
                  onChange={(e) => setNewCategory(e.target.value)}
                  className="w-full p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-indigo-500"
                >
                  <option value="GENERAL">General</option>
                  <option value="BOOKING">Booking & Dates</option>
                  <option value="PROOFING">Proofing & Photos</option>
                  <option value="ORDER">Prints & Orders</option>
                  <option value="SUPPORT">Support</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">Message</label>
                <textarea
                  rows={4}
                  value={newBody}
                  onChange={(e) => setNewBody(e.target.value)}
                  placeholder="Hi team, I had a question regarding..."
                  className="w-full p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-indigo-500 resize-none"
                  required
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowNewInquiry(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-xs text-slate-300 hover:text-white transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={sending}
                  className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold transition disabled:opacity-50"
                >
                  {sending ? 'Sending...' : 'Send Message'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
