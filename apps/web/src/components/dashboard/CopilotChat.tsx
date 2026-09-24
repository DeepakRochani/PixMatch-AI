'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Sparkles, Send, Bot, User, CheckCircle2, XCircle, AlertTriangle, ArrowRight, Loader2 } from 'lucide-react';
import { CopilotMessageDTO } from '@pixmatch/types';
import { fetchApi } from '@/lib/api-client';

interface CopilotChatProps {
  galleryId?: string;
  galleryTitle?: string;
  onActionTriggered?: (actionType: string, payload?: any) => void;
}

const SUGGESTED_QUESTIONS = [
  'Is this gallery ready to publish?',
  'What needs my attention?',
  'Are there duplicate photos?',
  'How many photos are processed?',
  'Should I generate an event story?',
];

export function CopilotChat({ galleryId, galleryTitle, onActionTriggered }: CopilotChatProps) {
  const [messages, setMessages] = useState<CopilotMessageDTO[]>([]);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    initConversation();
  }, [galleryId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const initConversation = async () => {
    try {
      const res = await fetchApi<any>('/api/v1/copilot/conversations', {
        method: 'POST',
        body: JSON.stringify({ galleryId }),
      });
      if (res.success && res.data) {
        setConversationId(res.data.id);
        if (res.data.messages && res.data.messages.length > 0) {
          setMessages(res.data.messages);
        } else {
          // Add welcoming greeting
          setMessages([
            {
              id: 'welcome',
              conversation_id: res.data.id,
              role: 'ASSISTANT' as any,
              content: `Hello! I am your AI Photographer Copilot for **${galleryTitle || 'your galleries'}**. Ask me anything about photo processing, operational readiness, duplicate detection, or gallery curation.`,
              created_at: new Date().toISOString(),
            },
          ]);
        }
      }
    } catch (err) {
      console.error('Failed to init copilot conversation:', err);
    }
  };

  const handleSend = async (textToSend?: string) => {
    const text = textToSend || input;
    if (!text.trim() || loading || !conversationId) return;

    const userMsg: CopilotMessageDTO = {
      id: `temp-${Date.now()}`,
      conversation_id: conversationId,
      role: 'USER' as any,
      content: text,
      created_at: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    try {
      const res = await fetchApi<any>(`/api/v1/copilot/conversations/${conversationId}/messages`, {
        method: 'POST',
        body: JSON.stringify({ content: text }),
      });

      if (res.success && res.data?.assistantMessage) {
        setMessages((prev) => [...prev, res.data.assistantMessage]);
      }
    } catch (err: any) {
      setMessages((prev) => [
        ...prev,
        {
          id: `err-${Date.now()}`,
          conversation_id: conversationId,
          role: 'ASSISTANT' as any,
          content: `⚠ Unable to process request: ${err.message || 'Network error'}.`,
          created_at: new Date().toISOString(),
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleActionClick = async (action: any) => {
    if (onActionTriggered) {
      onActionTriggered(action.action_type, action.payload);
    }

    if (!action.requires_approval) {
      setActionLoading(action.action_type);
      try {
        if (action.action_type === 'RETRY_PROCESSING') {
          await fetchApi(`/api/v1/copilot/galleries/${galleryId}/prepare`, {
            method: 'POST',
            body: JSON.stringify({ retry_failed_jobs: true }),
          });
        } else if (action.action_type === 'GENERATE_SMART_ALBUMS') {
          await fetchApi(`/api/v1/copilot/galleries/${galleryId}/prepare`, {
            method: 'POST',
            body: JSON.stringify({ generate_smart_albums: true }),
          });
        } else if (action.action_type === 'GENERATE_EVENT_STORY') {
          await fetchApi(`/api/v1/copilot/galleries/${galleryId}/prepare`, {
            method: 'POST',
            body: JSON.stringify({ generate_event_story: true }),
          });
        }
        handleSend(`Done executing ${action.label}. What is the current status?`);
      } catch (err) {
        console.error('Failed to run action:', err);
      } finally {
        setActionLoading(null);
      }
    }
  };

  return (
    <div className="flex flex-col h-[520px] bg-card/60 backdrop-blur border border-card-border rounded-xl shadow-lg overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 border-b border-card-border/80 bg-surface/50 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-primary to-accent flex items-center justify-center text-white shadow-sm shadow-primary/20">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-white flex items-center gap-1.5">
              Copilot Assistant
              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 font-normal border border-emerald-500/20">
                Grounded Facts
              </span>
            </h3>
            <p className="text-[11px] text-muted truncate max-w-[200px]">
              {galleryTitle ? `Scoped to: ${galleryTitle}` : 'Studio-wide assistant'}
            </p>
          </div>
        </div>
      </div>

      {/* Message List */}
      <div className="flex-1 p-4 overflow-y-auto space-y-4">
        {messages.map((m) => {
          const isUser = m.role === 'USER';
          return (
            <div key={m.id} className={`flex gap-3 ${isUser ? 'justify-end' : 'justify-start'}`}>
              {!isUser && (
                <div className="w-7 h-7 rounded-lg bg-primary/20 border border-primary/30 flex-shrink-0 flex items-center justify-center text-primary mt-1">
                  <Bot className="w-3.5 h-3.5" />
                </div>
              )}
              <div
                className={`max-w-[85%] rounded-xl px-4 py-2.5 text-xs sm:text-sm leading-relaxed ${
                  isUser
                    ? 'bg-primary text-white shadow-md shadow-primary/10 rounded-tr-none'
                    : 'bg-surface/90 border border-card-border text-foreground shadow-sm rounded-tl-none'
                }`}
              >
                <div className="whitespace-pre-wrap">{m.content}</div>

                {/* Suggested Action Cards */}
                {!isUser && m.suggested_actions && m.suggested_actions.length > 0 && (
                  <div className="mt-3 pt-2.5 border-t border-card-border/60 flex flex-wrap gap-2">
                    {m.suggested_actions.map((act, i) => (
                      <button
                        key={i}
                        disabled={actionLoading === act.action_type}
                        onClick={() => handleActionClick(act)}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-primary/10 hover:bg-primary/20 text-primary border border-primary/20 text-xs font-medium transition-all"
                      >
                        {actionLoading === act.action_type ? (
                          <Loader2 className="w-3 h-3 animate-spin" />
                        ) : (
                          <ArrowRight className="w-3 h-3" />
                        )}
                        {act.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              {isUser && (
                <div className="w-7 h-7 rounded-lg bg-card-border flex-shrink-0 flex items-center justify-center text-muted mt-1">
                  <User className="w-3.5 h-3.5" />
                </div>
              )}
            </div>
          );
        })}

        {loading && (
          <div className="flex gap-3 justify-start">
            <div className="w-7 h-7 rounded-lg bg-primary/20 border border-primary/30 flex-shrink-0 flex items-center justify-center text-primary mt-1">
              <Bot className="w-3.5 h-3.5" />
            </div>
            <div className="bg-surface/90 border border-card-border rounded-xl rounded-tl-none px-4 py-2.5 text-xs text-muted flex items-center gap-2">
              <Loader2 className="w-3.5 h-3.5 animate-spin text-primary" />
              <span>Checking verified gallery facts...</span>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Suggested Chips */}
      <div className="px-3 py-2 border-t border-card-border/60 bg-surface/30 overflow-x-auto flex gap-1.5 no-scrollbar">
        {SUGGESTED_QUESTIONS.map((q, idx) => (
          <button
            key={idx}
            onClick={() => handleSend(q)}
            disabled={loading}
            className="whitespace-nowrap px-2.5 py-1 rounded-md bg-card/80 hover:bg-card border border-card-border text-[11px] text-muted hover:text-white transition-all flex-shrink-0"
          >
            {q}
          </button>
        ))}
      </div>

      {/* Input Form */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          handleSend();
        }}
        className="p-3 border-t border-card-border/80 bg-surface/80 flex items-center gap-2"
      >
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask Copilot about readiness, processing, or duplicates..."
          disabled={loading}
          className="flex-1 bg-card border border-card-border rounded-lg px-3.5 py-2 text-xs sm:text-sm text-foreground placeholder-muted focus:outline-none focus:border-primary transition-all"
        />
        <button
          type="submit"
          disabled={!input.trim() || loading}
          className="px-3.5 py-2 rounded-lg bg-primary hover:bg-primary/90 text-white disabled:opacity-50 transition-all flex items-center justify-center shadow-sm shadow-primary/20"
        >
          <Send className="w-4 h-4" />
        </button>
      </form>
    </div>
  );
}
