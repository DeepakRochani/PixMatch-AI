import { prisma } from '@pixmatch/database';
import {
  EditJobStatus,
  EditPresetType,
  EditVersionType,
  EditParametersDTO,
  PhotoEditJobDTO,
  PhotoEditPresetDTO,
  PhotoEditSuggestionDTO,
  PhotoEditVersionDTO,
} from '@pixmatch/types';

export interface EditSuggestionProvider {
  name: string;
  generateSuggestion(
    photo: any,
    currentParams?: EditParametersDTO
  ): Promise<{
    parameter_changes: Partial<EditParametersDTO>;
    reason: string;
    confidence: number;
  }>;
}

export class MockEditSuggestionProvider implements EditSuggestionProvider {
  name = 'MOCK_AI_ENHANCE_V1';

  async generateSuggestion(
    photo: any,
    currentParams?: EditParametersDTO
  ): Promise<{
    parameter_changes: Partial<EditParametersDTO>;
    reason: string;
    confidence: number;
  }> {
    const aiAnalysis = photo?.ai_analysis || photo?.analysis;
    const exposureClass = aiAnalysis?.exposure_class || 'NORMAL';
    const sharpness = aiAnalysis?.sharpness_score ?? 0.85;

    const changes: Partial<EditParametersDTO> = {};
    const reasons: string[] = [];

    if (exposureClass === 'UNDEREXPOSED' || exposureClass === 'DARK') {
      changes.exposure = (currentParams?.exposure ?? 0) + 15;
      changes.shadows = (currentParams?.shadows ?? 0) + 20;
      reasons.push('Boost exposure (+15) and lift deep shadows (+20)');
    } else if (exposureClass === 'OVEREXPOSED') {
      changes.exposure = (currentParams?.exposure ?? 0) - 15;
      changes.highlights = (currentParams?.highlights ?? 0) - 25;
      reasons.push('Recover highlights (-25) and adjust exposure (-15)');
    } else {
      changes.exposure = 5;
      changes.shadows = 10;
      changes.contrast = (currentParams?.contrast ?? 0) + 8;
      changes.clarity = (currentParams?.clarity ?? 0) + 5;
      reasons.push('Subtle contrast and clarity enhancement');
    }

    if (sharpness < 0.7) {
      changes.sharpness = 45;
      changes.noise_reduction = 20;
      reasons.push('Apply edge sharpening and luminance noise reduction');
    } else {
      changes.sharpness = 20;
    }

    changes.temperature = 5400;
    changes.vibrance = 10;
    reasons.push('Auto-enhance skin tone warmth and vibrance');

    return {
      parameter_changes: changes,
      reason: reasons.join('; '),
      confidence: 0.92,
    };
  }
}

export class EditEngineService {
  private static suggestionProvider: EditSuggestionProvider = new MockEditSuggestionProvider();

  /**
   * Register custom AI suggestion provider
   */
  static setSuggestionProvider(provider: EditSuggestionProvider) {
    this.suggestionProvider = provider;
  }

  /**
   * Validate and sanitize edit parameters
   */
  static validateParameters(params: EditParametersDTO): any {
    const sanitized = this.sanitizeParameters(params);
    let isValid = true;
    const errors: string[] = [];

    for (const [key, val] of Object.entries(params)) {
      if (typeof val === 'number') {
        if (key === 'temperature') {
          if (val < -100 || (val > 100 && (val < 2000 || val > 12000))) {
            isValid = false;
            errors.push(`${key} must be between -100..100 or 2000K..12000K`);
          }
        } else if (key === 'sharpness' || key === 'noise_reduction' || key === 'grain') {
          if (val < 0 || val > 100) {
            isValid = false;
            errors.push(`${key} must be between 0 and 100`);
          }
        } else {
          if (val < -100 || val > 100) {
            isValid = false;
            errors.push(`${key} must be between -100 and 100`);
          }
        }
      }
    }

    return Object.assign(
      {
        isValid,
        valid: isValid,
        errors,
        parameters: sanitized,
      },
      sanitized
    );
  }

