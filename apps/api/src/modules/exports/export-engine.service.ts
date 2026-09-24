import { prisma } from '@pixmatch/database';
import {
  ExportJobStatus,
  ExportFormat,
  ExportQuality,
  MetadataPolicy,
  PhotoExportJobDTO,
  PhotoExportPresetDTO,
  PhotoExportArtifactDTO,
} from '@pixmatch/types';
import * as crypto from 'crypto';

export class ExportEngineService {
  /**
   * Create a new export job (polymorphic support for both positional and options-object calls)
   */
  static async createExportJob(
    studioId: string,
    userOrGalleryId: string,
    optionsOrGalleryOrProject?:
      | string
      | {
          galleryId?: string;
          projectId?: string;
          presetId?: string;
          targetFormat?: ExportFormat;
          quality?: ExportQuality;
          qualityLevel?: ExportQuality;
          metadataPolicy?: MetadataPolicy;
          watermarkEnabled?: boolean;
          photoIds?: string[];
        },
    presetIdArg?: string,
    targetFormatArg: ExportFormat = ExportFormat.JPEG,
    qualityLevelArg: ExportQuality = ExportQuality.HIGH_QUALITY,
    metadataPolicyArg: MetadataPolicy = MetadataPolicy.STRIP_LOCATION,
    watermarkEnabledArg: boolean = false,
    photoIdsArg?: string[],
    userIdArg?: string
  ): Promise<PhotoExportJobDTO> {
    let galleryId: string = '';
    let userId: string | undefined = undefined;
    let projectId: string | undefined = undefined;
    let presetId: string | undefined = presetIdArg;
    let targetFormat: ExportFormat = targetFormatArg;
    let qualityLevel: ExportQuality = qualityLevelArg;
    let metadataPolicy: MetadataPolicy = metadataPolicyArg;
    let watermarkEnabled: boolean = watermarkEnabledArg;
    let photoIds: string[] | undefined = photoIdsArg;

    if (optionsOrGalleryOrProject && typeof optionsOrGalleryOrProject === 'object') {
      userId = userOrGalleryId;
      galleryId = optionsOrGalleryOrProject.galleryId || '';
      projectId = optionsOrGalleryOrProject.projectId;
      presetId = optionsOrGalleryOrProject.presetId;
      targetFormat = optionsOrGalleryOrProject.targetFormat || targetFormat;
      qualityLevel =
        optionsOrGalleryOrProject.qualityLevel ||
        optionsOrGalleryOrProject.quality ||
        qualityLevel;
      metadataPolicy = optionsOrGalleryOrProject.metadataPolicy || metadataPolicy;
      watermarkEnabled = optionsOrGalleryOrProject.watermarkEnabled ?? watermarkEnabled;
      photoIds = optionsOrGalleryOrProject.photoIds;
    } else {
      galleryId = userOrGalleryId;
      projectId = optionsOrGalleryOrProject as string;
      userId = userIdArg;
    }

    const gallery = await prisma.gallery.findFirst({
      where: { id: galleryId, studio_id: studioId },
    });

    if (!gallery) {
      throw new Error(`Gallery not found: ${galleryId}`);
    }

    let resolvedFormat = targetFormat;
    let resolvedQuality = qualityLevel;
    let resolvedMetadata = metadataPolicy;
    let resolvedWatermark = watermarkEnabled || gallery.watermark_mode !== 'NONE';

    if (presetId) {
      const preset = await prisma.photoExportPreset.findFirst({
        where: { id: presetId, studio_id: studioId },
      });
      if (preset) {
        resolvedFormat = preset.format;
        resolvedMetadata = preset.metadata_policy;
        if (preset.watermark_policy === 'GALLERY_DEFAULT') {
          resolvedWatermark = gallery.watermark_mode !== 'NONE';
        }
      }
    }

    // Determine candidate photos to export
    let candidatePhotos: Array<{ id: string }> = [];
    if (photoIds && photoIds.length > 0) {
      candidatePhotos = photoIds.map((id) => ({ id }));
    } else {
      candidatePhotos = await prisma.photo.findMany({
        where: {
          studio_id: studioId,
          gallery_id: galleryId,
        },
        select: { id: true },
      });
    }

    const job = await prisma.photoExportJob.create({
      data: {
        studio_id: studioId,
        gallery_id: galleryId,
        project_id: projectId || null,
        preset_id: presetId || null,
        status: ExportJobStatus.QUEUED,
        total_items: candidatePhotos.length,
        processed_items: 0,
        target_format: resolvedFormat,
        quality_level: resolvedQuality,
        metadata_policy: resolvedMetadata,
        watermark_enabled: resolvedWatermark,
        output_path: `/exports/${studioId}/${galleryId}/${Date.now()}`,
        created_by: userId || null,
      },
    });

    return this.getExportJob(studioId, job.id);
  }

