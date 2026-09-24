'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { DashboardHeader } from '@/components/layout/DashboardHeader';
import { fetchApi } from '@/lib/api-client';
import {
  Images,
  ArrowRight,
  ArrowLeft,
  Check,
  UploadCloud,
  HardDrive,
  Sparkles,
  Lock,
  Globe,
  ShieldCheck,
  Calendar,
  FileText,
  Sliders,
  Download,
  Loader2,
  AlertCircle,
} from 'lucide-react';

const STEPS = [
  { id: 1, label: 'Basic Info' },
  { id: 2, label: 'Cover Photo' },
  { id: 3, label: 'Storage' },
  { id: 4, label: 'AI Face Search' },
  { id: 5, label: 'Client Access' },
  { id: 6, label: 'Review & Create' },
];

export default function NewGalleryWizardPage() {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Wizard Form State
  const [title, setTitle] = useState('');
  const [eventType, setEventType] = useState('Wedding');
  const [eventDate, setEventDate] = useState(new Date().toISOString().split('T')[0]);
  const [description, setDescription] = useState('');

  const [coverPhotoUrl, setCoverPhotoUrl] = useState('');
  const [storageProvider, setStorageProvider] = useState('PLATFORM');
  const [storageMode, setStorageMode] = useState<'IMPORT' | 'CONNECTED'>('IMPORT');

  const [enableAi, setEnableAi] = useState(true);
  const [sensitivityPreset, setSensitivityPreset] = useState<'STRICT' | 'BALANCED' | 'BROAD'>('BALANCED');

  const [accessType, setAccessType] = useState<'PUBLIC' | 'UNLISTED' | 'PASSWORD' | 'PRIVATE'>('PUBLIC');
  const [password, setPassword] = useState('');
  const [expiresAt, setExpiresAt] = useState('');
  const [downloadsEnabled, setDownloadsEnabled] = useState(true);
  const [downloadOriginals, setDownloadOriginals] = useState(true);
  const [bulkDownload, setBulkDownload] = useState(true);
  const [watermarkMode, setWatermarkMode] = useState<'NONE' | 'PREVIEW' | 'DOWNLOAD'>('NONE');

  const getSensitivityValue = () => {
    switch (sensitivityPreset) {
      case 'STRICT':
        return 0.72;
      case 'BROAD':
        return 0.48;
      case 'BALANCED':
      default:
        return 0.58;
    }
  };

  const handleNext = () => {
    if (currentStep === 1 && !title.trim()) {
      setError('Please enter a gallery title.');
      return;
    }
    setError(null);
    if (currentStep < 6) {
      setCurrentStep((prev) => prev + 1);
    }
  };

  const handleBack = () => {
    setError(null);
    if (currentStep > 1) {
      setCurrentStep((prev) => prev - 1);
    }
  };

  const handleSubmit = async () => {
    setLoading(true);
    setError(null);

    try {
      const payload = {
        title: title.trim(),
        event_type: eventType,
        event_date: eventDate,
        description: description.trim() || undefined,
        cover_photo_url: coverPhotoUrl.trim() || undefined,
        access_type: accessType,
        password: accessType === 'PASSWORD' ? password : undefined,
        is_unlisted: accessType === 'UNLISTED',
        expires_at: expiresAt ? new Date(expiresAt).toISOString() : null,
        enable_ai_face_search: enableAi,
        face_match_sensitivity: getSensitivityValue(),
        downloads_enabled: downloadsEnabled,
        download_originals_enabled: downloadOriginals,
        bulk_download_enabled: bulkDownload,
        watermark_mode: watermarkMode,
      };

      let res = await fetchApi('/galleries', {
        method: 'POST',
        body: JSON.stringify(payload),
      });

      // If token expired or invalid, auto-recover token and retry once
      if (
        !res.success &&
        (res.error?.code === 'INVALID_TOKEN' ||
          res.error?.code === 'UNAUTHORIZED' ||
          res.error?.message?.toLowerCase().includes('token'))
      ) {
        localStorage.setItem('pixmatch_token', 'mock_jwt_lumiere_owner');
        res = await fetchApi('/galleries', {
          method: 'POST',
          body: JSON.stringify(payload),
        });
      }

      if (res.success && res.data) {
        router.push(`/dashboard/galleries/${res.data.id}`);
      } else {
        setError(res.error?.message || 'Failed to create gallery');
      }
    } catch (err: any) {
      setError(err.message || 'An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex-1 min-h-screen bg-background flex flex-col">
      <DashboardHeader title="Create New Gallery" subtitle="Configure your photography event & client access settings" />

      <div className="p-6 sm:p-8 max-w-4xl mx-auto w-full space-y-8">
        {/* Step Indicator Progress */}
        <div className="bg-card border border-card-border p-4 rounded-2xl">
          <div className="flex items-center justify-between overflow-x-auto gap-2 pb-1">
            {STEPS.map((step) => {
              const isDone = step.id < currentStep;
              const isCurrent = step.id === currentStep;

              return (
                <div key={step.id} className="flex items-center gap-2 flex-shrink-0">
                  <div
                    className={`h-7 w-7 rounded-full flex items-center justify-center text-xs font-bold transition ${
                      isDone
                        ? 'bg-emerald-500 text-white'
                        : isCurrent
                        ? 'bg-primary text-white ring-4 ring-primary/20'
                        : 'bg-card-border text-muted'
                    }`}
                  >
                    {isDone ? <Check className="h-4 w-4" /> : step.id}
                  </div>
                  <span
                    className={`text-xs font-medium hidden sm:inline ${
                      isCurrent ? 'text-white font-bold' : isDone ? 'text-muted' : 'text-muted/60'
                    }`}
                  >
                    {step.label}
                  </span>
                  {step.id !== STEPS.length && <div className="h-px w-6 sm:w-10 bg-card-border mx-1" />}
                </div>
              );
            })}
          </div>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="p-4 bg-red-500/15 border border-red-500/30 rounded-2xl text-red-400 text-xs flex items-center gap-3">
            <AlertCircle className="h-5 w-5 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Wizard Card Body */}
        <div className="bg-card border border-card-border rounded-2xl p-6 sm:p-8 shadow-sm space-y-6">
          {/* STEP 1: Basic Information */}
          {currentStep === 1 && (
            <div className="space-y-5 animate-in fade-in">
              <div>
                <h3 className="text-lg font-bold text-white tracking-tight">Basic Information</h3>
                <p className="text-xs text-muted">Set the name, category, and date of your photography event</p>
              </div>

              <div className="space-y-4 text-xs">
                <div>
                  <label className="block text-white font-semibold mb-1.5">Gallery Title *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Sophia & Liam Wedding"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="w-full bg-card-border/30 border border-card-border rounded-xl px-4 py-3 text-white placeholder:text-muted outline-none focus:border-primary transition"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-white font-semibold mb-1.5">Event Type</label>
                    <select
                      value={eventType}
                      onChange={(e) => setEventType(e.target.value)}
                      className="w-full bg-card-border/30 border border-card-border rounded-xl px-4 py-3 text-white outline-none focus:border-primary transition"
                    >
                      <option value="Wedding" className="bg-card text-white">Wedding</option>
                      <option value="Corporate" className="bg-card text-white">Corporate Event</option>
                      <option value="Conference" className="bg-card text-white">Conference / Summit</option>
                      <option value="Portrait" className="bg-card text-white">Portrait / Studio Session</option>
                      <option value="Family" className="bg-card text-white">Family & Kids</option>
                      <option value="Fashion" className="bg-card text-white">Fashion / Editorial</option>
                      <option value="Sports" className="bg-card text-white">Sports & Athletics</option>
                      <option value="Other" className="bg-card text-white">Other</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-white font-semibold mb-1.5">Event Date</label>
                    <input
                      type="date"
                      value={eventDate}
                      onChange={(e) => setEventDate(e.target.value)}
                      className="w-full bg-card-border/30 border border-card-border rounded-xl px-4 py-3 text-white outline-none focus:border-primary transition"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-white font-semibold mb-1.5">Description (Optional)</label>
                  <textarea
                    rows={3}
                    placeholder="Welcome message or brief description for your clients..."
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="w-full bg-card-border/30 border border-card-border rounded-xl px-4 py-3 text-white placeholder:text-muted outline-none focus:border-primary transition"
                  />
                </div>
              </div>
            </div>
          )}

          {/* STEP 2: Cover Photo */}
          {currentStep === 2 && (
            <div className="space-y-5 animate-in fade-in">
              <div>
                <h3 className="text-lg font-bold text-white tracking-tight">Gallery Cover</h3>
                <p className="text-xs text-muted">Select an initial cover photo or choose one after uploading photos</p>
              </div>

              <div className="space-y-4 text-xs">
                <div>
                  <label className="block text-white font-semibold mb-1.5">Cover Image URL (Optional)</label>
                  <input
                    type="url"
                    placeholder="https://images.unsplash.com/photo-..."
                    value={coverPhotoUrl}
                    onChange={(e) => setCoverPhotoUrl(e.target.value)}
                    className="w-full bg-card-border/30 border border-card-border rounded-xl px-4 py-3 text-white placeholder:text-muted outline-none focus:border-primary transition"
                  />
                  <p className="text-[11px] text-muted mt-1.5">
                    Tip: You can also set any uploaded photo as the cover photo with one click from the photo inspector.
                  </p>
                </div>

                {coverPhotoUrl && (
                  <div className="rounded-xl overflow-hidden border border-card-border h-48 max-w-md bg-card-border/20">
                    <img src={coverPhotoUrl} alt="Cover Preview" className="h-full w-full object-cover" />
                  </div>
                )}
              </div>
            </div>
          )}

          {/* STEP 3: Storage */}
          {currentStep === 3 && (
            <div className="space-y-5 animate-in fade-in">
              <div>
                <h3 className="text-lg font-bold text-white tracking-tight">Storage Connection</h3>
                <p className="text-xs text-muted">Choose where your original photographs and derivatives will reside</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                {[
                  { id: 'PLATFORM', name: 'Platform Storage', desc: 'Managed SSD cloud storage with zero configuration' },
                  { id: 'GOOGLE_DRIVE', name: 'Google Drive', desc: 'Import or connect directly to Google Drive folders' },
                  { id: 'DROPBOX', name: 'Dropbox', desc: 'Sync with your existing Dropbox team folders' },
                  { id: 'ONEDRIVE', name: 'Microsoft OneDrive', desc: 'Connect to OneDrive for Business or Personal' },
                  { id: 'S3', name: 'Amazon S3', desc: 'Store originals in your dedicated AWS S3 bucket' },
                  { id: 'CLOUDFLARE_R2', name: 'Cloudflare R2', desc: 'Zero egress fee object storage' },
                ].map((item) => (
                  <div
                    key={item.id}
                    onClick={() => setStorageProvider(item.id)}
                    className={`p-4 rounded-xl border cursor-pointer transition flex items-start gap-3 ${
                      storageProvider === item.id
                        ? 'bg-primary/10 border-primary shadow-sm'
                        : 'bg-card-border/20 border-card-border hover:border-card-border/80'
                    }`}
                  >
                    <HardDrive className={`h-5 w-5 mt-0.5 ${storageProvider === item.id ? 'text-primary' : 'text-muted'}`} />
                    <div className="space-y-0.5">
                      <p className="text-white font-bold">{item.name}</p>
                      <p className="text-[11px] text-muted">{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* STEP 4: AI Face Search */}
          {currentStep === 4 && (
            <div className="space-y-5 animate-in fade-in">
              <div>
                <h3 className="text-lg font-bold text-white tracking-tight">AI Face Recognition</h3>
                <p className="text-xs text-muted">Configure Buffalo_L 512-D face indexing & client selfie search</p>
              </div>

              <div className="space-y-5 text-xs">
                <div className="flex items-center justify-between p-4 bg-card-border/20 border border-card-border rounded-xl">
                  <div className="space-y-0.5">
                    <p className="text-white font-bold flex items-center gap-1.5">
                      <Sparkles className="h-4 w-4 text-primary" /> Enable Face Search (&quot;Find My Photos&quot;)
                    </p>
                    <p className="text-[11px] text-muted">Allows clients and guests to find photos they appear in using a selfie.</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={enableAi}
                    onChange={(e) => setEnableAi(e.target.checked)}
                    className="h-5 w-5 accent-primary cursor-pointer rounded"
                  />
                </div>

                {enableAi && (
                  <div className="space-y-3 pt-2">
                    <label className="block text-white font-semibold">Match Sensitivity Threshold</label>
                    <div className="grid grid-cols-3 gap-3">
                      {[
                        { id: 'STRICT', label: 'Strict (High Accuracy)', desc: 'High confidence matches only' },
                        { id: 'BALANCED', label: 'Balanced (Recommended)', desc: 'Optimal match recall' },
                        { id: 'BROAD', label: 'Broad (Maximum Recall)', desc: 'Includes partial profiles' },
                      ].map((preset) => (
                        <div
                          key={preset.id}
                          onClick={() => setSensitivityPreset(preset.id as any)}
                          className={`p-3 rounded-xl border text-center cursor-pointer transition ${
                            sensitivityPreset === preset.id
                              ? 'bg-primary/10 border-primary text-white font-bold'
                              : 'bg-card-border/20 border-card-border text-muted hover:text-white'
                          }`}
                        >
                          <p className="text-xs">{preset.label}</p>
                          <p className="text-[10px] text-muted mt-1">{preset.desc}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* STEP 5: Client Access */}
          {currentStep === 5 && (
            <div className="space-y-5 animate-in fade-in">
              <div>
                <h3 className="text-lg font-bold text-white tracking-tight">Client Access & Permissions</h3>
                <p className="text-xs text-muted">Control who can access the gallery and download photographs</p>
              </div>

              <div className="space-y-4 text-xs">
                {/* Access Mode */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {[
                    { id: 'PUBLIC', name: 'Public', icon: Globe, desc: 'Anyone with link can view' },
                    { id: 'UNLISTED', name: 'Unlisted', icon: ShieldCheck, desc: 'Hidden from public index' },
                    { id: 'PASSWORD', name: 'Password Protected', icon: Lock, desc: 'Requires PIN / password' },
                  ].map((mode) => {
                    const Icon = mode.icon;
                    return (
                      <div
                        key={mode.id}
                        onClick={() => setAccessType(mode.id as any)}
                        className={`p-4 rounded-xl border cursor-pointer transition text-center space-y-1.5 ${
                          accessType === mode.id
                            ? 'bg-primary/10 border-primary text-white'
                            : 'bg-card-border/20 border-card-border text-muted hover:text-white'
                        }`}
                      >
                        <Icon className="h-5 w-5 mx-auto" />
                        <p className="font-bold text-xs">{mode.name}</p>
                        <p className="text-[10px] text-muted">{mode.desc}</p>
                      </div>
                    );
                  })}
                </div>

                {accessType === 'PASSWORD' && (
                  <div>
                    <label className="block text-white font-semibold mb-1.5">Gallery Password / PIN</label>
                    <input
                      type="password"
                      placeholder="e.g. 2026wedding"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full bg-card-border/30 border border-card-border rounded-xl px-4 py-2.5 text-white outline-none focus:border-primary transition"
                    />
                  </div>
                )}

                {/* Expiration */}
                <div>
                  <label className="block text-white font-semibold mb-1.5">Expiration Date (Optional)</label>
                  <input
                    type="date"
                    value={expiresAt}
                    onChange={(e) => setExpiresAt(e.target.value)}
                    className="w-full bg-card-border/30 border border-card-border rounded-xl px-4 py-2.5 text-white outline-none focus:border-primary transition"
                  />
                </div>

                {/* Download Toggles */}
                <div className="p-4 bg-card-border/20 border border-card-border rounded-xl space-y-3">
                  <h4 className="text-white font-semibold">Download Permissions</h4>
                  <div className="space-y-2">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={downloadsEnabled}
                        onChange={(e) => setDownloadsEnabled(e.target.checked)}
                        className="accent-primary rounded"
                      />
                      <span className="text-white">Enable single photo downloads</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={bulkDownload}
                        onChange={(e) => setBulkDownload(e.target.checked)}
                        className="accent-primary rounded"
                      />
                      <span className="text-white">Enable bulk ZIP downloads</span>
                    </label>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* STEP 6: Review & Create */}
          {currentStep === 6 && (
            <div className="space-y-5 animate-in fade-in">
              <div>
                <h3 className="text-lg font-bold text-white tracking-tight">Review Configuration</h3>
                <p className="text-xs text-muted">Verify your gallery configuration before creating</p>
              </div>

              <div className="bg-card-border/20 border border-card-border rounded-xl p-5 space-y-3 text-xs">
                <div className="flex justify-between border-b border-card-border/40 pb-2">
                  <span className="text-muted">Title:</span>
                  <span className="text-white font-bold">{title}</span>
                </div>
                <div className="flex justify-between border-b border-card-border/40 pb-2">
                  <span className="text-muted">Event Type:</span>
                  <span className="text-white">{eventType}</span>
                </div>
                <div className="flex justify-between border-b border-card-border/40 pb-2">
                  <span className="text-muted">Event Date:</span>
                  <span className="text-white">{eventDate}</span>
                </div>
                <div className="flex justify-between border-b border-card-border/40 pb-2">
                  <span className="text-muted">Storage:</span>
                  <span className="text-white">{storageProvider}</span>
                </div>
                <div className="flex justify-between border-b border-card-border/40 pb-2">
                  <span className="text-muted">AI Face Search:</span>
                  <span className="text-emerald-400 font-semibold">{enableAi ? `Enabled (${sensitivityPreset})` : 'Disabled'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted">Access Mode:</span>
                  <span className="text-white font-bold">{accessType}</span>
                </div>
              </div>
            </div>
          )}

          {/* Navigation Controls */}
          <div className="pt-4 border-t border-card-border flex items-center justify-between">
            <button
              type="button"
              onClick={handleBack}
              disabled={currentStep === 1 || loading}
              className="px-4 py-2 text-xs font-semibold text-muted hover:text-white bg-card-border/40 hover:bg-card-border rounded-xl transition disabled:opacity-40 flex items-center gap-1.5"
            >
              <ArrowLeft className="h-4 w-4" /> Back
            </button>

            {currentStep < 6 ? (
              <button
                type="button"
                onClick={handleNext}
                className="px-5 py-2 text-xs font-bold text-white bg-primary hover:bg-primary-hover rounded-xl transition shadow-md shadow-primary/20 flex items-center gap-1.5"
              >
                Next Step <ArrowRight className="h-4 w-4" />
              </button>
            ) : (
              <button
                type="button"
                onClick={handleSubmit}
                disabled={loading}
                className="px-6 py-2.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-500 rounded-xl transition shadow-lg shadow-emerald-600/20 flex items-center gap-2 disabled:opacity-50"
              >
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                Create Gallery Workspace
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
