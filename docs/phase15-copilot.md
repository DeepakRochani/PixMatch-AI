# PIXMatch AI — Phase 15: AI Photographer Copilot & Automated Gallery Assistant

## 1. Overview
Phase 15 introduces an **AI Photographer Copilot & Automated Gallery Assistant** designed to dramatically accelerate post-event gallery curation and delivery. Acting as an intelligent co-pilot, the system evaluates multi-dimensional operational gallery health, surfaces prioritized attention items, recommends optimal cover images and smart albums, and provides a fact-grounded conversational assistant.

All AI recommendations and actions enforce strict **photographer approval gating**, **tenant isolation**, **prompt injection defenses**, and **zero biometric leakage**.

---

## 2. Architecture & Flow

```
                             Photographer / Studio Admin
                                          │
            ┌─────────────────────────────┼─────────────────────────────┐
            │                             │                             │
            ▼                             ▼                             ▼
  Copilot Dashboard (Web)         "Prepare Gallery"           Copilot Chat Assistant
  - 100-pt Health Score           - Automated Pipeline        - Natural Language Interface
  - 7 Operational Dimensions      - Cover Photo Curation      - Fact-Grounded Context
  - Prioritized Attention Items   - Smart Albums Scaffolding  - Prompt Injection Defense
  - Pre-Flight Checklist          - Timeline Chapters         - Approval-Gated Actions
            │                             │                             │
            └─────────────────────────────┼─────────────────────────────┘
                                          ▼
                               CopilotService & Registry
                            (/apps/api/src/modules/copilot/)
                                          │
            ┌─────────────────────────────┼─────────────────────────────┐
            ▼                             ▼                             ▼
   GalleryHealthService        CoverRecommendationService     CopilotAttentionService
   - Processing (20%)          - Visual Quality & Exposure    - Multi-Gallery Aggregation
   - AI Indexing (20%)         - Sharpness & Best Shot        - Severity Sorting
   - Quality Review (15%)      - Orientation Scoring          - Blocking Impact Ranking
   - Duplicates / Burst (10%)  - Duplicate Suppression                  │
   - Cover Presentation (15%)             │                             │
   - Smart Albums & Story (10%)           │                             │
   - Client Settings (10%)                ▼                             ▼
                                 CopilotAction Pipeline       Deterministic/LLM Engine
                                 - PENDING_APPROVAL           - Non-Hallucinatory Facts
                                 - APPROVED -> COMPLETED      - Biometric Vector Defense
                                 - Action Audit Logging
```

---

## 3. Core Capabilities

### A. Multi-Dimensional Operational Health Scoring (`GalleryHealthService`)
Computes an objective, 100-point readiness health score across 7 operational categories:
1. **Photo Processing (20%)**: Checks queue completion and identifies failed jobs.
2. **AI & Face Indexing (20%)**: Verifies facial recognition and scene vector indexing coverage.
3. **Photo Quality & Review (15%)**: Flags blur, severe under/over-exposure, and low aesthetic scores.
4. **Burst & Duplicate Curation (10%)**: Identifies rapid burst sequences and duplicate clusters.
5. **Cover & Visual Presentation (15%)**: Assesses primary cover selection and hero image impact.
6. **Smart Albums & Event Story (10%)**: Evaluates availability of story chapters and smart collections.
7. **Client Delivery & Settings (10%)**: Checks client assignment, download permissions, and expiration.

#### Health Status Classification
- `READY` (90–100): Fully prepared, no blocking issues.
- `ALMOST_READY` (75–89): Operational with minor recommended improvements.
- `NEEDS_ATTENTION` (50–74): Non-blocking issues present (e.g. unreviewed bursts, missing cover).
- `BLOCKED` (0–49): Critical blockers prevent delivery (e.g. failed processing, expired gallery).

---

### B. Pre-Flight Completeness Checklist (`GalleryCompletenessService`)
Evaluates 10 pre-flight delivery rules before client publishing:
1. `photos_uploaded`: Gallery has photos.
2. `processing_complete`: All photo processing jobs finished successfully.
3. `ai_indexed`: AI facial and scene indexing complete.
4. `cover_selected`: Hero cover image configured.
5. `quality_reviewed`: Low quality and blurry photos reviewed.
6. `duplicates_curated`: Burst duplicate clusters addressed.
7. `smart_albums_created`: Smart collections generated.
8. `event_story_ready`: Timeline chapters and narrative generated.
9. `clients_assigned`: Registered clients or public link configured.
10. `settings_verified`: Expiration and download permissions confirmed.

---

### C. "What Needs My Attention" Prioritization (`CopilotAttentionService`)
- Aggregates actionable items across all galleries belonging to the studio.
- Ranks items with a severity weighting hierarchy:
  `CRITICAL (5) > HIGH (4) > MEDIUM (3) > LOW (2) > INFO (1)`
- Flags items that have `blocking_impact` on client delivery.

---

### D. AI Cover Photo & Smart Album Recommendations
- **Cover Photo Engine (`CoverRecommendationService`)**: Evaluates aesthetic scores, sharpness, exposure balance, aspect ratio (1.3–1.8 landscape bonus), and event highlights. Blurry photos and non-best shots in burst sequences are filtered out.
- **Smart Album Engine (`SmartAlbumRecommendationService`)**: Proposes intelligent collections (e.g. Highlights, Ceremony, Portraits, Golden Hour) grounded in tag evidence and face clustering.
- **Event Story Engine (`EventStoryRecommendationService`)**: Evaluates chronological chapter readiness and matches narrative tone (`ELEGANT`, `CELEBRATORY`, `EDITORIAL`, `CINEMATIC`, `WARM`) to event types.

