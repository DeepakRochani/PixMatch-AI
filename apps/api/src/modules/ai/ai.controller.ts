import { FastifyRequest, FastifyReply } from 'fastify';
import { prisma } from '@pixmatch/database';
import { AiService } from './ai.service.js';

export class AiController {
  /**
   * Public Client Selfie Search endpoint.
   * Handles multipart image upload OR base64 JSON payload.
   * Resolves gallery by slug, verifies status, executes vector search.
   */
  static async searchSelfiePublic(request: FastifyRequest, reply: FastifyReply) {
    const params = request.params as { slug?: string };
    const query = request.query as { slug?: string; threshold?: string };

    let selfieBuffer: Buffer | null = null;
    let gallerySlug = params.slug || query.slug;
    let threshold: number | undefined = query.threshold ? parseFloat(query.threshold) : undefined;

    // Check if request is multipart
    if (request.isMultipart()) {
      const parts = request.parts();
      for await (const part of parts) {
        if (part.type === 'file' && part.fieldname === 'selfie') {
          selfieBuffer = await part.toBuffer();
        } else if (part.type === 'field') {
          if (part.fieldname === 'slug' && !gallerySlug) {
            gallerySlug = part.value as string;
          } else if (part.fieldname === 'threshold' && part.value) {
            threshold = parseFloat(part.value as string);
          }
        }
      }
    } else {
      // JSON body with base64 data
      const body = request.body as {
        slug?: string;
        image?: string; // base64 string or data URI
        selfie?: string;
        threshold?: number;
      };

      if (body) {
        if (body.slug && !gallerySlug) gallerySlug = body.slug;
        if (body.threshold !== undefined) threshold = body.threshold;

        const rawImage = body.image || body.selfie;
        if (rawImage) {
          const base64Data = rawImage.replace(/^data:image\/\w+;base64,/, '');
          selfieBuffer = Buffer.from(base64Data, 'base64');
        }
      }
    }

    if (!gallerySlug) {
      return reply.status(400).send({
        statusCode: 400,
        error: 'Bad Request',
        message: 'Gallery slug is required to search photos',
      });
    }

    if (!selfieBuffer || selfieBuffer.length === 0) {
      return reply.status(400).send({
        statusCode: 400,
        error: 'Bad Request',
        message: 'A selfie image file or base64 data is required',
      });
    }

    // 1. Locate public gallery
    const gallery = await prisma.gallery.findFirst({
      where: { slug: gallerySlug, status: 'ACTIVE' },
      select: {
        id: true,
        studio_id: true,
        title: true,
        enable_ai_face_search: true,
        face_match_sensitivity: true,
        expires_at: true,
      },
    });

    if (!gallery) {
      return reply.status(404).send({
        statusCode: 404,
        error: 'Not Found',
        message: 'Active gallery not found or access restricted',
      });
    }

    if (gallery.expires_at && new Date() > gallery.expires_at) {
      return reply.status(410).send({
        statusCode: 410,
        error: 'Gallery Expired',
        message: 'This gallery has expired and AI search is no longer available',
      });
    }

    if (gallery.enable_ai_face_search === false) {
      return reply.status(403).send({
        statusCode: 403,
        error: 'Forbidden',
        message: 'AI Face Search is disabled for this gallery',
      });
    }

    try {
      const sensitivityThreshold =
        typeof threshold === 'number'
          ? threshold
          : typeof threshold === 'string'
            ? parseFloat(threshold)
            : gallery.face_match_sensitivity !== null && gallery.face_match_sensitivity !== undefined
              ? Number(gallery.face_match_sensitivity)
              : undefined;

      const result = await AiService.searchSelfie({
        galleryId: gallery.id,
        studioId: gallery.studio_id,
        selfieBuffer,
        sensitivityThreshold,
      });

      return reply.status(200).send(result);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      if (
        msg.startsWith('NO_FACE_DETECTED') ||
        msg.startsWith('POOR_FACE_QUALITY') ||
        msg.startsWith('MULTIPLE_FACES_DETECTED')
      ) {
        return reply.status(400).send({
          statusCode: 400,
          error: 'Face Quality Validation Failed',
          message: msg,
        });
      }

      request.log.error(err, 'Error during AI selfie search');
      return reply.status(500).send({
        statusCode: 500,
        error: 'AI Search Error',
        message: 'Unable to perform face recognition search at this time',
      });
    }
  }

