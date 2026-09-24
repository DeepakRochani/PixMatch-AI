import crypto from 'crypto';
import { prisma, EmailDeliveryStatus, NotificationEventType } from '@pixmatch/database';
import { EmailService } from '../../services/email/email.service.js';
import { compileEmailTemplate, StudioBranding } from '../../services/email/email.templates.js';
import { isValidEmailAddress, sanitizeHeaderValue } from '../../services/email/email.provider.js';

export interface DispatchNotificationParams {
  event: NotificationEventType | string;
  recipient: string;
  recipientName?: string | null;
  studioId?: string | null;
  clientId?: string | null;
  userId?: string | null;
  templateKey?: string;
  idempotencyKey?: string | null;
  variables?: Record<string, any>;
  studioBranding?: StudioBranding;
  customSubject?: string;
  forceSync?: boolean;
}

export interface DispatchResult {
  success: boolean;
  deliveryId?: string;
  status: EmailDeliveryStatus | string;
  messageId?: string;
  error?: string;
  suppressed?: boolean;
  skippedByPreference?: boolean;
}

const CRITICAL_SECURITY_EVENTS = new Set([
  'PASSWORD_RESET_REQUESTED',
  'EMAIL_VERIFICATION_REQUESTED',
  'SYSTEM_ALERT',
  'ADMIN_ALERT',
]);

const alertCooldowns = new Map<string, number>();

export class NotificationService {
  private static secretKey = process.env.JWT_SECRET || process.env.APP_SECRET || 'pixmatch-notification-secret-key';

  /**
   * Generates a tamper-proof HMAC-signed unsubscribe token
   */
  static generateUnsubscribeToken(email: string): string {
    const cleanEmail = email.toLowerCase().trim();
    const hmac = crypto.createHmac('sha256', this.secretKey);
    hmac.update(`unsub:${cleanEmail}`);
    return `${Buffer.from(cleanEmail).toString('base64url')}.${hmac.digest('hex').substring(0, 32)}`;
  }

  /**
   * Verifies an unsubscribe token
   */
  static verifyUnsubscribeToken(token: string): { valid: boolean; email?: string } {
    try {
      const parts = token.split('.');
      if (parts.length !== 2) return { valid: false };
      const email = Buffer.from(parts[0], 'base64url').toString('utf8');
      const expectedSignature = crypto.createHmac('sha256', this.secretKey)
        .update(`unsub:${email.toLowerCase().trim()}`)
        .digest('hex')
        .substring(0, 32);

      if (crypto.timingSafeEqual(Buffer.from(parts[1]), Buffer.from(expectedSignature))) {
        return { valid: true, email };
      }
      return { valid: false };
    } catch {
      return { valid: false };
    }
  }

