import { FastifyRequest, FastifyReply } from 'fastify';
import {
  SecurityDetectionService,
} from './security-detection.service.js';
import {
  SecurityRulesService,
} from './security-rules.service.js';
import {
  SecurityInvestigationService,
} from './security-investigation.service.js';
import {
  SecurityEventCategory,
  SecurityEventStatus,
  SecurityInvestigationStatus,
} from '@pixmatch/types';

export class SecurityCenterController {
  static async getOverview(_request: FastifyRequest, reply: FastifyReply) {
    const data = await SecurityDetectionService.getThreatSummary();
    return reply.send({ success: true, data });
  }

  static async listEvents(
    request: FastifyRequest<{
      Querystring: {
        category?: string;
        severity?: string;
        status?: string;
        service?: string;
        studio_id?: string;
        search?: string;
        fingerprint?: string;
        page?: string;
        limit?: string;
      };
    }>,
    reply: FastifyReply
  ) {
    const { category, severity, status, service, studio_id, search, fingerprint, page, limit } =
      request.query;

    const result = await SecurityDetectionService.listEvents({
      category: category as any,
      severity: severity as any,
      status: status as any,
      service,
      studio_id,
      search,
      fingerprint,
      page: page ? parseInt(page, 10) : 1,
      limit: limit ? parseInt(limit, 10) : 20,
    });

    return reply.send({ success: true, data: result });
  }

  static async getEvent(
    request: FastifyRequest<{ Params: { id: string } }>,
    reply: FastifyReply
  ) {
    const { id } = request.params;
    const event = await SecurityDetectionService.getEvent(id);
    if (!event) {
      return reply.status(404).send({
        success: false,
        error: { code: 'EVENT_NOT_FOUND', message: 'Security event not found' },
      });
    }

    const investigation = await SecurityInvestigationService.getInvestigationByEventId(id);

    return reply.send({
      success: true,
      data: {
        ...event,
        investigation,
      },
    });
  }

  static async updateEventStatus(
    request: FastifyRequest<{
      Params: { id: string };
      Body: { status: SecurityEventStatus; reason?: string };
    }>,
    reply: FastifyReply
  ) {
    const { id } = request.params;
    const { status, reason } = request.body;
    const adminId = request.user?.userId || 'unknown-admin';

    try {
      const updated = await SecurityDetectionService.updateEventStatus(id, status, adminId, reason);
      return reply.send({ success: true, data: updated });
    } catch (e: any) {
      return reply.status(400).send({
        success: false,
        error: { code: 'UPDATE_FAILED', message: e.message },
      });
    }
  }

  static async markFalsePositive(
    request: FastifyRequest<{
      Params: { id: string };
      Body: { reason: string };
    }>,
    reply: FastifyReply
  ) {
    const { id } = request.params;
    const { reason } = request.body;
    const adminId = request.user?.userId || 'unknown-admin';

    if (!reason || reason.trim().length === 0) {
      return reply.status(400).send({
        success: false,
        error: { code: 'REASON_REQUIRED', message: 'False positive reason is required' },
      });
    }

    try {
      const updated = await SecurityDetectionService.updateEventStatus(
        id,
        SecurityEventStatus.FALSE_POSITIVE,
        adminId,
        reason
      );
      return reply.send({ success: true, data: updated });
    } catch (e: any) {
      return reply.status(400).send({
        success: false,
        error: { code: 'UPDATE_FAILED', message: e.message },
      });
    }
  }

  static async listInvestigations(
    request: FastifyRequest<{
      Querystring: {
        status?: string;
        assigned_admin_id?: string;
        page?: string;
        limit?: string;
      };
    }>,
    reply: FastifyReply
  ) {
    const { status, assigned_admin_id, page, limit } = request.query;
    const result = await SecurityInvestigationService.listInvestigations({
      status,
      assigned_admin_id,
      page: page ? parseInt(page, 10) : 1,
      limit: limit ? parseInt(limit, 10) : 20,
    });
    return reply.send({ success: true, data: result });
  }

  static async createInvestigation(
    request: FastifyRequest<{
      Body: {
        security_event_id: string;
        assigned_admin_id?: string;
        initial_note?: string;
      };
    }>,
    reply: FastifyReply
  ) {
    const adminId = request.user?.userId || 'unknown-admin';
    const adminEmail = request.user?.email || 'admin@pixmatch.ai';

    try {
      const created = await SecurityInvestigationService.startInvestigation(
        request.body,
        adminId,
        adminEmail
      );
      return reply.send({ success: true, data: created });
    } catch (e: any) {
      return reply.status(400).send({
        success: false,
        error: { code: 'INVESTIGATION_CREATE_FAILED', message: e.message },
      });
    }
  }

