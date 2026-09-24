import { prisma } from '@pixmatch/database';
import {
  SubscriptionPlan,
  SubscriptionStatus,
  PlanFeatureKey,
  EntitlementCheckResult,
} from '@pixmatch/types';
import { getPlanDefinition } from './plans.config.js';
import { UsageService } from './usage.service.js';

import { BillingService } from './billing.service.js';

export class EntitlementService {
  /**
   * Evaluates whether the studio can create a new gallery.
   */
  static async checkGalleryCreation(studioId: string): Promise<EntitlementCheckResult> {
    const subscription = await BillingService.getSubscription(studioId);

    const plan = (subscription?.plan || SubscriptionPlan.FREE) as SubscriptionPlan;
    const planDef = getPlanDefinition(plan);
    const limit = subscription?.max_galleries ?? planDef.limits.max_active_galleries;

    // Past due check: restrict new creation
    if (subscription?.status === SubscriptionStatus.PAST_DUE) {
      return {
        allowed: false,
        reason: 'Subscription is past due. Please update payment method to create new galleries.',
        upgrade_recommended_plan: SubscriptionPlan.PRO,
      };
    }

    if (limit === null) {
      return { allowed: true };
    }

    let currentActive = 0;
    try {
      currentActive = await prisma.gallery.count({
        where: {
          studio_id: studioId,
          status: { in: ['ACTIVE', 'DRAFT'] },
        },
      });
    } catch (_err) {}

    if (currentActive >= limit) {
      return {
        allowed: false,
        reason: `Gallery limit reached (${currentActive}/${limit} active galleries). Upgrade to increase your limit.`,
        current_usage: currentActive,
        limit,
        upgrade_recommended_plan: plan === SubscriptionPlan.FREE ? SubscriptionPlan.STARTER : SubscriptionPlan.PRO,
      };
    }

    return {
      allowed: true,
      current_usage: currentActive,
      limit,
    };
  }

  /**
   * Evaluates whether incoming photos and storage bytes fit within subscription quotas.
   */
  static async checkPhotoUpload(
    studioId: string,
    incomingBytes: number = 0,
    incomingCount: number = 1
  ): Promise<EntitlementCheckResult> {
    const subscription = await BillingService.getSubscription(studioId);

    const plan = (subscription?.plan || SubscriptionPlan.FREE) as SubscriptionPlan;
    const planDef = getPlanDefinition(plan);

    if (subscription?.status === SubscriptionStatus.PAST_DUE) {
      return {
        allowed: false,
        reason: 'Subscription is past due. Please resolve billing to upload photos.',
        upgrade_recommended_plan: SubscriptionPlan.PRO,
      };
    }

    const usage = await UsageService.getStudioUsageSummary(studioId);

    // 1. Check Photo Count Limit
    if (usage.photos.limit !== null) {
      if (usage.photos.used + incomingCount > usage.photos.limit) {
        return {
          allowed: false,
          reason: `Photo limit exceeded. Current: ${usage.photos.used}, Incoming: ${incomingCount}, Plan Limit: ${usage.photos.limit}.`,
          current_usage: usage.photos.used,
          limit: usage.photos.limit,
          upgrade_recommended_plan: plan === SubscriptionPlan.FREE ? SubscriptionPlan.STARTER : SubscriptionPlan.PRO,
        };
      }
    }

    // 2. Check Storage Bytes Limit
    if (usage.storage.limit !== null) {
      if (usage.storage.used + incomingBytes > usage.storage.limit) {
        const usedMb = Math.round(usage.storage.used / (1024 * 1024));
        const limitMb = Math.round(usage.storage.limit / (1024 * 1024));
        return {
          allowed: false,
          reason: `Storage quota exceeded. Used: ${usedMb} MB, Limit: ${limitMb} MB. Please upgrade your storage plan.`,
          current_usage: usage.storage.used,
          limit: usage.storage.limit,
          upgrade_recommended_plan: plan === SubscriptionPlan.FREE ? SubscriptionPlan.STARTER : SubscriptionPlan.PRO,
        };
      }
    }

    return { allowed: true };
  }

