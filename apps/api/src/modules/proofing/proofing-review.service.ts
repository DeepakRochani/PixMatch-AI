/**
 * Proofing Review Service — PixMatch AI Phase 25
 * Manages client submission validation, studio review decisions,
 * and downstream handoffs to Phase 24 Editing Queue & Phase 23 Production DAG.
 */

import { prisma } from '@pixmatch/database';
import {
  ProofingSessionStatus,
  ProofingItemStatus,
  ProofingReviewDecision,
  SubmitClientSelectionsDTO,
  ReviewProofingSelectionsDTO,
  PhotoProofingSessionDTO,
  PhotoProofingReviewDTO,
  EditJobStatus,
  AutomationTriggerType,
} from '@pixmatch/types';
import { ProofingSessionService } from './proofing-session.service.js';

export class ProofingReviewService {
  /**
   * Client submits their finalized selections for studio review.
   */
  public static async submitClientSelections(
    sessionId: string,
    data: SubmitClientSelectionsDTO
  ): Promise<PhotoProofingSessionDTO> {
    const session = await prisma.photoProofingSession.findUnique({
      where: { id: sessionId },
      include: {
        rules: true,
        items: true,
      },
    });

    if (!session) {
      throw new Error(`Proofing session '${sessionId}' not found.`);
    }

    if (
      session.status === ProofingSessionStatus.SUBMITTED ||
      session.status === ProofingSessionStatus.APPROVED
    ) {
      throw new Error('Selections have already been submitted.');
    }

    // Evaluate quota rules
    const quota = ProofingSessionService.calculateQuota(session.rules, session.items);

    if (!quota.is_min_met) {
      throw new Error(
        `Minimum selection requirement not met. Selected ${quota.selected_count}, minimum required is ${quota.min_selections}.`
      );
    }

    if (quota.is_max_exceeded) {
      throw new Error(
        `Maximum selection limit exceeded (${quota.selected_count} > ${quota.max_selections}) and extra selections are disabled.`
      );
    }

    if (quota.extra_count > 0 && !data.confirm_extra_charges) {
      throw new Error(
        `You have selected ${quota.extra_count} extra photos beyond the included ${quota.included_count}. Please confirm the extra charge of ${quota.formatted_extra_total}.`
      );
    }

    // Update session status to SUBMITTED
    const updated = await prisma.photoProofingSession.update({
      where: { id: sessionId },
      data: {
        status: ProofingSessionStatus.SUBMITTED,
        submitted_at: new Date(),
        audit_logs: {
          create: {
            action: 'SELECTIONS_SUBMITTED',
            actor_type: 'CLIENT',
            actor_name: data.client_name || 'Client',
            payload: {
              client_email: data.client_email,
              selected_count: quota.selected_count,
              extra_count: quota.extra_count,
              extra_total_cents: quota.extra_total_cents,
              notes: data.final_notes,
            },
          },
        },
      },
      include: {
        rules: true,
        items: {
          include: {
            photo: {
              select: {
                id: true,
                gallery_id: true,
                original_filename: true,
                thumbnail_url: true,
                original_url: true,
              },
            },
          },
        },
        gallery: true,
        client: true,
        project: true,
      },
    });

    // Check for automation triggers / dispatch notifications if configured
    try {
      const automations = await prisma.automationRule.findMany({
        where: {
          studio_id: session.studio_id,
          trigger_type: AutomationTriggerType.PROOFING_SELECTIONS_SUBMITTED as any,
          is_active: true,
        },
      });

      for (const rule of automations) {
        await prisma.automationRun.create({
          data: {
            studio_id: session.studio_id,
            rule_id: rule.id,
            trigger_type: AutomationTriggerType.PROOFING_SELECTIONS_SUBMITTED as any,
            status: 'COMPLETED',
            logs: {
              session_id: session.id,
              client_name: data.client_name,
              selected_count: quota.selected_count,
            },
          },
        });
      }
    } catch {
      // Non-blocking automation handler
    }

    return (await ProofingSessionService.getSessionById(sessionId, session.studio_id))!;
  }

