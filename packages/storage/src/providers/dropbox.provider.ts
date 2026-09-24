import { StorageProviderType, StorageFolderItem, StorageFileItem, StorageFileListResult } from '@pixmatch/types';
import mime from 'mime-types';
import path from 'path';
import {
  StorageProvider,
  UploadOptions,
  StorageFileMetadata,
  StorageConnectionTestResult,
  StorageSyncResult,
  ListFilesOptions,
  StorageSyncOptions,
} from '../index.js';

export interface DropboxConfig {
  accessToken?: string;
  refreshToken?: string;
  clientId?: string;
  clientSecret?: string;
  redirectUri?: string;
  rootPath?: string;
}

export class DropboxProvider implements StorageProvider {
  readonly providerType = StorageProviderType.DROPBOX;
  private accessToken: string;
  private refreshToken?: string;
  private clientId?: string;
  private clientSecret?: string;
  private redirectUri?: string;
  private rootPath: string;

  private static readonly SUPPORTED_EXTENSIONS = new Set(['.jpg', '.jpeg', '.png', '.webp', '.heic', '.tif', '.tiff', '.avif']);

  constructor(config: DropboxConfig = {}) {
    this.accessToken = config.accessToken || '';
    this.refreshToken = config.refreshToken;
    this.clientId = config.clientId || process.env.DROPBOX_CLIENT_ID;
    this.clientSecret = config.clientSecret || process.env.DROPBOX_CLIENT_SECRET;
    this.redirectUri = config.redirectUri || process.env.DROPBOX_REDIRECT_URI;
    this.rootPath = config.rootPath ? (config.rootPath === '/' ? '' : config.rootPath) : '';
  }

  // ==========================================
  // OAUTH HELPERS
  // ==========================================

