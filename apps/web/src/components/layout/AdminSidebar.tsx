'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Building2,
  Users,
  CreditCard,
  Layers,
  TrendingUp,
  HardDrive,
  Cpu,
  Sparkles,
  ListRestart,
  Activity,
  Mail,
  ShieldAlert,
  ArrowLeft,
  LogOut,
  UserCheck,
  Zap,
  Flag,
  Settings,
  AlertTriangle,
  Flame,
  LifeBuoy,
  BarChart3,
  ShieldCheck,
  BellRing,
  Rocket,
  Sliders,
  GitPullRequest,
} from 'lucide-react';
import { useAuth } from '@/lib/auth-context';

interface NavGroup {
  title: string;
  items: {
    label: string;
    href: string;
    icon: any;
  }[];
}

const ADMIN_NAVIGATION: NavGroup[] = [
  {
    title: 'OVERVIEW',
    items: [
      { label: 'Control Center', href: '/dashboard/admin', icon: LayoutDashboard },
      { label: 'Platform Analytics', href: '/dashboard/admin/analytics', icon: BarChart3 },
    ],
  },
  {
    title: 'PLATFORM & TENANTS',
    items: [
      { label: 'Studios', href: '/dashboard/admin/studios', icon: Building2 },
      { label: 'Users', href: '/dashboard/admin/users', icon: Users },
      { label: 'Studio Business', href: '/dashboard/admin/business', icon: TrendingUp },
      { label: 'Growth Intelligence', href: '/dashboard/admin/growth', icon: Sparkles },
      { label: 'Client Intelligence', href: '/dashboard/admin/clients/intelligence', icon: Users },
    ],
  },
  {
    title: 'GOVERNANCE & CONTROL',
    items: [
      { label: 'Feature Flags', href: '/dashboard/admin/features', icon: Flag },
      { label: 'Platform Settings', href: '/dashboard/admin/settings', icon: Settings },
      { label: 'Platform Alerts', href: '/dashboard/admin/alerts', icon: AlertTriangle },
      { label: 'Incidents & Outages', href: '/dashboard/admin/incidents', icon: Flame },
      { label: 'Support Operations', href: '/dashboard/admin/support', icon: LifeBuoy },
    ],
  },
  {
    title: 'BILLING & REVENUE',
    items: [
      { label: 'Subscriptions', href: '/dashboard/admin/subscriptions', icon: CreditCard },
      { label: 'Plans & Pricing', href: '/dashboard/admin/plans', icon: Layers },
      { label: 'Revenue Analytics', href: '/dashboard/admin/revenue', icon: TrendingUp },
    ],
  },
  {
    title: 'OPERATIONS & INFRA',
    items: [
      { label: 'Production Ops', href: '/dashboard/admin/operations', icon: Layers },
      { label: 'Usage & Quotas', href: '/dashboard/admin/usage', icon: HardDrive },
      { label: 'AI Operations', href: '/dashboard/admin/ai', icon: Sparkles },
      { label: 'Automations', href: '/dashboard/admin/automation', icon: Zap },
      { label: 'Storage Systems', href: '/dashboard/admin/storage', icon: HardDrive },
      { label: 'Background Jobs', href: '/dashboard/admin/jobs', icon: ListRestart },
      { label: 'Email Operations', href: '/dashboard/admin/email', icon: Mail },
      { label: 'System Health', href: '/dashboard/admin/system', icon: Activity },
    ],
  },
  {
    title: 'RELIABILITY & OBSERVABILITY 2.0',
    items: [
      { label: 'Reliability Center', href: '/dashboard/admin/reliability', icon: Activity },
      { label: 'Error Center', href: '/dashboard/admin/reliability/errors', icon: AlertTriangle },
      { label: 'Backups & Storage', href: '/dashboard/admin/reliability/backups', icon: HardDrive },
      { label: 'Disaster Recovery', href: '/dashboard/admin/reliability/recovery', icon: ShieldCheck },
      { label: 'Deployment Safety', href: '/dashboard/admin/reliability/deployments', icon: Cpu },
    ],
  },
  {
    title: 'DATA GOVERNANCE & PRIVACY 2.0',
    items: [
      { label: 'Privacy Center', href: '/dashboard/admin/privacy', icon: ShieldCheck },
      { label: 'Data Inventory', href: '/dashboard/admin/privacy/data-inventory', icon: HardDrive },
      { label: 'Data Lineage', href: '/dashboard/admin/privacy/lineage', icon: Layers },
      { label: 'Retention Policies', href: '/dashboard/admin/privacy/retention', icon: Activity },
      { label: 'Privacy Requests', href: '/dashboard/admin/privacy/requests', icon: UserCheck },
      { label: 'SAR Exports', href: '/dashboard/admin/privacy/exports', icon: Layers },
      { label: 'Deletion Console', href: '/dashboard/admin/privacy/deletion', icon: AlertTriangle },
      { label: 'Legal Holds', href: '/dashboard/admin/privacy/legal-holds', icon: ShieldAlert },
      { label: 'Access Reviews', href: '/dashboard/admin/privacy/access-reviews', icon: UserCheck },
      { label: 'Third-Party Providers', href: '/dashboard/admin/privacy/providers', icon: Building2 },
      { label: 'Biometrics & AI', href: '/dashboard/admin/privacy/biometrics', icon: Sparkles },
      { label: 'Consent Ledger', href: '/dashboard/admin/privacy/consent', icon: Flag },
    ],
  },
  {
    title: 'RELEASES & CONFIGURATION 2.0',
    items: [
      { label: 'Release Command Center', href: '/dashboard/admin/releases', icon: Rocket },
      { label: 'Feature Flag Catalog', href: '/dashboard/admin/releases/feature-flags', icon: Flag },
      { label: 'Platform Configuration', href: '/dashboard/admin/releases/configuration', icon: Sliders },
      { label: 'Change Requests', href: '/dashboard/admin/releases/changes', icon: GitPullRequest },
      { label: 'Multi-Environment', href: '/dashboard/admin/releases/environments', icon: Layers },
      { label: 'Configuration Drift', href: '/dashboard/admin/releases/drift', icon: AlertTriangle },
      { label: 'Release Health & SLOs', href: '/dashboard/admin/releases/health', icon: Activity },
    ],
  },
  {
    title: 'SECURITY & COMPLIANCE',
    items: [
      { label: 'Security Center (SOC)', href: '/dashboard/admin/security-center', icon: ShieldCheck },
      { label: 'Threat Events', href: '/dashboard/admin/security-center/events', icon: ShieldAlert },
      { label: 'Investigations', href: '/dashboard/admin/security-center/investigations', icon: AlertTriangle },
      { label: 'Detection Rules', href: '/dashboard/admin/security-center/rules', icon: Zap },
      { label: 'Security Timeline', href: '/dashboard/admin/security-center/timeline', icon: Activity },
      { label: 'Audit Trail', href: '/dashboard/admin/audit', icon: ShieldAlert },
      { label: 'Security & Access', href: '/dashboard/admin/security', icon: UserCheck },
    ],
  },
];

