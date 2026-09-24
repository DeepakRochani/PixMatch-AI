import { prisma } from '@pixmatch/database';
import {
  CullSessionStatus,
  CullDecisionType,
  CullFilter,
  PhotoCullSessionDTO,
  PhotoCullDecisionDTO,
  PhotoSelectionLockDTO,
  ProductionStage,
} from '@pixmatch/types';
import { CullEngineService } from './cull-engine.service';

export class CullSessionService {
  /**
   * Create a new culling session for a gallery or project
   */
  static async createCullSession(
    studioId: string,
    galleryIdOrUserId: string,
    optionsOrProjectId?: string | { galleryId?: string; projectId?: string; name?: string; runAi?: boolean },
    nameArg?: string,
    runAiArg: boolean = true
  ): Promise<PhotoCullSessionDTO> {
    let galleryId = galleryIdOrUserId;
    let projectId: string | undefined = undefined;
    let sessionName: string | undefined = nameArg;
    let runAi = runAiArg;

    if (optionsOrProjectId && typeof optionsOrProjectId === 'object') {
      galleryId = optionsOrProjectId.galleryId || galleryIdOrUserId;
      projectId = optionsOrProjectId.projectId;
      sessionName = optionsOrProjectId.name;
      runAi = optionsOrProjectId.runAi !== undefined ? optionsOrProjectId.runAi : true;
    } else if (typeof optionsOrProjectId === 'string') {
      projectId = optionsOrProjectId;
    }

    const gallery = await prisma.gallery.findFirst({
      where: { id: galleryId, studio_id: studioId },
    });

    if (!gallery) {
      throw new Error(`Gallery not found: ${galleryId}`);
    }

    const resolvedName =
      sessionName || `Culling Session: ${gallery.title || gallery.name || galleryId} (${new Date().toLocaleDateString()})`;

    // 1. Fetch photos in gallery
    const photos = await prisma.photo.findMany({
      where: { studio_id: studioId, gallery_id: galleryId },
      include: { ai_analysis: true },
    });

    const session = await prisma.photoCullSession.create({
      data: {
        studio_id: studioId,
        gallery_id: galleryId,
        project_id: projectId || null,
        name: resolvedName,
        status: CullSessionStatus.IN_PROGRESS,
        total_photos: photos.length,
        reviewed_count: 0,
        keep_count: 0,
        reject_count: 0,
        maybe_count: 0,
      },
    });

    // 2. Populate decisions with AI recommendations if runAi is enabled
    for (const photo of photos) {
      let decision = CullDecisionType.UNREVIEWED;
      let aiScore = 0;
      let aiRecommendation: string | null = null;
      let aiConfidence = 0;
      let aiReasons: string[] = [];
      let aiWarnings: string[] = [];

      if (runAi && photo.ai_analysis) {
        const scoreBreakdown = CullEngineService.calculateCullScore({
          quality_score: photo.ai_analysis.quality_score,
          sharpness_score: photo.ai_analysis.sharpness_score,
          blur_score: photo.ai_analysis.blur_score,
          is_blurry: photo.ai_analysis.is_blurry,
          exposure_score: photo.ai_analysis.exposure_score,
          exposure_class: photo.ai_analysis.exposure_class,
          contrast_score: photo.ai_analysis.contrast_score,
          noise_score: photo.ai_analysis.noise_score,
          composition_score: photo.ai_analysis.composition_score,
          eyes_open_score: photo.ai_analysis.eyes_open_score,
          smile_score: photo.ai_analysis.smile_score,
          people_count: photo.ai_analysis.people_count,
          duplicate_group_id: photo.ai_analysis.duplicate_group_id,
          near_duplicate_group_id: photo.ai_analysis.near_duplicate_group_id,
          perceptual_hash: photo.ai_analysis.perceptual_hash,
          is_best_shot: photo.ai_analysis.is_best_shot,
          best_shot_score: photo.ai_analysis.best_shot_score,
        });

        aiScore = scoreBreakdown.total_score;
        aiRecommendation = scoreBreakdown.recommendation;
        aiConfidence = scoreBreakdown.confidence;
        aiReasons = scoreBreakdown.reasons;
        aiWarnings = scoreBreakdown.warnings;

        if (scoreBreakdown.recommendation === 'KEEP') {
          decision = CullDecisionType.AI_RECOMMENDED_KEEP;
        } else if (scoreBreakdown.recommendation === 'REJECT') {
          decision = CullDecisionType.AI_RECOMMENDED_REJECT;
        } else {
          decision = CullDecisionType.AI_RECOMMENDED_MAYBE;
        }
      }

      await prisma.photoCullDecision.create({
        data: {
          studio_id: studioId,
          session_id: session.id,
          photo_id: photo.id,
          decision,
          ai_score: aiScore,
          ai_recommendation: aiRecommendation,
          ai_confidence: aiConfidence,
          ai_reasons: aiReasons,
          ai_warnings: aiWarnings,
        },
      });
    }

    // Auto-detect bursts
    await CullEngineService.detectBurstGroups(studioId, galleryId);

    return this.getCullSession(studioId, session.id);
  }

