import { SubscriptionPlan, PlanDefinitionDTO, PlanFeatureKey } from '@pixmatch/types';

export const ALL_PLANS: Record<SubscriptionPlan, PlanDefinitionDTO> = {
  [SubscriptionPlan.FREE]: {
    id: SubscriptionPlan.FREE,
    name: 'Free Trial',
    slug: 'free',
    description: 'Essential AI photo delivery for individual photographers exploring PixMatch.',
    active: true,
    display_order: 1,
    pricing: {
      INR: {
        currency: 'INR',
        monthly_amount: 0,
        yearly_amount: 0,
        display_monthly: '₹0',
        display_yearly: '₹0',
      },
      USD: {
        currency: 'USD',
        monthly_amount: 0,
        yearly_amount: 0,
        display_monthly: '$0',
        display_yearly: '$0',
      },
    },
    limits: {
      max_galleries: 3,
      max_active_galleries: 3,
      max_photos: 500,
      max_clients: 10,
      max_storage_bytes: 2 * 1024 * 1024 * 1024, // 2 GB
      max_ai_searches: 50,
      max_ai_indexed_photos: 500,
      max_team_members: 1, // owner only
      max_downloads: 100,
      max_monthly_bandwidth: 10 * 1024 * 1024 * 1024, // 10 GB
      max_delivery_emails: 20,
    },
    features: [
      'CLIENT_GALLERY',
      'AI_FACE_SEARCH',
      'GALLERY_DELIVERY',
      'BULK_DOWNLOAD',
    ],
  },

  [SubscriptionPlan.STARTER]: {
    id: SubscriptionPlan.STARTER,
    name: 'Starter',
    slug: 'starter',
    description: 'Perfect for freelance photographers with growing client lists and regular events.',
    active: true,
    display_order: 2,
    badge: 'Starter Choice',
    pricing: {
      INR: {
        currency: 'INR',
        monthly_amount: 99900, // ₹999 / mo
        yearly_amount: 999000,  // ₹9,990 / yr (2 months free)
        provider_price_id_monthly: process.env.STRIPE_PRICE_STARTER_MONTHLY || 'price_starter_monthly_inr',
        provider_price_id_yearly: process.env.STRIPE_PRICE_STARTER_YEARLY || 'price_starter_yearly_inr',
        display_monthly: '₹999',
        display_yearly: '₹9,990',
      },
      USD: {
        currency: 'USD',
        monthly_amount: 1500, // $15 / mo
        yearly_amount: 15000, // $150 / yr
        provider_price_id_monthly: 'price_starter_monthly_usd',
        provider_price_id_yearly: 'price_starter_yearly_usd',
        display_monthly: '$15',
        display_yearly: '$150',
      },
    },
    limits: {
      max_galleries: 15,
      max_active_galleries: 15,
      max_photos: 5000,
      max_clients: 100,
      max_storage_bytes: 25 * 1024 * 1024 * 1024, // 25 GB
      max_ai_searches: 500,
      max_ai_indexed_photos: 5000,
      max_team_members: 2,
      max_downloads: 1000,
      max_monthly_bandwidth: 50 * 1024 * 1024 * 1024, // 50 GB
      max_delivery_emails: 200,
    },
    features: [
      'CLIENT_GALLERY',
      'AI_FACE_SEARCH',
      'CUSTOM_BRANDING',
      'CLIENT_CRM',
      'GALLERY_DELIVERY',
      'BULK_DOWNLOAD',
      'ORIGINAL_DOWNLOAD',
      'CLOUD_STORAGE',
    ],
  },

  [SubscriptionPlan.PRO]: {
    id: SubscriptionPlan.PRO,
    name: 'Professional',
    slug: 'pro',
    description: 'Our most popular plan for high-volume wedding and portrait studios.',
    active: true,
    display_order: 3,
    popular: true,
    badge: 'Most Popular',
    pricing: {
      INR: {
        currency: 'INR',
        monthly_amount: 249900, // ₹2,499 / mo
        yearly_amount: 2499000,  // ₹24,990 / yr
        provider_price_id_monthly: process.env.STRIPE_PRICE_PRO_MONTHLY || 'price_pro_monthly_inr',
        provider_price_id_yearly: process.env.STRIPE_PRICE_PRO_YEARLY || 'price_pro_yearly_inr',
        display_monthly: '₹2,499',
        display_yearly: '₹24,990',
      },
      USD: {
        currency: 'USD',
        monthly_amount: 3500, // $35 / mo
        yearly_amount: 35000, // $350 / yr
        provider_price_id_monthly: 'price_pro_monthly_usd',
        provider_price_id_yearly: 'price_pro_yearly_usd',
        display_monthly: '$35',
        display_yearly: '$350',
      },
    },
    limits: {
      max_galleries: 50,
      max_active_galleries: 50,
      max_photos: 25000,
      max_clients: 500,
      max_storage_bytes: 100 * 1024 * 1024 * 1024, // 100 GB
      max_ai_searches: 2500,
      max_ai_indexed_photos: 25000,
      max_team_members: 5,
      max_downloads: 10000,
      max_monthly_bandwidth: 250 * 1024 * 1024 * 1024, // 250 GB
      max_delivery_emails: 1000,
    },
    features: [
      'CLIENT_GALLERY',
      'AI_FACE_SEARCH',
      'ADVANCED_ANALYTICS',
      'CUSTOM_BRANDING',
      'CUSTOM_DOMAIN',
      'CLOUD_STORAGE',
      'MULTI_STORAGE',
      'CLIENT_CRM',
      'GALLERY_DELIVERY',
      'BULK_DOWNLOAD',
      'ORIGINAL_DOWNLOAD',
      'TEAM_MEMBERS',
      'API_ACCESS',
    ],
  },

  [SubscriptionPlan.STUDIO]: {
    id: SubscriptionPlan.STUDIO,
    name: 'Studio Enterprise',
    slug: 'studio',
    description: 'Unlimited creative capacity and team collaboration for multi-photographer agencies.',
    active: true,
    display_order: 4,
    badge: 'Max Power',
    pricing: {
      INR: {
        currency: 'INR',
        monthly_amount: 599900, // ₹5,999 / mo
        yearly_amount: 5999000,  // ₹59,990 / yr
        provider_price_id_monthly: process.env.STRIPE_PRICE_STUDIO_MONTHLY || 'price_studio_monthly_inr',
        provider_price_id_yearly: process.env.STRIPE_PRICE_STUDIO_YEARLY || 'price_studio_yearly_inr',
        display_monthly: '₹5,999',
        display_yearly: '₹59,990',
      },
      USD: {
        currency: 'USD',
        monthly_amount: 8900, // $89 / mo
        yearly_amount: 89000, // $890 / yr
        provider_price_id_monthly: 'price_studio_monthly_usd',
        provider_price_id_yearly: 'price_studio_yearly_usd',
        display_monthly: '$89',
        display_yearly: '$890',
      },
    },
    limits: {
      max_galleries: null, // Unlimited
      max_active_galleries: null,
      max_photos: 100000,
      max_clients: null, // Unlimited
      max_storage_bytes: 500 * 1024 * 1024 * 1024, // 500 GB
      max_ai_searches: 10000,
      max_ai_indexed_photos: 100000,
      max_team_members: 15,
      max_downloads: null, // Unlimited
      max_monthly_bandwidth: 1024 * 1024 * 1024 * 1024, // 1 TB
      max_delivery_emails: 5000,
    },
    features: [
      'CLIENT_GALLERY',
      'AI_FACE_SEARCH',
      'ADVANCED_ANALYTICS',
      'CUSTOM_BRANDING',
      'CUSTOM_DOMAIN',
      'CLOUD_STORAGE',
      'MULTI_STORAGE',
      'CLIENT_CRM',
      'GALLERY_DELIVERY',
      'BULK_DOWNLOAD',
      'ORIGINAL_DOWNLOAD',
      'TEAM_MEMBERS',
      'API_ACCESS',
      'WEBHOOKS',
    ],
  },

  [SubscriptionPlan.ENTERPRISE]: {
    id: SubscriptionPlan.ENTERPRISE,
    name: 'Custom Enterprise',
    slug: 'enterprise',
    description: 'Custom dedicated infrastructure, SLA, and custom AI models for large photo agencies.',
    active: false,
    display_order: 5,
    pricing: {
      INR: {
        currency: 'INR',
        monthly_amount: 1999900,
        yearly_amount: 19999000,
        display_monthly: 'Custom',
        display_yearly: 'Custom',
      },
      USD: {
        currency: 'USD',
        monthly_amount: 29900,
        yearly_amount: 299000,
        display_monthly: 'Custom',
        display_yearly: 'Custom',
      },
    },
    limits: {
      max_galleries: null,
      max_active_galleries: null,
      max_photos: null,
      max_clients: null,
      max_storage_bytes: null,
      max_ai_searches: null,
      max_ai_indexed_photos: null,
      max_team_members: null,
      max_downloads: null,
      max_monthly_bandwidth: null,
      max_delivery_emails: null,
    },
    features: [
      'CLIENT_GALLERY',
      'AI_FACE_SEARCH',
      'ADVANCED_ANALYTICS',
      'CUSTOM_BRANDING',
      'CUSTOM_DOMAIN',
      'CLOUD_STORAGE',
      'MULTI_STORAGE',
      'CLIENT_CRM',
      'GALLERY_DELIVERY',
      'BULK_DOWNLOAD',
      'ORIGINAL_DOWNLOAD',
      'TEAM_MEMBERS',
      'API_ACCESS',
      'WEBHOOKS',
    ],
  },
};

export function getPlanDefinition(plan: SubscriptionPlan): PlanDefinitionDTO {
  return ALL_PLANS[plan] || ALL_PLANS[SubscriptionPlan.FREE];
}

export function getAllActivePlans(): PlanDefinitionDTO[] {
  return Object.values(ALL_PLANS)
    .filter((p) => p.active)
    .sort((a, b) => a.display_order - b.display_order);
}
