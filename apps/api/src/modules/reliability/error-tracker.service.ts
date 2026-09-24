import crypto from 'crypto';
import {
  PlatformErrorSeverity,
  PlatformErrorStatus,
  PlatformErrorEventDTO,
  ErrorFilterParams,
  ErrorSummaryDTO,
} from '@pixmatch/types';
import { sanitizeLogData } from './structured-logger';
import { prisma } from '@pixmatch/database';

export interface RecordErrorInput {
  service: string;
  error_name: string;
  message: string;
  stack?: string;
  severity?: PlatformErrorSeverity;
  correlation_id?: string;
  trace_id?: string;
  user_id?: string;
  studio_id?: string;
  endpoint?: string;
  metadata?: Record<string, unknown>;
}

export class ErrorTrackerService {
  private static instance: ErrorTrackerService;
  private inMemoryErrors: Map<string, PlatformErrorEventDTO> = new Map();

  private constructor() {}

  public static getInstance(): ErrorTrackerService {
    if (!ErrorTrackerService.instance) {
      ErrorTrackerService.instance = new ErrorTrackerService();
    }
    return ErrorTrackerService.instance;
  }

  public normalizeMessage(message: string): string {
    return message
      .replace(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi, '[UUID]')
      .replace(/\b\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?Z?\b/g, '[TIMESTAMP]')
      .replace(/\b[0-9a-f]{24}\b/gi, '[OBJECTID]')
      .replace(/\b\d+\b/g, '[NUM]')
      .replace(/(https?:\/\/[^\s]+)/gi, '[URL]')
      .replace(/(Bearer\s+)[a-zA-Z0-9._-]+/gi, '$1[TOKEN]')
      .trim();
  }

  public sanitizeStackTrace(stack: string): string {
    return String(sanitizeLogData(stack))
      .replace(/eyJ[a-zA-Z0-9_-]+/g, '[REDACTED_JWT]')
      .replace(/(Bearer\s+)[a-zA-Z0-9._-]+/gi, '$1[TOKEN]')
      .replace(/token\s+[a-zA-Z0-9._-]+/gi, 'token [REDACTED_TOKEN]');
  }

  /**
   * Generates a deterministic SHA-256 fingerprint for an error
   */
  public generateFingerprint(
    arg1: string,
    arg2: string,
    arg3?: string,
    arg4?: string
  ): string {
    let service = '';
    let errorName = 'Error';
    let message = '';
    let stack = '';

    if (arg3 !== undefined && arg4 !== undefined) {
      // (service, errorName, message, stack)
      service = arg1;
      errorName = arg2;
      message = arg3;
      stack = arg4 || '';
    } else if (arg3 !== undefined) {
      // (message, location/stack, service)
      message = arg1;
      stack = arg2;
      service = arg3;
    } else {
      message = arg1;
      service = arg2;
    }

    const normalizedMessage = this.normalizeMessage(message);
    let normalizedStack = '';
    if (stack) {
      normalizedStack = stack
        .split('\n')
        .slice(0, 4)
        .map((line) => line.trim().replace(/:[0-9]+:[0-9]+/g, ''))
        .join('|');
    }

    const rawSignature = `${service.toUpperCase()}:${errorName}:${normalizedMessage}:${normalizedStack}`;
    return crypto.createHash('sha256').update(rawSignature).digest('hex');
  }

