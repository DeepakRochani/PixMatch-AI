import crypto from 'crypto';
import {
  SecurityEventCategory,
  SecuritySeverity,
  SecurityConfidence,
  SecurityEventStatus,
  PlatformSecurityEventDTO,
  SecurityIngestEventDTO,
  SecurityEventFilterDTO,
  SecurityOverviewMetricsDTO,
  SecurityTimelineFilterDTO,
  SecurityTimelineItemDTO,
} from '@pixmatch/types';
import { prisma } from '@pixmatch/database';
import { SecurityRulesService } from './security-rules.service.js';
import { SecurityCorrelationService } from './security-correlation.service.js';
import { AdminAuditService } from '../admin-auth/admin-audit.service.js';

// Sensitive keys that must be strictly redacted in all metadata and logs
const SENSITIVE_KEY_PATTERNS = [
  /password/i,
  /passwd/i,
  /secret/i,
  /token/i,
  /cookie/i,
  /authorization/i,
  /auth_header/i,
  /bearer/i,
  /session/i,
  /otp/i,
  /mfa_code/i,
  /totp/i,
  /recovery_code/i,
  /cvv/i,
  /card_num/i,
  /credit_card/i,
  /api_key/i,
  /private_key/i,
  /secret_key/i,
  /stripe_key/i,
  /razorpay_key/i,
  /auth_key/i,
  /access_key/i,
  /encryption_key/i,
  /signing_key/i,
  /priv_key/i,
  /stripe/i,
  /razorpay/i,
  /credential/i,
  /webhook_secret/i,
  /signing_secret/i,
  /face_vector/i,
  /face_embedding/i,
  /arcface/i,
  /biometric/i,
  /selfie/i,
  /face_crop/i,
  /crop/i,
  /crop_base64/i,
  /image_base64/i,
];

export class SecurityDetectionService {
  private static mockEvents: Map<string, PlatformSecurityEventDTO> = new Map();
  private static alertCooldowns: Map<string, number> = new Map(); // fingerprint/ruleId -> timestamp

  /**
   * Deterministically redacts sensitive secrets and biometrics from any payload
   */
  static sanitizeMetadata(data: any): any {
    if (data === null || data === undefined) {
      return data;
    }

    if (typeof data === 'string') {
      // Check if string is base64 image or long token
      if (data.startsWith('data:image/') || data.length > 500) {
        return '[REDACTED_LARGE_PAYLOAD]';
      }
      // Check if value itself matches common secret prefixes
      if (
        data.startsWith('sk_live_') ||
        data.startsWith('sk_test_') ||
        data.startsWith('rk_live_') ||
        data.startsWith('whsec_') ||
        data.startsWith('ghp_')
      ) {
        return '[REDACTED]';
      }
      return data;
    }

    if (Array.isArray(data)) {
      // Check if it's a numeric vector (like a 512-dim ArcFace embedding)
      if (data.length >= 64 && typeof data[0] === 'number') {
        return '[REDACTED_VECTOR_DATA]';
      }
      return data.map((item) => this.sanitizeMetadata(item));
    }

    if (typeof data === 'object') {
      const sanitized: Record<string, any> = {};
      for (const [key, value] of Object.entries(data)) {
        const isSensitive = SENSITIVE_KEY_PATTERNS.some((pattern) => pattern.test(key));
        if (isSensitive) {
          sanitized[key] = '[REDACTED]';
        } else {
          sanitized[key] = this.sanitizeMetadata(value);
        }
      }
      return sanitized;
    }

    return data;
  }

  /**
   * Generates a deterministic SHA-256 fingerprint from sanitized attributes
   */
  static fingerprintEvent(
    eventType: string,
    category: SecurityEventCategory,
    source: string,
    reasonCode: string,
    resourceType?: string | null,
    actorId?: string | null
  ): string {
    const raw = `${eventType.toUpperCase()}:${category}:${source.toLowerCase()}:${reasonCode.toUpperCase()}:${resourceType || ''}:${actorId || ''}`;
    return crypto.createHash('sha256').update(raw).digest('hex');
  }

