import crypto from 'crypto';
import { LogLevel, StructuredLogEntry, CorrelationContext, CanonicalService } from '@pixmatch/types';

// Sensitive keys that must be redacted unconditionally
const SENSITIVE_KEY_PATTERNS = [
  /password/i,
  /secret/i,
  /token/i,
  /auth(orization)?/i,
  /cookie/i,
  /api[_-]?key/i,
  /database[_-]?url/i,
  /connection[_-]?string/i,
  /card/i,
  /cvv/i,
  /ssn/i,
  /private[_-]?key/i,
];

const BIOMETRIC_KEY_PATTERNS = [
  /embedding/i,
  /vector/i,
  /tensor/i,
  /selfie/i,
  /crop/i,
  /face/i,
];

export const REDACTED_SECRET = '[REDACTED_SECRET]';
export const REDACTED_BIOMETRIC_VECTOR = '[REDACTED_BIOMETRIC_VECTOR]';

/**
 * Deep recursive redaction function to scrub PII, secrets, and biometric vectors
 */
export function sanitizeLogData(data: unknown, depth = 0): unknown {
  if (depth > 6) return '[DEPTH_LIMIT]';
  if (data === null || data === undefined) return data;

  if (typeof data === 'string') {
    if (/bearer\s+[a-zA-Z0-9._-]+/i.test(data)) {
      return data.replace(/bearer\s+[a-zA-Z0-9._-]+/gi, 'Bearer [REDACTED_SECRET]');
    }
    if (/eyJ[a-zA-Z0-9._-]+/i.test(data)) {
      return data.replace(/eyJ[a-zA-Z0-9._-]+/gi, '[REDACTED_SECRET]');
    }
    if (/sk-[a-zA-Z0-9._-]+/i.test(data)) {
      return data.replace(/sk-[a-zA-Z0-9._-]+/gi, '[REDACTED_SECRET]');
    }
    if (/postgres(ql)?:\/\/[^:]+:[^@]+@/i.test(data)) {
      return data.replace(/postgres(ql)?:\/\/[^:]+:[^@]+@/gi, 'postgresql://[REDACTED_USER]:[REDACTED_SECRET]@');
    }
    return data;
  }

  if (typeof data === 'number' || typeof data === 'boolean') {
    return data;
  }

  if (Array.isArray(data)) {
    // If array looks like large float vectors/embeddings (>32 floats), redact vector payload
    if (data.length > 32 && typeof data[0] === 'number') {
      return REDACTED_BIOMETRIC_VECTOR;
    }
    return data.map((item) => sanitizeLogData(item, depth + 1));
  }

  if (typeof data === 'object') {
    const sanitizedObj: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(data as Record<string, unknown>)) {
      const isBiometricKey = BIOMETRIC_KEY_PATTERNS.some((pattern) => pattern.test(key));
      const isSensitiveKey = SENSITIVE_KEY_PATTERNS.some((pattern) => pattern.test(key));

      if (isBiometricKey && (Array.isArray(value) || typeof value === 'object')) {
        sanitizedObj[key] = REDACTED_BIOMETRIC_VECTOR;
      } else if (isSensitiveKey) {
        sanitizedObj[key] = REDACTED_SECRET;
      } else {
        sanitizedObj[key] = sanitizeLogData(value, depth + 1);
      }
    }
    return sanitizedObj;
  }

  return String(data);
}

export type EnrichedLogEntry = StructuredLogEntry & {
  traceId?: string;
  correlationId?: string;
  userId?: string;
  studioId?: string;
};

export class StructuredLogger {
  private static instance: StructuredLogger;
  private buffer: EnrichedLogEntry[] = [];
  private maxBufferSize = 2000;

  constructor() {}

  public static getInstance(): StructuredLogger {
    if (!StructuredLogger.instance) {
      StructuredLogger.instance = new StructuredLogger();
    }
    return StructuredLogger.instance;
  }

  /**
   * Generates or extracts a correlation context
   */
  public createCorrelationContext(
    service: string,
    existing?: Partial<CorrelationContext & { traceId?: string; correlationId?: string; userId?: string; studioId?: string }>
  ): CorrelationContext {
    const corrId = existing?.correlationId || existing?.correlation_id || `corr_${crypto.randomUUID()}`;
    const traceId = existing?.traceId || existing?.trace_id || `trace_${crypto.randomBytes(8).toString('hex')}`;
    return {
      correlation_id: corrId,
      trace_id: traceId,
      span_id: `span_${crypto.randomBytes(4).toString('hex')}`,
      service: existing?.service || service,
      environment: existing?.environment || process.env.NODE_ENV || 'production',
      user_id: existing?.userId || existing?.user_id,
      studio_id: existing?.studioId || existing?.studio_id,
    };
  }

