import { FastifyRequest, FastifyReply } from 'fastify';
import {
  CanonicalService,
  PlatformErrorSeverity,
  PlatformErrorStatus,
  MetricType,
  BackupType,
  DeploymentStatus,
  LogLevel,
} from '@pixmatch/types';
import { reliabilityService } from './reliability.service';
import { errorTracker } from './error-tracker.service';
import { metrics } from './metrics.service';
import { sliSloService } from './sli-slo.service';
import { circuitBreakers } from './circuit-breaker';
import { backupRecoveryService } from './backup-recovery.service';
import { deploymentSafety } from './deployment-safety.service';
import { logger } from './structured-logger';

export class ReliabilityController {
  // -------------------------------------------------------------
  // Public Health Endpoints
  // -------------------------------------------------------------
  public static async getHealthOverview(req: FastifyRequest, reply: FastifyReply) {
    const overview = await reliabilityService.getPlatformHealthOverview();
    const statusCode = overview.status === 'HEALTHY' ? 200 : (overview.status === 'DEGRADED' ? 200 : 503);
    return reply.status(statusCode).send(overview);
  }

  public static async getLiveness(req: FastifyRequest, reply: FastifyReply) {
    return reply.status(200).send({
      status: 'UP',
      timestamp: new Date().toISOString(),
      uptime_seconds: Math.round(process.uptime()),
    });
  }

  public static async getReadiness(req: FastifyRequest, reply: FastifyReply) {
    const dbHealth = await reliabilityService.probeService(CanonicalService.DATABASE);
    const isReady = dbHealth.status !== 'UNHEALTHY';
    return reply.status(isReady ? 200 : 503).send({
      status: isReady ? 'READY' : 'NOT_READY',
      database: dbHealth.status,
      timestamp: new Date().toISOString(),
    });
  }

  public static async getDependenciesHealth(req: FastifyRequest, reply: FastifyReply) {
    const overview = await reliabilityService.getPlatformHealthOverview();
    return reply.status(200).send({
      services: overview.services,
      circuit_breakers: overview.circuit_breakers,
      timestamp: overview.timestamp,
    });
  }

  // -------------------------------------------------------------
  // Admin Service Health Endpoints
  // -------------------------------------------------------------
  public static async getServiceHealth(req: FastifyRequest<{ Params: { service: string } }>, reply: FastifyReply) {
    const serviceName = req.params.service.toUpperCase() as CanonicalService;
    const result = await reliabilityService.probeService(serviceName);
    return reply.send(result);
  }

  // -------------------------------------------------------------
  // Error Tracking Endpoints
  // -------------------------------------------------------------
  public static async getErrors(
    req: FastifyRequest<{
      Querystring: {
        service?: string;
        severity?: PlatformErrorSeverity;
        status?: PlatformErrorStatus;
        search?: string;
        page?: number;
        limit?: number;
      };
    }>,
    reply: FastifyReply
  ) {
    const results = await errorTracker.getErrors(req.query);
    return reply.send(results);
  }

  public static async getErrorById(req: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) {
    const error = await errorTracker.getErrorById(req.params.id);
    if (!error) {
      return reply.status(404).send({ error: `Error '${req.params.id}' not found` });
    }
    return reply.send(error);
  }

  public static async updateErrorStatus(
    req: FastifyRequest<{ Params: { id: string }; Body: { status: PlatformErrorStatus } }>,
    reply: FastifyReply
  ) {
    const userId = (req as any).user?.id || 'SUPER_ADMIN';
    const updated = await errorTracker.updateErrorStatus(req.params.id, req.body.status, userId);
    if (!updated) {
      return reply.status(404).send({ error: `Error '${req.params.id}' not found` });
    }
    return reply.send(updated);
  }

  public static async getErrorSummary(req: FastifyRequest, reply: FastifyReply) {
    const summary = await errorTracker.getErrorSummary();
    return reply.send(summary);
  }

  // -------------------------------------------------------------
  // Metrics & Latency Telemetry Endpoints
  // -------------------------------------------------------------
  public static async getMetrics(
    req: FastifyRequest<{
      Querystring: {
        service?: string;
        name?: string;
        type?: MetricType;
        sinceMs?: number;
      };
    }>,
    reply: FastifyReply
  ) {
    const data = metrics.queryMetrics(req.query);
    return reply.send({ metrics: data, count: data.length });
  }

  public static async getLatencyPercentiles(
    req: FastifyRequest<{
      Querystring: {
        service: string;
        metric: string;
      };
    }>,
    reply: FastifyReply
  ) {
    const percentiles = metrics.calculatePercentiles(req.query.service, req.query.metric);
    return reply.send(percentiles);
  }

  public static async getSystemMetrics(req: FastifyRequest, reply: FastifyReply) {
    const system = metrics.getSystemMetrics();
    return reply.send(system);
  }

  // -------------------------------------------------------------
  // SLI / SLO Endpoints
  // -------------------------------------------------------------
  public static async getAllSLOs(req: FastifyRequest, reply: FastifyReply) {
    const slos = await sliSloService.getAllSLOs();
    return reply.send({ slos, count: slos.length });
  }

  public static async getSLOById(req: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) {
    const slo = await sliSloService.getSLOById(req.params.id);
    if (!slo) {
      return reply.status(404).send({ error: `SLO '${req.params.id}' not found` });
    }
    return reply.send(slo);
  }

  public static async upsertSLO(
    req: FastifyRequest<{
      Body: {
        id?: string;
        name: string;
        description: string;
        service: string;
        target_percent: number;
        window_days?: number;
        sli_definition: any;
      };
    }>,
    reply: FastifyReply
  ) {
    const slo = await sliSloService.upsertSLO(req.body);
    return reply.status(201).send(slo);
  }

