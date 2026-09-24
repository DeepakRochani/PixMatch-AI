'use client';

import React, { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import {
  Lock,
  ArrowLeft,
  ShieldAlert,
  Plus,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  Unlock,
} from 'lucide-react';
import { DataLegalHoldDTO, LegalHoldStatus } from '@pixmatch/types';

function LegalHoldsContent() {
  const [holds, setHolds] = useState<DataLegalHoldDTO[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [showModal, setShowModal] = useState<boolean>(false);
  const [nameInput, setNameInput] = useState<string>('');
  const [caseNumberInput, setCaseNumberInput] = useState<string>('');
  const [custodianInput, setCustodianInput] = useState<string>('');
  const [reasonInput, setReasonInput] = useState<string>('');
  const [creating, setCreating] = useState<boolean>(false);

  const fetchHolds = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/admin/privacy/legal-holds');
      if (res.ok) {
        const d = await res.json();
        if (d.success) setHolds(d.data || []);
      }
    } catch (e) {
      console.error('Failed to load legal holds:', e);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setCreating(true);
      const res = await fetch('/api/admin/privacy/legal-holds', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: nameInput,
          caseNumber: caseNumberInput,
          custodian: custodianInput,
          reason: reasonInput,
        }),
      });
      if (res.ok) {
        setShowModal(false);
        setNameInput('');
        setCaseNumberInput('');
        setCustodianInput('');
        setReasonInput('');
        fetchHolds();
      }
    } catch (e) {
      console.error('Failed to create legal hold:', e);
    } finally {
      setCreating(false);
    }
  };

  const handleRelease = async (id: string) => {
    const reason = prompt('Please enter the reason for releasing this legal hold:');
    if (!reason) return;

    try {
      const res = await fetch(`/api/admin/privacy/legal-holds/${id}/release`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ releaseReason: reason }),
      });
      if (res.ok) {
        fetchHolds();
      }
    } catch (e) {
      console.error('Failed to release legal hold:', e);
    }
  };

  useEffect(() => {
    fetchHolds();
  }, []);

  return (
    <div className="p-6 md:p-8 space-y-8 bg-[#0B0F17] min-h-screen text-slate-100">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-card-border/80 pb-6">
        <div>
          <Link
            href="/dashboard/admin/privacy"
            className="text-xs text-slate-400 hover:text-emerald-400 flex items-center gap-1 mb-2 transition-colors"
          >
            <ArrowLeft className="h-3 w-3" /> Back to Privacy Center
          </Link>
          <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2.5">
            <Lock className="h-7 w-7 text-amber-400" />
            Legal Holds & Litigation Preservation
          </h1>
          <p className="text-slate-400 text-xs mt-1">
            Impose and manage data preservation orders that strictly supersede and block automated retention purges and privacy deletions.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowModal(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-gradient-to-r from-amber-600 to-yellow-600 hover:from-amber-500 hover:to-yellow-500 text-white text-xs font-semibold shadow-lg shadow-amber-500/20 transition-all"
          >
            <Plus className="h-4 w-4" />
            Issue Legal Hold
          </button>
          <button
            onClick={fetchHolds}
            className="flex items-center gap-2 px-3.5 py-2 rounded-lg bg-card-bg border border-card-border hover:bg-slate-800 text-slate-300 text-xs font-medium transition-colors"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin text-amber-400' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      {/* Holds Table */}
      <div className="rounded-xl bg-card-bg border border-card-border/80 overflow-hidden">
        <div className="p-4 bg-slate-900/80 border-b border-card-border">
          <h2 className="text-xs font-bold text-white uppercase tracking-wider">
            Active & Released Legal Holds ({holds.length})
          </h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-900/60 border-b border-card-border text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
              <tr>
                <th className="px-4 py-3.5">Matter Name & Case #</th>
                <th className="px-4 py-3.5">Custodian</th>
                <th className="px-4 py-3.5">Status</th>
                <th className="px-4 py-3.5">Reason</th>
                <th className="px-4 py-3.5">Issued At</th>
                <th className="px-4 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center text-slate-400">
                    Loading legal holds...
                  </td>
                </tr>
              ) : holds.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center text-slate-400">
                    No legal holds on record.
                  </td>
                </tr>
              ) : holds.map((h) => (
                <tr key={h.id} className="hover:bg-slate-800/40 transition-colors">
                  <td className="px-4 py-3.5">
                    <div className="font-semibold text-white">{h.name}</div>
                    <div className="text-[11px] text-amber-400 font-mono mt-0.5">{h.caseNumber}</div>
                  </td>
                  <td className="px-4 py-3.5 text-slate-300">
                    {h.custodian}
                  </td>
                  <td className="px-4 py-3.5">
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase border ${
                        h.status === LegalHoldStatus.ACTIVE
                          ? 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                          : 'bg-slate-700/40 text-slate-400 border-slate-600'
                      }`}
                    >
                      {h.status}
                    </span>
                  </td>
                  <td className="px-4 py-3.5 text-slate-400 max-w-xs text-[11px]">
                    {h.reason}
                  </td>
                  <td className="px-4 py-3.5 font-mono text-[11px] text-slate-400">
                    {new Date(h.issuedAt).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3.5 text-right">
                    {h.status === LegalHoldStatus.ACTIVE ? (
                      <button
                        onClick={() => handleRelease(h.id)}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-amber-400 text-xs font-medium border border-slate-700 transition-colors"
                      >
                        <Unlock className="h-3 w-3" />
                        Release
                      </button>
                    ) : (
                      <span className="text-[11px] text-slate-500">Released</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal for Creating Hold */}
      {showModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-2xl">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Lock className="h-5 w-5 text-amber-400" />
              Issue New Legal Hold
            </h3>
            <form onSubmit={handleCreate} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-300 mb-1 font-medium">Matter / Hold Name:</label>
                <input
                  type="text"
                  required
                  value={nameInput}
                  onChange={(e) => setNameInput(e.target.value)}
                  placeholder="e.g. Litigation Investigation Matter 2026"
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-white"
                />
              </div>
              <div>
                <label className="block text-slate-300 mb-1 font-medium">Case Number / Reference:</label>
                <input
                  type="text"
                  required
                  value={caseNumberInput}
                  onChange={(e) => setCaseNumberInput(e.target.value)}
                  placeholder="e.g. CASE-2026-0881"
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-white"
                />
              </div>
              <div>
                <label className="block text-slate-300 mb-1 font-medium">Custodian / Legal Counsel:</label>
                <input
                  type="text"
                  required
                  value={custodianInput}
                  onChange={(e) => setCustodianInput(e.target.value)}
                  placeholder="e.g. General Counsel / Compliance Officer"
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-white"
                />
              </div>
              <div>
                <label className="block text-slate-300 mb-1 font-medium">Reason & Scope:</label>
                <textarea
                  required
                  rows={3}
                  value={reasonInput}
                  onChange={(e) => setReasonInput(e.target.value)}
                  placeholder="Detailed description of preservation requirement..."
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-white"
                />
              </div>
              <div className="flex justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  className="px-4 py-2 rounded-lg bg-amber-600 hover:bg-amber-500 text-white font-bold"
                >
                  {creating ? 'Issuing...' : 'Issue Preservation Hold'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default function LegalHoldsPage() {
  return (
    <Suspense fallback={<div className="p-8 text-slate-400">Loading Legal Holds...</div>}>
      <LegalHoldsContent />
    </Suspense>
  );
}
