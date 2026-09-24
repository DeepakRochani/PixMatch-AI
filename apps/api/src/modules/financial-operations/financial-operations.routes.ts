/**
 * Studio Financial Operations & Profitability Routes — PIXMatch AI Phase 33
 */

import { FastifyInstance } from 'fastify';
import { StudioFinancialOperationsController } from './financial-operations.controller.js';

export async function financialOperationsRoutes(fastify: FastifyInstance) {
  // Accounts
  fastify.post('/accounts', StudioFinancialOperationsController.createAccount);
  fastify.get('/accounts', StudioFinancialOperationsController.listAccounts);
  fastify.patch('/accounts/:accountId', StudioFinancialOperationsController.updateAccount);
  fastify.get('/accounts/export', StudioFinancialOperationsController.exportAccountsCSV);

  // Categories
  fastify.post('/categories', StudioFinancialOperationsController.createCategory);
  fastify.get('/categories', StudioFinancialOperationsController.listCategories);

  // Vendors
  fastify.post('/vendors', StudioFinancialOperationsController.createVendor);
  fastify.get('/vendors', StudioFinancialOperationsController.listVendors);
  fastify.patch('/vendors/:vendorId', StudioFinancialOperationsController.updateVendor);
  fastify.delete('/vendors/:vendorId', StudioFinancialOperationsController.deleteVendor);

  // Expenses
  fastify.post('/expenses', StudioFinancialOperationsController.createExpense);
  fastify.get('/expenses', StudioFinancialOperationsController.listExpenses);
  fastify.get('/expenses/export', StudioFinancialOperationsController.exportExpensesCSV);
  fastify.get('/expenses/:expenseId', StudioFinancialOperationsController.getExpense);
  fastify.post('/expenses/:expenseId/approve', StudioFinancialOperationsController.approveExpense);
  fastify.post('/expenses/:expenseId/void', StudioFinancialOperationsController.voidExpense);

  // Payments
  fastify.post('/payments', StudioFinancialOperationsController.recordExpensePayment);

  // Receivables & Payables
  fastify.get('/receivables', StudioFinancialOperationsController.listReceivables);
  fastify.get('/payables', StudioFinancialOperationsController.listPayables);

  // Budgets
  fastify.post('/budgets', StudioFinancialOperationsController.createBudget);
  fastify.get('/budgets', StudioFinancialOperationsController.listBudgets);
  fastify.get('/budgets/:budgetId/variance', StudioFinancialOperationsController.getBudgetVariance);

  // Profitability & Summaries
  fastify.get('/profitability/projects/:projectId', StudioFinancialOperationsController.getProjectProfitability);
  fastify.get('/profitability/clients/:clientId', StudioFinancialOperationsController.getClientProfitability);
  fastify.get('/summaries/cash-flow', StudioFinancialOperationsController.getCashFlowSummary);
  fastify.get('/summaries/tax', StudioFinancialOperationsController.getTaxSummary);
}
