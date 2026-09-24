/**
 * Copilot Attention Service — PIXMatch AI Phase 15
 * Aggregates, prioritizes, and ranks items requiring the photographer's attention across galleries.
 */

import { prisma } from '@pixmatch/database';
import {
  CopilotAttentionItemDTO,
  CopilotAttentionSummaryDTO,
  CopilotRecommendationSeverity,
  CopilotRecommendationType,
  GalleryHealthStatus,
} from '@pixmatch/types';
import { GalleryHealthService } from './gallery-health.service.js';

export class CopilotAttentionService {
  private db: any;
  private healthService: GalleryHealthService;

  constructor(dbClient?: any) {
    this.db = dbClient || prisma;
    this.healthService = new GalleryHealthService(this.db);
  }

  private static defaultInstance = new CopilotAttentionService();

  static async getAttentionSummary(studioId: string, galleryId?: string): Promise<CopilotAttentionSummaryDTO> {
    return this.defaultInstance.getAttentionSummary(studioId, galleryId);
  }

  async getAttentionSummary(studioId: string, galleryId?: string): Promise<CopilotAttentionSummaryDTO> {
    const galleryWhere: any = { studio_id: studioId };
    if (galleryId) {
      galleryWhere.id = galleryId;
    }

    const galleries = await this.db.gallery.findMany({
      where: galleryWhere,
      select: {
        id: true,
        title: true,
        status: true,
      },
    });

    const attentionItems: CopilotAttentionItemDTO[] = [];
    const galleriesNeedingAttention: Array<{
      gallery_id: string;
      gallery_title: string;
      health_score: number;
      health_status: GalleryHealthStatus;
      issue_count: number;
    }> = [];

    for (const gal of galleries) {
      try {
        const health = await this.healthService.calculateHealth(studioId, gal.id);
        const galleryIssues: CopilotAttentionItemDTO[] = [];

        for (const cat of health.categories) {
          for (const issue of cat.issues) {
            const isBlocking = issue.severity === CopilotRecommendationSeverity.CRITICAL || issue.severity === CopilotRecommendationSeverity.HIGH;

            let recType: CopilotRecommendationType = CopilotRecommendationType.GENERAL_ACTION;
            if (issue.id.includes('fail')) recType = CopilotRecommendationType.PROCESSING_FAILURE;
            else if (issue.id.includes('pend')) recType = CopilotRecommendationType.PROCESSING_PENDING;
            else if (issue.id.includes('ai') || issue.id.includes('index')) recType = CopilotRecommendationType.MISSING_AI_INDEX;
            else if (issue.id.includes('cover')) recType = CopilotRecommendationType.COVER_RECOMMENDATION;
            else if (issue.id.includes('dup')) recType = CopilotRecommendationType.DUPLICATES_FOUND;
            else if (issue.id.includes('qual') || issue.id.includes('blur')) recType = CopilotRecommendationType.LOW_QUALITY_PHOTOS;
            else if (issue.id.includes('story')) recType = CopilotRecommendationType.EVENT_STORY_RECOMMENDATION;
            else if (issue.id.includes('album')) recType = CopilotRecommendationType.SMART_ALBUM_RECOMMENDATION;

            const attentionItem: CopilotAttentionItemDTO = {
              id: `${gal.id}-${issue.id}`,
              title: `${gal.title}: ${issue.message}`,
              description: issue.suggested_action || issue.message,
              severity: issue.severity,
              type: recType,
              blocking_impact: isBlocking,
              gallery_id: gal.id,
              gallery_title: gal.title,
              confidence: 0.95,
              created_at: new Date(),
              action_label: issue.suggested_action || 'Review',
              action_type: issue.action_type || 'REVIEW_GALLERY',
              action_payload: issue.payload || { galleryId: gal.id },
            };

            attentionItems.push(attentionItem);
            galleryIssues.push(attentionItem);
          }
        }

        if (galleryIssues.length > 0 || health.status !== GalleryHealthStatus.READY) {
          galleriesNeedingAttention.push({
            gallery_id: gal.id,
            gallery_title: gal.title,
            health_score: health.score,
            health_status: health.status,
            issue_count: galleryIssues.length,
          });
        }
      } catch (err) {
        // Skip inaccessible galleries gracefully
      }
    }

    // Severity weighting order
    const severityWeight: Record<CopilotRecommendationSeverity, number> = {
      [CopilotRecommendationSeverity.CRITICAL]: 5,
      [CopilotRecommendationSeverity.HIGH]: 4,
      [CopilotRecommendationSeverity.MEDIUM]: 3,
      [CopilotRecommendationSeverity.LOW]: 2,
      [CopilotRecommendationSeverity.INFO]: 1,
    };

    // Sort by severity descending, then blocking impact
    attentionItems.sort((a, b) => {
      const weightA = severityWeight[a.severity] || 0;
      const weightB = severityWeight[b.severity] || 0;
      if (weightB !== weightA) return weightB - weightA;
      if (a.blocking_impact !== b.blocking_impact) return a.blocking_impact ? -1 : 1;
      return 0;
    });

    const criticalCount = attentionItems.filter((i) => i.severity === CopilotRecommendationSeverity.CRITICAL).length;
    const highCount = attentionItems.filter((i) => i.severity === CopilotRecommendationSeverity.HIGH).length;
    const mediumCount = attentionItems.filter((i) => i.severity === CopilotRecommendationSeverity.MEDIUM).length;
    const lowCount = attentionItems.filter((i) => i.severity === CopilotRecommendationSeverity.LOW).length;
    const infoCount = attentionItems.filter((i) => i.severity === CopilotRecommendationSeverity.INFO).length;

    return {
      studio_id: studioId,
      total_unresolved: attentionItems.length,
      critical_count: criticalCount,
      high_count: highCount,
      medium_count: mediumCount,
      low_count: lowCount,
      info_count: infoCount,
      top_attention_items: attentionItems.slice(0, 15),
      galleries_needing_attention: galleriesNeedingAttention,
    };
  }
}
