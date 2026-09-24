import { FastifyRequest, FastifyReply } from 'fastify';
import { FeatureFlagService } from './feature-flag.service.js';
import { ConfigurationService } from './configuration.service.js';
import { ChangeRequestService } from './change-request.service.js';
import { ReleaseService } from './release.service.js';
import { DriftService } from './drift.service.js';

export class ReleaseController {
  // Overview
  static async getOverviewMetrics(_req: FastifyRequest, reply: FastifyReply) {
    try {
      const metrics = await ReleaseService.getOverviewMetrics();
      reply.send({ success: true, data: metrics });
    } catch (err: any) {
      reply.status(500).send({ success: false, error: err.message });
    }
  }

  // Feature Flags
  static async listFeatureFlags(req: FastifyRequest<{ Querystring: any }>, reply: FastifyReply) {
    try {
      const flags = await FeatureFlagService.listFeatureFlags(req.query);
      reply.send({ success: true, data: flags });
    } catch (err: any) {
      reply.status(500).send({ success: false, error: err.message });
    }
  }

  static async getFeatureFlag(req: FastifyRequest<{ Params: { keyOrId: string } }>, reply: FastifyReply) {
    try {
      const flag = await FeatureFlagService.getFeatureFlag(req.params.keyOrId);
      if (!flag) return reply.status(404).send({ success: false, error: 'Feature flag not found' });
      reply.send({ success: true, data: flag });
    } catch (err: any) {
      reply.status(500).send({ success: false, error: err.message });
    }
  }

  static async createFeatureFlag(req: FastifyRequest<{ Body: any }>, reply: FastifyReply) {
    try {
      const actorId = (req as any).adminSession?.user_id || 'admin';
      const flag = await FeatureFlagService.createFeatureFlag(req.body, actorId);
      reply.status(201).send({ success: true, data: flag });
    } catch (err: any) {
      reply.status(400).send({ success: false, error: err.message });
    }
  }

  static async updateFeatureFlag(
    req: FastifyRequest<{ Params: { keyOrId: string }; Body: any }>,
    reply: FastifyReply
  ) {
    try {
      const actorId = (req as any).adminSession?.user_id || 'admin';
      const flag = await FeatureFlagService.updateFeatureFlag(
        req.params.keyOrId,
        req.body,
        req.body.change_reason,
        actorId
      );
      reply.send({ success: true, data: flag });
    } catch (err: any) {
      reply.status(400).send({ success: false, error: err.message });
    }
  }

  static async evaluateFeatureFlag(
    req: FastifyRequest<{ Params: { flagKey: string }; Body: any }>,
    reply: FastifyReply
  ) {
    try {
      const result = await FeatureFlagService.evaluateFeatureFlag(req.params.flagKey, req.body);
      reply.send({ success: true, data: result });
    } catch (err: any) {
      reply.status(500).send({ success: false, error: err.message });
    }
  }

  static async rollbackFeatureFlag(
    req: FastifyRequest<{ Params: { keyOrId: string }; Body: { target_version: number; reason: string } }>,
    reply: FastifyReply
  ) {
    try {
      const actorId = (req as any).adminSession?.user_id || 'admin';
      const flag = await FeatureFlagService.rollbackFeatureFlag(
        req.params.keyOrId,
        req.body.target_version,
        req.body.reason,
        actorId
      );
      reply.send({ success: true, data: flag });
    } catch (err: any) {
      reply.status(400).send({ success: false, error: err.message });
    }
  }

  static async activateKillSwitch(
    req: FastifyRequest<{ Params: { keyOrId: string }; Body: { reason: string } }>,
    reply: FastifyReply
  ) {
    try {
      const actorId = (req as any).adminSession?.user_id || 'admin';
      const flag = await FeatureFlagService.activateKillSwitch(
        req.params.keyOrId,
        req.body.reason,
        actorId
      );
      reply.send({ success: true, data: flag });
    } catch (err: any) {
      reply.status(400).send({ success: false, error: err.message });
    }
  }

  static async deactivateKillSwitch(
    req: FastifyRequest<{ Params: { keyOrId: string } }>,
    reply: FastifyReply
  ) {
    try {
      const actorId = (req as any).adminSession?.user_id || 'admin';
      const flag = await FeatureFlagService.deactivateKillSwitch(req.params.keyOrId, actorId);
      reply.send({ success: true, data: flag });
    } catch (err: any) {
      reply.status(400).send({ success: false, error: err.message });
    }
  }

