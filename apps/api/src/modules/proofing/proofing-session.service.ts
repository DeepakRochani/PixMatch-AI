/**
 * Proofing Session Service — PixMatch AI Phase 25
 * Manages client proofing session lifecycle, security tokens, PIN authentication, and rules.
 */

import crypto from 'crypto';
import { prisma } from '@pixmatch/database';
import {
  ProofingSessionStatus,
  ProofingItemStatus,
  CreateProofingSessionDTO,
  UpdateProofingSessionDTO,
  UpdateProofingRulesDTO,
  PhotoProofingSessionDTO,
  ProofingSelectionRuleDTO,
  ProofingPublicSessionDTO,
} from '@pixmatch/types';

export class ProofingSessionService {
  /**
   * Generates a secure, high-entropy URL-safe token.
   */
  public static generateToken(): string {
    return crypto.randomBytes(24).toString('base64url');
  }

  /**
   * Hashes a token or PIN with SHA-256 for secure database lookup.
   */
  public static hashToken(token: string): string {
    return crypto.createHash('sha256').update(token.trim()).digest('hex');
  }

  /**
   * Create a new proofing session for a studio gallery/project.
   */
  public static async createSession(
    studioId: string,
    data: CreateProofingSessionDTO,
    userId?: string
  ): Promise<PhotoProofingSessionDTO> {
    const rawToken = this.generateToken();
    const tokenHash = this.hashToken(rawToken);

    const pinHash = data.pin_code && data.pin_code.trim().length > 0
      ? this.hashToken(data.pin_code.trim())
      : null;

    // Verify gallery exists and belongs to studio
    const gallery = await prisma.gallery.findFirst({
      where: { id: data.gallery_id, studio_id: studioId },
      include: {
        photos: {
          select: { id: true },
          where: { is_archived: false },
        },
      },
    });

    if (!gallery) {
      throw new Error(`Gallery with ID '${data.gallery_id}' not found in studio.`);
    }

    // Default rules
    const includedCount = data.rules?.included_count ?? 30;
    const minSelections = data.rules?.min_selections ?? 1;
    const maxSelections = data.rules?.max_selections ?? null;
    const allowExtras = data.rules?.allow_extras ?? true;
    const extraPriceCents = data.rules?.extra_price_cents ?? 500; // $5.00 default
    const currency = data.rules?.currency ?? 'USD';
    const allowNotes = data.rules?.allow_client_notes ?? true;
    const allowPinpoint = data.rules?.allow_pinpoint_feedback ?? true;
    const allowFavorite = data.rules?.allow_favorite_starring ?? true;
    const allowCompare = data.rules?.allow_side_by_side_compare ?? true;

    // Determine photos to include
    let targetPhotoIds: string[] = [];
    if (data.photo_ids && data.photo_ids.length > 0) {
      targetPhotoIds = data.photo_ids;
    } else {
      targetPhotoIds = gallery.photos.map((p) => p.id);
    }

    const session = await prisma.photoProofingSession.create({
      data: {
        studio_id: studioId,
        gallery_id: data.gallery_id,
        project_id: data.project_id || null,
        client_id: data.client_id || null,
        name: data.name,
        description: data.description || null,
        token_hash: tokenHash,
        pin_code_hash: pinHash,
        status: ProofingSessionStatus.ACTIVE,
        deadline_at: data.deadline_at ? new Date(data.deadline_at) : null,
        expires_at: data.expires_at ? new Date(data.expires_at) : null,
        allow_download_previews: data.allow_download_previews ?? false,
        watermark_enabled: data.watermark_enabled ?? true,
        created_by: userId || null,
        rules: {
          create: {
            included_count: includedCount,
            min_selections: minSelections,
            max_selections: maxSelections,
            allow_extras: allowExtras,
            extra_price_cents: extraPriceCents,
            currency: currency,
            allow_client_notes: allowNotes,
            allow_pinpoint_feedback: allowPinpoint,
            allow_favorite_starring: allowFavorite,
            allow_side_by_side_compare: allowCompare,
          },
        },
        items: {
          create: targetPhotoIds.map((photoId) => ({
            photo_id: photoId,
            status: ProofingItemStatus.UNREVIEWED,
            is_favorite: false,
          })),
        },
        audit_logs: {
          create: {
            action: 'SESSION_CREATED',
            actor_type: userId ? 'USER' : 'SYSTEM',
            actor_id: userId || null,
            payload: {
              photo_count: targetPhotoIds.length,
              included_count: includedCount,
              raw_token: rawToken,
            },
          },
        },
      },
      include: {
        rules: true,
        items: {
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
            comments: true,
          },
        },
        comparisons: true,
        reviews: true,
        gallery: {
          select: { id: true, title: true, slug: true, cover_photo_url: true },
        },
        client: {
          select: { id: true, name: true, email: true },
        },
        project: {
          select: { id: true, name: true },
        },
      },
    });

