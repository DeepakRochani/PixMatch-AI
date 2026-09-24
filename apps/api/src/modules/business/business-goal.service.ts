/**
 * Business Goal Service — PIXMatch AI Phase 18
 * Goal lifecycle, progress evaluation, target verification against actual recorded business data.
 */

import { prisma } from '@pixmatch/database';
import {
  BusinessGoalMetricType,
  BusinessGoalPeriodType,
  BusinessGoalStatus,
  BusinessTransactionType,
  BusinessTransactionStatus,
  StudioBusinessGoalDTO,
  CreateBusinessGoalDTO,
  UpdateBusinessGoalDTO,
} from '@pixmatch/types';

export class BusinessGoalService {
  private db: any;

  constructor(dbClient?: any) {
    this.db = dbClient || prisma;
  }

  private static defaultInstance = new BusinessGoalService();

  static async createGoal(studioId: string, dto: CreateBusinessGoalDTO, userId?: string): Promise<StudioBusinessGoalDTO> {
    return this.defaultInstance.createGoal(studioId, dto, userId);
  }

  static async listGoals(studioId: string, options: any = {}): Promise<StudioBusinessGoalDTO[]> {
    return this.defaultInstance.listGoals(studioId, options);
  }

  static async getGoalById(studioId: string, goalId: string): Promise<StudioBusinessGoalDTO> {
    return this.defaultInstance.getGoalById(studioId, goalId);
  }

  static async updateGoal(studioId: string, goalId: string, dto: UpdateBusinessGoalDTO, userId?: string): Promise<StudioBusinessGoalDTO> {
    return this.defaultInstance.updateGoal(studioId, goalId, dto, userId);
  }

  static async deleteGoal(studioId: string, goalId: string, userId?: string): Promise<any> {
    return this.defaultInstance.deleteGoal(studioId, goalId, userId);
  }

  /**
   * Create a new business goal.
   */
  async createGoal(
    studioId: string,
    dto: CreateBusinessGoalDTO,
    userId?: string
  ): Promise<StudioBusinessGoalDTO> {
    if (!dto.title || !dto.title.trim()) {
      throw new Error('Goal title is required');
    }
    if (typeof dto.target_value !== 'number' || isNaN(dto.target_value) || dto.target_value <= 0) {
      throw new Error('Goal target value must be a positive number');
    }
    if (!dto.start_date || !dto.end_date) {
      throw new Error('Goal start date and end date are required');
    }

    const startDate = new Date(dto.start_date);
    const endDate = new Date(dto.end_date);
    if (endDate <= startDate) {
      throw new Error('Goal end date must be after start date');
    }

    // Determine studio currency
    const studio = await this.db.studio.findUnique({
      where: { id: studioId },
      select: { currency: true },
    });
    const currency = dto.currency || studio?.currency || 'USD';

    // Calculate initial current_value
    const currentValue = await this.calculateMetricValue(
      studioId,
      dto.metric_type,
      startDate,
      endDate
    );

    const progressPct = Number(
      Math.min(100, Math.max(0, (currentValue / dto.target_value) * 100)).toFixed(2)
    );
    const isAchieved = currentValue >= dto.target_value;

    const goal = await this.db.studioBusinessGoal.create({
      data: {
        studio_id: studioId,
        title: dto.title.trim(),
        metric_type: dto.metric_type as any,
        target_value: dto.target_value,
        current_value: currentValue,
        currency: currency.toUpperCase(),
        period_type: (dto.period_type || BusinessGoalPeriodType.MONTHLY) as any,
        start_date: startDate,
        end_date: endDate,
        status: isAchieved ? BusinessGoalStatus.ACHIEVED : BusinessGoalStatus.IN_PROGRESS,
        achieved_at: isAchieved ? new Date() : null,
        progress_pct: progressPct,
        notes: dto.notes || null,
      },
    });

    // Audit log
    if (this.db.studioBusinessAuditLog) {
      await this.db.studioBusinessAuditLog.create({
        data: {
          studio_id: studioId,
          user_id: userId || null,
          action: 'CREATE_GOAL',
          entity_type: 'GOAL',
          entity_id: goal.id,
          new_values: goal as any,
        },
      });
    }

    return this.mapToDTO(goal);
  }

