/**
 * Client Journey Service — PIXMatch AI Phase 17
 * Evaluates and manages deterministic client journey stage transitions based on verified platform events.
 * Never infers stage without supporting product activity data.
 */

import { prisma } from '@pixmatch/database';
import {
  ClientJourneyStateDTO,
  ClientJourneyStage,
} from '@pixmatch/types';

export class ClientJourneyService {
  private db: any;

  constructor(dbClient?: any) {
    this.db = dbClient || prisma;
  }

  private static defaultInstance = new ClientJourneyService();

  static async evaluateJourneyStage(studioId: string, clientId: string): Promise<ClientJourneyStateDTO> {
    return this.defaultInstance.evaluateJourneyStage(studioId, clientId);
  }

  /**
   * Return client detection: Strictly studio-scoped verification of repeat business.
   * Zero cross-studio lookups, zero biometric face-matching.
   */
  async checkAndMarkReturnClient(
    studioId: string,
    clientId: string
  ): Promise<{ isRepeatClient: boolean; completedGalleries: number; totalGalleries: number; galleryTitles: string[] }> {
    const client = await this.db.client.findFirst({
      where: { id: clientId, studio_id: studioId },
      include: {
        galleries: {
          include: { gallery: true },
        },
      },
    });

    if (!client) {
      return { isRepeatClient: false, completedGalleries: 0, totalGalleries: 0, galleryTitles: [] };
    }

    let assignedGalleries = client.galleries || [];
    if (assignedGalleries.length === 0 && this.db.clientGalleryAssignment?.findMany) {
      assignedGalleries = await this.db.clientGalleryAssignment.findMany({
        where: { client_id: clientId },
        include: { gallery: true },
      });
    }

    const validGalleries = assignedGalleries.map((cg: any) => cg.gallery).filter(Boolean);
    const completedGalleries = validGalleries.filter(
      (g: any) => g.status === 'COMPLETED' || g.status === 'ARCHIVED'
    ).length;

    const isRepeatClient = validGalleries.length >= 2;
    const galleryTitles = validGalleries.map((g: any) => g.title);

    return {
      isRepeatClient,
      completedGalleries,
      totalGalleries: validGalleries.length,
      galleryTitles,
    };
  }

  async detectReturnClient(studioId: string, clientId: string) {
    const res = await this.checkAndMarkReturnClient(studioId, clientId);
    return {
      isReturn: res.isRepeatClient,
      completedGalleries: res.completedGalleries,
      totalGalleries: res.totalGalleries,
      galleryTitles: res.galleryTitles,
    };
  }

  /**
   * Gets or evaluates the current journey state.
   */
  async getJourneyState(studioId: string, clientId: string): Promise<ClientJourneyStateDTO> {
    const existing = await this.db.clientJourneyState?.findFirst?.({
      where: { client_id: clientId, studio_id: studioId },
    });

    if (existing) {
      const transitions = Array.isArray(existing.stage_transitions)
        ? existing.stage_transitions
        : [{ fromStage: null, toStage: existing.current_stage || existing.stage, transitionedAt: existing.entered_stage_at || existing.entered_at }];

      const stage = (existing.current_stage || existing.stage) as ClientJourneyStage;
      const enteredAt = existing.entered_stage_at || existing.entered_at || new Date().toISOString();
      return {
        id: existing.id,
        studio_id: existing.studio_id,
        client_id: existing.client_id,
        current_stage: stage,
        previous_stage: existing.previous_stage as ClientJourneyStage | null,
        stage_entered_at: enteredAt,
        created_at: existing.created_at || enteredAt,
        updated_at: existing.updated_at || enteredAt,
        studioId: existing.studio_id,
        clientId: existing.client_id,
        currentStage: stage,
        previousStage: existing.previous_stage as ClientJourneyStage | null,
        enteredStageAt: enteredAt,
        history: transitions,
        stage_transitions: transitions,
        stageTransitions: transitions,
        metadata: existing.metadata,
      } as any;
    }

    return this.evaluateJourneyStage(studioId, clientId);
  }

