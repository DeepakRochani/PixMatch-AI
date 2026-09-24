/**
 * Booking Link Service — PixMatch AI Phase 22
 * Generates cryptographic booking tokens with SHA-256 storage, expiration, and revocation.
 */

import crypto from 'crypto';
import { prisma } from '@pixmatch/database';
import {
  CreateBookingLinkDTO,
  PublicBookingPortalDTO,
  StudioBookingLinkDTO,
} from '@pixmatch/types';

export class BookingLinkService {
  /**
   * Compute SHA-256 hash for secure token storage & lookup
   */
  static hashToken(rawToken: string): string {
    return crypto.createHash('sha256').update(rawToken).digest('hex');
  }

  /**
   * Create a new public booking link with a 32-byte cryptographically secure token
   */
  static async createBookingLink(
    studioId: string,
    userId: string | null,
    data: CreateBookingLinkDTO
  ): Promise<StudioBookingLinkDTO> {
    const rawToken = crypto.randomBytes(32).toString('hex');
    const tokenHash = this.hashToken(rawToken);

    let expiresAt: Date | null = null;
    if (data.token_expires_at) {
      expiresAt = new Date(data.token_expires_at);
    } else if (data.expires_in_days && data.expires_in_days > 0) {
      expiresAt = new Date(Date.now() + data.expires_in_days * 86400000);
    }

    const link = await prisma.studioBookingLink.create({
      data: {
        studio_id: studioId,
        booking_type_id: data.booking_type_id || null,
        project_id: data.project_id || null,
        client_id: data.client_id || null,
        lead_id: data.lead_id || null,
        public_token_hash: tokenHash,
        token_expires_at: expiresAt,
        is_active: true,
        created_by: userId,
      },
      include: {
        booking_type: true,
        client: { select: { id: true, name: true, email: true } },
        project: { select: { id: true, name: true } },
      },
    });

    return {
      id: link.id,
      studio_id: link.studio_id,
      booking_type_id: link.booking_type_id,
      project_id: link.project_id,
      client_id: link.client_id,
      lead_id: link.lead_id,
      public_token_hash: link.public_token_hash,
      token_expires_at: link.token_expires_at,
      is_active: link.is_active,
      created_by: link.created_by,
      created_at: link.created_at,
      updated_at: link.updated_at,
      raw_token: rawToken, // ONLY returned once upon creation!
      booking_url: `/portal/booking/${rawToken}`,
      booking_type: link.booking_type as any,
      client: link.client as any,
      project: link.project as any,
    };
  }

  /**
   * List booking links for studio dashboard
   */
  static async listBookingLinks(studioId: string): Promise<StudioBookingLinkDTO[]> {
    const links = await prisma.studioBookingLink.findMany({
      where: { studio_id: studioId },
      include: {
        booking_type: true,
        client: { select: { id: true, name: true, email: true } },
        project: { select: { id: true, name: true } },
      },
      orderBy: { created_at: 'desc' },
    });

    return links.map((l) => ({
      id: l.id,
      studio_id: l.studio_id,
      booking_type_id: l.booking_type_id,
      project_id: l.project_id,
      client_id: l.client_id,
      lead_id: l.lead_id,
      public_token_hash: l.public_token_hash,
      token_expires_at: l.token_expires_at,
      is_active: l.is_active,
      created_by: l.created_by,
      created_at: l.created_at,
      updated_at: l.updated_at,
      booking_type: l.booking_type as any,
      client: l.client as any,
      project: l.project as any,
    }));
  }

  /**
   * Revoke a booking link
   */
  static async revokeBookingLink(studioId: string, id: string): Promise<{ success: boolean }> {
    const existing = await prisma.studioBookingLink.findFirst({
      where: { id, studio_id: studioId },
    });
    if (!existing) throw new Error('Booking link not found');

    await prisma.studioBookingLink.update({
      where: { id },
      data: { is_active: false },
    });

    return { success: true };
  }

  /**
   * Resolve and validate a public booking link token
   */
  static async resolvePublicToken(rawToken: string): Promise<PublicBookingPortalDTO> {
    if (!rawToken || rawToken.length < 16) {
      throw new Error('Invalid booking token');
    }

    const tokenHash = this.hashToken(rawToken);

    // Look up in StudioBookingLink or StudioBookingRequest
    const link = await prisma.studioBookingLink.findUnique({
      where: { public_token_hash: tokenHash },
      include: {
        studio: { select: { id: true, name: true, slug: true, logo_url: true, website: true } },
        booking_type: true,
      },
    });

    if (link) {
      if (!link.is_active) {
        throw new Error('This booking link has been deactivated.');
      }
      if (link.token_expires_at && link.token_expires_at < new Date()) {
        throw new Error('This booking link has expired.');
      }

      const settings = await prisma.studioBookingSettings.findUnique({
        where: { studio_id: link.studio_id },
      });

      return {
        token_valid: true,
        studio: {
          name: link.studio.name,
          slug: link.studio.slug,
          logo_url: link.studio.logo_url,
          website: link.studio.website,
          timezone: settings?.timezone || 'UTC',
        },
        booking_type: link.booking_type
          ? {
              id: link.booking_type.id,
              name: link.booking_type.name,
              description: link.booking_type.description,
              duration_minutes: link.booking_type.duration_minutes,
              buffer_before_minutes: link.booking_type.buffer_before_minutes,
              buffer_after_minutes: link.booking_type.buffer_after_minutes,
              price: link.booking_type.price,
              currency: link.booking_type.currency,
              requires_manual_confirmation: link.booking_type.requires_manual_confirmation,
            }
          : null,
        settings: {
          timezone: settings?.timezone || 'UTC',
          minimum_notice_minutes: settings?.minimum_notice_minutes || 60,
          maximum_booking_days_ahead: settings?.maximum_booking_days_ahead || 90,
          allow_client_reschedule: settings?.allow_client_reschedule ?? true,
          allow_client_cancel: settings?.allow_client_cancel ?? true,
          minimum_reschedule_notice_minutes: settings?.minimum_reschedule_notice_minutes || 1440,
          minimum_cancel_notice_minutes: settings?.minimum_cancel_notice_minutes || 1440,
          require_manual_confirmation: settings?.require_manual_confirmation ?? true,
        },
      };
    }

    throw new Error('Booking portal link not found or expired');
  }
}
