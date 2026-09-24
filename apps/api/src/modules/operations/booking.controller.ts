/**
 * Booking Controller — PixMatch AI Phase 21
 * REST endpoints for confirming bookings and calculating booking pipeline metrics.
 */

import { FastifyRequest, FastifyReply } from 'fastify';
import { BookingService } from './booking.service.js';

export class BookingController {
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
    return (req.user as any)?.id || (req.user as any)?.userId || null;
  }

  static async confirmBooking(req: FastifyRequest, reply: FastifyReply) {
    try {
      const studioId = BookingController.getStudioId(req);
      const userId = BookingController.getUserId(req);
      const body = req.body as any;
      const result = await BookingService.confirmBooking(studioId, userId, body);
      return reply.status(201).send({ success: true, data: result });
    } catch (err: any) {
      return reply.status(400).send({ success: false, error: err.message });
    }
  }

  static async getBookingPipelineSummary(req: FastifyRequest, reply: FastifyReply) {
    try {
      const studioId = BookingController.getStudioId(req);
      const summary = await BookingService.getBookingPipelineSummary(studioId);
      return reply.send({ success: true, data: summary });
    } catch (err: any) {
      return reply.status(400).send({ success: false, error: err.message });
    }
  }
}
