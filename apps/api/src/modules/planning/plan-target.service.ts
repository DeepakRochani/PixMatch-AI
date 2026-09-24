/**
 * Studio Plan Target Service — PIXMatch AI Phase 39
 * Manages 15 business plan target types, progress tracking, and actuals derivation.
 */

import { prisma } from '@pixmatch/database';
import {
  BusinessPlanTargetType,
  BusinessPlanTargetUnit,
  IBusinessPlanTargetDTO,
} from '@pixmatch/types';

export class StudioPlanTargetService {
  /**
   * List targets for a plan, optionally filtered by type or period
   */
  static async getPlanTargets(
    studioId: string,
    planId: string,
    targetType?: BusinessPlanTargetType,
    periodQuarter?: number,
    periodMonth?: number
  ) {
    const where: any = { studioId, businessPlanId: planId };
    if (targetType) where.targetType = targetType;
    if (periodQuarter !== undefined) where.periodQuarter = periodQuarter;
    if (periodMonth !== undefined) where.periodMonth = periodMonth;

    const targets = await prisma.studioBusinessPlanTarget.findMany({
      where,
      orderBy: [{ targetType: 'asc' }, { periodMonth: 'asc' }],
    });

    return targets.map((t) => this.mapToDTO(t));
  }

  /**
   * Upsert a single plan target
   */
  static async upsertTarget(
    studioId: string,
    planId: string,
    input: {
      id?: string;
      targetType: BusinessPlanTargetType;
      unit?: BusinessPlanTargetUnit;
      plannedValue: number | string | bigint;
      actualValue?: number | string | bigint | null;
      forecastValue?: number | string | bigint | null;
      periodYear?: number;
      periodQuarter?: number | null;
      periodMonth?: number | null;
      notes?: string | null;
    }
  ) {
    const plan = await prisma.studioBusinessPlan.findFirst({
      where: { id: planId, studioId },
    });
    if (!plan) {
      throw new Error(`Plan ${planId} not found`);
    }

    const year = input.periodYear || plan.fiscalYear;

    if (input.id) {
      const updated = await prisma.studioBusinessPlanTarget.update({
        where: { id: input.id },
        data: {
          plannedValue: BigInt(input.plannedValue),
          actualValue: input.actualValue !== undefined && input.actualValue !== null ? BigInt(input.actualValue) : null,
          forecastValue: input.forecastValue !== undefined && input.forecastValue !== null ? BigInt(input.forecastValue) : null,
          unit: input.unit || BusinessPlanTargetUnit.CURRENCY,
          notes: input.notes,
        },
      });
      return this.mapToDTO(updated);
    }

    // Check if target already exists for this type and period
    const existing = await prisma.studioBusinessPlanTarget.findFirst({
      where: {
        businessPlanId: planId,
        targetType: input.targetType,
        periodYear: year,
        periodQuarter: input.periodQuarter ?? null,
        periodMonth: input.periodMonth ?? null,
      },
    });

    if (existing) {
      const updated = await prisma.studioBusinessPlanTarget.update({
        where: { id: existing.id },
        data: {
          plannedValue: BigInt(input.plannedValue),
          actualValue: input.actualValue !== undefined && input.actualValue !== null ? BigInt(input.actualValue) : null,
          forecastValue: input.forecastValue !== undefined && input.forecastValue !== null ? BigInt(input.forecastValue) : null,
          unit: input.unit || existing.unit,
          notes: input.notes !== undefined ? input.notes : existing.notes,
        },
      });
      return this.mapToDTO(updated);
    }

    const created = await prisma.studioBusinessPlanTarget.create({
      data: {
        studioId,
        businessPlanId: planId,
        targetType: input.targetType,
        unit: input.unit || BusinessPlanTargetUnit.CURRENCY,
        plannedValue: BigInt(input.plannedValue),
        actualValue: input.actualValue !== undefined && input.actualValue !== null ? BigInt(input.actualValue) : null,
        forecastValue: input.forecastValue !== undefined && input.forecastValue !== null ? BigInt(input.forecastValue) : null,
        periodYear: year,
        periodQuarter: input.periodQuarter ?? null,
        periodMonth: input.periodMonth ?? null,
        notes: input.notes,
      },
    });

    return this.mapToDTO(created);
  }

