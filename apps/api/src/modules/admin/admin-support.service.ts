import { prisma } from '@pixmatch/database';
import {
  PlatformSupportCaseDTO,
  CreateSupportCaseInput,
  UpdateSupportCaseInput,
  SupportCasePriority,
  SupportCaseStatus,
} from '@pixmatch/types';
import { AdminService } from './admin.service.js';

export class AdminSupportService {
  private static memorySupportCases = new Map<string, PlatformSupportCaseDTO>();

  /**
   * Lists support tickets with filtering and pagination.
   */
  static async listSupportCases(params?: {
    page?: number;
    limit?: number;
    status?: SupportCaseStatus;
    priority?: SupportCasePriority;
    studio_id?: string;
    search?: string;
  }): Promise<{ cases: PlatformSupportCaseDTO[]; total: number; page: number; limit: number }> {
    const page = params?.page || 1;
    const limit = params?.limit || 20;
    const skip = (page - 1) * limit;

    try {
      const where: any = {};
      if (params?.status) where.status = params.status;
      if (params?.priority) where.priority = params.priority;
      if (params?.studio_id) where.studio_id = params.studio_id;
      if (params?.search) {
        where.OR = [
          { subject: { contains: params.search, mode: 'insensitive' } },
          { description: { contains: params.search, mode: 'insensitive' } },
        ];
      }

      const [total, cases] = await Promise.all([
        (prisma as any).platformSupportCase.count({ where }),
        (prisma as any).platformSupportCase.findMany({
          where,
          include: { studio: true, user: true, assigned_admin: true },
          orderBy: { created_at: 'desc' },
          skip,
          take: limit,
        }),
      ]);

      if (cases && cases.length > 0) {
        return {
          cases: cases.map(this.mapToDTO),
          total,
          page,
          limit,
        };
      }
    } catch (_err) {
      // In-memory fallback
    }

    let memoryList = Array.from(this.memorySupportCases.values());
    if (params?.status) {
      memoryList = memoryList.filter((c) => c.status === params.status);
    }
    if (params?.priority) {
      memoryList = memoryList.filter((c) => c.priority === params.priority);
    }
    if (params?.studio_id) {
      memoryList = memoryList.filter((c) => c.studio_id === params.studio_id);
    }
    if (params?.search) {
      const s = params.search.toLowerCase();
      memoryList = memoryList.filter(
        (c) => c.subject.toLowerCase().includes(s) || c.description.toLowerCase().includes(s)
      );
    }

    const total = memoryList.length;
    const sliced = memoryList.slice(skip, skip + limit);
    return { cases: sliced, total, page, limit };
  }

  /**
   * Retrieves a single support ticket by ID.
   */
  static async getSupportCase(id: string): Promise<PlatformSupportCaseDTO | null> {
    try {
      const found = await (prisma as any).platformSupportCase.findUnique({
        where: { id },
        include: { studio: true, user: true, assigned_admin: true },
      });
      if (found) return this.mapToDTO(found);
    } catch (_err) {
      // In-memory fallback
    }

    return this.memorySupportCases.get(id) || null;
  }

  /**
   * Creates a new support case.
   */
  static async createSupportCase(
    input: CreateSupportCaseInput,
    actorAdminId?: string
  ): Promise<PlatformSupportCaseDTO> {
    const caseDTO: PlatformSupportCaseDTO = {
      id: 'sup_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
      studio_id: input.studio_id || null,
      user_id: input.user_id || null,
      subject: input.subject,
      description: input.description,
      priority: input.priority || SupportCasePriority.MEDIUM,
      status: SupportCaseStatus.OPEN,
      category: input.category || 'GENERAL',
      assigned_admin_id: input.assigned_admin_id || null,
      resolution_notes: null,
      resolved_at: null,
      created_at: new Date(),
      updated_at: new Date(),
    };

    try {
      const created = await (prisma as any).platformSupportCase.create({
        data: {
          id: caseDTO.id,
          studio_id: caseDTO.studio_id,
          user_id: caseDTO.user_id,
          subject: caseDTO.subject,
          description: caseDTO.description,
          priority: caseDTO.priority,
          status: caseDTO.status,
          category: caseDTO.category,
          assigned_admin_id: caseDTO.assigned_admin_id,
        },
        include: { studio: true, user: true, assigned_admin: true },
      });
      if (created) {
        await AdminService.recordAuditLog({
          actorId: actorAdminId,
          action: 'SUPPORT_CASE_CREATED',
          entity: 'SUPPORT_CASE',
          entityId: created.id,
          studioId: created.studio_id,
          metadata: { subject: created.subject, priority: created.priority },
        });
        return this.mapToDTO(created);
      }
    } catch (_err) {
      // In-memory fallback
    }

    this.memorySupportCases.set(caseDTO.id, caseDTO);
    await AdminService.recordAuditLog({
      actorId: actorAdminId,
      action: 'SUPPORT_CASE_CREATED',
      entity: 'SUPPORT_CASE',
      entityId: caseDTO.id,
      studioId: caseDTO.studio_id,
      metadata: { subject: caseDTO.subject, priority: caseDTO.priority },
    });
    return caseDTO;
  }

  /**
   * Updates an existing support ticket (status transitions, assignments, resolution notes).
   */
  static async updateSupportCase(
    id: string,
    input: UpdateSupportCaseInput,
    actorAdminId?: string
  ): Promise<PlatformSupportCaseDTO | null> {
    const isResolving =
      input.status === SupportCaseStatus.RESOLVED || input.status === SupportCaseStatus.CLOSED;

    try {
      const updateData: any = {
        ...input,
        updated_at: new Date(),
      };
      if (isResolving) {
        updateData.resolved_at = new Date();
      }

      const updated = await (prisma as any).platformSupportCase.update({
        where: { id },
        data: updateData,
        include: { studio: true, user: true, assigned_admin: true },
      });
      if (updated) {
        await AdminService.recordAuditLog({
          actorId: actorAdminId,
          action: 'SUPPORT_CASE_UPDATED',
          entity: 'SUPPORT_CASE',
          entityId: updated.id,
          studioId: updated.studio_id,
          metadata: { updates: input },
        });
        return this.mapToDTO(updated);
      }
    } catch (_err) {
      // In-memory fallback
    }

    const existing = this.memorySupportCases.get(id);
    if (!existing) return null;

    const updatedDTO: PlatformSupportCaseDTO = {
      ...existing,
      ...input,
      resolved_at: isResolving ? new Date() : existing.resolved_at,
      updated_at: new Date(),
    };
    this.memorySupportCases.set(id, updatedDTO);

    await AdminService.recordAuditLog({
      actorId: actorAdminId,
      action: 'SUPPORT_CASE_UPDATED',
      entity: 'SUPPORT_CASE',
      entityId: id,
      studioId: existing.studio_id,
      metadata: { updates: input },
    });
    return updatedDTO;
  }

  private static mapToDTO(raw: any): PlatformSupportCaseDTO {
    return {
      id: raw.id,
      studio_id: raw.studio_id,
      user_id: raw.user_id,
      subject: raw.subject,
      description: raw.description,
      priority: raw.priority as SupportCasePriority,
      status: raw.status as SupportCaseStatus,
      category: raw.category || 'GENERAL',
      assigned_admin_id: raw.assigned_admin_id,
      resolution_notes: raw.resolution_notes,
      resolved_at: raw.resolved_at,
      created_at: raw.created_at,
      updated_at: raw.updated_at,
      studio_name: raw.studio?.name || null,
      user_email: raw.user?.email || null,
      assigned_admin_name: raw.assigned_admin?.name || null,
    };
  }
}
