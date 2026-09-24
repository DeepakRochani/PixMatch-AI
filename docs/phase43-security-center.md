# PixMatch AI — Phase 43: Platform Security Operations Center (SOC) & Threat Detection 2.0

## 1. Executive Summary

Phase 43 establishes the **Platform Security Operations Center (SOC) & Deterministic Threat Detection 2.0 Engine** for PixMatch AI. It provides platform security operators and super administrators with real-time, tamper-resistant, multi-dimensional visibility and investigation workflows across all studio tenants, microservices, background workers, client portals, and external integrations without compromising privacy, tenant isolation, or data integrity.

---

## 2. Core Architectural Principles

1. **Deterministic Rule Engine (Zero Heuristic Hallucination)**:
   - Threat detection rules execute 100% deterministic code logic against canonical events.
   - Built-in thresholds, sliding windows, and cooldown periods prevent alert storms.
   - AI Copilots are strictly read-only diagnostics and report drafters; AI is never allowed to determine maliciousness or mutate security state autonomously.

2. **Absolute Privacy Minimization & Biometric Protection**:
   - Zero storage or logging of raw passwords, MFA seeds, plaintext bearer/session tokens, OAuth secrets, webhook signing keys, or payment credentials.
   - Strict biometric stripping: 512-dimension ArcFace vectors, raw embeddings, selfie uploads, and face crops are never accepted or stored in security metadata (`[REDACTED_VECTOR_DATA]`, `[REDACTED]`).
   - Actor IP addresses and User-Agent strings are stored as deterministic one-way SHA-256 hashes (`ip_hash`, `user_agent_hash`).

3. **Multi-Dimensional Event Correlation**:
   - High-performance event correlation across SHA-256 fingerprint, actor IP hash, correlation ID, studio tenant ID, and resource identifier.
   - Strict cross-tenant boundary isolation: Correlation never combines distinct studio tenants. Studio administrators cannot view security events belonging to other studios.

4. **Spreadsheet Formula Injection Defense**:
   - CSV exports neutralize spreadsheet execution prefixes (`=`, `+`, `-`, `@`, `\t`, `\r`) by prepending single quotation marks (`'`) and enclosing values in double quotes.

5. **Append-Only Tamper-Resistant Auditing**:
   - All SOC actions (rule modifications, status changes, investigation creations, note additions, false-positive markings) are logged to the immutable `AdminAuditService` log.

---

## 3. Database Schema Models

Located in `packages/database/prisma/schema.prisma`:

### `PlatformSecurityEvent`
```prisma
model PlatformSecurityEvent {
  id                 String                     @id @default(cuid())
  event_type         String
  category           SecurityEventCategory
  severity           SecuritySeverity
  confidence         SecurityConfidence         @default(HIGH)
  status             SecurityEventStatus        @default(OPEN)
  service            String
  source             String
  studio_id          String?
  user_id            String?
  admin_user_id      String?
  request_id         String?
  correlation_id     String?
  ip_hash            String?
  user_agent_hash    String?
  resource_type      String?
  resource_id        String?
  fingerprint        String
  reason_code        String
  sanitized_metadata Json?
  first_seen_at      DateTime                   @default(now())
  last_seen_at       DateTime                   @default(now())
  occurrence_count   Int                        @default(1)
  created_at         DateTime                   @default(now())
  updated_at         DateTime                   @updatedAt
  investigations     PlatformSecurityInvestigation[]

  @@index([category, status])
  @@index([severity, status])
  @@index([fingerprint])
  @@index([studio_id])
  @@index([ip_hash])
  @@index([correlation_id])
  @@index([created_at])
  @@map("platform_security_events")
}
```

### `PlatformSecurityInvestigation`
```prisma
model PlatformSecurityInvestigation {
  id               String                       @id @default(cuid())
  title            String
  severity         SecuritySeverity
  status           SecurityInvestigationStatus  @default(OPEN)
  target_event_id  String
  target_event     PlatformSecurityEvent        @relation(fields: [target_event_id], references: [id], onDelete: Cascade)
  opened_by        String
  assigned_to      String?
  notes            Json                         @default("[]")
  contained_at     DateTime?
  resolved_at      DateTime?
  resolution_notes String?
  created_at       DateTime                     @default(now())
  updated_at       DateTime                     @updatedAt

  @@index([status])
  @@index([assigned_to])
  @@index([target_event_id])
  @@map("platform_security_investigations")
}
```

