/**
 * Client Intelligence Controller — PIXMatch AI Phase 17
 * Handles Fastify requests for Client 360, Engagement Scoring, Journey State, Insights, Follow-ups & Communications.
 */

import { FastifyRequest, FastifyReply } from 'fastify';
import { ClientEngagementService } from './client-engagement.service.js';
import { ClientJourneyService } from './client-journey.service.js';
import { ClientInsightService } from './client-insight.service.js';
import { ClientFollowUpService } from './client-followup.service.js';
import { ClientCommunicationService } from './client-communication.service.js';
import { Client360Service } from './client-360.service.js';
import {
  ClientFollowUpStatus,
  ClientCommunicationStatus,
  ClientCommunicationChannel,
  ClientInsightStatus,
  ClientJourneyStage,
} from '@pixmatch/types';

export class ClientIntelligenceController {
  private static engagementService = new ClientEngagementService();
  private static journeyService = new ClientJourneyService();
  private static insightService = new ClientInsightService();
  private static followUpService = new ClientFollowUpService();
  private static communicationService = new ClientCommunicationService();
  private static client360Service = new Client360Service();

  // ----------------------------------------------------
  // CLIENT 360 & STUDIO OVERVIEW
  // ----------------------------------------------------
  static async getClient360(request: FastifyRequest, reply: FastifyReply) {
    const user = (request as any).user;
    const { clientId } = request.params as { clientId: string };

    if (!user || !user.studioId) {
      return reply.status(401).send({ success: false, error: { code: 'UNAUTHORIZED', message: 'Studio authentication required.' } });
    }

    try {
      const data = await ClientIntelligenceController.client360Service.getClient360(user.studioId, clientId);
      return reply.status(200).send({ success: true, data });
    } catch (err: any) {
      return reply.status(err.message?.includes('not found') ? 404 : 500).send({
        success: false,
        error: { code: 'CLIENT_360_FAILED', message: err.message || 'Failed to fetch Client 360.' },
      });
    }
  }

  static async getClientTimeline(request: FastifyRequest, reply: FastifyReply) {
    const user = (request as any).user;
    const { clientId } = request.params as { clientId: string };

    if (!user || !user.studioId) {
      return reply.status(401).send({ success: false, error: { code: 'UNAUTHORIZED', message: 'Studio authentication required.' } });
    }

    try {
      const data = await ClientIntelligenceController.client360Service.getClientTimeline(user.studioId, clientId);
      return reply.status(200).send({ success: true, data });
    } catch (err: any) {
      return reply.status(500).send({
        success: false,
        error: { code: 'TIMELINE_FAILED', message: err.message || 'Failed to fetch timeline.' },
      });
    }
  }

  static async getStudioOverview(request: FastifyRequest, reply: FastifyReply) {
    const user = (request as any).user;

    if (!user || !user.studioId) {
      return reply.status(401).send({ success: false, error: { code: 'UNAUTHORIZED', message: 'Studio authentication required.' } });
    }

    try {
      const data = await ClientIntelligenceController.client360Service.getClientIntelligenceOverview(user.studioId);
      return reply.status(200).send({ success: true, data });
    } catch (err: any) {
      return reply.status(500).send({
        success: false,
        error: { code: 'OVERVIEW_FAILED', message: err.message || 'Failed to fetch studio intelligence overview.' },
      });
    }
  }

  // ----------------------------------------------------
  // ENGAGEMENT & RECALCULATION
  // ----------------------------------------------------
  static async getEngagementProfile(request: FastifyRequest, reply: FastifyReply) {
    const user = (request as any).user;
    const { clientId } = request.params as { clientId: string };

    if (!user || !user.studioId) {
      return reply.status(401).send({ success: false, error: { code: 'UNAUTHORIZED', message: 'Studio authentication required.' } });
    }

    try {
      const data = await ClientIntelligenceController.engagementService.getEngagementProfile(user.studioId, clientId);
      return reply.status(200).send({ success: true, data });
    } catch (err: any) {
      return reply.status(500).send({
        success: false,
        error: { code: 'ENGAGEMENT_FAILED', message: err.message || 'Failed to fetch engagement profile.' },
      });
    }
  }

