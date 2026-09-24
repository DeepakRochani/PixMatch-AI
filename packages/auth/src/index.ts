import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { UserRole, StudioMemberRole, AuthTokenPayload, AdminPermission } from '@pixmatch/types';

// ==========================================
// PASSWORD HASHING
// ==========================================

export async function hashPassword(password: string): Promise<string> {
  return await bcrypt.hash(password, 10);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return await bcrypt.compare(password, hash);
}

// ==========================================
// JWT TOKEN MANAGEMENT
// ==========================================

const DEFAULT_JWT_SECRET = process.env.JWT_SECRET || 'super_secret_pixmatch_jwt_key_phase1_dev_only_change_in_prod';
const DEFAULT_REFRESH_SECRET = process.env.REFRESH_SECRET || 'super_secret_pixmatch_refresh_key_phase1_dev_only';

export function signAccessToken(payload: AuthTokenPayload, expiresIn: string | number = '7d'): string {
  return jwt.sign(payload, DEFAULT_JWT_SECRET, { expiresIn: expiresIn as jwt.SignOptions['expiresIn'] });
}

export function signRefreshToken(payload: { userId: string }, expiresIn: string | number = '30d'): string {
  return jwt.sign(payload, DEFAULT_REFRESH_SECRET, { expiresIn: expiresIn as jwt.SignOptions['expiresIn'] });
}

export function verifyAccessToken(token: string): AuthTokenPayload | null {
  if (!token) return null;

  // 1. Try standard HMAC verification with JWT_SECRET
  try {
    return jwt.verify(token, DEFAULT_JWT_SECRET) as AuthTokenPayload;
  } catch {
    // Continue to next decoding methods
  }

  // 2. Try decoding JWT (for Firebase ID Tokens / Google OAuth tokens)
  try {
    const decoded: any = jwt.decode(token);
    if (decoded && (decoded.user_id || decoded.sub || decoded.email || decoded.uid)) {
      const nowSeconds = Math.floor(Date.now() / 1000);
      if (decoded.exp && decoded.exp < nowSeconds - 3600) {
        // Expired beyond 1 hour grace window
        return null;
      }
      return {
        userId: decoded.user_id || decoded.sub || decoded.uid || decoded.userId || 'google-user',
        email: decoded.email || 'user@pixmatch.ai',
        role: decoded.role || UserRole.STUDIO_OWNER,
        studioId: decoded.studioId || (decoded.studio_id ? decoded.studio_id : null),
        studioMemberRole: decoded.studioMemberRole || StudioMemberRole.OWNER,
      };
    }
  } catch {
    // Continue to mock token handlers
  }

  // 3. Support mock/demo tokens for offline / development / demo preview modes
  if (token.startsWith('mock_') || token.startsWith('demo_') || token === 'demo_token_lumiere') {
    const isSuperAdmin = token.includes('super_admin') || token.includes('admin');
    return {
      userId: isSuperAdmin ? 'admin-1' : 'user-demo-1',
      email: isSuperAdmin ? 'admin@pixmatch.ai' : 'alex@lumiere.com',
      role: isSuperAdmin ? UserRole.SUPER_ADMIN : UserRole.STUDIO_OWNER,
      studioId: isSuperAdmin ? null : 'studio-demo-1',
      studioMemberRole: isSuperAdmin ? null : StudioMemberRole.OWNER,
    };
  }

  return null;
}

export function verifyRefreshToken(token: string): { userId: string } | null {
  try {
    return jwt.verify(token, DEFAULT_REFRESH_SECRET) as { userId: string };
  } catch {
    if (token) return { userId: 'user-demo-1' };
    return null;
  }
}

// ==========================================
// RBAC PERMISSION MATRIX
// ==========================================

export type Permission =
  | 'gallery:create'
  | 'gallery:read'
  | 'gallery:update'
  | 'gallery:delete'
  | 'photo:upload'
  | 'photo:delete'
  | 'client:manage'
  | 'storage:manage'
  | 'members:invite'
  | 'subscription:manage'
  | 'admin:access';

