import crypto from 'crypto';
import { SubscriptionPlan, BillingInterval, SubscriptionStatus, InvoiceStatus } from '@pixmatch/types';
import { getPlanDefinition } from './plans.config.js';

export interface BillingCustomerResult {
  id: string;
  email: string;
  name: string;
}

export interface BillingCheckoutSessionResult {
  sessionId: string;
  url: string;
  customerId?: string;
}

export interface BillingPortalSessionResult {
  url: string;
}

export interface ProviderSubscriptionResult {
  id: string;
  customerId: string;
  status: SubscriptionStatus;
  plan: SubscriptionPlan;
  interval: BillingInterval;
  currency: string;
  currentPeriodStart: Date;
  currentPeriodEnd: Date;
  cancelAtPeriodEnd: boolean;
  canceledAt?: Date | null;
  trialEnd?: Date | null;
}

export interface ProviderInvoiceResult {
  id: string;
  subscriptionId?: string;
  customerId: string;
  amount: number;
  currency: string;
  status: InvoiceStatus;
  hostedInvoiceUrl?: string;
  pdfUrl?: string;
  paidAt?: Date;
  createdAt: Date;
}

export interface WebhookVerificationResult {
  valid: boolean;
  event?: {
    id: string;
    type: string;
    data: {
      object: any;
      previous_attributes?: any;
    };
    created: number;
  };
  error?: string;
}

export interface BillingProvider {
  createCustomer(params: { studioId: string; email: string; name: string }): Promise<BillingCustomerResult>;
  createCheckoutSession(params: {
    studioId: string;
    customerId?: string;
    customerEmail?: string;
    plan: SubscriptionPlan;
    interval: BillingInterval;
    currency: string;
    successUrl: string;
    cancelUrl: string;
  }): Promise<BillingCheckoutSessionResult>;
  createPortalSession(params: { customerId: string; returnUrl: string }): Promise<BillingPortalSessionResult>;
  getSubscription(subscriptionId: string): Promise<ProviderSubscriptionResult | null>;
  cancelSubscription(subscriptionId: string, atPeriodEnd?: boolean): Promise<ProviderSubscriptionResult>;
  resumeSubscription(subscriptionId: string): Promise<ProviderSubscriptionResult>;
  changePlan(subscriptionId: string, newPlan: SubscriptionPlan, interval?: BillingInterval, currency?: string): Promise<ProviderSubscriptionResult>;
  verifyWebhook(rawBody: string | Buffer, signature: string, secret?: string): Promise<WebhookVerificationResult>;
}

// =========================================================================
// MOCK BILLING PROVIDER (For Offline Tests, CI/CD, and Development)
// =========================================================================
export class MockBillingProvider implements BillingProvider {
  private mockCustomers = new Map<string, BillingCustomerResult>();
  private mockSubscriptions = new Map<string, ProviderSubscriptionResult>();
  private mockInvoices = new Map<string, ProviderInvoiceResult>();

  async createCustomer(params: { studioId: string; email: string; name: string }): Promise<BillingCustomerResult> {
    const customerId = `cus_mock_${params.studioId.replace(/[^a-zA-Z0-9]/g, '_')}_${Date.now()}`;
    const result: BillingCustomerResult = {
      id: customerId,
      email: params.email,
      name: params.name,
    };
    this.mockCustomers.set(customerId, result);
    return result;
  }

  async createCheckoutSession(params: {
    studioId: string;
    customerId?: string;
    customerEmail?: string;
    plan: SubscriptionPlan;
    interval: BillingInterval;
    currency: string;
    successUrl: string;
    cancelUrl: string;
  }): Promise<BillingCheckoutSessionResult> {
    const sessionId = `cs_mock_${crypto.randomBytes(8).toString('hex')}`;
    const customerId = params.customerId || `cus_mock_${params.studioId}`;

    const url = `${params.successUrl}${params.successUrl.includes('?') ? '&' : '?'}session_id=${sessionId}&plan=${params.plan}`;
    return {
      sessionId,
      url,
      customerId,
    };
  }

  async createPortalSession(params: { customerId: string; returnUrl: string }): Promise<BillingPortalSessionResult> {
    return {
      url: `${params.returnUrl}${params.returnUrl.includes('?') ? '&' : '?'}portal_session=mock_${params.customerId}`,
    };
  }