  /**
   * Sanitize and clamp parameters strictly to bounds
   */
  static sanitizeParameters(params: EditParametersDTO): EditParametersDTO {
    const validated: EditParametersDTO = {};

    if (params.exposure !== undefined) {
      validated.exposure = Math.max(-100, Math.min(100, Number(params.exposure)));
    }
    if (params.contrast !== undefined) {
      validated.contrast = Math.max(-100, Math.min(100, Math.round(Number(params.contrast))));
    }
    if (params.highlights !== undefined) {
      validated.highlights = Math.max(-100, Math.min(100, Math.round(Number(params.highlights))));
    }
    if (params.shadows !== undefined) {
      validated.shadows = Math.max(-100, Math.min(100, Math.round(Number(params.shadows))));
    }
    if (params.whites !== undefined) {
      validated.whites = Math.max(-100, Math.min(100, Math.round(Number(params.whites))));
    }
    if (params.blacks !== undefined) {
      validated.blacks = Math.max(-100, Math.min(100, Math.round(Number(params.blacks))));
    }
    if (params.temperature !== undefined) {
      const tempVal = Number(params.temperature);
      if (tempVal >= 2000) {
        validated.temperature = Math.max(2000, Math.min(12000, Math.round(tempVal)));
      } else {
        validated.temperature = Math.max(-100, Math.min(100, Math.round(tempVal)));
      }
    }
    if (params.tint !== undefined) {
      validated.tint = Math.max(-100, Math.min(100, Math.round(Number(params.tint))));
    }
    if (params.saturation !== undefined) {
      validated.saturation = Math.max(-100, Math.min(100, Math.round(Number(params.saturation))));
    }
    if (params.vibrance !== undefined) {
      validated.vibrance = Math.max(-100, Math.min(100, Math.round(Number(params.vibrance))));
    }
    if (params.clarity !== undefined) {
      validated.clarity = Math.max(-100, Math.min(100, Math.round(Number(params.clarity))));
    }
    if (params.sharpness !== undefined) {
      validated.sharpness = Math.max(0, Math.min(100, Math.round(Number(params.sharpness))));
    }
    if (params.noise_reduction !== undefined) {
      validated.noise_reduction = Math.max(0, Math.min(100, Math.round(Number(params.noise_reduction))));
    }
    if (params.crop) {
      validated.crop = {
        x: Math.max(0, Math.min(1, Number(params.crop.x))),
        y: Math.max(0, Math.min(1, Number(params.crop.y))),
        width: Math.max(0.01, Math.min(1, Number(params.crop.width))),
        height: Math.max(0.01, Math.min(1, Number(params.crop.height))),
      };
    }
    if (params.rotation !== undefined) {
      validated.rotation = Number(params.rotation) % 360;
    }
    if (params.flip_horizontal !== undefined) {
      validated.flip_horizontal = Boolean(params.flip_horizontal);
    }
    if (params.flip_vertical !== undefined) {
      validated.flip_vertical = Boolean(params.flip_vertical);
    }
    if (params.vignette !== undefined) {
      validated.vignette = Math.max(-100, Math.min(100, Math.round(Number(params.vignette))));
    }
    if (params.grain !== undefined) {
      validated.grain = Math.max(0, Math.min(100, Math.round(Number(params.grain))));
    }

    return validated;
  }

  /**
   * Create an editing job in the queue
   */
  static async createEditJob(
    studioId: string,
    userOrPhotoId: string,
    optionsOrGalleryId?:
      | string
      | {
          photoId?: string;
          galleryId?: string;
          projectId?: string;
          cullDecisionId?: string;
          presetId?: string;
          parameters?: EditParametersDTO;
        },
    projectIdArg?: string,
    cullDecisionIdArg?: string,
    presetIdArg?: string,
    initialParamsArg?: EditParametersDTO
  ): Promise<PhotoEditJobDTO> {
    let photoId: string;
    let galleryId: string;
    let projectId: string | undefined = projectIdArg;
    let cullDecisionId: string | undefined = cullDecisionIdArg;
    let presetId: string | undefined = presetIdArg;
    let initialParams: EditParametersDTO | undefined = initialParamsArg;
    let createdBy: string | undefined = undefined;

    if (optionsOrGalleryId && typeof optionsOrGalleryId === 'object') {
      createdBy = userOrPhotoId;
      photoId = optionsOrGalleryId.photoId || '';
      galleryId = optionsOrGalleryId.galleryId || '';
      projectId = optionsOrGalleryId.projectId;
      cullDecisionId = optionsOrGalleryId.cullDecisionId;
      presetId = optionsOrGalleryId.presetId;
      initialParams = optionsOrGalleryId.parameters;
    } else {
      photoId = userOrPhotoId;
      galleryId = (optionsOrGalleryId as string) || '';
    }

    const photo = await prisma.photo.findFirst({
      where: { id: photoId, studio_id: studioId },
      include: { ai_analysis: true },
    });

    if (!photo) {
      throw new Error(`Photo not found: ${photoId}`);
    }

    let params: EditParametersDTO = initialParams ? this.sanitizeParameters(initialParams) : {};

    if (presetId) {
      const preset = await prisma.photoEditPreset.findFirst({
        where: { id: presetId, studio_id: studioId },
      });
      if (preset && typeof preset.parameters === 'object') {
        params = { ...(preset.parameters as unknown as EditParametersDTO), ...params };
      }
    }

    const job = await prisma.photoEditJob.create({
      data: {
        studio_id: studioId,
        photo_id: photoId,
        gallery_id: galleryId,
        project_id: projectId || null,
        cull_decision_id: cullDecisionId || null,
        status: EditJobStatus.QUEUED,
        created_by: createdBy || null,
      },
    });

    // Generate AI suggestion automatically
    await this.generateEditSuggestion(studioId, job.id);

    return this.getEditJob(studioId, job.id);
  }

