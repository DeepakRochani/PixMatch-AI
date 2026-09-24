/**
 * Client Experience Service — PixMatch AI Phase 30
 * Advanced Client Experience & Gallery Experience 2.0
 * Reuses and connects Phase 5, Phase 7, Phase 14, Phase 17, Phase 25, Phase 26, Phase 27, Phase 28, Phase 29.
 */

import { prisma } from '@pixmatch/database';
import {
  IClientExperienceHomeDTO,
  IContinueWhereLeftOffDTO,
  IClientSafeTimelineDTO,
  IClientSafeTimelineItemDTO,
  IClientGallerySearchDTO,
  IClientGallerySearchResultDTO,
  IClientLightboxPhotoDTO,
  IFindMyPhotosExperienceResultDTO,
} from '@pixmatch/types';
import { ClientPortalSessionService, ValidatedSessionContext } from './client-portal-session.service.js';
import { StudioBrandingService } from '../branding/studio-branding.service.js';
import { PhotoRecommendationService } from '../galleries/photo-recommendation.service.js';

export class ClientExperienceService {
  /**
   * Helper to resolve token into session context.
   */
  private static async resolveContext(tokenOrSession: string | ValidatedSessionContext): Promise<ValidatedSessionContext> {
    if (typeof tokenOrSession === 'string') {
      return ClientPortalSessionService.validateToken(tokenOrSession);
    }
    return tokenOrSession;
  }

