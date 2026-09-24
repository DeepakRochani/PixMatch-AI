/**
 * Gallery Health Service — PIXMatch AI Phase 15
 * Multi-dimensional operational gallery readiness and health scoring engine.
 */

import { prisma, ProcessingStatus } from '@pixmatch/database';
import {
  GalleryHealthDTO,
  GalleryHealthCategoryDTO,
  GalleryHealthStatus,
  GalleryHealthIssueDTO,
  CopilotRecommendationSeverity,
  CopilotRecommendationType,
  CopilotRecommendationStatus,
  CopilotRecommendationDTO,
} from '@pixmatch/types';

export class GalleryHealthService {
  private db: any;

  constructor(dbClient?: any) {
    this.db = dbClient || prisma;
  }

  private static defaultInstance = new GalleryHealthService();

  static async calculateHealth(studioId: string, galleryId: string): Promise<GalleryHealthDTO> {
    return this.defaultInstance.calculateHealth(studioId, galleryId);
  }

  async calculateHealth(studioId: string, galleryId: string): Promise<GalleryHealthDTO> {
    // 1. Fetch gallery and related metadata with tenant isolation
    const gallery = await this.db.gallery.findFirst({
      where: { id: galleryId, studio_id: studioId },
      include: {
        photos: {
          select: {
            id: true,
            status: true,
            preview_url: true,
            thumbnail_url: true,
            is_cover: true,
            is_favorite: true,
            is_selected: true,
            created_at: true,
            ai_analysis: {
              select: {
                id: true,
                quality_score: true,
                sharpness: true,
                exposure: true,
                is_blurry: true,
                is_dark: true,
                is_best_shot: true,
                duplicate_group_id: true,
                near_duplicate_group_id: true,
                scene_category: true,
                tags: true,
              },
            },
          },
        },
        jobs: {
          select: { id: true, type: true, status: true, error: true },
          take: 50,
          orderBy: { created_at: 'desc' },
        },
        smart_albums: {
          select: { id: true, name: true, type: true, is_active: true },
        },
        event_intelligence: {
          include: {
            chapters: true,
            story: true,
            highlights: true,
          },
        },
        clients: {
          select: { client_id: true },
        },
      },
    });

    if (!gallery) {
      throw new Error(`Gallery ${galleryId} not found for studio ${studioId}`);
    }

    const photos = gallery.photos || [];
    const totalPhotos = photos.length;
    const jobs = gallery.jobs || [];

    const recommendations: CopilotRecommendationDTO[] = [];
    const categories: GalleryHealthCategoryDTO[] = [];

    // -------------------------------------------------------------
    // 1. Processing Readiness Category (Weight: 20%)
    // -------------------------------------------------------------
    const failedJobs = jobs.filter((j: any) => j.status === ProcessingStatus.FAILED || j.status === 'FAILED');
    const pendingPhotos = photos.filter((p: any) => p.status === ProcessingStatus.PENDING || p.status === ProcessingStatus.PROCESSING || p.status === 'PENDING' || p.status === 'PROCESSING');
    const failedPhotos = photos.filter((p: any) => p.status === ProcessingStatus.FAILED || p.status === 'FAILED');

    const processingIssues: GalleryHealthIssueDTO[] = [];
    let processingScore = 100;

    if (totalPhotos === 0) {
      processingScore = 50;
      processingIssues.push({
        id: 'no-photos',
        severity: CopilotRecommendationSeverity.HIGH,
        message: 'No photos uploaded to this gallery yet.',
        suggested_action: 'Upload photos to start processing',
        action_type: 'UPLOAD_PHOTOS',
      });
    } else {
      if (failedPhotos.length > 0 || failedJobs.length > 0) {
        const failCount = Math.max(failedPhotos.length, failedJobs.length);
        processingScore -= Math.min(60, failCount * 15);
        processingIssues.push({
          id: 'processing-failures',
          severity: CopilotRecommendationSeverity.HIGH,
          message: `${failCount} photo processing jobs failed.`,
          suggested_action: 'Retry failed processing jobs',
          action_type: 'RETRY_PROCESSING',
          payload: { galleryId },
        });

        recommendations.push({
          id: `rec-fail-${galleryId}`,
          studio_id: studioId,
          gallery_id: galleryId,
          type: CopilotRecommendationType.PROCESSING_FAILURE,
          severity: CopilotRecommendationSeverity.HIGH,
          title: 'Processing Failures Detected',
          description: `${failCount} photos encountered processing errors.`,
          reason: 'Unprocessed photos will not appear in the client gallery.',
          confidence: 0.99,
          status: CopilotRecommendationStatus.OPEN,
          created_at: new Date(),
          updated_at: new Date(),
          suggested_action: {
            action_type: 'RETRY_PROCESSING',
            label: 'Retry Failed Jobs',
            requires_approval: false,
            payload: { galleryId },
          },
        });
      }

      if (pendingPhotos.length > 0) {
        processingScore -= Math.min(30, pendingPhotos.length * 5);
        processingIssues.push({
          id: 'processing-pending',
          severity: CopilotRecommendationSeverity.MEDIUM,
          message: `${pendingPhotos.length} photos are still in processing queue.`,
          suggested_action: 'Wait for background processing to finish',
        });

        recommendations.push({
          id: `rec-pend-${galleryId}`,
          studio_id: studioId,
          gallery_id: galleryId,
          type: CopilotRecommendationType.PROCESSING_PENDING,
          severity: CopilotRecommendationSeverity.MEDIUM,
          title: 'Processing In Progress',
          description: `${pendingPhotos.length} photos currently processing.`,
          reason: 'Gallery indexing is still underway.',
          confidence: 0.95,
          status: CopilotRecommendationStatus.OPEN,
          created_at: new Date(),
          updated_at: new Date(),
        });
      }
    }

    processingScore = Math.max(0, Math.min(100, processingScore));
    categories.push({
      key: 'processing',
      label: 'Photo Processing',
      score: processingScore,
      status: processingScore >= 90 ? GalleryHealthStatus.READY : processingScore >= 60 ? GalleryHealthStatus.ALMOST_READY : GalleryHealthStatus.NEEDS_ATTENTION,
      explanation: totalPhotos === 0 ? 'No photos present.' : `${totalPhotos - pendingPhotos.length - failedPhotos.length}/${totalPhotos} photos successfully processed.`,
      weight: 0.20,
      issues: processingIssues,
    });

    // -------------------------------------------------------------
    // 2. AI Indexing Readiness (Weight: 15%)
    // -------------------------------------------------------------
    const aiIssues: GalleryHealthIssueDTO[] = [];
    let aiScore = 100;
    const indexedPhotosCount = photos.filter((p: any) => !!p.ai_analysis).length;

    if (gallery.enable_ai_face_search && totalPhotos > 0) {
      const missingIndexCount = totalPhotos - indexedPhotosCount;
      if (missingIndexCount > 0) {
        const missingPct = Math.round((missingIndexCount / totalPhotos) * 100);
        aiScore -= Math.min(60, missingPct);
        aiIssues.push({
          id: 'missing-ai-index',
          severity: missingPct > 20 ? CopilotRecommendationSeverity.HIGH : CopilotRecommendationSeverity.MEDIUM,
          message: `${missingIndexCount} photos (${missingPct}%) have not been AI indexed.`,
          suggested_action: 'Run AI indexing for unindexed photos',
          action_type: 'REINDEX_AI',
          payload: { galleryId },
        });

        recommendations.push({
          id: `rec-ai-${galleryId}`,
          studio_id: studioId,
          gallery_id: galleryId,
          type: CopilotRecommendationType.MISSING_AI_INDEX,
          severity: missingPct > 20 ? CopilotRecommendationSeverity.HIGH : CopilotRecommendationSeverity.MEDIUM,
          title: 'AI Indexing Incomplete',
          description: `${missingIndexCount} photos are missing AI facial and scene indexing.`,
          reason: 'Clients using Find My Photos will miss photos that are not indexed.',
          confidence: 0.95,
          status: CopilotRecommendationStatus.OPEN,
          created_at: new Date(),
          updated_at: new Date(),
          suggested_action: {
            action_type: 'REINDEX_AI',
            label: 'Index Missing Photos',
            requires_approval: false,
            payload: { galleryId },
          },
        });
      }
    }

    aiScore = Math.max(0, Math.min(100, aiScore));
    categories.push({
      key: 'ai_indexing',
      label: 'AI & Face Indexing',
      score: aiScore,
      status: aiScore >= 90 ? GalleryHealthStatus.READY : aiScore >= 60 ? GalleryHealthStatus.ALMOST_READY : GalleryHealthStatus.NEEDS_ATTENTION,
      explanation: totalPhotos === 0 ? 'No photos to index.' : `${indexedPhotosCount}/${totalPhotos} photos indexed for facial & scene search.`,
      weight: 0.20,
      issues: aiIssues,
    });

    // -------------------------------------------------------------
    // 3. Photo Quality & Curated Selection (Weight: 15%)
    // -------------------------------------------------------------
    const qualityIssues: GalleryHealthIssueDTO[] = [];
    let qualityScore = 100;
    const analyzedPhotos = photos.filter((p: any) => !!p.ai_analysis);
    const blurryPhotos = analyzedPhotos.filter((p: any) => p.ai_analysis.is_blurry);
    const darkPhotos = analyzedPhotos.filter((p: any) => p.ai_analysis.is_dark);
    const lowScorePhotos = analyzedPhotos.filter((p: any) => (p.ai_analysis.quality_score ?? 1.0) < 0.45);

    const problematicQualityCount = new Set([...blurryPhotos.map((p: any) => p.id), ...darkPhotos.map((p: any) => p.id), ...lowScorePhotos.map((p: any) => p.id)]).size;

    if (problematicQualityCount > 0 && totalPhotos > 0) {
      const lowQualityPct = (problematicQualityCount / totalPhotos) * 100;
      if (lowQualityPct > 10) {
        qualityScore -= Math.min(40, Math.round(lowQualityPct));
        qualityIssues.push({
          id: 'low-quality-photos',
          severity: CopilotRecommendationSeverity.LOW,
          message: `${problematicQualityCount} photos flagged with blur, low exposure, or low aesthetic score.`,
          suggested_action: 'Review low quality photos before client delivery',
          action_type: 'REVIEW_LOW_QUALITY',
        });

        recommendations.push({
          id: `rec-qual-${galleryId}`,
          studio_id: studioId,
          gallery_id: galleryId,
          type: CopilotRecommendationType.LOW_QUALITY_PHOTOS,
          severity: CopilotRecommendationSeverity.LOW,
          title: 'Review Low-Quality Photos',
          description: `${problematicQualityCount} photos have blur or lighting issues.`,
          reason: 'Reviewing flagged photos helps ensure a polished client delivery.',
          confidence: 0.88,
          status: CopilotRecommendationStatus.OPEN,
          created_at: new Date(),
          updated_at: new Date(),
        });
      }
    }

    qualityScore = Math.max(0, Math.min(100, qualityScore));
    categories.push({
      key: 'photo_quality',
      label: 'Photo Quality & Review',
      score: qualityScore,
      status: qualityScore >= 85 ? GalleryHealthStatus.READY : qualityScore >= 60 ? GalleryHealthStatus.ALMOST_READY : GalleryHealthStatus.NEEDS_ATTENTION,
      explanation: problematicQualityCount === 0 ? 'No major quality anomalies detected.' : `${problematicQualityCount} photos flagged for review.`,
      weight: 0.15,
      issues: qualityIssues,
    });

    // -------------------------------------------------------------
    // 4. Duplicates & Burst Clusters (Weight: 10%)
    // -------------------------------------------------------------
    const dupIssues: GalleryHealthIssueDTO[] = [];
    let dupScore = 100;
    const duplicateGroups = new Set<string>();
    for (const p of analyzedPhotos) {
      if (p.ai_analysis.duplicate_group_id) duplicateGroups.add(p.ai_analysis.duplicate_group_id);
      if (p.ai_analysis.near_duplicate_group_id) duplicateGroups.add(p.ai_analysis.near_duplicate_group_id);
    }

    if (duplicateGroups.size > 0) {
      dupScore -= Math.min(30, duplicateGroups.size * 6);
      dupIssues.push({
        id: 'duplicates-found',
        severity: CopilotRecommendationSeverity.LOW,
        message: `${duplicateGroups.size} burst/duplicate clusters detected in gallery.`,
        suggested_action: 'Review duplicate photo clusters and pick best shots',
        action_type: 'REVIEW_DUPLICATES',
      });

      recommendations.push({
        id: `rec-dup-${galleryId}`,
        studio_id: studioId,
        gallery_id: galleryId,
        type: CopilotRecommendationType.DUPLICATES_FOUND,
        severity: CopilotRecommendationSeverity.LOW,
        title: 'Burst & Duplicate Clusters Found',
        description: `${duplicateGroups.size} groups of rapid-burst or near-duplicate shots detected.`,
        reason: 'Curating burst shots down to the best photos improves client viewing engagement.',
        confidence: 0.90,
        status: CopilotRecommendationStatus.OPEN,
        created_at: new Date(),
        updated_at: new Date(),
      });
    }

    dupScore = Math.max(0, Math.min(100, dupScore));
    categories.push({
      key: 'duplicates',
      label: 'Burst & Duplicate Curation',
      score: dupScore,
      status: dupScore >= 80 ? GalleryHealthStatus.READY : GalleryHealthStatus.ALMOST_READY,
      explanation: duplicateGroups.size === 0 ? 'Zero excessive duplicate clusters detected.' : `${duplicateGroups.size} duplicate clusters identified for review.`,
      weight: 0.10,
      issues: dupIssues,
    });

    // -------------------------------------------------------------
    // 5. Cover Photo & Visual Representation (Weight: 15%)
    // -------------------------------------------------------------
    const coverIssues: GalleryHealthIssueDTO[] = [];
    let coverScore = 100;
    const hasCover = !!gallery.cover_photo_url || photos.some((p: any) => p.is_cover);

    if (!hasCover && totalPhotos > 0) {
      coverScore = 30;
      coverIssues.push({
        id: 'missing-cover',
        severity: CopilotRecommendationSeverity.HIGH,
        message: 'No cover photo selected for this gallery.',
        suggested_action: 'Select a hero cover photo',
        action_type: 'APPLY_RECOMMENDED_COVER',
        payload: { galleryId },
      });

      recommendations.push({
        id: `rec-cover-${galleryId}`,
        studio_id: studioId,
        gallery_id: galleryId,
        type: CopilotRecommendationType.COVER_RECOMMENDATION,
        severity: CopilotRecommendationSeverity.HIGH,
        title: 'Select Cover Photo',
        description: 'The gallery is missing a primary hero cover image.',
        reason: 'Cover photos create the first impression for clients opening their gallery link.',
        confidence: 0.98,
        status: CopilotRecommendationStatus.OPEN,
        created_at: new Date(),
        updated_at: new Date(),
        suggested_action: {
          action_type: 'APPLY_RECOMMENDED_COVER',
          label: 'Apply AI Suggested Cover',
          requires_approval: true,
          payload: { galleryId },
        },
      });
    }

    coverScore = Math.max(0, Math.min(100, coverScore));
    categories.push({
      key: 'cover_photo',
      label: 'Cover & Visual Presentation',
      score: coverScore,
      status: coverScore >= 90 ? GalleryHealthStatus.READY : GalleryHealthStatus.NEEDS_ATTENTION,
      explanation: hasCover ? 'Cover photo is set.' : 'Missing gallery cover image.',
      weight: 0.15,
      issues: coverIssues,
    });

    // -------------------------------------------------------------
    // 6. Smart Albums & Event Story Readiness (Weight: 10%)
    // -------------------------------------------------------------
    const storyIssues: GalleryHealthIssueDTO[] = [];
    let storyScore = 100;
    const eventIntel = gallery.event_intelligence;
    const hasStory = !!eventIntel?.story && eventIntel.story.status === 'PUBLISHED';
    const smartAlbumsCount = (gallery.smart_albums || []).length;

    if (!eventIntel && totalPhotos >= 15) {
      storyScore -= 30;
      storyIssues.push({
        id: 'missing-event-intel',
        severity: CopilotRecommendationSeverity.MEDIUM,
        message: 'Event Intelligence and timeline chapters have not been generated.',
        suggested_action: 'Generate Event Intelligence & Chapters',
        action_type: 'GENERATE_EVENT_STORY',
        payload: { galleryId },
      });

      recommendations.push({
        id: `rec-story-${galleryId}`,
        studio_id: studioId,
        gallery_id: galleryId,
        type: CopilotRecommendationType.EVENT_STORY_RECOMMENDATION,
        severity: CopilotRecommendationSeverity.MEDIUM,
        title: 'Generate Event Story',
        description: 'Automatic chronological chapters and story narrative available.',
        reason: 'Event storytelling organizes large events into intuitive chapters for clients.',
        confidence: 0.85,
        status: CopilotRecommendationStatus.OPEN,
        created_at: new Date(),
        updated_at: new Date(),
        suggested_action: {
          action_type: 'GENERATE_EVENT_STORY',
          label: 'Generate Event Story',
          requires_approval: false,
          payload: { galleryId },
        },
      });
    }

    if (smartAlbumsCount === 0 && totalPhotos >= 20) {
      storyScore -= 20;
      storyIssues.push({
        id: 'missing-smart-albums',
        severity: CopilotRecommendationSeverity.LOW,
        message: 'No Smart Albums configured for this gallery.',
        suggested_action: 'Generate Smart Albums',
        action_type: 'GENERATE_SMART_ALBUMS',
        payload: { galleryId },
      });

      recommendations.push({
        id: `rec-album-${galleryId}`,
        studio_id: studioId,
        gallery_id: galleryId,
        type: CopilotRecommendationType.SMART_ALBUM_RECOMMENDATION,
        severity: CopilotRecommendationSeverity.LOW,
        title: 'Create Smart Albums',
        description: 'Auto-categorize photos into Ceremony, Portraits, and Reception albums.',
        reason: 'Smart albums help guests navigate large wedding and event galleries effortlessly.',
        confidence: 0.80,
        status: CopilotRecommendationStatus.OPEN,
        created_at: new Date(),
        updated_at: new Date(),
        suggested_action: {
          action_type: 'GENERATE_SMART_ALBUMS',
          label: 'Generate Smart Albums',
          requires_approval: false,
          payload: { galleryId },
        },
      });
    }

    storyScore = Math.max(0, Math.min(100, storyScore));
    categories.push({
      key: 'story_and_albums',
      label: 'Story & Smart Albums',
      score: storyScore,
      status: storyScore >= 80 ? GalleryHealthStatus.READY : GalleryHealthStatus.ALMOST_READY,
      explanation: hasStory ? 'Event Story generated and ready.' : `${smartAlbumsCount} smart albums active.`,
      weight: 0.10,
      issues: storyIssues,
    });

    // -------------------------------------------------------------
    // 7. Client Experience & Sharing Settings (Weight: 10%)
    // -------------------------------------------------------------
    const clientIssues: GalleryHealthIssueDTO[] = [];
    let clientScore = 100;
    const clientCount = (gallery.clients || []).length;

    if (clientCount === 0 && gallery.status === 'ACTIVE') {
      clientScore -= 20;
      clientIssues.push({
        id: 'no-clients-assigned',
        severity: CopilotRecommendationSeverity.INFO,
        message: 'No clients assigned to this gallery.',
        suggested_action: 'Assign clients or share public link',
      });
    }

    if (!gallery.downloads_enabled) {
      clientIssues.push({
        id: 'downloads-disabled',
        severity: CopilotRecommendationSeverity.INFO,
        message: 'Client downloads are currently disabled in gallery settings.',
      });
    }

    if (gallery.expires_at && new Date(gallery.expires_at).getTime() < Date.now()) {
      clientScore -= 50;
      clientIssues.push({
        id: 'gallery-expired',
        severity: CopilotRecommendationSeverity.CRITICAL,
        message: 'Gallery has reached its expiration date and is inaccessible.',
        suggested_action: 'Extend expiration date in settings',
      });
    }

    clientScore = Math.max(0, Math.min(100, clientScore));
    categories.push({
      key: 'client_delivery',
      label: 'Client Delivery & Settings',
      score: clientScore,
      status: clientScore >= 85 ? GalleryHealthStatus.READY : clientScore >= 60 ? GalleryHealthStatus.ALMOST_READY : GalleryHealthStatus.NEEDS_ATTENTION,
      explanation: `Gallery status is ${gallery.status}. ${clientCount} assigned clients.`,
      weight: 0.10,
      issues: clientIssues,
    });

    // -------------------------------------------------------------
    // Calculate Overall Weighted Score & Status
    // -------------------------------------------------------------
    const totalWeightedScore = Math.round(
      categories.reduce((acc, cat) => acc + cat.score * cat.weight, 0)
    );

    let overallStatus: GalleryHealthStatus = GalleryHealthStatus.READY;
    let statusExplanation = 'Gallery is healthy and operational.';

    const hasCriticalIssues = categories.some((c) => c.issues.some((i) => i.severity === CopilotRecommendationSeverity.CRITICAL));
    const hasHighIssues = categories.some((c) => c.issues.some((i) => i.severity === CopilotRecommendationSeverity.HIGH));

    if (hasCriticalIssues || totalPhotos === 0 || totalWeightedScore < 50) {
      overallStatus = GalleryHealthStatus.BLOCKED;
      statusExplanation = 'Gallery has blocking issues that prevent successful client sharing.';
    } else if (hasHighIssues || totalWeightedScore < 75) {
      overallStatus = GalleryHealthStatus.NEEDS_ATTENTION;
      statusExplanation = 'Gallery requires attention to resolve processing errors or missing essentials.';
    } else if (totalWeightedScore < 90) {
      overallStatus = GalleryHealthStatus.ALMOST_READY;
      statusExplanation = 'Gallery is almost ready for client delivery with minor optional improvements.';
    } else {
      overallStatus = GalleryHealthStatus.READY;
      statusExplanation = 'Gallery is completely prepared and ready to publish.';
    }

    return {
      gallery_id: gallery.id,
      gallery_title: gallery.title,
      score: totalWeightedScore,
      status: overallStatus,
      status_explanation: statusExplanation,
      categories,
      recommendations,
      calculated_at: new Date(),
    };
  }
}
