'use client';

import React, { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import {
  User,
  Mail,
  Phone,
  Bell,
  Shield,
  Save,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Building
} from 'lucide-react';
import type { IClientPortalProfileDTO } from '@pixmatch/types';

export default function ClientPortalProfilePage() {
  const params = useParams();
  const token = params?.token as string;

  const [profile, setProfile] = useState<IClientPortalProfileDTO | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Preference Form State
  const [emailGalleryReady, setEmailGalleryReady] = useState(true);
  const [emailProofingUpdates, setEmailProofingUpdates] = useState(true);
  const [emailOrderUpdates, setEmailOrderUpdates] = useState(true);
  const [emailDeliveryUpdates, setEmailDeliveryUpdates] = useState(true);
  const [emailDownloadReady, setEmailDownloadReady] = useState(true);

  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  useEffect(() => {
    async function fetchProfile() {
      if (!token) return;
      try {
        setLoading(true);
        const res = await fetch(`/api/client-portal/public/profile?token=${token}`, { credentials: 'omit' });
        if (!res.ok) throw new Error(`Profile fetch failed (${res.status})`);
        const data: IClientPortalProfileDTO = await res.json();
        setProfile(data);
        if (data.preferences) {
          setEmailGalleryReady(data.preferences.email_gallery_ready !== false);
          setEmailProofingUpdates(data.preferences.email_proofing_updates !== false);
          setEmailOrderUpdates(data.preferences.email_order_updates !== false);
          setEmailDeliveryUpdates(data.preferences.email_delivery_updates !== false);
          setEmailDownloadReady(data.preferences.email_download_ready !== false);
        }
      } catch (err: any) {
        setError(err.message || 'Unable to load profile details.');
      } finally {
        setLoading(false);
      }
    }
    fetchProfile();
  }, [token]);

  const handleSavePreferences = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;

    try {
      setSaving(true);
      setSaveSuccess(false);
      const res = await fetch('/api/client-portal/public/preferences', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token,
          email_gallery_ready: emailGalleryReady,
          email_proofing_updates: emailProofingUpdates,
          email_order_updates: emailOrderUpdates,
          email_delivery_updates: emailDeliveryUpdates,
          email_download_ready: emailDownloadReady
        })
      });

      if (!res.ok) throw new Error(`Update failed (${res.status})`);
      const updatedProfile: IClientPortalProfileDTO = await res.json();
      setProfile(updatedProfile);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 4000);
    } catch (err: any) {
      alert(err.message || 'Error updating preferences.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-8 max-w-4xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
          Client Profile &amp; Preferences
        </h1>
        <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
          Manage your contact information and notifications for galleries, proofing, and orders.
        </p>
      </div>

      {loading ? (
        <div className="py-20 flex flex-col items-center justify-center gap-3">
          <Loader2 className="w-8 h-8 text-[var(--brand-primary)] animate-spin" />
          <p className="text-sm text-slate-500">Loading your profile...</p>
        </div>
      ) : error ? (
        <div className="p-4 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 shrink-0" />
          <p className="text-sm text-red-800 dark:text-red-300">{error}</p>
        </div>
      ) : profile ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Profile Overview Card */}
          <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-5 md:col-span-1">
            <div className="w-16 h-16 rounded-2xl bg-[var(--brand-primary)]/10 text-[var(--brand-primary)] flex items-center justify-center mx-auto text-xl font-bold">
              {profile.name.charAt(0).toUpperCase()}
            </div>
            <div className="text-center">
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">{profile.name}</h2>
              {profile.company && (
                <p className="text-xs text-slate-500 flex items-center justify-center gap-1 mt-0.5">
                  <Building className="w-3.5 h-3.5" />
                  {profile.company}
                </p>
              )}
            </div>

            <div className="space-y-3 pt-4 border-t border-slate-100 dark:border-slate-800 text-xs">
              <div className="flex items-center gap-2.5 text-slate-600 dark:text-slate-300">
                <Mail className="w-4 h-4 text-slate-400 shrink-0" />
                <span className="truncate">{profile.email}</span>
              </div>
              {profile.phone && (
                <div className="flex items-center gap-2.5 text-slate-600 dark:text-slate-300">
                  <Phone className="w-4 h-4 text-slate-400 shrink-0" />
                  <span>{profile.phone}</span>
                </div>
              )}
            </div>

            <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/60 dark:border-slate-700/60 space-y-1 text-xs">
              <div className="flex items-center gap-1.5 font-medium text-slate-900 dark:text-white">
                <Shield className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                Zero-Password Security
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                Your portal session is cryptographically secured via your private studio magic token.
              </p>
            </div>
          </div>

          {/* Preferences Form */}
          <div className="p-6 sm:p-8 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm md:col-span-2 space-y-6">
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Bell className="w-4 h-4 text-[var(--brand-primary)]" />
                Communication Preferences
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Customize which project and delivery alerts you receive via email.
              </p>
            </div>

            {saveSuccess && (
              <div className="p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 flex items-center gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                <p className="text-xs font-medium text-emerald-900 dark:text-emerald-200">
                  Preferences updated successfully!
                </p>
              </div>
            )}

            <form onSubmit={handleSavePreferences} className="space-y-5">
              <div className="space-y-3">
                {/* Gallery Ready */}
                <label className="flex items-start gap-3 p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/40 cursor-pointer transition">
                  <input
                    type="checkbox"
                    checked={emailGalleryReady}
                    onChange={(e) => setEmailGalleryReady(e.target.checked)}
                    className="mt-1 h-4 w-4 rounded border-slate-300 text-[var(--brand-primary)] focus:ring-[var(--brand-primary)]"
                  />
                  <div>
                    <span className="text-xs sm:text-sm font-semibold text-slate-900 dark:text-white block">
                      Gallery &amp; Photo Publishing
                    </span>
                    <span className="text-xs text-slate-500 dark:text-slate-400">
                      Alerts when new photo sets and albums are ready for viewing.
                    </span>
                  </div>
                </label>

                {/* Proofing Updates */}
                <label className="flex items-start gap-3 p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/40 cursor-pointer transition">
                  <input
                    type="checkbox"
                    checked={emailProofingUpdates}
                    onChange={(e) => setEmailProofingUpdates(e.target.checked)}
                    className="mt-1 h-4 w-4 rounded border-slate-300 text-[var(--brand-primary)] focus:ring-[var(--brand-primary)]"
                  />
                  <div>
                    <span className="text-xs sm:text-sm font-semibold text-slate-900 dark:text-white block">
                      Proofing &amp; Selection Reminders
                    </span>
                    <span className="text-xs text-slate-500 dark:text-slate-400">
                      Reminders and confirmation summaries for your photo selections.
                    </span>
                  </div>
                </label>

                {/* Order Updates */}
                <label className="flex items-start gap-3 p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/40 cursor-pointer transition">
                  <input
                    type="checkbox"
                    checked={emailOrderUpdates}
                    onChange={(e) => setEmailOrderUpdates(e.target.checked)}
                    className="mt-1 h-4 w-4 rounded border-slate-300 text-[var(--brand-primary)] focus:ring-[var(--brand-primary)]"
                  />
                  <div>
                    <span className="text-xs sm:text-sm font-semibold text-slate-900 dark:text-white block">
                      Order &amp; Payment Receipts
                    </span>
                    <span className="text-xs text-slate-500 dark:text-slate-400">
                      Receipts and invoices when purchases or print packages are ordered.
                    </span>
                  </div>
                </label>

                {/* Delivery Updates */}
                <label className="flex items-start gap-3 p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/40 cursor-pointer transition">
                  <input
                    type="checkbox"
                    checked={emailDeliveryUpdates}
                    onChange={(e) => setEmailDeliveryUpdates(e.target.checked)}
                    className="mt-1 h-4 w-4 rounded border-slate-300 text-[var(--brand-primary)] focus:ring-[var(--brand-primary)]"
                  />
                  <div>
                    <span className="text-xs sm:text-sm font-semibold text-slate-900 dark:text-white block">
                      Delivery &amp; Shipment Tracking
                    </span>
                    <span className="text-xs text-slate-500 dark:text-slate-400">
                      Tracking numbers and delivery alerts when physical prints ship.
                    </span>
                  </div>
                </label>

                {/* Download Ready */}
                <label className="flex items-start gap-3 p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/40 cursor-pointer transition">
                  <input
                    type="checkbox"
                    checked={emailDownloadReady}
                    onChange={(e) => setEmailDownloadReady(e.target.checked)}
                    className="mt-1 h-4 w-4 rounded border-slate-300 text-[var(--brand-primary)] focus:ring-[var(--brand-primary)]"
                  />
                  <div>
                    <span className="text-xs sm:text-sm font-semibold text-slate-900 dark:text-white block">
                      Digital Download Ready
                    </span>
                    <span className="text-xs text-slate-500 dark:text-slate-400">
                      Notifications when full-resolution ZIP packages are ready to download.
                    </span>
                  </div>
                </label>
              </div>

              <div className="flex justify-end pt-2">
                <button
                  type="submit"
                  disabled={saving}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs sm:text-sm font-semibold text-white bg-[var(--brand-primary)] hover:opacity-90 shadow-sm transition"
                >
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  Save Preferences
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  );
}
