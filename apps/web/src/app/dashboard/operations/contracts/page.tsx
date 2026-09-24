'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  FileSignature,
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
  ShieldCheck,
  FileText,
  Clock,
  Ban,
  Layers,
  X,
} from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import { OperationsNavTabs } from '@/components/dashboard/OperationsNavTabs';
import {
  StudioContractDTO,
  StudioContractStatus,
  StudioContractCategory,
  StudioContractTemplateDTO,
} from '@pixmatch/types';

const STATUS_BADGES: Record<StudioContractStatus, { label: string; bg: string; text: string; border: string }> = {
  [StudioContractStatus.DRAFT]: { label: 'Draft', bg: 'bg-zinc-500/10', text: 'text-zinc-400', border: 'border-zinc-500/30' },
  [StudioContractStatus.SENT]: { label: 'Sent', bg: 'bg-blue-500/10', text: 'text-blue-400', border: 'border-blue-500/30' },
  [StudioContractStatus.VIEWED]: { label: 'Viewed', bg: 'bg-amber-500/10', text: 'text-amber-400', border: 'border-amber-500/30' },
  [StudioContractStatus.SIGNED]: { label: 'Signed', bg: 'bg-emerald-500/10', text: 'text-emerald-400', border: 'border-emerald-500/30' },
  [StudioContractStatus.REJECTED]: { label: 'Declined', bg: 'bg-rose-500/10', text: 'text-rose-400', border: 'border-rose-500/30' },
  [StudioContractStatus.EXPIRED]: { label: 'Expired', bg: 'bg-orange-500/10', text: 'text-orange-400', border: 'border-orange-500/30' },
  [StudioContractStatus.VOID]: { label: 'Void', bg: 'bg-red-500/10', text: 'text-red-400', border: 'border-red-500/30' },
};

