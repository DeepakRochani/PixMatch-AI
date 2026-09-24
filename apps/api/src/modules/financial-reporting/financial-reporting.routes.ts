/**
 * Studio Financial Reporting Routes — PIXMatch AI Phase 37
 */

import { FastifyInstance } from 'fastify';
import { StudioFinancialReportingController } from './financial-reporting.controller';

export async function financialReportingRoutes(app: FastifyInstance) {
  // Overview
  app.get('/overview', StudioFinancialReportingController.getDashboardOverview);

  // Accounting Statements
  app.get('/profit-loss', StudioFinancialReportingController.getProfitAndLoss);
  app.get('/balance-sheet', StudioFinancialReportingController.getBalanceSheet);
  app.get('/trial-balance', StudioFinancialReportingController.getTrialBalance);
  app.get('/cash-flow', StudioFinancialReportingController.getCashFlow);
  app.get('/general-ledger', StudioFinancialReportingController.getGeneralLedger);
  app.get('/financial-position', StudioFinancialReportingController.getFinancialPosition);

  // Operational Subledger Reports
  app.get('/ar-aging', StudioFinancialReportingController.getArAging);
  app.get('/ap-aging', StudioFinancialReportingController.getApAging);
  app.get('/revenue', StudioFinancialReportingController.getRevenueReport);
  app.get('/expenses', StudioFinancialReportingController.getExpenseReport);
  app.get('/project-profitability', StudioFinancialReportingController.getProjectProfitability);

  // Tax & Compliance
  app.get('/tax', StudioFinancialReportingController.getTaxSummary);
  app.get('/tax/gst', StudioFinancialReportingController.getGstCompliance);
  app.get('/tax/reconciliation', StudioFinancialReportingController.getTaxReconciliation);
  app.get('/reconciliation', StudioFinancialReportingController.getReconciliationOverview);

  // Anomalies & Insights
  app.get('/anomalies', StudioFinancialReportingController.getAnomalies);
  app.put('/anomalies/:id', StudioFinancialReportingController.updateAnomaly);
  app.get('/insights', StudioFinancialReportingController.getInsights);

  // Month-End Close
  app.get('/month-end-close', StudioFinancialReportingController.getMonthEndCloseStatus);
  app.post('/month-end-close/execute', StudioFinancialReportingController.executeMonthEndClose);

  // Exports & Accountant Handoff
  app.get('/export/csv', StudioFinancialReportingController.exportReportCsv);
  app.get('/export/pdf', StudioFinancialReportingController.exportReportPdf);
  app.post('/exports', StudioFinancialReportingController.createExport);
  app.get('/exports/accountant-handoff', StudioFinancialReportingController.getAccountantHandoff);

  // Schedules
  app.post('/schedules', StudioFinancialReportingController.createSchedule);
  app.get('/schedules', StudioFinancialReportingController.listSchedules);
  app.put('/schedules/:id', StudioFinancialReportingController.updateSchedule);
  app.delete('/schedules/:id', StudioFinancialReportingController.deleteSchedule);
}
