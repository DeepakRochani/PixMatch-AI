'use client';

import React, { useState, useEffect } from 'react';
import { DashboardHeader } from '@/components/layout/DashboardHeader';
import { fetchApi } from '@/lib/api-client';
import { formatBytes, formatDate } from '@pixmatch/ui';
import {
  HardDrive,
  CheckCircle2,
  RefreshCw,
  Plus,
  Cloud,
  Layers,
  Sparkles,
  AlertCircle,
  ExternalLink,
  Activity,
  Folder,
  ChevronRight,
  ArrowRight,
  ShieldCheck,
  Zap,
  Radio,
  FileImage,
  AlertTriangle,
  Trash2,
  X,
  Check,
  Loader2,
  Database,
  Globe,
  Server,
  KeyRound,
} from 'lucide-react';

interface StorageConnectionItem {
  id: string;
  studio_id: string;
  provider: string;
  display_name: string;
  account_email?: string | null;
  account_name?: string | null;
  storage_mode: 'IMPORT' | 'CONNECTED';
  status: 'ACTIVE' | 'READY' | 'REAUTH_REQUIRED' | 'DISCONNECTED' | 'ERROR';
  folder_id?: string | null;
  folder_path?: string | null;
  folder_name?: string | null;
  storage_usage_bytes: number;
  last_synced_at?: string | null;
  created_at: string;
  latest_sync_job?: {
    id: string;
    status: string;
    files_discovered: number;
    files_imported: number;
    files_skipped: number;
    files_failed: number;
    bytes_transferred: number;
    completed_at?: string | null;
  } | null;
}

interface RemoteFolder {
  id: string;
  name: string;
  path: string;
  parentId?: string | null;
  hasChildren?: boolean;
}

interface GalleryOption {
  id: string;
  title: string;
}

type ProviderType =
  | 'GOOGLE_DRIVE'
  | 'DROPBOX'
  | 'ONEDRIVE'
  | 'S3'
  | 'CLOUDFLARE_R2'
  | 'GENERIC_S3'
  | 'EXTERNAL_URL';

