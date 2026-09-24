import { FastifyRequest, FastifyReply } from 'fastify';
import crypto from 'crypto';
import { z } from 'zod';
import {
  prisma,
  GalleryAccessType,
  GalleryStatus,
  ProcessingStatus,
  PhotoVersionType,
  DownloadJobStatus,
} from '@pixmatch/database';
import { verifyPassword } from '@pixmatch/auth';
import { StorageService, decryptTokens } from '@pixmatch/storage';
import { PhotoRecommendationService } from './photo-recommendation.service.js';

export class ClientGalleryController {
  /**
   * Generates or resolves an anonymous, tamper-resistant client session scoped to a gallery.
   */
  private static async resolveSession(
    request: FastifyRequest,
    galleryId: string
  ): Promise<{ session: any; token: string }> {
    const rawToken =
      (request.headers['x-gallery-session'] as string) ||
      (request.query as { sessionToken?: string })?.sessionToken ||
      '';

    const tokenHash = rawToken
      ? crypto.createHash('sha256').update(rawToken).digest('hex')
      : null;

    if (tokenHash) {
      const existing = await prisma.galleryClientSession.findFirst({
        where: {
          gallery_id: galleryId,
          session_token_hash: tokenHash,
          expires_at: { gt: new Date() },
        },
      });

      if (existing) {
        // Update last seen
        await prisma.galleryClientSession.update({
          where: { id: existing.id },
          data: { last_seen_at: new Date() },
        });
        return { session: existing, token: rawToken };
      }
    }

    // Generate new session token
    const newToken = `gs_${crypto.randomBytes(32).toString('hex')}`;
    const newTokenHash = crypto.createHash('sha256').update(newToken).digest('hex');
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days TTL

    const ip = request.ip || '127.0.0.1';
    const userAgent = request.headers['user-agent'] || 'unknown';
    const ipHash = crypto.createHash('sha256').update(ip).digest('hex').slice(0, 16);
    const uaHash = crypto.createHash('sha256').update(userAgent).digest('hex').slice(0, 16);

    const session = await prisma.galleryClientSession.create({
      data: {
        gallery_id: galleryId,
        session_token_hash: newTokenHash,
        ip_hash: ipHash,
        user_agent_hash: uaHash,
        expires_at: expiresAt,
      },
    });

    return { session, token: newToken };
  }

