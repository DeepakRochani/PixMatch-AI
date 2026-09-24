'use client';

import React, { useState, useEffect } from 'react';
import {
  Calendar as CalendarIcon,
  Clock,
  Plus,
  Trash2,
  AlertCircle,
  Save,
  CheckCircle2,
  ShieldAlert,
} from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import { OperationsNavTabs } from '@/components/dashboard/OperationsNavTabs';
import {
  StudioAvailabilityRuleDTO,
  StudioBlackoutPeriodDTO,
  StudioBookingSettingsDTO,
} from '@pixmatch/types';

export default function AvailabilityPage() {
  const { token, studio } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [settings, setSettings] = useState<StudioBookingSettingsDTO | null>(null);
  const [rules, setRules] = useState<StudioAvailabilityRuleDTO[]>([]);
  const [blackouts, setBlackouts] = useState<StudioBlackoutPeriodDTO[]>([]);

  // New blackout modal state
  const [showBlackoutModal, setShowBlackoutModal] = useState(false);
  const [newBlackout, setNewBlackout] = useState({
    title: '',
    start_at: '',
    end_at: '',
    reason: '',
  });

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);

      const [settingsRes, rulesRes, blackoutsRes] = await Promise.all([
        fetch('/api/v1/calendar/settings', {
          headers: { Authorization: `Bearer ${token}`, 'x-studio-id': studio?.id || '' },
        }),
        fetch('/api/v1/calendar/rules', {
          headers: { Authorization: `Bearer ${token}`, 'x-studio-id': studio?.id || '' },
        }),
        fetch('/api/v1/calendar/blackouts', {
          headers: { Authorization: `Bearer ${token}`, 'x-studio-id': studio?.id || '' },
        }),
      ]);

      if (settingsRes.ok) {
        const json = await settingsRes.json();
        setSettings(json.data || json);
      }
      if (rulesRes.ok) {
        const json = await rulesRes.json();
        setRules(json.data || []);
      }
      if (blackoutsRes.ok) {
        const json = await blackoutsRes.json();
        setBlackouts(json.data || []);
      }
    } catch (err: any) {
      setError(err.message || 'Error loading availability');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token) {
      fetchData();
    }
  }, [token, studio?.id]);

  const handleCreateBlackout = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSaving(true);
      const res = await fetch('/api/v1/calendar/blackouts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
          'x-studio-id': studio?.id || '',
        },
        body: JSON.stringify(newBlackout),
      });

      if (!res.ok) {
        const errJson = await res.json();
        throw new Error(errJson.error || 'Failed to create blackout period');
      }

      setShowBlackoutModal(false);
      setNewBlackout({ title: '', start_at: '', end_at: '', reason: '' });
      setSuccessMsg('Blackout period recorded successfully.');
      fetchData();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteBlackout = async (id: string) => {
    if (!confirm('Are you sure you want to remove this blackout period?')) return;
    try {
      await fetch(`/api/v1/calendar/blackouts/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}`, 'x-studio-id': studio?.id || '' },
      });
      setBlackouts((prev) => prev.filter((b) => b.id !== id));
      setSuccessMsg('Blackout period deleted.');
    } catch (err: any) {
      setError(err.message);
    }
  };

  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      <OperationsNavTabs />

      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Studio Availability & Schedule Rules</h1>
          <p className="text-sm text-muted">Configure weekly working hours, blackout dates, and booking lead-time guardrails.</p>
        </div>
        <button
          onClick={() => setShowBlackoutModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-primary hover:bg-primary/90 text-white rounded-lg text-sm font-semibold shadow-sm transition-all"
        >
          <Plus className="h-4 w-4" /> Add Blackout / Vacation
        </button>
      </div>

      {error && (
        <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm flex items-center gap-2">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {error}
        </div>
      )}

      {successMsg && (
        <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-emerald-400 text-sm flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          {successMsg}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Weekly Hours */}
        <div className="lg:col-span-2 bg-card border border-card-border rounded-xl p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-card-border pb-3">
            <h2 className="text-base font-semibold text-white flex items-center gap-2">
              <Clock className="h-4 w-4 text-primary" /> Weekly Working Hours
            </h2>
            <span className="text-xs text-muted">Timezone: {settings?.timezone || 'UTC'}</span>
          </div>

          <div className="space-y-2.5">
            {[1, 2, 3, 4, 5, 6, 0].map((d) => {
              const rule = rules.find((r) => r.day_of_week === d);
              const isOpen = Boolean(rule && rule.is_active);

              return (
                <div key={d} className="flex items-center justify-between p-3 rounded-lg bg-card-border/20 border border-card-border/40">
                  <div className="w-32 font-medium text-sm text-white">{dayNames[d]}</div>
                  <div className="flex items-center gap-3">
                    {isOpen ? (
                      <span className="text-xs font-semibold px-2.5 py-1 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                        {rule?.start_time || '09:00'} - {rule?.end_time || '18:00'}
                      </span>
                    ) : (
                      <span className="text-xs font-semibold px-2.5 py-1 rounded bg-muted/10 text-muted border border-muted/20">
                        Closed / Off
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Lead Time Policies */}
        <div className="bg-card border border-card-border rounded-xl p-5 space-y-4">
          <h2 className="text-base font-semibold text-white flex items-center gap-2 border-b border-card-border pb-3">
            <ShieldAlert className="h-4 w-4 text-amber-400" /> Booking Horizon & Policies
          </h2>

          <div className="space-y-3 text-xs text-muted">
            <div className="flex justify-between py-1.5 border-b border-card-border/40">
              <span>Minimum Notice</span>
              <span className="font-semibold text-white">{settings?.minimum_notice_minutes || 60} mins</span>
            </div>
            <div className="flex justify-between py-1.5 border-b border-card-border/40">
              <span>Booking Horizon</span>
              <span className="font-semibold text-white">{settings?.maximum_booking_days_ahead || 90} days ahead</span>
            </div>
            <div className="flex justify-between py-1.5 border-b border-card-border/40">
              <span>Client Reschedule</span>
              <span className="font-semibold text-emerald-400">{settings?.allow_client_reschedule ? 'Allowed' : 'Disabled'}</span>
            </div>
            <div className="flex justify-between py-1.5 border-b border-card-border/40">
              <span>Client Cancellation</span>
              <span className="font-semibold text-emerald-400">{settings?.allow_client_cancel ? 'Allowed' : 'Disabled'}</span>
            </div>
            <div className="flex justify-between py-1.5">
              <span>Manual Confirmation</span>
              <span className="font-semibold text-amber-400">{settings?.require_manual_confirmation ? 'Required' : 'Instant Auto-Confirm'}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Blackouts / Holidays */}
      <div className="bg-card border border-card-border rounded-xl p-5 space-y-4">
        <h2 className="text-base font-semibold text-white flex items-center gap-2 border-b border-card-border pb-3">
          <CalendarIcon className="h-4 w-4 text-primary" /> Active Blackout Periods & Studio Holidays
        </h2>

        {blackouts.length === 0 ? (
          <div className="text-center py-8 text-sm text-muted">
            No blackout dates or holidays scheduled. All standard working hours are bookable.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {blackouts.map((b) => (
              <div key={b.id} className="p-3.5 rounded-lg bg-card-border/30 border border-card-border/60 flex items-start justify-between">
                <div>
                  <div className="font-semibold text-sm text-white">{b.title}</div>
                  <div className="text-xs text-muted mt-1">
                    {new Date(b.start_at).toLocaleDateString()} — {new Date(b.end_at).toLocaleDateString()}
                  </div>
                  {b.reason && <div className="text-xs text-muted/80 mt-1 italic">{b.reason}</div>}
                  {b.resource && <div className="text-xs text-primary font-medium mt-1">Assigned: {b.resource.name}</div>}
                </div>
                <button
                  onClick={() => handleDeleteBlackout(b.id)}
                  className="p-1 text-muted hover:text-red-400 rounded transition-colors"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Blackout Modal */}
      {showBlackoutModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="bg-card border border-card-border rounded-xl p-6 max-w-md w-full space-y-4">
            <h3 className="text-lg font-bold text-white">Add Blackout Period</h3>
            <form onSubmit={handleCreateBlackout} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-muted mb-1">Title</label>
                <input
                  type="text"
                  required
                  value={newBlackout.title}
                  onChange={(e) => setNewBlackout({ ...newBlackout, title: e.target.value })}
                  placeholder="e.g. Studio Vacation, Holiday Maintenance"
                  className="w-full px-3 py-2 bg-background border border-card-border rounded-lg text-sm text-white focus:outline-none focus:border-primary"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-muted mb-1">Start Date</label>
                  <input
                    type="datetime-local"
                    required
                    value={newBlackout.start_at}
                    onChange={(e) => setNewBlackout({ ...newBlackout, start_at: e.target.value })}
                    className="w-full px-3 py-2 bg-background border border-card-border rounded-lg text-sm text-white focus:outline-none focus:border-primary"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-muted mb-1">End Date</label>
                  <input
                    type="datetime-local"
                    required
                    value={newBlackout.end_at}
                    onChange={(e) => setNewBlackout({ ...newBlackout, end_at: e.target.value })}
                    className="w-full px-3 py-2 bg-background border border-card-border rounded-lg text-sm text-white focus:outline-none focus:border-primary"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-muted mb-1">Reason (Optional)</label>
                <input
                  type="text"
                  value={newBlackout.reason}
                  onChange={(e) => setNewBlackout({ ...newBlackout, reason: e.target.value })}
                  placeholder="e.g. Off-site workshop"
                  className="w-full px-3 py-2 bg-background border border-card-border rounded-lg text-sm text-white focus:outline-none focus:border-primary"
                />
              </div>
              <div className="flex justify-end gap-2 pt-3 border-t border-card-border">
                <button
                  type="button"
                  onClick={() => setShowBlackoutModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-muted hover:text-white rounded-lg border border-card-border"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-4 py-2 text-xs font-semibold bg-primary hover:bg-primary/90 text-white rounded-lg"
                >
                  {saving ? 'Saving...' : 'Save Blackout'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
