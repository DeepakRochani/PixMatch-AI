import { prisma } from '@pixmatch/database';
import {
  PlatformFeatureFlagDTO,
  CreateFeatureFlagInput,
  UpdateFeatureFlagInput,
  FeatureFlagScope,
  SubscriptionPlan,
} from '@pixmatch/types';
import { AdminService } from './admin.service.js';

export class AdminFeatureFlagService {
  private static memoryFlags = new Map<string, PlatformFeatureFlagDTO>();

  /**
   * Retrieves all feature flags with optional filtering.
   */
  static async listFeatureFlags(params?: {
    scope?: FeatureFlagScope;
    enabled?: boolean;
    search?: string;
  }): Promise<PlatformFeatureFlagDTO[]> {
    try {
      const where: any = {};
      if (params?.scope) where.scope = params.scope;
      if (params?.enabled !== undefined) where.enabled = params.enabled;
      if (params?.search) {
        where.OR = [
          { key: { contains: params.search, mode: 'insensitive' } },
          { name: { contains: params.search, mode: 'insensitive' } },
        ];
      }

      const flags = await (prisma as any).platformFeatureFlag.findMany({
        where,
        orderBy: { created_at: 'desc' },
      });

      if (flags && flags.length > 0) {
        return flags.map(this.mapToDTO);
      }
    } catch (_err) {
      // In-memory fallback
    }

    let memoryList = Array.from(this.memoryFlags.values());
    if (params?.scope) {
      memoryList = memoryList.filter((f) => f.scope === params.scope);
    }
    if (params?.enabled !== undefined) {
      memoryList = memoryList.filter((f) => f.enabled === params.enabled);
    }
    if (params?.search) {
      const s = params.search.toLowerCase();
      memoryList = memoryList.filter(
        (f) => f.key.toLowerCase().includes(s) || f.name.toLowerCase().includes(s)
      );
    }
    return memoryList;
  }

  /**
   * Retrieves a single feature flag by key or ID.
   */
  static async getFeatureFlag(keyOrId: string): Promise<PlatformFeatureFlagDTO | null> {
    try {
      const flag = await (prisma as any).platformFeatureFlag.findFirst({
        where: {
          OR: [{ id: keyOrId }, { key: keyOrId }],
        },
      });
      if (flag) return this.mapToDTO(flag);
    } catch (_err) {
      // In-memory fallback
    }

    for (const flag of this.memoryFlags.values()) {
      if (flag.id === keyOrId || flag.key === keyOrId) {
        return flag;
      }
    }
    return null;
  }

  /**
   * Creates a new feature flag.
   */
  static async createFeatureFlag(
    input: CreateFeatureFlagInput,
    actorAdminId?: string
  ): Promise<PlatformFeatureFlagDTO> {
    const flagDTO: PlatformFeatureFlagDTO = {
      id: 'ff_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
      key: input.key,
      name: input.name,
      description: input.description || null,
      enabled: input.enabled ?? false,
      scope: input.scope || FeatureFlagScope.GLOBAL,
      plan_tier: input.plan_tier || null,
      studio_id: input.studio_id || null,
      rollout_pct: input.rollout_pct ?? 100,
      created_by: actorAdminId || null,
      updated_by: actorAdminId || null,
      created_at: new Date(),
      updated_at: new Date(),
    };

    try {
      const created = await (prisma as any).platformFeatureFlag.create({
        data: {
          id: flagDTO.id,
          key: flagDTO.key,
          name: flagDTO.name,
          description: flagDTO.description,
          enabled: flagDTO.enabled,
          scope: flagDTO.scope,
          plan_tier: flagDTO.plan_tier,
          studio_id: flagDTO.studio_id,
          rollout_pct: flagDTO.rollout_pct,
          created_by: actorAdminId,
          updated_by: actorAdminId,
        },
      });
      if (created) {
        await AdminService.recordAuditLog({
          actorId: actorAdminId,
          action: 'FEATURE_FLAG_CREATED',
          entity: 'FEATURE_FLAG',
          entityId: created.id,
          metadata: { key: created.key, scope: created.scope, enabled: created.enabled },
        });
        return this.mapToDTO(created);
      }
    } catch (_err) {
      // In-memory fallback
    }

    this.memoryFlags.set(flagDTO.id, flagDTO);
    await AdminService.recordAuditLog({
      actorId: actorAdminId,
      action: 'FEATURE_FLAG_CREATED',
      entity: 'FEATURE_FLAG',
      entityId: flagDTO.id,
      metadata: { key: flagDTO.key, scope: flagDTO.scope, enabled: flagDTO.enabled },
    });
    return flagDTO;
  }

