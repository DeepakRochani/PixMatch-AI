/**
 * Proofing Feedback Service — PixMatch AI Phase 25
 * Manages pinpoint annotations, retouching requests, threaded replies, and issue resolution.
 */

import { prisma } from '@pixmatch/database';
import {
  ProofingCommentType,
  CreateProofingCommentDTO,
  UpdateProofingCommentDTO,
  PhotoProofingCommentDTO,
} from '@pixmatch/types';
import { ProofingSelectionService } from './proofing-selection.service.js';

export class ProofingFeedbackService {
  /**
   * Add a pinpoint comment or retouch instruction on a proofing photo item.
   */
  public static async addComment(
    sessionId: string,
    itemId: string,
    data: CreateProofingCommentDTO
  ): Promise<PhotoProofingCommentDTO> {
    const session = await ProofingSelectionService.assertSessionEditable(sessionId);

    if (session.rules && !session.rules.allow_pinpoint_feedback && (data.pin_x != null || data.pin_y != null)) {
      throw new Error('Pinpoint feedback is disabled for this session.');
    }

    // Verify item belongs to session
    const item = await prisma.photoProofingItem.findFirst({
      where: { id: itemId, session_id: sessionId },
    });

    if (!item) {
      throw new Error(`Item '${itemId}' not found in session.`);
    }

    // Validate coordinate range (0.0 to 1.0)
    let pinX = data.pin_x != null ? Number(data.pin_x) : null;
    let pinY = data.pin_y != null ? Number(data.pin_y) : null;

    if (pinX !== null && (pinX < 0 || pinX > 1)) {
      throw new Error('pin_x coordinate must be between 0.0 and 1.0');
    }
    if (pinY !== null && (pinY < 0 || pinY > 1)) {
      throw new Error('pin_y coordinate must be between 0.0 and 1.0');
    }

    const comment = await prisma.photoProofingComment.create({
      data: {
        item_id: itemId,
        session_id: sessionId,
        parent_id: data.parent_id || null,
        comment_type: data.comment_type || ProofingCommentType.GENERAL,
        comment_text: data.comment_text,
        pin_x: pinX,
        pin_y: pinY,
        author_type: data.author_type || 'CLIENT',
        author_name: data.author_name || null,
        author_id: data.author_id || null,
      },
      include: {
        replies: true,
      },
    });

    return comment as any;
  }

  /**
   * List all comments for an individual item.
   */
  public static async getItemComments(itemId: string): Promise<PhotoProofingCommentDTO[]> {
    const comments = await prisma.photoProofingComment.findMany({
      where: { item_id: itemId, parent_id: null },
      orderBy: { created_at: 'asc' },
      include: {
        replies: {
          orderBy: { created_at: 'asc' },
        },
      },
    });

    return comments as any;
  }

  /**
   * List all comments across a whole session (Studio Overview).
   */
  public static async getSessionComments(sessionId: string): Promise<PhotoProofingCommentDTO[]> {
    const comments = await prisma.photoProofingComment.findMany({
      where: { session_id: sessionId, parent_id: null },
      orderBy: { created_at: 'asc' },
      include: {
        item: {
          include: {
            photo: {
              select: {
                id: true,
                original_filename: true,
                thumbnail_url: true,
              },
            },
          },
        },
        replies: {
          orderBy: { created_at: 'asc' },
        },
      },
    });

    return comments as any;
  }

  /**
   * Update or resolve/unresolve a comment.
   */
  public static async updateComment(
    commentId: string,
    data: UpdateProofingCommentDTO,
    userId?: string
  ): Promise<PhotoProofingCommentDTO> {
    const updateData: any = {};
    if (data.comment_text !== undefined) updateData.comment_text = data.comment_text;
    if (data.is_resolved !== undefined) {
      updateData.is_resolved = data.is_resolved;
      if (data.is_resolved) {
        updateData.resolved_at = new Date();
        updateData.resolved_by = userId || 'STUDIO_STAFF';
      } else {
        updateData.resolved_at = null;
        updateData.resolved_by = null;
      }
    }

    const updated = await prisma.photoProofingComment.update({
      where: { id: commentId },
      data: updateData,
      include: {
        replies: true,
      },
    });

    return updated as any;
  }

  /**
   * Delete a comment.
   */
  public static async deleteComment(commentId: string): Promise<boolean> {
    await prisma.photoProofingComment.delete({
      where: { id: commentId },
    });
    return true;
  }
}
