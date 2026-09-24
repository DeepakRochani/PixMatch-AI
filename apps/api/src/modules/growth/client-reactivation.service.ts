/**
 * Client Reactivation Service — PixMatch AI Phase 19
 * Identifies dormant past clients and calculates deterministic re-engagement priority.
 * Enforces strict suppression checks and provides transparent reasoning.
 */

import { prisma } from '@pixmatch/database';
import { ClientReactivationCandidateDTO, ReactivationCandidatesFilterDTO } from '@pixmatch/types';

export class ClientReactivationService {
  /**
   * Calculate deterministic 0-100 re-engagement score based purely on verified past activity.
   */
  static calculateReengagementScore(params: {
    daysInactive: number;
    pastGalleriesCount: number;
    recordedRevenue: number;
    engagementScore: number;
  }): { score: number; angle: string } {
    const { daysInactive, pastGalleriesCount, recordedRevenue, engagementScore } = params;

    let score = 0;

    // 1. Past galleries relationship depth (max 25 pts)
    if (pastGalleriesCount >= 3) score += 25;
    else if (pastGalleriesCount === 2) score += 18;
    else if (pastGalleriesCount === 1) score += 10;

    // 2. Historical revenue value (max 30 pts)
    if (recordedRevenue >= 100000) score += 30;
    else if (recordedRevenue >= 50000) score += 22;
    else if (recordedRevenue >= 20000) score += 15;
    else if (recordedRevenue > 0) score += 8;

    // 3. Past engagement responsiveness (max 25 pts)
    // engagementScore is 0-100 from Phase 17
    score += Math.min(25, Math.round(engagementScore * 0.25));

    // 4. Inactivity window sweet-spot (max 20 pts)
    // 90-180 days is the prime reactivation window (20 pts)
    // 181-365 days is moderate (12 pts)
    // > 365 days is cold (5 pts)
    if (daysInactive >= 90 && daysInactive <= 180) {
      score += 20;
    } else if (daysInactive > 180 && daysInactive <= 365) {
      score += 12;
    } else if (daysInactive > 365) {
      score += 5;
    }

    const finalScore = Math.min(100, Math.max(0, score));

    // Determine recommended re-engagement angle
    let angle = 'Seasonal Portrait Special';
    if (daysInactive >= 300 && daysInactive <= 400) {
      angle = '1-Year Milestone & Anniversary Follow-up';
    } else if (recordedRevenue >= 50000) {
      angle = 'VIP Past Client Priority Booking';
    } else if (pastGalleriesCount >= 2) {
      angle = 'Loyal Client Family Session Check-in';
    } else if (daysInactive >= 90 && daysInactive <= 180) {
      angle = 'Seasonal Update & Print Offer';
    }

    return { score: finalScore, angle };
  }

  /**
   * Get reactivation candidates for a studio with suppression status and filtering.
   */
  static async getReactivationCandidates(
    studioId: string,
    filters: ReactivationCandidatesFilterDTO = {}
  ): Promise<ClientReactivationCandidateDTO[]> {
    const now = new Date();
    const minDays = filters.min_days_inactive ?? (filters as any).minDaysInactive ?? 60;
    const maxDays = filters.max_days_inactive ?? (filters as any).maxDaysInactive ?? 730;

    // 1. Fetch clients with related profiles, transactions, and suppression
    const clients = await prisma.client.findMany({
      where: {
        studio_id: studioId,
        deleted_at: null,
      },
      include: {
        engagement_profile: true,
        galleries: {
          include: { gallery: true },
          orderBy: { created_at: 'desc' },
        },
        business_transactions: {
          where: { is_void: false, transaction_type: 'INCOME' },
        },
        growth_opportunities: {
          where: {
            type: 'CLIENT_REACTIVATION',
            status: { in: ['OPEN', 'IN_PROGRESS'] },
          },
        },
      },
      orderBy: { created_at: 'desc' },
    });

    // 2. Fetch email suppressions for this studio / globally
    const emails = clients.map(c => c.email.toLowerCase().trim());
    const suppressions = await prisma.emailSuppression.findMany({
      where: {
        email: { in: emails },
      },
    });
    const suppressionMap = new Map<string, string>();
    for (const s of suppressions) {
      suppressionMap.set(s.email.toLowerCase().trim(), s.reason);
    }

    const candidates: ClientReactivationCandidateDTO[] = [];

    for (const client of clients) {
      // Calculate inactivity
      const lastActivityDate =
        client.engagement_profile?.last_activity_at ||
        (client.galleries[0]?.gallery as any)?.published_at ||
        client.galleries[0]?.gallery?.created_at ||
        client.galleries[0]?.created_at ||
        client.updated_at ||
        client.created_at;

      const daysInactive = Math.floor(
        (now.getTime() - new Date(lastActivityDate).getTime()) / (1000 * 60 * 60 * 24)
      );

      if (daysInactive < minDays || daysInactive > maxDays) {
        continue;
      }

      const pastGalleriesCount = client.galleries.length;
      const recordedRevenue = client.business_transactions.reduce((acc, t) => acc + t.amount, 0);
      const engagementScore = client.engagement_profile?.engagement_score || 0;

      if (filters.min_engagement_score !== undefined && engagementScore < filters.min_engagement_score) {
        continue;
      }

      if (filters.search) {
        const searchLower = filters.search.toLowerCase();
        const matchesName = client.name.toLowerCase().includes(searchLower);
        const matchesEmail = client.email.toLowerCase().includes(searchLower);
        if (!matchesName && !matchesEmail) continue;
      }

      // Check suppression status
      const suppressionReason = suppressionMap.get(client.email.toLowerCase().trim());
      let suppressionStatus: 'AVAILABLE' | 'UNSUBSCRIBED' | 'BOUNCED' | 'OPTED_OUT' = 'AVAILABLE';
      if (suppressionReason === 'UNSUBSCRIBED') suppressionStatus = 'UNSUBSCRIBED';
      else if (suppressionReason === 'BOUNCED') suppressionStatus = 'BOUNCED';
      else if (suppressionReason === 'COMPLAINT') suppressionStatus = 'OPTED_OUT';

      if (filters.exclude_suppressed && suppressionStatus !== 'AVAILABLE') {
        continue;
      }

      const { score, angle } = this.calculateReengagementScore({
        daysInactive,
        pastGalleriesCount,
        recordedRevenue,
        engagementScore,
      });

      const opportunityId = client.growth_opportunities?.[0]?.id || null;

      candidates.push({
        client_id: client.id,
        name: client.name,
        email: client.email,
        phone: client.phone || null,
        last_activity_at: lastActivityDate,
        days_inactive: daysInactive,
        past_galleries_count: pastGalleriesCount,
        recorded_revenue: recordedRevenue,
        currency: 'INR',
        engagement_score: engagementScore,
        reengagement_score: score,
        recommended_angle: angle,
        suppression_status: suppressionStatus,
        opportunity_id: opportunityId,

        // CamelCase aliases
        clientId: client.id,
        lastActivityAt: lastActivityDate,
        daysInactive,
        pastGalleriesCount,
        recordedRevenue,
        engagementScore,
        reengagementScore: score,
        recommendedAngle: angle,
        suppressionStatus,
        opportunityId,
      });
    }

    // Sort by reengagement score descending
    return candidates.sort((a, b) => b.reengagement_score - a.reengagement_score);
  }
}