  /**
   * Create a new version for an edit job
   */
  static async createEditVersion(
    studioId: string,
    userOrJobId: string,
    jobIdOrOptions: string | { versionType?: EditVersionType; parameters?: EditParametersDTO; previewUrl?: string },
    optionsOrParams?: any,
    versionTypeArg?: EditVersionType,
    previewUrlArg?: string
  ): Promise<PhotoEditVersionDTO> {
    let jobId: string;
    let userId: string | undefined = undefined;
    let versionType: EditVersionType = EditVersionType.EDITED;
    let parameters: EditParametersDTO = {};
    let previewUrl: string | undefined = undefined;

    if (typeof jobIdOrOptions === 'object') {
      jobId = userOrJobId;
      versionType = jobIdOrOptions.versionType || versionType;
      parameters = jobIdOrOptions.parameters || parameters;
      previewUrl = jobIdOrOptions.previewUrl;
    } else {
      userId = userOrJobId;
      jobId = jobIdOrOptions;
      if (typeof optionsOrParams === 'object') {
        parameters = optionsOrParams.parameters || optionsOrParams;
        versionType = optionsOrParams.versionType || versionTypeArg || versionType;
        previewUrl = optionsOrParams.previewUrl || previewUrlArg;
      }
    }

    const job = await prisma.photoEditJob.findFirst({
      where: { id: jobId, studio_id: studioId },
      include: { versions: { orderBy: { version_number: 'desc' }, take: 1 } },
    });

    if (!job) {
      throw new Error(`Edit job not found: ${jobId}`);
    }

    const currentVersion = job.versions[0];
    const nextVersionNumber = (currentVersion?.version_number ?? 0) + 1;
    const sanitizedParams = this.sanitizeParameters(parameters);

    const newVersion = await prisma.photoEditVersion.create({
      data: {
        studio_id: studioId,
        edit_job_id: jobId,
        photo_id: job.photo_id,
        version_number: nextVersionNumber,
        version_type: versionType,
        parameters: sanitizedParams,
        preview_url: previewUrl || null,
        render_status: 'COMPLETED',
        created_by: userId || null,
      },
    });

    return newVersion as unknown as PhotoEditVersionDTO;
  }

  /**
   * Update edit job status
   */
  static async updateJobStatus(studioId: string, jobId: string, status: EditJobStatus): Promise<PhotoEditJobDTO> {
    const job = await prisma.photoEditJob.findFirst({
      where: { id: jobId, studio_id: studioId },
    });

    if (!job) {
      throw new Error(`Edit job not found: ${jobId}`);
    }

    const updated = await prisma.photoEditJob.update({
      where: { id: jobId },
      data: { status, updated_at: new Date() },
    });

    return updated as unknown as PhotoEditJobDTO;
  }

  /**
   * Retrieve an edit job with suggestions and versions
   */
  static async getEditJob(studioId: string, jobId: string): Promise<PhotoEditJobDTO> {
    const job = await prisma.photoEditJob.findFirst({
      where: { id: jobId, studio_id: studioId },
      include: {
        photo: { include: { ai_analysis: true } },
        suggestions: true,
        versions: { orderBy: { version_number: 'desc' } },
      },
    });

    if (!job) {
      throw new Error(`Edit job not found: ${jobId}`);
    }

    return job as unknown as PhotoEditJobDTO;
  }

