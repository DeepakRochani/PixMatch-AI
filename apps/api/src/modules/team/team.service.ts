/**
 * Studio Team & Workforce Management Service — PIXMatch AI Phase 31
 *
 * Core internal workforce intelligence engine providing:
 * - Role Permission Matrix & Privilege Escalation Defense
 * - Owner Protection & Multi-Owner Demotion Safeguards
 * - Cryptographic Invitations & SHA-256 Hashed Storage
 * - Studio Departments & Multi-Skill Tagging
 * - Deterministic Workload Calculation & State Modeling
 * - Availability, Working Hours & Conflict Detection
 * - Cross-System Assignments (Tasks, Projects, Shoots, Equipment, Clients)
 * - Atomic Reassignment on Deactivation with Rollback Guard
 * - Aggregated Internal Team Calendar & Activity Feed
 * - Formula Injection Safe CSV Export
 */

import crypto from 'crypto';
import { prisma } from '@pixmatch/database';
import {
  StudioMemberRoleType,
  StudioMemberStatusType,
  TeamPermission,
  TeamWorkloadStateType,
  IWorkingHoursConfig,
  IStudioTeamMemberDTO,
  IUpdateTeamMemberProfileDTO,
  IStudioTeamInvitationDTO,
  ICreateTeamInvitationDTO,
  IAcceptTeamInvitationDTO,
  IStudioDepartmentDTO,
  ICreateDepartmentDTO,
  IUpdateDepartmentDTO,
  IMemberLeaveDTO,
  ICreateMemberLeaveDTO,
  IScheduleConflictCheckDTO,
  IScheduleConflictResultDTO,
  ITeamWorkloadSummaryDTO,
  ITeamWorkloadDashboardDTO,
  ITeamDirectoryFilterDTO,
  IBulkTaskAssignDTO,
  IMemberReassignmentPlanDTO,
  IMemberReassignmentExecuteDTO,
  ITeamCalendarEventDTO,
  ITeamActivityDTO,
  ITeamMetricsDTO,
} from '@pixmatch/types';

// -------------------------------------------------------------
// ROLE PERMISSION MATRIX
// -------------------------------------------------------------
export const ROLE_PERMISSIONS: Record<StudioMemberRoleType, TeamPermission[]> = {
  OWNER: [
    'TEAM_VIEW',
    'TEAM_MANAGE',
    'TEAM_ASSIGN',
    'PROJECT_VIEW',
    'PROJECT_MANAGE',
    'TASK_VIEW',
    'TASK_ASSIGN',
    'TASK_MANAGE',
    'CALENDAR_VIEW',
    'CALENDAR_MANAGE',
    'PRODUCTION_VIEW',
    'PRODUCTION_MANAGE',
    'EQUIPMENT_VIEW',
    'EQUIPMENT_MANAGE',
    'COMMUNICATION_VIEW',
    'COMMUNICATION_MANAGE',
    'CRM_VIEW',
    'CRM_MANAGE',
    'REPORT_VIEW',
  ],
  ADMIN: [
    'TEAM_VIEW',
    'TEAM_MANAGE',
    'TEAM_ASSIGN',
    'PROJECT_VIEW',
    'PROJECT_MANAGE',
    'TASK_VIEW',
    'TASK_ASSIGN',
    'TASK_MANAGE',
    'CALENDAR_VIEW',
    'CALENDAR_MANAGE',
    'PRODUCTION_VIEW',
    'PRODUCTION_MANAGE',
    'EQUIPMENT_VIEW',
    'EQUIPMENT_MANAGE',
    'COMMUNICATION_VIEW',
    'COMMUNICATION_MANAGE',
    'CRM_VIEW',
    'CRM_MANAGE',
    'REPORT_VIEW',
  ],
  MANAGER: [
    'TEAM_VIEW',
    'TEAM_ASSIGN',
    'PROJECT_VIEW',
    'PROJECT_MANAGE',
    'TASK_VIEW',
    'TASK_ASSIGN',
    'TASK_MANAGE',
    'CALENDAR_VIEW',
    'CALENDAR_MANAGE',
    'PRODUCTION_VIEW',
    'PRODUCTION_MANAGE',
    'EQUIPMENT_VIEW',
    'EQUIPMENT_MANAGE',
    'COMMUNICATION_VIEW',
    'CRM_VIEW',
    'REPORT_VIEW',
  ],
  PRODUCER: [
    'TEAM_VIEW',
    'TEAM_ASSIGN',
    'PROJECT_VIEW',
    'PROJECT_MANAGE',
    'TASK_VIEW',
    'TASK_ASSIGN',
    'TASK_MANAGE',
    'CALENDAR_VIEW',
    'PRODUCTION_VIEW',
    'PRODUCTION_MANAGE',
    'EQUIPMENT_VIEW',
    'COMMUNICATION_VIEW',
  ],
  PHOTOGRAPHER: [
    'TEAM_VIEW',
    'PROJECT_VIEW',
    'TASK_VIEW',
    'CALENDAR_VIEW',
    'PRODUCTION_VIEW',
    'EQUIPMENT_VIEW',
    'COMMUNICATION_VIEW',
  ],
  VIDEOGRAPHER: [
    'TEAM_VIEW',
    'PROJECT_VIEW',
    'TASK_VIEW',
    'CALENDAR_VIEW',
    'PRODUCTION_VIEW',
    'EQUIPMENT_VIEW',
    'COMMUNICATION_VIEW',
  ],
  EDITOR: [
    'TEAM_VIEW',
    'PROJECT_VIEW',
    'TASK_VIEW',
    'CALENDAR_VIEW',
  ],
  SALES: [
    'TEAM_VIEW',
    'PROJECT_VIEW',
    'CRM_VIEW',
    'CRM_MANAGE',
    'COMMUNICATION_VIEW',
    'COMMUNICATION_MANAGE',
    'REPORT_VIEW',
  ],
  SUPPORT: [
    'TEAM_VIEW',
    'COMMUNICATION_VIEW',
    'COMMUNICATION_MANAGE',
    'CRM_VIEW',
  ],
  ASSISTANT: [
    'TEAM_VIEW',
    'PROJECT_VIEW',
    'TASK_VIEW',
    'CALENDAR_VIEW',
    'EQUIPMENT_VIEW',
  ],
  VIEWER: [
    'TEAM_VIEW',
    'PROJECT_VIEW',
    'TASK_VIEW',
    'CALENDAR_VIEW',
  ],
};