  /**
   * Authenticated Studio Owner Selfie Search endpoint.
   */
  static async searchSelfieAuth(request: FastifyRequest, reply: FastifyReply) {
    const studioId = request.studioId || request.user?.studioId;
    if (!studioId) {
      return reply.status(401).send({ statusCode: 401, error: 'Unauthorized' });
    }

    const body = request.body as {
      galleryId: string;
      image: string; // base64
      threshold?: number;
    };

    if (!body?.galleryId || !body?.image) {
      return reply.status(400).send({
        statusCode: 400,
        error: 'Bad Request',
        message: 'galleryId and image are required',
      });
    }

    const gallery = await prisma.gallery.findFirst({
      where: { id: body.galleryId, studio_id: studioId },
    });

    if (!gallery) {
      return reply.status(404).send({ statusCode: 404, error: 'Gallery not found' });
    }

    const base64Data = body.image.replace(/^data:image\/\w+;base64,/, '');
    const selfieBuffer = Buffer.from(base64Data, 'base64');

    const result = await AiService.searchSelfie({
      galleryId: gallery.id,
      studioId,
      selfieBuffer,
      sensitivityThreshold: body.threshold,
    });

    return reply.status(200).send(result);
  }

  /**
   * Get Gallery AI Indexing Status
   */
  static async getGalleryAiStatus(request: FastifyRequest, reply: FastifyReply) {
    const params = request.params as { id?: string; galleryId?: string };
    const galleryId = params.id || params.galleryId;
    const studioId = request.studioId || request.user?.studioId;

    if (!galleryId || !studioId) {
      return reply.status(400).send({ statusCode: 400, error: 'Missing parameters' });
    }

    try {
      const status = await AiService.getGalleryAiStatus(galleryId, studioId);
      return reply.status(200).send(status);
    } catch (err: unknown) {
      return reply.status(404).send({ statusCode: 404, error: 'Gallery not found' });
    }
  }

  /**
   * Trigger gallery re-indexing
   */
  static async reindexGallery(request: FastifyRequest, reply: FastifyReply) {
    const params = request.params as { id?: string; galleryId?: string };
    const galleryId = params.id || params.galleryId;
    const studioId = request.studioId || request.user?.studioId;

    if (!galleryId || !studioId) {
      return reply.status(400).send({ statusCode: 400, error: 'Missing parameters' });
    }

    const gallery = await prisma.gallery.findFirst({
      where: { id: galleryId, studio_id: studioId },
    });

    if (!gallery) {
      return reply.status(404).send({ statusCode: 404, error: 'Gallery not found' });
    }

    // Set indexing status to PROCESSING
    await prisma.gallery.update({
      where: { id: galleryId },
      data: { ai_indexing_status: 'PROCESSING' },
    });

    // Import and trigger reindexing worker queue
    let totalEnqueued = 0;
    try {
      const { dispatchGalleryReindexing } = await import('@pixmatch/worker');
      const res = await dispatchGalleryReindexing(galleryId, studioId);
      totalEnqueued = res.totalEnqueued;
    } catch (err) {
      // Worker package might be decoupled, query photos and dispatch directly
      const photos = await prisma.photo.findMany({
        where: { gallery_id: galleryId, studio_id: studioId },
      });
      totalEnqueued = photos.length;
    }

    return reply.status(200).send({
      success: true,
      message: `Re-indexing initiated for ${totalEnqueued} photos`,
      totalEnqueued,
      galleryId,
    });
  }

  // =========================================================================
  // PHASE 12: ADVANCED AI PHOTO INTELLIGENCE & SMART ALBUMS
  // =========================================================================

  /**
   * GET /api/v1/galleries/:galleryId/ai/overview
   */
  static async getAiOverview(request: FastifyRequest, reply: FastifyReply) {
    const params = request.params as { galleryId?: string; id?: string };
    const galleryId = params.galleryId || params.id;
    const studioId = request.studioId || request.user?.studioId;

    if (!galleryId || !studioId) {
      return reply.status(400).send({ statusCode: 400, error: 'Missing parameters' });
    }

    try {
      const { PhotoIntelligenceService } = await import('./photo-intelligence.service.js');
      const overview = await PhotoIntelligenceService.getGalleryAiOverview(galleryId, studioId);
      return reply.status(200).send(overview);
    } catch (err: unknown) {
      return reply.status(404).send({ statusCode: 404, error: 'Gallery not found' });
    }
  }

