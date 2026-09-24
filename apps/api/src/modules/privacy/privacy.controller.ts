import { FastifyRequest, FastifyReply } from 'fastify';
import { DataGovernanceService } from './data-governance.service.js';
import { PrivacyRetentionService } from './privacy-retention.service.js';
import { PrivacyLegalHoldService } from './privacy-legal-hold.service.js';
import { PrivacyRequestsService } from './privacy-requests.service.js';
import { PrivacyExportService } from './privacy-export.service.js';
import { PrivacyDeletionService } from './privacy-deletion.service.js';

export class PrivacyController {
  // ==========================================
  // OVERVIEW & METRICS
  // ==========================================

  static async getOverview(req: FastifyRequest, reply: FastifyReply) {
    try {
      const metrics = await DataGovernanceService.getOverviewMetrics();
      return reply.send({ success: true, data: metrics });
    } catch (err: any) {
      req.log.error(err);
      return reply.status(500).send({ success: false, error: err.message });
    }
  }

  // ==========================================
  // DATA ASSETS & INVENTORY
  // ==========================================

  static async listDataAssets(req: FastifyRequest, reply: FastifyReply) {
    try {
      const query = req.query as any;
      const result = await DataGovernanceService.listDataAssets(query);
      return reply.send({ success: true, data: result.assets, total: result.total });
    } catch (err: any) {
      req.log.error(err);
      return reply.status(500).send({ success: false, error: err.message });
    }
  }

  static async getDataAsset(req: FastifyRequest, reply: FastifyReply) {
    try {
      const { id } = req.params as { id: string };
      const asset = await DataGovernanceService.getDataAssetById(id);
      if (!asset) {
        return reply.status(404).send({ success: false, error: 'Data asset not found' });
      }
      return reply.send({ success: true, data: asset });
    } catch (err: any) {
      req.log.error(err);
      return reply.status(500).send({ success: false, error: err.message });
    }
  }

  static async createDataAsset(req: FastifyRequest, reply: FastifyReply) {
    try {
      const body = req.body as any;
      const asset = await DataGovernanceService.createDataAsset(body);
      return reply.status(201).send({ success: true, data: asset });
    } catch (err: any) {
      req.log.error(err);
      return reply.status(400).send({ success: false, error: err.message });
    }
  }

  static async updateDataAsset(req: FastifyRequest, reply: FastifyReply) {
    try {
      const { id } = req.params as { id: string };
      const body = req.body as any;
      const asset = await DataGovernanceService.updateDataAsset(id, body);
      return reply.send({ success: true, data: asset });
    } catch (err: any) {
      req.log.error(err);
      return reply.status(400).send({ success: false, error: err.message });
    }
  }

  // ==========================================
  // DATA LINEAGE
  // ==========================================

  static async getLineageGraph(req: FastifyRequest, reply: FastifyReply) {
    try {
      const graph = await DataGovernanceService.getLineageGraph();
      return reply.send({ success: true, data: graph });
    } catch (err: any) {
      req.log.error(err);
      return reply.status(500).send({ success: false, error: err.message });
    }
  }

  static async addLineageEdge(req: FastifyRequest, reply: FastifyReply) {
    try {
      const body = req.body as any;
      const edge = await DataGovernanceService.addLineageEdge(body);
      return reply.status(201).send({ success: true, data: edge });
    } catch (err: any) {
      req.log.error(err);
      return reply.status(400).send({ success: false, error: err.message });
    }
  }

  // ==========================================
  // RETENTION POLICIES
  // ==========================================

  static async listRetentionPolicies(req: FastifyRequest, reply: FastifyReply) {
    try {
      const policies = await PrivacyRetentionService.listPolicies();
      return reply.send({ success: true, data: policies });
    } catch (err: any) {
      req.log.error(err);
      return reply.status(500).send({ success: false, error: err.message });
    }
  }