export function AdminSidebar() {
  const pathname = usePathname();
  const { user, logout } = useAuth();

  return (
    <aside className="w-64 flex-shrink-0 border-r border-card-border bg-[#0B0F17] flex flex-col justify-between hidden md:flex h-screen sticky top-0 overflow-y-auto">
      <div>
        {/* Header Branding */}
        <div className="p-5 border-b border-card-border/80 flex items-center justify-between">
          <Link href="/dashboard/admin" className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-tr from-amber-500 to-red-600 text-white shadow-lg shadow-amber-500/20 border border-amber-400/30">
              <ShieldAlert className="h-5 w-5 text-white" />
            </div>
            <div>
              <h2 className="font-bold text-sm text-white tracking-tight flex items-center gap-1.5">
                PixMatch AI
              </h2>
              <p className="text-[10px] text-amber-400 font-bold tracking-widest uppercase">
                SUPER ADMIN
              </p>
            </div>
          </Link>
        </div>

        {/* Navigation Sections */}
        <nav className="p-3 space-y-5">
          {ADMIN_NAVIGATION.map((group) => (
            <div key={group.title} className="space-y-1">
              <p className="px-3 text-[10px] font-bold text-muted/70 tracking-wider uppercase">
                {group.title}
              </p>
              <div className="space-y-0.5 pt-1">
                {group.items.map((item) => {
                  const Icon = item.icon;
                  const isActive =
                    item.href === '/dashboard/admin'
                      ? pathname === '/dashboard/admin'
                      : pathname === item.href || pathname.startsWith(item.href + '/');

                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={`flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-semibold transition-all ${
                        isActive
                          ? 'bg-amber-500/15 text-amber-300 border border-amber-500/30 shadow-sm'
                          : 'text-muted hover:text-white hover:bg-card-border/30'
                      }`}
                    >
                      <Icon
                        className={`h-4 w-4 ${
                          isActive ? 'text-amber-400' : 'text-muted group-hover:text-white'
                        }`}
                      />
                      <span>{item.label}</span>
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>
      </div>

      {/* Bottom Profile & Actions */}
      <div className="p-4 border-t border-card-border/80 bg-[#070A0F] space-y-2.5">
        <div className="flex items-center gap-3 px-2 py-1.5 rounded-lg bg-card-border/20 border border-card-border/40">
          <div className="h-7 w-7 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 flex items-center justify-center font-bold text-xs">
            {user?.name?.[0] || 'A'}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-white truncate">{user?.name || 'Super Admin'}</p>
            <p className="text-[10px] text-amber-400/90 font-mono truncate">{user?.email || 'admin@pixmatch.ai'}</p>
          </div>
        </div>

        <Link
          href="/dashboard"
          className="w-full flex items-center gap-2 px-3 py-2 text-xs font-medium text-muted hover:text-white hover:bg-card-border/40 rounded-lg transition"
        >
          <ArrowLeft className="h-3.5 w-3.5 text-muted" />
          <span>Studio Dashboard</span>
        </Link>

        <button
          onClick={logout}
          className="w-full flex items-center gap-2 px-3 py-2 text-xs font-medium text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-lg transition"
        >
          <LogOut className="h-3.5 w-3.5" />
          <span>Sign Out</span>
        </button>
      </div>
    </aside>
  );
}
