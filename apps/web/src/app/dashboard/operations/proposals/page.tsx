'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  FileText,
  PlusCircle,
  Search,
  Filter,
  Eye,
  Send,
  Copy,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  ExternalLink,
  ChevronRight,
  Clock,
  Ban,
  FileCheck,
  Calendar,
  DollarSign,
  User,
  X,
} from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import { OperationsNavTabs } from '@/components/dashboard/OperationsNavTabs';
import { StudioProposalDTO, StudioProposalStatus } from '@pixmatch/types';

const STATUS_BADGES: Record<StudioProposalStatus, { label: string; bg: string; text: string; border: string }> = {
  [StudioProposalStatus.DRAFT]: { label: 'Draft', bg: 'bg-zinc-500/10', text: 'text-zinc-400', border: 'border-zinc-500/30' },
  [StudioProposalStatus.SENT]: { label: 'Sent', bg: 'bg-blue-500/10', text: 'text-blue-400', border: 'border-blue-500/30' },
  [StudioProposalStatus.VIEWED]: { label: 'Viewed', bg: 'bg-amber-500/10', text: 'text-amber-400', border: 'border-amber-500/30' },
  [StudioProposalStatus.ACCEPTED]: { label: 'Accepted', bg: 'bg-emerald-500/10', text: 'text-emerald-400', border: 'border-emerald-500/30' },
  [StudioProposalStatus.REJECTED]: { label: 'Declined', bg: 'bg-rose-500/10', text: 'text-rose-400', border: 'border-rose-500/30' },
  [StudioProposalStatus.EXPIRED]: { label: 'Expired', bg: 'bg-orange-500/10', text: 'text-orange-400', border: 'border-orange-500/30' },
  [StudioProposalStatus.SUPERSEDED]: { label: 'Superseded', bg: 'bg-purple-500/10', text: 'text-purple-400', border: 'border-purple-500/30' },
  [StudioProposalStatus.VOID]: { label: 'Void', bg: 'bg-red-500/10', text: 'text-red-400', border: 'border-red-500/30' },
};

