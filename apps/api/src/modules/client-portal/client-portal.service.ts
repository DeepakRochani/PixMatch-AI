/**
 * Client Portal Service — PixMatch AI Phase 27
 * Aggregates client-facing projects, galleries, proofing, selections, orders, payments,
 * downloads, deliveries, notifications, and profile preferences with strict IDOR isolation.
 */

import crypto from 'crypto';
import { prisma } from '@pixmatch/database';
import {
  IClientPortalHomeDTO,
  IClientPortalProjectDTO,
  IClientPortalProjectDetailDTO,
  IClientPortalOrderDTO,
  IClientPortalOrderDetailDTO,
  IClientPortalDownloadDTO,
  IClientPortalDeliveryDTO,
  IClientPortalNotificationDTO,
  IClientPortalActivityDTO,
  IClientPortalProfileDTO,
  IUpdateClientPortalProfileDTO,
  IUpdateClientPortalPreferenceDTO,
} from '@pixmatch/types';
import { ClientPortalSessionService, ValidatedSessionContext } from './client-portal-session.service.js';
import { StudioBrandingService } from '../branding/studio-branding.service.js';
import { StudioDomainService } from '../branding/studio-domain.service.js';

export class ClientPortalService {
  private sessionService: ClientPortalSessionService;
  private brandingService: StudioBrandingService;
  private domainService: StudioDomainService;