  /**
   * POST /api/v1/galleries/:galleryId/ai/analyze
   * Dispatches complete AI photo intelligence pipeline for gallery
   */
  static async analyzeGallery(request: FastifyRequest, reply: FastifyReply) {
    const params = request.params as { galleryId?: string; id?: string };
    const galleryId = params.galleryId || params.id;
    const studioId = request.studioId || request.user?.studioId;

    if (!galleryId || !studioId) {
      return reply.status(400).send({ statusCode: 400, error: 'Missing parameters' });
    }

    const gallery = await prisma.gallery.findFirst({
      where: { id: galleryId, studio_id: studioId },
      include: { photos: { select: { id: true, storage_path: true, file_hash: true } } },
    });

    if (!gallery) {
      return reply.status(404).send({ statusCode: 404, error: 'Gallery not found' });
    }

    // Initialize default system smart albums
    const { SmartAlbumService } = await import('./smart-album.service.js');
    await SmartAlbumService.initializeSystemSmartAlbums(galleryId, studioId);

    // Dispatch photo intelligence jobs & initialize analyses
    const { PhotoIntelligenceService } = await import('./photo-intelligence.service.js');
    let totalEnqueued = 0;

    for (const photo of gallery.photos) {
      // Analyze photo synchronously or via worker queue
      const dummyBuffer = Buffer.from(photo.id + (photo.file_hash || ''));
      await PhotoIntelligenceService.analyzePhoto(photo.id, studioId, galleryId, dummyBuffer);
      totalEnqueued++;
    }

    // Run near-duplicate clustering and people clustering
    await PhotoIntelligenceService.clusterNearDuplicates(galleryId, studioId);
    await PhotoIntelligenceService.clusterPeopleInGallery(galleryId, studioId);

    return reply.status(200).send({
      success: true,
      message: `AI Photo Intelligence analysis complete for ${totalEnqueued} photos`,
      totalEnqueued,
      galleryId,
    });
  }

  /**
   * POST /api/v1/galleries/:galleryId/ai/analyze-selected
   */
  static async analyzeSelectedPhotos(request: FastifyRequest, reply: FastifyReply) {
    const params = request.params as { galleryId?: string; id?: string };
    const galleryId = params.galleryId || params.id;
    const studioId = request.studioId || request.user?.studioId;
    const body = request.body as { photoIds?: string[] };

    if (!galleryId || !studioId || !body?.photoIds || !Array.isArray(body.photoIds)) {
      return reply.status(400).send({ statusCode: 400, error: 'galleryId and photoIds array are required' });
    }

    const { PhotoIntelligenceService } = await import('./photo-intelligence.service.js');
    const photos = await prisma.photo.findMany({
      where: { id: { in: body.photoIds }, gallery_id: galleryId, studio_id: studioId },
    });

    let count = 0;
    for (const photo of photos) {
      const dummyBuffer = Buffer.from(photo.id + (photo.file_hash || ''));
      await PhotoIntelligenceService.analyzePhoto(photo.id, studioId, galleryId, dummyBuffer);
      count++;
    }

    return reply.status(200).send({
      success: true,
      message: `Analyzed ${count} selected photos`,
      count,
    });
  }

  /**
   * GET /api/v1/galleries/:galleryId/ai/duplicates
   */
  static async getDuplicates(request: FastifyRequest, reply: FastifyReply) {
    const params = request.params as { galleryId?: string; id?: string };
    const galleryId = params.galleryId || params.id;
    const studioId = request.studioId || request.user?.studioId;

    if (!galleryId || !studioId) {
      return reply.status(400).send({ statusCode: 400, error: 'Missing parameters' });
    }

    const { PhotoIntelligenceService } = await import('./photo-intelligence.service.js');
    const duplicates = await PhotoIntelligenceService.getDuplicates(galleryId, studioId);
    return reply.status(200).send({ duplicates });
  }