  /**
   * GET /api/public/galleries/:slug
   * Returns public gallery metadata, access check, initial photo page, and client session.
   */
  static async getPublicGallery(request: FastifyRequest, reply: FastifyReply) {
    const { slug } = request.params as { slug: string };
    const query = request.query as { password?: string; cursor?: string; limit?: string };
    const passwordHeader = request.headers['x-gallery-password'] as string | undefined;
    const providedPassword = passwordHeader || query.password;

    const gallery = await prisma.gallery.findFirst({
      where: { slug },
      include: {
        studio: {
          select: {
            id: true,
            name: true,
            slug: true,
            logo_url: true,
            website: true,
          },
        },
        _count: {
          select: { photos: { where: { processing_status: ProcessingStatus.COMPLETED } } },
        },
      },
    });

    if (!gallery) {
      return reply.status(404).send({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Gallery not found' },
      });
    }

    // 1. Status Check
    if (gallery.status !== GalleryStatus.ACTIVE) {
      return reply.status(404).send({
        success: false,
        error: { code: 'GALLERY_UNAVAILABLE', message: 'This gallery is currently archived or unavailable.' },
      });
    }

    // 2. Expiration Check
    if (gallery.expires_at && new Date() > new Date(gallery.expires_at)) {
      return reply.status(410).send({
        success: false,
        error: { code: 'GALLERY_EXPIRED', message: 'This gallery has expired and is no longer available.' },
        data: {
          id: gallery.id,
          title: gallery.title,
          slug: gallery.slug,
          is_expired: true,
          studio_name: gallery.studio.name,
        },
      });
    }

    // 3. Private Access Check
    if (gallery.access_type === GalleryAccessType.PRIVATE) {
      return reply.status(403).send({
        success: false,
        error: { code: 'PRIVATE_GALLERY', message: 'This gallery is private and cannot be accessed publicly.' },
      });
    }

    // 4. Session Resolution
    const { session, token: sessionToken } = await ClientGalleryController.resolveSession(request, gallery.id);

    // 5. Password Protection Check
    let isPasswordAuthenticated = true;
    if (gallery.access_type === GalleryAccessType.PASSWORD) {
      if (!gallery.password_hash) {
        isPasswordAuthenticated = false;
      } else if (providedPassword) {
        isPasswordAuthenticated = await verifyPassword(providedPassword, gallery.password_hash);
      } else {
        isPasswordAuthenticated = false;
      }

      if (!isPasswordAuthenticated) {
        return reply.status(401).send({
          success: false,
          error: {
            code: providedPassword ? 'INVALID_PASSWORD' : 'PASSWORD_REQUIRED',
            message: providedPassword ? 'Incorrect gallery password' : 'Password is required to view this gallery',
          },
          data: {
            gallery: {
              id: gallery.id,
              title: gallery.title,
              slug: gallery.slug,
              event_type: gallery.event_type,
              event_date: gallery.event_date,
              description: gallery.description,
              cover_photo_url: gallery.cover_photo_url,
              access_type: gallery.access_type,
              is_password_protected: true,
              studio_name: gallery.studio.name,
              studio_logo: gallery.studio.logo_url,
              photo_count: gallery._count.photos,
            },
            photos: [],
            session_token: sessionToken,
          },
        });
      }
    }

    // 6. Fetch Initial Page of Photos
    const limit = Math.min(Math.max(parseInt(query.limit || '60', 10), 1), 100);
    const cursor = query.cursor;

    const [photos, favorites, selections] = await Promise.all([
      prisma.photo.findMany({
        where: { gallery_id: gallery.id, processing_status: ProcessingStatus.COMPLETED },
        include: { versions: true },
        orderBy: { created_at: 'desc' },
        take: limit + 1,
        ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      }),
      prisma.galleryFavorite.findMany({
        where: { gallery_id: gallery.id, session_id: session.id },
        select: { photo_id: true },
      }),
      prisma.gallerySelection.findMany({
        where: { gallery_id: gallery.id, session_id: session.id },
        select: { photo_id: true },
      }),
    ]);

    const favSet = new Set(favorites.map((f) => f.photo_id));
    const selSet = new Set(selections.map((s) => s.photo_id));

    const hasMore = photos.length > limit;
    const items = hasMore ? photos.slice(0, limit) : photos;
    const nextCursor = hasMore ? items[items.length - 1].id : null;

    // Asynchronously update delivery status to OPENED and log client activity
    prisma.galleryDelivery.updateMany({
      where: { gallery_id: gallery.id, status: 'SENT' },
      data: {
        status: 'OPENED',
        opened_at: new Date(),
        last_accessed_at: new Date(),
        access_count: { increment: 1 },
      },
    }).catch(() => null);

    return reply.send({
      success: true,
      data: {
        gallery: {
          id: gallery.id,
          title: gallery.title,
          slug: gallery.slug,
          event_type: gallery.event_type,
          event_date: gallery.event_date,
          description: gallery.description,
          cover_photo_url: gallery.cover_photo_url,
          access_type: gallery.access_type,
          is_password_protected: gallery.access_type === GalleryAccessType.PASSWORD,
          enable_ai_face_search: gallery.enable_ai_face_search,
          face_match_sensitivity: gallery.face_match_sensitivity,
          downloads_enabled: gallery.downloads_enabled,
          download_originals_enabled: gallery.download_originals_enabled,
          bulk_download_enabled: gallery.bulk_download_enabled,
          watermark_mode: gallery.watermark_mode,
          expires_at: gallery.expires_at,
          studio_name: gallery.studio.name,
          studio_logo: gallery.studio.logo_url,
          studio_website: gallery.studio.website,
          photo_count: gallery._count.photos,
        },
        session_token: sessionToken,
        total_count: gallery._count.photos,
        has_more: hasMore,
        next_cursor: nextCursor,
        photos: items.map((p) => {
          const smThumb = p.versions.find((v) => v.version_type === PhotoVersionType.THUMBNAIL_SM);
          const mdThumb = p.versions.find((v) => v.version_type === PhotoVersionType.THUMBNAIL_MD);
          const lgThumb = p.versions.find((v) => v.version_type === PhotoVersionType.THUMBNAIL_LG);

          return {
            id: p.id,
            thumbnail_url: mdThumb?.url || p.thumbnail_url || p.original_url,
            original_url: gallery.download_originals_enabled ? p.original_url : undefined,
            sm_url: smThumb?.url,
            md_url: mdThumb?.url,
            lg_url: lgThumb?.url,
            width: p.width,
            height: p.height,
            original_filename: p.original_filename,
            file_size: Number(p.file_size),
            aspect_ratio: p.width && p.height ? p.width / p.height : 1.5,
            is_favorite: favSet.has(p.id),
            is_selected: selSet.has(p.id),
          };
        }),
      },
    });
  }