  /**
   * Log an event with structured metadata and PII/secret scrubbing
   */
  public log(
    level: LogLevel,
    message: string,
    options: {
      service?: CanonicalService | string;
      context?: Partial<CorrelationContext>;
      error?: Error | { name?: string; message: string; stack?: string; code?: string };
      metadata?: Record<string, unknown>;
      traceId?: string;
      correlationId?: string;
      userId?: string;
      studioId?: string;
    } = {}
  ): EnrichedLogEntry {
    const now = new Date().toISOString();
    const service = options.service || options.context?.service || 'API_GATEWAY';
    const traceId = options.traceId || options.context?.trace_id || `trace_${crypto.randomBytes(8).toString('hex')}`;
    const correlationId = options.correlationId || options.context?.correlation_id || `corr_${crypto.randomUUID()}`;
    const userId = options.userId || options.context?.user_id;
    const studioId = options.studioId || options.context?.studio_id;

    let errorObj: StructuredLogEntry['error'] = undefined;
    if (options.error) {
      errorObj = {
        name: options.error.name || 'Error',
        message: options.error.message || String(options.error),
        stack: options.error.stack,
        code: (options.error as { code?: string }).code,
      };
      // Sanitize error message and stack
      errorObj = sanitizeLogData(errorObj) as StructuredLogEntry['error'];
    }

    const sanitizedMetadata = options.metadata
      ? (sanitizeLogData(options.metadata) as Record<string, unknown>)
      : undefined;

    const entry: EnrichedLogEntry = {
      timestamp: now,
      level,
      message,
      service: typeof service === 'string' ? service : String(service),
      correlation_id: correlationId,
      correlationId: correlationId,
      trace_id: traceId,
      traceId: traceId,
      span_id: options.context?.span_id,
      environment: options.context?.environment || process.env.NODE_ENV || 'production',
      user_id: userId,
      userId: userId,
      studio_id: studioId,
      studioId: studioId,
      error: errorObj,
      metadata: sanitizedMetadata,
    };

    // Push to rolling in-memory buffer
    this.buffer.push(entry);
    if (this.buffer.length > this.maxBufferSize) {
      this.buffer.shift();
    }

    // Output formatted JSON to stdout/stderr in non-test mode or formatted for observability
    const jsonOutput = JSON.stringify(entry);
    if (process.env.NODE_ENV !== 'test' && process.env.SILENT_TESTS !== 'true') {
      if (level === LogLevel.ERROR || level === LogLevel.FATAL) {
        console.error(jsonOutput);
      } else if (level === LogLevel.WARN) {
        console.warn(jsonOutput);
      } else {
        console.log(jsonOutput);
      }
    }

    return entry;
  }

  public debug(message: string, options: Parameters<StructuredLogger['log']>[2] = {}): EnrichedLogEntry {
    return this.log(LogLevel.DEBUG, message, options);
  }

  public info(message: string, options: Parameters<StructuredLogger['log']>[2] = {}): EnrichedLogEntry {
    return this.log(LogLevel.INFO, message, options);
  }

  public warn(message: string, options: Parameters<StructuredLogger['log']>[2] = {}): EnrichedLogEntry {
    return this.log(LogLevel.WARN, message, options);
  }

  public error(message: string, options: Parameters<StructuredLogger['log']>[2] = {}): EnrichedLogEntry {
    return this.log(LogLevel.ERROR, message, options);
  }

  public fatal(message: string, options: Parameters<StructuredLogger['log']>[2] = {}): EnrichedLogEntry {
    return this.log(LogLevel.FATAL, message, options);
  }

  public getBuffer(): EnrichedLogEntry[] {
    return [...this.buffer];
  }

  public clearBuffer(): void {
    this.buffer = [];
  }

  /**
   * Query recent logs from buffer with filtering
   */
  public query(filter: {
    service?: CanonicalService | string;
    level?: LogLevel;
    correlation_id?: string;
    correlationId?: string;
    trace_id?: string;
    traceId?: string;
    user_id?: string;
    userId?: string;
    studio_id?: string;
    studioId?: string;
    limit?: number;
    search?: string;
  } = {}): EnrichedLogEntry[] {
    let results = [...this.buffer];

    if (filter.service) {
      results = results.filter((entry) => entry.service.toLowerCase() === String(filter.service).toLowerCase());
    }
    if (filter.level) {
      results = results.filter((entry) => entry.level === filter.level);
    }
    if (filter.correlation_id || filter.correlationId) {
      const cid = filter.correlation_id || filter.correlationId;
      results = results.filter((entry) => entry.correlation_id === cid || entry.correlationId === cid);
    }
    if (filter.trace_id || filter.traceId) {
      const tid = filter.trace_id || filter.traceId;
      results = results.filter((entry) => entry.trace_id === tid || entry.traceId === tid);
    }
    if (filter.user_id || filter.userId) {
      const uid = filter.user_id || filter.userId;
      results = results.filter((entry) => entry.user_id === uid || entry.userId === uid);
    }
    if (filter.studio_id || filter.studioId) {
      const sid = filter.studio_id || filter.studioId;
      results = results.filter((entry) => entry.studio_id === sid || entry.studioId === sid);
    }
    if (filter.search) {
      const searchLower = filter.search.toLowerCase();
      results = results.filter((entry) =>
        entry.message.toLowerCase().includes(searchLower) ||
        JSON.stringify(entry.metadata || {}).toLowerCase().includes(searchLower)
      );
    }

    const limit = filter.limit || 100;
    return results.slice(-limit).reverse();
  }

  public queryLogs(filter: Parameters<StructuredLogger['query']>[0] = {}): EnrichedLogEntry[] {
    return this.query(filter);
  }
}

export const structuredLogger = StructuredLogger.getInstance();
export const logger = structuredLogger;
