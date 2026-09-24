/**
 * Booking Type Service — PixMatch AI Phase 22
 * Defines studio offerings, default durations, buffers, pricing metadata, and public bookability.
 */

import { prisma } from '@pixmatch/database';
import {
  CreateBookingTypeDTO,
  StudioBookingTypeDTO,
  UpdateBookingTypeDTO,
} from '@pixmatch/types';

export class BookingTypeService {
  private static sanitizeText(str?: string | null): string | null {
    if (!str) return str || null;
    return str.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '').trim();
  }

  static async createBookingType(
    studioId: string,
    data: CreateBookingTypeDTO
  ): Promise<StudioBookingTypeDTO> {
    if (!data.name?.trim()) {
      throw new Error('Booking type name is required');
    }

    const duration = Math.max(5, Number(data.duration_minutes) || 60);

    const created = await prisma.studioBookingType.create({
      data: {
        studio_id: studioId,
        name: this.sanitizeText(data.name)!,
        description: this.sanitizeText(data.description),
        duration_minutes: duration,
        buffer_before_minutes: Math.max(0, Number(data.buffer_before_minutes) || 0),
        buffer_after_minutes: Math.max(0, Number(data.buffer_after_minutes) || 0),
        price: data.price !== undefined && data.price !== null ? Math.max(0, Number(data.price)) : null,
        currency: data.currency || 'INR',
        requires_resource_type: data.requires_resource_type || null,
        requires_manual_confirmation: data.requires_manual_confirmation !== undefined ? data.requires_manual_confirmation : true,
        is_active: data.is_active !== undefined ? data.is_active : true,
        public_bookable: data.public_bookable !== undefined ? data.public_bookable : true,
        metadata: (data.metadata as any) || {},
      },
    });

    return created as unknown as StudioBookingTypeDTO;
  }

  static async updateBookingType(
    studioId: string,
    id: string,
    data: UpdateBookingTypeDTO
  ): Promise<StudioBookingTypeDTO> {
    const existing = await prisma.studioBookingType.findFirst({
      where: { id, studio_id: studioId },
    });
    if (!existing) {
      throw new Error('Booking type not found');
    }

    const updated = await prisma.studioBookingType.update({
      where: { id },
      data: {
        name: data.name ? this.sanitizeText(data.name)! : undefined,
        description: data.description !== undefined ? this.sanitizeText(data.description) : undefined,
        duration_minutes: data.duration_minutes !== undefined ? Math.max(5, Number(data.duration_minutes)) : undefined,
        buffer_before_minutes: data.buffer_before_minutes !== undefined ? Math.max(0, Number(data.buffer_before_minutes)) : undefined,
        buffer_after_minutes: data.buffer_after_minutes !== undefined ? Math.max(0, Number(data.buffer_after_minutes)) : undefined,
        price: data.price !== undefined ? (data.price !== null ? Math.max(0, Number(data.price)) : null) : undefined,
        currency: data.currency,
        requires_resource_type: data.requires_resource_type,
        requires_manual_confirmation: data.requires_manual_confirmation,
        is_active: data.is_active,
        public_bookable: data.public_bookable,
        metadata: (data.metadata as any) || undefined,
      },
    });

    return updated as unknown as StudioBookingTypeDTO;
  }

  static async listBookingTypes(
    studioId: string,
    publicOnly: boolean = false
  ): Promise<StudioBookingTypeDTO[]> {
    const types = await prisma.studioBookingType.findMany({
      where: {
        studio_id: studioId,
        ...(publicOnly ? { is_active: true, public_bookable: true } : {}),
      },
      orderBy: { name: 'asc' },
    });

    return types as unknown as StudioBookingTypeDTO[];
  }

  static async getBookingType(studioId: string, id: string): Promise<StudioBookingTypeDTO> {
    const type = await prisma.studioBookingType.findFirst({
      where: { id, studio_id: studioId },
    });
    if (!type) throw new Error('Booking type not found');
    return type as unknown as StudioBookingTypeDTO;
  }
}
