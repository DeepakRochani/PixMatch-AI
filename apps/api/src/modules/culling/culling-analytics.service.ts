import { prisma } from '@pixmatch/database';
import {
  CullingSummaryDTO,
  EditingSummaryDTO,
  ExportSummaryDTO,
  CullDecisionType,
  EditJobStatus,
  ExportJobStatus,
} from '@pixmatch/types';

export class CullingAnalyticsService {
  /**
   * Aggregate culling metrics for studio or gallery
   */
  static async getCullingSummary(studioId: string, galleryId?: string): Promise<CullingSummaryDTO> {
    const whereClause: any = { studio_id: studioId };
    if (galleryId) whereClause.gallery_id = galleryId;

    const [totalSessions, activeSessions, decisions, burstGroupsCount, duplicatePhotos] =
      await Promise.all([
        prisma.photoCullSession.count({ where: whereClause }),
        prisma.photoCullSession.count({
          where: { ...whereClause, status: 'IN_PROGRESS' },
        }),
        prisma.photoCullDecision.findMany({
          where: whereClause,
          select: { decision: true },
        }),
        prisma.photoBurstGroup.count({ where: whereClause }),
        prisma.photoAIAnalysis.count({
          where: { ...whereClause, duplicate_group_id: { not: null } },
        }),
      ]);

    const totalDecisions = decisions.length;
    const keepDecisions = decisions.filter(
      (d) => d.decision === CullDecisionType.PHOTOGRAPHER_KEEP || d.decision === CullDecisionType.AI_RECOMMENDED_KEEP
    ).length;
    const rejectDecisions = decisions.filter(
      (d) => d.decision === CullDecisionType.PHOTOGRAPHER_REJECT || d.decision === CullDecisionType.AI_RECOMMENDED_REJECT
    ).length;
    const maybeDecisions = decisions.filter(
      (d) => d.decision === CullDecisionType.PHOTOGRAPHER_MAYBE || d.decision === CullDecisionType.AI_RECOMMENDED_MAYBE
    ).length;

    const keepRate = totalDecisions > 0 ? Math.round((keepDecisions / totalDecisions) * 100) : 0;
    const rejectRate = totalDecisions > 0 ? Math.round((rejectDecisions / totalDecisions) * 100) : 0;
    const maybeRate = totalDecisions > 0 ? Math.round((maybeDecisions / totalDecisions) * 100) : 0;

    return {
      total_sessions: totalSessions,
      active_sessions: activeSessions,
      total_photos_culled: totalDecisions,
      keep_rate: keepRate,
      reject_rate: rejectRate,
      maybe_rate: maybeRate,
      burst_groups_count: burstGroupsCount,
      duplicates_detected_count: duplicatePhotos,
    };
  }

  /**
   * Aggregate editing queue metrics
   */
  static async getEditingSummary(studioId: string, galleryId?: string): Promise<EditingSummaryDTO> {
    const whereClause: any = { studio_id: studioId };
    if (galleryId) whereClause.gallery_id = galleryId;

    const [totalJobs, queuedJobs, processingJobs, aiSuggestedJobs, waitingApprovalJobs, completedJobs, presetsCount] =
      await Promise.all([
        prisma.photoEditJob.count({ where: whereClause }),
        prisma.photoEditJob.count({ where: { ...whereClause, status: EditJobStatus.QUEUED } }),
        prisma.photoEditJob.count({ where: { ...whereClause, status: EditJobStatus.PROCESSING } }),
        prisma.photoEditJob.count({ where: { ...whereClause, status: EditJobStatus.AI_SUGGESTED } }),
        prisma.photoEditJob.count({ where: { ...whereClause, status: EditJobStatus.WAITING_APPROVAL } }),
        prisma.photoEditJob.count({ where: { ...whereClause, status: EditJobStatus.COMPLETED } }),
        prisma.photoEditPreset.count({ where: { studio_id: studioId } }),
      ]);

    return {
      total_jobs: totalJobs,
      queued_jobs: queuedJobs,
      processing_jobs: processingJobs,
      ai_suggested_jobs: aiSuggestedJobs,
      waiting_approval_jobs: waitingApprovalJobs,
      completed_jobs: completedJobs,
      presets_count: presetsCount,
    };
  }

  /**
   * Aggregate export pipeline metrics
   */
  static async getExportSummary(studioId: string, galleryId?: string): Promise<ExportSummaryDTO> {
    const whereClause: any = { studio_id: studioId };
    if (galleryId) whereClause.gallery_id = galleryId;

    const [totalExports, completedExports, queuedExports, totalArtifacts, presetsCount] =
      await Promise.all([
        prisma.photoExportJob.count({ where: whereClause }),
        prisma.photoExportJob.count({ where: { ...whereClause, status: ExportJobStatus.COMPLETED } }),
        prisma.photoExportJob.count({ where: { ...whereClause, status: ExportJobStatus.QUEUED } }),
        prisma.photoExportArtifact.count({ where: { studio_id: studioId } }),
        prisma.photoExportPreset.count({ where: { studio_id: studioId } }),
      ]);

    return {
      total_export_jobs: totalExports,
      completed_export_jobs: completedExports,
      queued_export_jobs: queuedExports,
      total_artifacts_generated: totalArtifacts,
      presets_count: presetsCount,
    };
  }
}
