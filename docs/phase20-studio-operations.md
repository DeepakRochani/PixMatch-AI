# Phase 20: Studio Operations, Booking & Project Management

## Overview
Phase 20 equips **PixMatch AI** with an enterprise-grade, full-lifecycle Studio Operations, CRM, and Project Management engine. It bridges the gap between client acquisition, shoot execution, AI media processing, gallery delivery, and financial settlement, enabling professional photography studios to manage their end-to-end studio operations seamlessly.

---

## Complete Operational Lifecycle Workflow

```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│  1. LEAD /   │ ──> │ 2. PROPOSAL  │ ──> │  3. BOOKING  │ ──> │  4. PROJECT  │
│   INQUIRY    │     │ & FOLLOW-UP  │     │  & RETAINER  │     │   CREATION   │
└──────────────┘     └──────────────┘     └──────────────┘     └──────────────┘
                                                                       │
┌──────────────┐     ┌──────────────┐     ┌──────────────┐             │
│  8. CLIENT   │ <── │ 7. PROOFING  │ <── │ 6. AI CULL & │ <── 5. SHOOT DAY   │
│  SELECTION   │     │   GALLERY    │     │  PROCESSING  │     EXECUTION      │
└──────────────┘     └──────────────┘     └──────────────┘                    │
       │                                                                      ▼
┌──────────────┐     ┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│  9. INVOICE  │ ──> │ 10. DIGITAL  │ ──> │ 11. REVIEW & │ ──> │ 12. PROJECT  │
│  & PAYMENT   │     │   DELIVERY   │     │   REFERRAL   │     │  COMPLETION  │
└──────────────┘     └──────────────┘     └──────────────┘     └──────────────┘
```

1. **Lead & Inquiry Capture:** Inquiries arrive via website contact forms, referrals, or direct entry.
2. **Proposal & Follow-up:** Studio tracks contact attempts, sends proposals, and schedules follow-up dates.
3. **Booking & Retainer:** Client confirms package, signs agreement, and pays advance deposit.
4. **Lead-to-Project Conversion:** Duplicate-safe conversion marks lead as `WON`, creates/links `Client`, and spawns `StudioProject` with default milestones.
5. **Shoot Day Logistics:** Photographer tracks shoot time, location, equipment checklist, and tasks.
6. **AI Ingestion & Processing:** RAW/JPEG assets ingested into PixMatch AI pipeline for face grouping and smart albums.
7. **Proofing & Gallery Linking:** Studio links galleries (`PRIMARY`, `PROOFING`, `HIGHLIGHTS`) to the project.
8. **Client Selection:** Client favorites, selections, and feedback collected in real-time.
9. **Invoicing & Payments:** Live synchronization with Phase 18 `StudioBusinessTransaction` to track balances and payments.
10. **Digital Delivery:** High-res download delivery and email notifications dispatched to client.
11. **Client Review & Referral:** Automated follow-up requests for client testimonials and referrals.
12. **Project Completion:** Final milestones checked, transactions reconciled, and project archived.

---

## Core Architectural Principles & Hard Constraints

1. **Duplicate-Safe Lead Conversion:**
   - `LeadService.convertLead` checks existing client records by ID, case-insensitive email, and normalized phone number before creating a new client.
   - Lead transitions to `WON` status with an audit log entry (`LEAD_CONVERTED_TO_PROJECT`).

2. **Automated Workflow Milestones:**
   - Every new project automatically initializes 7 standard milestones:
     1. `Booking Confirmed` (Status: `COMPLETED`)
     2. `Advance Payment` (Status: `PENDING`)
     3. `Shoot Preparation` (Status: `PENDING`)
     4. `Shoot Completed` (Status: `PENDING`)
     5. `Photo Processing` (Status: `PENDING`)
     6. `Gallery Delivery` (Status: `PENDING`)
     7. `Final Payment` (Status: `PENDING`)
   - Milestones support sequence reordering with transaction safety.

3. **Multi-Source Operational Calendar:**
   - `CalendarService.getEvents` consolidates shoots (`SHOOT`), project deliveries (`DELIVERY`), task deadlines (`TASK`), and lead follow-up calls (`LEAD_FOLLOW_UP`) into a unified calendar dataset.

4. **Phase 18 Financial Synchronization:**
   - Project payments are computed directly from `StudioBusinessTransaction` records linked by `project_id` or `client_id`, dynamically determining `PAID`, `PARTIAL`, `OVERDUE`, or `PENDING` states.

