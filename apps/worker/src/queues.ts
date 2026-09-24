import { Queue } from 'bullmq';
import Redis from 'ioredis';
import { prisma, ProcessingStatus, JobType } from '@pixmatch/database';
import { PhotoJobData } from './processors/photo.processor.js';
import { FaceJobData, processFaceIndexing } from './processors/face.processor.js';

const redisHost = process.env.REDIS_HOST || 'localhost';
const redisPort = parseInt(process.env.REDIS_PORT || '6379', 10);
const redisPassword = process.env.REDIS_PASSWORD || undefined;

export const redisConnection = new Redis({
  host: redisHost,
  port: redisPort,
  password: redisPassword,
  maxRetriesPerRequest: null,
  lazyConnect: true,
  retryStrategy: (times) => {
    if (times > 3) {
      return null; // Stop retrying if Redis is not locally available
    }
    return Math.min(times * 100, 2000);
  },
});

redisConnection.on('error', (err) => {
  if (process.env.NODE_ENV !== 'test') {
    console.warn(`[Redis] Connection warning: ${err.message}`);
  }
});

// Primary Photo Processing Queue with BullMQ
export const photoProcessingQueue = new Queue<PhotoJobData>('photo-processing', {
  connection: redisConnection,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 2000,
    },
    removeOnComplete: {
      age: 86400, // 24 hours
      count: 1000,
    },
    removeOnFail: {
      age: 604800, // 7 days
    },
  },
});

// Real AI Face Indexing Queue
export const faceIndexingQueue = new Queue<FaceJobData>('face-indexing', {
  connection: redisConnection,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 3000,
    },
    removeOnComplete: {
      age: 86400,
      count: 2000,
    },
    removeOnFail: {
      age: 604800,
    },
  },
});

import { StorageSyncJobData } from './processors/sync.processor.js';

export const storageSyncQueue = new Queue<StorageSyncJobData>('storage-sync', {
  connection: redisConnection,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 5000,
    },
    removeOnComplete: {
      age: 86400,
      count: 1000,
    },
    removeOnFail: {
      age: 604800,
    },
  },
});

export const galleryCleanupQueue = new Queue('gallery-cleanup', {
  connection: redisConnection,
});

import { EmailDeliveryJobData } from './processors/email.processor.js';

export const emailDeliveryQueue = new Queue<EmailDeliveryJobData>('email-delivery', {
  connection: redisConnection,
  defaultJobOptions: {
    attempts: 5,
    backoff: {
      type: 'exponential',
      delay: 2000,
    },
    removeOnComplete: {
      age: 86400, // 24 hours
      count: 2000,
    },
    removeOnFail: {
      age: 604800, // 7 days
    },
  },
});

import { PhotoIntelligenceJobData } from './processors/intelligence.processor.js';

export const photoIntelligenceQueue = new Queue<PhotoIntelligenceJobData>('photo-intelligence', {
  connection: redisConnection,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 2000,
    },
    removeOnComplete: {
      age: 86400,
      count: 2000,
    },
    removeOnFail: {
      age: 604800,
    },
  },
});

export interface DispatchResult {
  enqueued: boolean;
  jobId: string;
  error?: string;
  retryable?: boolean;
}

/**
 * Enqueues an email for asynchronous delivery with BullMQ.
 */
export async function dispatchEmailDelivery(data: EmailDeliveryJobData): Promise<DispatchResult> {
  const deterministicJobId = data.idempotencyKey || `email-delivery:${data.deliveryId}`;

  try {
    const job = await emailDeliveryQueue.add('send-email', data, {
      jobId: deterministicJobId,
    });

    return {
      enqueued: true,
      jobId: job.id || deterministicJobId,
    };
  } catch (queueErr: unknown) {
    const errorMsg = queueErr instanceof Error ? queueErr.message : String(queueErr);
    console.warn(`[Queue Infrastructure] Redis/BullMQ unavailable for email ${data.deliveryId}: ${errorMsg}`);

    return {
      enqueued: false,
      jobId: deterministicJobId,
      error: 'QUEUE_UNAVAILABLE',
      retryable: true,
    };
  }
}


/**
 * Enqueues a storage sync task for background cloud reconciliation with BullMQ.
 */
