/**
 * Copilot Prepare Gallery Processor — PIXMatch AI Phase 15
 * Asynchronous worker for long-running gallery preparation workflows.
 */

import { Job } from 'bullmq';
import { prisma, ProcessingStatus, JobType } from '@pixmatch/database';
import { CopilotPrepareGalleryRequestDTO } from '@pixmatch/types';

export interface CopilotPrepareJobData extends CopilotPrepareGalleryRequestDTO {
  studioId: string;
  userId: string;
}

export async function processCopilotPrepare(job: Job<CopilotPrepareJobData>): Promise<{
  success: boolean;
  galleryId: string;
  stepsCompleted: string[];
}> {
  const { studioId, galleryId, auto_select_cover, generate_smart_albums, generate_event_story, retry_failed_jobs } = job.data;
  console.log(`[Worker] Starting Copilot Prepare Gallery for gallery ${galleryId} (Job ${job.id})`);

  const stepsCompleted: string[] = [];

  // 1. Retry failed jobs if requested
  if (retry_failed_jobs !== false) {
    const failedPhotos = await prisma.photo.findMany({
      where: { gallery_id: galleryId, studio_id: studioId, status: ProcessingStatus.FAILED },
    });
    if (failedPhotos.length > 0) {
      await prisma.photo.updateMany({
        where: { gallery_id: galleryId, studio_id: studioId, status: ProcessingStatus.FAILED },
        data: { status: ProcessingStatus.PENDING },
      });
      stepsCompleted.push(`Retried ${failedPhotos.length} failed processing photos`);
    }
  }

  // 2. Select cover if auto-select enabled
  if (auto_select_cover) {
    const gal = await prisma.gallery.findFirst({
      where: { id: galleryId, studio_id: studioId },
      select: { cover_photo_url: true },
    });
    if (!gal?.cover_photo_url) {
      const topPhoto = await prisma.photo.findFirst({
        where: { gallery_id: galleryId, studio_id: studioId },
        orderBy: { created_at: 'asc' },
      });
      if (topPhoto) {
        await prisma.gallery.update({
          where: { id: galleryId },
          data: { cover_photo_url: topPhoto.preview_url || topPhoto.thumbnail_url },
        });
        stepsCompleted.push('Auto-selected cover photo');
      }
    }
  }

  // 3. Mark completion
  console.log(`[Worker] Copilot Prepare completed for gallery ${galleryId} with ${stepsCompleted.length} steps.`);
  return {
    success: true,
    galleryId,
    stepsCompleted,
  };
}
