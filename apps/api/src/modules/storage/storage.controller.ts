import { FastifyRequest, FastifyReply } from 'fastify';
import crypto from 'crypto';
import { z } from 'zod';
import {
  prisma,
  StorageProviderType,
  StorageConnectionStatus,
  StorageMode,
  StorageSyncStatus,
} from '@pixmatch/database';
import {
  StorageService,
  encryptTokens,
  decryptTokens,
  encryptJson,
  decryptJson,
  GoogleDriveProvider,
  DropboxProvider,
  OneDriveProvider,
  S3Provider,
  ExternalUrlProvider,
} from '@pixmatch/storage';
import { dispatchStorageSync } from '@pixmatch/worker';

const stateSecret = process.env.ENCRYPTION_KEY || 'pixmatch-default-secret-key-for-encryption-32-chars!!';

// In-memory single-use nonce store with 15-minute TTL
const consumedNonces = new Map<string, number>();

function cleanExpiredNonces() {
  const now = Date.now();
  for (const [nonce, expiresAt] of consumedNonces.entries()) {
    if (now > expiresAt) {
      consumedNonces.delete(nonce);
    }
  }
}

export function signOAuthState(data: Record<string, any>): string {
  const nonce = crypto.randomBytes(16).toString('hex');
  const payload = JSON.stringify({ ...data, nonce, ts: Date.now() });
  return encryptJson(JSON.parse(payload), stateSecret.slice(0, 32));
}

export function verifyOAuthState(state: string): Record<string, any> {
  cleanExpiredNonces();
  const decrypted = decryptJson<Record<string, any>>(state, stateSecret.slice(0, 32));
  if (!decrypted || !decrypted.ts || !decrypted.nonce) {
    throw new Error('Invalid OAuth state parameter: missing timestamp or cryptographic nonce');
  }
  // 15-minute expiration
  if (Date.now() - decrypted.ts > 15 * 60 * 1000) {
    throw new Error('OAuth state has expired. Please initiate authentication again.');
  }

  if (consumedNonces.has(decrypted.nonce)) {
    throw new Error('OAuth state replay detected: this authentication session token has already been consumed');
  }

  // Mark nonce as consumed (valid for remaining TTL)
  consumedNonces.set(decrypted.nonce, decrypted.ts + 15 * 60 * 1000);

  return decrypted;
}

export class StorageController {
  /**
   * GET /api/storage/providers
   * Lists available storage providers with metadata.
   */
  static async listAvailableProviders(request: FastifyRequest, reply: FastifyReply) {
    return reply.send({
      success: true,
      data: [
        { id: StorageProviderType.PLATFORM, name: 'PixMatch Platform Storage', category: 'platform', isDefault: true },
        { id: StorageProviderType.GOOGLE_DRIVE, name: 'Google Drive', category: 'oauth' },
        { id: StorageProviderType.DROPBOX, name: 'Dropbox', category: 'oauth' },
        { id: StorageProviderType.ONEDRIVE, name: 'Microsoft OneDrive', category: 'oauth' },
        { id: StorageProviderType.S3, name: 'Amazon S3', category: 's3_compatible' },
        { id: StorageProviderType.CLOUDFLARE_R2, name: 'Cloudflare R2', category: 's3_compatible' },
        { id: StorageProviderType.GENERIC_S3, name: 'Generic S3-Compatible', category: 's3_compatible' },
        { id: StorageProviderType.EXTERNAL_URL, name: 'External URL / Manifest', category: 'external_url' },
      ],
    });
  }