  /**
   * GET /api/public/galleries/:slug/photos
   * Cursor-paginated photo feed for infinite scroll.
   */
  static async listPublicPhotos(request: FastifyRequest, reply: FastifyReply) {
    const { slug } = request.params as { slug: string };
    const query = request.query as { cursor?: string; limit?: string; filter?: 'all' | 'favorites' | 'selected' };

    const gallery = await prisma.gallery.findFirst({
      where: { slug, status: GalleryStatus.ACTIVE },
    });

    if (!gallery) {
      return reply.status(404).send({ success: false, error: { code: 'NOT_FOUND', message: 'Gallery not found' } });
    }

    if (gallery.access_type === GalleryAccessType.PRIVATE) {
      return reply.status(403).send({ success: false, error: { code: 'PRIVATE_GALLERY', message: 'Access denied' } });
    }

    const { session } = await ClientGalleryController.resolveSession(request, gallery.id);
    const limit = Math.min(Math.max(parseInt(query.limit || '60', 10), 1), 100);
    const cursor = query.cursor;

    const [favorites, selections] = await Promise.all([
      prisma.galleryFavorite.findMany({
        where: { gallery_id: gallery.id, session_id: session.id },
        select: { photo_id: true },
      }),
      prisma.gallerySelection.findMany({
        where: { gallery_id: gallery.id, session_id: session.id },
        select: { photo_id: true },
      }),
    ]);

    const favSet = new Set(favorites.map((f) => f.photo_id));
    const selSet = new Set(selections.map((s) => s.photo_id));

    let whereClause: any = {
      gallery_id: gallery.id,
      processing_status: ProcessingStatus.COMPLETED,
    };

    if (query.filter === 'favorites') {
      whereClause.id = { in: Array.from(favSet) };
    } else if (query.filter === 'selected') {
      whereClause.id = { in: Array.from(selSet) };
    }

    const photos = await prisma.photo.findMany({
      where: whereClause,
      include: { versions: true },
      orderBy: { created_at: 'desc' },
      take: limit + 1,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    });

    const hasMore = photos.length > limit;
    const items = hasMore ? photos.slice(0, limit) : photos;
    const nextCursor = hasMore ? items[items.length - 1].id : null;

    return reply.send({
      success: true,
      data: {
        has_more: hasMore,
        next_cursor: nextCursor,
        photos: items.map((p) => {
          const smThumb = p.versions.find((v) => v.version_type === PhotoVersionType.THUMBNAIL_SM);
          const mdThumb = p.versions.find((v) => v.version_type === PhotoVersionType.THUMBNAIL_MD);
          const lgThumb = p.versions.find((v) => v.version_type === PhotoVersionType.THUMBNAIL_LG);

          return {
            id: p.id,
            thumbnail_url: mdThumb?.url || p.thumbnail_url || p.original_url,
            sm_url: smThumb?.url,
            md_url: mdThumb?.url,
            lg_url: lgThumb?.url,
            width: p.width,
            height: p.height,
            original_filename: p.original_filename,
            file_size: Number(p.file_size),
            aspect_ratio: p.width && p.height ? p.width / p.height : 1.5,
            is_favorite: favSet.has(p.id),
            is_selected: selSet.has(p.id),
          };
        }),
      },
    });
  }

