'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';

interface MfaStatus {
  enabled: boolean;
  status: 'PENDING' | 'ACTIVE' | 'DISABLED';
  enrolledAt?: string;
  lastUsedAt?: string;
  backupCodesRemaining: number;
}

interface AuthAuditLog {
  id: string;
  eventType: string;
  ipAddressMasked: string;
  userAgent: string;
  timestamp: string;
  metadata?: Record<string, any>;
}

export default function AdminAuthenticationSecurityPage() {
  const [mfaStatus, setMfaStatus] = useState<MfaStatus | null>(null);
  const [logs, setLogs] = useState<AuthAuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // MFA Enrollment Modal State
  const [enrolling, setEnrolling] = useState(false);
  const [enrollData, setEnrollData] = useState<{
    secret: string;
    totpUri: string;
    recoveryCodes: string[];
  } | null>(null);
  const [confirmCode, setConfirmCode] = useState('');
  const [submittingConfirm, setSubmittingConfirm] = useState(false);

  useEffect(() => {
    fetchSecurityData();
  }, []);

  const fetchSecurityData = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch('/api/admin/auth/security-status', {
        headers: { 'Content-Type': 'application/json' },
      });
      const data = await res.json();
      if (res.ok) {
        setMfaStatus(data.mfaStatus || { enabled: false, status: 'DISABLED', backupCodesRemaining: 0 });
        setLogs(data.auditLogs || []);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load security status');
    } finally {
      setLoading(false);
    }
  };

  const handleStartEnrollment = async () => {
    try {
      setEnrolling(true);
      setError(null);
      const res = await fetch('/api/admin/auth/mfa/enroll', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || 'Failed to start MFA enrollment');
      }
      setEnrollData({
        secret: data.secret,
        totpUri: data.totpUri,
        recoveryCodes: data.recoveryCodes || [],
      });
    } catch (err: any) {
      setError(err.message || 'Error starting enrollment');
      setEnrolling(false);
    }
  };

  const handleConfirmMfa = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!confirmCode || confirmCode.length !== 6) {
      setError('Please enter a valid 6-digit TOTP code.');
      return;
    }

    try {
      setSubmittingConfirm(true);
      setError(null);
      const res = await fetch('/api/admin/auth/mfa/confirm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: confirmCode }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || 'Verification code invalid');
      }
      setSuccess('Two-factor authentication successfully enabled!');
      setEnrolling(false);
      setEnrollData(null);
      setConfirmCode('');
      await fetchSecurityData();
    } catch (err: any) {
      setError(err.message || 'Failed to confirm MFA');
    } finally {
      setSubmittingConfirm(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-6 sm:p-10">
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Navigation Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-6">
          <div>
            <div className="flex items-center gap-2 text-sm text-slate-400 mb-1">
              <Link href="/dashboard/admin" className="hover:text-cyan-400 transition-colors">
                Control Center
              </Link>
              <span>/</span>
              <span>Security</span>
              <span>/</span>
              <span className="text-slate-200">Authentication & MFA</span>
            </div>
            <h1 className="text-3xl font-bold tracking-tight text-white flex items-center gap-3">
              <span className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
              </span>
              Administrator Authentication & MFA
            </h1>
            <p className="text-slate-400 text-sm mt-1">
              Configure Two-Factor Authentication (TOTP), monitor security events, and manage emergency recovery codes.
            </p>
          </div>

          <div>
            <Link
              href="/dashboard/admin/security/sessions"
              className="px-4 py-2 bg-slate-900 hover:bg-slate-800 border border-slate-700 rounded-lg text-sm font-medium text-slate-300 transition-all flex items-center gap-2"
            >
              View Active Sessions
            </Link>
          </div>
        </div>

        {/* Feedback Alerts */}
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

        {/* MFA Configuration Card */}
        <div className="bg-slate-900/40 border border-slate-800 rounded-2xl p-6 backdrop-blur-sm shadow-xl space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800/80 pb-4">
            <div>
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <span>Two-Factor Authentication (RFC 6238 TOTP)</span>
                {mfaStatus?.enabled ? (
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                    Active & Enforced
                  </span>
                ) : (
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-500/20 text-amber-400 border border-amber-500/30">
                    Not Configured
                  </span>
                )}
              </h2>
              <p className="text-slate-400 text-sm mt-1">
                Protect administrative operations by requiring a 6-digit TOTP code generated by Google Authenticator, Authy, or 1Password.
              </p>
            </div>

            <div>
              {!mfaStatus?.enabled ? (
                <button
                  onClick={handleStartEnrollment}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-sm font-semibold shadow-lg shadow-emerald-900/30 transition-all flex items-center gap-2"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  Enable 2FA Now
                </button>
              ) : (
                <div className="text-right">
                  <div className="text-xs text-slate-400">Recovery Codes Available</div>
                  <div className="text-base font-bold text-slate-200">{mfaStatus.backupCodesRemaining} Remaining</div>
                </div>
              )}
            </div>
          </div>

          {/* MFA Invariants & Security Parameters */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800">
              <div className="text-xs uppercase tracking-wider text-slate-500 font-semibold mb-1">Algorithm</div>
              <div className="text-sm font-bold text-slate-200">HMAC-SHA1 / 30s Step</div>
              <div className="text-xs text-slate-400 mt-1">Full RFC 6238 standard compliance with ±1 drift tolerance.</div>
            </div>

            <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800">
              <div className="text-xs uppercase tracking-wider text-slate-500 font-semibold mb-1">Secret Storage</div>
              <div className="text-sm font-bold text-slate-200">AES-256-GCM Encrypted</div>
              <div className="text-xs text-slate-400 mt-1">Secrets are encrypted at rest with hardware-grade authenticated encryption.</div>
            </div>

            <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800">
              <div className="text-xs uppercase tracking-wider text-slate-500 font-semibold mb-1">Replay Protection</div>
              <div className="text-sm font-bold text-emerald-400">Enforced Server-Side</div>
              <div className="text-xs text-slate-400 mt-1">Used timestamps are tracked to prevent OTP replay attacks.</div>
            </div>
          </div>
        </div>

        {/* Enrollment Modal / Form */}
        {enrolling && enrollData && (
          <div className="p-6 rounded-2xl bg-cyan-950/20 border border-cyan-500/30 space-y-6 animate-in fade-in duration-200">
            <div className="flex items-center justify-between border-b border-cyan-500/20 pb-4">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <span className="p-1 rounded bg-cyan-500/20 text-cyan-400">Step 1</span>
                Scan QR or Enter Secret in Authenticator App
              </h3>
              <button
                onClick={() => setEnrolling(false)}
                className="text-slate-400 hover:text-slate-200 text-sm font-medium"
              >
                Cancel
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 font-mono text-xs break-all text-cyan-300">
                  <div className="text-slate-500 text-xs font-sans mb-1 font-semibold uppercase tracking-wider">Base32 Secret</div>
                  {enrollData.secret}
                </div>

                <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 font-mono text-xs break-all text-slate-300">
                  <div className="text-slate-500 text-xs font-sans mb-1 font-semibold uppercase tracking-wider">TOTP URI</div>
                  {enrollData.totpUri}
                </div>

                <div className="space-y-2">
                  <div className="text-sm font-bold text-amber-400 flex items-center gap-1.5">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                    Emergency Backup Recovery Codes
                  </div>
                  <p className="text-xs text-slate-400">
                    Save these single-use codes safely. If you lose access to your authenticator, each code can be used exactly once to log in.
                  </p>
                  <div className="grid grid-cols-2 gap-2 p-3 rounded-lg bg-slate-950 border border-slate-800 font-mono text-xs text-slate-200">
                    {enrollData.recoveryCodes.map((code, idx) => (
                      <div key={idx} className="p-1 rounded bg-slate-900 text-center font-bold">
                        {code}
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <form onSubmit={handleConfirmMfa} className="space-y-4 flex flex-col justify-between">
                <div className="space-y-3">
                  <h4 className="text-sm font-bold text-white">Step 2: Confirm 6-Digit Code</h4>
                  <p className="text-xs text-slate-400">
                    Enter the current code displayed in your authenticator app to complete activation.
                  </p>
                  <input
                    type="text"
                    maxLength={6}
                    placeholder="000000"
                    value={confirmCode}
                    onChange={(e) => setConfirmCode(e.target.value.replace(/\D/g, ''))}
                    className="w-full text-center tracking-[0.5em] text-2xl font-mono py-3 bg-slate-950 border border-cyan-500/40 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
                  />
                </div>

                <button
                  type="submit"
                  disabled={submittingConfirm || confirmCode.length !== 6}
                  className="w-full py-3 bg-cyan-500 hover:bg-cyan-400 disabled:opacity-50 font-bold text-slate-950 rounded-xl transition-all shadow-lg shadow-cyan-500/20"
                >
                  {submittingConfirm ? 'Activating...' : 'Verify & Enable MFA'}
                </button>
              </form>
            </div>
          </div>
        )}

        {/* Security Audit Events */}
        <div className="bg-slate-900/40 border border-slate-800 rounded-2xl overflow-hidden backdrop-blur-sm shadow-xl">
          <div className="px-6 py-4 border-b border-slate-800 bg-slate-900/80 flex items-center justify-between">
            <h2 className="text-base font-semibold text-slate-200">Recent Authentication Audit Logs</h2>
            <span className="text-xs text-slate-400">Auto-redacted secrets & PII</span>
          </div>

          {loading ? (
            <div className="p-12 text-center text-slate-500">Loading audit history...</div>
          ) : logs.length === 0 ? (
            <div className="p-12 text-center text-slate-500">No authentication events recorded yet.</div>
          ) : (
            <div className="divide-y divide-slate-800/60 font-mono text-xs">
              {logs.map((log) => (
                <div key={log.id} className="p-4 flex items-center justify-between hover:bg-slate-900/30">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-cyan-400 font-bold">{log.eventType}</span>
                      <span className="text-slate-500 font-sans text-xs">from {log.ipAddressMasked}</span>
                    </div>
                    <div className="text-slate-400 font-sans text-xs">{log.userAgent}</div>
                  </div>
                  <div className="text-slate-500 text-xs font-sans">
                    {new Date(log.timestamp).toLocaleString()}
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