  /**
   * GET /api/storage/connections
   * Lists all storage connections for the authenticated studio (Zero credentials exposed).
   */
  static async listConnections(request: FastifyRequest, reply: FastifyReply) {
    const studioId = request.studioId!;
    const connections = await prisma.storageConnection.findMany({
      where: { studio_id: studioId },
      include: {
        sync_jobs: {
          take: 1,
          orderBy: { created_at: 'desc' },
        },
      },
      orderBy: { created_at: 'asc' },
    });

    return reply.send({
      success: true,
      data: connections.map((c) => {
        const config = (c.configuration as Record<string, any>) || {};
        return {
          id: c.id,
          studio_id: c.studio_id,
          provider: c.provider,
          display_name: c.display_name,
          account_email: c.provider_account_email,
          account_name: c.display_name,
          storage_mode: c.storage_mode,
          status: c.status,
          folder_id: config.folder_id,
          folder_path: config.folder_path,
          folder_name: config.folder_name,
          bucket: config.bucket,
          region: config.region,
          endpoint: config.endpoint,
          prefix: config.prefix,
          custom_domain: config.customDomain,
          base_url: config.baseUrlOrManifestUrl,
          storage_usage_bytes: Number(c.storage_used_bytes),
          last_synced_at: c.last_sync_at,
          created_at: c.created_at,
          updated_at: c.updated_at,
          latest_sync_job: c.sync_jobs[0]
            ? {
                id: c.sync_jobs[0].id,
                status: c.sync_jobs[0].status,
                files_discovered: c.sync_jobs[0].files_discovered,
                files_imported: c.sync_jobs[0].files_imported,
                files_skipped: c.sync_jobs[0].files_skipped,
                files_failed: c.sync_jobs[0].files_failed,
                bytes_transferred: 0,
                completed_at: c.sync_jobs[0].completed_at,
              }
            : null,
        };
      }),
    });
  }

  /**
   * POST /api/storage/connect
   * Connects S3, Cloudflare R2, Generic S3, or External URL via form credentials.
   */
  static async connectProvider(request: FastifyRequest, reply: FastifyReply) {
    const studioId = request.studioId!;
    const body = z
      .object({
        provider: z.nativeEnum(StorageProviderType),
        displayName: z.string().min(1),
        storageMode: z.nativeEnum(StorageMode).default(StorageMode.CONNECTED),
        // S3-compatible configuration
        bucket: z.string().optional(),
        region: z.string().optional(),
        endpoint: z.string().optional(),
        prefix: z.string().optional(),
        accessKeyId: z.string().optional(),
        secretAccessKey: z.string().optional(),
        sessionToken: z.string().optional(),
        customDomain: z.string().optional(),
        // External URL configuration
        baseUrlOrManifestUrl: z.string().optional(),
        manifestMode: z.enum(['SINGLE_IMAGE', 'MANIFEST', 'DIRECTORY']).optional(),
      })
      .parse(request.body);

    // Encrypt sensitive credentials
    let encryptedCreds: string | null = null;
    let nonSensitiveConfig: Record<string, any> = {};

    if (
      body.provider === StorageProviderType.S3 ||
      body.provider === StorageProviderType.CLOUDFLARE_R2 ||
      body.provider === StorageProviderType.GENERIC_S3
    ) {
      if (!body.bucket) {
        return reply.status(400).send({
          success: false,
          error: { code: 'INVALID_CONFIG', message: 'Bucket name is required for S3-compatible storage' },
        });
      }

      if (!body.accessKeyId || !body.secretAccessKey) {
        return reply.status(400).send({
          success: false,
          error: { code: 'INVALID_CONFIG', message: 'Access Key ID and Secret Access Key are required' },
        });
      }

      encryptedCreds = encryptTokens({
        accessKeyId: body.accessKeyId,
        secretAccessKey: body.secretAccessKey,
        sessionToken: body.sessionToken,
      });

      nonSensitiveConfig = {
        bucket: body.bucket,
        region: body.region || (body.provider === StorageProviderType.CLOUDFLARE_R2 ? 'auto' : 'us-east-1'),
        endpoint: body.endpoint,
        prefix: body.prefix,
        customDomain: body.customDomain,
      };
    } else if (body.provider === StorageProviderType.EXTERNAL_URL) {
      if (!body.baseUrlOrManifestUrl) {
        return reply.status(400).send({
          success: false,
          error: { code: 'INVALID_CONFIG', message: 'Base URL or Manifest URL is required' },
        });
      }

      encryptedCreds = encryptTokens({
        baseUrlOrManifestUrl: body.baseUrlOrManifestUrl,
      });

      nonSensitiveConfig = {
        baseUrlOrManifestUrl: body.baseUrlOrManifestUrl,
        mode: body.manifestMode || 'SINGLE_IMAGE',
      };
    } else if (
      body.provider === StorageProviderType.GOOGLE_DRIVE ||
      body.provider === StorageProviderType.DROPBOX ||
      body.provider === StorageProviderType.ONEDRIVE
    ) {
      encryptedCreds = encryptTokens({
        accessToken: 'demo_oauth_access_token',
        refreshToken: 'demo_oauth_refresh_token',
      });

      nonSensitiveConfig = {
        folder_path: body.prefix || '/',
        folder_name: body.displayName || `${body.provider} Connected Storage`,
      };
    }

    // Upsert StorageConnection for this studio and provider
    const connection = await prisma.storageConnection.create({
      data: {
        studio_id: studioId,
        provider: body.provider as any,
        display_name: body.displayName,
        storage_mode: (body.storageMode as any) || StorageMode.CONNECTED,
        access_token: encryptedCreds || '',
        configuration: {
          ...nonSensitiveConfig,
          folder_path: body.prefix || nonSensitiveConfig.baseUrlOrManifestUrl || '/',
          folder_name: body.bucket || body.displayName,
        },
        status: StorageConnectionStatus.ACTIVE,
      },
    });

    // Audit Log (Zero secrets)
    await prisma.auditLog.create({
      data: {
        studio_id: studioId,
        action: 'STORAGE_CONNECTION_CREATED',
        resource_type: 'STORAGE_CONNECTION',
        resource_id: connection.id,
        metadata: {
          provider: connection.provider,
          displayName: connection.display_name,
          storageMode: connection.storage_mode,
        },
      },
    }).catch(() => null);

    return reply.status(201).send({
      success: true,
      data: {
        id: connection.id,
        provider: connection.provider,
        display_name: connection.display_name,
        storage_mode: connection.storage_mode,
        status: connection.status,
        created_at: connection.created_at,
      },
    });
  }

