/**
 * Milestone Service — PixMatch AI Phase 20
 * Project milestone tracking, status management, reordering, and completion dates.
 */

import { prisma } from '@pixmatch/database';
import { ProjectMilestoneStatus, ProjectMilestoneDTO, CreateProjectMilestoneDTO, UpdateProjectMilestoneDTO } from '@pixmatch/types';

export class MilestoneService {
  /**
   * List milestones for a project ordered by order_index ASC, target_date ASC
   */
  static async listMilestones(projectId: string): Promise<ProjectMilestoneDTO[]> {
    const milestones = await prisma.projectMilestone.findMany({
      where: { project_id: projectId },
      orderBy: [
        { order_index: 'asc' },
        { target_date: 'asc' },
        { created_at: 'asc' },
      ],
    });

    return milestones.map((m: any) => ({
      id: m.id,
      project_id: m.project_id,
      studio_id: m.studio_id,
      title: m.title,
      description: m.description,
      status: m.status as any,
      target_date: m.target_date?.toISOString(),
      completed_at: m.completed_at?.toISOString(),
      order_index: m.order_index,
      created_at: m.created_at.toISOString(),
      updated_at: m.updated_at.toISOString(),

      projectId: m.project_id,
      studioId: m.studio_id,
      orderIndex: m.order_index,
      targetDate: m.target_date?.toISOString(),
      completedAt: m.completed_at?.toISOString(),
      createdAt: m.created_at.toISOString(),
      updatedAt: m.updated_at.toISOString(),
    }));
  }

  /**
   * Get single milestone by ID
   */
  static async getMilestone(id: string): Promise<ProjectMilestoneDTO | null> {
    const m = await prisma.projectMilestone.findUnique({
      where: { id },
    });

    if (!m) return null;

    return {
      id: m.id,
      project_id: m.project_id,
      studio_id: m.studio_id,
      title: m.title,
      description: m.description,
      status: m.status as any,
      target_date: m.target_date?.toISOString(),
      completed_at: m.completed_at?.toISOString(),
      order_index: m.order_index,
      created_at: m.created_at.toISOString(),
      updated_at: m.updated_at.toISOString(),

      projectId: m.project_id,
      studioId: m.studio_id,
      orderIndex: m.order_index,
      targetDate: m.target_date?.toISOString(),
      completedAt: m.completed_at?.toISOString(),
      createdAt: m.created_at.toISOString(),
      updatedAt: m.updated_at.toISOString(),
    };
  }

  /**
   * Create milestone
   */
  static async createMilestone(
    studioId: string,
    dto: CreateProjectMilestoneDTO
  ): Promise<ProjectMilestoneDTO> {
    let order = (dto as any).order_index ?? (dto as any).orderIndex ?? (dto as any).sequence_order;
    if (order === undefined || order === null) {
      const highestOrder = await prisma.projectMilestone.findFirst({
        where: { project_id: dto.project_id },
        orderBy: { order_index: 'desc' },
        select: { order_index: true },
      });
      order = (highestOrder?.order_index ?? -1) + 1;
    }

    const milestone = await prisma.projectMilestone.create({
      data: {
        studio_id: studioId,
        project_id: dto.project_id,
        title: dto.title,
        description: dto.description || null,
        status: (dto.status as ProjectMilestoneStatus) || ProjectMilestoneStatus.PENDING,
        target_date: dto.target_date ? new Date(dto.target_date) : null,
        order_index: order,
      },
    });

    return {
      id: milestone.id,
      project_id: milestone.project_id,
      studio_id: milestone.studio_id,
      title: milestone.title,
      description: milestone.description,
      status: milestone.status as any,
      target_date: milestone.target_date?.toISOString(),
      completed_at: milestone.completed_at?.toISOString(),
      order_index: milestone.order_index,
      created_at: milestone.created_at.toISOString(),
      updated_at: milestone.updated_at.toISOString(),

      projectId: milestone.project_id,
      studioId: milestone.studio_id,
      orderIndex: milestone.order_index,
      targetDate: milestone.target_date?.toISOString(),
      completedAt: milestone.completed_at?.toISOString(),
      createdAt: milestone.created_at.toISOString(),
      updatedAt: milestone.updated_at.toISOString(),
    };
  }

  /**
   * Update milestone
   */
  static async updateMilestone(
    id: string,
    dto: UpdateProjectMilestoneDTO
  ): Promise<ProjectMilestoneDTO> {
    const existing = await prisma.projectMilestone.findUnique({
      where: { id },
    });

    if (!existing) {
      throw new Error(`Milestone with id ${id} not found`);
    }

    const data: any = {};
    if (dto.title !== undefined) data.title = dto.title;
    if (dto.description !== undefined) data.description = dto.description;
    const order = (dto as any).order_index ?? (dto as any).orderIndex ?? (dto as any).sequence_order;
    if (order !== undefined) data.order_index = order;
    if (dto.target_date !== undefined) {
      data.target_date = dto.target_date ? new Date(dto.target_date) : null;
    }

    if (dto.status !== undefined) {
      data.status = dto.status as ProjectMilestoneStatus;
      if (dto.status === ProjectMilestoneStatus.COMPLETED && !existing.completed_at) {
        data.completed_at = new Date();
      } else if (dto.status !== ProjectMilestoneStatus.COMPLETED) {
        data.completed_at = null;
      }
    }

    if (dto.completed_at !== undefined) {
      data.completed_at = dto.completed_at ? new Date(dto.completed_at) : null;
    }

    const updated = await prisma.projectMilestone.update({
      where: { id },
      data,
    });

    return {
      id: updated.id,
      project_id: updated.project_id,
      studio_id: updated.studio_id,
      title: updated.title,
      description: updated.description,
      status: updated.status as any,
      target_date: updated.target_date?.toISOString(),
      completed_at: updated.completed_at?.toISOString(),
      order_index: updated.order_index,
      created_at: updated.created_at.toISOString(),
      updated_at: updated.updated_at.toISOString(),

      projectId: updated.project_id,
      studioId: updated.studio_id,
      orderIndex: updated.order_index,
      targetDate: updated.target_date?.toISOString(),
      completedAt: updated.completed_at?.toISOString(),
      createdAt: updated.created_at.toISOString(),
      updatedAt: updated.updated_at.toISOString(),
    };
  }

  /**
   * Reorder milestones in a project
   */
  static async reorderMilestones(
    projectId: string,
    milestoneIdsInOrder: string[]
  ): Promise<ProjectMilestoneDTO[]> {
    await prisma.$transaction(
      milestoneIdsInOrder.map((id, index) =>
        prisma.projectMilestone.update({
          where: { id },
          data: { order_index: index },
        })
      )
    );

    return this.listMilestones(projectId);
  }

  /**
   * Delete milestone
   */
  static async deleteMilestone(id: string): Promise<boolean> {
    await prisma.projectMilestone.delete({
      where: { id },
    });
    return true;
  }
}