  static async getRetentionPolicy(req: FastifyRequest, reply: FastifyReply) {
    try {
      const { id } = req.params as { id: string };
      const policy = await PrivacyRetentionService.getPolicyById(id);
      if (!policy) {
        return reply.status(404).send({ success: false, error: 'Retention policy not found' });
      }
      return reply.send({ success: true, data: policy });
    } catch (err: any) {
      req.log.error(err);
      return reply.status(500).send({ success: false, error: err.message });
    }
  }

  static async createRetentionPolicy(req: FastifyRequest, reply: FastifyReply) {
    try {
      const body = req.body as any;
      const policy = await PrivacyRetentionService.createPolicy(body);
      return reply.status(201).send({ success: true, data: policy });
    } catch (err: any) {
      req.log.error(err);
      return reply.status(400).send({ success: false, error: err.message });
    }
  }

  static async updateRetentionPolicy(req: FastifyRequest, reply: FastifyReply) {
    try {
      const { id } = req.params as { id: string };
      const body = req.body as any;
      const policy = await PrivacyRetentionService.updatePolicy(id, body);
      return reply.send({ success: true, data: policy });
    } catch (err: any) {
      req.log.error(err);
      return reply.status(400).send({ success: false, error: err.message });
    }
  }

  static async deleteRetentionPolicy(req: FastifyRequest, reply: FastifyReply) {
    try {
      const { id } = req.params as { id: string };
      await PrivacyRetentionService.deletePolicy(id);
      return reply.send({ success: true });
    } catch (err: any) {
      req.log.error(err);
      return reply.status(500).send({ success: false, error: err.message });
    }
  }

  static async evaluateRetention(req: FastifyRequest, reply: FastifyReply) {
    try {
      const evaluation = await PrivacyRetentionService.evaluateRetention();
      return reply.send({ success: true, data: evaluation });
    } catch (err: any) {
      req.log.error(err);
      return reply.status(500).send({ success: false, error: err.message });
    }
  }

  // ==========================================
  // LEGAL HOLDS
  // ==========================================

  static async listLegalHolds(req: FastifyRequest, reply: FastifyReply) {
    try {
      const query = req.query as any;
      const holds = await PrivacyLegalHoldService.listLegalHolds(query?.status);
      return reply.send({ success: true, data: holds });
    } catch (err: any) {
      req.log.error(err);
      return reply.status(500).send({ success: false, error: err.message });
    }
  }

  static async getLegalHold(req: FastifyRequest, reply: FastifyReply) {
    try {
      const { id } = req.params as { id: string };
      const hold = await PrivacyLegalHoldService.getLegalHoldById(id);
      if (!hold) {
        return reply.status(404).send({ success: false, error: 'Legal hold not found' });
      }
      return reply.send({ success: true, data: hold });
    } catch (err: any) {
      req.log.error(err);
      return reply.status(500).send({ success: false, error: err.message });
    }
  }

  static async createLegalHold(req: FastifyRequest, reply: FastifyReply) {
    try {
      const body = req.body as any;
      const hold = await PrivacyLegalHoldService.createLegalHold(body);
      return reply.status(201).send({ success: true, data: hold });
    } catch (err: any) {
      req.log.error(err);
      return reply.status(400).send({ success: false, error: err.message });
    }
  }

  static async releaseLegalHold(req: FastifyRequest, reply: FastifyReply) {
    try {
      const { id } = req.params as { id: string };
      const body = req.body as any;
      const hold = await PrivacyLegalHoldService.releaseLegalHold(id, body);
      return reply.send({ success: true, data: hold });
    } catch (err: any) {
      req.log.error(err);
      return reply.status(400).send({ success: false, error: err.message });
    }
  }

  // ==========================================
  // PRIVACY REQUESTS
  // ==========================================

  static async listPrivacyRequests(req: FastifyRequest, reply: FastifyReply) {
    try {
      const query = req.query as any;
      const result = await PrivacyRequestsService.listRequests(query);
      return reply.send({ success: true, data: result.requests, total: result.total });
    } catch (err: any) {
      req.log.error(err);
      return reply.status(500).send({ success: false, error: err.message });
    }
  }

