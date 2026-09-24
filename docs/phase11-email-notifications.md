# PixMatch AI — Phase 11: Production Email + Notifications + Communication Center

## Overview
Phase 11 establishes an enterprise-grade, asynchronous email and notification infrastructure for PixMatch AI. Built for multi-tenant scalability, strict privacy, and zero secret leakage, the system provides:
1. **Multi-Provider Email Abstraction**: Pluggable support for Console Development, Resend API, and SMTP/SES/Sendgrid providers with automated failover and health testing.
2. **Reliable BullMQ Queue Engine**: Background delivery worker with exponential backoff, jitter, and classification of transient vs. permanent delivery failures.
3. **Centralized Notification Engine**: Unified event dispatcher supporting 18+ business events, studio preferences, suppression lists, and tamper-proof HMAC unsubscribe tokens.
4. **17 Production Email Templates**: Responsive, brand-customizable HTML emails with automated escaping (`escapeHtml`), URL sanitization, and strict biometric privacy isolation.
5. **Super Admin Operations & Photographer Settings**: Complete visibility into email logs, template rendering, provider telemetry, and granular photographer preference controls.

---

## Architecture Diagram

```
                       ┌──────────────────────────────┐
                       │    Application Event Bus     │
                       │ (Auth, Gallery, CRM, Billing)│
                       └──────────────┬───────────────┘
                                      │
                                      ▼
                       ┌──────────────────────────────┐
                       │     NotificationService      │
                       │  - Event routing & dedupe    │
                       │  - Preference check          │
                       │  - Suppression check         │
                       │  - Alert cooldown (5 min)    │
                       └──────────────┬───────────────┘
                                      │
                         ┌────────────┴────────────┐
                         │                         │
                         ▼ (Async Background)      ▼ (Sync / Direct)
           ┌───────────────────────────┐ ┌───────────────────────────┐
           │   BullMQ Delivery Queue   │ │    Console / Test Send    │
           │     (emailDeliveryQueue)  │ └───────────────────────────┘
           └─────────────┬─────────────┘
                         │
                         ▼
           ┌───────────────────────────┐
           │    Email Delivery Worker  │
           │  - Template compilation   │
           │  - HTML / URL sanitization│
           │  - Studio branding inject │
           └─────────────┬─────────────┘
                         │
                         ▼
           ┌───────────────────────────┐
           │   EmailProvider Interface │
           │ ├─ ConsoleDevEmailProvider│
           │ ├─ ResendEmailProvider    │
           │ ├─ SmtpEmailProvider      │
           │ └─ MockFailingEmailProvider│
           └─────────────┬─────────────┘
                         │
                         ▼
           ┌───────────────────────────┐
           │ Recipient Inbox / Webhooks│
           └───────────────────────────┘
```

---

## 18 Supported Event Types & 17 Production Templates

