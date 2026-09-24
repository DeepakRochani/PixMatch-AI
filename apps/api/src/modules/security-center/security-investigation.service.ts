import {
  PlatformSecurityInvestigationDTO,
  SecurityInvestigationStatus,
  SecurityEventStatus,
  SecurityInvestigationCreateDTO,
  SecurityInvestigationNoteDTO,
} from '@pixmatch/types';
import { prisma } from '@pixmatch/database';
import { AdminAuditService } from '../admin-auth/admin-audit.service.js';

export class SecurityInvestigationService {
  private static mockInvestigations: Map<string, PlatformSecurityInvestigationDTO> = new Map();

  static async startInvestigation(
    input: SecurityInvestigationCreateDTO,
    openedByAdminId: string,
    openedByAdminName?: string
  ): Promise<PlatformSecurityInvestigationDTO> {
    const id = `inv-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const now = new Date();

    const initialNotes: SecurityInvestigationNoteDTO[] = [];
    if (input.initial_note) {
      initialNotes.push({
        id: `note-${Date.now()}-1`,
        admin_id: openedByAdminId,
        admin_name: openedByAdminName || 'Security Admin',
        note: input.initial_note,
        created_at: now,
      });
    }

    const investigationDTO: PlatformSecurityInvestigationDTO = {
      id,
      security_event_id: input.security_event_id,
      status: SecurityInvestigationStatus.INVESTIGATING,
      assigned_admin_id: input.assigned_admin_id || openedByAdminId,
      assigned_admin_name: openedByAdminName || 'Security Admin',
      opened_at: now,
      closed_at: null,
      resolution: null,
      notes: initialNotes,
      created_at: now,
      updated_at: now,
    };

    this.mockInvestigations.set(id, investigationDTO);

    if (process.env.DATABASE_URL && prisma && (prisma as any).platformSecurityInvestigation) {
      try {
        const record = await (prisma as any).platformSecurityInvestigation.create({
          data: {
            id,
            security_event_id: input.security_event_id,
            status: SecurityInvestigationStatus.INVESTIGATING,
            assigned_admin_id: input.assigned_admin_id || openedByAdminId,
            opened_at: now,
            notes: initialNotes as any,
          },
        });
        if (record) {
          investigationDTO.id = record.id;
        }
      } catch (e) {
        // fallback
      }
    }

    // Audit log
    await AdminAuditService.logAction({
      admin_user_id: openedByAdminId,
      action: 'SECURITY_INVESTIGATION_STARTED',
      resource_type: 'SECURITY_INVESTIGATION',
      resource_id: id,
      details: `Started security investigation for event ${input.security_event_id}`,
      metadata: { security_event_id: input.security_event_id },
    });

    return investigationDTO;
  }

  static async getInvestigation(id: string): Promise<PlatformSecurityInvestigationDTO | null> {
    if (process.env.DATABASE_URL && prisma && (prisma as any).platformSecurityInvestigation) {
      try {
        const record = await (prisma as any).platformSecurityInvestigation.findUnique({
          where: { id },
          include: { security_event: true },
        });
        if (record) {
          return this.mapToDTO(record);
        }
      } catch (e) {
        // fallback
      }
    }

    return this.mockInvestigations.get(id) || null;
  }

  static async getInvestigationByEventId(eventId: string): Promise<PlatformSecurityInvestigationDTO | null> {
    if (process.env.DATABASE_URL && prisma && (prisma as any).platformSecurityInvestigation) {
      try {
        const record = await (prisma as any).platformSecurityInvestigation.findFirst({
          where: { security_event_id: eventId },
          orderBy: { created_at: 'desc' },
        });
        if (record) {
          return this.mapToDTO(record);
        }
      } catch (e) {
        // fallback
      }
    }

    for (const inv of this.mockInvestigations.values()) {
      if (inv.security_event_id === eventId) {
        return inv;
      }
    }
    return null;
  }

  static async listInvestigations(filter: {
    status?: SecurityInvestigationStatus | string;
    assigned_admin_id?: string;
    page?: number;
    limit?: number;
  } = {}): Promise<{ investigations: PlatformSecurityInvestigationDTO[]; total: number }> {
    const page = filter.page || 1;
    const limit = filter.limit || 20;

    if (process.env.DATABASE_URL && prisma && (prisma as any).platformSecurityInvestigation) {
      try {
        const where: any = {};
        if (filter.status) where.status = filter.status;
        if (filter.assigned_admin_id) where.assigned_admin_id = filter.assigned_admin_id;

        const [records, total] = await Promise.all([
          (prisma as any).platformSecurityInvestigation.findMany({
            where,
            orderBy: { created_at: 'desc' },
            skip: (page - 1) * limit,
            take: limit,
          }),
          (prisma as any).platformSecurityInvestigation.count({ where }),
        ]);

        return {
          investigations: records.map((r: any) => this.mapToDTO(r)),
          total,
        };
      } catch (e) {
        // fallback
      }
    }

    let items = Array.from(this.mockInvestigations.values());
    if (filter.status) {
      items = items.filter((inv) => inv.status === filter.status);
    }
    if (filter.assigned_admin_id) {
      items = items.filter((inv) => inv.assigned_admin_id === filter.assigned_admin_id);
    }

    const total = items.length;
    const start = (page - 1) * limit;
    const paginated = items.slice(start, start + limit);

    return {
      investigations: paginated,
      total,
    };
  }

  static async addNote(
    investigationId: string,
    adminId: string,
    noteText: string,
    adminName?: string
  ): Promise<PlatformSecurityInvestigationDTO> {
    const investigation = await this.getInvestigation(investigationId);
    if (!investigation) {
      throw new Error(`Investigation ${investigationId} not found`);
    }

    const newNote: SecurityInvestigationNoteDTO = {
      id: `note-${Date.now()}-${Math.random().toString(36).substring(2, 5)}`,
      admin_id: adminId,
      admin_name: adminName || 'Security Admin',
      note: noteText,
      created_at: new Date(),
    };

    investigation.notes.push(newNote);
    investigation.updated_at = new Date();
    this.mockInvestigations.set(investigationId, investigation);

    if (process.env.DATABASE_URL && prisma && (prisma as any).platformSecurityInvestigation) {
      try {
        const record = await (prisma as any).platformSecurityInvestigation.update({
          where: { id: investigationId },
          data: {
            notes: investigation.notes as any,
            updated_at: new Date(),
          },
        });
        return this.mapToDTO(record);
      } catch (e) {
        // fallback
      }
    }

    await AdminAuditService.logAction({
      admin_user_id: adminId,
      action: 'SECURITY_INVESTIGATION_NOTE_ADDED',
      resource_type: 'SECURITY_INVESTIGATION',
      resource_id: investigationId,
      details: `Added note to investigation ${investigationId}`,
      metadata: { note_id: newNote.id },
    });

    return investigation;
  }

  static async updateStatus(
    investigationId: string,
    status: SecurityInvestigationStatus,
    adminId: string,
    resolution?: string
  ): Promise<PlatformSecurityInvestigationDTO> {
    const investigation = await this.getInvestigation(investigationId);
    if (!investigation) {
      throw new Error(`Investigation ${investigationId} not found`);
    }

    const now = new Date();
    investigation.status = status;
    investigation.updated_at = now;
    if (status === SecurityInvestigationStatus.RESOLVED || status === SecurityInvestigationStatus.FALSE_POSITIVE) {
      investigation.closed_at = now;
      if (resolution) investigation.resolution = resolution;
    }

    this.mockInvestigations.set(investigationId, investigation);

    if (process.env.DATABASE_URL && prisma && (prisma as any).platformSecurityInvestigation) {
      try {
        const record = await (prisma as any).platformSecurityInvestigation.update({
          where: { id: investigationId },
          data: {
            status,
            resolution: investigation.resolution,
            closed_at: investigation.closed_at,
            updated_at: now,
          },
        });
        return this.mapToDTO(record);
      } catch (e) {
        // fallback
      }
    }

    await AdminAuditService.logAction({
      admin_user_id: adminId,
      action: 'SECURITY_INVESTIGATION_STATUS_CHANGED',
      resource_type: 'SECURITY_INVESTIGATION',
      resource_id: investigationId,
      details: `Changed investigation ${investigationId} status to ${status}`,
      metadata: { new_status: status, resolution },
    });

    return investigation;
  }

  static async assignAdmin(
    investigationId: string,
    targetAdminId: string,
    actingAdminId: string,
    targetAdminName?: string
  ): Promise<PlatformSecurityInvestigationDTO> {
    const investigation = await this.getInvestigation(investigationId);
    if (!investigation) {
      throw new Error(`Investigation ${investigationId} not found`);
    }

    investigation.assigned_admin_id = targetAdminId;
    if (targetAdminName) investigation.assigned_admin_name = targetAdminName;
    investigation.updated_at = new Date();
    this.mockInvestigations.set(investigationId, investigation);

    if (process.env.DATABASE_URL && prisma && (prisma as any).platformSecurityInvestigation) {
      try {
        const record = await (prisma as any).platformSecurityInvestigation.update({
          where: { id: investigationId },
          data: {
            assigned_admin_id: targetAdminId,
            updated_at: new Date(),
          },
        });
        return this.mapToDTO(record);
      } catch (e) {
        // fallback
      }
    }

    await AdminAuditService.logAction({
      admin_user_id: actingAdminId,
      action: 'SECURITY_INVESTIGATION_ASSIGNED',
      resource_type: 'SECURITY_INVESTIGATION',
      resource_id: investigationId,
      details: `Assigned investigation ${investigationId} to admin ${targetAdminId}`,
      metadata: { assigned_admin_id: targetAdminId },
    });

    return investigation;
  }

  static clearMockState(): void {
    this.mockInvestigations.clear();
  }

  private static mapToDTO(record: any): PlatformSecurityInvestigationDTO {
    return {
      id: record.id,
      security_event_id: record.security_event_id,
      status: record.status as SecurityInvestigationStatus,
      assigned_admin_id: record.assigned_admin_id,
      opened_at: record.opened_at,
      closed_at: record.closed_at,
      resolution: record.resolution,
      notes: Array.isArray(record.notes) ? record.notes : [],
      created_at: record.created_at,
      updated_at: record.updated_at,
      security_event: record.security_event ? record.security_event : undefined,
    };
  }
}
