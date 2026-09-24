import { prisma, SmartAlbumType, Prisma } from '@pixmatch/database';
import { SmartAlbumDTO, SmartAlbumRuleAST, SmartAlbumFilterCondition } from '@pixmatch/types';

export const DEFAULT_SYSTEM_SMART_ALBUMS: Array<{
  name: string;
  description: string;
  rule_json: SmartAlbumRuleAST;
  sort_mode: string;
  is_visible_to_client: boolean;
}> = [
  {
    name: 'Highlights',
    description: 'Top-ranked, razor-sharp highlights with balanced exposure and open eyes.',
    rule_json: {
      conjunction: 'AND',
      conditions: [
        { field: 'is_best_shot', operator: 'eq', value: true },
        { field: 'is_blurry', operator: 'eq', value: false },
      ],
    },
    sort_mode: 'BEST_SHOT_FIRST',
    is_visible_to_client: true,
  },
  {
    name: 'Portraits & Candids',
    description: 'Solo portraits and intimate candid captures.',
    rule_json: {
      conjunction: 'AND',
      conditions: [
        { field: 'scene_category', operator: 'in', value: ['Portrait', 'Candid'] },
        { field: 'is_blurry', operator: 'eq', value: false },
      ],
    },
    sort_mode: 'BEST_SHOT_FIRST',
    is_visible_to_client: true,
  },
  {
    name: 'Couples',
    description: 'Two-person couple and bride-and-groom captures.',
    rule_json: {
      conjunction: 'AND',
      conditions: [
        { field: 'people_count', operator: 'eq', value: 2 },
        { field: 'is_blurry', operator: 'eq', value: false },
      ],
    },
    sort_mode: 'BEST_SHOT_FIRST',
    is_visible_to_client: true,
  },
  {
    name: 'Group & Family Photos',
    description: 'Group moments, family portraits, and crowd captures with 3 or more people.',
    rule_json: {
      conjunction: 'AND',
      conditions: [
        { field: 'people_count', operator: 'gte', value: 3 },
      ],
    },
    sort_mode: 'CHRONOLOGICAL',
    is_visible_to_client: true,
  },
  {
    name: 'Ceremony',
    description: 'Sacred moments, ring exchanges, and ritual milestones.',
    rule_json: {
      conjunction: 'OR',
      conditions: [
        { field: 'scene_category', operator: 'eq', value: 'Ceremony' },
        { field: 'moment_category', operator: 'in', value: ['Ceremony', 'Ring Exchange', 'Garland', 'Entry'] },
      ],
    },
    sort_mode: 'CHRONOLOGICAL',
    is_visible_to_client: true,
  },
  {
    name: 'Reception & Dance',
    description: 'Party, stage speeches, cake cutting, and dance floor energy.',
    rule_json: {
      conjunction: 'OR',
      conditions: [
        { field: 'scene_category', operator: 'in', value: ['Reception', 'Dance', 'Stage'] },
        { field: 'moment_category', operator: 'in', value: ['Dance', 'Cake Cutting', 'Speech', 'Stage'] },
      ],
    },
    sort_mode: 'CHRONOLOGICAL',
    is_visible_to_client: true,
  },
  {
    name: 'High Quality',
    description: 'Photos with quality score >= 85%.',
    rule_json: {
      conjunction: 'AND',
      conditions: [
        { field: 'quality_score', operator: 'gte', value: 0.85 },
        { field: 'is_blurry', operator: 'eq', value: false },
      ],
    },
    sort_mode: 'BEST_SHOT_FIRST',
    is_visible_to_client: false,
  },
  {
    name: 'Blurry Photos (Review)',
    description: 'Photos detected with camera motion or defocus blur.',
    rule_json: {
      conjunction: 'AND',
      conditions: [
        { field: 'is_blurry', operator: 'eq', value: true },
      ],
    },
    sort_mode: 'CHRONOLOGICAL',
    is_visible_to_client: false,
  },
  {
    name: 'Potential Duplicates',
    description: 'Exact file copies and burst near-duplicate series.',
    rule_json: {
      conjunction: 'OR',
      conditions: [
        { field: 'duplicate_group_id', operator: 'not_null', value: true },
        { field: 'near_duplicate_group_id', operator: 'not_null', value: true },
      ],
    },
    sort_mode: 'CHRONOLOGICAL',
    is_visible_to_client: false,
  },
];

