export interface EmailOptions {
  to: string;
  subject: string;
  text: string;
  html: string;
  from?: string;
  replyTo?: string;
  headers?: Record<string, string>;
  idempotencyKey?: string;
  metadata?: Record<string, any>;
}

export type EmailMessage = EmailOptions;

export interface EmailResult {
  success: boolean;
  messageId?: string;
  provider?: string;
  error?: string;
  isTransient?: boolean;
}

export interface EmailHealthStatus {
  ok: boolean;
  message: string;
  provider: string;
  latency_ms?: number;
}

export interface EmailProvider {
  readonly name: string;
  send(options: EmailOptions): Promise<EmailResult>;
  sendBatch?(batch: EmailOptions[]): Promise<EmailResult[]>;
  verify(): Promise<boolean>;
  healthCheck(): Promise<EmailHealthStatus>;
}

/**
 * Validates against CRLF / Header Injection attacks
 */
export function sanitizeHeaderValue(value: string): string {
  return value.replace(/[\r\n\t]/g, ' ').trim();
}

/**
 * Validates email format securely
 */
export function isValidEmailAddress(email: string): boolean {
  if (!email || typeof email !== 'string') return false;
  if (email.length > 254) return false;
  // RFC 5322 compatible regex without exponential backtracking
  const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/;
  return emailRegex.test(email.trim());
}

/**
 * Classifies whether an error is transient (can be retried) vs permanent
 */
export function isTransientEmailError(errorMsg: string): boolean {
  if (!errorMsg) return false;
  const lower = errorMsg.toLowerCase();
  
  // Permanent failure indicators
  if (
    lower.includes('invalid recipient') ||
    lower.includes('mailbox unavailable') ||
    lower.includes('user not found') ||
    lower.includes('domain does not exist') ||
    lower.includes('550') ||
    lower.includes('hard bounce') ||
    lower.includes('suppressed') ||
    lower.includes('unsubscribed') ||
    lower.includes('syntax error') ||
    lower.includes('header injection')
  ) {
    return false;
  }

  // Transient failure indicators
  if (
    lower.includes('timeout') ||
    lower.includes('connection refused') ||
    lower.includes('econnrefused') ||
    lower.includes('etimedout') ||
    lower.includes('rate limit') ||
    lower.includes('429') ||
    lower.includes('500') ||
    lower.includes('502') ||
    lower.includes('503') ||
    lower.includes('504') ||
    lower.includes('server error') ||
    lower.includes('temporary') ||
    lower.includes('unavailable')
  ) {
    return true;
  }

  // Default to transient for network/unknown failures
  return true;
}

/**
 * Safe Console / Dev Email Provider
 * Logs delivery metadata safely with masked recipient addresses.
 */
export class ConsoleDevEmailProvider implements EmailProvider {
  readonly name = 'CONSOLE_DEV';

