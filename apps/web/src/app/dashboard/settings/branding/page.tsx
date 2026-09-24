'use client';

import React, { useState, useEffect } from 'react';
import {
  Palette,
  Globe,
  Image as ImageIcon,
  Type,
  Shield,
  Save,
  CheckCircle2,
  AlertCircle,
  Plus,
  Trash2,
  RefreshCw,
  ExternalLink,
  Eye,
  Check,
  X,
  Lock,
  Layers,
  Sparkles,
  Loader2
} from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import type { IStudioBranding, IStudioDomain } from '@pixmatch/types';

export default function StudioBrandingSettingsPage() {
  const { token, studio } = useAuth();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Branding Form State
  const [primaryColor, setPrimaryColor] = useState('#4f46e5');
  const [secondaryColor, setSecondaryColor] = useState('#06b6d4');
  const [accentColor, setAccentColor] = useState('#f59e0b');
  const [backgroundColor, setBackgroundColor] = useState('#0f172a');
  const [textColor, setTextColor] = useState('#f8fafc');
  const [fontFamily, setFontFamily] = useState('Inter');
  const [buttonBorderRadius, setButtonBorderRadius] = useState('0.75rem');

  const [logoUrl, setLogoUrl] = useState('');
  const [faviconUrl, setFaviconUrl] = useState('');
  const [customFooterText, setCustomFooterText] = useState('');
  const [websiteUrl, setWebsiteUrl] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [showPixmatchBadge, setShowPixmatchBadge] = useState(true);

  // Domains State
  const [domains, setDomains] = useState<IStudioDomain[]>([]);
  const [newDomainInput, setNewDomainInput] = useState('');
  const [addingDomain, setAddingDomain] = useState(false);
  const [verifyingDomainId, setVerifyingDomainId] = useState<string | null>(null);

  // Active Tab: Branding vs Domains vs Preview
  const [activeTab, setActiveTab] = useState<'visual' | 'domains' | 'preview'>('visual');

  const fetchBrandingAndDomains = async () => {
    if (!token) return;
    try {
      setLoading(true);
      setError(null);

      const [brandRes, domRes] = await Promise.all([
        fetch('/api/v1/branding', {
          headers: { Authorization: `Bearer ${token}`, 'x-studio-id': studio?.id || '' }
        }),
        fetch('/api/v1/branding/domains', {
          headers: { Authorization: `Bearer ${token}`, 'x-studio-id': studio?.id || '' }
        })
      ]);

      if (brandRes.ok) {
        const data: { branding: IStudioBranding } = await brandRes.json();
        const b = data.branding;
        if (b) {
          setPrimaryColor(b.primary_color || '#4f46e5');
          setSecondaryColor(b.secondary_color || '#06b6d4');
          setAccentColor(b.accent_color || '#f59e0b');
          setBackgroundColor(b.background_color || '#0f172a');
          setTextColor(b.text_color || '#f8fafc');
          setFontFamily(b.font_family || 'Inter');
          setButtonBorderRadius(b.button_style || '0.75rem');
          setLogoUrl(b.logo_url || '');
          setFaviconUrl(b.favicon_url || '');
          setCustomFooterText(b.custom_footer_text || '');
          setWebsiteUrl(b.website_url || '');
          setContactEmail(b.contact_email || '');
          setContactPhone(b.contact_phone || '');
          setShowPixmatchBadge(b.show_pixmatch_badge !== false);
        }
      }

      if (domRes.ok) {
        const data: { domains: IStudioDomain[] } = await domRes.json();
        setDomains(data.domains || []);
      }
    } catch (err: any) {
      setError(err.message || 'Error loading studio branding settings.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBrandingAndDomains();
  }, [token, studio?.id]);

  const handleSaveBranding = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;

    try {
      setSaving(true);
      setSuccessMsg(null);
      setError(null);

      const res = await fetch('/api/v1/branding', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
          'x-studio-id': studio?.id || ''
        },
        body: JSON.stringify({
          primary_color: primaryColor,
          secondary_color: secondaryColor,
          accent_color: accentColor,
          background_color: backgroundColor,
          text_color: textColor,
          font_family: fontFamily,
          button_style: buttonBorderRadius,
          logo_url: logoUrl.trim() || undefined,
          favicon_url: faviconUrl.trim() || undefined,
          custom_footer_text: customFooterText.trim() || undefined,
          website_url: websiteUrl.trim() || undefined,
          contact_email: contactEmail.trim() || undefined,
          contact_phone: contactPhone.trim() || undefined,
          show_pixmatch_badge: showPixmatchBadge
        })
      });

      if (!res.ok) {
        const errJson = await res.json();
        throw new Error(errJson.message || `Failed to update branding (${res.status})`);
      }

      setSuccessMsg('Branding & White-label preferences saved successfully!');
      setTimeout(() => setSuccessMsg(null), 5000);
    } catch (err: any) {
      setError(err.message || 'Failed to save branding.');
    } finally {
      setSaving(false);
    }
  };

  const handleAddDomain = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !newDomainInput.trim()) return;

    try {
      setAddingDomain(true);
      setError(null);

      const res = await fetch('/api/v1/branding/domains', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
          'x-studio-id': studio?.id || ''
        },
        body: JSON.stringify({ hostname: newDomainInput.trim() })
      });

      if (!res.ok) {
        const errJson = await res.json();
        throw new Error(errJson.message || `Failed to register domain (${res.status})`);
      }

      const newDom: IStudioDomain = await res.json();
      setDomains(prev => [...prev, newDom]);
      setNewDomainInput('');
      setSuccessMsg(`Domain ${newDom.hostname} added! Please configure DNS TXT and CNAME records.`);
    } catch (err: any) {
      setError(err.message || 'Error adding custom domain.');
    } finally {
      setAddingDomain(false);
    }
  };

  const handleVerifyDomain = async (domainId: string) => {
    if (!token) return;
    try {
      setVerifyingDomainId(domainId);
      setError(null);

      const res = await fetch(`/api/v1/branding/domains/${domainId}/verify`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'x-studio-id': studio?.id || ''
        }
      });

      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.message || `DNS verification failed (${res.status})`);
      }

      setDomains(prev => prev.map(d => (d.id === domainId ? json.domain : d)));
      if (json.domain.status === 'ACTIVE' || json.domain.status === 'VERIFIED') {
        setSuccessMsg(`Domain ${json.domain.hostname} verified and active!`);
      } else {
        setError(json.message || 'DNS record not found yet. It may take up to 24-48 hours to propagate.');
      }
    } catch (err: any) {
      setError(err.message || 'DNS verification error.');
    } finally {
      setVerifyingDomainId(null);
    }
  };

  const handleDeleteDomain = async (domainId: string) => {
    if (!token || !confirm('Are you sure you want to remove this domain?')) return;
    try {
      const res = await fetch(`/api/v1/branding/domains/${domainId}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
          'x-studio-id': studio?.id || ''
        }
      });

      if (!res.ok) {
        const errJson = await res.json();
        throw new Error(errJson.message || `Failed to remove domain (${res.status})`);
      }

      setDomains(prev => prev.filter(d => d.id !== domainId));
      setSuccessMsg('Domain removed.');
    } catch (err: any) {
      setError(err.message || 'Error removing domain.');
    }
  };

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-16">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2.5">
            <Palette className="w-7 h-7 text-indigo-500" />
            Studio Branding &amp; White-Label
          </h1>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
            Customize your client portal colors, typography, logos, and custom domains.
          </p>
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center gap-1.5 p-1 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 self-start sm:self-auto">
          <button
            onClick={() => setActiveTab('visual')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition ${
              activeTab === 'visual'
                ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Palette className="w-3.5 h-3.5" />
            Theme &amp; Logo
          </button>
          <button
            onClick={() => setActiveTab('domains')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition ${
              activeTab === 'domains'
                ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Globe className="w-3.5 h-3.5" />
            Custom Domains ({domains.length})
          </button>
          <button
            onClick={() => setActiveTab('preview')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition ${
              activeTab === 'preview'
                ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Eye className="w-3.5 h-3.5" />
            Live Preview
          </button>
        </div>
      </div>

      {/* Alerts */}
      {successMsg && (
        <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 flex items-center gap-3 animate-fade-in">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
          <p className="text-sm font-medium text-emerald-900 dark:text-emerald-200">{successMsg}</p>
        </div>
      )}

      {error && (
        <div className="p-4 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 flex items-center gap-3 animate-fade-in">
          <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 shrink-0" />
          <p className="text-sm font-medium text-red-900 dark:text-red-200">{error}</p>
        </div>
      )}

      {loading ? (
        <div className="py-24 flex flex-col items-center justify-center gap-3">
          <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
          <p className="text-sm text-slate-500">Loading branding configuration...</p>
        </div>
      ) : activeTab === 'visual' ? (
        /* Visual Theme & Logo Settings Form */
        <form onSubmit={handleSaveBranding} className="space-y-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Color Palette */}
            <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-6">
              <div>
                <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Palette className="w-4 h-4 text-indigo-500" />
                  Color Palette
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Applied to client portal navigation, buttons, accents, and surfaces.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                    Primary Brand Color
                  </label>
                  <div className="flex items-center gap-2.5">
                    <input
                      type="color"
                      value={primaryColor}
                      onChange={(e) => setPrimaryColor(e.target.value)}
                      className="w-10 h-10 rounded-xl cursor-pointer border-0 bg-transparent p-0"
                    />
                    <input
                      type="text"
                      value={primaryColor}
                      onChange={(e) => setPrimaryColor(e.target.value)}
                      className="flex-1 font-mono text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 p-2 text-slate-900 dark:text-white"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                    Secondary Color
                  </label>
                  <div className="flex items-center gap-2.5">
                    <input
                      type="color"
                      value={secondaryColor}
                      onChange={(e) => setSecondaryColor(e.target.value)}
                      className="w-10 h-10 rounded-xl cursor-pointer border-0 bg-transparent p-0"
                    />
                    <input
                      type="text"
                      value={secondaryColor}
                      onChange={(e) => setSecondaryColor(e.target.value)}
                      className="flex-1 font-mono text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 p-2 text-slate-900 dark:text-white"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                    Accent Color
                  </label>
                  <div className="flex items-center gap-2.5">
                    <input
                      type="color"
                      value={accentColor}
                      onChange={(e) => setAccentColor(e.target.value)}
                      className="w-10 h-10 rounded-xl cursor-pointer border-0 bg-transparent p-0"
                    />
                    <input
                      type="text"
                      value={accentColor}
                      onChange={(e) => setAccentColor(e.target.value)}
                      className="flex-1 font-mono text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 p-2 text-slate-900 dark:text-white"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                    Dark Background Color
                  </label>
                  <div className="flex items-center gap-2.5">
                    <input
                      type="color"
                      value={backgroundColor}
                      onChange={(e) => setBackgroundColor(e.target.value)}
                      className="w-10 h-10 rounded-xl cursor-pointer border-0 bg-transparent p-0"
                    />
                    <input
                      type="text"
                      value={backgroundColor}
                      onChange={(e) => setBackgroundColor(e.target.value)}
                      className="flex-1 font-mono text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 p-2 text-slate-900 dark:text-white"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Typography & Button Style */}
            <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-6">
              <div>
                <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Type className="w-4 h-4 text-indigo-500" />
                  Typography &amp; UI Shape
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Select fonts and button corner styles for your client portal.
                </p>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                    Font Family
                  </label>
                  <select
                    value={fontFamily}
                    onChange={(e) => setFontFamily(e.target.value)}
                    className="w-full text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 p-2.5 text-slate-900 dark:text-white"
                  >
                    <option value="Inter">Inter (Clean Modern Sans)</option>
                    <option value="Playfair Display">Playfair Display (Editorial Serif)</option>
                    <option value="Montserrat">Montserrat (Geometric Sans)</option>
                    <option value="Lora">Lora (Classic Literary Serif)</option>
                    <option value="Cinzel">Cinzel (Luxury Classical Serif)</option>
                    <option value="Outfit">Outfit (Contemporary Display)</option>
                    <option value="Plus Jakarta Sans">Plus Jakarta Sans (Ultra-Crisp)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                    Button &amp; Card Corners
                  </label>
                  <div className="grid grid-cols-4 gap-2">
                    {[
                      { label: 'Sharp', val: '0.25rem' },
                      { label: 'Rounded', val: '0.75rem' },
                      { label: 'Smooth', val: '1rem' },
                      { label: 'Pill', val: '9999px' }
                    ].map((b) => (
                      <button
                        key={b.val}
                        type="button"
                        onClick={() => setButtonBorderRadius(b.val)}
                        style={{ borderRadius: b.val }}
                        className={`p-2.5 text-xs font-semibold border text-center transition ${
                          buttonBorderRadius === b.val
                            ? 'bg-indigo-500 text-white border-indigo-500 shadow-sm'
                            : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300'
                        }`}
                      >
                        {b.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Studio Logos */}
            <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-6">
              <div>
                <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <ImageIcon className="w-4 h-4 text-indigo-500" />
                  Logos &amp; Icons
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Host URLs for your studio logo and browser favicon.
                </p>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Light Mode Logo URL
                  </label>
                  <input
                    type="url"
                    value={logoUrl}
                    onChange={(e) => setLogoUrl(e.target.value)}
                    placeholder="https://yourstudio.com/logo-light.png"
                    className="w-full text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 p-2.5 text-slate-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Favicon URL
                  </label>
                  <input
                    type="url"
                    value={faviconUrl}
                    onChange={(e) => setFaviconUrl(e.target.value)}
                    placeholder="https://yourstudio.com/favicon.ico"
                    className="w-full text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 p-2.5 text-slate-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Website URL
                  </label>
                  <input
                    type="url"
                    value={websiteUrl}
                    onChange={(e) => setWebsiteUrl(e.target.value)}
                    placeholder="https://yourstudio.com"
                    className="w-full text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 p-2.5 text-slate-900 dark:text-white"
                  />
                </div>
              </div>
            </div>

            {/* White-Label & Footer Links */}
            <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-6">
              <div>
                <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Shield className="w-4 h-4 text-indigo-500" />
                  White-Label &amp; Contact Information
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Configure custom footer copyright, support email, phone, and badge visibility.
                </p>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Custom Footer Copyright Text
                  </label>
                  <input
                    type="text"
                    value={customFooterText}
                    onChange={(e) => setCustomFooterText(e.target.value)}
                    placeholder="© 2026 Luxe Photography Studio. All Rights Reserved."
                    className="w-full text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 p-2.5 text-slate-900 dark:text-white"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Support Email
                    </label>
                    <input
                      type="email"
                      value={contactEmail}
                      onChange={(e) => setContactEmail(e.target.value)}
                      placeholder="hello@yourstudio.com"
                      className="w-full text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 p-2.5 text-slate-900 dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Contact Phone
                    </label>
                    <input
                      type="tel"
                      value={contactPhone}
                      onChange={(e) => setContactPhone(e.target.value)}
                      placeholder="+1 (555) 123-4567"
                      className="w-full text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 p-2.5 text-slate-900 dark:text-white"
                    />
                  </div>
                </div>

                {/* Show Badge Toggle */}
                <div className="pt-2">
                  <label className="flex items-start gap-3 p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/40 cursor-pointer transition">
                    <input
                      type="checkbox"
                      checked={showPixmatchBadge}
                      onChange={(e) => setShowPixmatchBadge(e.target.checked)}
                      className="mt-1 h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                    />
                    <div>
                      <span className="text-xs sm:text-sm font-semibold text-slate-900 dark:text-white block">
                        Display &quot;Powered by PixMatch AI&quot; Badge
                      </span>
                      <span className="text-xs text-slate-500 dark:text-slate-400">
                        Unchecking this removes PixMatch AI branding completely (requires Studio / Agency plan entitlement).
                      </span>
                    </div>
                  </label>
                </div>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-4">
            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-500 shadow-md transition disabled:opacity-50"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              Save All Branding Changes
            </button>
          </div>
        </form>
      ) : activeTab === 'domains' ? (
        /* Custom Domains Tab */
        <div className="space-y-8">
          {/* Add Domain Card */}
          <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-4">
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Globe className="w-4 h-4 text-indigo-500" />
                Connect a Custom Domain or Subdomain
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Serve client portals and proofing directly from your own domain (e.g.{' '}
                <span className="font-mono text-indigo-500">clients.yourstudio.com</span>).
              </p>
            </div>

            <form onSubmit={handleAddDomain} className="flex flex-col sm:flex-row gap-3">
              <input
                type="text"
                value={newDomainInput}
                onChange={(e) => setNewDomainInput(e.target.value)}
                placeholder="clients.yourstudio.com"
                className="flex-1 text-xs sm:text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 p-2.5 text-slate-900 dark:text-white"
              />
              <button
                type="submit"
                disabled={addingDomain || !newDomainInput.trim()}
                className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-xs sm:text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-500 shadow-sm transition disabled:opacity-50"
              >
                {addingDomain ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                Add Domain
              </button>
            </form>
          </div>

          {/* Domains List */}
          <div className="space-y-4">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">Registered Custom Domains</h3>

            {domains.length === 0 ? (
              <div className="py-12 text-center border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-2xl p-6">
                <Globe className="w-10 h-10 text-slate-300 dark:text-slate-700 mx-auto mb-2" />
                <p className="text-xs sm:text-sm font-semibold text-slate-900 dark:text-white">
                  No custom domains connected
                </p>
                <p className="text-xs text-slate-500 mt-0.5">
                  Your clients currently access their portals via your standard studio slug or link.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {domains.map((dom) => (
                  <div
                    key={dom.id}
                    className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-4"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div>
                        <div className="flex items-center gap-2.5">
                          <Globe className="w-4 h-4 text-indigo-500" />
                          <span className="font-bold text-sm sm:text-base text-slate-900 dark:text-white">
                            {dom.hostname}
                          </span>
                          {dom.is_primary && (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-100 text-indigo-800 dark:bg-indigo-950/60 dark:text-indigo-300">
                              Primary
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-slate-500 mt-1">
                          Added on {new Date(dom.created_at).toLocaleDateString()}
                        </p>
                      </div>

                      <div className="flex items-center gap-2">
                        <span
                          className={`px-3 py-1 rounded-full text-xs font-semibold ${
                            dom.status === 'ACTIVE' || dom.status === 'VERIFIED'
                              ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                              : 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300'
                          }`}
                        >
                          {dom.status}
                        </span>

                        <button
                          onClick={() => handleVerifyDomain(dom.id)}
                          disabled={verifyingDomainId === dom.id}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition"
                        >
                          {verifyingDomainId === dom.id ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <RefreshCw className="w-3.5 h-3.5" />
                          )}
                          Verify DNS
                        </button>

                        <button
                          onClick={() => handleDeleteDomain(dom.id)}
                          className="p-1.5 rounded-lg border border-red-200 dark:border-red-900/60 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 transition"
                          title="Remove domain"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    {/* DNS Instructions if Pending */}
                    {dom.status !== 'ACTIVE' && (
                      <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700/60 space-y-3">
                        <p className="text-xs font-semibold text-slate-900 dark:text-white">
                          Required DNS Records to configure in your domain registrar:
                        </p>
                        <div className="space-y-2 text-xs font-mono">
                          <div className="p-2.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-center justify-between">
                            <span>
                              <strong className="text-indigo-500">CNAME:</strong> {dom.hostname} &rarr; custom.pixmatch.app
                            </span>
                          </div>
                          <div className="p-2.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-center justify-between">
                            <span>
                              <strong className="text-indigo-500">TXT:</strong> _pixmatch-challenge.{dom.hostname} &rarr;{' '}
                              {dom.verification_token}
                            </span>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      ) : (
        /* Live Preview Tab */
        <div className="space-y-4">
          <div className="p-4 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800 flex items-center gap-3">
            <Sparkles className="w-5 h-5 text-indigo-600 dark:text-indigo-400 shrink-0" />
            <p className="text-xs sm:text-sm text-indigo-900 dark:text-indigo-200">
              This live preview shows exactly how your client portal appears with your selected primary (
              <span className="font-mono">{primaryColor}</span>), font ({fontFamily}), and white-label settings.
            </p>
          </div>

          <div
            className="p-8 rounded-2xl border shadow-xl transition-all"
            style={{
              backgroundColor: backgroundColor,
              color: textColor,
              fontFamily: fontFamily
            }}
          >
            {/* Mock Portal Header */}
            <div
              className="flex items-center justify-between pb-6 border-b"
              style={{ borderColor: 'rgba(255,255,255,0.1)' }}
            >
              <div className="flex items-center gap-3">
                {logoUrl ? (
                  <img src={logoUrl} alt="Studio Logo" className="h-8 object-contain" />
                ) : (
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center font-bold text-white shadow-sm"
                    style={{ backgroundColor: primaryColor, borderRadius: buttonBorderRadius }}
                  >
                    {studio?.name ? studio.name.charAt(0).toUpperCase() : 'S'}
                  </div>
                )}
                <div>
                  <h3 className="font-bold text-base leading-tight">{studio?.name || 'Your Photography Studio'}</h3>
                  <span className="text-[11px] opacity-70">Client Experience Portal</span>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <button
                  style={{
                    backgroundColor: primaryColor,
                    borderRadius: buttonBorderRadius,
                    color: '#ffffff'
                  }}
                  className="px-4 py-2 text-xs font-semibold shadow-sm"
                >
                  View My Photos
                </button>
              </div>
            </div>

            {/* Mock Body Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 py-8">
              <div
                className="p-6 rounded-2xl border"
                style={{
                  backgroundColor: 'rgba(255,255,255,0.05)',
                  borderColor: 'rgba(255,255,255,0.08)',
                  borderRadius: buttonBorderRadius
                }}
              >
                <span className="text-xs opacity-70">Active Project</span>
                <h4 className="text-base font-bold mt-1">Wedding of Sarah &amp; David</h4>
                <p className="text-xs opacity-80 mt-2">1,240 photos uploaded &bull; 40 selected</p>
                <div className="mt-4">
                  <span
                    style={{ backgroundColor: accentColor, color: '#000000' }}
                    className="px-2.5 py-1 text-[10px] font-bold rounded-full"
                  >
                    Proofing in Progress
                  </span>
                </div>
              </div>

              <div
                className="p-6 rounded-2xl border"
                style={{
                  backgroundColor: 'rgba(255,255,255,0.05)',
                  borderColor: 'rgba(255,255,255,0.08)',
                  borderRadius: buttonBorderRadius
                }}
              >
                <span className="text-xs opacity-70">Physical Prints</span>
                <h4 className="text-base font-bold mt-1">Order #ORD-8920</h4>
                <p className="text-xs opacity-80 mt-2">Lab fulfillment &bull; In Transit</p>
                <div className="mt-4">
                  <span
                    style={{ backgroundColor: secondaryColor, color: '#ffffff' }}
                    className="px-2.5 py-1 text-[10px] font-bold rounded-full"
                  >
                    FedEx Tracking #9400...
                  </span>
                </div>
              </div>

              <div
                className="p-6 rounded-2xl border"
                style={{
                  backgroundColor: 'rgba(255,255,255,0.05)',
                  borderColor: 'rgba(255,255,255,0.08)',
                  borderRadius: buttonBorderRadius
                }}
              >
                <span className="text-xs opacity-70">Digital Delivery</span>
                <h4 className="text-base font-bold mt-1">Full Resolution Archive</h4>
                <p className="text-xs opacity-80 mt-2">ZIP package &bull; 4.8 GB</p>
                <div className="mt-4">
                  <button
                    style={{
                      backgroundColor: primaryColor,
                      borderRadius: buttonBorderRadius,
                      color: '#ffffff'
                    }}
                    className="px-3 py-1.5 text-xs font-semibold"
                  >
                    Download ZIP
                  </button>
                </div>
              </div>
            </div>

            {/* Mock Footer */}
            <div
              className="pt-6 border-t flex flex-col sm:flex-row items-center justify-between gap-4 text-xs opacity-70"
              style={{ borderColor: 'rgba(255,255,255,0.1)' }}
            >
              <p>{customFooterText || `© ${new Date().getFullYear()} ${studio?.name || 'Photography Studio'}. All rights reserved.`}</p>

              {showPixmatchBadge && (
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-black/20 text-[11px] font-medium border border-white/10">
                  <Sparkles className="w-3 h-3 text-indigo-400" />
                  <span>Powered by PixMatch AI</span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
