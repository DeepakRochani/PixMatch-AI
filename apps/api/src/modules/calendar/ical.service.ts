/**
 * iCal Feed Service — PixMatch AI Phase 22
 * Generates RFC 5545 compliant iCalendar (.ics) feeds with tokenized subscription and private note protection.
 */

import crypto from 'crypto';
import { prisma } from '@pixmatch/database';
import { BookingLinkService } from './booking-link.service.js';

export class ICalService {
  /**
   * Helper: Format Date to iCal UTC timestamp "YYYYMMDDTHHmmssZ"
   */
  private static formatICalDate(date: Date): string {
    return date.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
  }

  /**
   * Helper: Escape special characters in text fields per RFC 5545
   */
  private static escapeText(text?: string | null): string {
    if (!text) return '';
    return text
      .replace(/\\/g, '\\\\')
      .replace(/;/g, '\\;')
      .replace(/,/g, '\\,')
      .replace(/\n/g, '\\n');
  }

  /**
   * Generate or retrieve iCal subscription token for a studio
   */
  static async getOrCreateICalToken(studioId: string): Promise<string> {
    const existing = await prisma.calendarConnection.findFirst({
      where: { studio_id: studioId, provider: 'ICAL' },
    });

    if (existing && existing.ical_token_hash) {
      return existing.id; // Identifier used in feed URL
    }

    const rawToken = crypto.randomBytes(24).toString('hex');
    const tokenHash = BookingLinkService.hashToken(rawToken);

    const conn = await prisma.calendarConnection.create({
      data: {
        studio_id: studioId,
        provider: 'ICAL',
        status: 'CONNECTED',
        calendar_name: 'Studio iCal Feed',
        ical_token_hash: tokenHash,
      },
    });

    return conn.id;
  }

  /**
   * Generate iCal string for all active studio events
   */
  static async generateFeed(connectionId: string): Promise<string> {
    const connection = await prisma.calendarConnection.findFirst({
      where: { id: connectionId, provider: 'ICAL' },
      include: { studio: true },
    });

    if (!connection || connection.status !== 'CONNECTED') {
      throw new Error('Invalid or inactive iCal subscription');
    }

    const studioId = connection.studio_id;
    const studioName = connection.studio?.name || 'PixMatch Studio';

    // Fetch confirmed events within -30 days to +180 days
    const minDate = new Date(Date.now() - 30 * 86400000);
    const maxDate = new Date(Date.now() + 180 * 86400000);

    const events = await prisma.studioCalendarEvent.findMany({
      where: {
        studio_id: studioId,
        status: { not: 'CANCELLED' },
        start_at: { gte: minDate, lte: maxDate },
      },
      include: {
        client: { select: { name: true } },
        project: { select: { name: true } },
        resource_assignments: { include: { resource: true } },
      },
    });

    const nowStr = this.formatICalDate(new Date());

    const lines: string[] = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//PixMatch AI//Studio Calendar//EN',
      'CALSCALE:GREGORIAN',
      'METHOD:PUBLISH',
      `X-WR-CALNAME:${this.escapeText(studioName)} Schedule`,
      'X-WR-TIMEZONE:UTC',
    ];

    for (const e of events) {
      const startStr = this.formatICalDate(e.start_at);
      const endStr = this.formatICalDate(e.end_at);
      const resources = e.resource_assignments?.map((r) => r.resource?.name).filter(Boolean).join(', ');

      const descParts: string[] = [];
      if (e.description) descParts.push(e.description);
      if (e.client?.name) descParts.push(`Client: ${e.client.name}`);
      if (e.project?.name) descParts.push(`Project: ${e.project.name}`);
      if (resources) descParts.push(`Staff/Gear: ${resources}`);

      // NEVER leak internal private notes into public/subscriber iCal feed!

      lines.push('BEGIN:VEVENT');
      lines.push(`UID:pixmatch-${e.id}@studio-${studioId}`);
      lines.push(`DTSTAMP:${nowStr}`);
      lines.push(`DTSTART:${startStr}`);
      lines.push(`DTEND:${endStr}`);
      lines.push(`SUMMARY:${this.escapeText(e.title)}`);
      if (descParts.length > 0) {
        lines.push(`DESCRIPTION:${this.escapeText(descParts.join(' | '))}`);
      }
      if (e.location) {
        lines.push(`LOCATION:${this.escapeText(e.location)}`);
      }
      lines.push(`STATUS:${e.status === 'CONFIRMED' ? 'CONFIRMED' : 'TENTATIVE'}`);
      lines.push('END:VEVENT');
    }

    lines.push('END:VCALENDAR');

    return lines.join('\r\n');
  }
}
