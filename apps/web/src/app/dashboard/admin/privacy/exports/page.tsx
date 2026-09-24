'use client';

import React, { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import {
  FileText,
  ArrowLeft,
  Download,
  ShieldCheck,
  RefreshCw,
  Plus,
  Key,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';
import { PrivacyExportRecordDTO } from '@pixmatch/types';

function ExportsPageContent() {
  const [exportsList, setExportsList] = useState<PrivacyExportRecordDTO[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [generating, setGenerating] = useState<boolean>(false);
  const [emailInput, setEmailInput] = useState<string>('');
  const [formatInput, setFormatInput] = useState<'JSON' | 'CSV' | 'ZIP'>('JSON');
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const fetchExports = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/admin/privacy/exports');
      if (res.ok) {
        const d = await res.json();
        if (d.success) setExportsList(d.data || []);
      }
    } catch (e) {
      console.error('Failed to load exports:', e);
    } finally {
      setLoading(false);
    }
  };

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!emailInput) return;
    try {
      setGenerating(true);
      setSuccessMsg(null);
      const res = await fetch('/api/admin/privacy/exports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subjectEmail: emailInput,
          format: formatInput,
        }),
      });
      if (res.ok) {
        const d = await res.json();
        if (d.success) {
          setSuccessMsg(`Export generated successfully for ${emailInput}! Checksum: ${d.data.checksumSha256.substring(0, 16)}...`);
          setEmailInput('');
          fetchExports();
        }
      }
    } catch (e) {
      console.error('Failed to generate export:', e);
    } finally {
      setGenerating(false);
    }
  };

  useEffect(() => {
    fetchExports();
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
            <FileText className="h-7 w-7 text-sky-400" />
            Subject Access Request (SAR) Export Packages
          </h1>
          <p className="text-slate-400 text-xs mt-1">
            Generate sanitized, formula-injection defended JSON & CSV export bundles with cryptographic checksum verification.
          </p>
        </div>

        <button
          onClick={fetchExports}
          className="flex items-center gap-2 px-3.5 py-2 rounded-lg bg-card-bg border border-card-border hover:bg-slate-800 text-slate-300 text-xs font-medium transition-colors"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin text-sky-400' : ''}`} />
          Refresh
        </button>
      </div>

      {/* Generate New Export Card */}
      <div className="p-5 rounded-xl bg-card-bg border border-card-border space-y-4">
        <h2 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
          <Plus className="h-4 w-4 text-emerald-400" />
          Generate New Subject Access Export Bundle
        </h2>
        {successMsg && (
          <div className="p-3 rounded-lg bg-emerald-950/40 border border-emerald-500/40 text-emerald-300 text-xs flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4" />
            {successMsg}
          </div>
        )}
        <form onSubmit={handleGenerate} className="flex flex-col md:flex-row items-center gap-4">
          <input
            type="email"
            placeholder="Subject user / client email address..."
            value={emailInput}
            onChange={(e) => setEmailInput(e.target.value)}
            required
            className="flex-1 px-4 py-2.5 bg-slate-900 border border-slate-700 rounded-lg text-xs text-white placeholder-slate-500 focus:outline-none focus:border-sky-500"
          />
          <select
            value={formatInput}
            onChange={(e) => setFormatInput(e.target.value as any)}
            className="bg-slate-900 border border-slate-700 rounded-lg px-3 py-2.5 text-xs text-slate-200 focus:outline-none focus:border-sky-500"
          >
            <option value="JSON">JSON (Standard Structured Data)</option>
            <option value="CSV">CSV (Spreadsheet - Formula Defended)</option>
            <option value="ZIP">ZIP (Multi-table Archive)</option>
          </select>
          <button
            type="submit"
            disabled={generating}
            className="px-5 py-2.5 rounded-lg bg-gradient-to-r from-sky-600 to-blue-600 hover:from-sky-500 hover:to-blue-500 text-white text-xs font-semibold shadow-lg shadow-sky-500/20 transition-all"
          >
            {generating ? 'Compiling Package...' : 'Generate SAR Package'}
          </button>
        </form>
      </div>

      {/* Export Packages Table */}
      <div className="rounded-xl bg-card-bg border border-card-border/80 overflow-hidden">
        <div className="p-4 bg-slate-900/80 border-b border-card-border">
          <h2 className="text-xs font-bold text-white uppercase tracking-wider">
            Generated Export Bundles ({exportsList.length})
          </h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-900/60 border-b border-card-border text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
              <tr>
                <th className="px-4 py-3.5">Subject Email</th>
                <th className="px-4 py-3.5">Format</th>
                <th className="px-4 py-3.5">Package Size</th>
                <th className="px-4 py-3.5">SHA-256 Checksum</th>
                <th className="px-4 py-3.5">Expires At</th>
                <th className="px-4 py-3.5 text-right">Download</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-mono">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center text-slate-400 font-sans">
                    Loading exports...
                  </td>
                </tr>
              ) : exportsList.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center text-slate-400 font-sans">
                    No export packages generated yet.
                  </td>
                </tr>
              ) : exportsList.map((e) => (
                <tr key={e.id} className="hover:bg-slate-800/40 transition-colors">
                  <td className="px-4 py-3.5 font-sans font-semibold text-white">
                    {e.subjectEmail}
                  </td>
                  <td className="px-4 py-3.5 text-sky-400 font-semibold">
                    {e.exportFormat}
                  </td>
                  <td className="px-4 py-3.5 text-slate-300">
                    {(e.fileSizeBytes / 1024).toFixed(1)} KB
                  </td>
                  <td className="px-4 py-3.5 text-[11px] text-slate-400">
                    {e.checksumSha256.substring(0, 20)}...
                  </td>
                  <td className="px-4 py-3.5 text-slate-400 font-sans text-[11px]">
                    {new Date(e.expiresAt).toLocaleString()}
                  </td>
                  <td className="px-4 py-3.5 text-right font-sans">
                    <a
                      href={e.downloadUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-sky-600/20 hover:bg-sky-600/30 text-sky-300 border border-sky-500/30 text-xs font-medium transition-colors"
                    >
                      <Download className="h-3.5 w-3.5" />
                      Get Bundle
                    </a>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export default function ExportsPage() {
  return (
    <Suspense fallback={<div className="p-8 text-slate-400">Loading SAR Exports...</div>}>
      <ExportsPageContent />
    </Suspense>
  );
}