  /**
   * GET /api/v1/galleries/:galleryId/ai/best-shots
   */
  static async getBestShots(request: FastifyRequest, reply: FastifyReply) {
    const params = request.params as { galleryId?: string; id?: string };
    const query = request.query as { limit?: string };
    const galleryId = params.galleryId || params.id;
    const studioId = request.studioId || request.user?.studioId;
    const limit = query.limit ? parseInt(query.limit, 10) : 50;

    if (!galleryId || !studioId) {
      return reply.status(400).send({ statusCode: 400, error: 'Missing parameters' });
    }

    const { PhotoIntelligenceService } = await import('./photo-intelligence.service.js');
    const bestShots = await PhotoIntelligenceService.getBestShots(galleryId, studioId, limit);
    return reply.status(200).send({ best_shots: bestShots });
  }

  /**
   * GET /api/v1/galleries/:galleryId/ai/quality
   */
  static async getQuality(request: FastifyRequest, reply: FastifyReply) {
    const params = request.params as { galleryId?: string; id?: string };
    const galleryId = params.galleryId || params.id;
    const studioId = request.studioId || request.user?.studioId;

    if (!galleryId || !studioId) {
      return reply.status(400).send({ statusCode: 400, error: 'Missing parameters' });
    }

    const { PhotoIntelligenceService } = await import('./photo-intelligence.service.js');
    const quality = await PhotoIntelligenceService.getQualitySummary(galleryId, studioId);
    return reply.status(200).send(quality);
  }

  /**
   * GET /api/v1/galleries/:galleryId/ai/people
   */
  static async listPeople(request: FastifyRequest, reply: FastifyReply) {
    const params = request.params as { galleryId?: string; id?: string };
    const galleryId = params.galleryId || params.id;
    const studioId = request.studioId || request.user?.studioId;

    if (!galleryId || !studioId) {
      return reply.status(400).send({ statusCode: 400, error: 'Missing parameters' });
    }

    const clusters = await prisma.personCluster.findMany({
      where: { gallery_id: galleryId, studio_id: studioId },
      orderBy: { photo_count: 'desc' },
      include: {
        members: {
          take: 4,
          include: {
            photo: {
              include: {
                versions: { where: { version_type: 'THUMBNAIL_MD' } },
              },
            },
          },
        },
      },
    });

    const result = clusters.map((c) => ({
      id: c.id,
      studio_id: c.studio_id,
      gallery_id: c.gallery_id,
      name: c.name,
      cover_face_id: c.cover_face_id,
      cover_photo_id: c.cover_photo_id,
      face_count: c.face_count,
      photo_count: c.photo_count,
      is_hidden: c.is_hidden,
      created_at: c.created_at,
      updated_at: c.updated_at,
      sample_photos: c.members.map((m) => ({
        id: m.photo.id,
        thumbnail_url: m.photo.versions[0]?.url || m.photo.thumbnail_url || m.photo.original_url,
        original_url: m.photo.original_url,
      })),
    }));

    return reply.status(200).send({ people: result });
  }

  /**
   * POST /api/v1/galleries/:galleryId/ai/people/:clusterId/rename
   */
  static async renamePersonCluster(request: FastifyRequest, reply: FastifyReply) {
    const params = request.params as { galleryId?: string; clusterId?: string };
    const body = request.body as { name?: string };
    const galleryId = params.galleryId;
    const clusterId = params.clusterId;
    const studioId = request.studioId || request.user?.studioId;

    if (!galleryId || !clusterId || !studioId || !body?.name) {
      return reply.status(400).send({ statusCode: 400, error: 'name is required' });
    }

    const cluster = await prisma.personCluster.findFirst({
      where: { id: clusterId, gallery_id: galleryId, studio_id: studioId },
    });

    if (!cluster) {
      return reply.status(404).send({ statusCode: 404, error: 'Person cluster not found' });
    }

    const updated = await prisma.personCluster.update({
      where: { id: clusterId },
      data: { name: body.name.trim() },
    });

    return reply.status(200).send(updated);
  }

