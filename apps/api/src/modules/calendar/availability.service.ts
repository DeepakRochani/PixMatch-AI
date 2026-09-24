/**
 * Availability Service — PixMatch AI Phase 22
 * Timezone-aware slot generation, working hours calculation, and resource discovery.
 */

import { prisma } from '@pixmatch/database';
import {
  AvailabilityResponseDTO,
  AvailabilitySlotDTO,
  ResourceType,
} from '@pixmatch/types';
import { CalendarConflictService } from './calendar-conflict.service.js';

export interface GetAvailabilityParams {
  studioId: string;
  bookingTypeId?: string;
  startDate: string | Date;
  endDate: string | Date;
  timezone?: string;
  resourceId?: string;
  resourceType?: ResourceType;
}

export class AvailabilityService {
  /**
   * Helper: Parse "HH:mm" string into minutes from start of day
   */
  private static parseTimeToMinutes(timeStr: string): number {
    const [h, m] = timeStr.split(':').map(Number);
    return (h || 0) * 60 + (m || 0);
  }

  /**
   * Helper: Format minutes into "HH:mm"
   */
  private static formatMinutesToTime(minutes: number): string {
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
  }

  /**
   * Helper: Get or initialize studio booking settings
   */
  static async getBookingSettings(studioId: string) {
    let settings = await prisma.studioBookingSettings.findUnique({
      where: { studio_id: studioId },
    });

    if (!settings) {
      settings = await prisma.studioBookingSettings.create({
        data: {
          studio_id: studioId,
          timezone: 'UTC',
          minimum_notice_minutes: 60,
          maximum_booking_days_ahead: 90,
          default_slot_duration_minutes: 60,
          default_buffer_before_minutes: 0,
          default_buffer_after_minutes: 0,
          allow_client_booking: true,
          allow_client_reschedule: true,
          allow_client_cancel: true,
          minimum_reschedule_notice_minutes: 60,
          minimum_cancel_notice_minutes: 60,
          require_manual_confirmation: true,
        },
      });
    }

    return settings;
  }