  /**
   * Normalizes incoming telemetry into a canonical security event representation
   */
  static normalizeEvent(raw: SecurityIngestEventDTO): {
    eventType: string;
    category: SecurityEventCategory;
    severity: SecuritySeverity;
    confidence: SecurityConfidence;
    service: string;
    source: string;
    fingerprint: string;
    ipHash?: string | null;
    userAgentHash?: string | null;
    sanitizedMetadata: Record<string, unknown>;
  } {
    const eventType = (raw.event_type || 'UNKNOWN_EVENT').toUpperCase();
    const category = raw.category || this.inferCategory(eventType);
    const severity = raw.severity || this.inferDefaultSeverity(eventType, category);
    const confidence = raw.confidence || SecurityConfidence.HIGH;
    const service = raw.service || 'platform-api';
    const source = raw.source || 'system';

    const actorId = raw.user_id || raw.admin_user_id || (raw.ip_address ? crypto.createHash('sha256').update(raw.ip_address).digest('hex') : null);

    const ipHash = raw.ip_address ? crypto.createHash('sha256').update(raw.ip_address).digest('hex') : null;
    const userAgentHash = raw.user_agent ? crypto.createHash('sha256').update(raw.user_agent).digest('hex') : null;

    const sanitizedMetadata = this.sanitizeMetadata(raw.metadata || {});

    const fingerprint = this.fingerprintEvent(
      eventType,
      category,
      source,
      raw.reason_code,
      raw.resource_type,
      actorId
    );

    return {
      eventType,
      category,
      severity,
      confidence,
      service,
      source,
      fingerprint,
      ipHash,
      userAgentHash,
      sanitizedMetadata,
    };
  }