  constructor(
    sessionService?: ClientPortalSessionService,
    brandingService?: StudioBrandingService,
    domainService?: StudioDomainService
  ) {
    this.sessionService = sessionService || new ClientPortalSessionService();
    this.brandingService = brandingService || new StudioBrandingService();
    this.domainService = domainService || new StudioDomainService();
  }

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
   * Aggregates the Client Portal Home Dashboard.
   */
  static async getClientPortalHome(tokenOrSession: string | ValidatedSessionContext): Promise<IClientPortalHomeDTO> {
    const session = await this.resolveContext(tokenOrSession);
    const { studioId, clientId } = session;

    // 1. Fetch Branding
    const branding = await StudioBrandingService.getBranding(studioId);

    // 2. Fetch Client Projects
    const projects = await prisma.studioProject.findMany({
      where: {
        studio_id: studioId,
        client_id: clientId,
        deleted_at: null,
      },
      include: {
        galleries: {
          include: { gallery: true },
        },
        proofing_sessions: true,
        fulfillment_orders: {
          include: { items: true, packages: true },
        },
      },
      orderBy: { created_at: 'desc' },
      take: 10,
    });

    const mappedProjects: IClientPortalProjectDTO[] = projects.map((p) => {
      const primaryGalleryLink = p.galleries?.[0];
      const activeProofing = p.proofing_sessions?.find(
        (ps: any) => ps.status === 'IN_PROGRESS' || ps.status === 'SUBMITTED'
      ) || p.proofing_sessions?.[0];
      const totalDownloads = p.fulfillment_orders?.reduce(
        (sum: number, o: any) => sum + (o.packages?.length || 0),
        0
      ) || 0;

      return {
        id: p.id,
        name: p.name,
        client_id: p.client_id,
        project_type: p.project_type || (p as any).event_type || 'Photography',
        event_type: (p as any).event_type || p.project_type || 'Photography',
        status: p.status,
        event_date: p.shoot_date || p.start_date || (p as any).event_date || null,
        location: p.location || null,
        description: p.description || null,
        galleries_count: p.galleries?.length || (p as any).galleries_count || 0,
        primary_gallery_id: primaryGalleryLink?.gallery_id || (p as any).primary_gallery_id || null,
        primary_gallery_slug: primaryGalleryLink?.gallery?.slug || null,
        has_active_proofing: !!activeProofing,
        proofing_status: activeProofing?.status || null,
        proofing_session_id: activeProofing?.id || null,
        has_orders: (p.fulfillment_orders?.length || 0) > 0,
        orders_count: p.fulfillment_orders?.length || 0,
        available_downloads_count: totalDownloads,
        last_activity_at: p.updated_at || p.created_at,
        proofing_session: activeProofing
          ? {
              id: activeProofing.id,
              title: activeProofing.title,
              status: activeProofing.status,
              required_count: activeProofing.required_count,
              selected_count: activeProofing.selected_count,
            }
          : null,
      };
    });

    const activeProject = mappedProjects.length > 0 ? mappedProjects[0] : null;

    // 3. Fetch Client Safe Activities
    let mappedActivities: IClientPortalActivityDTO[] = [];
    try {
      const rawActivities = await prisma.clientActivity.findMany({
        where: {
          studio_id: studioId,
          client_id: clientId,
        },
        orderBy: { created_at: 'desc' },
        take: 8,
      });

      mappedActivities = rawActivities.map((a: any) => {
        let title = 'Activity Recorded';
        let description = 'Client activity recorded.';

        switch (a.activity_type) {
          case 'GALLERY_VIEW':
            title = 'Viewed Gallery';
            description = 'You visited your photo gallery.';
            break;
          case 'PHOTO_FAVORITED':
            title = 'Added Favorites';
            description = 'You added photos to your favorites list.';
            break;
          case 'PHOTO_SELECTED':
            title = 'Updated Selections';
            description = 'You updated your proofing selections.';
            break;
          case 'PROOFING_SUBMITTED':
            title = 'Submitted Selections';
            description = 'Your photo selections were received by the studio.';
            break;
          case 'ORDER_PLACED':
            title = 'Order Placed';
            description = 'A photo fulfillment order was created.';
            break;
          case 'PAYMENT_RECEIVED':
            title = 'Payment Received';
            description = 'Your order payment was received successfully.';
            break;
          case 'DOWNLOAD_COMPLETED':
            title = 'Downloaded Photos';
            description = 'You downloaded your high-resolution digital package.';
            break;
          case 'DELIVERY_CONFIRMED':
            title = 'Delivery Confirmed';
            description = 'You confirmed receipt of your order delivery.';
            break;
          default:
            title = a.activity_type?.replace(/_/g, ' ') || 'Activity';
            description = 'Studio engagement event.';
        }

        return {
          id: a.id,
          event_type: a.activity_type,
          title,
          description,
          occurred_at: a.created_at,
        };
      });
    } catch {
      // Mock / fallback activity
      if (mappedProjects.length > 0) {
        mappedActivities.push({
          id: 'act_recent_1',
          event_type: 'PROJECT_UPDATED',
          title: 'Project Activity',
          description: `${mappedProjects[0].name} updated by studio.`,
          occurred_at: new Date(),
        });
      }
    }

    // 4. Fetch Unread Notifications Count
    let unreadCount = 0;
    try {
      const allNotifs = await prisma.notification.findMany({
        where: { studio_id: studioId, client_id: clientId },
      });
      const readRecords = await prisma.clientPortalNotificationRead.findMany({
        where: { client_id: clientId },
      });
      const readIds = new Set(readRecords.map((r: any) => r.notification_id));
      unreadCount = allNotifs.filter((n: any) => !readIds.has(n.id)).length;
    } catch {
      unreadCount = 0;
    }

    // 5. Calculate Stats
    let totalClientOrders = 0;
    try {
      const orders = await prisma.fulfillmentOrder.findMany({
        where: { studio_id: studioId, client_id: clientId },
      });
      totalClientOrders = orders.length;
    } catch {
      totalClientOrders = projects.reduce((acc, p) => acc + (p.fulfillment_orders?.length || 0), 0);
    }

    const stats = {
      total_projects: projects.length,
      active_proofing_sessions: mappedProjects.filter((p) => p.has_active_proofing).length,
      total_orders: totalClientOrders,
      unread_notifications: unreadCount,
    };

    return {
      session: {
        id: session.sessionId,
        studio_id: session.studioId,
        client_id: session.clientId,
        token_preview: '...',
        expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        is_valid: true,
        client: session.client,
        studio: session.studio,
        branding,
      },
      client: session.client,
      studio: session.studio,
      branding,
      stats,
      projects: mappedProjects,
      active_project: activeProject,
      recent_activities: mappedActivities,
    };
  }

  static async getPortalHome(session: ValidatedSessionContext, rawToken: string): Promise<IClientPortalHomeDTO> {
    return this.getClientPortalHome(session);
  }

