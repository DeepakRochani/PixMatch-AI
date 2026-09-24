'use client';

import React, { useState, useEffect, use } from 'react';
import Link from 'next/link';

interface ProposalItem {
  id: string;
  name: string;
  description?: string | null;
  quantity: number;
  unit_price: number;
  total_price: number;
  is_optional: boolean;
  is_selected: boolean;
  item_type: string;
}

interface ProposalData {
  id: string;
  proposal_number: string;
  title: string;
  scope_of_work?: string | null;
  deliverables?: string[] | null;
  notes?: string | null;
  subtotal: number;
  tax_rate: number;
  tax_amount: number;
  discount_amount: number;
  total_amount: number;
  currency: string;
  status: string;
  valid_until?: string | null;
  accepted_at?: string | null;
  items: ProposalItem[];
  lead?: {
    id: string;
    first_name: string;
    last_name: string;
    email: string;
    phone?: string | null;
    company?: string | null;
  } | null;
  photographer?: {
    id: string;
    name: string;
    email: string;
    business_name?: string | null;
  } | null;
  contract_token?: string | null;
}

export default function PublicProposalPortalPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const resolvedParams = use(params);
  const token = resolvedParams.token;

  const [proposal, setProposal] = useState<ProposalData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedItemIds, setSelectedItemIds] = useState<string[]>([]);
  const [clientNotes, setClientNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [actionSuccess, setActionSuccess] = useState<{
    status: 'ACCEPTED' | 'DECLINED';
    contract_token?: string | null;
  } | null>(null);

  const [showAcceptModal, setShowAcceptModal] = useState(false);
  const [showDeclineModal, setShowDeclineModal] = useState(false);
  const [declineReason, setDeclineReason] = useState('');

  useEffect(() => {
    fetchProposal();
  }, [token]);

  async function fetchProposal() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/portal/proposals/${token}`);
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to load proposal');
      }
      setProposal(data.proposal);
      // Initialize selected items with items that are currently selected (or mandatory)
      if (data.proposal?.items) {
        const selected = data.proposal.items
          .filter((it: ProposalItem) => !it.is_optional || it.is_selected)
          .map((it: ProposalItem) => it.id);
        setSelectedItemIds(selected);
      }
    } catch (err: any) {
      setError(err.message || 'Error loading proposal');
    } finally {
      setLoading(false);
    }
  }

  const toggleItem = (item: ProposalItem) => {
    if (!item.is_optional || proposal?.status !== 'SENT') return;
    if (selectedItemIds.includes(item.id)) {
      setSelectedItemIds(selectedItemIds.filter((id) => id !== item.id));
    } else {
      setSelectedItemIds([...selectedItemIds, item.id]);
    }
  };

  // Calculate live totals based on client selected optional items
  const calculateLiveTotals = () => {
    if (!proposal) return { subtotal: 0, tax: 0, discount: 0, total: 0 };
    const items = proposal.items || [];
    const activeItems = items.filter((it) => !it.is_optional || selectedItemIds.includes(it.id));
    const subtotal = activeItems.reduce((sum, it) => sum + Number(it.total_price), 0);
    const discount = Number(proposal.discount_amount || 0);
    const taxableAmount = Math.max(0, subtotal - discount);
    const tax = Number(proposal.tax_rate) > 0 ? (taxableAmount * Number(proposal.tax_rate)) / 100 : 0;
    const total = taxableAmount + tax;
    return { subtotal, tax, discount, total };
  };

  const handleAccept = async () => {
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch(`/api/portal/proposals/${token}/accept`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          selected_item_ids: selectedItemIds,
          client_notes: clientNotes,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to accept proposal');
      setActionSuccess({
        status: 'ACCEPTED',
        contract_token: data.contract_token,
      });
      setShowAcceptModal(false);
      fetchProposal();
    } catch (err: any) {
      setError(err.message || 'Failed to accept proposal');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDecline = async () => {
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch(`/api/portal/proposals/${token}/decline`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: declineReason }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to decline proposal');
      setActionSuccess({ status: 'DECLINED' });
      setShowDeclineModal(false);
      fetchProposal();
    } catch (err: any) {
      setError(err.message || 'Failed to decline proposal');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-4">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-slate-400 text-sm font-medium">Securing proposal document...</p>
        </div>
      </div>
    );
  }

  if (error || !proposal) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-2xl p-8 text-center shadow-2xl">
          <div className="w-14 h-14 mx-auto rounded-full bg-rose-500/10 border border-rose-500/20 text-rose-400 flex items-center justify-center mb-4">
            <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-white mb-2">Proposal Unavailable</h2>
          <p className="text-slate-400 text-sm mb-6">{error || 'This proposal link is invalid or has expired.'}</p>
          <p className="text-xs text-slate-500">Please contact your photographer if you need a new secure proposal link.</p>
        </div>
      </div>
    );
  }

  const liveTotals = calculateLiveTotals();
  const isAccepted = proposal.status === 'ACCEPTED' || actionSuccess?.status === 'ACCEPTED';
  const isDeclined = proposal.status === 'DECLINED' || actionSuccess?.status === 'DECLINED';
  const isSent = proposal.status === 'SENT' && !actionSuccess;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 py-10 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto space-y-8">
        {/* Header Branding */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pb-6 border-b border-slate-800">
          <div>
            <span className="text-xs font-semibold tracking-wider text-indigo-400 uppercase bg-indigo-500/10 px-3 py-1 rounded-full border border-indigo-500/20">
              Client Proposal Portal
            </span>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white mt-2">
              {proposal.photographer?.business_name || proposal.photographer?.name || 'PixMatch Photography'}
            </h1>
          </div>
          <div className="text-right">
            <div className="text-xs text-slate-400">Proposal Reference</div>
            <div className="font-mono text-sm font-semibold text-slate-200">{proposal.proposal_number}</div>
            {proposal.valid_until && (
              <div className="text-xs text-amber-400 mt-1">
                Valid until {new Date(proposal.valid_until).toLocaleDateString()}
              </div>
            )}
          </div>
        </div>

        {/* Status Alerts */}
        {isAccepted && (
          <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-2xl p-6 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <div>
                <h3 className="text-base font-bold text-emerald-300">Proposal Accepted!</h3>
                <p className="text-xs text-emerald-400/80">
                  Thank you! Your photographer has been notified. Next step is signing your photography contract.
                </p>
              </div>
            </div>
            {(actionSuccess?.contract_token || proposal.contract_token) && (
              <Link
                href={`/portal/contract/${actionSuccess?.contract_token || proposal.contract_token}`}
                className="px-5 py-2.5 rounded-xl bg-emerald-500 text-slate-950 font-bold text-sm hover:bg-emerald-400 transition-colors shadow-lg shadow-emerald-500/20 text-center shrink-0"
              >
                Review & Sign Contract →
              </Link>
            )}
          </div>
        )}

        {isDeclined && (
          <div className="bg-rose-500/10 border border-rose-500/30 rounded-2xl p-6 flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-rose-500/20 text-rose-400 flex items-center justify-center shrink-0">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
            <div>
              <h3 className="text-base font-bold text-rose-300">Proposal Declined</h3>
              <p className="text-xs text-rose-400/80">This proposal has been marked as declined.</p>
            </div>
          </div>
        )}

        {/* Proposal Summary Card */}
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 space-y-6 shadow-xl">
          <div>
            <h2 className="text-2xl font-bold text-white mb-2">{proposal.title}</h2>
            {proposal.lead && (
              <p className="text-sm text-slate-400">
                Prepared specifically for <span className="text-slate-200 font-medium">{proposal.lead.first_name} {proposal.lead.last_name}</span> ({proposal.lead.email})
              </p>
            )}
          </div>

          {proposal.scope_of_work && (
            <div className="space-y-2 pt-4 border-t border-slate-800">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400">Scope of Work</h3>
              <div className="bg-slate-950/60 p-4 rounded-xl text-slate-300 text-sm whitespace-pre-wrap leading-relaxed border border-slate-800/80">
                {proposal.scope_of_work}
              </div>
            </div>
          )}

          {proposal.deliverables && proposal.deliverables.length > 0 && (
            <div className="space-y-2 pt-2">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400">Included Deliverables</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {proposal.deliverables.map((item, idx) => (
                  <div key={idx} className="flex items-center gap-2.5 bg-slate-950/40 px-3.5 py-2.5 rounded-xl border border-slate-800 text-xs text-slate-200">
                    <span className="w-2 h-2 rounded-full bg-indigo-400" />
                    <span>{item}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Line Items Selection Table */}
          <div className="space-y-3 pt-4 border-t border-slate-800">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400">Packages & Add-ons</h3>
              {isSent && <span className="text-xs text-indigo-400">Customize optional add-ons below</span>}
            </div>

            <div className="space-y-3">
              {proposal.items.map((item) => {
                const isSelected = !item.is_optional || selectedItemIds.includes(item.id);
                return (
                  <div
                    key={item.id}
                    onClick={() => toggleItem(item)}
                    className={`p-4 rounded-2xl border transition-all ${
                      item.is_optional && isSent ? 'cursor-pointer' : ''
                    } ${
                      isSelected
                        ? 'bg-slate-950/80 border-indigo-500/40 shadow-sm'
                        : 'bg-slate-950/20 border-slate-800/60 opacity-60'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-start gap-3">
                        {item.is_optional ? (
                          <input
                            type="checkbox"
                            checked={isSelected}
                            disabled={!isSent}
                            onChange={() => toggleItem(item)}
                            className="mt-1 w-4 h-4 rounded border-slate-700 bg-slate-900 text-indigo-600 focus:ring-indigo-500 focus:ring-offset-slate-950"
                          />
                        ) : (
                          <div className="mt-1 w-4 h-4 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 flex items-center justify-center text-[10px]">
                            ✓
                          </div>
                        )}
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-slate-100 text-sm">{item.name}</span>
                            {item.is_optional && (
                              <span className="text-[10px] uppercase font-semibold px-2 py-0.5 rounded bg-indigo-500/10 text-indigo-300 border border-indigo-500/20">
                                Optional Add-on
                              </span>
                            )}
                          </div>
                          {item.description && (
                            <p className="text-xs text-slate-400 mt-1">{item.description}</p>
                          )}
                          <div className="text-xs text-slate-500 mt-1">
                            Qty: {item.quantity} × {proposal.currency} {Number(item.unit_price).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                          </div>
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <div className="font-bold text-sm text-slate-100">
                          {proposal.currency} {Number(item.total_price).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Pricing Totals */}
          <div className="pt-6 border-t border-slate-800 space-y-2.5 max-w-xs ml-auto text-sm">
            <div className="flex justify-between text-slate-400">
              <span>Subtotal</span>
              <span className="font-mono text-slate-200">
                {proposal.currency} {liveTotals.subtotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </span>
            </div>
            {liveTotals.discount > 0 && (
              <div className="flex justify-between text-emerald-400">
                <span>Discount</span>
                <span className="font-mono">
                  -{proposal.currency} {liveTotals.discount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </span>
              </div>
            )}
            {proposal.tax_rate > 0 && (
              <div className="flex justify-between text-slate-400">
                <span>Tax ({proposal.tax_rate}%)</span>
                <span className="font-mono text-slate-200">
                  {proposal.currency} {liveTotals.tax.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </span>
              </div>
            )}
            <div className="flex justify-between text-base font-extrabold text-white pt-3 border-t border-slate-800">
              <span>Total Investment</span>
              <span className="font-mono text-indigo-300">
                {proposal.currency} {liveTotals.total.toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </span>
            </div>
          </div>

          {/* Client Notes / Special Instructions */}
          {isSent && (
            <div className="pt-6 border-t border-slate-800 space-y-2">
              <label className="text-xs font-semibold uppercase tracking-wider text-slate-400 block">
                Questions or Special Instructions (Optional)
              </label>
              <textarea
                value={clientNotes}
                onChange={(e) => setClientNotes(e.target.value)}
                placeholder="Add any specific requests, shoot dates, or questions before accepting..."
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-sm text-slate-200 placeholder-slate-600 focus:outline-none focus:border-indigo-500"
                rows={3}
              />
            </div>
          )}

          {/* Action Bar */}
          {isSent && (
            <div className="pt-6 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setShowDeclineModal(true)}
                className="w-full sm:w-auto px-5 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-sm transition-colors"
              >
                Decline Proposal
              </button>
              <button
                type="button"
                onClick={() => setShowAcceptModal(true)}
                className="w-full sm:w-auto px-8 py-3 rounded-xl bg-gradient-to-r from-indigo-500 to-indigo-600 hover:from-indigo-600 hover:to-indigo-700 text-white font-bold text-sm transition-all shadow-lg shadow-indigo-500/25 flex items-center justify-center gap-2"
              >
                <span>Accept Proposal</span>
                <span>→</span>
              </button>
            </div>
          )}
        </div>

        {/* Footer info */}
        <div className="text-center text-xs text-slate-600 space-y-1">
          <p>Protected by PixMatch AI 256-bit Portal Security</p>
          <p>© {new Date().getFullYear()} PixMatch. All rights reserved.</p>
        </div>
      </div>

      {/* Accept Modal */}
      {showAcceptModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 space-y-6 shadow-2xl">
            <h3 className="text-xl font-bold text-white">Confirm Acceptance</h3>
            <p className="text-sm text-slate-300">
              You are about to accept this photography proposal for a total of{' '}
              <span className="text-indigo-400 font-bold">
                {proposal.currency} {liveTotals.total.toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </span>
              . Upon confirmation, you will be automatically routed to review and e-sign the formal service contract.
            </p>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                disabled={submitting}
                onClick={() => setShowAcceptModal(false)}
                className="px-4 py-2.5 rounded-xl bg-slate-800 text-slate-300 font-semibold text-sm hover:bg-slate-700 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={submitting}
                onClick={handleAccept}
                className="px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-sm transition-colors flex items-center gap-2"
              >
                {submitting && <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />}
                <span>Confirm & Proceed</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Decline Modal */}
      {showDeclineModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 space-y-6 shadow-2xl">
            <h3 className="text-xl font-bold text-white">Decline Proposal</h3>
            <p className="text-sm text-slate-300">
              Please let your photographer know if there is anything they can adjust for you.
            </p>

            <textarea
              value={declineReason}
              onChange={(e) => setDeclineReason(e.target.value)}
              placeholder="Reason for declining or feedback (optional)..."
              className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-sm text-slate-200 placeholder-slate-600 focus:outline-none focus:border-rose-500"
              rows={3}
            />

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                disabled={submitting}
                onClick={() => setShowDeclineModal(false)}
                className="px-4 py-2.5 rounded-xl bg-slate-800 text-slate-300 font-semibold text-sm hover:bg-slate-700 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={submitting}
                onClick={handleDecline}
                className="px-6 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-sm transition-colors flex items-center gap-2"
              >
                {submitting && <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />}
                <span>Decline Proposal</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
