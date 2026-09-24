import { prisma, ProcessingStatus } from '@pixmatch/database';
import {
  PhotoRecommendationDTO,
  RecommendationReasonType,
  SimilarPhotoDTO,
  SimilarPhotosResponseDTO,
  GallerySearchResultDTO,
  GallerySearchResultItemDTO,
  PersonalizedClientHomeDTO,
  ClientPersonalizationSettingsDTO,
  ClientActivityEventDTO,
} from '@pixmatch/types';

// In-memory cache for recent views and temporary activity per session
interface SessionActivityState {
  recentPhotoIds: string[];
  viewedChapterIds: Set<string>;
  viewedSceneCategories: Set<string>;
  lastActive: number;
}

const sessionActivityCache = new Map<string, SessionActivityState>();

// Cache TTL cleanup every 15 minutes
setInterval(() => {
  const now = Date.now();
  const maxAge = 24 * 60 * 60 * 1000; // 24 hours
  for (const [key, state] of sessionActivityCache.entries()) {
    if (now - state.lastActive > maxAge) {
      sessionActivityCache.delete(key);
    }
  }
}, 15 * 60 * 1000).unref();

export class PhotoRecommendationService {
  private db: any;

  constructor(dbClient?: any) {
    this.db = dbClient || prisma;
  }

  /**
   * Static helper instance for static call ergonomics.
   */
  private static defaultInstance = new PhotoRecommendationService();

  /**
   * Returns default or gallery-specific personalization settings.
   */
  async getSettings(galleryId: string): Promise<ClientPersonalizationSettingsDTO> {
    return {
      enable_client_ai_home: true,
      enable_recommendations: true,
      enable_more_like_this: true,
      enable_semantic_search: true,
      enable_recently_viewed: true,
      enable_activity_recommendations: true,
      default_recommendation_limit: 10,
    };
  }

  static async getSettings(galleryId: string): Promise<ClientPersonalizationSettingsDTO> {
    return this.defaultInstance.getSettings(galleryId);
  }

