'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import {
  Briefcase,
  Calendar,
  MapPin,
  Clock,
  CheckCircle2,
  AlertCircle,
  PlusCircle,
  Trash2,
  Edit2,
  DollarSign,
  Images,
  FileText,
  User,
  Settings,
  ArrowLeft,
  ChevronRight,
  ExternalLink,
  MessageSquare,
  CheckSquare,
  Flag,
  Share2,
  RefreshCw,
  Eye,
  FileSignature,
  CreditCard,
  Send,
} from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import {
  StudioProjectDTO,
  StudioProjectStatus,
  StudioProjectType,
  ProjectTaskStatus,
  ProjectTaskPriority,
  ProjectMilestoneStatus,
  ProjectGalleryLinkDTO,
  ProjectMilestoneDTO,
  ProjectTaskDTO,
  ProjectNoteDTO,
  StudioProposalDTO,
  StudioContractDTO,
  ProjectPaymentScheduleDTO,
} from '@pixmatch/types';

export default function ProjectDetail360Page() {
  const { id } = useParams() as { id: string };
  const router = useRouter();
  const { token, studio, user } = useAuth();

  const [project, setProject] = useState<StudioProjectDTO | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<
    'overview' | 'proposals' | 'contracts' | 'installments' | 'milestones' | 'tasks' | 'galleries' | 'payments' | 'notes' | 'client' | 'schedule' | 'settings'
  >('overview');

  // Interactive states
  const [galleriesList, setGalleriesList] = useState<any[]>([]);
  const [availableGalleries, setAvailableGalleries] = useState<any[]>([]);
  const [paymentsList, setPaymentsList] = useState<any[]>([]);
  const [notesList, setNotesList] = useState<ProjectNoteDTO[]>([]);
  const [newNoteContent, setNewNoteContent] = useState('');

  // Phase 21 states
  const [linkedProposals, setLinkedProposals] = useState<StudioProposalDTO[]>([]);
  const [linkedContracts, setLinkedContracts] = useState<StudioContractDTO[]>([]);
  const [paymentSchedules, setPaymentSchedules] = useState<ProjectPaymentScheduleDTO[]>([]);

  // Modals
  const [showAddMilestoneModal, setShowAddMilestoneModal] = useState(false);
  const [newMilestone, setNewMilestone] = useState({ title: '', target_date: '', description: '' });

  const [showAddTaskModal, setShowAddTaskModal] = useState(false);
  const [newTask, setNewTask] = useState({
    title: '',
    description: '',
    priority: ProjectTaskPriority.MEDIUM,
    due_date: '',
  });

  const [showLinkGalleryModal, setShowLinkGalleryModal] = useState(false);
  const [selectedGalleryId, setSelectedGalleryId] = useState('');
  const [isPrimaryGallery, setIsPrimaryGallery] = useState(false);

  const fetchProjectDetails = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch(`/api/v1/operations/projects/${id}`, {
        headers: {
          Authorization: `Bearer ${token}`,
          'x-studio-id': studio?.id || '',
        },
      });

      if (!res.ok) throw new Error('Failed to load project details');
      const json = await res.json();
      const p = json.data || json;
      setProject(p);
      setGalleriesList(p.gallery_links || []);
      setNotesList(p.notes || []);
    } catch (err: any) {
      setError(err.message || 'Error loading project');
    } finally {
      setLoading(false);
    }
  };

  const fetchPayments = async () => {
    try {
      const res = await fetch(`/api/v1/operations/projects/${id}/payments`, {
        headers: {
          Authorization: `Bearer ${token}`,
          'x-studio-id': studio?.id || '',
        },
      });
      if (res.ok) {
        const json = await res.json();
        setPaymentsList(json.data || []);
      }
    } catch (err) {
      console.error('Failed to load payments:', err);
    }
  };

  const fetchAvailableGalleries = async () => {
    try {
      const res = await fetch('/api/v1/galleries', {
        headers: {
          Authorization: `Bearer ${token}`,
          'x-studio-id': studio?.id || '',
        },
      });
      if (res.ok) {
        const json = await res.json();
        setAvailableGalleries(json.data?.galleries || json.data || []);
      }
    } catch (err) {
      console.error('Failed to load studio galleries:', err);
    }
  };

  const fetchPhase21Data = async () => {
    if (!token || !studio?.id || !id) return;
    try {
      // Proposals
      const pRes = await fetch(`/api/v1/proposals?project_id=${id}`, {
        headers: { Authorization: `Bearer ${token}`, 'x-studio-id': studio.id },
      });
      if (pRes.ok) {
        const json = await pRes.json();
        setLinkedProposals(json.data || []);
      }

      // Contracts
      const cRes = await fetch(`/api/v1/contracts?project_id=${id}`, {
        headers: { Authorization: `Bearer ${token}`, 'x-studio-id': studio.id },
      });
      if (cRes.ok) {
        const json = await cRes.json();
        setLinkedContracts(json.data || []);
      }

      // Schedules
      const sRes = await fetch(`/api/v1/payment-schedules?project_id=${id}`, {
        headers: { Authorization: `Bearer ${token}`, 'x-studio-id': studio.id },
      });
      if (sRes.ok) {
        const json = await sRes.json();
        setPaymentSchedules(json.data || []);
      }
    } catch (err) {
      console.error('Failed to load Phase 21 project data:', err);
    }
  };

  useEffect(() => {
    if (token && id) {
      fetchProjectDetails();
      fetchPayments();
      fetchAvailableGalleries();
      fetchPhase21Data();
    }
  }, [token, id, studio?.id]);

  // Status Updater
  const handleUpdateStatus = async (status: StudioProjectStatus) => {
    try {
      const res = await fetch(`/api/v1/operations/projects/${id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
          'x-studio-id': studio?.id || '',
        },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) throw new Error('Failed to update status');
      fetchProjectDetails();
    } catch (err: any) {
      alert(err.message);
    }
  };

  // Milestone Actions
  const handleCreateMilestone = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/v1/operations/milestones', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
          'x-studio-id': studio?.id || '',
        },
        body: JSON.stringify({
          project_id: id,
          title: newMilestone.title,
          description: newMilestone.description,
          target_date: newMilestone.target_date || undefined,
        }),
      });
      if (!res.ok) throw new Error('Failed to add milestone');
      setShowAddMilestoneModal(false);
      setNewMilestone({ title: '', target_date: '', description: '' });
      fetchProjectDetails();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleToggleMilestone = async (milestoneId: string, currentStatus: ProjectMilestoneStatus) => {
    const nextStatus =
      currentStatus === ProjectMilestoneStatus.COMPLETED
        ? ProjectMilestoneStatus.PENDING
        : ProjectMilestoneStatus.COMPLETED;
    try {
      const res = await fetch(`/api/v1/operations/milestones/${milestoneId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
          'x-studio-id': studio?.id || '',
        },
        body: JSON.stringify({ status: nextStatus }),
      });
      if (!res.ok) throw new Error('Failed to toggle milestone');
      fetchProjectDetails();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleDeleteMilestone = async (milestoneId: string) => {
    try {
      const res = await fetch(`/api/v1/operations/milestones/${milestoneId}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
          'x-studio-id': studio?.id || '',
        },
      });
      if (!res.ok) throw new Error('Failed to delete milestone');
      fetchProjectDetails();
    } catch (err: any) {
      alert(err.message);
    }
  };

  // Task Actions
  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/v1/operations/tasks', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
          'x-studio-id': studio?.id || '',
        },
        body: JSON.stringify({
          project_id: id,
          title: newTask.title,
          description: newTask.description,
          priority: newTask.priority,
          due_date: newTask.due_date || undefined,
        }),
      });
      if (!res.ok) throw new Error('Failed to add task');
      setShowAddTaskModal(false);
      setNewTask({
        title: '',
        description: '',
        priority: ProjectTaskPriority.MEDIUM,
        due_date: '',
      });
      fetchProjectDetails();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleToggleTaskComplete = async (taskId: string) => {
    try {
      const res = await fetch(`/api/v1/operations/tasks/${taskId}/complete`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'x-studio-id': studio?.id || '',
        },
      });
      if (!res.ok) throw new Error('Failed to complete task');
      fetchProjectDetails();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleDeleteTask = async (taskId: string) => {
    try {
      const res = await fetch(`/api/v1/operations/tasks/${taskId}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
          'x-studio-id': studio?.id || '',
        },
      });
      if (!res.ok) throw new Error('Failed to delete task');
      fetchProjectDetails();
    } catch (err: any) {
      alert(err.message);
    }
  };

  // Gallery Linking Actions
  const handleLinkGallery = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedGalleryId) return;
    try {
      const res = await fetch(`/api/v1/operations/projects/${id}/galleries`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
          'x-studio-id': studio?.id || '',
        },
        body: JSON.stringify({
          gallery_id: selectedGalleryId,
          is_primary: isPrimaryGallery,
        }),
      });
      if (!res.ok) throw new Error('Failed to link gallery');
      setShowLinkGalleryModal(false);
      setSelectedGalleryId('');
      fetchProjectDetails();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleUnlinkGallery = async (galleryId: string) => {
    if (!confirm('Unlink this gallery from the project?')) return;
    try {
      const res = await fetch(`/api/v1/operations/projects/${id}/galleries/${galleryId}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
          'x-studio-id': studio?.id || '',
        },
      });
      if (!res.ok) throw new Error('Failed to unlink gallery');
      fetchProjectDetails();
    } catch (err: any) {
      alert(err.message);
    }
  };

  // Notes Actions
  const handleAddNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNoteContent.trim()) return;
    try {
      const res = await fetch(`/api/v1/operations/projects/${id}/notes`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
          'x-studio-id': studio?.id || '',
        },
        body: JSON.stringify({ content: newNoteContent.trim() }),
      });
      if (!res.ok) throw new Error('Failed to add note');
      setNewNoteContent('');
      fetchProjectDetails();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleDeleteNote = async (noteId: string) => {
    try {
      const res = await fetch(`/api/v1/operations/projects/${id}/notes/${noteId}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
          'x-studio-id': studio?.id || '',
        },
      });
      if (!res.ok) throw new Error('Failed to delete note');
      fetchProjectDetails();
    } catch (err: any) {
      alert(err.message);
    }
  };

  // Delete Project
  const handleDeleteProject = async () => {
    if (!confirm('Are you sure you want to delete this project? This will remove all project tasks and milestones.'))
      return;
    try {
      const res = await fetch(`/api/v1/operations/projects/${id}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
          'x-studio-id': studio?.id || '',
        },
      });
      if (!res.ok) throw new Error('Failed to delete project');
      router.push('/dashboard/operations/projects');
    } catch (err: any) {
      alert(err.message);
    }
  };

  if (loading) {
    return (
      <div className="py-24 text-center text-muted text-sm space-y-3">
        <RefreshCw className="h-6 w-6 animate-spin mx-auto text-primary" />
        <p>Loading project 360 view...</p>
      </div>
    );
  }

  if (error || !project) {
    return (
      <div className="p-8 bg-card border border-card-border rounded-2xl text-center space-y-4">
        <AlertCircle className="h-8 w-8 text-red-400 mx-auto" />
        <h2 className="text-lg font-bold text-white">Project Not Found</h2>
        <p className="text-sm text-muted">{error || 'The requested project could not be found.'}</p>
        <Link
          href="/dashboard/operations/projects"
          className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-white text-xs font-bold rounded-lg"
        >
          <ArrowLeft className="h-4 w-4" /> Back to Projects
        </Link>
      </div>
    );
  }

  const reachedMilestones = project.milestones?.filter((m: any) => m.status === ProjectMilestoneStatus.COMPLETED || m.status === 'REACHED').length || 0;
  const totalMilestones = project.milestones?.length || 0;
  const progressPercent = totalMilestones > 0 ? Math.round((reachedMilestones / totalMilestones) * 100) : 0;
  const outstandingBalance = Math.max(0, (project.total_amount || 0) - (project.paid_amount || 0));

  return (
    <div className="space-y-6">
      {/* Top Header Breadcrumb & Actions */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-card-border pb-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-xs text-muted">
            <Link href="/dashboard/operations/projects" className="hover:text-primary transition flex items-center gap-1">
              <ArrowLeft className="h-3.5 w-3.5" /> Projects
            </Link>
            <span>/</span>
            <span className="text-white font-medium">{project.title}</span>
          </div>
          <h1 className="text-2xl font-bold text-white">{project.title}</h1>
        </div>

        <div className="flex items-center gap-3">
          <select
            value={project.status}
            onChange={(e) => handleUpdateStatus(e.target.value as StudioProjectStatus)}
            className="bg-card-border/40 border border-card-border rounded-lg px-3 py-1.5 text-xs text-white font-semibold focus:outline-none"
          >
            {Object.values(StudioProjectStatus).map((st) => (
              <option key={st} value={st}>
                {st.replace(/_/g, ' ')}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Hero Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="p-4 rounded-xl bg-card border border-card-border space-y-1">
          <span className="text-xs text-muted font-medium">Project Status</span>
          <div className="text-sm font-bold text-white uppercase tracking-wider">
            {project.status.replace(/_/g, ' ')}
          </div>
        </div>
        <div className="p-4 rounded-xl bg-card border border-card-border space-y-1">
          <span className="text-xs text-muted font-medium">Milestones</span>
          <div className="text-sm font-bold text-emerald-400">
            {reachedMilestones}/{totalMilestones} ({progressPercent}%)
          </div>
        </div>
        <div className="p-4 rounded-xl bg-card border border-card-border space-y-1">
          <span className="text-xs text-muted font-medium">Total Value</span>
          <div className="text-sm font-bold text-white">
            ₹{(project.total_amount || 0).toLocaleString()}
          </div>
        </div>
        <div className="p-4 rounded-xl bg-card border border-card-border space-y-1">
          <span className="text-xs text-muted font-medium">Balance Due</span>
          <div className="text-sm font-bold text-amber-400">
            ₹{outstandingBalance.toLocaleString()}
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="border-b border-card-border flex items-center gap-1 overflow-x-auto pb-1 scrollbar-none">
        {[
          { id: 'overview', label: 'Overview', icon: Briefcase },
          { id: 'proposals', label: `Proposals (${linkedProposals.length})`, icon: FileText },
          { id: 'contracts', label: `Contracts (${linkedContracts.length})`, icon: FileSignature },
          { id: 'installments', label: `Payment Schedule (${paymentSchedules.length})`, icon: CreditCard },
          { id: 'milestones', label: `Milestones (${project.milestones?.length || 0})`, icon: Flag },
          { id: 'tasks', label: `Tasks (${project.tasks?.length || 0})`, icon: CheckSquare },
          { id: 'galleries', label: `Galleries (${galleriesList.length})`, icon: Images },
          { id: 'payments', label: `Payments & Balance`, icon: DollarSign },
          { id: 'notes', label: `Notes (${notesList.length})`, icon: MessageSquare },
          { id: 'client', label: 'Client 360', icon: User },
          { id: 'schedule', label: 'Timeline & Delivery', icon: Calendar },
          { id: 'settings', label: 'Settings', icon: Settings },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 px-3.5 py-2.5 text-xs font-semibold rounded-t-lg transition whitespace-nowrap ${
                isActive
                  ? 'border-b-2 border-primary text-primary bg-primary/5'
                  : 'text-muted hover:text-white hover:bg-card'
              }`}
            >
              <Icon className="h-3.5 w-3.5" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* TAB 1: OVERVIEW */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <div className="p-5 rounded-xl bg-card border border-card-border space-y-4">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Briefcase className="h-4 w-4 text-primary" /> Project Information
              </h3>
              <div className="grid grid-cols-2 gap-4 text-xs">
                <div>
                  <span className="text-muted block">Project Type</span>
                  <span className="text-white font-medium">{project.project_type.replace(/_/g, ' ')}</span>
                </div>
                <div>
                  <span className="text-muted block">Created Date</span>
                  <span className="text-white font-medium">
                    {new Date(project.created_at).toLocaleDateString()}
                  </span>
                </div>
                <div>
                  <span className="text-muted block">Shoot Duration</span>
                  <span className="text-white font-medium">{project.shoot_duration_hours || 4} hours</span>
                </div>
                <div>
                  <span className="text-muted block">Est. Delivery Date</span>
                  <span className="text-white font-medium">
                    {(project.estimated_delivery_date || project.end_date)
                      ? new Date(project.estimated_delivery_date || project.end_date!).toLocaleDateString()
                      : 'Not set'}
                  </span>
                </div>
              </div>

              {project.equipment_notes && (
                <div className="pt-3 border-t border-card-border/40">
                  <span className="text-xs text-muted block mb-1">Equipment & Production Notes</span>
                  <p className="text-xs text-white bg-card-border/20 p-3 rounded-lg border border-card-border">
                    {project.equipment_notes}
                  </p>
                </div>
              )}
            </div>

            {/* Next Milestones preview */}
            <div className="p-5 rounded-xl bg-card border border-card-border space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <Flag className="h-4 w-4 text-amber-400" /> Milestones Roadmap
                </h3>
                <button
                  onClick={() => setActiveTab('milestones')}
                  className="text-xs text-primary hover:underline"
                >
                  Manage All →
                </button>
              </div>

              <div className="space-y-2">
                {project.milestones?.map((m: any) => (
                  <div
                    key={m.id}
                    className="p-3 rounded-lg bg-card-border/30 border border-card-border/50 flex items-center justify-between"
                  >
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => handleToggleMilestone(m.id, m.status)}
                        className={`p-1 rounded-full border transition ${
                          m.status === ProjectMilestoneStatus.COMPLETED || m.status === 'REACHED'
                            ? 'bg-emerald-500 border-emerald-500 text-white'
                            : 'border-card-border text-transparent hover:border-emerald-500'
                        }`}
                      >
                        <CheckCircle2 className="h-3.5 w-3.5" />
                      </button>
                      <div>
                        <span
                          className={`text-xs font-semibold ${
                            m.status === 'REACHED' ? 'line-through text-muted' : 'text-white'
                          }`}
                        >
                          {m.title}
                        </span>
                        {m.target_date && (
                          <div className="text-[10px] text-muted">
                            Target: {new Date(m.target_date).toLocaleDateString()}
                          </div>
                        )}
                      </div>
                    </div>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-card text-muted uppercase">
                      {m.status}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Right Sidebar: Linked Galleries & Client Quick Card */}
          <div className="space-y-6">
            <div className="p-5 rounded-xl bg-card border border-card-border space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <Images className="h-4 w-4 text-primary" /> Linked Galleries
                </h3>
                <button
                  onClick={() => setActiveTab('galleries')}
                  className="text-xs text-primary hover:underline"
                >
                  View All ({galleriesList.length})
                </button>
              </div>

              {galleriesList.length === 0 ? (
                <div className="py-6 text-center text-xs text-muted border border-dashed border-card-border rounded-lg">
                  No galleries linked yet.
                </div>
              ) : (
                <div className="space-y-2">
                  {galleriesList.map((gLink) => (
                    <div
                      key={gLink.id}
                      className="p-3 rounded-lg bg-card-border/30 border border-card-border/50 flex items-center justify-between"
                    >
                      <div>
                        <span className="text-xs font-semibold text-white line-clamp-1">
                          {gLink.gallery?.name || 'Gallery'}
                        </span>
                        <div className="text-[10px] text-muted">
                          {gLink.gallery?._count?.photos || 0} photos • {gLink.is_primary ? 'Primary' : 'Secondary'}
                        </div>
                      </div>
                      <Link
                        href={`/dashboard/galleries/${gLink.gallery_id}`}
                        className="p-1.5 rounded-lg bg-card hover:bg-card-border text-muted hover:text-white transition"
                        title="Open Gallery"
                      >
                        <ExternalLink className="h-3.5 w-3.5" />
                      </Link>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Quick Actions */}
            <div className="p-5 rounded-xl bg-gradient-to-br from-card to-card-border/20 border border-card-border space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-muted">Quick Actions</h3>
              <div className="space-y-2">
                <button
                  onClick={() => setShowAddTaskModal(true)}
                  className="w-full text-left px-3 py-2 rounded-lg bg-card border border-card-border hover:bg-card-border/40 text-xs font-semibold text-white flex items-center justify-between transition"
                >
                  <span>+ Add Project Task</span>
                  <CheckSquare className="h-3.5 w-3.5 text-primary" />
                </button>
                <button
                  onClick={() => setShowAddMilestoneModal(true)}
                  className="w-full text-left px-3 py-2 rounded-lg bg-card border border-card-border hover:bg-card-border/40 text-xs font-semibold text-white flex items-center justify-between transition"
                >
                  <span>+ Add Milestone</span>
                  <Flag className="h-3.5 w-3.5 text-amber-400" />
                </button>
                <button
                  onClick={() => setShowLinkGalleryModal(true)}
                  className="w-full text-left px-3 py-2 rounded-lg bg-card border border-card-border hover:bg-card-border/40 text-xs font-semibold text-white flex items-center justify-between transition"
                >
                  <span>+ Link Photo Gallery</span>
                  <Images className="h-3.5 w-3.5 text-emerald-400" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB: PROPOSALS */}
      {activeTab === 'proposals' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <FileText className="h-5 w-5 text-primary" />
              Proposals & Quotes
            </h3>
            <Link
              href={`/dashboard/operations/proposals/new?project_id=${id}&client_id=${project.client_id || ''}`}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-primary text-white text-xs font-bold rounded-lg shadow-sm shadow-primary/20 transition hover:bg-primary/90"
            >
              <PlusCircle className="h-3.5 w-3.5" /> Create Proposal
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {linkedProposals.length === 0 ? (
              <div className="col-span-2 py-8 text-center text-xs text-muted border border-dashed border-card-border rounded-xl">
                No proposals created for this project yet. Click &quot;Create Proposal&quot; to build an interactive quote.
              </div>
            ) : (
              linkedProposals.map((prop) => (
                <div
                  key={prop.id}
                  className="p-5 rounded-xl bg-card border border-card-border flex flex-col justify-between gap-4"
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-mono text-primary">{prop.proposal_number}</span>
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-primary/20 text-primary border border-primary/30">
                        {prop.status}
                      </span>
                    </div>
                    <h4 className="text-sm font-bold text-white">{prop.title}</h4>
                    <p className="text-xs text-muted">
                      Rev #{prop.current_revision || 1} • {prop.items?.length || 0} line items
                    </p>
                    <div className="pt-2 flex items-center justify-between text-xs">
                      <span className="text-muted">Total Value:</span>
                      <span className="text-sm font-bold text-white">${Number(prop.total_amount).toLocaleString()}</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-3 border-t border-card-border">
                    <Link
                      href={`/dashboard/operations/proposals/${prop.id}`}
                      className="text-xs text-primary font-semibold hover:underline flex items-center gap-1"
                    >
                      View & Manage <ChevronRight className="h-3.5 w-3.5" />
                    </Link>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* TAB: CONTRACTS */}
      {activeTab === 'contracts' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <FileSignature className="h-5 w-5 text-primary" />
              Agreements & E-Signatures
            </h3>
            <Link
              href={`/dashboard/operations/contracts/new?project_id=${id}&client_id=${project.client_id || ''}`}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-primary text-white text-xs font-bold rounded-lg shadow-sm shadow-primary/20 transition hover:bg-primary/90"
            >
              <PlusCircle className="h-3.5 w-3.5" /> Create Contract
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {linkedContracts.length === 0 ? (
              <div className="col-span-2 py-8 text-center text-xs text-muted border border-dashed border-card-border rounded-xl">
                No contracts generated for this project yet. Click &quot;Create Contract&quot; to scaffold an agreement from template.
              </div>
            ) : (
              linkedContracts.map((cont) => (
                <div
                  key={cont.id}
                  className="p-5 rounded-xl bg-card border border-card-border flex flex-col justify-between gap-4"
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-mono text-primary">{cont.contract_number}</span>
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                        {cont.status}
                      </span>
                    </div>
                    <h4 className="text-sm font-bold text-white">{cont.title}</h4>
                    <div className="text-xs text-muted space-y-1">
                      <p>Client Sign: {cont.signed_by_name ? `✓ Signed (${new Date(cont.signed_at!).toLocaleDateString()})` : 'Pending'}</p>
                      <p>Studio Sign: {cont.countersigned_at ? `✓ Signed (${new Date(cont.countersigned_at!).toLocaleDateString()})` : 'Pending'}</p>
                    </div>
                    <div className="pt-2 flex items-center justify-between text-xs">
                      <span className="text-muted">Contract Value:</span>
                      <span className="text-sm font-bold text-white">${Number(cont.proposal?.total_amount || project.total_amount || 0).toLocaleString()}</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-3 border-t border-card-border">
                    <Link
                      href={`/dashboard/operations/contracts/${cont.id}`}
                      className="text-xs text-primary font-semibold hover:underline flex items-center gap-1"
                    >
                      View & Countersign <ChevronRight className="h-3.5 w-3.5" />
                    </Link>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* TAB: INSTALLMENTS & PAYMENT SCHEDULE */}
      {activeTab === 'installments' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <CreditCard className="h-5 w-5 text-primary" />
              Payment Schedules & Installments
            </h3>
          </div>

          <div className="space-y-4">
            {paymentSchedules.length === 0 ? (
              <div className="py-8 text-center text-xs text-muted border border-dashed border-card-border rounded-xl">
                No structured payment schedules created for this project. Schedules are automatically created upon proposal acceptance or booking confirmation.
              </div>
            ) : (
              <div className="p-6 rounded-xl bg-card border border-card-border space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-sm font-bold text-white">Payment Installments Schedule</h4>
                    <p className="text-xs text-muted">
                      Total Scheduled: <strong className="text-white">${paymentSchedules.reduce((sum, s) => sum + Number(s.amount), 0).toLocaleString()}</strong>
                      {' • '}
                      Collected: <strong className="text-emerald-400">${paymentSchedules.reduce((sum, s) => sum + Number(s.paid_amount || 0), 0).toLocaleString()}</strong>
                    </p>
                  </div>
                </div>

                <div className="divide-y divide-card-border/50 border border-card-border rounded-xl overflow-hidden bg-card-border/20">
                  {paymentSchedules.map((inst, idx) => (
                    <div key={inst.id} className="p-4 flex items-center justify-between text-xs">
                      <div className="flex items-center gap-3">
                        <span className="w-6 h-6 rounded-full bg-card flex items-center justify-center font-bold text-muted">
                          {inst.installment_number || idx + 1}
                        </span>
                        <div>
                          <span className="font-semibold text-white block">{inst.title}</span>
                          <span className="text-muted">
                            Due: {inst.due_date ? new Date(inst.due_date).toLocaleDateString() : 'Upon agreement'}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="font-bold text-white">${Number(inst.amount).toLocaleString()}</span>
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          inst.status === 'PAID'
                            ? 'bg-emerald-500/20 text-emerald-400'
                            : inst.status === 'OVERDUE'
                            ? 'bg-rose-500/20 text-rose-400'
                            : 'bg-amber-500/20 text-amber-400'
                        }`}>
                          {inst.status}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: MILESTONES */}
      {activeTab === 'milestones' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Flag className="h-5 w-5 text-amber-400" />
              Project Milestones & Lifecycle Stage
            </h3>
            <button
              onClick={() => setShowAddMilestoneModal(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-primary text-white text-xs font-bold rounded-lg shadow-sm shadow-primary/20 transition"
            >
              <PlusCircle className="h-3.5 w-3.5" /> Add Milestone
            </button>
          </div>

          <div className="space-y-3">
            {project.milestones?.map((m, idx) => (
              <div
                key={m.id}
                className="p-4 rounded-xl bg-card border border-card-border flex items-center justify-between gap-4"
              >
                <div className="flex items-center gap-4">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-card-border text-xs font-bold text-muted">
                    {idx + 1}
                  </div>
                  <div>
                    <h4
                      className={`text-sm font-semibold ${
                        m.status === ProjectMilestoneStatus.COMPLETED ? 'line-through text-muted' : 'text-white'
                      }`}
                    >
                      {m.title}
                    </h4>
                    {m.description && <p className="text-xs text-muted mt-0.5">{m.description}</p>}
                    <div className="text-[11px] text-muted flex items-center gap-4 mt-1">
                      {m.target_date && <span>Target: {new Date(m.target_date).toLocaleDateString()}</span>}
                      {m.completed_at && (
                        <span className="text-emerald-400">
                          Reached: {new Date(m.completed_at).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <button
                    onClick={() => handleToggleMilestone(m.id, m.status)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
                      m.status === ProjectMilestoneStatus.COMPLETED
                        ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                        : 'bg-card-border hover:bg-card-border/80 text-white'
                    }`}
                  >
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    {m.status === ProjectMilestoneStatus.COMPLETED ? 'Completed' : 'Mark Reached'}
                  </button>
                  <button
                    onClick={() => handleDeleteMilestone(m.id)}
                    className="p-1.5 text-muted hover:text-rose-400 transition"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 3: TASKS */}
      {activeTab === 'tasks' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <CheckSquare className="h-5 w-5 text-primary" />
              Project Tasks & Action Items
            </h3>
            <button
              onClick={() => setShowAddTaskModal(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-primary text-white text-xs font-bold rounded-lg shadow-sm shadow-primary/20 transition"
            >
              <PlusCircle className="h-3.5 w-3.5" /> Add Task
            </button>
          </div>

          <div className="space-y-2.5">
            {project.tasks?.length === 0 ? (
              <div className="py-8 text-center text-xs text-muted border border-dashed border-card-border rounded-xl">
                No tasks created for this project yet.
              </div>
            ) : (
              project.tasks?.map((t) => (
                <div
                  key={t.id}
                  className="p-4 rounded-xl bg-card border border-card-border flex items-center justify-between gap-4"
                >
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => handleToggleTaskComplete(t.id)}
                      className={`p-1.5 rounded-lg border transition ${
                        t.status === ProjectTaskStatus.COMPLETED
                          ? 'bg-emerald-500 border-emerald-500 text-white'
                          : 'border-card-border text-transparent hover:border-emerald-500'
                      }`}
                    >
                      <CheckCircle2 className="h-4 w-4" />
                    </button>
                    <div>
                      <span
                        className={`text-xs font-semibold ${
                          t.status === ProjectTaskStatus.COMPLETED ? 'line-through text-muted' : 'text-white'
                        }`}
                      >
                        {t.title}
                      </span>
                      {t.description && <p className="text-xs text-muted mt-0.5">{t.description}</p>}
                      <div className="text-[11px] text-muted flex items-center gap-3 mt-1">
                        {t.due_date && <span>Due: {new Date(t.due_date).toLocaleDateString()}</span>}
                        <span className="px-1.5 py-0.5 rounded text-[9px] font-bold uppercase bg-card-border">
                          {t.priority}
                        </span>
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={() => handleDeleteTask(t.id)}
                    className="p-1.5 text-muted hover:text-rose-400 transition"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* TAB 4: GALLERIES */}
      {activeTab === 'galleries' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Images className="h-5 w-5 text-primary" />
              Connected Galleries
            </h3>
            <button
              onClick={() => setShowLinkGalleryModal(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-primary text-white text-xs font-bold rounded-lg shadow-sm shadow-primary/20 transition"
            >
              <PlusCircle className="h-3.5 w-3.5" /> Link Gallery
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {galleriesList.length === 0 ? (
              <div className="col-span-2 py-8 text-center text-xs text-muted border border-dashed border-card-border rounded-xl">
                No photo galleries linked to this project. Click &quot;Link Gallery&quot; to connect delivery galleries.
              </div>
            ) : (
              galleriesList.map((link) => (
                <div
                  key={link.id}
                  className="p-5 rounded-xl bg-card border border-card-border flex flex-col justify-between gap-4"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-white">{link.gallery?.name}</span>
                        {link.is_primary && (
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-primary/20 text-primary border border-primary/30">
                            Primary
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-muted mt-1">
                        {link.gallery?._count?.photos || 0} photos • Status: {link.gallery?.status || 'Active'}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-3 border-t border-card-border">
                    <Link
                      href={`/dashboard/galleries/${link.gallery_id}`}
                      className="flex items-center gap-1 text-xs text-primary hover:underline font-semibold"
                    >
                      Open in Gallery Manager <ExternalLink className="h-3 w-3" />
                    </Link>
                    <button
                      onClick={() => handleUnlinkGallery(link.gallery_id)}
                      className="p-1 text-muted hover:text-rose-400 text-xs flex items-center gap-1 transition"
                    >
                      <Trash2 className="h-3.5 w-3.5" /> Unlink
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* TAB 5: PAYMENTS */}
      {activeTab === 'payments' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-4 rounded-xl bg-card border border-card-border">
              <span className="text-[10px] text-muted uppercase font-bold">Total Booked Value</span>
              <div className="text-xl font-bold text-white mt-1">
                ₹{(project.total_amount || 0).toLocaleString()}
              </div>
            </div>
            <div className="p-4 rounded-xl bg-card border border-card-border">
              <span className="text-[10px] text-muted uppercase font-bold">Total Collected</span>
              <div className="text-xl font-bold text-emerald-400 mt-1">
                ₹{(project.paid_amount || 0).toLocaleString()}
              </div>
            </div>
            <div className="p-4 rounded-xl bg-card border border-card-border">
              <span className="text-[10px] text-muted uppercase font-bold">Outstanding Balance</span>
              <div className="text-xl font-bold text-amber-400 mt-1">
                ₹{outstandingBalance.toLocaleString()}
              </div>
            </div>
          </div>

          <div className="p-5 rounded-xl bg-card border border-card-border space-y-4">
            <h3 className="text-sm font-bold text-white">Recorded Business Transactions (Phase 18 Integration)</h3>
            {paymentsList.length === 0 ? (
              <div className="py-6 text-center text-xs text-muted border border-dashed border-card-border rounded-lg">
                No recorded financial transactions for this project yet.
              </div>
            ) : (
              <table className="w-full text-left text-xs">
                <thead className="text-muted border-b border-card-border uppercase text-[10px]">
                  <tr>
                    <th className="py-2">Date</th>
                    <th className="py-2">Type</th>
                    <th className="py-2">Status</th>
                    <th className="py-2">Description</th>
                    <th className="py-2 text-right">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-card-border/40">
                  {paymentsList.map((tx) => (
                    <tr key={tx.id}>
                      <td className="py-2.5 text-muted">{new Date(tx.created_at).toLocaleDateString()}</td>
                      <td className="py-2.5 font-medium text-white">{tx.transaction_type}</td>
                      <td className="py-2.5">
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-500/10 text-emerald-400">
                          {tx.status}
                        </span>
                      </td>
                      <td className="py-2.5 text-muted">{tx.description || '—'}</td>
                      <td className="py-2.5 text-right font-bold text-white">
                        ₹{(tx.amount || 0).toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {/* TAB 6: NOTES */}
      {activeTab === 'notes' && (
        <div className="space-y-6 max-w-3xl">
          <form onSubmit={handleAddNote} className="space-y-3">
            <label className="block text-xs font-semibold text-muted">Add Timestamped Studio Note</label>
            <textarea
              rows={3}
              placeholder="Record client discussions, location permits, equipment checklists, or client preferences..."
              value={newNoteContent}
              onChange={(e) => setNewNoteContent(e.target.value)}
              className="w-full bg-card border border-card-border rounded-xl p-3 text-xs text-white placeholder-muted focus:outline-none focus:border-primary"
            />
            <button
              type="submit"
              disabled={!newNoteContent.trim()}
              className="px-4 py-2 bg-primary hover:bg-primary/90 text-white text-xs font-bold rounded-lg transition disabled:opacity-50"
            >
              Post Note
            </button>
          </form>

          <div className="space-y-3">
            {notesList.length === 0 ? (
              <div className="py-8 text-center text-xs text-muted border border-dashed border-card-border rounded-xl">
                No notes added to this project yet.
              </div>
            ) : (
              notesList.map((note) => (
                <div key={note.id} className="p-4 rounded-xl bg-card border border-card-border space-y-2">
                  <div className="flex items-center justify-between text-[11px] text-muted">
                    <span>By: <strong className="text-white">{note.author_id || 'Studio Staff'}</strong></span>
                    <div className="flex items-center gap-2">
                      <span>{new Date(note.created_at).toLocaleString()}</span>
                      <button
                        onClick={() => handleDeleteNote(note.id)}
                        className="text-muted hover:text-rose-400"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                  <p className="text-xs text-white whitespace-pre-wrap">{note.content}</p>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* TAB 7: CLIENT 360 */}
      {activeTab === 'client' && (
        <div className="p-6 rounded-xl bg-card border border-card-border max-w-2xl space-y-4">
          <h3 className="text-base font-bold text-white flex items-center gap-2">
            <User className="h-5 w-5 text-primary" /> Client Profile & Intelligence
          </h3>

          {project.client ? (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-xs">
                <div>
                  <span className="text-muted block">Client Name</span>
                  <span className="text-white font-bold text-sm">{project.client.name}</span>
                </div>
                <div>
                  <span className="text-muted block">Email</span>
                  <span className="text-white font-medium">{project.client.email}</span>
                </div>
                <div>
                  <span className="text-muted block">Phone</span>
                  <span className="text-white font-medium">{project.client.phone || '—'}</span>
                </div>
                <div>
                  <span className="text-muted block">Client ID</span>
                  <span className="text-muted font-mono text-[10px]">{project.client.id}</span>
                </div>
              </div>

              <div className="pt-4 border-t border-card-border flex items-center gap-3">
                <Link
                  href={`/dashboard/clients?clientId=${project.client.id}`}
                  className="px-4 py-2 bg-primary text-white text-xs font-bold rounded-lg flex items-center gap-1.5 transition hover:bg-primary/90"
                >
                  Open Client 360 Profile <ChevronRight className="h-3.5 w-3.5" />
                </Link>
              </div>
            </div>
          ) : (
            <p className="text-xs text-muted">No client linked to this project.</p>
          )}
        </div>
      )}

      {/* TAB 8: SCHEDULE & TIMELINE */}
      {activeTab === 'schedule' && (
        <div className="p-6 rounded-xl bg-card border border-card-border max-w-2xl space-y-4">
          <h3 className="text-base font-bold text-white flex items-center gap-2">
            <Calendar className="h-5 w-5 text-primary" /> Shoot Schedule & Delivery Target
          </h3>

          <div className="space-y-3 text-xs">
            <div className="p-3.5 rounded-lg bg-card-border/30 border border-card-border flex items-center justify-between">
              <div>
                <span className="text-muted block">Shoot Event Date & Time</span>
                <span className="text-white font-semibold text-sm">
                  {project.shoot_date
                    ? new Date(project.shoot_date).toLocaleString()
                    : 'Unscheduled'}
                </span>
              </div>
              <span className="text-xs font-bold px-2 py-1 rounded bg-blue-500/10 text-blue-400">
                {project.shoot_duration_hours || 4}h Duration
              </span>
            </div>

            <div className="p-3.5 rounded-lg bg-card-border/30 border border-card-border">
              <span className="text-muted block">Shoot Venue & Location</span>
              <span className="text-white font-medium">{project.shoot_location || project.location || 'Not provided'}</span>
            </div>

            <div className="p-3.5 rounded-lg bg-card-border/30 border border-card-border">
              <span className="text-muted block">Estimated Client Delivery Deadline</span>
              <span className="text-emerald-400 font-bold text-sm">
                {(project.estimated_delivery_date || project.end_date)
                  ? new Date(project.estimated_delivery_date || project.end_date!).toLocaleDateString()
                  : 'Not set'}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* TAB 9: SETTINGS & DESTRUCTIVE ACTIONS */}
      {activeTab === 'settings' && (
        <div className="p-6 rounded-xl bg-card border border-card-border max-w-2xl space-y-6">
          <h3 className="text-base font-bold text-white flex items-center gap-2">
            <Settings className="h-5 w-5 text-muted" /> Project Administration
          </h3>

          <div className="p-4 rounded-xl border border-rose-500/20 bg-rose-500/5 space-y-3">
            <h4 className="text-sm font-bold text-rose-400">Danger Zone</h4>
            <p className="text-xs text-muted">
              Deleting this project will permanently remove linked milestones and tasks. Associated client profiles and galleries will remain intact.
            </p>
            <button
              onClick={handleDeleteProject}
              className="px-4 py-2 bg-rose-500/20 hover:bg-rose-500/30 text-rose-400 border border-rose-500/30 text-xs font-bold rounded-lg transition flex items-center gap-2"
            >
              <Trash2 className="h-4 w-4" /> Delete Studio Project
            </button>
          </div>
        </div>
      )}

      {/* MODAL: ADD MILESTONE */}
      {showAddMilestoneModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-card border border-card-border rounded-2xl max-w-md w-full p-6 space-y-4 shadow-xl">
            <div className="flex items-center justify-between pb-2 border-b border-card-border">
              <h2 className="text-base font-bold text-white">Add Project Milestone</h2>
              <button onClick={() => setShowAddMilestoneModal(false)} className="text-muted hover:text-white">✕</button>
            </div>
            <form onSubmit={handleCreateMilestone} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-muted mb-1">Milestone Title *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Culling & Color Correction"
                  value={newMilestone.title}
                  onChange={(e) => setNewMilestone({ ...newMilestone, title: e.target.value })}
                  className="w-full bg-card-border/30 border border-card-border rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-primary"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-muted mb-1">Target Date</label>
                <input
                  type="date"
                  value={newMilestone.target_date}
                  onChange={(e) => setNewMilestone({ ...newMilestone, target_date: e.target.value })}
                  className="w-full bg-card-border/30 border border-card-border rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-primary"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-muted mb-1">Description</label>
                <textarea
                  rows={2}
                  value={newMilestone.description}
                  onChange={(e) => setNewMilestone({ ...newMilestone, description: e.target.value })}
                  className="w-full bg-card-border/30 border border-card-border rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-primary"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setShowAddMilestoneModal(false)} className="px-3 py-1.5 text-xs text-muted">Cancel</button>
                <button type="submit" className="px-4 py-1.5 bg-primary text-white text-xs font-bold rounded-lg">Save Milestone</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: ADD TASK */}
      {showAddTaskModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-card border border-card-border rounded-2xl max-w-md w-full p-6 space-y-4 shadow-xl">
            <div className="flex items-center justify-between pb-2 border-b border-card-border">
              <h2 className="text-base font-bold text-white">Add Project Task</h2>
              <button onClick={() => setShowAddTaskModal(false)} className="text-muted hover:text-white">✕</button>
            </div>
            <form onSubmit={handleCreateTask} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-muted mb-1">Task Title *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Charge batteries & format SD cards"
                  value={newTask.title}
                  onChange={(e) => setNewTask({ ...newTask, title: e.target.value })}
                  className="w-full bg-card-border/30 border border-card-border rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-primary"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-muted mb-1">Priority</label>
                  <select
                    value={newTask.priority}
                    onChange={(e) => setNewTask({ ...newTask, priority: e.target.value as ProjectTaskPriority })}
                    className="w-full bg-card-border/30 border border-card-border rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-primary"
                  >
                    {Object.values(ProjectTaskPriority).map((pr) => (
                      <option key={pr} value={pr}>{pr}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-muted mb-1">Due Date</label>
                  <input
                    type="date"
                    value={newTask.due_date}
                    onChange={(e) => setNewTask({ ...newTask, due_date: e.target.value })}
                    className="w-full bg-card-border/30 border border-card-border rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-primary"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setShowAddTaskModal(false)} className="px-3 py-1.5 text-xs text-muted">Cancel</button>
                <button type="submit" className="px-4 py-1.5 bg-primary text-white text-xs font-bold rounded-lg">Save Task</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: LINK GALLERY */}
      {showLinkGalleryModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-card border border-card-border rounded-2xl max-w-md w-full p-6 space-y-4 shadow-xl">
            <div className="flex items-center justify-between pb-2 border-b border-card-border">
              <h2 className="text-base font-bold text-white">Link Photo Gallery</h2>
              <button onClick={() => setShowLinkGalleryModal(false)} className="text-muted hover:text-white">✕</button>
            </div>
            <form onSubmit={handleLinkGallery} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-muted mb-1">Select Gallery</label>
                <select
                  required
                  value={selectedGalleryId}
                  onChange={(e) => setSelectedGalleryId(e.target.value)}
                  className="w-full bg-card-border/30 border border-card-border rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-primary"
                >
                  <option value="">-- Choose Studio Gallery --</option>
                  {availableGalleries.map((g) => (
                    <option key={g.id} value={g.id}>{g.name}</option>
                  ))}
                </select>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="primaryGalleryCheck"
                  checked={isPrimaryGallery}
                  onChange={(e) => setIsPrimaryGallery(e.target.checked)}
                  className="rounded border-card-border"
                />
                <label htmlFor="primaryGalleryCheck" className="text-xs text-white">
                  Mark as Primary Client Gallery
                </label>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setShowLinkGalleryModal(false)} className="px-3 py-1.5 text-xs text-muted">Cancel</button>
                <button type="submit" className="px-4 py-1.5 bg-primary text-white text-xs font-bold rounded-lg">Link Gallery</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
