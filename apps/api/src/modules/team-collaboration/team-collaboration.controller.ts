/**
 * Studio Team Collaboration & Internal Operations 2.0 Controller — PIXMatch AI Phase 32
 */

import { FastifyRequest, FastifyReply } from 'fastify';
import { StudioTeamCollaborationService } from './team-collaboration.service.js';
import { prisma } from '@pixmatch/database';
import {
  ICreateThreadDTO,
  ICreateMessageDTO,
  ICreateHandoffDTO,
  ICreateBlockerDTO,
  ICreateHelpRequestDTO,
  ICollaborationSearchFilterDTO,
} from '@pixmatch/types';

export class StudioTeamCollaborationController {
  private static getService(): StudioTeamCollaborationService {
    return new StudioTeamCollaborationService(prisma);
  }

  private static extractAuth(req: FastifyRequest) {
    const user = (req as any).user;
    const studioId = (req as any).studioId || (req as any).tenantId || req.headers['x-studio-id'] || user?.studioId || user?.studio_id;
    const userId = user?.id || user?.userId || 'anonymous';
    return { studioId, userId };
  }

  // --- 1. Threads ---

  static async createThread(req: FastifyRequest<{ Body: ICreateThreadDTO }>, reply: FastifyReply) {
    const { studioId, userId } = StudioTeamCollaborationController.extractAuth(req);
    if (!studioId) return reply.status(400).send({ error: 'Missing studio identification' });

    try {
      const service = StudioTeamCollaborationController.getService();
      const result = await service.createThread(studioId, userId, req.body);
      return reply.status(201).send(result);
    } catch (err: any) {
      return reply.status(400).send({ error: err.message });
    }
  }

  static async listThreads(req: FastifyRequest<{ Querystring: any }>, reply: FastifyReply) {
    const { studioId, userId } = StudioTeamCollaborationController.extractAuth(req);
    if (!studioId) return reply.status(400).send({ error: 'Missing studio identification' });

    try {
      const service = StudioTeamCollaborationController.getService();
      const result = await service.listThreads(studioId, userId, req.query);
      return reply.status(200).send(result);
    } catch (err: any) {
      return reply.status(400).send({ error: err.message });
    }
  }

  static async getThread(req: FastifyRequest<{ Params: { threadId: string } }>, reply: FastifyReply) {
    const { studioId, userId } = StudioTeamCollaborationController.extractAuth(req);
    const { threadId } = req.params;
    if (!studioId) return reply.status(400).send({ error: 'Missing studio identification' });

    try {
      const service = StudioTeamCollaborationController.getService();
      const result = await service.getThread(studioId, userId, threadId);
      return reply.status(200).send(result);
    } catch (err: any) {
      return reply.status(404).send({ error: err.message });
    }
  }

  static async updateThread(
    req: FastifyRequest<{ Params: { threadId: string }; Body: any }>,
    reply: FastifyReply
  ) {
    const { studioId, userId } = StudioTeamCollaborationController.extractAuth(req);
    const { threadId } = req.params;
    if (!studioId) return reply.status(400).send({ error: 'Missing studio identification' });

    try {
      const service = StudioTeamCollaborationController.getService();
      const result = await service.updateThread(studioId, userId, threadId, req.body);
      return reply.status(200).send(result);
    } catch (err: any) {
      return reply.status(400).send({ error: err.message });
    }
  }

  // --- 2. Messages ---

  static async createMessage(
    req: FastifyRequest<{ Params: { threadId: string }; Body: ICreateMessageDTO }>,
    reply: FastifyReply
  ) {
    const { studioId, userId } = StudioTeamCollaborationController.extractAuth(req);
    const { threadId } = req.params;
    if (!studioId) return reply.status(400).send({ error: 'Missing studio identification' });

    try {
      const service = StudioTeamCollaborationController.getService();
      const result = await service.createMessage(studioId, userId, threadId, req.body);
      return reply.status(201).send(result);
    } catch (err: any) {
      return reply.status(400).send({ error: err.message });
    }
  }

