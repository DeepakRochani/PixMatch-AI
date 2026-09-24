/**
 * Client Insight Service — PIXMatch AI Phase 17
 * Generates verified, evidence-grounded operational insights for client relationships.
 * Strictly relies on factual product activity and never invents or infers psychological state.
 */

import { prisma } from '@pixmatch/database';
import {
  ClientInsightDTO,
  ClientInsightType,
  ClientInsightSeverity,
  ClientInsightStatus,
} from '@pixmatch/types';
import { ClientEngagementService } from './client-engagement.service.js';
import { ClientJourneyService } from './client-journey.service.js';

export class ClientInsightService {
  private db: any;
  private engagementService: ClientEngagementService;
  private journeyService: ClientJourneyService;

  constructor(dbClient?: any) {
    this.db = dbClient || prisma;
    this.engagementService = new ClientEngagementService(this.db);
    this.journeyService = new ClientJourneyService(this.db);
  }

  private static defaultInstance = new ClientInsightService();

  static async generateClientInsights(studioId: string, clientId: string): Promise<ClientInsightDTO[]> {
    return this.defaultInstance.generateClientInsights(studioId, clientId);
  }

  /**
   * Generates and persists operational insights based strictly on verified platform data.
   */
  async generateClientInsights(studioId: string, clientId: string): Promise<ClientInsightDTO[]> {
    const client = await this.db.client.findFirst({
      where: { id: clientId, studio_id: studioId },
      include: {
        galleries: {
          include: { gallery: true },
        },
        activities: {
          orderBy: { created_at: 'desc' },
        },
        deliveries: {
          orderBy: { sent_at: 'desc' },
        },
      },
    });

    if (!client) {
      throw new Error(`Client ${clientId} not found for studio ${studioId}`);
    }

    const engagement = await this.engagementService.calculateClientEngagement(studioId, clientId);
    const returnCheck = await this.journeyService.detectReturnClient(studioId, clientId);
    const now = new Date();
    const activities = client.activities || [];
    const deliveries = client.deliveries || [];
    const assignedGalleries = (client.galleries || []).map((cg: any) => cg.gallery).filter(Boolean);

    const candidates: Array<{
      type: ClientInsightType;
      severity: ClientInsightSeverity;
      title: string;
      description: string;
      gallery_id?: string | null;
      evidence: Record<string, any>;
    }> = [];

    // 1. Repeat / Return Client Insight
    if (returnCheck.isReturn) {
      candidates.push({
        type: ClientInsightType.RETURN_CLIENT,
        severity: ClientInsightSeverity.INFO,
        title: 'Repeat Client',
        description: `This client is associated with ${returnCheck.totalGalleries} galleries (${returnCheck.galleryTitles.join(', ')}).`,
        evidence: {
          total_galleries: returnCheck.totalGalleries,
          completed_galleries: returnCheck.completedGalleries,
          galleries: returnCheck.galleryTitles,
        },
      });
    } else if (assignedGalleries.length > 1) {
      candidates.push({
        type: ClientInsightType.MULTIPLE_GALLERIES,
        severity: ClientInsightSeverity.INFO,
        title: 'Multiple Galleries Assigned',
        description: `Client is linked to ${assignedGalleries.length} active galleries.`,
        evidence: {
          gallery_count: assignedGalleries.length,
          gallery_titles: assignedGalleries.map((g: any) => g.title),
        },
      });
    }

    // 2. High Engagement Insight
    if (engagement.engagement_score >= 75) {
      candidates.push({
        type: ClientInsightType.HIGH_ENGAGEMENT,
        severity: ClientInsightSeverity.INFO,
        title: 'High Client Engagement',
        description: `Client shows high activity with ${engagement.total_favorites} favorites, ${engagement.total_selections} selections, and ${engagement.total_gallery_views} gallery visits (Score: ${engagement.engagement_score}/100).`,
        evidence: {
          engagement_score: engagement.engagement_score,
          total_favorites: engagement.total_favorites,
          total_selections: engagement.total_selections,
          total_views: engagement.total_gallery_views,
        },
      });
    }

    // 3. Gallery-specific checks
    for (const gallery of assignedGalleries) {
      const gEng = await this.engagementService.getGalleryClientEngagement(studioId, clientId, gallery.id);
      const delivery = deliveries.find((d: any) => d.gallery_id === gallery.id);

      // Gallery not opened
      if (delivery && !delivery.opened_at && gEng.views_count === 0) {
        const daysSinceDelivery = (now.getTime() - new Date(delivery.sent_at).getTime()) / (1000 * 60 * 60 * 24);
        if (daysSinceDelivery >= 3) {
          candidates.push({
            type: ClientInsightType.GALLERY_NOT_OPENED,
            severity: daysSinceDelivery >= 7 ? ClientInsightSeverity.HIGH : ClientInsightSeverity.MEDIUM,
            gallery_id: gallery.id,
            title: `Gallery Not Opened: ${gallery.title}`,
            description: `Gallery was delivered ${Math.round(daysSinceDelivery)} days ago, but no view activity has been recorded.`,
            evidence: {
              gallery_id: gallery.id,
              gallery_title: gallery.title,
              delivered_at: delivery.sent_at,
              days_since_delivery: Math.round(daysSinceDelivery),
            },
          });
        }
      }

      // Pending selections
      if (gEng.views_count > 0 && !gEng.is_selection_completed) {
        candidates.push({
          type: ClientInsightType.PENDING_SELECTION,
          severity: ClientInsightSeverity.MEDIUM,
          gallery_id: gallery.id,
          title: `Pending Selections: ${gallery.title}`,
          description: `Client has visited the gallery ${gEng.views_count} times and selected ${gEng.selections_count} photos. Selection remains incomplete.`,
          evidence: {
            gallery_id: gallery.id,
            gallery_title: gallery.title,
            views_count: gEng.views_count,
            selections_count: gEng.selections_count,
            favorites_count: gEng.favorites_count,
          },
        });
      }

      // Download complete
      if (gEng.is_download_completed) {
        candidates.push({
          type: ClientInsightType.DOWNLOAD_COMPLETE,
          severity: ClientInsightSeverity.INFO,
          gallery_id: gallery.id,
          title: `Downloads Completed: ${gallery.title}`,
          description: `Client completed downloading ${gEng.downloads_count} photo packages from ${gallery.title}.`,
          evidence: {
            gallery_id: gallery.id,
            gallery_title: gallery.title,
            downloads_count: gEng.downloads_count,
          },
        });
      }
    }

    // 4. Low Engagement / Inactive
    if (engagement.engagement_score < 30 && deliveries.length > 0) {
      candidates.push({
        type: ClientInsightType.LOW_ENGAGEMENT,
        severity: ClientInsightSeverity.MEDIUM,
        title: 'Low Activity Recorded',
        description: `Client engagement is currently low (${engagement.engagement_score}/100) across delivered galleries.`,
        evidence: {
          engagement_score: engagement.engagement_score,
          engagement_state: engagement.engagement_state,
        },
      });
    }

    // 5. Testimonial / Referral opportunity
    const completedGalleriesCount = assignedGalleries.filter(
      (g: any) => g.status === 'COMPLETED' || g.status === 'ARCHIVED'
    ).length;
    if (completedGalleriesCount > 0 && engagement.engagement_score >= 70) {
      candidates.push({
        type: ClientInsightType.TESTIMONIAL_RECOMMENDED,
        severity: ClientInsightSeverity.LOW,
        title: 'Testimonial Opportunity',
        description: `Gallery delivery is complete and client engagement is high (${engagement.engagement_score}/100). Consider requesting a review or testimonial.`,
        evidence: {
          completed_galleries: completedGalleriesCount,
          engagement_score: engagement.engagement_score,
        },
      });
    }

    if (returnCheck.isReturn && engagement.engagement_score >= 60) {
      candidates.push({
        type: ClientInsightType.REFERRAL_RECOMMENDED,
        severity: ClientInsightSeverity.LOW,
        title: 'Referral Opportunity',
        description: `Repeat client with multiple successful galleries. Consider offering a referral incentive.`,
        evidence: {
          total_galleries: returnCheck.totalGalleries,
          engagement_score: engagement.engagement_score,
        },
      });
    }

    // 6. Recent activity (within last 24h)
    if (activities.length > 0) {
      const latestAct = new Date(activities[0].created_at);
      const hoursSince = (now.getTime() - latestAct.getTime()) / (1000 * 60 * 60);
      if (hoursSince <= 24) {
        candidates.push({
          type: ClientInsightType.RECENT_ACTIVITY,
          severity: ClientInsightSeverity.INFO,
          title: 'Recent Activity Recorded',
          description: `Client was active ${Math.round(hoursSince)} hours ago: ${activities[0].description}`,
          evidence: {
            activity_type: activities[0].activity_type,
            description: activities[0].description,
            created_at: activities[0].created_at,
          },
        });
      }
    }

    // Persist and return insights
    const persisted: ClientInsightDTO[] = [];
    for (const c of candidates) {
      let rec: any = null;
      if (this.db.clientInsight?.create) {
        // Look up existing open insight with same type and gallery
        const existing = await this.db.clientInsight.findFirst?.({
          where: {
            studio_id: studioId,
            client_id: clientId,
            type: c.type,
            gallery_id: c.gallery_id || null,
            status: ClientInsightStatus.OPEN,
          },
        });

        if (existing) {
          rec = await this.db.clientInsight.update({
            where: { id: existing.id },
            data: {
              title: c.title,
              description: c.description,
              evidence: c.evidence,
              severity: c.severity,
              updated_at: now,
            },
          });
        } else {
          rec = await this.db.clientInsight.create({
            data: {
              id: `ins-${clientId}-${c.type}-${Date.now()}-${Math.random().toString(36).substring(7)}`,
              studio_id: studioId,
              client_id: clientId,
              gallery_id: c.gallery_id || null,
              type: c.type,
              severity: c.severity,
              title: c.title,
              description: c.description,
              evidence: c.evidence,
              status: ClientInsightStatus.OPEN,
              created_at: now,
              updated_at: now,
            },
          });
        }
      } else {
        rec = {
          id: `ins-${clientId}-${c.type}`,
          studio_id: studioId,
          client_id: clientId,
          gallery_id: c.gallery_id || null,
          type: c.type,
          severity: c.severity,
          title: c.title,
          description: c.description,
          evidence: c.evidence,
          status: ClientInsightStatus.OPEN,
          created_at: now,
          updated_at: now,
        };
      }

      persisted.push({
        id: rec.id,
        studio_id: studioId,
        client_id: clientId,
        gallery_id: rec.gallery_id,
        type: rec.type as ClientInsightType,
        severity: rec.severity as ClientInsightSeverity,
        title: rec.title,
        description: rec.description,
        evidence: rec.evidence,
        status: rec.status as ClientInsightStatus,
        created_at: rec.created_at,
        updated_at: rec.updated_at,
        resolved_at: rec.resolved_at,
      });
    }

    return persisted;
  }