| Event Type | Template Key | Target Audience | Trigger Context |
| :--- | :--- | :--- | :--- |
| `WELCOME` | `WELCOME` | Photographers | Studio account registration & onboarding |
| `EMAIL_VERIFICATION` | `EMAIL_VERIFICATION` | Photographers & Clients | Email address ownership verification |
| `PASSWORD_RESET` | `PASSWORD_RESET` | All Users | Password reset request (Non-disableable) |
| `GALLERY_DELIVERY` | `GALLERY_DELIVERY` | Clients & Guests | Studio publishes or delivers gallery |
| `GALLERY_REMINDER` | `GALLERY_REMINDER` | Clients | Gentle reminder before gallery expiration |
| `CLIENT_FAVORITES_SUBMITTED` | `CLIENT_FAVORITES_SUBMITTED` | Photographers | Client marks/completes favorite photo list |
| `CLIENT_SELECTION_COMPLETED` | `CLIENT_SELECTION_COMPLETED` | Photographers | Client finalizes album selections |
| `CLIENT_DOWNLOAD_ACTIVITY` | `CLIENT_DOWNLOAD_ACTIVITY` | Photographers | High-volume or single-zip client downloads |
| `PAYMENT_SUCCEEDED` | `PAYMENT_SUCCEEDED` | Photographers | Subscription renewal or invoice payment |
| `PAYMENT_FAILED` | `PAYMENT_FAILED` | Photographers | Dunning cycle payment failure |
| `SUBSCRIPTION_UPGRADED` | `SUBSCRIPTION_UPGRADED` | Photographers | Tier upgrade (e.g. Starter to Pro) |
| `SUBSCRIPTION_CANCELLED` | `SUBSCRIPTION_CANCELLED` | Photographers | Subscription cancellation confirmation |
| `STORAGE_QUOTA_WARNING` | `STORAGE_QUOTA_WARNING` | Photographers | Storage utilization exceeds 80% / 90% |
| `STORAGE_SYNC_FAILED` | `STORAGE_SYNC_FAILED` | Photographers | Google Drive, Dropbox, or OneDrive sync error |
| `AI_PROCESSING_COMPLETED` | `AI_PROCESSING_COMPLETED` | Photographers | Batch face indexing and clustering finished |
| `AI_PROCESSING_FAILED` | `AI_PROCESSING_FAILED` | Photographers | Photo processing error / corrupt image |
| `SYSTEM_ALERT` | `SYSTEM_ALERT` | Super Admins | Service degradation / queue latency spike |
| `MARKETING_ANNOUNCEMENT` | `MARKETING_ANNOUNCEMENT` | Photographers (Opt-in) | New product features and platform updates |

---

## Security & Privacy Guarantees

1. **Header Injection (CRLF) Prevention**:
   - Every email subject and header line is sanitized using `sanitizeHeaderValue` to strip `\r` and `\n` characters before dispatch.
   - Prohibits Bcc/Cc injections and spoofed headers.
2. **HTML & URL Injection Defense**:
   - Dynamic user-supplied variables (names, gallery titles, studio notes) are strictly escaped with `escapeHtml`.
   - Action button links are validated using `sanitizeUrl` to reject `javascript:`, `data:`, and `vbscript:` protocols.
3. **Biometric Privacy Isolation**:
   - Zero raw selfies, face crops, or 512-dimensional biometric embedding vectors are ever included in email templates, database email logs, or notification payloads.
4. **Secret Redaction**:
   - API keys and SMTP passwords are never returned in Admin UI endpoints or written to log files. Only boolean state flags (`has_api_key`, `has_smtp_password`) and sanitized host names are exposed.
5. **Cryptographic Unsubscribe Verification**:
   - HMAC-SHA256 signature tokens protect the public unsubscribe endpoint against unauthorized address enumeration or tampering.

---

## Super Admin Control Center Endpoints

- `GET /api/v1/admin/email`: Aggregated email delivery metrics (Total Sent, Delivered, Bounced, Failed, 24h Trend, Active Provider).
- `GET /api/v1/admin/email/logs`: Paginated, filterable delivery logs (by status, template, provider, studio, recipient search).
- `GET /api/v1/admin/email/templates`: Catalog of all 17 system templates with variable schemas.
- `GET /api/v1/admin/email/templates/:id`: Template inspection with sandboxed sample HTML preview.
- `POST /api/v1/admin/email/templates/:id/test`: Controlled test dispatch to verified admin recipient.
- `GET /api/v1/admin/email/settings`: Provider configuration state without secret exposure.
- `POST /api/v1/admin/email/settings/test`: Live health check and round-trip connectivity test.

---

## Photographer Studio Preference Endpoints

- `GET /api/v1/notifications/preferences`: Retrieves current studio notification toggles.
- `PUT /api/v1/notifications/preferences`: Updates granular email category preferences.
- `GET /api/v1/email/unsubscribe/:token`: Public token verification for single-click unsubscribe.
- `POST /api/v1/email/unsubscribe/:token`: Public opt-out confirmation.

---

## Verification & QA Summary

- **Phase 11 Test Suite**: 32/32 tests passed (`tests/phase11-email-notifications.test.ts`).
- **Full Monorepo Regression**: 740/740 tests passed across all 17 suites (Phases 2 through 11).
- **Workspace Compilation**: 9/9 Turborepo workspaces compiled successfully.
- **Next.js Prerender**: All 38 web application routes prerendered without errors.
