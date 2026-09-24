# PixMatch AI — Architecture Documentation (Phase 1)

## Overview
PixMatch AI is a multi-tenant SaaS application for photographers and photography studios. It provides automated event photo delivery, customizable client galleries, background image processing, and a scalable foundation for AI-based face recognition photo matching.

---

## 1. Monorepo Structure

```
pixmatch-ai/
├── apps/
│   ├── web/                     # Next.js 15 App Router Frontend
│   ├── api/                     # Node.js Fastify Modular REST API
│   ├── worker/                  # BullMQ Background Processing Workers
│   └── ai-service/              # Python FastAPI Service (Phase 2 Face Matching)
├── packages/
│   ├── database/                # Prisma Schema, Migrations, Seed & Client
│   ├── types/                   # Shared TypeScript Interfaces & Enums
│   ├── auth/                    # RBAC, JWT, Password Hashing & Tenant Isolation
│   ├── storage/                 # StorageProvider Abstraction & Platform/Cloud Adapters
│   ├── ui/                      # Shared Styling & Formatting Utilities
│   └── config/                  # Shared Environment & Constants
├── docker/                      # Docker Compose for PostgreSQL & Redis
└── docs/                        # Architecture & API Documentation
```

---

## 2. Multi-Tenant SaaS Isolation Model

Every photographer, photography team, or studio is modeled as an isolated **Studio** (Tenant).

```
User
  ↓ (StudioMembership: OWNER | ADMIN | PHOTOGRAPHER | ASSISTANT)
Studio (Tenant Boundary)
  ├── Galleries
  │     └── Photos
  ├── Clients
  ├── StorageConnections
  ├── ProcessingJobs
  ├── Subscription (Plan Quotas)
  └── AuditLogs
```

### Tenant Boundary Enforcement
1. **API Middleware**: `requireTenant` extracts `studioId` from JWT payload or `x-studio-id` header (for Super Admin cross-tenant inspection).
2. **Assertion Function**: `assertTenantAccess(user, resourceStudioId)` throws `TenantIsolationError` if a user attempts to cross tenant boundaries.
3. **Database Queries**: All data access queries enforce `where: { studio_id: studioId }`.

---

## 3. Storage Abstraction Layer

PixMatch AI separates business logic from physical storage providers through the `StorageProvider` interface in `@pixmatch/storage`:

- **PlatformStorageProvider**: High-speed local SSD disk storage with signed URL generation and direct fast file streaming.
- **CloudflareR2Provider**: Zero-egress S3-compatible cloud storage adapter (Phase 2).
- **S3Provider**: AWS S3 adapter (Phase 2).
- **GoogleDriveProvider**: Google Workspace Drive sync adapter (Phase 2).
- **DropboxProvider**: Dropbox Business API adapter (Phase 2).
- **OneDriveProvider**: Microsoft Graph OneDrive adapter (Phase 2).
- **ExternalUrlProvider**: External CDN URL reference resolver.

---

## 4. Background Processing Pipeline (BullMQ + Redis)

Background processing handles high-volume photographic uploads asynchronously:
- `image-upload`: Initial ingest & validation
- `thumbnail-generation`: Sharp-based WebP generation
- `metadata-extraction`: Camera, EXIF, and dimension extraction
- `ai-processing`: Bridge for InsightFace ArcFace embeddings
- `storage-sync`: Periodic cloud sync
- `gallery-cleanup`: Soft-deleted photo removal

---

## 5. Security & RBAC

| Role | Permissions |
| :--- | :--- |
| **SUPER_ADMIN** | Global platform control, cross-tenant inspection, system telemetry, subscription oversight. |
| **STUDIO_OWNER** | Full control over studio galleries, photos, storage connections, members, billing. |
| **STUDIO_MEMBER** | Upload photos, manage assigned galleries, view clients. |
| **CLIENT** | View public / password-protected galleries, download deliverables, mark favorites. |

---

## 6. Phase 2 Roadmap & Extension Points
- InsightFace (`Buffalo_L` model) face embedding extraction service (`apps/ai-service`).
- `pgvector` HNSW index similarity clustering for guest selfies.
- Live Stripe billing webhooks and subscription automated renewals.
- OAuth 2.0 connectors for Google Drive & Dropbox.