5. **Private Photographer Notes & Isolation:**
   - `ProjectNote` provides internal private note management with pinning capability, completely isolated from client-facing galleries.

6. **Formula-Injection Safe Sanitization:**
   - All string inputs (names, descriptions, notes) are sanitized against script tags and formula injection (`=`, `+`, `-`, `@`, `\t`, `\r`) before database persistence.

---

## Data Models & Schema (`packages/database/prisma/schema.prisma`)

### Enums
- `StudioLeadStatus`: `NEW`, `CONTACTED`, `PROPOSAL_SENT`, `WON`, `LOST`, `ARCHIVED`
- `StudioLeadSource`: `WEBSITE`, `INSTAGRAM`, `FACEBOOK`, `REFERRAL`, `DIRECTORY`, `REPEAT_CLIENT`, `OTHER`
- `StudioProjectStatus`: `INQUIRY`, `BOOKED`, `PREPARATION`, `SHOOT_SCHEDULED`, `SHOOT_COMPLETED`, `PROCESSING`, `GALLERY_PREPARATION`, `DELIVERED`, `COMPLETED`, `CANCELLED`, `ON_HOLD`
- `StudioProjectType`: `WEDDING`, `PORTRAIT`, `EVENT`, `COMMERCIAL`, `FAMILY`, `NEWBORN`, `FASHION`, `PRODUCT`, `OTHER`
- `ProjectTaskStatus`: `TODO`, `IN_PROGRESS`, `COMPLETED`, `CANCELLED`
- `ProjectTaskPriority`: `LOW`, `MEDIUM`, `HIGH`, `URGENT`
- `ProjectMilestoneStatus`: `PENDING`, `IN_PROGRESS`, `COMPLETED`, `SKIPPED`

### Core Models
- `StudioLead`: Lead CRM model with contact info, inquiry date, follow-up dates, notes, and estimated value.
- `StudioProject`: Studio project container with shoot date, location, timeline status, and links to clients, leads, tasks, and galleries.
- `ProjectTask`: Task item with priority, assignee, due date, completion timestamp, and overdue calculation.
- `ProjectMilestone`: Workflow milestone with sequence order, target date, and completion status.
- `ProjectGalleryLink`: Association between projects and galleries with roles (`PRIMARY`, `HIGHLIGHTS`, `PROOFING`).
- `ProjectNote`: Private photographer notes with author attribution and pinning capability.

---

## Backend Services (`apps/api/src/modules/operations/`)

1. **`LeadService` (`lead.service.ts`):**
   - `listLeads(studioId, params)`: Filterable, paginated lead CRM list.
   - `getLead(studioId, leadId)`: Lead details with linked client and projects.
   - `createLead(studioId, dto)`: New lead creation with sanitization.
   - `updateLead(studioId, leadId, dto)`: Lead updates and status transitions.
   - `convertLead(studioId, leadId, dto, userId)`: Duplicate-safe lead to project conversion.
   - `deleteLead(studioId, leadId)`: Soft-deletion of lead.

2. **`ProjectService` (`project.service.ts`):**
   - `listProjects(studioId, params)`: Project list with status, type, and date filters.
   - `getProject(studioId, projectId)`: Complete project detail with tasks, milestones, notes, and galleries.
   - `createProject(studioId, dto, userId)`: Project creation with default milestone generator.
   - `updateProject(studioId, projectId, dto, userId)`: Project detail updates with audit logging.
   - `updateStatus(studioId, projectId, status, userId)`: Stage progression updates.
   - `getTimeline(studioId, projectId)`: 9-stage progression model and recommended next action.
   - `linkGallery(studioId, projectId, galleryId, role)`: Associating galleries with projects.
   - `listGalleries(studioId, projectId)`: Linked gallery listings.
   - `unlinkGallery(studioId, projectId, galleryId)`: Gallery detachment.
   - `getPayments(studioId, projectId)`: Phase 18 payment balance aggregation.
   - `addNote(studioId, projectId, dto, userId)`: Internal private notes with pinning.
   - `listNotes(studioId, projectId)`: Private notes retrieval.
   - `deleteNote(studioId, noteId)`: Note deletion.
   - `deleteProject(studioId, projectId)`: Soft delete and status cancellation.

3. **`TaskService` (`task.service.ts`):**
   - `listTasks(studioId, params)`: Filter by priority, assignee, status, and overdue flag.
   - `getTask(studioId, taskId)`: Single task detail.
   - `createTask(studioId, dto, userId)`: Task creation linked to project or studio.
   - `updateTask(studioId, taskId, dto, userId)`: Task updates and completion timestamps.
   - `completeTask(studioId, taskId)`: Quick complete helper.
   - `deleteTask(studioId, taskId)`: Task removal.