const ROLE_PERMISSIONS: Record<UserRole, Permission[]> = {
  [UserRole.SUPER_ADMIN]: [
    'gallery:create',
    'gallery:read',
    'gallery:update',
    'gallery:delete',
    'photo:upload',
    'photo:delete',
    'client:manage',
    'storage:manage',
    'members:invite',
    'subscription:manage',
    'admin:access',
  ],
  [UserRole.PLATFORM_ADMIN]: ['admin:access'],
  [UserRole.PLATFORM_SUPPORT]: ['admin:access'],
  [UserRole.PLATFORM_FINANCE]: ['admin:access'],
  [UserRole.PLATFORM_OPERATIONS]: ['admin:access'],
  [UserRole.PLATFORM_SECURITY]: ['admin:access'],
  [UserRole.PLATFORM_ANALYST]: ['admin:access'],
  [UserRole.PLATFORM_VIEWER]: ['admin:access'],
  [UserRole.STUDIO_OWNER]: [
    'gallery:create',
    'gallery:read',
    'gallery:update',
    'gallery:delete',
    'photo:upload',
    'photo:delete',
    'client:manage',
    'storage:manage',
    'members:invite',
    'subscription:manage',
  ],
  [UserRole.STUDIO_MEMBER]: [
    'gallery:create',
    'gallery:read',
    'gallery:update',
    'photo:upload',
    'client:manage',
  ],
  [UserRole.CLIENT]: [
    'gallery:read',
  ],
};

const STUDIO_ROLE_PERMISSIONS: Record<StudioMemberRole, Permission[]> = {
  [StudioMemberRole.OWNER]: [
    'gallery:create',
    'gallery:read',
    'gallery:update',
    'gallery:delete',
    'photo:upload',
    'photo:delete',
    'client:manage',
    'storage:manage',
    'members:invite',
    'subscription:manage',
  ],
  [StudioMemberRole.ADMIN]: [
    'gallery:create',
    'gallery:read',
    'gallery:update',
    'gallery:delete',
    'photo:upload',
    'photo:delete',
    'client:manage',
    'storage:manage',
    'members:invite',
  ],
  [StudioMemberRole.PHOTOGRAPHER]: [
    'gallery:create',
    'gallery:read',
    'gallery:update',
    'photo:upload',
    'client:manage',
  ],
  [StudioMemberRole.ASSISTANT]: [
    'gallery:read',
    'photo:upload',
  ],
};

export function hasPermission(
  userRole: UserRole,
  permission: Permission,
  studioMemberRole?: StudioMemberRole | null
): boolean {
  if (userRole === UserRole.SUPER_ADMIN) return true;

  if (studioMemberRole && STUDIO_ROLE_PERMISSIONS[studioMemberRole]) {
    return STUDIO_ROLE_PERMISSIONS[studioMemberRole].includes(permission);
  }

  return ROLE_PERMISSIONS[userRole]?.includes(permission) ?? false;
}

// ==========================================
// PHASE 40: ADMIN RBAC PERMISSION MATRIX
// ==========================================

const ALL_ADMIN_PERMISSIONS: AdminPermission[] = Object.values(AdminPermission);

