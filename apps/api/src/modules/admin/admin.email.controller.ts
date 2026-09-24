import { FastifyRequest, FastifyReply } from 'fastify';
import { AdminEmailService } from './admin.email.service.js';

export class AdminEmailController {
  static async getOverview(_request: FastifyRequest, reply: FastifyReply) {
    const overview = await AdminEmailService.getOverview();
    return reply.status(200).send({
      success: true,
      data: overview,
    });
  }

  static async getLogs(request: FastifyRequest<{
    Querystring: {
      status?: string;
      template_key?: string;
      provider?: string;
      studio_id?: string;
      search?: string;
      page?: string;
      limit?: string;
    };
  }>, reply: FastifyReply) {
    const { status, template_key, provider, studio_id, search, page, limit } = request.query;

    const result = await AdminEmailService.getLogs({
      status,
      template_key,
      provider,
      studio_id,
      search,
      page: page ? parseInt(page, 10) : 1,
      limit: limit ? parseInt(limit, 10) : 25,
    });

    return reply.status(200).send({
      success: true,
      data: result.items,
      pagination: result.pagination,
    });
  }

  static async getTemplates(_request: FastifyRequest, reply: FastifyReply) {
    const templates = await AdminEmailService.getTemplates();
    return reply.status(200).send({
      success: true,
      data: templates,
    });
  }

  static async getTemplate(request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) {
    const { id } = request.params;
    const template = await AdminEmailService.getTemplate(id);

    if (!template) {
      return reply.status(404).send({
        success: false,
        error: { code: 'NOT_FOUND', message: `Template "${id}" not found.` },
      });
    }

    return reply.status(200).send({
      success: true,
      data: template,
    });
  }

  static async testTemplate(request: FastifyRequest<{
    Params: { id: string };
    Body: { recipient: string; custom_variables?: Record<string, any> };
  }>, reply: FastifyReply) {
    const { id } = request.params;
    const { recipient, custom_variables } = request.body || {};

    if (!recipient) {
      return reply.status(400).send({
        success: false,
        error: { code: 'INVALID_REQUEST', message: 'Recipient email is required for test email dispatch.' },
      });
    }

    try {
      const result = await AdminEmailService.sendTestEmail(recipient, id, custom_variables);
      return reply.status(200).send({
        success: true,
        data: result,
      });
    } catch (err: any) {
      return reply.status(400).send({
        success: false,
        error: { code: 'TEST_EMAIL_FAILED', message: err.message },
      });
    }
  }

  static async getSettings(_request: FastifyRequest, reply: FastifyReply) {
    const settings = await AdminEmailService.getSettings();
    return reply.status(200).send({
      success: true,
      data: settings,
    });
  }

  static async testConnection(_request: FastifyRequest, reply: FastifyReply) {
    const health = await AdminEmailService.testSettingsConnection();
    return reply.status(200).send({
      success: true,
      data: health,
    });
  }
}
