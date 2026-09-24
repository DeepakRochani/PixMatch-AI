/**
 * Copilot Controller — PIXMatch AI Phase 15
 * Handles HTTP requests for operational health, attention alerts, chat messages, and action approvals.
 */

import { FastifyRequest, FastifyReply } from 'fastify';
import { CopilotService } from './copilot.service.js';
import { GalleryHealthService } from './gallery-health.service.js';
import { CopilotAttentionService } from './copilot-attention.service.js';

export class CopilotController {
  private static service = new CopilotService();

  static async getGalleryHealth(request: FastifyRequest, reply: FastifyReply) {
    const user = (request as any).user;
    const { galleryId } = request.params as { galleryId: string };

    if (!user || !user.studioId) {
      return reply.status(401).send({ success: false, error: { code: 'UNAUTHORIZED', message: 'Studio authentication required.' } });
    }

    try {
      const health = await GalleryHealthService.calculateHealth(user.studioId, galleryId);
      return reply.status(200).send({ success: true, data: health });
    } catch (err: any) {
      return reply.status(err.message?.includes('not found') ? 404 : 500).send({
        success: false,
        error: { code: 'HEALTH_CALC_FAILED', message: err.message || 'Failed to calculate health.' },
      });
    }
  }

  static async getAttentionSummary(request: FastifyRequest, reply: FastifyReply) {
    const user = (request as any).user;
    const { galleryId } = (request.params as { galleryId?: string }) || {};

    if (!user || !user.studioId) {
      return reply.status(401).send({ success: false, error: { code: 'UNAUTHORIZED', message: 'Studio authentication required.' } });
    }

    try {
      const summary = await CopilotAttentionService.getAttentionSummary(user.studioId, galleryId);
      return reply.status(200).send({ success: true, data: summary });
    } catch (err: any) {
      return reply.status(500).send({
        success: false,
        error: { code: 'ATTENTION_FAILED', message: err.message || 'Failed to fetch attention summary.' },
      });
    }
  }

  static async getRecommendations(request: FastifyRequest, reply: FastifyReply) {
    const user = (request as any).user;
    const { galleryId } = request.params as { galleryId: string };

    if (!user || !user.studioId) {
      return reply.status(401).send({ success: false, error: { code: 'UNAUTHORIZED', message: 'Studio authentication required.' } });
    }

    try {
      const recs = await CopilotController.service.getRecommendations(user.studioId, galleryId);
      return reply.status(200).send({ success: true, data: recs });
    } catch (err: any) {
      return reply.status(500).send({
        success: false,
        error: { code: 'RECOMMENDATIONS_FAILED', message: err.message || 'Failed to fetch recommendations.' },
      });
    }
  }

  static async prepareGallery(request: FastifyRequest, reply: FastifyReply) {
    const user = (request as any).user;
    const { galleryId } = request.params as { galleryId: string };
    const body = (request.body as any) || {};

    if (!user || !user.studioId) {
      return reply.status(401).send({ success: false, error: { code: 'UNAUTHORIZED', message: 'Studio authentication required.' } });
    }

    try {
      const result = await CopilotController.service.prepareGallery(user.studioId, user.userId || user.id, {
        gallery_id: galleryId,
        auto_select_cover: body.auto_select_cover,
        generate_smart_albums: body.generate_smart_albums,
        generate_event_story: body.generate_event_story,
        retry_failed_jobs: body.retry_failed_jobs,
      });

      return reply.status(200).send({ success: true, data: result });
    } catch (err: any) {
      return reply.status(500).send({
        success: false,
        error: { code: 'PREPARE_FAILED', message: err.message || 'Failed to prepare gallery.' },
      });
    }
  }

  static async listConversations(request: FastifyRequest, reply: FastifyReply) {
    const user = (request as any).user;
    const { galleryId } = (request.query as { galleryId?: string }) || {};

    if (!user || !user.studioId) {
      return reply.status(401).send({ success: false, error: { code: 'UNAUTHORIZED', message: 'Studio authentication required.' } });
    }

    const convs = await CopilotController.service.listConversations(user.studioId, user.userId || user.id, galleryId);
    return reply.status(200).send({ success: true, data: convs });
  }

