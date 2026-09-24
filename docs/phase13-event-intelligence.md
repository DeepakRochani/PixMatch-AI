# PixMatch AI — Phase 13: AI Event Intelligence + Automatic Event Storytelling

## 1. Executive Summary

Phase 13 delivers **AI Event Intelligence and Automated Storytelling** to PixMatch AI. The system transforms disorganized photo uploads into coherent, structured event chapters and rich narrative stories without altering or risking biometric privacy, existing Smart Albums, or legacy pipelines.

### Core Capabilities
1. **Multi-Signal Event Classifier**: Heuristic & statistical detection for 14 event types (`WEDDING`, `BIRTHDAY`, `CORPORATE`, `CONFERENCE`, `CONCERT`, `SPORTS`, `PARTY`, `PORTRAIT`, `ENGAGEMENT`, `ANNIVERSARY`, `GRADUATION`, `FESTIVAL`, `TRAVEL`, `OTHER`) using gallery titles, tags, visual keywords, and chronological spans.
2. **Timeline & Chronological Clustering**: Adaptive time-gap clustering (default 45-minute inter-cluster threshold) with automated sequence fallback for untimed or EXIF-stripped photo collections.
3. **Diversity Highlight Ranker & Burst Suppression**: Multi-factor scoring combining sharpness, exposure balance, emotional valence, and face presence, paired with dHash duplicate burst suppression (`duplicate_group_id`) to ensure varied, non-redundant highlight feeds.
4. **Fact-Grounded Zero-Hallucination Story Engine**: Customizable narrative generation with tone control (`CELEBRATORY`, `EDITORIAL`, `EMOTIONAL`, `CINEMATIC`, `DOCUMENTARY`, `MINIMAL`) and length presets (`SHORT`, `MEDIUM`, `LONG`) strictly bound to verified gallery metadata.
5. **Photographer Chapter Management**: Full CRUD, split, merge, reorder, and cover selection capabilities in the photographer dashboard.
6. **Zero-Biometric Leakage Public Client Viewer**: Client-facing story modal accessible via public gallery slug with strict privacy sanitization (no vectors, facial crops, or raw internal confidence metrics).
7. **BullMQ Async Architecture**: Dedicated `event-intelligence` queue and worker for high-throughput background processing.
8. **Super Admin Telemetry**: AI Operations panel integration tracking event analysis throughput, classification distribution, and latency.

---

## 2. Architecture & Data Flow

```
┌──────────────────────────────────────────────────────────┐
│                   Gallery Upload                         │
└────────────────────────────┬─────────────────────────────┘
                             ▼
┌──────────────────────────────────────────────────────────┐
│              BullMQ: event-intelligence                  │
│             (EventIntelligenceProcessor)                 │
└────────────────────────────┬─────────────────────────────┘
                             ▼
┌──────────────────────────────────────────────────────────┐
│                 EventDetectorService                     │
│  - Heuristics, keyword match, temporal analysis          │
│  - Output: EventType + ConfidenceLevel                   │
└────────────────────────────┬─────────────────────────────┘
                             ▼
┌──────────────────────────────────────────────────────────┐
│              TimelineChapterService                      │
│  - Chronological clustering with time-gap threshold      │
│  - Sequential batching fallback for missing EXIF         │
│  - Automated semantic chapter categorizer                │
└────────────────────────────┬─────────────────────────────┘
                             ▼
┌──────────────────────────────────────────────────────────┐
│               HighlightRankerService                     │
│  - Quality score (sharpness + exposure) + emotion valence│
│  - Burst suppression (dHash group de-duplication)        │
│  - Chapter diversity quotas & cover photo selection      │
└────────────────────────────┬─────────────────────────────┘
                             ▼
┌──────────────────────────────────────────────────────────┐
│                StoryGeneratorService                     │
│  - Fact extraction (dates, chapter names, counts)        │
│  - Tone modifier (Editorial, Celebratory, Cinematic)     │
│  - Zero-hallucination structured narrative synthesis     │
└────────────────────────────┬─────────────────────────────┘
                             ▼
┌──────────────────────────────────────────────────────────┐
│                   Prisma Persistence                     │
│  - EventIntelligence, EventChapter, EventStory,          │
│    EventHighlight                                        │
└────────────────────────────┬─────────────────────────────┘
                             ▼
             ┌───────────────┴───────────────┐
             ▼                               ▼
┌─────────────────────────┐     ┌─────────────────────────┐
│ Photographer Dashboard  │     │ Client Gallery Public   │
│ - Full chapter curation │     │ - Zero-biometric story  │
│ - Highlight pinning     │     │ - Chapter visual viewer │
│ - Tone / Story editing  │     │ - Clean, fast UI        │
└─────────────────────────┘     └─────────────────────────┘
```

