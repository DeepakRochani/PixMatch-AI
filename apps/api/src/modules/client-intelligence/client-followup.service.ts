/**
 * Client Follow-Up Service — PIXMatch AI Phase 17
 * Intelligent follow-up opportunity detection, recommendation lifecycle, and automatic expiration.
 * Strictly non-automatic: Recommends opportunities for photographer approval; never sends communications directly.
 */

import { prisma } from '@pixmatch/database';
import {
  ClientFollowUpRecommendationDTO,
  ClientFollowUpType,
  ClientFollowUpStatus,
  ClientFollowUpFilterDTO,
} from '@pixmatch/types';
import { ClientEngagementService } from './client-engagement.service.js';
import { ClientJourneyService } from './client-journey.service.js';

export interface FollowUpThresholds {
  galleryReminderDays: number;
  selectionReminderDays: number;
  downloadReminderDays: number;
  inactiveClientDays: number;
  testimonialMinScore: number;
  referralMinScore: number;
}

export const DEFAULT_THRESHOLDS: FollowUpThresholds = {
  galleryReminderDays: 3,
  selectionReminderDays: 7,
  downloadReminderDays: 7,
  inactiveClientDays: 30,
  testimonialMinScore: 75,
  referralMinScore: 80,
};

export class ClientFollowUpService {
  private db: any;
  private engagementService: ClientEngagementService;
  private journeyService: ClientJourneyService;

  constructor(dbClient?: any) {
    this.db = dbClient || prisma;
    this.engagementService = new ClientEngagementService(this.db);
    this.journeyService = new ClientJourneyService(this.db);
  }

  private static defaultInstance = new ClientFollowUpService();

  static async scanFollowUpOpportunities(
    studioId: string,
    thresholds?: Partial<FollowUpThresholds>
  ): Promise<ClientFollowUpRecommendationDTO[]> {
    return this.defaultInstance.scanFollowUpOpportunities(studioId, thresholds);
  }

  /**
   * Alias for scanFollowUpOpportunities returning scan summary object
   */
  async scanAndGenerateFollowUps(
    studioId: string,
    options?: {
      galleryInactivityDays?: number;
      selectionPendingDays?: number;
      downloadPendingDays?: number;
      inactiveClientDays?: number;
      testimonialMinScore?: number;
      referralMinScore?: number;
    }
  ): Promise<{ createdCount: number; recommendations: ClientFollowUpRecommendationDTO[] }> {
    const thresholds: Partial<FollowUpThresholds> = {};
    if (options?.galleryInactivityDays !== undefined) thresholds.galleryReminderDays = options.galleryInactivityDays;
    if (options?.selectionPendingDays !== undefined) thresholds.selectionReminderDays = options.selectionPendingDays;
    if (options?.downloadPendingDays !== undefined) thresholds.downloadReminderDays = options.downloadPendingDays;
    if (options?.inactiveClientDays !== undefined) thresholds.inactiveClientDays = options.inactiveClientDays;
    if (options?.testimonialMinScore !== undefined) thresholds.testimonialMinScore = options.testimonialMinScore;
    if (options?.referralMinScore !== undefined) thresholds.referralMinScore = options.referralMinScore;

    const recs = await this.scanFollowUpOpportunities(studioId, thresholds);
    return {
      createdCount: recs.length,
      recommendations: recs,
    };
  }

