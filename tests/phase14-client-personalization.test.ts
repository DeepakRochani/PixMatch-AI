process.env.DATABASE_URL = process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/pixmatch_test';
process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-jwt-secret-key-must-be-32-chars-long';

import { PhotoRecommendationService } from '../apps/api/src/modules/galleries/photo-recommendation.service.js';

let passed = 0;
let failed = 0;

function assert(condition: boolean, testName: string, details?: string) {
  if (condition) {
    console.log(`  ✅ PASS: ${testName}`);
    passed++;
  } else {
    console.error(`  ❌ FAIL: ${testName} ${details ? `(${details})` : ''}`);
    failed++;
  }
}

// Mock database generator
function createMockPrisma() {
  const mockPhotos = [
    {
      id: 'photo-1',
      gallery_id: 'gallery-1',
      original_filename: 'ceremony_rings_exchange_001.jpg',
      url: 'https://cdn.pixmatch.test/p1.jpg',
      thumbnail_url: 'https://cdn.pixmatch.test/t1.jpg',
      is_archived: false,
      timestamp: new Date('2026-06-15T14:30:00Z'),
      duplicate_group_id: 'dup-group-1',
      near_duplicate_group_id: null,
      ai_analysis: {
        scene_categories: ['ceremony', 'wedding', 'rings'],
        tags: ['rings', 'hands', 'couple', 'ceremony'],
        dominant_colors: ['#3b2f2f', '#d4af37'],
        brightness_score: 0.85,
        aesthetic_score: 0.92,
        is_best_shot: true,
      },
    },
    {
      id: 'photo-2',
      gallery_id: 'gallery-1',
      original_filename: 'ceremony_rings_exchange_002.jpg',
      url: 'https://cdn.pixmatch.test/p2.jpg',
      thumbnail_url: 'https://cdn.pixmatch.test/t2.jpg',
      is_archived: false,
      timestamp: new Date('2026-06-15T14:30:05Z'),
      duplicate_group_id: 'dup-group-1', // Same burst duplicate group
      near_duplicate_group_id: null,
      ai_analysis: {
        scene_categories: ['ceremony', 'wedding', 'rings'],
        tags: ['rings', 'hands', 'couple'],
        dominant_colors: ['#3b2f2f', '#d4af37'],
        brightness_score: 0.84,
        aesthetic_score: 0.88,
        is_best_shot: false,
      },
    },
    {
      id: 'photo-3',
      gallery_id: 'gallery-1',
      original_filename: 'reception_first_dance_045.jpg',
      url: 'https://cdn.pixmatch.test/p3.jpg',
      thumbnail_url: 'https://cdn.pixmatch.test/t3.jpg',
      is_archived: false,
      timestamp: new Date('2026-06-15T19:15:00Z'),
      duplicate_group_id: null,
      near_duplicate_group_id: null,
      ai_analysis: {
        scene_categories: ['reception', 'dance', 'party'],
        tags: ['dance', 'lights', 'party', 'couple'],
        dominant_colors: ['#1e1b4b', '#f59e0b'],
        brightness_score: 0.65,
        aesthetic_score: 0.95,
        is_best_shot: true,
      },
    },
    {
      id: 'photo-4',
      gallery_id: 'gallery-1',
      original_filename: 'sunset_portrait_golden_hour.jpg',
      url: 'https://cdn.pixmatch.test/p4.jpg',
      thumbnail_url: 'https://cdn.pixmatch.test/t4.jpg',
      is_archived: false,
      timestamp: new Date('2026-06-15T18:45:00Z'),
      duplicate_group_id: null,
      near_duplicate_group_id: null,
      ai_analysis: {
        scene_categories: ['portrait', 'sunset', 'outdoor'],
        tags: ['sunset', 'golden hour', 'romantic', 'landscape'],
        dominant_colors: ['#f97316', '#7c2d12'],
        brightness_score: 0.78,
        aesthetic_score: 0.96,
        is_best_shot: true,
      },
    },
    {
      id: 'photo-5',
      gallery_id: 'gallery-1',
      original_filename: 'sunset_portrait_silhouette.jpg',
      url: 'https://cdn.pixmatch.test/p5.jpg',
      thumbnail_url: 'https://cdn.pixmatch.test/t5.jpg',
      is_archived: false,
      timestamp: new Date('2026-06-15T18:50:00Z'),
      duplicate_group_id: null,
      near_duplicate_group_id: null,
      ai_analysis: {
        scene_categories: ['portrait', 'sunset', 'outdoor'],
        tags: ['sunset', 'silhouette', 'romantic', 'golden hour'],
        dominant_colors: ['#ea580c', '#431407'],
        brightness_score: 0.72,
        aesthetic_score: 0.91,
        is_best_shot: false,
      },
    },
  ];

  const mockFavorites = [
    { photo_id: 'photo-4', session_id: 'session-user-123' },
  ];

  const mockSelections = [
    { photo_id: 'photo-3', session_id: 'session-user-123' },
  ];

  const mockChapters = [
    {
      id: 'chap-1',
      title: 'Ceremony & Vows',
      category: 'CEREMONY',
      cover_photo_id: 'photo-1',
      photo_count: 2,
      start_time: new Date('2026-06-15T14:00:00Z'),
      end_time: new Date('2026-06-15T15:30:00Z'),
      summary: 'Touching vow exchange and rings presentation.',
    },
    {
      id: 'chap-2',
      title: 'Sunset Romance',
      category: 'PORTRAITS',
      cover_photo_id: 'photo-4',
      photo_count: 2,
      start_time: new Date('2026-06-15T18:30:00Z'),
      end_time: new Date('2026-06-15T19:00:00Z'),
      summary: 'Golden hour portraits overlooking the hills.',
    },
  ];

  const mockSmartAlbums = [
    {
      id: 'sa-1',
      name: 'Ceremony Moments',
      slug: 'ceremony-moments',
      album_type: 'SCENE',
      cover_photo_url: 'https://cdn.pixmatch.test/t1.jpg',
      _count: { photos: 2 },
    },
  ];

  return {
    gallery: {
      findUnique: async ({ where }: any) => {
        if (where.id === 'gallery-1') {
          return {
            id: 'gallery-1',
            title: 'Sarah & Michael Wedding',
            cover_photo_id: 'photo-4',
            created_at: new Date('2026-06-15T10:00:00Z'),
            _count: { photos: 5 },
          };
        }
        return null;
      },
    },
    photo: {
      findMany: async (args: any) => {
        let results = [...mockPhotos];
        if (args?.where?.gallery_id) {
          results = results.filter((p) => p.gallery_id === args.where.gallery_id);
        }
        if (args?.where?.id) {
          if (typeof args.where.id === 'string') {
            results = results.filter((p) => p.id === args.where.id);
          } else if (args.where.id.in) {
            results = results.filter((p) => args.where.id.in.includes(p.id));
          } else if (args.where.id.not) {
            results = results.filter((p) => p.id !== args.where.id.not);
          }
        }
        if (args?.take) {
          results = results.slice(0, args.take);
        }
        return results;
      },
      findFirst: async ({ where }: any) => {
        return mockPhotos.find((p) => p.id === where.id) || null;
      },
      count: async () => mockPhotos.length,
    },
    galleryFavorite: {
      findMany: async ({ where }: any) => {
        return mockFavorites.filter((f) => f.session_id === where.session_id);
      },
    },
    gallerySelection: {
      findMany: async ({ where }: any) => {
        return mockSelections.filter((s) => s.session_id === where.session_id);
      },
    },
    eventChapter: {
      findMany: async () => mockChapters,
    },
    eventHighlight: {
      findMany: async () => [
        { photo_id: 'photo-4', is_pinned: true, rank: 1 },
        { photo_id: 'photo-3', is_pinned: false, rank: 2 },
      ],
    },
    smartAlbum: {
      findMany: async () => mockSmartAlbums,
    },
  };
}