  /**
   * List goals for a studio with automatic progress recalculation.
   */
  async listGoals(
    studioId: string,
    options: { status?: BusinessGoalStatus; period_type?: BusinessGoalPeriodType } = {}
  ): Promise<StudioBusinessGoalDTO[]> {
    const where: any = { studio_id: studioId };
    if (options.status) where.status = options.status;
    if (options.period_type) where.period_type = options.period_type;

    const goals = await this.db.studioBusinessGoal.findMany({
      where,
      orderBy: { created_at: 'desc' },
    });

    const updatedGoals: StudioBusinessGoalDTO[] = [];
    for (const g of goals) {
      if (g.status === BusinessGoalStatus.IN_PROGRESS) {
        const val = await this.calculateMetricValue(
          studioId,
          g.metric_type as any,
          g.start_date,
          g.end_date
        );
        const progressPct = Number(
          Math.min(100, Math.max(0, (val / Number(g.target_value)) * 100)).toFixed(2)
        );
        const now = new Date();
        let status = g.status;
        let achievedAt = g.achieved_at;

        if (val >= Number(g.target_value)) {
          status = BusinessGoalStatus.ACHIEVED as any;
          achievedAt = new Date();
        } else if (now > g.end_date) {
          status = BusinessGoalStatus.MISSED as any;
        }

        const updated = await this.db.studioBusinessGoal.update({
          where: { id: g.id },
          data: {
            current_value: val,
            progress_pct: progressPct,
            status,
            achieved_at: achievedAt,
          },
        });
        updatedGoals.push(this.mapToDTO(updated));
      } else {
        updatedGoals.push(this.mapToDTO(g));
      }
    }

    return updatedGoals;
  }

  /**
   * Get goal by ID with IDOR protection.
   */
  async getGoalById(studioId: string, goalId: string): Promise<StudioBusinessGoalDTO> {
    const goal = await this.db.studioBusinessGoal.findFirst({
      where: { id: goalId, studio_id: studioId },
    });

    if (!goal) {
      throw new Error('Goal not found');
    }

    return this.mapToDTO(goal);
  }

  /**
   * Update an existing goal.
   */
  async updateGoal(
    studioId: string,
    goalId: string,
    dto: UpdateBusinessGoalDTO,
    userId?: string
  ): Promise<StudioBusinessGoalDTO> {
    const existing = await this.db.studioBusinessGoal.findFirst({
      where: { id: goalId, studio_id: studioId },
    });

    if (!existing) {
      throw new Error('Goal not found');
    }

    const data: any = {};
    if (dto.title) data.title = dto.title.trim();
    if (typeof dto.target_value === 'number') {
      if (isNaN(dto.target_value) || dto.target_value <= 0) {
        throw new Error('Target value must be positive');
      }
      data.target_value = dto.target_value;
      const prog = Number(
        Math.min(100, Math.max(0, (Number(existing.current_value) / dto.target_value) * 100)).toFixed(2)
      );
      data.progress_pct = prog;
    }
    if (dto.status) data.status = dto.status as any;
    if (dto.notes !== undefined) data.notes = dto.notes || null;

    const updated = await this.db.studioBusinessGoal.update({
      where: { id: goalId },
      data,
    });

    // Audit log
    if (this.db.studioBusinessAuditLog) {
      await this.db.studioBusinessAuditLog.create({
        data: {
          studio_id: studioId,
          user_id: userId || null,
          action: 'UPDATE_GOAL',
          entity_type: 'GOAL',
          entity_id: goalId,
          old_values: existing as any,
          new_values: updated as any,
        },
      });
    }

    return this.mapToDTO(updated);
  }

