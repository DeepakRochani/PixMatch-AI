import { FastifyRequest, FastifyReply } from 'fastify';
import { ProductionService } from './production.service.js';
import { ProductionHealthService } from './production-health.service.js';
import { ProductionDeadlineService } from './production-deadline.service.js';
import { ShootSessionService } from './shoot-session.service.js';
import { CrewAssignmentService } from './crew-assignment.service.js';
import { EquipmentChecklistService } from './equipment-checklist.service.js';
import { ProductionChecklistService } from './production-checklist.service.js';
import { ShotListService } from './shot-list.service.js';
import { QuestionnaireService } from './questionnaire.service.js';
import { ShootTimelineService } from './shoot-timeline.service.js';
import { MediaHandoffService } from './media-handoff.service.js';
import { OfflineSyncService } from './offline-sync.service.js';

export class ProductionController {
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

  // --- Production Profile ---
  static async getProfile(req: FastifyRequest, reply: FastifyReply) {
    try {
      const studioId = ProductionController.getStudioId(req);
      const profile = await ProductionService.getProductionProfile(studioId);
      return reply.send({ success: true, data: profile });
    } catch (err: any) {
      return reply.status(400).send({ success: false, error: err.message });
    }
  }

  static async updateProfile(req: FastifyRequest, reply: FastifyReply) {
    try {
      const studioId = ProductionController.getStudioId(req);
      const profile = await ProductionService.updateProductionProfile(studioId, req.body);
      return reply.send({ success: true, data: profile });
    } catch (err: any) {
      return reply.status(400).send({ success: false, error: err.message });
    }
  }

  // --- Production Record & Lifecycle ---
  static async getProjectProduction(req: FastifyRequest, reply: FastifyReply) {
    try {
      const studioId = ProductionController.getStudioId(req);
      const { projectId } = req.params as { projectId: string };
      const production = await ProductionService.getProjectProduction(studioId, projectId);
      return reply.send({ success: true, data: production });
    } catch (err: any) {
      return reply.status(400).send({ success: false, error: err.message });
    }
  }

  static async initProjectProduction(req: FastifyRequest, reply: FastifyReply) {
    try {
      const studioId = ProductionController.getStudioId(req);
      const { projectId } = req.params as { projectId: string };
      const production = await ProductionService.initProjectProduction(studioId, projectId, req.body as any);
      return reply.send({ success: true, data: production });
    } catch (err: any) {
      return reply.status(400).send({ success: false, error: err.message });
    }
  }

  static async transitionStage(req: FastifyRequest, reply: FastifyReply) {
    try {
      const studioId = ProductionController.getStudioId(req);
      const { projectId } = req.params as { projectId: string };
      const { toStage, reason, performedByUserId } = req.body as any;
      const production = await ProductionService.transitionStage(
        studioId,
        projectId,
        toStage,
        reason,
        performedByUserId || ProductionController.getUserId(req)
      );
      return reply.send({ success: true, data: production });
    } catch (err: any) {
      return reply.status(400).send({ success: false, error: err.message });
    }
  }

  static async startShoot(req: FastifyRequest, reply: FastifyReply) {
    try {
      const studioId = ProductionController.getStudioId(req);
      const { projectId } = req.params as { projectId: string };
      const userId = ProductionController.getUserId(req);
      const result = await ProductionService.startShoot(studioId, projectId, userId);
      return reply.send({ success: true, data: result });
    } catch (err: any) {
      return reply.status(400).send({ success: false, error: err.message });
    }
  }

  static async completeShoot(req: FastifyRequest, reply: FastifyReply) {
    try {
      const studioId = ProductionController.getStudioId(req);
      const { projectId } = req.params as { projectId: string };
      const userId = ProductionController.getUserId(req);
      const result = await ProductionService.completeShoot(studioId, projectId, userId);
      return reply.send({ success: true, data: result });
    } catch (err: any) {
      return reply.status(400).send({ success: false, error: err.message });
    }
  }

  // --- Kanban Board & Overview ---
  static async getKanbanBoard(req: FastifyRequest, reply: FastifyReply) {
    try {
      const studioId = ProductionController.getStudioId(req);
      const board = await ProductionService.getKanbanBoard(studioId);
      return reply.send({ success: true, data: board });
    } catch (err: any) {
      return reply.status(400).send({ success: false, error: err.message });
    }
  }

