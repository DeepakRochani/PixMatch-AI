import { EmailProvider, createEmailProviderFromEnv, EmailResult, EmailOptions } from './email.provider.js';
import { compileEmailTemplate, StudioBranding } from './email.templates.js';

export interface GalleryEmailData {
  recipientEmail: string;
  recipientName?: string | null;
  galleryTitle: string;
  gallerySlug: string;
  eventType?: string;
  eventDate?: Date | string;
  coverPhotoUrl?: string | null;
  customMessage?: string | null;
  isPasswordProtected?: boolean;
  expiresAt?: Date | string | null;
  downloadsEnabled?: boolean;
  studioName: string;
  studioLogoUrl?: string | null;
  studioWebsite?: string | null;
  appPublicUrl?: string;
  idempotencyKey?: string;
}

export class EmailService {
  private static provider: EmailProvider = createEmailProviderFromEnv();

  static setProvider(provider: EmailProvider) {
    this.provider = provider;
  }

  static getProvider(): EmailProvider {
    return this.provider;
  }

  /**
   * Dispatches a raw or compiled email through the configured provider
   */
  static async sendEmail(options: EmailOptions): Promise<EmailResult> {
    return this.provider.send(options);
  }

  /**
   * Generates and dispatches a professional Gallery Ready delivery email.
   * Preserves full backward-compatibility with Phase 7.
   */
  static async sendGalleryDelivery(data: GalleryEmailData): Promise<EmailResult> {
    const publicUrl = data.appPublicUrl || process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const galleryUrl = `${publicUrl}/gallery/${data.gallerySlug}`;

    const formattedDate = data.eventDate
      ? new Date(data.eventDate).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
      : null;

    const formattedExpiry = data.expiresAt
      ? new Date(data.expiresAt).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
      : null;

    const branding: StudioBranding = {
      studioName: data.studioName,
      studioLogoUrl: data.studioLogoUrl,
      studioWebsite: data.studioWebsite,
    };

    const rendered = compileEmailTemplate('GALLERY_DELIVERY', {
      recipient_name: data.recipientName,
      gallery_title: data.galleryTitle,
      gallery_url: galleryUrl,
      event_type: data.eventType,
      event_date: formattedDate,
      custom_message: data.customMessage,
      expires_at: formattedExpiry,
      downloads_enabled: data.downloadsEnabled,
      is_password_protected: data.isPasswordProtected,
    }, branding);

    return this.provider.send({
      to: data.recipientEmail,
      subject: rendered.subject,
      text: rendered.text,
      html: rendered.html,
      idempotencyKey: data.idempotencyKey,
    });
  }

  /**
   * Generates and dispatches a friendly Gallery Reminder email.
   * Preserves full backward-compatibility with Phase 7.
   */
  static async sendGalleryReminder(data: GalleryEmailData): Promise<EmailResult> {
    const publicUrl = data.appPublicUrl || process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const galleryUrl = `${publicUrl}/gallery/${data.gallerySlug}`;

    const branding: StudioBranding = {
      studioName: data.studioName,
      studioLogoUrl: data.studioLogoUrl,
      studioWebsite: data.studioWebsite,
    };

    const rendered = compileEmailTemplate('GALLERY_REMINDER', {
      recipient_name: data.recipientName,
      gallery_title: data.galleryTitle,
      gallery_url: galleryUrl,
      custom_message: data.customMessage,
    }, branding);

    return this.provider.send({
      to: data.recipientEmail,
      subject: rendered.subject,
      text: rendered.text,
      html: rendered.html,
      idempotencyKey: data.idempotencyKey,
    });
  }
}