  /**
   * Populate/Refresh actual values for a plan's targets from GL/Operational actuals
   */
  static async refreshActuals(studioId: string, planId: string) {
    const plan = await prisma.studioBusinessPlan.findFirst({
      where: { id: planId, studioId },
      include: { targets: true },
    });
    if (!plan) throw new Error(`Plan ${planId} not found`);

    const year = plan.fiscalYear;

    for (const target of plan.targets) {
      const actualVal = await this.deriveActualValue(
        studioId,
        target.targetType as BusinessPlanTargetType,
        year,
        target.periodQuarter,
        target.periodMonth
      );

      if (actualVal !== null) {
        await prisma.studioBusinessPlanTarget.update({
          where: { id: target.id },
          data: { actualValue: actualVal },
        });
      }
    }

    return this.getPlanTargets(studioId, planId);
  }

  /**
   * Derive actual metric value from operational and financial tables
   */
  private static async deriveActualValue(
    studioId: string,
    targetType: BusinessPlanTargetType,
    year: number,
    quarter?: number | null,
    month?: number | null
  ): Promise<bigint | null> {
    const { startDate, endDate } = this.getPeriodDateRange(year, quarter, month);

    try {
      switch (targetType) {
        case BusinessPlanTargetType.REVENUE: {
          // Sum invoices or transactions in date range
          const invoices = await prisma.studioInvoice.findMany({
            where: {
              studioId,
              status: { in: ['PAID', 'PARTIALLY_PAID'] },
              createdAt: { gte: startDate, lte: endDate },
            },
            select: { totalPaidAmount: true, totalAmount: true },
          });
          const totalPaid = invoices.reduce((sum, inv) => sum + (inv.totalPaidAmount || inv.totalAmount || 0), 0);
          return BigInt(totalPaid);
        }

        case BusinessPlanTargetType.EXPENSES: {
          const expenses = await prisma.studioExpense.findMany({
            where: {
              studioId,
              expenseDate: { gte: startDate, lte: endDate },
            },
            select: { amount: true },
          });
          const total = expenses.reduce((sum, exp) => sum + exp.amount, 0);
          return BigInt(total);
        }

        case BusinessPlanTargetType.GROSS_PROFIT:
        case BusinessPlanTargetType.NET_PROFIT: {
          const invoices = await prisma.studioInvoice.findMany({
            where: {
              studioId,
              status: { in: ['PAID', 'PARTIALLY_PAID'] },
              createdAt: { gte: startDate, lte: endDate },
            },
            select: { totalPaidAmount: true, totalAmount: true },
          });
          const totalRev = invoices.reduce((sum, inv) => sum + (inv.totalPaidAmount || inv.totalAmount || 0), 0);
          const expenses = await prisma.studioExpense.findMany({
            where: {
              studioId,
              expenseDate: { gte: startDate, lte: endDate },
            },
            select: { amount: true },
          });
          const totalExp = expenses.reduce((sum, exp) => sum + exp.amount, 0);
          return BigInt(totalRev - totalExp);
        }

        case BusinessPlanTargetType.BOOKINGS_COUNT: {
          const count = await prisma.studioBooking.count({
            where: {
              studioId,
              createdAt: { gte: startDate, lte: endDate },
            },
          });
          return BigInt(count);
        }

        case BusinessPlanTargetType.CLIENT_ACQUISITIONS: {
          const count = await prisma.studioClient.count({
            where: {
              studioId,
              createdAt: { gte: startDate, lte: endDate },
            },
          });
          return BigInt(count);
        }

        default:
          return null;
      }
    } catch (err) {
      console.warn(`[StudioPlanTargetService] Could not derive actual for ${targetType}:`, err);
      return null;
    }
  }