  static async submitPrivacyRequest(req: FastifyRequest, reply: FastifyReply) {
    try {
      const body = req.body as any;
      const request = await PrivacyRequestsService.submitRequest(body);
      return reply.status(201).send({ success: true, data: request });
    } catch (err: any) {
      req.log.error(err);
      return reply.status(400).send({ success: false, error: err.message });
    }
  }

  static async getPrivacyRequest(req: FastifyRequest, reply: FastifyReply) {
    try {
      const { id } = req.params as { id: string };
      const request = await PrivacyRequestsService.getRequestById(id);
      if (!request) {
        return reply.status(404).send({ success: false, error: 'Privacy request not found' });
      }
      return reply.send({ success: true, data: request });
    } catch (err: any) {
      req.log.error(err);
      return reply.status(500).send({ success: false, error: err.message });
    }
  }

  static async verifyPrivacyRequest(req: FastifyRequest, reply: FastifyReply) {
    try {
      const { id } = req.params as { id: string };
      const { token } = req.body as { token: string };
      const request = await PrivacyRequestsService.verifyIdentity(id, token);
      return reply.send({ success: true, data: request });
    } catch (err: any) {
      req.log.error(err);
      return reply.status(400).send({ success: false, error: err.message });
    }
  }

  static async updatePrivacyRequestStatus(req: FastifyRequest, reply: FastifyReply) {
    try {
      const { id } = req.params as { id: string };
      const body = req.body as any;
      const request = await PrivacyRequestsService.updateStatus(id, body);
      return reply.send({ success: true, data: request });
    } catch (err: any) {
      req.log.error(err);
      return reply.status(400).send({ success: false, error: err.message });
    }
  }

  // ==========================================
  // EXPORTS
  // ==========================================

  static async generateExport(req: FastifyRequest, reply: FastifyReply) {
    try {
      const body = req.body as any;
      const exportRecord = await PrivacyExportService.generateExportPackage(body);
      return reply.status(201).send({ success: true, data: exportRecord });
    } catch (err: any) {
      req.log.error(err);
      return reply.status(400).send({ success: false, error: err.message });
    }
  }

  static async listExports(req: FastifyRequest, reply: FastifyReply) {
    try {
      const exports = await PrivacyExportService.listExports();
      return reply.send({ success: true, data: exports });
    } catch (err: any) {
      req.log.error(err);
      return reply.status(500).send({ success: false, error: err.message });
    }
  }

  static async getExport(req: FastifyRequest, reply: FastifyReply) {
    try {
      const { id } = req.params as { id: string };
      const record = await PrivacyExportService.getExportById(id);
      if (!record) {
        return reply.status(404).send({ success: false, error: 'Export record not found' });
      }
      return reply.send({ success: true, data: record });
    } catch (err: any) {
      req.log.error(err);
      return reply.status(500).send({ success: false, error: err.message });
    }
  }

  // ==========================================
  // DELETION ENGINE
  // ==========================================

  static async previewDeletion(req: FastifyRequest, reply: FastifyReply) {
    try {
      const body = req.body as any;
      const preview = await PrivacyDeletionService.previewDeletion(body);
      return reply.send({ success: true, data: preview });
    } catch (err: any) {
      req.log.error(err);
      return reply.status(400).send({ success: false, error: err.message });
    }
  }

  static async executeDeletion(req: FastifyRequest, reply: FastifyReply) {
    try {
      const body = req.body as any;
      const execution = await PrivacyDeletionService.executeDeletion(body);
      return reply.status(201).send({ success: true, data: execution });
    } catch (err: any) {
      req.log.error(err);
      return reply.status(400).send({ success: false, error: err.message });
    }
  }

