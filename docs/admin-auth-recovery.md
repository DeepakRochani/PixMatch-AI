# Platform Administrator Emergency Break-Glass & Recovery Procedures

## Purpose & Scope
This document specifies the standard operating procedure (SOP) for emergency platform recovery, administrator account recovery, and break-glass credential management for PixMatch AI.

> [!IMPORTANT]
> PixMatch AI enforces a strict **Zero-Backdoors** architecture. There are no hidden accounts, master passwords, or undocumented API overrides. All emergency recovery actions must follow cryptographic and operational recovery procedures documented herein.

---

## 1. Single-Use MFA Recovery Codes (Self-Service)

Each platform administrator is issued 8 single-use recovery codes upon MFA enrollment:
- **Format**: `xxxx-xxxx` (hexadecimal characters).
- **Storage**: Stored at rest as irreversible SHA-256 hashes (`recovery_codes_hashes`).
- **Usage**:
  1. Navigate to `/admin/mfa`.
  2. Toggle to "Use an emergency recovery code".
  3. Enter any unused 8-character recovery code.
  4. The code is verified against stored SHA-256 hashes, consumed, and immediately removed from the active hash pool.
  5. The administrator is prompted to immediately regenerate recovery codes or re-enroll their primary authenticator device.

---

## 2. Platform Owner Protection & Lockout Safeguards

To prevent catastrophic platform lockout:
1. **Minimum Super Admin Invariant**:
   - The platform strictly rejects any administrative operation that would suspend, revoke, or delete the last remaining `SUPER_ADMIN` account.
   - Any attempt triggers an `OwnerProtectionViolation` error and creates a critical audit log event.
2. **Multiple Super Admin Policy**:
   - Production deployments MUST maintain a minimum of **two (2)** distinct `SUPER_ADMIN` accounts held by designated organizational custodians.

---

## 3. Server-Side CLI Break-Glass Provisioning (Disaster Recovery)

In the catastrophic event where all active `SUPER_ADMIN` credentials and recovery codes are unavailable:

### Prerequisites:
- Direct, authenticated SSH or console access to the production application host / Kubernetes pod.
- Access to the database environment (`DATABASE_URL`).

### Execution via Secure Script:
```bash
# Execute within the API container / deployment environment
npx tsx scripts/break-glass-admin.ts \
  --email="emergency-admin@pixmatch.ai" \
  --name="Break Glass Administrator" \
  --role="SUPER_ADMIN"
```

### Script Execution Guarantees:
1. Validates strict password complexity rules (minimum 12 characters, uppercase, lowercase, numbers, symbols, blacklist filtering).
2. Generates an encrypted Bcrypt password hash and creates or updates the administrator account.
3. Automatically creates an `ADMIN_LOGIN_ATTEMPT` audit entry tagged as `BREAK_GLASS_PROVISIONED`.
4. Forces immediate MFA enrollment on initial login.

---

## 4. Session Revocation Runbook

If an administrative session token is suspected of compromise:

1. **Self-Service / Peer Revocation**:
   - Any active `SUPER_ADMIN` navigates to `/dashboard/admin/security/sessions`.
   - Locate the compromised session ID (or IP hash / User-Agent).
   - Click **"Revoke Session"** or **"Terminate All Other Sessions"**.
2. **Instant Invalidation**:
   - The session record status is transitioned to `REVOKED` in `PlatformAdminSession`.
   - In-memory cache entries and tokens are invalidated immediately.
   - Any subsequent requests bearing the revoked token return `401 Unauthorized`.
3. **Privilege Change Trigger**:
   - Any administrative role change (demotion or suspension) automatically purges all active sessions for that administrator.
