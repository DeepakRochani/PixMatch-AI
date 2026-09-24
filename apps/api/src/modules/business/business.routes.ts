/**
 * Business Routes — PIXMatch AI Phase 18
 * Fastify route registration for Studio Business Intelligence & Revenue Intelligence.
 */

import { FastifyInstance } from 'fastify';
import { BusinessController } from './business.controller.js';
import { authenticate } from '../../middlewares/auth.js';

export async function businessRoutes(app: FastifyInstance) {
  // All endpoints require studio authentication
  app.addHook('onRequest', authenticate);

  // Overview & Financial Reporting
  app.get('/overview', BusinessController.getOverview);
  app.get('/trends', BusinessController.getRevenueTrend);
  app.get('/breakdown/revenue', BusinessController.getRevenueBreakdown);
  app.get('/breakdown/expenses', BusinessController.getExpenseBreakdown);
  app.get('/performance/studio', BusinessController.getStudioPerformance);
  app.get('/performance/services', BusinessController.getServicePerformance);
  app.get('/funnel/galleries', BusinessController.getGalleryToBusinessFunnel);
  app.get('/clients/summary', BusinessController.getClientBusinessSummary);

  // Transactions CRUD, Voiding & Export
  app.post('/transactions', BusinessController.createTransaction);
  app.get('/transactions', BusinessController.listTransactions);
  app.get('/transactions/export/csv', BusinessController.exportTransactionsCsv);
  app.get('/transactions/:transactionId', BusinessController.getTransaction);
  app.patch('/transactions/:transactionId', BusinessController.updateTransaction);
  app.post('/transactions/:transactionId/void', BusinessController.voidTransaction);

  // Goals
  app.post('/goals', BusinessController.createGoal);
  app.get('/goals', BusinessController.listGoals);
  app.get('/goals/:goalId', BusinessController.getGoal);
  app.patch('/goals/:goalId', BusinessController.updateGoal);
  app.delete('/goals/:goalId', BusinessController.deleteGoal);

  // Forecasting
  app.get('/forecast', BusinessController.getForecast);

  // Insights & Anomaly Detection
  app.get('/insights', BusinessController.listInsights);
  app.post('/insights/scan', BusinessController.scanInsights);
  app.post('/insights/:insightId/acknowledge', BusinessController.acknowledgeInsight);
  app.post('/insights/:insightId/resolve', BusinessController.resolveInsight);
  app.post('/insights/:insightId/dismiss', BusinessController.dismissInsight);

  // Super Admin Telemetry
  app.get('/admin/telemetry', BusinessController.getAdminTelemetry);
}