  /**
   * Retrieve a culling session with aggregated metrics
   */
  static async getCullSession(studioId: string, sessionId: string): Promise<PhotoCullSessionDTO> {
    const session = await prisma.photoCullSession.findFirst({
      where: { id: sessionId, studio_id: studioId },
      include: {
        decisions: {
          include: { photo: true },
        },
      },
    });

    if (!session) {
      throw new Error(`Culling session not found: ${sessionId}`);
    }

    const keepCount = session.decisions.filter(
      (d) => d.decision === CullDecisionType.PHOTOGRAPHER_KEEP || d.decision === CullDecisionType.AI_RECOMMENDED_KEEP
    ).length;
    const rejectCount = session.decisions.filter(
      (d) => d.decision === CullDecisionType.PHOTOGRAPHER_REJECT || d.decision === CullDecisionType.AI_RECOMMENDED_REJECT
    ).length;
    const maybeCount = session.decisions.filter(
      (d) => d.decision === CullDecisionType.PHOTOGRAPHER_MAYBE || d.decision === CullDecisionType.AI_RECOMMENDED_MAYBE
    ).length;
    const reviewedCount = session.decisions.filter(
      (d) =>
        d.decision === CullDecisionType.PHOTOGRAPHER_KEEP ||
        d.decision === CullDecisionType.PHOTOGRAPHER_REJECT ||
        d.decision === CullDecisionType.PHOTOGRAPHER_MAYBE
    ).length;

    return {
      ...session,
      reviewed_count: reviewedCount,
      keep_count: keepCount,
      reject_count: rejectCount,
      maybe_count: maybeCount,
      decisions: session.decisions as unknown as PhotoCullDecisionDTO[],
    };
  }

  /**
   * List all culling sessions for a studio
   */
  static async listCullSessions(
    studioId: string,
    galleryId?: string,
    projectId?: string
  ): Promise<PhotoCullSessionDTO[]> {
    const whereClause: any = { studio_id: studioId };
    if (galleryId) whereClause.gallery_id = galleryId;
    if (projectId) whereClause.project_id = projectId;

    const sessions = await prisma.photoCullSession.findMany({
      where: whereClause,
      orderBy: { created_at: 'desc' },
    });

    return sessions as unknown as PhotoCullSessionDTO[];
  }

