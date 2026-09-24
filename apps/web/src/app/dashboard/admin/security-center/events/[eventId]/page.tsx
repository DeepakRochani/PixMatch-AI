'use client';

import React, { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import {
  ShieldAlert,
  ArrowLeft,
  Flame,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  FileText,
  UserCheck,
  Zap,
  Activity,
  Copy,
  Check,
} from 'lucide-react';
import {
  PlatformSecurityEventDTO,
  PlatformSecurityInvestigationDTO,
  SecurityEventStatus,
} from '@pixmatch/types';

function EventDetailContent() {
  const params = useParams();
  const router = useRouter();
  const eventId = params.eventId as string;

  const [event, setEvent] = useState<PlatformSecurityEventDTO | null>(null);
  const [investigation, setInvestigation] = useState<PlatformSecurityInvestigationDTO | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [copiedFingerprint, setCopiedFingerprint] = useState<boolean>(false);

  // Status Change Dialog State
  const [falsePositiveReason, setFalsePositiveReason] = useState<string>('');
  const [showFpModal, setShowFpModal] = useState<boolean>(false);
  const [updating, setUpdating] = useState<boolean>(false);

  const fetchEvent = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/admin/security-center/events/${eventId}`);
      if (res.ok) {
        const d = await res.json();
        if (d.success) {
          setEvent(d.data);
          if (d.data.investigation) {
            setInvestigation(d.data.investigation);
          }
        }
      }
    } catch (e) {
      console.error('Failed to load event details:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (eventId) fetchEvent();
  }, [eventId]);

  const handleStatusUpdate = async (newStatus: SecurityEventStatus) => {
    try {
      setUpdating(true);
      const res = await fetch(`/api/admin/security-center/events/${eventId}/status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
      if (res.ok) {
        await fetchEvent();
      }
    } catch (e) {
      console.error('Failed to update event status:', e);
    } finally {
      setUpdating(false);
    }
  };

  const handleMarkFalsePositive = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!falsePositiveReason.trim()) return;

    try {
      setUpdating(true);
      const res = await fetch(`/api/admin/security-center/events/${eventId}/false-positive`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: falsePositiveReason }),
      });
      if (res.ok) {
        setShowFpModal(false);
        setFalsePositiveReason('');
        await fetchEvent();
      }
    } catch (e) {
      console.error('Failed to mark false positive:', e);
    } finally {
      setUpdating(false);
    }
  };

  const handleStartInvestigation = async () => {
    try {
      setUpdating(true);
      const res = await fetch(`/api/admin/security-center/investigations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          security_event_id: eventId,
          initial_note: `Automated investigation initiated from Security Event ${eventId}`,
        }),
      });
      if (res.ok) {
        const d = await res.json();
        if (d.success && d.data) {
          router.push(`/dashboard/admin/security-center/investigations`);
        }
      }
    } catch (e) {
      console.error('Failed to start investigation:', e);
    } finally {
      setUpdating(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedFingerprint(true);
    setTimeout(() => setCopiedFingerprint(false), 2000);
  };

  if (loading) {
    return <div className="p-8 text-center text-muted text-xs">Loading event details...</div>;
  }

  if (!event) {
    return (
      <div className="p-8 text-center text-muted text-xs space-y-4">
        <p>Security event not found.</p>
        <Link
          href="/dashboard/admin/security-center/events"
          className="inline-flex items-center gap-1 text-amber-400 hover:underline"
        >
          <ArrowLeft className="h-4 w-4" /> Return to Threat Events
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-card-border/80 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <Link
              href="/dashboard/admin/security-center/events"
              className="p-1 rounded-lg bg-card-border/60 hover:bg-card-border text-muted hover:text-white transition"
            >
              <ArrowLeft className="h-4 w-4" />
            </Link>
            <h1 className="text-2xl font-bold tracking-tight text-white font-mono">
              {event.event_type}
            </h1>
          </div>
          <p className="text-xs text-muted mt-1">
            Deterministic Security Event ID: <span className="font-mono text-zinc-300">{event.id}</span>
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2 flex-wrap">
          {event.status === 'OPEN' && (
            <button
              onClick={() => handleStatusUpdate(SecurityEventStatus.ACKNOWLEDGED)}
              disabled={updating}
              className="px-3 py-2 rounded-xl bg-card-border/60 hover:bg-card-border text-xs font-semibold text-white transition border border-card-border"
            >
              Acknowledge
            </button>
          )}

          {event.status !== 'RESOLVED' && event.status !== 'FALSE_POSITIVE' && (
            <>
              <button
                onClick={() => handleStatusUpdate(SecurityEventStatus.CONTAINED)}
                disabled={updating}
                className="px-3 py-2 rounded-xl bg-amber-600/80 hover:bg-amber-600 text-xs font-semibold text-white transition"
              >
                Mark Contained
              </button>
              <button
                onClick={() => handleStatusUpdate(SecurityEventStatus.RESOLVED)}
                disabled={updating}
                className="px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-xs font-semibold text-white transition shadow-lg shadow-emerald-600/20"
              >
                Resolve Event
              </button>
              <button
                onClick={() => setShowFpModal(true)}
                disabled={updating}
                className="px-3 py-2 rounded-xl bg-red-950/60 hover:bg-red-900/60 text-xs font-semibold text-red-300 transition border border-red-800/40"
              >
                Mark False Positive
              </button>
            </>
          )}

          {!investigation && event.status !== 'RESOLVED' && event.status !== 'FALSE_POSITIVE' && (
            <button
              onClick={handleStartInvestigation}
              disabled={updating}
              className="px-3 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-xs font-semibold text-white transition shadow-lg shadow-blue-600/20"
            >
              Start Investigation
            </button>
          )}
        </div>
      </div>

      {/* Grid: Primary details + Metadata */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Metadata & Core Parameters */}
        <div className="lg:col-span-2 space-y-6">
          <div className="rounded-2xl bg-[#0B0F17] border border-card-border p-5 space-y-4">
            <h3 className="text-sm font-bold text-white flex items-center gap-2 border-b border-card-border/80 pb-3">
              <ShieldAlert className="h-4 w-4 text-amber-400" />
              Detection Characteristics
            </h3>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-xs">
              <div>
                <span className="text-[10px] text-muted uppercase font-bold">Category</span>
                <p className="text-white font-medium mt-0.5">{event.category}</p>
              </div>
              <div>
                <span className="text-[10px] text-muted uppercase font-bold">Severity</span>
                <p className="text-white font-medium mt-0.5">{event.severity}</p>
              </div>
              <div>
                <span className="text-[10px] text-muted uppercase font-bold">Confidence</span>
                <p className="text-white font-medium mt-0.5">{event.confidence}</p>
              </div>
              <div>
                <span className="text-[10px] text-muted uppercase font-bold">Status</span>
                <p className="text-white font-medium mt-0.5">{event.status}</p>
              </div>
              <div>
                <span className="text-[10px] text-muted uppercase font-bold">Total Occurrences</span>
                <p className="text-white font-medium mt-0.5">{event.occurrence_count}</p>
              </div>
              <div>
                <span className="text-[10px] text-muted uppercase font-bold">Emitting Service</span>
                <p className="text-white font-mono mt-0.5">{event.service}</p>
              </div>
            </div>

            <div className="border-t border-card-border/60 pt-3 space-y-2 text-xs">
              <div>
                <span className="text-[10px] text-muted uppercase font-bold">Reason Code</span>
                <p className="text-amber-400 font-mono mt-0.5">{event.reason_code}</p>
              </div>
              <div>
                <span className="text-[10px] text-muted uppercase font-bold">SHA-256 Event Fingerprint</span>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="font-mono text-[11px] text-zinc-300 break-all bg-[#0E1422] p-2 rounded-lg border border-card-border flex-1">
                    {event.fingerprint}
                  </span>
                  <button
                    onClick={() => copyToClipboard(event.fingerprint)}
                    className="p-2 rounded-lg bg-card-border/60 hover:bg-card-border text-muted hover:text-white transition"
                    title="Copy fingerprint"
                  >
                    {copiedFingerprint ? <Check className="h-4 w-4 text-emerald-400" /> : <Copy className="h-4 w-4" />}
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Sanitized Metadata JSON */}
          <div className="rounded-2xl bg-[#0B0F17] border border-card-border p-5 space-y-3">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <FileText className="h-4 w-4 text-blue-400" />
              Sanitized Telemetry Metadata (Privacy-Minimizing)
            </h3>
            <p className="text-[11px] text-muted">
              All raw tokens, passwords, cookies, face vectors, and credentials are deterministically stripped prior to persistence.
            </p>
            <pre className="p-4 rounded-xl bg-[#070A0F] border border-card-border text-[11px] font-mono text-emerald-400 overflow-x-auto max-h-80">
              {JSON.stringify(event.sanitized_metadata, null, 2)}
            </pre>
          </div>
        </div>

        {/* Right Column: Identity, Context & Investigation */}
        <div className="space-y-6">
          <div className="rounded-2xl bg-[#0B0F17] border border-card-border p-5 space-y-4">
            <h3 className="text-sm font-bold text-white border-b border-card-border/80 pb-3">
              Context & Traceability
            </h3>

            <div className="space-y-3 text-xs">
              <div>
                <span className="text-[10px] text-muted uppercase font-bold">Studio Tenant ID</span>
                <p className="font-mono text-zinc-300 mt-0.5">{event.studio_id || 'N/A (Global / Platform Scope)'}</p>
              </div>
              <div>
                <span className="text-[10px] text-muted uppercase font-bold">User / Admin ID</span>
                <p className="font-mono text-zinc-300 mt-0.5">{event.admin_user_id || event.user_id || 'N/A (Unauthenticated Actor)'}</p>
              </div>
              <div>
                <span className="text-[10px] text-muted uppercase font-bold">IP Hash</span>
                <p className="font-mono text-[11px] text-zinc-400 mt-0.5 break-all">{event.ip_hash || 'N/A'}</p>
              </div>
              <div>
                <span className="text-[10px] text-muted uppercase font-bold">Correlation ID (Phase 41)</span>
                <p className="font-mono text-[11px] text-zinc-400 mt-0.5 break-all">{event.correlation_id || 'N/A'}</p>
              </div>
              <div>
                <span className="text-[10px] text-muted uppercase font-bold">First Seen</span>
                <p className="text-zinc-300 mt-0.5">{new Date(event.first_seen_at).toLocaleString()}</p>
              </div>
              <div>
                <span className="text-[10px] text-muted uppercase font-bold">Last Seen</span>
                <p className="text-zinc-300 mt-0.5">{new Date(event.last_seen_at).toLocaleString()}</p>
              </div>
            </div>
          </div>

          {investigation && (
            <div className="rounded-2xl bg-[#0E1422] border border-blue-500/30 p-5 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold text-white flex items-center gap-1.5">
                  <Activity className="h-4 w-4 text-blue-400" />
                  Linked Investigation
                </h3>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-500/20 text-blue-400 border border-blue-500/30">
                  {investigation.status}
                </span>
              </div>
              <p className="text-xs text-muted">
                Assigned Admin: <span className="text-white font-semibold">{investigation.assigned_admin_name || investigation.assigned_admin_id}</span>
              </p>
              <Link
                href={`/dashboard/admin/security-center/investigations`}
                className="block text-center px-3 py-2 rounded-xl bg-blue-600/80 hover:bg-blue-600 text-xs font-semibold text-white transition"
              >
                Open Investigation Console
              </Link>
            </div>
          )}
        </div>
      </div>

      {/* False Positive Modal */}
      {showFpModal && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
          <div className="max-w-md w-full rounded-2xl bg-[#0E1422] border border-card-border p-6 space-y-4 shadow-2xl">
            <h3 className="text-base font-bold text-white">Mark Event as False Positive</h3>
            <p className="text-xs text-muted leading-relaxed">
              Marking an event as a false positive records an immutable audit log entry. Please provide a substantive rationale.
            </p>
            <form onSubmit={handleMarkFalsePositive} className="space-y-4">
              <textarea
                required
                rows={3}
                placeholder="Explain why this detection signal is a benign false positive..."
                value={falsePositiveReason}
                onChange={(e) => setFalsePositiveReason(e.target.value)}
                className="w-full p-3 rounded-xl bg-[#070A0F] border border-card-border text-xs text-white placeholder-muted focus:outline-none focus:border-amber-500"
              />
              <div className="flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowFpModal(false)}
                  className="px-3 py-2 rounded-xl bg-card-border/60 hover:bg-card-border text-xs font-semibold text-white transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={updating || !falsePositiveReason.trim()}
                  className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-xs font-semibold text-white transition"
                >
                  Confirm False Positive
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default function EventDetailPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-muted text-xs">Loading Event Detail...</div>}>
      <EventDetailContent />
    </Suspense>
  );
}