  static async getSummary(req: FastifyRequest, reply: FastifyReply) {
    try {
      const studioId = ProductionController.getStudioId(req);
      const summary = await ProductionService.getProductionSummary(studioId);
      return reply.send({ success: true, data: summary });
    } catch (err: any) {
      return reply.status(400).send({ success: false, error: err.message });
    }
  }

  // --- Health & Deadlines ---
  static async getHealthScore(req: FastifyRequest, reply: FastifyReply) {
    try {
      const studioId = ProductionController.getStudioId(req);
      const { projectId } = req.params as { projectId: string };
      const score = await ProductionHealthService.computeHealthScore(studioId, projectId);
      return reply.send({ success: true, data: score });
    } catch (err: any) {
      return reply.status(400).send({ success: false, error: err.message });
    }
  }

  static async getDeadlines(req: FastifyRequest, reply: FastifyReply) {
    try {
      const studioId = ProductionController.getStudioId(req);
      const { projectId } = req.params as { projectId: string };
      const deadlines = await ProductionDeadlineService.computeAndSetDeadlines(studioId, projectId);
      return reply.send({ success: true, data: deadlines });
    } catch (err: any) {
      return reply.status(400).send({ success: false, error: err.message });
    }
  }

  static async getUpcomingDeadlines(req: FastifyRequest, reply: FastifyReply) {
    try {
      const studioId = ProductionController.getStudioId(req);
      const days = (req.query as any)?.days ? parseInt((req.query as any).days, 10) : 7;
      const upcoming = await ProductionDeadlineService.getOverdueAndUpcomingDeadlines(studioId, days);
      return reply.send({ success: true, data: upcoming });
    } catch (err: any) {
      return reply.status(400).send({ success: false, error: err.message });
    }
  }

  // --- Shoot Sessions ---
  static async createSession(req: FastifyRequest, reply: FastifyReply) {
    try {
      const studioId = ProductionController.getStudioId(req);
      const { projectId } = req.params as { projectId: string };
      const session = await ShootSessionService.createSession(studioId, projectId, req.body as any);
      return reply.send({ success: true, data: session });
    } catch (err: any) {
      return reply.status(400).send({ success: false, error: err.message });
    }
  }

  static async updateSession(req: FastifyRequest, reply: FastifyReply) {
    try {
      const studioId = ProductionController.getStudioId(req);
      const { sessionId } = req.params as { sessionId: string };
      const session = await ShootSessionService.updateSession(studioId, sessionId, req.body as any);
      return reply.send({ success: true, data: session });
    } catch (err: any) {
      return reply.status(400).send({ success: false, error: err.message });
    }
  }

  static async getSessions(req: FastifyRequest, reply: FastifyReply) {
    try {
      const studioId = ProductionController.getStudioId(req);
      const { projectId } = req.params as { projectId: string };
      const sessions = await ShootSessionService.getSessions(studioId, projectId);
      return reply.send({ success: true, data: sessions });
    } catch (err: any) {
      return reply.status(400).send({ success: false, error: err.message });
    }
  }

  static async deleteSession(req: FastifyRequest, reply: FastifyReply) {
    try {
      const studioId = ProductionController.getStudioId(req);
      const { sessionId } = req.params as { sessionId: string };
      await ShootSessionService.deleteSession(studioId, sessionId);
      return reply.send({ success: true, message: 'Session deleted successfully' });
    } catch (err: any) {
      return reply.status(400).send({ success: false, error: err.message });
    }
  }

  // --- Crew Assignments ---
  static async assignCrew(req: FastifyRequest, reply: FastifyReply) {
    try {
      const studioId = ProductionController.getStudioId(req);
      const { projectId } = req.params as { projectId: string };
      const crew = await CrewAssignmentService.assignCrewMember(studioId, projectId, req.body as any);
      return reply.send({ success: true, data: crew });
    } catch (err: any) {
      return reply.status(400).send({ success: false, error: err.message });
    }
  }

  static async updateCrew(req: FastifyRequest, reply: FastifyReply) {
    try {
      const studioId = ProductionController.getStudioId(req);
      const { assignmentId } = req.params as { assignmentId: string };
      const crew = await CrewAssignmentService.updateAssignment(studioId, assignmentId, req.body as any);
      return reply.send({ success: true, data: crew });
    } catch (err: any) {
      return reply.status(400).send({ success: false, error: err.message });
    }
  }

