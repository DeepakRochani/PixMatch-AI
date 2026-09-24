/**
 * Communication Controller — PixMatch AI Phase 28
 * HTTP endpoints handler for studio-client conversations, messages, templates, saved replies, and analytics.
 */

import { FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { ClientConversationService } from './client-conversation.service';
import { ClientMessageService } from './client-message.service';
import { SavedReplyService } from './saved-reply.service';
import { MessageTemplateService } from './message-template.service';
import { ClientAttachmentService } from './client-attachment.service';
import { CommunicationAnalyticsService } from './communication-analytics.service';
import { CommunicationAuditService } from './communication-audit.service';
import { MessageSenderType } from '@pixmatch/types';

// Zod schemas
const createConversationSchema = z.object({
  client_id: z.string().uuid(),
  subject: z.string().trim().min(1).max(255),
  category: z.string().optional(),
  priority: z.enum(['LOW', 'NORMAL', 'HIGH', 'URGENT']).optional(),
  project_id: z.string().uuid().optional(),
  gallery_id: z.string().uuid().optional(),
  order_id: z.string().uuid().optional(),
  assigned_to_user_id: z.string().uuid().optional(),
  tags: z.array(z.string()).optional(),
  initial_message: z.object({
    body: z.string().trim().min(1),
    body_html: z.string().optional(),
    is_internal_note: z.boolean().optional(),
    attachments: z.array(z.object({
      file_name: z.string(),
      file_size: z.number(),
      mime_type: z.string(),
      storage_key: z.string().optional(),
      width: z.number().optional(),
      height: z.number().optional(),
    })).optional(),
  }).optional(),
  metadata: z.record(z.any()).optional(),
});

const updateConversationSchema = z.object({
  subject: z.string().trim().min(1).max(255).optional(),
  status: z.enum(['OPEN', 'PENDING_CLIENT', 'PENDING_STUDIO', 'RESOLVED', 'CLOSED', 'ARCHIVED']).optional(),
  priority: z.enum(['LOW', 'NORMAL', 'HIGH', 'URGENT']).optional(),
  category: z.string().optional(),
  assigned_to_user_id: z.string().uuid().nullable().optional(),
  is_starred: z.boolean().optional(),
  tags: z.array(z.string()).optional(),
  metadata: z.record(z.any()).optional(),
});

const sendMessageSchema = z.object({
  body: z.string().trim().min(1),
  body_html: z.string().optional(),
  is_internal_note: z.boolean().optional().default(false),
  sent_via_channel: z.string().optional().default('IN_APP'),
  parent_message_id: z.string().uuid().optional(),
  attachments: z.array(z.object({
    file_name: z.string(),
    file_size: z.number(),
    mime_type: z.string(),
    storage_key: z.string().optional(),
    width: z.number().optional(),
    height: z.number().optional(),
  })).optional(),
  metadata: z.record(z.any()).optional(),
});

const editMessageSchema = z.object({
  body: z.string().trim().min(1),
});

const assignConversationSchema = z.object({
  assigned_to_user_id: z.string().uuid(),
  notes: z.string().optional(),
});

const addParticipantSchema = z.object({
  user_id: z.string().uuid().optional(),
  client_id: z.string().uuid().optional(),
  role: z.string().optional(),
});

const createSavedReplySchema = z.object({
  shortcut: z.string().trim().min(1),
  title: z.string().trim().min(1),
  content: z.string().trim().min(1),
  category: z.string().optional(),
  is_shared: z.boolean().optional(),
});

const updateSavedReplySchema = z.object({
  shortcut: z.string().trim().min(1).optional(),
  title: z.string().trim().min(1).optional(),
  content: z.string().trim().min(1).optional(),
  category: z.string().optional(),
  is_shared: z.boolean().optional(),
});

const createTemplateSchema = z.object({
  name: z.string().trim().min(1),
  subject_template: z.string().trim().optional(),
  body_template: z.string().trim().min(1),
  category: z.string().optional(),
  variables: z.array(z.string()).optional(),
  is_default: z.boolean().optional(),
});

const updateTemplateSchema = z.object({
  name: z.string().trim().min(1).optional(),
  subject_template: z.string().trim().optional(),
  body_template: z.string().trim().min(1).optional(),
  category: z.string().optional(),
  variables: z.array(z.string()).optional(),
  is_default: z.boolean().optional(),
});

const applyTemplateSchema = z.object({
  clientName: z.string().optional(),
  projectName: z.string().optional(),
  galleryName: z.string().optional(),
  orderNumber: z.string().optional(),
  studioName: z.string().optional(),
  deliveryStatus: z.string().optional(),
});

export class CommunicationController {
  /**
   * List conversations
   */
  public static async listConversations(request: FastifyRequest, reply: FastifyReply) {
    const studioId = request.studioId!;
    const query = request.query as any;

    const result = await ClientConversationService.listConversations(studioId, {
      client_id: query.client_id,
      project_id: query.project_id,
      gallery_id: query.gallery_id,
      order_id: query.order_id,
      status: query.status,
      priority: query.priority,
      category: query.category,
      assigned_to_user_id: query.assigned_to_user_id,
      is_starred: query.is_starred !== undefined ? query.is_starred === 'true' : undefined,
      search: query.search,
      tag: query.tag,
      page: query.page ? Number(query.page) : 1,
      limit: query.limit ? Number(query.limit) : 20,
      sort_by: query.sort_by,
      sort_order: query.sort_order,
    });

    return reply.send({ success: true, data: result });
  }

  /**
   * Create conversation
   */
  public static async createConversation(request: FastifyRequest, reply: FastifyReply) {
    const studioId = request.studioId!;
    const userId = request.user?.userId || null;
    const body = createConversationSchema.parse(request.body);

    const conversation = await ClientConversationService.createConversation(
      studioId,
      userId,
      body,
      MessageSenderType.STUDIO_USER,
      request.user?.email || 'Studio Member'
    );

    return reply.status(201).send({ success: true, data: conversation });
  }

  /**
   * Get conversation details
   */
  public static async getConversation(request: FastifyRequest, reply: FastifyReply) {
    const studioId = request.studioId!;
    const { id } = request.params as { id: string };

    const conversation = await ClientConversationService.getConversationById(studioId, id);
    if (!conversation) {
      return reply.status(404).send({ success: false, error: { message: 'Conversation not found.' } });
    }

    // Auto mark read for studio user
    if (request.user?.userId) {
      await ClientConversationService.markConversationRead(
        studioId,
        id,
        'USER',
        request.user.userId
      );
    }

    return reply.send({ success: true, data: conversation });
  }

  /**
   * Update conversation
   */
  public static async updateConversation(request: FastifyRequest, reply: FastifyReply) {
    const studioId = request.studioId!;
    const userId = request.user?.userId || null;
    const { id } = request.params as { id: string };
    const body = updateConversationSchema.parse(request.body);

    const updated = await ClientConversationService.updateConversation(
      studioId,
      id,
      userId,
      body,
      request.user?.email || 'Studio Member'
    );

    return reply.send({ success: true, data: updated });
  }

  /**
   * Assign conversation
   */
  public static async assignConversation(request: FastifyRequest, reply: FastifyReply) {
    const studioId = request.studioId!;
    const userId = request.user?.userId || null;
    const { id } = request.params as { id: string };
    const body = assignConversationSchema.parse(request.body);

    const updated = await ClientConversationService.assignConversation(
      studioId,
      id,
      userId,
      body.assigned_to_user_id,
      body.notes,
      request.user?.email || 'Studio Member'
    );

    return reply.send({ success: true, data: updated });
  }

  /**
   * Resolve conversation
   */
  public static async resolveConversation(request: FastifyRequest, reply: FastifyReply) {
    const studioId = request.studioId!;
    const userId = request.user?.userId;
    const { id } = request.params as { id: string };

    const updated = await ClientConversationService.resolveConversation(
      studioId,
      id,
      userId,
      request.user?.email || 'Studio Member'
    );

    return reply.send({ success: true, data: updated });
  }

  /**
   * Mark conversation read
   */
  public static async markConversationRead(request: FastifyRequest, reply: FastifyReply) {
    const studioId = request.studioId!;
    const userId = request.user?.userId || 'unknown';
    const { id } = request.params as { id: string };

    await ClientConversationService.markConversationRead(studioId, id, 'USER', userId);

    return reply.send({ success: true });
  }

  /**
   * Add participant
   */
  public static async addParticipant(request: FastifyRequest, reply: FastifyReply) {
    const studioId = request.studioId!;
    const userId = request.user?.userId;
    const { id } = request.params as { id: string };
    const body = addParticipantSchema.parse(request.body);

    const participant = await ClientConversationService.addParticipant(
      studioId,
      id,
      body,
      userId,
      request.user?.email || 'Studio Member'
    );

    return reply.status(201).send({ success: true, data: participant });
  }

  /**
   * Remove participant
   */
  public static async removeParticipant(request: FastifyRequest, reply: FastifyReply) {
    const studioId = request.studioId!;
    const userId = request.user?.userId;
    const { id, participantId } = request.params as { id: string; participantId: string };

    const result = await ClientConversationService.removeParticipant(
      studioId,
      id,
      participantId,
      userId,
      request.user?.email || 'Studio Member'
    );

    return reply.send({ success: true, data: result });
  }

  /**
   * Send message in conversation
   */
  public static async sendMessage(request: FastifyRequest, reply: FastifyReply) {
    const studioId = request.studioId!;
    const userId = request.user?.userId;
    const { id } = request.params as { id: string };
    const body = sendMessageSchema.parse(request.body);

    const message = await ClientMessageService.sendMessage(
      studioId,
      id,
      {
        senderType: MessageSenderType.STUDIO_USER,
        userId: userId || null,
        senderName: request.user?.email || 'Studio Member',
        senderEmail: request.user?.email || null,
      },
      body
    );

    return reply.status(201).send({ success: true, data: message });
  }

  /**
   * Edit message
   */
  public static async editMessage(request: FastifyRequest, reply: FastifyReply) {
    const studioId = request.studioId!;
    const userId = request.user?.userId || 'unknown';
    const { id } = request.params as { id: string };
    const body = editMessageSchema.parse(request.body);

    const updated = await ClientMessageService.editMessage(
      studioId,
      id,
      userId,
      body.body,
      request.user?.email || 'Studio Member'
    );

    return reply.send({ success: true, data: updated });
  }

  /**
   * Soft delete message
   */
  public static async deleteMessage(request: FastifyRequest, reply: FastifyReply) {
    const studioId = request.studioId!;
    const userId = request.user?.userId || 'unknown';
    const { id } = request.params as { id: string };

    const result = await ClientMessageService.deleteMessage(
      studioId,
      id,
      userId,
      request.user?.email || 'Studio Member'
    );

    return reply.send({ success: true, data: result });
  }

  /**
   * Star / unstar message
   */
  public static async starMessage(request: FastifyRequest, reply: FastifyReply) {
    const studioId = request.studioId!;
    const { id } = request.params as { id: string };
    const { is_starred } = request.body as { is_starred: boolean };

    const updated = await ClientMessageService.starMessage(studioId, id, !!is_starred);
    return reply.send({ success: true, data: updated });
  }

  /**
   * Saved Replies
   */
  public static async listSavedReplies(request: FastifyRequest, reply: FastifyReply) {
    const studioId = request.studioId!;
    const query = request.query as any;

    const result = await SavedReplyService.getSavedReplies(studioId, {
      category: query.category,
      search: query.search,
      limit: query.limit ? Number(query.limit) : 50,
      offset: query.offset ? Number(query.offset) : 0,
    });

    return reply.send({ success: true, data: result });
  }

  public static async createSavedReply(request: FastifyRequest, reply: FastifyReply) {
    const studioId = request.studioId!;
    const userId = request.user?.userId || 'unknown';
    const body = createSavedReplySchema.parse(request.body);

    const result = await SavedReplyService.createSavedReply(studioId, userId, body);
    return reply.status(201).send({ success: true, data: result });
  }

  public static async updateSavedReply(request: FastifyRequest, reply: FastifyReply) {
    const studioId = request.studioId!;
    const { id } = request.params as { id: string };
    const body = updateSavedReplySchema.parse(request.body);

    const result = await SavedReplyService.updateSavedReply(studioId, id, body);
    return reply.send({ success: true, data: result });
  }

  public static async deleteSavedReply(request: FastifyRequest, reply: FastifyReply) {
    const studioId = request.studioId!;
    const { id } = request.params as { id: string };

    const result = await SavedReplyService.deleteSavedReply(studioId, id);
    return reply.send({ success: true, data: result });
  }

  /**
   * Message Templates
   */
  public static async listTemplates(request: FastifyRequest, reply: FastifyReply) {
    const studioId = request.studioId!;
    const query = request.query as any;

    const result = await MessageTemplateService.getTemplates(studioId, {
      category: query.category,
      search: query.search,
      limit: query.limit ? Number(query.limit) : 50,
      offset: query.offset ? Number(query.offset) : 0,
    });

    return reply.send({ success: true, data: result });
  }

  public static async createTemplate(request: FastifyRequest, reply: FastifyReply) {
    const studioId = request.studioId!;
    const body = createTemplateSchema.parse(request.body);

    const result = await MessageTemplateService.createTemplate(studioId, body);
    return reply.status(201).send({ success: true, data: result });
  }

  public static async getTemplate(request: FastifyRequest, reply: FastifyReply) {
    const studioId = request.studioId!;
    const { id } = request.params as { id: string };

    const result = await MessageTemplateService.getTemplateById(studioId, id);
    if (!result) {
      return reply.status(404).send({ success: false, error: { message: 'Template not found.' } });
    }
    return reply.send({ success: true, data: result });
  }

  public static async updateTemplate(request: FastifyRequest, reply: FastifyReply) {
    const studioId = request.studioId!;
    const { id } = request.params as { id: string };
    const body = updateTemplateSchema.parse(request.body);

    const result = await MessageTemplateService.updateTemplate(studioId, id, body);
    return reply.send({ success: true, data: result });
  }

  public static async deleteTemplate(request: FastifyRequest, reply: FastifyReply) {
    const studioId = request.studioId!;
    const { id } = request.params as { id: string };

    const result = await MessageTemplateService.deleteTemplate(studioId, id);
    return reply.send({ success: true, data: result });
  }

  public static async applyTemplate(request: FastifyRequest, reply: FastifyReply) {
    const studioId = request.studioId!;
    const { id } = request.params as { id: string };
    const body = applyTemplateSchema.parse(request.body);

    const result = await MessageTemplateService.applyTemplate(studioId, id, body);
    return reply.send({ success: true, data: result });
  }

  /**
   * Analytics & Audit
   */
  public static async getAnalytics(request: FastifyRequest, reply: FastifyReply) {
    const studioId = request.studioId!;
    const metrics = await CommunicationAnalyticsService.getAnalytics(studioId);
    return reply.send({ success: true, data: metrics });
  }

  public static async getConversationAudit(request: FastifyRequest, reply: FastifyReply) {
    const studioId = request.studioId!;
    const { id } = request.params as { id: string };
    const query = request.query as any;

    const result = await CommunicationAuditService.getConversationAuditLogs(id, studioId, {
      limit: query.limit ? Number(query.limit) : 50,
      offset: query.offset ? Number(query.offset) : 0,
    });

    return reply.send({ success: true, data: result });
  }

  /**
   * Attachment download proxy
   */
  public static async downloadAttachment(request: FastifyRequest, reply: FastifyReply) {
    const studioId = request.studioId!;
    const { id } = request.params as { id: string };

    const result = await ClientAttachmentService.getAttachmentDownloadUrl(studioId, id);
    return reply.send({ success: true, data: result });
  }
}