  // Configurations
  static async listConfigurations(req: FastifyRequest<{ Querystring: any }>, reply: FastifyReply) {
    try {
      const configs = await ConfigurationService.listConfigurations(req.query);
      reply.send({ success: true, data: configs });
    } catch (err: any) {
      reply.status(500).send({ success: false, error: err.message });
    }
  }

  static async getConfiguration(
    req: FastifyRequest<{ Params: { key: string }; Querystring: { environment?: any } }>,
    reply: FastifyReply
  ) {
    try {
      const config = await ConfigurationService.getConfiguration(req.params.key, req.query.environment);
      if (!config) return reply.status(404).send({ success: false, error: 'Configuration not found' });
      reply.send({ success: true, data: config });
    } catch (err: any) {
      reply.status(500).send({ success: false, error: err.message });
    }
  }

  static async createConfiguration(req: FastifyRequest<{ Body: any }>, reply: FastifyReply) {
    try {
      const actorId = (req as any).adminSession?.user_id || 'admin';
      const config = await ConfigurationService.createConfiguration(req.body, actorId);
      reply.status(201).send({ success: true, data: config });
    } catch (err: any) {
      reply.status(400).send({ success: false, error: err.message });
    }
  }

  static async updateConfiguration(
    req: FastifyRequest<{ Params: { key: string }; Body: any }>,
    reply: FastifyReply
  ) {
    try {
      const actorId = (req as any).adminSession?.user_id || 'admin';
      const config = await ConfigurationService.updateConfiguration(
        req.params.key,
        req.body.value,
        req.body.environment,
        req.body.reason,
        actorId
      );
      reply.send({ success: true, data: config });
    } catch (err: any) {
      reply.status(400).send({ success: false, error: err.message });
    }
  }

  static async getConfigurationDiff(
    req: FastifyRequest<{ Params: { key: string }; Body: any }>,
    reply: FastifyReply
  ) {
    try {
      const diff = await ConfigurationService.calculateDiff(
        req.params.key,
        req.body.proposed_value,
        req.body.environment
      );
      reply.send({ success: true, data: diff });
    } catch (err: any) {
      reply.status(500).send({ success: false, error: err.message });
    }
  }

  // Change Requests
  static async listChangeRequests(req: FastifyRequest<{ Querystring: any }>, reply: FastifyReply) {
    try {
      const requests = await ChangeRequestService.listChangeRequests(req.query);
      reply.send({ success: true, data: requests });
    } catch (err: any) {
      reply.status(500).send({ success: false, error: err.message });
    }
  }

  static async getChangeRequest(req: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) {
    try {
      const request = await ChangeRequestService.getChangeRequest(req.params.id);
      if (!request) return reply.status(404).send({ success: false, error: 'Change request not found' });
      reply.send({ success: true, data: request });
    } catch (err: any) {
      reply.status(500).send({ success: false, error: err.message });
    }
  }

  static async createChangeRequest(req: FastifyRequest<{ Body: any }>, reply: FastifyReply) {
    try {
      const actorId = (req as any).adminSession?.user_id || 'admin';
      const request = await ChangeRequestService.createChangeRequest(req.body, actorId, req.body.requester_email);
      reply.status(201).send({ success: true, data: request });
    } catch (err: any) {
      reply.status(400).send({ success: false, error: err.message });
    }
  }

  static async approveChangeRequest(
    req: FastifyRequest<{ Params: { id: string }; Body: any }>,
    reply: FastifyReply
  ) {
    try {
      const approverId = (req as any).adminSession?.user_id || req.body.approver_id || 'approver-admin';
      const updated = await ChangeRequestService.submitApproval(
        req.params.id,
        req.body.decision,
        req.body.reason,
        approverId,
        req.body.approver_email
      );
      reply.send({ success: true, data: updated });
    } catch (err: any) {
      reply.status(400).send({ success: false, error: err.message });
    }
  }

  static async executeChangeRequest(req: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) {
    try {
      const executorId = (req as any).adminSession?.user_id || 'admin';
      const executed = await ChangeRequestService.executeChangeRequest(req.params.id, executorId);
      reply.send({ success: true, data: executed });
    } catch (err: any) {
      reply.status(400).send({ success: false, error: err.message });
    }
  }

