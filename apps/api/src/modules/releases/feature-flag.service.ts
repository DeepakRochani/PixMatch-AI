import crypto from 'crypto';
import { prisma } from '@pixmatch/database';
import {
  PlatformFeatureFlagV2DTO,
  FeatureFlagType,
  FeatureFlagState,
  FeatureFlagScope,
  PlatformEnvironment,
  SubscriptionPlan,
  FeatureFlagVariant,
  FeatureFlagTargetingRules,
  FeatureFlagVersionDTO,
  EvaluationContext,
  FeatureFlagEvaluationResult,
} from '@pixmatch/types';

export class FeatureFlagService {
  private static memoryFlags = new Map<string, PlatformFeatureFlagV2DTO>();
  private static memoryVersions = new Map<string, FeatureFlagVersionDTO[]>();

  public static clearMockState(): void {
    this.memoryFlags.clear();
    this.memoryVersions.clear();
  }

  /**
   * Deterministic Murmur/SHA-256 hash bucketing into [0, 99].
   * NEVER uses Math.random().
   */
  public static calculateBucket(flagKey: string, subjectId: string): number {
    const input = `${flagKey}:${subjectId}`;
    const hash = crypto.createHash('sha256').update(input).digest('hex');
    const numeric = parseInt(hash.substring(0, 8), 16);
    return numeric % 100;
  }

