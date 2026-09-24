'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Building2,
  FileCheck,
  Tags,
  Percent,
  Package,
  Receipt,
  CheckCheck,
  Calendar,
  FileSpreadsheet,
  ShieldAlert,
  Settings,
} from 'lucide-react';

const TAX_TABS = [
  { label: 'Overview', href: '/dashboard/finance/tax', icon: LayoutDashboard },
  { label: 'Profile', href: '/dashboard/finance/tax/profile', icon: Building2 },
  { label: 'Registrations', href: '/dashboard/finance/tax/registrations', icon: FileCheck },
  { label: 'Categories', href: '/dashboard/finance/tax/categories', icon: Tags },
  { label: 'Rates (BPS)', href: '/dashboard/finance/tax/rates', icon: Percent },
  { label: 'SAC/HSN Items', href: '/dashboard/finance/tax/items', icon: Package },
  { label: 'Transactions', href: '/dashboard/finance/tax/transactions', icon: Receipt },
  { label: 'Reconciliation', href: '/dashboard/finance/tax/reconciliation', icon: CheckCheck },
  { label: 'Tax Periods', href: '/dashboard/finance/tax/periods', icon: Calendar },
  { label: 'GST Reports', href: '/dashboard/finance/tax/reports', icon: FileSpreadsheet },
  { label: 'Compliance Audit', href: '/dashboard/finance/tax/compliance', icon: ShieldAlert },
  { label: 'Settings', href: '/dashboard/finance/tax/settings', icon: Settings },
];

export function TaxNavTabs() {
  const pathname = usePathname();

  return (
    <div className="flex items-center gap-1 border-b border-card-border overflow-x-auto pb-px mb-6 scrollbar-none">
      {TAX_TABS.map((tab) => {
        const Icon = tab.icon;
        const isActive =
          tab.href === '/dashboard/finance/tax'
            ? pathname === '/dashboard/finance/tax'
            : pathname.startsWith(tab.href);

        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-t-lg text-xs font-medium whitespace-nowrap transition-all border-b-2 ${
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
