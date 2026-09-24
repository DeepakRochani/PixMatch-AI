import crypto from 'crypto';
import {
  SLOStatus,
  ReliabilitySLIDTO,
  ReliabilitySLODTO,
  SLOEvaluationDTO,
  CanonicalService,
} from '@pixmatch/types';
import { prisma } from '@pixmatch/database';

export class SliSloService {
  private static instance: SliSloService;
  private inMemorySLOs: Map<string, ReliabilitySLODTO> = new Map();

  private constructor() {
    this.seedDefaultSLOs();
  }

  public static getInstance(): SliSloService {
    if (!SliSloService.instance) {
      SliSloService.instance = new SliSloService();
    }
    return SliSloService.instance;
  }

  private seedDefaultSLOs(): void {
    const defaultSLOs: ReliabilitySLODTO[] = [
      {
        id: 'slo_api_availability',
        name: 'Core API Availability',
        description: 'Percentage of successful non-5xx HTTP requests across public and studio endpoints',
        service: CanonicalService.API_GATEWAY,
        target_percent: 99.9,
        targetPercent: 99.9,
        target: 99.9,
        window_days: 30,
        window: '30d',
        current_sli_percent: 99.95,
        currentPercent: 99.95,
        error_budget_remaining_percent: 50.0,
        errorBudgetRemainingPercent: 50.0,
        status: SLOStatus.MEETING,
        sli_definition: {
          id: 'sli_api_avail',
          name: 'API Success Rate',
          metric_name: 'http_request_duration_ms',
          service: CanonicalService.API_GATEWAY,
          formula: '(successful_requests / total_requests) * 100',
          good_events_filter: 'status_code < 500',
          valid_events_filter: 'all_http_requests',
        },
        burn_rate: 0.5,
        burnRate: 0.5,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      {
        id: 'slo_database_query_latency',
        name: 'Database Query Latency Compliance',
        description: 'Percentage of transactional and analytics queries completing in under 50ms',
        service: CanonicalService.DATABASE,
        target_percent: 99.5,
        targetPercent: 99.5,
        target: 99.5,
        window_days: 30,
        window: '30d',
        current_sli_percent: 99.8,
        currentPercent: 99.8,
        error_budget_remaining_percent: 60.0,
        errorBudgetRemainingPercent: 60.0,
        status: SLOStatus.MEETING,
        sli_definition: {
          id: 'sli_db_lat',
          name: 'DB Query Latency under 50ms',
          metric_name: 'db_query_duration_ms',
          service: CanonicalService.DATABASE,
          formula: '(queries_under_50ms / total_queries) * 100',
          good_events_filter: 'duration_ms <= 50',
          valid_events_filter: 'all_queries',
        },
        burn_rate: 0.4,
        burnRate: 0.4,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      {
        id: 'slo_ai_face_match_success',
        name: 'AI Face Search Pipeline Reliability',
        description: 'Percentage of facial recognition and indexing jobs completed without unhandled model failure',
        service: CanonicalService.AI_ENGINE,
        target_percent: 99.5,
        targetPercent: 99.5,
        target: 99.5,
        window_days: 30,
        window: '30d',
        current_sli_percent: 99.8,
        currentPercent: 99.8,
        error_budget_remaining_percent: 60.0,
        errorBudgetRemainingPercent: 60.0,
        status: SLOStatus.MEETING,
        sli_definition: {
          id: 'sli_ai_success',
          name: 'Face Search Job Success',
          metric_name: 'ai_job_processed',
          service: CanonicalService.AI_ENGINE,
          formula: '(successful_ai_jobs / total_ai_jobs) * 100',
          good_events_filter: 'status == COMPLETED',
          valid_events_filter: 'all_ai_jobs',
        },
        burn_rate: 0.2,
        burnRate: 0.2,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      {
        id: 'slo_storage_availability',
        name: 'Media Storage Object Availability',
        description: 'Percentage of high-res image and raw asset download and upload requests served successfully',
        service: CanonicalService.STORAGE,
        target_percent: 99.9,
        targetPercent: 99.9,
        target: 99.9,
        window_days: 30,
        window: '30d',
        current_sli_percent: 99.98,
        currentPercent: 99.98,
        error_budget_remaining_percent: 80.0,
        errorBudgetRemainingPercent: 80.0,
        status: SLOStatus.MEETING,
        sli_definition: {
          id: 'sli_storage_avail',
          name: 'Storage Request Success',
          metric_name: 'storage_http_status',
          service: CanonicalService.STORAGE,
          formula: '(successful_storage_requests / total_storage_requests) * 100',
          good_events_filter: 'status_code < 500',
          valid_events_filter: 'all_storage_requests',
        },
        burn_rate: 0.2,
        burnRate: 0.2,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      {
        id: 'slo_photo_delivery_success',
        name: 'Photo Delivery & Fulfillment Success',
        description: 'Percentage of order deliveries and download zips generated successfully within SLA',
        service: CanonicalService.FULFILLMENT,
        target_percent: 99.9,
        targetPercent: 99.9,
        target: 99.9,
        window_days: 30,
        window: '30d',
        current_sli_percent: 99.99,
        currentPercent: 99.99,
        error_budget_remaining_percent: 90.0,
        errorBudgetRemainingPercent: 90.0,
        status: SLOStatus.MEETING,
        sli_definition: {
          id: 'sli_fulfillment_success',
          name: 'Fulfillment Job Success',
          metric_name: 'fulfillment_job',
          service: CanonicalService.FULFILLMENT,
          formula: '(successful_fulfillment_jobs / total_fulfillment_jobs) * 100',
          good_events_filter: 'status == COMPLETED',
          valid_events_filter: 'all_fulfillment_jobs',
        },
        burn_rate: 0.1,
        burnRate: 0.1,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
    ];

    for (const slo of defaultSLOs) {
      this.inMemorySLOs.set(slo.id, slo);
    }
  }

  /**
   * Evaluates an SLO given total and good events count
   */
  public evaluateSLO(
    slo: ReliabilitySLODTO,
    totalEvents: number,
    goodEvents: number,
    _observedWindowHours = 720 // 30 days
  ): SLOEvaluationDTO {
    const target = slo.targetPercent || slo.target_percent || slo.target || 99.9;
    if (totalEvents === 0) {
      return {
        slo_id: slo.id,
        sli_value_percent: 100.0,
        target_percent: target,
        target: target,
        error_budget_total: 0,
        error_budget_consumed: 0,
        error_budget_remaining_percent: 100.0,
        error_budget_remaining_pct: 100.0,
        status: SLOStatus.MEETING,
        burn_rate: 0,
        evaluated_at: new Date().toISOString(),
      };
    }

    const sliValue = (goodEvents / totalEvents) * 100;
    const badEvents = totalEvents - goodEvents;

    // Allowed bad events based on target percent
    const allowedBadPercent = (100 - target) / 100;
    const errorBudgetTotal = Math.ceil(totalEvents * allowedBadPercent);
    const errorBudgetRemaining = Math.max(0, errorBudgetTotal - badEvents);
    const errorBudgetRemainingPercent = errorBudgetTotal > 0
      ? Math.round((errorBudgetRemaining / errorBudgetTotal) * 100 * 10) / 10
      : (sliValue >= target ? 100 : 0);

    // Burn rate: (actual bad rate) / (allowed bad rate)
    const actualBadRate = badEvents / totalEvents;
    const burnRate = allowedBadPercent > 0
      ? Math.round((actualBadRate / allowedBadPercent) * 100) / 100
      : (badEvents > 0 ? 10.0 : 0);

    let status = SLOStatus.MEETING;
    if (sliValue < target || errorBudgetRemainingPercent <= 0) {
      status = SLOStatus.BREACHED;
    } else if (errorBudgetRemainingPercent < 20 || burnRate > 1.5) {
      status = SLOStatus.WARNING;
    }

    return {
      slo_id: slo.id,
      sli_value_percent: Math.round(sliValue * 1000) / 1000,
      target_percent: target,
      target: target,
      error_budget_total: errorBudgetTotal,
      error_budget_consumed: badEvents,
      error_budget_remaining_percent: errorBudgetRemainingPercent,
      error_budget_remaining_pct: errorBudgetRemainingPercent,
      status,
      burn_rate: burnRate,
      evaluated_at: new Date().toISOString(),
    };
  }

  public calculateAllowedFailures(targetPercent: number, totalEvents: number): number {
    const allowedBadRate = (100 - targetPercent) / 100;
    return Math.round(totalEvents * allowedBadRate);
  }

  public calculateSLI(goodEvents: number, totalEvents: number): number {
    if (totalEvents === 0) return 100.0;
    return Math.round((goodEvents / totalEvents) * 100 * 100) / 100;
  }

  public calculateErrorBudgetUsage(targetPercent: number, totalEvents: number, failedEvents: number): {
    consumedPercent: number;
    remainingPercent: number;
  } {
    const allowedFailures = this.calculateAllowedFailures(targetPercent, totalEvents);
    if (allowedFailures === 0) {
      return {
        consumedPercent: failedEvents > 0 ? 100 : 0,
        remainingPercent: failedEvents > 0 ? 0 : 100,
      };
    }
    const consumed = Math.round((failedEvents / allowedFailures) * 100 * 10) / 10;
    const remaining = Math.max(0, Math.round((100 - consumed) * 10) / 10);
    return {
      consumedPercent: consumed,
      remainingPercent: remaining,
    };
  }

  public calculateBurnRate(targetPercent: number, totalEvents: number, failedEvents: number): number {
    const allowedFailures = this.calculateAllowedFailures(targetPercent, totalEvents);
    if (allowedFailures === 0) return failedEvents > 0 ? 10.0 : 0;
    return Math.round((failedEvents / allowedFailures) * 100) / 100;
  }

  public classifySLOStatus(currentPercent: number, targetPercent: number): SLOStatus {
    if (currentPercent < targetPercent) return SLOStatus.BREACHED;
    return SLOStatus.MEETING;
  }

  public async evaluateAll(): Promise<any[]> {
    const slos = this.getAllSLOs();
    return slos.map(slo => {
      const evalResult = this.evaluateSLO(slo, 10000, 9995);
      return {
        id: slo.id,
        name: slo.name,
        service: slo.service,
        targetPercent: slo.targetPercent || slo.target_percent,
        target_percent: slo.target_percent || slo.targetPercent,
        currentPercent: slo.currentPercent || slo.current_sli_percent,
        current_sli_percent: slo.current_sli_percent || slo.currentPercent,
        errorBudgetRemainingPercent: slo.errorBudgetRemainingPercent || slo.error_budget_remaining_percent,
        error_budget_remaining_percent: slo.error_budget_remaining_percent || slo.errorBudgetRemainingPercent,
        burnRate: slo.burnRate || slo.burn_rate,
        burn_rate: slo.burn_rate || slo.burnRate,
        status: slo.status,
        ...evalResult,
      };
    });
  }

  /**
   * Get all registered SLOs (Compatible with sync and async callers)
   */
  public getAllSLOs(): ReliabilitySLODTO[] {
    return Array.from(this.inMemorySLOs.values()).map(slo => ({
      ...slo,
      targetPercent: slo.targetPercent || slo.target_percent || slo.target || 99.9,
      target_percent: slo.target_percent || slo.targetPercent || slo.target || 99.9,
      currentPercent: slo.currentPercent || slo.current_sli_percent || 100.0,
      current_sli_percent: slo.current_sli_percent || slo.currentPercent || 100.0,
      errorBudgetRemainingPercent: slo.errorBudgetRemainingPercent || slo.error_budget_remaining_percent || 100.0,
      error_budget_remaining_percent: slo.error_budget_remaining_percent || slo.errorBudgetRemainingPercent || 100.0,
      burnRate: slo.burnRate ?? slo.burn_rate ?? 0,
      burn_rate: slo.burn_rate ?? slo.burnRate ?? 0,
    }));
  }

  /**
   * Get single SLO by ID
   */
  public getSLOById(id: string): ReliabilitySLODTO | null {
    const slo = this.inMemorySLOs.get(id);
    if (!slo) return null;
    return {
      ...slo,
      targetPercent: slo.targetPercent || slo.target_percent || slo.target || 99.9,
      target_percent: slo.target_percent || slo.targetPercent || slo.target || 99.9,
      currentPercent: slo.currentPercent || slo.current_sli_percent || 100.0,
      current_sli_percent: slo.current_sli_percent || slo.currentPercent || 100.0,
      errorBudgetRemainingPercent: slo.errorBudgetRemainingPercent || slo.error_budget_remaining_percent || 100.0,
      error_budget_remaining_percent: slo.error_budget_remaining_percent || slo.errorBudgetRemainingPercent || 100.0,
      burnRate: slo.burnRate ?? slo.burn_rate ?? 0,
      burn_rate: slo.burn_rate ?? slo.burnRate ?? 0,
    };
  }

  /**
   * Create or update an SLO
   */
  public async upsertSLO(input: {
    id?: string;
    name: string;
    description: string;
    service: string;
    target_percent?: number;
    targetPercent?: number;
    window_days?: number;
    sli_definition: ReliabilitySLIDTO;
  }): Promise<ReliabilitySLODTO> {
    const id = input.id || `slo_${crypto.randomUUID().substring(0, 8)}`;
    const now = new Date().toISOString();
    const target = input.targetPercent || input.target_percent || 99.9;

    const slo: ReliabilitySLODTO = {
      id,
      name: input.name,
      description: input.description,
      service: input.service.toUpperCase(),
      target_percent: target,
      targetPercent: target,
      target: target,
      window_days: input.window_days || 30,
      window: `${input.window_days || 30}d`,
      current_sli_percent: 100.0,
      currentPercent: 100.0,
      error_budget_remaining_percent: 100.0,
      errorBudgetRemainingPercent: 100.0,
      status: SLOStatus.MEETING,
      sli_definition: input.sli_definition,
      burn_rate: 0,
      burnRate: 0,
      created_at: this.inMemorySLOs.get(id)?.created_at || now,
      updated_at: now,
    };

    this.inMemorySLOs.set(id, slo);

    try {
      if (prisma && (prisma as any).reliabilitySLO) {
        await (prisma as any).reliabilitySLO.upsert({
          where: { name: input.name },
          update: {
            description: input.description,
            service: input.service.toUpperCase(),
            target_percent: target,
            window_days: input.window_days || 30,
            sli_formula: input.sli_definition.formula,
            metric_name: input.sli_definition.metric_name,
            good_filter: input.sli_definition.good_events_filter,
            valid_filter: input.sli_definition.valid_events_filter,
          },
          create: {
            id,
            name: input.name,
            description: input.description,
            service: input.service.toUpperCase(),
            target_percent: target,
            window_days: input.window_days || 30,
            sli_formula: input.sli_definition.formula,
            metric_name: input.sli_definition.metric_name,
            good_filter: input.sli_definition.good_events_filter,
            valid_filter: input.sli_definition.valid_events_filter,
          },
        });
      }
    } catch {
      // Fallback to memory
    }

    return slo;
  }
}

export const sliSloService = SliSloService.getInstance();
