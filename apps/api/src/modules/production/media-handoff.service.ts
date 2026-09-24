import { prisma } from '@pixmatch/database';
import {
  MediaProductionStatusDTO,
  ProductionStage,
  MediaIngestionStatus,
  MediaBackupStatus,
} from '@pixmatch/types';

export class MediaHandoffService {
  /**
   * Record media ingestion progress from Phase 2 photo storage
   */
  static async recordMediaIngestion(
    studioId: string,
    projectId: string,
    data: {
      raw_photo_count?: number;
      storage_location?: string;
      notes?: string;
      backup_status?: MediaBackupStatus;
    }
  ): Promise<MediaProductionStatusDTO> {
    const production = await prisma.projectProduction.findFirst({
      where: { project_id: projectId, studio_id: studioId },
    });

    if (!production) {
      throw new Error(`Production record not found for project: ${projectId}`);
    }

    const nextStage =
      production.production_stage === ProductionStage.SHOOT_COMPLETED
        ? ProductionStage.MEDIA_INGESTION
        : production.production_stage;

    await prisma.projectProduction.update({
      where: { id: production.id },
      data: {
        media_ingestion_status: MediaIngestionStatus.UPLOADING,
        media_backup_status: data.backup_status || MediaBackupStatus.IN_PROGRESS,
        production_stage: nextStage,
        internal_notes: data.notes
          ? `${production.internal_notes ? production.internal_notes + '\n' : ''}[Ingestion]: ${data.notes}`
          : production.internal_notes,
        updated_at: new Date(),
      },
    });

    if (nextStage !== production.production_stage) {
      await prisma.projectProductionStageHistory.create({
        data: {
          studio_id: studioId,
          production_id: production.id,
          from_stage: production.production_stage,
          to_stage: nextStage,
          reason: `Media ingestion started${data.raw_photo_count ? ` (${data.raw_photo_count} raw photos)` : ''}`,
        },
      });
    }

    return this.getMediaProductionStatus(studioId, projectId);
  }

  /**
   * Record culling selections count
   */
  static async recordCullingComplete(
    studioId: string,
    projectId: string,
    data?: number | { culled_photo_count?: number; notes?: string }
  ): Promise<MediaProductionStatusDTO & { culled_count?: number; production_stage?: ProductionStage }> {
    const culledPhotoCount = typeof data === 'number' ? data : data?.culled_photo_count;
    const production = await prisma.projectProduction.findFirst({
      where: { project_id: projectId, studio_id: studioId },
    });

    if (!production) {
      throw new Error(`Production record not found: ${projectId}`);
    }

    await prisma.projectProduction.update({
      where: { id: production.id },
      data: {
        media_ingestion_status: MediaIngestionStatus.COMPLETED,
        media_backup_status: MediaBackupStatus.VERIFIED,
        production_stage: ProductionStage.EDITING,
        updated_at: new Date(),
      },
    });

    await prisma.projectProductionStageHistory.create({
      data: {
        studio_id: studioId,
        production_id: production.id,
        from_stage: production.production_stage,
        to_stage: ProductionStage.EDITING,
        reason: `Culling completed${culledPhotoCount !== undefined ? `: ${culledPhotoCount} select photos chosen for editing.` : '.'}`,
      },
    });

    const status = await this.getMediaProductionStatus(studioId, projectId);
    return {
      ...status,
      culled_count: culledPhotoCount,
      production_stage: ProductionStage.EDITING,
    };
  }

  /**
   * Record editing complete and handoff to AI Processing / Gallery Preparation
   */
  static async recordEditingComplete(
    studioId: string,
    projectId: string,
    data?: number | { edited_photo_count?: number; notes?: string }
  ): Promise<MediaProductionStatusDTO & { edited_count?: number; production_stage?: ProductionStage }> {
    const finalPhotoCount = typeof data === 'number' ? data : data?.edited_photo_count;
    const production = await prisma.projectProduction.findFirst({
      where: { project_id: projectId, studio_id: studioId },
    });

    if (!production) {
      throw new Error(`Production record not found: ${projectId}`);
    }

    await prisma.projectProduction.update({
      where: { id: production.id },
      data: {
        production_stage: ProductionStage.GALLERY_PREPARATION,
        updated_at: new Date(),
      },
    });

    await prisma.projectProductionStageHistory.create({
      data: {
        studio_id: studioId,
        production_id: production.id,
        from_stage: production.production_stage,
        to_stage: ProductionStage.GALLERY_PREPARATION,
        reason: `Editing completed${finalPhotoCount !== undefined ? ` with ${finalPhotoCount} edited photos` : ''}. Triggered AI facial indexing and highlight grouping.`,
      },
    });

    const status = await this.getMediaProductionStatus(studioId, projectId);
    return {
      ...status,
      edited_count: finalPhotoCount,
      production_stage: ProductionStage.GALLERY_PREPARATION,
    };
  }

