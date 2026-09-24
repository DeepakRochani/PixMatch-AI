import { prisma } from '@pixmatch/database';
import {
  PlatformPrivacyRequestDTO,
  PrivacyRequestType,
  PrivacyRequestStatus,
  PrivacyRequestActor,
  PrivacyRequestFilterDTO,
} from '@pixmatch/types';
import crypto from 'crypto';

export interface SubmitPrivacyRequestInput {
  requestType: PrivacyRequestType;
  actorType: PrivacyRequestActor;
  subjectEmail: string;
  subjectName?: string;
  userId?: string;
  studioId?: string;
  details?: string;
  ipAddress?: string;
  userAgent?: string;
  metadata?: Record<string, any>;
}

export interface UpdatePrivacyRequestStatusInput {
  status: PrivacyRequestStatus;
  rejectionReason?: string;
  assignedAdminId?: string;
  metadata?: Record<string, any>;
}

export class PrivacyRequestsService {
  private static mockRequests: Map<string, PlatformPrivacyRequestDTO> = new Map();

  static clearMockState(): void {
    this.mockRequests.clear();
  }

  /**
   * Submit a new Privacy Request
   */
  static async submitRequest(input: SubmitPrivacyRequestInput): Promise<PlatformPrivacyRequestDTO> {
    const id = `priv-req-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const token = crypto.randomBytes(24).toString('hex');
    const deadline = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 calendar days
    const isVerified = Boolean(input.userId);

    const newReq: PlatformPrivacyRequestDTO = {
      id,
      requestType: input.requestType,
      actorType: input.actorType,
      status: isVerified ? PrivacyRequestStatus.IN_REVIEW : PrivacyRequestStatus.PENDING_VERIFICATION,
      subjectEmail: input.subjectEmail.toLowerCase().trim(),
      subjectName: input.subjectName,
      userId: input.userId,
      studioId: input.studioId,
      details: input.details,
      identityVerified: isVerified,
      verifiedAt: isVerified ? new Date() : undefined,
      deadline,
      completedAt: undefined,
      rejectionReason: undefined,
      assignedAdminId: undefined,
      metadata: {
        ...input.metadata,
        ipAddress: input.ipAddress,
        userAgent: input.userAgent,
        verificationToken: token,
      },
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.mockRequests.set(id, newReq);

    try {
      if (process.env.DATABASE_URL && prisma && (prisma as any).platformPrivacyRequest) {
        const created = await prisma.platformPrivacyRequest.create({
          data: {
            requestType: input.requestType,
            actorType: input.actorType,
            subjectEmail: input.subjectEmail.toLowerCase().trim(),
            subjectName: input.subjectName,
            userId: input.userId,
            studioId: input.studioId,
            details: input.details,
            verificationToken: token,
            status: isVerified ? PrivacyRequestStatus.IN_REVIEW : PrivacyRequestStatus.PENDING_VERIFICATION,
            identityVerified: isVerified,
            verifiedAt: isVerified ? new Date() : undefined,
            deadline,
            metadata: {
              ...input.metadata,
              ipAddress: input.ipAddress,
              userAgent: input.userAgent,
            },
          },
        });

        return this.mapToDTO(created);
      }
    } catch (e) {
      // fallback
    }

    return newReq;
  }

  /**
   * Verify Request Identity via Token
   */
  static async verifyIdentity(requestId: string, token: string): Promise<PlatformPrivacyRequestDTO> {
    try {
      if (process.env.DATABASE_URL && prisma && (prisma as any).platformPrivacyRequest) {
        const req = await prisma.platformPrivacyRequest.findUnique({
          where: { id: requestId },
        }).catch(() => null);

        if (req) {
          if (req.identityVerified) {
            return this.mapToDTO(req);
          }

          if (req.verificationToken !== token) {
            throw new Error('Invalid or expired verification token');
          }

          const updated = await prisma.platformPrivacyRequest.update({
            where: { id: requestId },
            data: {
              identityVerified: true,
              verifiedAt: new Date(),
              status: req.status === PrivacyRequestStatus.IDENTITY_REVIEW || req.status === PrivacyRequestStatus.PENDING_VERIFICATION
                ? PrivacyRequestStatus.IN_REVIEW
                : req.status,
            },
          });

          return this.mapToDTO(updated);
        }
      }
    } catch (e: any) {
      if (e.message?.includes('Invalid or expired verification token')) {
        throw e;
      }
    }

    const found = this.mockRequests.get(requestId);
    if (!found) {
      throw new Error('Privacy request not found');
    }

    if (found.identityVerified) {
      return found;
    }

    const storedToken = found.metadata?.verificationToken;
    if (storedToken && storedToken !== token) {
      throw new Error('Invalid or expired verification token');
    }

    found.identityVerified = true;
    found.verifiedAt = new Date();
    if (found.status === PrivacyRequestStatus.IDENTITY_REVIEW || found.status === PrivacyRequestStatus.PENDING_VERIFICATION) {
      found.status = PrivacyRequestStatus.IN_REVIEW;
    }
    found.updatedAt = new Date();

    return found;
  }

  /**
   * List & Filter Privacy Requests
   */
  static async listRequests(filter?: PrivacyRequestFilterDTO): Promise<{
    requests: PlatformPrivacyRequestDTO[];
    total: number;
  }> {
    try {
      if (process.env.DATABASE_URL && prisma && (prisma as any).platformPrivacyRequest) {
        const where: any = {};
        if (filter?.status) where.status = filter.status;
        if (filter?.requestType) where.requestType = filter.requestType;
        if (filter?.actorType) where.actorType = filter.actorType;
        if (filter?.studioId) where.studioId = filter.studioId;
        if (filter?.userId) where.userId = filter.userId;
        if (filter?.search) {
          where.OR = [
            { subjectEmail: { contains: filter.search, mode: 'insensitive' } },
            { subjectName: { contains: filter.search, mode: 'insensitive' } },
            { details: { contains: filter.search, mode: 'insensitive' } },
          ];
        }

        const [rawList, total] = await Promise.all([
          prisma.platformPrivacyRequest.findMany({
            where,
            orderBy: [{ deadline: 'asc' }, { createdAt: 'desc' }],
            take: 100,
          }),
          prisma.platformPrivacyRequest.count({ where }),
        ]);

        return {
          requests: rawList.map((r) => this.mapToDTO(r)),
          total,
        };
      }
    } catch (e) {
      // fallback
    }

    let list = Array.from(this.mockRequests.values());
    if (filter?.status) list = list.filter((r) => r.status === filter.status);
    if (filter?.requestType) list = list.filter((r) => r.requestType === filter.requestType);
    if (filter?.actorType) list = list.filter((r) => r.actorType === filter.actorType);
    if (filter?.studioId) list = list.filter((r) => r.studioId === filter.studioId);
    if (filter?.userId) list = list.filter((r) => r.userId === filter.userId);
    if (filter?.search) {
      const q = filter.search.toLowerCase();
      list = list.filter(
        (r) =>
          r.subjectEmail.toLowerCase().includes(q) ||
          (r.subjectName && r.subjectName.toLowerCase().includes(q)) ||
          (r.details && r.details.toLowerCase().includes(q))
      );
    }

    return {
      requests: list,
      total: list.length,
    };
  }

  /**
   * Get Single Privacy Request
   */
  static async getRequestById(id: string): Promise<PlatformPrivacyRequestDTO | null> {
    try {
      if (process.env.DATABASE_URL && prisma && (prisma as any).platformPrivacyRequest) {
        const req = await prisma.platformPrivacyRequest.findUnique({
          where: { id },
          include: {
            exportRecords: true,
            deletionExecutions: true,
          },
        });

        if (req) return this.mapToDTO(req);
      }
    } catch (e) {
      // fallback
    }

    return this.mockRequests.get(id) || null;
  }

  /**
   * Update Request Status
   */
  static async updateStatus(
    id: string,
    input: UpdatePrivacyRequestStatusInput
  ): Promise<PlatformPrivacyRequestDTO> {
    const isCompleted = input.status === PrivacyRequestStatus.COMPLETED;
    const isRejected = input.status === PrivacyRequestStatus.REJECTED;

    const existing = this.mockRequests.get(id);
    if (existing) {
      existing.status = input.status;
      if (isRejected) existing.rejectionReason = input.rejectionReason;
      if (input.assignedAdminId) existing.assignedAdminId = input.assignedAdminId;
      if (isCompleted || isRejected) existing.completedAt = new Date();
      if (input.metadata) existing.metadata = { ...(existing.metadata || {}), ...input.metadata };
      existing.updatedAt = new Date();
    }

    try {
      if (process.env.DATABASE_URL && prisma && (prisma as any).platformPrivacyRequest) {
        const updated = await prisma.platformPrivacyRequest.update({
          where: { id },
          data: {
            status: input.status,
            rejectionReason: isRejected ? input.rejectionReason : undefined,
            assignedAdminId: input.assignedAdminId,
            completedAt: isCompleted || isRejected ? new Date() : undefined,
            metadata: input.metadata,
          },
        });

        return this.mapToDTO(updated);
      }
    } catch (e) {
      // fallback
    }

    return existing!;
  }

  private static mapToDTO(r: any): PlatformPrivacyRequestDTO {
    return {
      id: r.id,
      requestType: r.requestType as PrivacyRequestType,
      actorType: r.actorType as PrivacyRequestActor,
      status: r.status as PrivacyRequestStatus,
      subjectEmail: r.subjectEmail,
      subjectName: r.subjectName || undefined,
      userId: r.userId || undefined,
      studioId: r.studioId || undefined,
      details: r.details || undefined,
      identityVerified: r.identityVerified,
      verifiedAt: r.verifiedAt || undefined,
      deadline: r.deadline,
      completedAt: r.completedAt || undefined,
      rejectionReason: r.rejectionReason || undefined,
      assignedAdminId: r.assignedAdminId || undefined,
      metadata: r.metadata ? (r.metadata as Record<string, any>) : undefined,
      createdAt: r.createdAt,
      updatedAt: r.updatedAt,
    };
  }
}
