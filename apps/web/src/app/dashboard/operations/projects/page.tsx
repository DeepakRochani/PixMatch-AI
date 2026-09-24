'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Briefcase,
  PlusCircle,
  Search,
  Filter,
  Calendar,
  MapPin,
  Clock,
  CheckCircle2,
  DollarSign,
  Images,
  ArrowRight,
  AlertCircle,
  RefreshCw,
  MoreVertical,
  Trash2,
  Edit2,
  User,
  ChevronRight,
} from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import { OperationsNavTabs } from '@/components/dashboard/OperationsNavTabs';
import {
  StudioProjectDTO,
  StudioProjectStatus,
  StudioProjectType,
  CreateStudioProjectDTO,
} from '@pixmatch/types';

export default function ProjectsListPage() {
  const { token, studio } = useAuth();
  const [projects, setProjects] = useState<StudioProjectDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [typeFilter, setTypeFilter] = useState<string>('ALL');

  // Modal
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [clients, setClients] = useState<Array<{ id: string; name: string; email: string }>>([]);

  const [newProject, setNewProject] = useState<CreateStudioProjectDTO>({
    title: '',
    project_type: StudioProjectType.WEDDING,
    status: StudioProjectStatus.BOOKED,
    client_id: '',
    shoot_date: '',
    shoot_location: '',
    shoot_duration_hours: 4,
    estimated_delivery_date: '',
    total_amount: 0,
    paid_amount: 0,
    equipment_notes: '',
  });

  const fetchProjects = async () => {
    try {
      setLoading(true);
      setError(null);
      let url = '/api/v1/operations/projects?limit=100';
      if (statusFilter !== 'ALL') url += `&status=${statusFilter}`;
      if (typeFilter !== 'ALL') url += `&project_type=${typeFilter}`;
      if (searchTerm) url += `&search=${encodeURIComponent(searchTerm)}`;

      const res = await fetch(url, {
        headers: {
          Authorization: `Bearer ${token}`,
          'x-studio-id': studio?.id || '',
        },
      });

      if (!res.ok) throw new Error('Failed to fetch projects');
      const json = await res.json();
      setProjects(json.data?.projects || json.data || []);
    } catch (err: any) {
      setError(err.message || 'Error fetching projects');
    } finally {
      setLoading(false);
    }
  };

  const fetchClients = async () => {
    try {
      const res = await fetch('/api/v1/clients', {
        headers: {
          Authorization: `Bearer ${token}`,
          'x-studio-id': studio?.id || '',
        },
      });
      if (res.ok) {
        const json = await res.json();
        setClients(json.data?.clients || json.data || []);
      }
    } catch (err) {
      console.error('Failed to load clients:', err);
    }
  };

  useEffect(() => {
    if (token) {
      fetchProjects();
      fetchClients();
    }
  }, [token, studio?.id, statusFilter, typeFilter]);

  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/v1/operations/projects', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
          'x-studio-id': studio?.id || '',
        },
        body: JSON.stringify(newProject),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to create project');
      }

      setShowCreateModal(false);
      setNewProject({
        title: '',
        project_type: StudioProjectType.WEDDING,
        status: StudioProjectStatus.BOOKED,
        client_id: '',
        shoot_date: '',
        shoot_location: '',
        shoot_duration_hours: 4,
        estimated_delivery_date: '',
        total_amount: 0,
        paid_amount: 0,
        equipment_notes: '',
      });
      fetchProjects();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleDeleteProject = async (id: string) => {
    if (!confirm('Are you sure you want to delete this project?')) return;
    try {
      const res = await fetch(`/api/v1/operations/projects/${id}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
          'x-studio-id': studio?.id || '',
        },
      });
      if (!res.ok) throw new Error('Failed to delete project');
      fetchProjects();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const getStatusBadge = (status: StudioProjectStatus) => {
    switch (status) {
      case StudioProjectStatus.INQUIRY:
      case StudioProjectStatus.BOOKED:
      case StudioProjectStatus.PREPARATION:
        return 'bg-blue-500/10 text-blue-400 border-blue-500/20';
      case StudioProjectStatus.SHOOT_SCHEDULED:
      case StudioProjectStatus.SHOOT_COMPLETED:
        return 'bg-purple-500/10 text-purple-400 border-purple-500/20';
      case StudioProjectStatus.PROCESSING:
      case StudioProjectStatus.GALLERY_PREPARATION:
        return 'bg-amber-500/10 text-amber-400 border-amber-500/20';
      case StudioProjectStatus.DELIVERED:
      case StudioProjectStatus.COMPLETED:
        return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
      case StudioProjectStatus.CANCELLED:
        return 'bg-rose-500/10 text-rose-400 border-rose-500/20';
      default:
        return 'bg-card-border text-muted border-card-border';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2.5">
            <Briefcase className="h-6 w-6 text-primary" />
            Studio Projects & Shoots
          </h1>
          <p className="text-sm text-muted">
            Manage active client projects, shoot timelines, task progress, and multi-gallery deliverables.
          </p>
        </div>

        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 px-3.5 py-2 bg-gradient-to-r from-primary to-accent hover:from-primary/90 hover:to-accent/90 text-white text-xs font-bold rounded-lg shadow-sm shadow-primary/20 transition self-start md:self-auto"
        >
          <PlusCircle className="h-4 w-4" />
          Book New Project
        </button>
      </div>

      <OperationsNavTabs />

      {/* Filter Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-4 bg-card border border-card-border rounded-xl">
        <div className="relative w-full sm:w-80">
          <Search className="h-4 w-4 text-muted absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search projects or clients..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && fetchProjects()}
            className="w-full bg-card-border/30 border border-card-border/60 rounded-lg pl-9 pr-3 py-1.5 text-xs text-white placeholder-muted focus:outline-none focus:border-primary"
          />
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-muted">Status:</span>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-card-border/40 border border-card-border rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-primary"
            >
              <option value="ALL">All Statuses</option>
              {Object.values(StudioProjectStatus).map((s) => (
                <option key={s} value={s}>
                  {s.replace(/_/g, ' ')}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-1.5">
            <span className="text-xs text-muted">Type:</span>
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="bg-card-border/40 border border-card-border rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-primary"
            >
              <option value="ALL">All Types</option>
              {Object.values(StudioProjectType).map((pt) => (
                <option key={pt} value={pt}>
                  {pt.replace(/_/g, ' ')}
                </option>
              ))}
            </select>
          </div>

          <button
            onClick={fetchProjects}
            disabled={loading}
            className="p-1.5 text-muted hover:text-white bg-card-border/40 hover:bg-card-border rounded-lg transition"
            title="Refresh"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-sm text-red-400 flex items-center gap-2">
          <AlertCircle className="h-4 w-4" />
          {error}
        </div>
      )}

      {/* Projects Grid */}
      {loading ? (
        <div className="py-12 text-center text-xs text-muted">Loading projects...</div>
      ) : projects.length === 0 ? (
        <div className="p-12 text-center bg-card border border-dashed border-card-border rounded-2xl space-y-3">
          <div className="w-12 h-12 rounded-full bg-primary/10 text-primary flex items-center justify-center mx-auto">
            <Briefcase className="h-6 w-6" />
          </div>
          <h3 className="text-base font-bold text-white">No projects found</h3>
          <p className="text-xs text-muted max-w-sm mx-auto">
            Create your first project booking or convert an inquiry from the Leads Pipeline.
          </p>
          <button
            onClick={() => setShowCreateModal(true)}
            className="px-4 py-2 bg-primary hover:bg-primary/90 text-white text-xs font-bold rounded-lg transition inline-flex items-center gap-2"
          >
            <PlusCircle className="h-4 w-4" /> Book New Project
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {projects.map((project) => {
            const shootDate = project.shoot_date ? new Date(project.shoot_date) : null;
            const deliveryDate = project.estimated_delivery_date
              ? new Date(project.estimated_delivery_date)
              : null;
            const outstanding = Math.max(0, (project.total_amount || 0) - (project.paid_amount || 0));

            return (
              <div
                key={project.id}
                className="bg-card border border-card-border rounded-xl p-5 hover:border-primary/50 transition flex flex-col justify-between gap-4 group"
              >
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase border ${getStatusBadge(
                          project.status
                        )}`}
                      >
                        {project.status.replace(/_/g, ' ')}
                      </span>
                      <h3 className="text-sm font-bold text-white mt-2 group-hover:text-primary transition line-clamp-1">
                        {project.title}
                      </h3>
                    </div>

                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-card-border text-muted">
                      {project.project_type}
                    </span>
                  </div>

                  {project.client && (
                    <div className="text-xs text-muted flex items-center gap-1.5">
                      <User className="h-3.5 w-3.5 text-muted" />
                      <span className="text-white font-medium">{project.client.name}</span>
                    </div>
                  )}

                  <div className="space-y-1 text-xs text-muted pt-2 border-t border-card-border/40">
                    {shootDate && (
                      <div className="flex items-center gap-2">
                        <Calendar className="h-3.5 w-3.5 text-blue-400" />
                        <span>
                          Shoot:{' '}
                          <strong className="text-white">
                            {shootDate.toLocaleDateString('en-US', {
                              month: 'short',
                              day: 'numeric',
                              year: 'numeric',
                            })}
                          </strong>
                        </span>
                      </div>
                    )}

                    {project.shoot_location && (
                      <div className="flex items-center gap-2 line-clamp-1">
                        <MapPin className="h-3.5 w-3.5 text-muted" />
                        <span>{project.shoot_location}</span>
                      </div>
                    )}

                    {deliveryDate && (
                      <div className="flex items-center gap-2">
                        <Clock className="h-3.5 w-3.5 text-emerald-400" />
                        <span>Est. Delivery: {deliveryDate.toLocaleDateString()}</span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="pt-3 border-t border-card-border flex items-center justify-between">
                  <div>
                    <div className="text-[10px] text-muted uppercase tracking-wider font-semibold">
                      Agreed Total
                    </div>
                    <div className="text-xs font-bold text-white">
                      ₹{(project.total_amount || 0).toLocaleString()}
                      {outstanding > 0 ? (
                        <span className="text-[10px] text-amber-400 font-normal ml-1">
                          (₹{outstanding.toLocaleString()} due)
                        </span>
                      ) : (
                        <span className="text-[10px] text-emerald-400 font-normal ml-1">
                          (Paid in full)
                        </span>
                      )}
                    </div>
                  </div>

                  <Link
                    href={`/dashboard/operations/projects/${project.id}`}
                    className="flex items-center gap-1 px-3 py-1.5 bg-primary/20 hover:bg-primary/30 text-primary text-xs font-bold rounded-lg transition"
                  >
                    View 360 <ChevronRight className="h-3.5 w-3.5" />
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal: Book New Project */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-card border border-card-border rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-xl">
            <div className="flex items-center justify-between pb-3 border-b border-card-border">
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <Briefcase className="h-5 w-5 text-primary" />
                Book New Studio Project
              </h2>
              <button
                onClick={() => setShowCreateModal(false)}
                className="text-muted hover:text-white text-sm"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateProject} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-muted mb-1">Project Title *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Sharma Wedding & Reception"
                  value={newProject.title}
                  onChange={(e) => setNewProject({ ...newProject, title: e.target.value })}
                  className="w-full bg-card-border/30 border border-card-border rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-primary"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-muted mb-1">Client</label>
                  <select
                    value={newProject.client_id || ''}
                    onChange={(e) => setNewProject({ ...newProject, client_id: e.target.value })}
                    className="w-full bg-card-border/30 border border-card-border rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-primary"
                  >
                    <option value="">-- Select Existing Client --</option>
                    {clients.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name} ({c.email})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-muted mb-1">Project Type</label>
                  <select
                    value={newProject.project_type}
                    onChange={(e) =>
                      setNewProject({ ...newProject, project_type: e.target.value as StudioProjectType })
                    }
                    className="w-full bg-card-border/30 border border-card-border rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-primary"
                  >
                    {Object.values(StudioProjectType).map((pt) => (
                      <option key={pt} value={pt}>
                        {pt.replace(/_/g, ' ')}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-muted mb-1">Shoot Date</label>
                  <input
                    type="date"
                    value={(newProject.shoot_date as string) || ''}
                    onChange={(e) => setNewProject({ ...newProject, shoot_date: e.target.value })}
                    className="w-full bg-card-border/30 border border-card-border rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-primary"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-muted mb-1">Est. Delivery Date</label>
                  <input
                    type="date"
                    value={(newProject.estimated_delivery_date as string) || ''}
                    onChange={(e) =>
                      setNewProject({ ...newProject, estimated_delivery_date: e.target.value })
                    }
                    className="w-full bg-card-border/30 border border-card-border rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-primary"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-muted mb-1">Shoot Location</label>
                <input
                  type="text"
                  placeholder="e.g. Taj West End, Bengaluru"
                  value={newProject.shoot_location || ''}
                  onChange={(e) => setNewProject({ ...newProject, shoot_location: e.target.value })}
                  className="w-full bg-card-border/30 border border-card-border rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-primary"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-muted mb-1">Total Agreed Value (₹)</label>
                  <input
                    type="number"
                    min="0"
                    placeholder="120000"
                    value={newProject.total_amount || ''}
                    onChange={(e) =>
                      setNewProject({ ...newProject, total_amount: parseFloat(e.target.value) || 0 })
                    }
                    className="w-full bg-card-border/30 border border-card-border rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-primary"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-muted mb-1">Paid Amount (₹)</label>
                  <input
                    type="number"
                    min="0"
                    placeholder="40000"
                    value={newProject.paid_amount || ''}
                    onChange={(e) =>
                      setNewProject({ ...newProject, paid_amount: parseFloat(e.target.value) || 0 })
                    }
                    className="w-full bg-card-border/30 border border-card-border rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-primary"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-card-border">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-muted hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-primary hover:bg-primary/90 text-white text-xs font-bold rounded-lg shadow-sm shadow-primary/30 transition"
                >
                  Create Booking
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