  static async recalculateEngagement(request: FastifyRequest, reply: FastifyReply) {
    const user = (request as any).user;
    const { clientId } = request.params as { clientId: string };

    if (!user || !user.studioId) {
      return reply.status(401).send({ success: false, error: { code: 'UNAUTHORIZED', message: 'Studio authentication required.' } });
    }

    try {
      const data = await ClientIntelligenceController.engagementService.calculateAndPersistProfile(user.studioId, clientId);
      return reply.status(200).send({ success: true, data });
    } catch (err: any) {
      return reply.status(500).send({
        success: false,
        error: { code: 'RECALCULATION_FAILED', message: err.message || 'Failed to recalculate engagement.' },
      });
    }
  }

  static async bulkRecalculateEngagement(request: FastifyRequest, reply: FastifyReply) {
    const user = (request as any).user;

    if (!user || !user.studioId) {
      return reply.status(401).send({ success: false, error: { code: 'UNAUTHORIZED', message: 'Studio authentication required.' } });
    }

    try {
      const result = await ClientIntelligenceController.engagementService.bulkRecalculateStudio(user.studioId);
      return reply.status(200).send({ success: true, data: result });
    } catch (err: any) {
      return reply.status(500).send({
        success: false,
        error: { code: 'BULK_RECALCULATION_FAILED', message: err.message || 'Failed to bulk recalculate engagement.' },
      });
    }
  }

  // ----------------------------------------------------
  // JOURNEY & REPEAT DETECTION
  // ----------------------------------------------------
  static async getJourneyState(request: FastifyRequest, reply: FastifyReply) {
    const user = (request as any).user;
    const { clientId } = request.params as { clientId: string };

    if (!user || !user.studioId) {
      return reply.status(401).send({ success: false, error: { code: 'UNAUTHORIZED', message: 'Studio authentication required.' } });
    }

    try {
      const data = await ClientIntelligenceController.journeyService.getJourneyState(user.studioId, clientId);
      return reply.status(200).send({ success: true, data });
    } catch (err: any) {
      return reply.status(500).send({
        success: false,
        error: { code: 'JOURNEY_FAILED', message: err.message || 'Failed to fetch journey state.' },
      });
    }
  }

  static async updateJourneyState(request: FastifyRequest, reply: FastifyReply) {
    const user = (request as any).user;
    const { clientId } = request.params as { clientId: string };
    const { currentStage, triggerEvent, reason } = request.body as {
      currentStage: ClientJourneyStage;
      triggerEvent?: string;
      reason?: string;
    };

    if (!user || !user.studioId) {
      return reply.status(401).send({ success: false, error: { code: 'UNAUTHORIZED', message: 'Studio authentication required.' } });
    }

    try {
      const data = await ClientIntelligenceController.journeyService.updateJourneyStage(
        user.studioId,
        clientId,
        currentStage,
        triggerEvent,
        reason
      );
      return reply.status(200).send({ success: true, data });
    } catch (err: any) {
      return reply.status(400).send({
        success: false,
        error: { code: 'JOURNEY_UPDATE_FAILED', message: err.message || 'Failed to update journey state.' },
      });
    }
  }

  static async checkReturnClient(request: FastifyRequest, reply: FastifyReply) {
    const user = (request as any).user;
    const { clientId } = request.params as { clientId: string };

    if (!user || !user.studioId) {
      return reply.status(401).send({ success: false, error: { code: 'UNAUTHORIZED', message: 'Studio authentication required.' } });
    }

    try {
      const data = await ClientIntelligenceController.journeyService.checkAndMarkReturnClient(user.studioId, clientId);
      return reply.status(200).send({ success: true, data });
    } catch (err: any) {
      return reply.status(500).send({
        success: false,
        error: { code: 'CHECK_RETURN_FAILED', message: err.message || 'Failed to check return client status.' },
      });
    }
  }

  // ----------------------------------------------------
  // INSIGHTS
  // ----------------------------------------------------
  static async getInsights(request: FastifyRequest, reply: FastifyReply) {
    const user = (request as any).user;
    const { clientId } = request.params as { clientId: string };
    const { status } = (request.query as { status?: ClientInsightStatus }) || {};

    if (!user || !user.studioId) {
      return reply.status(401).send({ success: false, error: { code: 'UNAUTHORIZED', message: 'Studio authentication required.' } });
    }

    try {
      const data = await ClientIntelligenceController.insightService.getClientInsights(user.studioId, clientId);
      return reply.status(200).send({ success: true, data });
    } catch (err: any) {
      return reply.status(500).send({
        success: false,
        error: { code: 'INSIGHTS_FAILED', message: err.message || 'Failed to fetch insights.' },
      });
    }
  }

