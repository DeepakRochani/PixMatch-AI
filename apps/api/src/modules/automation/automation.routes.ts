/**
 * Automation Routes — PIXMatch AI Phase 16
 * Registers Fastify endpoints for Automation Center, Workflows, Runs, Approvals, and Templates.
 */

import { FastifyInstance } from 'fastify';
import { AutomationController } from './automation.controller.js';
import { authenticate } from '../../middlewares/auth.js';

export async function automationRoutes(app: FastifyInstance) {
  // All Automation endpoints require studio authentication
  app.addHook('onRequest', authenticate);

  // Workflow CRUD & Actions
  app.get('/workflows', AutomationController.listWorkflows);
  app.post('/workflows', AutomationController.createWorkflow);
  app.get('/workflows/:id', AutomationController.getWorkflow);
  app.patch('/workflows/:id', AutomationController.updateWorkflow);
  app.delete('/workflows/:id', AutomationController.deleteWorkflow);
  app.post('/workflows/:id/enable', AutomationController.enableWorkflow);
  app.post('/workflows/:id/disable', AutomationController.disableWorkflow);
  app.post('/workflows/:id/run', AutomationController.runWorkflow);
  app.post('/workflows/:id/duplicate', AutomationController.duplicateWorkflow);

  // Runs Execution & Lifecycle
  app.get('/runs', AutomationController.listRuns);
  app.get('/runs/:id', AutomationController.getRun);
  app.post('/runs/:id/pause', AutomationController.pauseRun);
  app.post('/runs/:id/resume', AutomationController.resumeRun);
  app.post('/runs/:id/cancel', AutomationController.cancelRun);
  app.post('/runs/:id/retry', AutomationController.retryRun);

  // Approvals Queue
  app.get('/approvals', AutomationController.listApprovals);
  app.post('/approvals/:id/approve', AutomationController.approveApproval);
  app.post('/approvals/:id/reject', AutomationController.rejectApproval);

  // Templates
  app.get('/templates', AutomationController.listTemplates);
  app.post('/templates/:id/use', AutomationController.useTemplate);

  // Gallery Automation & Bulk Run
  app.get('/galleries/:galleryId/automation', AutomationController.getGalleryAutomation);
  app.post('/galleries/:galleryId/automation/run', AutomationController.runGalleryAutomation);
  app.post('/bulk-run', AutomationController.bulkRun);

  // Telemetry
  app.get('/telemetry', AutomationController.getTelemetry);
}
