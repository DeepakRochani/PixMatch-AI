import { prisma, ProcessingStatus, PhotoVersionType } from '@pixmatch/database';
import { StorageService, MediaService } from '@pixmatch/storage';

export interface PhotoJobData {
  photoId: string;
  studioId: string;
  galleryId: string;
  storagePath: string;
}

export interface ProcessPhotoResult {
  success: boolean;
  photoId: string;
  skippedAlreadyProcessed?: boolean;
  error?: string;
}

/**
 * Core Photo Processing Engine (Worker Process Only):
 * 1. Verifies Photo DB record and checks for idempotent completion
 * 2. Reads original image from tenant storage
 * 3. Extracts EXIF orientation, dimensions, format
 * 4. Renders SM (320px), MD (1200px), LG (2400px) WebP thumbnails without upscaling
 * 5. Saves thumbnail files to isolated storage
 * 6. Atomically upserts PhotoVersion records and marks Photo/ProcessingJob as COMPLETED
 */
export async function processPhoto(data: PhotoJobData): Promise<ProcessPhotoResult> {
  const { photoId, studioId, galleryId, storagePath } = data;
  console.log(`[PhotoProcessor] Starting processing for photo: ${photoId} (Studio: ${studioId}, Gallery: ${galleryId})`);

  // 1. Locate Photo with existing versions
  const photo = await prisma.photo.findUnique({
    where: { id: photoId },
    include: { versions: true },
  });

  if (!photo) {
    throw new Error(`Photo not found for ID: ${photoId}`);
  }

  // 2. Idempotency Check: Avoid redundant image processing if all versions already exist
  const existingTypes = new Set(photo.versions.map((v) => v.version_type));
  const hasAllThumbnails =
    existingTypes.has(PhotoVersionType.THUMBNAIL_SM) &&
    existingTypes.has(PhotoVersionType.THUMBNAIL_MD) &&
    existingTypes.has(PhotoVersionType.THUMBNAIL_LG);

  if (photo.processing_status === ProcessingStatus.COMPLETED && hasAllThumbnails) {
    console.log(`[PhotoProcessor] Photo ${photoId} is already COMPLETED with all derivatives. Skipping re-processing.`);
    await prisma.processingJob.updateMany({
      where: { photo_id: photoId },
      data: {
        status: ProcessingStatus.COMPLETED,
        progress: 100,
        error_message: null,
      },
    }).catch(() => null);

    return { success: true, photoId, skippedAlreadyProcessed: true };
  }

  // Update status to PROCESSING
  await prisma.photo.update({
    where: { id: photoId },
    data: { processing_status: ProcessingStatus.PROCESSING },
  });

  await prisma.processingJob.updateMany({
    where: { photo_id: photoId },
    data: {
      status: ProcessingStatus.PROCESSING,
      progress: 20,
    },
  });

  try {
    // 3. Download original from storage
    const storage = StorageService.getProvider(photo.storage_provider as any);
    let originalBuffer: Buffer;
    try {
      originalBuffer = await storage.download(storagePath);
    } catch (downloadErr: unknown) {
      throw new Error(`Storage error: Original file could not be retrieved from storage`);
    }

    if (!originalBuffer || originalBuffer.length === 0) {
      throw new Error(`Corrupted storage file: Original file buffer is empty`);
    }

    // 4. Extract metadata and generate thumbnails with Sharp
    const { metadata, sm, md, lg } = await MediaService.extractMetadataAndThumbnails(originalBuffer);

    // 5. Upload thumbnails to isolated storage
    const [smUpload, mdUpload, lgUpload] = await Promise.all([
      storage.upload({
        studioId,
        galleryId,
        category: 'thumbnails/sm',
        filename: `${photoId}_sm.webp`,
        mimeType: 'image/webp',
        buffer: sm,
      }),
      storage.upload({
        studioId,
        galleryId,
        category: 'thumbnails/md',
        filename: `${photoId}_md.webp`,
        mimeType: 'image/webp',
        buffer: md,
      }),
      storage.upload({
        studioId,
        galleryId,
        category: 'thumbnails/lg',
        filename: `${photoId}_lg.webp`,
        mimeType: 'image/webp',
        buffer: lg,
      }),
    ]);

    // 6. Atomically Upsert PhotoVersion records & Update status to COMPLETED
    await prisma.$transaction([
      // Original Version
      prisma.photoVersion.upsert({
        where: {
          photo_id_version_type: {
            photo_id: photoId,
            version_type: PhotoVersionType.ORIGINAL,
          },
        },
        create: {
          photo_id: photoId,
          version_type: PhotoVersionType.ORIGINAL,
          storage_path: photo.storage_path,
          url: photo.original_url,
          width: metadata.width,
          height: metadata.height,
          file_size: BigInt(originalBuffer.length),
          mime_type: photo.mime_type,
        },
        update: {
          width: metadata.width,
          height: metadata.height,
          file_size: BigInt(originalBuffer.length),
        },
      }),

      // SM Thumbnail
      prisma.photoVersion.upsert({
        where: {
          photo_id_version_type: {
            photo_id: photoId,
            version_type: PhotoVersionType.THUMBNAIL_SM,
          },
        },
        create: {
          photo_id: photoId,
          version_type: PhotoVersionType.THUMBNAIL_SM,
          storage_path: smUpload.storagePath,
          url: smUpload.url,
          width: Math.min(metadata.width, 320),
          height: Math.round(metadata.height * (Math.min(metadata.width, 320) / metadata.width)),
          file_size: BigInt(sm.length),
          mime_type: 'image/webp',
        },
        update: {
          storage_path: smUpload.storagePath,
          url: smUpload.url,
          file_size: BigInt(sm.length),
        },
      }),

      // MD Thumbnail
      prisma.photoVersion.upsert({
        where: {
          photo_id_version_type: {
            photo_id: photoId,
            version_type: PhotoVersionType.THUMBNAIL_MD,
          },
        },
        create: {
          photo_id: photoId,
          version_type: PhotoVersionType.THUMBNAIL_MD,
          storage_path: mdUpload.storagePath,
          url: mdUpload.url,
          width: Math.min(metadata.width, 1200),
          height: Math.round(metadata.height * (Math.min(metadata.width, 1200) / metadata.width)),
          file_size: BigInt(md.length),
          mime_type: 'image/webp',
        },
        update: {
          storage_path: mdUpload.storagePath,
          url: mdUpload.url,
          file_size: BigInt(md.length),
        },
      }),

      // LG Thumbnail
      prisma.photoVersion.upsert({
        where: {
          photo_id_version_type: {
            photo_id: photoId,
            version_type: PhotoVersionType.THUMBNAIL_LG,
          },
        },
        create: {
          photo_id: photoId,
          version_type: PhotoVersionType.THUMBNAIL_LG,
          storage_path: lgUpload.storagePath,
          url: lgUpload.url,
          width: Math.min(metadata.width, 2400),
          height: Math.round(metadata.height * (Math.min(metadata.width, 2400) / metadata.width)),
          file_size: BigInt(lg.length),
          mime_type: 'image/webp',
        },
        update: {
          storage_path: lgUpload.storagePath,
          url: lgUpload.url,
          file_size: BigInt(lg.length),
        },
      }),

      // 7. Update Photo record
      prisma.photo.update({
        where: { id: photoId },
        data: {
          width: metadata.width,
          height: metadata.height,
          thumbnail_url: mdUpload.url, // Default grid representation
          processing_status: ProcessingStatus.COMPLETED,
        },
      }),

      // 8. Update ProcessingJob record
      prisma.processingJob.updateMany({
        where: { photo_id: photoId },
        data: {
          status: ProcessingStatus.COMPLETED,
          progress: 100,
          error_message: null,
        },
      }),
    ]);

    // Update gallery cover photo if currently unset
    const gallery = await prisma.gallery.findUnique({ where: { id: galleryId } });
    if (gallery && !gallery.cover_photo_url) {
      await prisma.gallery.update({
        where: { id: galleryId },
        data: { cover_photo_url: mdUpload.url },
      }).catch(() => null);
    }

    // Auto-dispatch Real AI Face Indexing if AI search is enabled for the gallery (defaults to true)
    if (!gallery || gallery.enable_ai_face_search !== false) {
      const { dispatchFaceIndexing } = await import('../queues.js');
      await dispatchFaceIndexing({
        photoId,
        studioId,
        galleryId,
        storagePath: photo.storage_path,
      }).catch((queueErr) => {
        console.warn(`[PhotoProcessor] Face indexing auto-dispatch skipped or failed: ${queueErr.message}`);
      });
    }

    console.log(`[PhotoProcessor] ✅ Successfully processed photo: ${photoId}`);
    return { success: true, photoId };
  } catch (err: unknown) {
    // Sanitize error message to avoid internal stack traces or path exposures
    const rawMsg = err instanceof Error ? err.message : String(err);
    const sanitizedError = rawMsg.includes('Sharp') || rawMsg.includes('Input buffer')
      ? 'Corrupted or unsupported image file'
      : rawMsg.replace(/\/[\w./-]+/g, '[path]');

    console.error(`[PhotoProcessor] ❌ Failed to process photo ${photoId}:`, sanitizedError);

    // Update status to FAILED with sanitized error
    await prisma.photo.update({
      where: { id: photoId },
      data: { processing_status: ProcessingStatus.FAILED },
    }).catch(() => null);

    await prisma.processingJob.updateMany({
      where: { photo_id: photoId },
      data: {
        status: ProcessingStatus.FAILED,
        error_message: sanitizedError,
      },
    }).catch(() => null);

    return {
      success: false,
      photoId,
      error: sanitizedError,
    };
  }
}
