'use client';

import React, { useEffect, useState } from 'react';
import {
  Settings,
  Shield,
  RefreshCw,
  Save,
  AlertTriangle,
  Lock,
  Eye,
  EyeOff,
  Server,
  Zap,
  Mail,
  HardDrive,
  Cpu,
} from 'lucide-react';
import { fetchApi } from '@/lib/api-client';
import { PlatformAdminSettingDTO, PlatformSettingCategory } from '@pixmatch/types';

export default function AdminSettingsPage() {
  const [settings, setSettings] = useState<PlatformAdminSettingDTO[]>([]);
  const [maintenance, setMaintenance] = useState<{ isEnabled: boolean; message?: string }>({ isEnabled: false });
  const [isLoading, setIsLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState<string>('ALL');
  const [editedValues, setEditedValues] = useState<Record<string, string>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const loadSettings = async () => {
    setIsLoading(true);
    try {
      const [settingsRes, maintenanceRes] = await Promise.all([
        fetchApi<PlatformAdminSettingDTO[]>('/admin/settings'),
        fetchApi<{ isEnabled: boolean; message?: string }>('/admin/settings/maintenance'),
      ]);
      if (settingsRes.success && settingsRes.data) {
        setSettings(settingsRes.data);
      }
      if (maintenanceRes.success && maintenanceRes.data) {
        setMaintenance(maintenanceRes.data);
      }
    } catch (err) {
      console.error('Failed to load settings', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadSettings();
  }, []);

  const handleMaintenanceToggle = async () => {
    try {
      const nextState = !maintenance.isEnabled;
      await fetchApi('/admin/settings/maintenance', {
        method: 'POST',
        body: JSON.stringify({
          isEnabled: nextState,
          message: nextState ? 'System undergoing scheduled platform maintenance. Services will resume shortly.' : undefined,
        }),
      });
      setMaintenance({ isEnabled: nextState, message: nextState ? 'Under Maintenance' : undefined });
    } catch (err) {
      console.error('Failed to toggle maintenance mode', err);
    }
  };

  const handleSaveSetting = async (key: string, category: PlatformSettingCategory) => {
    setIsSaving(true);
    try {
      const val = editedValues[key];
      await fetchApi(`/admin/settings/${key}`, {
        method: 'PUT',
        body: JSON.stringify({
          value: val,
          category,
        }),
      });
      setSuccessMsg(`Setting ${key} updated successfully.`);
      setTimeout(() => setSuccessMsg(null), 3000);
      loadSettings();
    } catch (err) {
      console.error('Failed to save setting', err);
    } finally {
      setIsSaving(false);
    }
  };

  const categories = ['ALL', ...Object.values(PlatformSettingCategory)];

  const filteredSettings = settings.filter((s) =>
    activeCategory === 'ALL' ? true : s.category === activeCategory
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2.5">
            <Settings className="h-6 w-6 text-amber-400" /> Platform Configuration & Governance
          </h1>
          <p className="text-xs text-muted mt-1">
            Global system parameters, AI execution throttles, storage limits, and emergency kill switches.
          </p>
        </div>
        <button
          onClick={() => loadSettings()}
          className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-card-border/40 hover:bg-card-border/70 text-xs font-semibold text-white transition self-start"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? 'animate-spin' : ''}`} /> Refresh
        </button>
      </div>

      {/* Emergency Maintenance Mode Banner */}
      <div className={`p-6 rounded-2xl border transition-all ${
        maintenance.isEnabled
          ? 'bg-red-500/10 border-red-500/40 text-red-300'
          : 'bg-[#0E1422] border-card-border text-white'
      }`}>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className={`h-12 w-12 rounded-xl flex items-center justify-center ${
              maintenance.isEnabled ? 'bg-red-500/20 text-red-400' : 'bg-amber-500/10 text-amber-400'
            }`}>
              <AlertTriangle className="h-6 w-6" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Platform Maintenance Mode</h3>
              <p className="text-xs text-muted mt-0.5">
                {maintenance.isEnabled
                  ? 'Maintenance mode is ACTIVE. Studio and client write operations are temporarily suspended.'
                  : 'Platform is fully operational. All tenant APIs and background job queues are active.'}
              </p>
            </div>
          </div>
          <button
            onClick={handleMaintenanceToggle}
            className={`px-5 py-2.5 rounded-xl text-xs font-bold transition shadow-lg ${
              maintenance.isEnabled
                ? 'bg-emerald-500 hover:bg-emerald-400 text-black shadow-emerald-500/20'
                : 'bg-red-600 hover:bg-red-500 text-white shadow-red-600/20'
            }`}
          >
            {maintenance.isEnabled ? 'Disable Maintenance Mode' : 'Enable Maintenance Mode'}
          </button>
        </div>
      </div>

      {successMsg && (
        <div className="p-4 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs font-semibold">
          {successMsg}
        </div>
      )}

      {/* Category Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        {categories.map((cat) => (
          <button
            key={cat}
            onClick={() => setActiveCategory(cat)}
            className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition ${
              activeCategory === cat
                ? 'bg-amber-500 text-black shadow-lg shadow-amber-500/20'
                : 'bg-[#0E1422] text-muted hover:text-white border border-card-border'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Settings Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filteredSettings.map((setting) => (
          <div
            key={setting.id}
            className="p-5 rounded-2xl bg-[#0E1422] border border-card-border flex flex-col justify-between space-y-4"
          >
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="font-mono text-xs font-bold text-amber-400 px-2 py-0.5 rounded bg-amber-500/10 border border-amber-500/20">
                  {setting.key}
                </span>
                <span className="text-[10px] uppercase font-bold text-muted px-2 py-0.5 rounded bg-card-border/40">
                  {setting.category}
                </span>
              </div>
              <p className="text-xs text-muted">{setting.description || 'Config parameter'}</p>
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <input
                  type={setting.is_encrypted ? 'password' : 'text'}
                  defaultValue={setting.value}
                  onChange={(e) => setEditedValues({ ...editedValues, [setting.key]: e.target.value })}
                  placeholder={setting.is_encrypted ? '•••••••• [REDACTED]' : 'Enter value'}
                  className="flex-1 px-3 py-2 rounded-xl bg-[#070A0F] border border-card-border text-white text-xs font-mono focus:border-amber-500 outline-none"
                />
                <button
                  onClick={() => handleSaveSetting(setting.key, setting.category)}
                  disabled={isSaving}
                  className="px-3.5 py-2 rounded-xl bg-card-border/60 hover:bg-card-border text-xs font-bold text-white transition flex items-center gap-1.5"
                >
                  <Save className="h-3.5 w-3.5" /> Save
                </button>
              </div>
              {setting.is_encrypted && (
                <p className="text-[10px] text-amber-400/80 flex items-center gap-1">
                  <Lock className="h-3 w-3" /> Secret value encrypted in platform vault.
                </p>
              )}
            </div>
          </div>
        ))}

        {filteredSettings.length === 0 && !isLoading && (
          <div className="md:col-span-2 p-12 text-center rounded-2xl bg-[#0E1422] border border-card-border space-y-2">
            <Settings className="h-8 w-8 text-muted mx-auto" />
            <p className="text-xs text-muted">No configuration parameters found in this category.</p>
          </div>
        )}
      </div>
    </div>
  );
}