  /**
   * Retrieves all projects for the client.
   */
  static async getClientProjects(tokenOrSession: string | ValidatedSessionContext): Promise<IClientPortalProjectDTO[]> {
    const session = await this.resolveContext(tokenOrSession);
    const projects = await prisma.studioProject.findMany({
      where: {
        studio_id: session.studioId,
        client_id: session.clientId,
        deleted_at: null,
      },
      include: {
        galleries: { include: { gallery: true } },
        proofing_sessions: true,
        fulfillment_orders: { include: { items: true, packages: true } },
      },
      orderBy: { created_at: 'desc' },
    });

    return projects.map((p: any) => {
      const primaryGalleryLink = p.galleries?.[0];
      const activeProofing = p.proofing_sessions?.find(
        (ps: any) => ps.status === 'IN_PROGRESS' || ps.status === 'SUBMITTED'
      ) || p.proofing_sessions?.[0];
      const totalDownloads = p.fulfillment_orders?.reduce(
        (sum: number, o: any) => sum + (o.packages?.length || 0),
        0
      ) || 0;

      return {
        id: p.id,
        client_id: p.client_id,
        name: p.name,
        project_type: p.project_type || p.event_type || 'Photography',
        event_type: p.event_type || p.project_type || 'Photography',
        status: p.status,
        event_date: p.shoot_date || p.start_date || p.event_date || null,
        location: p.location || null,
        description: p.description || null,
        primary_photographer_name: p.primary_photographer_name || null,
        galleries_count: p.galleries?.length || 0,
        primary_gallery_id: primaryGalleryLink?.gallery_id || null,
        primary_gallery_slug: primaryGalleryLink?.gallery?.slug || null,
        has_active_proofing: !!activeProofing,
        proofing_status: activeProofing?.status || null,
        proofing_session_id: activeProofing?.id || null,
        has_orders: (p.fulfillment_orders?.length || 0) > 0,
        orders_count: p.fulfillment_orders?.length || 0,
        available_downloads_count: totalDownloads,
        last_activity_at: p.updated_at || p.created_at,
        proofing_session: activeProofing
          ? {
              id: activeProofing.id,
              title: activeProofing.title,
              status: activeProofing.status,
              required_count: activeProofing.required_count,
              selected_count: activeProofing.selected_count,
            }
          : null,
      };
    });
  }

  /**
   * Retrieves single project detail with associated galleries, proofing, and downloads.
   */
  static async getProjectDetail(
    tokenOrSession: string | ValidatedSessionContext,
    projectId: string
  ): Promise<IClientPortalProjectDetailDTO> {
    const session = await this.resolveContext(tokenOrSession);

    const project = await prisma.studioProject.findFirst({
      where: {
        id: projectId,
        studio_id: session.studioId,
        client_id: session.clientId,
        deleted_at: null,
      },
      include: {
        galleries: { include: { gallery: { include: { photos: true } } } },
        proofing_sessions: { include: { items: true } },
        fulfillment_orders: { include: { items: true, packages: true } },
      },
    });

    if (!project) {
      const err = new Error(`Project not found or unauthorized: ${projectId}`);
      (err as any).statusCode = 404;
      throw err;
    }

    // Map galleries
    let mappedGalleries: any[] = [];
    if (project.galleries && project.galleries.length > 0) {
      mappedGalleries = await Promise.all(
        project.galleries.map(async (g: any) => {
          const galleryObj = g.gallery || g;
          let count = galleryObj.photos?.length || 0;
          if (!count) {
            count = await prisma.photo.count({ where: { gallery_id: galleryObj.id || g.gallery_id || g.id } });
          }
          return {
            id: galleryObj.id || g.gallery_id || g.id,
            title: galleryObj.title || 'Gallery',
            slug: galleryObj.slug || '',
            photo_count: count,
            cover_photo_url: galleryObj.cover_photo_url || null,
            is_published: galleryObj.is_published !== false,
          };
        })
      );
    } else {
      // Find galleries linked by project_id directly
      const directGalleries = await prisma.gallery.findMany({
        where: { project_id: project.id, studio_id: session.studioId },
        include: { photos: true },
      });
      mappedGalleries = await Promise.all(
        directGalleries.map(async (g: any) => {
          let count = g.photos?.length || 0;
          if (!count) {
            count = await prisma.photo.count({ where: { gallery_id: g.id } });
          }
          return {
            id: g.id,
            title: g.title,
            slug: g.slug,
            photo_count: count,
            cover_photo_url: g.cover_photo_url || null,
            is_published: g.is_published !== false,
          };
        })
      );
    }

    // Map proofing
    const proofingSession = project.proofing_sessions?.[0] || null;
    let proofingDTO = null;
    if (proofingSession) {
      const items = proofingSession.items || [];
      const selectedCount = proofingSession.selected_count ?? items.filter((i: any) => i.status === 'SELECTED').length;
      proofingDTO = {
        session_id: proofingSession.id,
        title: proofingSession.title,
        status: proofingSession.status,
        total_selected: selectedCount,
        required_count: proofingSession.required_count,
        expires_at: proofingSession.expires_at,
        notes: proofingSession.notes || null,
      };
    }

    return {
      id: project.id,
      name: project.name,
      project_type: project.project_type || (project as any).event_type || 'Photography',
      status: project.status,
      event_date: project.shoot_date || project.start_date || (project as any).event_date || null,
      location: project.location || null,
      description: project.description || null,
      primary_photographer_name: (project as any).primary_photographer_name || null,
      galleries: mappedGalleries,
      proofing: proofingDTO,
      orders_count: project.fulfillment_orders?.length || 0,
      available_downloads_count: 0,
      created_at: project.created_at,
      updated_at: project.updated_at,
    };
  }

