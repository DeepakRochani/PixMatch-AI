# Phase 27: Studio Client Portal & White-Label Client Experience

## Executive Summary
**Phase 27** delivers the **Studio Client Portal & White-Label Client Experience** for **PixMatch AI**. 

It provides an end-to-end, zero-password, high-entropy client portal (`/portal/client/[token]`) enabling photography clients to view all their commissioned projects, galleries, active proofing sessions (Phase 25), fulfillment orders and physical shipments (Phase 26), secure high-resolution digital downloads, notification feeds, and contact preferences. In addition, it delivers the **Studio White-Label Branding Engine** (`/dashboard/settings/branding`) with custom color schemes, typography, logos, customizable footers, badge visibility entitlement control, and RFC 1123 custom domain verification with TXT/CNAME DNS challenge routing.

---

## 1. Core Architecture & Multi-Tenant Data Model

### Prisma Schema (`packages/database/prisma/schema.prisma`)
Phase 27 introduces **1 new Enum** and **5 new Models** with complete studio/client foreign key relations:

- **Enum**:
  - `StudioDomainStatus`: `PENDING`, `VERIFYING`, `ACTIVE`, `VERIFIED`, `FAILED`, `REVOKED`

- **Models**:
  - `StudioBranding`: 
    - Holds studio-specific visual customization: `primary_color`, `secondary_color`, `accent_color`, `background_color`, `text_color`, `font_family`, `button_style`, `logo_url`, `favicon_url`, `custom_footer_text`, `website_url`, `contact_email`, `contact_phone`, `social_links` (JSON), and `show_pixmatch_badge` (boolean).
    - Linked 1-to-1 with `Studio`.
  - `StudioDomain`:
    - Manages white-label custom domain hostnames: `hostname`, `status`, `verification_token` (`pixmatch-verify-*`), `dns_records` (JSON challenge records for TXT and CNAME), `ssl_status`, `is_primary`, `verified_at`, and `last_checked_at`.
    - Indexed on `[studio_id, hostname]`, `[hostname]`, and `[status]`.
  - `ClientPortalSession`:
    - Zero-password client session tracking: `token_hash` (SHA-256 digest of 64-hex-char token), `expires_at`, `is_active`, `access_count`, `last_accessed_at`, `ip_address`, `user_agent`, and `revoked_at`.
    - Indexed on `[token_hash]`, `[studio_id, client_id]`, and `[is_active, expires_at]`.
  - `ClientPortalNotificationRead`:
    - Tracks per-client read states for notifications: `client_id`, `notification_id`, `read_at`.
    - Unique composite constraint on `[client_id, notification_id]`.
  - `ClientPortalPreference`:
    - Manages client notification channels and opt-in settings: `email_gallery_ready`, `email_proofing_updates`, `email_order_updates`, `email_delivery_updates`, `email_download_ready`.
    - Unique 1-to-1 constraint on `client_id`.

---

## 2. Zero-Password High-Entropy Session Architecture

### Cryptographic Foundation (`apps/api/src/modules/client-portal/client-portal-session.service.ts`)
1. **Entropy Generation**:
   - Every client portal link uses `crypto.randomBytes(32).toString('hex')` (64 hexadecimal characters, 256 bits of cryptographic entropy).
2. **One-Way SHA-256 Storage**:
   - The raw token is delivered strictly to the client. The database stores only `crypto.createHash('sha256').update(rawToken).digest('hex')`.
3. **Session Verification & Telemetry**:
   - Token lookup computes the SHA-256 hash, validates active status and non-expiration, and updates `access_count` and `last_accessed_at`.
4. **Tenant Isolation & Revocation**:
   - Revocation requires matching `studio_id` to prevent cross-studio token invalidation attacks (IDOR protection). Studios can revoke individual sessions or bulk-revoke all active sessions for a client upon project closure or security request.

---

## 3. White-Label Branding Engine & Entitlements

### Security & Sanitization (`apps/api/src/modules/branding/studio-branding.service.ts`)
1. **Hex Color Validation**:
   - Strict regex `^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$` prevents CSS injection and style breakout attacks.
2. **Font Family Whitelist**:
   - Only curated, high-legibility Google Fonts are allowed (`Inter`, `Playfair Display`, `Montserrat`, `Lora`, `Cinzel`, `Outfit`, `Plus Jakarta Sans`, etc.).
3. **XSS & HTML Sanitization**:
   - Strips `<script>`, `<iframe>`, `javascript:`, `onerror`, and event handler payloads from `custom_footer_text`, `studio_name`, `tagline`, and contact fields.
4. **Subscription Entitlement Gating**:
   - Disabling `show_pixmatch_badge` is restricted to `STUDIO` and `ENTERPRISE` plans; `STARTER` and `FREE` accounts are rejected if badge removal is attempted.

---

## 4. Custom Domains & Multi-Tenant DNS Lifecycle

### Domain Management (`apps/api/src/modules/branding/studio-domain.service.ts`)
1. **RFC 1123 Hostname Validation**:
   - Strictly enforces lower-case RFC 1123 compliant domain names, rejecting protocol prefixes (`http://`), wildcards (`*`), port numbers (`:443`), and reserved root domains (`pixmatch.app`, `localhost`).