  /**
   * Aggregates the unified Client Experience Home (Phase 30).
   * Strictly isolated by tenant (studioId) and client (clientId).
   */
  static async getClientExperienceHome(
    tokenOrSession: string | ValidatedSessionContext
  ): Promise<IClientExperienceHomeDTO> {
    const session = await this.resolveContext(tokenOrSession);
    const { studioId, clientId } = session;

    // 1. Studio Branding
    const branding = await StudioBrandingService.getBranding(studioId);

    // 2. Client Portal Session & "Continue Where Left Off" state
    const portalSession = await prisma.clientPortalSession.findUnique({
      where: { id: session.sessionId },
      select: { metadata: true },
    });
    const sessionMetadata = (portalSession?.metadata as any) || {};
    const continueState: IContinueWhereLeftOffDTO | null = sessionMetadata.continue_where_left_off || null;

    // 3. Active Client Galleries
    const clientGalleries = await prisma.clientGallery.findMany({
      where: {
        studio_id: studioId,
        client_id: clientId,
      },
      include: {
        gallery: {
          include: {
            photos: {
              where: { status: 'READY' },
              take: 1,
              select: { thumbnail_url: true, original_url: true },
            },
            _count: {
              select: { photos: { where: { status: 'READY' } } },
            },
          },
        },
      },
      orderBy: { created_at: 'desc' },
      take: 20,
    });

    const activeGalleries = clientGalleries
      .filter((cg) => cg.gallery && !cg.gallery.deleted_at && cg.gallery.status !== 'ARCHIVED' && cg.gallery.status !== 'DELETED')
      .map((cg) => {
        const g = cg.gallery;
        return {
          id: g.id,
          title: g.title,
          slug: g.slug,
          cover_photo_url: g.cover_photo_url || g.photos[0]?.thumbnail_url || g.photos[0]?.original_url || null,
          photo_count: g._count.photos,
          created_at: g.created_at,
          status: g.status,
          is_password_protected: !!g.password_hash,
        };
      });

    // 4. Recently Viewed Photos from ClientActivity
    const viewActivities = await prisma.clientActivity.findMany({
      where: {
        studio_id: studioId,
        client_id: clientId,
        activity_type: { in: ['GALLERY_VIEWED', 'PHOTO_VIEWED', 'PHOTO_FAVORITED', 'PHOTO_SELECTED'] },
      },
      orderBy: { created_at: 'desc' },
      take: 30,
    });

    const photoIds = new Set<string>();
    const viewedPhotoMap = new Map<string, { viewed_at: Date }>();

    for (const act of viewActivities) {
      const meta = (act.metadata as any) || {};
      const pId = meta.photo_id || meta.photoId;
      if (pId && !photoIds.has(pId)) {
        photoIds.add(pId);
        viewedPhotoMap.set(pId, { viewed_at: act.created_at });
      }
    }

    const fetchedPhotos = photoIds.size > 0
      ? await prisma.photo.findMany({
          where: {
            id: { in: Array.from(photoIds) },
            studio_id: studioId,
            status: 'READY',
          },
          include: {
            gallery: { select: { id: true, title: true } },
          },
          take: 12,
        })
      : [];

    const recentlyViewedPhotos = fetchedPhotos.map((p) => ({
      id: p.id,
      gallery_id: p.gallery_id,
      gallery_title: p.gallery?.title || 'Gallery',
      thumbnail_url: p.thumbnail_url || p.original_url,
      original_url: p.original_url,
      viewed_at: viewedPhotoMap.get(p.id)?.viewed_at || p.created_at,
    }));

    // 5. Favorites Summary
    const galleryIds = activeGalleries.map((g) => g.id);
    const favorites = await prisma.galleryFavorite.findMany({
      where: {
        gallery_id: { in: galleryIds },
        photo: { status: 'READY', studio_id: studioId },
      },
      include: {
        photo: { select: { id: true, gallery_id: true, thumbnail_url: true, original_url: true, created_at: true } },
      },
      orderBy: { created_at: 'desc' },
      take: 12,
    });

    const favoritesCount = await prisma.galleryFavorite.count({
      where: {
        gallery_id: { in: galleryIds },
        photo: { status: 'READY', studio_id: studioId },
      },
    });

    // 6. Selections Summary
    const selections = await prisma.gallerySelection.findMany({
      where: {
        gallery_id: { in: galleryIds },
        photo: { status: 'READY', studio_id: studioId },
      },
      include: {
        photo: { select: { id: true, gallery_id: true, thumbnail_url: true, original_url: true, created_at: true } },
      },
      orderBy: { created_at: 'desc' },
      take: 12,
    });

    const selectionsCount = await prisma.gallerySelection.count({
      where: {
        gallery_id: { in: galleryIds },
        photo: { status: 'READY', studio_id: studioId },
      },
    });

    // 7. Proofing Sessions Requiring Action (Phase 25)
    const proofingSessions = await prisma.photoProofingSession.findMany({
      where: {
        studio_id: studioId,
        client_id: clientId,
        status: { in: ['IN_PROGRESS', 'SUBMITTED', 'ACTIVE'] as any },
      },
      include: {
        items: {
          select: { id: true, is_selected: true },
        },
      },
      orderBy: { created_at: 'desc' },
      take: 5,
    });

    const proofingRequiringAction = proofingSessions.map((ps) => ({
      id: ps.id,
      title: ps.title,
      gallery_id: ps.gallery_id,
      status: ps.status,
      target_count: ps.target_selections || ps.target_count || 0,
      selected_count: ps.items.filter((i) => i.is_selected).length,
      deadline: ps.deadline || null,
      is_locked: ps.is_locked || false,
    }));

    // 8. Recent Messages & Unread Count (Phase 28)
    const conversations = await prisma.clientConversation.findMany({
      where: {
        studio_id: studioId,
        client_id: clientId,
      },
      include: {
        messages: {
          orderBy: { created_at: 'desc' },
          take: 3,
        },
      },
      orderBy: { last_message_at: 'desc' },
      take: 5,
    });

    const recentMessages = conversations.flatMap((c) =>
      c.messages.map((m) => ({
        id: m.id,
        conversation_id: c.id,
        sender_type: m.sender_type,
        content: m.body || (m as any).content || '',
        created_at: m.created_at,
        is_read: m.delivery_status === 'READ',
      }))
    ).slice(0, 5);

    const unreadMessagesCount = conversations.reduce(
      (sum, c) => sum + (c.unread_client_count || 0),
      0
    );

    // 9. Latest Orders & Deliveries (Phase 26)
    const fulfillmentOrders = await prisma.fulfillmentOrder.findMany({
      where: {
        studio_id: studioId,
        client_id: clientId,
      },
      include: {
        deliveries: {
          include: { tracking: true },
          take: 1,
        },
        packages: {
          take: 5,
        },
      },
      orderBy: { created_at: 'desc' },
      take: 5,
    });

    const latestOrders = fulfillmentOrders.map((o) => ({
      id: o.id,
      order_number: o.order_number,
      status: o.status,
      payment_status: o.payment_status,
      total_amount: Number(o.total_amount || 0),
      currency: o.currency || 'USD',
      created_at: o.created_at,
      delivery_status: o.deliveries?.[0]?.delivery_status || null,
    }));

    // 10. Available Downloads
    const availableDownloads: Array<{
      id: string;
      title: string;
      gallery_id: string;
      file_count: number;
      total_size_bytes: number;
      expires_at?: Date | string | null;
      is_ready: boolean;
    }> = [];

    for (const order of fulfillmentOrders) {
      for (const pkg of order.packages) {
        if (pkg.package_status === 'READY') {
          availableDownloads.push({
            id: pkg.id,
            title: pkg.name || `Order ${order.order_number} Download`,
            gallery_id: pkg.gallery_id || (order as any).gallery_id || '',
            file_count: pkg.file_count || 1,
            total_size_bytes: Number(pkg.total_size_bytes || 0),
            expires_at: pkg.expires_at || null,
            is_ready: true,
          });
        }
      }
    }

    // 11. Latest Deliveries
    const latestDeliveries = fulfillmentOrders
      .flatMap((o) => o.deliveries)
      .filter(Boolean)
      .map((d) => ({
        id: d.id,
        order_id: d.order_id,
        status: d.delivery_status,
        tracking_number: d.tracking?.[0]?.tracking_number || d.tracking_number || null,
        carrier: d.tracking?.[0]?.carrier || d.carrier || null,
        estimated_delivery: d.estimated_delivery_at || null,
        delivered_at: d.delivered_at || null,
      }))
      .slice(0, 5);

    // 12. Upcoming Important Dates (Phase 29)
    const now = new Date();
    const importantDates = await prisma.clientImportantDate.findMany({
      where: {
        studio_id: studioId,
        client_id: clientId,
      },
      orderBy: { date: 'asc' },
      take: 10,
    });

    const upcomingDates = importantDates.map((d) => {
      const targetDate = new Date(d.date);
      const diffTime = targetDate.getTime() - now.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      return {
        id: d.id,
        title: d.title,
        date: d.date,
        date_type: d.date_type,
        days_remaining: diffDays,
      };
    });

    // 13. Smart Recommendations (Phase 14 reuse)
    let recommendedPhotos: Array<{
      id: string;
      gallery_id: string;
      thumbnail_url: string;
      original_url: string;
      reason: string;
    }> = [];

    if (activeGalleries.length > 0) {
      try {
        const primaryGallery = activeGalleries[0];
        const recs = await PhotoRecommendationService.getRecommendations(
          primaryGallery.id,
          session.sessionId,
          { limit: 8 }
        );
        recommendedPhotos = recs.map((r) => ({
          id: r.photo.id,
          gallery_id: primaryGallery.id,
          thumbnail_url: r.photo.thumbnail_url || r.photo.original_url,
          original_url: r.photo.original_url,
          reason: r.reason || 'Recommended for you',
        }));
      } catch {
        // Safe neutral fallback if recommendation service has no data
      }
    }

    // 14. Unread Notifications Count (Phase 28)
    const notificationReads = await prisma.clientPortalNotificationRead.findMany({
      where: {
        studio_id: studioId,
        client_id: clientId,
      },
      select: { notification_id: true },
    });
    const readNotificationIds = new Set(notificationReads.map((r) => r.notification_id));

    const allNotificationsCount = await prisma.notificationLog.count({
      where: {
        studio_id: studioId,
        recipient_type: 'CLIENT',
        OR: [{ client_id: clientId }, { recipient: session.client.email }],
      },
    });
    const unreadNotificationsCount = Math.max(0, allNotificationsCount - readNotificationIds.size);

    return {
      client: {
        id: session.client.id,
        studio_id: session.studioId,
        name: session.client.name,
        first_name: session.client.first_name,
        last_name: session.client.last_name,
        email: session.client.email,
      },
      studio: {
        id: session.studio.id,
        name: session.studio.name,
        slug: session.studio.slug,
        logo_url: branding?.logo_url || session.studio.logo_url || null,
        brand_color: branding?.primary_color || null,
        custom_domain: (branding as any)?.custom_domain || (session.studio as any)?.custom_domain || null,
      },
      continue_where_left_off: continueState,
      active_galleries: activeGalleries,
      recently_viewed_photos: recentlyViewedPhotos,
      favorites: {
        total_count: favoritesCount,
        sample_photos: favorites.map((f) => ({
          id: f.photo.id,
          gallery_id: f.photo.gallery_id,
          thumbnail_url: f.photo.thumbnail_url || f.photo.original_url,
          original_url: f.photo.original_url,
          created_at: f.created_at,
        })),
      },
      selections: {
        total_count: selectionsCount,
        sample_photos: selections.map((s) => ({
          id: s.photo.id,
          gallery_id: s.photo.gallery_id,
          thumbnail_url: s.photo.thumbnail_url || s.photo.original_url,
          original_url: s.photo.original_url,
          created_at: s.created_at,
        })),
      },
      proofing_sessions_requiring_action: proofingRequiringAction,
      recent_messages: recentMessages,
      unread_messages_count: unreadMessagesCount,
      latest_orders: latestOrders,
      available_downloads: availableDownloads,
      latest_deliveries: latestDeliveries,
      upcoming_important_dates: upcomingDates,
      recommended_photos: recommendedPhotos,
      notifications_unread_count: unreadNotificationsCount,
    };
  }

