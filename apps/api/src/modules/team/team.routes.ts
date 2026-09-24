/**
 * Studio Team & Workforce Management Routes — PIXMatch AI Phase 31
 */

import { FastifyInstance } from 'fastify';
import { StudioTeamController } from './team.controller.js';
import { authenticate } from '../../middlewares/auth.js';
import { requireTenant } from '../../middlewares/tenant.js';

export async function teamRoutes(fastify: FastifyInstance) {
  // Public / invitation acceptance (user must be authenticated, but does not need active studio tenant yet)
  fastify.post('/invitations/accept', { preHandler: [authenticate] }, StudioTeamController.acceptInvitation);

  // Authenticated & Tenant Scoped Endpoints
  fastify.register(async function authenticatedTeamRoutes(teamGroup) {
    teamGroup.addHook('preHandler', authenticate);
    teamGroup.addHook('preHandler', requireTenant);

    // 1. Members
    teamGroup.get('/members', StudioTeamController.listMembers);
    teamGroup.get('/members/:memberId', StudioTeamController.getMember);
    teamGroup.patch('/members/:memberId', StudioTeamController.updateMemberProfile);
    teamGroup.put('/members/:memberId/role', StudioTeamController.changeMemberRole);
    teamGroup.post('/members/:memberId/deactivate', StudioTeamController.deactivateMember);
    teamGroup.post('/members/:memberId/reactivate', StudioTeamController.reactivateMember);

    // 2. Invitations
    teamGroup.get('/invitations', StudioTeamController.listInvitations);
    teamGroup.post('/invitations', StudioTeamController.createInvitation);
    teamGroup.delete('/invitations/:invitationId', StudioTeamController.revokeInvitation);
    teamGroup.post('/invitations/:invitationId/resend', StudioTeamController.resendInvitation);

    // 3. Departments
    teamGroup.get('/departments', StudioTeamController.listDepartments);
    teamGroup.post('/departments', StudioTeamController.createDepartment);
    teamGroup.patch('/departments/:deptId', StudioTeamController.updateDepartment);
    teamGroup.delete('/departments/:deptId', StudioTeamController.deleteDepartment);

    // 4. Workload
    teamGroup.get('/workload', StudioTeamController.getWorkloadDashboard);
    teamGroup.get('/workload/:memberId', StudioTeamController.getMemberWorkload);

    // 5. Availability & Leaves
    teamGroup.get('/leaves', StudioTeamController.listLeaves);
    teamGroup.post('/leaves', StudioTeamController.createLeave);
    teamGroup.delete('/leaves/:leaveId', StudioTeamController.deleteLeave);
    teamGroup.post('/conflicts/check', StudioTeamController.checkScheduleConflict);

    // 6. Assignments & Reassignments
    teamGroup.post('/assignments/bulk-tasks', StudioTeamController.bulkAssignTasks);
    teamGroup.get('/reassignment-plan/:memberId', StudioTeamController.getReassignmentPlan);
    teamGroup.post('/reassign', StudioTeamController.executeReassignment);

    // 7. Calendar
    teamGroup.get('/calendar', StudioTeamController.getTeamCalendar);

    // 8. Activity & Metrics
    teamGroup.get('/activities', StudioTeamController.listActivities);
    teamGroup.get('/metrics', StudioTeamController.getMetrics);

    // 9. Export
    teamGroup.get('/export/csv', StudioTeamController.exportMembersCSV);
  });
}
