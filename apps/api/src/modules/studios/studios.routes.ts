import { FastifyInstance } from 'fastify';
import { StudiosController } from './studios.controller.js';
import { authenticate } from '../../middlewares/auth.js';
import { requireTenant } from '../../middlewares/tenant.js';

export async function studiosRoutes(fastify: FastifyInstance) {
  fastify.get('/current', { preHandler: [authenticate, requireTenant] }, StudiosController.getCurrent);
  fastify.patch('/current', { preHandler: [authenticate, requireTenant] }, StudiosController.update);
}
