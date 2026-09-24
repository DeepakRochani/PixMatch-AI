'use client';

import React, { useState, useEffect } from 'react';
import {
  Link as LinkIcon,
  Copy,
  Plus,
  AlertCircle,
  CheckCircle2,
  ExternalLink,
  ShieldOff,
} from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import { OperationsNavTabs } from '@/components/dashboard/OperationsNavTabs';
import { StudioBookingLinkDTO, StudioBookingTypeDTO } from '@pixmatch/types';

export default function BookingLinksPage() {
  const { token, studio } = useAuth();
  const [loading, setLoading] = useState(true);
  const [links, setLinks] = useState<StudioBookingLinkDTO[]>([]);
  const [bookingTypes, setBookingTypes] = useState<StudioBookingTypeDTO[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const [showModal, setShowModal] = useState(false);
  const [newLinkModal, setNewLinkModal] = useState<{ raw_token?: string; url?: string } | null>(null);
  const [formData, setFormData] = useState({
    booking_type_id: '',
    expires_in_days: 30,
  });

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      const [linksRes, typesRes] = await Promise.all([
        fetch('/api/v1/calendar/booking-links', {
          headers: { Authorization: `Bearer ${token}`, 'x-studio-id': studio?.id || '' },
        }),
        fetch('/api/v1/calendar/booking-types', {
          headers: { Authorization: `Bearer ${token}`, 'x-studio-id': studio?.id || '' },
        }),
      ]);

      if (linksRes.ok) {
        const json = await linksRes.json();
        setLinks(json.data || []);
      }
      if (typesRes.ok) {
        const json = await typesRes.json();
        setBookingTypes(json.data || []);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token) {
      fetchData();
    }
  }, [token, studio?.id]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/v1/calendar/booking-links', {
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
        throw new Error(errJson.error || 'Failed to generate link');
      }

      const json = await res.json();
      const created = json.data;
      setShowModal(false);
      setNewLinkModal({
        raw_token: created.raw_token,
        url: `${window.location.origin}${created.booking_url}`,
      });
      fetchData();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleRevoke = async (id: string) => {
    if (!confirm('Are you sure you want to deactivate this booking link?')) return;
    try {
      await fetch(`/api/v1/calendar/booking-links/${id}/revoke`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'x-studio-id': studio?.id || '' },
      });
      setSuccessMsg('Booking link revoked.');
      fetchData();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setSuccessMsg('Link copied to clipboard!');
    setTimeout(() => setSuccessMsg(null), 3000);
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      <OperationsNavTabs />

      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Client Self-Booking Links</h1>
          <p className="text-sm text-muted">Generate secure, shareable portal links for clients to book sessions online.</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-primary hover:bg-primary/90 text-white rounded-lg text-sm font-semibold shadow-sm transition-all"
        >
          <Plus className="h-4 w-4" /> Generate Booking Link
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

      {/* Newly Created Token Modal */}
      {newLinkModal && (
        <div className="p-5 bg-emerald-500/10 border border-emerald-500/30 rounded-xl space-y-3">
          <div className="flex items-center gap-2 text-emerald-400 font-semibold text-sm">
            <CheckCircle2 className="h-4 w-4" /> Booking Link Generated
          </div>
          <p className="text-xs text-muted">
            Share this link with your client. They will see live available timeslots and can select their preferred date.
          </p>
          <div className="flex items-center gap-2">
            <input
              type="text"
              readOnly
              value={newLinkModal.url}
              className="w-full px-3 py-2 bg-background border border-card-border rounded-lg text-xs text-white font-mono"
            />
            <button
              onClick={() => copyToClipboard(newLinkModal.url!)}
              className="px-4 py-2 bg-primary hover:bg-primary/90 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5"
            >
              <Copy className="h-3.5 w-3.5" /> Copy
            </button>
          </div>
        </div>
      )}

      {/* Links List */}
      {links.length === 0 ? (
        <div className="bg-card border border-card-border rounded-xl p-12 text-center text-sm text-muted">
          No booking links generated yet. Create one to send to leads or embed on your website.
        </div>
      ) : (
        <div className="bg-card border border-card-border rounded-xl overflow-hidden">
          <table className="w-full text-left text-sm">
            <thead className="bg-card-border/40 text-xs uppercase text-muted font-semibold">
              <tr>
                <th className="p-3.5">Offering / Type</th>
                <th className="p-3.5">Client / Lead</th>
                <th className="p-3.5">Created</th>
                <th className="p-3.5">Status</th>
                <th className="p-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-card-border/40">
              {links.map((l) => (
                <tr key={l.id} className="hover:bg-card-border/20 transition-colors">
                  <td className="p-3.5">
                    <div className="font-semibold text-white">{l.booking_type?.name || 'General Booking'}</div>
                    <div className="text-xs text-muted">{l.booking_type ? `${l.booking_type.duration_minutes} mins` : 'Flexible'}</div>
                  </td>
                  <td className="p-3.5 text-xs text-muted">
                    {l.client?.name || l.project?.name || 'General Public'}
                  </td>
                  <td className="p-3.5 text-xs text-muted">
                    {new Date(l.created_at).toLocaleDateString()}
                  </td>
                  <td className="p-3.5">
                    {l.is_active ? (
                      <span className="text-xs font-semibold px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                        Active
                      </span>
                    ) : (
                      <span className="text-xs font-semibold px-2 py-0.5 rounded bg-red-500/10 text-red-400 border border-red-500/20">
                        Revoked
                      </span>
                    )}
                  </td>
                  <td className="p-3.5 text-right">
                    {l.is_active && (
                      <button
                        onClick={() => handleRevoke(l.id)}
                        className="text-xs text-red-400 hover:text-red-300 font-medium inline-flex items-center gap-1"
                      >
                        <ShieldOff className="h-3.5 w-3.5" /> Revoke
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Create Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="bg-card border border-card-border rounded-xl p-6 max-w-md w-full space-y-4">
            <h3 className="text-lg font-bold text-white">Generate Self-Booking Link</h3>
            <form onSubmit={handleCreate} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-muted mb-1">Session Type</label>
                <select
                  value={formData.booking_type_id}
                  onChange={(e) => setFormData({ ...formData, booking_type_id: e.target.value })}
                  className="w-full px-3 py-2 bg-background border border-card-border rounded-lg text-sm text-white focus:outline-none focus:border-primary"
                >
                  <option value="">General (All available types)</option>
                  {bookingTypes.map((bt) => (
                    <option key={bt.id} value={bt.id}>
                      {bt.name} ({bt.duration_minutes}m)
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-muted mb-1">Expires in (Days)</label>
                <input
                  type="number"
                  min={1}
                  max={365}
                  value={formData.expires_in_days}
                  onChange={(e) => setFormData({ ...formData, expires_in_days: Number(e.target.value) })}
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
                  Generate Link
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
