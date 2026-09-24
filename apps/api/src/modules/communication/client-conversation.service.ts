/**
 * Client Conversation Service — PixMatch AI Phase 28
 * Manages the unified conversation hub connecting clients, projects, galleries, proofing, and orders.
 */

import { prisma } from '@pixmatch/database';
import {
  ConversationStatus,
  ConversationPriority,
  MessageSenderType,
  CommunicationAuditAction,
  AutomationTriggerType,
  ICreateConversationDTO,
  IUpdateConversationDTO,
  IConversationFilterDTO,
  IClientConversation,
  IClientConversationParticipant,
} from '@pixmatch/types';
import { CommunicationAuditService } from './communication-audit.service';
import { ClientAttachmentService } from './client-attachment.service';

export interface IGetConversationOptions {
  isClientView?: boolean;
  clientId?: string;
}

export class ClientConversationService {
  /**
   * Create a new conversation thread.
   */
  public static async createConversation(
    studioId: string,
    userId: string | null,
    data: ICreateConversationDTO,
    actorType: MessageSenderType = MessageSenderType.STUDIO_USER,
    actorName: string = 'Studio Member'
  ): Promise<IClientConversation> {
    if (!data.client_id || !data.subject) {
      throw new Error('Client ID and subject are required.');
    }

    // Verify client belongs to studio
    const client = await prisma.client.findFirst({
      where: { id: data.client_id, studio_id: studioId },
    });

    if (!client) {
      throw new Error('Client not found in this studio.');
    }

    // Verify project/gallery/order if provided
    if (data.project_id) {
      const proj = await prisma.studioProject.findFirst({
        where: { id: data.project_id, studio_id: studioId },
      });
      if (!proj) throw new Error('Project not found in this studio.');
    }

    if (data.gallery_id) {
      const gal = await prisma.gallery.findFirst({
        where: { id: data.gallery_id, studio_id: studioId },
      });
      if (!gal) throw new Error('Gallery not found in this studio.');
    }

    if (data.order_id) {
      const ord = await prisma.fulfillmentOrder.findFirst({
        where: { id: data.order_id, studio_id: studioId },
      });
      if (!ord) throw new Error('Order not found in this studio.');
    }

    const conversation = await prisma.clientConversation.create({
      data: {
        studio_id: studioId,
        client_id: data.client_id,
        project_id: data.project_id || null,
        gallery_id: data.gallery_id || null,
        order_id: data.order_id || null,
        subject: data.subject.trim(),
        status: (data.status as any) || ConversationStatus.OPEN,
        priority: (data.priority as any) || ConversationPriority.NORMAL,
        category: (data.category || 'GENERAL').toUpperCase(),
        assigned_to_user_id: data.assigned_to_user_id || userId || null,
        tags: data.tags || [],
        metadata: data.metadata || null,
      },
    });

    // Add Client as participant
    await prisma.clientConversationParticipant.create({
      data: {
        conversation_id: conversation.id,
        studio_id: studioId,
        client_id: data.client_id,
        role: 'CLIENT',
      },
    });

    // Add User as participant if provided
    if (userId) {
      await prisma.clientConversationParticipant.create({
        data: {
          conversation_id: conversation.id,
          studio_id: studioId,
          user_id: userId,
          role: 'OWNER',
        },
      });
    }

    // Add assigned user if different
    if (data.assigned_to_user_id && data.assigned_to_user_id !== userId) {
      await prisma.clientConversationParticipant.create({
        data: {
          conversation_id: conversation.id,
          studio_id: studioId,
          user_id: data.assigned_to_user_id,
          role: 'ASSIGNEE',
        },
      });

      await prisma.clientCommunicationAssignment.create({
        data: {
          conversation_id: conversation.id,
          studio_id: studioId,
          assigned_to_user_id: data.assigned_to_user_id,
          assigned_by_user_id: userId,
          notes: 'Initial assignment upon conversation creation',
        },
      });
    }

    // Log creation audit
    await CommunicationAuditService.logAction({
      conversationId: conversation.id,
      studioId,
      action: CommunicationAuditAction.CONVERSATION_CREATED,
      actorType,
      actorUserId: userId,
      actorClientId: actorType === MessageSenderType.CLIENT ? data.client_id : null,
      actorName,
      details: { subject: data.subject, client_id: data.client_id },
    });

    // Handle initial message if supplied
    if (data.initial_message && data.initial_message.body) {
      const isInternal = !!data.initial_message.is_internal_note;
      const initialMsg = await prisma.clientMessage.create({
        data: {
          conversation_id: conversation.id,
          studio_id: studioId,
          sender_type: actorType as any,
          sender_user_id: userId,
          sender_client_id: actorType === MessageSenderType.CLIENT ? data.client_id : null,
          sender_name: actorName,
          sender_email: actorType === MessageSenderType.CLIENT ? client.email : null,
          body: data.initial_message.body.trim(),
          body_html: data.initial_message.body_html || null,
          is_internal_note: isInternal,
        },
      });

      if (data.initial_message.attachments && data.initial_message.attachments.length > 0) {
        await ClientAttachmentService.attachFilesToMessage(
          studioId,
          initialMsg.id,
          data.initial_message.attachments
        );
      }

      await prisma.clientConversation.update({
        where: { id: conversation.id },
        data: {
          last_message_at: new Date(),
          last_message_preview: data.initial_message.body.trim().substring(0, 150),
          unread_client_count: actorType !== MessageSenderType.CLIENT && !isInternal ? 1 : 0,
          unread_studio_count: actorType === MessageSenderType.CLIENT ? 1 : 0,
        },
      });
    }

    return (await this.getConversationById(studioId, conversation.id))!;
  }

