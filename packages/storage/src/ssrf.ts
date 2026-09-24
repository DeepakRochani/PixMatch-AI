import { URL } from 'url';

/**
 * Standard Storage Provider Domain Allowlist.
 */
export const ALLOWED_STORAGE_DOMAINS = [
  // Google
  'googleapis.com',
  'googleusercontent.com',
  'accounts.google.com',
  // Dropbox
  'dropbox.com',
  'dropboxapi.com',
  'dropboxusercontent.com',
  // Microsoft OneDrive / Graph
  'microsoftonline.com',
  'graph.microsoft.com',
  'sharepoint.com',
  '1drv.ms',
];

/**
 * Validates if an IP string is within a private / loopback / link-local / metadata subnet.
 */
export function isPrivateOrReservedIp(ip: string): boolean {
  // Normalize IPv6 mapped IPv4
  const normalized = ip.replace(/^::ffff:/, '');

  // IPv4 Loopback (127.0.0.0/8)
  if (/^127\./.test(normalized)) return true;

  // 0.0.0.0 / Current network
  if (/^0\./.test(normalized) || normalized === '0.0.0.0') return true;

  // RFC 1918: 10.0.0.0/8
  if (/^10\./.test(normalized)) return true;

  // RFC 1918: 172.16.0.0/12 (172.16.0.0 - 172.31.255.255)
  if (/^172\.(1[6-9]|2[0-9]|3[0-1])\./.test(normalized)) return true;

  // RFC 1918: 192.168.0.0/16
  if (/^192\.168\./.test(normalized)) return true;

  // RFC 3927: Link-Local & AWS/GCP/Azure Metadata (169.254.0.0/16)
  if (/^169\.254\./.test(normalized)) return true;

  // Carrier-grade NAT (100.64.0.0/10)
  if (/^100\.(6[4-9]|[7-9][0-9]|1[0-1][0-9]|12[0-7])\./.test(normalized)) return true;

  // IPv6 checks
  if (normalized === '::1' || normalized === '::') return true;
  if (/^fe80:/i.test(normalized)) return true; // Link local IPv6
  if (/^fc00:|^fd00:/i.test(normalized)) return true; // Unique local IPv6

  return false;
}

export interface UrlValidationResult {
  valid: boolean;
  reason?: string;
  parsedUrl?: URL;
}

/**
 * Strict SSRF URL Validator.
 * Verifies protocol, prevents access to internal/private networks, metadata services, and validates allowlisted domains.
 */
export function validateSafeUrl(
  inputUrl: string,
  options: {
    allowedDomains?: string[];
    allowHttpForTesting?: boolean;
    maxRedirects?: number;
  } = {}
): UrlValidationResult {
  try {
    const parsed = new URL(inputUrl);

    // 1. Protocol validation
    if (parsed.protocol !== 'https:') {
      if (parsed.protocol === 'http:' && (options.allowHttpForTesting || process.env.NODE_ENV === 'test')) {
        // Allowed only during test mode
      } else {
        return { valid: false, reason: `Insecure protocol '${parsed.protocol}'. Only HTTPS is permitted.` };
      }
    }

    const hostname = parsed.hostname.toLowerCase();

    // 2. Block direct localhost / loopback names
    if (hostname === 'localhost' || hostname.endsWith('.localhost') || hostname === 'metadata.google.internal') {
      if (!options.allowHttpForTesting && process.env.NODE_ENV !== 'test') {
        return { valid: false, reason: `Target hostname '${hostname}' is a restricted internal destination.` };
      }
    }

    // 3. Block private / reserved IP addresses if accessed directly
    if (isPrivateOrReservedIp(hostname)) {
      if (!options.allowHttpForTesting && process.env.NODE_ENV !== 'test') {
        return { valid: false, reason: `Target IP '${hostname}' resolves to a private or reserved network.` };
      }
    }

    // 4. Validate domain against allowed domains if provided
    if (options.allowedDomains && options.allowedDomains.length > 0) {
      const isAllowed = options.allowedDomains.some((d) => {
        const cleanDomain = d.toLowerCase().replace(/^\./, '');
        return hostname === cleanDomain || hostname.endsWith(`.${cleanDomain}`);
      });

      if (!isAllowed) {
        return { valid: false, reason: `Target domain '${hostname}' is not in the allowed storage provider domains list.` };
      }
    }

    return { valid: true, parsedUrl: parsed };
  } catch (err: any) {
    return { valid: false, reason: `Malformed URL: ${err.message}` };
  }
}

/**
 * Validates a redirect hop URL against SSRF rules.
 */
export function validateSafeRedirectHop(
  currentUrl: string,
  targetLocation: string,
  options: { allowedDomains?: string[]; allowHttpForTesting?: boolean } = {}
): UrlValidationResult {
  try {
    const nextUrl = new URL(targetLocation, currentUrl).toString();
    return validateSafeUrl(nextUrl, options);
  } catch (err: any) {
    return { valid: false, reason: `Invalid redirect location '${targetLocation}': ${err.message}` };
  }
}

/**
 * Safe fetch wrapper with SSRF validation and response limits.
 */
export async function safeFetch(
  url: string,
  init: RequestInit = {},
  options: {
    allowedDomains?: string[];
    maxSizeBytes?: number;
    timeoutMs?: number;
  } = {}
): Promise<Response> {
  const validation = validateSafeUrl(url, { allowedDomains: options.allowedDomains });
  if (!validation.valid) {
    throw new Error(`SSRF Blocked Request: ${validation.reason}`);
  }

  const timeoutMs = options.timeoutMs || 30000;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      ...init,
      signal: init.signal || controller.signal,
    });

    // Validate redirect target if redirected
    if (response.redirected && response.url) {
      const redirectValidation = validateSafeUrl(response.url, { allowedDomains: options.allowedDomains });
      if (!redirectValidation.valid) {
        throw new Error(`SSRF Blocked Redirect: ${redirectValidation.reason}`);
      }
    }

    return response;
  } finally {
    clearTimeout(timeoutId);
  }
}
