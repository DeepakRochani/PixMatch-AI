/**
 * Task Service — PixMatch AI Phase 20
 * Task management, priority assignment, deadline tracking, and overdue detection.
 */

import { prisma } from '@pixmatch/database';
import {
  ProjectTaskStatus,
  ProjectTaskPriority,
  ProjectTaskDTO,
  CreateProjectTaskDTO,
  UpdateProjectTaskDTO,
} from '@pixmatch/types';

export class TaskService {
  /**
   * Helper: Sanitize text inputs
   */
  private static sanitizeText(str?: string | null): string | null {
    if (!str) return str || null;
    let sanitized = str.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
    if (/^[=+@\-\t\r]/.test(sanitized)) {
      sanitized = `'${sanitized}`;
    }
    return sanitized.trim();
  }

  /**
   * List studio tasks with rich filtering
   */
  static async listTasks(
    studioId: string,
    params: {
      project_id?: string;
      status?: ProjectTaskStatus;
      priority?: ProjectTaskPriority;
      assigned_to?: string;
      is_overdue?: boolean;
      due_before?: string | Date;
      due_after?: string | Date;
      search?: string;
      page?: number;
      limit?: number;
      sortBy?: 'due_at' | 'priority' | 'status' | 'created_at';
      sortOrder?: 'asc' | 'desc';
    } = {}
  ): Promise<{ tasks: ProjectTaskDTO[]; total: number; page: number; limit: number }> {
    const page = Math.max(1, params.page || 1);
    const limit = Math.min(100, Math.max(1, params.limit || 50));
    const skip = (page - 1) * limit;

    const where: any = {
      studio_id: studioId,
    };

    if (params.project_id) {
      where.project_id = params.project_id;
    }

    if (params.status) {
      where.status = params.status;
    }

    if (params.priority) {
      where.priority = params.priority;
    }

    if (params.assigned_to) {
      where.assigned_to = params.assigned_to;
    }

    if (params.due_before || params.due_after) {
      where.due_at = {
        gte: params.due_after ? new Date(params.due_after) : undefined,
        lte: params.due_before ? new Date(params.due_before) : undefined,
      };
    }

    if (params.search) {
      where.OR = [
        { title: { contains: params.search, mode: 'insensitive' } },
        { description: { contains: params.search, mode: 'insensitive' } },
        { project: { name: { contains: params.search, mode: 'insensitive' } } },
      ];
    }

    const orderBy: any = {};
    const sortField = params.sortBy || 'due_at';
    const sortOrder = params.sortOrder || 'asc';
    orderBy[sortField] = sortOrder;

    const [tasks, total] = await Promise.all([
      prisma.projectTask.findMany({
        where,
        skip,
        take: limit,
        orderBy,
        include: {
          project: {
            select: { id: true, name: true },
          },
        },
      }),
      prisma.projectTask.count({ where }),
    ]);

    const now = new Date();
    const mapped: ProjectTaskDTO[] = tasks.map((t: any) => {
      const isOverdue = Boolean(t.due_at && new Date(t.due_at) < now && t.status !== ProjectTaskStatus.COMPLETED && t.status !== ProjectTaskStatus.CANCELLED);

      return {
        id: t.id,
        studio_id: t.studio_id,
        project_id: t.project_id,
        project_name: t.project?.name || null,
        title: t.title,
        description: t.description,
        status: t.status as any,
        priority: t.priority as any,
        assigned_to: t.assigned_to,
        due_at: t.due_at,
        completed_at: t.completed_at,
        is_overdue: isOverdue,
        created_at: t.created_at,
        updated_at: t.updated_at,

        // CamelCase aliases
        studioId: t.studio_id,
        projectId: t.project_id,
        projectName: t.project?.name || null,
        assignedTo: t.assigned_to,
        dueAt: t.due_at,
        completedAt: t.completed_at,
        isOverdue,
        createdAt: t.created_at,
        updatedAt: t.updated_at,
      };
    });

    const filtered = params.is_overdue !== undefined ? mapped.filter(t => t.is_overdue === params.is_overdue) : mapped;

    return { tasks: filtered, total, page, limit };
  }

  /**
   * Get single task
   */
  static async getTask(studioId: string, taskId: string): Promise<ProjectTaskDTO> {
    const t = await prisma.projectTask.findFirst({
      where: { id: taskId, studio_id: studioId },
      include: {
        project: {
          select: { id: true, name: true },
        },
      },
    });

    if (!t) throw new Error('Task not found or unauthorized');

    const isOverdue = Boolean(t.due_at && new Date(t.due_at) < new Date() && t.status !== ProjectTaskStatus.COMPLETED && t.status !== ProjectTaskStatus.CANCELLED);

    return {
      id: t.id,
      studio_id: t.studio_id,
      project_id: t.project_id,
      project_name: (t as any).project?.name || null,
      title: t.title,
      description: t.description,
      status: t.status as any,
      priority: t.priority as any,
      assigned_to: t.assigned_to,
      due_at: t.due_at,
      completed_at: t.completed_at,
      is_overdue: isOverdue,
      created_at: t.created_at,
      updated_at: t.updated_at,

      studioId: t.studio_id,
      projectId: t.project_id,
      projectName: (t as any).project?.name || null,
      assignedTo: t.assigned_to,
      dueAt: t.due_at,
      completedAt: t.completed_at,
      isOverdue,
      createdAt: t.created_at,
      updatedAt: t.updated_at,
    };
  }

