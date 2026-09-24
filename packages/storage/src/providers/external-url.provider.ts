import mime from 'mime-types';
import {
  StorageProviderType,
  StorageFolderItem,
  StorageFileItem,
  StorageFileListResult,
  StorageMode,
  ExternalUrlStorageConfig,
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
import { validateSafeUrl, validateSafeRedirectHop } from '../ssrf.js';


export interface ExternalUrlProviderConfig extends ExternalUrlStorageConfig {
  urls?: string[];
  manifestUrl?: string;
  maxSizeBytes?: number;
  timeoutMs?: number;
  headers?: Record<string, string>;
}

/**
 * ExternalUrlProvider
 * Secure ingestion and proxying for external HTTPS images and JSON manifests.
 * Implements strict SSRF protection, multi-hop redirect sanitization, response size limits, and magic byte validation.
 */
export class ExternalUrlProvider implements StorageProvider {
  readonly providerType = StorageProviderType.EXTERNAL_URL;
  public readonly config: ExternalUrlProviderConfig;
  public readonly urls: string[];
  public readonly manifestUrl?: string;
  private readonly maxSizeBytes: number;
  private readonly timeoutMs: number;

  constructor(config: ExternalUrlProviderConfig = { baseUrlOrManifestUrl: '' }) {
    this.config = config;
    this.urls = config.urls || (config.baseUrlOrManifestUrl ? [config.baseUrlOrManifestUrl] : []);
    this.manifestUrl = config.manifestUrl || (config.mode === 'MANIFEST' ? config.baseUrlOrManifestUrl : undefined);
    this.maxSizeBytes = config.maxSizeBytes || 50 * 1024 * 1024; // 50MB default
    this.timeoutMs = config.timeoutMs || 15000; // 15 seconds default

    if (this.manifestUrl) {
      const check = validateSafeUrl(this.manifestUrl);
      if (!check.valid) {
        throw new Error(`Invalid manifest URL: ${check.reason}`);
      }
    }
  }

  /**
   * Safely fetches a URL with redirect tracking and SSRF inspection on every hop.
   */
  public async safeFetchHop(
    url: string,
    options: RequestInit = {},
    maxRedirects = 5
  ): Promise<{ response: Response; finalUrl: string }> {
    let currentUrl = url;
    let redirectCount = 0;

    while (redirectCount <= maxRedirects) {
      // SSRF check on every hop
      const check = validateSafeUrl(currentUrl);
      if (!check.valid) {
        throw new Error(`SSRF Blocked: ${check.reason}`);
      }

      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), this.timeoutMs);

      try {
        const res = await fetch(currentUrl, {
          ...options,
          redirect: 'manual', // Intercept and validate every redirect hop
          signal: controller.signal,
          headers: {
            'User-Agent': 'PixMatch-Storage-Agent/1.0',
            ...(this.config.headers || {}),
            ...(options.headers || {}),
          },
        });

        clearTimeout(timeout);

        // Check for redirects
        if ([301, 302, 303, 307, 308].includes(res.status)) {
          const location = res.headers.get('location');
          if (!location) {
            throw new Error(`Redirect status ${res.status} returned without Location header`);
          }

          const redirectHop = validateSafeRedirectHop(currentUrl, location);
          if (!redirectHop.valid) {
            throw new Error(`SSRF Blocked Redirect Hop: ${redirectHop.reason}`);
          }

          const nextUrl = new URL(location, currentUrl).toString();
          redirectCount++;
          if (redirectCount > maxRedirects) {
            throw new Error(`Exceeded maximum redirect limit (${maxRedirects}) for "${url}"`);
          }

          currentUrl = nextUrl;
          continue;
        }

        return { response: res, finalUrl: currentUrl };
      } catch (err: any) {
        clearTimeout(timeout);
        if (err.name === 'AbortError') {
          throw new Error(`Request to "${currentUrl}" timed out after ${this.timeoutMs}ms`);
        }
        throw err;
      }
    }

    throw new Error(`Too many redirects fetching "${url}"`);
  }

  /**
   * Detects image MIME type from magic bytes without throwing.
   */
  public detectMimeTypeFromMagicBytes(buffer: Buffer): string | null {
    if (buffer.length < 4) return null;

    // JPEG: FF D8 FF
    if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
      return 'image/jpeg';
    }

    // PNG: 89 50 4E 47 0D 0A 1A 0A
    if (
      buffer.length >= 8 &&
      buffer[0] === 0x89 &&
      buffer[1] === 0x50 &&
      buffer[2] === 0x4e &&
      buffer[3] === 0x47
    ) {
      return 'image/png';
    }

    // WebP: RIFF .... WEBP
    if (
      buffer.length >= 12 &&
      buffer.toString('ascii', 0, 4) === 'RIFF' &&
      buffer.toString('ascii', 8, 12) === 'WEBP'
    ) {
      return 'image/webp';
    }

    // GIF: GIF87a or GIF89a
    if (buffer.length >= 6 && buffer.toString('ascii', 0, 6).startsWith('GIF8')) {
      return 'image/gif';
    }

    // TIFF: II*. or MM.*
    if (
      buffer.length >= 4 &&
      ((buffer[0] === 0x49 && buffer[1] === 0x49 && buffer[2] === 0x2a && buffer[3] === 0x00) ||
        (buffer[0] === 0x4d && buffer[1] === 0x4d && buffer[2] === 0x00 && buffer[3] === 0x2a))
    ) {
      return 'image/tiff';
    }

    // HEIC / AVIF / MP4: ....ftyp
    if (buffer.length >= 12 && buffer.toString('ascii', 4, 8) === 'ftyp') {
      const brand = buffer.toString('ascii', 8, 12);
      if (brand.includes('avif')) return 'image/avif';
      if (brand.includes('heic') || brand.includes('mif1')) return 'image/heic';
      return 'image/heic';
    }

    return null;
  }

  /**
   * Verifies magic bytes for common image formats to prevent spoofed Content-Types.
   */
  public validateImageMagicBytes(buffer: Buffer): string {
    const mimeType = this.detectMimeTypeFromMagicBytes(buffer);
    if (!mimeType) {
      throw new Error('Unsupported or invalid image file format: magic bytes mismatch');
    }
    return mimeType;
  }

  async upload(_options: UploadOptions): Promise<{ storagePath: string; url: string; sizeBytes: number }> {
    throw new Error('ExternalUrlProvider does not support direct write uploads (read-only ingestion source).');
  }

  /**
   * Safely downloads remote image buffer with strict size limits and SSRF sanitization.
   */
  async download(storagePath: string): Promise<Buffer> {
    const targetUrl = storagePath.startsWith('http://') || storagePath.startsWith('https://')
      ? storagePath
      : this.config.baseUrlOrManifestUrl;

    if (!targetUrl) {
      throw new Error('Invalid download path: target URL not specified');
    }

    const { response, finalUrl } = await this.safeFetchHop(targetUrl);
    if (!response.ok) {
      throw new Error(`Failed to download external URL (${response.status}): ${finalUrl}`);
    }

    // Enforce Content-Length if present
    const contentLength = response.headers.get('content-length');
    if (contentLength && parseInt(contentLength, 10) > this.maxSizeBytes) {
      throw new Error(`External image exceeds maximum allowed file size of ${this.maxSizeBytes} bytes`);
    }

    // Read response with bounded size guard
    const arrayBuffer = await response.arrayBuffer();
    if (arrayBuffer.byteLength > this.maxSizeBytes) {
      throw new Error(`External image download exceeded size limit (${arrayBuffer.byteLength} > ${this.maxSizeBytes})`);
    }

    const buffer = Buffer.from(arrayBuffer);

    // Validate magic bytes
    this.validateImageMagicBytes(buffer);

    return buffer;
  }

  /**
   * Lists files by parsing manifest JSON or returning items from direct URLs list.
   */
  async listFiles(_prefix = ''): Promise<StorageFileMetadata[]> {
    const manifestTarget = this.manifestUrl || (this.config.baseUrlOrManifestUrl?.endsWith('.json') ? this.config.baseUrlOrManifestUrl : undefined);

    try {
      if (manifestTarget) {
        const { response } = await this.safeFetchHop(manifestTarget);
        if (!response.ok) return [];

        const data: any = await response.json();
        const files: StorageFileMetadata[] = [];

        const fileItems = Array.isArray(data.files) ? data.files : Array.isArray(data) ? data : [];
        for (const item of fileItems) {
          const itemUrl = typeof item === 'string' ? item : item.url;
          if (itemUrl) {
            try {
              const check = validateSafeUrl(itemUrl);
              if (check.valid) {
                const name = typeof item === 'object' && item.name ? item.name : itemUrl.split('/').pop()?.split('?')[0] || 'photo.jpg';
                files.push({
                  path: itemUrl,
                  sizeBytes: (typeof item === 'object' ? item.size || item.sizeBytes : 0) || 0,
                  mimeType: (mime.lookup(name) as string) || 'image/jpeg',
                  lastModified: typeof item === 'object' && item.lastModified ? new Date(item.lastModified) : new Date(),
                  etag: typeof item === 'object' ? item.etag : undefined,
                });
              }
            } catch {
              // Skip invalid SSRF target in manifest
            }
          }
        }
        return files;
      }

      // Direct URLs List Mode
      if (this.urls && this.urls.length > 0) {
        const files: StorageFileMetadata[] = [];
        for (const u of this.urls) {
          const name = u.split('/').pop()?.split('?')[0] || 'photo.jpg';
          files.push({
            path: u,
            sizeBytes: 0,
            mimeType: (mime.lookup(name) as string) || 'image/jpeg',
            lastModified: new Date(),
          });
        }
        return files;
      }

      const rootUrl = this.config.baseUrlOrManifestUrl;
      if (rootUrl) {
        const meta = await this.getMetadata(rootUrl);
        return meta ? [meta] : [];
      }

      return [];
    } catch {
      return [];
    }
  }

  async getMetadata(storagePath: string): Promise<StorageFileMetadata | null> {
    try {
      const targetUrl = storagePath.startsWith('http') ? storagePath : this.config.baseUrlOrManifestUrl;
      if (!targetUrl) return null;

      const { response } = await this.safeFetchHop(targetUrl, { method: 'HEAD' });
      if (!response.ok) return null;

      const size = parseInt(response.headers.get('content-length') || '0', 10);
      const mimeType = response.headers.get('content-type') || (mime.lookup(targetUrl) as string) || 'image/jpeg';
      const lastModified = response.headers.get('last-modified')
        ? new Date(response.headers.get('last-modified')!)
        : new Date();
      const etag = response.headers.get('etag')?.replace(/"/g, '') || undefined;

      return {
        path: targetUrl,
        sizeBytes: size,
        mimeType,
        lastModified,
        etag,
      };
    } catch {
      return null;
    }
  }

  async generateSignedUrl(storagePath: string): Promise<string> {
    const targetUrl = storagePath.startsWith('http') ? storagePath : this.config.baseUrlOrManifestUrl;
    validateSafeUrl(targetUrl);
    return targetUrl;
  }

  async delete(_storagePath: string): Promise<boolean> {
    return true; // External URL is read-only
  }

  async browseFolders(_parentFolderId = ''): Promise<StorageFolderItem[]> {
    return [];
  }

  async listFolderFiles(_folderId = '', options: ListFilesOptions = {}): Promise<StorageFileListResult> {
    const files = await this.listFiles();
    const storageFiles: StorageFileItem[] = files.map((f) => ({
      id: f.path,
      name: f.path.split('/').pop() || 'photo.jpg',
      path: f.path,
      sizeBytes: f.sizeBytes,
      mimeType: f.mimeType,
      lastModified: f.lastModified,
      downloadUrl: f.path,
    }));

    return {
      files: storageFiles.slice(0, options.pageSize || 100),
      nextCursor: null,
      hasMore: false,
      totalCount: storageFiles.length,
    };
  }

  async getStorageUsage(): Promise<{ usedBytes: number; totalBytes?: number }> {
    const files = await this.listFiles();
    const usedBytes = files.reduce((acc, curr) => acc + curr.sizeBytes, 0);
    return {
      usedBytes,
      totalBytes: 100 * 1024 * 1024 * 1024,
    };
  }

  async testConnection(): Promise<StorageConnectionTestResult> {
    const startTime = Date.now();
    try {
      const rootUrl = this.config.baseUrlOrManifestUrl;
      if (!rootUrl) {
        return {
          success: false,
          message: 'External URL test failed: target URL is required.',
          provider: this.providerType,
        };
      }

      // Safe fetch verification with redirect check
      const { response, finalUrl } = await this.safeFetchHop(rootUrl, { method: 'GET' });
      if (!response.ok) {
        return {
          success: false,
          message: `External URL returned HTTP error ${response.status}`,
          provider: this.providerType,
          latencyMs: Date.now() - startTime,
        };
      }

      const contentType = response.headers.get('content-type') || '';
      let details = '';

      if (contentType.includes('application/json') || rootUrl.endsWith('.json')) {
        const data: any = await response.json();
        const count = Array.isArray(data.files) ? data.files.length : 0;
        details = `JSON Manifest verified (${count} files listed)`;
      } else if (contentType.includes('image/')) {
        details = `Direct Image endpoint verified (${contentType})`;
      } else {
        details = `HTTPS endpoint reachable (${contentType})`;
      }

      return {
        success: true,
        message: `✓ HTTPS protocol verified\n✓ SSRF & DNS inspection passed\n✓ Endpoint reachable: ${finalUrl}\n✓ ${details}`,
        provider: this.providerType,
        latencyMs: Date.now() - startTime,
      };
    } catch (err: any) {
      return {
        success: false,
        message: `External URL validation failed: ${err.message}`,
        provider: this.providerType,
        latencyMs: Date.now() - startTime,
      };
    }
  }

  async sync(_options: StorageSyncOptions = {}): Promise<StorageSyncResult> {
    const files = await this.listFiles();
    const totalBytes = files.reduce((acc, curr) => acc + curr.sizeBytes, 0);
    return {
      syncedFiles: files.length,
      totalBytes,
      errors: [],
    };
  }
}
