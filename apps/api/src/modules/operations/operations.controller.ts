/**
 * Operations Controller — PixMatch AI Phase 20
 * Fastify Request handlers for Studio Operations, Leads CRM, Projects, Tasks, Milestones, and Calendar.
 */

import { FastifyRequest, FastifyReply } from 'fastify';
import { LeadService } from './lead.service.js';
import { ProjectService } from './project.service.js';
import { TaskService } from './task.service.js';
import { MilestoneService } from './milestone.service.js';
import { CalendarService } from './calendar.service.js';
import { OperationsOverviewService } from './operations-overview.service.js';

export class OperationsController {
  private static getStudioId(req: FastifyRequest): string {
    const studioId =
      (req.headers['x-studio-id'] as string) ||
      (req.user as any)?.studio_id ||
      (req.user as any)?.studioId ||
      (req.query as any)?.studio_id ||
      (req.query as any)?.studioId ||
      (req.body as any)?.studio_id;

    if (!studioId) {
      throw new Error('Studio ID is required');
    }
    return studioId;
  }

  private static getUserId(req: FastifyRequest): string {
    return (req.user as any)?.id || (req.user as any)?.userId || 'system-user';
  }

  // ==========================================
  // 1. OPERATIONS OVERVIEW
  // ==========================================
  static async getOverview(req: FastifyRequest, reply: FastifyReply) {
    try {
      const studioId = OperationsController.getStudioId(req);
      const data = await OperationsOverviewService.getOverview(studioId);
      return reply.send({ success: true, data });
    } catch (err: any) {
      return reply.status(400).send({ success: false, error: err.message });
    }
  }

  // ==========================================
  // 2. LEADS CRM PIPELINE
  // ==========================================
  static async listLeads(req: FastifyRequest, reply: FastifyReply) {
    try {
      const studioId = OperationsController.getStudioId(req);
      const query = req.query as any;
      const data = await LeadService.listLeads(studioId, {
        status: query?.status,
        source: query?.source,
        search: query?.search,
        page: query?.page ? parseInt(query.page, 10) : undefined,
        limit: query?.limit ? parseInt(query.limit, 10) : undefined,
        sortBy: query?.sort_by || query?.sortBy,
        sortOrder: query?.sort_order || query?.sortOrder,
      });
      return reply.send({ success: true, data });
    } catch (err: any) {
      return reply.status(400).send({ success: false, error: err.message });
    }
  }

  static async getLead(req: FastifyRequest, reply: FastifyReply) {
    try {
      const { id } = req.params as { id: string };
      const studioId = OperationsController.getStudioId(req);
      const data = await LeadService.getLead(studioId, id);
      if (!data) {
        return reply.status(404).send({ success: false, error: 'Lead not found' });
      }
      return reply.send({ success: true, data });
    } catch (err: any) {
      return reply.status(400).send({ success: false, error: err.message });
    }
  }

  static async createLead(req: FastifyRequest, reply: FastifyReply) {
    try {
      const studioId = OperationsController.getStudioId(req);
      const dto = req.body as any;
      const data = await LeadService.createLead(studioId, dto);
      return reply.status(201).send({ success: true, data });
    } catch (err: any) {
      return reply.status(400).send({ success: false, error: err.message });
    }
  }

  static async updateLead(req: FastifyRequest, reply: FastifyReply) {
    try {
      const { id } = req.params as { id: string };
      const studioId = OperationsController.getStudioId(req);
      const dto = req.body as any;
      const data = await LeadService.updateLead(studioId, id, dto);
      return reply.send({ success: true, data });
    } catch (err: any) {
      return reply.status(400).send({ success: false, error: err.message });
    }
  }

  static async deleteLead(req: FastifyRequest, reply: FastifyReply) {
    try {
      const { id } = req.params as { id: string };
      const studioId = OperationsController.getStudioId(req);
      await LeadService.deleteLead(studioId, id);
      return reply.send({ success: true, message: 'Lead deleted successfully' });
    } catch (err: any) {
      return reply.status(400).send({ success: false, error: err.message });
    }
  }

