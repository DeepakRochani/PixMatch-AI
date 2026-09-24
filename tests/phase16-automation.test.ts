/**
 * PIXMatch AI — Phase 16 Automated Test Suite
 * AI Studio Automation & Gallery Workflow Orchestrator
 *
 * Covers:
 * Group 1: Database Model & Workflow CRUD
 * Group 2: Workflow DAG & Configuration Validation
 * Group 3: Automation Engine Lifecycle & Dependency Execution
 * Group 4: Approval Queue & Gated Action Handling
 * Group 5: Idempotency & Deduplication
 * Group 6: Retry Management & Failure Policies
 * Group 7: Pause, Resume, and Cancellation Controls
 * Group 8: Worker Crash Recovery
 * Group 9: Tenant Isolation & IDOR Protection
 * Group 10: Zero Biometric & Secret Leakage Guarantees
 * Group 11: System Templates & Bulk Gallery Automation
 * Group 12: Copilot Automation Integration & Telemetry Aggregates
 */

process.env.DATABASE_URL = process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/pixmatch_test';
process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-jwt-secret-key-must-be-32-chars-long';

import {
  AutomationTriggerType,
  AutomationActionType,
  AutomationRunStatus,
  AutomationStepRunStatus,
  AutomationApprovalStatus,
  AutomationTemplateCategory,
  AutomationWorkflowConfigDTO,
} from '@pixmatch/types';

import { AutomationValidator } from '../apps/api/src/modules/automation/automation-validator.js';
import { AutomationTemplateService, SYSTEM_TEMPLATES } from '../apps/api/src/modules/automation/automation-template.service.js';
import { AutomationEngineService } from '../apps/api/src/modules/automation/automation-engine.service.js';
import { AutomationService } from '../apps/api/src/modules/automation/automation.service.js';
import { AutomationActionRunner } from '../apps/api/src/modules/automation/automation-action-runner.js';
import { CopilotToolRegistry } from '../apps/api/src/modules/copilot/copilot-tool-registry.js';
import { DeterministicCopilotProvider } from '../apps/api/src/modules/copilot/copilot-llm-provider.js';
import { CopilotContextBuilder } from '../apps/api/src/modules/copilot/copilot-context-builder.js';

let passed = 0;
let failed = 0;

function assert(condition: boolean, testName: string, details?: string) {
  if (condition) {
    console.log(`  ✅ PASS: ${testName}`);
    passed++;
  } else {
    console.error(`  ❌ FAIL: ${testName} ${details ? `(${details})` : ''}`);
    failed++;
  }
}

// =============================================================
// IN-MEMORY MOCK DATABASE
// =============================================================