  /**
   * Get available booking slots within a date range
   */
  static async getAvailability(params: GetAvailabilityParams): Promise<AvailabilityResponseDTO> {
    const { studioId, bookingTypeId, resourceId, resourceType } = params;

    const settings = await this.getBookingSettings(studioId);
    const targetTimezone = params.timezone || settings.timezone || 'UTC';

    // 1. Resolve booking type parameters (if provided)
    let durationMinutes = settings.default_slot_duration_minutes;
    let bufferBefore = settings.default_buffer_before_minutes;
    let bufferAfter = settings.default_buffer_after_minutes;
    let bookingTypeObj: any = null;

    if (bookingTypeId) {
      bookingTypeObj = await prisma.studioBookingType.findFirst({
        where: { id: bookingTypeId, studio_id: studioId, is_active: true },
      });
      if (bookingTypeObj) {
        durationMinutes = bookingTypeObj.duration_minutes;
        bufferBefore = bookingTypeObj.buffer_before_minutes;
        bufferAfter = bookingTypeObj.buffer_after_minutes;
      }
    }

    // 2. Horizon checks
    const now = new Date();
    const minNoticeMs = settings.minimum_notice_minutes * 60000;
    const minEarliestAllowed = new Date(now.getTime() + minNoticeMs);

    const maxDaysAheadMs = settings.maximum_booking_days_ahead * 86400000;
    const maxLatestAllowed = new Date(now.getTime() + maxDaysAheadMs);

    let queryStart = new Date(params.startDate);
    let queryEnd = new Date(params.endDate);

    if (queryEnd.getTime() - queryStart.getTime() > 90 * 86400000) {
      throw new Error('Availability query window cannot exceed 90 days');
    }

    if (isNaN(queryStart.getTime())) queryStart = minEarliestAllowed;
    if (isNaN(queryEnd.getTime())) queryEnd = new Date(queryStart.getTime() + 7 * 86400000);

    // Clamp within bounds
    if (queryStart < minEarliestAllowed) queryStart = minEarliestAllowed;
    if (queryEnd > maxLatestAllowed) queryEnd = maxLatestAllowed;

    // Safety limit to max 31 days per query
    const maxQuerySpan = 31 * 86400000;
    if (queryEnd.getTime() - queryStart.getTime() > maxQuerySpan) {
      queryEnd = new Date(queryStart.getTime() + maxQuerySpan);
    }

    if (queryStart >= queryEnd) {
      return {
        studio_id: studioId,
        timezone: targetTimezone,
        booking_type: bookingTypeObj
          ? {
              id: bookingTypeObj.id,
              name: bookingTypeObj.name,
              duration_minutes: bookingTypeObj.duration_minutes,
              buffer_before_minutes: bookingTypeObj.buffer_before_minutes,
              buffer_after_minutes: bookingTypeObj.buffer_after_minutes,
              price: bookingTypeObj.price,
              currency: bookingTypeObj.currency,
            }
          : null,
        date_range: {
          start: queryStart.toISOString(),
          end: queryEnd.toISOString(),
        },
        slots: [],
        total_slots: 0,
      };
    }

    // 3. Load availability rules (working hours)
    const availabilityRules = await prisma.studioAvailabilityRule.findMany({
      where: {
        studio_id: studioId,
        is_active: true,
        ...(resourceId ? { resource_id: resourceId } : {}),
      },
      orderBy: { priority: 'desc' },
    });

    // Default working rules if none configured: Mon-Fri 09:00 - 18:00
    const defaultRules = [1, 2, 3, 4, 5].map((d) => ({
      day_of_week: d,
      start_time: '09:00',
      end_time: '18:00',
      type: 'WORKING_HOURS',
      resource_id: null,
    }));

    const activeRules = availabilityRules.length > 0 ? availabilityRules : defaultRules;

    // 4. Load all resources to find eligible ones
    const availableResources = await prisma.studioResource.findMany({
      where: {
        studio_id: studioId,
        status: 'ACTIVE',
        ...(resourceId ? { id: resourceId } : {}),
        ...(resourceType ? { resource_type: resourceType } : {}),
        ...(bookingTypeObj?.requires_resource_type ? { resource_type: bookingTypeObj.requires_resource_type } : {}),
      },
    });

    // 5. Generate candidate slots iterating day by day
    const candidateSlots: AvailabilitySlotDTO[] = [];
    const currDay = new Date(queryStart);
    currDay.setUTCHours(0, 0, 0, 0);

    const stepIntervalMinutes = durationMinutes >= 60 ? 30 : durationMinutes;

    while (currDay <= queryEnd) {
      const dayOfWeek = currDay.getUTCDay();

      // Find matching rules for this day
      const dayRules = activeRules.filter(
        (r) => r.type === 'WORKING_HOURS' && (r.day_of_week === dayOfWeek || r.day_of_week === null)
      );

      for (const rule of dayRules) {
        const startMinutes = this.parseTimeToMinutes(rule.start_time || '09:00');
        const endMinutes = this.parseTimeToMinutes(rule.end_time || '18:00');

        let slotStartMin = startMinutes;

        while (slotStartMin + durationMinutes <= endMinutes) {
          const slotStartTime = new Date(currDay.getTime() + slotStartMin * 60000);
          const slotEndTime = new Date(slotStartTime.getTime() + durationMinutes * 60000);

          // Verify slot is in future and within requested range
          if (slotStartTime >= minEarliestAllowed && slotStartTime >= queryStart && slotEndTime <= queryEnd) {
            // Find resources with NO conflicts for this slot
            const eligibleResources: Array<{ id: string; name: string; resource_type: ResourceType }> = [];

            if (availableResources.length > 0) {
              for (const res of availableResources) {
                const conflict = await CalendarConflictService.checkConflicts({
                  studioId,
                  startAt: slotStartTime,
                  endAt: slotEndTime,
                  resourceIds: [res.id],
                  bufferBeforeMinutes: bufferBefore,
                  bufferAfterMinutes: bufferAfter,
                });

                if (!conflict.has_conflict) {
                  eligibleResources.push({
                    id: res.id,
                    name: res.name,
                    resource_type: res.resource_type as ResourceType,
                  });
                }
              }
            } else {
              // If no resources defined in studio yet, check studio-wide conflicts
              const conflict = await CalendarConflictService.checkConflicts({
                studioId,
                startAt: slotStartTime,
                endAt: slotEndTime,
                bufferBeforeMinutes: bufferBefore,
                bufferAfterMinutes: bufferAfter,
              });

              if (!conflict.has_conflict) {
                eligibleResources.push({
                  id: 'studio-default',
                  name: 'Studio Availability',
                  resource_type: ResourceType.PHOTOGRAPHER,
                });
              }
            }

            // If at least one resource or the studio itself is free, slot is available!
            if (eligibleResources.length > 0) {
              candidateSlots.push({
                start_at: slotStartTime.toISOString(),
                end_at: slotEndTime.toISOString(),
                formatted_start: slotStartTime.toISOString().substring(11, 16),
                formatted_end: slotEndTime.toISOString().substring(11, 16),
                duration_minutes: durationMinutes,
                available_resources: eligibleResources,
                available: true,
              });
            }
          }

          slotStartMin += stepIntervalMinutes;
        }
      }

      // Increment 1 day
      currDay.setUTCDate(currDay.getUTCDate() + 1);
    }

    return {
      studio_id: studioId,
      timezone: targetTimezone,
      duration_minutes: durationMinutes,
      booking_type: bookingTypeObj
        ? {
            id: bookingTypeObj.id,
            name: bookingTypeObj.name,
            duration_minutes: bookingTypeObj.duration_minutes,
            buffer_before_minutes: bookingTypeObj.buffer_before_minutes,
            buffer_after_minutes: bookingTypeObj.buffer_after_minutes,
            price: bookingTypeObj.price,
            currency: bookingTypeObj.currency,
          }
        : null,
      date_range: {
        start: queryStart.toISOString(),
        end: queryEnd.toISOString(),
      },
      slots: candidateSlots,
      total_slots: candidateSlots.length,
    };
  }

