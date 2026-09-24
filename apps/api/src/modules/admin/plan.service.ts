import {
  SubscriptionPlan,
  PlanFeatureKey,
  AdminPlanDTO,
} from '@pixmatch/types';
import { ALL_PLANS } from '../billing/plans.config.js';

export class AdminPlanService {
  private static customPlans: Map<string, AdminPlanDTO> = new Map();

  static initializePlans(): void {
    if (this.customPlans.size === 0) {
      for (const [key, plan] of Object.entries(ALL_PLANS)) {
        this.customPlans.set(key, {
          id: plan.id,
          name: plan.name,
          description: plan.description,
          monthly_price_inr: plan.pricing.INR.monthly_amount,
          annual_price_inr: plan.pricing.INR.yearly_amount,
          monthly_price_usd: plan.pricing.USD.monthly_amount,
          annual_price_usd: plan.pricing.USD.yearly_amount,
          storage_limit_bytes: plan.limits.max_storage_bytes,
          photo_limit: plan.limits.max_photos,
          gallery_limit: plan.limits.max_active_galleries,
          client_limit: plan.limits.max_clients,
          ai_search_limit: plan.limits.max_ai_searches,
          team_member_limit: plan.limits.max_team_members,
          features: [...plan.features],
          is_active: true,
          is_archived: false,
          subscriber_count: 0,
        });
      }
    }
  }

  static getAllPlans(): AdminPlanDTO[] {
    this.initializePlans();
    return Array.from(this.customPlans.values());
  }

  static getPlanById(id: string): AdminPlanDTO | undefined {
    this.initializePlans();
    return this.customPlans.get(id);
  }

  static createPlan(planData: Partial<AdminPlanDTO>, adminUserId?: string): AdminPlanDTO {
    this.initializePlans();
    const planId = (planData.id || 'custom_' + Date.now()).toUpperCase();
    const newPlan: AdminPlanDTO = {
      id: planId,
      name: planData.name || 'Custom Plan',
      description: planData.description || 'Custom tailored studio tier',
      monthly_price_inr: planData.monthly_price_inr ?? 399900,
      annual_price_inr: planData.annual_price_inr ?? 3999000,
      monthly_price_usd: planData.monthly_price_usd ?? 4900,
      annual_price_usd: planData.annual_price_usd ?? 49000,
      storage_limit_bytes: planData.storage_limit_bytes ?? 250 * 1024 * 1024 * 1024,
      photo_limit: planData.photo_limit ?? 50000,
      gallery_limit: planData.gallery_limit ?? 100,
      client_limit: planData.client_limit ?? 500,
      ai_search_limit: planData.ai_search_limit ?? 2500,
      team_member_limit: planData.team_member_limit ?? 10,
      features: planData.features || ['CLIENT_GALLERY', 'CUSTOM_BRANDING', 'ADVANCED_ANALYTICS'],
      is_active: planData.is_active ?? true,
      is_archived: false,
      subscriber_count: 0,
    };
    this.customPlans.set(planId, newPlan);
    return newPlan;
  }

  static updatePlan(id: string, updates: Partial<AdminPlanDTO>, adminUserId?: string): AdminPlanDTO {
    this.initializePlans();
    const existing = this.customPlans.get(id);
    if (!existing) {
      throw new Error(`Plan with ID '${id}' not found`);
    }

    const updated: AdminPlanDTO = {
      ...existing,
      ...updates,
      id: existing.id, // Immutable ID
    };
    this.customPlans.set(id, updated);
    return updated;
  }

  static archivePlan(id: string, adminUserId?: string): AdminPlanDTO {
    this.initializePlans();
    const existing = this.customPlans.get(id);
    if (!existing) {
      throw new Error(`Plan with ID '${id}' not found`);
    }

    // Non-destructive: mark archived, never delete
    existing.is_archived = true;
    existing.is_active = false;
    this.customPlans.set(id, existing);
    return existing;
  }
}
