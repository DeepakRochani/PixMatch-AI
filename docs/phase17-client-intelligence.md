# Phase 17: AI Client Engagement, Retention & CRM Intelligence

## 1. Executive Summary

Phase 17 introduces **AI Client Engagement, Retention & CRM Intelligence** to PixMatch AI. This system equips photography studios with factual, data-grounded visibility into client engagement, automated lifecycle tracking, proactive follow-up triggers, review-gated communications, and seamless integration into the AI Photographer Copilot.

---

## 2. Core Architecture & Architectural Principles

```
+-------------------------------------------------------------------------------+
|                            STUDIO TENANT BOUNDARY                             |
|                                                                               |
|  +--------------------+     +---------------------+     +------------------+  |
|  | Client Engagement  |     | Client Journey      |     | Client Follow-Up |  |
|  | Scoring Engine     |     | State Machine       |     | Recommendation   |  |
|  | (0-100 & Decay)    |     | (10 Stages)         |     | Engine (Rules)   |  |
|  +---------+----------+     +----------+----------+     +--------+---------+  |
|            |                           |                         |            |
|            +-------------------+-------+                         |            |
|                                |                                 |            |
|                                v                                 v            |
|                     +---------------------+           +--------------------+  |
|                     |   Client 360        |           | Communication      |  |
|                     |   Aggregator        |           | Center & Drafts    |  |
|                     +----------+----------+           | (Zero Auto-Send)   |  |
|                                |                      +----------+---------+  |
|                                |                                 |            |
|                                v                                 v            |
|                     +---------------------+           +--------------------+  |
|                     | AI Photographer     |           | Email Delivery &   |  |
|                     | Copilot Context &   |           | Audit Trail Log    |  |
|                     | Grounded Tool Calls |           +--------------------+  |
|                     +---------------------+                                   |
+-------------------------------------------------------------------------------+
```

### Key Architectural Tenets:
1. **Deterministic Scoring**: 0–100 product-activity engagement score calculated from verifiable client actions (gallery visits, curation favorites/selections, downloads, orders) combined with time-decay recency multipliers. Zero hallucinated or random scores.
2. **10-Stage Factual State Machine**: Rigorous, monotonic progression across 10 client lifecycle states (`NEW_CLIENT` → `GALLERY_DELIVERED` → `VIEWING` → `CURATING` → `SELECTING` → `SELECTION_COMPLETED` → `DOWNLOADING` → `PURCHASED` → `COMPLETED` → `RETURN_CLIENT`).
3. **Studio-Scoped Repeat Client Detection**: Zero cross-studio data leakage. Identity resolution strictly relies on deterministic email / client identifiers within the studio boundary. Zero biometric or face comparisons used in CRM intelligence.
4. **Follow-Up Recommendation Engine**: Rules-based detection of stalled selections, unviewed galleries, incomplete downloads, and re-engagement opportunities with automated expiration once resolved.
5. **Strict Review-Gated Communications (Zero Auto-Send)**: Communication drafts always start in `NEEDS_REVIEW` or `DRAFT`. Sending requires explicit human photographer authorization via `approveAndSend()`.
6. **Copilot Grounding & Anti-Injection**: All client intelligence tools enforce tenant isolation, structured JSON outputs, and strip prompt injection attempts.

---

## 3. Database Schema (`packages/database/prisma/schema.prisma`)

### Models:
- **`ClientEngagementProfile`**: Stores calculated composite scores (`engagement_score`, `activity_score`, `recency_score`, `breadth_score`, `monetary_score`), component metrics (views, favorites, selections, downloads, spend), and classified state (`NEW`, `ACTIVE`, `ENGAGED`, `LOW_ENGAGEMENT`, `AT_RISK`, `INACTIVE`, `COMPLETED`).
- **`ClientJourneyState`**: Tracks the client's current stage, entry timestamps, milestone first-seen dates, and complete transition history.
- **`ClientInsight`**: Stores automated AI/heuristic insights with severity (`INFO`, `LOW`, `MEDIUM`, `HIGH`), resolution status, and factual evidence dictionaries.
- **`ClientFollowUpRecommendation`**: Tracks open follow-up actions with priority (`LOW`, `MEDIUM`, `HIGH`, `URGENT`), suggested subject/body templates, and lifecycle status (`OPEN`, `PENDING`, `DISMISSED`, `APPROVED`, `SENT`, `EXPIRED`).
- **`ClientCommunicationDraft`**: Stores subject, body, recipient, channel (`EMAIL`), and approval metadata (`created_by`, `approved_at`, `sent_at`, `status`).