  /**
   * Scans all clients within a studio for actionable follow-up opportunities.
   * Enforces strict tenant isolation and idempotency.
   */
  async scanFollowUpOpportunities(
    studioId: string,
    customThresholds?: Partial<FollowUpThresholds>
  ): Promise<ClientFollowUpRecommendationDTO[]> {
    const config: FollowUpThresholds = { ...DEFAULT_THRESHOLDS, ...customThresholds };
    const now = new Date();

    const clients = (await this.db.client.findMany({
      where: { studio_id: studioId, deleted_at: null },
      include: {
        galleries: {
          include: { gallery: true },
        },
        deliveries: {
          orderBy: { sent_at: 'desc' },
        },
        activities: {
          orderBy: { created_at: 'desc' },
        },
      },
    })) || [];

    const recommendations: Array<{
      client_id: string;
      gallery_id?: string | null;
      type: ClientFollowUpType;
      reason: string;
      title: string;
      suggested_subject?: string;
      suggested_body?: string;
      message_suggestion?: string;
      priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
    }> = [];

    for (const client of clients) {
      const clientName = client.first_name || client.name || 'there';
      const activities = client.activities || [];
      const deliveries = client.deliveries || [];
      
      let assignedGalleries = (client.galleries || []).map((cg: any) => cg.gallery).filter(Boolean);
      if (assignedGalleries.length === 0 && this.db.clientGalleryAssignment?.findMany) {
        const cgs = await this.db.clientGalleryAssignment.findMany({
          where: { client_id: client.id },
          include: { gallery: true },
        });
        assignedGalleries = cgs.map((cg: any) => cg.gallery).filter(Boolean);
      }

      const engagement = await this.engagementService.calculateClientEngagement(studioId, client.id);
      const returnCheck = await this.journeyService.detectReturnClient(studioId, client.id);

      for (const gallery of assignedGalleries) {
        const gEng = await this.engagementService.getGalleryClientEngagement(studioId, client.id, gallery.id);
        const delivery = deliveries.find((d: any) => d.gallery_id === gallery.id);

        // 1. Gallery Not Opened Reminder (Delivered or published >= X days ago, 0 views)
        const publishedDate = gallery.published_at ? new Date(gallery.published_at) : null;
        const sentDate = delivery?.sent_at ? new Date(delivery.sent_at) : publishedDate;
        const daysSinceDel = sentDate ? (now.getTime() - sentDate.getTime()) / (1000 * 60 * 60 * 24) : 0;

        if ((!delivery || !delivery.opened_at) && gEng.views_count === 0 && daysSinceDel >= config.galleryReminderDays) {
          recommendations.push({
            client_id: client.id,
            gallery_id: gallery.id,
            type: ClientFollowUpType.GALLERY_REMINDER,
            priority: daysSinceDel >= 7 ? 'HIGH' : 'MEDIUM',
            title: `Unopened Gallery Reminder: ${gallery.title}`,
            suggested_subject: `Reminder: Your ${gallery.title} gallery is ready`,
            suggested_body: `Hi ${clientName},\n\nWe wanted to make sure you received access to your gallery "${gallery.title}".\n\nYou can access your photos anytime using the gallery link. Please let us know if you need any assistance!\n\nBest regards,\nYour Photography Team`,
            reason: `Gallery was delivered/published ${Math.round(daysSinceDel)} days ago, but has not yet been opened by ${client.name}.`,
            message_suggestion: `Hi ${clientName},\n\nWe wanted to make sure you received access to your gallery "${gallery.title}".\n\nYou can access your photos anytime using the gallery link. Please let us know if you need any assistance!\n\nBest regards,\nYour Photography Team`,
          });
        }

        // 2. Pending Selection Reminder (Viewed, but selections not complete after >= X days)
        if (gEng.views_count > 0 && !gEng.is_selection_completed) {
          const latestAct = activities[0] ? new Date(activities[0].created_at) : (delivery ? new Date(delivery.sent_at) : now);
          const daysSinceAct = (now.getTime() - latestAct.getTime()) / (1000 * 60 * 60 * 24);

          if (daysSinceAct >= config.selectionReminderDays) {
            recommendations.push({
              client_id: client.id,
              gallery_id: gallery.id,
              type: ClientFollowUpType.SELECTION_REMINDER,
              priority: 'MEDIUM',
              title: `Selection Reminder: ${gallery.title}`,
              suggested_subject: `Choose your favorites from ${gallery.title}`,
              suggested_body: `Hi ${clientName},\n\nWe hope you're enjoying your photos in "${gallery.title}"!\n\nWhenever you're ready, please finalize your favorite photo selections so we can begin preparing your final deliverables.\n\nBest regards,\nYour Photography Team`,
              reason: `Client has viewed the gallery (${gEng.views_count} visits) with ${gEng.selections_count} selections recorded, but selections remain pending after ${Math.round(daysSinceAct)} days.`,
              message_suggestion: `Hi ${clientName},\n\nWe hope you're enjoying your photos in "${gallery.title}"!\n\nWhenever you're ready, please finalize your favorite photo selections so we can begin preparing your final deliverables and album layout.\n\nBest regards,\nYour Photography Team`,
            });
          }
        }

        // 3. Download Pending Reminder (Selections complete, but 0 downloads after >= X days)
        if (gEng.is_selection_completed && !gEng.is_download_completed) {
          const daysSinceDel = delivery ? (now.getTime() - new Date(delivery.sent_at).getTime()) / (1000 * 60 * 60 * 24) : 0;
          if (daysSinceDel >= config.downloadReminderDays) {
            recommendations.push({
              client_id: client.id,
              gallery_id: gallery.id,
              type: ClientFollowUpType.DOWNLOAD_REMINDER,
              priority: 'LOW',
              title: `Download Reminder: ${gallery.title}`,
              suggested_subject: `Your final high-resolution photos for ${gallery.title}`,
              suggested_body: `Hi ${clientName},\n\nYour final photo collection for "${gallery.title}" is ready for download in high resolution.\n\nBe sure to download and backup your images!\n\nBest regards,\nYour Photography Team`,
              reason: `Selections are complete for "${gallery.title}", but no photo downloads have been initiated.`,
              message_suggestion: `Hi ${clientName},\n\nYour final photo collection for "${gallery.title}" is ready for download in high resolution.\n\nBe sure to download and backup your images at your earliest convenience!\n\nBest regards,\nYour Photography Team`,
            });
          }
        }
      }

      // 4. Inactive Client Follow-Up (Active in the past, no activity for >= 30 days)
      if (activities.length > 0) {
        const lastAct = new Date(activities[0].created_at);
        const daysSinceLastAct = (now.getTime() - lastAct.getTime()) / (1000 * 60 * 60 * 24);

        if (daysSinceLastAct >= config.inactiveClientDays && assignedGalleries.some((g: any) => g.status === 'ACTIVE' || g.status === 'PUBLISHED')) {
          recommendations.push({
            client_id: client.id,
            gallery_id: assignedGalleries[0]?.id || null,
            type: ClientFollowUpType.INACTIVE_CLIENT,
            priority: 'LOW',
            title: `Check-in with Inactive Client: ${client.name}`,
            suggested_subject: `Checking in from your photography team`,
            suggested_body: `Hi ${clientName},\n\nWe're checking in to see if you have any questions or need anything further regarding your photo gallery.\n\nLet us know if there's anything we can help you with!\n\nBest regards,\nYour Photography Team`,
            reason: `No activity recorded for ${Math.round(daysSinceLastAct)} days while a gallery remains active.`,
            message_suggestion: `Hi ${clientName},\n\nWe're checking in to see if you have any questions or need anything further regarding your photo gallery.\n\nLet us know if there's anything we can help you with!\n\nBest regards,\nYour Photography Team`,
          });
        }
      }

      // 5. Testimonial Request (Completed gallery + High Engagement >= 75)
      const completedGalleries = assignedGalleries.filter((g: any) => g.status === 'COMPLETED' || g.status === 'ARCHIVED');
      if (completedGalleries.length > 0 && engagement.engagement_score >= config.testimonialMinScore) {
        recommendations.push({
          client_id: client.id,
          gallery_id: completedGalleries[0].id,
          type: ClientFollowUpType.TESTIMONIAL_REQUEST,
          priority: 'LOW',
          title: `Request Testimonial: ${client.name}`,
          suggested_subject: `How was your photography experience?`,
          suggested_body: `Hi ${clientName},\n\nThank you so much for choosing us to capture "${completedGalleries[0].title}"! It was an absolute pleasure working together.\n\nIf you have a moment, we would be deeply grateful if you could share a short review of your experience.\n\nWarm regards,\nYour Photography Team`,
          reason: `Gallery delivery is complete and client engagement is high (${engagement.engagement_score}/100 score).`,
          message_suggestion: `Hi ${clientName},\n\nThank you so much for choosing us to capture "${completedGalleries[0].title}"! It was an absolute pleasure working together.\n\nIf you have a moment, we would be deeply grateful if you could share a short review of your experience.\n\nWarm regards,\nYour Photography Team`,
        });
      }

      // 6. Referral Request (Return client + Completed galleries)
      if (returnCheck.isReturn && engagement.engagement_score >= config.referralMinScore) {
        recommendations.push({
          client_id: client.id,
          gallery_id: null,
          type: ClientFollowUpType.REFERRAL_REQUEST,
          priority: 'LOW',
          title: `Referral Request: ${client.name}`,
          suggested_subject: `Special thank you & referral program`,
          suggested_body: `Hi ${clientName},\n\nThank you for being such a valued client across your sessions with us! If you know friends or colleagues looking for a photographer, we'd love the opportunity to work with them.\n\nWarm regards,\nYour Photography Team`,
          reason: `Repeat client with ${returnCheck.totalGalleries} galleries and high satisfaction/engagement.`,
          message_suggestion: `Hi ${clientName},\n\nThank you for being such a valued client across your sessions with us! If you know friends or colleagues looking for a photographer, we'd love the opportunity to work with them.\n\nWarm regards,\nYour Photography Team`,
        });
      }
    }

    // Persist recommendations idempotently
    const persisted: any[] = [];
    for (const r of recommendations) {
      let rec: any = null;
      if (this.db.clientFollowUpRecommendation?.findFirst) {
        const existing = await this.db.clientFollowUpRecommendation.findFirst({
          where: {
            studio_id: studioId,
            client_id: r.client_id,
            type: r.type,
            gallery_id: r.gallery_id || null,
            status: { in: [ClientFollowUpStatus.PENDING, 'OPEN', 'PENDING', ClientFollowUpStatus.APPROVED] },
          },
        });

        if (existing) {
          rec = await this.db.clientFollowUpRecommendation.update({
            where: { id: existing.id },
            data: {
              reason: r.reason,
              title: r.title,
              priority: r.priority,
              suggested_subject: r.suggested_subject,
              suggested_body: r.suggested_body,
              message_suggestion: r.message_suggestion,
              updated_at: now,
            },
          });
        } else {
          rec = await this.db.clientFollowUpRecommendation.create({
            data: {
              id: `fu-${r.client_id}-${r.type}-${Date.now()}-${Math.random().toString(36).substring(7)}`,
              studio_id: studioId,
              client_id: r.client_id,
              gallery_id: r.gallery_id || null,
              type: r.type,
              reason: r.reason,
              title: r.title,
              priority: r.priority,
              suggested_subject: r.suggested_subject,
              suggested_body: r.suggested_body,
              message_suggestion: r.message_suggestion,
              status: ClientFollowUpStatus.PENDING,
              created_at: now,
              updated_at: now,
            },
          });
        }
      } else {
        rec = {
          id: `fu-${r.client_id}-${r.type}`,
          studio_id: studioId,
          client_id: r.client_id,
          gallery_id: r.gallery_id || null,
          type: r.type,
          reason: r.reason,
          title: r.title,
          priority: r.priority,
          suggested_subject: r.suggested_subject,
          suggested_body: r.suggested_body,
          message_suggestion: r.message_suggestion,
          status: ClientFollowUpStatus.PENDING,
          created_at: now,
          updated_at: now,
        };
      }

      persisted.push({
        id: rec.id,
        studio_id: studioId,
        client_id: r.client_id,
        gallery_id: rec.gallery_id,
        type: rec.type as ClientFollowUpType,
        reason: rec.reason,
        title: rec.title,
        suggestedSubject: rec.suggested_subject || rec.title,
        suggested_subject: rec.suggested_subject || rec.title,
        suggestedBody: rec.suggested_body || rec.message_suggestion,
        suggested_body: rec.suggested_body || rec.message_suggestion,
        message_suggestion: rec.message_suggestion || rec.suggested_body,
        messageSuggestion: rec.message_suggestion || rec.suggested_body,
        priority: rec.priority as any,
        status: (rec.status === 'OPEN' ? ClientFollowUpStatus.PENDING : rec.status) as ClientFollowUpStatus,
        created_at: rec.created_at,
        updated_at: rec.updated_at,
        resolved_at: rec.resolved_at,
      });
    }

    // Auto-expire resolved recommendations
    await this.expireResolvedFollowUps(studioId);

    return persisted;
  }

