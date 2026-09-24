import { prisma, StorageSyncStatus, StorageConnectionStatus, StorageMode, ProcessingStatus, PhotoVersionType, StorageProviderType } from '@pixmatch/database';
import { StorageService, MediaService, decryptTokens, encryptTokens, PlatformStorageProvider } from '@pixmatch/storage';
import { GoogleDriveProvider, DropboxProvider, OneDriveProvider, S3Provider, ExternalUrlProvider } from '@pixmatch/storage';
import { dispatchPhotoProcessing, dispatchFaceIndexing } from '../queues.js';

export interface StorageSyncJobData {
  jobId: string;
  connectionId: string;
  studioId: string;
  galleryId: string;
  folderId?: string;
  isIncremental?: boolean;
}

export interface StorageSyncResult {
  success: boolean;
  jobId: string;
  filesDiscovered: number;
  filesImported: number;
  filesSkipped: number;
  filesFailed: number;
  bytesTransferred: number;
  error?: string;
}

/**
 * Instantiates the appropriate StorageProvider with decrypted credentials.
 */
function getExternalProvider(providerName: string, decryptedTokens: any) {
  switch (providerName.toUpperCase()) {
    case 'GOOGLE_DRIVE':
      return new GoogleDriveProvider({
        clientId: process.env.GOOGLE_CLIENT_ID || '',
        clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
        redirectUri: process.env.GOOGLE_REDIRECT_URI || 'http://localhost:3000/api/storage/oauth/google/callback',
        accessToken: decryptedTokens.accessToken,
        refreshToken: decryptedTokens.refreshToken,
      });
    case 'DROPBOX':
      return new DropboxProvider({
        clientId: process.env.DROPBOX_CLIENT_ID || '',
        clientSecret: process.env.DROPBOX_CLIENT_SECRET || '',
        redirectUri: process.env.DROPBOX_REDIRECT_URI || 'http://localhost:3000/api/storage/oauth/dropbox/callback',
        accessToken: decryptedTokens.accessToken,
        refreshToken: decryptedTokens.refreshToken,
      });
    case 'ONEDRIVE':
      return new OneDriveProvider({
        clientId: process.env.MICROSOFT_CLIENT_ID || '',
        clientSecret: process.env.MICROSOFT_CLIENT_SECRET || '',
        redirectUri: process.env.MICROSOFT_REDIRECT_URI || 'http://localhost:3000/api/storage/oauth/onedrive/callback',
        accessToken: decryptedTokens.accessToken,
        refreshToken: decryptedTokens.refreshToken,
      });
    case 'S3':
    case 'CLOUDFLARE_R2':
    case 'GENERIC_S3':
      return new S3Provider({
        providerType: providerName.toUpperCase() as any,
        region: decryptedTokens.region,
        bucket: decryptedTokens.bucket,
        endpoint: decryptedTokens.endpoint,
        accessKeyId: decryptedTokens.accessKeyId,
        secretAccessKey: decryptedTokens.secretAccessKey,
        sessionToken: decryptedTokens.sessionToken,
        prefix: decryptedTokens.prefix,
        forcePathStyle: decryptedTokens.forcePathStyle,
      });
    case 'EXTERNAL_URL':
      return new ExternalUrlProvider({
        baseUrlOrManifestUrl: decryptedTokens.manifestUrl || decryptedTokens.urls?.[0] || 'https://pixmatch.internal',
        urls: decryptedTokens.urls || (decryptedTokens.url ? [decryptedTokens.url] : []),
        manifestUrl: decryptedTokens.manifestUrl,
        headers: decryptedTokens.headers,
        maxSizeBytes: decryptedTokens.maxSizeBytes,
        timeoutMs: decryptedTokens.timeoutMs,
      });
    default:
      throw new Error(`Unsupported external storage provider: ${providerName}`);
  }
}