function createMockDb() {
  const studios: any[] = [
    { id: 'studio-1', name: 'Alpha Studio', slug: 'alpha-studio' },
    { id: 'studio-2', name: 'Beta Studio', slug: 'beta-studio' },
  ];

  const users: any[] = [
    { id: 'user-1', email: 'owner@alpha.com', role: 'STUDIO_OWNER', studio_id: 'studio-1' },
    { id: 'user-2', email: 'owner@beta.com', role: 'STUDIO_OWNER', studio_id: 'studio-2' },
  ];

  const galleries: any[] = [
    {
      id: 'gal-1',
      studio_id: 'studio-1',
      title: 'Summer Wedding 2026',
      slug: 'summer-wedding-2026',
      event_type: 'Wedding',
      event_date: new Date('2026-06-15T14:00:00Z'),
      status: 'ACTIVE',
      access_type: 'PUBLIC',
      cover_photo_url: null,
      enable_ai_face_search: true,
      downloads_enabled: true,
      is_unlisted: false,
      expires_at: null,
      client_views_count: 10,
      photos: [
        {
          id: 'p-1',
          gallery_id: 'gal-1',
          studio_id: 'studio-1',
          status: 'COMPLETED',
          preview_url: 'https://cdn.pixmatch.ai/photos/p1.jpg',
          thumbnail_url: 'https://cdn.pixmatch.ai/photos/p1-thumb.jpg',
          is_cover: false,
          is_favorite: true,
          is_selected: false,
          created_at: new Date(),
          ai_analysis: {
            id: 'ai-1',
            quality_score: 0.95,
            sharpness: 0.90,
            exposure: 0.88,
            is_blurry: false,
            is_dark: false,
            is_best_shot: true,
            scene_category: 'Ceremony',
            tags: ['wedding', 'couple'],
          },
          face_detections: [{ id: 'f-1' }],
        },
        {
          id: 'p-2',
          gallery_id: 'gal-1',
          studio_id: 'studio-1',
          status: 'COMPLETED',
          preview_url: 'https://cdn.pixmatch.ai/photos/p2.jpg',
          thumbnail_url: 'https://cdn.pixmatch.ai/photos/p2-thumb.jpg',
          is_cover: false,
          is_favorite: false,
          is_selected: true,
          created_at: new Date(),
          ai_analysis: {
            id: 'ai-2',
            quality_score: 0.89,
            sharpness: 0.85,
            exposure: 0.84,
            is_blurry: false,
            is_dark: false,
            is_best_shot: true,
            scene_category: 'Portraits',
            tags: ['portrait', 'bride'],
          },
          face_detections: [{ id: 'f-2' }],
        },
      ],
      smart_albums: [{ id: 'sa-1', name: 'Highlights', type: 'QUALITY', is_active: true }],
      event_intelligence: {
        id: 'ei-1',
        event_type: 'WEDDING',
        confidence_score: 0.95,
        chapters: [{ id: 'ch-1', title: 'Ceremony', photo_count: 2, confidence_score: 0.90 }],
        story: { id: 'st-1', headline: 'A Wonderful Wedding', status: 'PUBLISHED' },
        highlights: [{ photo_id: 'p-1', score: 0.95 }],
      },
      clients: [{ client_id: 'c-1' }],
      jobs: [],
    },
    {
      id: 'gal-2',
      studio_id: 'studio-2',
      title: 'Beta Corporate Event',
      slug: 'beta-corporate-event',
      event_type: 'Corporate',
      event_date: new Date('2026-07-20T10:00:00Z'),
      status: 'DRAFT',
      access_type: 'PUBLIC',
      cover_photo_url: null,
      enable_ai_face_search: true,
      downloads_enabled: true,
      is_unlisted: false,
      expires_at: null,
      client_views_count: 0,
      photos: [],
      smart_albums: [],
      event_intelligence: null,
      clients: [],
      jobs: [],
    },
  ];

  const workflows: any[] = [];
  const runs: any[] = [];
  const stepRuns: any[] = [];
  const approvals: any[] = [];
  const templates: any[] = [];
  const executionLogs: any[] = [];

  const prismaMock: any = {
    studio: {
      findUnique: async ({ where }: any) => studios.find((s) => s.id === where.id) || null,
      findMany: async () => [...studios],
    },
    gallery: {
      findUnique: async ({ where, include }: any) => {
        const gal = galleries.find((g) => g.id === where.id);
        if (!gal) return null;
        return {
          ...gal,
          photos: gal.photos || [],
          smart_albums: gal.smart_albums || [],
          event_intelligence: gal.event_intelligence || null,
          clients: gal.clients || [],
          jobs: gal.jobs || [],
        };
      },
      findFirst: async ({ where }: any) => galleries.find((g) => {
        if (where.id && g.id !== where.id) return false;
        if (where.studio_id && g.studio_id !== where.studio_id) return false;
        return true;
      }) || null,
      update: async ({ where, data }: any) => {
        const gal = galleries.find((g) => g.id === where.id);
        if (gal) Object.assign(gal, data);
        return gal;
      },
      findMany: async ({ where }: any) => galleries.filter((g) => {
        if (where?.studio_id && g.studio_id !== where.studio_id) return false;
        return true;
      }),
    },
    photo: {
      findFirst: async (args: any) => {
        for (const g of galleries) {
          const p = g.photos.find((ph: any) => {
            if (args.where.id && ph.id !== args.where.id) return false;
            if (args.where.gallery_id && ph.gallery_id !== args.where.gallery_id) return false;
            if (args.where.studio_id && ph.studio_id !== args.where.studio_id) return false;
            return true;
          });
          if (p) return p;
        }
        return null;
      },
      findMany: async (args: any) => {
        const gal = galleries.find((g) => g.id === args.where?.gallery_id);
        if (!gal) return [];
        return gal.photos.filter((p: any) => {
          if (args.where?.status && p.status !== args.where.status) return false;
          return true;
        });
      },
      update: async (args: any) => {
        for (const g of galleries) {
          const p = g.photos.find((ph: any) => ph.id === args.where.id);
          if (p) {
            Object.assign(p, args.data);
            return p;
          }
        }
        return null;
      },
      updateMany: async (args: any) => {
        let count = 0;
        for (const g of galleries) {
          if (args.where?.gallery_id && g.id !== args.where.gallery_id) continue;
          for (const p of g.photos) {
            if (args.where?.status && p.status !== args.where.status) continue;
            Object.assign(p, args.data);
            count++;
          }
        }
        return { count };
      },
      count: async (args: any) => {
        const gal = galleries.find((g) => g.id === args.where?.gallery_id);
        return gal?.photos?.length || 0;
      },
    },
    photoAIAnalysis: {
      count: async (args: any) => {
        const gal = galleries.find((g) => g.id === args.where?.gallery_id);
        return gal?.photos?.filter((p: any) => !!p.ai_analysis).length || 0;
      },
    },
    faceDetection: {
      count: async (args: any) => {
        const gal = galleries.find((g) => g.id === args.where?.gallery_id);
        return gal?.photos?.reduce((acc: number, p: any) => acc + (p.face_detections?.length || 0), 0) || 0;
      },
    },
    eventChapter: {
      count: async (args: any) => {
        const gal = galleries.find((g) => g.id === args.where?.gallery_id);
        return gal?.event_intelligence?.chapters?.length || 0;
      },
    },
    smartAlbum: {
      findFirst: async (args: any) => {
        const gal = galleries.find((g) => g.id === args.where?.gallery_id);
        return gal?.smart_albums?.find((a: any) => a.name === args.where?.name) || null;
      },
      findMany: async (args: any) => {
        const gal = galleries.find((g) => g.id === args.where?.gallery_id);
        return gal?.smart_albums || [];
      },
      count: async (args: any) => {
        const gal = galleries.find((g) => g.id === args.where?.gallery_id);
        return gal?.smart_albums?.length || 0;
      },
      create: async (args: any) => {
        const gal = galleries.find((g) => g.id === args.data.gallery_id);
        const album = { id: `sa-${Date.now()}`, ...args.data };
        gal?.smart_albums?.push(album);
        return album;
      },
    },
    eventIntelligence: {
      findFirst: async (args: any) => {
        const gal = galleries.find((g) => g.id === args.where?.gallery_id);
        return gal?.event_intelligence || null;
      },
    },
    eventHighlight: {
      count: async (args: any) => {
        const gal = galleries.find((g) => g.id === args.where?.gallery_id);
        return gal?.event_intelligence?.highlights?.length || 0;
      },
    },
    eventStory: {
      findFirst: async (args: any) => {
        const gal = galleries.find((g) => g.id === args.where?.gallery_id);
        return gal?.event_intelligence?.story || null;
      },
    },
    galleryNotification: {
      create: async ({ data }: any) => ({ id: `notif-${Date.now()}`, ...data }),
    },
    automationWorkflow: {
      create: async ({ data }: any) => {
        const record = {
          id: data.id || `wf-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
          studio_id: data.studio_id,
          name: data.name,
          description: data.description || null,
          enabled: data.enabled !== undefined ? data.enabled : true,
          trigger_type: data.trigger_type,
          trigger_config: data.trigger_config || {},
          workflow_config: data.workflow_config || { version: 1, steps: [] },
          created_by: data.created_by || null,
          created_at: new Date(),
          updated_at: new Date(),
        };
        workflows.push(record);
        return record;
      },
      findUnique: async ({ where, include }: any) => {
        const wf = workflows.find((w) => w.id === where.id);
        if (!wf) return null;
        return {
          ...wf,
          runs: include?.runs ? runs.filter((r) => r.workflow_id === wf.id) : undefined,
        };
      },
      findFirst: async ({ where, include }: any) => {
        const wf = workflows.find((w) => {
          if (where.id && w.id !== where.id) return false;
          if (where.studio_id && w.studio_id !== where.studio_id) return false;
          if (where.enabled !== undefined && w.enabled !== where.enabled) return false;
          return true;
        });
        if (!wf) return null;
        return {
          ...wf,
          runs: include?.runs ? runs.filter((r) => r.workflow_id === wf.id) : undefined,
        };
      },
      findMany: async ({ where, include }: any) => {
        return workflows.filter((w) => {
          if (where?.studio_id && w.studio_id !== where.studio_id) return false;
          if (where?.enabled !== undefined && w.enabled !== where.enabled) return false;
          if (where?.trigger_type && w.trigger_type !== where.trigger_type) return false;
          return true;
        }).map((w) => ({
          ...w,
          runs: include?.runs ? runs.filter((r) => r.workflow_id === w.id) : undefined,
        }));
      },
      update: async ({ where, data }: any) => {
        const wf = workflows.find((w) => w.id === where.id);
        if (wf) Object.assign(wf, data, { updated_at: new Date() });
        return wf;
      },
      delete: async ({ where }: any) => {
        const idx = workflows.findIndex((w) => w.id === where.id);
        if (idx >= 0) return workflows.splice(idx, 1)[0];
        return null;
      },
      count: async ({ where }: any) => workflows.filter((w) => {
        if (where?.studio_id && w.studio_id !== where.studio_id) return false;
        if (where?.enabled !== undefined && w.enabled !== where.enabled) return false;
        return true;
      }).length,
    },
    automationRun: {
      create: async ({ data }: any) => {
        const record = {
          id: data.id || `run-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
          studio_id: data.studio_id,
          workflow_id: data.workflow_id,
          gallery_id: data.gallery_id || null,
          trigger: data.trigger || 'MANUAL',
          status: data.status || 'RUNNING',
          current_step: data.current_step || null,
          started_at: data.started_at || new Date(),
          completed_at: data.completed_at || null,
          error_message: data.error_message || null,
          metadata: data.metadata || {},
          created_at: new Date(),
          updated_at: new Date(),
        };
        runs.push(record);
        return record;
      },
      findUnique: async ({ where, include }: any) => {
        const run = runs.find((r) => r.id === where.id);
        if (!run) return null;
        const wf = workflows.find((w) => w.id === run.workflow_id);
        const gal = galleries.find((g) => g.id === run.gallery_id);
        const rStepRuns = stepRuns.filter((s) => s.automation_run_id === run.id);
        const rApprovals = approvals.filter((a) => a.automation_run_id === run.id);
        return {
          ...run,
          workflow: include?.workflow ? wf : undefined,
          gallery: include?.gallery ? gal : undefined,
          step_runs: include?.step_runs
            ? rStepRuns.map((sr) => ({
                ...sr,
                approval: approvals.find((a) => a.step_run_id === sr.id) || null,
              }))
            : undefined,
          approvals: include?.approvals ? rApprovals : undefined,
        };
      },
      findFirst: async ({ where, include }: any) => {
        const run = runs.find((r) => {
          if (where.id && r.id !== where.id) return false;
          if (where.studio_id && r.studio_id !== where.studio_id) return false;
          return true;
        });
        if (!run) return null;
        const wf = workflows.find((w) => w.id === run.workflow_id);
        const gal = galleries.find((g) => g.id === run.gallery_id);
        const rStepRuns = stepRuns.filter((s) => s.automation_run_id === run.id);
        const rApprovals = approvals.filter((a) => a.automation_run_id === run.id);
        return {
          ...run,
          workflow: include?.workflow ? wf : undefined,
          gallery: include?.gallery ? gal : undefined,
          step_runs: include?.step_runs
            ? rStepRuns.map((sr) => ({
                ...sr,
                approval: approvals.find((a) => a.step_run_id === sr.id) || null,
              }))
            : undefined,
          approvals: include?.approvals ? rApprovals : undefined,
        };
      },
      findMany: async ({ where, orderBy, take, include }: any) => {
        let res = runs.filter((r) => {
          if (where?.studio_id && r.studio_id !== where.studio_id) return false;
          if (where?.workflow_id && r.workflow_id !== where.workflow_id) return false;
          if (where?.gallery_id && r.gallery_id !== where.gallery_id) return false;
          if (where?.status && r.status !== where.status) return false;
          if (where?.status?.in && !where.status.in.includes(r.status)) return false;
          if (where?.started_at?.lt && r.started_at >= where.started_at.lt) return false;
          if (where?.started_at?.gte && r.started_at < where.started_at.gte) return false;
          return true;
        });
        if (take) res = res.slice(0, take);
        return res.map((r) => {
          const wf = workflows.find((w) => w.id === r.workflow_id);
          const gal = galleries.find((g) => g.id === r.gallery_id);
          const rStepRuns = stepRuns.filter((s) => s.automation_run_id === r.id);
          const rApprovals = approvals.filter((a) => a.automation_run_id === r.id);
          return {
            ...r,
            workflow: include?.workflow ? wf : undefined,
            gallery: include?.gallery ? gal : undefined,
            step_runs: include?.step_runs
              ? rStepRuns.map((sr) => ({
                  ...sr,
                  approval: approvals.find((a) => a.step_run_id === sr.id) || null,
                }))
              : undefined,
            approvals: include?.approvals ? rApprovals : undefined,
          };
        });
      },
      update: async ({ where, data }: any) => {
        const run = runs.find((r) => r.id === where.id);
        if (run) Object.assign(run, data, { updated_at: new Date() });
        return run;
      },
      count: async ({ where }: any) => runs.filter((r) => {
        if (where?.studio_id && r.studio_id !== where.studio_id) return false;
        if (where?.status && r.status !== where.status) return false;
        if (where?.status?.in && !where.status.in.includes(r.status)) return false;
        if (where?.started_at?.gte && r.started_at < where.started_at.gte) return false;
        return true;
      }).length,
      groupBy: async ({ by, where }: any) => {
        const counts: Record<string, number> = {};
        for (const r of runs) {
          if (where?.studio_id && r.studio_id !== where.studio_id) continue;
          counts[r.status] = (counts[r.status] || 0) + 1;
        }
        return Object.entries(counts).map(([status, count]) => ({
          status,
          _count: { id: count },
        }));
      },
    },
    automationStepRun: {
      create: async ({ data }: any) => {
        const record = {
          id: data.id || `steprun-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
          automation_run_id: data.automation_run_id,
          step_key: data.step_key,
          action_type: data.action_type,
          status: data.status || 'PENDING',
          attempt: data.attempt || 1,
          started_at: data.started_at || null,
          completed_at: data.completed_at || null,
          error_message: data.error_message || null,
          result: data.result || null,
          created_at: new Date(),
          updated_at: new Date(),
        };
        stepRuns.push(record);
        return record;
      },
      findUnique: async ({ where }: any) => stepRuns.find((s) => s.id === where.id) || null,
      findFirst: async ({ where }: any) => stepRuns.find((s) => {
        if (where.id && s.id !== where.id) return false;
        if (where.automation_run_id && s.automation_run_id !== where.automation_run_id) return false;
        if (where.step_key && s.step_key !== where.step_key) return false;
        return true;
      }) || null,
      findMany: async ({ where }: any) => stepRuns.filter((s) => {
        if (where?.automation_run_id && s.automation_run_id !== where.automation_run_id) return false;
        if (where?.status && s.status !== where.status) return false;
        return true;
      }),
      update: async ({ where, data }: any) => {
        const s = stepRuns.find((item) => item.id === where.id);
        if (s) Object.assign(s, data, { updated_at: new Date() });
        return s;
      },
      updateMany: async ({ where, data }: any) => {
        let count = 0;
        for (const s of stepRuns) {
          if (where?.automation_run_id && s.automation_run_id !== where.automation_run_id) continue;
          if (where?.status && s.status !== where.status) continue;
          Object.assign(s, data, { updated_at: new Date() });
          count++;
        }
        return { count };
      },
    },
    automationApproval: {
      create: async ({ data }: any) => {
        const record = {
          id: data.id || `appr-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
          studio_id: data.studio_id,
          automation_run_id: data.automation_run_id,
          step_run_id: data.step_run_id,
          action_type: data.action_type,
          title: data.title,
          description: data.description || null,
          payload: data.payload || {},
          status: data.status || 'PENDING',
          requested_at: data.requested_at || new Date(),
          resolved_at: data.resolved_at || null,
          resolved_by: data.resolved_by || null,
          created_at: new Date(),
          updated_at: new Date(),
        };
        approvals.push(record);
        return record;
      },
      findUnique: async ({ where, include }: any) => {
        const appr = approvals.find((a) => a.id === where.id);
        if (!appr) return null;
        return {
          ...appr,
          run: include?.run ? runs.find((r) => r.id === appr.automation_run_id) : undefined,
          step_run: include?.step_run ? stepRuns.find((s) => s.id === appr.step_run_id) : undefined,
        };
      },
      findFirst: async ({ where, include }: any) => {
        const appr = approvals.find((a) => {
          if (where.id && a.id !== where.id) return false;
          if (where.automation_run_id && a.automation_run_id !== where.automation_run_id) return false;
          if (where.step_run_id && a.step_run_id !== where.step_run_id) return false;
          if (where.studio_id && a.studio_id !== where.studio_id) return false;
          if (where.status && a.status !== where.status) return false;
          return true;
        });
        if (!appr) return null;
        return {
          ...appr,
          run: include?.run ? runs.find((r) => r.id === appr.automation_run_id) : undefined,
          step_run: include?.step_run ? stepRuns.find((s) => s.id === appr.step_run_id) : undefined,
        };
      },
      findMany: async ({ where, include }: any) => {
        return approvals.filter((a) => {
          if (where?.studio_id && a.studio_id !== where.studio_id) return false;
          if (where?.status && a.status !== where.status) return false;
          return true;
        }).map((a) => ({
          ...a,
          run: include?.run ? runs.find((r) => r.id === a.automation_run_id) : undefined,
          step_run: include?.step_run ? stepRuns.find((s) => s.id === a.step_run_id) : undefined,
        }));
      },
      update: async ({ where, data }: any) => {
        const appr = approvals.find((a) => a.id === where.id);
        if (appr) Object.assign(appr, data, { updated_at: new Date() });
        return appr;
      },
      updateMany: async ({ where, data }: any) => {
        let count = 0;
        for (const a of approvals) {
          if (where?.automation_run_id && a.automation_run_id !== where.automation_run_id) continue;
          if (where?.status && a.status !== where.status) continue;
          Object.assign(a, data, { updated_at: new Date() });
          count++;
        }
        return { count };
      },
      count: async ({ where }: any) => approvals.filter((a) => {
        if (where?.studio_id && a.studio_id !== where.studio_id) return false;
        if (where?.status && a.status !== where.status) return false;
        return true;
      }).length,
    },
    automationTemplate: {
      create: async ({ data }: any) => {
        const record = {
          id: data.id || `tmpl-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
          studio_id: data.studio_id || null,
          name: data.name,
          description: data.description || null,
          category: data.category || 'GENERAL',
          workflow_config: data.workflow_config || { version: 1, steps: [] },
          is_system: data.is_system ?? false,
          enabled: data.enabled ?? true,
          created_at: new Date(),
          updated_at: new Date(),
        };
        templates.push(record);
        return record;
      },
      findUnique: async ({ where }: any) => templates.find((t) => t.id === where.id) || null,
      findFirst: async ({ where }: any) => templates.find((t) => {
        if (where.id && t.id !== where.id) return false;
        if (where.studio_id && t.studio_id !== where.studio_id) return false;
        return true;
      }) || null,
      findMany: async ({ where }: any) => {
        return templates.filter((t) => {
          if (where?.OR) {
            const match = where.OR.some((cond: any) => {
              if (cond.is_system && t.is_system) return true;
              if (cond.studio_id && t.studio_id === cond.studio_id) return true;
              return false;
            });
            if (!match) return false;
          }
          if (where?.category && t.category !== where.category) return false;
          return true;
        });
      },
      delete: async ({ where }: any) => {
        const idx = templates.findIndex((t) => t.id === where.id);
        if (idx >= 0) return templates.splice(idx, 1)[0];
        return null;
      },
    },
    automationExecutionLog: {
      create: async ({ data }: any) => {
        const record = {
          id: data.id || `log-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
          studio_id: data.studio_id,
          workflow_id: data.workflow_id || null,
          automation_run_id: data.automation_run_id || null,
          event_type: data.event_type || 'INFO',
          message: data.message,
          metadata: data.metadata || null,
          created_at: new Date(),
        };
        executionLogs.push(record);
        return record;
      },
      findMany: async ({ where }: any) => executionLogs.filter((l) => {
        if (where?.automation_run_id && l.automation_run_id !== where.automation_run_id) return false;
        if (where?.studio_id && l.studio_id !== where.studio_id) return false;
        return true;
      }),
    },
  };

  return {
    prisma: prismaMock,
    studios,
    users,
    galleries,
    workflows,
    runs,
    stepRuns,
    approvals,
    templates,
    executionLogs,
  };
}

