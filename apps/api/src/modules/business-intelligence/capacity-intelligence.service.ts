/**
 * Team Capacity Intelligence Service — PIXMatch AI Phase 38
 *
 * Deterministic Workforce Capacity & Workload Forecasting:
 * - Available capacity, Allocated capacity, Utilization (bps)
 * - Workload horizons: 7, 14, 30, 60 days
 * - Overload detection & Capacity risk flags
 * - STRICT POLICY: NO individual employee rankings, best/worst scores, or value sorting.
 */

import {
  IBiTeamCapacityMetricsDTO,
  IBiCapacityHorizonDTO,
} from '@pixmatch/types';

export interface ICapacityRawInput {
  total_active_members: number;
  assigned_tasks_count: number;
  overdue_tasks_count: number;
  active_projects_count: number;
  shoot_sessions_count: number;
  estimated_task_hours: number;
  scheduled_shoot_hours: number;
  leave_hours_next_30d: number;
  standard_daily_hours_per_member?: number; // default 8
}

export class CapacityIntelligenceService {
  private static readonly HORIZONS: Array<{ days: 7 | 14 | 30 | 60; label: string }> = [
    { days: 7, label: '7-Day Capacity Outlook' },
    { days: 14, label: '14-Day Capacity Outlook' },
    { days: 30, label: '30-Day Capacity Outlook' },
    { days: 60, label: '60-Day Capacity Outlook' },
  ];

  /**
   * Calculate aggregate studio capacity and multi-horizon workload projections.
   */
  public static calculateCapacityMetrics(input: ICapacityRawInput): IBiTeamCapacityMetricsDTO {
    const total_members = Math.max(0, input.total_active_members || 0);
    const dailyHours = input.standard_daily_hours_per_member ?? 8;
    const workDaysIn30d = 22; // ~22 working days per month

    // Total monthly available capacity
    const rawAvailable30d = total_members * workDaysIn30d * dailyHours;
    const leaveHours = Math.max(0, input.leave_hours_next_30d || 0);
    const available_capacity_hours = Math.max(0, rawAvailable30d - leaveHours);

    // Total monthly allocated capacity
    const shootHours = Math.max(0, input.scheduled_shoot_hours || 0);
    const taskHours = Math.max(0, input.estimated_task_hours || 0);
    const allocated_capacity_hours = shootHours + taskHours;

    // Utilization calculation in basis points (10000 bps = 100%)
    const capacity_utilization_bps =
      available_capacity_hours > 0
        ? Math.round((allocated_capacity_hours / available_capacity_hours) * 10000)
        : 0;

    const overload_risk = capacity_utilization_bps > 9000; // > 90% utilization

    // Multi-horizon capacity forecast
    const capacity_forecast: IBiCapacityHorizonDTO[] = [];

    for (const h of CapacityIntelligenceService.HORIZONS) {
      const days = h.days;
      const workDays = Math.round((days * 5) / 7); // working days ratio (5/7)
      const horizonLeave = Math.round((leaveHours * days) / 30);
      const horizonAvailable = Math.max(0, total_members * workDays * dailyHours - horizonLeave);

      // Prorated workload for horizon
      const horizonAllocated = Math.round((allocated_capacity_hours * days) / 30);
      const horizonUtilBps =
        horizonAvailable > 0 ? Math.round((horizonAllocated / horizonAvailable) * 10000) : 0;

      const capacity_risk = horizonUtilBps > 9000;
      const overload_periods_count = horizonUtilBps > 10000 ? Math.ceil((days * (horizonUtilBps - 10000)) / 10000) : 0;

      capacity_forecast.push({
        horizon_days: days,
        horizon_label: h.label,
        available_capacity_hours: horizonAvailable,
        allocated_capacity_hours: horizonAllocated,
        utilization_bps: horizonUtilBps,
        overload_periods_count,
        capacity_risk,
      });
    }

    return {
      total_members,
      available_capacity_hours,
      allocated_capacity_hours,
      capacity_utilization_bps,
      assigned_tasks_count: input.assigned_tasks_count || 0,
      overdue_tasks_count: input.overdue_tasks_count || 0,
      active_projects_count: input.active_projects_count || 0,
      shoot_sessions_count: input.shoot_sessions_count || 0,
      overload_risk,
      capacity_forecast,
    };
  }
}
