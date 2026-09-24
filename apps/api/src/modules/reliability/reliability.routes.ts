import { FastifyInstance } from 'fastify';
import { ReliabilityController } from './reliability.controller.js';
import {
  authenticate,
  requireSuperAdmin,
  requireAdminPermission,
  requireAnyAdminPermission,
} from '../../middlewares/auth.js';
import { AdminPermission } from '@pixmatch/types';

/**
 * Public Health Routes (mounted at root /health or /api/health)
 */
export async function publicHealthRoutes(fastify: FastifyInstance) {
  fastify.get('/health', ReliabilityController.getHealthOverview);
  fastify.get('/health/live', ReliabilityController.getLiveness);
  fastify.get('/health/ready', ReliabilityController.getReadiness);
  fastify.get('/health/dependencies', ReliabilityController.getDependenciesHealth);
}

/**
 * Protected Reliability & Observability Routes (mounted under /api/admin/reliability and /api/v1/admin/reliability)
 */
export async function reliabilityAdminRoutes(fastify: FastifyInstance) {
  const perm = (p: AdminPermission) => ({ preHandler: [authenticate, requireAdminPermission(p)] });
  const anyPerm = (ps: AdminPermission[]) => ({ preHandler: [authenticate, requireAnyAdminPermission(ps)] });
  const superAdminOnly = { preHandler: [authenticate, requireSuperAdmin] };

  // Platform Overview & Service Health
  fastify.get('/health', anyPerm([AdminPermission.SYSTEM_HEALTH_VIEW, AdminPermission.ANALYTICS_VIEW]), ReliabilityController.getHealthOverview);
  fastify.get('/services/:service', perm(AdminPermission.SYSTEM_HEALTH_VIEW), ReliabilityController.getServiceHealth);

  // Errors & Fingerprinting
  fastify.get('/errors', perm(AdminPermission.SYSTEM_HEALTH_VIEW), ReliabilityController.getErrors);
  fastify.get('/errors/summary', perm(AdminPermission.SYSTEM_HEALTH_VIEW), ReliabilityController.getErrorSummary);
  fastify.get('/errors/:id', perm(AdminPermission.SYSTEM_HEALTH_VIEW), ReliabilityController.getErrorById);
  fastify.post('/errors/:id/status', perm(AdminPermission.SETTINGS_MANAGE), ReliabilityController.updateErrorStatus);

  // Metrics & Latency Telemetry
  fastify.get('/metrics', perm(AdminPermission.SYSTEM_HEALTH_VIEW), ReliabilityController.getMetrics);
  fastify.get('/metrics/latency', perm(AdminPermission.SYSTEM_HEALTH_VIEW), ReliabilityController.getLatencyPercentiles);
  fastify.get('/metrics/system', perm(AdminPermission.SYSTEM_HEALTH_VIEW), ReliabilityController.getSystemMetrics);

  // SLOs & Error Budgets
  fastify.get('/slos', perm(AdminPermission.SYSTEM_HEALTH_VIEW), ReliabilityController.getAllSLOs);
  fastify.get('/slos/:id', perm(AdminPermission.SYSTEM_HEALTH_VIEW), ReliabilityController.getSLOById);
  fastify.post('/slos', perm(AdminPermission.SETTINGS_MANAGE), ReliabilityController.upsertSLO);

  // Circuit Breakers
  fastify.get('/circuit-breakers', perm(AdminPermission.SYSTEM_HEALTH_VIEW), ReliabilityController.getCircuitBreakers);
  fastify.post('/circuit-breakers/:service/reset', perm(AdminPermission.SETTINGS_MANAGE), ReliabilityController.resetCircuitBreaker);

  // Backups & DR Plans
  fastify.get('/backups', perm(AdminPermission.SYSTEM_HEALTH_VIEW), ReliabilityController.getBackups);
  fastify.post('/backups', perm(AdminPermission.SETTINGS_MANAGE), ReliabilityController.createBackup);
  fastify.post('/backups/:id/verify', perm(AdminPermission.SYSTEM_HEALTH_VIEW), ReliabilityController.verifyBackup);

  fastify.get('/recovery/plans', perm(AdminPermission.SYSTEM_HEALTH_VIEW), ReliabilityController.getDRPlans);
  fastify.get('/recovery/plans/:id', perm(AdminPermission.SYSTEM_HEALTH_VIEW), ReliabilityController.getDRPlanById);
  fastify.post('/recovery/plans', superAdminOnly, ReliabilityController.createDRPlan);
  fastify.get('/recovery/runs', perm(AdminPermission.SYSTEM_HEALTH_VIEW), ReliabilityController.getRecoveryRuns);
  fastify.post('/recovery/runs', superAdminOnly, ReliabilityController.executeRecoveryRun);

  // Deployments & Migration Safety
  fastify.get('/deployments', perm(AdminPermission.SYSTEM_HEALTH_VIEW), ReliabilityController.getDeployments);
  fastify.post('/deployments', superAdminOnly, ReliabilityController.createDeployment);
  fastify.post('/deployments/:id/finalize', superAdminOnly, ReliabilityController.finalizeDeployment);
  fastify.post('/deployments/validate-migration', perm(AdminPermission.SYSTEM_HEALTH_VIEW), ReliabilityController.validateMigration);
  fastify.get('/deployments/:id/rollback-readiness', perm(AdminPermission.SYSTEM_HEALTH_VIEW), ReliabilityController.getRollbackReadiness);

  // Structured Logs Buffer Query
  fastify.get('/logs', perm(AdminPermission.AUDIT_VIEW), ReliabilityController.queryLogs);
}
