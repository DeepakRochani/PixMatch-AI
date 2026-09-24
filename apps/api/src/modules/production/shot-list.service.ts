import { prisma } from '@pixmatch/database';
import {
  CreateProjectShotListDTO,
  CreateProjectShotListItemDTO,
  UpdateProjectShotListItemDTO,
  ProjectShotListDTO,
  ProjectShotListItemDTO,
  ShotListCategory,
  ShotListItemStatus,
} from '@pixmatch/types';

export class ShotListService {
  /**
   * Create a shot list container for a project production
   */
  static async createShotList(
    studioId: string,
    projectId: string,
    dto: CreateProjectShotListDTO
  ): Promise<ProjectShotListDTO> {
    const shotList = await prisma.projectShotList.create({
      data: {
        studio_id: studioId,
        project_id: projectId,
        name: dto.name,
        description: dto.description || null,
      },
      include: {
        items: true,
      },
    });

    if (dto.template && (dto.template === 'WEDDING_STANDARD' || dto.template === 'WEDDING_EXTENDED')) {
      await this.populateWeddingTemplate(studioId, shotList.id, dto.template);
      return this.getShotListById(studioId, shotList.id);
    }

    return shotList as unknown as ProjectShotListDTO;
  }

  /**
   * Add a single item to an existing shot list
   */
  static async addShotItem(
    studioId: string,
    shotListId: string,
    dto: CreateProjectShotListItemDTO
  ): Promise<ProjectShotListItemDTO> {
    const shotList = await prisma.projectShotList.findFirst({
      where: { id: shotListId, studio_id: studioId },
    });

    if (!shotList) {
      throw new Error(`Shot list not found: ${shotListId}`);
    }

    const count = await prisma.projectShotListItem.count({
      where: { shot_list_id: shotListId },
    });

    const item = await prisma.projectShotListItem.create({
      data: {
        studio_id: studioId,
        shot_list_id: shotListId,
        category: dto.category || ShotListCategory.COUPLE,
        title: dto.title,
        description: dto.description || null,
        priority: dto.priority || 'NORMAL',
        status: ShotListItemStatus.PENDING,
        sort_order: dto.sort_order ?? count,
        notes: dto.notes || null,
      },
    });

    return item as unknown as ProjectShotListItemDTO;
  }

  /**
   * Update shot item status (e.g. mark CAPTURED during shoot)
   */
  static async updateShotItem(
    studioId: string,
    itemId: string,
    dto: UpdateProjectShotListItemDTO
  ): Promise<ProjectShotListItemDTO> {
    const item = await prisma.projectShotListItem.findFirst({
      where: { id: itemId, studio_id: studioId },
    });

    if (!item) {
      throw new Error(`Shot list item not found: ${itemId}`);
    }

    const newStatus = dto.status || item.status;
    const capturedAt =
      newStatus === ShotListItemStatus.CAPTURED && item.status !== ShotListItemStatus.CAPTURED
        ? new Date()
        : newStatus !== ShotListItemStatus.CAPTURED
        ? null
        : item.captured_at;

    const updated = await prisma.projectShotListItem.update({
      where: { id: itemId },
      data: {
        title: dto.title !== undefined ? dto.title : item.title,
        description: dto.description !== undefined ? dto.description : item.description,
        category: dto.category || item.category,
        priority: dto.priority !== undefined ? dto.priority : item.priority,
        status: newStatus,
        captured_at: capturedAt,
        notes: dto.notes !== undefined ? dto.notes : item.notes,
        sort_order: dto.sort_order !== undefined ? dto.sort_order : item.sort_order,
        updated_at: new Date(),
      },
    });

    return updated as unknown as ProjectShotListItemDTO;
  }

  /**
   * Get all shot lists for a project with their items
   */
  static async getShotLists(
    studioId: string,
    projectId: string
  ): Promise<ProjectShotListDTO[]> {
    const lists = await prisma.projectShotList.findMany({
      where: { project_id: projectId, studio_id: studioId },
      include: {
        items: {
          orderBy: { sort_order: 'asc' },
        },
      },
      orderBy: { created_at: 'asc' },
    });

    return lists as unknown as ProjectShotListDTO[];
  }

