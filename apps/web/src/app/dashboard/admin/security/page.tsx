'use client';

import React, { useEffect, useState } from 'react';
import {
  ShieldCheck,
  Lock,
  RefreshCw,
  Users,
  Key,
  Eye,
  AlertOctagon,
  CheckCircle2,
  FileText,
} from 'lucide-react';
import { fetchApi } from '@/lib/api-client';
import { PlatformAdminRole, AdminPermission } from '@pixmatch/types';

export default function AdminSecurityPage() {
  const [activeTab, setActiveTab] = useState<'ROLES' | 'POLICIES' | 'SECRETS'>('ROLES');

  const roles = [
    {
      role: PlatformAdminRole.SUPER_ADMIN,
      title: 'Platform Super Administrator',
      description: 'Supreme authority with unrestricted access to all multi-tenant operations, billing, overrides, and raw audits.',
      badge: 'bg-red-500/20 text-red-400 border-red-500/30',
      permCount: 'ALL (35/35)',
    },
    {
      role: PlatformAdminRole.PLATFORM_ADMIN,
      title: 'Platform Administrator',
      description: 'Full operational and support capabilities with restricted root-secret and master override restrictions.',
      badge: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
      permCount: '33/35',
    },
    {
      role: PlatformAdminRole.PLATFORM_SUPPORT,
      title: 'Support Specialist',
      description: 'Tenant case resolution, studio status lookup, user verification, and non-destructive incident logging.',
      badge: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
      permCount: '9/35',
    },
    {
      role: PlatformAdminRole.PLATFORM_FINANCE,
      title: 'Finance & Revenue Controller',
      description: 'Subscription invoicing, plan tier adjustments, MRR/ARR analytics, and payout audits.',
      badge: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
      permCount: '8/35',
    },
    {
      role: PlatformAdminRole.PLATFORM_OPERATIONS,
      title: 'SRE & Infrastructure Ops',
      description: 'Background workers, GPU pipeline queues, storage clusters, email deliverability, and SEV incident triage.',
      badge: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
      permCount: '15/35',
    },
    {
      role: PlatformAdminRole.PLATFORM_SECURITY,
      title: 'Security & Compliance Officer',
      description: 'Audit logs analysis, rogue user suspension, intrusion alerts, and security setting inspections.',
      badge: 'bg-rose-500/20 text-rose-400 border-rose-500/30',
      permCount: '12/35',
    },
    {
      role: PlatformAdminRole.PLATFORM_ANALYST,
      title: 'Data & Growth Analyst',
      description: 'Read-only business analytics, cohort retention curves, and platform usage aggregation.',
      badge: 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30',
      permCount: '9/35',
    },
    {
      role: PlatformAdminRole.PLATFORM_VIEWER,
      title: 'Read-Only Platform Observer',
      description: 'Auditing and executive telemetry viewer with strictly no mutation permissions.',
      badge: 'bg-gray-500/20 text-gray-400 border-gray-500/30',
      permCount: '6/35',
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2.5">
            <ShieldCheck className="h-6 w-6 text-amber-400" /> Platform Security & Access Governance
          </h1>
          <p className="text-xs text-muted mt-1">
            Granular Role-Based Access Control (RBAC), multi-tenant isolation guardrails, and secret redaction enforcement.
          </p>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-card-border pb-3">
        <button
          onClick={() => setActiveTab('ROLES')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition ${
            activeTab === 'ROLES'
              ? 'bg-amber-500 text-black shadow-lg shadow-amber-500/20'
              : 'bg-[#0E1422] text-muted hover:text-white border border-card-border'
          }`}
        >
          Admin Roles Matrix ({roles.length})
        </button>
        <button
          onClick={() => setActiveTab('POLICIES')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition ${
            activeTab === 'POLICIES'
              ? 'bg-amber-500 text-black shadow-lg shadow-amber-500/20'
              : 'bg-[#0E1422] text-muted hover:text-white border border-card-border'
          }`}
        >
          Security Policies & Isolation
        </button>
      </div>

      {/* Role Matrix Content */}
      {activeTab === 'ROLES' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {roles.map((r) => (
            <div
              key={r.role}
              className="p-5 rounded-2xl bg-[#0E1422] border border-card-border flex flex-col justify-between space-y-3"
            >
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className={`text-xs font-mono font-bold px-2.5 py-0.5 rounded border ${r.badge}`}>
                    {r.role}
                  </span>
                  <span className="text-[11px] font-mono font-bold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded">
                    {r.permCount}
                  </span>
                </div>
                <h3 className="text-sm font-bold text-white pt-1">{r.title}</h3>
                <p className="text-xs text-muted leading-relaxed">{r.description}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Security Policies */}
      {activeTab === 'POLICIES' && (
        <div className="space-y-4">
          <div className="p-5 rounded-2xl bg-[#0E1422] border border-card-border space-y-2">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-400" /> Biometric Vector & Face Embedding Defense
            </h3>
            <p className="text-xs text-muted leading-relaxed">
              Strict isolation ensures raw 512-dimension face vectors, selfie embeddings, and client face crops are NEVER exposed in any administrative endpoint response or telemetry feed.
            </p>
          </div>

          <div className="p-5 rounded-2xl bg-[#0E1422] border border-card-border space-y-2">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-400" /> CSV Formula Injection Shielding
            </h3>
            <p className="text-xs text-muted leading-relaxed">
              All platform administrative CSV data exports sanitize cell values starting with <code className="text-amber-400 font-mono">=, +, -, @, \t, \r, \n</code> with leading single quotes to prevent remote spreadsheet code execution.
            </p>
          </div>

          <div className="p-5 rounded-2xl bg-[#0E1422] border border-card-border space-y-2">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-400" /> Copilot Safety & Zero Autonomous Administrative Mutation
            </h3>
            <p className="text-xs text-muted leading-relaxed">
              Platform Copilot AI is strictly restricted to read-only diagnostics and draft composition. All destructive operations (suspending studios, mutating feature flags, deleting user records) require explicit human operator confirmation.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