  /**
   * Handoff processed media to client gallery (Phase 6)
   */
  static async handoffToGallery(
    studioId: string,
    projectId: string,
    galleryId?: string
  ): Promise<MediaProductionStatusDTO> {
    const production = await prisma.projectProduction.findFirst({
      where: { project_id: projectId, studio_id: studioId },
    });

    if (!production) {
      throw new Error(`Production record not found: ${projectId}`);
    }

    if (galleryId) {
      await prisma.projectGalleryLink.upsert({
        where: {
          project_id_gallery_id: {
            project_id: projectId,
            gallery_id: galleryId,
          },
        },
        create: {
          studio_id: studioId,
          project_id: projectId,
          gallery_id: galleryId,
        },
        update: {},
      });
    }

    await prisma.projectProduction.update({
      where: { id: production.id },
      data: {
        production_stage: ProductionStage.READY_FOR_GALLERY,
        updated_at: new Date(),
      },
    });

    await prisma.projectProductionStageHistory.create({
      data: {
        studio_id: studioId,
        production_id: production.id,
        from_stage: production.production_stage,
        to_stage: ProductionStage.READY_FOR_GALLERY,
        reason: 'Handoff to client delivery gallery completed. Client notification ready.',
      },
    });

    return this.getMediaProductionStatus(studioId, projectId);
  }

  /**
   * Get full media processing status for a project
   */
  static async getMediaProductionStatus(
    studioId: string,
    projectId: string
  ): Promise<MediaProductionStatusDTO> {
    const production = await prisma.projectProduction.findFirst({
      where: { project_id: projectId, studio_id: studioId },
      include: {
        project: {
          include: {
            galleries: {
              include: {
                gallery: true,
              },
            },
          },
        },
      },
    });

    if (!production) {
      throw new Error(`Production record not found for project: ${projectId}`);
    }

    const linkedGalleryIds = (production.project?.galleries || [])
      .map((g: any) => g.gallery_id)
      .filter(Boolean);

    let totalPhotos = 0;
    let uploadedPhotos = 0;
    let processedPhotos = 0;
    let pendingPhotos = 0;
    let failedPhotos = 0;
    let facesIndexed = 0;
    let smartAlbumsCount = 0;
    let eventChaptersCount = 0;

    if (linkedGalleryIds.length > 0) {
      totalPhotos = await prisma.photo.count({
        where: { studio_id: studioId, gallery_id: { in: linkedGalleryIds } },
      });

      uploadedPhotos = await prisma.photo.count({
        where: { studio_id: studioId, gallery_id: { in: linkedGalleryIds }, processing_status: 'COMPLETED' },
      });

      processedPhotos = await prisma.photo.count({
        where: { studio_id: studioId, gallery_id: { in: linkedGalleryIds }, processing_status: 'COMPLETED' },
      });

      pendingPhotos = await prisma.photo.count({
        where: { studio_id: studioId, gallery_id: { in: linkedGalleryIds }, processing_status: 'PENDING' },
      });

      failedPhotos = await prisma.photo.count({
        where: { studio_id: studioId, gallery_id: { in: linkedGalleryIds }, processing_status: 'FAILED' },
      });

      facesIndexed = await prisma.faceDetection.count({
        where: { studio_id: studioId, gallery_id: { in: linkedGalleryIds } },
      });

      smartAlbumsCount = await prisma.smartAlbum.count({
        where: { studio_id: studioId, gallery_id: { in: linkedGalleryIds } },
      });

      eventChaptersCount = await prisma.eventChapter.count({
        where: { studio_id: studioId, gallery_id: { in: linkedGalleryIds } },
      });
    }

    const isReadyForGallery =
      production.production_stage === ProductionStage.READY_FOR_GALLERY ||
      production.production_stage === ProductionStage.COMPLETED;

    return {
      project_id: projectId,
      media_ingestion_status: production.media_ingestion_status as MediaIngestionStatus,
      media_backup_status: production.media_backup_status as MediaBackupStatus,
      total_photos: totalPhotos,
      uploaded_photos: uploadedPhotos,
      processed_photos: processedPhotos,
      pending_photos: pendingPhotos,
      failed_photos: failedPhotos,
      faces_indexed: facesIndexed,
      smart_albums_count: smartAlbumsCount,
      event_chapters_count: eventChaptersCount,
      galleries_linked: linkedGalleryIds.length,
      is_ready_for_gallery: isReadyForGallery,
    };
  }
}
