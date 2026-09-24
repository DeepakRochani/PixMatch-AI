/**
 * Studio Team & Workforce Management Controller — PIXMatch AI Phase 31
 */

import { FastifyRequest, FastifyReply } from 'fastify';
import { StudioTeamService } from './team.service.js';
import { prisma } from '@pixmatch/database';
import {
  ICreateTeamInvitationDTO,
  IAcceptTeamInvitationDTO,
  IBulkTaskAssignDTO,
  IMemberReassignmentExecuteDTO,
  IScheduleConflictCheckDTO,
  ITeamDirectoryFilterDTO,
} from '@pixmatch/types';

export class StudioTeamController {
  private static getService(): StudioTeamService {
    return new StudioTeamService(prisma);
  }

  private static extractAuth(req: FastifyRequest) {
    const user = (req as any).user;
    const studioId = (req as any).studioId || (req as any).tenantId || req.headers['x-studio-id'] || user?.studioId || user?.studio_id;
    const userId = user?.id || user?.userId || 'anonymous';
    return { studioId, userId };
  }

  // --- 1. Team Members & Directory ---

  static async listMembers(req: FastifyRequest<{ Querystring: ITeamDirectoryFilterDTO }>, reply: FastifyReply) {
    const { studioId } = StudioTeamController.extractAuth(req);
    if (!studioId) return reply.status(400).send({ error: 'Missing studio identification' });

    const service = StudioTeamController.getService();
    const result = await service.listMembers(studioId, req.query);
    return reply.status(200).send(result);
  }

  static async getMember(req: FastifyRequest<{ Params: { memberId: string } }>, reply: FastifyReply) {
    const { studioId } = StudioTeamController.extractAuth(req);
    const { memberId } = req.params;
    if (!studioId) return reply.status(400).send({ error: 'Missing studio identification' });

    const service = StudioTeamController.getService();
    const member = await service.getMember(studioId, memberId);
    return reply.status(200).send(member);
  }

  static async updateMemberProfile(
    req: FastifyRequest<{ Params: { memberId: string }; Body: any }>,
    reply: FastifyReply
  ) {
    const { studioId, userId } = StudioTeamController.extractAuth(req);
    const { memberId } = req.params;
    if (!studioId) return reply.status(400).send({ error: 'Missing studio identification' });

    const service = StudioTeamController.getService();
    const updated = await service.updateMemberProfile(studioId, userId, memberId, req.body);
    return reply.status(200).send(updated);
  }

  static async changeMemberRole(
    req: FastifyRequest<{ Params: { memberId: string }; Body: { role: any } }>,
    reply: FastifyReply
  ) {
    const { studioId, userId } = StudioTeamController.extractAuth(req);
    const { memberId } = req.params;
    const { role } = req.body;
    if (!studioId) return reply.status(400).send({ error: 'Missing studio identification' });
    if (!role) return reply.status(400).send({ error: 'Role is required' });

    const service = StudioTeamController.getService();
    const updated = await service.changeMemberRole(studioId, userId, memberId, role);
    return reply.status(200).send(updated);
  }

  static async deactivateMember(
    req: FastifyRequest<{ Params: { memberId: string }; Body: { reason?: string } }>,
    reply: FastifyReply
  ) {
    const { studioId, userId } = StudioTeamController.extractAuth(req);
    const { memberId } = req.params;
    if (!studioId) return reply.status(400).send({ error: 'Missing studio identification' });

    const service = StudioTeamController.getService();
    const result = await service.deactivateMember(studioId, userId, memberId, req.body?.reason);
    return reply.status(200).send(result);
  }

  static async reactivateMember(
    req: FastifyRequest<{ Params: { memberId: string } }>,
    reply: FastifyReply
  ) {
    const { studioId, userId } = StudioTeamController.extractAuth(req);
    const { memberId } = req.params;
    if (!studioId) return reply.status(400).send({ error: 'Missing studio identification' });

    const service = StudioTeamController.getService();
    const result = await service.reactivateMember(studioId, userId, memberId);
    return reply.status(200).send(result);
  }

  // --- 2. Invitations ---

  static async createInvitation(
    req: FastifyRequest<{ Body: ICreateTeamInvitationDTO }>,
    reply: FastifyReply
  ) {
    const { studioId, userId } = StudioTeamController.extractAuth(req);
    if (!studioId) return reply.status(400).send({ error: 'Missing studio identification' });

    const service = StudioTeamController.getService();
    const result = await service.createInvitation(studioId, userId, req.body);
    return reply.status(201).send(result);
  }

  static async listInvitations(
    req: FastifyRequest<{ Querystring: { status?: any } }>,
    reply: FastifyReply
  ) {
    const { studioId } = StudioTeamController.extractAuth(req);
    if (!studioId) return reply.status(400).send({ error: 'Missing studio identification' });

    const service = StudioTeamController.getService();
    const invitations = await service.listInvitations(studioId, req.query.status);
    return reply.status(200).send({ items: invitations, total: invitations.length });
  }

