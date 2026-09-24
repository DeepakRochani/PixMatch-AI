import { Job } from 'bullmq';
import { prisma, EmailDeliveryStatus } from '@pixmatch/database';
import { EmailService } from '../../../api/src/services/email/email.service.js';
import { compileEmailTemplate, StudioBranding } from '../../../api/src/services/email/email.templates.js';
import { isTransientEmailError } from '../../../api/src/services/email/email.provider.js';

export interface EmailDeliveryJobData {
  deliveryId: string;
  recipient: string;
  subject?: string;
  templateKey: string;
  variables: Record<string, any>;
  studioBranding?: StudioBranding;
  idempotencyKey?: string;
  studioId?: string;
  clientId?: string;
  userId?: string;
  eventType?: string;
}

/**
 * Processes an individual asynchronous email delivery job with safe error classification and retries.
 */
export async function processEmailDelivery(job: Job<EmailDeliveryJobData>): Promise<{ success: boolean; messageId?: string }> {
  const { deliveryId, recipient, templateKey, variables, studioBranding, idempotencyKey } = job.data;
  const attemptsMade = job.attemptsMade + 1;

  console.log(`[EmailWorker] 📨 Processing delivery ${deliveryId} (Attempt ${attemptsMade}) for [${recipient}] with template [${templateKey}]`);

  // 1. Mark status as PROCESSING in database if deliveryId exists
  if (deliveryId && process.env.DATABASE_URL) {
    await prisma.emailDelivery.update({
      where: { id: deliveryId },
      data: {
        status: EmailDeliveryStatus.PROCESSING,
        attempts: attemptsMade,
      },
    }).catch((err) => console.warn(`[EmailWorker] Failed to update delivery to PROCESSING: ${err.message}`));
  }

  // 2. Compile template with safe HTML escaping
  const rendered = compileEmailTemplate(templateKey, variables, studioBranding);
  const subject = job.data.subject || rendered.subject;

  // 3. Send email via active provider
  const result = await EmailService.getProvider().send({
    to: recipient,
    subject,
    text: rendered.text,
    html: rendered.html,
    idempotencyKey,
  });

  // 4. Handle success
  if (result.success) {
    console.log(`[EmailWorker] ✅ Email delivered successfully: ID ${deliveryId} | Provider: ${result.provider || 'CONSOLE_DEV'} | MsgID: ${result.messageId}`);
    
    if (deliveryId && process.env.DATABASE_URL) {
      await prisma.emailDelivery.update({
        where: { id: deliveryId },
        data: {
          status: EmailDeliveryStatus.SENT,
          provider_message_id: result.messageId || null,
          provider: result.provider || 'CONSOLE_DEV',
          sent_at: new Date(),
          last_error: null,
        },
      }).catch(() => null);
    }

    return {
      success: true,
      messageId: result.messageId,
    };
  }

  // 5. Handle failure
  const errorMsg = result.error || 'Unknown email delivery failure';
  const isTransient = result.isTransient !== undefined ? result.isTransient : isTransientEmailError(errorMsg);

  console.warn(`[EmailWorker] ❌ Email delivery failed: ID ${deliveryId} | Transient: ${isTransient} | Error: ${errorMsg}`);

  if (deliveryId && process.env.DATABASE_URL) {
    const isFinalAttempt = !isTransient || attemptsMade >= 5;
    await prisma.emailDelivery.update({
      where: { id: deliveryId },
      data: {
        status: isFinalAttempt ? EmailDeliveryStatus.FAILED : EmailDeliveryStatus.QUEUED,
        last_error: errorMsg.substring(0, 500),
        failed_at: isFinalAttempt ? new Date() : undefined,
      },
    }).catch(() => null);
  }

  // If permanent error, do not allow BullMQ retry
  if (!isTransient) {
    console.warn(`[EmailWorker] 🛑 Permanent email error encountered. Aborting retries for delivery ${deliveryId}.`);
    // Return graceful failure without throwing to prevent retry
    return {
      success: false,
    };
  }

  // If transient, throw error so BullMQ handles exponential backoff retry
  throw new Error(`TRANSIENT_EMAIL_FAILURE: ${errorMsg}`);
}
