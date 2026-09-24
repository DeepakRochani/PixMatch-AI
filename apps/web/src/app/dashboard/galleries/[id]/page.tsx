'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { DashboardHeader } from '@/components/layout/DashboardHeader';
import { fetchApi } from '@/lib/api-client';
import { formatBytes, formatDate } from '@pixmatch/ui';
import { BulkUploadModal } from '@/components/dashboard/BulkUploadModal';
import { PhotoDetailModal, PhotoItem } from '@/components/dashboard/PhotoDetailModal';
import { ShareModal } from '@/components/dashboard/ShareModal';
import { ConfirmationModal } from '@/components/dashboard/ConfirmationModal';
import { AiIntelligenceCenter } from '@/components/dashboard/AiIntelligenceCenter';
import {
  LayoutDashboard,
  Images,
  FolderPlus,
  Sparkles,
  Users,
  Heart,
  CheckSquare,
  DownloadCloud,
  Activity,
  Settings,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  Share2,
  UploadCloud,
  Search,
  Filter,
  ArrowUpDown,
  MoreVertical,
  CheckCircle2,
  AlertCircle,
  Clock,
  Loader2,
  Trash2,
  Star,
  RefreshCw,
  Sliders,
  Lock,
  Globe,
  Archive,
  Copy,
  Plus,
  Edit2,
  Eye,
  FileSpreadsheet,
  Check,
  X,
  ShieldCheck,
  AlertTriangle,
  Send,
  Mail,
  Building,
  Tag
} from 'lucide-react';


interface AlbumItem {
  id: string;
  title: string;
  description?: string | null;
  sort_order: number;
  cover_photo_id?: string | null;
  _count?: { photos: number };
  created_at: string;
}

type TabType =
  | 'overview'
  | 'photos'
  | 'albums'
  | 'ai'
  | 'clients'
  | 'favorites'
  | 'selections'
  | 'downloads'
  | 'activity'
  | 'settings';