  /**
   * Record decision for a single photo
   */
  static async recordDecision(
    studioId: string,
    sessionId: string,
    photoId: string,
    userId: string,
    optionsOrDecision:
      | CullDecisionType
      | {
          decision: CullDecisionType;
          rating?: number;
          colorLabel?: string;
          notes?: string;
        }
  ): Promise<PhotoCullDecisionDTO> {
    let decision: CullDecisionType;
    let rating: number | undefined;
    let colorLabel: string | undefined;
    let notes: string | undefined;

    if (typeof optionsOrDecision === 'object') {
      decision = optionsOrDecision.decision;
      rating = optionsOrDecision.rating;
      colorLabel = optionsOrDecision.colorLabel;
      notes = optionsOrDecision.notes;
    } else {
      decision = optionsOrDecision;
    }

    const existing = await prisma.photoCullDecision.findFirst({
      where: { session_id: sessionId, photo_id: photoId, studio_id: studioId },
    });

    if (!existing) {
      throw new Error(`Cull decision record not found for photo ${photoId} in session ${sessionId}`);
    }

    const previousDecision = existing.decision;

    // Check lock
    const activeLock = await prisma.photoSelectionLock.findFirst({
      where: {
        photo_id: photoId,
        studio_id: studioId,
        expires_at: { gt: new Date() },
      },
    });

    if (activeLock && userId && activeLock.locked_by !== userId) {
      throw new Error(`Photo is currently locked by another reviewer (${activeLock.locked_by})`);
    }

    const updateData: any = {
      decision,
      decided_by: userId || existing.decided_by,
      decided_at: new Date(),
      updated_at: new Date(),
    };

    if (notes !== undefined) updateData.notes = notes;
    if (rating !== undefined) updateData.rating = rating;
    if (colorLabel !== undefined) updateData.color_label = colorLabel;

    const updated = await prisma.photoCullDecision.update({
      where: { id: existing.id },
      data: updateData,
    });

    // Record review action for undo
    await prisma.photoReviewAction.create({
      data: {
        studio_id: studioId,
        session_id: sessionId,
        photo_id: photoId,
        action_type: decision.toString(),
        previous_decision: previousDecision,
        new_decision: decision,
        actor_id: userId || null,
        undone: false,
      },
    });

    return updated as unknown as PhotoCullDecisionDTO;
  }

  /**
   * Alias for recordDecision
   */
  static async updateDecision(
    studioId: string,
    sessionId: string,
    photoId: string,
    decision: CullDecisionType,
    notes?: string,
    userId?: string
  ): Promise<PhotoCullDecisionDTO> {
    return this.recordDecision(studioId, sessionId, photoId, userId || '', { decision, notes });
  }

  /**
   * Bulk record decisions across multiple photos
   */
  static async bulkRecordDecisions(
    studioId: string,
    sessionId: string,
    userOrPhotoIds: string | string[],
    decisionOrOptions:
      | string[]
      | CullDecisionType
      | {
          photoIds?: string[];
          decision: CullDecisionType;
          rating?: number;
          colorLabel?: string;
          notes?: string;
        },
    optionalDecisionOrColor?: CullDecisionType | string,
    optionalColor?: string
  ): Promise<{ success: boolean; count: number; updated_count: number; updated_ids: string[] }> {
    let userId = 'system';
    let photoIds: string[] = [];
    let decision: CullDecisionType = CullDecisionType.PHOTOGRAPHER_KEEP;
    let rating: number | undefined;
    let colorLabel: string | undefined;
    let notes: string | undefined;

    if (typeof userOrPhotoIds === 'string') {
      userId = userOrPhotoIds;
      if (Array.isArray(decisionOrOptions)) {
        photoIds = decisionOrOptions;
        if (typeof optionalDecisionOrColor === 'string') {
          decision = optionalDecisionOrColor as CullDecisionType;
          colorLabel = optionalColor;
        }
      } else if (typeof decisionOrOptions === 'object') {
        photoIds = decisionOrOptions.photoIds || [];
        decision = decisionOrOptions.decision;
        rating = decisionOrOptions.rating;
        colorLabel = decisionOrOptions.colorLabel;
        notes = decisionOrOptions.notes;
      }
    } else if (Array.isArray(userOrPhotoIds)) {
      photoIds = userOrPhotoIds;
      if (typeof decisionOrOptions === 'string') {
        decision = decisionOrOptions as CullDecisionType;
        colorLabel = typeof optionalDecisionOrColor === 'string' ? optionalDecisionOrColor : undefined;
      } else if (typeof decisionOrOptions === 'object') {
        decision = decisionOrOptions.decision;
        rating = decisionOrOptions.rating;
        colorLabel = decisionOrOptions.colorLabel;
        notes = decisionOrOptions.notes;
      }
    }

    const updatedIds: string[] = [];

    for (const photoId of photoIds) {
      const existing = await prisma.photoCullDecision.findFirst({
        where: { session_id: sessionId, photo_id: photoId, studio_id: studioId },
      });

      if (existing) {
        const prev = existing.decision;
        const updateData: any = {
          decision,
          decided_by: userId || existing.decided_by,
          decided_at: new Date(),
          updated_at: new Date(),
        };
        if (notes !== undefined) updateData.notes = notes;
        if (rating !== undefined) updateData.rating = rating;
        if (colorLabel !== undefined) updateData.color_label = colorLabel;

        await prisma.photoCullDecision.update({
          where: { id: existing.id },
          data: updateData,
        });

        await prisma.photoReviewAction.create({
          data: {
            studio_id: studioId,
            session_id: sessionId,
            photo_id: photoId,
            action_type: `BULK_${decision}`,
            previous_decision: prev,
            new_decision: decision,
            actor_id: userId || null,
            undone: false,
          },
        });

        updatedIds.push(photoId);
      }
    }

    return {
      success: true,
      count: updatedIds.length,
      updated_count: updatedIds.length,
      updated_ids: updatedIds,
    };
  }