  /**
   * Evaluates a feature flag deterministically against an evaluation context.
   */
  public static async evaluateFeatureFlag(
    flagKey: string,
    context: EvaluationContext
  ): Promise<FeatureFlagEvaluationResult> {
    const flag = await this.getFeatureFlag(flagKey);

    if (!flag) {
      return {
        enabled: false,
        flag_key: flagKey,
        variant: null,
        reason: 'FLAG_NOT_FOUND',
        version: 0,
      };
    }

    // Check emergency kill switch
    if (flag.kill_switch_enabled) {
      return {
        enabled: false,
        flag_key: flagKey,
        variant: null,
        reason: `Emergency kill switch is ACTIVE: ${flag.kill_switch_reason || 'Disabled by platform security incident'}`,
        version: flag.current_version,
        kill_switch_active: true,
      };
    }

    // Check state
    if (flag.state !== FeatureFlagState.ACTIVE && !flag.enabled) {
      return {
        enabled: false,
        flag_key: flagKey,
        variant: null,
        reason: `Feature flag is inactive (State: ${flag.state})`,
        version: flag.current_version,
      };
    }

    // Environment targeting check
    if (context.environment && flag.environment) {
      const normalizedCtxEnv = context.environment.toString().toUpperCase();
      const normalizedFlagEnv = flag.environment.toString().toUpperCase();
      if (normalizedCtxEnv !== normalizedFlagEnv) {
        return {
          enabled: false,
          flag_key: flagKey,
          variant: null,
          reason: `Environment mismatch: flag requires ${flag.environment}, context is ${context.environment}`,
          version: flag.current_version,
        };
      }
    }

    const targeting = flag.targeting || {};

    // Check Studio Blocklist
    const blockedStudios = targeting.studios_blocklist || (targeting as any).blocked_studios;
    if (context.studio_id && blockedStudios?.includes(context.studio_id)) {
      return {
        enabled: false,
        flag_key: flagKey,
        variant: null,
        reason: 'Studio is explicitly blocked in flag targeting rules',
        version: flag.current_version,
      };
    }

    // Check Studio Allowlist
    const allowedStudios = targeting.studios_allowlist || (targeting as any).allowed_studios;
    if (context.studio_id && allowedStudios && allowedStudios.length > 0) {
      if (allowedStudios.includes(context.studio_id)) {
        return {
          enabled: true,
          flag_key: flagKey,
          variant: flag.default_variant || null,
          reason: 'Studio is explicitly allowlisted in flag targeting rules',
          version: flag.current_version,
        };
      } else if (flag.flag_type === FeatureFlagType.ALLOWLIST || flag.flag_type === FeatureFlagType.STUDIO) {
        return {
          enabled: false,
          flag_key: flagKey,
          variant: null,
          reason: 'Studio is not in allowed studios list',
          version: flag.current_version,
        };
      }
    }

    // Check User Allowlist
    const allowedUsers = targeting.users_allowlist || (targeting as any).allowed_users;
    if (context.user_id && allowedUsers && allowedUsers.length > 0) {
      if (allowedUsers.includes(context.user_id)) {
        return {
          enabled: true,
          flag_key: flagKey,
          variant: flag.default_variant || null,
          reason: 'User is explicitly allowlisted',
          version: flag.current_version,
        };
      }
    }

    // Check Plan Targeting
    const allowedPlans = targeting.plans_allowlist || (targeting as any).allowed_plans;
    if (allowedPlans && allowedPlans.length > 0) {
      if (!context.plan || !allowedPlans.includes(context.plan)) {
        return {
          enabled: false,
          flag_key: flagKey,
          variant: null,
          reason: `Studio plan [${context.plan || 'NONE'}] is not in allowed plans [${allowedPlans.join(', ')}]`,
          version: flag.current_version,
        };
      } else {
        return {
          enabled: true,
          flag_key: flagKey,
          variant: flag.default_variant || null,
          reason: 'Plan meets targeting requirement',
          version: flag.current_version,
        };
      }
    }

    // Legacy plan_tier property fallback
    if (flag.plan_tier && context.plan && context.plan !== flag.plan_tier) {
      return {
        enabled: false,
        flag_key: flagKey,
        variant: null,
        reason: `Studio plan is not in allowed plans. Required ${flag.plan_tier}`,
        version: flag.current_version,
      };
    } else if (flag.plan_tier && context.plan && context.plan === flag.plan_tier) {
      return {
        enabled: true,
        flag_key: flagKey,
        variant: flag.default_variant || null,
        reason: 'Plan meets targeting requirement',
        version: flag.current_version,
      };
    }

    // Boolean flag evaluation
    if (flag.flag_type === FeatureFlagType.BOOLEAN) {
      return {
        enabled: flag.enabled,
        flag_key: flagKey,
        variant: null,
        reason: flag.enabled ? 'Boolean flag is enabled' : 'Boolean flag is disabled',
        version: flag.current_version,
      };
    }

    // Percentage Rollout / Bucketing
    const subjectId = context.studio_id || context.user_id || 'anonymous';
    const bucket = this.calculateBucket(flagKey, subjectId);

    if (flag.rollout_pct < 100 && bucket >= flag.rollout_pct) {
      return {
        enabled: false,
        flag_key: flagKey,
        variant: null,
        reason: `PERCENTAGE_ROLLOUT_EXCLUDED: Bucket ${bucket} >= Rollout ${flag.rollout_pct}%`,
        bucket,
        version: flag.current_version,
      };
    }

    // Variant Evaluation
    let selectedVariant: string | null = flag.default_variant || null;
    if (flag.flag_type === FeatureFlagType.VARIANT && flag.variants && flag.variants.length > 0) {
      let cumulativeWeight = 0;
      for (const v of flag.variants) {
        cumulativeWeight += v.weight_pct;
        if (bucket < cumulativeWeight) {
          selectedVariant = v.key;
          break;
        }
      }
    }

    return {
      enabled: true,
      flag_key: flagKey,
      variant: selectedVariant,
      reason: 'MATCHED_TARGETING_CRITERIA',
      bucket,
      version: flag.current_version,
    };
  }

