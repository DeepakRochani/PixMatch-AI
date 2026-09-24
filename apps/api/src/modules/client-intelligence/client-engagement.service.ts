/**
 * Client Engagement Service — PIXMatch AI Phase 17
 * Deterministic, product-activity based client engagement scoring and state classification.
 * Strictly calculates score from verified platform activity without emotional or psychological inference.
 */

import { prisma, ClientStatus, DeliveryStatus } from '@pixmatch/database';
import {
  ClientEngagementProfileDTO,
  ClientEngagementState,
  GalleryClientEngagementDTO,
} from '@pixmatch/types';

export class ClientEngagementService {
  private db: any;

  constructor(dbClient?: any) {
    this.db = dbClient || prisma;
  }

  private static defaultInstance = new ClientEngagementService();

  static async calculateClientEngagement(studioId: string, clientId: string): Promise<ClientEngagementProfileDTO> {
    return this.defaultInstance.calculateClientEngagement(studioId, clientId);
  }

  /**
   * Recency decay multiplier based on elapsed days since activity event.
   */
  static getRecencyMultiplier(activityDate: Date, now: Date = new Date()): { multiplier: number; category: string } {
    const diffMs = now.getTime() - activityDate.getTime();
    const diffDays = Math.max(0, diffMs / (1000 * 60 * 60 * 24));

    if (diffDays <= 7) return { multiplier: 1.0, category: '<=7d' };
    if (diffDays <= 30) return { multiplier: 0.75, category: '8-30d' };
    if (diffDays <= 90) return { multiplier: 0.40, category: '31-90d' };
    return { multiplier: 0.15, category: '>90d' };
  }

  calculateRecencyMultiplier(activityDate: Date, now: Date = new Date()): { multiplier: number; category: string } {
    return ClientEngagementService.getRecencyMultiplier(activityDate, now);
  }

  /**
   * Classify engagement state based on normalized score, activity recency, and lifecycle status.
   */
  static classifyState(
    score: number,
    totalActivities: number,
    completedGalleries: number,
    lastActivityAt?: Date | null,
    now: Date = new Date()
  ): ClientEngagementState {
    if (score >= 75) return ClientEngagementState.ENGAGED;
    if (score >= 50) return ClientEngagementState.ACTIVE;
    if (score >= 25) return ClientEngagementState.LOW_ENGAGEMENT;
    if (score >= 1) return ClientEngagementState.AT_RISK;

    // Score is 0
    if (totalActivities === 0) {
      return ClientEngagementState.NEW;
    }

    if (completedGalleries > 0 && lastActivityAt) {
      const daysSince = (now.getTime() - new Date(lastActivityAt).getTime()) / (1000 * 60 * 60 * 24);
      if (daysSince > 60) {
        return ClientEngagementState.COMPLETED;
      }
    }

    return ClientEngagementState.INACTIVE;
  }

  determineEngagementState(
    score: number,
    totalActivities: number,
    completedGalleries: number,
    _downloads: number,
    lastActivityAt?: Date | null,
    now: Date = new Date()
  ): ClientEngagementState {
    return ClientEngagementService.classifyState(score, totalActivities, completedGalleries, lastActivityAt, now);
  }

  /**
   * Alias for calculateClientEngagement
   */
  async calculateAndPersistProfile(studioId: string, clientId: string): Promise<ClientEngagementProfileDTO> {
    return this.calculateClientEngagement(studioId, clientId);
  }