2. **DNS Challenge Generation**:
   - Generates deterministic verification tokens (`pixmatch-verify-<UUID>`) and returns DNS instructions:
     - `TXT`: `_pixmatch-challenge.<hostname>` -> `pixmatch-verify-...`
     - `CNAME`: `<hostname>` -> `cname.pixmatch.app`
3. **Tenant Ingestion & Routing**:
   - `resolveStudioByHostname(hostname)` resolves incoming host headers strictly for verified `ACTIVE` domains, returning null for unverified or deleted domains to prevent tenant confusion.

---

## 5. Aggregated Client Portal Sub-Routes & Views

### Client Portal Application (`apps/web/src/app/portal/client/[token]/`)
The client portal provides a comprehensive responsive experience across 9 dedicated sub-routes:

| Route Path | View Component | Key Functionality |
|---|---|---|
| `/portal/client/[token]` | `page.tsx` | Aggregated dashboard: studio banner, quick stats, active proofing banner, recent projects, order summary, activity feed. |
| `/portal/client/[token]/projects` | `projects/page.tsx` | All commissioned photography projects with search, filter, gallery counts, and event dates. |
| `/portal/client/[token]/projects/[projectId]` | `projects/[projectId]/page.tsx` | Project detail view: assigned photographer, linked galleries, proofing session breakdown, order links. |
| `/portal/client/[token]/orders` | `orders/page.tsx` | Fulfillment order history with payment badges, totals, items, and tracking status. |
| `/portal/client/[token]/orders/[orderId]` | `orders/[orderId]/page.tsx` | Itemized invoice breakdown, financial subtotal/tax/shipping, and delivery tracking links. |
| `/portal/client/[token]/downloads` | `downloads/page.tsx` | High-resolution ZIP packages, web-resolution bundles, signed 1-hour secure URLs, expiry dates. |
| `/portal/client/[token]/delivery` | `delivery/page.tsx` | FedEx/UPS/USPS courier tracking, in-transit status, and 1-click client receipt confirmation. |
| `/portal/client/[token]/notifications` | `notifications/page.tsx` | Real-time notification feed, unread indicators, and mark-as-read actions. |
| `/portal/client/[token]/profile` | `profile/page.tsx` | Client contact details and granular email preference toggles. |

### Studio Dashboard Configuration (`apps/web/src/app/dashboard/settings/branding/`)
- **Branding Studio Page** (`branding/page.tsx`):
  - Interactive live preview modal rendering changes in real-time.
  - Palette pickers with hex code inputs, logo upload URL, typography selectors, button style preview, custom footer builder, and domain verification management table.

---

## 6. Copilot AI Tools Integration

The Phase 27 Copilot tools are registered in `apps/api/src/modules/copilot/copilot-tool-registry.ts`:

1. `getStudioBranding`: Returns active branding tokens and colors for the current studio tenant.
2. `listStudioDomains`: Returns custom domains and DNS verification states for the studio.
3. `getClientPortalStatus`: Returns whether a specific client has active portal sessions and their last access timestamp.
4. `generateClientPortalLink`: Generates a fresh 64-hex-entropy client portal link for a client.

---

## 7. Strict Data Minimization & Privacy Protection

The client portal API strictly adheres to **Data Minimization Principles**:
- **ZERO Biometric Data**: Embeddings, 512-dimensional vectors, and facial landmarks are never included in any client portal response DTO.
- **ZERO Internal Studio Notes**: Private photographer notes and internal production logs remain restricted to studio dashboards.
- **ZERO Wholesale Margin Data**: Lab wholesale costs, base lab printing fees, and processing margins are omitted from client invoices.
- **ZERO Passwords**: Uses zero-password cryptographic tokens; no password hashes or credentials exist on client records.

---

## 8. Verification & Test Suite Summary

The master test suite (`tests/phase27-client-portal.test.ts`) verifies the implementation across 10 modules:

| Test Module | Coverage Area | Assertions | Status |
|---|---|---|---|
| Module 1 | Client Portal Session & Token Lifecycle | 29 | **PASS** |
| Module 2 | Studio Branding Engine & Entitlement Gating | 25 | **PASS** |
| Module 3 | Custom Domains Engine & DNS Lifecycle | 25 | **PASS** |
| Module 4 | Data Fixtures (Projects, Proofing, Orders, Deliveries) | 7 | **PASS** |
| Module 5 | Aggregated Client Portal Home DTO Projection | 27 | **PASS** |
| Module 6 | Projects List & Detail Projection (IDOR Isolation) | 16 | **PASS** |
| Module 7 | Orders, Payments & Delivery Fulfillment Integration | 28 | **PASS** |
| Module 8 | Digital Downloads & Signed URL Generation | 10 | **PASS** |
| Module 9 | Notifications Feed, Read State & Client Preferences | 19 | **PASS** |
| Module 10 | Copilot AI Tools & Data Minimization Auditing | 17 | **PASS** |
| **Total** | **Phase 27 Master Test Suite** | **209** | **100% PASS** |