  /**
   * Builds the Personalized Client Home payload for /gallery/[slug].
   */
  async getPersonalizedHome(
    galleryId: string,
    sessionId?: string
  ): Promise<PersonalizedClientHomeDTO> {
    const gallery = await this.db.gallery.findUnique({
      where: { id: galleryId },
      include: {
        studio: { select: { name: true } },
        event_intelligence: {
          include: {
            story: true,
            chapters: {
              where: { is_hidden: false },
              orderBy: { sequence_index: 'asc' },
            },
          },
        },
        smart_albums: {
          where: { is_visible_to_client: true },
          orderBy: { name: 'asc' },
        },
        _count: {
          select: { photos: { where: { processing_status: ProcessingStatus.COMPLETED } } },
        },
      },
    });

    if (!gallery) {
      throw new Error('Gallery not found');
    }

    // Check session activity (favorites, selections, recent views)
    let favoritesCount = 0;
    let selectionsCount = 0;
    let recentViews: PhotoRecommendationDTO[] = [];

    if (sessionId) {
      const [favs, sels] = await Promise.all([
        this.db.galleryFavorite.findMany({ where: { gallery_id: galleryId, session_id: sessionId } }),
        this.db.gallerySelection.findMany({ where: { gallery_id: galleryId, session_id: sessionId } }),
      ]);
      favoritesCount = Array.isArray(favs) ? favs.length : (favs as any);
      selectionsCount = Array.isArray(sels) ? sels.length : (sels as any);
      recentViews = await this.getRecentlyViewed(galleryId, sessionId, 8);
    }

    const isFirstTime = favoritesCount === 0 && selectionsCount === 0 && recentViews.length === 0;

    // Fetch AI highlights & Recommendations
    const [highlights, recommendations] = await Promise.all([
      this.getHighlights(galleryId, 12),
      this.getRecommendations(galleryId, sessionId, { limit: 12 }),
    ]);

    const story = gallery.event_intelligence?.story;
    const hasPublishedStory = Boolean(
      story && (story.is_published || story.status === 'PUBLISHED') && gallery.event_intelligence?.client_story_visible
    );

    // Fetch chapters
    let dbChapters: any[] = [];
    if (gallery.event_intelligence?.chapters) {
      dbChapters = gallery.event_intelligence.chapters;
    } else if (this.db.eventChapter?.findMany) {
      dbChapters = await this.db.eventChapter.findMany({ where: { gallery_id: galleryId } });
    }

    const chapters = (dbChapters || []).map((ch: any) => ({
      id: ch.id,
      title: ch.title,
      category: ch.category,
      photo_count: ch.photo_count || 0,
      cover_photo_url: null as string | null,
    }));

    // Fetch smart albums
    let dbSmartAlbums: any[] = [];
    if (gallery.smart_albums) {
      dbSmartAlbums = gallery.smart_albums;
    } else if (this.db.smartAlbum?.findMany) {
      dbSmartAlbums = await this.db.smartAlbum.findMany({ where: { gallery_id: galleryId } });
    }

    const smartAlbums = (dbSmartAlbums || []).map((sa: any) => ({
      id: sa.id,
      name: sa.name,
      type: sa.album_type || 'SCENE',
      photo_count: sa._count?.photos || sa.photo_count || 0,
      cover_photo_url: sa.cover_photo_url || null,
    }));

    const heroPhoto = highlights[0] || recommendations[0] || null;
    const totalPhotos = gallery._count?.photos ?? (gallery.photos?.length || (await this.db.photo.count({ where: { gallery_id: galleryId } })));

    const activitySummary = {
      favorites_count: favoritesCount,
      selections_count: selectionsCount,
      recently_viewed_count: recentViews.length,
    };

    return {
      is_first_time: isFirstTime,
      gallery_id: gallery.id,
      gallery_title: gallery.title,
      studio_name: gallery.studio?.name || 'PixMatch Studio',
      cover_photo_url: gallery.cover_photo_url || null,
      hero_photo: heroPhoto,
      event_type: gallery.event_type || undefined,
      event_date: gallery.event_date || undefined,
      has_published_story: hasPublishedStory,
      story_headline: hasPublishedStory ? (story?.title || 'Event Story') : null,
      story_summary: hasPublishedStory ? story?.summary : null,
      has_find_my_photos: gallery.enable_ai_face_search ?? true,
      total_photos: totalPhotos,
      stats: activitySummary,
      user_activity_summary: activitySummary,
      highlights,
      recommendations,
      recently_viewed: recentViews,
      chapters,
      smart_albums: smartAlbums,
    };
  }

  static async getPersonalizedHome(
    galleryId: string,
    sessionId?: string
  ): Promise<PersonalizedClientHomeDTO> {
    return this.defaultInstance.getPersonalizedHome(galleryId, sessionId);
  }

