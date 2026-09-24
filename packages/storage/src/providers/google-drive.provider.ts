import { StorageProviderType, StorageFolderItem, StorageFileItem, StorageFileListResult } from '@pixmatch/types';
import {
  StorageProvider,
  UploadOptions,
  StorageFileMetadata,
  StorageConnectionTestResult,
  StorageSyncResult,
  ListFilesOptions,
  StorageSyncOptions,
} from '../index.js';

export interface GoogleDriveConfig {
  accessToken?: string;
  refreshToken?: string;
  clientId?: string;
  clientSecret?: string;
  redirectUri?: string;
  rootFolderId?: string;
}

// ==========================================
// CANONICAL REDIRECT URI HELPER
// ==========================================

export function getGoogleDriveRedirectUri(customBaseUrl?: string): string {
  // If GOOGLE_REDIRECT_URI is explicitly set in env, use it after validating
  const envRedirect = process.env.GOOGLE_REDIRECT_URI;
  if (envRedirect && envRedirect.trim() !== '') {
    const trimmed = envRedirect.trim();
    if (process.env.NODE_ENV === 'production' && !trimmed.startsWith('https://')) {
      throw new Error('GOOGLE_OAUTH_REDIRECT_MISMATCH: In production, redirect_uri must use HTTPS');
    }
    return trimmed;
  }

  const isProd = process.env.NODE_ENV === 'production';
  let baseUrl = customBaseUrl || process.env.API_URL || process.env.APP_URL || process.env.NEXT_PUBLIC_APP_URL || (isProd ? 'https://pix-match-ai-web.vercel.app' : 'http://localhost:4000');

  // Strip trailing slash
  baseUrl = baseUrl.replace(/\/+$/, '');

  if (isProd) {
    if (baseUrl.includes('localhost') || baseUrl.includes('127.0.0.1')) {
      baseUrl = 'https://pix-match-ai-web.vercel.app';
    } else if (baseUrl.startsWith('http://')) {
      baseUrl = baseUrl.replace('http://', 'https://');
    }
  }

  return `${baseUrl}/api/storage/oauth/google/callback`;
}

export class GoogleDriveProvider implements StorageProvider {
  readonly providerType = StorageProviderType.GOOGLE_DRIVE;
  private accessToken: string;
  private refreshToken?: string;
  private clientId?: string;
  private clientSecret?: string;
  private redirectUri?: string;
  private rootFolderId?: string;

  private static readonly SUPPORTED_MIME_TYPES = new Set([
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/webp',
    'image/heic',
    'image/tiff',
    'image/avif',
  ]);

  constructor(config: GoogleDriveConfig = {}) {
    this.accessToken = config.accessToken || '';
    this.refreshToken = config.refreshToken;
    this.clientId = config.clientId || process.env.GOOGLE_CLIENT_ID;
    this.clientSecret = config.clientSecret || process.env.GOOGLE_CLIENT_SECRET;
    this.redirectUri = config.redirectUri || process.env.GOOGLE_REDIRECT_URI;
    this.rootFolderId = config.rootFolderId || 'root';
  }

  // ==========================================
  // OAUTH HELPERS
  // ==========================================