  static async convertLead(req: FastifyRequest, reply: FastifyReply) {
    try {
      const { id } = req.params as { id: string };
      const studioId = OperationsController.getStudioId(req);
      const dto = (req.body as any) || {};
      const data = await LeadService.convertLead(id, studioId, dto);
      return reply.send({ success: true, data });
    } catch (err: any) {
      return reply.status(400).send({ success: false, error: err.message });
    }
  }

  // ==========================================
  // 3. PROJECTS MANAGEMENT
  // ==========================================
  static async listProjects(req: FastifyRequest, reply: FastifyReply) {
    try {
      const studioId = OperationsController.getStudioId(req);
      const query = req.query as any;
      const data = await ProjectService.listProjects(studioId, {
        status: query?.status,
        project_type: query?.project_type,
        client_id: query?.client_id,
        search: query?.search,
        page: query?.page ? parseInt(query.page, 10) : undefined,
        limit: query?.limit ? parseInt(query.limit, 10) : undefined,
        sortBy: query?.sort_by || query?.sortBy,
        sortOrder: query?.sort_order || query?.sortOrder,
      });
      return reply.send({ success: true, data });
    } catch (err: any) {
      return reply.status(400).send({ success: false, error: err.message });
    }
  }

  static async getProject(req: FastifyRequest, reply: FastifyReply) {
    try {
      const { id } = req.params as { id: string };
      const studioId = OperationsController.getStudioId(req);
      const data = await ProjectService.getProject(studioId, id);
      if (!data) {
        return reply.status(404).send({ success: false, error: 'Project not found' });
      }
      return reply.send({ success: true, data });
    } catch (err: any) {
      return reply.status(400).send({ success: false, error: err.message });
    }
  }

  static async createProject(req: FastifyRequest, reply: FastifyReply) {
    try {
      const studioId = OperationsController.getStudioId(req);
      const userId = OperationsController.getUserId(req);
      const dto = req.body as any;
      const data = await ProjectService.createProject(studioId, dto, userId);
      return reply.status(201).send({ success: true, data });
    } catch (err: any) {
      return reply.status(400).send({ success: false, error: err.message });
    }
  }

  static async updateProject(req: FastifyRequest, reply: FastifyReply) {
    try {
      const { id } = req.params as { id: string };
      const studioId = OperationsController.getStudioId(req);
      const userId = OperationsController.getUserId(req);
      const dto = req.body as any;
      const data = await ProjectService.updateProject(studioId, id, dto, userId);
      return reply.send({ success: true, data });
    } catch (err: any) {
      return reply.status(400).send({ success: false, error: err.message });
    }
  }

  static async deleteProject(req: FastifyRequest, reply: FastifyReply) {
    try {
      const { id } = req.params as { id: string };
      const studioId = OperationsController.getStudioId(req);
      await ProjectService.deleteProject(studioId, id);
      return reply.send({ success: true, message: 'Project deleted successfully' });
    } catch (err: any) {
      return reply.status(400).send({ success: false, error: err.message });
    }
  }

  static async linkGallery(req: FastifyRequest, reply: FastifyReply) {
    try {
      const { id } = req.params as { id: string };
      const studioId = OperationsController.getStudioId(req);
      const dto = req.body as any;
      const role = dto.is_primary ? 'PRIMARY' : (dto.role || 'PRIMARY');
      const data = await ProjectService.linkGallery(studioId, id, dto.gallery_id, role);
      return reply.status(201).send({ success: true, data });
    } catch (err: any) {
      return reply.status(400).send({ success: false, error: err.message });
    }
  }

  static async unlinkGallery(req: FastifyRequest, reply: FastifyReply) {
    try {
      const { id, galleryId } = req.params as { id: string; galleryId: string };
      const studioId = OperationsController.getStudioId(req);
      await ProjectService.unlinkGallery(studioId, id, galleryId);
      return reply.send({ success: true, message: 'Gallery unlinked successfully' });
    } catch (err: any) {
      return reply.status(400).send({ success: false, error: err.message });
    }
  }

