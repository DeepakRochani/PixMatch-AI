import { prisma } from '@pixmatch/database';
import {
  CreateCrewAssignmentDTO,
  ProjectCrewAssignmentDTO,
  ResourceType,
} from '@pixmatch/types';

export class CrewAssignmentService {
  /**
   * Assign a crew member / resource to a project production or session
   */
  static async assignCrewMember(
    studioId: string,
    projectId: string,
    dto: CreateCrewAssignmentDTO
  ): Promise<ProjectCrewAssignmentDTO> {
    const resource = await prisma.studioResource.findFirst({
      where: { id: dto.resource_id, studio_id: studioId },
    });
    if (!resource) {
      throw new Error(`Studio resource not found: ${dto.resource_id}`);
    }

    let notes = dto.notes || null;

    // Check potential conflicts if shoot session is provided
    if (dto.shoot_session_id) {
      const session = await prisma.projectShootSession.findFirst({
        where: { id: dto.shoot_session_id, studio_id: studioId },
      });

      if (session) {
        const conflictingAssignment = await prisma.projectCrewAssignment.findFirst({
          where: {
            resource_id: dto.resource_id,
            studio_id: studioId,
            project_id: { not: projectId },
            shoot_session: {
              start_at: { lte: session.end_at },
              end_at: { gte: session.start_at },
            },
          },
        });

        if (conflictingAssignment) {
          notes = `${notes ? notes + ' | ' : ''}Warning: Potential resource scheduling conflict detected for this time window.`;
        }
      }
    }

    const assignment = await prisma.projectCrewAssignment.create({
      data: {
        studio_id: studioId,
        project_id: projectId,
        shoot_session_id: dto.shoot_session_id || null,
        resource_id: dto.resource_id,
        role: dto.role,
        status: dto.status || 'CONFIRMED',
        notes,
      },
      include: {
        resource: true,
      },
    });

    return assignment as unknown as ProjectCrewAssignmentDTO;
  }

  /**
   * Update an existing crew assignment
   */
  static async updateAssignment(
    studioId: string,
    assignmentId: string,
    dto: Partial<CreateCrewAssignmentDTO>
  ): Promise<ProjectCrewAssignmentDTO> {
    const assignment = await prisma.projectCrewAssignment.findFirst({
      where: { id: assignmentId, studio_id: studioId },
    });

    if (!assignment) {
      throw new Error(`Crew assignment not found: ${assignmentId}`);
    }

    const updated = await prisma.projectCrewAssignment.update({
      where: { id: assignmentId },
      data: {
        role: dto.role !== undefined ? dto.role : assignment.role,
        status: dto.status !== undefined ? dto.status : assignment.status,
        notes: dto.notes !== undefined ? dto.notes : assignment.notes,
        shoot_session_id: dto.shoot_session_id !== undefined ? dto.shoot_session_id : assignment.shoot_session_id,
        resource_id: dto.resource_id !== undefined ? dto.resource_id : assignment.resource_id,
        updated_at: new Date(),
      },
      include: {
        resource: true,
      },
    });

    return updated as unknown as ProjectCrewAssignmentDTO;
  }

  /**
   * Get all crew assignments for a project
   */
  static async getCrewAssignments(
    studioId: string,
    projectId: string
  ): Promise<ProjectCrewAssignmentDTO[]> {
    const crew = await prisma.projectCrewAssignment.findMany({
      where: { project_id: projectId, studio_id: studioId },
      include: {
        resource: true,
      },
      orderBy: { created_at: 'asc' },
    });

    return crew as unknown as ProjectCrewAssignmentDTO[];
  }

  /**
   * Remove a crew assignment
   */
  static async removeCrewMember(studioId: string, assignmentId: string): Promise<boolean> {
    const assignment = await prisma.projectCrewAssignment.findFirst({
      where: { id: assignmentId, studio_id: studioId },
    });

    if (!assignment) {
      throw new Error(`Crew assignment not found: ${assignmentId}`);
    }

    await prisma.projectCrewAssignment.delete({
      where: { id: assignmentId },
    });

    return true;
  }

  /**
   * Alias for updateAssignment
   */
  static async updateCrewAssignment(
    studioId: string,
    assignmentId: string,
    dto: Partial<CreateCrewAssignmentDTO>
  ): Promise<ProjectCrewAssignmentDTO> {
    return this.updateAssignment(studioId, assignmentId, dto);
  }
}
