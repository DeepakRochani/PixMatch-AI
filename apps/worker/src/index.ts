import dotenv from 'dotenv';
dotenv.config();

import { Worker, Job } from 'bullmq';
import {
  redisConnection,
  photoProcessingQueue,
  faceIndexingQueue,
  storageSyncQueue,
  emailDeliveryQueue,
  photoIntelligenceQueue,
  eventIntelligenceQueue,
  dispatchPhotoProcessing,
  dispatchFaceIndexing,
  dispatchGalleryReindexing,
  dispatchStorageSync,
  dispatchEmailDelivery,
  dispatchPhotoIntelligence,
  dispatchGalleryIntelligence,
  dispatchEventIntelligence,
} from './queues.js';
import { processPhoto, PhotoJobData } from './processors/photo.processor.js';
import { processFaceIndexing, FaceJobData } from './processors/face.processor.js';
import { processStorageSync, StorageSyncJobData } from './processors/sync.processor.js';
import { processEmailDelivery, EmailDeliveryJobData } from './processors/email.processor.js';
import { processPhotoIntelligence, PhotoIntelligenceJobData } from './processors/intelligence.processor.js';
import { processEventIntelligence, EventIntelligenceJobData } from './processors/event-intelligence.processor.js';

export {
  processPhoto,
  dispatchPhotoProcessing,
  photoProcessingQueue,
  PhotoJobData,
  processFaceIndexing,
  dispatchFaceIndexing,
  dispatchGalleryReindexing,
  faceIndexingQueue,
  FaceJobData,
  processStorageSync,
  dispatchStorageSync,
  storageSyncQueue,
  StorageSyncJobData,
  processEmailDelivery,
  dispatchEmailDelivery,
  emailDeliveryQueue,
  EmailDeliveryJobData,
  processPhotoIntelligence,
  dispatchPhotoIntelligence,
  dispatchGalleryIntelligence,
  photoIntelligenceQueue,
  PhotoIntelligenceJobData,
  processEventIntelligence,
  dispatchEventIntelligence,
  eventIntelligenceQueue,
  EventIntelligenceJobData,
};

console.log('⚡ PixMatch Background Worker Service initializing...');

// Initialize BullMQ Worker for photo processing
export const photoWorker = new Worker<PhotoJobData>(
  'photo-processing',
  async (job: Job<PhotoJobData>) => {
    console.log(`[Worker] Processing job ${job.id} for photo: ${job.data.photoId}`);
    return await processPhoto(job.data);
  },
  {
    connection: redisConnection,
    concurrency: parseInt(process.env.WORKER_CONCURRENCY || '5', 10),
  }
);

photoWorker.on('completed', (job) => {
  console.log(`[Worker] ✅ Job ${job.id} (Photo: ${job.data.photoId}) completed successfully`);
});

photoWorker.on('failed', (job, err) => {
  console.error(`[Worker] ❌ Job ${job?.id} (Photo: ${job?.data?.photoId}) failed:`, err);
});

// Initialize BullMQ Worker for AI Face Indexing
export const faceWorker = new Worker<FaceJobData>(
  'face-indexing',
  async (job: Job<FaceJobData>) => {
    console.log(`[Worker] Processing face indexing job ${job.id} for photo: ${job.data.photoId}`);
    return await processFaceIndexing(job.data);
  },
  {
    connection: redisConnection,
    concurrency: parseInt(process.env.FACE_WORKER_CONCURRENCY || '3', 10),
  }
);

faceWorker.on('completed', (job) => {
  console.log(`[Worker] ✅ Face indexing job ${job.id} (Photo: ${job.data.photoId}) completed`);
});

faceWorker.on('failed', (job, err) => {
  console.error(`[Worker] ❌ Face indexing job ${job?.id} (Photo: ${job?.data?.photoId}) failed:`, err);
});

// Storage Sync Worker
export const storageSyncWorker = new Worker<StorageSyncJobData>(
  'storage-sync',
  async (job: Job<StorageSyncJobData>) => {
    console.log(`[Worker] Processing storage sync job ${job.id} for connection: ${job.data.connectionId}`);
    return await processStorageSync(job.data);
  },
  {
    connection: redisConnection,
    concurrency: parseInt(process.env.SYNC_WORKER_CONCURRENCY || '2', 10),
  }
);

storageSyncWorker.on('completed', (job) => {
  console.log(`[Worker] ✅ Storage sync job ${job.id} (Connection: ${job.data.connectionId}) completed`);
});

// Email Delivery Worker
export const emailWorker = new Worker<EmailDeliveryJobData>(
  'email-delivery',
  async (job: Job<EmailDeliveryJobData>) => {
    console.log(`[Worker] Processing email delivery job ${job.id} (Template: ${job.data.templateKey})`);
    return await processEmailDelivery(job);
  },
  {
    connection: redisConnection,
    concurrency: parseInt(process.env.EMAIL_WORKER_CONCURRENCY || '5', 10),
  }
);

emailWorker.on('completed', (job) => {
  console.log(`[Worker] ✅ Email delivery job ${job.id} completed successfully`);
});

emailWorker.on('failed', (job, err) => {
  console.error(`[Worker] ❌ Email delivery job ${job?.id} failed:`, err);
});

