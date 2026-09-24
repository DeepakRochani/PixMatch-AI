'use client';

import React, { useState, useEffect } from 'react';
import {
  Inbox,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  User,
  Mail,
  Phone,
  Calendar,
} from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import { OperationsNavTabs } from '@/components/dashboard/OperationsNavTabs';
import { BookingRequestStatus, StudioBookingRequestDTO } from '@pixmatch/types';

export default function BookingRequestsPage() {
  const { token, studio } = useAuth();
  const [loading, setLoading] = useState(true);
  const [requests, setRequests] = useState<StudioBookingRequestDTO[]>([]);
  const [filterStatus, setFilterStatus] = useState<string>('PENDING');
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const fetchRequests = async () => {
    try {
      setLoading(true);
      setError(null);
      let url = '/api/v1/calendar/booking-requests';
      if (filterStatus !== 'ALL') {
        url += `?status=${filterStatus}`;
      }
      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${token}`, 'x-studio-id': studio?.id || '' },
      });
      if (!res.ok) throw new Error('Failed to load booking requests');
      const json = await res.json();
      setRequests(json.data || []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token) {
      fetchRequests();
    }
  }, [token, studio?.id, filterStatus]);

  const handleConfirm = async (id: string) => {
    try {
      const res = await fetch(`/api/v1/calendar/booking-requests/${id}/confirm`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
          'x-studio-id': studio?.id || '',
        },
        body: JSON.stringify({}),
      });

      if (!res.ok) {
        const errJson = await res.json();
        throw new Error(errJson.error || 'Failed to confirm booking request');
      }

      setSuccessMsg('Booking confirmed and scheduled on studio calendar.');
      fetchRequests();
    } catch (err: any) {
      setError(err.message);
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      <OperationsNavTabs />

      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Client Booking Requests</h1>
          <p className="text-sm text-muted">Review incoming self-booking requests, assign photographers, and confirm session slots.</p>
        </div>
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

      {/* Filter Tabs */}
      <div className="flex gap-2 border-b border-card-border pb-3">
        {['PENDING', 'CONFIRMED', 'CANCELLED', 'ALL'].map((s) => (
          <button
            key={s}
            onClick={() => setFilterStatus(s)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              filterStatus === s
                ? 'bg-card-border text-white border border-card-border/80'
                : 'text-muted hover:text-white hover:bg-card-border/30'
            }`}
          >
            {s}
          </button>
        ))}
      </div>

      {/* Requests List */}
      {requests.length === 0 ? (
        <div className="bg-card border border-card-border rounded-xl p-12 text-center text-sm text-muted">
          No booking requests found for this filter.
        </div>
      ) : (
        <div className="space-y-3">
          {requests.map((r) => {
            const isPending = r.status === 'PENDING';
            const isConfirmed = r.status === 'CONFIRMED';

            return (
              <div
                key={r.id}
                className="p-5 bg-card border border-card-border rounded-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4"
              >
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2.5">
                    <span className="font-bold text-white text-base">{r.client_name}</span>
                    <span
                      className={`text-xs font-semibold px-2.5 py-0.5 rounded border ${
                        isPending
                          ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                          : isConfirmed
                          ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                          : 'bg-red-500/10 text-red-400 border-red-500/20'
                      }`}
                    >
                      {r.status}
                    </span>
                    {r.booking_type && (
                      <span className="text-xs text-muted font-medium">({r.booking_type.name})</span>
                    )}
                  </div>

                  <div className="flex flex-wrap items-center gap-4 text-xs text-muted">
                    <span className="flex items-center gap-1 text-white">
                      <Calendar className="h-3.5 w-3.5 text-primary" />
                      {new Date(r.requested_start_at).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}
                    </span>
                    <span className="flex items-center gap-1">
                      <Mail className="h-3.5 w-3.5" />
                      {r.client_email}
                    </span>
                    {r.client_phone && (
                      <span className="flex items-center gap-1">
                        <Phone className="h-3.5 w-3.5" />
                        {r.client_phone}
                      </span>
                    )}
                  </div>

                  {r.message && <p className="text-xs text-muted/90 italic pt-1">&quot;{r.message}&quot;</p>}
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {isPending && (
                    <button
                      onClick={() => handleConfirm(r.id)}
                      className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold rounded-lg shadow-sm transition-all"
                    >
                      <CheckCircle2 className="h-4 w-4" /> Confirm & Schedule
                    </button>
                  )}
                  {isConfirmed && r.confirmed_event_id && (
                    <span className="text-xs text-muted flex items-center gap-1">
                      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" /> Scheduled
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