  /**
   * List all insights for a studio with optional status filtering.
   */
  async listStudioInsights(studioId: string, status?: ClientInsightStatus): Promise<ClientInsightDTO[]> {
    const where: any = { studio_id: studioId };
    if (status) where.status = status;

    const insights = (await this.db.clientInsight?.findMany?.({
      where,
      orderBy: { created_at: 'desc' },
      include: { gallery: true, client: true },
    })) || [];

    return insights.map((ins: any) => ({
      id: ins.id,
      studio_id: ins.studio_id,
      client_id: ins.client_id,
      gallery_id: ins.gallery_id,
      gallery_title: ins.gallery?.title || null,
      type: ins.type as ClientInsightType,
      severity: ins.severity as ClientInsightSeverity,
      title: ins.title,
      description: ins.description,
      evidence: ins.evidence,
      status: ins.status as ClientInsightStatus,
      created_at: ins.created_at,
      updated_at: ins.updated_at,
      resolved_at: ins.resolved_at,
    }));
  }

  /**
   * Alias for generateClientInsights
   */
  async generateInsightsForClient(studioId: string, clientId: string): Promise<ClientInsightDTO[]> {
    return this.generateClientInsights(studioId, clientId);
  }

  /**
   * Alias for generateClientInsights
   */
  async getClientInsights(studioId: string, clientId: string): Promise<ClientInsightDTO[]> {
    return this.generateClientInsights(studioId, clientId);
  }

