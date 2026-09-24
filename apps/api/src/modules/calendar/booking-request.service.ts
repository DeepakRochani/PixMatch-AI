/**
 * Booking Request Service — PixMatch AI Phase 22
 * Race-safe client self-booking, transactional slot holds, auto/manual confirmation, reschedule, and cancellation.
 */

import crypto from 'crypto';
import { prisma } from '@pixmatch/database';
import {
  BookingRequestStatus,
  BookingSlotStatus,
  CalendarEventStatus,
  CalendarEventType,
  CancellationReason,
  CreateBookingRequestDTO,
  StudioBookingRequestDTO,
} from '@pixmatch/types';
import { BookingLinkService } from './booking-link.service.js';
import { CalendarConflictService } from './calendar-conflict.service.js';

export class BookingRequestService {
  private static sanitizeText(str?: string | null): string | null {
    if (!str) return str || null;
    return str.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '').trim();
  }

  /**
   * Submit client self-booking request through public link
   */
  static async submitPublicBooking(
    rawToken: string,
    data: CreateBookingRequestDTO
  ): Promise<StudioBookingRequestDTO> {
    if (!data.client_name?.trim() || !data.client_email?.trim()) {
      throw new Error('Client name and email are required');
    }

    const tokenHash = BookingLinkService.hashToken(rawToken);
    const link = await prisma.studioBookingLink.findUnique({
      where: { public_token_hash: tokenHash },
      include: {
        studio: true,
        booking_type: true,
      },
    });

    if (!link || !link.is_active) {
      throw new Error('Invalid or inactive booking link');
    }

    if (link.token_expires_at && link.token_expires_at < new Date()) {
      throw new Error('This booking link has expired');
    }

    const studioId = link.studio_id;
    const startAt = new Date(data.start_at);
    if (isNaN(startAt.getTime())) {
      throw new Error('Invalid start timestamp');
    }

    // Determine duration and buffers
    let durationMinutes = 60;
    let bufferBefore = 0;
    let bufferAfter = 0;
    let requiresManualConfirmation = true;

    if (link.booking_type) {
      durationMinutes = link.booking_type.duration_minutes;
      bufferBefore = link.booking_type.buffer_before_minutes;
      bufferAfter = link.booking_type.buffer_after_minutes;
      requiresManualConfirmation = link.booking_type.requires_manual_confirmation;
    }

    const endAt = data.end_at ? new Date(data.end_at) : new Date(startAt.getTime() + durationMinutes * 60000);

    if (endAt <= startAt) {
      throw new Error('End time must be strictly after start time');
    }

    // Horizon checks
    const settings = await prisma.studioBookingSettings.findUnique({
      where: { studio_id: studioId },
    });

    const now = new Date();
    const minNoticeMs = (settings?.minimum_notice_minutes || 60) * 60000;
    if (startAt.getTime() < now.getTime() + minNoticeMs) {
      throw new Error('Requested time violates minimum notice requirement');
    }

    // Transactional Race-Safe Execution
    const request = await prisma.$transaction(async (tx: any) => {
      // 1. Re-verify schedule conflicts inside transaction
      const conflict = await CalendarConflictService.checkConflicts({
        studioId,
        startAt,
        endAt,
        bufferBeforeMinutes: bufferBefore,
        bufferAfterMinutes: bufferAfter,
      });

      if (conflict.has_conflict) {
        throw new Error('That time slot is no longer available. Please select another slot.');
      }

      // 1b. Create temporary transactional hold to prevent concurrent race
      const holdToken = crypto.randomBytes(16).toString('hex');
      const holdTokenHash = crypto.createHash('sha256').update(holdToken).digest('hex');
      await tx.bookingSlotHold.create({
        data: {
          studio_id: studioId,
          start_at: startAt,
          end_at: endAt,
          expires_at: new Date(Date.now() + 5 * 60000),
          hold_token_hash: holdTokenHash,
          status: 'HELD',
        },
      });

      const conflictingHolds = await tx.bookingSlotHold.findMany({
        where: {
          studio_id: studioId,
          status: 'HELD',
          expires_at: { gt: new Date() },
          start_at: { lt: endAt },
          end_at: { gt: startAt },
        },
      });

      if (conflictingHolds.length > 1) {
        throw new Error('That time is no longer available.');
      }

      // 2. Find or create Client record
      let client = await tx.client.findFirst({
        where: { studio_id: studioId, email: data.client_email.trim().toLowerCase() },
      });

      if (!client) {
        client = await tx.client.create({
          data: {
            studio_id: studioId,
            name: this.sanitizeText(data.client_name)!,
            email: data.client_email.trim().toLowerCase(),
            phone: data.client_phone ? this.sanitizeText(data.client_phone) : null,
          },
        });
      }

      // 3. Create Booking Request
      const createdRequest = await tx.studioBookingRequest.create({
        data: {
          studio_id: studioId,
          booking_link_id: link.id,
          booking_type_id: link.booking_type_id || data.booking_type_id || null,
          client_id: client.id,
          lead_id: link.lead_id || null,
          project_id: link.project_id || null,
          requested_start_at: startAt,
          requested_end_at: endAt,
          timezone: data.timezone || settings?.timezone || 'UTC',
          status: requiresManualConfirmation ? BookingRequestStatus.PENDING : BookingRequestStatus.CONFIRMED,
          client_name: this.sanitizeText(data.client_name)!,
          client_email: data.client_email.trim().toLowerCase(),
          client_phone: data.client_phone ? this.sanitizeText(data.client_phone) : null,
          message: this.sanitizeText(data.message),
        },
      });

      // 4. If auto-confirm is enabled, create calendar event immediately!
      if (!requiresManualConfirmation) {
        const title = link.booking_type
          ? `${link.booking_type.name}: ${client.name}`
          : `Session: ${client.name}`;

        const calendarEvent = await tx.studioCalendarEvent.create({
          data: {
            studio_id: studioId,
            client_id: client.id,
            project_id: link.project_id || null,
            lead_id: link.lead_id || null,
            title,
            event_type: CalendarEventType.SHOOT,
            status: CalendarEventStatus.CONFIRMED,
            start_at: startAt,
            end_at: endAt,
            timezone: data.timezone || settings?.timezone || 'UTC',
            notes: data.message ? `Client Message: ${data.message}` : null,
          },
        });

        await tx.studioBookingRequest.update({
          where: { id: createdRequest.id },
          data: { confirmed_event_id: calendarEvent.id },
        });

        createdRequest.confirmed_event_id = calendarEvent.id;
      }

      return createdRequest;
    });

    // Phase 17: Log client activity
    try {
      await prisma.clientActivity.create({
        data: {
          client_id: request.client_id!,
          studio_id: studioId,
          activity_type: requiresManualConfirmation ? 'BOOKING_REQUESTED' : 'BOOKING_CONFIRMED',
          description: `Booking ${requiresManualConfirmation ? 'requested' : 'confirmed'} for ${request.client_name}`,
          metadata: {
            booking_request_id: request.id,
            start_at: request.requested_start_at,
            end_at: request.requested_end_at,
          },
        },
      });
    } catch (_) {}

    return this.getBookingRequest(studioId, request.id);
  }

  /**
   * Studio confirms a pending booking request and schedules calendar event
   */
  static async confirmBookingRequest(
    studioId: string,
    userId: string | null,
    requestId: string,
    resourceIds?: string[]
  ): Promise<StudioBookingRequestDTO> {
    const request = await prisma.studioBookingRequest.findFirst({
      where: { id: requestId, studio_id: studioId },
      include: { booking_type: true, client: true },
    });

    if (!request) {
      throw new Error('Booking request not found');
    }

    if (request.status === BookingRequestStatus.CONFIRMED && request.confirmed_event_id) {
      return this.getBookingRequest(studioId, requestId); // Idempotent
    }

    const startAt = request.requested_start_at;
    const endAt = request.requested_end_at;

    // Check conflicts
    const conflict = await CalendarConflictService.checkConflicts({
      studioId,
      startAt,
      endAt,
      resourceIds,
    });

    if (conflict.has_conflict) {
      const descriptions = conflict.conflicts.map((c) => c.description).join(', ');
      throw new Error(`Cannot confirm booking due to conflict: ${descriptions}`);
    }

    await prisma.$transaction(async (tx: any) => {
      const title = request.booking_type
        ? `${request.booking_type.name}: ${request.client_name}`
        : `Booking: ${request.client_name}`;

      const calendarEvent = await tx.studioCalendarEvent.create({
        data: {
          studio_id: studioId,
          client_id: request.client_id,
          project_id: request.project_id,
          lead_id: request.lead_id,
          title,
          event_type: CalendarEventType.SHOOT,
          status: CalendarEventStatus.CONFIRMED,
          start_at: startAt,
          end_at: endAt,
          timezone: request.timezone,
          notes: request.message ? `Client Message: ${request.message}` : null,
          created_by: userId,
        },
      });

      if (resourceIds && resourceIds.length > 0) {
        await tx.calendarResourceAssignment.createMany({
          data: resourceIds.map((resId) => ({
            studio_id: studioId,
            calendar_event_id: calendarEvent.id,
            resource_id: resId,
            start_at: startAt,
            end_at: endAt,
          })),
        });
      }

      await tx.studioBookingRequest.update({
        where: { id: requestId },
        data: {
          status: BookingRequestStatus.CONFIRMED,
          confirmed_event_id: calendarEvent.id,
        },
      });
    });

    // Phase 17 Activity
    if (request.client_id) {
      try {
        await prisma.clientActivity.create({
          data: {
            client_id: request.client_id,
            studio_id: studioId,
            activity_type: 'BOOKING_CONFIRMED',
            description: `Booking request confirmed by studio`,
            metadata: { booking_request_id: requestId },
          },
        });
      } catch (_) {}
    }

    return this.getBookingRequest(studioId, requestId);
  }

  /**
   * Reschedule an existing booking request/event
   */
  static async rescheduleBooking(
    studioId: string,
    requestId: string,
    newStartAt: Date,
    newEndAt?: Date,
    timezone?: string,
    reason?: string
  ): Promise<StudioBookingRequestDTO> {
    const request = await prisma.studioBookingRequest.findFirst({
      where: { id: requestId, studio_id: studioId },
      include: { booking_type: true },
    });

    if (!request) {
      throw new Error('Booking request not found');
    }

    const durationMs = request.requested_end_at.getTime() - request.requested_start_at.getTime();
    const resolvedEndAt = newEndAt || new Date(newStartAt.getTime() + durationMs);

    // Check conflicts for new time
    const conflict = await CalendarConflictService.checkConflicts({
      studioId,
      startAt: newStartAt,
      endAt: resolvedEndAt,
      excludeEventId: request.confirmed_event_id,
    });

    if (conflict.has_conflict) {
      throw new Error('That time slot is not available for reschedule.');
    }

    await prisma.$transaction(async (tx: any) => {
      await tx.studioBookingRequest.update({
        where: { id: requestId },
        data: {
          requested_start_at: newStartAt,
          requested_end_at: resolvedEndAt,
          timezone: timezone || request.timezone,
          status: BookingRequestStatus.RESCHEDULED,
          reschedule_count: { increment: 1 },
        },
      });

      if (request.confirmed_event_id) {
        await tx.studioCalendarEvent.update({
          where: { id: request.confirmed_event_id },
          data: {
            start_at: newStartAt,
            end_at: resolvedEndAt,
            timezone: timezone || request.timezone,
          },
        });

        await tx.calendarResourceAssignment.updateMany({
          where: { calendar_event_id: request.confirmed_event_id },
          data: {
            start_at: newStartAt,
            end_at: resolvedEndAt,
          },
        });
      }
    });

    // Phase 17 Activity
    if (request.client_id) {
      try {
        await prisma.clientActivity.create({
          data: {
            client_id: request.client_id,
            studio_id: studioId,
            activity_type: 'BOOKING_RESCHEDULED',
            description: `Booking rescheduled to ${newStartAt.toISOString()}${reason ? `: ${reason}` : ''}`,
            metadata: { booking_request_id: requestId, new_start_at: newStartAt },
          },
        });
      } catch (_) {}
    }

    return this.getBookingRequest(studioId, requestId);
  }

  /**
   * Cancel a booking request and release resources
   */
  static async cancelBooking(
    studioId: string,
    requestId: string,
    reason?: CancellationReason,
    note?: string
  ): Promise<StudioBookingRequestDTO> {
    const request = await prisma.studioBookingRequest.findFirst({
      where: { id: requestId, studio_id: studioId },
    });
    if (!request) throw new Error('Booking request not found');

    await prisma.$transaction(async (tx: any) => {
      await tx.studioBookingRequest.update({
        where: { id: requestId },
        data: {
          status: BookingRequestStatus.CANCELLED,
          cancellation_reason: reason || CancellationReason.CLIENT_REQUEST,
          cancellation_note: note ? this.sanitizeText(note) : null,
        },
      });

      if (request.confirmed_event_id) {
        await tx.studioCalendarEvent.update({
          where: { id: request.confirmed_event_id },
          data: {
            status: CalendarEventStatus.CANCELLED,
            cancelled_at: new Date(),
            cancellation_reason: reason || CancellationReason.CLIENT_REQUEST,
            cancellation_note: note ? this.sanitizeText(note) : null,
          },
        });
      }
    });

    // Phase 17 Activity
    if (request.client_id) {
      try {
        await prisma.clientActivity.create({
          data: {
            client_id: request.client_id,
            studio_id: studioId,
            activity_type: 'BOOKING_CANCELLED',
            description: `Booking cancelled${reason ? ` (${reason})` : ''}`,
            metadata: { booking_request_id: requestId },
          },
        });
      } catch (_) {}
    }

    return this.getBookingRequest(studioId, requestId);
  }

  /**
   * Get single booking request
   */
  static async getBookingRequest(studioId: string, requestId: string): Promise<StudioBookingRequestDTO> {
    const req = await prisma.studioBookingRequest.findFirst({
      where: { id: requestId, studio_id: studioId },
      include: {
        booking_type: true,
        confirmed_event: {
          include: {
            resource_assignments: { include: { resource: true } },
          },
        },
        client: { select: { id: true, name: true, email: true } },
        project: { select: { id: true, name: true } },
      },
    });

    if (!req) throw new Error('Booking request not found');
    return req as unknown as StudioBookingRequestDTO;
  }

  /**
   * List studio booking requests
   */
  static async listBookingRequests(
    studioId: string,
    status?: BookingRequestStatus
  ): Promise<StudioBookingRequestDTO[]> {
    const requests = await prisma.studioBookingRequest.findMany({
      where: {
        studio_id: studioId,
        ...(status ? { status } : {}),
      },
      include: {
        booking_type: true,
        confirmed_event: true,
        client: { select: { id: true, name: true, email: true } },
        project: { select: { id: true, name: true } },
      },
      orderBy: { requested_start_at: 'desc' },
    });

    return requests as unknown as StudioBookingRequestDTO[];
  }

  /**
   * Alias: Reschedule booking request
   */
  static async rescheduleBookingRequest(
    studioId: string,
    userId: string,
    requestId: string,
    newStartAt: Date,
    newEndAt?: Date,
    timezone?: string,
    reason?: string
  ): Promise<StudioBookingRequestDTO> {
    return this.rescheduleBooking(studioId, requestId, newStartAt, newEndAt, timezone, reason);
  }

  /**
   * Alias: Cancel booking request
   */
  static async cancelBookingRequest(
    studioId: string,
    userId: string,
    requestId: string,
    reason?: CancellationReason,
    note?: string
  ): Promise<StudioBookingRequestDTO> {
    return this.cancelBooking(studioId, requestId, reason, note);
  }
}
