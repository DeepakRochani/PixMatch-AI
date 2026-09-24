/**
 * Automation Controller — PIXMatch AI Phase 16
 * Handles Fastify HTTP request lifecycles for Automation Workflows, Runs, Approvals, and Templates.
 */

import { FastifyRequest, FastifyReply } from 'fastify';
import { AutomationService } from './automation.service.js';
import { AutomationTemplateService } from './automation-template.service.js';
import {
  CreateAutomationWorkflowDTO,
  UpdateAutomationWorkflowDTO,
  ResolveAutomationApprovalDTO,
  BulkAutomationRunRequestDTO,
} from '@pixmatch/types';

export class AutomationController {
  private static service = new AutomationService();
  private static templateService = new AutomationTemplateService();

  // -------------------------------------------------------------
  // WORKFLOW CRUD
  // -------------------------------------------------------------

  public static async listWorkflows(req: FastifyRequest, reply: FastifyReply) {
    const studioId = (req as any).user?.studio_id;
    if (!studioId) return reply.status(401).send({ error: 'Unauthorized: Studio context missing' });

    const workflows = await AutomationController.service.listWorkflows(studioId);
    return reply.send(workflows);
  }

  public static async createWorkflow(req: FastifyRequest<{ Body: CreateAutomationWorkflowDTO }>, reply: FastifyReply) {
    const studioId = (req as any).user?.studio_id;
    const userId = (req as any).user?.id;
    if (!studioId) return reply.status(401).send({ error: 'Unauthorized: Studio context missing' });

    try {
      const created = await AutomationController.service.createWorkflow(studioId, userId, req.body);
      return reply.status(201).send(created);
    } catch (err: any) {
      return reply.status(400).send({ error: err.message || 'Failed to create workflow' });
    }
  }

  public static async getWorkflow(req: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) {
    const studioId = (req as any).user?.studio_id;
    const { id } = req.params;

    const workflow = await AutomationController.service.getWorkflow(id, studioId);
    if (!workflow) return reply.status(404).send({ error: 'Workflow not found' });

    return reply.send(workflow);
  }

  public static async updateWorkflow(req: FastifyRequest<{ Params: { id: string }; Body: UpdateAutomationWorkflowDTO }>, reply: FastifyReply) {
    const studioId = (req as any).user?.studio_id;
    const { id } = req.params;

    try {
      const updated = await AutomationController.service.updateWorkflow(id, studioId, req.body);
      return reply.send(updated);
    } catch (err: any) {
      return reply.status(400).send({ error: err.message || 'Failed to update workflow' });
    }
  }

  public static async deleteWorkflow(req: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) {
    const studioId = (req as any).user?.studio_id;
    const { id } = req.params;

    try {
      await AutomationController.service.deleteWorkflow(id, studioId);
      return reply.send({ success: true, message: 'Workflow deleted' });
    } catch (err: any) {
      return reply.status(400).send({ error: err.message || 'Failed to delete workflow' });
    }
  }

  public static async enableWorkflow(req: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) {
    const studioId = (req as any).user?.studio_id;
    const { id } = req.params;

    const updated = await AutomationController.service.toggleWorkflow(id, studioId, true);
    return reply.send(updated);
  }

  public static async disableWorkflow(req: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) {
    const studioId = (req as any).user?.studio_id;
    const { id } = req.params;

    const updated = await AutomationController.service.toggleWorkflow(id, studioId, false);
    return reply.send(updated);
  }

  public static async duplicateWorkflow(req: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) {
    const studioId = (req as any).user?.studio_id;
    const userId = (req as any).user?.id;
    const { id } = req.params;

    const duplicated = await AutomationController.service.duplicateWorkflow(id, studioId, userId);
    return reply.status(201).send(duplicated);
  }

  public static async runWorkflow(req: FastifyRequest<{ Params: { id: string }; Body?: { gallery_id?: string } }>, reply: FastifyReply) {
    const studioId = (req as any).user?.studio_id;
    const userId = (req as any).user?.id;
    const { id } = req.params;
    const galleryId = req.body?.gallery_id;

    try {
      const run = await AutomationController.service.runWorkflow(id, studioId, galleryId, userId);
      return reply.status(200).send(run);
    } catch (err: any) {
      return reply.status(400).send({ error: err.message || 'Failed to trigger workflow execution' });
    }
  }

  // -------------------------------------------------------------
  // RUNS
  // -------------------------------------------------------------

  public static async listRuns(req: FastifyRequest<{ Querystring: { gallery_id?: string } }>, reply: FastifyReply) {
    const studioId = (req as any).user?.studio_id;
    const galleryId = req.query?.gallery_id;

    const runs = await AutomationController.service.listRuns(studioId, galleryId);
    return reply.send(runs);
  }

  public static async getRun(req: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) {
    const studioId = (req as any).user?.studio_id;
    const { id } = req.params;

    const run = await AutomationController.service.getRun(id, studioId);
    if (!run) return reply.status(404).send({ error: 'Automation run not found' });

    return reply.send(run);
  }

  public static async pauseRun(req: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) {
    const studioId = (req as any).user?.studio_id;
    const { id } = req.params;

    try {
      const run = await AutomationController.service.pauseRun(id, studioId);
      return reply.send(run);
    } catch (err: any) {
      return reply.status(400).send({ error: err.message });
    }
  }

