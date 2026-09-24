'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  FolderKanban,
  Search,
  Filter,
  Calendar,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Flame,
  ArrowRight,
  RefreshCw,
  Camera,
  Layers,
  ChevronRight,
  ShieldAlert,
  Sparkles,
  Users,
  Activity,
} from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import { OperationsNavTabs } from '@/components/dashboard/OperationsNavTabs';
import {
  ProductionStage,
  ProductionHealthStatus,
  StudioProjectType,
  ProductionKanbanBoardDTO,
  ProductionSummaryDTO,
  ProjectProductionDTO,
} from '@pixmatch/types';

const STAGE_CONFIG: Record<ProductionStage, { label: string; color: string; border: string; bg: string }> = {
  [ProductionStage.PRE_PRODUCTION]: {
    label: 'Pre-Production',
    color: 'text-sky-400',
    border: 'border-sky-500/30',
    bg: 'bg-sky-500/10',
  },
  [ProductionStage.READY_FOR_SHOOT]: {
    label: 'Ready For Shoot',
    color: 'text-indigo-400',
    border: 'border-indigo-500/30',
    bg: 'bg-indigo-500/10',
  },
  [ProductionStage.SHOOT_IN_PROGRESS]: {
    label: 'Shoot In Progress',
    color: 'text-amber-400',
    border: 'border-amber-500/30',
    bg: 'bg-amber-500/10',
  },
  [ProductionStage.SHOOT_COMPLETED]: {
    label: 'Shoot Completed',
    color: 'text-emerald-400',
    border: 'border-emerald-500/30',
    bg: 'bg-emerald-500/10',
  },
  [ProductionStage.MEDIA_INGESTION]: {
    label: 'Media Ingestion',
    color: 'text-purple-400',
    border: 'border-purple-500/30',
    bg: 'bg-purple-500/10',
  },
  [ProductionStage.CULLING]: {
    label: 'Culling & Selection',
    color: 'text-pink-400',
    border: 'border-pink-500/30',
    bg: 'bg-pink-500/10',
  },
  [ProductionStage.EDITING]: {
    label: 'Color & Retouching',
    color: 'text-blue-400',
    border: 'border-blue-500/30',
    bg: 'bg-blue-500/10',
  },
  [ProductionStage.AI_PROCESSING]: {
    label: 'AI Indexing & Processing',
    color: 'text-cyan-400',
    border: 'border-cyan-500/30',
    bg: 'bg-cyan-500/10',
  },
  [ProductionStage.GALLERY_PREPARATION]: {
    label: 'Gallery Prep',
    color: 'text-orange-400',
    border: 'border-orange-500/30',
    bg: 'bg-orange-500/10',
  },
  [ProductionStage.READY_FOR_GALLERY]: {
    label: 'Ready For Gallery',
    color: 'text-teal-400',
    border: 'border-teal-500/30',
    bg: 'bg-teal-500/10',
  },
  [ProductionStage.COMPLETED]: {
    label: 'Delivered & Complete',
    color: 'text-emerald-300',
    border: 'border-emerald-500/30',
    bg: 'bg-emerald-500/10',
  },
  [ProductionStage.ON_HOLD]: {
    label: 'On Hold',
    color: 'text-amber-300',
    border: 'border-amber-500/30',
    bg: 'bg-amber-500/10',
  },
  [ProductionStage.CANCELLED]: {
    label: 'Cancelled',
    color: 'text-red-400',
    border: 'border-red-500/30',
    bg: 'bg-red-500/10',
  },
};