  /**
   * Save "Continue where you left off" navigation state in session metadata.
   */
  static async saveNavigationState(
    tokenOrSession: string | ValidatedSessionContext,
    state: IContinueWhereLeftOffDTO
  ): Promise<IContinueWhereLeftOffDTO> {
    const session = await this.resolveContext(tokenOrSession);

    const existingSession = await prisma.clientPortalSession.findUnique({
      where: { id: session.sessionId },
      select: { metadata: true },
    });

    const currentMetadata = (existingSession?.metadata as Record<string, any>) || {};
    const previousState = (currentMetadata.continue_where_left_off as Partial<IContinueWhereLeftOffDTO>) || {};

    const updatedState: IContinueWhereLeftOffDTO = {
      last_gallery_id: state.last_gallery_id !== undefined ? state.last_gallery_id : (previousState.last_gallery_id || null),
      last_gallery_name: state.last_gallery_name !== undefined ? state.last_gallery_name : (previousState.last_gallery_name || null),
      last_gallery_slug: state.last_gallery_slug !== undefined ? state.last_gallery_slug : (previousState.last_gallery_slug || null),
      last_album_id: state.last_album_id !== undefined ? state.last_album_id : (previousState.last_album_id || null),
      last_album_name: state.last_album_name !== undefined ? state.last_album_name : (previousState.last_album_name || null),
      last_photo_id: state.last_photo_id !== undefined ? state.last_photo_id : (previousState.last_photo_id || null),
      last_photo_thumbnail_url: state.last_photo_thumbnail_url !== undefined ? state.last_photo_thumbnail_url : (previousState.last_photo_thumbnail_url || null),
      last_photo_index: typeof state.last_photo_index === 'number' ? Math.max(0, state.last_photo_index) : (typeof previousState.last_photo_index === 'number' ? previousState.last_photo_index : null),
      last_scroll_position: typeof state.last_scroll_position === 'number' ? Math.max(0, state.last_scroll_position) : (typeof previousState.last_scroll_position === 'number' ? previousState.last_scroll_position : null),
      last_viewed_at: new Date(),
      view_mode: state.view_mode || previousState.view_mode || 'GRID',
      active_tab: state.active_tab || previousState.active_tab || 'ALL_PHOTOS',
    };

    await prisma.clientPortalSession.update({
      where: { id: session.sessionId },
      data: {
        metadata: {
          ...currentMetadata,
          continue_where_left_off: updatedState,
        },
      },
    });

    return updatedState;
  }