  /**
   * Update insight status
   */
  async updateInsightStatus(
    studioId: string,
    insightId: string,
    status: ClientInsightStatus
  ): Promise<ClientInsightDTO> {
    if (status === ClientInsightStatus.RESOLVED) {
      return this.resolveInsight(studioId, insightId);
    }
    if (status === ClientInsightStatus.DISMISSED) {
      return this.dismissInsight(studioId, insightId);
    }
    const updated = await this.db.clientInsight.update({
      where: { id: insightId },
      data: { status, updated_at: new Date() },
    });
    return updated as any;
  }

  /**
   * Resolve an insight when operational status changes.
   */
  async resolveInsight(studioId: string, insightId: string): Promise<ClientInsightDTO> {
    const insight = await this.db.clientInsight.findFirst({
      where: { id: insightId, studio_id: studioId },
    });

    if (!insight) {
      throw new Error(`Insight ${insightId} not found for studio ${studioId}`);
    }

    const updated = await this.db.clientInsight.update({
      where: { id: insightId },
      data: {
        status: ClientInsightStatus.RESOLVED,
        resolved_at: new Date(),
        updated_at: new Date(),
      },
    });

    return {
      id: updated.id,
      studio_id: updated.studio_id,
      client_id: updated.client_id,
      gallery_id: updated.gallery_id,
      type: updated.type as ClientInsightType,
      severity: updated.severity as ClientInsightSeverity,
      title: updated.title,
      description: updated.description,
      evidence: updated.evidence,
      status: updated.status as ClientInsightStatus,
      created_at: updated.created_at,
      updated_at: updated.updated_at,
      resolved_at: updated.resolved_at,
    };
  }

  /**
   * Dismiss an insight.
   */
  async dismissInsight(studioId: string, insightId: string): Promise<ClientInsightDTO> {
    const insight = await this.db.clientInsight.findFirst({
      where: { id: insightId, studio_id: studioId },
    });

    if (!insight) {
      throw new Error(`Insight ${insightId} not found for studio ${studioId}`);
    }

    const updated = await this.db.clientInsight.update({
      where: { id: insightId },
      data: {
        status: ClientInsightStatus.DISMISSED,
        updated_at: new Date(),
      },
    });

    return {
      id: updated.id,
      studio_id: updated.studio_id,
      client_id: updated.client_id,
      gallery_id: updated.gallery_id,
      type: updated.type as ClientInsightType,
      severity: updated.severity as ClientInsightSeverity,
      title: updated.title,
      description: updated.description,
      evidence: updated.evidence,
      status: updated.status as ClientInsightStatus,
      created_at: updated.created_at,
      updated_at: updated.updated_at,
      resolved_at: updated.resolved_at,
    };
  }
}