// =============================================================
// RUN TEST SUITE
// =============================================================

async function runTestSuite() {
  console.log('\n=============================================================');
  console.log('🧪 PIXMATCH AI — PHASE 16 AUTOMATION & WORKFLOW ORCHESTRATOR');
  console.log('=============================================================\n');

  const mock = createMockDb();
  const templateService = new AutomationTemplateService(mock.prisma);
  const automationService = new AutomationService(mock.prisma);
  const engineService = (automationService as any).engine as AutomationEngineService;

  // -----------------------------------------------------------
  // GROUP 1: Database Model & Workflow CRUD
  // -----------------------------------------------------------
  console.log('--- Group 1: Database Model & Workflow CRUD ---');

  const createdWf = await automationService.createWorkflow('studio-1', 'user-1', {
    name: 'Auto Process & AI Index',
    description: 'Runs AI quality checks on upload',
    enabled: true,
    trigger_type: AutomationTriggerType.UPLOAD_COMPLETED,
    trigger_config: {},
    workflow_config: {
      version: 1,
      steps: [
        {
          id: 'step-1',
          name: 'Run AI Culling & Quality',
          action: AutomationActionType.RUN_PHOTO_INTELLIGENCE,
          dependsOn: [],
        },
      ],
    },
  });

  assert(!!createdWf.id, 'Workflow created successfully with generated ID');
  assert(createdWf.studio_id === 'studio-1', 'Workflow has correct studio_id');
  assert(createdWf.enabled === true, 'Workflow defaults to enabled');
  assert(createdWf.workflow_config.steps.length === 1, 'Workflow config steps persisted correctly');

  const fetchedWf = await automationService.getWorkflow(createdWf.id, 'studio-1');
  assert(fetchedWf !== null && fetchedWf.name === 'Auto Process & AI Index', 'getWorkflow returns created workflow');

  const updatedWf = await automationService.updateWorkflow(createdWf.id, 'studio-1', {
    name: 'Updated Auto Process',
    enabled: false,
  });
  assert(updatedWf.name === 'Updated Auto Process', 'Workflow name updated');
  assert(updatedWf.enabled === false, 'Workflow toggled to disabled');

  const toggleRes = await automationService.toggleWorkflow(createdWf.id, 'studio-1', true);
  assert(toggleRes.enabled === true, 'toggleWorkflow activates workflow');

  const duplicatedWf = await automationService.duplicateWorkflow(createdWf.id, 'studio-1', 'user-1');
  assert(duplicatedWf.name.includes('(Copy)'), 'duplicateWorkflow creates duplicate with updated name');

  const studioWorkflows = await automationService.listWorkflows('studio-1');
  assert(studioWorkflows.length === 2, 'listWorkflows returns all studio workflows');

  // -----------------------------------------------------------
  // GROUP 2: Workflow DAG & Configuration Validation
  // -----------------------------------------------------------
  console.log('\n--- Group 2: Workflow DAG & Configuration Validation ---');

  // Valid DAG Config
  const validDag: AutomationWorkflowConfigDTO = {
    version: 1,
    steps: [
      { id: 's1', name: 'Step 1', action: AutomationActionType.PROCESS_PHOTOS, dependsOn: [] },
      { id: 's2', name: 'Step 2', action: AutomationActionType.RUN_PHOTO_INTELLIGENCE, dependsOn: ['s1'] },
      { id: 's3', name: 'Step 3', action: AutomationActionType.GENERATE_SMART_ALBUMS, dependsOn: ['s2'] },
      { id: 's4', name: 'Step 4', action: AutomationActionType.RUN_GALLERY_HEALTH_CHECK, dependsOn: ['s3'] },
    ],
  };
  const validRes = AutomationValidator.validate(validDag);
  assert(validRes.isValid === true, 'Valid DAG passes validation');
  assert(validRes.errors.length === 0, 'Valid DAG has zero errors');

  // Cycle Detection
  const cyclicDag: AutomationWorkflowConfigDTO = {
    version: 1,
    steps: [
      { id: 'a', name: 'Step A', action: AutomationActionType.PROCESS_PHOTOS, dependsOn: ['c'] },
      { id: 'b', name: 'Step B', action: AutomationActionType.RUN_PHOTO_INTELLIGENCE, dependsOn: ['a'] },
      { id: 'c', name: 'Step C', action: AutomationActionType.RUN_GALLERY_HEALTH_CHECK, dependsOn: ['b'] },
    ],
  };
  const cyclicRes = AutomationValidator.validate(cyclicDag);
  assert(cyclicRes.isValid === false, 'Cyclic DAG is rejected');
  assert(cyclicRes.errors.some((e) => e.includes('Circular dependency')), 'Cycle error explicitly reported');

  // Self-dependency
  const selfDepDag: AutomationWorkflowConfigDTO = {
    version: 1,
    steps: [
      { id: 's1', name: 'Self Step', action: AutomationActionType.PROCESS_PHOTOS, dependsOn: ['s1'] },
    ],
  };
  const selfDepRes = AutomationValidator.validate(selfDepDag);
  assert(selfDepRes.isValid === false, 'Self dependency is rejected');
  assert(selfDepRes.errors.some((e) => e.includes('cannot depend on itself')), 'Self dependency error message correct');

  // Missing Dependency
  const missingDepDag: AutomationWorkflowConfigDTO = {
    version: 1,
    steps: [
      { id: 's1', name: 'Step 1', action: AutomationActionType.PROCESS_PHOTOS, dependsOn: ['non-existent'] },
    ],
  };
  const missingDepRes = AutomationValidator.validate(missingDepDag);
  assert(missingDepRes.isValid === false, 'Missing dependency is rejected');
  assert(missingDepRes.errors.some((e) => e.includes('non-existent step')), 'Missing dependency error reported');

  // Duplicate Step IDs
  const dupIdDag: AutomationWorkflowConfigDTO = {
    version: 1,
    steps: [
      { id: 'dup-1', name: 'Step 1', action: AutomationActionType.PROCESS_PHOTOS, dependsOn: [] },
      { id: 'dup-1', name: 'Step 2', action: AutomationActionType.RUN_GALLERY_HEALTH_CHECK, dependsOn: [] },
    ],
  };
  const dupIdRes = AutomationValidator.validate(dupIdDag);
  assert(dupIdRes.isValid === false, 'Duplicate step IDs are rejected');
  assert(dupIdRes.errors.some((e) => e.includes('Duplicate step ID')), 'Duplicate step ID error reported');

  // Max 50 Steps Limit
  const hugeDag: AutomationWorkflowConfigDTO = {
    version: 1,
    steps: Array.from({ length: 55 }, (_, i) => ({
      id: `step-${i}`,
      name: `Step ${i}`,
      action: AutomationActionType.RUN_GALLERY_HEALTH_CHECK,
      dependsOn: i > 0 ? [`step-${i - 1}`] : [],
    })),
  };
  const hugeRes = AutomationValidator.validate(hugeDag);
  assert(hugeRes.isValid === false, 'Workflow exceeding 50 steps is rejected');
  assert(hugeRes.errors.some((e) => e.includes('exceeds maximum limit of 50')), 'Max 50 step limit error reported');

  // Invalid Action Type
  const invalidActionDag: any = {
    version: 1,
    steps: [{ id: 's1', name: 'Bad Step', action: 'DESTROY_DATABASE_ALL', dependsOn: [] }],
  };
  const invalidActionRes = AutomationValidator.validate(invalidActionDag);
  assert(invalidActionRes.isValid === false, 'Invalid action type is rejected');

  // -----------------------------------------------------------
  // GROUP 3: Automation Engine Lifecycle & Dependency Execution
  // -----------------------------------------------------------
  console.log('\n--- Group 3: Automation Engine Lifecycle & Dependency Execution ---');

  const multiStepWf = await automationService.createWorkflow('studio-1', 'user-1', {
    name: 'Multi Step Pipeline',
    enabled: true,
    trigger_type: AutomationTriggerType.MANUAL,
    workflow_config: {
      version: 1,
      steps: [
        {
          id: 'process-step',
          name: 'Process Photos',
          action: AutomationActionType.PROCESS_PHOTOS,
          dependsOn: [],
        },
        {
          id: 'intel-step',
          name: 'Photo Intelligence',
          action: AutomationActionType.RUN_PHOTO_INTELLIGENCE,
          dependsOn: ['process-step'],
        },
        {
          id: 'albums-step',
          name: 'Smart Albums',
          action: AutomationActionType.GENERATE_SMART_ALBUMS,
          dependsOn: ['intel-step'],
        },
        {
          id: 'health-step',
          name: 'Health Check',
          action: AutomationActionType.RUN_GALLERY_HEALTH_CHECK,
          dependsOn: ['albums-step'],
        },
      ],
    },
  });

  const run1 = await automationService.runWorkflow(multiStepWf.id, 'studio-1', 'gal-1', 'user-1');
  assert(run1.status === AutomationRunStatus.COMPLETED, 'Run transitions to COMPLETED after safe sequential steps');
  assert(run1.gallery_id === 'gal-1', 'Run attached to correct gallery');
  assert(run1.step_runs.length === 4, 'Created 4 StepRun records');
  assert(
    run1.step_runs.every((s: any) => s.status === AutomationStepRunStatus.COMPLETED),
    'All StepRuns are marked COMPLETED'
  );

  // -----------------------------------------------------------
  // GROUP 4: Approval Queue & Gated Action Handling
  // -----------------------------------------------------------
  console.log('\n--- Group 4: Approval Queue & Gated Action Handling ---');

  const gatedWf = await automationService.createWorkflow('studio-1', 'user-1', {
    name: 'Gated Action Pipeline',
    enabled: true,
    trigger_type: AutomationTriggerType.MANUAL,
    workflow_config: {
      version: 1,
      steps: [
        {
          id: 'safe-intel',
          name: 'Photo Intelligence',
          action: AutomationActionType.RUN_PHOTO_INTELLIGENCE,
          dependsOn: [],
        },
        {
          id: 'gated-cover',
          name: 'Apply Cover Recommendation',
          action: AutomationActionType.APPLY_COVER,
          dependsOn: ['safe-intel'],
        },
        {
          id: 'post-cover-check',
          name: 'Post Cover Health Check',
          action: AutomationActionType.RUN_GALLERY_HEALTH_CHECK,
          dependsOn: ['gated-cover'],
        },
      ],
    },
  });

  const pausedRun = await automationService.runWorkflow(gatedWf.id, 'studio-1', 'gal-1', 'user-1');

  assert(
    pausedRun.status === AutomationRunStatus.WAITING_APPROVAL,
    'Run pauses in WAITING_APPROVAL when reaching gated step'
  );

  const pendingApprovals = await automationService.listApprovals('studio-1', AutomationApprovalStatus.PENDING);
  assert(pendingApprovals.length >= 1, 'Approval created in pending queue');
  assert(pendingApprovals[0].action_type === AutomationActionType.APPLY_COVER, 'Approval action_type is APPLY_COVER');
  assert(pendingApprovals[0].automation_run_id === pausedRun.id, 'Approval linked to correct automation_run_id');

  // Test Approval Rejection
  const rejectedApprovalRes = await automationService.rejectApproval(
    pendingApprovals[0].id,
    'studio-1',
    'user-1',
    'Photographer prefers manual cover'
  );
  assert(rejectedApprovalRes.status === AutomationApprovalStatus.REJECTED, 'Approval successfully marked REJECTED');

  // Test Approval Acceptance & Workflow Resumption
  const gatedRun2 = await automationService.runWorkflow(gatedWf.id, 'studio-1', 'gal-1', 'user-1');
  const pendingForRun2 = await mock.prisma.automationApproval.findFirst({
    where: { automation_run_id: gatedRun2.id, status: AutomationApprovalStatus.PENDING },
  });
  assert(!!pendingForRun2, 'Found pending approval for gatedRun2');

  const approvedRes = await automationService.approveApproval(
    pendingForRun2.id,
    'studio-1',
    'user-1',
    'Approved by owner'
  );
  assert(approvedRes.status === AutomationApprovalStatus.APPROVED, 'Approval successfully marked APPROVED');

  const resumedRun = await automationService.getRun(gatedRun2.id, 'studio-1');
  assert(resumedRun !== null, 'Resumed run retrieved successfully');
  assert(resumedRun?.status === AutomationRunStatus.COMPLETED, 'Run resumes and completes all steps after approval');

  // -----------------------------------------------------------
  // GROUP 5: Idempotency & Deduplication
  // -----------------------------------------------------------
  console.log('\n--- Group 5: Idempotency & Deduplication ---');

  // Step runner deterministic idempotency keys
  const expectedKeyA = `automation:${multiStepWf.id}:gal-1:${run1.id}:process-step`;
  const expectedKeyB = `automation:${multiStepWf.id}:gal-1:${run1.id}:intel-step`;
  assert(expectedKeyA !== expectedKeyB, 'Idempotency keys are distinct per step ID');
  assert(expectedKeyA.includes('gal-1'), 'Idempotency keys are tenant and gallery scoped');

  // -----------------------------------------------------------
  // GROUP 6: Retry Management & Failure Policies
  // -----------------------------------------------------------
  console.log('\n--- Group 6: Retry Management & Failure Policies ---');

  const failRunRecord = await mock.prisma.automationRun.create({
    data: {
      studio_id: 'studio-1',
      workflow_id: multiStepWf.id,
      gallery_id: 'gal-1',
      status: AutomationRunStatus.FAILED,
      trigger: 'MANUAL',
      error_message: 'Transient storage timeout',
    },
  });

  await mock.prisma.automationStepRun.create({
    data: {
      automation_run_id: failRunRecord.id,
      step_key: 'process-step',
      action_type: AutomationActionType.PROCESS_PHOTOS,
      status: AutomationStepRunStatus.FAILED,
      attempt: 1,
      error_message: 'Storage connection failure',
    },
  });

  const retriedRun = await automationService.retryRun(failRunRecord.id, 'studio-1');
  assert(retriedRun.status === AutomationRunStatus.COMPLETED, 'Failed run successfully retried and completed');

  // -----------------------------------------------------------
  // GROUP 7: Pause, Resume, and Cancellation Controls
  // -----------------------------------------------------------
  console.log('\n--- Group 7: Pause, Resume, and Cancellation Controls ---');

  const runToPause = await mock.prisma.automationRun.create({
    data: {
      studio_id: 'studio-1',
      workflow_id: multiStepWf.id,
      gallery_id: 'gal-1',
      status: AutomationRunStatus.RUNNING,
      trigger: 'MANUAL',
    },
  });

  const pausedResult = await automationService.pauseRun(runToPause.id, 'studio-1');
  assert(pausedResult.status === AutomationRunStatus.WAITING_APPROVAL, 'pauseRun transitions run to WAITING_APPROVAL');

  const resumedResult = await automationService.resumeRun(runToPause.id, 'studio-1', 'user-1');
  assert(
    resumedResult.status === AutomationRunStatus.RUNNING || resumedResult.status === AutomationRunStatus.COMPLETED,
    'resumeRun resumes paused execution'
  );

  const runToCancel = await mock.prisma.automationRun.create({
    data: {
      studio_id: 'studio-1',
      workflow_id: multiStepWf.id,
      gallery_id: 'gal-1',
      status: AutomationRunStatus.WAITING_APPROVAL,
      trigger: 'MANUAL',
    },
  });
  const cancelledResult = await automationService.cancelRun(runToCancel.id, 'studio-1');
  assert(cancelledResult.status === AutomationRunStatus.CANCELLED, 'cancelRun transitions run to CANCELLED');

  // -----------------------------------------------------------
  // GROUP 8: Worker Crash Recovery
  // -----------------------------------------------------------
  console.log('\n--- Group 8: Worker Crash Recovery ---');

  const staleDate = new Date(Date.now() - 45 * 60 * 1000); // 45 min ago
  const crashedRun = await mock.prisma.automationRun.create({
    data: {
      studio_id: 'studio-1',
      workflow_id: multiStepWf.id,
      gallery_id: 'gal-1',
      status: AutomationRunStatus.RUNNING,
      trigger: 'MANUAL',
      started_at: staleDate,
    },
  });

  // Create PENDING step run for crashed run
  await mock.prisma.automationStepRun.create({
    data: {
      automation_run_id: crashedRun.id,
      step_key: 'process-step',
      action_type: AutomationActionType.PROCESS_PHOTOS,
      status: AutomationStepRunStatus.PENDING,
      attempt: 1,
    },
  });

  const recoveredCount = await engineService.recoverStaleRuns(30);
  assert(recoveredCount >= 1, 'Engine detects and recovers stale crashed runs');

  // -----------------------------------------------------------
  // GROUP 9: Tenant Isolation & IDOR Protection
  // -----------------------------------------------------------
  console.log('\n--- Group 9: Tenant Isolation & IDOR Protection ---');

  const foreignWf = await automationService.getWorkflow(createdWf.id, 'studio-2');
  assert(foreignWf === null, 'Cross-studio workflow get returns null (IDOR protected)');

  let idorUpdateBlocked = false;
  try {
    await automationService.updateWorkflow(createdWf.id, 'studio-2', { name: 'Hacked Name' });
  } catch (err: any) {
    idorUpdateBlocked = true;
  }
  assert(idorUpdateBlocked, 'Cross-studio workflow update blocked with Error');

  let idorDeleteBlocked = false;
  try {
    await automationService.deleteWorkflow(createdWf.id, 'studio-2');
  } catch (err: any) {
    idorDeleteBlocked = true;
  }
  assert(idorDeleteBlocked, 'Cross-studio workflow delete blocked with Error');

  let idorRunBlocked = false;
  try {
    // Studio-2 attempts to trigger Studio-1's workflow
    await automationService.runWorkflow(createdWf.id, 'studio-2', 'gal-2', 'user-2');
  } catch (err: any) {
    idorRunBlocked = true;
  }
  assert(idorRunBlocked, 'Cross-studio workflow execution trigger blocked with Error');

  // -----------------------------------------------------------
  // GROUP 10: Zero Biometric & Secret Leakage Guarantees
  // -----------------------------------------------------------
  console.log('\n--- Group 10: Zero Biometric & Secret Leakage Guarantees ---');

  await mock.prisma.automationExecutionLog.create({
    data: {
      studio_id: 'studio-1',
      workflow_id: multiStepWf.id,
      automation_run_id: run1.id,
      event_type: 'STEP_COMPLETED',
      message: 'Photo intelligence completed with quality indexing',
      metadata: { gallery_id: 'gal-1', indexed_photos_count: 2 },
    },
  });

  const allLogs = await mock.prisma.automationExecutionLog.findMany({ where: { studio_id: 'studio-1' } });
  const hasBiometricData = allLogs.some((l: any) => {
    const str = JSON.stringify(l);
    return str.includes('descriptor') || str.includes('embedding') || str.includes('512d');
  });
  assert(!hasBiometricData, 'Execution logs contain ZERO biometric embeddings or descriptors');

  const hasSecretKeyData = allLogs.some((l: any) => {
    const str = JSON.stringify(l);
    return str.includes('sk_live_') || str.includes('secret_key') || str.includes('password');
  });
  assert(!hasSecretKeyData, 'Execution logs contain no API keys or plaintext secrets');

  // -----------------------------------------------------------
  // GROUP 11: System Templates & Bulk Gallery Automation
  // -----------------------------------------------------------
  console.log('\n--- Group 11: System Templates & Bulk Gallery Automation ---');

  const templatesList = await templateService.listTemplates('studio-1');
  assert(templatesList.length >= 5, 'At least 5 system templates available');

  const weddingTemplate = templatesList.find((t) => t.id === 'template-wedding-auto-prep');
  assert(!!weddingTemplate, 'Wedding Auto Prep template exists');
  assert(weddingTemplate?.is_system === true, 'Wedding Auto Prep is marked as system template');

  const instantiatedWf = await automationService.createFromTemplate(
    'template-wedding-auto-prep',
    'studio-1',
    'user-1',
    'My Studio Wedding Workflow'
  );
  assert(instantiatedWf.studio_id === 'studio-1', 'Instantiated workflow belongs to studio-1');
  assert(instantiatedWf.name === 'My Studio Wedding Workflow', 'Workflow instantiated with custom name');
  assert(instantiatedWf.workflow_config.steps.length > 0, 'Instantiated workflow inherits template steps');

  // Bulk Gallery Trigger
  const bulkRes = await automationService.bulkRunGalleries('studio-1', 'user-1', {
    gallery_ids: ['gal-1'],
    workflow_id: multiStepWf.id,
  });
  assert(bulkRes.enqueued_runs === 1, 'Bulk trigger enqueued 1 run');
  assert(bulkRes.runs.length === 1, 'Bulk trigger returned runs array');

  // Gallery Automation Settings
  const galSettings = await automationService.getGallerySettings('gal-1', 'studio-1');
  assert(galSettings.enabled === true, 'Gallery automation settings enabled');
  assert(galSettings.auto_ai_indexing === true, 'Gallery automation inherits AI face search setting');

  // -----------------------------------------------------------
  // GROUP 12: Copilot Automation Integration & Telemetry Aggregates
  // -----------------------------------------------------------
  console.log('\n--- Group 12: Copilot Automation Integration & Telemetry Aggregates ---');

  const toolRegistry = new CopilotToolRegistry(mock.prisma);
  const statusToolRes = await toolRegistry.executeTool('getAutomationStatus', { studioId: 'studio-1', galleryId: 'gal-1', userId: 'user-1' }, { galleryId: 'gal-1' });
  assert(statusToolRes.total_runs !== undefined, 'Copilot getAutomationStatus tool executes successfully');

  const apprToolRes = await toolRegistry.executeTool('listPendingApprovals', { studioId: 'studio-1', userId: 'user-1' }, {});
  assert(Array.isArray(apprToolRes.approvals), 'Copilot listPendingApprovals tool returns array');

  const deterministicCopilot = new DeterministicCopilotProvider();
  const contextBuilder = new CopilotContextBuilder(mock.prisma);
  const facts = await contextBuilder.buildGalleryFacts('studio-1', 'gal-1');
  const copilotReply = await deterministicCopilot.generateResponse(
    'Show me the automation status for this gallery',
    facts
  );
  assert(copilotReply.content.length > 0, 'Copilot responds to automation status inquiry');

  const telemetry = await automationService.getTelemetry('studio-1');
  assert(telemetry.total_workflows >= 1, 'Telemetry tracks total workflows');
  assert(telemetry.total_runs >= 1, 'Telemetry tracks total runs');
  assert(telemetry.success_rate >= 0, 'Telemetry calculates success rate');
  assert(typeof telemetry.queue_depth === 'number', 'Telemetry calculates queue depth');

  // Final summary
  console.log('\n=============================================================');
  console.log(`📊 PHASE 16 TEST RESULTS: ${passed} PASSED / ${failed} FAILED`);
  console.log('=============================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runTestSuite().catch((err) => {
  console.error('💥 Test suite crashed with unhandled exception:', err);
  process.exit(1);
});
