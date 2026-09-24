# Phase 7 — Client CRM & Professional Gallery Delivery

## 1. Overview & Architecture

PixMatch AI Phase 7 introduces a photographer-facing Client CRM and professional Gallery Delivery system. This connects photographers and studios with their clients, events, galleries, deliveries, and engagement analytics (favorites, selections, downloads, and Find My Photos activity).

### High-Level Workflow:
```
Photographer / Studio
       │
       ▼
   Client CRM (Directory, Profile, Notes, Tags)
       │
       ▼
 Client ↔ Gallery Assignment (Many-to-Many, Studio-Scoped)
       │
       ▼
 Gallery Delivery (Email Abstraction, Custom Message, Idempotency Defense)
       │
       ▼
 Client Engagement (/gallery/[slug] Public Gallery - Anonymous Client Session)
       │
       ▼
 Client Activity Stream (Timeline, Favorites, Selections, Downloads, Find My Photos)
```

---

## 2. Database Schema & Models

The Prisma schema (`packages/database/prisma/schema.prisma`) introduces the following models and enums:

### Enums
- `ClientStatus`: `ACTIVE`, `INACTIVE`, `ARCHIVED`
- `DeliveryStatus`: `NOT_SENT`, `QUEUED`, `SENT`, `OPENED`, `ACTIVE`, `FAILED`, `EXPIRED`, `COMPLETED`

### Models
1. **`Client`**:
   - `id`: UUID (Primary Key)
   - `studio_id`: Relation to `Studio` (Enforces tenant isolation)
   - `first_name`, `last_name`, `email`, `phone`, `company`
   - `notes`: String (Internal photographer notes, never exposed publicly)
   - `tags`: String array (e.g. `["Wedding", "VIP", "Portrait"]`)
   - `status`: `ClientStatus` default `ACTIVE`
   - `deleted_at`: DateTime (Soft delete support)
   - Indexes: `[studio_id, deleted_at]`, `[studio_id, email]`, `[studio_id, status]`

2. **`ClientGallery`**:
   - Many-to-many join model between `Client` and `Gallery`
   - `relationship_type`: Default `"PRIMARY_CLIENT"` (supports `"SPOUSE"`, `"PLANNER"`, `"GUEST"`)
   - Compound unique constraint: `@@unique([client_id, gallery_id])`
   - Indexes: `[client_id]`, `[gallery_id]`

3. **`GalleryDelivery`**:
   - Tracks delivery dispatches and email history
   - `gallery_id`, `client_id`, `recipient_email`, `message`, `status`
   - `idempotency_key`: Unique string for duplicate-send prevention
   - `error_message`, `sent_at`, `opened_at`
   - Indexes: `[gallery_id]`, `[client_id]`, `[idempotency_key]`

4. **`ClientActivity`**:
   - Chronological event timeline
   - `client_id`, `studio_id`, `gallery_id`, `activity_type`, `description`, `metadata`
   - Indexed on `[client_id, created_at]` and `[studio_id, created_at]`

---

## 3. Email Abstraction

An extensible email abstraction is implemented in `apps/api/src/services/email/`:
- `EmailProvider` interface: `send(options)` and `verify()`
- `ConsoleDevEmailProvider`: Safe development transport. Sanitizes output, masks recipient emails, and logs zero secrets/tokens.
- `MockFailingEmailProvider`: Used in automated test suites to verify error-handling and failure states.
- `EmailService`: Renders studio-branded responsive HTML templates using the studio's name, logo, custom greeting, and the public slug URL (`https://app.pixmatch.ai/gallery/[slug]`).

---

## 4. Security & Privacy Guarantees

1. **Strict Studio Isolation & Anti-IDOR:**
   - Every `/api/v1/clients` and `/api/v1/galleries/:id/delivery` endpoint verifies JWT session identity and studio tenancy.
   - Cross-studio access returns `403/404`. Studio A cannot view, edit, assign, or deliver Studio B clients or galleries.