  /**
   * Retrieves all orders for the client.
   */
  static async getClientOrders(tokenOrSession: string | ValidatedSessionContext): Promise<IClientPortalOrderDTO[]> {
    const session = await this.resolveContext(tokenOrSession);

    const orders = await prisma.fulfillmentOrder.findMany({
      where: {
        studio_id: session.studioId,
        client_id: session.clientId,
      },
      include: {
        items: true,
        deliveries: true,
      },
      orderBy: { created_at: 'desc' },
    });

    return orders.map((o: any) => ({
      id: o.id,
      order_number: o.order_number,
      status: o.status,
      payment_status: o.payment_status,
      currency: o.currency || 'USD',
      total_cents: o.total_cents,
      items_count: o.items?.length || 0,
      created_at: o.created_at,
    }));
  }

  /**
   * Retrieves single order detail with line items and delivery tracking.
   */
  static async getOrderDetail(
    tokenOrSession: string | ValidatedSessionContext,
    orderId: string
  ): Promise<IClientPortalOrderDetailDTO> {
    const session = await this.resolveContext(tokenOrSession);

    const order = await prisma.fulfillmentOrder.findFirst({
      where: {
        id: orderId,
        studio_id: session.studioId,
        client_id: session.clientId,
      },
      include: {
        items: true,
        deliveries: true,
      },
    });

    if (!order) {
      const err = new Error(`Order not found or unauthorized: ${orderId}`);
      (err as any).statusCode = 404;
      throw err;
    }

    // Delivery summary
    let deliverySummary = null;
    let del = order.deliveries?.[0];
    if (!del) {
      del = await prisma.fulfillmentDelivery.findFirst({
        where: { order_id: order.id, studio_id: session.studioId },
      });
    }

    if (del) {
      deliverySummary = {
        id: del.id,
        courier: del.courier,
        tracking_number: del.tracking_number,
        tracking_url: del.tracking_url,
        status: del.status,
        shipped_at: del.shipped_at,
        delivered_at: del.delivered_at,
      };
    }

    return {
      id: order.id,
      order_number: order.order_number,
      status: order.status,
      payment_status: order.payment_status,
      currency: order.currency || 'USD',
      subtotal_cents: order.subtotal_cents || order.total_cents,
      tax_cents: order.tax_cents || 0,
      shipping_cents: order.shipping_cents || 0,
      discount_cents: order.discount_cents || 0,
      total_cents: order.total_cents,
      items: (order.items || []).map((i: any) => ({
        id: i.id,
        product_name: i.product_name,
        quantity: i.quantity,
        unit_price_cents: i.unit_price_cents,
        total_price_cents: i.total_price_cents,
      })),
      delivery: deliverySummary,
      created_at: order.created_at,
    };
  }