/**
 * Sandboxed Rule Evaluator.
 * Safely evaluates a single photo's AI metrics against a SmartAlbumFilterCondition AST.
 * NEVER executes arbitrary code or strings.
 */
export function evaluateCondition(analysis: any, condition: any): boolean {
  if (!analysis || !condition || !condition.field || !condition.operator) return false;

  let actualValue = analysis[condition.field];
  if (actualValue === undefined) {
    if (condition.field === 'scene') actualValue = analysis.scene_category;
    else if (condition.field === 'scene_category') actualValue = analysis.scene;
    else if (condition.field === 'moment') actualValue = analysis.moment_category;
    else if (condition.field === 'moment_category') actualValue = analysis.moment;
    else if (condition.field === 'overall_score') actualValue = analysis.quality_score;
    else if (condition.field === 'quality_score') actualValue = analysis.overall_score;
  }

  const targetValue = condition.value;

  switch (condition.operator) {
    case 'eq':
      return String(actualValue).toLowerCase() === String(targetValue).toLowerCase();
    case 'neq':
      return String(actualValue).toLowerCase() !== String(targetValue).toLowerCase();
    case 'gt':
      return typeof actualValue === 'number' && typeof targetValue === 'number' && actualValue > targetValue;
    case 'gte':
      return typeof actualValue === 'number' && typeof targetValue === 'number' && actualValue >= targetValue;
    case 'lt':
      return typeof actualValue === 'number' && typeof targetValue === 'number' && actualValue < targetValue;
    case 'lte':
      return typeof actualValue === 'number' && typeof targetValue === 'number' && actualValue <= targetValue;
    case 'between':
      if (Array.isArray(targetValue) && targetValue.length === 2 && typeof actualValue === 'number') {
        return actualValue >= targetValue[0] && actualValue <= targetValue[1];
      }
      return false;
    case 'in':
      if (Array.isArray(targetValue)) {
        return targetValue.some((v) => String(v).toLowerCase() === String(actualValue).toLowerCase());
      }
      return false;
    case 'nin':
      if (Array.isArray(targetValue)) {
        return !targetValue.some((v) => String(v).toLowerCase() === String(actualValue).toLowerCase());
      }
      return false;
    case 'is_null':
      return actualValue === null || actualValue === undefined;
    case 'not_null':
      return actualValue !== null && actualValue !== undefined;
    default:
      return false;
  }
}

/**
 * Evaluates a complete SmartAlbumRuleAST against photo analysis.
 * Flexible parameter ordering supports both (analysis, ruleAST) and (ruleAST, analysis).
 */
export function evaluateRuleAST(paramA: any, paramB: any): boolean {
  let analysis: any;
  let ruleAST: any;

  if (paramA && (Array.isArray(paramA.conditions) || paramA.conjunction || paramA.combinator)) {
    ruleAST = paramA;
    analysis = paramB || {};
  } else if (paramB && (Array.isArray(paramB.conditions) || paramB.conjunction || paramB.combinator)) {
    ruleAST = paramB;
    analysis = paramA || {};
  } else {
    return true;
  }

  if (!ruleAST || !Array.isArray(ruleAST.conditions) || ruleAST.conditions.length === 0) return true;

  const isOr = ruleAST.conjunction === 'OR' || ruleAST.combinator === 'OR';

  if (isOr) {
    return ruleAST.conditions.some((cond: any) => evaluateCondition(analysis, cond));
  }

  // Default 'AND' conjunction
  return ruleAST.conditions.every((cond: any) => evaluateCondition(analysis, cond));
}