  static async getInvestigation(
    request: FastifyRequest<{ Params: { id: string } }>,
    reply: FastifyReply
  ) {
    const { id } = request.params;
    const record = await SecurityInvestigationService.getInvestigation(id);
    if (!record) {
      return reply.status(404).send({
        success: false,
        error: { code: 'INVESTIGATION_NOT_FOUND', message: 'Investigation not found' },
      });
    }
    return reply.send({ success: true, data: record });
  }

  static async addInvestigationNote(
    request: FastifyRequest<{
      Params: { id: string };
      Body: { note: string };
    }>,
    reply: FastifyReply
  ) {
    const { id } = request.params;
    const { note } = request.body;
    const adminId = request.user?.userId || 'unknown-admin';
    const adminEmail = request.user?.email || 'admin@pixmatch.ai';

    if (!note || note.trim().length === 0) {
      return reply.status(400).send({
        success: false,
        error: { code: 'NOTE_REQUIRED', message: 'Note text is required' },
      });
    }

    try {
      const updated = await SecurityInvestigationService.addNote(id, adminId, note, adminEmail);
      return reply.send({ success: true, data: updated });
    } catch (e: any) {
      return reply.status(400).send({
        success: false,
        error: { code: 'NOTE_ADD_FAILED', message: e.message },
      });
    }
  }

  static async updateInvestigationStatus(
    request: FastifyRequest<{
      Params: { id: string };
      Body: { status: SecurityInvestigationStatus; resolution?: string };
    }>,
    reply: FastifyReply
  ) {
    const { id } = request.params;
    const { status, resolution } = request.body;
    const adminId = request.user?.userId || 'unknown-admin';

    try {
      const updated = await SecurityInvestigationService.updateStatus(
        id,
        status,
        adminId,
        resolution
      );
      return reply.send({ success: true, data: updated });
    } catch (e: any) {
      return reply.status(400).send({
        success: false,
        error: { code: 'STATUS_UPDATE_FAILED', message: e.message },
      });
    }
  }

  static async assignInvestigation(
    request: FastifyRequest<{
      Params: { id: string };
      Body: { assigned_admin_id: string; assigned_admin_name?: string };
    }>,
    reply: FastifyReply
  ) {
    const { id } = request.params;
    const { assigned_admin_id, assigned_admin_name } = request.body;
    const adminId = request.user?.userId || 'unknown-admin';

    try {
      const updated = await SecurityInvestigationService.assignAdmin(
        id,
        assigned_admin_id,
        adminId,
        assigned_admin_name
      );
      return reply.send({ success: true, data: updated });
    } catch (e: any) {
      return reply.status(400).send({
        success: false,
        error: { code: 'ASSIGNMENT_FAILED', message: e.message },
      });
    }
  }

  static async listRules(
    request: FastifyRequest<{ Querystring: { category?: string } }>,
    reply: FastifyReply
  ) {
    const { category } = request.query;
    const rules = await SecurityRulesService.listRules(category as any);
    return reply.send({ success: true, data: rules });
  }

  static async updateRule(
    request: FastifyRequest<{
      Params: { ruleId: string };
      Body: {
        enabled?: boolean;
        threshold?: number;
        window_seconds?: number;
        cooldown_seconds?: number;
        severity?: any;
      };
    }>,
    reply: FastifyReply
  ) {
    const { ruleId } = request.params;
    const adminId = request.user?.userId || 'unknown-admin';

    try {
      const updated = await SecurityRulesService.updateRule(ruleId, request.body, adminId);
      return reply.send({ success: true, data: updated });
    } catch (e: any) {
      return reply.status(400).send({
        success: false,
        error: { code: 'RULE_UPDATE_FAILED', message: e.message },
      });
    }
  }