  static async getOrCreateConversation(request: FastifyRequest, reply: FastifyReply) {
    const user = (request as any).user;
    const body = (request.body as any) || {};

    if (!user || !user.studioId) {
      return reply.status(401).send({ success: false, error: { code: 'UNAUTHORIZED', message: 'Studio authentication required.' } });
    }

    const conv = await CopilotController.service.getOrCreateConversation(user.studioId, user.userId || user.id, body.galleryId);
    return reply.status(200).send({ success: true, data: conv });
  }

  static async sendMessage(request: FastifyRequest, reply: FastifyReply) {
    const user = (request as any).user;
    const { id } = request.params as { id: string };
    const { content } = (request.body as { content: string }) || {};

    if (!user || !user.studioId) {
      return reply.status(401).send({ success: false, error: { code: 'UNAUTHORIZED', message: 'Studio authentication required.' } });
    }

    if (!content || !content.trim()) {
      return reply.status(400).send({ success: false, error: { code: 'EMPTY_MESSAGE', message: 'Message content cannot be empty.' } });
    }

    try {
      const result = await CopilotController.service.sendMessage(user.studioId, user.userId || user.id, id, content);
      return reply.status(200).send({ success: true, data: result });
    } catch (err: any) {
      return reply.status(err.message?.includes('not found') ? 404 : 500).send({
        success: false,
        error: { code: 'CHAT_FAILED', message: err.message || 'Failed to process message.' },
      });
    }
  }

  static async approveAction(request: FastifyRequest, reply: FastifyReply) {
    const user = (request as any).user;
    const { id } = request.params as { id: string };

    if (!user || !user.studioId) {
      return reply.status(401).send({ success: false, error: { code: 'UNAUTHORIZED', message: 'Studio authentication required.' } });
    }

    try {
      const action = await CopilotController.service.approveAndExecuteAction(user.studioId, user.userId || user.id, id);
      return reply.status(200).send({ success: true, data: action });
    } catch (err: any) {
      return reply.status(500).send({
        success: false,
        error: { code: 'ACTION_FAILED', message: err.message || 'Failed to execute action.' },
      });
    }
  }

  static async rejectAction(request: FastifyRequest, reply: FastifyReply) {
    const user = (request as any).user;
    const { id } = request.params as { id: string };

    if (!user || !user.studioId) {
      return reply.status(401).send({ success: false, error: { code: 'UNAUTHORIZED', message: 'Studio authentication required.' } });
    }

    await CopilotController.service.rejectAction(user.studioId, user.userId || user.id, id);
    return reply.status(200).send({ success: true, message: 'Action rejected.' });
  }

  static async dismissRecommendation(request: FastifyRequest, reply: FastifyReply) {
    const user = (request as any).user;
    const { id } = request.params as { id: string };

    if (!user || !user.studioId) {
      return reply.status(401).send({ success: false, error: { code: 'UNAUTHORIZED', message: 'Studio authentication required.' } });
    }

    await CopilotController.service.dismissRecommendation(user.studioId, id);
    return reply.status(200).send({ success: true, message: 'Recommendation dismissed.' });
  }

  static async resolveRecommendation(request: FastifyRequest, reply: FastifyReply) {
    const user = (request as any).user;
    const { id } = request.params as { id: string };

    if (!user || !user.studioId) {
      return reply.status(401).send({ success: false, error: { code: 'UNAUTHORIZED', message: 'Studio authentication required.' } });
    }

    await CopilotController.service.resolveRecommendation(user.studioId, id);
    return reply.status(200).send({ success: true, message: 'Recommendation resolved.' });
  }

  static async getTelemetry(_request: FastifyRequest, reply: FastifyReply) {
    const telemetry = await CopilotController.service.getTelemetry();
    return reply.status(200).send({ success: true, data: telemetry });
  }
}
