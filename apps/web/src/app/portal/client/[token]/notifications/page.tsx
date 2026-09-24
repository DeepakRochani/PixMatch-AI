'use client';

import React, { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import {
  Bell,
  CheckCheck,
  Clock,
  ArrowUpRight,
  AlertCircle,
  Loader2
} from 'lucide-react';
import type { IClientPortalNotificationDTO } from '@pixmatch/types';

export default function ClientPortalNotificationsPage() {
  const params = useParams();
  const token = params?.token as string;

  const [notifications, setNotifications] = useState<IClientPortalNotificationDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [markingAll, setMarkingAll] = useState(false);

  useEffect(() => {
    async function fetchNotifications() {
      if (!token) return;
      try {
        setLoading(true);
        const res = await fetch(`/api/client-portal/public/notifications?token=${token}`, { credentials: 'omit' });
        if (!res.ok) throw new Error(`Notifications fetch failed (${res.status})`);
        const json = await res.json();
        setNotifications(json.notifications || []);
      } catch (err: any) {
        setError(err.message || 'Unable to load notifications.');
      } finally {
        setLoading(false);
      }
    }
    fetchNotifications();
  }, [token]);

  const handleMarkAsRead = async (notificationIds: string[]) => {
    if (!token || notificationIds.length === 0) return;

    try {
      const res = await fetch('/api/client-portal/public/notifications/read', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token,
          notification_ids: notificationIds
        })
      });

      if (!res.ok) throw new Error(`Failed to update notifications (${res.status})`);

      setNotifications(prev =>
        prev.map(n =>
          notificationIds.includes(n.id)
            ? { ...n, is_read: true }
            : n
        )
      );
    } catch (err: any) {
      console.error('Error marking notifications read:', err);
    }
  };

  const handleMarkAllAsRead = async () => {
    const unreadIds = notifications.filter(n => !n.is_read).map(n => n.id);
    if (unreadIds.length === 0) return;

    try {
      setMarkingAll(true);
      await handleMarkAsRead(unreadIds);
    } finally {
      setMarkingAll(false);
    }
  };

  const unreadCount = notifications.filter(n => !n.is_read).length;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
            Notifications &amp; Activity
          </h1>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
            Updates on your galleries, proofing selections, orders, and studio announcements.
          </p>
        </div>

        {unreadCount > 0 && (
          <button
            onClick={handleMarkAllAsRead}
            disabled={markingAll}
            className="self-start sm:self-auto inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 transition shadow-sm"
          >
            {markingAll ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <CheckCheck className="w-3.5 h-3.5 text-[var(--brand-primary)]" />
            )}
            Mark all as read
          </button>
        )}
      </div>

      {loading ? (
        <div className="py-20 flex flex-col items-center justify-center gap-3">
          <Loader2 className="w-8 h-8 text-[var(--brand-primary)] animate-spin" />
          <p className="text-sm text-slate-500">Loading notifications...</p>
        </div>
      ) : error ? (
        <div className="p-4 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 shrink-0" />
          <p className="text-sm text-red-800 dark:text-red-300">{error}</p>
        </div>
      ) : notifications.length === 0 ? (
        <div className="py-16 text-center border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-2xl p-8">
          <Bell className="w-12 h-12 text-slate-300 dark:text-slate-700 mx-auto mb-3" />
          <h3 className="text-base font-semibold text-slate-900 dark:text-white">All caught up!</h3>
          <p className="text-sm text-slate-500 max-w-md mx-auto mt-1">
            You do not have any notifications at the moment. We will alert you as soon as new photos or order updates are ready.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {notifications.map((notification) => (
            <div
              key={notification.id}
              onClick={() => {
                if (!notification.is_read) {
                  handleMarkAsRead([notification.id]);
                }
              }}
              className={`p-4 sm:p-5 rounded-2xl border transition relative cursor-pointer ${
                notification.is_read
                  ? 'bg-white dark:bg-slate-900 border-slate-200/70 dark:border-slate-800 opacity-80 hover:opacity-100'
                  : 'bg-white dark:bg-slate-900 border-[var(--brand-primary)]/40 shadow-sm ring-1 ring-[var(--brand-primary)]/10'
              }`}
            >
              <div className="flex items-start gap-4">
                <div
                  className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 mt-0.5 ${
                    notification.is_read
                      ? 'bg-slate-100 dark:bg-slate-800 text-slate-500'
                      : 'bg-[var(--brand-primary)]/10 text-[var(--brand-primary)]'
                  }`}
                >
                  <Bell className="w-4 h-4" />
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                    <h3 className="text-sm font-semibold text-slate-900 dark:text-white truncate">
                      {notification.title}
                    </h3>
                    <span className="text-xs text-slate-400 flex items-center gap-1 shrink-0">
                      <Clock className="w-3 h-3" />
                      {new Date(notification.created_at).toLocaleString([], {
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </span>
                  </div>

                  <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 mt-1">
                    {notification.message}
                  </p>

                  {notification.link_url && (
                    <div className="mt-3">
                      <Link
                        href={
                          notification.link_url.startsWith('http')
                            ? notification.link_url
                            : notification.link_url.replace('[token]', token)
                        }
                        className="inline-flex items-center gap-1 text-xs font-semibold text-[var(--brand-primary)] hover:underline"
                        onClick={(e) => e.stopPropagation()}
                      >
                        View details <ArrowUpRight className="w-3 h-3" />
                      </Link>
                    </div>
                  )}
                </div>

                {!notification.is_read && (
                  <span className="w-2.5 h-2.5 rounded-full bg-[var(--brand-primary)] shrink-0 mt-2" />
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