  static async revokeInvitation(
    req: FastifyRequest<{ Params: { invitationId: string } }>,
    reply: FastifyReply
  ) {
    const { studioId, userId } = StudioTeamController.extractAuth(req);
    const { invitationId } = req.params;
    if (!studioId) return reply.status(400).send({ error: 'Missing studio identification' });

    const service = StudioTeamController.getService();
    const result = await service.revokeInvitation(studioId, userId, invitationId);
    return reply.status(200).send(result);
  }

  static async resendInvitation(
    req: FastifyRequest<{ Params: { invitationId: string } }>,
    reply: FastifyReply
  ) {
    const { studioId, userId } = StudioTeamController.extractAuth(req);
    const { invitationId } = req.params;
    if (!studioId) return reply.status(400).send({ error: 'Missing studio identification' });

    const service = StudioTeamController.getService();
    const result = await service.resendInvitation(studioId, userId, invitationId);
    return reply.status(200).send(result);
  }

  static async acceptInvitation(
    req: FastifyRequest<{ Body: IAcceptTeamInvitationDTO }>,
    reply: FastifyReply
  ) {
    const { userId } = StudioTeamController.extractAuth(req);
    const service = StudioTeamController.getService();
    const result = await service.acceptInvitation(userId, req.body);
    return reply.status(200).send(result);
  }

  // --- 3. Departments ---

  static async listDepartments(req: FastifyRequest, reply: FastifyReply) {
    const { studioId } = StudioTeamController.extractAuth(req);
    if (!studioId) return reply.status(400).send({ error: 'Missing studio identification' });

    const service = StudioTeamController.getService();
    const departments = await service.listDepartments(studioId);
    return reply.status(200).send({ items: departments, total: departments.length });
  }

  static async createDepartment(
    req: FastifyRequest<{ Body: { name: string; description?: string; color?: string; manager_id?: string } }>,
    reply: FastifyReply
  ) {
    const { studioId, userId } = StudioTeamController.extractAuth(req);
    if (!studioId) return reply.status(400).send({ error: 'Missing studio identification' });

    const service = StudioTeamController.getService();
    const dept = await service.createDepartment(studioId, userId, req.body);
    return reply.status(201).send(dept);
  }

  static async updateDepartment(
    req: FastifyRequest<{ Params: { deptId: string }; Body: any }>,
    reply: FastifyReply
  ) {
    const { studioId, userId } = StudioTeamController.extractAuth(req);
    const { deptId } = req.params;
    if (!studioId) return reply.status(400).send({ error: 'Missing studio identification' });

    const service = StudioTeamController.getService();
    const updated = await service.updateDepartment(studioId, userId, deptId, req.body);
    return reply.status(200).send(updated);
  }

  static async deleteDepartment(
    req: FastifyRequest<{ Params: { deptId: string } }>,
    reply: FastifyReply
  ) {
    const { studioId, userId } = StudioTeamController.extractAuth(req);
    const { deptId } = req.params;
    if (!studioId) return reply.status(400).send({ error: 'Missing studio identification' });

    const service = StudioTeamController.getService();
    const result = await service.deleteDepartment(studioId, userId, deptId);
    return reply.status(200).send(result);
  }

  // --- 4. Workload ---

  static async getWorkloadDashboard(req: FastifyRequest, reply: FastifyReply) {
    const { studioId } = StudioTeamController.extractAuth(req);
    if (!studioId) return reply.status(400).send({ error: 'Missing studio identification' });

    const service = StudioTeamController.getService();
    const dashboard = await service.getWorkloadDashboard(studioId);
    return reply.status(200).send(dashboard);
  }

  static async getMemberWorkload(
    req: FastifyRequest<{ Params: { memberId: string } }>,
    reply: FastifyReply
  ) {
    const { studioId } = StudioTeamController.extractAuth(req);
    const { memberId } = req.params;
    if (!studioId) return reply.status(400).send({ error: 'Missing studio identification' });

    const service = StudioTeamController.getService();
    const workload = await service.getMemberWorkload(studioId, memberId);
    return reply.status(200).send(workload);
  }

  // --- 5. Availability & Leave ---

  static async listLeaves(
    req: FastifyRequest<{ Querystring: { member_id?: string; start_date?: string; end_date?: string } }>,
    reply: FastifyReply
  ) {
    const { studioId } = StudioTeamController.extractAuth(req);
    if (!studioId) return reply.status(400).send({ error: 'Missing studio identification' });

    const service = StudioTeamController.getService();
    const leaves = await service.listLeaves(studioId, req.query);
    return reply.status(200).send({ items: leaves, total: leaves.length });
  }

  static async createLeave(
    req: FastifyRequest<{ Body: any }>,
    reply: FastifyReply
  ) {
    const { studioId, userId } = StudioTeamController.extractAuth(req);
    if (!studioId) return reply.status(400).send({ error: 'Missing studio identification' });

    const service = StudioTeamController.getService();
    const leave = await service.createLeave(studioId, userId, req.body);
    return reply.status(201).send(leave);
  }

