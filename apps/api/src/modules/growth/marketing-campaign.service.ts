/**
 * Marketing Campaign Service — PixMatch AI Phase 19
 * Manages marketing campaigns, recipient resolution, strict human approval gates,
 * approval invalidation on edit, scheduling, and recipient exports.
 */

import {
  prisma,
  MarketingCampaignChannel,
  MarketingCampaignStatus,
  MarketingRecipientStatus,
} from '@pixmatch/database';
import {
  MarketingCampaignDTO,
  CreateCampaignDraftDTO,
  UpdateCampaignDraftDTO,
  CampaignRecipientPreviewDTO,
  MarketingCampaignRecipientDTO,
} from '@pixmatch/types';

export class MarketingCampaignService {
  /**
   * Resolve campaign recipients against client lists and suppression databases.
   */
  static async previewRecipients(
    studioId: string,
    segmentDefinition?: Record<string, any> | null,
    manualRecipients?: Array<{ client_id?: string; email: string; client_name?: string }>
  ): Promise<CampaignRecipientPreviewDTO> {
    const minDays = segmentDefinition?.min_days_inactive ?? 60;
    const clientIds = segmentDefinition?.client_ids as string[] | undefined;

    let candidateClients: Array<{ id: string; name: string; email: string; last_activity_at?: Date | null; days_inactive?: number }> = [];

    if (manualRecipients && manualRecipients.length > 0) {
      candidateClients = manualRecipients.map(r => ({
        id: r.client_id || '',
        name: r.client_name || r.email.split('@')[0],
        email: r.email.toLowerCase().trim(),
        days_inactive: 0,
      }));
    } else {
      const now = new Date();
      const where: any = { studio_id: studioId, deleted_at: null };
      if (clientIds && clientIds.length > 0) {
        where.id = { in: clientIds };
      }

      const clients = await prisma.client.findMany({
        where,
        include: {
          engagement_profile: true,
          galleries: { include: { gallery: true }, orderBy: { created_at: 'desc' }, take: 1 },
        },
      });

      candidateClients = clients
        .map(c => {
          const lastActivity =
            c.engagement_profile?.last_activity_at ||
            (c.galleries[0]?.gallery as any)?.published_at ||
            c.galleries[0]?.gallery?.created_at ||
            c.galleries[0]?.created_at ||
            c.updated_at ||
            c.created_at;
          const daysInactive = Math.floor(
            (now.getTime() - new Date(lastActivity).getTime()) / (1000 * 60 * 60 * 24)
          );
          return {
            id: c.id,
            name: c.name,
            email: c.email.toLowerCase().trim(),
            last_activity_at: lastActivity,
            days_inactive: daysInactive,
          };
        })
        .filter(c => {
          if (clientIds && clientIds.length > 0) return true;
          return c.days_inactive >= minDays;
        });
    }

    const candidateEmails = candidateClients.map(c => c.email);
    const suppressions = await prisma.emailSuppression.findMany({
      where: {
        email: { in: candidateEmails },
      },
    });

    const suppressionMap = new Map<string, string>();
    for (const s of suppressions) {
      suppressionMap.set(s.email.toLowerCase().trim(), s.reason);
    }

    let unsubscribedCount = 0;
    let bouncedCount = 0;
    let optedOutCount = 0;

    const eligibleRecipients: Array<{
      client_id?: string | null;
      email: string;
      client_name?: string | null;
      days_inactive?: number;
    }> = [];

    for (const c of candidateClients) {
      const suppressionReason = suppressionMap.get(c.email);
      if (suppressionReason === 'UNSUBSCRIBED') {
        unsubscribedCount++;
      } else if (suppressionReason === 'BOUNCED') {
        bouncedCount++;
      } else if (suppressionReason === 'COMPLAINT') {
        optedOutCount++;
      } else {
        eligibleRecipients.push({
          client_id: c.id || null,
          email: c.email,
          client_name: c.name,
          days_inactive: c.days_inactive,
        });
      }
    }

    const suppressedCount = unsubscribedCount + bouncedCount + optedOutCount;

    return {
      total_matching: candidateClients.length,
      eligible_recipients: eligibleRecipients,
      suppressed_count: suppressedCount,
      suppressed_reasons: {
        unsubscribed: unsubscribedCount,
        bounced: bouncedCount,
        opted_out: optedOutCount,
      },
    };
  }

