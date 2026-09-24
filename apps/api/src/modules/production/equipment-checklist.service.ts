import { prisma } from '@pixmatch/database';
import {
  CreateEquipmentChecklistDTO,
  ProjectEquipmentChecklistDTO,
  ChecklistItemStatus,
} from '@pixmatch/types';

export class EquipmentChecklistService {
  /**
   * Assign equipment item to a production
   */
  static async assignEquipment(
    studioId: string,
    projectId: string,
    dto: CreateEquipmentChecklistDTO
  ): Promise<ProjectEquipmentChecklistDTO> {
    const item = await prisma.projectEquipmentChecklist.create({
      data: {
        studio_id: studioId,
        project_id: projectId,
        shoot_session_id: dto.shoot_session_id || null,
        name: dto.name,
        description: dto.description || null,
        status: ChecklistItemStatus.PENDING,
        required: dto.required !== undefined ? Boolean(dto.required) : true,
        assigned_resource_id: dto.assigned_resource_id || null,
      },
      include: {
        assigned_resource: true,
      },
    });

    return item as unknown as ProjectEquipmentChecklistDTO;
  }

  /**
   * Update equipment checklist item
   */
  static async updateEquipment(
    studioId: string,
    itemId: string,
    dto: Partial<CreateEquipmentChecklistDTO> & {
      status?: ChecklistItemStatus;
      checked_by?: string;
    }
  ): Promise<ProjectEquipmentChecklistDTO> {
    const item = await prisma.projectEquipmentChecklist.findFirst({
      where: { id: itemId, studio_id: studioId },
    });

    if (!item) {
      throw new Error(`Equipment checklist item not found: ${itemId}`);
    }

    const newStatus = dto.status || item.status;
    const checkedAt =
      newStatus === ChecklistItemStatus.COMPLETED && item.status !== ChecklistItemStatus.COMPLETED
        ? new Date()
        : newStatus !== ChecklistItemStatus.COMPLETED
        ? null
        : item.checked_at;

    const updated = await prisma.projectEquipmentChecklist.update({
      where: { id: itemId },
      data: {
        name: dto.name !== undefined ? dto.name : item.name,
        description: dto.description !== undefined ? dto.description : item.description,
        status: newStatus,
        required: dto.required !== undefined ? dto.required : item.required,
        assigned_resource_id: dto.assigned_resource_id !== undefined ? dto.assigned_resource_id : item.assigned_resource_id,
        checked_by: dto.checked_by !== undefined ? dto.checked_by : item.checked_by,
        checked_at: checkedAt,
        updated_at: new Date(),
      },
      include: {
        assigned_resource: true,
      },
    });

    return updated as unknown as ProjectEquipmentChecklistDTO;
  }

  /**
   * Get all equipment checklist items for a project
   */
  static async getEquipmentList(
    studioId: string,
    projectId: string
  ): Promise<ProjectEquipmentChecklistDTO[]> {
    const items = await prisma.projectEquipmentChecklist.findMany({
      where: { project_id: projectId, studio_id: studioId },
      include: {
        assigned_resource: true,
      },
      orderBy: [{ name: 'asc' }],
    });

    return items as unknown as ProjectEquipmentChecklistDTO[];
  }

  /**
   * Batch toggle equipment status (e.g. from mobile shoot day workspace)
   */
  static async batchUpdateEquipmentStatus(
    studioId: string,
    projectId: string,
    itemIds: string[],
    status: ChecklistItemStatus = ChecklistItemStatus.COMPLETED,
    checkedBy?: string
  ): Promise<ProjectEquipmentChecklistDTO[]> {
    await prisma.projectEquipmentChecklist.updateMany({
      where: {
        id: { in: itemIds },
        studio_id: studioId,
      },
      data: {
        status,
        checked_at: status === ChecklistItemStatus.COMPLETED ? new Date() : null,
        checked_by: checkedBy || null,
        updated_at: new Date(),
      },
    });

    return this.getEquipmentList(studioId, projectId);
  }

  /**
   * Remove equipment item
   */
  static async removeEquipment(studioId: string, itemId: string): Promise<boolean> {
    const item = await prisma.projectEquipmentChecklist.findFirst({
      where: { id: itemId, studio_id: studioId },
    });

    if (!item) {
      throw new Error(`Equipment checklist item not found: ${itemId}`);
    }

    await prisma.projectEquipmentChecklist.delete({
      where: { id: itemId },
    });

    return true;
  }
}