  static getAuthUrl(clientIdOrOpts: string | { clientId: string; redirectUri: string; state: string }, redirectUri?: string, state?: string): string {
    const clientId = typeof clientIdOrOpts === 'object' ? clientIdOrOpts.clientId : clientIdOrOpts;
    const uri = typeof clientIdOrOpts === 'object' ? clientIdOrOpts.redirectUri : redirectUri!;
    const st = typeof clientIdOrOpts === 'object' ? clientIdOrOpts.state : state!;

    if (!clientId || clientId.trim() === '' || clientId === 'dummy-google-client-id') {
      throw new Error('GOOGLE_OAUTH_NOT_CONFIGURED: Google Client ID is not configured');
    }

    if (!uri || uri.trim() === '') {
      throw new Error('GOOGLE_OAUTH_REDIRECT_MISMATCH: Redirect URI is required');
    }

    if (process.env.NODE_ENV === 'production' && !uri.startsWith('https://')) {
      throw new Error('GOOGLE_OAUTH_REDIRECT_MISMATCH: In production, redirect_uri must use HTTPS');
    }

    if (!st || st.trim() === '') {
      throw new Error('INVALID_STATE: OAuth state parameter is required');
    }

    const scopes = [
      'https://www.googleapis.com/auth/drive.readonly',
      'https://www.googleapis.com/auth/userinfo.email',
      'https://www.googleapis.com/auth/userinfo.profile',
    ].join(' ');

    const params = new URLSearchParams({
      client_id: clientId.trim(),
      redirect_uri: uri.trim(),
      response_type: 'code',
      scope: scopes,
      access_type: 'offline',
      prompt: 'consent',
      state: st,
    });

    // Safe debug information only: never log client_secret or full sensitive tokens
    const clientIdSuffix = clientId.length >= 6 ? clientId.slice(-6) : '******';
    console.log(`[Google OAuth Safe Diagnostic] provider=google, client_id_suffix=...${clientIdSuffix}, redirect_uri=${uri}, environment=${process.env.NODE_ENV || 'development'}, state_present=${Boolean(st)}`);

    return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
  }

  static getAuthorizationUrl = GoogleDriveProvider.getAuthUrl;

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

    if (!cId || cId.trim() === '' || cId === 'dummy-google-client-id') {
      throw new Error('GOOGLE_OAUTH_NOT_CONFIGURED: Google Client ID is not configured');
    }
    if (!cSec || cSec.trim() === '' || cSec === 'dummy-google-client-secret') {
      throw new Error('GOOGLE_OAUTH_NOT_CONFIGURED: Google Client Secret is not configured');
    }
    if (!authCode || authCode.trim() === '') {
      throw new Error('MISSING_PARAMS: Authorization code is missing');
    }

    const params = new URLSearchParams({
      code: authCode,
      client_id: cId,
      client_secret: cSec,
      redirect_uri: rUri,
      grant_type: 'authorization_code',
    });

