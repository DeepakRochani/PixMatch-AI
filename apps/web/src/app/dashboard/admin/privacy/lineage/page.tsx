'use client';

import React, { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import {
  Layers,
  ArrowLeft,
  ArrowRight,
  Database,
  Sparkles,
  RefreshCw,
  Activity,
  GitBranch,
} from 'lucide-react';
import { PlatformDataAssetDTO, PlatformDataLineageDTO } from '@pixmatch/types';

function DataLineageContent() {
  const [nodes, setNodes] = useState<PlatformDataAssetDTO[]>([]);
  const [edges, setEdges] = useState<PlatformDataLineageDTO[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  const fetchLineage = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/admin/privacy/lineage');
      if (res.ok) {
        const d = await res.json();
        if (d.success) {
          setNodes(d.data.nodes || []);
          setEdges(d.data.edges || []);
        }
      }
    } catch (e) {
      console.error('Failed to load lineage:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLineage();
  }, []);

  return (
    <div className="p-6 md:p-8 space-y-6 bg-[#0B0F17] min-h-screen text-slate-100">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-card-border/80 pb-6">
        <div>
          <Link
            href="/dashboard/admin/privacy"
            className="text-xs text-slate-400 hover:text-emerald-400 flex items-center gap-1 mb-2 transition-colors"
          >
            <ArrowLeft className="h-3 w-3" /> Back to Privacy Center
          </Link>
          <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2.5">
            <Layers className="h-7 w-7 text-blue-400" />
            Platform Data Lineage & Flow Architecture
          </h1>
          <p className="text-slate-400 text-xs mt-1">
            Data transformation pipelines, AI feature extraction hops, and financial ledger sync streams.
          </p>
        </div>

        <button
          onClick={fetchLineage}
          className="flex items-center gap-2 px-3.5 py-2 rounded-lg bg-card-bg border border-card-border hover:bg-slate-800 text-slate-300 text-xs font-medium transition-colors"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin text-blue-400' : ''}`} />
          Refresh Lineage
        </button>
      </div>

      {/* Visual Pipeline Edges */}
      <div className="space-y-4">
        <h2 className="text-sm font-semibold text-white flex items-center gap-2">
          <GitBranch className="h-4 w-4 text-emerald-400" />
          Active Pipeline Transformations ({edges.length})
        </h2>

        {loading ? (
          <div className="p-8 text-center text-slate-400 bg-card-bg rounded-xl border border-card-border">
            Loading lineage graph...
          </div>
        ) : edges.length === 0 ? (
          <div className="p-8 text-center text-slate-400 bg-card-bg rounded-xl border border-card-border">
            No lineage edges mapped.
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {edges.map((edge) => (
              <div
                key={edge.id}
                className="p-5 rounded-xl bg-card-bg border border-card-border hover:border-blue-500/40 transition-all flex flex-col md:flex-row md:items-center justify-between gap-4"
              >
                <div className="flex flex-col md:flex-row md:items-center gap-4 flex-1">
                  {/* Source Asset */}
                  <div className="p-3.5 rounded-lg bg-slate-900 border border-slate-700/80 min-w-[200px]">
                    <span className="text-[10px] text-slate-400 uppercase font-semibold">Source Asset</span>
                    <div className="text-xs font-bold text-white mt-0.5">{edge.sourceAssetName || edge.sourceAssetId}</div>
                  </div>

                  {/* Transformation Arrow */}
                  <div className="flex flex-col items-center justify-center px-2">
                    <span className="text-[10px] font-mono text-emerald-400 uppercase px-2 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/20 mb-1">
                      {edge.transformationType}
                    </span>
                    <div className="flex items-center text-slate-400">
                      <div className="h-[2px] w-12 bg-slate-700"></div>
                      <ArrowRight className="h-4 w-4 text-emerald-400 -ml-1" />
                    </div>
                    <span className="text-[9px] text-slate-400 mt-1">{edge.syncFrequency || 'Continuous'}</span>
                  </div>

                  {/* Target Asset */}
                  <div className="p-3.5 rounded-lg bg-slate-900 border border-slate-700/80 min-w-[200px]">
                    <span className="text-[10px] text-slate-400 uppercase font-semibold">Target Asset</span>
                    <div className="text-xs font-bold text-white mt-0.5">{edge.targetAssetName || edge.targetAssetId}</div>
                  </div>
                </div>

                <div className="max-w-md text-xs text-slate-400 border-l border-slate-800 pl-4">
                  <div className="font-semibold text-slate-300">Purpose: {edge.processingPurpose}</div>
                  <p className="mt-1 text-[11px] leading-relaxed">{edge.description || 'Transformation flow for platform processing.'}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default function DataLineagePage() {
  return (
    <Suspense fallback={<div className="p-8 text-slate-400">Loading Data Lineage...</div>}>
      <DataLineageContent />
    </Suspense>
  );
}
