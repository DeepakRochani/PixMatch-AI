/**
 * Gallery Completeness Service — PIXMatch AI Phase 15
 * Pre-flight verification checklist for gallery publishing and client sharing.
 */

import { prisma, ProcessingStatus } from '@pixmatch/database';
import {
  GalleryCompletenessDTO,
  CompletenessCheckItemDTO,
  CopilotRecommendationDTO,
  CopilotRecommendationType,
  CopilotRecommendationSeverity,
  CopilotRecommendationStatus,
} from '@pixmatch/types';

export class GalleryCompletenessService {
  private db: any;

  constructor(dbClient?: any) {
    this.db = dbClient || prisma;
  }

  private static defaultInstance = new GalleryCompletenessService();

  static async checkCompleteness(studioId: string, galleryId: string): Promise<GalleryCompletenessDTO> {
    return this.defaultInstance.checkCompleteness(studioId, galleryId);
  }

  async checkCompleteness(studioId: string, galleryId: string): Promise<GalleryCompletenessDTO> {
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
            ai_analysis: { select: { id: true } },
          },
        },
        smart_albums: { select: { id: true, is_active: true } },
        event_intelligence: { include: { story: true, chapters: true } },
        clients: { select: { client_id: true } },
      },
    });

    if (!gallery) {
      throw new Error(`Gallery ${galleryId} not found for studio ${studioId}`);
    }

    const photos = gallery.photos || [];
    const totalPhotos = photos.length;
    const checks: CompletenessCheckItemDTO[] = [];
    const recommendations: CopilotRecommendationDTO[] = [];

    // 1. Photos Exist
    const hasPhotos = totalPhotos > 0;
    checks.push({
      key: 'photos_exist',
      title: 'Photos Uploaded',
      is_complete: hasPhotos,
      is_blocker: true,
      description: hasPhotos ? `${totalPhotos} photos uploaded to gallery.` : 'No photos have been uploaded.',
      details: hasPhotos ? `${totalPhotos} assets present` : 'Upload required',
      suggested_action: hasPhotos ? undefined : 'Upload photos to continue',
    });

    // 2. Processing Complete
    const pendingPhotos = photos.filter((p: any) => p.status === ProcessingStatus.PENDING || p.status === ProcessingStatus.PROCESSING || p.status === 'PENDING' || p.status === 'PROCESSING');
    const failedPhotos = photos.filter((p: any) => p.status === ProcessingStatus.FAILED || p.status === 'FAILED');
    const isProcessingDone = hasPhotos && pendingPhotos.length === 0 && failedPhotos.length === 0;
    checks.push({
      key: 'processing_complete',
      title: 'Photo Processing Complete',
      is_complete: isProcessingDone,
      is_blocker: true,
      description: isProcessingDone
        ? 'All photos processed successfully.'
        : `${pendingPhotos.length} photos pending, ${failedPhotos.length} failed.`,
      details: `${photos.length - pendingPhotos.length - failedPhotos.length}/${photos.length} done`,
      suggested_action: failedPhotos.length > 0 ? 'Retry failed processing jobs' : undefined,
    });

    // 3. Thumbnails Generated
    const missingThumbnails = photos.filter((p: any) => !p.thumbnail_url && !p.preview_url);
    const hasThumbnails = hasPhotos && missingThumbnails.length === 0;
    checks.push({
      key: 'thumbnails_generated',
      title: 'Thumbnails & Web Previews Available',
      is_complete: hasThumbnails,
      is_blocker: true,
      description: hasThumbnails ? 'All thumbnails generated.' : `${missingThumbnails.length} photos missing web thumbnails.`,
      details: `${photos.length - missingThumbnails.length}/${photos.length} available`,
    });

    // 4. AI Indexing
    const unindexedCount = photos.filter((p: any) => !p.ai_analysis).length;
    const isAiIndexed = hasPhotos && unindexedCount === 0;
    checks.push({
      key: 'ai_indexing',
      title: 'AI Facial & Scene Indexing',
      is_complete: !gallery.enable_ai_face_search || isAiIndexed,
      is_blocker: false,
      description: isAiIndexed
        ? 'All photos indexed with AI.'
        : `${unindexedCount} photos pending AI indexing.`,
      details: `${photos.length - unindexedCount}/${photos.length} indexed`,
      suggested_action: unindexedCount > 0 ? 'Run AI indexing' : undefined,
    });

    // 5. Cover Selected
    const hasCover = !!gallery.cover_photo_url || photos.some((p: any) => p.is_cover);
    checks.push({
      key: 'cover_selected',
      title: 'Cover Photo Selected',
      is_complete: hasCover,
      is_blocker: true,
      description: hasCover ? 'Gallery has a selected cover photo.' : 'Gallery has no cover photo assigned.',
      suggested_action: hasCover ? undefined : 'Select or approve recommended cover photo',
    });

    // 6. Metadata Valid
    const hasValidTitle = !!gallery.title && gallery.title.trim().length > 0;
    checks.push({
      key: 'metadata_valid',
      title: 'Gallery Title & Event Metadata',
      is_complete: hasValidTitle,
      is_blocker: true,
      description: hasValidTitle ? `Gallery title: "${gallery.title}".` : 'Gallery is missing a title.',
    });

    // 7. Access & Expiry Valid
    const isExpired = gallery.expires_at ? new Date(gallery.expires_at).getTime() < Date.now() : false;
    checks.push({
      key: 'access_valid',
      title: 'Access Permissions & Expiry',
      is_complete: !isExpired,
      is_blocker: true,
      description: isExpired ? 'Gallery is expired and cannot be viewed by clients.' : `Access is ${gallery.access_type}.`,
      suggested_action: isExpired ? 'Extend expiration date' : undefined,
    });

    // 8. Downloads Configured
    checks.push({
      key: 'downloads_configured',
      title: 'Client Downloads Policy',
      is_complete: true,
      is_blocker: false,
      description: gallery.downloads_enabled ? 'Downloads enabled for clients.' : 'Downloads disabled (viewing only).',
    });

    // 9. Smart Albums Configured
    const smartAlbumsCount = (gallery.smart_albums || []).length;
    checks.push({
      key: 'smart_albums_configured',
      title: 'Smart Albums Configured',
      is_complete: smartAlbumsCount > 0 || totalPhotos < 20,
      is_blocker: false,
      description: smartAlbumsCount > 0 ? `${smartAlbumsCount} Smart Albums active.` : 'No Smart Albums configured.',
      suggested_action: smartAlbumsCount === 0 && totalPhotos >= 20 ? 'Generate Smart Albums' : undefined,
    });

    // 10. Event Story Generated
    const hasStory = !!gallery.event_intelligence?.story;
    checks.push({
      key: 'event_story_generated',
      title: 'Event Story & Chapters',
      is_complete: hasStory || totalPhotos < 15,
      is_blocker: false,
      description: hasStory ? 'Event Story and chronological chapters ready.' : 'Event Story has not been generated.',
      suggested_action: !hasStory && totalPhotos >= 15 ? 'Generate Event Story' : undefined,
    });

    const blockers = checks.filter((c) => !c.is_complete && c.is_blocker);
    const warnings = checks.filter((c) => !c.is_complete && !c.is_blocker);
    const completedItems = checks.filter((c) => c.is_complete);

    const completedCount = completedItems.length;
    const totalCount = checks.length;
    const completenessScore = Math.round((completedCount / totalCount) * 100);

    if (blockers.length > 0) {
      recommendations.push({
        id: `rec-comp-${galleryId}`,
        studio_id: studioId,
        gallery_id: galleryId,
        type: CopilotRecommendationType.GALLERY_COMPLETENESS,
        severity: CopilotRecommendationSeverity.HIGH,
        title: 'Gallery Pre-Flight Blockers',
        description: `${blockers.length} essential items must be completed before client sharing.`,
        reason: blockers.map((b) => b.title).join(', '),
        confidence: 0.99,
        status: CopilotRecommendationStatus.OPEN,
        created_at: new Date(),
        updated_at: new Date(),
      });
    }

    return {
      gallery_id: gallery.id,
      ready: blockers.length === 0,
      score: completenessScore,
      completed_checks: completedCount,
      total_checks: totalCount,
      blockers,
      warnings,
      completed_items: completedItems,
      recommendations,
    };
  }
}
