/**
 * Client Portal Session Service — PixMatch AI Phase 27
 * Manages zero-login high-entropy cryptographically secure client sessions, token hashing,
 * session lifecycle, expiration, and revocation.
 */

import crypto from 'crypto';
import { prisma } from '@pixmatch/database';
import { IClientPortalSessionDTO } from '@pixmatch/types';
import { StudioBrandingService } from '../branding/studio-branding.service.js';

export interface CreateSessionOptions {
  expiresInDays?: number;
  expires_in_days?: number;
  ipAddress?: string;
  ip_address?: string;
  userAgent?: string;
  user_agent?: string;
  metadata?: Record<string, any>;
  studio_id?: string;
  client_id?: string;
}

export interface ValidatedSessionContext {
  sessionId: string;
  studioId: string;
  clientId: string;
  tokenHash: string;
  client: {
    id: string;
    name: string;
    first_name?: string | null;
    last_name?: string | null;
    email: string;
    phone?: string | null;
    company?: string | null;
  };
  studio: {
    id: string;
    name: string;
    slug: string;
    logo_url?: string | null;
    website?: string | null;
  };
}

export class ClientPortalSessionService {
  /**
   * Computes SHA-256 hash of a raw portal token.
   */
  static hashToken(rawToken: string): string {
    return crypto.createHash('sha256').update(rawToken.trim()).digest('hex');
  }

  /**
   * Generates a new high-entropy raw token.
   */
  static generateRawToken(): string {
    return crypto.randomBytes(32).toString('hex'); // 64 hex characters
  }

  /**
   * Create a new client portal session for a specific client.
   * Supports both object options and positional arguments.
   */
  static async createSession(
    studioIdOrParams: string | { studio_id?: string; studioId?: string; client_id?: string; clientId?: string; expires_in_days?: number; expiresInDays?: number },
    maybeClientId?: string,
    maybeOptions?: CreateSessionOptions
  ): Promise<{
    raw_token: string;
    session_id: string;
    token_hash: string;
    expires_at: Date;
    portal_url: string;
    session: any;
  }> {
    let studioId: string;
    let clientId: string;
    let expiresInDays = 30;
    let options: CreateSessionOptions | undefined;

    if (typeof studioIdOrParams === 'object') {
      studioId = (studioIdOrParams.studio_id || studioIdOrParams.studioId)!;
      clientId = (studioIdOrParams.client_id || studioIdOrParams.clientId)!;
      expiresInDays = studioIdOrParams.expires_in_days ?? studioIdOrParams.expiresInDays ?? 30;
      options = maybeOptions;
    } else {
      studioId = studioIdOrParams;
      clientId = maybeClientId!;
      expiresInDays = maybeOptions?.expires_in_days ?? maybeOptions?.expiresInDays ?? 30;
      options = maybeOptions;
    }

    if (!studioId || !clientId) {
      throw new Error('studio_id and client_id are required to create a client portal session.');
    }

    const client = await prisma.client.findFirst({
      where: { id: clientId, studio_id: studioId },
      include: { studio: true },
    });

    if (!client) {
      throw new Error(`Client not found: ${clientId}`);
    }

    if (client.studio && (client.studio as any).is_suspended) {
      throw new Error('Studio organization is currently suspended.');
    }

    const rawToken = this.generateRawToken();
    const tokenHash = this.hashToken(rawToken);
    const expiresAt = new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000);

    const ipAddress = options?.ipAddress || options?.ip_address;
    const ipHash = ipAddress
      ? crypto.createHash('sha256').update(ipAddress).digest('hex').substring(0, 16)
      : null;

    const userAgent = options?.userAgent || options?.user_agent;

    const session = await prisma.clientPortalSession.create({
      data: {
        studio_id: studioId,
        client_id: clientId,
        token_hash: tokenHash,
        raw_token_preview: `${rawToken.substring(0, 6)}...${rawToken.substring(rawToken.length - 4)}`,
        expires_at: expiresAt,
        ip_hash: ipHash,
        user_agent: userAgent ? userAgent.substring(0, 255) : null,
        metadata: options?.metadata || undefined,
        is_active: true,
        access_count: 0,
        last_accessed_at: null,
      },
    });

    const baseUrl = process.env.CLIENT_PORTAL_BASE_URL || 'http://localhost:3000';
    const portalUrl = `${baseUrl}/portal/client/${rawToken}`;