  static async getCrew(req: FastifyRequest, reply: FastifyReply) {
    try {
      const studioId = ProductionController.getStudioId(req);
      const { projectId } = req.params as { projectId: string };
      const crew = await CrewAssignmentService.getCrewAssignments(studioId, projectId);
      return reply.send({ success: true, data: crew });
    } catch (err: any) {
      return reply.status(400).send({ success: false, error: err.message });
    }
  }

  static async removeCrew(req: FastifyRequest, reply: FastifyReply) {
    try {
      const studioId = ProductionController.getStudioId(req);
      const { assignmentId } = req.params as { assignmentId: string };
      await CrewAssignmentService.removeCrewMember(studioId, assignmentId);
      return reply.send({ success: true, message: 'Crew assignment removed' });
    } catch (err: any) {
      return reply.status(400).send({ success: false, error: err.message });
    }
  }

  // --- Equipment Checklist ---
  static async assignEquipment(req: FastifyRequest, reply: FastifyReply) {
    try {
      const studioId = ProductionController.getStudioId(req);
      const { projectId } = req.params as { projectId: string };
      const item = await EquipmentChecklistService.assignEquipment(studioId, projectId, req.body as any);
      return reply.send({ success: true, data: item });
    } catch (err: any) {
      return reply.status(400).send({ success: false, error: err.message });
    }
  }

  static async updateEquipment(req: FastifyRequest, reply: FastifyReply) {
    try {
      const studioId = ProductionController.getStudioId(req);
      const { itemId } = req.params as { itemId: string };
      const item = await EquipmentChecklistService.updateEquipment(studioId, itemId, req.body as any);
      return reply.send({ success: true, data: item });
    } catch (err: any) {
      return reply.status(400).send({ success: false, error: err.message });
    }
  }

  static async getEquipment(req: FastifyRequest, reply: FastifyReply) {
    try {
      const studioId = ProductionController.getStudioId(req);
      const { projectId } = req.params as { projectId: string };
      const items = await EquipmentChecklistService.getEquipmentList(studioId, projectId);
      return reply.send({ success: true, data: items });
    } catch (err: any) {
      return reply.status(400).send({ success: false, error: err.message });
    }
  }

  static async batchUpdateEquipment(req: FastifyRequest, reply: FastifyReply) {
    try {
      const studioId = ProductionController.getStudioId(req);
      const { projectId } = req.params as { projectId: string };
      const { itemIds, action } = req.body as any;
      const items = await EquipmentChecklistService.batchUpdateEquipmentStatus(studioId, projectId, itemIds, action);
      return reply.send({ success: true, data: items });
    } catch (err: any) {
      return reply.status(400).send({ success: false, error: err.message });
    }
  }

  static async removeEquipment(req: FastifyRequest, reply: FastifyReply) {
    try {
      const studioId = ProductionController.getStudioId(req);
      const { itemId } = req.params as { itemId: string };
      await EquipmentChecklistService.removeEquipment(studioId, itemId);
      return reply.send({ success: true, message: 'Equipment item removed' });
    } catch (err: any) {
      return reply.status(400).send({ success: false, error: err.message });
    }
  }

  // --- Production Checklists ---
  static async createChecklist(req: FastifyRequest, reply: FastifyReply) {
    try {
      const studioId = ProductionController.getStudioId(req);
      const { projectId } = req.params as { projectId: string };
      const checklist = await ProductionChecklistService.createChecklist(studioId, projectId, req.body as any);
      return reply.send({ success: true, data: checklist });
    } catch (err: any) {
      return reply.status(400).send({ success: false, error: err.message });
    }
  }

  static async generateChecklistTemplate(req: FastifyRequest, reply: FastifyReply) {
    try {
      const studioId = ProductionController.getStudioId(req);
      const { projectId } = req.params as { projectId: string };
      const { templateType } = (req.body as any) || {};
      const checklists = await ProductionChecklistService.generateChecklistsFromTemplate(studioId, projectId, templateType);
      return reply.send({ success: true, data: checklists });
    } catch (err: any) {
      return reply.status(400).send({ success: false, error: err.message });
    }
  }

  static async updateChecklistItem(req: FastifyRequest, reply: FastifyReply) {
    try {
      const studioId = ProductionController.getStudioId(req);
      const { itemId } = req.params as { itemId: string };
      await ProductionChecklistService.updateChecklistItem(studioId, itemId, req.body as any);
      return reply.send({ success: true, message: 'Checklist item updated' });
    } catch (err: any) {
      return reply.status(400).send({ success: false, error: err.message });
    }
  }