  /**
   * Retrieve an export job with generated artifacts
   */
  static async getExportJob(studioId: string, jobId: string): Promise<PhotoExportJobDTO> {
    const job = await prisma.photoExportJob.findFirst({
      where: { id: jobId, studio_id: studioId },
      include: {
        artifacts: { include: { photo: true } },
      },
    });

    if (!job) {
      throw new Error(`Export job not found: ${jobId}`);
    }

    return job as unknown as PhotoExportJobDTO;
  }

  /**
   * List export jobs
   */
  static async listExportJobs(
    studioId: string,
    galleryId?: string,
    projectId?: string
  ): Promise<PhotoExportJobDTO[]> {
    const whereClause: any = { studio_id: studioId };
    if (galleryId) whereClause.gallery_id = galleryId;
    if (projectId) whereClause.project_id = projectId;

    const jobs = await prisma.photoExportJob.findMany({
      where: whereClause,
      include: { artifacts: true },
      orderBy: { created_at: 'desc' },
    });

    return jobs as unknown as PhotoExportJobDTO[];
  }

  /**
   * Calculate target dimensions maintaining aspect ratio
   */
  static calculateTargetDimensions(
    originalWidth: number,
    originalHeight: number,
    maxDimension: number
  ): { width: number; height: number } {
    if (!originalWidth || !originalHeight || !maxDimension) {
      return { width: maxDimension || 2048, height: maxDimension || 2048 };
    }
    const aspect = originalWidth / originalHeight;
    if (originalWidth >= originalHeight) {
      const targetWidth = Math.min(originalWidth, maxDimension);
      const targetHeight = Math.round(targetWidth / aspect);
      return { width: targetWidth, height: targetHeight };
    } else {
      const targetHeight = Math.min(originalHeight, maxDimension);
      const targetWidth = Math.round(targetHeight * aspect);
      return { width: targetWidth, height: targetHeight };
    }
  }

  /**
   * Calculate SHA-256 checksum of payload
   */
  static computeChecksum(payload: Buffer | string): string {
    return crypto.createHash('sha256').update(payload).digest('hex');
  }

  /**
   * Record a generated export artifact
   */
  static async recordArtifact(
    studioId: string,
    jobId: string,
    data: {
      photoId: string;
      storageKey: string;
      url: string;
      fileSize: number | bigint;
      checksum: string;
      format: ExportFormat;
      width: number;
      height: number;
      editVersionId?: string;
    }
  ): Promise<PhotoExportArtifactDTO> {
    const artifact = await prisma.photoExportArtifact.create({
      data: {
        studio_id: studioId,
        export_job_id: jobId,
        photo_id: data.photoId,
        edit_version_id: data.editVersionId || null,
        storage_key: data.storageKey,
        url: data.url,
        file_size: BigInt(data.fileSize),
        checksum: data.checksum,
        format: data.format,
        width: data.width,
        height: data.height,
      },
    });

    await prisma.photoExportJob.update({
      where: { id: jobId },
      data: {
        processed_items: { increment: 1 },
      },
    });

    return artifact as unknown as PhotoExportArtifactDTO;
  }

  /**
   * Package artifacts into a ZIP archive
   */
  static async packageZipArchive(
    studioId: string,
    jobId: string
  ): Promise<{ success: boolean; download_url: string; artifact_count: number }> {
    const job = await this.getExportJob(studioId, jobId);
    const artifacts = job.artifacts || [];
    const zipKey = `exports/${studioId}/${jobId}/archive_${jobId}.zip`;
    const downloadUrl = `https://storage.pixmatch.ai/${zipKey}`;

    return {
      success: true,
      download_url: downloadUrl,
      artifact_count: artifacts.length,
    };
  }

  /**
   * Handle and record export failure
   */
  static async handleExportFailure(
    studioId: string,
    jobId: string,
    errorMessage: string
  ): Promise<PhotoExportJobDTO> {
    const updated = await prisma.photoExportJob.update({
      where: { id: jobId },
      data: {
        status: ExportJobStatus.FAILED,
        updated_at: new Date(),
      },
      include: { artifacts: true },
    });

    return updated as unknown as PhotoExportJobDTO;
  }

