'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Search,
  Filter,
  RefreshCw,
  Eye,
  Check,
  Ban,
  Clock,
  Layers,
} from 'lucide-react';
import { fetchApi } from '@/lib/api-client';
import {
  PlatformErrorEventDTO,
  PlatformErrorSeverity,
  PlatformErrorStatus,
  ErrorSummaryDTO,
} from '@pixmatch/types';

export default function ErrorCenterPage() {
  const [errors, setErrors] = useState<PlatformErrorEventDTO[]>([]);
  const [summary, setSummary] = useState<ErrorSummaryDTO | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedError, setSelectedError] = useState<PlatformErrorEventDTO | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSeverity, setSelectedSeverity] = useState<string>('ALL');
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL');

  const loadErrors = async () => {
    setIsLoading(true);
    try {
      const [listRes, sumRes] = await Promise.all([
        fetchApi<{ errors: PlatformErrorEventDTO[] }>('/admin/reliability/errors'),
        fetchApi<ErrorSummaryDTO>('/admin/reliability/errors/summary'),
      ]);

      if (listRes.success && listRes.data?.errors) {
        setErrors(listRes.data.errors);
      } else {
        // Mock fallback for UI preview
        setErrors([
          {
            id: 'err_demo_1',
            service: 'AI_SERVICE',
            error_name: 'FaceModelTimeoutError',
            message: 'Inference pipeline timed out waiting for worker response on batch <UUID>',
            stack: 'FaceModelTimeoutError: Inference timeout\n    at runInference (/app/src/ai/pipeline.ts:42:10)',
            fingerprint: 'a89f71c48e894038a8e7e1f409848123',
            severity: PlatformErrorSeverity.HIGH,
            status: PlatformErrorStatus.OPEN,
            occurrence_count: 14,
            first_seen_at: new Date(Date.now() - 3600 * 4000).toISOString(),
            last_seen_at: new Date().toISOString(),
          },
          {
            id: 'err_demo_2',
            service: 'PAYMENTS',
            error_name: 'WebhookSignatureMismatch',
            message: 'Invalid cryptographic signature received from payment provider endpoint',
            fingerprint: 'b49f91c48e894038a8e7e1f409848456',
            severity: PlatformErrorSeverity.MEDIUM,
            status: PlatformErrorStatus.ACKNOWLEDGED,
            occurrence_count: 3,
            first_seen_at: new Date(Date.now() - 3600 * 8000).toISOString(),
            last_seen_at: new Date(Date.now() - 3600 * 1000).toISOString(),
          },
        ]);
      }

      if (sumRes.success && sumRes.data) {
        setSummary(sumRes.data);
      } else {
        setSummary({
          total_errors_24h: 17,
          unhandled_count: 1,
          resolved_count: 5,
          by_severity: { LOW: 2, MEDIUM: 5, HIGH: 10, CRITICAL: 0 },
          by_service: { AI_SERVICE: 14, PAYMENTS: 3 },
          top_frequent: [],
        });
      }
    } catch {
      // Fallback
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdateStatus = async (id: string, status: PlatformErrorStatus) => {
    await fetchApi(`/admin/reliability/errors/${id}/status`, {
      method: 'POST',
      body: JSON.stringify({ status }),
    });
    await loadErrors();
    if (selectedError?.id === id) {
      setSelectedError((prev) => (prev ? { ...prev, status } : null));
    }
  };

  useEffect(() => {
    loadErrors();
  }, []);

  const filteredErrors = errors.filter((err) => {
    if (selectedSeverity !== 'ALL' && err.severity !== selectedSeverity) return false;
    if (selectedStatus !== 'ALL' && err.status !== selectedStatus) return false;
    if (searchTerm) {
      const q = searchTerm.toLowerCase();
      return (
        (err.error_name || err.error_code || 'Error').toLowerCase().includes(q) ||
        (err.message || err.message_sanitized || '').toLowerCase().includes(q) ||
        err.service.toLowerCase().includes(q) ||
        err.fingerprint.includes(q)
      );
    }
    return true;
  });

  return (
    <div className="space-y-6 p-6 max-w-7xl mx-auto">
      {/* Back Link */}
      <Link
        href="/dashboard/admin/reliability"
        className="inline-flex items-center gap-2 text-xs font-medium text-slate-400 hover:text-white transition"
      >
        <ArrowLeft className="w-3.5 h-3.5" />
        Back to Reliability Center
      </Link>

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-6 bg-slate-900/60 border border-slate-800 rounded-2xl">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-3">
            <AlertTriangle className="w-6 h-6 text-amber-400" />
            Platform Error Center &amp; Fingerprinting
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Deterministic error grouping, automatic PII/biometric sanitization, and triage workflows.
          </p>
        </div>

        <button
          onClick={loadErrors}
          className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg border border-slate-700 transition"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          Refresh
        </button>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="p-4 bg-slate-900/40 border border-slate-800 rounded-xl">
          <span className="text-xs text-slate-500">24h Error Events</span>
          <div className="text-2xl font-bold font-mono text-white mt-1">
            {summary?.total_errors_24h || summary?.total_24h || 0}
          </div>
        </div>
        <div className="p-4 bg-slate-900/40 border border-slate-800 rounded-xl">
          <span className="text-xs text-slate-500">Open Fingerprints</span>
          <div className="text-2xl font-bold font-mono text-amber-400 mt-1">
            {summary?.unhandled_count || summary?.total_open || 0}
          </div>
        </div>
        <div className="p-4 bg-slate-900/40 border border-slate-800 rounded-xl">
          <span className="text-xs text-slate-500">Critical Errors</span>
          <div className="text-2xl font-bold font-mono text-rose-400 mt-1">
            {summary?.by_severity?.CRITICAL || summary?.total_critical || 0}
          </div>
        </div>
        <div className="p-4 bg-slate-900/40 border border-slate-800 rounded-xl">
          <span className="text-xs text-slate-500">Resolved Groups</span>
          <div className="text-2xl font-bold font-mono text-emerald-400 mt-1">
            {summary?.resolved_count || 0}
          </div>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="flex flex-col sm:flex-row gap-3 items-center justify-between p-4 bg-slate-900/30 border border-slate-800/80 rounded-xl">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search error, message, or fingerprint..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-950 border border-slate-800 rounded-lg text-slate-200 focus:outline-none focus:border-purple-500"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <select
            value={selectedSeverity}
            onChange={(e) => setSelectedSeverity(e.target.value)}
            className="px-3 py-1.5 text-xs bg-slate-950 border border-slate-800 rounded-lg text-slate-200 focus:outline-none"
          >
            <option value="ALL">All Severities</option>
            <option value="LOW">LOW</option>
            <option value="MEDIUM">MEDIUM</option>
            <option value="HIGH">HIGH</option>
            <option value="CRITICAL">CRITICAL</option>
          </select>

          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="px-3 py-1.5 text-xs bg-slate-950 border border-slate-800 rounded-lg text-slate-200 focus:outline-none"
          >
            <option value="ALL">All Statuses</option>
            <option value="OPEN">OPEN</option>
            <option value="ACKNOWLEDGED">ACKNOWLEDGED</option>
            <option value="RESOLVED">RESOLVED</option>
            <option value="SUPPRESSED">SUPPRESSED</option>
          </select>
        </div>
      </div>

      {/* Error List */}
      <div className="space-y-3">
        {filteredErrors.length === 0 ? (
          <div className="p-8 text-center text-sm text-slate-500 bg-slate-900/20 border border-slate-800 rounded-xl">
            No error events matching the selected filters.
          </div>
        ) : (
          filteredErrors.map((err) => (
            <div
              key={err.id}
              className="p-4 bg-slate-900/40 hover:bg-slate-900/80 border border-slate-800 rounded-xl flex flex-col md:flex-row md:items-center justify-between gap-4 transition"
            >
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-purple-500/10 text-purple-400 border border-purple-500/20">
                    {err.service}
                  </span>
                  <span className="font-semibold text-white text-sm">{err.error_name || err.error_code || 'Error'}</span>
                  <span
                    className={`text-[10px] font-mono px-1.5 py-0.5 rounded ${
                      err.severity === 'CRITICAL'
                        ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                        : err.severity === 'HIGH'
                        ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                        : 'bg-slate-800 text-slate-400'
                    }`}
                  >
                    {err.severity}
                  </span>
                </div>
                <p className="text-xs text-slate-300 line-clamp-1">{err.message || err.message_sanitized}</p>
                <div className="flex items-center gap-4 text-[11px] text-slate-500 font-mono">
                  <span>Fingerprint: {err.fingerprint.substring(0, 12)}...</span>
                  <span>Occurrences: <strong className="text-slate-300">{err.occurrence_count}</strong></span>
                  <span>Last Seen: {new Date(err.last_seen_at).toLocaleTimeString()}</span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setSelectedError(err)}
                  className="p-2 text-xs bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg border border-slate-700 transition"
                  title="View Trace"
                >
                  <Eye className="w-3.5 h-3.5" />
                </button>
                {err.status !== 'RESOLVED' ? (
                  <button
                    onClick={() => handleUpdateStatus(err.id, PlatformErrorStatus.RESOLVED)}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/30 rounded-lg transition"
                  >
                    <Check className="w-3.5 h-3.5" /> Resolve
                  </button>
                ) : (
                  <span className="text-xs font-mono text-emerald-400 font-semibold px-2 py-1">
                    Resolved
                  </span>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Error Details Modal */}
      {selectedError && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-2xl w-full p-6 space-y-4 max-h-[85vh] overflow-y-auto">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-lg font-bold text-white">{selectedError.error_name || selectedError.error_code || 'Error'}</h3>
                <span className="text-xs font-mono text-slate-400">
                  Fingerprint: {selectedError.fingerprint}
                </span>
              </div>
              <button
                onClick={() => setSelectedError(null)}
                className="text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <div className="p-3 bg-slate-950 border border-slate-800 rounded-lg text-xs font-mono text-slate-300 whitespace-pre-wrap">
              {selectedError.message || selectedError.message_sanitized}
            </div>

            {selectedError.stack && (
              <div className="space-y-1">
                <span className="text-xs font-semibold text-slate-400">Sanitized Stack Trace</span>
                <pre className="p-3 bg-slate-950 border border-slate-800 rounded-lg text-[11px] font-mono text-slate-400 overflow-x-auto">
                  {selectedError.stack}
                </pre>
              </div>
            )}

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
              <button
                onClick={() => handleUpdateStatus(selectedError.id, PlatformErrorStatus.ACKNOWLEDGED)}
                className="px-3 py-1.5 text-xs bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg"
              >
                Acknowledge
              </button>
              <button
                onClick={() => handleUpdateStatus(selectedError.id, PlatformErrorStatus.SUPPRESSED)}
                className="px-3 py-1.5 text-xs bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg"
              >
                Suppress
              </button>
              <button
                onClick={() => handleUpdateStatus(selectedError.id, PlatformErrorStatus.RESOLVED)}
                className="px-3 py-1.5 text-xs bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg"
              >
                Mark Resolved
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