  /**
   * Dispatches a notification across the system.
   */
  static async dispatch(params: DispatchNotificationParams): Promise<DispatchResult> {
    const recipient = params.recipient.trim();
    const eventStr = String(params.event).toUpperCase();

    // 1. Validate email address
    if (!isValidEmailAddress(recipient)) {
      return {
        success: false,
        status: 'FAILED',
        error: `INVALID_EMAIL: "${recipient}" is not a valid email address`,
      };
    }

    // 2. Map event to template key
    let templateKey = params.templateKey;
    if (!templateKey) {
      templateKey = eventStr;
    }

    // 3. Check Cooldown for System Alerts (Prevent alert spam)
    if (eventStr === 'SYSTEM_ALERT' || eventStr === 'ADMIN_ALERT') {
      const serviceKey = params.variables?.service_name || 'general';
      const now = Date.now();
      const lastAlert = alertCooldowns.get(serviceKey) || 0;
      if (now - lastAlert < 300000) { // 5-minute cooldown
        console.log(`[NotificationService] ⏳ Cooldown active for ${serviceKey} alert. Skipping email.`);
        return {
          success: true,
          status: 'SKIPPED',
          error: 'ALERT_COOLDOWN_ACTIVE',
        };
      }
      alertCooldowns.set(serviceKey, now);
    }

    // 4. Check Suppressions (unless it's a critical security event)
    const isCritical = CRITICAL_SECURITY_EVENTS.has(eventStr);
    if (!isCritical && process.env.DATABASE_URL) {
      try {
        const suppression = await prisma.emailSuppression.findUnique({
          where: { email: recipient.toLowerCase() },
        });
        if (suppression) {
          console.log(`[NotificationService] 🛑 Recipient ${recipient} is suppressed (${suppression.reason}). Skipping.`);
          return {
            success: true,
            status: 'SUPPRESSED',
            suppressed: true,
          };
        }
      } catch (dbErr: any) {
        // Fallthrough on DB connection issues in isolated test mode
      }
    }

    // 5. Check User/Studio Notification Preferences
    if (!isCritical && params.userId && params.studioId && process.env.DATABASE_URL) {
      try {
        const prefs = await prisma.notificationPreference.findUnique({
          where: {
            user_id_studio_id: {
              user_id: params.userId,
              studio_id: params.studioId,
            },
          },
        });

        if (prefs) {
          let disabled = false;
          if (eventStr.includes('GALLERY_DELIVERY') && !prefs.email_gallery_delivery) disabled = true;
          if (eventStr.includes('GALLERY_REMINDER') && !prefs.email_gallery_reminder) disabled = true;
          if (eventStr.includes('FAVORITE') && !prefs.email_client_favorites) disabled = true;
          if (eventStr.includes('SELECTION') && !prefs.email_client_selections) disabled = true;
          if (eventStr.includes('DOWNLOAD') && !prefs.email_client_downloads) disabled = true;
          if (eventStr.includes('SUBSCRIPTION') && !prefs.email_subscription_updates) disabled = true;
          if (eventStr.includes('PAYMENT_FAIL') && !prefs.email_payment_failures) disabled = true;
          if (eventStr.includes('STORAGE_SYNC') && !prefs.email_storage_sync_failures) disabled = true;
          if (eventStr.includes('AI_PROCESSING') && !prefs.email_ai_processing_failures) disabled = true;

          if (disabled) {
            console.log(`[NotificationService] 🔕 Notification ${eventStr} disabled by user preferences.`);
            return {
              success: true,
              status: 'SKIPPED_BY_PREFERENCE',
              skippedByPreference: true,
            };
          }
        }
      } catch (dbErr: any) {
        // Fallthrough
      }
    }

    // 6. Check Idempotency Key
    if (params.idempotencyKey && process.env.DATABASE_URL) {
      try {
        const existing = await prisma.emailDelivery.findUnique({
          where: { idempotency_key: params.idempotencyKey },
        });
        if (existing) {
          console.log(`[NotificationService] 🔁 Duplicate notification prevented by idempotency key: ${params.idempotencyKey}`);
          return {
            success: true,
            deliveryId: existing.id,
            status: existing.status,
            messageId: existing.provider_message_id || undefined,
          };
        }
      } catch (dbErr: any) {
        // Fallthrough
      }
    }

    // 7. Inject Unsubscribe URL if appropriate
    const vars = { ...(params.variables || {}) };
    if (!isCritical) {
      const token = this.generateUnsubscribeToken(recipient);
      const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
      vars.unsubscribe_url = `${appUrl}/api/v1/email/unsubscribe/${token}`;
    }

    // 8. Compile Template
    const rendered = compileEmailTemplate(templateKey, vars, params.studioBranding);
    const finalSubject = sanitizeHeaderValue(params.customSubject || rendered.subject);

    // 9. Create DB Delivery Record
    let deliveryRecordId: string = crypto.randomUUID();
    if (process.env.DATABASE_URL) {
      try {
        const record = await prisma.emailDelivery.create({
          data: {
            id: deliveryRecordId,
            studio_id: params.studioId || null,
            client_id: params.clientId || null,
            user_id: params.userId || null,
            template_key: templateKey,
            event_type: Object.values(NotificationEventType).includes(eventStr as any) ? (eventStr as any) : null,
            recipient: recipient.toLowerCase(),
            subject: finalSubject,
            provider: EmailService.getProvider().name,
            status: EmailDeliveryStatus.QUEUED,
            idempotency_key: params.idempotencyKey || null,
            metadata: {
              event: eventStr,
              has_branding: Boolean(params.studioBranding?.studioName),
            },
          },
        });
        deliveryRecordId = record.id;
      } catch (dbErr: any) {
        console.warn(`[NotificationService] Database write error: ${dbErr.message}`);
      }
    }

    // 10. Send Email (Direct or Queue)
    const emailOptions = {
      to: recipient,
      subject: finalSubject,
      text: rendered.text,
      html: rendered.html,
      idempotencyKey: params.idempotencyKey || undefined,
    };

    const result = await EmailService.getProvider().send(emailOptions);

    // Update status in DB
    if (process.env.DATABASE_URL) {
      try {
        if (result.success) {
          await prisma.emailDelivery.update({
            where: { id: deliveryRecordId },
            data: {
              status: EmailDeliveryStatus.SENT,
              provider_message_id: result.messageId || null,
              provider: result.provider || EmailService.getProvider().name,
              sent_at: new Date(),
              attempts: 1,
            },
          }).catch(() => null);
        } else {
          await prisma.emailDelivery.update({
            where: { id: deliveryRecordId },
            data: {
              status: EmailDeliveryStatus.FAILED,
              last_error: (result.error || 'Failed to send').substring(0, 500),
              failed_at: new Date(),
              attempts: 1,
            },
          }).catch(() => null);
        }
      } catch (dbErr: any) {
        // Fallthrough
      }
    }

    return {
      success: result.success,
      deliveryId: deliveryRecordId,
      status: result.success ? EmailDeliveryStatus.SENT : EmailDeliveryStatus.FAILED,
      messageId: result.messageId,
      error: result.error,
    };
  }

