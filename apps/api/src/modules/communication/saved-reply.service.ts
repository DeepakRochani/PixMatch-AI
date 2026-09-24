/**
 * Saved Reply Service — PixMatch AI Phase 28
 * Manages studio saved replies / canned responses with fast shortcut insertion.
 */

import { prisma } from '@pixmatch/database';
import {
  ICreateSavedReplyDTO,
  IUpdateSavedReplyDTO,
  IClientSavedReply,
} from '@pixmatch/types';

export class SavedReplyService {
  /**
   * Normalize shortcut to standard format (e.g. "pricing" or "/pricing" -> "/pricing")
   */
  public static normalizeShortcut(shortcut: string): string {
    const trimmed = shortcut.trim().toLowerCase();
    return trimmed.startsWith('/') ? trimmed : `/${trimmed}`;
  }

  /**
   * Create a new saved reply.
   */
  public static async createSavedReply(
    studioId: string,
    userId: string,
    data: ICreateSavedReplyDTO
  ): Promise<IClientSavedReply> {
    if (!data.shortcut || !data.title || !data.content) {
      throw new Error('Shortcut, title, and content are required.');
    }

    const shortcut = this.normalizeShortcut(data.shortcut);

    // Check for existing shortcut in studio
    const existing = await prisma.clientSavedReply.findUnique({
      where: {
        studio_id_shortcut: {
          studio_id: studioId,
          shortcut,
        },
      },
    });

    if (existing) {
      throw new Error(`A saved reply with shortcut '${shortcut}' already exists in this studio.`);
    }

    const reply = await prisma.clientSavedReply.create({
      data: {
        studio_id: studioId,
        shortcut,
        title: data.title.trim(),
        content: data.content.trim(),
        category: (data.category || 'GENERAL').toUpperCase(),
        created_by_user_id: userId,
        is_shared: data.is_shared !== undefined ? data.is_shared : true,
      },
    });

    return reply as unknown as IClientSavedReply;
  }

  /**
   * List saved replies for a studio.
   */
  public static async getSavedReplies(
    studioId: string,
    options: { category?: string; search?: string; limit?: number; offset?: number } = {}
  ): Promise<{ items: IClientSavedReply[]; total: number }> {
    const limit = Math.min(Math.max(options.limit || 50, 1), 200);
    const offset = Math.max(options.offset || 0, 0);

    const where: any = { studio_id: studioId };

    if (options.category && options.category !== 'ALL') {
      where.category = options.category.toUpperCase();
    }

    if (options.search) {
      where.OR = [
        { title: { contains: options.search, mode: 'insensitive' } },
        { shortcut: { contains: options.search, mode: 'insensitive' } },
        { content: { contains: options.search, mode: 'insensitive' } },
      ];
    }

    const [items, total] = await Promise.all([
      prisma.clientSavedReply.findMany({
        where,
        orderBy: [{ usage_count: 'desc' }, { created_at: 'desc' }],
        take: limit,
        skip: offset,
      }),
      prisma.clientSavedReply.count({ where }),
    ]);

    return {
      items: items as unknown as IClientSavedReply[],
      total,
    };
  }

  /**
   * Get a saved reply by shortcut.
   */
  public static async getSavedReplyByShortcut(
    studioId: string,
    shortcut: string
  ): Promise<IClientSavedReply | null> {
    const normalized = this.normalizeShortcut(shortcut);
    const reply = await prisma.clientSavedReply.findUnique({
      where: {
        studio_id_shortcut: {
          studio_id: studioId,
          shortcut: normalized,
        },
      },
    });

    return reply as unknown as IClientSavedReply | null;
  }

  /**
   * Update a saved reply.
   */
  public static async updateSavedReply(
    studioId: string,
    replyId: string,
    data: IUpdateSavedReplyDTO
  ): Promise<IClientSavedReply> {
    const reply = await prisma.clientSavedReply.findFirst({
      where: { id: replyId, studio_id: studioId },
    });

    if (!reply) {
      throw new Error('Saved reply not found.');
    }

    const updateData: any = {};
    if (data.title !== undefined) updateData.title = data.title.trim();
    if (data.content !== undefined) updateData.content = data.content.trim();
    if (data.category !== undefined) updateData.category = data.category.toUpperCase();
    if (data.is_shared !== undefined) updateData.is_shared = data.is_shared;

    if (data.shortcut !== undefined) {
      const normalized = this.normalizeShortcut(data.shortcut);
      if (normalized !== reply.shortcut) {
        const existing = await prisma.clientSavedReply.findUnique({
          where: {
            studio_id_shortcut: {
              studio_id: studioId,
              shortcut: normalized,
            },
          },
        });
        if (existing && existing.id !== replyId) {
          throw new Error(`A saved reply with shortcut '${normalized}' already exists.`);
        }
        updateData.shortcut = normalized;
      }
    }

    const updated = await prisma.clientSavedReply.update({
      where: { id: replyId },
      data: updateData,
    });

    return updated as unknown as IClientSavedReply;
  }

  /**
   * Delete a saved reply.
   */
  public static async deleteSavedReply(
    studioId: string,
    replyId: string
  ): Promise<{ success: boolean }> {
    const reply = await prisma.clientSavedReply.findFirst({
      where: { id: replyId, studio_id: studioId },
    });

    if (!reply) {
      throw new Error('Saved reply not found.');
    }

    await prisma.clientSavedReply.delete({
      where: { id: replyId },
    });

    return { success: true };
  }

  /**
   * Increment usage count when a saved reply is used.
   */
  public static async incrementUsage(
    studioId: string,
    replyId: string
  ): Promise<void> {
    await prisma.clientSavedReply.updateMany({
      where: { id: replyId, studio_id: studioId },
      data: { usage_count: { increment: 1 } },
    });
  }

  /**
   * Record usage and return the updated saved reply.
   */
  public static async recordUsage(
    studioId: string,
    replyId: string
  ): Promise<IClientSavedReply> {
    await prisma.clientSavedReply.update({
      where: { id: replyId },
      data: { usage_count: { increment: 1 } },
    });

    const updated = await prisma.clientSavedReply.findUnique({
      where: { id: replyId },
    });

    return updated as unknown as IClientSavedReply;
  }
}
