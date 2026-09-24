/**
 * Proofing Selection Service — PixMatch AI Phase 25
 * Manages photo selection/favorite toggles, batch operations, rating, ordering, and comparison sets.
 */

import { prisma } from '@pixmatch/database';
import {
  ProofingSessionStatus,
  ProofingItemStatus,
  ToggleProofingItemDTO,
  BulkToggleProofingItemDTO,
  CreateProofingComparisonDTO,
  PhotoProofingItemDTO,
  PhotoProofingComparisonDTO,
} from '@pixmatch/types';
import { ProofingSessionService } from './proofing-session.service.js';

export class ProofingSelectionService {
  /**
   * Verify session is editable by client (not locked in SUBMITTED/APPROVED/EXPIRED).
   */
  public static async assertSessionEditable(sessionId: string): Promise<any> {
    const session = await prisma.photoProofingSession.findUnique({
      where: { id: sessionId },
      include: { rules: true },
    });

    if (!session) {
      throw new Error(`Proofing session '${sessionId}' not found.`);
    }

    if (
      session.status === ProofingSessionStatus.SUBMITTED ||
      session.status === ProofingSessionStatus.APPROVED ||
      session.status === ProofingSessionStatus.EXPIRED ||
      session.status === ProofingSessionStatus.CANCELLED
    ) {
      throw new Error(
        `Session is currently in '${session.status}' state and is locked from further client modifications.`
      );
    }

    return session;
  }

  /**
   * Toggle or update an individual proofing item.
   */
  public static async updateItem(
    sessionId: string,
    itemId: string,
    data: ToggleProofingItemDTO
  ): Promise<PhotoProofingItemDTO> {
    const session = await this.assertSessionEditable(sessionId);

    // Verify item belongs to this session
    const existingItem = await prisma.photoProofingItem.findFirst({
      where: { id: itemId, session_id: sessionId },
    });

    if (!existingItem) {
      throw new Error(`Proofing item '${itemId}' not found in session.`);
    }

    const updateData: any = {};
    if (data.status !== undefined) updateData.status = data.status;
    if (data.is_favorite !== undefined) {
      if (!session.rules?.allow_favorite_starring && data.is_favorite) {
        throw new Error('Starring favorites is disabled in this session.');
      }
      updateData.is_favorite = data.is_favorite;
    }
    if (data.client_note !== undefined) {
      if (!session.rules?.allow_client_notes && data.client_note) {
        throw new Error('Client notes are disabled in this session.');
      }
      updateData.client_note = data.client_note;
    }
    if (data.flag_color !== undefined) updateData.flag_color = data.flag_color;
    if (data.rating !== undefined) updateData.rating = data.rating;

    const updated = await prisma.photoProofingItem.update({
      where: { id: itemId },
      data: updateData,
      include: {
        photo: {
          select: {
            id: true,
            gallery_id: true,
            original_filename: true,
            thumbnail_url: true,
            original_url: true,
            width: true,
            height: true,
            aspect_ratio: true,
          },
        },
        comments: {
          orderBy: { created_at: 'asc' },
        },
      },
    });

    return updated as any;
  }

  /**
   * Bulk update items (e.g. select all, mark favorites, clear selections).
   */
  public static async bulkUpdateItems(
    sessionId: string,
    data: BulkToggleProofingItemDTO
  ): Promise<{ updated_count: number }> {
    await this.assertSessionEditable(sessionId);

    const updateData: any = {};
    if (data.status !== undefined) updateData.status = data.status;
    if (data.is_favorite !== undefined) updateData.is_favorite = data.is_favorite;

    const result = await prisma.photoProofingItem.updateMany({
      where: {
        session_id: sessionId,
        id: { in: data.item_ids },
      },
      data: updateData,
    });

    return { updated_count: result.count };
  }

  /**
   * Get all items for a session with current status and photo details.
   */
  public static async getSessionItems(
    sessionId: string,
    statusFilter?: ProofingItemStatus
  ): Promise<PhotoProofingItemDTO[]> {
    const where: any = { session_id: sessionId };
    if (statusFilter) where.status = statusFilter;

    const items = await prisma.photoProofingItem.findMany({
      where,
      orderBy: { created_at: 'asc' },
      include: {
        photo: {
          select: {
            id: true,
            gallery_id: true,
            original_filename: true,
            thumbnail_url: true,
            original_url: true,
            width: true,
            height: true,
            aspect_ratio: true,
          },
        },
        comments: {
          orderBy: { created_at: 'asc' },
        },
      },
    });

    return items as any;
  }

  /**
   * Create a side-by-side photo comparison group.
   */
  public static async createComparison(
    sessionId: string,
    data: CreateProofingComparisonDTO
  ): Promise<PhotoProofingComparisonDTO> {
    const session = await this.assertSessionEditable(sessionId);

    if (session.rules && !session.rules.allow_side_by_side_compare) {
      throw new Error('Side-by-side comparison is disabled for this session.');
    }

    if (!data.photo_ids || data.photo_ids.length < 2) {
      throw new Error('A comparison group must contain at least 2 photos.');
    }

    const comparison = await prisma.photoProofingComparison.create({
      data: {
        session_id: sessionId,
        name: data.name || null,
        photo_ids: data.photo_ids,
        winner_photo_id: data.winner_photo_id || null,
        notes: data.notes || null,
      },
    });

    return comparison as any;
  }

  /**
   * Get all comparison sets in a session.
   */
  public static async getComparisons(sessionId: string): Promise<PhotoProofingComparisonDTO[]> {
    const comparisons = await prisma.photoProofingComparison.findMany({
      where: { session_id: sessionId },
      orderBy: { created_at: 'desc' },
    });

    return comparisons as any;
  }

  /**
   * Set the winner for a comparison set and auto-mark as SELECTED.
   */
  public static async selectComparisonWinner(
    sessionId: string,
    comparisonId: string,
    winnerPhotoId: string
  ): Promise<PhotoProofingComparisonDTO> {
    await this.assertSessionEditable(sessionId);

    const comparison = await prisma.photoProofingComparison.findFirst({
      where: { id: comparisonId, session_id: sessionId },
    });

    if (!comparison) {
      throw new Error(`Comparison '${comparisonId}' not found.`);
    }

    if (!comparison.photo_ids.includes(winnerPhotoId)) {
      throw new Error('Winner photo ID must be one of the compared photos.');
    }

    const updated = await prisma.photoProofingComparison.update({
      where: { id: comparisonId },
      data: { winner_photo_id: winnerPhotoId },
    });

    // Automatically mark winner as SELECTED and others as UNREVIEWED or REJECTED if desired
    await prisma.photoProofingItem.updateMany({
      where: { session_id: sessionId, photo_id: winnerPhotoId },
      data: { status: ProofingItemStatus.SELECTED },
    });

    return updated as any;
  }

  /**
   * Delete a comparison group.
   */
  public static async deleteComparison(sessionId: string, comparisonId: string): Promise<boolean> {
    await this.assertSessionEditable(sessionId);

    await prisma.photoProofingComparison.deleteMany({
      where: { id: comparisonId, session_id: sessionId },
    });

    return true;
  }
}