  /**
   * Retrieves diversity-ranked highlights from EventHighlight / PhotoAIAnalysis.
   */
  async getHighlights(galleryId: string, limit: number = 10): Promise<PhotoRecommendationDTO[]> {
    if (this.db.eventHighlight?.findMany) {
      try {
        const highlights = await this.db.eventHighlight.findMany({
          where: {
            gallery_id: galleryId,
            is_selected: true,
          },
          include: {
            photo: {
              include: { versions: true },
            },
            chapter: {
              select: { id: true, title: true },
            },
          },
          orderBy: { rank: 'asc' },
          take: limit,
        });

        if (highlights && highlights.length > 0) {
          return highlights.map((hl: any) => {
            const thumb = hl.photo?.versions?.find((v: any) => v.version_type === 'THUMBNAIL_MD') || hl.photo?.versions?.[0];
            return {
              id: hl.id || `hl_${hl.photo_id}`,
              photo_id: hl.photo_id,
              thumbnail_url: thumb?.storage_path || hl.photo?.thumbnail_url || hl.photo?.original_url,
              original_url: hl.photo?.original_url || hl.photo?.url,
              width: hl.photo?.width,
              height: hl.photo?.height,
              reason: hl.reason || 'Event highlight shot',
              reason_type: 'EVENT_HIGHLIGHT' as RecommendationReasonType,
              chapter_id: hl.chapter?.id || null,
              chapter_title: hl.chapter?.title || null,
              score: hl.score || 95,
            };
          });
        }
      } catch {
        // Fall back to quality photos
      }
    }

    // Fallback if EventHighlight is not generated yet: Use top quality photos
    const photos = await this.db.photo.findMany({
      where: {
        gallery_id: galleryId,
        processing_status: ProcessingStatus.COMPLETED,
      },
      include: {
        versions: true,
        ai_analysis: true,
      },
      orderBy: { created_at: 'desc' },
      take: limit * 2,
    });

    // Score and deduplicate
    const seenDuplicates = new Set<string>();
    const results: PhotoRecommendationDTO[] = [];

    for (const p of photos) {
      const dupId = p.duplicate_group_id || p.ai_analysis?.duplicate_group_id;
      if (dupId && seenDuplicates.has(dupId)) continue;
      if (dupId) seenDuplicates.add(dupId);

      const thumb = p.versions?.find((v: any) => v.version_type === 'THUMBNAIL_MD') || p.versions?.[0];
      results.push({
        id: p.id,
        photo_id: p.id,
        thumbnail_url: thumb?.storage_path || p.thumbnail_url || p.original_url || p.url,
        original_url: p.original_url || p.url,
        width: p.width,
        height: p.height,
        reason: 'Curated gallery highlight',
        reason_type: 'EVENT_HIGHLIGHT' as RecommendationReasonType,
        score: p.ai_analysis?.aesthetic_score ? Math.round(p.ai_analysis.aesthetic_score * 100) : (p.ai_analysis?.overall_quality_score || 80),
      });

      if (results.length >= limit) break;
    }

    return results;
  }

  static async getHighlights(galleryId: string, limit: number = 10): Promise<PhotoRecommendationDTO[]> {
    return this.defaultInstance.getHighlights(galleryId, limit);
  }