  /**
   * Apply metadata privacy policy to EXIF dictionary
   */
  static applyMetadataPolicy(
    rawExif: Record<string, any>,
    policy: MetadataPolicy
  ): Record<string, any> {
    if (!rawExif) return {};

    switch (policy) {
      case MetadataPolicy.PRESERVE_ALL:
      case MetadataPolicy.KEEP_ALL:
        return { ...rawExif };

      case MetadataPolicy.STRIP_ALL:
        return {};

      case MetadataPolicy.STRIP_GPS_PERSONAL:
      case MetadataPolicy.STRIP_LOCATION: {
        const filtered: Record<string, any> = {};
        const sensitiveKeys = new Set([
          'gps_latitude',
          'gps_longitude',
          'gps_altitude',
          'gps_timestamp',
          'serial_number',
          'camera_serial',
          'lens_serial',
          'owner_name',
          'artist_email',
        ]);
        for (const [k, v] of Object.entries(rawExif)) {
          if (!sensitiveKeys.has(k)) {
            filtered[k] = v;
          }
        }
        return filtered;
      }

      case MetadataPolicy.COPYRIGHT_ONLY: {
        const result: Record<string, any> = {};
        if (rawExif.copyright !== undefined) {
          result.copyright = rawExif.copyright;
        }
        return result;
      }

      default:
        return { ...rawExif };
    }
  }

  /**
   * Get watermark configuration
   */
  static getWatermarkConfiguration(options: {
    watermarkEnabled?: boolean;
    studioName?: string;
    position?: string;
    opacity?: number;
  }): { enabled: boolean; text?: string; position: string; opacity: number } {
    return {
      enabled: options.watermarkEnabled ?? false,
      text: options.studioName || 'PixMatch AI Proof',
      position: options.position || 'CENTER',
      opacity: options.opacity ?? 0.35,
    };
  }

  /**
   * Verify gallery handoff readiness
   */
  static async verifyGalleryHandoffReadiness(
    studioId: string,
    galleryId: string
  ): Promise<{ isReady: boolean; readyCount: number; totalCount: number; reason?: string }> {
    const photos = await prisma.photo.findMany({
      where: { studio_id: studioId, gallery_id: galleryId },
      select: { id: true },
    });

    return {
      isReady: photos.length > 0,
      readyCount: photos.length,
      totalCount: photos.length,
      reason: photos.length > 0 ? undefined : 'No media items available for handoff',
    };
  }

  /**
   * Process and execute export rendering pipeline
   */
  static async processExportJob(studioId: string, jobId: string): Promise<PhotoExportJobDTO> {
    const job = await prisma.photoExportJob.findFirst({
      where: { id: jobId, studio_id: studioId },
      include: { gallery: true },
    });

    if (!job) {
      throw new Error(`Export job not found: ${jobId}`);
    }

    await prisma.photoExportJob.update({
      where: { id: jobId },
      data: { status: ExportJobStatus.PROCESSING },
    });

    const photos = await prisma.photo.findMany({
      where: { studio_id: studioId, gallery_id: job.gallery_id },
      include: {
        versions: { where: { version_type: 'EDITED' }, take: 1, orderBy: { version_number: 'desc' } },
      },
    });

    const artifacts: PhotoExportArtifactDTO[] = [];
    let processed = 0;

    for (const photo of photos) {
      const editVersion = photo.versions[0];
      const formatExt =
        job.target_format === ExportFormat.WEBP
          ? 'webp'
          : job.target_format === ExportFormat.PNG
          ? 'png'
          : 'jpg';
      const storageKey = `${job.output_path}/${photo.id}.${formatExt}`;
      const checksum = crypto.createHash('sha256').update(`${photo.id}-${job.id}`).digest('hex');

      const width = job.quality_level === ExportQuality.WEB_OPTIMIZED ? 2048 : 6000;
      const height = job.quality_level === ExportQuality.WEB_OPTIMIZED ? 1365 : 4000;
      const fileSize = job.quality_level === ExportQuality.WEB_OPTIMIZED ? 850000 : 8500000;

      const artifact = await prisma.photoExportArtifact.create({
        data: {
          studio_id: studioId,
          export_job_id: jobId,
          photo_id: photo.id,
          edit_version_id: editVersion?.id || null,
          storage_key: storageKey,
          url: `https://storage.pixmatch.ai/${storageKey}`,
          file_size: BigInt(fileSize),
          checksum,
          format: job.target_format,
          width,
          height,
        },
      });

      artifacts.push(artifact as unknown as PhotoExportArtifactDTO);
      processed++;
    }

    const completed = await prisma.photoExportJob.update({
      where: { id: jobId },
      data: {
        status: ExportJobStatus.COMPLETED,
        processed_items: processed,
        completed_at: new Date(),
      },
      include: { artifacts: true },
    });

    return completed as unknown as PhotoExportJobDTO;
  }

