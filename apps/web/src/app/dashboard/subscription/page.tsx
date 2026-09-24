'use client';

import React, { useState, useEffect } from 'react';
import { DashboardHeader } from '@/components/layout/DashboardHeader';
import { fetchApi } from '@/lib/api-client';
import { formatBytes } from '@pixmatch/ui';
import {
  CreditCard,
  CheckCircle2,
  AlertTriangle,
  HardDrive,
  Camera,
  Sparkles,
  Users,
  Images,
  Mail,
  ExternalLink,
  ArrowUpRight,
  RefreshCw,
  XCircle,
  HelpCircle,
  Clock,
  DownloadCloud,
} from 'lucide-react';
import {
  SubscriptionPlan,
  SubscriptionStatus,
  BillingInterval,
  SubscriptionDTO,
  PlanDefinitionDTO,
  StudioBillingUsageDTO,
  InvoiceDTO,
} from '@pixmatch/types';

export default function SubscriptionPage() {
  const [loading, setLoading] = useState(true);
  const [subscription, setSubscription] = useState<SubscriptionDTO | null>(null);
  const [planDef, setPlanDef] = useState<PlanDefinitionDTO | null>(null);
  const [usage, setUsage] = useState<StudioBillingUsageDTO | null>(null);
  const [invoices, setInvoices] = useState<InvoiceDTO[]>([]);
  const [actionLoading, setActionLoading] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [selectedPlanForChange, setSelectedPlanForChange] = useState<SubscriptionPlan>(SubscriptionPlan.PRO);
  const [feedbackMessage, setFeedbackMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const loadBillingData = async () => {
    try {
      setLoading(true);
      const [subRes, invRes] = await Promise.all([
        fetchApi<{ subscription: SubscriptionDTO; plan: PlanDefinitionDTO; usage: StudioBillingUsageDTO }>('/billing/subscription'),
        fetchApi<InvoiceDTO[]>('/billing/invoices'),
      ]);

      if (subRes?.data) {
        setSubscription(subRes.data.subscription);
        setPlanDef(subRes.data.plan);
        setUsage(subRes.data.usage);
      }
      if (invRes?.data) {
        setInvoices(invRes.data);
      }
    } catch {
      // Fallback state if API not reachable during SSR
      setSubscription({
        id: 'sub_demo_1',
        studio_id: 'studio-demo-1',
        plan: SubscriptionPlan.PRO,
        status: SubscriptionStatus.ACTIVE,
        billing_interval: BillingInterval.MONTHLY,
        currency: 'INR',
        provider: 'STRIPE',
        cancel_at_period_end: false,
        current_period_start: new Date().toISOString(),
        current_period_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        storage_limit_bytes: 100 * 1024 * 1024 * 1024,
        photo_limit: 25000,
        ai_search_limit: 2500,
        max_galleries: 50,
        max_clients: 500,
        max_team_members: 5,
      });
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
  };

  useEffect(() => {
    loadBillingData();
  }, []);

  const handleOpenPortal = async () => {
    setActionLoading(true);
    try {
      const res = await fetchApi<{ portal_url: string }>('/billing/portal', { method: 'POST' });
      if (res?.data?.portal_url) {
        window.location.href = res.data.portal_url;
      }
    } catch {
      setFeedbackMessage({ type: 'error', text: 'Unable to open billing portal. Please try again.' });
    } finally {
      setActionLoading(false);
    }
  };

  const handlePlanChange = async (newPlan: SubscriptionPlan) => {
    setActionLoading(true);
    try {
      await fetchApi('/billing/change-plan', {
        method: 'POST',
        body: JSON.stringify({ plan: newPlan, interval: subscription?.billing_interval || BillingInterval.MONTHLY }),
      });
      setShowUpgradeModal(false);
      setFeedbackMessage({ type: 'success', text: `Plan successfully updated to ${newPlan}. Existing galleries and photos remain completely safe.` });
      await loadBillingData();
    } catch (err: any) {
      setFeedbackMessage({ type: 'error', text: err?.message || 'Failed to update plan.' });
    } finally {
      setActionLoading(false);
    }
  };

  const handleCancelSubscription = async () => {
    setActionLoading(true);
    try {
      await fetchApi('/billing/cancel', { method: 'POST' });
      setShowCancelModal(false);
      setFeedbackMessage({ type: 'success', text: 'Subscription scheduled for cancellation at the end of the current billing cycle. All data is retained.' });
      await loadBillingData();
    } catch (err: any) {
      setFeedbackMessage({ type: 'error', text: err?.message || 'Failed to cancel subscription.' });
    } finally {
      setActionLoading(false);
    }
  };

  const handleResumeSubscription = async () => {
    setActionLoading(true);
    try {
      await fetchApi('/billing/resume', { method: 'POST' });
      setFeedbackMessage({ type: 'success', text: 'Subscription successfully resumed.' });
      await loadBillingData();
    } catch (err: any) {
      setFeedbackMessage({ type: 'error', text: err?.message || 'Failed to resume subscription.' });
    } finally {
      setActionLoading(false);
    }
  };

  const getProgressColor = (percent: number) => {
    if (percent >= 90) return 'bg-red-500 text-red-400';
    if (percent >= 75) return 'bg-amber-500 text-amber-400';
    return 'bg-emerald-500 text-emerald-400';
  };

  return (
    <div className="flex-1 flex flex-col min-h-screen">
      <DashboardHeader
        title="Subscription & Billing"
        subtitle="Manage studio tier limits, storage allocation, invoices, and payment methods"
      />

      <main className="flex-1 p-6 sm:p-8 space-y-8 max-w-7xl">
        {/* Feedback Alert */}
        {feedbackMessage && (
          <div
            className={`p-4 rounded-xl border flex items-center justify-between gap-3 text-xs font-semibold ${
              feedbackMessage.type === 'success'
                ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-300'
                : 'bg-red-500/10 border-red-500/20 text-red-300'
            }`}
          >
            <span>{feedbackMessage.text}</span>
            <button
              onClick={() => setFeedbackMessage(null)}
              className="text-muted hover:text-white"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Current Active Plan Overview Card */}
        <div className="p-8 rounded-2xl bg-card border-2 border-primary/60 space-y-6 relative overflow-hidden shadow-2xl shadow-primary/10">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="px-3 py-1 rounded-full bg-primary/20 text-primary border border-primary/30 text-xs font-bold uppercase tracking-wider">
                  Current Plan
                </span>
                {subscription?.cancel_at_period_end && (
                  <span className="px-3 py-1 rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/30 text-xs font-bold uppercase tracking-wider">
                    Cancels at Period End
                  </span>
                )}
              </div>
              <h2 className="text-2xl font-bold text-white mt-2">
                {planDef?.name || `${subscription?.plan || 'PRO'} Tier`}
              </h2>
              <p className="text-xs text-muted">
                Billed {subscription?.billing_interval?.toLowerCase() || 'monthly'} ({subscription?.currency === 'INR' ? '₹' : '$'}
                {subscription?.plan === SubscriptionPlan.STARTER ? '999' : subscription?.plan === SubscriptionPlan.PRO ? '2,499' : '5,999'}/mo) •{' '}
                Renews on {subscription?.current_period_end ? new Date(subscription.current_period_end).toLocaleDateString() : 'Next Cycle'}
              </p>
            </div>

            {/* Actions & Status */}
            <div className="flex flex-wrap items-center gap-3">
              {subscription?.status === SubscriptionStatus.PAST_DUE ? (
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-bold">
                  <AlertTriangle className="h-4 w-4" /> Past Due (Action Required)
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-bold">
                  <CheckCircle2 className="h-4 w-4" /> Active in Good Standing
                </span>
              )}

              <button
                type="button"
                onClick={() => setShowUpgradeModal(true)}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-primary hover:bg-primary-hover text-white text-xs font-bold transition shadow-md shadow-primary/20"
              >
                Change Plan
              </button>

              <button
                type="button"
                onClick={handleOpenPortal}
                disabled={actionLoading}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-background hover:bg-card-border/60 text-white border border-card-border text-xs font-semibold transition"
              >
                <CreditCard className="h-3.5 w-3.5 text-muted" />
                Manage Billing
                <ExternalLink className="h-3 w-3 text-muted" />
              </button>
            </div>
          </div>

          {/* Quota Progress Trackers (6 Dimensions) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 pt-4 border-t border-card-border">
            {/* 1. Storage */}
            <div className="p-4 rounded-xl bg-background border border-card-border space-y-2">
              <div className="flex justify-between text-xs">
                <span className="text-muted flex items-center gap-1.5 font-medium">
                  <HardDrive className="h-4 w-4 text-purple-400" /> Storage Used
                </span>
                <span className="text-white font-bold">
                  {formatBytes(usage?.storage?.used || 0)} / {formatBytes(usage?.storage?.limit || 0)}
                </span>
              </div>
              <div className="h-2 w-full bg-card-border rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${getProgressColor(usage?.storage?.usage_percent || 0).split(' ')[0]}`}
                  style={{ width: `${usage?.storage?.usage_percent || 0}%` }}
                />
              </div>
              <p className="text-[11px] text-muted">
                {usage?.storage?.usage_percent || 0}% of {formatBytes(usage?.storage?.limit || 0)} allocated
              </p>
            </div>

            {/* 2. Photos */}
            <div className="p-4 rounded-xl bg-background border border-card-border space-y-2">
              <div className="flex justify-between text-xs">
                <span className="text-muted flex items-center gap-1.5 font-medium">
                  <Camera className="h-4 w-4 text-emerald-400" /> Photo Count
                </span>
                <span className="text-white font-bold">
                  {usage?.photos?.used || 0} / {usage?.photos?.is_unlimited ? 'Unlimited' : usage?.photos?.limit || 0}
                </span>
              </div>
              <div className="h-2 w-full bg-card-border rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${getProgressColor(usage?.photos?.usage_percent || 0).split(' ')[0]}`}
                  style={{ width: `${usage?.photos?.usage_percent || 0}%` }}
                />
              </div>
              <p className="text-[11px] text-muted">
                {usage?.photos?.is_unlimited ? 'Unlimited capacity' : `${usage?.photos?.usage_percent || 0}% used`}
              </p>
            </div>

            {/* 3. AI Searches */}
            <div className="p-4 rounded-xl bg-background border border-card-border space-y-2">
              <div className="flex justify-between text-xs">
                <span className="text-muted flex items-center gap-1.5 font-medium">
                  <Sparkles className="h-4 w-4 text-accent" /> Monthly AI Searches
                </span>
                <span className="text-white font-bold">
                  {usage?.ai_searches?.used || 0} / {usage?.ai_searches?.is_unlimited ? 'Unlimited' : usage?.ai_searches?.limit || 0}
                </span>
              </div>
              <div className="h-2 w-full bg-card-border rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${getProgressColor(usage?.ai_searches?.usage_percent || 0).split(' ')[0]}`}
                  style={{ width: `${usage?.ai_searches?.usage_percent || 0}%` }}
                />
              </div>
              <p className="text-[11px] text-muted">Resets next monthly billing cycle</p>
            </div>

            {/* 4. Active Galleries */}
            <div className="p-4 rounded-xl bg-background border border-card-border space-y-2">
              <div className="flex justify-between text-xs">
                <span className="text-muted flex items-center gap-1.5 font-medium">
                  <Images className="h-4 w-4 text-blue-400" /> Active Galleries
                </span>
                <span className="text-white font-bold">
                  {usage?.galleries?.used || 0} / {usage?.galleries?.is_unlimited ? 'Unlimited' : usage?.galleries?.limit || 0}
                </span>
              </div>
              <div className="h-2 w-full bg-card-border rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${getProgressColor(usage?.galleries?.usage_percent || 0).split(' ')[0]}`}
                  style={{ width: `${usage?.galleries?.usage_percent || 0}%` }}
                />
              </div>
              <p className="text-[11px] text-muted">Non-destructive retention on downgrade</p>
            </div>

            {/* 5. Client CRM */}
            <div className="p-4 rounded-xl bg-background border border-card-border space-y-2">
              <div className="flex justify-between text-xs">
                <span className="text-muted flex items-center gap-1.5 font-medium">
                  <Users className="h-4 w-4 text-pink-400" /> Client CRM Profiles
                </span>
                <span className="text-white font-bold">
                  {usage?.clients?.used || 0} / {usage?.clients?.is_unlimited ? 'Unlimited' : usage?.clients?.limit || 0}
                </span>
              </div>
              <div className="h-2 w-full bg-card-border rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${getProgressColor(usage?.clients?.usage_percent || 0).split(' ')[0]}`}
                  style={{ width: `${usage?.clients?.usage_percent || 0}%` }}
                />
              </div>
              <p className="text-[11px] text-muted">Client history and activity logs</p>
            </div>

            {/* 6. Team Members */}
            <div className="p-4 rounded-xl bg-background border border-card-border space-y-2">
              <div className="flex justify-between text-xs">
                <span className="text-muted flex items-center gap-1.5 font-medium">
                  <Users className="h-4 w-4 text-amber-400" /> Team Seats
                </span>
                <span className="text-white font-bold">
                  {usage?.team_members?.used || 0} / {usage?.team_members?.is_unlimited ? 'Unlimited' : usage?.team_members?.limit || 0}
                </span>
              </div>
              <div className="h-2 w-full bg-card-border rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${getProgressColor(usage?.team_members?.usage_percent || 0).split(' ')[0]}`}
                  style={{ width: `${usage?.team_members?.usage_percent || 0}%` }}
                />
              </div>
              <p className="text-[11px] text-muted">Photographers & assistants</p>
            </div>
          </div>
        </div>

        {/* Invoices History Table */}
        <div className="p-6 sm:p-8 rounded-2xl bg-card border border-card-border space-y-6">
          <div className="flex items-center justify-between border-b border-card-border pb-4">
            <div>
              <h3 className="text-base font-bold text-white">Billing History & Invoices</h3>
              <p className="text-xs text-muted">Download receipts and view past subscription payments</p>
            </div>
          </div>

          {invoices.length === 0 ? (
            <div className="text-center py-8 space-y-2">
              <p className="text-xs text-muted">No invoices generated yet for this billing cycle.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-card-border text-muted">
                    <th className="pb-3 font-semibold">Invoice ID</th>
                    <th className="pb-3 font-semibold">Date</th>
                    <th className="pb-3 font-semibold">Amount</th>
                    <th className="pb-3 font-semibold">Status</th>
                    <th className="pb-3 font-semibold text-right">Receipt</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-card-border/50 text-white">
                  {invoices.map((inv) => (
                    <tr key={inv.id} className="hover:bg-background/40 transition">
                      <td className="py-3 font-mono text-muted">{inv.provider_invoice_id}</td>
                      <td className="py-3">{new Date(inv.invoice_date).toLocaleDateString()}</td>
                      <td className="py-3 font-semibold">
                        {inv.currency === 'INR' ? '₹' : '$'}
                        {(inv.amount / 100).toFixed(2)}
                      </td>
                      <td className="py-3">
                        <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-bold text-[10px]">
                          {inv.status}
                        </span>
                      </td>
                      <td className="py-3 text-right">
                        {inv.hosted_invoice_url ? (
                          <a
                            href={inv.hosted_invoice_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-primary hover:underline font-semibold"
                          >
                            <DownloadCloud className="h-3.5 w-3.5" /> Download
                          </a>
                        ) : (
                          <span className="text-muted">Direct Charge</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Cancellation Section */}
        <div className="p-6 rounded-2xl bg-card border border-card-border flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <h4 className="text-sm font-bold text-white">Cancel Subscription</h4>
            <p className="text-xs text-muted">
              You will keep full access until the end of your billing cycle. No data will ever be deleted.
            </p>
          </div>

          {subscription?.cancel_at_period_end ? (
            <button
              type="button"
              onClick={handleResumeSubscription}
              disabled={actionLoading}
              className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-bold transition shadow-sm"
            >
              Resume Subscription
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setShowCancelModal(true)}
              className="px-4 py-2 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 text-xs font-semibold transition"
            >
              Cancel Subscription
            </button>
          )}
        </div>
      </main>

      {/* Upgrade / Change Plan Modal */}
      {showUpgradeModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-card border border-card-border rounded-2xl p-6 max-w-lg w-full space-y-6 shadow-2xl">
            <div className="space-y-1">
              <h3 className="text-lg font-bold text-white">Change Subscription Plan</h3>
              <p className="text-xs text-muted">
                Upgrading takes effect immediately. Downgrading is non-destructive (all current content is preserved).
              </p>
            </div>

            <div className="space-y-3">
              {[SubscriptionPlan.FREE, SubscriptionPlan.STARTER, SubscriptionPlan.PRO, SubscriptionPlan.STUDIO].map((plan) => (
                <div
                  key={plan}
                  onClick={() => setSelectedPlanForChange(plan)}
                  className={`p-4 rounded-xl border cursor-pointer transition flex items-center justify-between ${
                    selectedPlanForChange === plan
                      ? 'bg-primary/10 border-primary text-white'
                      : 'bg-background border-card-border text-muted hover:border-card-border/80'
                  }`}
                >
                  <div>
                    <h4 className="font-bold text-sm text-white">{plan}</h4>
                    <p className="text-xs text-muted">
                      {plan === SubscriptionPlan.FREE
                        ? '3 galleries • 2 GB storage'
                        : plan === SubscriptionPlan.STARTER
                        ? '15 galleries • 25 GB storage (₹999/mo)'
                        : plan === SubscriptionPlan.PRO
                        ? '50 galleries • 100 GB storage (₹2,499/mo)'
                        : 'Unlimited galleries • 500 GB storage (₹5,999/mo)'}
                    </p>
                  </div>
                  {subscription?.plan === plan ? (
                    <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-muted/20 text-muted">Current</span>
                  ) : null}
                </div>
              ))}
            </div>

            <div className="flex items-center justify-end gap-3 pt-4 border-t border-card-border">
              <button
                type="button"
                onClick={() => setShowUpgradeModal(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-muted hover:text-white"
              >
                Close
              </button>
              <button
                type="button"
                onClick={() => handlePlanChange(selectedPlanForChange)}
                disabled={actionLoading}
                className="px-5 py-2.5 rounded-xl bg-primary hover:bg-primary-hover text-white text-xs font-bold transition shadow-md shadow-primary/25"
              >
                Confirm Plan Change
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Cancel Confirmation Modal */}
      {showCancelModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-card border border-card-border rounded-2xl p-6 max-w-md w-full space-y-5 shadow-2xl">
            <div className="space-y-2">
              <h3 className="text-base font-bold text-white flex items-center gap-2 text-red-400">
                <AlertTriangle className="h-5 w-5" /> Cancel Subscription?
              </h3>
              <p className="text-xs text-muted leading-relaxed">
                Your subscription will remain active until{' '}
                <strong className="text-white">
                  {subscription?.current_period_end ? new Date(subscription.current_period_end).toLocaleDateString() : 'the end of this billing period'}
                </strong>
                . After this date, you will transition to the Free plan.
              </p>
              <div className="p-3 rounded-xl bg-background border border-card-border text-[11px] text-emerald-400 space-y-1">
                <p className="font-bold">✓ Non-Destructive Guarantee</p>
                <p className="text-muted">None of your photos, client profiles, or delivery galleries will be deleted.</p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-card-border">
              <button
                type="button"
                onClick={() => setShowCancelModal(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-muted hover:text-white"
              >
                Keep Subscription
              </button>
              <button
                type="button"
                onClick={handleCancelSubscription}
                disabled={actionLoading}
                className="px-4 py-2 rounded-xl bg-red-500 hover:bg-red-600 text-white text-xs font-bold transition"
              >
                Confirm Cancellation
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