  static async generateInsights(request: FastifyRequest, reply: FastifyReply) {
    const user = (request as any).user;
    const { clientId } = request.params as { clientId: string };

    if (!user || !user.studioId) {
      return reply.status(401).send({ success: false, error: { code: 'UNAUTHORIZED', message: 'Studio authentication required.' } });
    }

    try {
      const data = await ClientIntelligenceController.insightService.generateInsightsForClient(user.studioId, clientId);
      return reply.status(200).send({ success: true, data });
    } catch (err: any) {
      return reply.status(500).send({
        success: false,
        error: { code: 'GENERATE_INSIGHTS_FAILED', message: err.message || 'Failed to generate insights.' },
      });
    }
  }

  static async resolveInsight(request: FastifyRequest, reply: FastifyReply) {
    const user = (request as any).user;
    const { insightId } = request.params as { insightId: string };
    const { status } = (request.body as { status?: ClientInsightStatus }) || {};

    if (!user || !user.studioId) {
      return reply.status(401).send({ success: false, error: { code: 'UNAUTHORIZED', message: 'Studio authentication required.' } });
    }

    try {
      const data = await ClientIntelligenceController.insightService.updateInsightStatus(
        user.studioId,
        insightId,
        status || ClientInsightStatus.RESOLVED
      );
      return reply.status(200).send({ success: true, data });
    } catch (err: any) {
      return reply.status(500).send({
        success: false,
        error: { code: 'RESOLVE_INSIGHT_FAILED', message: err.message || 'Failed to resolve insight.' },
      });
    }
  }

  // ----------------------------------------------------
  // FOLLOW-UP RECOMMENDATIONS
  // ----------------------------------------------------
  static async getFollowUps(request: FastifyRequest, reply: FastifyReply) {
    const user = (request as any).user;
    const query = request.query as {
      clientId?: string;
      galleryId?: string;
      status?: ClientFollowUpStatus;
      type?: any;
      priority?: any;
    };

    if (!user || !user.studioId) {
      return reply.status(401).send({ success: false, error: { code: 'UNAUTHORIZED', message: 'Studio authentication required.' } });
    }

    try {
      const data = await ClientIntelligenceController.followUpService.listFollowUps(user.studioId, query);
      return reply.status(200).send({ success: true, data });
    } catch (err: any) {
      return reply.status(500).send({
        success: false,
        error: { code: 'FOLLOWUPS_FAILED', message: err.message || 'Failed to fetch follow-ups.' },
      });
    }
  }

  static async scanFollowUps(request: FastifyRequest, reply: FastifyReply) {
    const user = (request as any).user;
    const body = (request.body as any) || {};

    if (!user || !user.studioId) {
      return reply.status(401).send({ success: false, error: { code: 'UNAUTHORIZED', message: 'Studio authentication required.' } });
    }

    try {
      const result = await ClientIntelligenceController.followUpService.scanAndGenerateFollowUps(user.studioId, {
        galleryInactivityDays: body.galleryInactivityDays,
        selectionPendingDays: body.selectionPendingDays,
        downloadPendingDays: body.downloadPendingDays,
      });
      return reply.status(200).send({ success: true, data: result });
    } catch (err: any) {
      return reply.status(500).send({
        success: false,
        error: { code: 'FOLLOWUP_SCAN_FAILED', message: err.message || 'Failed to scan follow-ups.' },
      });
    }
  }

  static async dismissFollowUp(request: FastifyRequest, reply: FastifyReply) {
    const user = (request as any).user;
    const { followUpId } = request.params as { followUpId: string };
    const { reason } = (request.body as { reason?: string }) || {};

    if (!user || !user.studioId) {
      return reply.status(401).send({ success: false, error: { code: 'UNAUTHORIZED', message: 'Studio authentication required.' } });
    }

    try {
      const data = await ClientIntelligenceController.followUpService.dismissFollowUp(user.studioId, followUpId, reason);
      return reply.status(200).send({ success: true, data });
    } catch (err: any) {
      return reply.status(500).send({
        success: false,
        error: { code: 'DISMISS_FOLLOWUP_FAILED', message: err.message || 'Failed to dismiss follow-up.' },
      });
    }
  }

