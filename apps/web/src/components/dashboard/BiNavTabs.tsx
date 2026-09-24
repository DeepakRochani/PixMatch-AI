'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  TrendingUp,
  Sliders,
  Users,
  AlertTriangle,
  FileText,
  Target,
  Sparkles,
} from 'lucide-react';

interface BiNavTabsProps {
  activeTab?: string;
}

export function BiNavTabs({ activeTab }: BiNavTabsProps) {
  const pathname = usePathname();

  const tabs = [
    {
      name: 'Executive Overview',
      href: '/dashboard/business-intelligence',
      icon: LayoutDashboard,
      active: pathname === '/dashboard/business-intelligence' || activeTab === 'overview',
    },
    {
      name: 'Management Reports',
      href: '/dashboard/business-intelligence/reports',
      icon: FileText,
      active: pathname.startsWith('/dashboard/business-intelligence/reports') || activeTab === 'reports',
    },
  ];

  return (
    <div className="border-b border-gray-200 dark:border-gray-800 mb-6">
      <nav className="-mb-px flex space-x-6 overflow-x-auto" aria-label="Tabs">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <Link
              key={tab.name}
              href={tab.href}
              className={`whitespace-nowrap py-3 px-1 border-b-2 font-medium text-sm flex items-center gap-2 transition-colors ${
                tab.active
                  ? 'border-indigo-500 text-indigo-600 dark:text-indigo-400 dark:border-indigo-400'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-200'
              }`}
            >
              <Icon className="w-4 h-4" />
              {tab.name}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