  /**
   * POST /api/public/galleries/:slug/access
   * Validates PIN/password and creates a verified session.
   */
  static async verifyPassword(request: FastifyRequest, reply: FastifyReply) {
    const { slug } = request.params as { slug: string };
    const body = request.body as { password?: string };

    const gallery = await prisma.gallery.findFirst({
      where: { slug, status: GalleryStatus.ACTIVE },
    });

    if (!gallery) {
      return reply.status(404).send({ success: false, error: { code: 'NOT_FOUND', message: 'Gallery not found' } });
    }

    if (gallery.access_type !== GalleryAccessType.PASSWORD || !gallery.password_hash) {
      return reply.send({ success: true, data: { access_granted: true } });
    }

    if (!body?.password) {
      return reply.status(400).send({
        success: false,
        error: { code: 'MISSING_PASSWORD', message: 'Password is required' },
      });
    }

    const isValid = await verifyPassword(body.password, gallery.password_hash);
    if (!isValid) {
      return reply.status(401).send({
        success: false,
        error: { code: 'INVALID_PASSWORD', message: 'Incorrect gallery password' },
      });
    }

    const { session, token: sessionToken } = await ClientGalleryController.resolveSession(request, gallery.id);

    return reply.send({
      success: true,
      data: {
        access_granted: true,
        session_token: sessionToken,
      },
    });
  }

  /**
   * POST /api/public/galleries/:slug/favorites/:photoId
   * Toggle or add favorite photo for active client session.
   */
  static async toggleFavorite(request: FastifyRequest, reply: FastifyReply) {
    const { slug, photoId } = request.params as { slug: string; photoId: string };

    const gallery = await prisma.gallery.findFirst({
      where: { slug, status: GalleryStatus.ACTIVE },
    });

    if (!gallery) {
      return reply.status(404).send({ success: false, error: { code: 'NOT_FOUND', message: 'Gallery not found' } });
    }

    const photo = await prisma.photo.findFirst({
      where: { id: photoId, gallery_id: gallery.id },
    });

    if (!photo) {
      return reply.status(404).send({
        success: false,
        error: { code: 'PHOTO_NOT_FOUND', message: 'Photo not found in this gallery' },
      });
    }

    const { session } = await ClientGalleryController.resolveSession(request, gallery.id);

    const existing = await prisma.galleryFavorite.findUnique({
      where: {
        gallery_id_session_id_photo_id: {
          gallery_id: gallery.id,
          session_id: session.id,
          photo_id: photoId,
        },
      },
    });

    if (existing) {
      await prisma.galleryFavorite.delete({ where: { id: existing.id } });
      return reply.send({ success: true, data: { photoId, is_favorite: false } });
    } else {
      await prisma.galleryFavorite.create({
        data: {
          gallery_id: gallery.id,
          session_id: session.id,
          photo_id: photoId,
        },
      });
      return reply.send({ success: true, data: { photoId, is_favorite: true } });
    }
  }

  /**
   * GET /api/public/galleries/:slug/favorites
   */
  static async listFavorites(request: FastifyRequest, reply: FastifyReply) {
    const { slug } = request.params as { slug: string };

    const gallery = await prisma.gallery.findFirst({
      where: { slug, status: GalleryStatus.ACTIVE },
    });

    if (!gallery) {
      return reply.status(404).send({ success: false, error: { code: 'NOT_FOUND', message: 'Gallery not found' } });
    }

    const { session } = await ClientGalleryController.resolveSession(request, gallery.id);

    const favorites = await prisma.galleryFavorite.findMany({
      where: { gallery_id: gallery.id, session_id: session.id },
      include: { photo: { include: { versions: true } } },
      orderBy: { created_at: 'desc' },
    });

    return reply.send({
      success: true,
      data: {
        total: favorites.length,
        favorites: favorites.map((f) => ({
          photo_id: f.photo_id,
          thumbnail_url: f.photo.thumbnail_url || f.photo.original_url,
          created_at: f.created_at,
        })),
      },
    });
  }