  /**
   * Create task
   */
  static async createTask(studioId: string, dto: CreateProjectTaskDTO, userId?: string): Promise<ProjectTaskDTO> {
    if (!dto.title || dto.title.trim().length === 0) {
      throw new Error('Task title is required');
    }

    const projectId = dto.project_id || (dto as any).projectId || null;
    if (projectId) {
      const p = await prisma.studioProject.findFirst({
        where: { id: projectId, studio_id: studioId, deleted_at: null },
      });
      if (!p) throw new Error('Project not found or unauthorized');
    }

    const title = this.sanitizeText(dto.title)!;
    const description = this.sanitizeText(dto.description);
    const status = (dto.status || ProjectTaskStatus.TODO) as ProjectTaskStatus;
    const priority = (dto.priority || ProjectTaskPriority.MEDIUM) as ProjectTaskPriority;
    const dueAt = dto.due_at || (dto as any).dueAt ? new Date(dto.due_at || (dto as any).dueAt) : null;
    const assignedTo = dto.assigned_to || (dto as any).assignedTo || null;

    const task = await prisma.projectTask.create({
      data: {
        studio_id: studioId,
        project_id: projectId,
        title,
        description,
        status,
        priority,
        assigned_to: assignedTo,
        due_at: dueAt,
      },
      include: {
        project: {
          select: { id: true, name: true },
        },
      },
    });

    const isOverdue = Boolean(task.due_at && new Date(task.due_at) < new Date() && task.status !== ProjectTaskStatus.COMPLETED && task.status !== ProjectTaskStatus.CANCELLED);

    return {
      id: task.id,
      studio_id: task.studio_id,
      project_id: task.project_id,
      project_name: (task as any).project?.name || null,
      title: task.title,
      description: task.description,
      status: task.status as any,
      priority: task.priority as any,
      assigned_to: task.assigned_to,
      due_at: task.due_at,
      completed_at: task.completed_at,
      is_overdue: isOverdue,
      created_at: task.created_at,
      updated_at: task.updated_at,

      studioId: task.studio_id,
      projectId: task.project_id,
      projectName: (task as any).project?.name || null,
      assignedTo: task.assigned_to,
      dueAt: task.due_at,
      completedAt: task.completed_at,
      isOverdue,
      createdAt: task.created_at,
      updatedAt: task.updated_at,
    };
  }

  /**
   * Update task details
   */
  static async updateTask(studioId: string, taskId: string, dto: UpdateProjectTaskDTO, userId?: string): Promise<ProjectTaskDTO> {
    const existing = await prisma.projectTask.findFirst({
      where: { id: taskId, studio_id: studioId },
    });
    if (!existing) throw new Error('Task not found or unauthorized');

    const data: any = {};
    if (dto.title !== undefined) data.title = this.sanitizeText(dto.title);
    if (dto.description !== undefined) data.description = this.sanitizeText(dto.description);
    if (dto.status !== undefined) {
      data.status = dto.status;
      if (dto.status === ProjectTaskStatus.COMPLETED && !existing.completed_at) {
        data.completed_at = new Date();
      } else if (dto.status !== ProjectTaskStatus.COMPLETED) {
        data.completed_at = null;
      }
    }
    if (dto.priority !== undefined) data.priority = dto.priority;
    if (dto.assigned_to !== undefined || (dto as any).assignedTo !== undefined) {
      data.assigned_to = dto.assigned_to || (dto as any).assignedTo || null;
    }
    if (dto.due_at !== undefined || (dto as any).dueAt !== undefined) {
      const d = dto.due_at || (dto as any).dueAt;
      data.due_at = d ? new Date(d) : null;
    }
    if (dto.completed_at !== undefined || (dto as any).completedAt !== undefined) {
      const c = dto.completed_at || (dto as any).completedAt;
      data.completed_at = c ? new Date(c) : null;
    }

    const updated = await prisma.projectTask.update({
      where: { id: taskId },
      data,
      include: {
        project: {
          select: { id: true, name: true },
        },
      },
    });

    const isOverdue = Boolean(updated.due_at && new Date(updated.due_at) < new Date() && updated.status !== ProjectTaskStatus.COMPLETED && updated.status !== ProjectTaskStatus.CANCELLED);

    return {
      id: updated.id,
      studio_id: updated.studio_id,
      project_id: updated.project_id,
      project_name: (updated as any).project?.name || null,
      title: updated.title,
      description: updated.description,
      status: updated.status as any,
      priority: updated.priority as any,
      assigned_to: updated.assigned_to,
      due_at: updated.due_at,
      completed_at: updated.completed_at,
      is_overdue: isOverdue,
      created_at: updated.created_at,
      updated_at: updated.updated_at,

      studioId: updated.studio_id,
      projectId: updated.project_id,
      projectName: (updated as any).project?.name || null,
      assignedTo: updated.assigned_to,
      dueAt: updated.due_at,
      completedAt: updated.completed_at,
      isOverdue,
      createdAt: updated.created_at,
      updatedAt: updated.updated_at,
    };
  }

  /**
   * Mark task completed
   */
  static async completeTask(studioId: string, taskId: string): Promise<ProjectTaskDTO> {
    return this.updateTask(studioId, taskId, {
      status: ProjectTaskStatus.COMPLETED,
      completed_at: new Date(),
    });
  }

  /**
   * Delete task
   */
  static async deleteTask(studioId: string, taskId: string): Promise<boolean> {
    const task = await prisma.projectTask.findFirst({
      where: { id: taskId, studio_id: studioId },
    });
    if (!task) throw new Error('Task not found or unauthorized');

    await prisma.projectTask.delete({
      where: { id: taskId },
    });
    return true;
  }
}