---

## 3. Database Schema (`packages/database/prisma/schema.prisma`)

### Models Added

```prisma
model EventIntelligence {
  id                        String                   @id @default(uuid())
  gallery_id                String                   @unique
  studio_id                 String
  event_type                EventType                @default(OTHER)
  event_confidence          ConfidenceLevel          @default(LOW)
  detected_signals          Json                     @default("[]")
  is_timeline_enabled       Boolean                  @default(true)
  is_story_enabled          Boolean                  @default(true)
  is_highlights_enabled     Boolean                  @default(true)
  client_story_visible      Boolean                  @default(true)
  default_highlight_limit   Int                      @default(25)
  story_tone                StoryTone                @default(WARM)
  story_length              StoryLength              @default(STANDARD)
  suggested_cover_photo_id  String?
  suggested_cover_photo_url String?
  status                    EventIntelligenceStatus  @default(PENDING)
  error_message             String?
  analyzed_at               DateTime?
  created_at                DateTime                 @default(now())
  updated_at                DateTime                 @updated_at

  gallery                   Gallery                  @relation(fields: [gallery_id], references: [id], onDelete: Cascade)
  chapters                  EventChapter[]
  story                     EventStory?
  highlights                EventHighlight[]

  @@index([studio_id])
  @@index([status])
}

model EventChapter {
  id                    String            @id @default(uuid())
  event_intelligence_id String
  gallery_id            String
  title                 String
  description           String?
  category              ChapterCategory   @default(OTHER)
  start_time            DateTime?
  end_time              DateTime?
  photo_count           Int               @default(0)
  sequence_index        Int               @default(0)
  cover_photo_id        String?
  cover_photo_url       String?
  is_visible            Boolean           @default(true)
  is_user_edited        Boolean           @default(false)
  created_at            DateTime          @default(now())
  updated_at            DateTime          @updated_at

  event_intelligence    EventIntelligence @relation(fields: [event_intelligence_id], references: [id], onDelete: Cascade)
  photos                Photo[]
  highlights            EventHighlight[]

  @@index([gallery_id])
  @@index([sequence_index])
}

model EventStory {
  id                    String            @id @default(uuid())
  event_intelligence_id String            @unique
  gallery_id            String            @unique
  title                 String
  headline              String
  summary               String
  body                  String            @db.Text
  tone                  StoryTone         @default(WARM)
  length                StoryLength       @default(STANDARD)
  chapter_summaries     Json              @default("{}")
  key_moments           Json              @default("[]")
  status                StoryStatus       @default(DRAFT)
  is_user_edited        Boolean           @default(false)
  created_at            DateTime          @default(now())
  updated_at            DateTime          @updated_at

  event_intelligence    EventIntelligence @relation(fields: [event_intelligence_id], references: [id], onDelete: Cascade)
}

model EventHighlight {
  id                    String            @id @default(uuid())
  event_intelligence_id String
  gallery_id            String
  chapter_id            String?
  photo_id              String
  rank                  Int               @default(0)
  score                 Float             @default(0.0)
  reason                String?
  is_pinned             Boolean           @default(false)
  is_suppressed         Boolean           @default(false)
  created_at            DateTime          @default(now())
  updated_at            DateTime          @updated_at

  event_intelligence    EventIntelligence @relation(fields: [event_intelligence_id], references: [id], onDelete: Cascade)
  chapter               EventChapter?     @relation(fields: [chapter_id], references: [id], onDelete: SetNull)
  photo                 Photo             @relation(fields: [photo_id], references: [id], onDelete: Cascade)

  @@unique([event_intelligence_id, photo_id])
  @@index([gallery_id])
  @@index([rank])
}
```