  public static async resumeRun(req: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) {
    const studioId = (req as any).user?.studio_id;
    const userId = (req as any).user?.id;
    const { id } = req.params;

    try {
      const run = await AutomationController.service.resumeRun(id, studioId, userId);
      return reply.send(run);
    } catch (err: any) {
      return reply.status(400).send({ error: err.message });
    }
  }

  public static async cancelRun(req: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) {
    const studioId = (req as any).user?.studio_id;
    const { id } = req.params;

    try {
      const run = await AutomationController.service.cancelRun(id, studioId);
      return reply.send(run);
    } catch (err: any) {
      return reply.status(400).send({ error: err.message });
    }
  }

  public static async retryRun(req: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) {
    const studioId = (req as any).user?.studio_id;
    const { id } = req.params;

    try {
      const run = await AutomationController.service.retryRun(id, studioId);
      return reply.send(run);
    } catch (err: any) {
      return reply.status(400).send({ error: err.message });
    }
  }

  // -------------------------------------------------------------
  // APPROVALS
  // -------------------------------------------------------------

  public static async listApprovals(req: FastifyRequest, reply: FastifyReply) {
    const studioId = (req as any).user?.studio_id;
    const approvals = await AutomationController.service.listApprovals(studioId);
    return reply.send(approvals);
  }

  public static async approveApproval(req: FastifyRequest<{ Params: { id: string }; Body?: { note?: string } }>, reply: FastifyReply) {
    const studioId = (req as any).user?.studio_id;
    const userId = (req as any).user?.id;
    const { id } = req.params;
    const note = req.body?.note;

    try {
      const approved = await AutomationController.service.approveApproval(id, studioId, userId, note);
      return reply.send(approved);
    } catch (err: any) {
      return reply.status(400).send({ error: err.message });
    }
  }

  public static async rejectApproval(req: FastifyRequest<{ Params: { id: string }; Body?: { note?: string } }>, reply: FastifyReply) {
    const studioId = (req as any).user?.studio_id;
    const userId = (req as any).user?.id;
    const { id } = req.params;
    const note = req.body?.note;

    try {
      const rejected = await AutomationController.service.rejectApproval(id, studioId, userId, note);
      return reply.send(rejected);
    } catch (err: any) {
      return reply.status(400).send({ error: err.message });
    }
  }

  // -------------------------------------------------------------
  // TEMPLATES
  // -------------------------------------------------------------

  public static async listTemplates(req: FastifyRequest, reply: FastifyReply) {
    const studioId = (req as any).user?.studio_id;
    const templates = await AutomationController.templateService.listTemplates(studioId);
    return reply.send(templates);
  }

  public static async useTemplate(req: FastifyRequest<{ Params: { id: string }; Body?: { name?: string } }>, reply: FastifyReply) {
    const studioId = (req as any).user?.studio_id;
    const userId = (req as any).user?.id;
    const { id } = req.params;
    const customName = req.body?.name;

    try {
      const workflow = await AutomationController.service.createFromTemplate(id, studioId, userId, customName);
      return reply.status(201).send(workflow);
    } catch (err: any) {
      return reply.status(400).send({ error: err.message });
    }
  }

  // -------------------------------------------------------------
  // GALLERY AUTOMATION & BULK
  // -------------------------------------------------------------

  public static async getGalleryAutomation(req: FastifyRequest<{ Params: { galleryId: string } }>, reply: FastifyReply) {
    const studioId = (req as any).user?.studio_id;
    const { galleryId } = req.params;

    try {
      const settings = await AutomationController.service.getGallerySettings(galleryId, studioId);
      return reply.send(settings);
    } catch (err: any) {
      return reply.status(404).send({ error: err.message });
    }
  }

  public static async runGalleryAutomation(req: FastifyRequest<{ Params: { galleryId: string }; Body?: { workflow_id?: string } }>, reply: FastifyReply) {
    const studioId = (req as any).user?.studio_id;
    const userId = (req as any).user?.id;
    const { galleryId } = req.params;
    const workflowId = req.body?.workflow_id;

    try {
      const bulk = await AutomationController.service.bulkRunGalleries(studioId, userId, {
        gallery_ids: [galleryId],
        workflow_id: workflowId,
      });
      return reply.send(bulk.runs[0] || { success: true });
    } catch (err: any) {
      return reply.status(400).send({ error: err.message });
    }
  }

  public static async bulkRun(req: FastifyRequest<{ Body: BulkAutomationRunRequestDTO }>, reply: FastifyReply) {
    const studioId = (req as any).user?.studio_id;
    const userId = (req as any).user?.id;

    try {
      const result = await AutomationController.service.bulkRunGalleries(studioId, userId, req.body);
      return reply.send(result);
    } catch (err: any) {
      return reply.status(400).send({ error: err.message });
    }
  }

  // -------------------------------------------------------------
  // TELEMETRY
  // -------------------------------------------------------------

  public static async getTelemetry(req: FastifyRequest, reply: FastifyReply) {
    const studioId = (req as any).user?.role === 'SUPER_ADMIN' ? undefined : (req as any).user?.studio_id;
    const telemetry = await AutomationController.service.getTelemetry(studioId);
    return reply.send(telemetry);
  }
}
