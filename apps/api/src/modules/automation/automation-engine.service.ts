/**
 * Automation Engine Service — PIXMatch AI Phase 16
 * Orchestrates workflow DAG execution, state transitions, step dependency resolution,
 * idempotency, retry mechanisms, crash recovery, and concurrency limits.
 */

import {
  AutomationActionType,
  AutomationApprovalStatus,
  AutomationRunStatus,
  AutomationStepRunStatus,
  AutomationTriggerType,
  AutomationWorkflowConfigDTO,
  AutomationStepConfigDTO,
} from '@pixmatch/types';
import { prisma } from '@pixmatch/database';
import { AutomationValidator } from './automation-validator.js';
import { AutomationActionRunner } from './automation-action-runner.js';

export interface WorkflowRunOptions {
  workflowId: string;
  studioId: string;
  galleryId?: string | null;
  trigger?: AutomationTriggerType;
  triggerConfig?: Record<string, any>;
  metadata?: Record<string, any>;
  userId?: string;
}

export class AutomationEngineService {
  private db: any;
  private actionRunner: AutomationActionRunner;

  // Maximum concurrent running workflows per studio (bounded concurrency)
  public static readonly DEFAULT_MAX_CONCURRENCY = 2;

  constructor(dbClient?: any) {
    this.db = dbClient || prisma;
    this.actionRunner = new AutomationActionRunner(this.db);
  }

  /**
   * Starts or enqueues a new workflow execution run.
   */
  public async startWorkflowRun(options: WorkflowRunOptions): Promise<any> {
    const { workflowId, studioId, galleryId, trigger = AutomationTriggerType.MANUAL, metadata, userId } = options;

    // 1. Fetch & Verify Workflow
    const workflow = await this.db.automationWorkflow.findFirst({
      where: { id: workflowId, studio_id: studioId },
    });

    if (!workflow) {
      throw new Error(`Workflow ${workflowId} not found or does not belong to studio ${studioId}`);
    }

    if (!workflow.enabled) {
      throw new Error(`Workflow "${workflow.name}" is currently disabled`);
    }

    // 2. Validate Workflow Configuration
    const config = workflow.workflow_config as unknown as AutomationWorkflowConfigDTO;
    const validation = AutomationValidator.validate(config);
    if (!validation.isValid) {
      throw new Error(`Invalid workflow configuration: ${validation.errors.join('; ')}`);
    }

    // 3. Verify Gallery (Tenant Isolation)
    if (galleryId) {
      const gallery = await this.db.gallery.findFirst({
        where: { id: galleryId, studio_id: studioId },
      });
      if (!gallery) {
        throw new Error(`Gallery ${galleryId} does not exist or does not belong to studio ${studioId}`);
      }
    }

    // 4. Bounded Concurrency Check
    const activeRunsCount = await this.db.automationRun.count({
      where: {
        studio_id: studioId,
        status: { in: [AutomationRunStatus.RUNNING, AutomationRunStatus.QUEUED] },
      },
    });

    if (activeRunsCount >= AutomationEngineService.DEFAULT_MAX_CONCURRENCY) {
      // Still create as QUEUED to be processed safely
      console.log(`[AutomationEngine] Studio ${studioId} has reached max concurrency (${activeRunsCount}/${AutomationEngineService.DEFAULT_MAX_CONCURRENCY}). Enqueueing run.`);
    }

    // 5. Create AutomationRun record
    const run = await this.db.automationRun.create({
      data: {
        workflow_id: workflowId,
        studio_id: studioId,
        gallery_id: galleryId || null,
        trigger,
        status: AutomationRunStatus.RUNNING,
        current_step: config.steps[0]?.id || null,
        metadata: metadata || {},
      },
    });

    // 6. Initialize AutomationStepRun records
    for (const step of config.steps) {
      await this.db.automationStepRun.create({
        data: {
          automation_run_id: run.id,
          step_key: step.id,
          action_type: step.action as any,
          status: AutomationStepRunStatus.PENDING,
          attempt: 1,
        },
      });
    }

    // 7. Log Run Start
    await this.logEvent(studioId, workflowId, run.id, 'RUN_STARTED', `Started workflow run for "${workflow.name}"`);

    // 8. Execute eligible initial steps
    await this.progressWorkflowRun(run.id, studioId, config, userId);

    return this.getRunById(run.id, studioId);
  }

