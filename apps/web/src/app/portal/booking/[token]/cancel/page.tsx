'use client';

import React, { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import {
  AlertCircle,
  CheckCircle2,
  XCircle,
  Camera,
  Calendar,
} from 'lucide-react';

export default function ClientBookingCancelPage() {
  const { token } = useParams() as { token: string };

  const [bookingData, setBookingData] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [cancelled, setCancelled] = useState(false);

  const fetchPortal = async () => {
    if (!token) return;
    try {
      setLoading(true);
      setError(null);
      const res = await fetch(`/api/v1/public/booking/${token}`);
      const json = await res.json();
      if (json.success) {
        setBookingData(json.data);
      } else {
        setError(json.error || 'Booking not found or link has expired');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load booking details');
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSubmitting(true);
      setError(null);
      const res = await fetch(`/api/v1/public/booking/${token}/cancel`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason }),
      });
      const json = await res.json();
      if (json.success) {
        setCancelled(true);
      } else {
        setError(json.error || 'Failed to cancel appointment');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to cancel appointment');
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
          <p className="text-gray-400 font-medium">Loading cancellation portal...</p>
        </div>
      </div>
    );
  }

  const studio = bookingData?.studio || { name: 'Photography Studio' };

  return (
    <div className="min-h-screen bg-[#0a0b0e] text-white selection:bg-primary selection:text-white pb-24">
      <header className="border-b border-[#222533] bg-[#12141c]/90 backdrop-blur sticky top-0 z-30">
        <div className="max-w-xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-primary to-accent flex items-center justify-center text-white shadow-lg shadow-primary/20">
              <Camera className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-base font-bold text-white tracking-wide">{studio.name}</h1>
              <p className="text-xs text-gray-400">Cancel Appointment</p>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-xl mx-auto px-6 pt-10 space-y-8">
        {cancelled ? (
          <div className="bg-[#13151f] border border-card-border/80 rounded-3xl p-8 sm:p-10 shadow-2xl text-center space-y-5">
            <div className="w-16 h-16 bg-rose-500/10 text-rose-400 rounded-full flex items-center justify-center mx-auto">
              <XCircle className="w-8 h-8" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-white">Appointment Cancelled</h2>
              <p className="text-sm text-gray-400 mt-2">
                Your booking has been cancelled and the studio team has been notified.
              </p>
            </div>
          </div>
        ) : (
          <div className="bg-[#13151f] border border-rose-500/20 rounded-3xl p-6 sm:p-8 shadow-xl space-y-6">
            <div className="space-y-2">
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <AlertCircle className="w-5 h-5 text-rose-400" />
                <span>Cancel Photography Session</span>
              </h2>
              <p className="text-xs text-gray-400">
                Are you sure you wish to cancel your scheduled appointment with {studio.name}?
              </p>
            </div>

            <form onSubmit={handleCancel} className="space-y-4">
              <div>
                <label className="text-xs font-medium text-gray-300">Reason for Cancellation (Optional)</label>
                <textarea
                  rows={3}
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="Please share any context regarding your cancellation..."
                  className="mt-1 w-full bg-[#181b26] border border-[#292e42] rounded-xl px-3.5 py-2 text-sm text-white focus:outline-none focus:border-rose-400 resize-none"
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
                className="w-full py-3 rounded-xl bg-rose-600 text-white font-bold hover:bg-rose-500 transition shadow-lg shadow-rose-600/20"
              >
                {submitting ? 'Cancelling Session...' : 'Confirm Cancellation'}
              </button>
            </form>
          </div>
        )}
      </main>
    </div>
  );
}
