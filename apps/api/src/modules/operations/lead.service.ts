/**
 * Lead Service — PixMatch AI Phase 20
 * Lead CRM pipeline, follow-ups, and duplicate-safe lead-to-client/project conversion.
 */

import { prisma } from '@pixmatch/database';
import {
  StudioLeadStatus,
  StudioLeadSource,
  StudioProjectStatus,
  StudioProjectType,
  StudioLeadDTO,
  CreateStudioLeadDTO,
  UpdateStudioLeadDTO,
  ConvertLeadDTO,
} from '@pixmatch/types';

export class LeadService {
  /**
   * Helper: Sanitize text inputs against script and formula injection
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
   * List studio leads with pagination, search, and filtering
   */
  static async listLeads(
    studioId: string,
    params: {
      status?: StudioLeadStatus;
      source?: StudioLeadSource;
      search?: string;
      page?: number;
      limit?: number;
      sortBy?: 'inquiry_date' | 'created_at' | 'next_follow_up_at' | 'estimated_value';
      sortOrder?: 'asc' | 'desc';
    } = {}
  ): Promise<{ leads: StudioLeadDTO[]; total: number; page: number; limit: number }> {
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

    if (params.source) {
      where.source = params.source;
    }

    if (params.search) {
      where.OR = [
        { name: { contains: params.search, mode: 'insensitive' } },
        { email: { contains: params.search, mode: 'insensitive' } },
        { phone: { contains: params.search, mode: 'insensitive' } },
        { service_type: { contains: params.search, mode: 'insensitive' } },
      ];
    }

    const orderBy: any = {};
    const sortField = params.sortBy || 'inquiry_date';
    const sortOrder = params.sortOrder || 'desc';
    orderBy[sortField] = sortOrder;

    const [leads, total] = await Promise.all([
      prisma.studioLead.findMany({
        where,
        skip,
        take: limit,
        orderBy,
        include: {
          client: {
            select: { id: true, name: true, email: true },
          },
        },
      }),
      prisma.studioLead.count({ where }),
    ]);

    const mapped: StudioLeadDTO[] = leads.map((l: any) => ({
      id: l.id,
      studio_id: l.studio_id,
      client_id: l.client_id,
      client_name: l.client?.name || null,
      client_email: l.client?.email || null,
      name: l.name,
      email: l.email,
      phone: l.phone,
      source: l.source as any,
      service_type: l.service_type as any,
      status: l.status as any,
      estimated_value: l.estimated_value,
      currency: l.currency || 'INR',
      inquiry_date: l.inquiry_date,
      last_contacted_at: l.last_contacted_at,
      next_follow_up_at: l.next_follow_up_at,
      notes: l.notes,
      assigned_member_id: l.assigned_member_id,
      created_at: l.created_at,
      updated_at: l.updated_at,

      // CamelCase aliases
      studioId: l.studio_id,
      clientId: l.client_id,
      clientName: l.client?.name || null,
      clientEmail: l.client?.email || null,
      serviceType: l.service_type as any,
      estimatedValue: l.estimated_value,
      inquiryDate: l.inquiry_date,
      lastContactedAt: l.last_contacted_at,
      nextFollowUpAt: l.next_follow_up_at,
      assignedMemberId: l.assigned_member_id,
      createdAt: l.created_at,
      updatedAt: l.updated_at,
    }));

    return { leads: mapped, total, page, limit };
  }

  /**
   * Get single lead by ID
   */
  static async getLead(studioId: string, leadId: string): Promise<StudioLeadDTO> {
    const lead = await prisma.studioLead.findFirst({
      where: { id: leadId, studio_id: studioId, deleted_at: null },
      include: {
        client: {
          select: { id: true, name: true, email: true, phone: true },
        },
        projects: {
          where: { deleted_at: null },
          select: { id: true, name: true, status: true, shoot_date: true },
        },
      },
    });

    if (!lead) {
      throw new Error('Lead not found or unauthorized');
    }

    return {
      id: lead.id,
      studio_id: lead.studio_id,
      client_id: lead.client_id,
      client_name: (lead as any).client?.name || null,
      client_email: (lead as any).client?.email || null,
      name: lead.name,
      email: lead.email,
      phone: lead.phone,
      source: lead.source as any,
      service_type: lead.service_type as any,
      status: lead.status as any,
      estimated_value: lead.estimated_value,
      currency: lead.currency || 'INR',
      inquiry_date: lead.inquiry_date,
      last_contacted_at: lead.last_contacted_at,
      next_follow_up_at: lead.next_follow_up_at,
      notes: lead.notes,
      assigned_member_id: lead.assigned_member_id,
      created_at: lead.created_at,
      updated_at: lead.updated_at,

      // CamelCase aliases
      studioId: lead.studio_id,
      clientId: lead.client_id,
      clientName: (lead as any).client?.name || null,
      clientEmail: (lead as any).client?.email || null,
      serviceType: lead.service_type as any,
      estimatedValue: lead.estimated_value,
      inquiryDate: lead.inquiry_date,
      lastContactedAt: lead.last_contacted_at,
      nextFollowUpAt: lead.next_follow_up_at,
      assignedMemberId: lead.assigned_member_id,
      createdAt: lead.created_at,
      updatedAt: lead.updated_at,
    };
  }

