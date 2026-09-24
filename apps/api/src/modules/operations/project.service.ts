/**
 * Project Service — PixMatch AI Phase 20
 * Comprehensive studio project lifecycle management, timeline generation, multi-gallery linking, and Phase 18 payment integration.
 */

import { prisma } from '@pixmatch/database';
import {
  StudioProjectStatus,
  StudioProjectType,
  StudioProjectDTO,
  CreateStudioProjectDTO,
  UpdateStudioProjectDTO,
  ProjectTimelineDTO,
  ProjectPaymentDTO,
  ProjectNoteDTO,
  CreateProjectNoteDTO,
} from '@pixmatch/types';

export class ProjectService {
  /**
   * Helper: Sanitize text inputs
   */
  private static sanitizeText(str?: string | null): string | null {
    if (!str) return str || null;
    let sanitized = str.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
    if (/^[=+@\-\t\r]/.test(sanitized)) {
      sanitized = `'${sanitized}`;
    }
    return sanitized.trim();
  }

  /**
   * List studio projects with rich filtering and pagination
   */
  static async listProjects(
    studioId: string,
    params: {
      status?: StudioProjectStatus;
      project_type?: StudioProjectType;
      client_id?: string;
      search?: string;
      from_date?: string | Date;
      to_date?: string | Date;
      page?: number;
      limit?: number;
      sortBy?: 'created_at' | 'shoot_date' | 'start_date' | 'name';
      sortOrder?: 'asc' | 'desc';
    } = {}
  ): Promise<{ projects: StudioProjectDTO[]; total: number; page: number; limit: number }> {
    const page = Math.max(1, params.page || 1);
    const limit = Math.min(100, Math.max(1, params.limit || 50));
    const skip = (page - 1) * limit;

    const where: any = {
      studio_id: studioId,
      deleted_at: null,
    };

    if (params.status) {
      where.status = params.status;
    }

    if (params.project_type) {
      where.project_type = params.project_type;
    }

    if (params.client_id) {
      where.client_id = params.client_id;
    }

    if (params.from_date || params.to_date) {
      where.OR = [
        {
          shoot_date: {
            gte: params.from_date ? new Date(params.from_date) : undefined,
            lte: params.to_date ? new Date(params.to_date) : undefined,
          },
        },
        {
          start_date: {
            gte: params.from_date ? new Date(params.from_date) : undefined,
            lte: params.to_date ? new Date(params.to_date) : undefined,
          },
        },
      ];
    }

    if (params.search) {
      where.OR = [
        { name: { contains: params.search, mode: 'insensitive' } },
        { client: { name: { contains: params.search, mode: 'insensitive' } } },
        { client: { email: { contains: params.search, mode: 'insensitive' } } },
        { location: { contains: params.search, mode: 'insensitive' } },
      ];
    }

    const orderBy: any = {};
    const sortField = params.sortBy || 'created_at';
    const sortOrder = params.sortOrder || 'desc';
    orderBy[sortField] = sortOrder;

    const [projects, total] = await Promise.all([
      prisma.studioProject.findMany({
        where,
        skip,
        take: limit,
        orderBy,
        include: {
          client: {
            select: { id: true, name: true, email: true, phone: true },
          },
          tasks: {
            select: { id: true, status: true },
          },
          milestones: {
            select: { id: true, status: true },
          },
          galleries: {
            select: { id: true },
          },
          transactions: {
            where: { is_void: false, transaction_type: 'INCOME' },
            select: { amount: true },
          },
        },
      }),
      prisma.studioProject.count({ where }),
    ]);

    const mapped: StudioProjectDTO[] = projects.map((p: any) => {
      const actualRevenue = (p.transactions || []).reduce((sum: number, t: any) => sum + (t.amount || 0), 0);
      const tasksCount = p.tasks?.length || 0;
      const tasksCompleted = p.tasks?.filter((t: any) => t.status === 'COMPLETED').length || 0;
      const milestonesCount = p.milestones?.length || 0;
      const milestonesCompleted = p.milestones?.filter((m: any) => m.status === 'COMPLETED').length || 0;
      const galleriesCount = p.galleries?.length || 0;

      let paymentStatus: 'PAID' | 'PARTIAL' | 'PENDING' | 'OVERDUE' | 'INCOMPLETE' = 'PENDING';
      const targetVal = p.estimated_value || 0;

      if (targetVal > 0 && actualRevenue >= targetVal) {
        paymentStatus = 'PAID';
      } else if (actualRevenue > 0) {
        paymentStatus = 'PARTIAL';
      } else if (p.payment_due_date && new Date(p.payment_due_date) < new Date()) {
        paymentStatus = 'OVERDUE';
      } else if (targetVal <= 0 && actualRevenue === 0) {
        paymentStatus = 'PENDING';
      }

      return {
        id: p.id,
        studio_id: p.studio_id,
        client_id: p.client_id,
        client_name: p.client?.name || null,
        client_email: p.client?.email || null,
        client_phone: p.client?.phone || null,
        lead_id: p.lead_id,
        name: p.name,
        project_type: p.project_type as any,
        status: p.status as any,
        start_date: p.start_date,
        end_date: p.end_date,
        shoot_date: p.shoot_date,
        location: p.location,
        description: p.description,
        estimated_value: p.estimated_value,
        currency: p.currency || 'INR',
        actual_revenue: actualRevenue,
        primary_photographer_id: p.primary_photographer_id,
        payment_due_date: p.payment_due_date,
        payment_status: paymentStatus,
        tasks_count: tasksCount,
        tasks_completed_count: tasksCompleted,
        milestones_count: milestonesCount,
        milestones_completed_count: milestonesCompleted,
        galleries_count: galleriesCount,
        created_at: p.created_at,
        updated_at: p.updated_at,

        // CamelCase aliases
        studioId: p.studio_id,
        clientId: p.client_id,
        clientName: p.client?.name || null,
        clientEmail: p.client?.email || null,
        clientPhone: p.client?.phone || null,
        leadId: p.lead_id,
        projectType: p.project_type as any,
        startDate: p.start_date,
        endDate: p.end_date,
        shootDate: p.shoot_date,
        estimatedValue: p.estimated_value,
        actualRevenue,
        primaryPhotographerId: p.primary_photographer_id,
        paymentDueDate: p.payment_due_date,
        paymentStatus,
        tasksCount,
        tasksCompletedCount: tasksCompleted,
        milestonesCount,
        milestonesCompletedCount: milestonesCompleted,
        galleriesCount,
        createdAt: p.created_at,
        updatedAt: p.updated_at,
      };
    });

    return { projects: mapped, total, page, limit };
  }

