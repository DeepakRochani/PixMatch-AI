/**
 * Studio Financial Accounting & General Ledger Routes — PIXMatch AI Phase 34
 */

import { FastifyInstance } from 'fastify';
import { StudioAccountingController } from './accounting.controller.js';

export async function accountingRoutes(fastify: FastifyInstance) {
  // Defaults & Setup
  fastify.post('/defaults', StudioAccountingController.initializeDefaults);

  // Chart of Accounts
  fastify.post('/accounts', StudioAccountingController.createAccount);
  fastify.get('/accounts', StudioAccountingController.listAccounts);
  fastify.get('/accounts/:accountId', StudioAccountingController.getAccountById);
  fastify.patch('/accounts/:accountId', StudioAccountingController.updateAccount);
  fastify.post('/accounts/:accountId/archive', StudioAccountingController.archiveAccount);

  // System Mappings
  fastify.get('/mappings', StudioAccountingController.listMappings);
  fastify.post('/mappings', StudioAccountingController.setMapping);

  // Journal Entries & Double-Entry Postings
  fastify.post('/journal-entries', StudioAccountingController.createJournalEntry);
  fastify.post('/journal-entries/:entryId/post', StudioAccountingController.postJournalEntry);
  fastify.post('/journal-entries/:entryId/reverse', StudioAccountingController.reverseJournalEntry);
  fastify.post('/journal-entries/:entryId/void', StudioAccountingController.voidDraftJournalEntry);

  // Periods & Opening Balances
  fastify.get('/periods', StudioAccountingController.listPeriods);
  fastify.post('/periods', StudioAccountingController.createPeriod);
  fastify.post('/periods/:periodId/close', StudioAccountingController.closePeriod);
  fastify.post('/periods/:periodId/reopen', StudioAccountingController.reopenPeriod);
  fastify.post('/opening-balances', StudioAccountingController.createOpeningBalance);

  // Reports & Analytics
  fastify.get('/trial-balance', StudioAccountingController.getTrialBalance);
  fastify.get('/ledger', StudioAccountingController.getGeneralLedger);
  fastify.get('/profit-loss', StudioAccountingController.getProfitAndLoss);
  fastify.get('/balance-sheet', StudioAccountingController.getBalanceSheet);

  // Exports
  fastify.get('/export/ledger', StudioAccountingController.exportLedgerCSV);
  fastify.get('/export/trial-balance', StudioAccountingController.exportTrialBalanceCSV);
}