  /**
   * Evaluates the current factual journey stage for a client.
   */
  async evaluateJourneyStage(studioId: string, clientId: string): Promise<ClientJourneyStateDTO> {
    const client = await this.db.client.findFirst({
      where: { id: clientId, studio_id: studioId },
      include: {
        galleries: {
          include: { gallery: true },
        },
        activities: {
          orderBy: { created_at: 'desc' },
        },
        deliveries: {
          orderBy: { sent_at: 'desc' },
        },
      },
    });

    if (!client) {
      throw new Error(`Client ${clientId} not found for studio ${studioId}`);
    }

    const now = new Date();
    let activities = client.activities || [];
    if (activities.length === 0 && this.db.clientActivity?.findMany) {
      activities = await this.db.clientActivity.findMany({
        where: { client_id: clientId, studio_id: studioId },
      });
    }

    let assignedGalleries = client.galleries || [];
    if (assignedGalleries.length === 0 && this.db.clientGalleryAssignment?.findMany) {
      assignedGalleries = await this.db.clientGalleryAssignment.findMany({
        where: { client_id: clientId },
      });
    }

    const deliveries = client.deliveries || [];

    // Count action signals
    const hasDownloads = activities.some((a: any) => (a.activity_type || '').includes('DOWNLOAD'));
    const hasSelections = activities.some((a: any) => (a.activity_type || '').includes('SELECT'));
    const hasFavorites = activities.some((a: any) => (a.activity_type || '').includes('FAVORITE'));
    const viewCount = activities.filter((a: any) => (a.activity_type || '').includes('VIEW')).length;
    const hasOpenedDelivery = deliveries.some((d: any) => !!d.opened_at);
    const hasDelivery = deliveries.length > 0;

    let targetStage = ClientJourneyStage.NEW_CLIENT;

    // Check action stages
    if (hasDownloads) {
      targetStage = ClientJourneyStage.DOWNLOADING;
    } else if (hasSelections) {
      targetStage = ClientJourneyStage.SELECTING;
    } else if (hasFavorites) {
      targetStage = ClientJourneyStage.FAVORITING;
    } else if (viewCount >= 2) {
      targetStage = ClientJourneyStage.ACTIVE_VIEWING;
    } else if (viewCount === 1 || hasOpenedDelivery) {
      targetStage = ClientJourneyStage.FIRST_VISIT;
    } else if (hasDelivery) {
      targetStage = ClientJourneyStage.GALLERY_DELIVERED;
    }

    return this.persistJourneyStage(studioId, clientId, targetStage, {
      activities_count: activities.length,
      evaluated_at: now.toISOString(),
    });
  }

  /**
   * Update journey stage manually or via workflow event.
   */
  async updateJourneyStage(
    studioId: string,
    clientId: string,
    newStage: ClientJourneyStage,
    triggerEvent?: string,
    reason?: string
  ): Promise<ClientJourneyStateDTO> {
    const current = await this.getJourneyState(studioId, clientId);
    return this.persistJourneyStage(
      studioId,
      clientId,
      newStage,
      {
        triggerEvent,
        reason,
        previousStage: current.currentStage,
      },
      current.currentStage
    );
  }

  /**
   * Persist or update the client journey state record.
   */
  async persistJourneyStage(
    studioId: string,
    clientId: string,
    stage: ClientJourneyStage,
    metadata?: Record<string, any>,
    prevStage?: ClientJourneyStage | null
  ): Promise<ClientJourneyStateDTO> {
    const now = new Date();
    const existing = await this.db.clientJourneyState?.findFirst?.({
      where: { client_id: clientId, studio_id: studioId },
    });

    const previousStage = prevStage !== undefined ? prevStage : (existing ? (existing.current_stage || existing.stage) : null);
    const existingTransitions = existing && Array.isArray(existing.stage_transitions)
      ? existing.stage_transitions
      : [];

    const newTransition = {
      fromStage: previousStage,
      toStage: stage,
      transitionedAt: now.toISOString(),
      metadata: metadata || {},
    };

    const transitions = [...existingTransitions, newTransition];

    const data: any = {
      studio_id: studioId,
      client_id: clientId,
      current_stage: stage,
      stage: stage,
      previous_stage: previousStage,
      entered_stage_at: existing && (existing.current_stage === stage || existing.stage === stage) ? (existing.entered_stage_at || existing.entered_at) : now,
      entered_at: now,
      stage_transitions: transitions,
      metadata: metadata || {},
      updated_at: now,
    };

    let journeyRecord: any = null;
    if (this.db.clientJourneyState?.upsert) {
      journeyRecord = await this.db.clientJourneyState.upsert({
        where: { client_id: clientId },
        create: data,
        update: data,
      });
    } else if (this.db.clientJourneyState?.findFirst) {
      if (existing) {
        journeyRecord = await this.db.clientJourneyState.update({
          where: { id: existing.id },
          data,
        });
      } else {
        journeyRecord = await this.db.clientJourneyState.create({
          data: { id: `journey-${clientId}`, ...data },
        });
      }
    } else {
      journeyRecord = { id: `journey-${clientId}`, ...data };
    }

    const currentStageVal = (journeyRecord.current_stage || journeyRecord.stage || stage) as ClientJourneyStage;
    const enteredAt = journeyRecord.entered_stage_at || journeyRecord.entered_at || new Date().toISOString();

    return {
      id: journeyRecord.id || `journey-${clientId}`,
      studio_id: studioId,
      client_id: clientId,
      current_stage: currentStageVal,
      previous_stage: journeyRecord.previous_stage as ClientJourneyStage | null,
      stage_entered_at: enteredAt,
      created_at: journeyRecord.created_at || enteredAt,
      updated_at: journeyRecord.updated_at || enteredAt,
      studioId: studioId,
      clientId: clientId,
      currentStage: currentStageVal,
      previousStage: journeyRecord.previous_stage as ClientJourneyStage | null,
      enteredStageAt: enteredAt,
      history: transitions,
      stage_transitions: transitions,
      stageTransitions: transitions,
      metadata: journeyRecord.metadata,
    } as any;
  }
}
