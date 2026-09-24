import { prisma } from '@pixmatch/database';
import {
  ProductionStage,
  ShootType,
  ProductionHealthStatus,
  MediaIngestionStatus,
  MediaBackupStatus,
  ProjectProductionDTO,
  CreateProjectProductionDTO,
  UpdateProjectProductionDTO,
  ProductionKanbanBoardDTO,
  ProductionSummaryDTO,
  ProductionHealthDTO,
  CalendarEventStatus,
} from '@pixmatch/types';
import { ProductionHealthService } from './production-health.service';
import { ProductionDeadlineService } from './production-deadline.service';
import { ClientJourneyService } from '../client-intelligence/client-journey.service';

export class ProductionService {
  /**
   * Allowed state transitions map for deterministic stage workflow
   */
  private static readonly ALLOWED_TRANSITIONS: Record<ProductionStage, ProductionStage[]> = {
    [ProductionStage.PRE_PRODUCTION]: [
      ProductionStage.READY_FOR_SHOOT,
      ProductionStage.ON_HOLD,
      ProductionStage.CANCELLED,
    ],
    [ProductionStage.READY_FOR_SHOOT]: [
      ProductionStage.SHOOT_IN_PROGRESS,
      ProductionStage.PRE_PRODUCTION,
      ProductionStage.ON_HOLD,
      ProductionStage.CANCELLED,
    ],
    [ProductionStage.SHOOT_IN_PROGRESS]: [
      ProductionStage.SHOOT_COMPLETED,
      ProductionStage.READY_FOR_SHOOT,
      ProductionStage.ON_HOLD,
      ProductionStage.CANCELLED,
    ],
    [ProductionStage.SHOOT_COMPLETED]: [
      ProductionStage.MEDIA_INGESTION,
      ProductionStage.CULLING,
      ProductionStage.ON_HOLD,
      ProductionStage.CANCELLED,
    ],
    [ProductionStage.MEDIA_INGESTION]: [
      ProductionStage.CULLING,
      ProductionStage.SHOOT_COMPLETED,
      ProductionStage.ON_HOLD,
      ProductionStage.CANCELLED,
    ],
    [ProductionStage.CULLING]: [
      ProductionStage.EDITING,
      ProductionStage.MEDIA_INGESTION,
      ProductionStage.ON_HOLD,
      ProductionStage.CANCELLED,
    ],
    [ProductionStage.EDITING]: [
      ProductionStage.AI_PROCESSING,
      ProductionStage.GALLERY_PREPARATION,
      ProductionStage.CULLING,
      ProductionStage.ON_HOLD,
      ProductionStage.CANCELLED,
    ],
    [ProductionStage.AI_PROCESSING]: [
      ProductionStage.GALLERY_PREPARATION,
      ProductionStage.EDITING,
      ProductionStage.ON_HOLD,
      ProductionStage.CANCELLED,
    ],
    [ProductionStage.GALLERY_PREPARATION]: [
      ProductionStage.READY_FOR_GALLERY,
      ProductionStage.EDITING,
      ProductionStage.ON_HOLD,
      ProductionStage.CANCELLED,
    ],
    [ProductionStage.READY_FOR_GALLERY]: [
      ProductionStage.COMPLETED,
      ProductionStage.GALLERY_PREPARATION,
      ProductionStage.ON_HOLD,
      ProductionStage.CANCELLED,
    ],
    [ProductionStage.COMPLETED]: [
      ProductionStage.READY_FOR_GALLERY,
    ],
    [ProductionStage.ON_HOLD]: [
      ProductionStage.PRE_PRODUCTION,
      ProductionStage.READY_FOR_SHOOT,
      ProductionStage.SHOOT_IN_PROGRESS,
      ProductionStage.SHOOT_COMPLETED,
      ProductionStage.MEDIA_INGESTION,
      ProductionStage.CULLING,
      ProductionStage.EDITING,
      ProductionStage.AI_PROCESSING,
      ProductionStage.GALLERY_PREPARATION,
      ProductionStage.READY_FOR_GALLERY,
      ProductionStage.CANCELLED,
    ],
    [ProductionStage.CANCELLED]: [],
  };

