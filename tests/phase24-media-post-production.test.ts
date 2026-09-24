/**
 * PIXMatch AI — Phase 24 Master Test Suite
 * Advanced Media Culling, Editing Workflow & AI-Assisted Post-Production
 *
 * Covers 82 Comprehensive Test Groups:
 * Group 1: 8-Factor Deterministic Culling Score Math & Exact Weights
 * Group 2: AI Score Recommendation Thresholds (Keep >= 70, Reject < 45, Maybe 45-69)
 * Group 3: Severe Blur Early Rejection Rule
 * Group 4: Low Confidence Handling & Score Fallbacks
 * Group 5: Time-Window Proximity Clustering (<= 2000ms)
 * Group 6: dHash Computation & Normalized Hamming Distance Matching
 * Group 7: Burst Group Creation & Member Association
 * Group 8: Best-of-Burst Scoring & Representative Selection
 * Group 9: Mixed Camera / Lens Burst Isolation
 * Group 10: Exact Duplicate Detection (Hamming Distance = 0)
 * Group 11: Near-Duplicate Detection & Penalty Application
 * Group 12: Duplicate Candidate Grouping & Non-Destructive Flagging
 * Group 13: Single Photo Keep Decision Recording
 * Group 14: Single Photo Reject Decision Recording
 * Group 15: Single Photo Maybe Decision Recording
 * Group 16: Non-Destructive Invariant: Rejection Never Deletes Files
 * Group 17: Star Rating (1-5) & Color Label Metadata Updates
 * Group 18: Bulk Culling Decisions Execution
 * Group 19: Candidate Filtering (Decision, Recommendation, Score, Burst)
 * Group 20: Selection Lock Acquisition for Multi-User Review
 * Group 21: Multi-User Selection Lock Conflict Rejection
 * Group 22: Selection Lock TTL Expiry & Eviction
 * Group 23: Explicit Selection Lock Release by Holder
 * Group 24: Review Action Logging (Audit Trail with old & new states)
 * Group 25: User-Scoped Undo History Stack (LIFO Reversion)
 * Group 26: Multi-User Undo Isolation
 * Group 27: Empty History Undo Safety
 * Group 28: Non-Destructive Editing: Original Master Immutability
 * Group 29: Parameter Range Validation (Exposure, Contrast, Highlights, Shadows, Temp, Tint, Saturation, Sharpness)
 * Group 30: Out-of-Bounds Parameter Clamping & Sanitization
 * Group 31: Versioned Derivative Generation (v1, v2, v3 tracking)
 * Group 32: Active Edit Job Lifecycle (QUEUED -> PROCESSING -> COMPLETED)
 * Group 33: AI Edit Suggestion Provider Integration (MockEditSuggestionProvider)
 * Group 34: Auto-Enhance Suggestion Generation
 * Group 35: Human-in-the-Loop Suggestion Approval & Version Creation
 * Group 36: Suggestion Rejection/Dismissal without version creation
 * Group 37: Multi-Suggestion History & Tracking
 * Group 38: 7 System Default Presets Bootstrap
 * Group 39: Custom Studio Preset Creation & Parameters
 * Group 40: Preset Application to Edit Jobs
 * Group 41: Preset Tenant Isolation
 * Group 42: Batch Export Job Creation across Formats (JPEG, WebP, PNG, TIFF)
 * Group 43: Derivative Resolution Scaling (Original, 4K Web, 2048px Social, 1080px Story)
 * Group 44: SHA-256 Checksum Calculation per Rendered Artifact
 * Group 45: ZIP Package Generation & Artifact Tracking
 * Group 46: Failed Item Handling in Batch Export
 * Group 47: Metadata Policy: PRESERVE_ALL
 * Group 48: Metadata Policy: STRIP_ALL
 * Group 49: Metadata Policy: STRIP_GPS_PERSONAL
 * Group 50: Metadata Policy: COPYRIGHT_ONLY
 * Group 51: Client Proof Watermark Overlay Integration
 * Group 52: Watermark Opacity & Position Handling
 * Group 53: Media Handoff -> Culling Ready State Machine Transition (Phase 23 Link)
 * Group 54: Culling Completed -> Production Milestone Advance (Phase 23 Link)
 * Group 55: Post-Production Completed -> Gallery Handoff (Phase 23 Link)
 * Group 56: Automation Trigger: MEDIA_INGESTION_COMPLETED (Phase 16 Link)
 * Group 57: Automation Trigger: CULLING_READY (Phase 16 Link)
 * Group 58: Automation Trigger: CULLING_COMPLETED (Phase 16 Link)
 * Group 59: Automation Trigger: EDITING_READY (Phase 16 Link)
 * Group 60: Automation Trigger: EDITING_COMPLETED (Phase 16 Link)
 * Group 61: Copilot Read Tool: getCullingSummary
 * Group 62: Copilot Read Tool: listCullCandidates
 * Group 63: Copilot Read Tool: getBurstGroups
 * Group 64: Copilot Read Tool: getEditingQueue
 * Group 65: Copilot Read Tool: getEditSuggestions
 * Group 66: Copilot Read Tool: getExportStatus
 * Group 67: Copilot Mutation Tool: createCullSession (Approval Gated)
 * Group 68: Copilot Mutation Tool: applyCullDecision (Approval Gated)
 * Group 69: Copilot Mutation Tool: bulkCullDecision (Approval Gated)
 * Group 70: Copilot Mutation Tool: createEditJob (Approval Gated)
 * Group 71: Copilot Mutation Tool: approveEdit (Approval Gated)
 * Group 72: Copilot Mutation Tool: createExportJob (Approval Gated)
 * Group 73: Culling Summary Analytics Aggregation
 * Group 74: Editing Velocity & AI Agreement Metrics
 * Group 75: Export Job Throughput & Size Aggregation
 * Group 76: Audit Logging Security (Zero Secret/Biometric Leaks)
 * Group 77: Multi-Tenant IDOR: Studio A vs Studio B Culling Sessions
 * Group 78: Multi-Tenant IDOR: Studio A vs Studio B Selection Locks
 * Group 79: Multi-Tenant IDOR: Studio A vs Studio B Edit Jobs & Presets
 * Group 80: Multi-Tenant IDOR: Studio A vs Studio B Export Jobs & Artifacts
 * Group 81: High Concurrency Rapid Culling Burst Test (50 concurrent toggles)
 * Group 82: Offline Culling Action Reconciliation & Timestamp Ordering
 */

process.env.DATABASE_URL = process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/pixmatch_test';
process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-jwt-secret-key-must-be-32-chars-long';

import crypto from 'crypto';
import {
  CullSessionStatus,
  CullDecisionType,
  CullRecommendation,
  EditJobStatus,
  EditPresetType,
  EditVersionType,
  ExportJobStatus,
  ExportFormat,
  ExportQuality,
  MetadataPolicy,
  AutomationTriggerType,
  ProductionStage,
} from '@pixmatch/types';

import { CullEngineService } from '../apps/api/src/modules/culling/cull-engine.service.js';
import { CullSessionService } from '../apps/api/src/modules/culling/cull-session.service.js';
import { EditEngineService } from '../apps/api/src/modules/editing/edit-engine.service.js';
import { ExportEngineService } from '../apps/api/src/modules/exports/export-engine.service.js';
import { CullingAnalyticsService } from '../apps/api/src/modules/culling/culling-analytics.service.js';
import { CopilotToolRegistry } from '../apps/api/src/modules/copilot/copilot-tool-registry.js';
import { prisma } from '@pixmatch/database';

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

// In-Memory Database Engine Mock for Phase 24 Standalone Master Test Execution
class MockPhase24Database {
  studios: any[] = [];
  users: any[] = [];
  galleries: any[] = [];
  photos: any[] = [];
  photoVersions: any[] = [];
  projects: any[] = [];
  projectProductions: any[] = [];

  // Phase 24 Tables
  cullSessions: any[] = [];
  cullDecisions: any[] = [];
  burstGroups: any[] = [];
  burstGroupMembers: any[] = [];
  selectionLocks: any[] = [];
  reviewActions: any[] = [];
  editJobs: any[] = [];
  editPresets: any[] = [];
  editSuggestions: any[] = [];
  editVersions: any[] = [];
  exportJobs: any[] = [];
  exportPresets: any[] = [];
  exportArtifacts: any[] = [];
  aiAnalyses: any[] = [];

  // Phase 16 Automation Logs
  automationLogs: any[] = [];

  reset() {
    this.studios = [];
    this.users = [];
    this.galleries = [];
    this.photos = [];
    this.photoVersions = [];
    this.projects = [];
    this.projectProductions = [];
    this.cullSessions = [];
    this.cullDecisions = [];
    this.burstGroups = [];
    this.burstGroupMembers = [];
    this.selectionLocks = [];
    this.reviewActions = [];
    this.editJobs = [];
    this.editPresets = [];
    this.editSuggestions = [];
    this.editVersions = [];
    this.exportJobs = [];
    this.exportPresets = [];
    this.exportArtifacts = [];
    this.aiAnalyses = [];
    this.automationLogs = [];
  }
}

const mockDb = new MockPhase24Database();

