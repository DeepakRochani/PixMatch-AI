/**
 * Calendar Event Service — PixMatch AI Phase 22
 * Dedicated studio calendar event lifecycle, resource assignments, and tenant-isolated operations.
 */

import { prisma } from '@pixmatch/database';
import {
  CalendarEventStatus,
  CalendarEventType,
  CalendarSummaryDTO,
  CalendarVisibility,
  CancellationReason,
  CreateCalendarEventDTO,
  StudioCalendarEventDTO,
  UpdateCalendarEventDTO,
} from '@pixmatch/types';
import { CalendarConflictService } from './calendar-conflict.service.js';

export class CalendarEventService {
  private static sanitizeText(str?: string | null): string | null {
    if (!str) return str || null;
    return str.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '').trim();
  }

  /**
   * Create a studio calendar event with conflict detection and resource binding
   */
  static async createEvent(
    studioId: string,
    userId: string | null,
    data: CreateCalendarEventDTO
  ): Promise<StudioCalendarEventDTO> {
    if (!data.title?.trim()) {
      throw new Error('Event title is required');
    }

    const startAt = new Date(data.start_at);
    const endAt = new Date(data.end_at);

    if (isNaN(startAt.getTime()) || isNaN(endAt.getTime())) {
      throw new Error('Valid start and end timestamps are required');
    }

    if (endAt <= startAt) {
      throw new Error('Event end time must be strictly after start time');
    }

    const resourceIds = data.resource_ids || (data.assigned_resources?.map((r) => r.resource_id) ?? []);

    // 1. Check for conflicts
    const conflictResult = await CalendarConflictService.checkConflicts({
      studioId,
      startAt,
      endAt,
      resourceIds,
    });

    if (conflictResult.has_conflict) {
      const descriptions = conflictResult.conflicts.map((c) => c.description).join(', ');
      throw new Error(`Schedule conflict detected: ${descriptions}`);
    }

    // 2. Persist event and assignments inside transaction
    const event = await prisma.$transaction(async (tx: any) => {
      const created = await tx.studioCalendarEvent.create({
        data: {
          studio_id: studioId,
          project_id: data.project_id || null,
          client_id: data.client_id || null,
          lead_id: data.lead_id || null,
          title: this.sanitizeText(data.title)!,
          description: this.sanitizeText(data.description),
          event_type: data.event_type || CalendarEventType.SHOOT,
          status: data.status || CalendarEventStatus.CONFIRMED,
          visibility: data.visibility || CalendarVisibility.TEAM,
          start_at: startAt,
          end_at: endAt,
          timezone: data.timezone || 'UTC',
          all_day: data.all_day || false,
          location: this.sanitizeText(data.location),
          location_details: this.sanitizeText(data.location_details),
          notes: this.sanitizeText(data.notes),
          created_by: userId,
        },
      });

      if (resourceIds.length > 0) {
        await tx.calendarResourceAssignment.createMany({
          data: resourceIds.map((resId) => ({
            studio_id: studioId,
            calendar_event_id: created.id,
            resource_id: resId,
            start_at: startAt,
            end_at: endAt,
          })),
        });
      }

      return created;
    });

    return this.getEvent(studioId, event.id);
  }

  /**
   * Update calendar event with conflict re-check
   */
  static async updateEvent(
    studioId: string,
    userId: string | null,
    eventId: string,
    data: UpdateCalendarEventDTO
  ): Promise<StudioCalendarEventDTO> {
    const existing = await prisma.studioCalendarEvent.findFirst({
      where: { id: eventId, studio_id: studioId },
      include: { resource_assignments: true },
    });
    if (!existing) {
      throw new Error('Calendar event not found');
    }

    const startAt = data.start_at ? new Date(data.start_at) : existing.start_at;
    const endAt = data.end_at ? new Date(data.end_at) : existing.end_at;

    if (endAt <= startAt) {
      throw new Error('Event end time must be strictly after start time');
    }

    const resourceIds = data.resource_ids !== undefined
      ? data.resource_ids
      : (existing.resource_assignments || []).map((ra: any) => ra.resource_id);

    // Re-verify conflicts (excluding current event)
    const conflictResult = await CalendarConflictService.checkConflicts({
      studioId,
      startAt,
      endAt,
      excludeEventId: eventId,
      resourceIds,
    });

    if (conflictResult.has_conflict) {
      const descriptions = conflictResult.conflicts.map((c) => c.description).join(', ');
      throw new Error(`Schedule conflict detected: ${descriptions}`);
    }

    await prisma.$transaction(async (tx: any) => {
      await tx.studioCalendarEvent.update({
        where: { id: eventId },
        data: {
          title: data.title ? this.sanitizeText(data.title)! : undefined,
          description: data.description !== undefined ? this.sanitizeText(data.description) : undefined,
          event_type: data.event_type,
          status: data.status,
          visibility: data.visibility,
          start_at: startAt,
          end_at: endAt,
          timezone: data.timezone,
          all_day: data.all_day,
          location: data.location !== undefined ? this.sanitizeText(data.location) : undefined,
          location_details: data.location_details !== undefined ? this.sanitizeText(data.location_details) : undefined,
          notes: data.notes !== undefined ? this.sanitizeText(data.notes) : undefined,
          project_id: data.project_id,
          client_id: data.client_id,
          lead_id: data.lead_id,
          updated_by: userId,
        },
      });

      if (data.resource_ids !== undefined) {
        await tx.calendarResourceAssignment.deleteMany({
          where: { calendar_event_id: eventId },
        });

        if (data.resource_ids.length > 0) {
          await tx.calendarResourceAssignment.createMany({
            data: data.resource_ids.map((resId) => ({
              studio_id: studioId,
              calendar_event_id: eventId,
              resource_id: resId,
              start_at: startAt,
              end_at: endAt,
            })),
          });
        }
      } else if (data.start_at || data.end_at) {
        // Update timestamps on existing assignments
        await tx.calendarResourceAssignment.updateMany({
          where: { calendar_event_id: eventId },
          data: {
            start_at: startAt,
            end_at: endAt,
          },
        });
      }
    });

    return this.getEvent(studioId, eventId);
  }

  /**
   * Cancel a calendar event with audit reason
   */
  static async cancelEvent(
    studioId: string,
    userId: string | null,
    eventId: string,
    reason?: CancellationReason,
    note?: string
  ): Promise<StudioCalendarEventDTO> {
    const existing = await prisma.studioCalendarEvent.findFirst({
      where: { id: eventId, studio_id: studioId },
    });
    if (!existing) throw new Error('Calendar event not found');

    await prisma.studioCalendarEvent.update({
      where: { id: eventId },
      data: {
        status: CalendarEventStatus.CANCELLED,
        cancelled_at: new Date(),
        cancelled_by: userId,
        cancellation_reason: reason || CancellationReason.OTHER,
        cancellation_note: note ? this.sanitizeText(note) : null,
      },
    });

    return this.getEvent(studioId, eventId);
  }

  /**
   * Get single event by ID
   */
  static async getEvent(studioId: string, eventId: string): Promise<StudioCalendarEventDTO> {
    const event = await prisma.studioCalendarEvent.findFirst({
      where: { id: eventId, studio_id: studioId },
      include: {
        resource_assignments: {
          include: {
            resource: true,
          },
        },
        project: { select: { id: true, name: true, status: true, project_type: true } },
        client: { select: { id: true, name: true, email: true, phone: true } },
        lead: { select: { id: true, name: true, email: true, phone: true } },
      },
    });

    if (!event) throw new Error('Calendar event not found');

    return event as unknown as StudioCalendarEventDTO;
  }

  /**
   * List studio calendar events within date range
   */
  static async listEvents(
    studioId: string,
    query: {
      start_date?: string | Date;
      end_date?: string | Date;
      event_type?: CalendarEventType;
      status?: CalendarEventStatus;
      resource_id?: string;
      project_id?: string;
      client_id?: string;
    } = {}
  ): Promise<StudioCalendarEventDTO[]> {
    const startDate = query.start_date ? new Date(query.start_date) : new Date(Date.now() - 30 * 86400000);
    const endDate = query.end_date ? new Date(query.end_date) : new Date(Date.now() + 60 * 86400000);

    const events = await prisma.studioCalendarEvent.findMany({
      where: {
        studio_id: studioId,
        start_at: { lte: endDate },
        end_at: { gte: startDate },
        ...(query.event_type ? { event_type: query.event_type } : {}),
        ...(query.status ? { status: query.status } : {}),
        ...(query.project_id ? { project_id: query.project_id } : {}),
        ...(query.client_id ? { client_id: query.client_id } : {}),
        ...(query.resource_id
          ? {
              resource_assignments: {
                some: { resource_id: query.resource_id },
              },
            }
          : {}),
      },
      include: {
        resource_assignments: {
          include: { resource: true },
        },
        project: { select: { id: true, name: true, status: true, project_type: true } },
        client: { select: { id: true, name: true, email: true, phone: true } },
        lead: { select: { id: true, name: true, email: true, phone: true } },
      },
      orderBy: { start_at: 'asc' },
    });

    return events as unknown as StudioCalendarEventDTO[];
  }

  /**
   * Calendar metrics summary for operations and admin dashboard
   */
  static async getCalendarSummary(studioId: string): Promise<CalendarSummaryDTO> {
    const [events, activeResources, pendingRequests] = await Promise.all([
      prisma.studioCalendarEvent.findMany({
        where: { studio_id: studioId },
        select: { event_type: true, status: true, start_at: true },
      }),
      prisma.studioResource.count({
        where: { studio_id: studioId, status: 'ACTIVE' },
      }),
      prisma.studioBookingRequest.count({
        where: { studio_id: studioId, status: 'PENDING' },
      }),
    ]);

    const eventsByType: Record<CalendarEventType, number> = {
      SHOOT: 0,
      MEETING: 0,
      CONSULTATION: 0,
      DELIVERY: 0,
      EDITING: 0,
      PRE_PRODUCTION: 0,
      POST_PRODUCTION: 0,
      TRAVEL: 0,
      PERSONAL: 0,
      BLOCKED: 0,
      OTHER: 0,
    };

    const eventsByStatus: Record<CalendarEventStatus, number> = {
      TENTATIVE: 0,
      CONFIRMED: 0,
      CANCELLED: 0,
      COMPLETED: 0,
    };

    let upcomingShoots = 0;
    const now = new Date();

    for (const e of events) {
      if (eventsByType[e.event_type as CalendarEventType] !== undefined) {
        eventsByType[e.event_type as CalendarEventType]++;
      }
      if (eventsByStatus[e.status as CalendarEventStatus] !== undefined) {
        eventsByStatus[e.status as CalendarEventStatus]++;
      }
      if (e.event_type === 'SHOOT' && e.start_at >= now && e.status === 'CONFIRMED') {
        upcomingShoots++;
      }
    }

    return {
      total_events: events.length,
      events_by_type: eventsByType,
      events_by_status: eventsByStatus,
      active_resources: activeResources,
      upcoming_shoots: upcomingShoots,
      conflicts_detected: 0,
      pending_booking_requests: pendingRequests,
    };
  }
}