  /**
   * Create a new campaign draft.
   */
  static async createDraft(
    studioId: string,
    userId: string,
    dto: CreateCampaignDraftDTO
  ): Promise<MarketingCampaignDTO> {
    const preview = await this.previewRecipients(studioId, dto.segment_definition, dto.recipients);

    const campaign = await prisma.marketingCampaign.create({
      data: {
        studio_id: studioId,
        name: dto.name,
        description: dto.description || null,
        objective: dto.objective || 'REACTIVATION',
        channel: dto.channel || MarketingCampaignChannel.EMAIL,
        status: MarketingCampaignStatus.DRAFT,
        segment_definition: dto.segment_definition || {},
        subject: dto.subject,
        content: dto.content,
        preview_text: dto.preview_text || null,
        offer_text: dto.offer_text || null,
        cta_text: dto.cta_text || null,
        cta_url: dto.cta_url || null,
        cost: dto.cost || 0,
        scheduled_at: dto.scheduled_at ? new Date(dto.scheduled_at) : null,
        created_by: userId,
      },
    });

    // Populate initial eligible recipients
    if (preview.eligible_recipients.length > 0) {
      await prisma.marketingCampaignRecipient.createMany({
        data: preview.eligible_recipients.map(r => ({
          campaign_id: campaign.id,
          client_id: r.client_id || null,
          email: r.email,
          client_name: r.client_name || null,
          status: MarketingRecipientStatus.PENDING,
        })),
      });
    }

    return this.getCampaign(studioId, campaign.id) as Promise<MarketingCampaignDTO>;
  }

  /**
   * Update campaign draft. If content or targets change, STRICTLY INVALIDATES previous approval.
   */
  static async updateDraft(
    studioId: string,
    campaignId: string,
    dto: UpdateCampaignDraftDTO
  ): Promise<MarketingCampaignDTO> {
    const existing = await prisma.marketingCampaign.findFirst({
      where: { id: campaignId, studio_id: studioId },
    });

    if (!existing) {
      throw new Error('Campaign not found or unauthorized');
    }

    if (existing.status === MarketingCampaignStatus.SENDING || existing.status === MarketingCampaignStatus.COMPLETED) {
      throw new Error('Cannot edit a campaign that is currently sending or already completed');
    }

    const updateData: any = {
      // Modifying campaign resets human approval gate
      approved_by: null,
      approved_at: null,
      status: MarketingCampaignStatus.DRAFT,
    };

    if (dto.name !== undefined) updateData.name = dto.name;
    if (dto.description !== undefined) updateData.description = dto.description;
    if (dto.objective !== undefined) updateData.objective = dto.objective;
    if (dto.subject !== undefined) updateData.subject = dto.subject;
    if (dto.content !== undefined) updateData.content = dto.content;
    if (dto.preview_text !== undefined) updateData.preview_text = dto.preview_text;
    if (dto.offer_text !== undefined) updateData.offer_text = dto.offer_text;
    if (dto.cta_text !== undefined) updateData.cta_text = dto.cta_text;
    if (dto.cta_url !== undefined) updateData.cta_url = dto.cta_url;
    if (dto.cost !== undefined) updateData.cost = dto.cost;
    if (dto.scheduled_at !== undefined) {
      updateData.scheduled_at = dto.scheduled_at ? new Date(dto.scheduled_at) : null;
    }

    if (dto.segment_definition !== undefined) {
      updateData.segment_definition = dto.segment_definition;

      // Re-resolve recipients
      const preview = await this.previewRecipients(studioId, dto.segment_definition);
      await prisma.marketingCampaignRecipient.deleteMany({
        where: { campaign_id: campaignId },
      });
      if (preview.eligible_recipients.length > 0) {
        await prisma.marketingCampaignRecipient.createMany({
          data: preview.eligible_recipients.map(r => ({
            campaign_id: campaignId,
            client_id: r.client_id || null,
            email: r.email,
            client_name: r.client_name || null,
            status: MarketingRecipientStatus.PENDING,
          })),
        });
      }
    }

    await prisma.marketingCampaign.update({
      where: { id: campaignId },
      data: updateData,
    });

    return this.getCampaign(studioId, campaignId) as Promise<MarketingCampaignDTO>;
  }

