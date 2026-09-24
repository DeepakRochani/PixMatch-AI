/**
 * Studio Branding Service — PixMatch AI Phase 27
 * Manages studio white-label settings, colors, typography, logos, footers, and badge visibility.
 * Implements strict CSS and XSS sanitization and subscription entitlement checks.
 */

import { prisma } from '@pixmatch/database';
import {
  IStudioBranding,
  IUpdateStudioBrandingDTO,
} from '@pixmatch/types';

// Allowed fonts for safe typography rendering
export const ALLOWED_FONT_FAMILIES = [
  'Inter',
  'Playfair Display',
  'Montserrat',
  'Cormorant Garamond',
  'Plus Jakarta Sans',
  'Outfit',
  'Cinzel',
  'Lora',
  'Merriweather',
  'Roboto',
  'Open Sans',
  'Poppins',
  'Lato',
];

// Allowed button styles
export const ALLOWED_BUTTON_STYLES = ['rounded', 'pill', 'square', 'minimal'];

// Strict Hex Color regex: #RGB or #RRGGBB
const HEX_COLOR_REGEX = /^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/;

export class StudioBrandingService {
  /**
   * Sanitizes text inputs to prevent XSS and HTML injection.
   */
  static sanitizeText(input?: string | null): string | null {
    if (!input) return null;
    return input
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '')
      .replace(/javascript:/gi, '')
      .replace(/vbscript:/gi, '')
      .replace(/onload\s*=/gi, '')
      .replace(/onerror\s*=/gi, '')
      .replace(/onclick\s*=/gi, '')
      .replace(/onmouseover\s*=/gi, '')
      .replace(/eval\s*\(/gi, '')
      .replace(/alert\s*\([^)]*\)/gi, '')
      .trim();
  }

  /**
   * Validates hex color code format to prevent CSS injection.
   */
  static isValidColor(color?: string | null): boolean {
    if (!color) return false;
    return HEX_COLOR_REGEX.test(color.trim());
  }

  /**
   * Validates and cleans URL strings (http/https only, no javascript: or data:).
   */
  static sanitizeUrl(url?: string | null): string | null {
    if (!url) return null;
    const trimmed = url.trim();
    if (/^(https?:\/\/|\/)/i.test(trimmed)) {
      return trimmed.replace(/[<>"'`;()]/g, '');
    }
    return null;
  }

  /**
   * Get branding settings for a studio, with default fallbacks if not yet customized.
   */
  static async getBranding(studioId: string): Promise<IStudioBranding> {
    const studio = await prisma.studio.findUnique({
      where: { id: studioId },
      include: { branding: true },
    });

    if (!studio) {
      throw new Error(`Studio not found: ${studioId}`);
    }

    if (studio.branding) {
      return {
        id: studio.branding.id,
        studio_id: studio.branding.studio_id,
        logo_url: studio.branding.logo_url || studio.logo_url || null,
        favicon_url: studio.branding.favicon_url || null,
        studio_name: studio.branding.studio_name || studio.name,
        tagline: studio.branding.tagline || null,
        primary_color: studio.branding.primary_color || '#4f46e5',
        secondary_color: studio.branding.secondary_color || '#06b6d4',
        accent_color: studio.branding.accent_color || '#f59e0b',
        background_color: studio.branding.background_color || '#0f172a',
        text_color: studio.branding.text_color || '#f8fafc',
        button_style: studio.branding.button_style || 'rounded',
        font_family: studio.branding.font_family || 'Inter',
        custom_footer_text: studio.branding.custom_footer_text || null,
        contact_email: studio.branding.contact_email || null,
        contact_phone: studio.branding.contact_phone || null,
        website_url: studio.branding.website_url || studio.website || null,
        social_links: (studio.branding.social_links as Record<string, string>) || null,
        show_pixmatch_badge: studio.branding.show_pixmatch_badge !== false,
        created_at: studio.branding.created_at,
        updated_at: studio.branding.updated_at,
        custom_domain: (studio.branding as any).custom_domain || (studio as any).custom_domain || null,
      } as any;
    }

    // Default branding
    return {
      id: 'default',
      studio_id: studio.id,
      logo_url: studio.logo_url || null,
      favicon_url: null,
      studio_name: studio.name,
      tagline: null,
      primary_color: '#4f46e5',
      secondary_color: '#06b6d4',
      accent_color: '#f59e0b',
      background_color: '#0f172a',
      text_color: '#f8fafc',
      button_style: 'rounded',
      font_family: 'Inter',
      custom_footer_text: `© ${new Date().getFullYear()} ${studio.name}. All rights reserved.`,
      contact_email: null,
      contact_phone: null,
      website_url: studio.website || null,
      social_links: null,
      show_pixmatch_badge: true,
      created_at: studio.created_at,
      updated_at: studio.updated_at,
      custom_domain: (studio as any).custom_domain || null,
    } as any;
  }

  static async getBrandingForStudio(studioId: string): Promise<IStudioBranding> {
    return this.getBranding(studioId);
  }

  /**
   * Update or create branding settings with entitlement checks and sanitization.
   */
  static async upsertBranding(
    studioId: string,
    dto: IUpdateStudioBrandingDTO
  ): Promise<IStudioBranding> {
    const studio = await prisma.studio.findUnique({
      where: { id: studioId },
      include: { branding: true },
    });

    if (!studio) {
      throw new Error(`Studio not found: ${studioId}`);
    }

    // Check entitlement if badge removal requested
    if (dto.show_pixmatch_badge === false) {
      const plan = (studio as any).plan || 'FREE';
      if (plan === 'FREE' || plan === 'STARTER') {
        throw new Error(
          'White-label badge removal requires a plan with Custom Branding. Please upgrade your subscription.'
        );
      }
    }

    // Validate colors to prevent CSS injection
    if (dto.primary_color !== undefined && !this.isValidColor(dto.primary_color)) {
      throw new Error('Invalid primary_color hex code. Must be #RGB or #RRGGBB.');
    }
    if (dto.secondary_color !== undefined && !this.isValidColor(dto.secondary_color)) {
      throw new Error('Invalid secondary_color hex code. Must be #RGB or #RRGGBB.');
    }
    if (dto.accent_color !== undefined && !this.isValidColor(dto.accent_color)) {
      throw new Error('Invalid accent_color hex code. Must be #RGB or #RRGGBB.');
    }
    if (dto.background_color !== undefined && !this.isValidColor(dto.background_color)) {
      throw new Error('Invalid background_color hex code. Must be #RGB or #RRGGBB.');
    }
    if (dto.text_color !== undefined && !this.isValidColor(dto.text_color)) {
      throw new Error('Invalid text_color hex code. Must be #RGB or #RRGGBB.');
    }

    // Validate font family against whitelist
    let sanitizedFont = dto.font_family;
    if (dto.font_family !== undefined) {
      if (!ALLOWED_FONT_FAMILIES.includes(dto.font_family)) {
        throw new Error(`Invalid font_family "${dto.font_family}". Must be from whitelisted fonts.`);
      }
    }

    // Validate button style
    let sanitizedButtonStyle = dto.button_style;
    if (dto.button_style !== undefined) {
      if (!ALLOWED_BUTTON_STYLES.includes(dto.button_style)) {
        sanitizedButtonStyle = 'rounded';
      }
    }

    // Sanitize text and URL fields
    const sanitizedName = dto.studio_name !== undefined ? this.sanitizeText(dto.studio_name) : undefined;
    const sanitizedTagline = dto.tagline !== undefined ? this.sanitizeText(dto.tagline) : undefined;
    const sanitizedFooter = dto.custom_footer_text !== undefined ? this.sanitizeText(dto.custom_footer_text) : undefined;
    const sanitizedEmail = dto.contact_email !== undefined ? this.sanitizeText(dto.contact_email) : undefined;
    const sanitizedPhone = dto.contact_phone !== undefined ? this.sanitizeText(dto.contact_phone) : undefined;
    const sanitizedLogo = dto.logo_url !== undefined ? this.sanitizeUrl(dto.logo_url) : undefined;
    const sanitizedFavicon = dto.favicon_url !== undefined ? this.sanitizeUrl(dto.favicon_url) : undefined;
    const sanitizedWebsite = dto.website_url !== undefined ? this.sanitizeUrl(dto.website_url) : undefined;

    // Sanitize social links
    let sanitizedSocialLinks: Record<string, string> | undefined = undefined;
    if (dto.social_links !== undefined) {
      if (dto.social_links && typeof dto.social_links === 'object') {
        sanitizedSocialLinks = {};
        for (const [platform, link] of Object.entries(dto.social_links)) {
          const cleanUrl = this.sanitizeUrl(typeof link === 'string' ? link : null);
          if (cleanUrl) {
            sanitizedSocialLinks[platform] = cleanUrl;
          }
        }
      }
    }

    const updated = await prisma.studioBranding.upsert({
      where: { studio_id: studioId },
      create: {
        studio_id: studioId,
        logo_url: sanitizedLogo || null,
        favicon_url: sanitizedFavicon || null,
        studio_name: sanitizedName || studio.name,
        tagline: sanitizedTagline || null,
        primary_color: dto.primary_color || '#4f46e5',
        secondary_color: dto.secondary_color || '#06b6d4',
        accent_color: dto.accent_color || '#f59e0b',
        background_color: dto.background_color || '#0f172a',
        text_color: dto.text_color || '#f8fafc',
        button_style: sanitizedButtonStyle || 'rounded',
        font_family: sanitizedFont || 'Inter',
        custom_footer_text: sanitizedFooter || null,
        contact_email: sanitizedEmail || null,
        contact_phone: sanitizedPhone || null,
        website_url: sanitizedWebsite || null,
        social_links: sanitizedSocialLinks || undefined,
        show_pixmatch_badge: dto.show_pixmatch_badge !== undefined ? dto.show_pixmatch_badge : true,
      },
      update: {
        ...(sanitizedLogo !== undefined ? { logo_url: sanitizedLogo } : {}),
        ...(sanitizedFavicon !== undefined ? { favicon_url: sanitizedFavicon } : {}),
        ...(sanitizedName !== undefined ? { studio_name: sanitizedName } : {}),
        ...(sanitizedTagline !== undefined ? { tagline: sanitizedTagline } : {}),
        ...(dto.primary_color !== undefined ? { primary_color: dto.primary_color } : {}),
        ...(dto.secondary_color !== undefined ? { secondary_color: dto.secondary_color } : {}),
        ...(dto.accent_color !== undefined ? { accent_color: dto.accent_color } : {}),
        ...(dto.background_color !== undefined ? { background_color: dto.background_color } : {}),
        ...(dto.text_color !== undefined ? { text_color: dto.text_color } : {}),
        ...(sanitizedButtonStyle !== undefined ? { button_style: sanitizedButtonStyle } : {}),
        ...(sanitizedFont !== undefined ? { font_family: sanitizedFont } : {}),
        ...(sanitizedFooter !== undefined ? { custom_footer_text: sanitizedFooter } : {}),
        ...(sanitizedEmail !== undefined ? { contact_email: sanitizedEmail } : {}),
        ...(sanitizedPhone !== undefined ? { contact_phone: sanitizedPhone } : {}),
        ...(sanitizedWebsite !== undefined ? { website_url: sanitizedWebsite } : {}),
        ...(sanitizedSocialLinks !== undefined ? { social_links: sanitizedSocialLinks } : {}),
        ...(dto.show_pixmatch_badge !== undefined ? { show_pixmatch_badge: dto.show_pixmatch_badge } : {}),
      },
    });

    return {
      id: updated.id,
      studio_id: updated.studio_id,
      logo_url: updated.logo_url,
      favicon_url: updated.favicon_url,
      studio_name: updated.studio_name,
      tagline: updated.tagline,
      primary_color: updated.primary_color,
      secondary_color: updated.secondary_color,
      accent_color: updated.accent_color,
      background_color: updated.background_color,
      text_color: updated.text_color,
      button_style: updated.button_style,
      font_family: updated.font_family,
      custom_footer_text: updated.custom_footer_text,
      contact_email: updated.contact_email,
      contact_phone: updated.contact_phone,
      website_url: updated.website_url,
      social_links: updated.social_links as Record<string, string> | null,
      show_pixmatch_badge: updated.show_pixmatch_badge,
      created_at: updated.created_at,
      updated_at: updated.updated_at,
    };
  }

  static async updateBranding(
    studioId: string,
    dto: IUpdateStudioBrandingDTO
  ): Promise<IStudioBranding> {
    return this.upsertBranding(studioId, dto);
  }

  // =========================================================================
  // Instance delegates
  // =========================================================================
  async getBranding(studioId: string) {
    return StudioBrandingService.getBranding(studioId);
  }

  async getBrandingForStudio(studioId: string) {
    return StudioBrandingService.getBrandingForStudio(studioId);
  }

  async upsertBranding(studioId: string, dto: IUpdateStudioBrandingDTO) {
    return StudioBrandingService.upsertBranding(studioId, dto);
  }

  async updateBranding(studioId: string, dto: IUpdateStudioBrandingDTO) {
    return StudioBrandingService.updateBranding(studioId, dto);
  }
}
