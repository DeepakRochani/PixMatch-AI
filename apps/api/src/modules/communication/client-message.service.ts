/**
 * Client Message Service — PixMatch AI Phase 28
 * Manages sending, threading, editing, soft-deletion, rate limiting, and cross-phase triggers for messages.
 */

import { prisma } from '@pixmatch/database';
import {
  MessageSenderType,
  MessageDeliveryStatus,
  CommunicationAuditAction,
  AutomationTriggerType,
  ConversationStatus,
  ISendMessageDTO,
  IClientMessage,
} from '@pixmatch/types';
import { CommunicationAuditService } from './communication-audit.service';
import { ClientAttachmentService } from './client-attachment.service';

// In-memory rate limiting and deduplication tracker
interface IRateLimitRecord {
  lastMessageTime: number;
  lastMessageBodyHash: string;
  messageTimestamps: number[];
}

const rateLimitMap = new Map<string, IRateLimitRecord>();

export interface ISendMessageSenderInfo {
  senderType: MessageSenderType | string;
  userId?: string | null;
  clientId?: string | null;
  senderName: string;
  senderEmail?: string | null;
}

export class ClientMessageService {
  /**
   * Rate limiting and anti-spam check.
   * Throws an error if sending too fast (>20 msgs/min) or sending duplicate message within 3 seconds.
   */
  public static checkRateLimitAndSpam(
    senderKey: string,
    messageBody: string
  ): void {
    const now = Date.now();
    const record = rateLimitMap.get(senderKey) || {
      lastMessageTime: 0,
      lastMessageBodyHash: '',
      messageTimestamps: [],
    };

    // 1. Duplicate check (within 3 seconds)
    const normalizedBody = messageBody.trim().toLowerCase();
    if (
      record.lastMessageBodyHash === normalizedBody &&
      now - record.lastMessageTime < 3000
    ) {
      throw new Error('Duplicate message detected. Please wait a moment before sending again.');
    }

    // 2. Frequency check (max 20 messages per 60 seconds)
    const recentTimestamps = record.messageTimestamps.filter((ts) => now - ts < 60000);
    if (recentTimestamps.length >= 20) {
      throw new Error('Message rate limit exceeded. You can send a maximum of 20 messages per minute.');
    }

    recentTimestamps.push(now);
    rateLimitMap.set(senderKey, {
      lastMessageTime: now,
      lastMessageBodyHash: normalizedBody,
      messageTimestamps: recentTimestamps,
    });
  }

  /**
   * Send a message in a conversation thread.
   */
  public static async sendMessage(
    studioId: string,
    conversationId: string,
    sender: ISendMessageSenderInfo,
    data: ISendMessageDTO
  ): Promise<IClientMessage> {
    if (!data.body || data.body.trim().length === 0) {
      throw new Error('Message body cannot be empty.');
    }

    const conversation = await prisma.clientConversation.findFirst({
      where: { id: conversationId, studio_id: studioId },
      include: {
        client: true,
      },
    });

    if (!conversation) {
      throw new Error('Conversation not found.');
    }

    const isClientSender = sender.senderType === MessageSenderType.CLIENT;
    const isInternalNote = isClientSender ? false : !!data.is_internal_note;

    // Run spam / rate limiting check
    const senderKey = isClientSender
      ? `client_${sender.clientId || conversation.client_id}`
      : `user_${sender.userId || 'anon'}`;
    this.checkRateLimitAndSpam(senderKey, data.body);

    // Create the message
    const message = await prisma.clientMessage.create({
      data: {
        conversation_id: conversationId,
        studio_id: studioId,
        sender_type: sender.senderType as any,
        sender_user_id: sender.userId || null,
        sender_client_id: isClientSender ? (sender.clientId || conversation.client_id) : null,
        sender_name: sender.senderName,
        sender_email: sender.senderEmail || (isClientSender ? conversation.client.email : null),
        body: data.body.trim(),
        body_html: data.body_html || null,
        is_internal_note: isInternalNote,
        sent_via_channel: data.sent_via_channel || (isClientSender ? 'PORTAL' : 'IN_APP'),
        delivery_status: MessageDeliveryStatus.SENT,
        parent_message_id: data.parent_message_id || null,
        metadata: data.metadata || null,
      },
    });

    // Handle attachments
    if (data.attachments && data.attachments.length > 0) {
      await ClientAttachmentService.attachFilesToMessage(
        studioId,
        message.id,
        data.attachments
      );
    }

    // Update conversation metadata & unread counters
    const updateConvData: any = {
      last_message_at: new Date(),
      last_message_preview: isInternalNote
        ? conversation.last_message_preview
        : data.body.trim().substring(0, 150),
    };

    if (isClientSender) {
      updateConvData.unread_studio_count = { increment: 1 };
      if (
        conversation.status === ConversationStatus.RESOLVED ||
        conversation.status === ConversationStatus.CLOSED
      ) {
        updateConvData.status = ConversationStatus.OPEN;
      } else {
        updateConvData.status = ConversationStatus.PENDING_STUDIO;
      }
    } else if (!isInternalNote) {
      updateConvData.unread_client_count = { increment: 1 };
      updateConvData.status = ConversationStatus.PENDING_CLIENT;
    }

    await prisma.clientConversation.update({
      where: { id: conversationId },
      data: updateConvData,
    });

    // Audit log
    await CommunicationAuditService.logAction({
      conversationId,
      studioId,
      action: CommunicationAuditAction.MESSAGE_SENT,
      actorType: sender.senderType,
      actorUserId: sender.userId,
      actorClientId: isClientSender ? (sender.clientId || conversation.client_id) : null,
      actorName: sender.senderName,
      details: {
        message_id: message.id,
        is_internal_note: isInternalNote,
        has_attachments: !!(data.attachments && data.attachments.length > 0),
      },
    });

    // Automation Trigger Dispatch
    try {
      const triggerType = isClientSender
        ? AutomationTriggerType.CLIENT_MESSAGE_RECEIVED
        : AutomationTriggerType.STUDIO_MESSAGE_RECEIVED;

      const rules = await prisma.automationRule.findMany({
        where: {
          studio_id: studioId,
          trigger_type: triggerType as any,
          is_active: true,
        },
      });

      for (const rule of rules) {
        await prisma.automationRun.create({
          data: {
            studio_id: studioId,
            rule_id: rule.id,
            trigger_type: triggerType as any,
            status: 'COMPLETED',
            logs: {
              conversation_id: conversationId,
              message_id: message.id,
              sender_name: sender.senderName,
              preview: data.body.substring(0, 100),
            },
          },
        });
      }
    } catch {
      // Non-blocking automation handler
    }

    return (await this.getMessageById(studioId, message.id))!;
  }

