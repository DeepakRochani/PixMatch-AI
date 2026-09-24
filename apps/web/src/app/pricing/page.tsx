'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';
import {
  CheckCircle2,
  Sparkles,
  Zap,
  ShieldCheck,
  HardDrive,
  Users,
  Camera,
  ArrowRight,
  HelpCircle,
} from 'lucide-react';
import { SubscriptionPlan, BillingInterval } from '@pixmatch/types';
import { useAuth } from '@/lib/auth-context';

export default function PricingPage() {
  const { user } = useAuth();
  const [interval, setInterval] = useState<BillingInterval>(BillingInterval.MONTHLY);
  const [currency, setCurrency] = useState<'INR' | 'USD'>('INR');

  const plans = [
    {
      id: SubscriptionPlan.FREE,
      name: 'Free Trial',
      description: 'Test out PixMatch AI photo delivery and face search matching.',
      priceMonthly: currency === 'INR' ? '₹0' : '$0',
      priceYearly: currency === 'INR' ? '₹0' : '$0',
      period: 'forever',
      limits: [
        '3 Active Client Galleries',
        '500 Photos Total',
        '2 GB Cloud Storage',
        '50 AI Face Searches / mo',
        '1 Team Member (Owner)',
      ],
      features: [
        'Client Gallery & PIN Lock',
        'AI Face Recognition Search',
        'Digital ZIP Downloads',
        'Email Gallery Invitations',
      ],
      cta: user ? 'Current Free Tier' : 'Get Started Free',
      href: user ? '/dashboard/subscription' : '/register',
      popular: false,
    },
    {
      id: SubscriptionPlan.STARTER,
      name: 'Starter',
      description: 'Ideal for freelance photographers delivering regular client events.',
      priceMonthly: currency === 'INR' ? '₹999' : '$15',
      priceYearly: currency === 'INR' ? '₹9,990' : '$150',
      period: interval === BillingInterval.YEARLY ? '/year' : '/month',
      limits: [
        '15 Active Client Galleries',
        '5,000 Photos Total',
        '25 GB Cloud Storage',
        '500 AI Face Searches / mo',
        '2 Team Members',
      ],
      features: [
        'Everything in Free, plus:',
        'Custom Studio Branding & Logo',
        'Client CRM & Activity Timeline',
        'Original Full-Res Downloads',
        'S3 & Cloudflare R2 Connections',
      ],
      cta: 'Upgrade to Starter',
      href: user ? `/dashboard/subscription?plan=STARTER&interval=${interval}` : '/register',
      popular: false,
    },
    {
      id: SubscriptionPlan.PRO,
      name: 'Professional',
      description: 'Our most popular tier for high-volume wedding & portrait studios.',
      priceMonthly: currency === 'INR' ? '₹2,499' : '$35',
      priceYearly: currency === 'INR' ? '₹24,990' : '$350',
      period: interval === BillingInterval.YEARLY ? '/year' : '/month',
      badge: 'Most Popular',
      popular: true,
      limits: [
        '50 Active Client Galleries',
        '25,000 Photos Total',
        '100 GB Cloud Storage',
        '2,500 AI Face Searches / mo',
        '5 Team Members',
      ],
      features: [
        'Everything in Starter, plus:',
        'Advanced Analytics & Funnels',
        'Custom Domain Support',
        'Multi-Cloud Storage Connections',
        'Bulk Export & Watermark Presets',
        'REST API & Webhooks Access',
      ],
      cta: 'Get Professional',
      href: user ? `/dashboard/subscription?plan=PRO&interval=${interval}` : '/register',
    },
    {
      id: SubscriptionPlan.STUDIO,
      name: 'Studio Enterprise',
      description: 'Uncapped creative delivery for multi-shooter production houses.',
      priceMonthly: currency === 'INR' ? '₹5,999' : '$89',
      priceYearly: currency === 'INR' ? '₹59,990' : '$890',
      period: interval === BillingInterval.YEARLY ? '/year' : '/month',
      limits: [
        'Unlimited Active Galleries',
        '100,000 Photos Total',
        '500 GB Cloud Storage',
        '10,000 AI Face Searches / mo',
        '15 Team Members',
      ],
      features: [
        'Everything in Professional, plus:',
        'Unlimited Client CRM Profiles',
        '1 TB Monthly Bandwidth',
        'Priority Facial Indexing Queue',
        'Dedicated VIP Account Support',
      ],
      cta: 'Upgrade to Studio',
      href: user ? `/dashboard/subscription?plan=STUDIO&interval=${interval}` : '/register',
      popular: false,
    },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navbar />

      <main className="flex-1 py-16 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto w-full space-y-12">
        {/* Header */}
        <div className="text-center space-y-4 max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-xs font-semibold text-primary">
            <Sparkles className="h-3.5 w-3.5" />
            Transparent, Studio-Friendly Plans
          </div>
          <h1 className="text-3xl sm:text-5xl font-extrabold text-white tracking-tight">
            Simple pricing for ambitious photographers
          </h1>
          <p className="text-base text-muted">
            All plans include AI-powered face search, high-speed CDN delivery, and non-destructive plan upgrades.
          </p>

          {/* Toggle Controls: Interval & Currency */}
          <div className="pt-6 flex flex-wrap items-center justify-center gap-4">
            {/* Monthly / Yearly Toggle */}
            <div className="inline-flex items-center p-1 rounded-xl bg-card border border-card-border">
              <button
                type="button"
                onClick={() => setInterval(BillingInterval.MONTHLY)}
                className={`px-4 py-2 rounded-lg text-xs font-semibold transition ${
                  interval === BillingInterval.MONTHLY
                    ? 'bg-primary text-white shadow-sm'
                    : 'text-muted hover:text-white'
                }`}
              >
                Monthly Billing
              </button>
              <button
                type="button"
                onClick={() => setInterval(BillingInterval.YEARLY)}
                className={`px-4 py-2 rounded-lg text-xs font-semibold transition flex items-center gap-1.5 ${
                  interval === BillingInterval.YEARLY
                    ? 'bg-primary text-white shadow-sm'
                    : 'text-muted hover:text-white'
                }`}
              >
                Yearly Billing
                <span className="px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-400 text-[10px] font-bold">
                  2 Months Free
                </span>
              </button>
            </div>

            {/* Currency Switcher */}
            <div className="inline-flex items-center p-1 rounded-xl bg-card border border-card-border">
              <button
                type="button"
                onClick={() => setCurrency('INR')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                  currency === 'INR' ? 'bg-primary/20 text-primary border border-primary/30' : 'text-muted hover:text-white'
                }`}
              >
                ₹ INR
              </button>
              <button
                type="button"
                onClick={() => setCurrency('USD')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                  currency === 'USD' ? 'bg-primary/20 text-primary border border-primary/30' : 'text-muted hover:text-white'
                }`}
              >
                $ USD
              </button>
            </div>
          </div>
        </div>

        {/* Pricing Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 pt-6">
          {plans.map((p) => (
            <div
              key={p.id}
              className={`rounded-2xl p-6 sm:p-7 flex flex-col justify-between relative transition-all duration-200 ${
                p.popular
                  ? 'bg-card border-2 border-primary shadow-2xl shadow-primary/10 ring-1 ring-primary/40'
                  : 'bg-card border border-card-border hover:border-card-border/80'
              }`}
            >
              {p.badge && (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 rounded-full bg-primary text-white text-[11px] font-bold tracking-wide shadow-md">
                  {p.badge}
                </span>
              )}

              <div className="space-y-4">
                <div>
                  <h3 className="text-lg font-bold text-white">{p.name}</h3>
                  <p className="text-xs text-muted mt-1 leading-relaxed">{p.description}</p>
                </div>

                <div className="flex items-baseline gap-1 pt-2">
                  <span className="text-3xl sm:text-4xl font-extrabold text-white">
                    {interval === BillingInterval.YEARLY ? p.priceYearly : p.priceMonthly}
                  </span>
                  <span className="text-xs text-muted font-medium">{p.period}</span>
                </div>

                {/* Limits Section */}
                <div className="pt-4 border-t border-card-border space-y-2">
                  <p className="text-[11px] font-bold uppercase tracking-wider text-muted">Plan Quotas</p>
                  <ul className="space-y-1.5 text-xs text-slate-300">
                    {p.limits.map((l, idx) => (
                      <li key={idx} className="flex items-center gap-2">
                        <CheckCircle2 className="h-3.5 w-3.5 text-primary flex-shrink-0" />
                        <span>{l}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Features Section */}
                <div className="pt-3 border-t border-card-border space-y-2">
                  <p className="text-[11px] font-bold uppercase tracking-wider text-muted">Included Features</p>
                  <ul className="space-y-1.5 text-xs text-slate-300">
                    {p.features.map((f, idx) => (
                      <li key={idx} className="flex items-center gap-2">
                        <Sparkles className="h-3.5 w-3.5 text-accent flex-shrink-0" />
                        <span>{f}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              {/* Action Button */}
              <div className="pt-6 mt-6 border-t border-card-border">
                <Link
                  href={p.href}
                  className={`w-full inline-flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-xs font-bold transition shadow-sm ${
                    p.popular
                      ? 'bg-primary hover:bg-primary-hover text-white shadow-primary/20'
                      : 'bg-background hover:bg-card-border text-white border border-card-border'
                  }`}
                >
                  {p.cta}
                  <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </div>
            </div>
          ))}
        </div>

        {/* FAQ Section */}
        <section className="pt-16 border-t border-card-border/60 max-w-4xl mx-auto space-y-8">
          <div className="text-center space-y-2">
            <h2 className="text-2xl font-bold text-white">Frequently Asked Questions</h2>
            <p className="text-xs text-muted">Everything you need to know about our billing and plan policies.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-left">
            <div className="p-5 rounded-xl bg-card border border-card-border space-y-2">
              <h4 className="text-sm font-bold text-white flex items-center gap-2">
                <HelpCircle className="h-4 w-4 text-primary" /> What happens if I downgrade?
              </h4>
              <p className="text-xs text-muted leading-relaxed">
                We enforce a <strong>strict non-destructive policy</strong>. All existing photos, galleries, and client records remain completely safe. You simply cannot upload new photos until usage is within quota.
              </p>
            </div>

            <div className="p-5 rounded-xl bg-card border border-card-border space-y-2">
              <h4 className="text-sm font-bold text-white flex items-center gap-2">
                <HelpCircle className="h-4 w-4 text-primary" /> How does AI Face Search metering work?
              </h4>
              <p className="text-xs text-muted leading-relaxed">
                Only successful, valid selfie searches initiated by your clients count towards your monthly quota. Indexing photos when you upload is included without extra search charges.
              </p>
            </div>

            <div className="p-5 rounded-xl bg-card border border-card-border space-y-2">
              <h4 className="text-sm font-bold text-white flex items-center gap-2">
                <HelpCircle className="h-4 w-4 text-primary" /> Can I cancel anytime?
              </h4>
              <p className="text-xs text-muted leading-relaxed">
                Yes! When you cancel, you retain full access until the end of your billing cycle. After that, your account transitions to the Free plan while preserving your client data.
              </p>
            </div>

            <div className="p-5 rounded-xl bg-card border border-card-border space-y-2">
              <h4 className="text-sm font-bold text-white flex items-center gap-2">
                <HelpCircle className="h-4 w-4 text-primary" /> Which payment methods are accepted?
              </h4>
              <p className="text-xs text-muted leading-relaxed">
                We accept UPI, NetBanking, and all major Debit/Credit Cards in INR via Stripe, as well as international cards in USD.
              </p>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