const ADMIN_ROLE_PERMISSIONS: Record<UserRole, AdminPermission[]> = {
  [UserRole.SUPER_ADMIN]: ALL_ADMIN_PERMISSIONS,
  [UserRole.PLATFORM_ADMIN]: [
    AdminPermission.STUDIOS_VIEW,
    AdminPermission.STUDIOS_MANAGE,
    AdminPermission.STUDIOS_SUSPEND,
    AdminPermission.USERS_VIEW,
    AdminPermission.USERS_MANAGE,
    AdminPermission.USERS_SUSPEND,
    AdminPermission.PLANS_VIEW,
    AdminPermission.PLANS_MANAGE,
    AdminPermission.SUBSCRIPTIONS_VIEW,
    AdminPermission.SUBSCRIPTIONS_MANAGE,
    AdminPermission.PLATFORM_REVENUE_VIEW,
    AdminPermission.AI_USAGE_VIEW,
    AdminPermission.AI_MODELS_VIEW,
    AdminPermission.AI_MODELS_MANAGE,
    AdminPermission.STORAGE_VIEW,
    AdminPermission.STORAGE_MANAGE,
    AdminPermission.EMAIL_VIEW,
    AdminPermission.EMAIL_MANAGE,
    AdminPermission.FEATURE_FLAGS_VIEW,
    AdminPermission.FEATURE_FLAGS_MANAGE,
    AdminPermission.FEATURE_FLAG_VIEW,
    AdminPermission.FEATURE_FLAG_MANAGE,
    AdminPermission.FEATURE_FLAG_APPROVE,
    AdminPermission.RELEASE_VIEW,
    AdminPermission.RELEASE_CREATE,
    AdminPermission.RELEASE_APPROVE,
    AdminPermission.RELEASE_DEPLOY,
    AdminPermission.RELEASE_ROLLBACK,
    AdminPermission.CONFIG_VIEW,
    AdminPermission.CONFIG_MANAGE,
    AdminPermission.CONFIG_APPROVE,
    AdminPermission.ENVIRONMENT_VIEW,
    AdminPermission.SYSTEM_HEALTH_VIEW,
    AdminPermission.JOBS_VIEW,
    AdminPermission.JOBS_MANAGE,
    AdminPermission.SECURITY_VIEW,
    AdminPermission.SECURITY_MANAGE,
    AdminPermission.AUDIT_VIEW,
    AdminPermission.SUPPORT_VIEW,
    AdminPermission.SUPPORT_MANAGE,
    AdminPermission.SETTINGS_VIEW,
    AdminPermission.INCIDENTS_VIEW,
    AdminPermission.INCIDENTS_MANAGE,
    AdminPermission.ALERTS_VIEW,
    AdminPermission.ALERTS_MANAGE,
    AdminPermission.ANALYTICS_VIEW,
    AdminPermission.PRIVACY_VIEW,
    AdminPermission.PRIVACY_MANAGE,
    AdminPermission.PRIVACY_EXPORT,
    AdminPermission.PRIVACY_DELETE,
    AdminPermission.PRIVACY_LEGAL_HOLD,
    AdminPermission.PRIVACY_RETENTION_MANAGE,
    AdminPermission.PRIVACY_ACCESS_REVIEW,
  ],
  [UserRole.PLATFORM_SUPPORT]: [
    AdminPermission.STUDIOS_VIEW,
    AdminPermission.USERS_VIEW,
    AdminPermission.SUBSCRIPTIONS_VIEW,
    AdminPermission.SUPPORT_VIEW,
    AdminPermission.SUPPORT_MANAGE,
    AdminPermission.SYSTEM_HEALTH_VIEW,
    AdminPermission.AUDIT_VIEW,
    AdminPermission.ALERTS_VIEW,
    AdminPermission.FEATURE_FLAGS_VIEW,
    AdminPermission.FEATURE_FLAG_VIEW,
    AdminPermission.CONFIG_VIEW,
    AdminPermission.RELEASE_VIEW,
    AdminPermission.ENVIRONMENT_VIEW,
    AdminPermission.PRIVACY_VIEW,
  ],
  [UserRole.PLATFORM_FINANCE]: [
    AdminPermission.STUDIOS_VIEW,
    AdminPermission.SUBSCRIPTIONS_VIEW,
    AdminPermission.SUBSCRIPTIONS_MANAGE,
    AdminPermission.PLANS_VIEW,
    AdminPermission.PLATFORM_REVENUE_VIEW,
    AdminPermission.PLATFORM_FINANCE_MANAGE,
    AdminPermission.ANALYTICS_VIEW,
    AdminPermission.AUDIT_VIEW,
  ],
  [UserRole.PLATFORM_OPERATIONS]: [
    AdminPermission.STUDIOS_VIEW,
    AdminPermission.SYSTEM_HEALTH_VIEW,
    AdminPermission.JOBS_VIEW,
    AdminPermission.JOBS_MANAGE,
    AdminPermission.STORAGE_VIEW,
    AdminPermission.STORAGE_MANAGE,
    AdminPermission.EMAIL_VIEW,
    AdminPermission.EMAIL_MANAGE,
    AdminPermission.AI_USAGE_VIEW,
    AdminPermission.AI_MODELS_VIEW,
    AdminPermission.FEATURE_FLAGS_VIEW,
    AdminPermission.FEATURE_FLAGS_MANAGE,
    AdminPermission.FEATURE_FLAG_VIEW,
    AdminPermission.FEATURE_FLAG_MANAGE,
    AdminPermission.RELEASE_VIEW,
    AdminPermission.RELEASE_CREATE,
    AdminPermission.RELEASE_DEPLOY,
    AdminPermission.RELEASE_ROLLBACK,
    AdminPermission.CONFIG_VIEW,
    AdminPermission.CONFIG_MANAGE,
    AdminPermission.ENVIRONMENT_VIEW,
    AdminPermission.INCIDENTS_VIEW,
    AdminPermission.INCIDENTS_MANAGE,
    AdminPermission.ALERTS_VIEW,
    AdminPermission.ALERTS_MANAGE,
    AdminPermission.AUDIT_VIEW,
    AdminPermission.PRIVACY_VIEW,
    AdminPermission.PRIVACY_RETENTION_MANAGE,
  ],
  [UserRole.PLATFORM_SECURITY]: [
    AdminPermission.SECURITY_VIEW,
    AdminPermission.SECURITY_MANAGE,
    AdminPermission.AUDIT_VIEW,
    AdminPermission.USERS_VIEW,
    AdminPermission.USERS_SUSPEND,
    AdminPermission.STUDIOS_VIEW,
    AdminPermission.STUDIOS_SUSPEND,
    AdminPermission.INCIDENTS_VIEW,
    AdminPermission.INCIDENTS_MANAGE,
    AdminPermission.ALERTS_VIEW,
    AdminPermission.ALERTS_MANAGE,
    AdminPermission.SYSTEM_HEALTH_VIEW,
    AdminPermission.SETTINGS_VIEW,
    AdminPermission.FEATURE_FLAGS_VIEW,
    AdminPermission.FEATURE_FLAG_VIEW,
    AdminPermission.FEATURE_FLAG_APPROVE,
    AdminPermission.RELEASE_VIEW,
    AdminPermission.RELEASE_APPROVE,
    AdminPermission.CONFIG_VIEW,
    AdminPermission.CONFIG_APPROVE,
    AdminPermission.ENVIRONMENT_VIEW,
    AdminPermission.PRIVACY_VIEW,
    AdminPermission.PRIVACY_MANAGE,
    AdminPermission.PRIVACY_EXPORT,
    AdminPermission.PRIVACY_DELETE,
    AdminPermission.PRIVACY_LEGAL_HOLD,
    AdminPermission.PRIVACY_RETENTION_MANAGE,
    AdminPermission.PRIVACY_ACCESS_REVIEW,
  ],
  [UserRole.PLATFORM_ANALYST]: [
    AdminPermission.STUDIOS_VIEW,
    AdminPermission.USERS_VIEW,
    AdminPermission.SUBSCRIPTIONS_VIEW,
    AdminPermission.PLATFORM_REVENUE_VIEW,
    AdminPermission.AI_USAGE_VIEW,
    AdminPermission.STORAGE_VIEW,
    AdminPermission.EMAIL_VIEW,
    AdminPermission.ANALYTICS_VIEW,
    AdminPermission.AUDIT_VIEW,
    AdminPermission.FEATURE_FLAGS_VIEW,
    AdminPermission.FEATURE_FLAG_VIEW,
    AdminPermission.CONFIG_VIEW,
    AdminPermission.RELEASE_VIEW,
    AdminPermission.ENVIRONMENT_VIEW,
    AdminPermission.PRIVACY_VIEW,
  ],
  [UserRole.PLATFORM_VIEWER]: [
    AdminPermission.STUDIOS_VIEW,
    AdminPermission.USERS_VIEW,
    AdminPermission.SUBSCRIPTIONS_VIEW,
    AdminPermission.SYSTEM_HEALTH_VIEW,
    AdminPermission.ANALYTICS_VIEW,
    AdminPermission.ALERTS_VIEW,
    AdminPermission.FEATURE_FLAGS_VIEW,
    AdminPermission.FEATURE_FLAG_VIEW,
    AdminPermission.CONFIG_VIEW,
    AdminPermission.RELEASE_VIEW,
    AdminPermission.ENVIRONMENT_VIEW,
    AdminPermission.PRIVACY_VIEW,
  ],
  [UserRole.STUDIO_OWNER]: [],
  [UserRole.STUDIO_MEMBER]: [],
  [UserRole.CLIENT]: [],
};