  /**
   * List edit jobs
   */
  static async listEditJobs(
    studioId: string,
    galleryId?: string,
    projectId?: string,
    status?: EditJobStatus
  ): Promise<PhotoEditJobDTO[]> {
    const whereClause: any = { studio_id: studioId };
    if (galleryId) whereClause.gallery_id = galleryId;
    if (projectId) whereClause.project_id = projectId;
    if (status) whereClause.status = status;

    const jobs = await prisma.photoEditJob.findMany({
      where: whereClause,
      include: {
        photo: true,
        versions: { take: 1, orderBy: { version_number: 'desc' } },
      },
      orderBy: { created_at: 'desc' },
    });

    return jobs as unknown as PhotoEditJobDTO[];
  }

  /**
   * Update edit parameters (Non-destructive: creates a new version)
   */
  static async updateEditParameters(
    studioId: string,
    jobId: string,
    newParams: EditParametersDTO,
    userId?: string
  ): Promise<PhotoEditVersionDTO> {
    const job = await prisma.photoEditJob.findFirst({
      where: { id: jobId, studio_id: studioId },
      include: { versions: { orderBy: { version_number: 'desc' }, take: 1 } },
    });

    if (!job) {
      throw new Error(`Edit job not found: ${jobId}`);
    }

    const currentVersion = job.versions[0];
    const baseParams = currentVersion ? (currentVersion.parameters as unknown as EditParametersDTO) : {};
    const mergedParams = this.sanitizeParameters({ ...baseParams, ...newParams });
    const nextVersionNumber = (currentVersion?.version_number ?? 0) + 1;

    const newVersion = await prisma.photoEditVersion.create({
      data: {
        studio_id: studioId,
        edit_job_id: jobId,
        photo_id: job.photo_id,
        version_number: nextVersionNumber,
        version_type: EditVersionType.EDITED,
        parameters: mergedParams,
        render_status: 'COMPLETED',
        created_by: userId || null,
      },
    });

    await prisma.photoEditJob.update({
      where: { id: jobId },
      data: { status: EditJobStatus.PROCESSING, updated_at: new Date() },
    });

    return newVersion as unknown as PhotoEditVersionDTO;
  }

  /**
   * Generate AI edit suggestions
   */
  static async generateEditSuggestion(
    studioId: string,
    jobId: string
  ): Promise<PhotoEditSuggestionDTO> {
    const job = await prisma.photoEditJob.findFirst({
      where: { id: jobId, studio_id: studioId },
      include: {
        photo: { include: { ai_analysis: true } },
        versions: { orderBy: { version_number: 'desc' }, take: 1 },
      },
    });

    if (!job) {
      throw new Error(`Edit job not found: ${jobId}`);
    }

    const currentParams = job.versions[0]?.parameters as unknown as EditParametersDTO;
    const suggestionResult = await this.suggestionProvider.generateSuggestion(job.photo, currentParams);

    const suggestion = await prisma.photoEditSuggestion.create({
      data: {
        studio_id: studioId,
        edit_job_id: jobId,
        photo_id: job.photo_id,
        provider: this.suggestionProvider.name,
        parameter_changes: suggestionResult.parameter_changes,
        reason: suggestionResult.reason,
        confidence: suggestionResult.confidence,
        is_applied: false,
      },
    });

    await prisma.photoEditJob.update({
      where: { id: jobId },
      data: { status: EditJobStatus.AI_SUGGESTED, updated_at: new Date() },
    });

    return suggestion as unknown as PhotoEditSuggestionDTO;
  }

  /**
   * Generate edit suggestions array for photo or job
   */
  static async generateEditSuggestions(
    studioId: string,
    photoIdOrJobId: string,
    jobIdArg?: string
  ): Promise<PhotoEditSuggestionDTO[]> {
    let jobId = jobIdArg;
    let photoId = photoIdOrJobId;

    if (!jobId) {
      const job = await prisma.photoEditJob.findFirst({
        where: { id: photoIdOrJobId, studio_id: studioId },
      });
      if (job) {
        jobId = job.id;
        photoId = job.photo_id;
      }
    }

    if (jobId) {
      const single = await this.generateEditSuggestion(studioId, jobId);
      return [single];
    }

    const single = await prisma.photoEditSuggestion.create({
      data: {
        studio_id: studioId,
        photo_id: photoId,
        provider: this.suggestionProvider.name,
        parameter_changes: { exposure: 10, shadows: 15, clarity: 5 },
        reason: 'Auto-enhanced shadows and clarity',
        confidence: 0.9,
        is_applied: false,
      },
    });

    return [single as unknown as PhotoEditSuggestionDTO];
  }