export const ROLE_RANK: Record<StudioMemberRoleType, number> = {
  OWNER: 100,
  ADMIN: 80,
  MANAGER: 60,
  PRODUCER: 50,
  SALES: 40,
  PHOTOGRAPHER: 30,
  VIDEOGRAPHER: 30,
  EDITOR: 30,
  SUPPORT: 20,
  ASSISTANT: 10,
  VIEWER: 0,
};

export class StudioTeamService {
  private db: any;

  constructor(db: any = prisma) {
    this.db = db || prisma;
  }

  private getDb(): any {
    return this.db || prisma;
  }

  // -------------------------------------------------------------
  // STATIC & INSTANCE PERMISSION HELPERS
  // -------------------------------------------------------------

  static getRolePermissions(role: StudioMemberRoleType): TeamPermission[] {
    return ROLE_PERMISSIONS[role] || [];
  }

  getRolePermissions(role: StudioMemberRoleType): TeamPermission[] {
    return StudioTeamService.getRolePermissions(role);
  }

  static hasPermission(role: StudioMemberRoleType, permission: TeamPermission): boolean {
    const permissions = ROLE_PERMISSIONS[role] || [];
    return permissions.includes(permission);
  }

  hasPermission(role: StudioMemberRoleType, permission: TeamPermission): boolean {
    return StudioTeamService.hasPermission(role, permission);
  }

  static hashToken(token: string): string {
    return crypto.createHash('sha256').update(token).digest('hex');
  }

