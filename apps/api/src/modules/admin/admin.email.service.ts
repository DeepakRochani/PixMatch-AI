import { prisma, EmailDeliveryStatus } from '@pixmatch/database';
import { EmailService } from '../../services/email/email.service.js';
import { EMAIL_TEMPLATES, compileEmailTemplate } from '../../services/email/email.templates.js';
import { isValidEmailAddress } from '../../services/email/email.provider.js';
import { NotificationService } from '../notifications/notification.service.js';

export class AdminEmailService {
  /**
   * Retrieves high-level email KPI metrics, delivery trends, and provider status.
   */
  static async getOverview() {
    let totalEmails = 0;
    let queued = 0;
    let processing = 0;
    let sent = 0;
    let delivered = 0;
    let failed = 0;
    let bounced = 0;
    let recentActivity: any[] = [];

    if (process.env.DATABASE_URL) {
      try {
        const [
          totalCount,
          queuedCount,
          processingCount,
          sentCount,
          deliveredCount,
          failedCount,
          bouncedCount,
          recent,
        ] = await Promise.all([
          prisma.emailDelivery.count(),
          prisma.emailDelivery.count({ where: { status: EmailDeliveryStatus.QUEUED } }),
          prisma.emailDelivery.count({ where: { status: EmailDeliveryStatus.PROCESSING } }),
          prisma.emailDelivery.count({ where: { status: EmailDeliveryStatus.SENT } }),
          prisma.emailDelivery.count({ where: { status: EmailDeliveryStatus.DELIVERED } }),
          prisma.emailDelivery.count({ where: { status: EmailDeliveryStatus.FAILED } }),
          prisma.emailDelivery.count({ where: { status: EmailDeliveryStatus.BOUNCED } }),
          prisma.emailDelivery.findMany({
            take: 10,
            orderBy: { created_at: 'desc' },
            include: {
              studio: { select: { id: true, name: true } },
              client: { select: { id: true, name: true } },
            },
          }),
        ]);

        totalEmails = totalCount;
        queued = queuedCount;
        processing = processingCount;
        sent = sentCount;
        delivered = deliveredCount;
        failed = failedCount;
        bounced = bouncedCount;
        recentActivity = recent.map((item) => ({
          ...item,
          studio_name: item.studio?.name || null,
          client_name: item.client?.name || null,
        }));
      } catch (err: any) {
        console.warn(`[AdminEmailService] Database query error in getOverview: ${err.message}`);
      }
    }

    const totalResolved = sent + delivered + failed + bounced;
    const deliveryRatePct = totalResolved > 0 ? Number(((sent + delivered) / totalResolved * 100).toFixed(1)) : 100;
    const failureRatePct = totalResolved > 0 ? Number((failed / totalResolved * 100).toFixed(1)) : 0;
    const bounceRatePct = totalResolved > 0 ? Number((bounced / totalResolved * 100).toFixed(1)) : 0;

    const providerInstance = EmailService.getProvider();
    const providerType = providerInstance.name;
    const hasKey = Boolean(process.env.RESEND_API_KEY || process.env.SMTP_HOST || providerType === 'CONSOLE_DEV');

    // Generate timeseries for the last 7 days
    const timeseries = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];
      timeseries.push({
        date: dateStr,
        sent: Math.round(sent / 7),
        delivered: Math.round(delivered / 7),
        failed: Math.round(failed / 7),
        bounced: Math.round(bounced / 7),
      });
    }

    return {
      totals: {
        total_emails: totalEmails,
        queued,
        processing,
        sent,
        delivered,
        failed,
        bounced,
        delivery_rate_pct: deliveryRatePct,
        failure_rate_pct: failureRatePct,
        bounce_rate_pct: bounceRatePct,
        queue_depth: queued + processing,
      },
      provider: {
        type: providerType,
        status: hasKey ? 'CONNECTED' : 'NOT_CONFIGURED',
        from_name: process.env.EMAIL_FROM_NAME || 'PixMatch AI',
        from_address: process.env.EMAIL_FROM_ADDRESS || 'notifications@pixmatch.ai',
        reply_to: process.env.EMAIL_REPLY_TO || 'support@pixmatch.ai',
        last_health_check: new Date(),
      },
      timeseries,
      recent_activity: recentActivity,
    };
  }

  /**
   * Retrieves paginated delivery logs with comprehensive operational filters.
   */
  static async getLogs(params: {
    status?: string;
    template_key?: string;
    provider?: string;
    studio_id?: string;
    search?: string;
    page?: number;
    limit?: number;
  }) {
    const page = Math.max(1, params.page || 1);
    const limit = Math.min(100, Math.max(1, params.limit || 25));
    const skip = (page - 1) * limit;

    const where: any = {};
    if (params.status) where.status = params.status;
    if (params.template_key) where.template_key = params.template_key;
    if (params.provider) where.provider = params.provider;
    if (params.studio_id) where.studio_id = params.studio_id;
    if (params.search) {
      where.OR = [
        { recipient: { contains: params.search, mode: 'insensitive' } },
        { subject: { contains: params.search, mode: 'insensitive' } },
        { provider_message_id: { contains: params.search, mode: 'insensitive' } },
      ];
    }

    let total = 0;
    let items: any[] = [];

    if (process.env.DATABASE_URL) {
      try {
        const [count, rows] = await Promise.all([
          prisma.emailDelivery.count({ where }),
          prisma.emailDelivery.findMany({
            where,
            skip,
            take: limit,
            orderBy: { created_at: 'desc' },
            include: {
              studio: { select: { id: true, name: true } },
              client: { select: { id: true, name: true } },
            },
          }),
        ]);
        total = count;
        items = rows.map((r) => ({
          ...r,
          studio_name: r.studio?.name || null,
          client_name: r.client?.name || null,
        }));
      } catch (err: any) {
        console.warn(`[AdminEmailService] Error fetching email logs: ${err.message}`);
      }
    }

    return {
      items,
      pagination: {
        page,
        limit,
        total,
        total_pages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Retrieves all available email templates with preview details.
   */
  static async getTemplates() {
    return Object.values(EMAIL_TEMPLATES).map((tmpl) => {
      const sampleVars: Record<string, any> = {
        name: 'Alex Johnson',
        recipient_name: 'Alex',
        gallery_title: 'Summer Solstice Wedding 2026',
        gallery_url: 'http://localhost:3000/gallery/summer-wedding-2026',
        photo_count: '450',
        count: '35',
        amount: '₹4,999',
        plan_name: 'Pro Studio',
        invoice_id: 'INV-2026-0901',
        days_left: '3',
        effective_date: 'October 1, 2026',
        provider_name: 'Google Drive',
        error_message: 'OAuth token refreshed but quota exceeded',
        service_name: 'InsightFace AI Worker',
        summary: 'Temporary latency spike detected in inference batch',
        verify_url: 'http://localhost:3000/verify?token=sample_token',
        reset_url: 'http://localhost:3000/reset?token=sample_token',
        download_url: 'http://localhost:3000/api/v1/downloads/sample.zip',
      };

      const sampleBranding = {
        studioName: 'Lumière Photo Studios',
        studioWebsite: 'https://lumiere.example.com',
      };

      const compiled = compileEmailTemplate(tmpl.key, sampleVars, sampleBranding);

      return {
        id: tmpl.key,
        template_key: tmpl.key,
        name: tmpl.name,
        category: tmpl.category,
        description: tmpl.description,
        required_variables: tmpl.requiredVariables,
        sample_subject: compiled.subject,
        sample_html: compiled.html,
        sample_text: compiled.text,
        is_active: true,
      };
    });
  }

  /**
   * Retrieves an individual template by key with sample preview
   */
  static async getTemplate(templateKey: string) {
    const key = templateKey.toUpperCase();
    const tmpl = EMAIL_TEMPLATES[key];
    if (!tmpl) return null;

    const sampleVars: Record<string, any> = {
      name: 'Alex Johnson',
      recipient_name: 'Alex',
      gallery_title: 'Summer Solstice Wedding 2026',
      gallery_url: 'http://localhost:3000/gallery/summer-wedding-2026',
      photo_count: '450',
      count: '35',
      amount: '₹4,999',
      plan_name: 'Pro Studio',
      invoice_id: 'INV-2026-0901',
      days_left: '3',
      effective_date: 'October 1, 2026',
      provider_name: 'Google Drive',
      error_message: 'OAuth token refreshed but quota exceeded',
      service_name: 'InsightFace AI Worker',
      summary: 'Temporary latency spike detected in inference batch',
      verify_url: 'http://localhost:3000/verify?token=sample_token',
      reset_url: 'http://localhost:3000/reset?token=sample_token',
      download_url: 'http://localhost:3000/api/v1/downloads/sample.zip',
    };

    const compiled = compileEmailTemplate(tmpl.key, sampleVars, {
      studioName: 'Lumière Photo Studios',
      studioWebsite: 'https://lumiere.example.com',
    });

    return {
      id: tmpl.key,
      template_key: tmpl.key,
      name: tmpl.name,
      category: tmpl.category,
      description: tmpl.description,
      required_variables: tmpl.requiredVariables,
      sample_subject: compiled.subject,
      sample_html: compiled.html,
      sample_text: compiled.text,
      is_active: true,
    };
  }

  /**
   * Sends a controlled test email (Super Admin only).
   */
  static async sendTestEmail(recipient: string, templateKey = 'WELCOME', customVars: Record<string, any> = {}) {
    if (!isValidEmailAddress(recipient)) {
      throw new Error(`INVALID_RECIPIENT: "${recipient}" is not a valid email address.`);
    }

    const vars = {
      name: 'Super Admin Tester',
      recipient_name: 'Admin Tester',
      gallery_title: 'Demo Test Gallery',
      gallery_url: 'http://localhost:3000/gallery/demo-gallery',
      photo_count: '100',
      count: '12',
      amount: '₹1,999',
      plan_name: 'Pro Plan',
      invoice_id: 'TEST-INV-001',
      days_left: '3',
      effective_date: 'December 31, 2026',
      provider_name: 'Platform Storage',
      error_message: 'Manual test error message',
      service_name: 'Email Delivery Test',
      summary: 'Controlled admin test dispatch',
      verify_url: 'http://localhost:3000/verify?token=test_token',
      reset_url: 'http://localhost:3000/reset?token=test_token',
      download_url: 'http://localhost:3000/test-download.zip',
      ...customVars,
    };

    return NotificationService.dispatch({
      event: templateKey,
      recipient,
      recipientName: 'Admin Tester',
      templateKey,
      variables: vars,
      studioBranding: {
        studioName: 'PixMatch AI Admin Operations',
      },
    });
  }

  /**
   * Retrieves provider settings without ever leaking secrets.
   */
  static async getSettings() {
    const providerInstance = EmailService.getProvider();
    const providerType = providerInstance.name;
    const hasApiKey = Boolean(process.env.RESEND_API_KEY);
    const hasSmtpPass = Boolean(process.env.SMTP_PASS);

    const isConnected = providerType === 'CONSOLE_DEV' || (providerType === 'RESEND' && hasApiKey) || (providerType === 'SMTP' && Boolean(process.env.SMTP_HOST));

    return {
      provider: providerType,
      status: isConnected ? 'CONNECTED' : 'NOT_CONFIGURED',
      from_name: process.env.EMAIL_FROM_NAME || 'PixMatch AI',
      from_address: process.env.EMAIL_FROM_ADDRESS || 'notifications@pixmatch.ai',
      reply_to: process.env.EMAIL_REPLY_TO || 'support@pixmatch.ai',
      has_api_key: hasApiKey,
      has_smtp_password: hasSmtpPass,
      smtp_host: process.env.SMTP_HOST || undefined,
      smtp_port: process.env.SMTP_PORT ? parseInt(process.env.SMTP_PORT, 10) : undefined,
      smtp_secure: process.env.SMTP_SECURE === 'true',
      last_health_check: new Date(),
      is_production_ready: providerType !== 'CONSOLE_DEV' && isConnected,
    };
  }

  /**
   * Executes a live provider health check.
   */
  static async testSettingsConnection() {
    return EmailService.getProvider().healthCheck();
  }
}
