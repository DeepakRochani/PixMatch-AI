/**
 * Payment Schedule Controller — PixMatch AI Phase 21
 * REST endpoints for managing project payment installments and recording payments.
 */

import { FastifyRequest, FastifyReply } from 'fastify';
import { PaymentScheduleService } from './payment-schedule.service.js';

export class PaymentScheduleController {
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

  static async listSchedules(req: FastifyRequest, reply: FastifyReply) {
    try {
      const studioId = PaymentScheduleController.getStudioId(req);
      const { projectId } = req.params as { projectId: string };
      const schedules = await PaymentScheduleService.listSchedules(studioId, projectId);
      return reply.send({ success: true, data: schedules });
    } catch (err: any) {
      return reply.status(400).send({ success: false, error: err.message });
    }
  }

  static async getSchedule(req: FastifyRequest, reply: FastifyReply) {
    try {
      const studioId = PaymentScheduleController.getStudioId(req);
      const { id } = req.params as { id: string };
      const schedule = await PaymentScheduleService.getSchedule(studioId, id);
      return reply.send({ success: true, data: schedule });
    } catch (err: any) {
      return reply.status(404).send({ success: false, error: err.message });
    }
  }

  static async createSchedule(req: FastifyRequest, reply: FastifyReply) {
    try {
      const studioId = PaymentScheduleController.getStudioId(req);
      const { projectId } = req.params as { projectId: string };
      const body = req.body as any;
      const schedule = await PaymentScheduleService.createSchedule(studioId, projectId, body);
      return reply.status(201).send({ success: true, data: schedule });
    } catch (err: any) {
      return reply.status(400).send({ success: false, error: err.message });
    }
  }

  static async updateSchedule(req: FastifyRequest, reply: FastifyReply) {
    try {
      const studioId = PaymentScheduleController.getStudioId(req);
      const { id } = req.params as { id: string };
      const body = req.body as any;
      const schedule = await PaymentScheduleService.updateSchedule(studioId, id, body);
      return reply.send({ success: true, data: schedule });
    } catch (err: any) {
      return reply.status(400).send({ success: false, error: err.message });
    }
  }

  static async recordPayment(req: FastifyRequest, reply: FastifyReply) {
    try {
      const studioId = PaymentScheduleController.getStudioId(req);
      const { id } = req.params as { id: string };
      const body = req.body as any;
      const schedule = await PaymentScheduleService.recordPayment(studioId, id, body);
      return reply.send({ success: true, data: schedule });
    } catch (err: any) {
      return reply.status(400).send({ success: false, error: err.message });
    }
  }

  static async deleteSchedule(req: FastifyRequest, reply: FastifyReply) {
    try {
      const studioId = PaymentScheduleController.getStudioId(req);
      const { id } = req.params as { id: string };
      await PaymentScheduleService.deleteSchedule(studioId, id);
      return reply.send({ success: true, message: 'Payment schedule deleted successfully' });
    } catch (err: any) {
      return reply.status(400).send({ success: false, error: err.message });
    }
  }
}
