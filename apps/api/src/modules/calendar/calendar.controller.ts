/**
 * Calendar Controller — PixMatch AI Phase 22
 * REST endpoints for studio scheduling, availability, resource management, and client self-booking portal.
 */

import { FastifyReply, FastifyRequest } from 'fastify';
import { AvailabilityService } from './availability.service.js';
import { BookingLinkService } from './booking-link.service.js';
import { BookingRequestService } from './booking-request.service.js';
import { BookingTypeService } from './booking-type.service.js';
import { CalendarConflictService } from './calendar-conflict.service.js';
import { CalendarEventService } from './calendar-event.service.js';
import { CalendarSyncService } from './calendar-sync.service.js';
import { ICalService } from './ical.service.js';
import { ResourceService } from './resource.service.js';

export class CalendarController {
  private static getStudioId(req: FastifyRequest): string {
    const studioId =
      (req.headers['x-studio-id'] as string) ||
      (req.user as any)?.studio_id ||
      (req.user as any)?.studioId ||
      (req.query as any)?.studio_id ||
      (req.query as any)?.studioId ||
      (req.body as any)?.studio_id;

    if (!studioId) {
      throw new Error('Studio ID is required');
    }
    return studioId;
  }

  private static getUserId(req: FastifyRequest): string {
    return (req.user as any)?.id || (req.user as any)?.userId || 'system-user';
  }

  // ==========================================
  // CALENDAR EVENTS
  // ==========================================

  static async listEvents(req: FastifyRequest, reply: FastifyReply) {
    try {
      const studioId = CalendarController.getStudioId(req);
      const query = req.query as any;
      const events = await CalendarEventService.listEvents(studioId, query);
      return reply.send({ success: true, data: events });
    } catch (err: any) {
      return reply.status(400).send({ success: false, error: err.message });
    }
  }

  static async getEvent(req: FastifyRequest, reply: FastifyReply) {
    try {
      const studioId = CalendarController.getStudioId(req);
      const { id } = req.params as { id: string };
      const event = await CalendarEventService.getEvent(studioId, id);
      return reply.send({ success: true, data: event });
    } catch (err: any) {
      return reply.status(404).send({ success: false, error: err.message });
    }
  }

  static async createEvent(req: FastifyRequest, reply: FastifyReply) {
    try {
      const studioId = CalendarController.getStudioId(req);
      const userId = CalendarController.getUserId(req);
      const event = await CalendarEventService.createEvent(studioId, userId, req.body as any);
      return reply.status(201).send({ success: true, data: event });
    } catch (err: any) {
      return reply.status(400).send({ success: false, error: err.message });
    }
  }

  static async updateEvent(req: FastifyRequest, reply: FastifyReply) {
    try {
      const studioId = CalendarController.getStudioId(req);
      const userId = CalendarController.getUserId(req);
      const { id } = req.params as { id: string };
      const event = await CalendarEventService.updateEvent(studioId, userId, id, req.body as any);
      return reply.send({ success: true, data: event });
    } catch (err: any) {
      return reply.status(400).send({ success: false, error: err.message });
    }
  }

  static async cancelEvent(req: FastifyRequest, reply: FastifyReply) {
    try {
      const studioId = CalendarController.getStudioId(req);
      const userId = CalendarController.getUserId(req);
      const { id } = req.params as { id: string };
      const { reason, note } = (req.body as any) || {};
      const event = await CalendarEventService.cancelEvent(studioId, userId, id, reason, note);
      return reply.send({ success: true, data: event });
    } catch (err: any) {
      return reply.status(400).send({ success: false, error: err.message });
    }
  }

  static async getSummary(req: FastifyRequest, reply: FastifyReply) {
    try {
      const studioId = CalendarController.getStudioId(req);
      const summary = await CalendarEventService.getCalendarSummary(studioId);
      return reply.send({ success: true, data: summary });
    } catch (err: any) {
      return reply.status(400).send({ success: false, error: err.message });
    }
  }

  // ==========================================
  // AVAILABILITY & CONFLICTS
  // ==========================================

  static async getAvailability(req: FastifyRequest, reply: FastifyReply) {
    try {
      const studioId = CalendarController.getStudioId(req);
      const query = req.query as any;
      const availability = await AvailabilityService.getAvailability({
        studioId,
        bookingTypeId: query.booking_type_id,
        startDate: query.start_date,
        endDate: query.end_date,
        timezone: query.timezone,
        resourceId: query.resource_id,
        resourceType: query.resource_type,
      });
      return reply.send({ success: true, data: availability });
    } catch (err: any) {
      return reply.status(400).send({ success: false, error: err.message });
    }
  }