  static async listProjectGalleries(req: FastifyRequest, reply: FastifyReply) {
    try {
      const { id } = req.params as { id: string };
      const studioId = OperationsController.getStudioId(req);
      const data = await ProjectService.listGalleries(studioId, id);
      return reply.send({ success: true, data });
    } catch (err: any) {
      return reply.status(400).send({ success: false, error: err.message });
    }
  }

  static async listProjectPayments(req: FastifyRequest, reply: FastifyReply) {
    try {
      const { id } = req.params as { id: string };
      const studioId = OperationsController.getStudioId(req);
      const data = await ProjectService.listPayments(studioId, id);
      return reply.send({ success: true, data });
    } catch (err: any) {
      return reply.status(400).send({ success: false, error: err.message });
    }
  }

  static async addProjectNote(req: FastifyRequest, reply: FastifyReply) {
    try {
      const { id } = req.params as { id: string };
      const studioId = OperationsController.getStudioId(req);
      const authorId = OperationsController.getUserId(req);
      const body = req.body as any;
      const dto = typeof body === 'string' ? { content: body } : body;
      const data = await ProjectService.addNote(studioId, id, dto, authorId);
      return reply.status(201).send({ success: true, data });
    } catch (err: any) {
      return reply.status(400).send({ success: false, error: err.message });
    }
  }

  static async listProjectNotes(req: FastifyRequest, reply: FastifyReply) {
    try {
      const { id } = req.params as { id: string };
      const studioId = OperationsController.getStudioId(req);
      const data = await ProjectService.listNotes(studioId, id);
      return reply.send({ success: true, data });
    } catch (err: any) {
      return reply.status(400).send({ success: false, error: err.message });
    }
  }

  static async deleteProjectNote(req: FastifyRequest, reply: FastifyReply) {
    try {
      const { noteId } = req.params as { noteId: string };
      const studioId = OperationsController.getStudioId(req);
      await ProjectService.deleteNote(studioId, noteId);
      return reply.send({ success: true, message: 'Note deleted successfully' });
    } catch (err: any) {
      return reply.status(400).send({ success: false, error: err.message });
    }
  }

  // ==========================================
  // 4. TASKS MANAGEMENT
  // ==========================================
  static async listTasks(req: FastifyRequest, reply: FastifyReply) {
    try {
      const studioId = OperationsController.getStudioId(req);
      const query = req.query as any;
      const data = await TaskService.listTasks(studioId, {
        project_id: query?.project_id,
        status: query?.status,
        priority: query?.priority,
        assigned_to: query?.assigned_to || query?.assigned_to_user_id,
        is_overdue: query?.is_overdue === 'true' || query?.is_overdue === true,
        search: query?.search,
      });
      return reply.send({ success: true, data });
    } catch (err: any) {
      return reply.status(400).send({ success: false, error: err.message });
    }
  }

  static async getTask(req: FastifyRequest, reply: FastifyReply) {
    try {
      const { id } = req.params as { id: string };
      const studioId = OperationsController.getStudioId(req);
      const data = await TaskService.getTask(studioId, id);
      if (!data) {
        return reply.status(404).send({ success: false, error: 'Task not found' });
      }
      return reply.send({ success: true, data });
    } catch (err: any) {
      return reply.status(400).send({ success: false, error: err.message });
    }
  }

  static async createTask(req: FastifyRequest, reply: FastifyReply) {
    try {
      const studioId = OperationsController.getStudioId(req);
      const userId = OperationsController.getUserId(req);
      const dto = req.body as any;
      const data = await TaskService.createTask(studioId, dto, userId);
      return reply.status(201).send({ success: true, data });
    } catch (err: any) {
      return reply.status(400).send({ success: false, error: err.message });
    }
  }

