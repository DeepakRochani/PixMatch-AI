'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  ListTree,
  FileText,
  BookMarked,
  Scale,
  TrendingUp,
  Landmark,
  CalendarDays,
  Coins,
  Sliders,
} from 'lucide-react';

const ACCOUNTING_TABS = [
  { label: 'GL Overview', href: '/dashboard/finance/accounting', icon: LayoutDashboard },
  { label: 'Chart of Accounts', href: '/dashboard/finance/accounting/chart-of-accounts', icon: ListTree },
  { label: 'Journal Entries', href: '/dashboard/finance/accounting/journal-entries', icon: FileText },
  { label: 'General Ledger', href: '/dashboard/finance/accounting/ledger', icon: BookMarked },
  { label: 'Trial Balance', href: '/dashboard/finance/accounting/trial-balance', icon: Scale },
  { label: 'Profit & Loss', href: '/dashboard/finance/accounting/profit-loss', icon: TrendingUp },
  { label: 'Balance Sheet', href: '/dashboard/finance/accounting/balance-sheet', icon: Landmark },
  { label: 'Accounting Periods', href: '/dashboard/finance/accounting/periods', icon: CalendarDays },
  { label: 'Opening Balances', href: '/dashboard/finance/accounting/opening-balances', icon: Coins },
  { label: 'Account Mappings', href: '/dashboard/finance/accounting/mappings', icon: Sliders },
];

export function AccountingNavTabs() {
  const pathname = usePathname();

  return (
    <div className="flex items-center gap-1.5 border-b border-card-border/60 overflow-x-auto pb-px mb-6 scrollbar-none bg-surface-dark/40 p-1.5 rounded-lg">
      {ACCOUNTING_TABS.map((tab) => {
        const Icon = tab.icon;
        const isActive =
          tab.href === '/dashboard/finance/accounting'
            ? pathname === '/dashboard/finance/accounting'
            : pathname.startsWith(tab.href);

        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium whitespace-nowrap transition-all ${
              isActive
                ? 'bg-primary text-white font-semibold shadow-sm shadow-primary/20'
                : 'text-muted hover:text-white hover:bg-card-border/40'
            }`}
          >
            <Icon className={`h-3.5 w-3.5 ${isActive ? 'text-white' : 'text-muted'}`} />
            {tab.label}
          </Link>
        );
      })}
    </div>
  );
}
