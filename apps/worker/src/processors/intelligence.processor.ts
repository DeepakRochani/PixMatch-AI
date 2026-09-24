import { prisma, ProcessingStatus, JobType } from '@pixmatch/database';
import { StorageService } from '@pixmatch/storage';
import { PhotoIntelligenceService } from '../../../api/src/modules/ai/photo-intelligence.service.js';

export interface PhotoIntelligenceJobData {
  photoId: string;
  studioId: string;
  galleryId: string;
  storagePath?: string;
  forceReanalyze?: boolean;
}

export interface ProcessIntelligenceResult {
  success: boolean;
  photoId: string;
  qualityScore?: number;
  isBestShot?: boolean;
  sceneCategory?: string;
  error?: string;
}

/**
 * BullMQ Worker Processor for Photo Intelligence & AI Analysis.
 * Processes individual photo image buffers for quality, exposure, scene classification,
 * near-duplicate hashing, and best-shot selection.
 */
export async function processPhotoIntelligence(data: PhotoIntelligenceJobData): Promise<ProcessIntelligenceResult> {
  const { photoId, studioId, galleryId, forceReanalyze } = data;
  console.log(`[IntelligenceProcessor] Starting AI analysis for photo: ${photoId} (Gallery: ${galleryId})`);

  // 1. Locate photo record
  const photo = await prisma.photo.findUnique({
    where: { id: photoId },
    include: { ai_analysis: true },
  });

  if (!photo) {
    throw new Error(`Photo not found for ID: ${photoId}`);
  }

  // Tenant Boundary Check
  if (photo.studio_id !== studioId || photo.gallery_id !== galleryId) {
    throw new Error(`Tenant Isolation Violation: Photo does not belong to specified studio/gallery`);
  }

  // 2. Idempotency check
  if (photo.ai_analysis && photo.ai_analysis.analysis_status === ProcessingStatus.COMPLETED && !forceReanalyze) {
    console.log(`[IntelligenceProcessor] Photo ${photoId} is already analyzed. Skipping.`);
    return {
      success: true,
      photoId,
      qualityScore: photo.ai_analysis.quality_score,
      isBestShot: photo.ai_analysis.is_best_shot,
      sceneCategory: photo.ai_analysis.scene_category,
    };
  }

  // 3. Track ProcessingJob
  await prisma.processingJob.create({
    data: {
      studio_id: studioId,
      gallery_id: galleryId,
      photo_id: photoId,
      job_type: JobType.PHOTO_INTELLIGENCE,
      status: ProcessingStatus.PROCESSING,
      progress: 25,
    },
  }).catch(() => null);

  try {
    // 4. Download image buffer
    const storage = StorageService.getProvider(photo.storage_provider as any);
    const storagePath = data.storagePath || photo.storage_path;
    const imageBuffer = await storage.download(storagePath);

    // 5. Run Photo Intelligence Analysis
    const analysis = await PhotoIntelligenceService.analyzePhoto(photoId, studioId, galleryId, imageBuffer);

    // 6. Complete ProcessingJob
    await prisma.processingJob.updateMany({
      where: { photo_id: photoId, job_type: JobType.PHOTO_INTELLIGENCE },
      data: {
        status: ProcessingStatus.COMPLETED,
        progress: 100,
        error_message: null,
      },
    }).catch(() => null);

    console.log(`[IntelligenceProcessor] ✅ Successfully analyzed photo ${photoId} (Quality: ${analysis.quality_score}, Scene: ${analysis.scene_category}, BestShot: ${analysis.is_best_shot})`);

    return {
      success: true,
      photoId,
      qualityScore: analysis.quality_score,
      isBestShot: analysis.is_best_shot,
      sceneCategory: analysis.scene_category,
    };
  } catch (err: unknown) {
    const rawMsg = err instanceof Error ? err.message : String(err);
    const sanitizedError = `AI Photo Intelligence failure: ${rawMsg.replace(/\/[\w./-]+/g, '[path]')}`;
    console.error(`[IntelligenceProcessor] ❌ Failed analysis for photo ${photoId}:`, sanitizedError);

    await prisma.processingJob.updateMany({
      where: { photo_id: photoId, job_type: JobType.PHOTO_INTELLIGENCE },
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