  static async checkConflicts(req: FastifyRequest, reply: FastifyReply) {
    try {
      const studioId = CalendarController.getStudioId(req);
      const body = req.body as any;
      const conflicts = await CalendarConflictService.checkConflicts({
        studioId,
        startAt: new Date(body.start_at),
        endAt: new Date(body.end_at),
        excludeEventId: body.exclude_event_id,
        resourceIds: body.resource_ids || [],
        bufferBeforeMinutes: body.buffer_before_minutes || 0,
        bufferAfterMinutes: body.buffer_after_minutes || 0,
      });
      return reply.send({ success: true, data: conflicts });
    } catch (err: any) {
      return reply.status(400).send({ success: false, error: err.message });
    }
  }

  static async getSettings(req: FastifyRequest, reply: FastifyReply) {
    try {
      const studioId = CalendarController.getStudioId(req);
      const settings = await AvailabilityService.getBookingSettings(studioId);
      return reply.send({ success: true, data: settings });
    } catch (err: any) {
      return reply.status(400).send({ success: false, error: err.message });
    }
  }

  // ==========================================
  // RESOURCES
  // ==========================================

  static async listResources(req: FastifyRequest, reply: FastifyReply) {
    try {
      const studioId = CalendarController.getStudioId(req);
      const query = req.query as any;
      const resources = await ResourceService.listResources(studioId, query);
      return reply.send({ success: true, data: resources });
    } catch (err: any) {
      return reply.status(400).send({ success: false, error: err.message });
    }
  }

  static async getResource(req: FastifyRequest, reply: FastifyReply) {
    try {
      const studioId = CalendarController.getStudioId(req);
      const { id } = req.params as { id: string };
      const resource = await ResourceService.getResource(studioId, id);
      return reply.send({ success: true, data: resource });
    } catch (err: any) {
      return reply.status(404).send({ success: false, error: err.message });
    }
  }

  static async createResource(req: FastifyRequest, reply: FastifyReply) {
    try {
      const studioId = CalendarController.getStudioId(req);
      const resource = await ResourceService.createResource(studioId, req.body as any);
      return reply.status(201).send({ success: true, data: resource });
    } catch (err: any) {
      return reply.status(400).send({ success: false, error: err.message });
    }
  }

  static async updateResource(req: FastifyRequest, reply: FastifyReply) {
    try {
      const studioId = CalendarController.getStudioId(req);
      const { id } = req.params as { id: string };
      const resource = await ResourceService.updateResource(studioId, id, req.body as any);
      return reply.send({ success: true, data: resource });
    } catch (err: any) {
      return reply.status(400).send({ success: false, error: err.message });
    }
  }

  static async deactivateResource(req: FastifyRequest, reply: FastifyReply) {
    try {
      const studioId = CalendarController.getStudioId(req);
      const { id } = req.params as { id: string };
      const resource = await ResourceService.deactivateResource(studioId, id);
      return reply.send({ success: true, data: resource });
    } catch (err: any) {
      return reply.status(400).send({ success: false, error: err.message });
    }
  }

  static async reactivateResource(req: FastifyRequest, reply: FastifyReply) {
    try {
      const studioId = CalendarController.getStudioId(req);
      const { id } = req.params as { id: string };
      const resource = await ResourceService.reactivateResource(studioId, id);
      return reply.send({ success: true, data: resource });
    } catch (err: any) {
      return reply.status(400).send({ success: false, error: err.message });
    }
  }

  // ==========================================
  // WORKING HOURS & BLACKOUTS
  // ==========================================

  static async listRules(req: FastifyRequest, reply: FastifyReply) {
    try {
      const studioId = CalendarController.getStudioId(req);
      const { resource_id } = (req.query as any) || {};
      const rules = await ResourceService.listAvailabilityRules(studioId, resource_id);
      return reply.send({ success: true, data: rules });
    } catch (err: any) {
      return reply.status(400).send({ success: false, error: err.message });
    }
  }

  static async createRule(req: FastifyRequest, reply: FastifyReply) {
    try {
      const studioId = CalendarController.getStudioId(req);
      const rule = await ResourceService.createAvailabilityRule(studioId, req.body as any);
      return reply.status(201).send({ success: true, data: rule });
    } catch (err: any) {
      return reply.status(400).send({ success: false, error: err.message });
    }
  }

  static async deleteRule(req: FastifyRequest, reply: FastifyReply) {
    try {
      const studioId = CalendarController.getStudioId(req);
      const { id } = req.params as { id: string };
      await ResourceService.deleteAvailabilityRule(studioId, id);
      return reply.send({ success: true });
    } catch (err: any) {
      return reply.status(400).send({ success: false, error: err.message });
    }
  }