  /**
   * Get project detail with full relationships
   */
  static async getProject(studioId: string, projectId: string): Promise<StudioProjectDTO & { client: any; tasks: any[]; milestones: any[]; galleries: any[]; notes: any[]; transactions: any[] }> {
    const p: any = await prisma.studioProject.findFirst({
      where: { id: projectId, studio_id: studioId, deleted_at: null },
      include: {
        client: true,
        lead: true,
        tasks: {
          orderBy: [{ status: 'asc' }, { due_at: 'asc' }],
        },
        milestones: {
          orderBy: { order_index: 'asc' },
        },
        galleries: {
          include: {
            gallery: {
              select: {
                id: true,
                title: true,
                slug: true,
                status: true,
                cover_photo_url: true,
                created_at: true,
                _count: {
                  select: { photos: true },
                },
              },
            },
          },
        },
        notes: {
          orderBy: [{ is_pinned: 'desc' }, { created_at: 'desc' }],
        },
        transactions: {
          where: { is_void: false },
          orderBy: { transaction_date: 'desc' },
        },
      },
    });

    if (!p) {
      throw new Error('Project not found or unauthorized');
    }

    const actualRevenue = (p.transactions || [])
      .filter((t: any) => t.transaction_type === 'INCOME')
      .reduce((sum: number, t: any) => sum + (t.amount || 0), 0);

    const tasksCount = p.tasks?.length || 0;
    const tasksCompleted = p.tasks?.filter((t: any) => t.status === 'COMPLETED').length || 0;
    const milestonesCount = p.milestones?.length || 0;
    const milestonesCompleted = p.milestones?.filter((m: any) => m.status === 'COMPLETED').length || 0;
    const galleriesCount = p.galleries?.length || 0;

    let paymentStatus: 'PAID' | 'PARTIAL' | 'PENDING' | 'OVERDUE' | 'INCOMPLETE' = 'PENDING';
    const targetVal = p.estimated_value || 0;

    if (targetVal > 0 && actualRevenue >= targetVal) {
      paymentStatus = 'PAID';
    } else if (actualRevenue > 0) {
      paymentStatus = 'PARTIAL';
    } else if (p.payment_due_date && new Date(p.payment_due_date) < new Date()) {
      paymentStatus = 'OVERDUE';
    }

    return {
      id: p.id,
      studio_id: p.studio_id,
      client_id: p.client_id,
      client_name: p.client?.name || null,
      client_email: p.client?.email || null,
      client_phone: p.client?.phone || null,
      lead_id: p.lead_id,
      name: p.name,
      project_type: p.project_type as any,
      status: p.status as any,
      start_date: p.start_date,
      end_date: p.end_date,
      shoot_date: p.shoot_date,
      location: p.location,
      description: p.description,
      estimated_value: p.estimated_value,
      currency: p.currency || 'INR',
      actual_revenue: actualRevenue,
      primary_photographer_id: p.primary_photographer_id,
      payment_due_date: p.payment_due_date,
      payment_status: paymentStatus,
      tasks_count: tasksCount,
      tasks_completed_count: tasksCompleted,
      milestones_count: milestonesCount,
      milestones_completed_count: milestonesCompleted,
      galleries_count: galleriesCount,
      created_at: p.created_at,
      updated_at: p.updated_at,

      // CamelCase aliases
      studioId: p.studio_id,
      clientId: p.client_id,
      clientName: p.client?.name || null,
      clientEmail: p.client?.email || null,
      clientPhone: p.client?.phone || null,
      leadId: p.lead_id,
      projectType: p.project_type as any,
      startDate: p.start_date,
      endDate: p.end_date,
      shootDate: p.shoot_date,
      estimatedValue: p.estimated_value,
      actualRevenue,
      primaryPhotographerId: p.primary_photographer_id,
      paymentDueDate: p.payment_due_date,
      paymentStatus,
      tasksCount,
      tasksCompletedCount: tasksCompleted,
      milestonesCount,
      milestonesCompletedCount: milestonesCompleted,
      galleriesCount,
      createdAt: p.created_at,
      updatedAt: p.updated_at,

      // Nested items
      client: p.client,
      tasks: p.tasks || [],
      milestones: p.milestones || [],
      galleries: (p.galleries || []).map((g: any) => ({
        id: g.id,
        gallery_id: g.gallery_id,
        role: g.role,
        gallery: g.gallery,
      })),
      notes: p.notes || [],
      transactions: p.transactions || [],
    };
  }