  /**
   * Get message by ID including attachments and reads.
   */
  public static async getMessageById(
    studioId: string,
    messageId: string
  ): Promise<IClientMessage | null> {
    const message = await prisma.clientMessage.findFirst({
      where: { id: messageId, studio_id: studioId },
      include: {
        attachments: {
          where: { status: { not: 'DELETED' } },
        },
        reads: true,
      },
    });

    return message as unknown as IClientMessage | null;
  }

  /**
   * Edit a message.
   */
  public static async editMessage(
    studioId: string,
    messageId: string,
    userId: string,
    newBody: string,
    actorName: string = 'Studio Member'
  ): Promise<IClientMessage> {
    const message = await prisma.clientMessage.findFirst({
      where: { id: messageId, studio_id: studioId },
    });

    if (!message) {
      throw new Error('Message not found.');
    }

    if (message.deleted_at) {
      throw new Error('Cannot edit a deleted message.');
    }

    if (!newBody || newBody.trim().length === 0) {
      throw new Error('Message body cannot be empty.');
    }

    const updated = await prisma.clientMessage.update({
      where: { id: messageId },
      data: {
        body: newBody.trim(),
        edited_at: new Date(),
      },
    });

    await CommunicationAuditService.logAction({
      conversationId: message.conversation_id,
      studioId,
      action: CommunicationAuditAction.MESSAGE_EDITED,
      actorType: MessageSenderType.STUDIO_USER,
      actorUserId: userId,
      actorName,
      details: { message_id: messageId },
    });

    return (await this.getMessageById(studioId, updated.id))!;
  }

  /**
   * Soft delete a message.
   */
  public static async deleteMessage(
    studioId: string,
    messageId: string,
    userId: string,
    actorName: string = 'Studio Member'
  ): Promise<{ success: boolean }> {
    const message = await prisma.clientMessage.findFirst({
      where: { id: messageId, studio_id: studioId },
    });

    if (!message) {
      throw new Error('Message not found.');
    }

    await prisma.clientMessage.update({
      where: { id: messageId },
      data: { deleted_at: new Date() },
    });

    await CommunicationAuditService.logAction({
      conversationId: message.conversation_id,
      studioId,
      action: CommunicationAuditAction.MESSAGE_DELETED,
      actorType: MessageSenderType.STUDIO_USER,
      actorUserId: userId,
      actorName,
      details: { message_id: messageId },
    });

    return { success: true };
  }

  /**
   * Star / Unstar a message.
   */
  public static async starMessage(
    studioId: string,
    messageId: string,
    isStarred: boolean
  ): Promise<IClientMessage> {
    const message = await prisma.clientMessage.findFirst({
      where: { id: messageId, studio_id: studioId },
    });

    if (!message) {
      throw new Error('Message not found.');
    }

    const updated = await prisma.clientMessage.update({
      where: { id: messageId },
      data: { is_starred: isStarred },
    });

    return (await this.getMessageById(studioId, updated.id))!;
  }

  /**
   * Mark an individual message as read.
   */
  public static async markMessageRead(
    studioId: string,
    messageId: string,
    readerType: 'USER' | 'CLIENT',
    readerId: string,
    metadata?: { ipAddress?: string; userAgent?: string }
  ): Promise<void> {
    const message = await prisma.clientMessage.findFirst({
      where: { id: messageId, studio_id: studioId },
    });

    if (!message) return;

    await prisma.clientMessageRead.create({
      data: {
        message_id: messageId,
        studio_id: studioId,
        read_by_user_id: readerType === 'USER' ? readerId : null,
        read_by_client_id: readerType === 'CLIENT' ? readerId : null,
        ip_address: metadata?.ipAddress || null,
        user_agent: metadata?.userAgent || null,
      },
    });

    // Update message status to READ
    await prisma.clientMessage.update({
      where: { id: messageId },
      data: { delivery_status: MessageDeliveryStatus.READ },
    });
  }

  /**
   * Mark an individual message as read (helper supporting object options).
   */
  public static async markMessageAsRead(
    studioId: string,
    messageId: string,
    options: { userId?: string; clientId?: string; readerType?: 'USER' | 'CLIENT'; ipAddress?: string; userAgent?: string } = {}
  ): Promise<{ success: boolean }> {
    const readerType = options.readerType || (options.userId ? 'USER' : 'CLIENT');
    const readerId = (options.userId || options.clientId || 'anonymous');
    await this.markMessageRead(studioId, messageId, readerType, readerId, {
      ipAddress: options.ipAddress,
      userAgent: options.userAgent,
    });
    return { success: true };
  }
}
