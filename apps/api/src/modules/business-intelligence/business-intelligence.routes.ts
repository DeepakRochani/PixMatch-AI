/**
 * Studio Business Intelligence, Forecasting & Decision Intelligence Routes — PIXMatch AI Phase 38
 */

import { FastifyInstance } from 'fastify';
import { StudioBusinessIntelligenceController } from './business-intelligence.controller';

export async function businessIntelligenceRoutes(app: FastifyInstance) {
  // Executive Dashboard
  app.get('/dashboard', StudioBusinessIntelligenceController.getDashboard);

  // KPIs & Definitions
  app.get('/kpis', StudioBusinessIntelligenceController.getKpis);
  app.get('/kpi-definitions', StudioBusinessIntelligenceController.getKpiDefinitions);

  // Trends
  app.get('/revenue', StudioBusinessIntelligenceController.getRevenueTrend);
  app.get('/profit', StudioBusinessIntelligenceController.getProfitTrend);
  app.get('/cash', StudioBusinessIntelligenceController.getCashTrend);
  app.get('/pipeline', StudioBusinessIntelligenceController.getPipelineTrend);
  app.get('/bookings', StudioBusinessIntelligenceController.getBookingTrend);

  // Operations & Performance
  app.get('/projects', StudioBusinessIntelligenceController.getProjects);
  app.get('/clients', StudioBusinessIntelligenceController.getClients);
  app.get('/team-capacity', StudioBusinessIntelligenceController.getTeamCapacity);

  // Alerts & Insights
  app.get('/alerts', StudioBusinessIntelligenceController.getAlerts);
  app.get('/insights', StudioBusinessIntelligenceController.getInsights);

  // Forecasting & Scenarios
  app.get('/forecasts', StudioBusinessIntelligenceController.getForecasts);
  app.post('/scenarios', StudioBusinessIntelligenceController.runScenario);
  app.get('/scenarios/sensitivity', StudioBusinessIntelligenceController.getSensitivity);

  // Decision Frameworks
  app.get('/break-even', StudioBusinessIntelligenceController.getBreakEven);
  app.get('/goals', StudioBusinessIntelligenceController.getGoals);
  app.get('/scorecard', StudioBusinessIntelligenceController.getScorecard);
  app.get('/seasonality', StudioBusinessIntelligenceController.getSeasonality);

  // Management Reports & Exports
  app.get('/reports', StudioBusinessIntelligenceController.getReports);
  app.get('/reports/export/csv', StudioBusinessIntelligenceController.exportReportCsv);
  app.get('/reports/export/pdf', StudioBusinessIntelligenceController.exportReportPdf);
}
