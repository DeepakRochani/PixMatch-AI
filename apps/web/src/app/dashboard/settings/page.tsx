'use client';

import React, { useState } from 'react';
import { DashboardHeader } from '@/components/layout/DashboardHeader';
import { useAuth } from '@/lib/auth-context';
import { fetchApi } from '@/lib/api-client';
import { Building, Globe, Camera, Check, Shield } from 'lucide-react';

export default function SettingsPage() {
  const { studio, user } = useAuth();
  const [studioName, setStudioName] = useState(studio?.name || 'Lumière Studios');
  const [website, setWebsite] = useState(studio?.website || 'https://lumiere.example.com');
  const [saved, setSaved] = useState(false);

  const handleSave = async () => {
    await fetchApi('/studios/current', {
      method: 'PATCH',
      body: JSON.stringify({ name: studioName, website }),
    });
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  return (
    <div className="flex-1 flex flex-col min-h-screen">
      <DashboardHeader
        title="Studio Settings"
        subtitle="Configure your studio profile, client branding, and tenant details"
      />

      <main className="flex-1 p-6 sm:p-8 space-y-8 max-w-4xl">
        <div className="p-8 rounded-2xl bg-card border border-card-border space-y-6">
          <div className="border-b border-card-border pb-4">
            <h3 className="text-base font-bold text-white">Branding & Identity</h3>
            <p className="text-xs text-muted">This information is shown to clients viewing your public delivery galleries</p>
          </div>

          <div className="space-y-4">
            <div>
              <label className="text-xs font-semibold text-muted">Studio Name</label>
              <div className="relative mt-1.5">
                <Building className="absolute left-3.5 top-2.5 h-4 w-4 text-muted" />
                <input
                  type="text"
                  value={studioName}
                  onChange={(e) => setStudioName(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-background border border-card-border text-sm text-white focus:outline-none focus:border-primary"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-muted">Studio Slug (Permanent Identifier)</label>
              <input
                type="text"
                disabled
                value={studio?.slug || 'lumiere-studios'}
                className="w-full mt-1.5 px-4 py-2.5 rounded-xl bg-background/50 border border-card-border text-sm text-muted cursor-not-allowed"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-muted">Website URL</label>
              <div className="relative mt-1.5">
                <Globe className="absolute left-3.5 top-2.5 h-4 w-4 text-muted" />
                <input
                  type="url"
                  value={website}
                  onChange={(e) => setWebsite(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-background border border-card-border text-sm text-white focus:outline-none focus:border-primary"
                />
              </div>
            </div>

            <div className="pt-2">
              <button
                type="button"
                onClick={handleSave}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary hover:bg-primary-hover text-white text-xs font-semibold transition shadow-md shadow-primary/20"
              >
                {saved ? <Check className="h-4 w-4" /> : null}
                {saved ? 'Saved Successfully' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>

        {/* Tenant Information */}
        <div className="p-6 rounded-2xl bg-card border border-card-border space-y-3">
          <div className="flex items-center gap-2 text-white">
            <Shield className="h-4 w-4 text-primary" />
            <h4 className="text-sm font-bold">Tenant Security & Cryptographic Scoping</h4>
          </div>
          <p className="text-xs text-muted leading-relaxed">
            Tenant ID: <span className="font-mono text-white">{studio?.id || 'studio-demo-1'}</span>. All galleries, photos, EXIF metadata, and client records are isolated by tenant boundaries.
          </p>
        </div>
      </main>
    </div>
  );
}
