/**
 * Studio Planning Routes — PIXMatch AI Phase 39
 */

import { FastifyInstance } from 'fastify';
import { StudioPlanningController } from './planning.controller';

export async function planningRoutes(app: FastifyInstance) {
  // Overview & Health
  app.get('/overview', StudioPlanningController.getDashboardOverview);
  app.get('/plans/:planId/health', StudioPlanningController.getPlanHealth);

  // Business Plans Lifecycle
  app.get('/plans', StudioPlanningController.listPlans);
  app.get('/plans/active', StudioPlanningController.getActivePlan);
  app.get('/plans/:planId', StudioPlanningController.getPlanById);
  app.post('/plans', StudioPlanningController.createPlan);
  app.put('/plans/:planId', StudioPlanningController.updatePlan);
  app.post('/plans/:planId/transition', StudioPlanningController.transitionStatus);
  app.post('/plans/:planId/rebaseline', StudioPlanningController.rebaselinePlan);

  // Targets & Variance
  app.get('/plans/:planId/targets', StudioPlanningController.getPlanTargets);
  app.post('/plans/:planId/targets', StudioPlanningController.upsertTarget);
  app.post('/plans/:planId/refresh-actuals', StudioPlanningController.refreshActuals);
  app.get('/plans/:planId/variance', StudioPlanningController.getPlanVsActual);

  // Budgets
  app.get('/plans/:planId/budgets', StudioPlanningController.getBudgetComparison);

  // Strategic Objectives, Initiatives & Milestones
  app.get('/plans/:planId/objectives', StudioPlanningController.listObjectives);
  app.post('/plans/:planId/objectives', StudioPlanningController.createObjective);
  app.put('/objectives/:objectiveId', StudioPlanningController.updateObjective);
  app.delete('/objectives/:objectiveId', StudioPlanningController.deleteObjective);
  app.post('/objectives/:objectiveId/initiatives', StudioPlanningController.createInitiative);
  app.put('/initiatives/:initiativeId', StudioPlanningController.updateInitiative);
  app.post('/initiatives/:initiativeId/milestones', StudioPlanningController.createMilestone);
  app.put('/milestones/:milestoneId', StudioPlanningController.updateMilestone);

  // Forecast & Scenario Alignment
  app.get('/plans/:planId/forecast-alignment', StudioPlanningController.getPlanVsForecast);
  app.get('/plans/:planId/scenarios', StudioPlanningController.getPlanVsScenarios);

  // Reviews & Cadence
  app.get('/plans/:planId/reviews', StudioPlanningController.listReviews);
  app.post('/plans/:planId/reviews', StudioPlanningController.createReview);
  app.put('/reviews/:reviewId', StudioPlanningController.updateReview);

  // Exports
  app.get('/plans/:planId/export/csv', StudioPlanningController.exportVarianceCsv);
  app.get('/plans/:planId/export/json', StudioPlanningController.exportPlanJson);
}
