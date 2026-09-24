# Phase 32: Studio Team Collaboration & Internal Operations 2.0

## 1. Executive Summary & Architecture Overview

Phase 32 introduces the comprehensive **Studio Team Collaboration & Internal Operations 2.0** layer into the PixMatch AI monorepo. It connects existing entities across Projects, Tasks, Shoots, Clients, Galleries, Proofing, Equipment, Production, Orders, Deliveries, and Team Members into an internal collaborative workspace.

### Core Architectural Principles
1. **Strict Internal Boundary & Perimeter Defense:** All collaboration threads, internal messages, mentions, handoffs, blockers, help requests, and attachments are strictly isolated within the studio tenant. Client Portal, public gallery endpoints, and external guest APIs have **ZERO** visibility into internal collaboration records.
2. **Zero Media Processing / Generation Footprint:** Strict adherence to business operations boundaries—zero video, photo editing, image generation, or AI retouching is introduced in this phase.
3. **Zero Model Duplication:** Direct reuse and referencing of existing core models (`User`, `StudioMembership`, `Studio`, `OperationTask`, `OperationProject`, `ShootSession`, `EquipmentItem`, and `Client`).
4. **Resilient Communication State Machines:** Idempotent message acknowledgements, atomic work handoffs (`REQUESTED` -> `ACCEPTED` / `DECLINED` / `CANCELLED`), work blockers with severity ranking (`LOW`, `MEDIUM`, `HIGH`, `CRITICAL`), category-routed help requests, dynamic unread counters, and instant Team Attention Center prioritization.

---

## 2. Database Schema & Models

The following PostgreSQL tables and enums are integrated via Prisma (`packages/database/prisma/schema.prisma`):

### Enums
- `CollaborationThreadType`: `GENERAL`, `PROJECT`, `TASK`, `CLIENT`, `GALLERY`, `SHOOT`, `EQUIPMENT`, `PRODUCTION`, `PROOFING`, `ORDER`, `DELIVERY`, `HANDOFF`, `BLOCKER`, `HELP_REQUEST`, `SYSTEM`
- `CollaborationThreadStatus`: `OPEN`, `RESOLVED`, `ARCHIVED`
- `CollaborationMessageType`: `STANDARD`, `INTERNAL_NOTE`, `HANDOFF_UPDATE`, `BLOCKER_UPDATE`, `HELP_REQUEST_UPDATE`, `SYSTEM_EVENT`
- `WorkHandoffStatus`: `REQUESTED`, `ACCEPTED`, `DECLINED`, `CANCELLED`
- `WorkBlockerSeverity`: `LOW`, `MEDIUM`, `HIGH`, `CRITICAL`
- `WorkBlockerStatus`: `OPEN`, `IN_PROGRESS`, `RESOLVED`, `DISMISSED`
- `HelpRequestCategory`: `TECHNICAL`, `GEAR_EQUIPMENT`, `CLIENT_HANDLING`, `EDITING_CULLING`, `LOGISTICS`, `EMERGENCY`
- `HelpRequestPriority`: `LOW`, `NORMAL`, `HIGH`, `URGENT`
- `HelpRequestStatus`: `OPEN`, `ASSIGNED`, `RESOLVED`, `CANCELLED`

### Models
- `TeamCollaborationThread`: Multi-entity anchor with status, type, and foreign key relations to Studio, Project, Task, Client, Gallery, and Production.
- `TeamCollaborationMessage`: Rich threaded messages with soft-delete (`deleted_at`), parent reply chaining (`parent_message_id`), and markdown content.
- `TeamMessageMention`: Structured `@member` mentions with read state (`is_read`, `read_at`).
- `TeamWorkHandoff`: Work delegation record with multi-tenant integrity, state transitions, and audit notes.
- `TeamWorkBlocker`: Incident & blocker tracking with severity, impact notes, and resolution metadata.
- `TeamHelpRequest`: Categorized assistance dispatch with responder assignment and urgency flags.
- `TeamCollaborationAcknowledgement`: Idempotent per-member acknowledgement toggle.
- `TeamThreadReadState`: Per-member watermark (`last_read_at`) for sub-millisecond unread counts.
- `TeamCollaborationAttachment`: Attachment tracking with mime whitelist and 25MB boundary limits.

---

## 3. Backend Service & API Specification