  /**
   * Approve campaign (Strict Human Approval Gate).
   */
  static async approveCampaign(
    studioId: string,
    campaignId: string,
    userId: string,
    note?: string
  ): Promise<MarketingCampaignDTO> {
    const existing = await prisma.marketingCampaign.findFirst({
      where: { id: campaignId, studio_id: studioId },
      include: { recipients: true },
    });

    if (!existing) {
      throw new Error('Campaign not found or unauthorized');
    }

    if (!existing.subject || !existing.content) {
      throw new Error('Campaign must have both subject and content before approval');
    }

    if (existing.recipients.length === 0) {
      throw new Error('Campaign must have at least one eligible recipient before approval');
    }

    const metadata = (existing.metadata as Record<string, any>) || {};
    if (note) {
      metadata.approval_note = note;
    }

    await prisma.marketingCampaign.update({
      where: { id: campaignId },
      data: {
        status: MarketingCampaignStatus.APPROVED,
        approved_by: userId,
        approved_at: new Date(),
        metadata,
      },
    });

    return this.getCampaign(studioId, campaignId) as Promise<MarketingCampaignDTO>;
  }

  /**
   * Schedule campaign. Must be APPROVED before scheduling.
   */
  static async scheduleCampaign(
    studioId: string,
    campaignId: string,
    scheduledAt: Date | string
  ): Promise<MarketingCampaignDTO> {
    const existing = await prisma.marketingCampaign.findFirst({
      where: { id: campaignId, studio_id: studioId },
    });

    if (!existing) {
      throw new Error('Campaign not found or unauthorized');
    }

    if (existing.status !== MarketingCampaignStatus.APPROVED && !existing.approved_by) {
      throw new Error('Campaign must be approved by a human before scheduling');
    }

    const scheduledDate = new Date(scheduledAt);
    if (isNaN(scheduledDate.getTime())) {
      throw new Error('Invalid scheduled date');
    }

    await prisma.marketingCampaign.update({
      where: { id: campaignId },
      data: {
        status: MarketingCampaignStatus.SCHEDULED,
        scheduled_at: scheduledDate,
      },
    });

    return this.getCampaign(studioId, campaignId) as Promise<MarketingCampaignDTO>;
  }

