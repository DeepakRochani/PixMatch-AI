import fs from 'fs/promises';
import path from 'path';
import mime from 'mime-types';
import {
  StorageProviderType,
  StorageFolderItem,
  StorageFileItem,
  StorageFileListResult,
  StorageMode,
} from '@pixmatch/types';

export * from './media.service.js';
export * from './encryption.js';
export * from './ssrf.js';
export * from './providers/google-drive.provider.js';
export * from './providers/dropbox.provider.js';
export * from './providers/onedrive.provider.js';
export * from './providers/s3.provider.js';
export * from './providers/external-url.provider.js';

import { GoogleDriveProvider, GoogleDriveConfig } from './providers/google-drive.provider.js';
import { DropboxProvider, DropboxConfig } from './providers/dropbox.provider.js';
import { OneDriveProvider, OneDriveConfig } from './providers/onedrive.provider.js';
import { S3Provider, S3ProviderConfig } from './providers/s3.provider.js';
import { ExternalUrlProvider, ExternalUrlProviderConfig } from './providers/external-url.provider.js';

export interface StorageFileMetadata {
  path: string;
  sizeBytes: number;
  mimeType: string;
  lastModified: Date;
  etag?: string;
  width?: number;
  height?: number;
}

export interface UploadOptions {
  studioId: string;
  galleryId: string;
  category?: 'originals' | 'thumbnails/sm' | 'thumbnails/md' | 'thumbnails/lg' | string;
  filename: string;
  mimeType: string;
  buffer: Buffer;
  isPublic?: boolean;
}

export interface StorageConnectionTestResult {
  success: boolean;
  message: string;
  provider: StorageProviderType;
  latencyMs?: number;
}

export interface StorageSyncResult {
  syncedFiles: number;
  totalBytes: number;
  errors: string[];
}

export interface ListFilesOptions {
  pageSize?: number;
  cursor?: string;
  recursive?: boolean;
}

export interface StorageSyncOptions {
  folderId?: string;
  cursor?: string;
  galleryId?: string;
  studioId?: string;
  storageMode?: StorageMode;
}

export interface StorageProvider {
  readonly providerType: StorageProviderType;
  upload(options: UploadOptions): Promise<{ storagePath: string; url: string; sizeBytes: number }>;
  download(storagePath: string): Promise<Buffer>;
  listFiles(prefix?: string): Promise<StorageFileMetadata[]>;
  getMetadata(storagePath: string): Promise<StorageFileMetadata | null>;
  generateSignedUrl(storagePath: string, expiresInSeconds?: number): Promise<string>;
  delete(storagePath: string): Promise<boolean>;
  deleteDirectory?(relativeDir: string): Promise<boolean>;
  sync(options?: StorageSyncOptions): Promise<StorageSyncResult>;
  testConnection(): Promise<StorageConnectionTestResult>;
  browseFolders?(parentFolderId?: string): Promise<StorageFolderItem[]>;
  listFolderFiles?(folderId?: string, options?: ListFilesOptions): Promise<StorageFileListResult>;
  getStorageUsage?(): Promise<{ usedBytes: number; totalBytes?: number }>;
  disconnect?(): Promise<void>;
}

// -------------------------------------------------------------
// 1. PLATFORM STORAGE PROVIDER (OPERATIONAL LOCAL/PLATFORM DISK)
// -------------------------------------------------------------
export class PlatformStorageProvider implements StorageProvider {
  readonly providerType = StorageProviderType.PLATFORM;
  private baseDir: string;
  private baseUrl: string;

  constructor(
    baseDir = process.env.STORAGE_ROOT || './uploads',
    baseUrl = process.env.STORAGE_BASE_URL || 'http://localhost:4000/uploads'
  ) {
    this.baseDir = path.resolve(process.cwd(), baseDir);
    this.baseUrl = baseUrl.replace(/\/$/, '');
  }

  private getSafePath(relativePath: string): string {
    // Prevent path traversal
    const normalized = path.normalize(relativePath).replace(/^(\.\.(\/|\\|$))+/, '');
    const resolved = path.resolve(this.baseDir, normalized);
    if (!resolved.startsWith(this.baseDir)) {
      throw new Error(`Security Violation: Path traversal attempt detected for '${relativePath}'`);
    }
    return resolved;
  }