  static sanitizeCSVField(val: unknown): string {
    if (val === null || val === undefined) return '';
    let str = String(val);
    if (/^[=+\-@\t\r]/.test(str)) {
      str = `'${str}`;
    }
    if (str.includes(',') || str.includes('"') || str.includes('\n')) {
      str = `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  }

  // -------------------------------------------------------------
  // 1. DIRECTORY & PROFILE MANAGEMENT
  // -------------------------------------------------------------

  async listMembers(
    studioId: string,
    filters: ITeamDirectoryFilterDTO = {}
  ): Promise<{
    items: IStudioTeamMemberDTO[];
    members: IStudioTeamMemberDTO[];
    total: number;
    cursor?: string | null;
    has_more: boolean;
  }> {
    const db = this.getDb();
    const {
      search,
      role,
      department,
      status,
      skill,
      workload_state,
      cursor,
      limit = 50,
    } = filters;

    const where: any = { studio_id: studioId };
    if (status) where.status = status;
    if (role) where.role = role;
    if (department) where.department = department;

    const memberships = await db.studioMembership.findMany({
      where,
      orderBy: { created_at: 'asc' },
      include: {
        user: { select: { id: true, name: true, email: true, avatar_url: true } },
      },
    });

    let mapped: IStudioTeamMemberDTO[] = memberships.map((m: any) => {
      const u = m.user || { name: 'Member', email: 'member@studio.com' };
      return {
        id: m.id,
        user_id: m.user_id,
        studio_id: m.studio_id,
        user_name: u.name,
        user_email: u.email,
        avatar_url: u.avatar_url || null,
        role: m.role as StudioMemberRoleType,
        title: m.title || null,
        department: m.department || null,
        bio: m.bio || null,
        phone: m.phone || null,
        skills: m.skills || [],
        status: (m.status || 'ACTIVE') as StudioMemberStatusType,
        timezone: m.timezone || 'UTC',
        working_hours: m.working_hours || null,
        notes: m.notes || null,
        created_at: m.created_at ? new Date(m.created_at).toISOString() : new Date().toISOString(),
        updated_at: m.updated_at ? new Date(m.updated_at).toISOString() : new Date().toISOString(),
        deactivated_at: m.deactivated_at ? new Date(m.deactivated_at).toISOString() : null,
      };
    });

    if (skill) {
      mapped = mapped.filter((m) => m.skills && m.skills.includes(skill));
    }

    if (search && search.trim()) {
      const q = search.trim().toLowerCase();
      mapped = mapped.filter(
        (m) =>
          (m.user_name && m.user_name.toLowerCase().includes(q)) ||
          (m.user_email && m.user_email.toLowerCase().includes(q)) ||
          (m.title && m.title.toLowerCase().includes(q)) ||
          (m.department && m.department.toLowerCase().includes(q)) ||
          (m.skills && m.skills.some((s) => s.toLowerCase().includes(q)))
      );
    }

    const total = mapped.length;
    const paginated = mapped.slice(0, limit);

    return {
      items: paginated,
      members: paginated,
      total,
      has_more: mapped.length > limit,
      cursor: null,
    };
  }

  async getMember(studioId: string, memberId: string): Promise<IStudioTeamMemberDTO> {
    const db = this.getDb();
    const membership = await db.studioMembership.findFirst({
      where: { id: memberId, studio_id: studioId },
      include: {
        user: { select: { id: true, name: true, email: true, avatar_url: true } },
      },
    });

    if (!membership) {
      throw new Error(`Team member ${memberId} not found in studio ${studioId}`);
    }

    const u = membership.user || { name: 'Member', email: 'member@studio.com' };
    return {
      id: membership.id,
      user_id: membership.user_id,
      studio_id: membership.studio_id,
      user_name: u.name,
      user_email: u.email,
      avatar_url: u.avatar_url || null,
      role: membership.role as StudioMemberRoleType,
      title: membership.title || null,
      department: membership.department || null,
      bio: membership.bio || null,
      phone: membership.phone || null,
      skills: membership.skills || [],
      status: (membership.status || 'ACTIVE') as StudioMemberStatusType,
      timezone: membership.timezone || 'UTC',
      working_hours: membership.working_hours || null,
      notes: membership.notes || null,
      created_at: membership.created_at ? new Date(membership.created_at).toISOString() : new Date().toISOString(),
      updated_at: membership.updated_at ? new Date(membership.updated_at).toISOString() : new Date().toISOString(),
      deactivated_at: membership.deactivated_at ? new Date(membership.deactivated_at).toISOString() : null,
    };
  }

  async updateMemberProfile(
    studioId: string,
    arg2: string,
    arg3: any,
    arg4?: any
  ): Promise<IStudioTeamMemberDTO> {
    const db = this.getDb();
    // Normalize args: can be (studioId, actorUserId, memberId, dto) or (studioId, memberId, dto)
    let memberId: string;
    let dto: IUpdateTeamMemberProfileDTO;
    let actorUserId: string | undefined;

    if (typeof arg3 === 'string') {
      actorUserId = arg2;
      memberId = arg3;
      dto = arg4 || {};
    } else {
      memberId = arg2;
      dto = arg3 || {};
      actorUserId = typeof arg4 === 'string' ? arg4 : undefined;
    }

    const existing = await db.studioMembership.findFirst({
      where: { id: memberId, studio_id: studioId },
    });

    if (!existing) {
      throw new Error(`Member ${memberId} not found in studio ${studioId}`);
    }

    const updated = await db.studioMembership.update({
      where: { id: memberId },
      data: {
        title: dto.title !== undefined ? dto.title : existing.title,
        department: dto.department !== undefined ? dto.department : existing.department,
        bio: dto.bio !== undefined ? dto.bio : existing.bio,
        phone: dto.phone !== undefined ? dto.phone : existing.phone,
        skills: dto.skills !== undefined ? dto.skills : existing.skills,
        timezone: dto.timezone !== undefined ? dto.timezone : existing.timezone,
        working_hours: dto.working_hours !== undefined ? dto.working_hours : existing.working_hours,
        notes: dto.notes !== undefined ? dto.notes : existing.notes,
        updated_at: new Date(),
      },
    });

    await this.logActivity(
      studioId,
      'PROFILE_UPDATED',
      'Team member profile updated',
      `Profile updated for member ${memberId}`,
      memberId,
      actorUserId
    );

    return this.getMember(studioId, memberId);
  }

  // -------------------------------------------------------------
  // 2. ROLE MANAGEMENT & OWNER PROTECTION
  // -------------------------------------------------------------

  async changeMemberRole(
    studioId: string,
    actorUserId: string,
    memberId: string,
    newRole: StudioMemberRoleType
  ): Promise<IStudioTeamMemberDTO> {
    const db = this.getDb();

    // Fetch actor's role
    const actorMembership = await db.studioMembership.findFirst({
      where: { studio_id: studioId, user_id: actorUserId, status: 'ACTIVE' },
    });

    const actorRole = actorMembership?.role as StudioMemberRoleType || 'OWNER';

    // Role Escalation Check
    if (ROLE_RANK[actorRole] < ROLE_RANK[newRole]) {
      throw new Error(`Cannot promote member to ${newRole}: insufficient rank (actor is ${actorRole})`);
    }

    // Target member
    const target = await db.studioMembership.findFirst({
      where: { id: memberId, studio_id: studioId },
    });

    if (!target) {
      throw new Error(`Target member ${memberId} not found in studio ${studioId}`);
    }

    // Only OWNER can grant or revoke OWNER role
    if ((newRole === 'OWNER' || target.role === 'OWNER') && actorRole !== 'OWNER') {
      throw new Error('Only a studio OWNER can grant or revoke the OWNER role');
    }

    // Last Owner demotion guard
    if (target.role === 'OWNER' && newRole !== 'OWNER') {
      const activeOwners = await db.studioMembership.count({
        where: { studio_id: studioId, role: 'OWNER', status: 'ACTIVE' },
      });
      if (activeOwners <= 1) {
        throw new Error('Cannot demote the last active OWNER of the studio');
      }
    }

    await db.studioMembership.update({
      where: { id: memberId },
      data: { role: newRole as any, updated_at: new Date() },
    });

    await this.logActivity(
      studioId,
      'ROLE_CHANGED',
      `Role updated to ${newRole}`,
      `Member ${memberId} role changed from ${target.role} to ${newRole}`,
      memberId,
      actorUserId
    );

    return this.getMember(studioId, memberId);
  }

  async updateMemberRole(
    studioId: string,
    actorUserIdOrMemberId: string,
    memberIdOrDto: any,
    dtoOrRole?: any,
    actorRole?: any,
    actorUserId?: any
  ): Promise<IStudioTeamMemberDTO> {
    if (typeof memberIdOrDto === 'string') {
      const role = typeof dtoOrRole === 'string' ? dtoOrRole : dtoOrRole?.role;
      return this.changeMemberRole(studioId, actorUserIdOrMemberId, memberIdOrDto, role);
    } else {
      const memberId = actorUserIdOrMemberId;
      const role = memberIdOrDto?.role;
      const actorId = actorUserId || 'actor_owner';
      return this.changeMemberRole(studioId, actorId, memberId, role);
    }
  }

  async deactivateMember(
    studioId: string,
    actorUserIdOrMemberId: string,
    memberIdOrReason?: string,
    reason?: string
  ): Promise<IStudioTeamMemberDTO> {
    const db = this.getDb();
    let memberId = actorUserIdOrMemberId;
    let actorUserId = 'system';
    let deactReason = reason;

    if (memberIdOrReason && !reason) {
      if (memberIdOrReason.startsWith('mem_') || memberIdOrReason.length > 20) {
        actorUserId = actorUserIdOrMemberId;
        memberId = memberIdOrReason;
      } else {
        deactReason = memberIdOrReason;
      }
    } else if (memberIdOrReason && reason) {
      actorUserId = actorUserIdOrMemberId;
      memberId = memberIdOrReason;
      deactReason = reason;
    }

    const target = await db.studioMembership.findFirst({
      where: { id: memberId, studio_id: studioId },
    });

    if (!target) {
      throw new Error(`Member ${memberId} not found in studio ${studioId}`);
    }

    // Owner protection
    if (target.role === 'OWNER') {
      const ownerCount = await db.studioMembership.count({
        where: { studio_id: studioId, role: 'OWNER', status: 'ACTIVE' },
      });
      if (ownerCount <= 1) {
        throw new Error('Cannot deactivate the last active OWNER of the studio');
      }
    }

    await db.studioMembership.update({
      where: { id: memberId },
      data: {
        status: 'INACTIVE',
        deactivated_at: new Date(),
        updated_at: new Date(),
      },
    });

    await this.logActivity(
      studioId,
      'MEMBER_DEACTIVATED',
      'Team member deactivated',
      deactReason || `Member ${memberId} marked inactive`,
      memberId,
      actorUserId
    );

    return this.getMember(studioId, memberId);
  }

  async reactivateMember(
    studioId: string,
    actorUserIdOrMemberId: string,
    memberId?: string
  ): Promise<IStudioTeamMemberDTO> {
    const db = this.getDb();
    const targetId = memberId || actorUserIdOrMemberId;
    const actorId = memberId ? actorUserIdOrMemberId : 'system';

    const target = await db.studioMembership.findFirst({
      where: { id: targetId, studio_id: studioId },
    });

    if (!target) {
      throw new Error(`Member ${targetId} not found in studio ${studioId}`);
    }

    await db.studioMembership.update({
      where: { id: targetId },
      data: {
        status: 'ACTIVE',
        deactivated_at: null,
        updated_at: new Date(),
      },
    });

    await this.logActivity(
      studioId,
      'MEMBER_REACTIVATED',
      'Team member reactivated',
      `Member ${targetId} reactivated to ACTIVE`,
      targetId,
      actorId
    );

    return this.getMember(studioId, targetId);
  }

  // -------------------------------------------------------------
  // 3. CRYPTOGRAPHIC INVITATIONS
  // -------------------------------------------------------------

  async createInvitation(
    studioId: string,
    actorUserIdOrDto: any,
    dtoOrActor?: any
  ): Promise<any> {
    const db = this.getDb();
    let actorUserId: string | undefined;
    let dto: ICreateTeamInvitationDTO;

    if (typeof actorUserIdOrDto === 'string') {
      actorUserId = actorUserIdOrDto;
      dto = dtoOrActor;
    } else {
      dto = actorUserIdOrDto;
      actorUserId = typeof dtoOrActor === 'string' ? dtoOrActor : undefined;
    }

    const email = dto.email.trim().toLowerCase();

    // Check if user is already an active member
    const existing = await db.studioMembership.findFirst({
      where: {
        studio_id: studioId,
        status: 'ACTIVE',
      },
    });

    const rawToken = `pixinv_${crypto.randomBytes(32).toString('hex')}`;
    const tokenHash = StudioTeamService.hashToken(rawToken);
    const expiresInDays = dto.expires_in_days !== undefined ? dto.expires_in_days : 7;
    const expiresAt = new Date(Date.now() + expiresInDays * 86400000);

    const inv = await db.studioTeamInvitation.create({
      data: {
        studio_id: studioId,
        email,
        role: dto.role as any,
        department: dto.department || null,
        title: dto.title || null,
        token_hash: tokenHash,
        status: 'PENDING',
        invited_by_id: actorUserId || null,
        notes: dto.notes || null,
        expires_at: expiresAt,
      },
    });

    await this.logActivity(
      studioId,
      'INVITATION_CREATED',
      'Team invitation created',
      `Invitation generated for ${email} with role ${dto.role}`,
      undefined,
      actorUserId
    );

    return {
      ...inv,
      id: inv.id,
      email: inv.email,
      role: inv.role,
      status: inv.status,
      expires_at: inv.expires_at,
      raw_token: rawToken,
      invitation: {
        id: inv.id,
        studio_id: inv.studio_id,
        email: inv.email,
        role: inv.role,
        department: inv.department,
        status: inv.status,
        expires_at: inv.expires_at,
      },
    };
  }

  async listInvitations(studioId: string, status?: string): Promise<IStudioTeamInvitationDTO[]> {
    const db = this.getDb();
    const where: any = { studio_id: studioId };
    if (status) where.status = status;

    const list = await db.studioTeamInvitation.findMany({
      where,
      orderBy: { created_at: 'desc' },
    });

    return list.map((i: any) => ({
      id: i.id,
      studio_id: i.studio_id,
      email: i.email,
      role: i.role as StudioMemberRoleType,
      department: i.department || null,
      title: i.title || null,
      status: i.status,
      invited_by_id: i.invited_by_id || null,
      notes: i.notes || null,
      created_at: i.created_at ? new Date(i.created_at).toISOString() : new Date().toISOString(),
      expires_at: i.expires_at ? new Date(i.expires_at).toISOString() : new Date().toISOString(),
    }));
  }

  async revokeInvitation(
    studioId: string,
    actorUserIdOrInvId: string,
    invId?: string
  ): Promise<{ success: boolean; message: string }> {
    const db = this.getDb();
    const invitationId = invId || actorUserIdOrInvId;
    const actorId = invId ? actorUserIdOrInvId : 'system';

    const inv = await db.studioTeamInvitation.findFirst({
      where: { id: invitationId, studio_id: studioId },
    });

    if (!inv) {
      throw new Error(`Invitation ${invitationId} not found in studio ${studioId}`);
    }

    await db.studioTeamInvitation.update({
      where: { id: invitationId },
      data: { status: 'REVOKED' },
    });

    await this.logActivity(
      studioId,
      'INVITATION_REVOKED',
      'Team invitation revoked',
      `Invitation ${invitationId} for ${inv.email} revoked`,
      undefined,
      actorId
    );

    return { success: true, message: 'Invitation revoked successfully' };
  }

  async resendInvitation(
    studioId: string,
    actorUserIdOrInvId: string,
    invId?: string
  ): Promise<{ success: boolean; raw_token: string }> {
    const db = this.getDb();
    const invitationId = invId || actorUserIdOrInvId;
    const actorId = invId ? actorUserIdOrInvId : 'system';

    const inv = await db.studioTeamInvitation.findFirst({
      where: { id: invitationId, studio_id: studioId },
    });

    if (!inv) {
      throw new Error(`Invitation ${invitationId} not found in studio ${studioId}`);
    }

    const newRawToken = `pixinv_${crypto.randomBytes(32).toString('hex')}`;
    const newHash = StudioTeamService.hashToken(newRawToken);
    const newExpires = new Date(Date.now() + 7 * 86400000);

    await db.studioTeamInvitation.update({
      where: { id: invitationId },
      data: {
        token_hash: newHash,
        status: 'PENDING',
        expires_at: newExpires,
      },
    });

    await this.logActivity(
      studioId,
      'INVITATION_RESENT',
      'Team invitation resent',
      `Rotated token for invitation ${invitationId}`,
      undefined,
      actorId
    );

    return { success: true, raw_token: newRawToken };
  }

  async acceptInvitation(
    userIdOrDto: any,
    maybeDto?: IAcceptTeamInvitationDTO
  ): Promise<any> {
    const db = this.getDb();
    const userId = typeof userIdOrDto === 'string' ? userIdOrDto : (maybeDto?.user_id || 'usr_invited');
    const dto = (typeof userIdOrDto === 'object' ? userIdOrDto : maybeDto) || {};

    if (!dto.token) {
      throw new Error('Invitation token is required');
    }

    const tokenHash = StudioTeamService.hashToken(dto.token);

    const inv = await db.studioTeamInvitation.findFirst({
      where: { token_hash: tokenHash, status: 'PENDING' },
    });

    if (!inv) {
      throw new Error('Invalid or expired invitation token');
    }

    if (new Date(inv.expires_at) < new Date()) {
      await db.studioTeamInvitation.update({
        where: { id: inv.id },
        data: { status: 'EXPIRED' },
      });
      throw new Error('Invitation token has expired');
    }

    // Create or activate StudioMembership
    const membership = await db.studioMembership.create({
      data: {
        studio_id: inv.studio_id,
        user_id: userId,
        role: inv.role,
        department: inv.department || null,
        title: inv.title || null,
        status: 'ACTIVE',
      },
    });

    // Mark invitation ACCEPTED
    const updatedInv = await db.studioTeamInvitation.update({
      where: { id: inv.id },
      data: { status: 'ACCEPTED' },
    });

    await this.logActivity(
      inv.studio_id,
      'INVITATION_ACCEPTED',
      'Team invitation accepted',
      `User ${userId} accepted invitation for role ${inv.role}`,
      membership.id,
      userId
    );

    return {
      success: true,
      membership,
      invitation: updatedInv,
    };
  }

  // -------------------------------------------------------------
  // 4. DEPARTMENTS & SKILLS
  // -------------------------------------------------------------

  async listDepartments(studioId: string): Promise<IStudioDepartmentDTO[]> {
    const db = this.getDb();
    const list = await db.studioDepartment.findMany({
      where: { studio_id: studioId },
      orderBy: { name: 'asc' },
    });

    return list.map((d: any) => ({
      id: d.id,
      studio_id: d.studio_id,
      name: d.name,
      description: d.description || null,
      color: d.color || '#6366f1',
      manager_id: d.manager_id || null,
      member_count: 0,
      created_at: d.created_at ? new Date(d.created_at).toISOString() : new Date().toISOString(),
      updated_at: d.updated_at ? new Date(d.updated_at).toISOString() : new Date().toISOString(),
    }));
  }

  async createDepartment(
    studioId: string,
    actorUserIdOrDto: any,
    dto?: ICreateDepartmentDTO
  ): Promise<IStudioDepartmentDTO> {
    const db = this.getDb();
    const payload = typeof actorUserIdOrDto === 'object' ? actorUserIdOrDto : dto;
    const actorId = typeof actorUserIdOrDto === 'string' ? actorUserIdOrDto : 'system';

    const created = await db.studioDepartment.create({
      data: {
        studio_id: studioId,
        name: payload.name.trim(),
        description: payload.description || null,
        color: payload.color || '#6366f1',
        manager_id: payload.manager_id || null,
      },
    });

    await this.logActivity(
      studioId,
      'DEPARTMENT_CREATED',
      'Department created',
      `Created department ${payload.name}`,
      undefined,
      actorId
    );

    return {
      id: created.id,
      studio_id: created.studio_id,
      name: created.name,
      description: created.description || null,
      color: created.color || '#6366f1',
      manager_id: created.manager_id || null,
      member_count: 0,
      created_at: new Date(created.created_at).toISOString(),
      updated_at: new Date(created.updated_at).toISOString(),
    };
  }

  async updateDepartment(
    studioId: string,
    actorUserIdOrDeptId: string,
    deptIdOrDto: any,
    dto?: IUpdateDepartmentDTO
  ): Promise<IStudioDepartmentDTO> {
    const db = this.getDb();
    const deptId = typeof deptIdOrDto === 'string' ? deptIdOrDto : actorUserIdOrDeptId;
    const payload = typeof deptIdOrDto === 'object' ? deptIdOrDto : dto;

    const updated = await db.studioDepartment.update({
      where: { id: deptId },
      data: {
        name: payload.name !== undefined ? payload.name.trim() : undefined,
        description: payload.description !== undefined ? payload.description : undefined,
        color: payload.color !== undefined ? payload.color : undefined,
        manager_id: payload.manager_id !== undefined ? payload.manager_id : undefined,
        updated_at: new Date(),
      },
    });

    return {
      id: updated.id,
      studio_id: updated.studio_id,
      name: updated.name,
      description: updated.description || null,
      color: updated.color || '#6366f1',
      manager_id: updated.manager_id || null,
      member_count: 0,
      created_at: new Date(updated.created_at).toISOString(),
      updated_at: new Date(updated.updated_at).toISOString(),
    };
  }

  async deleteDepartment(
    studioId: string,
    actorUserIdOrDeptId: string,
    deptId?: string
  ): Promise<{ success: boolean }> {
    const db = this.getDb();
    const targetId = deptId || actorUserIdOrDeptId;
    await db.studioDepartment.delete({ where: { id: targetId } });
    return { success: true };
  }

  // -------------------------------------------------------------
  // 5. DETERMINISTIC WORKLOAD ENGINE
  // -------------------------------------------------------------

  async getMemberWorkload(studioId: string, memberId: string): Promise<ITeamWorkloadSummaryDTO> {
    const db = this.getDb();
    const member = await db.studioMembership.findFirst({
      where: { id: memberId, studio_id: studioId },
      include: { user: true },
    });

    if (!member) {
      throw new Error(`Member ${memberId} not found in studio ${studioId}`);
    }

    const userId = member.user_id;

    // Fetch tasks
    const tasks = await db.operationTask.findMany({
      where: { studio_id: studioId, assigned_user_id: userId },
    });

    const openTasks = tasks.filter((t: any) => t.status !== 'DONE' && t.status !== 'CANCELLED');
    const now = new Date();
    const overdueTasks = openTasks.filter((t: any) => t.due_date && new Date(t.due_date) < now);

    // Fetch active projects
    const projects = await db.operationProject.findMany({
      where: { studio_id: studioId, lead_id: userId },
    });

    // Fetch upcoming shoots
    const shoots = await db.shootSession.findMany({
      where: { studio_id: studioId, lead_photographer_id: userId },
    });

    // Fetch equipment
    const eq = await db.equipmentItem.findMany({
      where: { studio_id: studioId, assigned_user_id: userId },
    });

    // Deterministic workload score formula
    const rawScore =
      openTasks.length * 10 +
      overdueTasks.length * 20 +
      projects.length * 15 +
      shoots.length * 25 +
      eq.length * 5;

    const workloadScore = Math.min(Math.max(rawScore, 0), 100);

    let state: TeamWorkloadStateType = 'AVAILABLE';
    if (workloadScore >= 80) state = 'OVERLOADED';
    else if (workloadScore >= 55) state = 'HEAVY';
    else if (workloadScore >= 25) state = 'NORMAL';
    else if (workloadScore > 0) state = 'LIGHT';

    const u = member.user || { name: 'Member' };

    return {
      member_id: member.id,
      user_id: userId,
      studio_id: studioId,
      member_name: u.name,
      role: member.role,
      department: member.department || null,
      open_tasks_count: openTasks.length,
      overdue_tasks_count: overdueTasks.length,
      active_projects_count: projects.length,
      upcoming_shoots_count: shoots.length,
      equipment_assigned_count: eq.length,
      workload_score: workloadScore,
      state,
      workload_state: state,
    };
  }

  async calculateMemberWorkload(studioId: string, memberId: string): Promise<ITeamWorkloadSummaryDTO> {
    return this.getMemberWorkload(studioId, memberId);
  }

  async getWorkloadDashboard(studioId: string): Promise<ITeamWorkloadDashboardDTO> {
    const db = this.getDb();
    const activeMembers = await db.studioMembership.findMany({
      where: { studio_id: studioId, status: 'ACTIVE' },
    });

    const summaries: ITeamWorkloadSummaryDTO[] = [];
    for (const m of activeMembers) {
      const w = await this.getMemberWorkload(studioId, m.id);
      summaries.push(w);
    }

    const totalScore = summaries.reduce((acc, s) => acc + s.workload_score, 0);
    const avgScore = summaries.length > 0 ? Math.round(totalScore / summaries.length) : 0;
    const overloadedCount = summaries.filter((s) => s.state === 'OVERLOADED').length;

    return {
      studio_id: studioId,
      total_active_members: summaries.length,
      average_workload_score: avgScore,
      overloaded_members_count: overloadedCount,
      members: summaries,
    };
  }

  async getTeamWorkloadDashboard(studioId: string): Promise<ITeamWorkloadDashboardDTO> {
    return this.getWorkloadDashboard(studioId);
  }

  // -------------------------------------------------------------
  // 6. AVAILABILITY, LEAVES & CONFLICTS
  // -------------------------------------------------------------

  async listLeaves(
    studioId: string,
    queryOrMemberId?: any
  ): Promise<IMemberLeaveDTO[]> {
    const db = this.getDb();
    const where: any = { studio_id: studioId };
    if (typeof queryOrMemberId === 'string') {
      where.membership_id = queryOrMemberId;
    } else if (queryOrMemberId?.member_id) {
      where.membership_id = queryOrMemberId.member_id;
    }

    const leaves = await db.studioMemberLeave.findMany({
      where,
      orderBy: { start_date: 'asc' },
    });

    return leaves.map((l: any) => ({
      id: l.id,
      studio_id: l.studio_id,
      membership_id: l.membership_id,
      leave_type: l.leave_type,
      start_date: new Date(l.start_date).toISOString(),
      end_date: new Date(l.end_date).toISOString(),
      reason: l.reason || null,
      created_at: new Date(l.created_at).toISOString(),
    }));
  }

  async createLeave(
    studioId: string,
    actorUserIdOrDto: any,
    dto?: ICreateMemberLeaveDTO
  ): Promise<IMemberLeaveDTO> {
    const db = this.getDb();
    const payload = typeof actorUserIdOrDto === 'object' ? actorUserIdOrDto : dto;
    const actorId = typeof actorUserIdOrDto === 'string' ? actorUserIdOrDto : 'system';

    const created = await db.studioMemberLeave.create({
      data: {
        studio_id: studioId,
        membership_id: payload.member_id || payload.membership_id,
        leave_type: payload.leave_type || 'LEAVE',
        start_date: new Date(payload.start_date),
        end_date: new Date(payload.end_date),
        reason: payload.reason || null,
      },
    });

    await this.logActivity(
      studioId,
      'LEAVE_RECORDED',
      'Leave schedule recorded',
      `Leave recorded for member ${payload.member_id}`,
      payload.member_id,
      actorId
    );

    return {
      id: created.id,
      studio_id: created.studio_id,
      membership_id: created.membership_id,
      leave_type: created.leave_type,
      start_date: new Date(created.start_date).toISOString(),
      end_date: new Date(created.end_date).toISOString(),
      reason: created.reason || null,
      created_at: new Date(created.created_at).toISOString(),
    };
  }

  async recordLeave(
    studioId: string,
    actorUserIdOrDto: any,
    dto?: ICreateMemberLeaveDTO
  ): Promise<IMemberLeaveDTO> {
    return this.createLeave(studioId, actorUserIdOrDto, dto);
  }

  async deleteLeave(
    studioId: string,
    actorUserIdOrLeaveId: string,
    leaveId?: string
  ): Promise<{ success: boolean }> {
    const db = this.getDb();
    const targetId = leaveId || actorUserIdOrLeaveId;
    await db.studioMemberLeave.delete({ where: { id: targetId } });
    return { success: true };
  }

  async checkScheduleConflict(
    studioId: string,
    dto: IScheduleConflictCheckDTO
  ): Promise<IScheduleConflictResultDTO> {
    const db = this.getDb();
    const member = await db.studioMembership.findFirst({
      where: { id: dto.member_id, studio_id: studioId },
    });

    if (!member) {
      throw new Error(`Member ${dto.member_id} not found`);
    }

    const start = new Date(dto.start_time);
    const end = new Date(dto.end_time);
    const reasons: string[] = [];

    // 1. Check leave overlap
    const leaves = await db.studioMemberLeave.findMany({
      where: { studio_id: studioId, membership_id: dto.member_id },
    });

    for (const l of leaves) {
      const lStart = new Date(l.start_date);
      const lEnd = new Date(l.end_date);
      if (start <= lEnd && end >= lStart) {
        reasons.push(`Member is on scheduled ${l.leave_type} (${l.reason || 'Time-off'}) from ${lStart.toLocaleDateString()} to ${lEnd.toLocaleDateString()}`);
      }
    }

    // 2. Check shoot sessions double-booking
    const shoots = await db.shootSession.findMany({
      where: { studio_id: studioId, lead_photographer_id: member.user_id },
    });

    for (const s of shoots) {
      if (s.start_time && s.end_time) {
        const sStart = new Date(s.start_time);
        const sEnd = new Date(s.end_time);
        if (start < sEnd && end > sStart) {
          reasons.push(`Shoot session conflict with "${s.title || 'Scheduled Shoot'}"`);
        }
      }
    }

    return {
      member_id: dto.member_id,
      has_conflict: reasons.length > 0,
      reasons,
    };
  }

  // -------------------------------------------------------------
  // 7. ASSIGNMENTS & REASSIGNMENT ENGINE
  // -------------------------------------------------------------

  async bulkAssignTasks(
    studioId: string,
    actorUserIdOrDto: any,
    dto?: IBulkTaskAssignDTO
  ): Promise<{ success: boolean; reassigned_count: number }> {
    const db = this.getDb();
    const payload = typeof actorUserIdOrDto === 'object' ? actorUserIdOrDto : dto;
    const actorId = typeof actorUserIdOrDto === 'string' ? actorUserIdOrDto : 'system';

    const targetMember = await db.studioMembership.findFirst({
      where: { id: payload.target_member_id, studio_id: studioId },
    });

    if (!targetMember) {
      throw new Error(`Target member ${payload.target_member_id} not found`);
    }

    const result = await db.operationTask.updateMany({
      where: {
        studio_id: studioId,
        id: { in: payload.task_ids },
      },
      data: {
        assigned_user_id: targetMember.user_id,
      },
    });

    await this.logActivity(
      studioId,
      'TASKS_REASSIGNED',
      'Tasks bulk reassigned',
      `Reassigned ${result.count} tasks to member ${payload.target_member_id}`,
      payload.target_member_id,
      actorId
    );

    return { success: true, reassigned_count: result.count };
  }

  async getReassignmentPlan(
    studioId: string,
    memberId: string
  ): Promise<IMemberReassignmentPlanDTO> {
    const db = this.getDb();
    const member = await db.studioMembership.findFirst({
      where: { id: memberId, studio_id: studioId },
      include: { user: true },
    });

    if (!member) {
      throw new Error(`Member ${memberId} not found in studio ${studioId}`);
    }

    const userId = member.user_id;

    const [tasks, projects, shoots, eq, clients] = await Promise.all([
      db.operationTask.findMany({ where: { studio_id: studioId, assigned_user_id: userId } }),
      db.operationProject.findMany({ where: { studio_id: studioId, lead_id: userId } }),
      db.shootSession.findMany({ where: { studio_id: studioId, lead_photographer_id: userId } }),
      db.equipmentItem.findMany({ where: { studio_id: studioId, assigned_user_id: userId } }),
      db.client.findMany({ where: { studio_id: studioId, assigned_user_id: userId } }),
    ]);

    const u = member.user || { name: 'Member' };

    return {
      source_member_id: member.id,
      user_id: userId,
      studio_id: studioId,
      member_name: u.name,
      tasks: tasks.map((t: any) => ({
        id: t.id,
        title: t.title,
        status: t.status,
        due_date: t.due_date ? new Date(t.due_date).toISOString() : null,
        priority: t.priority || 'MEDIUM',
      })),
      projects: projects.map((p: any) => ({
        id: p.id,
        name: p.name,
        status: p.status,
      })),
      shoot_crew_assignments: shoots.map((s: any) => ({
        id: s.id,
        shoot_title: s.title,
        shoot_date: s.start_time ? new Date(s.start_time).toISOString() : null,
        crew_role: 'Lead Photographer',
      })),
      equipment_assignments: eq.map((e: any) => ({
        id: e.id,
        item_name: e.item_name,
        category: e.category,
      })),
      assigned_clients: clients.map((c: any) => ({
        id: c.id,
        client_name: c.name,
        company: c.company || null,
      })),
    };
  }

  async executeReassignment(
    studioId: string,
    actorUserIdOrDto: any,
    dto?: IMemberReassignmentExecuteDTO
  ): Promise<{
    success: boolean;
    tasks_transferred: number;
    projects_transferred: number;
    shoots_transferred: number;
    equipment_transferred: number;
    clients_transferred: number;
  }> {
    const db = this.getDb();
    const payload = typeof actorUserIdOrDto === 'object' ? actorUserIdOrDto : dto;
    const actorId = typeof actorUserIdOrDto === 'string' ? actorUserIdOrDto : 'system';

    if (payload.source_member_id === payload.target_member_id) {
      throw new Error('Source and target member cannot be the same');
    }

    const [sourceMember, targetMember] = await Promise.all([
      db.studioMembership.findFirst({ where: { id: payload.source_member_id, studio_id: studioId } }),
      db.studioMembership.findFirst({ where: { id: payload.target_member_id, studio_id: studioId } }),
    ]);

    if (!sourceMember) throw new Error(`Source member ${payload.source_member_id} not found in studio ${studioId}`);
    if (!targetMember) throw new Error(`Target member ${payload.target_member_id} not found in studio ${studioId}`);

    const sourceUserId = sourceMember.user_id;
    const targetUserId = targetMember.user_id;

    let tasksCount = 0;
    let projectsCount = 0;
    let shootsCount = 0;
    let eqCount = 0;
    let clientsCount = 0;

    if (payload.transfer_tasks !== false) {
      const res = await db.operationTask.updateMany({
        where: { studio_id: studioId, assigned_user_id: sourceUserId },
        data: { assigned_user_id: targetUserId },
      });
      tasksCount = res.count;
    }

    if (payload.transfer_projects !== false) {
      const res = await db.operationProject.updateMany({
        where: { studio_id: studioId, lead_id: sourceUserId },
        data: { lead_id: targetUserId },
      });
      projectsCount = res.count;
    }

    if (payload.transfer_shoots !== false) {
      const res = await db.shootSession.updateMany({
        where: { studio_id: studioId, lead_photographer_id: sourceUserId },
        data: { lead_photographer_id: targetUserId },
      });
      shootsCount = res.count;
    }

    if (payload.transfer_equipment !== false) {
      const res = await db.equipmentItem.updateMany({
        where: { studio_id: studioId, assigned_user_id: sourceUserId },
        data: { assigned_user_id: targetUserId },
      });
      eqCount = res.count;
    }

    if (payload.transfer_clients !== false) {
      const res = await db.client.updateMany({
        where: { studio_id: studioId, assigned_user_id: sourceUserId },
        data: { assigned_user_id: targetUserId },
      });
      clientsCount = res.count;
    }

    await this.logActivity(
      studioId,
      'WORKFORCE_REASSIGNED',
      'Workforce assignments transferred',
      `Transferred assignments from ${payload.source_member_id} to ${payload.target_member_id}`,
      payload.target_member_id,
      actorId
    );

    return {
      success: true,
      tasks_transferred: tasksCount,
      projects_transferred: projectsCount,
      shoots_transferred: shootsCount,
      equipment_transferred: eqCount,
      clients_transferred: clientsCount,
    };
  }

  // -------------------------------------------------------------
  // 8. AGGREGATED INTERNAL CALENDAR
  // -------------------------------------------------------------

  async getTeamCalendar(
    studioId: string,
    query: {
      start_date: string;
      end_date: string;
      member_ids?: string[];
      department?: string;
      event_types?: string[];
    }
  ): Promise<ITeamCalendarEventDTO[]> {
    const db = this.getDb();
    const start = new Date(query.start_date);
    const end = new Date(query.end_date);
    const events: ITeamCalendarEventDTO[] = [];

    const memberships = await db.studioMembership.findMany({
      where: { studio_id: studioId },
      include: { user: true },
    });

    const memberMap = new Map(memberships.map((m: any) => [m.user_id, m]));

    // 1. Shoot sessions
    if (!query.event_types || query.event_types.includes('SHOOT')) {
      const shoots = await db.shootSession.findMany({
        where: { studio_id: studioId },
      });

      for (const s of shoots) {
        if (s.start_time && s.end_time) {
          const sStart = new Date(s.start_time);
          const sEnd = new Date(s.end_time);
          if (sStart <= end && sEnd >= start) {
            const mem = memberMap.get(s.lead_photographer_id);
            events.push({
              id: `evt_sht_${s.id}`,
              studio_id: studioId,
              event_type: 'SHOOT',
              title: s.title || 'Shoot Session',
              start_time: sStart.toISOString(),
              end_time: sEnd.toISOString(),
              member_id: mem?.id || s.lead_photographer_id,
              member_name: mem?.user?.name || 'Staff Photographer',
              department: mem?.department || null,
              source_id: s.id,
            });
          }
        }
      }
    }

    // 2. Member Leaves
    if (!query.event_types || query.event_types.includes('LEAVE')) {
      const leaves = await db.studioMemberLeave.findMany({
        where: { studio_id: studioId },
      });

      for (const l of leaves) {
        const lStart = new Date(l.start_date);
        const lEnd = new Date(l.end_date);
        if (lStart <= end && lEnd >= start) {
          const mem = memberships.find((m: any) => m.id === l.membership_id);
          events.push({
            id: `evt_lv_${l.id}`,
            studio_id: studioId,
            event_type: 'LEAVE',
            title: `Time-off (${l.leave_type})`,
            start_time: lStart.toISOString(),
            end_date: lEnd.toISOString(),
            end_time: lEnd.toISOString(),
            member_id: l.membership_id,
            member_name: mem?.user?.name || 'Staff Member',
            department: mem?.department || null,
            source_id: l.id,
          });
        }
      }
    }

    // 3. Task deadlines
    if (!query.event_types || query.event_types.includes('TASK_DEADLINE')) {
      const tasks = await db.operationTask.findMany({
        where: { studio_id: studioId },
      });

      for (const t of tasks) {
        if (t.due_date) {
          const tDue = new Date(t.due_date);
          if (tDue <= end && tDue >= start) {
            const mem = memberMap.get(t.assigned_user_id);
            events.push({
              id: `evt_tsk_${t.id}`,
              studio_id: studioId,
              event_type: 'TASK_DEADLINE',
              title: `Task Deadline: ${t.title}`,
              start_time: tDue.toISOString(),
              end_time: tDue.toISOString(),
              member_id: mem?.id || t.assigned_user_id,
              member_name: mem?.user?.name || 'Assigned Staff',
              department: mem?.department || null,
              source_id: t.id,
            });
          }
        }
      }
    }

    return events;
  }

  // -------------------------------------------------------------
  // 9. ACTIVITY & METRICS
  // -------------------------------------------------------------

  async logActivity(
    studioId: string,
    action: string,
    title: string,
    description: string,
    memberId?: string,
    actorUserId?: string
  ): Promise<void> {
    const db = this.getDb();
    await db.studioTeamActivity.create({
      data: {
        studio_id: studioId,
        membership_id: memberId || null,
        action,
        title,
        description,
        actor_user_id: actorUserId || null,
      },
    });
  }

  async listActivities(
    studioId: string,
    query: { member_id?: string; action?: string; limit?: number } = {}
  ): Promise<ITeamActivityDTO[]> {
    const db = this.getDb();
    const where: any = { studio_id: studioId };
    if (query.member_id) where.membership_id = query.member_id;
    if (query.action) where.action = query.action;

    const list = await db.studioTeamActivity.findMany({
      where,
      orderBy: { created_at: 'desc' },
      take: query.limit || 50,
    });

    return list.map((a: any) => ({
      id: a.id,
      studio_id: a.studio_id,
      membership_id: a.membership_id || null,
      actor_user_id: a.actor_user_id || null,
      action: a.action,
      title: a.title,
      description: a.description,
      created_at: new Date(a.created_at).toISOString(),
    }));
  }

  async listActivity(studioId: string, query?: any): Promise<ITeamActivityDTO[]> {
    return this.listActivities(studioId, query);
  }

  async getMetrics(studioId: string): Promise<ITeamMetricsDTO> {
    const db = this.getDb();
    const [allMembers, pendingInvites, departments] = await Promise.all([
      db.studioMembership.findMany({ where: { studio_id: studioId } }),
      db.studioTeamInvitation.count({ where: { studio_id: studioId, status: 'PENDING' } }),
      db.studioDepartment.count({ where: { studio_id: studioId } }),
    ]);

    const active = allMembers.filter((m: any) => m.status === 'ACTIVE').length;
    const invited = allMembers.filter((m: any) => m.status === 'INVITED').length;
    const suspended = allMembers.filter((m: any) => m.status === 'SUSPENDED').length;

    const workload = await this.getWorkloadDashboard(studioId);

    return {
      studio_id: studioId,
      total_members: allMembers.length,
      active_members: active,
      invited_members: invited,
      suspended_members: suspended,
      departments_count: departments,
      pending_invitations: pendingInvites,
      overloaded_members_count: workload.overloaded_members_count,
    };
  }

  async getTeamMetrics(studioId: string): Promise<ITeamMetricsDTO> {
    return this.getMetrics(studioId);
  }

  // -------------------------------------------------------------
  // 10. CSV EXPORT & FORMULA INJECTION DEFENSE
  // -------------------------------------------------------------

  async exportMembersCSV(studioId: string): Promise<string> {
    const db = this.getDb();
    const memberships = await db.studioMembership.findMany({
      where: { studio_id: studioId },
      include: { user: true },
    });

    const headers = ['Member ID', 'Name', 'Email', 'Role', 'Department', 'Title', 'Status', 'Skills', 'Timezone', 'Bio'];
    const rows = memberships.map((m: any) => {
      const u = m.user || { name: 'Staff', email: 'staff@studio.com' };
      return [
        StudioTeamService.sanitizeCSVField(m.id),
        StudioTeamService.sanitizeCSVField(u.name),
        StudioTeamService.sanitizeCSVField(u.email),
        StudioTeamService.sanitizeCSVField(m.role),
        StudioTeamService.sanitizeCSVField(m.department || ''),
        StudioTeamService.sanitizeCSVField(m.title || ''),
        StudioTeamService.sanitizeCSVField(m.status || 'ACTIVE'),
        StudioTeamService.sanitizeCSVField((m.skills || []).join('; ')),
        StudioTeamService.sanitizeCSVField(m.timezone || 'UTC'),
        StudioTeamService.sanitizeCSVField(m.bio || ''),
      ].join(',');
    });

    return [headers.join(','), ...rows].join('\n');
  }

  async exportTeamCSV(studioId: string): Promise<string> {
    return this.exportMembersCSV(studioId);
  }
}
