'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Rocket,
  UserCheck,
  Megaphone,
  Layers,
  BarChart3,
  PlusCircle,
} from 'lucide-react';

export function GrowthNavTabs() {
  const pathname = usePathname();

  const tabs = [
    { label: 'Growth Center', href: '/dashboard/growth', icon: Rocket, exact: true },
    { label: 'Reactivation Hub', href: '/dashboard/growth/reactivation', icon: UserCheck },
    { label: 'Campaigns', href: '/dashboard/growth/campaigns', icon: Megaphone },
    { label: 'Services & Seasonal', href: '/dashboard/growth/services', icon: Layers },
    { label: 'Performance & ROI', href: '/dashboard/growth/performance', icon: BarChart3 },
  ];

  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-card-border pb-4 mb-6">
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = tab.exact
            ? pathname === tab.href
            : pathname === tab.href || pathname.startsWith(tab.href + '/');

          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
                isActive
                  ? 'bg-primary text-white shadow-sm shadow-primary/30'
                  : 'text-muted hover:text-white hover:bg-card-border/40'
              }`}
            >
              <Icon className={`h-4 w-4 ${isActive ? 'text-white' : 'text-muted'}`} />
              {tab.label}
            </Link>
          );
        })}
      </div>

      <div className="flex items-center gap-2.5">
        <Link
          href="/dashboard/growth/campaigns/new"
          className="flex items-center gap-2 px-3.5 py-2 bg-gradient-to-r from-primary to-accent hover:from-primary/90 hover:to-accent/90 text-white text-xs font-bold rounded-lg shadow-sm shadow-primary/20 transition-all"
        >
          <PlusCircle className="h-4 w-4" />
          Create Campaign
        </Link>
      </div>
    </div>
  );
}