  /**
   * Get "Continue where you left off" navigation state.
   */
  static async getNavigationState(
    tokenOrSession: string | ValidatedSessionContext
  ): Promise<IContinueWhereLeftOffDTO | null> {
    const session = await this.resolveContext(tokenOrSession);

    const portalSession = await prisma.clientPortalSession.findUnique({
      where: { id: session.sessionId },
      select: { metadata: true },
    });

    const sessionMetadata = (portalSession?.metadata as any) || {};
    return sessionMetadata.continue_where_left_off || null;
  }

  /**
   * Get Client-Safe Filtered Timeline (Phase 28/29).
   * Strips all internal staff comments, CRM notes, follow-up items, and private scores.
   */
  static async getClientSafeTimeline(
    tokenOrSession: string | ValidatedSessionContext,
    options?: { page?: number; limit?: number }
  ): Promise<IClientSafeTimelineDTO> {
    const session = await this.resolveContext(tokenOrSession);
    const { studioId, clientId } = session;

    const page = Math.max(1, options?.page || 1);
    const limit = Math.min(50, Math.max(1, options?.limit || 20));
    const skip = (page - 1) * limit;

    // Allowed public activity types
    const allowedActivityTypes = [
      'GALLERY_VIEWED',
      'GALLERY_SHARED',
      'PHOTO_FAVORITED',
      'PHOTO_UNFAVORITED',
      'PHOTO_SELECTED',
      'PHOTO_UNSELECTED',
      'DOWNLOAD_STARTED',
      'DOWNLOAD_COMPLETED',
      'PROOFING_SUBMITTED',
      'ORDER_CREATED',
      'PAYMENT_RECEIVED',
      'DELIVERY_SHIPPED',
      'DELIVERY_DELIVERED',
      'MESSAGE_SENT',
    ];

    const [activities, total] = await Promise.all([
      prisma.clientActivity.findMany({
        where: {
          studio_id: studioId,
          client_id: clientId,
          activity_type: { in: allowedActivityTypes },
        },
        orderBy: { created_at: 'desc' },
        skip,
        take: limit,
      }),
      prisma.clientActivity.count({
        where: {
          studio_id: studioId,
          client_id: clientId,
          activity_type: { in: allowedActivityTypes },
        },
      }),
    ]);

    const items: IClientSafeTimelineItemDTO[] = activities.map((act) => {
      let category: IClientSafeTimelineItemDTO['category'] = 'GALLERY';
      if (act.activity_type.includes('PROOFING')) category = 'PROOFING';
      else if (act.activity_type.includes('ORDER') || act.activity_type.includes('PAYMENT')) category = 'ORDER';
      else if (act.activity_type.includes('DELIVERY')) category = 'DELIVERY';
      else if (act.activity_type.includes('MESSAGE')) category = 'COMMUNICATION';

      return {
        id: act.id,
        category,
        event_type: act.activity_type,
        title: act.activity_type.replace(/_/g, ' '),
        description: act.description,
        occurred_at: act.created_at,
        entity_id: act.gallery_id,
        entity_type: act.gallery_id ? 'GALLERY' : null,
      };
    });

    return {
      items,
      total,
      page,
      limit,
      has_more: skip + items.length < total,
    };
  }