  /**
   * Create new studio project
   */
  static async createProject(studioId: string, dto: CreateStudioProjectDTO, userId?: string): Promise<StudioProjectDTO> {
    if (!dto.name || dto.name.trim().length === 0) {
      throw new Error('Project name is required');
    }

    if (!dto.client_id && !(dto as any).clientId) {
      throw new Error('Client ID is required');
    }

    const clientId = dto.client_id || (dto as any).clientId;
    const client = await prisma.client.findFirst({
      where: { id: clientId, studio_id: studioId, deleted_at: null },
    });

    if (!client) {
      throw new Error('Client not found or unauthorized');
    }

    const name = this.sanitizeText(dto.name)!;
    const projectType = (dto.project_type || (dto as any).projectType || StudioProjectType.OTHER) as StudioProjectType;
    const status = (dto.status || StudioProjectStatus.BOOKED) as StudioProjectStatus;
    const startDate = dto.start_date || (dto as any).startDate ? new Date(dto.start_date || (dto as any).startDate) : new Date();
    const endDate = dto.end_date || (dto as any).endDate ? new Date(dto.end_date || (dto as any).endDate) : null;
    const shootDate = dto.shoot_date || (dto as any).shootDate ? new Date(dto.shoot_date || (dto as any).shootDate) : null;
    const paymentDueDate = dto.payment_due_date || (dto as any).paymentDueDate ? new Date(dto.payment_due_date || (dto as any).paymentDueDate) : null;
    const estimatedValue = dto.estimated_value !== undefined ? dto.estimated_value : (dto as any).estimatedValue;

    const project = await prisma.studioProject.create({
      data: {
        studio_id: studioId,
        client_id: client.id,
        lead_id: dto.lead_id || (dto as any).leadId || null,
        name,
        project_type: projectType,
        status,
        start_date: startDate,
        end_date: endDate,
        shoot_date: shootDate,
        location: this.sanitizeText(dto.location),
        description: this.sanitizeText(dto.description),
        estimated_value: estimatedValue !== undefined && estimatedValue !== null ? Number(estimatedValue) : null,
        currency: dto.currency || 'INR',
        primary_photographer_id: dto.primary_photographer_id || (dto as any).primaryPhotographerId || null,
        payment_due_date: paymentDueDate,
      },
      include: {
        client: {
          select: { id: true, name: true, email: true, phone: true },
        },
      },
    });

    // Create default milestones for new project
    const defaultMilestones = [
      { title: 'Booking Confirmed', order_index: 0, status: 'COMPLETED' },
      { title: 'Advance Payment', order_index: 1, status: 'PENDING' },
      { title: 'Shoot Preparation', order_index: 2, status: 'PENDING' },
      { title: 'Shoot Completed', order_index: 3, status: 'PENDING' },
      { title: 'Photo Processing', order_index: 4, status: 'PENDING' },
      { title: 'Gallery Delivery', order_index: 5, status: 'PENDING' },
      { title: 'Final Payment', order_index: 6, status: 'PENDING' },
    ];

    for (const m of defaultMilestones) {
      await prisma.projectMilestone.create({
        data: {
          studio_id: studioId,
          project_id: project.id,
          title: m.title,
          status: m.status as any,
          order_index: m.order_index,
          completed_at: m.status === 'COMPLETED' ? new Date() : null,
        },
      });
    }

    // Audit log
    await prisma.auditLog.create({
      data: {
        studio_id: studioId,
        user_id: userId || null,
        action: 'PROJECT_CREATED',
        resource_type: 'STUDIO_PROJECT',
        resource_id: project.id,
        metadata: {
          project_id: project.id,
          project_name: project.name,
          client_id: client.id,
        },
      },
    });

    return {
      id: project.id,
      studio_id: project.studio_id,
      client_id: project.client_id,
      client_name: (project as any).client?.name || null,
      client_email: (project as any).client?.email || null,
      client_phone: (project as any).client?.phone || null,
      lead_id: project.lead_id,
      name: project.name,
      project_type: project.project_type as any,
      status: project.status as any,
      start_date: project.start_date,
      end_date: project.end_date,
      shoot_date: project.shoot_date,
      location: project.location,
      description: project.description,
      estimated_value: project.estimated_value,
      currency: project.currency || 'INR',
      actual_revenue: 0,
      primary_photographer_id: project.primary_photographer_id,
      payment_due_date: project.payment_due_date,
      payment_status: 'PENDING',
      tasks_count: 0,
      tasks_completed_count: 0,
      milestones_count: defaultMilestones.length,
      milestones_completed_count: 1,
      galleries_count: 0,
      created_at: project.created_at,
      updated_at: project.updated_at,

      // CamelCase aliases
      studioId: project.studio_id,
      clientId: project.client_id,
      clientName: (project as any).client?.name || null,
      clientEmail: (project as any).client?.email || null,
      clientPhone: (project as any).client?.phone || null,
      leadId: project.lead_id,
      projectType: project.project_type as any,
      startDate: project.start_date,
      endDate: project.end_date,
      shootDate: project.shoot_date,
      estimatedValue: project.estimated_value,
      actualRevenue: 0,
      primaryPhotographerId: project.primary_photographer_id,
      paymentDueDate: project.payment_due_date,
      paymentStatus: 'PENDING',
      tasksCount: 0,
      tasksCompletedCount: 0,
      milestonesCount: defaultMilestones.length,
      milestonesCompletedCount: 1,
      galleriesCount: 0,
      createdAt: project.created_at,
      updatedAt: project.updated_at,
    };
  }

