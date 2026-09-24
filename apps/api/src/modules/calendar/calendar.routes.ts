/**
 * Calendar Routes — PixMatch AI Phase 22
 * Defines all private calendar/scheduling endpoints and public booking/iCal routes.
 */

import { FastifyInstance } from 'fastify';
import { authenticate } from '../../middlewares/auth.js';
import { CalendarController } from './calendar.controller.js';

export async function calendarRoutes(app: FastifyInstance) {
  // -------------------------------------------------------------
  // PUBLIC BOOKING & FEED ROUTES (Zero Auth Header, Hashed Tokens Only)
  // -------------------------------------------------------------
  app.get('/public/booking/:token', CalendarController.getPublicPortal);
  app.get('/public/booking/:token/availability', CalendarController.getPublicAvailability);
  app.post('/public/booking/:token/request', CalendarController.submitPublicBooking);
  app.get('/public/calendar/ical/:token', CalendarController.getPublicICalFeed);

  // -------------------------------------------------------------
  // AUTHENTICATED STUDIO CALENDAR OPERATIONS
  // -------------------------------------------------------------
  app.register(async (authed) => {
    authed.addHook('onRequest', authenticate);

    // Calendar Summary
    authed.get('/summary', CalendarController.getSummary);

    // Events CRUD
    authed.get('/events', CalendarController.listEvents);
    authed.get('/events/:id', CalendarController.getEvent);
    authed.post('/events', CalendarController.createEvent);
    authed.patch('/events/:id', CalendarController.updateEvent);
    authed.post('/events/:id/cancel', CalendarController.cancelEvent);

    // Availability & Conflicts
    authed.get('/availability', CalendarController.getAvailability);
    authed.post('/conflicts', CalendarController.checkConflicts);
    authed.get('/settings', CalendarController.getSettings);

    // Resources CRUD
    authed.get('/resources', CalendarController.listResources);
    authed.get('/resources/:id', CalendarController.getResource);
    authed.post('/resources', CalendarController.createResource);
    authed.patch('/resources/:id', CalendarController.updateResource);
    authed.post('/resources/:id/deactivate', CalendarController.deactivateResource);
    authed.post('/resources/:id/reactivate', CalendarController.reactivateResource);

    // Availability Rules (Working Hours)
    authed.get('/rules', CalendarController.listRules);
    authed.post('/rules', CalendarController.createRule);
    authed.delete('/rules/:id', CalendarController.deleteRule);

    // Blackouts & Holidays
    authed.get('/blackouts', CalendarController.listBlackouts);
    authed.post('/blackouts', CalendarController.createBlackout);
    authed.delete('/blackouts/:id', CalendarController.deleteBlackout);

    // Booking Types
    authed.get('/booking-types', CalendarController.listBookingTypes);
    authed.post('/booking-types', CalendarController.createBookingType);
    authed.patch('/booking-types/:id', CalendarController.updateBookingType);

    // Booking Links
    authed.get('/booking-links', CalendarController.listBookingLinks);
    authed.post('/booking-links', CalendarController.createBookingLink);
    authed.post('/booking-links/:id/revoke', CalendarController.revokeBookingLink);

    // Booking Requests
    authed.get('/booking-requests', CalendarController.listBookingRequests);
    authed.get('/booking-requests/:id', CalendarController.getBookingRequest);
    authed.post('/booking-requests/:id/confirm', CalendarController.confirmBookingRequest);

    // Calendar Connections & iCal
    authed.get('/connections', CalendarController.listConnections);
    authed.post('/connections/:provider/connect', CalendarController.connectProvider);
    authed.post('/connections/:id/sync', CalendarController.syncConnection);
    authed.get('/ical/url', CalendarController.getICalUrl);
  });
}