### Endpoints (`/api/team/collaboration` & `/api/v1/team/collaboration`)
- `POST /threads`: Create collaboration thread (linked to project, task, client, etc.)
- `GET /threads`: List collaboration threads with filters and unread counts
- `GET /threads/:threadId`: Retrieve full thread details with author and read state
- `PATCH /threads/:threadId`: Update thread status (`OPEN`, `RESOLVED`, `ARCHIVED`)
- `POST /threads/:threadId/messages`: Send threaded message with `@mention` parsing and attachment validation
- `GET /threads/:threadId/messages`: List messages in chronological order with pagination
- `DELETE /threads/:threadId/messages/:messageId`: Soft-delete message (author / admin only)
- `POST /threads/:threadId/read`: Mark thread as read and update member read state
- `POST /mentions/:mentionId/read`: Mark member mention as read
- `POST /acknowledge`: Idempotently toggle acknowledgement on message / handoff / blocker / help request
- `POST /handoffs`: Create work handoff request
- `GET /handoffs`: List work handoffs with status filter
- `PATCH /handoffs/:handoffId/accept`: Accept work handoff
- `PATCH /handoffs/:handoffId/decline`: Decline work handoff with reason
- `PATCH /handoffs/:handoffId/cancel`: Cancel work handoff
- `POST /blockers`: Report work blocker
- `GET /blockers`: List open/resolved work blockers
- `PATCH /blockers/:blockerId/resolve`: Resolve blocker with notes
- `POST /help-requests`: Request assistance with category and priority
- `GET /help-requests`: List help requests
- `PATCH /help-requests/:requestId/assign`: Assign responder to help request
- `PATCH /help-requests/:requestId/resolve`: Resolve help request
- `GET /attention`: Get aggregated Team Attention Center items (Critical, High, Normal)
- `GET /search`: Multi-attribute search across threads and messages
- `GET /activity`: Internal studio collaboration activity feed
- `GET /summary`: Aggregated collaboration statistics for Copilot and executive dashboard

---

## 4. Copilot Collaboration Tools

The following 10 Copilot tools are registered in `apps/api/src/modules/copilot/copilot-tool-registry.ts`:

1. `get_my_team_attention`: Retrieve prioritized items requiring employee attention.
2. `get_team_collaboration_summary`: Studio-wide collaboration metrics (threads, blockers, handoffs).
3. `get_thread_summary`: Summarize conversation in a collaboration thread.
4. `get_unread_team_mentions`: Retrieve unread `@mentions` for the authenticated member.
5. `get_open_team_blockers`: Query unresolved work blockers by severity.
6. `get_pending_handoffs`: Query pending work handoffs awaiting acceptance.
7. `get_open_help_requests`: Query active help requests by category and priority.
8. `get_project_collaboration_activity`: Retrieve collaboration timeline for a specific project.
9. `get_member_collaboration_activity`: Retrieve collaboration footprint for a team member.
10. `search_team_collaboration`: Search threads and internal messages across the studio.

---

## 5. Security & Isolation Matrix

| Threat Vector | Defense Mechanism | Verified In Test Suite |
| :--- | :--- | :--- |
| **Cross-Tenant Access (IDOR)** | Strict studio membership validation on every route; cross-studio lookups return 403/404 | Module 24 |
| **XSS Injection** | `<script>` and `<iframe>` stripped; `javascript:`, `data:`, and `vbscript:` schemes neutralized | Module 6 |
| **Formula / CSV Injection** | Leading `=`, `+`, `-`, `@`, `\t`, `\r` escaped with single quote | Module 7 |
| **Attachment Path Traversal** | Filenames checked for `..`, `/`, `\`; size strictly limited to 25MB | Module 18 |
| **Client Privacy Leaks** | ZERO internal collaboration models exposed to Client Portal, Galleries, or Public APIs | Module 25 |
| **Mention Spoofing** | Mentions validated against active studio members only; cross-tenant and self mentions ignored | Module 8 |
| **Data Immutability** | Messages soft-deleted (`deleted_at`); activity log records preserved permanently | Module 5 & 22 |

---

## 6. Verification & Test Results

- **Phase 32 Master Test Suite (`tests/phase32-team-collaboration.test.ts`):** 450/450 tests passed (100%).
- **Phase 31 Team & Workforce Suite (`tests/phase31-team-workforce.test.ts`):** 523/523 tests passed (100%).
- **Phase 30.1 Client Experience Hardening Suite (`tests/phase30.1-client-experience-hardening.test.ts`):** 348/348 tests passed (100%).
- **Phase 30 Client Experience Suite (`tests/phase30-client-experience.test.ts`):** 331/331 tests passed (100%).
- **Phase 29 CRM Suite (`tests/phase29-crm.test.ts`):** 338/338 tests passed (100%).
- **Phase 28 Client Communication Suite (`tests/phase28-client-communication.test.ts`):** 291/291 tests passed (100%).
- **Total Test Suite Assertions Verified:** > 2,280 passing assertions with 0 failures.