  /**
   * POST /api/storage/test-config
   * Tests an uncommitted or ephemeral storage connection before saving.
   */
  static async testConfig(request: FastifyRequest, reply: FastifyReply) {
    const body = z
      .object({
        provider: z.nativeEnum(StorageProviderType),
        bucket: z.string().optional(),
        region: z.string().optional(),
        endpoint: z.string().optional(),
        prefix: z.string().optional(),
        accessKeyId: z.string().optional(),
        secretAccessKey: z.string().optional(),
        sessionToken: z.string().optional(),
        customDomain: z.string().optional(),
        baseUrlOrManifestUrl: z.string().optional(),
      })
      .parse(request.body);

    try {
      let providerInstance: any;
      if (
        body.provider === StorageProviderType.S3 ||
        body.provider === StorageProviderType.CLOUDFLARE_R2 ||
        body.provider === StorageProviderType.GENERIC_S3
      ) {
        providerInstance = new S3Provider({
          providerType: body.provider as any,
          bucket: body.bucket || '',
          region: body.region,
          endpoint: body.endpoint,
          prefix: body.prefix,
          accessKeyId: body.accessKeyId || '',
          secretAccessKey: body.secretAccessKey || '',
          sessionToken: body.sessionToken,
          customDomain: body.customDomain,
        });
      } else if (body.provider === StorageProviderType.EXTERNAL_URL) {
        providerInstance = new ExternalUrlProvider({
          baseUrlOrManifestUrl: body.baseUrlOrManifestUrl || '',
        });
      } else {
        providerInstance = StorageService.getProvider(body.provider as any);
      }

      const result = await providerInstance.testConnection();
      return reply.send({
        success: result.success,
        data: result,
      });
    } catch (err: any) {
      return reply.status(400).send({
        success: false,
        error: { code: 'TEST_FAILED', message: err.message },
      });
    }
  }

