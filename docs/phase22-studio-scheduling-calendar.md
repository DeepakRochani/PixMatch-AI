# PixMatch AI — Phase 22: Studio Scheduling, Calendar & Resource Management

## 1. Overview
Phase 22 introduces a production-grade, enterprise-ready scheduling, calendar, availability, resource management, conflict detection, external calendar synchronization, and client self-booking portal into PixMatch AI. Built additively on top of Phase 20 (Studio Operations) and Phase 21 (Proposals, Contracts & Booking), this layer manages multi-tenant studio workflows, photographer/staff assignments, physical room/location reservations, equipment scheduling, buffer calculations, and race-safe client bookings.

---

## 2. Architecture & Design Principles

```
+---------------------------------------------------------------------------------------------------+
|                                       PixMatch AI Frontends                                       |
|  - Dashboard: /dashboard/operations/calendar, /availability, /resources, /booking-types, etc.     |
|  - Client Self-Booking Portal: /portal/booking/[token], /reschedule, /cancel                      |
|  - Admin Calendar Intelligence: /dashboard/admin/calendar                                         |
+-------------------------------------------------+-------------------------------------------------+
                                                  |
                                                  v
+---------------------------------------------------------------------------------------------------+
|                                      Fastify API Routing & DTOs                                   |
|  - /api/v1/calendar/* (Events, Resources, Availability, Blackouts, Settings)                      |
|  - /api/v1/booking-* (Types, Links, Requests, Lifecycle mutations)                                |
|  - /api/v1/public/* (Token-hashed Public Availability, Holds, Booking Submissions, iCal feeds)    |
+-------------------------------------------------+-------------------------------------------------+
                                                  |
        +-----------------------------------------+-----------------------------------------+
        |                                         |                                         |
        v                                         v                                         v
+-----------------------+             +-----------------------+             +-----------------------+
|  Availability Engine  |             |  Conflict Engine      |             |  Booking Request Svc  |
|  - Working hours      |             |  - Overlap analysis   |             |  - Race-safe booking  |
|  - Blackout overrides | <---------> |  - Buffer enforcement | <---------> |  - SHA-256 tokens     |
|  - Slot generator     |             |  - Multi-resource     |             |  - Hold mechanics     |
|  - Timezone & DST     |             |  - Tenant isolation   |             |  - Confirmation/Cancel|
+-----------------------+             +-----------------------+             +-----------------------+
        |                                         |                                         |
        +-----------------------------------------+-----------------------------------------+
                                                  |
        +-----------------------------------------+-----------------------------------------+
        |                                         |                                         |
        v                                         v                                         v
+-----------------------+             +-----------------------+             +-----------------------+
| Calendar Provider Svc |             | Sync & Reminder Engine|             | Integrations & Bridge |
| - ICalendarProvider   |             | - BullMQ Worker jobs  |             | - Phase 20 Operations |
| - Google Calendar     |             | - 24h & 2h reminders  |             | - Phase 21 Contracts  |
| - Microsoft Graph     |             | - Bidirectional sync  |             | - Phase 17 Client 360 |
| - RFC 5545 iCal Feed  |             | - Idempotent retries  |             | - Phase 15 Copilot (12)|
+-----------------------+             +-----------------------+             +-----------------------+
                                                  |
                                                  v
+---------------------------------------------------------------------------------------------------+
|                                 Prisma ORM & PostgreSQL Database                                  |
|  - StudioCalendarEvent, StudioResource, CalendarResourceAssignment, StudioAvailabilityRule        |
|  - StudioBlackoutPeriod, StudioBookingSettings, StudioBookingType, StudioBookingLink              |
|  - StudioBookingRequest, BookingSlotHold, CalendarConnection                                      |
+---------------------------------------------------------------------------------------------------+
```

### Key Principles
1. **Multi-Tenant Isolation:** Every internal query strictly verifies `studio_id`. Public portals resolve tenants solely through SHA-256 hashed public link tokens.
2. **Strict Financial Separation:** Booking requests and calendar events represent operational commitments only. Revenue is recognized strictly via recorded Phase 18 business transactions.
3. **Deterministic Conflict & Race Safety:** Multi-resource conflict verification is enforced at the database transaction layer to prevent double-booking.
4. **Timezone & DST Safety:** Canonical timestamps are persisted in UTC, paired with explicit IANA timezone identifiers for slot generation and wall-clock rule evaluations.

---

## 3. Database Schema Models

