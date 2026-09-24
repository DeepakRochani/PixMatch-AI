import { FastifyRequest, FastifyReply } from 'fastify';
import { prisma, StorageProviderType, ProcessingStatus, JobType, PhotoVersionType, GalleryStatus, GalleryAccessType } from '@pixmatch/database';
import { StorageService, MediaService, decryptTokens } from '@pixmatch/storage';
import { dispatchPhotoProcessing } from '@pixmatch/worker';
import { verifyPassword } from '@pixmatch/auth';

export class PhotosController {
  /**
   * POST /api/photos/upload
   * Multipart photo upload handler with SHA-256 duplicate detection,
   * tenant isolation, image validation, and async BullMQ job dispatch.
   * PRODUCTION RULE: The API never runs Sharp in-process. If queue fails, job is marked for worker retry.
   */
  static async upload(request: FastifyRequest, reply: FastifyReply) {
    const studioId = request.studioId!;
    const parts = request.parts();

    let galleryId = (request.query as { galleryId?: string })?.galleryId || '';
    const uploadedPhotos: Array<{
      id: string;
      original_filename: string;
      original_url: string;
      thumbnail_url?: string | null;
      file_size: number;
      processing_status: string;
      duplicate?: boolean;
      enqueued?: boolean;
    }> = [];

    const duplicates: Array<{
      filename: string;
      photoId: string;
      message: string;
    }> = [];

    const storageProvider = StorageService.getProvider(StorageProviderType.PLATFORM as any);

    for await (const part of parts) {
      if (part.type === 'field' && part.fieldname === 'galleryId') {
        galleryId = part.value as string;
      } else if (part.type === 'file') {
        if (!galleryId) {
          galleryId = (request.query as { galleryId?: string })?.galleryId || '';
        }

        if (!galleryId) {
          return reply.status(400).send({
            success: false,
            error: { code: 'MISSING_GALLERY_ID', message: 'galleryId is required for photo upload' },
          });
        }

        // Verify Gallery belongs to the authenticated Studio (Tenant Isolation)
        const gallery = await prisma.gallery.findFirst({
          where: { id: galleryId, studio_id: studioId },
        });

        if (!gallery) {
          return reply.status(404).send({
            success: false,
            error: { code: 'GALLERY_NOT_FOUND', message: 'Gallery not found or access denied' },
          });
        }

        const buffer = await part.toBuffer();

        // 1. Validation (MIME, Extension, Size, Magic Bytes)
        const validation = MediaService.validateImage(buffer, part.filename, part.mimetype);
        if (!validation.valid) {
          return reply.status(400).send({
            success: false,
            error: { code: 'INVALID_FILE', message: validation.error || 'Invalid file format' },
          });
        }

        // 2. Duplicate Detection via SHA-256 Hash
        const fileHash = MediaService.computeSha256(buffer);
        const existingPhoto = await prisma.photo.findFirst({
          where: {
            gallery_id: galleryId,
            file_hash: fileHash,
          },
          include: { versions: true },
        });

        if (existingPhoto) {
          duplicates.push({
            filename: part.filename,
            photoId: existingPhoto.id,
            message: 'Photo already exists in this gallery',
          });
          uploadedPhotos.push({
            id: existingPhoto.id,
            original_filename: existingPhoto.original_filename || part.filename,
            original_url: existingPhoto.original_url,
            thumbnail_url: existingPhoto.thumbnail_url,
            file_size: Number(existingPhoto.file_size),
            processing_status: existingPhoto.processing_status,
            duplicate: true,
          });
          continue;
        }

        // 3. Save Original to Platform Storage
        const uploadResult = await storageProvider.upload({
          studioId,
          galleryId,
          category: 'originals',
          filename: `${fileHash.slice(0, 8)}_${validation.sanitizedFilename}`,
          mimeType: validation.mimeType,
          buffer,
        });

        // 4. Create Photo record with QUEUED status
        const photo = await prisma.photo.create({
          data: {
            studio_id: studioId,
            gallery_id: galleryId,
            storage_provider: StorageProviderType.PLATFORM,
            storage_path: uploadResult.storagePath,
            original_url: uploadResult.url,
            thumbnail_url: uploadResult.url, // Temp fallback until worker generates MD thumbnail
            original_filename: part.filename,
            file_hash: fileHash,
            file_size: BigInt(uploadResult.sizeBytes),
            mime_type: validation.mimeType,
            processing_status: ProcessingStatus.QUEUED,
          },
        });

        // 5. Create initial ORIGINAL PhotoVersion
        await prisma.photoVersion.create({
          data: {
            photo_id: photo.id,
            version_type: PhotoVersionType.ORIGINAL,
            storage_path: uploadResult.storagePath,
            url: uploadResult.url,
            file_size: BigInt(uploadResult.sizeBytes),
            mime_type: validation.mimeType,
          },
        });

        // 6. Create ProcessingJob record
        await prisma.processingJob.create({
          data: {
            studio_id: studioId,
            gallery_id: galleryId,
            photo_id: photo.id,
            job_type: JobType.PHOTO_PROCESSING,
            status: ProcessingStatus.QUEUED,
            progress: 0,
          },
        });

        // 7. Enqueue background processing job via BullMQ (NO IN-PROCESS SHARP FALLBACK)
        const dispatchResult = await dispatchPhotoProcessing({
          photoId: photo.id,
          studioId,
          galleryId,
          storagePath: uploadResult.storagePath,
        });

        uploadedPhotos.push({
          id: photo.id,
          original_filename: part.filename,
          original_url: photo.original_url,
          thumbnail_url: photo.thumbnail_url,
          file_size: Number(photo.file_size),
          processing_status: dispatchResult.enqueued ? ProcessingStatus.QUEUED : ProcessingStatus.FAILED,
          enqueued: dispatchResult.enqueued,
        });
      }
    }

    return reply.status(201).send({
      success: true,
      data: {
        count: uploadedPhotos.length,
        photos: uploadedPhotos,
        duplicates,
      },
    });
  }

