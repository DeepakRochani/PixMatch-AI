/**
 * Growth Controller — PixMatch AI Phase 19
 * Request handlers for AI Business Growth, Reactivation, Marketing Campaigns,
 * Approvals, Tracking, and Super Admin Telemetry.
 */

import { FastifyRequest, FastifyReply } from 'fastify';
import { GrowthOpportunityService } from './growth-opportunity.service.js';
import { ClientReactivationService } from './client-reactivation.service.js';
import { MarketingCampaignService } from './marketing-campaign.service.js';
import { CampaignExecutionService } from './campaign-execution.service.js';
import { GrowthPerformanceService } from './growth-performance.service.js';
import { ServiceGrowthService } from './service-growth.service.js';
import { GrowthAdminService } from './growth-admin.service.js';
import {
  CreateCampaignDraftDTO,
  UpdateCampaignDraftDTO,
  ApproveCampaignDTO,
  ScheduleCampaignDTO,
  CreateGrowthGoalDTO,
} from '@pixmatch/types';

export class GrowthController {
  // Helper to extract studioId from authenticated user request
  private static getStudioId(req: FastifyRequest): string {
    const studioId =
      (req.headers['x-studio-id'] as string) ||
      (req.user as any)?.studio_id ||
      (req.user as any)?.studioId ||
      (req.query as any)?.studio_id ||
      (req.query as any)?.studioId;

    if (!studioId) {
      throw new Error('Studio ID is required');
    }
    return studioId;
  }

  private static getUserId(req: FastifyRequest): string {
    return (req.user as any)?.id || (req.user as any)?.userId || 'system-user';
  }

  // 1. Growth Overview
  static async getOverview(req: FastifyRequest, reply: FastifyReply) {
    try {
      const studioId = GrowthController.getStudioId(req);
      const data = await GrowthPerformanceService.getOverview(studioId);
      return reply.send({ success: true, data });
    } catch (err: any) {
      return reply.status(400).send({ success: false, error: err.message });
    }
  }

  // 2. Growth Opportunities
  static async listOpportunities(req: FastifyRequest, reply: FastifyReply) {
    try {
      const studioId = GrowthController.getStudioId(req);
      const query = req.query as any;
      const data = await GrowthOpportunityService.listOpportunities(studioId, {
        type: query.type,
        priority: query.priority,
        status: query.status,
        search: query.search,
        limit: query.limit ? parseInt(query.limit, 10) : 50,
        offset: query.offset ? parseInt(query.offset, 10) : 0,
      });
      return reply.send({ success: true, data });
    } catch (err: any) {
      return reply.status(400).send({ success: false, error: err.message });
    }
  }

  static async scanOpportunities(req: FastifyRequest, reply: FastifyReply) {
    try {
      const studioId = GrowthController.getStudioId(req);
      const result = await GrowthOpportunityService.scanOpportunities(studioId);
      return reply.send({ success: true, data: result });
    } catch (err: any) {
      return reply.status(400).send({ success: false, error: err.message });
    }
  }

  static async getOpportunity(req: FastifyRequest, reply: FastifyReply) {
    try {
      const studioId = GrowthController.getStudioId(req);
      const { opportunityId } = req.params as { opportunityId: string };
      const data = await GrowthOpportunityService.getOpportunity(studioId, opportunityId);
      if (!data) {
        return reply.status(404).send({ success: false, error: 'Opportunity not found' });
      }
      return reply.send({ success: true, data });
    } catch (err: any) {
      return reply.status(400).send({ success: false, error: err.message });
    }
  }

  static async updateOpportunityStatus(req: FastifyRequest, reply: FastifyReply) {
    try {
      const studioId = GrowthController.getStudioId(req);
      const { opportunityId } = req.params as { opportunityId: string };
      const { status } = req.body as { status: any };
      const data = await GrowthOpportunityService.updateStatus(studioId, opportunityId, status);
      return reply.send({ success: true, data });
    } catch (err: any) {
      return reply.status(400).send({ success: false, error: err.message });
    }
  }

  // 3. Client Reactivation Hub
  static async getReactivationCandidates(req: FastifyRequest, reply: FastifyReply) {
    try {
      const studioId = GrowthController.getStudioId(req);
      const query = req.query as any;
      const candidates = await ClientReactivationService.getReactivationCandidates(studioId, {
        min_days_inactive: query.min_days_inactive ? parseInt(query.min_days_inactive, 10) : undefined,
        max_days_inactive: query.max_days_inactive ? parseInt(query.max_days_inactive, 10) : undefined,
        min_engagement_score: query.min_engagement_score ? parseInt(query.min_engagement_score, 10) : undefined,
        category: query.category,
        search: query.search,
        exclude_suppressed: query.exclude_suppressed === 'true',
      });
      return reply.send({ success: true, data: { candidates, total: candidates.length } });
    } catch (err: any) {
      return reply.status(400).send({ success: false, error: err.message });
    }
  }

