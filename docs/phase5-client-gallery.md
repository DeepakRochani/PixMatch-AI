# PixMatch AI — Phase 5: Production Client Gallery & Find My Photos

## 1. Executive Summary

Phase 5 completes the production-grade **Client Gallery**, the **"Find My Photos" AI Experience**, and the responsive UI/UX system for PixMatch AI. It enables event guests and clients to view collections with fast loading, search for their photos using facial recognition, favorite and select photos with anonymous 30-day session persistence, and download individual photos or bulk ZIP archives with full anti-IDOR security.

---

## 2. Architecture & Data Flow

```
Event Guest / Client Browser
       │
       ├── 1. Access Gallery (GET /api/v1/galleries/public/:slug)
       │      ├─ Direct link (PUBLIC / UNLISTED)
       │      ├─ Password verification (POST /api/v1/galleries/public/:slug/verify-password)
       │      └─ Returns: Safe metadata, photos, 30-day anonymous session (gs_...)
       │
       ├── 2. "Find My Photos" AI Experience
       │      ├─ Privacy Notice (In-memory biometric guarantee)
       │      ├─ Live Camera with Oval Face Guide / Drag-and-Drop Upload
       │      ├─ Radar Scanning Animation (Multi-stage landmark extraction)
       │      ├─ Public API: POST /api/v1/ai/selfie/search-public
       │      │   └─ InsightFace 512-D vector extraction + pgvector Cosine similarity
       │      │   └─ Scoped strictly to WHERE gallery_id = $1
       │      │   └─ Biometric vectors NEVER returned to client browser
       │      └─ Categorized Results: "Best Matches" (>=70%) & "More Matches" (<70%)
       │
       ├── 3. Client Favorites & Selections (Anonymous Session Bound)
       │      ├─ POST /api/v1/galleries/public/:slug/favorites/toggle
       │      ├─ POST /api/v1/galleries/public/:slug/selections/toggle
       │      ├─ POST /api/v1/galleries/public/:slug/selections/batch
       │      └─ Floating sticky selection bar with bulk actions
       │
       └── 4. Download Engine
              ├─ Single photo download (GET /api/v1/galleries/public/:slug/photos/:id/download)
              ├─ Bulk ZIP download (POST /api/v1/galleries/public/:slug/download/bulk)
              └─ Strict permission checks (downloads_enabled, download_originals, bulk_download)
```

---

## 3. Key Components & Implementation

### A. Database Schema (`packages/database/prisma/schema.prisma`)
- **`GalleryAccessType`**: Added `UNLISTED` enum value.
- **`Gallery` Model Extensions**:
  - `is_unlisted`: Boolean flag for search unindexing.
  - `expires_at`: Expiration timestamp with automated access restriction.
  - `downloads_enabled`, `download_originals_enabled`, `bulk_download_enabled`: Granular download permissions.
  - `watermark_mode`: `NONE`, `THUMBNAIL_ONLY`, `ALL`.
- **`GalleryClientSession`**: Anonymous 30-day session model with SHA-256 hashed token lookup.
- **`GalleryFavorite` & `GallerySelection`**: Unique composite keys `[session_id, photo_id]` ensuring idempotent client interactions.
- **`ClientDownloadJob`**: Asynchronous ZIP job tracker.

### B. Backend API (`apps/api/src/modules/galleries/client-gallery.controller.ts`)
- `resolveSession()`: Auto-generates or verifies anonymous `gs_...` token with 30-day expiry.
- `getPublicGallery()`: Safe projection preventing leakage of studio secrets, storage paths, or non-public fields.
- `listPublicPhotos()`: Cursor-based pagination with `limit` capped at 100 and real-time decoration (`is_favorited`, `is_selected`).
- `verifyPassword()`: Timing-safe bcrypt hash verification for password-protected galleries.
- `toggleFavorite()`, `listFavorites()`: Idempotent favorite management.
- `toggleSelection()`, `batchSelect()`: Bulk selection and selection management.
- `downloadSinglePhoto()`, `requestBulkDownload()`: Enforces gallery download policies and validates photo IDs against gallery boundaries (Anti-IDOR).

### C. Client Gallery Web Components (`apps/web/src/components/client-gallery/`)
- **`GalleryHeader`**: Hero imagery, studio branding, event title, metadata pills, and primary CTAs.
- **`GalleryToolbar`**: Filter tabs (All, Favorites, Selected, My Photos), density toggles (Compact, Comfortable, Large).
- **`GalleryPhotoCard`**: Responsive WebP thumbnail, match confidence badge, instant heart/select toggles, and hover overlay.
- **`GalleryGrid`**: Multi-column responsive layout with `IntersectionObserver` infinite scrolling.
- **`GalleryLightbox`**: Fullscreen modal with keyboard shortcuts (`Escape`, `ArrowLeft`, `ArrowRight`, `F`, `S`), pinch/zoom, touch swipe, and EXIF drawer.
- **`SelectionBar`**: Sticky floating bar with select count, Favorite All, and Download Selected.
- **`FindMyPhotosDialog`**: Complete AI selfie search modal:
  - Step 1: Biometric Privacy Disclosure
  - Step 2: Live WebRTC Camera with Oval Guide & Camera Flip, or Photo Upload Fallback
  - Step 3: Multi-stage radar scanning progress animation
  - Step 4: Grouped Best Matches & More Matches with bulk actions
- **Access Screens**: `PasswordScreen`, `ExpiredScreen`, `PrivateScreen`.
- **`ShareDialog`**: Direct link copying, QR code generation, and Web Share API integration.

### D. Photographer Studio Settings (`apps/web/src/app/dashboard/galleries/[id]/page.tsx`)
- Full configuration of Access Model (`PUBLIC`, `UNLISTED`, `PASSWORD`, `PRIVATE`).
- Password PIN setting.
- Viewing Expiration Date picker.
- Watermark Mode selector.
- AI Face Search toggle with interactive Sensitivity slider (`0.35` - `0.85`).
- Client Download Rules toggles.

---

## 4. Verification & Testing

The Phase 5 test suite (`tests/phase5-client-gallery.test.ts`) verifies:
1. **Access Matrix**: Correct access handling for Public, Unlisted, Password, and Private galleries.
2. **Session Security**: Format validation, SHA-256 hashing, and 30-day TTL math.
3. **Favorites & Selections**: Toggle idempotency and batch operations.
4. **Photo Decoration**: Cursor pagination limits and boolean state decoration.
5. **Download Security**: Granular permission checks and anti-IDOR ID filtering.
6. **Biometric Privacy**: In-memory buffer validation, gallery search scoping, and zero vector leakage.
7. **Sensitivity & Grouping**: Correct tiering into Best Matches and More Matches.
8. **Responsive Breakpoints**: Layout adaptability across mobile, tablet, and desktop viewports.

**Test Results Across All Phases:**
- Phase 2 Pipeline Tests: 18 Passed
- Phase 2 Hardening Tests: 24 Passed
- Phase 3 AI Tests: 12 Passed
- Phase 3 Hardening Tests: 16 Passed
- Phase 4A Storage Tests: 22 Passed
- Phase 4A.1 Storage Hardening Tests: 42 Passed
- Phase 4B Storage Tests: 42 Passed
- Phase 5 Client Gallery Tests: 36 Passed
- **Total: 212/212 passing automated tests**
- **Turbo Build: 9/9 workspaces compiling cleanly**