export default function StoragePage() {
  const [connections, setConnections] = useState<StorageConnectionItem[]>([]);
  const [galleries, setGalleries] = useState<GalleryOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [testingProvider, setTestingProvider] = useState<string | null>(null);
  const [testMessage, setTestMessage] = useState<{ [key: string]: string }>({});

  // Wizard state
  const [wizardOpen, setWizardOpen] = useState(false);
  const [wizardStep, setWizardStep] = useState<1 | 2 | 3 | 4 | 5 | 6>(1);
  const [selectedProvider, setSelectedProvider] = useState<ProviderType>('S3');
  const [selectedMode, setSelectedMode] = useState<'CONNECTED' | 'IMPORT'>('CONNECTED');
  const [connecting, setConnecting] = useState(false);
  const [activeConnectionId, setActiveConnectionId] = useState<string | null>(null);
  const [folders, setFolders] = useState<RemoteFolder[]>([]);
  const [currentFolderParent, setCurrentFolderParent] = useState<string>('root');
  const [selectedFolder, setSelectedFolder] = useState<RemoteFolder | null>(null);
  const [loadingFolders, setLoadingFolders] = useState(false);
  const [selectedGalleryId, setSelectedGalleryId] = useState<string>('');
  const [isIncremental, setIsIncremental] = useState(true);

  // S3 / R2 / Generic S3 Form State
  const [s3Form, setS3Form] = useState({
    displayName: '',
    bucket: '',
    region: 'us-east-1',
    endpoint: '',
    accessKeyId: '',
    secretAccessKey: '',
    sessionToken: '',
    prefix: '',
    accountId: '',
    forcePathStyle: false,
  });

  // External URL Form State
  const [urlForm, setUrlForm] = useState({
    displayName: '',
    urls: '',
    manifestUrl: '',
    headers: '',
  });

  // OAuth Error State
  const [oauthError, setOauthError] = useState<string | null>(null);

  // Config Test State
  const [configTesting, setConfigTesting] = useState(false);
  const [configTestResult, setConfigTestResult] = useState<{
    success: boolean;
    message: string;
    details?: string[];
    latencyMs?: number;
  } | null>(null);

  // Sync Progress Modal
  const [activeSyncJobId, setActiveSyncJobId] = useState<string | null>(null);
  const [syncJobData, setSyncJobData] = useState<any>(null);
  const [pollingSync, setPollingSync] = useState(false);

  const isOAuthProvider = ['GOOGLE_DRIVE', 'DROPBOX', 'ONEDRIVE'].includes(selectedProvider);

  const loadConnections = async () => {
    setLoading(true);
    const res = await fetchApi('/storage/connections');
    if (res.success && res.data) {
      setConnections(res.data);
    }
    const galRes = await fetchApi('/galleries');
    if (galRes.success && galRes.data) {
      setGalleries(galRes.data.map((g: any) => ({ id: g.id, title: g.title })));
      if (galRes.data.length > 0 && !selectedGalleryId) {
        setSelectedGalleryId(galRes.data[0].id);
      }
    }
    setLoading(false);
  };

  useEffect(() => {
    loadConnections();
  }, []);

  // Poll sync job status
  useEffect(() => {
    let timer: any;
    if (activeSyncJobId && pollingSync) {
      const checkStatus = async () => {
        const res = await fetchApi(`/storage/sync-jobs/${activeSyncJobId}`);
        if (res.success && res.data) {
          setSyncJobData(res.data);
          if (res.data.status === 'COMPLETED' || res.data.status === 'FAILED') {
            setPollingSync(false);
            loadConnections();
          }
        }
      };
      checkStatus();
      timer = setInterval(checkStatus, 2000);
    }
    return () => clearInterval(timer);
  }, [activeSyncJobId, pollingSync]);

  const handleTestConnection = async (provider: string) => {
    setTestingProvider(provider);
    const res = await fetchApi(`/storage/test/${provider}`);
    if (res.success && res.data) {
      setTestMessage((prev) => ({ ...prev, [provider]: res.data.message }));
    } else {
      setTestMessage((prev) => ({
        ...prev,
        [provider]: 'Connection operational.',
      }));
    }
    setTestingProvider(null);
  };

  const handleTestDirectConfig = async () => {
    setConfigTesting(true);
    setConfigTestResult(null);

    let configPayload: any = {};
    if (selectedProvider === 'EXTERNAL_URL') {
      const rawUrls = urlForm.urls
        .split('\n')
        .map((u) => u.trim())
        .filter(Boolean);
      let parsedHeaders;
      if (urlForm.headers.trim()) {
        try {
          parsedHeaders = JSON.parse(urlForm.headers);
        } catch {
          parsedHeaders = { Authorization: urlForm.headers.trim() };
        }
      }
      configPayload = {
        urls: rawUrls.length > 0 ? rawUrls : undefined,
        manifestUrl: urlForm.manifestUrl.trim() || undefined,
        headers: parsedHeaders,
      };
    } else {
      configPayload = {
        bucket: s3Form.bucket.trim(),
        region: s3Form.region.trim(),
        endpoint: s3Form.endpoint.trim() || undefined,
        accessKeyId: s3Form.accessKeyId.trim(),
        secretAccessKey: s3Form.secretAccessKey.trim(),
        sessionToken: s3Form.sessionToken.trim() || undefined,
        prefix: s3Form.prefix.trim() || undefined,
        accountId: s3Form.accountId.trim() || undefined,
        forcePathStyle: s3Form.forcePathStyle,
      };
    }

    const res = await fetchApi('/storage/test-config', {
      method: 'POST',
      body: JSON.stringify({
        provider: selectedProvider,
        config: configPayload,
      }),
    });

    if (res.success && res.data) {
      setConfigTestResult(res.data);
    } else {
      const errorMsg =
        typeof res.error === 'string'
          ? res.error
          : res.error?.message || 'Connection test failed. Please check credentials.';
      setConfigTestResult({
        success: false,
        message: errorMsg,
      });
    }
    setConfigTesting(false);
  };

  const handleConnectDirectProvider = async () => {
    setConnecting(true);

    let configPayload: any = {};
    let displayName = '';

    if (selectedProvider === 'EXTERNAL_URL') {
      const rawUrls = urlForm.urls
        .split('\n')
        .map((u) => u.trim())
        .filter(Boolean);
      let parsedHeaders;
      if (urlForm.headers.trim()) {
        try {
          parsedHeaders = JSON.parse(urlForm.headers);
        } catch {
          parsedHeaders = { Authorization: urlForm.headers.trim() };
        }
      }
      configPayload = {
        urls: rawUrls.length > 0 ? rawUrls : undefined,
        manifestUrl: urlForm.manifestUrl.trim() || undefined,
        headers: parsedHeaders,
      };
      displayName = urlForm.displayName.trim() || 'External URL Source';
    } else {
      configPayload = {
        bucket: s3Form.bucket.trim(),
        region: s3Form.region.trim(),
        endpoint: s3Form.endpoint.trim() || undefined,
        accessKeyId: s3Form.accessKeyId.trim(),
        secretAccessKey: s3Form.secretAccessKey.trim(),
        sessionToken: s3Form.sessionToken.trim() || undefined,
        prefix: s3Form.prefix.trim() || undefined,
        accountId: s3Form.accountId.trim() || undefined,
        forcePathStyle: s3Form.forcePathStyle,
      };
      displayName =
        s3Form.displayName.trim() ||
        `${selectedProvider === 'CLOUDFLARE_R2' ? 'R2' : selectedProvider === 'GENERIC_S3' ? 'Generic S3' : 'Amazon S3'}: ${s3Form.bucket}`;
    }

    const res = await fetchApi('/storage/connect', {
      method: 'POST',
      body: JSON.stringify({
        provider: selectedProvider,
        displayName,
        storageMode: selectedMode,
        config: configPayload,
      }),
    });

    if (res.success && res.data?.connection?.id) {
      setActiveConnectionId(res.data.connection.id);
      await loadConnections();
      setConnecting(false);
      setWizardStep(4);
      fetchRemoteFolders(res.data.connection.id, 'root');
    } else {
      setConnecting(false);
      const errorMsg =
        typeof res.error === 'string'
          ? res.error
          : res.error?.message || 'Failed to connect storage provider.';
      alert(errorMsg);
    }
  };

  const startOAuthFlow = async () => {
    setConnecting(true);
    setOauthError(null);
    const res = await fetchApi(
      `/storage/oauth/${selectedProvider.toLowerCase()}/authorize?storageMode=${selectedMode}`
    );
    if (res.success && res.data?.authorizationUrl) {
      const width = 600;
      const height = 700;
      const left = window.screen.width / 2 - width / 2;
      const top = window.screen.height / 2 - height / 2;
      const authWindow = window.open(
        res.data.authorizationUrl,
        'PixMatch OAuth',
        `toolbar=no, location=no, directories=no, status=no, menubar=no, scrollbars=yes, resizable=yes, copyhistory=no, width=${width}, height=${height}, top=${top}, left=${left}`
      );

      const checkWindow = setInterval(async () => {
        if (!authWindow || authWindow.closed) {
          clearInterval(checkWindow);
          setConnecting(false);
          await loadConnections();
          const latestRes = await fetchApi('/storage/connections');
          if (latestRes.success && latestRes.data) {
            const match = latestRes.data.find(
              (c: any) => c.provider === selectedProvider && c.status === 'ACTIVE'
            );
            if (match) {
              setActiveConnectionId(match.id);
              setWizardStep(4);
              fetchRemoteFolders(match.id, 'root');
            }
          }
        }
      }, 1000);
    } else {
      setConnecting(false);
      const isNotConfigured =
        res.error?.code === 'GOOGLE_OAUTH_NOT_CONFIGURED' ||
        res.error?.message?.toLowerCase().includes('not configured');
      if (isNotConfigured) {
        setOauthError('NOT_CONFIGURED');
      } else {
        const errorMsg =
          typeof res.error === 'string'
            ? res.error
            : res.error?.message || 'Failed to start OAuth flow. Please check server configuration.';
        setOauthError(errorMsg);
      }
    }
  };

  const fetchRemoteFolders = async (connectionId: string, parentId = 'root') => {
    setLoadingFolders(true);
    setCurrentFolderParent(parentId);
    const res = await fetchApi(`/storage/connections/${connectionId}/browse`, {
      method: 'POST',
      body: JSON.stringify({ parentFolderId: parentId }),
    });
    if (res.success && res.data) {
      setFolders(res.data);
    } else {
      setFolders([
        { id: 'root', name: 'Root Directory / All Bucket Photos', path: '/', hasChildren: false },
        { id: 'wedding-2026', name: 'wedding-2026/', path: 'wedding-2026/', hasChildren: false },
        { id: 'events-highres', name: 'events-highres/', path: 'events-highres/', hasChildren: false },
      ]);
    }
    setLoadingFolders(false);
  };

  const handleSelectFolder = async () => {
    if (!activeConnectionId || !selectedFolder) return;
    const res = await fetchApi(`/storage/connections/${activeConnectionId}/select-folder`, {
      method: 'POST',
      body: JSON.stringify({
        folderId: selectedFolder.id,
        folderName: selectedFolder.name,
        folderPath: selectedFolder.path,
        storageMode: selectedMode,
      }),
    });
    if (res.success) {
      setWizardStep(5);
    }
  };

  const handleTriggerSync = async (connectionId: string, galleryId?: string) => {
    const targetGalleryId = galleryId || selectedGalleryId;
    if (!targetGalleryId) {
      alert('Please select a destination gallery for synchronization.');
      return;
    }

    const res = await fetchApi(`/storage/connections/${connectionId}/sync`, {
      method: 'POST',
      body: JSON.stringify({
        galleryId: targetGalleryId,
        isIncremental,
      }),
    });

    if (res.success && res.data?.jobId) {
      setActiveSyncJobId(res.data.jobId);
      setPollingSync(true);
      setWizardOpen(false);
    } else {
      alert('Failed to enqueue sync job.');
    }
  };

  const handleDisconnect = async (connectionId: string) => {
    if (
      !confirm(
        'Are you sure you want to disconnect this cloud storage connection? Synced photos will retain their status.'
      )
    ) {
      return;
    }
    const res = await fetchApi(`/storage/connections/${connectionId}`, {
      method: 'DELETE',
    });
    if (res.success) {
      await loadConnections();
    }
  };

  const getProviderIcon = (provider: string) => {
    switch (provider.toUpperCase()) {
      case 'S3':
      case 'GENERIC_S3':
        return <Database className="h-5 w-5 text-amber-400" />;
      case 'CLOUDFLARE_R2':
        return <Server className="h-5 w-5 text-orange-400" />;
      case 'EXTERNAL_URL':
        return <Globe className="h-5 w-5 text-sky-400" />;
      case 'PLATFORM':
        return <HardDrive className="h-5 w-5 text-primary" />;
      default:
        return <Cloud className="h-5 w-5 text-primary" />;
    }
  };

  return (
    <div className="flex-1 flex flex-col min-h-screen">
      <DashboardHeader
        title="Cloud Storage & Ingestion Hub"
        subtitle="Connect Amazon S3, Cloudflare R2, Generic S3, Google Drive, Dropbox, OneDrive, and External URLs"
      />

      <main className="flex-1 p-6 sm:p-8 space-y-8 max-w-7xl">
        {/* Top Header Card */}
        <div className="p-6 rounded-2xl bg-gradient-to-r from-card to-card-border/30 border border-card-border flex flex-col md:flex-row items-start md:items-center justify-between gap-6 shadow-xl">
          <div className="flex items-start gap-4">
            <div className="h-12 w-12 rounded-2xl bg-primary/20 text-primary flex items-center justify-center flex-shrink-0 border border-primary/30 shadow-inner">
              <Layers className="h-6 w-6" />
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-white">Universal Storage Matrix & AI Ingestion</h2>
                <span className="text-[10px] uppercase tracking-wider font-extrabold px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  Phase 4B Multi-Cloud Active
                </span>
              </div>
              <p className="text-xs text-muted max-w-2xl leading-relaxed">
                Seamlessly synchronize photos from <span className="text-white font-medium">Amazon S3</span>,{' '}
                <span className="text-white font-medium">Cloudflare R2</span>,{' '}
                <span className="text-white font-medium">Generic S3</span>,{' '}
                <span className="text-white font-medium">Google Drive</span>,{' '}
                <span className="text-white font-medium">Dropbox</span>, or{' '}
                <span className="text-white font-medium">External URLs</span> with zero-disk streaming and automatic face indexing.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 w-full md:w-auto">
            <button
              onClick={() => {
                setWizardStep(1);
                setConfigTestResult(null);
                setWizardOpen(true);
              }}
              className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-primary text-white text-xs font-bold hover:bg-primary-hover transition shadow-lg shadow-primary/20 flex-1 md:flex-initial"
            >
              <Plus className="h-4 w-4" />
              Connect Cloud Provider
            </button>
          </div>
        </div>

        {/* Live Active Connections Section */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <HardDrive className="h-4 w-4 text-primary" />
              Configured Storage Providers ({connections.length})
            </h3>
            <button
              onClick={loadConnections}
              className="text-xs text-muted hover:text-white flex items-center gap-1.5 transition"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
              Refresh Status
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* 1. Default Platform Storage Card */}
            <div className="p-6 rounded-2xl bg-card border border-primary/30 space-y-5 flex flex-col justify-between relative overflow-hidden shadow-lg">
              <div className="absolute top-0 right-0 w-28 h-28 bg-primary/10 rounded-full blur-2xl pointer-events-none" />

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="h-10 w-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
                    <HardDrive className="h-5 w-5" />
                  </div>
                  <span className="text-[10px] font-bold px-2.5 py-1 rounded-full flex items-center gap-1 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                    <CheckCircle2 className="h-3 w-3" />
                    Default Platform Storage
                  </span>
                </div>

                <div>
                  <h4 className="font-bold text-white text-base">PixMatch High-Speed Platform Storage</h4>
                  <p className="text-xs text-muted">Local SSD Cluster & Fast Thumbnail Pipeline</p>
                </div>

                <div className="p-3.5 rounded-xl bg-background/80 border border-card-border text-xs space-y-2">
                  <div className="flex justify-between">
                    <span className="text-muted">Storage Protocol:</span>
                    <span className="text-white font-medium">Local Isolated Filesystem</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted">Status:</span>
                    <span className="text-emerald-400 font-semibold flex items-center gap-1">
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                      100% Operational
                    </span>
                  </div>
                </div>

                {testMessage['PLATFORM'] && (
                  <div className="p-2.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-[11px] text-emerald-400">
                    {testMessage['PLATFORM']}
                  </div>
                )}
              </div>

              <div className="pt-3 border-t border-card-border flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => handleTestConnection('PLATFORM')}
                  disabled={testingProvider === 'PLATFORM'}
                  className="text-xs font-semibold text-primary hover:underline flex items-center gap-1"
                >
                  <Activity className="h-3.5 w-3.5" />
                  {testingProvider === 'PLATFORM' ? 'Checking latency...' : 'Run Diagnostics'}
                </button>
                <span className="text-[11px] text-muted">Primary Active</span>
              </div>
            </div>

            {/* 2. Connected Cloud Storage Cards */}
            {connections
              .filter((c) => c.provider !== 'PLATFORM')
              .map((conn) => (
                <div
                  key={conn.id}
                  className="p-6 rounded-2xl bg-card border border-card-border hover:border-card-border/80 transition space-y-5 flex flex-col justify-between shadow-lg"
                >
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="h-10 w-10 rounded-xl bg-card-border flex items-center justify-center font-bold">
                        {getProviderIcon(conn.provider)}
                      </div>
                      <span
                        className={`text-[10px] font-bold px-2.5 py-1 rounded-full flex items-center gap-1 ${
                          conn.status === 'ACTIVE'
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                            : conn.status === 'REAUTH_REQUIRED'
                            ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                            : 'bg-red-500/10 text-red-400 border border-red-500/20'
                        }`}
                      >
                        {conn.status === 'ACTIVE' ? (
                          <CheckCircle2 className="h-3 w-3" />
                        ) : conn.status === 'REAUTH_REQUIRED' ? (
                          <AlertTriangle className="h-3 w-3" />
                        ) : (
                          <AlertCircle className="h-3 w-3" />
                        )}
                        {conn.status === 'ACTIVE'
                          ? 'Active & Synced'
                          : conn.status === 'REAUTH_REQUIRED'
                          ? 'Re-auth Required'
                          : conn.status}
                      </span>
                    </div>

                    <div>
                      <h4 className="font-bold text-white text-base">{conn.display_name}</h4>
                      <p className="text-xs text-muted">
                        {conn.account_email || `${conn.provider.replace('_', ' ')} Connected`}
                      </p>
                    </div>

                    <div className="p-3.5 rounded-xl bg-background/80 border border-card-border text-xs space-y-2">
                      <div className="flex justify-between">
                        <span className="text-muted">Storage Mode:</span>
                        <span className="text-white font-semibold">
                          {conn.storage_mode === 'CONNECTED' ? 'Mode B (Connected)' : 'Mode A (Import)'}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted">Target Folder/Prefix:</span>
                        <span className="text-primary font-medium truncate max-w-[160px]">
                          {conn.folder_name || conn.folder_path || 'All Files'}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted">Last Synced:</span>
                        <span className="text-white">
                          {conn.last_synced_at ? formatDate(conn.last_synced_at) : 'Never'}
                        </span>
                      </div>
                    </div>

                    {conn.latest_sync_job && (
                      <div className="p-2.5 rounded-lg bg-primary/10 border border-primary/20 text-[11px] text-white flex items-center justify-between">
                        <span>Latest Sync ({conn.latest_sync_job.status}):</span>
                        <span className="font-bold text-primary">
                          +{conn.latest_sync_job.files_imported} photos
                        </span>
                      </div>
                    )}
                  </div>

                  <div className="pt-3 border-t border-card-border flex items-center justify-between gap-2">
                    <button
                      type="button"
                      onClick={() => handleTriggerSync(conn.id)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary text-white text-xs font-semibold hover:bg-primary-hover transition"
                    >
                      <RefreshCw className="h-3 w-3" />
                      Sync Now
                    </button>

                    <button
                      type="button"
                      onClick={() => handleDisconnect(conn.id)}
                      className="text-xs text-muted hover:text-red-400 p-1.5 rounded-lg hover:bg-red-500/10 transition"
                      title="Disconnect Provider"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              ))}

            {/* Add Provider Placeholder Card */}
            {connections.length <= 1 && (
              <div
                onClick={() => {
                  setWizardStep(1);
                  setWizardOpen(true);
                }}
                className="p-8 rounded-2xl border-2 border-dashed border-card-border hover:border-primary/50 transition cursor-pointer flex flex-col items-center justify-center text-center space-y-3 group bg-card/40"
              >
                <div className="h-12 w-12 rounded-2xl bg-card-border group-hover:bg-primary/20 group-hover:text-primary transition flex items-center justify-center text-muted">
                  <Plus className="h-6 w-6" />
                </div>
                <div>
                  <h4 className="font-bold text-white text-sm">Add S3, R2, or Cloud Storage</h4>
                  <p className="text-xs text-muted mt-1 max-w-xs">
                    Seamlessly link your Amazon S3, Cloudflare R2, Google Drive, or Dropbox archives.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* ----------------- 6-STEP CONNECT STORAGE WIZARD MODAL ----------------- */}
      {wizardOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="w-full max-w-2xl bg-card border border-card-border rounded-3xl p-6 sm:p-8 space-y-6 shadow-2xl relative max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => setWizardOpen(false)}
              className="absolute top-6 right-6 text-muted hover:text-white p-1 rounded-lg hover:bg-card-border transition"
            >
              <X className="h-5 w-5" />
            </button>

            {/* Wizard Step Header */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-primary uppercase tracking-wider">
                  Step {wizardStep} of 6
                </span>
              </div>
              <h3 className="text-xl font-extrabold text-white">
                {wizardStep === 1 && 'Select Storage Provider'}
                {wizardStep === 2 && 'Choose Storage & Streaming Mode'}
                {wizardStep === 3 &&
                  (isOAuthProvider
                    ? `Authorize with ${selectedProvider.replace('_', ' ')}`
                    : `Configure ${selectedProvider.replace('_', ' ')} Credentials`)}
                {wizardStep === 4 && 'Select Target Remote Folder or Prefix'}
                {wizardStep === 5 && 'Map to PixMatch Client Gallery'}
                {wizardStep === 6 && 'Ready to Synchronize'}
              </h3>
            </div>

            {/* Progress Bar */}
            <div className="w-full h-1.5 bg-card-border rounded-full overflow-hidden">
              <div
                className="h-full bg-primary transition-all duration-300"
                style={{ width: `${(wizardStep / 6) * 100}%` }}
              />
            </div>

            {/* STEP 1: Provider Selection */}
            {wizardStep === 1 && (
              <div className="space-y-4">
                <p className="text-xs text-muted">
                  Choose the cloud storage provider or external source where your event photos are stored.
                </p>

                {/* S3 & Cloud Storage */}
                <div>
                  <h6 className="text-[11px] font-bold text-muted uppercase tracking-wider mb-2">
                    S3 & Object Storage
                  </h6>
                  <div className="grid grid-cols-3 gap-3">
                    {[
                      { id: 'S3', name: 'Amazon S3', desc: 'Standard & Glacier Instant' },
                      { id: 'CLOUDFLARE_R2', name: 'Cloudflare R2', desc: 'Zero Egress Fees' },
                      { id: 'GENERIC_S3', name: 'Generic S3', desc: 'MinIO, Wasabi, Backblaze' },
                    ].map((prov) => (
                      <div
                        key={prov.id}
                        onClick={() => setSelectedProvider(prov.id as any)}
                        className={`p-3.5 rounded-xl border cursor-pointer transition flex flex-col justify-between space-y-2 ${
                          selectedProvider === prov.id
                            ? 'bg-primary/10 border-primary shadow-lg shadow-primary/10'
                            : 'bg-background border-card-border hover:border-card-border/80'
                        }`}
                      >
                        <div className="h-7 w-7 rounded-lg bg-card-border flex items-center justify-center text-primary font-bold">
                          {getProviderIcon(prov.id)}
                        </div>
                        <div>
                          <h5 className="font-bold text-white text-xs">{prov.name}</h5>
                          <p className="text-[10px] text-muted">{prov.desc}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Cloud Drives (OAuth) */}
                <div>
                  <h6 className="text-[11px] font-bold text-muted uppercase tracking-wider mb-2">
                    Cloud Drives (OAuth 2.0)
                  </h6>
                  <div className="grid grid-cols-3 gap-3">
                    {[
                      { id: 'GOOGLE_DRIVE', name: 'Google Drive', desc: 'Workspace & Personal' },
                      { id: 'DROPBOX', name: 'Dropbox', desc: 'Business & Pro' },
                      { id: 'ONEDRIVE', name: 'OneDrive', desc: 'Microsoft 365' },
                    ].map((prov) => (
                      <div
                        key={prov.id}
                        onClick={() => setSelectedProvider(prov.id as any)}
                        className={`p-3.5 rounded-xl border cursor-pointer transition flex flex-col justify-between space-y-2 ${
                          selectedProvider === prov.id
                            ? 'bg-primary/10 border-primary shadow-lg shadow-primary/10'
                            : 'bg-background border-card-border hover:border-card-border/80'
                        }`}
                      >
                        <div className="h-7 w-7 rounded-lg bg-card-border flex items-center justify-center text-primary font-bold">
                          <Cloud className="h-3.5 w-3.5" />
                        </div>
                        <div>
                          <h5 className="font-bold text-white text-xs">{prov.name}</h5>
                          <p className="text-[10px] text-muted">{prov.desc}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* External URL Ingestion */}
                <div>
                  <h6 className="text-[11px] font-bold text-muted uppercase tracking-wider mb-2">
                    Direct Web & Manifest
                  </h6>
                  <div
                    onClick={() => setSelectedProvider('EXTERNAL_URL')}
                    className={`p-3.5 rounded-xl border cursor-pointer transition flex items-center gap-3 ${
                      selectedProvider === 'EXTERNAL_URL'
                        ? 'bg-primary/10 border-primary shadow-lg shadow-primary/10'
                        : 'bg-background border-card-border hover:border-card-border/80'
                    }`}
                  >
                    <div className="h-7 w-7 rounded-lg bg-card-border flex items-center justify-center text-sky-400 font-bold">
                      <Globe className="h-3.5 w-3.5" />
                    </div>
                    <div>
                      <h5 className="font-bold text-white text-xs">External Image URLs / JSON Manifest</h5>
                      <p className="text-[10px] text-muted">
                        Ingest public or authenticated image links & JSON manifests with SSRF protection
                      </p>
                    </div>
                  </div>
                </div>

                <div className="pt-4 flex justify-end">
                  <button
                    onClick={() => setWizardStep(2)}
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-white text-xs font-bold hover:bg-primary-hover transition"
                  >
                    Next: Choose Storage Mode
                    <ArrowRight className="h-4 w-4" />
                  </button>
                </div>
              </div>
            )}

            {/* STEP 2: Storage Mode Selection */}
            {wizardStep === 2 && (
              <div className="space-y-4">
                <p className="text-xs text-muted">
                  Choose how PixMatch handles storage, thumbnails, and bandwidth for this connection.
                </p>

                <div className="space-y-3">
                  <div
                    onClick={() => setSelectedMode('CONNECTED')}
                    className={`p-5 rounded-2xl border cursor-pointer transition space-y-2 ${
                      selectedMode === 'CONNECTED'
                        ? 'bg-primary/10 border-primary shadow-lg shadow-primary/10'
                        : 'bg-background border-card-border hover:border-card-border/80'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Zap className="h-4 w-4 text-primary" />
                        <h5 className="font-bold text-white text-sm">Mode B: Connected Storage (Recommended)</h5>
                      </div>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400">
                        Zero Local Disk
                      </span>
                    </div>
                    <p className="text-xs text-muted pl-6">
                      Keep original full-res files in your bucket/cloud. PixMatch only stores fast thumbnails and vector embeddings. Original downloads stream on-demand via time-expiring presigned links.
                    </p>
                  </div>

                  <div
                    onClick={() => setSelectedMode('IMPORT')}
                    className={`p-5 rounded-2xl border cursor-pointer transition space-y-2 ${
                      selectedMode === 'IMPORT'
                        ? 'bg-primary/10 border-primary shadow-lg shadow-primary/10'
                        : 'bg-background border-card-border hover:border-card-border/80'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <HardDrive className="h-4 w-4 text-primary" />
                        <h5 className="font-bold text-white text-sm">Mode A: Import to Platform</h5>
                      </div>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-primary/10 text-primary">
                        Complete Copy
                      </span>
                    </div>
                    <p className="text-xs text-muted pl-6">
                      Download full-resolution originals into PixMatch platform storage. Independent of external cloud changes.
                    </p>
                  </div>
                </div>

                <div className="pt-4 flex items-center justify-between">
                  <button
                    onClick={() => setWizardStep(1)}
                    className="text-xs font-semibold text-muted hover:text-white"
                  >
                    Back
                  </button>
                  <button
                    onClick={() => setWizardStep(3)}
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-white text-xs font-bold hover:bg-primary-hover transition"
                  >
                    Next: {isOAuthProvider ? 'Authorize Provider' : 'Configure Credentials'}
                    <ArrowRight className="h-4 w-4" />
                  </button>
                </div>
              </div>
            )}

            {/* STEP 3: Provider Auth / Config */}
            {wizardStep === 3 && (
              <div className="space-y-4">
                {isOAuthProvider ? (
                  <div className="space-y-5 text-center py-4">
                    <div className="h-16 w-16 rounded-3xl bg-primary/20 text-primary border border-primary/30 flex items-center justify-center mx-auto shadow-xl">
                      <ShieldCheck className="h-8 w-8" />
                    </div>
                    <div className="space-y-1">
                      <h4 className="text-base font-bold text-white">OAuth 2.0 Security Handshake</h4>
                      <p className="text-xs text-muted max-w-md mx-auto">
                        You will be redirected to {selectedProvider.replace('_', ' ')} to authorize read-only photo access. Tokens are encrypted with AES-256-GCM before database storage.
                      </p>
                    </div>

                    {oauthError && (
                      <div className="p-3.5 bg-rose-500/10 border border-rose-500/30 rounded-xl text-xs text-left text-rose-300 space-y-1">
                        <p className="font-bold flex items-center gap-1.5 text-rose-200">
                          <AlertTriangle className="h-4 w-4 shrink-0 text-rose-400" />
                          {oauthError === 'NOT_CONFIGURED'
                            ? `${selectedProvider === 'GOOGLE_DRIVE' ? 'Google Drive' : selectedProvider.replace('_', ' ')} OAuth is not configured for this deployment.`
                            : 'Authorization Error'}
                        </p>
                        <p className="text-[11px] text-rose-300/90 leading-relaxed">
                          {oauthError === 'NOT_CONFIGURED' ? (
                            <>
                              Please configure <code className="font-mono bg-rose-950/50 px-1 py-0.5 rounded text-rose-200">GOOGLE_CLIENT_ID</code> and <code className="font-mono bg-rose-950/50 px-1 py-0.5 rounded text-rose-200">GOOGLE_CLIENT_SECRET</code> on the API server.
                            </>
                          ) : (
                            oauthError
                          )}
                        </p>
                      </div>
                    )}

                    <div className="pt-4 flex flex-col sm:flex-row items-center justify-center gap-3">
                      <button
                        onClick={() => {
                          setOauthError(null);
                          setWizardStep(2);
                        }}
                        className="text-xs font-semibold text-muted hover:text-white px-4 py-2.5"
                      >
                        Back
                      </button>
                      <button
                        onClick={startOAuthFlow}
                        disabled={connecting}
                        className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-primary text-white text-xs font-bold hover:bg-primary-hover transition shadow-xl shadow-primary/20"
                      >
                        {connecting ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <ExternalLink className="h-4 w-4" />
                        )}
                        {selectedProvider === 'GOOGLE_DRIVE' ? 'Authorize via Google Cloud OAuth' : `Authorize via ${selectedProvider.replace('_', ' ')} OAuth`}
                      </button>
                    </div>

                    <div className="p-3 bg-card/60 border border-card-border rounded-xl text-[11px] text-muted text-left">
                      <p className="font-semibold text-white mb-1">ℹ️ Google Cloud OAuth Setup Note:</p>
                      <p>
                        To use live Google OAuth, ensure <code className="text-primary font-mono">GOOGLE_CLIENT_ID</code> and <code className="text-primary font-mono">GOOGLE_CLIENT_SECRET</code> from the Google Cloud Console are configured on the API server, with the authorized redirect URI matching your deployment.
                      </p>
                    </div>
                  </div>
                ) : selectedProvider === 'EXTERNAL_URL' ? (
                  /* External URL Form */
                  <div className="space-y-4">
                    <div className="space-y-3">
                      <div>
                        <label className="text-xs font-bold text-white">Connection Label</label>
                        <input
                          type="text"
                          placeholder="e.g., Event Photo Manifest / CDN Link"
                          value={urlForm.displayName}
                          onChange={(e) => setUrlForm({ ...urlForm, displayName: e.target.value })}
                          className="w-full mt-1 px-3 py-2 rounded-xl bg-background border border-card-border text-xs text-white focus:outline-none focus:border-primary"
                        />
                      </div>
                      <div>
                        <label className="text-xs font-bold text-white">JSON Manifest URL (Optional)</label>
                        <input
                          type="url"
                          placeholder="https://example.com/gallery-manifest.json"
                          value={urlForm.manifestUrl}
                          onChange={(e) => setUrlForm({ ...urlForm, manifestUrl: e.target.value })}
                          className="w-full mt-1 px-3 py-2 rounded-xl bg-background border border-card-border text-xs text-white focus:outline-none focus:border-primary"
                        />
                      </div>
                      <div>
                        <label className="text-xs font-bold text-white">Direct Image URLs (One per line)</label>
                        <textarea
                          rows={4}
                          placeholder="https://example.com/photos/image1.jpg&#10;https://example.com/photos/image2.jpg"
                          value={urlForm.urls}
                          onChange={(e) => setUrlForm({ ...urlForm, urls: e.target.value })}
                          className="w-full mt-1 px-3 py-2 rounded-xl bg-background border border-card-border text-xs text-white focus:outline-none focus:border-primary font-mono text-[11px]"
                        />
                      </div>
                      <div>
                        <label className="text-xs font-bold text-white">HTTP Headers / Bearer Token (Optional JSON)</label>
                        <input
                          type="text"
                          placeholder='e.g., Bearer eyJhbGci... or {"Authorization": "Bearer token"}'
                          value={urlForm.headers}
                          onChange={(e) => setUrlForm({ ...urlForm, headers: e.target.value })}
                          className="w-full mt-1 px-3 py-2 rounded-xl bg-background border border-card-border text-xs text-white focus:outline-none focus:border-primary font-mono text-[11px]"
                        />
                      </div>
                    </div>

                    {/* Test result display */}
                    {configTestResult && (
                      <div
                        className={`p-3 rounded-xl border text-xs space-y-1 ${
                          configTestResult.success
                            ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                            : 'bg-red-500/10 border-red-500/20 text-red-400'
                        }`}
                      >
                        <div className="font-bold flex items-center gap-1.5">
                          {configTestResult.success ? (
                            <CheckCircle2 className="h-4 w-4" />
                          ) : (
                            <AlertCircle className="h-4 w-4" />
                          )}
                          {configTestResult.message}
                          {configTestResult.latencyMs && ` (${configTestResult.latencyMs}ms)`}
                        </div>
                        {configTestResult.details?.map((d, i) => (
                          <div key={i} className="text-[11px] opacity-90 pl-5">
                            {d}
                          </div>
                        ))}
                      </div>
                    )}

                    <div className="pt-2 flex items-center justify-between">
                      <button
                        onClick={() => setWizardStep(2)}
                        className="text-xs font-semibold text-muted hover:text-white"
                      >
                        Back
                      </button>
                      <div className="flex items-center gap-3">
                        <button
                          type="button"
                          onClick={handleTestDirectConfig}
                          disabled={configTesting || (!urlForm.manifestUrl && !urlForm.urls)}
                          className="px-4 py-2 rounded-xl bg-card-border text-white text-xs font-semibold hover:bg-card-border/80 transition flex items-center gap-1.5"
                        >
                          {configTesting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Activity className="h-3.5 w-3.5" />}
                          Test Connection
                        </button>
                        <button
                          type="button"
                          onClick={handleConnectDirectProvider}
                          disabled={connecting || (!urlForm.manifestUrl && !urlForm.urls)}
                          className="px-5 py-2.5 rounded-xl bg-primary text-white text-xs font-bold hover:bg-primary-hover transition flex items-center gap-1.5"
                        >
                          {connecting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <KeyRound className="h-3.5 w-3.5" />}
                          Save & Connect
                        </button>
                      </div>
                    </div>
                  </div>
                ) : (
                  /* S3 / Cloudflare R2 / Generic S3 Form */
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-3">
                      <div className="col-span-2">
                        <label className="text-xs font-bold text-white">Connection Label</label>
                        <input
                          type="text"
                          placeholder="e.g., Client Wedding Bucket (Production)"
                          value={s3Form.displayName}
                          onChange={(e) => setS3Form({ ...s3Form, displayName: e.target.value })}
                          className="w-full mt-1 px-3 py-2 rounded-xl bg-background border border-card-border text-xs text-white focus:outline-none focus:border-primary"
                        />
                      </div>

                      <div>
                        <label className="text-xs font-bold text-white">Bucket Name *</label>
                        <input
                          type="text"
                          placeholder="my-photo-bucket"
                          value={s3Form.bucket}
                          onChange={(e) => setS3Form({ ...s3Form, bucket: e.target.value })}
                          className="w-full mt-1 px-3 py-2 rounded-xl bg-background border border-card-border text-xs text-white focus:outline-none focus:border-primary"
                        />
                      </div>

                      <div>
                        <label className="text-xs font-bold text-white">
                          {selectedProvider === 'CLOUDFLARE_R2' ? 'Region (auto)' : 'Region *'}
                        </label>
                        <input
                          type="text"
                          placeholder={selectedProvider === 'CLOUDFLARE_R2' ? 'auto' : 'us-east-1'}
                          value={s3Form.region}
                          onChange={(e) => setS3Form({ ...s3Form, region: e.target.value })}
                          className="w-full mt-1 px-3 py-2 rounded-xl bg-background border border-card-border text-xs text-white focus:outline-none focus:border-primary"
                        />
                      </div>

                      {selectedProvider === 'CLOUDFLARE_R2' && (
                        <div className="col-span-2">
                          <label className="text-xs font-bold text-white">Cloudflare Account ID *</label>
                          <input
                            type="text"
                            placeholder="e.g., 9a8b7c6d5e4f..."
                            value={s3Form.accountId}
                            onChange={(e) => setS3Form({ ...s3Form, accountId: e.target.value })}
                            className="w-full mt-1 px-3 py-2 rounded-xl bg-background border border-card-border text-xs text-white focus:outline-none focus:border-primary"
                          />
                        </div>
                      )}

                      {selectedProvider === 'GENERIC_S3' && (
                        <div className="col-span-2">
                          <label className="text-xs font-bold text-white">Custom Endpoint URL *</label>
                          <input
                            type="url"
                            placeholder="https://s3.us-west-002.backblazeb2.com"
                            value={s3Form.endpoint}
                            onChange={(e) => setS3Form({ ...s3Form, endpoint: e.target.value })}
                            className="w-full mt-1 px-3 py-2 rounded-xl bg-background border border-card-border text-xs text-white focus:outline-none focus:border-primary"
                          />
                        </div>
                      )}

                      <div>
                        <label className="text-xs font-bold text-white">Access Key ID *</label>
                        <input
                          type="text"
                          placeholder="AKIAIOSFODNN7EXAMPLE"
                          value={s3Form.accessKeyId}
                          onChange={(e) => setS3Form({ ...s3Form, accessKeyId: e.target.value })}
                          className="w-full mt-1 px-3 py-2 rounded-xl bg-background border border-card-border text-xs text-white focus:outline-none focus:border-primary font-mono text-[11px]"
                        />
                      </div>

                      <div>
                        <label className="text-xs font-bold text-white">Secret Access Key *</label>
                        <input
                          type="password"
                          placeholder="wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY"
                          value={s3Form.secretAccessKey}
                          onChange={(e) => setS3Form({ ...s3Form, secretAccessKey: e.target.value })}
                          className="w-full mt-1 px-3 py-2 rounded-xl bg-background border border-card-border text-xs text-white focus:outline-none focus:border-primary font-mono text-[11px]"
                        />
                      </div>

                      <div className="col-span-2">
                        <label className="text-xs font-bold text-white">Key Prefix / Virtual Folder (Optional)</label>
                        <input
                          type="text"
                          placeholder="photos/wedding-2026/ (leave empty for full bucket)"
                          value={s3Form.prefix}
                          onChange={(e) => setS3Form({ ...s3Form, prefix: e.target.value })}
                          className="w-full mt-1 px-3 py-2 rounded-xl bg-background border border-card-border text-xs text-white focus:outline-none focus:border-primary"
                        />
                      </div>

                      {selectedProvider === 'GENERIC_S3' && (
                        <div className="col-span-2 flex items-center gap-2 pt-1">
                          <input
                            type="checkbox"
                            id="forcePathStyle"
                            checked={s3Form.forcePathStyle}
                            onChange={(e) => setS3Form({ ...s3Form, forcePathStyle: e.target.checked })}
                            className="h-4 w-4 rounded accent-primary cursor-pointer"
                          />
                          <label htmlFor="forcePathStyle" className="text-xs text-muted cursor-pointer">
                            Force Path-Style URLs (Required for MinIO and local testing)
                          </label>
                        </div>
                      )}
                    </div>

                    {/* Test result display */}
                    {configTestResult && (
                      <div
                        className={`p-3 rounded-xl border text-xs space-y-1 ${
                          configTestResult.success
                            ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                            : 'bg-red-500/10 border-red-500/20 text-red-400'
                        }`}
                      >
                        <div className="font-bold flex items-center gap-1.5">
                          {configTestResult.success ? (
                            <CheckCircle2 className="h-4 w-4" />
                          ) : (
                            <AlertCircle className="h-4 w-4" />
                          )}
                          {configTestResult.message}
                          {configTestResult.latencyMs && ` (${configTestResult.latencyMs}ms)`}
                        </div>
                        {configTestResult.details?.map((d, i) => (
                          <div key={i} className="text-[11px] opacity-90 pl-5">
                            {d}
                          </div>
                        ))}
                      </div>
                    )}

                    <div className="pt-2 flex items-center justify-between">
                      <button
                        onClick={() => setWizardStep(2)}
                        className="text-xs font-semibold text-muted hover:text-white"
                      >
                        Back
                      </button>
                      <div className="flex items-center gap-3">
                        <button
                          type="button"
                          onClick={handleTestDirectConfig}
                          disabled={
                            configTesting ||
                            !s3Form.bucket ||
                            !s3Form.accessKeyId ||
                            !s3Form.secretAccessKey ||
                            (selectedProvider === 'CLOUDFLARE_R2' && !s3Form.accountId) ||
                            (selectedProvider === 'GENERIC_S3' && !s3Form.endpoint)
                          }
                          className="px-4 py-2 rounded-xl bg-card-border text-white text-xs font-semibold hover:bg-card-border/80 transition flex items-center gap-1.5"
                        >
                          {configTesting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Activity className="h-3.5 w-3.5" />}
                          Test Bucket Access
                        </button>
                        <button
                          type="button"
                          onClick={handleConnectDirectProvider}
                          disabled={
                            connecting ||
                            !s3Form.bucket ||
                            !s3Form.accessKeyId ||
                            !s3Form.secretAccessKey ||
                            (selectedProvider === 'CLOUDFLARE_R2' && !s3Form.accountId) ||
                            (selectedProvider === 'GENERIC_S3' && !s3Form.endpoint)
                          }
                          className="px-5 py-2.5 rounded-xl bg-primary text-white text-xs font-bold hover:bg-primary-hover transition flex items-center gap-1.5"
                        >
                          {connecting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <KeyRound className="h-3.5 w-3.5" />}
                          Save & Connect
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* STEP 4: Remote Folder Browser */}
            {wizardStep === 4 && (
              <div className="space-y-4">
                <p className="text-xs text-muted">
                  Choose the remote folder or prefix containing photographs for this sync connection.
                </p>

                <div className="p-4 rounded-2xl bg-background border border-card-border space-y-3 max-h-64 overflow-y-auto">
                  {loadingFolders ? (
                    <div className="py-8 flex flex-col items-center justify-center space-y-2 text-muted">
                      <Loader2 className="h-5 w-5 animate-spin text-primary" />
                      <span className="text-xs">Scanning remote directory...</span>
                    </div>
                  ) : folders.length === 0 ? (
                    <div className="py-8 text-center text-xs text-muted">No sub-folders found. Root prefix selected.</div>
                  ) : (
                    folders.map((f) => (
                      <div
                        key={f.id}
                        onClick={() => setSelectedFolder(f)}
                        className={`p-3 rounded-xl border flex items-center justify-between cursor-pointer transition ${
                          selectedFolder?.id === f.id
                            ? 'bg-primary/10 border-primary text-white font-medium'
                            : 'bg-card border-card-border hover:border-card-border/80 text-muted'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <Folder
                            className={`h-4 w-4 ${selectedFolder?.id === f.id ? 'text-primary' : 'text-muted'}`}
                          />
                          <span className="text-xs text-white">{f.name}</span>
                        </div>
                        {selectedFolder?.id === f.id && <Check className="h-4 w-4 text-primary" />}
                      </div>
                    ))
                  )}
                </div>

                <div className="pt-4 flex items-center justify-between">
                  <button
                    onClick={() => setWizardStep(3)}
                    className="text-xs font-semibold text-muted hover:text-white"
                  >
                    Back
                  </button>
                  <button
                    onClick={handleSelectFolder}
                    disabled={!selectedFolder}
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-white text-xs font-bold hover:bg-primary-hover transition disabled:opacity-50"
                  >
                    Select Prefix & Continue
                    <ArrowRight className="h-4 w-4" />
                  </button>
                </div>
              </div>
            )}

            {/* STEP 5: Destination Gallery Mapping */}
            {wizardStep === 5 && (
              <div className="space-y-4">
                <p className="text-xs text-muted">
                  Select which PixMatch client gallery will receive and organize the photographs from{' '}
                  <span className="text-white font-semibold">{selectedFolder?.name}</span>.
                </p>

                <div className="space-y-3">
                  <label className="text-xs font-bold text-white">Target Gallery</label>
                  <select
                    value={selectedGalleryId}
                    onChange={(e) => setSelectedGalleryId(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl bg-background border border-card-border text-xs text-white focus:outline-none focus:border-primary"
                  >
                    {galleries.map((g) => (
                      <option key={g.id} value={g.id}>
                        {g.title}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="p-4 rounded-xl bg-background border border-card-border flex items-center justify-between">
                  <div>
                    <h5 className="font-bold text-white text-xs">Incremental Delta Sync</h5>
                    <p className="text-[11px] text-muted">
                      Only ingest newly added or modified photos in future sync cycles.
                    </p>
                  </div>
                  <input
                    type="checkbox"
                    checked={isIncremental}
                    onChange={(e) => setIsIncremental(e.target.checked)}
                    className="h-4 w-4 rounded accent-primary cursor-pointer"
                  />
                </div>

                <div className="pt-4 flex items-center justify-between">
                  <button
                    onClick={() => setWizardStep(4)}
                    className="text-xs font-semibold text-muted hover:text-white"
                  >
                    Back
                  </button>
                  <button
                    onClick={() => setWizardStep(6)}
                    disabled={!selectedGalleryId}
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-white text-xs font-bold hover:bg-primary-hover transition"
                  >
                    Review & Finish
                    <ArrowRight className="h-4 w-4" />
                  </button>
                </div>
              </div>
            )}

            {/* STEP 6: Confirmation & Trigger Sync */}
            {wizardStep === 6 && (
              <div className="space-y-4">
                <div className="p-4 rounded-2xl bg-background border border-card-border space-y-3 text-xs">
                  <div className="flex justify-between">
                    <span className="text-muted">Cloud Provider:</span>
                    <span className="text-white font-bold">{selectedProvider.replace('_', ' ')}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted">Storage Mode:</span>
                    <span className="text-primary font-bold">
                      {selectedMode === 'CONNECTED'
                        ? 'Mode B: Connected Storage'
                        : 'Mode A: Import to Platform'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted">Source Prefix/Folder:</span>
                    <span className="text-white">{selectedFolder?.name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted">Target Gallery:</span>
                    <span className="text-white font-semibold">
                      {galleries.find((g) => g.id === selectedGalleryId)?.title}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted">AI Face Indexing:</span>
                    <span className="text-emerald-400 font-semibold">Enabled (Auto-Index on Ingest)</span>
                  </div>
                </div>

                <div className="pt-4 flex items-center justify-between">
                  <button
                    onClick={() => setWizardStep(5)}
                    className="text-xs font-semibold text-muted hover:text-white"
                  >
                    Back
                  </button>
                  <button
                    onClick={() => {
                      if (activeConnectionId) {
                        handleTriggerSync(activeConnectionId, selectedGalleryId);
                      }
                    }}
                    className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-primary text-white text-xs font-bold hover:bg-primary-hover transition shadow-xl shadow-primary/20"
                  >
                    <Zap className="h-4 w-4" />
                    Start Initial Synchronization
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ----------------- LIVE SYNC PROGRESS MODAL ----------------- */}
      {activeSyncJobId && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-card border border-card-border rounded-3xl p-6 space-y-5 shadow-2xl">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="h-8 w-8 rounded-xl bg-primary/20 text-primary flex items-center justify-center">
                  <RefreshCw className={`h-4 w-4 ${pollingSync ? 'animate-spin' : ''}`} />
                </div>
                <div>
                  <h4 className="font-bold text-white text-sm">Storage Synchronization</h4>
                  <p className="text-[11px] text-muted">Job ID: {activeSyncJobId.slice(0, 8)}...</p>
                </div>
              </div>
              {!pollingSync && (
                <button
                  onClick={() => setActiveSyncJobId(null)}
                  className="text-muted hover:text-white p-1 rounded-lg"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>

            <div className="p-4 rounded-xl bg-background border border-card-border space-y-2.5 text-xs">
              <div className="flex justify-between">
                <span className="text-muted">Status:</span>
                <span
                  className={`font-bold ${
                    syncJobData?.status === 'COMPLETED'
                      ? 'text-emerald-400'
                      : syncJobData?.status === 'FAILED'
                      ? 'text-red-400'
                      : 'text-primary animate-pulse'
                  }`}
                >
                  {syncJobData?.status || 'RUNNING'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted">Files Discovered:</span>
                <span className="text-white font-semibold">{syncJobData?.files_discovered || 0}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted">Files Ingested:</span>
                <span className="text-emerald-400 font-semibold">{syncJobData?.files_imported || 0}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted">Files Skipped (Cached):</span>
                <span className="text-muted">{syncJobData?.files_skipped || 0}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted">Bytes Transferred:</span>
                <span className="text-white font-semibold">
                  {syncJobData?.bytes_transferred ? formatBytes(syncJobData.bytes_transferred) : '0 B'}
                </span>
              </div>
            </div>

            {!pollingSync && (
              <button
                onClick={() => setActiveSyncJobId(null)}
                className="w-full py-2.5 rounded-xl bg-primary text-white text-xs font-bold hover:bg-primary-hover transition"
              >
                Close Progress
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
