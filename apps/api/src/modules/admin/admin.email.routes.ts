import { FastifyInstance } from 'fastify';
import { AdminEmailController } from './admin.email.controller.js';
import { authenticate, requireSuperAdmin } from '../../middlewares/auth.js';

export async function adminEmailRoutes(fastify: FastifyInstance) {
  // All admin email operations strictly require authenticate + requireSuperAdmin
  fastify.register(async (adminRoutes) => {
    adminRoutes.addHook('preHandler', authenticate);
    adminRoutes.addHook('preHandler', requireSuperAdmin);

    // Overview & statistics
    adminRoutes.get('/admin/email', AdminEmailController.getOverview);
    adminRoutes.get('/admin/email/overview', AdminEmailController.getOverview);

    // Operational Logs
    adminRoutes.get('/admin/email/logs', AdminEmailController.getLogs);

    // Templates Management & Preview
    adminRoutes.get('/admin/email/templates', AdminEmailController.getTemplates);
    adminRoutes.get('/admin/email/templates/:id', AdminEmailController.getTemplate);
    adminRoutes.post('/admin/email/templates/:id/test', AdminEmailController.testTemplate);

    // Provider Settings & Diagnostics
    adminRoutes.get('/admin/email/settings', AdminEmailController.getSettings);
    adminRoutes.post('/admin/email/settings/test', AdminEmailController.testConnection);
    adminRoutes.get('/admin/email/health', AdminEmailController.testConnection);
  });
}