  /**
   * POST /api/storage/connections/:id/test
   * Tests an existing saved storage connection.
   */
  static async testConnectionById(request: FastifyRequest, reply: FastifyReply) {
    const { id } = request.params as { id: string };
    const studioId = request.studioId!;

    const connection = await prisma.storageConnection.findFirst({
      where: { id, studio_id: studioId },
    });

    if (!connection) {
      return reply.status(404).send({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Storage connection not found' },
      });
    }

    try {
      let providerInstance: any;
      if (
        connection.provider === StorageProviderType.S3 ||
        connection.provider === StorageProviderType.CLOUDFLARE_R2 ||
        connection.provider === StorageProviderType.GENERIC_S3
      ) {
        const creds = decryptTokens<Record<string, any>>(connection.access_token || (connection as any).credentials_encrypted || '');
        const config = (connection.configuration as Record<string, any>) || {};
        providerInstance = new S3Provider({
          providerType: connection.provider as any,
          bucket: config.bucket || '',
          region: config.region,
          endpoint: config.endpoint,
          prefix: config.prefix,
          accessKeyId: creds.accessKeyId || creds.accessToken || '',
          secretAccessKey: creds.secretAccessKey || creds.refreshToken || '',
          sessionToken: creds.sessionToken,
          customDomain: config.customDomain,
        });
      } else if (connection.provider === StorageProviderType.EXTERNAL_URL) {
        const config = (connection.configuration as Record<string, any>) || {};
        providerInstance = new ExternalUrlProvider({
          baseUrlOrManifestUrl: config.baseUrlOrManifestUrl || config.folder_path || '',
        });
      } else {
        providerInstance = StorageService.getProvider(connection.provider as any);
      }

      const result = await providerInstance.testConnection();
      return reply.send({
        success: result.success,
        data: result,
      });
    } catch (err: any) {
      return reply.status(500).send({
        success: false,
        error: { code: 'TEST_FAILED', message: err.message },
      });
    }
  }

  /**
   * GET /api/storage/oauth/:provider/authorize
   * Generates authorization URL for Google Drive, Dropbox, or OneDrive.
   */
  static async getAuthorizeUrl(request: FastifyRequest, reply: FastifyReply) {
    const { provider } = request.params as { provider: string };
    const studioId = request.studioId!;
    const query = request.query as { galleryId?: string; storageMode?: StorageMode };

    const state = signOAuthState({
      studioId,
      provider: provider.toUpperCase(),
      galleryId: query.galleryId || '',
      storageMode: query.storageMode || StorageMode.CONNECTED,
    });

    let authUrl = '';
    const origin = `${request.protocol}://${request.hostname}`;

    switch (provider.toLowerCase()) {
      case 'google':
      case 'google_drive': {
        const clientId = process.env.GOOGLE_CLIENT_ID || 'dummy-google-client-id';
        const redirectUri = process.env.GOOGLE_REDIRECT_URI || `${origin}/api/storage/oauth/google/callback`;
        authUrl = GoogleDriveProvider.getAuthorizationUrl({ clientId, redirectUri, state });
        break;
      }
      case 'dropbox': {
        const clientId = process.env.DROPBOX_CLIENT_ID || 'dummy-dropbox-client-id';
        const redirectUri = process.env.DROPBOX_REDIRECT_URI || `${origin}/api/storage/oauth/dropbox/callback`;
        authUrl = DropboxProvider.getAuthorizationUrl({ clientId, redirectUri, state });
        break;
      }
      case 'onedrive': {
        const clientId = process.env.MICROSOFT_CLIENT_ID || 'dummy-onedrive-client-id';
        const redirectUri = process.env.MICROSOFT_REDIRECT_URI || `${origin}/api/storage/oauth/onedrive/callback`;
        authUrl = OneDriveProvider.getAuthorizationUrl({ clientId, redirectUri, state });
        break;
      }
      default:
        return reply.status(400).send({
          success: false,
          error: { code: 'INVALID_PROVIDER', message: `OAuth not supported for provider: ${provider}` },
        });
    }

    return reply.send({
      success: true,
      data: {
        authorizationUrl: authUrl,
        state,
      },
    });
  }

