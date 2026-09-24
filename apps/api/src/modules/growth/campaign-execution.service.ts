/**
 * Campaign Execution Service — PixMatch AI Phase 19
 * Safely dispatches approved marketing campaigns with real-time suppression checks,
 * engagement event tracking (opens, clicks, unsubscribes), and attributed conversion recording.
 */

import crypto from 'crypto';
import {
  prisma,
  MarketingCampaignStatus,
  MarketingRecipientStatus,
} from '@pixmatch/database';
import { NotificationService } from '../notifications/notification.service.js';
import { EmailService } from '../../services/email/email.service.js';

export class CampaignExecutionService {
  private static secretKey = process.env.JWT_SECRET || process.env.APP_SECRET || 'pixmatch-growth-secret-key';

  /**
   * Generates a tamper-proof tracking token for a campaign recipient
   */
  static generateTrackingToken(recipientId: string, action: string): string {
    const hmac = crypto.createHmac('sha256', this.secretKey);
    hmac.update(`${recipientId}:${action}`);
    return `${Buffer.from(recipientId).toString('base64url')}.${action}.${hmac.digest('hex').substring(0, 24)}`;
  }

  /**
   * Verifies a tracking token
   */
  static verifyTrackingToken(token: string): { valid: boolean; recipientId?: string; action?: string } {
    try {
      const parts = token.split('.');
      if (parts.length !== 3) return { valid: false };
      const [b64RecipientId, action, signature] = parts;
      const recipientId = Buffer.from(b64RecipientId, 'base64url').toString('utf8');
      const hmac = crypto.createHmac('sha256', this.secretKey);
      hmac.update(`${recipientId}:${action}`);
      const expected = hmac.digest('hex').substring(0, 24);
      if (signature !== expected) return { valid: false };
      return { valid: true, recipientId, action };
    } catch {
      return { valid: false };
    }
  }

  /**
   * Dispatch an approved campaign.
   */
  static async dispatchCampaign(
    studioId: string,
    campaignId: string
  ): Promise<{ sent: number; suppressed: number; failed: number }> {
    const campaign = await prisma.marketingCampaign.findFirst({
      where: { id: campaignId, studio_id: studioId },
      include: {
        recipients: {
          where: { status: MarketingRecipientStatus.PENDING },
        },
        studio: { select: { name: true, slug: true } },
      },
    });

    if (!campaign) {
      throw new Error('Campaign not found or unauthorized');
    }

    // STRICT HUMAN APPROVAL GATE VERIFICATION
    if (!campaign.approved_by || !campaign.approved_at) {
      throw new Error('Campaign cannot be sent without verified human approval (approved_by required)');
    }

    if (
      campaign.status !== MarketingCampaignStatus.APPROVED &&
      campaign.status !== MarketingCampaignStatus.SCHEDULED
    ) {
      throw new Error(`Campaign must be APPROVED or SCHEDULED to dispatch (current status: ${campaign.status})`);
    }

    // Update campaign status to SENDING
    await prisma.marketingCampaign.update({
      where: { id: campaignId },
      data: {
        status: MarketingCampaignStatus.SENDING,
        started_at: new Date(),
      },
    });

    let sent = 0;
    let suppressed = 0;
    let failed = 0;

    for (const recipient of campaign.recipients) {
      try {
        // Real-time suppression re-check
        const isSuppressed = await prisma.emailSuppression.findFirst({
          where: { email: recipient.email.toLowerCase().trim() },
        });

        if (isSuppressed) {
          await prisma.marketingCampaignRecipient.update({
            where: { id: recipient.id },
            data: {
              status: MarketingRecipientStatus.SUPPRESSED,
              error_message: `Suppressed due to previous ${isSuppressed.reason}`,
            },
          });
          suppressed++;
          continue;
        }

        // Generate tracking tokens
        const openToken = this.generateTrackingToken(recipient.id, 'open');
        const clickToken = this.generateTrackingToken(recipient.id, 'click');
        const unsubToken = NotificationService.generateUnsubscribeToken(recipient.email);

        const baseUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.API_BASE_URL || 'http://localhost:3000';
        const trackingPixelUrl = `${baseUrl}/api/v1/growth/track/open?t=${openToken}`;
        const trackedCtaUrl = campaign.cta_url
          ? `${baseUrl}/api/v1/growth/track/click?t=${clickToken}&url=${encodeURIComponent(campaign.cta_url)}`
          : undefined;
        const unsubscribeUrl = `${baseUrl}/unsubscribe?token=${unsubToken}`;

        // Personalize email content
        const recipientName = recipient.client_name || recipient.email.split('@')[0];
        const personalizedContent = campaign.content
          .replace(/\{\{client_name\}\}/gi, recipientName)
          .replace(/\{\{studio_name\}\}/gi, campaign.studio.name);

        const htmlBody = `
          <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; color: #1e293b;">
            <div style="margin-bottom: 24px; font-size: 18px; font-weight: 600; color: #0f172a;">${campaign.studio.name}</div>
            <div style="font-size: 15px; line-height: 1.6; color: #334155; white-space: pre-wrap;">${personalizedContent}</div>
            ${campaign.offer_text ? `<div style="margin: 20px 0; padding: 16px; background-color: #f8fafc; border-left: 4px solid #6366f1; border-radius: 4px; font-weight: 500;">${campaign.offer_text}</div>` : ''}
            ${trackedCtaUrl && campaign.cta_text ? `
              <div style="margin: 28px 0;">
                <a href="${trackedCtaUrl}" style="background-color: #4f46e5; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 600; display: inline-block;">
                  ${campaign.cta_text}
                </a>
              </div>
            ` : ''}
            <div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #e2e8f0; font-size: 12px; color: #94a3b8;">
              <p>Sent by ${campaign.studio.name} via PixMatch AI.</p>
              <p><a href="${unsubscribeUrl}" style="color: #64748b; text-decoration: underline;">Unsubscribe from marketing emails</a></p>
            </div>
            <img src="${trackingPixelUrl}" width="1" height="1" style="display:none;" alt="" />
          </div>
        `;

        const textBody = `${personalizedContent}\n\n${campaign.offer_text ? `Special Offer: ${campaign.offer_text}\n\n` : ''}${campaign.cta_text && campaign.cta_url ? `${campaign.cta_text}: ${campaign.cta_url}\n\n` : ''}Unsubscribe: ${unsubscribeUrl}`;

        const sendResult = await EmailService.sendEmail({
          to: recipient.email,
          subject: campaign.subject,
          html: htmlBody,
          text: textBody,
        });

        if (sendResult.success) {
          const now = new Date();
          await prisma.marketingCampaignRecipient.update({
            where: { id: recipient.id },
            data: {
              status: MarketingRecipientStatus.DELIVERED,
              sent_at: now,
              delivered_at: now,
              metadata: { messageId: sendResult.messageId },
            },
          });
          sent++;
        } else {
          await prisma.marketingCampaignRecipient.update({
            where: { id: recipient.id },
            data: {
              status: MarketingRecipientStatus.FAILED,
              error_message: sendResult.error || 'Failed to dispatch via provider',
            },
          });
          failed++;
        }
      } catch (err: any) {
        await prisma.marketingCampaignRecipient.update({
          where: { id: recipient.id },
          data: {
            status: MarketingRecipientStatus.FAILED,
            error_message: err.message || 'Dispatch error',
          },
        });
        failed++;
      }
    }

    // Mark campaign COMPLETED
    await prisma.marketingCampaign.update({
      where: { id: campaignId },
      data: {
        status: MarketingCampaignStatus.COMPLETED,
        completed_at: new Date(),
      },
    });

    return { sent, suppressed, failed };
  }