  /**
   * POST /api/public/galleries/:slug/selections/:photoId
   * Toggle photo selection.
   */
  static async toggleSelection(request: FastifyRequest, reply: FastifyReply) {
    const { slug, photoId } = request.params as { slug: string; photoId: string };

    const gallery = await prisma.gallery.findFirst({
      where: { slug, status: GalleryStatus.ACTIVE },
    });

    if (!gallery) {
      return reply.status(404).send({ success: false, error: { code: 'NOT_FOUND', message: 'Gallery not found' } });
    }

    const photo = await prisma.photo.findFirst({
      where: { id: photoId, gallery_id: gallery.id },
    });

    if (!photo) {
      return reply.status(404).send({
        success: false,
        error: { code: 'PHOTO_NOT_FOUND', message: 'Photo not found in this gallery' },
      });
    }

    const { session } = await ClientGalleryController.resolveSession(request, gallery.id);

    const existing = await prisma.gallerySelection.findUnique({
      where: {
        gallery_id_session_id_photo_id: {
          gallery_id: gallery.id,
          session_id: session.id,
          photo_id: photoId,
        },
      },
    });

    if (existing) {
      await prisma.gallerySelection.delete({ where: { id: existing.id } });
      return reply.send({ success: true, data: { photoId, is_selected: false } });
    } else {
      await prisma.gallerySelection.create({
        data: {
          gallery_id: gallery.id,
          session_id: session.id,
          photo_id: photoId,
        },
      });
      return reply.send({ success: true, data: { photoId, is_selected: true } });
    }
  }

  /**
   * GET /api/public/galleries/:slug/selections
   */
  static async listSelections(request: FastifyRequest, reply: FastifyReply) {
    const { slug } = request.params as { slug: string };

    const gallery = await prisma.gallery.findFirst({
      where: { slug, status: GalleryStatus.ACTIVE },
    });

    if (!gallery) {
      return reply.status(404).send({ success: false, error: { code: 'NOT_FOUND', message: 'Gallery not found' } });
    }

    const { session } = await ClientGalleryController.resolveSession(request, gallery.id);

    const selections = await prisma.gallerySelection.findMany({
      where: { gallery_id: gallery.id, session_id: session.id },
      include: { photo: { include: { versions: true } } },
      orderBy: { created_at: 'desc' },
    });

    return reply.send({
      success: true,
      data: {
        total: selections.length,
        items: selections.map((s) => ({
          selection_id: s.id,
          photo_id: s.photo_id,
          selected_at: s.created_at,
          photo: s.photo,
        })),
      },
    });
  }

  /**
   * POST /api/public/galleries/:slug/selections/batch
   * Batch select or clear selections.
   */
  static async batchSelect(request: FastifyRequest, reply: FastifyReply) {
    const { slug } = request.params as { slug: string };
    const body = request.body as { photoIds?: string[]; action?: 'SELECT' | 'CLEAR' };

    const gallery = await prisma.gallery.findFirst({
      where: { slug, status: GalleryStatus.ACTIVE },
    });

    if (!gallery) {
      return reply.status(404).send({ success: false, error: { code: 'NOT_FOUND', message: 'Gallery not found' } });
    }

    const { session } = await ClientGalleryController.resolveSession(request, gallery.id);

    if (body.action === 'CLEAR') {
      await prisma.gallerySelection.deleteMany({
        where: { gallery_id: gallery.id, session_id: session.id },
      });
      return reply.send({ success: true, data: { selected_count: 0 } });
    }

    if (body.photoIds && body.photoIds.length > 0) {
      // Verify all photos belong to this gallery (anti-IDOR)
      const validPhotos = await prisma.photo.findMany({
        where: { id: { in: body.photoIds }, gallery_id: gallery.id },
        select: { id: true },
      });

      for (const vp of validPhotos) {
        await prisma.gallerySelection.upsert({
          where: {
            gallery_id_session_id_photo_id: {
              gallery_id: gallery.id,
              session_id: session.id,
              photo_id: vp.id,
            },
          },
          update: {},
          create: {
            gallery_id: gallery.id,
            session_id: session.id,
            photo_id: vp.id,
          },
        });
      }

      const totalSelected = await prisma.gallerySelection.count({
        where: { gallery_id: gallery.id, session_id: session.id },
      });

      return reply.send({ success: true, data: { selected_count: totalSelected } });
    }

    return reply.status(400).send({ success: false, error: { code: 'BAD_REQUEST', message: 'Invalid batch action' } });
  }

