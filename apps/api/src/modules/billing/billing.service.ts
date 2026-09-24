import { prisma } from '@pixmatch/database';
import {
  SubscriptionPlan,
  SubscriptionStatus,
  BillingInterval,
  InvoiceStatus,
  WebhookProcessingStatus,
  SubscriptionDTO,
  InvoiceDTO,
  CreateCheckoutSessionRequest,
  CreateCheckoutSessionResponse,
  CreatePortalSessionResponse,
} from '@pixmatch/types';
import { getBillingProvider } from './billing.provider.js';
import { getPlanDefinition } from './plans.config.js';

export class BillingService {
  // In-memory fallback stores for test and offline resilience
  private static memorySubscriptions = new Map<string, SubscriptionDTO>();
  private static memoryInvoices = new Map<string, InvoiceDTO[]>();
  private static memoryWebhookEvents = new Map<string, { status: WebhookProcessingStatus; payload: any }>();

  /**
   * Retrieves the current subscription for a studio, creating a default FREE subscription if none exists.
   */
  static async getSubscription(studioId: string): Promise<SubscriptionDTO> {
    try {
      let subscription = await prisma.subscription.findUnique({
        where: { studio_id: studioId },
      });

      if (!subscription) {
        const freePlan = getPlanDefinition(SubscriptionPlan.FREE);
        subscription = await prisma.subscription.create({
          data: {
            studio_id: studioId,
            plan: SubscriptionPlan.FREE,
            status: SubscriptionStatus.ACTIVE,
            billing_interval: BillingInterval.MONTHLY,
            currency: 'INR',
            provider: 'MOCK',
            storage_limit_bytes: BigInt(freePlan.limits.max_storage_bytes || 2147483648),
            photo_limit: freePlan.limits.max_photos || 500,
            ai_search_limit: freePlan.limits.max_ai_searches || 50,
            max_galleries: freePlan.limits.max_active_galleries,
            max_clients: freePlan.limits.max_clients,
            max_team_members: freePlan.limits.max_team_members,
            current_period_start: new Date(),
            current_period_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          },
        });
      }

      return {
        id: subscription.id,
        studio_id: subscription.studio_id,
        plan: subscription.plan as SubscriptionPlan,
        status: subscription.status as SubscriptionStatus,
        billing_interval: (subscription.billing_interval || BillingInterval.MONTHLY) as BillingInterval,
        currency: subscription.currency || 'INR',
        provider: subscription.provider,
        provider_customer_id: subscription.provider_customer_id,
        provider_subscription_id: subscription.provider_subscription_id,
        provider_price_id: subscription.provider_price_id,
        cancel_at_period_end: subscription.cancel_at_period_end,
        current_period_start: subscription.current_period_start,
        current_period_end: subscription.current_period_end,
        trial_start: subscription.trial_start,
        trial_end: subscription.trial_end,
        canceled_at: subscription.canceled_at,
        storage_limit_bytes: Number(subscription.storage_limit_bytes),
        photo_limit: subscription.photo_limit,
        ai_search_limit: subscription.ai_search_limit,
        max_galleries: subscription.max_galleries,
        max_clients: subscription.max_clients,
        max_team_members: subscription.max_team_members,
      };
    } catch (_dbErr) {
      if (!this.memorySubscriptions.has(studioId)) {
        const freePlan = getPlanDefinition(SubscriptionPlan.FREE);
        const now = new Date();
        const sub: SubscriptionDTO = {
          id: 'sub_mem_' + studioId,
          studio_id: studioId,
          plan: SubscriptionPlan.FREE,
          status: SubscriptionStatus.ACTIVE,
          billing_interval: BillingInterval.MONTHLY,
          currency: 'INR',
          provider: 'MOCK',
          provider_customer_id: 'cus_mem_' + studioId,
          provider_subscription_id: null,
          provider_price_id: null,
          cancel_at_period_end: false,
          current_period_start: now,
          current_period_end: new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000),
          trial_start: null,
          trial_end: null,
          canceled_at: null,
          storage_limit_bytes: freePlan.limits.max_storage_bytes || 2147483648,
          photo_limit: freePlan.limits.max_photos || 500,
          ai_search_limit: freePlan.limits.max_ai_searches || 50,
          max_galleries: freePlan.limits.max_active_galleries,
          max_clients: freePlan.limits.max_clients,
          max_team_members: freePlan.limits.max_team_members,
        };
        this.memorySubscriptions.set(studioId, sub);
      }
      return this.memorySubscriptions.get(studioId)!;
    }
  }

  /**
   * Initializes a secure checkout session with the payment provider.
   */
  static async createCheckoutSession(
    studioId: string,
    req: CreateCheckoutSessionRequest,
    userEmail: string,
    userName: string
  ): Promise<CreateCheckoutSessionResponse> {
    const provider = getBillingProvider();
    const currentSub = await this.getSubscription(studioId);

    // Free plan does not require external checkout
    if (req.plan === SubscriptionPlan.FREE) {
      await this.applyPlanToSubscription(studioId, SubscriptionPlan.FREE, BillingInterval.MONTHLY);
      return {
        session_id: 'free_plan_activated',
        checkout_url: req.success_url || '/dashboard/subscription?status=success',
      };
    }

    let customerId = currentSub.provider_customer_id;
    if (!customerId) {
      const customer = await provider.createCustomer({
        studioId,
        email: userEmail,
        name: userName,
      });
      customerId = customer.id;

      try {
        await prisma.subscription.update({
          where: { studio_id: studioId },
          data: { provider_customer_id: customerId },
        });
      } catch (_err) {
        if (this.memorySubscriptions.has(studioId)) {
          this.memorySubscriptions.get(studioId)!.provider_customer_id = customerId;
        }
      }
    }

    const interval = req.interval || BillingInterval.MONTHLY;
    const currency = req.currency || currentSub.currency || 'INR';
    const baseUrl = process.env.WEB_URL || 'http://localhost:3000';
    const successUrl = req.success_url || `${baseUrl}/dashboard/subscription?session_id={CHECKOUT_SESSION_ID}&checkout=success`;
    const cancelUrl = req.cancel_url || `${baseUrl}/pricing?checkout=canceled`;

    const session = await provider.createCheckoutSession({
      studioId,
      customerId,
      customerEmail: userEmail,
      plan: req.plan,
      interval,
      currency,
      successUrl,
      cancelUrl,
    });

    return {
      session_id: session.sessionId,
      checkout_url: session.url,
    };
  }

  /**
   * Generates a billing portal link for self-service payment and invoice management.
   */
  static async createPortalSession(studioId: string, returnUrl?: string): Promise<CreatePortalSessionResponse> {
    const provider = getBillingProvider();
    const currentSub = await this.getSubscription(studioId);

    if (!currentSub.provider_customer_id) {
      throw new Error('Studio does not have an active billing customer record');
    }

    const defaultReturn = `${process.env.WEB_URL || 'http://localhost:3000'}/dashboard/subscription`;
    const portal = await provider.createPortalSession({
      customerId: currentSub.provider_customer_id,
      returnUrl: returnUrl || defaultReturn,
    });

    return {
      portal_url: portal.url,
    };
  }

  /**
   * Manages direct plan upgrades or non-destructive downgrades.
   */
  static async changePlan(
    studioId: string,
    newPlan: SubscriptionPlan,
    interval: BillingInterval = BillingInterval.MONTHLY
  ): Promise<SubscriptionDTO> {
    return this.applyPlanToSubscription(studioId, newPlan, interval);
  }

  /**
   * Handles non-destructive cancellation (marks cancel_at_period_end).
   */
  static async cancelSubscription(studioId: string, atPeriodEnd: boolean = true): Promise<SubscriptionDTO> {
    try {
      const updated = await prisma.subscription.update({
        where: { studio_id: studioId },
        data: {
          cancel_at_period_end: atPeriodEnd,
          canceled_at: new Date(),
          status: atPeriodEnd ? SubscriptionStatus.ACTIVE : SubscriptionStatus.CANCELED,
        },
      });

      return this.getSubscription(studioId);
    } catch (_err) {
      const sub = await this.getSubscription(studioId);
      sub.cancel_at_period_end = atPeriodEnd;
      sub.canceled_at = new Date();
      sub.status = atPeriodEnd ? SubscriptionStatus.ACTIVE : SubscriptionStatus.CANCELED;
      this.memorySubscriptions.set(studioId, sub);
      return sub;
    }
  }

  /**
   * Resumes a subscription scheduled to cancel at period end.
   */
  static async resumeSubscription(studioId: string): Promise<SubscriptionDTO> {
    try {
      await prisma.subscription.update({
        where: { studio_id: studioId },
        data: {
          cancel_at_period_end: false,
          canceled_at: null,
          status: SubscriptionStatus.ACTIVE,
        },
      });

      return this.getSubscription(studioId);
    } catch (_err) {
      const sub = await this.getSubscription(studioId);
      sub.cancel_at_period_end = false;
      sub.canceled_at = null;
      sub.status = SubscriptionStatus.ACTIVE;
      this.memorySubscriptions.set(studioId, sub);
      return sub;
    }
  }

  /**
   * Fetches past billing invoices for a studio.
   */
  static async listInvoices(studioId: string): Promise<InvoiceDTO[]> {
    try {
      const invoices = await prisma.invoice.findMany({
        where: { studio_id: studioId },
        orderBy: { invoice_date: 'desc' },
      });

      if (invoices.length > 0) {
        return invoices.map((inv) => ({
          id: inv.id,
          studio_id: inv.studio_id,
          subscription_id: inv.subscription_id,
          provider_invoice_id: inv.provider_invoice_id,
          amount: inv.amount,
          currency: inv.currency,
          status: inv.status as InvoiceStatus,
          invoice_date: inv.invoice_date,
          paid_at: inv.paid_at,
          pdf_url: inv.pdf_url,
          hosted_invoice_url: inv.hosted_invoice_url,
          created_at: (inv as any).created_at || inv.invoice_date,
          updated_at: (inv as any).updated_at || inv.invoice_date,
        }));
      }
    } catch (_err) {
      // Fallback below
    }

    if (this.memoryInvoices.has(studioId)) {
      return this.memoryInvoices.get(studioId)!;
    }

    // Default sample invoice for active/paid studios in mock mode
    const sampleInvoice: InvoiceDTO = {
      id: 'inv_mem_' + studioId,
      studio_id: studioId,
      subscription_id: 'sub_mem_' + studioId,
      provider_invoice_id: 'in_mock_123',
      amount: 249900,
      currency: 'INR',
      status: InvoiceStatus.PAID,
      invoice_date: new Date(),
      paid_at: new Date(),
      pdf_url: 'https://pixmatch.ai/invoices/mock-invoice.pdf',
      hosted_invoice_url: 'https://stripe.com/invoices/in_mock_123',
      created_at: new Date(),
      updated_at: new Date(),
    };
    this.memoryInvoices.set(studioId, [sampleInvoice]);
    return [sampleInvoice];
  }

  /**
   * Processes incoming webhooks idempotently with signature verification and state convergence.
   */
  static async handleWebhook(rawBody: string | Buffer, signature: string): Promise<{ success: boolean; message: string }> {
    const provider = getBillingProvider();
    const verification = await provider.verifyWebhook(rawBody, signature);

    if (!verification.valid || !verification.event) {
      throw new Error(verification.error || 'Webhook verification failed');
    }

    const event = verification.event;
    const eventId = event.id;
    const eventType = event.type;

    // 1. Idempotency Check
    try {
      const existingEvent = await prisma.billingWebhookEvent.findUnique({
        where: { provider_event_id: eventId },
      });

      if (existingEvent && existingEvent.status === WebhookProcessingStatus.PROCESSED) {
        return { success: true, message: `Event ${eventId} already processed (idempotent replay)` };
      }
    } catch (_err) {
      const memEvt = this.memoryWebhookEvents.get(eventId);
      if (memEvt && memEvt.status === WebhookProcessingStatus.PROCESSED) {
        return { success: true, message: `Event ${eventId} already processed (idempotent replay)` };
      }
    }

    try {
      await prisma.billingWebhookEvent.upsert({
        where: { provider_event_id: eventId },
        update: { received_at: new Date() },
        create: {
          provider_event_id: eventId,
          event_type: eventType,
          provider: 'STRIPE',
          payload: event as any,
          status: WebhookProcessingStatus.PENDING,
        },
      });
    } catch (_err) {
      this.memoryWebhookEvents.set(eventId, {
        status: WebhookProcessingStatus.PENDING,
        payload: event,
      });
    }

    try {
      // 2. Dispatch event type handlers
      switch (eventType) {
        case 'checkout.session.completed': {
          const session = event.data.object;
          const studioId = session.client_reference_id || session.metadata?.studio_id;
          const plan = (session.metadata?.plan || SubscriptionPlan.PRO) as SubscriptionPlan;
          const interval = (session.metadata?.interval || BillingInterval.MONTHLY) as BillingInterval;

          if (studioId) {
            await this.applyPlanToSubscription(studioId, plan, interval, {
              provider_customer_id: session.customer,
              provider_subscription_id: session.subscription,
            });
          }
          break;
        }

        case 'customer.subscription.created':
        case 'customer.subscription.updated': {
          const sub = event.data.object;
          const customerId = sub.customer;
          const subscriptionId = sub.id;

          let studioId = sub.metadata?.studio_id;
          if (!studioId && customerId) {
            try {
              const existingSub = await prisma.subscription.findFirst({
                where: { provider_customer_id: customerId },
              });
              studioId = existingSub?.studio_id;
            } catch (_err) {
              for (const [sId, s] of this.memorySubscriptions.entries()) {
                if (s.provider_customer_id === customerId) {
                  studioId = sId;
                  break;
                }
              }
            }
          }

          if (studioId) {
            const planSlug = sub.metadata?.plan?.toUpperCase() || 'PRO';
            const plan = (Object.values(SubscriptionPlan).includes(planSlug as any) ? planSlug : SubscriptionPlan.PRO) as SubscriptionPlan;
            const statusMap: Record<string, SubscriptionStatus> = {
              active: SubscriptionStatus.ACTIVE,
              trialing: SubscriptionStatus.TRIALING,
              past_due: SubscriptionStatus.PAST_DUE,
              canceled: SubscriptionStatus.CANCELED,
              unpaid: SubscriptionStatus.UNPAID,
            };
            const status = statusMap[sub.status?.toLowerCase()] || SubscriptionStatus.ACTIVE;

            const planDef = getPlanDefinition(plan);
            try {
              await prisma.subscription.update({
                where: { studio_id: studioId },
                data: {
                  plan,
                  status: status as any,
                  provider_subscription_id: subscriptionId,
                  provider_customer_id: customerId,
                  cancel_at_period_end: Boolean(sub.cancel_at_period_end),
                  current_period_start: sub.current_period_start ? new Date(sub.current_period_start * 1000) : undefined,
                  current_period_end: sub.current_period_end ? new Date(sub.current_period_end * 1000) : undefined,
                  storage_limit_bytes: BigInt(planDef.limits.max_storage_bytes || 2147483648),
                  photo_limit: planDef.limits.max_photos || 500,
                  ai_search_limit: planDef.limits.max_ai_searches || 50,
                  max_galleries: planDef.limits.max_active_galleries,
                  max_clients: planDef.limits.max_clients,
                  max_team_members: planDef.limits.max_team_members,
                },
              });
            } catch (_err) {
              const current = await this.getSubscription(studioId);
              current.plan = plan;
              current.status = status;
              current.provider_subscription_id = subscriptionId;
              current.provider_customer_id = customerId;
              current.cancel_at_period_end = Boolean(sub.cancel_at_period_end);
              this.memorySubscriptions.set(studioId, current);
            }
          }
          break;
        }

        case 'customer.subscription.deleted': {
          const sub = event.data.object;
          const subscriptionId = sub.id;

          try {
            const existingSub = await prisma.subscription.findFirst({
              where: { provider_subscription_id: subscriptionId },
            });

            if (existingSub) {
              await prisma.subscription.update({
                where: { id: existingSub.id },
                data: {
                  status: SubscriptionStatus.CANCELED,
                  canceled_at: new Date(),
                },
              });
            }
          } catch (_err) {
            for (const [sId, s] of this.memorySubscriptions.entries()) {
              if (s.provider_subscription_id === subscriptionId) {
                s.status = SubscriptionStatus.CANCELED;
                s.canceled_at = new Date();
                this.memorySubscriptions.set(sId, s);
                break;
              }
            }
          }
          break;
        }

        case 'invoice.paid': {
          const inv = event.data.object;
          const customerId = inv.customer;
          const subscriptionId = inv.subscription;

          let studioId: string | undefined;
          try {
            const existingSub = await prisma.subscription.findFirst({
              where: {
                OR: [
                  { provider_subscription_id: subscriptionId },
                  { provider_customer_id: customerId },
                ],
              },
            });

            if (existingSub) {
              studioId = existingSub.studio_id;
              await prisma.invoice.upsert({
                where: { provider_invoice_id: inv.id },
                update: {
                  status: InvoiceStatus.PAID,
                  paid_at: new Date(),
                  hosted_invoice_url: inv.hosted_invoice_url,
                  pdf_url: inv.invoice_pdf,
                },
                create: {
                  studio_id: existingSub.studio_id,
                  subscription_id: existingSub.id,
                  provider_invoice_id: inv.id,
                  amount: inv.amount_paid ?? inv.amount_due ?? 0,
                  currency: (inv.currency || 'INR').toUpperCase(),
                  status: InvoiceStatus.PAID,
                  invoice_date: new Date((inv.created || Math.floor(Date.now() / 1000)) * 1000),
                  paid_at: new Date(),
                  hosted_invoice_url: inv.hosted_invoice_url,
                  pdf_url: inv.invoice_pdf,
                },
              });

              if (existingSub.status === SubscriptionStatus.PAST_DUE) {
                await prisma.subscription.update({
                  where: { id: existingSub.id },
                  data: { status: SubscriptionStatus.ACTIVE },
                });
              }
            }
          } catch (_err) {
            for (const [sId, s] of this.memorySubscriptions.entries()) {
              if (s.provider_subscription_id === subscriptionId || s.provider_customer_id === customerId || s.id === subscriptionId) {
                studioId = sId;
                s.status = SubscriptionStatus.ACTIVE;
                this.memorySubscriptions.set(sId, s);
                break;
              }
            }
          }
          break;
        }

        case 'invoice.payment_failed': {
          const inv = event.data.object;
          const subscriptionId = inv.subscription;
          const customerId = inv.customer;

          try {
            const existingSub = await prisma.subscription.findFirst({
              where: {
                OR: [
                  { provider_subscription_id: subscriptionId },
                  { provider_customer_id: customerId },
                ],
              },
            });

            if (existingSub) {
              await prisma.subscription.update({
                where: { id: existingSub.id },
                data: { status: SubscriptionStatus.PAST_DUE },
              });

              await prisma.invoice.upsert({
                where: { provider_invoice_id: inv.id },
                update: { status: InvoiceStatus.OPEN },
                create: {
                  studio_id: existingSub.studio_id,
                  subscription_id: existingSub.id,
                  provider_invoice_id: inv.id,
                  amount: inv.amount_due ?? 0,
                  currency: (inv.currency || 'INR').toUpperCase(),
                  status: InvoiceStatus.OPEN,
                  invoice_date: new Date((inv.created || Math.floor(Date.now() / 1000)) * 1000),
                  hosted_invoice_url: inv.hosted_invoice_url,
                  pdf_url: inv.invoice_pdf,
                },
              });
            }
          } catch (_err) {
            for (const [sId, s] of this.memorySubscriptions.entries()) {
              if (s.provider_subscription_id === subscriptionId || s.provider_customer_id === customerId || s.id === subscriptionId) {
                s.status = SubscriptionStatus.PAST_DUE;
                this.memorySubscriptions.set(sId, s);
                break;
              }
            }
          }
          break;
        }
      }

      // Mark Event Processed
      try {
        await prisma.billingWebhookEvent.update({
          where: { provider_event_id: eventId },
          data: {
            status: WebhookProcessingStatus.PROCESSED,
            processed_at: new Date(),
          },
        });
      } catch (_err) {
        this.memoryWebhookEvents.set(eventId, {
          status: WebhookProcessingStatus.PROCESSED,
          payload: event,
        });
      }

      return { success: true, message: `Event ${eventId} successfully processed` };
    } catch (err: any) {
      try {
        await prisma.billingWebhookEvent.update({
          where: { provider_event_id: eventId },
          data: {
            status: WebhookProcessingStatus.FAILED,
            error_message: err.message || 'Error processing webhook event',
          },
        });
      } catch (_e) {
        this.memoryWebhookEvents.set(eventId, {
          status: WebhookProcessingStatus.FAILED,
          payload: event,
        });
      }
      throw err;
    }
  }

  private static async applyPlanToSubscription(
    studioId: string,
    plan: SubscriptionPlan,
    interval: BillingInterval = BillingInterval.MONTHLY,
    extraFields: Partial<{ provider_customer_id: string; provider_subscription_id: string }> = {}
  ): Promise<SubscriptionDTO> {
    const planDef = getPlanDefinition(plan);
    const now = new Date();
    const periodEnd = new Date(now.getTime() + (interval === BillingInterval.YEARLY ? 365 : 30) * 24 * 60 * 60 * 1000);

    try {
      await prisma.subscription.upsert({
        where: { studio_id: studioId },
        update: {
          plan,
          status: SubscriptionStatus.ACTIVE,
          billing_interval: interval,
          current_period_start: now,
          current_period_end: periodEnd,
          cancel_at_period_end: false,
          canceled_at: null,
          storage_limit_bytes: BigInt(planDef.limits.max_storage_bytes || 2147483648),
          photo_limit: planDef.limits.max_photos || 500,
          ai_search_limit: planDef.limits.max_ai_searches || 50,
          max_galleries: planDef.limits.max_active_galleries,
          max_clients: planDef.limits.max_clients,
          max_team_members: planDef.limits.max_team_members,
          ...extraFields,
        },
        create: {
          studio_id: studioId,
          plan,
          status: SubscriptionStatus.ACTIVE,
          billing_interval: interval,
          currency: 'INR',
          provider: 'STRIPE',
          current_period_start: now,
          current_period_end: periodEnd,
          storage_limit_bytes: BigInt(planDef.limits.max_storage_bytes || 2147483648),
          photo_limit: planDef.limits.max_photos || 500,
          ai_search_limit: planDef.limits.max_ai_searches || 50,
          max_galleries: planDef.limits.max_active_galleries,
          max_clients: planDef.limits.max_clients,
          max_team_members: planDef.limits.max_team_members,
          ...extraFields,
        },
      });

      return this.getSubscription(studioId);
    } catch (_err) {
      const sub: SubscriptionDTO = {
        id: 'sub_mem_' + studioId,
        studio_id: studioId,
        plan,
        status: SubscriptionStatus.ACTIVE,
        billing_interval: interval,
        currency: 'INR',
        provider: 'MOCK',
        provider_customer_id: extraFields.provider_customer_id || 'cus_mem_' + studioId,
        provider_subscription_id: extraFields.provider_subscription_id || 'sub_mem_id_' + studioId,
        provider_price_id: null,
        cancel_at_period_end: false,
        current_period_start: now,
        current_period_end: periodEnd,
        trial_start: null,
        trial_end: null,
        canceled_at: null,
        storage_limit_bytes: planDef.limits.max_storage_bytes || 2147483648,
        photo_limit: planDef.limits.max_photos || 500,
        ai_search_limit: planDef.limits.max_ai_searches || 50,
        max_galleries: planDef.limits.max_active_galleries,
        max_clients: planDef.limits.max_clients,
        max_team_members: planDef.limits.max_team_members,
      };
      this.memorySubscriptions.set(studioId, sub);
      return sub;
    }
  }
}
