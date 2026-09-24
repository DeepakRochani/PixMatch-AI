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

export interface OneDriveConfig {
  accessToken?: string;
  refreshToken?: string;
  clientId?: string;
  clientSecret?: string;
  redirectUri?: string;
  rootFolderId?: string;
}

export class OneDriveProvider implements StorageProvider {
  readonly providerType = StorageProviderType.ONEDRIVE;
  private accessToken: string;
  private refreshToken?: string;
  private clientId?: string;
  private clientSecret?: string;
  private redirectUri?: string;
  private rootFolderId: string;

  private static readonly SUPPORTED_EXTENSIONS = new Set(['.jpg', '.jpeg', '.png', '.webp', '.heic', '.tif', '.tiff', '.avif']);

  constructor(config: OneDriveConfig = {}) {
    this.accessToken = config.accessToken || '';
    this.refreshToken = config.refreshToken;
    this.clientId = config.clientId || process.env.MICROSOFT_CLIENT_ID;
    this.clientSecret = config.clientSecret || process.env.MICROSOFT_CLIENT_SECRET;
    this.redirectUri = config.redirectUri || process.env.MICROSOFT_REDIRECT_URI;
    this.rootFolderId = config.rootFolderId || 'root';
  }

  // ==========================================
  // OAUTH HELPERS
  // ==========================================

  static getAuthUrl(clientIdOrOpts: string | { clientId: string; redirectUri: string; state: string }, redirectUri?: string, state?: string): string {
    const clientId = typeof clientIdOrOpts === 'object' ? clientIdOrOpts.clientId : clientIdOrOpts;
    const uri = typeof clientIdOrOpts === 'object' ? clientIdOrOpts.redirectUri : redirectUri!;
    const st = typeof clientIdOrOpts === 'object' ? clientIdOrOpts.state : state!;

    const scopes = ['Files.Read.All', 'Files.ReadWrite.All', 'User.Read', 'offline_access'].join(' ');
    const params = new URLSearchParams({
      client_id: clientId,
      response_type: 'code',
      redirect_uri: uri,
      response_mode: 'query',
      scope: scopes,
      state: st,
    });

    return `https://login.microsoftonline.com/common/oauth2/v2.0/authorize?${params.toString()}`;
  }