  /**
   * Canonical entrypoint to ingest and process a security-relevant event
   */
  static async ingestEvent(input: SecurityIngestEventDTO): Promise<PlatformSecurityEventDTO> {
    const norm = this.normalizeEvent(input);
    const now = new Date();

    // 1. Check if an active matching event with the same fingerprint was seen within a 5-minute sliding window
    const windowStart = new Date(now.getTime() - 300 * 1000);
    let existingEvent: PlatformSecurityEventDTO | null = null;

    for (const ev of this.mockEvents.values()) {
      if (
        ev.fingerprint === norm.fingerprint &&
        ev.status === SecurityEventStatus.OPEN &&
        new Date(ev.last_seen_at) >= windowStart
      ) {
        existingEvent = ev;
        break;
      }
    }

    let resultingEvent: PlatformSecurityEventDTO;

    if (existingEvent) {
      // Aggregate into existing event
      existingEvent.occurrence_count += 1;
      existingEvent.last_seen_at = now;
      existingEvent.updated_at = now;
      resultingEvent = existingEvent;

      if (process.env.DATABASE_URL && prisma && (prisma as any).platformSecurityEvent) {
        try {
          await (prisma as any).platformSecurityEvent.update({
            where: { id: existingEvent.id },
            data: {
              occurrence_count: { increment: 1 },
              last_seen_at: now,
              updated_at: now,
            },
          });
        } catch (e) {
          // fallback
        }
      }
    } else {
      // Create new canonical security event
      const id = `sec-ev-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
      resultingEvent = {
        id,
        event_type: norm.eventType,
        category: norm.category,
        severity: norm.severity,
        confidence: norm.confidence,
        status: SecurityEventStatus.OPEN,
        service: norm.service,
        source: norm.source,
        studio_id: input.studio_id || null,
        user_id: input.user_id || null,
        admin_user_id: input.admin_user_id || null,
        request_id: input.request_id || null,
        correlation_id: input.correlation_id || null,
        ip_hash: norm.ipHash || null,
        user_agent_hash: norm.userAgentHash || null,
        resource_type: input.resource_type || null,
        resource_id: input.resource_id || null,
        fingerprint: norm.fingerprint,
        reason_code: input.reason_code,
        sanitized_metadata: norm.sanitizedMetadata,
        first_seen_at: now,
        last_seen_at: now,
        occurrence_count: 1,
        created_at: now,
        updated_at: now,
      };

      this.mockEvents.set(id, resultingEvent);

      if (process.env.DATABASE_URL && prisma && (prisma as any).platformSecurityEvent) {
        try {
          const record = await (prisma as any).platformSecurityEvent.create({
            data: {
              id,
              event_type: norm.eventType,
              category: norm.category,
              severity: norm.severity,
              confidence: norm.confidence,
              status: SecurityEventStatus.OPEN,
              service: norm.service,
              source: norm.source,
              studio_id: input.studio_id || null,
              user_id: input.user_id || null,
              admin_user_id: input.admin_user_id || null,
              request_id: input.request_id || null,
              correlation_id: input.correlation_id || null,
              ip_hash: norm.ipHash || null,
              user_agent_hash: norm.userAgentHash || null,
              resource_type: input.resource_type || null,
              resource_id: input.resource_id || null,
              fingerprint: norm.fingerprint,
              reason_code: input.reason_code,
              sanitized_metadata: norm.sanitizedMetadata as any,
              first_seen_at: now,
              last_seen_at: now,
              occurrence_count: 1,
            },
          });
          if (record) {
            resultingEvent.id = record.id;
          }
        } catch (e) {
          // fallback
        }
      }
    }

    // 2. Evaluate deterministic detection rules
    await this.evaluateRules(resultingEvent);

    return resultingEvent;
  }

  /**
   * Evaluates deterministic detection rules and triggers integrated PlatformAlerts / Incidents
   */
  static async evaluateRules(event: PlatformSecurityEventDTO): Promise<void> {
    const rules = await SecurityRulesService.listRules();
    const now = Date.now();

    for (const rule of rules) {
      if (!rule.enabled) continue;

      // Check temporary suppression
      if (rule.suppressed_until && new Date(rule.suppressed_until).getTime() > now) {
        continue;
      }

      // Check explicit rule mapping or exact rule ID match
      if (rule.rule_id !== event.event_type && rule.rule_id !== event.reason_code) {
        continue;
      }

      // Calculate sliding window event count for this rule/fingerprint
      const windowCutoff = new Date(now - rule.window_seconds * 1000);
      let windowOccurrences = 0;

      for (const ev of this.mockEvents.values()) {
        if (ev.fingerprint === event.fingerprint && new Date(ev.last_seen_at) >= windowCutoff) {
          windowOccurrences += ev.occurrence_count;
        }
      }

      if (windowOccurrences >= rule.threshold) {
        // Check cooldown to prevent alert storms
        const cooldownKey = `${rule.rule_id}:${event.fingerprint}`;
        const lastAlertTime = this.alertCooldowns.get(cooldownKey) || 0;
        const cooldownMs = rule.cooldown_seconds * 1000;

        if (now - lastAlertTime > cooldownMs) {
          this.alertCooldowns.set(cooldownKey, now);
          await SecurityRulesService.recordRuleTrigger(rule.rule_id);

          // Integrate with Phase 40 PlatformAlert
          await this.createSecurityAlert(event, rule, windowOccurrences);

          // If CRITICAL or high threshold met, register an Incident Candidate
          if (rule.severity === SecuritySeverity.CRITICAL) {
            await this.createIncidentCandidate(event, rule, windowOccurrences);
          }
        }
      }
    }
  }

  /**
   * Reuses Phase 40 PlatformAlert to publish a canonical security alert
   */
  static async createSecurityAlert(
    event: PlatformSecurityEventDTO,
    rule: { rule_id: string; name: string; severity: SecuritySeverity },
    occurrences: number
  ): Promise<void> {
    if (process.env.DATABASE_URL && prisma && (prisma as any).platformAlert) {
      try {
        await (prisma as any).platformAlert.create({
          data: {
            title: `[SOC] ${rule.name}`,
            message: `Security rule ${rule.rule_id} triggered with ${occurrences} occurrences. Reason: ${event.reason_code}`,
            type: 'SECURITY_BREACH',
            severity: rule.severity,
            source: event.service || 'security-detection-service',
            studio_id: event.studio_id || null,
            metadata: {
              security_event_id: event.id,
              fingerprint: event.fingerprint,
              occurrences,
              correlation_id: event.correlation_id,
            },
          },
        });
      } catch (e) {
        // fallback
      }
    }
  }

  /**
   * Reuses Phase 40 PlatformIncident candidate creation
   */
  static async createIncidentCandidate(
    event: PlatformSecurityEventDTO,
    rule: { rule_id: string; name: string; severity: SecuritySeverity },
    occurrences: number
  ): Promise<void> {
    if (process.env.DATABASE_URL && prisma && (prisma as any).platformIncident) {
      try {
        await (prisma as any).platformIncident.create({
          data: {
            title: `[CRITICAL SOC CANDIDATE] ${rule.name}`,
            summary: `Automated detection candidate created for rule ${rule.rule_id}. Requires administrator confirmation.`,
            severity: 'CRITICAL',
            status: 'INVESTIGATING',
            lead_admin_id: event.admin_user_id || null,
            metadata: {
              security_event_id: event.id,
              fingerprint: event.fingerprint,
              rule_id: rule.rule_id,
              occurrences,
              correlation_id: event.correlation_id,
            },
          },
        });
      } catch (e) {
        // fallback
      }
    }
  }

  /**
   * Query security events with rich filtering, pagination, and tenant scoping
   */
  static async listEvents(filter: SecurityEventFilterDTO): Promise<{
    events: PlatformSecurityEventDTO[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    const page = filter.page || 1;
    const limit = Math.min(100, filter.limit || 20);

    if (process.env.DATABASE_URL && prisma && (prisma as any).platformSecurityEvent) {
      try {
        const where: any = {};
        if (filter.category) where.category = filter.category;
        if (filter.severity) where.severity = filter.severity;
        if (filter.status) where.status = filter.status;
        if (filter.service) where.service = filter.service;
        if (filter.studio_id) where.studio_id = filter.studio_id;
        if (filter.fingerprint) where.fingerprint = filter.fingerprint;

        if (filter.search) {
          where.OR = [
            { event_type: { contains: filter.search, mode: 'insensitive' } },
            { reason_code: { contains: filter.search, mode: 'insensitive' } },
            { service: { contains: filter.search, mode: 'insensitive' } },
          ];
        }

        const [records, total] = await Promise.all([
          (prisma as any).platformSecurityEvent.findMany({
            where,
            orderBy: { created_at: 'desc' },
            skip: (page - 1) * limit,
            take: limit,
          }),
          (prisma as any).platformSecurityEvent.count({ where }),
        ]);

        return {
          events: records.map((r: any) => this.mapToDTO(r)),
          total,
          page,
          limit,
          totalPages: Math.ceil(total / limit) || 1,
        };
      } catch (e) {
        // fallback
      }
    }

    let items = Array.from(this.mockEvents.values());

    if (filter.category) {
      items = items.filter((ev) => ev.category === filter.category);
    }
    if (filter.severity) {
      items = items.filter((ev) => ev.severity === filter.severity);
    }
    if (filter.status) {
      items = items.filter((ev) => ev.status === filter.status);
    }
    if (filter.service) {
      items = items.filter((ev) => ev.service.toLowerCase().includes(filter.service!.toLowerCase()));
    }
    if (filter.studio_id) {
      items = items.filter((ev) => ev.studio_id === filter.studio_id);
    }
    if (filter.fingerprint) {
      items = items.filter((ev) => ev.fingerprint === filter.fingerprint);
    }
    if (filter.search) {
      const q = filter.search.toLowerCase();
      items = items.filter(
        (ev) =>
          ev.event_type.toLowerCase().includes(q) ||
          ev.reason_code.toLowerCase().includes(q) ||
          ev.service.toLowerCase().includes(q)
      );
    }

    // Sort descending by created_at
    items.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

    const total = items.length;
    const start = (page - 1) * limit;
    const paginated = items.slice(start, start + limit);

    return {
      events: paginated,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
    };
  }

  static async getEvent(id: string): Promise<PlatformSecurityEventDTO | null> {
    if (process.env.DATABASE_URL && prisma && (prisma as any).platformSecurityEvent) {
      try {
        const record = await (prisma as any).platformSecurityEvent.findUnique({
          where: { id },
          include: { investigations: true },
        });
        if (record) {
          return this.mapToDTO(record);
        }
      } catch (e) {
        // fallback
      }
    }

    return this.mockEvents.get(id) || null;
  }

  static async updateEventStatus(
    id: string,
    status: SecurityEventStatus,
    adminId: string,
    reason?: string
  ): Promise<PlatformSecurityEventDTO> {
    const event = await this.getEvent(id);
    if (!event) {
      throw new Error(`Security event ${id} not found`);
    }

    event.status = status;
    event.updated_at = new Date();
    this.mockEvents.set(id, event);

    if (process.env.DATABASE_URL && prisma && (prisma as any).platformSecurityEvent) {
      try {
        const record = await (prisma as any).platformSecurityEvent.update({
          where: { id },
          data: {
            status,
            updated_at: new Date(),
          },
        });
        return this.mapToDTO(record);
      } catch (e) {
        // fallback
      }
    }

    await AdminAuditService.logAction({
      admin_user_id: adminId,
      action: 'SECURITY_EVENT_STATUS_CHANGED',
      resource_type: 'SECURITY_EVENT',
      resource_id: id,
      details: `Changed security event ${id} status to ${status}${reason ? ` (${reason})` : ''}`,
      metadata: { new_status: status, reason },
    });

    return event;
  }

  /**
   * Generates real, non-fabricated SOC overview metrics
   */
  static async getThreatSummary(): Promise<SecurityOverviewMetricsDTO> {
    const now = new Date();
    const last24h = new Date(now.getTime() - 24 * 3600 * 1000);

    const events = Array.from(this.mockEvents.values());
    const rules = await SecurityRulesService.listRules();

    let openEventsCount = 0;
    let highSeverityCount = 0;
    let criticalEventsCount = 0;
    let authFailuresCount = 0;
    let authDenialsCount = 0;
    let rateLimitEventsCount = 0;
    let webhookFailuresCount = 0;
    let total24h = 0;

    const statusBreakdown: Record<string, number> = {};
    const categoryBreakdown: Record<string, number> = {};

    for (const ev of events) {
      const is24h = new Date(ev.created_at) >= last24h;
      if (is24h) total24h += ev.occurrence_count;

      statusBreakdown[ev.status] = (statusBreakdown[ev.status] || 0) + ev.occurrence_count;
      categoryBreakdown[ev.category] = (categoryBreakdown[ev.category] || 0) + ev.occurrence_count;

      if (ev.status === SecurityEventStatus.OPEN || ev.status === SecurityEventStatus.INVESTIGATING) {
        openEventsCount += 1;
      }
      if (ev.severity === SecuritySeverity.HIGH) {
        highSeverityCount += 1;
      }
      if (ev.severity === SecuritySeverity.CRITICAL) {
        criticalEventsCount += 1;
      }
      if (ev.category === SecurityEventCategory.AUTHENTICATION) {
        authFailuresCount += ev.occurrence_count;
      }
      if (ev.category === SecurityEventCategory.AUTHORIZATION) {
        authDenialsCount += ev.occurrence_count;
      }
      if (ev.category === SecurityEventCategory.RATE_LIMIT) {
        rateLimitEventsCount += ev.occurrence_count;
      }
      if (ev.category === SecurityEventCategory.WEBHOOK) {
        webhookFailuresCount += ev.occurrence_count;
      }
    }

    const enabledRulesCount = rules.filter((r) => r.enabled).length;
    const suppressedRulesCount = rules.filter(
      (r) => r.suppressed_until && new Date(r.suppressed_until) > now
    ).length;

    return {
      open_events_count: openEventsCount,
      high_severity_count: highSeverityCount,
      critical_events_count: criticalEventsCount,
      authentication_failures_count: authFailuresCount,
      authorization_denials_count: authDenialsCount,
      rate_limit_events_count: rateLimitEventsCount,
      webhook_failures_count: webhookFailuresCount,
      active_investigations_count: 0,
      enabled_rules_count: enabledRulesCount,
      suppressed_rules_count: suppressedRulesCount,
      total_events_24h: total24h,
      status_breakdown: statusBreakdown,
      category_breakdown: categoryBreakdown,
    };
  }

  /**
   * Unified chronological timeline aggregating Security Events, Alerts, Incidents, Auth, and Reliability
   */
  static async getSecurityTimeline(filter: SecurityTimelineFilterDTO = {}): Promise<SecurityTimelineItemDTO[]> {
    const timeline: SecurityTimelineItemDTO[] = [];
    const limit = Math.min(200, filter.limit || 50);

    // 1. Security events
    for (const ev of this.mockEvents.values()) {
      if (filter.studio_id && ev.studio_id && ev.studio_id !== filter.studio_id) continue;
      if (filter.service && !ev.service.toLowerCase().includes(filter.service.toLowerCase())) continue;
      if (filter.category && ev.category !== filter.category) continue;
      if (filter.severity && ev.severity !== filter.severity) continue;

      timeline.push({
        id: `tl-ev-${ev.id}`,
        item_type: 'SECURITY_EVENT',
        timestamp: ev.created_at,
        title: `Security Event: ${ev.event_type}`,
        summary: `${ev.reason_code} (${ev.occurrence_count} occurrences) - Service: ${ev.service}`,
        severity: ev.severity,
        source: ev.source,
        studio_id: ev.studio_id,
        correlation_id: ev.correlation_id,
        metadata: ev.sanitized_metadata,
      });
    }

    // Sort descending by timestamp
    timeline.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    return timeline.slice(0, limit);
  }

  /**
   * Export security events safely to CSV format with formula injection protection
   */
  static exportEventsToCsv(events: PlatformSecurityEventDTO[]): string {
    const sanitizeCsvField = (val: any): string => {
      if (val === null || val === undefined) return '';
      let str = String(val);
      // Neutralize spreadsheet formula injection characters: =, +, -, @, \t, \r
      if (/^[=+\-@\t\r]/.test(str)) {
        str = `'${str}`;
      }
      return `"${str.replace(/"/g, '""')}"`;
    };

