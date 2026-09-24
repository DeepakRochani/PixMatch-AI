# Phase 31: Studio Team & Workforce Management

## Executive Summary
Phase 31 introduces the comprehensive, enterprise-grade **Studio Team & Workforce Management Layer** for PixMatch AI. It enables studios to manage staff, freelancers, and crew members across all production operations with role-based access control, departmental organization, skills inventory, real-time deterministic workload capacity modeling, cross-session schedule conflict detection, time-off/leave management, cross-system resource reassignment, aggregated internal team calendars, tamper-evident activity feeds, operational metrics, and formula-injection-safe CSV export.

### Strict Scope Boundaries
- **Zero Media Operations:** ZERO video processing, ZERO photo editing, ZERO image filtering, ZERO AI retouching, ZERO generative image creation.
- **Strictly Internal Studio Confidentiality:** Internal staff directory, workload scores, equipment assignments, leave dates, and activities are **strictly inaccessible** to public galleries and client portals.
- **Zero Entity Duplication:** Reuses existing `User`, `StudioMembership`, `Studio`, `OperationTask`, `OperationProject`, `ShootSession`, `EquipmentItem`, and `Client` models.

---

## 1. Architecture & Subsystems

```mermaid
graph TD
    Client[Studio Admin / Manager Browser] -->|Auth JWT + Studio Context| Guard[Role Permissions & Hierarchy Guard]
    Guard --> Endpoints[Phase 31 Team Endpoints]
    
    subgraph "Phase 31 Workforce Service Layer"
        Endpoints --> Directory[Team Directory & Member Profiles]
        Endpoints --> InviteEngine[Secure Invitation & Onboarding Engine]
        Endpoints --> WorkloadEngine[Deterministic Workload Engine]
        Endpoints --> ConflictEngine[Schedule Conflict & Overlap Detector]
        Endpoints --> LeaveManager[Member Leave & Time-Off System]
        Endpoints --> ReassignEngine[Atomic Cross-System Reassignment Engine]
        Endpoints --> CalendarAggregator[Aggregated Team Calendar]
        Endpoints --> AuditLogger[Team Activity & Audit Feed]
        Endpoints --> MetricsEngine[Workforce Operational Metrics]
        Endpoints --> CSVExporter[Formula-Safe CSV Export]
    end

    subgraph "Integrated Studio Systems"
        WorkloadEngine --> Tasks[Tasks (Phase 20/23)]
        WorkloadEngine --> Projects[Projects (Phase 23)]
        WorkloadEngine --> Shoots[Shoot Sessions (Phase 22)]
        WorkloadEngine --> Equipment[Equipment Inventory (Phase 20)]
        ReassignEngine --> Clients[Clients (Phase 7/29)]
    end
```

---

## 2. Role Permissions Matrix & Hierarchy

PixMatch AI implements an 11-role hierarchy with numerical rank comparison and strict privilege validation:

| Role | Rank | Key Capabilities |
| :--- | :---: | :--- |
| **OWNER** | 100 | Full studio governance, ownership transfer, billing, member deletion, all permissions |
| **ADMIN** | 80 | Manage all members (below Owner rank), departments, invitations, studio settings |
| **MANAGER** | 60 | Assign tasks/shoots, manage calendar, view metrics, approve leaves |
| **PRODUCER** | 50 | Coordinate productions, assign shoot crew, track project deliverables |
| **SALES** | 40 | Manage leads, proposals, client CRM records, contracts |
| **PHOTOGRAPHER** | 30 | Execute shoots, view assigned production schedules and equipment |
| **VIDEOGRAPHER** | 30 | Execute video shoots, view assigned production schedules and equipment |
| **EDITOR** | 30 | Execute post-production editing tasks, view assigned media tasks |
| **SUPPORT** | 20 | Handle client communications, review client inquiries |
| **ASSISTANT** | 10 | View calendar, assist with shoots and equipment preparation |
| **VIEWER** | 0 | Read-only access to assigned studio items |

---

## 3. Workload Capacity Modeling Engine

The workload engine calculates a real-time deterministic score (0–100) based on weighted active commitments across all studio operational subsystems:

$$\text{Raw Workload Score} = (N_{\text{tasks}} \times 10) + (N_{\text{overdue}} \times 20) + (N_{\text{projects}} \times 15) + (N_{\text{shoots}} \times 25) + (N_{\text{equipment}} \times 5)$$