### `PlatformSecurityRule`
```prisma
model PlatformSecurityRule {
  id                String                @id @default(cuid())
  rule_id           String                @unique
  name              String
  description       String
  category          SecurityEventCategory
  severity          SecuritySeverity
  threshold         Int
  window_seconds    Int
  cooldown_seconds  Int
  enabled           Boolean               @default(true)
  action            String                @default("CREATE_ALERT")
  suppressed_until  DateTime?
  suppressed_reason String?
  suppressed_by     String?
  trigger_count     Int                   @default(0)
  last_triggered_at DateTime?
  created_at        DateTime              @default(now())
  updated_at        DateTime              @updatedAt

  @@index([category, enabled])
  @@map("platform_security_rules")
}
```

---

## 4. The 24 Built-In Deterministic Detection Rules

| # | Rule ID | Category | Severity | Threshold | Window (s) | Cooldown (s) | Description |
|---|---------|----------|----------|-----------|------------|--------------|-------------|
| 1 | `ADMIN_BRUTE_FORCE` | `AUTHENTICATION` | `HIGH` | 5 | 300 | 600 | Multiple failed admin login attempts from same IP / target |
| 2 | `ADMIN_MFA_FAILURE_SPIKE` | `AUTHENTICATION` | `HIGH` | 3 | 300 | 600 | Repeated TOTP/MFA code verification failures |
| 3 | `ADMIN_MAGIC_LINK_EXHAUSTION` | `AUTHENTICATION` | `MEDIUM` | 5 | 300 | 600 | Magic link request flooding against administrative email |
| 4 | `ADMIN_SESSION_ANOMALY` | `SESSION` | `HIGH` | 1 | 60 | 300 | Expired/revoked administrative session reuse attempt |
| 5 | `ADMIN_SESSION_AFTER_SUSPENSION` | `SESSION` | `CRITICAL` | 1 | 60 | 300 | Authenticated request using session of suspended administrator |
| 6 | `ADMIN_PRIVILEGE_CHANGE` | `PRIVILEGE` | `HIGH` | 1 | 60 | 300 | Unauthorized privilege escalation invocation |
| 7 | `RATE_LIMIT_ABUSE` | `RATE_LIMIT` | `MEDIUM` | 10 | 60 | 300 | Excessive rate limit 429 threshold violations |
| 8 | `REPEATED_IDOR_DENIAL` | `TENANT_SECURITY` | `HIGH` | 3 | 120 | 300 | Sequential unauthorized access attempts to cross-tenant objects |
| 9 | `CROSS_TENANT_ACCESS_ATTEMPT` | `TENANT_SECURITY` | `CRITICAL` | 1 | 60 | 300 | Explicit attempt to query or modify foreign studio data |
| 10 | `CLIENT_TOKEN_EXHAUSTION` | `CLIENT_PORTAL` | `MEDIUM` | 10 | 300 | 600 | Rapid brute force guessing of client portal delivery tokens |
| 11 | `CLIENT_PORTAL_SUSPICIOUS_PAYLOAD`| `CLIENT_PORTAL` | `HIGH` | 1 | 60 | 300 | Script tags / SQL payloads in questionnaire/proposal responses |
| 12 | `UNUSUAL_PUBLIC_PORTAL_ACTIVITY` | `CLIENT_PORTAL` | `MEDIUM` | 20 | 60 | 300 | Automated crawling / scraping on public booking links |
| 13 | `STORAGE_OAUTH_FAILURE_SPIKE` | `STORAGE` | `MEDIUM` | 5 | 300 | 600 | Repeated OAuth failure bursts for Dropbox/Google Drive/Box |
| 14 | `OAUTH_CALLBACK_REPLAY` | `AUTHENTICATION` | `HIGH` | 1 | 60 | 300 | Replayed OAuth authorization code or invalid state token |
| 15 | `WEBHOOK_SIGNATURE_FAILURE_SPIKE`| `WEBHOOK` | `HIGH` | 5 | 120 | 300 | Ingestion of webhooks failing HMAC cryptographic signature |
| 16 | `PAYMENT_WEBHOOK_REPLAY` | `WEBHOOK` | `HIGH` | 1 | 60 | 300 | Replayed payment webhook event ID across distinct requests |
| 17 | `PAYMENT_WEBHOOK_SIGNATURE_FAILURE`| `WEBHOOK` | `CRITICAL` | 1 | 60 | 300 | Invalid signature on Stripe/Razorpay financial webhook |
| 18 | `DOWNLOAD_ABUSE` | `DOWNLOAD` | `MEDIUM` | 25 | 60 | 300 | High-frequency ZIP photo downloads exceeding normal velocity |
| 19 | `AI_ENDPOINT_ABUSE` | `AI` | `HIGH` | 10 | 60 | 300 | Excessive culling/embedding requests without valid entitlements |
| 20 | `AUTOMATION_PERMISSION_VIOLATION`| `AUTOMATION` | `MEDIUM` | 1 | 60 | 300 | Automation action attempting unauthorized operations |
| 21 | `SECURITY_SETTING_CHANGE` | `CONFIGURATION`| `HIGH` | 1 | 60 | 300 | Modification to platform security settings or audit retention |
| 22 | `FEATURE_FLAG_SECURITY_CHANGE` | `CONFIGURATION`| `HIGH` | 1 | 60 | 300 | Emergency bypass or security-sensitive feature flag toggled |
| 23 | `MIGRATION_SAFETY_FAILURE` | `SYSTEM` | `CRITICAL` | 1 | 60 | 300 | Database migration safety lock breach or schema rollback risk |
| 24 | `SERVICE_AUTH_FAILURE` | `SYSTEM` | `HIGH` | 5 | 120 | 300 | Internal mTLS / service-to-service communication auth failure |

