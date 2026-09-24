# PixMatch AI — Phase 40: Platform Admin Operations & Governance Center 2.0

## Overview

Phase 40 extends the PixMatch AI Super Admin system to provide a full-scale **Platform Admin Operations & Governance Center 2.0**. It incorporates enterprise-grade multi-scope feature flags, support ticketing with SLA tracking, incident triage and postmortem management, automated operational watchdogs with alert workflows, encrypted platform configuration with maintenance modes, comprehensive executive analytics across 7 system dimensions, formula-injection-safe data exports, and a strictly guarded, read-only/proposal-only Copilot Assistant.

---

## 1. Architecture & Core Components

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    PixMatch Platform Admin Operations 2.0                   │
├─────────────────────────────────────────────────────────────────────────────┤
│  Frontend (Next.js 14)                                                      │
│  ├── /dashboard/admin/features     (Feature Flags & Canaries)               │
│  ├── /dashboard/admin/settings     (Platform Config & Maintenance Mode)     │
│  ├── /dashboard/admin/alerts       (Watchdog Alerts & Alert Workflows)      │
│  ├── /dashboard/admin/incidents    (SEV1-4 Outages & Root Cause Analysis)   │
│  ├── /dashboard/admin/support      (Support Cases & Tenant Disputes)        │
│  ├── /dashboard/admin/analytics    (Executive SaaS Growth & 7D Health)      │
│  └── /dashboard/admin/security     (35 Granular RBAC Matrix & Telemetry)    │
├─────────────────────────────────────────────────────────────────────────────┤
│  API Services (Fastify + Prisma)                                            │
│  ├── AdminFeatureFlagService       (GLOBAL, PLAN, STUDIO Scopes + Rollouts) │
│  ├── AdminSupportService           (Lifecycle, SLA Targets, Resolution Notes│
│  ├── AdminIncidentService          (SEV1-4 Triage, Outage Timelines, RCAs)  │
│  ├── AdminAlertService             (GPU queues, Webhook fail, Storage alert)│
│  ├── AdminSettingsService          (Encrypted Secrets, Maintenance Gates)   │
│  ├── AdminAnalyticsService         (Growth KPIs, MRR/ARR, 7-Dim Health Score│
│  ├── AdminExportService            (CSV Formula-Sanitization + JSON Stream) │
│  └── AdminCopilotToolRegistry      (17 Read, 4 Draft, 8 Blocked Mutation)   │
├─────────────────────────────────────────────────────────────────────────────┤
│  Database Layer (PostgreSQL / Prisma)                                       │
│  ├── PlatformFeatureFlag           ├── PlatformIncident                     │
│  ├── PlatformSupportCase           ├── PlatformAlert                        │
│  └── PlatformAdminSetting          └── AuditLog (Append-Only)               │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Granular RBAC Permission Matrix

The platform implements 35 granular permissions under `@pixmatch/types` (`AdminPermission`) distributed across role hierarchies:

| Role | Description | Core Capabilities |
|---|---|---|
| `SUPER_ADMIN` | Platform Super Administrator | Full unrestricted access to all 35 permissions including break-glass, tenant impersonation, and maintenance mode toggling. |
| `PLATFORM_OPS` | Infrastructure & SRE Engineer | Feature flag management, incident response, operational alerts, and system health monitoring. |
| `SUPPORT_LEAD` | Customer Support Lead | Full support case lifecycle management, customer communications, user dispute triage. |
| `SUPPORT_AGENT` | Tier-1 / Tier-2 Support Agent | Read and update support cases, view studio usage telemetry, communicate with tenants. |
| `BILLING_ADMIN` | Financial & Billing Manager | Plan updates, subscription dispute resolution, revenue analytics, and billing exports. |
| `COMPLIANCE_OFFICER` | Security & Compliance Auditor | Read-only audit log inspection, data privacy reviews, CSV export generation, security matrices. |
| `READ_ONLY_ADMIN` | Executive / Auditor Observer | Complete read access across metrics, alerts, and incidents without mutation rights. |

---

## 3. Key Operational Systems

### 3.1 Feature Flags & Canary Rollouts (`AdminFeatureFlagService`)
- **Multi-Scope Evaluation**: `GLOBAL` (all tenants), `PLAN` (e.g. Enterprise only), `STUDIO` (whitelisted studio IDs).
- **Deterministic Rollout Percentage**: Hashing studio ID or user ID with CRC32 modulo 100 for stable canary deployments without state drift.

### 3.2 Support Case & Dispute Management (`AdminSupportService`)
- **Priority SLAs**: `URGENT` (<2h), `HIGH` (<4h), `MEDIUM` (<24h), `LOW` (<48h).
- **Audit Trails**: Full assignment tracking, internal notes, resolution summaries, and tenant satisfaction recording.

### 3.3 Incident Command & Postmortems (`AdminIncidentService`)
- **Severity Levels**: `SEV1` (Critical Outage), `SEV2` (Degraded Performance), `SEV3` (Minor Defect), `SEV4` (Cosmetic).
- **Lifecycle Progression**: `DETECTED` → `INVESTIGATING` → `IDENTIFIED` → `MITIGATING` → `RESOLVED` → `POSTMORTEM_PUBLISHED`.

### 3.4 Platform Watchdogs & Alert Workflows (`AdminAlertService`)
- Watchdog monitors: GPU Queue Overflow, High Ingestion Failure Rate, Storage Capacity Warning, Webhook Delivery Failures, and AI Inference Degradation.
- State transitions: `OPEN` → `ACKNOWLEDGED` (by admin) → `RESOLVED` (with resolution log).

### 3.5 Platform Settings & Maintenance Guardrails (`AdminSettingsService`)
- Sensitive credential masking: Automatic masking `******** [REDACTED_SECRET]` prevents accidental leakage.
- Maintenance Mode: Granular toggles (`global_maintenance`, `read_only_mode`, `ai_processing_paused`) with custom broadcast banners.

### 3.6 7-Dimension Platform Health Scoring (`AdminAnalyticsService`)
1. **Subscription Health**: Active vs churned ratios, trial conversions.
2. **Usage Health**: API quota consumption, storage velocity.
3. **AI Inference Pipeline Health**: Face detection latency, queue depths, GPU error rates.
4. **Storage & Media Health**: S3/R2 read-write latency, bandwidth throughput.
5. **Worker Queue Health**: BullMQ throughput, job stall rates.
6. **Security & Auth Health**: Failed login spikes, suspicious tenant activity.
7. **Email & Notification Health**: Webhook delivery rates, bounce/suppression levels.

### 3.7 Biometric Privacy & Security Invariants
- **Zero Biometrics in Admin**: No 512-d embeddings, vector tensors, or raw selfies are queried, logged, or returned in any admin endpoint.
- **Formula Injection Defense**: All exported strings beginning with `=`, `+`, `-`, `@`, `\t`, `\r`, `\n` are sanitized with leading single-quotes (`'`).
- **Copilot Safety**: 17 read-only diagnostic tools, 4 proposal draft tools, and strict runtime blocks on destructive mutations (e.g. `suspend_studio`, `purge_data`).
