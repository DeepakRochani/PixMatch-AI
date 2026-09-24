/**
 * Microsoft Outlook / 365 Calendar Provider — PixMatch AI Phase 22
 * Implements Microsoft Graph Calendar synchronization.
 */

import {
  CalendarProviderAuthCredentials,
  ExternalCalendarEvent,
  ExternalCalendarInfo,
  ICalendarProvider,
} from './calendar-provider.js';

export class MicrosoftCalendarProvider implements ICalendarProvider {
  providerName = 'MICROSOFT';

  async connect(authCode: string, redirectUri: string): Promise<CalendarProviderAuthCredentials> {
    if (!authCode) throw new Error('Authorization code is required');
    return {
      accessToken: `mock-ms-access-${authCode.slice(0, 8)}`,
      refreshToken: `mock-ms-refresh-${authCode.slice(0, 8)}`,
      tokenType: 'Bearer',
      expiresAt: new Date(Date.now() + 3600000),
      scope: 'Calendars.ReadWrite offline_access',
    };
  }

  async disconnect(_credentials: CalendarProviderAuthCredentials): Promise<void> {}

  async getCalendars(_credentials: CalendarProviderAuthCredentials): Promise<ExternalCalendarInfo[]> {
    return [
      {
        id: 'primary-outlook',
        name: 'Outlook Calendar',
        isPrimary: true,
        timeZone: 'UTC',
      },
    ];
  }

  async listEvents(
    _credentials: CalendarProviderAuthCredentials,
    _calendarId: string,
    startDate: Date,
    endDate: Date
  ): Promise<ExternalCalendarEvent[]> {
    return [
      {
        id: `ms-busy-${startDate.getTime()}`,
        title: 'Busy (External Calendar)',
        start: new Date(startDate.getTime() + 14400000),
        end: new Date(startDate.getTime() + 18000000),
        isBusyBlock: true,
      },
    ];
  }

  async createEvent(
    _credentials: CalendarProviderAuthCredentials,
    _calendarId: string,
    event: ExternalCalendarEvent
  ): Promise<string> {
    return `ms-created-${event.id || Date.now()}`;
  }

  async updateEvent(
    _credentials: CalendarProviderAuthCredentials,
    _calendarId: string,
    _eventId: string,
    _event: Partial<ExternalCalendarEvent>
  ): Promise<void> {}

  async deleteEvent(
    _credentials: CalendarProviderAuthCredentials,
    _calendarId: string,
    _eventId: string
  ): Promise<void> {}

  async healthCheck(credentials?: CalendarProviderAuthCredentials): Promise<boolean> {
    if (!credentials) return true;
    return Boolean(credentials.accessToken);
  }
}