  /**
   * Get or create studio production profile defaults
   */
  static async getProductionProfile(studioId: string) {
    let profile = await prisma.studioProductionProfile.findUnique({
      where: { studio_id: studioId },
    });

    if (!profile) {
      profile = await prisma.studioProductionProfile.create({
        data: {
          studio_id: studioId,
          default_shoot_buffer_minutes: 30,
          default_travel_buffer_minutes: 45,
          default_backup_policy: 'DUAL_CARD_AND_LOCAL_NAS',
          default_gallery_target_days: 14,
          default_culling_target_days: 2,
          default_editing_target_days: 7,
          default_delivery_target_days: 21,
        },
      });
    }

    return profile;
  }

  /**
   * Update studio production profile defaults
   */
  static async updateProductionProfile(studioId: string, data: any) {
    return prisma.studioProductionProfile.upsert({
      where: { studio_id: studioId },
      update: {
        ...data,
        updated_at: new Date(),
      },
      create: {
        studio_id: studioId,
        ...data,
      },
    });
  }

  /**
   * Get production record for a project
   */
  static async getProjectProduction(studioId: string, projectId: string) {
    const production = await prisma.projectProduction.findFirst({
      where: {
        studio_id: studioId,
        project_id: projectId,
      },
      include: {
        project: {
          include: {
            client: true,
          },
        },
        shoot_sessions: {
          include: {
            crew_assignments: {
              include: {
                resource: true,
              },
            },
            equipment_checklists: {
              include: {
                assigned_resource: true,
              },
            },
          },
          orderBy: { start_at: 'asc' },
        },
      },
    });

    return production;
  }

  /**
   * Create or fetch production record for project
   */
  static async initProjectProduction(
    studioId: string,
    projectId: string,
    data?: CreateProjectProductionDTO
  ) {
    return this.createOrGetProjectProduction(studioId, projectId, data);
  }

  /**
   * Create or fetch production record for project
   */
  static async createOrGetProjectProduction(
    studioId: string,
    projectId: string,
    data?: CreateProjectProductionDTO
  ) {
    const existing = await this.getProjectProduction(studioId, projectId);
    if (existing) return existing;

    const project = await prisma.studioProject.findFirst({
      where: { id: projectId, studio_id: studioId },
    });

    if (!project) {
      throw new Error('Project not found or tenant unauthorized');
    }

    // Determine default dates from project
    const shootStartAt = data?.shoot_start_at || project.shoot_date || project.start_date || null;
    const shootEndAt = data?.shoot_end_at || project.end_date || null;

    // Calculate deadline targets
    const profile = await this.getProductionProfile(studioId);
    let cullingTarget: Date | null = null;
    let editingTarget: Date | null = null;
    let galleryTarget: Date | null = null;
    let deliveryTarget: Date | null = null;

    if (shootStartAt) {
      const startMs = new Date(shootStartAt).getTime();
      cullingTarget = new Date(startMs + profile.default_culling_target_days * 86400000);
      editingTarget = new Date(startMs + profile.default_editing_target_days * 86400000);
      galleryTarget = data?.gallery_target_date ? new Date(data.gallery_target_date) : new Date(startMs + profile.default_gallery_target_days * 86400000);
      deliveryTarget = new Date(startMs + profile.default_delivery_target_days * 86400000);
    }

    const created = await prisma.projectProduction.create({
      data: {
        studio_id: studioId,
        project_id: projectId,
        shoot_type: data?.shoot_type || ShootType.OTHER,
        production_stage: data?.production_stage || ProductionStage.PRE_PRODUCTION,
        shoot_start_at: shootStartAt ? new Date(shootStartAt) : null,
        shoot_end_at: shootEndAt ? new Date(shootEndAt) : null,
        primary_photographer_id: data?.primary_photographer_id || project.primary_photographer_id || null,
        lead_photographer_id: data?.lead_photographer_id || null,
        location: data?.location || project.location || null,
        location_details: data?.location_details || null,
        travel_notes: data?.travel_notes || null,
        client_instructions: data?.client_instructions || null,
        internal_notes: data?.internal_notes || null,
        production_health_score: 100,
        production_health_status: ProductionHealthStatus.READY,
        media_ingestion_status: MediaIngestionStatus.NOT_STARTED,
        media_backup_status: MediaBackupStatus.NOT_STARTED,
        gallery_target_date: galleryTarget,
        culling_target_date: cullingTarget,
        editing_target_date: editingTarget,
        delivery_target_date: deliveryTarget,
      },
      include: {
        project: {
          include: {
            client: true,
          },
        },
        shoot_sessions: true,
      },
    });

    // Record initial history
    await prisma.projectProductionStageHistory.create({
      data: {
        studio_id: studioId,
        production_id: created.id,
        from_stage: ProductionStage.PRE_PRODUCTION,
        to_stage: created.production_stage,
        reason: 'Production initialized',
      },
    });

    return created;
  }

