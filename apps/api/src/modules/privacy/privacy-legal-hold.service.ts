import { prisma } from '@pixmatch/database';
import { DataLegalHoldDTO, LegalHoldStatus } from '@pixmatch/types';

export interface CreateLegalHoldInput {
  name: string;
  caseNumber: string;
  custodian: string;
  reason: string;
  assetId?: string;
  studioId?: string;
  userId?: string;
  metadata?: Record<string, any>;
}

export interface ReleaseLegalHoldInput {
  releaseReason: string;
  releasedByAdminId?: string;
}

export class PrivacyLegalHoldService {
  private static mockHolds: Map<string, DataLegalHoldDTO> = new Map();

  static clearMockState(): void {
    this.mockHolds.clear();
  }

  /**
   * List all legal holds with optional status filter
   */
  static async listLegalHolds(status?: LegalHoldStatus): Promise<DataLegalHoldDTO[]> {
    try {
      if (process.env.DATABASE_URL && prisma && (prisma as any).dataLegalHold) {
        const where: any = {};
        if (status) where.status = status;

        const holds = await prisma.dataLegalHold.findMany({
          where,
          include: {
            asset: true,
          },
          orderBy: { createdAt: 'desc' },
        });

        return holds.map((h) => ({
          id: h.id,
          name: h.name,
          caseNumber: h.caseNumber,
          custodian: h.custodian,
          reason: h.reason,
          assetId: h.assetId || undefined,
          studioId: h.studioId || undefined,
          userId: h.userId || undefined,
          status: h.status as LegalHoldStatus,
          issuedAt: h.issuedAt,
          releasedAt: h.releasedAt || undefined,
          releaseReason: h.releaseReason || undefined,
          metadata: h.metadata ? (h.metadata as Record<string, any>) : undefined,
          assetName: h.asset?.name,
          createdAt: h.createdAt,
          updatedAt: h.updatedAt,
        }));
      }
    } catch (e) {
      // fallback
    }

    let list = Array.from(this.mockHolds.values());
    if (status) list = list.filter((h) => h.status === status);
    return list;
  }

  /**
   * Get legal hold by ID
   */
  static async getLegalHoldById(id: string): Promise<DataLegalHoldDTO | null> {
    try {
      if (process.env.DATABASE_URL && prisma && (prisma as any).dataLegalHold) {
        const h = await prisma.dataLegalHold.findUnique({
          where: { id },
          include: { asset: true },
        });

        if (h) {
          return {
            id: h.id,
            name: h.name,
            caseNumber: h.caseNumber,
            custodian: h.custodian,
            reason: h.reason,
            assetId: h.assetId || undefined,
            studioId: h.studioId || undefined,
            userId: h.userId || undefined,
            status: h.status as LegalHoldStatus,
            issuedAt: h.issuedAt,
            releasedAt: h.releasedAt || undefined,
            releaseReason: h.releaseReason || undefined,
            metadata: h.metadata ? (h.metadata as Record<string, any>) : undefined,
            assetName: h.asset?.name,
            createdAt: h.createdAt,
            updatedAt: h.updatedAt,
          };
        }
      }
    } catch (e) {
      // fallback
    }

    return this.mockHolds.get(id) || null;
  }

