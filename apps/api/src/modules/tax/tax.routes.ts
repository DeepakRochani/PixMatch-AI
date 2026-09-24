/**
 * Studio Tax & Compliance Operations Routes — PIXMatch AI Phase 35
 */

import { FastifyInstance } from 'fastify';
import { StudioTaxController } from './tax.controller.js';

export async function taxRoutes(fastify: FastifyInstance) {
  // Profile & Registrations
  fastify.get('/profile', StudioTaxController.getProfile);
  fastify.put('/profile', StudioTaxController.updateProfile);
  fastify.get('/registrations', StudioTaxController.listRegistrations);
  fastify.post('/registrations', StudioTaxController.createRegistration);
  fastify.patch('/registrations/:id', StudioTaxController.updateRegistration);

  // Jurisdictions & Rates
  fastify.get('/jurisdictions', StudioTaxController.listJurisdictions);
  fastify.post('/jurisdictions', StudioTaxController.createJurisdiction);
  fastify.get('/rates', StudioTaxController.listRates);
  fastify.post('/rates', StudioTaxController.createRate);
  fastify.patch('/rates/:id', StudioTaxController.updateRate);

  // Categories & SAC/HSN Item Mappings
  fastify.get('/categories', StudioTaxController.listCategories);
  fastify.post('/categories', StudioTaxController.createCategory);
  fastify.get('/items', StudioTaxController.listItemMappings);
  fastify.post('/items', StudioTaxController.createItemMapping);

  // Party Profiles
  fastify.get('/party-profile', StudioTaxController.getPartyProfile);
  fastify.post('/party-profile', StudioTaxController.upsertPartyProfile);

  // Tax Determination Calculation
  fastify.post('/calculate', StudioTaxController.calculateTax);

  // Tax Transactions & Double-Entry Postings
  fastify.get('/transactions', StudioTaxController.listTransactions);
  fastify.get('/transactions/:id', StudioTaxController.getTransaction);
  fastify.post('/transactions', StudioTaxController.createTransaction);
  fastify.post('/transactions/:id/post', StudioTaxController.postTransaction);
  fastify.post('/transactions/:id/void', StudioTaxController.voidTransaction);
  fastify.post('/transactions/:id/reverse', StudioTaxController.reverseTransaction);
  fastify.post('/adjustments', StudioTaxController.createAdjustment);

  // Periods & Reconciliation
  fastify.get('/periods', StudioTaxController.listPeriods);
  fastify.post('/periods', StudioTaxController.createPeriod);
  fastify.post('/periods/:id/review', StudioTaxController.reviewPeriod);
  fastify.post('/periods/:id/ready', StudioTaxController.readyPeriod);
  fastify.post('/periods/:id/close', StudioTaxController.closePeriod);
  fastify.post('/periods/:id/reconcile', StudioTaxController.reconcilePeriod);

  // Compliance & Operational Reports
  fastify.get('/compliance', StudioTaxController.getCompliance);
  fastify.get('/summary', StudioTaxController.getSummary);
  fastify.get('/export', StudioTaxController.exportCsv);
}