  /**
   * Get single conversation by ID with rich details.
   */
  public static async getConversationById(
    studioId: string,
    conversationId: string,
    options: IGetConversationOptions = {}
  ): Promise<IClientConversation | null> {
    const where: any = {
      id: conversationId,
      studio_id: studioId,
    };

    if (options.isClientView && options.clientId) {
      where.client_id = options.clientId;
    }

    const conversation = await prisma.clientConversation.findFirst({
      where,
      include: {
        client: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            company: true,
            avatar_url: true,
          },
        },
        project: {
          select: {
            id: true,
            name: true,
            status: true,
          },
        },
        gallery: {
          select: {
            id: true,
            title: true,
            slug: true,
          },
        },
        order: {
          select: {
            id: true,
            order_number: true,
            status: true,
            total_amount: true,
          },
        },
        assigned_to: {
          select: {
            id: true,
            first_name: true,
            last_name: true,
            email: true,
            avatar_url: true,
          },
        },
        participants: {
          include: {
            user: {
              select: {
                id: true,
                first_name: true,
                last_name: true,
                email: true,
                avatar_url: true,
              },
            },
            client: {
              select: {
                id: true,
                name: true,
                email: true,
                phone: true,
              },
            },
          },
        },
        messages: {
          where: options.isClientView
            ? { is_internal_note: false, deleted_at: null }
            : { deleted_at: null },
          orderBy: { created_at: 'asc' },
          include: {
            attachments: {
              where: { status: { not: 'DELETED' } },
            },
            reads: true,
          },
        },
      },
    });

    if (!conversation) return null;

    const messageCount = await prisma.clientMessage.count({
      where: options.isClientView
        ? { conversation_id: conversationId, is_internal_note: false, deleted_at: null }
        : { conversation_id: conversationId, deleted_at: null },
    });

    return {
      ...(conversation as unknown as IClientConversation),
      message_count: messageCount,
    };
  }

  /**
   * List conversations with search, filters, and pagination.
   */
  public static async listConversations(
    studioId: string,
    filters: IConversationFilterDTO = {}
  ): Promise<{ items: IClientConversation[]; total: number; page: number; limit: number; total_pages: number }> {
    const page = Math.max(Number(filters.page) || 1, 1);
    const limit = Math.min(Math.max(Number(filters.limit) || 20, 1), 100);
    const offset = (page - 1) * limit;

    const where: any = { studio_id: studioId };

    if (filters.client_id) where.client_id = filters.client_id;
    if (filters.project_id) where.project_id = filters.project_id;
    if (filters.gallery_id) where.gallery_id = filters.gallery_id;
    if (filters.order_id) where.order_id = filters.order_id;
    if (filters.assigned_to_user_id) where.assigned_to_user_id = filters.assigned_to_user_id;
    if (filters.is_starred !== undefined) where.is_starred = filters.is_starred;
    if (filters.status && filters.status !== 'ALL') where.status = filters.status as any;
    if (filters.priority && filters.priority !== 'ALL') where.priority = filters.priority as any;
    if (filters.category && filters.category !== 'ALL') where.category = filters.category.toUpperCase();
    if (filters.tag) where.tags = { has: filters.tag };

    if (filters.search) {
      where.OR = [
        { subject: { contains: filters.search, mode: 'insensitive' } },
        { last_message_preview: { contains: filters.search, mode: 'insensitive' } },
        { client: { name: { contains: filters.search, mode: 'insensitive' } } },
        { client: { email: { contains: filters.search, mode: 'insensitive' } } },
      ];
    }

    let orderBy: any = { last_message_at: 'desc' };
    if (filters.sort_by === 'created_at') orderBy = { created_at: filters.sort_order || 'desc' };
    else if (filters.sort_by === 'priority') orderBy = { priority: filters.sort_order || 'desc' };
    else if (filters.sort_by === 'status') orderBy = { status: filters.sort_order || 'asc' };
    else if (filters.sort_by === 'last_message_at') orderBy = { last_message_at: filters.sort_order || 'desc' };

    const [items, total] = await Promise.all([
      prisma.clientConversation.findMany({
        where,
        orderBy,
        take: limit,
        skip: offset,
        include: {
          client: {
            select: {
              id: true,
              name: true,
              email: true,
              phone: true,
              company: true,
              avatar_url: true,
            },
          },
          project: {
            select: {
              id: true,
              name: true,
              status: true,
            },
          },
          gallery: {
            select: {
              id: true,
              title: true,
              slug: true,
            },
          },
          order: {
            select: {
              id: true,
              order_number: true,
              status: true,
              total_amount: true,
            },
          },
          assigned_to: {
            select: {
              id: true,
              first_name: true,
              last_name: true,
              email: true,
              avatar_url: true,
            },
          },
        },
      }),
      prisma.clientConversation.count({ where }),
    ]);

    return {
      items: items as unknown as IClientConversation[],
      total,
      page,
      limit,
      total_pages: Math.ceil(total / limit) || 1,
    };
  }

  /**
   * Update conversation metadata, status, priority, or tags.
   */
  public static async updateConversation(
    studioId: string,
    conversationId: string,
    userId: string | null,
    data: IUpdateConversationDTO,
    actorName: string = 'Studio Member'
  ): Promise<IClientConversation> {
    const conversation = await prisma.clientConversation.findFirst({
      where: { id: conversationId, studio_id: studioId },
    });

    if (!conversation) {
      throw new Error('Conversation not found.');
    }

    const updateData: any = {};
    if (data.subject !== undefined) updateData.subject = data.subject.trim();
    if (data.category !== undefined) updateData.category = data.category.toUpperCase();
    if (data.is_starred !== undefined) updateData.is_starred = data.is_starred;
    if (data.tags !== undefined) updateData.tags = data.tags;
    if (data.metadata !== undefined) updateData.metadata = data.metadata;

    if (data.priority !== undefined && data.priority !== conversation.priority) {
      updateData.priority = data.priority as any;
      await CommunicationAuditService.logAction({
        conversationId,
        studioId,
        action: CommunicationAuditAction.PRIORITY_CHANGED,
        actorType: MessageSenderType.STUDIO_USER,
        actorUserId: userId,
        actorName,
        details: { old_priority: conversation.priority, new_priority: data.priority },
      });
    }

    if (data.status !== undefined && data.status !== conversation.status) {
      updateData.status = data.status as any;
      if (data.status === ConversationStatus.RESOLVED) {
        updateData.resolved_at = new Date();
        updateData.resolved_by_user_id = userId;
      } else {
        updateData.resolved_at = null;
        updateData.resolved_by_user_id = null;
      }

      await CommunicationAuditService.logAction({
        conversationId,
        studioId,
        action: CommunicationAuditAction.STATUS_CHANGED,
        actorType: MessageSenderType.STUDIO_USER,
        actorUserId: userId,
        actorName,
        details: { old_status: conversation.status, new_status: data.status },
      });

      // Automation trigger for CONVERSATION_RESOLVED
      if (data.status === ConversationStatus.RESOLVED) {
        try {
          const rules = await prisma.automationRule.findMany({
            where: {
              studio_id: studioId,
              trigger_type: AutomationTriggerType.CONVERSATION_RESOLVED as any,
              is_active: true,
            },
          });
          for (const rule of rules) {
            await prisma.automationRun.create({
              data: {
                studio_id: studioId,
                rule_id: rule.id,
                trigger_type: AutomationTriggerType.CONVERSATION_RESOLVED as any,
                status: 'COMPLETED',
                logs: { conversation_id: conversationId, subject: conversation.subject },
              },
            });
          }
        } catch {
          // non-blocking
        }
      }
    }

    if (data.assigned_to_user_id !== undefined && data.assigned_to_user_id !== conversation.assigned_to_user_id) {
      await this.assignConversation(
        studioId,
        conversationId,
        userId,
        data.assigned_to_user_id,
        'Updated via conversation update'
      );
    }

    const updated = await prisma.clientConversation.update({
      where: { id: conversationId },
      data: updateData,
    });

    return (await this.getConversationById(studioId, updated.id))!;
  }

  /**
   * Assign conversation to a staff member.
   */
  public static async assignConversation(
    studioId: string,
    conversationId: string,
    assignedByUserId: string | null,
    assignedToUserId: string | null,
    notes?: string,
    actorName: string = 'Studio Member'
  ): Promise<IClientConversation> {
    const conversation = await prisma.clientConversation.findFirst({
      where: { id: conversationId, studio_id: studioId },
    });

    if (!conversation) {
      throw new Error('Conversation not found.');
    }

    if (assignedToUserId) {
      // Verify user exists
      const targetUser = await prisma.user.findUnique({
        where: { id: assignedToUserId },
      });
      if (!targetUser) {
        throw new Error('Assigned user does not exist.');
      }

      await prisma.clientCommunicationAssignment.create({
        data: {
          conversation_id: conversationId,
          studio_id: studioId,
          assigned_to_user_id: assignedToUserId,
          assigned_by_user_id: assignedByUserId,
          notes: notes || null,
        },
      });

      // Ensure user is added as participant
      await prisma.clientConversationParticipant.upsert({
        where: {
          conversation_id_user_id: {
            conversation_id: conversationId,
            user_id: assignedToUserId,
          },
        },
        create: {
          conversation_id: conversationId,
          studio_id: studioId,
          user_id: assignedToUserId,
          role: 'ASSIGNEE',
        },
        update: {
          role: 'ASSIGNEE',
        },
      });
    }

    await prisma.clientConversation.update({
      where: { id: conversationId },
      data: { assigned_to_user_id: assignedToUserId },
    });

    await CommunicationAuditService.logAction({
      conversationId,
      studioId,
      action: CommunicationAuditAction.ASSIGNED,
      actorType: MessageSenderType.STUDIO_USER,
      actorUserId: assignedByUserId,
      actorName,
      details: { assigned_to: assignedToUserId, notes },
    });

    return (await this.getConversationById(studioId, conversationId))!;
  }

  /**
   * Add a participant (staff member or client contact) to a conversation.
   */
  public static async addParticipant(
    studioId: string,
    conversationId: string,
    data: { user_id?: string; client_id?: string; role?: string },
    actorUserId?: string,
    actorName: string = 'Studio Member'
  ): Promise<IClientConversationParticipant> {
    const conversation = await prisma.clientConversation.findFirst({
      where: { id: conversationId, studio_id: studioId },
    });

    if (!conversation) {
      throw new Error('Conversation not found.');
    }

    if (!data.user_id && !data.client_id) {
      throw new Error('Either user_id or client_id must be provided.');
    }

    let participant;
    if (data.user_id) {
      participant = await prisma.clientConversationParticipant.upsert({
        where: {
          conversation_id_user_id: {
            conversation_id: conversationId,
            user_id: data.user_id,
          },
        },
        create: {
          conversation_id: conversationId,
          studio_id: studioId,
          user_id: data.user_id,
          role: data.role || 'MEMBER',
        },
        update: {
          role: data.role || 'MEMBER',
        },
      });
    } else if (data.client_id) {
      participant = await prisma.clientConversationParticipant.upsert({
        where: {
          conversation_id_client_id: {
            conversation_id: conversationId,
            client_id: data.client_id,
          },
        },
        create: {
          conversation_id: conversationId,
          studio_id: studioId,
          client_id: data.client_id,
          role: data.role || 'CLIENT',
        },
        update: {
          role: data.role || 'CLIENT',
        },
      });
    }

    await CommunicationAuditService.logAction({
      conversationId,
      studioId,
      action: CommunicationAuditAction.PARTICIPANT_ADDED,
      actorType: MessageSenderType.STUDIO_USER,
      actorUserId,
      actorName,
      details: { participant_user_id: data.user_id, participant_client_id: data.client_id },
    });

    return participant as unknown as IClientConversationParticipant;
  }

  /**
   * Remove a participant.
   */
  public static async removeParticipant(
    studioId: string,
    conversationId: string,
    participantId: string,
    actorUserId?: string,
    actorName: string = 'Studio Member'
  ): Promise<{ success: boolean }> {
    const part = await prisma.clientConversationParticipant.findFirst({
      where: { id: participantId, conversation_id: conversationId, studio_id: studioId },
    });

    if (!part) {
      throw new Error('Participant not found.');
    }

    await prisma.clientConversationParticipant.delete({
      where: { id: participantId },
    });

    await CommunicationAuditService.logAction({
      conversationId,
      studioId,
      action: CommunicationAuditAction.PARTICIPANT_REMOVED,
      actorType: MessageSenderType.STUDIO_USER,
      actorUserId,
      actorName,
      details: { removed_participant_id: participantId },
    });

    return { success: true };
  }

  /**
   * Resolve a conversation.
   */
  public static async resolveConversation(
    studioId: string,
    conversationId: string,
    userId?: string,
    actorName: string = 'Studio Member'
  ): Promise<IClientConversation> {
    return this.updateConversation(
      studioId,
      conversationId,
      userId || null,
      { status: ConversationStatus.RESOLVED },
      actorName
    );
  }

  /**
   * Mark all unread messages in a conversation as read by a reader (user or client).
   */
  public static async markConversationRead(
    studioId: string,
    conversationId: string,
    readerType: 'USER' | 'CLIENT',
    readerId: string
  ): Promise<void> {
    const conversation = await prisma.clientConversation.findFirst({
      where: { id: conversationId, studio_id: studioId },
    });

    if (!conversation) return;

    if (readerType === 'USER') {
      await prisma.clientConversation.update({
        where: { id: conversationId },
        data: { unread_studio_count: 0 },
      });

      await prisma.clientConversationParticipant.updateMany({
        where: { conversation_id: conversationId, user_id: readerId },
        data: { last_read_at: new Date() },
      });
    } else {
      await prisma.clientConversation.update({
        where: { id: conversationId },
        data: { unread_client_count: 0 },
      });

      await prisma.clientConversationParticipant.updateMany({
        where: { conversation_id: conversationId, client_id: readerId },
        data: { last_read_at: new Date() },
      });
    }
  }

  /**
   * Delete a conversation.
   */
  public static async deleteConversation(
    studioId: string,
    conversationId: string,
    userId?: string,
    actorName: string = 'Studio Member'
  ): Promise<{ success: boolean }> {
    const conversation = await prisma.clientConversation.findFirst({
      where: { id: conversationId, studio_id: studioId },
    });

    if (!conversation) {
      throw new Error('Conversation not found.');
    }

    await prisma.clientConversationParticipant.deleteMany({
      where: { conversation_id: conversationId },
    });

    await prisma.clientCommunicationAssignment.deleteMany({
      where: { conversation_id: conversationId },
    });

    await prisma.clientConversation.delete({
      where: { id: conversationId },
    });

    await CommunicationAuditService.logAction({
      conversationId,
      studioId,
      action: CommunicationAuditAction.CONVERSATION_ARCHIVED,
      actorType: MessageSenderType.STUDIO_USER,
      actorUserId: userId || null,
      actorName,
      details: { deleted_conversation_id: conversationId },
    });

    return { success: true };
  }
}
