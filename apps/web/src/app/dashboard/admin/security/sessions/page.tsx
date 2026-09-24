'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';

interface SessionItem {
  id: string;
  adminId: string;
  adminEmail: string;
  ipAddressMasked: string;
  userAgent: string;
  deviceType: string;
  browser: string;
  os: string;
  location?: string;
  isCurrent: boolean;
  status: 'ACTIVE' | 'EXPIRED' | 'REVOKED' | 'ROTATED';
  createdAt: string;
  lastActiveAt: string;
  idleExpiresAt: string;
  absoluteExpiresAt: string;
}

export default function AdminSessionsPage() {
  const [sessions, setSessions] = useState<SessionItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [revokingId, setRevokingId] = useState<string | null>(null);
  const [revokingAll, setRevokingAll] = useState(false);

  useEffect(() => {
    fetchSessions();
  }, []);

  const fetchSessions = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch('/api/admin/auth/sessions', {
        headers: { 'Content-Type': 'application/json' },
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || 'Failed to fetch sessions');
      }
      setSessions(data.sessions || []);
    } catch (err: any) {
      setError(err.message || 'Error loading sessions');
    } finally {
      setLoading(false);
    }
  };

  const handleRevokeSession = async (sessionId: string) => {
    if (!confirm('Are you sure you want to terminate this session?')) return;
    try {
      setRevokingId(sessionId);
      setError(null);
      setSuccess(null);
      const res = await fetch(`/api/admin/auth/sessions/${sessionId}/revoke`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || 'Failed to terminate session');
      }
      setSuccess('Session revoked successfully.');
      await fetchSessions();
    } catch (err: any) {
      setError(err.message || 'Error revoking session');
    } finally {
      setRevokingId(null);
    }
  };

  const handleRevokeAllOther = async () => {
    if (!confirm('Are you sure you want to terminate all other active administrator sessions?')) return;
    try {
      setRevokingAll(true);
      setError(null);
      setSuccess(null);
      const res = await fetch('/api/admin/auth/logout-all', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ preserveCurrent: true }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || 'Failed to revoke other sessions');
      }
      setSuccess(`Terminated ${data.revokedCount || 0} other sessions successfully.`);
      await fetchSessions();
    } catch (err: any) {
      setError(err.message || 'Error revoking all other sessions');
    } finally {
      setRevokingAll(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-6 sm:p-10">
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Navigation & Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-6">
          <div>
            <div className="flex items-center gap-2 text-sm text-slate-400 mb-1">
              <Link href="/dashboard/admin" className="hover:text-cyan-400 transition-colors">
                Control Center
              </Link>
              <span>/</span>
              <span>Security</span>
              <span>/</span>
              <span className="text-slate-200">Active Sessions</span>
            </div>
            <h1 className="text-3xl font-bold tracking-tight text-white flex items-center gap-3">
              <span className="p-2 rounded-lg bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
              </span>
              Administrator Active Sessions
            </h1>
            <p className="text-slate-400 text-sm mt-1">
              Inspect active platform administrator sessions, track access locations, and revoke untrusted devices.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={fetchSessions}
              disabled={loading}
              className="px-4 py-2 bg-slate-900 hover:bg-slate-800 border border-slate-700 rounded-lg text-sm font-medium text-slate-300 transition-all flex items-center gap-2"
            >
              <svg className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Refresh
            </button>
            <button
              onClick={handleRevokeAllOther}
              disabled={revokingAll || sessions.length <= 1}
              className="px-4 py-2 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 rounded-lg text-sm font-medium text-rose-400 transition-all flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
              {revokingAll ? 'Terminating...' : 'Revoke All Other Devices'}
            </button>
          </div>
        </div>

        {/* Feedback alerts */}
        {error && (
          <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-sm flex items-center gap-3">
            <svg className="w-5 h-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>{error}</span>
          </div>
        )}

        {success && (
          <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-sm flex items-center gap-3">
            <svg className="w-5 h-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            <span>{success}</span>
          </div>
        )}

        {/* Session Invariants & Security Notice */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-slate-900/60 border border-slate-800/80 rounded-xl p-4">
            <div className="text-xs uppercase tracking-wider text-slate-500 font-semibold mb-1">Session Invariants</div>
            <div className="text-lg font-bold text-slate-200">30 Min Idle / 12 Hr Max</div>
            <div className="text-xs text-slate-400 mt-1">Automatic timeout enforcement with SHA-256 token hashing at rest.</div>
          </div>

          <div className="bg-slate-900/60 border border-slate-800/80 rounded-xl p-4">
            <div className="text-xs uppercase tracking-wider text-slate-500 font-semibold mb-1">Cookie Boundary</div>
            <div className="text-lg font-bold text-slate-200">pixmatch_admin_session</div>
            <div className="text-xs text-slate-400 mt-1">HttpOnly, Secure, SameSite=Strict cookie isolated from client apps.</div>
          </div>

          <div className="bg-slate-900/60 border border-slate-800/80 rounded-xl p-4">
            <div className="text-xs uppercase tracking-wider text-slate-500 font-semibold mb-1">Active Device Sessions</div>
            <div className="text-lg font-bold text-cyan-400">{sessions.filter(s => s.status === 'ACTIVE').length} Active</div>
            <div className="text-xs text-slate-400 mt-1">Total active administrator tokens authorized across infrastructure.</div>
          </div>
        </div>

        {/* Sessions List */}
        <div className="bg-slate-900/40 border border-slate-800 rounded-2xl overflow-hidden backdrop-blur-sm shadow-xl">
          <div className="px-6 py-4 border-b border-slate-800 bg-slate-900/80 flex items-center justify-between">
            <h2 className="text-base font-semibold text-slate-200">Authorized Sessions</h2>
            <span className="text-xs text-slate-400">Total: {sessions.length}</span>
          </div>

          {loading ? (
            <div className="p-12 text-center text-slate-500">
              <svg className="w-8 h-8 animate-spin mx-auto mb-3 text-cyan-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Loading active administrator sessions...
            </div>
          ) : sessions.length === 0 ? (
            <div className="p-12 text-center text-slate-500">No active administrator sessions found.</div>
          ) : (
            <div className="divide-y divide-slate-800/60">
              {sessions.map((session) => (
                <div
                  key={session.id}
                  className={`p-6 flex flex-col md:flex-row md:items-center justify-between gap-4 transition-colors ${
                    session.isCurrent ? 'bg-cyan-950/10 border-l-4 border-l-cyan-500' : 'hover:bg-slate-900/40'
                  }`}
                >
                  <div className="space-y-2">
                    <div className="flex items-center gap-3">
                      <span className="font-semibold text-white text-base">
                        {session.browser || 'Unknown Browser'} on {session.os || 'Unknown OS'}
                      </span>
                      {session.isCurrent && (
                        <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                          Current Device
                        </span>
                      )}
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                          session.status === 'ACTIVE'
                            ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                            : 'bg-slate-700 text-slate-400'
                        }`}
                      >
                        {session.status}
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-x-6 gap-y-1 text-xs text-slate-400">
                      <div className="flex items-center gap-1.5">
                        <span className="text-slate-500">IP:</span>
                        <span className="font-mono text-slate-300">{session.ipAddressMasked}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-slate-500">Device:</span>
                        <span className="text-slate-300">{session.deviceType}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-slate-500">Created:</span>
                        <span className="text-slate-300">{new Date(session.createdAt).toLocaleString()}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-slate-500">Last Active:</span>
                        <span className="text-slate-300">{new Date(session.lastActiveAt).toLocaleString()}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    {!session.isCurrent && session.status === 'ACTIVE' && (
                      <button
                        onClick={() => handleRevokeSession(session.id)}
                        disabled={revokingId === session.id}
                        className="px-3.5 py-1.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 rounded-lg text-xs font-medium transition-all"
                      >
                        {revokingId === session.id ? 'Revoking...' : 'Terminate Session'}
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