  /**
   * Alias for bulkRecordDecisions
   */
  static async bulkDecisions(
    studioId: string,
    sessionId: string,
    photoIds: string[],
    decision: CullDecisionType,
    notes?: string,
    userId?: string
  ): Promise<{ success: boolean; count: number; updated_count: number; updated_ids: string[] }> {
    return this.bulkRecordDecisions(studioId, sessionId, userId || 'system', photoIds, decision);
  }

  /**
   * Acquire selection lock (TTL default: 60s)
   */
  static async acquireSelectionLock(
    studioId: string,
    photoId: string,
    userId: string,
    ttlSeconds: number = 60
  ): Promise<{ success: boolean; lock?: PhotoSelectionLockDTO; error?: string } & Partial<PhotoSelectionLockDTO>> {
    return this.acquireLock(studioId, photoId, userId, ttlSeconds);
  }

  static async acquireLock(
    studioId: string,
    photoId: string,
    userId: string,
    ttlSeconds: number = 60
  ): Promise<{ success: boolean; lock?: PhotoSelectionLockDTO; error?: string } & Partial<PhotoSelectionLockDTO>> {
    const photo = await prisma.photo.findFirst({
      where: { id: photoId, studio_id: studioId },
    });

    if (!photo) {
      throw new Error(`Photo ${photoId} not found or unauthorized for studio ${studioId}`);
    }

    // 1. Clean up expired locks
    await prisma.photoSelectionLock.deleteMany({
      where: {
        expires_at: { lt: new Date() },
      },
    });

    // 2. Check if locked by someone else
    const current = await prisma.photoSelectionLock.findFirst({
      where: { photo_id: photoId, studio_id: studioId },
    });

    if (current && current.locked_by !== userId && new Date(current.expires_at) > new Date()) {
      return {
        success: false,
        error: `Photo ${photoId} is already locked by user ${current.locked_by}`,
      };
    }

    const expiresAt = new Date(Date.now() + ttlSeconds * 1000);
    let lockRecord: any;

    if (current) {
      lockRecord = await prisma.photoSelectionLock.update({
        where: { id: current.id },
        data: {
          locked_by: userId,
          expires_at: expiresAt,
        },
      });
    } else {
      lockRecord = await prisma.photoSelectionLock.create({
        data: {
          studio_id: studioId,
          photo_id: photoId,
          locked_by: userId,
          expires_at: expiresAt,
        },
      });
    }

    return Object.assign(
      {
        success: true,
        lock: lockRecord as PhotoSelectionLockDTO,
      },
      lockRecord
    );
  }

  /**
   * Release selection lock
   */
  static async releaseSelectionLock(studioId: string, photoId: string, userId: string): Promise<boolean> {
    return this.releaseLock(studioId, photoId, userId);
  }

  static async releaseLock(studioId: string, photoId: string, userId: string): Promise<boolean> {
    const deleted = await prisma.photoSelectionLock.deleteMany({
      where: {
        studio_id: studioId,
        photo_id: photoId,
        locked_by: userId,
      },
    });
    return deleted.count > 0;
  }

