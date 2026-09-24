import { FastifyInstance } from 'fastify';
import { PrivacyController } from './privacy.controller.js';
import {
  requirePlatformAdminSession,
  requirePlatformAdminPermission,
} from '../admin-auth/admin-auth.middleware.js';
import { AdminPermission } from '@pixmatch/types';

export async function privacyRoutes(fastify: FastifyInstance) {
  // All privacy center administrative routes require authenticated admin session
  fastify.addHook('preHandler', requirePlatformAdminSession);

  // Overview & Metrics
  fastify.get(
    '/overview',
    { preHandler: requirePlatformAdminPermission(AdminPermission.PRIVACY_VIEW) },
    PrivacyController.getOverview
  );

  // Data Inventory
  fastify.get(
    '/assets',
    { preHandler: requirePlatformAdminPermission(AdminPermission.PRIVACY_VIEW) },
    PrivacyController.listDataAssets
  );

  fastify.get(
    '/assets/:id',
    { preHandler: requirePlatformAdminPermission(AdminPermission.PRIVACY_VIEW) },
    PrivacyController.getDataAsset
  );

  fastify.post(
    '/assets',
    { preHandler: requirePlatformAdminPermission(AdminPermission.PRIVACY_MANAGE) },
    PrivacyController.createDataAsset
  );

  fastify.put(
    '/assets/:id',
    { preHandler: requirePlatformAdminPermission(AdminPermission.PRIVACY_MANAGE) },
    PrivacyController.updateDataAsset
  );

  // Lineage Graph
  fastify.get(
    '/lineage',
    { preHandler: requirePlatformAdminPermission(AdminPermission.PRIVACY_VIEW) },
    PrivacyController.getLineageGraph
  );

  fastify.post(
    '/lineage',
    { preHandler: requirePlatformAdminPermission(AdminPermission.PRIVACY_MANAGE) },
    PrivacyController.addLineageEdge
  );

  // Retention Policies
  fastify.get(
    '/retention/policies',
    { preHandler: requirePlatformAdminPermission(AdminPermission.PRIVACY_VIEW) },
    PrivacyController.listRetentionPolicies
  );

  fastify.post(
    '/retention/policies',
    { preHandler: requirePlatformAdminPermission(AdminPermission.PRIVACY_RETENTION_MANAGE) },
    PrivacyController.createRetentionPolicy
  );

  fastify.get(
    '/retention/policies/:id',
    { preHandler: requirePlatformAdminPermission(AdminPermission.PRIVACY_VIEW) },
    PrivacyController.getRetentionPolicy
  );

  fastify.put(
    '/retention/policies/:id',
    { preHandler: requirePlatformAdminPermission(AdminPermission.PRIVACY_RETENTION_MANAGE) },
    PrivacyController.updateRetentionPolicy
  );

  fastify.delete(
    '/retention/policies/:id',
    { preHandler: requirePlatformAdminPermission(AdminPermission.PRIVACY_RETENTION_MANAGE) },
    PrivacyController.deleteRetentionPolicy
  );

  fastify.post(
    '/retention/evaluate',
    { preHandler: requirePlatformAdminPermission(AdminPermission.PRIVACY_RETENTION_MANAGE) },
    PrivacyController.evaluateRetention
  );

  // Legal Holds
  fastify.get(
    '/legal-holds',
    { preHandler: requirePlatformAdminPermission(AdminPermission.PRIVACY_VIEW) },
    PrivacyController.listLegalHolds
  );

  fastify.post(
    '/legal-holds',
    { preHandler: requirePlatformAdminPermission(AdminPermission.PRIVACY_LEGAL_HOLD) },
    PrivacyController.createLegalHold
  );

  fastify.get(
    '/legal-holds/:id',
    { preHandler: requirePlatformAdminPermission(AdminPermission.PRIVACY_VIEW) },
    PrivacyController.getLegalHold
  );

  fastify.post(
    '/legal-holds/:id/release',
    { preHandler: requirePlatformAdminPermission(AdminPermission.PRIVACY_LEGAL_HOLD) },
    PrivacyController.releaseLegalHold
  );

  // Privacy Requests
  fastify.get(
    '/requests',
    { preHandler: requirePlatformAdminPermission(AdminPermission.PRIVACY_VIEW) },
    PrivacyController.listPrivacyRequests
  );

  fastify.post(
    '/requests',
    { preHandler: requirePlatformAdminPermission(AdminPermission.PRIVACY_MANAGE) },
    PrivacyController.submitPrivacyRequest
  );

  fastify.get(
    '/requests/:id',
    { preHandler: requirePlatformAdminPermission(AdminPermission.PRIVACY_VIEW) },
    PrivacyController.getPrivacyRequest
  );

  fastify.post(
    '/requests/:id/verify',
    { preHandler: requirePlatformAdminPermission(AdminPermission.PRIVACY_MANAGE) },
    PrivacyController.verifyPrivacyRequest
  );

  fastify.post(
    '/requests/:id/status',
    { preHandler: requirePlatformAdminPermission(AdminPermission.PRIVACY_MANAGE) },
    PrivacyController.updatePrivacyRequestStatus
  );

  // Exports
  fastify.post(
    '/exports',
    { preHandler: requirePlatformAdminPermission(AdminPermission.PRIVACY_EXPORT) },
    PrivacyController.generateExport
  );

  fastify.get(
    '/exports',
    { preHandler: requirePlatformAdminPermission(AdminPermission.PRIVACY_VIEW) },
    PrivacyController.listExports
  );

  fastify.get(
    '/exports/:id',
    { preHandler: requirePlatformAdminPermission(AdminPermission.PRIVACY_VIEW) },
    PrivacyController.getExport
  );

  // Deletion Engine
  fastify.post(
    '/deletion/preview',
    { preHandler: requirePlatformAdminPermission(AdminPermission.PRIVACY_VIEW) },
    PrivacyController.previewDeletion
  );

  fastify.post(
    '/deletion/execute',
    { preHandler: requirePlatformAdminPermission(AdminPermission.PRIVACY_DELETE) },
    PrivacyController.executeDeletion
  );

  fastify.get(
    '/deletion/executions',
    { preHandler: requirePlatformAdminPermission(AdminPermission.PRIVACY_VIEW) },
    PrivacyController.listDeletions
  );

  fastify.get(
    '/deletion/executions/:id',
    { preHandler: requirePlatformAdminPermission(AdminPermission.PRIVACY_VIEW) },
    PrivacyController.getDeletion
  );

  // Access Reviews
  fastify.get(
    '/access-reviews',
    { preHandler: requirePlatformAdminPermission(AdminPermission.PRIVACY_VIEW) },
    PrivacyController.listAccessReviews
  );

  fastify.post(
    '/access-reviews',
    { preHandler: requirePlatformAdminPermission(AdminPermission.PRIVACY_ACCESS_REVIEW) },
    PrivacyController.createAccessReview
  );

  fastify.post(
    '/access-reviews/:id/status',
    { preHandler: requirePlatformAdminPermission(AdminPermission.PRIVACY_ACCESS_REVIEW) },
    PrivacyController.updateAccessReviewStatus
  );

  // Third Party Providers
  fastify.get(
    '/providers',
    { preHandler: requirePlatformAdminPermission(AdminPermission.PRIVACY_VIEW) },
    PrivacyController.listProviders
  );

  // Biometrics
  fastify.get(
    '/biometrics',
    { preHandler: requirePlatformAdminPermission(AdminPermission.PRIVACY_VIEW) },
    PrivacyController.getBiometricsStatus
  );

  // Consents
  fastify.get(
    '/consents',
    { preHandler: requirePlatformAdminPermission(AdminPermission.PRIVACY_VIEW) },
    PrivacyController.listConsents
  );

  fastify.post(
    '/consents',
    { preHandler: requirePlatformAdminPermission(AdminPermission.PRIVACY_MANAGE) },
    PrivacyController.logConsent
  );

  fastify.post(
    '/consents/revoke',
    { preHandler: requirePlatformAdminPermission(AdminPermission.PRIVACY_MANAGE) },
    PrivacyController.revokeConsent
  );
}