  static async updateTask(req: FastifyRequest, reply: FastifyReply) {
    try {
      const { id } = req.params as { id: string };
      const studioId = OperationsController.getStudioId(req);
      const userId = OperationsController.getUserId(req);
      const dto = req.body as any;
      const data = await TaskService.updateTask(studioId, id, dto, userId);
      return reply.send({ success: true, data });
    } catch (err: any) {
      return reply.status(400).send({ success: false, error: err.message });
    }
  }

  static async completeTask(req: FastifyRequest, reply: FastifyReply) {
    try {
      const { id } = req.params as { id: string };
      const studioId = OperationsController.getStudioId(req);
      const data = await TaskService.completeTask(studioId, id);
      return reply.send({ success: true, data });
    } catch (err: any) {
      return reply.status(400).send({ success: false, error: err.message });
    }
  }

  static async deleteTask(req: FastifyRequest, reply: FastifyReply) {
    try {
      const { id } = req.params as { id: string };
      const studioId = OperationsController.getStudioId(req);
      await TaskService.deleteTask(studioId, id);
      return reply.send({ success: true, message: 'Task deleted successfully' });
    } catch (err: any) {
      return reply.status(400).send({ success: false, error: err.message });
    }
  }

  // ==========================================
  // 5. MILESTONES MANAGEMENT
  // ==========================================
  static async listMilestones(req: FastifyRequest, reply: FastifyReply) {
    try {
      const { projectId } = req.params as { projectId: string };
      const data = await MilestoneService.listMilestones(projectId);
      return reply.send({ success: true, data });
    } catch (err: any) {
      return reply.status(400).send({ success: false, error: err.message });
    }
  }

  static async getMilestone(req: FastifyRequest, reply: FastifyReply) {
    try {
      const { id } = req.params as { id: string };
      const data = await MilestoneService.getMilestone(id);
      if (!data) {
        return reply.status(404).send({ success: false, error: 'Milestone not found' });
      }
      return reply.send({ success: true, data });
    } catch (err: any) {
      return reply.status(400).send({ success: false, error: err.message });
    }
  }

  static async createMilestone(req: FastifyRequest, reply: FastifyReply) {
    try {
      const studioId = OperationsController.getStudioId(req);
      const dto = req.body as any;
      const data = await MilestoneService.createMilestone(studioId, dto);
      return reply.status(201).send({ success: true, data });
    } catch (err: any) {
      return reply.status(400).send({ success: false, error: err.message });
    }
  }

  static async updateMilestone(req: FastifyRequest, reply: FastifyReply) {
    try {
      const { id } = req.params as { id: string };
      const dto = req.body as any;
      const data = await MilestoneService.updateMilestone(id, dto);
      return reply.send({ success: true, data });
    } catch (err: any) {
      return reply.status(400).send({ success: false, error: err.message });
    }
  }

  static async reorderMilestones(req: FastifyRequest, reply: FastifyReply) {
    try {
      const { projectId } = req.params as { projectId: string };
      const { milestone_ids } = req.body as { milestone_ids: string[] };
      const data = await MilestoneService.reorderMilestones(projectId, milestone_ids);
      return reply.send({ success: true, data });
    } catch (err: any) {
      return reply.status(400).send({ success: false, error: err.message });
    }
  }

  static async deleteMilestone(req: FastifyRequest, reply: FastifyReply) {
    try {
      const { id } = req.params as { id: string };
      await MilestoneService.deleteMilestone(id);
      return reply.send({ success: true, message: 'Milestone deleted successfully' });
    } catch (err: any) {
      return reply.status(400).send({ success: false, error: err.message });
    }
  }

  // ==========================================
  // 6. OPERATIONS CALENDAR
  // ==========================================
  static async getCalendarEvents(req: FastifyRequest, reply: FastifyReply) {
    try {
      const studioId = OperationsController.getStudioId(req);
      const query = req.query as any;
      const data = await CalendarService.getEvents(studioId, query);
      return reply.send({ success: true, data });
    } catch (err: any) {
      return reply.status(400).send({ success: false, error: err.message });
    }
  }
}