  /**
   * Delete a goal.
   */
  async deleteGoal(studioId: string, goalId: string, userId?: string): Promise<{ success: boolean }> {
    const existing = await this.db.studioBusinessGoal.findFirst({
      where: { id: goalId, studio_id: studioId },
    });

    if (!existing) {
      throw new Error('Goal not found');
    }

    await this.db.studioBusinessGoal.delete({ where: { id: goalId } });

    if (this.db.studioBusinessAuditLog) {
      await this.db.studioBusinessAuditLog.create({
        data: {
          studio_id: studioId,
          user_id: userId || null,
          action: 'DELETE_GOAL',
          entity_type: 'GOAL',
          entity_id: goalId,
          old_values: existing as any,
        },
      });
    }

    return { success: true };
  }

  /**
   * Compute actual metric value for a date window from recorded database entities.
   */
  private async calculateMetricValue(
    studioId: string,
    metricType: BusinessGoalMetricType | any,
    startDate: Date,
    endDate: Date
  ): Promise<number> {
    const mType = String(metricType);
    if (
      mType.includes('REVENUE') ||
      mType.includes('PROFIT') ||
      mType.includes('BOOKING') ||
      mType.includes('AVERAGE_ORDER')
    ) {
      const transactions = await this.db.studioBusinessTransaction.findMany({
        where: {
          studio_id: studioId,
          is_void: false,
        },
      });

      let rev = 0;
      let exp = 0;
      let bookingsCount = 0;

      const startMs = new Date(startDate).getTime();
      const endMs = new Date(endDate).getTime();

      for (const t of transactions) {
        const amt = Number(t.amount);
        const tDate = new Date(t.transaction_date || t.date);
        const tMs = tDate.getTime();
        const inWindow = tMs >= startMs && tMs <= endMs;
        const tType = t.type || t.transaction_type;

        if (inWindow) {
          if (tType === BusinessTransactionType.INCOME || tType === 'INCOME') {
            rev += amt;
            bookingsCount++;
          } else if (tType === BusinessTransactionType.EXPENSE || tType === 'EXPENSE') {
            exp += amt;
          } else if (tType === BusinessTransactionType.REFUND || tType === 'REFUND') {
            rev -= amt;
          }
        }
      }

      const netRev = Math.max(0, rev);
      if (mType.includes('REVENUE')) return Number(netRev.toFixed(2));
      if (mType.includes('PROFIT')) return Number((netRev - exp).toFixed(2));
      if (mType.includes('BOOKING')) return bookingsCount;
      if (mType.includes('AVERAGE_ORDER')) {
        return bookingsCount > 0 ? Number((netRev / bookingsCount).toFixed(2)) : 0;
      }
    }

    if (mType.includes('GALLER')) {
      const galleries = await this.db.gallery.findMany({
        where: { studio_id: studioId },
      });
      return galleries.length;
    }

    return 0;
  }

  private mapToDTO(g: any): StudioBusinessGoalDTO {
    const targetVal = Number(g.target_value);
    const currVal = Number(g.current_value || 0);
    const progPct = g.progress_pct !== undefined ? Number(g.progress_pct) : targetVal > 0 ? Number(((currVal / targetVal) * 100).toFixed(2)) : 0;

    return {
      id: g.id,
      studio_id: g.studio_id,
      title: g.title,
      metric_type: g.metric_type,
      target_value: targetVal,
      current_value: currVal,
      currency: g.currency || 'USD',
      period_type: g.period_type,
      start_date: g.start_date,
      end_date: g.end_date,
      status: g.status,
      progress_pct: progPct,
      progress_percentage: progPct,
      notes: g.notes,
      achieved_at: g.achieved_at,
      created_at: g.created_at,
      updated_at: g.updated_at,

      // CamelCase UI aliases
      studioId: g.studio_id,
      metricType: g.metric_type,
      targetValue: targetVal,
      currentValue: currVal,
      periodType: g.period_type,
      startDate: g.start_date,
      endDate: g.end_date,
      progressPct: progPct,
      progressPercentage: progPct,
      achievedAt: g.achieved_at,
      createdAt: g.created_at,
      updatedAt: g.updated_at,
    } as any;
  }
}