---

## 4. API Endpoints

All authenticated endpoints verify user tenant authorization (`[studio_id, gallery_id]`).

### Photographer & Dashboard API (`/api/v1/event-intelligence`)
- `POST /api/v1/event-intelligence/:galleryId/analyze`: Dispatch async background analysis job or compute synchronously if Redis is bypassed.
- `GET /api/v1/event-intelligence/:galleryId`: Fetch full Event Intelligence state (timeline, chapters, highlights, story, settings).
- `GET /api/v1/event-intelligence/:galleryId/timeline`: Fetch structured timeline chapters and chronological boundaries.
- `GET /api/v1/event-intelligence/:galleryId/highlights`: Fetch ranked highlights with burst duplicate tags and rank ordering.
- `GET /api/v1/event-intelligence/:galleryId/story`: Fetch generated event story and chapter breakdown.
- `POST /api/v1/event-intelligence/:galleryId/story/regenerate`: Regenerate story with custom tone (`EDITORIAL`, `WARM`, `CELEBRATORY`, `CINEMATIC`) and length presets.
- `PUT /api/v1/event-intelligence/:galleryId/story`: Save manual edits to story title, headline, summary, and body text.
- `POST /api/v1/event-intelligence/:galleryId/chapters`: Create a custom chapter.
- `PUT /api/v1/event-intelligence/:galleryId/chapters/:chapterId`: Edit chapter title, description, category, or cover photo.
- `POST /api/v1/event-intelligence/:galleryId/chapters/reorder`: Update sequence ordering of chapters.
- `POST /api/v1/event-intelligence/:galleryId/chapters/merge`: Merge multiple chapters into one consolidated chapter.
- `POST /api/v1/event-intelligence/:galleryId/chapters/:chapterId/split`: Split an existing chapter into two at a designated split photo boundary.
- `DELETE /api/v1/event-intelligence/:galleryId/chapters/:chapterId`: Delete a chapter and reassign associated photos.
- `POST /api/v1/event-intelligence/:galleryId/highlights/:highlightId/toggle-pin`: Pin or unpin a photo as a guaranteed highlight.
- `POST /api/v1/event-intelligence/:galleryId/highlights/:highlightId/toggle-suppress`: Suppress a photo from the highlight feed.
- `PUT /api/v1/event-intelligence/:galleryId/settings`: Update visibility, highlight quotas, and default tone settings.

### Public Client Gallery API
- `GET /api/galleries/public/:slug/event-story`: Public, unauthenticated endpoint returning sanitized story and chapter structure for client display.

---

## 5. Security & Biometric Privacy Enforcement

1. **Strict Tenant Isolation**: All read/write operations validate `studio_id` from the authenticated session context against the gallery ownership record.
2. **Zero Biometric Leakage in Client Payloads**: Public responses returned by `GET /api/galleries/public/:slug/event-story` are filtered through `sanitizeForPublicStory()`.
   - Embeddings (`pgvector` float arrays) are stripped.
   - Facial crop paths (`crop_path`) are omitted.
   - Internal detector confidence scores (`event_confidence`, `score`) are removed.
   - Private photographer metadata (burst cluster IDs, unapproved chapters) are omitted.

---

## 6. Automated Testing Verification

All 39 automated tests in `tests/phase13-event-intelligence.test.ts` pass cleanly:
- Multi-Signal Event Detection (Wedding, Birthday, Corporate, Fallback)
- Timeline and Sequential Chapter Clustering
- Diversity Highlight Ranking with dHash Burst Suppression
- Fact-Grounded Story Generation across multiple tones
- Chapter Lifecycle (Merging and Splitting)
- Public Story Endpoint & Zero Biometric Leakage Verification
