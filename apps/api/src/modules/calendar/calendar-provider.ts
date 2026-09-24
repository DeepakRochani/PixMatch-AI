/**
 * Calendar Provider Abstraction Interface — PixMatch AI Phase 22
 * Defines standard contract for external calendar synchronization (Google, Microsoft, Apple/iCal).
 */

export interface ExternalCalendarEvent {
  id: string;
  title: string;
  description?: string;
  start: Date;
  end: Date;
  allDay?: boolean;
  location?: string;
  status?: string;
  isBusyBlock?: boolean;
}

export interface ExternalCalendarInfo {
  id: string;
  name: string;
  description?: string;
  isPrimary?: boolean;
  timeZone?: string;
}

export interface CalendarProviderAuthCredentials {
  accessToken: string;
  refreshToken?: string;
  tokenType?: string;
  expiresAt?: Date;
  scope?: string;
}

export interface ICalendarProvider {
  providerName: string;
  connect(authCode: string, redirectUri: string): Promise<CalendarProviderAuthCredentials>;
  disconnect(credentials: CalendarProviderAuthCredentials): Promise<void>;
  getCalendars(credentials: CalendarProviderAuthCredentials): Promise<ExternalCalendarInfo[]>;
  listEvents(
    credentials: CalendarProviderAuthCredentials,
    calendarId: string,
    startDate: Date,
    endDate: Date
  ): Promise<ExternalCalendarEvent[]>;
  createEvent(
    credentials: CalendarProviderAuthCredentials,
    calendarId: string,
    event: ExternalCalendarEvent
  ): Promise<string>;
  updateEvent(
    credentials: CalendarProviderAuthCredentials,
    calendarId: string,
    eventId: string,
    event: Partial<ExternalCalendarEvent>
  ): Promise<void>;
  deleteEvent(
    credentials: CalendarProviderAuthCredentials,
    calendarId: string,
    eventId: string
  ): Promise<void>;
  healthCheck(credentials: CalendarProviderAuthCredentials): Promise<boolean>;
}