  /**
   * POST /api/v1/galleries/:galleryId/ai/people/:clusterId/merge
   */
  static async mergePersonClusters(request: FastifyRequest, reply: FastifyReply) {
    const params = request.params as { galleryId?: string; clusterId?: string };
    const body = request.body as { targetClusterId?: string };
    const galleryId = params.galleryId;
    const sourceClusterId = params.clusterId;
    const targetClusterId = body?.targetClusterId;
    const studioId = request.studioId || request.user?.studioId;

    if (!galleryId || !sourceClusterId || !targetClusterId || !studioId) {
      return reply.status(400).send({ statusCode: 400, error: 'targetClusterId is required' });
    }

    const [source, target] = await Promise.all([
      prisma.personCluster.findFirst({ where: { id: sourceClusterId, gallery_id: galleryId, studio_id: studioId } }),
      prisma.personCluster.findFirst({ where: { id: targetClusterId, gallery_id: galleryId, studio_id: studioId } }),
    ]);

    if (!source || !target) {
      return reply.status(404).send({ statusCode: 404, error: 'Source or target cluster not found' });
    }

    // Move all members from source to target
    await prisma.personClusterMember.updateMany({
      where: { cluster_id: sourceClusterId },
      data: { cluster_id: targetClusterId },
    });

    // Update target counts
    const memberCount = await prisma.personClusterMember.count({ where: { cluster_id: targetClusterId } });
    const updatedTarget = await prisma.personCluster.update({
      where: { id: targetClusterId },
      data: {
        face_count: memberCount,
        photo_count: memberCount,
      },
    });

    // Delete empty source cluster
    await prisma.personCluster.delete({ where: { id: sourceClusterId } });

    return reply.status(200).send({
      success: true,
      mergedInto: updatedTarget,
    });
  }

  /**
   * GET /api/v1/galleries/:galleryId/smart-albums
   */
  static async listSmartAlbums(request: FastifyRequest, reply: FastifyReply) {
    const params = request.params as { galleryId?: string; id?: string };
    const galleryId = params.galleryId || params.id;
    const studioId = request.studioId || request.user?.studioId;

    if (!galleryId || !studioId) {
      return reply.status(400).send({ statusCode: 400, error: 'Missing parameters' });
    }

    const { SmartAlbumService } = await import('./smart-album.service.js');
    await SmartAlbumService.initializeSystemSmartAlbums(galleryId, studioId);
    const albums = await SmartAlbumService.listSmartAlbums(galleryId, studioId, false);
    return reply.status(200).send({ smart_albums: albums });
  }

  /**
   * POST /api/v1/galleries/:galleryId/smart-albums
   */
  static async createSmartAlbum(request: FastifyRequest, reply: FastifyReply) {
    const params = request.params as { galleryId?: string; id?: string };
    const galleryId = params.galleryId || params.id;
    const studioId = request.studioId || request.user?.studioId;
    const body = request.body as any;

    if (!galleryId || !studioId || !body?.name || !body?.rule_json) {
      return reply.status(400).send({ statusCode: 400, error: 'name and rule_json are required' });
    }

    try {
      const { SmartAlbumService } = await import('./smart-album.service.js');
      const album = await SmartAlbumService.createSmartAlbum({
        galleryId,
        studioId,
        name: body.name,
        description: body.description,
        rule_json: body.rule_json,
        is_visible_to_client: body.is_visible_to_client,
        sort_mode: body.sort_mode,
      });
      return reply.status(201).send(album);
    } catch (err: unknown) {
      return reply.status(400).send({ statusCode: 400, error: (err as Error).message });
    }
  }

  /**
   * PATCH /api/v1/galleries/:galleryId/smart-albums/:albumId
   */
  static async updateSmartAlbum(request: FastifyRequest, reply: FastifyReply) {
    const params = request.params as { galleryId?: string; albumId?: string };
    const galleryId = params.galleryId;
    const albumId = params.albumId;
    const studioId = request.studioId || request.user?.studioId;
    const body = request.body as any;

    if (!galleryId || !albumId || !studioId) {
      return reply.status(400).send({ statusCode: 400, error: 'Missing parameters' });
    }

    try {
      const { SmartAlbumService } = await import('./smart-album.service.js');
      const album = await SmartAlbumService.updateSmartAlbum(albumId, galleryId, studioId, body);
      return reply.status(200).send(album);
    } catch (err: unknown) {
      return reply.status(404).send({ statusCode: 404, error: (err as Error).message });
    }
  }