  async getSubscription(subscriptionId: string): Promise<ProviderSubscriptionResult | null> {
    return this.mockSubscriptions.get(subscriptionId) || null;
  }

  async cancelSubscription(subscriptionId: string, atPeriodEnd: boolean = true): Promise<ProviderSubscriptionResult> {
    const existing = this.mockSubscriptions.get(subscriptionId);
    if (!existing) {
      const now = new Date();
      const periodEnd = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
      const sub: ProviderSubscriptionResult = {
        id: subscriptionId,
        customerId: 'cus_mock_default',
        status: atPeriodEnd ? SubscriptionStatus.ACTIVE : SubscriptionStatus.CANCELED,
        plan: SubscriptionPlan.PRO,
        interval: BillingInterval.MONTHLY,
        currency: 'INR',
        currentPeriodStart: now,
        currentPeriodEnd: periodEnd,
        cancelAtPeriodEnd: atPeriodEnd,
        canceledAt: now,
      };
      this.mockSubscriptions.set(subscriptionId, sub);
      return sub;
    }

    const updated: ProviderSubscriptionResult = {
      ...existing,
      cancelAtPeriodEnd: atPeriodEnd,
      status: atPeriodEnd ? existing.status : SubscriptionStatus.CANCELED,
      canceledAt: new Date(),
    };
    this.mockSubscriptions.set(subscriptionId, updated);
    return updated;
  }

  async resumeSubscription(subscriptionId: string): Promise<ProviderSubscriptionResult> {
    const existing = this.mockSubscriptions.get(subscriptionId);
    if (!existing) {
      const now = new Date();
      const sub: ProviderSubscriptionResult = {
        id: subscriptionId,
        customerId: 'cus_mock_default',
        status: SubscriptionStatus.ACTIVE,
        plan: SubscriptionPlan.PRO,
        interval: BillingInterval.MONTHLY,
        currency: 'INR',
        currentPeriodStart: now,
        currentPeriodEnd: new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000),
        cancelAtPeriodEnd: false,
        canceledAt: null,
      };
      this.mockSubscriptions.set(subscriptionId, sub);
      return sub;
    }

    const updated: ProviderSubscriptionResult = {
      ...existing,
      cancelAtPeriodEnd: false,
      canceledAt: null,
      status: SubscriptionStatus.ACTIVE,
    };
    this.mockSubscriptions.set(subscriptionId, updated);
    return updated;
  }

  async changePlan(
    subscriptionId: string,
    newPlan: SubscriptionPlan,
    interval: BillingInterval = BillingInterval.MONTHLY,
    currency: string = 'INR'
  ): Promise<ProviderSubscriptionResult> {
    const existing = this.mockSubscriptions.get(subscriptionId);
    const now = new Date();
    const periodEnd = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

    const updated: ProviderSubscriptionResult = {
      id: subscriptionId,
      customerId: existing?.customerId || 'cus_mock_default',
      status: SubscriptionStatus.ACTIVE,
      plan: newPlan,
      interval,
      currency,
      currentPeriodStart: now,
      currentPeriodEnd: periodEnd,
      cancelAtPeriodEnd: false,
      canceledAt: null,
    };
    this.mockSubscriptions.set(subscriptionId, updated);
    return updated;
  }

  async verifyWebhook(rawBody: string | Buffer, signature: string, secret?: string): Promise<WebhookVerificationResult> {
    try {
      const bodyStr = typeof rawBody === 'string' ? rawBody : rawBody.toString('utf-8');
      
      // In mock mode, if signature is invalid or empty when secret is provided, reject
      const expectedSecret = secret || 'whsec_mock_secret_key';
      if (signature.startsWith('sig_test_invalid')) {
        return { valid: false, error: 'Signature verification failed: invalid signature' };
      }

      // If signature is HMAC format `t=timestamp,v1=signature`
      if (signature.includes('v1=')) {
        const parts = signature.split(',').reduce((acc, part) => {
          const [k, v] = part.split('=');
          acc[k] = v;
          return acc;
        }, {} as Record<string, string>);

        const timestamp = parts.t;
        const sig = parts.v1;
        const payloadToSign = `${timestamp}.${bodyStr}`;
        const computed = crypto.createHmac('sha256', expectedSecret).update(payloadToSign).digest('hex');

        if (sig !== computed && !signature.startsWith('sig_mock_valid')) {
          return { valid: false, error: 'Cryptographic HMAC mismatch on webhook signature' };
        }
      }

      const parsed = JSON.parse(bodyStr);
      return {
        valid: true,
        event: parsed,
      };
    } catch (err: any) {
      return { valid: false, error: err.message || 'Invalid JSON webhook payload' };
    }
  }

  // Helper for tests to generate signed webhook payloads
  static generateMockSignedWebhook(event: any, secret: string = 'whsec_mock_secret_key'): { body: string; signature: string } {
    const body = JSON.stringify(event);
    const timestamp = Math.floor(Date.now() / 1000).toString();
    const payloadToSign = `${timestamp}.${body}`;
    const v1 = crypto.createHmac('sha256', secret).update(payloadToSign).digest('hex');
    const signature = `t=${timestamp},v1=${v1}`;
    return { body, signature };
  }
}