async function runPhase14PersonalizationTests() {
  console.log('\n========================================================================');
  console.log('🌟  PIXMATCH AI — PHASE 14 AI PERSONALIZED CLIENT EXPERIENCE & DISCOVERY');
  console.log('   Multi-Factor Scoring, More Like This, Safe Search & Privacy Isolation');
  console.log('========================================================================\n');

  const mockPrisma = createMockPrisma();
  const service = new PhotoRecommendationService(mockPrisma as any);

  // ------------------------------------------------------------------------
  // TEST GROUP 1: Personalized Client Home
  // ------------------------------------------------------------------------
  console.log('--- TEST GROUP 1: Personalized Client Home Hub ---');

  const homeColdStart = await service.getPersonalizedHome('gallery-1');
  assert(homeColdStart !== null, 'Cold start personalized home returns valid object');
  assert(homeColdStart.total_photos === 5, 'Includes accurate gallery photo total');
  assert(homeColdStart.highlights.length > 0, 'Generates initial AI highlights for cold-start');
  assert(homeColdStart.recommendations.length > 0, 'Provides baseline aesthetic recommendations');
  assert(homeColdStart.chapters.length === 2, 'Includes structured event chapters');
  assert(homeColdStart.smart_albums.length === 1, 'Includes public smart albums');
  assert(homeColdStart.hero_photo !== null, 'Resolves a captivating hero photo');

  // User with active session
  const homeWithSession = await service.getPersonalizedHome('gallery-1', 'session-user-123');
  assert(homeWithSession.user_activity_summary.favorites_count === 1, 'Reflects accurate session favorite count');
  assert(homeWithSession.user_activity_summary.selections_count === 1, 'Reflects accurate session selection count');

  // ------------------------------------------------------------------------
  // TEST GROUP 2: Recommendation Multi-Factor Scoring & Burst Suppression
  // ------------------------------------------------------------------------
  console.log('\n--- TEST GROUP 2: Recommendation Engine & Burst Suppression ---');

  const recommendations = await service.getRecommendations('gallery-1', 'session-user-123', { limit: 10 });
  assert(recommendations.length > 0, 'Generates recommendations for session');
  
  // Verify burst duplicate suppression
  const duplicateGroupIds = recommendations
    .map((r) => r.photo_id)
    .filter((id) => id === 'photo-1' || id === 'photo-2');
  assert(duplicateGroupIds.length <= 1, 'Suppresses burst duplicates (only best shot returned in recommendations)');

  // Verify favorite / selection boost
  const topRec = recommendations[0];
  assert(topRec !== undefined && topRec.score > 0, 'Recommendation items contain positive relevancy score');
  assert(typeof topRec.reason === 'string' && topRec.reason.length > 0, 'Recommendation provides human-readable discovery reason');

  // ------------------------------------------------------------------------
  // TEST GROUP 3: "More Like This" Similarity Engine
  // ------------------------------------------------------------------------
  console.log('\n--- TEST GROUP 3: "More Like This" Photo Similarity ---');

  const similarToSunset = await service.getSimilarPhotos('gallery-1', 'photo-4', 5);
  assert(similarToSunset.similar_photos.length > 0, 'Finds similar photos for sunset photo');
  assert(similarToSunset.reference_photo_id === 'photo-4', 'Response reflects correct reference photo ID');
  assert(
    !similarToSunset.similar_photos.some((p) => p.id === 'photo-4'),
    'Excludes reference photo itself from similarity results'
  );

  const matchedSimilar = similarToSunset.similar_photos[0];
  assert(matchedSimilar.id === 'photo-5', 'Identifies photo-5 as most similar due to scene tags & color match');
  assert(matchedSimilar.similarity_reason.includes('Sunset') || matchedSimilar.similarity_reason.includes('Scene'), 'Provides intuitive scene-based similarity reason');

  // ------------------------------------------------------------------------
  // TEST GROUP 4: Safe Metadata Search & Natural Language Routing
  // ------------------------------------------------------------------------
  console.log('\n--- TEST GROUP 4: Safe Metadata Search & Find-My-Photos Routing ---');

  // Text search on scene/tag
  const searchSunset = await service.searchGallery('gallery-1', 'sunset');
  assert(searchSunset.total_matches >= 2, 'Finds photos matching "sunset" tag');
  assert(!searchSunset.redirect_to_find_my_photos, 'Regular text search does not trigger Find My Photos redirect');

  // Text search on filename
  const searchFilename = await service.searchGallery('gallery-1', 'ceremony_rings');
  assert(searchFilename.total_matches >= 1, 'Finds photos matching filename pattern');

  // Natural language redirection for "photos with me"
  const searchFindMe1 = await service.searchGallery('gallery-1', 'photos of me');
  assert(searchFindMe1.redirect_to_find_my_photos === true, 'Redirects "photos of me" query to Find My Photos modal');

  const searchFindMe2 = await service.searchGallery('gallery-1', 'find my face');
  assert(searchFindMe2.redirect_to_find_my_photos === true, 'Redirects "find my face" query to Find My Photos modal');

  const searchFindMe3 = await service.searchGallery('gallery-1', 'show pictures with me');
  assert(searchFindMe3.redirect_to_find_my_photos === true, 'Redirects "show pictures with me" query to Find My Photos modal');

  // Sanitization / SQL injection safety
  const safeSearch = await service.searchGallery('gallery-1', "'; DROP TABLE photos; --");
  assert(safeSearch.sanitized_query.length > 0, 'Sanitizes SQL injection characters safely without error');

  // ------------------------------------------------------------------------
  // TEST GROUP 5: Activity Tracking & Recently Viewed
  // ------------------------------------------------------------------------
  console.log('\n--- TEST GROUP 5: Session Activity & Recently Viewed ---');

  service.recordActivity('gallery-1', 'session-temp-99', {
    event_type: 'PHOTO_VIEW',
    photo_id: 'photo-3',
  });

  service.recordActivity('gallery-1', 'session-temp-99', {
    event_type: 'PHOTO_VIEW',
    photo_id: 'photo-4',
  });

  const recordedChapter = service.recordActivity('gallery-1', 'session-temp-99', {
    event_type: 'CHAPTER_VIEW',
    chapter_id: 'chap-1',
  });
  assert(recordedChapter === true, 'Successfully records chapter view interaction event');

  const recentlyViewed = await service.getRecentlyViewed('gallery-1', 'session-temp-99', 5);
  assert(recentlyViewed.length === 2, 'Tracks and retrieves session recently viewed photos in order');
  assert(recentlyViewed[0].id === 'photo-4', 'Latest viewed photo appears first in recently viewed list');

  // ------------------------------------------------------------------------
  // TEST GROUP 6: Enhanced Find My Photos Ranking
  // ------------------------------------------------------------------------
  console.log('\n--- TEST GROUP 6: Enhanced Find My Photos Ranking Signal ---');

  const rawCandidates = [
    {
      photo_id: 'p-cand-1',
      similarity_score: 0.85,
      is_best_shot: false,
      quality_score: 0.70,
    },
    {
      photo_id: 'p-cand-2',
      similarity_score: 0.84, // Slightly lower face similarity, but top best-shot
      is_best_shot: true,
      quality_score: 0.98,
    },
  ];

  const rankedCandidates = service.rankFindMyPhotosResults(rawCandidates);
  assert(rankedCandidates.length === 2, 'Ranks candidate set correctly');
  assert(rankedCandidates[0].photo_id === 'p-cand-2', 'Elevates best-shot / high-quality photos in face search results');

  // ------------------------------------------------------------------------
  // TEST GROUP 7: Zero Biometric Leakage & Privacy Isolation
  // ------------------------------------------------------------------------
  console.log('\n--- TEST GROUP 7: Zero Biometric Leakage & Privacy Validation ---');

  const serializedHome = JSON.stringify(homeWithSession);
  assert(!serializedHome.includes('embedding'), 'Zero embedding leakage in public personalized home payload');
  assert(!serializedHome.includes('crop_path'), 'Zero face crop path leakage in public personalized home payload');
  assert(!serializedHome.includes('bounding_box'), 'Zero face bounding box coordinates leaked in public payload');

  const serializedSimilar = JSON.stringify(similarToSunset);
  assert(!serializedSimilar.includes('embedding'), 'Zero embedding leakage in similar photos payload');
  assert(!serializedSimilar.includes('crop_path'), 'Zero face crop path leakage in similar photos payload');

  const serializedSearch = JSON.stringify(searchSunset);
  assert(!serializedSearch.includes('embedding'), 'Zero embedding leakage in search payload');

  // ------------------------------------------------------------------------
  // TEST GROUP 8: Personalization Settings & Boundary Conditions
  // ------------------------------------------------------------------------
  console.log('\n--- TEST GROUP 8: Personalization Settings & Boundary Guards ---');

  const settings = await service.getSettings('gallery-1');
  assert(settings.enable_client_ai_home === true, 'Client AI home enabled by default');
  assert(settings.enable_recommendations === true, 'Recommendations enabled by default');
  assert(settings.enable_more_like_this === true, 'More Like This enabled by default');
  assert(settings.enable_semantic_search === true, 'Semantic search enabled by default');
  assert(settings.enable_recently_viewed === true, 'Recently viewed tracking enabled');
  assert(settings.default_recommendation_limit === 10, 'Default recommendation limit set to 10');

  // Boundary checks: negative or extreme limits
  const recsClamped = await service.getRecommendations('gallery-1', 'session-user-123', { limit: 1000 });
  assert(recsClamped.length <= 50, 'Recommendation limit clamped to max 50 items');

  const emptySearch = await service.searchGallery('gallery-1', '   ');
  assert(emptySearch.total === 0, 'Empty search string returns 0 results cleanly');
  assert(emptySearch.suggested_chips.length > 0, 'Empty search provides helpful discovery chips');

  // ------------------------------------------------------------------------
  // TEST GROUP 9: Anonymous Session Isolation & Gallery Scope
  // ------------------------------------------------------------------------
  console.log('\n--- TEST GROUP 9: Anonymous Session Isolation & Multi-Tenant Scope ---');

  // Session A activities
  service.recordActivity('gallery-1', 'session-A', { event_type: 'PHOTO_VIEW', photo_id: 'photo-1' });
  service.recordActivity('gallery-1', 'session-B', { event_type: 'PHOTO_VIEW', photo_id: 'photo-4' });

  const recentsA = await service.getRecentlyViewed('gallery-1', 'session-A');
  const recentsB = await service.getRecentlyViewed('gallery-1', 'session-B');

  assert(recentsA.length === 1 && recentsA[0].id === 'photo-1', 'Session A only sees their own recently viewed photos');
  assert(recentsB.length === 1 && recentsB[0].id === 'photo-4', 'Session B only sees their own recently viewed photos');

  // Cross-gallery isolation: Photo from another gallery should not return similarity in gallery-1
  const similarInvalidGallery = await service.getSimilarPhotos('gallery-other-999', 'photo-1');
  assert(similarInvalidGallery.photos.length === 0, 'Cross-gallery similar photo request returns empty array');

  // ------------------------------------------------------------------------
  // TEST GROUP 10: Chapter Discovery & Coverage
  // ------------------------------------------------------------------------
  console.log('\n--- TEST GROUP 10: Event Chapter Integration & Highlight Coverage ---');

  assert(homeColdStart.chapters[0].title === 'Ceremony & Vows', 'First chapter title formatted accurately');
  assert(homeColdStart.chapters[0].category === 'CEREMONY', 'First chapter category matches detection');
  assert(homeColdStart.chapters[1].title === 'Sunset Romance', 'Second chapter title formatted accurately');
  assert(homeColdStart.chapters[1].category === 'PORTRAITS', 'Second chapter category matches detection');

  // Highlight list covers event chapters
  const allHighlights = await service.getHighlights('gallery-1', 5);
  assert(allHighlights.length > 0, 'Highlight list populated');
  assert(allHighlights.every((h) => typeof h.score === 'number'), 'All highlights have numeric ranking scores');

  // ------------------------------------------------------------------------
  // TEST GROUP 11: Static & Instance Parity
  // ------------------------------------------------------------------------
  console.log('\n--- TEST GROUP 11: Static Method & Instance Method API Parity ---');

  const staticSettings = await PhotoRecommendationService.getSettings('gallery-1');
  assert(staticSettings !== null, 'Static getSettings operates identically to instance method');

  const staticRanked = PhotoRecommendationService.rankFindMyPhotosResults(rawCandidates);
  assert(staticRanked[0].photo_id === 'p-cand-2', 'Static rankFindMyPhotosResults operates identically to instance method');

  // ------------------------------------------------------------------------
  // SUMMARY
  // ------------------------------------------------------------------------
  console.log('\n========================================================================');
  console.log(`📊  PHASE 14 TEST RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log('========================================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runPhase14PersonalizationTests().catch((err) => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