// Photo Intelligence Worker
export const intelligenceWorker = new Worker<PhotoIntelligenceJobData>(
  'photo-intelligence',
  async (job: Job<PhotoIntelligenceJobData>) => {
    console.log(`[Worker] Processing photo intelligence job ${job.id} for photo: ${job.data.photoId}`);
    return await processPhotoIntelligence(job.data);
  },
  {
    connection: redisConnection,
    concurrency: parseInt(process.env.INTELLIGENCE_WORKER_CONCURRENCY || '4', 10),
  }
);

intelligenceWorker.on('completed', (job) => {
  console.log(`[Worker] ✅ Photo intelligence job ${job.id} (Photo: ${job.data.photoId}) completed successfully`);
});

intelligenceWorker.on('failed', (job, err) => {
  console.error(`[Worker] ❌ Photo intelligence job ${job?.id} (Photo: ${job?.data?.photoId}) failed:`, err);
});

// Event Intelligence Worker
export const eventIntelligenceWorker = new Worker<EventIntelligenceJobData>(
  'event-intelligence',
  async (job: Job<EventIntelligenceJobData>) => {
    console.log(`[Worker] Processing event intelligence job ${job.id} for gallery: ${job.data.galleryId}`);
    return await processEventIntelligence(job.data);
  },
  {
    connection: redisConnection,
    concurrency: parseInt(process.env.EVENT_INTEL_WORKER_CONCURRENCY || '3', 10),
  }
);

eventIntelligenceWorker.on('completed', (job) => {
  console.log(`[Worker] ✅ Event intelligence job ${job.id} (Gallery: ${job.data.galleryId}) completed successfully`);
});

eventIntelligenceWorker.on('failed', (job, err) => {
  console.error(`[Worker] ❌ Event intelligence job ${job?.id} (Gallery: ${job?.data?.galleryId}) failed:`, err);
});

import { processAutomationWorkflow, AutomationWorkflowJobData } from './processors/automation-workflow.processor.js';
import { automationWorkflowQueue, dispatchAutomationWorkflow } from './queues.js';
import { processClientEngagementRefresh, ClientEngagementRefreshJobData } from './processors/client-engagement-refresh.processor.js';
import { processClientFollowUpScan, ClientFollowUpScanJobData } from './processors/client-followup-scan.processor.js';
import {
  clientEngagementRefreshQueue,
  clientFollowupScanQueue,
  dispatchClientEngagementRefresh,
  dispatchClientFollowUpScan,
} from './queues.js';

export {
  automationWorkflowQueue,
  dispatchAutomationWorkflow,
  AutomationWorkflowJobData,
  clientEngagementRefreshQueue,
  clientFollowupScanQueue,
  dispatchClientEngagementRefresh,
  dispatchClientFollowUpScan,
  ClientEngagementRefreshJobData,
  ClientFollowUpScanJobData,
};

// Automation Workflow Worker
export const automationWorkflowWorker = new Worker<AutomationWorkflowJobData>(
  'automation-workflow',
  async (job: Job<AutomationWorkflowJobData>) => {
    console.log(`[Worker] Processing automation workflow job ${job.id} for run: ${job.data.runId}`);
    return await processAutomationWorkflow(job);
  },
  {
    connection: redisConnection,
    concurrency: parseInt(process.env.AUTOMATION_WORKER_CONCURRENCY || '3', 10),
  }
);

automationWorkflowWorker.on('completed', (job) => {
  console.log(`[Worker] ✅ Automation workflow job ${job.id} completed successfully`);
});

automationWorkflowWorker.on('failed', (job, err) => {
  console.error(`[Worker] ❌ Automation workflow job ${job?.id} failed:`, err);
});

// Client Engagement Refresh Worker
export const clientEngagementRefreshWorker = new Worker<ClientEngagementRefreshJobData>(
  'client-engagement-refresh',
  async (job: Job<ClientEngagementRefreshJobData>) => {
    console.log(`[Worker] Processing client engagement refresh job ${job.id} for studio: ${job.data.studioId}`);
    return await processClientEngagementRefresh(job);
  },
  {
    connection: redisConnection,
    concurrency: parseInt(process.env.CLIENT_ENGAGEMENT_WORKER_CONCURRENCY || '2', 10),
  }
);

clientEngagementRefreshWorker.on('completed', (job) => {
  console.log(`[Worker] ✅ Client engagement refresh job ${job.id} completed successfully`);
});

clientEngagementRefreshWorker.on('failed', (job, err) => {
  console.error(`[Worker] ❌ Client engagement refresh job ${job?.id} failed:`, err);
});

// Client Follow-up Scan Worker
export const clientFollowupScanWorker = new Worker<ClientFollowUpScanJobData>(
  'client-followup-scan',
  async (job: Job<ClientFollowUpScanJobData>) => {
    console.log(`[Worker] Processing client follow-up scan job ${job.id} for studio: ${job.data.studioId}`);
    return await processClientFollowUpScan(job);
  },
  {
    connection: redisConnection,
    concurrency: parseInt(process.env.CLIENT_FOLLOWUP_WORKER_CONCURRENCY || '2', 10),
  }
);

clientFollowupScanWorker.on('completed', (job) => {
  console.log(`[Worker] ✅ Client follow-up scan job ${job.id} completed successfully`);
});

clientFollowupScanWorker.on('failed', (job, err) => {
  console.error(`[Worker] ❌ Client follow-up scan job ${job?.id} failed:`, err);
});

console.log('🚀 PixMatch Background Worker running and listening for jobs on photo-processing, face-indexing, storage-sync, email-delivery, photo-intelligence, event-intelligence, automation-workflow, client-engagement-refresh, and client-followup-scan queues.');