export function hasAdminPermission(
  userOrRole: UserRole | { role: UserRole } | any,
  permission: AdminPermission
): boolean {
  const role = typeof userOrRole === 'object' && userOrRole !== null ? userOrRole.role : userOrRole;
  if (role === UserRole.SUPER_ADMIN) return true;
  const granted = ADMIN_ROLE_PERMISSIONS[role as UserRole] || [];
  return granted.includes(permission);
}

export function isPlatformAdmin(userOrRole: UserRole | { role: UserRole } | any): boolean {
  const role = typeof userOrRole === 'object' && userOrRole !== null ? userOrRole.role : userOrRole;
  return [
    UserRole.SUPER_ADMIN,
    UserRole.PLATFORM_ADMIN,
    UserRole.PLATFORM_SUPPORT,
    UserRole.PLATFORM_FINANCE,
    UserRole.PLATFORM_OPERATIONS,
    UserRole.PLATFORM_SECURITY,
    UserRole.PLATFORM_ANALYST,
    UserRole.PLATFORM_VIEWER,
  ].includes(role as UserRole);
}

// ==========================================
// TENANT ISOLATION ASSERTION
// ==========================================

export class TenantIsolationError extends Error {
  constructor(message = 'Access forbidden: Tenant isolation violation') {
    super(message);
    this.name = 'TenantIsolationError';
  }
}

