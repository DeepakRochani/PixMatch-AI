'use client';

import React, { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import {
  Calendar,
  CheckCircle2,
  AlertCircle,
  Clock,
  DollarSign,
  ShieldCheck,
  Camera,
  MapPin,
  User,
  CreditCard,
  FileSignature,
  FileText,
  Mail,
  Phone,
  Layers,
  Sparkles,
  ExternalLink,
  ChevronRight,
  Send,
} from 'lucide-react';
import { PublicBookingViewDTO } from '@pixmatch/types';

export default function ClientBookingPortalPage() {
  const { token } = useParams() as { token: string };

  const [bookingData, setBookingData] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Self-booking state
  const [availableSlots, setAvailableSlots] = useState<any[]>([]);
  const [selectedSlot, setSelectedSlot] = useState<any | null>(null);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [clientName, setClientName] = useState('');
  const [clientEmail, setClientEmail] = useState('');
  const [clientPhone, setClientPhone] = useState('');
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submissionResult, setSubmissionResult] = useState<any | null>(null);

  const fetchBooking = async () => {
    if (!token) return;
    try {
      setLoading(true);
      setError(null);
      const res = await fetch(`/api/v1/public/booking/${token}`);
      const json = await res.json();
      if (json.success) {
        setBookingData(json.data);
        if (json.data.booking_type || json.data.booking_link) {
          // It's a self-booking link! Fetch availability
          loadAvailability();
        }
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

  const handleSelfBookSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSlot || !clientName || !clientEmail) return;

    try {
      setSubmitting(true);
      setError(null);
      const res = await fetch(`/api/v1/public/booking/${token}/request`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          start_at: selectedSlot.start_at,
          end_at: selectedSlot.end_at,
          timezone: selectedSlot.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone,
          client_name: clientName,
          client_email: clientEmail,
          client_phone: clientPhone,
          message,
        }),
      });
      const json = await res.json();
      if (json.success) {
        setSubmissionResult(json.data);
      } else {
        setError(json.error || 'Failed to submit booking request');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to submit booking');
    } finally {
      setSubmitting(false);
    }
  };

  useEffect(() => {
    fetchBooking();
  }, [token]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0c0d12] flex items-center justify-center p-6 text-white">
        <div className="text-center space-y-4">
          <div className="w-12 h-12 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-gray-400 font-medium">Loading booking portal...</p>
        </div>
      </div>
    );
  }

  if (error && !bookingData) {
    return (
      <div className="min-h-screen bg-[#0c0d12] flex items-center justify-center p-6 text-white">
        <div className="max-w-md w-full bg-[#161822] border border-red-500/20 rounded-2xl p-8 text-center space-y-5 shadow-2xl">
          <div className="w-14 h-14 bg-red-500/10 text-red-400 rounded-full flex items-center justify-center mx-auto">
            <AlertCircle className="w-7 h-7" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white">Booking Portal Unavailable</h1>
            <p className="text-sm text-gray-400 mt-2">{error || 'This link may be invalid or expired.'}</p>
          </div>
          <p className="text-xs text-gray-500">
            Please contact your photography studio for updated access.
          </p>
        </div>
      </div>
    );
  }

  // Check if this is a Phase 22 Self-Booking Link
  const isSelfBooking = Boolean(bookingData?.booking_link || bookingData?.booking_type);

  if (isSelfBooking) {
    const studio = bookingData.studio || { name: 'Photography Studio' };
    const bookingType = bookingData.booking_type;

    return (
      <div className="min-h-screen bg-[#0a0b0e] text-white selection:bg-primary selection:text-white pb-24">
        {/* Header */}
        <header className="border-b border-[#222533] bg-[#12141c]/90 backdrop-blur sticky top-0 z-30">
          <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-primary to-accent flex items-center justify-center text-white shadow-lg shadow-primary/20">
                <Camera className="w-5 h-5" />
              </div>
              <div>
                <h1 className="text-base font-bold text-white tracking-wide">{studio.name}</h1>
                <p className="text-xs text-gray-400">Direct Client Self-Booking</p>
              </div>
            </div>
          </div>
        </header>

        <main className="max-w-4xl mx-auto px-6 pt-10 space-y-8">
          {submissionResult ? (
            <div className="bg-[#13151f] border border-emerald-500/30 rounded-3xl p-8 sm:p-10 shadow-2xl text-center space-y-5">
              <div className="w-16 h-16 bg-emerald-500/10 text-emerald-400 rounded-full flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-white">
                  {submissionResult.status === 'CONFIRMED' ? 'Booking Confirmed!' : 'Booking Request Received!'}
                </h2>
                <p className="text-sm text-gray-400 mt-2 max-w-md mx-auto">
                  {submissionResult.status === 'CONFIRMED'
                    ? 'Your photography session has been scheduled directly on the studio calendar.'
                    : 'Your request has been delivered to the studio team and will be reviewed shortly.'}
                </p>
              </div>
              <div className="p-4 bg-[#181b26] border border-[#272b3b] rounded-2xl max-w-md mx-auto text-left text-xs space-y-2">
                <div className="flex justify-between">
                  <span className="text-gray-400">Client:</span>
                  <span className="font-semibold text-white">{submissionResult.client_name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Time:</span>
                  <span className="font-mono text-white">
                    {new Date(submissionResult.requested_start_at).toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Status:</span>
                  <span className="font-semibold text-emerald-400">{submissionResult.status}</span>
                </div>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {/* Left Column: Session Info */}
              <div className="space-y-6">
                <div className="bg-[#13151f] border border-[#232738] rounded-3xl p-6 shadow-xl space-y-4">
                  <span className="text-xs font-mono text-primary uppercase tracking-wider">Session Type</span>
                  <h2 className="text-xl font-bold text-white">{bookingType?.name || 'Studio Session'}</h2>
                  {bookingType?.description && (
                    <p className="text-xs text-gray-400">{bookingType.description}</p>
                  )}

                  <div className="space-y-2 pt-2 border-t border-[#232738] text-xs">
                    <div className="flex items-center gap-2 text-gray-300">
                      <Clock className="w-4 h-4 text-primary" />
                      <span>{bookingType?.duration_minutes || 60} minutes</span>
                    </div>
                    {bookingType?.price && (
                      <div className="flex items-center gap-2 text-gray-300">
                        <DollarSign className="w-4 h-4 text-emerald-400" />
                        <span>${Number(bookingType.price).toLocaleString()} {bookingType.currency || 'USD'}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Right Column: Slot Selection & Form */}
              <div className="md:col-span-2 space-y-6">
                <div className="bg-[#13151f] border border-[#232738] rounded-3xl p-6 sm:p-8 shadow-xl space-y-6">
                  <div>
                    <h3 className="text-lg font-bold text-white flex items-center gap-2">
                      <Calendar className="w-5 h-5 text-primary" />
                      <span>Select an Available Time Slot</span>
                    </h3>
                    <p className="text-xs text-gray-400 mt-1">
                      Times are presented in your local timezone ({Intl.DateTimeFormat().resolvedOptions().timeZone}).
                    </p>
                  </div>

                  {loadingSlots ? (
                    <div className="py-8 text-center text-xs text-gray-400 flex items-center justify-center gap-2">
                      <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                      <span>Computing real-time studio availability...</span>
                    </div>
                  ) : availableSlots.length > 0 ? (
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 max-h-56 overflow-y-auto pr-1">
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
                      No available slots found for this booking window. Please contact the studio directly.
                    </div>
                  )}

                  {selectedSlot && (
                    <form onSubmit={handleSelfBookSubmit} className="space-y-4 pt-4 border-t border-[#232738]">
                      <div className="text-xs font-semibold text-emerald-400 flex items-center gap-1.5">
                        <CheckCircle2 className="w-4 h-4" />
                        <span>
                          Selected: {new Date(selectedSlot.start_at).toLocaleString()}
                        </span>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label className="text-xs font-medium text-gray-300">Your Full Name *</label>
                          <input
                            type="text"
                            required
                            value={clientName}
                            onChange={(e) => setClientName(e.target.value)}
                            placeholder="Jane Doe"
                            className="mt-1 w-full bg-[#181b26] border border-[#292e42] rounded-xl px-3.5 py-2 text-sm text-white focus:outline-none focus:border-primary"
                          />
                        </div>
                        <div>
                          <label className="text-xs font-medium text-gray-300">Email Address *</label>
                          <input
                            type="email"
                            required
                            value={clientEmail}
                            onChange={(e) => setClientEmail(e.target.value)}
                            placeholder="jane@example.com"
                            className="mt-1 w-full bg-[#181b26] border border-[#292e42] rounded-xl px-3.5 py-2 text-sm text-white focus:outline-none focus:border-primary"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="text-xs font-medium text-gray-300">Phone Number (Optional)</label>
                        <input
                          type="tel"
                          value={clientPhone}
                          onChange={(e) => setClientPhone(e.target.value)}
                          placeholder="+1 (555) 000-0000"
                          className="mt-1 w-full bg-[#181b26] border border-[#292e42] rounded-xl px-3.5 py-2 text-sm text-white focus:outline-none focus:border-primary"
                        />
                      </div>

                      <div>
                        <label className="text-xs font-medium text-gray-300">Notes / Requests (Optional)</label>
                        <textarea
                          rows={2}
                          value={message}
                          onChange={(e) => setMessage(e.target.value)}
                          placeholder="Tell us about your shoot vision or specific requirements..."
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
                        {submitting ? (
                          <span>Reserving Session...</span>
                        ) : (
                          <>
                            <Send className="w-4 h-4" />
                            <span>Confirm Booking Request</span>
                          </>
                        )}
                      </button>
                    </form>
                  )}
                </div>
              </div>
            </div>
          )}
        </main>
      </div>
    );
  }

  // Otherwise, render Phase 21 Confirmed Project Booking View
  const { booking, studio } = bookingData;
  const { project, proposal, contract, payment_schedules } = booking || {};

  const totalPaid = payment_schedules?.reduce((sum: number, inst: any) => {
    return sum + (inst.status === 'PAID' ? Number(inst.amount) : 0);
  }, 0) || 0;

  const totalAmount = payment_schedules?.reduce((sum: number, inst: any) => sum + Number(inst.amount), 0)
    || (proposal?.total_amount ? Number(proposal.total_amount) : 0);

  const remainingBalance = Math.max(0, totalAmount - totalPaid);

  return (
    <div className="min-h-screen bg-[#0a0b0e] text-white selection:bg-primary selection:text-white pb-24">
      {/* Header */}
      <header className="border-b border-[#222533] bg-[#12141c]/90 backdrop-blur sticky top-0 z-30">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-primary to-accent flex items-center justify-center text-white shadow-lg shadow-primary/20">
              <Camera className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-base font-bold text-white tracking-wide">{studio?.name || 'Studio'}</h1>
              <p className="text-xs text-gray-400">Client Booking & Project Hub</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="px-3 py-1 rounded-full text-xs font-semibold tracking-wide bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>CONFIRMED BOOKING</span>
            </span>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-5xl mx-auto px-6 pt-10 space-y-8">
        {/* Hero Card */}
        {project && (
          <div className="bg-[#13151f] border border-[#232738] rounded-3xl p-8 sm:p-10 shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 right-0 w-96 h-96 bg-primary/10 rounded-full blur-3xl pointer-events-none" />
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-xs font-mono text-primary uppercase tracking-widest">
                  <span>{project.project_type?.replace(/_/g, ' ') || 'PHOTOGRAPHY'}</span>
                  <span>•</span>
                  <span>Status: {project.status}</span>
                </div>
                <h2 className="text-2xl sm:text-3xl font-extrabold text-white">{project.title}</h2>
                <div className="flex flex-wrap items-center gap-4 text-xs text-gray-300 pt-1">
                  {project.start_date && (
                    <span className="flex items-center gap-1.5 bg-[#1a1d2b] px-3 py-1.5 rounded-lg border border-[#2b3044]">
                      <Calendar className="w-3.5 h-3.5 text-primary" />
                      {new Date(project.start_date).toLocaleDateString(undefined, {
                        weekday: 'long',
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                      })}
                    </span>
                  )}
                  {project.location && (
                    <span className="flex items-center gap-1.5 bg-[#1a1d2b] px-3 py-1.5 rounded-lg border border-[#2b3044]">
                      <MapPin className="w-3.5 h-3.5 text-accent" />
                      {project.location}
                    </span>
                  )}
                </div>
              </div>

              {/* Financial Status Quick Widget */}
              <div className="bg-[#181b26] border border-[#292e42] rounded-2xl p-6 min-w-[240px] space-y-3">
                <div>
                  <span className="text-xs text-gray-400">Total Investment</span>
                  <p className="text-2xl font-black text-white">${totalAmount.toLocaleString()}</p>
                </div>
                <div className="grid grid-cols-2 gap-3 pt-2 border-t border-[#292e42] text-xs">
                  <div>
                    <span className="text-gray-400">Paid to Date</span>
                    <p className="font-bold text-emerald-400">${totalPaid.toLocaleString()}</p>
                  </div>
                  <div>
                    <span className="text-gray-400">Balance Due</span>
                    <p className="font-bold text-amber-300">${remainingBalance.toLocaleString()}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 2-Column Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column: Payment Schedule & Installments */}
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-[#13151f] border border-[#232738] rounded-3xl p-6 sm:p-8 shadow-xl space-y-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <CreditCard className="w-5 h-5 text-primary" />
                  <h3 className="text-lg font-bold text-white">Payment Schedule & Invoices</h3>
                </div>
              </div>

              {payment_schedules && payment_schedules.length > 0 ? (
                <div className="divide-y divide-[#212536] border border-[#232738] rounded-2xl overflow-hidden bg-[#181b26]">
                  {payment_schedules.map((inst: any, idx: number) => (
                    <div
                      key={idx}
                      className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-8 h-8 rounded-xl flex items-center justify-center text-xs font-bold ${
                            inst.status === 'PAID'
                              ? 'bg-emerald-500/20 text-emerald-400'
                              : inst.status === 'OVERDUE'
                              ? 'bg-rose-500/20 text-rose-400'
                              : 'bg-primary/20 text-primary'
                          }`}
                        >
                          {inst.installment_number || idx + 1}
                        </div>
                        <div>
                          <h4 className="text-sm font-semibold text-white">{inst.title}</h4>
                          <div className="flex items-center gap-3 text-xs text-gray-400 mt-0.5">
                            {inst.due_date && (
                              <span>Due: {new Date(inst.due_date).toLocaleDateString()}</span>
                            )}
                            {inst.paid_at && (
                              <span className="text-emerald-400">
                                Paid on {new Date(inst.paid_at).toLocaleDateString()}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center justify-between sm:justify-end gap-4">
                        <span className="text-base font-bold text-white">
                          ${Number(inst.amount).toLocaleString()}
                        </span>
                        <span
                          className={`px-2.5 py-1 rounded-full text-[11px] font-semibold border ${
                            inst.status === 'PAID'
                              ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                              : inst.status === 'OVERDUE'
                              ? 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                              : 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                          }`}
                        >
                          {inst.status}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-6 text-center text-gray-500 text-xs bg-[#181b26] rounded-2xl">
                  No payment schedule configured yet.
                </div>
              )}
            </div>

            {/* Contract Card */}
            {contract && (
              <div className="bg-[#13151f] border border-[#232738] rounded-3xl p-6 sm:p-8 shadow-xl space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <FileSignature className="w-5 h-5 text-primary" />
                    <h3 className="text-lg font-bold text-white">Signed Photography Agreement</h3>
                  </div>
                  <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                    {contract.status}
                  </span>
                </div>

                <div className="bg-[#181b26] border border-[#272b3b] rounded-2xl p-5 space-y-3">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-gray-400">Contract Number</span>
                    <span className="font-mono text-white font-medium">{contract.contract_number}</span>
                  </div>
                  {contract.signed_at && (
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-gray-400">Client Signature</span>
                      <span className="font-semibold text-white">
                        {contract.signed_by_name} on {new Date(contract.signed_at).toLocaleDateString()}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Right Column: Studio Contact */}
          <div className="space-y-6">
            <div className="bg-[#13151f] border border-[#232738] rounded-3xl p-6 shadow-xl space-y-4">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <User className="w-4 h-4 text-primary" />
                <span>Your Photography Team</span>
              </h3>
              <div className="p-4 bg-[#181b26] border border-[#272b3b] rounded-2xl space-y-3">
                <h4 className="text-base font-bold text-white">{studio?.name || 'Studio'}</h4>
                <div className="space-y-2 text-xs text-gray-300">
                  {studio?.email && (
                    <a
                      href={`mailto:${studio.email}`}
                      className="flex items-center gap-2 text-gray-300 hover:text-primary transition"
                    >
                      <Mail className="w-3.5 h-3.5 text-primary" />
                      <span>{studio.email}</span>
                    </a>
                  )}
                  {studio?.phone && (
                    <a
                      href={`tel:${studio.phone}`}
                      className="flex items-center gap-2 text-gray-300 hover:text-primary transition"
                    >
                      <Phone className="w-3.5 h-3.5 text-accent" />
                      <span>{studio.phone}</span>
                    </a>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <footer className="pt-10 border-t border-[#1f2333] text-center space-y-2 text-xs text-gray-500">
          <p>
            Secured by PixMatch AI Client Portal for <span className="text-gray-300 font-medium">{studio?.name || 'Studio'}</span>
          </p>
        </footer>
      </main>
    </div>
  );
}
