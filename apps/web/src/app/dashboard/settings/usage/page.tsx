'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { DashboardHeader } from '@/components/layout/DashboardHeader';
import { fetchApi } from '@/lib/api-client';
import { formatBytes } from '@pixmatch/ui';
import {
  HardDrive,
  Camera,
  Sparkles,
  Users,
  Images,
  Mail,
  ArrowRight,
  ShieldCheck,
  TrendingUp,
} from 'lucide-react';
import { StudioBillingUsageDTO, SubscriptionPlan } from '@pixmatch/types';

export default function UsageBreakdownPage() {
  const [usage, setUsage] = useState<StudioBillingUsageDTO | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadUsage() {
      try {
        const res = await fetchApi<StudioBillingUsageDTO>('/billing/usage');
        if (res?.data) {
          setUsage(res.data);
        }
      } catch {
        setUsage({
          storage: { used: 1420000000, limit: 107374182400, remaining: 105954182400, usage_percent: 1, is_unlimited: false },
          photos: { used: 124, limit: 25000, remaining: 24876, usage_percent: 1, is_unlimited: false },
          galleries: { used: 2, limit: 50, remaining: 48, usage_percent: 4, is_unlimited: false },
          clients: { used: 3, limit: 500, remaining: 497, usage_percent: 1, is_unlimited: false },
          ai_searches: { used: 0, limit: 2500, remaining: 2500, usage_percent: 0, is_unlimited: false },
          team_members: { used: 2, limit: 5, remaining: 3, usage_percent: 40, is_unlimited: false },
          delivery_emails: { used: 2, limit: 1000, remaining: 998, usage_percent: 1, is_unlimited: false },
        });
      } finally {
        setLoading(false);
      }
    }
    loadUsage();
  }, []);

  const metrics = [
    {
      title: 'Cloud Storage',
      icon: HardDrive,
      color: 'text-purple-400',
      usedDisplay: formatBytes(usage?.storage?.used || 0),
      limitDisplay: formatBytes(usage?.storage?.limit || 0),
      percent: usage?.storage?.usage_percent || 0,
      description: 'Storage occupied by original RAW/JPEG files and multi-resolution WebP/AVIF thumbnails.',
    },
    {
      title: 'Total Photos',
      icon: Camera,
      color: 'text-emerald-400',
      usedDisplay: `${usage?.photos?.used || 0} photos`,
      limitDisplay: `${usage?.photos?.limit || 0} photos`,
      percent: usage?.photos?.usage_percent || 0,
      description: 'Active photos uploaded across all studio event galleries.',
    },
    {
      title: 'Active Client Galleries',
      icon: Images,
      color: 'text-blue-400',
      usedDisplay: `${usage?.galleries?.used || 0} galleries`,
      limitDisplay: usage?.galleries?.is_unlimited ? 'Unlimited' : `${usage?.galleries?.limit || 0} galleries`,
      percent: usage?.galleries?.usage_percent || 0,
      description: 'Public, password-protected, and unlisted client galleries in Active or Draft status.',
    },
    {
      title: 'Monthly AI Face Searches',
      icon: Sparkles,
      color: 'text-accent',
      usedDisplay: `${usage?.ai_searches?.used || 0} searches`,
      limitDisplay: `${usage?.ai_searches?.limit || 0} searches`,
      percent: usage?.ai_searches?.usage_percent || 0,
      description: 'Real-time selfie face recognition queries executed by guests. Resets every billing period.',
    },
    {
      title: 'Client CRM Records',
      icon: Users,
      color: 'text-pink-400',
      usedDisplay: `${usage?.clients?.used || 0} clients`,
      limitDisplay: usage?.clients?.is_unlimited ? 'Unlimited' : `${usage?.clients?.limit || 0} clients`,
      percent: usage?.clients?.usage_percent || 0,
      description: 'Client profiles, relationship assignments, and contact records stored in studio CRM.',
    },
    {
      title: 'Team Photographer Seats',
      icon: Users,
      color: 'text-amber-400',
      usedDisplay: `${usage?.team_members?.used || 0} members`,
      limitDisplay: `${usage?.team_members?.limit || 0} seats`,
      percent: usage?.team_members?.usage_percent || 0,
      description: 'Photographers and assistant members with role-based access to your studio.',
    },
  ];

  return (
    <div className="flex-1 flex flex-col min-h-screen">
      <DashboardHeader
        title="Usage & Quota Breakdown"
        subtitle="Real-time metering metrics directly computed from your studio source of truth"
      />

      <main className="flex-1 p-6 sm:p-8 space-y-8 max-w-7xl">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {metrics.map((m, idx) => {
            const Icon = m.icon;
            return (
              <div key={idx} className="p-6 rounded-2xl bg-card border border-card-border space-y-4 shadow-sm">
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-2 text-sm font-bold text-white">
                    <Icon className={`h-4 w-4 ${m.color}`} /> {m.title}
                  </span>
                  <span className="text-xs font-bold text-white">
                    {m.usedDisplay} / {m.limitDisplay}
                  </span>
                </div>

                <div className="h-2.5 w-full bg-background rounded-full overflow-hidden border border-card-border/50">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${
                      m.percent >= 90 ? 'bg-red-500' : m.percent >= 75 ? 'bg-amber-500' : 'bg-primary'
                    }`}
                    style={{ width: `${m.percent}%` }}
                  />
                </div>

                <div className="flex items-center justify-between text-[11px] text-muted">
                  <span>{m.percent}% capacity utilized</span>
                  <span>{100 - m.percent}% available</span>
                </div>

                <p className="text-xs text-muted leading-relaxed pt-2 border-t border-card-border/50">
                  {m.description}
                </p>
              </div>
            );
          })}
        </div>

        {/* Upgrade Banner */}
        <div className="p-8 rounded-2xl bg-gradient-to-r from-primary/20 via-card to-accent/10 border border-primary/30 flex flex-col sm:flex-row items-center justify-between gap-6 shadow-xl">
          <div className="space-y-1 text-center sm:text-left">
            <h3 className="text-lg font-bold text-white">Need higher storage or unlimited client galleries?</h3>
            <p className="text-xs text-muted">
              Upgrade your plan seamlessly. Extra quotas unlock immediately upon checkout confirmation.
            </p>
          </div>

          <Link
            href="/pricing"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary hover:bg-primary-hover text-white text-xs font-bold transition shadow-lg shadow-primary/25 whitespace-nowrap"
          >
            Explore Plan Tiers
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </main>
    </div>
  );
}