  /**
   * Update project fields
   */
  static async updateProject(studioId: string, projectId: string, dto: UpdateStudioProjectDTO, userId?: string): Promise<StudioProjectDTO> {
    const existing = await prisma.studioProject.findFirst({
      where: { id: projectId, studio_id: studioId, deleted_at: null },
    });

    if (!existing) {
      throw new Error('Project not found or unauthorized');
    }

    const data: any = {};
    if (dto.name !== undefined) data.name = this.sanitizeText(dto.name);
    if (dto.project_type !== undefined || (dto as any).projectType !== undefined) {
      data.project_type = dto.project_type || (dto as any).projectType;
    }
    if (dto.status !== undefined) data.status = dto.status;
    if (dto.start_date !== undefined || (dto as any).startDate !== undefined) {
      const s = dto.start_date || (dto as any).startDate;
      data.start_date = s ? new Date(s) : null;
    }
    if (dto.end_date !== undefined || (dto as any).endDate !== undefined) {
      const e = dto.end_date || (dto as any).endDate;
      data.end_date = e ? new Date(e) : null;
    }
    if (dto.shoot_date !== undefined || (dto as any).shootDate !== undefined) {
      const sd = dto.shoot_date || (dto as any).shootDate;
      data.shoot_date = sd ? new Date(sd) : null;
    }
    if (dto.location !== undefined) data.location = this.sanitizeText(dto.location);
    if (dto.description !== undefined) data.description = this.sanitizeText(dto.description);
    if (dto.estimated_value !== undefined || (dto as any).estimatedValue !== undefined) {
      const val = dto.estimated_value !== undefined ? dto.estimated_value : (dto as any).estimatedValue;
      data.estimated_value = val !== null && val !== undefined ? Number(val) : null;
    }
    if (dto.currency !== undefined) data.currency = dto.currency;
    if (dto.primary_photographer_id !== undefined || (dto as any).primaryPhotographerId !== undefined) {
      data.primary_photographer_id = dto.primary_photographer_id || (dto as any).primaryPhotographerId || null;
    }
    if (dto.payment_due_date !== undefined || (dto as any).paymentDueDate !== undefined) {
      const pd = dto.payment_due_date || (dto as any).paymentDueDate;
      data.payment_due_date = pd ? new Date(pd) : null;
    }

    const updated = await prisma.studioProject.update({
      where: { id: projectId },
      data,
      include: {
        client: {
          select: { id: true, name: true, email: true, phone: true },
        },
      },
    });

    if (userId && dto.status && dto.status !== existing.status) {
      await prisma.auditLog.create({
        data: {
          studio_id: studioId,
          user_id: userId,
          action: 'PROJECT_STATUS_CHANGED',
          resource_type: 'STUDIO_PROJECT',
          resource_id: projectId,
          metadata: {
            old_status: existing.status,
            new_status: dto.status,
          },
        },
      });
    }

    return ProjectService.getProject(studioId, projectId);
  }

