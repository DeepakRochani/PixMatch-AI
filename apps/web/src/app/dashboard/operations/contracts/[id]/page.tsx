'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import {
  FileSignature,
  FileText,
  ArrowLeft,
  Send,
  Copy,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Eye,
  ExternalLink,
  ShieldCheck,
  Ban,
  Clock,
  User,
  Calendar,
  Layers,
  FileCheck,
  Check,
} from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import { OperationsNavTabs } from '@/components/dashboard/OperationsNavTabs';
import { StudioContractDTO, StudioContractStatus } from '@pixmatch/types';

export default function ContractDetailPage() {
  const { id } = useParams() as { id: string };
  const router = useRouter();
  const { token, studio, user } = useAuth();

  const [contract, setContract] = useState<StudioContractDTO | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  const fetchContract = async () => {
    if (!token || !studio?.id || !id) return;
    try {
      setLoading(true);
      setError(null);
      const res = await fetch(`/api/v1/contracts/${id}`, {
        headers: {
          Authorization: `Bearer ${token}`,
          'x-studio-id': studio.id,
        },
      });
      const json = await res.json();
      if (json.success) {
        setContract(json.data);
      } else {
        setError(json.error || 'Failed to load contract');
      }
    } catch (err: any) {
      setError(err.message || 'Error fetching contract');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchContract();
  }, [id, token, studio?.id]);

  const copyPublicLink = () => {
    if (!contract) return;
    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    const portalToken = contract.public_token || contract.id;
    const url = `${origin}/portal/contract/${portalToken}`;
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleSend = async () => {
    if (!contract || !token || !studio?.id) return;
    try {
      setActionLoading(true);
      const res = await fetch(`/api/v1/contracts/${contract.id}/send`, {
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
        fetchContract();
        alert('Contract signing link sent to client!');
      } else {
        alert(json.error || 'Failed to send contract');
      }
    } catch (err: any) {
      alert(err.message || 'Error sending contract');
    } finally {
      setActionLoading(false);
    }
  };

  const handleCountersign = async () => {
    if (!contract || !token || !studio?.id) return;
    try {
      setActionLoading(true);
      const res = await fetch(`/api/v1/contracts/${contract.id}/countersign`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'x-studio-id': studio.id,
        },
      });
      const json = await res.json();
      if (json.success) {
        fetchContract();
        alert('Contract successfully countersigned by studio!');
      } else {
        alert(json.error || 'Failed to countersign');
      }
    } catch (err: any) {
      alert(err.message || 'Error countersigning contract');
    } finally {
      setActionLoading(false);
    }
  };

  const handleVoid = async () => {
    if (!contract || !token || !studio?.id) return;
    if (!confirm('Are you sure you want to void this agreement?')) return;
    try {
      setActionLoading(true);
      const res = await fetch(`/api/v1/contracts/${contract.id}/void`, {
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
        fetchContract();
      } else {
        alert(json.error || 'Failed to void contract');
      }
    } catch (err: any) {
      alert(err.message || 'Error voiding contract');
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="py-24 flex flex-col items-center justify-center text-muted gap-3">
        <RefreshCw className="h-6 w-6 animate-spin text-primary" />
        <p className="text-xs">Loading contract details...</p>
      </div>
    );
  }

  if (error || !contract) {
    return (
      <div className="py-16 text-center space-y-4">
        <div className="p-3 rounded-full bg-rose-500/10 text-rose-400 w-fit mx-auto">
          <AlertCircle className="h-6 w-6" />
        </div>
        <h2 className="text-base font-bold text-white">{error || 'Contract not found'}</h2>
        <Link
          href="/dashboard/operations/contracts"
          className="inline-flex items-center gap-2 px-4 py-2 bg-card hover:bg-card-border text-white text-xs font-semibold rounded-lg"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Contracts
        </Link>
      </div>
    );
  }

  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  const portalUrl = `${origin}/portal/contract/${contract.public_token || contract.id}`;

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-card-border pb-4">
        <div className="flex items-center gap-3">
          <Link
            href="/dashboard/operations/contracts"
            className="p-2 rounded-lg bg-card/60 hover:bg-card-border/40 text-muted hover:text-white transition-all"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-xl font-black text-white tracking-tight">{contract.title}</h1>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold border border-emerald-500/30 bg-emerald-500/10 text-emerald-400">
                {contract.status}
              </span>
            </div>
            <div className="text-xs text-muted font-mono mt-0.5">Agreement #{contract.contract_number} • Version v{contract.version}</div>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={copyPublicLink}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-card/60 hover:bg-card text-white text-xs font-semibold rounded-lg border border-card-border transition-all"
          >
            {copied ? <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
            {copied ? 'Copied Link!' : 'Copy Signing Link'}
          </button>

          <a
            href={portalUrl}
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-1.5 px-3.5 py-2 bg-card/60 hover:bg-card text-white text-xs font-semibold rounded-lg border border-card-border transition-all"
          >
            <ExternalLink className="h-3.5 w-3.5 text-primary" />
            Client Signing View
          </a>

          {contract.status !== StudioContractStatus.VOID && contract.status !== StudioContractStatus.SIGNED && (
            <button
              disabled={actionLoading}
              onClick={handleSend}
              className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-lg shadow-sm shadow-emerald-600/20 transition-all"
            >
              <Send className="h-3.5 w-3.5" />
              Send for Signing
            </button>
          )}

          {contract.status === StudioContractStatus.SIGNED && !contract.countersigned_at && (
            <button
              disabled={actionLoading}
              onClick={handleCountersign}
              className="flex items-center gap-1.5 px-4 py-2 bg-gradient-to-r from-primary to-accent hover:from-primary/90 text-white text-xs font-bold rounded-lg shadow-sm shadow-primary/20 transition-all"
            >
              <Check className="h-3.5 w-3.5" />
              Countersign as Studio
            </button>
          )}
        </div>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Rendered Contract Text & Audit */}
        <div className="lg:col-span-2 space-y-6">
          {/* Signatures & Execution Certificate */}
          {contract.status === StudioContractStatus.SIGNED && (
            <div className="p-5 rounded-2xl bg-gradient-to-r from-emerald-950/40 to-card/60 border border-emerald-500/30 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-emerald-400 flex items-center gap-2">
                  <ShieldCheck className="h-5 w-5 text-emerald-400" />
                  E-Signature Verification Certificate
                </h3>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  LEGALLY BINDING
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs pt-2">
                <div>
                  <span className="text-muted block">Signed By (Client)</span>
                  <div className="font-bold text-white mt-0.5">{contract.signed_by_name}</div>
                  <div className="text-[11px] text-muted">{contract.signed_by_email}</div>
                  <div className="text-[11px] text-muted mt-1">
                    Timestamp: {contract.signed_at ? new Date(contract.signed_at).toLocaleString() : ''}
                  </div>
                </div>

                <div>
                  <span className="text-muted block">Studio Countersignature</span>
                  <div className="font-bold text-white mt-0.5">
                    {contract.countersigned_at ? 'Countersigned by Studio' : 'Pending Countersignature'}
                  </div>
                  <div className="text-[11px] text-muted">
                    {contract.countersigned_at ? new Date(contract.countersigned_at).toLocaleString() : 'Photographer review'}
                  </div>
                </div>
              </div>

              {contract.signature_hash && (
                <div className="pt-2 border-t border-emerald-500/20 text-xs">
                  <span className="text-muted block text-[10px]">Cryptographic SHA-256 Audit Hash</span>
                  <code className="text-emerald-300 font-mono text-[11px] break-all select-all block mt-0.5">
                    {contract.signature_hash}
                  </code>
                </div>
              )}
            </div>
          )}

          {/* Rendered Agreement Content */}
          <div className="p-6 rounded-2xl bg-card/40 border border-card-border space-y-4">
            <h2 className="text-sm font-bold text-white flex items-center gap-2">
              <FileText className="h-4 w-4 text-emerald-400" />
              Agreement Content (Executed Version)
            </h2>

            <div className="p-6 rounded-xl bg-background/90 border border-card-border text-xs text-zinc-300 font-sans whitespace-pre-wrap leading-relaxed">
              {contract.rendered_content || contract.body_content}
            </div>
          </div>
        </div>

        {/* Right Column: Metadata & Controls */}
        <div className="space-y-6">
          <div className="p-5 rounded-2xl bg-card/50 border border-card-border space-y-4">
            <h3 className="text-sm font-bold text-white pb-3 border-b border-card-border">Agreement Info</h3>

            <div className="space-y-3 text-xs">
              <div>
                <span className="text-muted block">Client</span>
                <span className="font-bold text-white">{contract.client?.full_name}</span>
                <span className="text-muted block text-[11px]">{contract.client?.email}</span>
              </div>

              {contract.project && (
                <div>
                  <span className="text-muted block">Linked Project</span>
                  <span className="font-bold text-white">{contract.project.title}</span>
                </div>
              )}

              {contract.proposal && (
                <div>
                  <span className="text-muted block">Linked Proposal</span>
                  <span className="font-bold text-white">#{contract.proposal.proposal_number}</span>
                </div>
              )}

              <div>
                <span className="text-muted block">Category</span>
                <span className="font-bold text-white">{contract.category}</span>
              </div>

              <div>
                <span className="text-muted block">Created Date</span>
                <span className="font-mono text-white">{new Date(contract.created_at).toLocaleDateString()}</span>
              </div>
            </div>
          </div>

          {contract.status !== StudioContractStatus.VOID && (
            <div className="p-5 rounded-2xl bg-card/40 border border-card-border text-xs">
              <button
                disabled={actionLoading}
                onClick={handleVoid}
                className="w-full flex items-center justify-center gap-2 px-3.5 py-2 bg-card/60 hover:bg-rose-500/10 text-rose-400 font-semibold rounded-lg border border-card-border transition-all"
              >
                <Ban className="h-4 w-4" />
                Void Agreement
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
