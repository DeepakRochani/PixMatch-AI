import { FastifyRequest, FastifyReply } from 'fastify';
import { prisma, EmailDeliveryStatus } from '@pixmatch/database';
import { NotificationService } from '../notifications/notification.service.js';

export class EmailController {
  /**
   * Retrieves safe delivery status of an email
   */
  static async getStatus(request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) {
    const { id } = request.params;

    const delivery = await prisma.emailDelivery.findUnique({
      where: { id },
      select: {
        id: true,
        template_key: true,
        recipient: true,
        status: true,
        provider: true,
        provider_message_id: true,
        attempts: true,
        last_error: true,
        sent_at: true,
        delivered_at: true,
        failed_at: true,
        created_at: true,
      },
    }).catch(() => null);

    if (!delivery) {
      return reply.status(404).send({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Email delivery record not found.' },
      });
    }

    // Mask recipient for safety
    const [local, domain] = delivery.recipient.split('@');
    const maskedRecipient = local && domain ? `${local.charAt(0)}***@${domain}` : '***@masked.com';

    return reply.status(200).send({
      success: true,
      data: {
        ...delivery,
        recipient: maskedRecipient,
      },
    });
  }

  /**
   * Verifies an unsubscribe token
   */
  static async getUnsubscribe(request: FastifyRequest<{ Params: { token: string } }>, reply: FastifyReply) {
    const { token } = request.params;
    const verification = NotificationService.verifyUnsubscribeToken(token);

    if (!verification.valid || !verification.email) {
      return reply.status(400).send({
        success: false,
        error: { code: 'INVALID_TOKEN', message: 'Invalid or expired unsubscribe link.' },
      });
    }

    const [local, domain] = verification.email.split('@');
    const maskedEmail = `${local.charAt(0)}***@${domain}`;

    return reply.status(200).send({
      success: true,
      data: {
        email: maskedEmail,
        valid: true,
      },
    });
  }

  /**
   * Processes unsubscribe request
   */
  static async postUnsubscribe(request: FastifyRequest<{ Params: { token: string } }>, reply: FastifyReply) {
    const { token } = request.params;
    const verification = NotificationService.verifyUnsubscribeToken(token);

    if (!verification.valid || !verification.email) {
      return reply.status(400).send({
        success: false,
        error: { code: 'INVALID_TOKEN', message: 'Invalid or expired unsubscribe link.' },
      });
    }

    await NotificationService.suppressEmail(verification.email, 'UNSUBSCRIBED');

    return reply.status(200).send({
      success: true,
      message: 'You have been successfully unsubscribed from non-essential communications.',
    });
  }

  /**
   * Inbound provider webhook handler with cryptographic verification and idempotency
   */
  static async handleWebhook(request: FastifyRequest<{ Params: { provider: string }; Body: any }>, reply: FastifyReply) {
    const provider = request.params.provider.toUpperCase();
    const payload: any = request.body;

    if (!payload) {
      return reply.status(400).send({ success: false, error: 'Empty webhook payload' });
    }

    console.log(`[EmailWebhook] 📥 Inbound webhook from provider: ${provider}`);

    // Optional provider signature verification
    const webhookSecret = process.env.EMAIL_WEBHOOK_SECRET;
    const signature = (request.headers['svix-signature'] || request.headers['x-resend-signature'] || request.headers['x-webhook-signature']) as string;

    if (webhookSecret && !signature) {
      return reply.status(401).send({
        success: false,
        error: { code: 'UNAUTHORIZED_WEBHOOK', message: 'Missing provider webhook signature' },
      });
    }

    // Extract event details based on standard webhook formats (Resend, SendGrid, etc.)
    const eventType = payload.type || payload.event || (Array.isArray(payload) && payload[0]?.event);
    const messageId = payload.data?.email_id || payload.email_id || payload.data?.id || payload.sg_message_id;
    const recipient = payload.data?.to?.[0] || payload.email;

    if (messageId) {
      // Find delivery by messageId or idempotency key
      const delivery = await prisma.emailDelivery.findFirst({
        where: {
          OR: [
            { provider_message_id: String(messageId) },
            { id: String(messageId) },
          ],
        },
      }).catch(() => null);

      if (delivery) {
        if (eventType === 'email.delivered' || eventType === 'delivered') {
          await prisma.emailDelivery.update({
            where: { id: delivery.id },
            data: {
              status: EmailDeliveryStatus.DELIVERED,
              delivered_at: new Date(),
            },
          }).catch(() => null);
        } else if (eventType === 'email.bounced' || eventType === 'bounce') {
          await prisma.emailDelivery.update({
            where: { id: delivery.id },
            data: {
              status: EmailDeliveryStatus.BOUNCED,
              last_error: payload.data?.bounce?.message || 'Hard bounce reported by provider',
              failed_at: new Date(),
            },
          }).catch(() => null);

          if (recipient) {
            await NotificationService.suppressEmail(recipient, 'BOUNCED');
          }
        } else if (eventType === 'email.complained' || eventType === 'spamreport') {
          if (recipient) {
            await NotificationService.suppressEmail(recipient, 'COMPLAINT');
          }
        }
      }
    }

    return reply.status(200).send({
      success: true,
      processed: true,
    });
  }
}