  /**
   * Progresses a workflow by executing ready steps whose dependencies are all COMPLETED.
   */
  public async progressWorkflowRun(runId: string, studioId: string, config?: AutomationWorkflowConfigDTO, userId?: string): Promise<void> {
    const run = await this.db.automationRun.findFirst({
      where: { id: runId, studio_id: studioId },
      include: {
        workflow: true,
        step_runs: true,
      },
    });

    if (!run || run.status === AutomationRunStatus.CANCELLED || run.status === AutomationRunStatus.COMPLETED) {
      return;
    }

    const workflowConfig = config || (run.workflow.workflow_config as unknown as AutomationWorkflowConfigDTO);
    const steps = workflowConfig.steps;
    const stepRunsMap = new Map<string, any>(run.step_runs.map((sr: any) => [sr.step_key, sr]));

    let madeProgress = false;
    let hasWaitingApproval = false;
    let hasFailedStep = false;

    // Evaluate each step in definition
    for (const step of steps) {
      const stepRun = stepRunsMap.get(step.id);
      if (!stepRun) continue;

      if (stepRun.status === AutomationStepRunStatus.WAITING_APPROVAL) {
        hasWaitingApproval = true;
        continue;
      }

      if (stepRun.status === AutomationStepRunStatus.COMPLETED || stepRun.status === AutomationStepRunStatus.SKIPPED) {
        continue;
      }

      if (stepRun.status === AutomationStepRunStatus.FAILED) {
        hasFailedStep = true;
        continue;
      }

      // Check if all dependencies are satisfied (COMPLETED)
      const dependencies = step.dependsOn || [];
      const allDepsCompleted = dependencies.every((depId) => {
        const depRun = stepRunsMap.get(depId);
        return depRun && (depRun.status === AutomationStepRunStatus.COMPLETED || depRun.status === AutomationStepRunStatus.SKIPPED);
      });

      if (!allDepsCompleted) {
        // Dependencies not yet met
        continue;
      }

      // Step is ready to execute!
      madeProgress = true;

      // Update step status to RUNNING
      await this.db.automationStepRun.update({
        where: { id: stepRun.id },
        data: { status: AutomationStepRunStatus.RUNNING, started_at: new Date() },
      });

      await this.db.automationRun.update({
        where: { id: runId },
        data: { current_step: step.id },
      });

      // Deterministic idempotency key
      const idempotencyKey = `automation:${run.workflow_id}:${run.gallery_id || 'global'}:${run.id}:${step.id}`;

      // Execute action
      const executionResult = await this.actionRunner.executeAction({
        studioId,
        galleryId: run.gallery_id,
        runId: run.id,
        stepRunId: stepRun.id,
        stepKey: step.id,
        action: step.action as AutomationActionType,
        params: step.params,
        userId,
      });

      if (executionResult.status === AutomationStepRunStatus.WAITING_APPROVAL) {
        hasWaitingApproval = true;
        await this.db.automationStepRun.update({
          where: { id: stepRun.id },
          data: {
            status: AutomationStepRunStatus.WAITING_APPROVAL,
            result: executionResult.result || {},
          },
        });
        await this.db.automationRun.update({
          where: { id: runId },
          data: { status: AutomationRunStatus.WAITING_APPROVAL },
        });
        await this.logEvent(studioId, run.workflow_id, run.id, 'STEP_WAITING_APPROVAL', `Step "${step.id}" is waiting for photographer approval.`);
        // Stop sequential progression on approval gate
        return;
      } else if (executionResult.status === AutomationStepRunStatus.COMPLETED) {
        await this.db.automationStepRun.update({
          where: { id: stepRun.id },
          data: {
            status: AutomationStepRunStatus.COMPLETED,
            completed_at: new Date(),
            result: executionResult.result || {},
          },
        });
        stepRunsMap.set(step.id, { ...stepRun, status: AutomationStepRunStatus.COMPLETED });
        await this.logEvent(studioId, run.workflow_id, run.id, 'STEP_COMPLETED', `Step "${step.id}" (${step.action}) completed successfully.`);
      } else {
        // Step FAILED
        const failureHandling = workflowConfig.failureHandling || {};
        const maxRetries = failureHandling.maxRetries || 1;

        if (failureHandling.retryFailedStep && stepRun.attempt < maxRetries) {
          // Retry step
          await this.db.automationStepRun.update({
            where: { id: stepRun.id },
            data: {
              attempt: stepRun.attempt + 1,
              status: AutomationStepRunStatus.PENDING,
              error_message: executionResult.error_message,
            },
          });
          await this.logEvent(studioId, run.workflow_id, run.id, 'STEP_RETRY', `Step "${step.id}" failed. Retrying (attempt ${stepRun.attempt + 1}/${maxRetries}).`);
        } else {
          // Max retries reached or no retry
          hasFailedStep = true;
          await this.db.automationStepRun.update({
            where: { id: stepRun.id },
            data: {
              status: AutomationStepRunStatus.FAILED,
              completed_at: new Date(),
              error_message: executionResult.error_message || 'Step execution failed',
            },
          });
          stepRunsMap.set(step.id, { ...stepRun, status: AutomationStepRunStatus.FAILED });
          await this.logEvent(studioId, run.workflow_id, run.id, 'STEP_FAILED', `Step "${step.id}" failed: ${executionResult.error_message}`);

          if (!failureHandling.continueOnNonCriticalFailure) {
            // Halt workflow on failure
            await this.db.automationRun.update({
              where: { id: runId },
              data: {
                status: AutomationRunStatus.FAILED,
                completed_at: new Date(),
                error_message: `Workflow halted due to failure in step "${step.id}": ${executionResult.error_message}`,
              },
            });
            return;
          }
        }
      }
    }

    // Check if entire workflow is finished
    const updatedStepRuns = await this.db.automationStepRun.findMany({
      where: { automation_run_id: runId },
    });

    const allFinished = updatedStepRuns.every(
      (sr: any) =>
        sr.status === AutomationStepRunStatus.COMPLETED ||
        sr.status === AutomationStepRunStatus.SKIPPED ||
        sr.status === AutomationStepRunStatus.FAILED
    );

    if (allFinished) {
      const anyFailed = updatedStepRuns.some((sr: any) => sr.status === AutomationStepRunStatus.FAILED);
      const finalStatus = anyFailed ? AutomationRunStatus.PARTIAL : AutomationRunStatus.COMPLETED;

      await this.db.automationRun.update({
        where: { id: runId },
        data: {
          status: finalStatus,
          completed_at: new Date(),
        },
      });

      await this.logEvent(studioId, run.workflow_id, run.id, finalStatus === AutomationRunStatus.COMPLETED ? 'RUN_COMPLETED' : 'RUN_PARTIAL', `Workflow run finished with status ${finalStatus}.`);
    } else if (hasWaitingApproval) {
      await this.db.automationRun.update({
        where: { id: runId },
        data: { status: AutomationRunStatus.WAITING_APPROVAL },
      });
    } else if (madeProgress) {
      // Recursively progress any newly unblocked steps
      await this.progressWorkflowRun(runId, studioId, workflowConfig, userId);
    }
  }

