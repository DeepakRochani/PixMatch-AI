/**
 * Contract Service — PixMatch AI Phase 21
 * Legal contract templates, variable interpolation, tamper-resistant e-acknowledgement, and SHA-256 signature verification.
 */

import crypto from 'crypto';
import { prisma } from '@pixmatch/database';
import {
  StudioContractStatus,
  StudioContractCategory,
  StudioContractDTO,
  StudioContractTemplateDTO,
  CreateContractDTO,
  UpdateContractDTO,
  CreateContractTemplateDTO,
  UpdateContractTemplateDTO,
  SendContractDTO,
  ContractListQueryDTO,
} from '@pixmatch/types';
import { EmailService } from '../../services/email/email.service.js';

export class ContractService {
  /**
   * Safe list of supported template placeholders
   */
  public static readonly ALLOWED_VARIABLES = [
    'studio_name',
    'studio_email',
    'studio_phone',
    'studio_address',
    'client_name',
    'client_email',
    'client_phone',
    'client_company',
    'project_name',
    'project_date',
    'project_location',
    'proposal_number',
    'contract_number',
    'total_amount',
    'currency',
    'payment_due_date',
    'current_date',
  ] as const;

  /**
   * Helper: Sanitize text against dangerous tags
   */
  private static sanitizeText(str?: string | null): string | null {
    if (!str) return str || null;
    return str.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '').trim();
  }

  /**
   * Helper: Generate collision-resistant contract number format: CONT-YYYY-XXXXXX
   */
  private static async generateContractNumber(studioId: string): Promise<string> {
    const year = new Date().getFullYear();
    const count = await prisma.studioContract.count({
      where: {
        studio_id: studioId,
        created_at: {
          gte: new Date(`${year}-01-01T00:00:00.000Z`),
        },
      },
    });
    const randSuffix = crypto.randomBytes(2).toString('hex').toUpperCase();
    const seq = String(count + 1).padStart(4, '0');
    return `CONT-${year}-${seq}-${randSuffix}`;
  }

  /**
   * Helper: Interpolate variables safely into template body
   */
  public static interpolateVariables(
    templateBody: string,
    variables: Record<string, string | number | null | undefined>
  ): string {
    let output = templateBody;
    for (const [key, value] of Object.entries(variables)) {
      const sanitizedVal = value !== null && value !== undefined ? String(value) : '';
      const regex = new RegExp(`{{\\s*${key}\\s*}}`, 'g');
      output = output.replace(regex, sanitizedVal);
    }
    // Clean up any unmatched valid template tags with placeholder text or empty
    output = output.replace(/{{\s*([a-zA-Z0-9_]+)\s*}}/g, '[N/A]');
    return output;
  }

  /**
   * Template: List templates for a studio
   */
  static async listTemplates(
    studioId: string,
    category?: StudioContractCategory
  ): Promise<StudioContractTemplateDTO[]> {
    const where: any = { studio_id: studioId };
    if (category) {
      where.category = category;
    }

    let templates = await prisma.studioContractTemplate.findMany({
      where,
      orderBy: [{ is_default: 'desc' }, { title: 'asc' }],
    });

    if (templates.length === 0) {
      // Seed default templates if none exist for studio
      await this.seedDefaultTemplates(studioId);
      templates = await prisma.studioContractTemplate.findMany({
        where,
        orderBy: [{ is_default: 'desc' }, { title: 'asc' }],
      });
    }

    return templates.map((t: any) => ({
      id: t.id,
      studio_id: t.studio_id,
      title: t.title,
      category: t.category as StudioContractCategory,
      description: t.description,
      body_content: t.body_content,
      is_default: t.is_default,
      supported_variables: (t.supported_variables as string[]) || [...this.ALLOWED_VARIABLES],
      metadata: t.metadata as Record<string, any>,
      created_at: t.created_at,
      updated_at: t.updated_at,
    }));
  }

  /**
   * Template: Get template by ID
   */
  /**
   * Template: Get template by ID
   */
  static async getTemplate(studioId: string, id: string): Promise<StudioContractTemplateDTO | null> {
    const template = await prisma.studioContractTemplate.findFirst({
      where: { id, studio_id: studioId },
    });
    if (!template) {
      return null;
    }
    return {
      id: template.id,
      studio_id: template.studio_id,
      title: template.title,
      category: template.category as StudioContractCategory,
      description: template.description,
      body_content: template.body_content,
      is_default: template.is_default,
      supported_variables: (template.supported_variables as string[]) || [...this.ALLOWED_VARIABLES],
      metadata: template.metadata as Record<string, any>,
      created_at: template.created_at,
      updated_at: template.updated_at,
    };
  }

  /**
   * Template: Create template
   */
  static async createTemplate(
    studioId: string,
    data: CreateContractTemplateDTO
  ): Promise<StudioContractTemplateDTO> {
    const title = data.title ? this.sanitizeText(data.title)! : '';
    if (!title.trim()) {
      throw new Error('Template title is required');
    }
    const bodyContent = data.body_content || (data as any).body_template;
    if (!bodyContent || !bodyContent.trim()) {
      throw new Error('Template content is required');
    }

    // Extract variables
    const matches = Array.from(bodyContent.matchAll(/{{\s*([a-zA-Z0-9_]+)\s*}}/g)).map((m: any) => m[1]);
    const detectedVars = Array.from(new Set([...matches]));
    const supportedVars = data.supported_variables && data.supported_variables.length > 0
      ? Array.from(new Set([...data.supported_variables, ...detectedVars]))
      : (detectedVars.length > 0 ? detectedVars : [...this.ALLOWED_VARIABLES]);

    if (data.is_default) {
      // Unset previous default in same category
      await prisma.studioContractTemplate.updateMany({
        where: {
          studio_id: studioId,
          category: data.category || StudioContractCategory.STANDARD,
          is_default: true,
        },
        data: { is_default: false },
      });
    }

    const created = await prisma.studioContractTemplate.create({
      data: {
        studio_id: studioId,
        title,
        category: data.category || StudioContractCategory.STANDARD,
        description: this.sanitizeText(data.description),
        body_content: bodyContent,
        is_default: !!data.is_default,
        supported_variables: supportedVars,
        metadata: data.metadata || {},
      },
    });

    return {
      id: created.id,
      studio_id: created.studio_id,
      title: created.title,
      category: created.category as StudioContractCategory,
      description: created.description,
      body_content: created.body_content,
      is_default: created.is_default,
      supported_variables: created.supported_variables as string[],
      metadata: created.metadata as Record<string, any>,
      created_at: created.created_at,
      updated_at: created.updated_at,
    };
  }

  /**
   * Template: Update template
   */
  static async updateTemplate(
    studioId: string,
    id: string,
    data: UpdateContractTemplateDTO
  ): Promise<StudioContractTemplateDTO> {
    const existing = await prisma.studioContractTemplate.findFirst({
      where: { id, studio_id: studioId },
    });
    if (!existing) {
      throw new Error('Contract template not found');
    }

    const bodyContent = data.body_content !== undefined ? data.body_content : (data as any).body_template !== undefined ? (data as any).body_template : existing.body_content;

    let supportedVars = data.supported_variables || (existing.supported_variables as string[]);
    if (bodyContent) {
      const matches = Array.from(bodyContent.matchAll(/{{\s*([a-zA-Z0-9_]+)\s*}}/g)).map((m: any) => m[1]);
      if (matches.length > 0) {
        supportedVars = Array.from(new Set([...supportedVars, ...matches]));
      }
    }

    if (data.is_default) {
      await prisma.studioContractTemplate.updateMany({
        where: {
          studio_id: studioId,
          category: data.category || (existing.category as StudioContractCategory),
          is_default: true,
          id: { not: id },
        },
        data: { is_default: false },
      });
    }

    const updated = await prisma.studioContractTemplate.update({
      where: { id },
      data: {
        title: data.title ? this.sanitizeText(data.title)! : existing.title,
        category: data.category || (existing.category as StudioContractCategory),
        description: data.description !== undefined ? this.sanitizeText(data.description) : existing.description,
        body_content: bodyContent,
        is_default: data.is_default !== undefined ? data.is_default : existing.is_default,
        supported_variables: supportedVars,
        metadata: data.metadata || existing.metadata,
      },
    });

    return {
      id: updated.id,
      studio_id: updated.studio_id,
      title: updated.title,
      category: updated.category as StudioContractCategory,
      description: updated.description,
      body_content: updated.body_content,
      is_default: updated.is_default,
      supported_variables: updated.supported_variables as string[],
      metadata: updated.metadata as Record<string, any>,
      created_at: updated.created_at,
      updated_at: updated.updated_at,
    };
  }

  /**
   * Template: Delete template
   */
  static async deleteTemplate(studioId: string, id: string): Promise<{ success: boolean }> {
    const existing = await prisma.studioContractTemplate.findFirst({
      where: { id, studio_id: studioId },
    });
    if (!existing) {
      throw new Error('Contract template not found');
    }
    await prisma.studioContractTemplate.delete({ where: { id } });
    return { success: true };
  }

  /**
   * List contracts for a studio
   */
  static async listContracts(
    studioId: string,
    query: ContractListQueryDTO = {}
  ): Promise<{ contracts: StudioContractDTO[]; total: number; page: number; limit: number }> {
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
    if (query.category) {
      where.category = query.category;
    }
    if (query.client_id) {
      where.client_id = query.client_id;
    }
    if (query.project_id) {
      where.project_id = query.project_id;
    }
    if (query.proposal_id) {
      where.proposal_id = query.proposal_id;
    }
    if (query.search) {
      where.OR = [
        { contract_number: { contains: query.search, mode: 'insensitive' } },
        { title: { contains: query.search, mode: 'insensitive' } },
        { client: { name: { contains: query.search, mode: 'insensitive' } } },
        { client: { email: { contains: query.search, mode: 'insensitive' } } },
      ];
    }

    const [contracts, total] = await Promise.all([
      prisma.studioContract.findMany({
        where,
        skip,
        take: limit,
        orderBy: { created_at: 'desc' },
        include: {
          client: { select: { id: true, name: true, email: true, phone: true, company: true } },
          project: { select: { id: true, title: true, status: true, start_date: true, location: true } },
          proposal: { select: { id: true, proposal_number: true, title: true, total_amount: true, status: true } },
        },
      }),
      prisma.studioContract.count({ where }),
    ]);

    const mapped = contracts.map((c: any) => this.mapToDTO(c));
    return { contracts: mapped, total, page, limit };
  }

  /**
   * Get single contract
   */
  static async getContract(studioId: string, id: string): Promise<StudioContractDTO> {
    const contract = await prisma.studioContract.findFirst({
      where: { id, studio_id: studioId, deleted_at: null },
      include: {
        client: { select: { id: true, name: true, email: true, phone: true, company: true } },
        project: { select: { id: true, title: true, status: true, start_date: true, location: true } },
        proposal: { select: { id: true, proposal_number: true, title: true, total_amount: true, status: true } },
        template: true,
      },
    });

    if (!contract) {
      throw new Error('Contract not found');
    }

    return this.mapToDTO(contract);
  }

  /**
   * Create a new contract from template or custom content
   */
  static async createContract(
    studioId: string,
    userId: string | null,
    data: CreateContractDTO
  ): Promise<StudioContractDTO> {
    if (!data.client_id) {
      throw new Error('Client is required');
    }
    if (!data.title?.trim()) {
      throw new Error('Contract title is required');
    }

    // Load related entities for variable interpolation
    const [studio, client, project, proposal] = await Promise.all([
      prisma.studio.findUnique({ where: { id: studioId } }),
      prisma.client.findFirst({ where: { id: data.client_id, studio_id: studioId } }),
      data.project_id ? prisma.studioProject.findFirst({ where: { id: data.project_id, studio_id: studioId } }) : null,
      data.proposal_id ? prisma.studioProposal.findFirst({ where: { id: data.proposal_id, studio_id: studioId } }) : null,
    ]);

    if (!studio || !client) {
      throw new Error('Studio or client not found');
    }

    let rawBody = data.body_content;
    let templateCategory: StudioContractCategory = data.category || StudioContractCategory.STANDARD;

    if (!rawBody && data.template_id) {
      const template = await prisma.studioContractTemplate.findFirst({
        where: { id: data.template_id, studio_id: studioId },
      });
      if (template) {
        rawBody = template.body_content;
        templateCategory = template.category as StudioContractCategory;
      }
    }

    if (!rawBody) {
      // Fallback to default template in category
      const defaultTemplate = await prisma.studioContractTemplate.findFirst({
        where: { studio_id: studioId, category: templateCategory, is_default: true },
      });
      if (defaultTemplate) {
        rawBody = defaultTemplate.body_content;
      } else {
        rawBody = this.getDefaultTemplateContent(templateCategory);
      }
    }

    const contractNumber = await this.generateContractNumber(studioId);

    // Build variables dictionary
    const variables: Record<string, any> = {
      studio_name: studio.name,
      studio_email: studio.email || '',
      studio_phone: studio.phone || '',
      studio_address: studio.address || '',
      client_name: client.name,
      client_email: client.email,
      client_phone: client.phone || '',
      client_company: client.company || '',
      project_name: project?.title || 'Photography Project',
      project_date: project?.start_date ? new Date(project.start_date).toLocaleDateString() : 'TBD',
      project_location: project?.location || 'TBD',
      proposal_number: proposal?.proposal_number || 'N/A',
      contract_number: contractNumber,
      total_amount: proposal ? `${proposal.currency} ${proposal.total_amount.toLocaleString()}` : '0.00',
      currency: proposal?.currency || 'USD',
      payment_due_date: 'Upon signing',
      current_date: new Date().toLocaleDateString(),
      ...(data.variables_override || (data as any).variables || {}),
    };

    const renderedContent = this.interpolateVariables(rawBody, variables);
    const publicToken = crypto.randomBytes(32).toString('hex');
    const tokenHash = crypto.createHash('sha256').update(publicToken).digest('hex');

    const created = await prisma.studioContract.create({
      data: {
        studio_id: studioId,
        client_id: data.client_id,
        project_id: data.project_id || null,
        proposal_id: data.proposal_id || null,
        template_id: data.template_id || null,
        contract_number: contractNumber,
        title: this.sanitizeText(data.title)!,
        category: templateCategory,
        status: StudioContractStatus.DRAFT,
        version: 1,
        body_content: rawBody,
        rendered_content: renderedContent,
        interpolated_variables: variables,
        public_token_hash: tokenHash,
        token_expires_at: new Date(Date.now() + 30 * 86400000),
        metadata: data.metadata || {},
      },
      include: {
        client: { select: { id: true, name: true, email: true, phone: true, company: true } },
        project: { select: { id: true, title: true, status: true, start_date: true, location: true } },
        proposal: { select: { id: true, proposal_number: true, title: true, total_amount: true, status: true } },
      },
    });

    const res = this.mapToDTO(created);
    res.public_token = publicToken;
    return res;
  }

  /**
   * Update contract
   */
  static async updateContract(
    studioId: string,
    id: string,
    data: UpdateContractDTO
  ): Promise<StudioContractDTO> {
    const existing = await prisma.studioContract.findFirst({
      where: { id, studio_id: studioId, deleted_at: null },
    });

    if (!existing) {
      throw new Error('Contract not found');
    }

    if (existing.status === StudioContractStatus.SIGNED) {
      throw new Error('Cannot edit an already signed contract. Please void and create a new version.');
    }
    if (existing.status === StudioContractStatus.VOID) {
      throw new Error('Cannot edit a voided contract.');
    }

    let bodyContent = data.body_content !== undefined ? data.body_content : existing.body_content;
    let variables = {
      ...(existing.interpolated_variables as Record<string, any> || {}),
      ...(data.variables_override || {}),
    };
    let renderedContent = this.interpolateVariables(bodyContent, variables);

    const updated = await prisma.studioContract.update({
      where: { id },
      data: {
        title: data.title ? this.sanitizeText(data.title)! : existing.title,
        category: data.category || (existing.category as StudioContractCategory),
        version: existing.version + 1,
        body_content: bodyContent,
        rendered_content: renderedContent,
        interpolated_variables: variables,
        metadata: data.metadata || existing.metadata,
      },
      include: {
        client: { select: { id: true, name: true, email: true, phone: true, company: true } },
        project: { select: { id: true, title: true, status: true, start_date: true, location: true } },
        proposal: { select: { id: true, proposal_number: true, title: true, total_amount: true, status: true } },
      },
    });

    return this.mapToDTO(updated);
  }

  /**
   * Send contract to client
   */
  static async sendContract(
    studioId: string,
    id: string,
    data: SendContractDTO = {}
  ): Promise<{ contract: StudioContractDTO; public_url: string; token: string }> {
    const contract = await prisma.studioContract.findFirst({
      where: { id, studio_id: studioId, deleted_at: null },
      include: {
        client: true,
        studio: true,
      },
    });

    if (!contract) {
      throw new Error('Contract not found');
    }

    const rawToken = crypto.randomBytes(32).toString('hex');
    const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
    const validDays = Number(data.valid_days) || 30;
    const expiresAt = new Date(Date.now() + validDays * 86400000);

    const updated = await prisma.studioContract.update({
      where: { id },
      data: {
        status: StudioContractStatus.SENT,
        public_token_hash: tokenHash,
        token_expires_at: expiresAt,
        sent_at: new Date(),
      },
      include: {
        client: { select: { id: true, name: true, email: true, phone: true, company: true } },
        project: { select: { id: true, title: true, status: true, start_date: true, location: true } },
        proposal: { select: { id: true, proposal_number: true, title: true, total_amount: true, status: true } },
      },
    });

    const recipientEmail = data.recipient_email || contract.client.email;
    if (recipientEmail) {
      try {
        await EmailService.sendEmail({
          to: recipientEmail,
          subject: `Contract for signature #${contract.contract_number}: ${contract.title}`,
          html: `<div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #111;">
            <h2>${contract.studio.name} has prepared your service agreement</h2>
            <p><strong>${contract.title}</strong> (${contract.contract_number})</p>
            ${data.message ? `<p style="padding: 12px; background: #f4f4f5; border-radius: 6px;">${data.message}</p>` : ''}
            <p>Please review and complete the electronic signature acknowledgement.</p>
            <p style="margin-top: 24px;">
              <a href="${process.env.APP_URL || 'http://localhost:3000'}/portal/contract/${rawToken}" style="display: inline-block; padding: 12px 24px; background: #16a34a; color: #ffffff; text-decoration: none; border-radius: 6px; font-weight: bold;">Review & Sign Contract</a>
            </p>
          </div>`,
          category: 'TRANSACTIONAL',
          studio_id: studioId,
          client_id: contract.client_id,
        });
      } catch (err) {
        console.warn('Failed to send contract email:', err);
      }
    }

    // Log client activity
    try {
      await prisma.clientActivity.create({
        data: {
          client_id: contract.client_id,
          studio_id: studioId,
          activity_type: 'CONTRACT_SENT',
          description: `Contract #${contract.contract_number} sent to ${recipientEmail}`,
          metadata: { contract_id: id, contract_number: contract.contract_number },
        },
      });
    } catch (_) {}

    const res = this.mapToDTO(updated);
    res.public_token = rawToken;
    const publicUrl = `${process.env.APP_URL || 'http://localhost:3000'}/portal/contract/${rawToken}`;
    return { contract: res, public_url: publicUrl, token: rawToken };
  }

  /**
   * Countersign contract by photographer / studio
   */
  static async countersignContract(
    studioId: string,
    userId: string,
    id: string
  ): Promise<StudioContractDTO> {
    const contract = await prisma.studioContract.findFirst({
      where: { id, studio_id: studioId, deleted_at: null },
    });

    if (!contract) {
      throw new Error('Contract not found');
    }

    if (contract.status !== StudioContractStatus.SIGNED) {
      throw new Error('Contract must be signed by client before countersigning');
    }

    const updated = await prisma.studioContract.update({
      where: { id },
      data: {
        countersigned_at: new Date(),
        countersigned_by_user_id: userId,
      },
      include: {
        client: { select: { id: true, name: true, email: true, phone: true, company: true } },
        project: { select: { id: true, title: true, status: true, start_date: true, location: true } },
        proposal: { select: { id: true, proposal_number: true, title: true, total_amount: true, status: true } },
      },
    });

    return this.mapToDTO(updated);
  }

  /**
   * Void contract
   */
  static async voidContract(studioId: string, id: string, reason?: string): Promise<StudioContractDTO> {
    const contract = await prisma.studioContract.findFirst({
      where: { id, studio_id: studioId, deleted_at: null },
    });

    if (!contract) {
      throw new Error('Contract not found');
    }

    const updated = await prisma.studioContract.update({
      where: { id },
      data: {
        status: StudioContractStatus.VOID,
        voided_at: new Date(),
        void_reason: reason || 'Contract voided by studio',
      },
      include: {
        client: { select: { id: true, name: true, email: true, phone: true, company: true } },
      },
    });

    return this.mapToDTO(updated);
  }

  /**
   * Delete contract (soft delete)
   */
  static async deleteContract(studioId: string, id: string): Promise<{ success: boolean }> {
    const contract = await prisma.studioContract.findFirst({
      where: { id, studio_id: studioId, deleted_at: null },
    });

    if (!contract) {
      throw new Error('Contract not found');
    }

    await prisma.studioContract.update({
      where: { id },
      data: { deleted_at: new Date() },
    });

    return { success: true };
  }

  /**
   * Seed standard default contract templates
   */
  public static async seedDefaultTemplates(studioId: string): Promise<void> {
    const defaultTemplates = [
      {
        title: 'Standard Photography Agreement',
        category: StudioContractCategory.STANDARD,
        description: 'Standard terms of service, copyright, deliverables, and payment obligations.',
        body_content: `# PHOTOGRAPHY SERVICES AGREEMENT
**Agreement Number:** {{contract_number}}
**Date:** {{current_date}}

This Agreement is entered into between **{{studio_name}}** ("Photographer") and **{{client_name}}** ("Client").

## 1. Scope of Services
Photographer agrees to provide photographic services for **{{project_name}}** on **{{project_date}}** at **{{project_location}}**.

## 2. Compensation & Payments
The total agreed fee is **{{total_amount}}**. Payment is due according to the agreed payment schedule ({{payment_due_date}}).

## 3. Copyright & Usage Rights
Photographer retains copyright in all photographic materials created. Client is granted a perpetual, non-exclusive personal license to reproduce, share, and display the photographs for personal use.

## 4. Cancellation & Rescheduling
If Client cancels the booking with less than 14 days notice, the deposit shall be retained by Photographer.

## 5. Electronic Acknowledgement
By signing below, Client agrees to all terms and conditions set forth in this Agreement.`,
        is_default: true,
      },
      {
        title: 'Wedding Photography Contract',
        category: StudioContractCategory.WEDDING,
        description: 'Comprehensive wedding contract covering timeline, meal breaks, deliverables, and exclusivity.',
        body_content: `# WEDDING PHOTOGRAPHY CONTRACT
**Agreement Number:** {{contract_number}}
**Wedding Date:** {{project_date}}

Between **{{studio_name}}** ("Studio") and **{{client_name}}** ("Couple").

## 1. Event Coverage
Studio will cover the wedding event **{{project_name}}** at **{{project_location}}**.

## 2. Package Total & Retainer
Total Investment: **{{total_amount}}**. A non-refundable booking retainer is required to secure the date.

## 3. Creative Discretion & Delivery
Studio retains creative control over photo selection and editing. Final high-resolution digital gallery will be delivered within 4-6 weeks.

## 4. Exclusive Coverage
{{studio_name}} shall be the exclusive professional photographer appointed for the designated event hours.`,
        is_default: true,
      },
      {
        title: 'Portrait & Headshot Agreement',
        category: StudioContractCategory.PORTRAIT,
        description: 'Terms for studio portraits, model releases, and commercial headshots.',
        body_content: `# PORTRAIT PHOTOGRAPHY AGREEMENT
**Agreement Number:** {{contract_number}}

Studio: **{{studio_name}}**
Client: **{{client_name}}**

## 1. Session Details
Session: **{{project_name}}** scheduled on **{{project_date}}** at **{{project_location}}**.

## 2. Fees
Total Session Fee: **{{total_amount}}**.

## 3. Model Release
Client grants {{studio_name}} permission to use selected portraits for portfolio, website, and promotional purposes unless explicitly opted out in writing.`,
        is_default: true,
      },
    ];

    for (const t of defaultTemplates) {
      await prisma.studioContractTemplate.create({
        data: {
          studio_id: studioId,
          title: t.title,
          category: t.category,
          description: t.description,
          body_content: t.body_content,
          is_default: t.is_default,
          supported_variables: [...this.ALLOWED_VARIABLES],
        },
      });
    }
  }

  private static getDefaultTemplateContent(category: StudioContractCategory): string {
    return `# PHOTOGRAPHY SERVICES AGREEMENT
**Agreement Number:** {{contract_number}}
**Date:** {{current_date}}

Between **{{studio_name}}** and **{{client_name}}**.

## 1. Project
**{{project_name}}** on **{{project_date}}** at **{{project_location}}**.

## 2. Total Investment
**{{total_amount}}**

## 3. Terms
Standard professional photographic services terms apply.`;
  }

  /**
   * Helper: Map Prisma Model to StudioContractDTO
   */
  public static mapToDTO(c: any): StudioContractDTO {
    return {
      id: c.id,
      studio_id: c.studio_id,
      client_id: c.client_id,
      project_id: c.project_id,
      proposal_id: c.proposal_id,
      template_id: c.template_id,
      contract_number: c.contract_number,
      title: c.title,
      category: c.category as StudioContractCategory,
      status: c.status as StudioContractStatus,
      version: c.version || 1,
      body_content: c.body_content,
      rendered_content: c.rendered_content,
      interpolated_variables: c.interpolated_variables,
      token_expires_at: c.token_expires_at,
      sent_at: c.sent_at,
      viewed_at: c.viewed_at,
      view_count: c.view_count || 0,
      signed_at: c.signed_at,
      signed_by_name: c.signed_by_name,
      signed_by_email: c.signed_by_email,
      signature_ip: c.signature_ip,
      signature_user_agent: c.signature_user_agent,
      signature_hash: c.signature_hash,
      countersigned_at: c.countersigned_at,
      countersigned_by_user_id: c.countersigned_by_user_id,
      rejected_at: c.rejected_at,
      rejection_reason: c.rejection_reason,
      voided_at: c.voided_at,
      void_reason: c.void_reason,
      metadata: c.metadata,
      created_at: c.created_at,
      updated_at: c.updated_at,
      client: c.client ? {
        id: c.client.id,
        full_name: c.client.name,
        email: c.client.email,
        phone: c.client.phone,
        company_name: c.client.company,
      } : null,
      project: c.project ? {
        id: c.project.id,
        title: c.project.title,
        status: c.project.status,
        start_date: c.project.start_date,
        location: c.project.location,
      } : null,
      proposal: c.proposal ? {
        id: c.proposal.id,
        proposal_number: c.proposal.proposal_number,
        title: c.proposal.title,
        total_amount: c.proposal.total_amount,
        status: c.proposal.status,
      } as any : null,
      template: c.template ? {
        id: c.template.id,
        studio_id: c.template.studio_id,
        title: c.template.title,
        category: c.template.category,
        description: c.template.description,
        body_content: c.template.body_content,
        is_default: c.template.is_default,
        supported_variables: c.template.supported_variables,
        created_at: c.template.created_at,
        updated_at: c.template.updated_at,
      } : null,
    };
  }
}