  static async cancelChangeRequest(
    req: FastifyRequest<{ Params: { id: string }; Body: { reason: string } }>,
    reply: FastifyReply
  ) {
    try {
      const actorId = (req as any).adminSession?.user_id || 'admin';
      const cancelled = await ChangeRequestService.cancelChangeRequest(req.params.id, req.body.reason, actorId);
      reply.send({ success: true, data: cancelled });
    } catch (err: any) {
      reply.status(400).send({ success: false, error: err.message });
    }
  }

  // Releases
  static async listReleases(req: FastifyRequest<{ Querystring: any }>, reply: FastifyReply) {
    try {
      const releases = await ReleaseService.listReleases(req.query);
      reply.send({ success: true, data: releases });
    } catch (err: any) {
      reply.status(500).send({ success: false, error: err.message });
    }
  }

  static async createRelease(req: FastifyRequest<{ Body: any }>, reply: FastifyReply) {
    try {
      const creatorId = (req as any).adminSession?.user_id || 'admin';
      const release = await ReleaseService.createRelease(req.body, creatorId);
      reply.status(201).send({ success: true, data: release });
    } catch (err: any) {
      reply.status(400).send({ success: false, error: err.message });
    }
  }

  static async getRelease(req: FastifyRequest<{ Params: { idOrVersion: string } }>, reply: FastifyReply) {
    try {
      const release = await ReleaseService.getRelease(req.params.idOrVersion);
      if (!release) return reply.status(404).send({ success: false, error: 'Release not found' });
      reply.send({ success: true, data: release });
    } catch (err: any) {
      reply.status(500).send({ success: false, error: err.message });
    }
  }

  static async deployRelease(req: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) {
    try {
      const deployerId = (req as any).adminSession?.user_id || 'admin';
      const release = await ReleaseService.deployRelease(req.params.id, deployerId);
      reply.send({ success: true, data: release });
    } catch (err: any) {
      reply.status(400).send({ success: false, error: err.message });
    }
  }

  static async rollbackRelease(
    req: FastifyRequest<{ Params: { id: string }; Body: { reason: string } }>,
    reply: FastifyReply
  ) {
    try {
      const operatorId = (req as any).adminSession?.user_id || 'admin';
      const release = await ReleaseService.rollbackRelease(req.params.id, req.body.reason, operatorId);
      reply.send({ success: true, data: release });
    } catch (err: any) {
      reply.status(400).send({ success: false, error: err.message });
    }
  }

  static async getReleaseHealth(
    req: FastifyRequest<{ Params: { id: string }; Querystring: { window?: string } }>,
    reply: FastifyReply
  ) {
    try {
      const windowMinutes = req.query.window ? Number(req.query.window) : 15;
      const health = await ReleaseService.evaluateReleaseHealth(req.params.id, windowMinutes);
      reply.send({ success: true, data: health });
    } catch (err: any) {
      reply.status(500).send({ success: false, error: err.message });
    }
  }

  // Environments & Drift
  static async compareEnvironments(_req: FastifyRequest, reply: FastifyReply) {
    try {
      const comparison = await DriftService.compareEnvironments();
      reply.send({ success: true, data: comparison });
    } catch (err: any) {
      reply.status(500).send({ success: false, error: err.message });
    }
  }

  static async listDrifts(req: FastifyRequest<{ Querystring: any }>, reply: FastifyReply) {
    try {
      const drifts = await DriftService.listDriftEvents(req.query);
      reply.send({ success: true, data: drifts });
    } catch (err: any) {
      reply.status(500).send({ success: false, error: err.message });
    }
  }

  static async scanDrifts(req: FastifyRequest<{ Body: { environment?: any } }>, reply: FastifyReply) {
    try {
      const drifts = await DriftService.scanForDrifts(req.body?.environment);
      reply.send({ success: true, data: drifts });
    } catch (err: any) {
      reply.status(500).send({ success: false, error: err.message });
    }
  }

  static async acknowledgeDrift(req: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) {
    try {
      const actorId = (req as any).adminSession?.user_id || 'admin';
      const drift = await DriftService.acknowledgeDrift(req.params.id, actorId);
      reply.send({ success: true, data: drift });
    } catch (err: any) {
      reply.status(400).send({ success: false, error: err.message });
    }
  }

  static async resolveDrift(req: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) {
    try {
      const actorId = (req as any).adminSession?.user_id || 'admin';
      const drift = await DriftService.resolveDrift(req.params.id, actorId);
      reply.send({ success: true, data: drift });
    } catch (err: any) {
      reply.status(400).send({ success: false, error: err.message });
    }
  }
}