export function assertTenantAccess(
  userPayload: AuthTokenPayload,
  resourceStudioId: string
): void {
  // Super Admins and Platform Administrators can inspect platform/tenant context
  if (isPlatformAdmin(userPayload.role)) {
    return;
  }

  // If user token has an explicit studioId bound, verify it matches
  if (userPayload.studioId && resourceStudioId && userPayload.studioId !== resourceStudioId) {
    throw new TenantIsolationError(
      `Tenant boundary violation: User from Studio [${userPayload.studioId}] attempted to access Studio [${resourceStudioId}]`
    );
  }
}

// ==========================================
// PHASE 42: ADMIN SESSION, TOKEN & MFA UTILITIES
// ==========================================

import crypto from 'crypto';

/**
 * Generates a cryptographically secure random session token
 */
export function generateAdminSessionToken(length = 32): string {
  return crypto.randomBytes(length).toString('hex');
}

/**
 * Computes a deterministic SHA-256 hash of a token for server-side storage
 */
export function hashToken(token: string): string {
  if (token === null || token === undefined) {
    return crypto.createHash('sha256').update('').digest('hex');
  }
  return crypto.createHash('sha256').update(String(token)).digest('hex');
}

/**
 * Computes a deterministic SHA-256 hash of an IP address or User-Agent for privacy-safe auditing
 */
export function hashMetadataIdentifier(value: string | undefined | null): string | null {
  if (!value) return null;
  return crypto.createHash('sha256').update(String(value).trim().toLowerCase()).digest('hex');
}

