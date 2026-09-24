/**
 * Studio Strategic Initiative Service — PIXMatch AI Phase 39
 * Manages strategic objectives, key initiatives, execution milestones, and goal alignment.
 */

import { prisma } from '@pixmatch/database';
import {
  StrategicObjectiveType,
  StrategicInitiativeStatus,
  StrategicInitiativePriority,
  StrategicMilestoneStatus,
  IStrategicObjectiveDTO,
  IStrategicInitiativeDTO,
  IStrategicMilestoneDTO,
} from '@pixmatch/types';

export class StudioStrategicInitiativeService {
  /**
   * List all objectives and initiatives for a business plan
   */
  static async listPlanObjectives(studioId: string, planId: string): Promise<IStrategicObjectiveDTO[]> {
    const objectives = await prisma.studioStrategicObjective.findMany({
      where: { studioId, businessPlanId: planId },
      include: {
        initiatives: {
          include: {
            milestones: {
              orderBy: { dueDate: 'asc' },
            },
          },
          orderBy: [{ priority: 'asc' }, { createdAt: 'asc' }],
        },
      },
    });

    return objectives.map((obj) => this.mapObjectiveToDTO(obj));
  }

  /**
   * Create strategic objective under a plan
   */
  static async createObjective(
    studioId: string,
    planId: string,
    input: {
      title: string;
      description?: string;
      category?: StrategicObjectiveType;
      targetMetric?: string;
      targetValue?: number;
      currentValue?: number;
      unit?: string;
    }
  ): Promise<IStrategicObjectiveDTO> {
    const plan = await prisma.studioBusinessPlan.findFirst({
      where: { id: planId, studioId },
    });
    if (!plan) throw new Error(`Plan ${planId} not found`);

    const obj = await prisma.studioStrategicObjective.create({
      data: {
        studioId,
        businessPlanId: planId,
        title: input.title,
        description: input.description,
        category: input.category || StrategicObjectiveType.EXPANSION,
        targetMetric: input.targetMetric,
        targetValue: input.targetValue !== undefined ? input.targetValue : null,
        currentValue: input.currentValue !== undefined ? input.currentValue : null,
        unit: input.unit || 'NUMBER',
      },
      include: {
        initiatives: {
          include: { milestones: true },
        },
      },
    });

    return this.mapObjectiveToDTO(obj);
  }

  /**
   * Update strategic objective
   */
  static async updateObjective(
    studioId: string,
    objectiveId: string,
    input: {
      title?: string;
      description?: string;
      category?: StrategicObjectiveType;
      targetMetric?: string;
      targetValue?: number;
      currentValue?: number;
      unit?: string;
    }
  ): Promise<IStrategicObjectiveDTO> {
    const existing = await prisma.studioStrategicObjective.findFirst({
      where: { id: objectiveId, studioId },
    });
    if (!existing) throw new Error(`Objective ${objectiveId} not found`);

    const updated = await prisma.studioStrategicObjective.update({
      where: { id: objectiveId },
      data: {
        ...(input.title ? { title: input.title } : {}),
        ...(input.description !== undefined ? { description: input.description } : {}),
        ...(input.category ? { category: input.category } : {}),
        ...(input.targetMetric !== undefined ? { targetMetric: input.targetMetric } : {}),
        ...(input.targetValue !== undefined ? { targetValue: input.targetValue } : {}),
        ...(input.currentValue !== undefined ? { currentValue: input.currentValue } : {}),
        ...(input.unit ? { unit: input.unit } : {}),
      },
      include: {
        initiatives: {
          include: { milestones: true },
        },
      },
    });

    return this.mapObjectiveToDTO(updated);
  }

  /**
   * Delete objective and child initiatives
   */
  static async deleteObjective(studioId: string, objectiveId: string): Promise<boolean> {
    const existing = await prisma.studioStrategicObjective.findFirst({
      where: { id: objectiveId, studioId },
    });
    if (!existing) throw new Error(`Objective ${objectiveId} not found`);

    await prisma.studioStrategicObjective.delete({
      where: { id: objectiveId },
    });

    return true;
  }