---

## 4. API Endpoints (`/api/v1/client-intelligence`)

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/overview` | Studio overview KPI cards, engagement distribution, recent transitions, and top follow-ups |
| `GET` | `/clients/:clientId/360` | Full Client 360 profile with multi-gallery stats, timeline, insights, and journey |
| `POST` | `/clients/:clientId/recalculate` | Trigger on-demand engagement score and journey recalculation for a client |
| `POST` | `/recalculate-studio` | Enqueue background job to recalculate all client profiles for the studio |
| `GET` | `/followups` | List follow-up recommendations with status, priority, and type filters |
| `POST` | `/followups/scan` | Trigger follow-up recommendation scan across all studio clients |
| `POST` | `/followups/:id/dismiss` | Dismiss a follow-up recommendation with a documented reason |
| `GET` | `/communications/drafts` | List communication drafts filtered by status, client, or gallery |
| `POST` | `/communications/drafts` | Create a new communication draft (initialized to `NEEDS_REVIEW`) |
| `PUT` | `/communications/drafts/:id` | Update draft subject, body, or recipient |
| `POST` | `/communications/drafts/:id/approve` | Human photographer approval and immediate dispatch |
| `DELETE` | `/communications/drafts/:id` | Cancel/delete draft |
| `GET` | `/admin/telemetry` | Platform-wide client intelligence statistics (Super Admin only) |

---

## 5. BullMQ Background Workers (`apps/worker/src/processors/`)

1. **`client-engagement-refresh.processor.ts`**:
   - Queue: `client-engagement-refresh`
   - Handles periodic and event-triggered recalculation of engagement scores and lifecycle stage transitions per studio or client.
2. **`client-followup-scan.processor.ts`**:
   - Queue: `client-followup-scan`
   - Executes rules-based scans for dormant galleries, stalled selections, pending downloads, and automatically expires resolved follow-ups.

---

## 6. Frontend Dashboard Experience (`apps/web/src/app/dashboard/clients/`)

1. **Client Intelligence Dashboard (`/dashboard/clients/intelligence`)**:
   - Top-level overview cards: Total studio clients, average engagement score, pending follow-ups, and communication drafts.
   - Interactive engagement distribution bar chart and live journey progression feed.
   - Actionable follow-up recommendation feed with 1-click modal draft generator and dismiss actions.
2. **Client 360 View (`/dashboard/clients/[clientId]`)**:
   - Comprehensive client profile with lifetime value, repeat status badge, engagement score radar, and lifecycle progression stepper.
   - Multi-gallery engagement cards with per-gallery completion percentage, selection status, and download status.
   - Unified chronological activity timeline combining gallery views, favorites, selections, downloads, and communications.
3. **Communication Center (`/dashboard/clients/communications`)**:
   - Drafts workbench for reviewing, editing, approving, and dispatching client messages.
   - Preview pane with sanitization, suppression status indicator, and explicit approval confirmation modal.
4. **Super Admin Telemetry (`/dashboard/admin/clients/intelligence`)**:
   - Global multi-tenant distribution metrics, platform-wide engagement benchmarks, and top active studio rankings.

---

## 7. Verification & Quality Assurance

- **Unit & Integration Tests**: `tests/phase17-client-intelligence.test.ts` (72/72 tests passing, 100%).
- **Full Monorepo Regression**: All phases (Phases 2 through 17) passing 100%.
- **Build Verification**: `npm run build` cleanly compiles all 9 monorepo workspaces (`@pixmatch/types`, `@pixmatch/database`, `@pixmatch/api`, `@pixmatch/worker`, `@pixmatch/web`).
