# PIXMATCH AI — PHASE 8 ANALYTICS & BUSINESS INTELLIGENCE SYSTEM

## Overview
Phase 8 introduces a production-ready, privacy-first Analytics & Business Intelligence system designed specifically for high-volume photography studios and agencies.

The system empowers photographers to monitor gallery engagement, track client delivery and selection velocities, evaluate AI face search performance, manage storage growth across providers, and safely export data without risking biometric leaks or spreadsheet formula injections.

---

## 1. Architecture & Data Model

### Database Models (`packages/database/prisma/schema.prisma`)
1. **`StudioAnalyticsDaily`**:
   - Studio-level pre-aggregated daily summaries.
   - Unique constraint: `@@unique([studio_id, date])`.
   - Fields: `views_count`, `unique_visitors`, `favorites_count`, `selections_count`, `downloads_count`, `download_bytes`, `ai_searches_count`, `ai_matches_count`, `storage_used_bytes`, `photos_stored_count`.
2. **`GalleryAnalyticsDaily`**:
   - Per-gallery daily rollups.
   - Unique constraint: `@@unique([gallery_id, date])`.
   - Fields: `views_count`, `unique_visitors`, `favorites_count`, `selections_count`, `downloads_count`, `download_bytes`, `ai_searches_count`, `ai_matches_count`.
3. **`AiSearchLog`**:
   - Zero-biometric operational log capturing performance and hit rates of Find My Photos selfie searches.
   - Fields: `id`, `studio_id`, `gallery_id`, `faces_detected`, `matches_count`, `processing_time_ms`, `sensitivity`, `created_at`.
   - **Zero Biometric Rule**: Absolutely NO embeddings, vector coordinates, facial landmark arrays, or selfie URLs are recorded.

---

## 2. Metrics & Business Logic

### Engagement Score Formula
```
Engagement Score = (views × 1) + (favorites × 3) + (selections × 4) + (downloads × 5) + (ai_searches × 2)
```

### Client Intent Classification
- **HIGH**: Score $\ge 50$
- **MEDIUM**: Score $10 - 49$
- **LOW**: Score $1 - 9$
- **INACTIVE**: Score $0$

### Date Ranges & Delta Comparisons
- Presets: `today`, `7d`, `30d`, `90d`, `year`, `custom` (with explicit `from` / `to` timestamps).
- Delta calculation:
  $$\Delta\% = \frac{\text{Current} - \text{Previous}}{\text{Previous}} \times 100$$
- **Zero-Denominator Defense**:
  - If `Previous == 0` and `Current > 0` $\rightarrow +100\%$ (`trend: UP`).
  - If `Previous == 0` and `Current == 0` $\rightarrow 0\%$ (`trend: NEUTRAL`).

### Delivery Funnel Velocity
1. **Delivered**: Dispatched invitations via email/link.
2. **Opened**: Client accessed delivery link.
3. **Viewed**: Client session generated photo impressions.
4. **Favorited**: Hearted at least one photo.
5. **Selected**: Finalized album proof selection.
6. **Downloaded**: Single photo or bulk zip download triggered.

---

## 3. Security & Anti-IDOR Protections

1. **Strict Tenant Isolation**:
   - Every analytics query binds `where: { studio_id: req.user.studio_id }`.
   - Gallery and client lookups verify ownership prior to aggregation.
2. **CSV Formula Injection Sanitization**:
   - Every exported cell is processed through `AnalyticsService.sanitizeCsvField`.
   - Cells beginning with `=, +, -, @, \t, \r` are prefixed with `'` and escaped with RFC 4180 quotes.
3. **Biometric Data Boundary**:
   - No facial vectors or biometric artifacts are exposed in REST APIs, timeseries endpoints, or exported files.

---

## 4. API Endpoints

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/api/v1/analytics/overview` | Primary KPI cards, comparisons, funnel, and deterministic insights |
| `GET` | `/api/v1/analytics/timeseries` | Daily breakdown for chart visualizations with zero-filling |
| `GET` | `/api/v1/analytics/galleries` | Gallery engagement leaderboard sorted by engagement score |
| `GET` | `/api/v1/analytics/galleries/:id` | Deep-dive analytics for a single gallery |
| `GET` | `/api/v1/analytics/clients` | Client CRM intelligence with intent tiers |
| `GET` | `/api/v1/analytics/ai` | AI face search volume, match rates, and latency metrics |
| `GET` | `/api/v1/analytics/storage` | Storage usage breakdown across connected providers |
| `GET` | `/api/v1/analytics/downloads` | Single vs zip download counts and bandwidth usage |
| `GET` | `/api/v1/analytics/export` | CSV / JSON export of analytics data |
| `POST` | `/api/v1/analytics/aggregate` | Idempotent daily rollup worker endpoint |
| `POST` | `/api/v1/analytics/backfill` | Historic aggregation backfill endpoint |

---

## 5. Verification & Test Coverage
- **Total Tests Passing**: 539/539 tests (456 Baseline + 83 Phase 8)
- **Workspaces Compiling Cleanly**: 9/9 Turbo workspaces
- **Zero Regressions**: Phase 5.1 Client Gallery (`/gallery/[slug]`) and Phase 6 Photographer UI completely intact.