  /**
   * Generates safe, diversity-aware personalized recommendations for a client session.
   */
  async getRecommendations(
    galleryId: string,
    sessionId?: string,
    options: { limit?: number } = {}
  ): Promise<PhotoRecommendationDTO[]> {
    const limit = Math.min(Math.max(options.limit || 10, 1), 50);

    // 1. Gather Client Affinity Signals (Favorites, Selections, Views)
    let favoritedPhotoIds: string[] = [];
    let selectedPhotoIds: string[] = [];

    if (sessionId) {
      const [favs, sels] = await Promise.all([
        this.db.galleryFavorite.findMany({
          where: { gallery_id: galleryId, session_id: sessionId },
          select: { photo_id: true },
        }),
        this.db.gallerySelection.findMany({
          where: { gallery_id: galleryId, session_id: sessionId },
          select: { photo_id: true },
        }),
      ]);
      favoritedPhotoIds = Array.isArray(favs) ? favs.map((f: any) => f.photo_id) : [];
      selectedPhotoIds = Array.isArray(sels) ? sels.map((s: any) => s.photo_id) : [];
    }

    const sessionState = sessionId ? sessionActivityCache.get(`${galleryId}:${sessionId}`) : null;
    const viewedPhotoIds = sessionState?.recentPhotoIds || [];
    const viewedScenes = sessionState?.viewedSceneCategories || new Set<string>();

    const activePhotoIds = Array.from(new Set([...favoritedPhotoIds, ...selectedPhotoIds, ...viewedPhotoIds]));

    // Cold Start check
    if (activePhotoIds.length === 0) {
      return this.getColdStartRecommendations(galleryId, limit);
    }

    // 2. Fetch Active Photos to determine preferred scenes & chapters
    let activeAnalyses: any[] = [];
    if (this.db.photoAIAnalysis?.findMany) {
      activeAnalyses = await this.db.photoAIAnalysis.findMany({
        where: { photo_id: { in: activePhotoIds } },
        select: { scene_category: true, tags: true, dominant_colors: true },
      });
    } else {
      const activePhotos = await this.db.photo.findMany({
        where: { id: { in: activePhotoIds } },
        include: { ai_analysis: true },
      });
      activeAnalyses = activePhotos.map((p: any) => p.ai_analysis).filter(Boolean);
    }

    const preferredScenes = new Map<string, number>();
    for (const a of activeAnalyses) {
      if (a?.scene_category) {
        preferredScenes.set(a.scene_category, (preferredScenes.get(a.scene_category) || 0) + 2);
      }
      if (Array.isArray(a?.scene_categories)) {
        for (const sc of a.scene_categories) {
          preferredScenes.set(sc, (preferredScenes.get(sc) || 0) + 2);
        }
      }
    }
    for (const sc of viewedScenes) {
      preferredScenes.set(sc, (preferredScenes.get(sc) || 0) + 1);
    }

    // 3. Candidate Retrieval: Fetch available gallery photos
    const candidates = await this.db.photo.findMany({
      where: {
        gallery_id: galleryId,
        processing_status: ProcessingStatus.COMPLETED,
      },
      include: {
        versions: true,
        ai_analysis: true,
      },
      take: 100,
    });

    if (!candidates || candidates.length === 0) {
      return this.getColdStartRecommendations(galleryId, limit);
    }

    // 4. Multi-Factor Scoring & Burst Duplicate Suppression
    const scoredCandidates: { photo: any; score: number; reason: string; reasonType: RecommendationReasonType }[] = [];
    const seenDuplicates = new Set<string>();

    for (const p of candidates) {
      const analysis = p.ai_analysis;
      const dupId = p.duplicate_group_id || p.near_duplicate_group_id || analysis?.duplicate_group_id || analysis?.near_duplicate_group_id;

      if (dupId && seenDuplicates.has(dupId)) {
        continue; // Suppress burst duplicates
      }

      let score = 50; // base score
      let reason = 'Recommended for you';
      let reasonType: RecommendationReasonType = 'EVENT_HIGHLIGHT';

      if (favoritedPhotoIds.includes(p.id)) {
        score += 30;
        reason = 'One of your favorited moments';
        reasonType = 'FAVORITE_SIMILAR';
      } else if (selectedPhotoIds.includes(p.id)) {
        score += 25;
        reason = 'From your selected photos';
        reasonType = 'SELECTION_MATCH';
      }

      if (analysis) {
        // Quality component (up to +25)
        const quality = analysis.aesthetic_score ? analysis.aesthetic_score * 100 : (analysis.overall_quality_score || 70);
        score += (quality / 100) * 25;

        if (analysis.is_best_shot) {
          score += 15;
          reason = 'Selected as a top shot from this moment';
          reasonType = 'BEST_SHOT';
        }

        // Scene affinity component (up to +30)
        const scenes = analysis.scene_categories || (analysis.scene_category ? [analysis.scene_category] : []);
        for (const sc of scenes) {
          if (preferredScenes.has(sc)) {
            const affinity = preferredScenes.get(sc)!;
            score += Math.min(affinity * 6, 30);
            reason = `Because you enjoyed ${sc.toLowerCase()} moments`;
            reasonType = 'FAVORITE_SIMILAR';
            break;
          }
        }
      }

      if (dupId) {
        seenDuplicates.add(dupId);
      }

      scoredCandidates.push({
        photo: p,
        score,
        reason,
        reasonType,
      });
    }

    // Sort descending by score
    scoredCandidates.sort((a, b) => b.score - a.score);

    const topItems = scoredCandidates.slice(0, limit);

    return topItems.map((item) => {
      const p = item.photo;
      const thumb = p.versions?.find((v: any) => v.version_type === 'THUMBNAIL_MD') || p.versions?.[0];
      return {
        id: p.id,
        photo_id: p.id,
        thumbnail_url: thumb?.storage_path || p.thumbnail_url || p.original_url || p.url,
        original_url: p.original_url || p.url,
        width: p.width,
        height: p.height,
        reason: item.reason,
        reason_type: item.reasonType,
        score: Math.round(item.score),
      };
    });
  }

