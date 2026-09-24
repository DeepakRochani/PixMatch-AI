import { prisma } from '@pixmatch/database';
import {
  CreateProjectChecklistDTO,
  UpdateProjectChecklistDTO,
  ProjectChecklistDTO,
  ChecklistItemStatus,
  ShootType,
} from '@pixmatch/types';

export class ProductionChecklistService {
  /**
   * Create a production checklist item for a project
   */
  static async createChecklist(
    studioId: string,
    projectId: string,
    dto: CreateProjectChecklistDTO
  ): Promise<ProjectChecklistDTO> {
    const checklist = await prisma.projectChecklist.create({
      data: {
        studio_id: studioId,
        project_id: projectId,
        name: dto.name,
        description: dto.description || null,
        category: dto.category || 'SHOOT',
        priority: dto.priority || 'MEDIUM',
        due_at: dto.due_at ? new Date(dto.due_at) : null,
        assigned_to: dto.assigned_to || null,
        sort_order: dto.sort_order ?? 0,
        status: ChecklistItemStatus.PENDING,
      },
    });

    return checklist as unknown as ProjectChecklistDTO;
  }

  /**
   * Generate standard checklists from pre-built templates based on shoot type
   */
  static async generateChecklistsFromTemplate(
    studioId: string,
    projectId: string,
    templateType: ShootType | 'WEDDING' | 'PORTRAIT' | 'COMMERCIAL' | 'EVENT' = 'WEDDING'
  ): Promise<ProjectChecklistDTO[]> {
    const items = this.getTemplateChecklistDefinitions(templateType);
    const results: ProjectChecklistDTO[] = [];

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      const created = await this.createChecklist(studioId, projectId, {
        ...item,
        sort_order: i,
      });
      results.push(created);
    }

    return results;
  }

  /**
   * Toggle or update a checklist item
   */
  static async updateChecklistItem(
    studioId: string,
    itemId: string,
    dto: UpdateProjectChecklistDTO
  ): Promise<ProjectChecklistDTO> {
    const item = await prisma.projectChecklist.findFirst({
      where: { id: itemId, studio_id: studioId },
    });

    if (!item) {
      throw new Error(`Checklist item not found: ${itemId}`);
    }

    const newStatus = dto.status || item.status;
    const completedAt =
      newStatus === ChecklistItemStatus.COMPLETED && item.status !== ChecklistItemStatus.COMPLETED
        ? new Date()
        : newStatus !== ChecklistItemStatus.COMPLETED
        ? null
        : item.completed_at;

    const updated = await prisma.projectChecklist.update({
      where: { id: itemId },
      data: {
        name: dto.name !== undefined ? dto.name : item.name,
        description: dto.description !== undefined ? dto.description : item.description,
        category: dto.category !== undefined ? dto.category : item.category,
        priority: dto.priority !== undefined ? dto.priority : item.priority,
        status: newStatus,
        due_at: dto.due_at ? new Date(dto.due_at) : item.due_at,
        assigned_to: dto.assigned_to !== undefined ? dto.assigned_to : item.assigned_to,
        sort_order: dto.sort_order !== undefined ? dto.sort_order : item.sort_order,
        completed_at: completedAt,
        updated_at: new Date(),
      },
    });

    return updated as unknown as ProjectChecklistDTO;
  }

  /**
   * Get all checklists for a project
   */
  static async getChecklists(
    studioId: string,
    projectId: string
  ): Promise<ProjectChecklistDTO[]> {
    const checklists = await prisma.projectChecklist.findMany({
      where: { project_id: projectId, studio_id: studioId },
      orderBy: [{ sort_order: 'asc' }, { created_at: 'asc' }],
    });

    return checklists as unknown as ProjectChecklistDTO[];
  }

  /**
   * Verify all required pre-shoot checklist items are completed
   */
  static async verifyPreShootChecklistComplete(
    studioId: string,
    projectId: string
  ): Promise<{ complete: boolean; missing_items: string[] }> {
    const checklists = await prisma.projectChecklist.findMany({
      where: {
        project_id: projectId,
        studio_id: studioId,
        category: { in: ['CLIENT', 'EQUIPMENT', 'TRAVEL', 'LOCATION', 'SHOOT'] },
      },
    });

    if (checklists.length === 0) {
      return { complete: true, missing_items: [] };
    }

    const missing = checklists
      .filter((c) => c.priority === 'HIGH' || c.priority === 'URGENT')
      .filter((c) => c.status !== ChecklistItemStatus.COMPLETED && c.status !== ChecklistItemStatus.SKIPPED)
      .map((c) => c.name);

    return {
      complete: missing.length === 0,
      missing_items: missing,
    };
  }

  private static getTemplateChecklistDefinitions(
    type: string
  ): CreateProjectChecklistDTO[] {
    if (type === 'WEDDING') {
      return [
        { name: 'Confirm timeline & venue addresses with couple', category: 'CLIENT', priority: 'HIGH' },
        { name: 'Review family formal shot list & VIP names', category: 'CLIENT', priority: 'HIGH' },
        { name: 'Check weather forecast & sunset golden hour times', category: 'LOCATION', priority: 'MEDIUM' },
        { name: 'Charge all camera batteries & clean sensors', category: 'EQUIPMENT', priority: 'URGENT' },
        { name: 'Format and test high-speed memory cards', category: 'EQUIPMENT', priority: 'URGENT' },
        { name: 'Pack backup camera body & emergency lighting kit', category: 'EQUIPMENT', priority: 'HIGH' },
        { name: 'Send crew briefing & call time confirmations', category: 'SHOOT', priority: 'HIGH' },
        { name: 'Duplicate media backup to on-site SSD drive', category: 'MEDIA', priority: 'URGENT' },
      ];
    }

    if (type === 'COMMERCIAL') {
      return [
        { name: 'Review client creative brief & mood board', category: 'CLIENT', priority: 'HIGH' },
        { name: 'Confirm location permits & model releases', category: 'LOCATION', priority: 'HIGH' },
        { name: 'Tethering laptop and monitor calibrated', category: 'EQUIPMENT', priority: 'HIGH' },
        { name: 'Strobe heads and modifiers tested', category: 'EQUIPMENT', priority: 'HIGH' },
        { name: 'Live tethered capture to CaptureOne / Lightroom', category: 'SHOOT', priority: 'MEDIUM' },
      ];
    }

    return [
      { name: 'Confirm location & styling advice with client', category: 'CLIENT', priority: 'HIGH' },
      { name: 'Review questionnaire answers & inspiration shots', category: 'CLIENT', priority: 'MEDIUM' },
      { name: 'Prepare reflector & portrait prime lenses', category: 'EQUIPMENT', priority: 'HIGH' },
      { name: 'Capture primary poses & expression variations', category: 'SHOOT', priority: 'MEDIUM' },
    ];
  }
}