  /**
   * Updates an existing feature flag.
   */
  static async updateFeatureFlag(
    id: string,
    input: UpdateFeatureFlagInput,
    actorAdminId?: string
  ): Promise<PlatformFeatureFlagDTO | null> {
    try {
      const updated = await (prisma as any).platformFeatureFlag.update({
        where: { id },
        data: {
          ...input,
          updated_by: actorAdminId,
          updated_at: new Date(),
        },
      });
      if (updated) {
        await AdminService.recordAuditLog({
          actorId: actorAdminId,
          action: 'FEATURE_FLAG_UPDATED',
          entity: 'FEATURE_FLAG',
          entityId: updated.id,
          metadata: { updates: input },
        });
        return this.mapToDTO(updated);
      }
    } catch (_err) {
      // In-memory fallback
    }

    const existing = this.memoryFlags.get(id);
    if (!existing) return null;

    const updatedDTO: PlatformFeatureFlagDTO = {
      ...existing,
      ...input,
      updated_by: actorAdminId || existing.updated_by,
      updated_at: new Date(),
    };
    this.memoryFlags.set(id, updatedDTO);

    await AdminService.recordAuditLog({
      actorId: actorAdminId,
      action: 'FEATURE_FLAG_UPDATED',
      entity: 'FEATURE_FLAG',
      entityId: id,
      metadata: { updates: input },
    });
    return updatedDTO;
  }

  /**
   * Toggles feature flag state.
   */
  static async toggleFeatureFlag(
    id: string,
    enabled: boolean,
    actorAdminId?: string
  ): Promise<PlatformFeatureFlagDTO | null> {
    return this.updateFeatureFlag(id, { enabled }, actorAdminId);
  }

  /**
   * Deletes a feature flag.
   */
  static async deleteFeatureFlag(
    id: string,
    actorAdminId?: string
  ): Promise<boolean> {
    try {
      await (prisma as any).platformFeatureFlag.delete({
        where: { id },
      });
      await AdminService.recordAuditLog({
        actorId: actorAdminId,
        action: 'FEATURE_FLAG_DELETED',
        entity: 'FEATURE_FLAG',
        entityId: id,
      });
      return true;
    } catch (_err) {
      // In-memory fallback
    }

    const existed = this.memoryFlags.delete(id);
    if (existed) {
      await AdminService.recordAuditLog({
        actorId: actorAdminId,
        action: 'FEATURE_FLAG_DELETED',
        entity: 'FEATURE_FLAG',
        entityId: id,
      });
    }
    return existed;
  }

  /**
   * Evaluates if a feature flag is enabled for a specific context (studio / plan / user).
   */
  static async isFeatureEnabled(
    flagKey: string,
    context?: {
      studioId?: string;
      planTier?: SubscriptionPlan;
      userId?: string;
    }
  ): Promise<boolean> {
    const flag = await this.getFeatureFlag(flagKey);
    if (!flag || !flag.enabled) return false;

    // Global scope
    if (flag.scope === FeatureFlagScope.GLOBAL) {
      if (flag.rollout_pct >= 100) return true;
      if (flag.rollout_pct <= 0) return false;
      // Deterministic hash rollout
      const hashInput = (context?.studioId || context?.userId || flagKey) + flagKey;
      const hash = Math.abs(this.simpleHash(hashInput)) % 100;
      return hash < flag.rollout_pct;
    }

    // Plan tier scope
    if (flag.scope === FeatureFlagScope.PLAN) {
      if (!context?.planTier || !flag.plan_tier) return false;
      return context.planTier === flag.plan_tier;
    }

    // Studio scope
    if (flag.scope === FeatureFlagScope.STUDIO) {
      if (!context?.studioId || !flag.studio_id) return false;
      return context.studioId === flag.studio_id;
    }

    return flag.enabled;
  }

  private static mapToDTO(flag: any): PlatformFeatureFlagDTO {
    return {
      id: flag.id,
      key: flag.key,
      name: flag.name,
      description: flag.description,
      enabled: Boolean(flag.enabled),
      scope: flag.scope as FeatureFlagScope,
      plan_tier: flag.plan_tier as SubscriptionPlan | null,
      studio_id: flag.studio_id,
      rollout_pct: Number(flag.rollout_pct ?? 100),
      created_by: flag.created_by,
      updated_by: flag.updated_by,
      created_at: flag.created_at,
      updated_at: flag.updated_at,
    };
  }

  private static simpleHash(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = (hash << 5) - hash + str.charCodeAt(i);
      hash |= 0;
    }
    return hash;
  }
}