  /**
   * GET /api/storage/oauth/:provider/callback
   * Exchanges OAuth authorization code, encrypts tokens, and creates/updates StorageConnection.
   */
  static async handleOAuthCallback(request: FastifyRequest, reply: FastifyReply) {
    const { provider } = request.params as { provider: string };
    const query = request.query as { code?: string; state?: string; error?: string };

    if (query.error) {
      return reply.status(400).send({
        success: false,
        error: { code: 'OAUTH_DENIED', message: `OAuth provider returned error: ${query.error}` },
      });
    }

    if (!query.code || !query.state) {
      return reply.status(400).send({
        success: false,
        error: { code: 'MISSING_PARAMS', message: 'Authorization code and state are required' },
      });
    }

    let stateData: Record<string, any>;
    try {
      stateData = verifyOAuthState(query.state);
    } catch (err: any) {
      return reply.status(400).send({
        success: false,
        error: { code: 'INVALID_STATE', message: err.message },
      });
    }

    const { studioId, storageMode } = stateData;
    const origin = `${request.protocol}://${request.hostname}`;

    let tokens: any;
    let providerType: StorageProviderType;
    let accountInfo: { email?: string; name?: string; accountId?: string; usedBytes?: number } = {};

    try {
      switch (provider.toLowerCase()) {
        case 'google':
        case 'google_drive': {
          providerType = StorageProviderType.GOOGLE_DRIVE;
          const redirectUri = process.env.GOOGLE_REDIRECT_URI || `${origin}/api/storage/oauth/google/callback`;
          tokens = await GoogleDriveProvider.exchangeCodeForTokens({
            clientId: process.env.GOOGLE_CLIENT_ID || '',
            clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
            redirectUri,
            code: query.code,
          });

          const drv = new GoogleDriveProvider({
            clientId: process.env.GOOGLE_CLIENT_ID || '',
            clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
            redirectUri,
            accessToken: tokens.accessToken,
          });
          const usage = await drv.getStorageUsage().catch(() => ({ usedBytes: 0 }));
          accountInfo = { usedBytes: usage.usedBytes, email: 'Google Drive User' };
          break;
        }
        case 'dropbox': {
          providerType = StorageProviderType.DROPBOX;
          const redirectUri = process.env.DROPBOX_REDIRECT_URI || `${origin}/api/storage/oauth/dropbox/callback`;
          tokens = await DropboxProvider.exchangeCodeForTokens({
            clientId: process.env.DROPBOX_CLIENT_ID || '',
            clientSecret: process.env.DROPBOX_CLIENT_SECRET || '',
            redirectUri,
            code: query.code,
          });

          const dbx = new DropboxProvider({
            clientId: process.env.DROPBOX_CLIENT_ID || '',
            clientSecret: process.env.DROPBOX_CLIENT_SECRET || '',
            redirectUri,
            accessToken: tokens.accessToken,
          });
          const usage = await dbx.getStorageUsage().catch(() => ({ usedBytes: 0 }));
          accountInfo = { usedBytes: usage.usedBytes, email: 'Dropbox User' };
          break;
        }
        case 'onedrive': {
          providerType = StorageProviderType.ONEDRIVE;
          const redirectUri = process.env.MICROSOFT_REDIRECT_URI || `${origin}/api/storage/oauth/onedrive/callback`;
          tokens = await OneDriveProvider.exchangeCodeForTokens({
            clientId: process.env.MICROSOFT_CLIENT_ID || '',
            clientSecret: process.env.MICROSOFT_CLIENT_SECRET || '',
            redirectUri,
            code: query.code,
          });

          const onedrive = new OneDriveProvider({
            clientId: process.env.MICROSOFT_CLIENT_ID || '',
            clientSecret: process.env.MICROSOFT_CLIENT_SECRET || '',
            redirectUri,
            accessToken: tokens.accessToken,
          });
          const usage = await onedrive.getStorageUsage().catch(() => ({ usedBytes: 0 }));
          accountInfo = { usedBytes: usage.usedBytes, email: 'OneDrive User' };
          break;
        }
        default:
          return reply.status(400).send({
            success: false,
            error: { code: 'INVALID_PROVIDER', message: `Unknown provider: ${provider}` },
          });
      }

      // Encrypt tokens before writing to database
      const credentialsEncrypted = encryptTokens(tokens);

      // Upsert StorageConnection
      const connection = await prisma.storageConnection.upsert({
        where: {
          studio_id_provider: {
            studio_id: studioId,
            provider: providerType as any,
          },
        },
        create: {
          studio_id: studioId,
          provider: providerType as any,
          display_name: `${providerType.replace('_', ' ')} Connection`,
          provider_account_email: accountInfo.email || `${providerType} User`,
          provider_account_id: accountInfo.accountId || undefined,
          storage_mode: (storageMode as any) || StorageMode.CONNECTED,
          access_token: credentialsEncrypted,
          status: StorageConnectionStatus.ACTIVE,
          storage_used_bytes: BigInt(accountInfo.usedBytes || 0),
        },
        update: {
          access_token: credentialsEncrypted,
          status: StorageConnectionStatus.ACTIVE,
          storage_mode: (storageMode as any) || undefined,
          storage_used_bytes: BigInt(accountInfo.usedBytes || 0),
        },
      });

      // Audit Log (Zero secrets)
      await prisma.auditLog.create({
        data: {
          studio_id: studioId,
          action: 'STORAGE_CONNECTION_UPSERTED',
          resource_type: 'STORAGE_CONNECTION',
          resource_id: connection.id,
          metadata: {
            provider: connection.provider,
            storageMode: connection.storage_mode,
            accountEmail: connection.provider_account_email,
          },
        },
      }).catch(() => null);

      const acceptHeader = request.headers.accept || '';
      if (acceptHeader.includes('text/html')) {
        const clientOrigin = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
        return reply.redirect(`${clientOrigin}/dashboard/storage?connected=${providerType}&id=${connection.id}`);
      }

      return reply.send({
        success: true,
        data: {
          id: connection.id,
          provider: connection.provider,
          status: connection.status,
          storage_mode: connection.storage_mode,
        },
      });
    } catch (err: any) {
      console.error('[Storage OAuth Error]', err);
      return reply.status(500).send({
        success: false,
        error: { code: 'OAUTH_EXCHANGE_FAILED', message: `Failed to exchange tokens: ${err.message}` },
      });
    }
  }

