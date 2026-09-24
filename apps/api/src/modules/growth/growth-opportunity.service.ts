/**
 * Growth Opportunity Service — PixMatch AI Phase 19
 * Analyzes studio data to generate actionable growth opportunities (reactivations, seasonal demand, cross-sells, milestone follow-ups).
 * Strictly evidence-based with transparent reasoning and confidence based on data completeness.
 */

import { prisma, GrowthOpportunityType, GrowthOpportunityPriority, GrowthOpportunityStatus } from '@pixmatch/database';
import { GrowthOpportunityDTO } from '@pixmatch/types';

export class GrowthOpportunityService {
  /**
   * Scans a studio for new growth opportunities based on realistic client activity and booking history.
   */
  static async scanOpportunities(studioId: string): Promise<{ generated: number; updated: number }> {
    const now = new Date();
    let generated = 0;
    let updated = 0;

    // 1. Fetch studio clients with galleries and engagement profiles
    const clients = await prisma.client.findMany({
      where: { studio_id: studioId, deleted_at: null },
      include: {
        engagement_profile: true,
        galleries: {
          include: { gallery: true },
          orderBy: { created_at: 'desc' },
        },
        business_transactions: {
          where: { is_void: false, transaction_type: 'INCOME' },
        },
      },
    });

    // 2. Fetch all galleries in studio
    const galleries = await prisma.gallery.findMany({
      where: { studio_id: studioId },
      orderBy: { created_at: 'desc' },
    });

    // 3. Detect Inactive Past Clients (Client Reactivation)
    for (const client of clients) {
      const lastActivity = client.engagement_profile?.last_activity_at || client.updated_at || client.created_at;
      const daysSinceActivity = Math.floor((now.getTime() - new Date(lastActivity).getTime()) / (1000 * 60 * 60 * 24));
      const pastGalleriesCount = client.galleries.length;
      const recordedRevenue = client.business_transactions.reduce((acc, t) => acc + t.amount, 0);

      // Inactive for >= 90 days with past completed relationship
      if (daysSinceActivity >= 90 && pastGalleriesCount > 0) {
        const priority: GrowthOpportunityPriority =
          daysSinceActivity > 180 || recordedRevenue > 50000
            ? GrowthOpportunityPriority.HIGH
            : GrowthOpportunityPriority.MEDIUM;

        // Confidence score is based on evidence quality (past galleries count + revenue recorded)
        const confidenceScore = Math.min(0.95, 0.6 + (pastGalleriesCount > 1 ? 0.2 : 0.1) + (recordedRevenue > 0 ? 0.15 : 0.05));
        const confidenceLevel = confidenceScore >= 0.8 ? 'HIGH' : confidenceScore >= 0.5 ? 'MODERATE' : 'LOW';

        const existing = await prisma.growthOpportunity.findFirst({
          where: {
            studio_id: studioId,
            client_id: client.id,
            type: GrowthOpportunityType.CLIENT_REACTIVATION,
            status: { in: [GrowthOpportunityStatus.OPEN, GrowthOpportunityStatus.IN_PROGRESS] },
          },
        });

        const title = `Reactivate ${client.name} (${daysSinceActivity} days inactive)`;
        const description = `${client.name} has not had activity for ${daysSinceActivity} days across ${pastGalleriesCount} past ${pastGalleriesCount === 1 ? 'gallery' : 'galleries'}. Recorded historical revenue: ₹${recordedRevenue.toLocaleString('en-IN')}.`;
        const recommendedAction = `Reach out with a seasonal portrait offer or check-in note to reconnect.`;

        if (existing) {
          await prisma.growthOpportunity.update({
            where: { id: existing.id },
            data: {
              title,
              description,
              priority,
              confidence_score: confidenceScore,
              confidence_level: confidenceLevel,
              evidence: {
                days_since_activity: daysSinceActivity,
                past_galleries_count: pastGalleriesCount,
                recorded_revenue: recordedRevenue,
                last_activity_at: lastActivity,
              },
            },
          });
          updated++;
        } else {
          await prisma.growthOpportunity.create({
            data: {
              studio_id: studioId,
              client_id: client.id,
              type: GrowthOpportunityType.CLIENT_REACTIVATION,
              priority,
              status: GrowthOpportunityStatus.OPEN,
              title,
              description,
              evidence: {
                days_since_activity: daysSinceActivity,
                past_galleries_count: pastGalleriesCount,
                recorded_revenue: recordedRevenue,
                last_activity_at: lastActivity,
              },
              recommended_action: recommendedAction,
              confidence_score: confidenceScore,
              confidence_level: confidenceLevel,
            },
          });
          generated++;
        }
      }
    }

    // 4. Detect Seasonal Demand Preparation (Pre-wedding / Wedding / Festive Peak)
    const currentMonth = now.getMonth(); // 0 = Jan, 9 = Oct, 10 = Nov, 11 = Dec
    // In India/Global wedding season: Oct-Feb (months 9, 10, 11, 0, 1) is prime wedding season
    const isPeakSeasonApproaching = (currentMonth >= 7 && currentMonth <= 10) || currentMonth === 0;
    if (isPeakSeasonApproaching) {
      const existingSeasonal = await prisma.growthOpportunity.findFirst({
        where: {
          studio_id: studioId,
          type: GrowthOpportunityType.SEASONAL_DEMAND,
          status: { in: [GrowthOpportunityStatus.OPEN, GrowthOpportunityStatus.IN_PROGRESS] },
        },
      });

      const title = 'Upcoming Wedding & Festive Season Campaign Preparation';
      const description = 'Peak photography season approaches in 30-60 days. Clients typically finalize bookings 4-8 weeks in advance.';
      const recommendedAction = 'Launch an early booking campaign with limited peak-date slots and bundled album incentives.';

      if (!existingSeasonal) {
        await prisma.growthOpportunity.create({
          data: {
            studio_id: studioId,
            type: GrowthOpportunityType.SEASONAL_DEMAND,
            priority: GrowthOpportunityPriority.HIGH,
            status: GrowthOpportunityStatus.OPEN,
            title,
            description,
            evidence: {
              current_month: currentMonth + 1,
              lead_time_days: 45,
              season: 'Winter Wedding & Festive Season',
            },
            recommended_action: recommendedAction,
            confidence_score: 0.88,
            confidence_level: 'HIGH',
          },
        });
        generated++;
      }
    }

    // 5. Detect Unfinished Interaction / Pending Selection Milestones
    for (const gallery of galleries) {
      const openInsights = await prisma.clientInsight.findMany({
        where: { gallery_id: gallery.id, status: 'OPEN' },
      });
      const pendingSelection = openInsights.find((i: any) => i.type === 'PENDING_SELECTION' || i.type === 'INACTIVE_GALLERY');

      if (pendingSelection) {
        const existing = await prisma.growthOpportunity.findFirst({
          where: {
            studio_id: studioId,
            gallery_id: gallery.id,
            type: GrowthOpportunityType.UNFINISHED_INTERACTION,
            status: { in: [GrowthOpportunityStatus.OPEN, GrowthOpportunityStatus.IN_PROGRESS] },
          },
        });

        const title = `Unfinished Selections on "${gallery.title}"`;
        const description = `Client has pending photo selections or low engagement on delivered gallery "${gallery.title}".`;
        const recommendedAction = `Send a gentle reminder offering selection guidance or assistance.`;

        if (!existing) {
          await prisma.growthOpportunity.create({
            data: {
              studio_id: studioId,
              gallery_id: gallery.id,
              type: GrowthOpportunityType.UNFINISHED_INTERACTION,
              priority: GrowthOpportunityPriority.MEDIUM,
              status: GrowthOpportunityStatus.OPEN,
              title,
              description,
              evidence: {
                gallery_title: gallery.title,
                insight_title: pendingSelection.title,
              },
              recommended_action: recommendedAction,
              confidence_score: 0.85,
              confidence_level: 'HIGH',
            },
          });
          generated++;
        }
      }
    }

    return { generated, updated };
  }