  /**
   * Get existing engagement profile or calculate if not present.
   */
  async getEngagementProfile(studioId: string, clientId: string): Promise<ClientEngagementProfileDTO> {
    const existing = await this.db.clientEngagementProfile?.findFirst?.({
      where: { client_id: clientId, studio_id: studioId },
    });

    if (existing) {
      const recency = existing.last_activity_at
        ? ClientEngagementService.getRecencyMultiplier(new Date(existing.last_activity_at))
        : { multiplier: 1.0, category: '<=7d' };

      const visitsScore = Math.min(30, Math.round((existing.total_gallery_views + existing.total_photo_views * 0.5) * recency.multiplier * 10) / 10);
      const curationScore = Math.min(35, Math.round((existing.total_favorites * 3 + existing.total_selections * 4) * recency.multiplier * 10) / 10);
      const downloadScore = Math.min(35, Math.round((existing.total_downloads * 5) * recency.multiplier * 10) / 10);

      return {
        id: existing.id,
        studio_id: existing.studio_id,
        client_id: existing.client_id,
        engagement_score: existing.engagement_score,
        engagement_state: existing.engagement_state as ClientEngagementState,
        last_activity_at: existing.last_activity_at,
        first_activity_at: existing.first_activity_at,
        total_gallery_views: existing.total_gallery_views,
        total_photo_views: existing.total_photo_views,
        total_favorites: existing.total_favorites,
        total_selections: existing.total_selections,
        total_downloads: existing.total_downloads,
        total_find_my_photos: existing.total_find_my_photos,
        total_galleries: existing.total_galleries,
        completed_galleries: existing.completed_galleries,
        updated_at: existing.updated_at,
        studioId: existing.studio_id,
        clientId: existing.client_id,
        engagementScore: existing.engagement_score,
        state: existing.engagement_state as ClientEngagementState,
        lastActivityAt: existing.last_activity_at,
        firstActivityAt: existing.first_activity_at,
        totalVisits: existing.total_gallery_views,
        totalPhotoViews: existing.total_photo_views,
        totalFavorites: existing.total_favorites,
        totalSelections: existing.total_selections,
        totalDownloads: existing.total_downloads,
        totalFindMyPhotos: existing.total_find_my_photos,
        totalGalleries: existing.total_galleries,
        completedGalleries: existing.completed_galleries,
        recencyCategory: recency.category as any,
        scoreComponents: {
          visitsScore,
          curationScore,
          downloadScore,
          recencyMultiplier: recency.multiplier,
        },
      } as any;
    }

    return this.calculateClientEngagement(studioId, clientId);
  }

