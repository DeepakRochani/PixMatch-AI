import { CircuitState, CircuitBreakerConfig, CircuitBreakerStats, CanonicalService } from '@pixmatch/types';
import { logger } from './structured-logger';

export class CircuitBreakerOpenError extends Error {
  public readonly service: string;
  public readonly state: CircuitState;
  public readonly nextRetryAt: Date;

  constructor(service: string, nextRetryAt: Date) {
    super(`Circuit Breaker for ${service} is OPEN. Fast-failing requests until ${nextRetryAt.toISOString()}`);
    this.name = 'CircuitBreakerOpenError';
    this.service = service;
    this.state = CircuitState.OPEN;
    this.nextRetryAt = nextRetryAt;
  }
}

export interface CircuitBreakerOptions {
  failureThreshold?: number;
  failure_threshold?: number;
  resetTimeoutMs?: number;
  recovery_timeout_ms?: number;
  halfOpenSampleSize?: number;
  half_open_sample_size?: number;
  half_open_success_threshold?: number;
  timeoutMs?: number;
  timeout_ms?: number;
  fallback?: () => Promise<any>;
}

export class CircuitBreaker {
  private serviceName: string;
  private state: CircuitState = CircuitState.CLOSED;
  private failureCount = 0;
  private successCount = 0;
  private consecutiveFailures = 0;
  private lastFailureTime?: Date;
  private lastSuccessTime?: Date;
  private lastStateChange: Date = new Date();
  private halfOpenSuccessCount = 0;

  private failureThreshold: number;
  private recoveryTimeoutMs: number;
  private halfOpenSampleSize: number;
  private timeoutMs: number;
  private defaultFallback?: () => Promise<any>;

  constructor(
    serviceOrConfig: string | CanonicalService | (CircuitBreakerConfig & CircuitBreakerOptions),
    options?: CircuitBreakerOptions
  ) {
    if (typeof serviceOrConfig === 'string') {
      this.serviceName = serviceOrConfig;
      this.failureThreshold = options?.failureThreshold ?? options?.failure_threshold ?? 5;
      this.recoveryTimeoutMs = options?.resetTimeoutMs ?? options?.recovery_timeout_ms ?? 30000;
      this.halfOpenSampleSize = options?.halfOpenSampleSize ?? options?.half_open_sample_size ?? options?.half_open_success_threshold ?? 1;
      this.timeoutMs = options?.timeoutMs ?? options?.timeout_ms ?? 5000;
      this.defaultFallback = options?.fallback;
    } else {
      this.serviceName = (serviceOrConfig as any).service_name || (serviceOrConfig as any).name || 'UNKNOWN_SERVICE';
      this.failureThreshold = serviceOrConfig.failure_threshold ?? options?.failureThreshold ?? 5;
      this.recoveryTimeoutMs = (serviceOrConfig as any).recovery_timeout_ms ?? (serviceOrConfig as any).open_duration_ms ?? options?.resetTimeoutMs ?? 30000;
      this.halfOpenSampleSize = (serviceOrConfig as any).half_open_sample_size ?? (serviceOrConfig as any).probe_count ?? options?.halfOpenSampleSize ?? 1;
      this.timeoutMs = (serviceOrConfig as any).timeout_ms ?? options?.timeoutMs ?? 5000;
      this.defaultFallback = (serviceOrConfig as any).fallback ?? options?.fallback;
    }
  }

  public getServiceName(): string {
    return this.serviceName;
  }

  public getState(): CircuitState {
    if (this.state === CircuitState.OPEN) {
      const timeSinceOpen = Date.now() - this.lastStateChange.getTime();
      if (timeSinceOpen >= this.recoveryTimeoutMs) {
        this.transitionTo(CircuitState.HALF_OPEN);
      }
    }
    return this.state;
  }

