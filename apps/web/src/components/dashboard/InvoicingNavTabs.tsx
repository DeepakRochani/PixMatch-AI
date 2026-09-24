'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  FileText,
  PlusCircle,
  CreditCard,
  Receipt,
  CalendarDays,
  ClockAlert,
  BellRing,
  Settings,
  Hash,
} from 'lucide-react';

const SUB_TABS = [
  { label: 'Overview', href: '/dashboard/finance/invoicing', icon: LayoutDashboard },
  { label: 'Invoices', href: '/dashboard/finance/invoicing/invoices', icon: FileText },
  { label: 'Create Invoice', href: '/dashboard/finance/invoicing/create', icon: PlusCircle },
  { label: 'Payments', href: '/dashboard/finance/invoicing/payments', icon: CreditCard },
  { label: 'Receipts', href: '/dashboard/finance/invoicing/receipts', icon: Receipt },
  { label: 'Installments', href: '/dashboard/finance/invoicing/installments', icon: CalendarDays },
  { label: 'Collections & Aging', href: '/dashboard/finance/invoicing/collections', icon: ClockAlert },
  { label: 'Reminders', href: '/dashboard/finance/invoicing/reminders', icon: BellRing },
  { label: 'Settings', href: '/dashboard/finance/invoicing/settings', icon: Settings },
  { label: 'Numbering', href: '/dashboard/finance/invoicing/numbering', icon: Hash },
];

export function InvoicingNavTabs() {
  const pathname = usePathname();

  return (
    <div className="flex items-center gap-1 bg-card/60 p-1.5 rounded-lg border border-card-border overflow-x-auto mb-6 scrollbar-none">
      {SUB_TABS.map((tab) => {
        const Icon = tab.icon;
        const isExact = pathname === tab.href;
        const isActive = isExact || (tab.href !== '/dashboard/finance/invoicing' && pathname.startsWith(tab.href));

        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-medium whitespace-nowrap transition-all ${
              isActive
                ? 'bg-primary text-primary-foreground font-semibold shadow-sm'
                : 'text-muted-foreground hover:text-foreground hover:bg-card-border/40'
            }`}
          >
            <Icon className="h-3.5 w-3.5" />
            {tab.label}
          </Link>
        );
      })}
    </div>
  );
}