  /**
   * GET /api/public/galleries/:slug/photos/:photoId/download
   * Generates a signed download URL for an authorized single photo.
   */
  static async downloadSinglePhoto(request: FastifyRequest, reply: FastifyReply) {
    const { slug, photoId } = request.params as { slug: string; photoId: string };

    const gallery = await prisma.gallery.findFirst({
      where: { slug, status: GalleryStatus.ACTIVE },
    });

    if (!gallery) {
      return reply.status(404).send({ success: false, error: { code: 'NOT_FOUND', message: 'Gallery not found' } });
    }

    if (gallery.downloads_enabled === false) {
      return reply.status(403).send({
        success: false,
        error: { code: 'DOWNLOADS_DISABLED', message: 'Downloads are disabled for this gallery' },
      });
    }

    const photo = await prisma.photo.findFirst({
      where: { id: photoId, gallery_id: gallery.id },
    });

    if (!photo) {
      return reply.status(404).send({
        success: false,
        error: { code: 'PHOTO_NOT_FOUND', message: 'Photo not found in this gallery' },
      });
    }

    // Resolve storage provider with encrypted credentials if needed
    let providerConfig: any = undefined;
    if (photo.storage_connection_id) {
      const connection = await prisma.storageConnection.findUnique({
        where: { id: photo.storage_connection_id },
      });
      if (connection) {
        try {
          if (connection.access_token) {
            const tokens = decryptTokens(connection.access_token);
            providerConfig = typeof tokens === 'string' ? JSON.parse(tokens) : tokens;
          } else if (connection.configuration) {
            providerConfig = connection.configuration;
          }
        } catch {
          providerConfig = connection.configuration;
        }
      }
    }

    const storageProvider = StorageService.getProvider(photo.storage_provider as any, providerConfig);
    const signedUrl = await storageProvider.generateSignedUrl(photo.storage_path, 900); // 15m TTL

    return reply.send({
      success: true,
      data: {
        downloadUrl: signedUrl,
        filename: photo.original_filename || `${photo.id}.jpg`,
        expires_in_seconds: 900,
      },
    });
  }

  /**
   * POST /api/public/galleries/:slug/download-bulk
   * Prepares bulk download of selected photos.
   */
  static async requestBulkDownload(request: FastifyRequest, reply: FastifyReply) {
    const { slug } = request.params as { slug: string };
    const body = request.body as { photoIds?: string[] };

    const gallery = await prisma.gallery.findFirst({
      where: { slug, status: GalleryStatus.ACTIVE },
    });

    if (!gallery) {
      return reply.status(404).send({ success: false, error: { code: 'NOT_FOUND', message: 'Gallery not found' } });
    }

    if (gallery.downloads_enabled === false || gallery.bulk_download_enabled === false) {
      return reply.status(403).send({
        success: false,
        error: { code: 'BULK_DOWNLOADS_DISABLED', message: 'Bulk downloads are disabled for this gallery' },
      });
    }

    const { session } = await ClientGalleryController.resolveSession(request, gallery.id);

    // Determine target photo IDs
    let targetPhotoIds = body.photoIds;
    if (!targetPhotoIds || targetPhotoIds.length === 0) {
      const userSelections = await prisma.gallerySelection.findMany({
        where: { gallery_id: gallery.id, session_id: session.id },
        select: { photo_id: true },
      });
      targetPhotoIds = userSelections.map((s) => s.photo_id);
    }

    if (!targetPhotoIds || targetPhotoIds.length === 0) {
      return reply.status(400).send({
        success: false,
        error: { code: 'NO_PHOTOS_SELECTED', message: 'No photos selected for download' },
      });
    }

    // Anti-IDOR: verify all photos belong to this gallery
    const validPhotos = await prisma.photo.findMany({
      where: { id: { in: targetPhotoIds }, gallery_id: gallery.id },
      select: { id: true, file_size: true, original_url: true },
    });

    const totalBytes = validPhotos.reduce((acc, curr) => acc + Number(curr.file_size), 0);

    const downloadJob = await prisma.clientDownloadJob.create({
      data: {
        gallery_id: gallery.id,
        session_id: session.id,
        status: DownloadJobStatus.READY, // Streamed/direct ready
        photo_count: validPhotos.length,
        file_size: BigInt(totalBytes),
        expires_at: new Date(Date.now() + 2 * 60 * 60 * 1000), // 2 hours
      },
    });

    return reply.send({
      success: true,
      data: {
        jobId: downloadJob.id,
        photo_count: validPhotos.length,
        file_size_bytes: totalBytes,
        status: downloadJob.status,
        photos: validPhotos.map((p) => ({ id: p.id, url: p.original_url })),
      },
    });
  }

