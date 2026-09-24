'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  CheckSquare,
  PlusCircle,
  Search,
  Filter,
  CheckCircle2,
  Clock,
  AlertCircle,
  RefreshCw,
  Trash2,
  Calendar,
  Briefcase,
  Kanban,
  List,
} from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import { OperationsNavTabs } from '@/components/dashboard/OperationsNavTabs';
import {
  ProjectTaskDTO,
  ProjectTaskStatus,
  ProjectTaskPriority,
  CreateProjectTaskDTO,
} from '@pixmatch/types';

export default function TasksPage() {
  const { token, studio } = useAuth();
  const [tasks, setTasks] = useState<ProjectTaskDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [viewMode, setViewMode] = useState<'kanban' | 'list'>('kanban');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [priorityFilter, setPriorityFilter] = useState<string>('ALL');
  const [overdueOnly, setOverdueOnly] = useState<boolean>(false);
  const [searchTerm, setSearchTerm] = useState('');

  // Modals & Projects
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [projects, setProjects] = useState<any[]>([]);
  const [newTask, setNewTask] = useState<CreateProjectTaskDTO>({
    title: '',
    description: '',
    project_id: '',
    priority: ProjectTaskPriority.MEDIUM,
    due_date: '',
  });

  const fetchTasks = async () => {
    try {
      setLoading(true);
      setError(null);
      let url = '/api/v1/operations/tasks?';
      if (statusFilter !== 'ALL') url += `&status=${statusFilter}`;
      if (priorityFilter !== 'ALL') url += `&priority=${priorityFilter}`;
      if (overdueOnly) url += `&is_overdue=true`;
      if (searchTerm) url += `&search=${encodeURIComponent(searchTerm)}`;

      const res = await fetch(url, {
        headers: {
          Authorization: `Bearer ${token}`,
          'x-studio-id': studio?.id || '',
        },
      });

      if (!res.ok) throw new Error('Failed to fetch tasks');
      const json = await res.json();
      setTasks(json.data?.tasks || json.data || []);
    } catch (err: any) {
      setError(err.message || 'Error loading tasks');
    } finally {
      setLoading(false);
    }
  };

  const fetchProjects = async () => {
    try {
      const res = await fetch('/api/v1/operations/projects?limit=50', {
        headers: {
          Authorization: `Bearer ${token}`,
          'x-studio-id': studio?.id || '',
        },
      });
      if (res.ok) {
        const json = await res.json();
        setProjects(json.data?.projects || json.data || []);
      }
    } catch (err) {
      console.error('Failed to load projects:', err);
    }
  };

  useEffect(() => {
    if (token) {
      fetchTasks();
      fetchProjects();
    }
  }, [token, studio?.id, statusFilter, priorityFilter, overdueOnly]);

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
          ...newTask,
          project_id: newTask.project_id || undefined,
          due_date: newTask.due_date || undefined,
        }),
      });

      if (!res.ok) throw new Error('Failed to create task');
      setShowCreateModal(false);
      setNewTask({
        title: '',
        description: '',
        project_id: '',
        priority: ProjectTaskPriority.MEDIUM,
        due_date: '',
      });
      fetchTasks();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleToggleComplete = async (taskId: string) => {
    try {
      const res = await fetch(`/api/v1/operations/tasks/${taskId}/complete`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'x-studio-id': studio?.id || '',
        },
      });
      if (!res.ok) throw new Error('Failed to complete task');
      fetchTasks();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleUpdateStatus = async (taskId: string, status: ProjectTaskStatus) => {
    try {
      const res = await fetch(`/api/v1/operations/tasks/${taskId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
          'x-studio-id': studio?.id || '',
        },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) throw new Error('Failed to update task status');
      fetchTasks();
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
      fetchTasks();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const getPriorityBadge = (priority: ProjectTaskPriority) => {
    switch (priority) {
      case ProjectTaskPriority.URGENT:
        return 'bg-rose-500/20 text-rose-400 border-rose-500/30';
      case ProjectTaskPriority.HIGH:
        return 'bg-amber-500/20 text-amber-400 border-amber-500/30';
      case ProjectTaskPriority.MEDIUM:
        return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
      default:
        return 'bg-card-border text-muted border-card-border';
    }
  };

  const KANBAN_COLS: { key: ProjectTaskStatus; label: string }[] = [
    { key: ProjectTaskStatus.TODO, label: 'To Do' },
    { key: ProjectTaskStatus.IN_PROGRESS, label: 'In Progress' },
    { key: ProjectTaskStatus.COMPLETED, label: 'Completed' },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2.5">
            <CheckSquare className="h-6 w-6 text-primary" />
            Studio Operations Tasks
          </h1>
          <p className="text-sm text-muted">
            Manage preparation, gear checklists, culling, editing, and client delivery tasks.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <div className="flex items-center bg-card rounded-lg border border-card-border p-0.5">
            <button
              onClick={() => setViewMode('kanban')}
              className={`p-1.5 rounded-md text-xs font-medium flex items-center gap-1 transition ${
                viewMode === 'kanban' ? 'bg-primary text-white' : 'text-muted hover:text-white'
              }`}
            >
              <Kanban className="h-4 w-4" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-1.5 rounded-md text-xs font-medium flex items-center gap-1 transition ${
                viewMode === 'list' ? 'bg-primary text-white' : 'text-muted hover:text-white'
              }`}
            >
              <List className="h-4 w-4" />
            </button>
          </div>

          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-2 px-3.5 py-2 bg-gradient-to-r from-primary to-accent hover:from-primary/90 hover:to-accent/90 text-white text-xs font-bold rounded-lg shadow-sm shadow-primary/20 transition"
          >
            <PlusCircle className="h-4 w-4" />
            Add Task
          </button>
        </div>
      </div>

      <OperationsNavTabs />

      {/* Filter Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-4 bg-card border border-card-border rounded-xl">
        <div className="relative w-full sm:w-80">
          <Search className="h-4 w-4 text-muted absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search tasks..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && fetchTasks()}
            className="w-full bg-card-border/30 border border-card-border/60 rounded-lg pl-9 pr-3 py-1.5 text-xs text-white placeholder-muted focus:outline-none focus:border-primary"
          />
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto justify-end flex-wrap">
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-muted">Priority:</span>
            <select
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value)}
              className="bg-card-border/40 border border-card-border rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-primary"
            >
              <option value="ALL">All Priorities</option>
              {Object.values(ProjectTaskPriority).map((pr) => (
                <option key={pr} value={pr}>
                  {pr}
                </option>
              ))}
            </select>
          </div>

          <label className="flex items-center gap-1.5 text-xs text-muted cursor-pointer">
            <input
              type="checkbox"
              checked={overdueOnly}
              onChange={(e) => setOverdueOnly(e.target.checked)}
              className="rounded border-card-border"
            />
            <span className="text-rose-400 font-semibold">Overdue Only</span>
          </label>

          <button
            onClick={fetchTasks}
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

      {/* Kanban Board View */}
      {viewMode === 'kanban' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {KANBAN_COLS.map((col) => {
            const colTasks = tasks.filter((t) => t.status === col.key);
            return (
              <div key={col.key} className="p-4 rounded-xl bg-card border border-card-border space-y-4">
                <div className="flex items-center justify-between pb-2 border-b border-card-border/60">
                  <h3 className="text-xs font-bold text-white uppercase tracking-wider">{col.label}</h3>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-card-border text-muted">
                    {colTasks.length}
                  </span>
                </div>

                <div className="space-y-3">
                  {colTasks.length === 0 ? (
                    <div className="py-8 text-center text-xs text-muted border border-dashed border-card-border rounded-lg">
                      No tasks in this column
                    </div>
                  ) : (
                    colTasks.map((t) => {
                      const dueDate = t.due_date || t.due_at;
                      const isOverdue = dueDate && new Date(dueDate) < new Date() && t.status !== ProjectTaskStatus.COMPLETED;
                      const projectTitle = t.project_name || t.project?.title || t.project?.name;
                      const projectId = t.project_id || t.project?.id;

                      return (
                        <div
                          key={t.id}
                          className="p-3.5 rounded-lg bg-card-border/30 border border-card-border/50 hover:border-primary/40 transition space-y-2.5"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <span
                              className={`text-xs font-semibold ${
                                t.status === ProjectTaskStatus.COMPLETED ? 'line-through text-muted' : 'text-white'
                              }`}
                            >
                              {t.title}
                            </span>
                            <span
                              className={`px-1.5 py-0.5 rounded text-[9px] font-bold uppercase border ${getPriorityBadge(
                                t.priority
                              )}`}
                            >
                              {t.priority}
                            </span>
                          </div>

                          {projectId && projectTitle && (
                            <Link
                              href={`/dashboard/operations/projects/${projectId}`}
                              className="text-[11px] text-muted hover:text-primary transition flex items-center gap-1"
                            >
                              <Briefcase className="h-3 w-3" />
                              <span className="line-clamp-1">{projectTitle}</span>
                            </Link>
                          )}

                          <div className="flex items-center justify-between pt-2 border-t border-card-border/40 text-[11px]">
                            {dueDate ? (
                              <span
                                className={`flex items-center gap-1 ${
                                  isOverdue ? 'text-rose-400 font-bold' : 'text-muted'
                                }`}
                              >
                                <Calendar className="h-3 w-3" />
                                {new Date(dueDate).toLocaleDateString()}
                              </span>
                            ) : (
                              <span className="text-muted">No deadline</span>
                            )}

                            <div className="flex items-center gap-1.5">
                              <button
                                onClick={() => handleToggleComplete(t.id)}
                                className="p-1 text-muted hover:text-emerald-400 transition"
                                title="Toggle Complete"
                              >
                                <CheckCircle2 className="h-4 w-4" />
                              </button>
                              <button
                                onClick={() => handleDeleteTask(t.id)}
                                className="p-1 text-muted hover:text-rose-400 transition"
                                title="Delete"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          </div>

                          {/* Quick Stage Mover */}
                          <div className="pt-1">
                            <select
                              value={t.status}
                              onChange={(e) =>
                                handleUpdateStatus(t.id, e.target.value as ProjectTaskStatus)
                              }
                              className="w-full bg-card-border/30 border border-card-border/60 rounded px-1.5 py-1 text-[10px] text-muted hover:text-white focus:outline-none"
                            >
                              {Object.values(ProjectTaskStatus).map((st) => (
                                <option key={st} value={st}>
                                  → {st.replace(/_/g, ' ')}
                                </option>
                              ))}
                            </select>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* List View */}
      {viewMode === 'list' && (
        <div className="bg-card border border-card-border rounded-xl overflow-hidden">
          <table className="w-full text-left text-xs">
            <thead className="bg-card-border/40 text-muted uppercase text-[10px] tracking-wider border-b border-card-border">
              <tr>
                <th className="px-4 py-3">Task</th>
                <th className="px-4 py-3">Project</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Priority</th>
                <th className="px-4 py-3">Due Date</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-card-border/40">
              {tasks.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-muted">
                    No tasks found.
                  </td>
                </tr>
              ) : (
                tasks.map((t) => {
                  const dueDate = t.due_date || t.due_at;
                  const isCompleted = t.status === ProjectTaskStatus.COMPLETED;
                  const projectTitle = t.project_name || t.project?.title || t.project?.name;
                  const projectId = t.project_id || t.project?.id;

                  return (
                    <tr key={t.id} className="hover:bg-card-border/20 transition">
                      <td className="px-4 py-3 font-semibold text-white">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleToggleComplete(t.id)}
                            className={`p-1 rounded transition ${
                              isCompleted ? 'text-emerald-400' : 'text-muted hover:text-white'
                            }`}
                          >
                            <CheckCircle2 className="h-4 w-4" />
                          </button>
                          <span className={isCompleted ? 'line-through text-muted' : 'text-white'}>
                            {t.title}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-muted">
                        {projectId && projectTitle ? (
                          <Link
                            href={`/dashboard/operations/projects/${projectId}`}
                            className="hover:text-primary transition"
                          >
                            {projectTitle}
                          </Link>
                        ) : (
                          '—'
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <select
                          value={t.status}
                          onChange={(e) => handleUpdateStatus(t.id, e.target.value as ProjectTaskStatus)}
                          className="bg-card-border/40 border border-card-border rounded px-2 py-1 text-xs text-white focus:outline-none"
                        >
                          {Object.values(ProjectTaskStatus).map((st) => (
                            <option key={st} value={st}>
                              {st.replace(/_/g, ' ')}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`px-1.5 py-0.5 rounded text-[10px] font-bold uppercase border ${getPriorityBadge(
                            t.priority
                          )}`}
                        >
                          {t.priority}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-muted">
                        {dueDate ? new Date(dueDate).toLocaleDateString() : '—'}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          onClick={() => handleDeleteTask(t.id)}
                          className="p-1 text-muted hover:text-rose-400 transition"
                        >
                          <Trash2 className="h-4 w-4 inline" />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal: Create Task */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-card border border-card-border rounded-2xl max-w-md w-full p-6 space-y-4 shadow-xl">
            <div className="flex items-center justify-between pb-2 border-b border-card-border">
              <h2 className="text-base font-bold text-white">Create Studio Task</h2>
              <button onClick={() => setShowCreateModal(false)} className="text-muted hover:text-white">
                ✕
              </button>
            </div>
            <form onSubmit={handleCreateTask} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-muted mb-1">Task Title *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Clean camera sensors & charge strobes"
                  value={newTask.title}
                  onChange={(e) => setNewTask({ ...newTask, title: e.target.value })}
                  className="w-full bg-card-border/30 border border-card-border rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-primary"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-muted mb-1">Project (Optional)</label>
                <select
                  value={newTask.project_id || ''}
                  onChange={(e) => setNewTask({ ...newTask, project_id: e.target.value })}
                  className="w-full bg-card-border/30 border border-card-border rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-primary"
                >
                  <option value="">-- General Studio Task --</option>
                  {projects.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name || p.title}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-muted mb-1">Priority</label>
                  <select
                    value={newTask.priority}
                    onChange={(e) =>
                      setNewTask({ ...newTask, priority: e.target.value as ProjectTaskPriority })
                    }
                    className="w-full bg-card-border/30 border border-card-border rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-primary"
                  >
                    {Object.values(ProjectTaskPriority).map((pr) => (
                      <option key={pr} value={pr}>
                        {pr}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-muted mb-1">Due Date</label>
                  <input
                    type="date"
                    value={(newTask.due_date as string) || (newTask.due_at as string) || ''}
                    onChange={(e) => setNewTask({ ...newTask, due_date: e.target.value, due_at: e.target.value })}
                    className="w-full bg-card-border/30 border border-card-border rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-primary"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-muted mb-1">Description</label>
                <textarea
                  rows={2}
                  placeholder="Task instructions or checklist items..."
                  value={newTask.description || ''}
                  onChange={(e) => setNewTask({ ...newTask, description: e.target.value })}
                  className="w-full bg-card-border/30 border border-card-border rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-primary"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-3 py-1.5 text-xs text-muted"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-primary text-white text-xs font-bold rounded-lg shadow-sm shadow-primary/20 transition"
                >
                  Save Task
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