  // 4. Marketing Campaigns & Builder
  static async previewRecipients(req: FastifyRequest, reply: FastifyReply) {
    try {
      const studioId = GrowthController.getStudioId(req);
      const body = (req.body as any) || {};
      const data = await MarketingCampaignService.previewRecipients(
        studioId,
        body.segment_definition,
        body.recipients
      );
      return reply.send({ success: true, data });
    } catch (err: any) {
      return reply.status(400).send({ success: false, error: err.message });
    }
  }

  static async createCampaignDraft(req: FastifyRequest, reply: FastifyReply) {
    try {
      const studioId = GrowthController.getStudioId(req);
      const userId = GrowthController.getUserId(req);
      const dto = req.body as CreateCampaignDraftDTO;
      const data = await MarketingCampaignService.createDraft(studioId, userId, dto);
      return reply.status(201).send({ success: true, data });
    } catch (err: any) {
      return reply.status(400).send({ success: false, error: err.message });
    }
  }

  static async listCampaigns(req: FastifyRequest, reply: FastifyReply) {
    try {
      const studioId = GrowthController.getStudioId(req);
      const query = req.query as any;
      const data = await MarketingCampaignService.listCampaigns(studioId, {
        status: query.status,
        search: query.search,
        limit: query.limit ? parseInt(query.limit, 10) : 50,
        offset: query.offset ? parseInt(query.offset, 10) : 0,
      });
      return reply.send({ success: true, data });
    } catch (err: any) {
      return reply.status(400).send({ success: false, error: err.message });
    }
  }

  static async getCampaign(req: FastifyRequest, reply: FastifyReply) {
    try {
      const studioId = GrowthController.getStudioId(req);
      const { campaignId } = req.params as { campaignId: string };
      const data = await MarketingCampaignService.getCampaign(studioId, campaignId);
      if (!data) {
        return reply.status(404).send({ success: false, error: 'Campaign not found' });
      }
      return reply.send({ success: true, data });
    } catch (err: any) {
      return reply.status(400).send({ success: false, error: err.message });
    }
  }

  static async updateCampaignDraft(req: FastifyRequest, reply: FastifyReply) {
    try {
      const studioId = GrowthController.getStudioId(req);
      const { campaignId } = req.params as { campaignId: string };
      const dto = req.body as UpdateCampaignDraftDTO;
      const data = await MarketingCampaignService.updateDraft(studioId, campaignId, dto);
      return reply.send({ success: true, data });
    } catch (err: any) {
      return reply.status(400).send({ success: false, error: err.message });
    }
  }

  static async deleteCampaign(req: FastifyRequest, reply: FastifyReply) {
    try {
      const studioId = GrowthController.getStudioId(req);
      const { campaignId } = req.params as { campaignId: string };
      await MarketingCampaignService.deleteCampaign(studioId, campaignId);
      return reply.send({ success: true, message: 'Campaign deleted successfully' });
    } catch (err: any) {
      return reply.status(400).send({ success: false, error: err.message });
    }
  }

  // 5. Strict Human Approval Gate
  static async approveCampaign(req: FastifyRequest, reply: FastifyReply) {
    try {
      const studioId = GrowthController.getStudioId(req);
      const userId = GrowthController.getUserId(req);
      const { campaignId } = req.params as { campaignId: string };
      const body = (req.body as ApproveCampaignDTO) || {};
      const data = await MarketingCampaignService.approveCampaign(
        studioId,
        campaignId,
        userId,
        body.approval_note
      );
      return reply.send({ success: true, data });
    } catch (err: any) {
      return reply.status(400).send({ success: false, error: err.message });
    }
  }

  // 6. Scheduling & Execution
  static async scheduleCampaign(req: FastifyRequest, reply: FastifyReply) {
    try {
      const studioId = GrowthController.getStudioId(req);
      const { campaignId } = req.params as { campaignId: string };
      const { scheduled_at } = req.body as ScheduleCampaignDTO;
      const data = await MarketingCampaignService.scheduleCampaign(studioId, campaignId, scheduled_at);
      return reply.send({ success: true, data });
    } catch (err: any) {
      return reply.status(400).send({ success: false, error: err.message });
    }
  }