  /**
   * Evaluates whether a new client can be added to the studio CRM.
   */
  static async checkClientCreation(studioId: string): Promise<EntitlementCheckResult> {
    const subscription = await BillingService.getSubscription(studioId);

    const plan = (subscription?.plan || SubscriptionPlan.FREE) as SubscriptionPlan;
    const planDef = getPlanDefinition(plan);
    const limit = subscription?.max_clients ?? planDef.limits.max_clients;

    if (limit === null) {
      return { allowed: true };
    }

    let currentClients = 0;
    try {
      currentClients = await prisma.client.count({
        where: {
          studio_id: studioId,
          deleted_at: null,
        },
      });
    } catch (_err) {}

    if (currentClients >= limit) {
      return {
        allowed: false,
        reason: `Client CRM limit reached (${currentClients}/${limit} clients). Upgrade your plan to manage more clients.`,
        current_usage: currentClients,
        limit,
        upgrade_recommended_plan: plan === SubscriptionPlan.FREE ? SubscriptionPlan.STARTER : SubscriptionPlan.PRO,
      };
    }

    return {
      allowed: true,
      current_usage: currentClients,
      limit,
    };
  }

  /**
   * Evaluates whether the studio has remaining monthly AI searches.
   */
  static async checkAiSearch(studioId: string): Promise<EntitlementCheckResult> {
    const subscription = await BillingService.getSubscription(studioId);

    const plan = (subscription?.plan || SubscriptionPlan.FREE) as SubscriptionPlan;
    const planDef = getPlanDefinition(plan);
    const limit = subscription?.ai_search_limit ?? planDef.limits.max_ai_searches;

    if (limit === null) {
      return { allowed: true };
    }

    const periodStart = subscription?.current_period_start || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    let searchesUsed = 0;
    try {
      searchesUsed = await prisma.aiSearchLog.count({
        where: {
          studio_id: studioId,
          created_at: { gte: periodStart },
        },
      });
    } catch (_err) {}

    if (searchesUsed >= limit) {
      return {
        allowed: false,
        reason: `Monthly AI search quota reached (${searchesUsed}/${limit} searches). Upgrade plan for more AI queries.`,
        current_usage: searchesUsed,
        limit,
        upgrade_recommended_plan: plan === SubscriptionPlan.FREE ? SubscriptionPlan.STARTER : SubscriptionPlan.PRO,
      };
    }

    return {
      allowed: true,
      current_usage: searchesUsed,
      limit,
    };
  }

  /**
   * Evaluates whether an additional team member / photographer can be invited.
   */
  static async checkTeamMemberAddition(studioId: string): Promise<EntitlementCheckResult> {
    const subscription = await BillingService.getSubscription(studioId);

    const plan = (subscription?.plan || SubscriptionPlan.FREE) as SubscriptionPlan;
    const planDef = getPlanDefinition(plan);
    const limit = subscription?.max_team_members ?? planDef.limits.max_team_members;

    if (limit === null) {
      return { allowed: true };
    }

    let currentMembers = 1;
    try {
      currentMembers = await prisma.studioMembership.count({
        where: { studio_id: studioId },
      });
    } catch (_err) {}

    if (currentMembers >= limit) {
      return {
        allowed: false,
        reason: `Team seat limit reached (${currentMembers}/${limit} members). Upgrade to add more team photographers.`,
        current_usage: currentMembers,
        limit,
        upgrade_recommended_plan: SubscriptionPlan.STUDIO,
      };
    }

    return {
      allowed: true,
      current_usage: currentMembers,
      limit,
    };
  }

  /**
   * Evaluates whether a specific feature flag is granted by the studio's subscription plan.
   */
  static async checkFeatureAccess(studioId: string, feature: PlanFeatureKey): Promise<EntitlementCheckResult> {
    const subscription = await BillingService.getSubscription(studioId);

    const plan = (subscription?.plan || SubscriptionPlan.FREE) as SubscriptionPlan;
    const planDef = getPlanDefinition(plan);

    const hasFeature = planDef.features.includes(feature);
    if (!hasFeature) {
      return {
        allowed: false,
        reason: `Feature '${feature}' is not included in the ${planDef.name} plan. Upgrade to unlock this capability.`,
        upgrade_recommended_plan: SubscriptionPlan.PRO,
      };
    }

    return { allowed: true };
  }
}
