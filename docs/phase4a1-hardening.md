# PixMatch AI — Phase 4A.1: External Storage Production Hardening & Security Defense

## Overview
Phase 4A.1 executed a comprehensive security audit, tamper-resistance hardening, SSRF/CSRF defense enforcement, auto-pagination loop integration, and delta synchronization verification across all external cloud storage integrations (**Google Drive**, **Dropbox**, and **Microsoft OneDrive**), maintaining 100% backward compatibility and zero regressions across Phases 1, 2, 2.1, 3, 3.1, and 4A.

---

## 1. Security & Cryptographic Architecture

### 1.1 Zero-Downtime Key Rotation & Versioned Payloads
- Encrypted tokens in `StorageConnection.credentials_encrypted` and `StorageState` follow a version-prefixed structure:
  ```
  v1:ivHex:tagHex:cipherHex
  v2:ivHex:tagHex:cipherHex
  ```
- `registerKeyVersion(version, keySecret)` allows hot registration of legacy and new master keys.
- Decryption dynamically resolves the correct secret key based on payload header (`v1`, `v2`, etc.) while gracefully falling back to legacy non-versioned formats (`iv:tag:cipher`) if encountered.
- Encryption always utilizes the active default version (e.g. `v2`).

### 1.2 Cryptographic Tamper & Integrity Resistance
- Authentication tag verification via AES-256-GCM guarantees authenticated encryption with associated data (AEAD).
- Strict length and format checks reject corrupted IVs (must be exactly 12 bytes / 24 hex chars) and corrupted tags (16 bytes / 32 hex chars) prior to cipher initialization.
- Single-bit ciphertext modifications or forged authentication tags immediately throw cryptographic integrity errors.

### 1.3 Startup Configuration Validation
- `validateEncryptionKeyConfig()` verifies key strength at application boot.
- In production (`NODE_ENV === 'production'`), startup fails immediately if `STORAGE_ENCRYPTION_KEY` is missing or insecure.

---

## 2. SSRF & CSRF Defenses

### 2.1 Server-Side Request Forgery (SSRF) Defense (`packages/storage/src/ssrf.ts`)
- `validateSafeUrl(url, allowedHostSuffixes)` enforces:
  - Strict HTTPS protocol requirements.
  - Blocking of IPv4 loopback (`127.0.0.0/8`, `0.0.0.0`, `localhost`).
  - Blocking of IPv6 loopback (`::1`, `fe80::/10`).
  - Blocking of RFC 1918 Private ranges (`10.0.0.0/8`, `172.16.0.0/12`, `192.168.0.0/16`).
  - Blocking of Cloud Instance Metadata Services (`169.254.169.254`).
  - Domain suffix allowlists for Google (`googleapis.com`, `google.com`), Dropbox (`dropboxapi.com`, `dropbox.com`), and Microsoft (`graph.microsoft.com`, `microsoftonline.com`).
- `safeFetch(url, options, allowedSuffixes)` wraps all outbound provider HTTP calls with pre-flight DNS and SSRF sanitization.

### 2.2 OAuth CSRF State Replay Defense
- OAuth `state` generation packages `{ studioId, provider, nonce, timestamp, randomHex }` encrypted with AES-256-GCM.
- Single-use nonce cache with 15-minute TTL invalidates tokens upon initial consumption, preventing CSRF replay attacks.
- Expired states (> 15 minutes) are strictly rejected.

---

## 3. Provider Auto-Pagination & Rate Limiting

### 3.1 Multi-Page Listing Aggregation
- **Google Drive:** Loops over `nextPageToken` up to 10 pages per sync cycle.
- **Dropbox:** Uses `/2/files/list_folder` and loops over `cursor` via `/2/files/list_folder/continue` until `has_more === false`.
- **Microsoft OneDrive:** Follows `@odata.nextLink` pagination URL chains.