  /**
   * Create strategic initiative under an objective
   */
  static async createInitiative(
    studioId: string,
    objectiveId: string,
    input: {
      title: string;
      description?: string;
      ownerId?: string;
      priority?: StrategicInitiativePriority;
      status?: StrategicInitiativeStatus;
      startDate?: Date | string;
      endDate?: Date | string;
      estimatedBudget?: number;
      actualSpent?: number;
      expectedRoi?: string;
    }
  ): Promise<IStrategicInitiativeDTO> {
    const obj = await prisma.studioStrategicObjective.findFirst({
      where: { id: objectiveId, studioId },
    });
    if (!obj) throw new Error(`Objective ${objectiveId} not found`);

    const initiative = await prisma.studioStrategicInitiative.create({
      data: {
        studioId,
        objectiveId,
        title: input.title,
        description: input.description,
        ownerId: input.ownerId,
        priority: input.priority || StrategicInitiativePriority.MEDIUM,
        status: input.status || StrategicInitiativeStatus.PLANNED,
        startDate: input.startDate ? new Date(input.startDate) : null,
        endDate: input.endDate ? new Date(input.endDate) : null,
        estimatedBudget: input.estimatedBudget !== undefined ? BigInt(input.estimatedBudget) : null,
        actualSpent: input.actualSpent !== undefined ? BigInt(input.actualSpent) : null,
        expectedRoi: input.expectedRoi,
      },
      include: {
        milestones: true,
      },
    });

    return this.mapInitiativeToDTO(initiative);
  }

  /**
   * Update initiative
   */
  static async updateInitiative(
    studioId: string,
    initiativeId: string,
    input: {
      title?: string;
      description?: string;
      ownerId?: string;
      priority?: StrategicInitiativePriority;
      status?: StrategicInitiativeStatus;
      startDate?: Date | string;
      endDate?: Date | string;
      estimatedBudget?: number;
      actualSpent?: number;
      expectedRoi?: string;
    }
  ): Promise<IStrategicInitiativeDTO> {
    const existing = await prisma.studioStrategicInitiative.findFirst({
      where: { id: initiativeId, studioId },
    });
    if (!existing) throw new Error(`Initiative ${initiativeId} not found`);

    const updated = await prisma.studioStrategicInitiative.update({
      where: { id: initiativeId },
      data: {
        ...(input.title ? { title: input.title } : {}),
        ...(input.description !== undefined ? { description: input.description } : {}),
        ...(input.ownerId !== undefined ? { ownerId: input.ownerId } : {}),
        ...(input.priority ? { priority: input.priority } : {}),
        ...(input.status ? { status: input.status } : {}),
        ...(input.startDate ? { startDate: new Date(input.startDate) } : {}),
        ...(input.endDate ? { endDate: new Date(input.endDate) } : {}),
        ...(input.estimatedBudget !== undefined ? { estimatedBudget: BigInt(input.estimatedBudget) } : {}),
        ...(input.actualSpent !== undefined ? { actualSpent: BigInt(input.actualSpent) } : {}),
        ...(input.expectedRoi !== undefined ? { expectedRoi: input.expectedRoi } : {}),
      },
      include: {
        milestones: true,
      },
    });

    return this.mapInitiativeToDTO(updated);
  }

  /**
   * Add milestone to initiative
   */
  static async createMilestone(
    studioId: string,
    initiativeId: string,
    input: {
      title: string;
      dueDate?: Date | string;
      completionPercent?: number;
      status?: StrategicMilestoneStatus;
    }
  ): Promise<IStrategicMilestoneDTO> {
    const initiative = await prisma.studioStrategicInitiative.findFirst({
      where: { id: initiativeId, studioId },
    });
    if (!initiative) throw new Error(`Initiative ${initiativeId} not found`);

    const milestone = await prisma.studioStrategicMilestone.create({
      data: {
        studioId,
        initiativeId,
        title: input.title,
        dueDate: input.dueDate ? new Date(input.dueDate) : null,
        completionPercent: input.completionPercent || 0,
        status: input.status || StrategicMilestoneStatus.PENDING,
      },
    });

    return this.mapMilestoneToDTO(milestone);
  }

