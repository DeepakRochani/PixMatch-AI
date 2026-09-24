# Phase 42: Separate Super Admin Authentication & Secure Admin Portal 2.0

## Executive Architecture Summary

PixMatch AI Phase 42 implements a strictly isolated, cryptographically sound, zero-trust authentication boundary for platform administrators (`SUPER_ADMIN` and `PLATFORM_ADMIN`).

Tenant-level studio roles (`STUDIO_OWNER`, `STUDIO_ADMIN`, `STUDIO_MEMBER`, `CLIENT`) are strictly prevented from accessing or authenticating against platform administrator endpoints, eliminating horizontal privilege escalation vectors.

---

## 1. Core Security Invariants

1. **Authentication Portal Isolation**:
   - Platform administrator authentication occurs exclusively at `/admin/login` (and `/api/admin/auth/login`).
   - The studio user login `/login` cannot issue platform administrator session tokens.

2. **Session Token Cryptography**:
   - Plaintext tokens (64-character hex strings generated via 32-byte CSPRNG `crypto.randomBytes(32)`) are issued once to the client over an `HttpOnly`, `Secure`, `SameSite=Strict` cookie (`pixmatch_admin_session`).
   - Tokens at rest are hashed using unkeyed SHA-256 (`crypto.createHash('sha256').update(token).digest('hex')`).
   - Raw tokens are **never** logged, persisted, or leaked to AI Copilots.

3. **Multi-Factor Authentication (MFA / TOTP)**:
   - Built on RFC 6238 with standard 30-second time steps, ±1 window drift tolerance, and 6-digit zero-padded codes.
   - Base32 secrets (20-32 bytes) are encrypted at rest using AES-256-GCM authenticated encryption.
   - Replay defense stores and tracks the latest consumed time-step per administrator, rejecting reuse within the same 30s window.
   - Single-use recovery codes (8 codes formatted `xxxx-xxxx`) are stored as individual SHA-256 hashes and permanently consumed upon first use.

4. **Multi-Tier Brute-Force Rate Limiting**:
   - **IP-Level Limiter**: Maximum 10 failed attempts per 15-minute sliding window (15-minute lockout).
   - **Account-Level Limiter**: Maximum 5 failed attempts per 15-minute sliding window (15-minute lockout).
   - **Combined IP + Account Limiter**: Maximum 5 failed attempts per 10-minute sliding window with progressive backoff.
   - **MFA Rate Limiter**: Maximum 5 failed attempts per 10-minute window.
   - **Password Reset Limiter**: Maximum 3 requests per hour per email/IP.

5. **Owner Protection Invariant**:
   - The platform strictly prevents the deletion, suspension, or demotion of the final remaining `SUPER_ADMIN` account, safeguarding against platform-wide administrative lockout.

6. **Anti-Enumeration Protections**:
   - All authentication failures (non-existent email, wrong password, role mismatch) return the exact same generic error: `"Invalid administrator credentials."`
   - Password reset requests for non-existent accounts return a generic success confirmation to prevent username harvesting.

---

## 2. Platform Admin Roles vs Studio Roles

| Role | Domain | Can Access `/admin/login` | Can Access `/api/admin/*` | Permissions Scope |
| :--- | :--- | :--- | :--- | :--- |
| **`SUPER_ADMIN`** | Platform | ✅ YES | ✅ YES | Full platform governance, finance, security, admin user management |
| **`PLATFORM_ADMIN`** | Platform | ✅ YES | ✅ YES | Platform operations, monitoring, support, configuration |
| **`STUDIO_OWNER`** | Tenant / Studio | ❌ NO (Rejected) | ❌ NO (Rejected) | Studio management, billing, team, events |
| **`STUDIO_ADMIN`** | Tenant / Studio | ❌ NO (Rejected) | ❌ NO (Rejected) | Studio photo management, client coordination |
| **`STUDIO_MEMBER`** | Tenant / Studio | ❌ NO (Rejected) | ❌ NO (Rejected) | Photography, upload, tagging |
| **`CLIENT`** | Tenant / Guest | ❌ NO (Rejected) | ❌ NO (Rejected) | Photo gallery access, ordering |

