/**
 * Event Intelligence Background Processor — PIXMatch AI Phase 13
 * 
 * BullMQ background processor for asynchronous gallery event intelligence,
 * timeline clustering, highlight ranking, and story generation.
 */

import { prisma, ProcessingStatus, JobType } from '@pixmatch/database';
import { EventIntelligenceService } from '../../../api/src/modules/event-intelligence/event-intelligence.service.js';
import { StoryTone, StoryLength } from '@prisma/client';

export interface EventIntelligenceJobData {
  studioId: string;
  galleryId: string;
  forceReanalyze?: boolean;
  minGapMinutes?: number;
  maxGapMinutes?: number;
  targetChapterCount?: number;
  storyTone?: StoryTone;
  storyLength?: StoryLength;
}

export interface ProcessEventIntelligenceResult {
  success: boolean;
  galleryId: string;
  detectedEventType?: string;
  totalChapters?: number;
  totalHighlights?: number;
  error?: string;
}

export async function processEventIntelligence(data: EventIntelligenceJobData): Promise<ProcessEventIntelligenceResult> {
  const { studioId, galleryId, forceReanalyze, minGapMinutes, maxGapMinutes, targetChapterCount, storyTone, storyLength } = data;
  console.log(`[EventIntelligenceProcessor] Starting Event Intelligence for gallery: ${galleryId}`);

  // Create processing job record for observability
  const jobRecord = await prisma.processingJob.create({
    data: {
      studio_id: studioId,
      job_type: JobType.EVENT_INTELLIGENCE,
      status: ProcessingStatus.PROCESSING,
      payload: {
        gallery_id: galleryId,
        force_reanalyze: forceReanalyze,
      },
    },
  });

  try {
    const service = new EventIntelligenceService(prisma);
    const result = await service.analyzeGallery(studioId, galleryId, {
      forceReanalyze: forceReanalyze !== false,
      minGapMinutes,
      maxGapMinutes,
      targetChapterCount,
      storyTone,
      storyLength,
    });

    await prisma.processingJob.update({
      where: { id: jobRecord.id },
      data: {
        status: ProcessingStatus.COMPLETED,
        completed_at: new Date(),
      },
    });

    console.log(`[EventIntelligenceProcessor] ✅ Completed for gallery: ${galleryId}. Detected: ${result.detectedEventType}, Chapters: ${result.totalChapters}`);

    return {
      success: true,
      galleryId,
      detectedEventType: result.detectedEventType,
      totalChapters: result.totalChapters,
      totalHighlights: result.totalHighlights,
    };
  } catch (err: any) {
    console.error(`[EventIntelligenceProcessor] ❌ Failed for gallery: ${galleryId}`, err);

    await prisma.processingJob.update({
      where: { id: jobRecord.id },
      data: {
        status: ProcessingStatus.FAILED,
        error_message: err?.message || 'Event intelligence background processing failed',
        completed_at: new Date(),
      },
    });

    return {
      success: false,
      galleryId,
      error: err?.message || 'Unknown processing error',
    };
  }
}