  static async getRecommendations(
    galleryId: string,
    sessionId?: string,
    options: { limit?: number } = {}
  ): Promise<PhotoRecommendationDTO[]> {
    return this.defaultInstance.getRecommendations(galleryId, sessionId, options);
  }

  /**
   * Deterministic cold-start recommendation fallback.
   */
  private async getColdStartRecommendations(galleryId: string, limit: number): Promise<PhotoRecommendationDTO[]> {
    const photos = await this.db.photo.findMany({
      where: {
        gallery_id: galleryId,
        processing_status: ProcessingStatus.COMPLETED,
      },
      include: {
        versions: true,
        ai_analysis: true,
      },
      orderBy: { created_at: 'desc' },
      take: limit * 3,
    });

    const results: PhotoRecommendationDTO[] = [];
    const seenDuplicates = new Set<string>();

    for (const p of photos) {
      const dupId = p.duplicate_group_id || p.near_duplicate_group_id || p.ai_analysis?.duplicate_group_id || p.ai_analysis?.near_duplicate_group_id;
      if (dupId && seenDuplicates.has(dupId)) continue;
      if (dupId) seenDuplicates.add(dupId);

      const thumb = p.versions?.find((v: any) => v.version_type === 'THUMBNAIL_MD') || p.versions?.[0];
      const isBest = p.ai_analysis?.is_best_shot;

      results.push({
        id: p.id,
        photo_id: p.id,
        thumbnail_url: thumb?.storage_path || p.thumbnail_url || p.original_url || p.url,
        original_url: p.original_url || p.url,
        width: p.width,
        height: p.height,
        reason: isBest ? 'One of the best shots of the gallery' : 'Featured highlight photo',
        reason_type: (isBest ? 'BEST_SHOT' : 'EVENT_HIGHLIGHT') as RecommendationReasonType,
        score: p.ai_analysis?.aesthetic_score ? Math.round(p.ai_analysis.aesthetic_score * 100) : (p.ai_analysis?.overall_quality_score || 75),
      });

      if (results.length >= limit) break;
    }

    return results;
  }

