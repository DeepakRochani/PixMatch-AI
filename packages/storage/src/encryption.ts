import crypto from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12; // 96-bit IV recommended for AES-GCM
const AUTH_TAG_LENGTH = 16; // 128-bit auth tag
const CURRENT_KEY_VERSION = 'v1';
const DEV_FALLBACK_KEY = 'pixmatch_default_master_encryption_key_32_bytes_len!!';

/**
 * Key version registry for seamless zero-downtime key rotation.
 */
const keyRegistry: Map<string, Buffer> = new Map();

/**
 * Resolves a 32-byte (256-bit) encryption key from the environment or input.
 */
export function deriveKeyBuffer(secret: string): Buffer {
  if (!secret) {
    throw new Error('Encryption secret cannot be empty');
  }

  if (secret.length === 64 && /^[0-9a-fA-F]+$/.test(secret)) {
    // 64-char hex string representing 32 raw bytes
    return Buffer.from(secret, 'hex');
  }

  // Use SHA-256 to deterministically derive a strict 32-byte key
  return crypto.createHash('sha256').update(secret).digest();
}

/**
 * Validates that production encryption key configuration meets enterprise security criteria.
 */
export function validateEncryptionKeyConfig(isProduction = process.env.NODE_ENV === 'production'): { valid: boolean; message?: string } {
  const envKey = process.env.STORAGE_ENCRYPTION_KEY;

  if (isProduction) {
    if (!envKey) {
      throw new Error('SECURITY FATAL: STORAGE_ENCRYPTION_KEY must be set in production environment.');
    }
    if (envKey === DEV_FALLBACK_KEY || envKey.includes('default') || envKey.length < 32) {
      throw new Error('SECURITY FATAL: STORAGE_ENCRYPTION_KEY must be at least 32 characters or 64 hex characters of high entropy in production.');
    }
  }

  return { valid: true };
}

/**
 * Registers an encryption key for a specific version tag to support key rotation.
 */
export function registerKeyVersion(version: string, keySecret: string) {
  keyRegistry.set(version, deriveKeyBuffer(keySecret));
}

/**
 * Retrieves the encryption key buffer for a given version or default.
 */
function getEncryptionKey(version = CURRENT_KEY_VERSION, customKey?: string): { key: Buffer; version: string } {
  if (customKey) {
    return { key: deriveKeyBuffer(customKey), version };
  }

  if (keyRegistry.has(version)) {
    return { key: keyRegistry.get(version)!, version };
  }

  const envKey = process.env[`STORAGE_ENCRYPTION_KEY_${version.toUpperCase()}`] ||
    process.env.STORAGE_ENCRYPTION_KEY ||
    process.env.JWT_SECRET ||
    DEV_FALLBACK_KEY;

  const keyBuffer = deriveKeyBuffer(envKey);
  keyRegistry.set(version, keyBuffer);
  return { key: keyBuffer, version };
}

/**
 * Encrypts a sensitive string (e.g. OAuth tokens) using AES-256-GCM.
 * Output format: `v1:ivHex:authTagHex:encryptedHex`
 */
export function encryptToken(plaintext: string, keyOrVersion?: string): string {
  if (!plaintext) return '';

  let keyVersion = CURRENT_KEY_VERSION;
  let customKey: string | undefined = undefined;

  if (keyOrVersion) {
    if (keyOrVersion.startsWith('v') && keyOrVersion.length <= 4) {
      keyVersion = keyOrVersion;
    } else {
      customKey = keyOrVersion;
    }
  }

  const { key: cipherKey, version } = getEncryptionKey(keyVersion, customKey);
  const iv = crypto.randomBytes(IV_LENGTH);

  const cipher = crypto.createCipheriv(ALGORITHM, cipherKey, iv, {
    authTagLength: AUTH_TAG_LENGTH,
  });

  let encrypted = cipher.update(plaintext, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const authTag = cipher.getAuthTag();

  return `${version}:${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
}

/**
 * Decrypts an AES-256-GCM encrypted payload.
 * Supports both versioned `v1:iv:tag:data` and legacy `iv:tag:data` formats.
 * Throws an error on tampering, key mismatch, or corruption.
 */
export function decryptToken(encryptedPayload: string, customKey?: string): string {
  if (!encryptedPayload) return '';

  const parts = encryptedPayload.split(':');
  let version = CURRENT_KEY_VERSION;
  let ivHex: string;
  let tagHex: string;
  let dataHex: string;

  if (parts.length === 4) {
    // Versioned format: v1:iv:tag:data
    [version, ivHex, tagHex, dataHex] = parts;
  } else if (parts.length === 3) {
    // Legacy format: iv:tag:data
    [ivHex, tagHex, dataHex] = parts;
  } else {
    throw new Error('Invalid encrypted payload format. Expected [version:]iv:tag:data');
  }

  // Strict validation of hex formats
  if (!/^[0-9a-fA-F]{24}$/.test(ivHex)) {
    throw new Error('Invalid IV format: IV must be exactly 12 bytes in hex (24 chars)');
  }
  if (!/^[0-9a-fA-F]{32}$/.test(tagHex)) {
    throw new Error('Invalid Auth Tag format: Tag must be exactly 16 bytes in hex (32 chars)');
  }
  if (dataHex.length > 0 && !/^[0-9a-fA-F]+$/.test(dataHex)) {
    throw new Error('Invalid Ciphertext format: Data must be valid hex');
  }

  const { key: cipherKey } = getEncryptionKey(version, customKey);
  const iv = Buffer.from(ivHex, 'hex');
  const tag = Buffer.from(tagHex, 'hex');

  try {
    const decipher = crypto.createDecipheriv(ALGORITHM, cipherKey, iv, {
      authTagLength: AUTH_TAG_LENGTH,
    });
    decipher.setAuthTag(tag);

    let decrypted = decipher.update(dataHex, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  } catch (err: any) {
    throw new Error(`Token decryption failed: integrity verification failed or key mismatch (${err.message})`);
  }
}

/**
 * Encrypts any JSON-serializable object into an encrypted token string.
 */
export function encryptJson<T>(data: T, keyOrVersion?: string): string {
  return encryptToken(JSON.stringify(data), keyOrVersion);
}

/**
 * Decrypts an encrypted token string into a parsed JSON object.
 */
export function decryptJson<T>(encryptedPayload: string, customKey?: string): T {
  const jsonStr = decryptToken(encryptedPayload, customKey);
  return JSON.parse(jsonStr) as T;
}

export const encryptTokens = encryptJson;
export const decryptTokens = decryptJson;
export const encryptText = encryptToken;
export const decryptText = decryptToken;