  /**
   * Undo last action in a session (user-scoped, tenant-scoped, idempotent)
   */
  static async undoLastAction(
    studioId: string,
    sessionId: string,
    userId?: string
  ): Promise<{
    success: boolean;
    undone: boolean;
    reverted_photo_id?: string;
    restored_photo_id?: string;
    reverted_decision?: CullDecisionType;
    previous_decision?: CullDecisionType;
  }> {
    const whereClause: any = {
      studio_id: studioId,
      session_id: sessionId,
      undone: false,
    };
    if (userId) whereClause.actor_id = userId;

    const lastAction = await prisma.photoReviewAction.findFirst({
      where: whereClause,
      orderBy: { created_at: 'desc' },
    });

    if (!lastAction) {
      return { success: false, undone: false };
    }

    // Revert decision on the photo
    await prisma.photoCullDecision.updateMany({
      where: {
        studio_id: studioId,
        session_id: sessionId,
        photo_id: lastAction.photo_id,
      },
      data: {
        decision: lastAction.previous_decision,
        decided_at: new Date(),
      },
    });

    // Mark action as undone
    await prisma.photoReviewAction.update({
      where: { id: lastAction.id },
      data: { undone: true },
    });

    return {
      success: true,
      undone: true,
      reverted_photo_id: lastAction.photo_id,
      restored_photo_id: lastAction.photo_id,
      reverted_decision: lastAction.previous_decision,
      previous_decision: lastAction.previous_decision,
    };
  }

  /**
   * Get filtered cull candidates for reviewer filmstrip/grid
   */
  static async getCullCandidates(
    studioId: string,
    sessionId: string,
    filterOrOptions:
      | CullFilter
      | {
          filter?: CullFilter | string;
          decisionFilter?: CullDecisionType | string;
          recommendation?: string;
          minScore?: number;
          maxScore?: number;
          burstGroupId?: string;
        } = CullFilter.ALL,
    page: number = 1,
    limit: number = 50
  ): Promise<any> {
    const session = await prisma.photoCullSession.findFirst({
      where: { id: sessionId, studio_id: studioId },
    });

    if (!session) {
      throw new Error(`Cull session not found: ${sessionId}`);
    }

    const whereClause: any = {
      studio_id: studioId,
      session_id: sessionId,
    };

    let activeFilter =
      typeof filterOrOptions === 'string'
        ? filterOrOptions
        : filterOrOptions?.decisionFilter || filterOrOptions?.filter || CullFilter.ALL;

    switch (activeFilter) {
      case CullFilter.AI_KEEP:
        whereClause.decision = CullDecisionType.AI_RECOMMENDED_KEEP;
        break;
      case CullFilter.AI_REJECT:
        whereClause.decision = CullDecisionType.AI_RECOMMENDED_REJECT;
        break;
      case CullFilter.AI_MAYBE:
        whereClause.decision = CullDecisionType.AI_RECOMMENDED_MAYBE;
        break;
      case CullFilter.PHOTOGRAPHER_KEEP:
      case 'KEEP':
      case 'PHOTOGRAPHER_KEEP':
        whereClause.decision = CullDecisionType.PHOTOGRAPHER_KEEP;
        break;
      case CullFilter.PHOTOGRAPHER_REJECT:
      case 'REJECT':
      case 'PHOTOGRAPHER_REJECT':
        whereClause.decision = CullDecisionType.PHOTOGRAPHER_REJECT;
        break;
      case CullFilter.PHOTOGRAPHER_MAYBE:
      case 'MAYBE':
      case 'PHOTOGRAPHER_MAYBE':
        whereClause.decision = CullDecisionType.PHOTOGRAPHER_MAYBE;
        break;
      case CullFilter.UNREVIEWED:
        whereClause.decision = CullDecisionType.UNREVIEWED;
        break;
      default:
        break;
    }

    if (typeof filterOrOptions === 'object') {
      if (filterOrOptions.recommendation) {
        whereClause.ai_recommendation = filterOrOptions.recommendation;
      }
      if (filterOrOptions.burstGroupId) {
        whereClause.burst_group_id = filterOrOptions.burstGroupId;
      }
    }

    let items = await prisma.photoCullDecision.findMany({
      where: whereClause,
      include: {
        photo: {
          include: { ai_analysis: true },
        },
      },
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { created_at: 'asc' },
    });

    if (typeof filterOrOptions === 'object') {
      if (filterOrOptions.minScore !== undefined) {
        items = items.filter((it) => (it.ai_score || 0) >= (filterOrOptions.minScore || 0));
      }
      if (filterOrOptions.maxScore !== undefined) {
        items = items.filter((it) => (it.ai_score || 0) <= (filterOrOptions.maxScore || 100));
      }
    }

    const total = await prisma.photoCullDecision.count({ where: whereClause });

    // Return Array augmented with pagination fields for dual consumption
    const result: any = [...items];
    result.items = items as unknown as PhotoCullDecisionDTO[];
    result.total = total;
    result.page = page;
    result.limit = limit;

    return result;
  }

