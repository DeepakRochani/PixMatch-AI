import { FastifyRequest, FastifyReply } from 'fastify';
import { prisma } from '@pixmatch/database';
import {
  SubscriptionPlan,
  BillingInterval,
  CreateCheckoutSessionRequest,
  CreatePortalSessionRequest,
  ChangePlanRequest,
} from '@pixmatch/types';
import { BillingService } from './billing.service.js';
import { UsageService } from './usage.service.js';
import { getAllActivePlans, getPlanDefinition } from './plans.config.js';

export class BillingController {
  static async getPlans(request: FastifyRequest, reply: FastifyReply) {
    const plans = getAllActivePlans();
    return reply.send({
      success: true,
      data: plans,
    });
  }

  static async getSubscription(request: FastifyRequest, reply: FastifyReply) {
    const studioId = request.studioId!;
    const subscription = await BillingService.getSubscription(studioId);
    const usage = await UsageService.getStudioUsageSummary(studioId);
    const planDef = getPlanDefinition(subscription.plan);

    return reply.send({
      success: true,
      data: {
        subscription,
        plan: planDef,
        usage,
      },
    });
  }

  static async getUsage(request: FastifyRequest, reply: FastifyReply) {
    const studioId = request.studioId!;
    const usage = await UsageService.getStudioUsageSummary(studioId);

    return reply.send({
      success: true,
      data: usage,
    });
  }

  static async getInvoices(request: FastifyRequest, reply: FastifyReply) {
    const studioId = request.studioId!;
    const invoices = await BillingService.listInvoices(studioId);

    return reply.send({
      success: true,
      data: invoices,
    });
  }

  static async createCheckout(request: FastifyRequest, reply: FastifyReply) {
    const studioId = request.studioId!;
    const userId = request.user?.userId;
    const body = (request.body as CreateCheckoutSessionRequest) || {};

    const user = await prisma.user.findUnique({ where: { id: userId } });
    const userEmail = user?.email || 'billing@pixmatch.ai';
    const userName = user?.name || 'Studio Owner';

    const plan = body.plan || SubscriptionPlan.PRO;
    const interval = body.interval || BillingInterval.MONTHLY;

    const session = await BillingService.createCheckoutSession(
      studioId,
      {
        plan,
        interval,
        currency: body.currency,
        success_url: body.success_url,
        cancel_url: body.cancel_url,
      },
      userEmail,
      userName
    );

    return reply.send({
      success: true,
      data: session,
    });
  }

  static async createPortal(request: FastifyRequest, reply: FastifyReply) {
    const studioId = request.studioId!;
    const body = (request.body as CreatePortalSessionRequest) || {};
    const returnUrl = body.return_url;

    const portal = await BillingService.createPortalSession(studioId, returnUrl);

    return reply.send({
      success: true,
      data: portal,
    });
  }

  static async changePlan(request: FastifyRequest, reply: FastifyReply) {
    const studioId = request.studioId!;
    const body = (request.body as ChangePlanRequest) || {};
    const newPlan = body.plan;
    const interval = body.interval || BillingInterval.MONTHLY;

    if (!newPlan || !Object.values(SubscriptionPlan).includes(newPlan)) {
      return reply.status(400).send({
        success: false,
        error: { code: 'INVALID_PLAN', message: 'Valid subscription plan is required.' },
      });
    }

    const updated = await BillingService.changePlan(studioId, newPlan, interval);

    return reply.send({
      success: true,
      data: updated,
      message: `Plan changed successfully to ${newPlan}`,
    });
  }

  static async cancelSubscription(request: FastifyRequest, reply: FastifyReply) {
    const studioId = request.studioId!;
    const updated = await BillingService.cancelSubscription(studioId, true);

    return reply.send({
      success: true,
      data: updated,
      message: 'Subscription scheduled for cancellation at the end of the current billing period. All data remains safe.',
    });
  }

  static async resumeSubscription(request: FastifyRequest, reply: FastifyReply) {
    const studioId = request.studioId!;
    const updated = await BillingService.resumeSubscription(studioId);

    return reply.send({
      success: true,
      data: updated,
      message: 'Subscription successfully resumed.',
    });
  }

  static async handleWebhook(request: FastifyRequest, reply: FastifyReply) {
    const signature = (request.headers['stripe-signature'] as string) || (request.headers['x-billing-signature'] as string) || '';
    const rawBody = typeof request.body === 'string' ? request.body : JSON.stringify(request.body);

    try {
      const result = await BillingService.handleWebhook(rawBody, signature);
      return reply.send(result);
    } catch (err: any) {
      request.log.error({ err }, 'Webhook processing failed');
      return reply.status(400).send({
        success: false,
        error: { code: 'WEBHOOK_FAILED', message: err.message || 'Webhook verification or processing failed' },
      });
    }
  }
}