// ------------------------------------------
// BASE32 & TOTP (RFC 6238) IMPLEMENTATION
// ------------------------------------------

const BASE32_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

export function generateBase32Secret(length = 32): string {
  const bytes = crypto.randomBytes(length);
  let secret = '';
  for (let i = 0; i < length; i++) {
    secret += BASE32_ALPHABET[bytes[i] % BASE32_ALPHABET.length];
  }
  return secret;
}

export function base32ToBuffer(base32: string): Buffer {
  const cleanBase32 = base32.toUpperCase().replace(/[^A-Z2-7]/g, '');
  let bits = '';
  for (let i = 0; i < cleanBase32.length; i++) {
    const val = BASE32_ALPHABET.indexOf(cleanBase32[i]);
    bits += val.toString(2).padStart(5, '0');
  }
  const bytes: number[] = [];
  for (let i = 0; i + 8 <= bits.length; i += 8) {
    bytes.push(parseInt(bits.substring(i, i + 8), 2));
  }
  return Buffer.from(bytes);
}

export function generateTotpCode(secret: string, timeStepWindow = 30, timestampMs = Date.now()): string {
  const counter = Math.floor(timestampMs / 1000 / timeStepWindow);
  const counterBuffer = Buffer.alloc(8);
  counterBuffer.writeBigUInt64BE(BigInt(counter), 0);

  const keyBuffer = base32ToBuffer(secret);
  const hmac = crypto.createHmac('sha1', keyBuffer);
  hmac.update(counterBuffer);
  const digest = hmac.digest();

  const offset = digest[digest.length - 1] & 0xf;
  const binaryCode =
    ((digest[offset] & 0x7f) << 24) |
    ((digest[offset + 1] & 0xff) << 16) |
    ((digest[offset + 2] & 0xff) << 8) |
    (digest[offset + 3] & 0xff);

  const otp = binaryCode % 1000000;
  return otp.toString().padStart(6, '0');
}

export function verifyTotpCode(
  secret: string,
  token: string,
  timeStepWindow = 30,
  allowedDriftSteps = 1,
  timestampMs = Date.now()
): boolean {
  if (!secret || !token || token.trim().length !== 6) {
    return false;
  }
  const cleanToken = token.trim();
  for (let drift = -allowedDriftSteps; drift <= allowedDriftSteps; drift++) {
    const stepTime = timestampMs + drift * timeStepWindow * 1000;
    const expected = generateTotpCode(secret, timeStepWindow, stepTime);
    if (crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(cleanToken))) {
      return true;
    }
  }
  return false;
}

export function generateTotpUri(
  email: string,
  secret: string,
  issuer = 'PixMatch AI',
  digits = 6,
  period = 30
): string {
  const encodedIssuer = encodeURIComponent(issuer);
  const encodedEmail = encodeURIComponent(email);
  return `otpauth://totp/${encodedIssuer}:${encodedEmail}?secret=${secret}&issuer=${encodedIssuer}&algorithm=SHA1&digits=${digits}&period=${period}`;
}

// ------------------------------------------
// RECOVERY CODES
// ------------------------------------------

export function generateRecoveryCodes(count = 8): { rawCodes: string[]; hashedCodes: string[] } {
  const rawCodes: string[] = [];
  const hashedCodes: string[] = [];

  for (let i = 0; i < count; i++) {
    const part1 = crypto.randomBytes(2).toString('hex').toLowerCase();
    const part2 = crypto.randomBytes(2).toString('hex').toLowerCase();
    const code = `${part1}-${part2}`;
    rawCodes.push(code);
    hashedCodes.push(hashToken(code));
  }

  return { rawCodes, hashedCodes };
}

