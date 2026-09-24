'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  FolderKanban,
  UserPlus,
  Briefcase,
  CheckSquare,
  Calendar,
  AlertCircle,
  Clock,
  ArrowRight,
  TrendingUp,
  CreditCard,
  MapPin,
  CheckCircle2,
  RefreshCw,
  Sparkles,
  DollarSign,
  ChevronRight,
  PlusCircle,
  FileSignature,
  FileText,
} from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import { OperationsNavTabs } from '@/components/dashboard/OperationsNavTabs';
import { StudioOperationsOverviewDTO, BookingPipelineSummaryDTO } from '@pixmatch/types';

export default function OperationsOverviewPage() {
  const { token, studio } = useAuth();
  const [loading, setLoading] = useState(true);
  const [overview, setOverview] = useState<StudioOperationsOverviewDTO | null>(null);
  const [bookingMetrics, setBookingMetrics] = useState<BookingPipelineSummaryDTO | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchOverview = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch('/api/v1/operations/overview', {
        headers: {
          Authorization: `Bearer ${token}`,
          'x-studio-id': studio?.id || '',
        },
      });

      if (!res.ok) {
        throw new Error('Failed to load operations overview');
      }

      const json = await res.json();
      setOverview(json.data || json);

      // Fetch booking metrics
      const bRes = await fetch('/api/v1/booking/metrics', {
        headers: {
          Authorization: `Bearer ${token}`,
          'x-studio-id': studio?.id || '',
        },
      });
      if (bRes.ok) {
        const bJson = await bRes.json();
        setBookingMetrics(bJson.data || null);
      }
    } catch (err: any) {
      setError(err.message || 'Error loading operations data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token) {
      fetchOverview();
    }
  }, [token, studio?.id]);

  const handleQuickCompleteTask = async (taskId: string) => {
    try {
      const res = await fetch(`/api/v1/operations/tasks/${taskId}/complete`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'x-studio-id': studio?.id || '',
        },
      });
      if (res.ok) {
        fetchOverview();
      }
    } catch (err) {
      console.error('Failed to complete task:', err);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2.5">
            <FolderKanban className="h-6 w-6 text-primary" />
            Studio Operations & Project Management
          </h1>
          <p className="text-sm text-muted">
            End-to-end management for leads, bookings, shoots, milestones, and studio workflows.
          </p>
        </div>

        <button
          onClick={fetchOverview}
          disabled={loading}
          className="self-start md:self-auto flex items-center gap-2 px-3 py-1.5 text-xs font-semibold text-muted hover:text-white bg-card hover:bg-card-border/40 border border-card-border rounded-lg transition"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* Navigation Subtabs */}
      <OperationsNavTabs />

      {error && (
        <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-sm text-red-400 flex items-center gap-2">
          <AlertCircle className="h-4 w-4" />
          {error}
        </div>
      )}

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Active Leads & Pipeline Value */}
        <div className="p-5 rounded-xl bg-card border border-card-border relative overflow-hidden group">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-muted uppercase tracking-wider">Leads Pipeline</span>
            <span className="p-2 rounded-lg bg-blue-500/10 text-blue-400">
              <UserPlus className="h-4 w-4" />
            </span>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-white">
              {loading ? '...' : overview?.leads?.active_leads ?? 0}
            </span>
            <span className="text-xs text-muted">active leads</span>
          </div>
          <div className="mt-2 text-xs text-muted flex items-center justify-between">
            <span>Pipeline: <strong className="text-white">₹{(overview?.leads?.pipeline_value || 0).toLocaleString()}</strong></span>
            <span className="text-emerald-400">{overview?.leads?.conversion_rate_percent || 0}% conv</span>
          </div>
        </div>

        {/* Active Projects */}
        <div className="p-5 rounded-xl bg-card border border-card-border relative overflow-hidden group">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-muted uppercase tracking-wider">Active Projects</span>
            <span className="p-2 rounded-lg bg-purple-500/10 text-purple-400">
              <Briefcase className="h-4 w-4" />
            </span>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-white">
              {loading ? '...' : overview?.projects?.active_projects ?? 0}
            </span>
            <span className="text-xs text-muted">in progress</span>
          </div>
          <div className="mt-2 text-xs text-muted flex items-center justify-between">
            <span>Total: <strong className="text-white">{overview?.projects?.total_projects || 0}</strong></span>
            <span className="text-purple-300">{overview?.projects?.shoots_next_7_days || 0} shoots this wk</span>
          </div>
        </div>

        {/* Upcoming Shoots */}
        <div className="p-5 rounded-xl bg-card border border-card-border relative overflow-hidden group">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-muted uppercase tracking-wider">Shoots (30 Days)</span>
            <span className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400">
              <Calendar className="h-4 w-4" />
            </span>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-white">
              {loading ? '...' : overview?.projects?.shoots_next_30_days ?? 0}
            </span>
            <span className="text-xs text-muted">booked shoots</span>
          </div>
          <div className="mt-2 text-xs text-emerald-400 flex items-center gap-1">
            <TrendingUp className="h-3 w-3" />
            <span>Next 7 days: {overview?.projects?.shoots_next_7_days || 0}</span>
          </div>
        </div>

        {/* Pending & Overdue Tasks */}
        <div className="p-5 rounded-xl bg-card border border-card-border relative overflow-hidden group">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-muted uppercase tracking-wider">Operational Tasks</span>
            <span className="p-2 rounded-lg bg-amber-500/10 text-amber-400">
              <CheckSquare className="h-4 w-4" />
            </span>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-white">
              {loading ? '...' : overview?.tasks?.pending_tasks ?? 0}
            </span>
            <span className="text-xs text-muted">pending</span>
          </div>
          <div className="mt-2 text-xs flex items-center justify-between">
            <span className={overview?.tasks?.overdue_tasks ? 'text-rose-400 font-semibold flex items-center gap-1' : 'text-muted'}>
              {overview?.tasks?.overdue_tasks ? <AlertCircle className="h-3 w-3" /> : null}
              {overview?.tasks?.overdue_tasks || 0} overdue
            </span>
            <span className="text-emerald-400">{overview?.tasks?.tasks_completed_this_month || 0} done this mo</span>
          </div>
        </div>
      </div>

      {/* Financial Health Banner */}
      <div className="p-5 rounded-xl bg-gradient-to-r from-card via-card to-card-border/30 border border-card-border flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-primary/10 rounded-xl text-primary border border-primary/20">
            <DollarSign className="h-6 w-6" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-white">Project Financial Health</h3>
            <p className="text-xs text-muted">Auto-synchronized with studio business transactions and client invoices</p>
          </div>
        </div>

        <div className="flex items-center gap-6 flex-wrap">
          <div>
            <span className="text-[10px] text-muted uppercase tracking-wider font-semibold">Total Booked</span>
            <div className="text-base font-bold text-white">₹{(overview?.financials?.total_booked_value || 0).toLocaleString()}</div>
          </div>
          <div className="h-8 w-px bg-card-border hidden sm:block" />
          <div>
            <span className="text-[10px] text-muted uppercase tracking-wider font-semibold">Collected</span>
            <div className="text-base font-bold text-emerald-400">₹{(overview?.financials?.total_collected_revenue || 0).toLocaleString()}</div>
          </div>
          <div className="h-8 w-px bg-card-border hidden sm:block" />
          <div>
            <span className="text-[10px] text-muted uppercase tracking-wider font-semibold">Outstanding Balance</span>
            <div className="text-base font-bold text-amber-400">₹{(overview?.financials?.total_outstanding_balance || 0).toLocaleString()}</div>
          </div>
        </div>
      </div>

      {/* Booking & Proposal Pipeline Widget (Phase 21) */}
      <div className="p-6 rounded-2xl bg-card border border-card-border space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-accent" />
              Proposals, Contracts & Booking Conversion Pipeline
            </h3>
            <p className="text-xs text-muted">
              Live funnel from initial client quotes through digital signature to confirmed studio shoots.
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            <Link
              href="/dashboard/operations/proposals/new"
              className="px-3 py-1.5 bg-primary/10 hover:bg-primary/20 text-primary border border-primary/20 text-xs font-bold rounded-lg transition flex items-center gap-1.5"
            >
              <FileText className="h-3.5 w-3.5" /> + New Proposal
            </Link>
            <Link
              href="/dashboard/operations/contracts/new"
              className="px-3 py-1.5 bg-card hover:bg-card-border text-white border border-card-border text-xs font-bold rounded-lg transition flex items-center gap-1.5"
            >
              <FileSignature className="h-3.5 w-3.5" /> + Draft Contract
            </Link>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="p-4 rounded-xl bg-card-border/20 border border-card-border/40 space-y-1">
            <span className="text-xs text-muted font-medium">Active Proposals</span>
            <div className="text-xl font-bold text-white">
              {bookingMetrics?.active_proposals || 0}
            </div>
            <p className="text-[11px] text-primary font-medium">
              ${(bookingMetrics?.total_proposal_value || 0).toLocaleString()} quoted
            </p>
          </div>

          <div className="p-4 rounded-xl bg-card-border/20 border border-card-border/40 space-y-1">
            <span className="text-xs text-muted font-medium">Pending Contracts</span>
            <div className="text-xl font-bold text-amber-400">
              {bookingMetrics?.pending_contracts || 0}
            </div>
            <p className="text-[11px] text-emerald-400 font-medium">
              ${(bookingMetrics?.total_contract_value || 0).toLocaleString()} contract value
            </p>
          </div>

          <div className="p-4 rounded-xl bg-card-border/20 border border-card-border/40 space-y-1">
            <span className="text-xs text-muted font-medium">Confirmed Bookings</span>
            <div className="text-xl font-bold text-emerald-400">
              {bookingMetrics?.confirmed_bookings || 0}
            </div>
            <p className="text-[11px] text-muted">
              From {bookingMetrics?.total_leads || 0} total leads
            </p>
          </div>

          <div className="p-4 rounded-xl bg-card-border/20 border border-card-border/40 space-y-1">
            <span className="text-xs text-muted font-medium">Funnel Conversion Rate</span>
            <div className="text-xl font-bold text-accent">
              {bookingMetrics?.conversion_rate_pct || 0}%
            </div>
            <p className="text-[11px] text-muted">Proposal-to-booking efficiency</p>
          </div>
        </div>
      </div>

      {/* Two Column Layout: Upcoming Shoots & Urgent Tasks */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Upcoming Shoots */}
        <div className="p-5 rounded-xl bg-card border border-card-border space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-white flex items-center gap-2">
              <Calendar className="h-4 w-4 text-primary" />
              Upcoming Shoots
            </h3>
            <Link
              href="/dashboard/operations/calendar"
              className="text-xs text-primary hover:underline flex items-center gap-1 font-medium"
            >
              View Calendar <ChevronRight className="h-3 w-3" />
            </Link>
          </div>

          {loading ? (
            <div className="py-8 text-center text-xs text-muted">Loading upcoming shoots...</div>
          ) : !overview?.upcoming_shoots?.length ? (
            <div className="py-8 text-center text-xs text-muted border border-dashed border-card-border rounded-lg">
              No upcoming shoots scheduled. Book a new project to start scheduling shoots!
            </div>
          ) : (
            <div className="space-y-2.5">
              {overview.upcoming_shoots.map((shoot: any) => {
                const date = new Date(shoot.shoot_date);
                return (
                  <Link
                    key={shoot.id}
                    href={`/dashboard/operations/projects/${shoot.id}`}
                    className="p-3.5 rounded-lg bg-card-border/30 hover:bg-card-border/60 border border-card-border/50 flex items-center justify-between transition group"
                  >
                    <div className="space-y-1">
                      <div className="text-xs font-semibold text-white group-hover:text-primary transition">
                        {shoot.title || shoot.name || shoot.project_name}
                      </div>
                      <div className="text-[11px] text-muted flex items-center gap-3">
                        <span>Client: <strong className="text-muted-foreground">{shoot.client_name}</strong></span>
                        {(shoot.shoot_location || shoot.location) && (
                          <span className="flex items-center gap-1">
                            <MapPin className="h-3 w-3 text-muted" />
                            {shoot.shoot_location || shoot.location}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="text-right">
                      <div className="text-xs font-semibold text-white">
                        {date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                      </div>
                      <div className="text-[10px] text-muted">
                        {date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </div>

        {/* Urgent & Overdue Tasks */}
        <div className="p-5 rounded-xl bg-card border border-card-border space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-white flex items-center gap-2">
              <CheckSquare className="h-4 w-4 text-amber-400" />
              Urgent & Pending Tasks
            </h3>
            <Link
              href="/dashboard/operations/tasks"
              className="text-xs text-primary hover:underline flex items-center gap-1 font-medium"
            >
              All Tasks <ChevronRight className="h-3 w-3" />
            </Link>
          </div>

          {loading ? (
            <div className="py-8 text-center text-xs text-muted">Loading operational tasks...</div>
          ) : !overview?.urgent_tasks?.length ? (
            <div className="py-8 text-center text-xs text-muted border border-dashed border-card-border rounded-lg">
              All caught up! No urgent or overdue tasks at the moment.
            </div>
          ) : (
            <div className="space-y-2.5">
              {overview.urgent_tasks.map((task: any) => (
                <div
                  key={task.id}
                  className="p-3.5 rounded-lg bg-card-border/30 hover:bg-card-border/60 border border-card-border/50 flex items-center justify-between transition"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold text-white">{task.title}</span>
                      {task.is_overdue && (
                        <span className="px-1.5 py-0.5 rounded text-[9px] font-bold uppercase bg-rose-500/20 text-rose-400 border border-rose-500/30">
                          Overdue
                        </span>
                      )}
                      <span className="px-1.5 py-0.5 rounded text-[9px] font-medium uppercase bg-card-border text-muted">
                        {task.priority}
                      </span>
                    </div>
                    {task.project_title && (
                      <div className="text-[11px] text-muted">
                        Project: <span className="text-muted-foreground">{task.project_title}</span>
                      </div>
                    )}
                  </div>

                  <button
                    onClick={() => handleQuickCompleteTask(task.id)}
                    className="p-1.5 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/20 text-xs flex items-center gap-1 transition"
                    title="Mark Done"
                  >
                    <CheckCircle2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Recent Leads & Quick Actions */}
      <div className="p-5 rounded-xl bg-card border border-card-border space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-white flex items-center gap-2">
            <UserPlus className="h-4 w-4 text-blue-400" />
            Recent Inquiries & Leads
          </h3>
          <Link
            href="/dashboard/operations/leads"
            className="text-xs text-primary hover:underline flex items-center gap-1 font-medium"
          >
            Open Leads Pipeline <ArrowRight className="h-3 w-3" />
          </Link>
        </div>

        {loading ? (
          <div className="py-6 text-center text-xs text-muted">Loading inquiries...</div>
        ) : !overview?.recent_leads?.length ? (
          <div className="py-8 text-center text-xs text-muted border border-dashed border-card-border rounded-lg">
            No inquiries recorded yet. Click &quot;New Inquiry&quot; to add your first studio lead.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {overview.recent_leads.map((lead: any) => (
              <div
                key={lead.id}
                className="p-3.5 rounded-lg bg-card-border/30 border border-card-border/50 flex flex-col justify-between gap-2"
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-white">{lead.name}</span>
                    <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-blue-500/10 text-blue-400 border border-blue-500/20">
                      {lead.status.replace(/_/g, ' ')}
                    </span>
                  </div>
                  <div className="text-[11px] text-muted mt-1">
                    Type: <span className="text-muted-foreground">{lead.project_type}</span>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-card-border/40 text-[11px]">
                  <span className="text-muted">Est. ₹{(lead.estimated_value || 0).toLocaleString()}</span>
                  <Link
                    href={`/dashboard/operations/leads?leadId=${lead.id}`}
                    className="text-primary hover:underline font-medium"
                  >
                    View Lead →
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