  /**
   * Retrieves notification preferences for a user in a studio
   */
  static async getPreferences(userId: string, studioId: string) {
    let prefs = await prisma.notificationPreference.findUnique({
      where: {
        user_id_studio_id: {
          user_id: userId,
          studio_id: studioId,
        },
      },
    }).catch(() => null);

    if (!prefs) {
      prefs = {
        id: crypto.randomUUID(),
        user_id: userId,
        studio_id: studioId,
        email_gallery_delivery: true,
        email_gallery_reminder: true,
        email_client_favorites: true,
        email_client_selections: true,
        email_client_downloads: true,
        email_subscription_updates: true,
        email_payment_failures: true,
        email_storage_sync_failures: true,
        email_ai_processing_failures: true,
        email_product_announcements: false,
        created_at: new Date(),
        updated_at: new Date(),
      };
    }

    return prefs;
  }

  /**
   * Updates notification preferences
   */
  static async updatePreferences(userId: string, studioId: string, updates: any) {
    try {
      return await prisma.notificationPreference.upsert({
        where: {
          user_id_studio_id: {
            user_id: userId,
            studio_id: studioId,
          },
        },
        create: {
          user_id: userId,
          studio_id: studioId,
          ...updates,
        },
        update: {
          ...updates,
          updated_at: new Date(),
        },
      });
    } catch {
      return {
        id: crypto.randomUUID(),
        user_id: userId,
        studio_id: studioId,
        email_gallery_delivery: true,
        email_gallery_reminder: true,
        email_client_favorites: true,
        email_client_selections: true,
        email_client_downloads: true,
        email_subscription_updates: true,
        email_payment_failures: true,
        email_storage_sync_failures: true,
        email_ai_processing_failures: true,
        email_product_announcements: false,
        ...updates,
        updated_at: new Date(),
      };
    }
  }

  /**
   * Records an email suppression (Unsubscribe, Bounce, Complaint)
   */
  static async suppressEmail(email: string, reason: 'UNSUBSCRIBED' | 'BOUNCED' | 'COMPLAINT' = 'UNSUBSCRIBED') {
    const cleanEmail = email.toLowerCase().trim();
    try {
      return await prisma.emailSuppression.upsert({
        where: { email: cleanEmail },
        create: {
          email: cleanEmail,
          reason,
          created_at: new Date(),
        },
        update: {
          reason,
        },
      });
    } catch {
      return {
        id: crypto.randomUUID(),
        email: cleanEmail,
        reason,
        created_at: new Date(),
      };
    }
  }
}
