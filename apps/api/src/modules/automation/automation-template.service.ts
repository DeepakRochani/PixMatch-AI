/**
 * Automation Template Service — PIXMatch AI Phase 16
 * Provides canonical system automation templates and studio-custom template management.
 */

import {
  AutomationActionType,
  AutomationTriggerType,
  AutomationTemplateCategory,
  AutomationTemplateDTO,
  AutomationWorkflowConfigDTO,
} from '@pixmatch/types';
import { prisma } from '@pixmatch/database';

export const SYSTEM_TEMPLATES: Omit<AutomationTemplateDTO, 'created_at' | 'updated_at'>[] = [
  {
    id: 'template-wedding-auto-prep',
    studio_id: null,
    name: 'Wedding Auto Prep',
    description: 'End-to-end processing, AI intelligence, smart albums, event story, cover recommendation, and gallery health check for weddings.',
    category: AutomationTemplateCategory.WEDDING,
    is_system: true,
    enabled: true,
    workflow_config: {
      version: 1,
      steps: [
        { id: 'process', name: 'Process Photos', action: AutomationActionType.PROCESS_PHOTOS },
        { id: 'intelligence', name: 'Run Photo Intelligence', action: AutomationActionType.RUN_PHOTO_INTELLIGENCE, dependsOn: ['process'] },
        { id: 'face_index', name: 'Index Faces', action: AutomationActionType.RUN_FACE_INDEXING, dependsOn: ['process'] },
        { id: 'event_intel', name: 'Analyze Event Intelligence', action: AutomationActionType.RUN_EVENT_INTELLIGENCE, dependsOn: ['intelligence'] },
        { id: 'smart_albums', name: 'Generate Smart Albums', action: AutomationActionType.GENERATE_SMART_ALBUMS, dependsOn: ['intelligence'] },
        { id: 'event_story', name: 'Generate Event Story', action: AutomationActionType.GENERATE_EVENT_STORY, dependsOn: ['event_intel'] },
        { id: 'cover_rec', name: 'Generate Cover Recommendation', action: AutomationActionType.GENERATE_COVER_RECOMMENDATION, dependsOn: ['intelligence'] },
        { id: 'health_check', name: 'Run Gallery Health Check', action: AutomationActionType.RUN_GALLERY_HEALTH_CHECK, dependsOn: ['smart_albums', 'event_story', 'face_index'] },
        { id: 'completeness', name: 'Run Completeness Check', action: AutomationActionType.RUN_COMPLETENESS_CHECK, dependsOn: ['health_check'] },
        { id: 'notify', name: 'Notify Studio', action: AutomationActionType.SEND_STUDIO_NOTIFICATION, dependsOn: ['completeness'] },
      ],
      failureHandling: {
        retryFailedStep: true,
        maxRetries: 3,
        continueOnNonCriticalFailure: true,
        notifyOnFailure: true,
      },
      notifications: {
        notifyOnStart: false,
        notifyOnComplete: true,
        notifyOnApprovalRequired: true,
        notifyOnFailure: true,
      },
    },
  },
  {
    id: 'template-fast-gallery',
    studio_id: null,
    name: 'Fast Gallery',
    description: 'Rapid photo processing and face indexing for quick turnaround portrait or party shoots.',
    category: AutomationTemplateCategory.GENERAL,
    is_system: true,
    enabled: true,
    workflow_config: {
      version: 1,
      steps: [
        { id: 'process', name: 'Process Photos', action: AutomationActionType.PROCESS_PHOTOS },
        { id: 'face_index', name: 'Index Faces', action: AutomationActionType.RUN_FACE_INDEXING, dependsOn: ['process'] },
        { id: 'health_check', name: 'Check Gallery Health', action: AutomationActionType.RUN_GALLERY_HEALTH_CHECK, dependsOn: ['face_index'] },
      ],
      failureHandling: {
        retryFailedStep: true,
        maxRetries: 2,
        continueOnNonCriticalFailure: false,
      },
    },
  },
  {
    id: 'template-full-ai-gallery',
    studio_id: null,
    name: 'Full AI Gallery',
    description: 'Comprehensive AI suite including tagging, quality analysis, event stories, highlights, and health audit.',
    category: AutomationTemplateCategory.CORPORATE,
    is_system: true,
    enabled: true,
    workflow_config: {
      version: 1,
      steps: [
        { id: 'process', name: 'Process Photos', action: AutomationActionType.PROCESS_PHOTOS },
        { id: 'intelligence', name: 'Run Photo Intelligence', action: AutomationActionType.RUN_PHOTO_INTELLIGENCE, dependsOn: ['process'] },
        { id: 'face_index', name: 'Index Faces', action: AutomationActionType.RUN_FACE_INDEXING, dependsOn: ['process'] },
        { id: 'event_intel', name: 'Analyze Event Intelligence', action: AutomationActionType.RUN_EVENT_INTELLIGENCE, dependsOn: ['intelligence'] },
        { id: 'smart_albums', name: 'Generate Smart Albums', action: AutomationActionType.GENERATE_SMART_ALBUMS, dependsOn: ['intelligence'] },
        { id: 'event_story', name: 'Generate Event Story', action: AutomationActionType.GENERATE_EVENT_STORY, dependsOn: ['event_intel'] },
        { id: 'highlights', name: 'Generate Highlight Recommendations', action: AutomationActionType.GENERATE_HIGHLIGHT_RECOMMENDATIONS, dependsOn: ['event_intel'] },
        { id: 'health_check', name: 'Check Gallery Health', action: AutomationActionType.RUN_GALLERY_HEALTH_CHECK, dependsOn: ['smart_albums', 'event_story', 'highlights'] },
      ],
      failureHandling: {
        retryFailedStep: true,
        maxRetries: 3,
        continueOnNonCriticalFailure: true,
      },
    },
  },
  {
    id: 'template-client-delivery-ready',
    studio_id: null,
    name: 'Client Delivery Ready',
    description: 'Verifies pre-flight completeness and gallery health, then creates an approval request for client delivery.',
    category: AutomationTemplateCategory.GENERAL,
    is_system: true,
    enabled: true,
    workflow_config: {
      version: 1,
      steps: [
        { id: 'completeness', name: 'Run Completeness Check', action: AutomationActionType.RUN_COMPLETENESS_CHECK },
        { id: 'health_check', name: 'Check Gallery Health', action: AutomationActionType.RUN_GALLERY_HEALTH_CHECK, dependsOn: ['completeness'] },
        { id: 'request_approval', name: 'Create Approval Request', action: AutomationActionType.CREATE_APPROVAL_REQUEST, dependsOn: ['health_check'] },
      ],
      failureHandling: {
        retryFailedStep: false,
        continueOnNonCriticalFailure: false,
      },
    },
  },
  {
    id: 'template-failed-job-recovery',
    studio_id: null,
    name: 'Failed Job Recovery',
    description: 'Automatically detects failed processing jobs, retries them, and performs a health audit.',
    category: AutomationTemplateCategory.CUSTOM,
    is_system: true,
    enabled: true,
    workflow_config: {
      version: 1,
      steps: [
        { id: 'retry_failed', name: 'Retry Failed Processing', action: AutomationActionType.RETRY_FAILED_PROCESSING },
        { id: 'health_check', name: 'Verify Gallery Health', action: AutomationActionType.RUN_GALLERY_HEALTH_CHECK, dependsOn: ['retry_failed'] },
        { id: 'notify', name: 'Notify Studio', action: AutomationActionType.SEND_STUDIO_NOTIFICATION, dependsOn: ['health_check'] },
      ],
      failureHandling: {
        retryFailedStep: true,
        maxRetries: 2,
        continueOnNonCriticalFailure: true,
      },
    },
  },
];