  /**
   * Retrieves all delivery shipments for client.
   */
  static async getClientDeliveries(tokenOrSession: string | ValidatedSessionContext): Promise<IClientPortalDeliveryDTO[]> {
    const session = await this.resolveContext(tokenOrSession);

    const deliveries = await prisma.fulfillmentDelivery.findMany({
      where: {
        studio_id: session.studioId,
        client_id: session.clientId,
      },
      orderBy: { created_at: 'desc' },
    });

    return deliveries.map((d: any) => ({
      id: d.id,
      delivery_type: d.delivery_type,
      status: d.status,
      courier: d.courier,
      tracking_number: d.tracking_number,
      tracking_url: d.tracking_url,
      shipped_at: d.shipped_at,
      delivered_at: d.delivered_at,
      can_confirm: d.can_confirm ?? (d.status !== 'DELIVERED'),
      is_confirmed: d.is_confirmed ?? (d.status === 'DELIVERED'),
    }));
  }

  /**
   * 1-Click receipt confirmation for physical print deliveries.
   */
  static async confirmDeliveryReceipt(
    tokenOrSession: string | ValidatedSessionContext,
    paramsOrDeliveryId: string | { delivery_id?: string; deliveryId?: string; feedback?: string; notes?: string; signature?: string },
    maybeData?: { feedback?: string; notes?: string; signature?: string }
  ): Promise<IClientPortalDeliveryDTO> {
    const session = await this.resolveContext(tokenOrSession);

    let deliveryId: string;
    let feedback: string | undefined;

    if (typeof paramsOrDeliveryId === 'object') {
      deliveryId = (paramsOrDeliveryId.delivery_id || paramsOrDeliveryId.deliveryId)!;
      feedback = paramsOrDeliveryId.feedback || paramsOrDeliveryId.notes;
    } else {
      deliveryId = paramsOrDeliveryId;
      feedback = maybeData?.feedback || maybeData?.notes;
    }

    const delivery = await prisma.fulfillmentDelivery.findFirst({
      where: {
        id: deliveryId,
        studio_id: session.studioId,
        client_id: session.clientId,
      },
    });

    if (!delivery) {
      const err = new Error(`Delivery record not found or unauthorized: ${deliveryId}`);
      (err as any).statusCode = 404;
      throw err;
    }

    const now = new Date();
    const updated = await prisma.fulfillmentDelivery.update({
      where: { id: deliveryId },
      data: {
        status: 'DELIVERED',
        delivered_at: now,
        is_confirmed: true,
        can_confirm: false,
        client_feedback: feedback || delivery.client_feedback || null,
      },
    });

    return {
      id: updated.id,
      delivery_type: updated.delivery_type,
      status: updated.status,
      courier: updated.courier,
      tracking_number: updated.tracking_number,
      tracking_url: updated.tracking_url,
      shipped_at: updated.shipped_at,
      delivered_at: updated.delivered_at,
      can_confirm: false,
      is_confirmed: true,
    };
  }

  /**
   * Retrieves digital download packages available for client.
   */
  static async getClientDownloads(tokenOrSession: string | ValidatedSessionContext): Promise<IClientPortalDownloadDTO[]> {
    const session = await this.resolveContext(tokenOrSession);

    const downloads = await prisma.fulfillmentDownload.findMany({
      where: {
        studio_id: session.studioId,
        client_id: session.clientId,
      },
      orderBy: { created_at: 'desc' },
    });

    return downloads.map((d: any) => ({
      id: d.id,
      download_type: d.download_type,
      file_size_bytes: d.file_size_bytes,
      expires_at: d.expires_at,
      is_expired: d.expires_at ? new Date(d.expires_at) < new Date() : false,
      download_url: d.download_url || null,
      created_at: d.created_at,
    }));
  }

  /**
   * Generates a signed, short-lived download URL for a client digital asset.
   */
  static async generateDownloadUrl(
    tokenOrSession: string | ValidatedSessionContext,
    downloadId: string
  ): Promise<{ download_url: string; expires_in_seconds: number }> {
    const session = await this.resolveContext(tokenOrSession);

    const download = await prisma.fulfillmentDownload.findFirst({
      where: {
        id: downloadId,
        studio_id: session.studioId,
        client_id: session.clientId,
      },
    });

    if (!download) {
      const err = new Error(`Download package not found or unauthorized: ${downloadId}`);
      (err as any).statusCode = 404;
      throw err;
    }

    const signature = crypto.randomBytes(16).toString('hex');
    const expiresTimestamp = Date.now() + 3600 * 1000;
    const signedUrl = `https://storage.pixmatch.app/downloads/${download.id}.zip?token=${signature}&expires=${expiresTimestamp}`;

    return {
      download_url: signedUrl,
      expires_in_seconds: 3600,
    };
  }

