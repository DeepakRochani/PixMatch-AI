'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  FolderKanban,
  UserPlus,
  Briefcase,
  CheckSquare,
  Calendar,
  PlusCircle,
  FileText,
  FileSignature,
} from 'lucide-react';

export function OperationsNavTabs() {
  const pathname = usePathname();

  const tabs = [
    { label: 'Overview', href: '/dashboard/operations', icon: FolderKanban, exact: true },
    { label: 'Production Kanban', href: '/dashboard/operations/production', icon: FolderKanban },
    { label: 'Leads Pipeline', href: '/dashboard/operations/leads', icon: UserPlus },
    { label: 'Proposals', href: '/dashboard/operations/proposals', icon: FileText },
    { label: 'Contracts', href: '/dashboard/operations/contracts', icon: FileSignature },
    { label: 'Projects & Shoots', href: '/dashboard/operations/projects', icon: Briefcase },
    { label: 'Tasks', href: '/dashboard/operations/tasks', icon: CheckSquare },
    { label: 'Calendar', href: '/dashboard/operations/calendar', icon: Calendar },
    { label: 'Availability', href: '/dashboard/operations/availability', icon: Calendar },
    { label: 'Resources', href: '/dashboard/operations/resources', icon: Briefcase },
    { label: 'Booking Types', href: '/dashboard/operations/booking-types', icon: FileText },
    { label: 'Booking Links', href: '/dashboard/operations/booking-links', icon: PlusCircle },
    { label: 'Requests', href: '/dashboard/operations/booking-requests', icon: UserPlus },
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
          href="/dashboard/operations/leads?action=new"
          className="flex items-center gap-2 px-3.5 py-2 bg-card-border/60 hover:bg-card-border text-white text-xs font-semibold rounded-lg border border-card-border transition-all"
        >
          <UserPlus className="h-3.5 w-3.5 text-primary" />
          New Inquiry
        </Link>
        <Link
          href="/dashboard/operations/projects?action=new"
          className="flex items-center gap-2 px-3.5 py-2 bg-gradient-to-r from-primary to-accent hover:from-primary/90 hover:to-accent/90 text-white text-xs font-bold rounded-lg shadow-sm shadow-primary/20 transition-all"
        >
          <PlusCircle className="h-4 w-4" />
          Book Project
        </Link>
      </div>
    </div>
  );
}