  /**
   * Update milestone status / progress
   */
  static async updateMilestone(
    studioId: string,
    milestoneId: string,
    input: {
      title?: string;
      dueDate?: Date | string;
      completionPercent?: number;
      status?: StrategicMilestoneStatus;
    }
  ): Promise<IStrategicMilestoneDTO> {
    const existing = await prisma.studioStrategicMilestone.findFirst({
      where: { id: milestoneId, studioId },
    });
    if (!existing) throw new Error(`Milestone ${milestoneId} not found`);

    let completionPercent = input.completionPercent;
    let status = input.status;

    if (completionPercent === 100 && !status) {
      status = StrategicMilestoneStatus.COMPLETED;
    } else if (status === StrategicMilestoneStatus.COMPLETED && completionPercent === undefined) {
      completionPercent = 100;
    }

    const updated = await prisma.studioStrategicMilestone.update({
      where: { id: milestoneId },
      data: {
        ...(input.title ? { title: input.title } : {}),
        ...(input.dueDate ? { dueDate: new Date(input.dueDate) } : {}),
        ...(completionPercent !== undefined ? { completionPercent } : {}),
        ...(status ? { status } : {}),
      },
    });

    return this.mapMilestoneToDTO(updated);
  }

  // Helper mappers
  private static mapObjectiveToDTO(obj: any): IStrategicObjectiveDTO {
    const initiatives = (obj.initiatives || []).map((i: any) => this.mapInitiativeToDTO(i));
    const totalInitiatives = initiatives.length;
    const completedInitiatives = initiatives.filter((i: any) => i.status === 'COMPLETED').length;

    let overallProgress = 0;
    if (totalInitiatives > 0) {
      overallProgress = Math.round(
        initiatives.reduce((sum: number, i: any) => sum + (i.progressPercent || 0), 0) / totalInitiatives
      );
    }

    return {
      id: obj.id,
      businessPlanId: obj.businessPlanId,
      title: obj.title,
      description: obj.description,
      category: obj.category as StrategicObjectiveType,
      targetMetric: obj.targetMetric,
      targetValue: obj.targetValue,
      currentValue: obj.currentValue,
      unit: obj.unit,
      initiatives,
      totalInitiatives,
      completedInitiatives,
      overallProgress,
      createdAt: obj.createdAt?.toISOString?.() || obj.createdAt,
      updatedAt: obj.updatedAt?.toISOString?.() || obj.updatedAt,
    };
  }

  private static mapInitiativeToDTO(init: any): IStrategicInitiativeDTO {
    const milestones = (init.milestones || []).map((m: any) => this.mapMilestoneToDTO(m));
    const totalMilestones = milestones.length;
    const completedMilestones = milestones.filter((m: any) => m.status === 'COMPLETED' || m.completionPercent === 100).length;

    let progressPercent = 0;
    if (totalMilestones > 0) {
      progressPercent = Math.round(
        milestones.reduce((sum: number, m: any) => sum + m.completionPercent, 0) / totalMilestones
      );
    } else if (init.status === 'COMPLETED') {
      progressPercent = 100;
    }

    return {
      id: init.id,
      objectiveId: init.objectiveId,
      title: init.title,
      description: init.description,
      ownerId: init.ownerId,
      priority: init.priority as StrategicInitiativePriority,
      status: init.status as StrategicInitiativeStatus,
      startDate: init.startDate?.toISOString?.() || init.startDate,
      endDate: init.endDate?.toISOString?.() || init.endDate,
      estimatedBudget: init.estimatedBudget ? Number(init.estimatedBudget) : null,
      actualSpent: init.actualSpent ? Number(init.actualSpent) : null,
      expectedRoi: init.expectedRoi,
      progressPercent,
      milestones,
      totalMilestones,
      completedMilestones,
      createdAt: init.createdAt?.toISOString?.() || init.createdAt,
      updatedAt: init.updatedAt?.toISOString?.() || init.updatedAt,
    };
  }

  private static mapMilestoneToDTO(m: any): IStrategicMilestoneDTO {
    return {
      id: m.id,
      initiativeId: m.initiativeId,
      title: m.title,
      dueDate: m.dueDate?.toISOString?.() || m.dueDate,
      completionPercent: m.completionPercent,
      status: m.status as StrategicMilestoneStatus,
      createdAt: m.createdAt?.toISOString?.() || m.createdAt,
      updatedAt: m.updatedAt?.toISOString?.() || m.updatedAt,
    };
  }
}