  /**
   * Studio / Photographer reviews client selections and makes a decision.
   */
  public static async reviewSelections(
    sessionId: string,
    studioId: string,
    userId: string,
    data: ReviewProofingSelectionsDTO
  ): Promise<PhotoProofingReviewDTO> {
    const session = await prisma.photoProofingSession.findFirst({
      where: { id: sessionId, studio_id: studioId },
      include: {
        items: {
          where: { status: ProofingItemStatus.SELECTED },
          include: { photo: true },
        },
        rules: true,
      },
    });

    if (!session) {
      throw new Error(`Session '${sessionId}' not found.`);
    }

    let newStatus: ProofingSessionStatus = session.status as ProofingSessionStatus;
    const editJobIds: string[] = [];
    const actionSummary: any = {
      decision: data.decision,
      selected_photos_count: session.items.length,
    };

    if (data.decision === ProofingReviewDecision.APPROVED_FOR_EDITING) {
      newStatus = ProofingSessionStatus.APPROVED;

      // Automatically create Phase 24 PhotoEditJob entries for approved photos
      if (data.auto_create_edit_jobs !== false) {
        for (const item of session.items) {
          // Check if edit job already exists
          let editJob = await prisma.photoEditJob.findFirst({
            where: {
              studio_id: studioId,
              photo_id: item.photo_id,
              gallery_id: session.gallery_id,
            },
          });

          if (!editJob) {
            editJob = await prisma.photoEditJob.create({
              data: {
                studio_id: studioId,
                gallery_id: session.gallery_id,
                project_id: session.project_id || null,
                photo_id: item.photo_id,
                status: EditJobStatus.QUEUED,
                priority: 'HIGH',
              },
            });
          }

          editJobIds.push(editJob.id);
        }

        actionSummary.created_edit_jobs_count = editJobIds.length;
      }

      // Advance Phase 23 Production stage if project_id is linked
      if (data.advance_production_stage !== false && session.project_id) {
        try {
          const production = await prisma.projectProduction.findUnique({
            where: { project_id: session.project_id },
          });

          if (production && production.current_stage === 'CLIENT_PROOFING') {
            await prisma.projectProduction.update({
              where: { project_id: session.project_id },
              data: {
                current_stage: 'POST_PRODUCTION',
                editing_progress: 10,
              },
            });
            actionSummary.advanced_production_stage = 'POST_PRODUCTION';
          }
        } catch {
          // Production stage advance non-blocking
        }
      }
    } else if (data.decision === ProofingReviewDecision.REVISION_REQUIRED) {
      newStatus = ProofingSessionStatus.CHANGES_REQUESTED;
    } else if (data.decision === ProofingReviewDecision.DIRECT_FULFILLMENT) {
      newStatus = ProofingSessionStatus.APPROVED;
    } else if (data.decision === ProofingReviewDecision.REJECTED) {
      newStatus = ProofingSessionStatus.CANCELLED;
    }

    // Update Session status
    await prisma.photoProofingSession.update({
      where: { id: sessionId },
      data: {
        status: newStatus,
        completed_at: newStatus === ProofingSessionStatus.APPROVED ? new Date() : null,
        audit_logs: {
          create: {
            action: 'REVIEW_DECISION_RECORDED',
            actor_type: 'PHOTOGRAPHER',
            actor_id: userId,
            payload: {
              decision: data.decision,
              notes: data.feedback_notes,
              edit_jobs_count: editJobIds.length,
            },
          },
        },
      },
    });

    // Record review entity
    const review = await prisma.photoProofingReview.create({
      data: {
        session_id: sessionId,
        reviewed_by: userId,
        decision: data.decision,
        feedback_notes: data.feedback_notes || null,
        action_summary: actionSummary,
        edit_job_ids: editJobIds,
      },
    });

    return review as any;
  }
}