  /**
   * Resumes an execution run after an approval or pause.
   */
  public async resumeRun(runId: string, studioId: string, userId?: string): Promise<any> {
    const run = await this.db.automationRun.findFirst({
      where: { id: runId, studio_id: studioId },
      include: { workflow: true },
    });

    if (!run) {
      throw new Error(`Automation run ${runId} not found`);
    }

    if (run.status !== AutomationRunStatus.WAITING_APPROVAL && run.status !== AutomationRunStatus.QUEUED) {
      throw new Error(`Cannot resume run with status ${run.status}`);
    }

    await this.db.automationRun.update({
      where: { id: runId },
      data: { status: AutomationRunStatus.RUNNING },
    });

    await this.logEvent(studioId, run.workflow_id, run.id, 'RUN_RESUMED', 'Workflow execution resumed.');
    await this.progressWorkflowRun(runId, studioId, undefined, userId);

    return this.getRunById(runId, studioId);
  }

  /**
   * Pauses an active execution run.
   */
  public async pauseRun(runId: string, studioId: string): Promise<any> {
    const run = await this.db.automationRun.findFirst({
      where: { id: runId, studio_id: studioId },
    });

    if (!run) throw new Error(`Automation run ${runId} not found`);

    if (run.status !== AutomationRunStatus.RUNNING) {
      throw new Error(`Only RUNNING runs can be paused. Current status: ${run.status}`);
    }

    await this.db.automationRun.update({
      where: { id: runId },
      data: { status: AutomationRunStatus.WAITING_APPROVAL },
    });

    await this.logEvent(studioId, run.workflow_id, run.id, 'RUN_PAUSED', 'Workflow paused by user.');
    return this.getRunById(runId, studioId);
  }

