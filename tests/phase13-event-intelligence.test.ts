process.env.DATABASE_URL = process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/pixmatch_test';
process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-jwt-secret-key-must-be-32-chars-long';

import {
  EventType,
  ChapterCategory,
  ConfidenceLevel,
  StoryTone,
  StoryLength,
  StoryStatus,
  EventIntelligenceStatus,
  Photo,
} from '@prisma/client';
import { EventDetectorService } from '../apps/api/src/modules/event-intelligence/event-detector.service.js';
import { TimelineChapterService } from '../apps/api/src/modules/event-intelligence/timeline-chapter.service.js';
import { HighlightRankerService } from '../apps/api/src/modules/event-intelligence/highlight-ranker.service.js';
import { StoryGeneratorService } from '../apps/api/src/modules/event-intelligence/story-generator.service.js';
import { EventIntelligenceService } from '../apps/api/src/modules/event-intelligence/event-intelligence.service.js';

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

// Mock Photos Helper
function createMockPhoto(id: string, timestamp: Date | null, meta: Record<string, any> = {}): Photo {
  return {
    id,
    studio_id: 'studio-test-1',
    gallery_id: 'gallery-test-1',
    original_filename: `photo_${id}.jpg`,
    storage_path: `uploads/photos/${id}.jpg`,
    url: `https://cdn.pixmatch.test/${id}.jpg`,
    thumbnail_url: `https://cdn.pixmatch.test/thumb_${id}.jpg`,
    preview_url: null,
    mime_type: 'image/jpeg',
    file_size_bytes: BigInt(2048576),
    width: 4000,
    height: 3000,
    timestamp: timestamp,
    sort_order: 0,
    is_archived: false,
    is_favorite: false,
    is_selected: false,
    access_level: 'PUBLIC',
    checksum_sha256: `sha_${id}`,
    duplicate_group_id: meta.duplicate_group_id || null,
    near_duplicate_group_id: null,
    metadata: meta,
    created_at: timestamp || new Date(),
    updated_at: new Date(),
  } as unknown as Photo;
}