  /**
   * Automatically expires recommendations when client actions resolve the condition.
   */
  async expireResolvedFollowUps(
    studioId: string,
    clientId?: string,
    galleryId?: string,
    actionType?: string
  ): Promise<number> {
    if (clientId && actionType) {
      const where: any = { studio_id: studioId, client_id: clientId };
      if (galleryId) where.gallery_id = galleryId;
      if (actionType === 'GALLERY_VISITED' || actionType === 'GALLERY_VIEW') {
        where.type = ClientFollowUpType.GALLERY_REMINDER;
      } else if (actionType === 'SELECTION_COMPLETED') {
        where.type = ClientFollowUpType.SELECTION_REMINDER;
      } else if (actionType === 'DOWNLOAD_COMPLETED') {
        where.type = ClientFollowUpType.DOWNLOAD_REMINDER;
      }

      const res = await this.db.clientFollowUpRecommendation?.updateMany?.({
        where,
        data: {
          status: ClientFollowUpStatus.EXPIRED,
          resolved_at: new Date(),
          updated_at: new Date(),
        },
      });
      return res?.count || 1;
    }

    const openRecs = (await this.db.clientFollowUpRecommendation?.findMany?.({
      where: {
        studio_id: studioId,
        status: { in: [ClientFollowUpStatus.PENDING, 'OPEN', 'PENDING'] },
      },
    })) || [];

    let expiredCount = 0;
    const now = new Date();

    for (const rec of openRecs) {
      let shouldExpire = false;

      if (rec.gallery_id && rec.client_id) {
        const gEng = await this.engagementService.getGalleryClientEngagement(studioId, rec.client_id, rec.gallery_id);

        if (rec.type === ClientFollowUpType.GALLERY_REMINDER && gEng.views_count > 0) {
          shouldExpire = true;
        } else if (rec.type === ClientFollowUpType.SELECTION_REMINDER && gEng.is_selection_completed) {
          shouldExpire = true;
        } else if (rec.type === ClientFollowUpType.DOWNLOAD_REMINDER && gEng.is_download_completed) {
          shouldExpire = true;
        }
      }

      if (shouldExpire) {
        await this.db.clientFollowUpRecommendation.update({
          where: { id: rec.id },
          data: {
            status: ClientFollowUpStatus.EXPIRED,
            resolved_at: now,
            updated_at: now,
          },
        });
        expiredCount++;
      }
    }

    return expiredCount;
  }