export default function ProductionKanbanPage() {
  const { token, studio } = useAuth();
  const [board, setBoard] = useState<ProductionKanbanBoardDTO | null>(null);
  const [summary, setSummary] = useState<ProductionSummaryDTO | null>(null);
  const [loading, setLoading] = useState(true);
  const [transitioningId, setTransitioningId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('ALL');
  const [healthFilter, setHealthFilter] = useState<string>('ALL');

  const fetchKanban = async () => {
    try {
      setLoading(true);
      setError(null);

      const [kanbanRes, summaryRes] = await Promise.all([
        fetch('/api/v1/operations/production/kanban', {
          headers: {
            Authorization: `Bearer ${token}`,
            'x-studio-id': studio?.id || '',
          },
        }),
        fetch('/api/v1/operations/production/summary', {
          headers: {
            Authorization: `Bearer ${token}`,
            'x-studio-id': studio?.id || '',
          },
        }),
      ]);

      if (kanbanRes.ok) {
        const kJson = await kanbanRes.json();
        setBoard(kJson.data || null);
      }
      if (summaryRes.ok) {
        const sJson = await summaryRes.json();
        setSummary(sJson.data || null);
      }
    } catch (err: any) {
      setError(err.message || 'Error fetching production board');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token) {
      fetchKanban();
    }
  }, [token, studio?.id]);

  const handleStageTransition = async (projectId: string, nextStage: ProductionStage) => {
    try {
      setTransitioningId(projectId);
      const res = await fetch(`/api/v1/operations/production/projects/${projectId}/stage`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
          'x-studio-id': studio?.id || '',
        },
        body: JSON.stringify({
          stage: nextStage,
          notes: `Stage transitioned via Operations Kanban Board`,
        }),
      });

      if (!res.ok) {
        const errJson = await res.json();
        throw new Error(errJson.message || 'Failed to update production stage');
      }

      await fetchKanban();
    } catch (err: any) {
      alert(`Error updating stage: ${err.message}`);
    } finally {
      setTransitioningId(null);
    }
  };

  const getHealthBadge = (score: number, status: string) => {
    if (score >= 80) {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
          <Activity className="h-3 w-3" /> {score}% Excellent
        </span>
      );
    }
    if (score >= 50) {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
          <AlertTriangle className="h-3 w-3" /> {score}% Moderate
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-500/20 text-red-300 border border-red-500/30">
        <Flame className="h-3 w-3" /> {score}% At Risk
      </span>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header Navigation */}
      <OperationsNavTabs />

      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2.5">
            <FolderKanban className="h-7 w-7 text-primary" />
            Studio Production & Shoot Management
          </h1>
          <p className="text-xs text-muted mt-1">
            End-to-end operational pipeline from booked contracts through shoot day, ingestion, editing, and gallery delivery.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={fetchKanban}
            disabled={loading}
            className="flex items-center gap-2 px-3.5 py-2 rounded-lg bg-card-border/60 hover:bg-card-border text-white text-xs font-semibold border border-card-border transition-all"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
            Refresh Board
          </button>
        </div>
      </div>

      {/* KPI / Summary Highlights */}
      {summary && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-[#0E1422] border border-card-border rounded-xl p-4 space-y-1">
            <span className="text-[11px] font-medium text-muted uppercase tracking-wider">In Production</span>
            <div className="flex items-baseline justify-between">
              <span className="text-2xl font-black text-white">{summary.total_productions}</span>
              <Camera className="h-5 w-5 text-primary" />
            </div>
            <p className="text-[10px] text-muted">Active projects in lifecycle</p>
          </div>

          <div className="bg-[#0E1422] border border-card-border rounded-xl p-4 space-y-1">
            <span className="text-[11px] font-medium text-muted uppercase tracking-wider">Shoots Today</span>
            <div className="flex items-baseline justify-between">
              <span className="text-2xl font-black text-amber-400">{summary.shoots_today}</span>
              <Calendar className="h-5 w-5 text-amber-400" />
            </div>
            <p className="text-[10px] text-muted">Live shoot sessions scheduled</p>
          </div>

          <div className="bg-[#0E1422] border border-card-border rounded-xl p-4 space-y-1">
            <span className="text-[11px] font-medium text-muted uppercase tracking-wider">Turnaround At Risk</span>
            <div className="flex items-baseline justify-between">
              <span className="text-2xl font-black text-red-400">{summary.overdue_deadlines_count}</span>
              <ShieldAlert className="h-5 w-5 text-red-400" />
            </div>
            <p className="text-[10px] text-muted">Projects requiring expedited editing</p>
          </div>

          <div className="bg-[#0E1422] border border-card-border rounded-xl p-4 space-y-1">
            <span className="text-[11px] font-medium text-muted uppercase tracking-wider">Avg Health Score</span>
            <div className="flex items-baseline justify-between">
              <span className="text-2xl font-black text-emerald-400">{summary.average_health_score}%</span>
              <Clock className="h-5 w-5 text-emerald-400" />
            </div>
            <p className="text-[10px] text-muted">Studio production quality score</p>
          </div>
        </div>
      )}

      {/* Filter Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-[#0E1422] p-3 rounded-xl border border-card-border">
        <div className="flex items-center gap-2 flex-1 min-w-[240px]">
          <Search className="h-4 w-4 text-muted" />
          <input
            type="text"
            placeholder="Search projects, clients, or shoot locations..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="bg-transparent text-xs text-white placeholder-muted focus:outline-none w-full"
          />
        </div>

        <div className="flex items-center gap-2">
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="bg-card-border/40 border border-card-border text-xs text-white rounded-lg px-2.5 py-1.5 focus:outline-none"
          >
            <option value="ALL">All Shoot Types</option>
            {Object.values(StudioProjectType).map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>

          <select
            value={healthFilter}
            onChange={(e) => setHealthFilter(e.target.value)}
            className="bg-card-border/40 border border-card-border text-xs text-white rounded-lg px-2.5 py-1.5 focus:outline-none"
          >
            <option value="ALL">All Health Scores</option>
            <option value="HEALTHY">Healthy (&gt;= 80)</option>
            <option value="MODERATE">Moderate (50-79)</option>
            <option value="AT_RISK">At Risk (&lt; 50)</option>
          </select>
        </div>
      </div>

      {/* Kanban Board Columns */}
      <div className="overflow-x-auto pb-4 scrollbar-thin">
        <div className="flex items-start gap-4 min-w-[1900px]">
          {Object.values(ProductionStage).map((stage) => {
            const projects = board?.columns?.[stage] || [];
            const config = STAGE_CONFIG[stage] || {
              label: stage,
              color: 'text-white',
              border: 'border-card-border',
              bg: 'bg-card-border/20',
            };

            const filteredProjects = projects.filter((p: ProjectProductionDTO) => {
              if (typeFilter !== 'ALL' && p.shoot_type !== typeFilter) return false;
              if (healthFilter === 'HEALTHY' && (p.production_health_score || 0) < 80) return false;
              if (
                healthFilter === 'MODERATE' &&
                ((p.production_health_score || 0) < 50 || (p.production_health_score || 0) >= 80)
              )
                return false;
              if (healthFilter === 'AT_RISK' && (p.production_health_score || 0) >= 50) return false;
              if (searchTerm) {
                const term = searchTerm.toLowerCase();
                const titleMatch = (p.project?.name || '').toLowerCase().includes(term);
                const clientMatch = (p.project?.client?.name || '').toLowerCase().includes(term);
                if (!titleMatch && !clientMatch) return false;
              }
              return true;
            });

            return (
              <div
                key={stage}
                className="w-72 flex-shrink-0 bg-[#0A0E18] border border-card-border/80 rounded-xl flex flex-col max-h-[750px]"
              >
                {/* Column Header */}
                <div className={`p-3 border-b ${config.border} ${config.bg} rounded-t-xl flex items-center justify-between`}>
                  <div className="flex items-center gap-2">
                    <span className={`text-xs font-bold ${config.color}`}>{config.label}</span>
                  </div>
                  <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-black/40 text-white">
                    {filteredProjects.length}
                  </span>
                </div>

                {/* Column Cards */}
                <div className="p-2.5 space-y-2.5 overflow-y-auto flex-1">
                  {filteredProjects.length === 0 ? (
                    <div className="text-center py-8 text-[11px] text-muted border border-dashed border-card-border/50 rounded-lg">
                      No projects in this stage
                    </div>
                  ) : (
                    filteredProjects.map((project) => (
                      <div
                        key={project.id}
                        className="bg-[#111726] border border-card-border hover:border-primary/50 transition-all rounded-xl p-3.5 space-y-2.5 shadow-sm group"
                      >
                        {/* Title & Shoot Type */}
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <Link
                              href={`/dashboard/operations/projects/${project.project_id}/production`}
                              className="text-xs font-bold text-white group-hover:text-primary transition line-clamp-1"
                            >
                              {project.project?.name || 'Studio Project'}
                            </Link>
                            <p className="text-[10px] text-muted truncate">
                              {project.project?.client?.name || 'Direct Booking'}
                            </p>
                          </div>
                          <span className="text-[9px] font-semibold uppercase px-1.5 py-0.5 rounded bg-card-border text-muted">
                            {project.shoot_type || 'STANDARD'}
                          </span>
                        </div>

                        {/* Health Badge & Deadlines */}
                        <div className="flex items-center justify-between gap-2 pt-1 border-t border-card-border/40">
                          {getHealthBadge(project.production_health_score || 85, project.production_health_status || 'EXCELLENT')}
                          {project.delivery_target_date &&
                            new Date(project.delivery_target_date) < new Date() &&
                            project.production_stage !== ProductionStage.COMPLETED && (
                              <span className="text-[10px] font-bold text-red-400 flex items-center gap-0.5">
                                <Clock className="h-3 w-3" /> Overdue
                              </span>
                            )}
                        </div>

                        {/* Shoot Info / Sessions */}
                        <div className="text-[10px] text-muted space-y-1">
                          <div className="flex items-center gap-1.5">
                            <Calendar className="h-3 w-3 text-primary" />
                            <span>
                              {project.shoot_start_at
                                ? new Date(project.shoot_start_at).toLocaleDateString(undefined, {
                                    month: 'short',
                                    day: 'numeric',
                                    hour: '2-digit',
                                    minute: '2-digit',
                                  })
                                : 'No date set'}
                            </span>
                          </div>
                          {project.location && (
                            <div className="truncate text-muted/80">📍 {project.location}</div>
                          )}
                        </div>

                        {/* Stage Progress Actions & Links */}
                        <div className="pt-2 border-t border-card-border/60 flex items-center justify-between gap-1.5">
                          <Link
                            href={`/dashboard/operations/projects/${project.project_id}/shoot`}
                            className="flex items-center gap-1 text-[10px] font-bold text-amber-400 hover:text-amber-300 transition"
                            title="Open Shoot-Day Workspace"
                          >
                            <Camera className="h-3 w-3" /> Shoot Day
                          </Link>

                          <div className="flex items-center gap-1">
                            <select
                              value={project.production_stage}
                              onChange={(e) =>
                                handleStageTransition(project.project_id, e.target.value as ProductionStage)
                              }
                              disabled={transitioningId === project.project_id}
                              className="text-[9px] bg-card-border/80 text-white rounded px-1.5 py-1 border border-card-border focus:outline-none"
                            >
                              {Object.values(ProductionStage).map((st) => (
                                <option key={st} value={st}>
                                  → {STAGE_CONFIG[st]?.label || st}
                                </option>
                              ))}
                            </select>

                            <Link
                              href={`/dashboard/operations/projects/${project.project_id}/production`}
                              className="p-1 rounded hover:bg-card-border text-muted hover:text-white transition"
                              title="Full Production Workspace"
                            >
                              <ChevronRight className="h-3.5 w-3.5" />
                            </Link>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