  // -------------------------------------------------------------
  // PHASE 14: AI PERSONALIZATION & PHOTO DISCOVERY HANDLERS
  // -------------------------------------------------------------

  /**
   * GET /api/galleries/public/:slug/personalized
   * Returns Personalized Client Home payload (hero, highlights, recommendations, recent).
   */
  static async getPersonalizedHome(request: FastifyRequest, reply: FastifyReply) {
    const { slug } = request.params as { slug: string };
    const gallery = await prisma.gallery.findFirst({
      where: { slug },
      select: { id: true, status: true, access_type: true, expires_at: true },
    });

    if (!gallery || gallery.status !== GalleryStatus.ACTIVE) {
      return reply.status(404).send({ success: false, error: { code: 'NOT_FOUND', message: 'Gallery not found' } });
    }
    if (gallery.expires_at && new Date() > new Date(gallery.expires_at)) {
      return reply.status(410).send({ success: false, error: { code: 'GALLERY_EXPIRED', message: 'Gallery has expired' } });
    }
    if (gallery.access_type === GalleryAccessType.PRIVATE) {
      return reply.status(403).send({ success: false, error: { code: 'PRIVATE_GALLERY', message: 'Access denied' } });
    }

    const { session } = await ClientGalleryController.resolveSession(request, gallery.id);
    const homeData = await PhotoRecommendationService.getPersonalizedHome(gallery.id, session?.id);

    return reply.send({
      success: true,
      data: homeData,
    });
  }

  /**
   * GET /api/galleries/public/:slug/recommendations
   * Returns personalized recommended photos for the client.
   */
  static async getRecommendations(request: FastifyRequest, reply: FastifyReply) {
    const { slug } = request.params as { slug: string };
    const query = request.query as { limit?: string };
    const limit = parseInt(query.limit || '10', 10);

    const gallery = await prisma.gallery.findFirst({
      where: { slug },
      select: { id: true, status: true, access_type: true, expires_at: true },
    });

    if (!gallery || gallery.status !== GalleryStatus.ACTIVE) {
      return reply.status(404).send({ success: false, error: { code: 'NOT_FOUND', message: 'Gallery not found' } });
    }
    if (gallery.expires_at && new Date() > new Date(gallery.expires_at)) {
      return reply.status(410).send({ success: false, error: { code: 'GALLERY_EXPIRED', message: 'Gallery has expired' } });
    }
    if (gallery.access_type === GalleryAccessType.PRIVATE) {
      return reply.status(403).send({ success: false, error: { code: 'PRIVATE_GALLERY', message: 'Access denied' } });
    }

    const { session } = await ClientGalleryController.resolveSession(request, gallery.id);
    const recommendations = await PhotoRecommendationService.getRecommendations(gallery.id, session?.id, { limit });

    return reply.send({
      success: true,
      data: {
        recommendations,
        total: recommendations.length,
      },
    });
  }