The Prisma schema defines the following core models and enums:

### Enums
- `CalendarEventType`: `SHOOT`, `MEETING`, `CONSULTATION`, `DELIVERY`, `EDITING`, `PRE_PRODUCTION`, `POST_PRODUCTION`, `TRAVEL`, `PERSONAL`, `BLOCKED`, `OTHER`
- `CalendarEventStatus`: `TENTATIVE`, `CONFIRMED`, `CANCELLED`, `COMPLETED`
- `CalendarVisibility`: `PRIVATE`, `TEAM`, `CLIENT`
- `AvailabilityRuleType`: `WORKING_HOURS`, `BREAK`, `BLOCKED`, `HOLIDAY`, `CUSTOM`
- `ResourceType`: `PHOTOGRAPHER`, `STAFF`, `EQUIPMENT`, `LOCATION`, `ROOM`, `VEHICLE`, `OTHER`
- `ResourceStatus`: `ACTIVE`, `INACTIVE`, `MAINTENANCE`, `RETIRED`
- `BookingSlotStatus`: `AVAILABLE`, `HELD`, `BOOKED`, `BLOCKED`, `EXPIRED`
- `BookingRequestStatus`: `PENDING`, `CONFIRMED`, `DECLINED`, `CANCELLED`, `EXPIRED`, `RESCHEDULED`
- `CalendarProvider`: `GOOGLE`, `MICROSOFT`, `ICAL`
- `CalendarSyncStatus`: `CONNECTED`, `DISCONNECTED`, `SYNCING`, `ERROR`
- `CalendarSyncDirection`: `IMPORT`, `EXPORT`, `BIDIRECTIONAL`
- `CancellationReason`: `CLIENT_REQUEST`, `PHOTOGRAPHER_REQUEST`, `WEATHER`, `CONFLICT`, `OTHER`

### Models
1. **`StudioCalendarEvent`**: Central calendar entity linked to studio, optional project (`project_id`), client (`client_id`), and lead (`lead_id`).
2. **`StudioResource`**: Represents bookable human and physical assets (photographers, assistants, cameras, studio rooms, lighting kits).
3. **`CalendarResourceAssignment`**: Junction table assigning resources to calendar events with roles and interval constraints.
4. **`StudioAvailabilityRule`**: Day-of-week and date-specific operating schedules, breaks, and resource overrides.
5. **`StudioBlackoutPeriod`**: Holidays, studio closures, equipment maintenance, and personal leaves.
6. **`StudioBookingSettings`**: Studio-wide scheduling rules (min notice, max horizon, buffers, cancellation policies).
7. **`StudioBookingType`**: Catalog of bookable sessions (consultations, portrait shoots, wedding coverage) with duration, buffers, and informational pricing.
8. **`StudioBookingLink`**: Secure public booking links storing only SHA-256 token hashes with optional expiry and revocation.
9. **`StudioBookingRequest`**: Client-submitted self-booking requests with validation, hold mechanics, and confirmation states.
10. **`BookingSlotHold`**: Ephemeral reservation holds preventing simultaneous slot contention.
11. **`CalendarConnection`**: External calendar sync credentials and state tracking for Google and Microsoft Graph.

---

## 4. API Surface & Endpoints

### Studio Operations Endpoints (Authenticated)
- `GET /api/v1/calendar/events`: List calendar events within bounded date ranges and filters.
- `POST /api/v1/calendar/events`: Create calendar event with resource assignments and conflict validation.
- `GET /api/v1/calendar/events/:id`: Retrieve single event details.
- `PUT /api/v1/calendar/events/:id`: Update event and re-verify resource conflicts.
- `POST /api/v1/calendar/events/:id/cancel`: Cancel event with reason and audit trail.
- `GET /api/v1/calendar/availability`: Query studio or resource-specific available time slots.
- `POST /api/v1/calendar/conflicts`: Validate potential schedule conflicts for a proposed time window.
- `GET /api/v1/calendar/resources`: List all studio resources with status and utilization.
- `POST /api/v1/calendar/resources`: Register new resource.
- `PUT /api/v1/calendar/resources/:id`: Update resource metadata or status.
- `GET /api/v1/calendar/blackouts`: List holidays and blackout periods.
- `POST /api/v1/calendar/blackouts`: Create studio or resource blackout block.
- `GET /api/v1/calendar/settings`: Get studio booking configuration.
- `PUT /api/v1/calendar/settings`: Update booking rules, notice periods, and buffers.
- `GET /api/v1/booking-types`: List booking service types.
- `POST /api/v1/booking-types`: Create booking service type.
- `POST /api/v1/booking-links`: Generate secure public booking link.
- `POST /api/v1/booking-links/:id/revoke`: Revoke an active public booking link.
- `GET /api/v1/booking-requests`: List pending and historical booking requests.
- `POST /api/v1/booking-requests/:id/confirm`: Manually confirm pending booking request.