  /**
   * List follow-up recommendations with filtering and pagination.
   * Returns a hybrid array with .follow_ups and .total properties attached.
   */
  async listFollowUps(
    studioId: string,
    filters?: ClientFollowUpFilterDTO
  ): Promise<ClientFollowUpRecommendationDTO[] & { follow_ups: ClientFollowUpRecommendationDTO[]; total: number }> {
    const where: any = { studio_id: studioId };

    if (filters?.type) where.type = filters.type;
    if (filters?.status) {
      if (filters.status === ClientFollowUpStatus.PENDING) {
        where.status = { in: [ClientFollowUpStatus.PENDING, 'OPEN', 'PENDING'] };
      } else {
        where.status = filters.status;
      }
    }
    if (filters?.priority) where.priority = filters.priority;
    if (filters?.gallery_id) where.gallery_id = filters.gallery_id;
    if (filters?.client_id) where.client_id = filters.client_id;

    const limit = filters?.limit || 50;
    const offset = filters?.offset || 0;

    const total = (await this.db.clientFollowUpRecommendation?.count?.({ where })) || 0;
    const records = (await this.db.clientFollowUpRecommendation?.findMany?.({
      where,
      orderBy: [{ priority: 'desc' }, { created_at: 'desc' }],
      take: limit,
      skip: offset,
      include: {
        client: true,
        gallery: true,
        drafts: true,
      },
    })) || [];

    const list: any = records.map((rec: any) => ({
      id: rec.id,
      studio_id: rec.studio_id,
      client_id: rec.client_id,
      client_name: rec.client?.name || rec.client?.first_name || 'Client',
      client_email: rec.client?.email || '',
      gallery_id: rec.gallery_id,
      gallery_title: rec.gallery?.title || null,
      type: rec.type as ClientFollowUpType,
      reason: rec.reason,
      title: rec.title,
      suggestedSubject: rec.suggested_subject || rec.title,
      suggested_subject: rec.suggested_subject || rec.title,
      suggestedBody: rec.suggested_body || rec.message_suggestion,
      suggested_body: rec.suggested_body || rec.message_suggestion,
      message_suggestion: rec.message_suggestion || rec.suggested_body,
      messageSuggestion: rec.message_suggestion || rec.suggested_body,
      priority: rec.priority as any,
      status: (rec.status === 'OPEN' ? ClientFollowUpStatus.PENDING : rec.status) as ClientFollowUpStatus,
      dismissedReason: rec.dismissed_reason || rec.dismissedReason || null,
      dismissed_reason: rec.dismissed_reason || rec.dismissedReason || null,
      created_at: rec.created_at,
      updated_at: rec.updated_at,
      resolved_at: rec.resolved_at,
      drafts_count: rec.drafts?.length || 0,
    }));

    list.follow_ups = list;
    list.total = total;

    return list;
  }