  /**
   * Track email open event via 1x1 transparent tracking pixel
   */
  static async recordOpen(token: string): Promise<boolean> {
    const verification = this.verifyTrackingToken(token);
    if (!verification.valid || !verification.recipientId) return false;

    const recipient = await prisma.marketingCampaignRecipient.findUnique({
      where: { id: verification.recipientId },
    });

    if (!recipient) return false;

    if (!recipient.opened_at) {
      await prisma.marketingCampaignRecipient.update({
        where: { id: recipient.id },
        data: {
          opened_at: new Date(),
          status:
            recipient.status === MarketingRecipientStatus.DELIVERED || recipient.status === MarketingRecipientStatus.SENT
              ? MarketingRecipientStatus.OPENED
              : recipient.status,
        },
      });
    }

    return true;
  }

  /**
   * Track CTA link click event
   */
  static async recordClick(token: string): Promise<{ success: boolean; redirectUrl?: string }> {
    const verification = this.verifyTrackingToken(token);
    if (!verification.valid || !verification.recipientId) {
      return { success: false };
    }

    const recipient = await prisma.marketingCampaignRecipient.findUnique({
      where: { id: verification.recipientId },
      include: { campaign: true },
    });

    if (!recipient) return { success: false };

    const now = new Date();
    await prisma.marketingCampaignRecipient.update({
      where: { id: recipient.id },
      data: {
        clicked_at: recipient.clicked_at || now,
        opened_at: recipient.opened_at || now,
        status:
          recipient.status !== MarketingRecipientStatus.CONVERTED
            ? MarketingRecipientStatus.CLICKED
            : MarketingRecipientStatus.CONVERTED,
      },
    });

    return {
      success: true,
      redirectUrl: recipient.campaign.cta_url || undefined,
    };
  }

  /**
   * Record verified conversion attributed to a campaign recipient.
   * Strictly relies on actual booking/transaction/payment event with genuine value.
   */
  static async recordConversion(
    recipientId: string,
    conversionValue: number,
    conversionType: string = 'BOOKING'
  ): Promise<boolean> {
    const recipient = await prisma.marketingCampaignRecipient.findUnique({
      where: { id: recipientId },
    });

    if (!recipient) return false;

    await prisma.marketingCampaignRecipient.update({
      where: { id: recipientId },
      data: {
        status: MarketingRecipientStatus.CONVERTED,
        conversion_at: new Date(),
        conversion_value: conversionValue,
        conversion_type: conversionType,
      },
    });

    return true;
  }
}