  /**
   * Contextual Similarity Engine ("More Like This").
   * Strictly non-biometric: Uses scene, color, luminance, and temporal proximity.
   */
  async getSimilarPhotos(
    galleryId: string,
    photoId: string,
    limit: number = 8
  ): Promise<SimilarPhotosResponseDTO> {
    const sourcePhoto = await this.db.photo.findFirst({
      where: { id: photoId },
      include: { ai_analysis: true },
    });

    if (!sourcePhoto || (sourcePhoto.gallery_id && sourcePhoto.gallery_id !== galleryId)) {
      return {
        source_photo_id: photoId,
        reference_photo_id: photoId,
        photos: [],
        similar_photos: [],
        total: 0,
      };
    }

    const sceneCategories: string[] = sourcePhoto.ai_analysis?.scene_categories || (sourcePhoto.ai_analysis?.scene_category ? [sourcePhoto.ai_analysis.scene_category] : []);
    const sourceTags: string[] = sourcePhoto.ai_analysis?.tags || [];
    const duplicateGroupId = sourcePhoto.duplicate_group_id || sourcePhoto.ai_analysis?.duplicate_group_id;
    const targetLuminance = sourcePhoto.ai_analysis?.brightness_score || sourcePhoto.ai_analysis?.mean_luminance || 0.5;

    // Fetch candidate photos in the same gallery
    const candidates = await this.db.photo.findMany({
      where: {
        gallery_id: galleryId,
        id: { not: photoId },
        processing_status: ProcessingStatus.COMPLETED,
      },
      include: {
        versions: true,
        ai_analysis: true,
      },
      take: 60,
    });

    const scored: { photo: any; similarity: number; reason: string; category?: string }[] = [];
    const seenDuplicates = new Set<string>();

    if (duplicateGroupId) {
      seenDuplicates.add(duplicateGroupId); // Do not recommend direct duplicate of the source photo
    }

    for (const c of candidates) {
      if (c.id === photoId) continue;

      const cAnalysis = c.ai_analysis;
      const cDupId = c.duplicate_group_id || c.near_duplicate_group_id || cAnalysis?.duplicate_group_id || cAnalysis?.near_duplicate_group_id;

      if (cDupId && seenDuplicates.has(cDupId)) {
        continue;
      }

      let similarity = 40;
      let reason = 'Visually similar photo';
      let category = cAnalysis?.scene_category || cAnalysis?.scene_categories?.[0] || undefined;

      const cScenes: string[] = cAnalysis?.scene_categories || (cAnalysis?.scene_category ? [cAnalysis.scene_category] : []);
      const sharedScenes = sceneCategories.filter((sc) => cScenes.includes(sc));

      if (sharedScenes.length > 0) {
        similarity += 35;
        const mainScene = sharedScenes[0];
        reason = `From the same ${mainScene.charAt(0).toUpperCase() + mainScene.slice(1)} Scene`;
      }

      // Tag overlap
      const cTags: string[] = cAnalysis?.tags || [];
      const sharedTags = sourceTags.filter((t) => cTags.includes(t));
      if (sharedTags.length > 0) {
        similarity += Math.min(sharedTags.length * 5, 20);
      }

      if (cAnalysis && (cAnalysis.brightness_score || cAnalysis.mean_luminance)) {
        const cLum = cAnalysis.brightness_score || cAnalysis.mean_luminance || 0.5;
        const lumDiff = Math.abs(cLum - targetLuminance);
        if (lumDiff < 0.2 || lumDiff < 30) {
          similarity += 15;
        }
      }

      // Proximity in capture time if timestamps exist
      const sourceTime = sourcePhoto.timestamp || sourcePhoto.created_at;
      const cTime = c.timestamp || c.created_at;
      if (sourceTime && cTime) {
        const timeDiffMinutes = Math.abs(
          (new Date(sourceTime).getTime() - new Date(cTime).getTime()) / (1000 * 60)
        );
        if (timeDiffMinutes < 20) {
          similarity += 15;
          if (sharedScenes.length === 0) {
            reason = 'Captured around the same moment';
          }
        }
      }

      if (cDupId) {
        seenDuplicates.add(cDupId);
      }

      scored.push({
        photo: c,
        similarity,
        reason,
        category,
      });
    }

    scored.sort((a, b) => b.similarity - a.similarity);

    const topItems = scored.slice(0, limit);

    const photos: SimilarPhotoDTO[] = topItems.map((item) => {
      const p = item.photo;
      const thumb = p.versions?.find((v: any) => v.version_type === 'THUMBNAIL_MD') || p.versions?.[0];
      return {
        id: p.id,
        photo_id: p.id,
        thumbnail_url: thumb?.storage_path || p.thumbnail_url || p.original_url || p.url,
        original_url: p.original_url || p.url,
        width: p.width,
        height: p.height,
        reason: item.reason,
        similarity_reason: item.reason,
        similarity_category: item.category,
      };
    });

    return {
      source_photo_id: photoId,
      reference_photo_id: photoId,
      photos,
      similar_photos: photos,
      total: photos.length,
    };
  }

  static async getSimilarPhotos(
    galleryId: string,
    photoId: string,
    limit: number = 8
  ): Promise<SimilarPhotosResponseDTO> {
    return this.defaultInstance.getSimilarPhotos(galleryId, photoId, limit);
  }

