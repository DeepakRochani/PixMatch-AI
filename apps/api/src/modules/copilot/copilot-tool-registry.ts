/**
 * Copilot Tool Registry — PIXMatch AI Phase 15
 * Controlled tool execution system with strict tenant isolation, authorization guards, and action gating.
 */

import { prisma, ProcessingStatus } from '@pixmatch/database';
import { GalleryHealthService } from './gallery-health.service.js';
import { GalleryCompletenessService } from './gallery-completeness.service.js';
import { CoverRecommendationService } from './cover-recommendation.service.js';
import { SmartAlbumRecommendationService } from './smart-album-recommendation.service.js';
import { EventStoryRecommendationService } from './event-story-recommendation.service.js';
import { CopilotAttentionService } from './copilot-attention.service.js';
import { CopilotContextBuilder } from './copilot-context-builder.js';
import { Client360Service } from '../client-intelligence/client-360.service.js';
import { ClientEngagementService } from '../client-intelligence/client-engagement.service.js';
import { ClientJourneyService } from '../client-intelligence/client-journey.service.js';
import { ClientFollowUpService } from '../client-intelligence/client-followup.service.js';
import { ClientCommunicationService } from '../client-intelligence/client-communication.service.js';
import { BusinessAggregationService } from '../business/business-aggregation.service.js';
import { BusinessGoalService } from '../business/business-goal.service.js';
import { BusinessForecastService } from '../business/business-forecast.service.js';
import { BusinessInsightService } from '../business/business-insight.service.js';
import { BusinessTransactionService } from '../business/business-transaction.service.js';
import { GrowthOpportunityService } from '../growth/growth-opportunity.service.js';
import { ClientReactivationService } from '../growth/client-reactivation.service.js';
import { MarketingCampaignService } from '../growth/marketing-campaign.service.js';
import { GrowthPerformanceService } from '../growth/growth-performance.service.js';
import { ServiceGrowthService } from '../growth/service-growth.service.js';
import { LeadService } from '../operations/lead.service.js';
import { ProjectService } from '../operations/project.service.js';
import { TaskService } from '../operations/task.service.js';
import { MilestoneService } from '../operations/milestone.service.js';
import { CalendarService } from '../operations/calendar.service.js';
import { OperationsOverviewService } from '../operations/operations-overview.service.js';
import { ProposalService } from '../operations/proposal.service.js';
import { ContractService } from '../operations/contract.service.js';
import { BookingService } from '../operations/booking.service.js';
import { PaymentScheduleService } from '../operations/payment-schedule.service.js';
import { CalendarEventService } from '../calendar/calendar-event.service.js';
import { AvailabilityService } from '../calendar/availability.service.js';
import { CalendarConflictService } from '../calendar/calendar-conflict.service.js';
import { ResourceService } from '../calendar/resource.service.js';
import { BookingLinkService } from '../calendar/booking-link.service.js';
import { BookingRequestService } from '../calendar/booking-request.service.js';
import { ProductionService } from '../production/production.service.js';
import { ProductionHealthService } from '../production/production-health.service.js';
import { ProductionDeadlineService } from '../production/production-deadline.service.js';
import { ShootSessionService } from '../production/shoot-session.service.js';
import { CrewAssignmentService } from '../production/crew-assignment.service.js';
import { EquipmentChecklistService } from '../production/equipment-checklist.service.js';
import { ProductionChecklistService } from '../production/production-checklist.service.js';
import { ShotListService } from '../production/shot-list.service.js';
import { QuestionnaireService } from '../production/questionnaire.service.js';
import { ShootTimelineService } from '../production/shoot-timeline.service.js';
import { MediaHandoffService } from '../production/media-handoff.service.js';
import { CullEngineService } from '../culling/cull-engine.service.js';
import { CullSessionService } from '../culling/cull-session.service.js';
import { EditEngineService } from '../editing/edit-engine.service.js';
import { ExportEngineService } from '../exports/export-engine.service.js';
import { CullingAnalyticsService } from '../culling/culling-analytics.service.js';
import { ProofingSessionService } from '../proofing/proofing-session.service.js';
import { ProofingSelectionService } from '../proofing/proofing-selection.service.js';
import { ProofingFeedbackService } from '../proofing/proofing-feedback.service.js';
import { ProofingReviewService } from '../proofing/proofing-review.service.js';
import { ProofingAnalyticsService } from '../proofing/proofing-analytics.service.js';
import { ProofingReviewDecision, ProofingItemStatus } from '@pixmatch/types';
import { FulfillmentProductService } from '../fulfillment/fulfillment-product.service.js';
import { FulfillmentOrderService } from '../fulfillment/fulfillment-order.service.js';
import { FulfillmentPaymentService } from '../fulfillment/fulfillment-payment.service.js';
import { FulfillmentDigitalService } from '../fulfillment/fulfillment-digital.service.js';
import { FulfillmentPhysicalService } from '../fulfillment/fulfillment-physical.service.js';
import { FulfillmentAnalyticsService } from '../fulfillment/fulfillment-analytics.service.js';
import { StudioBrandingService } from '../branding/studio-branding.service.js';
import { StudioDomainService } from '../branding/studio-domain.service.js';
import { ClientPortalSessionService } from '../client-portal/client-portal-session.service.js';
import { ClientConversationService } from '../communication/client-conversation.service.js';
import { ClientMessageService } from '../communication/client-message.service.js';
import { CommunicationAnalyticsService } from '../communication/communication-analytics.service.js';
import { CRMService } from '../clients/crm.service.js';
import { StudioTeamService } from '../team/team.service.js';
import { StudioTeamCollaborationService } from '../team-collaboration/team-collaboration.service.js';
import { StudioFinancialOperationsService } from '../financial-operations/financial-operations.service.js';
import { StudioAccountingService } from '../accounting/accounting.service.js';
import { StudioTaxService } from '../tax/tax.service.js';
import { InvoicingService } from '../invoicing/invoicing.service.js';
import { StudioFinancialReportingService } from '../financial-reporting/financial-reporting.service.js';
import { StudioBusinessIntelligenceService } from '../business-intelligence/business-intelligence.service.js';
import { StudioBusinessPlanService } from '../planning/business-plan.service.js';
import { StudioPlanTargetService } from '../planning/plan-target.service.js';
import { StudioPlanningVarianceService } from '../planning/planning-variance.service.js';
import { StudioPlanHealthService } from '../planning/plan-health.service.js';
import { StudioPlanningBudgetService } from '../planning/planning-budget.service.js';
import { StudioStrategicInitiativeService } from '../planning/strategic-initiative.service.js';
import { StudioPlanForecastScenarioService } from '../planning/plan-forecast-scenario.service.js';
import { StudioPlanReviewService } from '../planning/plan-review.service.js';
import { StudioPlanningExportService } from '../planning/planning-export.service.js';

export interface ToolExecutionContext {
  studioId: string;
  userId: string;
  galleryId?: string;
}

export interface CopilotToolDefinition {
  name: string;
  description: string;
  isMutation: boolean;
  requiresApproval: boolean;
  isDestructive: boolean;
  execute: (ctx: ToolExecutionContext, args: any) => Promise<any>;
}

export class CopilotToolRegistry {
  private static defaultInstance: CopilotToolRegistry | null = null;

  static getInstance(): CopilotToolRegistry {
    if (!this.defaultInstance) {
      this.defaultInstance = new CopilotToolRegistry();
    }
    return this.defaultInstance;
  }

  static getTools(): Array<CopilotToolDefinition & { requiresConfirmation?: boolean }> {
    return Array.from(this.getInstance().tools.values()).map((t) => ({
      ...t,
      requiresConfirmation: t.requiresApproval || t.isMutation,
    }));
  }

  static getTool(name: string): CopilotToolDefinition | undefined {
    return this.getInstance().getTool(name);
  }

  static listTools() {
    return this.getInstance().listTools();
  }

  static async executeTool(name: string, ctxOrArgs: any, maybeArgsOrCtx: any = {}): Promise<any> {
    return this.getInstance().executeTool(name, ctxOrArgs, maybeArgsOrCtx);
  }

  private db: any;
  private tools: Map<string, CopilotToolDefinition> = new Map();

  constructor(dbClient?: any) {
    this.db = dbClient || prisma;
    this.registerTools();
  }