  /**
   * List growth opportunities with filtering, sorting, and pagination.
   */
  static async listOpportunities(
    studioId: string,
    query: {
      type?: GrowthOpportunityType;
      priority?: GrowthOpportunityPriority;
      status?: GrowthOpportunityStatus;
      search?: string;
      limit?: number;
      offset?: number;
    }
  ): Promise<{ opportunities: GrowthOpportunityDTO[]; total: number }> {
    const where: any = { studio_id: studioId };

    if (query.type) where.type = query.type;
    if (query.priority) where.priority = query.priority;
    if (query.status) {
      where.status = query.status;
    } else {
      where.status = { not: GrowthOpportunityStatus.DISMISSED };
    }

    if (query.search) {
      where.OR = [
        { title: { contains: query.search, mode: 'insensitive' } },
        { description: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    const [items, total] = await Promise.all([
      prisma.growthOpportunity.findMany({
        where,
        include: {
          client: { select: { id: true, name: true, email: true } },
          gallery: { select: { id: true, title: true } },
        },
        orderBy: [
          { priority: 'desc' },
          { created_at: 'desc' },
        ],
        take: query.limit || 50,
        skip: query.offset || 0,
      }),
      prisma.growthOpportunity.count({ where }),
    ]);

    const opportunities: GrowthOpportunityDTO[] = items.map(item => ({
      id: item.id,
      studio_id: item.studio_id,
      client_id: item.client_id,
      client_name: item.client?.name || null,
      client_email: item.client?.email || null,
      gallery_id: item.gallery_id,
      gallery_title: item.gallery?.title || null,
      type: item.type as any,
      priority: item.priority as any,
      status: item.status as any,
      title: item.title,
      description: item.description,
      evidence: item.evidence as any,
      recommended_action: item.recommended_action,
      confidence_score: item.confidence_score,
      confidence_level: item.confidence_level as 'HIGH' | 'MODERATE' | 'LOW',
      expires_at: item.expires_at,
      completed_at: item.completed_at,
      dismissed_at: item.dismissed_at,
      created_at: item.created_at,
      updated_at: item.updated_at,

      // CamelCase aliases
      studioId: item.studio_id,
      clientId: item.client_id,
      clientName: item.client?.name || null,
      clientEmail: item.client?.email || null,
      galleryId: item.gallery_id,
      galleryTitle: item.gallery?.title || null,
      recommendedAction: item.recommended_action,
      confidenceScore: item.confidence_score,
      confidenceLevel: item.confidence_level as 'HIGH' | 'MODERATE' | 'LOW',
      expiresAt: item.expires_at,
      completedAt: item.completed_at,
      dismissedAt: item.dismissed_at,
      createdAt: item.created_at,
      updatedAt: item.updated_at,
    }));

    return { opportunities, total };
  }

  /**
   * Get single opportunity with IDOR check
   */
  static async getOpportunity(studioId: string, opportunityId: string): Promise<GrowthOpportunityDTO | null> {
    const item = await prisma.growthOpportunity.findFirst({
      where: { id: opportunityId, studio_id: studioId },
      include: {
        client: { select: { id: true, name: true, email: true } },
        gallery: { select: { id: true, title: true } },
      },
    });

    if (!item) return null;

    return {
      id: item.id,
      studio_id: item.studio_id,
      client_id: item.client_id,
      client_name: item.client?.name || null,
      client_email: item.client?.email || null,
      gallery_id: item.gallery_id,
      gallery_title: item.gallery?.title || null,
      type: item.type as any,
      priority: item.priority as any,
      status: item.status as any,
      title: item.title,
      description: item.description,
      evidence: item.evidence as any,
      recommended_action: item.recommended_action,
      confidence_score: item.confidence_score,
      confidence_level: item.confidence_level as 'HIGH' | 'MODERATE' | 'LOW',
      expires_at: item.expires_at,
      completed_at: item.completed_at,
      dismissed_at: item.dismissed_at,
      created_at: item.created_at,
      updated_at: item.updated_at,
      studioId: item.studio_id,
      clientId: item.client_id,
      clientName: item.client?.name || null,
      clientEmail: item.client?.email || null,
      galleryId: item.gallery_id,
      galleryTitle: item.gallery?.title || null,
      recommendedAction: item.recommended_action,
      confidenceScore: item.confidence_score,
      confidenceLevel: item.confidence_level as 'HIGH' | 'MODERATE' | 'LOW',
    };
  }

  /**
   * Update opportunity status (complete, dismiss, in-progress)
   */
  static async updateStatus(
    studioId: string,
    opportunityId: string,
    status: GrowthOpportunityStatus
  ): Promise<GrowthOpportunityDTO> {
    const existing = await prisma.growthOpportunity.findFirst({
      where: { id: opportunityId, studio_id: studioId },
    });

    if (!existing) {
      throw new Error('Growth opportunity not found or unauthorized');
    }

    const updateData: any = { status };
    if (status === GrowthOpportunityStatus.COMPLETED) {
      updateData.completed_at = new Date();
    } else if (status === GrowthOpportunityStatus.DISMISSED) {
      updateData.dismissed_at = new Date();
    }

    const updated = await prisma.growthOpportunity.update({
      where: { id: opportunityId },
      data: updateData,
      include: {
        client: { select: { id: true, name: true, email: true } },
        gallery: { select: { id: true, title: true } },
      },
    });

    return {
      id: updated.id,
      studio_id: updated.studio_id,
      client_id: updated.client_id,
      client_name: updated.client?.name || null,
      client_email: updated.client?.email || null,
      gallery_id: updated.gallery_id,
      gallery_title: updated.gallery?.title || null,
      type: updated.type as any,
      priority: updated.priority as any,
      status: updated.status as any,
      title: updated.title,
      description: updated.description,
      evidence: updated.evidence as any,
      recommended_action: updated.recommended_action,
      confidence_score: updated.confidence_score,
      confidence_level: updated.confidence_level as 'HIGH' | 'MODERATE' | 'LOW',
      expires_at: updated.expires_at,
      completed_at: updated.completed_at,
      dismissed_at: updated.dismissed_at,
      created_at: updated.created_at,
      updated_at: updated.updated_at,
    };
  }
}
