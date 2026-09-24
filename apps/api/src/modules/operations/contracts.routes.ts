/**
 * Contracts Routes — PixMatch AI Phase 21
 */

import { FastifyInstance } from 'fastify';
import { ContractsController } from './contracts.controller.js';
import { authenticate } from '../../middlewares/auth.js';

export async function contractsRoutes(app: FastifyInstance) {
  app.register(async (authed) => {
    authed.addHook('onRequest', authenticate);

    // Templates
    authed.get('/templates', ContractsController.listTemplates);
    authed.get('/templates/:id', ContractsController.getTemplate);
    authed.post('/templates', ContractsController.createTemplate);
    authed.patch('/templates/:id', ContractsController.updateTemplate);
    authed.delete('/templates/:id', ContractsController.deleteTemplate);

    // Contracts
    authed.get('/', ContractsController.listContracts);
    authed.get('/:id', ContractsController.getContract);
    authed.post('/', ContractsController.createContract);
    authed.patch('/:id', ContractsController.updateContract);
    authed.post('/:id/send', ContractsController.sendContract);
    authed.post('/:id/countersign', ContractsController.countersignContract);
    authed.post('/:id/void', ContractsController.voidContract);
    authed.delete('/:id', ContractsController.deleteContract);
  });
}
