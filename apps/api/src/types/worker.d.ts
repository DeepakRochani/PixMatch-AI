declare module '@pixmatch/worker' {
  export function dispatchPhotoProcessing(payload: {
    photoId: string;
    galleryId: string;
    studioId: string;
    storagePath: string;
    originalFilename?: string;
    mimeType?: string;
  }): Promise<{ enqueued: boolean; jobId: string }>;

  export function dispatchFaceIndexing(payload: {
    photoId: string;
    galleryId: string;
    studioId: string;
    storagePath?: string;
    forceReindex?: boolean;
  }): Promise<{ enqueued: boolean; jobId: string }>;

  export function dispatchGalleryReindexing(
    galleryId: string,
    studioId: string
  ): Promise<{ enqueued: boolean; totalEnqueued: number }>;

  export function dispatchStorageSync(payload: {
    jobId: string;
    connectionId: string;
    studioId: string;
    galleryId: string;
    folderId?: string;
    isIncremental?: boolean;
  }): Promise<{ enqueued: boolean; jobId: string }>;

  export const photoProcessingQueue: any;
  export const faceIndexingQueue: any;
  export const storageSyncQueue: any;
}