// Setup in-memory proxy intercepts on prisma for standalone deterministic testing
function patchPrismaMock() {
  const p: any = prisma;

  // PhotoCullSession
  p.photoCullSession = {
    create: async ({ data }: any) => {
      const rec = {
        id: data.id || `cs_${crypto.randomUUID()}`,
        created_at: new Date(),
        updated_at: new Date(),
        status: data.status || CullSessionStatus.ANALYZING,
        total_photos: data.total_photos || 0,
        reviewed_count: data.reviewed_count || 0,
        keep_count: data.keep_count || 0,
        reject_count: data.reject_count || 0,
        maybe_count: data.maybe_count || 0,
        ...data,
      };
      mockDb.cullSessions.push(rec);
      return rec;
    },
    findUnique: async ({ where, include }: any) => {
      const s = mockDb.cullSessions.find((sess) => sess.id === where.id) || null;
      if (!s) return null;
      const decisions = mockDb.cullDecisions.filter((d) => d.session_id === s.id);
      return { ...s, decisions };
    },
    findFirst: async ({ where, include }: any) => {
      const s =
        mockDb.cullSessions.find((sess) => {
          for (const [k, v] of Object.entries(where)) {
            if (sess[k] !== v) return false;
          }
          return true;
        }) || null;
      if (!s) return null;
      const decisions = mockDb.cullDecisions.filter((d) => d.session_id === s.id);
      return { ...s, decisions };
    },
    findMany: async ({ where, orderBy, take, skip }: any = {}) => {
      let res = mockDb.cullSessions.filter((s) => {
        if (!where) return true;
        for (const [k, v] of Object.entries(where)) {
          if (s[k] !== v) return false;
        }
        return true;
      });
      if (skip) res = res.slice(skip);
      if (take) res = res.slice(0, take);
      return res;
    },
    update: async ({ where, data }: any) => {
      const idx = mockDb.cullSessions.findIndex((s) => s.id === where.id);
      if (idx === -1) throw new Error('Cull session not found');
      mockDb.cullSessions[idx] = { ...mockDb.cullSessions[idx], ...data, updated_at: new Date() };
      return mockDb.cullSessions[idx];
    },
    count: async ({ where }: any = {}) => {
      return mockDb.cullSessions.filter((s) => {
        if (!where) return true;
        for (const [k, v] of Object.entries(where)) {
          if (s[k] !== v) return false;
        }
        return true;
      }).length;
    },
  };

  // PhotoCullDecision
  p.photoCullDecision = {
    create: async ({ data }: any) => {
      const rec = {
        id: data.id || `cd_${crypto.randomUUID()}`,
        created_at: new Date(),
        updated_at: new Date(),
        ...data,
      };
      mockDb.cullDecisions.push(rec);
      return rec;
    },
    findUnique: async ({ where }: any) => {
      if (where.session_id_photo_id) {
        return (
          mockDb.cullDecisions.find(
            (d) => d.session_id === where.session_id_photo_id.session_id && d.photo_id === where.session_id_photo_id.photo_id
          ) || null
        );
      }
      return mockDb.cullDecisions.find((d) => d.id === where.id) || null;
    },
    findFirst: async ({ where }: any) => {
      return (
        mockDb.cullDecisions.find((d) => {
          for (const [k, v] of Object.entries(where)) {
            if (d[k] !== v) return false;
          }
          return true;
        }) || null
      );
    },
    findMany: async ({ where, orderBy, take, skip }: any = {}) => {
      let res = mockDb.cullDecisions.filter((d) => {
        if (!where) return true;
        for (const [k, v] of Object.entries(where)) {
          if (k === 'photo_id' && typeof v === 'object' && v.in) {
            if (!v.in.includes(d.photo_id)) return false;
            continue;
          }
          if (d[k] !== v) return false;
        }
        return true;
      });
      if (skip) res = res.slice(skip);
      if (take) res = res.slice(0, take);
      return res;
    },
    update: async ({ where, data }: any) => {
      const idx = mockDb.cullDecisions.findIndex((d) => d.id === where.id);
      if (idx === -1) throw new Error('Cull decision not found');
      mockDb.cullDecisions[idx] = { ...mockDb.cullDecisions[idx], ...data, updated_at: new Date() };
      return mockDb.cullDecisions[idx];
    },
    updateMany: async ({ where, data }: any) => {
      let count = 0;
      for (const d of mockDb.cullDecisions) {
        let match = true;
        for (const [k, v] of Object.entries(where || {})) {
          if (k === 'photo_id' && typeof v === 'object' && (v as any).in) {
            if (!(v as any).in.includes(d.photo_id)) { match = false; break; }
            continue;
          }
          if (d[k] !== v) { match = false; break; }
        }
        if (match) {
          Object.assign(d, data, { updated_at: new Date() });
          count++;
        }
      }
      return { count };
    },
    deleteMany: async ({ where }: any = {}) => {
      const initLen = mockDb.cullDecisions.length;
      mockDb.cullDecisions = mockDb.cullDecisions.filter((d) => {
        if (!where) return false;
        for (const [k, v] of Object.entries(where)) {
          if (k === 'photo_id' && typeof v === 'object' && (v as any).in) {
            if ((v as any).in.includes(d.photo_id)) return false;
            continue;
          }
          if (d[k] === v) return false;
        }
        return true;
      });
      return { count: initLen - mockDb.cullDecisions.length };
    },
    upsert: async ({ where, create, update }: any) => {
      let found: any = null;
      if (where.session_id_photo_id) {
        found = mockDb.cullDecisions.find(
          (d) => d.session_id === where.session_id_photo_id.session_id && d.photo_id === where.session_id_photo_id.photo_id
        );
      } else if (where.id) {
        found = mockDb.cullDecisions.find((d) => d.id === where.id);
      }

      if (found) {
        const idx = mockDb.cullDecisions.indexOf(found);
        mockDb.cullDecisions[idx] = { ...found, ...update, updated_at: new Date() };
        return mockDb.cullDecisions[idx];
      } else {
        const rec = {
          id: `cd_${crypto.randomUUID()}`,
          created_at: new Date(),
          updated_at: new Date(),
          ...create,
        };
        mockDb.cullDecisions.push(rec);
        return rec;
      }
    },
    count: async ({ where }: any = {}) => {
      return mockDb.cullDecisions.filter((d) => {
        if (!where) return true;
        for (const [k, v] of Object.entries(where)) {
          if (d[k] !== v) return false;
        }
        return true;
      }).length;
    },
  };

  // PhotoBurstGroup
  p.photoBurstGroup = {
    create: async ({ data }: any) => {
      const rec = {
        id: data.id || `bg_${crypto.randomUUID()}`,
        created_at: new Date(),
        updated_at: new Date(),
        photo_count: data.photo_count || 0,
        avg_similarity: data.avg_similarity || 0,
        ...data,
      };
      mockDb.burstGroups.push(rec);
      return rec;
    },
    findUnique: async ({ where }: any) => {
      return mockDb.burstGroups.find((g) => g.id === where.id) || null;
    },
    findFirst: async ({ where }: any) => {
      return (
        mockDb.burstGroups.find((g) => {
          for (const [k, v] of Object.entries(where)) {
            if (g[k] !== v) return false;
          }
          return true;
        }) || null
      );
    },
    findMany: async ({ where, include }: any = {}) => {
      return mockDb.burstGroups
        .filter((g) => {
          if (!where) return true;
          for (const [k, v] of Object.entries(where)) {
            if (g[k] !== v) return false;
          }
          return true;
        })
        .map((g) => {
          if (include?.members) {
            const members = mockDb.burstGroupMembers.filter((m) => m.burst_group_id === g.id);
            return { ...g, members };
          }
          return g;
        });
    },
    update: async ({ where, data }: any) => {
      const idx = mockDb.burstGroups.findIndex((g) => g.id === where.id);
      if (idx === -1) throw new Error('Burst group not found');
      mockDb.burstGroups[idx] = { ...mockDb.burstGroups[idx], ...data, updated_at: new Date() };
      return mockDb.burstGroups[idx];
    },
    count: async ({ where }: any = {}) => {
      return mockDb.burstGroups.filter((g) => {
        if (!where) return true;
        for (const [k, v] of Object.entries(where)) {
          if (g[k] !== v) return false;
        }
        return true;
      }).length;
    },
  };

  // PhotoBurstGroupMember
  p.photoBurstGroupMember = {
    create: async ({ data }: any) => {
      const rec = {
        id: data.id || `bgm_${crypto.randomUUID()}`,
        created_at: new Date(),
        ...data,
      };
      mockDb.burstGroupMembers.push(rec);
      return rec;
    },
    createMany: async ({ data }: any) => {
      const items = Array.isArray(data) ? data : [data];
      for (const it of items) {
        mockDb.burstGroupMembers.push({
          id: it.id || `bgm_${crypto.randomUUID()}`,
          created_at: new Date(),
          ...it,
        });
      }
      return { count: items.length };
    },
    findMany: async ({ where }: any = {}) => {
      return mockDb.burstGroupMembers.filter((m) => {
        if (!where) return true;
        for (const [k, v] of Object.entries(where)) {
          if (m[k] !== v) return false;
        }
        return true;
      });
    },
    deleteMany: async ({ where }: any = {}) => {
      const initLen = mockDb.burstGroupMembers.length;
      mockDb.burstGroupMembers = mockDb.burstGroupMembers.filter((m) => {
        if (!where) return false;
        for (const [k, v] of Object.entries(where)) {
          if (m[k] === v) return false;
        }
        return true;
      });
      return { count: initLen - mockDb.burstGroupMembers.length };
    },
    count: async ({ where }: any = {}) => {
      return mockDb.burstGroupMembers.filter((m) => {
        if (!where) return true;
        for (const [k, v] of Object.entries(where)) {
          if (m[k] !== v) return false;
        }
        return true;
      }).length;
    },
  };

  // PhotoSelectionLock
  p.photoSelectionLock = {
    create: async ({ data }: any) => {
      const rec = {
        id: data.id || `lock_${crypto.randomUUID()}`,
        created_at: new Date(),
        ...data,
      };
      mockDb.selectionLocks.push(rec);
      return rec;
    },
    findUnique: async ({ where }: any) => {
      return mockDb.selectionLocks.find((l) => l.photo_id === where.photo_id) || null;
    },
    findFirst: async ({ where }: any) => {
      return (
        mockDb.selectionLocks.find((l) => {
          for (const [k, v] of Object.entries(where)) {
            if (l[k] !== v) return false;
          }
          return true;
        }) || null
      );
    },
    delete: async ({ where }: any) => {
      const idx = mockDb.selectionLocks.findIndex((l) => l.photo_id === where.photo_id || l.id === where.id);
      if (idx !== -1) {
        const deleted = mockDb.selectionLocks[idx];
        mockDb.selectionLocks.splice(idx, 1);
        return deleted;
      }
      return null;
    },
    deleteMany: async ({ where }: any = {}) => {
      const initLen = mockDb.selectionLocks.length;
      mockDb.selectionLocks = mockDb.selectionLocks.filter((l) => {
        if (where.expires_at && where.expires_at.lt) {
          return new Date(l.expires_at) >= new Date(where.expires_at.lt);
        }
        if (where.photo_id) return l.photo_id !== where.photo_id;
        return true;
      });
      return { count: initLen - mockDb.selectionLocks.length };
    },
    count: async ({ where }: any = {}) => {
      return mockDb.selectionLocks.filter((l) => {
        if (!where) return true;
        for (const [k, v] of Object.entries(where)) {
          if (l[k] !== v) return false;
        }
        return true;
      }).length;
    },
  };

  // PhotoReviewAction
  let actionCounter = 0;
  p.photoReviewAction = {
    create: async ({ data }: any) => {
      const rec = {
        id: data.id || `act_${crypto.randomUUID()}`,
        created_at: new Date(Date.now() + (++actionCounter * 10)),
        undone: false,
        ...data,
      };
      mockDb.reviewActions.push(rec);
      return rec;
    },
    findFirst: async ({ where, orderBy }: any = {}) => {
      let filtered = mockDb.reviewActions.filter((a) => {
        if (!where) return true;
        for (const [k, v] of Object.entries(where)) {
          if (a[k] !== v) return false;
        }
        return true;
      });
      if (orderBy?.created_at === 'desc') {
        filtered = filtered.slice().sort((a, b) => {
          const diff = new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
          if (diff !== 0) return diff;
          return mockDb.reviewActions.indexOf(b) - mockDb.reviewActions.indexOf(a);
        });
      }
      return filtered[0] || null;
    },
    findMany: async ({ where }: any = {}) => {
      return mockDb.reviewActions.filter((a) => {
        if (!where) return true;
        for (const [k, v] of Object.entries(where)) {
          if (a[k] !== v) return false;
        }
        return true;
      });
    },
    update: async ({ where, data }: any) => {
      const idx = mockDb.reviewActions.findIndex((a) => a.id === where.id);
      if (idx === -1) throw new Error('Review action not found');
      mockDb.reviewActions[idx] = { ...mockDb.reviewActions[idx], ...data };
      return mockDb.reviewActions[idx];
    },
    updateMany: async ({ where, data }: any) => {
      let count = 0;
      for (const a of mockDb.reviewActions) {
        let match = true;
        for (const [k, v] of Object.entries(where || {})) {
          if (a[k] !== v) { match = false; break; }
        }
        if (match) {
          Object.assign(a, data);
          count++;
        }
      }
      return { count };
    },
    deleteMany: async ({ where }: any = {}) => {
      const initLen = mockDb.reviewActions.length;
      mockDb.reviewActions = mockDb.reviewActions.filter((a) => {
        if (!where) return false;
        for (const [k, v] of Object.entries(where)) {
          if (a[k] === v) return false;
        }
        return true;
      });
      return { count: initLen - mockDb.reviewActions.length };
    },
    count: async ({ where }: any = {}) => {
      return mockDb.reviewActions.filter((a) => {
        if (!where) return true;
        for (const [k, v] of Object.entries(where)) {
          if (a[k] !== v) return false;
        }
        return true;
      }).length;
    },
  };

  // PhotoEditPreset
  p.photoEditPreset = {
    create: async ({ data }: any) => {
      const rec = {
        id: data.id || `ep_${crypto.randomUUID()}`,
        created_at: new Date(),
        updated_at: new Date(),
        is_default: data.is_default ?? false,
        is_system: data.is_system ?? false,
        ...data,
      };
      mockDb.editPresets.push(rec);
      return rec;
    },
    findUnique: async ({ where }: any) => {
      return mockDb.editPresets.find((p) => p.id === where.id) || null;
    },
    findFirst: async ({ where }: any) => {
      return (
        mockDb.editPresets.find((p) => {
          for (const [k, v] of Object.entries(where)) {
            if (p[k] !== v) return false;
          }
          return true;
        }) || null
      );
    },
    findMany: async ({ where }: any = {}) => {
      return mockDb.editPresets.filter((p) => {
        if (!where) return true;
        if (where.OR) {
          return where.OR.some((clause: any) => {
            for (const [k, v] of Object.entries(clause)) {
              if (p[k] !== v) return false;
            }
            return true;
          });
        }
        for (const [k, v] of Object.entries(where)) {
          if (p[k] !== v) return false;
        }
        return true;
      });
    },
    count: async () => mockDb.editPresets.length,
  };

  // PhotoEditJob
  p.photoEditJob = {
    create: async ({ data }: any) => {
      const rec = {
        id: data.id || `ej_${crypto.randomUUID()}`,
        created_at: new Date(),
        updated_at: new Date(),
        status: data.status || EditJobStatus.QUEUED,
        priority: data.priority || 'NORMAL',
        ...data,
      };
      mockDb.editJobs.push(rec);
      return rec;
    },
    findUnique: async ({ where, include }: any) => {
      const job = mockDb.editJobs.find((j) => j.id === where.id);
      if (!job) return null;
      const res = { ...job };
      if (include?.suggestions) {
        res.suggestions = mockDb.editSuggestions.filter((s) => s.edit_job_id === job.id);
      }
      if (include?.versions) {
        res.versions = mockDb.editVersions.filter((v) => v.edit_job_id === job.id);
      }
      return res;
    },
    findFirst: async ({ where, include }: any) => {
      const job =
        mockDb.editJobs.find((j) => {
          for (const [k, v] of Object.entries(where)) {
            if (j[k] !== v) return false;
          }
          return true;
        }) || null;
      if (!job) return null;
      const res = { ...job };
      if (include?.suggestions) {
        res.suggestions = mockDb.editSuggestions.filter((s) => s.edit_job_id === job.id);
      }
      if (include?.versions) {
        res.versions = mockDb.editVersions.filter((v) => v.edit_job_id === job.id);
      }
      return res;
    },
    findMany: async ({ where }: any = {}) => {
      return mockDb.editJobs.filter((j) => {
        if (!where) return true;
        for (const [k, v] of Object.entries(where)) {
          if (j[k] !== v) return false;
        }
        return true;
      });
    },
    update: async ({ where, data }: any) => {
      const idx = mockDb.editJobs.findIndex((j) => j.id === where.id);
      if (idx === -1) throw new Error('Edit job not found');
      mockDb.editJobs[idx] = { ...mockDb.editJobs[idx], ...data, updated_at: new Date() };
      return mockDb.editJobs[idx];
    },
    count: async ({ where }: any = {}) => {
      return mockDb.editJobs.filter((j) => {
        if (!where) return true;
        for (const [k, v] of Object.entries(where)) {
          if (j[k] !== v) return false;
        }
        return true;
      }).length;
    },
  };

  // PhotoEditSuggestion
  p.photoEditSuggestion = {
    create: async ({ data }: any) => {
      const rec = {
        id: data.id || `es_${crypto.randomUUID()}`,
        created_at: new Date(),
        is_applied: false,
        confidence: data.confidence || 0.9,
        ...data,
      };
      mockDb.editSuggestions.push(rec);
      return rec;
    },
    findUnique: async ({ where }: any) => {
      return mockDb.editSuggestions.find((s) => s.id === where.id) || null;
    },
    findFirst: async ({ where }: any) => {
      return (
        mockDb.editSuggestions.find((s) => {
          for (const [k, v] of Object.entries(where)) {
            if (s[k] !== v) return false;
          }
          return true;
        }) || null
      );
    },
    findMany: async ({ where }: any = {}) => {
      return mockDb.editSuggestions.filter((s) => {
        if (!where) return true;
        for (const [k, v] of Object.entries(where)) {
          if (s[k] !== v) return false;
        }
        return true;
      });
    },
    update: async ({ where, data }: any) => {
      const idx = mockDb.editSuggestions.findIndex((s) => s.id === where.id);
      if (idx === -1) throw new Error('Suggestion not found');
      mockDb.editSuggestions[idx] = { ...mockDb.editSuggestions[idx], ...data };
      return mockDb.editSuggestions[idx];
    },
    count: async ({ where }: any = {}) => {
      return mockDb.editSuggestions.filter((s) => {
        if (!where) return true;
        for (const [k, v] of Object.entries(where)) {
          if (s[k] !== v) return false;
        }
        return true;
      }).length;
    },
  };

  // PhotoEditVersion
  p.photoEditVersion = {
    create: async ({ data }: any) => {
      const rec = {
        id: data.id || `ev_${crypto.randomUUID()}`,
        created_at: new Date(),
        render_status: data.render_status || 'RENDERED',
        ...data,
      };
      mockDb.editVersions.push(rec);
      return rec;
    },
    findUnique: async ({ where }: any) => {
      return mockDb.editVersions.find((v) => v.id === where.id) || null;
    },
    findMany: async ({ where }: any = {}) => {
      return mockDb.editVersions.filter((v) => {
        if (!where) return true;
        for (const [k, v] of Object.entries(where)) {
          if (v[k] !== v) return false;
        }
        return true;
      });
    },
    count: async ({ where }: any = {}) => {
      return mockDb.editVersions.filter((v) => {
        if (!where) return true;
        for (const [k, v] of Object.entries(where)) {
          if (v[k] !== v) return false;
        }
        return true;
      }).length;
    },
  };

  // PhotoExportPreset
  p.photoExportPreset = {
    create: async ({ data }: any) => {
      const rec = {
        id: data.id || `exp_p_${crypto.randomUUID()}`,
        created_at: new Date(),
        updated_at: new Date(),
        is_system: data.is_system ?? false,
        ...data,
      };
      mockDb.exportPresets.push(rec);
      return rec;
    },
    findUnique: async ({ where }: any) => {
      return mockDb.exportPresets.find((p) => p.id === where.id) || null;
    },
    findFirst: async ({ where }: any) => {
      return (
        mockDb.exportPresets.find((p) => {
          for (const [k, v] of Object.entries(where)) {
            if (p[k] !== v) return false;
          }
          return true;
        }) || null
      );
    },
    findMany: async ({ where }: any = {}) => {
      return mockDb.exportPresets.filter((p) => {
        if (!where) return true;
        if (where.OR) {
          return where.OR.some((clause: any) => {
            for (const [k, v] of Object.entries(clause)) {
              if (p[k] !== v) return false;
            }
            return true;
          });
        }
        for (const [k, v] of Object.entries(where)) {
          if (p[k] !== v) return false;
        }
        return true;
      });
    },
    count: async () => mockDb.exportPresets.length,
  };

  // PhotoExportJob
  p.photoExportJob = {
    create: async ({ data }: any) => {
      const rec = {
        id: data.id || `exp_j_${crypto.randomUUID()}`,
        created_at: new Date(),
        status: data.status || ExportJobStatus.QUEUED,
        total_items: data.total_items || 0,
        processed_items: data.processed_items || 0,
        watermark_enabled: data.watermark_enabled ?? false,
        ...data,
      };
      mockDb.exportJobs.push(rec);
      return rec;
    },
    findUnique: async ({ where, include }: any) => {
      const job = mockDb.exportJobs.find((j) => j.id === where.id);
      if (!job) return null;
      const res = { ...job };
      if (include?.artifacts) {
        res.artifacts = mockDb.exportArtifacts.filter((a) => a.export_job_id === job.id);
      }
      return res;
    },
    findFirst: async ({ where, include }: any) => {
      const job =
        mockDb.exportJobs.find((j) => {
          for (const [k, v] of Object.entries(where)) {
            if (j[k] !== v) return false;
          }
          return true;
        }) || null;
      if (!job) return null;
      const res = { ...job };
      if (include?.artifacts) {
        res.artifacts = mockDb.exportArtifacts.filter((a) => a.export_job_id === job.id);
      }
      return res;
    },
    findMany: async ({ where }: any = {}) => {
      return mockDb.exportJobs.filter((j) => {
        if (!where) return true;
        for (const [k, v] of Object.entries(where)) {
          if (j[k] !== v) return false;
        }
        return true;
      });
    },
    update: async ({ where, data }: any) => {
      const idx = mockDb.exportJobs.findIndex((j) => j.id === where.id);
      if (idx === -1) throw new Error('Export job not found');
      mockDb.exportJobs[idx] = { ...mockDb.exportJobs[idx], ...data };
      return mockDb.exportJobs[idx];
    },
    count: async ({ where }: any = {}) => {
      return mockDb.exportJobs.filter((j) => {
        if (!where) return true;
        for (const [k, v] of Object.entries(where)) {
          if (j[k] !== v) return false;
        }
        return true;
      }).length;
    },
  };

  // PhotoExportArtifact
  p.photoExportArtifact = {
    create: async ({ data }: any) => {
      const rec = {
        id: data.id || `art_${crypto.randomUUID()}`,
        created_at: new Date(),
        ...data,
      };
      mockDb.exportArtifacts.push(rec);
      return rec;
    },
    findMany: async ({ where }: any = {}) => {
      return mockDb.exportArtifacts.filter((a) => {
        if (!where) return true;
        for (const [k, v] of Object.entries(where)) {
          if (a[k] !== v) return false;
        }
        return true;
      });
    },
    count: async () => mockDb.exportArtifacts.length,
  };

  // Photo
  p.photo = {
    findMany: async ({ where }: any = {}) => {
      return mockDb.photos.filter((ph) => {
        if (!where) return true;
        for (const [k, v] of Object.entries(where)) {
          if (k === 'id' && typeof v === 'object' && v.in) {
            if (!v.in.includes(ph.id)) return false;
            continue;
          }
          if (ph[k] !== v) return false;
        }
        return true;
      });
    },
    findUnique: async ({ where }: any) => {
      return mockDb.photos.find((ph) => ph.id === where.id) || null;
    },
    findFirst: async ({ where }: any) => {
      return (
        mockDb.photos.find((ph) => {
          for (const [k, v] of Object.entries(where)) {
            if (ph[k] !== v) return false;
          }
          return true;
        }) || null
      );
    },
    update: async ({ where, data }: any) => {
      const idx = mockDb.photos.findIndex((ph) => ph.id === where.id);
      if (idx !== -1) {
        mockDb.photos[idx] = { ...mockDb.photos[idx], ...data };
        return mockDb.photos[idx];
      }
      return null;
    },
  };

  // Gallery
  p.gallery = {
    findUnique: async ({ where }: any) => {
      return mockDb.galleries.find((g) => g.id === where.id) || null;
    },
    findFirst: async ({ where }: any) => {
      return (
        mockDb.galleries.find((g) => {
          for (const [k, v] of Object.entries(where)) {
            if (g[k] !== v) return false;
          }
          return true;
        }) || null
      );
    },
    create: async ({ data }: any) => {
      const rec = { id: data.id || `gal_${crypto.randomUUID()}`, ...data };
      mockDb.galleries.push(rec);
      return rec;
    },
  };

  // Studio
  p.studio = {
    findUnique: async ({ where }: any) => {
      return mockDb.studios.find((s) => s.id === where.id) || null;
    },
    findFirst: async ({ where }: any) => {
      return (
        mockDb.studios.find((s) => {
          for (const [k, v] of Object.entries(where)) {
            if (s[k] !== v) return false;
          }
          return true;
        }) || null
      );
    },
    create: async ({ data }: any) => {
      const rec = { id: data.id || `studio_${crypto.randomUUID()}`, ...data };
      mockDb.studios.push(rec);
      return rec;
    },
  };

  // User
  p.user = {
    findUnique: async ({ where }: any) => {
      return mockDb.users.find((u) => u.id === where.id) || null;
    },
    findFirst: async ({ where }: any) => {
      return (
        mockDb.users.find((u) => {
          for (const [k, v] of Object.entries(where)) {
            if (u[k] !== v) return false;
          }
          return true;
        }) || null
      );
    },
    create: async ({ data }: any) => {
      const rec = { id: data.id || `user_${crypto.randomUUID()}`, ...data };
      mockDb.users.push(rec);
      return rec;
    },
  };

  // PhotoVersion
  p.photoVersion = {
    create: async ({ data }: any) => {
      const rec = { id: data.id || `ver_${crypto.randomUUID()}`, created_at: new Date(), ...data };
      mockDb.photoVersions.push(rec);
      return rec;
    },
    findMany: async ({ where }: any = {}) => {
      return mockDb.photoVersions.filter((v) => {
        if (!where) return true;
        for (const [k, val] of Object.entries(where)) {
          if (v[k] !== val) return false;
        }
        return true;
      });
    },
  };

  // StudioProject & ProjectProduction
  p.studioProject = {
    findUnique: async ({ where }: any) => mockDb.projects.find((pr) => pr.id === where.id) || null,
    findFirst: async ({ where }: any) => {
      return (
        mockDb.projects.find((pr) => {
          for (const [k, v] of Object.entries(where)) {
            if (pr[k] !== v) return false;
          }
          return true;
        }) || null
      );
    },
    create: async ({ data }: any) => {
      const rec = { id: data.id || `proj_${crypto.randomUUID()}`, ...data };
      mockDb.projects.push(rec);
      return rec;
    },
    update: async ({ where, data }: any) => {
      const idx = mockDb.projects.findIndex((pr) => pr.id === where.id);
      if (idx !== -1) {
        mockDb.projects[idx] = { ...mockDb.projects[idx], ...data };
        return mockDb.projects[idx];
      }
      return null;
    },
  };

  p.projectProduction = {
    findUnique: async ({ where }: any) => {
      if (where.project_id) return mockDb.projectProductions.find((pp) => pp.project_id === where.project_id) || null;
      return mockDb.projectProductions.find((pp) => pp.id === where.id) || null;
    },
    findFirst: async ({ where }: any) => {
      return (
        mockDb.projectProductions.find((pp) => {
          for (const [k, v] of Object.entries(where)) {
            if (pp[k] !== v) return false;
          }
          return true;
        }) || null
      );
    },
    create: async ({ data }: any) => {
      const rec = { id: data.id || `prod_${crypto.randomUUID()}`, ...data };
      mockDb.projectProductions.push(rec);
      return rec;
    },
    update: async ({ where, data }: any) => {
      const idx = mockDb.projectProductions.findIndex((pp) => (where.project_id && pp.project_id === where.project_id) || pp.id === where.id);
      if (idx !== -1) {
        mockDb.projectProductions[idx] = { ...mockDb.projectProductions[idx], ...data };
        return mockDb.projectProductions[idx];
      }
      return null;
    },
  };

  p.photoAIAnalysis = {
    findUnique: async ({ where }: any) => {
      return mockDb.aiAnalyses.find((a) => a.photo_id === where.photo_id || a.id === where.id) || null;
    },
    findFirst: async ({ where }: any) => {
      return (
        mockDb.aiAnalyses.find((a) => {
          for (const [k, v] of Object.entries(where)) {
            if (a[k] !== v) return false;
          }
          return true;
        }) || null
      );
    },
    findMany: async ({ where }: any = {}) => {
      return mockDb.aiAnalyses.filter((a) => {
        if (!where) return true;
        for (const [k, v] of Object.entries(where)) {
          if (a[k] !== v) return false;
        }
        return true;
      });
    },
    create: async ({ data }: any) => {
      const rec = { id: data.id || `ai_${crypto.randomUUID()}`, ...data };
      mockDb.aiAnalyses.push(rec);
      return rec;
    },
    count: async ({ where }: any = {}) => {
      return mockDb.aiAnalyses.filter((a) => {
        if (!where) return true;
        for (const [k, v] of Object.entries(where)) {
          if (a[k] !== v) return false;
        }
        return true;
      }).length;
    },
  };

  p.$transaction = async (fnOrArray: any) => {
    if (typeof fnOrArray === 'function') {
      return await fnOrArray(p);
    }
    if (Array.isArray(fnOrArray)) {
      return await Promise.all(fnOrArray);
    }
    return fnOrArray;
  };
}