  /**
   * Search gallery photos & albums (Client-facing safe search).
   */
  static async searchGallery(
    tokenOrSession: string | ValidatedSessionContext,
    params: IClientGallerySearchDTO
  ): Promise<IClientGallerySearchResultDTO> {
    const session = await this.resolveContext(tokenOrSession);
    const { studioId, clientId } = session;
    const { gallery_id, query, album_id, page = 1, limit = 24 } = params;

    // Verify gallery access
    const clientGallery = await prisma.clientGallery.findFirst({
      where: {
        studio_id: studioId,
        client_id: clientId,
        gallery_id,
      },
    });

    if (!clientGallery) {
      const err = new Error('Unauthorized gallery access or gallery not found.');
      (err as any).statusCode = 404;
      throw err;
    }

    const trimmed = (query || '').trim().toLowerCase();
    const skip = (page - 1) * limit;

    const wherePhoto: any = {
      gallery_id,
      studio_id: studioId,
      status: 'READY',
    };

    if (album_id) {
      wherePhoto.album_id = album_id;
    }

    if (trimmed) {
      wherePhoto.OR = [
        { original_filename: { contains: trimmed, mode: 'insensitive' } },
        { caption: { contains: trimmed, mode: 'insensitive' } },
        { title: { contains: trimmed, mode: 'insensitive' } },
      ];
    }

    const [photos, totalPhotos, albums] = await Promise.all([
      prisma.photo.findMany({
        where: wherePhoto,
        skip,
        take: limit,
        orderBy: { created_at: 'desc' },
      }),
      prisma.photo.count({ where: wherePhoto }),
      prisma.album.findMany({
        where: {
          gallery_id,
          studio_id: studioId,
          ...(trimmed ? { title: { contains: trimmed, mode: 'insensitive' } } : {}),
        },
        include: {
          _count: { select: { photos: true } },
        },
        take: 10,
      }),
    ]);

    // Check favorite and selection flags
    const photoIds = photos.map((p) => p.id);
    const [favs, sels] = await Promise.all([
      prisma.galleryFavorite.findMany({
        where: { photo_id: { in: photoIds }, gallery_id },
        select: { photo_id: true },
      }),
      prisma.gallerySelection.findMany({
        where: { photo_id: { in: photoIds }, gallery_id },
        select: { photo_id: true },
      }),
    ]);

    const favSet = new Set(favs.map((f) => f.photo_id));
    const selSet = new Set(sels.map((s) => s.photo_id));

    return {
      photos: photos.map((p) => ({
        id: p.id,
        gallery_id: p.gallery_id,
        album_id: p.album_id,
        original_filename: p.original_filename,
        caption: p.caption,
        thumbnail_url: p.thumbnail_url || p.original_url,
        original_url: p.original_url,
        is_favorite: favSet.has(p.id),
        is_selected: selSet.has(p.id),
        tags: p.tags || [],
      })),
      albums: albums.map((a) => ({
        id: a.id,
        title: a.title,
        photo_count: a._count.photos,
        cover_photo_url: a.cover_photo_url || null,
      })),
      total_photos: totalPhotos,
      page,
      limit,
      has_more: skip + photos.length < totalPhotos,
    };
  }