  static async deleteLeave(
    req: FastifyRequest<{ Params: { leaveId: string } }>,
    reply: FastifyReply
  ) {
    const { studioId, userId } = StudioTeamController.extractAuth(req);
    const { leaveId } = req.params;
    if (!studioId) return reply.status(400).send({ error: 'Missing studio identification' });

    const service = StudioTeamController.getService();
    const result = await service.deleteLeave(studioId, userId, leaveId);
    return reply.status(200).send(result);
  }

  static async checkScheduleConflict(
    req: FastifyRequest<{ Body: IScheduleConflictCheckDTO }>,
    reply: FastifyReply
  ) {
    const { studioId } = StudioTeamController.extractAuth(req);
    if (!studioId) return reply.status(400).send({ error: 'Missing studio identification' });

    const service = StudioTeamController.getService();
    const result = await service.checkScheduleConflict(studioId, req.body);
    return reply.status(200).send(result);
  }

  // --- 6. Assignments & Reassignment ---

  static async bulkAssignTasks(
    req: FastifyRequest<{ Body: IBulkTaskAssignDTO }>,
    reply: FastifyReply
  ) {
    const { studioId, userId } = StudioTeamController.extractAuth(req);
    if (!studioId) return reply.status(400).send({ error: 'Missing studio identification' });

    const service = StudioTeamController.getService();
    const result = await service.bulkAssignTasks(studioId, userId, req.body);
    return reply.status(200).send(result);
  }

  static async getReassignmentPlan(
    req: FastifyRequest<{ Params: { memberId: string } }>,
    reply: FastifyReply
  ) {
    const { studioId } = StudioTeamController.extractAuth(req);
    const { memberId } = req.params;
    if (!studioId) return reply.status(400).send({ error: 'Missing studio identification' });

    const service = StudioTeamController.getService();
    const plan = await service.getReassignmentPlan(studioId, memberId);
    return reply.status(200).send(plan);
  }

  static async executeReassignment(
    req: FastifyRequest<{ Body: IMemberReassignmentExecuteDTO }>,
    reply: FastifyReply
  ) {
    const { studioId, userId } = StudioTeamController.extractAuth(req);
    if (!studioId) return reply.status(400).send({ error: 'Missing studio identification' });

    const service = StudioTeamController.getService();
    const result = await service.executeReassignment(studioId, userId, req.body);
    return reply.status(200).send(result);
  }

  // --- 7. Team Calendar ---

  static async getTeamCalendar(
    req: FastifyRequest<{ Querystring: { start_date: string; end_date: string; member_ids?: string; department?: string; event_types?: string } }>,
    reply: FastifyReply
  ) {
    const { studioId } = StudioTeamController.extractAuth(req);
    if (!studioId) return reply.status(400).send({ error: 'Missing studio identification' });

    const service = StudioTeamController.getService();
    const events = await service.getTeamCalendar(studioId, {
      start_date: req.query.start_date,
      end_date: req.query.end_date,
      member_ids: req.query.member_ids ? req.query.member_ids.split(',') : undefined,
      department: req.query.department,
      event_types: req.query.event_types ? (req.query.event_types.split(',') as any) : undefined,
    });
    return reply.status(200).send({ items: events, total: events.length });
  }

  // --- 8. Activity & Metrics ---

  static async listActivities(
    req: FastifyRequest<{ Querystring: { member_id?: string; action?: string; limit?: number } }>,
    reply: FastifyReply
  ) {
    const { studioId } = StudioTeamController.extractAuth(req);
    if (!studioId) return reply.status(400).send({ error: 'Missing studio identification' });

    const service = StudioTeamController.getService();
    const activities = await service.listActivities(studioId, {
      member_id: req.query.member_id,
      action: req.query.action,
      limit: req.query.limit ? Number(req.query.limit) : 50,
    });
    return reply.status(200).send({ items: activities, total: activities.length });
  }

  static async getMetrics(req: FastifyRequest, reply: FastifyReply) {
    const { studioId } = StudioTeamController.extractAuth(req);
    if (!studioId) return reply.status(400).send({ error: 'Missing studio identification' });

    const service = StudioTeamController.getService();
    const metrics = await service.getMetrics(studioId);
    return reply.status(200).send(metrics);
  }

  // --- 9. CSV Export ---

  static async exportMembersCSV(req: FastifyRequest, reply: FastifyReply) {
    const { studioId } = StudioTeamController.extractAuth(req);
    if (!studioId) return reply.status(400).send({ error: 'Missing studio identification' });

    const service = StudioTeamController.getService();
    const csv = await service.exportMembersCSV(studioId);
    reply.header('Content-Type', 'text/csv; charset=utf-8');
    reply.header('Content-Disposition', `attachment; filename="studio-team-${new Date().toISOString().split('T')[0]}.csv"`);
    return reply.status(200).send(csv);
  }
}