    return {
      raw_token: rawToken,
      session_id: session.id,
      token_hash: tokenHash,
      expires_at: expiresAt,
      portal_url: portalUrl,
      session,
    };
  }

  /**
   * Verify token and update telemetry. Returns null if invalid or expired.
   */
  static async verifyToken(
    rawToken: string,
    options?: { ip_address?: string; user_agent?: string }
  ): Promise<any | null> {
    if (!rawToken || typeof rawToken !== 'string' || rawToken.trim().length !== 64) {
      return null;
    }

    const tokenHash = this.hashToken(rawToken);

    const session = await prisma.clientPortalSession.findUnique({
      where: { token_hash: tokenHash },
      include: {
        client: true,
        studio: true,
      },
    });

    if (!session) {
      return null;
    }

    // Check active and revocation
    if (!session.is_active || session.revoked_at) {
      return null;
    }

    // Check expiration
    if (session.expires_at < new Date()) {
      return null;
    }

    // Check client active state
    if (session.client && (session.client.deleted_at || session.client.status === 'ARCHIVED')) {
      return null;
    }

    // Check studio suspended
    if (session.studio && (session.studio as any).is_suspended) {
      return null;
    }

    // Update telemetry
    const newAccessCount = (session.access_count || 0) + 1;
    const now = new Date();

    let updatedSession = session;
    try {
      updatedSession = await prisma.clientPortalSession.update({
        where: { id: session.id },
        data: {
          access_count: newAccessCount,
          last_accessed_at: now,
        },
      });
    } catch {
      // Non-blocking telemetry
    }

    return {
      ...session,
      ...updatedSession,
      access_count: newAccessCount,
      last_accessed_at: now,
    };
  }

  /**
   * Validates an incoming client portal token and resolves session context.
   * Throws safe HTTP errors if invalid, expired, revoked, or tenant is suspended.
   */
  static async validateToken(rawToken: string): Promise<ValidatedSessionContext> {
    if (!rawToken || typeof rawToken !== 'string' || rawToken.trim().length < 16) {
      const err = new Error('Invalid client portal token.');
      (err as any).statusCode = 404;
      throw err;
    }

    const session = await this.verifyToken(rawToken);

    if (!session) {
      const err = new Error('Client portal session not found, expired, or revoked.');
      (err as any).statusCode = 404;
      throw err;
    }

    return {
      sessionId: session.id,
      studioId: session.studio_id,
      clientId: session.client_id,
      tokenHash: session.token_hash,
      client: {
        id: session.client?.id || session.client_id,
        name: session.client?.name || 'Client',
        first_name: session.client?.first_name || null,
        last_name: session.client?.last_name || null,
        email: session.client?.email || '',
        phone: session.client?.phone || null,
        company: session.client?.company || null,
      },
      studio: {
        id: session.studio?.id || session.studio_id,
        name: session.studio?.name || 'Studio',
        slug: session.studio?.slug || '',
        logo_url: session.studio?.logo_url || null,
        website: session.studio?.website || null,
      },
    };
  }

  /**
   * Get full session DTO including branding.
   */
  static async getSessionDTO(rawToken: string): Promise<IClientPortalSessionDTO> {
    const context = await this.validateToken(rawToken);
    const branding = await StudioBrandingService.getBranding(context.studioId);

    return {
      id: context.sessionId,
      studio_id: context.studioId,
      client_id: context.clientId,
      token_preview: `${rawToken.substring(0, 6)}...`,
      expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      is_valid: true,
      client: context.client,
      studio: context.studio,
      branding,
    };
  }

  /**
   * Revoke a single session with strict IDOR verification.
   */
  static async revokeSession(
    sessionId: string,
    studioId: string
  ): Promise<{ id: string; is_active: boolean; revoked_at: Date }> {
    const session = await prisma.clientPortalSession.findFirst({
      where: { id: sessionId, studio_id: studioId },
    });

    if (!session) {
      throw new Error(`Session not found or forbidden: ${sessionId}`);
    }

    const now = new Date();
    await prisma.clientPortalSession.update({
      where: { id: sessionId },
      data: { is_active: false, revoked_at: now },
    });

    return { id: sessionId, is_active: false, revoked_at: now };
  }

  /**
   * List all active sessions for a client within a studio.
   */
  static async listSessionsForClient(clientId: string, studioId: string): Promise<any[]> {
    return prisma.clientPortalSession.findMany({
      where: {
        studio_id: studioId,
        client_id: clientId,
        is_active: true,
        revoked_at: null,
      },
      orderBy: { created_at: 'desc' },
    });
  }

  /**
   * Revoke all sessions for a client within a studio.
   */
  static async revokeAllSessionsForClient(
    clientId: string,
    studioId: string
  ): Promise<number> {
    const result = await prisma.clientPortalSession.updateMany({
      where: { studio_id: studioId, client_id: clientId, is_active: true, revoked_at: null },
      data: { is_active: false, revoked_at: new Date() },
    });

    return result.count;
  }

  static async revokeAllClientSessions(
    studioId: string,
    clientId: string
  ): Promise<{ count: number }> {
    const count = await this.revokeAllSessionsForClient(clientId, studioId);
    return { count };
  }

  /**
   * Generate QR code payload URL for client portal access.
   */
  static generateQrPayload(portalUrl: string): { qr_data: string; direct_url: string } {
    return {
      qr_data: portalUrl,
      direct_url: portalUrl,
    };
  }

  // =========================================================================
  // Instance method delegates for dependency injection or object usage
  // =========================================================================
  async createSession(studioIdOrParams: any, maybeClientId?: string, maybeOptions?: any) {
    return ClientPortalSessionService.createSession(studioIdOrParams, maybeClientId, maybeOptions);
  }

  async verifyToken(rawToken: string, options?: any) {
    return ClientPortalSessionService.verifyToken(rawToken, options);
  }

  async validateToken(rawToken: string) {
    return ClientPortalSessionService.validateToken(rawToken);
  }

  async getSessionDTO(rawToken: string) {
    return ClientPortalSessionService.getSessionDTO(rawToken);
  }

  async revokeSession(sessionId: string, studioId: string) {
    return ClientPortalSessionService.revokeSession(sessionId, studioId);
  }

  async listSessionsForClient(clientId: string, studioId: string) {
    return ClientPortalSessionService.listSessionsForClient(clientId, studioId);
  }

  async revokeAllSessionsForClient(clientId: string, studioId: string) {
    return ClientPortalSessionService.revokeAllSessionsForClient(clientId, studioId);
  }

  async revokeAllClientSessions(studioId: string, clientId: string) {
    return ClientPortalSessionService.revokeAllClientSessions(studioId, clientId);
  }

  generateQrPayload(portalUrl: string) {
    return ClientPortalSessionService.generateQrPayload(portalUrl);
  }
}