  /**
   * Update status with timeline progression
   */
  static async updateStatus(studioId: string, projectId: string, status: StudioProjectStatus, userId?: string): Promise<StudioProjectDTO> {
    return this.updateProject(studioId, projectId, { status }, userId);
  }

  /**
   * Compute project timeline stages and next recommended actions
   */
  static async getTimeline(studioId: string, projectId: string): Promise<ProjectTimelineDTO> {
    const project = await prisma.studioProject.findFirst({
      where: { id: projectId, studio_id: studioId, deleted_at: null },
      include: {
        milestones: true,
        tasks: true,
        galleries: {
          include: {
            gallery: true,
          },
        },
      },
    });

    if (!project) {
      throw new Error('Project not found or unauthorized');
    }

    const stageOrder: StudioProjectStatus[] = [
      StudioProjectStatus.INQUIRY,
      StudioProjectStatus.BOOKED,
      StudioProjectStatus.PREPARATION,
      StudioProjectStatus.SHOOT_SCHEDULED,
      StudioProjectStatus.SHOOT_COMPLETED,
      StudioProjectStatus.PROCESSING,
      StudioProjectStatus.GALLERY_PREPARATION,
      StudioProjectStatus.DELIVERED,
      StudioProjectStatus.COMPLETED,
    ];

    const currentIdx = stageOrder.indexOf(project.status as any);

    const stages = stageOrder.map((st, idx) => {
      let isCompleted = idx < currentIdx || project.status === StudioProjectStatus.COMPLETED;
      let isCurrent = idx === currentIdx && project.status !== StudioProjectStatus.COMPLETED;

      let label = st.replace(/_/g, ' ');
      let description = '';

      switch (st) {
        case StudioProjectStatus.INQUIRY:
          description = 'Initial lead discovery & proposal discussion.';
          break;
        case StudioProjectStatus.BOOKED:
          description = 'Client contract confirmed & advance deposit requested.';
          break;
        case StudioProjectStatus.PREPARATION:
          description = 'Shot list, mood board, and gear preparation.';
          break;
        case StudioProjectStatus.SHOOT_SCHEDULED:
          description = 'Shoot location, date, and crew locked.';
          break;
        case StudioProjectStatus.SHOOT_COMPLETED:
          description = 'Photography completed. Memory cards ready for ingestion.';
          break;
        case StudioProjectStatus.PROCESSING:
          description = 'AI culling, color grading, and face recognition processing.';
          break;
        case StudioProjectStatus.GALLERY_PREPARATION:
          description = 'Story timeline, smart albums, and highlights review.';
          break;
        case StudioProjectStatus.DELIVERED:
          description = 'Client gallery delivered with digital download & proofing access.';
          break;
        case StudioProjectStatus.COMPLETED:
          description = 'Final payment settled, print orders fulfilled, project archived.';
          break;
      }

      return {
        stage: st,
        label,
        is_current: isCurrent,
        is_completed: isCompleted,
        completed_at: isCompleted ? project.updated_at : null,
        description,
      };
    });

    let nextAction = 'Continue current workflow tasks.';
    if (project.status === StudioProjectStatus.BOOKED) {
      nextAction = 'Prepare shoot schedule and mood board.';
    } else if (project.status === StudioProjectStatus.SHOOT_SCHEDULED) {
      nextAction = 'Confirm call time and equipment check.';
    } else if (project.status === StudioProjectStatus.SHOOT_COMPLETED) {
      nextAction = 'Ingest photos into gallery for AI processing.';
    } else if (project.status === StudioProjectStatus.PROCESSING) {
      nextAction = 'Review AI culling, smart albums, and cover selections.';
    } else if (project.status === StudioProjectStatus.GALLERY_PREPARATION) {
      nextAction = 'Deliver gallery to client via personalized email.';
    } else if (project.status === StudioProjectStatus.DELIVERED) {
      nextAction = 'Track client selections, downloads, and collect final payment.';
    }

    return {
      project_id: project.id,
      current_status: project.status as any,
      stages,
      recommended_next_action: nextAction,
      can_advance: currentIdx < stageOrder.length - 1,
    };
  }