---

### E. Approval-Gated Action Execution Pipeline
All mutation actions enforce strict photographer approval gating:
```
[ ACTION CREATED ] -> status: PENDING_APPROVAL
        │
        ├──> [ APPROVE ] ──> status: RUNNING ──> status: COMPLETED
        │
        └──> [ REJECT ]  ──> status: CANCELLED
```
- Safe read actions execute immediately.
- Destructive or state-changing actions (e.g., cover assignment, photo deletion, retry jobs) require explicit photographer confirmation before database modification.

---

### F. Fact-Grounded Conversational Assistant & Security Boundaries
- **Context Builder (`CopilotContextBuilder`)**: Gathers verified factual statistics from the database (exact photo counts, processing states, duplicate groups) to eliminate hallucination.
- **Prompt Injection Defense (`sanitizeUserInput`)**: Deflects adversarial inputs targeting system prompts, secret keys, or extraction of internal vectors.
- **Zero Biometric Leakage**: Conversational contexts, recommendations, and public payloads are stripped of facial embeddings, crop coordinates, and bounding boxes.

---

## 4. API Endpoints

Mounted under `/api/v1/copilot/`:

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/api/v1/copilot/health` | Multi-gallery operational health scores for the studio |
| `GET` | `/api/v1/copilot/galleries/:galleryId/health` | Detailed 7-category health scorecard for a gallery |
| `GET` | `/api/v1/copilot/galleries/:galleryId/completeness` | 10-rule pre-flight completeness checklist |
| `GET` | `/api/v1/copilot/attention` | Prioritized attention summary across all studio galleries |
| `GET` | `/api/v1/copilot/galleries/:galleryId/attention` | Attention items scoped to a specific gallery |
| `GET` | `/api/v1/copilot/galleries/:galleryId/recommendations` | Cover, album, story, and curation recommendations |
| `POST` | `/api/v1/copilot/recommendations/:id/dismiss` | Dismiss a recommendation |
| `POST` | `/api/v1/copilot/conversations` | Initialize or load a copilot conversation |
| `POST` | `/api/v1/copilot/conversations/:id/messages` | Send user message and receive fact-grounded response |
| `POST` | `/api/v1/copilot/actions` | Create a pending approval action |
| `POST` | `/api/v1/copilot/actions/:id/approve` | Approve and execute a pending action |
| `POST` | `/api/v1/copilot/actions/:id/reject` | Reject/cancel a pending action |
| `POST` | `/api/v1/copilot/galleries/:galleryId/prepare` | Run guided one-click multi-step gallery preparation |
| `GET` | `/api/v1/copilot/admin/telemetry` | Super Admin telemetry, latency metrics, and action rates |

---

## 5. UI Implementation

1. **Photographer AI Copilot Dashboard (`/dashboard/copilot`)**:
   - Gallery health score dial (0–100) with status badge (`Ready to Publish`, `Almost Ready`, `Needs Attention`, `Blocked`).
   - 7 Operational dimension progress cards with explanations.
   - "What Needs Your Attention" priority list with one-click fix buttons.
   - Side-by-side interactive Conversational Assistant with suggested question chips.
2. **Super Admin Telemetry (`/dashboard/admin/ai/copilot`)**:
   - Total conversations, messages, active recommendations, action acceptance rate.
   - Operational response latency breakdown.
3. **Sidebar Integration (`DashboardSidebar.tsx`)**:
   - Added **AI Copilot** navigation item with `Sparkles` icon under the Core tools section.

---

## 6. Verification & Test Suite

The automated test suite (`tests/phase15-copilot.test.ts`) verifies 12 comprehensive test groups with **100% pass rate (69/69 passed)**:
- **Group 1**: Gallery Health Engine & Operational Scoring (7 categories, 1.0 weight sum, status thresholds)
- **Group 2**: Gallery Completeness & Checklist Blocks (10 rules, blocker detection)
- **Group 3**: Attention Aggregator & Prioritization (Severity sorting, scoped gallery isolation)
- **Group 4**: Cover Photo Recommendations (Best shot ranking, blur/burst suppression)
- **Group 5**: Smart Album & Story Recommendations (Grounded suggestions, event tone matching)
- **Group 6**: Controlled Tool Registry & Safe Execution (Read tools, retry mutation, error handling)
- **Group 7**: Fact-Grounded Context Builder (Zero hallucination factual stats)
- **Group 8**: Conversational Assistant & Injection Defense (Adversarial deflection, grounded numbers)
- **Group 9**: Action Approval Lifecycle (`PENDING_APPROVAL` -> `COMPLETED`, rejection)
- **Group 10**: Guided "Prepare Gallery" Workflow (Completed steps & pending approval queue)
- **Group 11**: Zero Biometric Leakage Guarantees (Zero embeddings, zero vector data)
- **Group 12**: Tenant Isolation & Multi-Studio Security (Cross-studio blocking)

---

## 7. Zero Regressions
- Full monorepo test suite: **Phases 2 through 15 passed cleanly**.
- Monorepo compilation: **All 9 workspaces built successfully** with Next.js static and dynamic route generation.
