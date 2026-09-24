'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import {
  MessageSquare,
  Search,
  Plus,
  Send,
  Paperclip,
  Bookmark,
  FileText,
  Star,
  CheckCircle2,
  Clock,
  AlertCircle,
  User,
  Building,
  Mail,
  Phone,
  FolderKanban,
  Images,
  ShoppingBag,
  Tag,
  Shield,
  RefreshCw,
  X,
  Lock,
  Download,
  ExternalLink,
  ChevronDown,
} from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import {
  IClientConversation,
  IClientMessage,
  ICommunicationAnalyticsDTO,
  IClientSavedReply,
  IClientMessageTemplate,
} from '@pixmatch/types';

export default function CommunicationsDashboardPage() {
  const { token, studio } = useAuth();
  const [loading, setLoading] = useState(true);
  const [conversations, setConversations] = useState<IClientConversation[]>([]);
  const [selectedConv, setSelectedConv] = useState<IClientConversation | null>(null);
  const [analytics, setAnalytics] = useState<ICommunicationAnalyticsDTO | null>(null);
  const [savedReplies, setSavedReplies] = useState<IClientSavedReply[]>([]);
  const [templates, setTemplates] = useState<IClientMessageTemplate[]>([]);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [categoryFilter, setCategoryFilter] = useState('ALL');

  // Composer
  const [messageBody, setMessageBody] = useState('');
  const [isInternalNote, setIsInternalNote] = useState(false);
  const [sending, setSending] = useState(false);
  const [showSavedRepliesDropdown, setShowSavedRepliesDropdown] = useState(false);
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [showNewConvModal, setShowNewConvModal] = useState(false);

  // New Conversation Modal State
  const [newClientEmail, setNewClientEmail] = useState('');
  const [newSubject, setNewSubject] = useState('');
  const [newCategory, setNewCategory] = useState('GENERAL');
  const [newInitialBody, setNewInitialBody] = useState('');

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const fetchAnalytics = async () => {
    try {
      const res = await fetch('/api/v1/communication/analytics', {
        headers: {
          Authorization: `Bearer ${token}`,
          'x-studio-id': studio?.id || '',
        },
      });
      if (res.ok) {
        const json = await res.json();
        setAnalytics(json.data);
      }
    } catch {
      // Non-blocking
    }
  };

  const fetchSavedRepliesAndTemplates = async () => {
    try {
      const [rRes, tRes] = await Promise.all([
        fetch('/api/v1/communication/saved-replies', {
          headers: { Authorization: `Bearer ${token}`, 'x-studio-id': studio?.id || '' },
        }),
        fetch('/api/v1/communication/templates', {
          headers: { Authorization: `Bearer ${token}`, 'x-studio-id': studio?.id || '' },
        }),
      ]);
      if (rRes.ok) {
        const json = await rRes.json();
        setSavedReplies(json.data.items || []);
      }
      if (tRes.ok) {
        const json = await tRes.json();
        setTemplates(json.data.items || []);
      }
    } catch {
      // Non-blocking
    }
  };

  const fetchConversations = async (keepSelected = true) => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (searchQuery) params.append('search', searchQuery);
      if (statusFilter !== 'ALL') params.append('status', statusFilter);
      if (categoryFilter !== 'ALL') params.append('category', categoryFilter);

      const res = await fetch(`/api/v1/communication/conversations?${params.toString()}`, {
        headers: {
          Authorization: `Bearer ${token}`,
          'x-studio-id': studio?.id || '',
        },
      });

      if (res.ok) {
        const json = await res.json();
        const items = json.data.items || [];
        setConversations(items);

        if (items.length > 0) {
          if (keepSelected && selectedConv) {
            const updated = items.find((c: IClientConversation) => c.id === selectedConv.id);
            if (updated) {
              fetchConversationDetail(updated.id);
            } else {
              fetchConversationDetail(items[0].id);
            }
          } else {
            fetchConversationDetail(items[0].id);
          }
        } else {
          setSelectedConv(null);
        }
      }
    } catch {
      // Handle error
    } finally {
      setLoading(false);
    }
  };

  const fetchConversationDetail = async (id: string) => {
    try {
      const res = await fetch(`/api/v1/communication/conversations/${id}`, {
        headers: {
          Authorization: `Bearer ${token}`,
          'x-studio-id': studio?.id || '',
        },
      });
      if (res.ok) {
        const json = await res.json();
        setSelectedConv(json.data);
      }
    } catch {
      // Non-blocking
    }
  };

  useEffect(() => {
    if (token && studio?.id) {
      fetchAnalytics();
      fetchSavedRepliesAndTemplates();
      fetchConversations(false);
    }
  }, [token, studio?.id, statusFilter, categoryFilter]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [selectedConv?.messages]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedConv || !messageBody.trim() || sending) return;

    try {
      setSending(true);
      const res = await fetch(`/api/v1/communication/conversations/${selectedConv.id}/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
          'x-studio-id': studio?.id || '',
        },
        body: JSON.stringify({
          body: messageBody.trim(),
          is_internal_note: isInternalNote,
        }),
      });

      if (res.ok) {
        setMessageBody('');
        setIsInternalNote(false);
        await fetchConversationDetail(selectedConv.id);
        fetchAnalytics();
      }
    } catch {
      // Error handling
    } finally {
      setSending(false);
    }
  };

  const handleResolveConversation = async () => {
    if (!selectedConv) return;
    try {
      const res = await fetch(`/api/v1/communication/conversations/${selectedConv.id}/resolve`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'x-studio-id': studio?.id || '',
        },
      });
      if (res.ok) {
        fetchConversationDetail(selectedConv.id);
        fetchConversations(true);
        fetchAnalytics();
      }
    } catch {
      // Non-blocking
    }
  };

  const handleApplyTemplate = async (templateId: string) => {
    if (!selectedConv) return;
    try {
      const res = await fetch(`/api/v1/communication/templates/${templateId}/apply`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
          'x-studio-id': studio?.id || '',
        },
        body: JSON.stringify({
          clientName: selectedConv.client?.name || '',
          projectName: selectedConv.project?.name || '',
          galleryName: selectedConv.gallery?.title || '',
          orderNumber: selectedConv.order?.order_number || '',
          studioName: studio?.name || '',
          deliveryStatus: selectedConv.order?.status || '',
        }),
      });

      if (res.ok) {
        const json = await res.json();
        setMessageBody((prev) => (prev ? `${prev}\n\n${json.data.body}` : json.data.body));
        setShowTemplateModal(false);
      }
    } catch {
      // Non-blocking
    }
  };

  const handleApplySavedReply = (reply: IClientSavedReply) => {
    setMessageBody((prev) => (prev ? `${prev}\n\n${reply.content}` : reply.content));
    setShowSavedRepliesDropdown(false);
  };

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] overflow-hidden bg-background text-foreground">
      {/* Top Action & Analytics Bar */}
      <div className="p-4 border-b border-card-border bg-card/60 backdrop-blur flex flex-wrap items-center justify-between gap-4 flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-primary/10 text-primary rounded-xl">
            <MessageSquare className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
              Client Communication Center
              <span className="text-xs font-normal px-2 py-0.5 rounded-full bg-primary/20 text-primary border border-primary/30">
                Phase 28
              </span>
            </h1>
            <p className="text-xs text-muted">
              Multi-channel relationship hub connecting Clients, Projects, Galleries, and Orders
            </p>
          </div>
        </div>

        {/* Analytics Pills */}
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-card border border-card-border text-xs">
            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-muted">Open Threads:</span>
            <span className="font-semibold text-white">{analytics?.open_conversations || 0}</span>
          </div>

          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-card border border-card-border text-xs">
            <AlertCircle className="h-3.5 w-3.5 text-amber-400" />
            <span className="text-muted">Unanswered:</span>
            <span className="font-semibold text-amber-400">{analytics?.unanswered_conversations_count || 0}</span>
          </div>

          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-card border border-card-border text-xs">
            <Clock className="h-3.5 w-3.5 text-blue-400" />
            <span className="text-muted">Avg Response:</span>
            <span className="font-semibold text-white">{analytics?.avg_first_response_time_minutes || 0}m</span>
          </div>

          <div className="flex items-center gap-2">
            <Link
              href="/dashboard/communications/saved-replies"
              className="px-3 py-1.5 rounded-lg bg-card hover:bg-card-hover border border-card-border text-xs font-medium text-muted hover:text-white transition flex items-center gap-1.5"
            >
              <Bookmark className="h-3.5 w-3.5" />
              Saved Replies
            </Link>
            <Link
              href="/dashboard/communications/templates"
              className="px-3 py-1.5 rounded-lg bg-card hover:bg-card-hover border border-card-border text-xs font-medium text-muted hover:text-white transition flex items-center gap-1.5"
            >
              <FileText className="h-3.5 w-3.5" />
              Templates
            </Link>
            <button
              onClick={() => fetchConversations(true)}
              className="p-1.5 rounded-lg bg-card hover:bg-card-hover border border-card-border text-muted hover:text-white transition"
              title="Refresh conversations"
            >
              <RefreshCw className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      {/* 3-Column Layout */}
      <div className="flex-1 flex overflow-hidden">
        {/* LEFT COLUMN: Thread List */}
        <div className="w-80 md:w-96 border-r border-card-border bg-card/30 flex flex-col flex-shrink-0">
          {/* Search & Filters */}
          <div className="p-3 border-b border-card-border space-y-2.5">
            <div className="relative">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && fetchConversations(false)}
                placeholder="Search threads, clients, orders..."
                className="w-full pl-9 pr-3 py-1.5 rounded-lg bg-card border border-card-border text-xs text-white placeholder:text-muted/60 focus:outline-none focus:border-primary"
              />
            </div>

            {/* Status Filter Tabs */}
            <div className="flex items-center gap-1 bg-card/60 p-1 rounded-lg border border-card-border text-xs">
              {['ALL', 'OPEN', 'PENDING_STUDIO', 'RESOLVED'].map((st) => (
                <button
                  key={st}
                  onClick={() => setStatusFilter(st)}
                  className={`flex-1 py-1 px-2 rounded-md font-medium text-[11px] transition ${
                    statusFilter === st
                      ? 'bg-primary text-white shadow-sm'
                      : 'text-muted hover:text-white'
                  }`}
                >
                  {st === 'ALL' ? 'All' : st === 'OPEN' ? 'Open' : st === 'PENDING_STUDIO' ? 'Needs Reply' : 'Resolved'}
                </button>
              ))}
            </div>
          </div>

          {/* Conversation Cards List */}
          <div className="flex-1 overflow-y-auto divide-y divide-card-border/50">
            {loading ? (
              <div className="p-8 text-center text-xs text-muted">Loading conversations...</div>
            ) : conversations.length === 0 ? (
              <div className="p-8 text-center text-xs text-muted">No conversations found.</div>
            ) : (
              conversations.map((conv) => {
                const isSelected = selectedConv?.id === conv.id;
                const hasUnread = conv.unread_studio_count > 0;
                return (
                  <div
                    key={conv.id}
                    onClick={() => fetchConversationDetail(conv.id)}
                    className={`p-3.5 cursor-pointer transition relative hover:bg-card-hover/40 ${
                      isSelected ? 'bg-primary/10 border-l-4 border-l-primary' : ''
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <div className="h-7 w-7 rounded-full bg-gradient-to-tr from-primary/30 to-accent/30 text-primary flex items-center justify-center font-bold text-xs">
                          {conv.client?.name?.charAt(0) || 'C'}
                        </div>
                        <span className="font-semibold text-xs text-white line-clamp-1">
                          {conv.client?.name || 'Client'}
                        </span>
                      </div>
                      <span className="text-[10px] text-muted whitespace-nowrap">
                        {conv.last_message_at
                          ? new Date(conv.last_message_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                          : new Date(conv.created_at).toLocaleDateString()}
                      </span>
                    </div>

                    <h4 className="font-medium text-xs text-white/90 mt-1 line-clamp-1">{conv.subject}</h4>
                    <p className="text-[11px] text-muted line-clamp-1 mt-0.5">
                      {conv.last_message_preview || 'No messages yet.'}
                    </p>

                    <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                      <span className="px-1.5 py-0.5 rounded text-[9px] font-semibold uppercase tracking-wider bg-card border border-card-border text-muted">
                        {conv.category}
                      </span>

                      {conv.priority === 'URGENT' && (
                        <span className="px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider bg-red-500/20 text-red-400 border border-red-500/30">
                          Urgent
                        </span>
                      )}

                      {hasUnread && (
                        <span className="ml-auto px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-primary text-white">
                          {conv.unread_studio_count} new
                        </span>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* MIDDLE COLUMN: Message Stream & Composer */}
        <div className="flex-1 flex flex-col bg-background/50 overflow-hidden">
          {selectedConv ? (
            <>
              {/* Thread Header */}
              <div className="p-3.5 border-b border-card-border bg-card/40 flex items-center justify-between gap-4 flex-shrink-0">
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="font-bold text-sm text-white">{selectedConv.subject}</h2>
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wider ${
                        selectedConv.status === 'RESOLVED'
                          ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                          : 'bg-primary/20 text-primary border border-primary/30'
                      }`}
                    >
                      {selectedConv.status}
                    </span>
                  </div>
                  <p className="text-xs text-muted mt-0.5">
                    Client: <span className="text-white font-medium">{selectedConv.client?.name}</span> ({selectedConv.client?.email})
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  {selectedConv.status !== 'RESOLVED' && (
                    <button
                      onClick={handleResolveConversation}
                      className="px-3 py-1.5 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 text-xs font-semibold flex items-center gap-1.5 transition"
                    >
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      Resolve Thread
                    </button>
                  )}
                </div>
              </div>

              {/* Message Feed */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {selectedConv.messages && selectedConv.messages.length > 0 ? (
                  selectedConv.messages.map((msg) => {
                    const isStudio = msg.sender_type === 'STUDIO_USER';
                    const isNote = msg.is_internal_note;

                    if (isNote) {
                      return (
                        <div
                          key={msg.id}
                          className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-xs text-amber-200/90 max-w-2xl mx-auto shadow-sm"
                        >
                          <div className="flex items-center justify-between border-b border-amber-500/20 pb-1.5 mb-2">
                            <span className="font-bold flex items-center gap-1.5 text-amber-300">
                              <Lock className="h-3.5 w-3.5" />
                              Internal Studio Note
                            </span>
                            <span className="text-[10px] text-amber-300/70">
                              {new Date(msg.created_at).toLocaleString()} • by {msg.sender_name}
                            </span>
                          </div>
                          <p className="whitespace-pre-wrap">{msg.body}</p>
                        </div>
                      );
                    }

                    return (
                      <div
                        key={msg.id}
                        className={`flex gap-3 max-w-xl ${isStudio ? 'ml-auto flex-row-reverse' : ''}`}
                      >
                        <div
                          className={`h-8 w-8 rounded-full flex items-center justify-center font-bold text-xs flex-shrink-0 ${
                            isStudio
                              ? 'bg-primary text-white'
                              : 'bg-gradient-to-tr from-accent to-purple-600 text-white'
                          }`}
                        >
                          {msg.sender_name.charAt(0)}
                        </div>

                        <div className={`space-y-1 ${isStudio ? 'items-end' : ''}`}>
                          <div className="flex items-center gap-2 text-[11px] text-muted">
                            <span className="font-semibold text-white/90">{msg.sender_name}</span>
                            <span>{new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                          </div>

                          <div
                            className={`p-3 rounded-2xl text-xs leading-relaxed ${
                              isStudio
                                ? 'bg-primary text-white rounded-tr-none'
                                : 'bg-card border border-card-border text-white/90 rounded-tl-none'
                            }`}
                          >
                            <p className="whitespace-pre-wrap">{msg.body}</p>

                            {/* Attachments */}
                            {msg.attachments && msg.attachments.length > 0 && (
                              <div className="mt-2.5 pt-2 border-t border-white/10 space-y-1.5">
                                {msg.attachments.map((att) => (
                                  <a
                                    key={att.id}
                                    href={`/api/v1/communication/attachments/${att.id}/download`}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="flex items-center gap-2 p-1.5 rounded-lg bg-black/20 hover:bg-black/40 text-[11px] font-medium transition"
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
                  <div className="text-center text-xs text-muted py-12">No messages in this conversation yet.</div>
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Composer */}
              <div className="p-3 border-t border-card-border bg-card/60 flex-shrink-0 space-y-2">
                {/* Mode Selector & Quick Tools */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1 bg-background/50 p-0.5 rounded-lg border border-card-border text-xs">
                    <button
                      type="button"
                      onClick={() => setIsInternalNote(false)}
                      className={`px-3 py-1 rounded-md text-xs font-semibold transition ${
                        !isInternalNote ? 'bg-primary text-white' : 'text-muted hover:text-white'
                      }`}
                    >
                      Reply to Client
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsInternalNote(true)}
                      className={`px-3 py-1 rounded-md text-xs font-semibold flex items-center gap-1 transition ${
                        isInternalNote ? 'bg-amber-500 text-black' : 'text-amber-400 hover:text-amber-300'
                      }`}
                    >
                      <Lock className="h-3 w-3" />
                      Internal Note
                    </button>
                  </div>

                  <div className="flex items-center gap-2">
                    {/* Saved Replies Dropdown Trigger */}
                    <div className="relative">
                      <button
                        type="button"
                        onClick={() => setShowSavedRepliesDropdown(!showSavedRepliesDropdown)}
                        className="px-2.5 py-1 rounded-lg bg-card hover:bg-card-hover border border-card-border text-xs text-muted hover:text-white transition flex items-center gap-1"
                      >
                        <Bookmark className="h-3 w-3" />
                        Saved Replies
                      </button>

                      {showSavedRepliesDropdown && (
                        <div className="absolute right-0 bottom-full mb-1 w-64 bg-card border border-card-border rounded-xl shadow-xl p-2 z-50 divide-y divide-card-border">
                          <div className="px-2 py-1 text-[11px] font-bold text-muted uppercase">Select Canned Reply</div>
                          <div className="max-h-48 overflow-y-auto py-1">
                            {savedReplies.length === 0 ? (
                              <div className="p-2 text-xs text-muted">No saved replies.</div>
                            ) : (
                              savedReplies.map((r) => (
                                <button
                                  key={r.id}
                                  type="button"
                                  onClick={() => handleApplySavedReply(r)}
                                  className="w-full text-left p-2 rounded-lg hover:bg-card-hover text-xs transition"
                                >
                                  <div className="font-semibold text-white">{r.title}</div>
                                  <div className="text-[10px] text-muted line-clamp-1">{r.content}</div>
                                </button>
                              ))
                            )}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Template Picker */}
                    <button
                      type="button"
                      onClick={() => setShowTemplateModal(true)}
                      className="px-2.5 py-1 rounded-lg bg-card hover:bg-card-hover border border-card-border text-xs text-muted hover:text-white transition flex items-center gap-1"
                    >
                      <FileText className="h-3 w-3" />
                      Template
                    </button>
                  </div>
                </div>

                {/* Textarea Form */}
                <form onSubmit={handleSendMessage} className="space-y-2">
                  <div className="relative">
                    <textarea
                      rows={3}
                      value={messageBody}
                      onChange={(e) => setMessageBody(e.target.value)}
                      placeholder={
                        isInternalNote
                          ? 'Write a private note for your studio staff (clients will NEVER see this)...'
                          : 'Write your message to the client (type / for saved replies)...'
                      }
                      className={`w-full p-3 rounded-xl border text-xs text-white placeholder:text-muted/60 focus:outline-none resize-none ${
                        isInternalNote
                          ? 'bg-amber-500/10 border-amber-500/30 focus:border-amber-400'
                          : 'bg-background border-card-border focus:border-primary'
                      }`}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="text-[11px] text-muted">
                      {isInternalNote ? (
                        <span className="text-amber-400 font-medium">⚠️ Internal note mode active</span>
                      ) : (
                        <span>Will notify client via portal & email</span>
                      )}
                    </div>

                    <button
                      type="submit"
                      disabled={sending || !messageBody.trim()}
                      className={`px-4 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition ${
                        isInternalNote
                          ? 'bg-amber-500 hover:bg-amber-400 text-black'
                          : 'bg-primary hover:bg-primary-hover text-white'
                      } disabled:opacity-50 disabled:cursor-not-allowed`}
                    >
                      <Send className="h-3.5 w-3.5" />
                      {sending ? 'Sending...' : isInternalNote ? 'Save Note' : 'Send Message'}
                    </button>
                  </div>
                </form>
              </div>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
              <MessageSquare className="h-12 w-12 text-muted/40 mb-3" />
              <h3 className="font-semibold text-white">No conversation selected</h3>
              <p className="text-xs text-muted max-w-sm mt-1">
                Choose a conversation from the left thread list or start a new thread with a client.
              </p>
            </div>
          )}
        </div>

        {/* RIGHT COLUMN: Relationship & Context Sidebar */}
        {selectedConv && (
          <div className="w-80 border-l border-card-border bg-card/20 flex flex-col flex-shrink-0 p-4 space-y-4 overflow-y-auto hidden lg:flex">
            {/* Client 360 Card */}
            <div className="p-3.5 rounded-xl bg-card border border-card-border space-y-3">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-primary/20 text-primary flex items-center justify-center font-bold text-sm">
                  {selectedConv.client?.name?.charAt(0) || 'C'}
                </div>
                <div>
                  <h4 className="font-bold text-xs text-white">{selectedConv.client?.name}</h4>
                  <p className="text-[11px] text-muted">{selectedConv.client?.company || 'Direct Client'}</p>
                </div>
              </div>

              <div className="space-y-1.5 text-xs text-muted pt-2 border-t border-card-border">
                <div className="flex items-center gap-2">
                  <Mail className="h-3.5 w-3.5" />
                  <span className="text-white/90">{selectedConv.client?.email}</span>
                </div>
                {selectedConv.client?.phone && (
                  <div className="flex items-center gap-2">
                    <Phone className="h-3.5 w-3.5" />
                    <span className="text-white/90">{selectedConv.client?.phone}</span>
                  </div>
                )}
              </div>

              <Link
                href={`/dashboard/clients`}
                className="block text-center py-1 rounded bg-card-hover text-[11px] font-semibold text-primary transition"
              >
                View Client 360 Profile →
              </Link>
            </div>

            {/* Linked Entities */}
            <div className="space-y-2">
              <h4 className="text-[11px] font-bold text-muted uppercase tracking-wider">Linked Workflow Context</h4>

              {selectedConv.project && (
                <div className="p-2.5 rounded-lg bg-card border border-card-border flex items-center gap-2 text-xs">
                  <FolderKanban className="h-4 w-4 text-primary" />
                  <div>
                    <div className="font-semibold text-white">{selectedConv.project.name}</div>
                    <div className="text-[10px] text-muted">{selectedConv.project.status}</div>
                  </div>
                </div>
              )}

              {selectedConv.gallery && (
                <div className="p-2.5 rounded-lg bg-card border border-card-border flex items-center gap-2 text-xs">
                  <Images className="h-4 w-4 text-purple-400" />
                  <div>
                    <div className="font-semibold text-white">{selectedConv.gallery.title}</div>
                    <div className="text-[10px] text-muted">/{selectedConv.gallery.slug}</div>
                  </div>
                </div>
              )}

              {selectedConv.order && (
                <div className="p-2.5 rounded-lg bg-card border border-card-border flex items-center gap-2 text-xs">
                  <ShoppingBag className="h-4 w-4 text-emerald-400" />
                  <div>
                    <div className="font-semibold text-white">Order #{selectedConv.order.order_number}</div>
                    <div className="text-[10px] text-muted">{selectedConv.order.status}</div>
                  </div>
                </div>
              )}
            </div>

            {/* Assignee Card */}
            <div className="p-3.5 rounded-xl bg-card border border-card-border space-y-2">
              <h4 className="text-[11px] font-bold text-muted uppercase tracking-wider">Studio Assignment</h4>
              <div className="flex items-center gap-2 text-xs">
                <User className="h-4 w-4 text-primary" />
                <span className="font-semibold text-white">
                  {selectedConv.assigned_to
                    ? `${selectedConv.assigned_to.first_name} ${selectedConv.assigned_to.last_name}`
                    : 'Unassigned'}
                </span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Template Modal */}
      {showTemplateModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-card border border-card-border rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-card-border pb-3">
              <h3 className="font-bold text-sm text-white flex items-center gap-2">
                <FileText className="h-4 w-4 text-primary" />
                Insert Message Template
              </h3>
              <button
                onClick={() => setShowTemplateModal(false)}
                className="p-1 rounded-lg text-muted hover:text-white transition"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-2 max-h-72 overflow-y-auto">
              {templates.length === 0 ? (
                <div className="text-center py-6 text-xs text-muted">No templates available.</div>
              ) : (
                templates.map((tpl) => (
                  <div
                    key={tpl.id}
                    onClick={() => handleApplyTemplate(tpl.id)}
                    className="p-3 rounded-xl bg-card-hover/50 hover:bg-card-hover border border-card-border/50 cursor-pointer transition space-y-1"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-xs text-white">{tpl.name}</span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-primary/20 text-primary font-medium">
                        {tpl.category}
                      </span>
                    </div>
                    <p className="text-[11px] text-muted line-clamp-2">{tpl.body_template}</p>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