export async function dispatchStorageSync(data: StorageSyncJobData): Promise<DispatchResult> {
  const deterministicJobId = `storage-sync:${data.jobId}`;

  try {
    const job = await storageSyncQueue.add('sync-storage', data, {
      jobId: deterministicJobId,
    });

    console.log(`[Queue] Enqueued storage sync job ${data.jobId} (Job ID: ${job.id || deterministicJobId})`);
    return {
      enqueued: true,
      jobId: job.id || deterministicJobId,
    };
  } catch (queueErr: unknown) {
    const errorMsg = queueErr instanceof Error ? queueErr.message : String(queueErr);
    console.warn(`[Queue Infrastructure Error] Redis/BullMQ unavailable for storage sync ${data.jobId}: ${errorMsg}`);

    if (process.env.DATABASE_URL) {
      await prisma.storageSyncJob.update({
        where: { id: data.jobId },
        data: {
          status: 'FAILED' as any,
          error_message: `QUEUE_UNAVAILABLE: Background queue offline (${errorMsg}). Safe for worker retry.`,
        },
      }).catch(() => null);
    }

    return {
      enqueued: false,
      jobId: deterministicJobId,
      error: 'QUEUE_UNAVAILABLE',
      retryable: true,
    };
  }
}

/**
 * Enqueues a photo for background Sharp thumbnail & metadata processing with BullMQ.
 * PRODUCTION RULE: The API server MUST NEVER perform heavy Sharp image processing in-process.
 */
export async function dispatchPhotoProcessing(data: PhotoJobData): Promise<DispatchResult> {
  const deterministicJobId = `photo-processing:${data.photoId}`;

  try {
    const job = await photoProcessingQueue.add('process-photo', data, {
      jobId: deterministicJobId,
    });

    console.log(`[Queue] Enqueued photo ${data.photoId} (Job ID: ${job.id || deterministicJobId})`);
    return {
      enqueued: true,
      jobId: job.id || deterministicJobId,
    };
  } catch (queueErr: unknown) {
    const errorMsg = queueErr instanceof Error ? queueErr.message : String(queueErr);
    console.warn(`[Queue Infrastructure Error] Redis/BullMQ unavailable for photo ${data.photoId}: ${errorMsg}`);

    if (process.env.DATABASE_URL) {
      await prisma.processingJob.updateMany({
        where: { photo_id: data.photoId },
        data: {
          status: ProcessingStatus.FAILED,
          error_message: `QUEUE_UNAVAILABLE: Background queue offline (${errorMsg}). Safe for worker retry.`,
        },
      }).catch(() => null);
    }

    return {
      enqueued: false,
      jobId: deterministicJobId,
      error: 'QUEUE_UNAVAILABLE',
      retryable: true,
    };
  }
}

/**
 * Enqueues a photo for AI face detection and pgvector indexing with BullMQ.
 */
export async function dispatchFaceIndexing(data: FaceJobData): Promise<DispatchResult> {
  const deterministicJobId = `face-indexing:${data.photoId}`;

  try {
    const job = await faceIndexingQueue.add('index-faces', data, {
      jobId: deterministicJobId,
    });

    console.log(`[Queue] Enqueued face indexing for photo ${data.photoId} (Job ID: ${job.id || deterministicJobId})`);
    return {
      enqueued: true,
      jobId: job.id || deterministicJobId,
    };
  } catch (queueErr: unknown) {
    const errorMsg = queueErr instanceof Error ? queueErr.message : String(queueErr);
    console.warn(`[Queue Infrastructure Error] Redis/BullMQ unavailable for face indexing ${data.photoId}: ${errorMsg}`);

    return {
      enqueued: false,
      jobId: deterministicJobId,
      error: 'QUEUE_UNAVAILABLE',
      retryable: true,
    };
  }
}

/**
 * Re-indexes all photos in an entire gallery.
 */
export async function dispatchGalleryReindexing(galleryId: string, studioId: string): Promise<{ totalEnqueued: number }> {
  const photos = await prisma.photo.findMany({
    where: { gallery_id: galleryId, studio_id: studioId },
    select: { id: true, storage_path: true },
  });

  let count = 0;
  for (const photo of photos) {
    await dispatchFaceIndexing({
      photoId: photo.id,
      studioId,
      galleryId,
      storagePath: photo.storage_path,
      forceReindex: true,
    });
    count++;
  }

  return { totalEnqueued: count };
}