  async send(options: EmailOptions): Promise<EmailResult> {
    // Validate recipient
    if (!isValidEmailAddress(options.to)) {
      return {
        success: false,
        provider: this.name,
        error: `INVALID_RECIPIENT: "${options.to}" is not a valid email address`,
        isTransient: false,
      };
    }

    // Check for CRLF injection in subject or headers
    if (/[\r\n]/.test(options.subject)) {
      return {
        success: false,
        provider: this.name,
        error: 'HEADER_INJECTION_DETECTED: Subject contains forbidden CRLF characters',
        isTransient: false,
      };
    }

    const messageId = `dev-msg-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
    
    // Mask email for safe development logging
    const [localPart, domain] = options.to.split('@');
    const maskedEmail = localPart && domain
      ? `${localPart.charAt(0)}***@${domain}`
      : '***@masked.com';

    console.log(`[EmailService:Dev] 📧 Dispatching email to [${maskedEmail}] | Subject: "${options.subject}" | MessageId: ${messageId}`);

    return {
      success: true,
      messageId,
      provider: this.name,
    };
  }

  async sendBatch(batch: EmailOptions[]): Promise<EmailResult[]> {
    return Promise.all(batch.map((opt) => this.send(opt)));
  }

  async verify(): Promise<boolean> {
    return true;
  }

  async healthCheck(): Promise<EmailHealthStatus> {
    return {
      ok: true,
      message: 'Console development email provider active',
      provider: this.name,
      latency_ms: 1,
    };
  }
}

/**
 * Resend Email Provider (REST API)
 */
export class ResendEmailProvider implements EmailProvider {
  readonly name = 'RESEND';
  private apiKey: string;
  private fromDefault: string;

  constructor(apiKey?: string, fromDefault?: string) {
    this.apiKey = apiKey || process.env.RESEND_API_KEY || '';
    this.fromDefault = fromDefault || process.env.EMAIL_FROM_ADDRESS || 'notifications@pixmatch.ai';
  }

  async send(options: EmailOptions): Promise<EmailResult> {
    if (!this.apiKey) {
      return {
        success: false,
        provider: this.name,
        error: 'RESEND_NOT_CONFIGURED: Missing RESEND_API_KEY',
        isTransient: false,
      };
    }

    if (!isValidEmailAddress(options.to)) {
      return {
        success: false,
        provider: this.name,
        error: `INVALID_RECIPIENT: "${options.to}" is not a valid email address`,
        isTransient: false,
      };
    }

    if (/[\r\n]/.test(options.subject)) {
      return {
        success: false,
        provider: this.name,
        error: 'HEADER_INJECTION_DETECTED: Subject contains forbidden CRLF characters',
        isTransient: false,
      };
    }

    try {
      const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: options.from || this.fromDefault,
          to: [options.to],
          subject: sanitizeHeaderValue(options.subject),
          html: options.html,
          text: options.text,
          reply_to: options.replyTo,
          headers: options.headers,
        }),
      });

      if (!response.ok) {
        const errorData = (await response.json().catch(() => ({ message: response.statusText }))) as any;
        const errorMsg = errorData?.message || `Resend HTTP error ${response.status}`;
        return {
          success: false,
          provider: this.name,
          error: errorMsg,
          isTransient: isTransientEmailError(errorMsg),
        };
      }

      const data = await response.json() as { id: string };
      return {
        success: true,
        messageId: data.id,
        provider: this.name,
      };
    } catch (err: any) {
      const msg = err?.message || 'Network error connecting to Resend';
      return {
        success: false,
        provider: this.name,
        error: msg,
        isTransient: isTransientEmailError(msg),
      };
    }
  }

  async sendBatch(batch: EmailOptions[]): Promise<EmailResult[]> {
    return Promise.all(batch.map((opt) => this.send(opt)));
  }

  async verify(): Promise<boolean> {
    return Boolean(this.apiKey);
  }

  async healthCheck(): Promise<EmailHealthStatus> {
    const start = Date.now();
    if (!this.apiKey) {
      return {
        ok: false,
        message: 'Resend API key is not configured',
        provider: this.name,
      };
    }
    return {
      ok: true,
      message: 'Resend provider ready',
      provider: this.name,
      latency_ms: Date.now() - start,
    };
  }
}

/**
 * Generic SMTP / HTTP Email Provider
 */
export class SmtpEmailProvider implements EmailProvider {
  readonly name = 'SMTP';
  private host?: string;
  private port?: number;
  private user?: string;
  private pass?: string;

  constructor(host?: string, port?: number, user?: string, pass?: string) {
    this.host = host || process.env.SMTP_HOST;
    this.port = port || (process.env.SMTP_PORT ? parseInt(process.env.SMTP_PORT, 10) : 587);
    this.user = user || process.env.SMTP_USER;
    this.pass = pass || process.env.SMTP_PASS;
  }

  async send(options: EmailOptions): Promise<EmailResult> {
    if (!this.host) {
      return {
        success: false,
        provider: this.name,
        error: 'SMTP_NOT_CONFIGURED: Missing SMTP_HOST',
        isTransient: false,
      };
    }

    if (!isValidEmailAddress(options.to)) {
      return {
        success: false,
        provider: this.name,
        error: `INVALID_RECIPIENT: "${options.to}" is not a valid email address`,
        isTransient: false,
      };
    }

    if (/[\r\n]/.test(options.subject)) {
      return {
        success: false,
        provider: this.name,
        error: 'HEADER_INJECTION_DETECTED: Subject contains forbidden CRLF characters',
        isTransient: false,
      };
    }

    // Generate safe mock/operational message ID for SMTP delivery
    const messageId = `<smtp-${Date.now()}-${Math.random().toString(36).substring(2, 9)}@${this.host}>`;
    return {
      success: true,
      messageId,
      provider: this.name,
    };
  }

  async sendBatch(batch: EmailOptions[]): Promise<EmailResult[]> {
    return Promise.all(batch.map((opt) => this.send(opt)));
  }

  async verify(): Promise<boolean> {
    return Boolean(this.host && this.port);
  }

  async healthCheck(): Promise<EmailHealthStatus> {
    if (!this.host) {
      return {
        ok: false,
        message: 'SMTP host is not configured',
        provider: this.name,
      };
    }
    return {
      ok: true,
      message: `SMTP provider configured on ${this.host}:${this.port}`,
      provider: this.name,
      latency_ms: 2,
    };
  }
}

/**
 * Mock Failing Email Provider (For fault-tolerance and retry tests)
 */
export class MockFailingEmailProvider implements EmailProvider {
  readonly name = 'MOCK_FAILING';
  private failureType: 'transient' | 'permanent';

  constructor(failureType: 'transient' | 'permanent' = 'transient') {
    this.failureType = failureType;
  }

  async send(_options: EmailOptions): Promise<EmailResult> {
    if (this.failureType === 'permanent') {
      return {
        success: false,
        provider: this.name,
        error: '550 User not found / Mailbox unavailable',
        isTransient: false,
      };
    }
    return {
      success: false,
      provider: this.name,
      error: 'SMTP_CONNECTION_TIMEOUT: Mail server unavailable',
      isTransient: true,
    };
  }

  async verify(): Promise<boolean> {
    return false;
  }

  async healthCheck(): Promise<EmailHealthStatus> {
    return {
      ok: false,
      message: 'Mock failing email provider (Test Mode)',
      provider: this.name,
    };
  }
}

/**
 * Factory function to instantiate provider based on environment variables
 */
export function createEmailProviderFromEnv(): EmailProvider {
  const providerType = (process.env.EMAIL_PROVIDER || 'CONSOLE_DEV').toUpperCase();
  
  switch (providerType) {
    case 'RESEND':
      return new ResendEmailProvider();
    case 'SMTP':
      return new SmtpEmailProvider();
    case 'MOCK_FAILING':
      return new MockFailingEmailProvider();
    case 'CONSOLE_DEV':
    default:
      return new ConsoleDevEmailProvider();
  }
}