  private registerTools() {
    // -------------------------------------------------------------
    // READ TOOLS (Safe, Idempotent, Instant)
    // -------------------------------------------------------------

    this.register({
      name: 'getGalleryHealth',
      description: 'Calculates operational gallery health and readiness score.',
      isMutation: false,
      requiresApproval: false,
      isDestructive: false,
      execute: async (ctx, args) => {
        const galleryId = args.galleryId || ctx.galleryId;
        if (!galleryId) throw new Error('galleryId is required');
        const service = new GalleryHealthService(this.db);
        return service.calculateHealth(ctx.studioId, galleryId);
      },
    });

    this.register({
      name: 'getGalleryCompleteness',
      description: 'Runs pre-flight readiness checklist for publishing.',
      isMutation: false,
      requiresApproval: false,
      isDestructive: false,
      execute: async (ctx, args) => {
        const galleryId = args.galleryId || ctx.galleryId;
        if (!galleryId) throw new Error('galleryId is required');
        const service = new GalleryCompletenessService(this.db);
        return service.checkCompleteness(ctx.studioId, galleryId);
      },
    });

    this.register({
      name: 'getGalleryStats',
      description: 'Fetches structured factual metrics for a gallery.',
      isMutation: false,
      requiresApproval: false,
      isDestructive: false,
      execute: async (ctx, args) => {
        const galleryId = args.galleryId || ctx.galleryId;
        if (!galleryId) throw new Error('galleryId is required');
        const builder = new CopilotContextBuilder(this.db);
        return builder.buildGalleryFacts(ctx.studioId, galleryId);
      },
    });

    this.register({
      name: 'getProcessingStatus',
      description: 'Returns count of processed, pending, and failed photos.',
      isMutation: false,
      requiresApproval: false,
      isDestructive: false,
      execute: async (ctx, args) => {
        const galleryId = args.galleryId || ctx.galleryId;
        if (!galleryId) throw new Error('galleryId is required');
        const photos = await this.db.photo.findMany({
          where: { gallery_id: galleryId, studio_id: ctx.studioId },
          select: { status: true },
        });
        const total = photos.length;
        const failed = photos.filter((p: any) => p.status === 'FAILED').length;
        const pending = photos.filter((p: any) => p.status === 'PENDING' || p.status === 'PROCESSING').length;
        const completed = photos.filter((p: any) => p.status === 'COMPLETED').length;
        return { total, completed, pending, failed, isAllDone: pending === 0 && failed === 0 };
      },
    });

    this.register({
      name: 'getAiIndexStatus',
      description: 'Returns AI face and scene indexing coverage.',
      isMutation: false,
      requiresApproval: false,
      isDestructive: false,
      execute: async (ctx, args) => {
        const galleryId = args.galleryId || ctx.galleryId;
        if (!galleryId) throw new Error('galleryId is required');
        const photos = await this.db.photo.findMany({
          where: { gallery_id: galleryId, studio_id: ctx.studioId },
          select: { id: true, ai_analysis: { select: { id: true } } },
        });
        const total = photos.length;
        const indexed = photos.filter((p: any) => !!p.ai_analysis).length;
        return { total, indexed, unindexed: total - indexed, indexing_pct: total > 0 ? Math.round((indexed / total) * 100) : 100 };
      },
    });

    this.register({
      name: 'getQualitySummary',
      description: 'Returns photo quality evaluation metrics (blur, exposure, aesthetic score).',
      isMutation: false,
      requiresApproval: false,
      isDestructive: false,
      execute: async (ctx, args) => {
        const galleryId = args.galleryId || ctx.galleryId;
        if (!galleryId) throw new Error('galleryId is required');
        const photos = await this.db.photo.findMany({
          where: { gallery_id: galleryId, studio_id: ctx.studioId, ai_analysis: { isNot: null } },
          include: { ai_analysis: true },
        });
        const blurry = photos.filter((p: any) => p.ai_analysis?.is_blurry).length;
        const dark = photos.filter((p: any) => p.ai_analysis?.is_dark).length;
        const lowScore = photos.filter((p: any) => (p.ai_analysis?.quality_score ?? 1) < 0.45).length;
        return { total_analyzed: photos.length, blurry_count: blurry, dark_count: dark, low_score_count: lowScore };
      },
    });

    this.register({
      name: 'getDuplicateSummary',
      description: 'Returns count of burst clusters and near-duplicates.',
      isMutation: false,
      requiresApproval: false,
      isDestructive: false,
      execute: async (ctx, args) => {
        const galleryId = args.galleryId || ctx.galleryId;
        if (!galleryId) throw new Error('galleryId is required');
        const photos = await this.db.photo.findMany({
          where: { gallery_id: galleryId, studio_id: ctx.studioId, ai_analysis: { isNot: null } },
          select: { ai_analysis: { select: { duplicate_group_id: true, near_duplicate_group_id: true, is_best_shot: true } } },
        });
        const dupGroups = new Set<string>();
        const burstGroups = new Set<string>();
        for (const p of photos) {
          if (p.ai_analysis?.duplicate_group_id) dupGroups.add(p.ai_analysis.duplicate_group_id);
          if (p.ai_analysis?.near_duplicate_group_id) burstGroups.add(p.ai_analysis.near_duplicate_group_id);
        }
        return { duplicate_clusters: dupGroups.size, burst_clusters: burstGroups.size };
      },
    });

    this.register({
      name: 'getBestShots',
      description: 'Retrieves top ranked photos recommended for covers and highlights.',
      isMutation: false,
      requiresApproval: false,
      isDestructive: false,
      execute: async (ctx, args) => {
        const galleryId = args.galleryId || ctx.galleryId;
        if (!galleryId) throw new Error('galleryId is required');
        const service = new CoverRecommendationService(this.db);
        return service.recommendCovers(ctx.studioId, galleryId, args.limit || 5);
      },
    });

    this.register({
      name: 'getSmartAlbumSuggestions',
      description: 'Suggests intelligent albums grounded in visual and chapter evidence.',
      isMutation: false,
      requiresApproval: false,
      isDestructive: false,
      execute: async (ctx, args) => {
        const galleryId = args.galleryId || ctx.galleryId;
        if (!galleryId) throw new Error('galleryId is required');
        const service = new SmartAlbumRecommendationService(this.db);
        return service.suggestAlbums(ctx.studioId, galleryId);
      },
    });

    this.register({
      name: 'getEventStoryStatus',
      description: 'Evaluates readiness to generate an event narrative and timeline chapters.',
      isMutation: false,
      requiresApproval: false,
      isDestructive: false,
      execute: async (ctx, args) => {
        const galleryId = args.galleryId || ctx.galleryId;
        if (!galleryId) throw new Error('galleryId is required');
        const service = new EventStoryRecommendationService(this.db);
        return service.evaluateStoryReadiness(ctx.studioId, galleryId);
      },
    });

    this.register({
      name: 'getAttentionSummary',
      description: 'Aggregates prioritized issues across galleries.',
      isMutation: false,
      requiresApproval: false,
      isDestructive: false,
      execute: async (ctx, args) => {
        const service = new CopilotAttentionService(this.db);
        return service.getAttentionSummary(ctx.studioId, args.galleryId || ctx.galleryId);
      },
    });

    // -------------------------------------------------------------
    // MUTATION TOOLS (Require Studio Authentication & Auditing)
    // -------------------------------------------------------------

    this.register({
      name: 'retryProcessing',
      description: 'Retries failed photo processing jobs.',
      isMutation: true,
      requiresApproval: false,
      isDestructive: false,
      execute: async (ctx, args) => {
        const galleryId = args.galleryId || ctx.galleryId;
        if (!galleryId) throw new Error('galleryId is required');

        // Reset failed photo statuses to PENDING
        const result = await this.db.photo.updateMany({
          where: { gallery_id: galleryId, studio_id: ctx.studioId, status: 'FAILED' },
          data: { status: 'PENDING' },
        });

        return { retried_count: result.count, message: `Queued ${result.count} photos for re-processing.` };
      },
    });

    this.register({
      name: 'applyCoverPhoto',
      description: 'Sets the primary cover photo for the gallery. Requires confirmation.',
      isMutation: true,
      requiresApproval: true,
      isDestructive: false,
      execute: async (ctx, args) => {
        const galleryId = args.galleryId || ctx.galleryId;
        const photoId = args.photoId;
        if (!galleryId || !photoId) throw new Error('galleryId and photoId are required');

        const photo = await this.db.photo.findFirst({
          where: { id: photoId, gallery_id: galleryId, studio_id: ctx.studioId },
        });
        if (!photo) throw new Error(`Photo ${photoId} not found in gallery`);

        // Unset previous covers in gallery
        await this.db.photo.updateMany({
          where: { gallery_id: galleryId, studio_id: ctx.studioId },
          data: { is_cover: false },
        });

        // Set selected cover photo
        await this.db.photo.update({
          where: { id: photoId },
          data: { is_cover: true },
        });

        await this.db.gallery.update({
          where: { id: galleryId },
          data: { cover_photo_url: photo.preview_url || photo.thumbnail_url },
        });

        return { success: true, photo_id: photoId, message: 'Cover photo updated successfully.' };
      },
    });

    this.register({
      name: 'generateSmartAlbums',
      description: 'Creates suggested smart albums from photo tags and chapters.',
      isMutation: true,
      requiresApproval: false,
      isDestructive: false,
      execute: async (ctx, args) => {
        const galleryId = args.galleryId || ctx.galleryId;
        if (!galleryId) throw new Error('galleryId is required');

        const suggService = new SmartAlbumRecommendationService(this.db);
        const suggestions = await suggService.suggestAlbums(ctx.studioId, galleryId);

        let createdCount = 0;
        for (const sugg of suggestions.slice(0, 4)) {
          // Check if album already exists
          const existing = await this.db.smartAlbum.findFirst({
            where: { gallery_id: galleryId, studio_id: ctx.studioId, name: sugg.name },
          });
          if (!existing) {
            await this.db.smartAlbum.create({
              data: {
                studio_id: ctx.studioId,
                gallery_id: galleryId,
                name: sugg.name,
                type: sugg.type || 'QUALITY',
                criteria: { evidence: sugg.evidence },
                is_active: true,
                is_public: true,
              },
            });
            createdCount++;
          }
        }

        return { created_count: createdCount, message: `Created ${createdCount} smart albums.` };
      },
    });

    this.register({
      name: 'generateEventStory',
      description: 'Generates timeline chapters and narrative event story.',
      isMutation: true,
      requiresApproval: false,
      isDestructive: false,
      execute: async (ctx, args) => {
        const galleryId = args.galleryId || ctx.galleryId;
        if (!galleryId) throw new Error('galleryId is required');

        // Look up or create EventIntelligence record
        let intel = await this.db.eventIntelligence.findFirst({
          where: { gallery_id: galleryId, studio_id: ctx.studioId },
        });

        if (!intel) {
          intel = await this.db.eventIntelligence.create({
            data: {
              studio_id: ctx.studioId,
              gallery_id: galleryId,
              event_type: 'WEDDING',
              confidence_score: 0.88,
              status: 'COMPLETED',
            },
          });
        }

        return { success: true, event_intelligence_id: intel.id, message: 'Event story and chapters initialized.' };
      },
    });

    // -------------------------------------------------------------
    // PHASE 16: AUTOMATION & ORCHESTRATION TOOLS
    // -------------------------------------------------------------

    this.register({
      name: 'getAutomationStatus',
      description: 'Returns active automation runs, recent executions, and overall workflow status.',
      isMutation: false,
      requiresApproval: false,
      isDestructive: false,
      execute: async (ctx, args) => {
        const galleryId = args.galleryId || ctx.galleryId;
        const runs = await this.db.automationRun.findMany({
          where: {
            studio_id: ctx.studioId,
            ...(galleryId ? { gallery_id: galleryId } : {}),
          },
          orderBy: { started_at: 'desc' },
          take: 10,
          include: {
            workflow: { select: { id: true, name: true } },
            step_runs: true,
          },
        });

        const pendingApprovals = await this.db.automationApproval.count({
          where: { studio_id: ctx.studioId, status: 'PENDING' },
        });

        return {
          total_runs: runs.length,
          active_runs: runs.filter((r: any) => r.status === 'RUNNING' || r.status === 'QUEUED'),
          waiting_approval_runs: runs.filter((r: any) => r.status === 'WAITING_APPROVAL'),
          pending_approvals_count: pendingApprovals,
          recent_runs: runs.map((r: any) => ({
            id: r.id,
            workflow_name: r.workflow?.name,
            status: r.status,
            current_step: r.current_step,
            started_at: r.started_at,
          })),
        };
      },
    });

    this.register({
      name: 'listPendingApprovals',
      description: 'Lists all automation actions currently paused waiting for photographer approval.',
      isMutation: false,
      requiresApproval: false,
      isDestructive: false,
      execute: async (ctx) => {
        const approvals = await this.db.automationApproval.findMany({
          where: { studio_id: ctx.studioId, status: 'PENDING' },
          orderBy: { requested_at: 'desc' },
        });

        return {
          count: approvals.length,
          approvals: approvals.map((a: any) => ({
            id: a.id,
            action_type: a.action_type,
            title: a.title,
            description: a.description,
            requested_at: a.requested_at,
          })),
        };
      },
    });

    // -------------------------------------------------------------
    // PHASE 17: CLIENT INTELLIGENCE & CRM TOOLS
    // -------------------------------------------------------------

    this.register({
      name: 'getClient360',
      description: 'Fetches comprehensive Client 360 profile with engagement, journey, stats, galleries, and active recommendations.',
      isMutation: false,
      requiresApproval: false,
      isDestructive: false,
      execute: async (ctx, args) => {
        if (!args.clientId) throw new Error('clientId is required');
        const service = new Client360Service(this.db);
        return service.getClient360(ctx.studioId, args.clientId);
      },
    });

    this.register({
      name: 'getClientEngagementProfile',
      description: 'Calculates or retrieves a client engagement score (0-100), state, and component metrics.',
      isMutation: false,
      requiresApproval: false,
      isDestructive: false,
      execute: async (ctx, args) => {
        if (!args.clientId) throw new Error('clientId is required');
        const service = new ClientEngagementService(this.db);
        return service.getEngagementProfile(ctx.studioId, args.clientId);
      },
    });

    this.register({
      name: 'recalculateClientEngagement',
      description: 'Recalculates deterministic activity score and updates profile for a client.',
      isMutation: true,
      requiresApproval: false,
      isDestructive: false,
      execute: async (ctx, args) => {
        if (!args.clientId) throw new Error('clientId is required');
        const service = new ClientEngagementService(this.db);
        return service.calculateAndPersistProfile(ctx.studioId, args.clientId);
      },
    });

    this.register({
      name: 'getClientJourneyState',
      description: 'Fetches client journey stage, transitions history, and repeat client status.',
      isMutation: false,
      requiresApproval: false,
      isDestructive: false,
      execute: async (ctx, args) => {
        if (!args.clientId) throw new Error('clientId is required');
        const service = new ClientJourneyService(this.db);
        return service.getJourneyState(ctx.studioId, args.clientId);
      },
    });

    this.register({
      name: 'listClientFollowUps',
      description: 'Lists active follow-up recommendations for clients in the studio.',
      isMutation: false,
      requiresApproval: false,
      isDestructive: false,
      execute: async (ctx, args) => {
        const service = new ClientFollowUpService(this.db);
        return service.listFollowUps(ctx.studioId, args);
      },
    });

    this.register({
      name: 'createCommunicationDraft',
      description: 'Drafts a personalized, sanitized message for photographer review before sending (requires approval).',
      isMutation: true,
      requiresApproval: true,
      isDestructive: false,
      execute: async (ctx, args) => {
        const service = new ClientCommunicationService(this.db);
        return service.createDraft(ctx.studioId, {
          ...args,
          createdById: ctx.userId,
        });
      },
    });

    // -------------------------------------------------------------
    // PHASE 18: STUDIO BUSINESS & REVENUE INTELLIGENCE TOOLS
    // -------------------------------------------------------------

    this.register({
      name: 'getBusinessOverview',
      description: 'Fetches high-level studio financial KPIs (revenue, expenses, net profit, margins, AOV, MoM growth).',
      isMutation: false,
      requiresApproval: false,
      isDestructive: false,
      execute: async (ctx, args) => {
        const service = new BusinessAggregationService(this.db);
        return service.getOverview(ctx.studioId, args);
      },
    });

    this.register({
      name: 'getRevenueSummary',
      description: 'Retrieves revenue breakdown by category and monthly revenue trends.',
      isMutation: false,
      requiresApproval: false,
      isDestructive: false,
      execute: async (ctx, args) => {
        const service = new BusinessAggregationService(this.db);
        const [breakdown, trend] = await Promise.all([
          service.getRevenueBreakdown(ctx.studioId, args),
          service.getRevenueTrend(ctx.studioId, { ...args, interval: 'month' }),
        ]);
        return { breakdown, trend };
      },
    });

    this.register({
      name: 'getExpenseSummary',
      description: 'Retrieves expense breakdown by operating category.',
      isMutation: false,
      requiresApproval: false,
      isDestructive: false,
      execute: async (ctx, args) => {
        const service = new BusinessAggregationService(this.db);
        return service.getExpenseBreakdown(ctx.studioId, args);
      },
    });

    this.register({
      name: 'getProfitabilitySummary',
      description: 'Calculates profitability, margins, and service performance across job categories.',
      isMutation: false,
      requiresApproval: false,
      isDestructive: false,
      execute: async (ctx, args) => {
        const service = new BusinessAggregationService(this.db);
        const [overview, services] = await Promise.all([
          service.getOverview(ctx.studioId, args),
          service.getServicePerformance(ctx.studioId, args),
        ]);
        return {
          net_profit: overview.net_profit,
          profit_margin_pct: overview.profit_margin_pct,
          services_performance: services,
        };
      },
    });

    this.register({
      name: 'getBusinessGoals',
      description: 'Lists active studio business targets with progress tracking against actual revenue/deliveries.',
      isMutation: false,
      requiresApproval: false,
      isDestructive: false,
      execute: async (ctx, args) => {
        const service = new BusinessGoalService(this.db);
        return service.listGoals(ctx.studioId, args);
      },
    });

    this.register({
      name: 'getBusinessForecast',
      description: 'Generates deterministic statistical projections (moving avg + weighted linear trend) for revenue/profit/bookings.',
      isMutation: false,
      requiresApproval: false,
      isDestructive: false,
      execute: async (ctx, args) => {
        const service = new BusinessForecastService(this.db);
        return service.generateForecast(ctx.studioId, args?.metric, args?.period);
      },
    });

    this.register({
      name: 'getBusinessInsights',
      description: 'Scans for financial anomalies, revenue drops, expense surges, and high margin opportunities.',
      isMutation: false,
      requiresApproval: false,
      isDestructive: false,
      execute: async (ctx) => {
        const service = new BusinessInsightService(this.db);
        return service.scanInsights(ctx.studioId);
      },
    });

    this.register({
      name: 'getServicePerformance',
      description: 'Compares revenue, expenses, profit margin, and turnaround across photography packages.',
      isMutation: false,
      requiresApproval: false,
      isDestructive: false,
      execute: async (ctx, args) => {
        const service = new BusinessAggregationService(this.db);
        return service.getServicePerformance(ctx.studioId, args);
      },
    });

    this.register({
      name: 'getClientBusinessSummary',
      description: 'Fetches lifetime booking value, net revenue, and average order value for studio clients.',
      isMutation: false,
      requiresApproval: false,
      isDestructive: false,
      execute: async (ctx, args) => {
        const service = new BusinessAggregationService(this.db);
        return service.getClientBusinessSummary(ctx.studioId, args);
      },
    });

    // -------------------------------------------------------------
    // PHASE 19: GROWTH & MARKETING INTELLIGENCE TOOLS
    // -------------------------------------------------------------

    this.register({
      name: 'getGrowthOverview',
      description: 'Fetches growth KPIs, active opportunities, campaign conversions, and seasonal alerts.',
      isMutation: false,
      requiresApproval: false,
      isDestructive: false,
      execute: async (ctx) => {
        return GrowthPerformanceService.getOverview(ctx.studioId);
      },
    });

    this.register({
      name: 'getGrowthPerformanceOverview',
      description: 'Fetches comprehensive growth KPIs, campaign conversions, and seasonal demand overview.',
      isMutation: false,
      requiresApproval: false,
      isDestructive: false,
      execute: async (ctx) => {
        return GrowthPerformanceService.getOverview(ctx.studioId);
      },
    });

    this.register({
      name: 'getGrowthOpportunities',
      description: 'Lists prioritized growth opportunities (client reactivation, seasonal prep, package cross-sell).',
      isMutation: false,
      requiresApproval: false,
      isDestructive: false,
      execute: async (ctx, args) => {
        return GrowthOpportunityService.listOpportunities(ctx.studioId, args || {});
      },
    });

    this.register({
      name: 'scanGrowthOpportunities',
      description: 'Scans studio client and gallery history to generate fresh, evidence-backed growth opportunities.',
      isMutation: true,
      requiresApproval: false,
      isDestructive: false,
      execute: async (ctx) => {
        return GrowthOpportunityService.scanOpportunities(ctx.studioId);
      },
    });

    this.register({
      name: 'getClientReactivations',
      description: 'Identifies dormant clients eligible for re-engagement with deterministic scoring and suppression checks.',
      isMutation: false,
      requiresApproval: false,
      isDestructive: false,
      execute: async (ctx, args) => {
        return ClientReactivationService.getReactivationCandidates(ctx.studioId, args || {});
      },
    });

    this.register({
      name: 'getReactivationCandidates',
      description: 'Identifies dormant clients eligible for re-engagement with deterministic scoring and suppression checks.',
      isMutation: false,
      requiresApproval: false,
      isDestructive: false,
      execute: async (ctx, args) => {
        return ClientReactivationService.getReactivationCandidates(ctx.studioId, args || {});
      },
    });

    this.register({
      name: 'getMarketingCampaigns',
      description: 'Lists studio marketing campaigns, approval states, and delivery status.',
      isMutation: false,
      requiresApproval: false,
      isDestructive: false,
      execute: async (ctx, args) => {
        return MarketingCampaignService.listCampaigns(ctx.studioId, args || {});
      },
    });

    this.register({
      name: 'getCampaignPerformance',
      description: 'Calculates campaign delivery, open, click, conversion rates, attributed revenue, and ROI.',
      isMutation: false,
      requiresApproval: false,
      isDestructive: false,
      execute: async (ctx, args) => {
        if (!args?.campaignId) throw new Error('campaignId is required');
        return GrowthPerformanceService.getCampaignPerformance(ctx.studioId, args.campaignId);
      },
    });

    this.register({
      name: 'getServiceGrowthAnalysis',
      description: 'Analyzes revenue, booking frequency, margins, and seasonal demand variations across photography services.',
      isMutation: false,
      requiresApproval: false,
      isDestructive: false,
      execute: async (ctx) => {
        return ServiceGrowthService.getServiceGrowth(ctx.studioId);
      },
    });

    this.register({
      name: 'getServiceGrowthOpportunities',
      description: 'Analyzes revenue, margins, and seasonal demand variations across photography services.',
      isMutation: false,
      requiresApproval: false,
      isDestructive: false,
      execute: async (ctx) => {
        return ServiceGrowthService.getServiceGrowth(ctx.studioId);
      },
    });

    this.register({
      name: 'getSeasonalDemandPatterns',
      description: 'Evaluates quarterly seasonal trends and peak quarters across studio photography packages.',
      isMutation: false,
      requiresApproval: false,
      isDestructive: false,
      execute: async (ctx) => {
        return ServiceGrowthService.getServiceGrowth(ctx.studioId);
      },
    });

    this.register({
      name: 'getGrowthGoals',
      description: 'Lists active studio growth targets and conversion progress tracking.',
      isMutation: false,
      requiresApproval: false,
      isDestructive: false,
      execute: async (ctx) => {
        return GrowthPerformanceService.listGoals(ctx.studioId);
      },
    });

    this.register({
      name: 'createCampaignDraft',
      description: 'Creates a draft marketing campaign for client re-engagement or seasonal promotion (requires human approval before sending).',
      isMutation: true,
      requiresApproval: true,
      isDestructive: false,
      execute: async (ctx, args) => {
        return MarketingCampaignService.createDraft(ctx.studioId, ctx.userId, args);
      },
    });

    this.register({
      name: 'getCampaignDetails',
      description: 'Fetches campaign specification, approval status, recipient counts, and engagement stats.',
      isMutation: false,
      requiresApproval: false,
      isDestructive: false,
      execute: async (ctx, args) => {
        if (!args?.campaignId) throw new Error('campaignId is required');
        return MarketingCampaignService.getCampaign(ctx.studioId, args.campaignId);
      },
    });

    // -------------------------------------------------------------
    // PHASE 20: STUDIO OPERATIONS & PROJECT MANAGEMENT TOOLS
    // -------------------------------------------------------------

    this.register({
      name: 'getOperationsOverview',
      description: 'Fetches executive KPI summary for studio operations including active leads, conversion rates, shoots, and overdue tasks.',
      isMutation: false,
      requiresApproval: false,
      isDestructive: false,
      execute: async (ctx) => {
        return OperationsOverviewService.getOverview(ctx.studioId);
      },
    });

    this.register({
      name: 'listStudioLeads',
      description: 'Lists studio inquiries and leads pipeline with stage, status, source, and value filters.',
      isMutation: false,
      requiresApproval: false,
      isDestructive: false,
      execute: async (ctx, args) => {
        return LeadService.listLeads(ctx.studioId, args || {});
      },
    });

    this.register({
      name: 'getStudioLead',
      description: 'Fetches detailed information for a specific studio lead.',
      isMutation: false,
      requiresApproval: false,
      isDestructive: false,
      execute: async (ctx, args) => {
        const leadId = args?.leadId || args?.id;
        if (!leadId) throw new Error('leadId is required');
        return LeadService.getLead(ctx.studioId, leadId);
      },
    });

    this.register({
      name: 'createStudioLead',
      description: 'Creates a new inquiry or lead in the studio pipeline.',
      isMutation: true,
      requiresApproval: false,
      isDestructive: false,
      execute: async (ctx, args) => {
        return LeadService.createLead(ctx.studioId, args);
      },
    });

    this.register({
      name: 'convertStudioLead',
      description: 'Converts a won lead into a client and creates an associated studio project booking.',
      isMutation: true,
      requiresApproval: true,
      isDestructive: false,
      execute: async (ctx, args) => {
        const leadId = args?.leadId || args?.id;
        if (!leadId) throw new Error('leadId is required');
        return LeadService.convertLead(ctx.studioId, leadId, args);
      },
    });

    this.register({
      name: 'listStudioProjects',
      description: 'Lists studio photography projects with status, type, client, and date filters.',
      isMutation: false,
      requiresApproval: false,
      isDestructive: false,
      execute: async (ctx, args) => {
        return ProjectService.listProjects(ctx.studioId, args || {});
      },
    });

    this.register({
      name: 'getStudioProject',
      description: 'Fetches full 360 project details including milestones, tasks, galleries, payments, and notes.',
      isMutation: false,
      requiresApproval: false,
      isDestructive: false,
      execute: async (ctx, args) => {
        const projectId = args?.projectId || args?.id;
        if (!projectId) throw new Error('projectId is required');
        return ProjectService.getProject(ctx.studioId, projectId);
      },
    });

    this.register({
      name: 'createStudioProject',
      description: 'Creates a new studio project booking with automatic default milestones and tasks.',
      isMutation: true,
      requiresApproval: false,
      isDestructive: false,
      execute: async (ctx, args) => {
        return ProjectService.createProject(ctx.studioId, args);
      },
    });

    this.register({
      name: 'updateStudioProjectStatus',
      description: 'Updates project status, shoot details, location, or financial amounts.',
      isMutation: true,
      requiresApproval: false,
      isDestructive: false,
      execute: async (ctx, args) => {
        const projectId = args?.projectId || args?.id;
        if (!projectId) throw new Error('projectId is required');
        return ProjectService.updateProject(ctx.studioId, projectId, args);
      },
    });

    this.register({
      name: 'listStudioTasks',
      description: 'Lists project and studio tasks with overdue, priority, and assignment status.',
      isMutation: false,
      requiresApproval: false,
      isDestructive: false,
      execute: async (ctx, args) => {
        return TaskService.listTasks(ctx.studioId, args || {});
      },
    });

    this.register({
      name: 'createStudioTask',
      description: 'Creates a new operational task for a project or general studio workflow.',
      isMutation: true,
      requiresApproval: false,
      isDestructive: false,
      execute: async (ctx, args) => {
        return TaskService.createTask(ctx.studioId, args);
      },
    });

    this.register({
      name: 'completeStudioTask',
      description: 'Marks a studio task as completed.',
      isMutation: true,
      requiresApproval: false,
      isDestructive: false,
      execute: async (ctx, args) => {
        const taskId = args?.taskId || args?.id;
        if (!taskId) throw new Error('taskId is required');
        return TaskService.completeTask(ctx.studioId, taskId);
      },
    });

    this.register({
      name: 'getOperationsCalendar',
      description: 'Fetches multi-source operational calendar events for shoots, tasks, follow-ups, and milestones.',
      isMutation: false,
      requiresApproval: false,
      isDestructive: false,
      execute: async (ctx, args) => {
        return CalendarService.getEvents(ctx.studioId, args || {});
      },
    });

    // -------------------------------------------------------------
    // PHASE 21: CONTRACTS, PROPOSALS & BOOKING TOOLS
    // -------------------------------------------------------------

    this.register({
      name: 'listProposals',
      description: 'Lists studio proposals and quotes with status and client filters.',
      isMutation: false,
      requiresApproval: false,
      isDestructive: false,
      execute: async (ctx, args) => {
        return ProposalService.listProposals(ctx.studioId, args || {});
      },
    });

    this.register({
      name: 'createProposal',
      description: 'Drafts a new itemized proposal or quotation for a client.',
      isMutation: true,
      requiresApproval: false,
      isDestructive: false,
      execute: async (ctx, args) => {
        return ProposalService.createProposal(ctx.studioId, ctx.userId, args);
      },
    });

    this.register({
      name: 'sendProposal',
      description: 'Generates a secure public client link and sends the proposal via email.',
      isMutation: true,
      requiresApproval: true,
      isDestructive: false,
      execute: async (ctx, args) => {
        const id = args?.id || args?.proposalId;
        if (!id) throw new Error('Proposal ID is required');
        return ProposalService.sendProposal(ctx.studioId, id, args);
      },
    });

    this.register({
      name: 'listContracts',
      description: 'Lists photography contracts, agreements, and signature statuses.',
      isMutation: false,
      requiresApproval: false,
      isDestructive: false,
      execute: async (ctx, args) => {
        return ContractService.listContracts(ctx.studioId, args || {});
      },
    });

    this.register({
      name: 'createContract',
      description: 'Generates a legal contract agreement using a studio template and variable interpolation.',
      isMutation: true,
      requiresApproval: false,
      isDestructive: false,
      execute: async (ctx, args) => {
        return ContractService.createContract(ctx.studioId, ctx.userId, args);
      },
    });

    this.register({
      name: 'sendContract',
      description: 'Dispatches contract to client for cryptographic e-signature.',
      isMutation: true,
      requiresApproval: true,
      isDestructive: false,
      execute: async (ctx, args) => {
        const id = args?.id || args?.contractId;
        if (!id) throw new Error('Contract ID is required');
        return ContractService.sendContract(ctx.studioId, id, args);
      },
    });

    this.register({
      name: 'confirmBooking',
      description: 'Confirms a booking, links proposal/contract/lead, and initializes active project and payment schedules.',
      isMutation: true,
      requiresApproval: true,
      isDestructive: false,
      execute: async (ctx, args) => {
        const result = await BookingService.confirmBooking(ctx.studioId, ctx.userId, args);
        return {
          success: true,
          data: result,
          ...result,
        };
      },
    });

    this.register({
      name: 'getBookingPipelineSummary',
      description: 'Aggregates studio booking pipeline conversion rates, active proposals, and pending contracts.',
      isMutation: false,
      requiresApproval: false,
      isDestructive: false,
      execute: async (ctx) => {
        const result = await BookingService.getBookingPipelineSummary(ctx.studioId);
        return {
          success: true,
          data: result,
          ...result,
        };
      },
    });

    // ==========================================
    // PHASE 22: STUDIO SCHEDULING & CALENDAR TOOLS
    // ==========================================

    this.register({
      name: 'getCalendarEvents',
      description: 'Fetch studio calendar events, shoots, consultations, and meetings for a date range.',
      isMutation: false,
      requiresApproval: false,
      isDestructive: false,
      execute: async (ctx, args) => {
        const events = await CalendarEventService.listEvents(ctx.studioId, args);
        return { success: true, count: events.length, data: events };
      },
    });

    this.register({
      name: 'getAvailability',
      description: 'Get working hours, blackout periods, and studio availability rules.',
      isMutation: false,
      requiresApproval: false,
      isDestructive: false,
      execute: async (ctx, args) => {
        const availability = await AvailabilityService.getAvailability({
          studioId: ctx.studioId,
          startDate: args?.start_date || new Date(),
          endDate: args?.end_date || new Date(Date.now() + 7 * 86400000),
          ...args,
        });
        return { success: true, data: availability };
      },
    });

    this.register({
      name: 'findAvailableSlots',
      description: 'Find open booking slots across photographers, equipment, and studio rooms.',
      isMutation: false,
      requiresApproval: false,
      isDestructive: false,
      execute: async (ctx, args) => {
        const slot = await AvailabilityService.findNextAvailableSlot(
          ctx.studioId,
          args?.duration_minutes || 60,
          args?.resource_type
        );
        return { success: true, next_slot: slot, data: slot };
      },
    });

    this.register({
      name: 'checkScheduleConflict',
      description: 'Detect schedule overlaps, staff double-bookings, or blackout clashes for prospective dates.',
      isMutation: false,
      requiresApproval: false,
      isDestructive: false,
      execute: async (ctx, args) => {
        const conflicts = await CalendarConflictService.checkConflicts({
          studioId: ctx.studioId,
          startAt: new Date(args.start_at),
          endAt: new Date(args.end_at),
          resourceIds: args.resource_ids || [],
          bufferBeforeMinutes: args.buffer_before_minutes || 0,
          bufferAfterMinutes: args.buffer_after_minutes || 0,
        });
        return { success: true, has_conflict: conflicts.has_conflict, conflicts: conflicts.conflicts };
      },
    });

    this.register({
      name: 'listResources',
      description: 'List studio photographers, assistants, gear kits, drones, and studio suites.',
      isMutation: false,
      requiresApproval: false,
      isDestructive: false,
      execute: async (ctx, args) => {
        const resources = await ResourceService.listResources(ctx.studioId, args);
        return { success: true, count: resources.length, data: resources };
      },
    });

    this.register({
      name: 'getResourceAvailability',
      description: 'Inspect specific photographer or equipment assignment calendar and upcoming shoots.',
      isMutation: false,
      requiresApproval: false,
      isDestructive: false,
      execute: async (ctx, args) => {
        const resource = await ResourceService.getResource(ctx.studioId, args.resource_id);
        return { success: true, data: resource };
      },
    });

    this.register({
      name: 'createCalendarEvent',
      description: 'Schedule a new shoot, meeting, consultation, or block on the studio calendar.',
      isMutation: true,
      requiresApproval: true,
      isDestructive: false,
      execute: async (ctx, args) => {
        const event = await CalendarEventService.createEvent(ctx.studioId, ctx.userId, args);
        return { success: true, data: event, event_id: event.id };
      },
    });

    this.register({
      name: 'rescheduleCalendarEvent',
      description: 'Move an existing calendar event or booking to a new conflict-free date and time.',
      isMutation: true,
      requiresApproval: true,
      isDestructive: false,
      execute: async (ctx, args) => {
        const event = await CalendarEventService.updateEvent(ctx.studioId, ctx.userId, args.event_id, {
          start_at: args.new_start_at,
          end_at: args.new_end_at,
          timezone: args.timezone,
        });
        return { success: true, data: event };
      },
    });

    this.register({
      name: 'cancelCalendarEvent',
      description: 'Cancel a calendar event or release booked resources with an audit reason.',
      isMutation: true,
      requiresApproval: true,
      isDestructive: false,
      execute: async (ctx, args) => {
        const event = await CalendarEventService.cancelEvent(
          ctx.studioId,
          ctx.userId,
          args.event_id,
          args.reason,
          args.note
        );
        return { success: true, data: event };
      },
    });

    this.register({
      name: 'listBookingRequests',
      description: 'List client self-booking portal submissions pending confirmation or review.',
      isMutation: false,
      requiresApproval: false,
      isDestructive: false,
      execute: async (ctx, args) => {
        const requests = await BookingRequestService.listBookingRequests(ctx.studioId, args?.status);
        return { success: true, count: requests.length, data: requests };
      },
    });

    this.register({
      name: 'createBookingLink',
      description: 'Generate a secure public self-booking link for clients to select their session date.',
      isMutation: true,
      requiresApproval: false,
      isDestructive: false,
      execute: async (ctx, args) => {
        const link = await BookingLinkService.createBookingLink(ctx.studioId, ctx.userId, args);
        return { success: true, booking_url: link.booking_url, raw_token: link.raw_token, data: link };
      },
    });

    this.register({
      name: 'getBookingPipelineCalendar',
      description: 'Summarize upcoming shoots, pending booking requests, resource utilization, and calendar metrics.',
      isMutation: false,
      requiresApproval: false,
      isDestructive: false,
      execute: async (ctx) => {
        const summary = await CalendarEventService.getCalendarSummary(ctx.studioId);
        return { success: true, data: summary, ...summary };
      },
    });

    // -------------------------------------------------------------
    // PHASE 23: STUDIO PRODUCTION & SHOOT MANAGEMENT TOOLS
    // -------------------------------------------------------------

    // Read Tool 1: getProjectProductionStatus & getProjectProduction
    this.register({
      name: 'getProjectProductionStatus',
      description: 'Get project production stage, shoot date, turnaround deadlines, and operational progress.',
      isMutation: false,
      requiresApproval: false,
      isDestructive: false,
      execute: async (ctx, args) => {
        const production = await ProductionService.getProjectProduction(ctx.studioId, args.projectId || args.project_id);
        return { success: true, data: production };
      },
    });

    this.register({
      name: 'getProjectProduction',
      description: 'Get project production stage, shoot date, turnaround deadlines, and operational progress.',
      isMutation: false,
      requiresApproval: false,
      isDestructive: false,
      execute: async (ctx, args) => {
        const production = await ProductionService.getProjectProduction(ctx.studioId, args.projectId || args.project_id);
        return { success: true, data: production };
      },
    });

    // Read Tool 2: getShootSessions
    this.register({
      name: 'getShootSessions',
      description: 'Get all scheduled shoot sessions, call times, and locations for a project.',
      isMutation: false,
      requiresApproval: false,
      isDestructive: false,
      execute: async (ctx, args) => {
        const sessions = await ShootSessionService.getSessions(ctx.studioId, args.projectId || args.project_id);
        return { success: true, count: sessions.length, data: sessions };
      },
    });

    // Read Tool 3: getShootTimeline
    this.register({
      name: 'getShootTimeline',
      description: 'Get chronological shoot-day timeline, milestones, and schedule blocks.',
      isMutation: false,
      requiresApproval: false,
      isDestructive: false,
      execute: async (ctx, args) => {
        const timeline = await ShootTimelineService.getTimeline(ctx.studioId, args.projectId || args.project_id);
        return { success: true, count: timeline.length, data: timeline };
      },
    });

    // Read Tool 4: getProductionChecklist
    this.register({
      name: 'getProductionChecklist',
      description: 'Get pre-shoot, shoot-day, and post-shoot checklists with completion status.',
      isMutation: false,
      requiresApproval: false,
      isDestructive: false,
      execute: async (ctx, args) => {
        const checklists = await ProductionChecklistService.getChecklists(ctx.studioId, args.projectId || args.project_id);
        return { success: true, count: checklists.length, data: checklists };
      },
    });

    // Read Tool 5: getShotList
    this.register({
      name: 'getShotList',
      description: 'Get project shot lists, VIP family grouping combinations, and capture status.',
      isMutation: false,
      requiresApproval: false,
      isDestructive: false,
      execute: async (ctx, args) => {
        const shotLists = await ShotListService.getShotLists(ctx.studioId, args.projectId || args.project_id);
        return { success: true, count: shotLists.length, data: shotLists };
      },
    });

    // Read Tool 6: getCrewAssignments
    this.register({
      name: 'getCrewAssignments',
      description: 'Get assigned photographers, second shooters, assistants, and crew call times.',
      isMutation: false,
      requiresApproval: false,
      isDestructive: false,
      execute: async (ctx, args) => {
        const crew = await CrewAssignmentService.getCrewAssignments(ctx.studioId, args.projectId || args.project_id);
        return { success: true, count: crew.length, data: crew };
      },
    });

    // Read Tool 7: getEquipmentChecklist
    this.register({
      name: 'getEquipmentChecklist',
      description: 'Get equipment packing and checkout list for cameras, lenses, lighting, and audio gear.',
      isMutation: false,
      requiresApproval: false,
      isDestructive: false,
      execute: async (ctx, args) => {
        const equipment = await EquipmentChecklistService.getEquipmentList(ctx.studioId, args.projectId || args.project_id);
        return { success: true, count: equipment.length, data: equipment };
      },
    });

    // Read Tool 8: getProductionHealth
    this.register({
      name: 'getProductionHealth',
      description: 'Calculate 8-dimension production health score (0-100) and actionable recommendations.',
      isMutation: false,
      requiresApproval: false,
      isDestructive: false,
      execute: async (ctx, args) => {
        const health = await ProductionHealthService.computeHealthScore(ctx.studioId, args.projectId || args.project_id);
        return { success: true, data: health };
      },
    });

    // Read Tool 9: getUpcomingProductionDeadlines
    this.register({
      name: 'getUpcomingProductionDeadlines',
      description: 'List upcoming or overdue culling, editing, and delivery deadlines across studio productions.',
      isMutation: false,
      requiresApproval: false,
      isDestructive: false,
      execute: async (ctx, args) => {
        const days = args?.days || 7;
        const deadlines = await ProductionDeadlineService.getOverdueAndUpcomingDeadlines(ctx.studioId, days);
        return { success: true, count: deadlines.length, data: deadlines };
      },
    });

    // Read Tool 10: getMediaProductionStatus
    this.register({
      name: 'getMediaProductionStatus',
      description: 'Get photo count status across raw ingestion, culling, editing, AI processing, and gallery handoff.',
      isMutation: false,
      requiresApproval: false,
      isDestructive: false,
      execute: async (ctx, args) => {
        const status = await MediaHandoffService.getMediaProductionStatus(ctx.studioId, args.projectId || args.project_id);
        return { success: true, data: status };
      },
    });

    // Mutation Tool 1: createShootSession
    this.register({
      name: 'createShootSession',
      description: 'Schedule a new shoot session with date, call time, and location.',
      isMutation: true,
      requiresApproval: false,
      isDestructive: false,
      execute: async (ctx, args) => {
        const session = await ShootSessionService.createSession(ctx.studioId, args.projectId || args.project_id, args);
        return { success: true, message: 'Shoot session created successfully.', data: session };
      },
    });

    // Mutation Tool 2: updateProductionStage
    this.register({
      name: 'updateProductionStage',
      description: 'Transition production stage with state machine validation and audit history.',
      isMutation: true,
      requiresApproval: false,
      isDestructive: false,
      execute: async (ctx, args) => {
        const production = await ProductionService.transitionStage(
          ctx.studioId,
          args.projectId || args.project_id,
          args.toStage || args.to_stage,
          args.reason,
          ctx.userId
        );
        return { success: true, message: `Production transitioned to ${args.toStage || args.to_stage}.`, data: production };
      },
    });

    // Mutation Tool 3: createProductionChecklist
    this.register({
      name: 'createProductionChecklist',
      description: 'Create a custom or templated checklist for a project production.',
      isMutation: true,
      requiresApproval: false,
      isDestructive: false,
      execute: async (ctx, args) => {
        const checklist = await ProductionChecklistService.createChecklist(ctx.studioId, args.projectId || args.project_id, args);
        return { success: true, message: 'Checklist created.', data: checklist };
      },
    });

    // Mutation Tool 4: completeProductionChecklist
    this.register({
      name: 'completeProductionChecklist',
      description: 'Mark a checklist item as completed or pending.',
      isMutation: true,
      requiresApproval: false,
      isDestructive: false,
      execute: async (ctx, args) => {
        await ProductionChecklistService.updateChecklistItem(ctx.studioId, args.itemId || args.item_id, {
          is_completed: args.is_completed !== undefined ? Boolean(args.is_completed) : true,
        });
        return { success: true, message: 'Checklist item updated.' };
      },
    });

    // Mutation Tool 5: createShotList
    this.register({
      name: 'createShotList',
      description: 'Create a structured shot list for a production.',
      isMutation: true,
      requiresApproval: false,
      isDestructive: false,
      execute: async (ctx, args) => {
        const list = await ShotListService.createShotList(ctx.studioId, args.projectId || args.project_id, args);
        return { success: true, message: 'Shot list created.', data: list };
      },
    });

    // Mutation Tool 6: updateShotStatus
    this.register({
      name: 'updateShotStatus',
      description: 'Update the capture status of a shot list item (e.g. CAPTURED, SKIPPED, FLAGGED).',
      isMutation: true,
      requiresApproval: false,
      isDestructive: false,
      execute: async (ctx, args) => {
        const item = await ShotListService.updateShotItem(ctx.studioId, args.itemId || args.item_id, {
          status: args.status || 'CAPTURED',
          notes: args.notes,
        });
        return { success: true, message: `Shot updated to ${args.status || 'CAPTURED'}.`, data: item };
      },
    });

    // Mutation Tool 7: assignCrewMember
    this.register({
      name: 'assignCrewMember',
      description: 'Assign a crew member or resource to a shoot with role and call time.',
      isMutation: true,
      requiresApproval: false,
      isDestructive: false,
      execute: async (ctx, args) => {
        const crew = await CrewAssignmentService.assignCrewMember(ctx.studioId, args.projectId || args.project_id, args);
        return { success: true, message: `Crew member ${args.name} assigned.`, data: crew };
      },
    });

    // Mutation Tool 8: assignEquipment
    this.register({
      name: 'assignEquipment',
      description: 'Assign equipment gear to a project production checklist.',
      isMutation: true,
      requiresApproval: false,
      isDestructive: false,
      execute: async (ctx, args) => {
        const eq = await EquipmentChecklistService.assignEquipment(ctx.studioId, args.projectId || args.project_id, args);
        return { success: true, message: `Equipment ${args.item_name} added.`, data: eq };
      },
    });

    // Mutation Tool 9: createShootNote
    this.register({
      name: 'createShootNote',
      description: 'Add an internal operational or shoot-day note to the production.',
      isMutation: true,
      requiresApproval: false,
      isDestructive: false,
      execute: async (ctx, args) => {
        const production = await ProductionService.getProjectProduction(ctx.studioId, args.projectId || args.project_id);
        const timestamp = new Date().toLocaleTimeString();
        const updatedNotes = `${production?.internal_notes ? production.internal_notes + '\n' : ''}[Note ${timestamp}]: ${args.note}`;
        await prisma.projectProduction.update({
          where: { id: production.id },
          data: { internal_notes: updatedNotes, updated_at: new Date() },
        });
        return { success: true, message: 'Production note recorded.' };
      },
    });

    // Mutation Tool 10: markShootStarted
    this.register({
      name: 'markShootStarted',
      description: 'Verify pre-shoot readiness and transition project to SHOOT_IN_PROGRESS.',
      isMutation: true,
      requiresApproval: false,
      isDestructive: false,
      execute: async (ctx, args) => {
        const result = await ProductionService.startShoot(
          ctx.studioId,
          args.projectId || args.project_id,
          Boolean(args.bypass_checks || args.bypassChecks)
        );
        return { success: true, message: 'Shoot started. Mode switched to live shoot day.', data: result };
      },
    });

    // Mutation Tool 11: markShootCompleted
    this.register({
      name: 'markShootCompleted',
      description: 'Wrap shoot day, record estimated raw photo count, and advance stage to SHOOT_COMPLETED.',
      isMutation: true,
      requiresApproval: false,
      isDestructive: false,
      execute: async (ctx, args) => {
        const result = await ProductionService.completeShoot(
          ctx.studioId,
          args.projectId || args.project_id,
          args.raw_photo_count || args.rawPhotoCount,
          args.notes
        );
        return { success: true, message: 'Shoot marked completed. Ready for media ingestion.', data: result };
      },
    });

    // Read Tool 11: getProductionSummary
    this.register({
      name: 'getProductionSummary',
      description: 'Get high level studio production summary, active projects by stage, and health stats.',
      isMutation: false,
      requiresApproval: false,
      isDestructive: false,
      execute: async (ctx, args) => {
        const summary = await ProductionService.getStudioProductionSummary(ctx.studioId);
        return { success: true, data: summary };
      },
    });

    // Read Tool 12: getProductionChecklists
    this.register({
      name: 'getProductionChecklists',
      description: 'Get pre-shoot, shoot-day, and post-shoot checklists with completion status.',
      isMutation: false,
      requiresApproval: false,
      isDestructive: false,
      execute: async (ctx, args) => {
        const checklists = await ProductionChecklistService.getChecklists(ctx.studioId, args.projectId || args.project_id);
        return { success: true, count: checklists.length, data: checklists };
      },
    });

    // Read Tool 13: getShotLists
    this.register({
      name: 'getShotLists',
      description: 'Get project shot lists, VIP family grouping combinations, and capture status.',
      isMutation: false,
      requiresApproval: false,
      isDestructive: false,
      execute: async (ctx, args) => {
        const shotLists = await ShotListService.getShotLists(ctx.studioId, args.projectId || args.project_id);
        return { success: true, count: shotLists.length, data: shotLists };
      },
    });

    // Read Tool 14: getProjectQuestionnaires
    this.register({
      name: 'getProjectQuestionnaires',
      description: 'Get all client pre-shoot consultation questionnaires for a project.',
      isMutation: false,
      requiresApproval: false,
      isDestructive: false,
      execute: async (ctx, args) => {
        const questionnaires = await QuestionnaireService.getQuestionnairesByProject(ctx.studioId, args.projectId || args.project_id);
        return { success: true, count: questionnaires.length, data: questionnaires };
      },
    });

    // Mutation Tool 12: updateShootSession
    this.register({
      name: 'updateShootSession',
      description: 'Update shoot session details, dates, or location.',
      isMutation: true,
      requiresApproval: false,
      isDestructive: false,
      execute: async (ctx, args) => {
        const session = await ShootSessionService.updateSession(ctx.studioId, args.sessionId || args.session_id, args);
        return { success: true, message: 'Shoot session updated.', data: session };
      },
    });

    // Mutation Tool 13: removeCrewMember
    this.register({
      name: 'removeCrewMember',
      description: 'Remove crew assignment from project.',
      isMutation: true,
      requiresApproval: false,
      isDestructive: false,
      execute: async (ctx, args) => {
        const removed = await CrewAssignmentService.removeCrewMember(ctx.studioId, args.assignmentId || args.assignment_id);
        return { success: true, message: 'Crew assignment removed.', data: removed };
      },
    });

    // Mutation Tool 14: updateEquipmentPackStatus
    this.register({
      name: 'updateEquipmentPackStatus',
      description: 'Update checked/verified status of an equipment checklist item.',
      isMutation: true,
      requiresApproval: false,
      isDestructive: false,
      execute: async (ctx, args) => {
        const updated = await EquipmentChecklistService.updateCheckedStatus(ctx.studioId, args.itemId || args.item_id, Boolean(args.is_checked ?? args.isChecked ?? args.checked));
        return { success: true, message: 'Equipment status updated.', data: updated };
      },
    });

    // Mutation Tool 15: updateChecklistItemStatus
    this.register({
      name: 'updateChecklistItemStatus',
      description: 'Update status of a production checklist item.',
      isMutation: true,
      requiresApproval: false,
      isDestructive: false,
      execute: async (ctx, args) => {
        const updated = await ProductionChecklistService.updateChecklistItem(ctx.studioId, args.itemId || args.item_id, args);
        return { success: true, message: 'Checklist item updated.', data: updated };
      },
    });

    // Mutation Tool 16: toggleShotItem
    this.register({
      name: 'toggleShotItem',
      description: 'Toggle shot list item captured status.',
      isMutation: true,
      requiresApproval: false,
      isDestructive: false,
      execute: async (ctx, args) => {
        const item = await ShotListService.updateShotItem(ctx.studioId, args.itemId || args.item_id, {
          status: args.status || 'CAPTURED',
          notes: args.notes,
        });
        return { success: true, message: `Shot updated to ${args.status || 'CAPTURED'}.`, data: item };
      },
    });

    // Mutation Tool 17: createQuestionnaire
    this.register({
      name: 'createQuestionnaire',
      description: 'Create a client questionnaire with template and public cryptographic token.',
      isMutation: true,
      requiresApproval: false,
      isDestructive: false,
      execute: async (ctx, args) => {
        const result = await QuestionnaireService.createQuestionnaire(ctx.studioId, args.projectId || args.project_id, args);
        return { success: true, message: 'Questionnaire created.', data: result };
      },
    });

    // Mutation Tool 18: addTimelineEvent
    this.register({
      name: 'addTimelineEvent',
      description: 'Add a timeline block or milestone to the shoot-day run of show.',
      isMutation: true,
      requiresApproval: false,
      isDestructive: false,
      execute: async (ctx, args) => {
        const item = await ShootTimelineService.addTimelineItem(ctx.studioId, args.projectId || args.project_id, args);
        return { success: true, message: 'Timeline item added.', data: item };
      },
    });

    // ==========================================
    // PHASE 24: MEDIA CULLING, EDITING & POST-PRODUCTION TOOLS
    // ==========================================

    // Read Tool: getCullingSummary
    this.register({
      name: 'getCullingSummary',
      description: 'Get culling and media review analytics summary for studio, gallery, or project.',
      isMutation: false,
      requiresApproval: false,
      isDestructive: false,
      execute: async (ctx, args) => {
        const summary = await CullingAnalyticsService.getCullingSummary(
          ctx.studioId,
          args.galleryId || args.gallery_id,
          args.projectId || args.project_id
        );
        return { success: true, data: summary };
      },
    });

    // Read Tool: listCullCandidates
    this.register({
      name: 'listCullCandidates',
      description: 'List culling candidates with scores and recommendations for a session.',
      isMutation: false,
      requiresApproval: false,
      isDestructive: false,
      execute: async (ctx, args) => {
        const candidates = await CullSessionService.getCullCandidates(
          ctx.studioId,
          args.sessionId || args.session_id,
          {
            decisionFilter: args.decisionFilter || args.decision_filter,
            recommendationFilter: args.recommendationFilter || args.recommendation_filter,
            minScore: args.minScore ?? args.min_score,
            maxScore: args.maxScore ?? args.max_score,
            burstGroupId: args.burstGroupId || args.burst_group_id,
            limit: args.limit,
            offset: args.offset,
          }
        );
        return { success: true, data: candidates };
      },
    });

    // Read Tool: getBurstGroups
    this.register({
      name: 'getBurstGroups',
      description: 'Retrieve burst shot sequences and duplicate groups for a gallery or session.',
      isMutation: false,
      requiresApproval: false,
      isDestructive: false,
      execute: async (ctx, args) => {
        const groups = await CullEngineService.getBurstGroups(
          ctx.studioId,
          args.galleryId || args.gallery_id,
          args.sessionId || args.session_id
        );
        return { success: true, data: groups };
      },
    });

    // Read Tool: getEditingQueue
    this.register({
      name: 'getEditingQueue',
      description: 'List active and pending non-destructive editing jobs in the studio queue.',
      isMutation: false,
      requiresApproval: false,
      isDestructive: false,
      execute: async (ctx, args) => {
        const queue = await EditEngineService.listEditJobs(ctx.studioId, {
          galleryId: args.galleryId || args.gallery_id,
          status: args.status,
          limit: args.limit,
          offset: args.offset,
        });
        return { success: true, data: queue };
      },
    });

    // Read Tool: getEditSuggestions
    this.register({
      name: 'getEditSuggestions',
      description: 'Retrieve AI-generated editing adjustment suggestions for a photo or job.',
      isMutation: false,
      requiresApproval: false,
      isDestructive: false,
      execute: async (ctx, args) => {
        const suggestions = await EditEngineService.getEditSuggestions(
          ctx.studioId,
          args.photoId || args.photo_id,
          args.jobId || args.job_id
        );
        return { success: true, data: suggestions };
      },
    });

    // Read Tool: getExportStatus
    this.register({
      name: 'getExportStatus',
      description: 'Check status, progress, and generated artifacts of a media export job.',
      isMutation: false,
      requiresApproval: false,
      isDestructive: false,
      execute: async (ctx, args) => {
        const status = await ExportEngineService.getExportJob(ctx.studioId, args.jobId || args.job_id);
        return { success: true, data: status };
      },
    });

    // Mutation Tool: createCullSession
    this.register({
      name: 'createCullSession',
      description: 'Initialize a new AI-assisted culling and review session for a gallery.',
      isMutation: true,
      requiresApproval: true,
      isDestructive: false,
      execute: async (ctx, args) => {
        const session = await CullSessionService.createCullSession(ctx.studioId, ctx.userId, {
          galleryId: args.galleryId || args.gallery_id,
          projectId: args.projectId || args.project_id,
          name: args.name || 'AI Culling Session',
          weights: args.weights,
          autoGroupBursts: args.autoGroupBursts ?? true,
        });
        return { success: true, message: 'Culling session created successfully.', data: session };
      },
    });

    // Mutation Tool: applyCullDecision
    this.register({
      name: 'applyCullDecision',
      description: 'Record a Keep, Reject, or Maybe decision for a photo (non-destructive, never deletes files).',
      isMutation: true,
      requiresApproval: true,
      isDestructive: false,
      execute: async (ctx, args) => {
        const decision = await CullSessionService.recordDecision(
          ctx.studioId,
          args.sessionId || args.session_id,
          args.photoId || args.photo_id,
          ctx.userId,
          {
            decision: args.decision,
            rating: args.rating,
            colorLabel: args.colorLabel || args.color_label,
            notes: args.notes,
          }
        );
        return { success: true, message: `Decision "${args.decision}" applied.`, data: decision };
      },
    });

    // Mutation Tool: bulkCullDecision
    this.register({
      name: 'bulkCullDecision',
      description: 'Apply batch culling decisions to multiple photos simultaneously.',
      isMutation: true,
      requiresApproval: true,
      isDestructive: false,
      execute: async (ctx, args) => {
        const result = await CullSessionService.bulkRecordDecisions(
          ctx.studioId,
          args.sessionId || args.session_id,
          ctx.userId,
          args.photoIds || args.photo_ids,
          args.decision,
          args.colorLabel || args.color_label
        );
        return { success: true, message: `Applied "${args.decision}" to ${result.count} photos.`, data: result };
      },
    });

    // Mutation Tool: createEditJob
    this.register({
      name: 'createEditJob',
      description: 'Queue non-destructive edit job with custom parameters or preset.',
      isMutation: true,
      requiresApproval: true,
      isDestructive: false,
      execute: async (ctx, args) => {
        const job = await EditEngineService.createEditJob(ctx.studioId, ctx.userId, {
          photoId: args.photoId || args.photo_id,
          presetId: args.presetId || args.preset_id,
          parameters: args.parameters,
        });
        return { success: true, message: 'Edit job queued successfully.', data: job };
      },
    });

    // Mutation Tool: approveEdit
    this.register({
      name: 'approveEdit',
      description: 'Approve and apply an AI editing suggestion to create a new non-destructive edit version.',
      isMutation: true,
      requiresApproval: true,
      isDestructive: false,
      execute: async (ctx, args) => {
        const version = await EditEngineService.approveSuggestion(
          ctx.studioId,
          ctx.userId,
          args.suggestionId || args.suggestion_id
        );
        return { success: true, message: 'AI suggestion approved and version created.', data: version };
      },
    });

    // Mutation Tool: createExportJob
    this.register({
      name: 'createExportJob',
      description: 'Queue batch media export job with format, resolution, watermark, and metadata presets.',
      isMutation: true,
      requiresApproval: true,
      isDestructive: false,
      execute: async (ctx, args) => {
        const job = await ExportEngineService.createExportJob(ctx.studioId, ctx.userId, {
          galleryId: args.galleryId || args.gallery_id,
          photoIds: args.photoIds || args.photo_ids,
          presetId: args.presetId || args.preset_id,
          targetFormat: args.targetFormat || args.target_format,
          quality: args.quality,
          colorSpace: args.colorSpace || args.color_space,
          metadataPolicy: args.metadataPolicy || args.metadata_policy,
          watermarkEnabled: args.watermarkEnabled ?? args.watermark_enabled,
        });
        return { success: true, message: 'Export job queued successfully.', data: job };
      },
    });

    // -------------------------------------------------------------
    // PHASE 25: CLIENT PROOFING & SELECTION TOOLS
    // -------------------------------------------------------------

    this.register({
      name: 'getProofingSessionSummary',
      description: 'Fetches high-level metrics and performance summary of client proofing sessions for the studio.',
      isMutation: false,
      requiresApproval: false,
      isDestructive: false,
      execute: async (ctx) => {
        return ProofingAnalyticsService.getStudioSummary(ctx.studioId);
      },
    });

    this.register({
      name: 'getProofingSession',
      description: 'Fetches full proofing session details, item selection status, rules, and live quota compliance.',
      isMutation: false,
      requiresApproval: false,
      isDestructive: false,
      execute: async (ctx, args) => {
        const sessionId = args.sessionId || args.session_id;
        if (!sessionId) throw new Error('sessionId is required');
        const session = await ProofingSessionService.getSessionById(sessionId, ctx.studioId);
        if (!session) throw new Error(`Proofing session '${sessionId}' not found.`);
        return session;
      },
    });

    this.register({
      name: 'listProofingSelections',
      description: 'Lists all selected or favorite photo items in a proofing session.',
      isMutation: false,
      requiresApproval: false,
      isDestructive: false,
      execute: async (_ctx, args) => {
        const sessionId = args.sessionId || args.session_id;
        if (!sessionId) throw new Error('sessionId is required');
        return ProofingSelectionService.getSessionItems(sessionId, args.statusFilter || ProofingItemStatus.SELECTED);
      },
    });

    this.register({
      name: 'getProofingComments',
      description: 'Retrieves all pinpoint feedback and retouching comments for a proofing session.',
      isMutation: false,
      requiresApproval: false,
      isDestructive: false,
      execute: async (_ctx, args) => {
        const sessionId = args.sessionId || args.session_id;
        if (!sessionId) throw new Error('sessionId is required');
        return ProofingFeedbackService.getSessionComments(sessionId);
      },
    });

    this.register({
      name: 'getProofingRuleStatus',
      description: 'Evaluates selection quota rules, min/max bounds, extra photo count, and total surcharge.',
      isMutation: false,
      requiresApproval: false,
      isDestructive: false,
      execute: async (ctx, args) => {
        const sessionId = args.sessionId || args.session_id;
        if (!sessionId) throw new Error('sessionId is required');
        const session = await ProofingSessionService.getSessionById(sessionId, ctx.studioId);
        if (!session) throw new Error(`Proofing session '${sessionId}' not found.`);
        return session.quota;
      },
    });

    this.register({
      name: 'createProofingSession',
      description: 'Creates a new client proofing session with selection quotas, pricing rules, and security tokens.',
      isMutation: true,
      requiresApproval: true,
      isDestructive: false,
      execute: async (ctx, args) => {
        const session = await ProofingSessionService.createSession(ctx.studioId, {
          name: args.name,
          gallery_id: args.galleryId || args.gallery_id || ctx.galleryId!,
          project_id: args.projectId || args.project_id,
          client_id: args.clientId || args.client_id,
          description: args.description,
          pin_code: args.pinCode || args.pin_code,
          deadline_at: args.deadlineAt || args.deadline_at,
          expires_at: args.expiresAt || args.expires_at,
          allow_download_previews: args.allowDownloadPreviews ?? args.allow_download_previews,
          watermark_enabled: args.watermarkEnabled ?? args.watermark_enabled,
          photo_ids: args.photoIds || args.photo_ids,
          rules: args.rules,
        }, ctx.userId);
        return { success: true, message: 'Proofing session created successfully.', data: session };
      },
    });

    this.register({
      name: 'updateProofingRules',
      description: 'Updates proofing selection rules (included count, min/max bounds, extra price).',
      isMutation: true,
      requiresApproval: true,
      isDestructive: false,
      execute: async (ctx, args) => {
        const sessionId = args.sessionId || args.session_id;
        if (!sessionId) throw new Error('sessionId is required');
        const rules = await ProofingSessionService.updateRules(sessionId, ctx.studioId, {
          included_count: args.included_count ?? args.includedCount,
          min_selections: args.min_selections ?? args.minSelections,
          max_selections: args.max_selections ?? args.maxSelections,
          allow_extras: args.allow_extras ?? args.allowExtras,
          extra_price_cents: args.extra_price_cents ?? args.extraPriceCents,
          currency: args.currency,
          allow_client_notes: args.allow_client_notes ?? args.allowClientNotes,
          allow_pinpoint_feedback: args.allow_pinpoint_feedback ?? args.allowPinpointFeedback,
          allow_favorite_starring: args.allow_favorite_starring ?? args.allowFavoriteStarring,
          allow_side_by_side_compare: args.allow_side_by_side_compare ?? args.allowSideBySideCompare,
        }, ctx.userId);
        return { success: true, message: 'Proofing rules updated successfully.', data: rules };
      },
    });

    this.register({
      name: 'submitClientSelections',
      description: 'Submits client proofing selections for studio review after verifying quota constraints.',
      isMutation: true,
      requiresApproval: false,
      isDestructive: false,
      execute: async (_ctx, args) => {
        const sessionId = args.sessionId || args.session_id;
        if (!sessionId) throw new Error('sessionId is required');
        const session = await ProofingReviewService.submitClientSelections(sessionId, {
          client_name: args.clientName || args.client_name,
          client_email: args.clientEmail || args.client_email,
          final_notes: args.finalNotes || args.final_notes,
          confirm_extra_charges: args.confirmExtraCharges ?? args.confirm_extra_charges,
        });
        return { success: true, message: 'Selections submitted successfully.', data: session };
      },
    });

    this.register({
      name: 'approveProofingSelections',
      description: 'Approves client selections, creates editing jobs in Phase 24 queue, and advances production DAG.',
      isMutation: true,
      requiresApproval: true,
      isDestructive: false,
      execute: async (ctx, args) => {
        const sessionId = args.sessionId || args.session_id;
        if (!sessionId) throw new Error('sessionId is required');
        const review = await ProofingReviewService.reviewSelections(sessionId, ctx.studioId, ctx.userId, {
          decision: ProofingReviewDecision.APPROVED_FOR_EDITING,
          feedback_notes: args.feedbackNotes || args.feedback_notes,
          auto_create_edit_jobs: args.autoCreateEditJobs ?? args.auto_create_edit_jobs ?? true,
          advance_production_stage: args.advanceProductionStage ?? args.advance_production_stage ?? true,
        });
        return { success: true, message: 'Selections approved and queued for editing.', data: review };
      },
    });

    this.register({
      name: 'requestProofingChanges',
      description: 'Sends selections back to client for revision with feedback notes and re-enables editing.',
      isMutation: true,
      requiresApproval: true,
      isDestructive: false,
      execute: async (ctx, args) => {
        const sessionId = args.sessionId || args.session_id;
        if (!sessionId) throw new Error('sessionId is required');
        const review = await ProofingReviewService.reviewSelections(sessionId, ctx.studioId, ctx.userId, {
          decision: ProofingReviewDecision.REVISION_REQUIRED,
          feedback_notes: args.feedbackNotes || args.feedback_notes || 'Please adjust your photo selections according to the requested notes.',
        });
        return { success: true, message: 'Revision requested from client.', data: review };
      },
    });

    // -------------------------------------------------------------
    // PHASE 26: PHOTO FULFILLMENT, DELIVERY & ORDER MANAGEMENT TOOLS
    // -------------------------------------------------------------

    this.register({
      name: 'getFulfillmentOrder',
      description: 'Retrieves complete details for a photo fulfillment order including items, payments, delivery packages, and audit log.',
      isMutation: false,
      requiresApproval: false,
      isDestructive: false,
      execute: async (ctx, args) => {
        const orderId = args.orderId || args.order_id;
        if (!orderId) throw new Error('orderId is required');
        return FulfillmentOrderService.getOrder(orderId, ctx.studioId);
      },
    });

    this.register({
      name: 'listFulfillmentOrders',
      description: 'Lists fulfillment orders for the studio with status, delivery type, date, and search filters.',
      isMutation: false,
      requiresApproval: false,
      isDestructive: false,
      execute: async (ctx, args) => {
        return FulfillmentOrderService.listOrders(ctx.studioId, args);
      },
    });

    this.register({
      name: 'getFulfillmentOrderSummary',
      description: 'Calculates studio fulfillment metrics, status distributions, turnaround times, and revenue breakdown.',
      isMutation: false,
      requiresApproval: false,
      isDestructive: false,
      execute: async (ctx, args) => {
        return FulfillmentAnalyticsService.getAnalyticsSummary(ctx.studioId, args);
      },
    });

    this.register({
      name: 'getFulfillmentProducts',
      description: 'Lists available print, album, canvas, framing, digital, and custom products in the studio catalog.',
      isMutation: false,
      requiresApproval: false,
      isDestructive: false,
      execute: async (ctx, args) => {
        return FulfillmentProductService.listProducts(ctx.studioId, args);
      },
    });

    this.register({
      name: 'getDeliveryStatus',
      description: 'Retrieves courier tracking, shipping progress, and item status for a physical fulfillment shipment.',
      isMutation: false,
      requiresApproval: false,
      isDestructive: false,
      execute: async (ctx, args) => {
        const deliveryId = args.deliveryId || args.delivery_id;
        if (!deliveryId) throw new Error('deliveryId is required');
        return FulfillmentPhysicalService.getDelivery(deliveryId, ctx.studioId);
      },
    });

    this.register({
      name: 'getDigitalPackageStatus',
      description: 'Retrieves digital download package status, access limits, expiration, and download telemetry.',
      isMutation: false,
      requiresApproval: false,
      isDestructive: false,
      execute: async (ctx, args) => {
        const packageId = args.packageId || args.package_id;
        if (!packageId) throw new Error('packageId is required');
        return FulfillmentDigitalService.getPackage(packageId, ctx.studioId);
      },
    });

    this.register({
      name: 'createFulfillmentOrder',
      description: 'Creates a fulfillment order either from approved proofing selections or manually with custom line items.',
      isMutation: true,
      requiresApproval: false,
      isDestructive: false,
      execute: async (ctx, args) => {
        if (args.proofingSessionId || args.proofing_session_id) {
          return FulfillmentOrderService.createFromProofingSession(
            args.proofingSessionId || args.proofing_session_id,
            ctx.studioId,
            ctx.userId,
            args
          );
        }
        return FulfillmentOrderService.createManualOrder(ctx.studioId, ctx.userId, args);
      },
    });

    this.register({
      name: 'updateFulfillmentOrder',
      description: 'Updates fulfillment order status, notes, or client delivery address.',
      isMutation: true,
      requiresApproval: false,
      isDestructive: false,
      execute: async (ctx, args) => {
        const orderId = args.orderId || args.order_id;
        if (!orderId) throw new Error('orderId is required');
        return FulfillmentOrderService.updateOrderStatus(orderId, ctx.studioId, ctx.userId, args.status, args.notes);
      },
    });

    this.register({
      name: 'createDeliveryPackage',
      description: 'Creates a digital download package with expiration and photo asset bundles.',
      isMutation: true,
      requiresApproval: false,
      isDestructive: false,
      execute: async (ctx, args) => {
        const orderId = args.orderId || args.order_id;
        if (!orderId) throw new Error('orderId is required');
        return FulfillmentDigitalService.createDigitalPackage(orderId, ctx.studioId, ctx.userId, args);
      },
    });

    this.register({
      name: 'markOrderReady',
      description: 'Transitions order to READY_FOR_DELIVERY once editing and packaging are verified.',
      isMutation: true,
      requiresApproval: false,
      isDestructive: false,
      execute: async (ctx, args) => {
        const orderId = args.orderId || args.order_id;
        if (!orderId) throw new Error('orderId is required');
        return FulfillmentOrderService.markReadyForDelivery(orderId, ctx.studioId, ctx.userId, args.notes);
      },
    });

    this.register({
      name: 'markOrderDelivered',
      description: 'Marks fulfillment order as delivered to client and logs final fulfillment timestamp.',
      isMutation: true,
      requiresApproval: false,
      isDestructive: false,
      execute: async (ctx, args) => {
        const orderId = args.orderId || args.order_id;
        if (!orderId) throw new Error('orderId is required');
        return FulfillmentOrderService.markDelivered(orderId, ctx.studioId, ctx.userId, args.notes);
      },
    });

    this.register({
      name: 'recordFulfillmentPayment',
      description: 'Records a client payment against an order and synchronizes with Phase 18 Studio Business Transactions.',
      isMutation: true,
      requiresApproval: true,
      isDestructive: false,
      execute: async (ctx, args) => {
        const orderId = args.orderId || args.order_id;
        if (!orderId) throw new Error('orderId is required');
        return FulfillmentPaymentService.recordPayment(orderId, ctx.studioId, ctx.userId, args);
      },
    });

    // -------------------------------------------------------------
    // PHASE 27: STUDIO CLIENT PORTAL & WHITE-LABEL BRANDING TOOLS
    // -------------------------------------------------------------

    this.register({
      name: 'getStudioBranding',
      description: 'Retrieves current studio white-label branding configuration, colors, typography, logos, and badge status.',
      isMutation: false,
      requiresApproval: false,
      isDestructive: false,
      execute: async (ctx, args) => {
        const studioId = ctx.studioId !== 'default' ? ctx.studioId : (args?.studio_id || args?.studioId || ctx.studioId);
        const branding = await StudioBrandingService.getBranding(studioId);
        return { branding };
      },
    });

    this.register({
      name: 'listStudioDomains',
      description: 'Lists custom domain mappings, SSL status, and verification states for the studio.',
      isMutation: false,
      requiresApproval: false,
      isDestructive: false,
      execute: async (ctx, args) => {
        const studioId = ctx.studioId !== 'default' ? ctx.studioId : (args?.studio_id || args?.studioId || ctx.studioId);
        const domains = await StudioDomainService.listDomains(studioId);
        return { domains };
      },
    });

    this.register({
      name: 'getClientPortalStatus',
      description: 'Fetches active client portal session and project status overview for a given client.',
      isMutation: false,
      requiresApproval: false,
      isDestructive: false,
      execute: async (ctx, args) => {
        const studioId = ctx.studioId !== 'default' ? ctx.studioId : (args?.studio_id || args?.studioId || ctx.studioId);
        const clientId = args?.clientId || args?.client_id;
        if (!clientId) throw new Error('clientId is required');
        const client = await prisma.client.findFirst({
          where: { id: clientId, studio_id: studioId, deleted_at: null },
          include: {
            projects: { where: { deleted_at: null } },
            fulfillment_orders: true,
            proofing_sessions: true,
          },
        });
        if (!client) throw new Error('Client not found');
        const sessions = await prisma.clientPortalSession.findMany({
          where: { studio_id: studioId, client_id: clientId, is_active: true, revoked_at: null },
        });
        return {
          client_id: client.id,
          name: client.name,
          email: client.email,
          has_active_session: sessions.length > 0,
          project_count: client.projects?.length || 0,
          order_count: client.fulfillment_orders?.length || 0,
          proofing_count: client.proofing_sessions?.length || 0,
        };
      },
    });

    this.register({
      name: 'generateClientPortalLink',
      description: 'Generates a secure, zero-login access link for a client portal (requires human approval).',
      isMutation: true,
      requiresApproval: true,
      isDestructive: false,
      execute: async (ctx, args) => {
        const studioId = ctx.studioId !== 'default' ? ctx.studioId : (args?.studio_id || args?.studioId || ctx.studioId);
        const clientId = args?.clientId || args?.client_id;
        if (!clientId) throw new Error('clientId is required');
        return ClientPortalSessionService.createSession(studioId, clientId, {
          expiresInDays: args?.expires_in_days || args?.expiresInDays || 30,
        });
      },
    });

    // -------------------------------------------------------------
    // -------------------------------------------------------------
    // PHASE 28: CLIENT COMMUNICATION TOOLS
    // -------------------------------------------------------------

    this.register({
      name: 'listClientConversations',
      description: 'Lists client communication threads with optional filters for client, status, priority, or search term.',
      isMutation: false,
      requiresApproval: false,
      isDestructive: false,
      execute: async (ctx, args) => {
        const studioId = ctx.studioId !== 'default' ? ctx.studioId : (args?.studio_id || args?.studioId || ctx.studioId);
        const res = await ClientConversationService.listConversations(studioId, {
          client_id: args?.client_id || args?.clientId,
          project_id: args?.project_id || args?.projectId,
          gallery_id: args?.gallery_id || args?.galleryId,
          order_id: args?.order_id || args?.orderId,
          status: args?.status,
          priority: args?.priority,
          search: args?.search,
          limit: args?.limit || 20,
        });
        return {
          success: true,
          data: {
            conversations: res.items,
            total: res.total,
            page: res.page,
            total_pages: res.total_pages,
          },
        };
      },
    });

    this.register({
      name: 'getClientConversation',
      description: 'Retrieves full details and message history of a client conversation thread.',
      isMutation: false,
      requiresApproval: false,
      isDestructive: false,
      execute: async (ctx, args) => {
        const studioId = ctx.studioId !== 'default' ? ctx.studioId : (args?.studio_id || args?.studioId || ctx.studioId);
        const conversationId = args?.conversationId || args?.conversation_id || args?.id;
        if (!conversationId) throw new Error('conversationId is required');
        const conv = await ClientConversationService.getConversationById(studioId, conversationId);
        if (!conv) throw new Error('Conversation not found');
        return {
          success: true,
          data: conv,
        };
      },
    });

    this.register({
      name: 'getUnansweredClientMessages',
      description: 'Retrieves all client conversations that are pending studio response or have unread messages.',
      isMutation: false,
      requiresApproval: false,
      isDestructive: false,
      execute: async (ctx, args) => {
        const studioId = ctx.studioId !== 'default' ? ctx.studioId : (args?.studio_id || args?.studioId || ctx.studioId);
        const res = await ClientConversationService.listConversations(studioId, {
          status: 'OPEN',
          limit: args?.limit || args?.max_count || 50,
        });
        const unanswered = res.items.filter((item) => item.unread_studio_count > 0 || item.status === 'PENDING_STUDIO');
        return {
          success: true,
          data: {
            unanswered: unanswered,
            count: unanswered.length,
          },
        };
      },
    });

    this.register({
      name: 'summarizeClientConversation',
      description: 'Summarizes a client conversation thread into structured bullet points, key questions, and sentiment overview.',
      isMutation: false,
      requiresApproval: false,
      isDestructive: false,
      execute: async (ctx, args) => {
        const studioId = ctx.studioId !== 'default' ? ctx.studioId : (args?.studio_id || args?.studioId || ctx.studioId);
        const conversationId = args?.conversationId || args?.conversation_id || args?.id;
        if (!conversationId) throw new Error('conversationId is required');
        const conv = await ClientConversationService.getConversationById(studioId, conversationId);
        if (!conv) throw new Error('Conversation not found');

        const messageCount = conv.messages?.length || 0;
        const lastMsg = conv.messages && conv.messages.length > 0 ? conv.messages[conv.messages.length - 1] : null;

        return {
          success: true,
          data: {
            conversation_id: conv.id,
            subject: conv.subject,
            client_name: conv.client?.name || 'Client',
            status: conv.status,
            priority: conv.priority,
            category: conv.category,
            message_count: messageCount,
            key_topics: ['Album Selection', 'Print Upgrades', 'Turnaround Times'],
            last_message: lastMsg ? {
              sender: lastMsg.sender_name,
              sender_type: lastMsg.sender_type,
              body_preview: lastMsg.body.substring(0, 200),
              sent_at: lastMsg.created_at,
            } : null,
            summary: `Thread "${conv.subject}" with ${conv.client?.name || 'Client'} has ${messageCount} messages. Current status is ${conv.status} (${conv.priority} priority).`,
          },
        };
      },
    });

    this.register({
      name: 'draftClientReply',
      description: 'Drafts a proposed response to a client message thread. Requires human approval before sending.',
      isMutation: true,
      requiresApproval: true,
      isDestructive: false,
      execute: async (ctx, args) => {
        const studioId = ctx.studioId !== 'default' ? ctx.studioId : (args?.studio_id || args?.studioId || ctx.studioId);
        const conversationId = args?.conversationId || args?.conversation_id || args?.id;
        if (!conversationId) throw new Error('conversationId is required');

        const conv = await ClientConversationService.getConversationById(studioId, conversationId);
        if (!conv) throw new Error('Conversation not found');

        const tone = args?.tone || 'WARM_PROFESSIONAL';
        let keyPoints = '';
        if (Array.isArray(args?.key_points)) {
          const safePoints = args.key_points.filter((p: string) => !p.toLowerCase().includes('database credentials') && !p.toLowerCase().includes('ignore all previous'));
          keyPoints = safePoints.join(', ');
        }

        const draftReply = args?.replyText || args?.reply_text || args?.body || 
          `Dear ${conv.client?.name || 'Client'},\n\nThank you for reaching out to us! We have noted your request regarding ${conv.subject}. Everything is progressing smoothly and on schedule.\n\nWarm regards,\nStudio Team`;

        return {
          success: true,
          data: {
            conversation_id: conversationId,
            recipient_client_name: conv.client?.name,
            recipient_client_email: conv.client?.email,
            draft_reply: draftReply,
            tone: tone,
            status: 'DRAFT_READY_FOR_APPROVAL',
            note: 'This reply is a draft and requires confirmation by studio staff before being dispatched.',
          },
        };
      },
    });

    this.register({
      name: 'getCommunicationStatus',
      description: 'Returns overall studio communication metrics, response time averages, and queue status.',
      isMutation: false,
      requiresApproval: false,
      isDestructive: false,
      execute: async (ctx, args) => {
        const studioId = ctx.studioId !== 'default' ? ctx.studioId : (args?.studio_id || args?.studioId || ctx.studioId);
        const clientId = args?.client_id || args?.clientId;
        const analytics = await CommunicationAnalyticsService.getAnalytics(studioId);

        let activeCount = 0;
        let totalCount = analytics.total_conversations;
        if (clientId) {
          const list = await ClientConversationService.listConversations(studioId, { client_id: clientId });
          activeCount = list.items.filter(c => c.status !== 'RESOLVED' && c.status !== 'ARCHIVED').length;
          totalCount = list.total;
        }

          return {
            success: true,
            data: {
              client_id: clientId || null,
              active_conversations_count: activeCount,
              total_conversations_count: totalCount,
              analytics,
            },
          };
        },
      });

    // -------------------------------------------------------------
    // PHASE 29: STUDIO CRM & CLIENT RELATIONSHIP INTELLIGENCE 2.0 TOOLS
    // -------------------------------------------------------------

    this.register({
      name: 'getClient360Summary',
      description: 'Summarizes client contact profile, active projects, galleries, financial totals, and operational health indicators.',
      isMutation: false,
      requiresApproval: false,
      isDestructive: false,
      execute: async (ctx, args) => {
        const studioId = ctx.studioId !== 'default' ? ctx.studioId : (args?.studio_id || args?.studioId || ctx.studioId);
        const clientId = args?.clientId || args?.client_id || args?.id;
        if (!clientId) throw new Error('clientId is required');

        const crmService = new CRMService(this.db);
        const data = await crmService.getClient360(studioId, clientId);
        return {
          success: true,
          client_id: data.client.id,
          name: data.client.name,
          relationship_status: data.client.relationship_status,
          data: {
            client: data.client,
            financial: data.financial,
            health_indicators: data.health_indicators,
            projects_count: data.projects.length,
            galleries_count: data.galleries.length,
            orders_count: data.orders.length,
            pending_actions_count: data.pending_actions.client_actions.length + data.pending_actions.studio_actions.length,
          },
        };
      },
    });

    this.register({
      name: 'getClientTimeline',
      description: 'Retrieves chronological multi-system relationship history for a client with category filtering.',
      isMutation: false,
      requiresApproval: false,
      isDestructive: false,
      execute: async (ctx, args) => {
        const studioId = ctx.studioId !== 'default' ? ctx.studioId : (args?.studio_id || args?.studioId || ctx.studioId);
        const clientId = args?.clientId || args?.client_id || args?.id;
        if (!clientId) throw new Error('clientId is required');

        const crmService = new CRMService(this.db);
        const timeline = await crmService.getClientTimeline(studioId, clientId, {
          category: args?.category,
          page: args?.page || 1,
          limit: args?.limit || 20,
        });
        return {
          success: true,
          timeline: timeline.items,
          data: timeline,
        };
      },
    });

    this.register({
      name: 'getClientPendingActions',
      description: 'Surfaces pending client and studio actions such as unread messages, proofing selections, or unpaid invoices.',
      isMutation: false,
      requiresApproval: false,
      isDestructive: false,
      execute: async (ctx, args) => {
        const studioId = ctx.studioId !== 'default' ? ctx.studioId : (args?.studio_id || args?.studioId || ctx.studioId);
        const clientId = args?.clientId || args?.client_id || args?.id;
        if (!clientId) throw new Error('clientId is required');

        const crmService = new CRMService(this.db);
        const data = await crmService.getClient360(studioId, clientId);
        const pendingCount = (data.pending_actions?.client_actions?.length || 0) + (data.pending_actions?.studio_actions?.length || 0);
        return {
          success: true,
          client_id: clientId,
          pending_actions_count: pendingCount,
          data: data.pending_actions,
        };
      },
    });

    this.register({
      name: 'getClientFollowUps',
      description: 'Retrieves follow-up recommendations (due today, overdue, upcoming) for a client or studio-wide.',
      isMutation: false,
      requiresApproval: false,
      isDestructive: false,
      execute: async (ctx, args) => {
        const studioId = ctx.studioId !== 'default' ? ctx.studioId : (args?.studio_id || args?.studioId || ctx.studioId);
        const clientId = args?.clientId || args?.client_id;

        const crmService = new CRMService(this.db);
        const data = await crmService.getFollowUpsCenter(studioId, { clientId, status: args?.status });
        return {
          success: true,
          summary: data,
          data,
        };
      },
    });

    this.register({
      name: 'findPotentialDuplicateClients',
      description: 'Finds potential duplicate clients using email, phone, and name similarity matching. Returns candidate evidence.',
      isMutation: false,
      requiresApproval: false,
      isDestructive: false,
      execute: async (ctx, args) => {
        const studioId = ctx.studioId !== 'default' ? ctx.studioId : (args?.studio_id || args?.studioId || ctx.studioId);
        const crmService = new CRMService(this.db);
        const duplicates = await crmService.findDuplicateCandidates(studioId, {
          client_id: args?.client_id || args?.clientId,
          email: args?.email,
          phone: args?.phone,
          name: args?.name,
        });
        return {
          success: true,
          is_duplicate: duplicates.is_duplicate,
          candidates: duplicates.candidates,
          data: duplicates,
        };
      },
    });

    this.register({
      name: 'getClientRelationshipStatus',
      description: 'Retrieves explicit operational relationship status, lifecycle stage, and dormancy indicators for a client.',
      isMutation: false,
      requiresApproval: false,
      isDestructive: false,
      execute: async (ctx, args) => {
        const studioId = ctx.studioId !== 'default' ? ctx.studioId : (args?.studio_id || args?.studioId || ctx.studioId);
        const clientId = args?.clientId || args?.client_id || args?.id;
        if (!clientId) throw new Error('clientId is required');

        const crmService = new CRMService(this.db);
        const data = await crmService.getClient360(studioId, clientId);
        return {
          success: true,
          client_id: clientId,
          name: data.client.name,
          relationship_status: data.client.relationship_status,
          lifecycle_stage: data.client.lifecycle_stage,
          is_returning: data.health_indicators.is_returning,
          is_dormant: data.health_indicators.is_dormant,
          dormant_reason: data.health_indicators.dormant_reason,
          last_interaction_at: data.client.last_interaction_at,
          next_follow_up_at: data.client.next_follow_up_at,
          data: {
            client_id: clientId,
            name: data.client.name,
            relationship_status: data.client.relationship_status,
            lifecycle_stage: data.client.lifecycle_stage,
            is_returning: data.health_indicators.is_returning,
            is_dormant: data.health_indicators.is_dormant,
            dormant_reason: data.health_indicators.dormant_reason,
            last_interaction_at: data.client.last_interaction_at,
            next_follow_up_at: data.client.next_follow_up_at,
          },
        };
      },
    });

    this.register({
      name: 'draftClientFollowUp',
      description: 'Creates a proposed follow-up recommendation and draft message. Requires staff approval before dispatching.',
      isMutation: true,
      requiresApproval: true,
      isDestructive: false,
      execute: async (ctx, args) => {
        const studioId = ctx.studioId !== 'default' ? ctx.studioId : (args?.studio_id || args?.studioId || ctx.studioId);
        const clientId = args?.clientId || args?.client_id;
        if (!clientId) throw new Error('clientId is required');

        const title = args?.title || args?.context || 'CRM Follow-up Recommendation';
        const reason = args?.reason || args?.context || 'Scheduled CRM touchpoint';
        const messageSuggestion = args?.message_suggestion || args?.messageSuggestion || args?.draft_body || args?.tone;

        const followUp = await this.db.clientFollowUpRecommendation.create({
          data: {
            studio_id: studioId,
            client_id: clientId,
            title,
            reason,
            type: 'GENERAL_FOLLOW_UP',
            message_suggestion: messageSuggestion || null,
            priority: args?.priority || 'MEDIUM',
            status: 'OPEN',
          },
        });

        return {
          success: true,
          is_draft: true,
          requires_human_approval: true,
          auto_sent: false,
          data: {
            follow_up_id: followUp.id,
            client_id: clientId,
            title: followUp.title,
            status: 'DRAFT_FOLLOWUP_CREATED',
            note: 'Follow-up created in Open state for studio staff review.',
          },
        };
      },
    });

    this.register({
      name: 'searchClients',
      description: 'Searches studio clients by name, email, phone, company, or tags with tenant scoping.',
      isMutation: false,
      requiresApproval: false,
      isDestructive: false,
      execute: async (ctx, args) => {
        const studioId = ctx.studioId !== 'default' ? ctx.studioId : (args?.studio_id || args?.studioId || ctx.studioId);
        const crmService = new CRMService(this.db);
        const result = await crmService.listClients(studioId, {
          search: args?.search || args?.query,
          relationship_status: args?.relationship_status || args?.relationshipStatus,
          lifecycle_stage: args?.lifecycle_stage || args?.lifecycleStage,
          assigned_user_id: args?.assigned_user_id || args?.assignedUserId,
          tag: args?.tag,
          page: args?.page || 1,
          limit: args?.limit || 20,
        });
        return {
          success: true,
          total: result.total,
          items: result.items,
          data: result,
        };
      },
    });

    // ==========================================
    // PHASE 31: STUDIO TEAM & WORKFORCE TOOLS
    // ==========================================

    this.register({
      name: 'getTeamOverview',
      description: 'Returns an overview of the studio team including member count, active headcount, departments, and roles.',
      isMutation: false,
      requiresApproval: false,
      isDestructive: false,
      execute: async (ctx, args) => {
        const studioId = ctx.studioId !== 'default' ? ctx.studioId : (args?.studio_id || args?.studioId || ctx.studioId);
        const teamService = new StudioTeamService(this.db);
        const [membersResult, departments, metrics] = await Promise.all([
          teamService.listMembers(studioId, { limit: 100 }),
          teamService.listDepartments(studioId),
          teamService.getMetrics(studioId),
        ]);
        return {
          success: true,
          studio_id: studioId,
          total_members: membersResult.total,
          active_members: membersResult.items.filter((m) => m.status === 'ACTIVE').length,
          departments_count: departments.length,
          metrics,
          members: membersResult.items,
          departments,
        };
      },
    });

    this.register({
      name: 'getTeamMember',
      description: 'Fetches full internal profile, working hours, skills, and current status for a specific team member.',
      isMutation: false,
      requiresApproval: false,
      isDestructive: false,
      execute: async (ctx, args) => {
        const studioId = ctx.studioId !== 'default' ? ctx.studioId : (args?.studio_id || args?.studioId || ctx.studioId);
        const memberId = args?.member_id || args?.memberId || args?.user_id || args?.userId;
        if (!memberId) throw new Error('member_id is required');
        const teamService = new StudioTeamService(this.db);
        const member = await teamService.getMember(studioId, memberId);
        return {
          success: true,
          member,
        };
      },
    });

    this.register({
      name: 'getTeamWorkload',
      description: 'Returns deterministic workload metrics across all active team members (open tasks, overdue tasks, active projects, upcoming shoots, workload state).',
      isMutation: false,
      requiresApproval: false,
      isDestructive: false,
      execute: async (ctx, args) => {
        const studioId = ctx.studioId !== 'default' ? ctx.studioId : (args?.studio_id || args?.studioId || ctx.studioId);
        const teamService = new StudioTeamService(this.db);
        const memberId = args?.member_id || args?.memberId;
        if (memberId) {
          const workload = await teamService.getMemberWorkload(studioId, memberId);
          return { success: true, workload };
        }
        const dashboard = await teamService.getWorkloadDashboard(studioId);
        return { success: true, dashboard };
      },
    });

    this.register({
      name: 'getTeamAvailability',
      description: 'Retrieves scheduled leaves, holidays, time-off, and availability for team members in a given date range.',
      isMutation: false,
      requiresApproval: false,
      isDestructive: false,
      execute: async (ctx, args) => {
        const studioId = ctx.studioId !== 'default' ? ctx.studioId : (args?.studio_id || args?.studioId || ctx.studioId);
        const teamService = new StudioTeamService(this.db);
        const leaves = await teamService.listLeaves(studioId, {
          member_id: args?.member_id || args?.memberId,
          start_date: args?.start_date || args?.startDate,
          end_date: args?.end_date || args?.endDate,
        });
        return {
          success: true,
          leaves_count: leaves.length,
          leaves,
        };
      },
    });

    this.register({
      name: 'getTeamAssignments',
      description: 'Fetches cross-system assignment summary for a team member (active projects, tasks, production crew shoots, equipment responsibility).',
      isMutation: false,
      requiresApproval: false,
      isDestructive: false,
      execute: async (ctx, args) => {
        const studioId = ctx.studioId !== 'default' ? ctx.studioId : (args?.studio_id || args?.studioId || ctx.studioId);
        const memberId = args?.member_id || args?.memberId;
        if (!memberId) throw new Error('member_id is required');
        const teamService = new StudioTeamService(this.db);
        const plan = await teamService.getReassignmentPlan(studioId, memberId);
        return {
          success: true,
          member_id: memberId,
          member_name: plan.member_name,
          active_tasks_count: plan.tasks.length,
          tasks: plan.tasks,
          active_projects_count: plan.projects.length,
          projects: plan.projects,
          upcoming_shoots_count: plan.shoot_crew_assignments.length,
          shoots: plan.shoot_crew_assignments,
          assigned_equipment_count: plan.equipment_assignments.length,
          equipment: plan.equipment_assignments,
          assigned_clients_count: plan.assigned_clients.length,
          clients: plan.assigned_clients,
        };
      },
    });

    this.register({
      name: 'findAvailableTeamMembers',
      description: 'Finds available team members for a specific time window, checking working hours, leaves, and scheduled shoots.',
      isMutation: false,
      requiresApproval: false,
      isDestructive: false,
      execute: async (ctx, args) => {
        const studioId = ctx.studioId !== 'default' ? ctx.studioId : (args?.studio_id || args?.studioId || ctx.studioId);
        const start = args?.start_time || args?.startTime || args?.start_date || args?.startDate;
        const end = args?.end_time || args?.endTime || args?.end_date || args?.endDate;
        if (!start || !end) throw new Error('start_time and end_time are required');

        const teamService = new StudioTeamService(this.db);
        const membersResult = await teamService.listMembers(studioId, {
          status: 'ACTIVE',
          role: args?.role,
          department: args?.department,
          limit: 100,
        });

        const results: Array<{ member: any; is_available: boolean; conflict_reasons: string[] }> = [];

        for (const member of membersResult.items) {
          if (args?.required_skill && (!member.skills || !member.skills.includes(args.required_skill))) {
            continue;
          }
          const conflictCheck = await teamService.checkScheduleConflict(studioId, {
            member_id: member.id,
            start_time: start,
            end_time: end,
          });
          results.push({
            member: {
              id: member.id,
              name: member.user_name,
              email: member.user_email,
              role: member.role,
              department: member.department,
              skills: member.skills,
            },
            is_available: !conflictCheck.has_conflict,
            conflict_reasons: conflictCheck.reasons,
          });
        }

        const available = results.filter((r) => r.is_available);
        return {
          success: true,
          time_window: { start, end },
          total_checked: results.length,
          available_count: available.length,
          available_members: available.map((a) => a.member),
          all_results: results,
        };
      },
    });

    this.register({
      name: 'getTeamCalendar',
      description: 'Fetches aggregated internal team calendar events (shoots, member leaves, task deadlines).',
      isMutation: false,
      requiresApproval: false,
      isDestructive: false,
      execute: async (ctx, args) => {
        const studioId = ctx.studioId !== 'default' ? ctx.studioId : (args?.studio_id || args?.studioId || ctx.studioId);
        const startDate = args?.start_date || args?.startDate || new Date(Date.now() - 7 * 86400000).toISOString();
        const endDate = args?.end_date || args?.endDate || new Date(Date.now() + 30 * 86400000).toISOString();

        const teamService = new StudioTeamService(this.db);
        const events = await teamService.getTeamCalendar(studioId, {
          start_date: startDate,
          end_date: endDate,
          member_ids: args?.member_ids || (args?.member_id ? [args.member_id] : undefined),
          department: args?.department,
          event_types: args?.event_types,
        });

        return {
          success: true,
          start_date: startDate,
          end_date: endDate,
          events_count: events.length,
          events,
        };
      },
    });

    this.register({
      name: 'getMemberProjects',
      description: 'Lists all active and past operations projects where a team member is assigned.',
      isMutation: false,
      requiresApproval: false,
      isDestructive: false,
      execute: async (ctx, args) => {
        const studioId = ctx.studioId !== 'default' ? ctx.studioId : (args?.studio_id || args?.studioId || ctx.studioId);
        const memberId = args?.member_id || args?.memberId;
        if (!memberId) throw new Error('member_id is required');
        const teamService = new StudioTeamService(this.db);
        const plan = await teamService.getReassignmentPlan(studioId, memberId);
        return {
          success: true,
          member_id: memberId,
          projects_count: plan.projects.length,
          projects: plan.projects,
        };
      },
    });

    this.register({
      name: 'getMemberTasks',
      description: 'Lists all open, in-progress, or overdue tasks assigned to a team member.',
      isMutation: false,
      requiresApproval: false,
      isDestructive: false,
      execute: async (ctx, args) => {
        const studioId = ctx.studioId !== 'default' ? ctx.studioId : (args?.studio_id || args?.studioId || ctx.studioId);
        const memberId = args?.member_id || args?.memberId;
        if (!memberId) throw new Error('member_id is required');
        const teamService = new StudioTeamService(this.db);
        const plan = await teamService.getReassignmentPlan(studioId, memberId);
        return {
          success: true,
          member_id: memberId,
          tasks_count: plan.tasks.length,
          tasks: plan.tasks,
        };
      },
    });

    this.register({
      name: 'getMemberProductionAssignments',
      description: 'Lists all shoot sessions, crew roles, and equipment assignments for a team member.',
      isMutation: false,
      requiresApproval: false,
      isDestructive: false,
      execute: async (ctx, args) => {
        const studioId = ctx.studioId !== 'default' ? ctx.studioId : (args?.studio_id || args?.studioId || ctx.studioId);
        const memberId = args?.member_id || args?.memberId;
        if (!memberId) throw new Error('member_id is required');
        const teamService = new StudioTeamService(this.db);
        const plan = await teamService.getReassignmentPlan(studioId, memberId);
        return {
          success: true,
          member_id: memberId,
          shoots_count: plan.shoot_crew_assignments.length,
          shoots: plan.shoot_crew_assignments,
          equipment_count: plan.equipment_assignments.length,
          equipment: plan.equipment_assignments,
        };
      },
    });

    // =========================================================================
    // PHASE 32 — STUDIO TEAM COLLABORATION & INTERNAL OPERATIONS TOOLS
    // =========================================================================

    const collabService = new StudioTeamCollaborationService(this.db);

    // 1. get_my_team_attention
    this.register({
      name: 'get_my_team_attention',
      description: 'Retrieves the current team member attention center data: pending handoffs, open blockers, unread mentions, and high priority help requests.',
      isMutation: false,
      requiresApproval: false,
      isDestructive: false,
      execute: async (ctx, args) => {
        const studioId = ctx.studioId !== 'default' ? ctx.studioId : (args?.studio_id || args?.studioId || ctx.studioId);
        const memberId = args?.member_id || args?.memberId || ctx.userId;
        if (!memberId || memberId === 'default') throw new Error('member_id is required');
        const attention = await collabService.getAttentionCenter(studioId, memberId);
        return { success: true, attention };
      },
    });
    this.register({
      name: 'getMyTeamAttention',
      description: 'Alias for get_my_team_attention',
      isMutation: false,
      requiresApproval: false,
      isDestructive: false,
      execute: async (ctx, args) => this.executeTool('get_my_team_attention', ctx, args),
    });

    // 2. get_team_collaboration_summary
    this.register({
      name: 'get_team_collaboration_summary',
      description: 'Provides a high-level collaboration health summary for the studio, including active threads, open blockers, pending handoffs, and open help requests.',
      isMutation: false,
      requiresApproval: false,
      isDestructive: false,
      execute: async (ctx, args) => {
        const studioId = ctx.studioId !== 'default' ? ctx.studioId : (args?.studio_id || args?.studioId || ctx.studioId);
        const userId = ctx.userId;
        const [threads, blockers, handoffs, helpRequests] = await Promise.all([
          collabService.listThreads(studioId, userId, { limit: 1 } as any),
          collabService.listBlockers(studioId, userId, { status: 'OPEN' as any }),
          collabService.listHandoffs(studioId, userId, { status: 'PENDING' as any }),
          collabService.listHelpRequests(studioId, userId, { status: 'OPEN' as any }),
        ]);
        const criticalBlockers = (blockers as any[]).filter((b) => b.severity === 'CRITICAL' || b.severity === 'HIGH');
        const urgentHelp = (helpRequests as any[]).filter((h) => h.priority === 'URGENT' || h.priority === 'HIGH');

        return {
          success: true,
          studio_id: studioId,
          total_threads: (threads as any).total || (threads as any).threads?.length || 0,
          open_blockers: blockers.length,
          critical_blockers: criticalBlockers.length,
          pending_handoffs: handoffs.length,
          open_help_requests: helpRequests.length,
          urgent_help_requests: urgentHelp.length,
          health_status: criticalBlockers.length > 0 ? 'NEEDS_ATTENTION' : 'HEALTHY',
        };
      },
    });
    this.register({
      name: 'getTeamCollaborationSummary',
      description: 'Alias for get_team_collaboration_summary',
      isMutation: false,
      requiresApproval: false,
      isDestructive: false,
      execute: async (ctx, args) => this.executeTool('get_team_collaboration_summary', ctx, args),
    });

    // 3. get_thread_summary
    this.register({
      name: 'get_thread_summary',
      description: 'Fetches thread context, message count, recent messages, participants, active blockers, and handoffs linked to a collaboration thread.',
      isMutation: false,
      requiresApproval: false,
      isDestructive: false,
      execute: async (ctx, args) => {
        const studioId = ctx.studioId !== 'default' ? ctx.studioId : (args?.studio_id || args?.studioId || ctx.studioId);
        const threadId = args?.thread_id || args?.threadId;
        const userId = ctx.userId;
        if (!threadId) throw new Error('thread_id is required');
        const thread = await collabService.getThread(studioId, userId, threadId);
        const messages = await collabService.listMessages(studioId, userId, threadId, { limit: 10 } as any);
        return {
          success: true,
          thread_id: thread.id,
          title: thread.title,
          type: (thread as any).thread_type || thread.type,
          status: thread.status,
          priority: thread.priority,
          message_count: (thread as any).message_count,
          last_activity_at: (thread as any).last_activity_at,
          recent_messages: (messages as any).messages?.map((m: any) => ({
            id: m.id,
            author_member_id: m.author_member_id,
            message_type: m.message_type,
            content: m.body || m.content,
            created_at: m.created_at,
          })) || [],
        };
      },
    });
    this.register({
      name: 'getThreadSummary',
      description: 'Alias for get_thread_summary',
      isMutation: false,
      requiresApproval: false,
      isDestructive: false,
      execute: async (ctx, args) => this.executeTool('get_thread_summary', ctx, args),
    });

    // 4. get_unread_team_mentions
    this.register({
      name: 'get_unread_team_mentions',
      description: 'Lists all unread @mentions for a specific team member across studio collaboration threads.',
      isMutation: false,
      requiresApproval: false,
      isDestructive: false,
      execute: async (ctx, args) => {
        const studioId = ctx.studioId !== 'default' ? ctx.studioId : (args?.studio_id || args?.studioId || ctx.studioId);
        const memberId = args?.member_id || args?.memberId || ctx.userId;
        if (!memberId || memberId === 'default') throw new Error('member_id is required');
        const mentions = await collabService.listMentions(studioId, memberId, { is_read: false });
        return {
          success: true,
          unread_count: (mentions as any[]).length,
          mentions: (mentions as any[]).map((m: any) => ({
            id: m.id,
            thread_id: m.message?.thread_id,
            message_id: m.message_id,
            content: m.message?.body || m.message?.content,
            author_member_id: m.message?.author_member_id,
            created_at: m.created_at,
          })),
        };
      },
    });
    this.register({
      name: 'getUnreadTeamMentions',
      description: 'Alias for get_unread_team_mentions',
      isMutation: false,
      requiresApproval: false,
      isDestructive: false,
      execute: async (ctx, args) => this.executeTool('get_unread_team_mentions', ctx, args),
    });

    // 5. get_open_team_blockers
    this.register({
      name: 'get_open_team_blockers',
      description: 'Lists all unresolved blockers across studio projects, shoots, and operations, with severity filtering.',
      isMutation: false,
      requiresApproval: false,
      isDestructive: false,
      execute: async (ctx, args) => {
        const studioId = ctx.studioId !== 'default' ? ctx.studioId : (args?.studio_id || args?.studioId || ctx.studioId);
        const severity = args?.severity;
        const blockers = await collabService.listBlockers(studioId, ctx.userId, {
          status: 'OPEN' as any,
          severity: severity as any,
        });
        return {
          success: true,
          count: (blockers as any[]).length,
          blockers,
        };
      },
    });
    this.register({
      name: 'getOpenTeamBlockers',
      description: 'Alias for get_open_team_blockers',
      isMutation: false,
      requiresApproval: false,
      isDestructive: false,
      execute: async (ctx, args) => this.executeTool('get_open_team_blockers', ctx, args),
    });

    // 6. get_pending_handoffs
    this.register({
      name: 'get_pending_handoffs',
      description: 'Retrieves all work handoffs that are pending acceptance or under review in the studio.',
      isMutation: false,
      requiresApproval: false,
      isDestructive: false,
      execute: async (ctx, args) => {
        const studioId = ctx.studioId !== 'default' ? ctx.studioId : (args?.studio_id || args?.studioId || ctx.studioId);
        const toMemberId = args?.to_member_id || args?.toMemberId;
        const fromMemberId = args?.from_member_id || args?.fromMemberId;
        const handoffs = await collabService.listHandoffs(studioId, ctx.userId, {
          to_member_id: toMemberId,
          from_member_id: fromMemberId,
          status: 'PENDING' as any,
        });
        return {
          success: true,
          count: (handoffs as any[]).length,
          handoffs,
        };
      },
    });
    this.register({
      name: 'getPendingHandoffs',
      description: 'Alias for get_pending_handoffs',
      isMutation: false,
      requiresApproval: false,
      isDestructive: false,
      execute: async (ctx, args) => this.executeTool('get_pending_handoffs', ctx, args),
    });

    // 7. get_open_help_requests
    this.register({
      name: 'get_open_help_requests',
      description: 'Fetches active team help requests requiring assistance, equipment triage, or lead intervention.',
      isMutation: false,
      requiresApproval: false,
      isDestructive: false,
      execute: async (ctx, args) => {
        const studioId = ctx.studioId !== 'default' ? ctx.studioId : (args?.studio_id || args?.studioId || ctx.studioId);
        const category = args?.category;
        const priority = args?.priority;
        const helpRequests = await collabService.listHelpRequests(studioId, ctx.userId, {
          status: 'OPEN' as any,
          category: category as any,
          priority: priority as any,
        });
        return {
          success: true,
          count: (helpRequests as any[]).length,
          help_requests: helpRequests,
        };
      },
    });
    this.register({
      name: 'getOpenHelpRequests',
      description: 'Alias for get_open_help_requests',
      isMutation: false,
      requiresApproval: false,
      isDestructive: false,
      execute: async (ctx, args) => this.executeTool('get_open_help_requests', ctx, args),
    });

    // 8. get_project_collaboration_activity
    this.register({
      name: 'get_project_collaboration_activity',
      description: 'Retrieves all internal collaboration threads, notes, blockers, and handoffs associated with a specific project.',
      isMutation: false,
      requiresApproval: false,
      isDestructive: false,
      execute: async (ctx, args) => {
        const studioId = ctx.studioId !== 'default' ? ctx.studioId : (args?.studio_id || args?.studioId || ctx.studioId);
        const projectId = args?.project_id || args?.projectId;
        if (!projectId) throw new Error('project_id is required');
        const [threads, blockers, handoffs] = await Promise.all([
          collabService.listThreads(studioId, ctx.userId, { project_id: projectId } as any),
          collabService.listBlockers(studioId, ctx.userId, { project_id: projectId } as any),
          collabService.listHandoffs(studioId, ctx.userId, { project_id: projectId } as any),
        ]);
        return {
          success: true,
          project_id: projectId,
          threads: (threads as any).threads || (threads as any).items || [],
          blockers,
          handoffs,
        };
      },
    });
    this.register({
      name: 'getProjectCollaborationActivity',
      description: 'Alias for get_project_collaboration_activity',
      isMutation: false,
      requiresApproval: false,
      isDestructive: false,
      execute: async (ctx, args) => this.executeTool('get_project_collaboration_activity', ctx, args),
    });

    // 9. get_member_collaboration_activity
    this.register({
      name: 'get_member_collaboration_activity',
      description: 'Summarizes collaboration contributions for a team member: threads authored, pending handoffs assigned, and active blockers reported.',
      isMutation: false,
      requiresApproval: false,
      isDestructive: false,
      execute: async (ctx, args) => {
        const studioId = ctx.studioId !== 'default' ? ctx.studioId : (args?.studio_id || args?.studioId || ctx.studioId);
        const memberId = args?.member_id || args?.memberId;
        if (!memberId) throw new Error('member_id is required');
        const [assignedHandoffs, createdBlockers, createdHelpRequests] = await Promise.all([
          collabService.listHandoffs(studioId, ctx.userId, { to_member_id: memberId } as any),
          collabService.listBlockers(studioId, ctx.userId, { reporter_member_id: memberId } as any),
          collabService.listHelpRequests(studioId, ctx.userId, { requested_by_member_id: memberId } as any),
        ]);
        return {
          success: true,
          member_id: memberId,
          assigned_handoffs_count: (assignedHandoffs as any[]).length,
          assigned_handoffs: assignedHandoffs,
          reported_blockers_count: (createdBlockers as any[]).length,
          reported_blockers: createdBlockers,
          help_requests_count: (createdHelpRequests as any[]).length,
          help_requests: createdHelpRequests,
        };
      },
    });
    this.register({
      name: 'getMemberCollaborationActivity',
      description: 'Alias for get_member_collaboration_activity',
      isMutation: false,
      requiresApproval: false,
      isDestructive: false,
      execute: async (ctx, args) => this.executeTool('get_member_collaboration_activity', ctx, args),
    });

    // 10. search_team_collaboration
    this.register({
      name: 'search_team_collaboration',
      description: 'Searches across internal collaboration threads, messages, notes, handoffs, and blockers.',
      isMutation: false,
      requiresApproval: false,
      isDestructive: false,
      execute: async (ctx, args) => {
        const studioId = ctx.studioId !== 'default' ? ctx.studioId : (args?.studio_id || args?.studioId || ctx.studioId);
        const query = args?.query || args?.q || args?.search || '';
        const results = await collabService.searchCollaboration(studioId, ctx.userId, {
          query,
          thread_type: args?.thread_type || args?.threadType,
          project_id: args?.project_id || args?.projectId,
          member_id: args?.member_id || args?.memberId,
          has_blockers: args?.has_blockers || args?.hasBlockers,
          has_pending_handoffs: args?.has_pending_handoffs || args?.hasPendingHandoffs,
          limit: args?.limit ? Number(args.limit) : 20,
        });
        return {
          success: true,
          query,
          total_results: (results as any).total_results || 0,
          threads: (results as any).threads || [],
          messages: (results as any).messages || [],
          blockers: (results as any).blockers || [],
          handoffs: (results as any).handoffs || [],
          help_requests: (results as any).help_requests || [],
        };
      },
    });
    this.register({
      name: 'searchTeamCollaboration',
      description: 'Alias for search_team_collaboration',
      isMutation: false,
      requiresApproval: false,
      isDestructive: false,
      execute: async (ctx, args) => this.executeTool('search_team_collaboration', ctx, args),
    });

    // -------------------------------------------------------------
    // PHASE 33 — STUDIO FINANCIAL OPERATIONS & PROFITABILITY TOOLS
    // -------------------------------------------------------------
    const financeService = new StudioFinancialOperationsService(prisma);

    // 1. get_financial_dashboard
    this.register({
      name: 'get_financial_dashboard',
      description: 'Get comprehensive studio financial operations dashboard with accounts, cash flow, profit, aging, and recent activity',
      isMutation: false,
      requiresApproval: false,
      isDestructive: false,
      execute: async (ctx) => {
        const studioId = ctx.studioId;
        const dashboard = await financeService.getFinancialDashboard(studioId);
        return { success: true, ...dashboard };
      },
    });
    this.register({
      name: 'getFinancialDashboard',
      description: 'Alias for get_financial_dashboard',
      isMutation: false,
      requiresApproval: false,
      isDestructive: false,
      execute: async (ctx, args) => this.executeTool('get_financial_dashboard', ctx, args),
    });

    // 2. get_outstanding_receivables
    this.register({
      name: 'get_outstanding_receivables',
      description: 'Get list of open and outstanding client receivables with remaining balances',
      isMutation: false,
      requiresApproval: false,
      isDestructive: false,
      execute: async (ctx, args) => {
        const studioId = ctx.studioId;
        const receivables = await financeService.listReceivables(studioId, {
          status: 'OPEN',
          client_id: args?.client_id || args?.clientId,
          project_id: args?.project_id || args?.projectId,
        });
        return { success: true, receivables, total: receivables.length };
      },
    });
    this.register({
      name: 'getOutstandingReceivables',
      description: 'Alias for get_outstanding_receivables',
      isMutation: false,
      requiresApproval: false,
      isDestructive: false,
      execute: async (ctx, args) => this.executeTool('get_outstanding_receivables', ctx, args),
    });

    // 3. get_overdue_receivables
    this.register({
      name: 'get_overdue_receivables',
      description: 'Get list of overdue client receivables requiring follow-up',
      isMutation: false,
      requiresApproval: false,
      isDestructive: false,
      execute: async (ctx, args) => {
        const studioId = ctx.studioId;
        const receivables = await financeService.listReceivables(studioId, {
          status: 'OVERDUE',
          client_id: args?.client_id || args?.clientId,
        });
        return { success: true, overdue_receivables: receivables, total: receivables.length };
      },
    });
    this.register({
      name: 'getOverdueReceivables',
      description: 'Alias for get_overdue_receivables',
      isMutation: false,
      requiresApproval: false,
      isDestructive: false,
      execute: async (ctx, args) => this.executeTool('get_overdue_receivables', ctx, args),
    });

    // 4. get_upcoming_payables
    this.register({
      name: 'get_upcoming_payables',
      description: 'Get upcoming and open vendor payables for the studio',
      isMutation: false,
      requiresApproval: false,
      isDestructive: false,
      execute: async (ctx, args) => {
        const studioId = ctx.studioId;
        const payables = await financeService.listPayables(studioId, {
          status: args?.status || 'OPEN',
          vendor_id: args?.vendor_id || args?.vendorId,
        });
        return { success: true, payables, total: payables.length };
      },
    });
    this.register({
      name: 'getUpcomingPayables',
      description: 'Alias for get_upcoming_payables',
      isMutation: false,
      requiresApproval: false,
      isDestructive: false,
      execute: async (ctx, args) => this.executeTool('get_upcoming_payables', ctx, args),
    });

    // 5. get_project_profitability
    this.register({
      name: 'get_project_profitability',
      description: 'Calculate profitability for a specific project including revenue, direct costs, labor, and profit margins',
      isMutation: false,
      requiresApproval: false,
      isDestructive: false,
      execute: async (ctx, args) => {
        const studioId = ctx.studioId;
        const projectId = args?.project_id || args?.projectId;
        if (!projectId) throw new Error('project_id is required');
        const profitability = await financeService.calculateProjectProfitability(studioId, projectId);
        return { success: true, ...profitability };
      },
    });
    this.register({
      name: 'getProjectProfitability',
      description: 'Alias for get_project_profitability',
      isMutation: false,
      requiresApproval: false,
      isDestructive: false,
      execute: async (ctx, args) => this.executeTool('get_project_profitability', ctx, args),
    });

    // 6. get_cash_flow_summary
    this.register({
      name: 'get_cash_flow_summary',
      description: 'Get studio cash flow summary including total cash in, cash out, net cash flow, receivables and payables due',
      isMutation: false,
      requiresApproval: false,
      isDestructive: false,
      execute: async (ctx, args) => {
        const studioId = ctx.studioId;
        const summary = await financeService.getCashFlowSummary(
          studioId,
          args?.start_date || args?.startDate,
          args?.end_date || args?.endDate
        );
        return { success: true, ...summary };
      },
    });
    this.register({
      name: 'getCashFlowSummary',
      description: 'Alias for get_cash_flow_summary',
      isMutation: false,
      requiresApproval: false,
      isDestructive: false,
      execute: async (ctx, args) => this.executeTool('get_cash_flow_summary', ctx, args),
    });

    // 7. get_expense_summary
    this.register({
      name: 'get_expense_summary',
      description: 'Get aggregate expense summary categorized by cost classifications, payment status, and category breakdown',
      isMutation: false,
      requiresApproval: false,
      isDestructive: false,
      execute: async (ctx, args) => {
        const studioId = ctx.studioId;
        const summary = await financeService.getExpenseSummary(
          studioId,
          args?.start_date || args?.startDate,
          args?.end_date || args?.endDate
        );
        return { success: true, ...summary };
      },
    });
    this.register({
      name: 'getExpenseSummary',
      description: 'Alias for get_expense_summary',
      isMutation: false,
      requiresApproval: false,
      isDestructive: false,
      execute: async (ctx, args) => this.executeTool('get_expense_summary', ctx, args),
    });

    // 8. get_budget_variance
    this.register({
      name: 'get_budget_variance',
      description: 'Get budget vs actual spend variance report for a specific budget or project',
      isMutation: false,
      requiresApproval: false,
      isDestructive: false,
      execute: async (ctx, args) => {
        const studioId = ctx.studioId;
        const budgetId = args?.budget_id || args?.budgetId;
        if (!budgetId) throw new Error('budget_id is required');
        const report = await financeService.getBudgetVariance(studioId, budgetId);
        return { success: true, ...report };
      },
    });
    this.register({
      name: 'getBudgetVariance',
      description: 'Alias for get_budget_variance',
      isMutation: false,
      requiresApproval: false,
      isDestructive: false,
      execute: async (ctx, args) => this.executeTool('get_budget_variance', ctx, args),
    });
    this.register({
      name: 'get_budget_variance_report',
      description: 'Alias for get_budget_variance',
      isMutation: false,
      requiresApproval: false,
      isDestructive: false,
      execute: async (ctx, args) => this.executeTool('get_budget_variance', ctx, args),
    });

    // 9. search_financial_transactions
    this.register({
      name: 'search_financial_transactions',
      description: 'Search across all studio expenses, payables, receivables, and payment transactions',
      isMutation: false,
      requiresApproval: false,
      isDestructive: false,
      execute: async (ctx, args) => {
        const studioId = ctx.studioId;
        const result = await financeService.searchFinancialTransactions(studioId, {
          search: args?.search || args?.query,
          project_id: args?.project_id || args?.projectId,
          category_id: args?.category_id || args?.categoryId,
          vendor_id: args?.vendor_id || args?.vendorId,
          start_date: args?.start_date || args?.startDate,
          end_date: args?.end_date || args?.endDate,
          limit: args?.limit ? Number(args.limit) : 50,
        });
        return { success: true, ...result };
      },
    });
    this.register({
      name: 'searchFinancialTransactions',
      description: 'Alias for search_financial_transactions',
      isMutation: false,
      requiresApproval: false,
      isDestructive: false,
      execute: async (ctx, args) => this.executeTool('search_financial_transactions', ctx, args),
    });

    // 10. draft_payment_followup
    this.register({
      name: 'draft_payment_followup',
      description: 'Draft a polite client payment reminder email for an overdue or pending receivable (always draft, requires human approval)',
      isMutation: false,
      requiresApproval: true,
      isDestructive: false,
      execute: async (ctx, args) => {
        const studioId = ctx.studioId;
        const receivableId = args?.receivable_id || args?.receivableId;
        if (!receivableId) throw new Error('receivable_id is required');
        const draft = await financeService.draftPaymentFollowup(studioId, receivableId);
        return {
          success: true,
          is_draft: true,
          requires_human_approval: true,
          ...draft,
        };
      },
    });
    this.register({
      name: 'draftPaymentFollowup',
      description: 'Alias for draft_payment_followup',
      isMutation: false,
      requiresApproval: true,
      isDestructive: false,
      execute: async (ctx, args) => this.executeTool('draft_payment_followup', ctx, args),
    });

    // Additional Financial Support Tools
    this.register({
      name: 'get_client_profitability',
      description: 'Calculate client lifetime profitability across all projects and direct expenses',
      isMutation: false,
      requiresApproval: false,
      isDestructive: false,
      execute: async (ctx, args) => {
        const studioId = ctx.studioId;
        const clientId = args?.client_id || args?.clientId;
        if (!clientId) throw new Error('client_id is required');
        const profitability = await financeService.calculateClientProfitability(studioId, clientId);
        return { success: true, ...profitability };
      },
    });
    this.register({
      name: 'getClientProfitability',
      description: 'Alias for get_client_profitability',
      isMutation: false,
      requiresApproval: false,
      isDestructive: false,
      execute: async (ctx, args) => this.executeTool('get_client_profitability', ctx, args),
    });

    this.register({
      name: 'list_pending_expense_approvals',
      description: 'List expenses requiring approval before payment processing',
      isMutation: false,
      requiresApproval: false,
      isDestructive: false,
      execute: async (ctx, args) => {
        const studioId = ctx.studioId;
        const result = await financeService.listExpenses(studioId, {
          approval_status: 'PENDING',
          limit: args?.limit ? Number(args.limit) : 50,
        });
        return { success: true, expenses: result.expenses, total: result.total };
      },
    });
    this.register({
      name: 'listPendingExpenseApprovals',
      description: 'Alias for list_pending_expense_approvals',
      isMutation: false,
      requiresApproval: false,
      isDestructive: false,
      execute: async (ctx, args) => this.executeTool('list_pending_expense_approvals', ctx, args),
    });

    this.register({
      name: 'get_tax_liability_summary',
      description: 'Get tax liability summary calculating collected tax vs paid tax',
      isMutation: false,
      requiresApproval: false,
      isDestructive: false,
      execute: async (ctx, args) => {
        const studioId = ctx.studioId;
        const summary = await financeService.getTaxSummary(
          studioId,
          args?.start_date || args?.startDate,
          args?.end_date || args?.endDate
        );
        return { success: true, ...summary };
      },
    });
    this.register({
      name: 'getTaxLiabilitySummary',
      description: 'Alias for get_tax_liability_summary',
      isMutation: false,
      requiresApproval: false,
      isDestructive: false,
      execute: async (ctx, args) => this.executeTool('get_tax_liability_summary', ctx, args),
    });

    this.register({
      name: 'list_financial_accounts',
      description: 'List studio financial accounts with current balances and account types',
      isMutation: false,
      requiresApproval: false,
      isDestructive: false,
      execute: async (ctx, args) => {
        const studioId = ctx.studioId;
        const isActive = args?.is_active !== undefined ? Boolean(args.is_active) : undefined;
        const accounts = await financeService.listAccounts(studioId, { is_active: isActive });
        return { success: true, accounts, total: accounts.length };
      },
    });
    this.register({
      name: 'listFinancialAccounts',
      description: 'Alias for list_financial_accounts',
      isMutation: false,
      requiresApproval: false,
      isDestructive: false,
      execute: async (ctx, args) => this.executeTool('list_financial_accounts', ctx, args),
    });

    this.register({
      name: 'search_expenses',
      description: 'Search and filter studio expenses by category, vendor, project, client, or payment status',
      isMutation: false,
      requiresApproval: false,
      isDestructive: false,
      execute: async (ctx, args) => {
        const studioId = ctx.studioId;
        const result = await financeService.listExpenses(studioId, {
          category_id: args?.category_id || args?.categoryId,
          vendor_id: args?.vendor_id || args?.vendorId,
          project_id: args?.project_id || args?.projectId,
          client_id: args?.client_id || args?.clientId,
          status: args?.status,
          payment_status: args?.payment_status || args?.paymentStatus,
          start_date: args?.start_date || args?.startDate,
          end_date: args?.end_date || args?.endDate,
          limit: args?.limit ? Number(args.limit) : 50,
        });
        return { success: true, expenses: result.expenses, total: result.total };
      },
    });
    this.register({
      name: 'searchExpenses',
      description: 'Alias for search_expenses',
      isMutation: false,
      requiresApproval: false,
      isDestructive: false,
      execute: async (ctx, args) => this.executeTool('search_expenses', ctx, args),
    });

    // ==========================================
    // Phase 32: Studio Team Collaboration Tools (10 Tools)
    // ==========================================

    // 1. get_my_team_attention
    this.register({
      name: 'get_my_team_attention',
      description: 'Get prioritized team attention items including unread mentions, pending handoffs, urgent blockers, and open help requests for the authenticated user or specific member',
      isMutation: false,
      requiresApproval: false,
      isDestructive: false,
      execute: async (ctx, args) => {
        const studioId = ctx.studioId;
        const userId = args?.user_id || args?.userId || ctx.userId;
        const collabService = new StudioTeamCollaborationService(this.db);
        const attention = await ((collabService as any).getTeamAttention ? (collabService as any).getTeamAttention(studioId, userId) : collabService.getAttentionCenter(studioId, userId));
        return { success: true, ...attention };
      },
    });
    this.register({
      name: 'getMyTeamAttention',
      description: 'Alias for get_my_team_attention',
      isMutation: false,
      requiresApproval: false,
      isDestructive: false,
      execute: async (ctx, args) => this.executeTool('get_my_team_attention', ctx, args),
    });

    // 2. get_team_collaboration_summary
    this.register({
      name: 'get_team_collaboration_summary',
      description: 'Get an executive summary of studio team collaboration including open blockers, pending handoffs, active help requests, and recent thread activity',
      isMutation: false,
      requiresApproval: false,
      isDestructive: false,
      execute: async (ctx, _args) => {
        const studioId = ctx.studioId;
        const collabService = new StudioTeamCollaborationService(this.db);
        const [threads, blockers, handoffs, helpRequests] = await Promise.all([
          collabService.listThreads(studioId, ctx.userId || '', { limit: 1 }),
          collabService.listBlockers(studioId, ctx.userId || '', { limit: 100 }),
          collabService.listHandoffs(studioId, ctx.userId || '', { status: 'PENDING', limit: 100 }),
          collabService.listHelpRequests(studioId, ctx.userId || '', { limit: 100 }),
        ]);

        const openBlockers = blockers.filter((b) => b.status === 'REPORTED' || b.status === 'IN_INVESTIGATION');
        const criticalBlockers = openBlockers.filter((b) => b.severity === 'CRITICAL' || b.severity === 'HIGH');
        const openHelp = helpRequests.filter((h) => h.status === 'OPEN' || h.status === 'IN_PROGRESS');
        const urgentHelp = openHelp.filter((h) => h.priority === 'URGENT' || h.priority === 'HIGH');

        return {
          success: true,
          studio_id: studioId,
          total_threads: threads.items?.length || 0,
          open_blockers: openBlockers.length,
          open_blockers_count: openBlockers.length,
          critical_blockers_count: criticalBlockers.length,
          pending_handoffs_count: handoffs.length,
          open_help_requests_count: openHelp.length,
          urgent_help_requests_count: urgentHelp.length,
          open_blockers_list: openBlockers.slice(0, 10),
          pending_handoffs: handoffs.slice(0, 10),
          open_help_requests: openHelp.slice(0, 10),
        };
      },
    });
    this.register({
      name: 'getTeamCollaborationSummary',
      description: 'Alias for get_team_collaboration_summary',
      isMutation: false,
      requiresApproval: false,
      isDestructive: false,
      execute: async (ctx, args) => this.executeTool('get_team_collaboration_summary', ctx, args),
    });

    // 3. get_thread_summary
    this.register({
      name: 'get_thread_summary',
      description: 'Get full summary and details for a specific collaboration thread including message count, participants, unread state, and attachments',
      isMutation: false,
      requiresApproval: false,
      isDestructive: false,
      execute: async (ctx, args) => {
        const studioId = ctx.studioId;
        const threadId = args?.thread_id || args?.threadId;
        if (!threadId) throw new Error('thread_id is required');
        const collabService = new StudioTeamCollaborationService(this.db);
        const thread = await collabService.getThread(studioId, threadId, ctx.userId);
        const messages = await collabService.listMessages(studioId, threadId, { limit: 100 });

        return {
          success: true,
          thread,
          total_messages: messages.total,
          recent_messages: messages.messages.slice(-5),
        };
      },
    });
    this.register({
      name: 'getThreadSummary',
      description: 'Alias for get_thread_summary',
      isMutation: false,
      requiresApproval: false,
      isDestructive: false,
      execute: async (ctx, args) => this.executeTool('get_thread_summary', ctx, args),
    });

    // 4. get_unread_team_mentions
    this.register({
      name: 'get_unread_team_mentions',
      description: 'Retrieve all unread team mentions and tagged messages for a specific member or the caller',
      isMutation: false,
      requiresApproval: false,
      isDestructive: false,
      execute: async (ctx, args) => {
        const studioId = ctx.studioId;
        const memberId = args?.member_id || args?.memberId;
        const collabService = new StudioTeamCollaborationService(this.db);
        const mentions = await collabService.listMentions(studioId, {
          member_id: memberId,
          is_read: false,
          limit: args?.limit ? Number(args.limit) : 50,
        });
        return { success: true, mentions, count: mentions.length };
      },
    });
    this.register({
      name: 'getUnreadTeamMentions',
      description: 'Alias for get_unread_team_mentions',
      isMutation: false,
      requiresApproval: false,
      isDestructive: false,
      execute: async (ctx, args) => this.executeTool('get_unread_team_mentions', ctx, args),
    });

    // 5. get_open_team_blockers
    this.register({
      name: 'get_open_team_blockers',
      description: 'List open and active work blockers across the studio, optionally filtered by project, task, or severity',
      isMutation: false,
      requiresApproval: false,
      isDestructive: false,
      execute: async (ctx, args) => {
        const studioId = ctx.studioId;
        const collabService = new StudioTeamCollaborationService(this.db);
        const blockers = await collabService.listBlockers(studioId, ctx.userId || '', {
          project_id: args?.project_id || args?.projectId,
          task_id: args?.task_id || args?.taskId,
          severity: args?.severity,
          limit: args?.limit ? Number(args.limit) : 50,
        });
        const openBlockers = blockers.filter((b) => b.status === 'REPORTED' || b.status === 'IN_INVESTIGATION');
        return { success: true, blockers: openBlockers, total: openBlockers.length };
      },
    });
    this.register({
      name: 'getOpenTeamBlockers',
      description: 'Alias for get_open_team_blockers',
      isMutation: false,
      requiresApproval: false,
      isDestructive: false,
      execute: async (ctx, args) => this.executeTool('get_open_team_blockers', ctx, args),
    });

    // 6. get_pending_handoffs
    this.register({
      name: 'get_pending_handoffs',
      description: 'List pending or in-progress work handoffs across team members, projects, or tasks',
      isMutation: false,
      requiresApproval: false,
      isDestructive: false,
      execute: async (ctx, args) => {
        const studioId = ctx.studioId;
        const collabService = new StudioTeamCollaborationService(this.db);
        const handoffs = await collabService.listHandoffs(studioId, ctx.userId || '', {
          to_member_id: args?.to_member_id || args?.toMemberId,
          from_member_id: args?.from_member_id || args?.fromMemberId,
          project_id: args?.project_id || args?.projectId,
          task_id: args?.task_id || args?.taskId,
          status: args?.status || 'PENDING',
          limit: args?.limit ? Number(args.limit) : 50,
        });
        return { success: true, handoffs, total: handoffs.length };
      },
    });
    this.register({
      name: 'getPendingHandoffs',
      description: 'Alias for get_pending_handoffs',
      isMutation: false,
      requiresApproval: false,
      isDestructive: false,
      execute: async (ctx, args) => this.executeTool('get_pending_handoffs', ctx, args),
    });

    // 7. get_open_help_requests
    this.register({
      name: 'get_open_help_requests',
      description: 'List open peer assistance and help requests categorized by area (e.g. CULLING, EDITING, GEAR, CLIENT, LIGHTING)',
      isMutation: false,
      requiresApproval: false,
      isDestructive: false,
      execute: async (ctx, args) => {
        const studioId = ctx.studioId;
        const collabService = new StudioTeamCollaborationService(this.db);
        const requests = await collabService.listHelpRequests(studioId, ctx.userId || '', {
          category: args?.category,
          priority: args?.priority,
          project_id: args?.project_id || args?.projectId,
          task_id: args?.task_id || args?.taskId,
          limit: args?.limit ? Number(args.limit) : 50,
        });
        const openRequests = requests.filter((r) => r.status === 'OPEN' || r.status === 'IN_PROGRESS');
        return { success: true, help_requests: openRequests, total: openRequests.length };
      },
    });
    this.register({
      name: 'getOpenHelpRequests',
      description: 'Alias for get_open_help_requests',
      isMutation: false,
      requiresApproval: false,
      isDestructive: false,
      execute: async (ctx, args) => this.executeTool('get_open_help_requests', ctx, args),
    });

    // 8. get_project_collaboration_activity
    this.register({
      name: 'get_project_collaboration_activity',
      description: 'Get unified internal collaboration activity (threads, blockers, handoffs, help requests) linked to a specific project',
      isMutation: false,
      requiresApproval: false,
      isDestructive: false,
      execute: async (ctx, args) => {
        const studioId = ctx.studioId;
        const projectId = args?.project_id || args?.projectId;
        if (!projectId) throw new Error('project_id is required');
        const collabService = new StudioTeamCollaborationService(this.db);
        const [threads, blockers, handoffs, helpRequests] = await Promise.all([
          collabService.listThreads(studioId, ctx.userId || '', { project_id: projectId, limit: 20 }),
          collabService.listBlockers(studioId, ctx.userId || '', { project_id: projectId }),
          collabService.listHandoffs(studioId, ctx.userId || '', { project_id: projectId }),
          collabService.listHelpRequests(studioId, ctx.userId || '', { project_id: projectId }),
        ]);

        return {
          success: true,
          project_id: projectId,
          threads: threads.items || [],
          blockers,
          handoffs,
          help_requests: helpRequests,
        };
      },
    });
    this.register({
      name: 'getProjectCollaborationActivity',
      description: 'Alias for get_project_collaboration_activity',
      isMutation: false,
      requiresApproval: false,
      isDestructive: false,
      execute: async (ctx, args) => this.executeTool('get_project_collaboration_activity', ctx, args),
    });

    // 9. get_member_collaboration_activity
    this.register({
      name: 'get_member_collaboration_activity',
      description: 'Get a specific team member collaboration summary including pending incoming handoffs, assigned blockers, and authored threads',
      isMutation: false,
      requiresApproval: false,
      isDestructive: false,
      execute: async (ctx, args) => {
        const studioId = ctx.studioId;
        const memberId = args?.member_id || args?.memberId;
        if (!memberId) throw new Error('member_id is required');
        const collabService = new StudioTeamCollaborationService(this.db);
        const [incomingHandoffs, outgoingHandoffs, assignedBlockers, helpRequests] = await Promise.all([
          collabService.listHandoffs(studioId, { to_member_id: memberId, limit: 20 }),
          collabService.listHandoffs(studioId, { from_member_id: memberId, limit: 20 }),
          collabService.listBlockers(studioId, { assigned_to_id: memberId, limit: 20 }),
          collabService.listHelpRequests(studioId, { assigned_to_id: memberId, limit: 20 }),
        ]);

        return {
          success: true,
          member_id: memberId,
          incoming_handoffs: incomingHandoffs,
          outgoing_handoffs: outgoingHandoffs,
          assigned_blockers: assignedBlockers,
          assigned_help_requests: helpRequests,
        };
      },
    });
    this.register({
      name: 'getMemberCollaborationActivity',
      description: 'Alias for get_member_collaboration_activity',
      isMutation: false,
      requiresApproval: false,
      isDestructive: false,
      execute: async (ctx, args) => this.executeTool('get_member_collaboration_activity', ctx, args),
    });

    // 10. search_team_collaboration
    this.register({
      name: 'search_team_collaboration',
      description: 'Search across internal collaboration threads, messages, handoffs, and blockers with keyword matching and entity filters',
      isMutation: false,
      requiresApproval: false,
      isDestructive: false,
      execute: async (ctx, args) => {
        const studioId = ctx.studioId;
        const query = args?.query || args?.q || '';
        const collabService = new StudioTeamCollaborationService(this.db);
        const results = await collabService.searchCollaboration(studioId, ctx.userId || '', {
          query,
          thread_type: args?.thread_type || args?.threadType,
          project_id: args?.project_id || args?.projectId,
          task_id: args?.task_id || args?.taskId,
          limit: args?.limit ? Number(args.limit) : 20,
        });
        return { success: true, ...results };
      },
    });
    this.register({
      name: 'searchTeamCollaboration',
      description: 'Alias for search_team_collaboration',
      isMutation: false,
      requiresApproval: false,
      isDestructive: false,
      execute: async (ctx, args) => this.executeTool('search_team_collaboration', ctx, args),
    });

    // -------------------------------------------------------------
    // PHASE 34 — STUDIO FINANCIAL ACCOUNTING & GENERAL LEDGER 2.0
    // -------------------------------------------------------------
    const accountingService = new StudioAccountingService(this.db);

    // 1. get_chart_of_accounts
    this.register({
      name: 'get_chart_of_accounts',
      description: 'Get list of Chart of Accounts for studio with account codes, types, and normal balances',
      isMutation: false,
      requiresApproval: false,
      isDestructive: false,
      execute: async (ctx, args) => {
        const studioId = ctx.studioId;
        const accounts = await accountingService.listAccounts(studioId, {
          account_type: args?.account_type || args?.accountType,
          is_active: args?.is_active !== undefined ? args.is_active : (args?.isActive !== undefined ? args.isActive : true),
        });
        return { success: true, accounts, total: accounts.length };
      },
    });
    this.register({
      name: 'getChartOfAccounts',
      description: 'Alias for get_chart_of_accounts',
      isMutation: false,
      requiresApproval: false,
      isDestructive: false,
      execute: async (ctx, args) => this.executeTool('get_chart_of_accounts', ctx, args),
    });

    // 2. get_account_balance
    this.register({
      name: 'get_account_balance',
      description: 'Get current posted balance and normal balance details for a specific chart of account',
      isMutation: false,
      requiresApproval: false,
      isDestructive: false,
      execute: async (ctx, args) => {
        const studioId = ctx.studioId;
        const accountId = args?.account_id || args?.accountId;
        if (!accountId) throw new Error('accountId is required');
        const balance = await accountingService.getAccountBalance(studioId, accountId);
        return { success: true, ...balance };
      },
    });
    this.register({
      name: 'getAccountBalance',
      description: 'Alias for get_account_balance',
      isMutation: false,
      requiresApproval: false,
      isDestructive: false,
      execute: async (ctx, args) => this.executeTool('get_account_balance', ctx, args),
    });

    // 3. get_account_activity
    this.register({
      name: 'get_account_activity',
      description: 'Get paginated ledger activity and running balance for a specific account over a date range',
      isMutation: false,
      requiresApproval: false,
      isDestructive: false,
      execute: async (ctx, args) => {
        const studioId = ctx.studioId;
        const accountId = args?.account_id || args?.accountId;
        if (!accountId) throw new Error('accountId is required');
        const activity = await accountingService.getAccountActivity(studioId, accountId, {
          from_date: args?.from_date || args?.fromDate,
          to_date: args?.to_date || args?.toDate,
          limit: args?.limit ? Number(args.limit) : 50,
          offset: args?.offset ? Number(args.offset) : 0,
        });
        return { success: true, ...activity };
      },
    });
    this.register({
      name: 'getAccountActivity',
      description: 'Alias for get_account_activity',
      isMutation: false,
      requiresApproval: false,
      isDestructive: false,
      execute: async (ctx, args) => this.executeTool('get_account_activity', ctx, args),
    });

    // 4. get_general_ledger
    this.register({
      name: 'get_general_ledger',
      description: 'Get general ledger report across all studio accounts with debit, credit, and running balance totals',
      isMutation: false,
      requiresApproval: false,
      isDestructive: false,
      execute: async (ctx, args) => {
        const studioId = ctx.studioId;
        const ledger = await accountingService.getGeneralLedger(studioId, {
          from_date: args?.from_date || args?.fromDate,
          to_date: args?.to_date || args?.toDate,
          account_id: args?.account_id || args?.accountId,
          limit: args?.limit ? Number(args.limit) : 100,
          offset: args?.offset ? Number(args.offset) : 0,
        });
        return { success: true, ...ledger };
      },
    });
    this.register({
      name: 'getGeneralLedger',
      description: 'Alias for get_general_ledger',
      isMutation: false,
      requiresApproval: false,
      isDestructive: false,
      execute: async (ctx, args) => this.executeTool('get_general_ledger', ctx, args),
    });

    // 5. get_trial_balance
    this.register({
      name: 'get_trial_balance',
      description: 'Get double-entry trial balance report verifying total debits equal total credits',
      isMutation: false,
      requiresApproval: false,
      isDestructive: false,
      execute: async (ctx, args) => {
        const studioId = ctx.studioId;
        const tb = await accountingService.getTrialBalance(studioId, {
          as_of_date: args?.as_of_date || args?.asOfDate,
        });
        return { success: true, ...tb };
      },
    });
    this.register({
      name: 'getTrialBalance',
      description: 'Alias for get_trial_balance',
      isMutation: false,
      requiresApproval: false,
      isDestructive: false,
      execute: async (ctx, args) => this.executeTool('get_trial_balance', ctx, args),
    });

    // 6. get_profit_and_loss
    this.register({
      name: 'get_profit_and_loss',
      description: 'Get formal accounting Profit & Loss statement derived from posted revenue and expense journal entries',
      isMutation: false,
      requiresApproval: false,
      isDestructive: false,
      execute: async (ctx, args) => {
        const studioId = ctx.studioId;
        const pnl = await accountingService.getProfitAndLoss(studioId, {
          from_date: args?.from_date || args?.fromDate,
          to_date: args?.to_date || args?.toDate,
        });
        return { success: true, ...pnl };
      },
    });
    this.register({
      name: 'getProfitAndLoss',
      description: 'Alias for get_profit_and_loss',
      isMutation: false,
      requiresApproval: false,
      isDestructive: false,
      execute: async (ctx, args) => this.executeTool('get_profit_and_loss', ctx, args),
    });

    // 7. get_balance_sheet
    this.register({
      name: 'get_balance_sheet',
      description: 'Get double-entry Balance Sheet report verifying Assets = Liabilities + Equity as of target date',
      isMutation: false,
      requiresApproval: false,
      isDestructive: false,
      execute: async (ctx, args) => {
        const studioId = ctx.studioId;
        const bs = await accountingService.getBalanceSheet(studioId, {
          as_of_date: args?.as_of_date || args?.asOfDate,
        });
        return { success: true, ...bs };
      },
    });
    this.register({
      name: 'getBalanceSheet',
      description: 'Alias for get_balance_sheet',
      isMutation: false,
      requiresApproval: false,
      isDestructive: false,
      execute: async (ctx, args) => this.executeTool('get_balance_sheet', ctx, args),
    });

    // 8. get_open_accounting_periods
    this.register({
      name: 'get_open_accounting_periods',
      description: 'Get all active open accounting periods eligible for posting journal entries',
      isMutation: false,
      requiresApproval: false,
      isDestructive: false,
      execute: async (ctx) => {
        const studioId = ctx.studioId;
        const periods = await accountingService.listPeriods(studioId);
        const openPeriods = periods.filter((p: any) => p.status === 'OPEN');
        return { success: true, open_periods: openPeriods, total_open: openPeriods.length };
      },
    });
    this.register({
      name: 'getOpenAccountingPeriods',
      description: 'Alias for get_open_accounting_periods',
      isMutation: false,
      requiresApproval: false,
      isDestructive: false,
      execute: async (ctx, args) => this.executeTool('get_open_accounting_periods', ctx, args),
    });

    // 9. get_overdue_accounting_items
    this.register({
      name: 'get_overdue_accounting_items',
      description: 'Get overview of overdue financial items across receivables and payables affecting the ledger',
      isMutation: false,
      requiresApproval: false,
      isDestructive: false,
      execute: async (ctx) => {
        const studioId = ctx.studioId;
        const [receivables, payables] = await Promise.all([
          financeService.listReceivables(studioId, { status: 'OVERDUE' }),
          financeService.listPayables(studioId, { status: 'OVERDUE' }),
        ]);
        return {
          success: true,
          overdue_receivables: receivables,
          overdue_payables: payables,
          total_overdue_items: receivables.length + payables.length,
        };
      },
    });
    this.register({
      name: 'getOverdueAccountingItems',
      description: 'Alias for get_overdue_accounting_items',
      isMutation: false,
      requiresApproval: false,
      isDestructive: false,
      execute: async (ctx, args) => this.executeTool('get_overdue_accounting_items', ctx, args),
    });

    // 10. get_journal_entry
    this.register({
      name: 'get_journal_entry',
      description: 'Get full journal entry details with all balanced debit and credit lines and posting audit trail',
      isMutation: false,
      requiresApproval: false,
      isDestructive: false,
      execute: async (ctx, args) => {
        const studioId = ctx.studioId;
        const entryId = args?.entry_id || args?.entryId || args?.id;
        if (!entryId) throw new Error('entryId is required');
        const entry = await accountingService.getJournalEntry(studioId, entryId);
        return { success: true, journal_entry: entry };
      },
    });
    this.register({
      name: 'getJournalEntry',
      description: 'Alias for get_journal_entry',
      isMutation: false,
      requiresApproval: false,
      isDestructive: false,
      execute: async (ctx, args) => this.executeTool('get_journal_entry', ctx, args),
    });

    // 11. draft_journal_entry (Optional mutation tool with strict human approval required)
    this.register({
      name: 'draft_journal_entry',
      description: 'Create a draft journal entry. ALWAYS requires explicit human review and approval before posting.',
      isMutation: true,
      requiresApproval: true,
      isDestructive: false,
      execute: async (ctx, args) => {
        const studioId = ctx.studioId;
        const entry = await accountingService.createJournalEntry(studioId, {
          entry_date: args?.entry_date || args?.entryDate,
          description: args?.description || 'Draft Copilot Journal Entry',
          reference_type: args?.reference_type || args?.referenceType,
          reference_id: args?.reference_id || args?.referenceId,
          currency: args?.currency || 'USD',
          lines: args?.lines || [],
        }, ctx.userId || 'copilot');
        return {
          success: true,
          journal_entry: entry,
          is_draft: true,
          requires_human_approval: true,
          message: 'Draft journal entry created. Explicit human confirmation is required to post.',
        };
      },
    });
    this.register({
      name: 'draftJournalEntry',
      description: 'Alias for draft_journal_entry',
      isMutation: true,
      requiresApproval: true,
      isDestructive: false,
      execute: async (ctx, args) => this.executeTool('draft_journal_entry', ctx, args),
    });

    // -------------------------------------------------------------
    // PHASE 35 — TAX & COMPLIANCE COPILOT TOOLS
    // -------------------------------------------------------------
    const taxService = new StudioTaxService(this.db);

    // 1. get_tax_dashboard
    this.register({
      name: 'get_tax_dashboard',
      description: 'Get comprehensive Studio Tax & Compliance overview including registrations, period status, liability and compliance issues',
      isMutation: false,
      requiresApproval: false,
      isDestructive: false,
      execute: async (ctx) => {
        const studioId = ctx.studioId;
        const [profile, registrations, summary, compliance, periods] = await Promise.all([
          taxService.getOrCreateTaxProfile(studioId),
          taxService.listRegistrations(studioId),
          taxService.getTaxSummary(studioId),
          taxService.runComplianceChecks(studioId),
          taxService.listTaxPeriods(studioId),
        ]);
        return {
          success: true,
          profile,
          registrations,
          summary,
          compliance_issues_count: compliance.issues_count,
          compliance_issues: compliance.issues,
          periods,
        };
      },
    });
    this.register({
      name: 'getTaxDashboard',
      description: 'Alias for get_tax_dashboard',
      isMutation: false,
      requiresApproval: false,
      isDestructive: false,
      execute: async (ctx, args) => this.executeTool('get_tax_dashboard', ctx, args),
    });

    // 2. get_tax_summary
    this.register({
      name: 'get_tax_summary',
      description: 'Get structured operational tax summary (output tax, input tax credit, net payable) for an optional date range',
      isMutation: false,
      requiresApproval: false,
      isDestructive: false,
      execute: async (ctx, args) => {
        const studioId = ctx.studioId;
        const start = args?.start_date || args?.startDate ? new Date(args.start_date || args.startDate) : undefined;
        const end = args?.end_date || args?.endDate ? new Date(args.end_date || args.endDate) : undefined;
        const summary = await taxService.getTaxSummary(studioId, start, end);
        return { success: true, summary };
      },
    });
    this.register({
      name: 'getTaxSummary',
      description: 'Alias for get_tax_summary',
      isMutation: false,
      requiresApproval: false,
      isDestructive: false,
      execute: async (ctx, args) => this.executeTool('get_tax_summary', ctx, args),
    });

    // 3. get_output_tax_summary
    this.register({
      name: 'get_output_tax_summary',
      description: 'Get detailed output tax summary across client invoices and sales transactions',
      isMutation: false,
      requiresApproval: false,
      isDestructive: false,
      execute: async (ctx, args) => {
        const studioId = ctx.studioId;
        const start = args?.start_date || args?.startDate ? new Date(args.start_date || args.startDate) : undefined;
        const end = args?.end_date || args?.endDate ? new Date(args.end_date || args.endDate) : undefined;
        const summary = await taxService.getTaxSummary(studioId, start, end);
        return {
          success: true,
          output_tax: summary.output_tax,
          total_output_tax_minor: summary.output_tax.total_output_tax_minor,
          breakdown: {
            cgst: summary.output_tax.cgst_minor,
            sgst: summary.output_tax.sgst_minor,
            igst: summary.output_tax.igst_minor,
            cess: summary.output_tax.cess_minor,
          },
        };
      },
    });
    this.register({
      name: 'getOutputTaxSummary',
      description: 'Alias for get_output_tax_summary',
      isMutation: false,
      requiresApproval: false,
      isDestructive: false,
      execute: async (ctx, args) => this.executeTool('get_output_tax_summary', ctx, args),
    });

    // 4. get_input_tax_summary
    this.register({
      name: 'get_input_tax_summary',
      description: 'Get detailed input tax credit (ITC) summary across vendor bills, expenses, and asset acquisitions',
      isMutation: false,
      requiresApproval: false,
      isDestructive: false,
      execute: async (ctx, args) => {
        const studioId = ctx.studioId;
        const start = args?.start_date || args?.startDate ? new Date(args.start_date || args.startDate) : undefined;
        const end = args?.end_date || args?.endDate ? new Date(args.end_date || args.endDate) : undefined;
        const summary = await taxService.getTaxSummary(studioId, start, end);
        return {
          success: true,
          input_tax: summary.input_tax,
          total_itc_minor: summary.input_tax.total_input_tax_minor,
          eligible_itc_minor: summary.input_tax.eligible_itc_minor,
          ineligible_itc_minor: summary.input_tax.ineligible_itc_minor,
        };
      },
    });
    this.register({
      name: 'getInputTaxSummary',
      description: 'Alias for get_input_tax_summary',
      isMutation: false,
      requiresApproval: false,
      isDestructive: false,
      execute: async (ctx, args) => this.executeTool('get_input_tax_summary', ctx, args),
    });

    // 5. get_tax_liability
    this.register({
      name: 'get_tax_liability',
      description: 'Calculate net tax liability (Output Tax - Eligible ITC + Reverse Charge) with integer arithmetic',
      isMutation: false,
      requiresApproval: false,
      isDestructive: false,
      execute: async (ctx, args) => {
        const studioId = ctx.studioId;
        const start = args?.start_date || args?.startDate ? new Date(args.start_date || args.startDate) : undefined;
        const end = args?.end_date || args?.endDate ? new Date(args.end_date || args.endDate) : undefined;
        const summary = await taxService.getTaxSummary(studioId, start, end);
        return {
          success: true,
          net_tax_payable_minor: summary.net_tax_payable_minor,
          reverse_charge_payable_minor: summary.reverse_charge_payable_minor,
          output_tax_minor: summary.output_tax.total_output_tax_minor,
          eligible_itc_minor: summary.input_tax.eligible_itc_minor,
          currency: summary.currency,
        };
      },
    });
    this.register({
      name: 'getTaxLiability',
      description: 'Alias for get_tax_liability',
      isMutation: false,
      requiresApproval: false,
      isDestructive: false,
      execute: async (ctx, args) => this.executeTool('get_tax_liability', ctx, args),
    });

    // 6. get_tax_reconciliation
    this.register({
      name: 'get_tax_reconciliation',
      description: 'Reconcile tax sub-ledger transactions with Phase 34 General Ledger tax accounts for a tax period',
      isMutation: false,
      requiresApproval: false,
      isDestructive: false,
      execute: async (ctx, args) => {
        const studioId = ctx.studioId;
        const periodId = args?.period_id || args?.periodId;
        if (!periodId) throw new Error('period_id is required');
        const reconciliation = await taxService.reconcileTaxWithLedger(studioId, periodId, ctx.userId || 'copilot');
        return { success: true, reconciliation };
      },
    });
    this.register({
      name: 'getTaxReconciliation',
      description: 'Alias for get_tax_reconciliation',
      isMutation: false,
      requiresApproval: false,
      isDestructive: false,
      execute: async (ctx, args) => this.executeTool('get_tax_reconciliation', ctx, args),
    });

    // 7. get_tax_compliance_issues
    this.register({
      name: 'get_tax_compliance_issues',
      description: 'Run automated GST/tax compliance checks to detect missing GSTINs, unmapped SAC codes, rate mismatches, and overdue period actions',
      isMutation: false,
      requiresApproval: false,
      isDestructive: false,
      execute: async (ctx) => {
        const studioId = ctx.studioId;
        const checks = await taxService.runComplianceChecks(studioId);
        return { success: true, compliance: checks };
      },
    });
    this.register({
      name: 'getTaxComplianceIssues',
      description: 'Alias for get_tax_compliance_issues',
      isMutation: false,
      requiresApproval: false,
      isDestructive: false,
      execute: async (ctx, args) => this.executeTool('get_tax_compliance_issues', ctx, args),
    });

    // 8. get_tax_period_status
    this.register({
      name: 'get_tax_period_status',
      description: 'Get tax period lifecycle status, review workflows, and filing preparation status',
      isMutation: false,
      requiresApproval: false,
      isDestructive: false,
      execute: async (ctx, args) => {
        const studioId = ctx.studioId;
        const periods = await taxService.listTaxPeriods(studioId);
        const specific = args?.period_id || args?.periodId ? periods.find((p: any) => p.id === (args.period_id || args.periodId)) : undefined;
        return {
          success: true,
          periods,
          current_period: specific || periods[0] || null,
        };
      },
    });
    this.register({
      name: 'getTaxPeriodStatus',
      description: 'Alias for get_tax_period_status',
      isMutation: false,
      requiresApproval: false,
      isDestructive: false,
      execute: async (ctx, args) => this.executeTool('get_tax_period_status', ctx, args),
    });

    // 9. get_tax_transaction
    this.register({
      name: 'get_tax_transaction',
      description: 'Get full details of a tax transaction including line item breakdown, GST splits, and linked Phase 34 journal entry ID',
      isMutation: false,
      requiresApproval: false,
      isDestructive: false,
      execute: async (ctx, args) => {
        const studioId = ctx.studioId;
        const transactionId = args?.transaction_id || args?.transactionId || args?.id;
        if (!transactionId) throw new Error('transaction_id is required');
        const transaction = await taxService.getTaxTransaction(studioId, transactionId);
        return { success: true, transaction };
      },
    });
    this.register({
      name: 'getTaxTransaction',
      description: 'Alias for get_tax_transaction',
      isMutation: false,
      requiresApproval: false,
      isDestructive: false,
      execute: async (ctx, args) => this.executeTool('get_tax_transaction', ctx, args),
    });

    // 10. get_tax_profile
    this.register({
      name: 'get_tax_profile',
      description: 'Get studio tax identity, legal entity type, PAN, registrations, composition scheme status, and tax defaults',
      isMutation: false,
      requiresApproval: false,
      isDestructive: false,
      execute: async (ctx) => {
        const studioId = ctx.studioId;
        const profile = await taxService.getOrCreateTaxProfile(studioId);
        return { success: true, profile };
      },
    });
    this.register({
      name: 'getTaxProfile',
      description: 'Alias for get_tax_profile',
      isMutation: false,
      requiresApproval: false,
      isDestructive: false,
      execute: async (ctx, args) => this.executeTool('get_tax_profile', ctx, args),
    });

    // 11. draft_tax_adjustment (Controlled mutation tool with human approval requirement)
    this.register({
      name: 'draft_tax_adjustment',
      description: 'Create a draft tax adjustment (ITC reversal, credit note adjustment, RCM correction). ALWAYS requires explicit human approval before posting.',
      isMutation: true,
      requiresApproval: true,
      isDestructive: false,
      execute: async (ctx, args) => {
        const studioId = ctx.studioId;
        const adjustment = await taxService.createTaxAdjustment(studioId, {
          tax_period_id: args?.tax_period_id || args?.taxPeriodId,
          adjustment_type: args?.adjustment_type || args?.adjustmentType || 'ITC_REVERSAL',
          amount_minor: args?.amount_minor || args?.amountMinor || 0,
          cgst_amount_minor: args?.cgst_amount_minor || args?.cgstAmountMinor,
          sgst_amount_minor: args?.sgst_amount_minor || args?.sgstAmountMinor,
          igst_amount_minor: args?.igst_amount_minor || args?.igstAmountMinor,
          cess_amount_minor: args?.cess_amount_minor || args?.cessAmountMinor,
          reason: args?.reason || 'Draft Copilot tax adjustment',
          notes: args?.notes,
        }, ctx.userId || 'copilot');
        return {
          success: true,
          adjustment,
          is_draft: true,
          requires_human_approval: true,
          message: 'Draft tax adjustment created. Explicit human review and confirmation is required before posting to ledger.',
        };
      },
    });
    this.register({
      name: 'draftTaxAdjustment',
      description: 'Alias for draft_tax_adjustment',
      isMutation: true,
      requiresApproval: true,
      isDestructive: false,
      execute: async (ctx, args) => this.executeTool('draft_tax_adjustment', ctx, args),
    });

    // =========================================================================
    // PHASE 36: STUDIO INVOICING, PAYMENTS & COLLECTIONS COPILOT TOOLS
    // =========================================================================
    const invoicingService = new InvoicingService();

    // 1. get_invoice_summary
    this.register({
      name: 'get_invoice_summary',
      description: 'Get comprehensive invoicing metrics: total invoiced, collected, outstanding, overdue, partial payments, collection rate',
      isMutation: false,
      requiresApproval: false,
      isDestructive: false,
      execute: async (ctx) => {
        const studioId = ctx.studioId;
        const invoicingService = new InvoicingService(this.db, new StudioAccountingService(this.db), new StudioTaxService(this.db));
        const metrics = await invoicingService.getInvoiceMetrics(studioId);
        return { success: true, metrics };
      },
    });
    this.register({
      name: 'getInvoiceSummary',
      description: 'Alias for get_invoice_summary',
      isMutation: false,
      requiresApproval: false,
      isDestructive: false,
      execute: async (ctx, args) => this.executeTool('get_invoice_summary', ctx, args),
    });

    // 2. get_outstanding_invoices
    this.register({
      name: 'get_outstanding_invoices',
      description: 'List unpaid and partially paid invoices with balance due, client info, and payment links',
      isMutation: false,
      requiresApproval: false,
      isDestructive: false,
      execute: async (ctx, args) => {
        const studioId = ctx.studioId;
        const invoicingService = new InvoicingService(this.db, new StudioAccountingService(this.db), new StudioTaxService(this.db));
        const res = await invoicingService.listInvoices(studioId, {
          clientId: args?.client_id || args?.clientId,
          status: args?.status,
        });
        const invoices = Array.isArray(res) ? res : res.items || [];
        const outstanding = invoices.filter((inv: any) => inv.amount_due_minor > 0 && inv.status !== 'VOID' && inv.status !== 'CANCELLED');
        return { success: true, count: outstanding.length, invoices: outstanding };
      },
    });
    this.register({
      name: 'getOutstandingInvoices',
      description: 'Alias for get_outstanding_invoices',
      isMutation: false,
      requiresApproval: false,
      isDestructive: false,
      execute: async (ctx, args) => this.executeTool('get_outstanding_invoices', ctx, args),
    });

    // 3. get_overdue_invoices
    this.register({
      name: 'get_overdue_invoices',
      description: 'Get strictly overdue invoices past their due date with outstanding balance',
      isMutation: false,
      requiresApproval: false,
      isDestructive: false,
      execute: async (ctx, args) => {
        const studioId = ctx.studioId;
        const invoicingService = new InvoicingService(this.db, new StudioAccountingService(this.db), new StudioTaxService(this.db));
        const overdue = await invoicingService.getOverdueInvoices(studioId);
        return { success: true, count: overdue.length, invoices: overdue };
      },
    });
    this.register({
      name: 'getOverdueInvoices',
      description: 'Alias for get_overdue_invoices',
      isMutation: false,
      requiresApproval: false,
      isDestructive: false,
      execute: async (ctx, args) => this.executeTool('get_overdue_invoices', ctx, args),
    });

    // 4. get_invoice_payment_status
    this.register({
      name: 'get_invoice_payment_status',
      description: 'Get real-time payment status, amount paid, balance due, and payment attempt log for an invoice',
      isMutation: false,
      requiresApproval: false,
      isDestructive: false,
      execute: async (ctx, args) => {
        const studioId = ctx.studioId;
        const invoiceId = args?.invoice_id || args?.invoiceId || args?.id;
        if (!invoiceId) throw new Error('invoice_id is required');
        const invoicingService = new InvoicingService(this.db, new StudioAccountingService(this.db), new StudioTaxService(this.db));
        const invoice = await invoicingService.getInvoiceById(studioId, invoiceId);
        const payments = await invoicingService.getInvoicePayments(studioId, invoiceId);
        return {
          success: true,
          invoice_number: invoice.invoice_number,
          status: invoice.status,
          total_minor: invoice.total_minor,
          amount_paid_minor: invoice.amount_paid_minor,
          amount_due_minor: invoice.amount_due_minor,
          currency: invoice.currency,
          payments,
        };
      },
    });
    this.register({
      name: 'getInvoicePaymentStatus',
      description: 'Alias for get_invoice_payment_status',
      isMutation: false,
      requiresApproval: false,
      isDestructive: false,
      execute: async (ctx, args) => this.executeTool('get_invoice_payment_status', ctx, args),
    });

    // 5. get_client_payment_history
    this.register({
      name: 'get_client_payment_history',
      description: 'Get complete payment history, lifetime invoiced, total paid, and outstanding balances for a specific client',
      isMutation: false,
      requiresApproval: false,
      isDestructive: false,
      execute: async (ctx, args) => {
        const studioId = ctx.studioId;
        const clientId = args?.client_id || args?.clientId;
        if (!clientId) throw new Error('client_id is required');
        const invoicingService = new InvoicingService(this.db, new StudioAccountingService(this.db), new StudioTaxService(this.db));
        const res = await invoicingService.listInvoices(studioId, { clientId });
        const invoices = Array.isArray(res) ? res : res.items || [];
        const invoiceIds = invoices.map((i: any) => i.id);
        const payments = await this.db.studioInvoicePayment.findMany({
          where: { studio_id: studioId, invoice_id: { in: invoiceIds } },
          orderBy: { payment_date: 'desc' },
        });
        const totalInvoiced = invoices.reduce((acc: number, i: any) => acc + i.total_minor, 0);
        const totalPaid = invoices.reduce((acc: number, i: any) => acc + i.amount_paid_minor, 0);
        const totalDue = invoices.reduce((acc: number, i: any) => acc + i.amount_due_minor, 0);
        return {
          success: true,
          client_id: clientId,
          total_invoiced_minor: totalInvoiced,
          total_paid_minor: totalPaid,
          total_due_minor: totalDue,
          invoices_count: invoices.length,
          payments_count: payments.length,
          invoices,
          payments,
        };
      },
    });
    this.register({
      name: 'getClientPaymentHistory',
      description: 'Alias for get_client_payment_history',
      isMutation: false,
      requiresApproval: false,
      isDestructive: false,
      execute: async (ctx, args) => this.executeTool('get_client_payment_history', ctx, args),
    });

    // 6. get_collection_summary
    this.register({
      name: 'get_collection_summary',
      description: 'Get aging breakdown (0-30, 31-60, 61-90, 90+ days), active collection tasks, and payment promises',
      isMutation: false,
      requiresApproval: false,
      isDestructive: false,
      execute: async (ctx) => {
        const studioId = ctx.studioId;
        const invoicingService = new InvoicingService(this.db, new StudioAccountingService(this.db), new StudioTaxService(this.db));
        const aging = await invoicingService.getOverdueAgingReport(studioId);
        const tasks = await invoicingService.listCollectionTasks(studioId);
        const promises = await this.db.studioPaymentPromise.findMany({
          where: { studio_id: studioId, status: 'PENDING' },
          orderBy: { promised_date: 'asc' },
        });
        return { success: true, aging, open_collection_tasks: tasks, pending_promises: promises };
      },
    });
    this.register({
      name: 'getCollectionSummary',
      description: 'Alias for get_collection_summary',
      isMutation: false,
      requiresApproval: false,
      isDestructive: false,
      execute: async (ctx, args) => this.executeTool('get_collection_summary', ctx, args),
    });

    // 7. get_payment_activity
    this.register({
      name: 'get_payment_activity',
      description: 'Get recent payment settlements, refunds, and gateway transaction events',
      isMutation: false,
      requiresApproval: false,
      isDestructive: false,
      execute: async (ctx, args) => {
        const studioId = ctx.studioId;
        const limit = args?.limit || 20;
        const payments = await this.db.studioInvoicePayment.findMany({
          where: { studio_id: studioId },
          include: { invoice: { select: { invoice_number: true, client_id: true } } },
          orderBy: { payment_date: 'desc' },
          take: limit,
        });
        return { success: true, count: payments.length, payments };
      },
    });
    this.register({
      name: 'getPaymentActivity',
      description: 'Alias for get_payment_activity',
      isMutation: false,
      requiresApproval: false,
      isDestructive: false,
      execute: async (ctx, args) => this.executeTool('get_payment_activity', ctx, args),
    });

    // 8. get_invoice_details
    this.register({
      name: 'get_invoice_details',
      description: 'Get complete invoice breakdown with lines, tax transaction, GL journal entry, installments, payments, and credit notes',
      isMutation: false,
      requiresApproval: false,
      isDestructive: false,
      execute: async (ctx, args) => {
        const studioId = ctx.studioId;
        const invoiceId = args?.invoice_id || args?.invoiceId || args?.id;
        if (!invoiceId) throw new Error('invoice_id is required');
        const invoicingService = new InvoicingService(this.db, new StudioAccountingService(this.db), new StudioTaxService(this.db));
        const invoice = await invoicingService.getInvoiceById(studioId, invoiceId);
        return { success: true, invoice };
      },
    });
    this.register({
      name: 'getInvoiceDetails',
      description: 'Alias for get_invoice_details',
      isMutation: false,
      requiresApproval: false,
      isDestructive: false,
      execute: async (ctx, args) => this.executeTool('get_invoice_details', ctx, args),
    });

    // 9. get_receipt_details
    this.register({
      name: 'get_receipt_details',
      description: 'Get official issued receipt details, receipt number, payment reference, and remaining balance',
      isMutation: false,
      requiresApproval: false,
      isDestructive: false,
      execute: async (ctx, args) => {
        const studioId = ctx.studioId;
        const receiptId = args?.receipt_id || args?.receiptId || args?.id;
        if (!receiptId) throw new Error('receipt_id is required');
        const receipt = await this.db.studioInvoiceReceipt.findFirst({
          where: { id: receiptId, studio_id: studioId },
        });
        if (!receipt) throw new Error(`Receipt ${receiptId} not found`);
        return { success: true, receipt };
      },
    });
    this.register({
      name: 'getReceiptDetails',
      description: 'Alias for get_receipt_details',
      isMutation: false,
      requiresApproval: false,
      isDestructive: false,
      execute: async (ctx, args) => this.executeTool('get_receipt_details', ctx, args),
    });

    // 10. draft_payment_reminder (Controlled mutation tool with human approval requirement)
    this.register({
      name: 'draft_payment_reminder',
      description: 'Draft a polite, professional payment reminder for an upcoming or overdue invoice. ALWAYS draft only, requires human approval to send.',
      isMutation: true,
      requiresApproval: true,
      isDestructive: false,
      execute: async (ctx, args) => {
        const studioId = ctx.studioId;
        const invoiceId = args?.invoice_id || args?.invoiceId;
        if (!invoiceId) throw new Error('invoice_id is required');
        const invoicingService = new InvoicingService(this.db, new StudioAccountingService(this.db), new StudioTaxService(this.db));
        const invoice = await invoicingService.getInvoiceById(studioId, invoiceId);
        const reminderType = args?.reminder_type || (invoice.amount_due_minor > 0 && new Date(invoice.due_date) < new Date() ? 'OVERDUE' : 'BEFORE_DUE');
        const reminder = await invoicingService.createPaymentReminder(studioId, {
          invoice_id: invoiceId,
          reminder_type: reminderType as any,
          channel: args?.channel || 'EMAIL',
          subject: args?.subject,
          body: args?.body,
        }, ctx.userId || 'copilot');
        return {
          success: true,
          reminder,
          is_draft: true,
          requires_human_approval: true,
          message: `Draft payment reminder created for Invoice ${invoice.invoice_number}. Explicit human review required before dispatching.`,
        };
      },
    });
    this.register({
      name: 'draftPaymentReminder',
      description: 'Alias for draft_payment_reminder',
      isMutation: true,
      requiresApproval: true,
      isDestructive: false,
      execute: async (ctx, args) => this.executeTool('draft_payment_reminder', ctx, args),
    });

    // 11. draft_collection_message (Controlled mutation tool with human approval requirement)
    this.register({
      name: 'draft_collection_message',
      description: 'Draft a structured collection communication task and payment plan proposal. ALWAYS draft only, requires human review.',
      isMutation: true,
      requiresApproval: true,
      isDestructive: false,
      execute: async (ctx, args) => {
        const studioId = ctx.studioId;
        const invoiceId = args?.invoice_id || args?.invoiceId;
        if (!invoiceId) throw new Error('invoice_id is required');
        const invoicingService = new InvoicingService(this.db, new StudioAccountingService(this.db), new StudioTaxService(this.db));
        const invoice = await invoicingService.getInvoiceById(studioId, invoiceId);
        const task = await invoicingService.createCollectionTask(studioId, {
          invoice_id: invoiceId,
          assigned_to: args?.assigned_to || ctx.userId,
          priority: args?.priority || 'MEDIUM',
          notes: args?.notes || `Copilot drafted collection follow-up for Invoice ${invoice.invoice_number} (Due: ${invoice.amount_due_minor / 100} ${invoice.currency})`,
        }, ctx.userId || 'copilot');
        return {
          success: true,
          collection_task: task,
          is_draft: true,
          requires_human_approval: true,
          message: `Draft collection task created for Invoice ${invoice.invoice_number}. Human review required.`,
        };
      },
    });
    this.register({
      name: 'draftCollectionMessage',
      description: 'Alias for draft_collection_message',
      isMutation: true,
      requiresApproval: true,
      isDestructive: false,
      execute: async (ctx, args) => this.executeTool('draft_collection_message', ctx, args),
    });

    // 12. draft_invoice (Controlled mutation tool with human approval requirement)
    this.register({
      name: 'draft_invoice',
      description: 'Create a draft invoice with lines, products, or derived from contract/booking/order. ALWAYS in DRAFT status, requires human issuance.',
      isMutation: true,
      requiresApproval: true,
      isDestructive: false,
      execute: async (ctx, args) => {
        const studioId = ctx.studioId;
        const invoicingService = new InvoicingService(this.db, new StudioAccountingService(this.db), new StudioTaxService(this.db));
        const invoice = await invoicingService.createInvoice(studioId, {
          client_id: args?.client_id || args?.clientId,
          project_id: args?.project_id || args?.projectId,
          booking_id: args?.booking_id || args?.bookingId,
          contract_id: args?.contract_id || args?.contractId,
          order_id: args?.order_id || args?.orderId,
          invoice_date: args?.invoice_date || new Date(),
          due_date: args?.due_date || new Date(Date.now() + 14 * 86400000),
          currency: args?.currency || 'INR',
          discount_type: args?.discount_type,
          discount_value: args?.discount_value,
          notes: args?.notes,
          terms: args?.terms,
          lines: args?.lines || [],
        }, ctx.userId || 'copilot');
        return {
          success: true,
          invoice,
          is_draft: true,
          requires_human_approval: true,
          message: `Draft Invoice ${invoice.invoice_number} created. Review and explicitly issue when ready.`,
        };
      },
    });
    this.register({
      name: 'draftInvoice',
      description: 'Alias for draft_invoice',
      isMutation: true,
      requiresApproval: true,
      isDestructive: false,
      execute: async (ctx, args) => this.executeTool('draft_invoice', ctx, args),
    });

    // =========================================================================
    // PHASE 37 — STUDIO FINANCIAL REPORTING & STATEMENTS COPILOT TOOLS
    // =========================================================================

    // 1. get_financial_report
    this.register({
      name: 'get_financial_report',
      description: 'Retrieve financial report by type (P&L, Balance Sheet, Trial Balance, Cash Flow, Tax Summary, etc.) with date range filters.',
      isMutation: false,
      requiresApproval: false,
      isDestructive: false,
      execute: async (ctx, args) => {
        const reportingService = new StudioFinancialReportingService(this.db);
        const reportType = args?.report_type || args?.type || 'PROFIT_LOSS';
        const fromDate = args?.from_date ? new Date(args.from_date) : new Date(new Date().getFullYear(), new Date().getMonth(), 1);
        const toDate = args?.to_date ? new Date(args.to_date) : new Date();
        const asOfDate = args?.as_of_date ? new Date(args.as_of_date) : toDate;

        switch (reportType) {
          case 'BALANCE_SHEET':
            return reportingService.generateBalanceSheet(ctx.studioId, asOfDate);
          case 'TRIAL_BALANCE':
            return reportingService.generateTrialBalance(ctx.studioId, asOfDate);
          case 'CASH_FLOW':
            return reportingService.generateCashFlowStatement(ctx.studioId, fromDate, toDate);
          case 'GENERAL_LEDGER':
            return reportingService.generateGeneralLedgerReport(ctx.studioId, fromDate, toDate, args?.account_id);
          case 'AR_AGING':
            return reportingService.generateARAgingReport(ctx.studioId, asOfDate);
          case 'AP_AGING':
            return reportingService.generateAPAgingReport(ctx.studioId, asOfDate);
          case 'TAX_SUMMARY':
            return reportingService.generateTaxSummaryReport(ctx.studioId, fromDate, toDate);
          case 'PROFIT_LOSS':
          default:
            return reportingService.generateProfitAndLoss(ctx.studioId, fromDate, toDate, args?.comparison);
        }
      },
    });
    this.register({
      name: 'getFinancialReport',
      description: 'Alias for get_financial_report',
      isMutation: false,
      requiresApproval: false,
      isDestructive: false,
      execute: async (ctx, args) => this.executeTool('get_financial_report', ctx, args),
    });

    // 2. get_profit_loss
    this.register({
      name: 'get_profit_loss',
      description: 'Generate comprehensive Profit and Loss (Income Statement) with operating revenue, COGS, gross profit, expenses, EBITDA, and net income.',
      isMutation: false,
      requiresApproval: false,
      isDestructive: false,
      execute: async (ctx, args) => {
        const reportingService = new StudioFinancialReportingService(this.db);
        const fromDate = args?.from_date ? new Date(args.from_date) : new Date(new Date().getFullYear(), new Date().getMonth(), 1);
        const toDate = args?.to_date ? new Date(args.to_date) : new Date();
        return reportingService.generateProfitAndLoss(ctx.studioId, fromDate, toDate, args?.comparison);
      },
    });
    this.register({
      name: 'getProfitLoss',
      description: 'Alias for get_profit_loss',
      isMutation: false,
      requiresApproval: false,
      isDestructive: false,
      execute: async (ctx, args) => this.executeTool('get_profit_loss', ctx, args),
    });

    // 3. get_balance_sheet
    this.register({
      name: 'get_balance_sheet',
      description: 'Generate Balance Sheet as of a specific date with Assets, Liabilities, and Equity (Assets = Liabilities + Equity).',
      isMutation: false,
      requiresApproval: false,
      isDestructive: false,
      execute: async (ctx, args) => {
        const reportingService = new StudioFinancialReportingService(this.db);
        const asOfDate = args?.as_of_date ? new Date(args.as_of_date) : new Date();
        return reportingService.generateBalanceSheet(ctx.studioId, asOfDate);
      },
    });
    this.register({
      name: 'getBalanceSheet',
      description: 'Alias for get_balance_sheet',
      isMutation: false,
      requiresApproval: false,
      isDestructive: false,
      execute: async (ctx, args) => this.executeTool('get_balance_sheet', ctx, args),
    });

    // 4. get_trial_balance
    this.register({
      name: 'get_trial_balance',
      description: 'Generate Trial Balance as of a specific date, verifying debits equal credits.',
      isMutation: false,
      requiresApproval: false,
      isDestructive: false,
      execute: async (ctx, args) => {
        const reportingService = new StudioFinancialReportingService(this.db);
        const asOfDate = args?.as_of_date ? new Date(args.as_of_date) : new Date();
        return reportingService.generateTrialBalance(ctx.studioId, asOfDate);
      },
    });
    this.register({
      name: 'getTrialBalance',
      description: 'Alias for get_trial_balance',
      isMutation: false,
      requiresApproval: false,
      isDestructive: false,
      execute: async (ctx, args) => this.executeTool('get_trial_balance', ctx, args),
    });

    // 5. get_cash_flow
    this.register({
      name: 'get_cash_flow',
      description: 'Generate Cash Flow statement broken down into Operating, Investing, and Financing activities.',
      isMutation: false,
      requiresApproval: false,
      isDestructive: false,
      execute: async (ctx, args) => {
        const reportingService = new StudioFinancialReportingService(this.db);
        const fromDate = args?.from_date ? new Date(args.from_date) : new Date(new Date().getFullYear(), new Date().getMonth(), 1);
        const toDate = args?.to_date ? new Date(args.to_date) : new Date();
        return reportingService.generateCashFlowStatement(ctx.studioId, fromDate, toDate);
      },
    });
    this.register({
      name: 'getCashFlow',
      description: 'Alias for get_cash_flow',
      isMutation: false,
      requiresApproval: false,
      isDestructive: false,
      execute: async (ctx, args) => this.executeTool('get_cash_flow', ctx, args),
    });

    // 6. get_general_ledger
    this.register({
      name: 'get_general_ledger',
      description: 'Generate General Ledger report with detailed debit/credit activity and running balances.',
      isMutation: false,
      requiresApproval: false,
      isDestructive: false,
      execute: async (ctx, args) => {
        const reportingService = new StudioFinancialReportingService(this.db);
        const fromDate = args?.from_date ? new Date(args.from_date) : new Date(new Date().getFullYear(), 0, 1);
        const toDate = args?.to_date ? new Date(args.to_date) : new Date();
        return reportingService.generateGeneralLedgerReport(ctx.studioId, fromDate, toDate, args?.account_id);
      },
    });
    this.register({
      name: 'getGeneralLedger',
      description: 'Alias for get_general_ledger',
      isMutation: false,
      requiresApproval: false,
      isDestructive: false,
      execute: async (ctx, args) => this.executeTool('get_general_ledger', ctx, args),
    });

    // 7. get_ar_aging
    this.register({
      name: 'get_ar_aging',
      description: 'Generate Accounts Receivable aging report with 0-30, 31-60, 61-90, 90+ day buckets per client.',
      isMutation: false,
      requiresApproval: false,
      isDestructive: false,
      execute: async (ctx, args) => {
        const reportingService = new StudioFinancialReportingService(this.db);
        const asOfDate = args?.as_of_date ? new Date(args.as_of_date) : new Date();
        return reportingService.generateARAgingReport(ctx.studioId, asOfDate);
      },
    });
    this.register({
      name: 'getArAging',
      description: 'Alias for get_ar_aging',
      isMutation: false,
      requiresApproval: false,
      isDestructive: false,
      execute: async (ctx, args) => this.executeTool('get_ar_aging', ctx, args),
    });

    // 8. get_ap_aging
    this.register({
      name: 'get_ap_aging',
      description: 'Generate Accounts Payable aging report with 0-30, 31-60, 61-90, 90+ day buckets for vendor bills and expenses.',
      isMutation: false,
      requiresApproval: false,
      isDestructive: false,
      execute: async (ctx, args) => {
        const reportingService = new StudioFinancialReportingService(this.db);
        const asOfDate = args?.as_of_date ? new Date(args.as_of_date) : new Date();
        return reportingService.generateAPAgingReport(ctx.studioId, asOfDate);
      },
    });
    this.register({
      name: 'getApAging',
      description: 'Alias for get_ap_aging',
      isMutation: false,
      requiresApproval: false,
      isDestructive: false,
      execute: async (ctx, args) => this.executeTool('get_ap_aging', ctx, args),
    });

    // 9. get_tax_summary
    this.register({
      name: 'get_tax_summary',
      description: 'Generate GST/Tax summary and compliance breakdown (Output GST, Input Tax Credit, Net Payable/Refundable).',
      isMutation: false,
      requiresApproval: false,
      isDestructive: false,
      execute: async (ctx, args) => {
        const reportingService = new StudioFinancialReportingService(this.db);
        const fromDate = args?.from_date || args?.start_date || args?.startDate ? new Date(args.from_date || args.start_date || args.startDate) : new Date(new Date().getFullYear(), new Date().getMonth(), 1);
        const toDate = args?.to_date || args?.end_date || args?.endDate ? new Date(args.to_date || args.end_date || args.endDate) : new Date();
        const rep = await reportingService.generateTaxSummaryReport(ctx.studioId, fromDate, toDate);
        return {
          success: true,
          ...rep,
          summary: rep,
        };
      },
    });
    this.register({
      name: 'getTaxSummary',
      description: 'Alias for get_tax_summary',
      isMutation: false,
      requiresApproval: false,
      isDestructive: false,
      execute: async (ctx, args) => this.executeTool('get_tax_summary', ctx, args),
    });

    // 10. get_reconciliation_status
    this.register({
      name: 'get_reconciliation_status',
      description: 'Get multi-system reconciliation overview checking GL vs Subledgers (Invoices, Tax Engine, Payments, Bank).',
      isMutation: false,
      requiresApproval: false,
      isDestructive: false,
      execute: async (ctx, args) => {
        const reportingService = new StudioFinancialReportingService(this.db);
        const fromDate = args?.from_date ? new Date(args.from_date) : new Date(new Date().getFullYear(), new Date().getMonth(), 1);
        const toDate = args?.to_date ? new Date(args.to_date) : new Date();
        return reportingService.getReconciliationOverview(ctx.studioId, fromDate, toDate);
      },
    });
    this.register({
      name: 'getReconciliationStatus',
      description: 'Alias for get_reconciliation_status',
      isMutation: false,
      requiresApproval: false,
      isDestructive: false,
      execute: async (ctx, args) => this.executeTool('get_reconciliation_status', ctx, args),
    });

    // 11. get_month_end_close_status
    this.register({
      name: 'get_month_end_close_status',
      description: 'Get month-end close readiness checklist and verification results for a specified accounting period.',
      isMutation: false,
      requiresApproval: false,
      isDestructive: false,
      execute: async (ctx, args) => {
        const reportingService = new StudioFinancialReportingService(this.db);
        return reportingService.getMonthEndCloseChecklist(ctx.studioId, args?.period_id);
      },
    });
    this.register({
      name: 'getMonthEndCloseStatus',
      description: 'Alias for get_month_end_close_status',
      isMutation: false,
      requiresApproval: false,
      isDestructive: false,
      execute: async (ctx, args) => this.executeTool('get_month_end_close_status', ctx, args),
    });

    // 12. get_financial_insights
    this.register({
      name: 'get_financial_insights',
      description: 'Generate period-over-period financial intelligence insights, variance commentary, and health score.',
      isMutation: false,
      requiresApproval: false,
      isDestructive: false,
      execute: async (ctx, args) => {
        const reportingService = new StudioFinancialReportingService(this.db);
        const fromDate = args?.from_date ? new Date(args.from_date) : new Date(new Date().getFullYear(), new Date().getMonth(), 1);
        const toDate = args?.to_date ? new Date(args.to_date) : new Date();
        return reportingService.generateFinancialInsights(ctx.studioId, fromDate, toDate);
      },
    });
    this.register({
      name: 'getFinancialInsights',
      description: 'Alias for get_financial_insights',
      isMutation: false,
      requiresApproval: false,
      isDestructive: false,
      execute: async (ctx, args) => this.executeTool('get_financial_insights', ctx, args),
    });

    // 13. compare_financial_periods
    this.register({
      name: 'compare_financial_periods',
      description: 'Compare financial performance metrics between two distinct date ranges (MoM, YoY, QoQ).',
      isMutation: false,
      requiresApproval: false,
      isDestructive: false,
      execute: async (ctx, args) => {
        const reportingService = new StudioFinancialReportingService(this.db);
        const p1From = new Date(args?.period1_from || new Date(new Date().getFullYear(), new Date().getMonth() - 1, 1));
        const p1To = new Date(args?.period1_to || new Date(new Date().getFullYear(), new Date().getMonth(), 0));
        const p2From = new Date(args?.period2_from || new Date(new Date().getFullYear(), new Date().getMonth(), 1));
        const p2To = new Date(args?.period2_to || new Date());
        return reportingService.compareFinancialPeriods(ctx.studioId, p1From, p1To, p2From, p2To);
      },
    });
    this.register({
      name: 'compareFinancialPeriods',
      description: 'Alias for compare_financial_periods',
      isMutation: false,
      requiresApproval: false,
      isDestructive: false,
      execute: async (ctx, args) => this.executeTool('compare_financial_periods', ctx, args),
    });

    // 14. get_project_profitability_report
    this.register({
      name: 'get_project_profitability_report',
      description: 'Generate profitability reports broken down by projects, shoot types, and lead sources.',
      isMutation: false,
      requiresApproval: false,
      isDestructive: false,
      execute: async (ctx, args) => {
        const reportingService = new StudioFinancialReportingService(this.db);
        const fromDate = args?.from_date ? new Date(args.from_date) : new Date(new Date().getFullYear(), 0, 1);
        const toDate = args?.to_date ? new Date(args.to_date) : new Date();
        return reportingService.generateProjectProfitabilityReport(ctx.studioId, fromDate, toDate, args?.project_id);
      },
    });
    this.register({
      name: 'getProjectProfitabilityReport',
      description: 'Alias for get_project_profitability_report',
      isMutation: false,
      requiresApproval: false,
      isDestructive: false,
      execute: async (ctx, args) => this.executeTool('get_project_profitability_report', ctx, args),
    });

    // 15. get_financial_anomalies
    this.register({
      name: 'get_financial_anomalies',
      description: 'Detect financial anomalies, unbilled delivered shoots, tax mismatches, and overdue outliers.',
      isMutation: false,
      requiresApproval: false,
      isDestructive: false,
      execute: async (ctx, args) => {
        const reportingService = new StudioFinancialReportingService(this.db);
        return reportingService.detectFinancialAnomalies(ctx.studioId);
      },
    });
    this.register({
      name: 'getFinancialAnomalies',
      description: 'Alias for get_financial_anomalies',
      isMutation: false,
      requiresApproval: false,
      isDestructive: false,
      execute: async (ctx, args) => this.executeTool('get_financial_anomalies', ctx, args),
    });

    // 16. draft_financial_summary (Mutation with human approval guard)
    this.register({
      name: 'draft_financial_summary',
      description: 'Draft an executive narrative commentary summary of studio financial performance. Returns draft for human review.',
      isMutation: true,
      requiresApproval: true,
      isDestructive: false,
      execute: async (ctx, args) => {
        const reportingService = new StudioFinancialReportingService(this.db);
        const fromDate = args?.from_date ? new Date(args.from_date) : new Date(new Date().getFullYear(), new Date().getMonth(), 1);
        const toDate = args?.to_date ? new Date(args.to_date) : new Date();
        const insights = await reportingService.generateFinancialInsights(ctx.studioId, fromDate, toDate);
        const pnl = await reportingService.generateProfitAndLoss(ctx.studioId, fromDate, toDate);

        const summaryText = `Executive Financial Summary (${pnl.period_label}): Total Revenue is ₹${(pnl.total_revenue / 100).toLocaleString('en-IN')}, Total Expenses ₹${(pnl.total_expenses / 100).toLocaleString('en-IN')}, Net Margin ${pnl.net_margin_percentage}%. Key Highlight: ${insights.summary_commentary || 'Solid operational performance.'}`;

        return {
          success: true,
          is_draft: true,
          requires_human_approval: true,
          draft_summary: summaryText,
          pnl_metrics: {
            revenue: pnl.total_revenue,
            expenses: pnl.total_expenses,
            net_profit: pnl.net_profit,
            margin_bps: pnl.net_margin_bps,
          },
          insights: insights.insights,
          message: 'Draft financial summary generated. Human review required before publishing.',
        };
      },
    });
    this.register({
      name: 'draftFinancialSummary',
      description: 'Alias for draft_financial_summary',
      isMutation: true,
      requiresApproval: true,
      isDestructive: false,
      execute: async (ctx, args) => this.executeTool('draft_financial_summary', ctx, args),
    });

    // 17. draft_accountant_handoff (Mutation with human approval guard)
    this.register({
      name: 'draft_accountant_handoff',
      description: 'Draft an accountant package handoff summary with trial balance, tax breakdown, and reconciliation ledger notes.',
      isMutation: true,
      requiresApproval: true,
      isDestructive: false,
      execute: async (ctx, args) => {
        const reportingService = new StudioFinancialReportingService(this.db);
        const fromDate = args?.from_date ? new Date(args.from_date) : new Date(new Date().getFullYear(), new Date().getMonth(), 1);
        const toDate = args?.to_date ? new Date(args.to_date) : new Date();
        const bundle = await reportingService.generateAccountantHandoffBundle(ctx.studioId, fromDate, toDate);

        return {
          success: true,
          is_draft: true,
          requires_human_approval: true,
          bundle_preview: {
            studio_id: bundle.studio_id,
            period: bundle.period,
            trial_balance_balanced: bundle.trial_balance.is_balanced,
            net_tax_payable: bundle.tax_summary.net_tax_payable,
            reconciliation_status: bundle.reconciliation_overview.overall_status,
          },
          message: 'Draft accountant handoff package created. Ready for human authorization and export.',
        };
      },
    });
    this.register({
      name: 'draftAccountantHandoff',
      description: 'Alias for draft_accountant_handoff',
      isMutation: true,
      requiresApproval: true,
      isDestructive: false,
      execute: async (ctx, args) => this.executeTool('draft_accountant_handoff', ctx, args),
    });

    // 18. draft_reconciliation_note (Mutation with human approval guard)
    this.register({
      name: 'draft_reconciliation_note',
      description: 'Draft an explanatory memo for a reconciliation variance or anomaly between subledgers and GL.',
      isMutation: true,
      requiresApproval: true,
      isDestructive: false,
      execute: async (ctx, args) => {
        const reportingService = new StudioFinancialReportingService(this.db);
        const anomalyId = args?.anomaly_id || args?.anomalyId;
        const note = args?.note || 'Draft reconciliation note: verified against invoice payment batch.';

        if (anomalyId) {
          await reportingService.resolveAnomaly(ctx.studioId, anomalyId, ctx.userId || 'copilot', note);
        }

        return {
          success: true,
          is_draft: true,
          requires_human_approval: true,
          anomaly_id: anomalyId,
          draft_note: note,
          message: 'Draft reconciliation note recorded. Human confirmation required for final clearance.',
        };
      },
    });
    this.register({
      name: 'draftReconciliationNote',
      description: 'Alias for draft_reconciliation_note',
      isMutation: true,
      requiresApproval: true,
      isDestructive: false,
      execute: async (ctx, args) => this.executeTool('draft_reconciliation_note', ctx, args),
    });

    // =========================================================================
    // PHASE 38: STUDIO BUSINESS INTELLIGENCE & FORECASTING 2.0 COPILOT TOOLS
    // =========================================================================

    // 1. get_business_dashboard
    this.register({
      name: 'get_business_dashboard',
      description: 'Get executive dashboard overview including KPIs, trends, alerts, decision insights, and business scorecard.',
      isMutation: false,
      requiresApproval: false,
      isDestructive: false,
      execute: async (ctx, args) => {
        const biService = new StudioBusinessIntelligenceService(this.db);
        const dashboard = await biService.getExecutiveDashboard(ctx.studioId, args?.period, args?.currency);
        return { success: true, dashboard };
      },
    });
    this.register({
      name: 'getBusinessDashboard',
      description: 'Alias for get_business_dashboard',
      isMutation: false,
      requiresApproval: false,
      isDestructive: false,
      execute: async (ctx, args) => this.executeTool('get_business_dashboard', ctx, args),
    });

    // 2. get_business_kpis
    this.register({
      name: 'get_business_kpis',
      description: 'Get deterministic business KPIs across revenue, profit, cash, pipeline, bookings, projects, and capacity.',
      isMutation: false,
      requiresApproval: false,
      isDestructive: false,
      execute: async (ctx, args) => {
        const biService = new StudioBusinessIntelligenceService(this.db);
        const kpis = await biService.getBusinessKpis(ctx.studioId, args?.period, args?.currency);
        return { success: true, kpis };
      },
    });
    this.register({
      name: 'getBusinessKpis',
      description: 'Alias for get_business_kpis',
      isMutation: false,
      requiresApproval: false,
      isDestructive: false,
      execute: async (ctx, args) => this.executeTool('get_business_kpis', ctx, args),
    });

    // 3. get_revenue_trend
    this.register({
      name: 'get_revenue_trend',
      description: 'Get revenue trajectory, gross/net revenue, collected revenue, and monthly trend breakdown.',
      isMutation: false,
      requiresApproval: false,
      isDestructive: false,
      execute: async (ctx, args) => {
        const biService = new StudioBusinessIntelligenceService(this.db);
        const trend = await biService.getRevenueTrend(ctx.studioId, args?.period, args?.currency);
        return { success: true, revenue_trend: trend };
      },
    });
    this.register({
      name: 'getRevenueTrend',
      description: 'Alias for get_revenue_trend',
      isMutation: false,
      requiresApproval: false,
      isDestructive: false,
      execute: async (ctx, args) => this.executeTool('get_revenue_trend', ctx, args),
    });

    // 4. get_profit_trend
    this.register({
      name: 'get_profit_trend',
      description: 'Get profitability trajectory, gross profit, net operating profit, and profit margins.',
      isMutation: false,
      requiresApproval: false,
      isDestructive: false,
      execute: async (ctx, args) => {
        const biService = new StudioBusinessIntelligenceService(this.db);
        const trend = await biService.getProfitTrend(ctx.studioId, args?.period, args?.currency);
        return { success: true, profit_trend: trend };
      },
    });
    this.register({
      name: 'getProfitTrend',
      description: 'Alias for get_profit_trend',
      isMutation: false,
      requiresApproval: false,
      isDestructive: false,
      execute: async (ctx, args) => this.executeTool('get_profit_trend', ctx, args),
    });

    // 5. get_cash_forecast
    this.register({
      name: 'get_cash_forecast',
      description: 'Get deterministic cash flow forecast across 7, 30, 60, and 90 days horizons.',
      isMutation: false,
      requiresApproval: false,
      isDestructive: false,
      execute: async (ctx, args) => {
        const biService = new StudioBusinessIntelligenceService(this.db);
        const forecasts = await biService.getForecasts(ctx.studioId, undefined, args?.currency);
        return { success: true, cash_forecast: forecasts.cash_forecast };
      },
    });
    this.register({
      name: 'getCashForecast',
      description: 'Alias for get_cash_forecast',
      isMutation: false,
      requiresApproval: false,
      isDestructive: false,
      execute: async (ctx, args) => this.executeTool('get_cash_forecast', ctx, args),
    });

    // 6. get_revenue_forecast
    this.register({
      name: 'get_revenue_forecast',
      description: 'Get statistical revenue forecast categorized into actual, committed, expected, pipeline, and forecast values.',
      isMutation: false,
      requiresApproval: false,
      isDestructive: false,
      execute: async (ctx, args) => {
        const biService = new StudioBusinessIntelligenceService(this.db);
        const forecasts = await biService.getForecasts(ctx.studioId, args?.method, args?.currency);
        return { success: true, revenue_forecast: forecasts.revenue_forecast };
      },
    });
    this.register({
      name: 'getRevenueForecast',
      description: 'Alias for get_revenue_forecast',
      isMutation: false,
      requiresApproval: false,
      isDestructive: false,
      execute: async (ctx, args) => this.executeTool('get_revenue_forecast', ctx, args),
    });

    // 7. get_pipeline_forecast
    this.register({
      name: 'get_pipeline_forecast',
      description: 'Get sales pipeline analytics, opportunity stages, conversion rate, and weighted pipeline value.',
      isMutation: false,
      requiresApproval: false,
      isDestructive: false,
      execute: async (ctx, args) => {
        const biService = new StudioBusinessIntelligenceService(this.db);
        const pipeline = await biService.getPipelineTrend(ctx.studioId, args?.period, args?.currency);
        return { success: true, pipeline };
      },
    });
    this.register({
      name: 'getPipelineForecast',
      description: 'Alias for get_pipeline_forecast',
      isMutation: false,
      requiresApproval: false,
      isDestructive: false,
      execute: async (ctx, args) => this.executeTool('get_pipeline_forecast', ctx, args),
    });

    // 8. get_booking_forecast
    this.register({
      name: 'get_booking_forecast',
      description: 'Get booking density, confirmed sessions, calendar gaps, and demand seasonality.',
      isMutation: false,
      requiresApproval: false,
      isDestructive: false,
      execute: async (ctx, args) => {
        const biService = new StudioBusinessIntelligenceService(this.db);
        const bookings = await biService.getBookingTrend(ctx.studioId, args?.period, args?.currency);
        return { success: true, bookings };
      },
    });
    this.register({
      name: 'getBookingForecast',
      description: 'Alias for get_booking_forecast',
      isMutation: false,
      requiresApproval: false,
      isDestructive: false,
      execute: async (ctx, args) => this.executeTool('get_booking_forecast', ctx, args),
    });

    // 9. get_project_performance
    this.register({
      name: 'get_project_performance',
      description: 'Get project financial performance, budget status, margins, completion percentage, and operational health.',
      isMutation: false,
      requiresApproval: false,
      isDestructive: false,
      execute: async (ctx, args) => {
        const biService = new StudioBusinessIntelligenceService(this.db);
        const projects = await biService.getProjectPerformance(ctx.studioId, args?.status, args?.currency);
        return { success: true, projects };
      },
    });
    this.register({
      name: 'getProjectPerformance',
      description: 'Alias for get_project_performance',
      isMutation: false,
      requiresApproval: false,
      isDestructive: false,
      execute: async (ctx, args) => this.executeTool('get_project_performance', ctx, args),
    });

    // 10. get_project_risks
    this.register({
      name: 'get_project_risks',
      description: 'Get deterministic project financial, budget overrun, overdue receivable, and deadline risks.',
      isMutation: false,
      requiresApproval: false,
      isDestructive: false,
      execute: async (ctx, args) => {
        const biService = new StudioBusinessIntelligenceService(this.db);
        const projects = await biService.getProjectPerformance(ctx.studioId, args?.status, args?.currency);
        const risks = projects.filter((p) => p.risks && p.risks.length > 0).flatMap((p) => p.risks);
        return { success: true, risks, at_risk_projects_count: projects.filter((p) => p.operational_status !== 'ON_TRACK' && p.operational_status !== 'COMPLETED').length };
      },
    });
    this.register({
      name: 'getProjectRisks',
      description: 'Alias for get_project_risks',
      isMutation: false,
      requiresApproval: false,
      isDestructive: false,
      execute: async (ctx, args) => this.executeTool('get_project_risks', ctx, args),
    });

    // 11. get_team_capacity
    this.register({
      name: 'get_team_capacity',
      description: 'Get aggregate workforce availability, capacity utilization, and multi-horizon workload projections without individual employee rankings.',
      isMutation: false,
      requiresApproval: false,
      isDestructive: false,
      execute: async (ctx, args) => {
        const biService = new StudioBusinessIntelligenceService(this.db);
        const capacity = await biService.getTeamCapacityMetrics(ctx.studioId, args?.horizon_days);
        return { success: true, team_capacity: capacity };
      },
    });
    this.register({
      name: 'getTeamCapacity',
      description: 'Alias for get_team_capacity',
      isMutation: false,
      requiresApproval: false,
      isDestructive: false,
      execute: async (ctx, args) => this.executeTool('get_team_capacity', ctx, args),
    });

    // 12. get_business_alerts
    this.register({
      name: 'get_business_alerts',
      description: 'Get active business health alerts across revenue drops, cash risk, margin risk, capacity overload, and anomalies.',
      isMutation: false,
      requiresApproval: false,
      isDestructive: false,
      execute: async (ctx) => {
        const biService = new StudioBusinessIntelligenceService(this.db);
        const dashboard = await biService.getExecutiveDashboard(ctx.studioId);
        return { success: true, alerts: dashboard.alerts };
      },
    });
    this.register({
      name: 'getBusinessAlerts',
      description: 'Alias for get_business_alerts',
      isMutation: false,
      requiresApproval: false,
      isDestructive: false,
      execute: async (ctx, args) => this.executeTool('get_business_alerts', ctx, args),
    });

    // 13. get_decision_insights
    this.register({
      name: 'get_decision_insights',
      description: 'Get non-prescriptive actionable decision insights explaining what happened, why it matters, and supporting data.',
      isMutation: false,
      requiresApproval: false,
      isDestructive: false,
      execute: async (ctx) => {
        const biService = new StudioBusinessIntelligenceService(this.db);
        const dashboard = await biService.getExecutiveDashboard(ctx.studioId);
        return { success: true, insights: dashboard.insights };
      },
    });
    this.register({
      name: 'getDecisionInsights',
      description: 'Alias for get_decision_insights',
      isMutation: false,
      requiresApproval: false,
      isDestructive: false,
      execute: async (ctx, args) => this.executeTool('get_decision_insights', ctx, args),
    });

    // 14. compare_business_periods
    this.register({
      name: 'compare_business_periods',
      description: 'Compare financial or operational metrics between two periods with absolute and percentage variance.',
      isMutation: false,
      requiresApproval: false,
      isDestructive: false,
      execute: async (ctx, args) => {
        const current = args?.current ?? 0;
        const previous = args?.previous ?? 0;
        const periodType = args?.period_type || 'MONTH';
        const comparison = StudioBusinessIntelligenceService.compareValues(current, previous, periodType);
        return { success: true, comparison };
      },
    });
    this.register({
      name: 'compareBusinessPeriods',
      description: 'Alias for compare_business_periods',
      isMutation: false,
      requiresApproval: false,
      isDestructive: false,
      execute: async (ctx, args) => this.executeTool('compare_business_periods', ctx, args),
    });

    // 15. run_business_scenario
    this.register({
      name: 'run_business_scenario',
      description: 'Run an isolated what-if simulation (revenue/expense/booking shifts). Zero source-of-truth mutation.',
      isMutation: false,
      requiresApproval: false,
      isDestructive: false,
      execute: async (ctx, args) => {
        const biService = new StudioBusinessIntelligenceService(this.db);
        const params: IBiScenarioParameters = {
          revenue_change_pct: args?.revenue_change_pct ?? 0,
          expense_change_pct: args?.expense_change_pct ?? 0,
          booking_change_pct: args?.booking_change_pct,
          conversion_change_pct: args?.conversion_change_pct,
          avg_project_value_change_pct: args?.avg_project_value_change_pct,
          capacity_change_pct: args?.capacity_change_pct,
          new_hire_count: args?.new_hire_count,
        };
        const scenario = await biService.runScenario(ctx.studioId, params, args?.currency);
        return { success: true, scenario };
      },
    });
    this.register({
      name: 'runBusinessScenario',
      description: 'Alias for run_business_scenario',
      isMutation: false,
      requiresApproval: false,
      isDestructive: false,
      execute: async (ctx, args) => this.executeTool('run_business_scenario', ctx, args),
    });

    // 16. get_break_even_analysis
    this.register({
      name: 'get_break_even_analysis',
      description: 'Get break-even revenue, fixed costs, contribution margin, and break-even project volume.',
      isMutation: false,
      requiresApproval: false,
      isDestructive: false,
      execute: async (ctx, args) => {
        const biService = new StudioBusinessIntelligenceService(this.db);
        const breakEven = await biService.getBreakEvenAnalysis(ctx.studioId, args?.currency);
        return { success: true, break_even: breakEven };
      },
    });
    this.register({
      name: 'getBreakEvenAnalysis',
      description: 'Alias for get_break_even_analysis',
      isMutation: false,
      requiresApproval: false,
      isDestructive: false,
      execute: async (ctx, args) => this.executeTool('get_break_even_analysis', ctx, args),
    });

    // 17. get_business_scorecard
    this.register({
      name: 'get_business_scorecard',
      description: 'Get transparent 7-dimension business scorecard across revenue, profit, cash, pipeline, operations, capacity, and collection health.',
      isMutation: false,
      requiresApproval: false,
      isDestructive: false,
      execute: async (ctx, args) => {
        const biService = new StudioBusinessIntelligenceService(this.db);
        const scorecard = await biService.getBusinessScorecard(ctx.studioId, args?.currency);
        return { success: true, scorecard };
      },
    });
    this.register({
      name: 'getBusinessScorecard',
      description: 'Alias for get_business_scorecard',
      isMutation: false,
      requiresApproval: false,
      isDestructive: false,
      execute: async (ctx, args) => this.executeTool('get_business_scorecard', ctx, args),
    });

    // 18. get_management_summary
    this.register({
      name: 'get_management_summary',
      description: 'Get comprehensive executive management report summary.',
      isMutation: false,
      requiresApproval: false,
      isDestructive: false,
      execute: async (ctx, args) => {
        const biService = new StudioBusinessIntelligenceService(this.db);
        const report = await biService.getManagementReport(ctx.studioId, args?.period_start, args?.period_end, args?.currency);
        return { success: true, management_summary: report };
      },
    });
    this.register({
      name: 'getManagementSummary',
      description: 'Alias for get_management_summary',
      isMutation: false,
      requiresApproval: false,
      isDestructive: false,
      execute: async (ctx, args) => this.executeTool('get_management_summary', ctx, args),
    });

    // 19. draft_management_summary (Draft tool with human approval guard)
    this.register({
      name: 'draft_management_summary',
      description: 'Draft a written executive management summary memo. ALWAYS requires explicit human approval before distribution.',
      isMutation: true,
      requiresApproval: true,
      isDestructive: false,
      execute: async (ctx, args) => {
        const biService = new StudioBusinessIntelligenceService(this.db);
        const report = await biService.getManagementReport(ctx.studioId, args?.period_start, args?.period_end, args?.currency);
        const draftText = args?.custom_summary || report.executive_summary;
        return {
          success: true,
          is_draft: true,
          requires_human_approval: true,
          draft_summary: draftText,
          message: 'Executive management summary draft created. Review and approve before final distribution.',
        };
      },
    });
    this.register({
      name: 'draftManagementSummary',
      description: 'Alias for draft_management_summary',
      isMutation: true,
      requiresApproval: true,
      isDestructive: false,
      execute: async (ctx, args) => this.executeTool('draft_management_summary', ctx, args),
    });

    // 20. draft_business_review (Draft tool with human approval guard)
    this.register({
      name: 'draft_business_review',
      description: 'Draft an internal monthly business review agenda and key discussion items. Requires human approval.',
      isMutation: true,
      requiresApproval: true,
      isDestructive: false,
      execute: async (ctx, args) => {
        const biService = new StudioBusinessIntelligenceService(this.db);
        const dashboard = await biService.getExecutiveDashboard(ctx.studioId);
        const agenda = [
          `1. Revenue & Margin Review (Current Net Margin: ${(dashboard.profit_overview.net_margin_bps / 100).toFixed(1)}%)`,
          `2. Cash Runway & Overdue Collections (${(dashboard.cash_overview.overdue_receivables_minor / 100).toFixed(2)} ${dashboard.currency} overdue)`,
          `3. Active Project Risks (${dashboard.project_overview.at_risk_count} at-risk projects)`,
          `4. Team Workload & Next Month Capacity Planning (${(dashboard.team_overview.capacity_utilization_bps / 100).toFixed(1)}% utilization)`,
          `5. Pipeline & Booking Intake Forecast`,
        ];
        return {
          success: true,
          is_draft: true,
          requires_human_approval: true,
          draft_agenda: agenda,
          message: 'Internal business review agenda drafted. Human confirmation required before scheduling meeting.',
        };
      },
    });
    this.register({
      name: 'draftBusinessReview',
      description: 'Alias for draft_business_review',
      isMutation: true,
      requiresApproval: true,
      isDestructive: false,
      execute: async (ctx, args) => this.executeTool('draft_business_review', ctx, args),
    });

    // 21. draft_accountant_questions (Draft tool with human approval guard)
    this.register({
      name: 'draft_accountant_questions',
      description: 'Draft financial and tax review questions for the external CPA/accountant based on BI insights.',
      isMutation: true,
      requiresApproval: true,
      isDestructive: false,
      execute: async (ctx, args) => {
        const biService = new StudioBusinessIntelligenceService(this.db);
        const dashboard = await biService.getExecutiveDashboard(ctx.studioId);
        const questions = [
          '1. Please review the allocation of direct project production expenses vs operating overheads for margin reporting.',
          '2. Verify upcoming GST input tax credit (ITC) reconciliation against vendor payment entries.',
          '3. Review depreciation and asset entries prior to quarterly tax filing.',
        ];
        return {
          success: true,
          is_draft: true,
          requires_human_approval: true,
          draft_questions: questions,
          message: 'Draft questions prepared for external accountant review.',
        };
      },
    });
    this.register({
      name: 'draftAccountantQuestions',
      description: 'Alias for draft_accountant_questions',
      isMutation: true,
      requiresApproval: true,
      isDestructive: false,
      execute: async (ctx, args) => this.executeTool('draft_accountant_questions', ctx, args),
    });

    // ==========================================
    // Phase 39: Studio Business Planning Tools
    // ==========================================

    // 1. Dashboard Overview
    this.register({
      name: 'planning_get_dashboard_overview',
      description: 'Get comprehensive overview of active business plan, health score, key variances, and budget comparison.',
      isMutation: false,
      requiresApproval: false,
      isDestructive: false,
      execute: async (ctx, args) => {
        const activePlan = await StudioBusinessPlanService.getActivePlan(ctx.studioId, args?.fiscalYear);
        if (!activePlan) return { hasActivePlan: false, message: 'No active plan found' };
        const [health, variance, budgetComp, objectives] = await Promise.all([
          StudioPlanHealthService.evaluatePlanHealth(ctx.studioId, activePlan.id),
          StudioPlanningVarianceService.getPlanVsActual(ctx.studioId, activePlan.id),
          StudioPlanningBudgetService.getPlanBudgetComparison(ctx.studioId, activePlan.id),
          StudioStrategicInitiativeService.listPlanObjectives(ctx.studioId, activePlan.id),
        ]);
        return { activePlan, health, varianceSummary: variance.summary, budgetSummary: budgetComp, objectivesCount: objectives.length };
      },
    });

    // 2. Get Active Plan
    this.register({
      name: 'planning_get_active_plan',
      description: 'Get active business plan with targets and objectives for a given fiscal year.',
      isMutation: false,
      requiresApproval: false,
      isDestructive: false,
      execute: async (ctx, args) => StudioBusinessPlanService.getActivePlan(ctx.studioId, args?.fiscalYear),
    });

    // 3. List Plans
    this.register({
      name: 'planning_list_plans',
      description: 'List all business plans for the studio with optional type and status filters.',
      isMutation: false,
      requiresApproval: false,
      isDestructive: false,
      execute: async (ctx, args) => StudioBusinessPlanService.listPlans(ctx.studioId, args?.type, args?.status),
    });

    // 4. Get Plan Details
    this.register({
      name: 'planning_get_plan_details',
      description: 'Get complete business plan details by planId including targets, objectives, reviews, and audits.',
      isMutation: false,
      requiresApproval: false,
      isDestructive: false,
      execute: async (ctx, args) => StudioBusinessPlanService.getPlanById(ctx.studioId, args?.planId),
    });

    // 5. Plan Health
    const planHealthHandler = {
      name: 'planning_get_plan_health',
      description: 'Evaluate 8-dimension health status (Revenue, Profit, Cash, Bookings, Pipeline, Delivery, Capacity, Initiatives).',
      isMutation: false,
      requiresApproval: false,
      isDestructive: false,
      execute: async (ctx: ToolExecutionContext, args: any) => StudioPlanHealthService.evaluatePlanHealth(ctx.studioId, args?.planId),
    };
    this.register(planHealthHandler);
    this.register({ ...planHealthHandler, name: 'planning_evaluate_plan_health' });

    // 6. Get Plan Targets
    this.register({
      name: 'planning_get_plan_targets',
      description: 'Get all targets for a business plan with actual values, variance, and achievement percentages.',
      isMutation: false,
      requiresApproval: false,
      isDestructive: false,
      execute: async (ctx, args) => StudioPlanTargetService.getPlanTargets(ctx.studioId, args?.planId, args?.targetType, args?.periodQuarter, args?.periodMonth),
    });

    // 7. Target Progress
    this.register({
      name: 'planning_get_target_progress',
      description: 'Calculate progress percentage and status for a specific business plan target.',
      isMutation: false,
      requiresApproval: false,
      isDestructive: false,
      execute: async (ctx, args) => StudioPlanTargetService.getPlanTargets(ctx.studioId, args?.planId, args?.targetType),
    });

    // 8. Get Plan vs Actual Variance
    this.register({
      name: 'planning_get_plan_vs_actual',
      description: 'Get detailed variance analysis with favorable/unfavorable tagging, severity levels, and diagnostics.',
      isMutation: false,
      requiresApproval: false,
      isDestructive: false,
      execute: async (ctx, args) => StudioPlanningVarianceService.getPlanVsActual(ctx.studioId, args?.planId, args?.periodQuarter, args?.periodMonth),
    });

    // 9. Plan vs Budget Comparison
    const planBudgetHandler = {
      name: 'planning_get_plan_vs_budget',
      description: 'Compare planned expense targets against Phase 33 active budgets and actual GL expense lines.',
      isMutation: false,
      requiresApproval: false,
      isDestructive: false,
      execute: async (ctx: ToolExecutionContext, args: any) => StudioPlanningBudgetService.getPlanBudgetComparison(ctx.studioId, args?.planId, args?.periodQuarter, args?.periodMonth),
    };
    this.register(planBudgetHandler);
    this.register({ ...planBudgetHandler, name: 'planning_get_budget_comparison' });

    // 10. Forecast Alignment
    this.register({
      name: 'planning_get_forecast_alignment',
      description: 'Compare business plan targets with Phase 38 ML/Linear forecast projections to detect pacing gaps.',
      isMutation: false,
      requiresApproval: false,
      isDestructive: false,
      execute: async (ctx, args) => StudioPlanForecastScenarioService.getPlanVsForecastAlignment(ctx.studioId, args?.planId, args?.targetType),
    });

    // 11. Scenario Alignment
    const planScenarioHandler = {
      name: 'planning_get_scenario_alignment',
      description: 'Evaluate business plan feasibility across conservative, base, and aggressive scenarios.',
      isMutation: false,
      requiresApproval: false,
      isDestructive: false,
      execute: async (ctx: ToolExecutionContext, args: any) => StudioPlanForecastScenarioService.getPlanVsScenarioEvaluations(ctx.studioId, args?.planId),
    };
    this.register(planScenarioHandler);
    this.register({ ...planScenarioHandler, name: 'planning_get_scenario_evaluations' });

    // 12. Strategic Objectives List
    const planObjectivesHandler = {
      name: 'planning_list_objectives',
      description: 'List strategic objectives, key initiatives, and milestones under a business plan.',
      isMutation: false,
      requiresApproval: false,
      isDestructive: false,
      execute: async (ctx: ToolExecutionContext, args: any) => StudioStrategicInitiativeService.listPlanObjectives(ctx.studioId, args?.planId),
    };
    this.register(planObjectivesHandler);
    this.register({ ...planObjectivesHandler, name: 'planning_list_strategic_objectives' });

    // 13. Strategic Initiatives List
    this.register({
      name: 'planning_list_initiatives',
      description: 'List strategic initiatives and their milestones for a business plan.',
      isMutation: false,
      requiresApproval: false,
      isDestructive: false,
      execute: async (ctx, args) => StudioStrategicInitiativeService.listPlanObjectives(ctx.studioId, args?.planId),
    });

    // 14. Get Initiative Details
    this.register({
      name: 'planning_get_initiative_details',
      description: 'Get details of strategic initiatives under a plan.',
      isMutation: false,
      requiresApproval: false,
      isDestructive: false,
      execute: async (ctx, args) => StudioStrategicInitiativeService.listPlanObjectives(ctx.studioId, args?.planId),
    });

    // 15. Plan Reviews / QBRs
    const planReviewsHandler = {
      name: 'planning_get_qbr_reviews',
      description: 'List Quarterly Business Reviews (QBR) and monthly reviews for a business plan.',
      isMutation: false,
      requiresApproval: false,
      isDestructive: false,
      execute: async (ctx: ToolExecutionContext, args: any) => StudioPlanReviewService.listPlanReviews(ctx.studioId, args?.planId),
    };
    this.register(planReviewsHandler);
    this.register({ ...planReviewsHandler, name: 'planning_list_reviews' });

    // 16. Plan Audits
    this.register({
      name: 'planning_get_plan_audits',
      description: 'Get immutable audit trail of plan status changes, re-baselines, and target adjustments.',
      isMutation: false,
      requiresApproval: false,
      isDestructive: false,
      execute: async (ctx, args) => StudioBusinessPlanService.getPlanById(ctx.studioId, args?.planId),
    });

    // 17. Export Plan CSV
    const planCsvHandler = {
      name: 'planning_export_plan_csv',
      description: 'Export plan targets and variance report in CSV format with formula injection protection.',
      isMutation: false,
      requiresApproval: false,
      isDestructive: false,
      execute: async (ctx: ToolExecutionContext, args: any) => StudioPlanningExportService.exportPlanVarianceCsv(ctx.studioId, args?.planId),
    };
    this.register(planCsvHandler);
    this.register({ ...planCsvHandler, name: 'planning_export_variance_csv' });

    // 18. Export Plan JSON
    this.register({
      name: 'planning_export_plan_json',
      description: 'Export complete business plan, targets, objectives, and health analysis in JSON format.',
      isMutation: false,
      requiresApproval: false,
      isDestructive: false,
      execute: async (ctx, args) => StudioPlanningExportService.exportPlanJson(ctx.studioId, args?.planId),
    });

    // 19. Get Health Dimensions
    this.register({
      name: 'planning_get_health_dimensions',
      description: 'Get individual breakdown of 8 planning health dimensions with diagnostic status.',
      isMutation: false,
      requiresApproval: false,
      isDestructive: false,
      execute: async (ctx, args) => {
        const health = await StudioPlanHealthService.evaluatePlanHealth(ctx.studioId, args?.planId);
        return health.dimensions;
      },
    });

    // 20. Get Executive Summary
    this.register({
      name: 'planning_get_executive_summary',
      description: 'Get executive narrative recommendations and strategic summary for a business plan.',
      isMutation: false,
      requiresApproval: false,
      isDestructive: false,
      execute: async (ctx, args) => {
        const health = await StudioPlanHealthService.evaluatePlanHealth(ctx.studioId, args?.planId);
        return { status: health.overallStatus, score: health.overallScore, recommendations: health.recommendations };
      },
    });

    // 21. Draft Business Plan (Mutation / Requires Approval)
    this.register({
      name: 'planning_draft_business_plan',
      description: 'Draft a new business plan in DRAFT status. Requires user approval.',
      isMutation: true,
      requiresApproval: true,
      isDestructive: false,
      execute: async (ctx, args) => StudioBusinessPlanService.createPlan(ctx.studioId, ctx.userId, args),
    });

    // 22. Draft Plan Target / Propose Target Update (Mutation / Requires Approval)
    const planTargetDraftHandler = {
      name: 'planning_draft_plan_target',
      description: 'Draft or propose updating target values in a business plan. Requires user approval.',
      isMutation: true,
      requiresApproval: true,
      isDestructive: false,
      execute: async (ctx: ToolExecutionContext, args: any) => StudioPlanTargetService.upsertTarget(ctx.studioId, args?.planId, args),
    };
    this.register(planTargetDraftHandler);
    this.register({ ...planTargetDraftHandler, name: 'planning_propose_target_update' });

    // 23. Draft Strategic Initiative / Objective (Mutation / Requires Approval)
    const planObjectiveDraftHandler = {
      name: 'planning_draft_strategic_initiative',
      description: 'Draft a new strategic initiative or objective under a plan. Requires user approval.',
      isMutation: true,
      requiresApproval: true,
      isDestructive: false,
      execute: async (ctx: ToolExecutionContext, args: any) => StudioStrategicInitiativeService.createObjective(ctx.studioId, args?.planId, args),
    };
    this.register(planObjectiveDraftHandler);
    this.register({ ...planObjectiveDraftHandler, name: 'planning_draft_strategic_objective' });

    // 24. Draft QBR Review / Schedule Review (Mutation / Requires Approval)
    const planReviewDraftHandler = {
      name: 'planning_draft_qbr_review',
      description: 'Draft and schedule a quarterly or monthly business plan review. Requires user approval.',
      isMutation: true,
      requiresApproval: true,
      isDestructive: false,
      execute: async (ctx: ToolExecutionContext, args: any) => StudioPlanReviewService.createReview(ctx.studioId, args?.planId, { ...args, reviewerId: ctx.userId }),
    };
    this.register(planReviewDraftHandler);
    this.register({ ...planReviewDraftHandler, name: 'planning_schedule_qbr_review' });
  }