  /**
   * POST /api/storage/connections/:id/browse
   * Navigates remote cloud folder / S3 prefix hierarchy.
   */
  static async browseFolders(request: FastifyRequest, reply: FastifyReply) {
    const { id } = request.params as { id: string };
    const studioId = request.studioId!;
    const body = (request.body as { parentFolderId?: string }) || {};

    const connection = await prisma.storageConnection.findFirst({
      where: { id, studio_id: studioId },
    });

    if (!connection) {
      return reply.status(404).send({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Storage connection not found' },
      });
    }

    try {
      const tokens = decryptTokens<Record<string, any>>(connection.access_token || (connection as any).credentials_encrypted || '');
      let folders = [];

      switch (connection.provider) {
        case StorageProviderType.GOOGLE_DRIVE: {
          const p = new GoogleDriveProvider({
            clientId: process.env.GOOGLE_CLIENT_ID || '',
            clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
            redirectUri: '',
            accessToken: tokens.accessToken,
            refreshToken: tokens.refreshToken,
          });
          folders = await p.browseFolders(body.parentFolderId || 'root');
          break;
        }
        case StorageProviderType.DROPBOX: {
          const p = new DropboxProvider({
            clientId: process.env.DROPBOX_CLIENT_ID || '',
            clientSecret: process.env.DROPBOX_CLIENT_SECRET || '',
            redirectUri: '',
            accessToken: tokens.accessToken,
            refreshToken: tokens.refreshToken,
          });
          folders = await p.browseFolders(body.parentFolderId || '');
          break;
        }
        case StorageProviderType.ONEDRIVE: {
          const p = new OneDriveProvider({
            clientId: process.env.MICROSOFT_CLIENT_ID || '',
            clientSecret: process.env.MICROSOFT_CLIENT_SECRET || '',
            redirectUri: '',
            accessToken: tokens.accessToken,
            refreshToken: tokens.refreshToken,
          });
          folders = await p.browseFolders(body.parentFolderId || 'root');
          break;
        }
        case StorageProviderType.S3:
        case StorageProviderType.CLOUDFLARE_R2:
        case StorageProviderType.GENERIC_S3: {
          const config = (connection.configuration as Record<string, any>) || {};
          const p = new S3Provider({
            providerType: connection.provider as any,
            bucket: config.bucket || '',
            region: config.region,
            endpoint: config.endpoint,
            prefix: config.prefix,
            accessKeyId: tokens.accessKeyId || tokens.accessToken || '',
            secretAccessKey: tokens.secretAccessKey || tokens.refreshToken || '',
            sessionToken: tokens.sessionToken,
            customDomain: config.customDomain,
          });
          folders = await p.browseFolders(body.parentFolderId || '');
          break;
        }
        default: {
          const p = StorageService.getProvider(connection.provider as any);
          folders = p && (p as any).browseFolders ? await (p as any).browseFolders(body.parentFolderId) : [];
        }
      }

      return reply.send({
        success: true,
        data: folders,
      });
    } catch (err: any) {
      if (err?.isRevoked || err?.message?.includes('invalid_grant')) {
        await prisma.storageConnection.update({
          where: { id },
          data: { status: StorageConnectionStatus.REAUTH_REQUIRED },
        });
      }
      return reply.status(500).send({
        success: false,
        error: { code: 'BROWSE_FAILED', message: err.message },
      });
    }
  }

