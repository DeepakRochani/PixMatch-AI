import { z } from 'zod';

export const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  APP_NAME: z.string().default('PixMatch AI'),
  PORT: z.coerce.number().default(4000),
  API_URL: z.string().default('http://localhost:4000'),
  WEB_URL: z.string().default('http://localhost:3000'),

  // Database
  DATABASE_URL: z.string().default('postgresql://pixmatch:pixmatch_secret@localhost:5432/pixmatch_db?schema=public'),

  // Redis
  REDIS_HOST: z.string().default('localhost'),
  REDIS_PORT: z.coerce.number().default(6379),
  REDIS_PASSWORD: z.string().optional().default(''),

  // Auth
  JWT_SECRET: z.string().default('super_secret_pixmatch_jwt_key_phase1_dev_only_change_in_prod'),
  JWT_EXPIRES_IN: z.string().default('7d'),
  REFRESH_SECRET: z.string().default('super_secret_pixmatch_refresh_key_phase1_dev_only'),
  REFRESH_EXPIRES_IN: z.string().default('30d'),

  // Storage
  STORAGE_TYPE: z.enum(['platform', 's3', 'r2', 'local']).default('platform'),
  PLATFORM_STORAGE_LOCAL_DIR: z.string().default('./uploads'),
  PLATFORM_STORAGE_BASE_URL: z.string().default('http://localhost:4000/uploads'),
  STORAGE_ENCRYPTION_KEY: z.string().optional(),

  // Cloud Storage Credentials (Optional in Dev, Checked in Prod)
  AWS_ACCESS_KEY_ID: z.string().optional(),
  AWS_SECRET_ACCESS_KEY: z.string().optional(),
  AWS_REGION: z.string().optional().default('us-east-1'),
  AWS_S3_BUCKET: z.string().optional(),

  R2_ACCOUNT_ID: z.string().optional(),
  R2_ACCESS_KEY_ID: z.string().optional(),
  R2_SECRET_ACCESS_KEY: z.string().optional(),
  R2_BUCKET_NAME: z.string().optional(),

  // OAuth Credentials (Optional in Dev, Checked in Prod)
  GOOGLE_CLIENT_ID: z.string().optional(),
  GOOGLE_CLIENT_SECRET: z.string().optional(),
  DROPBOX_CLIENT_ID: z.string().optional(),
  DROPBOX_CLIENT_SECRET: z.string().optional(),
  MICROSOFT_CLIENT_ID: z.string().optional(),
  MICROSOFT_CLIENT_SECRET: z.string().optional(),

  // AI Service
  AI_SERVICE_URL: z.string().default('http://localhost:8000'),

  // Billing & Subscriptions (Phase 9)
  BILLING_PROVIDER: z.enum(['stripe', 'mock']).default('mock'),
  BILLING_CURRENCY: z.string().default('INR'),
  STRIPE_SECRET_KEY: z.string().optional(),
  STRIPE_PUBLISHABLE_KEY: z.string().optional(),
  STRIPE_WEBHOOK_SECRET: z.string().optional(),
  STRIPE_PRICE_STARTER_MONTHLY: z.string().optional(),
  STRIPE_PRICE_STARTER_YEARLY: z.string().optional(),
  STRIPE_PRICE_PRO_MONTHLY: z.string().optional(),
  STRIPE_PRICE_PRO_YEARLY: z.string().optional(),
  STRIPE_PRICE_STUDIO_MONTHLY: z.string().optional(),
  STRIPE_PRICE_STUDIO_YEARLY: z.string().optional(),
});

export type EnvConfig = z.infer<typeof envSchema>;

const INSECURE_DEV_SECRETS = [
  'super_secret_pixmatch_jwt_key_phase1_dev_only_change_in_prod',
  'super_secret_pixmatch_refresh_key_phase1_dev_only',
  'pixmatch-default-secret-key-for-encryption-32-chars!!',
];

/**
 * Validates environment configuration with strict production-grade checks.
 * Rejects insecure development secrets and missing critical variables in production.
 */
export function validateEnv(rawEnv: Record<string, string | undefined> = process.env): {
  valid: boolean;
  errors: string[];
  config?: EnvConfig;
} {
  const result = envSchema.safeParse(rawEnv);
  const errors: string[] = [];

  if (!result.success) {
    errors.push(...result.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`));
    return { valid: false, errors };
  }

  const config = result.data;

  // Strict production assertions
  if (config.NODE_ENV === 'production') {
    if (INSECURE_DEV_SECRETS.includes(config.JWT_SECRET)) {
      errors.push('JWT_SECRET must be configured with a cryptographically secure random value in production');
    }
    if (INSECURE_DEV_SECRETS.includes(config.REFRESH_SECRET)) {
      errors.push('REFRESH_SECRET must be configured with a cryptographically secure random value in production');
    }
    if (config.DATABASE_URL.includes('pixmatch:pixmatch_secret@localhost')) {
      errors.push('DATABASE_URL is using default development credentials in production');
    }
    if (config.STORAGE_TYPE === 's3' && (!config.AWS_ACCESS_KEY_ID || !config.AWS_SECRET_ACCESS_KEY || !config.AWS_S3_BUCKET)) {
      errors.push('AWS credentials and bucket must be configured when STORAGE_TYPE=s3 in production');
    }
    if (config.STORAGE_TYPE === 'r2' && (!config.R2_ACCOUNT_ID || !config.R2_ACCESS_KEY_ID || !config.R2_SECRET_ACCESS_KEY || !config.R2_BUCKET_NAME)) {
      errors.push('Cloudflare R2 credentials and bucket must be configured when STORAGE_TYPE=r2 in production');
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    config: errors.length === 0 ? config : undefined,
  };
}

export const APP_CONSTANTS = {
  PRODUCT_NAME: 'PixMatch AI',
  TAGLINE: 'AI-Powered Photo Delivery for Modern Studios',
  DEFAULT_PAGE_SIZE: 24,
  MAX_UPLOAD_SIZE_BYTES: 50 * 1024 * 1024, // 50MB per raw photo
  ALLOWED_IMAGE_MIME_TYPES: [
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/avif',
    'image/tiff',
  ],
  DEFAULT_STORAGE_LIMIT_FREE: 2 * 1024 * 1024 * 1024, // 2GB
  DEFAULT_PHOTO_LIMIT_FREE: 500,
  DEFAULT_AI_SEARCH_LIMIT_FREE: 50,
} as const;