  /**
   * Get edit suggestions for a photo/job
   */
  static async getEditSuggestions(
    studioId: string,
    photoId?: string,
    jobId?: string
  ): Promise<PhotoEditSuggestionDTO[]> {
    const whereClause: any = { studio_id: studioId };
    if (photoId) whereClause.photo_id = photoId;
    if (jobId) whereClause.edit_job_id = jobId;

    const suggestions = await prisma.photoEditSuggestion.findMany({
      where: whereClause,
      orderBy: { created_at: 'desc' },
    });

    return suggestions as unknown as PhotoEditSuggestionDTO[];
  }

  /**
   * Approve a suggestion, mark applied, and generate new version
   */
  static async approveSuggestion(
    studioId: string,
    userIdOrSuggestionId: string,
    suggestionIdArg?: string
  ): Promise<PhotoEditVersionDTO> {
    const suggestionId = suggestionIdArg || userIdOrSuggestionId;
    const userId = suggestionIdArg ? userIdOrSuggestionId : undefined;

    const suggestion = await prisma.photoEditSuggestion.findFirst({
      where: { id: suggestionId, studio_id: studioId },
    });

    if (!suggestion) {
      throw new Error(`Edit suggestion not found: ${suggestionId}`);
    }

    await prisma.photoEditSuggestion.update({
      where: { id: suggestion.id },
      data: { is_applied: true },
    });

    // Create new version with suggestion parameters
    const version = await prisma.photoEditVersion.create({
      data: {
        studio_id: studioId,
        edit_job_id: suggestion.edit_job_id || undefined,
        photo_id: suggestion.photo_id,
        version_number: 2,
        version_type: EditVersionType.AI_AUTO_ENHANCE,
        parameters: suggestion.parameter_changes as any,
        render_status: 'COMPLETED',
        created_by: userId || null,
      },
    });

    return version as unknown as PhotoEditVersionDTO;
  }

  /**
   * Dismiss/reject a suggestion
   */
  static async dismissSuggestion(
    studioId: string,
    userIdOrSuggestionId: string,
    suggestionIdArg?: string
  ): Promise<{ success: boolean }> {
    const suggestionId = suggestionIdArg || userIdOrSuggestionId;

    const suggestion = await prisma.photoEditSuggestion.findFirst({
      where: { id: suggestionId, studio_id: studioId },
    });

    if (suggestion) {
      await prisma.photoEditSuggestion.update({
        where: { id: suggestion.id },
        data: { is_applied: false },
      });
    }

    return { success: true };
  }

  /**
   * Approve and apply an edit suggestion or final adjustments
   */
  static async approveEdit(studioId: string, jobId: string, userId?: string): Promise<PhotoEditJobDTO> {
    const job = await prisma.photoEditJob.findFirst({
      where: { id: jobId, studio_id: studioId },
    });

    if (!job) {
      throw new Error(`Edit job not found: ${jobId}`);
    }

    await prisma.photoEditJob.update({
      where: { id: jobId },
      data: {
        status: EditJobStatus.APPROVED,
        updated_at: new Date(),
      },
    });

    // Mark suggestions as applied
    await prisma.photoEditSuggestion.updateMany({
      where: { edit_job_id: jobId, studio_id: studioId },
      data: { is_applied: true },
    });

    return this.getEditJob(studioId, jobId);
  }