  /**
   * POST /api/storage/connections/:id/select-folder
   * Sets target folder/prefix to sync for this connection.
   */
  static async selectFolder(request: FastifyRequest, reply: FastifyReply) {
    const { id } = request.params as { id: string };
    const studioId = request.studioId!;
    const body = z
      .object({
        folderId: z.string().min(1),
        folderName: z.string().min(1),
        folderPath: z.string().optional(),
        storageMode: z.nativeEnum(StorageMode).optional(),
      })
      .parse(request.body);

    const connection = await prisma.storageConnection.findFirst({
      where: { id, studio_id: studioId },
    });

    if (!connection) {
      return reply.status(404).send({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Storage connection not found' },
      });
    }

    const updated = await prisma.storageConnection.update({
      where: { id },
      data: {
        configuration: {
          folder_id: body.folderId,
          folder_name: body.folderName,
          folder_path: body.folderPath || body.folderName,
        },
        storage_mode: (body.storageMode as any) || connection.storage_mode,
      },
    });

    const folderConfig = (updated.configuration as Record<string, any>) || {};

    await prisma.auditLog.create({
      data: {
        studio_id: studioId,
        action: 'STORAGE_FOLDER_SELECTED',
        resource_type: 'STORAGE_CONNECTION',
        resource_id: updated.id,
        metadata: {
          folderId: folderConfig.folder_id,
          folderName: folderConfig.folder_name,
          folderPath: folderConfig.folder_path,
          storageMode: updated.storage_mode,
        },
      },
    }).catch(() => null);

    return reply.send({
      success: true,
      data: {
        id: updated.id,
        folder_id: folderConfig.folder_id,
        folder_name: folderConfig.folder_name,
        folder_path: folderConfig.folder_path,
        storage_mode: updated.storage_mode,
      },
    });
  }