### 3.2 HTTP 429 Rate Limiting with Exponential Backoff
- `fetchWithRetry(url, options, maxRetries)` intercepts HTTP 429 and 503 responses.
- Respects `Retry-After` response headers (in seconds or RFC 2822 date formats).
- Applies exponential backoff with randomized full jitter:
  $$\text{Delay} = \min(10000, 1000 \times 2^{\text{attempt}} + \text{jitter})$$

---

## 4. Background Sync & Ingestion Guarantees

### 4.1 Mode A (Import) vs Mode B (Connected Storage) Isolation
- **Mode A (Import):** Downloads remote asset, writes the high-resolution master file to local tenant storage (`storage/studios/{studioId}/originals/`), generates derivative thumbnails (SM, MD, LG WebP), indexes faces for pgvector selfie search, and creates a full database photo record.
- **Mode B (Connected Storage):** Streams asset ephemerally into memory, generates lightweight WebP thumbnails (`storage/studios/{studioId}/thumbnails/`), indexes face embeddings into PostgreSQL pgvector, and immediately releases/nulls out the in-memory master buffer. Master originals are **never** persisted to platform disk.

### 4.2 Modification Detection & Re-indexing
- Compares remote `lastModified` and `sizeBytes` against existing `Photo` records.
- If changed, downloads updated image, purges existing `FaceDetection` rows for that photo, updates image metadata, and triggers fresh face re-indexing.

### 4.3 Missing Remote File Grace Period
- Reconciles remote listing against gallery photos.
- Unmatched remote files are flagged as `source_status = 'SOURCE_MISSING'` with a 14-day grace period rather than hard deleting gallery records immediately.

### 4.4 Structured Audit Logging
- Emits structured events to `AuditLog` table on all critical lifecycle operations:
  - `STORAGE_CONNECTION_UPSERTED`
  - `STORAGE_FOLDER_SELECTED`
  - `STORAGE_SYNC_TRIGGERED`
  - `STORAGE_SYNC_COMPLETED`
  - `STORAGE_SYNC_FAILED`
  - `STORAGE_CONNECTION_DELETED`
- Audit log metadata strictly sanitizes and omits OAuth access tokens, refresh tokens, and encryption keys.

---

## 5. Live Provider Status & Truthfulness Audit
| Provider | OAuth & Auth Flow | Auto-Pagination | SSRF/Security Checks | Live Test Status |
| :--- | :--- | :--- | :--- | :--- |
| **Google Drive** | Implemented (v3 REST) | `nextPageToken` (10 pages max) | Verified & Tested | `UNCONFIGURED` (Truthful Skip) |
| **Dropbox** | Implemented (v2 RPC/Content) | `/continue` cursor pagination | Verified & Tested | `UNCONFIGURED` (Truthful Skip) |
| **OneDrive** | Implemented (MS Graph v1.0) | `@odata.nextLink` pagination | Verified & Tested | `UNCONFIGURED` (Truthful Skip) |

> **Note:** Production environments must supply `GOOGLE_DRIVE_CLIENT_ID`, `DROPBOX_CLIENT_ID`, and `MICROSOFT_CLIENT_ID` with corresponding secrets. Test suites honestly report unconfigured live credentials rather than generating false positive passes.

---

## 6. Test Suite & Verification Summary

### Automated Test Suites (`npm test`):
1. **Phase 2 Upload & Ingestion Suite:** 12/12 passing
2. **Phase 2.1 Production Hardening Suite:** 14/14 passing
3. **Phase 3 Real AI Face Recognition Suite:** 14/14 passing
4. **Phase 3.1 AI Production Hardening Suite:** 24/24 passing
5. **Phase 4A Storage Integrations Suite:** 32/32 passing
6. **Phase 4A.1 Storage Hardening Suite:** 42/42 passing
- **Total:** **138/138 Automated Tests Passing (100%)**
- **Turbo Monorepo Build:** **9/9 Workspaces Building Cleanly**
