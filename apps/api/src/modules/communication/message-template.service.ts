/**
 * Message Template Service — PixMatch AI Phase 28
 * Manages reusable studio message templates with whitelisted variable interpolation.
 */

import { prisma } from '@pixmatch/database';
import {
  ICreateMessageTemplateDTO,
  IUpdateMessageTemplateDTO,
  IClientMessageTemplate,
} from '@pixmatch/types';

export const ALLOWED_TEMPLATE_VARIABLES = [
  'clientName',
  'projectName',
  'galleryName',
  'orderNumber',
  'studioName',
  'deliveryStatus',
] as const;

export type TemplateVariableKey = typeof ALLOWED_TEMPLATE_VARIABLES[number];

export interface ITemplateRenderContext {
  clientName?: string;
  projectName?: string;
  galleryName?: string;
  orderNumber?: string;
  studioName?: string;
  deliveryStatus?: string;
  [key: string]: string | undefined;
}

export class MessageTemplateService {
  /**
   * Extracts valid variables from a template string.
   */
  public static extractVariables(text: string): string[] {
    const matches = text.match(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g) || [];
    const vars = new Set<string>();
    for (const match of matches) {
      const varName = match.replace(/[\{\}\s]/g, '');
      if (ALLOWED_TEMPLATE_VARIABLES.includes(varName as any)) {
        vars.add(varName);
      }
    }
    return Array.from(vars);
  }

