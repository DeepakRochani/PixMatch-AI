'use client';

import React, { useState, useEffect } from 'react';
import { FinanceNavTabs } from '@/components/dashboard/FinanceNavTabs';
import { TaxNavTabs } from '@/components/dashboard/TaxNavTabs';
import { ShieldAlert, ShieldCheck, RefreshCw, AlertTriangle, CheckCircle2, FileCheck, ArrowRight } from 'lucide-react';
import Link from 'next/link';

export default function TaxComplianceAuditPage() {
  const [loading, setLoading] = useState(true);
  const [compliance, setCompliance] = useState<any>(null);

  const loadCompliance = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/finance/tax/compliance');
      if (res.ok) {
        setCompliance(await res.json());
      }
    } catch (err) {
      console.error('Failed to run compliance checks:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCompliance();
  }, []);

  return (
    <div className="min-h-screen bg-background text-foreground p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
            <ShieldAlert className="h-6 w-6 text-primary" />
            Tax & GST Compliance Audit Engine
          </h1>
          <p className="text-xs text-muted mt-1">
            Automated compliance engine detecting missing GSTINs, unmapped SAC codes, rate mismatches, and overdue periods
          </p>
        </div>
        <button
          onClick={loadCompliance}
          disabled={loading}
          className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-primary hover:bg-primary-hover text-white text-xs font-semibold shadow disabled:opacity-50 transition-all"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
          Run Compliance Audit
        </button>
      </div>

      <FinanceNavTabs />
      <TaxNavTabs />

      {/* Compliance Overview Banner */}
      <div className={`p-6 rounded-xl border flex flex-col md:flex-row items-center justify-between gap-4 ${
        (compliance?.issues_count || 0) === 0
          ? 'bg-emerald-500/10 border-emerald-500/20'
          : 'bg-rose-500/10 border-rose-500/20'
      }`}>
        <div className="flex items-center gap-4">
          <div className={`p-3 rounded-xl border ${
            (compliance?.issues_count || 0) === 0
              ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
              : 'bg-rose-500/20 text-rose-400 border-rose-500/30'
          }`}>
            {(compliance?.issues_count || 0) === 0 ? (
              <ShieldCheck className="h-8 w-8" />
            ) : (
              <AlertTriangle className="h-8 w-8" />
            )}
          </div>
          <div>
            <h2 className="text-lg font-bold text-white">
              {(compliance?.issues_count || 0) === 0 ? 'Compliant & Audit Ready' : `${compliance?.issues_count} Compliance Issue(s) Detected`}
            </h2>
            <p className="text-xs text-muted mt-0.5">
              Performed {compliance?.checks_performed || 8} deterministic compliance checks across transactions, profiles, and periods
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="text-right">
            <span className="text-xs text-muted block">Status Score</span>
            <span className="text-xl font-bold font-mono text-white">
              {(compliance?.issues_count || 0) === 0 ? '100 / 100' : `${Math.max(0, 100 - (compliance?.issues_count || 0) * 15)} / 100`}
            </span>
          </div>
        </div>
      </div>

      {/* Issues List */}
      <div className="rounded-xl border border-card-border bg-card/60 overflow-hidden">
        <div className="p-4 border-b border-card-border flex items-center justify-between">
          <h3 className="text-sm font-semibold text-white">Detected Compliance Actions</h3>
          <span className="text-xs text-muted">{compliance?.issues?.length || 0} Open Items</span>
        </div>

        <div className="divide-y divide-card-border/40">
          {loading ? (
            <div className="p-8 text-center text-xs text-muted">Running audit diagnostics...</div>
          ) : !compliance?.issues || compliance.issues.length === 0 ? (
            <div className="p-8 text-center text-xs text-muted flex flex-col items-center gap-2">
              <CheckCircle2 className="h-8 w-8 text-emerald-400" />
              <span className="text-white font-medium">All tax compliance rules passed successfully.</span>
              <span>No missing registrations, invalid GSTINs, or unmapped service catalog lines found.</span>
            </div>
          ) : (
            compliance.issues.map((issue: any, index: number) => (
              <div key={index} className="p-4 flex items-start justify-between gap-4 hover:bg-card-border/20 transition-colors">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-xs text-white">{issue.title || issue.code}</span>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-mono ${
                      issue.severity === 'ERROR'
                        ? 'bg-rose-500/10 text-rose-300 border border-rose-500/20'
                        : 'bg-amber-500/10 text-amber-300 border border-amber-500/20'
                    }`}>
                      {issue.severity || 'WARNING'}
                    </span>
                  </div>
                  <p className="text-xs text-muted">{issue.message || issue.description}</p>
                  {issue.recommendation && (
                    <p className="text-[11px] text-primary mt-1 font-medium">
                      Action: {issue.recommendation}
                    </p>
                  )}
                </div>

                {issue.link && (
                  <Link
                    href={issue.link}
                    className="flex items-center gap-1 text-xs text-primary hover:underline font-medium shrink-0"
                  >
                    Resolve <ArrowRight className="h-3 w-3" />
                  </Link>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