  /**
   * Helper to calculate period date range
   */
  static getPeriodDateRange(year: number, quarter?: number | null, month?: number | null) {
    if (month) {
      const startDate = new Date(year, month - 1, 1, 0, 0, 0);
      const endDate = new Date(year, month, 0, 23, 59, 59, 999);
      return { startDate, endDate };
    }
    if (quarter) {
      const startMonth = (quarter - 1) * 3;
      const startDate = new Date(year, startMonth, 1, 0, 0, 0);
      const endDate = new Date(year, startMonth + 3, 0, 23, 59, 59, 999);
      return { startDate, endDate };
    }
    const startDate = new Date(year, 0, 1, 0, 0, 0);
    const endDate = new Date(year, 11, 31, 23, 59, 59, 999);
    return { startDate, endDate };
  }

  /**
   * Helper to map Prisma entity to DTO
   */
  static mapToDTO(entity: any): IBusinessPlanTargetDTO {
    const planned = Number(entity.plannedValue);
    const actual = entity.actualValue !== null && entity.actualValue !== undefined ? Number(entity.actualValue) : null;
    const forecast = entity.forecastValue !== null && entity.forecastValue !== undefined ? Number(entity.forecastValue) : null;

    let variance = null;
    let variancePercent = null;
    let achievementPercent = null;

    if (actual !== null) {
      variance = actual - planned;
      if (planned !== 0) {
        variancePercent = (variance / Math.abs(planned)) * 100;
        achievementPercent = (actual / planned) * 100;
      }
    }

    return {
      id: entity.id,
      businessPlanId: entity.businessPlanId,
      targetType: entity.targetType as BusinessPlanTargetType,
      unit: entity.unit as BusinessPlanTargetUnit,
      plannedValue: planned,
      actualValue: actual,
      forecastValue: forecast,
      periodYear: entity.periodYear,
      periodQuarter: entity.periodQuarter,
      periodMonth: entity.periodMonth,
      notes: entity.notes,
      achievementPercent: achievementPercent !== null ? Math.round(achievementPercent * 100) / 100 : null,
      createdAt: entity.createdAt?.toISOString?.() || entity.createdAt,
      updatedAt: entity.updatedAt?.toISOString?.() || entity.updatedAt,
    };
  }

  /**
   * Resolve default unit for a target type
   */
  static getDefaultUnit(targetType: BusinessPlanTargetType): BusinessPlanTargetUnit {
    switch (targetType) {
      case BusinessPlanTargetType.GROSS_MARGIN_BPS:
      case BusinessPlanTargetType.LEAD_CONVERSION_RATE_BPS:
      case BusinessPlanTargetType.CLIENT_RETENTION_RATE_BPS:
      case BusinessPlanTargetType.COLLECTION_RATE_BPS:
        return BusinessPlanTargetUnit.BASIS_POINTS;
      case BusinessPlanTargetType.TEAM_UTILIZATION_PERCENT:
        return BusinessPlanTargetUnit.PERCENTAGE;
      case BusinessPlanTargetType.BOOKINGS_COUNT:
      case BusinessPlanTargetType.CLIENT_ACQUISITION_COUNT:
      case BusinessPlanTargetType.ACTIVE_CLIENTS_COUNT:
        return BusinessPlanTargetUnit.COUNT;
      case BusinessPlanTargetType.PROJECT_DELIVERY_TIME_DAYS:
        return BusinessPlanTargetUnit.DAYS;
      case BusinessPlanTargetType.REVENUE:
      case BusinessPlanTargetType.NET_PROFIT:
      case BusinessPlanTargetType.EXPENSES:
      case BusinessPlanTargetType.CASH_RESERVE_MINIMUM:
      case BusinessPlanTargetType.AVERAGE_ORDER_VALUE:
      case BusinessPlanTargetType.PIPELINE_VALUE:
      default:
        return BusinessPlanTargetUnit.CURRENCY;
    }
  }

  /**
   * Convert Basis Points to Percentage (100 bps = 1.00%)
   */
  static bpsToPercent(bps: number): number {
    return bps / 100;
  }

  /**
   * Convert Percentage to Basis Points (1.00% = 100 bps)
   */
  static percentToBps(percent: number): number {
    return Math.round(percent * 100);
  }

  /**
   * Calculate progress percentage safely (null if planned === 0)
   */
  static calculateProgress(planned: number, actual: number): number | null {
    if (planned === 0) return null;
    return Math.round((actual / planned) * 10000) / 100;
  }
}