export default function GalleryWorkspacePage() {
  const params = useParams();
  const router = useRouter();
  const galleryId = params?.id as string;

  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const [gallery, setGallery] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Overview stats state
  const [overviewStats, setOverviewStats] = useState<any>(null);

  // Photos state
  const [photos, setPhotos] = useState<PhotoItem[]>([]);
  const [photosLoading, setPhotosLoading] = useState(false);
  const [photoSearch, setPhotoSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [aiFilter, setAiFilter] = useState('ALL');
  const [albumFilter, setAlbumFilter] = useState('ALL');
  const [sortOption, setSortOption] = useState('NEWEST');
  const [selectedPhotoIds, setSelectedPhotoIds] = useState<string[]>([]);
  const [inspectPhoto, setInspectPhoto] = useState<PhotoItem | null>(null);

  // Albums state
  const [albums, setAlbums] = useState<AlbumItem[]>([]);
  const [showCreateAlbumModal, setShowCreateAlbumModal] = useState(false);
  const [newAlbumTitle, setNewAlbumTitle] = useState('');
  const [newAlbumDesc, setNewAlbumDesc] = useState('');
  const [creatingAlbum, setCreatingAlbum] = useState(false);
  const [editingAlbum, setEditingAlbum] = useState<AlbumItem | null>(null);

  // Modals state
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [confirmModalConfig, setConfirmModalConfig] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    confirmLabel?: string;
    isDestructive?: boolean;
    onConfirm: () => Promise<void> | void;
  }>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: async () => {},
  });

  // Client activities, Favorites, Selections, Downloads & Delivery
  const [favoritesData, setFavoritesData] = useState<any[]>([]);
  const [selectionsData, setSelectionsData] = useState<any[]>([]);
  const [downloadsData, setDownloadsData] = useState<any[]>([]);
  const [activityData, setActivityData] = useState<any[]>([]);
  const [activityLoading, setActivityLoading] = useState(false);
  const [deliveryInfo, setDeliveryInfo] = useState<any>(null);
  const [showDeliveryModal, setShowDeliveryModal] = useState(false);
  const [showAssignClientModal, setShowAssignClientModal] = useState(false);
  const [showReminderModal, setShowReminderModal] = useState(false);
  const [allStudioClients, setAllStudioClients] = useState<any[]>([]);
  const [selectedAssignClientId, setSelectedAssignClientId] = useState('');
  const [deliveryRecipientEmail, setDeliveryRecipientEmail] = useState('');
  const [deliveryRecipientName, setDeliveryRecipientName] = useState('');
  const [deliveryCustomMessage, setDeliveryCustomMessage] = useState('');
  const [sendingDelivery, setSendingDelivery] = useState(false);
  const [deliveryActionSuccess, setDeliveryActionSuccess] = useState<string | null>(null);

  // Settings form state
  const [settingsTitle, setSettingsTitle] = useState('');
  const [settingsEventType, setSettingsEventType] = useState('Wedding');
  const [settingsDescription, setSettingsDescription] = useState('');
  const [settingsAccessType, setSettingsAccessType] = useState('PUBLIC');
  const [settingsPassword, setSettingsPassword] = useState('');
  const [settingsExpiresAt, setSettingsExpiresAt] = useState('');
  const [settingsEnableAi, setSettingsEnableAi] = useState(true);
  const [settingsSensitivity, setSettingsSensitivity] = useState(0.58);
  const [settingsDownloadsEnabled, setSettingsDownloadsEnabled] = useState(true);
  const [settingsDownloadOriginals, setSettingsDownloadOriginals] = useState(true);
  const [settingsBulkDownload, setSettingsBulkDownload] = useState(true);
  const [settingsWatermarkMode, setSettingsWatermarkMode] = useState('NONE');
  const [savingSettings, setSavingSettings] = useState(false);
  const [settingsMsg, setSettingsMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Load Main Gallery Record
  const loadGallery = useCallback(async () => {
    try {
      const res = await fetchApi(`/galleries/${galleryId}`);
      if (res.success && res.data) {
        const gal = res.data;
        setGallery(gal);
        setSettingsTitle(gal.title || '');
        setSettingsEventType(gal.event_type || 'Wedding');
        setSettingsDescription(gal.description || '');
        setSettingsAccessType(gal.access_type || 'PUBLIC');
        setSettingsExpiresAt(gal.expires_at ? new Date(gal.expires_at).toISOString().split('T')[0] : '');
        setSettingsEnableAi(gal.enable_ai_face_search !== false);
        setSettingsSensitivity(gal.face_match_sensitivity ? Number(gal.face_match_sensitivity) : 0.58);
        setSettingsDownloadsEnabled(gal.downloads_enabled !== false);
        setSettingsDownloadOriginals(gal.download_originals_enabled !== false);
        setSettingsBulkDownload(gal.bulk_download_enabled !== false);
        setSettingsWatermarkMode(gal.watermark_mode || 'NONE');
      }
    } catch {
      // Handle error
    } finally {
      setLoading(false);
    }
  }, [galleryId]);

  // Load Overview Data
  const loadOverview = useCallback(async () => {
    try {
      const res = await fetchApi(`/galleries/${galleryId}/overview`);
      if (res.success && res.data) {
        setOverviewStats(res.data);
      }
    } catch {
      // Fallback
    }
  }, [galleryId]);

  // Load Photos with Filters
  const loadPhotos = useCallback(async () => {
    setPhotosLoading(true);
    try {
      const queryParams = new URLSearchParams();
      if (photoSearch) queryParams.set('search', photoSearch);
      if (statusFilter !== 'ALL') queryParams.set('status', statusFilter);
      if (aiFilter !== 'ALL') queryParams.set('ai_status', aiFilter);
      if (albumFilter !== 'ALL') queryParams.set('album_id', albumFilter);
      if (sortOption) queryParams.set('sort', sortOption);
      queryParams.set('limit', '100');

      const res = await fetchApi(`/galleries/${galleryId}/photos?${queryParams.toString()}`);
      if (res.success && res.data) {
        const list = Array.isArray(res.data) ? res.data : res.data.photos || [];
        setPhotos(list);
      }
    } catch {
      // Fallback
    } finally {
      setPhotosLoading(false);
    }
  }, [galleryId, photoSearch, statusFilter, aiFilter, albumFilter, sortOption]);

  // Load Albums
  const loadAlbums = useCallback(async () => {
    try {
      const res = await fetchApi(`/galleries/${galleryId}/albums`);
      if (res.success && res.data) {
        setAlbums(Array.isArray(res.data) ? res.data : res.data.albums || []);
      }
    } catch {
      // Fallback
    }
  }, [galleryId]);

  // Load Tab Specific Data
  const loadTabData = useCallback(async (tab: TabType) => {
    if (tab === 'favorites') {
      try {
        const res = await fetchApi(`/galleries/${galleryId}/favorites`);
        if (res.success && res.data) setFavoritesData(res.data.favorites || res.data || []);
      } catch {}
    } else if (tab === 'selections') {
      try {
        const res = await fetchApi(`/galleries/${galleryId}/selections`);
        if (res.success && res.data) setSelectionsData(res.data.selections || res.data || []);
      } catch {}
    } else if (tab === 'downloads') {
      try {
        const res = await fetchApi(`/galleries/${galleryId}/downloads`);
        if (res.success && res.data) setDownloadsData(res.data.downloads || res.data || []);
      } catch {}
    } else if (tab === 'activity') {
      setActivityLoading(true);
      try {
        const res = await fetchApi(`/galleries/${galleryId}/activity`);
        if (res.success && res.data) setActivityData(res.data.activities || res.data || []);
      } catch {} finally {
        setActivityLoading(false);
      }
    } else if (tab === 'clients') {
      setActivityLoading(true);
      try {
        const [delivRes, actRes] = await Promise.all([
          fetchApi(`/galleries/${galleryId}/delivery`),
          fetchApi(`/galleries/${galleryId}/delivery/activity`),
        ]);
        if (delivRes.success && delivRes.data) setDeliveryInfo(delivRes.data);
        if (actRes.success && actRes.data) setActivityData(actRes.data || []);
      } catch {} finally {
        setActivityLoading(false);
      }
    }
  }, [galleryId]);

  // Delivery & Client Assignment Handlers
  const openAssignClientModalHandler = async () => {
    setShowAssignClientModal(true);
    try {
      const res = await fetchApi('/clients?limit=50&status=ACTIVE');
      if (res.success && res.data?.clients) {
        setAllStudioClients(res.data.clients);
        if (res.data.clients.length > 0) {
          setSelectedAssignClientId(res.data.clients[0].id);
        }
      }
    } catch {}
  };

  const handleAssignClientToGallery = async () => {
    if (!selectedAssignClientId) return;
    setSendingDelivery(true);
    try {
      const res = await fetchApi(`/galleries/${galleryId}/assign-client`, {
        method: 'POST',
        body: JSON.stringify({ client_id: selectedAssignClientId, relationship_type: 'PRIMARY' }),
      });
      if (res.success) {
        setShowAssignClientModal(false);
        loadTabData('clients');
      }
    } catch {} finally {
      setSendingDelivery(false);
    }
  };

  const handleUnassignClientFromGallery = async (clientId: string) => {
    if (confirm('Unassign this client from the gallery?')) {
      await fetchApi(`/galleries/${galleryId}/unassign-client/${clientId}`, { method: 'DELETE' });
      loadTabData('clients');
    }
  };

  const openDeliveryModalHandler = () => {
    setShowDeliveryModal(true);
    setDeliveryActionSuccess(null);
    if (deliveryInfo?.assigned_clients?.[0]) {
      setDeliveryRecipientEmail(deliveryInfo.assigned_clients[0].email);
      setDeliveryRecipientName(deliveryInfo.assigned_clients[0].name);
    }
    setDeliveryCustomMessage(`Hi, your photos for "${gallery?.title || 'your gallery'}" are ready to view!`);
  };

  const handleSendGalleryDelivery = async () => {
    if (!deliveryRecipientEmail) return;
    setSendingDelivery(true);
    try {
      const res = await fetchApi(`/galleries/${galleryId}/delivery/send`, {
        method: 'POST',
        body: JSON.stringify({
          recipient_email: deliveryRecipientEmail,
          recipient_name: deliveryRecipientName,
          custom_message: deliveryCustomMessage,
          send_email: true,
          idempotency_key: `delivery-${galleryId}-${Date.now()}`,
        }),
      });
      if (res.success) {
        setDeliveryActionSuccess('Invitation email dispatched successfully!');
        setTimeout(() => {
          setShowDeliveryModal(false);
          loadTabData('clients');
        }, 1500);
      }
    } catch {} finally {
      setSendingDelivery(false);
    }
  };

  const handleSendGalleryReminder = async (clientId?: string) => {
    setSendingDelivery(true);
    try {
      const res = await fetchApi(`/galleries/${galleryId}/delivery/reminder`, {
        method: 'POST',
        body: JSON.stringify({ client_id: clientId }),
      });
      if (res.success) {
        setDeliveryActionSuccess('Reminder email dispatched successfully!');
        loadTabData('clients');
        setTimeout(() => setDeliveryActionSuccess(null), 3000);
      }
    } catch {} finally {
      setSendingDelivery(false);
    }
  };

  useEffect(() => {
    loadGallery();
    loadOverview();
    loadAlbums();
    loadPhotos();
  }, [loadGallery, loadOverview, loadAlbums, loadPhotos]);

  useEffect(() => {
    loadTabData(activeTab);
  }, [activeTab, loadTabData]);

  // Batch Selection Helpers
  const toggleSelectAll = () => {
    if (selectedPhotoIds.length === photos.length) {
      setSelectedPhotoIds([]);
    } else {
      setSelectedPhotoIds(photos.map((p) => p.id));
    }
  };

  const toggleSelectPhoto = (id: string) => {
    setSelectedPhotoIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  // Bulk Actions
  const handleBulkAction = async (action: 'DELETE' | 'MOVE_ALBUM' | 'REPROCESS' | 'REINDEX', targetAlbumId?: string) => {
    if (selectedPhotoIds.length === 0) return;

    if (action === 'DELETE') {
      setConfirmModalConfig({
        isOpen: true,
        title: `Delete ${selectedPhotoIds.length} Photos?`,
        message: 'This will permanently delete the original high-resolution master files and all thumbnail derivatives. This action cannot be undone.',
        confirmLabel: 'Delete Photos',
        isDestructive: true,
        onConfirm: async () => {
          await fetchApi(`/galleries/${galleryId}/photos/bulk-action`, {
            method: 'POST',
            body: JSON.stringify({ action: 'DELETE', photo_ids: selectedPhotoIds }),
          });
          setSelectedPhotoIds([]);
          loadPhotos();
          loadOverview();
        },
      });
      return;
    }

    try {
      await fetchApi(`/galleries/${galleryId}/photos/bulk-action`, {
        method: 'POST',
        body: JSON.stringify({
          action,
          photo_ids: selectedPhotoIds,
          target_album_id: targetAlbumId,
        }),
      });
      setSelectedPhotoIds([]);
      loadPhotos();
      loadOverview();
    } catch {
      // Error handling
    }
  };

  // Cover photo set
  const handleSetCover = async (photoId: string) => {
    try {
      await fetchApi(`/galleries/${galleryId}/cover`, {
        method: 'PUT',
        body: JSON.stringify({ cover_photo_id: photoId }),
      });
      loadGallery();
      loadPhotos();
    } catch {}
  };

  // Create Album
  const handleCreateAlbum = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAlbumTitle.trim()) return;
    setCreatingAlbum(true);
    try {
      const res = await fetchApi(`/galleries/${galleryId}/albums`, {
        method: 'POST',
        body: JSON.stringify({
          title: newAlbumTitle.trim(),
          description: newAlbumDesc.trim() || undefined,
        }),
      });
      if (res.success) {
        setNewAlbumTitle('');
        setNewAlbumDesc('');
        setShowCreateAlbumModal(false);
        loadAlbums();
      }
    } catch {} finally {
      setCreatingAlbum(false);
    }
  };

  // Delete Album
  const handleDeleteAlbum = async (albumId: string) => {
    setConfirmModalConfig({
      isOpen: true,
      title: 'Delete Album?',
      message: 'Photos within this album will not be deleted; they will simply be unassigned to general gallery storage.',
      confirmLabel: 'Delete Album',
      isDestructive: true,
      onConfirm: async () => {
        await fetchApi(`/galleries/${galleryId}/albums/${albumId}`, { method: 'DELETE' });
        loadAlbums();
        loadPhotos();
      },
    });
  };

  // Save Settings
  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingSettings(true);
    setSettingsMsg(null);

    try {
      const payload: Record<string, any> = {
        title: settingsTitle,
        event_type: settingsEventType,
        description: settingsDescription,
        access_type: settingsAccessType,
        is_unlisted: settingsAccessType === 'UNLISTED',
        expires_at: settingsExpiresAt ? new Date(settingsExpiresAt).toISOString() : null,
        enable_ai_face_search: settingsEnableAi,
        face_match_sensitivity: settingsSensitivity,
        downloads_enabled: settingsDownloadsEnabled,
        download_originals_enabled: settingsDownloadOriginals,
        bulk_download_enabled: settingsBulkDownload,
        watermark_mode: settingsWatermarkMode,
      };

      if (settingsAccessType === 'PASSWORD' && settingsPassword.trim()) {
        payload.password = settingsPassword.trim();
      }

      const res = await fetchApi(`/galleries/${galleryId}`, {
        method: 'PUT',
        body: JSON.stringify(payload),
      });

      if (res.success) {
        setSettingsMsg({ type: 'success', text: 'Gallery settings updated successfully!' });
        loadGallery();
      } else {
        setSettingsMsg({ type: 'error', text: res.error?.message || 'Failed to save settings.' });
      }
    } catch (err: any) {
      setSettingsMsg({ type: 'error', text: err.message || 'Error updating settings.' });
    } finally {
      setSavingSettings(false);
    }
  };

  // Archive Gallery
  const handleArchiveGallery = async () => {
    setConfirmModalConfig({
      isOpen: true,
      title: 'Archive Gallery?',
      message: 'This gallery will be hidden from your active list and client search until restored.',
      confirmLabel: 'Archive',
      isDestructive: false,
      onConfirm: async () => {
        await fetchApi(`/galleries/${galleryId}/archive`, { method: 'POST' });
        router.push('/dashboard/galleries');
      },
    });
  };

  // Duplicate Gallery
  const handleDuplicateGallery = async () => {
    try {
      const res = await fetchApi(`/galleries/${galleryId}/duplicate`, { method: 'POST' });
      if (res.success && res.data) {
        router.push(`/dashboard/galleries/${res.data.id}`);
      }
    } catch {}
  };

  // Delete Gallery
  const handleDeleteGallery = async () => {
    setConfirmModalConfig({
      isOpen: true,
      title: `Permanently Delete "${gallery?.title}"?`,
      message: 'This will permanently erase this gallery, all albums, faces, client favorites, and associated photos. THIS ACTION CANNOT BE REVERSED.',
      confirmLabel: 'Delete Gallery Permanently',
      isDestructive: true,
      onConfirm: async () => {
        await fetchApi(`/galleries/${galleryId}`, { method: 'DELETE' });
        router.push('/dashboard/galleries');
      },
    });
  };

  if (loading || !gallery) {
    return (
      <div className="flex-1 flex items-center justify-center min-h-screen">
        <div className="text-center space-y-3">
          <div className="h-8 w-8 rounded-full border-2 border-primary border-t-transparent animate-spin mx-auto" />
          <p className="text-xs text-muted">Loading workspace and gallery assets...</p>
        </div>
      </div>
    );
  }

  const clientGalleryUrl = typeof window !== 'undefined' ? `${window.location.origin}/gallery/${gallery.slug}` : `/gallery/${gallery.slug}`;

  return (
    <div className="flex-1 flex flex-col min-h-screen">
      <DashboardHeader
        title={gallery.title}
        subtitle={`${gallery.event_type} • ${formatDate(gallery.event_date)}`}
      />

      <main className="flex-1 p-6 sm:p-8 space-y-6 max-w-7xl">
        {/* Top Header & Breadcrumb Bar */}
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 pb-4 border-b border-card-border">
          <div className="flex items-center gap-3">
            <Link
              href="/dashboard/galleries"
              className="p-2 rounded-xl bg-card border border-card-border text-muted hover:text-white transition"
              title="Back to galleries"
            >
              <ChevronLeft className="h-4 w-4" />
            </Link>
            <div>
              <div className="flex items-center gap-2.5 flex-wrap">
                <h2 className="text-xl font-bold text-white tracking-tight">{gallery.title}</h2>
                <span className="px-2 py-0.5 rounded-md bg-card border border-card-border text-[11px] text-muted flex items-center gap-1 font-semibold">
                  {gallery.access_type === 'PASSWORD' ? <Lock className="h-3 w-3 text-amber-400" /> : <Globe className="h-3 w-3 text-emerald-400" />}
                  {gallery.access_type}
                </span>
                <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider ${
                  gallery.status === 'ACTIVE'
                    ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                    : 'bg-zinc-500/10 text-zinc-400 border border-zinc-500/20'
                }`}>
                  {gallery.status}
                </span>
              </div>
              <p className="text-xs text-muted mt-0.5">{gallery.description || 'No description provided'}</p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap">
            <button
              onClick={() => setShowShareModal(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-card border border-card-border text-xs font-semibold text-white hover:bg-card-border/50 transition cursor-pointer"
            >
              <Share2 className="h-3.5 w-3.5 text-primary" />
              Share & QR
            </button>

            <Link
              href={`/gallery/${gallery.slug}`}
              target="_blank"
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-card border border-card-border text-xs font-semibold text-white hover:bg-card-border/50 transition"
            >
              <ExternalLink className="h-3.5 w-3.5" />
              Client View
            </Link>

            <button
              onClick={() => setShowUploadModal(true)}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-primary hover:bg-primary-hover text-white text-xs font-bold transition shadow-lg shadow-primary/20 cursor-pointer"
            >
              <UploadCloud className="h-4 w-4" />
              Upload Photos
            </button>
          </div>
        </div>

        {/* 10-Tab Interactive Navigation Bar */}
        <div className="flex items-center gap-1 overflow-x-auto border-b border-card-border pb-px scrollbar-none">
          {[
            { id: 'overview', label: 'Overview', icon: LayoutDashboard },
            { id: 'photos', label: `Photos (${photos.length})`, icon: Images },
            { id: 'albums', label: `Albums (${albums.length})`, icon: FolderPlus },
            { id: 'ai', label: 'AI Intelligence', icon: Sparkles },
            { id: 'clients', label: 'Clients & Visits', icon: Users },
            { id: 'favorites', label: 'Favorites', icon: Heart },
            { id: 'selections', label: 'Selections', icon: CheckSquare },
            { id: 'downloads', label: 'Downloads', icon: DownloadCloud },
            { id: 'activity', label: 'Audit Log', icon: Activity },
            { id: 'settings', label: 'Settings', icon: Settings },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as TabType)}
                className={`flex items-center gap-2 px-3.5 py-2.5 rounded-t-xl text-xs font-semibold transition border-b-2 whitespace-nowrap cursor-pointer ${
                  isActive
                    ? 'border-primary text-white bg-card/60'
                    : 'border-transparent text-muted hover:text-white hover:bg-card/30'
                }`}
              >
                <Icon className={`h-3.5 w-3.5 ${isActive ? 'text-primary' : 'text-muted'}`} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* TAB 1: OVERVIEW */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* Stat Cards Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
              {[
                { label: 'Total Photos', value: overviewStats?.total_photos || photos.length, sub: `${overviewStats?.completed_photos || 0} processed` },
                { label: 'Indexed Faces', value: overviewStats?.total_faces || gallery.total_faces_detected || 0, sub: 'Biometric vectors' },
                { label: 'Client Views', value: overviewStats?.client_views_count || gallery.client_views_count || 0, sub: 'Unique sessions' },
                { label: 'Selfie Searches', value: overviewStats?.selfie_searches_count || 0, sub: 'AI Match hits' },
                { label: 'Client Favorites', value: overviewStats?.favorites_count || 0, sub: 'Bookmarked' },
                { label: 'Total Downloads', value: overviewStats?.downloads_count || 0, sub: 'Originals & ZIPs' },
              ].map((stat, i) => (
                <div key={i} className="p-4 rounded-2xl bg-card border border-card-border space-y-1">
                  <p className="text-[11px] font-semibold text-muted">{stat.label}</p>
                  <p className="text-xl font-bold text-white">{stat.value}</p>
                  <p className="text-[10px] text-muted">{stat.sub}</p>
                </div>
              ))}
            </div>

            {/* Quick Actions & Live Processing Status */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Processing Health Card */}
              <div className="lg:col-span-2 p-6 rounded-2xl bg-card border border-card-border space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-primary" />
                    Storage & AI Health Overview
                  </h3>
                  <span className="text-xs font-mono font-semibold text-muted">
                    {formatBytes(overviewStats?.storage_bytes || 0)} used
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-4 pt-2">
                  <div className="p-3.5 rounded-xl bg-background border border-card-border text-center space-y-1">
                    <p className="text-[11px] text-muted">Sharp Processing</p>
                    <p className="text-sm font-bold text-emerald-400">
                      {photos.filter((p) => p.processing_status === 'COMPLETED').length} / {photos.length}
                    </p>
                  </div>
                  <div className="p-3.5 rounded-xl bg-background border border-card-border text-center space-y-1">
                    <p className="text-[11px] text-muted">AI Face Indexing</p>
                    <p className="text-sm font-bold text-primary">
                      {gallery.ai_indexing_status === 'COMPLETED' ? 'Synchronized' : gallery.ai_indexing_status}
                    </p>
                  </div>
                  <div className="p-3.5 rounded-xl bg-background border border-card-border text-center space-y-1">
                    <p className="text-[11px] text-muted">Active Albums</p>
                    <p className="text-sm font-bold text-white">{albums.length} organized</p>
                  </div>
                </div>

                {/* Quick Share Bar */}
                <div className="p-4 rounded-xl bg-background border border-card-border flex items-center justify-between gap-3">
                  <div className="truncate flex-1">
                    <p className="text-[10px] font-bold text-muted uppercase tracking-wider">Public Gallery URL</p>
                    <p className="text-xs text-primary font-mono truncate">{clientGalleryUrl}</p>
                  </div>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(clientGalleryUrl);
                    }}
                    className="px-3 py-1.5 rounded-lg bg-card border border-card-border text-xs font-semibold text-white hover:bg-card-border/60 transition cursor-pointer"
                  >
                    Copy Link
                  </button>
                </div>
              </div>

              {/* Quick Actions Card */}
              <div className="p-6 rounded-2xl bg-card border border-card-border space-y-3 flex flex-col justify-between">
                <div>
                  <h3 className="text-sm font-bold text-white mb-1">Gallery Actions</h3>
                  <p className="text-xs text-muted">Rapid operational controls for this event.</p>
                </div>

                <div className="space-y-2 pt-2">
                  <button
                    onClick={() => setShowUploadModal(true)}
                    className="w-full py-2.5 px-3.5 rounded-xl bg-primary/10 border border-primary/20 text-primary text-xs font-bold hover:bg-primary/20 transition flex items-center justify-between cursor-pointer"
                  >
                    <span className="flex items-center gap-2">
                      <UploadCloud className="h-4 w-4" /> Batch Upload Master Photos
                    </span>
                    <ChevronRight className="h-3.5 w-3.5" />
                  </button>

                  <button
                    onClick={() => setShowCreateAlbumModal(true)}
                    className="w-full py-2.5 px-3.5 rounded-xl bg-card border border-card-border text-white text-xs font-semibold hover:bg-card-border/40 transition flex items-center justify-between cursor-pointer"
                  >
                    <span className="flex items-center gap-2">
                      <FolderPlus className="h-4 w-4 text-amber-400" /> Create Event Album
                    </span>
                    <ChevronRight className="h-3.5 w-3.5" />
                  </button>

                  <button
                    onClick={async () => {
                      await fetchApi(`/galleries/${galleryId}/ai/reindex`, { method: 'POST' });
                      loadOverview();
                    }}
                    className="w-full py-2.5 px-3.5 rounded-xl bg-card border border-card-border text-white text-xs font-semibold hover:bg-card-border/40 transition flex items-center justify-between cursor-pointer"
                  >
                    <span className="flex items-center gap-2">
                      <RefreshCw className="h-4 w-4 text-blue-400" /> Trigger Full AI Re-index
                    </span>
                    <ChevronRight className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: PHOTOS GRID & MANAGEMENT */}
        {activeTab === 'photos' && (
          <div className="space-y-4">
            {/* Filter & Search Bar */}
            <div className="p-4 rounded-2xl bg-card border border-card-border flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
              <div className="flex items-center gap-2 flex-1 max-w-md">
                <div className="relative w-full">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted" />
                  <input
                    type="text"
                    placeholder="Search by filename or hash..."
                    value={photoSearch}
                    onChange={(e) => setPhotoSearch(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && loadPhotos()}
                    className="w-full pl-9 pr-4 py-2 bg-background border border-card-border rounded-xl text-xs text-white placeholder-muted focus:outline-none focus:border-primary"
                  />
                </div>
                {photoSearch && (
                  <button
                    onClick={() => {
                      setPhotoSearch('');
                      loadPhotos();
                    }}
                    className="p-2 rounded-lg bg-card text-muted hover:text-white"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                {/* Status Filter */}
                <select
                  value={statusFilter}
                  onChange={(e) => {
                    setStatusFilter(e.target.value);
                  }}
                  className="px-3 py-2 rounded-xl bg-background border border-card-border text-xs text-white focus:outline-none focus:border-primary"
                >
                  <option value="ALL">Status: All</option>
                  <option value="COMPLETED">Completed</option>
                  <option value="PROCESSING">Processing</option>
                  <option value="QUEUED">Queued</option>
                  <option value="FAILED">Failed</option>
                </select>

                {/* AI Filter */}
                <select
                  value={aiFilter}
                  onChange={(e) => setAiFilter(e.target.value)}
                  className="px-3 py-2 rounded-xl bg-background border border-card-border text-xs text-white focus:outline-none focus:border-primary"
                >
                  <option value="ALL">AI: All</option>
                  <option value="WITH_FACES">With Faces</option>
                  <option value="WITHOUT_FACES">No Faces</option>
                </select>

                {/* Album Filter */}
                <select
                  value={albumFilter}
                  onChange={(e) => setAlbumFilter(e.target.value)}
                  className="px-3 py-2 rounded-xl bg-background border border-card-border text-xs text-white focus:outline-none focus:border-primary"
                >
                  <option value="ALL">Album: All</option>
                  <option value="UNASSIGNED">Unassigned</option>
                  {albums.map((a) => (
                    <option key={a.id} value={a.id}>{a.title}</option>
                  ))}
                </select>

                {/* Sort Option */}
                <select
                  value={sortOption}
                  onChange={(e) => setSortOption(e.target.value)}
                  className="px-3 py-2 rounded-xl bg-background border border-card-border text-xs text-white focus:outline-none focus:border-primary"
                >
                  <option value="NEWEST">Newest First</option>
                  <option value="OLDEST">Oldest First</option>
                  <option value="FILENAME_ASC">Filename A-Z</option>
                  <option value="FILENAME_DESC">Filename Z-A</option>
                  <option value="SIZE_DESC">Largest Size</option>
                </select>

                <button
                  onClick={toggleSelectAll}
                  className="px-3 py-2 rounded-xl bg-card border border-card-border text-xs font-semibold text-muted hover:text-white transition cursor-pointer"
                >
                  {selectedPhotoIds.length === photos.length && photos.length > 0 ? 'Deselect All' : 'Select All'}
                </button>
              </div>
            </div>

            {/* Batch Action Toolbar */}
            {selectedPhotoIds.length > 0 && (
              <div className="p-3 rounded-2xl bg-primary/10 border border-primary/30 flex items-center justify-between gap-4 flex-wrap animate-fadeIn">
                <div className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-primary animate-pulse" />
                  <span className="text-xs font-bold text-white">
                    {selectedPhotoIds.length} photo{selectedPhotoIds.length > 1 ? 's' : ''} selected
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  {/* Move to Album Selector */}
                  <select
                    onChange={(e) => {
                      if (e.target.value) {
                        handleBulkAction('MOVE_ALBUM', e.target.value);
                        e.target.value = '';
                      }
                    }}
                    className="px-3 py-1.5 rounded-lg bg-card border border-card-border text-xs text-white focus:outline-none cursor-pointer"
                  >
                    <option value="">Move to Album...</option>
                    <option value="NONE">Remove from Album</option>
                    {albums.map((a) => (
                      <option key={a.id} value={a.id}>{a.title}</option>
                    ))}
                  </select>

                  <button
                    onClick={() => handleBulkAction('REPROCESS')}
                    className="px-3 py-1.5 rounded-lg bg-card border border-card-border text-xs font-semibold text-white hover:bg-card-border/60 transition cursor-pointer"
                  >
                    Reprocess
                  </button>

                  <button
                    onClick={() => handleBulkAction('REINDEX')}
                    className="px-3 py-1.5 rounded-lg bg-card border border-card-border text-xs font-semibold text-white hover:bg-card-border/60 transition cursor-pointer"
                  >
                    Re-index AI
                  </button>

                  <button
                    onClick={() => handleBulkAction('DELETE')}
                    className="px-3 py-1.5 rounded-lg bg-red-500/20 text-red-400 border border-red-500/30 text-xs font-bold hover:bg-red-500/30 transition cursor-pointer"
                  >
                    Delete Selected
                  </button>

                  <button
                    onClick={() => setSelectedPhotoIds([])}
                    className="p-1.5 text-muted hover:text-white"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              </div>
            )}

            {/* Photos Grid */}
            {photosLoading ? (
              <div className="py-20 text-center space-y-2">
                <Loader2 className="h-6 w-6 text-primary animate-spin mx-auto" />
                <p className="text-xs text-muted">Filtering photographs...</p>
              </div>
            ) : photos.length === 0 ? (
              <div
                onClick={() => setShowUploadModal(true)}
                className="p-16 rounded-2xl bg-card border-2 border-dashed border-card-border hover:border-primary/50 text-center space-y-4 cursor-pointer transition group"
              >
                <div className="h-14 w-14 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center mx-auto group-hover:scale-105 transition">
                  <UploadCloud className="h-7 w-7 text-primary" />
                </div>
                <div className="space-y-1">
                  <h4 className="text-sm font-bold text-white">No photographs matching filters</h4>
                  <p className="text-xs text-muted max-w-sm mx-auto">
                    Click here to upload high-res photos or reset your active filters.
                  </p>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3.5">
                {photos.map((photo) => {
                  const isSelected = selectedPhotoIds.includes(photo.id);
                  const isCover = gallery.cover_photo_id === photo.id || photo.is_cover;
                  const thumbUrl = photo.versions?.find((v) => v.version_type === 'THUMBNAIL_MD')?.url || photo.thumbnail_url || photo.original_url;

                  return (
                    <div
                      key={photo.id}
                      className={`relative aspect-square rounded-xl bg-card border overflow-hidden group cursor-pointer transition ${
                        isSelected ? 'border-primary ring-2 ring-primary/40' : 'border-card-border hover:border-card-border/80'
                      }`}
                      onClick={() => setInspectPhoto(photo)}
                    >
                      <img
                        src={thumbUrl}
                        alt={photo.original_filename || 'Photograph'}
                        loading="lazy"
                        className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                      />

                      {/* Selection Checkbox Top Left */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleSelectPhoto(photo.id);
                        }}
                        className={`absolute top-2 left-2 z-10 h-5 w-5 rounded-md border flex items-center justify-center transition cursor-pointer ${
                          isSelected
                            ? 'bg-primary border-primary text-white'
                            : 'bg-black/60 border-white/40 text-transparent hover:border-white'
                        }`}
                      >
                        <Check className="h-3.5 w-3.5 stroke-[3]" />
                      </button>

                      {/* Cover Photo Badge Top Right */}
                      {isCover && (
                        <span className="absolute top-2 right-2 z-10 px-1.5 py-0.5 rounded-md bg-primary/90 text-white text-[9px] font-bold shadow-md">
                          COVER
                        </span>
                      )}

                      {/* Bottom Info Bar Overlay */}
                      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 via-black/50 to-transparent p-2.5 pt-6 flex items-end justify-between text-white">
                        <div className="truncate flex-1 pr-2">
                          <p className="text-[10px] font-semibold truncate leading-tight">
                            {photo.original_filename || formatBytes(photo.file_size)}
                          </p>
                          <div className="flex items-center gap-2 text-[9px] text-zinc-400 mt-0.5">
                            {photo.face_count !== undefined && photo.face_count > 0 && (
                              <span className="text-primary font-bold flex items-center gap-0.5">
                                <Sparkles className="h-2.5 w-2.5" /> {photo.face_count}
                              </span>
                            )}
                            <span>{formatBytes(photo.file_size)}</span>
                          </div>
                        </div>

                        {/* Quick Set Cover Button */}
                        {!isCover && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleSetCover(photo.id);
                            }}
                            className="p-1 rounded-md bg-black/60 hover:bg-primary text-zinc-300 hover:text-white transition opacity-0 group-hover:opacity-100"
                            title="Set as Gallery Cover"
                          >
                            <Star className="h-3 w-3" />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* TAB 3: ALBUMS */}
        {activeTab === 'albums' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-white">Event Sub-Albums & Highlights</h3>
                <p className="text-xs text-muted">Organize gallery photos into logical categories (e.g., Ceremony, Reception, Portraits).</p>
              </div>
              <button
                onClick={() => setShowCreateAlbumModal(true)}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-primary text-white text-xs font-bold hover:bg-primary-hover transition cursor-pointer"
              >
                <Plus className="h-3.5 w-3.5" />
                New Album
              </button>
            </div>

            {albums.length === 0 ? (
              <div
                onClick={() => setShowCreateAlbumModal(true)}
                className="p-16 rounded-2xl bg-card border-2 border-dashed border-card-border hover:border-primary/50 text-center space-y-3 cursor-pointer transition"
              >
                <FolderPlus className="h-8 w-8 text-muted mx-auto" />
                <div>
                  <h4 className="text-sm font-bold text-white">No albums created yet</h4>
                  <p className="text-xs text-muted">Click here to create your first album for this gallery.</p>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {albums.map((album) => (
                  <div
                    key={album.id}
                    className="p-5 rounded-2xl bg-card border border-card-border space-y-4 flex flex-col justify-between hover:border-card-border/80 transition"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center justify-between">
                        <h4 className="text-sm font-bold text-white truncate">{album.title}</h4>
                        <button
                          onClick={() => handleDeleteAlbum(album.id)}
                          className="text-muted hover:text-red-400 p-1 transition"
                          title="Delete album"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                      <p className="text-xs text-muted line-clamp-2">{album.description || 'No description'}</p>
                    </div>

                    <div className="pt-3 border-t border-card-border flex items-center justify-between text-xs">
                      <span className="text-muted font-semibold">
                        {album._count?.photos || 0} photos
                      </span>
                      <button
                        onClick={() => {
                          setAlbumFilter(album.id);
                          setActiveTab('photos');
                        }}
                        className="text-primary font-bold hover:underline"
                      >
                        View Photos →
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 4: AI INTELLIGENCE & SMART ALBUMS */}
        {activeTab === 'ai' && (
          <AiIntelligenceCenter
            galleryId={galleryId}
            gallery={gallery}
            onRefreshGallery={() => {
              loadGallery();
              loadOverview();
            }}
          />
        )}

        {/* TAB 5: CLIENTS & GALLERY DELIVERY */}
        {activeTab === 'clients' && (
          <div className="space-y-6">
            {/* Delivery Status & Overview Header */}
            <div className="p-6 rounded-2xl bg-card border border-card-border space-y-6">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2.5">
                    <h3 className="text-base font-bold text-white">Gallery Delivery & Client Access</h3>
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                        deliveryInfo?.overall_delivery_status === 'OPENED' || deliveryInfo?.overall_delivery_status === 'ACTIVE'
                          ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                          : deliveryInfo?.overall_delivery_status === 'SENT'
                          ? 'bg-primary/10 text-primary border border-primary/20'
                          : deliveryInfo?.overall_delivery_status === 'EXPIRED'
                          ? 'bg-red-500/10 text-red-400 border border-red-500/20'
                          : 'bg-card border border-card-border text-muted'
                      }`}
                    >
                      {deliveryInfo?.overall_delivery_status || 'NOT_SENT'}
                    </span>
                  </div>
                  <p className="text-xs text-muted">
                    Deliver branded photo invitations, track client interaction, and manage proofing access.
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={openDeliveryModalHandler}
                    className="px-4 py-2 rounded-xl bg-primary hover:bg-primary/90 text-white text-xs font-semibold transition flex items-center gap-1.5 shadow-md"
                  >
                    <Send className="h-3.5 w-3.5" /> Send Gallery Delivery
                  </button>
                  <button
                    onClick={openAssignClientModalHandler}
                    className="px-3.5 py-2 rounded-xl bg-card border border-card-border text-xs font-semibold text-white hover:border-primary transition flex items-center gap-1.5"
                  >
                    <Plus className="h-3.5 w-3.5 text-primary" /> Assign Client
                  </button>
                </div>
              </div>

              {/* Delivery Action Banner if reminder/delivery dispatched */}
              {deliveryActionSuccess && (
                <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-400 flex items-center gap-2 font-medium">
                  <Check className="h-4 w-4" /> {deliveryActionSuccess}
                </div>
              )}

              {/* Delivery Overview Metrics */}
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 pt-4 border-t border-card-border">
                <div className="p-3.5 rounded-xl bg-background/60 border border-card-border">
                  <span className="text-[10px] font-semibold text-muted uppercase tracking-wider block">Last Sent</span>
                  <p className="text-xs font-semibold text-white mt-1">
                    {deliveryInfo?.stats?.last_sent ? formatDate(deliveryInfo.stats.last_sent) : 'Not sent yet'}
                  </p>
                </div>
                <div className="p-3.5 rounded-xl bg-background/60 border border-card-border">
                  <span className="text-[10px] font-semibold text-muted uppercase tracking-wider block">Last Opened</span>
                  <p className="text-xs font-semibold text-white mt-1">
                    {deliveryInfo?.stats?.last_opened ? formatDate(deliveryInfo.stats.last_opened) : 'Not opened yet'}
                  </p>
                </div>
                <div className="p-3.5 rounded-xl bg-background/60 border border-card-border">
                  <span className="text-[10px] font-semibold text-muted uppercase tracking-wider block">Total Views</span>
                  <p className="text-lg font-bold text-white mt-0.5">{deliveryInfo?.stats?.views || 0}</p>
                </div>
                <div className="p-3.5 rounded-xl bg-background/60 border border-card-border">
                  <span className="text-[10px] font-semibold text-muted uppercase tracking-wider block">Favorites</span>
                  <p className="text-lg font-bold text-amber-400 mt-0.5">{deliveryInfo?.stats?.favorites || 0}</p>
                </div>
                <div className="p-3.5 rounded-xl bg-background/60 border border-card-border">
                  <span className="text-[10px] font-semibold text-muted uppercase tracking-wider block">Selections</span>
                  <p className="text-lg font-bold text-purple-400 mt-0.5">{deliveryInfo?.stats?.selections || 0}</p>
                </div>
                <div className="p-3.5 rounded-xl bg-background/60 border border-card-border">
                  <span className="text-[10px] font-semibold text-muted uppercase tracking-wider block">Downloads</span>
                  <p className="text-lg font-bold text-emerald-400 mt-0.5">{deliveryInfo?.stats?.downloads || 0}</p>
                </div>
              </div>
            </div>

            {/* Assigned Clients Section */}
            <div className="p-6 rounded-2xl bg-card border border-card-border space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-white">Assigned Primary Clients</h3>
                <span className="text-xs text-muted font-semibold">
                  {deliveryInfo?.assigned_clients?.length || 0} Clients
                </span>
              </div>

              {(!deliveryInfo?.assigned_clients || deliveryInfo.assigned_clients.length === 0) ? (
                <div className="py-8 text-center text-xs text-muted space-y-2">
                  <Users className="h-8 w-8 text-muted mx-auto" />
                  <p>No client is currently linked to this gallery.</p>
                  <button
                    onClick={openAssignClientModalHandler}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary/10 text-primary hover:bg-primary/20 transition font-semibold"
                  >
                    <Plus className="h-3 w-3" /> Assign Client Now
                  </button>
                </div>
              ) : (
                <div className="divide-y divide-card-border">
                  {deliveryInfo.assigned_clients.map((c: any) => (
                    <div key={c.id} className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                      <div className="flex items-center gap-3">
                        <div className="h-9 w-9 rounded-full bg-primary/20 text-primary flex items-center justify-center font-bold">
                          {c.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <Link href={`/dashboard/clients/${c.id}`} className="font-semibold text-white hover:text-primary transition">
                              {c.name}
                            </Link>
                            <span className="px-2 py-0.5 rounded-md bg-background border border-card-border text-[10px] text-muted font-medium">
                              {c.relationship_type || 'PRIMARY'}
                            </span>
                          </div>
                          <p className="text-[11px] text-muted">{c.email} {c.phone ? `• ${c.phone}` : ''}</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 self-end sm:self-center">
                        <button
                          onClick={() => handleSendGalleryReminder(c.id)}
                          title="Send Reminder Email"
                          className="px-2.5 py-1.5 rounded-lg bg-card border border-card-border text-muted hover:text-white hover:border-card-border/80 transition flex items-center gap-1 font-medium"
                        >
                          <Send className="h-3 w-3" /> Reminder
                        </button>
                        <button
                          onClick={() => handleUnassignClientFromGallery(c.id)}
                          title="Unassign Client"
                          className="p-1.5 rounded-lg bg-card border border-card-border text-muted hover:text-red-400 transition"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Client Access & Interaction Log */}
            <div className="p-6 rounded-2xl bg-card border border-card-border space-y-4">
              <h3 className="text-sm font-bold text-white">Client Activity Timeline & Access History</h3>
              {activityLoading ? (
                <div className="py-12 text-center text-xs text-muted">Loading access records...</div>
              ) : activityData.length === 0 ? (
                <p className="text-xs text-muted py-8 text-center">No client visits or delivery events recorded yet.</p>
              ) : (
                <div className="divide-y divide-card-border">
                  {activityData.map((act) => (
                    <div key={act.id} className="py-3 flex items-center justify-between text-xs">
                      <div className="space-y-0.5">
                        <p className="font-semibold text-white">{act.activity_type ? act.activity_type.replace(/_/g, ' ') : act.action}</p>
                        <p className="text-[10px] text-muted">
                          {act.description || (act.client_ip ? `Client IP: ${act.client_ip}` : '')}
                        </p>
                      </div>
                      <span className="text-[11px] text-muted font-mono">{formatDate(act.created_at)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 6: FAVORITES */}
        {activeTab === 'favorites' && (
          <div className="p-6 rounded-2xl bg-card border border-card-border space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-white">Client Bookmarks & Favorites</h3>
              <span className="text-xs text-muted font-semibold">{favoritesData.length} items</span>
            </div>
            {favoritesData.length === 0 ? (
              <p className="text-xs text-muted py-8 text-center">No favorites marked by clients yet.</p>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-3">
                {favoritesData.map((fav) => (
                  <div key={fav.id} className="aspect-square rounded-xl bg-background border border-card-border overflow-hidden">
                    <img src={fav.photo?.thumbnail_url || fav.photo?.original_url} alt="Fav" className="w-full h-full object-cover" />
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 7: SELECTIONS */}
        {activeTab === 'selections' && (
          <div className="p-6 rounded-2xl bg-card border border-card-border space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-white">Client Selections (Proofing Orders)</h3>
              <span className="text-xs text-muted font-semibold">{selectionsData.length} selected</span>
            </div>
            {selectionsData.length === 0 ? (
              <p className="text-xs text-muted py-8 text-center">No formal client selections submitted yet.</p>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-3">
                {selectionsData.map((sel) => (
                  <div key={sel.id} className="aspect-square rounded-xl bg-background border border-card-border overflow-hidden">
                    <img src={sel.photo?.thumbnail_url || sel.photo?.original_url} alt="Selection" className="w-full h-full object-cover" />
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 8: DOWNLOADS */}
        {activeTab === 'downloads' && (
          <div className="p-6 rounded-2xl bg-card border border-card-border space-y-4">
            <h3 className="text-sm font-bold text-white">Download Delivery History</h3>
            {downloadsData.length === 0 ? (
              <p className="text-xs text-muted py-8 text-center">No photo or ZIP downloads recorded yet.</p>
            ) : (
              <div className="divide-y divide-card-border">
                {downloadsData.map((dl) => (
                  <div key={dl.id} className="py-3 flex items-center justify-between text-xs">
                    <div>
                      <p className="font-semibold text-white">{dl.file_type || 'Single High-Res Photo'}</p>
                      <p className="text-[10px] text-muted">IP: {dl.client_ip} • Size: {formatBytes(dl.file_size || 0)}</p>
                    </div>
                    <span className="text-[11px] text-muted font-mono">{formatDate(dl.created_at)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 9: ACTIVITY / AUDIT LOG */}
        {activeTab === 'activity' && (
          <div className="p-6 rounded-2xl bg-card border border-card-border space-y-4">
            <h3 className="text-sm font-bold text-white">Gallery Audit Log & Security Events</h3>
            {activityLoading ? (
              <div className="py-12 text-center text-xs text-muted">Loading audit log...</div>
            ) : activityData.length === 0 ? (
              <p className="text-xs text-muted py-8 text-center">No audit log entries recorded yet.</p>
            ) : (
              <div className="divide-y divide-card-border">
                {activityData.map((item) => (
                  <div key={item.id} className="py-3 flex items-center justify-between text-xs">
                    <div>
                      <p className="font-semibold text-white">{item.action}</p>
                      <p className="text-[10px] text-muted">{item.details || 'System operation'}</p>
                    </div>
                    <span className="text-[11px] text-muted font-mono">{formatDate(item.created_at)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 10: SETTINGS */}
        {activeTab === 'settings' && (
          <div className="space-y-8 max-w-3xl">
            <form onSubmit={handleSaveSettings} className="p-6 sm:p-8 rounded-2xl bg-card border border-card-border space-y-6">
              <div>
                <h3 className="text-sm font-bold text-white mb-1">Gallery Metadata & Client Permissions</h3>
                <p className="text-xs text-muted">Manage access levels, viewing expiration, face search sensitivity, and download rules.</p>
              </div>

              {settingsMsg && (
                <div className={`p-3.5 rounded-xl text-xs font-semibold flex items-center gap-2 ${
                  settingsMsg.type === 'success' ? 'bg-emerald-950/60 border border-emerald-500/40 text-emerald-300' : 'bg-red-950/60 border border-red-500/40 text-red-300'
                }`}>
                  {settingsMsg.type === 'success' ? <CheckCircle2 className="h-4 w-4 text-emerald-400" /> : <AlertCircle className="h-4 w-4 text-red-400" />}
                  <span>{settingsMsg.text}</span>
                </div>
              )}

              {/* Title & Event Type */}
              <div className="space-y-4">
                <div>
                  <label className="text-xs font-semibold text-muted">Gallery Title</label>
                  <input
                    type="text"
                    value={settingsTitle}
                    onChange={(e) => setSettingsTitle(e.target.value)}
                    className="w-full mt-1.5 px-4 py-2.5 rounded-xl bg-background border border-card-border text-xs text-white focus:outline-none focus:border-primary"
                    required
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-semibold text-muted">Event Type</label>
                    <input
                      type="text"
                      value={settingsEventType}
                      onChange={(e) => setSettingsEventType(e.target.value)}
                      className="w-full mt-1.5 px-4 py-2.5 rounded-xl bg-background border border-card-border text-xs text-white focus:outline-none focus:border-primary"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-muted">Access Model</label>
                    <select
                      value={settingsAccessType}
                      onChange={(e) => setSettingsAccessType(e.target.value)}
                      className="w-full mt-1.5 px-4 py-2.5 rounded-xl bg-background border border-card-border text-xs text-white focus:outline-none focus:border-primary"
                    >
                      <option value="PUBLIC">Public (Direct link, indexable)</option>
                      <option value="UNLISTED">Unlisted (Direct link only)</option>
                      <option value="PASSWORD">Password / PIN Protected</option>
                      <option value="PRIVATE">Private (Photographer Only)</option>
                    </select>
                  </div>
                </div>

                {settingsAccessType === 'PASSWORD' && (
                  <div>
                    <label className="text-xs font-semibold text-muted">Set New Password / PIN</label>
                    <input
                      type="password"
                      placeholder="Leave blank to keep existing password"
                      value={settingsPassword}
                      onChange={(e) => setSettingsPassword(e.target.value)}
                      className="w-full mt-1.5 px-4 py-2.5 rounded-xl bg-background border border-card-border text-xs text-white focus:outline-none focus:border-primary"
                    />
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-semibold text-muted">Viewing Expiration Date</label>
                    <input
                      type="date"
                      value={settingsExpiresAt}
                      onChange={(e) => setSettingsExpiresAt(e.target.value)}
                      className="w-full mt-1.5 px-4 py-2.5 rounded-xl bg-background border border-card-border text-xs text-white focus:outline-none focus:border-primary"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-muted">Watermark Mode</label>
                    <select
                      value={settingsWatermarkMode}
                      onChange={(e) => setSettingsWatermarkMode(e.target.value)}
                      className="w-full mt-1.5 px-4 py-2.5 rounded-xl bg-background border border-card-border text-xs text-white focus:outline-none focus:border-primary"
                    >
                      <option value="NONE">None (Clean photos)</option>
                      <option value="THUMBNAIL_ONLY">Thumbnail Only</option>
                      <option value="ALL">All Versions</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="text-xs font-semibold text-muted">Description</label>
                  <textarea
                    rows={2}
                    value={settingsDescription}
                    onChange={(e) => setSettingsDescription(e.target.value)}
                    className="w-full mt-1.5 px-4 py-2 rounded-xl bg-background border border-card-border text-xs text-white focus:outline-none focus:border-primary"
                  />
                </div>
              </div>

              <div className="pt-4 border-t border-card-border flex justify-end">
                <button
                  type="submit"
                  disabled={savingSettings}
                  className="px-6 py-2.5 rounded-xl bg-primary hover:bg-primary-hover text-white text-xs font-bold transition shadow-lg shadow-primary/20 flex items-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {savingSettings ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                  <span>Save Gallery Settings</span>
                </button>
              </div>
            </form>

            {/* Danger Zone */}
            <div className="p-6 rounded-2xl bg-card border border-red-500/20 space-y-4">
              <h4 className="text-xs font-bold text-red-400 uppercase tracking-wider">Danger Zone</h4>
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-bold text-white">Archive Gallery</p>
                  <p className="text-[11px] text-muted">Hide gallery from active list without deleting photos.</p>
                </div>
                <button
                  onClick={handleArchiveGallery}
                  className="px-4 py-2 rounded-xl bg-card border border-card-border text-xs font-semibold text-muted hover:text-white transition cursor-pointer"
                >
                  Archive Gallery
                </button>
              </div>

              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-3 border-t border-card-border">
                <div>
                  <p className="text-xs font-bold text-white">Duplicate Gallery Configuration</p>
                  <p className="text-[11px] text-muted">Clone settings and albums to a new gallery.</p>
                </div>
                <button
                  onClick={handleDuplicateGallery}
                  className="px-4 py-2 rounded-xl bg-card border border-card-border text-xs font-semibold text-white hover:bg-card-border/60 transition cursor-pointer"
                >
                  Duplicate Gallery
                </button>
              </div>

              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-3 border-t border-card-border">
                <div>
                  <p className="text-xs font-bold text-red-400">Permanently Delete Gallery</p>
                  <p className="text-[11px] text-muted">Erase this gallery, its photos, faces, and favorites forever.</p>
                </div>
                <button
                  onClick={handleDeleteGallery}
                  className="px-4 py-2 rounded-xl bg-red-500 text-white text-xs font-bold hover:bg-red-600 transition cursor-pointer"
                >
                  Delete Gallery
                </button>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* MODALS */}

      {/* Bulk Upload Modal */}
      <BulkUploadModal
        isOpen={showUploadModal}
        galleryId={galleryId}
        onClose={() => setShowUploadModal(false)}
        onUploadComplete={() => {
          loadPhotos();
          loadOverview();
        }}
      />

      {/* Photo Inspector Modal */}
      {inspectPhoto && (
        <PhotoDetailModal
          isOpen={true}
          photo={inspectPhoto}
          galleryId={galleryId}
          albums={albums}
          onClose={() => setInspectPhoto(null)}
          onPhotoUpdated={() => {
            loadPhotos();
            loadOverview();
          }}
          onDeleteRequested={(photo) => {
            setInspectPhoto(null);
            setConfirmModalConfig({
              isOpen: true,
              title: 'Delete Photo?',
              message: `Are you sure you want to permanently delete "${photo.original_filename || 'this photo'}"?`,
              confirmLabel: 'Delete Photo',
              isDestructive: true,
              onConfirm: async () => {
                await fetchApi(`/photos/${photo.id}`, { method: 'DELETE' });
                loadPhotos();
                loadOverview();
              },
            });
          }}
        />
      )}

      {/* Share Modal */}
      <ShareModal
        isOpen={showShareModal}
        gallery={gallery}
        onClose={() => setShowShareModal(false)}
      />

      {/* Confirmation Modal */}
      <ConfirmationModal
        isOpen={confirmModalConfig.isOpen}
        title={confirmModalConfig.title}
        message={confirmModalConfig.message}
        confirmLabel={confirmModalConfig.confirmLabel}
        isDestructive={confirmModalConfig.isDestructive}
        onClose={() => setConfirmModalConfig((prev) => ({ ...prev, isOpen: false }))}
        onConfirm={confirmModalConfig.onConfirm}
      />

      {/* Create Album Modal */}
      {showCreateAlbumModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <form
            onSubmit={handleCreateAlbum}
            className="bg-card border border-card-border rounded-2xl max-w-sm w-full p-6 space-y-4 shadow-2xl"
          >
            <div>
              <h3 className="text-sm font-bold text-white">Create New Album</h3>
              <p className="text-xs text-muted">Group gallery photos by scene or timeline.</p>
            </div>

            <div>
              <label className="text-xs font-semibold text-muted">Album Title</label>
              <input
                type="text"
                placeholder="e.g. Ceremony, Reception, Portraits"
                value={newAlbumTitle}
                onChange={(e) => setNewAlbumTitle(e.target.value)}
                className="w-full mt-1 px-3 py-2 rounded-xl bg-background border border-card-border text-xs text-white focus:outline-none focus:border-primary"
                required
                autoFocus
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-muted">Description (Optional)</label>
              <input
                type="text"
                placeholder="Short description"
                value={newAlbumDesc}
                onChange={(e) => setNewAlbumDesc(e.target.value)}
                className="w-full mt-1 px-3 py-2 rounded-xl bg-background border border-card-border text-xs text-white focus:outline-none focus:border-primary"
              />
            </div>

            <div className="flex items-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowCreateAlbumModal(false)}
                className="flex-1 py-2 rounded-xl bg-card border border-card-border text-xs font-semibold text-muted hover:text-white transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={creatingAlbum || !newAlbumTitle.trim()}
                className="flex-1 py-2 rounded-xl bg-primary text-white text-xs font-bold hover:bg-primary-hover transition flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                {creatingAlbum ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : 'Create Album'}
              </button>
            </div>
          </form>
        </div>
      )}
      {/* Assign Client Modal */}
      {showAssignClientModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-card border border-card-border rounded-2xl max-w-sm w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-card-border pb-3">
              <h3 className="text-sm font-bold text-white">Assign Client</h3>
              <button onClick={() => setShowAssignClientModal(false)} className="text-muted hover:text-white">
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-2 text-xs">
              <label className="text-muted font-medium">Select Studio Client</label>
              {allStudioClients.length === 0 ? (
                <p className="text-muted italic py-2">No active clients found in directory.</p>
              ) : (
                <select
                  value={selectedAssignClientId}
                  onChange={(e) => setSelectedAssignClientId(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-background border border-card-border text-white focus:outline-none focus:border-primary text-xs"
                >
                  {allStudioClients.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({c.email})
                    </option>
                  ))}
                </select>
              )}
            </div>

            <div className="flex items-center gap-2 pt-2 border-t border-card-border">
              <button
                type="button"
                onClick={() => setShowAssignClientModal(false)}
                className="flex-1 py-2 rounded-xl bg-card border border-card-border text-xs font-semibold text-muted hover:text-white transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleAssignClientToGallery}
                disabled={sendingDelivery || !selectedAssignClientId}
                className="flex-1 py-2 rounded-xl bg-primary text-white text-xs font-bold hover:bg-primary/90 transition flex items-center justify-center gap-1.5 disabled:opacity-50"
              >
                {sendingDelivery ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : 'Assign'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Send Delivery Modal */}
      {showDeliveryModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-card border border-card-border rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-card-border pb-3">
              <div className="space-y-0.5">
                <h3 className="text-sm font-bold text-white">Send Gallery Delivery</h3>
                <p className="text-xs text-muted">Dispatches branded invitation with public access link</p>
              </div>
              <button onClick={() => setShowDeliveryModal(false)} className="text-muted hover:text-white">
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="space-y-1">
                <label className="text-muted font-medium">Recipient Email *</label>
                <input
                  type="email"
                  value={deliveryRecipientEmail}
                  onChange={(e) => setDeliveryRecipientEmail(e.target.value)}
                  placeholder="client@example.com"
                  className="w-full px-3 py-2 rounded-xl bg-background border border-card-border text-white text-xs"
                />
              </div>

              <div className="space-y-1">
                <label className="text-muted font-medium">Recipient Name (Optional)</label>
                <input
                  type="text"
                  value={deliveryRecipientName}
                  onChange={(e) => setDeliveryRecipientName(e.target.value)}
                  placeholder="e.g. Rahul Sharma"
                  className="w-full px-3 py-2 rounded-xl bg-background border border-card-border text-white text-xs"
                />
              </div>

              <div className="space-y-1">
                <label className="text-muted font-medium">Personal Note</label>
                <textarea
                  rows={3}
                  value={deliveryCustomMessage}
                  onChange={(e) => setDeliveryCustomMessage(e.target.value)}
                  className="w-full p-3 rounded-xl bg-background border border-card-border text-white text-xs resize-none"
                />
              </div>
            </div>

            <div className="flex items-center gap-2 pt-2 border-t border-card-border">
              <button
                type="button"
                onClick={() => setShowDeliveryModal(false)}
                className="flex-1 py-2 rounded-xl bg-card border border-card-border text-xs font-semibold text-muted hover:text-white transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSendGalleryDelivery}
                disabled={sendingDelivery || !deliveryRecipientEmail}
                className="flex-1 py-2 rounded-xl bg-primary text-white text-xs font-bold hover:bg-primary/90 transition flex items-center justify-center gap-1.5 disabled:opacity-50"
              >
                {sendingDelivery ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : 'Send Delivery'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
