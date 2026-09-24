/**
 * Calendar Conflict Service — PixMatch AI Phase 22
 * Multi-dimensional conflict detection engine across photographers, staff, equipment, rooms, locations, buffers, and blackout periods.
 */

import { prisma } from '@pixmatch/database';
import {
  CalendarConflictDTO,
  CalendarConflictItemDTO,
  ResourceType,
} from '@pixmatch/types';

export interface ConflictCheckParams {
  studioId: string;
  startAt: Date;
  endAt: Date;
  excludeEventId?: string | null;
  resourceIds?: string[];
  bufferBeforeMinutes?: number;
  bufferAfterMinutes?: number;
  timezone?: string;
}

export class CalendarConflictService {
  /**
   * Check for all possible schedule conflicts for a prospective event or booking
   */
  static async checkConflicts(params: ConflictCheckParams): Promise<CalendarConflictDTO> {
    const {
      studioId,
      startAt,
      endAt,
      excludeEventId,
      resourceIds = [],
      bufferBeforeMinutes = 0,
      bufferAfterMinutes = 0,
    } = params;

    const conflicts: CalendarConflictItemDTO[] = [];

    // Calculate buffered window
    const bufferedStart = new Date(startAt.getTime() - bufferBeforeMinutes * 60000);
    const bufferedEnd = new Date(endAt.getTime() + bufferAfterMinutes * 60000);

    // 1. Check Studio-wide Blackout Periods
    const studioBlackouts = await prisma.studioBlackoutPeriod.findMany({
      where: {
        studio_id: studioId,
        resource_id: null,
        start_at: { lt: bufferedEnd },
        end_at: { gt: bufferedStart },
      },
    });

    for (const b of studioBlackouts) {
      conflicts.push({
        conflict_type: 'BLACKOUT_OVERLAP',
        description: `Studio Blackout: ${b.title}${b.reason ? ` (${b.reason})` : ''}`,
        start_at: b.start_at,
        end_at: b.end_at,
      });
    }

    // 2. Check Resource-specific Blackout Periods
    if (resourceIds.length > 0) {
      const resourceBlackouts = await prisma.studioBlackoutPeriod.findMany({
        where: {
          studio_id: studioId,
          resource_id: { in: resourceIds },
          start_at: { lt: bufferedEnd },
          end_at: { gt: bufferedStart },
        },
        include: {
          resource: { select: { id: true, name: true, resource_type: true } },
        },
      });

      for (const rb of resourceBlackouts) {
        conflicts.push({
          resource_id: rb.resource_id,
          resource_name: rb.resource?.name,
          resource_type: rb.resource?.resource_type as ResourceType,
          conflict_type: 'BLACKOUT_OVERLAP',
          description: `Resource "${rb.resource?.name}" is unavailable during this period: ${rb.title}`,
          start_at: rb.start_at,
          end_at: rb.end_at,
        });
      }
    }

    // 3. Check Conflicting Resource Assignments
    if (resourceIds.length > 0) {
      const conflictingAssignments = await prisma.calendarResourceAssignment.findMany({
        where: {
          studio_id: studioId,
          resource_id: { in: resourceIds },
          calendar_event_id: excludeEventId ? { not: excludeEventId } : undefined,
          start_at: { lt: bufferedEnd },
          end_at: { gt: bufferedStart },
          calendar_event: {
            status: { not: 'CANCELLED' },
          },
        },
        include: {
          resource: { select: { id: true, name: true, resource_type: true } },
          calendar_event: { select: { id: true, title: true, status: true, start_at: true, end_at: true } },
        },
      });

      for (const ca of conflictingAssignments) {
        conflicts.push({
          resource_id: ca.resource_id,
          resource_name: ca.resource?.name,
          resource_type: ca.resource?.resource_type as ResourceType,
          event_id: ca.calendar_event_id,
          event_title: ca.calendar_event?.title,
          conflict_type: 'RESOURCE_OVERLAP',
          description: `Resource "${ca.resource?.name}" is already assigned to "${ca.calendar_event?.title}" (${ca.calendar_event?.status})`,
          start_at: ca.start_at,
          end_at: ca.end_at,
        });
      }
    } else {
      // If no specific resources queried, check general confirmed/tentative calendar events
      const overlappingEvents = await prisma.studioCalendarEvent.findMany({
        where: {
          studio_id: studioId,
          id: excludeEventId ? { not: excludeEventId } : undefined,
          status: { in: ['CONFIRMED', 'TENTATIVE'] as any },
          start_at: { lt: bufferedEnd },
          end_at: { gt: bufferedStart },
        },
      });

      for (const oe of overlappingEvents) {
        conflicts.push({
          event_id: oe.id,
          event_title: oe.title,
          conflict_type: 'EVENT_OVERLAP',
          description: `Existing studio event overlap: "${oe.title}" (${oe.status})`,
          start_at: oe.start_at,
          end_at: oe.end_at,
        });
      }
    }

    // 4. Check Active Slot Holds
    const conflictingHolds = await prisma.bookingSlotHold.findMany({
      where: {
        studio_id: studioId,
        status: 'HELD',
        expires_at: { gt: new Date() },
        start_at: { lt: bufferedEnd },
        end_at: { gt: bufferedStart },
      },
    });

    for (const h of conflictingHolds) {
      conflicts.push({
        conflict_type: 'EVENT_OVERLAP',
        description: 'A temporary booking hold is currently placed on this time slot.',
        start_at: h.start_at,
        end_at: h.end_at,
      });
    }

    const formattedConflicts = conflicts.map((c) => ({
      ...c,
      resourceId: c.resource_id,
      resourceName: c.resource_name,
      resourceType: c.resource_type,
      conflictType: c.conflict_type,
      startAt: c.start_at,
      endAt: c.end_at,
      eventId: c.event_id,
      eventTitle: c.event_title,
    }));

    return {
      has_conflict: conflicts.length > 0,
      hasConflict: conflicts.length > 0,
      conflicts: formattedConflicts as any,
    };
  }
}