### Public Client Portal Endpoints (Token-Authenticated)
- `GET /api/v1/public/booking/:token`: Retrieve sanitized booking portal configuration and metadata.
- `GET /api/v1/public/booking/:token/availability`: Get real-time available booking slots within allowed horizon.
- `POST /api/v1/public/booking/:token/request`: Submit a client self-booking request.
- `POST /api/v1/public/booking/:token/reschedule`: Self-reschedule an existing booking within policy windows.
- `POST /api/v1/public/booking/:token/cancel`: Self-cancel a booking within notice thresholds.

### Calendar Sync & Feed Endpoints
- `GET /api/v1/public/calendar/ical/:token`: Stream RFC 5545 compliant iCalendar `.ics` feed with sanitized titles and masked private notes.
- `GET /api/v1/calendar/connections`: List connected external calendars.
- `POST /api/v1/calendar/connections/:provider/connect`: Initiate OAuth connection for Google or Microsoft.
- `POST /api/v1/calendar/connections/:id/sync`: Trigger manual calendar sync job.
- `POST /api/v1/calendar/connections/:id/disconnect`: Disconnect and delete sync integration.

---

## 5. Availability & Slot Generation Algorithm

The `AvailabilityService` generates valid booking slots using the following bounded pipeline:

1. **Horizon Validation:** Rejects query spans larger than `maximum_booking_days_ahead` (default 90 days).
2. **Timezone Normalization:** Evaluates recurring weekly rules and specific dates in the configured studio timezone.
3. **Working Hours Resolution:** Identifies base active hours for each day of the week, factoring in resource-specific overrides.
4. **Blackout & Holiday Filtering:** Deducts studio-wide closures, national holidays, and resource leaves.
5. **Existing Commitments & Buffers:** Loads existing confirmed/tentative calendar events and applies `buffer_before_minutes` and `buffer_after_minutes`.
6. **Discretization:** Steps through available intervals in increments of `(duration_minutes + buffer_after_minutes)`.
7. **Notice Window Check:** Omits candidate slots falling within `minimum_notice_minutes` from the current time.
8. **Multi-Resource Availability:** Ensures required resource types (e.g. lead photographer, main studio room) have simultaneous availability before presenting a slot.

---

## 6. Conflict Detection Engine

The `CalendarConflictService` evaluates candidate intervals $(S_{new}, E_{new})$ against existing reservations $(S_{ext}, E_{ext})$ using interval overlap logic:

$$S_{new} < E_{ext} \quad \text{AND} \quad E_{new} > S_{ext}$$

### Conflict Vectors Checked:
- **Resource Clashes:** Lead photographer, second shooter, drone operator, specific camera kits, editing suites, or vehicle overlaps.
- **Location Clashes:** Studio rooms, shooting bays, client lounges.
- **Blackout Overlaps:** Planned studio maintenance or holidays.
- **Buffer Intrusion:** Start times intruding into post-shoot reset buffers.

---

## 7. Public Client Booking Portal

The public booking portal (`/portal/booking/[token]`) provides a responsive, accessible interface for client self-scheduling:
- **Branded Presentation:** Displays studio branding, session type, duration, and instructions.
- **Date & Slot Picker:** Responsive calendar view showing only validated, conflict-free time slots.
- **Timezone Selection:** Allows clients to view availability in their local timezone while mapping to studio canonical time.
- **Intake Form:** Captures client name, email, phone, and optional shoot notes.
- **Hold Mechanics:** Acquires an ephemeral hold during checkout/confirmation to prevent race conditions.
- **Self-Service Reschedule & Cancellation:** Secure `/reschedule` and `/cancel` flows governed by studio notice policies.

---

## 8. Copilot Scheduling Tools

The Phase 15 `CopilotToolRegistry` has been extended with 12 Phase 22 scheduling and calendar tools:

