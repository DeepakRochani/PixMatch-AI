# PIXMATCH AI — PHASE 6 ARCHITECTURE & SPECIFICATION
## Photographer Gallery Management & Professional Dashboard

### 1. Executive Overview
Phase 6 delivers a comprehensive, multi-tenant workspace for photographers and studios to manage event galleries, organize photos into albums, execute batch operations, inspect full EXIF metadata and AI-detected faces, control client access models, and monitor real-time database-backed performance analytics.

---

### 2. Core Architecture Components

```text
┌─────────────────────────────────────────────────────────────────────────────┐
│                       PHOTOGRAPHER DASHBOARD SUITE                          │
├─────────────────────────────────────────────────────────────────────────────┤
│  /dashboard              - Live Metrics, Recent Galleries, Processing Feed  │
│  /dashboard/galleries    - Gallery Grid/List, Search, Filters, Duplicate    │
│  /dashboard/galleries/new- 6-Step Gallery Creation Wizard                  │
│  /dashboard/galleries/:id- 10-Tab Event Workspace (Overview to Settings)   │
└───────────────────────┬─────────────────────────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                       GALLERIES API & ROUTE SURFACE                         │
├─────────────────────────────────────────────────────────────────────────────┤
│  GET  /api/v1/galleries/stats                  - Studio Dashboard Metrics   │
│  GET  /api/v1/galleries                        - List Studio Galleries      │
│  POST /api/v1/galleries                        - Create Event Gallery       │
│  GET  /api/v1/galleries/:id                    - Gallery Master Record      │
│  PUT  /api/v1/galleries/:id                    - Update Settings & Access   │
│  DELETE /api/v1/galleries/:id                  - Delete Gallery Permanently │
│  POST /api/v1/galleries/:id/archive            - Archive Gallery            │
│  POST /api/v1/galleries/:id/restore            - Restore Archived Gallery   │
│  POST /api/v1/galleries/:id/duplicate          - Clone Configuration        │
│  GET  /api/v1/galleries/:id/overview           - Real DB Overview Metrics   │
│  GET  /api/v1/galleries/:id/photos             - Query, Filter, Sort Photos │
│  POST /api/v1/galleries/:id/photos/bulk-action - Batch Delete/Move/Reprocess│
│  POST /api/v1/galleries/:id/photos/reorder     - Persist Custom Photo Order │
│  PUT  /api/v1/galleries/:id/cover              - Assign Gallery Cover Photo │
│  GET  /api/v1/galleries/:id/albums             - List Gallery Albums        │
│  POST /api/v1/galleries/:id/albums             - Create Sub-Album           │
│  PUT  /api/v1/galleries/:id/albums/:albumId    - Update Album Details       │
│  DELETE /api/v1/galleries/:id/albums/:albumId  - Delete Album (Safe Unlink) │
│  GET  /api/v1/galleries/:id/favorites          - Client Favorites List      │
│  GET  /api/v1/galleries/:id/selections         - Proofing Selections        │
│  GET  /api/v1/galleries/:id/downloads          - Download Audit History     │
│  GET  /api/v1/galleries/:id/activity           - Security & Audit Event Log │
│  POST /api/v1/galleries/:id/ai/reindex         - Queue AI Re-indexing       │
│  POST /api/v1/galleries/:id/ai/retry-failed    - Retry Failed Photo Jobs    │
└───────────────────────┬─────────────────────────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                       POSTGRESQL + PGVECTOR DATA LAYER                      │
├─────────────────────────────────────────────────────────────────────────────┤
│  Gallery  - Tenant-isolated events, access rules, cover photo, view count   │
│  Album    - Logical groupings (Ceremony, Reception, Portraits) with sort   │
│  Photo    - Master file reference, Sharp thumbnails, face count, album link │
│  FaceEmbedding - 512-D InsightFace biometric vectors indexed with pgvector  │
│  AuditLog - Traceable event history with studio tenant isolation            │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

### 3. Gallery Workspace 10-Tab System

1. **Overview Tab**: Live aggregated studio and gallery metrics (total photos, completed derivatives, detected face embeddings, storage consumed, unique client views, selfie search hits, download counts, and direct URL copy).
2. **Photos Tab**:
   - Live search by original filename or SHA-256 hash.
   - Status filters: `ALL`, `COMPLETED`, `PROCESSING`, `QUEUED`, `FAILED`.
   - AI filters: `ALL`, `WITH_FACES`, `WITHOUT_FACES`.
   - Album dropdown filter & sorting (`NEWEST`, `OLDEST`, `FILENAME_ASC`, `FILENAME_DESC`, `SIZE_DESC`).
   - Batch selection toolbar supporting multi-photo delete, move to album, reprocess, and AI reindex.
   - Interactive Photo Inspector lightbox modal with full metadata and cover photo controls.
3. **Albums Tab**: Creation, renaming, description updates, and safe deletion of sub-albums (photos are safely unassigned to general gallery storage rather than destroyed).
4. **AI Face Search Tab**: Real-time InsightFace status, 512-D embedding totals, similarity sensitivity slider (0.35–0.85), full gallery re-index trigger, and failed photo retry button.
5. **Clients & Visits Tab**: Real-time log of client IP sessions, access timestamps, and gallery viewing history.
6. **Favorites Tab**: Summary of photos marked as favorites by clients for album design or personal selection.
7. **Selections Tab**: Client proofing order submissions with export capabilities.
8. **Downloads Tab**: Comprehensive delivery log recording single photo and bulk ZIP download events with client IP addresses.
9. **Activity / Audit Log Tab**: Immutable system log recording gallery creation, uploads, settings alterations, album movements, and cover selections.
10. **Settings Tab**: Complete control over gallery title, event type, date, description, access model (`PUBLIC`, `UNLISTED`, `PASSWORD`, `PRIVATE`), password/PIN, viewing expiration, watermark mode, download rules, archive, duplicate, and permanent deletion.

---

### 4. Zero Hardcoded / Fake Metrics Guarantee
All numbers displayed across `/dashboard`, `/dashboard/galleries`, and `/dashboard/galleries/:id` are dynamically aggregated using Prisma raw or structured queries against PostgreSQL tables (`Photo`, `FaceEmbedding`, `Gallery`, `Album`, `ClientActivity`, `PhotoDownload`).

---

### 5. Automated Verification Matrix
- **Test Suite**: `tests/phase6-gallery-management.test.ts` (58/58 tests passed).
- **Full Monorepo Suite**: 274/274 tests passed across Phases 2 through 6.
- **Build Status**: 9/9 workspaces build cleanly with zero TypeScript errors.
