/**
 * Studio Business Plan Service — PIXMatch AI Phase 39
 * Manages business plan lifecycle, versioning, reconciliation, and audit logging.
 */

import { prisma } from '@pixmatch/database';
import {
  BusinessPlanType,
  BusinessPlanStatus,
  BusinessPlanTargetType,
  IBusinessPlanDTO,
  IBusinessPlanCreateInput,
  IBusinessPlanUpdateInput,
  IPlanReconciliationResult,
} from '@pixmatch/types';

export class StudioBusinessPlanService {
  /**
   * List all business plans for a studio
   */
  static async listPlans(studioId: string, type?: BusinessPlanType, status?: BusinessPlanStatus) {
    const where: any = { studioId };
    if (type) where.type = type;
    if (status) where.status = status;

    const plans = await prisma.studioBusinessPlan.findMany({
      where,
      orderBy: [{ fiscalYear: 'desc' }, { version: 'desc' }],
      include: {
        targets: true,
        strategicObjectives: {
          include: {
            initiatives: {
              include: {
                milestones: true,
              },
            },
          },
        },
        reviews: {
          orderBy: { reviewDate: 'desc' },
        },
      },
    });

    return plans;
  }

  /**
   * Get single business plan by ID
   */
  static async getPlanById(studioId: string, planId: string) {
    const plan = await prisma.studioBusinessPlan.findFirst({
      where: { id: planId, studioId },
      include: {
        targets: {
          orderBy: [{ targetType: 'asc' }, { periodMonth: 'asc' }],
        },
        strategicObjectives: {
          include: {
            initiatives: {
              include: {
                milestones: {
                  orderBy: { dueDate: 'asc' },
                },
              },
            },
          },
        },
        reviews: {
          orderBy: { reviewDate: 'desc' },
        },
        audits: {
          orderBy: { createdAt: 'desc' },
          take: 50,
        },
      },
    });

    if (!plan) {
      throw new Error(`Business plan ${planId} not found for studio ${studioId}`);
    }

    return plan;
  }

  /**
   * Get the active business plan for a given fiscal year or current
   */
  static async getActivePlan(studioId: string, fiscalYear?: number) {
    const currentYear = fiscalYear || new Date().getFullYear();
    const plan = await prisma.studioBusinessPlan.findFirst({
      where: {
        studioId,
        fiscalYear: currentYear,
        status: BusinessPlanStatus.ACTIVE,
      },
      include: {
        targets: true,
        strategicObjectives: {
          include: {
            initiatives: {
              include: {
                milestones: true,
              },
            },
          },
        },
      },
    });

    if (!plan) {
      // Fallback to most recent approved or draft plan if no active plan
      return prisma.studioBusinessPlan.findFirst({
        where: { studioId, fiscalYear: currentYear },
        orderBy: { updatedAt: 'desc' },
        include: {
          targets: true,
          strategicObjectives: {
            include: {
              initiatives: {
                milestones: true,
              },
            },
          },
        },
      });
    }

    return plan;
  }

  /**
   * Create a new business plan in DRAFT status
   */
  static async createPlan(studioId: string, userId: string, input: IBusinessPlanCreateInput) {
    const {
      name,
      description,
      type = BusinessPlanType.ANNUAL,
      fiscalYear = new Date().getFullYear(),
      startDate,
      endDate,
      currency = 'INR',
      targets = [],
    } = input;

    // Determine next version for this fiscal year and type
    const latestPlan = await prisma.studioBusinessPlan.findFirst({
      where: { studioId, fiscalYear, type },
      orderBy: { version: 'desc' },
    });
    const version = latestPlan ? latestPlan.version + 1 : 1;

    // Validate target reconciliation if provided
    if (targets.length > 0) {
      const reconciliation = this.validateTargetReconciliation(targets);
      if (!reconciliation.isReconciled) {
        throw new Error(
          `Target period reconciliation failed: ${reconciliation.discrepancies.map((d) => d.message).join('; ')}`
        );
      }
    }

    const start = startDate ? new Date(startDate) : new Date(fiscalYear, 0, 1);
    const end = endDate ? new Date(endDate) : new Date(fiscalYear, 11, 31);

    const plan = await prisma.studioBusinessPlan.create({
      data: {
        studioId,
        name,
        description,
        type,
        status: BusinessPlanStatus.DRAFT,
        version,
        fiscalYear,
        startDate: start,
        endDate: end,
        currency,
        targets: {
          create: targets.map((t) => ({
            studioId,
            targetType: t.targetType,
            unit: t.unit || 'CURRENCY',
            plannedValue: BigInt(t.plannedValue),
            actualValue: t.actualValue !== undefined ? BigInt(t.actualValue) : null,
            forecastValue: t.forecastValue !== undefined ? BigInt(t.forecastValue) : null,
            periodYear: t.periodYear || fiscalYear,
            periodQuarter: t.periodQuarter,
            periodMonth: t.periodMonth,
            notes: t.notes,
          })),
        },
      },
      include: {
        targets: true,
      },
    });

    // Record audit log
    await this.logAudit(
      studioId,
      plan.id,
      userId,
      'CREATE_PLAN',
      null,
      BusinessPlanStatus.DRAFT,
      `Created business plan "${name}" (v${version}) for FY${fiscalYear}`
    );

    return plan;
  }

