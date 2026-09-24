/**
 * Production Routes — PixMatch AI Phase 23
 * Defines authenticated production workspace endpoints and public questionnaire portal routes.
 */

import { FastifyInstance } from 'fastify';
import { authenticate } from '../../middlewares/auth.js';
import { ProductionController } from './production.controller.js';

export async function productionRoutes(app: FastifyInstance) {
  // -------------------------------------------------------------
  // PUBLIC CLIENT QUESTIONNAIRE ROUTES (Zero Auth Header, SHA-256 Hashed Tokens)
  // -------------------------------------------------------------
  app.get('/public/questionnaire/:token', ProductionController.getPublicQuestionnaire);
  app.post('/public/questionnaire/:token/submit', ProductionController.submitPublicAnswers);

  // -------------------------------------------------------------
  // AUTHENTICATED STUDIO PRODUCTION OPERATIONS
  // -------------------------------------------------------------
  app.register(async (authed) => {
    authed.addHook('onRequest', authenticate);

    // Studio Production Profile
    authed.get('/profile', ProductionController.getProfile);
    authed.put('/profile', ProductionController.updateProfile);

    // Studio Production Overview & Kanban
    authed.get('/kanban', ProductionController.getKanbanBoard);
    authed.get('/summary', ProductionController.getSummary);
    authed.get('/deadlines/upcoming', ProductionController.getUpcomingDeadlines);

    // Project Production Core & Lifecycle
    authed.get('/projects/:projectId', ProductionController.getProjectProduction);
    authed.post('/projects/:projectId/init', ProductionController.initProjectProduction);
    authed.post('/projects/:projectId/stage', ProductionController.transitionStage);
    authed.post('/projects/:projectId/start-shoot', ProductionController.startShoot);
    authed.post('/projects/:projectId/complete-shoot', ProductionController.completeShoot);
    authed.get('/projects/:projectId/health', ProductionController.getHealthScore);
    authed.get('/projects/:projectId/deadlines', ProductionController.getDeadlines);

    // Shoot Sessions
    authed.get('/projects/:projectId/sessions', ProductionController.getSessions);
    authed.post('/projects/:projectId/sessions', ProductionController.createSession);
    authed.put('/sessions/:sessionId', ProductionController.updateSession);
    authed.delete('/sessions/:sessionId', ProductionController.deleteSession);

    // Crew Assignments
    authed.get('/projects/:projectId/crew', ProductionController.getCrew);
    authed.post('/projects/:projectId/crew', ProductionController.assignCrew);
    authed.put('/crew/:assignmentId', ProductionController.updateCrew);
    authed.delete('/crew/:assignmentId', ProductionController.removeCrew);

    // Equipment Checklist
    authed.get('/projects/:projectId/equipment', ProductionController.getEquipment);
    authed.post('/projects/:projectId/equipment', ProductionController.assignEquipment);
    authed.put('/equipment/:itemId', ProductionController.updateEquipment);
    authed.post('/projects/:projectId/equipment/batch', ProductionController.batchUpdateEquipment);
    authed.delete('/equipment/:itemId', ProductionController.removeEquipment);

    // Production Checklists & Templates
    authed.get('/projects/:projectId/checklists', ProductionController.getChecklists);
    authed.post('/projects/:projectId/checklists', ProductionController.createChecklist);
    authed.post('/projects/:projectId/checklists/template', ProductionController.generateChecklistTemplate);
    authed.put('/checklists/items/:itemId', ProductionController.updateChecklistItem);

    // Shot Lists & Templates
    authed.get('/projects/:projectId/shot-lists', ProductionController.getShotLists);
    authed.post('/projects/:projectId/shot-lists', ProductionController.createShotList);
    authed.post('/shot-lists/:shotListId/items', ProductionController.addShotItem);
    authed.put('/shot-lists/items/:itemId', ProductionController.updateShotItem);
    authed.post('/projects/:projectId/shot-lists/wedding-template', ProductionController.generateWeddingTemplate);

    // Questionnaires (Studio Side)
    authed.get('/projects/:projectId/questionnaires', ProductionController.getProjectQuestionnaires);
    authed.post('/projects/:projectId/questionnaires', ProductionController.createQuestionnaire);

    // Shoot Timeline (Run of Show)
    authed.get('/projects/:projectId/timeline', ProductionController.getTimeline);
    authed.post('/projects/:projectId/timeline', ProductionController.addTimelineItem);
    authed.put('/timeline/:itemId', ProductionController.updateTimelineItem);
    authed.delete('/timeline/:itemId', ProductionController.deleteTimelineItem);

    // Media Ingestion & Handoff Pipeline
    authed.get('/projects/:projectId/media-status', ProductionController.getMediaStatus);
    authed.post('/projects/:projectId/media-ingestion', ProductionController.recordMediaIngestion);
    authed.post('/projects/:projectId/culling-complete', ProductionController.recordCullingComplete);
    authed.post('/projects/:projectId/editing-complete', ProductionController.recordEditingComplete);
    authed.post('/projects/:projectId/gallery-handoff', ProductionController.handoffToGallery);

    // Mobile Shoot Day Offline Sync
    authed.post('/projects/:projectId/offline-sync', ProductionController.processOfflineBatch);
  });
}