  static async getChecklists(req: FastifyRequest, reply: FastifyReply) {
    try {
      const studioId = ProductionController.getStudioId(req);
      const { projectId } = req.params as { projectId: string };
      const checklists = await ProductionChecklistService.getChecklists(studioId, projectId);
      return reply.send({ success: true, data: checklists });
    } catch (err: any) {
      return reply.status(400).send({ success: false, error: err.message });
    }
  }

  // --- Shot Lists ---
  static async createShotList(req: FastifyRequest, reply: FastifyReply) {
    try {
      const studioId = ProductionController.getStudioId(req);
      const { projectId } = req.params as { projectId: string };
      const shotList = await ShotListService.createShotList(studioId, projectId, req.body as any);
      return reply.send({ success: true, data: shotList });
    } catch (err: any) {
      return reply.status(400).send({ success: false, error: err.message });
    }
  }

  static async addShotItem(req: FastifyRequest, reply: FastifyReply) {
    try {
      const studioId = ProductionController.getStudioId(req);
      const { shotListId } = req.params as { shotListId: string };
      const item = await ShotListService.addShotItem(studioId, shotListId, req.body as any);
      return reply.send({ success: true, data: item });
    } catch (err: any) {
      return reply.status(400).send({ success: false, error: err.message });
    }
  }

  static async updateShotItem(req: FastifyRequest, reply: FastifyReply) {
    try {
      const studioId = ProductionController.getStudioId(req);
      const { itemId } = req.params as { itemId: string };
      const item = await ShotListService.updateShotItem(studioId, itemId, req.body as any);
      return reply.send({ success: true, data: item });
    } catch (err: any) {
      return reply.status(400).send({ success: false, error: err.message });
    }
  }

  static async generateWeddingTemplate(req: FastifyRequest, reply: FastifyReply) {
    try {
      const studioId = ProductionController.getStudioId(req);
      const { projectId } = req.params as { projectId: string };
      const { partnerAName, partnerBName } = (req.body as any) || {};
      const shotList = await ShotListService.generateWeddingFamilyTemplate(studioId, projectId, partnerAName, partnerBName);
      return reply.send({ success: true, data: shotList });
    } catch (err: any) {
      return reply.status(400).send({ success: false, error: err.message });
    }
  }

  static async getShotLists(req: FastifyRequest, reply: FastifyReply) {
    try {
      const studioId = ProductionController.getStudioId(req);
      const { projectId } = req.params as { projectId: string };
      const lists = await ShotListService.getShotLists(studioId, projectId);
      return reply.send({ success: true, data: lists });
    } catch (err: any) {
      return reply.status(400).send({ success: false, error: err.message });
    }
  }

  // --- Questionnaires ---
  static async createQuestionnaire(req: FastifyRequest, reply: FastifyReply) {
    try {
      const studioId = ProductionController.getStudioId(req);
      const { projectId } = req.params as { projectId: string };
      const result = await QuestionnaireService.createQuestionnaire(studioId, projectId, req.body as any);
      return reply.send({ success: true, data: result });
    } catch (err: any) {
      return reply.status(400).send({ success: false, error: err.message });
    }
  }

  static async getPublicQuestionnaire(req: FastifyRequest, reply: FastifyReply) {
    try {
      const { token } = req.params as { token: string };
      const questionnaire = await QuestionnaireService.getQuestionnaireByToken(token);
      return reply.send({ success: true, data: questionnaire });
    } catch (err: any) {
      return reply.status(400).send({ success: false, error: err.message });
    }
  }

  static async submitPublicAnswers(req: FastifyRequest, reply: FastifyReply) {
    try {
      const { token } = req.params as { token: string };
      const updated = await QuestionnaireService.submitAnswers(token, req.body as any);
      return reply.send({ success: true, data: updated });
    } catch (err: any) {
      return reply.status(400).send({ success: false, error: err.message });
    }
  }

  static async getProjectQuestionnaires(req: FastifyRequest, reply: FastifyReply) {
    try {
      const studioId = ProductionController.getStudioId(req);
      const { projectId } = req.params as { projectId: string };
      const questionnaires = await QuestionnaireService.getQuestionnairesByProject(studioId, projectId);
      return reply.send({ success: true, data: questionnaires });
    } catch (err: any) {
      return reply.status(400).send({ success: false, error: err.message });
    }
  }