  /**
   * List campaigns with summary counts
   */
  static async listCampaigns(
    studioId: string,
    query: { status?: MarketingCampaignStatus; search?: string; limit?: number; offset?: number }
  ): Promise<{ campaigns: MarketingCampaignDTO[]; total: number }> {
    const where: any = { studio_id: studioId };
    if (query.status) where.status = query.status;
    if (query.search) {
      where.OR = [
        { name: { contains: query.search, mode: 'insensitive' } },
        { subject: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    const [items, total] = await Promise.all([
      prisma.marketingCampaign.findMany({
        where,
        include: {
          recipients: {
            select: {
              status: true,
              conversion_value: true,
            },
          },
        },
        orderBy: { created_at: 'desc' },
        take: query.limit || 50,
        skip: query.offset || 0,
      }),
      prisma.marketingCampaign.count({ where }),
    ]);

    const campaigns: MarketingCampaignDTO[] = items.map(c => {
      const recipientCount = c.recipients.length;
      let sentCount = 0;
      let deliveredCount = 0;
      let openedCount = 0;
      let clickedCount = 0;
      let convertedCount = 0;
      let unsubscribedCount = 0;
      let bouncedCount = 0;
      let failedCount = 0;
      let totalRevenue = 0;

      for (const r of c.recipients) {
        if (r.status === 'SENT' || r.status === 'DELIVERED' || r.status === 'OPENED' || r.status === 'CLICKED' || r.status === 'CONVERTED') {
          sentCount++;
        }
        if (r.status === 'DELIVERED' || r.status === 'OPENED' || r.status === 'CLICKED' || r.status === 'CONVERTED') {
          deliveredCount++;
        }
        if (r.status === 'OPENED' || r.status === 'CLICKED' || r.status === 'CONVERTED') {
          openedCount++;
        }
        if (r.status === 'CLICKED' || r.status === 'CONVERTED') {
          clickedCount++;
        }
        if (r.status === 'CONVERTED') {
          convertedCount++;
          totalRevenue += r.conversion_value || 0;
        }
        if (r.status === 'UNSUBSCRIBED') unsubscribedCount++;
        if (r.status === 'BOUNCED') bouncedCount++;
        if (r.status === 'FAILED') failedCount++;
      }

      return {
        id: c.id,
        studio_id: c.studio_id,
        name: c.name,
        description: c.description,
        objective: c.objective,
        channel: c.channel as any,
        status: c.status as any,
        segment_definition: c.segment_definition as any,
        subject: c.subject,
        content: c.content,
        preview_text: c.preview_text,
        offer_text: c.offer_text,
        cta_text: c.cta_text,
        cta_url: c.cta_url,
        cost: c.cost,
        scheduled_at: c.scheduled_at,
        started_at: c.started_at,
        completed_at: c.completed_at,
        created_by: c.created_by,
        approved_by: c.approved_by,
        approved_at: c.approved_at,
        metadata: c.metadata as any,
        created_at: c.created_at,
        updated_at: c.updated_at,

        recipient_count: recipientCount,
        sent_count: sentCount,
        delivered_count: deliveredCount,
        opened_count: openedCount,
        clicked_count: clickedCount,
        converted_count: convertedCount,
        unsubscribed_count: unsubscribedCount,
        bounced_count: bouncedCount,
        failed_count: failedCount,
        total_revenue: totalRevenue,

        // CamelCase aliases
        studioId: c.studio_id,
        previewText: c.preview_text,
        offerText: c.offer_text,
        ctaText: c.cta_text,
        ctaUrl: c.cta_url,
        scheduledAt: c.scheduled_at,
        startedAt: c.started_at,
        completedAt: c.completed_at,
        createdBy: c.created_by,
        approvedBy: c.approved_by,
        approvedAt: c.approved_at,
        recipientCount,
        sentCount,
        deliveredCount,
        openedCount,
        clickedCount,
        convertedCount,
        unsubscribedCount,
        bouncedCount,
        failedCount,
        totalRevenue,
      };
    });

    return { campaigns, total };
  }

  /**
   * Get single campaign details
   */
  static async getCampaign(studioId: string, campaignId: string): Promise<MarketingCampaignDTO | null> {
    const c = await prisma.marketingCampaign.findFirst({
      where: { id: campaignId, studio_id: studioId },
      include: {
        recipients: {
          select: {
            status: true,
            conversion_value: true,
          },
        },
      },
    });

    if (!c) return null;

    const recipientCount = c.recipients.length;
    let sentCount = 0;
    let deliveredCount = 0;
    let openedCount = 0;
    let clickedCount = 0;
    let convertedCount = 0;
    let unsubscribedCount = 0;
    let bouncedCount = 0;
    let failedCount = 0;
    let totalRevenue = 0;

    for (const r of c.recipients) {
      if (r.status === 'SENT' || r.status === 'DELIVERED' || r.status === 'OPENED' || r.status === 'CLICKED' || r.status === 'CONVERTED') {
        sentCount++;
      }
      if (r.status === 'DELIVERED' || r.status === 'OPENED' || r.status === 'CLICKED' || r.status === 'CONVERTED') {
        deliveredCount++;
      }
      if (r.status === 'OPENED' || r.status === 'CLICKED' || r.status === 'CONVERTED') {
        openedCount++;
      }
      if (r.status === 'CLICKED' || r.status === 'CONVERTED') {
        clickedCount++;
      }
      if (r.status === 'CONVERTED') {
        convertedCount++;
        totalRevenue += r.conversion_value || 0;
      }
      if (r.status === 'UNSUBSCRIBED') unsubscribedCount++;
      if (r.status === 'BOUNCED') bouncedCount++;
      if (r.status === 'FAILED') failedCount++;
    }

    return {
      id: c.id,
      studio_id: c.studio_id,
      name: c.name,
      description: c.description,
      objective: c.objective,
      channel: c.channel as any,
      status: c.status as any,
      segment_definition: c.segment_definition as any,
      subject: c.subject,
      content: c.content,
      preview_text: c.preview_text,
      offer_text: c.offer_text,
      cta_text: c.cta_text,
      cta_url: c.cta_url,
      cost: c.cost,
      scheduled_at: c.scheduled_at,
      started_at: c.started_at,
      completed_at: c.completed_at,
      created_by: c.created_by,
      approved_by: c.approved_by,
      approved_at: c.approved_at,
      metadata: c.metadata as any,
      created_at: c.created_at,
      updated_at: c.updated_at,

      recipient_count: recipientCount,
      sent_count: sentCount,
      delivered_count: deliveredCount,
      opened_count: openedCount,
      clicked_count: clickedCount,
      converted_count: convertedCount,
      unsubscribed_count: unsubscribedCount,
      bounced_count: bouncedCount,
      failed_count: failedCount,
      total_revenue: totalRevenue,

      studioId: c.studio_id,
      previewText: c.preview_text,
      offerText: c.offer_text,
      ctaText: c.cta_text,
      ctaUrl: c.cta_url,
      scheduledAt: c.scheduled_at,
      startedAt: c.started_at,
      completedAt: c.completed_at,
      createdBy: c.created_by,
      approvedBy: c.approved_by,
      approvedAt: c.approved_at,
      recipientCount,
      sentCount,
      deliveredCount,
      openedCount,
      clickedCount,
      convertedCount,
      unsubscribedCount,
      bouncedCount,
      failedCount,
      totalRevenue,
    };
  }

  /**
   * List campaign recipients with filtering
   */
  static async listRecipients(
    studioId: string,
    campaignId: string,
    query: { status?: MarketingRecipientStatus; limit?: number; offset?: number }
  ): Promise<{ recipients: MarketingCampaignRecipientDTO[]; total: number }> {
    const campaign = await prisma.marketingCampaign.findFirst({
      where: { id: campaignId, studio_id: studioId },
    });

    if (!campaign) {
      throw new Error('Campaign not found or unauthorized');
    }

    const where: any = { campaign_id: campaignId };
    if (query.status) where.status = query.status;

    const [items, total] = await Promise.all([
      prisma.marketingCampaignRecipient.findMany({
        where,
        orderBy: { created_at: 'asc' },
        take: query.limit || 50,
        skip: query.offset || 0,
      }),
      prisma.marketingCampaignRecipient.count({ where }),
    ]);

    const recipients: MarketingCampaignRecipientDTO[] = items.map(r => ({
      id: r.id,
      campaign_id: r.campaign_id,
      client_id: r.client_id,
      email: r.email,
      client_name: r.client_name,
      status: r.status as any,
      sent_at: r.sent_at,
      delivered_at: r.delivered_at,
      opened_at: r.opened_at,
      clicked_at: r.clicked_at,
      unsubscribed_at: r.unsubscribed_at,
      bounced_at: r.bounced_at,
      conversion_at: r.conversion_at,
      conversion_value: r.conversion_value,
      conversion_type: r.conversion_type,
      error_message: r.error_message,
      metadata: r.metadata as any,
      created_at: r.created_at,
      updated_at: r.updated_at,

      campaignId: r.campaign_id,
      clientId: r.client_id,
      clientName: r.client_name,
      sentAt: r.sent_at,
      deliveredAt: r.delivered_at,
      openedAt: r.opened_at,
      clickedAt: r.clicked_at,
      unsubscribedAt: r.unsubscribed_at,
      bouncedAt: r.bounced_at,
      conversionAt: r.conversion_at,
      conversionValue: r.conversion_value,
      conversionType: r.conversion_type,
      errorMessage: r.error_message,
      createdAt: r.created_at,
      updatedAt: r.updated_at,
    }));

    return { recipients, total };
  }

  /**
   * Export recipients to CSV format (Formula Injection Safe)
   */
  static async exportRecipientsCsv(studioId: string, campaignId: string): Promise<string> {
    const { recipients } = await this.listRecipients(studioId, campaignId, { limit: 5000 });

    const sanitizeCell = (val: any): string => {
      if (val === null || val === undefined) return '""';
      let str = String(val);
      // Protect against CSV formula injection (=, +, -, @, \t, \r)
      if (/^[=+\-@\t\r]/.test(str)) {
        str = `'${str}`;
      }
      return `"${str.replace(/"/g, '""')}"`;
    };

    const headers = ['Recipient ID', 'Client Name', 'Client Email', 'Status', 'Sent At', 'Delivered At', 'Opened At', 'Clicked At', 'Converted At', 'Conversion Value', 'Error Message'];
    const rows = recipients.map(r => [
      sanitizeCell(r.id),
      sanitizeCell(r.client_name),
      sanitizeCell(r.email),
      sanitizeCell(r.status),
      sanitizeCell(r.sent_at ? new Date(r.sent_at).toISOString() : ''),
      sanitizeCell(r.delivered_at ? new Date(r.delivered_at).toISOString() : ''),
      sanitizeCell(r.opened_at ? new Date(r.opened_at).toISOString() : ''),
      sanitizeCell(r.clicked_at ? new Date(r.clicked_at).toISOString() : ''),
      sanitizeCell(r.conversion_at ? new Date(r.conversion_at).toISOString() : ''),
      sanitizeCell(r.conversion_value !== null && r.conversion_value !== undefined ? r.conversion_value.toString() : ''),
      sanitizeCell(r.error_message),
    ]);

    return [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
  }

  /**
   * Delete campaign draft
   */
  static async deleteCampaign(studioId: string, campaignId: string): Promise<boolean> {
    const existing = await prisma.marketingCampaign.findFirst({
      where: { id: campaignId, studio_id: studioId },
    });

    if (!existing) {
      throw new Error('Campaign not found or unauthorized');
    }

    if (existing.status === MarketingCampaignStatus.SENDING || existing.status === MarketingCampaignStatus.COMPLETED) {
      throw new Error('Cannot delete active or completed campaigns');
    }

    await prisma.marketingCampaign.delete({
      where: { id: campaignId },
    });

    return true;
  }
}