  /**
   * Update production record
   */
  static async updateProjectProduction(
    studioId: string,
    projectId: string,
    data: UpdateProjectProductionDTO,
    userId?: string
  ) {
    const existing = await prisma.projectProduction.findFirst({
      where: { studio_id: studioId, project_id: projectId },
    });

    if (!existing) {
      throw new Error('Project production record not found');
    }

    // Check if stage change requested
    if (data.production_stage && data.production_stage !== existing.production_stage) {
      return this.transitionStage(studioId, projectId, data.production_stage, userId, 'Manual update');
    }

    const updated = await prisma.projectProduction.update({
      where: { id: existing.id },
      data: {
        ...(data.shoot_type ? { shoot_type: data.shoot_type } : {}),
        ...(data.shoot_start_at !== undefined ? { shoot_start_at: data.shoot_start_at ? new Date(data.shoot_start_at) : null } : {}),
        ...(data.shoot_end_at !== undefined ? { shoot_end_at: data.shoot_end_at ? new Date(data.shoot_end_at) : null } : {}),
        ...(data.primary_photographer_id !== undefined ? { primary_photographer_id: data.primary_photographer_id } : {}),
        ...(data.lead_photographer_id !== undefined ? { lead_photographer_id: data.lead_photographer_id } : {}),
        ...(data.location !== undefined ? { location: data.location } : {}),
        ...(data.location_details !== undefined ? { location_details: data.location_details } : {}),
        ...(data.travel_notes !== undefined ? { travel_notes: data.travel_notes } : {}),
        ...(data.client_instructions !== undefined ? { client_instructions: data.client_instructions } : {}),
        ...(data.internal_notes !== undefined ? { internal_notes: data.internal_notes } : {}),
        ...(data.media_ingestion_status ? { media_ingestion_status: data.media_ingestion_status } : {}),
        ...(data.media_backup_status ? { media_backup_status: data.media_backup_status } : {}),
        ...(data.gallery_target_date !== undefined ? { gallery_target_date: data.gallery_target_date ? new Date(data.gallery_target_date) : null } : {}),
        ...(data.culling_target_date !== undefined ? { culling_target_date: data.culling_target_date ? new Date(data.culling_target_date) : null } : {}),
        ...(data.editing_target_date !== undefined ? { editing_target_date: data.editing_target_date ? new Date(data.editing_target_date) : null } : {}),
        ...(data.delivery_target_date !== undefined ? { delivery_target_date: data.delivery_target_date ? new Date(data.delivery_target_date) : null } : {}),
        updated_at: new Date(),
      },
      include: {
        project: {
          include: {
            client: true,
          },
        },
        shoot_sessions: true,
      },
    });

    return updated;
  }

  /**
   * Transition production stage with validation & audit history
   */
  static async transitionStage(
    studioId: string,
    projectId: string,
    newStage: ProductionStage,
    changedBy?: string,
    reason?: string
  ) {
    const existing = await prisma.projectProduction.findFirst({
      where: { studio_id: studioId, project_id: projectId },
      include: { project: true },
    });

    if (!existing) {
      throw new Error('Project production record not found');
    }

    const currentStage = existing.production_stage;

    if (currentStage === newStage) {
      return existing;
    }

    // Validate allowed transition
    const allowed = this.ALLOWED_TRANSITIONS[currentStage] || [];
    if (!allowed.includes(newStage)) {
      throw new Error(
        `Invalid production stage transition from ${currentStage} to ${newStage}. Allowed: [${allowed.join(', ')}]`
      );
    }

    const now = new Date();
    let startedAt = existing.production_started_at;
    let completedAt = existing.production_completed_at;

    if (newStage === ProductionStage.SHOOT_IN_PROGRESS && !startedAt) {
      startedAt = now;
    }
    if (newStage === ProductionStage.COMPLETED) {
      completedAt = now;
    }

    const updated = await prisma.projectProduction.update({
      where: { id: existing.id },
      data: {
        production_stage: newStage,
        production_started_at: startedAt,
        production_completed_at: completedAt,
        updated_at: now,
      },
      include: {
        project: {
          include: { client: true },
        },
        shoot_sessions: true,
      },
    });

    // Record immutable stage history
    await prisma.projectProductionStageHistory.create({
      data: {
        studio_id: studioId,
        production_id: existing.id,
        from_stage: currentStage,
        to_stage: newStage,
        changed_by: changedBy || null,
        reason: reason || `Transitioned to ${newStage}`,
      },
    });

    // Client 360 Activity & Automation hooks
    if (existing.project?.client_id) {
      try {
        await ClientJourneyService.evaluateJourneyStage(studioId, existing.project.client_id);
      } catch {
        // Non-blocking bridge
      }
    }

    return updated;
  }