  // --- Timeline ---
  static async addTimelineItem(req: FastifyRequest, reply: FastifyReply) {
    try {
      const studioId = ProductionController.getStudioId(req);
      const { projectId } = req.params as { projectId: string };
      const item = await ShootTimelineService.addTimelineItem(studioId, projectId, req.body as any);
      return reply.send({ success: true, data: item });
    } catch (err: any) {
      return reply.status(400).send({ success: false, error: err.message });
    }
  }

  static async updateTimelineItem(req: FastifyRequest, reply: FastifyReply) {
    try {
      const studioId = ProductionController.getStudioId(req);
      const { itemId } = req.params as { itemId: string };
      const item = await ShootTimelineService.updateTimelineItem(studioId, itemId, req.body as any);
      return reply.send({ success: true, data: item });
    } catch (err: any) {
      return reply.status(400).send({ success: false, error: err.message });
    }
  }

  static async getTimeline(req: FastifyRequest, reply: FastifyReply) {
    try {
      const studioId = ProductionController.getStudioId(req);
      const { projectId } = req.params as { projectId: string };
      const items = await ShootTimelineService.getTimeline(studioId, projectId);
      return reply.send({ success: true, data: items });
    } catch (err: any) {
      return reply.status(400).send({ success: false, error: err.message });
    }
  }

  static async deleteTimelineItem(req: FastifyRequest, reply: FastifyReply) {
    try {
      const studioId = ProductionController.getStudioId(req);
      const { itemId } = req.params as { itemId: string };
      await ShootTimelineService.deleteTimelineItem(studioId, itemId);
      return reply.send({ success: true, message: 'Timeline item deleted' });
    } catch (err: any) {
      return reply.status(400).send({ success: false, error: err.message });
    }
  }

  // --- Media Handoff ---
  static async getMediaStatus(req: FastifyRequest, reply: FastifyReply) {
    try {
      const studioId = ProductionController.getStudioId(req);
      const { projectId } = req.params as { projectId: string };
      const status = await MediaHandoffService.getMediaProductionStatus(studioId, projectId);
      return reply.send({ success: true, data: status });
    } catch (err: any) {
      return reply.status(400).send({ success: false, error: err.message });
    }
  }

  static async recordMediaIngestion(req: FastifyRequest, reply: FastifyReply) {
    try {
      const studioId = ProductionController.getStudioId(req);
      const { projectId } = req.params as { projectId: string };
      const status = await MediaHandoffService.recordMediaIngestion(studioId, projectId, req.body as any);
      return reply.send({ success: true, data: status });
    } catch (err: any) {
      return reply.status(400).send({ success: false, error: err.message });
    }
  }

  static async recordCullingComplete(req: FastifyRequest, reply: FastifyReply) {
    try {
      const studioId = ProductionController.getStudioId(req);
      const { projectId } = req.params as { projectId: string };
      const { culledPhotoCount } = req.body as any;
      const status = await MediaHandoffService.recordCullingComplete(studioId, projectId, culledPhotoCount);
      return reply.send({ success: true, data: status });
    } catch (err: any) {
      return reply.status(400).send({ success: false, error: err.message });
    }
  }

  static async recordEditingComplete(req: FastifyRequest, reply: FastifyReply) {
    try {
      const studioId = ProductionController.getStudioId(req);
      const { projectId } = req.params as { projectId: string };
      const { finalPhotoCount } = req.body as any;
      const status = await MediaHandoffService.recordEditingComplete(studioId, projectId, finalPhotoCount);
      return reply.send({ success: true, data: status });
    } catch (err: any) {
      return reply.status(400).send({ success: false, error: err.message });
    }
  }

  static async handoffToGallery(req: FastifyRequest, reply: FastifyReply) {
    try {
      const studioId = ProductionController.getStudioId(req);
      const { projectId } = req.params as { projectId: string };
      const { galleryId } = (req.body as any) || {};
      const status = await MediaHandoffService.handoffToGallery(studioId, projectId, galleryId);
      return reply.send({ success: true, data: status });
    } catch (err: any) {
      return reply.status(400).send({ success: false, error: err.message });
    }
  }

  // --- Offline Sync ---
  static async processOfflineBatch(req: FastifyRequest, reply: FastifyReply) {
    try {
      const studioId = ProductionController.getStudioId(req);
      const { projectId } = req.params as { projectId: string };
      const result = await OfflineSyncService.processOfflineBatch(studioId, projectId, req.body as any);
      return reply.send({ success: true, data: result });
    } catch (err: any) {
      return reply.status(400).send({ success: false, error: err.message });
    }
  }
}
