import { FastifyInstance } from 'fastify';
import { StudioInvoicingController } from './invoicing.controller';

export async function invoicingRoutes(app: FastifyInstance) {
  const controller = new StudioInvoicingController();

  // Invoices CRUD & lifecycle
  app.post('/invoices', (req, rep) => controller.createInvoice(req as any, rep));
  app.get('/invoices', (req, rep) => controller.listInvoices(req as any, rep));
  app.get('/invoices/:id', (req, rep) => controller.getInvoiceById(req as any, rep));
  app.patch('/invoices/:id', (req, rep) => controller.updateInvoice(req as any, rep));

  app.post('/invoices/:id/issue', (req, rep) => controller.issueInvoice(req as any, rep));
  app.post('/invoices/:id/send', (req, rep) => controller.sendInvoice(req as any, rep));
  app.post('/invoices/:id/void', (req, rep) => controller.voidInvoice(req as any, rep));

  // Source conversions
  app.post('/from-contract', (req, rep) => controller.createInvoiceFromContract(req as any, rep));
  app.post('/from-booking', (req, rep) => controller.createInvoiceFromBooking(req as any, rep));
  app.post('/from-order', (req, rep) => controller.createInvoiceFromOrder(req as any, rep));

  // Payments & Payment requests
  app.post('/invoices/:id/payments', (req, rep) => controller.recordPayment(req as any, rep));
  app.post('/invoices/:id/payment-request', (req, rep) => controller.createPaymentRequest(req as any, rep));
  app.post('/payments/:id/refund', (req, rep) => controller.refundPayment(req as any, rep));

  // Installments
  app.post('/invoices/:id/installments', (req, rep) => controller.createInstallments(req as any, rep));

  // Credit / Debit Notes
  app.post('/credit-notes', (req, rep) => controller.createCreditNote(req as any, rep));
  app.post('/debit-notes', (req, rep) => controller.createDebitNote(req as any, rep));

  // Collections & Promises
  app.post('/collections', (req, rep) => controller.createCollectionTask(req as any, rep));
  app.patch('/collections/:id', (req, rep) => controller.updateCollectionTask(req as any, rep));
  app.post('/payment-promises', (req, rep) => controller.createPaymentPromise(req as any, rep));
  app.patch('/payment-promises/:id', (req, rep) => controller.updatePaymentPromise(req as any, rep));

  // Reports, Overdue, PDF & Settings
  app.get('/reports/invoices', (req, rep) => controller.getInvoiceOverview(req as any, rep));
  app.get('/reports/aging', (req, rep) => controller.getAgingReport(req as any, rep));
  app.get('/reports/export', (req, rep) => controller.exportInvoicesCsv(req as any, rep));
  app.get('/invoices/:id/pdf', (req, rep) => controller.getInvoicePdf(req as any, rep));
  app.get('/settings', (req, rep) => controller.getSettings(req as any, rep));
  app.patch('/settings', (req, rep) => controller.updateSettings(req as any, rep));
  app.post('/evaluate-overdue', (req, rep) => controller.evaluateOverdue(req as any, rep));

  // Webhooks
  app.post('/webhooks/:provider', (req, rep) => controller.handleWebhook(req as any, rep));

  // Public portal (also mounted at /api/public/pay/:token)
  app.get('/public/pay/:token', (req, rep) => controller.getPublicInvoice(req as any, rep));
  app.post('/public/pay/:token', (req, rep) => controller.payPublicInvoice(req as any, rep));
}
