import { prisma } from '@pixmatch/database';
import {
  PlatformAlertDTO,
  CreateAlertInput,
  PlatformAlertType,
  PlatformAlertSeverity,
  PlatformAlertStatus,
} from '@pixmatch/types';
import { AdminService } from './admin.service.js';

export class AdminAlertService {
  private static memoryAlerts = new Map<string, PlatformAlertDTO>();

  /**
   * Lists platform alerts with filtering.
   */
  static async listAlerts(params?: {
    status?: PlatformAlertStatus;
    severity?: PlatformAlertSeverity;
    type?: PlatformAlertType;
    studio_id?: string;
    limit?: number;
  }): Promise<PlatformAlertDTO[]> {
    const limit = params?.limit || 50;

    try {
      const where: any = {};
      if (params?.status) where.status = params.status;
      if (params?.severity) where.severity = params.severity;
      if (params?.type) where.type = params.type;
      if (params?.studio_id) where.studio_id = params.studio_id;

      const list = await (prisma as any).platformAlert.findMany({
        where,
        orderBy: { created_at: 'desc' },
        take: limit,
      });

      if (list && list.length > 0) {
        return list.map(this.mapToDTO);
      }
    } catch (_err) {
      // In-memory fallback
    }

    let memoryList = Array.from(this.memoryAlerts.values());
    if (params?.status) {
      memoryList = memoryList.filter((a) => a.status === params.status);
    }
    if (params?.severity) {
      memoryList = memoryList.filter((a) => a.severity === params.severity);
    }
    if (params?.type) {
      memoryList = memoryList.filter((a) => a.type === params.type);
    }
    if (params?.studio_id) {
      memoryList = memoryList.filter((a) => a.studio_id === params.studio_id);
    }
    return memoryList.slice(0, limit);
  }

  /**
   * Creates a platform alert.
   */
  static async createAlert(
    input: CreateAlertInput,
    actorAdminId?: string
  ): Promise<PlatformAlertDTO> {
    const alertDTO: PlatformAlertDTO = {
      id: 'alt_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
      type: input.type,
      title: input.title,
      message: input.message,
      severity: input.severity || PlatformAlertSeverity.INFO,
      status: PlatformAlertStatus.OPEN,
      source: input.source || 'SYSTEM',
      studio_id: input.studio_id || null,
      metadata: input.metadata || null,
      acknowledged_at: null,
      acknowledged_by: null,
      resolved_at: null,
      resolved_by: null,
      created_at: new Date(),
      updated_at: new Date(),
    };

    try {
      const created = await (prisma as any).platformAlert.create({
        data: {
          id: alertDTO.id,
          type: alertDTO.type,
          title: alertDTO.title,
          message: alertDTO.message,
          severity: alertDTO.severity,
          status: alertDTO.status,
          source: alertDTO.source,
          studio_id: alertDTO.studio_id,
          metadata: alertDTO.metadata as any,
        },
      });
      if (created) {
        await AdminService.recordAuditLog({
          actorId: actorAdminId,
          action: 'PLATFORM_ALERT_CREATED',
          entity: 'ALERT',
          entityId: created.id,
          studioId: created.studio_id,
          metadata: { type: created.type, severity: created.severity, title: created.title },
        });
        return this.mapToDTO(created);
      }
    } catch (_err) {
      // In-memory fallback
    }

    this.memoryAlerts.set(alertDTO.id, alertDTO);
    await AdminService.recordAuditLog({
      actorId: actorAdminId,
      action: 'PLATFORM_ALERT_CREATED',
      entity: 'ALERT',
      entityId: alertDTO.id,
      studioId: alertDTO.studio_id,
      metadata: { type: alertDTO.type, severity: alertDTO.severity, title: alertDTO.title },
    });
    return alertDTO;
  }

  /**
   * Acknowledges an open alert.
   */
  static async acknowledgeAlert(id: string, actorAdminId: string): Promise<PlatformAlertDTO | null> {
    try {
      const updated = await (prisma as any).platformAlert.update({
        where: { id },
        data: {
          status: PlatformAlertStatus.ACKNOWLEDGED,
          acknowledged_at: new Date(),
          acknowledged_by: actorAdminId,
          updated_at: new Date(),
        },
      });
      if (updated) {
        await AdminService.recordAuditLog({
          actorId: actorAdminId,
          action: 'ALERT_ACKNOWLEDGED',
          entity: 'ALERT',
          entityId: id,
        });
        return this.mapToDTO(updated);
      }
    } catch (_err) {
      // In-memory fallback
    }

    const existing = this.memoryAlerts.get(id);
    if (!existing) return null;

    const updatedDTO: PlatformAlertDTO = {
      ...existing,
      status: PlatformAlertStatus.ACKNOWLEDGED,
      acknowledged_at: new Date(),
      acknowledged_by: actorAdminId,
      updated_at: new Date(),
    };
    this.memoryAlerts.set(id, updatedDTO);
    await AdminService.recordAuditLog({
      actorId: actorAdminId,
      action: 'ALERT_ACKNOWLEDGED',
      entity: 'ALERT',
      entityId: id,
    });
    return updatedDTO;
  }

  /**
   * Resolves an alert.
   */
  static async resolveAlert(id: string, actorAdminId: string): Promise<PlatformAlertDTO | null> {
    try {
      const updated = await (prisma as any).platformAlert.update({
        where: { id },
        data: {
          status: PlatformAlertStatus.RESOLVED,
          resolved_at: new Date(),
          resolved_by: actorAdminId,
          updated_at: new Date(),
        },
      });
      if (updated) {
        await AdminService.recordAuditLog({
          actorId: actorAdminId,
          action: 'ALERT_RESOLVED',
          entity: 'ALERT',
          entityId: id,
        });
        return this.mapToDTO(updated);
      }
    } catch (_err) {
      // In-memory fallback
    }

    const existing = this.memoryAlerts.get(id);
    if (!existing) return null;

    const updatedDTO: PlatformAlertDTO = {
      ...existing,
      status: PlatformAlertStatus.RESOLVED,
      resolved_at: new Date(),
      resolved_by: actorAdminId,
      updated_at: new Date(),
    };
    this.memoryAlerts.set(id, updatedDTO);
    await AdminService.recordAuditLog({
      actorId: actorAdminId,
      action: 'ALERT_RESOLVED',
      entity: 'ALERT',
      entityId: id,
    });
    return updatedDTO;
  }

  private static mapToDTO(raw: any): PlatformAlertDTO {
    return {
      id: raw.id,
      type: raw.type as PlatformAlertType,
      title: raw.title,
      message: raw.message,
      severity: raw.severity as PlatformAlertSeverity,
      status: raw.status as PlatformAlertStatus,
      source: raw.source || 'SYSTEM',
      studio_id: raw.studio_id,
      metadata: raw.metadata,
      acknowledged_at: raw.acknowledged_at,
      acknowledged_by: raw.acknowledged_by,
      resolved_at: raw.resolved_at,
      resolved_by: raw.resolved_by,
      created_at: raw.created_at,
      updated_at: raw.updated_at,
    };
  }
}
