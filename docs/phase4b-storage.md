# PixMatch AI — Phase 4B: S3, Cloudflare R2, Generic S3 & External URL Storage

## Overview
Phase 4B implements production-grade object storage and external URL ingestion capabilities for PixMatch AI. This extends the platform's unified `StorageProvider` abstraction with:
1. **Amazon Web Services (AWS) S3**
2. **Cloudflare R2** (zero egress fee object storage)
3. **Generic S3-Compatible Providers** (Wasabi, MinIO, Backblaze B2, DigitalOcean Spaces)
4. **External URL Storage** (direct image links, image URL lists, and JSON manifests)

All additions maintain 100% backward compatibility with Platform Storage and Phase 4A OAuth storage integrations (Google Drive, Dropbox, OneDrive).

---

## 1. Unified S3 Architecture (`S3Provider`)

Instead of maintaining fragmented provider implementations, `packages/storage/src/providers/s3.provider.ts` provides a unified engine built on the official AWS SDK v3 (`@aws-sdk/client-s3`, `@aws-sdk/s3-request-presigner`, `@aws-sdk/lib-storage`).

```text
                    StorageProvider
                           │
        ┌──────────────────┼───────────────────┬───────────────────┐
        │                  │                   │                   │
PlatformStorage        S3Provider          ExternalUrlProvider   OAuthProviders
(Local Disk)               │                   │                 (GDrive/Dropbox/
               ┌───────────┼───────────┐       │                  OneDrive)
               │           │           │       │
            AWS S3   Cloudflare R2  Generic S3 Direct URLs / Manifests
```

### 1.1 Provider Matrix & Specific Behaviors

| Feature / Setting | Amazon S3 | Cloudflare R2 | Generic S3 (MinIO, Wasabi, B2) |
| :--- | :--- | :--- | :--- |
| **Provider Type** | `StorageProviderType.S3` | `StorageProviderType.CLOUDFLARE_R2` | `StorageProviderType.GENERIC_S3` |
| **Endpoint** | AWS regional standard (e.g. `s3.us-east-1.amazonaws.com`) | `https://<accountId>.r2.cloudflarestorage.com` (Auto-constructed) | Custom endpoint configured by user |
| **Region** | User configured (e.g. `us-east-1`, `eu-west-1`) | `auto` | Configured or default `us-east-1` |
| **Addressing Style** | Virtual-hosted (default) | Virtual-hosted | Path-style (`forcePathStyle: true`) |
| **Custom Domain** | Supported (e.g. CloudFront CDN) | Supported (custom domain / r2.dev) | Supported (custom CDN) |
| **Egress Fees** | Standard AWS transfer rates | **$0.00 zero egress** | Provider specific |

### 1.2 Multi-Part Upload Threshold
- Files **< 50MB**: Direct `PutObjectCommand` with content type and metadata.
- Files **>= 50MB**: Multi-part upload managed via `@aws-sdk/lib-storage` `Upload` class with configurable concurrency and 10MB chunk size.

### 1.3 Tenant Isolation Key Namespacing
To prevent cross-tenant object collision or data leakage, all stored objects follow deterministic namespacing:
```text
[prefix/]pixmatch/studios/{studioId}/galleries/{galleryId}/{category}/{filename}
```
- Path traversal sequences (`..`) and invalid characters are strictly stripped and rejected.

### 1.4 Virtual Folder Navigation via S3 Delimiter
- Folder navigation is powered by `ListObjectsV2Command` with `Delimiter: '/'`.
- `CommonPrefixes` are parsed into navigable virtual folder lists.
- Full folder scans auto-paginate through `ContinuationToken` until `IsTruncated === false`.

### 1.5 Secure Presigned URLs
- Generated using `@aws-sdk/s3-request-presigner` (`GetObjectCommand`).
- Expiry duration is bounded between 60 seconds (minimum) and 3600 seconds (maximum), with a default of 900 seconds (15 minutes).

---

## 2. External URL Ingestion Engine (`ExternalUrlProvider`)

The `ExternalUrlProvider` (`packages/storage/src/providers/external-url.provider.ts`) handles direct image links, lists of image URLs, and JSON manifests.

### 2.1 Manifest Support
Accepts JSON manifests in the following formats:
```json
{
  "galleryName": "Smith Wedding",
  "photos": [
    {
      "url": "https://cdn.example.com/photos/img001.jpg",
      "filename": "img001.jpg",
      "caption": "Ceremony entrance",
      "timestamp": "2026-09-01T14:30:00Z"
    }
  ]
}
```