| Tool Name | Type | Description |
|---|---|---|
| `getCalendarEvents` | Read | Queries studio calendar events within date ranges |
| `getAvailability` | Read | Checks studio operating schedules and rules |
| `findAvailableSlots` | Read | Computes available booking slots for a given service |
| `checkScheduleConflict` | Read | Analyzes candidate event windows for resource clashes |
| `listResources` | Read | Lists active human, room, and equipment resources |
| `getResourceAvailability` | Read | Inspects availability for a specific resource |
| `createCalendarEvent` | Mutation (Gated) | Schedules a new calendar event with resource assignments |
| `rescheduleCalendarEvent` | Mutation (Gated) | Moves an existing calendar event to a new time |
| `cancelCalendarEvent` | Mutation (Gated) | Cancels an event with specified reason |
| `listBookingRequests` | Read | Lists pending and processed client booking requests |
| `createBookingLink` | Mutation (Gated) | Generates a new secure public booking link |
| `getBookingPipelineCalendar` | Read | Aggregates upcoming bookings and resource utilization metrics |

All mutation tools enforce `requiresConfirmation: true` to prevent unauthorized autonomous side-effects.

---

## 9. Automations & Notifications

### Event Triggers
- `BOOKING_REQUESTED`: Fired when a client submits a public self-booking request.
- `BOOKING_CONFIRMED`: Fired upon automatic or manual confirmation, syncing calendar events and notifying the client.
- `BOOKING_RESCHEDULED`: Dispatched when a session is moved, triggering calendar updates and updated invitations.
- `BOOKING_CANCELLED`: Dispatched on cancellation, releasing resource holds and notifying stakeholders.
- `BOOKING_REMINDER_DUE`: Scheduled 24 hours and 2 hours prior to shoot time.
- `CALENDAR_CONFLICT_DETECTED`: Alerting studio operators of potential resource contention.

### Email & Notification Integration
Leverages Phase 11 `EmailService` and `NotificationService` with built-in suppression checks (`EmailSuppression`, `NotificationPreference`) and message idempotency keys.

---

## 10. Security, Multi-Tenancy & Integrity

1. **Cryptographic Token Safety:** Public booking links use 32-byte cryptographically secure random bytes (`crypto.randomBytes(32)`). Raw tokens are never stored; only SHA-256 hashes are persisted in the database.
2. **Rate Limiting:** Public booking routes are guarded with IP and token-based rate limits (60 req/min for availability, 10 req/min for submissions).
3. **Injection & XSS Protection:** Public inputs and iCal feed text fields are sanitized against CRLF injection (`\r`, `\n`) and XSS.
4. **Privacy Shield:** Public iCal feeds and public availability queries mask private internal notes, financial records, client names, and biometric identifiers.
5. **Strict Multi-Tenancy:** All administrative API endpoints resolve `studio_id` from authenticated sessions.

---

## 11. Production Configuration & Environment Variables

```env
# Phase 22 Calendar Integration Configuration
GOOGLE_CALENDAR_CLIENT_ID="google-oauth-client-id"
GOOGLE_CALENDAR_CLIENT_SECRET="google-oauth-client-secret"
MICROSOFT_CALENDAR_CLIENT_ID="microsoft-graph-client-id"
MICROSOFT_CALENDAR_CLIENT_SECRET="microsoft-graph-client-secret"
CALENDAR_ENCRYPTION_KEY="32-byte-hex-encoded-secret-for-oauth-tokens"
```

---

## 12. Verification & Test Suite

The Phase 22 test suite (`tests/phase22-studio-scheduling-calendar.test.ts`) covers all 60 required test groups across 97 unit/integration test cases, executing in under 3 seconds with 0 failures:
- Schema validation & constraints
- Working hours & blackout overrides
- Multi-resource conflict detection (photographers, staff, equipment, rooms, buffers)
- Timezone & Daylight Saving Time (DST) edge cases (America/New_York spring-forward/fall-back, Asia/Kolkata, Europe/London, Australia/Sydney)
- Cryptographic token hashing, expiration, and revocation
- Race-safe booking transactions and hold mechanics
- Client self-booking, rescheduling, and cancellation policies
- Phase 20 (Operations), Phase 21 (Contracts/Proposals), Phase 17 (Client 360), Phase 16 (Automation), and Phase 15 (Copilot) integrations
- RFC 5545 iCalendar generation & external sync providers (Google & Microsoft)
- Security audits: IDOR, cross-tenant isolation, CRLF injection, XSS sanitization, rate limiting, and credential safety.
