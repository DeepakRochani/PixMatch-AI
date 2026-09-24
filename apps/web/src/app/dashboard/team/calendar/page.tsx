'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { fetchApi } from '@/lib/api-client';

export default function TeamCalendarPage() {
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [eventTypeFilter, setEventTypeFilter] = useState('');
  const [checkConflictModal, setCheckConflictModal] = useState(false);

  // Conflict tester
  const [members, setMembers] = useState<any[]>([]);
  const [conflictMemberId, setConflictMemberId] = useState('');
  const [conflictStart, setConflictStart] = useState('');
  const [conflictEnd, setConflictEnd] = useState('');
  const [conflictResult, setConflictResult] = useState<any>(null);
  const [checkingConflict, setCheckingConflict] = useState(false);

  const loadEvents = async () => {
    setLoading(true);
    try {
      const now = new Date();
      const start = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
      const end = new Date(now.getFullYear(), now.getMonth() + 2, 0).toISOString();

      const params = new URLSearchParams({
        start_date: start,
        end_date: end,
      });
      if (eventTypeFilter) {
        params.append('event_types', eventTypeFilter);
      }

      const [eventsRes, membersRes] = await Promise.all([
        fetchApi<any>(`/v1/team/calendar?${params.toString()}`),
        fetchApi<any>('/v1/team/members?status=ACTIVE&limit=100'),
      ]);

      const eventsData = (eventsRes as any)?.data || eventsRes;
      const membersData = (membersRes as any)?.data || membersRes;

      if (eventsData && eventsData.items) {
        setEvents(eventsData.items);
      }
      if (membersData && (membersData.items || Array.isArray(membersData))) {
        setMembers(membersData.items || membersData);
      }
    } catch (err) {
      console.error('Failed to load team calendar', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadEvents();
  }, [eventTypeFilter]);

  const handleTestConflict = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!conflictMemberId || !conflictStart || !conflictEnd) return;

    setCheckingConflict(true);
    setConflictResult(null);
    try {
      const res = await fetchApi<any>('/v1/team/conflicts/check', {
        method: 'POST',
        body: JSON.stringify({
          member_id: conflictMemberId,
          start_time: conflictStart,
          end_time: conflictEnd,
        }),
      });

      if (res && res.error) {
        alert(res.error.message);
      } else {
        setConflictResult(res);
      }
    } catch (err: any) {
      alert(err.message);
    } finally {
      setCheckingConflict(false);
    }
  };

  const getEventBadge = (type: string) => {
    switch (type) {
      case 'SHOOT':
        return <span className="px-2 py-0.5 rounded text-xs font-semibold bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">Shoot Session</span>;
      case 'LEAVE':
        return <span className="px-2 py-0.5 rounded text-xs font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20">Time-off / Leave</span>;
      case 'TASK_DEADLINE':
        return <span className="px-2 py-0.5 rounded text-xs font-semibold bg-rose-500/10 text-rose-400 border border-rose-500/20">Task Deadline</span>;
      default:
        return <span className="px-2 py-0.5 rounded text-xs font-semibold bg-slate-800 text-slate-300">{type}</span>;
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-6 sm:p-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-slate-800/80 pb-6 mb-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-white flex items-center gap-3">
            <span>Internal Team Calendar</span>
            <span className="text-xs px-2.5 py-1 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 font-mono font-medium">Aggregated</span>
          </h1>
          <p className="text-slate-400 text-sm mt-1">
            Studio-wide workforce timeline aggregating shoot crew dates, approved leaves, and task deadlines.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setCheckConflictModal(true)}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-sm font-medium transition shadow-sm flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Conflict Checker
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-800 mb-8 overflow-x-auto pb-2">
        <Link href="/dashboard/team" className="px-4 py-2 text-slate-400 hover:text-slate-200 hover:bg-slate-900 rounded-lg text-sm transition">
          Directory
        </Link>
        <Link href="/dashboard/team/workload" className="px-4 py-2 text-slate-400 hover:text-slate-200 hover:bg-slate-900 rounded-lg text-sm transition">
          Workload Engine
        </Link>
        <Link href="/dashboard/team/calendar" className="px-4 py-2 bg-slate-800/90 text-white font-semibold rounded-lg text-sm border border-slate-700">
          Team Calendar
        </Link>
        <Link href="/dashboard/team/settings" className="px-4 py-2 text-slate-400 hover:text-slate-200 hover:bg-slate-900 rounded-lg text-sm transition">
          Departments & Invites
        </Link>
      </div>

      {/* Filter Controls */}
      <div className="flex items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setEventTypeFilter('')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${!eventTypeFilter ? 'bg-slate-800 text-white border border-slate-700' : 'text-slate-400 hover:text-white'}`}
          >
            All Events ({events.length})
          </button>
          <button
            onClick={() => setEventTypeFilter('SHOOT')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${eventTypeFilter === 'SHOOT' ? 'bg-indigo-950/80 text-indigo-300 border border-indigo-700' : 'text-slate-400 hover:text-white'}`}
          >
            Shoots Only
          </button>
          <button
            onClick={() => setEventTypeFilter('LEAVE')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${eventTypeFilter === 'LEAVE' ? 'bg-amber-950/80 text-amber-300 border border-amber-700' : 'text-slate-400 hover:text-white'}`}
          >
            Leaves Only
          </button>
          <button
            onClick={() => setEventTypeFilter('TASK_DEADLINE')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${eventTypeFilter === 'TASK_DEADLINE' ? 'bg-rose-950/80 text-rose-300 border border-rose-700' : 'text-slate-400 hover:text-white'}`}
          >
            Deadlines Only
          </button>
        </div>
      </div>

      {/* Events Stream */}
      <div className="bg-slate-900/40 border border-slate-800 rounded-xl overflow-hidden shadow-sm">
        {loading ? (
          <div className="p-12 text-center text-slate-500 text-sm">Aggregating workforce events...</div>
        ) : events.length === 0 ? (
          <div className="p-12 text-center text-slate-500 text-sm">No scheduled workforce events for this period.</div>
        ) : (
          <div className="divide-y divide-slate-800">
            {events.map((evt) => (
              <div key={evt.id} className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-slate-800/20 transition">
                <div className="flex items-start sm:items-center gap-4">
                  <div className="w-10 h-10 rounded-xl bg-slate-800 border border-slate-700 flex flex-col items-center justify-center shrink-0">
                    <span className="text-[10px] uppercase font-bold text-slate-400">
                      {new Date(evt.start_time).toLocaleString('en-US', { month: 'short' })}
                    </span>
                    <span className="text-sm font-extrabold text-white leading-tight">
                      {new Date(evt.start_time).getDate()}
                    </span>
                  </div>

                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className="font-bold text-white text-base">{evt.title}</h4>
                      {getEventBadge(evt.event_type)}
                    </div>
                    <div className="text-xs text-slate-400 mt-1 flex items-center gap-3">
                      <span>Staff: <strong className="text-slate-200">{evt.member_name}</strong></span>
                      {evt.department && <span>• {evt.department}</span>}
                      <span>• {new Date(evt.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} – {new Date(evt.end_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                  </div>
                </div>

                <div className="text-xs text-slate-500 self-end sm:self-center font-mono">
                  ID: {evt.source_id.slice(0, 8)}...
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Conflict Checker Modal */}
      {checkConflictModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-xs p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="text-lg font-bold text-white">Double-Booking & Conflict Checker</h3>
              <button onClick={() => setCheckConflictModal(false)} className="text-slate-400 hover:text-white">✕</button>
            </div>

            <form onSubmit={handleTestConflict} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase mb-1">Team Member *</label>
                <select
                  required
                  value={conflictMemberId}
                  onChange={(e) => setConflictMemberId(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-200"
                >
                  <option value="">-- Choose Member --</option>
                  {members.map((m) => (
                    <option key={m.id} value={m.id}>{m.user_name} ({m.role})</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase mb-1">Start Time *</label>
                  <input
                    type="datetime-local"
                    required
                    value={conflictStart}
                    onChange={(e) => setConflictStart(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-200"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase mb-1">End Time *</label>
                  <input
                    type="datetime-local"
                    required
                    value={conflictEnd}
                    onChange={(e) => setConflictEnd(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-200"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={checkingConflict}
                className="w-full py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded-lg text-sm font-semibold transition"
              >
                {checkingConflict ? 'Verifying Availability...' : 'Check For Conflicts'}
              </button>
            </form>

            {conflictResult && (
              <div className={`p-4 rounded-xl border mt-4 text-xs ${
                conflictResult.has_conflict
                  ? 'bg-rose-500/10 border-rose-500/30 text-rose-300'
                  : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
              }`}>
                <div className="font-bold text-sm mb-1">
                  {conflictResult.has_conflict ? '⚠️ Schedule Conflict Detected' : '✅ Team Member Available'}
                </div>
                {conflictResult.reasons && conflictResult.reasons.length > 0 && (
                  <ul className="list-disc pl-4 space-y-1 mt-2">
                    {conflictResult.reasons.map((r: string, idx: number) => (
                      <li key={idx}>{r}</li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
