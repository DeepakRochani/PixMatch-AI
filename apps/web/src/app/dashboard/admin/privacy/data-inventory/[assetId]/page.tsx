'use client';

import React, { useState, useEffect, use } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  Database,
  ShieldCheck,
  ShieldAlert,
  HardDrive,
  Lock,
  Sparkles,
  Layers,
  Activity,
  Clock,
  Key,
} from 'lucide-react';
import { PlatformDataAssetDTO } from '@pixmatch/types';

export default function DataAssetDetailPage({ params }: { params: Promise<{ assetId: string }> }) {
  const resolvedParams = use(params);
  const { assetId } = resolvedParams;

  const [asset, setAsset] = useState<PlatformDataAssetDTO | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    const fetchAsset = async () => {
      try {
        setLoading(true);
        const res = await fetch(`/api/admin/privacy/assets/${assetId}`);
        if (res.ok) {
          const d = await res.json();
          if (d.success) setAsset(d.data);
        }
      } catch (e) {
        console.error('Failed to load asset details:', e);
      } finally {
        setLoading(false);
      }
    };
    fetchAsset();
  }, [assetId]);

  if (loading) {
    return <div className="p-8 text-slate-400 bg-[#0B0F17] min-h-screen">Loading asset details...</div>;
  }

  if (!asset) {
    return (
      <div className="p-8 space-y-4 bg-[#0B0F17] min-h-screen text-slate-100">
        <Link
          href="/dashboard/admin/privacy/data-inventory"
          className="text-xs text-slate-400 hover:text-emerald-400 flex items-center gap-1"
        >
          <ArrowLeft className="h-3 w-3" /> Back to Inventory
        </Link>
        <div className="p-6 rounded-xl bg-card-bg border border-red-500/30 text-red-400 text-sm">
          Data asset not found.
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 md:p-8 space-y-8 bg-[#0B0F17] min-h-screen text-slate-100">
      {/* Header */}
      <div className="space-y-2 border-b border-card-border/80 pb-6">
        <Link
          href="/dashboard/admin/privacy/data-inventory"
          className="text-xs text-slate-400 hover:text-emerald-400 flex items-center gap-1 transition-colors"
        >
          <ArrowLeft className="h-3 w-3" /> Back to Data Inventory
        </Link>
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-semibold tracking-wider uppercase bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                {asset.classification}
              </span>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-semibold tracking-wider uppercase bg-slate-700/50 text-slate-300">
                {asset.category}
              </span>
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2.5">
              <Database className="h-7 w-7 text-emerald-400" />
              {asset.name}
            </h1>
            <p className="text-slate-400 text-xs font-mono mt-0.5">Asset Key: {asset.assetKey}</p>
          </div>
        </div>
      </div>

      {/* Description */}
      {asset.description && (
        <div className="p-4 rounded-xl bg-card-bg border border-card-border text-sm text-slate-300 leading-relaxed">
          {asset.description}
        </div>
      )}

      {/* Core Specification Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <div className="p-5 rounded-xl bg-card-bg border border-card-border space-y-4">
          <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-2">
            <HardDrive className="h-4 w-4 text-emerald-400" />
            Storage & Technical Architecture
          </h3>
          <div className="space-y-2.5 text-xs">
            <div className="flex justify-between py-1 border-b border-slate-800">
              <span className="text-slate-400">Storage Engine:</span>
              <span className="font-semibold text-white">{asset.storageEngine}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-800">
              <span className="text-slate-400">Database Table / Path:</span>
              <span className="font-mono text-emerald-400">{asset.tableName || 'N/A'}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-800">
              <span className="text-slate-400">Owner Entity Type:</span>
              <span className="font-semibold text-white">{asset.ownerType}</span>
            </div>
            <div className="flex justify-between py-1">
              <span className="text-slate-400">Exportable in SAR:</span>
              <span className={`font-semibold ${asset.exportable ? 'text-emerald-400' : 'text-red-400'}`}>
                {asset.exportable ? 'Yes (Sanitized)' : 'No (Secret / Vector)'}
              </span>
            </div>
          </div>
        </div>

        <div className="p-5 rounded-xl bg-card-bg border border-card-border space-y-4">
          <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-2">
            <Lock className="h-4 w-4 text-blue-400" />
            Security & Encryption
          </h3>
          <div className="space-y-2.5 text-xs">
            <div className="flex justify-between py-1 border-b border-slate-800">
              <span className="text-slate-400">Encryption at Rest:</span>
              <span className="font-semibold text-emerald-400">{asset.encryptionAtRest ? 'AES-256 Enabled' : 'Disabled'}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-800">
              <span className="text-slate-400">Encryption in Transit:</span>
              <span className="font-semibold text-emerald-400">{asset.encryptionInTransit ? 'TLS 1.3 Strict' : 'Disabled'}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-800">
              <span className="text-slate-400">Legal Basis:</span>
              <span className="font-mono text-purple-400">{asset.legalBasis}</span>
            </div>
            <div className="flex justify-between py-1">
              <span className="text-slate-400">Anonymization Method:</span>
              <span className="font-mono text-amber-400">{asset.anonymizationMethod || 'None'}</span>
            </div>
          </div>
        </div>

        <div className="p-5 rounded-xl bg-card-bg border border-card-border space-y-4">
          <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-pink-400" />
            Sensitivity & Classifications
          </h3>
          <div className="space-y-2.5 text-xs">
            <div className="flex justify-between py-1 border-b border-slate-800">
              <span className="text-slate-400">Personal Data (PII):</span>
              <span className={`font-semibold ${asset.personalData ? 'text-blue-400' : 'text-slate-400'}`}>
                {asset.personalData ? 'Yes' : 'No'}
              </span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-800">
              <span className="text-slate-400">Sensitive Personal Data:</span>
              <span className={`font-semibold ${asset.sensitivePersonalData ? 'text-red-400' : 'text-slate-400'}`}>
                {asset.sensitivePersonalData ? 'Yes' : 'No'}
              </span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-800">
              <span className="text-slate-400">Biometric Vector Data:</span>
              <span className={`font-semibold ${asset.biometricData ? 'text-pink-400' : 'text-slate-400'}`}>
                {asset.biometricData ? 'Yes (512-dim ArcFace)' : 'No'}
              </span>
            </div>
            <div className="flex justify-between py-1">
              <span className="text-slate-400">Financial / GL Data:</span>
              <span className={`font-semibold ${asset.financialData ? 'text-amber-400' : 'text-slate-400'}`}>
                {asset.financialData ? 'Yes' : 'No'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Processing Purposes */}
      <div className="p-5 rounded-xl bg-card-bg border border-card-border space-y-3">
        <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
          Approved Data Processing Purposes
        </h3>
        <div className="flex flex-wrap gap-2">
          {asset.purposes.map((p) => (
            <span
              key={p}
              className="px-3 py-1 rounded-lg text-xs font-medium bg-slate-800 border border-slate-700 text-slate-200"
            >
              {p}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