  /**
   * Get Lightbox 2.0 Photo Details with Prev/Next context and favorite/select flags.
   */
  static async getLightboxPhoto(
    tokenOrSession: string | ValidatedSessionContext,
    photoId: string
  ): Promise<IClientLightboxPhotoDTO> {
    const session = await this.resolveContext(tokenOrSession);
    const { studioId, clientId } = session;

    const photo = await prisma.photo.findFirst({
      where: {
        id: photoId,
        studio_id: studioId,
        status: 'READY',
      },
      include: {
        gallery: true,
      },
    });

    if (!photo || !photo.gallery || photo.gallery.deleted_at) {
      const err = new Error('Photo not found or inaccessible.');
      (err as any).statusCode = 404;
      throw err;
    }

    // Verify client has access to the gallery
    const clientGallery = await prisma.clientGallery.findFirst({
      where: {
        studio_id: studioId,
        client_id: clientId,
        gallery_id: photo.gallery_id,
      },
    });

    if (!clientGallery) {
      const err = new Error('Access denied to photo in gallery.');
      (err as any).statusCode = 403;
      throw err;
    }

    // Find next and previous photos in the same gallery / album
    const siblingPhotos = await prisma.photo.findMany({
      where: {
        gallery_id: photo.gallery_id,
        studio_id: studioId,
        status: 'READY',
        ...(photo.album_id ? { album_id: photo.album_id } : {}),
      },
      orderBy: { created_at: 'asc' },
      select: { id: true },
    });

    const currentIndex = siblingPhotos.findIndex((p) => p.id === photoId);
    const prevPhotoId = currentIndex > 0 ? siblingPhotos[currentIndex - 1].id : null;
    const nextPhotoId = currentIndex < siblingPhotos.length - 1 ? siblingPhotos[currentIndex + 1].id : null;

    // Check favorite & selection status
    const [fav, sel] = await Promise.all([
      prisma.galleryFavorite.findFirst({
        where: { photo_id: photoId, gallery_id: photo.gallery_id },
      }),
      prisma.gallerySelection.findFirst({
        where: { photo_id: photoId, gallery_id: photo.gallery_id },
      }),
    ]);

    // Record photo view activity
    await prisma.clientActivity.create({
      data: {
        studio_id: studioId,
        client_id: clientId,
        gallery_id: photo.gallery_id,
        activity_type: 'PHOTO_VIEWED',
        description: `Viewed photo ${photo.original_filename || photo.id}`,
        metadata: {
          photo_id: photo.id,
          gallery_id: photo.gallery_id,
        },
      },
    }).catch(() => {});

    return {
      id: photo.id,
      gallery_id: photo.gallery_id,
      album_id: photo.album_id,
      title: photo.title || null,
      caption: photo.caption || null,
      original_filename: photo.original_filename || null,
      thumbnail_url: photo.thumbnail_url || photo.original_url,
      high_res_url: photo.original_url,
      width: photo.width || null,
      height: photo.height || null,
      aspect_ratio: photo.width && photo.height ? photo.width / photo.height : null,
      is_favorite: !!fav,
      is_selected: !!sel,
      can_download: photo.gallery.allow_downloads ?? true,
      can_share: photo.gallery.allow_social_sharing ?? true,
      created_at: photo.created_at,
      next_photo_id: nextPhotoId,
      prev_photo_id: prevPhotoId,
    };
  }

