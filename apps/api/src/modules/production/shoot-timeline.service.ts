import { prisma } from '@pixmatch/database';
import {
  CreateProjectTimelineItemDTO,
  ProjectTimelineItemDTO,
} from '@pixmatch/types';

export class ShootTimelineService {
  /**
   * Add a timeline milestone or schedule block to a project production
   */
  static async addTimelineItem(
    studioId: string,
    projectId: string,
    dto: CreateProjectTimelineItemDTO
  ): Promise<ProjectTimelineItemDTO> {
    const item = await prisma.projectProductionTimeline.create({
      data: {
        studio_id: studioId,
        project_id: projectId,
        shoot_session_id: dto.shoot_session_id || null,
        event_type: dto.event_type || 'PORTRAITS',
        title: dto.title,
        description: dto.description || null,
        start_at: new Date(dto.start_at),
        end_at: new Date(dto.end_at),
        location: dto.location || null,
        assigned_resource_id: dto.assigned_resource_id || null,
        status: dto.status || 'PLANNED',
      },
    });

    return item as unknown as ProjectTimelineItemDTO;
  }

  /**
   * Update an existing timeline item
   */
  static async updateTimelineItem(
    studioId: string,
    itemId: string,
    dto: Partial<CreateProjectTimelineItemDTO>
  ): Promise<ProjectTimelineItemDTO> {
    const item = await prisma.projectProductionTimeline.findFirst({
      where: { id: itemId, studio_id: studioId },
    });

    if (!item) {
      throw new Error(`Timeline item not found: ${itemId}`);
    }

    const updated = await prisma.projectProductionTimeline.update({
      where: { id: itemId },
      data: {
        title: dto.title !== undefined ? dto.title : item.title,
        description: dto.description !== undefined ? dto.description : item.description,
        event_type: dto.event_type || item.event_type,
        start_at: dto.start_at ? new Date(dto.start_at) : item.start_at,
        end_at: dto.end_at ? new Date(dto.end_at) : item.end_at,
        location: dto.location !== undefined ? dto.location : item.location,
        assigned_resource_id:
          dto.assigned_resource_id !== undefined ? dto.assigned_resource_id : item.assigned_resource_id,
        status: dto.status || item.status,
        shoot_session_id:
          dto.shoot_session_id !== undefined ? dto.shoot_session_id : item.shoot_session_id,
        updated_at: new Date(),
      },
    });

    return updated as unknown as ProjectTimelineItemDTO;
  }

  /**
   * Get all timeline items for a project, sorted chronologically
   */
  static async getTimeline(
    studioId: string,
    projectId: string
  ): Promise<ProjectTimelineItemDTO[]> {
    const items = await prisma.projectProductionTimeline.findMany({
      where: { project_id: projectId, studio_id: studioId },
      orderBy: [{ start_at: 'asc' }],
    });

    return items as unknown as ProjectTimelineItemDTO[];
  }

  /**
   * Delete a timeline item
   */
  static async deleteTimelineItem(studioId: string, itemId: string): Promise<boolean> {
    const item = await prisma.projectProductionTimeline.findFirst({
      where: { id: itemId, studio_id: studioId },
    });

    if (!item) {
      throw new Error(`Timeline item not found: ${itemId}`);
    }

    await prisma.projectProductionTimeline.delete({
      where: { id: itemId },
    });

    return true;
  }
}
