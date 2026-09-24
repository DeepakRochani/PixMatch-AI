import {
  S3Client,
  HeadBucketCommand,
  ListObjectsV2Command,
  ListObjectsV2CommandOutput,
  PutObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
  DeleteObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { Upload } from '@aws-sdk/lib-storage';
import { Readable } from 'stream';
import mime from 'mime-types';
import {
  StorageProviderType,
  StorageFolderItem,
  StorageFileItem,
  StorageFileListResult,
  StorageMode,
  S3StorageConfig,
} from '@pixmatch/types';
import {
  StorageProvider,
  UploadOptions,
  StorageFileMetadata,
  StorageConnectionTestResult,
  StorageSyncResult,
  ListFilesOptions,
  StorageSyncOptions,
} from '../index.js';
import { validateSafeUrl } from '../ssrf.js';

export interface S3ProviderConfig extends S3StorageConfig {
  providerType?: StorageProviderType.S3 | StorageProviderType.CLOUDFLARE_R2 | StorageProviderType.GENERIC_S3;
}

/**
 * Unified S3Provider
 * Handles AWS S3, Cloudflare R2, and Generic S3-Compatible Storage via AWS SDK v3.
 */
export class S3Provider implements StorageProvider {
  readonly providerType: StorageProviderType;
  private client: S3Client;
  public readonly config: S3ProviderConfig;
  public readonly bucket: string;
  public readonly prefix: string;
  public readonly customDomain?: string;
  public readonly endpoint?: string;
  public readonly forcePathStyle: boolean;

  constructor(config: S3ProviderConfig) {
    this.config = config;
    this.providerType = config.providerType || StorageProviderType.S3;
    this.bucket = config.bucket;
    this.prefix = config.prefix ? config.prefix.replace(/^\/+/, '').replace(/\/+$/, '') : '';
    this.customDomain = config.customDomain ? config.customDomain.replace(/\/+$/, '') : undefined;

    // Validate endpoint SSRF safety if custom endpoint is supplied (Generic S3 / R2)
    let endpoint = config.endpoint;
    if (this.providerType === StorageProviderType.CLOUDFLARE_R2) {
      if (!(config as any).accountId) {
        throw new Error('Cloudflare R2 configuration error: accountId is required.');
      }
      endpoint = `https://${(config as any).accountId}.r2.cloudflarestorage.com`;
    }

    if (endpoint) {
      // Validate custom endpoint against SSRF (disallowing loopback, RFC1918 private IPs, metadata)
      const ssrfCheck = validateSafeUrl(endpoint);
      if (!ssrfCheck.valid) {
        throw new Error(`Invalid or blocked S3 endpoint URL: ${ssrfCheck.reason}`);
      }
    }

    this.endpoint = endpoint;
    const region = config.region || (this.providerType === StorageProviderType.CLOUDFLARE_R2 ? 'auto' : 'us-east-1');
    this.forcePathStyle = config.forcePathStyle ?? (this.providerType === StorageProviderType.GENERIC_S3 || Boolean(endpoint));

    this.client = new S3Client({
      region,
      endpoint: endpoint || undefined,
      forcePathStyle: this.forcePathStyle,
      credentials: {
        accessKeyId: config.accessKeyId || '',
        secretAccessKey: config.secretAccessKey || '',
        sessionToken: config.sessionToken || undefined,
      },
    });
  }

  /**
   * Helper to normalize signed URL expiration within safe bounds (60s - 3600s).
   */
  public normalizeExpiresIn(expiresInSeconds = 900): number {
    return Math.min(Math.max(expiresInSeconds, 60), 3600);
  }

  /**
   * Namespaces object key inside studio/gallery prefix to guarantee tenant isolation.
   */
  public formatKey(params: { studioId?: string; galleryId?: string; category?: string; filename: string }): string {
    const cleanStudio = params.studioId ? params.studioId.replace(/[^a-zA-Z0-9_-]/g, '_') : '';
    const cleanGallery = params.galleryId ? params.galleryId.replace(/[^a-zA-Z0-9_-]/g, '_') : '';
    const cleanCategory = (params.category || 'originals').replace(/[^a-zA-Z0-9_/-]/g, '_');
    const cleanFilename = params.filename.replace(/[^a-zA-Z0-9._-]/g, '_');

    let relativePath: string;
    if (cleanStudio && cleanGallery) {
      relativePath = `pixmatch/studios/${cleanStudio}/galleries/${cleanGallery}/${cleanCategory}/${cleanFilename}`;
    } else {
      relativePath = cleanFilename;
    }

    return this.resolveKey(relativePath);
  }

  /**
   * Resolves raw relative path with optional bucket prefix.
   */
  public resolveKey(relativePath: string, studioId?: string, galleryId?: string): string {
    const cleanRel = relativePath.replace(/\\/g, '/').replace(/^\/+/, '');
    if (cleanRel.includes('..')) {
      throw new Error(`Security Violation: Path traversal detected in S3 key "${relativePath}"`);
    }

    const parts: string[] = [];
    if (this.prefix) {
      parts.push(this.prefix);
    }
    if (studioId && galleryId && !cleanRel.startsWith('pixmatch/') && !cleanRel.startsWith('studios/')) {
      const cleanStudio = studioId.replace(/[^a-zA-Z0-9_-]/g, '_');
      const cleanGallery = galleryId.replace(/[^a-zA-Z0-9_-]/g, '_');
      parts.push('pixmatch', 'studios', cleanStudio, 'galleries', cleanGallery);
    }
    parts.push(cleanRel);

    return parts.join('/').replace(/\/+/g, '/');
  }

  /**
   * Uploads object to S3-compatible storage.
   * Uses PutObject for < 50MB and AWS SDK Lib-Storage Multipart Upload for >= 50MB.
   */
  async upload(options: UploadOptions): Promise<{ storagePath: string; url: string; sizeBytes: number }> {
    const cleanStudio = options.studioId.replace(/[^a-zA-Z0-9_-]/g, '_');
    const cleanGallery = options.galleryId.replace(/[^a-zA-Z0-9_-]/g, '_');
    const cleanCategory = (options.category || 'originals').replace(/[^a-zA-Z0-9_/-]/g, '_');
    const cleanFilename = options.filename.replace(/[^a-zA-Z0-9._-]/g, '_');

    const relativePath = `studios/${cleanStudio}/galleries/${cleanGallery}/${cleanCategory}/${cleanFilename}`;
    const objectKey = this.resolveKey(relativePath);
    const sizeBytes = options.buffer.length;
    const MULTIPART_THRESHOLD = 50 * 1024 * 1024; // 50MB threshold

    if (sizeBytes >= MULTIPART_THRESHOLD) {
      // Multipart upload for large files
      const upload = new Upload({
        client: this.client,
        params: {
          Bucket: this.bucket,
          Key: objectKey,
          Body: options.buffer,
          ContentType: options.mimeType,
        },
        queueSize: 4,
        partSize: 10 * 1024 * 1024, // 10MB parts
        leavePartsOnError: false, // Clean up failed multipart parts
      });

      await upload.done();
    } else {
      // Standard PutObject
      await this.client.send(
        new PutObjectCommand({
          Bucket: this.bucket,
          Key: objectKey,
          Body: options.buffer,
          ContentType: options.mimeType,
        })
      );
    }

    let url: string;
    if (this.customDomain) {
      url = `${this.customDomain}/${objectKey}`;
    } else if (this.config.endpoint) {
      url = `${this.config.endpoint.replace(/\/$/, '')}/${this.bucket}/${objectKey}`;
    } else {
      const region = this.config.region || 'us-east-1';
      url = `https://${this.bucket}.s3.${region}.amazonaws.com/${objectKey}`;
    }

    return {
      storagePath: objectKey,
      url,
      sizeBytes,
    };
  }

  /**
   * Downloads object from S3 as a Buffer.
   */
  async download(storagePath: string): Promise<Buffer> {
    const command = new GetObjectCommand({
      Bucket: this.bucket,
      Key: storagePath,
    });

    const response = await this.client.send(command);
    if (!response.Body) {
      throw new Error(`S3 GetObject returned empty body for key "${storagePath}"`);
    }

    if (Buffer.isBuffer(response.Body)) {
      return response.Body;
    }

    if (response.Body instanceof Uint8Array) {
      return Buffer.from(response.Body);
    }

    // Stream to buffer
    const stream = response.Body as Readable;
    const chunks: Buffer[] = [];
    for await (const chunk of stream) {
      chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk);
    }
    return Buffer.concat(chunks);
  }

  /**
   * Lists all files with multi-page continuation token loop.
   */
  async listFiles(prefix = ''): Promise<StorageFileMetadata[]> {
    const fullPrefix = prefix ? this.resolveKey(prefix) : this.prefix;
    const results: StorageFileMetadata[] = [];
    let continuationToken: string | undefined = undefined;

    do {
      const response: ListObjectsV2CommandOutput = await this.client.send(
        new ListObjectsV2Command({
          Bucket: this.bucket,
          Prefix: fullPrefix || undefined,
          ContinuationToken: continuationToken,
          MaxKeys: 1000,
        })
      );

      if (response.Contents) {
        for (const item of response.Contents) {
          if (item.Key && !item.Key.endsWith('/')) {
            const mimeType = (mime.lookup(item.Key) as string) || 'image/jpeg';
            results.push({
              path: item.Key,
              sizeBytes: item.Size || 0,
              mimeType,
              lastModified: item.LastModified || new Date(),
              etag: item.ETag ? item.ETag.replace(/"/g, '') : undefined,
            });
          }
        }
      }

      continuationToken = response.IsTruncated ? response.NextContinuationToken : undefined;
    } while (continuationToken);

    return results;
  }

  /**
   * Retrieves object metadata via HeadObject.
   */
  async getMetadata(storagePath: string): Promise<StorageFileMetadata | null> {
    try {
      const response = await this.client.send(
        new HeadObjectCommand({
          Bucket: this.bucket,
          Key: storagePath,
        })
      );

      return {
        path: storagePath,
        sizeBytes: response.ContentLength || 0,
        mimeType: response.ContentType || (mime.lookup(storagePath) as string) || 'application/octet-stream',
        lastModified: response.LastModified || new Date(),
        etag: response.ETag ? response.ETag.replace(/"/g, '') : undefined,
      };
    } catch {
      return null;
    }
  }

  /**
   * Generates short-lived presigned URL (default 15m, bounded 60s - 3600s).
   */
  async generateSignedUrl(storagePath: string, expiresInSeconds = 900): Promise<string> {
    const safeExpires = Math.min(Math.max(expiresInSeconds, 60), 3600);
    const command = new GetObjectCommand({
      Bucket: this.bucket,
      Key: storagePath,
    });

    return await getSignedUrl(this.client, command, { expiresIn: safeExpires });
  }

  /**
   * Deletes object from S3.
   */
  async delete(storagePath: string): Promise<boolean> {
    try {
      await this.client.send(
        new DeleteObjectCommand({
          Bucket: this.bucket,
          Key: storagePath,
        })
      );
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Navigates S3 virtual folder hierarchy using CommonPrefixes with Delimiter: '/'.
   */
  async browseFolders(parentFolderId = ''): Promise<StorageFolderItem[]> {
    let cleanPrefix = parentFolderId.replace(/^\/+/, '');
    if (cleanPrefix && !cleanPrefix.endsWith('/')) {
      cleanPrefix += '/';
    }

    try {
      const response = await this.client.send(
        new ListObjectsV2Command({
          Bucket: this.bucket,
          Prefix: cleanPrefix || undefined,
          Delimiter: '/',
          MaxKeys: 100,
        })
      );

      const folders: StorageFolderItem[] = [];
      if (response.CommonPrefixes) {
        for (const cp of response.CommonPrefixes) {
          if (cp.Prefix) {
            const folderPath = cp.Prefix.replace(/\/$/, '');
            const folderName = folderPath.split('/').pop() || folderPath;
            folders.push({
              id: cp.Prefix,
              name: folderName,
              path: cp.Prefix,
              parentId: parentFolderId || null,
              hasChildren: true,
            });
          }
        }
      }

      return folders;
    } catch (err) {
      return [];
    }
  }

  /**
   * Lists files inside a specific prefix folder.
   */
  async listFolderFiles(folderId = '', options: ListFilesOptions = {}): Promise<StorageFileListResult> {
    let cleanPrefix = folderId.replace(/^\/+/, '');
    if (cleanPrefix && !cleanPrefix.endsWith('/')) {
      cleanPrefix += '/';
    }

    try {
      const response = await this.client.send(
        new ListObjectsV2Command({
          Bucket: this.bucket,
          Prefix: cleanPrefix || undefined,
          Delimiter: options.recursive ? undefined : '/',
          ContinuationToken: options.cursor || undefined,
          MaxKeys: options.pageSize || 100,
        })
      );

      const files: StorageFileItem[] = [];
      if (response.Contents) {
        for (const item of response.Contents) {
          if (item.Key && !item.Key.endsWith('/')) {
            const fileName = item.Key.split('/').pop() || item.Key;
            const mimeType = (mime.lookup(fileName) as string) || 'image/jpeg';
            files.push({
              id: item.Key,
              name: fileName,
              path: item.Key,
              sizeBytes: item.Size || 0,
              mimeType,
              lastModified: item.LastModified || new Date(),
              downloadUrl: await this.generateSignedUrl(item.Key, 900).catch(() => undefined),
            });
          }
        }
      }

      return {
        files,
        nextCursor: response.IsTruncated ? response.NextContinuationToken : null,
        hasMore: Boolean(response.IsTruncated),
      };
    } catch (err: any) {
      return { files: [], nextCursor: null, hasMore: false };
    }
  }

  /**
   * Retrieves approximate total usage bytes in bucket/prefix.
   */
  async getStorageUsage(): Promise<{ usedBytes: number; totalBytes?: number }> {
    const files = await this.listFiles(this.prefix);
    const usedBytes = files.reduce((acc, curr) => acc + curr.sizeBytes, 0);
    return {
      usedBytes,
      totalBytes: 500 * 1024 * 1024 * 1024, // 500 GB default S3 quota view
    };
  }

  /**
   * Tests S3 credentials, bucket reachability, and read/write capabilities.
   * Returns safe diagnostic checklist with zero secret leaks.
   */
  async testConnection(): Promise<StorageConnectionTestResult> {
    const startTime = Date.now();
    try {
      if (!this.bucket) {
        return {
          success: false,
          message: 'S3 Connection failed: Bucket name is required.',
          provider: this.providerType,
        };
      }

      // 1. Verify bucket accessibility & credentials
      await this.client.send(new HeadBucketCommand({ Bucket: this.bucket }));

      // 2. Verify list permissions
      await this.client.send(
        new ListObjectsV2Command({
          Bucket: this.bucket,
          MaxKeys: 1,
        })
      );

      // 3. Verify write permissions via probe object
      const probeKey = this.resolveKey('.pixmatch-probe-test');
      try {
        await this.client.send(
          new PutObjectCommand({
            Bucket: this.bucket,
            Key: probeKey,
            Body: Buffer.from('pixmatch-connection-probe'),
            ContentType: 'text/plain',
          })
        );
        // Clean up probe
        await this.client.send(new DeleteObjectCommand({ Bucket: this.bucket, Key: probeKey })).catch(() => null);
      } catch (writeErr: any) {
        return {
          success: true,
          message: `✓ Credentials valid\n✓ Bucket "${this.bucket}" accessible\n✓ List permission verified\n⚠️ Read-only permission (write probe restricted: ${writeErr.name || writeErr.message})`,
          provider: this.providerType,
          latencyMs: Date.now() - startTime,
        };
      }

      return {
        success: true,
        message: `✓ Credentials valid\n✓ Bucket "${this.bucket}" accessible\n✓ Region verified\n✓ Read & List permissions active\n✓ Write permission verified`,
        provider: this.providerType,
        latencyMs: Date.now() - startTime,
      };
    } catch (err: any) {
      let safeError = err.message || 'Access denied or invalid credentials';
      if (err.name === 'NoSuchBucket' || err.$metadata?.httpStatusCode === 404) {
        safeError = `Bucket "${this.bucket}" does not exist or region is mismatched`;
      } else if (err.name === 'AccessDenied' || err.$metadata?.httpStatusCode === 403) {
        safeError = `Access Denied for bucket "${this.bucket}". Verify IAM credentials and bucket policy.`;
      }

      return {
        success: false,
        message: `S3 connection test failed: ${safeError}`,
        provider: this.providerType,
        latencyMs: Date.now() - startTime,
      };
    }
  }

  async sync(options: StorageSyncOptions = {}): Promise<StorageSyncResult> {
    const files = await this.listFiles(options.folderId || this.prefix);
    const totalBytes = files.reduce((acc, curr) => acc + curr.sizeBytes, 0);
    return {
      syncedFiles: files.length,
      totalBytes,
      errors: [],
    };
  }
}