  /**
   * Safe Metadata-Based Gallery Search.
   * Maps "photos of me" / "find me" to Find My Photos prompt without running unauthorized face inference.
   */
  async searchGallery(
    galleryId: string,
    rawQuery: string,
    options: { limit?: number } = {}
  ): Promise<GallerySearchResultDTO> {
    // Sanitize input to eliminate dangerous characters
    const sanitized = (rawQuery || '').replace(/[;'"\\]/g, '').trim();
    const query = sanitized.toLowerCase();
    const limit = Math.min(Math.max(options.limit || 30, 1), 100);

    const suggestedChips = ['Ceremony', 'Portraits', 'Couples', 'Family', 'Reception', 'Dance', 'Best Shots'];

    if (!query) {
      return {
        query: rawQuery,
        sanitized_query: sanitized,
        results: [],
        total: 0,
        total_matches: 0,
        suggested_chips: suggestedChips,
      };
    }

    // Check for "photos with me" / "find me" patterns
    const meKeywords = [
      'me',
      'my photo',
      'my photos',
      'photos of me',
      'pictures of me',
      'pictures with me',
      'find me',
      'find my face',
      'photos with me',
      'show pictures with me',
      'selfie',
    ];
    const isSelfieSuggested = meKeywords.some((kw) => query === kw || query.includes(kw));

    if (isSelfieSuggested) {
      return {
        query: rawQuery,
        sanitized_query: sanitized,
        results: [],
        total: 0,
        total_matches: 0,
        is_selfie_suggested: true,
        redirect_to_find_my_photos: true,
        suggested_chips: suggestedChips,
      };
    }

    // Fetch photos with metadata in this gallery
    const photos = await this.db.photo.findMany({
      where: {
        gallery_id: galleryId,
        processing_status: ProcessingStatus.COMPLETED,
      },
      include: {
        versions: true,
        ai_analysis: true,
      },
      take: 200,
    });

    const matched: GallerySearchResultItemDTO[] = [];

    for (const p of photos) {
      const matchedTags: string[] = [];
      const analysis = p.ai_analysis;
      const scene = analysis?.scene_category?.toLowerCase() || '';
      const scenes = (analysis?.scene_categories || []).map((s: string) => s.toLowerCase());
      const tags = ((analysis?.tags as string[]) || []).map((t: string) => t.toLowerCase());
      const filename = (p.original_filename || '').toLowerCase();

      let isMatch = false;

      // Tag & scene check
      if ((scene && (scene.includes(query) || query.includes(scene))) || scenes.some((s: string) => s.includes(query) || query.includes(s))) {
        isMatch = true;
        if (analysis?.scene_category) matchedTags.push(analysis.scene_category);
      }

      for (const t of tags) {
        if (t.includes(query) || query.includes(t)) {
          isMatch = true;
          matchedTags.push(t);
        }
      }

      // Keyword queries (e.g. "best", "highlights")
      if ((query === 'best' || query === 'highlights' || query.includes('top')) && analysis?.is_best_shot) {
        isMatch = true;
        matchedTags.push('Best Shot');
      }

      // Filename check
      if (filename.includes(query)) {
        isMatch = true;
        matchedTags.push('Filename Match');
      }

      if (isMatch) {
        const thumb = p.versions?.find((v: any) => v.version_type === 'THUMBNAIL_MD') || p.versions?.[0];
        matched.push({
          id: p.id,
          photo_id: p.id,
          thumbnail_url: thumb?.storage_path || p.thumbnail_url || p.original_url || p.url,
          original_url: p.original_url || p.url,
          width: p.width,
          height: p.height,
          matched_tags: Array.from(new Set(matchedTags)),
          matched_scene: analysis?.scene_category || null,
          created_at: p.created_at,
        });

        if (matched.length >= limit) break;
      }
    }

    return {
      query: rawQuery,
      sanitized_query: sanitized,
      results: matched,
      total: matched.length,
      total_matches: matched.length,
      is_selfie_suggested: isSelfieSuggested,
      redirect_to_find_my_photos: false,
      suggested_chips: suggestedChips,
    };
  }

  static async searchGallery(
    galleryId: string,
    rawQuery: string,
    options: { limit?: number } = {}
  ): Promise<GallerySearchResultDTO> {
    return this.defaultInstance.searchGallery(galleryId, rawQuery, options);
  }

  /**
   * Records safe client session activity for personalized ranking.
   */
  recordActivity(
    galleryId: string,
    sessionId: string,
    event: ClientActivityEventDTO
  ): boolean {
    if (!sessionId) return false;

    const key = `${galleryId}:${sessionId}`;
    let state = sessionActivityCache.get(key);

    if (!state) {
      state = {
        recentPhotoIds: [],
        viewedChapterIds: new Set<string>(),
        viewedSceneCategories: new Set<string>(),
        lastActive: Date.now(),
      };
      sessionActivityCache.set(key, state);
    }

    state.lastActive = Date.now();

    if (event.event_type === 'PHOTO_VIEW' && event.photo_id) {
      state.recentPhotoIds = [event.photo_id, ...state.recentPhotoIds.filter((id) => id !== event.photo_id)].slice(0, 20);
    } else if (event.event_type === 'CHAPTER_VIEW' && event.chapter_id) {
      state.viewedChapterIds.add(event.chapter_id);
    }

    return true;
  }

  static recordActivity(
    galleryId: string,
    sessionId: string,
    event: ClientActivityEventDTO
  ): boolean {
    return this.defaultInstance.recordActivity(galleryId, sessionId, event);
  }

  /**
   * Retrieves safe recently viewed photos for a client session.
   */
  async getRecentlyViewed(
    galleryId: string,
    sessionId: string,
    limit: number = 10
  ): Promise<PhotoRecommendationDTO[]> {
    if (!sessionId) return [];

    const key = `${galleryId}:${sessionId}`;
    const state = sessionActivityCache.get(key);

    if (!state || state.recentPhotoIds.length === 0) {
      return [];
    }

    const photoIds = state.recentPhotoIds.slice(0, limit);

    const photos = await this.db.photo.findMany({
      where: {
        id: { in: photoIds },
        gallery_id: galleryId,
        processing_status: ProcessingStatus.COMPLETED,
      },
      include: {
        versions: true,
        ai_analysis: true,
      },
    });

    const photoMap = new Map((photos || []).map((p: any) => [p.id, p]));

    const ordered: PhotoRecommendationDTO[] = [];
    for (const pid of photoIds) {
      const p: any = photoMap.get(pid);
      if (!p) continue;
      const thumb = p.versions?.find((v: any) => v.version_type === 'THUMBNAIL_MD') || p.versions?.[0];
      ordered.push({
        id: p.id,
        photo_id: p.id,
        thumbnail_url: thumb?.storage_path || p.thumbnail_url || p.original_url || p.url || '',
        original_url: p.original_url || p.url || '',
        width: p.width || 1920,
        height: p.height || 1080,
        reason: 'Recently viewed by you',
        reason_type: 'MOMENT_PROXIMITY' as RecommendationReasonType,
      });
    }

    return ordered;
  }

  static async getRecentlyViewed(
    galleryId: string,
    sessionId: string,
    limit: number = 10
  ): Promise<PhotoRecommendationDTO[]> {
    return this.defaultInstance.getRecentlyViewed(galleryId, sessionId, limit);
  }

  /**
   * Enhances Find My Photos results by re-ranking candidates using non-biometric quality & diversity signals.
   */
  rankFindMyPhotosResults<T extends { photo_id?: string; id?: string; quality_score?: number; sharpness?: number; is_best_shot?: boolean; similarity_score?: number }>(
    candidates: T[]
  ): T[] {
    if (!candidates || candidates.length <= 1) return candidates;

    return [...candidates].sort((a, b) => {
      // Prioritize best shot
      if (a.is_best_shot && !b.is_best_shot) return -1;
      if (!a.is_best_shot && b.is_best_shot) return 1;

      // Higher quality score
      const qA = a.quality_score ?? 70;
      const qB = b.quality_score ?? 70;
      return qB - qA;
    });
  }

  static rankFindMyPhotosResults<T extends { photo_id?: string; id?: string; quality_score?: number; sharpness?: number; is_best_shot?: boolean; similarity_score?: number }>(
    candidates: T[]
  ): T[] {
    return this.defaultInstance.rankFindMyPhotosResults(candidates);
  }
}