  public getStats(): CircuitBreakerStats & {
    failureCount: number;
    successCount: number;
    lastStateChange: string;
    failureRatePercent: number;
  } {
    const currentState = this.getState();
    const totalRequests = this.failureCount + this.successCount;
    const failureRate = totalRequests > 0 ? (this.failureCount / totalRequests) * 100 : 0;

    let nextRetryAt: Date | undefined;
    if (currentState === CircuitState.OPEN) {
      nextRetryAt = new Date(this.lastStateChange.getTime() + this.recoveryTimeoutMs);
    }

    const stateChangeIso = this.lastStateChange.toISOString();
    const failureRateVal = Math.round(failureRate * 10) / 10;

    return {
      service: this.serviceName,
      service_name: this.serviceName,
      state: currentState,
      failure_count: this.failureCount,
      failureCount: this.failureCount,
      success_count: this.successCount,
      successCount: this.successCount,
      consecutive_failures: this.consecutiveFailures,
      consecutiveFailures: this.consecutiveFailures,
      last_state_change: stateChangeIso,
      lastStateChange: stateChangeIso,
      last_failure_time: this.lastFailureTime?.toISOString(),
      last_success_time: this.lastSuccessTime?.toISOString(),
      failure_rate_percent: failureRateVal,
      failureRatePercent: failureRateVal,
      next_retry_at: nextRetryAt?.toISOString(),
    };
  }

  private transitionTo(newState: CircuitState) {
    const oldState = this.state;
    this.state = newState;
    this.lastStateChange = new Date();

    if (newState === CircuitState.HALF_OPEN) {
      this.halfOpenSuccessCount = 0;
    } else if (newState === CircuitState.CLOSED) {
      this.consecutiveFailures = 0;
      this.failureCount = 0;
      this.halfOpenSuccessCount = 0;
    }

    logger.info(
      `Circuit breaker '${this.serviceName}' transitioned from ${oldState} to ${newState}`,
      { service: 'CIRCUIT_BREAKER', metadata: { service_name: this.serviceName, from: oldState, to: newState } }
    );
  }

  public async execute<T>(
    operation: () => Promise<T>,
    fallback?: () => Promise<T>
  ): Promise<T> {
    const currentState = this.getState();
    const activeFallback = fallback || this.defaultFallback;

    if (currentState === CircuitState.OPEN) {
      const nextRetryAt = new Date(this.lastStateChange.getTime() + this.recoveryTimeoutMs);
      if (activeFallback) {
        logger.warn(`Circuit breaker '${this.serviceName}' OPEN. Executing fallback.`, {
          service: 'CIRCUIT_BREAKER',
          metadata: { service_name: this.serviceName },
        });
        return activeFallback();
      }
      throw new CircuitBreakerOpenError(this.serviceName, nextRetryAt);
    }

    // Wrap operation in a timeout promise
    let timeoutHandle: NodeJS.Timeout | undefined;
    const timeoutPromise = new Promise<never>((_, reject) => {
      if (this.timeoutMs && this.timeoutMs > 0) {
        timeoutHandle = setTimeout(() => {
          reject(new Error(`Operation for '${this.serviceName}' timed out after ${this.timeoutMs}ms`));
        }, this.timeoutMs);
      }
    });

    try {
      const result = await Promise.race([operation(), timeoutPromise]);
      if (timeoutHandle) clearTimeout(timeoutHandle);
      this.onSuccess();
      return result;
    } catch (err) {
      if (timeoutHandle) clearTimeout(timeoutHandle);
      this.onFailure(err as Error);
      if (activeFallback) {
        return activeFallback();
      }
      throw err;
    }
  }

  private onSuccess() {
    this.successCount++;
    this.lastSuccessTime = new Date();
    this.consecutiveFailures = 0;

    if (this.state === CircuitState.HALF_OPEN) {
      this.halfOpenSuccessCount++;
      if (this.halfOpenSuccessCount >= this.halfOpenSampleSize) {
        this.transitionTo(CircuitState.CLOSED);
      }
    }
  }