export class AutomationTemplateService {
  private db: any;

  constructor(dbClient?: any) {
    this.db = dbClient || prisma;
  }

  /**
   * Returns all available templates for a studio (system templates + studio custom templates).
   */
  public async listTemplates(studioId?: string): Promise<AutomationTemplateDTO[]> {
    const customTemplates = studioId
      ? await this.db.automationTemplate.findMany({
          where: {
            OR: [{ is_system: true }, { studio_id: studioId }],
            enabled: true,
          },
          orderBy: [{ is_system: 'desc' }, { created_at: 'asc' }],
        })
      : [];

    if (customTemplates.length > 0) {
      return customTemplates.map((t: any) => ({
        id: t.id,
        studio_id: t.studio_id,
        name: t.name,
        description: t.description,
        category: t.category as AutomationTemplateCategory,
        workflow_config: t.workflow_config as AutomationWorkflowConfigDTO,
        is_system: t.is_system,
        enabled: t.enabled,
        created_at: t.created_at,
        updated_at: t.updated_at,
      }));
    }

    // Return in-memory fallback system templates if DB is empty
    return SYSTEM_TEMPLATES.map((t) => ({
      ...t,
      created_at: new Date(),
      updated_at: new Date(),
    }));
  }

  /**
   * Retrieves a template by its ID.
   */
  public async getTemplateById(templateId: string, studioId?: string): Promise<AutomationTemplateDTO | null> {
    const foundInSystem = SYSTEM_TEMPLATES.find((t) => t.id === templateId);
    if (foundInSystem) {
      return {
        ...foundInSystem,
        created_at: new Date(),
        updated_at: new Date(),
      };
    }

    const dbTemplate = await this.db.automationTemplate.findFirst({
      where: {
        id: templateId,
        OR: [{ is_system: true }, ...(studioId ? [{ studio_id: studioId }] : [])],
      },
    });

    if (!dbTemplate) return null;

    return {
      id: dbTemplate.id,
      studio_id: dbTemplate.studio_id,
      name: dbTemplate.name,
      description: dbTemplate.description,
      category: dbTemplate.category as AutomationTemplateCategory,
      workflow_config: dbTemplate.workflow_config as AutomationWorkflowConfigDTO,
      is_system: dbTemplate.is_system,
      enabled: dbTemplate.enabled,
      created_at: dbTemplate.created_at,
      updated_at: dbTemplate.updated_at,
    };
  }

  /**
   * Seeds system templates into the database if not present.
   */
  public async seedSystemTemplates(): Promise<void> {
    for (const sys of SYSTEM_TEMPLATES) {
      const exists = await this.db.automationTemplate.findFirst({
        where: { id: sys.id },
      });
      if (!exists) {
        await this.db.automationTemplate.create({
          data: {
            id: sys.id,
            name: sys.name,
            description: sys.description,
            category: sys.category,
            workflow_config: sys.workflow_config,
            is_system: true,
            enabled: true,
          },
        });
      }
    }
  }
}
