'use client';

import React, { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import {
  Calendar,
  CheckCircle2,
  AlertCircle,
  Clock,
  Camera,
  RotateCw,
  Send,
} from 'lucide-react';

export default function ClientBookingReschedulePage() {
  const { token } = useParams() as { token: string };

  const [bookingData, setBookingData] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [availableSlots, setAvailableSlots] = useState<any[]>([]);
  const [selectedSlot, setSelectedSlot] = useState<any | null>(null);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [rescheduled, setRescheduled] = useState(false);

  const fetchPortal = async () => {
    if (!token) return;
    try {
      setLoading(true);
      setError(null);
      const res = await fetch(`/api/v1/public/booking/${token}`);
      const json = await res.json();
      if (json.success) {
        setBookingData(json.data);
        loadAvailability();
      } else {
        setError(json.error || 'Booking not found or link has expired');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load booking details');
    } finally {
      setLoading(false);
    }
  };

  const loadAvailability = async () => {
    try {
      setLoadingSlots(true);
      const res = await fetch(`/api/v1/public/booking/${token}/availability`);
      const json = await res.json();
      if (json.success && json.data?.slots) {
        setAvailableSlots(json.data.slots);
      }
    } catch (err: any) {
      console.error('Failed to load slots:', err);
    } finally {
      setLoadingSlots(false);
    }
  };

  const handleReschedule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSlot) return;

    try {
      setSubmitting(true);
      setError(null);
      const res = await fetch(`/api/v1/public/booking/${token}/reschedule`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          new_start_at: selectedSlot.start_at,
          new_end_at: selectedSlot.end_at,
          timezone: selectedSlot.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone,
          reason,
        }),
      });
      const json = await res.json();
      if (json.success) {
        setRescheduled(true);
      } else {
        setError(json.error || 'Failed to reschedule session');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to reschedule session');
    } finally {
      setSubmitting(false);
    }
  };

  useEffect(() => {
    fetchPortal();
  }, [token]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0c0d12] flex items-center justify-center p-6 text-white">
        <div className="text-center space-y-4">
          <div className="w-12 h-12 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-gray-400 font-medium">Loading reschedule portal...</p>
        </div>
      </div>
    );
  }

  const studio = bookingData?.studio || { name: 'Photography Studio' };

  return (
    <div className="min-h-screen bg-[#0a0b0e] text-white selection:bg-primary selection:text-white pb-24">
      {/* Header */}
      <header className="border-b border-[#222533] bg-[#12141c]/90 backdrop-blur sticky top-0 z-30">
        <div className="max-w-3xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-primary to-accent flex items-center justify-center text-white shadow-lg shadow-primary/20">
              <Camera className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-base font-bold text-white tracking-wide">{studio.name}</h1>
              <p className="text-xs text-gray-400">Reschedule Session</p>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-6 pt-10 space-y-8">
        {rescheduled ? (
          <div className="bg-[#13151f] border border-emerald-500/30 rounded-3xl p-8 sm:p-10 shadow-2xl text-center space-y-5">
            <div className="w-16 h-16 bg-emerald-500/10 text-emerald-400 rounded-full flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-white">Session Rescheduled Successfully!</h2>
              <p className="text-sm text-gray-400 mt-2">
                Your photography appointment has been moved to {new Date(selectedSlot?.start_at).toLocaleString()}.
              </p>
            </div>
          </div>
        ) : (
          <div className="bg-[#13151f] border border-[#232738] rounded-3xl p-6 sm:p-8 shadow-xl space-y-6">
            <div>
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <RotateCw className="w-5 h-5 text-primary" />
                <span>Choose a New Date & Time</span>
              </h2>
              <p className="text-xs text-gray-400 mt-1">
                Select from the real-time available studio slots below.
              </p>
            </div>

            {loadingSlots ? (
              <div className="py-8 text-center text-xs text-gray-400 flex items-center justify-center gap-2">
                <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                <span>Checking availability...</span>
              </div>
            ) : availableSlots.length > 0 ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 max-h-64 overflow-y-auto pr-1">
                {availableSlots.map((slot, idx) => {
                  const isSelected = selectedSlot?.start_at === slot.start_at;
                  return (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setSelectedSlot(slot)}
                      className={`p-3 rounded-xl border text-left transition ${
                        isSelected
                          ? 'bg-primary/20 border-primary text-white font-semibold'
                          : 'bg-[#181b26] border-[#292e42] text-gray-300 hover:border-primary/50'
                      }`}
                    >
                      <div className="text-xs font-mono">
                        {new Date(slot.start_at).toLocaleDateString(undefined, {
                          month: 'short',
                          day: 'numeric',
                        })}
                      </div>
                      <div className="text-sm font-bold mt-0.5">
                        {new Date(slot.start_at).toLocaleTimeString(undefined, {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </div>
                    </button>
                  );
                })}
              </div>
            ) : (
              <div className="p-6 rounded-2xl bg-[#181b26] text-center text-xs text-gray-400">
                No alternative slots available within the booking window.
              </div>
            )}

            {selectedSlot && (
              <form onSubmit={handleReschedule} className="space-y-4 pt-4 border-t border-[#232738]">
                <div className="text-xs font-semibold text-emerald-400 flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>
                    New Slot Selected: {new Date(selectedSlot.start_at).toLocaleString()}
                  </span>
                </div>

                <div>
                  <label className="text-xs font-medium text-gray-300">Reason for Rescheduling (Optional)</label>
                  <textarea
                    rows={2}
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    placeholder="Schedule conflict, weather, etc..."
                    className="mt-1 w-full bg-[#181b26] border border-[#292e42] rounded-xl px-3.5 py-2 text-sm text-white focus:outline-none focus:border-primary resize-none"
                  />
                </div>

                {error && (
                  <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-xs text-red-400">
                    {error}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full py-3 rounded-xl bg-primary text-white font-bold hover:bg-primary-hover transition flex items-center justify-center gap-2 shadow-lg shadow-primary/20"
                >
                  {submitting ? 'Rescheduling...' : 'Confirm Reschedule'}
                </button>
              </form>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