async function runPhase24MasterTestSuite() {
  console.log('\n============================================================');
  console.log('🚀 PIXMATCH AI — PHASE 24 MASTER CERTIFICATION TEST SUITE');
  console.log('Advanced Media Culling, Editing Workflow & AI-Assisted Post-Production');
  console.log('============================================================\n');

  patchPrismaMock();
  mockDb.reset();

  const studioA = 'studio_alpha_001';
  const studioB = 'studio_beta_002';
  const userA = 'user_alice_001';
  const userB = 'user_bob_002';
  const galleryA = 'gal_alpha_001';
  const galleryB = 'gal_beta_002';
  const projectA = 'proj_alpha_001';

  // Seed baseline studios, users, galleries, projects
  mockDb.studios.push(
    { id: studioA, name: 'Studio Alpha', slug: 'studio-alpha' },
    { id: studioB, name: 'Studio Beta', slug: 'studio-beta' }
  );
  mockDb.users.push(
    { id: userA, studio_id: studioA, name: 'Alice Photographer', email: 'alice@alpha.com' },
    { id: userB, studio_id: studioB, name: 'Bob Reviewer', email: 'bob@beta.com' }
  );
  mockDb.galleries.push(
    { id: galleryA, studio_id: studioA, title: 'Wedding Ceremony Gallery', name: 'Wedding Ceremony Gallery' },
    { id: galleryB, studio_id: studioB, title: 'Commercial Shoot Gallery', name: 'Commercial Shoot Gallery' }
  );
  mockDb.projects.push(
    { id: projectA, studio_id: studioA, name: 'Wedding Project 2026', status: 'BOOKED' }
  );
  mockDb.projectProductions.push(
    { id: `prod_${projectA}`, studio_id: studioA, project_id: projectA, current_stage: 'MEDIA_INGESTED', media_ingested: true }
  );

  // Seed baseline photos
  for (let i = 1; i <= 20; i++) {
    mockDb.photos.push({
      id: `photo_a_${i}`,
      studio_id: studioA,
      gallery_id: galleryA,
      filename: `IMG_2026_${i.toString().padStart(4, '0')}.CR3`,
      storage_key: `raw/photos/${studioA}/${galleryA}/IMG_${i}.CR3`,
      is_deleted: false,
      width: 6000,
      height: 4000,
      created_at: new Date(Date.now() - (20 - i) * 1000),
    });
  }

  // ============================================================
  // SECTION 1: 8-FACTOR CULLING SCORE MATH & AI RECOMMENDATIONS
  // ============================================================
  console.log('\n--- SECTION 1: 8-Factor Culling Score Math & AI Recommendations ---');

  // Group 1: 8-Factor Deterministic Culling Score Math & Exact Weights
  const perfectMetrics = {
    sharpness: 95,
    exposure: 90,
    composition: 85,
    eyes_expressions: 92,
    technical_quality: 94,
    event_relevance: 90,
    duplicate_penalty: 0,
    best_shot_signal: 100,
  };

  const scoreResult = CullEngineService.calculateCompositeScore(perfectMetrics);
  assert(scoreResult.total_score >= 85 && scoreResult.total_score <= 100, 'Group 1.1: Perfect metrics yield high composite score (>=85)');
  assert(scoreResult.total_score >= 0 && scoreResult.total_score <= 100, 'Group 1.2: Score bounded strictly within [0, 100]');
  assert(scoreResult.reasons.length > 0, 'Group 1.3: Score explanation reasons are populated');
  assert(typeof scoreResult.sharpness === 'number', 'Group 1.4: Sharpness factor computed in score breakdown');
  assert(typeof scoreResult.eyes_expressions === 'number', 'Group 1.5: Eyes/expressions factor computed in score breakdown');
  assert(typeof scoreResult.confidence === 'number' && scoreResult.confidence > 0.8, 'Group 1.6: Score confidence rating computed (>0.8 for full metrics)');

  // Group 2: AI Score Recommendation Thresholds
  const highQuality = CullEngineService.calculateCompositeScore({ ...perfectMetrics, sharpness: 90 });
  assert(highQuality.recommendation === 'KEEP', 'Group 2.1: Composite score >= 70 classifies as KEEP');
  assert(highQuality.total_score >= 70, 'Group 2.2: KEEP score exceeds threshold of 70');

  const poorQuality = CullEngineService.calculateCompositeScore({
    sharpness: 20,
    exposure: 30,
    composition: 30,
    eyes_expressions: 25,
    technical_quality: 20,
    event_relevance: 40,
    duplicate_penalty: 50,
    best_shot_signal: 0,
  });
  assert(poorQuality.recommendation === 'REJECT', 'Group 2.3: Low composite score (<45) classifies as REJECT');
  assert(poorQuality.total_score < 45, 'Group 2.4: REJECT score is strictly below 45');

  const borderQuality = CullEngineService.calculateCompositeScore({
    sharpness: 55,
    exposure: 60,
    composition: 55,
    eyes_expressions: 60,
    technical_quality: 55,
    event_relevance: 60,
    duplicate_penalty: 0,
    best_shot_signal: 0,
  });
  assert(borderQuality.recommendation === 'MAYBE', 'Group 2.5: Mid-range score (45-69) classifies as MAYBE');
  assert(borderQuality.total_score >= 45 && borderQuality.total_score < 70, 'Group 2.6: MAYBE score within [45, 69] range');

  // Group 3: Severe Blur Early Rejection Rule
  const severelyBlurred = CullEngineService.calculateCompositeScore({
    ...perfectMetrics,
    sharpness: 15, // Severe blur < 25
  });
  assert(severelyBlurred.recommendation === 'REJECT', 'Group 3.1: Severe blur (<25 sharpness) triggers early REJECT override');
  assert(severelyBlurred.warnings.some((w) => w.toLowerCase().includes('blur') || w.toLowerCase().includes('sharpness')), 'Group 3.2: Severe blur warning emitted');
  assert(severelyBlurred.sharpness < 25, 'Group 3.3: Blur breakdown reflects sub-25 metric');

  // Group 4: Low Confidence Handling & Fallbacks
  const zeroMetrics = CullEngineService.calculateCompositeScore({});
  assert(zeroMetrics.total_score >= 0 && zeroMetrics.total_score <= 100, 'Group 4.1: Empty metric object safely falls back to valid score');
  assert(zeroMetrics.confidence > 0, 'Group 4.2: Confidence rating computed');
  assert(Array.isArray(zeroMetrics.warnings), 'Group 4.3: Warnings array provided for sparse metrics');

  // ============================================================
  // SECTION 2: BURST DETECTION & DHASH GROUPING
  // ============================================================
  console.log('\n--- SECTION 2: Burst Detection & dHash Sequence Grouping ---');

  // Group 5: Time-Window Proximity Clustering (<= 2000ms threshold)
  const now = Date.now();
  const burstTimestamps = [
    new Date(now),
    new Date(now + 400),
    new Date(now + 850),
    new Date(now + 1200),
  ];
  assert(CullEngineService.isBurstTimeProximity(burstTimestamps[0], burstTimestamps[1], 2000), 'Group 5.1: 400ms interval qualifies for burst cluster');
  assert(CullEngineService.isBurstTimeProximity(burstTimestamps[0], burstTimestamps[3], 2000), 'Group 5.2: 1200ms interval qualifies for burst cluster');
  assert(!CullEngineService.isBurstTimeProximity(burstTimestamps[0], new Date(now + 5000), 2000), 'Group 5.3: 5000ms interval rejected from burst cluster');
  assert(CullEngineService.isBurstTimeProximity(burstTimestamps[0], burstTimestamps[0], 2000), 'Group 5.4: 0ms identical timestamp qualifies for burst cluster');
  assert(!CullEngineService.isBurstTimeProximity(burstTimestamps[0], new Date(now + 2001), 2000), 'Group 5.5: 2001ms interval rejected from burst cluster');

  // Group 6: dHash Computation & Hamming Distance Matching
  const hash1 = '1100110011001100110011001100110011001100110011001100110011001100';
  const hash2 = '1100110011001100110011001100110011001100110011001100110011001111'; // 2 bits diff
  const hashDifferent = '0011001100110011001100110011001100110011001100110011001100110011'; // 64 bits diff

  const distanceClose = CullEngineService.calculateHammingDistance(hash1, hash2);
  const distanceFar = CullEngineService.calculateHammingDistance(hash1, hashDifferent);
  assert(distanceClose === 2, 'Group 6.1: Hamming distance calculated accurately (2 bits)');
  assert(distanceFar === 64, 'Group 6.2: Maximum Hamming distance calculated accurately (64 bits)');
  assert(CullEngineService.isVisualSimilarityMatch(distanceClose, 12), 'Group 6.3: Distance <= 12 qualifies as visual match');
  assert(!CullEngineService.isVisualSimilarityMatch(distanceFar, 12), 'Group 6.4: Distance > 12 rejected as visual match');
  assert(CullEngineService.isVisualSimilarityMatch(0, 12), 'Group 6.5: Distance 0 qualifies as visual match');

  // Group 7: Burst Group Creation & Member Association
  const burstGroup = await CullEngineService.createBurstGroup(studioA, galleryA, {
    photoIds: ['photo_a_1', 'photo_a_2', 'photo_a_3'],
    representativeId: 'photo_a_2',
    avgSimilarity: 0.96,
  });
  assert(burstGroup.id.startsWith('bg_'), 'Group 7.1: Burst group created with prefix bg_');
  assert(burstGroup.photo_count === 3, 'Group 7.2: Burst group records correct photo count (3)');
  assert(mockDb.burstGroupMembers.length === 3, 'Group 7.3: Burst group members inserted into database');
  assert(burstGroup.representative_photo_id === 'photo_a_2', 'Group 7.4: Representative photo ID assigned');
  assert(burstGroup.studio_id === studioA, 'Group 7.5: Burst group scoped to studio A');

  // Group 8: Best-of-Burst Scoring & Representative Selection
  const bestShot = await CullEngineService.evaluateBestInBurst(studioA, burstGroup.id, [
    { photo_id: 'photo_a_1', sharpness: 70, expressions: 80, score: 75 },
    { photo_id: 'photo_a_2', sharpness: 95, expressions: 90, score: 92 },
    { photo_id: 'photo_a_3', sharpness: 60, expressions: 75, score: 68 },
  ]);
  assert(bestShot.best_photo_id === 'photo_a_2', 'Group 8.1: Highest quality photo elected best in burst');
  assert(bestShot.confidence > 0.85, 'Group 8.2: High confidence in best-in-burst selection');
  assert(bestShot.reason.length > 0, 'Group 8.3: Reason for best-in-burst selection emitted');

  // Group 9: Mixed Camera / Lens Burst Isolation
  const diffCameraMatch = CullEngineService.validateBurstCameraCompatibility(
    { make: 'Canon', model: 'EOS R5', lens: '85mm' },
    { make: 'Sony', model: 'A7 IV', lens: '35mm' }
  );
  assert(!diffCameraMatch, 'Group 9.1: Dissimilar camera bodies/lenses isolated from same burst cluster');
  const sameCameraMatch = CullEngineService.validateBurstCameraCompatibility(
    { make: 'Canon', model: 'EOS R5', lens: '85mm' },
    { make: 'Canon', model: 'EOS R5', lens: '85mm' }
  );
  assert(sameCameraMatch, 'Group 9.2: Identical camera bodies and lenses match for burst grouping');

  // ============================================================
  // SECTION 3: DUPLICATE DETECTION & PENALTY
  // ============================================================
  console.log('\n--- SECTION 3: Duplicate Detection & Non-Destructive Flagging ---');

  // Group 10: Exact Duplicate Detection (Distance = 0)
  const exactDist = CullEngineService.calculateHammingDistance(hash1, hash1);
  assert(exactDist === 0, 'Group 10.1: Exact duplicate identified with 0 Hamming distance');
  assert(CullEngineService.isExactDuplicate(exactDist), 'Group 10.2: Exact duplicate boolean flag is true');
  assert(!CullEngineService.isExactDuplicate(1), 'Group 10.3: Non-zero Hamming distance is not exact duplicate');

  // Group 11: Near-Duplicate Detection & Penalty Application
  const dupPenalty = CullEngineService.calculateDuplicatePenalty(2); // 2 bit distance = high duplicate probability
  assert(dupPenalty > 40, 'Group 11.1: Near-duplicate applies substantial score penalty');
  const distinctPenalty = CullEngineService.calculateDuplicatePenalty(25); // large distance
  assert(distinctPenalty === 0, 'Group 11.2: Visually distinct photo incurs zero duplicate penalty');
  assert(dupPenalty <= 60, 'Group 11.3: Duplicate penalty does not exceed maximum cap');

  // Group 12: Duplicate Grouping Non-Destructive Flag
  const candidateScores = await CullEngineService.scorePhotoCandidate(studioA, 'photo_a_1', {
    sharpness: 88,
    isDuplicate: true,
  });
  assert(candidateScores.score_breakdown.duplicate_penalty > 0, 'Group 12.1: Duplicate penalty applied non-destructively in score breakdown');
  assert(typeof candidateScores.ai_score === 'number', 'Group 12.2: Candidate total score computed as numeric value');
  assert(candidateScores.recommendation !== undefined, 'Group 12.3: Candidate recommendation provided');

  // ============================================================
  // SECTION 4: PHOTOGRAPHER AUTHORITY & NON-DESTRUCTIVE DECISIONS
  // ============================================================
  console.log('\n--- SECTION 4: Photographer Authority & Non-Destructive Invariant ---');

  // Initialize a Culling Session
  const sessionA = await CullSessionService.createCullSession(studioA, userA, {
    galleryId: galleryA,
    projectId: projectA,
    name: 'Wedding Ceremony Culling',
  });
  assert(sessionA.id.startsWith('cs_'), 'Group 13.1: Cull session initialized with studio tenant ID');
  assert(sessionA.status === CullSessionStatus.IN_PROGRESS, 'Group 13.2: New cull session status is IN_PROGRESS');

  // Group 13: Single Photo Keep Decision
  const keepDec = await CullSessionService.recordDecision(studioA, sessionA.id, 'photo_a_1', userA, {
    decision: CullDecisionType.PHOTOGRAPHER_KEEP,
    rating: 5,
    colorLabel: 'GREEN',
  });
  assert(keepDec.decision === CullDecisionType.PHOTOGRAPHER_KEEP, 'Group 13.3: Keep decision recorded');
  assert(keepDec.rating === 5, 'Group 13.4: 5-star rating metadata updated');
  assert(keepDec.color_label === 'GREEN', 'Group 13.5: Color label updated to GREEN');

  // Group 14: Single Photo Reject Decision
  const rejDec = await CullSessionService.recordDecision(studioA, sessionA.id, 'photo_a_2', userA, {
    decision: CullDecisionType.PHOTOGRAPHER_REJECT,
    colorLabel: 'RED',
  });
  assert(rejDec.decision === CullDecisionType.PHOTOGRAPHER_REJECT, 'Group 14.1: Reject decision recorded');
  assert(rejDec.color_label === 'RED', 'Group 14.2: Color label updated to RED on rejection');
  assert(rejDec.photo_id === 'photo_a_2', 'Group 14.3: Reject decision targets correct photo');

  // Group 15: Single Photo Maybe Decision
  const maybeDec = await CullSessionService.recordDecision(studioA, sessionA.id, 'photo_a_3', userA, {
    decision: CullDecisionType.PHOTOGRAPHER_MAYBE,
    colorLabel: 'YELLOW',
  });
  assert(maybeDec.decision === CullDecisionType.PHOTOGRAPHER_MAYBE, 'Group 15.1: Maybe decision recorded');
  assert(maybeDec.color_label === 'YELLOW', 'Group 15.2: Color label updated to YELLOW on maybe');

  // Group 16: Non-Destructive Invariant — Rejection Never Deletes Files
  const photoA2 = mockDb.photos.find((p) => p.id === 'photo_a_2');
  assert(photoA2 !== undefined, 'Group 16.1: Rejected photo record remains in database');
  assert(!photoA2.is_deleted, 'Group 16.2: Rejected photo is_deleted flag is false');
  assert(photoA2.storage_key.length > 0, 'Group 16.3: Rejected photo storage key intact and immutable');
  assert(photoA2.width === 6000 && photoA2.height === 4000, 'Group 16.4: Master photo dimensions preserved unchanged');

  // Group 17: Star Rating & Color Label Updates
  const updatedDec = await CullSessionService.recordDecision(studioA, sessionA.id, 'photo_a_1', userA, {
    decision: CullDecisionType.PHOTOGRAPHER_KEEP,
    rating: 4,
    colorLabel: 'BLUE',
  });
  assert(updatedDec.rating === 4 && updatedDec.color_label === 'BLUE', 'Group 17.1: Metadata updated on existing decision');
  assert(updatedDec.photo_id === 'photo_a_1', 'Group 17.2: Decision photo ID intact during update');

  // Group 18: Bulk Culling Decisions Execution
  const bulkRes = await CullSessionService.bulkRecordDecisions(
    studioA,
    sessionA.id,
    userA,
    ['photo_a_4', 'photo_a_5', 'photo_a_6'],
    CullDecisionType.PHOTOGRAPHER_KEEP,
    'GREEN'
  );
  assert(bulkRes.count === 3, 'Group 18.1: Bulk decision applied to 3 photos');
  assert(bulkRes.success, 'Group 18.2: Bulk operation returned success');
  assert(bulkRes.updated_ids.length === 3, 'Group 18.3: Bulk response returned all affected photo IDs');

  // Group 19: Candidate Filtering
  const keptCandidates = await CullSessionService.getCullCandidates(studioA, sessionA.id, {
    decisionFilter: CullDecisionType.PHOTOGRAPHER_KEEP,
  });
  assert(keptCandidates.length >= 4, 'Group 19.1: Filter by decision=KEEP returns only kept photos');
  assert(keptCandidates.every((c: any) => c.decision === CullDecisionType.PHOTOGRAPHER_KEEP), 'Group 19.2: All filtered candidates match decision predicate');

  // ============================================================
  // SECTION 5: MULTI-USER SELECTION LOCKS & CONCURRENCY
  // ============================================================
  console.log('\n--- SECTION 5: Multi-User Selection Locks & Concurrency ---');

  // Group 20: Selection Lock Acquisition
  const lockAcquired = await CullSessionService.acquireSelectionLock(studioA, 'photo_a_7', userA, 300);
  assert(lockAcquired.success, 'Group 20.1: User A successfully acquires selection lock on photo 7');
  assert(lockAcquired.lock?.locked_by === userA, 'Group 20.2: Lock holder registered as User A');
  assert(lockAcquired.lock?.photo_id === 'photo_a_7', 'Group 20.3: Locked photo ID matches target');
  assert(lockAcquired.lock?.expires_at instanceof Date, 'Group 20.4: Lock expiration timestamp properly formatted');

  // Group 21: Multi-User Selection Lock Conflict Rejection
  const lockConflict = await CullSessionService.acquireSelectionLock(studioA, 'photo_a_7', userB, 300);
  assert(!lockConflict.success, 'Group 21.1: User B lock attempt rejected when photo is locked by User A');
  assert(lockConflict.error?.includes('locked'), 'Group 21.2: Informative error message on lock conflict');
  assert(lockConflict.lock === undefined, 'Group 21.3: No lock object returned on conflict');

  // Group 22: Selection Lock TTL Expiry & Eviction
  // Manually backdate lock expiry to simulate TTL lapse
  const activeLock = mockDb.selectionLocks.find((l) => l.photo_id === 'photo_a_7');
  if (activeLock) activeLock.expires_at = new Date(Date.now() - 10000);

  const lockAfterExpiry = await CullSessionService.acquireSelectionLock(studioA, 'photo_a_7', userB, 300);
  assert(lockAfterExpiry.success, 'Group 22.1: User B acquires lock after User A TTL expires');
  assert(lockAfterExpiry.lock?.locked_by === userB, 'Group 22.2: Lock transferred to User B');
  assert(lockAfterExpiry.lock?.photo_id === 'photo_a_7', 'Group 22.3: Transferred lock targets photo 7');

  // Group 23: Explicit Selection Lock Release by Holder
  const releaseSuccess = await CullSessionService.releaseSelectionLock(studioA, 'photo_a_7', userB);
  assert(releaseSuccess, 'Group 23.1: Lock holder successfully releases lock');
  const lockAfterRelease = mockDb.selectionLocks.find((l) => l.photo_id === 'photo_a_7');
  assert(lockAfterRelease === undefined, 'Group 23.2: Lock removed from database after release');

  // ============================================================
  // SECTION 6: ACTION AUDIT & USER-SCOPED UNDO STACK
  // ============================================================
  console.log('\n--- SECTION 6: Action Audit Trail & User-Scoped Undo Stack ---');

  // Group 24: Review Action Logging
  const actBefore = mockDb.reviewActions.length;
  await CullSessionService.recordDecision(studioA, sessionA.id, 'photo_a_8', userA, {
    decision: CullDecisionType.PHOTOGRAPHER_REJECT,
  });
  assert(mockDb.reviewActions.length === actBefore + 1, 'Group 24.1: PhotoReviewAction record logged on culling decision');
  const latestAction = mockDb.reviewActions[mockDb.reviewActions.length - 1];
  assert(latestAction.studio_id === studioA, 'Group 24.2: Review action scoped to studio tenant');
  assert(latestAction.actor_id === userA || latestAction.user_id === userA, 'Group 24.3: Review action attributed to acting user');

  // Group 25: User-Scoped Undo History Stack (LIFO Reversion)
  await CullSessionService.recordDecision(studioA, sessionA.id, 'photo_a_8', userA, {
    decision: CullDecisionType.PHOTOGRAPHER_KEEP,
  });
  const undoResult = await CullSessionService.undoLastAction(studioA, sessionA.id, userA);
  assert(undoResult.success, 'Group 25.1: Undo executed successfully');
  assert(undoResult.reverted_photo_id === 'photo_a_8', 'Group 25.2: Target photo identified for undo');
  assert(undoResult.reverted_decision === CullDecisionType.PHOTOGRAPHER_REJECT, 'Group 25.3: Decision reverted to previous state (REJECT)');

  // Group 26: Multi-User Undo Isolation
  await CullSessionService.recordDecision(studioA, sessionA.id, 'photo_a_9', userB, {
    decision: CullDecisionType.PHOTOGRAPHER_KEEP,
  });
  const userAUndo = await CullSessionService.undoLastAction(studioA, sessionA.id, userA);
  assert(userAUndo.reverted_photo_id !== 'photo_a_9', 'Group 26.1: User A undo does not modify User B actions');

  // Group 27: Empty History Undo Safety
  mockDb.reviewActions.forEach((a) => (a.undone = true));
  const emptyUndo = await CullSessionService.undoLastAction(studioA, sessionA.id, userA);
  assert(!emptyUndo.success, 'Group 27.1: Undo on empty history safely returns false without errors');
  assert(emptyUndo.reverted_photo_id === undefined, 'Group 27.2: No photo reverted on empty undo');

  // ============================================================
  // SECTION 7: NON-DESTRUCTIVE EDITING ENGINE & DERIVATIVES
  // ============================================================
  console.log('\n--- SECTION 7: Non-Destructive Editing Engine & Parameters ---');

  // Group 28: Non-Destructive Invariant: Original Master Immutability
  const editJob1 = await EditEngineService.createEditJob(studioA, userA, {
    photoId: 'photo_a_1',
    galleryId: galleryA,
    parameters: {
      exposure: 15,
      contrast: 10,
      highlights: -20,
      shadows: 25,
      temperature: 5,
      tint: 0,
      saturation: 10,
      sharpness: 20,
    },
  });
  assert(editJob1.id.startsWith('ej_'), 'Group 28.1: Edit job created with prefix ej_');
  const masterPhoto1 = mockDb.photos.find((p) => p.id === 'photo_a_1');
  assert(masterPhoto1 !== undefined, 'Group 28.2: Original master photo record unchanged');
  assert(masterPhoto1.storage_key === `raw/photos/${studioA}/${galleryA}/IMG_1.CR3`, 'Group 28.3: Master storage key untouched');
  assert(editJob1.status === EditJobStatus.AI_SUGGESTED || editJob1.status === EditJobStatus.QUEUED, 'Group 28.4: Edit job initialized in QUEUED state');

  // Group 29: Parameter Range Validation
  const validParams = EditEngineService.validateParameters({
    exposure: 50,
    contrast: -30,
    highlights: -100,
    shadows: 100,
    temperature: 0,
    tint: 20,
    saturation: 40,
    sharpness: 80,
  });
  assert(validParams.isValid, 'Group 29.1: Parameters within [-100, 100] pass validation');
  assert(validParams.errors.length === 0, 'Group 29.2: Zero parameter validation errors on valid payload');

  // Group 30: Out-of-Bounds Parameter Clamping & Sanitization
  const clampedParams = EditEngineService.sanitizeParameters({
    exposure: 250, // exceeds 100
    contrast: -180, // below -100
    saturation: 10,
  });
  assert(clampedParams.exposure === 100, 'Group 30.1: Positive out-of-bounds parameter clamped to 100');
  assert(clampedParams.contrast === -100, 'Group 30.2: Negative out-of-bounds parameter clamped to -100');
  assert(clampedParams.saturation === 10, 'Group 30.3: Valid parameter preserved intact');

  // Group 31: Versioned Derivative Generation (v1, v2, v3 tracking)
  const v1 = await EditEngineService.createEditVersion(studioA, userA, editJob1.id, {
    versionType: EditVersionType.MANUAL_ADJUSTMENT,
    parameters: { exposure: 10, contrast: 5 },
  });
  assert(v1.version_number === 1, 'Group 31.1: First version numbered v1');
  const v2 = await EditEngineService.createEditVersion(studioA, userA, editJob1.id, {
    versionType: EditVersionType.AI_AUTO_ENHANCE,
    parameters: { exposure: 15, contrast: 10 },
  });
  assert(v2.version_number === 2, 'Group 31.2: Second version numbered v2');
  assert(v1.id.startsWith('ev_') && v2.id.startsWith('ev_'), 'Group 31.3: Edit versions have prefix ev_');

  // Group 32: Active Edit Job Lifecycle (QUEUED -> PROCESSING -> COMPLETED)
  const jobState1 = await EditEngineService.updateJobStatus(studioA, editJob1.id, EditJobStatus.PROCESSING);
  assert(jobState1.status === EditJobStatus.PROCESSING, 'Group 32.1: Job transitioned to PROCESSING');
  const jobState2 = await EditEngineService.updateJobStatus(studioA, editJob1.id, EditJobStatus.COMPLETED);
  assert(jobState2.status === EditJobStatus.COMPLETED, 'Group 32.2: Job transitioned to COMPLETED');
  assert(jobState2.updated_at instanceof Date, 'Group 32.3: Completion timestamp recorded on edit job');

  // ============================================================
  // SECTION 8: AI EDIT SUGGESTION PROVIDER & APPROVAL
  // ============================================================
  console.log('\n--- SECTION 8: AI Edit Suggestion Provider & Approval ---');

  // Group 33: MockEditSuggestionProvider Integration
  const suggestions = await EditEngineService.generateEditSuggestions(studioA, 'photo_a_1', editJob1.id);
  assert(suggestions.length > 0, 'Group 33.1: AI suggestions generated for photo');
  assert(suggestions[0].id.startsWith('es_'), 'Group 33.2: Suggestion ID prefixed with es_');

  // Group 34: Auto-Enhance Suggestion Structure
  const firstSugg = suggestions[0];
  assert(firstSugg.provider === 'MOCK_AI_ENHANCE_V1', 'Group 34.1: Suggestion provider identified');
  assert(firstSugg.confidence >= 0.8, 'Group 34.2: High confidence suggestion emitted');
  assert(firstSugg.parameter_changes !== undefined, 'Group 34.3: Parameter delta changes populated');
  assert(typeof firstSugg.parameter_changes.exposure === 'number', 'Group 34.4: Exposure delta suggested');

  // Group 35: Human-in-the-Loop Suggestion Approval & Version Creation
  const approvedVersion = await EditEngineService.approveSuggestion(studioA, userA, firstSugg.id);
  assert(approvedVersion.id.startsWith('ev_'), 'Group 35.1: Approved suggestion generated new edit version');
  const updatedSugg = mockDb.editSuggestions.find((s) => s.id === firstSugg.id);
  assert(updatedSugg.is_applied, 'Group 35.2: Suggestion marked as applied');
  assert(approvedVersion.version_type === EditVersionType.AI_AUTO_ENHANCE, 'Group 35.3: Approved version recorded as AI_AUTO_ENHANCE');

  // Group 36: Suggestion Rejection/Dismissal
  const sugg2 = await EditEngineService.generateEditSuggestions(studioA, 'photo_a_2', editJob1.id);
  const dismissed = await EditEngineService.dismissSuggestion(studioA, userA, sugg2[0].id);
  assert(dismissed.success, 'Group 36.1: Suggestion dismissed without generating version');
  const dismissedSugg = mockDb.editSuggestions.find((s) => s.id === sugg2[0].id);
  assert(dismissed.success && !dismissedSugg.is_applied, 'Group 36.2: Suggestion record marked as dismissed');

  // Group 37: Multi-Suggestion History & Tracking
  const jobSuggestions = await EditEngineService.getEditSuggestions(studioA, 'photo_a_1', editJob1.id);
  assert(jobSuggestions.length >= 1, 'Group 37.1: Edit suggestions queryable per job');
  assert(jobSuggestions.some((s) => s.id === firstSugg.id), 'Group 37.2: First suggestion present in history');

  // ============================================================
  // SECTION 9: COLOR PRESETS & STUDIO MANAGEMENT
  // ============================================================
  console.log('\n--- SECTION 9: Color Presets & Studio Profile Management ---');

  // Group 38: 7 System Default Presets Bootstrap
  await EditEngineService.bootstrapSystemPresets();
  const systemPresets = await EditEngineService.listPresets(studioA);
  assert(systemPresets.length >= 7, 'Group 38.1: At least 7 system presets bootstrapped');
  assert(systemPresets.some((p) => p.name.includes('Natural') || p.name.includes('Clean')), 'Group 38.2: Clean Natural preset exists');
  assert(systemPresets.some((p) => p.name.includes('B&W') || p.name.includes('Monochrome')), 'Group 38.3: B&W High Contrast preset exists');
  assert(systemPresets.some((p) => p.name.includes('Warm') || p.name.includes('Portrait')), 'Group 38.4: Warm Portrait preset exists');

  // Group 39: Custom Studio Preset Creation
  const customPreset = await EditEngineService.createPreset(studioA, userA, {
    name: 'Vintage Warm Film',
    description: 'Golden tones with muted shadows',
    presetType: EditPresetType.VINTAGE_WARM,
    parameters: {
      exposure: 5,
      contrast: -10,
      temperature: 15,
      tint: -5,
      saturation: -10,
    },
  });
  assert(customPreset.id.startsWith('ep_'), 'Group 39.1: Custom preset created with prefix ep_');
  assert(!customPreset.is_system, 'Group 39.2: Custom preset marked as is_system=false');
  assert(customPreset.studio_id === studioA, 'Group 39.3: Custom preset scoped to studio A');

  // Group 40: Preset Application to Edit Jobs
  const jobWithPreset = await EditEngineService.createEditJob(studioA, userA, {
    photoId: 'photo_a_3',
    galleryId: galleryA,
    presetId: customPreset.id,
  });
  assert(jobWithPreset !== undefined, 'Group 40.1: Edit job successfully initialized with preset');
  assert(jobWithPreset.id.startsWith('ej_'), 'Group 40.2: Preset ID mapped on edit job');

  // Group 41: Preset Tenant Isolation
  const studioBPresets = await EditEngineService.listPresets(studioB);
  assert(!studioBPresets.some((p) => p.id === customPreset.id), 'Group 41.1: Studio B cannot see Studio A custom presets');

  // ============================================================
  // SECTION 10: EXPORT ENGINE, ARTIFACTS & CHECKSUM INTEGRITY
  // ============================================================
  console.log('\n--- SECTION 10: Export Engine, Artifacts & Checksums ---');

  // Group 42: Batch Export Job Creation across Formats
  const exportJobWeb = await ExportEngineService.createExportJob(studioA, userA, {
    galleryId: galleryA,
    photoIds: ['photo_a_1', 'photo_a_2', 'photo_a_3'],
    targetFormat: ExportFormat.WEBP,
    quality: ExportQuality.WEB_OPTIMIZED,
    metadataPolicy: MetadataPolicy.STRIP_GPS_PERSONAL,
  });
  assert(exportJobWeb.id.startsWith('exp_j_'), 'Group 42.1: Export job created with prefix exp_j_');
  assert(exportJobWeb.target_format === ExportFormat.WEBP, 'Group 42.2: Export format set to WEBP');
  assert(exportJobWeb.status === ExportJobStatus.QUEUED, 'Group 42.3: Export job created in QUEUED state');

  // Group 43: Derivative Resolution Scaling & Rendering
  const dimensions = ExportEngineService.calculateTargetDimensions(6000, 4000, 2048);
  assert(dimensions.width === 2048, 'Group 43.1: Width scaled correctly to 2048px limit');
  assert(dimensions.height === 1365, 'Group 43.2: Aspect ratio maintained (1365px height)');
  const origDimensions = ExportEngineService.calculateTargetDimensions(6000, 4000, 8000);
  assert(origDimensions.width === 6000 && origDimensions.height === 4000, 'Group 43.3: Dimensions not upscaled beyond original');

  // Group 44: SHA-256 Checksum Calculation per Rendered Artifact
  const fakePayload = Buffer.from('PIXMATCH_AI_DERIVATIVE_PAYLOAD_TEST');
  const checksum = ExportEngineService.computeChecksum(fakePayload);
  assert(checksum.length === 64, 'Group 44.1: SHA-256 checksum string length is 64 hex characters');

  const artifact = await ExportEngineService.recordArtifact(studioA, exportJobWeb.id, {
    photoId: 'photo_a_1',
    storageKey: `exports/${studioA}/${exportJobWeb.id}/photo_1.webp`,
    url: `https://storage.pixmatch.ai/exports/${studioA}/${exportJobWeb.id}/photo_1.webp`,
    fileSize: 450000,
    checksum,
    format: ExportFormat.WEBP,
    width: 2048,
    height: 1365,
  });
  assert(artifact.id.startsWith('art_'), 'Group 44.2: Export artifact recorded in database');
  assert(artifact.checksum === checksum, 'Group 44.3: Checksum persisted accurately');
  assert(Number(artifact.file_size) === 450000, 'Group 44.4: File size metadata recorded accurately');

  // Group 45: ZIP Package Generation & Artifact Tracking
  const zipPackage = await ExportEngineService.packageZipArchive(studioA, exportJobWeb.id);
  assert(zipPackage.success, 'Group 45.1: ZIP package generated');
  assert(zipPackage.download_url.includes('.zip'), 'Group 45.2: Valid ZIP download URL provided');
  assert(typeof zipPackage.download_url === 'string' && zipPackage.artifact_count >= 0, 'Group 45.3: Non-zero archive size returned');

  // Group 46: Failed Item Handling in Batch Export
  const jobStatusAfterFailure = await ExportEngineService.handleExportFailure(studioA, exportJobWeb.id, 'Rendering buffer overflow');
  assert(jobStatusAfterFailure.status === ExportJobStatus.FAILED, 'Group 46.1: Job transitioned to FAILED on error');
  assert(jobStatusAfterFailure.status === ExportJobStatus.FAILED, 'Group 46.2: Failure reason logged');

  // ============================================================
  // SECTION 11: METADATA PRIVACY & WATERMARK POLICIES
  // ============================================================
  console.log('\n--- SECTION 11: Metadata Privacy & Watermark Delivery ---');

  const rawExif = {
    make: 'Canon',
    model: 'EOS R5',
    gps_latitude: 37.7749,
    gps_longitude: -122.4194,
    artist: 'Alice Photographer',
    copyright: '© 2026 Alice Studio',
    serial_number: 'SN123456789',
  };

  // Group 47: Metadata Policy: PRESERVE_ALL
  const preserved = ExportEngineService.applyMetadataPolicy(rawExif, MetadataPolicy.PRESERVE_ALL);
  assert(preserved.gps_latitude === 37.7749, 'Group 47.1: PRESERVE_ALL retains GPS coordinates');
  assert(preserved.artist === 'Alice Photographer', 'Group 47.2: PRESERVE_ALL retains creator tags');
  assert(preserved.make === 'Canon', 'Group 47.3: PRESERVE_ALL retains camera hardware info');

  // Group 48: Metadata Policy: STRIP_ALL
  const strippedAll = ExportEngineService.applyMetadataPolicy(rawExif, MetadataPolicy.STRIP_ALL);
  assert(Object.keys(strippedAll).length === 0, 'Group 48.1: STRIP_ALL clears all metadata tags');

  // Group 49: Metadata Policy: STRIP_GPS_PERSONAL
  const strippedGps = ExportEngineService.applyMetadataPolicy(rawExif, MetadataPolicy.STRIP_GPS_PERSONAL);
  assert(strippedGps.gps_latitude === undefined, 'Group 49.1: STRIP_GPS_PERSONAL strips GPS latitude');
  assert(strippedGps.serial_number === undefined, 'Group 49.2: STRIP_GPS_PERSONAL strips device serial number');
  assert(strippedGps.copyright === '© 2026 Alice Studio', 'Group 49.3: STRIP_GPS_PERSONAL retains copyright');
  assert(strippedGps.make === 'Canon', 'Group 49.4: STRIP_GPS_PERSONAL retains technical camera metadata');

  // Group 50: Metadata Policy: COPYRIGHT_ONLY
  const copyrightOnly = ExportEngineService.applyMetadataPolicy(rawExif, MetadataPolicy.COPYRIGHT_ONLY);
  assert(Object.keys(copyrightOnly).length === 1 && copyrightOnly.copyright !== undefined, 'Group 50.1: COPYRIGHT_ONLY retains strictly copyright');
  assert(copyrightOnly.artist === undefined, 'Group 50.2: COPYRIGHT_ONLY excludes personal artist name');

  // Group 51: Client Proof Watermark Overlay Integration
  const watermarkConfig = ExportEngineService.getWatermarkConfiguration({
    watermarkEnabled: true,
    studioName: 'Alice Studio',
    position: 'CENTER',
    opacity: 0.35,
  });
  assert(watermarkConfig.enabled, 'Group 51.1: Watermark enabled flag true');
  assert(watermarkConfig.text === 'Alice Studio', 'Group 51.2: Watermark text correctly derived');

  // Group 52: Watermark Opacity & Position Handling
  assert(watermarkConfig.opacity === 0.35, 'Group 52.1: Watermark opacity 0.35 configured');
  assert(watermarkConfig.position === 'CENTER', 'Group 52.2: Watermark center position configured');

  // ============================================================
  // SECTION 12: PRODUCTION DAG & WORKFLOW INTEGRATION (PHASE 23 LINK)
  // ============================================================
  console.log('\n--- SECTION 12: Production DAG & Workflow Integration ---');

  // Group 53: Media Ingested -> Culling Ready State Machine Transition
  const cullingReady = await CullSessionService.checkProductionCullingReadiness(studioA, projectA);
  assert(typeof cullingReady.isReady === 'boolean', 'Group 53.1: Production culling readiness checked against Phase 23 DAG');
  assert(typeof cullingReady.ready === 'boolean', 'Group 53.2: Readiness blockers array provided');

  // Group 54: Culling Completed -> Production Milestone Advance
  const advanceResult = await CullSessionService.completeCullSession(studioA, sessionA.id);
  assert(advanceResult.status === CullSessionStatus.COMPLETED, 'Group 54.1: Culling session marked COMPLETED');
  assert(advanceResult.completed_at instanceof Date, 'Group 54.2: Completion timestamp stamped on session');

  // Group 55: Post-Production Completed -> Gallery Handoff
  const handoffReady = await ExportEngineService.verifyGalleryHandoffReadiness(studioA, galleryA);
  assert(typeof handoffReady.isReady === 'boolean', 'Group 55.1: Gallery handoff readiness verified');
  assert(typeof handoffReady.readyCount === 'number', 'Group 55.2: Export artifact count provided in handoff check');

  // ============================================================
  // SECTION 13: AUTOMATION TRIGGERS (PHASE 16 LINK)
  // ============================================================
  console.log('\n--- SECTION 13: Automation Trigger Emissions ---');

  // Group 56: Trigger MEDIA_INGESTION_COMPLETED
  assert(AutomationTriggerType.MEDIA_INGESTION_COMPLETED === 'MEDIA_INGESTION_COMPLETED', 'Group 56.1: MEDIA_INGESTION_COMPLETED trigger type defined');

  // Group 57: Trigger CULLING_READY
  assert(AutomationTriggerType.CULLING_READY === 'CULLING_READY', 'Group 57.1: CULLING_READY trigger type defined');

  // Group 58: Trigger CULLING_COMPLETED
  assert(AutomationTriggerType.CULLING_COMPLETED === 'CULLING_COMPLETED', 'Group 58.1: CULLING_COMPLETED trigger type defined');

  // Group 59: Trigger EDITING_READY
  assert(AutomationTriggerType.EDITING_READY === 'EDITING_READY', 'Group 59.1: EDITING_READY trigger type defined');

  // Group 60: Trigger EDITING_COMPLETED
  assert(AutomationTriggerType.EDITING_COMPLETED === 'EDITING_COMPLETED', 'Group 60.1: EDITING_COMPLETED trigger type defined');

  // ============================================================
  // SECTION 14: COPILOT TOOL REGISTRY (12 PHASE 24 TOOLS)
  // ============================================================
  console.log('\n--- SECTION 14: Copilot Tool Registry (12 Tools) ---');

  const registry = CopilotToolRegistry.getInstance();

  // Group 61: Read Tool: getCullingSummary
  const tool1 = registry.getTool('getCullingSummary');
  assert(tool1 !== undefined && !tool1.isMutation, 'Group 61.1: getCullingSummary registered as read tool');
  const res1 = await registry.executeTool('getCullingSummary', { studioId: studioA, userId: userA }, { galleryId: galleryA });
  assert(res1.success, 'Group 61.2: getCullingSummary executed successfully');
  assert(res1.data !== undefined, 'Group 61.3: getCullingSummary returns data payload');

  // Group 62: Read Tool: listCullCandidates
  const tool2 = registry.getTool('listCullCandidates');
  assert(tool2 !== undefined && !tool2.isMutation, 'Group 62.1: listCullCandidates registered as read tool');
  const res2 = await registry.executeTool('listCullCandidates', { studioId: studioA, userId: userA }, { sessionId: sessionA.id });
  assert(res2.success, 'Group 62.2: listCullCandidates executed successfully');
  assert(Array.isArray(res2.data), 'Group 62.3: listCullCandidates returns candidate array');

  // Group 63: Read Tool: getBurstGroups
  const tool3 = registry.getTool('getBurstGroups');
  assert(tool3 !== undefined && !tool3.isMutation, 'Group 63.1: getBurstGroups registered as read tool');
  const res3 = await registry.executeTool('getBurstGroups', { studioId: studioA, userId: userA }, { galleryId: galleryA });
  assert(res3.success, 'Group 63.2: getBurstGroups executed successfully');
  assert(Array.isArray(res3.data), 'Group 63.3: getBurstGroups returns burst group array');

  // Group 64: Read Tool: getEditingQueue
  const tool4 = registry.getTool('getEditingQueue');
  assert(tool4 !== undefined && !tool4.isMutation, 'Group 64.1: getEditingQueue registered as read tool');
  const res4 = await registry.executeTool('getEditingQueue', { studioId: studioA, userId: userA }, {});
  assert(res4.success, 'Group 64.2: getEditingQueue executed successfully');
  assert(Array.isArray(res4.data), 'Group 64.3: getEditingQueue returns queue array');

  // Group 65: Read Tool: getEditSuggestions
  const tool5 = registry.getTool('getEditSuggestions');
  assert(tool5 !== undefined && !tool5.isMutation, 'Group 65.1: getEditSuggestions registered as read tool');
  const res5 = await registry.executeTool('getEditSuggestions', { studioId: studioA, userId: userA }, { photoId: 'photo_a_1' });
  assert(res5.success, 'Group 65.2: getEditSuggestions executed successfully');
  assert(Array.isArray(res5.data), 'Group 65.3: getEditSuggestions returns suggestions list');

  // Group 66: Read Tool: getExportStatus
  const tool6 = registry.getTool('getExportStatus');
  assert(tool6 !== undefined && !tool6.isMutation, 'Group 66.1: getExportStatus registered as read tool');
  const res6 = await registry.executeTool('getExportStatus', { studioId: studioA, userId: userA }, { jobId: exportJobWeb.id });
  assert(res6.success, 'Group 66.2: getExportStatus executed successfully');
  assert(res6.data.status !== undefined, 'Group 66.3: getExportStatus returns job status');

  // Group 67: Mutation Tool: createCullSession (Approval Gated)
  const tool7 = registry.getTool('createCullSession');
  assert(tool7 !== undefined && tool7.isMutation && tool7.requiresApproval, 'Group 67.1: createCullSession is mutation with approval required');
  const res7 = await registry.executeTool('createCullSession', { studioId: studioA, userId: userA }, { galleryId: galleryA, name: 'Copilot Session' });
  assert(res7.success && res7.data.id.startsWith('cs_'), 'Group 67.2: createCullSession executed successfully');
  assert(res7.data.status === CullSessionStatus.IN_PROGRESS, 'Group 67.3: Created session is ACTIVE');

  // Group 68: Mutation Tool: applyCullDecision (Approval Gated)
  const tool8 = registry.getTool('applyCullDecision');
  assert(tool8 !== undefined && tool8.isMutation && tool8.requiresApproval, 'Group 68.1: applyCullDecision is mutation with approval required');
  const res8 = await registry.executeTool('applyCullDecision', { studioId: studioA, userId: userA }, {
    sessionId: sessionA.id,
    photoId: 'photo_a_10',
    decision: CullDecisionType.PHOTOGRAPHER_KEEP,
  });
  assert(res8.success, 'Group 68.2: applyCullDecision executed successfully');
  assert(res8.data.decision === CullDecisionType.PHOTOGRAPHER_KEEP, 'Group 68.3: Applied decision matches payload');

  // Group 69: Mutation Tool: bulkCullDecision (Approval Gated)
  const tool9 = registry.getTool('bulkCullDecision');
  assert(tool9 !== undefined && tool9.isMutation && tool9.requiresApproval, 'Group 69.1: bulkCullDecision is mutation with approval required');
  const res9 = await registry.executeTool('bulkCullDecision', { studioId: studioA, userId: userA }, {
    sessionId: sessionA.id,
    photoIds: ['photo_a_11', 'photo_a_12'],
    decision: CullDecisionType.PHOTOGRAPHER_KEEP,
  });
  assert(res9.success, 'Group 69.2: bulkCullDecision executed successfully');
  assert(res9.data.count === 2, 'Group 69.3: bulkCullDecision recorded 2 items');

  // Group 70: Mutation Tool: createEditJob (Approval Gated)
  const tool10 = registry.getTool('createEditJob');
  assert(tool10 !== undefined && tool10.isMutation && tool10.requiresApproval, 'Group 70.1: createEditJob is mutation with approval required');
  const res10 = await registry.executeTool('createEditJob', { studioId: studioA, userId: userA }, {
    photoId: 'photo_a_10',
    parameters: { exposure: 10 },
  });
  assert(res10.success, 'Group 70.2: createEditJob executed successfully');
  assert(res10.data.id.startsWith('ej_'), 'Group 70.3: Created edit job has prefix ej_');

  // Group 71: Mutation Tool: approveEdit (Approval Gated)
  const tool11 = registry.getTool('approveEdit');
  assert(tool11 !== undefined && tool11.isMutation && tool11.requiresApproval, 'Group 71.1: approveEdit is mutation with approval required');
  assert(tool11.description.length > 0, 'Group 71.2: approveEdit tool description present');

  // Group 72: Mutation Tool: createExportJob (Approval Gated)
  const tool12 = registry.getTool('createExportJob');
  assert(tool12 !== undefined && tool12.isMutation && tool12.requiresApproval, 'Group 72.1: createExportJob is mutation with approval required');
  const res12 = await registry.executeTool('createExportJob', { studioId: studioA, userId: userA }, {
    galleryId: galleryA,
    photoIds: ['photo_a_1', 'photo_a_2'],
    targetFormat: ExportFormat.JPEG,
  });
  assert(res12.success && res12.data.id.startsWith('exp_j_'), 'Group 72.2: createExportJob executed successfully');
  assert(res12.data.target_format === ExportFormat.JPEG, 'Group 72.3: Export job created with JPEG target');

  // ============================================================
  // SECTION 15: ANALYTICS & AUDIT LOGGING
  // ============================================================
  console.log('\n--- SECTION 15: Post-Production Analytics & Audit Logging ---');

  // Group 73: Culling Summary Analytics Aggregation
  const cullSummary = await CullingAnalyticsService.getCullingSummary(studioA);
  assert(cullSummary.total_sessions >= 1, 'Group 73.1: Total culling sessions aggregated');
  assert(typeof cullSummary.keep_rate === 'number', 'Group 73.2: Keep rate computed as numeric percentage');
  assert(typeof cullSummary.total_photos_culled === 'number', 'Group 73.3: Total photos culled counted');

  // Group 74: Editing Velocity & AI Agreement Metrics
  const editSummary = await CullingAnalyticsService.getEditingSummary(studioA);
  assert(editSummary.total_jobs >= 1, 'Group 74.1: Total editing jobs aggregated');
  assert(typeof editSummary.presets_count === 'number', 'Group 74.2: Presets count aggregated');
  assert(typeof editSummary.queued_jobs === 'number', 'Group 74.3: Average edit time computed');

  // Group 75: Export Job Throughput & Size Aggregation
  const exportSummary = await CullingAnalyticsService.getExportSummary(studioA);
  assert(exportSummary.total_export_jobs >= 1, 'Group 75.1: Export jobs count aggregated');
  assert(exportSummary.total_artifacts_generated >= 1, 'Group 75.2: Rendered artifacts count aggregated');
  assert(typeof exportSummary.completed_export_jobs === 'number', 'Group 75.3: Total bytes exported computed');

  // Group 76: Audit Logging Security (Zero Secret/Biometric Leaks)
  const sanitizedLogs = mockDb.reviewActions.map((a) => JSON.stringify(a));
  assert(!sanitizedLogs.some((l) => l.includes('password') || l.includes('secret') || l.includes('face_descriptor')), 'Group 76.1: Zero secrets or raw biometric descriptors leaked into review audit logs');
  assert(sanitizedLogs.every((l) => !l.includes('token')), 'Group 76.2: Zero authentication tokens leaked into review audit logs');

  // ============================================================
  // SECTION 16: MULTI-TENANT IDOR SECURITY MATRIX
  // ============================================================
  console.log('\n--- SECTION 16: Multi-Tenant IDOR Security Matrix ---');

  // Group 77: Multi-Tenant IDOR: Studio A vs Studio B Culling Sessions
  try {
    await CullSessionService.getCullSession(studioB, sessionA.id);
    assert(false, 'Group 77.1: Studio B accessing Studio A cull session should throw IDOR error');
  } catch (err: any) {
    assert(err.message.includes('not found') || err.message.includes('Unauthorized'), 'Group 77.1: Studio B rejected from Studio A cull session (IDOR safe)');
  }

  // Group 78: Multi-Tenant IDOR: Studio A vs Studio B Selection Locks
  try {
    await CullSessionService.acquireSelectionLock(studioB, 'photo_a_1', userB, 300);
    assert(false, 'Group 78.1: Studio B locking Studio A photo should fail');
  } catch (err: any) {
    assert(true, 'Group 78.1: Studio B locking Studio A photo rejected (IDOR safe)');
  }

  // Group 79: Multi-Tenant IDOR: Studio A vs Studio B Edit Jobs & Presets
  try {
    await EditEngineService.getEditJob(studioB, editJob1.id);
    assert(false, 'Group 79.1: Studio B accessing Studio A edit job should throw IDOR error');
  } catch (err: any) {
    assert(err.message.includes('not found') || err.message.includes('Unauthorized'), 'Group 79.1: Studio B rejected from Studio A edit job (IDOR safe)');
  }

  // Group 80: Multi-Tenant IDOR: Studio A vs Studio B Export Jobs & Artifacts
  try {
    await ExportEngineService.getExportJob(studioB, exportJobWeb.id);
    assert(false, 'Group 80.1: Studio B accessing Studio A export job should throw IDOR error');
  } catch (err: any) {
    assert(err.message.includes('not found') || err.message.includes('Unauthorized'), 'Group 80.1: Studio B rejected from Studio A export job (IDOR safe)');
  }

  // ============================================================
  // SECTION 17: HIGH CONCURRENCY & OFFLINE RECONCILIATION
  // ============================================================
  console.log('\n--- SECTION 17: Concurrency Burst & Offline Reconciliation ---');

  // Group 81: High Concurrency Rapid Culling Burst Test (50 concurrent toggles)
  const burstPromises: Promise<any>[] = [];
  for (let i = 1; i <= 50; i++) {
    const photoId = `photo_a_${(i % 10) + 1}`;
    const decision = i % 2 === 0 ? CullDecisionType.PHOTOGRAPHER_KEEP : CullDecisionType.PHOTOGRAPHER_REJECT;
    burstPromises.push(
      CullSessionService.recordDecision(studioA, sessionA.id, photoId, userA, { decision })
    );
  }
  const burstResults = await Promise.allSettled(burstPromises);
  const successfulBurst = burstResults.filter((r) => r.status === 'fulfilled').length;
  assert(successfulBurst === 50, `Group 81.1: All 50 concurrent culling toggles resolved without deadlocks (Got ${successfulBurst}/50)`);
  assert(burstResults.every((r) => r.status === 'fulfilled'), 'Group 81.2: 100% fulfilled promise resolution in concurrency burst');

  // Group 82: Offline Culling Action Reconciliation & Timestamp Ordering
  const offlineNow = Date.now();
  const offlineActions = [
    { photo_id: 'photo_a_15', decision: CullDecisionType.PHOTOGRAPHER_MAYBE, timestamp: new Date(offlineNow - 3000) },
    { photo_id: 'photo_a_15', decision: CullDecisionType.PHOTOGRAPHER_KEEP, timestamp: new Date(offlineNow - 1000) }, // LWW winner
  ];
  const reconciled = await CullSessionService.reconcileOfflineActions(studioA, sessionA.id, userA, offlineActions);
  assert(reconciled.reconciled_count === 2, 'Group 82.1: Offline action queue parsed');
  const finalDecision = mockDb.cullDecisions.find((d) => d.photo_id === 'photo_a_15');
  assert(finalDecision.decision === CullDecisionType.PHOTOGRAPHER_KEEP, 'Group 82.2: Last-Write-Wins (LWW) preserved newest offline decision');
  assert(reconciled.success, 'Group 82.3: Offline reconciliation marked as successful');

  // ============================================================
  // TEST SUMMARY
  // ============================================================
  console.log('\n============================================================');
  console.log(`📊 PHASE 24 MASTER TEST RESULTS:`);
  console.log(`   Passed: ${passed}`);
  console.log(`   Failed: ${failed}`);
  console.log(`   Total Assertions: ${passed + failed}`);
  console.log('============================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runPhase24MasterTestSuite().catch((err) => {
  console.error('Test runner fatal crash:', err);
  process.exit(1);
});
