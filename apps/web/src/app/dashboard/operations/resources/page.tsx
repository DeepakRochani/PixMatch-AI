'use client';

import React, { useState, useEffect } from 'react';
import {
  Users,
  Camera,
  Layers,
  Plus,
  AlertCircle,
  CheckCircle2,
  Phone,
  Mail,
  Activity,
  Power,
} from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import { OperationsNavTabs } from '@/components/dashboard/OperationsNavTabs';
import { ResourceStatus, ResourceType, StudioResourceDTO } from '@pixmatch/types';

export default function ResourcesPage() {
  const { token, studio } = useAuth();
  const [loading, setLoading] = useState(true);
  const [resources, setResources] = useState<StudioResourceDTO[]>([]);
  const [filterType, setFilterType] = useState<string>('ALL');
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    resource_type: ResourceType.PHOTOGRAPHER,
    email: '',
    phone: '',
  });

  const fetchResources = async () => {
    try {
      setLoading(true);
      setError(null);
      let url = '/api/v1/calendar/resources';
      if (filterType !== 'ALL') {
        url += `?resource_type=${filterType}`;
      }
      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${token}`, 'x-studio-id': studio?.id || '' },
      });
      if (!res.ok) throw new Error('Failed to load resources');
      const json = await res.json();
      setResources(json.data || []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token) {
      fetchResources();
    }
  }, [token, studio?.id, filterType]);

  const handleCreateResource = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/v1/calendar/resources', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
          'x-studio-id': studio?.id || '',
        },
        body: JSON.stringify(formData),
      });

      if (!res.ok) {
        const errJson = await res.json();
        throw new Error(errJson.error || 'Failed to create resource');
      }

      setShowModal(false);
      setFormData({ name: '', description: '', resource_type: ResourceType.PHOTOGRAPHER, email: '', phone: '' });
      setSuccessMsg('Resource added successfully.');
      fetchResources();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleToggleStatus = async (resource: StudioResourceDTO) => {
    try {
      const endpoint = resource.status === 'ACTIVE' ? 'deactivate' : 'reactivate';
      const res = await fetch(`/api/v1/calendar/resources/${resource.id}/${endpoint}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'x-studio-id': studio?.id || '' },
      });
      if (!res.ok) throw new Error('Failed to update resource status');
      setSuccessMsg(`Resource marked as ${resource.status === 'ACTIVE' ? 'inactive' : 'active'}.`);
      fetchResources();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const getIcon = (type: ResourceType) => {
    switch (type) {
      case ResourceType.PHOTOGRAPHER:
      case ResourceType.STAFF:
        return Users;
      case ResourceType.EQUIPMENT:
        return Camera;
      default:
        return Layers;
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      <OperationsNavTabs />

      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Studio Resource Management</h1>
          <p className="text-sm text-muted">Manage staff, gear kits, cameras, lighting suites, and studio rooms.</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-primary hover:bg-primary/90 text-white rounded-lg text-sm font-semibold shadow-sm transition-all"
        >
          <Plus className="h-4 w-4" /> Add Resource
        </button>
      </div>

      {error && (
        <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm flex items-center gap-2">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {error}
        </div>
      )}

      {successMsg && (
        <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-emerald-400 text-sm flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          {successMsg}
        </div>
      )}

      {/* Filter Tabs */}
      <div className="flex gap-2 border-b border-card-border pb-3">
        {['ALL', 'PHOTOGRAPHER', 'STAFF', 'EQUIPMENT', 'ROOM', 'LOCATION'].map((t) => (
          <button
            key={t}
            onClick={() => setFilterType(t)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              filterType === t
                ? 'bg-card-border text-white border border-card-border/80'
                : 'text-muted hover:text-white hover:bg-card-border/30'
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {/* Resource Cards */}
      {resources.length === 0 ? (
        <div className="bg-card border border-card-border rounded-xl p-12 text-center text-sm text-muted">
          No resources found for this filter. Click &quot;Add Resource&quot; to register photographers or gear.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {resources.map((r) => {
            const Icon = getIcon(r.resource_type);
            const isActive = r.status === 'ACTIVE';

            return (
              <div
                key={r.id}
                className={`p-5 rounded-xl border transition-all ${
                  isActive ? 'bg-card border-card-border' : 'bg-card/40 border-card-border/40 opacity-75'
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 rounded-lg bg-primary/10 text-primary border border-primary/20">
                      <Icon className="h-5 w-5" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-white text-base">{r.name}</h3>
                      <span className="text-[11px] uppercase tracking-wider font-semibold text-muted">
                        {r.resource_type}
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={() => handleToggleStatus(r)}
                    title={isActive ? 'Deactivate' : 'Reactivate'}
                    className={`p-1.5 rounded-lg text-xs border transition-colors ${
                      isActive
                        ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20 hover:bg-red-500/10 hover:text-red-400'
                        : 'text-muted bg-muted/10 border-muted/20 hover:text-emerald-400'
                    }`}
                  >
                    <Power className="h-4 w-4" />
                  </button>
                </div>

                {r.description && <p className="text-xs text-muted mt-3 line-clamp-2">{r.description}</p>}

                <div className="mt-4 pt-3 border-t border-card-border/40 space-y-1.5 text-xs text-muted">
                  {r.email && (
                    <div className="flex items-center gap-2">
                      <Mail className="h-3.5 w-3.5" />
                      <span className="truncate">{r.email}</span>
                    </div>
                  )}
                  {r.phone && (
                    <div className="flex items-center gap-2">
                      <Phone className="h-3.5 w-3.5" />
                      <span>{r.phone}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-2 text-primary font-medium">
                    <Activity className="h-3.5 w-3.5" />
                    <span>{r.upcoming_assignments_count || 0} upcoming sessions</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="bg-card border border-card-border rounded-xl p-6 max-w-md w-full space-y-4">
            <h3 className="text-lg font-bold text-white">Add Studio Resource</h3>
            <form onSubmit={handleCreateResource} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-muted mb-1">Resource Name</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g. Lead Photographer - Alex, Sony FX3 Kit, Suite A"
                  className="w-full px-3 py-2 bg-background border border-card-border rounded-lg text-sm text-white focus:outline-none focus:border-primary"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-muted mb-1">Resource Type</label>
                <select
                  value={formData.resource_type}
                  onChange={(e) => setFormData({ ...formData, resource_type: e.target.value as ResourceType })}
                  className="w-full px-3 py-2 bg-background border border-card-border rounded-lg text-sm text-white focus:outline-none focus:border-primary"
                >
                  <option value={ResourceType.PHOTOGRAPHER}>Photographer</option>
                  <option value={ResourceType.STAFF}>Assistant / Staff</option>
                  <option value={ResourceType.EQUIPMENT}>Equipment / Camera Kit</option>
                  <option value={ResourceType.ROOM}>Studio Room / Suite</option>
                  <option value={ResourceType.LOCATION}>Location / Venue</option>
                  <option value={ResourceType.VEHICLE}>Vehicle</option>
                  <option value={ResourceType.OTHER}>Other</option>
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-muted mb-1">Email (Optional)</label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full px-3 py-2 bg-background border border-card-border rounded-lg text-sm text-white focus:outline-none focus:border-primary"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-muted mb-1">Phone (Optional)</label>
                  <input
                    type="text"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full px-3 py-2 bg-background border border-card-border rounded-lg text-sm text-white focus:outline-none focus:border-primary"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-muted mb-1">Description (Optional)</label>
                <input
                  type="text"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="e.g. Primary wedding shooter / 4K 120fps rig"
                  className="w-full px-3 py-2 bg-background border border-card-border rounded-lg text-sm text-white focus:outline-none focus:border-primary"
                />
              </div>
              <div className="flex justify-end gap-2 pt-3 border-t border-card-border">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-muted hover:text-white rounded-lg border border-card-border"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-semibold bg-primary hover:bg-primary/90 text-white rounded-lg"
                >
                  Add Resource
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