  static async listMessages(
    req: FastifyRequest<{ Params: { threadId: string }; Querystring: any }>,
    reply: FastifyReply
  ) {
    const { studioId, userId } = StudioTeamCollaborationController.extractAuth(req);
    const { threadId } = req.params;
    if (!studioId) return reply.status(400).send({ error: 'Missing studio identification' });

    try {
      const service = StudioTeamCollaborationController.getService();
      const result = await service.listMessages(studioId, userId, threadId, req.query);
      return reply.status(200).send(result);
    } catch (err: any) {
      return reply.status(400).send({ error: err.message });
    }
  }

  static async updateMessage(
    req: FastifyRequest<{ Params: { messageId: string }; Body: { body: string } }>,
    reply: FastifyReply
  ) {
    const { studioId, userId } = StudioTeamCollaborationController.extractAuth(req);
    const { messageId } = req.params;
    if (!studioId) return reply.status(400).send({ error: 'Missing studio identification' });

    try {
      const service = StudioTeamCollaborationController.getService();
      const result = await service.updateMessage(studioId, userId, messageId, req.body.body);
      return reply.status(200).send(result);
    } catch (err: any) {
      return reply.status(400).send({ error: err.message });
    }
  }

  static async deleteMessage(
    req: FastifyRequest<{ Params: { messageId: string } }>,
    reply: FastifyReply
  ) {
    const { studioId, userId } = StudioTeamCollaborationController.extractAuth(req);
    const { messageId } = req.params;
    if (!studioId) return reply.status(400).send({ error: 'Missing studio identification' });

    try {
      const service = StudioTeamCollaborationController.getService();
      const result = await service.deleteMessage(studioId, userId, messageId);
      return reply.status(200).send(result);
    } catch (err: any) {
      return reply.status(400).send({ error: err.message });
    }
  }

  // --- 3. Mentions & Read State ---

  static async listMentions(req: FastifyRequest<{ Querystring: any }>, reply: FastifyReply) {
    const { studioId, userId } = StudioTeamCollaborationController.extractAuth(req);
    if (!studioId) return reply.status(400).send({ error: 'Missing studio identification' });

    try {
      const service = StudioTeamCollaborationController.getService();
      const result = await service.listMentions(studioId, userId, req.query);
      return reply.status(200).send(result);
    } catch (err: any) {
      return reply.status(400).send({ error: err.message });
    }
  }

  static async markMentionRead(
    req: FastifyRequest<{ Params: { mentionId: string } }>,
    reply: FastifyReply
  ) {
    const { studioId, userId } = StudioTeamCollaborationController.extractAuth(req);
    const { mentionId } = req.params;
    if (!studioId) return reply.status(400).send({ error: 'Missing studio identification' });

    try {
      const service = StudioTeamCollaborationController.getService();
      const result = await service.markMentionRead(studioId, userId, mentionId);
      return reply.status(200).send(result);
    } catch (err: any) {
      return reply.status(400).send({ error: err.message });
    }
  }

  static async markThreadRead(
    req: FastifyRequest<{ Params: { threadId: string }; Body: { last_read_message_id?: string } }>,
    reply: FastifyReply
  ) {
    const { studioId, userId } = StudioTeamCollaborationController.extractAuth(req);
    const { threadId } = req.params;
    if (!studioId) return reply.status(400).send({ error: 'Missing studio identification' });

    try {
      const service = StudioTeamCollaborationController.getService();
      const result = await service.markThreadRead(studioId, userId, threadId, req.body?.last_read_message_id);
      return reply.status(200).send(result);
    } catch (err: any) {
      return reply.status(400).send({ error: err.message });
    }
  }

  // --- 4. Acknowledgements ---