  /**
   * Create new lead
   */
  static async createLead(studioId: string, dto: CreateStudioLeadDTO): Promise<StudioLeadDTO> {
    if (!dto.name || dto.name.trim().length === 0) {
      throw new Error('Lead name is required');
    }

    const name = this.sanitizeText(dto.name)!;
    const notes = this.sanitizeText(dto.notes);
    const serviceType = this.sanitizeText(dto.service_type || (dto as any).serviceType);
    const source = (dto.source || StudioLeadSource.OTHER) as StudioLeadSource;
    const inquiryDate = dto.inquiry_date || (dto as any).inquiryDate ? new Date(dto.inquiry_date || (dto as any).inquiryDate) : new Date();
    const nextFollowUpAt = dto.next_follow_up_at || (dto as any).nextFollowUpAt ? new Date(dto.next_follow_up_at || (dto as any).nextFollowUpAt) : null;
    const estimatedValue = dto.estimated_value !== undefined ? dto.estimated_value : (dto as any).estimatedValue;

    // Optional client linking if client_id provided
    let clientId = dto.client_id || (dto as any).clientId || null;
    if (clientId) {
      const clientExists = await prisma.client.findFirst({
        where: { id: clientId, studio_id: studioId, deleted_at: null },
      });
      if (!clientExists) {
        clientId = null;
      }
    }

    const lead = await prisma.studioLead.create({
      data: {
        studio_id: studioId,
        client_id: clientId,
        name,
        email: dto.email ? dto.email.trim().toLowerCase() : null,
        phone: dto.phone ? dto.phone.trim() : null,
        source,
        service_type: serviceType,
        status: StudioLeadStatus.NEW,
        estimated_value: estimatedValue !== undefined && estimatedValue !== null ? Number(estimatedValue) : null,
        currency: dto.currency || 'INR',
        inquiry_date: inquiryDate,
        next_follow_up_at: nextFollowUpAt,
        notes,
        assigned_member_id: dto.assigned_member_id || (dto as any).assignedMemberId || null,
      },
      include: {
        client: {
          select: { id: true, name: true, email: true },
        },
      },
    });

    return {
      id: lead.id,
      studio_id: lead.studio_id,
      client_id: lead.client_id,
      client_name: (lead as any).client?.name || null,
      client_email: (lead as any).client?.email || null,
      name: lead.name,
      email: lead.email,
      phone: lead.phone,
      source: lead.source as any,
      service_type: lead.service_type as any,
      status: lead.status as any,
      estimated_value: lead.estimated_value,
      currency: lead.currency || 'INR',
      inquiry_date: lead.inquiry_date,
      last_contacted_at: lead.last_contacted_at,
      next_follow_up_at: lead.next_follow_up_at,
      notes: lead.notes,
      assigned_member_id: lead.assigned_member_id,
      created_at: lead.created_at,
      updated_at: lead.updated_at,

      // CamelCase aliases
      studioId: lead.studio_id,
      clientId: lead.client_id,
      clientName: (lead as any).client?.name || null,
      clientEmail: (lead as any).client?.email || null,
      serviceType: lead.service_type as any,
      estimatedValue: lead.estimated_value,
      inquiryDate: lead.inquiry_date,
      lastContactedAt: lead.last_contacted_at,
      nextFollowUpAt: lead.next_follow_up_at,
      assignedMemberId: lead.assigned_member_id,
      createdAt: lead.created_at,
      updatedAt: lead.updated_at,
    };
  }