  /**
   * Update plan details and targets (allowed only in DRAFT or IN_REVIEW)
   */
  static async updatePlan(
    studioId: string,
    planId: string,
    userId: string,
    input: IBusinessPlanUpdateInput
  ) {
    const existing = await prisma.studioBusinessPlan.findFirst({
      where: { id: planId, studioId },
      include: { targets: true },
    });

    if (!existing) {
      throw new Error(`Business plan ${planId} not found`);
    }

    if (
      existing.status === BusinessPlanStatus.LOCKED ||
      existing.status === BusinessPlanStatus.ARCHIVED ||
      existing.status === BusinessPlanStatus.SUPERSEDED
    ) {
      throw new Error(`Cannot modify plan in ${existing.status} status. Duplicate or create a new version.`);
    }

    const updateData: any = {};
    if (input.name) updateData.name = input.name;
    if (input.description !== undefined) updateData.description = input.description;
    if (input.startDate) updateData.startDate = new Date(input.startDate);
    if (input.endDate) updateData.endDate = new Date(input.endDate);
    if (input.currency) updateData.currency = input.currency;

    // If targets are updated
    if (input.targets) {
      const reconciliation = this.validateTargetReconciliation(input.targets);
      if (!reconciliation.isReconciled) {
        throw new Error(
          `Target reconciliation error: ${reconciliation.discrepancies.map((d) => d.message).join('; ')}`
        );
      }

      // Replace targets
      await prisma.studioBusinessPlanTarget.deleteMany({
        where: { businessPlanId: planId },
      });

      updateData.targets = {
        create: input.targets.map((t) => ({
          studioId,
          targetType: t.targetType,
          unit: t.unit || 'CURRENCY',
          plannedValue: BigInt(t.plannedValue),
          actualValue: t.actualValue !== undefined && t.actualValue !== null ? BigInt(t.actualValue) : null,
          forecastValue: t.forecastValue !== undefined && t.forecastValue !== null ? BigInt(t.forecastValue) : null,
          periodYear: t.periodYear || existing.fiscalYear,
          periodQuarter: t.periodQuarter,
          periodMonth: t.periodMonth,
          notes: t.notes,
        })),
      };
    }

    const updated = await prisma.studioBusinessPlan.update({
      where: { id: planId },
      data: updateData,
      include: { targets: true },
    });

    await this.logAudit(
      studioId,
      planId,
      userId,
      'UPDATE_PLAN',
      existing.status,
      updated.status,
      `Updated plan metadata or targets`
    );

    return updated;
  }

  /**
   * Transition plan status with governance checks
   */
  static async transitionStatus(
    studioId: string,
    planId: string,
    userId: string,
    newStatus: BusinessPlanStatus,
    reason?: string
  ) {
    const plan = await prisma.studioBusinessPlan.findFirst({
      where: { id: planId, studioId },
      include: { targets: true },
    });

    if (!plan) {
      throw new Error(`Plan ${planId} not found`);
    }

    const oldStatus = plan.status as BusinessPlanStatus;

    // Validate lifecycle transition rules
    this.validateLifecycleTransition(oldStatus, newStatus);

    // If activating this plan, mark any existing ACTIVE plan for the same fiscal year and type as SUPERSEDED
    if (newStatus === BusinessPlanStatus.ACTIVE) {
      await prisma.studioBusinessPlan.updateMany({
        where: {
          studioId,
          fiscalYear: plan.fiscalYear,
          type: plan.type,
          id: { not: planId },
          status: BusinessPlanStatus.ACTIVE,
        },
        data: {
          status: BusinessPlanStatus.SUPERSEDED,
        },
      });
    }

    const updateFields: any = { status: newStatus };
    if (newStatus === BusinessPlanStatus.APPROVED) {
      updateFields.approvedById = userId;
      updateFields.approvedAt = new Date();
    } else if (newStatus === BusinessPlanStatus.LOCKED) {
      updateFields.lockedById = userId;
      updateFields.lockedAt = new Date();
    }

    const updated = await prisma.studioBusinessPlan.update({
      where: { id: planId },
      data: updateFields,
      include: { targets: true },
    });

    await this.logAudit(
      studioId,
      planId,
      userId,
      'STATUS_TRANSITION',
      oldStatus,
      newStatus,
      reason || `Transitioned plan status from ${oldStatus} to ${newStatus}`
    );

    return updated;
  }