$$\text{Workload Score} = \min(\max(\text{Raw Score}, 0), 100)$$

### Workload State Thresholds
- **AVAILABLE:** Score $= 0$ (No active assignments, immediately ready for new work)
- **LIGHT:** $1 \le \text{Score} < 25$ (Low commitment)
- **NORMAL:** $25 \le \text{Score} < 55$ (Optimal operational utilization)
- **HEAVY:** $55 \le \text{Score} < 80$ (Approaching capacity limit)
- **OVERLOADED:** $\text{Score} \ge 80$ (Exceeds safe operational threshold, warnings flagged)

---

## 4. Schedule Conflict & Overlap Detection

The conflict detection engine evaluates any proposed interval $[T_{\text{start}}, T_{\text{end}}]$ against:
1. **Existing Confirmed Shoot Sessions:** Checks for time overlap where $\max(T_{\text{start}}, S_{\text{start}}) < \min(T_{\text{end}}, S_{\text{end}})$.
2. **Approved Member Leaves:** Prevents scheduling shoots or task deadlines during approved vacation or sick leave.

When a conflict is detected, the API returns a structured report including:
- `has_conflict: boolean`
- `conflicts: IScheduleConflictDetail[]` (with conflicting session IDs, names, dates, and severity)
- `recommendation: string` (suggested alternate non-conflicting available team members)

---

## 5. Cross-System Resource Reassignment Engine

When a team member is deactivated, departs, or is on extended leave, the atomic reassignment engine reallocates all active resources to designated target team members:
- **Tasks:** Transferred in `operationTask` (`assigned_user_id`)
- **Projects:** Lead photographer/manager reallocated in `operationProject` (`lead_id`)
- **Shoot Sessions:** Lead shooter reallocated in `shootSession` (`lead_photographer_id`)
- **Equipment:** Custody transferred in `equipmentItem` (`assigned_user_id`)
- **Clients:** Dedicated account manager reassigned in `client` (`account_manager_id`)

All reassignments execute within an atomic transaction with audit logging in `StudioTeamActivity`.

---

## 6. Secure Team Invitations & Token Hashing

1. Invitations are generated with high-entropy cryptographic tokens (`crypto.randomBytes(32).toString('hex')`).
2. Only the SHA-256 hash (`crypto.createHash('sha256').update(token).digest('hex')`) is stored in the database.
3. Plaintext tokens are sent only via invitation email/link and never stored or returned in list queries.
4. Tokens expire after 7 days and can be revoked or resent by studio Admins/Owners.

---

## 7. Security Perimeter & Hardening

1. **Formula Injection (CSV Injection) Defense:** All exported fields in CSV downloads are evaluated and sanitized. Fields starting with dangerous formula triggers (`=`, `+`, `-`, `@`, `\t`, `\r`) are automatically escaped with a leading single quote (`'`).
2. **Strict Multi-Tenant Isolation:** All database queries enforce `studio_id` equality. Cross-studio access attempts return HTTP 403 Forbidden.
3. **Internal Data Minimization:** Public gallery APIs and client portal routes strictly exclude team workforce models and endpoints.

---

## 8. Copilot Workforce Tools

Phase 31 registers 10 AI Copilot tools for automated workforce management:
1. `list_team_members` — List studio team members with role/dept/status filters
2. `get_team_member` — Retrieve member details, profile, and role
3. `get_member_workload` — Calculate deterministic workload score and capacity state
4. `get_team_workload_summary` — Summarize studio-wide capacity distribution
5. `check_schedule_conflict` — Evaluate shoot schedule against shoots and leaves
6. `get_team_calendar` — Retrieve aggregated internal team events
7. `list_team_activities` — Audit log feed of team administrative actions
8. `list_departments` — List studio departments
9. `get_reassignment_plan` — Inspect active assignments needing reassignment
10. `get_team_metrics` — Retrieve workforce KPI dashboard metrics

---

## 9. Verification & Test Coverage

- **Total Phase 31 Assertions:** 523 / 523 PASS across 26 comprehensive modules.
- **Regression Test Suites:**
  - Phase 30.1 Client Experience Hardening: 348 / 348 PASS
  - Phase 30 Client Experience 2.0: 100% PASS
  - Phase 29 CRM: 100% PASS
  - Phase 28 Client Communication: 291 / 291 PASS
- **Monorepo Build:** 9/9 packages built with 0 TypeScript/ESLint errors.