  private async ensureDirectory(dirPath: string) {
    try {
      await fs.mkdir(dirPath, { recursive: true });
    } catch {
      // Directory exists
    }
  }

  async upload(options: UploadOptions): Promise<{ storagePath: string; url: string; sizeBytes: number }> {
    const cleanStudio = options.studioId.replace(/[^a-zA-Z0-9_-]/g, '_');
    const cleanGallery = options.galleryId.replace(/[^a-zA-Z0-9_-]/g, '_');
    const cleanCategory = (options.category || 'originals').replace(/[^a-zA-Z0-9_/-]/g, '_');
    const cleanFilename = options.filename.replace(/[^a-zA-Z0-9._-]/g, '_');

    const relativePath = path.join('studios', cleanStudio, 'galleries', cleanGallery, cleanCategory, cleanFilename);
    const absolutePath = this.getSafePath(relativePath);

    await this.ensureDirectory(path.dirname(absolutePath));
    await fs.writeFile(absolutePath, options.buffer);

    const sizeBytes = options.buffer.length;
    const normalizedStoragePath = relativePath.replace(/\\/g, '/');
    const url = `${this.baseUrl}/${normalizedStoragePath}`;

    return {
      storagePath: normalizedStoragePath,
      url,
      sizeBytes,
    };
  }

  async download(storagePath: string): Promise<Buffer> {
    const absolutePath = this.getSafePath(storagePath);
    return await fs.readFile(absolutePath);
  }

  async listFiles(prefix = ''): Promise<StorageFileMetadata[]> {
    const targetDir = this.getSafePath(prefix);
    try {
      const entries = await fs.readdir(targetDir, { withFileTypes: true, recursive: true });
      const results: StorageFileMetadata[] = [];

      for (const entry of entries) {
        if (entry.isFile()) {
          const fullPath = path.join(entry.parentPath || targetDir, entry.name);
          const relativePath = path.relative(this.baseDir, fullPath).replace(/\\/g, '/');
          const stat = await fs.stat(fullPath);
          const mimeType = (mime.lookup(entry.name) as string) || 'application/octet-stream';

          results.push({
            path: relativePath,
            sizeBytes: stat.size,
            mimeType,
            lastModified: stat.mtime,
          });
        }
      }
      return results;
    } catch {
      return [];
    }
  }

  async getMetadata(storagePath: string): Promise<StorageFileMetadata | null> {
    try {
      const absolutePath = this.getSafePath(storagePath);
      const stat = await fs.stat(absolutePath);
      const mimeType = (mime.lookup(storagePath) as string) || 'application/octet-stream';
      return {
        path: storagePath,
        sizeBytes: stat.size,
        mimeType,
        lastModified: stat.mtime,
      };
    } catch {
      return null;
    }
  }

  async generateSignedUrl(storagePath: string, expiresInSeconds = 900): Promise<string> {
    const safeExpiresIn = Math.min(Math.max(expiresInSeconds, 60), 3600);
    const expires = Math.floor(Date.now() / 1000) + safeExpiresIn;
    const cleanPath = storagePath.replace(/\\/g, '/').replace(/^\/+/, '');
    return `${this.baseUrl}/${cleanPath}?expires=${expires}&sig=local_sig_${expires}`;
  }

  async delete(storagePath: string): Promise<boolean> {
    try {
      const absolutePath = this.getSafePath(storagePath);
      await fs.unlink(absolutePath);
      return true;
    } catch {
      return false;
    }
  }

  async deleteDirectory(relativeDir: string): Promise<boolean> {
    try {
      const absolutePath = this.getSafePath(relativeDir);
      await fs.rm(absolutePath, { recursive: true, force: true });
      return true;
    } catch {
      return false;
    }
  }

  async browseFolders(parentFolderId = ''): Promise<StorageFolderItem[]> {
    const targetDir = this.getSafePath(parentFolderId);
    try {
      const entries = await fs.readdir(targetDir, { withFileTypes: true });
      const folders: StorageFolderItem[] = [];

      for (const entry of entries) {
        if (entry.isDirectory()) {
          const relPath = path.join(parentFolderId, entry.name).replace(/\\/g, '/');
          folders.push({
            id: relPath,
            name: entry.name,
            path: relPath,
            parentId: parentFolderId || null,
            hasChildren: true,
          });
        }
      }
      return folders;
    } catch {
      return [];
    }
  }