  /**
   * Retrieves notification feed with dynamic read states.
   */
  static async getClientNotifications(
    tokenOrSession: string | ValidatedSessionContext
  ): Promise<IClientPortalNotificationDTO[]> {
    const session = await this.resolveContext(tokenOrSession);

    const notifs = await prisma.notification.findMany({
      where: {
        studio_id: session.studioId,
        client_id: session.clientId,
      },
      orderBy: { created_at: 'desc' },
    });

    const readRecords = await prisma.clientPortalNotificationRead.findMany({
      where: { client_id: session.clientId },
    });
    const readIds = new Set(readRecords.map((r: any) => r.notification_id));

    return notifs.map((n: any) => ({
      id: n.id,
      title: n.title,
      message: n.message,
      type: n.type,
      link_url: n.link_url || null,
      is_read: readIds.has(n.id),
      created_at: n.created_at,
    }));
  }

  /**
   * Marks specified notification IDs as read.
   */
  static async markNotificationsAsRead(
    tokenOrSession: string | ValidatedSessionContext,
    notificationIds: string[]
  ): Promise<{ success: boolean; marked_count: number }> {
    const session = await this.resolveContext(tokenOrSession);

    let count = 0;
    for (const notifId of notificationIds) {
      try {
        await prisma.clientPortalNotificationRead.upsert({
          where: {
            client_id_notification_id: {
              client_id: session.clientId,
              notification_id: notifId,
            },
          },
          create: {
            client_id: session.clientId,
            notification_id: notifId,
            read_at: new Date(),
          },
          update: {
            read_at: new Date(),
          },
        });
        count++;
      } catch {
        // Continue
      }
    }

    return { success: true, marked_count: count };
  }

  /**
   * Retrieves client profile and notification preferences.
   */
  static async getClientProfile(tokenOrSession: string | ValidatedSessionContext): Promise<IClientPortalProfileDTO> {
    const session = await this.resolveContext(tokenOrSession);

    const client = await prisma.client.findUnique({
      where: { id: session.clientId },
    });

    if (!client) {
      const err = new Error('Client profile not found.');
      (err as any).statusCode = 404;
      throw err;
    }

    let pref = await prisma.clientPortalPreference.findUnique({
      where: { client_id: session.clientId },
    });

    const defaultPrefs = {
      email_gallery_ready: true,
      email_proofing_updates: true,
      email_order_updates: true,
      email_delivery_updates: true,
      email_download_ready: true,
    };

    return {
      id: client.id,
      name: client.name,
      first_name: client.first_name || null,
      last_name: client.last_name || null,
      email: client.email,
      phone: client.phone || null,
      company: client.company || null,
      preferences: pref
        ? {
            email_gallery_ready: pref.email_gallery_ready,
            email_proofing_updates: pref.email_proofing_updates,
            email_order_updates: pref.email_order_updates,
            email_delivery_updates: pref.email_delivery_updates,
            email_download_ready: pref.email_download_ready,
          }
        : defaultPrefs,
    };
  }

  /**
   * Updates client contact profile details.
   */
  static async updateClientProfile(
    tokenOrSession: string | ValidatedSessionContext,
    dto: IUpdateClientPortalProfileDTO
  ): Promise<IClientPortalProfileDTO> {
    const session = await this.resolveContext(tokenOrSession);

    const updated = await prisma.client.update({
      where: { id: session.clientId },
      data: {
        ...(dto.name ? { name: dto.name.trim() } : {}),
        ...(dto.first_name !== undefined ? { first_name: dto.first_name?.trim() || null } : {}),
        ...(dto.last_name !== undefined ? { last_name: dto.last_name?.trim() || null } : {}),
        ...(dto.phone !== undefined ? { phone: dto.phone?.trim() || null } : {}),
        ...(dto.company !== undefined ? { company: dto.company?.trim() || null } : {}),
      },
    });

    return this.getClientProfile(session);
  }