  static async dispatchCampaign(req: FastifyRequest, reply: FastifyReply) {
    try {
      const studioId = GrowthController.getStudioId(req);
      const { campaignId } = req.params as { campaignId: string };
      const result = await CampaignExecutionService.dispatchCampaign(studioId, campaignId);
      return reply.send({ success: true, data: result });
    } catch (err: any) {
      return reply.status(400).send({ success: false, error: err.message });
    }
  }

  // 7. Recipients & CSV Export
  static async listCampaignRecipients(req: FastifyRequest, reply: FastifyReply) {
    try {
      const studioId = GrowthController.getStudioId(req);
      const { campaignId } = req.params as { campaignId: string };
      const query = req.query as any;
      const data = await MarketingCampaignService.listRecipients(studioId, campaignId, {
        status: query.status,
        limit: query.limit ? parseInt(query.limit, 10) : 50,
        offset: query.offset ? parseInt(query.offset, 10) : 0,
      });
      return reply.send({ success: true, data });
    } catch (err: any) {
      return reply.status(400).send({ success: false, error: err.message });
    }
  }

  static async exportCampaignRecipientsCsv(req: FastifyRequest, reply: FastifyReply) {
    try {
      const studioId = GrowthController.getStudioId(req);
      const { campaignId } = req.params as { campaignId: string };
      const csv = await MarketingCampaignService.exportRecipientsCsv(studioId, campaignId);
      return reply
        .header('Content-Type', 'text/csv')
        .header('Content-Disposition', `attachment; filename="campaign-${campaignId}-recipients.csv"`)
        .send(csv);
    } catch (err: any) {
      return reply.status(400).send({ success: false, error: err.message });
    }
  }

  // 8. Performance & Services
  static async getCampaignPerformance(req: FastifyRequest, reply: FastifyReply) {
    try {
      const studioId = GrowthController.getStudioId(req);
      const { campaignId } = req.params as { campaignId: string };
      const data = await GrowthPerformanceService.getCampaignPerformance(studioId, campaignId);
      return reply.send({ success: true, data });
    } catch (err: any) {
      return reply.status(400).send({ success: false, error: err.message });
    }
  }

  static async getServiceGrowth(req: FastifyRequest, reply: FastifyReply) {
    try {
      const studioId = GrowthController.getStudioId(req);
      const data = await ServiceGrowthService.getServiceGrowth(studioId);
      return reply.send({ success: true, data });
    } catch (err: any) {
      return reply.status(400).send({ success: false, error: err.message });
    }
  }

  // 9. Goals
  static async listGoals(req: FastifyRequest, reply: FastifyReply) {
    try {
      const studioId = GrowthController.getStudioId(req);
      const goals = await GrowthPerformanceService.listGoals(studioId);
      return reply.send({ success: true, data: { goals } });
    } catch (err: any) {
      return reply.status(400).send({ success: false, error: err.message });
    }
  }

  static async createGoal(req: FastifyRequest, reply: FastifyReply) {
    try {
      const studioId = GrowthController.getStudioId(req);
      const dto = req.body as CreateGrowthGoalDTO;
      const data = await GrowthPerformanceService.createGoal(studioId, dto);
      return reply.status(201).send({ success: true, data });
    } catch (err: any) {
      return reply.status(400).send({ success: false, error: err.message });
    }
  }

  // 10. Public Open & Click Tracking (No Auth required)
  static async trackOpen(req: FastifyRequest, reply: FastifyReply) {
    try {
      const { t } = req.query as { t?: string };
      if (t) {
        await CampaignExecutionService.recordOpen(t);
      }
    } catch {
      // Silently continue for tracking pixel
    }
    // Return 1x1 transparent GIF
    const transparentGif = Buffer.from(
      'R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7',
      'base64'
    );
    return reply
      .header('Content-Type', 'image/gif')
      .header('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate')
      .send(transparentGif);
  }

  static async trackClick(req: FastifyRequest, reply: FastifyReply) {
    try {
      const { t, url } = req.query as { t?: string; url?: string };
      if (t) {
        const result = await CampaignExecutionService.recordClick(t);
        const destination = result.redirectUrl || url || '/';
        return reply.redirect(destination);
      }
      return reply.redirect(url || '/');
    } catch {
      return reply.redirect('/');
    }
  }

  // 11. Super Admin Telemetry
  static async getAdminTelemetry(req: FastifyRequest, reply: FastifyReply) {
    try {
      const user = (req.user as any) || {};
      if (user.role !== 'ADMIN' && user.role !== 'SUPER_ADMIN') {
        return reply.status(403).send({ success: false, error: 'Forbidden: Super Admin access required' });
      }
      const data = await GrowthAdminService.getGrowthTelemetry();
      return reply.send({ success: true, data });
    } catch (err: any) {
      return reply.status(400).send({ success: false, error: err.message });
    }
  }
}
