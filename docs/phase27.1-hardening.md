# Phase 27.1 — Client Portal & White-Label Hardening Documentation

## Overview
Phase 27.1 hardens the multi-tenant architecture, cryptographic session handling, and security boundaries across the PixMatch AI Client Portal & White-Label subsystem.

---

## 1. Security Architecture & Threat Mitigations

### 1.1 Cryptographic Session Security & One-Way Hashing
- **Entropy:** Client portal tokens are generated using `crypto.randomBytes(32)` providing 256 bits of CSPRNG entropy (64 hex characters).
- **One-Way Hashing:** Tokens are immediately hashed using `SHA-256` (`crypto.createHash('sha256').update(rawToken).digest('hex')`) before database persistence. Raw tokens are never stored at rest.
- **Tenant Scoping & Revocation:** Session verification resolves strictly against the tenant `studio_id`. Session revocation (`revokeSession`, `revokeAllSessionsForClient`) is scoped to tenant boundaries to prevent cross-tenant invalidation attacks.

### 1.2 Multi-Tenant IDOR Protection
All sub-resource lookups are protected by composite index lookups verifying that the requested entity belongs to both the authenticated client and the target studio:
- `getProjectDetail(token, projectId)` — verifies `project.client_id === session.client_id && project.studio_id === session.studio_id`.
- `getOrderDetail(token, orderId)` — verifies `order.client_id === session.client_id && order.studio_id === session.studio_id`.
- `getClientDeliveries(token)` — filters strictly on `client_id` and `studio_id`.
- `generateDownloadUrl(token, downloadId)` — verifies package belongs to the authenticated client and studio.
- `markNotificationsAsRead(token, notificationIds)` — updates only notification records where `client_id === session.client_id`.

### 1.3 Strict RFC 1123 Custom Domain Engine
- **Hostname Syntax:** Validates syntax using strict RFC 1123 rules (`^([a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?\.)+[a-zA-Z]{2,}$`).
- **Forbidden Patterns:** Rejects IP addresses (IPv4/IPv6), localhost, cloud metadata endpoints (`169.254.169.254`, `metadata.google.internal`), ports, paths, protocols (`http://`, `https://`), trailing dots, and reserved platform domains (`pixmatch.app`, `pixmatch.ai`, `pixmatch.io`, `pixmatch.dev`).
- **Host Header Resolution:** Sanitizes incoming Host headers by stripping trailing ports (`:443`, `:3000`) and performing case-insensitive lookups strictly against verified/active domain records.

### 1.4 White-Label Injection Defense (XSS & CSS)
- **HTML Sanitization:** Studio name, tagline, and footer text inputs strip `<script>`, `<iframe>`, `javascript:`, `vbscript:`, and DOM event handlers (`onload`, `onerror`, `onclick`).
- **CSS Injection Defense:** Brand colors are validated against strict Hex Regex (`^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$`). Non-hex strings, `expression()`, `@import`, and CSS property delimiters are sanitized or rejected.
- **Font Whitelist:** Typography is strictly restricted to approved web-safe Google fonts (`ALLOWED_FONT_FAMILIES`).
- **Button Style Whitelist:** Button styles are constrained to `ALLOWED_BUTTON_STYLES` (`['rounded', 'square', 'pill', 'minimal']`).

### 1.5 Subscription Entitlements & Badge Removal Gating
- **Feature Key Gating:** Feature access is verified through `EntitlementService.checkFeatureAccess(studioId, featureKey)`.
- **Badge Gating:** Free tier studios attempting to set `show_pixmatch_badge: false` receive a strict entitlement rejection requiring plan upgrade to `PRO`.

### 1.6 Private Caching & Anti-Index Headers
Client portal and private client views enforce strict security response headers:
- `Cache-Control: private, no-cache, no-store, must-revalidate`
- `Pragma: no-cache`
- `Expires: 0`
- `X-Robots-Tag: noindex, noarchive, nofollow`
- `X-Frame-Options: DENY`
- `X-Content-Type-Options: nosniff`

---

## 2. Test Execution & Assertion Summary

| Test Suite | Assertions | Failures | Status |
| :--- | :--- | :--- | :--- |
| `tests/phase27.1-hardening.test.ts` | 182 | 0 | ✅ PASS |
| `tests/phase27-client-portal.test.ts` | 209 | 0 | ✅ PASS |
| **Combined Phase 27 & 27.1** | **391** | **0** | **✅ PASS** |
| Phase 20 (Studio Operations) | 63 | 0 | ✅ PASS |
| Phase 21 (Proposals & Contracts) | 156 | 0 | ✅ PASS |
| Phase 22 (Calendar & Scheduling) | 144 | 0 | ✅ PASS |
| Phase 23 (Production Management) | 199 | 0 | ✅ PASS |
| Phase 24 (Culling & Editing) | 222 | 0 | ✅ PASS |
| Phase 25 (Client Proofing) | 115 | 0 | ✅ PASS |
| Phase 26 (Fulfillment & Orders) | 227 | 0 | ✅ PASS |
| Master Monorepo (`npm test`) | Full Suite | 0 | ✅ PASS |
| Monorepo Build (`npm run build`) | 9 / 9 tasks | 0 | ✅ PASS |
| Monorepo Lint (`npm run lint`) | Clean | 0 | ✅ PASS |

---

## 3. Integration Classification

- **`LOCALLY VERIFIED`**: Multi-tenant token isolation, SHA-256 session token hashing, IDOR parameter boundaries, RFC 1123 hostname validation, hex color CSS sanitization, font whitelisting, mass assignment prevention, DTO data minimization, high-concurrency race condition safety, bounded aggregation performance, entitlement enforcement.
- **`MOCKED`**: In-memory database repository mocks for fast, hermetic unit & integration test execution.
- **`EXTERNAL DEPENDENCY`**: Real-world external DNS propagation (TXT challenge records at authoritative nameservers), custom domain SSL certificate issuance (e.g. Let's Encrypt / Cloudflare for SaaS), and public internet reverse proxies.