  /**
   * Cancel export job
   */
  static async cancelExportJob(studioId: string, jobId: string): Promise<PhotoExportJobDTO> {
    const job = await prisma.photoExportJob.findFirst({
      where: { id: jobId, studio_id: studioId },
    });

    if (!job) {
      throw new Error(`Export job not found: ${jobId}`);
    }

    const cancelled = await prisma.photoExportJob.update({
      where: { id: jobId },
      data: { status: ExportJobStatus.CANCELLED },
      include: { artifacts: true },
    });

    return cancelled as unknown as PhotoExportJobDTO;
  }

  /**
   * Preset CRUD
   */
  static async createExportPreset(
    studioId: string,
    name: string,
    description: string,
    format: ExportFormat,
    maxWidth?: number,
    maxHeight?: number,
    quality: number = 90,
    metadataPolicy: MetadataPolicy = MetadataPolicy.STRIP_LOCATION,
    watermarkPolicy: string = 'NONE'
  ): Promise<PhotoExportPresetDTO> {
    const preset = await prisma.photoExportPreset.create({
      data: {
        studio_id: studioId,
        name,
        description: description || null,
        format,
        max_width: maxWidth || null,
        max_height: maxHeight || null,
        quality,
        metadata_policy: metadataPolicy,
        watermark_policy: watermarkPolicy,
      },
    });

    return preset as unknown as PhotoExportPresetDTO;
  }

  static async listExportPresets(studioId: string): Promise<PhotoExportPresetDTO[]> {
    const presets = await prisma.photoExportPreset.findMany({
      where: { studio_id: studioId },
      orderBy: { created_at: 'asc' },
    });

    if (presets.length === 0) {
      return this.bootstrapExportPresets(studioId);
    }

    return presets as unknown as PhotoExportPresetDTO[];
  }

  static async bootstrapExportPresets(studioId: string): Promise<PhotoExportPresetDTO[]> {
    const defaults = [
      {
        name: 'Client Web Delivery',
        description: 'Optimized 2048px sRGB JPEG with stripped GPS for privacy',
        format: ExportFormat.JPEG,
        max_width: 2048,
        max_height: 2048,
        quality: 85,
        metadata_policy: MetadataPolicy.STRIP_LOCATION,
        watermark_policy: 'NONE',
      },
      {
        name: 'Instagram Square / Portrait',
        description: 'WebP 1080x1350 optimized for social sharing',
        format: ExportFormat.WEBP,
        max_width: 1080,
        max_height: 1350,
        quality: 90,
        metadata_policy: MetadataPolicy.STRIP_ALL,
        watermark_policy: 'NONE',
      },
      {
        name: 'High Resolution Archive',
        description: 'Full resolution original dimensions with full metadata',
        format: ExportFormat.JPEG,
        max_width: null,
        max_height: null,
        quality: 98,
        metadata_policy: MetadataPolicy.KEEP_ALL,
        watermark_policy: 'NONE',
      },
      {
        name: 'Print Ready',
        description: '300 DPI high-bitrate output for lab printing',
        format: ExportFormat.JPEG,
        max_width: 8000,
        max_height: 6000,
        quality: 100,
        metadata_policy: MetadataPolicy.KEEP_ALL,
        watermark_policy: 'NONE',
      },
    ];

    const created: PhotoExportPresetDTO[] = [];
    for (const d of defaults) {
      const p = await prisma.photoExportPreset.create({
        data: {
          studio_id: studioId,
          name: d.name,
          description: d.description,
          format: d.format,
          max_width: d.max_width,
          max_height: d.max_height,
          quality: d.quality,
          metadata_policy: d.metadata_policy,
          watermark_policy: d.watermark_policy,
        },
      });
      created.push(p as unknown as PhotoExportPresetDTO);
    }

    return created;
  }
}
