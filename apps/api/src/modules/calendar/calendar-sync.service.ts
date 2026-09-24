/**
 * Calendar Sync Service — PixMatch AI Phase 22
 * Manages external calendar connections (Google, Microsoft), background sync jobs, webhook verification, and busy-block ingestion.
 */

import { prisma } from '@pixmatch/database';
import {
  CalendarConnectionDTO,
  CalendarProvider,
  CalendarSyncDirection,
  CalendarSyncStatus,
} from '@pixmatch/types';
import { GoogleCalendarProvider } from './google-calendar.provider.js';
import { MicrosoftCalendarProvider } from './microsoft-calendar.provider.js';

export class CalendarSyncService {
  private static googleProvider = new GoogleCalendarProvider();
  private static msProvider = new MicrosoftCalendarProvider();

  /**
   * Connect an external calendar account
   */
  static async connectProvider(
    studioId: string,
    provider: CalendarProvider,
    authCode: string,
    redirectUri: string
  ): Promise<CalendarConnectionDTO> {
    let credentials: any;

    if (provider === CalendarProvider.GOOGLE) {
      credentials = await this.googleProvider.connect(authCode, redirectUri);
    } else if (provider === CalendarProvider.MICROSOFT) {
      credentials = await this.msProvider.connect(authCode, redirectUri);
    } else {
      throw new Error(`Unsupported calendar provider: ${provider}`);
    }

    const conn = await prisma.calendarConnection.upsert({
      where: {
        studio_id_provider_calendar_id: {
          studio_id: studioId,
          provider: provider as any,
          calendar_id: 'primary',
        },
      },
      update: {
        status: 'CONNECTED',
        encrypted_credentials: JSON.stringify(credentials),
        last_synced_at: new Date(),
        last_sync_error: null,
      },
      create: {
        studio_id: studioId,
        provider: provider as any,
        status: 'CONNECTED',
        calendar_id: 'primary',
        calendar_name: `${provider} Calendar`,
        sync_direction: 'BIDIRECTIONAL',
        encrypted_credentials: JSON.stringify(credentials),
        last_synced_at: new Date(),
      },
    });

    return conn as unknown as CalendarConnectionDTO;
  }

  /**
   * Disconnect an external calendar connection
   */
  static async disconnectProvider(studioId: string, connectionId: string): Promise<{ success: boolean }> {
    const conn = await prisma.calendarConnection.findFirst({
      where: { id: connectionId, studio_id: studioId },
    });
    if (!conn) throw new Error('Calendar connection not found');

    await prisma.calendarConnection.update({
      where: { id: connectionId },
      data: {
        status: 'DISCONNECTED',
        encrypted_credentials: null,
      },
    });

    return { success: true };
  }

  /**
   * Synchronize busy blocks and events from external calendar
   */
  static async syncConnection(studioId: string, connectionId: string): Promise<{ synced_events: number }> {
    const conn = await prisma.calendarConnection.findFirst({
      where: { id: connectionId, studio_id: studioId },
    });
    if (!conn || conn.status !== 'CONNECTED' || !conn.encrypted_credentials) {
      throw new Error('Connection is not active');
    }

    const credentials = JSON.parse(conn.encrypted_credentials);
    const startDate = new Date();
    const endDate = new Date(startDate.getTime() + 30 * 86400000);

    let externalEvents: any[] = [];
    if (conn.provider === 'GOOGLE') {
      externalEvents = await this.googleProvider.listEvents(credentials, conn.calendar_id || 'primary', startDate, endDate);
    } else if (conn.provider === 'MICROSOFT') {
      externalEvents = await this.msProvider.listEvents(credentials, conn.calendar_id || 'primary', startDate, endDate);
    }

    // Ingest busy blocks safely without creating duplicate external bookings
    let count = 0;
    for (const ext of externalEvents) {
      if (ext.isBusyBlock) {
        const existing = await prisma.studioCalendarEvent.findFirst({
          where: {
            studio_id: studioId,
            external_provider: conn.provider as any,
            external_event_id: ext.id,
          },
        });

        if (!existing) {
          await prisma.studioCalendarEvent.create({
            data: {
              studio_id: studioId,
              title: 'Busy (External Calendar)',
              event_type: 'BLOCKED',
              status: 'CONFIRMED',
              visibility: 'PRIVATE',
              start_at: ext.start,
              end_at: ext.end,
              external_provider: conn.provider as any,
              external_event_id: ext.id,
            },
          });
          count++;
        }
      }
    }

    await prisma.calendarConnection.update({
      where: { id: connectionId },
      data: {
        last_synced_at: new Date(),
        last_sync_error: null,
      },
    });

    return { synced_events: count };
  }

  /**
   * List connections for studio
   */
  static async listConnections(studioId: string): Promise<CalendarConnectionDTO[]> {
    const connections = await prisma.calendarConnection.findMany({
      where: { studio_id: studioId },
    });
    return connections as unknown as CalendarConnectionDTO[];
  }
}