  async listFolderFiles(folderId = '', options: ListFilesOptions = {}): Promise<StorageFileListResult> {
    const targetDir = this.getSafePath(folderId);
    try {
      const entries = await fs.readdir(targetDir, { withFileTypes: true });
      const files: StorageFileItem[] = [];

      for (const entry of entries) {
        if (entry.isFile()) {
          const fullPath = path.join(targetDir, entry.name);
          const relPath = path.relative(this.baseDir, fullPath).replace(/\\/g, '/');
          const stat = await fs.stat(fullPath);
          const mimeType = (mime.lookup(entry.name) as string) || 'image/jpeg';

          files.push({
            id: relPath,
            name: entry.name,
            path: relPath,
            sizeBytes: stat.size,
            mimeType,
            lastModified: stat.mtime,
            downloadUrl: `${this.baseUrl}/${relPath}`,
          });
        }
      }

      return {
        files: files.slice(0, options.pageSize || 100),
        nextCursor: null,
        hasMore: false,
      };
    } catch {
      return { files: [], nextCursor: null, hasMore: false };
    }
  }

  async getStorageUsage(): Promise<{ usedBytes: number; totalBytes?: number }> {
    const files = await this.listFiles('');
    const usedBytes = files.reduce((acc, curr) => acc + curr.sizeBytes, 0);
    return {
      usedBytes,
      totalBytes: 50 * 1024 * 1024 * 1024, // 50 GB default local platform quota
    };
  }

  async sync(_options: StorageSyncOptions = {}): Promise<StorageSyncResult> {
    const files = await this.listFiles('');
    const totalBytes = files.reduce((acc, curr) => acc + curr.sizeBytes, 0);
    return {
      syncedFiles: files.length,
      totalBytes,
      errors: [],
    };
  }

  async testConnection(): Promise<StorageConnectionTestResult> {
    const startTime = Date.now();
    try {
      await this.ensureDirectory(this.baseDir);
      const testFile = path.join(this.baseDir, '.connection-test');
      await fs.writeFile(testFile, 'pixmatch-test');
      await fs.unlink(testFile);
      return {
        success: true,
        message: 'Platform storage filesystem write and read operational.',
        provider: this.providerType,
        latencyMs: Date.now() - startTime,
      };
    } catch (err: unknown) {
      return {
        success: false,
        message: `Platform storage error: ${err instanceof Error ? err.message : String(err)}`,
        provider: this.providerType,
        latencyMs: Date.now() - startTime,
      };
    }
  }
}

// -------------------------------------------------------------
// 2. CANONICAL STORAGE SERVICE FACTORY
// -------------------------------------------------------------
export class StorageService {
  private static defaultPlatformProvider: PlatformStorageProvider;

  static getProvider(
    providerType: StorageProviderType = StorageProviderType.PLATFORM,
    config?: Record<string, unknown>
  ): StorageProvider {
    switch (providerType) {
      case StorageProviderType.PLATFORM:
        if (!this.defaultPlatformProvider) {
          this.defaultPlatformProvider = new PlatformStorageProvider();
        }
        return this.defaultPlatformProvider;
      case StorageProviderType.GOOGLE_DRIVE:
        return new GoogleDriveProvider((config || {}) as GoogleDriveConfig);
      case StorageProviderType.DROPBOX:
        return new DropboxProvider((config || {}) as DropboxConfig);
      case StorageProviderType.ONEDRIVE:
        return new OneDriveProvider((config || {}) as OneDriveConfig);
      case StorageProviderType.S3:
        return new S3Provider({
          ...((config || {}) as unknown as S3ProviderConfig),
          providerType: StorageProviderType.S3,
        });
      case StorageProviderType.CLOUDFLARE_R2:
        return new S3Provider({
          ...((config || {}) as unknown as S3ProviderConfig),
          providerType: StorageProviderType.CLOUDFLARE_R2,
        });
      case StorageProviderType.GENERIC_S3:
        return new S3Provider({
          ...((config || {}) as unknown as S3ProviderConfig),
          providerType: StorageProviderType.GENERIC_S3,
        });
      case StorageProviderType.EXTERNAL_URL:
        return new ExternalUrlProvider((config || {}) as unknown as ExternalUrlProviderConfig);
      default:
        return new PlatformStorageProvider();
    }
  }
}