export class SmartAlbumService {
  /**
   * Initializes default system smart albums for a gallery if they do not already exist.
   */
  static async initializeSystemSmartAlbums(galleryId: string, studioId: string): Promise<SmartAlbumDTO[]> {
    const existing = await prisma.smartAlbum.findMany({
      where: { gallery_id: galleryId, studio_id: studioId },
    });

    if (existing.length > 0) {
      return existing.map((a) => this.mapToDTO(a));
    }

    const createdAlbums: SmartAlbumDTO[] = [];
    for (const def of DEFAULT_SYSTEM_SMART_ALBUMS) {
      const album = await prisma.smartAlbum.create({
        data: {
          studio_id: studioId,
          gallery_id: galleryId,
          name: def.name,
          description: def.description,
          type: SmartAlbumType.SYSTEM,
          rule_json: def.rule_json as unknown as Prisma.InputJsonValue,
          is_system: true,
          is_visible_to_client: def.is_visible_to_client,
          sort_mode: def.sort_mode,
        },
      });
      createdAlbums.push(this.mapToDTO(album));
    }

    return createdAlbums;
  }

  /**
   * Lists smart albums for a gallery.
   */
  static async listSmartAlbums(galleryId: string, studioId: string, publicOnly = false): Promise<SmartAlbumDTO[]> {
    const where: any = {
      gallery_id: galleryId,
      studio_id: studioId,
    };
    if (publicOnly) {
      where.is_visible_to_client = true;
    }

    const albums = await prisma.smartAlbum.findMany({
      where,
      orderBy: [{ is_system: 'desc' }, { created_at: 'asc' }],
    });

    return albums.map((a) => this.mapToDTO(a));
  }

  /**
   * Creates a custom smart album with validated AST rules.
   */
  static async createSmartAlbum(params: {
    galleryId: string;
    studioId: string;
    name: string;
    description?: string;
    rule_json: SmartAlbumRuleAST;
    is_visible_to_client?: boolean;
    sort_mode?: string;
  }): Promise<SmartAlbumDTO> {
    const { galleryId, studioId, name, description, rule_json, is_visible_to_client = false, sort_mode = 'BEST_SHOT_FIRST' } = params;

    // Validate Rule AST structure (Strict Anti-Code-Execution Validation)
    if (!rule_json || !Array.isArray(rule_json.conditions)) {
      throw new Error('INVALID_RULE_JSON: rule_json must be an object with conditions array');
    }

    const allowedConjunctions = ['AND', 'OR'];
    if (!allowedConjunctions.includes(rule_json.conjunction)) {
      rule_json.conjunction = 'AND';
    }

    const album = await prisma.smartAlbum.create({
      data: {
        studio_id: studioId,
        gallery_id: galleryId,
        name: name.trim(),
        description: description?.trim(),
        type: SmartAlbumType.CUSTOM,
        rule_json: rule_json as unknown as Prisma.InputJsonValue,
        is_system: false,
        is_visible_to_client,
        sort_mode,
      },
    });

    return this.mapToDTO(album);
  }

  /**
   * Updates an existing smart album.
   */
  static async updateSmartAlbum(
    albumId: string,
    galleryId: string,
    studioId: string,
    updates: {
      name?: string;
      description?: string;
      rule_json?: SmartAlbumRuleAST;
      is_visible_to_client?: boolean;
      sort_mode?: string;
    }
  ): Promise<SmartAlbumDTO> {
    const album = await prisma.smartAlbum.findFirst({
      where: { id: albumId, gallery_id: galleryId, studio_id: studioId },
    });

    if (!album) {
      throw new Error('Smart Album not found or access denied');
    }

    const data: any = {};
    if (updates.name !== undefined) data.name = updates.name.trim();
    if (updates.description !== undefined) data.description = updates.description.trim();
    if (updates.is_visible_to_client !== undefined) data.is_visible_to_client = updates.is_visible_to_client;
    if (updates.sort_mode !== undefined) data.sort_mode = updates.sort_mode;
    if (updates.rule_json !== undefined && Array.isArray(updates.rule_json.conditions)) {
      data.rule_json = updates.rule_json as unknown as Prisma.InputJsonValue;
    }

    const updated = await prisma.smartAlbum.update({
      where: { id: albumId },
      data,
    });

    return this.mapToDTO(updated);
  }

