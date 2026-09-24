# PIXMatch AI — Phase 14: AI Personalized Client Experience + Intelligent Photo Discovery

## 1. Overview
Phase 14 delivers an intelligent, privacy-preserving, personalized photo discovery experience for public gallery visitors and clients. It unifies **"Find My Photos" (facial search)**, **AI Highlights**, **Smart Albums**, **Event Story Chapters**, **Favorites**, **Client Selections**, **Session History**, and **Contextual "More Like This" Similarity** into a single cohesive client discovery surface.

---

## 2. Architecture & Flow

```
                                  Client Browser
               (Anonymous Session / Gallery Client / Consented User)
                                         │
                 ┌───────────────────────┼───────────────────────┐
                 │                       │                       │
                 ▼                       ▼                       ▼
      Personalized Home Hub       "More Like This"       Safe Discovery Search
      - Curated Highlights        - Scene Similarity     - Tag / Scene Search
      - Recommended For You       - Color / Lighting     - Filename / Metadata
      - Event Story Chapters      - Mood & Composition   - Natural Language Router
      - Smart Albums              - Burst Deduplication    ("photos of me" -> FindMyPhotos)
      - Favorites & Selections           │                       │
      - Recently Viewed Track            │                       │
                 │                       │                       │
                 └───────────────────────┼───────────────────────┘
                                         ▼
                            PhotoRecommendationService
                      (/apps/api/src/modules/galleries/)
                                         │
                 ┌───────────────────────┼───────────────────────┐
                 ▼                       ▼                       ▼
       Multi-Factor Scorer       Burst Deduplicator      Biometric Privacy Guard
       - Quality Score           - Suppresses Near-      - Zero Embedding Leakage
       - Session Affinity          Duplicates & Bursts   - Zero Face Crop Paths
       - Chapter Relevance       - Surfaces Best Shot    - Zero Bounding Boxes
       - Recency Weight
```

---

## 3. Core Capabilities

### A. Personalized Client Home (`GET /api/v1/public/:slug/personalized`)
- Dynamically renders a client home screen tailored to anonymous session state (`x-gallery-session` or query parameter).
- Returns:
  - `hero_photo`: Top-rated aesthetic hero image for the event.
  - `highlights`: Best curated photos across all chapters.
  - `recommendations`: Multi-factor ranked photos based on session interaction or cold-start aesthetics.
  - `chapters`: Timeline and sequence clustered event chapters with cover photos.
  - `smart_albums`: Public-facing smart collections (e.g. ceremony, portraits, golden hour).
  - `session_stats`: Real-time count of favorites and client selections.
  - `recently_viewed`: Chronological history of recently examined photos.

### B. "More Like This" Contextual Similarity (`GET /api/v1/public/:slug/photos/:photoId/similar`)
- Computes non-biometric visual similarity between photos within the same gallery using:
  - Scene category similarity
  - AI tag overlap (Jaccard similarity)
  - Color palette & luminance distance
  - Compositional score and temporal proximity
- Automatically suppresses burst duplicates to offer true visual diversity.
- Exposes user-friendly discovery reasons (e.g., *"Similar scene & color mood"*).

### C. Safe Discovery Search & Intent Routing (`GET /api/v1/public/:slug/search?q=...`)
- Searches gallery tags, scene categories, metadata, and filenames.
- Natural Language Intent Detection: When users search queries like `"photos of me"`, `"find my face"`, or `"selfie"`, the API returns `redirect_to_find_my_photos: true` with zero unconsented facial queries, guiding the user to the biometric-consented selfie search flow.
- Returns quick filter chips (`"Highlights"`, `"Ceremony"`, `"Portraits"`, `"Sunset"`) when search queries are empty.

### D. Session Interaction Tracking (`POST /api/v1/public/:slug/activity`)
- Logs client interaction events (`PHOTO_VIEW`, `PHOTO_FAVORITE`, `PHOTO_DOWNLOAD`, `MORE_LIKE_THIS_CLICK`, `CHAPTER_VIEW`) linked to the anonymous session token.
- Keeps activity strictly scoped to the active gallery.

---

## 4. Multi-Factor Recommendation Scoring Algorithm

```typescript
Final Score = (QualityScore * 0.35)
            + (SessionTagAffinity * 0.25)
            + (ChapterRelevance * 0.20)
            + (RecencyDecay * 0.10)
            + (BurstBonus * 0.10);
```

- **Burst Suppression:** Duplicate groups (`duplicate_group_id` / `near_duplicate_group_id`) are consolidated so that only the highest quality "Best Shot" in a sequence is recommended.

---

## 5. Biometric Privacy Isolation Guarantee

| Public Surface | AI Metadata Allowed | Biometric Data Allowed |
| :--- | :--- | :--- |
| **Personalized Home** | Scene Category, Aesthetic Score, Dimensions | ❌ **Strictly Forbidden** (No embeddings, no face crops) |
| **"More Like This"** | Scene Tags, Dominant Colors, Luminance | ❌ **Strictly Forbidden** (No face vectors) |
| **Public Search** | Scene Tags, Filenames, Metadata | ❌ **Strictly Forbidden** (No face matches without selfie upload) |
| **Find My Photos** | Consented ArcFace Search | ✅ **Allowed with explicit Client Consent only** |

---

## 6. Verification & Test Suite

The implementation is verified with **56 automated test assertions** across 11 test groups in `tests/phase14-client-personalization.test.ts`:
- **Test Group 1:** Personalized Client Home Hub
- **Test Group 2:** Recommendation Engine & Burst Suppression
- **Test Group 3:** "More Like This" Photo Similarity
- **Test Group 4:** Safe Metadata Search & Find-My-Photos Routing
- **Test Group 5:** Session Activity & Recently Viewed
- **Test Group 6:** Enhanced Find My Photos Ranking Signal
- **Test Group 7:** Zero Biometric Leakage & Privacy Validation
- **Test Group 8:** Personalization Settings & Boundary Guards
- **Test Group 9:** Anonymous Session Isolation & Multi-Tenant Scope
- **Test Group 10:** Event Chapter Integration & Highlight Coverage
- **Test Group 11:** Static Method & Instance Method API Parity