/**
 * Enqueues a photo for AI Photo Intelligence analysis with BullMQ.
 */
export async function dispatchPhotoIntelligence(data: PhotoIntelligenceJobData): Promise<DispatchResult> {
  const deterministicJobId = `photo-intelligence:${data.photoId}`;

  try {
    const job = await photoIntelligenceQueue.add('analyze-photo-intelligence', data, {
      jobId: deterministicJobId,
    });

    return {
      enqueued: true,
      jobId: job.id || deterministicJobId,
    };
  } catch (queueErr: unknown) {
    const errorMsg = queueErr instanceof Error ? queueErr.message : String(queueErr);
    console.warn(`[Queue Infrastructure] Redis/BullMQ unavailable for photo intelligence ${data.photoId}: ${errorMsg}`);

    return {
      enqueued: false,
      jobId: deterministicJobId,
      error: 'QUEUE_UNAVAILABLE',
      retryable: true,
    };
  }
}

/**
 * Dispatches AI Photo Intelligence analysis across all photos in a gallery.
 */
export async function dispatchGalleryIntelligence(galleryId: string, studioId: string): Promise<{ totalEnqueued: number }> {
  const photos = await prisma.photo.findMany({
    where: { gallery_id: galleryId, studio_id: studioId },
    select: { id: true, storage_path: true },
  });

  let count = 0;
  for (const photo of photos) {
    await dispatchPhotoIntelligence({
      photoId: photo.id,
      studioId,
      galleryId,
      storagePath: photo.storage_path,
      forceReanalyze: true,
    });
    count++;
  }

  return { totalEnqueued: count };
}

import { EventIntelligenceJobData } from './processors/event-intelligence.processor.js';

export const eventIntelligenceQueue = new Queue<EventIntelligenceJobData>('event-intelligence', {
  connection: redisConnection,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 3000,
    },
    removeOnComplete: {
      age: 86400,
      count: 2000,
    },
    removeOnFail: {
      age: 604800,
    },
  },
});

/**
 * Enqueues an entire gallery for Event Intelligence processing with BullMQ.
 */
export async function dispatchEventIntelligence(data: EventIntelligenceJobData): Promise<DispatchResult> {
  const deterministicJobId = `event-intelligence:${data.galleryId}`;

  try {
    const job = await eventIntelligenceQueue.add('analyze-event-intelligence', data, {
      jobId: deterministicJobId,
    });

    console.log(`[Queue] Enqueued Event Intelligence for gallery ${data.galleryId} (Job ID: ${job.id || deterministicJobId})`);
    return {
      enqueued: true,
      jobId: job.id || deterministicJobId,
    };
  } catch (queueErr: unknown) {
    const errorMsg = queueErr instanceof Error ? queueErr.message : String(queueErr);
    console.warn(`[Queue Infrastructure] Redis/BullMQ unavailable for event intelligence ${data.galleryId}: ${errorMsg}`);

    return {
      enqueued: false,
      jobId: deterministicJobId,
      error: 'QUEUE_UNAVAILABLE',
      retryable: true,
    };
  }
}

import { CopilotPrepareJobData } from './processors/copilot-prepare.processor.js';

export const copilotPrepareQueue = new Queue<CopilotPrepareJobData>('copilot-prepare', {
  connection: redisConnection,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 3000,
    },
    removeOnComplete: {
      age: 86400,
      count: 2000,
    },
    removeOnFail: {
      age: 604800,
    },
  },
});

/**
 * Enqueues a gallery for automated Copilot preparation.
 */
export async function dispatchCopilotPrepare(data: CopilotPrepareJobData): Promise<DispatchResult> {
  const deterministicJobId = `copilot-prepare:${data.galleryId}`;

  try {
    const job = await copilotPrepareQueue.add('prepare-gallery', data, {
      jobId: deterministicJobId,
    });

    console.log(`[Queue] Enqueued Copilot Prepare for gallery ${data.galleryId} (Job ID: ${job.id || deterministicJobId})`);
    return {
      enqueued: true,
      jobId: job.id || deterministicJobId,
    };
  } catch (queueErr: unknown) {
    const errorMsg = queueErr instanceof Error ? queueErr.message : String(queueErr);
    console.warn(`[Queue Infrastructure] Redis/BullMQ unavailable for copilot prepare ${data.galleryId}: ${errorMsg}`);

    return {
      enqueued: false,
      jobId: deterministicJobId,
      error: 'QUEUE_UNAVAILABLE',
      retryable: true,
    };
  }
}

