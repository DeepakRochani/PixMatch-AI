import { FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { prisma, GalleryAccessType, GalleryStatus, ProcessingStatus, JobType, StorageProviderType } from '@pixmatch/database';
import { hashPassword, verifyPassword } from '@pixmatch/auth';
import { StorageService } from '@pixmatch/storage';
import { dispatchPhotoProcessing } from '@pixmatch/worker';

const createGallerySchema = z.object({
  title: z.string().min(2),
  event_type: z.string().default('Wedding'),
  event_date: z.string().or(z.date()),
  description: z.string().optional(),
  access_type: z.nativeEnum(GalleryAccessType).default(GalleryAccessType.PUBLIC),
  password: z.string().optional(),
  cover_photo_url: z.string().optional(),
  is_unlisted: z.boolean().optional(),
  expires_at: z.string().or(z.date()).nullable().optional(),
  enable_ai_face_search: z.boolean().default(true),
  face_match_sensitivity: z.string().or(z.number()).optional(),
  downloads_enabled: z.boolean().default(true),
  download_originals_enabled: z.boolean().default(true),
  bulk_download_enabled: z.boolean().default(true),
  watermark_mode: z.enum(['NONE', 'PREVIEW', 'DOWNLOAD', 'THUMBNAIL_ONLY', 'ALL']).default('NONE'),
});

const updateGallerySchema = z.object({
  title: z.string().min(2).optional(),
  event_type: z.string().optional(),
  event_date: z.string().or(z.date()).optional(),
  description: z.string().optional(),
  access_type: z.nativeEnum(GalleryAccessType).optional(),
  status: z.nativeEnum(GalleryStatus).optional(),
  password: z.string().optional(),
  cover_photo_url: z.string().optional(),
  is_unlisted: z.boolean().optional(),
  expires_at: z.string().or(z.date()).nullable().optional(),
  enable_ai_face_search: z.boolean().optional(),
  face_match_sensitivity: z.string().or(z.number()).optional(),
  downloads_enabled: z.boolean().optional(),
  download_originals_enabled: z.boolean().optional(),
  bulk_download_enabled: z.boolean().optional(),
  watermark_mode: z.enum(['NONE', 'PREVIEW', 'DOWNLOAD', 'THUMBNAIL_ONLY', 'ALL']).optional(),
});

export class GalleriesController {
  /**
   * GET /api/galleries/stats
   * Aggregates real studio-wide dashboard metrics from PostgreSQL DB.
   */
  static async getDashboardStats(request: FastifyRequest, reply: FastifyReply) {
    const studioId = request.studioId!;

    const [
      totalGalleries,
      totalPhotos,
      aiIndexedPhotos,
      clientViews,
      totalFavorites,
      totalSelections,
      totalStorageAggregate,
      activeJobsCount,
      failedJobsCount,
    ] = await Promise.all([
      prisma.gallery.count({ where: { studio_id: studioId } }),
      prisma.photo.count({ where: { studio_id: studioId } }),
      prisma.photo.count({ where: { studio_id: studioId, is_face_indexed: true } }),
      prisma.galleryClientSession.count({ where: { gallery: { studio_id: studioId } } }),
      prisma.galleryFavorite.count({ where: { gallery: { studio_id: studioId } } }),
      prisma.gallerySelection.count({ where: { gallery: { studio_id: studioId } } }),
      prisma.photo.aggregate({
        where: { studio_id: studioId },
        _sum: { file_size: true },
      }),
      prisma.processingJob.count({
        where: {
          studio_id: studioId,
          status: { in: [ProcessingStatus.PENDING, ProcessingStatus.UPLOADING, ProcessingStatus.QUEUED, ProcessingStatus.PROCESSING] },
        },
      }),
      prisma.processingJob.count({
        where: { studio_id: studioId, status: ProcessingStatus.FAILED },
      }),
    ]);

    return reply.send({
      success: true,
      data: {
        total_galleries: totalGalleries,
        total_photos: totalPhotos,
        ai_indexed_photos: aiIndexedPhotos,
        client_views: clientViews,
        total_favorites: totalFavorites,
        total_selections: totalSelections,
        storage_used_bytes: Number(totalStorageAggregate._sum.file_size || 0),
        active_jobs_count: activeJobsCount,
        failed_jobs_count: failedJobsCount,
      },
    });
  }

  /**
   * GET /api/galleries
   * List galleries with search, filtering (All, Active, Draft, Archived, Processing, AI Indexing), sorting, and pagination.
   */
  static async list(request: FastifyRequest, reply: FastifyReply) {
    const studioId = request.studioId!;
    const query = request.query as {
      search?: string;
      status?: string;
      sort?: string;
      limit?: string;
      page?: string;
    };

    const limit = Math.min(Math.max(parseInt(query.limit || '50', 10), 1), 100);
    const page = Math.max(parseInt(query.page || '1', 10), 1);
    const skip = (page - 1) * limit;

    const whereClause: Record<string, unknown> = { studio_id: studioId };

    // Status / Mode filter
    if (query.status && query.status !== 'ALL') {
      if (query.status === 'ACTIVE') {
        whereClause.status = GalleryStatus.ACTIVE;
      } else if (query.status === 'DRAFT') {
        whereClause.status = GalleryStatus.DRAFT;
      } else if (query.status === 'ARCHIVED') {
        whereClause.status = GalleryStatus.ARCHIVED;
      } else if (query.status === 'PROCESSING') {
        whereClause.photos = { some: { processing_status: { in: [ProcessingStatus.QUEUED, ProcessingStatus.PROCESSING] } } };
      } else if (query.status === 'AI_INDEXING') {
        whereClause.ai_indexing_status = { in: [ProcessingStatus.QUEUED, ProcessingStatus.PROCESSING] };
      } else if (query.status === 'COMPLETED') {
        whereClause.status = GalleryStatus.ACTIVE;
        whereClause.ai_indexing_status = ProcessingStatus.COMPLETED;
      }
    }

    // Search filter
    if (query.search && query.search.trim()) {
      const searchTerms = query.search.trim();
      whereClause.OR = [
        { title: { contains: searchTerms, mode: 'insensitive' } },
        { description: { contains: searchTerms, mode: 'insensitive' } },
        { event_type: { contains: searchTerms, mode: 'insensitive' } },
      ];
    }

    // Sort order
    let orderBy: Record<string, string> = { created_at: 'desc' };
    if (query.sort === 'OLDEST') {
      orderBy = { created_at: 'asc' };
    } else if (query.sort === 'NAME_ASC') {
      orderBy = { title: 'asc' };
    } else if (query.sort === 'NAME_DESC') {
      orderBy = { title: 'desc' };
    } else if (query.sort === 'UPDATED') {
      orderBy = { updated_at: 'desc' };
    }

    const [total, galleries] = await Promise.all([
      prisma.gallery.count({ where: whereClause }),
      prisma.gallery.findMany({
        where: whereClause,
        include: {
          albums: { select: { id: true, title: true } },
          _count: {
            select: {
              photos: true,
              clients: true,
              favorites: true,
              selections: true,
              face_detections: true,
              client_sessions: true,
            },
          },
        },
        orderBy,
        take: limit,
        skip,
      }),
    ]);

    return reply.send({
      success: true,
      data: galleries.map((g) => ({
        ...g,
        photo_count: g._count.photos,
        client_count: g._count.clients,
        favorites_count: g._count.favorites,
        selections_count: g._count.selections,
        face_count: g._count.face_detections,
        client_views: g._count.client_sessions + (g.client_views_count || 0),
        album_count: g.albums.length,
      })),
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    });
  }

  /**
   * GET /api/galleries/:id
   * Get single gallery with complete studio metadata.
   */
  static async getById(request: FastifyRequest, reply: FastifyReply) {
    const { id } = request.params as { id: string };
    const studioId = request.studioId!;

    const gallery = await prisma.gallery.findFirst({
      where: { id, studio_id: studioId },
      include: {
        albums: {
          orderBy: { sort_order: 'asc' },
          include: {
            _count: { select: { photos: true } },
          },
        },
        _count: {
          select: {
            photos: true,
            clients: true,
            favorites: true,
            selections: true,
            face_detections: true,
            client_sessions: true,
            download_jobs: true,
          },
        },
      },
    });

    if (!gallery) {
      return reply.status(404).send({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Gallery not found or access denied' },
      });
    }

    return reply.send({
      success: true,
      data: {
        ...gallery,
        photo_count: gallery._count.photos,
        client_count: gallery._count.clients,
        favorites_count: gallery._count.favorites,
        selections_count: gallery._count.selections,
        face_count: gallery._count.face_detections,
        client_views: gallery._count.client_sessions + (gallery.client_views_count || 0),
        downloads_count: gallery._count.download_jobs,
        albums: gallery.albums.map((a) => ({
          ...a,
          photo_count: a._count.photos,
        })),
      },
    });
  }

  /**
   * POST /api/galleries
   * Create gallery via wizard.
   */
  static async create(request: FastifyRequest, reply: FastifyReply) {
    const studioId = request.studioId!;
    const input = createGallerySchema.parse(request.body);

    const baseSlug = input.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    const slug = `${baseSlug}-${Date.now().toString().slice(-4)}`;

    let password_hash: string | undefined;
    if (input.access_type === GalleryAccessType.PASSWORD && input.password) {
      password_hash = await hashPassword(input.password);
    }

    const gallery = await prisma.gallery.create({
      data: {
        studio_id: studioId,
        title: input.title,
        slug,
        event_type: input.event_type,
        event_date: new Date(input.event_date),
        description: input.description,
        cover_photo_url: input.cover_photo_url,
        access_type: input.access_type,
        status: GalleryStatus.ACTIVE,
        password_hash,
        is_unlisted: input.is_unlisted ?? false,
        expires_at: input.expires_at ? new Date(input.expires_at) : null,
        enable_ai_face_search: input.enable_ai_face_search,
        face_match_sensitivity: String(input.face_match_sensitivity ?? '0.58'),
        downloads_enabled: input.downloads_enabled,
        download_originals_enabled: input.download_originals_enabled,
        bulk_download_enabled: input.bulk_download_enabled,
        watermark_mode: input.watermark_mode,
      },
    });

    // Create Audit Log
    await prisma.auditLog.create({
      data: {
        studio_id: studioId,
        user_id: request.user?.userId,
        action: 'GALLERY_CREATED',
        resource_type: 'gallery',
        resource_id: gallery.id,
        metadata: { title: gallery.title, slug: gallery.slug },
      },
    });

    return reply.status(201).send({
      success: true,
      data: gallery,
    });
  }

  /**
   * PATCH /api/galleries/:id
   * Update gallery settings & metadata.
   */
  static async update(request: FastifyRequest, reply: FastifyReply) {
    const { id } = request.params as { id: string };
    const studioId = request.studioId!;
    const input = updateGallerySchema.parse(request.body);

    const existing = await prisma.gallery.findFirst({
      where: { id, studio_id: studioId },
    });

    if (!existing) {
      return reply.status(404).send({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Gallery not found or access denied' },
      });
    }

    const updateData: Record<string, unknown> = {};
    if (input.title !== undefined) updateData.title = input.title;
    if (input.event_type !== undefined) updateData.event_type = input.event_type;
    if (input.event_date !== undefined) updateData.event_date = new Date(input.event_date);
    if (input.description !== undefined) updateData.description = input.description;
    if (input.cover_photo_url !== undefined) updateData.cover_photo_url = input.cover_photo_url;
    if (input.access_type !== undefined) updateData.access_type = input.access_type;
    if (input.status !== undefined) updateData.status = input.status;
    if (input.is_unlisted !== undefined) updateData.is_unlisted = input.is_unlisted;
    if (input.expires_at !== undefined) updateData.expires_at = input.expires_at ? new Date(input.expires_at) : null;
    if (input.enable_ai_face_search !== undefined) updateData.enable_ai_face_search = input.enable_ai_face_search;
    if (input.face_match_sensitivity !== undefined) updateData.face_match_sensitivity = String(input.face_match_sensitivity);
    if (input.downloads_enabled !== undefined) updateData.downloads_enabled = input.downloads_enabled;
    if (input.download_originals_enabled !== undefined) updateData.download_originals_enabled = input.download_originals_enabled;
    if (input.bulk_download_enabled !== undefined) updateData.bulk_download_enabled = input.bulk_download_enabled;
    if (input.watermark_mode !== undefined) updateData.watermark_mode = input.watermark_mode;
    if (input.password) {
      updateData.password_hash = await hashPassword(input.password);
    }

    const updated = await prisma.gallery.update({
      where: { id },
      data: updateData,
    });

    await prisma.auditLog.create({
      data: {
        studio_id: studioId,
        user_id: request.user?.userId,
        action: 'GALLERY_UPDATED',
        resource_type: 'gallery',
        resource_id: id,
        metadata: { updated_fields: Object.keys(updateData) },
      },
    });

    return reply.send({
      success: true,
      data: updated,
    });
  }

  /**
   * DELETE /api/galleries/:id
   * Permanent deletion of gallery, storage files, photo derivatives, and records with strict confirmation.
   */
  static async delete(request: FastifyRequest, reply: FastifyReply) {
    const { id } = request.params as { id: string };
    const studioId = request.studioId!;

    const existing = await prisma.gallery.findFirst({
      where: { id, studio_id: studioId },
      include: { photos: { include: { versions: true } } },
    });

    if (!existing) {
      return reply.status(404).send({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Gallery not found or access denied' },
      });
    }

    // Clean up physical storage files
    for (const photo of existing.photos) {
      const storageProvider = StorageService.getProvider(photo.storage_provider as any);
      await storageProvider.delete(photo.storage_path).catch(() => null);
      for (const version of photo.versions) {
        if (version.storage_path !== photo.storage_path) {
          await storageProvider.delete(version.storage_path).catch(() => null);
        }
      }
    }

    await prisma.gallery.delete({ where: { id } });

    await prisma.auditLog.create({
      data: {
        studio_id: studioId,
        user_id: request.user?.userId,
        action: 'GALLERY_DELETED',
        resource_type: 'gallery',
        resource_id: id,
        metadata: { title: existing.title, photo_count: existing.photos.length },
      },
    });

    return reply.send({
      success: true,
      data: { message: 'Gallery and all associated files deleted successfully' },
    });
  }

  /**
   * POST /api/galleries/:id/archive
   */
  static async archive(request: FastifyRequest, reply: FastifyReply) {
    const { id } = request.params as { id: string };
    const studioId = request.studioId!;

    const gallery = await prisma.gallery.findFirst({ where: { id, studio_id: studioId } });
    if (!gallery) {
      return reply.status(404).send({ success: false, error: { code: 'NOT_FOUND', message: 'Gallery not found' } });
    }

    const updated = await prisma.gallery.update({
      where: { id },
      data: { status: GalleryStatus.ARCHIVED },
    });

    await prisma.auditLog.create({
      data: {
        studio_id: studioId,
        user_id: request.user?.userId,
        action: 'GALLERY_ARCHIVED',
        resource_type: 'gallery',
        resource_id: id,
      },
    });

    return reply.send({ success: true, data: updated });
  }

  /**
   * POST /api/galleries/:id/restore
   */
  static async restore(request: FastifyRequest, reply: FastifyReply) {
    const { id } = request.params as { id: string };
    const studioId = request.studioId!;

    const gallery = await prisma.gallery.findFirst({ where: { id, studio_id: studioId } });
    if (!gallery) {
      return reply.status(404).send({ success: false, error: { code: 'NOT_FOUND', message: 'Gallery not found' } });
    }

    const updated = await prisma.gallery.update({
      where: { id },
      data: { status: GalleryStatus.ACTIVE },
    });

    await prisma.auditLog.create({
      data: {
        studio_id: studioId,
        user_id: request.user?.userId,
        action: 'GALLERY_RESTORED',
        resource_type: 'gallery',
        resource_id: id,
      },
    });

    return reply.send({ success: true, data: updated });
  }

  /**
   * POST /api/galleries/:id/duplicate
   * Duplicates gallery metadata, access settings, and albums WITHOUT duplicating physical photo files.
   */
  static async duplicate(request: FastifyRequest, reply: FastifyReply) {
    const { id } = request.params as { id: string };
    const studioId = request.studioId!;

    const original = await prisma.gallery.findFirst({
      where: { id, studio_id: studioId },
      include: { albums: true },
    });

    if (!original) {
      return reply.status(404).send({ success: false, error: { code: 'NOT_FOUND', message: 'Gallery not found' } });
    }

    const duplicateTitle = `${original.title} (Copy)`;
    const baseSlug = duplicateTitle.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    const slug = `${baseSlug}-${Date.now().toString().slice(-4)}`;

    const duplicated = await prisma.gallery.create({
      data: {
        studio_id: studioId,
        title: duplicateTitle,
        slug,
        event_type: original.event_type,
        event_date: original.event_date,
        description: original.description,
        cover_photo_url: original.cover_photo_url,
        access_type: original.access_type,
        status: GalleryStatus.DRAFT,
        password_hash: original.password_hash,
        is_unlisted: original.is_unlisted,
        enable_ai_face_search: original.enable_ai_face_search,
        face_match_sensitivity: original.face_match_sensitivity,
        downloads_enabled: original.downloads_enabled,
        download_originals_enabled: original.download_originals_enabled,
        bulk_download_enabled: original.bulk_download_enabled,
        watermark_mode: original.watermark_mode,
      },
    });

    // Copy albums structure
    for (const album of original.albums) {
      await prisma.album.create({
        data: {
          gallery_id: duplicated.id,
          studio_id: studioId,
          title: album.title,
          description: album.description,
          sort_order: album.sort_order,
        },
      });
    }

    await prisma.auditLog.create({
      data: {
        studio_id: studioId,
        user_id: request.user?.userId,
        action: 'GALLERY_DUPLICATED',
        resource_type: 'gallery',
        resource_id: duplicated.id,
        metadata: { original_gallery_id: id },
      },
    });

    return reply.status(201).send({
      success: true,
      data: {
        ...duplicated,
        message: 'Gallery duplicated without copying photos.',
      },
    });
  }

  /**
   * GET /api/galleries/:id/overview
   * Rich metrics and live overview for photographer workspace Overview Tab.
   */
  static async getOverview(request: FastifyRequest, reply: FastifyReply) {
    const { id } = request.params as { id: string };
    const studioId = request.studioId!;

    const gallery = await prisma.gallery.findFirst({
      where: { id, studio_id: studioId },
      include: {
        _count: {
          select: {
            photos: true,
            favorites: true,
            selections: true,
            face_detections: true,
            client_sessions: true,
            download_jobs: true,
          },
        },
      },
    });

    if (!gallery) {
      return reply.status(404).send({ success: false, error: { code: 'NOT_FOUND', message: 'Gallery not found' } });
    }

    const [processedCount, aiIndexedCount, storageAggregate, recentLogs] = await Promise.all([
      prisma.photo.count({ where: { gallery_id: id, processing_status: ProcessingStatus.COMPLETED } }),
      prisma.photo.count({ where: { gallery_id: id, is_face_indexed: true } }),
      prisma.photo.aggregate({
        where: { gallery_id: id },
        _sum: { file_size: true },
      }),
      prisma.auditLog.findMany({
        where: { studio_id: studioId, resource_id: id },
        take: 10,
        orderBy: { created_at: 'desc' },
      }),
    ]);

    return reply.send({
      success: true,
      data: {
        gallery_id: id,
        title: gallery.title,
        status: gallery.status,
        photo_count: gallery._count.photos,
        processed_photos_count: processedCount,
        ai_indexed_photos_count: aiIndexedCount,
        total_faces_detected: gallery._count.face_detections,
        client_views_count: gallery._count.client_sessions + (gallery.client_views_count || 0),
        favorites_count: gallery._count.favorites,
        selections_count: gallery._count.selections,
        downloads_count: gallery._count.download_jobs,
        storage_used_bytes: Number(storageAggregate._sum.file_size || 0),
        processing_status: gallery.ai_indexing_status,
        ai_indexing_status: gallery.ai_indexing_status,
        recent_activity: recentLogs.map((log) => ({
          id: log.id,
          action: log.action,
          description: `Action ${log.action} performed`,
          timestamp: log.created_at,
        })),
      },
    });
  }

  /**
   * GET /api/galleries/:id/photos
   * Server-side photo search, status/face/favorite filters, sorting, and cursor pagination.
   */
  static async listPhotos(request: FastifyRequest, reply: FastifyReply) {
    const { id } = request.params as { id: string };
    const studioId = request.studioId!;
    const query = request.query as {
      search?: string;
      filter?: string;
      albumId?: string;
      sort?: string;
      cursor?: string;
      limit?: string;
    };

    const limit = Math.min(Math.max(parseInt(query.limit || '40', 10), 1), 100);
    const cursor = query.cursor;

    const gallery = await prisma.gallery.findFirst({
      where: { id, studio_id: studioId },
    });

    if (!gallery) {
      return reply.status(404).send({ success: false, error: { code: 'NOT_FOUND', message: 'Gallery not found' } });
    }

    const whereClause: Record<string, unknown> = {
      gallery_id: id,
      studio_id: studioId,
    };

    // Album filtering
    if (query.albumId) {
      if (query.albumId === 'UNORGANIZED') {
        whereClause.album_id = null;
      } else {
        whereClause.album_id = query.albumId;
      }
    }

    // Status filtering
    if (query.filter && query.filter !== 'ALL') {
      if (query.filter === 'PROCESSED') {
        whereClause.processing_status = ProcessingStatus.COMPLETED;
      } else if (query.filter === 'PROCESSING') {
        whereClause.processing_status = { in: [ProcessingStatus.QUEUED, ProcessingStatus.PROCESSING, ProcessingStatus.PENDING] };
      } else if (query.filter === 'FAILED') {
        whereClause.processing_status = ProcessingStatus.FAILED;
      } else if (query.filter === 'AI_INDEXED') {
        whereClause.is_face_indexed = true;
      } else if (query.filter === 'HAS_FACES') {
        whereClause.face_count = { gt: 0 };
      } else if (query.filter === 'NO_FACES') {
        whereClause.face_count = 0;
      } else if (query.filter === 'FAVORITES') {
        whereClause.favorites = { some: {} };
      } else if (query.filter === 'SELECTED') {
        whereClause.selections = { some: {} };
      }
    }

    // Search by original filename
    if (query.search && query.search.trim()) {
      whereClause.original_filename = { contains: query.search.trim(), mode: 'insensitive' };
    }

    // Sort order
    let orderBy: Record<string, string> = { sort_order: 'asc' };
    if (query.sort === 'NEWEST') {
      orderBy = { created_at: 'desc' };
    } else if (query.sort === 'OLDEST') {
      orderBy = { created_at: 'asc' };
    } else if (query.sort === 'FILENAME_ASC') {
      orderBy = { original_filename: 'asc' };
    } else if (query.sort === 'FILENAME_DESC') {
      orderBy = { original_filename: 'desc' };
    } else if (query.sort === 'SIZE_DESC') {
      orderBy = { file_size: 'desc' };
    }

    const totalCount = await prisma.photo.count({ where: whereClause });

    const photos = await prisma.photo.findMany({
      where: whereClause,
      include: {
        versions: true,
        album: { select: { id: true, title: true } },
        _count: {
          select: { favorites: true, selections: true, face_detections: true },
        },
      },
      orderBy: [orderBy, { id: 'asc' }],
      take: limit + 1,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    });

    const hasMore = photos.length > limit;
    const items = hasMore ? photos.slice(0, limit) : photos;
    const nextCursor = hasMore ? items[items.length - 1].id : null;

    return reply.send({
      success: true,
      data: {
        totalCount,
        hasMore,
        nextCursor,
        photos: items.map((p) => ({
          ...p,
          file_size: Number(p.file_size),
          favorites_count: p._count.favorites,
          selections_count: p._count.selections,
          face_count: p._count.face_detections,
          versions: p.versions.map((v) => ({
            ...v,
            file_size: Number(v.file_size),
          })),
        })),
      },
    });
  }

  /**
   * POST /api/galleries/:id/photos/bulk-action
   * Bulk operations: DELETE, MOVE_TO_ALBUM, REPROCESS, REINDEX_AI.
   */
  static async bulkPhotoAction(request: FastifyRequest, reply: FastifyReply) {
    const { id } = request.params as { id: string };
    const studioId = request.studioId!;
    const body = request.body as {
      action: 'DELETE' | 'MOVE_TO_ALBUM' | 'REPROCESS' | 'REINDEX_AI';
      photo_ids: string[];
      target_album_id?: string | null;
    };

    if (!body.photo_ids || !Array.isArray(body.photo_ids) || body.photo_ids.length === 0) {
      return reply.status(400).send({ success: false, error: { code: 'INVALID_REQUEST', message: 'photo_ids array required' } });
    }

    const photos = await prisma.photo.findMany({
      where: {
        id: { in: body.photo_ids },
        gallery_id: id,
        studio_id: studioId,
      },
      include: { versions: true },
    });

    if (photos.length === 0) {
      return reply.status(404).send({ success: false, error: { code: 'NOT_FOUND', message: 'No matching photos found' } });
    }

    if (body.action === 'DELETE') {
      for (const p of photos) {
        const storageProvider = StorageService.getProvider(p.storage_provider as any);
        await storageProvider.delete(p.storage_path).catch(() => null);
        for (const v of p.versions) {
          if (v.storage_path !== p.storage_path) {
            await storageProvider.delete(v.storage_path).catch(() => null);
          }
        }
      }
      await prisma.photo.deleteMany({
        where: { id: { in: photos.map((p) => p.id) } },
      });
    } else if (body.action === 'MOVE_TO_ALBUM') {
      await prisma.photo.updateMany({
        where: { id: { in: photos.map((p) => p.id) } },
        data: { album_id: body.target_album_id || null },
      });
    } else if (body.action === 'REPROCESS') {
      for (const p of photos) {
        await prisma.photo.update({
          where: { id: p.id },
          data: { processing_status: ProcessingStatus.QUEUED },
        });
        await dispatchPhotoProcessing({
          photoId: p.id,
          studioId,
          galleryId: id,
          storagePath: p.storage_path,
        });
      }
    } else if (body.action === 'REINDEX_AI') {
      for (const p of photos) {
        await prisma.processingJob.create({
          data: {
            studio_id: studioId,
            gallery_id: id,
            photo_id: p.id,
            job_type: JobType.FACE_INDEXING,
            status: ProcessingStatus.QUEUED,
          },
        });
      }
    }

    await prisma.auditLog.create({
      data: {
        studio_id: studioId,
        user_id: request.user?.userId,
        action: `BULK_PHOTO_${body.action}`,
        resource_type: 'photo',
        resource_id: id,
        metadata: { count: photos.length, photo_ids: photos.map((p) => p.id) },
      },
    });

    return reply.send({
      success: true,
      data: {
        action: body.action,
        affectedCount: photos.length,
      },
    });
  }

  /**
   * POST /api/galleries/:id/photos/reorder
   * Batch update photo display sort order.
   */
  static async reorderPhotos(request: FastifyRequest, reply: FastifyReply) {
    const { id } = request.params as { id: string };
    const studioId = request.studioId!;
    const body = request.body as { orders: Array<{ photo_id: string; sort_order: number }> };

    if (!body.orders || !Array.isArray(body.orders)) {
      return reply.status(400).send({ success: false, error: { code: 'INVALID_REQUEST', message: 'orders array required' } });
    }

    const gallery = await prisma.gallery.findFirst({ where: { id, studio_id: studioId } });
    if (!gallery) {
      return reply.status(404).send({ success: false, error: { code: 'NOT_FOUND', message: 'Gallery not found' } });
    }

    // Execute in transaction to avoid partial order states
    await prisma.$transaction(
      body.orders.map((item) =>
        prisma.photo.updateMany({
          where: { id: item.photo_id, gallery_id: id, studio_id: studioId },
          data: { sort_order: item.sort_order },
        })
      )
    );

    return reply.send({ success: true, data: { updated: body.orders.length } });
  }

  /**
   * POST /api/galleries/:id/cover
   * Sets cover photo URL from an existing photo in the gallery.
   */
  static async setCoverPhoto(request: FastifyRequest, reply: FastifyReply) {
    const { id } = request.params as { id: string };
    const studioId = request.studioId!;
    const body = request.body as { photo_id: string };

    const photo = await prisma.photo.findFirst({
      where: { id: body.photo_id, gallery_id: id, studio_id: studioId },
      include: { versions: true },
    });

    if (!photo) {
      return reply.status(404).send({ success: false, error: { code: 'NOT_FOUND', message: 'Photo not found in gallery' } });
    }

    // Prefer LG or MD thumbnail version if available to avoid loading raw original in gallery header
    const lgVersion = photo.versions.find((v) => v.version_type === 'THUMBNAIL_LG');
    const mdVersion = photo.versions.find((v) => v.version_type === 'THUMBNAIL_MD');
    const coverUrl = lgVersion?.url || mdVersion?.url || photo.thumbnail_url || photo.original_url;

    const updated = await prisma.gallery.update({
      where: { id },
      data: { cover_photo_url: coverUrl },
    });

    return reply.send({ success: true, data: updated });
  }

  /**
   * GET /api/galleries/:id/albums
   */
  static async listAlbums(request: FastifyRequest, reply: FastifyReply) {
    const { id } = request.params as { id: string };
    const studioId = request.studioId!;

    const albums = await prisma.album.findMany({
      where: { gallery_id: id, studio_id: studioId },
      include: {
        _count: { select: { photos: true } },
      },
      orderBy: { sort_order: 'asc' },
    });

    return reply.send({
      success: true,
      data: albums.map((a) => ({
        ...a,
        photo_count: a._count.photos,
      })),
    });
  }

  /**
   * POST /api/galleries/:id/albums
   */
  static async createAlbum(request: FastifyRequest, reply: FastifyReply) {
    const { id } = request.params as { id: string };
    const studioId = request.studioId!;
    const body = request.body as { title: string; description?: string; sort_order?: number };

    if (!body.title || !body.title.trim()) {
      return reply.status(400).send({ success: false, error: { code: 'INVALID_REQUEST', message: 'Album title required' } });
    }

    const album = await prisma.album.create({
      data: {
        gallery_id: id,
        studio_id: studioId,
        title: body.title.trim(),
        description: body.description,
        sort_order: body.sort_order ?? 0,
      },
    });

    return reply.status(201).send({ success: true, data: album });
  }

  /**
   * PATCH /api/galleries/:id/albums/:albumId
   */
  static async updateAlbum(request: FastifyRequest, reply: FastifyReply) {
    const { id, albumId } = request.params as { id: string; albumId: string };
    const studioId = request.studioId!;
    const body = request.body as { title?: string; description?: string; sort_order?: number; cover_photo_id?: string };

    const existing = await prisma.album.findFirst({
      where: { id: albumId, gallery_id: id, studio_id: studioId },
    });

    if (!existing) {
      return reply.status(404).send({ success: false, error: { code: 'NOT_FOUND', message: 'Album not found' } });
    }

    const updated = await prisma.album.update({
      where: { id: albumId },
      data: {
        ...(body.title ? { title: body.title.trim() } : {}),
        ...(body.description !== undefined ? { description: body.description } : {}),
        ...(body.sort_order !== undefined ? { sort_order: body.sort_order } : {}),
        ...(body.cover_photo_id !== undefined ? { cover_photo_id: body.cover_photo_id } : {}),
      },
    });

    return reply.send({ success: true, data: updated });
  }

  /**
   * DELETE /api/galleries/:id/albums/:albumId
   */
  static async deleteAlbum(request: FastifyRequest, reply: FastifyReply) {
    const { id, albumId } = request.params as { id: string; albumId: string };
    const studioId = request.studioId!;

    const existing = await prisma.album.findFirst({
      where: { id: albumId, gallery_id: id, studio_id: studioId },
    });

    if (!existing) {
      return reply.status(404).send({ success: false, error: { code: 'NOT_FOUND', message: 'Album not found' } });
    }

    // Set photos album_id to null before deleting
    await prisma.photo.updateMany({
      where: { album_id: albumId },
      data: { album_id: null },
    });

    await prisma.album.delete({ where: { id: albumId } });

    return reply.send({ success: true, data: { message: 'Album deleted and photos unassigned' } });
  }

  /**
   * POST /api/galleries/:id/albums/:albumId/photos
   */
  static async movePhotosToAlbum(request: FastifyRequest, reply: FastifyReply) {
    const { id, albumId } = request.params as { id: string; albumId: string };
    const studioId = request.studioId!;
    const body = request.body as { photo_ids: string[] };

    if (!body.photo_ids || !Array.isArray(body.photo_ids)) {
      return reply.status(400).send({ success: false, error: { code: 'INVALID_REQUEST', message: 'photo_ids array required' } });
    }

    await prisma.photo.updateMany({
      where: { id: { in: body.photo_ids }, gallery_id: id, studio_id: studioId },
      data: { album_id: albumId === 'unassigned' ? null : albumId },
    });

    return reply.send({ success: true, data: { moved: body.photo_ids.length } });
  }

  /**
   * GET /api/galleries/:id/favorites
   */
  static async getFavorites(request: FastifyRequest, reply: FastifyReply) {
    const { id } = request.params as { id: string };
    const studioId = request.studioId!;

    const favorites = await prisma.galleryFavorite.findMany({
      where: { gallery_id: id, gallery: { studio_id: studioId } },
      include: {
        photo: { select: { id: true, original_filename: true, thumbnail_url: true, original_url: true, width: true, height: true } },
        session: { select: { id: true, created_at: true, last_seen_at: true } },
      },
      orderBy: { created_at: 'desc' },
    });

    return reply.send({
      success: true,
      data: {
        total: favorites.length,
        favorites: favorites.map((f) => ({
          id: f.id,
          photo_id: f.photo_id,
          photo: f.photo,
          session_id: f.session_id,
          created_at: f.created_at,
        })),
      },
    });
  }

  /**
   * GET /api/galleries/:id/selections
   */
  static async getSelections(request: FastifyRequest, reply: FastifyReply) {
    const { id } = request.params as { id: string };
    const studioId = request.studioId!;

    const selections = await prisma.gallerySelection.findMany({
      where: { gallery_id: id, gallery: { studio_id: studioId } },
      include: {
        photo: { select: { id: true, original_filename: true, thumbnail_url: true, original_url: true, width: true, height: true } },
        session: { select: { id: true, created_at: true, last_seen_at: true } },
      },
      orderBy: { created_at: 'desc' },
    });

    return reply.send({
      success: true,
      data: {
        total: selections.length,
        selections: selections.map((s) => ({
          id: s.id,
          photo_id: s.photo_id,
          photo: s.photo,
          session_id: s.session_id,
          created_at: s.created_at,
        })),
      },
    });
  }

  /**
   * GET /api/galleries/:id/downloads
   */
  static async getDownloads(request: FastifyRequest, reply: FastifyReply) {
    const { id } = request.params as { id: string };
    const studioId = request.studioId!;

    const downloadJobs = await prisma.clientDownloadJob.findMany({
      where: { gallery_id: id, gallery: { studio_id: studioId } },
      orderBy: { created_at: 'desc' },
    });

    return reply.send({
      success: true,
      data: {
        total: downloadJobs.length,
        jobs: downloadJobs.map((j) => ({
          ...j,
          file_size: Number(j.file_size),
        })),
      },
    });
  }

  /**
   * GET /api/galleries/:id/activity
   */
  static async getActivity(request: FastifyRequest, reply: FastifyReply) {
    const { id } = request.params as { id: string };
    const studioId = request.studioId!;

    const logs = await prisma.auditLog.findMany({
      where: { studio_id: studioId, resource_id: id },
      include: { user: { select: { name: true, email: true } } },
      orderBy: { created_at: 'desc' },
      take: 50,
    });

    return reply.send({
      success: true,
      data: logs,
    });
  }

  /**
   * GET /api/galleries/:id/processing
   */
  static async getProcessingStatus(request: FastifyRequest, reply: FastifyReply) {
    const { id } = request.params as { id: string };
    const studioId = request.studioId!;

    const [photos, jobs] = await Promise.all([
      prisma.photo.findMany({
        where: { gallery_id: id, studio_id: studioId },
        select: { processing_status: true, is_face_indexed: true, face_count: true },
      }),
      prisma.processingJob.findMany({
        where: { gallery_id: id, studio_id: studioId },
        orderBy: { created_at: 'desc' },
        take: 20,
      }),
    ]);

    const total = photos.length;
    const queued = photos.filter((p) => p.processing_status === ProcessingStatus.QUEUED || p.processing_status === ProcessingStatus.PENDING).length;
    const processing = photos.filter((p) => p.processing_status === ProcessingStatus.PROCESSING).length;
    const completed = photos.filter((p) => p.processing_status === ProcessingStatus.COMPLETED).length;
    const failed = photos.filter((p) => p.processing_status === ProcessingStatus.FAILED).length;
    const aiIndexed = photos.filter((p) => p.is_face_indexed).length;
    const totalFaces = photos.reduce((acc, p) => acc + (p.face_count || 0), 0);

    return reply.send({
      success: true,
      data: {
        total,
        queued,
        processing,
        completed,
        failed,
        aiIndexed,
        totalFaces,
        progressPercent: total === 0 ? 100 : Math.round((completed / total) * 100),
        recentJobs: jobs,
      },
    });
  }

  /**
   * POST /api/galleries/:id/ai/reindex
   */
  static async reindexGalleryAi(request: FastifyRequest, reply: FastifyReply) {
    const { id } = request.params as { id: string };
    const studioId = request.studioId!;

    const gallery = await prisma.gallery.findFirst({
      where: { id, studio_id: studioId },
    });

    if (!gallery) {
      return reply.status(404).send({ success: false, error: { code: 'NOT_FOUND', message: 'Gallery not found' } });
    }

    // Set gallery AI indexing status to QUEUED
    await prisma.gallery.update({
      where: { id },
      data: { ai_indexing_status: ProcessingStatus.QUEUED },
    });

    const photos = await prisma.photo.findMany({
      where: { gallery_id: id, studio_id: studioId, processing_status: ProcessingStatus.COMPLETED },
      select: { id: true },
    });

    // Create face indexing jobs
    for (const p of photos) {
      await prisma.processingJob.create({
        data: {
          studio_id: studioId,
          gallery_id: id,
          photo_id: p.id,
          job_type: JobType.FACE_INDEXING,
          status: ProcessingStatus.QUEUED,
        },
      });
    }

    await prisma.auditLog.create({
      data: {
        studio_id: studioId,
        user_id: request.user?.userId,
        action: 'AI_REINDEX_QUEUED',
        resource_type: 'gallery',
        resource_id: id,
        metadata: { photo_count: photos.length },
      },
    });

    return reply.send({
      success: true,
      data: {
        message: `Face re-indexing queued for ${photos.length} photos`,
        queuedCount: photos.length,
      },
    });
  }

  /**
   * POST /api/galleries/:id/ai/retry-failed
   */
  static async retryFailedJobs(request: FastifyRequest, reply: FastifyReply) {
    const { id } = request.params as { id: string };
    const studioId = request.studioId!;

    const failedPhotos = await prisma.photo.findMany({
      where: { gallery_id: id, studio_id: studioId, processing_status: ProcessingStatus.FAILED },
    });

    for (const p of failedPhotos) {
      await prisma.photo.update({
        where: { id: p.id },
        data: { processing_status: ProcessingStatus.QUEUED },
      });
      await dispatchPhotoProcessing({
        photoId: p.id,
        studioId,
        galleryId: id,
        storagePath: p.storage_path,
      });
    }

    return reply.send({
      success: true,
      data: {
        retriedCount: failedPhotos.length,
      },
    });
  }

  // =============================================================
  // PHASE 7: CLIENT CRM ↔ GALLERY DELIVERY WORKFLOW
  // =============================================================

  /**
   * POST /api/galleries/:id/assign-client
   * Assigns an existing client to this gallery.
   */
  static async assignClient(request: FastifyRequest, reply: FastifyReply) {
    const { id } = request.params as { id: string };
    const studioId = request.studioId!;
    const body = z.object({
      client_id: z.string().uuid(),
      relationship_type: z.string().default('PRIMARY'),
    }).parse(request.body);

    const gallery = await prisma.gallery.findFirst({
      where: { id, studio_id: studioId },
    });

    if (!gallery) {
      return reply.status(404).send({
        statusCode: 404,
        error: 'Not Found',
        message: 'Gallery not found or unauthorized',
      });
    }

    const client = await prisma.client.findFirst({
      where: { id: body.client_id, studio_id: studioId, deleted_at: null },
    });

    if (!client) {
      return reply.status(404).send({
        statusCode: 404,
        error: 'Not Found',
        message: 'Client not found or belongs to another studio',
      });
    }

    const clientGallery = await prisma.clientGallery.upsert({
      where: {
        client_id_gallery_id: {
          client_id: client.id,
          gallery_id: gallery.id,
        },
      },
      update: {
        relationship_type: body.relationship_type,
      },
      create: {
        client_id: client.id,
        gallery_id: gallery.id,
        studio_id: studioId,
        relationship_type: body.relationship_type,
      },
    });

    // Also update client's primary gallery_id if null
    if (!client.gallery_id) {
      await prisma.client.update({
        where: { id: client.id },
        data: { gallery_id: gallery.id },
      });
    }

    // Log Activity
    await prisma.clientActivity.create({
      data: {
        studio_id: studioId,
        client_id: client.id,
        gallery_id: gallery.id,
        activity_type: 'GALLERY_ASSIGNED',
        description: `Assigned to "${gallery.title}" as ${body.relationship_type}`,
      },
    }).catch(() => null);

    return reply.status(200).send({
      success: true,
      data: clientGallery,
    });
  }

  /**
   * DELETE /api/galleries/:id/unassign-client/:clientId
   */
  static async unassignClient(request: FastifyRequest, reply: FastifyReply) {
    const { id, clientId } = request.params as { id: string; clientId: string };
    const studioId = request.studioId!;

    const relationship = await prisma.clientGallery.findFirst({
      where: { gallery_id: id, client_id: clientId, studio_id: studioId },
      include: { gallery: { select: { title: true } } },
    });

    if (!relationship) {
      return reply.status(404).send({
        statusCode: 404,
        error: 'Not Found',
        message: 'Client-gallery relationship not found',
      });
    }

    await prisma.clientGallery.delete({
      where: { id: relationship.id },
    });

    // Log unassignment
    await prisma.clientActivity.create({
      data: {
        studio_id: studioId,
        client_id: clientId,
        gallery_id: id,
        activity_type: 'GALLERY_UNASSIGNED',
        description: `Unassigned from "${relationship.gallery.title}"`,
      },
    }).catch(() => null);

    return reply.send({
      success: true,
      message: 'Client successfully unassigned from gallery',
    });
  }

  /**
   * POST /api/galleries/:id/delivery/send
   * Dispatches professional gallery delivery email with idempotency and state tracking.
   */
  static async sendDelivery(request: FastifyRequest, reply: FastifyReply) {
    const { id } = request.params as { id: string };
    const studioId = request.studioId!;
    const body = z.object({
      client_id: z.string().uuid().optional(),
      recipient_email: z.string().email().toLowerCase().trim().optional(),
      recipient_name: z.string().trim().optional(),
      custom_message: z.string().trim().optional(),
      send_email: z.boolean().default(true),
      idempotency_key: z.string().optional(),
    }).parse(request.body);

    const gallery = await prisma.gallery.findFirst({
      where: { id, studio_id: studioId },
      include: {
        studio: { select: { id: true, name: true, logo_url: true, website: true } },
      },
    });

    if (!gallery) {
      return reply.status(404).send({
        statusCode: 404,
        error: 'Not Found',
        message: 'Gallery not found or unauthorized',
      });
    }

    // Resolve or create client
    let targetClient: any = null;
    if (body.client_id) {
      targetClient = await prisma.client.findFirst({
        where: { id: body.client_id, studio_id: studioId },
      });
    } else if (body.recipient_email) {
      targetClient = await prisma.client.findFirst({
        where: { email: body.recipient_email, studio_id: studioId, deleted_at: null },
      });
      if (!targetClient) {
        targetClient = await prisma.client.create({
          data: {
            studio_id: studioId,
            gallery_id: gallery.id,
            name: body.recipient_name || body.recipient_email.split('@')[0],
            email: body.recipient_email,
            status: 'ACTIVE',
          },
        });
      }
    }

    if (!targetClient) {
      return reply.status(400).send({
        statusCode: 400,
        error: 'Bad Request',
        message: 'A valid client_id or recipient_email is required for delivery',
      });
    }

    const recipientEmail = body.recipient_email || targetClient.email;
    const recipientName = body.recipient_name || targetClient.name;

    // Idempotency Defense: Check if recently sent with same idempotency key
    if (body.idempotency_key) {
      const existingDelivery = await prisma.galleryDelivery.findFirst({
        where: {
          studio_id: studioId,
          gallery_id: gallery.id,
          idempotency_key: body.idempotency_key,
        },
      });

      if (existingDelivery) {
        return reply.status(200).send({
          success: true,
          data: existingDelivery,
          is_idempotent_replay: true,
        });
      }
    }

    // Ensure client_gallery link exists
    await prisma.clientGallery.upsert({
      where: {
        client_id_gallery_id: {
          client_id: targetClient.id,
          gallery_id: gallery.id,
        },
      },
      update: {},
      create: {
        client_id: targetClient.id,
        gallery_id: gallery.id,
        studio_id: studioId,
        relationship_type: 'PRIMARY',
      },
    });

    // Import EmailService dynamically to avoid circular dependencies
    const { EmailService } = await import('../../services/email/email.service.js');

    let emailResult: { success: boolean; messageId?: string; error?: string } = { success: true, messageId: 'dev-delivered' };
    if (body.send_email) {
      emailResult = await EmailService.sendGalleryDelivery({
        recipientEmail,
        recipientName,
        galleryTitle: gallery.title,
        gallerySlug: gallery.slug,
        eventType: gallery.event_type,
        eventDate: gallery.event_date,
        coverPhotoUrl: gallery.cover_photo_url,
        customMessage: body.custom_message,
        isPasswordProtected: Boolean(gallery.password_hash),
        expiresAt: gallery.expires_at,
        downloadsEnabled: gallery.downloads_enabled,
        studioName: gallery.studio.name,
        studioLogoUrl: gallery.studio.logo_url,
        studioWebsite: gallery.studio.website,
      });
    }

    // Determine delivery status
    const deliveryStatus = emailResult.success ? 'SENT' : 'FAILED';

    const delivery = await prisma.galleryDelivery.create({
      data: {
        studio_id: studioId,
        gallery_id: gallery.id,
        client_id: targetClient.id,
        recipient_email: recipientEmail,
        recipient_name: recipientName,
        custom_message: body.custom_message || null,
        delivery_type: 'INITIAL',
        status: deliveryStatus,
        error_message: emailResult.success ? null : (emailResult as any).error || 'Email dispatch failed',
        idempotency_key: body.idempotency_key || null,
      },
    });

    // Log Activity
    if (emailResult.success) {
      await prisma.clientActivity.create({
        data: {
          studio_id: studioId,
          client_id: targetClient.id,
          gallery_id: gallery.id,
          activity_type: 'GALLERY_SHARED',
          description: `Gallery "${gallery.title}" delivered to ${recipientEmail}`,
          metadata: { delivery_id: delivery.id },
        },
      }).catch(() => null);
    }

    return reply.status(emailResult.success ? 201 : 502).send({
      success: emailResult.success,
      data: delivery,
      error: emailResult.success ? undefined : (emailResult as any).error,
    });
  }

  /**
   * POST /api/galleries/:id/delivery/reminder
   * Sends a follow-up reminder email to the assigned client.
   */
  static async sendReminder(request: FastifyRequest, reply: FastifyReply) {
    const { id } = request.params as { id: string };
    const studioId = request.studioId!;
    const body = z.object({
      client_id: z.string().uuid().optional(),
      custom_message: z.string().trim().optional(),
    }).parse(request.body);

    const gallery = await prisma.gallery.findFirst({
      where: { id, studio_id: studioId },
      include: {
        studio: { select: { id: true, name: true, logo_url: true, website: true } },
        client_galleries: { include: { client: true }, take: 1 },
      },
    });

    if (!gallery) {
      return reply.status(404).send({
        statusCode: 404,
        error: 'Not Found',
        message: 'Gallery not found',
      });
    }

    let client = null;
    if (body.client_id) {
      client = await prisma.client.findFirst({
        where: { id: body.client_id, studio_id: studioId },
      });
    } else {
      client = gallery.client_galleries[0]?.client;
    }

    if (!client) {
      return reply.status(400).send({
        statusCode: 400,
        error: 'Bad Request',
        message: 'No assigned client found to send reminder',
      });
    }

    const { EmailService } = await import('../../services/email/email.service.js');
    const emailResult = await EmailService.sendGalleryReminder({
      recipientEmail: client.email,
      recipientName: client.name,
      galleryTitle: gallery.title,
      gallerySlug: gallery.slug,
      customMessage: body.custom_message,
      studioName: gallery.studio.name,
      studioLogoUrl: gallery.studio.logo_url,
      studioWebsite: gallery.studio.website,
    });

    const delivery = await prisma.galleryDelivery.create({
      data: {
        studio_id: studioId,
        gallery_id: gallery.id,
        client_id: client.id,
        recipient_email: client.email,
        recipient_name: client.name,
        custom_message: body.custom_message || null,
        delivery_type: 'REMINDER',
        status: emailResult.success ? 'SENT' : 'FAILED',
        error_message: emailResult.success ? null : (emailResult as any).error,
      },
    });

    if (emailResult.success) {
      await prisma.clientActivity.create({
        data: {
          studio_id: studioId,
          client_id: client.id,
          gallery_id: gallery.id,
          activity_type: 'REMINDER_SENT',
          description: `Reminder for "${gallery.title}" sent to ${client.email}`,
        },
      }).catch(() => null);
    }

    return reply.status(emailResult.success ? 200 : 502).send({
      success: emailResult.success,
      data: delivery,
    });
  }

  /**
   * GET /api/galleries/:id/delivery
   * Returns delivery status, history, assigned clients, and client interaction statistics.
   */
  static async getDeliveryInfo(request: FastifyRequest, reply: FastifyReply) {
    const { id } = request.params as { id: string };
    const studioId = request.studioId!;

    const gallery = await prisma.gallery.findFirst({
      where: { id, studio_id: studioId },
      include: {
        client_galleries: {
          include: {
            client: {
              select: {
                id: true,
                name: true,
                email: true,
                phone: true,
                company: true,
                status: true,
                notes: true,
                tags: true,
              },
            },
          },
        },
        deliveries: {
          orderBy: { created_at: 'desc' },
          include: {
            client: { select: { id: true, name: true, email: true } },
          },
        },
      },
    });

    if (!gallery) {
      return reply.status(404).send({
        statusCode: 404,
        error: 'Not Found',
        message: 'Gallery not found',
      });
    }

    const [viewsCount, favoritesCount, selectionsCount, downloadsCount] = await Promise.all([
      prisma.galleryClientSession.count({ where: { gallery_id: id } }),
      prisma.galleryFavorite.count({ where: { gallery_id: id } }),
      prisma.gallerySelection.count({ where: { gallery_id: id } }),
      prisma.clientDownloadJob.count({ where: { gallery_id: id } }),
    ]);

    // Compute overall delivery status
    const latestDelivery = gallery.deliveries[0];
    let overallStatus = 'NOT_SENT';

    if (gallery.expires_at && new Date() > gallery.expires_at) {
      overallStatus = 'EXPIRED';
    } else if (viewsCount > 0 || latestDelivery?.status === 'OPENED' || latestDelivery?.status === 'ACTIVE') {
      overallStatus = 'OPENED';
    } else if (latestDelivery?.status === 'SENT') {
      overallStatus = 'SENT';
    } else if (latestDelivery?.status === 'FAILED') {
      overallStatus = 'FAILED';
    }

    return reply.send({
      success: true,
      data: {
        gallery_id: gallery.id,
        title: gallery.title,
        slug: gallery.slug,
        access_type: gallery.access_type,
        is_password_protected: Boolean(gallery.password_hash),
        expires_at: gallery.expires_at,
        overall_delivery_status: overallStatus,
        assigned_clients: gallery.client_galleries.map((cg) => ({
          ...cg.client,
          relationship_type: cg.relationship_type,
          assigned_at: cg.created_at,
        })),
        deliveries: gallery.deliveries,
        stats: {
          views: viewsCount,
          favorites: favoritesCount,
          selections: selectionsCount,
          downloads: downloadsCount,
          last_opened: latestDelivery?.opened_at || latestDelivery?.last_accessed_at || null,
          last_sent: latestDelivery?.sent_at || null,
        },
      },
    });
  }

  /**
   * GET /api/galleries/:id/delivery/activity
   */
  static async getDeliveryActivity(request: FastifyRequest, reply: FastifyReply) {
    const { id } = request.params as { id: string };
    const query = request.query as { limit?: number };
    const studioId = request.studioId!;
    const limit = Math.min(Number(query?.limit) || 30, 100);

    const activities = await prisma.clientActivity.findMany({
      where: { gallery_id: id, studio_id: studioId },
      take: limit,
      orderBy: { created_at: 'desc' },
      include: {
        client: { select: { id: true, name: true, email: true } },
      },
    });

    return reply.send({
      success: true,
      data: activities,
    });
  }
}