  /**
   * Records or increments an error event
   */
  public async captureError(input: RecordErrorInput): Promise<PlatformErrorEventDTO> {
    const service = input.service.toUpperCase();
    const errorName = input.error_name || 'Error';
    const rawMessage = input.message || 'Unknown error occurred';
    const severity = input.severity || PlatformErrorSeverity.HIGH;
    const sanitizedMeta = input.metadata ? (sanitizeLogData(input.metadata) as Record<string, unknown>) : {};
    const sanitizedMessage = String(sanitizeLogData(rawMessage));
    const sanitizedStack = input.stack ? this.sanitizeStackTrace(input.stack) : undefined;

    const fingerprint = this.generateFingerprint(service, errorName, sanitizedMessage, sanitizedStack);
    const now = new Date();

    // 1. Check in-memory store
    const existing = this.inMemoryErrors.get(fingerprint);
    let errorDto: PlatformErrorEventDTO;

    if (existing) {
      existing.occurrence_count += 1;
      existing.occurrences = existing.occurrence_count;
      existing.last_seen_at = now.toISOString();
      existing.lastSeenAt = now.toISOString();
      if (existing.status === PlatformErrorStatus.RESOLVED) {
        existing.status = PlatformErrorStatus.UNRESOLVED; // Regressed back to UNRESOLVED
      }
      existing.correlation_id = input.correlation_id || existing.correlation_id;
      existing.trace_id = input.trace_id || existing.trace_id;
      this.inMemoryErrors.set(fingerprint, existing);
      errorDto = existing;
    } else {
      errorDto = {
        id: `err_${crypto.randomUUID()}`,
        service,
        error_name: errorName,
        errorName: errorName,
        message: sanitizedMessage,
        stack: sanitizedStack,
        stackTrace: sanitizedStack,
        fingerprint,
        severity,
        status: PlatformErrorStatus.UNRESOLVED,
        occurrence_count: 1,
        occurrences: 1,
        first_seen_at: now.toISOString(),
        firstSeenAt: now.toISOString(),
        last_seen_at: now.toISOString(),
        lastSeenAt: now.toISOString(),
        correlation_id: input.correlation_id,
        correlationId: input.correlation_id,
        trace_id: input.trace_id,
        traceId: input.trace_id,
        user_id: input.user_id,
        userId: input.user_id,
        studio_id: input.studio_id,
        studioId: input.studio_id,
        endpoint: input.endpoint,
        metadata: sanitizedMeta,
      };
      this.inMemoryErrors.set(fingerprint, errorDto);
    }

    // 2. Try persisting to Prisma (PlatformErrorEvent) if DB available
    try {
      if (prisma && (prisma as any).platformErrorEvent) {
        const dbExisting = await (prisma as any).platformErrorEvent.findUnique({
          where: { fingerprint },
        });

        if (dbExisting) {
          await (prisma as any).platformErrorEvent.update({
            where: { fingerprint },
            data: {
              occurrence_count: { increment: 1 },
              last_seen_at: now,
              status: dbExisting.status === PlatformErrorStatus.RESOLVED ? PlatformErrorStatus.UNRESOLVED : undefined,
            },
          });
        } else {
          await (prisma as any).platformErrorEvent.create({
            data: {
              id: errorDto.id,
              service,
              error_name: errorName,
              message: sanitizedMessage,
              stack: sanitizedStack,
              fingerprint,
              severity,
              status: PlatformErrorStatus.UNRESOLVED,
              occurrence_count: 1,
              first_seen_at: now,
              last_seen_at: now,
              correlation_id: input.correlation_id,
              trace_id: input.trace_id,
              user_id: input.user_id,
              studio_id: input.studio_id,
              endpoint: input.endpoint,
              metadata: sanitizedMeta as any,
            },
          });
        }
      }
    } catch {
      // Fallback
    }

    return errorDto;
  }

  /**
   * Filter and query errors with pagination
   */
  public async getErrors(params: ErrorFilterParams = {}): Promise<{
    errors: PlatformErrorEventDTO[];
    total: number;
    page: number;
    limit: number;
  }> {
    let items = Array.from(this.inMemoryErrors.values());

    if (params.service) {
      items = items.filter((e) => e.service.toUpperCase() === params.service!.toUpperCase());
    }
    if (params.severity) {
      items = items.filter((e) => e.severity === params.severity);
    }
    if (params.status) {
      items = items.filter((e) => e.status === params.status);
    }
    if (params.search) {
      const q = params.search.toLowerCase();
      items = items.filter(
        (e) =>
          (e.error_name || '').toLowerCase().includes(q) ||
          (e.message || '').toLowerCase().includes(q) ||
          e.fingerprint.includes(q)
      );
    }

    // Sort by last_seen_at desc
    items.sort((a, b) => new Date(b.last_seen_at).getTime() - new Date(a.last_seen_at).getTime());

    const page = params.page || 1;
    const limit = params.limit || 50;
    const offset = (page - 1) * limit;
    const paginated = items.slice(offset, offset + limit);

    return {
      errors: paginated,
      total: items.length,
      page,
      limit,
    };
  }

  /**
   * Get single error details by ID or fingerprint
   */
  public async getErrorById(idOrFingerprint: string): Promise<PlatformErrorEventDTO | null> {
    const byFingerprint = this.inMemoryErrors.get(idOrFingerprint);
    if (byFingerprint) return byFingerprint;

    for (const err of this.inMemoryErrors.values()) {
      if (err.id === idOrFingerprint) return err;
    }

    try {
      if (prisma && (prisma as any).platformErrorEvent) {
        const dbErr = await (prisma as any).platformErrorEvent.findFirst({
          where: {
            OR: [{ id: idOrFingerprint }, { fingerprint: idOrFingerprint }],
          },
        });
        if (dbErr) {
          return {
            id: dbErr.id,
            service: dbErr.service,
            error_name: dbErr.error_name,
            errorName: dbErr.error_name,
            message: dbErr.message,
            stack: dbErr.stack || undefined,
            stackTrace: dbErr.stack || undefined,
            fingerprint: dbErr.fingerprint,
            severity: dbErr.severity as any,
            status: dbErr.status as any,
            occurrence_count: dbErr.occurrence_count,
            occurrences: dbErr.occurrence_count,
            first_seen_at: dbErr.first_seen_at.toISOString(),
            firstSeenAt: dbErr.first_seen_at.toISOString(),
            last_seen_at: dbErr.last_seen_at.toISOString(),
            lastSeenAt: dbErr.last_seen_at.toISOString(),
            resolved_at: dbErr.resolved_at?.toISOString(),
            resolved_by: dbErr.resolved_by || undefined,
            correlation_id: dbErr.correlation_id || undefined,
            trace_id: dbErr.trace_id || undefined,
            user_id: dbErr.user_id || undefined,
            studio_id: dbErr.studio_id || undefined,
            endpoint: dbErr.endpoint || undefined,
            metadata: dbErr.metadata as any,
          };
        }
      }
    } catch {
      // Fallback
    }

    return null;
  }

