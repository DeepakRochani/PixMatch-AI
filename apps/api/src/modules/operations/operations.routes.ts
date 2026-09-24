/**
 * Operations Routes — PixMatch AI Phase 20
 * Fastify route registration for Studio Operations, Leads CRM, Projects, Tasks, Milestones, and Calendar.
 */

import { FastifyInstance } from 'fastify';
import { OperationsController } from './operations.controller.js';
import { BookingController } from './booking.controller.js';
import { PaymentScheduleController } from './payment-schedule.controller.js';
import { authenticate } from '../../middlewares/auth.js';

export async function operationsRoutes(app: FastifyInstance) {
  // Authenticated Operations Routes
  app.register(async (authed) => {
    authed.addHook('onRequest', authenticate);

    // 1. Overview
    authed.get('/overview', OperationsController.getOverview);

    // 2. Leads Pipeline
    authed.get('/leads', OperationsController.listLeads);
    authed.get('/leads/:id', OperationsController.getLead);
    authed.post('/leads', OperationsController.createLead);
    authed.patch('/leads/:id', OperationsController.updateLead);
    authed.delete('/leads/:id', OperationsController.deleteLead);
    authed.post('/leads/:id/convert', OperationsController.convertLead);

    // 3. Projects Management
    authed.get('/projects', OperationsController.listProjects);
    authed.get('/projects/:id', OperationsController.getProject);
    authed.post('/projects', OperationsController.createProject);
    authed.patch('/projects/:id', OperationsController.updateProject);
    authed.delete('/projects/:id', OperationsController.deleteProject);

    // Project Galleries
    authed.get('/projects/:id/galleries', OperationsController.listProjectGalleries);
    authed.post('/projects/:id/galleries', OperationsController.linkGallery);
    authed.delete('/projects/:id/galleries/:galleryId', OperationsController.unlinkGallery);

    // Project Payments (Phase 18 Business Transactions & Legacy)
    authed.get('/projects/:id/payments', OperationsController.listProjectPayments);

    // Project Payment Schedules (Phase 21 Installments)
    authed.get('/projects/:projectId/payment-schedules', PaymentScheduleController.listSchedules);
    authed.post('/projects/:projectId/payment-schedules', PaymentScheduleController.createSchedule);
    authed.get('/payment-schedules/:id', PaymentScheduleController.getSchedule);
    authed.patch('/payment-schedules/:id', PaymentScheduleController.updateSchedule);
    authed.post('/payment-schedules/:id/pay', PaymentScheduleController.recordPayment);
    authed.delete('/payment-schedules/:id', PaymentScheduleController.deleteSchedule);

    // Project Notes
    authed.get('/projects/:id/notes', OperationsController.listProjectNotes);
    authed.post('/projects/:id/notes', OperationsController.addProjectNote);
    authed.delete('/projects/:id/notes/:noteId', OperationsController.deleteProjectNote);

    // 4. Tasks Management
    authed.get('/tasks', OperationsController.listTasks);
    authed.get('/tasks/:id', OperationsController.getTask);
    authed.post('/tasks', OperationsController.createTask);
    authed.patch('/tasks/:id', OperationsController.updateTask);
    authed.post('/tasks/:id/complete', OperationsController.completeTask);
    authed.delete('/tasks/:id', OperationsController.deleteTask);

    // 5. Milestones Management
    authed.get('/projects/:projectId/milestones', OperationsController.listMilestones);
    authed.get('/milestones/:id', OperationsController.getMilestone);
    authed.post('/milestones', OperationsController.createMilestone);
    authed.patch('/milestones/:id', OperationsController.updateMilestone);
    authed.post('/projects/:projectId/milestones/reorder', OperationsController.reorderMilestones);
    authed.delete('/milestones/:id', OperationsController.deleteMilestone);

    // 6. Operations Calendar
    authed.get('/calendar', OperationsController.getCalendarEvents);

    // 7. Booking Pipeline & Confirmation
    authed.post('/booking/confirm', BookingController.confirmBooking);
    authed.get('/booking/summary', BookingController.getBookingPipelineSummary);
  });
}

