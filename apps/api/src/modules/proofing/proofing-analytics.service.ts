/**
 * Proofing Analytics Service — PixMatch AI Phase 25
 * Aggregates client proofing metrics, extra revenue, turnaround times, and quota compliance.
 */

import { prisma } from '@pixmatch/database';
import {
  ProofingSessionStatus,
  ProofingItemStatus,
  ProofingSummaryDTO,
} from '@pixmatch/types';

export class ProofingAnalyticsService {
  /**
   * Get overall proofing performance summary for a studio.
   */
  public static async getStudioSummary(studioId: string): Promise<ProofingSummaryDTO> {
    const sessions = await prisma.photoProofingSession.findMany({
      where: { studio_id: studioId },
      include: {
        rules: true,
        items: true,
        reviews: true,
      },
    });

    const totalSessions = sessions.length;
    let activeSessions = 0;
    let submittedSessions = 0;
    let approvedSessions = 0;

    let totalSelectionsMade = 0;
    let totalFavoritesMarked = 0;
    let extraPhotosOrdered = 0;
    let extraRevenueCents = 0;

    let totalSubmissionTimeMs = 0;
    let submissionsWithTimeCount = 0;

    for (const session of sessions) {
      if (
        session.status === ProofingSessionStatus.ACTIVE ||
        session.status === ProofingSessionStatus.CLIENT_REVIEWING
      ) {
        activeSessions++;
      } else if (session.status === ProofingSessionStatus.SUBMITTED) {
        submittedSessions++;
      } else if (session.status === ProofingSessionStatus.APPROVED) {
        approvedSessions++;
      }

      const includedCount = session.rules?.included_count ?? 30;
      const extraPrice = session.rules?.extra_price_cents ?? 500;
      const allowExtras = session.rules?.allow_extras ?? true;

      let sessionSelectedCount = 0;
      for (const item of session.items) {
        if (item.status === ProofingItemStatus.SELECTED) {
          totalSelectionsMade++;
          sessionSelectedCount++;
        }
        if (item.is_favorite) {
          totalFavoritesMarked++;
        }
      }

      if (allowExtras && sessionSelectedCount > includedCount) {
        const extra = sessionSelectedCount - includedCount;
        extraPhotosOrdered += extra;
        extraRevenueCents += extra * extraPrice;
      }

      if (session.submitted_at) {
        const duration = new Date(session.submitted_at).getTime() - new Date(session.created_at).getTime();
        if (duration > 0) {
          totalSubmissionTimeMs += duration;
          submissionsWithTimeCount++;
        }
      }
    }

    const commentCount = await prisma.photoProofingComment.count({
      where: { session: { studio_id: studioId } },
    });

    const avgDays = submissionsWithTimeCount > 0
      ? Number((totalSubmissionTimeMs / (submissionsWithTimeCount * 1000 * 60 * 60 * 24)).toFixed(1))
      : 0;

    const complianceRate = totalSessions > 0
      ? Number((((submittedSessions + approvedSessions) / totalSessions) * 100).toFixed(1))
      : 100;

    const formattedRevenue = (extraRevenueCents / 100).toLocaleString('en-US', {
      style: 'currency',
      currency: 'USD',
    });

    return {
      total_sessions: totalSessions,
      active_sessions: activeSessions,
      submitted_sessions: submittedSessions,
      approved_sessions: approvedSessions,
      total_selections_made: totalSelectionsMade,
      total_favorites_marked: totalFavoritesMarked,
      total_comments_placed: commentCount,
      extra_photos_ordered: extraPhotosOrdered,
      extra_revenue_cents: extraRevenueCents,
      formatted_extra_revenue: formattedRevenue,
      avg_time_to_submission_days: avgDays,
      compliance_rate_percent: complianceRate,
    };
  }

  /**
   * Get proofing audit trail for a session.
   */
  public static async getSessionAuditLog(sessionId: string, studioId: string) {
    const session = await prisma.photoProofingSession.findFirst({
      where: { id: sessionId, studio_id: studioId },
    });

    if (!session) {
      throw new Error(`Session '${sessionId}' not found.`);
    }

    const logs = await prisma.photoProofingAuditLog.findMany({
      where: { session_id: sessionId },
      orderBy: { created_at: 'desc' },
    });

    return logs;
  }
}
