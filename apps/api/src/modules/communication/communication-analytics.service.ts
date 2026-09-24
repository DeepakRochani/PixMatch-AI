/**
 * Communication Analytics Service — PixMatch AI Phase 28
 * Computes KPIs, response time metrics, SLA tracking, and channel activity.
 */

import { prisma } from '@pixmatch/database';
import {
  ConversationStatus,
  ICommunicationAnalyticsDTO,
} from '@pixmatch/types';

export class CommunicationAnalyticsService {
  /**
   * Generates comprehensive communication metrics for a studio.
   */
  public static async getAnalytics(studioId: string): Promise<ICommunicationAnalyticsDTO> {
    const [
      totalConversations,
      openConversations,
      pendingClientConversations,
      pendingStudioConversations,
      resolvedConversations,
      totalMessages,
      totalClientMessages,
      totalStudioMessages,
      totalInternalNotes,
      allConversations,
      uniqueClients,
    ] = await Promise.all([
      prisma.clientConversation.count({ where: { studio_id: studioId } }),
      prisma.clientConversation.count({ where: { studio_id: studioId, status: ConversationStatus.OPEN } }),
      prisma.clientConversation.count({ where: { studio_id: studioId, status: ConversationStatus.PENDING_CLIENT } }),
      prisma.clientConversation.count({ where: { studio_id: studioId, status: ConversationStatus.PENDING_STUDIO } }),
      prisma.clientConversation.count({ where: { studio_id: studioId, status: ConversationStatus.RESOLVED } }),
      prisma.clientMessage.count({ where: { studio_id: studioId, deleted_at: null } }),
      prisma.clientMessage.count({ where: { studio_id: studioId, sender_type: 'CLIENT', deleted_at: null } }),
      prisma.clientMessage.count({ where: { studio_id: studioId, sender_type: 'STUDIO_USER', is_internal_note: false, deleted_at: null } }),
      prisma.clientMessage.count({ where: { studio_id: studioId, is_internal_note: true, deleted_at: null } }),
      prisma.clientConversation.findMany({
        where: { studio_id: studioId },
        select: {
          id: true,
          status: true,
          priority: true,
          category: true,
          unread_studio_count: true,
          created_at: true,
          resolved_at: true,
          messages: {
            where: { deleted_at: null },
            select: {
              sender_type: true,
              is_internal_note: true,
              created_at: true,
            },
            orderBy: { created_at: 'asc' },
          },
        },
      }),
      prisma.clientConversation.findMany({
        where: { studio_id: studioId },
        select: { client_id: true },
        distinct: ['client_id'],
      }),
    ]);

    // Compute Category and Priority distributions
    const conversationsByCategory: Record<string, number> = {};
    const conversationsByPriority: Record<string, number> = {};
    let unansweredCount = 0;
    const responseTimesMinutes: number[] = [];
    const resolutionTimesMinutes: number[] = [];

    for (const conv of allConversations) {
      // Category
      conversationsByCategory[conv.category] = (conversationsByCategory[conv.category] || 0) + 1;

      // Priority
      conversationsByPriority[conv.priority] = (conversationsByPriority[conv.priority] || 0) + 1;

      // Unanswered check
      if (
        (conv.status === ConversationStatus.OPEN || conv.status === ConversationStatus.PENDING_STUDIO) &&
        conv.unread_studio_count > 0
      ) {
        unansweredCount++;
      }

      // Resolution time
      if (conv.resolved_at && conv.created_at) {
        const diffMs = new Date(conv.resolved_at).getTime() - new Date(conv.created_at).getTime();
        if (diffMs > 0) {
          resolutionTimesMinutes.push(diffMs / (1000 * 60));
        }
      }

      // First response time
      const firstClientMsg = conv.messages.find((m) => m.sender_type === 'CLIENT');
      if (firstClientMsg) {
        const firstStudioReply = conv.messages.find(
          (m) =>
            m.sender_type === 'STUDIO_USER' &&
            !m.is_internal_note &&
            new Date(m.created_at).getTime() > new Date(firstClientMsg.created_at).getTime()
        );

        if (firstStudioReply) {
          const diffMs = new Date(firstStudioReply.created_at).getTime() - new Date(firstClientMsg.created_at).getTime();
          if (diffMs > 0) {
            responseTimesMinutes.push(diffMs / (1000 * 60));
          }
        }
      }
    }

    const avgFirstResponse = responseTimesMinutes.length > 0
      ? Math.round(responseTimesMinutes.reduce((a, b) => a + b, 0) / responseTimesMinutes.length)
      : 0;

    const avgResolution = resolutionTimesMinutes.length > 0
      ? Math.round(resolutionTimesMinutes.reduce((a, b) => a + b, 0) / resolutionTimesMinutes.length)
      : 0;

    return {
      total_conversations: totalConversations,
      open_conversations: openConversations,
      pending_client_conversations: pendingClientConversations,
      pending_studio_conversations: pendingStudioConversations,
      resolved_conversations: resolvedConversations,
      total_messages: totalMessages,
      total_client_messages: totalClientMessages,
      total_studio_messages: totalStudioMessages,
      total_internal_notes: totalInternalNotes,
      avg_first_response_time_minutes: avgFirstResponse,
      avg_resolution_time_minutes: avgResolution,
      average_response_time_minutes: avgFirstResponse,
      average_resolution_time_hours: Math.round(avgResolution / 60),
      conversations_by_category: conversationsByCategory,
      conversations_by_priority: conversationsByPriority,
      conversations_by_status: {
        OPEN: openConversations,
        PENDING_CLIENT: pendingClientConversations,
        PENDING_STUDIO: pendingStudioConversations,
        RESOLVED: resolvedConversations,
      },
      active_clients_count: uniqueClients.length,
      unanswered_conversations_count: unansweredCount,
    };
  }
}