/**
 * Storage Synchronization Processor (Worker Process):
 * Supports Mode A (Import to Platform) and Mode B (Connected Storage).
 * Features:
 * - Incremental delta sync and cursor tracking
 * - File modification detection and re-indexing
 * - Ephemeral thumbnailing and face-indexing for Mode B
 * - Missing external file grace period (marks SOURCE_MISSING, does not hard delete)
 * - Auto-refresh for expiring OAuth tokens and REAUTH_REQUIRED handling on revocation
 */
export async function processStorageSync(data: StorageSyncJobData): Promise<StorageSyncResult> {
  const { jobId, connectionId, studioId, galleryId } = data;
  console.log(`[StorageSync] Starting sync job ${jobId} for connection ${connectionId} (Gallery: ${galleryId})`);

  // 1. Fetch SyncJob and StorageConnection
  const syncJob = await prisma.storageSyncJob.findUnique({ where: { id: jobId } });
  const connection = await prisma.storageConnection.findUnique({
    where: { id: connectionId },
    include: { studio: true },
  });

  if (!connection) {
    const errorMsg = `Storage connection ${connectionId} not found`;
    if (syncJob) {
      await prisma.storageSyncJob.update({
        where: { id: jobId },
        data: {
          status: StorageSyncStatus.FAILED,
          error_message: errorMsg,
          completed_at: new Date(),
        },
      });
    }
    throw new Error(errorMsg);
  }

  // Update job status to SYNCING
  await prisma.storageSyncJob.update({
    where: { id: jobId },
    data: {
      status: StorageSyncStatus.SYNCING,
      started_at: new Date(),
      error_message: null,
    },
  });

  let filesDiscovered = 0;
  let filesImported = 0;
  let filesSkipped = 0;
  let filesFailed = 0;
  let bytesTransferred = 0;

  try {
    // 2. Decrypt tokens
    let tokens: any;
    try {
      if ((connection as any).credentials_encrypted) {
        tokens = decryptTokens((connection as any).credentials_encrypted);
      } else if (connection.access_token) {
        tokens = {
          accessToken: decryptTokens(connection.access_token),
          refreshToken: connection.refresh_token ? decryptTokens(connection.refresh_token) : undefined,
          expiresAt: connection.token_expires_at,
        };
      } else {
        throw new Error('No encrypted credentials found on connection');
      }
    } catch (decryptErr) {
      throw new Error(`Failed to decrypt storage connection credentials: ${decryptErr instanceof Error ? decryptErr.message : String(decryptErr)}`);
    }

    // 3. Initialize Provider
    const provider = getExternalProvider(connection.provider, tokens);
    const platformStorage = new PlatformStorageProvider();

    // 4. List remote folder files
    const targetFolderId = data.folderId || (connection as any).folder_id || 'root';
    console.log(`[StorageSync] Listing files in folder: ${targetFolderId} (Provider: ${connection.provider})`);

    let listResult;
    try {
      listResult = await provider.listFolderFiles(targetFolderId, (connection as any).delta_cursor || undefined);
    } catch (listErr: any) {
      if (listErr?.isRevoked || listErr?.status === 401 || listErr?.message?.includes('invalid_grant')) {
        await prisma.storageConnection.update({
          where: { id: connectionId },
          data: { status: StorageConnectionStatus.REAUTH_REQUIRED },
        });
      }
      throw listErr;
    }

    const { files, nextCursor } = listResult;
    filesDiscovered = files.length;
    console.log(`[StorageSync] Discovered ${filesDiscovered} image files in remote storage`);

    await prisma.storageSyncJob.update({
      where: { id: jobId },
      data: { files_discovered: filesDiscovered },
    });

    const discoveredSourceIds = new Set<string>();

    // 5. Ingest / Reconcile each discovered file
    for (const file of files) {
      discoveredSourceIds.add(file.id);
      try {
        // Check for existing photo by source_file_id in this gallery
        const existingPhoto = await prisma.photo.findFirst({
          where: {
            studio_id: studioId,
            gallery_id: galleryId,
            source_file_id: file.id,
          },
        });

        const fileModifiedTime = new Date(file.lastModified).getTime();
        const fileSizeBytes = file.sizeBytes || 0;

        // Check if file is already up to date
        if (existingPhoto) {
          const localModTime = existingPhoto.source_modified_at ? existingPhoto.source_modified_at.getTime() : 0;
          const localSize = Number(existingPhoto.file_size);

          if (localModTime >= fileModifiedTime && localSize === fileSizeBytes && existingPhoto.processing_status === ProcessingStatus.COMPLETED) {
            filesSkipped++;
            continue;
          }
          console.log(`[StorageSync] Detected modification for file "${file.name}" (Remote: ${fileModifiedTime}, Local: ${localModTime})`);
        }

        console.log(`[StorageSync] Ingesting file "${file.name}" (${fileSizeBytes} bytes) in mode: ${connection.storage_mode}`);

        if (connection.storage_mode === StorageMode.IMPORT) {
          // --- MODE A: IMPORT TO PLATFORM ---
          // 1. Download buffer from external cloud
          let fileBuffer: Buffer | null = await provider.download(file.id);
          bytesTransferred += fileBuffer.length;

          // 2. Upload to platform storage
          const uploadResult = await platformStorage.upload({
            studioId,
            galleryId,
            category: 'originals',
            filename: file.name,
            mimeType: file.mimeType,
            buffer: fileBuffer,
          });

          // Free fileBuffer
          fileBuffer = null;

          // 3. Create or update Photo record
          let photoRecord;
          if (existingPhoto) {
            // Invalidate stale face detections on modification
            await prisma.faceDetection.deleteMany({
              where: { photo_id: existingPhoto.id },
            }).catch(() => null);

            photoRecord = await prisma.photo.update({
              where: { id: existingPhoto.id },
              data: {
                storage_path: uploadResult.storagePath,
                original_url: uploadResult.url,
                file_size: BigInt(fileSizeBytes),
                source_modified_at: new Date(file.lastModified),
                source_status: 'ACTIVE',
                processing_status: ProcessingStatus.PENDING,
                is_face_indexed: false,
                face_count: 0,
              },
            });
          } else {
            photoRecord = await prisma.photo.create({
              data: {
                studio_id: studioId,
                gallery_id: galleryId,
                storage_provider: StorageProviderType.PLATFORM,
                storage_path: uploadResult.storagePath,
                original_url: uploadResult.url,
                original_filename: file.name,
                file_size: BigInt(fileSizeBytes),
                mime_type: file.mimeType,
                processing_status: ProcessingStatus.PENDING,
                source_provider: connection.provider,
                source_file_id: file.id,
                source_path: file.path,
                source_modified_at: new Date(file.lastModified),
                source_status: 'ACTIVE',
                storage_connection_id: connection.id,
              },
            });
          }

          // 4. Create ProcessingJob and enqueue to BullMQ
          await prisma.processingJob.create({
            data: {
              studio_id: studioId,
              gallery_id: galleryId,
              photo_id: photoRecord.id,
              job_type: 'THUMBNAIL_GENERATION',
              status: ProcessingStatus.PENDING,
              progress: 0,
            },
          });

          await dispatchPhotoProcessing({
            photoId: photoRecord.id,
            studioId,
            galleryId,
            storagePath: uploadResult.storagePath,
          });

          filesImported++;
        } else {
          // --- MODE B: CONNECTED STORAGE (Ephemeral processing) ---
          // 1. Download buffer ephemerally into memory for Sharp & InsightFace
          let fileBuffer: Buffer | null = await provider.download(file.id);
          bytesTransferred += fileBuffer.length;

          // 2. Extract metadata and generate thumbnails
          const { metadata, sm, md, lg } = await MediaService.extractMetadataAndThumbnails(fileBuffer);

          // Ephemeral cleanup: Release original file buffer immediately after thumbnail extraction
          fileBuffer = null;

          // 3. Store thumbnails on platform storage for instant grid browsing
          const [smUpload, mdUpload, lgUpload] = await Promise.all([
            platformStorage.upload({
              studioId,
              galleryId,
              category: 'thumbnails/sm',
              filename: `${file.id}_sm.webp`,
              mimeType: 'image/webp',
              buffer: sm,
            }),
            platformStorage.upload({
              studioId,
              galleryId,
              category: 'thumbnails/md',
              filename: `${file.id}_md.webp`,
              mimeType: 'image/webp',
              buffer: md,
            }),
            platformStorage.upload({
              studioId,
              galleryId,
              category: 'thumbnails/lg',
              filename: `${file.id}_lg.webp`,
              mimeType: 'image/webp',
              buffer: lg,
            }),
          ]);

          // 4. Create or update Photo record pointing to external provider
          let photoRecord;
          if (existingPhoto) {
            // Invalidate stale face detections on modification
            await prisma.faceDetection.deleteMany({
              where: { photo_id: existingPhoto.id },
            }).catch(() => null);

            photoRecord = await prisma.photo.update({
              where: { id: existingPhoto.id },
              data: {
                storage_provider: connection.provider,
                storage_path: file.id,
                original_url: file.thumbnailUrl || file.downloadUrl || '',
                thumbnail_url: mdUpload.url,
                width: metadata.width,
                height: metadata.height,
                file_size: BigInt(fileSizeBytes),
                mime_type: file.mimeType,
                source_modified_at: new Date(file.lastModified),
                source_status: 'ACTIVE',
                processing_status: ProcessingStatus.COMPLETED,
                is_face_indexed: false,
                face_count: 0,
              },
            });
          } else {
            photoRecord = await prisma.photo.create({
              data: {
                studio_id: studioId,
                gallery_id: galleryId,
                storage_provider: connection.provider,
                storage_path: file.id,
                original_url: file.thumbnailUrl || file.downloadUrl || '',
                thumbnail_url: mdUpload.url,
                original_filename: file.name,
                file_size: BigInt(fileSizeBytes),
                mime_type: file.mimeType,
                width: metadata.width,
                height: metadata.height,
                processing_status: ProcessingStatus.COMPLETED,
                source_provider: connection.provider,
                source_file_id: file.id,
                source_path: file.path,
                source_modified_at: new Date(file.lastModified),
                source_status: 'ACTIVE',
                storage_connection_id: connection.id,
              },
            });
          }

          // 5. Upsert PhotoVersion records
          await prisma.$transaction([
            prisma.photoVersion.upsert({
              where: {
                photo_id_version_type: {
                  photo_id: photoRecord.id,
                  version_type: PhotoVersionType.THUMBNAIL_SM,
                },
              },
              create: {
                photo_id: photoRecord.id,
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
            prisma.photoVersion.upsert({
              where: {
                photo_id_version_type: {
                  photo_id: photoRecord.id,
                  version_type: PhotoVersionType.THUMBNAIL_MD,
                },
              },
              create: {
                photo_id: photoRecord.id,
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
            prisma.photoVersion.upsert({
              where: {
                photo_id_version_type: {
                  photo_id: photoRecord.id,
                  version_type: PhotoVersionType.THUMBNAIL_LG,
                },
              },
              create: {
                photo_id: photoRecord.id,
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
          ]);

          // Update gallery cover photo if unset
          const gallery = await prisma.gallery.findUnique({ where: { id: galleryId } });
          if (gallery && !gallery.cover_photo_url) {
            await prisma.gallery.update({
              where: { id: galleryId },
              data: { cover_photo_url: mdUpload.url },
            }).catch(() => null);
          }

          // 6. Dispatch AI face indexing using the external provider storage
          if (!gallery || gallery.enable_ai_face_search !== false) {
            await dispatchFaceIndexing({
              photoId: photoRecord.id,
              studioId,
              galleryId,
              storagePath: file.id,
            }).catch((queueErr) => {
              console.warn(`[StorageSync] Face indexing auto-dispatch failed: ${queueErr.message}`);
            });
          }

          filesImported++;
        }
      } catch (fileErr: any) {
        console.error(`[StorageSync] ❌ Failed to ingest file ${file.name}:`, fileErr.message);
        filesFailed++;
      }
    }

    // 6. External Deletion Reconciliation (Grace Period)
    // Identify photos previously synced from this connection that are now missing from remote folder
    const previouslySynced = await prisma.photo.findMany({
      where: {
        studio_id: studioId,
        gallery_id: galleryId,
        storage_connection_id: connection.id,
        source_status: 'ACTIVE',
      },
      select: { id: true, source_file_id: true, updated_at: true },
    });

    const gracePeriodDays = parseInt(process.env.SYNC_GRACE_PERIOD_DAYS || '14', 10);
    const graceThreshold = new Date(Date.now() - gracePeriodDays * 24 * 60 * 60 * 1000);

    for (const prev of previouslySynced) {
      if (prev.source_file_id && !discoveredSourceIds.has(prev.source_file_id)) {
        console.warn(`[StorageSync] Photo ${prev.id} (Source: ${prev.source_file_id}) missing from remote folder. Marking SOURCE_MISSING (Grace period: ${gracePeriodDays} days).`);
        await prisma.photo.update({
          where: { id: prev.id },
          data: { source_status: 'SOURCE_MISSING' },
        });
      }
    }

    // 7. Update Connection metadata and usage quota
    let usageBytes = connection.storage_used_bytes;
    try {
      const usage = await provider.getStorageUsage();
      usageBytes = BigInt(usage.usedBytes);
    } catch {
      // Ignore if provider doesn't support quota
    }

    await prisma.storageConnection.update({
      where: { id: connectionId },
      data: {
        last_sync_at: new Date(),
        last_successful_sync_at: new Date(),
        storage_used_bytes: usageBytes,
        status: StorageConnectionStatus.ACTIVE,
      },
    });

    // 8. Mark SyncJob as COMPLETED
    await prisma.storageSyncJob.update({
      where: { id: jobId },
      data: {
        status: StorageSyncStatus.COMPLETED,
        files_discovered: filesDiscovered,
        files_imported: filesImported,
        files_skipped: filesSkipped,
        files_failed: filesFailed,
        current_cursor: nextCursor,
        completed_at: new Date(),
      },
    });

    // 9. Structured Audit Logging (Zero secrets)
    await prisma.auditLog.create({
      data: {
        studio_id: studioId,
        action: 'STORAGE_SYNC_COMPLETED',
        resource_type: 'STORAGE_CONNECTION',
        resource_id: connectionId,
        metadata: {
          jobId,
          galleryId,
          provider: connection.provider,
          storageMode: connection.storage_mode,
          filesDiscovered,
          filesImported,
          filesSkipped,
          filesFailed,
          bytesTransferred,
        },
      },
    }).catch(() => null);

    console.log(`[StorageSync] ✅ Successfully finished sync job ${jobId}: ${filesImported} imported, ${filesSkipped} skipped, ${filesFailed} failed.`);

    return {
      success: true,
      jobId,
      filesDiscovered,
      filesImported,
      filesSkipped,
      filesFailed,
      bytesTransferred,
    };
  } catch (err: any) {
    console.error(`[StorageSync] ❌ Sync job ${jobId} failed:`, err.message);

    await prisma.storageSyncJob.update({
      where: { id: jobId },
      data: {
        status: StorageSyncStatus.FAILED,
        error_message: err.message,
        files_discovered: filesDiscovered,
        files_imported: filesImported,
        files_skipped: filesSkipped,
        files_failed: filesFailed,
        completed_at: new Date(),
      },
    }).catch(() => null);

    await prisma.auditLog.create({
      data: {
        studio_id: studioId,
        action: 'STORAGE_SYNC_FAILED',
        resource_type: 'STORAGE_CONNECTION',
        resource_id: connectionId,
        metadata: {
          jobId,
          galleryId,
          provider: connection.provider,
          error: err.message,
        },
      },
    }).catch(() => null);

    return {
      success: false,
      jobId,
      filesDiscovered,
      filesImported,
      filesSkipped,
      filesFailed,
      bytesTransferred,
      error: err.message,
    };
  }
}