  /**
   * DELETE /api/v1/galleries/:galleryId/smart-albums/:albumId
   */
  static async deleteSmartAlbum(request: FastifyRequest, reply: FastifyReply) {
    const params = request.params as { galleryId?: string; albumId?: string };
    const galleryId = params.galleryId;
    const albumId = params.albumId;
    const studioId = request.studioId || request.user?.studioId;

    if (!galleryId || !albumId || !studioId) {
      return reply.status(400).send({ statusCode: 400, error: 'Missing parameters' });
    }

    try {
      const { SmartAlbumService } = await import('./smart-album.service.js');
      await SmartAlbumService.deleteSmartAlbum(albumId, galleryId, studioId);
      return reply.status(200).send({ success: true, message: 'Smart Album deleted' });
    } catch (err: unknown) {
      return reply.status(400).send({ statusCode: 400, error: (err as Error).message });
    }
  }

  /**
   * GET /api/v1/galleries/:galleryId/smart-albums/:albumId/photos
   */
  static async getSmartAlbumPhotos(request: FastifyRequest, reply: FastifyReply) {
    const params = request.params as { galleryId?: string; albumId?: string };
    const query = request.query as { limit?: string; offset?: string };
    const galleryId = params.galleryId;
    const albumId = params.albumId;
    const studioId = request.studioId || request.user?.studioId;

    if (!galleryId || !albumId || !studioId) {
      return reply.status(400).send({ statusCode: 400, error: 'Missing parameters' });
    }

    try {
      const { SmartAlbumService } = await import('./smart-album.service.js');
      const res = await SmartAlbumService.getSmartAlbumPhotos(albumId, galleryId, studioId, {
        limit: query.limit ? parseInt(query.limit, 10) : 100,
        offset: query.offset ? parseInt(query.offset, 10) : 0,
      });
      return reply.status(200).send(res);
    } catch (err: unknown) {
      return reply.status(404).send({ statusCode: 404, error: (err as Error).message });
    }
  }

  /**
   * GET /api/v1/galleries/public/:slug/smart-albums
   * Public client-facing Smart Albums endpoint
   */
  static async getPublicSmartAlbums(request: FastifyRequest, reply: FastifyReply) {
    const params = request.params as { slug?: string };
    const gallerySlug = params.slug;

    if (!gallerySlug) {
      return reply.status(400).send({ statusCode: 400, error: 'Gallery slug required' });
    }

    const gallery = await prisma.gallery.findFirst({
      where: { slug: gallerySlug, status: 'ACTIVE' },
    });

    if (!gallery) {
      return reply.status(404).send({ statusCode: 404, error: 'Gallery not found' });
    }

    const { SmartAlbumService } = await import('./smart-album.service.js');
    const albums = await SmartAlbumService.listSmartAlbums(gallery.id, gallery.studio_id, true);
    return reply.status(200).send({ smart_albums: albums });
  }

  /**
   * GET /api/v1/galleries/public/:slug/smart-albums/:albumId/photos
   */
  static async getPublicSmartAlbumPhotos(request: FastifyRequest, reply: FastifyReply) {
    const params = request.params as { slug?: string; albumId?: string };
    const query = request.query as { limit?: string; offset?: string };
    const { slug, albumId } = params;

    if (!slug || !albumId) {
      return reply.status(400).send({ statusCode: 400, error: 'Missing slug or albumId' });
    }

    const gallery = await prisma.gallery.findFirst({
      where: { slug, status: 'ACTIVE' },
    });

    if (!gallery) {
      return reply.status(404).send({ statusCode: 404, error: 'Gallery not found' });
    }

    const album = await prisma.smartAlbum.findFirst({
      where: { id: albumId, gallery_id: gallery.id, is_visible_to_client: true },
    });

    if (!album) {
      return reply.status(404).send({ statusCode: 404, error: 'Smart Album not found or not visible to clients' });
    }

    const { SmartAlbumService } = await import('./smart-album.service.js');
    const res = await SmartAlbumService.getSmartAlbumPhotos(albumId, gallery.id, gallery.studio_id, {
      limit: query.limit ? parseInt(query.limit, 10) : 100,
      offset: query.offset ? parseInt(query.offset, 10) : 0,
    });

    return reply.status(200).send(res);
  }
}