  /**
   * Get production stage history
   */
  static async getStageHistory(studioId: string, productionId: string) {
    return prisma.projectProductionStageHistory.findMany({
      where: {
        studio_id: studioId,
        production_id: productionId,
      },
      orderBy: { created_at: 'desc' },
    });
  }

  /**
   * Validate readiness for photographer to press START SHOOT
   */
  static async validateShootStart(studioId: string, projectId: string) {
    const production = await this.getProjectProduction(studioId, projectId);
    if (!production) {
      throw new Error('Project production record not found');
    }

    const warnings: string[] = [];
    const missingItems: string[] = [];

    // Check sessions
    const sessions = await prisma.projectShootSession.findMany({
      where: { studio_id: studioId, project_id: projectId },
    });

    if (sessions.length === 0) {
      warnings.push('No specific shoot sessions scheduled on calendar.');
    }

    // Check crew
    const crew = await prisma.projectCrewAssignment.findMany({
      where: { studio_id: studioId, project_id: projectId },
    });
    if (crew.length === 0 && !production.primary_photographer_id) {
      warnings.push('No primary photographer or crew member assigned.');
    }

    // Check equipment
    const gear = await prisma.projectEquipmentChecklist.findMany({
      where: { studio_id: studioId, project_id: projectId, required: true },
    });
    const pendingGear = gear.filter((g) => g.status !== 'COMPLETED');
    if (pendingGear.length > 0) {
      warnings.push(`${pendingGear.length} required equipment items not marked checked.`);
    }

    return {
      can_start: true, // Non-blocking: warning only
      warnings,
      missing_items: missingItems,
      current_stage: production.production_stage,
    };
  }

  /**
   * Mark shoot started
   */
  static async startShoot(studioId: string, projectId: string, userId?: string) {
    return this.transitionStage(
      studioId,
      projectId,
      ProductionStage.SHOOT_IN_PROGRESS,
      userId,
      'Photographer initiated shoot'
    );
  }

  /**
   * Mark shoot completed
   */
  static async completeShoot(studioId: string, projectId: string, userId?: string) {
    return this.transitionStage(
      studioId,
      projectId,
      ProductionStage.SHOOT_COMPLETED,
      userId,
      'Photographer concluded shoot'
    );
  }

  /**
   * Kanban Board data aggregator
   */
  static async getKanbanBoard(studioId: string): Promise<ProductionKanbanBoardDTO> {
    const allProductions = await prisma.projectProduction.findMany({
      where: { studio_id: studioId },
      include: {
        project: {
          include: { client: true },
        },
        shoot_sessions: true,
      },
      orderBy: { shoot_start_at: 'asc' },
    });

    const columns: Record<ProductionStage, any[]> = {
      [ProductionStage.PRE_PRODUCTION]: [],
      [ProductionStage.READY_FOR_SHOOT]: [],
      [ProductionStage.SHOOT_IN_PROGRESS]: [],
      [ProductionStage.SHOOT_COMPLETED]: [],
      [ProductionStage.MEDIA_INGESTION]: [],
      [ProductionStage.CULLING]: [],
      [ProductionStage.EDITING]: [],
      [ProductionStage.AI_PROCESSING]: [],
      [ProductionStage.GALLERY_PREPARATION]: [],
      [ProductionStage.READY_FOR_GALLERY]: [],
      [ProductionStage.COMPLETED]: [],
      [ProductionStage.ON_HOLD]: [],
      [ProductionStage.CANCELLED]: [],
    };

    const now = new Date();
    const todayStart = new Date(now);
    todayStart.setUTCHours(0, 0, 0, 0);
    const todayEnd = new Date(now);
    todayEnd.setUTCHours(23, 59, 59, 999);
    const next7Days = new Date(now.getTime() + 7 * 86400000);

    let activeShootsToday = 0;
    let upcomingShoots7d = 0;

    for (const prod of allProductions) {
      const stage = prod.production_stage as ProductionStage;
      if (columns[stage]) {
        columns[stage].push(prod);
      }

      if (prod.shoot_start_at) {
        const shootDate = new Date(prod.shoot_start_at);
        if (shootDate >= todayStart && shootDate <= todayEnd) {
          activeShootsToday++;
        }
        if (shootDate >= now && shootDate <= next7Days) {
          upcomingShoots7d++;
        }
      }
    }

    const overdueTasks = await prisma.projectChecklist.count({
      where: {
        studio_id: studioId,
        status: { not: 'COMPLETED' },
        due_at: { lt: now },
      },
    });

    return {
      columns,
      total_projects: allProductions.length,
      active_shoots_today: activeShootsToday,
      upcoming_shoots_7d: upcomingShoots7d,
      overdue_tasks_count: overdueTasks,
    };
  }