  /**
   * Get available slots array directly
   */
  static async getAvailableSlots(params: {
    studioId: string;
    bookingTypeId?: string;
    startDate: string | Date;
    endDate: string | Date;
    slotDurationMinutes?: number;
    bufferBeforeMinutes?: number;
    bufferAfterMinutes?: number;
    timezone?: string;
    resourceId?: string;
    resourceType?: ResourceType;
  }): Promise<AvailabilitySlotDTO[]> {
    const result = await this.getAvailability({
      studioId: params.studioId,
      bookingTypeId: params.bookingTypeId,
      startDate: params.startDate,
      endDate: params.endDate,
      timezone: params.timezone,
      resourceId: params.resourceId,
      resourceType: params.resourceType,
    });
    return result.slots;
  }

  /**
   * Check if a specific prospective time slot is available
   */
  static async isAvailable(params: {
    studioId: string;
    startAt: Date;
    endAt: Date;
    resourceIds?: string[];
    excludeEventId?: string;
  }): Promise<boolean> {
    const conflicts = await CalendarConflictService.checkConflicts({
      studioId: params.studioId,
      startAt: params.startAt,
      endAt: params.endAt,
      resourceIds: params.resourceIds,
      excludeEventId: params.excludeEventId,
    });
    return !conflicts.has_conflict;
  }

  /**
   * Find next available slot for a given duration and optional resource
   */
  static async findNextAvailableSlot(
    studioId: string,
    durationMinutes: number = 60,
    resourceType?: ResourceType
  ): Promise<AvailabilitySlotDTO | null> {
    const startDate = new Date();
    const endDate = new Date(startDate.getTime() + 14 * 86400000); // look 14 days ahead

    const result = await this.getAvailability({
      studioId,
      startDate,
      endDate,
      resourceType,
    });

    return result.slots.length > 0 ? result.slots[0] : null;
  }
}
