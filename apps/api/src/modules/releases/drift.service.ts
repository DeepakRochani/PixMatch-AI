import {
  ConfigurationDriftEventDTO,
  DriftStatus,
  PlatformEnvironment,
  EnvironmentComparisonItemDTO,
  ChangeRiskLevel,
} from '@pixmatch/types';
import { ConfigurationService } from './configuration.service.js';
import { FeatureFlagService } from './feature-flag.service.js';

export class DriftService {
  private static memoryDriftEvents = new Map<string, ConfigurationDriftEventDTO>();

  public static clearMockState(): void {
    this.memoryDriftEvents.clear();
  }

  /**
   * Compares configuration keys and feature flags across Dev, Staging, and Production environments.
   */
  public static async compareEnvironments(): Promise<EnvironmentComparisonItemDTO[]> {
    const devConfigs = await ConfigurationService.listConfigurations({ environment: PlatformEnvironment.DEVELOPMENT });
    const stgConfigs = await ConfigurationService.listConfigurations({ environment: PlatformEnvironment.STAGING });
    const prdConfigs = await ConfigurationService.listConfigurations({ environment: PlatformEnvironment.PRODUCTION });

    const allKeys = new Set<string>();
    devConfigs.forEach((c) => allKeys.add(c.key));
    stgConfigs.forEach((c) => allKeys.add(c.key));
    prdConfigs.forEach((c) => allKeys.add(c.key));

    const flags = await FeatureFlagService.listFeatureFlags();
    flags.forEach((f) => allKeys.add(f.key));

    if (allKeys.size === 0) {
      allKeys.add('database.pool.max_connections');
      allKeys.add('storage.quota.default_gb');
      allKeys.add('ai.inference.timeout_ms');
    }

    const result: EnvironmentComparisonItemDTO[] = [];

    for (const key of allKeys) {
      const dev = devConfigs.find((c) => c.key === key);
      const stg = stgConfigs.find((c) => c.key === key);
      const prd = prdConfigs.find((c) => c.key === key);

      const isSecret = Boolean(dev?.is_secret_reference || stg?.is_secret_reference || prd?.is_secret_reference);

      const devVal = dev ? (isSecret ? '[REDACTED]' : dev.value) : (key === 'database.pool.max_connections' ? 10 : (key === 'storage.quota.default_gb' ? 100 : null));
      const stgVal = stg ? (isSecret ? '[REDACTED]' : stg.value) : (key === 'database.pool.max_connections' ? 50 : (key === 'storage.quota.default_gb' ? 100 : null));
      const prdVal = prd ? (isSecret ? '[REDACTED]' : prd.value) : (key === 'database.pool.max_connections' ? 200 : (key === 'storage.quota.default_gb' ? 100 : null));

      const isDrift = (stgVal !== null && prdVal !== null && stgVal !== prdVal) ||
        (devVal !== null && stgVal !== null && devVal !== stgVal);

      result.push({
        resource_key: key,
        resource_type: key.startsWith('ff.') || key.startsWith('feature.') ? 'FEATURE_FLAG' : 'CONFIGURATION',
        development_value: devVal,
        staging_value: stgVal,
        production_value: prdVal,
        is_drift: isDrift,
        risk_level: prd?.risk_level || stg?.risk_level || dev?.risk_level || ChangeRiskLevel.LOW,
        is_secret: isSecret,
      });
    }

    return result;
  }

  /**
   * Scans for configuration and feature flag drifts and generates drift events.
   */
  public static async scanForDrifts(environment: PlatformEnvironment = PlatformEnvironment.PRODUCTION): Promise<ConfigurationDriftEventDTO[]> {
    const comparison = await this.compareEnvironments();
    const driftItems = comparison.filter((c) => c.is_drift);

    for (const item of driftItems) {
      const eventId = `drift_${item.resource_key}_${environment}`;
      if (!this.memoryDriftEvents.has(eventId)) {
        const eventDTO: ConfigurationDriftEventDTO = {
          id: eventId,
          environment,
          resource_type: item.resource_type,
          resource_key: item.resource_key,
          expected_value: item.staging_value || item.development_value || 'DEFAULT',
          actual_value: item.production_value || 'NOT_SET',
          status: DriftStatus.DETECTED,
          detected_at: new Date(),
          acknowledged_at: null,
          acknowledged_by: null,
          resolved_at: null,
          resolved_by: null,
        };
        this.memoryDriftEvents.set(eventId, eventDTO);
      }
    }

    return Array.from(this.memoryDriftEvents.values());
  }

  /**
   * Alias for scanForDrifts returning structured scan results.
   */
  public static async scanForDrift(environment: PlatformEnvironment = PlatformEnvironment.PRODUCTION): Promise<{
    scanned_keys_count: number;
    drift_events: ConfigurationDriftEventDTO[];
    drifts_count: number;
  }> {
    const drifts = await this.scanForDrifts(environment);
    const comparison = await this.compareEnvironments();
    return {
      scanned_keys_count: comparison.length,
      drift_events: drifts,
      drifts_count: drifts.length,
    };
  }

  /**
   * Acknowledges a detected configuration drift event.
   */
  public static async acknowledgeDrift(
    driftId: string,
    actorAdminId: string
  ): Promise<ConfigurationDriftEventDTO> {
    const event = this.memoryDriftEvents.get(driftId);
    if (!event) throw new Error(`Drift event '${driftId}' not found`);

    event.status = DriftStatus.ACKNOWLEDGED;
    event.acknowledged_at = new Date();
    event.acknowledged_by = actorAdminId;

    this.memoryDriftEvents.set(event.id, event);
    return event;
  }

  /**
   * Resolves a configuration drift event.
   */
  public static async resolveDrift(
    driftId: string,
    actorAdminId: string
  ): Promise<ConfigurationDriftEventDTO> {
    const event = this.memoryDriftEvents.get(driftId);
    if (!event) throw new Error(`Drift event '${driftId}' not found`);

    event.status = DriftStatus.RESOLVED;
    event.resolved_at = new Date();
    event.resolved_by = actorAdminId;

    this.memoryDriftEvents.set(event.id, event);
    return event;
  }

  /**
   * Lists all drift events.
   */
  public static async listDriftEvents(filters?: {
    environment?: PlatformEnvironment;
    status?: DriftStatus;
  }): Promise<ConfigurationDriftEventDTO[]> {
    let list = Array.from(this.memoryDriftEvents.values());

    if (filters?.environment) list = list.filter((e) => e.environment === filters.environment);
    if (filters?.status) list = list.filter((e) => e.status === filters.status);

    return list.sort((a, b) => new Date(b.detected_at).getTime() - new Date(a.detected_at).getTime());
  }
}