  /**
   * Production summary statistics
   */
  static async getProductionSummary(studioId: string): Promise<ProductionSummaryDTO> {
    const all = await prisma.projectProduction.findMany({
      where: { studio_id: studioId },
    });

    const byStage: Record<ProductionStage, number> = {
      [ProductionStage.PRE_PRODUCTION]: 0,
      [ProductionStage.READY_FOR_SHOOT]: 0,
      [ProductionStage.SHOOT_IN_PROGRESS]: 0,
      [ProductionStage.SHOOT_COMPLETED]: 0,
      [ProductionStage.MEDIA_INGESTION]: 0,
      [ProductionStage.CULLING]: 0,
      [ProductionStage.EDITING]: 0,
      [ProductionStage.AI_PROCESSING]: 0,
      [ProductionStage.GALLERY_PREPARATION]: 0,
      [ProductionStage.READY_FOR_GALLERY]: 0,
      [ProductionStage.COMPLETED]: 0,
      [ProductionStage.ON_HOLD]: 0,
      [ProductionStage.CANCELLED]: 0,
    };

    const byShootType: Record<ShootType, number> = {
      [ShootType.WEDDING]: 0,
      [ShootType.PRE_WEDDING]: 0,
      [ShootType.PORTRAIT]: 0,
      [ShootType.COMMERCIAL]: 0,
      [ShootType.PRODUCT]: 0,
      [ShootType.EVENT]: 0,
      [ShootType.MATERNITY]: 0,
      [ShootType.NEWBORN]: 0,
      [ShootType.CORPORATE]: 0,
      [ShootType.OTHER]: 0,
    };

    let totalHealth = 0;
    const now = new Date();
    const todayStart = new Date(now);
    todayStart.setUTCHours(0, 0, 0, 0);
    const todayEnd = new Date(now);
    todayEnd.setUTCHours(23, 59, 59, 999);
    const weekEnd = new Date(now.getTime() + 7 * 86400000);

    let shootsToday = 0;
    let shootsThisWeek = 0;
    let overdueCount = 0;

    for (const p of all) {
      byStage[p.production_stage as ProductionStage] = (byStage[p.production_stage as ProductionStage] || 0) + 1;
      byShootType[p.shoot_type as ShootType] = (byShootType[p.shoot_type as ShootType] || 0) + 1;
      totalHealth += p.production_health_score;

      if (p.shoot_start_at) {
        const d = new Date(p.shoot_start_at);
        if (d >= todayStart && d <= todayEnd) shootsToday++;
        if (d >= now && d <= weekEnd) shootsThisWeek++;
      }

      if (p.gallery_target_date && new Date(p.gallery_target_date) < now && p.production_stage !== ProductionStage.COMPLETED) {
        overdueCount++;
      }
    }

    return {
      total_productions: all.length,
      by_stage: byStage,
      by_shoot_type: byShootType,
      shoots_today: shootsToday,
      shoots_this_week: shootsThisWeek,
      overdue_deadlines_count: overdueCount,
      average_health_score: all.length > 0 ? Math.round(totalHealth / all.length) : 100,
    };
  }

  /**
   * Alias for getProductionSummary for studio-level aggregates
   */
  static async getStudioProductionSummary(studioId: string): Promise<ProductionSummaryDTO> {
    return this.getProductionSummary(studioId);
  }
}
