'use client';

import React, { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  XCircle,
  Plus,
  Send,
  MessageSquare,
  UserCheck,
  Activity,
  FileText,
} from 'lucide-react';
import {
  PlatformSecurityInvestigationDTO,
  SecurityInvestigationStatus,
} from '@pixmatch/types';

function InvestigationsContent() {
  const [investigations, setInvestigations] = useState<PlatformSecurityInvestigationDTO[]>([]);
  const [selectedInv, setSelectedInv] = useState<PlatformSecurityInvestigationDTO | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [newNote, setNewNote] = useState<string>('');
  const [submittingNote, setSubmittingNote] = useState<boolean>(false);
  const [filterStatus, setFilterStatus] = useState<string>('');

  const fetchInvestigations = async () => {
    try {
      setLoading(true);
      const q = filterStatus ? `?status=${filterStatus}` : '';
      const res = await fetch(`/api/admin/security-center/investigations${q}`);
      if (res.ok) {
        const d = await res.json();
        if (d.success) {
          const list = d.data.investigations || [];
          setInvestigations(list);
          if (list.length > 0 && !selectedInv) {
            setSelectedInv(list[0]);
          } else if (selectedInv) {
            const updated = list.find((i: any) => i.id === selectedInv.id);
            if (updated) setSelectedInv(updated);
          }
        }
      }
    } catch (e) {
      console.error('Failed to load investigations:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInvestigations();
  }, [filterStatus]);

  const handleAddNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedInv || !newNote.trim()) return;

    try {
      setSubmittingNote(true);
      const res = await fetch(`/api/admin/security-center/investigations/${selectedInv.id}/notes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ note: newNote }),
      });
      if (res.ok) {
        setNewNote('');
        await fetchInvestigations();
      }
    } catch (e) {
      console.error('Failed to add note:', e);
    } finally {
      setSubmittingNote(false);
    }
  };

  const handleStatusChange = async (status: SecurityInvestigationStatus, resolution?: string) => {
    if (!selectedInv) return;

    try {
      const res = await fetch(`/api/admin/security-center/investigations/${selectedInv.id}/status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status, resolution }),
      });
      if (res.ok) {
        await fetchInvestigations();
      }
    } catch (e) {
      console.error('Failed to update investigation status:', e);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-card-border/80 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <Link
              href="/dashboard/admin/security-center"
              className="p-1 rounded-lg bg-card-border/60 hover:bg-card-border text-muted hover:text-white transition"
            >
              <ArrowLeft className="h-4 w-4" />
            </Link>
            <h1 className="text-2xl font-bold tracking-tight text-white">Security Investigations Console</h1>
          </div>
          <p className="text-xs text-muted mt-1">
            Structured incident response, admin case tracking, and chronological evidence timeline.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-3 py-2 rounded-xl bg-[#0E1422] border border-card-border text-xs text-white focus:outline-none focus:border-amber-500"
          >
            <option value="">All Investigation Statuses</option>
            {Object.values(SecurityInvestigationStatus).map((st) => (
              <option key={st} value={st}>
                {st}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* 2-Column Split: Case List & Active Case Detail */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Case List */}
        <div className="space-y-3">
          <h3 className="text-xs font-bold text-muted uppercase tracking-wider">
            Active Cases ({investigations.length})
          </h3>
          <div className="space-y-2 max-h-[600px] overflow-y-auto pr-1">
            {loading ? (
              <div className="p-8 text-center text-muted text-xs">Loading cases...</div>
            ) : investigations.length === 0 ? (
              <div className="p-6 rounded-xl bg-[#0B0F17] border border-card-border text-center text-muted text-xs">
                No active investigations found.
              </div>
            ) : (
              investigations.map((inv) => {
                const isSelected = selectedInv?.id === inv.id;
                return (
                  <button
                    key={inv.id}
                    onClick={() => setSelectedInv(inv)}
                    className={`w-full text-left p-3.5 rounded-xl border transition space-y-1.5 ${
                      isSelected
                        ? 'bg-[#0E1422] border-blue-500/50 shadow-lg shadow-blue-500/10'
                        : 'bg-[#0B0F17] border-card-border hover:bg-[#0E1422]/60'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-xs font-bold text-white">{inv.id}</span>
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          inv.status === 'RESOLVED'
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                            : inv.status === 'INVESTIGATING'
                            ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                            : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                        }`}
                      >
                        {inv.status}
                      </span>
                    </div>
                    <p className="text-[11px] text-muted truncate">
                      Event: <span className="font-mono text-zinc-300">{inv.security_event_id}</span>
                    </p>
                    <div className="flex items-center justify-between text-[10px] text-muted pt-1 border-t border-card-border/40">
                      <span>{inv.assigned_admin_name || 'Unassigned'}</span>
                      <span>{new Date(inv.opened_at).toLocaleDateString()}</span>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* Right Column: Case Workspace */}
        <div className="lg:col-span-2">
          {selectedInv ? (
            <div className="rounded-2xl bg-[#0B0F17] border border-card-border p-5 space-y-5">
              {/* Case Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-card-border/80 pb-4">
                <div>
                  <h2 className="text-base font-bold text-white flex items-center gap-2">
                    <Activity className="h-4 w-4 text-blue-400" />
                    Investigation Case: <span className="font-mono">{selectedInv.id}</span>
                  </h2>
                  <p className="text-xs text-muted mt-0.5">
                    Target Event:{' '}
                    <Link
                      href={`/dashboard/admin/security-center/events/${selectedInv.security_event_id}`}
                      className="font-mono text-amber-400 hover:underline"
                    >
                      {selectedInv.security_event_id}
                    </Link>
                  </p>
                </div>

                {/* Status Transitions */}
                <div className="flex items-center gap-2 flex-wrap">
                  {selectedInv.status !== 'CONTAINED' && (
                    <button
                      onClick={() => handleStatusChange(SecurityInvestigationStatus.CONTAINED)}
                      className="px-2.5 py-1.5 rounded-lg bg-amber-600/80 hover:bg-amber-600 text-xs font-semibold text-white transition"
                    >
                      Contained
                    </button>
                  )}
                  {selectedInv.status !== 'RESOLVED' && (
                    <button
                      onClick={() =>
                        handleStatusChange(
                          SecurityInvestigationStatus.RESOLVED,
                          'Mitigation complete and verified.'
                        )
                      }
                      className="px-2.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-xs font-semibold text-white transition"
                    >
                      Resolve Case
                    </button>
                  )}
                  {selectedInv.status !== 'FALSE_POSITIVE' && (
                    <button
                      onClick={() =>
                        handleStatusChange(
                          SecurityInvestigationStatus.FALSE_POSITIVE,
                          'Determined to be benign.'
                        )
                      }
                      className="px-2.5 py-1.5 rounded-lg bg-zinc-700 hover:bg-zinc-600 text-xs font-semibold text-white transition"
                    >
                      False Positive
                    </button>
                  )}
                </div>
              </div>

              {/* Case Info Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                <div className="p-3 rounded-xl bg-[#0E1422] border border-card-border">
                  <span className="text-[10px] text-muted uppercase font-bold">Status</span>
                  <p className="text-white font-semibold mt-0.5">{selectedInv.status}</p>
                </div>
                <div className="p-3 rounded-xl bg-[#0E1422] border border-card-border">
                  <span className="text-[10px] text-muted uppercase font-bold">Assigned Lead</span>
                  <p className="text-white font-semibold mt-0.5">
                    {selectedInv.assigned_admin_name || selectedInv.assigned_admin_id}
                  </p>
                </div>
                <div className="p-3 rounded-xl bg-[#0E1422] border border-card-border">
                  <span className="text-[10px] text-muted uppercase font-bold">Opened At</span>
                  <p className="text-white font-semibold mt-0.5">
                    {new Date(selectedInv.opened_at).toLocaleDateString()}
                  </p>
                </div>
                <div className="p-3 rounded-xl bg-[#0E1422] border border-card-border">
                  <span className="text-[10px] text-muted uppercase font-bold">Closed At</span>
                  <p className="text-white font-semibold mt-0.5">
                    {selectedInv.closed_at
                      ? new Date(selectedInv.closed_at).toLocaleDateString()
                      : 'Active'}
                  </p>
                </div>
              </div>

              {/* Resolution if set */}
              {selectedInv.resolution && (
                <div className="p-3.5 rounded-xl bg-emerald-950/40 border border-emerald-800/30 text-xs space-y-1">
                  <span className="text-[10px] font-bold text-emerald-400 uppercase">Resolution Notes</span>
                  <p className="text-emerald-200">{selectedInv.resolution}</p>
                </div>
              )}

              {/* Notes Feed */}
              <div className="space-y-3">
                <h3 className="text-xs font-bold text-white flex items-center gap-1.5">
                  <MessageSquare className="h-3.5 w-3.5 text-muted" />
                  Chronological Audit Notes ({selectedInv.notes?.length || 0})
                </h3>

                <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                  {!selectedInv.notes || selectedInv.notes.length === 0 ? (
                    <p className="text-xs text-muted italic">No notes recorded for this case yet.</p>
                  ) : (
                    selectedInv.notes.map((n) => (
                      <div
                        key={n.id}
                        className="p-3 rounded-xl bg-[#0E1422] border border-card-border text-xs space-y-1"
                      >
                        <div className="flex items-center justify-between text-[10px] text-muted">
                          <span className="font-semibold text-white">{n.admin_name || n.admin_id}</span>
                          <span>{new Date(n.created_at).toLocaleString()}</span>
                        </div>
                        <p className="text-zinc-200">{n.note}</p>
                      </div>
                    ))
                  )}
                </div>

                {/* Add Note Form */}
                <form onSubmit={handleAddNote} className="flex gap-2 pt-2">
                  <input
                    type="text"
                    required
                    placeholder="Append timestamped administrative note..."
                    value={newNote}
                    onChange={(e) => setNewNote(e.target.value)}
                    className="flex-1 p-2.5 rounded-xl bg-[#070A0F] border border-card-border text-xs text-white placeholder-muted focus:outline-none focus:border-blue-500"
                  />
                  <button
                    type="submit"
                    disabled={submittingNote || !newNote.trim()}
                    className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-xs font-semibold text-white transition flex items-center gap-1.5"
                  >
                    <Send className="h-3.5 w-3.5" /> Post
                  </button>
                </form>
              </div>
            </div>
          ) : (
            <div className="rounded-2xl bg-[#0B0F17] border border-card-border p-12 text-center text-muted text-xs">
              Select an investigation case to view details.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function InvestigationsPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-muted text-xs">Loading Investigations...</div>}>
      <InvestigationsContent />
    </Suspense>
  );
}