    const response = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: params.toString(),
    });

    if (!response.ok) {
      const errorText = await response.text();
      let errorJson: any = null;
      try {
        errorJson = JSON.parse(errorText);
      } catch {
        // non-json response
      }

      if (errorJson?.error === 'invalid_client' || response.status === 401) {
        throw new Error('GOOGLE_OAUTH_CLIENT_INVALID: The Google Drive OAuth client is invalid or unavailable.');
      }
      if (errorJson?.error === 'redirect_uri_mismatch') {
        throw new Error('GOOGLE_OAUTH_REDIRECT_MISMATCH: The Google Drive callback URL is not configured correctly.');
      }
      if (errorJson?.error === 'access_denied') {
        throw new Error('GOOGLE_OAUTH_ACCESS_DENIED: The user cancelled Google Drive authorization.');
      }

      throw new Error(`Google OAuth Token Exchange Failed (${response.status}): ${errorJson?.error_description || errorJson?.error || 'Token exchange failed'}`);
    }

    const data: any = await response.json();
    const accessToken = data.access_token;
    const refreshToken = data.refresh_token;
    const expiresIn = data.expires_in;

    // Fetch user profile info
    let accountEmail: string | undefined;
    let accountId: string | undefined;
    try {
      const userRes = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (userRes.ok) {
        const userInfo: any = await userRes.json();
        accountEmail = userInfo.email;
        accountId = userInfo.id;
      }
    } catch {
      // Userinfo fetch failure is non-fatal
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
      throw new Error('Cannot refresh Google Drive token: missing refresh token or client credentials');
    }

    const params = new URLSearchParams({
      refresh_token: this.refreshToken,
      client_id: this.clientId,
      client_secret: this.clientSecret,
      grant_type: 'refresh_token',
    });

    const response = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: params.toString(),
    });

    if (!response.ok) {
      throw new Error(`Google Drive token refresh failed with status ${response.status}`);
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
      throw new Error('Google Drive Provider: No access token configured');
    }

    // SSRF Validation
    const { validateSafeUrl, ALLOWED_STORAGE_DOMAINS } = await import('../ssrf.js');
    const urlValidation = validateSafeUrl(url, { allowedDomains: ALLOWED_STORAGE_DOMAINS });
    if (!urlValidation.valid) {
      throw new Error(`Google Drive Provider SSRF Blocked: ${urlValidation.reason}`);
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
      console.warn(`[GoogleDriveProvider] Rate limited (429). Backing off for ${delayMs}ms (Attempt ${retryCount + 1}/3)...`);
      await this.sleep(delayMs);
      return this.fetchWithAuth(url, init, retryCount + 1);
    }

    if (response.status === 401 && this.refreshToken && retryCount === 0) {
      // Auto-refresh token on 401 and retry once
      try {
        await this.refreshAccessToken();
        return this.fetchWithAuth(url, init, retryCount + 1);
      } catch {
        // Re-throw original 401 response if refresh fails
      }
    }

    return response;
  }

  // ==========================================
  // FOLDER & FILE BROWSING
  // ==========================================

  async browseFolders(parentFolderId = this.rootFolderId || 'root'): Promise<StorageFolderItem[]> {
    const query = `'${parentFolderId}' in parents and mimeType = 'application/vnd.google-apps.folder' and trashed = false`;
    const url = `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(query)}&fields=files(id,name,parents)&pageSize=100`;

    const res = await this.fetchWithAuth(url);
    if (!res.ok) {
      const err = await res.text();
      throw new Error(`Failed to browse Google Drive folders: ${err}`);
    }

    const data: any = await res.json();
    const files = data.files || [];

    return files.map((f: any) => ({
      id: f.id,
      name: f.name,
      path: f.id,
      parentId: f.parents?.[0] || null,
      hasChildren: true,
    }));
  }

  async listFolderFiles(folderId = this.rootFolderId || 'root', options: ListFilesOptions = {}): Promise<StorageFileListResult> {
    const mimeQuery = Array.from(GoogleDriveProvider.SUPPORTED_MIME_TYPES)
      .map((m) => `mimeType = '${m}'`)
      .join(' or ');
    const query = `'${folderId}' in parents and (${mimeQuery}) and trashed = false`;
    
    let allFiles: StorageFileItem[] = [];
    let currentCursor: string | null = options.cursor || null;
    let hasMorePages = false;
    let pageCount = 0;
    const maxPages = options.cursor ? 1 : 10; // Auto-paginate up to 10 pages per sync cycle

    do {
      pageCount++;
      let url = `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(query)}&fields=nextPageToken,files(id,name,size,mimeType,modifiedTime,thumbnailLink,webContentLink)&pageSize=${options.pageSize || 100}`;
      if (currentCursor) {
        url += `&pageToken=${encodeURIComponent(currentCursor)}`;
      }

      const res = await this.fetchWithAuth(url);
      if (!res.ok) {
        const err = await res.text();
        throw new Error(`Failed to list Google Drive files: ${err}`);
      }

      const data: any = await res.json();
      const pageFiles: StorageFileItem[] = (data.files || []).map((f: any) => ({
        id: f.id,
        name: f.name,
        path: f.id,
        sizeBytes: parseInt(f.size || '0', 10),
        mimeType: f.mimeType,
        lastModified: new Date(f.modifiedTime),
        thumbnailUrl: f.thumbnailLink,
        downloadUrl: f.webContentLink,
      }));

      allFiles = allFiles.concat(pageFiles);
      currentCursor = data.nextPageToken || null;
      hasMorePages = Boolean(currentCursor);
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
    const parentFolder = this.rootFolderId || 'root';
    const metadata = {
      name: options.filename,
      parents: [parentFolder],
      mimeType: options.mimeType,
    };

    const form = new FormData();
    form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
    form.append('file', new Blob([options.buffer], { type: options.mimeType }));

    const res = await this.fetchWithAuth('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,webContentLink', {
      method: 'POST',
      body: form,
    });

    if (!res.ok) {
      const err = await res.text();
      throw new Error(`Google Drive upload failed: ${err}`);
    }

    const data: any = await res.json();
    return {
      storagePath: data.id,
      url: data.webContentLink || `https://drive.google.com/uc?id=${data.id}&export=download`,
      sizeBytes: options.buffer.length,
    };
  }

  async download(fileId: string): Promise<Buffer> {
    const url = `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`;
    const res = await this.fetchWithAuth(url);

    if (!res.ok) {
      const err = await res.text();
      throw new Error(`Google Drive download failed (${res.status}): ${err}`);
    }

    const arrayBuffer = await res.arrayBuffer();
    return Buffer.from(arrayBuffer);
  }

  async listFiles(folderId = this.rootFolderId || 'root'): Promise<StorageFileMetadata[]> {
    const result = await this.listFolderFiles(folderId);
    return result.files.map((f) => ({
      path: f.id,
      sizeBytes: f.sizeBytes,
      mimeType: f.mimeType,
      lastModified: new Date(f.lastModified),
    }));
  }

  async getMetadata(fileId: string): Promise<StorageFileMetadata | null> {
    const url = `https://www.googleapis.com/drive/v3/files/${fileId}?fields=id,name,size,mimeType,modifiedTime,md5Checksum`;
    const res = await this.fetchWithAuth(url);
    if (!res.ok) return null;

    const data: any = await res.json();
    return {
      path: data.id,
      sizeBytes: parseInt(data.size || '0', 10),
      mimeType: data.mimeType,
      lastModified: new Date(data.modifiedTime),
      etag: data.md5Checksum,
    };
  }

  async generateSignedUrl(fileId: string, _expiresInSeconds = 3600): Promise<string> {
    // Return direct authenticated proxy link
    return `https://drive.google.com/uc?id=${fileId}&export=view`;
  }

  async delete(fileId: string): Promise<boolean> {
    const url = `https://www.googleapis.com/drive/v3/files/${fileId}`;
    const res = await this.fetchWithAuth(url, { method: 'DELETE' });
    return res.ok || res.status === 404;
  }

  async getStorageUsage(): Promise<{ usedBytes: number; totalBytes?: number }> {
    const res = await this.fetchWithAuth('https://www.googleapis.com/drive/v3/about?fields=storageQuota');
    if (!res.ok) {
      return { usedBytes: 0 };
    }
    const data: any = await res.json();
    const quota = data.storageQuota || {};
    return {
      usedBytes: parseInt(quota.usage || '0', 10),
      totalBytes: quota.limit ? parseInt(quota.limit, 10) : undefined,
    };
  }

  async sync(options: StorageSyncOptions = {}): Promise<StorageSyncResult> {
    const folderId = options.folderId || this.rootFolderId || 'root';
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
          message: 'Google Drive connection requires an active OAuth access token.',
          provider: this.providerType,
          latencyMs: 0,
        };
      }

      const res = await this.fetchWithAuth('https://www.googleapis.com/drive/v3/about?fields=user,storageQuota');
      if (res.ok) {
        const data: any = await res.json();
        const userEmail = data.user?.emailAddress || 'authenticated user';
        return {
          success: true,
          message: `Google Drive connected successfully (${userEmail}).`,
          provider: this.providerType,
          latencyMs: Date.now() - startTime,
        };
      } else {
        return {
          success: false,
          message: `Google Drive API connection test returned HTTP ${res.status}. Token may need refresh.`,
          provider: this.providerType,
          latencyMs: Date.now() - startTime,
        };
      }
    } catch (err: unknown) {
      return {
        success: false,
        message: `Google Drive test failed: ${err instanceof Error ? err.message : String(err)}`,
        provider: this.providerType,
        latencyMs: Date.now() - startTime,
      };
    }
  }
}
