/**
 * Copilot Context Builder — PIXMatch AI Phase 15
 * Gathers structured factual context from verified database models and services to prevent AI hallucination.
 */

import { prisma, ProcessingStatus } from '@pixmatch/database';
import { CopilotContextFactsDTO, GalleryHealthStatus } from '@pixmatch/types';
import { GalleryHealthService } from './gallery-health.service.js';

export class CopilotContextBuilder {
  private db: any;
  private healthService: GalleryHealthService;

  constructor(dbClient?: any) {
    this.db = dbClient || prisma;
    this.healthService = new GalleryHealthService(this.db);
  }

  private static defaultInstance = new CopilotContextBuilder();

  static async buildGalleryFacts(studioId: string, galleryId: string): Promise<CopilotContextFactsDTO> {
    return this.defaultInstance.buildGalleryFacts(studioId, galleryId);
  }

  async buildGalleryFacts(studioId: string, galleryId: string): Promise<CopilotContextFactsDTO> {
    const gallery = await this.db.gallery.findFirst({
      where: { id: galleryId, studio_id: studioId },
      include: {
        photos: {
          select: {
            id: true,
            status: true,
            is_cover: true,
            is_favorite: true,
            is_selected: true,
            ai_analysis: true,
            face_detections: { select: { id: true } },
          },
        },
        jobs: {
          select: { id: true, status: true, error: true },
          take: 50,
        },
        smart_albums: {
          select: { id: true, is_active: true },
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

    // Processing metrics
    const failedPhotos = photos.filter((p: any) => p.status === ProcessingStatus.FAILED || p.status === 'FAILED');
    const pendingPhotos = photos.filter((p: any) => p.status === ProcessingStatus.PENDING || p.status === ProcessingStatus.PROCESSING || p.status === 'PENDING' || p.status === 'PROCESSING');
    const processedPhotos = photos.filter((p: any) => p.status === ProcessingStatus.COMPLETED || p.status === 'COMPLETED');
    const processingPct = totalPhotos > 0 ? Math.round((processedPhotos.length / totalPhotos) * 100) : 100;

    // AI indexing metrics
    const indexedPhotos = photos.filter((p: any) => !!p.ai_analysis);
    const unindexedCount = totalPhotos - indexedPhotos.length;
    const indexingPct = totalPhotos > 0 ? Math.round((indexedPhotos.length / totalPhotos) * 100) : 100;
    const totalFaces = photos.reduce((acc: number, p: any) => acc + (p.face_detections?.length || 0), 0);

    // Quality metrics
    const lowQualityPhotos = indexedPhotos.filter((p: any) => (p.ai_analysis.quality_score ?? 1) < 0.45);
    const blurryPhotos = indexedPhotos.filter((p: any) => p.ai_analysis.is_blurry);
    const darkPhotos = indexedPhotos.filter((p: any) => p.ai_analysis.is_dark);
    const avgScore = indexedPhotos.length > 0
      ? indexedPhotos.reduce((acc: number, p: any) => acc + (p.ai_analysis.quality_score ?? 0.7), 0) / indexedPhotos.length
      : 0.75;

    // Duplicate & Burst metrics
    const dupGroups = new Set<string>();
    const burstClusters = new Set<string>();
    let dupPhotosCount = 0;
    for (const p of indexedPhotos) {
      if (p.ai_analysis.duplicate_group_id) {
        dupGroups.add(p.ai_analysis.duplicate_group_id);
        dupPhotosCount++;
      }
      if (p.ai_analysis.near_duplicate_group_id) {
        burstClusters.add(p.ai_analysis.near_duplicate_group_id);
      }
    }

    // Event Intelligence metrics
    const eventIntel = gallery.event_intelligence;
    const chapters = eventIntel?.chapters || [];
    const highlights = eventIntel?.highlights || [];
    const story = eventIntel?.story;

    // Smart albums metrics
    const smartAlbums = gallery.smart_albums || [];
    const activeAlbums = smartAlbums.filter((a: any) => a.is_active);

    // Client engagement metrics
    const assignedClients = (gallery.clients || []).length;
    const favoritesCount = photos.filter((p: any) => p.is_favorite).length;
    const selectionsCount = photos.filter((p: any) => p.is_selected).length;

    // Operational health
    const health = await this.healthService.calculateHealth(studioId, galleryId);
    const blockers: string[] = [];
    const warnings: string[] = [];
    for (const cat of health.categories) {
      for (const issue of cat.issues) {
        if (issue.severity === 'CRITICAL' || issue.severity === 'HIGH') {
          blockers.push(issue.message);
        } else {
          warnings.push(issue.message);
        }
      }
    }

    return {
      gallery: {
        id: gallery.id,
        title: gallery.title,
        status: gallery.status,
        access_type: gallery.access_type,
        event_type: gallery.event_type || 'Event',
        event_date: gallery.event_date ? new Date(gallery.event_date).toISOString() : new Date().toISOString(),
        has_cover: !!gallery.cover_photo_url || photos.some((p: any) => p.is_cover),
        cover_photo_id: photos.find((p: any) => p.is_cover)?.id || null,
        photo_count: totalPhotos,
        downloads_enabled: gallery.downloads_enabled ?? true,
        is_unlisted: gallery.is_unlisted ?? false,
        expires_at: gallery.expires_at ? new Date(gallery.expires_at).toISOString() : null,
      },
      processing: {
        total_photos: totalPhotos,
        processed_count: processedPhotos.length,
        pending_count: pendingPhotos.length,
        failed_count: Math.max(failedPhotos.length, jobs.filter((j: any) => j.status === 'FAILED').length),
        processing_pct: processingPct,
      },
      ai_indexing: {
        is_enabled: gallery.enable_ai_face_search ?? true,
        indexed_count: indexedPhotos.length,
        unindexed_count: unindexedCount,
        faces_detected: totalFaces,
        indexing_pct: indexingPct,
      },
      quality: {
        analyzed_count: indexedPhotos.length,
        average_score: Math.round(avgScore * 100) / 100,
        low_quality_count: lowQualityPhotos.length,
        blur_count: blurryPhotos.length,
        dark_count: darkPhotos.length,
      },
      duplicates: {
        duplicate_groups: dupGroups.size,
        duplicate_photos_count: dupPhotosCount,
        burst_clusters_count: burstClusters.size,
      },
      event_intelligence: {
        has_intelligence: !!eventIntel,
        detected_event_type: eventIntel?.event_type,
        chapter_count: chapters.length,
        highlight_count: highlights.length,
        has_story: !!story,
        story_published: story?.status === 'PUBLISHED',
        story_headline: story?.title || null,
      },
      smart_albums: {
        total_albums: smartAlbums.length,
        active_albums_count: activeAlbums.length,
      },
      clients: {
        assigned_clients_count: assignedClients,
        favorites_count: favoritesCount,
        selections_count: selectionsCount,
        total_views: gallery.client_views_count || 0,
        total_downloads: 0,
      },
      readiness: {
        score: health.score,
        status: health.status,
        blockers,
        warnings,
      },
    };
  }
}
