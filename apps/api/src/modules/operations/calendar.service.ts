/**
 * Operations Calendar Service — PixMatch AI Phase 20
 * Aggregates multi-source events (shoots, tasks, follow-ups, milestones, deliveries) for calendar views.
 */

import { prisma } from '@pixmatch/database';
import {
  OperationsCalendarEventDTO,
  OperationsCalendarQueryDTO,
  OperationsCalendarResponseDTO,
} from '@pixmatch/types';

export class CalendarService {
  /**
   * Fetch aggregated calendar events within date range
   */
  static async getEvents(
    studioId: string,
    query: OperationsCalendarQueryDTO = {}
  ): Promise<OperationsCalendarResponseDTO> {
    const startDate = query.start_date ? new Date(query.start_date) : new Date(Date.now() - 30 * 86400000);
    const endDate = query.end_date ? new Date(query.end_date) : new Date(Date.now() + 60 * 86400000);
    const eventType = query.event_type;
    const projectId = query.project_id;
    const clientId = query.client_id;

    const events: OperationsCalendarEventDTO[] = [];

    // 1. Shoots from StudioProject
    if (!eventType || eventType === 'SHOOT') {
      const projectsWithShoots = await prisma.studioProject.findMany({
        where: {
          studio_id: studioId,
          ...(projectId ? { id: projectId } : {}),
          ...(clientId ? { client_id: clientId } : {}),
          deleted_at: null,
          shoot_date: {
            gte: startDate,
            lte: endDate,
          },
        },
        include: {
          client: {
            select: { id: true, name: true, email: true },
          },
        },
      });

      for (const p of projectsWithShoots) {
        if (!p.shoot_date) continue;
        const shootEnd = new Date(p.shoot_date.getTime() + 2 * 3600000);

        events.push({
          id: `shoot-${p.id}`,
          title: `📸 Shoot: ${p.name}`,
          start_date: p.shoot_date.toISOString(),
          end_date: shootEnd.toISOString(),
          is_all_day: false,
          event_type: 'SHOOT',
          project_id: p.id,
          project_title: p.name,
          client_id: p.client?.id,
          client_name: p.client?.name,
          location: p.location || undefined,
          status: p.status as any,
          color: '#3b82f6', // blue
        });
      }
    }

    // 2. Project Estimated Deliveries
    if (!eventType || eventType === 'DELIVERY') {
      const projectsWithDeliveries = await prisma.studioProject.findMany({
        where: {
          studio_id: studioId,
          ...(projectId ? { id: projectId } : {}),
          ...(clientId ? { client_id: clientId } : {}),
          deleted_at: null,
          end_date: {
            gte: startDate,
            lte: endDate,
          },
        },
        include: {
          client: {
            select: { id: true, name: true },
          },
        },
      });

      for (const p of projectsWithDeliveries) {
        if (!p.end_date) continue;
        events.push({
          id: `delivery-${p.id}`,
          title: `📦 Delivery: ${p.name}`,
          start_date: p.end_date.toISOString(),
          end_date: p.end_date.toISOString(),
          is_all_day: true,
          event_type: 'DELIVERY',
          project_id: p.id,
          project_title: p.name,
          client_id: p.client?.id,
          client_name: p.client?.name,
          status: p.status as any,
          color: '#10b981', // green
        });
      }
    }

    // 3. Tasks from ProjectTask
    if (!eventType || eventType === 'TASK') {
      const tasks = await prisma.projectTask.findMany({
        where: {
          studio_id: studioId,
          ...(projectId ? { project_id: projectId } : {}),
          due_at: {
            gte: startDate,
            lte: endDate,
          },
        },
        include: {
          project: {
            select: { id: true, name: true, client: { select: { id: true, name: true } } },
          },
        },
      });

      for (const t of tasks) {
        if (!t.due_at) continue;
        events.push({
          id: `task-${t.id}`,
          title: `✓ ${t.title}`,
          start_date: t.due_at.toISOString(),
          end_date: t.due_at.toISOString(),
          is_all_day: true,
          event_type: 'TASK',
          project_id: t.project_id || undefined,
          project_title: t.project?.name || undefined,
          client_id: t.project?.client?.id,
          client_name: t.project?.client?.name,
          status: t.status as any,
          priority: t.priority as any,
          color: t.status === 'COMPLETED' ? '#6b7280' : t.priority === 'URGENT' ? '#ef4444' : '#8b5cf6', // purple / red / gray
        });
      }
    }

    // 4. Milestones from ProjectMilestone
    if (!eventType || eventType === 'MILESTONE') {
      const milestones = await prisma.projectMilestone.findMany({
        where: {
          studio_id: studioId,
          ...(projectId ? { project_id: projectId } : {}),
          target_date: {
            gte: startDate,
            lte: endDate,
          },
        },
        include: {
          project: {
            select: { id: true, name: true, client: { select: { id: true, name: true } } },
          },
        },
      });

      for (const m of milestones) {
        if (!m.target_date) continue;
        events.push({
          id: `milestone-${m.id}`,
          title: `🚩 Milestone: ${m.title}`,
          start_date: m.target_date.toISOString(),
          end_date: m.target_date.toISOString(),
          is_all_day: true,
          event_type: 'MILESTONE',
          project_id: m.project_id,
          project_title: m.project?.name,
          client_id: m.project?.client?.id,
          client_name: m.project?.client?.name,
          status: m.status as any,
          color: '#f59e0b', // amber
        });
      }
    }

    // 5. Lead Follow-ups from StudioLead
    if (!eventType || eventType === 'LEAD_FOLLOW_UP') {
      const leads = await prisma.studioLead.findMany({
        where: {
          studio_id: studioId,
          deleted_at: null,
          next_follow_up_at: {
            gte: startDate,
            lte: endDate,
          },
        },
      });

      for (const l of leads) {
        if (!l.next_follow_up_at) continue;
        events.push({
          id: `lead-${l.id}`,
          title: `📞 Follow-up: ${l.name}`,
          start_date: l.next_follow_up_at.toISOString(),
          end_date: l.next_follow_up_at.toISOString(),
          is_all_day: true,
          event_type: 'LEAD_FOLLOW_UP',
          client_name: l.name,
          status: l.status as any,
          color: '#ec4899', // pink
        });
      }
    }

    // 6. Dedicated Studio Calendar Events (Phase 22)
    try {
      const dedicatedEvents = await prisma.studioCalendarEvent.findMany({
        where: {
          studio_id: studioId,
          status: { not: 'CANCELLED' },
          ...(projectId ? { project_id: projectId } : {}),
          ...(clientId ? { client_id: clientId } : {}),
          start_at: { lte: endDate },
          end_at: { gte: startDate },
        },
        include: {
          client: { select: { id: true, name: true } },
          project: { select: { id: true, name: true } },
          resource_assignments: { include: { resource: true } },
        },
      });

      for (const de of dedicatedEvents) {
        const resources = de.resource_assignments?.map((r) => r.resource?.name).filter(Boolean).join(', ');
        events.push({
          id: de.id,
          title: de.title,
          start_date: de.start_at.toISOString(),
          end_date: de.end_at.toISOString(),
          is_all_day: de.all_day,
          event_type: de.event_type as any,
          project_id: de.project_id || undefined,
          project_title: de.project?.name || undefined,
          client_id: de.client?.id || undefined,
          client_name: de.client?.name || undefined,
          location: de.location || undefined,
          status: de.status as any,
          color: de.event_type === 'SHOOT' ? '#3b82f6' : de.event_type === 'MEETING' ? '#8b5cf6' : de.event_type === 'CONSULTATION' ? '#ec4899' : '#10b981',
          notes: de.notes || undefined,
        } as any);
      }
    } catch (_) {}

    // Sort all events chronologically
    events.sort((a, b) => new Date(a.start_date || (a as any).start || 0).getTime() - new Date(b.start_date || (b as any).start || 0).getTime());

    return {
      start_date: startDate.toISOString(),
      end_date: endDate.toISOString(),
      total_events: events.length,
      events,
    };
  }
}
