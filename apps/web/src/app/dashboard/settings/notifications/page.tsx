'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { DashboardHeader } from '@/components/layout/DashboardHeader';
import { useAuth } from '@/lib/auth-context';
import { fetchApi } from '@/lib/api-client';
import {
  Bell,
  Mail,
  Shield,
  Check,
  AlertCircle,
  Sparkles,
  HardDrive,
  CreditCard,
  ImageIcon,
  Lock,
} from 'lucide-react';
import { NotificationPreferenceDTO } from '@pixmatch/types';

export default function NotificationSettingsPage() {
  const { studio } = useAuth();
  const [preferences, setPreferences] = useState<Partial<NotificationPreferenceDTO>>({
    email_gallery_delivery: true,
    email_gallery_reminder: true,
    email_client_favorites: true,
    email_client_selections: true,
    email_client_downloads: true,
    email_subscription_updates: true,
    email_payment_failures: true,
    email_storage_sync_failures: true,
    email_ai_processing_failures: true,
    email_product_announcements: false,
  });

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const loadPreferences = async () => {
    setIsLoading(true);
    try {
      const res = await fetchApi<NotificationPreferenceDTO>('/notifications/preferences');
      if (res.success && res.data) {
        setPreferences(res.data);
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadPreferences();
  }, []);

  const handleToggle = (key: keyof NotificationPreferenceDTO) => {
    setPreferences((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await fetchApi('/notifications/preferences', {
        method: 'PUT',
        body: JSON.stringify(preferences),
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col min-h-screen">
      <DashboardHeader
        title="Notification Preferences"
        subtitle="Configure your studio email alerts, client activity updates, and billing notices"
      />

      <main className="flex-1 p-6 sm:p-8 space-y-8 max-w-4xl">
        {/* Navigation Tabs */}
        <div className="flex items-center gap-3 border-b border-card-border pb-3">
          <Link
            href="/dashboard/settings"
            className="px-3 py-1.5 rounded-lg text-xs font-semibold text-muted hover:text-white hover:bg-card-border/30 transition"
          >
            Studio Profile
          </Link>
          <Link
            href="/dashboard/settings/notifications"
            className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-primary/20 text-primary-light border border-primary/30"
          >
            Notifications
          </Link>
          <Link
            href="/dashboard/settings/usage"
            className="px-3 py-1.5 rounded-lg text-xs font-semibold text-muted hover:text-white hover:bg-card-border/30 transition"
          >
            Usage & Storage
          </Link>
        </div>

        {/* Non-disableable Security Notice */}
        <div className="p-5 rounded-2xl bg-card border border-card-border flex items-start gap-3.5 shadow-lg">
          <div className="h-9 w-9 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary flex-shrink-0">
            <Lock className="h-4 w-4" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-white tracking-tight">Security & Critical Notices</h4>
            <p className="text-[11px] text-muted mt-0.5 leading-relaxed">
              Mandatory operational notifications such as password resets, email verifications, and critical account security alerts are non-disableable to safeguard your studio data.
            </p>
          </div>
        </div>

        {/* Gallery & Client Notifications */}
        <div className="p-6 sm:p-8 rounded-2xl bg-card border border-card-border space-y-6">
          <div className="border-b border-card-border pb-4 flex items-center gap-2.5">
            <ImageIcon className="h-5 w-5 text-primary" />
            <div>
              <h3 className="text-sm font-bold text-white">Gallery & Client Activity</h3>
              <p className="text-xs text-muted">Manage email notifications triggered by guest and client interactions</p>
            </div>
          </div>

          <div className="space-y-4">
            <label className="flex items-center justify-between p-3 rounded-xl bg-background border border-card-border cursor-pointer hover:border-card-border/80 transition">
              <div>
                <div className="text-xs font-semibold text-white">Gallery Delivery Confirmations</div>
                <div className="text-[11px] text-muted">Receive a delivery confirmation whenever a gallery is shared with a client</div>
              </div>
              <input
                type="checkbox"
                checked={preferences.email_gallery_delivery ?? true}
                onChange={() => handleToggle('email_gallery_delivery')}
                className="h-4 w-4 rounded bg-background border-card-border text-primary focus:ring-primary"
              />
            </label>

            <label className="flex items-center justify-between p-3 rounded-xl bg-background border border-card-border cursor-pointer hover:border-card-border/80 transition">
              <div>
                <div className="text-xs font-semibold text-white">Client Favorites Alerts</div>
                <div className="text-[11px] text-muted">Get notified when a client stars or favorites photos in their gallery</div>
              </div>
              <input
                type="checkbox"
                checked={preferences.email_client_favorites ?? true}
                onChange={() => handleToggle('email_client_favorites')}
                className="h-4 w-4 rounded bg-background border-card-border text-primary focus:ring-primary"
              />
            </label>

            <label className="flex items-center justify-between p-3 rounded-xl bg-background border border-card-border cursor-pointer hover:border-card-border/80 transition">
              <div>
                <div className="text-xs font-semibold text-white">Client Selection Submissions</div>
                <div className="text-[11px] text-muted">Notify me when a client submits their final photo selections for album proofing</div>
              </div>
              <input
                type="checkbox"
                checked={preferences.email_client_selections ?? true}
                onChange={() => handleToggle('email_client_selections')}
                className="h-4 w-4 rounded bg-background border-card-border text-primary focus:ring-primary"
              />
            </label>

            <label className="flex items-center justify-between p-3 rounded-xl bg-background border border-card-border cursor-pointer hover:border-card-border/80 transition">
              <div>
                <div className="text-xs font-semibold text-white">High-Resolution Download Activity</div>
                <div className="text-[11px] text-muted">Receive an alert when full-gallery or album ZIP downloads are completed</div>
              </div>
              <input
                type="checkbox"
                checked={preferences.email_client_downloads ?? true}
                onChange={() => handleToggle('email_client_downloads')}
                className="h-4 w-4 rounded bg-background border-card-border text-primary focus:ring-primary"
              />
            </label>
          </div>
        </div>

        {/* Operational & Billing Alerts */}
        <div className="p-6 sm:p-8 rounded-2xl bg-card border border-card-border space-y-6">
          <div className="border-b border-card-border pb-4 flex items-center gap-2.5">
            <CreditCard className="h-5 w-5 text-emerald-400" />
            <div>
              <h3 className="text-sm font-bold text-white">Billing & Technical Alerts</h3>
              <p className="text-xs text-muted">Operational error alerts and subscription status changes</p>
            </div>
          </div>

          <div className="space-y-4">
            <label className="flex items-center justify-between p-3 rounded-xl bg-background border border-card-border cursor-pointer hover:border-card-border/80 transition">
              <div>
                <div className="text-xs font-semibold text-white">Payment & Invoicing Updates</div>
                <div className="text-[11px] text-muted">Receipts, invoice generation, and subscription renewal notices</div>
              </div>
              <input
                type="checkbox"
                checked={preferences.email_subscription_updates ?? true}
                onChange={() => handleToggle('email_subscription_updates')}
                className="h-4 w-4 rounded bg-background border-card-border text-primary focus:ring-primary"
              />
            </label>

            <label className="flex items-center justify-between p-3 rounded-xl bg-background border border-card-border cursor-pointer hover:border-card-border/80 transition">
              <div>
                <div className="text-xs font-semibold text-rose-400">Payment Failure Alerts</div>
                <div className="text-[11px] text-muted">Immediate alert if recurring payment or card charge fails</div>
              </div>
              <input
                type="checkbox"
                checked={preferences.email_payment_failures ?? true}
                onChange={() => handleToggle('email_payment_failures')}
                className="h-4 w-4 rounded bg-background border-card-border text-primary focus:ring-primary"
              />
            </label>

            <label className="flex items-center justify-between p-3 rounded-xl bg-background border border-card-border cursor-pointer hover:border-card-border/80 transition">
              <div>
                <div className="text-xs font-semibold text-white">Storage Synchronization Errors</div>
                <div className="text-[11px] text-muted">Alerts when Google Drive, Dropbox, or S3 cloud syncing requires reauthorization</div>
              </div>
              <input
                type="checkbox"
                checked={preferences.email_storage_sync_failures ?? true}
                onChange={() => handleToggle('email_storage_sync_failures')}
                className="h-4 w-4 rounded bg-background border-card-border text-primary focus:ring-primary"
              />
            </label>

            <label className="flex items-center justify-between p-3 rounded-xl bg-background border border-card-border cursor-pointer hover:border-card-border/80 transition">
              <div>
                <div className="text-xs font-semibold text-white">AI Face Indexing Warnings</div>
                <div className="text-[11px] text-muted">Alerts if image corruption or face recognition processing fails</div>
              </div>
              <input
                type="checkbox"
                checked={preferences.email_ai_processing_failures ?? true}
                onChange={() => handleToggle('email_ai_processing_failures')}
                className="h-4 w-4 rounded bg-background border-card-border text-primary focus:ring-primary"
              />
            </label>
          </div>
        </div>

        {/* Save Button */}
        <div className="flex items-center justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={handleSave}
            disabled={isSaving}
            className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-primary hover:bg-primary-hover disabled:opacity-50 text-white text-xs font-semibold transition shadow-md shadow-primary/20"
          >
            {saved ? <Check className="h-4 w-4 text-white" /> : null}
            {saved ? 'Preferences Saved' : isSaving ? 'Saving...' : 'Save Notification Preferences'}
          </button>
        </div>
      </main>
    </div>
  );
}