  static getAuthUrl(clientIdOrOpts: string | { clientId: string; redirectUri: string; state: string }, redirectUri?: string, state?: string): string {
    const clientId = typeof clientIdOrOpts === 'object' ? clientIdOrOpts.clientId : clientIdOrOpts;
    const uri = typeof clientIdOrOpts === 'object' ? clientIdOrOpts.redirectUri : redirectUri!;
    const st = typeof clientIdOrOpts === 'object' ? clientIdOrOpts.state : state!;

    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: uri,
      response_type: 'code',
      token_access_type: 'offline',
      state: st,
    });

    return `https://www.dropbox.com/oauth2/authorize?${params.toString()}`;
  }

  static getAuthorizationUrl = DropboxProvider.getAuthUrl;

  static async exchangeCodeForTokens(
    clientIdOrOpts: string | { clientId: string; clientSecret: string; redirectUri: string; code: string },
    clientSecret?: string,
    redirectUri?: string,
    code?: string
  ): Promise<{
    accessToken: string;
    refreshToken?: string;
    expiresIn: number;
    accountEmail?: string;
    accountId?: string;
  }> {
    const cId = typeof clientIdOrOpts === 'object' ? clientIdOrOpts.clientId : clientIdOrOpts;
    const cSec = typeof clientIdOrOpts === 'object' ? clientIdOrOpts.clientSecret : clientSecret!;
    const rUri = typeof clientIdOrOpts === 'object' ? clientIdOrOpts.redirectUri : redirectUri!;
    const authCode = typeof clientIdOrOpts === 'object' ? clientIdOrOpts.code : code!;

    const params = new URLSearchParams({
      code: authCode,
      grant_type: 'authorization_code',
      client_id: cId,
      client_secret: cSec,
      redirect_uri: rUri,
    });

    const response = await fetch('https://api.dropboxapi.com/oauth2/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: params.toString(),
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`Dropbox OAuth Token Exchange Failed (${response.status}): ${errText}`);
    }

    const data: any = await response.json();
    const accessToken = data.access_token;
    const refreshToken = data.refresh_token;
    const expiresIn = data.expires_in;

    let accountEmail: string | undefined;
    let accountId: string | undefined;

    try {
      const accRes = await fetch('https://api.dropboxapi.com/2/users/get_current_account', {
        method: 'POST',
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (accRes.ok) {
        const accData: any = await accRes.json();
        accountEmail = accData.email;
        accountId = accData.account_id;
      }
    } catch {
      // Non-fatal
    }

    return {
      accessToken,
      refreshToken,
      expiresIn,
      accountEmail,
      accountId,
    };
  }

  async refreshAccessToken(): Promise<string> {
    if (!this.refreshToken || !this.clientId || !this.clientSecret) {
      throw new Error('Cannot refresh Dropbox token: missing refresh token or client credentials');
    }

    const params = new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: this.refreshToken,
      client_id: this.clientId,
      client_secret: this.clientSecret,
    });

    const response = await fetch('https://api.dropboxapi.com/oauth2/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: params.toString(),
    });

    if (!response.ok) {
      throw new Error(`Dropbox token refresh failed with status ${response.status}`);
    }

    const data: any = await response.json();
    this.accessToken = data.access_token;
    return this.accessToken;
  }

  private async sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  private async fetchWithAuth(url: string, init?: RequestInit, retryCount = 0): Promise<Response> {
    if (!this.accessToken) {
      throw new Error('Dropbox Provider: No access token configured');
    }

    // SSRF Validation
    const { validateSafeUrl, ALLOWED_STORAGE_DOMAINS } = await import('../ssrf.js');
    const urlValidation = validateSafeUrl(url, { allowedDomains: ALLOWED_STORAGE_DOMAINS });
    if (!urlValidation.valid) {
      throw new Error(`Dropbox Provider SSRF Blocked: ${urlValidation.reason}`);
    }

    let response = await fetch(url, {
      ...init,
      headers: {
        ...init?.headers,
        Authorization: `Bearer ${this.accessToken}`,
      },
    });

    // 429 Rate Limiting with Exponential Jitter Backoff
    if (response.status === 429 && retryCount < 3) {
      const retryAfterHeader = response.headers.get('Retry-After');
      const retrySeconds = retryAfterHeader ? parseInt(retryAfterHeader, 10) : 0;
      const delayMs = retrySeconds > 0 ? retrySeconds * 1000 : Math.min(1000 * Math.pow(2, retryCount) + Math.random() * 500, 10000);
      console.warn(`[DropboxProvider] Rate limited (429). Backing off for ${delayMs}ms (Attempt ${retryCount + 1}/3)...`);
      await this.sleep(delayMs);
      return this.fetchWithAuth(url, init, retryCount + 1);
    }

    if (response.status === 401 && this.refreshToken && retryCount === 0) {
      try {
        await this.refreshAccessToken();
        return this.fetchWithAuth(url, init, retryCount + 1);
      } catch {
        // Fallback
      }
    }

    return response;
  }

  // ==========================================
  // FOLDER & FILE BROWSING
  // ==========================================

  async browseFolders(parentPath = this.rootPath): Promise<StorageFolderItem[]> {
    const safePath = parentPath === '/' || !parentPath ? '' : parentPath;
    const body = {
      path: safePath,
      recursive: false,
      include_non_downloadable_files: false,
    };

    const res = await this.fetchWithAuth('https://api.dropboxapi.com/2/files/list_folder', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const err = await res.text();
      throw new Error(`Failed to browse Dropbox folders: ${err}`);
    }

    const data: any = await res.json();
    const entries = data.entries || [];

    return entries
      .filter((e: any) => e['.tag'] === 'folder')
      .map((f: any) => ({
        id: f.id,
        name: f.name,
        path: f.path_lower || f.path_display,
        parentId: safePath || null,
        hasChildren: true,
      }));
  }

  async listFolderFiles(folderPath = this.rootPath, options: ListFilesOptions = {}): Promise<StorageFileListResult> {
    const safePath = folderPath === '/' || !folderPath ? '' : folderPath;
    let allFiles: StorageFileItem[] = [];
    let currentCursor: string | null = options.cursor || null;
    let hasMorePages = false;
    let pageCount = 0;
    const maxPages = options.cursor ? 1 : 10;

    do {
      pageCount++;
      let url = 'https://api.dropboxapi.com/2/files/list_folder';
      let body: any = {
        path: safePath,
        recursive: false,
        limit: options.pageSize || 100,
      };

      if (currentCursor) {
        url = 'https://api.dropboxapi.com/2/files/list_folder/continue';
        body = { cursor: currentCursor };
      }

      const res = await this.fetchWithAuth(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const err = await res.text();
        throw new Error(`Failed to list Dropbox files: ${err}`);
      }

      const data: any = await res.json();
      const entries = data.entries || [];

      const pageFiles: StorageFileItem[] = entries
        .filter((e: any) => {
          if (e['.tag'] !== 'file') return false;
          const ext = path.extname(e.name || '').toLowerCase();
          return DropboxProvider.SUPPORTED_EXTENSIONS.has(ext);
        })
        .map((f: any) => ({
          id: f.id,
          name: f.name,
          path: f.path_lower || f.path_display,
          sizeBytes: f.size || 0,
          mimeType: (mime.lookup(f.name) as string) || 'image/jpeg',
          lastModified: new Date(f.server_modified || f.client_modified || Date.now()),
        }));

      allFiles = allFiles.concat(pageFiles);
      currentCursor = data.cursor || null;
      hasMorePages = Boolean(data.has_more);
    } while (hasMorePages && pageCount < maxPages && !options.cursor);

    return {
      files: allFiles,
      nextCursor: currentCursor,
      hasMore: hasMorePages,
    };
  }

  // ==========================================
  // CORE STORAGE OPERATIONS
  // ==========================================

  async upload(options: UploadOptions): Promise<{ storagePath: string; url: string; sizeBytes: number }> {
    const targetPath = `${this.rootPath}/${options.filename}`.replace(/\/+/g, '/');
    const res = await this.fetchWithAuth('https://content.dropboxapi.com/2/files/upload', {
      method: 'POST',
      headers: {
        'Dropbox-API-Arg': JSON.stringify({
          path: targetPath,
          mode: 'overwrite',
          autorename: false,
          mute: false,
        }),
        'Content-Type': 'application/octet-stream',
      },
      body: options.buffer,
    });

    if (!res.ok) {
      const err = await res.text();
      throw new Error(`Dropbox upload failed: ${err}`);
    }

    const data: any = await res.json();
    return {
      storagePath: data.path_lower || data.id,
      url: `https://www.dropbox.com/home${targetPath}`,
      sizeBytes: options.buffer.length,
    };
  }

  async download(filePathOrId: string): Promise<Buffer> {
    const res = await this.fetchWithAuth('https://content.dropboxapi.com/2/files/download', {
      method: 'POST',
      headers: {
        'Dropbox-API-Arg': JSON.stringify({
          path: filePathOrId,
        }),
      },
    });

    if (!res.ok) {
      const err = await res.text();
      throw new Error(`Dropbox download failed (${res.status}): ${err}`);
    }

    const arrayBuffer = await res.arrayBuffer();
    return Buffer.from(arrayBuffer);
  }

  async listFiles(prefix = this.rootPath): Promise<StorageFileMetadata[]> {
    const result = await this.listFolderFiles(prefix);
    return result.files.map((f) => ({
      path: f.path,
      sizeBytes: f.sizeBytes,
      mimeType: f.mimeType,
      lastModified: new Date(f.lastModified),
    }));
  }

  async getMetadata(filePathOrId: string): Promise<StorageFileMetadata | null> {
    const res = await this.fetchWithAuth('https://api.dropboxapi.com/2/files/get_metadata', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ path: filePathOrId }),
    });

    if (!res.ok) return null;
    const data: any = await res.json();
    return {
      path: data.path_lower || data.id,
      sizeBytes: data.size || 0,
      mimeType: (mime.lookup(data.name) as string) || 'image/jpeg',
      lastModified: new Date(data.server_modified || Date.now()),
      etag: data.content_hash,
    };
  }

  async generateSignedUrl(filePathOrId: string, _expiresInSeconds = 3600): Promise<string> {
    try {
      const res = await this.fetchWithAuth('https://api.dropboxapi.com/2/files/get_temporary_link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path: filePathOrId }),
      });

      if (res.ok) {
        const data: any = await res.json();
        return data.link;
      }
    } catch {
      // Fallback
    }

    return `https://www.dropbox.com/s/raw/${encodeURIComponent(filePathOrId)}`;
  }

  async delete(filePathOrId: string): Promise<boolean> {
    const res = await this.fetchWithAuth('https://api.dropboxapi.com/2/files/delete_v2', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ path: filePathOrId }),
    });

    return res.ok || res.status === 409;
  }

  async getStorageUsage(): Promise<{ usedBytes: number; totalBytes?: number }> {
    const res = await this.fetchWithAuth('https://api.dropboxapi.com/2/users/get_space_usage', {
      method: 'POST',
    });
    if (!res.ok) return { usedBytes: 0 };

    const data: any = await res.json();
    return {
      usedBytes: data.used || 0,
      totalBytes: data.allocation?.allocated || undefined,
    };
  }

  async sync(options: StorageSyncOptions = {}): Promise<StorageSyncResult> {
    const folderPath = options.folderId || this.rootPath;
    const result = await this.listFolderFiles(folderPath);
    const totalBytes = result.files.reduce((acc, curr) => acc + curr.sizeBytes, 0);

    return {
      syncedFiles: result.files.length,
      totalBytes,
      errors: [],
    };
  }

  async testConnection(): Promise<StorageConnectionTestResult> {
    const startTime = Date.now();
    try {
      if (!this.accessToken) {
        return {
          success: false,
          message: 'Dropbox connection requires an active OAuth access token.',
          provider: this.providerType,
          latencyMs: 0,
        };
      }

      const res = await this.fetchWithAuth('https://api.dropboxapi.com/2/users/get_current_account', {
        method: 'POST',
      });

      if (res.ok) {
        const acc: any = await res.json();
        return {
          success: true,
          message: `Dropbox connected successfully (${acc.email || acc.name?.display_name}).`,
          provider: this.providerType,
          latencyMs: Date.now() - startTime,
        };
      } else {
        return {
          success: false,
          message: `Dropbox connection test returned HTTP ${res.status}. Token may need refresh.`,
          provider: this.providerType,
          latencyMs: Date.now() - startTime,
        };
      }
    } catch (err: unknown) {
      return {
        success: false,
        message: `Dropbox test failed: ${err instanceof Error ? err.message : String(err)}`,
        provider: this.providerType,
        latencyMs: Date.now() - startTime,
      };
    }
  }
}