  /**
   * GET /api/galleries/public/:slug/photos/:photoId/similar
   * Returns visually & contextually similar photos ("More Like This").
   */
  static async getSimilarPhotos(request: FastifyRequest, reply: FastifyReply) {
    const { slug, photoId } = request.params as { slug: string; photoId: string };
    const query = request.query as { limit?: string };
    const limit = parseInt(query.limit || '8', 10);

    const gallery = await prisma.gallery.findFirst({
      where: { slug },
      select: { id: true, status: true, access_type: true, expires_at: true },
    });

    if (!gallery || gallery.status !== GalleryStatus.ACTIVE) {
      return reply.status(404).send({ success: false, error: { code: 'NOT_FOUND', message: 'Gallery not found' } });
    }
    if (gallery.expires_at && new Date() > new Date(gallery.expires_at)) {
      return reply.status(410).send({ success: false, error: { code: 'GALLERY_EXPIRED', message: 'Gallery has expired' } });
    }
    if (gallery.access_type === GalleryAccessType.PRIVATE) {
      return reply.status(403).send({ success: false, error: { code: 'PRIVATE_GALLERY', message: 'Access denied' } });
    }

    const similar = await PhotoRecommendationService.getSimilarPhotos(gallery.id, photoId, limit);

    return reply.send({
      success: true,
      data: similar,
    });
  }

  /**
   * GET /api/galleries/public/:slug/search
   * Safe metadata-based search across tags, scenes, and moments.
   */
  static async searchGallery(request: FastifyRequest, reply: FastifyReply) {
    const { slug } = request.params as { slug: string };
    const query = request.query as { q?: string; limit?: string };
    const q = query.q || '';
    const limit = parseInt(query.limit || '30', 10);

    const gallery = await prisma.gallery.findFirst({
      where: { slug },
      select: { id: true, status: true, access_type: true, expires_at: true },
    });

    if (!gallery || gallery.status !== GalleryStatus.ACTIVE) {
      return reply.status(404).send({ success: false, error: { code: 'NOT_FOUND', message: 'Gallery not found' } });
    }
    if (gallery.expires_at && new Date() > new Date(gallery.expires_at)) {
      return reply.status(410).send({ success: false, error: { code: 'GALLERY_EXPIRED', message: 'Gallery has expired' } });
    }
    if (gallery.access_type === GalleryAccessType.PRIVATE) {
      return reply.status(403).send({ success: false, error: { code: 'PRIVATE_GALLERY', message: 'Access denied' } });
    }

    const searchResult = await PhotoRecommendationService.searchGallery(gallery.id, q, { limit });

    return reply.send({
      success: true,
      data: searchResult,
    });
  }

  /**
   * POST /api/galleries/public/:slug/activity
   * Records safe client session interaction events.
   */
  static async recordActivity(request: FastifyRequest, reply: FastifyReply) {
    const { slug } = request.params as { slug: string };
    const body = request.body as any;

    const gallery = await prisma.gallery.findFirst({
      where: { slug },
      select: { id: true },
    });

    if (!gallery) {
      return reply.status(404).send({ success: false, error: { code: 'NOT_FOUND', message: 'Gallery not found' } });
    }

    const { session } = await ClientGalleryController.resolveSession(request, gallery.id);
    if (session?.id) {
      await PhotoRecommendationService.recordActivity(gallery.id, session.id, body);
    }

    return reply.send({
      success: true,
      message: 'Activity recorded',
    });
  }

  /**
   * GET /api/galleries/public/:slug/recently-viewed
   * Returns client session's recently viewed photos.
   */
  static async getRecentlyViewed(request: FastifyRequest, reply: FastifyReply) {
    const { slug } = request.params as { slug: string };
    const query = request.query as { limit?: string };
    const limit = parseInt(query.limit || '10', 10);

    const gallery = await prisma.gallery.findFirst({
      where: { slug },
      select: { id: true, status: true, access_type: true, expires_at: true },
    });

    if (!gallery || gallery.status !== GalleryStatus.ACTIVE) {
      return reply.status(404).send({ success: false, error: { code: 'NOT_FOUND', message: 'Gallery not found' } });
    }

    const { session } = await ClientGalleryController.resolveSession(request, gallery.id);
    const recent = session?.id ? await PhotoRecommendationService.getRecentlyViewed(gallery.id, session.id, limit) : [];

    return reply.send({
      success: true,
      data: {
        photos: recent,
        total: recent.length,
      },
    });
  }
}
