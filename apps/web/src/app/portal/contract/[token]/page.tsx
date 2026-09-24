'use client';

import React, { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import {
  FileSignature,
  CheckCircle2,
  AlertCircle,
  Clock,
  ShieldCheck,
  Camera,
  Download,
  Printer,
  Calendar,
  User,
  Building,
  Lock,
  FileCheck,
  XCircle,
  Hash,
  PenTool,
} from 'lucide-react';
import { ContractPublicViewDTO } from '@pixmatch/types';

export default function ClientContractPortalPage() {
  const { token } = useParams() as { token: string };

  const [contractData, setContractData] = useState<ContractPublicViewDTO | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Signing state
  const [legalName, setLegalName] = useState('');
  const [signerEmail, setSignerEmail] = useState('');
  const [agreeTerms, setAgreeTerms] = useState(false);
  const [signing, setSigning] = useState(false);
  const [signSuccess, setSignSuccess] = useState(false);
  const [signAuditHash, setSignAuditHash] = useState<string | null>(null);

  // Reject modal
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [rejecting, setRejecting] = useState(false);

  const fetchContract = async () => {
    if (!token) return;
    try {
      setLoading(true);
      setError(null);
      const res = await fetch(`/api/v1/public/contract/${token}`);
      const json = await res.json();
      if (json.success) {
        setContractData(json.data);
        setLegalName(json.data.client?.full_name || '');
        setSignerEmail(json.data.client?.email || '');
      } else {
        setError(json.error || 'Contract not found or link has expired');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load contract details');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchContract();
  }, [token]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0c0d12] flex items-center justify-center p-6 text-white">
        <div className="text-center space-y-4">
          <div className="w-12 h-12 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-gray-400 font-medium">Loading secure contract & electronic signature portal...</p>
        </div>
      </div>
    );
  }

  if (error || !contractData) {
    return (
      <div className="min-h-screen bg-[#0c0d12] flex items-center justify-center p-6 text-white">
        <div className="max-w-md w-full bg-[#161822] border border-red-500/20 rounded-2xl p-8 text-center space-y-5 shadow-2xl">
          <div className="w-14 h-14 bg-red-500/10 text-red-400 rounded-full flex items-center justify-center mx-auto">
            <AlertCircle className="w-7 h-7" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white">Contract Unavailable</h1>
            <p className="text-sm text-gray-400 mt-2">{error || 'This link may be invalid, expired, or revoked.'}</p>
          </div>
          <p className="text-xs text-gray-500">
            Please contact your photography studio for assistance.
          </p>
        </div>
      </div>
    );
  }

  const { contract, studio, client } = contractData;

  const handleSignContract = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!legalName.trim() || !signerEmail.trim() || !agreeTerms) {
      alert('Please complete all required fields and accept the legal terms.');
      return;
    }

    try {
      setSigning(true);
      const res = await fetch(`/api/v1/public/contract/${token}/sign`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          legal_name: legalName.trim(),
          signer_email: signerEmail.trim(),
        }),
      });
      const json = await res.json();
      if (json.success) {
        setSignSuccess(true);
        setSignAuditHash(json.data?.audit_trail?.client_signature_hash || null);
        fetchContract();
      } else {
        alert(json.error || 'Failed to sign contract');
      }
    } catch (err: any) {
      alert(err.message || 'Error signing contract');
    } finally {
      setSigning(false);
    }
  };

  const handleRejectContract = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setRejecting(true);
      const res = await fetch(`/api/v1/public/contract/${token}/reject`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: rejectReason }),
      });
      const json = await res.json();
      if (json.success) {
        alert('Contract decline notice submitted.');
        setShowRejectModal(false);
        fetchContract();
      } else {
        alert(json.error || 'Failed to reject contract');
      }
    } catch (err: any) {
      alert(err.message || 'Error submitting response');
    } finally {
      setRejecting(false);
    }
  };

  const isClientSigned = contract.status === 'SIGNED' || !!contract.signed_at;
  const isFullyExecuted = !!contract.countersigned_at;
  const isAwaitingSign = !isClientSigned && (contract.status === 'SENT' || contract.status === 'DRAFT' || contract.status === 'VIEWED');

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
              <p className="text-xs text-gray-400">Electronic Agreement & Contract Portal</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => window.print()}
              className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#2d3246] hover:bg-[#1f2333] text-xs font-semibold text-gray-300 transition"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print / Save PDF</span>
            </button>
            <span
              className={`px-3 py-1 rounded-full text-xs font-semibold tracking-wide border ${
                isFullyExecuted
                  ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                  : isClientSigned
                  ? 'bg-blue-500/10 text-blue-400 border-blue-500/20'
                  : contract.status === 'REJECTED'
                  ? 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                  : 'bg-amber-500/10 text-amber-400 border-amber-500/20'
              }`}
            >
              {isFullyExecuted
                ? 'FULLY EXECUTED'
                : isClientSigned
                ? 'SIGNED BY YOU'
                : contract.status === 'REJECTED'
                ? 'DECLINED'
                : 'ACTION REQUIRED'}
            </span>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-4xl mx-auto px-6 pt-10 space-y-8">
        {/* Certificate Alert if Signed */}
        {(isClientSigned || signSuccess) && (
          <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-3xl p-6 sm:p-8 space-y-4 shadow-2xl shadow-emerald-950/20">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 bg-emerald-500/20 rounded-2xl flex items-center justify-center text-emerald-400 flex-shrink-0">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <div className="space-y-1 flex-1">
                <h3 className="text-lg font-bold text-white">Legally Binding Electronic Signature Verified</h3>
                <p className="text-xs text-emerald-200/90 leading-relaxed">
                  This photography agreement has been securely executed by{' '}
                  <strong className="text-white">{contract.signed_by_name || legalName}</strong> on{' '}
                  {contract.signed_at ? new Date(contract.signed_at).toLocaleString() : 'Just now'}.
                </p>
                {(contract.signature_hash || signAuditHash) && (
                  <div className="pt-2 flex items-center gap-2 text-[11px] font-mono text-emerald-400/90 break-all bg-emerald-950/40 p-2.5 rounded-xl border border-emerald-500/20">
                    <Hash className="w-3.5 h-3.5 flex-shrink-0" />
                    <span>Audit SHA-256: {contract.signature_hash || signAuditHash}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Contract Document Card */}
        <div className="bg-[#13151f] border border-[#232738] rounded-3xl p-8 sm:p-12 shadow-2xl space-y-8">
          {/* Header Metadata */}
          <div className="border-b border-[#232738] pb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 text-xs font-mono text-primary uppercase tracking-wider mb-1">
                <span>{contract.contract_number}</span>
                <span>•</span>
                <span>{studio.name}</span>
              </div>
              <h2 className="text-2xl font-extrabold text-white">{contract.title}</h2>
            </div>
            <div className="text-xs text-gray-400 space-y-1 sm:text-right">
              <p>Client: <strong className="text-white">{client?.full_name || 'Valued Client'}</strong></p>
              <p>Date: {new Date(contract.created_at).toLocaleDateString()}</p>
            </div>
          </div>

          {/* Contract Content Body (Markdown / Formatted text) */}
          <div className="prose prose-invert max-w-none text-gray-300 text-sm leading-relaxed space-y-4 whitespace-pre-line font-sans bg-[#0e1017] p-6 sm:p-8 rounded-2xl border border-[#1f2333]">
            {contract.rendered_content || contract.body_content}
          </div>

          {/* Signatures Display Block */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-6 border-t border-[#232738]">
            {/* Photographer Side */}
            <div className="bg-[#181b26] border border-[#272b3b] rounded-2xl p-6 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Photographer / Studio</span>
                {contract.countersigned_at ? (
                  <span className="text-xs font-semibold text-emerald-400 flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Signed
                  </span>
                ) : (
                  <span className="text-xs font-semibold text-gray-500">Pending Countersign</span>
                )}
              </div>
              <div className="pt-2">
                <p className="text-lg font-serif italic text-primary">
                  {studio.name}
                </p>
                <p className="text-xs text-gray-400 mt-1">
                  {contract.countersigned_at
                    ? `Signed on ${new Date(contract.countersigned_at).toLocaleDateString()}`
                    : 'Official Studio Representative'}
                </p>
              </div>
            </div>

            {/* Client Side */}
            <div className="bg-[#181b26] border border-[#272b3b] rounded-2xl p-6 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Client</span>
                {isClientSigned ? (
                  <span className="text-xs font-semibold text-emerald-400 flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Signed
                  </span>
                ) : (
                  <span className="text-xs font-semibold text-amber-400">Signature Required</span>
                )}
              </div>
              <div className="pt-2">
                {isClientSigned ? (
                  <>
                    <p className="text-lg font-serif italic text-white">
                      {contract.signed_by_name || legalName}
                    </p>
                    <p className="text-xs text-gray-400 mt-1">
                      Signed on {contract.signed_at ? new Date(contract.signed_at).toLocaleDateString() : 'Today'}
                    </p>
                  </>
                ) : (
                  <p className="text-xs text-gray-500 italic">Sign below to execute agreement</p>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* E-Sign Interactive Form (Only if awaiting signature) */}
        {isAwaitingSign && !signSuccess && (
          <div className="bg-[#13151f] border border-primary/30 rounded-3xl p-8 sm:p-10 shadow-2xl space-y-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-primary/20 rounded-xl flex items-center justify-center text-primary">
                <PenTool className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white">Electronic Signature Authorization</h3>
                <p className="text-xs text-gray-400">
                  Type your full legal name below to execute this agreement with a legally binding digital signature.
                </p>
              </div>
            </div>

            <form onSubmit={handleSignContract} className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-gray-300">Your Full Legal Name *</label>
                  <input
                    type="text"
                    required
                    value={legalName}
                    onChange={(e) => setLegalName(e.target.value)}
                    placeholder="e.g. Eleanor Vance"
                    className="w-full px-4 py-3 bg-[#181b26] border border-[#292e42] rounded-xl text-sm text-white focus:outline-none focus:border-primary font-medium"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-gray-300">Your Email Address *</label>
                  <input
                    type="email"
                    required
                    value={signerEmail}
                    onChange={(e) => setSignerEmail(e.target.value)}
                    placeholder="eleanor@example.com"
                    className="w-full px-4 py-3 bg-[#181b26] border border-[#292e42] rounded-xl text-sm text-white focus:outline-none focus:border-primary font-medium"
                  />
                </div>
              </div>

              {/* Signature Preview */}
              {legalName && (
                <div className="p-4 bg-[#181b26] border border-[#272b3b] rounded-2xl flex items-center justify-between">
                  <span className="text-xs text-gray-400">Digital Signature Preview:</span>
                  <span className="font-serif italic text-xl text-primary">{legalName}</span>
                </div>
              )}

              {/* Legal Checkbox */}
              <div className="flex items-start gap-3 p-4 bg-[#181b26] border border-[#272b3b] rounded-2xl">
                <input
                  type="checkbox"
                  id="termsCheck"
                  checked={agreeTerms}
                  onChange={(e) => setAgreeTerms(e.target.checked)}
                  className="w-5 h-5 rounded border-gray-600 text-primary focus:ring-primary bg-[#0f1118] mt-0.5"
                />
                <label htmlFor="termsCheck" className="text-xs text-gray-300 leading-relaxed cursor-pointer select-none">
                  I understand and agree that typing my name constitutes a legally binding electronic signature equivalent
                  to a physical handwritten signature under the U.S. Electronic Signatures in Global and National Commerce Act (ESIGN)
                  and the Uniform Electronic Transactions Act (UETA).
                </label>
              </div>

              <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-2">
                <button
                  type="button"
                  onClick={() => setShowRejectModal(true)}
                  className="text-xs text-gray-400 hover:text-rose-400 transition"
                >
                  Need modifications? Decline or request changes
                </button>
                <button
                  type="submit"
                  disabled={signing || !agreeTerms || !legalName.trim()}
                  className="w-full sm:w-auto px-8 py-3.5 rounded-xl bg-gradient-to-r from-primary to-accent hover:opacity-95 text-white text-sm font-bold shadow-lg shadow-primary/25 disabled:opacity-50 disabled:cursor-not-allowed transition flex items-center justify-center gap-2"
                >
                  <Lock className="w-4 h-4" />
                  <span>{signing ? 'Executing Signature...' : 'Sign & Complete Contract'}</span>
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Footer */}
        <footer className="pt-10 border-t border-[#1f2333] text-center space-y-2 text-xs text-gray-500">
          <p>
            Secured and cryptographic audit-logged by PixMatch AI for{' '}
            <span className="text-gray-300 font-medium">{studio.name}</span>
          </p>
        </footer>
      </main>

      {/* Reject Modal */}
      {showRejectModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#151722] border border-[#292e42] rounded-3xl max-w-lg w-full p-6 sm:p-8 space-y-6 shadow-2xl">
            <div className="space-y-1">
              <h3 className="text-xl font-bold text-white">Decline or Request Contract Modifications</h3>
              <p className="text-xs text-gray-400">
                Provide details to your photography studio so they can revise the agreement terms.
              </p>
            </div>

            <form onSubmit={handleRejectContract} className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-gray-300">Notes / Reason for Revision</label>
                <textarea
                  rows={4}
                  required
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  placeholder="e.g. Need to adjust the payment due dates or cancellation clause..."
                  className="w-full px-4 py-2.5 bg-[#1b1e2b] border border-[#2b3044] rounded-xl text-sm text-white focus:outline-none focus:border-primary"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-[#292e42]">
                <button
                  type="button"
                  disabled={rejecting}
                  onClick={() => setShowRejectModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-gray-400 hover:text-white transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={rejecting}
                  className="px-6 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition"
                >
                  {rejecting ? 'Submitting...' : 'Submit Notice'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
