'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { DashboardHeader } from '@/components/layout/DashboardHeader';
import { fetchApi } from '@/lib/api-client';
import { formatDate } from '@pixmatch/ui';
import {
  Users,
  Mail,
  Phone,
  Images,
  Building,
  Tag,
  Clock,
  Send,
  Plus,
  ArrowLeft,
  Eye,
  Heart,
  CheckSquare,
  DownloadCloud,
  Lock,
  ExternalLink,
  Trash2,
  Archive,
  RefreshCw,
  Edit2,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Sparkles,
  X,
  Check,
  FileText,
  Activity,
  TrendingUp,
  AlertTriangle,
  Layers,
  ChevronRight,
  ShieldCheck,
  Compass
} from 'lucide-react';
import {
  ClientDTO,
  Client360DTO,
  ClientEngagementState,
  ClientJourneyStage,
  ClientInsightDTO,
  ClientFollowUpRecommendationDTO,
  ClientCommunicationDraftDTO
} from '@pixmatch/types';

export default function ClientProfilePage() {
  const params = useParams();
  const router = useRouter();
  const clientId = params?.clientId as string;

  const [client, setClient] = useState<any>(null);
  const [client360, setClient360] = useState<Client360DTO | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'360' | 'galleries' | 'activity' | 'insights' | 'communications' | 'notes'>('360');

  // Activity Timeline
  const [activities, setActivities] = useState<any[]>([]);
  const [activitiesLoading, setActivitiesLoading] = useState(false);

  // Private Notes & Details Editing
  const [isEditingNotes, setIsEditingNotes] = useState(false);
  const [editNotes, setEditNotes] = useState('');
  const [editCompany, setEditCompany] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editTags, setEditTags] = useState('');
  const [savingNotes, setSavingNotes] = useState(false);
  const [saveSuccessMsg, setSaveSuccessMsg] = useState(false);

  // Assign Gallery Modal
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [allGalleries, setAllGalleries] = useState<any[]>([]);
  const [selectedAssignGalleryId, setSelectedAssignGalleryId] = useState('');
  const [assigningGallery, setAssigningGallery] = useState(false);

  // Send Delivery Modal
  const [showSendModal, setShowSendModal] = useState(false);
  const [sendGalleryId, setSendGalleryId] = useState('');
  const [customMessage, setCustomMessage] = useState('');
  const [sendingDelivery, setSendingDelivery] = useState(false);
  const [sendSuccess, setSendSuccess] = useState(false);

  // Draft Creation Modal
  const [draftModalOpen, setDraftModalOpen] = useState(false);
  const [selectedFollowUp, setSelectedFollowUp] = useState<ClientFollowUpRecommendationDTO | null>(null);
  const [draftSubject, setDraftSubject] = useState('');
  const [draftBody, setDraftBody] = useState('');
  const [creatingDraft, setCreatingDraft] = useState(false);
  const [draftSuccess, setDraftSuccess] = useState(false);

  // Load Client Data & 360
  const loadClient = useCallback(async () => {
    setLoading(true);
    try {
      const [res, res360] = await Promise.all([
        fetchApi(`/clients/${clientId}`),
        fetchApi(`/client-intelligence/clients/${clientId}/360`),
      ]);

      if (res?.success && res.data) {
        setClient(res.data);
        setEditNotes(res.data.notes || '');
        setEditCompany(res.data.company || '');
        setEditPhone(res.data.phone || '');
        setEditTags((res.data.tags || []).join(', '));
      }

      if (res360?.success && res360.data) {
        setClient360(res360.data);
      }
    } catch {
      // Fallback
    } finally {
      setLoading(false);
    }
  }, [clientId]);

  // Load Client Activity
  const loadActivity = useCallback(async () => {
    setActivitiesLoading(true);
    try {
      const res = await fetchApi(`/client-intelligence/clients/${clientId}/timeline`);
      if (res?.success && res.data) {
        setActivities(res.data);
      } else {
        const fallbackRes = await fetchApi(`/clients/${clientId}/activity?limit=50`);
        if (fallbackRes?.success && fallbackRes.data) {
          setActivities(fallbackRes.data.activities || []);
        }
      }
    } catch {
      // Fallback
    } finally {
      setActivitiesLoading(false);
    }
  }, [clientId]);

  useEffect(() => {
    loadClient();
  }, [loadClient]);

  useEffect(() => {
    if (activeTab === 'activity') {
      loadActivity();
    }
  }, [activeTab, loadActivity]);

  // Save Notes & Details
  const handleSaveDetails = async () => {
    setSavingNotes(true);
    setSaveSuccessMsg(false);
    try {
      const tagsArray = editTags.split(',').map((t) => t.trim()).filter(Boolean);
      const res = await fetchApi(`/clients/${clientId}`, {
        method: 'PATCH',
        body: JSON.stringify({
          company: editCompany.trim() || undefined,
          phone: editPhone.trim() || undefined,
          notes: editNotes.trim(),
          tags: tagsArray,
        }),
      });

      if (res?.success) {
        setSaveSuccessMsg(true);
        setIsEditingNotes(false);
        loadClient();
        setTimeout(() => setSaveSuccessMsg(false), 2000);
      }
    } catch {
      // Error
    } finally {
      setSavingNotes(false);
    }
  };

  // Open Assign Gallery Modal
  const openAssignModal = async () => {
    setShowAssignModal(true);
    try {
      const res = await fetchApi('/galleries?limit=50');
      if (res?.success && res.data?.galleries) {
        setAllGalleries(res.data.galleries);
        if (res.data.galleries.length > 0) {
          setSelectedAssignGalleryId(res.data.galleries[0].id);
        }
      }
    } catch {
      // Error
    }
  };

  // Confirm Gallery Assignment
  const handleAssignGallery = async () => {
    if (!selectedAssignGalleryId) return;
    setAssigningGallery(true);
    try {
      const res = await fetchApi(`/galleries/${selectedAssignGalleryId}/assign-client`, {
        method: 'POST',
        body: JSON.stringify({
          client_id: clientId,
          relationship_type: 'PRIMARY',
        }),
      });

      if (res?.success) {
        setShowAssignModal(false);
        loadClient();
      }
    } catch {
      // Error
    } finally {
      setAssigningGallery(false);
    }
  };

  // Unassign Gallery
  const handleUnassignGallery = async (galleryId: string, galleryTitle: string) => {
    if (confirm(`Unassign client from "${galleryTitle}"?`)) {
      await fetchApi(`/galleries/${galleryId}/unassign-client/${clientId}`, {
        method: 'DELETE',
      });
      loadClient();
    }
  };

  // Open Send Delivery Modal
  const openSendModalForGallery = (galleryId: string, galleryTitle: string) => {
    setSendGalleryId(galleryId);
    setCustomMessage(`Hi ${client.name}, your gallery "${galleryTitle}" is ready!`);
    setSendSuccess(false);
    setShowSendModal(true);
  };

  // Dispatch Delivery Email
  const handleSendDelivery = async () => {
    if (!sendGalleryId) return;
    setSendingDelivery(true);
    try {
      const res = await fetchApi(`/galleries/${sendGalleryId}/delivery/send`, {
        method: 'POST',
        body: JSON.stringify({
          client_id: clientId,
          recipient_email: client.email,
          recipient_name: client.name,
          custom_message: customMessage,
          send_email: true,
          idempotency_key: `client-${clientId}-gal-${sendGalleryId}-${Date.now()}`,
        }),
      });

      if (res?.success) {
        setSendSuccess(true);
        setTimeout(() => {
          setShowSendModal(false);
          loadClient();
        }, 1200);
      }
    } catch {
      // Error
    } finally {
      setSendingDelivery(false);
    }
  };

  // Archive / Restore
  const handleToggleArchive = async () => {
    if (client.status === 'ARCHIVED') {
      await fetchApi(`/clients/${clientId}/restore`, { method: 'POST' });
    } else {
      if (confirm(`Archive ${client.name}?`)) {
        await fetchApi(`/clients/${clientId}`, { method: 'DELETE' });
      }
    }
    loadClient();
  };

  // Recalculate Engagement Score
  const handleRecalculateEngagement = async () => {
    await fetchApi(`/client-intelligence/clients/${clientId}/engagement/recalculate`, {
      method: 'POST',
    });
    loadClient();
  };

  // Open Draft Modal
  const openDraftForFollowUp = (followUp: ClientFollowUpRecommendationDTO) => {
    setSelectedFollowUp(followUp);
    setDraftSubject(`Update regarding your gallery: ${followUp.suggestedSubject || followUp.title}`);
    setDraftBody(
      followUp.suggestedBody ||
      `Hi ${client.name},\n\nI hope you're enjoying your photos! I wanted to check in and see if you need any help with your gallery.\n\nBest regards,\nYour Photography Team`
    );
    setDraftModalOpen(true);
    setDraftSuccess(false);
  };

  const handleSaveDraft = async () => {
    if (!selectedFollowUp) return;
    setCreatingDraft(true);
    try {
      const res = await fetchApi('/client-intelligence/communications/drafts', {
        method: 'POST',
        body: JSON.stringify({
          clientId,
          galleryId: selectedFollowUp.gallery_id,
          followUpRecommendationId: selectedFollowUp.id,
          subject: draftSubject,
          bodyText: draftBody,
          recipientEmail: client.email,
          channel: 'EMAIL',
        }),
      });

      if (res?.success) {
        setDraftSuccess(true);
        setTimeout(() => {
          setDraftModalOpen(false);
          loadClient();
        }, 1200);
      }
    } catch {
      // Error
    } finally {
      setCreatingDraft(false);
    }
  };

  const getEngagementBadgeClass = (state?: ClientEngagementState) => {
    switch (state) {
      case ClientEngagementState.ENGAGED:
        return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
      case ClientEngagementState.ACTIVE:
        return 'bg-blue-500/10 text-blue-400 border-blue-500/20';
      case ClientEngagementState.LOW_ENGAGEMENT:
        return 'bg-amber-500/10 text-amber-400 border-amber-500/20';
      case ClientEngagementState.AT_RISK:
        return 'bg-rose-500/10 text-rose-400 border-rose-500/20';
      case ClientEngagementState.INACTIVE:
        return 'bg-zinc-500/10 text-zinc-400 border-zinc-500/20';
      case ClientEngagementState.COMPLETED:
        return 'bg-purple-500/10 text-purple-400 border-purple-500/20';
      default:
        return 'bg-zinc-500/10 text-zinc-400 border-zinc-500/20';
    }
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center min-h-screen">
        <div className="text-center space-y-3">
          <Loader2 className="h-8 w-8 animate-spin text-indigo-500 mx-auto" />
          <p className="text-sm text-zinc-400">Loading Client 360 profile...</p>
        </div>
      </div>
    );
  }

  if (!client) {
    return (
      <div className="flex-1 p-8 text-center space-y-4">
        <h3 className="text-base font-bold text-white">Client Not Found</h3>
        <p className="text-xs text-zinc-400">This client record may have been permanently deleted.</p>
        <Link
          href="/dashboard/clients"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 text-white text-xs font-semibold"
        >
          <ArrowLeft className="h-4 w-4" /> Back to Clients
        </Link>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col min-h-screen bg-zinc-950 text-zinc-100">
      <DashboardHeader
        title={client.name}
        subtitle={client.company ? `${client.company} • Client 360 Intelligence Profile` : 'Client 360 Intelligence Profile'}
      />

      <main className="flex-1 p-6 sm:p-8 space-y-6 max-w-7xl w-full mx-auto">
        {/* Back Link & Top Bar Actions */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Link
              href="/dashboard/clients"
              className="inline-flex items-center gap-1.5 text-xs text-zinc-400 hover:text-white font-medium transition"
            >
              <ArrowLeft className="h-4 w-4" /> Client Directory
            </Link>
            <span className="text-zinc-600">/</span>
            <Link
              href="/dashboard/clients/intelligence"
              className="inline-flex items-center gap-1 text-xs text-indigo-400 hover:underline font-medium"
            >
              <Sparkles className="w-3.5 h-3.5" /> Intelligence Center
            </Link>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleRecalculateEngagement}
              className="px-3 py-1.5 rounded-lg bg-zinc-900 border border-zinc-800 text-xs font-medium text-zinc-300 hover:text-white transition flex items-center gap-1.5"
            >
              <RefreshCw className="h-3.5 w-3.5" /> Recalculate
            </button>
            <button
              onClick={openAssignModal}
              className="px-3.5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-xs font-semibold text-white transition flex items-center gap-1.5 shadow-sm"
            >
              <Plus className="h-3.5 w-3.5" /> Assign Gallery
            </button>
            <button
              onClick={handleToggleArchive}
              className="px-3 py-1.5 rounded-lg bg-zinc-900 border border-zinc-800 text-xs font-medium text-zinc-400 hover:text-white transition"
            >
              {client.status === 'ARCHIVED' ? 'Restore' : 'Archive'}
            </button>
          </div>
        </div>

        {/* Client Profile Header Card */}
        <div className="p-6 rounded-2xl bg-zinc-900/60 border border-zinc-800/80 space-y-6 shadow-sm">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="h-16 w-16 rounded-2xl bg-indigo-500/20 text-indigo-400 flex items-center justify-center font-bold text-2xl shadow-inner border border-indigo-500/30">
                {client.name.charAt(0).toUpperCase()}
              </div>
              <div className="space-y-1">
                <div className="flex flex-wrap items-center gap-2.5">
                  <h2 className="text-xl font-bold text-white">{client.name}</h2>
                  {client360?.engagement && (
                    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${getEngagementBadgeClass(client360.engagement.state || client360.engagement.engagement_state)}`}>
                      {String(client360.engagement.state || client360.engagement.engagement_state || 'ACTIVE').replace('_', ' ')} ({client360.engagement.engagementScore ?? client360.engagement.engagement_score ?? 0}/100)
                    </span>
                  )}
                  {client360?.journey && (
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-indigo-500/10 text-indigo-300 border border-indigo-500/20">
                      STAGE: {String(client360.journey.currentStage || client360.journey.stage || 'NEW_CLIENT').replace('_', ' ')}
                    </span>
                  )}
                  {(client360?.stats?.isRepeatClient ?? client360?.is_return_client) && (
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                      ★ Repeat Client
                    </span>
                  )}
                </div>
                <div className="flex flex-wrap items-center gap-4 text-xs text-zinc-400">
                  <span className="flex items-center gap-1.5 text-zinc-200">
                    <Mail className="h-3.5 w-3.5 text-zinc-500" /> {client.email}
                  </span>
                  {client.phone && (
                    <span className="flex items-center gap-1.5">
                      <Phone className="h-3.5 w-3.5 text-zinc-500" /> {client.phone}
                    </span>
                  )}
                  {client.company && (
                    <span className="flex items-center gap-1.5">
                      <Building className="h-3.5 w-3.5 text-zinc-500" /> {client.company}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Tags */}
            <div className="flex flex-wrap gap-1.5">
              {client.tags && client.tags.length > 0 ? (
                client.tags.map((tag: string) => (
                  <span
                    key={tag}
                    className="px-2.5 py-1 rounded-lg bg-zinc-950 border border-zinc-800 text-xs text-zinc-400 font-medium"
                  >
                    {tag}
                  </span>
                ))
              ) : (
                <span className="text-xs text-zinc-500 italic">No tags assigned</span>
              )}
            </div>
          </div>

          {/* Quick Metrics Bar */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 pt-4 border-t border-zinc-800/80">
            <div className="p-3.5 rounded-xl bg-zinc-950/60 border border-zinc-800">
              <span className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wider block">Galleries</span>
              <p className="text-xl font-bold text-white mt-0.5">{client360?.stats?.totalGalleries || client.galleries?.length || 0}</p>
            </div>
            <div className="p-3.5 rounded-xl bg-zinc-950/60 border border-zinc-800">
              <span className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wider block">Gallery Visits</span>
              <p className="text-xl font-bold text-blue-400 mt-0.5">{client360?.engagement.totalVisits ?? client360?.engagement.total_gallery_views ?? 0}</p>
            </div>
            <div className="p-3.5 rounded-xl bg-zinc-950/60 border border-zinc-800">
              <span className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wider block">Favorites</span>
              <p className="text-xl font-bold text-amber-400 mt-0.5">{client360?.engagement.totalFavorites ?? client360?.engagement.total_favorites ?? client.stats?.total_favorites ?? 0}</p>
            </div>
            <div className="p-3.5 rounded-xl bg-zinc-950/60 border border-zinc-800">
              <span className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wider block">Selections</span>
              <p className="text-xl font-bold text-purple-400 mt-0.5">{client360?.engagement.totalSelections ?? client360?.engagement.total_selections ?? client.stats?.total_selections ?? 0}</p>
            </div>
            <div className="p-3.5 rounded-xl bg-zinc-950/60 border border-zinc-800">
              <span className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wider block">Downloads</span>
              <p className="text-xl font-bold text-emerald-400 mt-0.5">{client360?.engagement.totalDownloads ?? client360?.engagement.total_downloads ?? client.stats?.total_downloads ?? 0}</p>
            </div>
            <div className="p-3.5 rounded-xl bg-zinc-950/60 border border-zinc-800">
              <span className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wider block">Last Active</span>
              <p className="text-xs font-semibold text-zinc-300 mt-2 truncate">
                {(client360?.stats?.lastActiveAt || client360?.engagement.last_activity_at) ? formatDate(new Date((client360?.stats?.lastActiveAt || client360?.engagement.last_activity_at)!)) : '—'}
              </p>
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-2 border-b border-zinc-800/80 pb-3 text-xs font-semibold overflow-x-auto">
          <button
            onClick={() => setActiveTab('360')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl transition ${
              activeTab === '360' ? 'bg-indigo-600 text-white shadow-sm' : 'text-zinc-400 hover:text-white hover:bg-zinc-900'
            }`}
          >
            <Compass className="h-4 w-4" /> Client 360 Overview
          </button>
          <button
            onClick={() => setActiveTab('galleries')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl transition ${
              activeTab === 'galleries' ? 'bg-indigo-600 text-white shadow-sm' : 'text-zinc-400 hover:text-white hover:bg-zinc-900'
            }`}
          >
            <Images className="h-4 w-4" /> Galleries ({client360?.galleries.length || client.galleries?.length || 0})
          </button>
          <button
            onClick={() => setActiveTab('activity')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl transition ${
              activeTab === 'activity' ? 'bg-indigo-600 text-white shadow-sm' : 'text-zinc-400 hover:text-white hover:bg-zinc-900'
            }`}
          >
            <Clock className="h-4 w-4" /> Activity Timeline
          </button>
          <button
            onClick={() => setActiveTab('insights')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl transition ${
              activeTab === 'insights' ? 'bg-indigo-600 text-white shadow-sm' : 'text-zinc-400 hover:text-white hover:bg-zinc-900'
            }`}
          >
            <Sparkles className="h-4 w-4" /> Insights & Follow-ups ({client360?.activeFollowUps?.length || client360?.follow_ups?.length || 0})
          </button>
          <button
            onClick={() => setActiveTab('communications')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl transition ${
              activeTab === 'communications' ? 'bg-indigo-600 text-white shadow-sm' : 'text-zinc-400 hover:text-white hover:bg-zinc-900'
            }`}
          >
            <Send className="h-4 w-4" /> Communications ({client360?.pendingDrafts?.length || client360?.communications?.length || 0})
          </button>
          <button
            onClick={() => setActiveTab('notes')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl transition ${
              activeTab === 'notes' ? 'bg-indigo-600 text-white shadow-sm' : 'text-zinc-400 hover:text-white hover:bg-zinc-900'
            }`}
          >
            <FileText className="h-4 w-4" /> Private Notes & Tags
          </button>
        </div>

        {/* TAB 1: 360 OVERVIEW */}
        {activeTab === '360' && client360 && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Engagement Score Components */}
              <div className="bg-zinc-900/60 border border-zinc-800/80 rounded-2xl p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-emerald-400" /> Engagement Index
                  </h3>
                  <span className="text-xs font-bold text-emerald-400">
                    {client360.engagement.engagementScore ?? client360.engagement.engagement_score ?? 0} / 100
                  </span>
                </div>

                <div className="space-y-3 text-xs">
                  <div>
                    <div className="flex justify-between text-zinc-400 mb-1">
                      <span>Visit Volume</span>
                      <span className="text-white font-medium">
                        {client360.engagement.scoreComponents?.visitsScore ?? Math.min(30, (client360.engagement.total_gallery_views || 0) * 3)}/30 pts
                      </span>
                    </div>
                    <div className="w-full bg-zinc-800 h-1.5 rounded-full overflow-hidden">
                      <div className="bg-blue-500 h-full rounded-full" style={{ width: `${((client360.engagement.scoreComponents?.visitsScore ?? Math.min(30, (client360.engagement.total_gallery_views || 0) * 3)) / 30) * 100}%` }} />
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between text-zinc-400 mb-1">
                      <span>Photo Curation (Favorites & Selections)</span>
                      <span className="text-white font-medium">
                        {client360.engagement.scoreComponents?.curationScore ?? Math.min(35, ((client360.engagement.total_favorites || 0) * 2 + (client360.engagement.total_selections || 0) * 3))}/35 pts
                      </span>
                    </div>
                    <div className="w-full bg-zinc-800 h-1.5 rounded-full overflow-hidden">
                      <div className="bg-purple-500 h-full rounded-full" style={{ width: `${((client360.engagement.scoreComponents?.curationScore ?? Math.min(35, ((client360.engagement.total_favorites || 0) * 2 + (client360.engagement.total_selections || 0) * 3))) / 35) * 100}%` }} />
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between text-zinc-400 mb-1">
                      <span>Download Completion</span>
                      <span className="text-white font-medium">
                        {client360.engagement.scoreComponents?.downloadScore ?? Math.min(35, (client360.engagement.total_downloads || 0) * 5)}/35 pts
                      </span>
                    </div>
                    <div className="w-full bg-zinc-800 h-1.5 rounded-full overflow-hidden">
                      <div className="bg-emerald-500 h-full rounded-full" style={{ width: `${((client360.engagement.scoreComponents?.downloadScore ?? Math.min(35, (client360.engagement.total_downloads || 0) * 5)) / 35) * 100}%` }} />
                    </div>
                  </div>

                  <div className="pt-2 border-t border-zinc-800 flex justify-between text-zinc-500">
                    <span>Recency Decay Multiplier</span>
                    <span className="text-zinc-300 font-medium">
                      {client360.engagement.scoreComponents?.recencyMultiplier ?? 1.0}x ({client360.engagement.recencyCategory || 'Recent'})
                    </span>
                  </div>
                </div>
              </div>

              {/* Journey State */}
              <div className="bg-zinc-900/60 border border-zinc-800/80 rounded-2xl p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                    <Compass className="w-4 h-4 text-indigo-400" /> Lifecycle Journey
                  </h3>
                  <span className="text-xs font-semibold text-indigo-300 uppercase">
                    {String(client360.journey.currentStage || client360.journey.stage || 'NEW_CLIENT').replace('_', ' ')}
                  </span>
                </div>

                <div className="space-y-3 text-xs">
                  <div className="p-3 rounded-xl bg-zinc-950 border border-zinc-800 space-y-1">
                    <span className="text-zinc-500 text-[11px] block">Current Stage Entered</span>
                    <span className="text-white font-medium">
                      {formatDate(new Date(client360.journey.enteredStageAt || client360.journey.entered_at || new Date()))}
                    </span>
                  </div>

                  <div className="p-3 rounded-xl bg-zinc-950 border border-zinc-800 space-y-1">
                    <span className="text-zinc-500 text-[11px] block">Stage History</span>
                    <div className="flex flex-wrap items-center gap-1.5 mt-1">
                      {(client360.journey.stageTransitions || [{ toStage: client360.journey.stage || 'NEW_CLIENT' }]).map((t, idx) => (
                        <React.Fragment key={idx}>
                          <span className="text-[10px] bg-zinc-800 text-zinc-300 px-2 py-0.5 rounded">
                            {t.toStage}
                          </span>
                          {idx < (client360.journey.stageTransitions?.length || 1) - 1 && (
                            <ChevronRight className="w-3 h-3 text-zinc-600" />
                          )}
                        </React.Fragment>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Quick Insights List */}
            {client360.insights.length > 0 && (
              <div className="bg-zinc-900/60 border border-zinc-800/80 rounded-2xl p-5 space-y-4">
                <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-indigo-400" /> Active Insights
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {client360.insights.map((insight) => (
                    <div key={insight.id} className="bg-zinc-950 border border-zinc-800 rounded-xl p-3.5 space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-white">{insight.title}</span>
                        <span className="text-[10px] px-2 py-0.5 rounded uppercase font-bold bg-zinc-800 text-zinc-400">
                          {insight.severity}
                        </span>
                      </div>
                      <p className="text-xs text-zinc-400">{insight.message}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB 2: GALLERIES */}
        {activeTab === 'galleries' && (
          <div className="space-y-4">
            {(!client360?.galleries || client360.galleries.length === 0) ? (
              <div className="p-12 text-center rounded-2xl bg-zinc-900/60 border border-zinc-800 space-y-4">
                <Images className="h-10 w-10 text-zinc-600 mx-auto" />
                <div className="space-y-1">
                  <h4 className="text-sm font-semibold text-white">No galleries assigned to this client</h4>
                  <p className="text-xs text-zinc-400 max-w-sm mx-auto">
                    Assign existing galleries or deliver new photo collections to connect client activity.
                  </p>
                </div>
                <button
                  onClick={openAssignModal}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 text-white text-xs font-semibold hover:bg-indigo-500 transition"
                >
                  <Plus className="h-3.5 w-3.5" /> Assign Gallery
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {client360.galleries.map((g) => {
                  const galId = g.gallery_id || g.galleryId || '';
                  const galTitle = g.gallery_title || g.galleryTitle || 'Gallery';
                  const galStatus = g.gallery_status || g.galleryStatus || 'PUBLISHED';
                  return (
                    <div
                      key={galId}
                      className="p-5 rounded-2xl bg-zinc-900/60 border border-zinc-800/80 flex flex-col justify-between space-y-4 hover:border-zinc-700 transition"
                    >
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-zinc-800 text-zinc-300">
                            {galStatus}
                          </span>
                          <button
                            onClick={() => handleUnassignGallery(galId, galTitle)}
                            className="text-zinc-500 hover:text-rose-400 transition p-1"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                        <h4 className="text-base font-bold text-white truncate">{galTitle}</h4>
                      </div>

                      <div className="grid grid-cols-4 gap-2 text-center py-2 border-y border-zinc-800/80 text-xs">
                        <div>
                          <span className="text-[10px] text-zinc-500 block">Visits</span>
                          <span className="font-semibold text-white">{g.visitCount ?? g.views_count ?? 0}</span>
                        </div>
                        <div>
                          <span className="text-[10px] text-zinc-500 block">Favs</span>
                          <span className="font-semibold text-amber-400">{g.favoriteCount ?? g.favorites_count ?? 0}</span>
                        </div>
                        <div>
                          <span className="text-[10px] text-zinc-500 block">Selects</span>
                          <span className="font-semibold text-purple-400">{g.selectionCount ?? g.selections_count ?? 0}</span>
                        </div>
                        <div>
                          <span className="text-[10px] text-zinc-500 block">Dl</span>
                          <span className="font-semibold text-emerald-400">{g.downloadCount ?? g.downloads_count ?? 0}</span>
                        </div>
                      </div>

                      <div className="flex items-center justify-between pt-1">
                        <Link
                          href={`/dashboard/galleries/${galId}`}
                          className="text-xs font-semibold text-indigo-400 hover:underline flex items-center gap-1"
                        >
                          Manage Gallery <ExternalLink className="w-3 h-3" />
                        </Link>
                        <button
                          onClick={() => openSendModalForGallery(galId, galTitle)}
                          className="px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-xs font-semibold text-white flex items-center gap-1.5 transition"
                        >
                          <Send className="w-3 h-3 text-indigo-400" /> Send
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* TAB 3: ACTIVITY TIMELINE */}
        {activeTab === 'activity' && (
          <div className="bg-zinc-900/60 border border-zinc-800/80 rounded-2xl p-6 space-y-4">
            <h3 className="text-sm font-semibold text-white flex items-center gap-2">
              <Clock className="w-4 h-4 text-indigo-400" /> Activity History
            </h3>
            {activitiesLoading ? (
              <div className="py-8 text-center text-zinc-500 text-xs">Loading activity timeline...</div>
            ) : activities.length === 0 ? (
              <div className="py-8 text-center text-zinc-500 text-xs">No client events logged yet.</div>
            ) : (
              <div className="divide-y divide-zinc-800/60">
                {activities.map((act, i) => (
                  <div key={i} className="py-3 flex items-start justify-between gap-4 text-xs">
                    <div className="space-y-0.5">
                      <span className="font-semibold text-white">{act.title || act.action || act.activity_type}</span>
                      {(act.description || act.metadata?.description) && <p className="text-zinc-400">{act.description || act.metadata?.description}</p>}
                    </div>
                    <span className="text-zinc-500 whitespace-nowrap">{formatDate(new Date(act.timestamp || act.createdAt || act.created_at || new Date()))}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 4: INSIGHTS & FOLLOW-UPS */}
        {activeTab === 'insights' && client360 && (
          <div className="space-y-6">
            <div className="bg-zinc-900/60 border border-zinc-800/80 rounded-2xl p-6 space-y-4">
              <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-400" /> Pending Follow-up Recommendations
              </h3>
              {(!client360.activeFollowUps || client360.activeFollowUps.length === 0) && (!client360.follow_ups || client360.follow_ups.length === 0) ? (
                <p className="text-xs text-zinc-500">No active follow-ups for this client.</p>
              ) : (
                <div className="space-y-3">
                  {(client360.activeFollowUps || client360.follow_ups || []).map((f) => (
                    <div key={f.id} className="p-4 rounded-xl bg-zinc-950 border border-zinc-800 flex items-center justify-between gap-4">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-zinc-800 text-amber-400 border border-amber-500/20">
                            {f.priority}
                          </span>
                          <span className="text-xs font-semibold text-white">{f.title}</span>
                        </div>
                        <p className="text-xs text-zinc-400">{f.description || f.reason}</p>
                      </div>
                      <button
                        onClick={() => openDraftForFollowUp(f)}
                        className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition"
                      >
                        <Send className="w-3 h-3" /> Draft Message
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 5: COMMUNICATIONS */}
        {activeTab === 'communications' && client360 && (
          <div className="bg-zinc-900/60 border border-zinc-800/80 rounded-2xl p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                <Send className="w-4 h-4 text-indigo-400" /> Communication History & Drafts
              </h3>
              <Link
                href="/dashboard/clients/communications"
                className="text-xs text-indigo-400 hover:underline flex items-center gap-1"
              >
                Go to Communication Center <ExternalLink className="w-3 h-3" />
              </Link>
            </div>

            {(!client360.pendingDrafts || client360.pendingDrafts.length === 0) && (!client360.communications || client360.communications.length === 0) ? (
              <p className="text-xs text-zinc-500">No active communication drafts for this client.</p>
            ) : (
              <div className="space-y-3">
                {(client360.pendingDrafts || client360.communications || []).map((d) => (
                  <div key={d.id} className="p-4 rounded-xl bg-zinc-950 border border-zinc-800 flex items-center justify-between gap-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-zinc-800 text-indigo-400">
                          {d.status}
                        </span>
                        <span className="text-xs font-semibold text-white">{d.subject || 'Draft Message'}</span>
                      </div>
                      <p className="text-xs text-zinc-400 line-clamp-1">{d.bodyText || d.body}</p>
                    </div>
                    <Link
                      href="/dashboard/clients/communications"
                      className="px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-white rounded-lg text-xs font-medium transition"
                    >
                      Review
                    </Link>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 6: NOTES & TAGS */}
        {activeTab === 'notes' && (
          <div className="bg-zinc-900/60 border border-zinc-800/80 rounded-2xl p-6 space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                <FileText className="w-4 h-4 text-indigo-400" /> Private Studio Notes
              </h3>
              {!isEditingNotes && (
                <button
                  onClick={() => setIsEditingNotes(true)}
                  className="px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-xs font-medium text-white transition flex items-center gap-1.5"
                >
                  <Edit2 className="w-3.5 h-3.5" /> Edit Details
                </button>
              )}
            </div>

            {isEditingNotes ? (
              <div className="space-y-4 text-xs">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-zinc-400 mb-1">Company</label>
                    <input
                      type="text"
                      value={editCompany}
                      onChange={(e) => setEditCompany(e.target.value)}
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-zinc-400 mb-1">Phone</label>
                    <input
                      type="text"
                      value={editPhone}
                      onChange={(e) => setEditPhone(e.target.value)}
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-white"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-zinc-400 mb-1">Tags (comma separated)</label>
                  <input
                    type="text"
                    value={editTags}
                    onChange={(e) => setEditTags(e.target.value)}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-white"
                  />
                </div>

                <div>
                  <label className="block text-zinc-400 mb-1">Private Notes</label>
                  <textarea
                    rows={5}
                    value={editNotes}
                    onChange={(e) => setEditNotes(e.target.value)}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-3 text-white resize-none"
                  />
                </div>

                <div className="flex justify-end gap-2">
                  <button
                    onClick={() => setIsEditingNotes(false)}
                    className="px-3 py-1.5 text-zinc-400 hover:text-white"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSaveDetails}
                    disabled={savingNotes}
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg font-semibold"
                  >
                    {savingNotes ? 'Saving...' : 'Save Notes'}
                  </button>
                </div>
              </div>
            ) : (
              <div className="text-xs space-y-4">
                <div className="p-4 rounded-xl bg-zinc-950 border border-zinc-800 text-zinc-300 whitespace-pre-wrap">
                  {client.notes || 'No private notes added yet.'}
                </div>
              </div>
            )}
          </div>
        )}
      </main>

      {/* Assign Gallery Modal */}
      {showAssignModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <h3 className="text-base font-semibold text-white">Assign Gallery to {client.name}</h3>
            <select
              value={selectedAssignGalleryId}
              onChange={(e) => setSelectedAssignGalleryId(e.target.value)}
              className="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-2.5 text-xs text-white"
            >
              {allGalleries.map((g) => (
                <option key={g.id} value={g.id}>{g.title}</option>
              ))}
            </select>
            <div className="flex justify-end gap-2 pt-2">
              <button onClick={() => setShowAssignModal(false)} className="px-3 py-1.5 text-xs text-zinc-400">Cancel</button>
              <button onClick={handleAssignGallery} disabled={assigningGallery} className="px-4 py-2 bg-indigo-600 text-white text-xs font-semibold rounded-lg">
                {assigningGallery ? 'Assigning...' : 'Assign Gallery'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Send Delivery Modal */}
      {showSendModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <h3 className="text-base font-semibold text-white">Send Gallery Delivery</h3>
            <p className="text-xs text-zinc-400">Recipient: {client.email}</p>
            <textarea
              rows={4}
              value={customMessage}
              onChange={(e) => setCustomMessage(e.target.value)}
              className="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-2.5 text-xs text-white resize-none"
            />
            <div className="flex justify-end gap-2 pt-2">
              <button onClick={() => setShowSendModal(false)} className="px-3 py-1.5 text-xs text-zinc-400">Cancel</button>
              <button onClick={handleSendDelivery} disabled={sendingDelivery} className="px-4 py-2 bg-indigo-600 text-white text-xs font-semibold rounded-lg">
                {sendingDelivery ? 'Sending...' : 'Send Delivery'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Message Draft Modal */}
      {draftModalOpen && selectedFollowUp && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-base font-semibold text-white">Draft Follow-up Message</h3>
              <button onClick={() => setDraftModalOpen(false)} className="text-zinc-400"><X className="w-4 h-4" /></button>
            </div>
            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-zinc-400 mb-1">Subject</label>
                <input
                  type="text"
                  value={draftSubject}
                  onChange={(e) => setDraftSubject(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-2 text-white"
                />
              </div>
              <div>
                <label className="block text-zinc-400 mb-1">Body</label>
                <textarea
                  rows={5}
                  value={draftBody}
                  onChange={(e) => setDraftBody(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-2 text-white font-mono"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button onClick={() => setDraftModalOpen(false)} className="px-3 py-1.5 text-xs text-zinc-400">Cancel</button>
              <button onClick={handleSaveDraft} disabled={creatingDraft || draftSuccess} className="px-4 py-2 bg-indigo-600 text-white text-xs font-semibold rounded-lg">
                {draftSuccess ? 'Saved to Review Queue!' : creatingDraft ? 'Saving...' : 'Save Draft'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