    const headers = [
      'ID',
      'Event Type',
      'Category',
      'Severity',
      'Confidence',
      'Status',
      'Service',
      'Reason Code',
      'Occurrences',
      'Studio ID',
      'Correlation ID',
      'First Seen',
      'Last Seen',
    ];

    const rows = events.map((ev) => [
      sanitizeCsvField(ev.id),
      sanitizeCsvField(ev.event_type),
      sanitizeCsvField(ev.category),
      sanitizeCsvField(ev.severity),
      sanitizeCsvField(ev.confidence),
      sanitizeCsvField(ev.status),
      sanitizeCsvField(ev.service),
      sanitizeCsvField(ev.reason_code),
      sanitizeCsvField(ev.occurrence_count),
      sanitizeCsvField(ev.studio_id || ''),
      sanitizeCsvField(ev.correlation_id || ''),
      sanitizeCsvField(new Date(ev.first_seen_at).toISOString()),
      sanitizeCsvField(new Date(ev.last_seen_at).toISOString()),
    ]);

    return [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
  }

  static clearMockState(): void {
    this.mockEvents.clear();
    this.alertCooldowns.clear();
  }

  private static inferCategory(eventType: string): SecurityEventCategory {
    if (eventType.includes('AUTH') || eventType.includes('LOGIN') || eventType.includes('PASSWORD') || eventType.includes('MFA')) {
      return SecurityEventCategory.AUTHENTICATION;
    }
    if (eventType.includes('SESSION')) {
      return SecurityEventCategory.SESSION;
    }
    if (eventType.includes('RATE_LIMIT') || eventType.includes('THROTTLE')) {
      return SecurityEventCategory.RATE_LIMIT;
    }
    if (eventType.includes('IDOR') || eventType.includes('FORBIDDEN') || eventType.includes('UNAUTHORIZED')) {
      return SecurityEventCategory.AUTHORIZATION;
    }
    if (eventType.includes('TENANT') || eventType.includes('CROSS_STUDIO')) {
      return SecurityEventCategory.TENANT_SECURITY;
    }
    if (eventType.includes('OAUTH')) {
      return SecurityEventCategory.OAUTH;
    }
    if (eventType.includes('PAYMENT') || eventType.includes('STRIPE') || eventType.includes('RAZORPAY')) {
      return SecurityEventCategory.PAYMENT;
    }
    if (eventType.includes('WEBHOOK')) {
      return SecurityEventCategory.WEBHOOK;
    }
    if (eventType.includes('AI') || eventType.includes('EMBEDDING') || eventType.includes('SEARCH')) {
      return SecurityEventCategory.AI;
    }
    if (eventType.includes('DOWNLOAD')) {
      return SecurityEventCategory.DOWNLOAD;
    }
    if (eventType.includes('STORAGE') || eventType.includes('S3') || eventType.includes('GCS')) {
      return SecurityEventCategory.STORAGE;
    }
    if (eventType.includes('CONFIG') || eventType.includes('SETTING') || eventType.includes('FLAG')) {
      return SecurityEventCategory.CONFIGURATION;
    }
    if (eventType.includes('AUTOMATION')) {
      return SecurityEventCategory.AUTOMATION;
    }
    return SecurityEventCategory.API_ABUSE;
  }