4. **`MilestoneService` (`milestone.service.ts`):**
   - `listMilestones(projectId)`: Ordered milestone retrieval.
   - `createMilestone(studioId, dto)`: Custom milestone creation.
   - `updateMilestone(id, dto)`: Milestone update with completion dates.
   - `reorderMilestones(projectId, milestoneIdsInOrder)`: Transaction-safe reordering.
   - `deleteMilestone(id)`: Milestone removal.

5. **`CalendarService` (`calendar.service.ts`):**
   - `getEvents(studioId, query)`: Aggregated multi-source operational calendar events.

6. **`OperationsOverviewService` (`operations-overview.service.ts`):**
   - `getOverview(studioId)`: Executive KPI dashboard metrics (leads, projects, tasks, shoots, financials).

---

## REST API Endpoints (`apps/api/src/modules/operations/operations.controller.ts`)

| HTTP Method | Path | Description |
|---|---|---|
| `GET` | `/api/v1/operations/overview` | Studio Operations Executive Overview KPIs |
| `GET` | `/api/v1/operations/calendar` | Multi-Source Aggregated Operations Calendar |
| `GET` | `/api/v1/operations/leads` | List Studio Leads (Paginated & Filterable) |
| `POST` | `/api/v1/operations/leads` | Create New Studio Lead |
| `GET` | `/api/v1/operations/leads/:id` | Get Lead Details & History |
| `PATCH` | `/api/v1/operations/leads/:id` | Update Lead / Status / Follow-up |
| `POST` | `/api/v1/operations/leads/:id/convert` | Convert Lead to Client & Project |
| `DELETE` | `/api/v1/operations/leads/:id` | Soft Delete Lead |
| `GET` | `/api/v1/operations/projects` | List Studio Projects (Paginated & Filterable) |
| `POST` | `/api/v1/operations/projects` | Create Studio Project Directly |
| `GET` | `/api/v1/operations/projects/:id` | Get Full Project Detail |
| `PATCH` | `/api/v1/operations/projects/:id` | Update Project Details |
| `PATCH` | `/api/v1/operations/projects/:id/status` | Update Project Status & Stage |
| `GET` | `/api/v1/operations/projects/:id/timeline` | Get 9-Stage Timeline & Next Actions |
| `GET` | `/api/v1/operations/projects/:id/milestones` | List Project Milestones |
| `POST` | `/api/v1/operations/projects/:id/milestones` | Add Custom Milestone |
| `PUT` | `/api/v1/operations/projects/:id/milestones/reorder` | Reorder Milestones |
| `PATCH` | `/api/v1/operations/milestones/:id` | Update Milestone Status / Date |
| `DELETE` | `/api/v1/operations/milestones/:id` | Delete Milestone |
| `GET` | `/api/v1/operations/projects/:id/galleries` | List Linked Galleries |
| `POST` | `/api/v1/operations/projects/:id/galleries` | Link Gallery to Project |
| `DELETE` | `/api/v1/operations/projects/:id/galleries/:galleryId` | Unlink Gallery |
| `GET` | `/api/v1/operations/projects/:id/payments` | Get Phase 18 Payment Summary |
| `GET` | `/api/v1/operations/projects/:id/notes` | List Private Photographer Notes |
| `POST` | `/api/v1/operations/projects/:id/notes` | Add Private Note |
| `DELETE` | `/api/v1/operations/notes/:id` | Delete Private Note |
| `DELETE` | `/api/v1/operations/projects/:id` | Cancel & Soft Delete Project |
| `GET` | `/api/v1/operations/tasks` | List Studio Tasks |
| `POST` | `/api/v1/operations/tasks` | Create Studio Task |
| `GET` | `/api/v1/operations/tasks/:id` | Get Task Details |
| `PATCH` | `/api/v1/operations/tasks/:id` | Update Task |
| `POST` | `/api/v1/operations/tasks/:id/complete` | Mark Task Completed |
| `DELETE` | `/api/v1/operations/tasks/:id` | Delete Task |

---

## Copilot AI Operations Tool Catalog (`apps/api/src/modules/copilot/`)

Phase 20 registers 12 dedicated tools in `CopilotToolRegistry` allowing the PixMatch AI Assistant to inspect and manage operations:

