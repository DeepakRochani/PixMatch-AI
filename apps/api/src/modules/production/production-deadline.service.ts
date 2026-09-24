import { prisma } from '@pixmatch/database';
import { ProductionDeadlineDTO, ProductionStage } from '@pixmatch/types';

export class ProductionDeadlineService {
  /**
   * Recalculate and set target deadlines for a project based on shoot date & studio turnaround settings
   */
  static async computeAndSetDeadlines(
    studioId: string,
    projectId: string
  ): Promise<ProductionDeadlineDTO> {
    const production = await prisma.projectProduction.findFirst({
      where: { project_id: projectId, studio_id: studioId },
      include: {
        shoot_sessions: {
          orderBy: { start_at: 'asc' },
        },
      },
    });

    if (!production) {
      throw new Error(`Production record not found for project: ${projectId}`);
    }

    const profile = await prisma.studioProductionProfile.findUnique({
      where: { studio_id: studioId },
    });

    const cullingDays = profile?.default_culling_target_days ?? 2;
    const editingDays = profile?.default_editing_target_days ?? 7;
    const galleryDays = profile?.default_gallery_target_days ?? 14;
    const deliveryDays = profile?.default_delivery_target_days ?? 21;

    let baseShootDate = production.shoot_start_at || new Date();
    if (production.shoot_sessions && production.shoot_sessions.length > 0) {
      baseShootDate = production.shoot_sessions[0].start_at;
    }

    const cullingTarget = new Date(baseShootDate.getTime() + cullingDays * 24 * 60 * 60 * 1000);
    const editingTarget = new Date(baseShootDate.getTime() + editingDays * 24 * 60 * 60 * 1000);
    const galleryTarget = new Date(baseShootDate.getTime() + galleryDays * 24 * 60 * 60 * 1000);
    const deliveryTarget = new Date(baseShootDate.getTime() + deliveryDays * 24 * 60 * 60 * 1000);

    const updated = await prisma.projectProduction.update({
      where: { id: production.id },
      data: {
        culling_target_date: cullingTarget,
        editing_target_date: editingTarget,
        gallery_target_date: galleryTarget,
        delivery_target_date: deliveryTarget,
        updated_at: new Date(),
      },
    });

    const now = new Date();
    const isCullingOverdue =
      updated.culling_target_date &&
      now > updated.culling_target_date &&
      updated.production_stage === ProductionStage.CULLING;
    const isEditingOverdue =
      updated.editing_target_date &&
      now > updated.editing_target_date &&
      updated.production_stage === ProductionStage.EDITING;
    const isGalleryOverdue =
      updated.gallery_target_date &&
      now > updated.gallery_target_date &&
      updated.production_stage === ProductionStage.GALLERY_PREPARATION;
    const isDeliveryOverdue =
      updated.delivery_target_date &&
      now > updated.delivery_target_date &&
      updated.production_stage !== ProductionStage.COMPLETED;

    // Determine next upcoming deadline
    const deadlinesList = [
      { name: 'Culling Target', date: updated.culling_target_date },
      { name: 'Editing Target', date: updated.editing_target_date },
      { name: 'Gallery Target', date: updated.gallery_target_date },
      { name: 'Delivery Target', date: updated.delivery_target_date },
    ].filter((d) => d.date && d.date >= now);

    const nextDeadline = deadlinesList.length > 0 ? deadlinesList[0] : null;

    return {
      project_id: projectId,
      shoot_date: baseShootDate.toISOString(),
      culling_target_date: updated.culling_target_date?.toISOString() || null,
      editing_target_date: updated.editing_target_date?.toISOString() || null,
      gallery_target_date: updated.gallery_target_date?.toISOString() || null,
      delivery_target_date: updated.delivery_target_date?.toISOString() || null,
      is_culling_overdue: Boolean(isCullingOverdue),
      is_editing_overdue: Boolean(isEditingOverdue),
      is_gallery_overdue: Boolean(isGalleryOverdue),
      is_delivery_overdue: Boolean(isDeliveryOverdue),
      next_deadline_name: nextDeadline?.name || null,
      next_deadline_date: nextDeadline?.date?.toISOString() || null,
      days_until_next_deadline: nextDeadline?.date
        ? Math.ceil((nextDeadline.date.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
        : null,
    };
  }

  /**
   * Get all productions approaching or past production deadlines
   */
  static async getOverdueAndUpcomingDeadlines(
    studioId: string,
    daysAhead = 7
  ): Promise<ProductionDeadlineDTO[]> {
    const productions = await prisma.projectProduction.findMany({
      where: {
        studio_id: studioId,
        production_stage: {
          notIn: [ProductionStage.COMPLETED, ProductionStage.CANCELLED, ProductionStage.ON_HOLD],
        },
      },
      include: {
        project: true,
        shoot_sessions: { orderBy: { start_at: 'asc' } },
      },
      orderBy: { delivery_target_date: 'asc' },
    });

    const now = new Date();
    const thresholdDate = new Date(now.getTime() + daysAhead * 24 * 60 * 60 * 1000);
    const results: ProductionDeadlineDTO[] = [];

    for (const prod of productions) {
      const isCullingOverdue =
        prod.culling_target_date &&
        now > prod.culling_target_date &&
        prod.production_stage === ProductionStage.CULLING;
      const isEditingOverdue =
        prod.editing_target_date &&
        now > prod.editing_target_date &&
        prod.production_stage === ProductionStage.EDITING;
      const isGalleryOverdue =
        prod.gallery_target_date &&
        now > prod.gallery_target_date &&
        prod.production_stage === ProductionStage.GALLERY_PREPARATION;
      const isDeliveryOverdue =
        prod.delivery_target_date &&
        now > prod.delivery_target_date &&
        prod.production_stage !== ProductionStage.COMPLETED;

      const isUpcoming =
        prod.delivery_target_date &&
        prod.delivery_target_date <= thresholdDate &&
        prod.delivery_target_date >= now;

      if (isCullingOverdue || isEditingOverdue || isGalleryOverdue || isDeliveryOverdue || isUpcoming) {
        const baseShootDate = prod.shoot_sessions[0]?.start_at || prod.shoot_start_at || now;
        results.push({
          project_id: prod.project_id,
          shoot_date: baseShootDate.toISOString(),
          culling_target_date: prod.culling_target_date?.toISOString() || null,
          editing_target_date: prod.editing_target_date?.toISOString() || null,
          gallery_target_date: prod.gallery_target_date?.toISOString() || null,
          delivery_target_date: prod.delivery_target_date?.toISOString() || null,
          is_culling_overdue: Boolean(isCullingOverdue),
          is_editing_overdue: Boolean(isEditingOverdue),
          is_gallery_overdue: Boolean(isGalleryOverdue),
          is_delivery_overdue: Boolean(isDeliveryOverdue),
          days_until_next_deadline: prod.delivery_target_date
            ? Math.ceil((prod.delivery_target_date.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
            : null,
        });
      }
    }

    return results;
  }
}