  /**
   * Dismiss a follow-up recommendation.
   */
  async dismissFollowUp(
    studioId: string,
    followUpId: string,
    reason?: string
  ): Promise<ClientFollowUpRecommendationDTO & { dismissedReason?: string }> {
    const rec = await this.db.clientFollowUpRecommendation.findFirst({
      where: { id: followUpId, studio_id: studioId },
      include: { client: true, gallery: true },
    });

    if (!rec) {
      throw new Error(`Follow-up recommendation ${followUpId} not found for studio ${studioId}`);
    }

    const updated = await this.db.clientFollowUpRecommendation.update({
      where: { id: followUpId },
      data: {
        status: ClientFollowUpStatus.DISMISSED,
        dismissed_reason: reason || 'Dismissed by photographer',
        resolved_at: new Date(),
        updated_at: new Date(),
      },
      include: { client: true, gallery: true },
    });

    return {
      id: updated.id,
      studio_id: updated.studio_id,
      client_id: updated.client_id,
      client_name: updated.client?.name,
      client_email: updated.client?.email,
      gallery_id: updated.gallery_id,
      gallery_title: updated.gallery?.title,
      type: updated.type as ClientFollowUpType,
      reason: updated.reason,
      title: updated.title,
      suggestedSubject: updated.suggested_subject || updated.title,
      suggestedBody: updated.suggested_body || updated.message_suggestion,
      message_suggestion: updated.message_suggestion,
      priority: updated.priority as any,
      status: ClientFollowUpStatus.DISMISSED,
      dismissedReason: reason || updated.dismissed_reason || 'Dismissed by photographer',
      created_at: updated.created_at,
      updated_at: updated.updated_at,
      resolved_at: updated.resolved_at,
    };
  }
}
