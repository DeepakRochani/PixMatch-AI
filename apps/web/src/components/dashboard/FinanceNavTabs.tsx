'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Wallet,
  Receipt,
  Building2,
  ArrowDownLeft,
  ArrowUpRight,
  PiggyBank,
  TrendingUp,
  Activity,
  CheckCheck,
  FileSpreadsheet,
  BookOpen,
  Scale,
} from 'lucide-react';

const TABS = [
  { label: 'Overview', href: '/dashboard/finance', icon: LayoutDashboard },
  { label: 'Invoicing & Payments', href: '/dashboard/finance/invoicing', icon: Receipt },
  { label: 'Accounts', href: '/dashboard/finance/accounts', icon: Wallet },
  { label: 'Expenses', href: '/dashboard/finance/expenses', icon: Receipt },
  { label: 'Vendors', href: '/dashboard/finance/vendors', icon: Building2 },
  { label: 'Receivables', href: '/dashboard/finance/receivables', icon: ArrowDownLeft },
  { label: 'Payables', href: '/dashboard/finance/payables', icon: ArrowUpRight },
  { label: 'Budgets', href: '/dashboard/finance/budgets', icon: PiggyBank },
  { label: 'Profitability', href: '/dashboard/finance/profitability', icon: TrendingUp },
  { label: 'Cash Flow', href: '/dashboard/finance/cash-flow', icon: Activity },
  { label: 'Reconciliation', href: '/dashboard/finance/reconciliation', icon: CheckCheck },
  { label: 'Reports', href: '/dashboard/finance/reports', icon: FileSpreadsheet },
  { label: 'General Ledger', href: '/dashboard/finance/accounting', icon: BookOpen },
  { label: 'Tax & GST', href: '/dashboard/finance/tax', icon: Scale },
];

export function FinanceNavTabs() {
  const pathname = usePathname();

  return (
    <div className="flex items-center gap-1 border-b border-card-border overflow-x-auto pb-px mb-6 scrollbar-none">
      {TABS.map((tab) => {
        const Icon = tab.icon;
        const isActive =
          tab.href === '/dashboard/finance'
            ? pathname === '/dashboard/finance'
            : pathname.startsWith(tab.href);

        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={`flex items-center gap-2 px-3.5 py-2.5 rounded-t-lg text-xs font-medium whitespace-nowrap transition-all border-b-2 ${
              isActive
                ? 'border-primary text-primary bg-primary/10 font-semibold'
                : 'border-transparent text-muted hover:text-white hover:bg-card-border/30'
            }`}
          >
            <Icon className={`h-3.5 w-3.5 ${isActive ? 'text-primary' : 'text-muted'}`} />
            {tab.label}
          </Link>
        );
      })}
    </div>
  );
}