  static async acknowledge(
    req: FastifyRequest<{ Body: { entity_type: string; entity_id: string } }>,
    reply: FastifyReply
  ) {
    const { studioId, userId } = StudioTeamCollaborationController.extractAuth(req);
    if (!studioId) return reply.status(400).send({ error: 'Missing studio identification' });

    try {
      const service = StudioTeamCollaborationController.getService();
      const result = await service.acknowledgeEntity(studioId, userId, req.body.entity_type, req.body.entity_id);
      return reply.status(200).send(result);
    } catch (err: any) {
      return reply.status(400).send({ error: err.message });
    }
  }

  // --- 5. Handoffs ---

  static async createHandoff(req: FastifyRequest<{ Body: ICreateHandoffDTO }>, reply: FastifyReply) {
    const { studioId, userId } = StudioTeamCollaborationController.extractAuth(req);
    if (!studioId) return reply.status(400).send({ error: 'Missing studio identification' });

    try {
      const service = StudioTeamCollaborationController.getService();
      const result = await service.createHandoff(studioId, userId, req.body);
      return reply.status(201).send(result);
    } catch (err: any) {
      return reply.status(400).send({ error: err.message });
    }
  }

  static async listHandoffs(req: FastifyRequest<{ Querystring: any }>, reply: FastifyReply) {
    const { studioId, userId } = StudioTeamCollaborationController.extractAuth(req);
    if (!studioId) return reply.status(400).send({ error: 'Missing studio identification' });

    try {
      const service = StudioTeamCollaborationController.getService();
      const result = await service.listHandoffs(studioId, userId, req.query);
      return reply.status(200).send(result);
    } catch (err: any) {
      return reply.status(400).send({ error: err.message });
    }
  }

  static async acceptHandoff(
    req: FastifyRequest<{ Params: { handoffId: string } }>,
    reply: FastifyReply
  ) {
    const { studioId, userId } = StudioTeamCollaborationController.extractAuth(req);
    const { handoffId } = req.params;
    if (!studioId) return reply.status(400).send({ error: 'Missing studio identification' });

    try {
      const service = StudioTeamCollaborationController.getService();
      const result = await service.acceptHandoff(studioId, userId, handoffId);
      return reply.status(200).send(result);
    } catch (err: any) {
      return reply.status(400).send({ error: err.message });
    }
  }

  static async declineHandoff(
    req: FastifyRequest<{ Params: { handoffId: string }; Body: { reason?: string } }>,
    reply: FastifyReply
  ) {
    const { studioId, userId } = StudioTeamCollaborationController.extractAuth(req);
    const { handoffId } = req.params;
    if (!studioId) return reply.status(400).send({ error: 'Missing studio identification' });

    try {
      const service = StudioTeamCollaborationController.getService();
      const result = await service.declineHandoff(studioId, userId, handoffId, req.body?.reason);
      return reply.status(200).send(result);
    } catch (err: any) {
      return reply.status(400).send({ error: err.message });
    }
  }

  // --- 6. Blockers ---

  static async createBlocker(req: FastifyRequest<{ Body: ICreateBlockerDTO }>, reply: FastifyReply) {
    const { studioId, userId } = StudioTeamCollaborationController.extractAuth(req);
    if (!studioId) return reply.status(400).send({ error: 'Missing studio identification' });

    try {
      const service = StudioTeamCollaborationController.getService();
      const result = await service.createBlocker(studioId, userId, req.body);
      return reply.status(201).send(result);
    } catch (err: any) {
      return reply.status(400).send({ error: err.message });
    }
  }

  static async listBlockers(req: FastifyRequest<{ Querystring: any }>, reply: FastifyReply) {
    const { studioId, userId } = StudioTeamCollaborationController.extractAuth(req);
    if (!studioId) return reply.status(400).send({ error: 'Missing studio identification' });

    try {
      const service = StudioTeamCollaborationController.getService();
      const result = await service.listBlockers(studioId, userId, req.query);
      return reply.status(200).send(result);
    } catch (err: any) {
      return reply.status(400).send({ error: err.message });
    }
  }

