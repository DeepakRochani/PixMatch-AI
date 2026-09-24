import { FastifyInstance } from 'fastify';
import { AuthController } from './auth.controller.js';
import { authenticate } from '../../middlewares/auth.js';

export async function authRoutes(fastify: FastifyInstance) {
  fastify.post('/login', AuthController.login);
  fastify.post('/register', AuthController.register);
  fastify.get('/me', { preHandler: [authenticate] }, AuthController.me);
}