  /**
   * Link Gallery to Project
   */
  static async linkGallery(
    studioId: string,
    projectId: string,
    galleryId: string,
    role: string = 'PRIMARY'
  ): Promise<any> {
    const project = await prisma.studioProject.findFirst({
      where: { id: projectId, studio_id: studioId, deleted_at: null },
    });
    if (!project) throw new Error('Project not found or unauthorized');

    const gallery = await prisma.gallery.findFirst({
      where: { id: galleryId, studio_id: studioId },
    });
    if (!gallery) throw new Error('Gallery not found or unauthorized');

    const link = await prisma.projectGalleryLink.upsert({
      where: {
        project_id_gallery_id: { project_id: projectId, gallery_id: galleryId },
      },
      update: { role },
      create: {
        studio_id: studioId,
        project_id: projectId,
        gallery_id: galleryId,
        role,
      },
    });

    return link;
  }

  /**
   * List Galleries linked to Project
   */
  static async listGalleries(studioId: string, projectId: string): Promise<any[]> {
    const project = await prisma.studioProject.findFirst({
      where: { id: projectId, studio_id: studioId, deleted_at: null },
      include: {
        galleries: {
          include: {
            gallery: {
              include: {
                _count: { select: { photos: true } },
              },
            },
          },
        },
      },
    });
    if (!project) throw new Error('Project not found or unauthorized');
    return project.galleries || [];
  }

  /**
   * Unlink Gallery from Project
   */
  static async unlinkGallery(studioId: string, projectId: string, galleryId: string): Promise<boolean> {
    await prisma.projectGalleryLink.deleteMany({
      where: {
        studio_id: studioId,
        project_id: projectId,
        gallery_id: galleryId,
      },
    });
    return true;
  }