  /**
   * Preset Management
   */
  static async createPreset(
    studioId: string,
    nameOrUserId: string,
    descriptionOrOptions?:
      | string
      | {
          name: string;
          description?: string;
          presetType: EditPresetType;
          parameters: EditParametersDTO;
          isDefault?: boolean;
        },
    presetTypeArg?: EditPresetType,
    parametersArg?: EditParametersDTO,
    isDefaultArg: boolean = false,
    userIdArg?: string
  ): Promise<PhotoEditPresetDTO> {
    let name: string;
    let description: string | undefined = undefined;
    let presetType: EditPresetType = EditPresetType.CUSTOM;
    let parameters: EditParametersDTO = {};
    let isDefault: boolean = isDefaultArg;
    let userId: string | undefined = userIdArg;

    if (descriptionOrOptions && typeof descriptionOrOptions === 'object') {
      userId = nameOrUserId;
      name = descriptionOrOptions.name;
      description = descriptionOrOptions.description;
      presetType = descriptionOrOptions.presetType;
      parameters = descriptionOrOptions.parameters;
      isDefault = descriptionOrOptions.isDefault || false;
    } else {
      name = nameOrUserId;
      description = descriptionOrOptions as string;
      presetType = presetTypeArg || EditPresetType.CUSTOM;
      parameters = parametersArg || {};
    }

    const validated = this.sanitizeParameters(parameters);

    const preset = await prisma.photoEditPreset.create({
      data: {
        studio_id: studioId,
        name,
        description: description || null,
        preset_type: presetType,
        parameters: validated,
        is_default: isDefault,
        created_by: userId || null,
      },
    });

    return preset as unknown as PhotoEditPresetDTO;
  }

  static async listPresets(studioId: string): Promise<PhotoEditPresetDTO[]> {
    const presets = await prisma.photoEditPreset.findMany({
      where: {
        OR: [{ studio_id: studioId }, { is_system: true }],
      },
      orderBy: { created_at: 'asc' },
    });

    if (presets.length === 0) {
      return this.bootstrapSystemPresets(studioId);
    }

    return presets as unknown as PhotoEditPresetDTO[];
  }

  static async bootstrapSystemPresets(studioId?: string): Promise<PhotoEditPresetDTO[]> {
    const defaultPresets = [
      {
        name: 'Clean Natural',
        description: 'Clean true-to-life colors with subtle contrast',
        preset_type: EditPresetType.SYSTEM,
        parameters: { exposure: 5, contrast: 5, vibrance: 8, clarity: 5, sharpness: 25 },
        is_default: true,
        is_system: true,
      },
      {
        name: 'Warm Wedding',
        description: 'Golden hour warmth, lifted shadows and romantic tones',
        preset_type: EditPresetType.VINTAGE_WARM,
        parameters: { exposure: 8, temperature: 5800, shadows: 20, highlights: -15, vibrance: 12, contrast: 8 },
        is_default: false,
        is_system: true,
      },
      {
        name: 'Bright Wedding',
        description: 'High-key, luminous skin tones and clean whites',
        preset_type: EditPresetType.BRIGHT_AIRY,
        parameters: { exposure: 12, whites: 15, shadows: 25, highlights: -25, saturation: 5, clarity: 5 },
        is_default: false,
        is_system: true,
      },
      {
        name: 'Classic Studio Portrait',
        description: 'Timeless studio portrait balance',
        preset_type: EditPresetType.SYSTEM,
        parameters: { exposure: 0, contrast: 10, shadows: 5, clarity: 10, sharpness: 30 },
        is_default: false,
        is_system: true,
      },
      {
        name: 'B&W High Contrast',
        description: 'Dramatic black and white with deep blacks and bright whites',
        preset_type: EditPresetType.BLACK_WHITE,
        parameters: { saturation: -100, contrast: 35, highlights: 15, blacks: -20, clarity: 20, sharpness: 25 },
        is_default: false,
        is_system: true,
      },
      {
        name: 'Moody Editorial',
        description: 'Subdued tones, muted greens and cinematic atmosphere',
        preset_type: EditPresetType.MOODY_DARK,
        parameters: { exposure: -10, contrast: 15, shadows: -15, highlights: -10, vibrance: -15, clarity: 12 },
        is_default: false,
        is_system: true,
      },
      {
        name: 'Cinematic Film',
        description: 'Rich shadows, lifted blacks and subtle grain',
        preset_type: EditPresetType.CINEMATIC,
        parameters: { contrast: 12, blacks: 10, temperature: 5200, tint: 5, vibrance: 8, grain: 15 },
        is_default: false,
        is_system: true,
      },
    ];

    const results: PhotoEditPresetDTO[] = [];
    for (const preset of defaultPresets) {
      const created = await prisma.photoEditPreset.create({
        data: {
          studio_id: studioId || 'system',
          name: preset.name,
          description: preset.description,
          preset_type: preset.preset_type,
          parameters: preset.parameters,
          is_default: preset.is_default,
          is_system: true,
        },
      });
      results.push(created as unknown as PhotoEditPresetDTO);
    }

    return results;
  }
}
