import { FastifyRequest, FastifyReply } from 'fastify';
import { BillingService } from '../billing/billing.service.js';
import { UsageService } from '../billing/usage.service.js';
import { getPlanDefinition } from '../billing/plans.config.js';

export class SubscriptionsController {
  static async getCurrent(request: FastifyRequest, reply: FastifyReply) {
    const studioId = request.studioId!;

    const subscription = await BillingService.getSubscription(studioId);
    const usage = await UsageService.getStudioUsageSummary(studioId);
    const planDef = getPlanDefinition(subscription.plan);

    const storageUsedBytes = usage.storage.used;
    const storageLimitBytes = Number(subscription.storage_limit_bytes);
    const photoCount = usage.photos.used;
    const photoLimit = subscription.photo_limit;
    const aiSearchCount = usage.ai_searches.used;
    const aiSearchLimit = subscription.ai_search_limit;

    return reply.send({
      success: true,
      data: {
        subscription: {
          ...subscription,
          storage_limit_bytes: storageLimitBytes,
        },
        plan: planDef,
        usage: {
          gallery_count: usage.galleries.used,
          photo_count: photoCount,
          photo_limit: photoLimit,
          photo_usage_percent: usage.photos.usage_percent,
          storage_used_bytes: storageUsedBytes,
          storage_limit_bytes: storageLimitBytes,
          storage_usage_percent: usage.storage.usage_percent,
          ai_searches_used: aiSearchCount,
          ai_search_limit: aiSearchLimit,
          ai_search_usage_percent: usage.ai_searches.usage_percent,
          client_count: usage.clients.used,
          client_limit: usage.clients.limit,
          team_member_count: usage.team_members.used,
          team_member_limit: usage.team_members.limit,
        },
      },
    });
  }
}
