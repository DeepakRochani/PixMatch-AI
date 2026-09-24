'use client';

import React, { useState, useEffect } from 'react';
import {
  Tag,
  Clock,
  Plus,
  AlertCircle,
  CheckCircle2,
  Globe,
  Lock,
} from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import { OperationsNavTabs } from '@/components/dashboard/OperationsNavTabs';
import { StudioBookingTypeDTO } from '@pixmatch/types';

export default function BookingTypesPage() {
  const { token, studio } = useAuth();
  const [loading, setLoading] = useState(true);
  const [bookingTypes, setBookingTypes] = useState<StudioBookingTypeDTO[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    duration_minutes: 60,
    buffer_before_minutes: 0,
    buffer_after_minutes: 15,
    price: 0,
    currency: 'INR',
    requires_manual_confirmation: true,
    public_bookable: true,
  });

  const fetchTypes = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch('/api/v1/calendar/booking-types', {
        headers: { Authorization: `Bearer ${token}`, 'x-studio-id': studio?.id || '' },
      });
      if (!res.ok) throw new Error('Failed to load booking types');
      const json = await res.json();
      setBookingTypes(json.data || []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token) {
      fetchTypes();
    }
  }, [token, studio?.id]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/v1/calendar/booking-types', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
          'x-studio-id': studio?.id || '',
        },
        body: JSON.stringify(formData),
      });

      if (!res.ok) {
        const errJson = await res.json();
        throw new Error(errJson.error || 'Failed to create booking type');
      }

      setShowModal(false);
      setFormData({
        name: '',
        description: '',
        duration_minutes: 60,
        buffer_before_minutes: 0,
        buffer_after_minutes: 15,
        price: 0,
        currency: 'INR',
        requires_manual_confirmation: true,
        public_bookable: true,
      });
      setSuccessMsg('Booking type created.');
      fetchTypes();
    } catch (err: any) {
      setError(err.message);
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      <OperationsNavTabs />

      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Booking Types & Packages</h1>
          <p className="text-sm text-muted">Define photography sessions, consultation durations, setup buffers, and client booking offerings.</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-primary hover:bg-primary/90 text-white rounded-lg text-sm font-semibold shadow-sm transition-all"
        >
          <Plus className="h-4 w-4" /> New Booking Type
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

      {bookingTypes.length === 0 ? (
        <div className="bg-card border border-card-border rounded-xl p-12 text-center text-sm text-muted">
          No booking types configured yet. Create session offerings like &quot;Wedding Consultation&quot;, &quot;Portrait Session&quot;, or &quot;Commercial Shoot&quot;.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {bookingTypes.map((bt) => (
            <div key={bt.id} className="p-5 rounded-xl bg-card border border-card-border space-y-3">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-lg bg-primary/10 text-primary border border-primary/20">
                    <Tag className="h-4 w-4" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-white text-base">{bt.name}</h3>
                    <div className="flex items-center gap-1.5 text-xs text-muted mt-0.5">
                      <Clock className="h-3.5 w-3.5" />
                      <span>{bt.duration_minutes} mins</span>
                      {bt.buffer_after_minutes > 0 && <span>(+{bt.buffer_after_minutes}m buffer)</span>}
                    </div>
                  </div>
                </div>
                {bt.public_bookable ? (
                  <span className="flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                    <Globe className="h-3 w-3" /> Public
                  </span>
                ) : (
                  <span className="flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded bg-muted/10 text-muted border border-muted/20">
                    <Lock className="h-3 w-3" /> Private
                  </span>
                )}
              </div>

              {bt.description && <p className="text-xs text-muted line-clamp-2">{bt.description}</p>}

              <div className="pt-3 border-t border-card-border/40 flex items-center justify-between text-xs">
                <span className="text-muted">
                  {bt.price ? `${bt.currency || 'INR'} ${Number(bt.price).toLocaleString()}` : 'Free / Quote'}
                </span>
                <span className="text-muted/80">
                  {bt.requires_manual_confirmation ? 'Requires Review' : 'Auto-Confirmed'}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="bg-card border border-card-border rounded-xl p-6 max-w-md w-full space-y-4">
            <h3 className="text-lg font-bold text-white">Create Booking Type</h3>
            <form onSubmit={handleCreate} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-muted mb-1">Session Name</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g. Wedding Consultation (45 min)"
                  className="w-full px-3 py-2 bg-background border border-card-border rounded-lg text-sm text-white focus:outline-none focus:border-primary"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-muted mb-1">Duration (Mins)</label>
                  <input
                    type="number"
                    required
                    min={5}
                    value={formData.duration_minutes}
                    onChange={(e) => setFormData({ ...formData, duration_minutes: Number(e.target.value) })}
                    className="w-full px-3 py-2 bg-background border border-card-border rounded-lg text-sm text-white focus:outline-none focus:border-primary"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-muted mb-1">Buffer After (Mins)</label>
                  <input
                    type="number"
                    min={0}
                    value={formData.buffer_after_minutes}
                    onChange={(e) => setFormData({ ...formData, buffer_after_minutes: Number(e.target.value) })}
                    className="w-full px-3 py-2 bg-background border border-card-border rounded-lg text-sm text-white focus:outline-none focus:border-primary"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-muted mb-1">Price (Optional Estimate)</label>
                <input
                  type="number"
                  min={0}
                  value={formData.price}
                  onChange={(e) => setFormData({ ...formData, price: Number(e.target.value) })}
                  className="w-full px-3 py-2 bg-background border border-card-border rounded-lg text-sm text-white focus:outline-none focus:border-primary"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-muted mb-1">Description (Optional)</label>
                <textarea
                  rows={2}
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Details for clients during self-booking"
                  className="w-full px-3 py-2 bg-background border border-card-border rounded-lg text-sm text-white focus:outline-none focus:border-primary"
                />
              </div>
              <div className="flex justify-end gap-2 pt-3 border-t border-card-border">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-muted hover:text-white rounded-lg border border-card-border"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-semibold bg-primary hover:bg-primary/90 text-white rounded-lg"
                >
                  Create Type
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
