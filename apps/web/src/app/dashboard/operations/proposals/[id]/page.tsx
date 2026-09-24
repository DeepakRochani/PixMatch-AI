'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import {
  FileText,
  ArrowLeft,
  Send,
  Copy,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Eye,
  ExternalLink,
  History,
  FileSignature,
  DollarSign,
  Ban,
  Clock,
  User,
  Calendar,
  Layers,
  CopyPlus,
  Trash2,
} from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import { OperationsNavTabs } from '@/components/dashboard/OperationsNavTabs';
import { StudioProposalDTO, StudioProposalStatus } from '@pixmatch/types';

export default function ProposalDetailPage() {
  const { id } = useParams() as { id: string };
  const router = useRouter();
  const { token, studio } = useAuth();

  const [proposal, setProposal] = useState<StudioProposalDTO | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  const fetchProposal = async () => {
    if (!token || !studio?.id || !id) return;
    try {
      setLoading(true);
      setError(null);
      const res = await fetch(`/api/v1/proposals/${id}`, {
        headers: {
          Authorization: `Bearer ${token}`,
          'x-studio-id': studio.id,
        },
      });
      const json = await res.json();
      if (json.success) {
        setProposal(json.data);
      } else {
        setError(json.error || 'Failed to load proposal');
      }
    } catch (err: any) {
      setError(err.message || 'Error fetching proposal');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProposal();
  }, [id, token, studio?.id]);

  const copyPublicLink = () => {
    if (!proposal) return;
    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    const portalToken = proposal.public_token || proposal.id;
    const url = `${origin}/portal/proposal/${portalToken}`;
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleSend = async () => {
    if (!proposal || !token || !studio?.id) return;
    try {
      setActionLoading(true);
      const res = await fetch(`/api/v1/proposals/${proposal.id}/send`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
          'x-studio-id': studio.id,
        },
        body: JSON.stringify({}),
      });
      const json = await res.json();
      if (json.success) {
        fetchProposal();
        alert('Proposal link generated and sent to client!');
      } else {
        alert(json.error || 'Failed to send proposal');
      }
    } catch (err: any) {
      alert(err.message || 'Error sending proposal');
    } finally {
      setActionLoading(false);
    }
  };

  const handleVoid = async () => {
    if (!proposal || !token || !studio?.id) return;
    if (!confirm('Are you sure you want to void this proposal? Clients will no longer be able to accept it.')) return;
    try {
      setActionLoading(true);
      const res = await fetch(`/api/v1/proposals/${proposal.id}/void`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
          'x-studio-id': studio.id,
        },
        body: JSON.stringify({ reason: 'Voided by studio photographer' }),
      });
      const json = await res.json();
      if (json.success) {
        fetchProposal();
      } else {
        alert(json.error || 'Failed to void proposal');
      }
    } catch (err: any) {
      alert(err.message || 'Error voiding proposal');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDuplicate = async () => {
    if (!proposal || !token || !studio?.id) return;
    try {
      setActionLoading(true);
      const res = await fetch(`/api/v1/proposals/${proposal.id}/duplicate`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'x-studio-id': studio.id,
        },
      });
      const json = await res.json();
      if (json.success) {
        router.push(`/dashboard/operations/proposals/${json.data.id}`);
      } else {
        alert(json.error || 'Failed to duplicate proposal');
      }
    } catch (err: any) {
      alert(err.message || 'Error duplicating proposal');
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="py-24 flex flex-col items-center justify-center text-muted gap-3">
        <RefreshCw className="h-6 w-6 animate-spin text-primary" />
        <p className="text-xs">Loading proposal details...</p>
      </div>
    );
  }

  if (error || !proposal) {
    return (
      <div className="py-16 text-center space-y-4">
        <div className="p-3 rounded-full bg-rose-500/10 text-rose-400 w-fit mx-auto">
          <AlertCircle className="h-6 w-6" />
        </div>
        <h2 className="text-base font-bold text-white">{error || 'Proposal not found'}</h2>
        <Link
          href="/dashboard/operations/proposals"
          className="inline-flex items-center gap-2 px-4 py-2 bg-card hover:bg-card-border text-white text-xs font-semibold rounded-lg"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Proposals
        </Link>
      </div>
    );
  }

  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  const portalUrl = `${origin}/portal/proposal/${proposal.public_token || proposal.id}`;

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-12">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-card-border pb-4">
        <div className="flex items-center gap-3">
          <Link
            href="/dashboard/operations/proposals"
            className="p-2 rounded-lg bg-card/60 hover:bg-card-border/40 text-muted hover:text-white transition-all"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-xl font-black text-white tracking-tight">{proposal.title}</h1>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold border border-primary/30 bg-primary/10 text-primary">
                {proposal.status}
              </span>
            </div>
            <div className="text-xs text-muted font-mono mt-0.5">Proposal #{proposal.proposal_number} • Rev v{proposal.current_revision}</div>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={copyPublicLink}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-card/60 hover:bg-card text-white text-xs font-semibold rounded-lg border border-card-border transition-all"
          >
            {copied ? <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
            {copied ? 'Copied Link!' : 'Copy Portal Link'}
          </button>

          <a
            href={portalUrl}
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-1.5 px-3.5 py-2 bg-card/60 hover:bg-card text-white text-xs font-semibold rounded-lg border border-card-border transition-all"
          >
            <ExternalLink className="h-3.5 w-3.5 text-primary" />
            Client View
          </a>

          {proposal.status !== StudioProposalStatus.VOID && (
            <button
              disabled={actionLoading}
              onClick={handleSend}
              className="flex items-center gap-1.5 px-4 py-2 bg-primary hover:bg-primary/90 text-white text-xs font-bold rounded-lg shadow-sm shadow-primary/20 transition-all"
            >
              <Send className="h-3.5 w-3.5" />
              Send to Client
            </button>
          )}

          <Link
            href={`/dashboard/operations/contracts/new?proposalId=${proposal.id}&clientId=${proposal.client_id}`}
            className="flex items-center gap-1.5 px-4 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-bold rounded-lg shadow-sm shadow-emerald-600/20 transition-all"
          >
            <FileSignature className="h-3.5 w-3.5" />
            Generate Contract
          </Link>
        </div>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Details & Deliverables */}
        <div className="lg:col-span-2 space-y-6">
          {/* Client & Metadata Card */}
          <div className="p-5 rounded-2xl bg-card/40 border border-card-border grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div>
              <span className="text-muted font-medium block">Prepared For</span>
              <div className="text-sm font-bold text-white mt-1">{proposal.client?.full_name}</div>
              <div className="text-muted">{proposal.client?.email}</div>
              {proposal.client?.phone && <div className="text-muted">{proposal.client?.phone}</div>}
            </div>

            <div>
              <span className="text-muted font-medium block">Proposal Status & Validity</span>
              <div className="text-sm font-bold text-white mt-1">
                {proposal.valid_until ? `Valid until ${new Date(proposal.valid_until).toLocaleDateString()}` : 'No expiration date'}
              </div>
              <div className="text-muted mt-0.5">
                Created on {new Date(proposal.created_at).toLocaleDateString()}
              </div>
            </div>
          </div>

          {/* Line Items Table */}
          <div className="p-5 rounded-2xl bg-card/40 border border-card-border space-y-4">
            <h2 className="text-sm font-bold text-white flex items-center gap-2">
              <Layers className="h-4 w-4 text-primary" />
              Itemized Deliverables & Inclusions
            </h2>

            <div className="divide-y divide-card-border/40">
              {proposal.items?.map((item) => (
                <div key={item.id} className="py-3.5 flex items-start justify-between gap-4 text-xs">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-white">{item.title}</span>
                      {item.is_optional && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold border border-purple-500/30 bg-purple-500/10 text-purple-400">
                          Optional Add-on {item.is_selected ? '(Selected)' : '(Unselected)'}
                        </span>
                      )}
                    </div>
                    {item.description && <p className="text-muted text-[11px]">{item.description}</p>}
                    <div className="text-[11px] text-muted">
                      Qty: {item.quantity} × ${item.unit_price.toLocaleString()}
                    </div>
                  </div>

                  <div className="text-right font-mono font-bold text-white">
                    ${item.total_price.toLocaleString()}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Terms & Conditions */}
          {proposal.terms_and_conditions && (
            <div className="p-5 rounded-2xl bg-card/40 border border-card-border space-y-2 text-xs">
              <h3 className="font-bold text-white">Terms & Conditions</h3>
              <p className="text-muted whitespace-pre-line leading-relaxed">{proposal.terms_and_conditions}</p>
            </div>
          )}

          {/* Revisions History */}
          {proposal.revisions && proposal.revisions.length > 0 && (
            <div className="p-5 rounded-2xl bg-card/40 border border-card-border space-y-3 text-xs">
              <h3 className="font-bold text-white flex items-center gap-2">
                <History className="h-4 w-4 text-muted" />
                Revision History
              </h3>
              <div className="divide-y divide-card-border/40">
                {proposal.revisions.map((rev) => (
                  <div key={rev.id} className="py-2.5 flex items-center justify-between">
                    <div>
                      <span className="font-semibold text-white">Revision v{rev.revision_number}</span>
                      <span className="text-muted ml-2">({rev.change_summary || 'Updated details'})</span>
                    </div>
                    <span className="text-muted font-mono text-[11px]">
                      {new Date(rev.created_at).toLocaleDateString()}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right Col: Pricing Summary & Actions */}
        <div className="space-y-6">
          <div className="p-5 rounded-2xl bg-card/60 border border-card-border space-y-4">
            <h3 className="text-sm font-bold text-white pb-3 border-b border-card-border">Quote Summary</h3>

            <div className="space-y-2 text-xs">
              <div className="flex justify-between text-muted">
                <span>Subtotal</span>
                <span className="font-mono font-bold text-white">${proposal.subtotal.toLocaleString()}</span>
              </div>

              {proposal.discount_amount > 0 && (
                <div className="flex justify-between text-emerald-400">
                  <span>Discount</span>
                  <span className="font-mono font-bold">-${proposal.discount_amount.toLocaleString()}</span>
                </div>
              )}

              {proposal.tax_amount > 0 && (
                <div className="flex justify-between text-muted">
                  <span>Tax</span>
                  <span className="font-mono font-bold text-white">+${proposal.tax_amount.toLocaleString()}</span>
                </div>
              )}

              <div className="pt-3 border-t border-card-border flex justify-between items-baseline">
                <span className="text-sm font-bold text-white">Total Amount</span>
                <span className="text-2xl font-black text-primary font-mono">${proposal.total_amount.toLocaleString()}</span>
              </div>
            </div>

            {proposal.accepted_at && (
              <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs space-y-1">
                <div className="font-bold flex items-center gap-1.5">
                  <CheckCircle2 className="h-4 w-4" />
                  Accepted by Client
                </div>
                <div>Signed by: {proposal.accepted_by_client_name || proposal.client?.full_name}</div>
                <div className="text-[11px] opacity-80">{new Date(proposal.accepted_at).toLocaleString()}</div>
              </div>
            )}
          </div>

          {/* Actions Card */}
          <div className="p-5 rounded-2xl bg-card/40 border border-card-border space-y-2.5 text-xs">
            <h4 className="font-bold text-white mb-2">Proposal Actions</h4>

            <button
              disabled={actionLoading}
              onClick={handleDuplicate}
              className="w-full flex items-center gap-2 px-3.5 py-2 bg-card/60 hover:bg-card text-white font-semibold rounded-lg border border-card-border transition-all"
            >
              <CopyPlus className="h-4 w-4 text-primary" />
              Duplicate Proposal
            </button>

            {proposal.status !== StudioProposalStatus.VOID && (
              <button
                disabled={actionLoading}
                onClick={handleVoid}
                className="w-full flex items-center gap-2 px-3.5 py-2 bg-card/60 hover:bg-rose-500/10 text-rose-400 font-semibold rounded-lg border border-card-border transition-all"
              >
                <Ban className="h-4 w-4" />
                Void Proposal
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