1. `listStudioLeads`: Search and list leads by status, shoot type, and keywords.
2. `getStudioLead`: Retrieve complete lead profile and follow-up timeline.
3. `createStudioLead`: Add a new lead from natural language chat prompt.
4. `convertStudioLead`: Execute duplicate-safe lead-to-project conversion.
5. `listStudioProjects`: Search projects by status, date range, or client.
6. `getStudioProject`: Inspect full project state, tasks, and linked galleries.
7. `createStudioProject`: Create project with auto-generated default milestones.
8. `updateStudioProjectStatus`: Advance project stage across the 9-stage lifecycle.
9. `listStudioTasks`: Retrieve pending, overdue, or assigned tasks.
10. `createStudioTask`: Create and assign tasks with due dates and priorities.
11. `completeStudioTask`: Mark tasks completed with automated timestamping.
12. `getOperationsCalendar`: Retrieve aggregated operational events within a date range.

---

## Frontend Dashboard Interfaces (`apps/web/src/app/dashboard/operations/`)

1. **Operations Hub (`/dashboard/operations`):**
   - KPI metric cards (Active Leads, Active Projects, Upcoming Shoots, Pending/Overdue Tasks, Pipeline Value).
   - Quick navigation to Leads, Projects, Tasks, and Calendar.
   - Next 7/30 days shoot schedule breakdown and urgent task highlight board.

2. **Leads CRM Pipeline (`/dashboard/operations/leads`):**
   - Interactive pipeline view with status filtering (`NEW`, `CONTACTED`, `PROPOSAL_SENT`, `WON`, `LOST`).
   - Quick lead creation modal and one-click Convert to Project action.

3. **Project Management Board (`/dashboard/operations/projects`):**
   - Searchable, filterable project registry with status chips, shoot date badges, and client links.
   - Direct Project Creation wizard with type selection and location tracking.

4. **Project Detail & Shoot Logistics (`/dashboard/operations/projects/[id]`):**
   - 9-Stage visual timeline progress bar with recommended next action.
   - Interactive milestone checklist with drag-and-drop / sequence ordering.
   - Project task manager with priority flags and quick completion checkboxes.
   - Linked galleries grid showing photo counts, status, and direct gallery shortcuts.
   - Phase 18 payment balance summary with deposit breakdown.
   - Private photographer notes board with pinned notes.

5. **Task Manager (`/dashboard/operations/tasks`):**
   - Tabbed filtering (`All`, `Pending`, `High Priority`, `Overdue`, `Completed`).
   - Quick task creation and assignment dialog.

6. **Unified Operational Calendar (`/dashboard/operations/calendar`):**
   - Month/Week view aggregating Shoots, Tasks, Deliveries, and Lead Follow-ups.
   - Color-coded badges with direct shortcuts to project and lead records.

---

## Verification & Automated Test Suite

- **Monorepo Build:** 100% passing across all 8 packages and 2 apps (`0 errors`).
- **Test Runner:** `npx tsx tests/phase20-studio-operations.test.ts`
- **Result:** **63 passed, 0 failed (100% green)** across all 14 test groups:
  - `GROUP 1`: Studio Lead Lifecycle (Creation, Status Transitions, Follow-up Dates) — **PASS**
  - `GROUP 2`: Lead Search, Filtering & Overdue Detection — **PASS**
  - `GROUP 3`: Lead-to-Project Conversion & Client Linking — **PASS**
  - `GROUP 4`: Studio Project CRUD & Shoot Logistics — **PASS**
  - `GROUP 5`: Default Milestone Auto-Generation & Sequential Ordering — **PASS**
  - `GROUP 6`: Project Timeline Progress & Stage Recalculation — **PASS**
  - `GROUP 7`: Project Task Lifecycle (Creation, Priorities, Overdue Check) — **PASS**
  - `GROUP 8`: Milestone CRUD, Completion Timestamps & Reordering — **PASS**
  - `GROUP 9`: Gallery-Project Association (Roles: PRIMARY, HIGHLIGHTS, PROOFING) — **PASS**
  - `GROUP 10`: Private Project Notes Management & Isolation — **PASS**
  - `GROUP 11`: Project Payment Summaries from Business Transactions — **PASS**
  - `GROUP 12`: Studio Operations Overview Dashboard KPI Aggregation — **PASS**
  - `GROUP 13`: Multi-Source Operational Calendar Event Aggregation — **PASS**
  - `GROUP 14`: Copilot Operations Tools Registration & Intent Execution — **PASS**