export default function ProposalsListPage() {
  const { token, studio } = useAuth();
  const [proposals, setProposals] = useState<StudioProposalDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  // Send Modal
  const [sendModalProposal, setSendModalProposal] = useState<StudioProposalDTO | null>(null);
  const [sendEmail, setSendEmail] = useState('');
  const [sendMessage, setSendMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [successToast, setSuccessToast] = useState<string | null>(null);

  const fetchProposals = async () => {
    if (!token || !studio?.id) return;
    try {
      setLoading(true);
      setError(null);
      const res = await fetch(`/api/v1/proposals?search=${encodeURIComponent(searchTerm)}`, {
        headers: {
          Authorization: `Bearer ${token}`,
          'x-studio-id': studio.id,
        },
      });
      const json = await res.json();
      if (json.success) {
        setProposals(json.data || []);
      } else {
        setError(json.error || 'Failed to load proposals');
      }
    } catch (err: any) {
      setError(err.message || 'Error fetching proposals');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProposals();
  }, [token, studio?.id, searchTerm]);

  const handleSendProposal = async () => {
    if (!sendModalProposal || !token || !studio?.id) return;
    try {
      setSending(true);
      const res = await fetch(`/api/v1/proposals/${sendModalProposal.id}/send`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
          'x-studio-id': studio.id,
        },
        body: JSON.stringify({
          recipient_email: sendEmail || undefined,
          message: sendMessage || undefined,
        }),
      });
      const json = await res.json();
      if (json.success) {
        setSendModalProposal(null);
        setSuccessToast(`Proposal #${sendModalProposal.proposal_number} sent successfully!`);
        fetchProposals();
      } else {
        alert(json.error || 'Failed to send proposal');
      }
    } catch (err: any) {
      alert(err.message || 'Error sending proposal');
    } finally {
      setSending(false);
    }
  };

  const copyPublicLink = (proposal: StudioProposalDTO) => {
    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    // If public token is available on item or we generate portal link
    const token = proposal.public_token || proposal.id;
    const url = `${origin}/portal/proposal/${token}`;
    navigator.clipboard.writeText(url);
    setCopiedId(proposal.id);
    setTimeout(() => setCopiedId(null), 2500);
  };

  const filteredProposals = proposals.filter((p) => {
    if (statusFilter !== 'ALL' && p.status !== statusFilter) return false;
    return true;
  });

  // Calculate statistics
  const totalValue = proposals.reduce((acc, p) => acc + (p.total_amount || 0), 0);
  const acceptedCount = proposals.filter((p) => p.status === StudioProposalStatus.ACCEPTED).length;
  const pendingCount = proposals.filter((p) => p.status === StudioProposalStatus.SENT || p.status === StudioProposalStatus.VIEWED).length;

  return (
    <div className="space-y-6">
      {/* Navigation Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-white tracking-tight flex items-center gap-2.5">
            <FileText className="h-6 w-6 text-primary" />
            Proposals & Quotes
          </h1>
          <p className="text-sm text-muted mt-1">
            Build itemized quotes, share interactive client portals, and track client acceptance.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Link
            href="/dashboard/operations/proposals/new"
            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-primary to-accent hover:from-primary/90 hover:to-accent/90 text-white text-xs font-bold rounded-lg shadow-sm shadow-primary/20 transition-all"
          >
            <PlusCircle className="h-4 w-4" />
            Create Proposal
          </Link>
        </div>
      </div>

      <OperationsNavTabs />

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-4 rounded-xl bg-card/60 border border-card-border">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted">Total Proposals</span>
            <FileText className="h-4 w-4 text-primary" />
          </div>
          <div className="text-2xl font-black text-white mt-1">{proposals.length}</div>
          <div className="text-xs text-muted mt-1">Total Pipeline Value: ${totalValue.toLocaleString()}</div>
        </div>

        <div className="p-4 rounded-xl bg-card/60 border border-card-border">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted">Awaiting Decision</span>
            <Clock className="h-4 w-4 text-amber-400" />
          </div>
          <div className="text-2xl font-black text-amber-400 mt-1">{pendingCount}</div>
          <div className="text-xs text-muted mt-1">Active proposals sent to clients</div>
        </div>

        <div className="p-4 rounded-xl bg-card/60 border border-card-border">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted">Accepted</span>
            <CheckCircle2 className="h-4 w-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-black text-emerald-400 mt-1">{acceptedCount}</div>
          <div className="text-xs text-muted mt-1">Ready for contract & booking</div>
        </div>
      </div>

      {/* Search & Filter Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-3 rounded-xl bg-card/40 border border-card-border">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted" />
          <input
            type="text"
            placeholder="Search by proposal #, client, or title..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-background border border-card-border rounded-lg text-xs text-white placeholder-muted focus:outline-none focus:border-primary transition-all"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0">
          <Filter className="h-3.5 w-3.5 text-muted shrink-0" />
          <span className="text-xs text-muted font-medium shrink-0">Status:</span>
          {['ALL', 'DRAFT', 'SENT', 'VIEWED', 'ACCEPTED', 'REJECTED'].map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
                statusFilter === st
                  ? 'bg-primary text-white'
                  : 'bg-card/60 text-muted hover:text-white border border-card-border'
              }`}
            >
              {st === 'ALL' ? 'All' : st.charAt(0) + st.slice(1).toLowerCase()}
            </button>
          ))}
        </div>
      </div>

      {/* Success Toast */}
      {successToast && (
        <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-medium flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4" />
            {successToast}
          </div>
          <button onClick={() => setSuccessToast(null)} className="text-emerald-400 hover:text-white">
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {/* Proposals List Table */}
      {loading ? (
        <div className="py-20 flex flex-col items-center justify-center text-muted gap-3">
          <RefreshCw className="h-6 w-6 animate-spin text-primary" />
          <p className="text-xs">Loading proposals...</p>
        </div>
      ) : filteredProposals.length === 0 ? (
        <div className="py-20 flex flex-col items-center justify-center text-center p-6 rounded-2xl bg-card/20 border border-card-border border-dashed">
          <div className="p-3.5 rounded-full bg-card-border/40 text-muted mb-3">
            <FileText className="h-7 w-7" />
          </div>
          <h3 className="text-base font-bold text-white">No proposals found</h3>
          <p className="text-xs text-muted max-w-sm mt-1 mb-4">
            Create your first interactive proposal to send itemized quotes and book photography clients.
          </p>
          <Link
            href="/dashboard/operations/proposals/new"
            className="flex items-center gap-2 px-4 py-2 bg-primary hover:bg-primary/90 text-white text-xs font-semibold rounded-lg transition-all"
          >
            <PlusCircle className="h-4 w-4" />
            Create Proposal
          </Link>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-card-border bg-card/30">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-card-border/60 bg-card/50 text-muted font-semibold">
                <th className="py-3 px-4">Proposal</th>
                <th className="py-3 px-4">Client</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Total Amount</th>
                <th className="py-3 px-4">Valid Until</th>
                <th className="py-3 px-4">Activity</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-card-border/40">
              {filteredProposals.map((p) => {
                const badge = STATUS_BADGES[p.status] || STATUS_BADGES[StudioProposalStatus.DRAFT];
                return (
                  <tr key={p.id} className="hover:bg-card-border/20 transition-all">
                    <td className="py-3.5 px-4">
                      <Link href={`/dashboard/operations/proposals/${p.id}`} className="group">
                        <div className="font-bold text-white group-hover:text-primary transition-colors flex items-center gap-1.5">
                          {p.title}
                          <ChevronRight className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                        </div>
                        <div className="text-[11px] text-muted font-mono mt-0.5">{p.proposal_number}</div>
                      </Link>
                    </td>

                    <td className="py-3.5 px-4">
                      <div className="font-semibold text-white">{p.client?.full_name || 'Client'}</div>
                      <div className="text-[11px] text-muted">{p.client?.email || ''}</div>
                    </td>

                    <td className="py-3.5 px-4">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border ${badge.bg} ${badge.text} ${badge.border}`}>
                        {badge.label}
                      </span>
                    </td>

                    <td className="py-3.5 px-4 text-right font-mono font-bold text-white">
                      {p.currency} {p.total_amount?.toLocaleString()}
                    </td>

                    <td className="py-3.5 px-4 text-muted text-[11px]">
                      {p.valid_until ? new Date(p.valid_until).toLocaleDateString() : 'No expiry'}
                    </td>

                    <td className="py-3.5 px-4 text-muted text-[11px]">
                      {p.status === StudioProposalStatus.ACCEPTED ? (
                        <span className="text-emerald-400 flex items-center gap-1">
                          <CheckCircle2 className="h-3 w-3" /> Signed {p.accepted_at ? new Date(p.accepted_at).toLocaleDateString() : ''}
                        </span>
                      ) : p.viewed_at ? (
                        <span className="text-amber-400 flex items-center gap-1">
                          <Eye className="h-3 w-3" /> Viewed {p.view_count}x
                        </span>
                      ) : (
                        <span className="text-zinc-500">Unviewed</span>
                      )}
                    </td>

                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => copyPublicLink(p)}
                          title="Copy Client Portal Link"
                          className="p-1.5 text-muted hover:text-white hover:bg-card-border/40 rounded-lg transition-all"
                        >
                          {copiedId === p.id ? <CheckCircle2 className="h-4 w-4 text-emerald-400" /> : <Copy className="h-4 w-4" />}
                        </button>

                        <button
                          onClick={() => {
                            setSendModalProposal(p);
                            setSendEmail(p.client?.email || '');
                          }}
                          title="Send to Client"
                          className="p-1.5 text-primary hover:text-white hover:bg-primary rounded-lg transition-all"
                        >
                          <Send className="h-4 w-4" />
                        </button>

                        <Link
                          href={`/dashboard/operations/proposals/${p.id}`}
                          className="p-1.5 text-muted hover:text-white hover:bg-card-border/40 rounded-lg transition-all"
                        >
                          <Eye className="h-4 w-4" />
                        </Link>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Send Proposal Modal */}
      {sendModalProposal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-background border border-card-border rounded-2xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-card-border pb-3">
              <div className="flex items-center gap-2">
                <Send className="h-5 w-5 text-primary" />
                <h3 className="text-base font-bold text-white">Send Proposal to Client</h3>
              </div>
              <button onClick={() => setSendModalProposal(null)} className="text-muted hover:text-white">
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-muted font-medium mb-1">Proposal</label>
                <div className="p-2.5 rounded-lg bg-card/60 border border-card-border text-white font-semibold flex items-center justify-between">
                  <span>{sendModalProposal.title}</span>
                  <span className="text-primary font-mono">{sendModalProposal.currency} {sendModalProposal.total_amount?.toLocaleString()}</span>
                </div>
              </div>

              <div>
                <label className="block text-muted font-medium mb-1">Recipient Email</label>
                <input
                  type="email"
                  value={sendEmail}
                  onChange={(e) => setSendEmail(e.target.value)}
                  placeholder="client@example.com"
                  className="w-full px-3 py-2 bg-background border border-card-border rounded-lg text-white placeholder-muted focus:outline-none focus:border-primary"
                />
              </div>

              <div>
                <label className="block text-muted font-medium mb-1">Custom Message (Optional)</label>
                <textarea
                  rows={3}
                  value={sendMessage}
                  onChange={(e) => setSendMessage(e.target.value)}
                  placeholder="Hi! Here is our proposal for your photography session. Let us know if you have any questions!"
                  className="w-full px-3 py-2 bg-background border border-card-border rounded-lg text-white placeholder-muted focus:outline-none focus:border-primary"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setSendModalProposal(null)}
                className="px-4 py-2 bg-card/60 hover:bg-card text-muted hover:text-white text-xs font-semibold rounded-lg border border-card-border transition-all"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={sending || !sendEmail.trim()}
                onClick={handleSendProposal}
                className="flex items-center gap-1.5 px-4 py-2 bg-primary hover:bg-primary/90 disabled:opacity-50 text-white text-xs font-bold rounded-lg transition-all"
              >
                {sending ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
                Send Link
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
