# PIXMatch AI — Phase 10: Super Admin Control Center Walkthrough

## 1. Overview

This walkthrough outlines the capabilities, navigation, and workflows of the **PIXMatch AI Super Admin Control Center**.

The Super Admin Control Center is accessible at `/dashboard/admin` for authenticated users with the `SUPER_ADMIN` role. Single-tenant photographers, studio admins, and clients are automatically restricted from these views and redirected or presented with a 403 Forbidden barrier.

---

## 2. Navigation Architecture

The Super Admin interface includes a dedicated collapsible **Admin Sidebar** and an **Admin Header** with universal search:

- **Overview**: High-level platform health, KPI counters, and operational alerts.
- **Tenancy**:
  - `Studios`: Searchable list of all registered studios, owner information, and suspension controls.
  - `Users`: Global directory of all platform users across roles with suspension actions.
- **Billing & Growth**:
  - `Subscriptions`: Subscription statuses, renewal dates, and payment gateway bindings.
  - `Plans`: Customizable pricing tier configuration (create, edit, archive).
  - `Revenue`: MRR, ARR, plan distributions, and payment health trends.
- **Operations & Systems**:
  - `Usage & Quotas`: Platform storage consumption, photo counts, and threshold alerts (80%/90%/100%).
  - `AI Operations`: Face indexing throughput, search latency percentiles, and engine metadata.
  - `Storage Providers`: Distribution across AWS S3, Cloudflare R2, Google Drive, and Local disk.
  - `Background Jobs`: BullMQ job execution tracking with idempotent retry capability.
  - `System Health`: Server uptime, RAM/CPU allocation, database ping, and environment status.
- **Governance**:
  - `Audit Logs`: Tamper-proof, append-only chronological log of all administrative actions.
  - `Global Header Search`: Real-time cross-entity search for studios, users, subscriptions, and galleries.

---

## 3. Key Workflows & Operational Walkthrough

### Workflow 1: Global Platform Monitoring
1. Navigate to `/dashboard/admin`.
2. Inspect the **12 KPI Cards** (Total Studios, Total Photos, AI Indexed Photos, Storage Used, MRR, ARR, Active Subscriptions, etc.).
3. Review **Operational Alerts** for storage quota breaches or payment anomalies.
4. Access quick-action links to deep-dive into high-priority platform events.

### Workflow 2: Multi-Tenant Studio Management & Suspension
1. Navigate to `/dashboard/admin/studios`.
2. Use the search input or filter by **Status** (`ACTIVE`, `SUSPENDED`) or **Plan** (`FREE`, `STARTER`, `PRO`, `ENTERPRISE`).
3. Click on a studio row to open `/dashboard/admin/studios/[id]`.
4. Inspect the studio's team members, galleries, photo count, and storage consumption.
5. Click **Recalculate Usage** to force a server-side aggregation from primary photo tables.
6. Click **Suspend Studio** to flag the tenant as suspended without deleting customer photos, galleries, or billing records.
7. Click **Reactivate Studio** to instantly restore full access.

### Workflow 3: Customizable Plan Creation & Archival
1. Navigate to `/dashboard/admin/plans`.
2. View existing active plans (`Free`, `Starter`, `Pro`, `Enterprise`).
3. Click **Create Custom Plan** to launch the plan editor modal.
4. Specify INR and USD pricing, storage quota in GB, active gallery limits, photo quotas, and feature flags (`ai_search`, `whitelabel`, `custom_domain`).
5. Click **Save Plan**. The plan becomes instantly available for new studio subscriptions.
6. To deprecate a tier, click **Archive Plan**. The tier is marked archived (`is_archived: true`) but retained indefinitely for historical billing integrity.

### Workflow 4: Background Job Triage & Idempotent Retries
1. Navigate to `/dashboard/admin/jobs`.
2. Filter by status (`COMPLETED`, `FAILED`, `PROCESSING`, `PENDING`) or job type (`IMAGE_PROCESSING`, `AI_FACE_INDEXING`, `EMAIL_DELIVERY`).
3. For any job in the `FAILED` state, review the failure message and duration.
4. Click **Retry Job** to re-queue the task into BullMQ. The retry action is logged in the Audit Trail.

### Workflow 5: Tamper-Proof Audit Trail Verification
1. Navigate to `/dashboard/admin/audit`.
2. Review the chronological stream of admin actions (`STUDIO_SUSPENDED`, `PLAN_CREATED`, `JOB_RETRIED`, etc.).
3. Click **View Metadata** on any entry to inspect the full structured payload.
4. Note that deletion, editing, or truncation of audit records is strictly blocked by design.

---

## 4. Verification Summary

- **Phase 10 Test Suite**: `npm run test:phase10` (34/34 passing).
- **Comprehensive Project Tests**: `npm test` (684+ tests passing across all 16 suites).
- **Monorepo Build**: `turbo run build` (9/9 workspaces compiled with 0 errors).