  /**
   * Clone/re-baseline plan to a new DRAFT version
   */
  static async rebaselinePlan(
    studioId: string,
    planId: string,
    userId: string,
    newName?: string,
    reason?: string
  ) {
    const sourcePlan = await prisma.studioBusinessPlan.findFirst({
      where: { id: planId, studioId },
      include: {
        targets: true,
        strategicObjectives: {
          include: {
            initiatives: {
              include: {
                milestones: true,
              },
            },
          },
        },
      },
    });

    if (!sourcePlan) {
      throw new Error(`Source plan ${planId} not found`);
    }

    // Determine next version number
    const highestVer = await prisma.studioBusinessPlan.findFirst({
      where: { studioId, fiscalYear: sourcePlan.fiscalYear, type: sourcePlan.type },
      orderBy: { version: 'desc' },
    });
    const nextVersion = (highestVer?.version || 1) + 1;

    const newPlan = await prisma.studioBusinessPlan.create({
      data: {
        studioId,
        name: newName || `${sourcePlan.name} (v${nextVersion})`,
        description: `Re-baselined from v${sourcePlan.version}. ${reason || ''}`.trim(),
        type: sourcePlan.type,
        status: BusinessPlanStatus.DRAFT,
        version: nextVersion,
        fiscalYear: sourcePlan.fiscalYear,
        startDate: sourcePlan.startDate,
        endDate: sourcePlan.endDate,
        currency: sourcePlan.currency,
        targets: {
          create: sourcePlan.targets.map((t) => ({
            studioId,
            targetType: t.targetType,
            unit: t.unit,
            plannedValue: t.plannedValue,
            actualValue: t.actualValue,
            forecastValue: t.forecastValue,
            periodYear: t.periodYear,
            periodQuarter: t.periodQuarter,
            periodMonth: t.periodMonth,
            notes: t.notes,
          })),
        },
        strategicObjectives: {
          create: sourcePlan.strategicObjectives.map((obj) => ({
            studioId,
            title: obj.title,
            description: obj.description,
            category: obj.category,
            targetMetric: obj.targetMetric,
            targetValue: obj.targetValue,
            currentValue: obj.currentValue,
            unit: obj.unit,
            initiatives: {
              create: obj.initiatives.map((init) => ({
                studioId,
                title: init.title,
                description: init.description,
                ownerId: init.ownerId,
                priority: init.priority,
                status: init.status,
                startDate: init.startDate,
                endDate: init.endDate,
                estimatedBudget: init.estimatedBudget,
                actualSpent: init.actualSpent,
                expectedRoi: init.expectedRoi,
                milestones: {
                  create: init.milestones.map((m) => ({
                    studioId,
                    title: m.title,
                    dueDate: m.dueDate,
                    completionPercent: m.completionPercent,
                    status: m.status,
                  })),
                },
              })),
            },
          })),
        },
      },
      include: {
        targets: true,
        strategicObjectives: {
          include: {
            initiatives: {
              include: {
                milestones: true,
              },
            },
          },
        },
      },
    });

    await this.logAudit(
      studioId,
      newPlan.id,
      userId,
      'REBASELINE_PLAN',
      null,
      BusinessPlanStatus.DRAFT,
      `Cloned and re-baselined from plan ${planId} (v${sourcePlan.version}) to v${nextVersion}`
    );

    return newPlan;
  }