  /**
   * Get payments linked from Phase 18 StudioBusinessTransaction
   */
  static async getPayments(studioId: string, projectId: string): Promise<{ payments: ProjectPaymentDTO[]; total_paid: number; estimated_value: number | null; status: string }> {
    const project = await prisma.studioProject.findFirst({
      where: { id: projectId, studio_id: studioId, deleted_at: null },
      include: {
        transactions: {
          where: { is_void: false },
          orderBy: { transaction_date: 'desc' },
        },
      },
    });

    if (!project) throw new Error('Project not found or unauthorized');

    const payments: ProjectPaymentDTO[] = (project.transactions || []).map((t: any) => ({
      transaction_id: t.id,
      amount: t.amount,
      currency: t.currency || 'INR',
      transaction_date: t.transaction_date,
      transaction_type: t.transaction_type,
      category: t.category,
      description: t.description,
      reference: t.reference,
      is_advance: (t.description || '').toLowerCase().includes('advance') || t.category === 'ADVANCE',
      is_final: (t.description || '').toLowerCase().includes('final') || t.category === 'FINAL_PAYMENT',
    }));

    const totalPaid = payments
      .filter((p: any) => p.transaction_type === 'INCOME')
      .reduce((sum: number, p: any) => sum + p.amount, 0);

    let status = 'PENDING';
    const est = project.estimated_value || 0;
    if (est > 0 && totalPaid >= est) {
      status = 'PAID';
    } else if (totalPaid > 0) {
      status = 'PARTIAL';
    } else if (project.payment_due_date && new Date(project.payment_due_date) < new Date()) {
      status = 'OVERDUE';
    }

    return {
      payments,
      total_paid: totalPaid,
      estimated_value: project.estimated_value,
      status,
    };
  }

  /**
   * Alias for list payments
   */
  static async listPayments(studioId: string, projectId: string) {
    return this.getPayments(studioId, projectId);
  }

  /**
   * Add internal private note for photographer
   */
  static async addNote(
    studioId: string,
    projectId: string,
    dto: CreateProjectNoteDTO,
    userId?: string
  ): Promise<ProjectNoteDTO> {
    const project = await prisma.studioProject.findFirst({
      where: { id: projectId, studio_id: studioId, deleted_at: null },
    });
    if (!project) throw new Error('Project not found or unauthorized');

    const content = this.sanitizeText(dto.content);
    if (!content || content.length === 0) {
      throw new Error('Note content cannot be empty');
    }

    const note = await prisma.projectNote.create({
      data: {
        studio_id: studioId,
        project_id: projectId,
        author_id: userId || null,
        content,
        is_pinned: Boolean(dto.is_pinned || (dto as any).isPinned),
      },
    });

    return {
      id: note.id,
      studio_id: note.studio_id,
      project_id: note.project_id,
      author_id: note.author_id,
      author_name: userId ? 'Studio Staff' : null,
      content: note.content,
      is_pinned: note.is_pinned,
      created_at: note.created_at,
      updated_at: note.updated_at,

      studioId: note.studio_id,
      projectId: note.project_id,
      isPinned: note.is_pinned,
      createdAt: note.created_at,
      updatedAt: note.updated_at,
    };
  }

  /**
   * List notes for project
   */
  static async listNotes(studioId: string, projectId: string): Promise<ProjectNoteDTO[]> {
    const notes = await prisma.projectNote.findMany({
      where: { studio_id: studioId, project_id: projectId },
      orderBy: [{ is_pinned: 'desc' }, { created_at: 'desc' }],
    });

    return notes.map((note) => ({
      id: note.id,
      studio_id: note.studio_id,
      project_id: note.project_id,
      author_id: note.author_id,
      content: note.content,
      is_pinned: note.is_pinned,
      created_at: note.created_at,
      updated_at: note.updated_at,

      studioId: note.studio_id,
      projectId: note.project_id,
      isPinned: note.is_pinned,
      createdAt: note.created_at,
      updatedAt: note.updated_at,
    }));
  }

  /**
   * Delete note
   */
  static async deleteNote(studioId: string, noteId: string): Promise<boolean> {
    await prisma.projectNote.deleteMany({
      where: { id: noteId, studio_id: studioId },
    });
    return true;
  }

  /**
   * Soft delete project
   */
  static async deleteProject(studioId: string, projectId: string): Promise<boolean> {
    const project = await prisma.studioProject.findFirst({
      where: { id: projectId, studio_id: studioId, deleted_at: null },
    });
    if (!project) throw new Error('Project not found or unauthorized');

    await prisma.studioProject.update({
      where: { id: projectId },
      data: {
        deleted_at: new Date(),
        status: StudioProjectStatus.CANCELLED,
      },
    });

    return true;
  }
}
