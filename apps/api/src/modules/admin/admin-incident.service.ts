import { prisma } from '@pixmatch/database';
import {
  PlatformIncidentDTO,
  CreateIncidentInput,
  UpdateIncidentInput,
  IncidentSeverity,
  IncidentStatus,
} from '@pixmatch/types';
import { AdminService } from './admin.service.js';

export class AdminIncidentService {
  private static memoryIncidents = new Map<string, PlatformIncidentDTO>();

  /**
   * Lists platform incidents with status and severity filters.
   */
  static async listIncidents(params?: {
    page?: number;
    limit?: number;
    status?: IncidentStatus;
    severity?: IncidentSeverity;
    service?: string;
  }): Promise<{ incidents: PlatformIncidentDTO[]; total: number; page: number; limit: number }> {
    const page = params?.page || 1;
    const limit = params?.limit || 20;
    const skip = (page - 1) * limit;

    try {
      const where: any = {};
      if (params?.status) where.status = params.status;
      if (params?.severity) where.severity = params.severity;
      if (params?.service) where.affected_service = params.service;

      const [total, list] = await Promise.all([
        (prisma as any).platformIncident.count({ where }),
        (prisma as any).platformIncident.findMany({
          where,
          include: { owner_admin: true },
          orderBy: { started_at: 'desc' },
          skip,
          take: limit,
        }),
      ]);

      if (list && list.length > 0) {
        return {
          incidents: list.map(this.mapToDTO),
          total,
          page,
          limit,
        };
      }
    } catch (_err) {
      // In-memory fallback
    }

    let memoryList = Array.from(this.memoryIncidents.values());
    if (params?.status) {
      memoryList = memoryList.filter((i) => i.status === params.status);
    }
    if (params?.severity) {
      memoryList = memoryList.filter((i) => i.severity === params.severity);
    }
    if (params?.service) {
      memoryList = memoryList.filter((i) => i.affected_service === params.service);
    }

    const total = memoryList.length;
    const sliced = memoryList.slice(skip, skip + limit);
    return { incidents: sliced, total, page, limit };
  }

  /**
   * Retrieves a single incident by ID.
   */
  static async getIncident(id: string): Promise<PlatformIncidentDTO | null> {
    try {
      const found = await (prisma as any).platformIncident.findUnique({
        where: { id },
        include: { owner_admin: true },
      });
      if (found) return this.mapToDTO(found);
    } catch (_err) {
      // In-memory fallback
    }

    return this.memoryIncidents.get(id) || null;
  }

  /**
   * Creates a new platform incident.
   */
  static async createIncident(
    input: CreateIncidentInput,
    actorAdminId?: string
  ): Promise<PlatformIncidentDTO> {
    const incDTO: PlatformIncidentDTO = {
      id: 'inc_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
      title: input.title,
      description: input.description,
      severity: input.severity || IncidentSeverity.SEV3,
      status: IncidentStatus.DETECTED,
      affected_service: input.affected_service,
      started_at: new Date(),
      mitigated_at: null,
      resolved_at: null,
      owner_admin_id: input.owner_admin_id || actorAdminId || null,
      resolution: null,
      root_cause: null,
      metadata: input.metadata || null,
      created_at: new Date(),
      updated_at: new Date(),
    };

    try {
      const created = await (prisma as any).platformIncident.create({
        data: {
          id: incDTO.id,
          title: incDTO.title,
          description: incDTO.description,
          severity: incDTO.severity,
          status: incDTO.status,
          affected_service: incDTO.affected_service,
          started_at: incDTO.started_at,
          owner_admin_id: incDTO.owner_admin_id,
          metadata: incDTO.metadata as any,
        },
        include: { owner_admin: true },
      });
      if (created) {
        await AdminService.recordAuditLog({
          actorId: actorAdminId,
          action: 'INCIDENT_CREATED',
          entity: 'INCIDENT',
          entityId: created.id,
          metadata: { title: created.title, severity: created.severity, service: created.affected_service },
        });
        return this.mapToDTO(created);
      }
    } catch (_err) {
      // In-memory fallback
    }

    this.memoryIncidents.set(incDTO.id, incDTO);
    await AdminService.recordAuditLog({
      actorId: actorAdminId,
      action: 'INCIDENT_CREATED',
      entity: 'INCIDENT',
      entityId: incDTO.id,
      metadata: { title: incDTO.title, severity: incDTO.severity, service: incDTO.affected_service },
    });
    return incDTO;
  }

  /**
   * Updates an existing incident (status progression, mitigation, resolution, postmortem).
   */
  static async updateIncident(
    id: string,
    input: UpdateIncidentInput,
    actorAdminId?: string
  ): Promise<PlatformIncidentDTO | null> {
    const isMitigating = input.status === IncidentStatus.MITIGATING;
    const isResolving =
      input.status === IncidentStatus.RESOLVED || input.status === IncidentStatus.CLOSED;

    try {
      const updateData: any = {
        ...input,
        updated_at: new Date(),
      };
      if (isMitigating) {
        updateData.mitigated_at = new Date();
      }
      if (isResolving) {
        updateData.resolved_at = new Date();
      }

      const updated = await (prisma as any).platformIncident.update({
        where: { id },
        data: updateData,
        include: { owner_admin: true },
      });
      if (updated) {
        await AdminService.recordAuditLog({
          actorId: actorAdminId,
          action: 'INCIDENT_UPDATED',
          entity: 'INCIDENT',
          entityId: updated.id,
          metadata: { updates: input },
        });
        return this.mapToDTO(updated);
      }
    } catch (_err) {
      // In-memory fallback
    }

    const existing = this.memoryIncidents.get(id);
    if (!existing) return null;

    const updatedDTO: PlatformIncidentDTO = {
      ...existing,
      ...input,
      mitigated_at: isMitigating ? new Date() : existing.mitigated_at,
      resolved_at: isResolving ? new Date() : existing.resolved_at,
      updated_at: new Date(),
    };
    this.memoryIncidents.set(id, updatedDTO);

    await AdminService.recordAuditLog({
      actorId: actorAdminId,
      action: 'INCIDENT_UPDATED',
      entity: 'INCIDENT',
      entityId: id,
      metadata: { updates: input },
    });
    return updatedDTO;
  }

  private static mapToDTO(raw: any): PlatformIncidentDTO {
    return {
      id: raw.id,
      title: raw.title,
      description: raw.description,
      severity: raw.severity as IncidentSeverity,
      status: raw.status as IncidentStatus,
      affected_service: raw.affected_service,
      started_at: raw.started_at,
      mitigated_at: raw.mitigated_at,
      resolved_at: raw.resolved_at,
      owner_admin_id: raw.owner_admin_id,
      resolution: raw.resolution,
      root_cause: raw.root_cause,
      metadata: raw.metadata,
      created_at: raw.created_at,
      updated_at: raw.updated_at,
      owner_admin_name: raw.owner_admin?.name || null,
    };
  }
}
