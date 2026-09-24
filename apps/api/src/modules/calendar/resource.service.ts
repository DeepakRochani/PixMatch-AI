/**
 * Resource Service — PixMatch AI Phase 22
 * Resource inventory management, equipment/staff scheduling, availability rules, and blackout periods.
 */

import { prisma } from '@pixmatch/database';
import {
  CreateAvailabilityRuleDTO,
  CreateBlackoutPeriodDTO,
  CreateResourceDTO,
  ResourceStatus,
  ResourceType,
  StudioAvailabilityRuleDTO,
  StudioBlackoutPeriodDTO,
  StudioResourceDTO,
  UpdateResourceDTO,
} from '@pixmatch/types';

export class ResourceService {
  /**
   * Helper: Sanitize string
   */
  private static sanitizeText(str?: string | null): string | null {
    if (!str) return str || null;
    return str.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '').trim();
  }

  /**
   * Create a studio resource
   */
  static async createResource(
    studioId: string,
    data: CreateResourceDTO
  ): Promise<StudioResourceDTO> {
    if (!data.name?.trim()) {
      throw new Error('Resource name is required');
    }

    const created = await prisma.studioResource.create({
      data: {
        studio_id: studioId,
        name: this.sanitizeText(data.name)!,
        description: this.sanitizeText(data.description),
        resource_type: data.resource_type || ResourceType.PHOTOGRAPHER,
        status: data.status || ResourceStatus.ACTIVE,
        email: data.email?.trim() || null,
        phone: data.phone?.trim() || null,
        metadata: (data.metadata as any) || {},
      },
    });

    return created as unknown as StudioResourceDTO;
  }

  /**
   * Update a studio resource
   */
  static async updateResource(
    studioId: string,
    resourceId: string,
    data: UpdateResourceDTO
  ): Promise<StudioResourceDTO> {
    const existing = await prisma.studioResource.findFirst({
      where: { id: resourceId, studio_id: studioId },
    });
    if (!existing) {
      throw new Error('Resource not found');
    }

    const updated = await prisma.studioResource.update({
      where: { id: resourceId },
      data: {
        name: data.name ? this.sanitizeText(data.name)! : undefined,
        description: data.description !== undefined ? this.sanitizeText(data.description) : undefined,
        resource_type: data.resource_type,
        status: data.status,
        email: data.email !== undefined ? data.email?.trim() || null : undefined,
        phone: data.phone !== undefined ? data.phone?.trim() || null : undefined,
        metadata: (data.metadata as any) || undefined,
      },
    });

    return updated as unknown as StudioResourceDTO;
  }

  /**
   * List resources with assignment count and utilization stats
   */
  static async listResources(
    studioId: string,
    query: { resource_type?: ResourceType; status?: ResourceStatus } = {}
  ): Promise<StudioResourceDTO[]> {
    const resources = await prisma.studioResource.findMany({
      where: {
        studio_id: studioId,
        ...(query.resource_type ? { resource_type: query.resource_type } : {}),
        ...(query.status ? { status: query.status } : {}),
      },
      include: {
        assignments: {
          where: {
            start_at: { gte: new Date() },
          },
          select: { id: true },
        },
      },
      orderBy: [{ resource_type: 'asc' }, { name: 'asc' }],
    });

    return resources.map((r) => ({
      id: r.id,
      studio_id: r.studio_id,
      name: r.name,
      description: r.description,
      resource_type: r.resource_type as ResourceType,
      status: r.status as ResourceStatus,
      email: r.email,
      phone: r.phone,
      metadata: r.metadata as Record<string, unknown>,
      created_at: r.created_at,
      updated_at: r.updated_at,
      upcoming_assignments_count: r.assignments?.length || 0,
    }));
  }

  /**
   * Get resource details with upcoming assignments
   */
  static async getResource(studioId: string, resourceId: string): Promise<StudioResourceDTO> {
    const resource = await prisma.studioResource.findFirst({
      where: { id: resourceId, studio_id: studioId },
      include: {
        assignments: {
          where: { start_at: { gte: new Date() } },
          include: {
            calendar_event: { select: { id: true, title: true, status: true, start_at: true, end_at: true } },
          },
          take: 10,
        },
      },
    });

    if (!resource) {
      throw new Error('Resource not found');
    }

    return {
      id: resource.id,
      studio_id: resource.studio_id,
      name: resource.name,
      description: resource.description,
      resource_type: resource.resource_type as ResourceType,
      status: resource.status as ResourceStatus,
      email: resource.email,
      phone: resource.phone,
      metadata: resource.metadata as Record<string, unknown>,
      created_at: resource.created_at,
      updated_at: resource.updated_at,
      upcoming_assignments_count: resource.assignments?.length || 0,
    };
  }

  /**
   * Soft deactivate a resource
   */
  static async deactivateResource(studioId: string, resourceId: string): Promise<StudioResourceDTO> {
    return this.updateResource(studioId, resourceId, { status: ResourceStatus.INACTIVE });
  }

  /**
   * Reactivate a resource
   */
  static async reactivateResource(studioId: string, resourceId: string): Promise<StudioResourceDTO> {
    return this.updateResource(studioId, resourceId, { status: ResourceStatus.ACTIVE });
  }

  // ==========================================
  // AVAILABILITY RULES (WORKING HOURS)
  // ==========================================

  static async createAvailabilityRule(
    studioId: string,
    data: CreateAvailabilityRuleDTO
  ): Promise<StudioAvailabilityRuleDTO> {
    if (data.resource_id) {
      const res = await prisma.studioResource.findFirst({
        where: { id: data.resource_id, studio_id: studioId },
      });
      if (!res) throw new Error('Resource not found');
    }

    const rule = await prisma.studioAvailabilityRule.create({
      data: {
        studio_id: studioId,
        resource_id: data.resource_id || null,
        type: data.type || 'WORKING_HOURS',
        day_of_week: data.day_of_week !== undefined ? data.day_of_week : null,
        start_time: data.start_time || '09:00',
        end_time: data.end_time || '18:00',
        timezone: data.timezone || 'UTC',
        specific_date: data.specific_date ? new Date(data.specific_date) : null,
        priority: data.priority || 0,
        is_active: data.is_active !== undefined ? data.is_active : true,
        metadata: (data.metadata as any) || {},
      },
      include: {
        resource: { select: { id: true, name: true, resource_type: true } },
      },
    });

    return rule as unknown as StudioAvailabilityRuleDTO;
  }

  static async listAvailabilityRules(
    studioId: string,
    resourceId?: string
  ): Promise<StudioAvailabilityRuleDTO[]> {
    const rules = await prisma.studioAvailabilityRule.findMany({
      where: {
        studio_id: studioId,
        ...(resourceId !== undefined ? { resource_id: resourceId } : {}),
      },
      include: {
        resource: { select: { id: true, name: true, resource_type: true } },
      },
      orderBy: [{ day_of_week: 'asc' }, { start_time: 'asc' }],
    });

    return rules as unknown as StudioAvailabilityRuleDTO[];
  }

  static async deleteAvailabilityRule(studioId: string, ruleId: string): Promise<{ success: boolean }> {
    const existing = await prisma.studioAvailabilityRule.findFirst({
      where: { id: ruleId, studio_id: studioId },
    });
    if (!existing) throw new Error('Availability rule not found');

    await prisma.studioAvailabilityRule.delete({ where: { id: ruleId } });
    return { success: true };
  }

  // ==========================================
  // BLACKOUT PERIODS & HOLIDAYS
  // ==========================================

  static async createBlackoutPeriod(
    studioId: string,
    userId: string | null,
    data: CreateBlackoutPeriodDTO
  ): Promise<StudioBlackoutPeriodDTO> {
    if (!data.title?.trim()) throw new Error('Title is required');
    const startAt = new Date(data.start_at);
    const endAt = new Date(data.end_at);

    if (isNaN(startAt.getTime()) || isNaN(endAt.getTime())) {
      throw new Error('Valid start and end dates are required');
    }
    if (endAt <= startAt) {
      throw new Error('End date must be strictly after start date');
    }

    if (data.resource_id) {
      const res = await prisma.studioResource.findFirst({
        where: { id: data.resource_id, studio_id: studioId },
      });
      if (!res) throw new Error('Resource not found');
    }

    const blackout = await prisma.studioBlackoutPeriod.create({
      data: {
        studio_id: studioId,
        resource_id: data.resource_id || null,
        title: this.sanitizeText(data.title)!,
        start_at: startAt,
        end_at: endAt,
        timezone: data.timezone || 'UTC',
        reason: this.sanitizeText(data.reason),
        is_all_day: data.is_all_day || false,
        created_by: userId,
      },
      include: {
        resource: { select: { id: true, name: true, resource_type: true } },
      },
    });

    return blackout as unknown as StudioBlackoutPeriodDTO;
  }

  static async listBlackoutPeriods(
    studioId: string,
    resourceId?: string
  ): Promise<StudioBlackoutPeriodDTO[]> {
    const periods = await prisma.studioBlackoutPeriod.findMany({
      where: {
        studio_id: studioId,
        ...(resourceId !== undefined ? { resource_id: resourceId } : {}),
      },
      include: {
        resource: { select: { id: true, name: true, resource_type: true } },
      },
      orderBy: { start_at: 'asc' },
    });

    return periods as unknown as StudioBlackoutPeriodDTO[];
  }

  static async deleteBlackoutPeriod(studioId: string, blackoutId: string): Promise<{ success: boolean }> {
    const existing = await prisma.studioBlackoutPeriod.findFirst({
      where: { id: blackoutId, studio_id: studioId },
    });
    if (!existing) throw new Error('Blackout period not found');

    await prisma.studioBlackoutPeriod.delete({ where: { id: blackoutId } });
    return { success: true };
  }
}