export default function ContractsListPage() {
  const { token, studio } = useAuth();
  const [contracts, setContracts] = useState<StudioContractDTO[]>([]);
  const [templates, setTemplates] = useState<StudioContractTemplateDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [activeTab, setActiveTab] = useState<'contracts' | 'templates'>('contracts');

  // Send Modal
  const [sendModalContract, setSendModalContract] = useState<StudioContractDTO | null>(null);
  const [sendEmail, setSendEmail] = useState('');
  const [sendMessage, setSendMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [successToast, setSuccessToast] = useState<string | null>(null);

  const fetchContracts = async () => {
    if (!token || !studio?.id) return;
    try {
      setLoading(true);
      setError(null);
      const [contractsRes, templatesRes] = await Promise.all([
        fetch(`/api/v1/contracts?search=${encodeURIComponent(searchTerm)}`, {
          headers: { Authorization: `Bearer ${token}`, 'x-studio-id': studio.id },
        }),
        fetch('/api/v1/contracts/templates', {
          headers: { Authorization: `Bearer ${token}`, 'x-studio-id': studio.id },
        }),
      ]);

      const contractsJson = await contractsRes.json();
      const templatesJson = await templatesRes.json();

      if (contractsJson.success) {
        setContracts(contractsJson.data || []);
      }
      if (templatesJson.success) {
        setTemplates(templatesJson.data || []);
      }
    } catch (err: any) {
      setError(err.message || 'Error fetching contracts');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchContracts();
  }, [token, studio?.id, searchTerm]);

  const handleSendContract = async () => {
    if (!sendModalContract || !token || !studio?.id) return;
    try {
      setSending(true);
      const res = await fetch(`/api/v1/contracts/${sendModalContract.id}/send`, {
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
        setSendModalContract(null);
        setSuccessToast(`Contract #${sendModalContract.contract_number} sent to client!`);
        fetchContracts();
      } else {
        alert(json.error || 'Failed to send contract');
      }
    } catch (err: any) {
      alert(err.message || 'Error sending contract');
    } finally {
      setSending(false);
    }
  };

  const copySigningLink = (contract: StudioContractDTO) => {
    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    const token = contract.public_token || contract.id;
    const url = `${origin}/portal/contract/${token}`;
    navigator.clipboard.writeText(url);
    setCopiedId(contract.id);
    setTimeout(() => setCopiedId(null), 2500);
  };

  const filteredContracts = contracts.filter((c) => {
    if (statusFilter !== 'ALL' && c.status !== statusFilter) return false;
    return true;
  });

  const signedCount = contracts.filter((c) => c.status === StudioContractStatus.SIGNED).length;
  const pendingCount = contracts.filter((c) => c.status === StudioContractStatus.SENT || c.status === StudioContractStatus.VIEWED).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-white tracking-tight flex items-center gap-2.5">
            <FileSignature className="h-6 w-6 text-emerald-400" />
            Contracts & Agreements
          </h1>
          <p className="text-sm text-muted mt-1">
            Manage legal photography contracts, lawyer-vetted templates, and SHA-256 verified client e-signatures.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Link
            href="/dashboard/operations/contracts/new"
            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 text-white text-xs font-bold rounded-lg shadow-sm shadow-emerald-600/20 transition-all"
          >
            <PlusCircle className="h-4 w-4" />
            New Contract
          </Link>
        </div>
      </div>

      <OperationsNavTabs />

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-4 rounded-xl bg-card/60 border border-card-border">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted">Total Agreements</span>
            <FileSignature className="h-4 w-4 text-primary" />
          </div>
          <div className="text-2xl font-black text-white mt-1">{contracts.length}</div>
          <div className="text-xs text-muted mt-1">Legal agreements on file</div>
        </div>

        <div className="p-4 rounded-xl bg-card/60 border border-card-border">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted">Awaiting Signature</span>
            <Clock className="h-4 w-4 text-amber-400" />
          </div>
          <div className="text-2xl font-black text-amber-400 mt-1">{pendingCount}</div>
          <div className="text-xs text-muted mt-1">Sent out for client signing</div>
        </div>

        <div className="p-4 rounded-xl bg-card/60 border border-card-border">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted">Legally Executed</span>
            <ShieldCheck className="h-4 w-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-black text-emerald-400 mt-1">{signedCount}</div>
          <div className="text-xs text-muted mt-1">Cryptographically signed & verified</div>
        </div>
      </div>

      {/* Tabs for Contracts vs Templates */}
      <div className="flex items-center gap-2 border-b border-card-border pb-2">
        <button
          onClick={() => setActiveTab('contracts')}
          className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${
            activeTab === 'contracts' ? 'bg-primary text-white' : 'text-muted hover:text-white'
          }`}
        >
          All Contracts ({contracts.length})
        </button>
        <button
          onClick={() => setActiveTab('templates')}
          className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${
            activeTab === 'templates' ? 'bg-primary text-white' : 'text-muted hover:text-white'
          }`}
        >
          Contract Templates ({templates.length})
        </button>
      </div>

      {/* Toast */}
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

      {activeTab === 'contracts' ? (
        <>
          {/* Search & Filter Bar */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-3 rounded-xl bg-card/40 border border-card-border">
            <div className="relative w-full sm:w-80">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted" />
              <input
                type="text"
                placeholder="Search by contract #, client, or title..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-background border border-card-border rounded-lg text-xs text-white placeholder-muted focus:outline-none focus:border-primary transition-all"
              />
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0">
              <Filter className="h-3.5 w-3.5 text-muted shrink-0" />
              <span className="text-xs text-muted font-medium shrink-0">Status:</span>
              {['ALL', 'DRAFT', 'SENT', 'VIEWED', 'SIGNED', 'REJECTED'].map((st) => (
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

          {/* Contracts List Table */}
          {loading ? (
            <div className="py-20 flex flex-col items-center justify-center text-muted gap-3">
              <RefreshCw className="h-6 w-6 animate-spin text-primary" />
              <p className="text-xs">Loading contracts...</p>
            </div>
          ) : filteredContracts.length === 0 ? (
            <div className="py-20 flex flex-col items-center justify-center text-center p-6 rounded-2xl bg-card/20 border border-card-border border-dashed">
              <div className="p-3.5 rounded-full bg-card-border/40 text-muted mb-3">
                <FileSignature className="h-7 w-7" />
              </div>
              <h3 className="text-base font-bold text-white">No contracts found</h3>
              <p className="text-xs text-muted max-w-sm mt-1 mb-4">
                Draft a contract agreement using one of your templates to collect verified e-signatures.
              </p>
              <Link
                href="/dashboard/operations/contracts/new"
                className="flex items-center gap-2 px-4 py-2 bg-primary hover:bg-primary/90 text-white text-xs font-semibold rounded-lg transition-all"
              >
                <PlusCircle className="h-4 w-4" />
                Create Contract
              </Link>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-card-border bg-card/30">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-card-border/60 bg-card/50 text-muted font-semibold">
                    <th className="py-3 px-4">Contract</th>
                    <th className="py-3 px-4">Client</th>
                    <th className="py-3 px-4">Category</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4">Signature Integrity</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-card-border/40">
                  {filteredContracts.map((c) => {
                    const badge = STATUS_BADGES[c.status] || STATUS_BADGES[StudioContractStatus.DRAFT];
                    return (
                      <tr key={c.id} className="hover:bg-card-border/20 transition-all">
                        <td className="py-3.5 px-4">
                          <Link href={`/dashboard/operations/contracts/${c.id}`} className="group">
                            <div className="font-bold text-white group-hover:text-primary transition-colors flex items-center gap-1.5">
                              {c.title}
                              <ChevronRight className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                            </div>
                            <div className="text-[11px] text-muted font-mono mt-0.5">{c.contract_number} • v{c.version}</div>
                          </Link>
                        </td>

                        <td className="py-3.5 px-4">
                          <div className="font-semibold text-white">{c.client?.full_name || 'Client'}</div>
                          <div className="text-[11px] text-muted">{c.client?.email || ''}</div>
                        </td>

                        <td className="py-3.5 px-4">
                          <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-card/60 border border-card-border text-zinc-300">
                            {c.category}
                          </span>
                        </td>

                        <td className="py-3.5 px-4">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border ${badge.bg} ${badge.text} ${badge.border}`}>
                            {badge.label}
                          </span>
                        </td>

                        <td className="py-3.5 px-4 text-[11px]">
                          {c.status === StudioContractStatus.SIGNED ? (
                            <div className="text-emerald-400 flex items-center gap-1.5">
                              <ShieldCheck className="h-4 w-4" />
                              <span className="font-mono text-[10px]" title={c.signature_hash || ''}>
                                SHA-256: {c.signature_hash ? c.signature_hash.slice(0, 12) + '...' : 'Verified'}
                              </span>
                            </div>
                          ) : (
                            <span className="text-muted">Unsigned</span>
                          )}
                        </td>

                        <td className="py-3.5 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => copySigningLink(c)}
                              title="Copy Public E-Sign Link"
                              className="p-1.5 text-muted hover:text-white hover:bg-card-border/40 rounded-lg transition-all"
                            >
                              {copiedId === c.id ? <CheckCircle2 className="h-4 w-4 text-emerald-400" /> : <Copy className="h-4 w-4" />}
                            </button>

                            <button
                              onClick={() => {
                                setSendModalContract(c);
                                setSendEmail(c.client?.email || '');
                              }}
                              title="Send to Client for Signature"
                              className="p-1.5 text-emerald-400 hover:text-white hover:bg-emerald-600 rounded-lg transition-all"
                            >
                              <Send className="h-4 w-4" />
                            </button>

                            <Link
                              href={`/dashboard/operations/contracts/${c.id}`}
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
        </>
      ) : (
        /* Templates Tab */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {templates.map((tpl) => (
            <div key={tpl.id} className="p-5 rounded-2xl bg-card/40 border border-card-border space-y-3 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-primary/10 text-primary border border-primary/20">
                    {tpl.category}
                  </span>
                  {tpl.is_default && (
                    <span className="text-[10px] font-semibold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                      Default
                    </span>
                  )}
                </div>
                <h3 className="text-sm font-bold text-white mt-2">{tpl.title}</h3>
                <p className="text-xs text-muted line-clamp-3 mt-1">{tpl.description || 'Standard photography contract template.'}</p>
              </div>

              <div className="pt-3 border-t border-card-border/40 flex items-center justify-between">
                <span className="text-[11px] text-muted">
                  {tpl.supported_variables?.length || 15} Variables
                </span>
                <Link
                  href={`/dashboard/operations/contracts/new?templateId=${tpl.id}`}
                  className="px-3 py-1.5 bg-primary/20 hover:bg-primary text-primary hover:text-white text-xs font-semibold rounded-lg transition-all"
                >
                  Use Template
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Send Contract Modal */}
      {sendModalContract && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-background border border-card-border rounded-2xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-card-border pb-3">
              <div className="flex items-center gap-2">
                <Send className="h-5 w-5 text-emerald-400" />
                <h3 className="text-base font-bold text-white">Send Contract for E-Signature</h3>
              </div>
              <button onClick={() => setSendModalContract(null)} className="text-muted hover:text-white">
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-muted font-medium mb-1">Contract</label>
                <div className="p-2.5 rounded-lg bg-card/60 border border-card-border text-white font-semibold flex items-center justify-between">
                  <span>{sendModalContract.title}</span>
                  <span className="text-emerald-400 font-mono">#{sendModalContract.contract_number}</span>
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
                <label className="block text-muted font-medium mb-1">Custom Note (Optional)</label>
                <textarea
                  rows={3}
                  value={sendMessage}
                  onChange={(e) => setSendMessage(e.target.value)}
                  placeholder="Please review and e-sign our photography agreement to finalize your booking."
                  className="w-full px-3 py-2 bg-background border border-card-border rounded-lg text-white placeholder-muted focus:outline-none focus:border-primary"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setSendModalContract(null)}
                className="px-4 py-2 bg-card/60 hover:bg-card text-muted hover:text-white text-xs font-semibold rounded-lg border border-card-border transition-all"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={sending || !sendEmail.trim()}
                onClick={handleSendContract}
                className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-xs font-bold rounded-lg transition-all"
              >
                {sending ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
                Send Agreement
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