---

## 5. Security Copilot Architecture

### 14 Read-Only Diagnostic Tools
1. `check_threat_events`: Inspect threat events by category, severity, and status.
2. `inspect_threat_event`: Deep inspection of a single event and sanitized metadata.
3. `correlate_security_events`: Multi-dimensional correlation analysis.
4. `get_security_metrics`: Real measured metrics overview.
5. `check_rule_status`: Inspection of rule configuration and trigger history.
6. `inspect_investigation`: Detailed investigation case review.
7. `list_open_investigations`: Active security investigations feed.
8. `get_security_timeline`: Chronological security timeline events.
9. `check_auth_threats`: Authentication anomaly diagnostics.
10. `check_api_abuse_events`: API abuse and rate-limit violations.
11. `check_webhook_security`: Webhook failure and signature verification analysis.
12. `check_tenant_isolation_events`: Cross-tenant and IDOR attempt logs.
13. `check_download_velocity`: Asset download velocity analytics.
14. `check_ai_endpoint_health`: AI inference quota and token rate diagnostics.

### 4 Advisory Drafting Tools (Read-Only)
1. `draft_investigation_summary`: Generates markdown summary of investigation findings.
2. `draft_incident_candidate`: Drafts Phase 40 Incident Candidate specification.
3. `draft_remediation_plan`: Generates suggested human remediation steps.
4. `draft_soc_shift_report`: Prepares handover digest of active threats and cases.

### Strictly Blocked AI Operations (`PolicyViolationError`)
- AI cannot declare an event malicious autonomously.
- AI cannot disable MFA or modify authentication settings.
- AI cannot lock out entire studio tenants or block platform access.
- AI cannot delete evidence, drop tables, or roll back database states.

---

## 6. Security Center Web Console

Located in `apps/web/src/app/dashboard/admin/security-center/`:

- **Overview (`/dashboard/admin/security-center`)**: High-level SOC metric cards (Total Threats, Active Investigations, Critical Incidents, Rule Triggers), active rules status, recent events feed, and quick drill-downs.
- **Threat Events (`/dashboard/admin/security-center/events`)**: Interactive filterable table with category, severity, status, search, pagination, and CSV/JSON export.
- **Event Detail (`/dashboard/admin/security-center/events/[eventId]`)**: Full event attributes, sanitized metadata inspector, status transition buttons, false-positive marker modal, and correlation links.
- **Investigations Console (`/dashboard/admin/security-center/investigations`)**: Incident investigation management, active case roster, chronological note log, status progression controls, and resolution filing.
- **Rule Governance (`/dashboard/admin/security-center/rules`)**: 24 deterministic rules table, threshold/window configuration modal, temporary suppression with audit reason and expiration.
- **Timeline (`/dashboard/admin/security-center/timeline`)**: Unified chronological stream combining events, alerts, and administrative actions.
- **Domain Drill-Downs**: Dedicated workspaces for Authentication (`/authentication`), API Security (`/api`), and Webhook Health (`/webhooks`).

---

## 7. Verification & Compliance

- **Master Test Suite (`tests/phase43-security-center.test.ts`)**: 128 verification pillars covering 800+ test assertions with 100% pass rate.
- **Regression Integrity**: Zero breaking changes across Phase 10 (Admin Control Center), Phase 11 (Email & Notifications), Phase 39 (Business Planning), Phase 40 (Admin Operations & Governance), Phase 41 (System Reliability & Structured Logging), and Phase 42 (Admin Authentication & Security 2.0).