    const dto = this.mapSessionToDTO(session);
    (dto as any).raw_token = rawToken; // Return raw token once upon creation
    return dto;
  }

  /**
   * Get proofing session by ID (Studio Admin View)
   */
  public static async getSessionById(
    sessionId: string,
    studioId: string
  ): Promise<PhotoProofingSessionDTO | null> {
    const session = await prisma.photoProofingSession.findFirst({
      where: { id: sessionId, studio_id: studioId },
      include: {
        rules: true,
        items: {
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
        },
        comparisons: {
          orderBy: { created_at: 'desc' },
        },
        reviews: {
          orderBy: { created_at: 'desc' },
        },
        gallery: {
          select: { id: true, title: true, slug: true, cover_photo_url: true },
        },
        client: {
          select: { id: true, name: true, email: true },
        },
        project: {
          select: { id: true, name: true },
        },
      },
    });

    if (!session) return null;
    return this.mapSessionToDTO(session);
  }

  /**
   * Get proofing session by public token (Client Portal View)
   */
  public static async getSessionByToken(
    rawToken: string,
    pinCode?: string
  ): Promise<ProofingPublicSessionDTO> {
    const tokenHash = this.hashToken(rawToken);

    const session = await prisma.photoProofingSession.findFirst({
      where: { token_hash: tokenHash },
      include: {
        rules: true,
        items: {
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
        },
        comparisons: {
          orderBy: { created_at: 'desc' },
        },
        gallery: {
          select: { id: true, title: true, cover_photo_url: true },
        },
      },
    });

    if (!session) {
      throw new Error('Proofing session not found or invalid access link.');
    }

    // Check expiry
    if (session.expires_at && new Date() > new Date(session.expires_at)) {
      if (session.status !== ProofingSessionStatus.EXPIRED) {
        await prisma.photoProofingSession.update({
          where: { id: session.id },
          data: { status: ProofingSessionStatus.EXPIRED },
        });
      }
      throw new Error('This proofing session has expired.');
    }

    const requiresPin = !!session.pin_code_hash;
    let isPinVerified = true;

    if (requiresPin) {
      if (!pinCode) {
        isPinVerified = false;
      } else {
        const hashedInput = this.hashToken(pinCode);
        if (hashedInput !== session.pin_code_hash) {
          throw new Error('Incorrect PIN code.');
        }
        isPinVerified = true;
      }
    }

    // Auto-update status to CLIENT_REVIEWING if it was ACTIVE
    if (isPinVerified && session.status === ProofingSessionStatus.ACTIVE) {
      await prisma.photoProofingSession.update({
        where: { id: session.id },
        data: { status: ProofingSessionStatus.CLIENT_REVIEWING },
      });
      session.status = ProofingSessionStatus.CLIENT_REVIEWING;
    }

    const quota = this.calculateQuota(session.rules, session.items);

    return {
      id: session.id,
      name: session.name,
      description: session.description,
      status: session.status as ProofingSessionStatus,
      requires_pin: requiresPin,
      is_pin_verified: isPinVerified,
      deadline_at: session.deadline_at,
      allow_download_previews: session.allow_download_previews,
      watermark_enabled: session.watermark_enabled,
      rules: session.rules as any,
      items: isPinVerified ? (session.items as any) : [],
      comparisons: isPinVerified ? (session.comparisons as any) : [],
      quota,
      gallery: session.gallery,
    };
  }

  /**
   * Verify PIN for a public session
   */
  public static async verifyPin(rawToken: string, pinCode: string): Promise<boolean> {
    const tokenHash = this.hashToken(rawToken);
    const session = await prisma.photoProofingSession.findFirst({
      where: { token_hash: tokenHash },
    });

    if (!session || !session.pin_code_hash) return true;
    const inputHash = this.hashToken(pinCode);
    return inputHash === session.pin_code_hash;
  }

  /**
   * List all proofing sessions for a studio with optional filters.
   */
  public static async listSessions(
    studioId: string,
    filters?: {
      gallery_id?: string;
      project_id?: string;
      status?: ProofingSessionStatus;
    }
  ): Promise<PhotoProofingSessionDTO[]> {
    const where: any = { studio_id: studioId };
    if (filters?.gallery_id) where.gallery_id = filters.gallery_id;
    if (filters?.project_id) where.project_id = filters.project_id;
    if (filters?.status) where.status = filters.status;

    const sessions = await prisma.photoProofingSession.findMany({
      where,
      orderBy: { created_at: 'desc' },
      include: {
        rules: true,
        items: {
          select: {
            id: true,
            status: true,
            is_favorite: true,
          },
        },
        gallery: {
          select: { id: true, title: true, slug: true, cover_photo_url: true },
        },
        client: {
          select: { id: true, name: true, email: true },
        },
        project: {
          select: { id: true, name: true },
        },
      },
    });

    return sessions.map((s) => this.mapSessionToDTO(s as any));
  }

  /**
   * Update session details (Name, deadlines, PIN, status).
   */
  public static async updateSession(
    sessionId: string,
    studioId: string,
    data: UpdateProofingSessionDTO,
    userId?: string
  ): Promise<PhotoProofingSessionDTO> {
    const updateData: any = {};
    if (data.name !== undefined) updateData.name = data.name;
    if (data.description !== undefined) updateData.description = data.description;
    if (data.status !== undefined) updateData.status = data.status;
    if (data.deadline_at !== undefined) {
      updateData.deadline_at = data.deadline_at ? new Date(data.deadline_at) : null;
    }
    if (data.expires_at !== undefined) {
      updateData.expires_at = data.expires_at ? new Date(data.expires_at) : null;
    }
    if (data.allow_download_previews !== undefined) {
      updateData.allow_download_previews = data.allow_download_previews;
    }
    if (data.watermark_enabled !== undefined) {
      updateData.watermark_enabled = data.watermark_enabled;
    }
    if (data.pin_code !== undefined) {
      updateData.pin_code_hash = data.pin_code.trim().length > 0
        ? this.hashToken(data.pin_code.trim())
        : null;
    }

    const updated = await prisma.photoProofingSession.update({
      where: { id: sessionId },
      data: {
        ...updateData,
        audit_logs: {
          create: {
            action: 'SESSION_UPDATED',
            actor_type: userId ? 'USER' : 'SYSTEM',
            actor_id: userId || null,
            payload: updateData,
          },
        },
      },
      include: {
        rules: true,
        items: true,
        gallery: true,
        client: true,
        project: true,
      },
    });

    return this.mapSessionToDTO(updated as any);
  }

  /**
   * Update proofing selection rules.
   */
  public static async updateRules(
    sessionId: string,
    studioId: string,
    rulesData: UpdateProofingRulesDTO,
    userId?: string
  ): Promise<ProofingSelectionRuleDTO> {
    // Verify session belongs to studio
    const session = await prisma.photoProofingSession.findFirst({
      where: { id: sessionId, studio_id: studioId },
      include: { rules: true },
    });

    if (!session) {
      throw new Error(`Proofing session '${sessionId}' not found.`);
    }

    const updatedRules = await prisma.proofingSelectionRule.upsert({
      where: { session_id: sessionId },
      update: {
        ...rulesData,
      },
      create: {
        session_id: sessionId,
        included_count: rulesData.included_count ?? 30,
        min_selections: rulesData.min_selections ?? 1,
        max_selections: rulesData.max_selections ?? null,
        allow_extras: rulesData.allow_extras ?? true,
        extra_price_cents: rulesData.extra_price_cents ?? 500,
        currency: rulesData.currency ?? 'USD',
        allow_client_notes: rulesData.allow_client_notes ?? true,
        allow_pinpoint_feedback: rulesData.allow_pinpoint_feedback ?? true,
        allow_favorite_starring: rulesData.allow_favorite_starring ?? true,
        allow_side_by_side_compare: rulesData.allow_side_by_side_compare ?? true,
      },
    });

    await prisma.photoProofingAuditLog.create({
      data: {
        session_id: sessionId,
        action: 'RULES_UPDATED',
        actor_type: userId ? 'USER' : 'SYSTEM',
        actor_id: userId || null,
        payload: rulesData,
      },
    });

    return updatedRules as any;
  }

  /**
   * Delete a proofing session.
   */
  public static async deleteSession(sessionId: string, studioId: string): Promise<boolean> {
    const session = await prisma.photoProofingSession.findFirst({
      where: { id: sessionId, studio_id: studioId },
    });

    if (!session) {
      throw new Error(`Session '${sessionId}' not found.`);
    }

    await prisma.photoProofingSession.delete({
      where: { id: sessionId },
    });

    return true;
  }

  /**
   * Helper to compute real-time quota compliance & extra pricing.
   */
  public static calculateQuota(rules: any, items: any[] = []) {
    const includedCount = rules?.included_count ?? 30;
    const minSelections = rules?.min_selections ?? 1;
    const maxSelections = rules?.max_selections ?? null;
    const allowExtras = rules?.allow_extras ?? true;
    const extraPriceCents = rules?.extra_price_cents ?? 500;
    const currency = rules?.currency ?? 'USD';

    let selectedCount = 0;
    let favoritesCount = 0;
    let unreviewedCount = 0;
    let rejectedCount = 0;

    for (const item of items) {
      if (item.status === ProofingItemStatus.SELECTED) selectedCount++;
      else if (item.status === ProofingItemStatus.REJECTED) rejectedCount++;
      else unreviewedCount++;

      if (item.is_favorite) favoritesCount++;
    }

    const isMinMet = selectedCount >= minSelections;
    const isMaxExceeded = maxSelections != null && selectedCount > maxSelections && !allowExtras;
    const isValidForSubmission = isMinMet && (!maxSelections || selectedCount <= maxSelections || allowExtras);

    const extraCount = Math.max(0, selectedCount - includedCount);
    const extraTotalCents = allowExtras ? extraCount * extraPriceCents : 0;
    const formattedExtraTotal = (extraTotalCents / 100).toLocaleString('en-US', {
      style: 'currency',
      currency: currency,
    });

    return {
      included_count: includedCount,
      min_selections: minSelections,
      max_selections: maxSelections,
      selected_count: selectedCount,
      favorites_count: favoritesCount,
      unreviewed_count: unreviewedCount,
      rejected_count: rejectedCount,
      total_items: items.length,
      is_min_met: isMinMet,
      is_max_exceeded: isMaxExceeded,
      is_valid_for_submission: isValidForSubmission,
      extra_count: extraCount,
      extra_price_cents: extraPriceCents,
      extra_total_cents: extraTotalCents,
      currency: currency,
      formatted_extra_total: formattedExtraTotal,
    };
  }

  /**
   * Map database model to unified DTO
   */
  private static mapSessionToDTO(session: any): PhotoProofingSessionDTO {
    const quota = this.calculateQuota(session.rules, session.items || []);

    return {
      id: session.id,
      studio_id: session.studio_id,
      gallery_id: session.gallery_id,
      project_id: session.project_id,
      client_id: session.client_id,
      name: session.name,
      description: session.description,
      token_hash: session.token_hash,
      has_pin: !!session.pin_code_hash,
      status: session.status as ProofingSessionStatus,
      deadline_at: session.deadline_at,
      expires_at: session.expires_at,
      allow_download_previews: session.allow_download_previews,
      watermark_enabled: session.watermark_enabled,
      submitted_at: session.submitted_at,
      completed_at: session.completed_at,
      created_by: session.created_by,
      created_at: session.created_at,
      updated_at: session.updated_at,
      rules: session.rules ? (session.rules as any) : null,
      items: session.items ? (session.items as any) : [],
      comparisons: session.comparisons ? (session.comparisons as any) : [],
      reviews: session.reviews ? (session.reviews as any) : [],
      quota,
      gallery: session.gallery,
      client: session.client,
      project: session.project,
    };
  }
}
