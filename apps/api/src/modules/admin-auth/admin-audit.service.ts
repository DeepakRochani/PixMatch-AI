import { prisma } from '@pixmatch/database';
import { AdminAuthEventType, LogLevel, CanonicalService } from '@pixmatch/types';
import { hashMetadataIdentifier } from '@pixmatch/auth';
import { structuredLogger } from '../reliability/structured-logger.js';
import crypto from 'crypto';

export interface AdminAuditEventParams {
  admin_user_id?: string | null;
  email?: string | null;
  event_type: AdminAuthEventType;
  status?: string;
  request_id?: string | null;
  correlation_id?: string | null;
  ip?: string | null;
  user_agent?: string | null;
  details?: string | null;
  metadata?: Record<string, unknown>;
}

export class AdminAuditService {
  private static mockEvents: any[] = [];

  public static redactSensitiveData(meta: Record<string, any> | undefined): Record<string, any> {
    if (!meta || typeof meta !== 'object') return {};
    const sanitized: Record<string, any> = {};

    const isSensitive = (k: string) => {
      const lower = k.toLowerCase();
      return (
        lower.includes('password') ||
        lower.includes('secret') ||
        (lower.includes('token') && !lower.includes('hash')) ||
        lower.includes('otp') ||
        lower.includes('code') ||
        lower.includes('recovery') ||
        lower.includes('cookie')
      );
    };

    for (const [key, value] of Object.entries(meta)) {
      if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
        sanitized[key] = this.redactSensitiveData(value as Record<string, any>);
      } else if (Array.isArray(value)) {
        sanitized[key] = value.map((item) =>
          typeof item === 'object' && item !== null ? this.redactSensitiveData(item) : isSensitive(key) ? '[REDACTED]' : item
        );
      } else if (isSensitive(key)) {
        sanitized[key] = '[REDACTED]';
      } else {
        sanitized[key] = value;
      }
    }
    return sanitized;
  }

  public static async recordEvent(params: AdminAuditEventParams): Promise<any> {
    const requestId = params.request_id || `req_${crypto.randomUUID().slice(0, 8)}`;
    const correlationId = params.correlation_id || `corr_${crypto.randomUUID().slice(0, 8)}`;
    const ipHash = hashMetadataIdentifier(params.ip);
    const userAgentHash = hashMetadataIdentifier(params.user_agent);
    const sanitizedMeta = this.redactSensitiveData(params.metadata);

    // 1. Structured JSON Log (Phase 41)
    try {
      const logLevel = params.status === 'FAILURE' || params.status === 'FAILED' ? LogLevel.WARN : LogLevel.INFO;
      structuredLogger.log(
        logLevel,
        `[ADMIN_AUTH] ${params.event_type} - ${params.email || params.admin_user_id || 'Unknown'} (${params.status || 'SUCCESS'})`,
        {
          service: CanonicalService.ADMIN,
          correlationId,
          traceId: requestId,
          metadata: {
            event_type: params.event_type,
            admin_user_id: params.admin_user_id,
            status: params.status || 'SUCCESS',
            details: params.details,
            ip_hash: ipHash,
            ...sanitizedMeta,
          },
        }
      );
    } catch {
      // Ignore logging failure in test runs
    }

    const eventRecord = {
      id: `ev_${crypto.randomUUID().slice(0, 12)}`,
      admin_user_id: params.admin_user_id || null,
      email: params.email ? params.email.trim().toLowerCase() : null,
      event_type: params.event_type,
      status: params.status || 'SUCCESS',
      request_id: requestId,
      correlation_id: correlationId,
      ip_hash: ipHash,
      user_agent_hash: userAgentHash,
      ip_address_masked: params.ip ? params.ip.replace(/(\d+)\.(\d+)\.(\d+)\.(\d+)/, '$1.$2.$3.xxx') : '127.0.0.xxx',
      details: params.details || null,
      metadata: sanitizedMeta,
      created_at: new Date(),
    };

    // 2. In-Memory buffer
    this.mockEvents.unshift(eventRecord);
    if (this.mockEvents.length > 500) {
      this.mockEvents.pop();
    }

    // 3. Database Persistence
    try {
      if (process.env.DATABASE_URL && prisma && (prisma as any).platformAdminAuthEvent) {
        await (prisma as any).platformAdminAuthEvent.create({
          data: {
            admin_user_id: params.admin_user_id || null,
            email: params.email ? params.email.trim().toLowerCase() : null,
            event_type: params.event_type,
            status: params.status || 'SUCCESS',
            request_id: requestId,
            correlation_id: correlationId,
            ip_hash: ipHash,
            user_agent_hash: userAgentHash,
            details: params.details || null,
            metadata: sanitizedMeta ? (sanitizedMeta as any) : undefined,
          },
        });
      }
    } catch {
      // Fallback
    }

    return eventRecord;
  }

  public static async getRecentEvents(limit = 50): Promise<any[]> {
    try {
      if (process.env.DATABASE_URL && prisma && (prisma as any).platformAdminAuthEvent) {
        return await (prisma as any).platformAdminAuthEvent.findMany({
          take: limit,
          orderBy: { created_at: 'desc' },
        });
      }
    } catch {
      // Fallback
    }
    return this.mockEvents.slice(0, limit);
  }

  public static async logAction(params: {
    admin_user_id?: string | null;
    action: string;
    target_id?: string | null;
    target_type?: string | null;
    details?: any;
    metadata?: any;
    request_id?: string | null;
    correlation_id?: string | null;
    ip?: string | null;
    user_agent?: string | null;
  }): Promise<any> {
    const eventParams: AdminAuditEventParams = {
      admin_user_id: params.admin_user_id,
      event_type: (params.action as any) || AdminAuthEventType.ADMIN_ACTION,
      status: 'SUCCESS',
      request_id: params.request_id,
      correlation_id: params.correlation_id,
      ip: params.ip,
      user_agent: params.user_agent,
      details: typeof params.details === 'string' ? params.details : JSON.stringify(params.details || {}),
      metadata: {
        action: params.action,
        target_id: params.target_id,
        target_type: params.target_type,
        ...(typeof params.details === 'object' && params.details !== null ? params.details : {}),
        ...(params.metadata || {}),
      },
    };
    return await this.recordEvent(eventParams);
  }

  public static resetMockStore(): void {
    this.mockEvents = [];
  }
}