import { AutomationWorkflowJobData } from './processors/automation-workflow.processor.js';

export const automationWorkflowQueue = new Queue<AutomationWorkflowJobData>('automation-workflow', {
  connection: redisConnection,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 3000,
    },
    removeOnComplete: {
      age: 86400,
      count: 2000,
    },
    removeOnFail: {
      age: 604800,
    },
  },
});

/**
 * Enqueues an automation workflow execution run.
 */
export async function dispatchAutomationWorkflow(data: AutomationWorkflowJobData): Promise<DispatchResult> {
  const deterministicJobId = `automation:${data.workflowId}:${data.galleryId || 'global'}:${data.runId}:${data.stepId || 'progress'}`;

  try {
    const job = await automationWorkflowQueue.add('process-workflow', data, {
      jobId: deterministicJobId,
    });

    console.log(`[Queue] Enqueued Automation Workflow ${data.workflowId} for studio ${data.studioId} (Job ID: ${job.id || deterministicJobId})`);
    return {
      enqueued: true,
      jobId: job.id || deterministicJobId,
    };
  } catch (queueErr: unknown) {
    const errorMsg = queueErr instanceof Error ? queueErr.message : String(queueErr);
    console.warn(`[Queue Infrastructure] Redis/BullMQ unavailable for automation workflow ${data.runId}: ${errorMsg}`);

    return {
      enqueued: false,
      jobId: deterministicJobId,
      error: 'QUEUE_UNAVAILABLE',
      retryable: true,
    };
  }
}

// -------------------------------------------------------------
// PHASE 17: CLIENT INTELLIGENCE BACKGROUND QUEUES
// -------------------------------------------------------------

import { ClientEngagementRefreshJobData } from './processors/client-engagement-refresh.processor.js';
import { ClientFollowUpScanJobData } from './processors/client-followup-scan.processor.js';

export const clientEngagementRefreshQueue = new Queue<ClientEngagementRefreshJobData>('client-engagement-refresh', {
  connection: redisConnection,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 3000,
    },
    removeOnComplete: {
      age: 86400,
      count: 2000,
    },
    removeOnFail: {
      age: 604800,
    },
  },
});

export const clientFollowupScanQueue = new Queue<ClientFollowUpScanJobData>('client-followup-scan', {
  connection: redisConnection,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 3000,
    },
    removeOnComplete: {
      age: 86400,
      count: 2000,
    },
    removeOnFail: {
      age: 604800,
    },
  },
});

export async function dispatchClientEngagementRefresh(data: ClientEngagementRefreshJobData): Promise<DispatchResult> {
  const deterministicJobId = `engagement-refresh:${data.studioId}:${data.clientId || 'all'}:${Date.now()}`;

  try {
    const job = await clientEngagementRefreshQueue.add('refresh-engagement', data, {
      jobId: deterministicJobId,
    });

    return {
      enqueued: true,
      jobId: job.id || deterministicJobId,
    };
  } catch (queueErr: unknown) {
    const errorMsg = queueErr instanceof Error ? queueErr.message : String(queueErr);
    console.warn(`[Queue Infrastructure] Redis/BullMQ unavailable for client engagement refresh: ${errorMsg}`);
    return {
      enqueued: false,
      jobId: deterministicJobId,
      error: 'QUEUE_UNAVAILABLE',
      retryable: true,
    };
  }
}

export async function dispatchClientFollowUpScan(data: ClientFollowUpScanJobData): Promise<DispatchResult> {
  const deterministicJobId = `followup-scan:${data.studioId}:${Date.now()}`;

  try {
    const job = await clientFollowupScanQueue.add('scan-followups', data, {
      jobId: deterministicJobId,
    });

    return {
      enqueued: true,
      jobId: job.id || deterministicJobId,
    };
  } catch (queueErr: unknown) {
    const errorMsg = queueErr instanceof Error ? queueErr.message : String(queueErr);
    console.warn(`[Queue Infrastructure] Redis/BullMQ unavailable for follow-up scan: ${errorMsg}`);
    return {
      enqueued: false,
      jobId: deterministicJobId,
      error: 'QUEUE_UNAVAILABLE',
      retryable: true,
    };
  }
}


