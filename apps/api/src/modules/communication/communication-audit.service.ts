/**
 * Communication Audit Service — PixMatch AI Phase 28
 * Implements immutable auditing for all client-studio conversation activities.
 */

import { prisma } from '@pixmatch/database';
import {
  CommunicationAuditAction,
  MessageSenderType,
  IClientCommunicationAuditLog,
} from '@pixmatch/types';

export interface ILogCommunicationActionOptions {
  conversationId: string;
  studioId: string;
  action: CommunicationAuditAction | string;
  actorType: MessageSenderType | string;
  actorUserId?: string | null;
  actorClientId?: string | null;
  actorName: string;
  details?: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
}

export class CommunicationAuditService {
  /**
   * Records an immutable communication audit entry.
   */
  public static async logAction(
    options: ILogCommunicationActionOptions
  ): Promise<IClientCommunicationAuditLog> {
    const entry = await prisma.clientCommunicationAuditLog.create({
      data: {
        conversation_id: options.conversationId,
        studio_id: options.studioId,
        action: options.action as any,
        actor_type: options.actorType as any,
        actor_user_id: options.actorUserId || null,
        actor_client_id: options.actorClientId || null,
        actor_name: options.actorName,
        details: options.details || null,
        ip_address: options.ipAddress || null,
        user_agent: options.userAgent || null,
      },
    });

    return entry as unknown as IClientCommunicationAuditLog;
  }

  /**
   * Retrieves audit logs for a conversation with pagination.
   */
  public static async getConversationAuditLogs(
    param1: string,
    param2: string,
    options: { limit?: number; offset?: number } = {}
  ): Promise<{ items: IClientCommunicationAuditLog[]; total: number }> {
    const limit = Math.min(Math.max(options.limit || 50, 1), 200);
    const offset = Math.max(options.offset || 0, 0);

    const [items, total] = await Promise.all([
      prisma.clientCommunicationAuditLog.findMany({
        where: {
          OR: [
            { conversation_id: param1, studio_id: param2 },
            { conversation_id: param2, studio_id: param1 },
          ],
        },
        orderBy: { created_at: 'desc' },
        take: limit,
        skip: offset,
      }),
      prisma.clientCommunicationAuditLog.count({
        where: {
          OR: [
            { conversation_id: param1, studio_id: param2 },
            { conversation_id: param2, studio_id: param1 },
          ],
        },
      }),
    ]);

    return {
      items: items as unknown as IClientCommunicationAuditLog[],
      total,
    };
  }
}
