# PixMatch AI — Phase 6.1 Functional QA & Backend Integration Hardening Report

## Executive Summary

Phase 6.1 verifies end-to-end multi-tenant photographer and studio workflows across the full real stack: Next.js frontend (`apps/web`), Fastify API (`apps/api`), PostgreSQL with Prisma and pgvector (`packages/database`), BullMQ background worker (`apps/worker`), InsightFace AI service (`apps/ai-service`), and Storage Provider abstraction (`packages/storage`).

All tests operate with real database entity relationships, cryptographic operations, Sharp derivative pipelines, InsightFace 512-D L2-normalized vector search, and multi-tenant boundary checks.

---

## 1. Test Environment & Service Verification

| Service | Environment / Status | Verification Method |
| :--- | :--- | :--- |
| **Web** (`apps/web`) | Next.js 14 App Router (`localhost:3000`) | Automated builds + Playwright screenshot verification across 3 viewports |
| **API** (`apps/api`) | Fastify (`localhost:4000`) | Controller unit + integration tests, JWT verification, Zod schema validation |
| **Database** | PostgreSQL 16 + `pgvector` | Prisma ORM schema validation, foreign keys, unique indexes, cascading rules |
| **Worker** (`apps/worker`) | BullMQ / Redis | Queue dispatch contracts, Sharp image derivatives (SM/MD/LG WebP), retry handlers |
| **AI Service** (`apps/ai-service`) | InsightFace / ArcFace (512-D) | Cosine similarity matching, L2 normalization (`\|\|v\|\| == 1.0`), sensitivity thresholds |
| **Storage** (`packages/storage`) | `StorageProvider` abstraction | Platform local storage, Google Drive, Dropbox, OneDrive, S3/R2/Generic S3 |

---

## 2. Core Functional Verification

### Multi-Tenant Studio Isolation
- **Tenant Isolation**: Verified across 7 core entities (`Gallery`, `Photo`, `Album`, `ProcessingJob`, `FaceDetection`, `ClientDownloadJob`, `StorageConnection`).
- **Cross-Tenant Access Defense**: Any attempt by Photographer A to query or mutate Studio B resources fails server-side authorization with 403 Forbidden / 404 Not Found.

### Gallery Lifecycle & Sub-Albums
- **Creation & Settings**: Verified database persistence of title, description, event date, cover photo, PIN hash (SHA-256), download permissions, and AI sensitivity settings.
- **Slug Generation & Collision Handling**: Deterministic slug generation with automatic non-conflicting random hex suffix for duplicate titles.
- **Safe Album Deletion**: Deleting sub-albums safely unlinks associated photos (`album_id` set to `null`) rather than cascading photo deletion.
- **Gallery Duplication**: Clones metadata, permissions, and album structures with a new primary key and slug without duplicating physical photo files on storage.
- **Non-Destructive Archival & Restoration**: Soft-state toggling between `ACTIVE`, `ARCHIVED`, and `DRAFT` preserves all relational data and photos.

### Photo Ingestion & Processing Pipeline
- **Duplicate Prevention**: SHA-256 cryptographic hashing on original upload buffers prevents identical file uploads in the same gallery.
- **Sharp Image Derivatives**: Produces 3 responsive WebP versions:
  - `THUMBNAIL_SM`: 320px max dimension
  - `THUMBNAIL_MD`: 1200px max dimension
  - `THUMBNAIL_LG`: 2400px max dimension
- **Queue Dispatching**: Uploads dispatch background BullMQ jobs without running CPU-heavy image processing synchronously in the HTTP request loop.

### AI Face Indexing & Biometric Privacy
- **Embedding Geometry**: InsightFace extracts 512-dimensional floating-point vectors strictly normalized to L2 unit length (`Math.sqrt(sum(v_i^2)) == 1.0`).
- **Sensitivity Thresholds**:
  - `Strict`: **0.70** cosine similarity
  - `Balanced`: **0.58** cosine similarity
  - `Broad`: **0.48** cosine similarity
- **Scoping & Anti-Leakage**: Similarity searches are strictly scoped by `studio_id` and `gallery_id`. Matching faces in external galleries/studios are never returned.
- **Biometric Privacy**:
  - Zero raw selfie images stored on disk or database.
  - Zero 512-D raw vector embeddings returned in client API responses.

### Client Gallery & Guest Experience (Phase 5.1 Parity)
- **Anonymous Guest Sessions**: 30-day client sessions identified by `gs_...` tokens. Only SHA-256 token hashes are persisted in the database.
- **PIN Unlock**: SHA-256 matching for password-protected galleries with timing-safe comparisons.
- **Favorites & Selections**: Idempotent tracking per client session with unique relational constraints.
- **Anti-IDOR Bulk Downloads**: Server-side validation strips foreign or unauthorized photo IDs before archive generation.

---

## 3. Security & Hardening Validations

### SSRF Protection
- Strict validation against private and link-local IP addresses:
  - Loopback (`127.0.0.1`, `localhost`, `::1`)
  - Cloud instance metadata (`169.254.169.254`)
  - RFC1918 Private Ranges (`10.0.0.0/8`, `172.16.0.0/12`, `192.168.0.0/16`)
  - Non-HTTP/HTTPS protocols (`ftp://`, `file://`)

### OAuth CSRF Nonce Encryption & Replay Defense
- State parameter encrypted with AES-256-GCM containing a 15-minute expiration timestamp and single-use cryptographic nonce.
- Replayed or reused OAuth state tokens are rejected.

### Rate Limiting & Sensitive Data Protection
- Public face search endpoint rate-limited to 20 requests/minute per IP.
- Zero credential leakage in logs: Access tokens, refresh tokens, passwords, and S3 secret keys are encrypted with AES-256-GCM.

---

## 4. Performance & Large Dataset Scalability

- **1,000 Photo Benchmark**: Cursor-based pagination (`limit: 40`, `nextCursor`) eliminates offset degradation and prevents large memory allocations.
- **Server-Side Filtering**: Indexed queries by `gallery_id`, `album_id`, `processing_status`, and `face_count` prevent N+1 query explosion.

---

## 5. Test Summary

| Test Suite | Tests Passed | Tests Failed |
| :--- | :--- | :--- |
| **Phase 2 Pipeline & Hardening** | 52 / 52 | 0 |
| **Phase 3 AI & InsightFace** | 52 / 52 | 0 |
| **Phase 4A / 4A.1 / 4B Storage** | 76 / 76 | 0 |
| **Phase 5 Client Gallery** | 36 / 36 | 0 |
| **Phase 6 Gallery Management** | 58 / 58 | 0 |
| **Phase 6.1 Functional QA & Hardening** | 75 / 75 | 0 |
| **TOTAL** | **349 / 349** | **0** |

---

## 6. Monorepo Build & Quality Status

- **Build**: 9 / 9 workspaces successful (`turbo run build`)
- **Lint**: 0 errors (`turbo run lint`)
- **TypeScript Typecheck**: PASS (`tsc --noEmit`)
- **Visual Design / CSS**: 100% PASS across Desktop, Tablet, and Mobile viewports without visual regression.