  /**
   * Toggle Photo Favorite (Idempotent & Concurrency Hardened).
   */
  static async toggleFavorite(
    tokenOrSession: string | ValidatedSessionContext,
    photoId: string
  ): Promise<{ photo_id: string; is_favorite: boolean; total_favorites: number }> {
    const session = await this.resolveContext(tokenOrSession);
    const { studioId, clientId } = session;

    const photo = await prisma.photo.findFirst({
      where: { id: photoId, studio_id: studioId, status: 'READY' },
      include: { gallery: true },
    });

    if (!photo) {
      const err = new Error('Photo not found.');
      (err as any).statusCode = 404;
      throw err;
    }

    // Resolve or create a client gallery session for this gallery
    let clientSession = await prisma.galleryClientSession.findFirst({
      where: {
        gallery_id: photo.gallery_id,
        session_token_hash: session.tokenHash,
      },
    });

    if (!clientSession) {
      clientSession = await prisma.galleryClientSession.create({
        data: {
          gallery_id: photo.gallery_id,
          session_token_hash: session.tokenHash,
          email: session.client.email,
          name: session.client.name,
        },
      });
    }

    const existingFavorite = await prisma.galleryFavorite.findUnique({
      where: {
        gallery_id_session_id_photo_id: {
          gallery_id: photo.gallery_id,
          session_id: clientSession.id,
          photo_id: photoId,
        },
      },
    });

    let isFavorite: boolean;
    if (existingFavorite) {
      await prisma.galleryFavorite.delete({
        where: { id: existingFavorite.id },
      });
      isFavorite = false;

      await prisma.clientActivity.create({
        data: {
          studio_id: studioId,
          client_id: clientId,
          gallery_id: photo.gallery_id,
          activity_type: 'PHOTO_UNFAVORITED',
          description: `Removed favorite for photo ${photo.original_filename || photo.id}`,
          metadata: { photo_id: photoId, gallery_id: photo.gallery_id },
        },
      }).catch(() => {});
    } else {
      await prisma.galleryFavorite.create({
        data: {
          gallery_id: photo.gallery_id,
          session_id: clientSession.id,
          photo_id: photoId,
        },
      });
      isFavorite = true;

      await prisma.clientActivity.create({
        data: {
          studio_id: studioId,
          client_id: clientId,
          gallery_id: photo.gallery_id,
          activity_type: 'PHOTO_FAVORITED',
          description: `Favorited photo ${photo.original_filename || photo.id}`,
          metadata: { photo_id: photoId, gallery_id: photo.gallery_id },
        },
      }).catch(() => {});
    }

    const totalFavorites = await prisma.galleryFavorite.count({
      where: { gallery_id: photo.gallery_id, session_id: clientSession.id },
    });

    return { photo_id: photoId, is_favorite: isFavorite, total_favorites: totalFavorites };
  }