  /**
   * Calculate deterministic engagement score (0-100) and update/persist ClientEngagementProfile.
   */
  async calculateClientEngagement(studioId: string, clientId: string): Promise<ClientEngagementProfileDTO> {
    const client = await this.db.client.findFirst({
      where: { id: clientId, studio_id: studioId },
      include: {
        galleries: {
          include: {
            gallery: true,
          },
        },
        activities: {
          orderBy: { created_at: 'desc' },
        },
        deliveries: true,
      },
    });

    if (!client) {
      throw new Error(`Client ${clientId} not found for studio ${studioId}`);
    }

    const now = new Date();
    // Retrieve activities either from relation or direct query
    let activities = client.activities || [];
    if (activities.length === 0 && this.db.clientActivity?.findMany) {
      activities = await this.db.clientActivity.findMany({
        where: { client_id: clientId, studio_id: studioId },
      });
    }

    // Retrieve assigned galleries
    let assignedGalleries = client.galleries || [];
    if (assignedGalleries.length === 0 && this.db.clientGalleryAssignment?.findMany) {
      assignedGalleries = await this.db.clientGalleryAssignment.findMany({
        where: { client_id: clientId },
      });
    }

    const deliveries = client.deliveries || [];

    let totalGalleryViews = 0;
    let totalPhotoViews = 0;
    let totalFavorites = 0;
    let totalSelections = 0;
    let totalDownloads = 0;
    let totalFindMyPhotos = 0;
    let completedGalleries = 0;

    let weightedPoints = 0;
    let firstActivityAt: Date | null = null;
    let lastActivityAt: Date | null = null;

    for (const act of activities) {
      const actDate = new Date(act.created_at);
      if (!firstActivityAt || actDate < firstActivityAt) firstActivityAt = actDate;
      if (!lastActivityAt || actDate > lastActivityAt) lastActivityAt = actDate;

      const { multiplier: decay } = ClientEngagementService.getRecencyMultiplier(actDate, now);
      const actType = (act.activity_type || '').toUpperCase();

      if (actType.includes('VIEW') || actType === 'GALLERY_VIEWED' || actType === 'GALLERY_VIEW') {
        totalGalleryViews++;
        weightedPoints += 1 * decay;
      } else if (actType.includes('PHOTO_VIEW') || actType === 'PHOTO_VIEWED') {
        totalPhotoViews++;
        weightedPoints += 1 * decay;
      } else if (actType.includes('FAVORITE') || actType === 'PHOTO_FAVORITED' || actType === 'PHOTO_FAVORITE') {
        totalFavorites++;
        weightedPoints += 3 * decay;
      } else if (actType.includes('SELECT') || actType === 'PHOTO_SELECTED' || actType === 'PHOTO_SELECT') {
        totalSelections++;
        weightedPoints += 4 * decay;
      } else if (actType.includes('DOWNLOAD') || actType === 'DOWNLOAD_COMPLETED' || actType === 'PHOTO_DOWNLOAD') {
        totalDownloads++;
        weightedPoints += 5 * decay;
      } else if (actType.includes('FIND') || actType.includes('FACE_SEARCH') || actType === 'FIND_MY_PHOTOS_USED') {
        totalFindMyPhotos++;
        weightedPoints += 2 * decay;
      } else {
        weightedPoints += 0.5 * decay;
      }
    }

    // Check delivery activity
    for (const del of deliveries) {
      if (del.opened_at) {
        const openedDate = new Date(del.opened_at);
        if (!firstActivityAt || openedDate < firstActivityAt) firstActivityAt = openedDate;
        if (!lastActivityAt || openedDate > lastActivityAt) lastActivityAt = openedDate;
        const { multiplier: decay } = ClientEngagementService.getRecencyMultiplier(openedDate, now);
        weightedPoints += 2 * decay;
      }
    }

    // Check gallery completion states
    for (const cg of assignedGalleries) {
      const g = cg.gallery;
      if (g && (g.status === 'COMPLETED' || g.status === 'ARCHIVED')) {
        completedGalleries++;
      }
    }

    // Target ~15-20 weighted points maps to full 100 engagement
    const rawScore = weightedPoints > 0 ? (weightedPoints / 15) * 100 : 0;
    const engagementScore = Math.min(100, Math.round(rawScore * 10) / 10);

    const engagementState = ClientEngagementService.classifyState(
      engagementScore,
      activities.length,
      completedGalleries,
      lastActivityAt,
      now
    );

    const recencyInfo = lastActivityAt
      ? ClientEngagementService.getRecencyMultiplier(lastActivityAt, now)
      : { multiplier: 1.0, category: '<=7d' };

    const visitsScore = Math.min(30, Math.round((totalGalleryViews * 3 + totalPhotoViews) * recencyInfo.multiplier * 10) / 10);
    const curationScore = Math.min(35, Math.round((totalFavorites * 3 + totalSelections * 4) * recencyInfo.multiplier * 10) / 10);
    const downloadScore = Math.min(35, Math.round((totalDownloads * 5) * recencyInfo.multiplier * 10) / 10);

    const profileData: any = {
      studio_id: studioId,
      client_id: clientId,
      engagement_score: engagementScore,
      engagement_state: engagementState,
      last_activity_at: lastActivityAt,
      first_activity_at: firstActivityAt,
      total_gallery_views: totalGalleryViews,
      total_photo_views: totalPhotoViews,
      total_favorites: totalFavorites,
      total_selections: totalSelections,
      total_downloads: totalDownloads,
      total_find_my_photos: totalFindMyPhotos,
      total_galleries: assignedGalleries.length,
      completed_galleries: completedGalleries,
      updated_at: now,
    };

    let profile: any = null;
    if (this.db.clientEngagementProfile?.upsert) {
      profile = await this.db.clientEngagementProfile.upsert({
        where: {
          client_id: clientId,
        },
        create: profileData,
        update: profileData,
      });
    } else if (this.db.clientEngagementProfile?.findFirst) {
      const existing = await this.db.clientEngagementProfile.findFirst({
        where: { client_id: clientId, studio_id: studioId },
      });
      if (existing) {
        profile = await this.db.clientEngagementProfile.update({
          where: { id: existing.id },
          data: profileData,
        });
      } else {
        profile = await this.db.clientEngagementProfile.create({
          data: { id: `eng-${clientId}`, ...profileData },
        });
      }
    } else {
      profile = { id: `eng-${clientId}`, ...profileData };
    }

    return {
      id: profile.id || `eng-${clientId}`,
      studio_id: studioId,
      client_id: clientId,
      engagement_score: profile.engagement_score,
      engagement_state: profile.engagement_state as ClientEngagementState,
      last_activity_at: profile.last_activity_at,
      first_activity_at: profile.first_activity_at,
      total_gallery_views: profile.total_gallery_views,
      total_photo_views: profile.total_photo_views,
      total_favorites: profile.total_favorites,
      total_selections: profile.total_selections,
      total_downloads: profile.total_downloads,
      total_find_my_photos: profile.total_find_my_photos,
      total_galleries: profile.total_galleries,
      completed_galleries: profile.completed_galleries,
      updated_at: profile.updated_at,
      studioId: studioId,
      clientId: clientId,
      engagementScore: profile.engagement_score,
      state: profile.engagement_state as ClientEngagementState,
      lastActivityAt: profile.last_activity_at,
      firstActivityAt: profile.first_activity_at,
      totalVisits: profile.total_gallery_views,
      totalPhotoViews: profile.total_photo_views,
      totalFavorites: profile.total_favorites,
      totalSelections: profile.total_selections,
      totalDownloads: profile.total_downloads,
      totalFindMyPhotos: profile.total_find_my_photos,
      totalGalleries: profile.total_galleries,
      completedGalleries: profile.completed_galleries,
      recencyCategory: recencyInfo.category as any,
      scoreComponents: {
        visitsScore,
        curationScore,
        downloadScore,
        recencyMultiplier: recencyInfo.multiplier,
      },
    } as any;
  }