  /**
   * GET /api/photos/gallery/:galleryId
   * List photos in a gallery for the authenticated studio with cursor-based pagination.
   */
  static async listByGallery(request: FastifyRequest, reply: FastifyReply) {
    const { galleryId } = request.params as { galleryId: string };
    const query = request.query as { cursor?: string; limit?: string };
    const studioId = request.studioId!;

    const limit = Math.min(Math.max(parseInt(query.limit || '50', 10), 1), 200);
    const cursor = query.cursor;

    // Strict Tenant Isolation Check
    const gallery = await prisma.gallery.findFirst({
      where: { id: galleryId, studio_id: studioId },
    });

    if (!gallery) {
      return reply.status(404).send({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Gallery not found or access denied' },
      });
    }

    const totalCount = await prisma.photo.count({
      where: { gallery_id: galleryId, studio_id: studioId },
    });

    const photos = await prisma.photo.findMany({
      where: { gallery_id: galleryId, studio_id: studioId },
      include: {
        versions: true,
      },
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
        totalCount,
        hasMore,
        nextCursor,
        photos: items.map((p) => ({
          ...p,
          file_size: Number(p.file_size),
          versions: p.versions.map((v) => ({
            ...v,
            file_size: Number(v.file_size),
          })),
        })),
      },
    });
  }

  /**
   * GET /api/photos/gallery/:galleryId/status
   * Aggregates gallery processing metrics for live dashboard progress bars.
   */
  static async getGalleryStatus(request: FastifyRequest, reply: FastifyReply) {
    const { galleryId } = request.params as { galleryId: string };
    const studioId = request.studioId!;

    // Strict Tenant Isolation Check
    const gallery = await prisma.gallery.findFirst({
      where: { id: galleryId, studio_id: studioId },
    });

    if (!gallery) {
      return reply.status(404).send({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Gallery not found or access denied' },
      });
    }

    const photos = await prisma.photo.findMany({
      where: { gallery_id: galleryId, studio_id: studioId },
      select: { processing_status: true, file_size: true },
    });

    const total = photos.length;
    const queued = photos.filter((p) => p.processing_status === ProcessingStatus.QUEUED || p.processing_status === ProcessingStatus.PENDING).length;
    const processing = photos.filter((p) => p.processing_status === ProcessingStatus.PROCESSING).length;
    const completed = photos.filter((p) => p.processing_status === ProcessingStatus.COMPLETED).length;
    const failed = photos.filter((p) => p.processing_status === ProcessingStatus.FAILED).length;
    const totalBytes = photos.reduce((acc, curr) => acc + Number(curr.file_size), 0);

    const progressPercent = total === 0 ? 100 : Math.round((completed / total) * 100);

    return reply.send({
      success: true,
      data: {
        total,
        queued,
        processing,
        completed,
        failed,
        progressPercent,
        totalBytes,
      },
    });
  }

  /**
   * GET /api/photos/:id
   * Get full details of a photo including all derivative versions.
   */
  static async getById(request: FastifyRequest, reply: FastifyReply) {
    const { id } = request.params as { id: string };
    const studioId = request.studioId!;

    // Strict Tenant Isolation Check
    const photo = await prisma.photo.findFirst({
      where: { id, studio_id: studioId },
      include: {
        versions: true,
        jobs: { orderBy: { created_at: 'desc' }, take: 5 },
      },
    });

    if (!photo) {
      return reply.status(404).send({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Photo not found or access denied' },
      });
    }

    return reply.send({
      success: true,
      data: {
        ...photo,
        file_size: Number(photo.file_size),
        versions: photo.versions.map((v) => ({
          ...v,
          file_size: Number(v.file_size),
        })),
      },
    });
  }

  /**
   * DELETE /api/photos/:id
   * Secure deletion of photo DB record, derivative versions, physical storage files, and audit log.
   */
  static async delete(request: FastifyRequest, reply: FastifyReply) {
    const { id } = request.params as { id: string };
    const studioId = request.studioId!;
    const userId = request.user?.userId;

    // Strict Tenant Isolation Check
    const photo = await prisma.photo.findFirst({
      where: { id, studio_id: studioId },
      include: { versions: true },
    });

    if (!photo) {
      return reply.status(404).send({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Photo not found or access denied' },
      });
    }

    const storageProvider = StorageService.getProvider(photo.storage_provider as any);

    // 1. Delete original file
    await storageProvider.delete(photo.storage_path).catch(() => null);

    // 2. Delete all thumbnail derivative files
    for (const version of photo.versions) {
      if (version.storage_path !== photo.storage_path) {
        await storageProvider.delete(version.storage_path).catch(() => null);
      }
    }

    // 3. Delete DB records
    await prisma.processingJob.deleteMany({ where: { photo_id: id } }).catch(() => null);
    await prisma.photoVersion.deleteMany({ where: { photo_id: id } }).catch(() => null);
    await prisma.photo.delete({ where: { id } });

    // 4. Write Audit Log
    await prisma.auditLog.create({
      data: {
        studio_id: studioId,
        user_id: userId,
        action: 'PHOTO_DELETE',
        resource_type: 'Photo',
        resource_id: id,
        metadata: {
          gallery_id: photo.gallery_id,
          filename: photo.original_filename,
        },
      },
    });

    return reply.send({
      success: true,
      data: { message: 'Photo and all derivatives deleted successfully' },
    });
  }

  /**
   * POST /api/photos/:id/retry
   * Requeues a failed or stuck photo for Sharp thumbnail processing.
   */
  static async retry(request: FastifyRequest, reply: FastifyReply) {
    const { id } = request.params as { id: string };
    const studioId = request.studioId!;

    // Strict Tenant Isolation Check
    const photo = await prisma.photo.findFirst({
      where: { id, studio_id: studioId },
    });

    if (!photo) {
      return reply.status(404).send({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Photo not found or access denied' },
      });
    }

    // Reset status to QUEUED
    await prisma.photo.update({
      where: { id },
      data: { processing_status: ProcessingStatus.QUEUED },
    });

    await prisma.processingJob.create({
      data: {
        studio_id: studioId,
        gallery_id: photo.gallery_id,
        photo_id: photo.id,
        job_type: JobType.PHOTO_PROCESSING,
        status: ProcessingStatus.QUEUED,
        progress: 0,
      },
    });

    // Re-dispatch job via BullMQ
    const result = await dispatchPhotoProcessing({
      photoId: photo.id,
      studioId,
      galleryId: photo.gallery_id,
      storagePath: photo.storage_path,
    });

    return reply.send({
      success: true,
      data: {
        message: result.enqueued ? 'Processing job re-enqueued successfully' : 'Job recorded for retry on worker availability',
        photoId: photo.id,
        enqueued: result.enqueued,
      },
    });
  }

  /**
   * GET /api/photos/public/gallery/:slug
   * Public client access endpoint for viewing processed gallery photos with cursor-based pagination
   * and access control (status check, private check, password check).
   */
  static async listPublicBySlug(request: FastifyRequest, reply: FastifyReply) {
    const { slug } = request.params as { slug: string };
    const query = request.query as { cursor?: string; limit?: string; password?: string };
    const passwordHeader = request.headers['x-gallery-password'] as string | undefined;
    const providedPassword = passwordHeader || query.password;

    const limit = Math.min(Math.max(parseInt(query.limit || '50', 10), 1), 200);
    const cursor = query.cursor;

    const gallery = await prisma.gallery.findFirst({
      where: { slug },
      include: {
        studio: { select: { name: true, logo_url: true } },
      },
    });

    if (!gallery) {
      return reply.status(404).send({
        success: false,
        error: { code: 'GALLERY_NOT_FOUND', message: 'Gallery not found' },
      });
    }

    // 1. Check Gallery Status
    if (gallery.status !== GalleryStatus.ACTIVE) {
      return reply.status(404).send({
        success: false,
        error: { code: 'GALLERY_INACTIVE', message: 'This gallery is currently not active or published' },
      });
    }

    // 2. Check Private Access
    if (gallery.access_type === GalleryAccessType.PRIVATE) {
      return reply.status(403).send({
        success: false,
        error: { code: 'PRIVATE_GALLERY', message: 'This gallery is private and cannot be accessed publicly' },
      });
    }

    // 3. Check Password / PIN Protection
    if (gallery.access_type === GalleryAccessType.PASSWORD) {
      if (!gallery.password_hash) {
        // Misconfigured password gallery, treat securely
        return reply.status(401).send({
          success: false,
          error: { code: 'PASSWORD_REQUIRED', message: 'Password required to view this gallery' },
          data: {
            gallery: {
              id: gallery.id,
              title: gallery.title,
              slug: gallery.slug,
              access_type: gallery.access_type,
              is_password_protected: true,
              studio_name: gallery.studio.name,
            },
            photos: [],
          },
        });
      }

      if (!providedPassword) {
        return reply.status(401).send({
          success: false,
          error: { code: 'PASSWORD_REQUIRED', message: 'Password is required to access this gallery' },
          data: {
            gallery: {
              id: gallery.id,
              title: gallery.title,
              slug: gallery.slug,
              access_type: gallery.access_type,
              is_password_protected: true,
              studio_name: gallery.studio.name,
            },
            photos: [],
          },
        });
      }

      const isValidPassword = await verifyPassword(providedPassword, gallery.password_hash);
      if (!isValidPassword) {
        return reply.status(401).send({
          success: false,
          error: { code: 'INVALID_PASSWORD', message: 'Incorrect gallery password' },
          data: {
            gallery: {
              id: gallery.id,
              title: gallery.title,
              slug: gallery.slug,
              access_type: gallery.access_type,
              is_password_protected: true,
              studio_name: gallery.studio.name,
            },
            photos: [],
          },
        });
      }
    }

    const totalCount = await prisma.photo.count({
      where: { gallery_id: gallery.id, processing_status: ProcessingStatus.COMPLETED },
    });

    const photos = await prisma.photo.findMany({
      where: { gallery_id: gallery.id, processing_status: ProcessingStatus.COMPLETED },
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
          studio_name: gallery.studio.name,
          studio_logo: gallery.studio.logo_url,
        },
        totalCount,
        hasMore,
        nextCursor,
        photos: items.map((p) => {
          const mdThumb = p.versions.find((v) => v.version_type === PhotoVersionType.THUMBNAIL_MD);
          const lgThumb = p.versions.find((v) => v.version_type === PhotoVersionType.THUMBNAIL_LG);
          const smThumb = p.versions.find((v) => v.version_type === PhotoVersionType.THUMBNAIL_SM);

          return {
            id: p.id,
            original_url: p.original_url,
            thumbnail_url: mdThumb?.url || p.thumbnail_url || p.original_url,
            sm_url: smThumb?.url,
            md_url: mdThumb?.url,
            lg_url: lgThumb?.url,
            width: p.width,
            height: p.height,
            original_filename: p.original_filename,
            file_size: Number(p.file_size),
            processing_status: p.processing_status,
          };
        }),
      },
    });
  }

  /**
   * GET /api/photos/:id/signed-url
   * Generates a temporary signed download URL for high-res original with short TTL (default 15 min, max 1 hour).
   */
  static async getSignedUrl(request: FastifyRequest, reply: FastifyReply) {
    const { id } = request.params as { id: string };
    const query = request.query as { expiresIn?: string };
    const studioId = request.studioId!;

    // Strict Tenant Isolation Check
    const photo = await prisma.photo.findFirst({
      where: { id, studio_id: studioId },
    });

    if (!photo) {
      return reply.status(404).send({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Photo not found or access denied' },
      });
    }

    const requestedExpires = parseInt(query.expiresIn || '900', 10);
    const safeExpires = Math.min(Math.max(requestedExpires, 60), 3600); // 1 min min, 1 hour max

    let providerConfig: any = undefined;
    if (photo.storage_connection_id) {
      const connection = await prisma.storageConnection.findUnique({
        where: { id: photo.storage_connection_id },
      });
      if (connection) {
        try {
          const tokens = decryptTokens<Record<string, any>>(connection.access_token || (connection as any).credentials_encrypted || '');
          providerConfig = {
            accessToken: tokens.accessToken,
            refreshToken: tokens.refreshToken,
            expiresAt: tokens.expiresAt,
          };
        } catch {
          // If token decryption fails, fall back to default provider
        }
      }
    }

    const storageProvider = StorageService.getProvider(photo.storage_provider as any, providerConfig);
    const signedUrl = await storageProvider.generateSignedUrl(photo.storage_path, safeExpires);

    return reply.send({
      success: true,
      data: { signedUrl, expires_in_seconds: safeExpires },
    });
  }
}