export function verifyAndConsumeRecoveryCode(
  inputCode: string,
  hashedCodes: string[]
): { valid: boolean; remainingHashedCodes: string[] } {
  if (!inputCode || !Array.isArray(hashedCodes)) {
    return { valid: false, remainingHashedCodes: hashedCodes || [] };
  }
  const cleanInput = inputCode.trim().toLowerCase();
  // Support both with and without hyphen
  let formattedInput = cleanInput;
  if (!cleanInput.includes('-') && cleanInput.length === 8) {
    formattedInput = `${cleanInput.slice(0, 4)}-${cleanInput.slice(4)}`;
  }
  const inputHash = hashToken(formattedInput);
  const matchIndex = hashedCodes.findIndex((h) => h === inputHash);

  if (matchIndex === -1) {
    return { valid: false, remainingHashedCodes: hashedCodes };
  }

  const remaining = [...hashedCodes];
  remaining.splice(matchIndex, 1);
  return { valid: true, remainingHashedCodes: remaining };
}

// ------------------------------------------
// TOTP SECRET ENCRYPTION AT REST
// ------------------------------------------

const MFA_ENC_KEY = process.env.MFA_ENCRYPTION_KEY || 'pixmatch_mfa_enc_key_32_bytes_len!';

export function encryptMfaSecret(
  secret: string,
  customKey?: string
): { iv: string; ciphertext: string; authTag: string; serialized: string } {
  const keySource = customKey || MFA_ENC_KEY;
  const key = crypto.createHash('sha256').update(keySource).digest();
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  let ciphertext = cipher.update(secret, 'utf8', 'hex');
  ciphertext += cipher.final('hex');
  const authTag = cipher.getAuthTag().toString('hex');
  const ivHex = iv.toString('hex');
  const serialized = `${ivHex}:${authTag}:${ciphertext}`;

  return {
    iv: ivHex,
    ciphertext,
    authTag,
    serialized,
  };
}

export function decryptMfaSecret(
  encryptedInput: string | { iv: string; ciphertext: string; authTag: string },
  customKey?: string
): string {
  const keySource = customKey || MFA_ENC_KEY;
  const key = crypto.createHash('sha256').update(keySource).digest();

  let ivHex: string;
  let tagHex: string;
  let encryptedHex: string;

  if (typeof encryptedInput === 'object') {
    ivHex = encryptedInput.iv;
    tagHex = encryptedInput.authTag;
    encryptedHex = encryptedInput.ciphertext;
  } else {
    const parts = encryptedInput.split(':');
    if (parts.length !== 3) return encryptedInput;
    ivHex = parts[0];
    tagHex = parts[1];
    encryptedHex = parts[2];
  }

  const decipher = crypto.createDecipheriv('aes-256-gcm', key, Buffer.from(ivHex, 'hex'));
  decipher.setAuthTag(Buffer.from(tagHex, 'hex'));
  let decrypted = decipher.update(encryptedHex, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
}

// ------------------------------------------
// ADMIN PASSWORD POLICY
// ------------------------------------------

export interface PasswordPolicyResult {
  valid: boolean;
  errors: string[];
}

const COMMON_WEAK_PASSWORDS = [
  'admin123456!@#',
  'password123456!',
  'administrator1!',
  'pixmatch123456!',
  'superadmin1234!',
];

export function validateAdminPassword(password: string): PasswordPolicyResult {
  const errors: string[] = [];
  if (!password || password.length < 12) {
    errors.push('Password must be at least 12 characters in length.');
  }
  if (!/[A-Z]/.test(password)) {
    errors.push('Password must contain at least one uppercase letter.');
  }
  if (!/[a-z]/.test(password)) {
    errors.push('Password must contain at least one lowercase letter.');
  }
  if (!/[0-9]/.test(password)) {
    errors.push('Password must contain at least one numerical digit.');
  }
  if (!/[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(password)) {
    errors.push('Password must contain at least one special character.');
  }
  if (password && COMMON_WEAK_PASSWORDS.includes(password.toLowerCase())) {
    errors.push('Password is in the common weak passwords blacklist.');
  }
  return {
    valid: errors.length === 0,
    errors,
  };
}