  private onFailure(error: Error) {
    this.failureCount++;
    this.consecutiveFailures++;
    this.lastFailureTime = new Date();

    logger.warn(`Circuit breaker recorded failure for '${this.serviceName}': ${error.message}`, {
      service: 'CIRCUIT_BREAKER',
      metadata: { service_name: this.serviceName, consecutiveFailures: this.consecutiveFailures },
    });

    if (this.state === CircuitState.HALF_OPEN) {
      // In half-open, a single failure immediately trips back to OPEN
      this.transitionTo(CircuitState.OPEN);
    } else if (this.state === CircuitState.CLOSED) {
      if (this.consecutiveFailures >= this.failureThreshold || this.failureCount >= this.failureThreshold) {
        this.transitionTo(CircuitState.OPEN);
      }
    }
  }

  public reset(): void {
    this.state = CircuitState.CLOSED;
    this.failureCount = 0;
    this.successCount = 0;
    this.consecutiveFailures = 0;
    this.halfOpenSuccessCount = 0;
    this.lastStateChange = new Date();
  }

  public forceOpen(): void {
    this.transitionTo(CircuitState.OPEN);
  }

  public forceClosed(): void {
    this.transitionTo(CircuitState.CLOSED);
  }
}

/**
 * Circuit Breaker Registry for Managing All Subsystem and Provider Breakers
 */
export class CircuitBreakerRegistry {
  private static instance: CircuitBreakerRegistry;
  private breakers: Map<string, CircuitBreaker> = new Map();

  private constructor() {
    // Initialize default breakers for all canonical services and standard external providers
    const canonicalList = [
      CanonicalService.DATABASE,
      CanonicalService.API_GATEWAY,
      CanonicalService.AI_ENGINE,
      CanonicalService.STORAGE,
      CanonicalService.SEARCH,
      CanonicalService.NOTIFICATION,
      CanonicalService.FINANCE,
      CanonicalService.FULFILLMENT,
      CanonicalService.COLLABORATION,
      CanonicalService.COMMUNICATION,
      CanonicalService.INTELLIGENCE,
      CanonicalService.ADMIN,
      'AI_SERVICE',
      'EMAIL_PROVIDER',
      'PAYMENTS_GATEWAY',
      'STORAGE_PROVIDER',
      'CALENDAR_PROVIDER',
    ];

    for (const s of canonicalList) {
      this.getOrCreate(s, { failure_threshold: 5, recovery_timeout_ms: 30000, timeout_ms: 5000 });
    }
  }

  public static getInstance(): CircuitBreakerRegistry {
    if (!CircuitBreakerRegistry.instance) {
      CircuitBreakerRegistry.instance = new CircuitBreakerRegistry();
    }
    return CircuitBreakerRegistry.instance;
  }

  public getOrCreate(serviceName: string, config?: Partial<CircuitBreakerConfig & CircuitBreakerOptions>): CircuitBreaker {
    let breaker = this.breakers.get(serviceName);
    if (!breaker) {
      breaker = new CircuitBreaker(serviceName, {
        failure_threshold: config?.failure_threshold ?? config?.failureThreshold ?? 5,
        recovery_timeout_ms: config?.recovery_timeout_ms ?? config?.resetTimeoutMs ?? 30000,
        half_open_sample_size: config?.half_open_sample_size ?? config?.halfOpenSampleSize ?? 1,
        timeout_ms: config?.timeout_ms ?? config?.timeoutMs ?? 5000,
        ...config,
      });
      this.breakers.set(serviceName, breaker);
    }
    return breaker;
  }

  public get(serviceName: string): CircuitBreaker | undefined {
    if (!serviceName) return undefined;
    const direct = this.breakers.get(serviceName);
    if (direct) return direct;

    const upper = serviceName.toUpperCase();
    for (const [key, val] of this.breakers.entries()) {
      if (key.toUpperCase() === upper) return val;
    }
    return undefined;
  }

  public getAllStats(): any[] {
    return Array.from(this.breakers.values()).map((b) => b.getStats());
  }

  public resetAll(): void {
    for (const breaker of this.breakers.values()) {
      breaker.reset();
    }
  }
}

export const circuitBreakers = CircuitBreakerRegistry.getInstance();