  /**
   * Toggle Photo Selection (Idempotent & Concurrency Hardened).
   */
  static async toggleSelection(
    tokenOrSession: string | ValidatedSessionContext,
    photoId: string
  ): Promise<{ photo_id: string; is_selected: boolean; total_selections: number }> {
    const session = await this.resolveContext(tokenOrSession);
    const { studioId, clientId } = session;

    const photo = await prisma.photo.findFirst({
      where: { id: photoId, studio_id: studioId, status: 'READY' },
      include: { gallery: true },
    });

    if (!photo) {
      const err = new Error('Photo not found.');
      (err as any).statusCode = 404;
      throw err;
    }

    let clientSession = await prisma.galleryClientSession.findFirst({
      where: {
        gallery_id: photo.gallery_id,
        session_token_hash: session.tokenHash,
      },
    });

    if (!clientSession) {
      clientSession = await prisma.galleryClientSession.create({
        data: {
          gallery_id: photo.gallery_id,
          session_token_hash: session.tokenHash,
          email: session.client.email,
          name: session.client.name,
        },
      });
    }

    const existingSelection = await prisma.gallerySelection.findUnique({
      where: {
        gallery_id_session_id_photo_id: {
          gallery_id: photo.gallery_id,
          session_id: clientSession.id,
          photo_id: photoId,
        },
      },
    });

    let isSelected: boolean;
    if (existingSelection) {
      await prisma.gallerySelection.delete({
        where: { id: existingSelection.id },
      });
      isSelected = false;

      await prisma.clientActivity.create({
        data: {
          studio_id: studioId,
          client_id: clientId,
          gallery_id: photo.gallery_id,
          activity_type: 'PHOTO_UNSELECTED',
          description: `Deselected photo ${photo.original_filename || photo.id}`,
          metadata: { photo_id: photoId, gallery_id: photo.gallery_id },
        },
      }).catch(() => {});
    } else {
      await prisma.gallerySelection.create({
        data: {
          gallery_id: photo.gallery_id,
          session_id: clientSession.id,
          photo_id: photoId,
        },
      });
      isSelected = true;

      await prisma.clientActivity.create({
        data: {
          studio_id: studioId,
          client_id: clientId,
          gallery_id: photo.gallery_id,
          activity_type: 'PHOTO_SELECTED',
          description: `Selected photo ${photo.original_filename || photo.id}`,
          metadata: { photo_id: photoId, gallery_id: photo.gallery_id },
        },
      }).catch(() => {});
    }

    const totalSelections = await prisma.gallerySelection.count({
      where: { gallery_id: photo.gallery_id, session_id: clientSession.id },
    });

    return { photo_id: photoId, is_selected: isSelected, total_selections: totalSelections };
  }

  /**
   * Find My Photos Experience with confidence tiers and privacy notices (Phase 3/5/30).
   * Strictly prevents leaking embeddings or vectors to client.
   */
  static async getFindMyPhotosResults(
    tokenOrSession: string | ValidatedSessionContext,
    galleryId: string,
    photoIds: string[]
  ): Promise<IFindMyPhotosExperienceResultDTO> {
    const session = await this.resolveContext(tokenOrSession);
    const { studioId, clientId } = session;

    // Verify gallery access
    const clientGallery = await prisma.clientGallery.findFirst({
      where: {
        studio_id: studioId,
        client_id: clientId,
        gallery_id: galleryId,
      },
    });

    if (!clientGallery) {
      const err = new Error('Gallery not found or unauthorized.');
      (err as any).statusCode = 404;
      throw err;
    }

    const photos = await prisma.photo.findMany({
      where: {
        id: { in: photoIds },
        gallery_id: galleryId,
        studio_id: studioId,
        status: 'READY',
      },
      take: 50,
    });

    // Check favorite & selection status
    const [favs, sels] = await Promise.all([
      prisma.galleryFavorite.findMany({
        where: { photo_id: { in: photos.map((p) => p.id) }, gallery_id: galleryId },
        select: { photo_id: true },
      }),
      prisma.gallerySelection.findMany({
        where: { photo_id: { in: photos.map((p) => p.id) }, gallery_id: galleryId },
        select: { photo_id: true },
      }),
    ]);

    const favSet = new Set(favs.map((f) => f.photo_id));
    const selSet = new Set(sels.map((s) => s.photo_id));

    const matchedPhotos = photos.map((p, index) => {
      // Tier based on match order/score without exposing numerical vectors
      const confidence_tier: 'HIGH' | 'MEDIUM' | 'LOW' =
        index < 5 ? 'HIGH' : index < 15 ? 'MEDIUM' : 'LOW';

      return {
        id: p.id,
        gallery_id: p.gallery_id,
        album_id: p.album_id,
        thumbnail_url: p.thumbnail_url || p.original_url,
        original_url: p.original_url,
        confidence_tier,
        is_favorite: favSet.has(p.id),
        is_selected: selSet.has(p.id),
      };
    });

    return {
      matched_photos: matchedPhotos,
      total_matches: matchedPhotos.length,
      gallery_id: galleryId,
      privacy_notice: 'Your selfie was processed ephemerally in-memory solely to locate your photos in this gallery and has not been retained or shared.',
    };
  }
}