### 2.2 Strict Multi-Hop Redirect & SSRF Defense
1. **Initial URL Verification:** Protocol must be `http:` or `https:`. Private IPv4 ranges (`10.0.0.0/8`, `172.16.0.0/12`, `192.168.0.0/16`), loopbacks (`127.0.0.1`, `localhost`, `::1`), and cloud metadata IPs (`169.254.169.254`) are blocked.
2. **Multi-Hop Redirect Inspection:** Each redirect hop is captured and validated before following (`redirect: 'manual'`). If any intermediate URL attempts to pivot to internal/metadata IPs, the request is terminated immediately.
3. **Download Protections:**
   - Maximum download size: 100MB per file.
   - Request timeout: 15,000ms with `AbortController`.
   - Content-Type and Magic-Byte verification (JPEG `FF D8 FF`, PNG `89 50 4E 47`, WebP `RIFF...WEBP`, GIF `GIF87a`/`GIF89a`). Malicious scripts (PHP, HTML, JS) are rejected.

---

## 3. Storage Mode Execution (Mode A vs Mode B)

### Mode A: Import to Platform
1. Worker downloads high-resolution photo from S3, R2, or External URL into memory.
2. Original is saved to studio platform disk (`storage/studios/{studioId}/originals/`).
3. Sharp generates derivative WebP thumbnails (`sm`, `md`, `lg`).
4. Face embeddings are computed via InsightFace and indexed into PostgreSQL `pgvector`.
5. Database `Photo` record is created with `storage_mode: 'IMPORT'`.

### Mode B: Connected Storage (Zero-Disk Master Retention)
1. Worker streams high-resolution photo ephemerally into an in-memory buffer.
2. Sharp processes thumbnails directly from memory.
3. Lightweight thumbnails (`md`, `sm`) are stored for gallery browsing.
4. Face embeddings are computed and stored in pgvector.
5. In-memory master buffer is explicitly set to `null` to free RAM immediately.
6. Database `Photo` record retains `source_url` or `source_file_id` with `storage_mode: 'CONNECTED'`.

---

## 4. Zero Plaintext Credential Exposure

Credentials for all storage connections (access keys, secret keys, session tokens, custom endpoints) are encrypted at rest using versioned AES-256-GCM (`v1:iv:tag:ciphertext`).

- API responses strictly sanitize and redact sensitive fields:
  ```json
  {
    "id": "conn_123",
    "provider": "S3",
    "bucket": "my-studio-bucket",
    "region": "us-east-1",
    "hasAccessKey": true,
    "hasSecretKey": true,
    "prefix": "weddings/2026"
  }
  ```
- Neither access keys nor secret keys are ever logged or sent to the client.

---

## 5. Live Diagnostics & Connection Testing

### Endpoints
- `POST /api/storage/test-config`: Tests unsaved storage configurations directly from the frontend connect dialog before saving.
- `POST /api/storage/connections/:id/test`: Tests saved connections and updates health status.

### S3 / R2 Diagnostic Probe Sequence
1. `HeadBucketCommand`: Tests credential validity and bucket reachability.
2. `ListObjectsV2Command` (`MaxKeys: 1`): Tests read and listing permissions.
3. `PutObjectCommand` (probe key `.pixmatch-probe-test`): Tests write permissions.
4. `DeleteObjectCommand`: Cleans up the probe object.

---

## 6. Verification & Test Suite Summary

### Automated Test Suites (`npm test`):
1. `test:phase2` — Upload & Ingestion Pipeline: **12/12 passing**
2. `test:phase2-hardening` — Pipeline Hardening: **14/14 passing**
3. `test:phase3` — InsightFace + pgvector AI: **14/14 passing**
4. `test:phase3-hardening` — AI Service Hardening: **24/24 passing**
5. `test:phase4a` — Cloud Storage Integrations: **32/32 passing**
6. `test:phase4a1` — External Storage Hardening: **42/42 passing**
7. `test:phase4b` — S3, R2, Generic S3 & External URL: **42/42 passing**
- **Total:** **180/180 Automated Tests Passing (100%)**
- **Turbo Monorepo Build:** **9/9 Workspaces Building Cleanly**
