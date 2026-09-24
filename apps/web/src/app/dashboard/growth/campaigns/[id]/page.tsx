'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import {
  Megaphone,
  ArrowLeft,
  CheckCircle2,
  AlertTriangle,
  Send,
  Calendar,
  ShieldCheck,
  TrendingUp,
  Download,
  Users,
  Eye,
  Clock,
  Trash2,
  Lock,
  ExternalLink,
} from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import { GrowthNavTabs } from '@/components/dashboard/GrowthNavTabs';
import {
  MarketingCampaignDTO,
  CampaignPerformanceDTO,
  MarketingCampaignRecipientDTO,
} from '@pixmatch/types';

export default function CampaignDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { token, studio, user } = useAuth();
  const campaignId = params.id as string;

  const [loading, setLoading] = useState(true);
  const [campaign, setCampaign] = useState<MarketingCampaignDTO | null>(null);
  const [performance, setPerformance] = useState<CampaignPerformanceDTO | null>(null);
  const [recipients, setRecipients] = useState<MarketingCampaignRecipientDTO[]>([]);
  const [activeTab, setActiveTab] = useState<'performance' | 'recipients' | 'preview'>('performance');

  const [approving, setApproving] = useState(false);
  const [dispatching, setDispatching] = useState(false);
  const [scheduling, setScheduling] = useState(false);
  const [scheduleDate, setScheduleDate] = useState('');
  const [approvalNote, setApprovalNote] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  const fetchCampaignData = async () => {
    try {
      setLoading(true);
      setError(null);

      const [cRes, pRes, rRes] = await Promise.all([
        fetch(`/api/v1/growth/campaigns/${campaignId}`, {
          headers: {
            Authorization: `Bearer ${token}`,
            'x-studio-id': studio?.id || '',
          },
        }),
        fetch(`/api/v1/growth/campaigns/${campaignId}/performance`, {
          headers: {
            Authorization: `Bearer ${token}`,
            'x-studio-id': studio?.id || '',
          },
        }),
        fetch(`/api/v1/growth/campaigns/${campaignId}/recipients?limit=100`, {
          headers: {
            Authorization: `Bearer ${token}`,
            'x-studio-id': studio?.id || '',
          },
        }),
      ]);

      if (!cRes.ok) throw new Error('Campaign not found');

      const [cJson, pJson, rJson] = await Promise.all([cRes.json(), pRes.json(), rRes.json()]);
      setCampaign(cJson.data || cJson);
      setPerformance(pJson.data || pJson);
      setRecipients(rJson.data?.recipients || []);
    } catch (err: any) {
      setError(err.message || 'Error loading campaign details');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token && campaignId) {
      fetchCampaignData();
    }
  }, [token, campaignId]);

  const handleApprove = async () => {
    try {
      setApproving(true);
      setError(null);
      const res = await fetch(`/api/v1/growth/campaigns/${campaignId}/approve`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
          'x-studio-id': studio?.id || '',
        },
        body: JSON.stringify({ approval_note: approvalNote || 'Approved by studio owner' }),
      });

      if (!res.ok) {
        const errJson = await res.json();
        throw new Error(errJson.error || 'Failed to approve campaign');
      }

      setActionSuccess('Campaign approved successfully! You can now dispatch or schedule this campaign.');
      await fetchCampaignData();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setApproving(false);
    }
  };

  const handleDispatch = async () => {
    if (!confirm('Are you sure you want to dispatch this campaign now to all eligible recipients?')) return;
    try {
      setDispatching(true);
      setError(null);
      const res = await fetch(`/api/v1/growth/campaigns/${campaignId}/dispatch`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'x-studio-id': studio?.id || '',
        },
      });

      if (!res.ok) {
        const errJson = await res.json();
        throw new Error(errJson.error || 'Failed to dispatch campaign');
      }

      const json = await res.json();
      setActionSuccess(`Campaign dispatched: ${json.data?.sent || 0} sent, ${json.data?.suppressed || 0} suppressed.`);
      await fetchCampaignData();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setDispatching(false);
    }
  };

  const handleSchedule = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setScheduling(true);
      setError(null);
      const res = await fetch(`/api/v1/growth/campaigns/${campaignId}/schedule`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
          'x-studio-id': studio?.id || '',
        },
        body: JSON.stringify({ scheduled_at: scheduleDate }),
      });

      if (!res.ok) {
        const errJson = await res.json();
        throw new Error(errJson.error || 'Failed to schedule campaign');
      }

      setActionSuccess(`Campaign scheduled for ${new Date(scheduleDate).toLocaleString()}`);
      await fetchCampaignData();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setScheduling(false);
    }
  };

  const handleExportCsv = async () => {
    try {
      const res = await fetch(`/api/v1/growth/campaigns/${campaignId}/recipients/export/csv`, {
        headers: {
          Authorization: `Bearer ${token}`,
          'x-studio-id': studio?.id || '',
        },
      });

      if (!res.ok) throw new Error('Failed to export recipients CSV');

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `campaign-${campaignId}-recipients.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this campaign draft?')) return;
    try {
      const res = await fetch(`/api/v1/growth/campaigns/${campaignId}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
          'x-studio-id': studio?.id || '',
        },
      });
      if (res.ok) {
        router.push('/dashboard/growth/campaigns');
      }
    } catch (err: any) {
      setError(err.message);
    }
  };

  if (loading) {
    return (
      <div className="p-8 max-w-6xl mx-auto text-center text-xs text-muted">
        Loading campaign details...
      </div>
    );
  }

  if (!campaign) {
    return (
      <div className="p-8 max-w-6xl mx-auto text-center text-xs text-muted">
        Campaign not found.
      </div>
    );
  }

  return (
    <div className="p-6 md:p-8 space-y-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link
            href="/dashboard/growth/campaigns"
            className="h-8 w-8 rounded-lg bg-card-border/30 hover:bg-card-border/50 text-white flex items-center justify-center transition"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-2xl font-bold text-white tracking-tight">{campaign.name}</h1>
              <span
                className={`px-2.5 py-0.5 rounded text-[10px] font-bold ${
                  campaign.status === 'COMPLETED'
                    ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                    : campaign.status === 'APPROVED'
                    ? 'bg-indigo-500/15 text-indigo-400 border border-indigo-500/30'
                    : campaign.status === 'SCHEDULED'
                    ? 'bg-amber-500/15 text-amber-400 border border-amber-500/30'
                    : 'bg-card-border/60 text-muted'
                }`}
              >
                {campaign.status}
              </span>
            </div>
            <p className="text-xs text-muted mt-0.5">Objective: {campaign.objective} • Channel: Email</p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2.5 flex-wrap">
          {campaign.status === 'DRAFT' && (
            <>
              <button
                onClick={handleApprove}
                disabled={approving}
                className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-lg shadow-sm shadow-emerald-600/20 transition-all disabled:opacity-50"
              >
                <ShieldCheck className="h-4 w-4" />
                {approving ? 'Approving...' : 'Approve Campaign (Human Gate)'}
              </button>
              <button
                onClick={handleDelete}
                className="p-2 text-muted hover:text-red-400 hover:bg-red-500/10 rounded-lg transition"
                title="Delete Draft"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </>
          )}

          {campaign.status === 'APPROVED' && (
            <>
              <button
                onClick={handleDispatch}
                disabled={dispatching}
                className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-primary to-accent hover:from-primary/90 text-white text-xs font-bold rounded-lg shadow-sm shadow-primary/20 transition-all disabled:opacity-50"
              >
                <Send className="h-4 w-4" />
                {dispatching ? 'Sending...' : 'Send Now'}
              </button>
            </>
          )}
        </div>
      </div>

      <GrowthNavTabs />

      {/* Feedback Alerts */}
      {actionSuccess && (
        <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4 flex-shrink-0" />
          <span>{actionSuccess}</span>
        </div>
      )}

      {error && (
        <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Human Approval Status Card */}
      <div className="p-4 rounded-xl bg-card border border-card-border flex flex-col md:flex-row md:items-center justify-between gap-4 text-xs">
        <div className="flex items-center gap-3">
          <div
            className={`h-9 w-9 rounded-lg flex items-center justify-center ${
              campaign.approved_by
                ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                : 'bg-amber-500/15 text-amber-400 border border-amber-500/30'
            }`}
          >
            {campaign.approved_by ? <ShieldCheck className="h-5 w-5" /> : <Lock className="h-5 w-5" />}
          </div>
          <div>
            <div className="font-semibold text-white">
              {campaign.approved_by ? 'Verified Human Approval Gate' : 'Human Approval Required'}
            </div>
            <p className="text-muted text-[11px]">
              {campaign.approved_by
                ? `Approved by ${campaign.approved_by} on ${new Date(campaign.approved_at!).toLocaleString()}`
                : 'Zero marketing emails will be dispatched until explicitly reviewed and approved.'}
            </p>
          </div>
        </div>

        {campaign.status === 'APPROVED' && (
          <form onSubmit={handleSchedule} className="flex items-center gap-2">
            <input
              type="datetime-local"
              required
              value={scheduleDate}
              onChange={(e) => setScheduleDate(e.target.value)}
              className="px-2.5 py-1.5 bg-card-border/20 border border-card-border rounded-lg text-xs text-white focus:outline-none focus:border-primary"
            />
            <button
              type="submit"
              disabled={scheduling || !scheduleDate}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-card-border/40 hover:bg-card-border/70 text-xs font-semibold text-white rounded-lg transition disabled:opacity-40"
            >
              <Calendar className="h-3.5 w-3.5" />
              {scheduling ? 'Scheduling...' : 'Schedule'}
            </button>
          </form>
        )}
      </div>

      {/* Navigation Sub-Tabs */}
      <div className="flex items-center gap-2 border-b border-card-border pb-3">
        <button
          onClick={() => setActiveTab('performance')}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
            activeTab === 'performance' ? 'bg-primary text-white' : 'text-muted hover:text-white'
          }`}
        >
          Performance & ROI
        </button>
        <button
          onClick={() => setActiveTab('recipients')}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
            activeTab === 'recipients' ? 'bg-primary text-white' : 'text-muted hover:text-white'
          }`}
        >
          Recipients ({recipients.length})
        </button>
        <button
          onClick={() => setActiveTab('preview')}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
            activeTab === 'preview' ? 'bg-primary text-white' : 'text-muted hover:text-white'
          }`}
        >
          Email Message Preview
        </button>
      </div>

      {/* Tab 1: Performance & ROI */}
      {activeTab === 'performance' && performance && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
            <div className="p-4 rounded-xl bg-card border border-card-border">
              <span className="text-[10px] uppercase font-bold text-muted">Sent</span>
              <div className="text-lg font-bold text-white font-mono mt-1">{performance.sent_count}</div>
            </div>
            <div className="p-4 rounded-xl bg-card border border-card-border">
              <span className="text-[10px] uppercase font-bold text-muted">Delivered</span>
              <div className="text-lg font-bold text-white font-mono mt-1">
                {performance.delivered_count} ({performance.delivery_rate_pct ?? 0}%)
              </div>
            </div>
            <div className="p-4 rounded-xl bg-card border border-card-border">
              <span className="text-[10px] uppercase font-bold text-muted">Opened</span>
              <div className="text-lg font-bold text-white font-mono mt-1">
                {performance.opened_count} ({performance.open_rate_pct ?? 0}%)
              </div>
            </div>
            <div className="p-4 rounded-xl bg-card border border-card-border">
              <span className="text-[10px] uppercase font-bold text-muted">Clicked</span>
              <div className="text-lg font-bold text-white font-mono mt-1">
                {performance.clicked_count} ({performance.click_rate_pct ?? 0}%)
              </div>
            </div>
            <div className="p-4 rounded-xl bg-card border border-card-border">
              <span className="text-[10px] uppercase font-bold text-muted">Converted</span>
              <div className="text-lg font-bold text-emerald-400 font-mono mt-1">
                {performance.converted_count} ({performance.conversion_rate_pct ?? 0}%)
              </div>
            </div>
            <div className="p-4 rounded-xl bg-card border border-card-border">
              <span className="text-[10px] uppercase font-bold text-muted">Attributed Rev</span>
              <div className="text-lg font-bold text-accent font-mono mt-1">
                ₹{performance.attributed_revenue.toLocaleString('en-IN')}
              </div>
            </div>
            <div className="p-4 rounded-xl bg-card border border-card-border">
              <span className="text-[10px] uppercase font-bold text-muted">Campaign ROI</span>
              <div className="text-lg font-bold text-emerald-400 font-mono mt-1">
                {performance.roi_pct !== null ? `${performance.roi_pct}%` : 'N/A'}
              </div>
            </div>
          </div>

          {/* Timeline & Notes */}
          <div className="p-5 rounded-2xl bg-card border border-card-border space-y-3">
            <h3 className="text-sm font-bold text-white">Conversion & Attribution Verification</h3>
            <p className="text-xs text-muted leading-relaxed">
              PixMatch AI strictly attributes revenue exclusively from verified client bookings and recorded transactions.
              No arbitrary or synthetic financial estimates are applied.
            </p>
          </div>
        </div>
      )}

      {/* Tab 2: Recipients */}
      {activeTab === 'recipients' && (
        <div className="p-5 rounded-2xl bg-card border border-card-border space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-white">Campaign Recipients ({recipients.length})</h3>
            <button
              onClick={handleExportCsv}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-card-border/30 hover:bg-card-border/50 text-white text-xs font-semibold rounded-lg transition"
            >
              <Download className="h-3.5 w-3.5" /> Export CSV
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-muted">
              <thead className="border-b border-card-border text-[11px] uppercase tracking-wider text-muted/70">
                <tr>
                  <th className="pb-3 font-semibold">Recipient</th>
                  <th className="pb-3 font-semibold text-center">Status</th>
                  <th className="pb-3 font-semibold text-right">Sent At</th>
                  <th className="pb-3 font-semibold text-right">Delivered At</th>
                  <th className="pb-3 font-semibold text-right">Opened At</th>
                  <th className="pb-3 font-semibold text-right">Converted</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-card-border/40">
                {recipients.map((r) => (
                  <tr key={r.id} className="hover:bg-card-border/20 transition-colors">
                    <td className="py-3">
                      <div className="font-semibold text-white">{r.client_name || 'Client'}</div>
                      <div className="text-[11px] text-muted">{r.email}</div>
                    </td>
                    <td className="py-3 text-center">
                      <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-card-border/40 text-muted">
                        {r.status}
                      </span>
                    </td>
                    <td className="py-3 text-right font-mono">{r.sent_at ? new Date(r.sent_at).toLocaleTimeString() : '-'}</td>
                    <td className="py-3 text-right font-mono">{r.delivered_at ? new Date(r.delivered_at).toLocaleTimeString() : '-'}</td>
                    <td className="py-3 text-right font-mono">{r.opened_at ? new Date(r.opened_at).toLocaleTimeString() : '-'}</td>
                    <td className="py-3 text-right font-mono font-bold text-emerald-400">
                      {r.conversion_value ? `₹${r.conversion_value.toLocaleString('en-IN')}` : '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 3: Preview */}
      {activeTab === 'preview' && (
        <div className="p-6 rounded-2xl bg-card border border-card-border space-y-4 max-w-2xl mx-auto">
          <div className="border-b border-card-border pb-3">
            <span className="text-[10px] uppercase font-bold text-muted">Subject:</span>
            <div className="text-sm font-semibold text-white mt-0.5">{campaign.subject}</div>
          </div>
          <div className="text-xs text-muted whitespace-pre-wrap leading-relaxed">
            {campaign.content}
          </div>
          {campaign.offer_text && (
            <div className="p-3 bg-primary/10 border border-primary/30 rounded-lg text-xs font-medium text-primary">
              {campaign.offer_text}
            </div>
          )}
          {campaign.cta_text && (
            <div className="pt-2">
              <span className="inline-block px-4 py-2 bg-primary text-white text-xs font-bold rounded-lg">
                {campaign.cta_text}
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
