'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Receipt,
  Gauge,
  Users,
  PieChart,
  Target,
  TrendingUp,
  Sparkles,
} from 'lucide-react';

const TABS = [
  { label: 'Overview', href: '/dashboard/business', icon: LayoutDashboard },
  { label: 'Transactions & Revenue', href: '/dashboard/business/revenue', icon: Receipt },
  { label: 'Performance', href: '/dashboard/business/performance', icon: Gauge },
  { label: 'Client Value', href: '/dashboard/business/clients', icon: Users },
  { label: 'Profitability', href: '/dashboard/business/profitability', icon: PieChart },
  { label: 'Goals', href: '/dashboard/business/goals', icon: Target },
  { label: 'Forecast', href: '/dashboard/business/forecast', icon: TrendingUp },
  { label: 'Insights', href: '/dashboard/business/insights', icon: Sparkles },
];

export function BusinessNavTabs() {
  const pathname = usePathname();

  return (
    <div className="flex items-center gap-1 border-b border-card-border overflow-x-auto pb-px mb-6 scrollbar-none">
      {TABS.map((tab) => {
        const Icon = tab.icon;
        const isActive =
          tab.href === '/dashboard/business'
            ? pathname === '/dashboard/business'
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