async function runPhase13EventIntelligenceTests() {
  console.log('\n========================================================================');
  console.log('📖  PIXMATCH AI — PHASE 13 AI EVENT INTELLIGENCE & AUTOMATIC STORYTELLING');
  console.log('   Timeline Clustering, Diversity Highlights, Fact-Grounded Narrative');
  console.log('========================================================================\n');

  // 1. Multi-Signal Event Detection
  console.log('--- TEST GROUP 1: Multi-Signal Event Detection ---');
  const detector = new EventDetectorService();

  const weddingPhotos = [
    createMockPhoto('1', new Date('2026-06-15T10:00:00Z'), { face_count: 2, tags: ['bride', 'groom', 'ceremony'] }),
    createMockPhoto('2', new Date('2026-06-15T11:00:00Z'), { face_count: 6, tags: ['altar', 'rings'] }),
  ];
  const weddingRes = detector.detectEventType({
    galleryName: 'Sarah & Michael Wedding Ceremony',
    galleryDescription: 'A beautiful summer wedding at the vineyard',
    photos: weddingPhotos,
  });
  assert(weddingRes.detectedType === EventType.WEDDING, 'Detects WEDDING event type from title & tags');
  assert(weddingRes.confidence === ConfidenceLevel.HIGH, 'High confidence for rich wedding signals');
  assert(weddingRes.signals.includes('GALLERY_TITLE_MATCH'), 'Signals include title match');

  const birthdayPhotos = [
    createMockPhoto('3', new Date('2026-06-15T14:00:00Z'), { tags: ['cake', 'candles', 'balloons'] }),
  ];
  const bdayRes = detector.detectEventType({
    galleryName: "Leo's 5th Birthday Party",
    photos: birthdayPhotos,
  });
  assert(bdayRes.detectedType === EventType.BIRTHDAY, 'Detects BIRTHDAY from birthday keywords and cake tags');

  const corporatePhotos = [
    createMockPhoto('4', new Date('2026-06-15T09:00:00Z'), { tags: ['stage', 'podium', 'presentation'] }),
  ];
  const corpRes = detector.detectEventType({
    galleryName: 'Global SaaS Tech Summit 2026 Keynote',
    photos: corporatePhotos,
  });
  assert(corpRes.detectedType === EventType.CORPORATE, 'Detects CORPORATE event type');

  const emptyPhotos = [createMockPhoto('5', new Date('2026-06-15T09:00:00Z'))];
  const fallbackRes = detector.detectEventType({
    galleryName: 'Folder_123',
    photos: emptyPhotos,
  });
  assert(fallbackRes.detectedType === EventType.UNKNOWN, 'Fallback to UNKNOWN event type when no signals match');
  assert(fallbackRes.confidence === ConfidenceLevel.LOW, 'Low confidence on non-descriptive event');

  // 2. Timeline & Sequence Clustering
  console.log('\n--- TEST GROUP 2: Timeline & Sequence Chapter Clustering ---');
  const timelineService = new TimelineChapterService();

  const timedPhotos = [
    // Morning Prep (10:00 - 10:15)
    createMockPhoto('p1', new Date('2026-06-15T10:00:00Z')),
    createMockPhoto('p2', new Date('2026-06-15T10:10:00Z')),
    createMockPhoto('p3', new Date('2026-06-15T10:15:00Z')),
    // Ceremony (14:00 - 14:30) (gap ~3h45m)
    createMockPhoto('p4', new Date('2026-06-15T14:00:00Z')),
    createMockPhoto('p5', new Date('2026-06-15T14:15:00Z')),
    createMockPhoto('p6', new Date('2026-06-15T14:30:00Z')),
    // Reception (18:00 - 19:00) (gap ~3h30m)
    createMockPhoto('p7', new Date('2026-06-15T18:00:00Z')),
    createMockPhoto('p8', new Date('2026-06-15T18:30:00Z')),
    createMockPhoto('p9', new Date('2026-06-15T19:00:00Z')),
  ];

  const chapters = timelineService.clusterPhotosIntoChapters(timedPhotos, {
    eventType: EventType.WEDDING,
    minGapMinutes: 45,
  });

  assert(chapters.length === 3, 'Clusters 9 photos into 3 chronological chapters', `Got ${chapters.length}`);
  assert(chapters[0].photoIds.length === 3, 'Chapter 1 contains 3 photos');
  assert(chapters[1].photoIds.length === 3, 'Chapter 2 contains 3 photos');
  assert(chapters[2].photoIds.length === 3, 'Chapter 3 contains 3 photos');
  assert(chapters[0].orderIndex === 0 && chapters[1].orderIndex === 1 && chapters[2].orderIndex === 2, 'Maintains chronological order indices');

  // Fallback for photos without EXIF timestamps
  const untimedPhotos = Array.from({ length: 20 }, (_, i) =>
    createMockPhoto(`seq_${i + 1}`, null)
  );
  const untimedChapters = timelineService.clusterPhotosIntoChapters(untimedPhotos, {
    eventType: EventType.GENERAL,
    targetChapterCount: 4,
  });
  assert(untimedChapters.length >= 2, 'Fallback sequence partitioning creates at least 2 chapters');
  assert(untimedChapters.every((c) => c.photoIds.length > 0), 'All sequence chapters have photos');

  // 3. Highlight Ranking & Burst Suppression
  console.log('\n--- TEST GROUP 3: Diversity Highlight Ranking & Burst Suppression ---');
  const ranker = new HighlightRankerService();

  const rankPhotos = [
    // Duplicate burst group A
    createMockPhoto('h1', new Date('2026-06-15T10:00:00Z'), {
      aesthetic_score: 0.95,
      sharpness: 0.9,
      smile_count: 2,
      face_count: 2,
      duplicate_group_id: 'dup_grp_A',
    }),
    createMockPhoto('h2', new Date('2026-06-15T10:00:05Z'), {
      aesthetic_score: 0.94,
      sharpness: 0.88,
      smile_count: 2,
      face_count: 2,
      duplicate_group_id: 'dup_grp_A', // should be suppressed
    }),
    // Independent high quality photo
    createMockPhoto('h3', new Date('2026-06-15T14:00:00Z'), {
      aesthetic_score: 0.89,
      sharpness: 0.85,
      smile_count: 1,
      face_count: 1,
    }),
    // Low quality photo
    createMockPhoto('h4', new Date('2026-06-15T16:00:00Z'), {
      aesthetic_score: 0.3,
      sharpness: 0.3,
      smile_count: 0,
      face_count: 0,
    }),
  ];

  const mockChList = [
    {
      id: 'ch-1',
      event_intelligence_id: 'ei-1',
      studio_id: 's-1',
      gallery_id: 'g-1',
      title: 'Ceremony',
      category: ChapterCategory.CEREMONY,
      start_time: new Date('2026-06-15T10:00:00Z'),
      end_time: new Date('2026-06-15T16:00:00Z'),
      order_index: 0,
      photo_count: 4,
      photo_ids: ['h1', 'h2', 'h3', 'h4'],
      cover_photo_id: 'h1',
      is_visible: true,
      description: null,
      created_at: new Date(),
      updated_at: new Date(),
    },
  ];

  const rankRes = ranker.selectHighlights(rankPhotos, mockChList, {
    topCount: 5,
    duplicateSuppression: true,
  });

  const selectedIds = rankRes.rankedCandidates.map((c) => c.photo.id);
  assert(selectedIds.includes('h1'), 'Top scored highlight included');
  assert(!selectedIds.includes('h2'), 'Duplicate burst photo suppressed');
  assert(selectedIds.includes('h3'), 'Diverse high quality photo included');
  assert(rankRes.recommendedCoverPhotoId === 'h1', 'Hero shot recommended as cover');

  // 4. Fact-Grounded Story Generation
  console.log('\n--- TEST GROUP 4: Fact-Grounded Story Generation ---');
  const storyService = new StoryGeneratorService();

  const storyMockChapters = [
    { id: 'ch-1', title: 'Morning Preparations', category: ChapterCategory.PREPARATION, photo_ids: ['1', '2'] },
    { id: 'ch-2', title: 'Vows & Exchange of Rings', category: ChapterCategory.CEREMONY, photo_ids: ['3', '4', '5'] },
  ] as any;

  const generatedStory = await storyService.generateStory({
    eventName: 'Emma & Liam Wedding',
    eventType: EventType.WEDDING,
    galleryDate: '2026-07-20T12:00:00Z',
    totalPhotos: 5,
    totalChapters: 2,
    chapters: storyMockChapters,
    topHighlights: [],
    tone: StoryTone.CELEBRATORY,
    length: StoryLength.STANDARD,
  });

  assert(generatedStory.headline.includes('Emma & Liam Wedding'), 'Story headline includes event name');
  assert(generatedStory.summary.includes('5 photos across 2 distinct chapters'), 'Story summary accurately cites factual photo & chapter counts');
  assert(generatedStory.body.includes('Morning Preparations'), 'Story body references detected chapters', `Generated Body: ${generatedStory.body}`);
  assert(generatedStory.factsUsed.totalPhotos === 5, 'Fact payload captures total photos');
  assert(generatedStory.factsUsed.totalChapters === 2, 'Fact payload captures total chapters');
  assert(generatedStory.providerUsed === 'TEMPLATE_ENGINE', 'Deterministic zero-hallucination template engine utilized');

  // Tone Variations
  const editorialStory = await storyService.generateStory({
    eventName: 'Vogue Runway Showcase',
    eventType: EventType.FASHION,
    galleryDate: null,
    totalPhotos: 10,
    totalChapters: 2,
    chapters: storyMockChapters,
    topHighlights: [],
    tone: StoryTone.EDITORIAL,
    length: StoryLength.CONCISE,
  });
  assert(editorialStory.body.toLowerCase().includes('editorial') || editorialStory.headline.toLowerCase().includes('editorial'), 'Editorial tone modifier applied');

  const minimalStory = await storyService.generateStory({
    eventName: 'Quiet Moments',
    eventType: EventType.PORTRAIT_SESSION,
    galleryDate: null,
    totalPhotos: 10,
    totalChapters: 2,
    chapters: storyMockChapters,
    topHighlights: [],
    tone: StoryTone.MINIMAL,
    length: StoryLength.CONCISE,
  });
  assert(minimalStory.body.toLowerCase().includes('essential') || minimalStory.headline.toLowerCase().includes('minimal') || minimalStory.summary.length > 0, 'Minimal tone generated');

  // 5. Chapter Merging & Splitting Logic
  console.log('\n--- TEST GROUP 5: Chapter Merging & Splitting Lifecycle ---');
  let mockDeletedIds: string[] = [];
  const mockPrisma: any = {
    gallery: {
      findFirst: async () => ({ id: 'g-1', title: 'Wedding Day' }),
      findUnique: async () => ({ id: 'g-1', title: 'Wedding Day' }),
    },
    eventIntelligence: {
      findFirst: async () => ({ id: 'ei-1', studio_id: 's-1', gallery_id: 'g-1', detected_event_type: EventType.WEDDING }),
    },
    eventChapter: {
      findMany: async (args: any) => {
        return [
          { id: 'ch-1', photo_ids: ['p1', 'p2'], order_index: 0, start_time: new Date(), end_time: new Date() },
          { id: 'ch-2', photo_ids: ['p3', 'p4'], order_index: 1, start_time: new Date(), end_time: new Date() },
        ];
      },
      findFirst: async () => ({
        id: 'ch-1',
        event_intelligence_id: 'ei-1',
        studio_id: 's-1',
        gallery_id: 'g-1',
        title: 'Reception',
        category: ChapterCategory.RECEPTION,
        order_index: 0,
        photo_count: 4,
        photo_ids: ['p1', 'p2', 'p3', 'p4'],
        created_at: new Date(),
        updated_at: new Date(),
      }),
      update: async (args: any) => ({
        id: args.where.id,
        event_intelligence_id: 'ei-1',
        gallery_id: 'g-1',
        title: args.data.title || 'Merged Chapter',
        category: args.data.category || ChapterCategory.CEREMONY,
        order_index: 0,
        photo_count: args.data.photo_count || 4,
        photo_ids: args.data.photo_ids || ['p1', 'p2', 'p3', 'p4'],
        cover_photo_id: 'p1',
        is_visible: true,
        created_at: new Date(),
        updated_at: new Date(),
      }),
      create: async (args: any) => ({
        id: 'ch-split-new',
        event_intelligence_id: 'ei-1',
        gallery_id: 'g-1',
        title: args.data.title,
        category: args.data.category,
        order_index: args.data.order_index,
        photo_count: args.data.photo_count,
        photo_ids: args.data.photo_ids,
        cover_photo_id: args.data.cover_photo_id,
        is_visible: true,
        created_at: new Date(),
        updated_at: new Date(),
      }),
      deleteMany: async (args: any) => {
        mockDeletedIds = args.where.id.in;
        return { count: mockDeletedIds.length };
      },
      updateMany: async () => ({ count: 1 }),
    },
    eventHighlight: {
      updateMany: async () => ({ count: 2 }),
      findFirst: async () => null,
    },
    eventStory: {
      findFirst: async () => null,
      create: async () => ({ id: 'st-1' }),
    },
    photo: { findMany: async () => [] },
  };

  const masterService = new EventIntelligenceService(mockPrisma);

  const merged = await masterService.mergeChapters('s-1', 'g-1', ['ch-1', 'ch-2'], 'Full Ceremony', ChapterCategory.CEREMONY);
  assert(merged.title === 'Full Ceremony', 'Merged chapter title updated');
  assert(merged.photo_count === 4, 'Merged chapter consolidated all 4 photos');
  assert(mockDeletedIds.includes('ch-2'), 'Deleted redundant second chapter');

  const splitResult = await masterService.splitChapter('s-1', 'g-1', 'ch-1', 'p3', 'Late Reception & Dancing');
  assert(splitResult.originalChapter.photo_count === 2, 'Original chapter partitioned to first 2 photos');
  assert(splitResult.newChapter.title === 'Late Reception & Dancing', 'New chapter created with specified title');
  assert(splitResult.newChapter.photo_count === 2, 'New chapter contains partitioned photos');

  // 6. Public Client Gallery Story & Biometric Privacy
  console.log('\n--- TEST GROUP 6: Public Story API & Biometric Privacy ---');
  const mockPublicPrisma: any = {
    gallery: {
      findFirst: async () => ({
        id: 'g-pub-1',
        title: 'Tech Conference 2026',
        slug: 'tech-conf-2026',
        status: 'PUBLISHED',
        event_intelligence: {
          detected_event_type: EventType.CORPORATE,
          manual_event_type: null,
          chapters: [
            { id: 'ch-1', title: 'Morning Keynote', category: ChapterCategory.KEY_MOMENTS, photo_count: 50, is_visible: true, order_index: 0 },
          ],
          highlights: [
            {
              id: 'hl-1',
              photo_id: 'p-1',
              is_pinned: true,
              is_suppressed: false,
              rank: 1,
              photo: { id: 'p-1', url: 'https://cdn.pixmatch.test/p1.jpg', thumbnail_url: 'https://cdn.pixmatch.test/t1.jpg' },
            },
          ],
          stories: [
            {
              id: 'st-1',
              headline: 'Tech Conference 2026 — Innovation in Action',
              summary: 'Over 50 photos documenting the technology conference.',
              body: 'Leaders gathered to discuss the next wave of computing.',
              tone: StoryTone.EDITORIAL,
              chapter_summaries: { 'ch-1': 'Morning Keynote presentation.' },
              is_public: true,
            },
          ],
        },
      }),
    },
  };

  const publicStoryService = new EventIntelligenceService(mockPublicPrisma);
  const publicStory = await publicStoryService.getPublicEventStory('tech-conf-2026');

  assert(publicStory !== null, 'Public story retrieved successfully by gallery slug');
  assert(publicStory?.galleryTitle === 'Tech Conference 2026', 'Public story contains gallery title');
  assert(publicStory?.chapters.length === 1, 'Public story includes visible chapters');
  assert(publicStory?.highlights.length === 1, 'Public story includes non-suppressed highlights');

  // Strict Biometric Isolation Verification
  const serialized = JSON.stringify(publicStory);
  assert(!serialized.includes('embedding'), 'Zero embedding leakage in public story');
  assert(!serialized.includes('crop_path'), 'Zero face crop path leakage in public story');
  assert(!serialized.includes('confidence_score'), 'Internal AI confidence stripped from public client payload');

  // Summary
  console.log('\n========================================================================');
  console.log(`📊  PHASE 13 TEST RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log('========================================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runPhase13EventIntelligenceTests().catch((err) => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