  /**
   * Safely interpolates whitelisted variables into a template string.
   * Unrecognized variables and script injection attempts are sanitized.
   */
  public static renderTemplateString(
    template: string,
    context: ITemplateRenderContext
  ): string {
    if (!template) return '';

    return template.replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (_match, varName) => {
      if (!ALLOWED_TEMPLATE_VARIABLES.includes(varName as any)) {
        return ''; // strip unauthorized variable syntax
      }
      const val = context[varName];
      if (val === undefined || val === null) {
        return '';
      }
      // Sanitize string to prevent injection
      return String(val)
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
    });
  }

  /**
   * Create a message template.
   */
  public static async createTemplate(
    studioId: string,
    arg2: any,
    arg3?: any
  ): Promise<IClientMessageTemplate> {
    const data: any = arg3 !== undefined ? arg3 : arg2;
    const name = data.name ? String(data.name).trim() : '';
    const bodyTemplate = data.body_template || data.body_content || data.body || '';
    const subjectTemplate = data.subject_template || data.subject || null;

    if (!name || !bodyTemplate) {
      throw new Error('Template name and body template are required.');
    }

    const allVars = new Set<string>([
      ...this.extractVariables(subjectTemplate || ''),
      ...this.extractVariables(bodyTemplate),
      ...(data.variables || []).filter((v: string) =>
        ALLOWED_TEMPLATE_VARIABLES.includes(v as any)
      ),
    ]);

    // If marked default, unset previous default in the same category
    if (data.is_default && data.category) {
      await prisma.clientMessageTemplate.updateMany({
        where: {
          studio_id: studioId,
          category: data.category.toUpperCase(),
          is_default: true,
        },
        data: { is_default: false },
      });
    }

    const template = await prisma.clientMessageTemplate.create({
      data: {
        studio_id: studioId,
        name,
        subject_template: subjectTemplate ? subjectTemplate.trim() : null,
        body_template: bodyTemplate.trim(),
        category: (data.category || 'GENERAL').toUpperCase(),
        variables: Array.from(allVars),
        is_default: !!data.is_default,
      },
    });

    return template as unknown as IClientMessageTemplate;
  }

  /**
   * List templates for a studio.
   */
  public static async getTemplates(
    studioId: string,
    options: { category?: string; search?: string; limit?: number; offset?: number } = {}
  ): Promise<{ items: IClientMessageTemplate[]; total: number }> {
    const limit = Math.min(Math.max(options.limit || 50, 1), 200);
    const offset = Math.max(options.offset || 0, 0);

    const where: any = { studio_id: studioId };

    if (options.category && options.category !== 'ALL') {
      where.category = options.category.toUpperCase();
    }

    if (options.search) {
      where.OR = [
        { name: { contains: options.search, mode: 'insensitive' } },
        { body_template: { contains: options.search, mode: 'insensitive' } },
        { subject_template: { contains: options.search, mode: 'insensitive' } },
      ];
    }

    const [items, total] = await Promise.all([
      prisma.clientMessageTemplate.findMany({
        where,
        orderBy: [{ is_default: 'desc' }, { usage_count: 'desc' }, { created_at: 'desc' }],
        take: limit,
        skip: offset,
      }),
      prisma.clientMessageTemplate.count({ where }),
    ]);

    return {
      items: items as unknown as IClientMessageTemplate[],
      total,
    };
  }

  /**
   * Get template by ID.
   */
  public static async getTemplateById(
    studioId: string,
    templateId: string
  ): Promise<IClientMessageTemplate | null> {
    const template = await prisma.clientMessageTemplate.findFirst({
      where: { id: templateId, studio_id: studioId },
    });

    return template as unknown as IClientMessageTemplate | null;
  }

  /**
   * Update a template.
   */
  public static async updateTemplate(
    studioId: string,
    templateId: string,
    data: IUpdateMessageTemplateDTO
  ): Promise<IClientMessageTemplate> {
    const template = await prisma.clientMessageTemplate.findFirst({
      where: { id: templateId, studio_id: studioId },
    });

    if (!template) {
      throw new Error('Template not found.');
    }

    const updateData: any = {};
    if (data.name !== undefined) updateData.name = data.name.trim();
    if (data.subject_template !== undefined) updateData.subject_template = data.subject_template ? data.subject_template.trim() : null;
    if (data.body_template !== undefined) updateData.body_template = data.body_template.trim();
    if (data.category !== undefined) updateData.category = data.category.toUpperCase();
    if (data.is_default !== undefined) {
      updateData.is_default = data.is_default;
      if (data.is_default) {
        const cat = (data.category || template.category).toUpperCase();
        await prisma.clientMessageTemplate.updateMany({
          where: {
            studio_id: studioId,
            category: cat,
            is_default: true,
            id: { not: templateId },
          },
          data: { is_default: false },
        });
      }
    }

    const bodyText = data.body_template !== undefined ? data.body_template : template.body_template;
    const subjectText = data.subject_template !== undefined ? (data.subject_template || '') : (template.subject_template || '');
    updateData.variables = Array.from(new Set([
      ...this.extractVariables(subjectText),
      ...this.extractVariables(bodyText),
    ]));

    const updated = await prisma.clientMessageTemplate.update({
      where: { id: templateId },
      data: updateData,
    });

    return updated as unknown as IClientMessageTemplate;
  }

  /**
   * Delete a template.
   */
  public static async deleteTemplate(
    studioId: string,
    templateId: string
  ): Promise<{ success: boolean }> {
    const template = await prisma.clientMessageTemplate.findFirst({
      where: { id: templateId, studio_id: studioId },
    });

    if (!template) {
      throw new Error('Template not found.');
    }

    await prisma.clientMessageTemplate.delete({
      where: { id: templateId },
    });

    return { success: true };
  }

  /**
   * Applies a template to a context, returning rendered subject and body.
   */
  public static async applyTemplate(
    studioId: string,
    templateId: string,
    context: ITemplateRenderContext
  ): Promise<{ subject: string; body: string }> {
    const template = await this.getTemplateById(studioId, templateId);
    if (!template) {
      throw new Error('Template not found.');
    }

    // Increment usage count
    await prisma.clientMessageTemplate.update({
      where: { id: templateId },
      data: { usage_count: { increment: 1 } },
    });

    const renderedSubject = template.subject_template
      ? this.renderTemplateString(template.subject_template, context)
      : '';
    const renderedBody = this.renderTemplateString(template.body_template, context);

    return {
      subject: renderedSubject,
      body: renderedBody,
    };
  }

  /**
   * Alias for applyTemplate.
   */
  public static async renderTemplate(
    studioId: string,
    templateId: string,
    context: ITemplateRenderContext
  ): Promise<{ subject: string; body: string }> {
    return this.applyTemplate(studioId, templateId, context);
  }
}