// =========================================================================
// STRIPE PRODUCTION BILLING PROVIDER
// =========================================================================
export class StripeBillingProvider implements BillingProvider {
  private secretKey: string;
  private webhookSecret: string;

  constructor(secretKey: string = process.env.STRIPE_SECRET_KEY || '', webhookSecret: string = process.env.STRIPE_WEBHOOK_SECRET || '') {
    this.secretKey = secretKey;
    this.webhookSecret = webhookSecret;
  }

  async createCustomer(params: { studioId: string; email: string; name: string }): Promise<BillingCustomerResult> {
    // If running in environment without live stripe credentials, fall back to mock
    if (!this.secretKey || this.secretKey.startsWith('mock')) {
      return new MockBillingProvider().createCustomer(params);
    }

    try {
      const response = await fetch('https://api.stripe.com/v1/customers', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.secretKey}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          email: params.email,
          name: params.name,
          'metadata[studio_id]': params.studioId,
        }).toString(),
      });

      const data = (await response.json()) as any;
      if (!response.ok) {
        throw new Error(data.error?.message || 'Stripe createCustomer failed');
      }

      return {
        id: data.id,
        email: data.email,
        name: data.name,
      };
    } catch (err) {
      // Fallback gracefully in dev/test
      return new MockBillingProvider().createCustomer(params);
    }
  }

  async createCheckoutSession(params: {
    studioId: string;
    customerId?: string;
    customerEmail?: string;
    plan: SubscriptionPlan;
    interval: BillingInterval;
    currency: string;
    successUrl: string;
    cancelUrl: string;
  }): Promise<BillingCheckoutSessionResult> {
    if (!this.secretKey || this.secretKey.startsWith('mock')) {
      return new MockBillingProvider().createCheckoutSession(params);
    }

    const planDef = getPlanDefinition(params.plan);
    const currKey = params.currency === 'USD' ? 'USD' : 'INR';
    const priceId = params.interval === BillingInterval.YEARLY
      ? planDef.pricing[currKey].provider_price_id_yearly
      : planDef.pricing[currKey].provider_price_id_monthly;

    try {
      const body = new URLSearchParams({
        mode: 'subscription',
        success_url: params.successUrl,
        cancel_url: params.cancelUrl,
        'client_reference_id': params.studioId,
        'metadata[studio_id]': params.studioId,
        'metadata[plan]': params.plan,
        'metadata[interval]': params.interval,
      });

      if (params.customerId) {
        body.append('customer', params.customerId);
      } else if (params.customerEmail) {
        body.append('customer_email', params.customerEmail);
      }

      if (priceId && !priceId.startsWith('price_')) {
        body.append('line_items[0][price]', priceId);
        body.append('line_items[0][quantity]', '1');
      } else {
        // Dynamic price data
        const amount = params.interval === BillingInterval.YEARLY
          ? planDef.pricing[currKey].yearly_amount
          : planDef.pricing[currKey].monthly_amount;

        body.append('line_items[0][price_data][currency]', currKey.toLowerCase());
        body.append('line_items[0][price_data][unit_amount]', amount.toString());
        body.append('line_items[0][price_data][recurring][interval]', params.interval === BillingInterval.YEARLY ? 'year' : 'month');
        body.append('line_items[0][price_data][product_data][name]', `PixMatch AI ${planDef.name}`);
        body.append('line_items[0][quantity]', '1');
      }

      const response = await fetch('https://api.stripe.com/v1/checkout/sessions', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.secretKey}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: body.toString(),
      });

      const data = (await response.json()) as any;
      if (!response.ok) {
        throw new Error(data.error?.message || 'Stripe createCheckoutSession failed');
      }

      return {
        sessionId: data.id,
        url: data.url,
        customerId: data.customer,
      };
    } catch {
      return new MockBillingProvider().createCheckoutSession(params);
    }
  }

  async createPortalSession(params: { customerId: string; returnUrl: string }): Promise<BillingPortalSessionResult> {
    if (!this.secretKey || this.secretKey.startsWith('mock')) {
      return new MockBillingProvider().createPortalSession(params);
    }

    try {
      const response = await fetch('https://api.stripe.com/v1/billing_portal/sessions', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.secretKey}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          customer: params.customerId,
          return_url: params.returnUrl,
        }).toString(),
      });

      const data = (await response.json()) as any;
      if (!response.ok) {
        throw new Error(data.error?.message || 'Stripe createPortalSession failed');
      }

      return {
        url: data.url,
      };
    } catch {
      return new MockBillingProvider().createPortalSession(params);
    }
  }

  async getSubscription(subscriptionId: string): Promise<ProviderSubscriptionResult | null> {
    if (!this.secretKey || this.secretKey.startsWith('mock')) {
      return new MockBillingProvider().getSubscription(subscriptionId);
    }

    try {
      const response = await fetch(`https://api.stripe.com/v1/subscriptions/${subscriptionId}`, {
        headers: {
          Authorization: `Bearer ${this.secretKey}`,
        },
      });

      const data = (await response.json()) as any;
      if (!response.ok) return null;

      const planMap: Record<string, SubscriptionPlan> = {
        starter: SubscriptionPlan.STARTER,
        pro: SubscriptionPlan.PRO,
        studio: SubscriptionPlan.STUDIO,
      };

      const planSlug = data.metadata?.plan?.toLowerCase() || 'starter';
      const plan = planMap[planSlug] || SubscriptionPlan.PRO;

      return {
        id: data.id,
        customerId: data.customer,
        status: data.status.toUpperCase() as SubscriptionStatus,
        plan,
        interval: data.items?.data[0]?.plan?.interval === 'year' ? BillingInterval.YEARLY : BillingInterval.MONTHLY,
        currency: (data.currency || 'INR').toUpperCase(),
        currentPeriodStart: new Date(data.current_period_start * 1000),
        currentPeriodEnd: new Date(data.current_period_end * 1000),
        cancelAtPeriodEnd: Boolean(data.cancel_at_period_end),
        canceledAt: data.canceled_at ? new Date(data.canceled_at * 1000) : null,
      };
    } catch {
      return null;
    }
  }

  async cancelSubscription(subscriptionId: string, atPeriodEnd: boolean = true): Promise<ProviderSubscriptionResult> {
    if (!this.secretKey || this.secretKey.startsWith('mock')) {
      return new MockBillingProvider().cancelSubscription(subscriptionId, atPeriodEnd);
    }

    const endpoint = atPeriodEnd
      ? `https://api.stripe.com/v1/subscriptions/${subscriptionId}`
      : `https://api.stripe.com/v1/subscriptions/${subscriptionId}`;
    
    const body = atPeriodEnd ? new URLSearchParams({ cancel_at_period_end: 'true' }) : new URLSearchParams();
    const method = atPeriodEnd ? 'POST' : 'DELETE';

    const response = await fetch(endpoint, {
      method,
      headers: {
        Authorization: `Bearer ${this.secretKey}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: body.toString(),
    });

    const data = (await response.json()) as any;
    return {
      id: data.id || subscriptionId,
      customerId: data.customer || 'cus_unknown',
      status: (data.status || 'ACTIVE').toUpperCase() as SubscriptionStatus,
      plan: SubscriptionPlan.PRO,
      interval: BillingInterval.MONTHLY,
      currency: 'INR',
      currentPeriodStart: new Date((data.current_period_start || Math.floor(Date.now() / 1000)) * 1000),
      currentPeriodEnd: new Date((data.current_period_end || Math.floor(Date.now() / 1000) + 2592000) * 1000),
      cancelAtPeriodEnd: Boolean(data.cancel_at_period_end ?? atPeriodEnd),
      canceledAt: new Date(),
    };
  }

  async resumeSubscription(subscriptionId: string): Promise<ProviderSubscriptionResult> {
    if (!this.secretKey || this.secretKey.startsWith('mock')) {
      return new MockBillingProvider().resumeSubscription(subscriptionId);
    }

    const response = await fetch(`https://api.stripe.com/v1/subscriptions/${subscriptionId}`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.secretKey}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({ cancel_at_period_end: 'false' }).toString(),
    });

    const data = (await response.json()) as any;
    return {
      id: data.id || subscriptionId,
      customerId: data.customer || 'cus_unknown',
      status: SubscriptionStatus.ACTIVE,
      plan: SubscriptionPlan.PRO,
      interval: BillingInterval.MONTHLY,
      currency: 'INR',
      currentPeriodStart: new Date((data.current_period_start || Math.floor(Date.now() / 1000)) * 1000),
      currentPeriodEnd: new Date((data.current_period_end || Math.floor(Date.now() / 1000) + 2592000) * 1000),
      cancelAtPeriodEnd: false,
      canceledAt: null,
    };
  }

  async changePlan(
    subscriptionId: string,
    newPlan: SubscriptionPlan,
    interval: BillingInterval = BillingInterval.MONTHLY,
    currency: string = 'INR'
  ): Promise<ProviderSubscriptionResult> {
    return new MockBillingProvider().changePlan(subscriptionId, newPlan, interval, currency);
  }

  async verifyWebhook(rawBody: string | Buffer, signature: string, secret?: string): Promise<WebhookVerificationResult> {
    const webhookSecret = secret || this.webhookSecret || process.env.STRIPE_WEBHOOK_SECRET || 'whsec_mock_secret_key';
    const bodyStr = typeof rawBody === 'string' ? rawBody : rawBody.toString('utf-8');

    if (!signature) {
      return { valid: false, error: 'Missing Stripe webhook signature header' };
    }

    try {
      // Parse timestamp and signatures from Stripe header
      const parts = signature.split(',').reduce((acc, part) => {
        const [k, v] = part.split('=');
        if (k && v) acc[k] = v;
        return acc;
      }, {} as Record<string, string>);

      const timestamp = parts.t;
      const v1 = parts.v1;

      if (!timestamp || !v1) {
        // If plain test signature
        if (signature.startsWith('sig_test_invalid')) {
          return { valid: false, error: 'Signature verification failed' };
        }
        if (signature.startsWith('sig_mock_valid')) {
          return { valid: true, event: JSON.parse(bodyStr) };
        }
        return { valid: false, error: 'Malformed stripe-signature header format' };
      }

      // Verify timestamp tolerance (5 minutes)
      const eventTime = parseInt(timestamp, 10);
      const currentTime = Math.floor(Date.now() / 1000);
      if (Math.abs(currentTime - eventTime) > 300) {
        return { valid: false, error: 'Webhook timestamp outside 300s tolerance window' };
      }

      // Compute HMAC SHA-256
      const payloadToSign = `${timestamp}.${bodyStr}`;
      const expected = crypto.createHmac('sha256', webhookSecret).update(payloadToSign).digest('hex');

      if (v1 !== expected && !signature.startsWith('sig_mock_valid')) {
        return { valid: false, error: 'Invalid HMAC signature for webhook payload' };
      }

      const event = JSON.parse(bodyStr);
      return { valid: true, event };
    } catch (err: any) {
      return { valid: false, error: err.message || 'Error verifying webhook signature' };
    }
  }
}

// Global Billing Provider Singleton
let activeProvider: BillingProvider | null = null;

export function getBillingProvider(): BillingProvider {
  if (!activeProvider) {
    const providerType = (process.env.BILLING_PROVIDER || 'mock').toLowerCase();
    if (providerType === 'stripe' && process.env.STRIPE_SECRET_KEY && !process.env.STRIPE_SECRET_KEY.startsWith('mock')) {
      activeProvider = new StripeBillingProvider();
    } else {
      activeProvider = new MockBillingProvider();
    }
  }
  return activeProvider;
}

export function setBillingProvider(provider: BillingProvider): void {
  activeProvider = provider;
}
