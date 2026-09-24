'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter, useParams } from 'next/navigation';
import { Lock, ArrowRight, ShieldCheck, AlertTriangle, CheckCircle2, XCircle } from 'lucide-react';
import { fetchApi } from '@/lib/api-client';

export default function AdminResetPasswordPage() {
  const router = useRouter();
  const params = useParams();
  const token = (params?.token as string) || '';

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Complexity rules checks
  const hasMinLength = newPassword.length >= 10;
  const hasUpper = /[A-Z]/.test(newPassword);
  const hasLower = /[a-z]/.test(newPassword);
  const hasNumber = /[0-9]/.test(newPassword);
  const hasSpecial = /[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(newPassword);
  const isMatch = newPassword === confirmPassword && newPassword.length > 0;
  const isPasswordValid = hasMinLength && hasUpper && hasLower && hasNumber && hasSpecial && isMatch;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isPasswordValid) return;

    setError(null);
    setIsLoading(true);

    try {
      const res: any = await fetchApi<any>('/api/admin/auth/reset-password', {
        method: 'POST',
        body: JSON.stringify({
          token,
          new_password: newPassword,
        }),
      });

      if (res && res.success) {
        setSuccess(true);
        setTimeout(() => {
          router.push('/admin/login');
        }, 2500);
      } else {
        setError(res?.error?.message || res?.message || 'Password reset failed. Invalid or expired token.');
      }
    } catch (err: any) {
      setError(err?.message || 'Password reset failed. Token may be invalid or expired.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col justify-center items-center px-4 py-12 bg-slate-950 text-slate-100 relative overflow-hidden font-sans">
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#1e293b15_1px,transparent_1px),linear-gradient(to_bottom,#1e293b15_1px,transparent_1px)] bg-[size:4rem_4rem]" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_60%_50%_at_50%_0%,rgba(239,68,68,0.15),rgba(255,255,255,0))]" />

      <div className="w-full max-w-md relative space-y-6 z-10">
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center p-3 rounded-2xl bg-gradient-to-tr from-red-600 to-rose-500 text-white shadow-xl shadow-red-500/20 mb-2 ring-1 ring-red-500/30">
            <Lock className="h-8 w-8" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-white">Set New Administrator Password</h1>
          <p className="text-sm text-slate-400">Choose a strong, complex passphrase for your platform credentials.</p>
        </div>

        <div className="p-6 rounded-2xl bg-slate-900/90 border border-slate-800 shadow-2xl backdrop-blur-xl">
          {success ? (
            <div className="space-y-4 text-center py-4">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-400">
                <CheckCircle2 className="h-6 w-6" />
              </div>
              <div className="space-y-1">
                <h3 className="text-base font-semibold text-white">Password Updated</h3>
                <p className="text-xs text-slate-400">All previous administrator sessions have been revoked.</p>
                <p className="text-xs text-slate-500 pt-2">Redirecting to administrator login...</p>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div className="p-3 rounded-lg bg-red-950/50 border border-red-500/50 text-red-200 text-xs flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 shrink-0 text-red-400" />
                  <span>{error}</span>
                </div>
              )}

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-slate-300">New Administrator Password</label>
                <input
                  type="password"
                  required
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 focus:border-red-500 focus:ring-1 focus:ring-red-500 text-sm text-white placeholder-slate-600 outline-none transition-all"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-slate-300">Confirm New Password</label>
                <input
                  type="password"
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 focus:border-red-500 focus:ring-1 focus:ring-red-500 text-sm text-white placeholder-slate-600 outline-none transition-all"
                />
              </div>

              {/* Password Complexity Indicator */}
              <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800 space-y-1.5 text-xs text-slate-400">
                <span className="font-semibold text-slate-300 text-[11px] uppercase tracking-wider block">
                  Password Complexity Requirements
                </span>
                <div className="grid grid-cols-2 gap-1.5 pt-1">
                  <div className={`flex items-center gap-1.5 ${hasMinLength ? 'text-emerald-400' : 'text-slate-500'}`}>
                    {hasMinLength ? <CheckCircle2 className="h-3.5 w-3.5" /> : <XCircle className="h-3.5 w-3.5" />}
                    <span>10+ characters</span>
                  </div>
                  <div className={`flex items-center gap-1.5 ${hasUpper ? 'text-emerald-400' : 'text-slate-500'}`}>
                    {hasUpper ? <CheckCircle2 className="h-3.5 w-3.5" /> : <XCircle className="h-3.5 w-3.5" />}
                    <span>Uppercase letter</span>
                  </div>
                  <div className={`flex items-center gap-1.5 ${hasLower ? 'text-emerald-400' : 'text-slate-500'}`}>
                    {hasLower ? <CheckCircle2 className="h-3.5 w-3.5" /> : <XCircle className="h-3.5 w-3.5" />}
                    <span>Lowercase letter</span>
                  </div>
                  <div className={`flex items-center gap-1.5 ${hasNumber ? 'text-emerald-400' : 'text-slate-500'}`}>
                    {hasNumber ? <CheckCircle2 className="h-3.5 w-3.5" /> : <XCircle className="h-3.5 w-3.5" />}
                    <span>Numerical digit</span>
                  </div>
                  <div className={`flex items-center gap-1.5 ${hasSpecial ? 'text-emerald-400' : 'text-slate-500'}`}>
                    {hasSpecial ? <CheckCircle2 className="h-3.5 w-3.5" /> : <XCircle className="h-3.5 w-3.5" />}
                    <span>Special character</span>
                  </div>
                  <div className={`flex items-center gap-1.5 ${isMatch ? 'text-emerald-400' : 'text-slate-500'}`}>
                    {isMatch ? <CheckCircle2 className="h-3.5 w-3.5" /> : <XCircle className="h-3.5 w-3.5" />}
                    <span>Passwords match</span>
                  </div>
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading || !isPasswordValid}
                className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white text-sm font-semibold shadow-lg shadow-red-600/20 hover:shadow-red-600/30 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed group cursor-pointer"
              >
                {isLoading ? (
                  <>
                    <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>Resetting Password...</span>
                  </>
                ) : (
                  <>
                    <span>Confirm & Reset Password</span>
                    <ArrowRight className="h-4 w-4 group-hover:translate-x-0.5 transition-transform" />
                  </>
                )}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