---

## 3. Database Schema Overview

```prisma
enum AdminSessionStatus {
  ACTIVE
  EXPIRED
  REVOKED
}

enum AdminMfaStatus {
  DISABLED
  PENDING_VERIFICATION
  ENABLED
  ENFORCED
}

model PlatformAdminSession {
  id                         String             @id @default(uuid())
  session_token_hash         String             @unique
  admin_user_id              String
  platform_role              String
  status                     AdminSessionStatus @default(ACTIVE)
  created_at                 DateTime           @default(now())
  last_seen_at               DateTime           @default(now())
  expires_at                 DateTime
  revoked_at                 DateTime?
  ip_hash                    String?
  user_agent_hash            String?
  device_name                String?
  authentication_version     Int                @default(1)
  mfa_verified               Boolean            @default(false)
  idle_timeout_minutes       Int                @default(30)
  absolute_timeout_minutes   Int                @default(720)

  @@index([admin_user_id, status])
  @@index([session_token_hash])
  @@index([expires_at])
}
```

---

## 4. API Endpoints Reference

### Public Authentication Routes
- `POST /api/admin/auth/login`: Authenticate with email, password, and optional MFA code.
- `POST /api/admin/auth/mfa/challenge`: Complete 2FA challenge using temporary token and 6-digit TOTP or recovery code.
- `POST /api/admin/auth/password-reset/request`: Request single-use password reset link.
- `POST /api/admin/auth/password-reset/confirm`: Execute password reset with token and new password.
- `POST /api/admin/auth/invitations/accept`: Accept administrator invitation and set initial password.

### Authenticated Administration Routes (Requires `requirePlatformAdminSession`)
- `POST /api/admin/auth/logout`: Revoke active session token.
- `POST /api/admin/auth/logout-all`: Revoke all sessions for the current administrator.
- `POST /api/admin/auth/session/rotate`: Invalidate current token and issue fresh token.
- `GET /api/admin/auth/sessions`: List active sessions across all devices.
- `DELETE /api/admin/auth/sessions/:sessionId`: Revoke specific session by ID.
- `GET /api/admin/auth/mfa/status`: Retrieve MFA status, enrollment time, and remaining recovery codes.
- `POST /api/admin/auth/mfa/enroll`: Initiate TOTP setup (returns Base32 secret, QR URI, recovery codes).
- `POST /api/admin/auth/mfa/confirm`: Confirm TOTP setup with valid verification code.
- `POST /api/admin/auth/mfa/disable`: Disable MFA (requires `SUPER_ADMIN` authorization).
- `POST /api/admin/auth/invitations`: Create new platform administrator invitation (48h expiry).
- `GET /api/admin/auth/security/stats`: Aggregated security statistics (active sessions, MFA adoption rate, locked accounts).

---

## 5. Copilot Tool Boundaries

The admin authentication system registers 14 Copilot AI tools under strict determinism and safety policies:

1. **Read-Only Diagnostics (4 tools)**:
   - `get_admin_authentication_status`
   - `get_admin_session_summary`
   - `get_admin_security_events`
   - `get_admin_mfa_overview`
2. **Draft Proposals (2 tools)**:
   - `draft_admin_security_report`
   - `draft_authentication_incident_summary`
3. **Blocked Mutation Tools (8 tools - strictly throw `PolicyViolationError`)**:
   - `block_revoke_admin_session`
   - `block_reset_admin_password`
   - `block_disable_admin_mfa`
   - `block_create_admin_invitation`
   - `block_suspend_admin_account`
   - `block_elevate_admin_privileges`
   - `block_bypass_admin_mfa`
   - `block_flush_admin_audit_logs`

AI agents are strictly forbidden from performing any state-modifying action on security, tokens, passwords, MFA, or sessions.