  static async listBlackouts(req: FastifyRequest, reply: FastifyReply) {
    try {
      const studioId = CalendarController.getStudioId(req);
      const { resource_id } = (req.query as any) || {};
      const blackouts = await ResourceService.listBlackoutPeriods(studioId, resource_id);
      return reply.send({ success: true, data: blackouts });
    } catch (err: any) {
      return reply.status(400).send({ success: false, error: err.message });
    }
  }

  static async createBlackout(req: FastifyRequest, reply: FastifyReply) {
    try {
      const studioId = CalendarController.getStudioId(req);
      const userId = CalendarController.getUserId(req);
      const blackout = await ResourceService.createBlackoutPeriod(studioId, userId, req.body as any);
      return reply.status(201).send({ success: true, data: blackout });
    } catch (err: any) {
      return reply.status(400).send({ success: false, error: err.message });
    }
  }

  static async deleteBlackout(req: FastifyRequest, reply: FastifyReply) {
    try {
      const studioId = CalendarController.getStudioId(req);
      const { id } = req.params as { id: string };
      await ResourceService.deleteBlackoutPeriod(studioId, id);
      return reply.send({ success: true });
    } catch (err: any) {
      return reply.status(400).send({ success: false, error: err.message });
    }
  }

  // ==========================================
  // BOOKING TYPES & LINKS
  // ==========================================

  static async listBookingTypes(req: FastifyRequest, reply: FastifyReply) {
    try {
      const studioId = CalendarController.getStudioId(req);
      const types = await BookingTypeService.listBookingTypes(studioId);
      return reply.send({ success: true, data: types });
    } catch (err: any) {
      return reply.status(400).send({ success: false, error: err.message });
    }
  }

  static async createBookingType(req: FastifyRequest, reply: FastifyReply) {
    try {
      const studioId = CalendarController.getStudioId(req);
      const type = await BookingTypeService.createBookingType(studioId, req.body as any);
      return reply.status(201).send({ success: true, data: type });
    } catch (err: any) {
      return reply.status(400).send({ success: false, error: err.message });
    }
  }

  static async updateBookingType(req: FastifyRequest, reply: FastifyReply) {
    try {
      const studioId = CalendarController.getStudioId(req);
      const { id } = req.params as { id: string };
      const type = await BookingTypeService.updateBookingType(studioId, id, req.body as any);
      return reply.send({ success: true, data: type });
    } catch (err: any) {
      return reply.status(400).send({ success: false, error: err.message });
    }
  }

  static async listBookingLinks(req: FastifyRequest, reply: FastifyReply) {
    try {
      const studioId = CalendarController.getStudioId(req);
      const links = await BookingLinkService.listBookingLinks(studioId);
      return reply.send({ success: true, data: links });
    } catch (err: any) {
      return reply.status(400).send({ success: false, error: err.message });
    }
  }

  static async createBookingLink(req: FastifyRequest, reply: FastifyReply) {
    try {
      const studioId = CalendarController.getStudioId(req);
      const userId = CalendarController.getUserId(req);
      const link = await BookingLinkService.createBookingLink(studioId, userId, req.body as any);
      return reply.status(201).send({ success: true, data: link });
    } catch (err: any) {
      return reply.status(400).send({ success: false, error: err.message });
    }
  }

  static async revokeBookingLink(req: FastifyRequest, reply: FastifyReply) {
    try {
      const studioId = CalendarController.getStudioId(req);
      const { id } = req.params as { id: string };
      await BookingLinkService.revokeBookingLink(studioId, id);
      return reply.send({ success: true });
    } catch (err: any) {
      return reply.status(400).send({ success: false, error: err.message });
    }
  }

  // ==========================================
  // BOOKING REQUESTS
  // ==========================================

  static async listBookingRequests(req: FastifyRequest, reply: FastifyReply) {
    try {
      const studioId = CalendarController.getStudioId(req);
      const { status } = (req.query as any) || {};
      const requests = await BookingRequestService.listBookingRequests(studioId, status);
      return reply.send({ success: true, data: requests });
    } catch (err: any) {
      return reply.status(400).send({ success: false, error: err.message });
    }
  }

  static async getBookingRequest(req: FastifyRequest, reply: FastifyReply) {
    try {
      const studioId = CalendarController.getStudioId(req);
      const { id } = req.params as { id: string };
      const request = await BookingRequestService.getBookingRequest(studioId, id);
      return reply.send({ success: true, data: request });
    } catch (err: any) {
      return reply.status(404).send({ success: false, error: err.message });
    }
  }