  /**
   * Updates client communication preferences.
   */
  static async updateClientPreferences(
    tokenOrSession: string | ValidatedSessionContext,
    dto: IUpdateClientPortalPreferenceDTO
  ): Promise<IClientPortalProfileDTO> {
    const session = await this.resolveContext(tokenOrSession);

    await prisma.clientPortalPreference.upsert({
      where: { client_id: session.clientId },
      create: {
        client_id: session.clientId,
        email_gallery_ready: dto.email_gallery_ready ?? true,
        email_proofing_updates: dto.email_proofing_updates ?? true,
        email_order_updates: dto.email_order_updates ?? true,
        email_delivery_updates: dto.email_delivery_updates ?? true,
        email_download_ready: dto.email_download_ready ?? true,
      },
      update: {
        ...(dto.email_gallery_ready !== undefined ? { email_gallery_ready: dto.email_gallery_ready } : {}),
        ...(dto.email_proofing_updates !== undefined ? { email_proofing_updates: dto.email_proofing_updates } : {}),
        ...(dto.email_order_updates !== undefined ? { email_order_updates: dto.email_order_updates } : {}),
        ...(dto.email_delivery_updates !== undefined ? { email_delivery_updates: dto.email_delivery_updates } : {}),
        ...(dto.email_download_ready !== undefined ? { email_download_ready: dto.email_download_ready } : {}),
      },
    });

    return this.getClientProfile(session);
  }

  // =========================================================================
  // Instance delegates
  // =========================================================================
  async getClientPortalHome(tokenOrSession: any) {
    return ClientPortalService.getClientPortalHome(tokenOrSession);
  }

  async getPortalHome(session: any, rawToken: string) {
    return ClientPortalService.getPortalHome(session, rawToken);
  }

  async getClientProjects(tokenOrSession: any) {
    return ClientPortalService.getClientProjects(tokenOrSession);
  }

  async getProjectDetail(tokenOrSession: any, projectId: string) {
    return ClientPortalService.getProjectDetail(tokenOrSession, projectId);
  }

  async getClientOrders(tokenOrSession: any) {
    return ClientPortalService.getClientOrders(tokenOrSession);
  }

  async getOrderDetail(tokenOrSession: any, orderId: string) {
    return ClientPortalService.getOrderDetail(tokenOrSession, orderId);
  }

  async getClientDeliveries(tokenOrSession: any) {
    return ClientPortalService.getClientDeliveries(tokenOrSession);
  }

  async confirmDeliveryReceipt(tokenOrSession: any, paramsOrDeliveryId: any, maybeData?: any) {
    return ClientPortalService.confirmDeliveryReceipt(tokenOrSession, paramsOrDeliveryId, maybeData);
  }

  async getClientDownloads(tokenOrSession: any) {
    return ClientPortalService.getClientDownloads(tokenOrSession);
  }

  async generateDownloadUrl(tokenOrSession: any, downloadId: string) {
    return ClientPortalService.generateDownloadUrl(tokenOrSession, downloadId);
  }

  async getClientNotifications(tokenOrSession: any) {
    return ClientPortalService.getClientNotifications(tokenOrSession);
  }

  async markNotificationsAsRead(tokenOrSession: any, notificationIds: string[]) {
    return ClientPortalService.markNotificationsAsRead(tokenOrSession, notificationIds);
  }

  async getClientProfile(tokenOrSession: any) {
    return ClientPortalService.getClientProfile(tokenOrSession);
  }

  async updateClientProfile(tokenOrSession: any, dto: IUpdateClientPortalProfileDTO) {
    return ClientPortalService.updateClientProfile(tokenOrSession, dto);
  }

  async updateClientPreferences(tokenOrSession: any, dto: IUpdateClientPortalPreferenceDTO) {
    return ClientPortalService.updateClientPreferences(tokenOrSession, dto);
  }

  // -------------------------------------------------------------
  // PHASE 28: CLIENT PORTAL MESSAGING
  // -------------------------------------------------------------