2. **Private Notes & Public/Private Separation:**
   - `Client.notes` are strictly scoped to authenticated photographer dashboard endpoints.
   - Public client gallery endpoints (`/api/public/galleries/:slug`) do not contain client IDs, internal database IDs, or internal notes.
3. **Biometric Privacy:**
   - Facial recognition embeddings and selfie images are strictly temporary/ephemeral and are never stored in the CRM or activity logs.
   - Photographer analytics only display high-level metrics ("Find My Photos used", matched count) with zero vector data.
4. **Email & Delivery Security:**
   - Outbound delivery emails only contain the public gallery slug URL.
   - Zero storage credentials, signed URLs, database IDs, or private passwords in email payloads.
   - Delivery requests enforce idempotency keys to avoid duplicate dispatches.

---

## 5. API Endpoints

### Clients API (`/api/v1/clients`)
- `GET /api/v1/clients`: Paginated client list with server-side search, status filters, gallery filters, and summary stats.
- `POST /api/v1/clients`: Create client with duplicate detection.
- `POST /api/v1/clients/check-duplicate`: Duplicate checker endpoint.
- `GET /api/v1/clients/:id`: Full client profile with aggregate analytics.
- `PATCH /api/v1/clients/:id`: Update client fields, notes, and tags.
- `DELETE /api/v1/clients/:id`: Soft delete client.
- `POST /api/v1/clients/:id/restore`: Restore soft-deleted client.
- `GET /api/v1/clients/:id/galleries`: List associated galleries.
- `GET /api/v1/clients/:id/activity`: Paginated client activity timeline.

### Gallery Delivery API (`/api/v1/galleries/:id/delivery`)
- `POST /api/v1/galleries/:id/assign-client`: Assign existing or new client to gallery.
- `DELETE /api/v1/galleries/:id/unassign-client/:clientId`: Unassign client from gallery.
- `POST /api/v1/galleries/:id/delivery/send`: Dispatch delivery email.
- `POST /api/v1/galleries/:id/delivery/reminder`: Dispatch reminder email.
- `GET /api/v1/galleries/:id/delivery`: Get delivery status and metrics.
- `GET /api/v1/galleries/:id/delivery/activity`: Get delivery activity log.

---

## 6. Frontend UI

1. **Client Directory (`/dashboard/clients`):**
   - KPI metrics cards: Total Clients, Active Clients, Clients With Galleries, Recent Activity.
   - Server-side search and status filter tabs (`All`, `Active`, `Has Galleries`, `No Galleries`, `Archived`).
   - Desktop data table and mobile-optimized card layout.
   - Modal dialogs for "Add Client" (with live duplicate alert) and "Send Gallery".
2. **Client Profile (`/dashboard/clients/[clientId]`):**
   - Client header with status badge and primary quick actions.
   - Analytics grid: Total Galleries, Delivered Photos, Favorites, Selections, Downloads.
   - Tabbed view: Assigned Galleries, Activity Timeline, Private Notes & Tags.
3. **Gallery Delivery Tab (`/dashboard/galleries/[id]` Tab 5):**
   - Delivery status indicator (`NOT_SENT`, `SENT`, `OPENED`, `ACTIVE`, `EXPIRED`).
   - Engagement counters (Views, Favorites, Selections, Downloads).
   - Assigned clients list with "Assign Client", "Send Delivery", and "Send Reminder" actions.
   - Gallery delivery activity history.

---

## 7. Testing & Verification

- **Automated Test Suite:** `tests/phase7-client-crm.test.ts` (41 tests) + all existing test suites.
- **Total Test Count:** **456 / 456 tests PASS (100%)**
- **Workspaces Build Status:** 9/9 workspaces build cleanly with zero errors.
- **Responsive Layout Verification:** Verified across mobile (390px), tablet (768px), and desktop (1440px) viewports with zero horizontal overflow.