  // -------------------------------------------------------------
  // Circuit Breakers Endpoints
  // -------------------------------------------------------------
  public static async getCircuitBreakers(req: FastifyRequest, reply: FastifyReply) {
    const stats = circuitBreakers.getAllStats();
    return reply.send({ circuit_breakers: stats, count: stats.length });
  }

  public static async resetCircuitBreaker(
    req: FastifyRequest<{ Params: { service: string } }>,
    reply: FastifyReply
  ) {
    const breaker = circuitBreakers.get(req.params.service.toUpperCase());
    if (!breaker) {
      return reply.status(404).send({ error: `Circuit breaker for '${req.params.service}' not found` });
    }
    breaker.reset();
    return reply.send({ message: `Circuit breaker '${req.params.service}' reset to CLOSED`, stats: breaker.getStats() });
  }

  // -------------------------------------------------------------
  // Backups & Disaster Recovery Endpoints
  // -------------------------------------------------------------
  public static async getBackups(req: FastifyRequest, reply: FastifyReply) {
    const backups = await backupRecoveryService.getBackups();
    return reply.send({ backups, count: backups.length });
  }

  public static async createBackup(
    req: FastifyRequest<{
      Body: {
        backup_type: BackupType;
        database_name?: string;
        storage_location: string;
        size_bytes: number;
        checksum_sha256?: string;
        retention_days?: number;
      };
    }>,
    reply: FastifyReply
  ) {
    const userId = (req as any).user?.id || 'SUPER_ADMIN';
    const backup = await backupRecoveryService.createBackupRecord({
      ...req.body,
      created_by: userId,
    });
    return reply.status(201).send(backup);
  }

  public static async verifyBackup(req: FastifyRequest<{ Params: { id: string }; Body?: { expected_checksum?: string } }>, reply: FastifyReply) {
    const result = await backupRecoveryService.verifyBackupChecksum(req.params.id, req.body?.expected_checksum);
    return reply.send(result);
  }

  public static async getDRPlans(req: FastifyRequest, reply: FastifyReply) {
    const plans = await backupRecoveryService.getDRPlans();
    return reply.send({ plans, count: plans.length });
  }

  public static async getDRPlanById(req: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) {
    const plan = await backupRecoveryService.getDRPlanById(req.params.id);
    if (!plan) {
      return reply.status(404).send({ error: `DR Plan '${req.params.id}' not found` });
    }
    return reply.send(plan);
  }

  public static async createDRPlan(
    req: FastifyRequest<{
      Body: {
        name: string;
        description: string;
        target_rto_minutes: number;
        target_rpo_minutes: number;
        failover_steps: any[];
      };
    }>,
    reply: FastifyReply
  ) {
    const plan = await backupRecoveryService.createDRPlan(req.body);
    return reply.status(201).send(plan);
  }

  public static async getRecoveryRuns(req: FastifyRequest, reply: FastifyReply) {
    const runs = await backupRecoveryService.getRecoveryRuns();
    return reply.send({ runs, count: runs.length });
  }

  public static async executeRecoveryRun(
    req: FastifyRequest<{
      Body: {
        plan_id: string;
        backup_id?: string;
        is_drill: boolean;
        target_region?: string;
      };
    }>,
    reply: FastifyReply
  ) {
    const userId = (req as any).user?.id || 'SUPER_ADMIN';
    const run = await backupRecoveryService.executeRecoveryRun({
      ...req.body,
      executed_by: userId,
    });
    return reply.status(201).send(run);
  }

  // -------------------------------------------------------------
  // Deployment & Migration Safety Endpoints
  // -------------------------------------------------------------
  public static async getDeployments(req: FastifyRequest, reply: FastifyReply) {
    const deployments = await deploymentSafety.getDeployments();
    return reply.send({ deployments, count: deployments.length });
  }

  public static async createDeployment(
    req: FastifyRequest<{
      Body: {
        version: string;
        git_commit_sha: string;
        git_branch: string;
        environment?: string;
        migration_name?: string;
        release_notes?: string;
      };
    }>,
    reply: FastifyReply
  ) {
    const userId = (req as any).user?.id || 'SUPER_ADMIN';
    const dep = await deploymentSafety.recordDeployment({
      ...req.body,
      deployed_by: userId,
    });
    return reply.status(201).send(dep);
  }

  public static async finalizeDeployment(
    req: FastifyRequest<{
      Params: { id: string };
      Body: { status: DeploymentStatus; health_check_passed: boolean };
    }>,
    reply: FastifyReply
  ) {
    const finalized = await deploymentSafety.finalizeDeployment(
      req.params.id,
      req.body.status,
      req.body.health_check_passed
    );
    return reply.send(finalized);
  }

  public static async validateMigration(
    req: FastifyRequest<{ Body: { migration_name_or_sql: string } }>,
    reply: FastifyReply
  ) {
    const result = await deploymentSafety.validateMigrationSafety(req.body.migration_name_or_sql);
    return reply.send(result);
  }

  public static async getRollbackReadiness(
    req: FastifyRequest<{ Params: { id: string } }>,
    reply: FastifyReply
  ) {
    const readiness = await deploymentSafety.evaluateRollbackReadiness(req.params.id);
    return reply.send(readiness);
  }

  // -------------------------------------------------------------
  // Structured Logs Query Endpoint
  // -------------------------------------------------------------
  public static async queryLogs(
    req: FastifyRequest<{
      Querystring: {
        service?: string;
        level?: LogLevel;
        correlation_id?: string;
        user_id?: string;
        studio_id?: string;
        limit?: number;
        search?: string;
      };
    }>,
    reply: FastifyReply
  ) {
    const logs = logger.queryLogs(req.query);
    return reply.send({ logs, count: logs.length });
  }
}
