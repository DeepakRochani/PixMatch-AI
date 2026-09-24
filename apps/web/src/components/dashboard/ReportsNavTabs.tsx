'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  TrendingUp,
  Scale,
  BookOpen,
  DollarSign,
  Receipt,
  FileSpreadsheet,
  CheckCheck,
  Award,
  Sparkles,
  Lock,
  Download,
  Calendar,
  Layers,
  ArrowDownLeft,
  ArrowUpRight,
} from 'lucide-react';

const REPORT_TABS = [
  { label: 'Overview Hub', href: '/dashboard/finance/reports', icon: LayoutDashboard, exact: true },
  { label: 'Profit & Loss', href: '/dashboard/finance/reports/profit-loss', icon: TrendingUp },
  { label: 'Balance Sheet', href: '/dashboard/finance/reports/balance-sheet', icon: Scale },
  { label: 'Trial Balance', href: '/dashboard/finance/reports/trial-balance', icon: BookOpen },
  { label: 'Cash Flow', href: '/dashboard/finance/reports/cash-flow', icon: DollarSign },
  { label: 'General Ledger', href: '/dashboard/finance/reports/general-ledger', icon: Layers },
  { label: 'AR Aging', href: '/dashboard/finance/reports/ar-aging', icon: ArrowDownLeft },
  { label: 'AP Aging', href: '/dashboard/finance/reports/ap-aging', icon: ArrowUpRight },
  { label: 'Revenue & Expenses', href: '/dashboard/finance/reports/revenue', icon: Receipt },
  { label: 'Tax & GST Summary', href: '/dashboard/finance/reports/tax', icon: Scale },
  { label: 'Reconciliation', href: '/dashboard/finance/reports/reconciliation', icon: CheckCheck },
  { label: 'Project Profitability', href: '/dashboard/finance/reports/project-profitability', icon: Award },
  { label: 'Month-End Close', href: '/dashboard/finance/reports/month-end-close', icon: Lock },
  { label: 'Intelligence & Insights', href: '/dashboard/finance/reports/insights', icon: Sparkles },
  { label: 'Exports & Schedules', href: '/dashboard/finance/reports/exports', icon: Download },
];

export function ReportsNavTabs() {
  const pathname = usePathname();

  return (
    <div className="flex items-center gap-1.5 border-b border-card-border overflow-x-auto pb-px mb-6 scrollbar-none">
      {REPORT_TABS.map((tab) => {
        const Icon = tab.icon;
        const isActive = tab.exact
          ? pathname === tab.href
          : pathname === tab.href || pathname.startsWith(tab.href + '/');

        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-t-lg text-xs font-medium whitespace-nowrap transition-all border-b-2 ${
              isActive
                ? 'border-cyan-400 text-cyan-400 bg-cyan-400/10 font-semibold shadow-sm'
                : 'border-transparent text-muted hover:text-white hover:bg-card-border/30'
            }`}
          >
            <Icon className={`h-3.5 w-3.5 ${isActive ? 'text-cyan-400' : 'text-muted'}`} />
            {tab.label}
          </Link>
        );
      })}
    </div>
  );
}
