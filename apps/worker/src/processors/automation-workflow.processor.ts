/**
 * Automation Workflow Processor — PIXMatch AI Phase 16
 * Executes asynchronous background workflow progression jobs idempotently.
 */

import { Job } from 'bullmq';
import { prisma } from '@pixmatch/database';
import { AutomationEngineService } from '../../../api/src/modules/automation/automation-engine.service.js';

export interface AutomationWorkflowJobData {
  runId: string;
  studioId: string;
  workflowId: string;
  galleryId?: string | null;
  stepId?: string | null;
  userId?: string;
}

export async function processAutomationWorkflow(job: Job<AutomationWorkflowJobData>): Promise<{
  success: boolean;
  runId: string;
  studioId: string;
}> {
  const { runId, studioId, workflowId, galleryId, userId } = job.data;
  console.log(`[Worker] Executing automation workflow run ${runId} for studio ${studioId} (Job ${job.id})`);

  const engine = new AutomationEngineService(prisma);

  // Progress the workflow DAG idempotently
  await engine.progressWorkflowRun(runId, studioId, undefined, userId);

  return {
    success: true,
    runId,
    studioId,
  };
}