  /**
   * Update lead details, status, or follow-up timestamp
   */
  static async updateLead(studioId: string, leadId: string, dto: UpdateStudioLeadDTO): Promise<StudioLeadDTO> {
    const existing = await prisma.studioLead.findFirst({
      where: { id: leadId, studio_id: studioId, deleted_at: null },
    });

    if (!existing) {
      throw new Error('Lead not found or unauthorized');
    }

    const data: any = {};

    if (dto.name !== undefined) data.name = this.sanitizeText(dto.name);
    if (dto.email !== undefined) data.email = dto.email ? dto.email.trim().toLowerCase() : null;
    if (dto.phone !== undefined) data.phone = dto.phone ? dto.phone.trim() : null;
    if (dto.source !== undefined) data.source = dto.source;
    if (dto.service_type !== undefined || (dto as any).serviceType !== undefined) {
      data.service_type = this.sanitizeText(dto.service_type || (dto as any).serviceType);
    }
    if (dto.status !== undefined) data.status = dto.status;
    if (dto.estimated_value !== undefined || (dto as any).estimatedValue !== undefined) {
      const val = dto.estimated_value !== undefined ? dto.estimated_value : (dto as any).estimatedValue;
      data.estimated_value = val !== null && val !== undefined ? Number(val) : null;
    }
    if (dto.currency !== undefined) data.currency = dto.currency;
    if (dto.inquiry_date !== undefined || (dto as any).inquiryDate !== undefined) {
      const idate = dto.inquiry_date || (dto as any).inquiryDate;
      data.inquiry_date = idate ? new Date(idate) : undefined;
    }
    if (dto.last_contacted_at !== undefined || (dto as any).lastContactedAt !== undefined) {
      const ldate = dto.last_contacted_at || (dto as any).lastContactedAt;
      data.last_contacted_at = ldate ? new Date(ldate) : null;
    }
    if (dto.next_follow_up_at !== undefined || (dto as any).nextFollowUpAt !== undefined) {
      const ndate = dto.next_follow_up_at || (dto as any).nextFollowUpAt;
      data.next_follow_up_at = ndate ? new Date(ndate) : null;
    }
    if (dto.notes !== undefined) data.notes = this.sanitizeText(dto.notes);
    if (dto.assigned_member_id !== undefined || (dto as any).assignedMemberId !== undefined) {
      data.assigned_member_id = dto.assigned_member_id || (dto as any).assignedMemberId || null;
    }
    if (dto.client_id !== undefined || (dto as any).clientId !== undefined) {
      data.client_id = dto.client_id || (dto as any).clientId || null;
    }

    const updated = await prisma.studioLead.update({
      where: { id: leadId },
      data,
      include: {
        client: {
          select: { id: true, name: true, email: true },
        },
      },
    });

    return {
      id: updated.id,
      studio_id: updated.studio_id,
      client_id: updated.client_id,
      client_name: (updated as any).client?.name || null,
      client_email: (updated as any).client?.email || null,
      name: updated.name,
      email: updated.email,
      phone: updated.phone,
      source: updated.source as any,
      service_type: updated.service_type as any,
      status: updated.status as any,
      estimated_value: updated.estimated_value,
      currency: updated.currency || 'INR',
      inquiry_date: updated.inquiry_date,
      last_contacted_at: updated.last_contacted_at,
      next_follow_up_at: updated.next_follow_up_at,
      notes: updated.notes,
      assigned_member_id: updated.assigned_member_id,
      created_at: updated.created_at,
      updated_at: updated.updated_at,

      // CamelCase aliases
      studioId: updated.studio_id,
      clientId: updated.client_id,
      clientName: (updated as any).client?.name || null,
      clientEmail: (updated as any).client?.email || null,
      serviceType: updated.service_type as any,
      estimatedValue: updated.estimated_value,
      inquiryDate: updated.inquiry_date,
      lastContactedAt: updated.last_contacted_at,
      nextFollowUpAt: updated.next_follow_up_at,
      assignedMemberId: updated.assigned_member_id,
      createdAt: updated.created_at,
      updatedAt: updated.updated_at,
    };
  }