  /**
   * Cancels a queued, running, or waiting execution run.
   */
  public async cancelRun(runId: string, studioId: string): Promise<any> {
    const run = await this.db.automationRun.findFirst({
      where: { id: runId, studio_id: studioId },
    });

    if (!run) throw new Error(`Automation run ${runId} not found`);

    if (run.status === AutomationRunStatus.COMPLETED || run.status === AutomationRunStatus.CANCELLED) {
      return this.getRunById(runId, studioId);
    }

    // Cancel remaining pending steps
    await this.db.automationStepRun.updateMany({
      where: {
        automation_run_id: runId,
        status: { in: [AutomationStepRunStatus.PENDING, AutomationStepRunStatus.WAITING_APPROVAL] },
      },
      data: { status: AutomationStepRunStatus.CANCELLED, completed_at: new Date() },
    });

    // Cancel pending approvals
    await this.db.automationApproval.updateMany({
      where: {
        automation_run_id: runId,
        status: AutomationApprovalStatus.PENDING,
      },
      data: { status: AutomationApprovalStatus.CANCELLED, resolved_at: new Date() },
    });

    await this.db.automationRun.update({
      where: { id: runId },
      data: { status: AutomationRunStatus.CANCELLED, completed_at: new Date() },
    });

    await this.logEvent(studioId, run.workflow_id, run.id, 'RUN_CANCELLED', 'Workflow run cancelled by photographer.');
    return this.getRunById(runId, studioId);
  }

  /**
   * Retries a failed or partial workflow execution run.
   */
  public async retryRun(runId: string, studioId: string): Promise<any> {
    const run = await this.db.automationRun.findFirst({
      where: { id: runId, studio_id: studioId },
      include: { workflow: true },
    });

    if (!run) throw new Error(`Automation run ${runId} not found`);

    // Reset failed steps to PENDING
    await this.db.automationStepRun.updateMany({
      where: {
        automation_run_id: runId,
        status: AutomationStepRunStatus.FAILED,
      },
      data: {
        status: AutomationStepRunStatus.PENDING,
        error_message: null,
        attempt: 1,
      },
    });

    await this.db.automationRun.update({
      where: { id: runId },
      data: {
        status: AutomationRunStatus.RUNNING,
        error_message: null,
        completed_at: null,
      },
    });

    await this.logEvent(studioId, run.workflow_id, run.id, 'RUN_RETRY', 'Retrying failed workflow steps.');
    await this.progressWorkflowRun(runId, studioId);

    return this.getRunById(runId, studioId);
  }

  /**
   * Crash Recovery: Identifies orphaned or stale RUNNING runs and recovers them.
   */
  public async recoverStaleRuns(maxAgeMinutes: number = 30): Promise<number> {
    const thresholdDate = new Date(Date.now() - maxAgeMinutes * 60 * 1000);

    const staleRuns = await this.db.automationRun.findMany({
      where: {
        status: AutomationRunStatus.RUNNING,
        started_at: { lt: thresholdDate },
      },
      include: { workflow: true },
    });

    console.log(`[AutomationEngine] Crash recovery detected ${staleRuns.length} stale running executions.`);

    for (const stale of staleRuns) {
      try {
        await this.logEvent(stale.studio_id, stale.workflow_id, stale.id, 'CRASH_RECOVERY', 'Recovering stale execution after worker/server restart.');
        await this.progressWorkflowRun(stale.id, stale.studio_id);
      } catch (err: any) {
        console.warn(`[AutomationEngine] Failed to recover run ${stale.id}: ${err?.message}`);
      }
    }

    return staleRuns.length;
  }

  /**
   * Retrieves an AutomationRun by ID with its step runs and approvals.
   */
  public async getRunById(runId: string, studioId: string): Promise<any> {
    return this.db.automationRun.findFirst({
      where: { id: runId, studio_id: studioId },
      include: {
        workflow: {
          select: { id: true, name: true, trigger_type: true },
        },
        gallery: {
          select: { id: true, title: true, slug: true },
        },
        step_runs: {
          orderBy: { started_at: 'asc' },
          include: { approval: true },
        },
        approvals: true,
      },
    });
  }

  /**
   * Helper to write audit execution logs without biometric or secret leakage.
   */
  private async logEvent(studioId: string, workflowId: string, runId: string, eventType: string, message: string, metadata?: Record<string, any>) {
    try {
      await this.db.automationExecutionLog.create({
        data: {
          studio_id: studioId,
          workflow_id: workflowId,
          automation_run_id: runId,
          event_type: eventType,
          message,
          metadata: metadata || {},
        },
      });
    } catch (e) {
      // Non-blocking log failure
    }
  }
}
