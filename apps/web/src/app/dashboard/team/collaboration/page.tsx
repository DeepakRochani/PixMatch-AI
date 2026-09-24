'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { fetchApi } from '@/lib/api-client';

interface CollaborationThread {
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
  last_activity_at: string;
  created_at: string;
  is_unread?: boolean;
}

interface WorkBlocker {
  id: string;
  title: string;
  description: string;
  severity: string;
  status: string;
  reporter_name?: string;
  created_at: string;
  thread_id: string;
}

interface WorkHandoff {
  id: string;
  title: string;
  description: string;
  status: string;
  from_member_name?: string;
  to_member_name?: string;
  created_at: string;
  thread_id: string;
}

interface HelpRequest {
  id: string;
  title: string;
  description: string;
  category: string;
  priority: string;
  status: string;
  requester_name?: string;
  created_at: string;
  thread_id: string;
}

export default function TeamCollaborationPage() {
  const [activeTab, setActiveTab] = useState<'threads' | 'handoffs' | 'blockers' | 'help'>('threads');
  const [threads, setThreads] = useState<CollaborationThread[]>([]);
  const [blockers, setBlockers] = useState<WorkBlocker[]>([]);
  const [handoffs, setHandoffs] = useState<WorkHandoff[]>([]);
  const [helpRequests, setHelpRequests] = useState<HelpRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedType, setSelectedType] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');
  const [selectedPriority, setSelectedPriority] = useState('');

  // New Thread Modal
  const [showNewThreadModal, setShowNewThreadModal] = useState(false);
  const [threadTitle, setThreadTitle] = useState('');
  const [threadType, setThreadType] = useState('PROJECT_INTERNAL');
  const [threadPriority, setThreadPriority] = useState('NORMAL');
  const [initialNote, setInitialNote] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const loadData = async () => {
    setLoading(true);
    try {
      if (activeTab === 'threads') {
        const params = new URLSearchParams();
        if (search) params.append('search', search);
        if (selectedType) params.append('type', selectedType);
        if (selectedStatus) params.append('status', selectedStatus);
        if (selectedPriority) params.append('priority', selectedPriority);

        const res = await fetchApi<any>(`/v1/team/collaboration/threads?${params.toString()}`);
        const data = (res as any)?.data || res;
        setThreads(data?.threads || data?.items || (Array.isArray(data) ? data : []));
      } else if (activeTab === 'blockers') {
        const res = await fetchApi<any>('/v1/team/collaboration/blockers');
        const data = (res as any)?.data || res;
        setBlockers(data?.blockers || (Array.isArray(data) ? data : []));
      } else if (activeTab === 'handoffs') {
        const res = await fetchApi<any>('/v1/team/collaboration/handoffs');
        const data = (res as any)?.data || res;
        setHandoffs(data?.handoffs || (Array.isArray(data) ? data : []));
      } else if (activeTab === 'help') {
        const res = await fetchApi<any>('/v1/team/collaboration/help-requests');
        const data = (res as any)?.data || res;
        setHelpRequests(data?.help_requests || (Array.isArray(data) ? data : []));
      }
    } catch (err) {
      console.error('Failed to load collaboration data', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [activeTab, selectedType, selectedStatus, selectedPriority]);

  const handleCreateThread = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!threadTitle.trim() || !initialNote.trim()) {
      setErrorMsg('Please provide a thread title and initial message.');
      return;
    }

    setSubmitting(true);
    setErrorMsg('');

    try {
      const res = await fetchApi<any>('/v1/team/collaboration/threads', {
        method: 'POST',
        body: JSON.stringify({
          title: threadTitle.trim(),
          type: threadType,
          priority: threadPriority,
          initial_message: initialNote.trim(),
        }),
      });

      if (res?.success || (res as any)?.id) {
        setShowNewThreadModal(false);
        setThreadTitle('');
        setInitialNote('');
        loadData();
      } else {
        setErrorMsg(res?.error?.message || 'Failed to create thread');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'An error occurred');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-6 md:p-8">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-6 mb-8">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-white">
              Studio Collaboration & Operations
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
              Internal 2.0
            </span>
          </div>
          <p className="text-sm text-slate-400 mt-1">
            Real-time internal threads, work handoffs, blocker resolution, and team attention center.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/dashboard/team/attention"
            className="inline-flex items-center px-4 py-2 text-sm font-medium rounded-lg bg-slate-900 border border-amber-500/30 text-amber-300 hover:bg-amber-500/10 transition-colors shadow-sm"
          >
            <span className="w-2 h-2 rounded-full bg-amber-400 mr-2 animate-pulse" />
            Attention Center
          </Link>

          <button
            onClick={() => setShowNewThreadModal(true)}
            className="inline-flex items-center px-4 py-2 text-sm font-medium rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white transition-colors shadow-sm"
          >
            + New Thread
          </button>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex border-b border-slate-800 mb-6 gap-2">
        <button
          onClick={() => setActiveTab('threads')}
          className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'threads'
              ? 'border-indigo-500 text-indigo-400 font-semibold'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          Active Threads
        </button>
        <button
          onClick={() => setActiveTab('handoffs')}
          className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'handoffs'
              ? 'border-indigo-500 text-indigo-400 font-semibold'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          Work Handoffs
        </button>
        <button
          onClick={() => setActiveTab('blockers')}
          className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'blockers'
              ? 'border-indigo-500 text-indigo-400 font-semibold'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          Blockers & Critical Issues
        </button>
        <button
          onClick={() => setActiveTab('help')}
          className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'help'
              ? 'border-indigo-500 text-indigo-400 font-semibold'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          Help Requests
        </button>
      </div>

      {/* Filter Bar */}
      {activeTab === 'threads' && (
        <div className="flex flex-wrap gap-3 items-center mb-6 bg-slate-900/60 p-3 rounded-xl border border-slate-800">
          <input
            type="text"
            placeholder="Search threads, notes, or tags..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && loadData()}
            className="px-3.5 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-sm text-slate-200 focus:outline-none focus:border-indigo-500 min-w-[240px]"
          />

          <select
            value={selectedType}
            onChange={(e) => setSelectedType(e.target.value)}
            className="px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-sm text-slate-300 focus:outline-none focus:border-indigo-500"
          >
            <option value="">All Thread Types</option>
            <option value="PROJECT_INTERNAL">Project Internal</option>
            <option value="TASK_INTERNAL">Task Internal</option>
            <option value="SHOOT_INTERNAL">Shoot Internal</option>
            <option value="EQUIPMENT_INTERNAL">Equipment</option>
            <option value="WORKFLOW_HANDOFF">Workflow Handoff</option>
            <option value="INCIDENT_BLOCKER">Blocker Issue</option>
            <option value="HELP_REQUEST">Help Request</option>
            <option value="GENERAL_TEAM">General Discussion</option>
          </select>

          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-sm text-slate-300 focus:outline-none focus:border-indigo-500"
          >
            <option value="">All Statuses</option>
            <option value="OPEN">Open</option>
            <option value="RESOLVED">Resolved</option>
            <option value="CLOSED">Closed</option>
            <option value="ARCHIVED">Archived</option>
          </select>

          <select
            value={selectedPriority}
            onChange={(e) => setSelectedPriority(e.target.value)}
            className="px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-sm text-slate-300 focus:outline-none focus:border-indigo-500"
          >
            <option value="">All Priorities</option>
            <option value="LOW">Low</option>
            <option value="NORMAL">Normal</option>
            <option value="HIGH">High</option>
            <option value="URGENT">Urgent</option>
          </select>

          <button
            onClick={loadData}
            className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-xs font-semibold rounded-lg transition-colors ml-auto"
          >
            Apply Filters
          </button>
        </div>
      )}

      {/* Main Content Area */}
      {loading ? (
        <div className="flex items-center justify-center p-16">
          <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <div>
          {/* Threads List */}
          {activeTab === 'threads' && (
            <div className="grid gap-3">
              {threads.length === 0 ? (
                <div className="bg-slate-900/40 border border-slate-800/80 rounded-2xl p-12 text-center">
                  <p className="text-slate-400 text-sm">No collaboration threads found.</p>
                  <button
                    onClick={() => setShowNewThreadModal(true)}
                    className="mt-4 px-4 py-2 text-sm bg-indigo-600/20 text-indigo-400 border border-indigo-500/30 rounded-lg hover:bg-indigo-600/30 transition-colors"
                  >
                    Start the first thread
                  </button>
                </div>
              ) : (
                threads.map((thread) => (
                  <Link
                    key={thread.id}
                    href={`/dashboard/team/threads/${thread.id}`}
                    className="block bg-slate-900/50 hover:bg-slate-900 border border-slate-800/80 hover:border-slate-700 rounded-xl p-4 transition-all duration-150 group"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="space-y-1.5">
                        <div className="flex items-center gap-2.5 flex-wrap">
                          <span
                            className={`px-2 py-0.5 rounded text-[11px] font-semibold uppercase tracking-wider ${
                              thread.priority === 'URGENT'
                                ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                                : thread.priority === 'HIGH'
                                ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                                : 'bg-slate-800 text-slate-300'
                            }`}
                          >
                            {thread.priority}
                          </span>

                          <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-indigo-950 text-indigo-300 border border-indigo-800/40">
                            {thread.type.replace(/_/g, ' ')}
                          </span>

                          <h3 className="font-semibold text-slate-100 group-hover:text-indigo-400 transition-colors">
                            {thread.title}
                          </h3>
                        </div>

                        <div className="flex items-center gap-4 text-xs text-slate-400">
                          <span>Created by {thread.created_by_name || 'Team Member'}</span>
                          <span>•</span>
                          <span>{thread.message_count || 1} messages</span>
                          <span>•</span>
                          <span>Updated {new Date(thread.last_activity_at || thread.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <span
                          className={`text-xs px-2.5 py-1 rounded-full font-medium ${
                            thread.status === 'OPEN'
                              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                              : 'bg-slate-800 text-slate-400'
                          }`}
                        >
                          {thread.status}
                        </span>
                      </div>
                    </div>
                  </Link>
                ))
              )}
            </div>
          )}

          {/* Handoffs List */}
          {activeTab === 'handoffs' && (
            <div className="grid gap-3">
              {handoffs.length === 0 ? (
                <div className="bg-slate-900/40 border border-slate-800 rounded-2xl p-12 text-center text-slate-400 text-sm">
                  No active work handoffs.
                </div>
              ) : (
                handoffs.map((handoff) => (
                  <div
                    key={handoff.id}
                    className="bg-slate-900/50 border border-slate-800 rounded-xl p-4 flex items-center justify-between gap-4"
                  >
                    <div>
                      <h4 className="font-semibold text-slate-200">{handoff.title}</h4>
                      <p className="text-xs text-slate-400 mt-0.5">{handoff.description}</p>
                      <div className="flex items-center gap-3 text-xs text-slate-500 mt-2">
                        <span>From: {handoff.from_member_name || 'Team Member'}</span>
                        <span>→</span>
                        <span>To: {handoff.to_member_name || 'Unassigned'}</span>
                      </div>
                    </div>
                    <span className="px-2.5 py-1 rounded text-xs font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20">
                      {handoff.status}
                    </span>
                  </div>
                ))
              )}
            </div>
          )}

          {/* Blockers List */}
          {activeTab === 'blockers' && (
            <div className="grid gap-3">
              {blockers.length === 0 ? (
                <div className="bg-slate-900/40 border border-slate-800 rounded-2xl p-12 text-center text-slate-400 text-sm">
                  No open work blockers reported. Studio flow is healthy!
                </div>
              ) : (
                blockers.map((blocker) => (
                  <div
                    key={blocker.id}
                    className="bg-red-950/20 border border-red-900/40 rounded-xl p-4 flex items-center justify-between gap-4"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-red-500 text-white uppercase">
                          {blocker.severity}
                        </span>
                        <h4 className="font-semibold text-red-200">{blocker.title}</h4>
                      </div>
                      <p className="text-xs text-slate-300 mt-1">{blocker.description}</p>
                    </div>
                    <span className="text-xs text-slate-400 font-mono">
                      {blocker.status}
                    </span>
                  </div>
                ))
              )}
            </div>
          )}

          {/* Help Requests */}
          {activeTab === 'help' && (
            <div className="grid gap-3">
              {helpRequests.length === 0 ? (
                <div className="bg-slate-900/40 border border-slate-800 rounded-2xl p-12 text-center text-slate-400 text-sm">
                  No active help requests.
                </div>
              ) : (
                helpRequests.map((hr) => (
                  <div
                    key={hr.id}
                    className="bg-slate-900/50 border border-slate-800 rounded-xl p-4 flex items-center justify-between gap-4"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 uppercase">
                          {hr.category}
                        </span>
                        <h4 className="font-semibold text-slate-200">{hr.title}</h4>
                      </div>
                      <p className="text-xs text-slate-400 mt-1">{hr.description}</p>
                    </div>
                    <span className="px-2.5 py-1 rounded text-xs font-semibold bg-slate-800 text-slate-300">
                      {hr.priority}
                    </span>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      )}

      {/* Modal: New Thread */}
      {showNewThreadModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 max-w-lg w-full shadow-2xl">
            <h2 className="text-lg font-bold text-white mb-4">Start Internal Thread</h2>

            {errorMsg && (
              <div className="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-xs">
                {errorMsg}
              </div>
            )}

            <form onSubmit={handleCreateThread} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Thread Title</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Wedding Reception Timeline & Gear Sync"
                  value={threadTitle}
                  onChange={(e) => setThreadTitle(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-sm text-slate-200 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Type</label>
                  <select
                    value={threadType}
                    onChange={(e) => setThreadType(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-sm text-slate-300 focus:outline-none focus:border-indigo-500"
                  >
                    <option value="PROJECT_INTERNAL">Project Internal</option>
                    <option value="TASK_INTERNAL">Task Internal</option>
                    <option value="SHOOT_INTERNAL">Shoot Internal</option>
                    <option value="EQUIPMENT_INTERNAL">Equipment</option>
                    <option value="WORKFLOW_HANDOFF">Workflow Handoff</option>
                    <option value="INCIDENT_BLOCKER">Incident Blocker</option>
                    <option value="HELP_REQUEST">Help Request</option>
                    <option value="GENERAL_TEAM">General</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Priority</label>
                  <select
                    value={threadPriority}
                    onChange={(e) => setThreadPriority(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-sm text-slate-300 focus:outline-none focus:border-indigo-500"
                  >
                    <option value="LOW">Low</option>
                    <option value="NORMAL">Normal</option>
                    <option value="HIGH">High</option>
                    <option value="URGENT">Urgent</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Initial Internal Note / Message
                </label>
                <textarea
                  required
                  rows={4}
                  placeholder="Share internal context, instructions, or @mention teammates..."
                  value={initialNote}
                  onChange={(e) => setInitialNote(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-sm text-slate-200 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowNewThreadModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-400 hover:text-white transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg transition-colors disabled:opacity-50"
                >
                  {submitting ? 'Creating...' : 'Create Thread'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
