'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Images,
  Users,
  HardDrive,
  Cpu,
  BarChart3,
  CreditCard,
  Settings,
  Camera,
  LogOut,
  ExternalLink,
  ShieldAlert,
  Sparkles,
  Zap,
  TrendingUp,
  Rocket,
  FolderKanban,
  MessageSquare,
  UserCheck,
  DollarSign,
} from 'lucide-react';
import { useAuth } from '@/lib/auth-context';

const NAV_ITEMS = [
  { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { label: 'AI Copilot', href: '/dashboard/copilot', icon: Sparkles },
  { label: 'Automations', href: '/dashboard/automation', icon: Zap },
  { label: 'Communications', href: '/dashboard/communications', icon: MessageSquare },
  { label: 'Operations & Booking', href: '/dashboard/operations', icon: FolderKanban },
  { label: 'Team & Workforce', href: '/dashboard/team', icon: UserCheck },
  { label: 'Finance & Profitability', href: '/dashboard/finance', icon: DollarSign },
  { label: 'Galleries', href: '/dashboard/galleries', icon: Images },
  { label: 'Clients', href: '/dashboard/clients', icon: Users },
  { label: 'Business', href: '/dashboard/business', icon: TrendingUp },
  { label: 'Growth & Marketing', href: '/dashboard/growth', icon: Rocket },
  { label: 'Storage', href: '/dashboard/storage', icon: HardDrive },
  { label: 'Processing', href: '/dashboard/processing', icon: Cpu },
  { label: 'Analytics', href: '/dashboard/analytics', icon: BarChart3 },
  { label: 'Subscription', href: '/dashboard/subscription', icon: CreditCard },
  { label: 'Settings', href: '/dashboard/settings', icon: Settings },
];


export function DashboardSidebar() {
  const pathname = usePathname();
  const { user, studio, logout } = useAuth();

  return (
    <aside className="w-64 flex-shrink-0 border-r border-card-border bg-card flex flex-col justify-between hidden md:flex h-screen sticky top-0">
      <div>
        {/* Studio Branding */}
        <div className="p-6 border-b border-card-border flex items-center justify-between">
          <Link href="/dashboard" className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-tr from-primary to-accent text-white shadow-md shadow-primary/20">
              <Camera className="h-5 w-5" />
            </div>
            <div>
              <h2 className="font-semibold text-sm text-white tracking-tight line-clamp-1">
                {studio?.name || 'Studio Dashboard'}
              </h2>
              <p className="text-[11px] text-muted font-medium uppercase tracking-wider">
                PixMatch Studio
              </p>
            </div>
          </Link>
        </div>

        {/* Navigation */}
        <nav className="p-4 space-y-1.5">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href));

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-sm font-medium transition-all ${
                  isActive
                    ? 'bg-primary text-white shadow-sm shadow-primary/30 font-semibold'
                    : 'text-muted hover:text-white hover:bg-card-border/40'
                }`}
              >
                <Icon className={`h-4 w-4 ${isActive ? 'text-white' : 'text-muted'}`} />
                {item.label}
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Footer / Client Gallery Link & Logout */}
      <div className="p-4 border-t border-card-border space-y-2">
        {user?.role === 'SUPER_ADMIN' && (
          <Link
            href="/dashboard/admin"
            className="flex items-center justify-between px-3 py-2 text-xs font-semibold text-amber-300 bg-amber-500/10 border border-amber-500/20 hover:bg-amber-500/20 rounded-lg transition"
          >
            <span className="flex items-center gap-2">
              <ShieldAlert className="h-3.5 w-3.5 text-amber-400" /> Super Admin Control
            </span>
            <ExternalLink className="h-3 w-3 text-amber-400" />
          </Link>
        )}

        <Link
          href="/gallery/sophia-and-liam-wedding"
          target="_blank"
          className="flex items-center justify-between px-3 py-2 text-xs font-medium text-muted hover:text-accent hover:bg-card-border/30 rounded-lg transition"
        >
          <span className="flex items-center gap-2">
            <Images className="h-3.5 w-3.5" /> Client Portal View
          </span>
          <ExternalLink className="h-3 w-3" />
        </Link>

        <button
          onClick={logout}
          className="w-full flex items-center gap-3 px-3 py-2 text-xs font-medium text-red-400 hover:bg-red-500/10 rounded-lg transition"
        >
          <LogOut className="h-3.5 w-3.5" />
          Sign Out
        </button>
      </div>
    </aside>
  );
}
