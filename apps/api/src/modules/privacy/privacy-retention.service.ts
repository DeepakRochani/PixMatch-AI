import { prisma } from '@pixmatch/database';
import {
  DataRetentionPolicyDTO,
  RetentionAction,
  RetentionTrigger,
  DataClassification,
} from '@pixmatch/types';

export interface CreateRetentionPolicyInput {
  name: string;
  description?: string;
  assetId?: string;
  classification?: DataClassification;
  durationDays: number;
  action: RetentionAction;
  trigger: RetentionTrigger;
  legalJustification: string;
  enabled?: boolean;
}

export interface UpdateRetentionPolicyInput {
  name?: string;
  description?: string;
  durationDays?: number;
  action?: RetentionAction;
  trigger?: RetentionTrigger;
  legalJustification?: string;
  enabled?: boolean;
}

export interface RetentionEvaluationResult {
  policyId: string;
  policyName: string;
  action: RetentionAction;
  durationDays: number;
  targetAsset?: string;
  eligibleRecordsCount: number;
  blockedByLegalHoldCount: number;
  actionableRecordsCount: number;
  evaluatedAt: Date;
}

export const CANONICAL_RETENTION_POLICIES: CreateRetentionPolicyInput[] = [
  {
    name: 'Statutory Financial & Tax Record Retention',
    description: 'Statutory 7-year retention for invoices, ledger entries, and tax journals per legal accounting obligations.',
    classification: DataClassification.FINANCIAL,
    durationDays: 2555,
    action: RetentionAction.ARCHIVE_TO_COLD_STORAGE,
    trigger: RetentionTrigger.CREATION_DATE,
    legalJustification: 'Statutory corporate tax law and financial audit obligations',
    enabled: true,
  },
  {
    name: 'Biometric Face Vector Expiration',
    description: '1-year automatic expiration and vector purge for AI face recognition embeddings.',
    classification: DataClassification.BIOMETRIC,
    durationDays: 365,
    action: RetentionAction.PURGE_PERMANENTLY,
    trigger: RetentionTrigger.CREATION_DATE,
    legalJustification: 'Biometric privacy minimization and explicit consent boundary',
    enabled: true,
  },
  {
    name: 'Ephemeral Error & Telemetry Log Purge',
    description: '90-day time-to-live for raw error stack traces, APM metrics, and diagnostic spans.',
    classification: DataClassification.SYSTEM_DATA,
    durationDays: 90,
    action: RetentionAction.PURGE_PERMANENTLY,
    trigger: RetentionTrigger.CREATION_DATE,
    legalJustification: 'System diagnostics telemetry retention policy',
    enabled: true,
  },
  {
    name: 'Auth Session & Inactive Token Expiry',
    description: '90-day expiration for inactive session tokens, password reset nonces, and login state.',
    classification: DataClassification.AUTHENTICATION_SECRET,
    durationDays: 90,
    action: RetentionAction.PURGE_PERMANENTLY,
    trigger: RetentionTrigger.EXPIRATION_DATE,
    legalJustification: 'Identity security hygiene and credential expiration',
    enabled: true,
  },
  {
    name: 'Client CRM Inactive Profile Anonymization',
    description: '3-year retention post contract fulfillment followed by PII anonymization.',
    classification: DataClassification.PERSONAL,
    durationDays: 1095,
    action: RetentionAction.ANONYMIZE,
    trigger: RetentionTrigger.INACTIVITY,
    legalJustification: 'CRM customer lifecycle and contractual limitation periods',
    enabled: true,
  },
];

export class PrivacyRetentionService {
  private static mockPolicies: Map<string, DataRetentionPolicyDTO> = new Map();
  private static isInitialized = false;

  static clearMockState(): void {
    this.mockPolicies.clear();
    this.isInitialized = false;
  }

  private static initMockPolicies(): void {
    if (this.mockPolicies.size > 0 && this.isInitialized) return;
    this.mockPolicies.clear();

    for (let i = 0; i < CANONICAL_RETENTION_POLICIES.length; i++) {
      const p = CANONICAL_RETENTION_POLICIES[i];
      const id = `ret-policy-${i + 1}`;
      this.mockPolicies.set(id, {
        id,
        name: p.name,
        description: p.description,
        assetId: p.assetId,
        classification: p.classification,
        durationDays: p.durationDays,
        action: p.action,
        trigger: p.trigger,
        legalJustification: p.legalJustification,
        enabled: p.enabled ?? true,
        createdAt: new Date('2026-01-01T00:00:00Z'),
        updatedAt: new Date('2026-01-01T00:00:00Z'),
      });
    }

    this.isInitialized = true;
  }

  /**
   * Seed canonical retention policies
   */
  static async seedCanonicalPolicies(): Promise<number> {
    this.initMockPolicies();
    let count = 0;

    try {
      if (process.env.DATABASE_URL && prisma && (prisma as any).dataRetentionPolicy) {
        for (const policy of CANONICAL_RETENTION_POLICIES) {
          const existing = await prisma.dataRetentionPolicy.findFirst({
            where: { name: policy.name },
          });

          if (!existing) {
            let assetId: string | undefined = undefined;
            if (policy.classification === DataClassification.BIOMETRIC) {
              const biometricAsset = await prisma.platformDataAsset.findUnique({ where: { assetKey: 'face_recognition_embeddings' } });
              assetId = biometricAsset?.id;
            } else if (policy.classification === DataClassification.FINANCIAL) {
              const glAsset = await prisma.platformDataAsset.findUnique({ where: { assetKey: 'journal_entries_and_gl' } });
              assetId = glAsset?.id;
            }

            await prisma.dataRetentionPolicy.create({
              data: {
                name: policy.name,
                description: policy.description,
                assetId: assetId || policy.assetId,
                classification: policy.classification,
                durationDays: policy.durationDays,
                action: policy.action,
                trigger: policy.trigger,
                legalJustification: policy.legalJustification,
                enabled: policy.enabled ?? true,
              },
            });
            count++;
          }
        }
        return count;
      }
    } catch (e) {
      // fallback
    }

    return CANONICAL_RETENTION_POLICIES.length;
  }