  static getAuthorizationUrl = OneDriveProvider.getAuthUrl;

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
      client_id: cId,
      client_secret: cSec,
      code: authCode,
      redirect_uri: rUri,
      grant_type: 'authorization_code',
    });

    const response = await fetch('https://login.microsoftonline.com/common/oauth2/v2.0/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: params.toString(),
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`Microsoft OAuth Token Exchange Failed (${response.status}): ${errText}`);
    }

    const data: any = await response.json();
    const accessToken = data.access_token;
    const refreshToken = data.refresh_token;
    const expiresIn = data.expires_in;

    let accountEmail: string | undefined;
    let accountId: string | undefined;

    try {
      const userRes = await fetch('https://graph.microsoft.com/v1.0/me', {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (userRes.ok) {
        const userData: any = await userRes.json();
        accountEmail = userData.mail || userData.userPrincipalName;
        accountId = userData.id;
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
      throw new Error('Cannot refresh OneDrive token: missing refresh token or client credentials');
    }

    const params = new URLSearchParams({
      client_id: this.clientId,
      client_secret: this.clientSecret,
      grant_type: 'refresh_token',
      refresh_token: this.refreshToken,
    });

    const response = await fetch('https://login.microsoftonline.com/common/oauth2/v2.0/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: params.toString(),
    });

    if (!response.ok) {
      throw new Error(`OneDrive token refresh failed with status ${response.status}`);
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
      throw new Error('OneDrive Provider: No access token configured');
    }

    // SSRF Validation
    const { validateSafeUrl, ALLOWED_STORAGE_DOMAINS } = await import('../ssrf.js');
    const urlValidation = validateSafeUrl(url, { allowedDomains: ALLOWED_STORAGE_DOMAINS });
    if (!urlValidation.valid) {
      throw new Error(`OneDrive Provider SSRF Blocked: ${urlValidation.reason}`);
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
      console.warn(`[OneDriveProvider] Rate limited (429). Backing off for ${delayMs}ms (Attempt ${retryCount + 1}/3)...`);
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

  async browseFolders(parentFolderId = this.rootFolderId): Promise<StorageFolderItem[]> {
    const folderPath = parentFolderId === 'root' || !parentFolderId ? 'root' : `items/${parentFolderId}`;
    const url = `https://graph.microsoft.com/v1.0/me/drive/${folderPath}/children?$filter=folder ne null&$select=id,name,parentReference`;

    const res = await this.fetchWithAuth(url);
    if (!res.ok) {
      const err = await res.text();
      throw new Error(`Failed to browse OneDrive folders: ${err}`);
    }

    const data: any = await res.json();
    const items = data.value || [];

    return items.map((f: any) => ({
      id: f.id,
      name: f.name,
      path: f.id,
      parentId: f.parentReference?.id || null,
      hasChildren: true,
    }));
  }

  async listFolderFiles(folderId = this.rootFolderId, options: ListFilesOptions = {}): Promise<StorageFileListResult> {
    const itemPath = folderId === 'root' || !folderId ? 'root' : `items/${folderId}`;
    let allFiles: StorageFileItem[] = [];
    let currentUrl: string | null = options.cursor || `https://graph.microsoft.com/v1.0/me/drive/${itemPath}/children?$top=${options.pageSize || 100}&$select=id,name,size,file,lastModifiedDateTime,@microsoft.graph.downloadUrl`;
    let nextLink: string | null = null;
    let pageCount = 0;
    const maxPages = options.cursor ? 1 : 10; // Auto-paginate up to 10 pages per sync cycle

    while (currentUrl && pageCount < maxPages) {
      pageCount++;
      const res = await this.fetchWithAuth(currentUrl);
      if (!res.ok) {
        const err = await res.text();
        throw new Error(`Failed to list OneDrive files: ${err}`);
      }

      const data: any = await res.json();
      const items = data.value || [];

      const pageFiles: StorageFileItem[] = items
        .filter((item: any) => {
          if (!item.file) return false;
          const ext = path.extname(item.name || '').toLowerCase();
          return OneDriveProvider.SUPPORTED_EXTENSIONS.has(ext);
        })
        .map((item: any) => ({
          id: item.id,
          name: item.name,
          path: item.id,
          sizeBytes: item.size || 0,
          mimeType: item.file?.mimeType || (mime.lookup(item.name) as string) || 'image/jpeg',
          lastModified: new Date(item.lastModifiedDateTime || Date.now()),
          downloadUrl: item['@microsoft.graph.downloadUrl'],
        }));

      allFiles = allFiles.concat(pageFiles);
      nextLink = data['@odata.nextLink'] || null;

      if (options.cursor) {
        // If cursor was explicitly provided, do not auto-paginate further
        break;
      }
      currentUrl = nextLink;
    }

    return {
      files: allFiles,
      nextCursor: nextLink,
      hasMore: Boolean(nextLink),
    };
  }

  // ==========================================
  // CORE STORAGE OPERATIONS
  // ==========================================

  async upload(options: UploadOptions): Promise<{ storagePath: string; url: string; sizeBytes: number }> {
    const parent = this.rootFolderId === 'root' || !this.rootFolderId ? 'root' : `items/${this.rootFolderId}`;
    const url = `https://graph.microsoft.com/v1.0/me/drive/${parent}:/${encodeURIComponent(options.filename)}:/content`;

    const res = await this.fetchWithAuth(url, {
      method: 'PUT',
      headers: { 'Content-Type': options.mimeType },
      body: options.buffer,
    });

    if (!res.ok) {
      const err = await res.text();
      throw new Error(`OneDrive upload failed: ${err}`);
    }

    const data: any = await res.json();
    return {
      storagePath: data.id,
      url: data['@microsoft.graph.downloadUrl'] || `https://onedrive.live.com/?id=${data.id}`,
      sizeBytes: options.buffer.length,
    };
  }

  async download(itemIdOrPath: string): Promise<Buffer> {
    const url = `https://graph.microsoft.com/v1.0/me/drive/items/${itemIdOrPath}/content`;
    const res = await this.fetchWithAuth(url);

    if (!res.ok) {
      const err = await res.text();
      throw new Error(`OneDrive download failed (${res.status}): ${err}`);
    }

    const arrayBuffer = await res.arrayBuffer();
    return Buffer.from(arrayBuffer);
  }

  async listFiles(folderId = this.rootFolderId): Promise<StorageFileMetadata[]> {
    const result = await this.listFolderFiles(folderId);
    return result.files.map((f) => ({
      path: f.id,
      sizeBytes: f.sizeBytes,
      mimeType: f.mimeType,
      lastModified: new Date(f.lastModified),
    }));
  }

  async getMetadata(itemId: string): Promise<StorageFileMetadata | null> {
    const url = `https://graph.microsoft.com/v1.0/me/drive/items/${itemId}?$select=id,name,size,file,lastModifiedDateTime,eTag`;
    const res = await this.fetchWithAuth(url);
    if (!res.ok) return null;

    const data: any = await res.json();
    return {
      path: data.id,
      sizeBytes: data.size || 0,
      mimeType: data.file?.mimeType || (mime.lookup(data.name) as string) || 'image/jpeg',
      lastModified: new Date(data.lastModifiedDateTime || Date.now()),
      etag: data.eTag,
    };
  }

  async generateSignedUrl(itemId: string, _expiresInSeconds = 3600): Promise<string> {
    const meta = await this.getMetadata(itemId);
    if (meta) {
      const url = `https://graph.microsoft.com/v1.0/me/drive/items/${itemId}/createLink`;
      try {
        const res = await this.fetchWithAuth(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ type: 'view', scope: 'anonymous' }),
        });
        if (res.ok) {
          const data: any = await res.json();
          return data.link?.webUrl || `https://1drv.ms/u/${itemId}`;
        }
      } catch {
        // Fallback
      }
    }
    return `https://1drv.ms/u/${itemId}`;
  }

  async delete(itemId: string): Promise<boolean> {
    const url = `https://graph.microsoft.com/v1.0/me/drive/items/${itemId}`;
    const res = await this.fetchWithAuth(url, { method: 'DELETE' });
    return res.ok || res.status === 404;
  }

  async getStorageUsage(): Promise<{ usedBytes: number; totalBytes?: number }> {
    const res = await this.fetchWithAuth('https://graph.microsoft.com/v1.0/me/drive');
    if (!res.ok) return { usedBytes: 0 };

    const data: any = await res.json();
    const quota = data.quota || {};
    return {
      usedBytes: quota.used || 0,
      totalBytes: quota.total || undefined,
    };
  }

  async sync(options: StorageSyncOptions = {}): Promise<StorageSyncResult> {
    const folderId = options.folderId || this.rootFolderId;
    const result = await this.listFolderFiles(folderId);
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
          message: 'OneDrive connection requires an active OAuth access token.',
          provider: this.providerType,
          latencyMs: 0,
        };
      }

      const res = await this.fetchWithAuth('https://graph.microsoft.com/v1.0/me/drive');
      if (res.ok) {
        const data: any = await res.json();
        const driveOwner = data.owner?.user?.displayName || data.driveType || 'authenticated user';
        return {
          success: true,
          message: `Microsoft OneDrive connected successfully (${driveOwner}).`,
          provider: this.providerType,
          latencyMs: Date.now() - startTime,
        };
      } else {
        return {
          success: false,
          message: `OneDrive connection test returned HTTP ${res.status}. Token may need refresh.`,
          provider: this.providerType,
          latencyMs: Date.now() - startTime,
        };
      }
    } catch (err: unknown) {
      return {
        success: false,
        message: `OneDrive test failed: ${err instanceof Error ? err.message : String(err)}`,
        provider: this.providerType,
        latencyMs: Date.now() - startTime,
      };
    }
  }
}