  /**
   * POST /api/storage/connections/:id/sync
   * Triggers an asynchronous cloud sync job on BullMQ.
   */
  static async triggerSync(request: FastifyRequest, reply: FastifyReply) {
    const { id } = request.params as { id: string };
    const studioId = request.studioId!;
    const body = z
      .object({
        galleryId: z.string().min(1),
        folderId: z.string().optional(),
        isIncremental: z.boolean().optional(),
      })
      .parse(request.body);

    const connection = await prisma.storageConnection.findFirst({
      where: { id, studio_id: studioId },
    });

    if (!connection) {
      return reply.status(404).send({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Storage connection not found' },
      });
    }

    const gallery = await prisma.gallery.findFirst({
      where: { id: body.galleryId, studio_id: studioId },
    });

    if (!gallery) {
      return reply.status(404).send({
        success: false,
        error: { code: 'GALLERY_NOT_FOUND', message: 'Gallery not found' },
      });
    }

    const connConfig = (connection.configuration as Record<string, any>) || {};
    const syncJob = await prisma.storageSyncJob.create({
      data: {
        storage_connection_id: id,
        gallery_id: body.galleryId,
        studio_id: studioId,
        status: StorageSyncStatus.QUEUED,
      },
    });

    await prisma.auditLog.create({
      data: {
        studio_id: studioId,
        action: 'STORAGE_SYNC_TRIGGERED',
        resource_type: 'STORAGE_CONNECTION',
        resource_id: id,
        metadata: {
          jobId: syncJob.id,
          galleryId: body.galleryId,
          folderId: body.folderId || connConfig.folder_id || undefined,
        },
      },
    }).catch(() => null);

    const dispatchResult = await dispatchStorageSync({
      jobId: syncJob.id,
      connectionId: id,
      studioId,
      galleryId: body.galleryId,
      folderId: body.folderId || connConfig.folder_id || undefined,
      isIncremental: body.isIncremental,
    });

    return reply.status(202).send({
      success: true,
      data: {
        jobId: syncJob.id,
        status: syncJob.status,
        enqueued: dispatchResult.enqueued,
      },
    });
  }

  /**
   * GET /api/storage/sync-jobs/:id
   * Polls the status and metrics of a storage sync job.
   */
  static async getSyncJobStatus(request: FastifyRequest, reply: FastifyReply) {
    const { id } = request.params as { id: string };
    const studioId = request.studioId!;

    const job = await prisma.storageSyncJob.findUnique({
      where: { id },
      include: {
        storage_connection: true,
        gallery: { select: { id: true, title: true } },
      },
    });

    if (!job || job.storage_connection.studio_id !== studioId) {
      return reply.status(404).send({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Sync job not found' },
      });
    }

    return reply.send({
      success: true,
      data: {
        id: job.id,
        connection_id: job.storage_connection_id,
        gallery_id: job.gallery_id,
        gallery_title: job.gallery.title,
        status: job.status,
        files_discovered: job.files_discovered,
        files_imported: job.files_imported,
        files_skipped: job.files_skipped,
        files_failed: job.files_failed,
        bytes_transferred: 0,
        error_message: job.error_message,
        started_at: job.started_at,
        completed_at: job.completed_at,
        created_at: job.created_at,
      },
    });
  }

  /**
   * DELETE /api/storage/connections/:id
   * Disconnects a storage provider and removes record.
   */
  static async disconnectConnection(request: FastifyRequest, reply: FastifyReply) {
    const { id } = request.params as { id: string };
    const studioId = request.studioId!;

    const connection = await prisma.storageConnection.findFirst({
      where: { id, studio_id: studioId },
    });

    if (!connection) {
      return reply.status(404).send({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Storage connection not found' },
      });
    }

    if (connection.provider === StorageProviderType.PLATFORM) {
      return reply.status(400).send({
        success: false,
        error: { code: 'CANNOT_DISCONNECT_PLATFORM', message: 'Platform Storage cannot be disconnected' },
      });
    }

    await prisma.storageConnection.delete({
      where: { id },
    });

    await prisma.auditLog.create({
      data: {
        studio_id: studioId,
        action: 'STORAGE_CONNECTION_DELETED',
        resource_type: 'STORAGE_CONNECTION',
        resource_id: id,
        metadata: {
          provider: connection.provider,
        },
      },
    }).catch(() => null);

    return reply.send({
      success: true,
      message: 'Storage connection successfully disconnected',
    });
  }

  /**
   * GET /api/storage/test/:provider
   */
  static async testConnection(request: FastifyRequest, reply: FastifyReply) {
    const { provider } = request.params as { provider: StorageProviderType };
    const storageProvider = StorageService.getProvider(provider as any);
    const result = await storageProvider.testConnection();

    return reply.send({
      success: true,
      data: result,
    });
  }
}