  /**
   * Complete a culling session and advance production stage if linked
   */
  static async completeCullSession(
    studioId: string,
    sessionId: string
  ): Promise<any> {
    const session = await prisma.photoCullSession.findFirst({
      where: { id: sessionId, studio_id: studioId },
    });

    if (!session) {
      throw new Error(`Culling session not found: ${sessionId}`);
    }

    const updated = await prisma.photoCullSession.update({
      where: { id: session.id },
      data: {
        status: CullSessionStatus.COMPLETED,
        completed_at: new Date(),
        updated_at: new Date(),
      },
    });

    let nextStage: ProductionStage | undefined = undefined;

    if (session.project_id) {
      const prod = await prisma.projectProduction.findFirst({
        where: { project_id: session.project_id, studio_id: studioId },
      });
      if (prod) {
        await prisma.projectProduction.update({
          where: { id: prod.id },
          data: {
            current_stage: ProductionStage.EDITING_IN_PROGRESS,
            updated_at: new Date(),
          },
        });
        nextStage = ProductionStage.EDITING_IN_PROGRESS;
      }
    }

    const fullSession = await this.getCullSession(studioId, session.id);
    return Object.assign(
      {
        success: true,
        status: CullSessionStatus.COMPLETED,
        session: fullSession,
        next_stage: nextStage,
      },
      fullSession
    );
  }

  /**
   * Check production readiness for culling
   */
  static async checkProductionCullingReadiness(
    studioId: string,
    projectId: string
  ): Promise<{ isReady: boolean; ready: boolean; stage?: string }> {
    const prod = await prisma.projectProduction.findFirst({
      where: { project_id: projectId, studio_id: studioId },
    });
    if (!prod) return { isReady: true, ready: true };
    const isReady = prod.media_ingested === true || prod.current_stage !== ProductionStage.PRE_PRODUCTION;
    return {
      isReady,
      ready: isReady,
      stage: prod.current_stage,
    };
  }

  /**
   * Reconcile offline actions using Last-Write-Wins (LWW) resolution
   */
  static async reconcileOfflineActions(
    studioId: string,
    sessionId: string,
    userId: string,
    actions: Array<{
      photo_id?: string;
      photoId?: string;
      decision: CullDecisionType;
      rating?: number;
      colorLabel?: string;
      notes?: string;
      timestamp?: Date | number | string;
    }>
  ): Promise<{ success: boolean; reconciled_count: number; updated_photos: string[] }> {
    if (!actions || actions.length === 0) {
      return { success: true, reconciled_count: 0, updated_photos: [] };
    }

    // Sort actions ascending by timestamp so that later actions overwrite earlier ones (LWW)
    const sortedActions = [...actions].sort((a, b) => {
      const timeA = a.timestamp ? new Date(a.timestamp).getTime() : 0;
      const timeB = b.timestamp ? new Date(b.timestamp).getTime() : 0;
      return timeA - timeB;
    });

    const updatedPhotos: string[] = [];

    for (const act of sortedActions) {
      const pId = act.photo_id || act.photoId || '';
      if (!pId) continue;

      await this.recordDecision(studioId, sessionId, pId, userId, {
        decision: act.decision,
        rating: act.rating,
        colorLabel: act.colorLabel,
        notes: act.notes,
      });

      if (!updatedPhotos.includes(pId)) {
        updatedPhotos.push(pId);
      }
    }

    return {
      success: true,
      reconciled_count: actions.length,
      updated_photos: updatedPhotos,
    };
  }
}

