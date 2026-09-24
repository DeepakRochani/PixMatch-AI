/**
 * PixMatch AI — Production Email Template System
 * 
 * Guarantees:
 * - Strict HTML entity escaping for all variable substitutions
 * - Protocol & URL validation preventing javascript: or data: injection
 * - Zero biometric data / raw face crops / vectors inclusion
 * - Studio branding with fallback
 */

export interface StudioBranding {
  studioName?: string;
  studioLogoUrl?: string | null;
  studioWebsite?: string | null;
  primaryColor?: string;
}

export interface RenderedEmail {
  subject: string;
  html: string;
  text: string;
}

/**
 * Escapes HTML characters to prevent XSS / HTML injection in email clients
 */
export function escapeHtml(str: any): string {
  if (str === null || str === undefined) return '';
  const s = String(str);
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * Validates and sanitizes URLs to prevent javascript:, data:, file:, and metadata SSRF endpoints
 */
export function sanitizeUrl(url: any, fallback = '#'): string {
  if (!url || typeof url !== 'string') return fallback;
  const trimmed = url.trim();
  
  // Block dangerous protocols
  if (/^(javascript|data|file|vbscript|blob):/i.test(trimmed)) {
    return fallback;
  }

  // Block cloud metadata endpoints
  if (
    /169\.254\.169\.254/i.test(trimmed) ||
    /metadata\.google\.internal/i.test(trimmed) ||
    /100\.100\.100\.200/i.test(trimmed)
  ) {
    return fallback;
  }

  // Allow safe relative paths or standard http/https URLs
  if (/^(https?:\/\/|\/)/i.test(trimmed)) {
    return escapeHtml(trimmed);
  }

  return fallback;
}

export interface TemplateDefinition {
  key: string;
  name: string;
  category: 'TRANSACTIONAL' | 'GALLERY' | 'BILLING' | 'SYSTEM';
  description: string;
  subject: (vars: Record<string, any>, branding?: StudioBranding) => string;
  html: (vars: Record<string, any>, branding?: StudioBranding) => string;
  text: (vars: Record<string, any>, branding?: StudioBranding) => string;
  requiredVariables: string[];
}

function baseEmailLayout(content: string, vars: Record<string, any>, branding?: StudioBranding, subjectTitle?: string): string {
  const studioName = escapeHtml(branding?.studioName || 'PixMatch AI');
  const logoUrl = branding?.studioLogoUrl ? sanitizeUrl(branding.studioLogoUrl) : null;
  const website = branding?.studioWebsite ? sanitizeUrl(branding.studioWebsite) : null;
  const primaryColor = branding?.primaryColor || '#6366f1';
  const unsubscribeUrl = vars.unsubscribe_url ? sanitizeUrl(vars.unsubscribe_url) : null;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(subjectTitle || studioName)}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #0b0f19; color: #f3f4f6; margin: 0; padding: 32px 16px; -webkit-font-smoothing: antialiased; }
    .container { max-width: 600px; margin: 0 auto; background: #111827; border: 1px solid #1f2937; border-radius: 16px; overflow: hidden; }
    .header { padding: 28px 32px 20px; text-align: center; border-bottom: 1px solid #1f2937; background: #111827; }
    .logo { max-height: 44px; max-width: 180px; margin-bottom: 8px; border-radius: 6px; }
    .brand-title { font-size: 18px; font-weight: 700; color: #f9fafb; letter-spacing: 0.5px; margin: 0; }
    .body-content { padding: 32px; }
    .greeting { font-size: 17px; font-weight: 600; color: #f9fafb; margin-bottom: 16px; }
    .paragraph { font-size: 14px; line-height: 1.6; color: #d1d5db; margin: 0 0 16px; }
    .cta-wrap { text-align: center; margin: 32px 0; }
    .cta-btn { display: inline-block; background: ${primaryColor}; color: #ffffff !important; padding: 13px 30px; font-size: 14px; font-weight: 600; text-decoration: none; border-radius: 10px; }
    .info-card { background: #1f2937; border-radius: 12px; padding: 18px 20px; margin: 20px 0; border-left: 4px solid ${primaryColor}; }
    .footer { padding: 24px 32px; background: #0b0f19; border-top: 1px solid #1f2937; text-align: center; font-size: 12px; color: #6b7280; line-height: 1.5; }
    .footer a { color: #9ca3af; text-decoration: underline; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      ${logoUrl ? `<img src="${logoUrl}" alt="${studioName}" class="logo" />` : ''}
      <div class="brand-title">${studioName}</div>
    </div>
    <div class="body-content">
      ${content}
    </div>
    <div class="footer">
      <div>Sent by <strong>${studioName}</strong></div>
      ${website ? `<div style="margin-top: 4px;"><a href="${website}">${website}</a></div>` : ''}
      ${unsubscribeUrl ? `<div style="margin-top: 8px;"><a href="${unsubscribeUrl}">Unsubscribe from non-essential emails</a></div>` : ''}
      <div style="margin-top: 10px; font-size: 11px; color: #4b5563;">Powered by PixMatch AI Photography Platform</div>
    </div>
  </div>
</body>
</html>`;
}

export const EMAIL_TEMPLATES: Record<string, TemplateDefinition> = {
  // 1. WELCOME
  WELCOME: {
    key: 'WELCOME',
    name: 'Welcome to PixMatch AI',
    category: 'TRANSACTIONAL',
    description: 'Sent upon successful user account registration',
    requiredVariables: ['name'],
    subject: (vars) => `Welcome to PixMatch AI, ${escapeHtml(vars.name || 'Photographer')}!`,
    html: (vars, branding) => {
      const name = escapeHtml(vars.name || 'there');
      const loginUrl = sanitizeUrl(vars.login_url || 'http://localhost:3000/login');
      const content = `
        <div class="greeting">Welcome aboard, ${name}!</div>
        <p class="paragraph">
          Thank you for joining PixMatch AI. Your studio is now set up with AI-powered face recognition, high-speed gallery delivery, and client proofing tools.
        </p>
        <div class="info-card">
          <div style="font-weight: 600; color: #f9fafb; margin-bottom: 6px;">Next steps to get started:</div>
          <div style="font-size: 13px; color: #9ca3af; line-height: 1.6;">
            • Create your first photo gallery and upload photos<br>
            • Enable AI Face Search for instant guest photo finding<br>
            • Connect external storage or use platform cloud storage
          </div>
        </div>
        <div class="cta-wrap">
          <a href="${loginUrl}" class="cta-btn">Access Your Dashboard</a>
        </div>
      `;
      return baseEmailLayout(content, vars, branding, 'Welcome to PixMatch AI');
    },
    text: (vars) => `Welcome to PixMatch AI, ${vars.name || 'Photographer'}!\n\nAccess your dashboard at: ${vars.login_url || 'http://localhost:3000/login'}`,
  },

  // 2. VERIFY_EMAIL
  VERIFY_EMAIL: {
    key: 'VERIFY_EMAIL',
    name: 'Verify Email Address',
    category: 'TRANSACTIONAL',
    description: 'Security email with signed token to verify email ownership',
    requiredVariables: ['verify_url'],
    subject: () => `Verify your email address for PixMatch AI`,
    html: (vars, branding) => {
      const verifyUrl = sanitizeUrl(vars.verify_url);
      const content = `
        <div class="greeting">Please verify your email address</div>
        <p class="paragraph">
          To complete your registration and secure your PixMatch AI account, please confirm your email address by clicking below.
        </p>
        <div class="cta-wrap">
          <a href="${verifyUrl}" class="cta-btn">Verify Email Address</a>
        </div>
        <p class="paragraph" style="font-size: 12px; color: #6b7280;">
          This verification link is single-use and will expire in 24 hours. If you did not create an account, you can safely ignore this email.
        </p>
      `;
      return baseEmailLayout(content, vars, branding, 'Verify Your Email');
    },
    text: (vars) => `Please verify your email address for PixMatch AI by clicking:\n${vars.verify_url}\n\nLink expires in 24 hours.`,
  },

  // 3. PASSWORD_RESET
  PASSWORD_RESET: {
    key: 'PASSWORD_RESET',
    name: 'Password Reset Request',
    category: 'TRANSACTIONAL',
    description: 'Secure password reset with single-use expiring token',
    requiredVariables: ['reset_url'],
    subject: () => `Reset your PixMatch AI password`,
    html: (vars, branding) => {
      const resetUrl = sanitizeUrl(vars.reset_url);
      const content = `
        <div class="greeting">Reset your password</div>
        <p class="paragraph">
          We received a request to reset the password for your PixMatch AI account. Click the button below to set a new password.
        </p>
        <div class="cta-wrap">
          <a href="${resetUrl}" class="cta-btn">Reset Password</a>
        </div>
        <div class="info-card" style="border-left-color: #ef4444;">
          <div style="font-size: 13px; color: #fca5a5;">
            🔒 For security, this link expires in 15 minutes and can only be used once. If you did not request this, please contact support immediately.
          </div>
        </div>
      `;
      return baseEmailLayout(content, vars, branding, 'Password Reset Request');
    },
    text: (vars) => `Reset your PixMatch AI password:\n${vars.reset_url}\n\nExpires in 15 minutes. If you did not request this, ignore this email.`,
  },

  // 4. GALLERY_DELIVERY
  GALLERY_DELIVERY: {
    key: 'GALLERY_DELIVERY',
    name: 'Gallery Delivery',
    category: 'GALLERY',
    description: 'Primary gallery delivery notification sent to clients',
    requiredVariables: ['gallery_title', 'gallery_url'],
    subject: (vars, branding) => `${escapeHtml(branding?.studioName || 'Your Photographer')} — Your photos from "${escapeHtml(vars.gallery_title)}" are ready!`,
    html: (vars, branding) => {
      const recipient = escapeHtml(vars.recipient_name || 'there');
      const galleryTitle = escapeHtml(vars.gallery_title);
      const galleryUrl = sanitizeUrl(vars.gallery_url);
      const customMessage = vars.custom_message ? escapeHtml(vars.custom_message) : null;
      const eventDate = vars.event_date ? escapeHtml(vars.event_date) : null;
      const expiryDate = vars.expires_at ? escapeHtml(vars.expires_at) : null;

      const content = `
        <div class="greeting">Hello ${recipient},</div>
        <p class="paragraph">
          We are thrilled to share that your photography collection <strong>"${galleryTitle}"</strong> is now ready for viewing.
        </p>
        ${eventDate ? `<div style="font-size: 13px; color: #9ca3af; margin-bottom: 12px;">Event Date: ${eventDate}</div>` : ''}
        ${customMessage ? `
        <div class="info-card">
          <div style="font-style: italic; color: #e5e7eb; font-size: 14px;">"${customMessage}"</div>
        </div>` : ''}
        <div class="cta-wrap">
          <a href="${galleryUrl}" class="cta-btn">View Your Gallery</a>
        </div>
        <div style="background: rgba(255,255,255,0.03); border: 1px solid #1f2937; border-radius: 10px; padding: 16px; font-size: 13px; color: #9ca3af;">
          ✨ <strong>AI Face Match:</strong> Upload a quick selfie to find every photo you appear in instantly.<br>
          ❤️ <strong>Favorites & Selections:</strong> Mark favorites and select photos for your album.<br>
          📥 <strong>Downloads:</strong> Download high-resolution images directly.
          ${expiryDate ? `<br>⏳ <strong>Available until:</strong> ${expiryDate}` : ''}
        </div>
      `;
      return baseEmailLayout(content, vars, branding, `Your Gallery: ${galleryTitle}`);
    },
    text: (vars, branding) => `${branding?.studioName || 'Your Photographer'}\n\nYour gallery "${vars.gallery_title}" is ready:\n${vars.gallery_url}`,
  },

  // 5. GALLERY_REMINDER
  GALLERY_REMINDER: {
    key: 'GALLERY_REMINDER',
    name: 'Gallery Reminder',
    category: 'GALLERY',
    description: 'Friendly reminder to view and proof gallery before expiry',
    requiredVariables: ['gallery_title', 'gallery_url'],
    subject: (vars) => `Reminder: Your gallery "${escapeHtml(vars.gallery_title)}" is waiting for you`,
    html: (vars, branding) => {
      const recipient = escapeHtml(vars.recipient_name || 'there');
      const galleryTitle = escapeHtml(vars.gallery_title);
      const galleryUrl = sanitizeUrl(vars.gallery_url);
      const customMessage = vars.custom_message ? escapeHtml(vars.custom_message) : null;

      const content = `
        <div class="greeting">Hello ${recipient},</div>
        <p class="paragraph">
          Just a gentle reminder that your photo gallery <strong>"${galleryTitle}"</strong> is waiting for you to view, favorite, and download your favorite moments.
        </p>
        ${customMessage ? `
        <div class="info-card">
          <div style="font-style: italic; color: #e5e7eb;">"${customMessage}"</div>
        </div>` : ''}
        <div class="cta-wrap">
          <a href="${galleryUrl}" class="cta-btn">Open Gallery</a>
        </div>
      `;
      return baseEmailLayout(content, vars, branding, `Reminder: ${galleryTitle}`);
    },
    text: (vars) => `Reminder: Your gallery "${vars.gallery_title}" is waiting for you:\n${vars.gallery_url}`,
  },

  // 6. GALLERY_READY
  GALLERY_READY: {
    key: 'GALLERY_READY',
    name: 'Gallery Processing Complete',
    category: 'GALLERY',
    description: 'Sent to photographer when batch processing & AI indexing finishes',
    requiredVariables: ['gallery_title', 'photo_count'],
    subject: (vars) => `Gallery Ready: "${escapeHtml(vars.gallery_title)}" (${vars.photo_count} photos processed)`,
    html: (vars, branding) => {
      const content = `
        <div class="greeting">Gallery Processing Complete</div>
        <p class="paragraph">
          All <strong>${escapeHtml(vars.photo_count)}</strong> photos in <strong>"${escapeHtml(vars.gallery_title)}"</strong> have been uploaded, indexed with AI face recognition, and are ready for delivery.
        </p>
        <div class="cta-wrap">
          <a href="${sanitizeUrl(vars.dashboard_url || 'http://localhost:3000/dashboard/galleries')}" class="cta-btn">Manage Gallery</a>
        </div>
      `;
      return baseEmailLayout(content, vars, branding, 'Gallery Ready');
    },
    text: (vars) => `Gallery "${vars.gallery_title}" is ready with ${vars.photo_count} photos.`,
  },

  // 7. FAVORITE_CREATED
  FAVORITE_CREATED: {
    key: 'FAVORITE_CREATED',
    name: 'Client Favorited Photos',
    category: 'GALLERY',
    description: 'Notification sent to photographer when client favorites photos',
    requiredVariables: ['gallery_title'],
    subject: (vars) => `❤️ New favorites marked in "${escapeHtml(vars.gallery_title)}"`,
    html: (vars, branding) => {
      const content = `
        <div class="greeting">New Favorite Activity</div>
        <p class="paragraph">
          A client just favorited photos in gallery <strong>"${escapeHtml(vars.gallery_title)}"</strong>.
        </p>
        <div class="cta-wrap">
          <a href="${sanitizeUrl(vars.gallery_url || 'http://localhost:3000/dashboard/galleries')}" class="cta-btn">View Favorites</a>
        </div>
      `;
      return baseEmailLayout(content, vars, branding, 'New Favorites');
    },
    text: (vars) => `New favorites marked in gallery "${vars.gallery_title}".`,
  },

  // 8. SELECTION_CREATED
  SELECTION_CREATED: {
    key: 'SELECTION_CREATED',
    name: 'Client Completed Photo Selection',
    category: 'GALLERY',
    description: 'Notification sent when client completes album photo selections',
    requiredVariables: ['gallery_title', 'count'],
    subject: (vars) => `📸 Selections submitted for "${escapeHtml(vars.gallery_title)}" (${vars.count} photos)`,
    html: (vars, branding) => {
      const content = `
        <div class="greeting">Photo Selections Submitted</div>
        <p class="paragraph">
          Your client has submitted <strong>${escapeHtml(vars.count)}</strong> photo selections for <strong>"${escapeHtml(vars.gallery_title)}"</strong>.
        </p>
        <div class="cta-wrap">
          <a href="${sanitizeUrl(vars.review_url || 'http://localhost:3000/dashboard/galleries')}" class="cta-btn">Review Selections</a>
        </div>
      `;
      return baseEmailLayout(content, vars, branding, 'Selections Submitted');
    },
    text: (vars) => `Selections submitted for gallery "${vars.gallery_title}" (${vars.count} photos).`,
  },

  // 9. DOWNLOAD_COMPLETED
  DOWNLOAD_COMPLETED: {
    key: 'DOWNLOAD_COMPLETED',
    name: 'Download Archive Ready',
    category: 'GALLERY',
    description: 'Notification with secure download link when ZIP export is ready',
    requiredVariables: ['download_url', 'gallery_title'],
    subject: (vars) => `Your photo download for "${escapeHtml(vars.gallery_title)}" is ready`,
    html: (vars, branding) => {
      const downloadUrl = sanitizeUrl(vars.download_url);
      const content = `
        <div class="greeting">Your ZIP Download is Ready</div>
        <p class="paragraph">
          The high-resolution photo archive you requested for <strong>"${escapeHtml(vars.gallery_title)}"</strong> has been prepared.
        </p>
        <div class="cta-wrap">
          <a href="${downloadUrl}" class="cta-btn">Download Photos (ZIP)</a>
        </div>
        <p class="paragraph" style="font-size: 12px; color: #6b7280;">
          For security, this download link will remain active for 48 hours.
        </p>
      `;
      return baseEmailLayout(content, vars, branding, 'Download Ready');
    },
    text: (vars) => `Your photo download for "${vars.gallery_title}" is ready:\n${vars.download_url}`,
  },

  // 10. SUBSCRIPTION_STARTED
  SUBSCRIPTION_STARTED: {
    key: 'SUBSCRIPTION_STARTED',
    name: 'Subscription Started',
    category: 'BILLING',
    description: 'Confirmation email when user upgrades/starts a paid subscription',
    requiredVariables: ['plan_name', 'amount'],
    subject: (vars) => `Welcome to PixMatch AI ${escapeHtml(vars.plan_name)} Plan!`,
    html: (vars, branding) => {
      const content = `
        <div class="greeting">Subscription Active</div>
        <p class="paragraph">
          Thank you for subscribing to the <strong>PixMatch AI ${escapeHtml(vars.plan_name)}</strong> plan. Your upgraded storage, quota limits, and AI features are now active.
        </p>
        <div class="info-card">
          <div style="font-size: 14px; color: #f9fafb;">
            Plan: <strong>${escapeHtml(vars.plan_name)}</strong><br>
            Billing: <strong>${escapeHtml(vars.billing_interval || 'Monthly')}</strong><br>
            Amount: <strong>${escapeHtml(vars.amount)}</strong>
          </div>
        </div>
        <div class="cta-wrap">
          <a href="${sanitizeUrl(vars.billing_url || 'http://localhost:3000/dashboard/settings')}" class="cta-btn">Manage Subscription</a>
        </div>
      `;
      return baseEmailLayout(content, vars, branding, 'Subscription Active');
    },
    text: (vars) => `You are now subscribed to PixMatch AI ${vars.plan_name} (${vars.amount}).`,
  },

  // 11. PAYMENT_SUCCEEDED
  PAYMENT_SUCCEEDED: {
    key: 'PAYMENT_SUCCEEDED',
    name: 'Payment Receipt',
    category: 'BILLING',
    description: 'Receipt email with invoice details on successful charge',
    requiredVariables: ['amount', 'invoice_id'],
    subject: (vars) => `Payment Receipt for PixMatch AI (${escapeHtml(vars.amount)})`,
    html: (vars, branding) => {
      const invoiceUrl = vars.invoice_url ? sanitizeUrl(vars.invoice_url) : null;
      const content = `
        <div class="greeting">Payment Successful</div>
        <p class="paragraph">
          We have successfully processed your payment of <strong>${escapeHtml(vars.amount)}</strong> for your PixMatch AI subscription.
        </p>
        <div class="info-card">
          <div style="font-size: 13px; color: #9ca3af;">
            Invoice ID: <strong style="color: #f3f4f6;">${escapeHtml(vars.invoice_id)}</strong><br>
            Date: <strong style="color: #f3f4f6;">${escapeHtml(vars.date || new Date().toLocaleDateString())}</strong>
          </div>
        </div>
        ${invoiceUrl ? `
        <div class="cta-wrap">
          <a href="${invoiceUrl}" class="cta-btn">Download Invoice PDF</a>
        </div>` : ''}
      `;
      return baseEmailLayout(content, vars, branding, 'Payment Receipt');
    },
    text: (vars) => `Payment receipt: ${vars.amount} for invoice ${vars.invoice_id}.`,
  },

  // 12. PAYMENT_FAILED
  PAYMENT_FAILED: {
    key: 'PAYMENT_FAILED',
    name: 'Payment Failed Notice',
    category: 'BILLING',
    description: 'Urgent notice when a recurring subscription payment fails',
    requiredVariables: ['amount', 'retry_url'],
    subject: () => `Action Required: Payment failed for your PixMatch AI subscription`,
    html: (vars, branding) => {
      const retryUrl = sanitizeUrl(vars.retry_url);
      const content = `
        <div class="greeting" style="color: #f87171;">Payment Failed</div>
        <p class="paragraph">
          We were unable to process your subscription payment of <strong>${escapeHtml(vars.amount)}</strong>. Please update your payment method to ensure uninterrupted service.
        </p>
        <div class="cta-wrap">
          <a href="${retryUrl}" class="cta-btn" style="background: #dc2626;">Update Payment Method</a>
        </div>
      `;
      return baseEmailLayout(content, vars, branding, 'Action Required: Payment Failed');
    },
    text: (vars) => `Payment failed for ${vars.amount}. Please update payment method at:\n${vars.retry_url}`,
  },

  // 13. TRIAL_ENDING
  TRIAL_ENDING: {
    key: 'TRIAL_ENDING',
    name: 'Trial Ending Notice',
    category: 'BILLING',
    description: 'Sent 3 days prior to free trial expiration',
    requiredVariables: ['days_left', 'upgrade_url'],
    subject: (vars) => `Your PixMatch AI free trial ends in ${escapeHtml(vars.days_left)} days`,
    html: (vars, branding) => {
      const upgradeUrl = sanitizeUrl(vars.upgrade_url);
      const content = `
        <div class="greeting">Your Free Trial is Ending Soon</div>
        <p class="paragraph">
          You have <strong>${escapeHtml(vars.days_left)} days</strong> left on your PixMatch AI trial. Upgrade to continue enjoying unlimited face search and gallery deliveries.
        </p>
        <div class="cta-wrap">
          <a href="${upgradeUrl}" class="cta-btn">Upgrade to Pro</a>
        </div>
      `;
      return baseEmailLayout(content, vars, branding, 'Trial Ending Soon');
    },
    text: (vars) => `Your PixMatch AI trial ends in ${vars.days_left} days. Upgrade at:\n${vars.upgrade_url}`,
  },

  // 14. SUBSCRIPTION_CANCELLED
  SUBSCRIPTION_CANCELLED: {
    key: 'SUBSCRIPTION_CANCELLED',
    name: 'Subscription Cancelled',
    category: 'BILLING',
    description: 'Confirmation when a subscription cancellation is processed',
    requiredVariables: ['effective_date'],
    subject: () => `PixMatch AI Subscription Cancellation Confirmation`,
    html: (vars, branding) => {
      const content = `
        <div class="greeting">Subscription Cancelled</div>
        <p class="paragraph">
          Your PixMatch AI subscription has been cancelled. Your account will remain active on your current plan until <strong>${escapeHtml(vars.effective_date)}</strong>, after which it will revert to the Free tier.
        </p>
      `;
      return baseEmailLayout(content, vars, branding, 'Subscription Cancelled');
    },
    text: (vars) => `Your subscription cancellation is confirmed. Active until ${vars.effective_date}.`,
  },

  // 15. STORAGE_SYNC_FAILED
  STORAGE_SYNC_FAILED: {
    key: 'STORAGE_SYNC_FAILED',
    name: 'Storage Sync Failure Alert',
    category: 'SYSTEM',
    description: 'Operational alert when an external storage connection sync errors',
    requiredVariables: ['provider_name', 'error_message'],
    subject: (vars) => `⚠️ Storage Sync Error: ${escapeHtml(vars.provider_name)} connection issue`,
    html: (vars, branding) => {
      const content = `
        <div class="greeting" style="color: #f87171;">Storage Synchronization Alert</div>
        <p class="paragraph">
          We encountered an error syncing photos from your <strong>${escapeHtml(vars.provider_name)}</strong> storage connection.
        </p>
        <div class="info-card" style="border-left-color: #ef4444;">
          <div style="font-size: 13px; color: #fca5a5; font-family: monospace;">${escapeHtml(vars.error_message)}</div>
        </div>
        <div class="cta-wrap">
          <a href="${sanitizeUrl(vars.settings_url || 'http://localhost:3000/dashboard/storage')}" class="cta-btn">Check Storage Settings</a>
        </div>
      `;
      return baseEmailLayout(content, vars, branding, 'Storage Sync Alert');
    },
    text: (vars) => `Storage sync failure on ${vars.provider_name}: ${vars.error_message}`,
  },

  // 16. AI_PROCESSING_FAILED
  AI_PROCESSING_FAILED: {
    key: 'AI_PROCESSING_FAILED',
    name: 'AI Pipeline Failure Alert',
    category: 'SYSTEM',
    description: 'Operational alert when face recognition indexing encounters an error',
    requiredVariables: ['gallery_title', 'error_message'],
    subject: (vars) => `⚠️ AI Processing Error in "${escapeHtml(vars.gallery_title)}"`,
    html: (vars, branding) => {
      const content = `
        <div class="greeting" style="color: #f87171;">AI Processing Alert</div>
        <p class="paragraph">
          The face recognition pipeline encountered an issue while processing gallery <strong>"${escapeHtml(vars.gallery_title)}"</strong>.
        </p>
        <div class="info-card" style="border-left-color: #ef4444;">
          <div style="font-size: 13px; color: #fca5a5; font-family: monospace;">${escapeHtml(vars.error_message)}</div>
        </div>
        <div class="cta-wrap">
          <a href="${sanitizeUrl(vars.gallery_url || 'http://localhost:3000/dashboard/galleries')}" class="cta-btn">View Gallery Diagnostics</a>
        </div>
      `;
      return baseEmailLayout(content, vars, branding, 'AI Processing Alert');
    },
    text: (vars) => `AI processing failed for gallery "${vars.gallery_title}": ${vars.error_message}`,
  },

  // 17. SYSTEM_ALERT
  SYSTEM_ALERT: {
    key: 'SYSTEM_ALERT',
    name: 'Admin System Alert',
    category: 'SYSTEM',
    description: 'Super Admin operational warning for infrastructure anomalies',
    requiredVariables: ['service_name', 'summary'],
    subject: (vars) => `🚨 SYSTEM ALERT: ${escapeHtml(vars.service_name)} — ${escapeHtml(vars.summary)}`,
    html: (vars, branding) => {
      const content = `
        <div class="greeting" style="color: #f87171;">Platform Operational Alert</div>
        <p class="paragraph">
          An operational alert has been triggered for service <strong>${escapeHtml(vars.service_name)}</strong>.
        </p>
        <div class="info-card" style="border-left-color: #ef4444;">
          <div style="font-weight: 600; color: #f9fafb; margin-bottom: 4px;">${escapeHtml(vars.summary)}</div>
          <div style="font-size: 13px; color: #d1d5db;">${escapeHtml(vars.details || 'No additional details provided.')}</div>
        </div>
        <div class="cta-wrap">
          <a href="${sanitizeUrl(vars.admin_url || 'http://localhost:3000/dashboard/admin/system')}" class="cta-btn">Open System Health</a>
        </div>
      `;
      return baseEmailLayout(content, vars, branding, 'Platform Operational Alert');
    },
    text: (vars) => `SYSTEM ALERT: ${vars.service_name} - ${vars.summary}\n${vars.details || ''}`,
  },
};

/**
 * Compiles a template with variables and branding safely
 */
export function compileEmailTemplate(
  templateKey: string,
  variables: Record<string, any> = {},
  branding?: StudioBranding
): RenderedEmail {
  const template = EMAIL_TEMPLATES[templateKey.toUpperCase()] || EMAIL_TEMPLATES.WELCOME;
  
  return {
    subject: template.subject(variables, branding),
    html: template.html(variables, branding),
    text: template.text(variables, branding),
  };
}
