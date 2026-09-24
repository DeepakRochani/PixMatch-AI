/**
 * Studio Team Collaboration & Internal Operations 2.0 Routes — PIXMatch AI Phase 32
 */

import { FastifyInstance } from 'fastify';
import { StudioTeamCollaborationController } from './team-collaboration.controller.js';
import { authenticate } from '../../middlewares/auth.js';
import { requireTenant } from '../../middlewares/tenant.js';

export async function teamCollaborationRoutes(fastify: FastifyInstance) {
  fastify.register(async function authenticatedCollaborationRoutes(collabGroup) {
    collabGroup.addHook('preHandler', authenticate);
    collabGroup.addHook('preHandler', requireTenant);

    // 1. Threads
    collabGroup.get('/threads', StudioTeamCollaborationController.listThreads);
    collabGroup.post('/threads', StudioTeamCollaborationController.createThread);
    collabGroup.get('/threads/:threadId', StudioTeamCollaborationController.getThread);
    collabGroup.patch('/threads/:threadId', StudioTeamCollaborationController.updateThread);

    // 2. Messages
    collabGroup.post('/threads/:threadId/messages', StudioTeamCollaborationController.createMessage);
    collabGroup.get('/threads/:threadId/messages', StudioTeamCollaborationController.listMessages);
    collabGroup.patch('/messages/:messageId', StudioTeamCollaborationController.updateMessage);
    collabGroup.delete('/messages/:messageId', StudioTeamCollaborationController.deleteMessage);

    // 3. Mentions & Read States
    collabGroup.get('/mentions', StudioTeamCollaborationController.listMentions);
    collabGroup.post('/mentions/:mentionId/read', StudioTeamCollaborationController.markMentionRead);
    collabGroup.post('/threads/:threadId/read', StudioTeamCollaborationController.markThreadRead);

    // 4. Acknowledgements
    collabGroup.post('/acknowledgements', StudioTeamCollaborationController.acknowledge);

    // 5. Work Handoffs
    collabGroup.get('/handoffs', StudioTeamCollaborationController.listHandoffs);
    collabGroup.post('/handoffs', StudioTeamCollaborationController.createHandoff);
    collabGroup.post('/handoffs/:handoffId/accept', StudioTeamCollaborationController.acceptHandoff);
    collabGroup.post('/handoffs/:handoffId/decline', StudioTeamCollaborationController.declineHandoff);

    // 6. Work Blockers
    collabGroup.get('/blockers', StudioTeamCollaborationController.listBlockers);
    collabGroup.post('/blockers', StudioTeamCollaborationController.createBlocker);
    collabGroup.post('/blockers/:blockerId/resolve', StudioTeamCollaborationController.resolveBlocker);

    // 7. Help Requests
    collabGroup.get('/help-requests', StudioTeamCollaborationController.listHelpRequests);
    collabGroup.post('/help-requests', StudioTeamCollaborationController.createHelpRequest);
    collabGroup.post('/help-requests/:requestId/resolve', StudioTeamCollaborationController.resolveHelpRequest);

    // 8. Attention Center
    collabGroup.get('/attention', StudioTeamCollaborationController.getAttentionCenter);

    // 9. Search
    collabGroup.get('/search', StudioTeamCollaborationController.searchCollaboration);

    // 10. Attachments
    collabGroup.get('/attachments/:attachmentId/download', StudioTeamCollaborationController.getAttachmentDownloadUrl);
  });
}