  /**
   * Update error status (ACKNOWLEDGE, RESOLVE, SUPPRESS, INVESTIGATING, UNRESOLVED)
   */
  public async updateErrorStatus(
    idOrFingerprint: string,
    status: PlatformErrorStatus,
    userId?: string
  ): Promise<PlatformErrorEventDTO | null> {
    const error = await this.getErrorById(idOrFingerprint);
    if (!error) return null;

    error.status = status;
    if (status === PlatformErrorStatus.RESOLVED) {
      error.resolved_at = new Date().toISOString();
      error.resolved_by = userId || 'SUPER_ADMIN';
    } else {
      error.resolved_at = undefined;
      error.resolved_by = undefined;
    }

    this.inMemoryErrors.set(error.fingerprint, error);

    try {
      if (prisma && (prisma as any).platformErrorEvent) {
        await (prisma as any).platformErrorEvent.updateMany({
          where: { fingerprint: error.fingerprint },
          data: {
            status: status as any,
            resolved_at: status === PlatformErrorStatus.RESOLVED ? new Date() : null,
            resolved_by: status === PlatformErrorStatus.RESOLVED ? (userId || 'SUPER_ADMIN') : null,
          },
        });
      }
    } catch {
      // Fallback
    }

    return error;
  }

  /**
   * Aggregated Error Summary
   */
  public async getErrorSummary(): Promise<ErrorSummaryDTO> {
    const errors = Array.from(this.inMemoryErrors.values());

    const total_errors_24h = errors.reduce((acc, curr) => acc + curr.occurrence_count, 0);
    const unhandled_count = errors.filter((e) => e.status === PlatformErrorStatus.UNRESOLVED || e.status === PlatformErrorStatus.OPEN).length;
    const resolved_count = errors.filter((e) => e.status === PlatformErrorStatus.RESOLVED).length;

    const by_severity: Record<PlatformErrorSeverity, number> = {
      [PlatformErrorSeverity.LOW]: 0,
      [PlatformErrorSeverity.MEDIUM]: 0,
      [PlatformErrorSeverity.HIGH]: 0,
      [PlatformErrorSeverity.CRITICAL]: 0,
    };

    const by_service: Record<string, number> = {};

    for (const e of errors) {
      by_severity[e.severity] = (by_severity[e.severity] || 0) + e.occurrence_count;
      by_service[e.service] = (by_service[e.service] || 0) + e.occurrence_count;
    }

    const top_frequent = [...errors]
      .sort((a, b) => b.occurrence_count - a.occurrence_count)
      .slice(0, 10);

    return {
      total_errors_24h,
      unhandled_count,
      resolved_count,
      by_severity,
      by_service,
      top_frequent,
    };
  }

  public async trackError(input: {
    service: string;
    message: string;
    severity?: PlatformErrorSeverity;
    stackTrace?: string;
    stack?: string;
    errorName?: string;
    metadata?: Record<string, unknown>;
    correlationId?: string;
    traceId?: string;
  }): Promise<PlatformErrorEventDTO> {
    return this.captureError({
      service: input.service,
      error_name: input.errorName || 'Error',
      message: input.message,
      stack: input.stackTrace || input.stack,
      severity: input.severity,
      metadata: input.metadata,
      correlation_id: input.correlationId,
      trace_id: input.traceId,
    });
  }

  public async updateStatus(idOrFingerprint: string, status: PlatformErrorStatus): Promise<PlatformErrorEventDTO | null> {
    return this.updateErrorStatus(idOrFingerprint, status);
  }

  public async listErrors(params?: ErrorFilterParams): Promise<PlatformErrorEventDTO[]> {
    const result = await this.getErrors(params);
    return result.errors;
  }

  public async getSummary(): Promise<any> {
    const s = await this.getErrorSummary();
    return {
      totalErrors: s.total_errors_24h,
      unresolvedErrors: s.unhandled_count,
      criticalErrors: s.by_severity[PlatformErrorSeverity.CRITICAL] || 0,
      errorsByService: s.by_service,
      ...s,
    };
  }

  public clear(): void {
    this.inMemoryErrors.clear();
  }
}

export const errorTracker = ErrorTrackerService.getInstance();
export const errorTrackerService = errorTracker;