  /**
   * Validate target period reconciliation
   * Annual target must equal sum of 12 monthly targets.
   * Quarter targets must equal sum of 3 corresponding monthly targets.
   */
  static validateTargetReconciliation(targets: Array<{
    targetType: BusinessPlanTargetType | string;
    periodMonth?: number | null;
    periodQuarter?: number | null;
    plannedValue: number | string | bigint;
  }>): IPlanReconciliationResult {
    const discrepancies: Array<{ targetType: string; period: string; message: string }> = [];

    // Group targets by targetType
    const grouped = new Map<string, typeof targets>();
    for (const t of targets) {
      const type = t.targetType.toString();
      if (!grouped.has(type)) grouped.set(type, []);
      grouped.get(type)!.push(t);
    }

    for (const [targetType, list] of grouped.entries()) {
      // Find annual target (no month, no quarter)
      const annualTarget = list.find(
        (t) => (t.periodMonth === null || t.periodMonth === undefined) && (t.periodQuarter === null || t.periodQuarter === undefined)
      );

      const monthlyTargets = list.filter((t) => t.periodMonth !== null && t.periodMonth !== undefined);
      const quarterTargets = list.filter(
        (t) => (t.periodMonth === null || t.periodMonth === undefined) && t.periodQuarter !== null && t.periodQuarter !== undefined
      );

      // If both annual and 12 monthly targets exist, verify sum
      if (annualTarget && monthlyTargets.length === 12) {
        const monthlySum = monthlyTargets.reduce((sum, t) => sum + BigInt(t.plannedValue), BigInt(0));
        const annualVal = BigInt(annualTarget.plannedValue);
        if (monthlySum !== annualVal) {
          discrepancies.push({
            targetType,
            period: 'ANNUAL',
            message: `Annual target (${annualVal}) does not match sum of 12 monthly targets (${monthlySum}). Difference: ${annualVal - monthlySum}`,
          });
        }
      }

      // If quarter targets and monthly targets exist, verify each quarter
      if (quarterTargets.length > 0 && monthlyTargets.length > 0) {
        for (const q of quarterTargets) {
          const quarterNum = q.periodQuarter!;
          const qMonths = [(quarterNum - 1) * 3 + 1, (quarterNum - 1) * 3 + 2, quarterNum * 3];
          const monthsInQuarter = monthlyTargets.filter((t) => qMonths.includes(t.periodMonth!));
          if (monthsInQuarter.length === 3) {
            const qMonthSum = monthsInQuarter.reduce((sum, t) => sum + BigInt(t.plannedValue), BigInt(0));
            const qVal = BigInt(q.plannedValue);
            if (qMonthSum !== qVal) {
              discrepancies.push({
                targetType,
                period: `Q${quarterNum}`,
                message: `Quarter ${quarterNum} target (${qVal}) does not match sum of months ${qMonths.join(',')}(${qMonthSum}). Difference: ${qVal - qMonthSum}`,
              });
            }
          }
        }
      }
    }

    return {
      isReconciled: discrepancies.length === 0,
      discrepancies,
    };
  }

  /**
   * Validate lifecycle transitions
   */
  private static validateLifecycleTransition(current: BusinessPlanStatus, next: BusinessPlanStatus) {
    const validTransitions: Record<BusinessPlanStatus, BusinessPlanStatus[]> = {
      [BusinessPlanStatus.DRAFT]: [BusinessPlanStatus.IN_REVIEW, BusinessPlanStatus.ARCHIVED],
      [BusinessPlanStatus.IN_REVIEW]: [BusinessPlanStatus.DRAFT, BusinessPlanStatus.APPROVED, BusinessPlanStatus.ARCHIVED],
      [BusinessPlanStatus.APPROVED]: [BusinessPlanStatus.ACTIVE, BusinessPlanStatus.ARCHIVED],
      [BusinessPlanStatus.ACTIVE]: [BusinessPlanStatus.LOCKED, BusinessPlanStatus.SUPERSEDED, BusinessPlanStatus.ARCHIVED],
      [BusinessPlanStatus.LOCKED]: [BusinessPlanStatus.SUPERSEDED, BusinessPlanStatus.ARCHIVED],
      [BusinessPlanStatus.SUPERSEDED]: [BusinessPlanStatus.ARCHIVED],
      [BusinessPlanStatus.ARCHIVED]: [],
    };

    const allowed = validTransitions[current] || [];
    if (!allowed.includes(next)) {
      throw new Error(`Invalid status transition from ${current} to ${next}. Allowed transitions: ${allowed.join(', ') || 'none'}`);
    }
  }

  /**
   * Helper to write audit log entries
   */
  static async logAudit(
    studioId: string,
    businessPlanId: string,
    userId: string,
    action: string,
    previousStatus: BusinessPlanStatus | string | null,
    newStatus: BusinessPlanStatus | string | null,
    details?: string,
    metadata?: any
  ) {
    try {
      return await prisma.studioBusinessPlanAudit.create({
        data: {
          studioId,
          businessPlanId,
          userId,
          action,
          previousStatus: previousStatus ? previousStatus.toString() : null,
          newStatus: newStatus ? newStatus.toString() : null,
          details,
          metadata: metadata || undefined,
        },
      });
    } catch (err) {
      console.error('[StudioBusinessPlanService.logAudit] Failed to create audit entry:', err);
    }
  }
}
