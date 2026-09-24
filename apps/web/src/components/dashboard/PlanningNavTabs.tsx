'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Compass,
  Target,
  BarChart3,
  TrendingUp,
  Sliders,
  FileSpreadsheet,
  CheckCircle2,
  Calendar,
} from 'lucide-react';

export function PlanningNavTabs() {
  const pathname = usePathname();

  const tabs = [
    {
      label: 'Overview & Health',
      href: '/dashboard/planning',
      icon: Compass,
      exact: true,
    },
    {
      label: 'Business Plans',
      href: '/dashboard/planning/plans',
      icon: Target,
    },
    {
      label: 'Target & Variance Matrix',
      href: '/dashboard/planning/variance',
      icon: BarChart3,
    },
    {
      label: 'Forecast Alignment',
      href: '/dashboard/planning/forecast-alignment',
      icon: TrendingUp,
    },
    {
      label: 'Scenario Evaluation',
      href: '/dashboard/planning/scenarios',
      icon: Sliders,
    },
  ];

  return (
    <div className="flex items-center space-x-1 border-b border-border/40 overflow-x-auto pb-1 mb-6">
      {tabs.map((tab) => {
        const isActive = tab.exact ? pathname === tab.href : pathname?.startsWith(tab.href);
        const Icon = tab.icon;

        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium rounded-lg transition-colors whitespace-nowrap ${
              isActive
                ? 'bg-primary/10 text-primary border border-primary/20 shadow-sm'
                : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
            }`}
          >
            <Icon className="w-4 h-4" />
            <span>{tab.label}</span>
          </Link>
        );
      })}
    </div>
  );
}