  /**
   * Retrieves a feature flag by key or ID.
   */
  public static async getFeatureFlag(keyOrId: string): Promise<PlatformFeatureFlagV2DTO | null> {
    try {
      if (process.env.DATABASE_URL && process.env.NODE_ENV !== 'test' && prisma && (prisma as any).platformFeatureFlag) {
        const flag = await (prisma as any).platformFeatureFlag.findFirst({
          where: {
            OR: [{ id: keyOrId }, { key: keyOrId }],
          },
        });
        if (flag) return this.mapToDTO(flag);
      }
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
   * Lists feature flags with optional filtering.
   */
  public static async listFeatureFlags(filters?: {
    environment?: PlatformEnvironment;
    state?: FeatureFlagState;
    flag_type?: FeatureFlagType;
    search?: string;
  }): Promise<PlatformFeatureFlagV2DTO[]> {
    let result: PlatformFeatureFlagV2DTO[] = [];

    try {
      if (process.env.DATABASE_URL && process.env.NODE_ENV !== 'test' && prisma && (prisma as any).platformFeatureFlag) {
        const flags = await (prisma as any).platformFeatureFlag.findMany({
          orderBy: { created_at: 'desc' },
        });
        if (flags && flags.length > 0) {
          result = flags.map(this.mapToDTO);
        }
      }
    } catch (_err) {
      // In-memory fallback
    }

    if (result.length === 0) {
      result = Array.from(this.memoryFlags.values());
    }

    if (filters?.environment) {
      result = result.filter((f) => f.environment === filters.environment);
    }
    if (filters?.state) {
      result = result.filter((f) => f.state === filters.state);
    }
    if (filters?.flag_type) {
      result = result.filter((f) => f.flag_type === filters.flag_type);
    }
    if (filters?.search) {
      const s = filters.search.toLowerCase();
      result = result.filter(
        (f) => f.key.toLowerCase().includes(s) || f.name.toLowerCase().includes(s)
      );
    }

    return result;
  }

  /**
   * Creates a new feature flag with initial version snapshot.
   */
  public static async createFeatureFlag(
    input: {
      key: string;
      name: string;
      description?: string;
      flag_type?: FeatureFlagType;
      state?: FeatureFlagState;
      enabled?: boolean;
      environment?: PlatformEnvironment;
      scope?: FeatureFlagScope;
      plan_tier?: SubscriptionPlan;
      studio_id?: string;
      rollout_pct?: number;
      variants?: FeatureFlagVariant[];
      default_variant?: string;
      targeting?: FeatureFlagTargetingRules;
    },
    actorAdminId?: string
  ): Promise<PlatformFeatureFlagV2DTO> {
    const existing = await this.getFeatureFlag(input.key);
    if (existing) {
      throw new Error(`Feature flag with key '${input.key}' already exists`);
    }

    const flagDTO: PlatformFeatureFlagV2DTO = {
      id: `ff_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      key: input.key,
      name: input.name,
      description: input.description || null,
      flag_type: input.flag_type || FeatureFlagType.BOOLEAN,
      type: (input.flag_type || FeatureFlagType.BOOLEAN) as any,
      state: input.state || FeatureFlagState.DRAFT,
      enabled: input.enabled ?? false,
      environment: input.environment || PlatformEnvironment.PRODUCTION,
      scope: input.scope || FeatureFlagScope.GLOBAL,
      plan_tier: input.plan_tier || null,
      studio_id: input.studio_id || null,
      rollout_pct: input.rollout_pct ?? 100,
      percentage: input.rollout_pct ?? 100,
      variants: input.variants || [],
      default_variant: input.default_variant || null,
      targeting: input.targeting || {},
      current_version: 1,
      kill_switch_enabled: false,
      kill_switch_reason: null,
      created_by: actorAdminId || null,
      updated_by: actorAdminId || null,
      created_at: new Date(),
      updated_at: new Date(),
    };

    // Save initial version
    const versionDTO: FeatureFlagVersionDTO = {
      id: `ffv_${Date.now()}_1`,
      flag_id: flagDTO.id,
      version: 1,
      configuration: {
        enabled: flagDTO.enabled,
        state: flagDTO.state,
        type: flagDTO.flag_type,
        rollout_pct: flagDTO.rollout_pct,
        variants: flagDTO.variants,
        default_variant: flagDTO.default_variant,
        targeting: flagDTO.targeting,
      },
      change_reason: 'Initial flag creation',
      created_by: actorAdminId,
      created_at: new Date(),
    };

    try {
      if (process.env.DATABASE_URL && process.env.NODE_ENV !== 'test' && prisma && (prisma as any).platformFeatureFlag) {
        await (prisma as any).platformFeatureFlag.create({
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
      }
    } catch (_err) {
      // In-memory fallback
    }

    this.memoryFlags.set(flagDTO.id, flagDTO);
    const versions = this.memoryVersions.get(flagDTO.key) || [];
    versions.push(versionDTO);
    this.memoryVersions.set(flagDTO.key, versions);

    return flagDTO;
  }

  /**
   * Updates feature flag configuration and appends an immutable version snapshot.
   */
  public static async updateFeatureFlag(
    keyOrId: string,
    updates: Partial<{
      name: string;
      description: string;
      flag_type: FeatureFlagType;
      state: FeatureFlagState;
      enabled: boolean;
      environment: PlatformEnvironment;
      rollout_pct: number;
      variants: FeatureFlagVariant[];
      default_variant: string;
      targeting: FeatureFlagTargetingRules;
      plan_tier: SubscriptionPlan;
    }>,
    changeReason?: string,
    actorAdminId?: string
  ): Promise<PlatformFeatureFlagV2DTO> {
    const flag = await this.getFeatureFlag(keyOrId);
    if (!flag) {
      throw new Error(`Feature flag '${keyOrId}' not found`);
    }

    const nextVersion = flag.current_version + 1;
    const updatedFlag: PlatformFeatureFlagV2DTO = {
      ...flag,
      ...updates,
      type: (updates.flag_type || (updates as any).type || flag.flag_type || flag.type) as any,
      percentage: updates.rollout_pct !== undefined ? updates.rollout_pct : ((updates as any).percentage !== undefined ? (updates as any).percentage : (flag.rollout_pct ?? flag.percentage ?? 100)),
      current_version: nextVersion,
      updated_by: actorAdminId || flag.updated_by,
      updated_at: new Date(),
    };

    const versionDTO: FeatureFlagVersionDTO = {
      id: `ffv_${Date.now()}_${nextVersion}`,
      flag_id: updatedFlag.id,
      version: nextVersion,
      configuration: {
        enabled: updatedFlag.enabled,
        state: updatedFlag.state,
        type: updatedFlag.flag_type,
        rollout_pct: updatedFlag.rollout_pct,
        variants: updatedFlag.variants,
        default_variant: updatedFlag.default_variant,
        targeting: updatedFlag.targeting,
      },
      change_reason: changeReason || 'Configuration update',
      created_by: actorAdminId,
      created_at: new Date(),
    };

    this.memoryFlags.set(updatedFlag.id, updatedFlag);
    const versions = this.memoryVersions.get(updatedFlag.key) || [];
    versions.push(versionDTO);
    this.memoryVersions.set(updatedFlag.key, versions);

    return updatedFlag;
  }

  /**
   * Activates or pauses a feature flag.
   */
  public static async setFlagState(
    keyOrId: string,
    state: FeatureFlagState,
    actorAdminId?: string,
    reason?: string
  ): Promise<PlatformFeatureFlagV2DTO> {
    const isEnabled = state === FeatureFlagState.ACTIVE;
    return await this.updateFeatureFlag(
      keyOrId,
      { state, enabled: isEnabled },
      reason || `Transition state to ${state}`,
      actorAdminId
    );
  }

  /**
   * Rolls back a feature flag to a previous version snapshot without losing version history.
   */
  public static async rollbackFeatureFlag(
    keyOrId: string,
    targetVersion: number,
    rollbackReason: string,
    actorAdminId?: string
  ): Promise<PlatformFeatureFlagV2DTO> {
    const flag = await this.getFeatureFlag(keyOrId);
    if (!flag) throw new Error(`Feature flag '${keyOrId}' not found`);

    const versions = this.memoryVersions.get(flag.key) || [];
    const targetSnapshot = versions.find((v) => v.version === targetVersion);
    if (!targetSnapshot) {
      throw new Error(`Version ${targetVersion} not found for flag '${flag.key}'`);
    }

    const cfg = targetSnapshot.configuration;
    const formattedReason = rollbackReason.startsWith('Rolled back')
      ? rollbackReason
      : `Rolled back to v${targetVersion}: ${rollbackReason}`;

    return await this.updateFeatureFlag(
      flag.key,
      {
        enabled: cfg.enabled,
        state: FeatureFlagState.ROLLED_BACK,
        flag_type: cfg.type,
        rollout_pct: cfg.rollout_pct,
        variants: cfg.variants,
        default_variant: cfg.default_variant || undefined,
        targeting: cfg.targeting,
      },
      formattedReason,
      actorAdminId
    );
  }

  /**
   * Alias for createFeatureFlag with relaxed input parameters.
   */
  public static async createFlag(
    input: any,
    actorAdminId?: string
  ): Promise<PlatformFeatureFlagV2DTO> {
    const targeting = input.targeting || {};
    const normalizedTargeting: FeatureFlagTargetingRules = {
      studios_allowlist: targeting.allowed_studios || targeting.studios_allowlist || [],
      studios_blocklist: targeting.blocked_studios || targeting.studios_blocklist || [],
      plans_allowlist: targeting.allowed_plans || targeting.plans_allowlist || [],
      users_allowlist: targeting.allowed_users || targeting.users_allowlist || [],
    };

    return await this.createFeatureFlag(
      {
        key: input.key,
        name: input.name,
        description: input.description,
        flag_type: input.type || input.flag_type || FeatureFlagType.BOOLEAN,
        state: input.state || FeatureFlagState.DRAFT,
        enabled: input.enabled ?? false,
        environment: input.environment || PlatformEnvironment.PRODUCTION,
        scope: input.scope || FeatureFlagScope.GLOBAL,
        plan_tier: input.plan_tier,
        studio_id: input.studio_id,
        rollout_pct: input.percentage !== undefined ? input.percentage : (input.rollout_pct ?? 100),
        variants: input.variants || [],
        default_variant: input.default_variant,
        targeting: normalizedTargeting,
      },
      actorAdminId
    );
  }

  /**
   * Alias for updateFeatureFlag.
   */
  public static async updateFlag(
    keyOrId: string,
    updates: any,
    actorAdminId?: string,
    changeReason?: string
  ): Promise<PlatformFeatureFlagV2DTO> {
    const normalizedUpdates: any = { ...updates };
    if (updates.type !== undefined) normalizedUpdates.flag_type = updates.type;
    if (updates.percentage !== undefined) normalizedUpdates.rollout_pct = updates.percentage;

    return await this.updateFeatureFlag(keyOrId, normalizedUpdates, changeReason || 'Flag updated', actorAdminId);
  }

  /**
   * Alias for rollbackFeatureFlag.
   */
  public static async rollbackFlag(
    keyOrId: string,
    targetVersion: number,
    param3?: string,
    param4?: string
  ): Promise<PlatformFeatureFlagV2DTO> {
    let actorAdminId = 'admin';
    let reason = `Rolled back to v${targetVersion}`;

    if (param4 !== undefined) {
      actorAdminId = param3 || 'admin';
      reason = `Rolled back to v${targetVersion}: ${param4}`;
    } else if (param3) {
      if (param3.includes(' ') || param3.length > 20) {
        reason = `Rolled back to v${targetVersion}: ${param3}`;
      } else {
        actorAdminId = param3;
      }
    }

    return await this.rollbackFeatureFlag(keyOrId, targetVersion, reason, actorAdminId);
  }

  /**
   * Activates emergency kill switch for a feature flag.
   */
  public static async activateKillSwitch(
    keyOrId: string,
    param2?: string,
    param3?: string
  ): Promise<PlatformFeatureFlagV2DTO> {
    const flag = await this.getFeatureFlag(keyOrId);
    if (!flag) throw new Error(`Feature flag '${keyOrId}' not found`);

    let actorAdminId = 'admin';
    let reason = 'Emergency kill switch triggered';

    if (param3 !== undefined) {
      actorAdminId = param2 || 'admin';
      reason = param3;
    } else if (param2) {
      if (param2.includes(' ') || param2.length > 30) {
        reason = param2;
      } else {
        actorAdminId = param2;
      }
    }

    flag.kill_switch_enabled = true;
    flag.kill_switch_reason = reason;
    flag.kill_switch_activated_at = new Date();
    flag.kill_switch_activated_by = actorAdminId;
    flag.enabled = false;
    flag.state = FeatureFlagState.PAUSED;
    flag.updated_at = new Date();

    this.memoryFlags.set(flag.id, flag);
    return flag;
  }

  /**
   * Deactivates emergency kill switch for a feature flag.
   */
  public static async deactivateKillSwitch(
    keyOrId: string,
    param2?: string,
    param3?: string
  ): Promise<PlatformFeatureFlagV2DTO> {
    const flag = await this.getFeatureFlag(keyOrId);
    if (!flag) throw new Error(`Feature flag '${keyOrId}' not found`);

    let actorAdminId = 'admin';
    if (param3 !== undefined) {
      actorAdminId = param2 || 'admin';
    } else if (param2 && !param2.includes(' ')) {
      actorAdminId = param2;
    }

    flag.kill_switch_enabled = false;
    flag.kill_switch_reason = null;
    flag.kill_switch_activated_at = null;
    flag.kill_switch_activated_by = null;
    flag.state = FeatureFlagState.ACTIVE;
    flag.enabled = true;
    flag.updated_at = new Date();

    this.memoryFlags.set(flag.id, flag);
    return flag;
  }

  /**
   * Retrieves version history for a feature flag.
   */
  public static async getFlagVersions(keyOrId: string): Promise<FeatureFlagVersionDTO[]> {
    let list: FeatureFlagVersionDTO[] = [];
    const byKey = this.memoryVersions.get(keyOrId);
    if (byKey && byKey.length > 0) {
      list = byKey;
    } else {
      const flag = await this.getFeatureFlag(keyOrId);
      if (flag) {
        list = this.memoryVersions.get(flag.id) || this.memoryVersions.get(flag.key) || [];
      }
    }

    return list.slice().sort((a, b) => b.version - a.version);
  }

  private static mapToDTO(raw: any): PlatformFeatureFlagV2DTO {
    const flagType = raw.flag_type || raw.type || FeatureFlagType.BOOLEAN;
    const rollout = raw.rollout_pct !== undefined ? raw.rollout_pct : (raw.percentage !== undefined ? raw.percentage : 100);

    return {
      id: raw.id,
      key: raw.key,
      name: raw.name,
      description: raw.description,
      flag_type: flagType,
      type: flagType,
      state: raw.state || (raw.enabled ? FeatureFlagState.ACTIVE : FeatureFlagState.PAUSED),
      enabled: Boolean(raw.enabled),
      environment: raw.environment || PlatformEnvironment.PRODUCTION,
      scope: raw.scope || FeatureFlagScope.GLOBAL,
      plan_tier: raw.plan_tier,
      studio_id: raw.studio_id,
      rollout_pct: rollout,
      percentage: rollout,
      variants: raw.variants || [],
      default_variant: raw.default_variant,
      targeting: raw.targeting || {},
      current_version: raw.current_version || 1,
      kill_switch_enabled: Boolean(raw.kill_switch_enabled),
      kill_switch_reason: raw.kill_switch_reason,
      kill_switch_activated_at: raw.kill_switch_activated_at,
      kill_switch_activated_by: raw.kill_switch_activated_by,
      created_by: raw.created_by,
      updated_by: raw.updated_by,
      created_at: raw.created_at,
      updated_at: raw.updated_at,
    };
  }
}