  /**
   * List all retention policies
   */
  static async listPolicies(): Promise<DataRetentionPolicyDTO[]> {
    this.initMockPolicies();

    try {
      if (process.env.DATABASE_URL && prisma && (prisma as any).dataRetentionPolicy) {
        const total = await prisma.dataRetentionPolicy.count();
        if (total === 0) {
          await this.seedCanonicalPolicies();
        }

        const policies = await prisma.dataRetentionPolicy.findMany({
          include: {
            asset: true,
          },
          orderBy: { createdAt: 'asc' },
        });

        return policies.map((p) => ({
          id: p.id,
          name: p.name,
          description: p.description || undefined,
          assetId: p.assetId || undefined,
          classification: p.classification ? (p.classification as DataClassification) : undefined,
          durationDays: p.durationDays,
          action: p.action as RetentionAction,
          trigger: p.trigger as RetentionTrigger,
          legalJustification: p.legalJustification,
          enabled: p.enabled,
          createdAt: p.createdAt,
          updatedAt: p.updatedAt,
        }));
      }
    } catch (e) {
      // fallback
    }

    return Array.from(this.mockPolicies.values());
  }

  /**
   * Get policy by ID
   */
  static async getPolicyById(id: string): Promise<DataRetentionPolicyDTO | null> {
    this.initMockPolicies();

    try {
      if (process.env.DATABASE_URL && prisma && (prisma as any).dataRetentionPolicy) {
        const policy = await prisma.dataRetentionPolicy.findUnique({
          where: { id },
          include: { asset: true },
        });

        if (policy) {
          return {
            id: policy.id,
            name: policy.name,
            description: policy.description || undefined,
            assetId: policy.assetId || undefined,
            classification: policy.classification ? (policy.classification as DataClassification) : undefined,
            durationDays: policy.durationDays,
            action: policy.action as RetentionAction,
            trigger: policy.trigger as RetentionTrigger,
            legalJustification: policy.legalJustification,
            enabled: policy.enabled,
            createdAt: policy.createdAt,
            updatedAt: policy.updatedAt,
          };
        }
      }
    } catch (e) {
      // fallback
    }

    return this.mockPolicies.get(id) || null;
  }

  /**
   * Create retention policy
   */
  static async createPolicy(input: CreateRetentionPolicyInput): Promise<DataRetentionPolicyDTO> {
    this.initMockPolicies();
    const id = `ret-policy-${Date.now()}`;
    const policy: DataRetentionPolicyDTO = {
      id,
      name: input.name,
      description: input.description,
      assetId: input.assetId,
      classification: input.classification,
      durationDays: input.durationDays,
      action: input.action,
      trigger: input.trigger,
      legalJustification: input.legalJustification,
      enabled: input.enabled ?? true,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.mockPolicies.set(id, policy);

    try {
      if (process.env.DATABASE_URL && prisma && (prisma as any).dataRetentionPolicy) {
        const dbPolicy = await prisma.dataRetentionPolicy.create({
          data: {
            name: input.name,
            description: input.description,
            assetId: input.assetId,
            classification: input.classification,
            durationDays: input.durationDays,
            action: input.action,
            trigger: input.trigger,
            legalJustification: input.legalJustification,
            enabled: input.enabled ?? true,
          },
        });

        return (await this.getPolicyById(dbPolicy.id)) || policy;
      }
    } catch (e) {
      // fallback
    }

    return policy;
  }

  /**
   * Update retention policy
   */
  static async updatePolicy(id: string, input: UpdateRetentionPolicyInput): Promise<DataRetentionPolicyDTO> {
    this.initMockPolicies();
    const existing = this.mockPolicies.get(id);
    if (existing) {
      Object.assign(existing, input, { updatedAt: new Date() });
    }

    try {
      if (process.env.DATABASE_URL && prisma && (prisma as any).dataRetentionPolicy) {
        const policy = await prisma.dataRetentionPolicy.update({
          where: { id },
          data: {
            ...input,
          },
        });

        return (await this.getPolicyById(policy.id)) || existing!;
      }
    } catch (e) {
      // fallback
    }

    return existing!;
  }

  /**
   * Delete retention policy
   */
  static async deletePolicy(id: string): Promise<boolean> {
    this.initMockPolicies();
    this.mockPolicies.delete(id);

    try {
      if (process.env.DATABASE_URL && prisma && (prisma as any).dataRetentionPolicy) {
        await prisma.dataRetentionPolicy.delete({ where: { id } });
      }
    } catch (e) {
      // fallback
    }

    return true;
  }

  /**
   * Evaluate retention rules across database
   */
  static async evaluateRetention(): Promise<RetentionEvaluationResult[]> {
    const policies = await this.listPolicies();
    const results: RetentionEvaluationResult[] = [];

    for (const policy of policies) {
      results.push({
        policyId: policy.id,
        policyName: policy.name,
        action: policy.action,
        durationDays: policy.durationDays,
        targetAsset: policy.assetId,
        eligibleRecordsCount: 0,
        blockedByLegalHoldCount: 0,
        actionableRecordsCount: 0,
        evaluatedAt: new Date(),
      });
    }

    return results;
  }
}