  /**
   * Get shot list by ID
   */
  static async getShotListById(
    studioId: string,
    shotListId: string
  ): Promise<ProjectShotListDTO> {
    const list = await prisma.projectShotList.findFirst({
      where: { id: shotListId, studio_id: studioId },
      include: {
        items: {
          orderBy: { sort_order: 'asc' },
        },
      },
    });

    if (!list) {
      throw new Error(`Shot list not found: ${shotListId}`);
    }

    return list as unknown as ProjectShotListDTO;
  }

  /**
   * Instantiate standard Wedding Family Formal Shot List Template
   */
  static async generateWeddingFamilyTemplate(
    studioId: string,
    projectId: string,
    partnerAName = 'Partner A',
    partnerBName = 'Partner B'
  ): Promise<ProjectShotListDTO> {
    const list = await this.createShotList(studioId, projectId, {
      name: 'Family Formals & VIP Portraits',
      description: 'Standard fast-paced 20-minute wedding family formal grouping sequences.',
    });

    const shots: Array<{ title: string; category: ShotListCategory; priority: string }> = [
      { title: `${partnerAName} & ${partnerBName} with Full Wedding Party`, category: ShotListCategory.GROUPS, priority: 'MUST_HAVE' },
      { title: `${partnerAName} & ${partnerBName} with ${partnerAName} Extended Family`, category: ShotListCategory.FAMILY, priority: 'MUST_HAVE' },
      { title: `${partnerAName} & ${partnerBName} with ${partnerAName} Immediate Family`, category: ShotListCategory.FAMILY, priority: 'MUST_HAVE' },
      { title: `${partnerAName} & ${partnerBName} with ${partnerAName} Parents`, category: ShotListCategory.FAMILY, priority: 'MUST_HAVE' },
      { title: `${partnerAName} with Parents`, category: ShotListCategory.FAMILY, priority: 'HIGH' },
      { title: `${partnerAName} & ${partnerBName} with All Parents`, category: ShotListCategory.FAMILY, priority: 'MUST_HAVE' },
      { title: `${partnerAName} & ${partnerBName} with ${partnerBName} Extended Family`, category: ShotListCategory.FAMILY, priority: 'MUST_HAVE' },
      { title: `${partnerAName} & ${partnerBName} with ${partnerBName} Immediate Family`, category: ShotListCategory.FAMILY, priority: 'MUST_HAVE' },
      { title: `${partnerAName} & ${partnerBName} with ${partnerBName} Parents`, category: ShotListCategory.FAMILY, priority: 'MUST_HAVE' },
      { title: `${partnerBName} with Parents`, category: ShotListCategory.FAMILY, priority: 'HIGH' },
    ];

    for (let i = 0; i < shots.length; i++) {
      await this.addShotItem(studioId, list.id, {
        title: shots[i].title,
        category: shots[i].category,
        priority: shots[i].priority,
        sort_order: i,
      });
    }

    return this.getShotListById(studioId, list.id);
  }

  private static async populateWeddingTemplate(studioId: string, shotListId: string, type: string) {
    const defaultShots = [
      { title: 'Couple Romantic Golden Hour Portraits', category: ShotListCategory.COUPLE, priority: 'MUST_HAVE' },
      { title: 'Ceremony First Kiss & Exit', category: ShotListCategory.CEREMONY, priority: 'MUST_HAVE' },
      { title: 'Rings, Shoes, Bouquet & Invitation Details', category: ShotListCategory.DETAILS, priority: 'HIGH' },
      { title: 'First Dance & Cake Cutting', category: ShotListCategory.CEREMONY, priority: 'MUST_HAVE' },
    ];

    for (let i = 0; i < defaultShots.length; i++) {
      await this.addShotItem(studioId, shotListId, {
        title: defaultShots[i].title,
        category: defaultShots[i].category,
        priority: defaultShots[i].priority,
        sort_order: i,
      });
    }
  }
}