  /**
   * Calculate gallery-specific engagement metrics for a client.
   */
  async getGalleryClientEngagement(
    studioId: string,
    clientId: string,
    galleryId: string
  ): Promise<GalleryClientEngagementDTO> {
    const gallery = await this.db.gallery.findFirst({
      where: { id: galleryId, studio_id: studioId },
      include: {
        photos: {
          select: { id: true, is_favorite: true, is_selected: true },
        },
        favorites: {
          where: { client_id: clientId },
        },
        selections: {
          where: { client_id: clientId },
        },
        download_jobs: {
          where: { client_id: clientId },
        },
        client_sessions: {
          where: { client_id: clientId },
        },
      },
    });

    if (!gallery) {
      throw new Error(`Gallery ${galleryId} not found for studio ${studioId}`);
    }

    const delivery = await this.db.galleryDelivery?.findFirst?.({
      where: { gallery_id: galleryId, client_id: clientId, studio_id: studioId },
      orderBy: { sent_at: 'desc' },
    });

    const activities = (await this.db.clientActivity?.findMany?.({
      where: { gallery_id: galleryId, client_id: clientId, studio_id: studioId },
      orderBy: { created_at: 'desc' },
    })) || [];

    const totalPhotos = gallery.photos?.length || 0;
    const favoritesCount = (gallery.favorites?.length || 0) + activities.filter((a: any) => (a.activity_type || '').includes('FAVORITE')).length;
    const selectionsCount = (gallery.selections?.length || 0) + activities.filter((a: any) => (a.activity_type || '').includes('SELECT')).length;
    const downloadsCount = (gallery.download_jobs?.length || 0) + activities.filter((a: any) => (a.activity_type || '').includes('DOWNLOAD')).length;
    const uniqueSessions = Math.max(1, (gallery.client_sessions?.length || 0) + (activities.length > 0 ? 1 : 0));
    const viewsCount = activities.filter((a: any) => (a.activity_type || '').includes('VIEW')).length;

    const isSelectionCompleted = selectionsCount > 0;
    const isDownloadCompleted = downloadsCount > 0;

    let completionPercentage = 0;
    if (delivery?.opened_at || viewsCount > 0) completionPercentage += 25;
    if (favoritesCount > 0) completionPercentage += 25;
    if (isSelectionCompleted) completionPercentage += 25;
    if (isDownloadCompleted) completionPercentage += 25;

    const lastActivity = activities.length > 0 ? activities[0].created_at : delivery?.opened_at || delivery?.sent_at;

    return {
      gallery_id: gallery.id,
      galleryId: gallery.id,
      gallery_title: gallery.title,
      galleryTitle: gallery.title,
      gallery_status: gallery.status,
      galleryStatus: gallery.status,
      delivery_status: delivery ? delivery.status : null,
      deliveryStatus: delivery ? delivery.status : null,
      delivered_at: delivery ? delivery.sent_at : null,
      deliveredAt: delivery ? delivery.sent_at : null,
      last_activity_at: lastActivity || null,
      lastActivityAt: lastActivity || null,
      views_count: Math.max(viewsCount, delivery?.opened_at ? 1 : 0),
      viewsCount: Math.max(viewsCount, delivery?.opened_at ? 1 : 0),
      visit_count: Math.max(viewsCount, delivery?.opened_at ? 1 : 0),
      visitCount: Math.max(viewsCount, delivery?.opened_at ? 1 : 0),
      unique_sessions_count: uniqueSessions,
      uniqueSessionsCount: uniqueSessions,
      photo_views_count: activities.filter((a: any) => (a.activity_type || '').includes('PHOTO_VIEW')).length,
      photoViewsCount: activities.filter((a: any) => (a.activity_type || '').includes('PHOTO_VIEW')).length,
      favorites_count: favoritesCount,
      favoritesCount: favoritesCount,
      favorite_count: favoritesCount,
      favoriteCount: favoritesCount,
      selections_count: selectionsCount,
      selectionsCount: selectionsCount,
      selection_count: selectionsCount,
      selectionCount: selectionsCount,
      downloads_count: downloadsCount,
      downloadsCount: downloadsCount,
      download_count: downloadsCount,
      downloadCount: downloadsCount,
      find_my_photos_count: activities.filter((a: any) => (a.activity_type || '').includes('FIND')).length,
      findMyPhotosCount: activities.filter((a: any) => (a.activity_type || '').includes('FIND')).length,
      is_selection_completed: isSelectionCompleted,
      isSelectionCompleted: isSelectionCompleted,
      is_download_completed: isDownloadCompleted,
      isDownloadCompleted: isDownloadCompleted,
      completion_percentage: completionPercentage,
      completionPercentage: completionPercentage,
    } as any;
  }

  /**
   * List all gallery engagement metrics for a client.
   */
  async listClientGalleriesEngagement(
    studioId: string,
    clientId: string
  ): Promise<GalleryClientEngagementDTO[]> {
    const clientGalleries = (await this.db.clientGalleryAssignment?.findMany?.({
      where: { client_id: clientId },
      include: { gallery: true },
    })) || [];

    const results: GalleryClientEngagementDTO[] = [];
    for (const cg of clientGalleries) {
      if (cg.gallery_id) {
        try {
          const gEng = await this.getGalleryClientEngagement(studioId, clientId, cg.gallery_id);
          results.push(gEng);
        } catch {
          // Skip if missing
        }
      }
    }

    return results;
  }

  /**
   * Bulk recalculate all engagement profiles for a studio.
   */
  async bulkRecalculateStudio(studioId: string): Promise<{ processedCount: number }> {
    const clients = (await this.db.client.findMany({
      where: { studio_id: studioId },
      select: { id: true },
    })) || [];

    let processed = 0;
    for (const c of clients) {
      await this.calculateClientEngagement(studioId, c.id);
      processed++;
    }

    return { processedCount: processed };
  }
}