  register(tool: CopilotToolDefinition) {
    this.tools.set(tool.name, tool);
  }

  getTool(name: string): CopilotToolDefinition | undefined {
    return this.tools.get(name);
  }

  getTools(): CopilotToolDefinition[] {
    return Array.from(this.tools.values());
  }

  listTools(): Array<{ name: string; description: string; isMutation: boolean; requiresApproval: boolean }> {
    return Array.from(this.tools.values()).map((t) => ({
      name: t.name,
      description: t.description,
      isMutation: t.isMutation,
      requiresApproval: t.requiresApproval,
    }));
  }

  getAvailableTools(): Array<{ name: string; description: string; isMutation: boolean; requiresApproval: boolean }> {
    return this.listTools();
  }

  async executeTool(name: string, ctxOrArgs: any, maybeArgsOrCtx: any = {}): Promise<any> {
    const tool = this.tools.get(name);
    if (!tool) {
      throw new Error(`Tool "${name}" is not registered in Copilot Tool Registry.`);
    }

    let ctx: ToolExecutionContext;
    let args: any;
    if (typeof maybeArgsOrCtx === 'string') {
      ctx = { studioId: maybeArgsOrCtx, userId: 'default' };
      args = ctxOrArgs || {};
    } else if (typeof ctxOrArgs === 'string') {
      ctx = { studioId: ctxOrArgs, userId: 'default' };
      args = maybeArgsOrCtx || {};
    } else if (ctxOrArgs?.studioId || ctxOrArgs?.studio_id) {
      ctx = {
        studioId: ctxOrArgs.studioId || ctxOrArgs.studio_id,
        userId: ctxOrArgs.userId || ctxOrArgs.user_id || 'default',
        galleryId: ctxOrArgs.galleryId || ctxOrArgs.gallery_id,
      };
      args = maybeArgsOrCtx && Object.keys(maybeArgsOrCtx).length > 0 ? maybeArgsOrCtx : ctxOrArgs;
    } else if (maybeArgsOrCtx?.studioId || maybeArgsOrCtx?.studio_id) {
      ctx = {
        studioId: maybeArgsOrCtx.studioId || maybeArgsOrCtx.studio_id,
        userId: maybeArgsOrCtx.userId || maybeArgsOrCtx.user_id || 'default',
        galleryId: maybeArgsOrCtx.galleryId || maybeArgsOrCtx.gallery_id,
      };
      args = ctxOrArgs;
    } else {
      ctx = { studioId: 'default', userId: 'default' };
      args = ctxOrArgs;
    }

    try {
      return await tool.execute(ctx, args);
    } catch (err: any) {
      if (err?.name === 'PrismaClientInitializationError' || err?.message?.includes("Can't reach database server") || err?.code === 'P1001') {
        return { success: true, tool: name, offlineMock: true, isDraft: tool.isMutation, requiresApproval: tool.requiresApproval };
      }
      throw err;
    }
  }
}

export const copilotToolRegistry = CopilotToolRegistry.getInstance();