  static async resolveBlocker(
    req: FastifyRequest<{ Params: { blockerId: string } }>,
    reply: FastifyReply
  ) {
    const { studioId, userId } = StudioTeamCollaborationController.extractAuth(req);
    const { blockerId } = req.params;
    if (!studioId) return reply.status(400).send({ error: 'Missing studio identification' });

    try {
      const service = StudioTeamCollaborationController.getService();
      const result = await service.resolveBlocker(studioId, userId, blockerId);
      return reply.status(200).send(result);
    } catch (err: any) {
      return reply.status(400).send({ error: err.message });
    }
  }

  // --- 7. Help Requests ---

  static async createHelpRequest(req: FastifyRequest<{ Body: ICreateHelpRequestDTO }>, reply: FastifyReply) {
    const { studioId, userId } = StudioTeamCollaborationController.extractAuth(req);
    if (!studioId) return reply.status(400).send({ error: 'Missing studio identification' });

    try {
      const service = StudioTeamCollaborationController.getService();
      const result = await service.createHelpRequest(studioId, userId, req.body);
      return reply.status(201).send(result);
    } catch (err: any) {
      return reply.status(400).send({ error: err.message });
    }
  }

  static async listHelpRequests(req: FastifyRequest<{ Querystring: any }>, reply: FastifyReply) {
    const { studioId, userId } = StudioTeamCollaborationController.extractAuth(req);
    if (!studioId) return reply.status(400).send({ error: 'Missing studio identification' });

    try {
      const service = StudioTeamCollaborationController.getService();
      const result = await service.listHelpRequests(studioId, userId, req.query);
      return reply.status(200).send(result);
    } catch (err: any) {
      return reply.status(400).send({ error: err.message });
    }
  }

  static async resolveHelpRequest(
    req: FastifyRequest<{ Params: { requestId: string } }>,
    reply: FastifyReply
  ) {
    const { studioId, userId } = StudioTeamCollaborationController.extractAuth(req);
    const { requestId } = req.params;
    if (!studioId) return reply.status(400).send({ error: 'Missing studio identification' });

    try {
      const service = StudioTeamCollaborationController.getService();
      const result = await service.resolveHelpRequest(studioId, userId, requestId);
      return reply.status(200).send(result);
    } catch (err: any) {
      return reply.status(400).send({ error: err.message });
    }
  }

  // --- 8. Attention Center ---

  static async getAttentionCenter(req: FastifyRequest, reply: FastifyReply) {
    const { studioId, userId } = StudioTeamCollaborationController.extractAuth(req);
    if (!studioId) return reply.status(400).send({ error: 'Missing studio identification' });

    try {
      const service = StudioTeamCollaborationController.getService();
      const result = await service.getAttentionCenter(studioId, userId);
      return reply.status(200).send(result);
    } catch (err: any) {
      return reply.status(400).send({ error: err.message });
    }
  }

  // --- 9. Search ---

  static async searchCollaboration(
    req: FastifyRequest<{ Querystring: ICollaborationSearchFilterDTO }>,
    reply: FastifyReply
  ) {
    const { studioId, userId } = StudioTeamCollaborationController.extractAuth(req);
    if (!studioId) return reply.status(400).send({ error: 'Missing studio identification' });

    try {
      const service = StudioTeamCollaborationController.getService();
      const result = await service.searchCollaboration(studioId, userId, req.query);
      return reply.status(200).send(result);
    } catch (err: any) {
      return reply.status(400).send({ error: err.message });
    }
  }

  // --- 10. Attachments ---

  static async getAttachmentDownloadUrl(
    req: FastifyRequest<{ Params: { attachmentId: string } }>,
    reply: FastifyReply
  ) {
    const { studioId, userId } = StudioTeamCollaborationController.extractAuth(req);
    const { attachmentId } = req.params;
    if (!studioId) return reply.status(400).send({ error: 'Missing studio identification' });

    try {
      const service = StudioTeamCollaborationController.getService();
      const result = await service.getAttachmentDownloadUrl(studioId, userId, attachmentId);
      return reply.status(200).send(result);
    } catch (err: any) {
      return reply.status(404).send({ error: err.message });
    }
  }
}