  /**
   * Create legal hold
   */
  static async createLegalHold(input: CreateLegalHoldInput): Promise<DataLegalHoldDTO> {
    const id = `hold-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const newHold: DataLegalHoldDTO = {
      id,
      name: input.name,
      caseNumber: input.caseNumber,
      custodian: input.custodian,
      reason: input.reason,
      assetId: input.assetId,
      studioId: input.studioId,
      userId: input.userId,
      status: LegalHoldStatus.ACTIVE,
      issuedAt: new Date(),
      releasedAt: undefined,
      releaseReason: undefined,
      metadata: input.metadata,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.mockHolds.set(id, newHold);

    try {
      if (process.env.DATABASE_URL && prisma && (prisma as any).dataLegalHold) {
        const hold = await prisma.dataLegalHold.create({
          data: {
            name: input.name,
            caseNumber: input.caseNumber,
            custodian: input.custodian,
            reason: input.reason,
            assetId: input.assetId,
            studioId: input.studioId,
            userId: input.userId,
            status: LegalHoldStatus.ACTIVE,
            metadata: input.metadata,
          },
          include: { asset: true },
        });

        return (await this.getLegalHoldById(hold.id)) || newHold;
      }
    } catch (e) {
      // fallback
    }

    return newHold;
  }

  /**
   * Release legal hold
   */
  static async releaseLegalHold(id: string, input: ReleaseLegalHoldInput): Promise<DataLegalHoldDTO> {
    const existing = this.mockHolds.get(id);
    if (existing) {
      existing.status = LegalHoldStatus.RELEASED;
      existing.releasedAt = new Date();
      existing.releaseReason = input.releaseReason;
      existing.metadata = {
        ...(existing.metadata || {}),
        releasedByAdminId: input.releasedByAdminId,
      };
      existing.updatedAt = new Date();
    }

    try {
      if (process.env.DATABASE_URL && prisma && (prisma as any).dataLegalHold) {
        const hold = await prisma.dataLegalHold.update({
          where: { id },
          data: {
            status: LegalHoldStatus.RELEASED,
            releasedAt: new Date(),
            releaseReason: input.releaseReason,
            metadata: {
              releasedByAdminId: input.releasedByAdminId,
            },
          },
          include: { asset: true },
        });

        return (await this.getLegalHoldById(hold.id)) || existing!;
      }
    } catch (e) {
      // fallback
    }

    return existing!;
  }

  /**
   * Check if any active legal holds protect a given entity (userId, studioId, assetId)
   */
  static async checkActiveHolds(params: {
    userId?: string;
    studioId?: string;
    assetId?: string;
  }): Promise<{ isHeld: boolean; activeHolds: DataLegalHoldDTO[] }> {
    try {
      if (process.env.DATABASE_URL && prisma && (prisma as any).dataLegalHold) {
        const conditions: any[] = [];
        if (params.userId) conditions.push({ userId: params.userId });
        if (params.studioId) conditions.push({ studioId: params.studioId });
        if (params.assetId) conditions.push({ assetId: params.assetId });

        if (conditions.length === 0) {
          return { isHeld: false, activeHolds: [] };
        }

        const holds = await prisma.dataLegalHold.findMany({
          where: {
            status: LegalHoldStatus.ACTIVE,
            OR: conditions,
          },
          include: { asset: true },
        });

        const activeHolds: DataLegalHoldDTO[] = holds.map((h) => ({
          id: h.id,
          name: h.name,
          caseNumber: h.caseNumber,
          custodian: h.custodian,
          reason: h.reason,
          assetId: h.assetId || undefined,
          studioId: h.studioId || undefined,
          userId: h.userId || undefined,
          status: h.status as LegalHoldStatus,
          issuedAt: h.issuedAt,
          metadata: h.metadata ? (h.metadata as Record<string, any>) : undefined,
          assetName: h.asset?.name,
          createdAt: h.createdAt,
          updatedAt: h.updatedAt,
        }));

        return {
          isHeld: activeHolds.length > 0,
          activeHolds,
        };
      }
    } catch (e) {
      // fallback
    }

    const activeHolds = Array.from(this.mockHolds.values()).filter((h) => {
      if (h.status !== LegalHoldStatus.ACTIVE) return false;
      if (params.userId && h.userId === params.userId) return true;
      if (params.studioId && h.studioId === params.studioId) return true;
      if (params.assetId && h.assetId === params.assetId) return true;
      return false;
    });

    return {
      isHeld: activeHolds.length > 0,
      activeHolds,
    };
  }
}