  /**
   * Convert Lead to WON Client & Project
   * Guaranteed duplicate client prevention: reuses verified existing client by ID, email, or phone.
   */
  static async convertLead(
    studioId: string,
    leadId: string,
    dto: ConvertLeadDTO,
    userId?: string
  ): Promise<{ lead: StudioLeadDTO; client: any; project: any }> {
    const lead = await prisma.studioLead.findFirst({
      where: { id: leadId, studio_id: studioId, deleted_at: null },
    });

    if (!lead) {
      throw new Error('Lead not found or unauthorized');
    }

    // 1. Resolve or Create Client (duplicate-safe)
    let client: any = null;
    const explicitClientId = dto.existing_client_id || (dto as any).existingClientId || lead.client_id;

    if (explicitClientId) {
      client = await prisma.client.findFirst({
        where: { id: explicitClientId, studio_id: studioId, deleted_at: null },
      });
    }

    if (!client && lead.email) {
      client = await prisma.client.findFirst({
        where: { studio_id: studioId, email: lead.email.toLowerCase(), deleted_at: null },
      });
    }

    if (!client && lead.phone) {
      client = await prisma.client.findFirst({
        where: { studio_id: studioId, phone: lead.phone, deleted_at: null },
      });
    }

    if (!client) {
      client = await prisma.client.create({
        data: {
          studio_id: studioId,
          name: lead.name,
          email: lead.email || `${lead.name.toLowerCase().replace(/[^a-z0-9]/g, '')}-${Date.now()}@placeholder.client`,
          phone: lead.phone || null,
          status: 'ACTIVE' as any,
          tags: ['CONVERTED_LEAD'],
        },
      });
    }

    // 2. Mark Lead as WON and link Client
    const updatedLead = await prisma.studioLead.update({
      where: { id: leadId },
      data: {
        status: StudioLeadStatus.WON,
        client_id: client.id,
      },
    });

    // 3. Create Studio Project
    const projectName = dto.project_name || (dto as any).projectName || dto.project_title || (dto as any).projectTitle || `${lead.name} — ${dto.project_type || lead.service_type || 'Photography Project'}`;
    const projectType = (dto.project_type || (dto as any).projectType || StudioProjectType.OTHER) as StudioProjectType;
    const startDate = dto.start_date || (dto as any).startDate ? new Date(dto.start_date || (dto as any).startDate) : new Date();
    const shootDate = dto.shoot_date || (dto as any).shootDate ? new Date(dto.shoot_date || (dto as any).shootDate) : null;
    const rawVal = dto.estimated_value !== undefined ? dto.estimated_value : (dto as any).estimatedValue || dto.total_amount || (dto as any).totalAmount || lead.estimated_value;
    const estimatedValue = rawVal !== undefined && rawVal !== null ? Number(rawVal) : null;

    const project = await prisma.studioProject.create({
      data: {
        studio_id: studioId,
        client_id: client.id,
        lead_id: lead.id,
        name: projectName,
        project_type: projectType,
        status: StudioProjectStatus.BOOKED,
        start_date: startDate,
        shoot_date: shootDate,
        location: dto.location || null,
        description: dto.description || lead.notes || null,
        estimated_value: estimatedValue,
        currency: dto.currency || lead.currency || 'INR',
      },
    });

    // 4. Create standard default milestones for new project
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

    // 5. Create initial task for shoot preparation
    await prisma.projectTask.create({
      data: {
        studio_id: studioId,
        project_id: project.id,
        title: `Prepare shot list & schedule for ${projectName}`,
        status: 'TODO' as any,
        priority: 'HIGH' as any,
        due_at: shootDate || new Date(Date.now() + 7 * 86400000),
      },
    });

    // 6. Audit log
    await prisma.auditLog.create({
      data: {
        studio_id: studioId,
        user_id: userId || null,
        action: 'LEAD_CONVERTED_TO_PROJECT',
        resource_type: 'STUDIO_LEAD',
        resource_id: lead.id,
        metadata: {
          lead_id: lead.id,
          client_id: client.id,
          project_id: project.id,
          project_name: project.name,
        },
      },
    });

    const leadDto: StudioLeadDTO = {
      id: updatedLead.id,
      studio_id: updatedLead.studio_id,
      client_id: updatedLead.client_id,
      client_name: client.name,
      client_email: client.email,
      name: updatedLead.name,
      email: updatedLead.email,
      phone: updatedLead.phone,
      source: updatedLead.source as any,
      service_type: updatedLead.service_type as any,
      status: updatedLead.status as any,
      estimated_value: updatedLead.estimated_value,
      currency: updatedLead.currency || 'INR',
      inquiry_date: updatedLead.inquiry_date,
      last_contacted_at: updatedLead.last_contacted_at,
      next_follow_up_at: updatedLead.next_follow_up_at,
      notes: updatedLead.notes,
      assigned_member_id: updatedLead.assigned_member_id,
      created_at: updatedLead.created_at,
      updated_at: updatedLead.updated_at,
    };

    return { lead: leadDto, client, project };
  }

  /**
   * Soft delete or archive lead
   */
  static async deleteLead(studioId: string, leadId: string): Promise<boolean> {
    const lead = await prisma.studioLead.findFirst({
      where: { id: leadId, studio_id: studioId, deleted_at: null },
    });

    if (!lead) {
      throw new Error('Lead not found or unauthorized');
    }

    await prisma.studioLead.update({
      where: { id: leadId },
      data: {
        deleted_at: new Date(),
        status: StudioLeadStatus.ARCHIVED,
      },
    });

    return true;
  }
}