  // ----------------------------------------------------
  // COMMUNICATIONS & DRAFTS
  // ----------------------------------------------------
  static async getCommunications(request: FastifyRequest, reply: FastifyReply) {
    const user = (request as any).user;
    const query = request.query as {
      clientId?: string;
      galleryId?: string;
      followUpRecommendationId?: string;
      status?: ClientCommunicationStatus;
      channel?: ClientCommunicationChannel;
    };

    if (!user || !user.studioId) {
      return reply.status(401).send({ success: false, error: { code: 'UNAUTHORIZED', message: 'Studio authentication required.' } });
    }

    try {
      const data = await ClientIntelligenceController.communicationService.listDrafts(user.studioId, query);
      return reply.status(200).send({ success: true, data });
    } catch (err: any) {
      return reply.status(500).send({
        success: false,
        error: { code: 'COMMUNICATIONS_FAILED', message: err.message || 'Failed to fetch communication drafts.' },
      });
    }
  }

  static async createDraft(request: FastifyRequest, reply: FastifyReply) {
    const user = (request as any).user;
    const body = request.body as any;

    if (!user || !user.studioId) {
      return reply.status(401).send({ success: false, error: { code: 'UNAUTHORIZED', message: 'Studio authentication required.' } });
    }

    try {
      const draft = await ClientIntelligenceController.communicationService.createDraft(user.studioId, {
        ...body,
        createdById: user.id || user.userId,
      });
      return reply.status(201).send({ success: true, data: draft });
    } catch (err: any) {
      return reply.status(400).send({
        success: false,
        error: { code: 'CREATE_DRAFT_FAILED', message: err.message || 'Failed to create draft.' },
      });
    }
  }

  static async updateDraft(request: FastifyRequest, reply: FastifyReply) {
    const user = (request as any).user;
    const { draftId } = request.params as { draftId: string };
    const body = request.body as any;

    if (!user || !user.studioId) {
      return reply.status(401).send({ success: false, error: { code: 'UNAUTHORIZED', message: 'Studio authentication required.' } });
    }

    try {
      const draft = await ClientIntelligenceController.communicationService.updateDraft(user.studioId, draftId, body);
      return reply.status(200).send({ success: true, data: draft });
    } catch (err: any) {
      return reply.status(400).send({
        success: false,
        error: { code: 'UPDATE_DRAFT_FAILED', message: err.message || 'Failed to update draft.' },
      });
    }
  }

  static async approveAndSendDraft(request: FastifyRequest, reply: FastifyReply) {
    const user = (request as any).user;
    const { draftId } = request.params as { draftId: string };
    const userId = user?.id || user?.userId || 'system_user';

    if (!user || !user.studioId) {
      return reply.status(401).send({ success: false, error: { code: 'UNAUTHORIZED', message: 'Studio authentication required.' } });
    }

    try {
      const result = await ClientIntelligenceController.communicationService.approveAndSend(user.studioId, draftId, userId);
      return reply.status(200).send({ success: true, data: result });
    } catch (err: any) {
      return reply.status(400).send({
        success: false,
        error: { code: 'APPROVE_SEND_FAILED', message: err.message || 'Failed to approve and send draft.' },
      });
    }
  }

  static async cancelDraft(request: FastifyRequest, reply: FastifyReply) {
    const user = (request as any).user;
    const { draftId } = request.params as { draftId: string };
    const { reason } = (request.body as { reason?: string }) || {};

    if (!user || !user.studioId) {
      return reply.status(401).send({ success: false, error: { code: 'UNAUTHORIZED', message: 'Studio authentication required.' } });
    }

    try {
      const draft = await ClientIntelligenceController.communicationService.cancelDraft(user.studioId, draftId);
      return reply.status(200).send({ success: true, data: draft });
    } catch (err: any) {
      return reply.status(500).send({
        success: false,
        error: { code: 'CANCEL_DRAFT_FAILED', message: err.message || 'Failed to cancel draft.' },
      });
    }
  }

  // ----------------------------------------------------
  // ADMIN TELEMETRY
  // ----------------------------------------------------
  static async getAdminTelemetry(request: FastifyRequest, reply: FastifyReply) {
    const user = (request as any).user;

    if (!user || (user.role !== 'SUPER_ADMIN' && user.role !== 'SYSTEM_ADMIN')) {
      return reply.status(403).send({ success: false, error: { code: 'FORBIDDEN', message: 'Admin access required.' } });
    }

    try {
      const data = await ClientIntelligenceController.client360Service.getAdminTelemetry();
      return reply.status(200).send({ success: true, data });
    } catch (err: any) {
      return reply.status(500).send({
        success: false,
        error: { code: 'ADMIN_TELEMETRY_FAILED', message: err.message || 'Failed to fetch admin telemetry.' },
      });
    }
  }
}