  static async suppressRule(
    request: FastifyRequest<{
      Params: { ruleId: string };
      Body: {
        suppressed_until: string;
        suppressed_reason: string;
      };
    }>,
    reply: FastifyReply
  ) {
    const { ruleId } = request.params;
    const { suppressed_until, suppressed_reason } = request.body;
    const adminId = request.user?.userId || 'unknown-admin';

    if (!suppressed_until || !suppressed_reason) {
      return reply.status(400).send({
        success: false,
        error: { code: 'INVALID_INPUT', message: 'suppressed_until and suppressed_reason are required' },
      });
    }

    try {
      const updated = await SecurityRulesService.suppressRule(ruleId, {
        suppressed_until,
        suppressed_reason,
        suppressed_by: adminId,
      });
      return reply.send({ success: true, data: updated });
    } catch (e: any) {
      return reply.status(400).send({
        success: false,
        error: { code: 'SUPPRESS_FAILED', message: e.message },
      });
    }
  }

  static async unsuppressRule(
    request: FastifyRequest<{ Params: { ruleId: string } }>,
    reply: FastifyReply
  ) {
    const { ruleId } = request.params;
    const adminId = request.user?.userId || 'unknown-admin';

    try {
      const updated = await SecurityRulesService.unsuppressRule(ruleId, adminId);
      return reply.send({ success: true, data: updated });
    } catch (e: any) {
      return reply.status(400).send({
        success: false,
        error: { code: 'UNSUPPRESS_FAILED', message: e.message },
      });
    }
  }

  static async getTimeline(
    request: FastifyRequest<{
      Querystring: {
        service?: string;
        studio_id?: string;
        actor_id?: string;
        category?: string;
        severity?: string;
        limit?: string;
      };
    }>,
    reply: FastifyReply
  ) {
    const { service, studio_id, actor_id, category, severity, limit } = request.query;
    const timeline = await SecurityDetectionService.getSecurityTimeline({
      service,
      studio_id,
      actor_id,
      category,
      severity,
      limit: limit ? parseInt(limit, 10) : 50,
    });
    return reply.send({ success: true, data: timeline });
  }

  static async getAuthenticationSecurity(_request: FastifyRequest, reply: FastifyReply) {
    const result = await SecurityDetectionService.listEvents({
      category: SecurityEventCategory.AUTHENTICATION,
      limit: 50,
    });
    return reply.send({ success: true, data: result });
  }

  static async getApiSecurity(_request: FastifyRequest, reply: FastifyReply) {
    const result = await SecurityDetectionService.listEvents({
      category: SecurityEventCategory.API_ABUSE,
      limit: 50,
    });
    return reply.send({ success: true, data: result });
  }

  static async getWebhookSecurity(_request: FastifyRequest, reply: FastifyReply) {
    const result = await SecurityDetectionService.listEvents({
      category: SecurityEventCategory.WEBHOOK,
      limit: 50,
    });
    return reply.send({ success: true, data: result });
  }

  static async getStorageSecurity(_request: FastifyRequest, reply: FastifyReply) {
    const result = await SecurityDetectionService.listEvents({
      category: SecurityEventCategory.STORAGE,
      limit: 50,
    });
    return reply.send({ success: true, data: result });
  }

  static async getOauthSecurity(_request: FastifyRequest, reply: FastifyReply) {
    const result = await SecurityDetectionService.listEvents({
      category: SecurityEventCategory.OAUTH,
      limit: 50,
    });
    return reply.send({ success: true, data: result });
  }

  static async getPaymentsSecurity(_request: FastifyRequest, reply: FastifyReply) {
    const result = await SecurityDetectionService.listEvents({
      category: SecurityEventCategory.PAYMENT,
      limit: 50,
    });
    return reply.send({ success: true, data: result });
  }

  static async getAiSecurity(_request: FastifyRequest, reply: FastifyReply) {
    const result = await SecurityDetectionService.listEvents({
      category: SecurityEventCategory.AI,
      limit: 50,
    });
    return reply.send({ success: true, data: result });
  }

  static async exportCsv(_request: FastifyRequest, reply: FastifyReply) {
    const { events } = await SecurityDetectionService.listEvents({ limit: 500 });
    const csvContent = SecurityDetectionService.exportEventsToCsv(events);

    reply.header('Content-Type', 'text/csv');
    reply.header('Content-Disposition', 'attachment; filename="pixmatch-security-events.csv"');
    return reply.send(csvContent);
  }

  static async exportJson(_request: FastifyRequest, reply: FastifyReply) {
    const { events } = await SecurityDetectionService.listEvents({ limit: 500 });
    return reply.send({ success: true, data: events });
  }
}
