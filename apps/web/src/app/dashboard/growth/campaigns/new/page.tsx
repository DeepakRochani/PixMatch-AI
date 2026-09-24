'use client';

import React, { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  Megaphone,
  Sparkles,
  ArrowLeft,
  Users,
  ShieldCheck,
  Send,
  Eye,
  AlertCircle,
  CheckCircle2,
  Lock,
} from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import { GrowthNavTabs } from '@/components/dashboard/GrowthNavTabs';
import { CampaignRecipientPreviewDTO } from '@pixmatch/types';

function NewCampaignForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { token, studio } = useAuth();

  const queryAngle = searchParams.get('angle') || '';
  const queryClientIds = searchParams.get('client_ids') ? searchParams.get('client_ids')!.split(',') : [];

  const [name, setName] = useState(
    queryAngle ? `${queryAngle} Campaign` : 'Spring Portrait & Reactivation Campaign'
  );
  const [objective, setObjective] = useState('REACTIVATION');
  const [minDaysInactive, setMinDaysInactive] = useState(60);
  const [subject, setSubject] = useState(
    `Exclusive update & seasonal portrait booking from ${studio?.name || 'PixMatch Studio'}`
  );
  const [content, setContent] = useState(
    `Hi {{client_name}},\n\nIt has been a wonderful privilege documenting memories for you in the past with ${studio?.name || 'our studio'}.\n\nAs the new season approaches, we are opening priority booking dates for past clients before public scheduling begins. Whether you are looking to capture updated family moments or milestone portraits, we would love to welcome you back.\n\nWarm regards,\n${studio?.name || 'PixMatch Studio'}`
  );
  const [previewText, setPreviewText] = useState('Priority booking slots are now open for past clients.');
  const [offerText, setOfferText] = useState('Complimentary 8x10 Fine Art Print included with any session booked this month.');
  const [ctaText, setCtaText] = useState('View Available Dates');
  const [ctaUrl, setCtaUrl] = useState('https://pixmatch.ai/book');
  const [cost, setCost] = useState(0);

  const [previewData, setPreviewData] = useState<CampaignRecipientPreviewDTO | null>(null);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchRecipientPreview = async () => {
    try {
      setLoadingPreview(true);
      const res = await fetch('/api/v1/growth/campaigns/preview', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
          'x-studio-id': studio?.id || '',
        },
        body: JSON.stringify({
          segment_definition: {
            min_days_inactive: minDaysInactive,
            client_ids: queryClientIds.length > 0 ? queryClientIds : undefined,
          },
        }),
      });

      if (res.ok) {
        const json = await res.json();
        setPreviewData(json.data || json);
      }
    } catch (err) {
      console.error('Failed to preview recipients:', err);
    } finally {
      setLoadingPreview(false);
    }
  };

  useEffect(() => {
    if (token) {
      fetchRecipientPreview();
    }
  }, [token, minDaysInactive]);

  const handleApplyTemplate = (type: string) => {
    const studioName = studio?.name || 'PixMatch Studio';
    if (type === 'SEASONAL') {
      setName('Upcoming Wedding & Festive Season Promo');
      setObjective('SEASONAL_DEMAND');
      setSubject(`Opening our calendar: Early peak-season bookings with ${studioName}`);
      setContent(`Hi {{client_name}},\n\nWith peak wedding and festive season approaching, our weekend dates fill up very quickly.\n\nBecause you are a valued client of ${studioName}, we want to extend first access to our calendar along with an exclusive album credit.\n\nLet us know if you or someone close is planning a celebration this season!`);
      setOfferText('₹5,000 Heirloom Album Credit for bookings finalized by the end of the week.');
      setCtaText('Check Availability');
    } else if (type === 'ANNIVERSARY') {
      setName('1-Year Anniversary Milestone Check-in');
      setObjective('ANNIVERSARY');
      setSubject(`Happy Anniversary from ${studioName}! 🎉`);
      setContent(`Hi {{client_name}},\n\nThinking of you on this special milestone! We loved documenting your wedding/event memories and hope you are cherishing every photograph.\n\nTo celebrate your anniversary, we’d love to gift you a complimentary mini-portrait session or print voucher.`);
      setOfferText('Complimentary 1-Hour Anniversary Portrait Session Voucher.');
      setCtaText('Claim Anniversary Gift');
    } else if (type === 'VIP') {
      setName('VIP Past Client Priority Care');
      setObjective('VIP_CARE');
      setSubject(`A private thank you & priority access from ${studioName}`);
      setContent(`Hi {{client_name}},\n\nThank you for being one of our studio\'s most cherished clients. We are introducing our new full-resolution digital archiving service and would love to ensure your galleries remain forever accessible.`);
      setOfferText('Complimentary lifetime high-resolution gallery access renewal.');
      setCtaText('Access VIP Portal');
    }
  };

  const handleCreateDraft = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSubmitting(true);
      setError(null);

      const res = await fetch('/api/v1/growth/campaigns', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
          'x-studio-id': studio?.id || '',
        },
        body: JSON.stringify({
          name,
          objective,
          segment_definition: {
            min_days_inactive: minDaysInactive,
            client_ids: queryClientIds.length > 0 ? queryClientIds : undefined,
          },
          subject,
          content,
          preview_text: previewText,
          offer_text: offerText,
          cta_text: ctaText,
          cta_url: ctaUrl,
          cost: Number(cost) || 0,
        }),
      });

      if (!res.ok) {
        const errJson = await res.json();
        throw new Error(errJson.error || 'Failed to create campaign draft');
      }

      const json = await res.json();
      const campaignId = json.data?.id || json.id;
      router.push(`/dashboard/growth/campaigns/${campaignId}`);
    } catch (err: any) {
      setError(err.message || 'Error creating campaign');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="p-6 md:p-8 space-y-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link
          href="/dashboard/growth/campaigns"
          className="h-8 w-8 rounded-lg bg-card-border/30 hover:bg-card-border/50 text-white flex items-center justify-center transition"
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">AI Campaign Builder</h1>
          <p className="text-xs text-muted">
            Craft targeted re-engagement campaigns with smart templates, real-time recipient suppression, and human approval gating.
          </p>
        </div>
      </div>

      <GrowthNavTabs />

      {/* Strict Human Gate Reminder */}
      <div className="p-4 rounded-xl bg-indigo-500/10 border border-indigo-500/30 text-indigo-300 text-xs flex items-center gap-3">
        <ShieldCheck className="h-5 w-5 flex-shrink-0 text-indigo-400" />
        <div>
          <span className="font-semibold">Strict Human Gate:</span> Campaigns are created in{' '}
          <span className="font-mono uppercase font-bold text-white">Draft</span> state. Zero emails will ever be sent
          without your explicit human approval review on the next screen.
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs flex items-center gap-2">
          <AlertCircle className="h-4 w-4" />
          <span>{error}</span>
        </div>
      )}

      {/* Template Quick Select */}
      <div className="p-4 rounded-xl bg-card border border-card-border space-y-2.5">
        <div className="flex items-center gap-2 text-xs font-semibold text-white">
          <Sparkles className="h-3.5 w-3.5 text-primary" />
          <span>AI Suggested Angles & Templates</span>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => handleApplyTemplate('SEASONAL')}
            className="px-3 py-1.5 rounded-lg bg-card-border/30 hover:bg-primary/20 hover:text-primary text-xs font-medium text-muted transition"
          >
            Seasonal Peak Demand
          </button>
          <button
            type="button"
            onClick={() => handleApplyTemplate('ANNIVERSARY')}
            className="px-3 py-1.5 rounded-lg bg-card-border/30 hover:bg-primary/20 hover:text-primary text-xs font-medium text-muted transition"
          >
            1-Year Anniversary Check-in
          </button>
          <button
            type="button"
            onClick={() => handleApplyTemplate('VIP')}
            className="px-3 py-1.5 rounded-lg bg-card-border/30 hover:bg-primary/20 hover:text-primary text-xs font-medium text-muted transition"
          >
            VIP Past Client Privilege
          </button>
        </div>
      </div>

      <form onSubmit={handleCreateDraft} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Main Campaign Form */}
          <div className="md:col-span-2 space-y-4">
            <div className="p-5 rounded-2xl bg-card border border-card-border space-y-4">
              <h2 className="text-sm font-bold text-white">Campaign Details</h2>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted">Campaign Name</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-card-border/20 border border-card-border text-xs rounded-lg text-white focus:outline-none focus:border-primary"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-muted">Objective</label>
                  <select
                    value={objective}
                    onChange={(e) => setObjective(e.target.value)}
                    className="w-full px-3 py-2 bg-card-border/20 border border-card-border text-xs rounded-lg text-white focus:outline-none focus:border-primary"
                  >
                    <option value="REACTIVATION">Client Reactivation</option>
                    <option value="SEASONAL_DEMAND">Seasonal Booking</option>
                    <option value="ANNIVERSARY">Milestone / Anniversary</option>
                    <option value="VIP_CARE">VIP Client Care</option>
                    <option value="PRINT_PROMOTION">Print & Album Sale</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-muted">Campaign Cost (₹)</label>
                  <input
                    type="number"
                    min="0"
                    value={cost}
                    onChange={(e) => setCost(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-card-border/20 border border-card-border text-xs rounded-lg text-white font-mono focus:outline-none focus:border-primary"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted">Subject Line</label>
                <input
                  type="text"
                  required
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-card-border/20 border border-card-border text-xs rounded-lg text-white font-medium focus:outline-none focus:border-primary"
                />
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-muted">Email Message Content</label>
                  <span className="text-[10px] text-muted">Supports &#123;&#123;client_name&#125;&#125; and &#123;&#123;studio_name&#125;&#125;</span>
                </div>
                <textarea
                  required
                  rows={8}
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-card-border/20 border border-card-border text-xs rounded-lg text-white font-sans leading-relaxed focus:outline-none focus:border-primary"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted">Special Incentive / Offer Highlight (Optional)</label>
                <input
                  type="text"
                  value={offerText}
                  onChange={(e) => setOfferText(e.target.value)}
                  placeholder="e.g. Free 8x10 print with booking"
                  className="w-full px-3.5 py-2 bg-card-border/20 border border-card-border text-xs rounded-lg text-white focus:outline-none focus:border-primary"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-muted">CTA Button Text</label>
                  <input
                    type="text"
                    value={ctaText}
                    onChange={(e) => setCtaText(e.target.value)}
                    className="w-full px-3 py-2 bg-card-border/20 border border-card-border text-xs rounded-lg text-white focus:outline-none focus:border-primary"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-muted">CTA Destination URL</label>
                  <input
                    type="url"
                    value={ctaUrl}
                    onChange={(e) => setCtaUrl(e.target.value)}
                    className="w-full px-3 py-2 bg-card-border/20 border border-card-border text-xs rounded-lg text-white focus:outline-none focus:border-primary"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Right Sidebar: Recipient Resolution & Verification */}
          <div className="space-y-4">
            <div className="p-5 rounded-2xl bg-card border border-card-border space-y-4">
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-emerald-400" />
                <h2 className="text-sm font-bold text-white">Recipient Resolution</h2>
              </div>

              {queryClientIds.length > 0 ? (
                <div className="p-3 rounded-xl bg-primary/10 border border-primary/30 text-xs text-primary">
                  Targeting <span className="font-bold text-white">{queryClientIds.length}</span> specifically selected
                  clients from Reactivation Hub.
                </div>
              ) : (
                <div className="space-y-1.5">
                  <label className="text-xs text-muted">Filter by Inactivity Window:</label>
                  <select
                    value={minDaysInactive}
                    onChange={(e) => setMinDaysInactive(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-card-border/20 border border-card-border text-xs rounded-lg text-white focus:outline-none focus:border-primary"
                  >
                    <option value={30}>30+ Days Inactive</option>
                    <option value={60}>60+ Days Inactive</option>
                    <option value={90}>90+ Days Inactive</option>
                    <option value={180}>180+ Days Inactive</option>
                    <option value={365}>1+ Year Inactive</option>
                  </select>
                </div>
              )}

              <div className="p-4 rounded-xl bg-card-border/20 border border-card-border/60 space-y-2.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted">Total Segment Matches:</span>
                  <span className="font-mono font-bold text-white">{previewData?.total_matching ?? '...'}</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-emerald-400 font-semibold flex items-center gap-1">
                    <CheckCircle2 className="h-3.5 w-3.5" /> Eligible for Send:
                  </span>
                  <span className="font-mono font-bold text-emerald-400">
                    {previewData?.eligible_recipients?.length ?? '...'}
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs pt-1 border-t border-card-border/40">
                  <span className="text-muted">Suppressed (Unsubscribed/Bounced):</span>
                  <span className="font-mono text-muted">{previewData?.suppressed_count ?? 0}</span>
                </div>
              </div>

              <button
                type="submit"
                disabled={submitting || (previewData?.eligible_recipients?.length === 0)}
                className="w-full py-3 bg-gradient-to-r from-primary to-accent hover:from-primary/90 text-white font-bold text-xs rounded-xl shadow-md shadow-primary/20 transition-all disabled:opacity-40 flex items-center justify-center gap-2"
              >
                <Lock className="h-3.5 w-3.5" />
                {submitting ? 'Saving Draft...' : 'Save Draft & Proceed to Approval'}
              </button>

              <p className="text-[11px] text-muted text-center leading-relaxed">
                Saving as draft will prepare recipients and allow you to preview and explicitly approve the campaign.
              </p>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}

export default function NewCampaignPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-xs text-muted">Loading campaign builder...</div>}>
      <NewCampaignForm />
    </Suspense>
  );
}