  static async listDeletions(req: FastifyRequest, reply: FastifyReply) {
    try {
      const executions = await PrivacyDeletionService.listDeletions();
      return reply.send({ success: true, data: executions });
    } catch (err: any) {
      req.log.error(err);
      return reply.status(500).send({ success: false, error: err.message });
    }
  }

  static async getDeletion(req: FastifyRequest, reply: FastifyReply) {
    try {
      const { id } = req.params as { id: string };
      const execution = await PrivacyDeletionService.getDeletionById(id);
      if (!execution) {
        return reply.status(404).send({ success: false, error: 'Deletion execution not found' });
      }
      return reply.send({ success: true, data: execution });
    } catch (err: any) {
      req.log.error(err);
      return reply.status(500).send({ success: false, error: err.message });
    }
  }

  // ==========================================
  // ACCESS REVIEWS
  // ==========================================

  static async listAccessReviews(req: FastifyRequest, reply: FastifyReply) {
    try {
      const reviews = await DataGovernanceService.listAccessReviews();
      return reply.send({ success: true, data: reviews });
    } catch (err: any) {
      req.log.error(err);
      return reply.status(500).send({ success: false, error: err.message });
    }
  }

  static async createAccessReview(req: FastifyRequest, reply: FastifyReply) {
    try {
      const body = req.body as any;
      const review = await DataGovernanceService.createAccessReview(body);
      return reply.status(201).send({ success: true, data: review });
    } catch (err: any) {
      req.log.error(err);
      return reply.status(400).send({ success: false, error: err.message });
    }
  }

  static async updateAccessReviewStatus(req: FastifyRequest, reply: FastifyReply) {
    try {
      const { id } = req.params as { id: string };
      const body = req.body as any;
      const review = await DataGovernanceService.updateAccessReviewStatus(
        id,
        body.status,
        body.findingsSummary,
        body.revocationsCount
      );
      return reply.send({ success: true, data: review });
    } catch (err: any) {
      req.log.error(err);
      return reply.status(400).send({ success: false, error: err.message });
    }
  }

  // ==========================================
  // THIRD PARTY PROVIDERS
  // ==========================================

  static async listProviders(req: FastifyRequest, reply: FastifyReply) {
    try {
      const providers = DataGovernanceService.listThirdPartyProviders();
      return reply.send({ success: true, data: providers });
    } catch (err: any) {
      req.log.error(err);
      return reply.status(500).send({ success: false, error: err.message });
    }
  }

  // ==========================================
  // BIOMETRICS GOVERNANCE
  // ==========================================

  static async getBiometricsStatus(req: FastifyRequest, reply: FastifyReply) {
    try {
      const status = await DataGovernanceService.getBiometricsGovernanceMetrics();
      return reply.send({ success: true, data: status });
    } catch (err: any) {
      req.log.error(err);
      return reply.status(500).send({ success: false, error: err.message });
    }
  }

  // ==========================================
  // CONSENTS
  // ==========================================

  static async listConsents(req: FastifyRequest, reply: FastifyReply) {
    try {
      const query = req.query as any;
      const consents = await DataGovernanceService.listConsents(query);
      return reply.send({ success: true, data: consents });
    } catch (err: any) {
      req.log.error(err);
      return reply.status(500).send({ success: false, error: err.message });
    }
  }

  static async logConsent(req: FastifyRequest, reply: FastifyReply) {
    try {
      const body = req.body as any;
      const consent = await DataGovernanceService.logConsent(body);
      return reply.status(201).send({ success: true, data: consent });
    } catch (err: any) {
      req.log.error(err);
      return reply.status(400).send({ success: false, error: err.message });
    }
  }

  static async revokeConsent(req: FastifyRequest, reply: FastifyReply) {
    try {
      const { userId, consentType } = req.body as { userId: string; consentType: string };
      const revokedCount = await DataGovernanceService.revokeConsent(userId, consentType);
      return reply.send({ success: true, revokedCount });
    } catch (err: any) {
      req.log.error(err);
      return reply.status(400).send({ success: false, error: err.message });
    }
  }
}
