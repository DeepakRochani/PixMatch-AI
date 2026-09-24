/**
 * Studio Business Plan Review Service — PIXMatch AI Phase 39
 * Manages Quarterly Business Reviews (QBR) and Monthly Review Cadence.
 */

import { prisma } from '@pixmatch/database';
import {
  PlanReviewStatus,
  IBusinessPlanReviewDTO,
} from '@pixmatch/types';

export class StudioPlanReviewService {
  /**
   * List all reviews for a business plan
   */
  static async listPlanReviews(studioId: string, planId: string): Promise<IBusinessPlanReviewDTO[]> {
    const reviews = await prisma.studioBusinessPlanReview.findMany({
      where: { studioId, businessPlanId: planId },
      orderBy: { reviewDate: 'desc' },
    });

    return reviews.map((r) => this.mapToDTO(r));
  }

  /**
   * Schedule or record a business plan review
   */
  static async createReview(
    studioId: string,
    planId: string,
    input: {
      reviewPeriod: string;
      reviewDate: Date | string;
      reviewerId: string;
      status?: PlanReviewStatus;
      revenueVariance?: number;
      expenseVariance?: number;
      operationalNotes?: string;
      qualitativeFindings?: string;
      actionItems?: string[];
      attendees?: string[];
    }
  ): Promise<IBusinessPlanReviewDTO> {
    const plan = await prisma.studioBusinessPlan.findFirst({
      where: { id: planId, studioId },
    });
    if (!plan) throw new Error(`Plan ${planId} not found`);

    const review = await prisma.studioBusinessPlanReview.create({
      data: {
        studioId,
        businessPlanId: planId,
        reviewPeriod: input.reviewPeriod,
        reviewDate: new Date(input.reviewDate),
        reviewerId: input.reviewerId,
        status: input.status || PlanReviewStatus.SCHEDULED,
        revenueVariance: input.revenueVariance !== undefined ? BigInt(input.revenueVariance) : null,
        expenseVariance: input.expenseVariance !== undefined ? BigInt(input.expenseVariance) : null,
        operationalNotes: input.operationalNotes,
        qualitativeFindings: input.qualitativeFindings,
        actionItems: input.actionItems || [],
        attendees: input.attendees || [],
      },
    });

    return this.mapToDTO(review);
  }

  /**
   * Update review findings and action items
   */
  static async updateReview(
    studioId: string,
    reviewId: string,
    input: {
      reviewPeriod?: string;
      reviewDate?: Date | string;
      status?: PlanReviewStatus;
      revenueVariance?: number;
      expenseVariance?: number;
      operationalNotes?: string;
      qualitativeFindings?: string;
      actionItems?: string[];
      attendees?: string[];
    }
  ): Promise<IBusinessPlanReviewDTO> {
    const existing = await prisma.studioBusinessPlanReview.findFirst({
      where: { id: reviewId, studioId },
    });
    if (!existing) throw new Error(`Review ${reviewId} not found`);

    const updated = await prisma.studioBusinessPlanReview.update({
      where: { id: reviewId },
      data: {
        ...(input.reviewPeriod ? { reviewPeriod: input.reviewPeriod } : {}),
        ...(input.reviewDate ? { reviewDate: new Date(input.reviewDate) } : {}),
        ...(input.status ? { status: input.status } : {}),
        ...(input.revenueVariance !== undefined ? { revenueVariance: BigInt(input.revenueVariance) } : {}),
        ...(input.expenseVariance !== undefined ? { expenseVariance: BigInt(input.expenseVariance) } : {}),
        ...(input.operationalNotes !== undefined ? { operationalNotes: input.operationalNotes } : {}),
        ...(input.qualitativeFindings !== undefined ? { qualitativeFindings: input.qualitativeFindings } : {}),
        ...(input.actionItems ? { actionItems: input.actionItems } : {}),
        ...(input.attendees ? { attendees: input.attendees } : {}),
      },
    });

    return this.mapToDTO(updated);
  }

  private static mapToDTO(r: any): IBusinessPlanReviewDTO {
    return {
      id: r.id,
      businessPlanId: r.businessPlanId,
      reviewPeriod: r.reviewPeriod,
      reviewDate: r.reviewDate?.toISOString?.() || r.reviewDate,
      reviewerId: r.reviewerId,
      status: r.status as PlanReviewStatus,
      revenueVariance: r.revenueVariance ? Number(r.revenueVariance) : null,
      expenseVariance: r.expenseVariance ? Number(r.expenseVariance) : null,
      operationalNotes: r.operationalNotes,
      qualitativeFindings: r.qualitativeFindings,
      actionItems: r.actionItems || [],
      attendees: r.attendees || [],
      createdAt: r.createdAt?.toISOString?.() || r.createdAt,
      updatedAt: r.updatedAt?.toISOString?.() || r.updatedAt,
    };
  }
}
