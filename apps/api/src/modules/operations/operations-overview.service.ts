/**
 * Operations Overview Service — PixMatch AI Phase 20
 * Computes executive KPI metrics, upcoming shoots, urgent tasks, and pipeline health for studio operations.
 */

import { prisma } from '@pixmatch/database';
import { StudioLeadStatus, StudioProjectStatus, ProjectTaskStatus, StudioOperationsOverviewDTO } from '@pixmatch/types';

export class OperationsOverviewService {
  /**
   * Compute comprehensive studio operations overview
   */
  static async getOverview(studioId: string): Promise<StudioOperationsOverviewDTO> {
    const now = new Date();
    const in7Days = new Date(now.getTime() + 7 * 86400000);
    const in30Days = new Date(now.getTime() + 30 * 86400000);
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    // 1. Leads Metrics
    const allLeads = await prisma.studioLead.findMany({
      where: { studio_id: studioId, deleted_at: null },
      select: {
        id: true,
        status: true,
        estimated_value: true,
        name: true,
        service_type: true,
        created_at: true,
        next_follow_up_at: true,
      },
    });

    const totalLeads = allLeads.length;
    const activeLeads = allLeads.filter(
      (l: any) =>
        l.status !== StudioLeadStatus.WON &&
        l.status !== StudioLeadStatus.ARCHIVED &&
        l.status !== StudioLeadStatus.LOST
    );
    const convertedLeads = allLeads.filter((l: any) => l.status === StudioLeadStatus.WON);
    const conversionRate = totalLeads > 0 ? (convertedLeads.length / totalLeads) * 100 : 0;
    const pipelineValue = activeLeads.reduce((sum: number, l: any) => sum + (l.estimated_value || 0), 0);

    // Leads by status
    const leadsByStatus: Record<string, number> = {};
    for (const status of Object.values(StudioLeadStatus)) {
      leadsByStatus[status] = allLeads.filter((l: any) => l.status === status).length;
    }

    // 2. Projects Metrics
    const allProjects = await prisma.studioProject.findMany({
      where: { studio_id: studioId, deleted_at: null },
      include: {
        client: { select: { id: true, name: true, email: true } },
      },
      orderBy: { created_at: 'desc' },
    });

    const totalProjects = allProjects.length;
    const activeProjects = allProjects.filter(
      (p: any) =>
        p.status !== StudioProjectStatus.COMPLETED &&
        p.status !== StudioProjectStatus.CANCELLED
    );

    const shootsNext7Days = allProjects.filter(
      (p: any) => p.shoot_date && p.shoot_date >= now && p.shoot_date <= in7Days
    ).length;

    const shootsNext30Days = allProjects.filter(
      (p: any) => p.shoot_date && p.shoot_date >= now && p.shoot_date <= in30Days
    ).length;

    const projectsByStatus: Record<string, number> = {};
    for (const status of Object.values(StudioProjectStatus)) {
      projectsByStatus[status] = allProjects.filter((p: any) => p.status === status).length;
    }

    // Financial calculations from projects
    const totalBookedValue = allProjects.reduce((sum: number, p: any) => sum + (p.estimated_value || 0), 0);
    const totalCollectedRevenue = 0; // Aggregated from transactions if needed
    const totalOutstandingBalance = totalBookedValue - totalCollectedRevenue;

    // 3. Tasks Metrics
    const allTasks = await prisma.projectTask.findMany({
      where: { studio_id: studioId },
      include: {
        project: { select: { id: true, name: true } },
      },
    });

    const pendingTasks = allTasks.filter(
      (t: any) => t.status === ProjectTaskStatus.TODO || t.status === ProjectTaskStatus.IN_PROGRESS
    );

    const overdueTasks = pendingTasks.filter((t: any) => t.due_at && t.due_at < now);

    const tasksCompletedThisMonth = allTasks.filter(
      (t: any) => t.status === ProjectTaskStatus.COMPLETED && t.completed_at && t.completed_at >= startOfMonth
    ).length;

    // 4. Upcoming Shoots list (next 5)
    const upcomingShoots = allProjects
      .filter((p: any) => p.shoot_date && p.shoot_date >= now)
      .sort((a: any, b: any) => (a.shoot_date?.getTime() || 0) - (b.shoot_date?.getTime() || 0))
      .slice(0, 5)
      .map((p: any) => ({
        id: p.id,
        project_id: p.id,
        project_name: p.name,
        title: p.name,
        client_name: p.client?.name || 'Unknown',
        project_type: p.project_type,
        shoot_date: p.shoot_date ? p.shoot_date.toISOString() : new Date().toISOString(),
        shoot_location: p.location || undefined,
        location: p.location || undefined,
        status: p.status,
      }));

    // 5. Urgent Tasks list (overdue or high priority pending)
    const urgentTasks = pendingTasks
      .sort((a: any, b: any) => {
        if (a.due_at && b.due_at) return a.due_at.getTime() - b.due_at.getTime();
        if (a.due_at) return -1;
        if (b.due_at) return 1;
        return 0;
      })
      .slice(0, 5)
      .map((t: any) => ({
        id: t.id,
        title: t.title,
        project_title: t.project?.name,
        due_date: t.due_at?.toISOString() || null,
        priority: t.priority,
        status: t.status,
        is_overdue: !!(t.due_at && t.due_at < now),
      }));

    // 6. Recent Leads (latest 5)
    const recentLeads = allLeads.slice(0, 5).map((l: any) => ({
      id: l.id,
      name: l.name,
      project_type: (l.service_type as any) || undefined,
      service_type: l.service_type || undefined,
      status: l.status,
      estimated_value: l.estimated_value || 0,
      next_follow_up_date: l.next_follow_up_at?.toISOString() || null,
    }));

    return {
      leads: {
        total_leads: totalLeads,
        active_leads: activeLeads.length,
        converted_leads: convertedLeads.length,
        conversion_rate_percent: Math.round(conversionRate * 10) / 10,
        pipeline_value: pipelineValue,
        leads_by_status: leadsByStatus,
      },
      projects: {
        total_projects: totalProjects,
        active_projects: activeProjects.length,
        shoots_next_7_days: shootsNext7Days,
        shoots_next_30_days: shootsNext30Days,
        projects_by_status: projectsByStatus,
      },
      tasks: {
        pending_tasks: pendingTasks.length,
        overdue_tasks: overdueTasks.length,
        tasks_completed_this_month: tasksCompletedThisMonth,
      },
      financials: {
        total_booked_value: totalBookedValue,
        total_collected_revenue: totalCollectedRevenue,
        total_outstanding_balance: totalOutstandingBalance,
        currency: 'INR',
      },
      upcoming_shoots: upcomingShoots as any,
      urgent_tasks: urgentTasks,
      recent_leads: recentLeads as any,
    };
  }
}