  /**
   * Deletes a custom smart album (System albums cannot be deleted).
   */
  static async deleteSmartAlbum(albumId: string, galleryId: string, studioId: string): Promise<boolean> {
    const album = await prisma.smartAlbum.findFirst({
      where: { id: albumId, gallery_id: galleryId, studio_id: studioId },
    });

    if (!album) {
      throw new Error('Smart Album not found');
    }

    if (album.is_system) {
      throw new Error('CANNOT_DELETE_SYSTEM_ALBUM: System smart albums cannot be deleted. You can hide them from clients.');
    }

    await prisma.smartAlbum.delete({
      where: { id: albumId },
    });

    return true;
  }

  /**
   * Retrieves all matching photos for a Smart Album evaluated via the sandboxed AST rule engine.
   */
  static async getSmartAlbumPhotos(
    albumId: string,
    galleryId: string,
    studioId: string,
    options?: { limit?: number; offset?: number }
  ): Promise<{ photos: any[]; total: number }> {
    const album = await prisma.smartAlbum.findFirst({
      where: { id: albumId, gallery_id: galleryId, studio_id: studioId },
    });

    if (!album) {
      throw new Error('Smart Album not found');
    }

    const ruleAST = album.rule_json as unknown as SmartAlbumRuleAST;

    // Fetch all analyzed photos for gallery
    const analyses = await prisma.photoAIAnalysis.findMany({
      where: { gallery_id: galleryId, studio_id: studioId },
      include: {
        photo: {
          include: {
            versions: { where: { version_type: 'THUMBNAIL_MD' } },
          },
        },
      },
    });

    // Filter using safe AST evaluator
    const matchingAnalyses = analyses.filter((analysis) => evaluateRuleAST(analysis, ruleAST));

    // Sort matching photos according to album sort mode
    if (album.sort_mode === 'BEST_SHOT_FIRST') {
      matchingAnalyses.sort((a, b) => b.best_shot_score - a.best_shot_score);
    } else if (album.sort_mode === 'QUALITY_DESC') {
      matchingAnalyses.sort((a, b) => b.quality_score - a.quality_score);
    } else {
      // Chronological
      matchingAnalyses.sort((a, b) => a.photo.created_at.getTime() - b.photo.created_at.getTime());
    }

    const limit = options?.limit || 100;
    const offset = options?.offset || 0;
    const paginated = matchingAnalyses.slice(offset, offset + limit);

    const photos = paginated.map((a) => {
      const thumb = a.photo.versions[0]?.url || a.photo.thumbnail_url || a.photo.original_url;
      return {
        id: a.photo.id,
        gallery_id: a.photo.gallery_id,
        original_filename: a.photo.original_filename,
        thumbnail_url: thumb,
        original_url: a.photo.original_url,
        quality_score: a.quality_score,
        best_shot_score: a.best_shot_score,
        is_best_shot: a.is_best_shot,
        scene_category: a.scene_category,
        moment_category: a.moment_category,
        people_count: a.people_count,
        width: a.photo.width,
        height: a.photo.height,
        file_size: Number(a.photo.file_size),
        created_at: a.photo.created_at.toISOString(),
      };
    });

    return {
      photos,
      total: matchingAnalyses.length,
    };
  }

  private static mapToDTO(album: any): SmartAlbumDTO {
    return {
      id: album.id,
      studio_id: album.studio_id,
      gallery_id: album.gallery_id,
      name: album.name,
      description: album.description,
      type: album.type as SmartAlbumType,
      rule_json: album.rule_json as unknown as SmartAlbumRuleAST,
      is_system: album.is_system,
      is_visible_to_client: album.is_visible_to_client,
      sort_mode: album.sort_mode,
      cover_photo_url: album.cover_photo_url,
      created_at: album.created_at,
      updated_at: album.updated_at,
    };
  }
}
