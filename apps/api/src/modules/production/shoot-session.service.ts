import { prisma } from '@pixmatch/database';
import {
  CreateShootSessionDTO,
  UpdateShootSessionDTO,
  ProjectShootSessionDTO,
  ShootType,
  CalendarEventStatus,
} from '@pixmatch/types';

export class ShootSessionService {
  /**
   * Create a new shoot session for a project production
   */
  static async createSession(
    studioId: string,
    projectId: string,
    dto: CreateShootSessionDTO
  ): Promise<ProjectShootSessionDTO> {
    const start = new Date(dto.start_at);
    const end = new Date(dto.end_at);
    if (isNaN(start.getTime()) || isNaN(end.getTime()) || end.getTime() <= start.getTime()) {
      throw new Error('Shoot session end time must be strictly after start time');
    }

    let production = await prisma.projectProduction.findFirst({
      where: { project_id: projectId, studio_id: studioId },
    });

    if (!production) {
      production = await prisma.projectProduction.create({
        data: {
          studio_id: studioId,
          project_id: projectId,
          production_stage: 'PRE_PRODUCTION',
          shoot_type: dto.shoot_type || ShootType.OTHER,
          shoot_start_at: new Date(dto.start_at),
          shoot_end_at: new Date(dto.end_at),
        },
      });
    }

    let calendarEventId: string | null = null;
    if (dto.create_calendar_event !== false) {
      const calEvent = await prisma.studioCalendarEvent.create({
        data: {
          studio_id: studioId,
          project_id: projectId,
          title: dto.title || `${dto.shoot_type || 'Shoot'} - ${projectId}`,
          start_at: new Date(dto.start_at),
          end_at: new Date(dto.end_at),
          event_type: 'SHOOT',
          status: 'CONFIRMED',
          location: dto.location || null,
        },
      });
      calendarEventId = calEvent.id;
    }

    const session = await prisma.projectShootSession.create({
      data: {
        studio_id: studioId,
        project_id: projectId,
        production_id: production.id,
        calendar_event_id: calendarEventId,
        title: dto.title,
        shoot_type: dto.shoot_type || ShootType.OTHER,
        start_at: new Date(dto.start_at),
        end_at: new Date(dto.end_at),
        timezone: dto.timezone || 'UTC',
        location: dto.location || null,
        location_details: dto.location_details || null,
        primary_photographer_resource_id: dto.primary_photographer_resource_id || null,
        notes: dto.notes || null,
        weather_notes: dto.weather_notes || null,
        parking_notes: dto.parking_notes || null,
        travel_time_minutes: dto.travel_time_minutes || null,
        status: CalendarEventStatus.CONFIRMED,
      },
    });

    await this.syncProductionShootDate(production.id);

    return session as unknown as ProjectShootSessionDTO;
  }

  /**
   * Update an existing shoot session
   */
  static async updateSession(
    studioId: string,
    sessionId: string,
    dto: UpdateShootSessionDTO
  ): Promise<ProjectShootSessionDTO> {
    const session = await prisma.projectShootSession.findFirst({
      where: { id: sessionId, studio_id: studioId },
    });

    if (!session) {
      throw new Error(`Shoot session not found: ${sessionId}`);
    }

    const updated = await prisma.projectShootSession.update({
      where: { id: sessionId },
      data: {
        title: dto.title !== undefined ? dto.title : session.title,
        shoot_type: dto.shoot_type || session.shoot_type,
        start_at: dto.start_at ? new Date(dto.start_at) : session.start_at,
        end_at: dto.end_at ? new Date(dto.end_at) : session.end_at,
        timezone: dto.timezone || session.timezone,
        location: dto.location !== undefined ? dto.location : session.location,
        location_details: dto.location_details !== undefined ? dto.location_details : session.location_details,
        status: dto.status || session.status,
        primary_photographer_resource_id:
          dto.primary_photographer_resource_id !== undefined
            ? dto.primary_photographer_resource_id
            : session.primary_photographer_resource_id,
        notes: dto.notes !== undefined ? dto.notes : session.notes,
        weather_notes: dto.weather_notes !== undefined ? dto.weather_notes : session.weather_notes,
        parking_notes: dto.parking_notes !== undefined ? dto.parking_notes : session.parking_notes,
        travel_time_minutes: dto.travel_time_minutes !== undefined ? dto.travel_time_minutes : session.travel_time_minutes,
        updated_at: new Date(),
      },
    });

    await this.syncProductionShootDate(session.production_id);

    return updated as unknown as ProjectShootSessionDTO;
  }

  /**
   * Get all sessions for a project
   */
  static async getSessions(
    studioId: string,
    projectId: string
  ): Promise<ProjectShootSessionDTO[]> {
    const sessions = await prisma.projectShootSession.findMany({
      where: { project_id: projectId, studio_id: studioId },
      include: {
        crew_assignments: {
          include: { resource: true },
        },
        equipment_checklists: {
          include: { assigned_resource: true },
        },
      },
      orderBy: { start_at: 'asc' },
    });

    return sessions as unknown as ProjectShootSessionDTO[];
  }

  /**
   * Delete a shoot session
   */
  static async deleteSession(studioId: string, sessionId: string): Promise<boolean> {
    const session = await prisma.projectShootSession.findFirst({
      where: { id: sessionId, studio_id: studioId },
    });

    if (!session) {
      throw new Error(`Shoot session not found: ${sessionId}`);
    }

    await prisma.projectShootSession.delete({
      where: { id: sessionId },
    });

    await this.syncProductionShootDate(session.production_id);
    return true;
  }

  private static async syncProductionShootDate(productionId: string) {
    const sessions = await prisma.projectShootSession.findMany({
      where: { production_id: productionId },
      orderBy: { start_at: 'asc' },
    });

    if (sessions.length > 0) {
      await prisma.projectProduction.update({
        where: { id: productionId },
        data: {
          shoot_start_at: sessions[0].start_at,
          shoot_end_at: sessions[sessions.length - 1].end_at,
          updated_at: new Date(),
        },
      });
    }
  }
}