  static async confirmBookingRequest(req: FastifyRequest, reply: FastifyReply) {
    try {
      const studioId = CalendarController.getStudioId(req);
      const userId = CalendarController.getUserId(req);
      const { id } = req.params as { id: string };
      const { resource_ids } = (req.body as any) || {};
      const request = await BookingRequestService.confirmBookingRequest(studioId, userId, id, resource_ids);
      return reply.send({ success: true, data: request });
    } catch (err: any) {
      return reply.status(400).send({ success: false, error: err.message });
    }
  }

  // ==========================================
  // EXTERNAL CALENDAR & ICAL
  // ==========================================

  static async listConnections(req: FastifyRequest, reply: FastifyReply) {
    try {
      const studioId = CalendarController.getStudioId(req);
      const connections = await CalendarSyncService.listConnections(studioId);
      return reply.send({ success: true, data: connections });
    } catch (err: any) {
      return reply.status(400).send({ success: false, error: err.message });
    }
  }

  static async connectProvider(req: FastifyRequest, reply: FastifyReply) {
    try {
      const studioId = CalendarController.getStudioId(req);
      const { provider } = req.params as { provider: string };
      const { code, redirect_uri } = req.body as any;
      const connection = await CalendarSyncService.connectProvider(studioId, provider as any, code, redirect_uri);
      return reply.send({ success: true, data: connection });
    } catch (err: any) {
      return reply.status(400).send({ success: false, error: err.message });
    }
  }

  static async syncConnection(req: FastifyRequest, reply: FastifyReply) {
    try {
      const studioId = CalendarController.getStudioId(req);
      const { id } = req.params as { id: string };
      const result = await CalendarSyncService.syncConnection(studioId, id);
      return reply.send({ success: true, data: result });
    } catch (err: any) {
      return reply.status(400).send({ success: false, error: err.message });
    }
  }

  static async getICalUrl(req: FastifyRequest, reply: FastifyReply) {
    try {
      const studioId = CalendarController.getStudioId(req);
      const connectionId = await ICalService.getOrCreateICalToken(studioId);
      return reply.send({ success: true, data: { feed_url: `/api/v1/public/calendar/ical/${connectionId}.ics` } });
    } catch (err: any) {
      return reply.status(400).send({ success: false, error: err.message });
    }
  }

  // ==========================================
  // PUBLIC BOOKING PORTAL ENDPOINTS
  // ==========================================

  static async getPublicPortal(req: FastifyRequest, reply: FastifyReply) {
    try {
      const { token } = req.params as { token: string };
      const portal = await BookingLinkService.resolvePublicToken(token);
      return reply.send({ success: true, data: portal });
    } catch (err: any) {
      return reply.status(404).send({ success: false, error: err.message });
    }
  }

  static async getPublicAvailability(req: FastifyRequest, reply: FastifyReply) {
    try {
      const { token } = req.params as { token: string };
      const tokenHash = BookingLinkService.hashToken(token);

      const link = await prisma.studioBookingLink.findUnique({
        where: { public_token_hash: tokenHash },
      });

      if (!link || !link.is_active) {
        return reply.status(404).send({ success: false, error: 'Booking link not found or inactive' });
      }

      const query = req.query as any;
      const availability = await AvailabilityService.getAvailability({
        studioId: link.studio_id,
        bookingTypeId: link.booking_type_id || query.booking_type_id,
        startDate: query.start_date || new Date(),
        endDate: query.end_date || new Date(Date.now() + 14 * 86400000),
        timezone: query.timezone,
      });

      return reply.send({ success: true, data: availability });
    } catch (err: any) {
      return reply.status(400).send({ success: false, error: err.message });
    }
  }

  static async submitPublicBooking(req: FastifyRequest, reply: FastifyReply) {
    try {
      const { token } = req.params as { token: string };
      const result = await BookingRequestService.submitPublicBooking(token, req.body as any);
      return reply.status(201).send({ success: true, data: result });
    } catch (err: any) {
      return reply.status(400).send({ success: false, error: err.message });
    }
  }

  static async getPublicICalFeed(req: FastifyRequest, reply: FastifyReply) {
    try {
      const { token } = req.params as { token: string };
      const connectionId = token.replace('.ics', '');
      const ics = await ICalService.generateFeed(connectionId);
      return reply
        .header('Content-Type', 'text/calendar; charset=utf-8')
        .header('Content-Disposition', `attachment; filename="studio-calendar.ics"`)
        .send(ics);
    } catch (err: any) {
      return reply.status(404).send({ success: false, error: err.message });
    }
  }
}
