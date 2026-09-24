import { FastifyInstance } from 'fastify';
import { ReleaseController } from './release.controller.js';
import {
  requirePlatformAdminSession,
  requirePlatformAdminPermission,
} from '../admin-auth/admin-auth.middleware.js';
import { AdminPermission } from '@pixmatch/types';

export async function releaseRoutes(fastify: FastifyInstance) {
  // All release and configuration routes require authenticated platform admin session
  fastify.addHook('preHandler', requirePlatformAdminSession);

  // Overview Metrics
  fastify.get(
    '/overview',
    { preHandler: requirePlatformAdminPermission(AdminPermission.RELEASE_VIEW) },
    ReleaseController.getOverviewMetrics
  );

  // Feature Flags
  fastify.get(
    '/feature-flags',
    { preHandler: requirePlatformAdminPermission(AdminPermission.FEATURE_FLAGS_VIEW) },
    ReleaseController.listFeatureFlags
  );

  fastify.get(
    '/feature-flags/:keyOrId',
    { preHandler: requirePlatformAdminPermission(AdminPermission.FEATURE_FLAGS_VIEW) },
    ReleaseController.getFeatureFlag
  );

  fastify.post(
    '/feature-flags',
    { preHandler: requirePlatformAdminPermission(AdminPermission.FEATURE_FLAGS_MANAGE) },
    ReleaseController.createFeatureFlag
  );

  fastify.patch(
    '/feature-flags/:keyOrId',
    { preHandler: requirePlatformAdminPermission(AdminPermission.FEATURE_FLAGS_MANAGE) },
    ReleaseController.updateFeatureFlag
  );

  fastify.post(
    '/feature-flags/:flagKey/evaluate',
    { preHandler: requirePlatformAdminPermission(AdminPermission.FEATURE_FLAGS_VIEW) },
    ReleaseController.evaluateFeatureFlag
  );

  fastify.post(
    '/feature-flags/:keyOrId/rollback',
    { preHandler: requirePlatformAdminPermission(AdminPermission.FEATURE_FLAGS_MANAGE) },
    ReleaseController.rollbackFeatureFlag
  );

  fastify.post(
    '/feature-flags/:keyOrId/kill-switch/activate',
    { preHandler: requirePlatformAdminPermission(AdminPermission.FEATURE_FLAGS_MANAGE) },
    ReleaseController.activateKillSwitch
  );

  fastify.post(
    '/feature-flags/:keyOrId/kill-switch/deactivate',
    { preHandler: requirePlatformAdminPermission(AdminPermission.FEATURE_FLAGS_MANAGE) },
    ReleaseController.deactivateKillSwitch
  );

  // Platform Configuration
  fastify.get(
    '/configuration',
    { preHandler: requirePlatformAdminPermission(AdminPermission.CONFIG_VIEW) },
    ReleaseController.listConfigurations
  );

  fastify.get(
    '/configuration/:key',
    { preHandler: requirePlatformAdminPermission(AdminPermission.CONFIG_VIEW) },
    ReleaseController.getConfiguration
  );

  fastify.post(
    '/configuration',
    { preHandler: requirePlatformAdminPermission(AdminPermission.CONFIG_MANAGE) },
    ReleaseController.createConfiguration
  );

  fastify.patch(
    '/configuration/:key',
    { preHandler: requirePlatformAdminPermission(AdminPermission.CONFIG_MANAGE) },
    ReleaseController.updateConfiguration
  );

  fastify.post(
    '/configuration/:key/diff',
    { preHandler: requirePlatformAdminPermission(AdminPermission.CONFIG_VIEW) },
    ReleaseController.getConfigurationDiff
  );

  // Change Requests
  fastify.get(
    '/changes',
    { preHandler: requirePlatformAdminPermission(AdminPermission.RELEASE_VIEW) },
    ReleaseController.listChangeRequests
  );

  fastify.get(
    '/changes/:id',
    { preHandler: requirePlatformAdminPermission(AdminPermission.RELEASE_VIEW) },
    ReleaseController.getChangeRequest
  );

  fastify.post(
    '/changes',
    { preHandler: requirePlatformAdminPermission(AdminPermission.RELEASE_CREATE) },
    ReleaseController.createChangeRequest
  );

  fastify.post(
    '/changes/:id/approve',
    { preHandler: requirePlatformAdminPermission(AdminPermission.RELEASE_APPROVE) },
    ReleaseController.approveChangeRequest
  );

  fastify.post(
    '/changes/:id/execute',
    { preHandler: requirePlatformAdminPermission(AdminPermission.RELEASE_DEPLOY) },
    ReleaseController.executeChangeRequest
  );

  fastify.post(
    '/changes/:id/cancel',
    { preHandler: requirePlatformAdminPermission(AdminPermission.RELEASE_CREATE) },
    ReleaseController.cancelChangeRequest
  );

  // Releases
  fastify.get(
    '/releases',
    { preHandler: requirePlatformAdminPermission(AdminPermission.RELEASE_VIEW) },
    ReleaseController.listReleases
  );

  fastify.post(
    '/releases',
    { preHandler: requirePlatformAdminPermission(AdminPermission.RELEASE_CREATE) },
    ReleaseController.createRelease
  );

  fastify.get(
    '/releases/:idOrVersion',
    { preHandler: requirePlatformAdminPermission(AdminPermission.RELEASE_VIEW) },
    ReleaseController.getRelease
  );

  fastify.post(
    '/releases/:id/deploy',
    { preHandler: requirePlatformAdminPermission(AdminPermission.RELEASE_DEPLOY) },
    ReleaseController.deployRelease
  );

  fastify.post(
    '/releases/:id/rollback',
    { preHandler: requirePlatformAdminPermission(AdminPermission.RELEASE_ROLLBACK) },
    ReleaseController.rollbackRelease
  );

  fastify.get(
    '/releases/:id/health',
    { preHandler: requirePlatformAdminPermission(AdminPermission.RELEASE_VIEW) },
    ReleaseController.getReleaseHealth
  );

  // Environments & Drift
  fastify.get(
    '/environments/compare',
    { preHandler: requirePlatformAdminPermission(AdminPermission.ENVIRONMENT_VIEW) },
    ReleaseController.compareEnvironments
  );

  fastify.get(
    '/drift',
    { preHandler: requirePlatformAdminPermission(AdminPermission.ENVIRONMENT_VIEW) },
    ReleaseController.listDrifts
  );

  fastify.post(
    '/drift/scan',
    { preHandler: requirePlatformAdminPermission(AdminPermission.ENVIRONMENT_VIEW) },
    ReleaseController.scanDrifts
  );

  fastify.post(
    '/drift/:id/acknowledge',
    { preHandler: requirePlatformAdminPermission(AdminPermission.CONFIG_MANAGE) },
    ReleaseController.acknowledgeDrift
  );

  fastify.post(
    '/drift/:id/resolve',
    { preHandler: requirePlatformAdminPermission(AdminPermission.CONFIG_MANAGE) },
    ReleaseController.resolveDrift
  );
}