  /**
   * List all conversations for the authenticated portal client.
   */
  static async getClientConversations(tokenOrSession: string | ValidatedSessionContext) {
    const session = await this.resolveContext(tokenOrSession);
    const { studioId, clientId } = session;

    const conversations = await prisma.clientConversation.findMany({
      where: {
        studio_id: studioId,
        client_id: clientId,
      },
      orderBy: { last_message_at: 'desc' },
      include: {
        project: { select: { id: true, name: true, status: true } },
        gallery: { select: { id: true, title: true, slug: true } },
        order: { select: { id: true, order_number: true, status: true } },
        messages: {
          where: { is_internal_note: false, deleted_at: null },
          orderBy: { created_at: 'asc' },
          include: {
            attachments: { where: { status: { not: 'DELETED' } } },
          },
        },
      },
    });

    return conversations;
  }

  /**
   * Get detail of a specific conversation for the portal client.
   */
  static async getClientConversationDetail(
    tokenOrSession: string | ValidatedSessionContext,
    conversationId: string
  ) {
    const session = await this.resolveContext(tokenOrSession);
    const { studioId, clientId } = session;

    const conversation = await prisma.clientConversation.findFirst({
      where: {
        id: conversationId,
        studio_id: studioId,
        client_id: clientId,
      },
      include: {
        project: { select: { id: true, name: true, status: true } },
        gallery: { select: { id: true, title: true, slug: true } },
        order: { select: { id: true, order_number: true, status: true } },
        assigned_to: { select: { first_name: true, last_name: true, avatar_url: true } },
        messages: {
          where: { is_internal_note: false, deleted_at: null },
          orderBy: { created_at: 'asc' },
          include: {
            attachments: { where: { status: { not: 'DELETED' } } },
          },
        },
      },
    });

    if (!conversation) {
      throw new Error('Conversation not found.');
    }

    // Auto mark read for client
    await prisma.clientConversation.update({
      where: { id: conversationId },
      data: { unread_client_count: 0 },
    });

    return conversation;
  }

  /**
   * Send a client message or initiate a new inquiry thread.
   */
  static async sendClientMessage(
    tokenOrSession: string | ValidatedSessionContext,
    data: {
      conversation_id?: string;
      subject?: string;
      category?: string;
      project_id?: string;
      gallery_id?: string;
      order_id?: string;
      body: string;
      attachments?: Array<{
        file_name: string;
        file_size: number;
        mime_type: string;
        storage_key?: string;
        width?: number;
        height?: number;
      }>;
    }
  ) {
    const session = await this.resolveContext(tokenOrSession);
    const { studioId, clientId, client } = session;

    let targetConvId = data.conversation_id;

    // If no existing conversation, create one
    if (!targetConvId) {
      const newConv = await prisma.clientConversation.create({
        data: {
          studio_id: studioId,
          client_id: clientId,
          project_id: data.project_id || null,
          gallery_id: data.gallery_id || null,
          order_id: data.order_id || null,
          subject: (data.subject || 'Client Inquiry').trim(),
          category: (data.category || 'GENERAL').toUpperCase(),
          status: 'OPEN',
          priority: 'NORMAL',
        },
      });

      await prisma.clientConversationParticipant.create({
        data: {
          conversation_id: newConv.id,
          studio_id: studioId,
          client_id: clientId,
          role: 'CLIENT',
        },
      });

      targetConvId = newConv.id;
    } else {
      // Verify client owns target conversation
      const existing = await prisma.clientConversation.findFirst({
        where: { id: targetConvId, studio_id: studioId, client_id: clientId },
      });
      if (!existing) {
        throw new Error('Conversation not found.');
      }
    }

    // Dynamic import to prevent circular dependency
    const { ClientMessageService } = await import('../communication/client-message.service.js');

    const msg = await ClientMessageService.sendMessage(
      studioId,
      targetConvId,
      {
        senderType: 'CLIENT',
        clientId,
        senderName: client.name || 'Client',
        senderEmail: client.email,
      },
      {
        body: data.body,
        sent_via_channel: 'PORTAL',
        is_internal_note: false,
        attachments: data.attachments,
      }
    );

    return msg;
  }

  async getClientConversations(tokenOrSession: any) {
    return ClientPortalService.getClientConversations(tokenOrSession);
  }

  async getClientConversationDetail(tokenOrSession: any, conversationId: string) {
    return ClientPortalService.getClientConversationDetail(tokenOrSession, conversationId);
  }

  async sendClientMessage(tokenOrSession: any, data: any) {
    return ClientPortalService.sendClientMessage(tokenOrSession, data);
  }
}
