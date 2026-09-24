/**
 * Proposal Service — PixMatch AI Phase 21
 * Proposals lifecycle, itemized quotes, revisions, tokenized sharing, and client acceptance.
 */

import crypto from 'crypto';
import { prisma } from '@pixmatch/database';
import {
  StudioProposalStatus,
  StudioProposalDTO,
  CreateProposalDTO,
  UpdateProposalDTO,
  SendProposalDTO,
  ProposalListQueryDTO,
} from '@pixmatch/types';
import { EmailService } from '../../services/email/email.service.js';

export class ProposalService {
  /**
   * Helper: Sanitize text inputs against script injection
   */
  private static sanitizeText(str?: string | null): string | null {
    if (!str) return str || null;
    return str.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '').trim();
  }

  /**
   * Helper: Generate a collision-resistant proposal number format: PROP-YYYY-XXXXXX
   */
  private static async generateProposalNumber(studioId: string): Promise<string> {
    const year = new Date().getFullYear();
    const count = await prisma.studioProposal.count({
      where: {
        studio_id: studioId,
        created_at: {
          gte: new Date(`${year}-01-01T00:00:00.000Z`),
        },
      },
    });
    const randSuffix = crypto.randomBytes(2).toString('hex').toUpperCase();
    const seq = String(count + 1).padStart(4, '0');
    return `PROP-${year}-${seq}-${randSuffix}`;
  }

  /**
   * List proposals for a studio with search, filter, and pagination
   */
  static async listProposals(
    studioId: string,
    query: ProposalListQueryDTO = {}
  ): Promise<{ proposals: StudioProposalDTO[]; total: number; page: number; limit: number }> {
    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(query.limit) || 20));
    const skip = (page - 1) * limit;

    const where: any = {
      studio_id: studioId,
      deleted_at: null,
    };

    if (query.status) {
      where.status = query.status;
    }
    if (query.client_id) {
      where.client_id = query.client_id;
    }
    if (query.lead_id) {
      where.lead_id = query.lead_id;
    }
    if (query.project_id) {
      where.project_id = query.project_id;
    }
    if (query.search) {
      where.OR = [
        { proposal_number: { contains: query.search, mode: 'insensitive' } },
        { title: { contains: query.search, mode: 'insensitive' } },
        { client: { name: { contains: query.search, mode: 'insensitive' } } },
        { client: { email: { contains: query.search, mode: 'insensitive' } } },
      ];
    }

    const [proposals, total] = await Promise.all([
      prisma.studioProposal.findMany({
        where,
        skip,
        take: limit,
        orderBy: { created_at: 'desc' },
        include: {
          items: {
            orderBy: { sort_order: 'asc' },
          },
          client: {
            select: { id: true, name: true, email: true, phone: true, company: true },
          },
          lead: {
            select: { id: true, name: true, service_type: true, status: true },
          },
          project: {
            select: { id: true, title: true, status: true },
          },
        },
      }),
      prisma.studioProposal.count({ where }),
    ]);

    const mapped: StudioProposalDTO[] = proposals.map((p: any) => this.mapToDTO(p));
    return { proposals: mapped, total, page, limit };
  }

  /**
   * Get single proposal by ID
   */
  static async getProposal(studioId: string, id: string): Promise<StudioProposalDTO> {
    const proposal = await prisma.studioProposal.findFirst({
      where: { id, studio_id: studioId, deleted_at: null },
      include: {
        items: {
          orderBy: { sort_order: 'asc' },
        },
        revisions: {
          orderBy: { revision_number: 'desc' },
        },
        client: {
          select: { id: true, name: true, email: true, phone: true, company: true },
        },
        lead: {
          select: { id: true, name: true, service_type: true, status: true },
        },
        project: {
          select: { id: true, title: true, status: true },
        },
        contracts: {
          where: { deleted_at: null },
          take: 1,
        },
      },
    });

    if (!proposal) {
      throw new Error('Proposal not found');
    }

    return this.mapToDTO(proposal);
  }

  /**
   * Create a new proposal
   */
  static async createProposal(
    studioId: string,
    userId: string | null,
    data: CreateProposalDTO
  ): Promise<StudioProposalDTO> {
    if (!data.client_id) {
      throw new Error('Client is required to create a proposal');
    }
    if (!data.title?.trim()) {
      throw new Error('Proposal title is required');
    }
    if (!data.items || data.items.length === 0) {
      throw new Error('Proposal must contain at least one item');
    }

    // Verify client belongs to studio
    const client = await prisma.client.findFirst({
      where: { id: data.client_id, studio_id: studioId },
    });
    if (!client) {
      throw new Error('Client not found in this studio');
    }

    // Calculate subtotal & total
    let subtotal = 0;
    const itemsData = data.items.map((item, index) => {
      const qty = Math.max(1, Number(item.quantity) || 1);
      const unitPrice = Math.max(0, Number(item.unit_price) || 0);
      const totalPrice = qty * unitPrice;
      const isOptional = !!item.is_optional;
      const isSelected = item.is_selected !== false;
      if (!isOptional || isSelected) {
        subtotal += totalPrice;
      }
      return {
        title: this.sanitizeText(item.title) || 'Service Item',
        description: this.sanitizeText(item.description),
        quantity: qty,
        unit_price: unitPrice,
        total_price: totalPrice,
        is_optional: isOptional,
        is_selected: isSelected,
        sort_order: item.sort_order !== undefined ? item.sort_order : index,
        metadata: item.metadata || {},
      };
    });

    const discount = Math.max(0, Number(data.discount_amount) || 0);
    const tax = Math.max(0, Number(data.tax_amount) || 0);
    const totalAmount = Math.max(0, subtotal - discount + tax);
    const proposalNumber = await this.generateProposalNumber(studioId);

    const publicToken = crypto.randomBytes(32).toString('hex');
    const tokenHash = crypto.createHash('sha256').update(publicToken).digest('hex');

    const created = await prisma.studioProposal.create({
      data: {
        studio_id: studioId,
        client_id: data.client_id,
        lead_id: data.lead_id || null,
        project_id: data.project_id || null,
        proposal_number: proposalNumber,
        title: this.sanitizeText(data.title)!,
        status: StudioProposalStatus.DRAFT,
        currency: data.currency || 'USD',
        subtotal,
        discount_amount: discount,
        tax_amount: tax,
        total_amount: totalAmount,
        valid_until: data.valid_until ? new Date(data.valid_until) : null,
        notes: this.sanitizeText(data.notes),
        terms_and_conditions: this.sanitizeText(data.terms_and_conditions),
        cover_image_url: data.cover_image_url || null,
        public_token_hash: tokenHash,
        token_expires_at: data.valid_until ? new Date(data.valid_until) : new Date(Date.now() + 30 * 86400000),
        current_revision: 1,
        metadata: data.metadata || {},
        items: {
          create: itemsData,
        },
        revisions: {
          create: {
            revision_number: 1,
            snapshot_data: {
              title: data.title,
              currency: data.currency || 'USD',
              subtotal,
              discount_amount: discount,
              tax_amount: tax,
              total_amount: totalAmount,
              items: itemsData,
            },
            change_summary: 'Initial proposal draft created',
            created_by_user_id: userId,
          },
        },
      },
      include: {
        items: true,
        client: {
          select: { id: true, name: true, email: true, phone: true, company: true },
        },
        lead: {
          select: { id: true, name: true, service_type: true, status: true },
        },
        project: {
          select: { id: true, title: true, status: true },
        },
      },
    });

    const res = this.mapToDTO(created);
    res.public_token = publicToken;
    return res;
  }

  /**
   * Update proposal
   */
  static async updateProposal(
    studioId: string,
    userId: string | null,
    id: string,
    data: UpdateProposalDTO
  ): Promise<StudioProposalDTO> {
    const existing = await prisma.studioProposal.findFirst({
      where: { id, studio_id: studioId, deleted_at: null },
      include: { items: true },
    });

    if (!existing) {
      throw new Error('Proposal not found');
    }

    if (existing.status === StudioProposalStatus.VOID) {
      throw new Error('Cannot edit a voided proposal');
    }

    let subtotal = existing.subtotal;
    let discount = data.discount_amount !== undefined ? Math.max(0, Number(data.discount_amount)) : existing.discount_amount;
    let tax = data.tax_amount !== undefined ? Math.max(0, Number(data.tax_amount)) : existing.tax_amount;
    const newRevisionNumber = existing.current_revision + 1;

    let itemsData: any[] | null = null;
    if (data.items && data.items.length > 0) {
      subtotal = 0;
      itemsData = data.items.map((item, index) => {
        const qty = Math.max(1, Number(item.quantity) || 1);
        const unitPrice = Math.max(0, Number(item.unit_price) || 0);
        const totalPrice = qty * unitPrice;
        const isOptional = !!item.is_optional;
        const isSelected = item.is_selected !== false;
        if (!isOptional || isSelected) {
          subtotal += totalPrice;
        }
        return {
          title: this.sanitizeText(item.title) || 'Service Item',
          description: this.sanitizeText(item.description),
          quantity: qty,
          unit_price: unitPrice,
          total_price: totalPrice,
          is_optional: isOptional,
          is_selected: isSelected,
          sort_order: item.sort_order !== undefined ? item.sort_order : index,
          metadata: item.metadata || {},
        };
      });
    }

    const totalAmount = Math.max(0, subtotal - discount + tax);

    // Run in transaction to safely update items and record revision
    const updated = await prisma.$transaction(async (tx: any) => {
      if (itemsData) {
        await tx.studioProposalItem.deleteMany({
          where: { proposal_id: id },
        });
        await tx.studioProposalItem.createMany({
          data: itemsData.map((it) => ({ ...it, proposal_id: id })),
        });
      }

      await tx.studioProposalRevision.create({
        data: {
          proposal_id: id,
          revision_number: newRevisionNumber,
          snapshot_data: {
            title: data.title || existing.title,
            subtotal,
            discount_amount: discount,
            tax_amount: tax,
            total_amount: totalAmount,
            items: itemsData || existing.items,
          },
          change_summary: data.change_summary || 'Proposal details updated',
          created_by_user_id: userId,
        },
      });

      return tx.studioProposal.update({
        where: { id },
        data: {
          title: data.title ? this.sanitizeText(data.title)! : existing.title,
          client_id: data.client_id || existing.client_id,
          lead_id: data.lead_id !== undefined ? data.lead_id : existing.lead_id,
          project_id: data.project_id !== undefined ? data.project_id : existing.project_id,
          currency: data.currency || existing.currency,
          subtotal,
          discount_amount: discount,
          tax_amount: tax,
          total_amount: totalAmount,
          valid_until: data.valid_until !== undefined ? (data.valid_until ? new Date(data.valid_until) : null) : existing.valid_until,
          notes: data.notes !== undefined ? this.sanitizeText(data.notes) : existing.notes,
          terms_and_conditions: data.terms_and_conditions !== undefined ? this.sanitizeText(data.terms_and_conditions) : existing.terms_and_conditions,
          cover_image_url: data.cover_image_url !== undefined ? data.cover_image_url : existing.cover_image_url,
          current_revision: newRevisionNumber,
          metadata: data.metadata || existing.metadata,
        },
        include: {
          items: { orderBy: { sort_order: 'asc' } },
          revisions: { orderBy: { revision_number: 'desc' } },
          client: {
            select: { id: true, name: true, email: true, phone: true, company: true },
          },
          lead: {
            select: { id: true, name: true, service_type: true, status: true },
          },
          project: {
            select: { id: true, title: true, status: true },
          },
        },
      });
    });

    return this.mapToDTO(updated);
  }

  /**
   * Send proposal to client (generates token, marks SENT, dispatches email)
   */
  static async sendProposal(
    studioId: string,
    id: string,
    data: SendProposalDTO = {}
  ): Promise<{ proposal: StudioProposalDTO; public_url: string; token: string }> {
    const proposal = await prisma.studioProposal.findFirst({
      where: { id, studio_id: studioId, deleted_at: null },
      include: {
        client: true,
        studio: true,
      },
    });

    if (!proposal) {
      throw new Error('Proposal not found');
    }

    const rawToken = crypto.randomBytes(32).toString('hex');
    const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
    const validDays = Number(data.valid_days) || 30;
    const expiresAt = new Date(Date.now() + validDays * 86400000);

    const updated = await prisma.studioProposal.update({
      where: { id },
      data: {
        status: StudioProposalStatus.SENT,
        public_token_hash: tokenHash,
        token_expires_at: expiresAt,
      },
      include: {
        items: { orderBy: { sort_order: 'asc' } },
        client: { select: { id: true, name: true, email: true, phone: true, company: true } },
        lead: { select: { id: true, name: true, service_type: true, status: true } },
        project: { select: { id: true, title: true, status: true } },
      },
    });

    const recipientEmail = data.recipient_email || proposal.client.email;
    if (recipientEmail) {
      try {
        await EmailService.sendEmail({
          to: recipientEmail,
          subject: `Proposal #${proposal.proposal_number}: ${proposal.title}`,
          html: `<div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #111;">
            <h2>${proposal.studio.name} has sent you a proposal</h2>
            <p><strong>${proposal.title}</strong> (${proposal.proposal_number})</p>
            <p>Total: <strong>${proposal.currency} ${proposal.total_amount.toLocaleString()}</strong></p>
            ${data.message ? `<p style="padding: 12px; background: #f4f4f5; border-radius: 6px;">${data.message}</p>` : ''}
            <p style="margin-top: 24px;">
              <a href="${process.env.APP_URL || 'http://localhost:3000'}/portal/proposal/${rawToken}" style="display: inline-block; padding: 12px 24px; background: #2563eb; color: #ffffff; text-decoration: none; border-radius: 6px; font-weight: bold;">Review & Accept Proposal</a>
            </p>
          </div>`,
          category: 'TRANSACTIONAL',
          studio_id: studioId,
          client_id: proposal.client_id,
        });
      } catch (err) {
        console.warn('Failed to send proposal email:', err);
      }
    }

    // Log client activity
    try {
      await prisma.clientActivity.create({
        data: {
          client_id: proposal.client_id,
          studio_id: studioId,
          activity_type: 'PROPOSAL_SENT',
          description: `Proposal #${proposal.proposal_number} sent to ${recipientEmail}`,
          metadata: { proposal_id: id, proposal_number: proposal.proposal_number, total_amount: proposal.total_amount },
        },
      });
    } catch (_) {}

    const res = this.mapToDTO(updated);
    res.public_token = rawToken;
    const publicUrl = `${process.env.APP_URL || 'http://localhost:3000'}/portal/proposal/${rawToken}`;
    return { proposal: res, public_url: publicUrl, token: rawToken };
  }

  /**
   * Void proposal
   */
  static async voidProposal(studioId: string, id: string, reason?: string): Promise<StudioProposalDTO> {
    const proposal = await prisma.studioProposal.findFirst({
      where: { id, studio_id: studioId, deleted_at: null },
    });

    if (!proposal) {
      throw new Error('Proposal not found');
    }

    const updated = await prisma.studioProposal.update({
      where: { id },
      data: {
        status: StudioProposalStatus.VOID,
        metadata: {
          ...(proposal.metadata as any || {}),
          void_reason: reason || 'Voided by studio',
          voided_at: new Date().toISOString(),
        },
      },
      include: {
        items: true,
        client: { select: { id: true, name: true, email: true, phone: true, company: true } },
      },
    });

    return this.mapToDTO(updated);
  }

  /**
   * Delete proposal (soft delete)
   */
  static async deleteProposal(studioId: string, id: string): Promise<{ success: boolean }> {
    const proposal = await prisma.studioProposal.findFirst({
      where: { id, studio_id: studioId, deleted_at: null },
    });

    if (!proposal) {
      throw new Error('Proposal not found');
    }

    await prisma.studioProposal.update({
      where: { id },
      data: { deleted_at: new Date() },
    });

    return { success: true };
  }

  /**
   * Duplicate proposal as a fresh draft
   */
  static async duplicateProposal(
    studioId: string,
    userId: string | null,
    id: string
  ): Promise<StudioProposalDTO> {
    const orig = await prisma.studioProposal.findFirst({
      where: { id, studio_id: studioId, deleted_at: null },
      include: { items: true },
    });

    if (!orig) {
      throw new Error('Source proposal not found');
    }

    const newNumber = await this.generateProposalNumber(studioId);
    const publicToken = crypto.randomBytes(32).toString('hex');
    const tokenHash = crypto.createHash('sha256').update(publicToken).digest('hex');

    const created = await prisma.studioProposal.create({
      data: {
        studio_id: studioId,
        client_id: orig.client_id,
        lead_id: orig.lead_id,
        project_id: orig.project_id,
        proposal_number: newNumber,
        title: `${orig.title} (Copy)`,
        status: StudioProposalStatus.DRAFT,
        currency: orig.currency,
        subtotal: orig.subtotal,
        discount_amount: orig.discount_amount,
        tax_amount: orig.tax_amount,
        total_amount: orig.total_amount,
        valid_until: null,
        notes: orig.notes,
        terms_and_conditions: orig.terms_and_conditions,
        cover_image_url: orig.cover_image_url,
        public_token_hash: tokenHash,
        current_revision: 1,
        items: {
          create: orig.items.map((it: any) => ({
            title: it.title,
            description: it.description,
            quantity: it.quantity,
            unit_price: it.unit_price,
            total_price: it.total_price,
            is_optional: it.is_optional,
            is_selected: it.is_selected,
            sort_order: it.sort_order,
            metadata: it.metadata || {},
          })),
        },
        revisions: {
          create: {
            revision_number: 1,
            snapshot_data: {
              title: `${orig.title} (Copy)`,
              total_amount: orig.total_amount,
              items: orig.items,
            },
            change_summary: `Cloned from ${orig.proposal_number}`,
            created_by_user_id: userId,
          },
        },
      },
      include: {
        items: true,
        client: { select: { id: true, name: true, email: true, phone: true, company: true } },
      },
    });

    const res = this.mapToDTO(created);
    res.public_token = publicToken;
    return res;
  }

  /**
   * Get revision history for a proposal
   */
  static async getRevisions(
    studioId: string,
    id: string
  ): Promise<StudioProposalRevisionDTO[]> {
    const proposal = await prisma.studioProposal.findFirst({
      where: { id, studio_id: studioId, deleted_at: null },
    });
    if (!proposal) {
      throw new Error('Proposal not found');
    }

    const revisions = await prisma.studioProposalRevision.findMany({
      where: { proposal_id: id },
      orderBy: { revision_number: 'asc' },
    });

    return revisions.map((rev: any) => ({
      id: rev.id,
      proposal_id: rev.proposal_id,
      revision_number: rev.revision_number,
      snapshot_data: rev.snapshot_data,
      change_summary: rev.change_summary,
      created_by_user_id: rev.created_by_user_id,
      created_at: rev.created_at,
    }));
  }

  /**
   * Helper: Map Prisma Model to StudioProposalDTO
   */
  public static mapToDTO(p: any): StudioProposalDTO {
    return {
      id: p.id,
      studio_id: p.studio_id,
      client_id: p.client_id,
      lead_id: p.lead_id,
      project_id: p.project_id,
      proposal_number: p.proposal_number,
      title: p.title,
      status: p.status as StudioProposalStatus,
      currency: p.currency,
      subtotal: p.subtotal,
      discount_amount: p.discount_amount,
      tax_amount: p.tax_amount,
      total_amount: p.total_amount,
      valid_until: p.valid_until,
      notes: p.notes,
      terms_and_conditions: p.terms_and_conditions,
      cover_image_url: p.cover_image_url,
      token_expires_at: p.token_expires_at,
      viewed_at: p.viewed_at,
      view_count: p.view_count || 0,
      accepted_at: p.accepted_at,
      accepted_by_client_name: p.accepted_by_client_name,
      accepted_ip: p.accepted_ip,
      rejected_at: p.rejected_at,
      rejection_reason: p.rejection_reason,
      current_revision: p.current_revision || 1,
      metadata: p.metadata,
      created_at: p.created_at,
      updated_at: p.updated_at,
      items: p.items?.map((it: any) => ({
        id: it.id,
        proposal_id: it.proposal_id,
        title: it.title,
        description: it.description,
        quantity: it.quantity,
        unit_price: it.unit_price,
        total_price: it.total_price,
        is_optional: it.is_optional,
        is_selected: it.is_selected,
        sort_order: it.sort_order,
        metadata: it.metadata,
        created_at: it.created_at,
        updated_at: it.updated_at,
      })),
      revisions: p.revisions?.map((rev: any) => ({
        id: rev.id,
        proposal_id: rev.proposal_id,
        revision_number: rev.revision_number,
        snapshot_data: rev.snapshot_data,
        change_summary: rev.change_summary,
        created_by_user_id: rev.created_by_user_id,
        created_at: rev.created_at,
      })),
      client: p.client ? {
        id: p.client.id,
        full_name: p.client.name,
        email: p.client.email,
        phone: p.client.phone,
        company_name: p.client.company,
      } : null,
      lead: p.lead ? {
        id: p.lead.id,
        name: p.lead.name,
        project_type: p.lead.service_type,
        status: p.lead.status,
      } : null,
      project: p.project ? {
        id: p.project.id,
        title: p.project.title,
        status: p.project.status,
      } : null,
      contract: p.contracts?.[0] ? {
        id: p.contracts[0].id,
        contract_number: p.contracts[0].contract_number,
        status: p.contracts[0].status,
      } as any : null,
    };
  }
}
