import { PlatformSecurityEventDTO } from '@pixmatch/types';

export interface CorrelationQuery {
  fingerprint?: string;
  actor_ip_hash?: string;
  actor_user_id?: string;
  actor_admin_id?: string;
  studio_id?: string;
  resource_type?: string;
  resource_id?: string;
  correlation_id?: string;
  request_id?: string;
  time_window_seconds?: number;
}

export interface CorrelationResult {
  primary_event_id: string;
  correlation_key: string;
  correlated_events: PlatformSecurityEventDTO[];
  event_count: number;
  distinct_actors: number;
  time_span_seconds: number;
  severities_present: string[];
}

export class SecurityCorrelationService {
  /**
   * Correlate a target event with other events across multiple dimensions
   */
  static correlateEvent(
    targetEvent: PlatformSecurityEventDTO,
    eventPool: PlatformSecurityEventDTO[],
    options: {
      matchFingerprint?: boolean;
      matchActor?: boolean;
      matchStudio?: boolean;
      matchResource?: boolean;
      matchCorrelationId?: boolean;
      windowSeconds?: number;
    } = {}
  ): CorrelationResult {
    const {
      matchFingerprint = true,
      matchActor = true,
      matchStudio = true,
      matchResource = true,
      matchCorrelationId = true,
      windowSeconds = 3600,
    } = options;

    const targetTime = new Date(targetEvent.created_at).getTime();

    const matched = eventPool.filter((candidate) => {
      // 1. Check time window
      const candidateTime = new Date(candidate.created_at).getTime();
      const diffSeconds = Math.abs(targetTime - candidateTime) / 1000;
      if (diffSeconds > windowSeconds) return false;

      // 2. Strict Tenant boundary check: if both have studio_ids and they differ, do not correlate
      if (targetEvent.studio_id && candidate.studio_id && targetEvent.studio_id !== candidate.studio_id) {
        return false;
      }

      // 3. Dimensional matches
      let isMatch = false;

      if (matchFingerprint && candidate.fingerprint === targetEvent.fingerprint) {
        isMatch = true;
      }

      if (
        matchCorrelationId &&
        targetEvent.correlation_id &&
        candidate.correlation_id === targetEvent.correlation_id
      ) {
        isMatch = true;
      }

      if (
        matchActor &&
        ((targetEvent.ip_hash && candidate.ip_hash === targetEvent.ip_hash) ||
          (targetEvent.user_id && candidate.user_id === targetEvent.user_id) ||
          (targetEvent.admin_user_id && candidate.admin_user_id === targetEvent.admin_user_id))
      ) {
        isMatch = true;
      }

      if (
        matchResource &&
        targetEvent.resource_type &&
        targetEvent.resource_id &&
        candidate.resource_type === targetEvent.resource_type &&
        candidate.resource_id === targetEvent.resource_id
      ) {
        isMatch = true;
      }

      if (matchStudio && targetEvent.studio_id && candidate.studio_id === targetEvent.studio_id) {
        // Only if there is another matching signal or same category
        if (candidate.category === targetEvent.category) {
          isMatch = true;
        }
      }

      return isMatch;
    });

    const uniqueActors = new Set<string>();
    const severities = new Set<string>();
    let minTime = targetTime;
    let maxTime = targetTime;

    for (const ev of matched) {
      if (ev.ip_hash) uniqueActors.add(ev.ip_hash);
      if (ev.user_id) uniqueActors.add(ev.user_id);
      if (ev.admin_user_id) uniqueActors.add(ev.admin_user_id);
      severities.add(ev.severity);

      const t = new Date(ev.created_at).getTime();
      if (t < minTime) minTime = t;
      if (t > maxTime) maxTime = t;
    }

    return {
      primary_event_id: targetEvent.id,
      correlation_key: targetEvent.fingerprint || targetEvent.id,
      correlated_events: matched,
      event_count: matched.length,
      distinct_actors: Math.max(1, uniqueActors.size),
      time_span_seconds: Math.max(0, Math.round((maxTime - minTime) / 1000)),
      severities_present: Array.from(severities),
    };
  }

  /**
   * Find clusters of security events grouped by shared fingerprint, actor, or correlation ID
   */
  static findEventClusters(
    events: PlatformSecurityEventDTO[],
    groupBy: 'fingerprint' | 'actor' | 'correlation_id' | 'studio_id'
  ): Map<string, PlatformSecurityEventDTO[]> {
    const clusters = new Map<string, PlatformSecurityEventDTO[]>();

    for (const ev of events) {
      let key: string | null | undefined = null;
      if (groupBy === 'fingerprint') key = ev.fingerprint;
      if (groupBy === 'actor') key = ev.user_id || ev.admin_user_id || ev.ip_hash;
      if (groupBy === 'correlation_id') key = ev.correlation_id;
      if (groupBy === 'studio_id') key = ev.studio_id;

      if (!key) continue;

      if (!clusters.has(key)) {
        clusters.set(key, []);
      }
      clusters.get(key)!.push(ev);
    }

    return clusters;
  }
}