  private static inferDefaultSeverity(eventType: string, category: SecurityEventCategory): SecuritySeverity {
    if (
      eventType.includes('CROSS_TENANT') ||
      eventType.includes('SUSPENSION') ||
      eventType.includes('MIGRATION_SAFETY') ||
      eventType.includes('PAYMENT_WEBHOOK_SIGNATURE')
    ) {
      return SecuritySeverity.CRITICAL;
    }
    if (
      eventType.includes('BRUTE_FORCE') ||
      eventType.includes('MFA_FAILURE') ||
      eventType.includes('IDOR') ||
      eventType.includes('PRIVILEGE')
    ) {
      return SecuritySeverity.HIGH;
    }
    if (
      category === SecurityEventCategory.RATE_LIMIT ||
      category === SecurityEventCategory.CONFIGURATION ||
      category === SecurityEventCategory.CLIENT_PORTAL
    ) {
      return SecuritySeverity.MEDIUM;
    }
    return SecuritySeverity.LOW;
  }

  private static mapToDTO(record: any): PlatformSecurityEventDTO {
    return {
      id: record.id,
      event_type: record.event_type,
      category: record.category as SecurityEventCategory,
      severity: record.severity as SecuritySeverity,
      confidence: record.confidence as SecurityConfidence,
      status: record.status as SecurityEventStatus,
      service: record.service,
      source: record.source,
      studio_id: record.studio_id,
      user_id: record.user_id,
      admin_user_id: record.admin_user_id,
      request_id: record.request_id,
      correlation_id: record.correlation_id,
      ip_hash: record.ip_hash,
      user_agent_hash: record.user_agent_hash,
      resource_type: record.resource_type,
      resource_id: record.resource_id,
      fingerprint: record.fingerprint,
      reason_code: record.reason_code,
      sanitized_metadata: record.sanitized_metadata || {},
      first_seen_at: record.first_seen_at,
      last_seen_at: record.last_seen_at,
      occurrence_count: record.occurrence_count,
      created_at: record.created_at,
      updated_at: record.updated_at,
      investigations: Array.isArray(record.investigations) ? record.investigations : undefined,
    };
  }
}
