'use client';

import React, { useState, useEffect } from 'react';
import { FinanceNavTabs } from '@/components/dashboard/FinanceNavTabs';
import { TaxNavTabs } from '@/components/dashboard/TaxNavTabs';
import {
  Scale,
  ShieldCheck,
  AlertTriangle,
  Receipt,
  FileCheck,
  TrendingDown,
  TrendingUp,
  ArrowRight,
  RefreshCw,
  Download,
  Building,
  Calendar,
  CheckCircle2,
} from 'lucide-react';
import Link from 'next/link';

export default function TaxDashboardPage() {
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState<any>(null);
  const [compliance, setCompliance] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);

  const loadData = async () => {
    try {
      setLoading(true);
      const [sumRes, compRes, profRes] = await Promise.all([
        fetch('/api/finance/tax/summary'),
        fetch('/api/finance/tax/compliance'),
        fetch('/api/finance/tax/profile'),
      ]);

      if (sumRes.ok) {
        const d = await sumRes.json();
        setSummary(d);
      }
      if (compRes.ok) {
        const c = await compRes.json();
        setCompliance(c);
      }
      if (profRes.ok) {
        const p = await profRes.json();
        setProfile(p);
      }
    } catch (err) {
      console.error('Failed to load tax overview:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const formatCurrency = (minor: number) => {
    const major = (minor || 0) / 100;
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 2,
    }).format(major);
  };

  return (
    <div className="min-h-screen bg-background text-foreground p-6 space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
            <Scale className="h-6 w-6 text-primary" />
            Studio Tax, GST & Compliance Operations
          </h1>
          <p className="text-xs text-muted mt-1">
            Deterministic basis-point tax computation, GST splits, Input Tax Credit (ITC), and General Ledger reconciliation
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={loadData}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-card-border bg-card hover:bg-card-border/50 text-xs text-muted hover:text-white transition-all"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Refresh
          </button>
          <a
            href="/api/finance/tax/export?report_type=SUMMARY"
            download
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-primary hover:bg-primary-hover text-white text-xs font-semibold shadow transition-all"
          >
            <Download className="h-3.5 w-3.5" />
            Export GST Summary
          </a>
        </div>
      </div>

      <FinanceNavTabs />
      <TaxNavTabs />

      {/* Profile & GSTIN Banner */}
      <div className="p-4 rounded-xl border border-card-border bg-card/60 backdrop-blur flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-lg bg-primary/10 border border-primary/20 text-primary">
            <Building className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-semibold text-white">{profile?.legal_name || 'Studio Tax Profile'}</h2>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                {profile?.is_gst_registered ? 'GST Registered' : 'Unregistered'}
              </span>
            </div>
            <p className="text-xs text-muted mt-0.5">
              PAN: <span className="font-mono text-white/90">{profile?.pan_number || 'Not Configured'}</span> • Default Rate: {(profile?.default_tax_rate_bps || 1800) / 100}%
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/dashboard/finance/tax/profile"
            className="px-3 py-1.5 rounded-lg border border-card-border hover:bg-card-border text-xs text-muted hover:text-white transition-all"
          >
            Configure Tax Profile
          </Link>
          <Link
            href="/dashboard/finance/tax/periods"
            className="px-3 py-1.5 rounded-lg bg-card-border/70 hover:bg-card-border text-xs text-white transition-all flex items-center gap-1"
          >
            <Calendar className="h-3.5 w-3.5" />
            Active Periods
          </Link>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Output Tax */}
        <div className="p-5 rounded-xl border border-card-border bg-card/50 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-muted">Output Tax (Sales/Invoices)</span>
              <div className="p-1.5 rounded-md bg-amber-500/10 text-amber-400 border border-amber-500/20">
                <TrendingUp className="h-4 w-4" />
              </div>
            </div>
            <div className="text-2xl font-bold text-white mt-2 font-mono">
              {loading ? '...' : formatCurrency(summary?.output_tax?.total_output_tax_minor || 0)}
            </div>
          </div>
          <div className="mt-3 pt-3 border-t border-card-border/50 text-[11px] text-muted flex items-center justify-between">
            <span>CGST: {formatCurrency(summary?.output_tax?.cgst_minor || 0)}</span>
            <span>SGST: {formatCurrency(summary?.output_tax?.sgst_minor || 0)}</span>
            <span>IGST: {formatCurrency(summary?.output_tax?.igst_minor || 0)}</span>
          </div>
        </div>

        {/* Input Tax Credit */}
        <div className="p-5 rounded-xl border border-card-border bg-card/50 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-muted">Eligible ITC (Purchases)</span>
              <div className="p-1.5 rounded-md bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                <TrendingDown className="h-4 w-4" />
              </div>
            </div>
            <div className="text-2xl font-bold text-white mt-2 font-mono">
              {loading ? '...' : formatCurrency(summary?.input_tax?.eligible_itc_minor || 0)}
            </div>
          </div>
          <div className="mt-3 pt-3 border-t border-card-border/50 text-[11px] text-muted flex items-center justify-between">
            <span>Total ITC: {formatCurrency(summary?.input_tax?.total_input_tax_minor || 0)}</span>
            <span className="text-rose-400/80">Ineligible: {formatCurrency(summary?.input_tax?.ineligible_itc_minor || 0)}</span>
          </div>
        </div>

        {/* Net Tax Payable */}
        <div className="p-5 rounded-xl border border-card-border bg-card/50 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-muted">Net Tax Payable (Liability)</span>
              <div className="p-1.5 rounded-md bg-primary/10 text-primary border border-primary/20">
                <Receipt className="h-4 w-4" />
              </div>
            </div>
            <div className="text-2xl font-bold text-white mt-2 font-mono">
              {loading ? '...' : formatCurrency(summary?.net_tax_payable_minor || 0)}
            </div>
          </div>
          <div className="mt-3 pt-3 border-t border-card-border/50 text-[11px] text-muted flex items-center justify-between">
            <span>RCM Payable: {formatCurrency(summary?.reverse_charge_payable_minor || 0)}</span>
            <span className="text-emerald-400">Offset: {formatCurrency(summary?.itc_utilized_minor || 0)}</span>
          </div>
        </div>

        {/* Compliance Health */}
        <div className="p-5 rounded-xl border border-card-border bg-card/50 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-muted">Compliance Status</span>
              <div className={`p-1.5 rounded-md border ${
                (compliance?.issues_count || 0) === 0
                  ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                  : 'bg-rose-500/10 text-rose-400 border-rose-500/20'
              }`}>
                {(compliance?.issues_count || 0) === 0 ? <ShieldCheck className="h-4 w-4" /> : <AlertTriangle className="h-4 w-4" />}
              </div>
            </div>
            <div className="text-2xl font-bold text-white mt-2 flex items-center gap-2">
              {loading ? '...' : (compliance?.issues_count || 0) === 0 ? '100% Valid' : `${compliance?.issues_count} Alerts`}
            </div>
          </div>
          <div className="mt-3 pt-3 border-t border-card-border/50 text-[11px] text-muted flex items-center justify-between">
            <span>Total Checks: {compliance?.checks_performed || 8}</span>
            <Link href="/dashboard/finance/tax/compliance" className="text-primary hover:underline flex items-center gap-0.5">
              Review <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
        </div>
      </div>

      {/* Quick Navigation Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Link
          href="/dashboard/finance/tax/transactions"
          className="p-4 rounded-xl border border-card-border bg-card/40 hover:bg-card-border/30 transition-all group"
        >
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-white group-hover:text-primary transition-colors">Tax Transactions</h3>
            <ArrowRight className="h-4 w-4 text-muted group-hover:text-primary transition-transform group-hover:translate-x-0.5" />
          </div>
          <p className="text-xs text-muted mt-1.5">
            View balanced output tax, input tax, credit/debit notes, and linked double-entry journal postings.
          </p>
        </Link>

        <Link
          href="/dashboard/finance/tax/reconciliation"
          className="p-4 rounded-xl border border-card-border bg-card/40 hover:bg-card-border/30 transition-all group"
        >
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-white group-hover:text-primary transition-colors">Ledger Reconciliation</h3>
            <ArrowRight className="h-4 w-4 text-muted group-hover:text-primary transition-transform group-hover:translate-x-0.5" />
          </div>
          <p className="text-xs text-muted mt-1.5">
            Audit tax subledger vs Phase 34 General Ledger accounts with zero discrepancy tolerance.
          </p>
        </Link>

        <Link
          href="/dashboard/finance/tax/reports"
          className="p-4 rounded-xl border border-card-border bg-card/40 hover:bg-card-border/30 transition-all group"
        >
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-white group-hover:text-primary transition-colors">GST Returns & Reports</h3>
            <ArrowRight className="h-4 w-4 text-muted group-hover:text-primary transition-transform group-hover:translate-x-0.5" />
          </div>
          <p className="text-xs text-muted mt-1.5">
            Generate GSTR-1, GSTR-3B, and GSTR-2B operational extracts with formula-injection-safe CSV exports.
          </p>
        </Link>
      </div>

      {/* Compliance Alerts Preview */}
      {compliance?.issues && compliance.issues.length > 0 && (
        <div className="p-4 rounded-xl border border-rose-500/20 bg-rose-500/5 space-y-3">
          <div className="flex items-center gap-2 text-rose-400 font-semibold text-xs">
            <AlertTriangle className="h-4 w-4" />
            Compliance Attention Required ({compliance.issues.length} Items)
          </div>
          <div className="space-y-2">
            {compliance.issues.slice(0, 3).map((issue: any, idx: number) => (
              <div key={idx} className="flex items-center justify-between p-2.5 rounded-lg bg-card/80 border border-card-border text-xs">
                <span className="text-white/90 font-medium">{issue.title || issue.message}</span>
                <span className="px-2 py-0.5 rounded text-[10px] bg-rose-500/10 text-rose-300 font-mono">
                  {issue.severity || 'WARNING'}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
