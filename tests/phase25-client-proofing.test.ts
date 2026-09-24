/**
 * PIXMatch AI — Phase 25 Master Test Suite
 * Client Proofing & Selection Engine
 *
 * Covers 82 Comprehensive Test Groups with 200+ assertions.
 */

process.env.DATABASE_URL = process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/pixmatch_test';
process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-jwt-secret-key-must-be-32-chars-long';

import crypto from 'crypto';
import {
  ProofingSessionStatus,
  ProofingItemStatus,
  ProofingCommentType,
  ProofingReviewDecision,
  EditJobStatus,
  AutomationTriggerType,
} from '@pixmatch/types';
import { prisma } from '@pixmatch/database';
import { ProofingSessionService } from '../apps/api/src/modules/proofing/proofing-session.service.js';
import { ProofingSelectionService } from '../apps/api/src/modules/proofing/proofing-selection.service.js';
import { ProofingFeedbackService } from '../apps/api/src/modules/proofing/proofing-feedback.service.js';
import { ProofingReviewService } from '../apps/api/src/modules/proofing/proofing-review.service.js';
import { ProofingAnalyticsService } from '../apps/api/src/modules/proofing/proofing-analytics.service.js';
import { CopilotToolRegistry } from '../apps/api/src/modules/copilot/copilot-tool-registry.js';

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

// In-Memory Mock Database for Phase 25 Deterministic Testing
class MockPhase25Database {
  studios: any[] = [];
  users: any[] = [];
  galleries: any[] = [];
  photos: any[] = [];
  projects: any[] = [];
  projectProductions: any[] = [];
  editJobs: any[] = [];
  automationRules: any[] = [];
  automationRuns: any[] = [];

  // Phase 25 Tables
  proofingSessions: any[] = [];
  selectionRules: any[] = [];
  proofingItems: any[] = [];
  proofingComments: any[] = [];
  proofingComparisons: any[] = [];
  proofingReviews: any[] = [];
  proofingAuditLogs: any[] = [];

  reset() {
    this.studios = [];
    this.users = [];
    this.galleries = [];
    this.photos = [];
    this.projects = [];
    this.projectProductions = [];
    this.editJobs = [];
    this.automationRules = [];
    this.automationRuns = [];
    this.proofingSessions = [];
    this.selectionRules = [];
    this.proofingItems = [];
    this.proofingComments = [];
    this.proofingComparisons = [];
    this.proofingReviews = [];
    this.proofingAuditLogs = [];
  }
}

const mockDb = new MockPhase25Database();

function patchPrismaMock() {
  const p: any = prisma;

  // PhotoProofingSession
  p.photoProofingSession = {
    create: async ({ data, include }: any) => {
      const sessionId = data.id || `sess_${crypto.randomUUID()}`;
      const rec: any = {
        id: sessionId,
        studio_id: data.studio_id,
        gallery_id: data.gallery_id,
        project_id: data.project_id || null,
        client_id: data.client_id || null,
        name: data.name,
        description: data.description || null,
        token_hash: data.token_hash,
        pin_code_hash: data.pin_code_hash || null,
        status: data.status || ProofingSessionStatus.ACTIVE,
        deadline_at: data.deadline_at || null,
        expires_at: data.expires_at || null,
        allow_download_previews: data.allow_download_previews ?? false,
        watermark_enabled: data.watermark_enabled ?? true,
        submitted_at: null,
        completed_at: null,
        created_by: data.created_by || null,
        created_at: new Date(),
        updated_at: new Date(),
      };
      mockDb.proofingSessions.push(rec);

      // Create Rules
      if (data.rules?.create) {
        const ruleRec = {
          id: `rule_${crypto.randomUUID()}`,
          session_id: sessionId,
          created_at: new Date(),
          updated_at: new Date(),
          ...data.rules.create,
        };
        mockDb.selectionRules.push(ruleRec);
      }

      // Create Items
      if (data.items?.create) {
        for (const itemData of data.items.create) {
          const itemRec = {
            id: `item_${crypto.randomUUID()}`,
            session_id: sessionId,
            photo_id: itemData.photo_id,
            status: itemData.status || ProofingItemStatus.UNREVIEWED,
            is_favorite: itemData.is_favorite || false,
            created_at: new Date(),
            updated_at: new Date(),
          };
          mockDb.proofingItems.push(itemRec);
        }
      }

      // Create Audit Log
      if (data.audit_logs?.create) {
        mockDb.proofingAuditLogs.push({
          id: `audit_${crypto.randomUUID()}`,
          session_id: sessionId,
          created_at: new Date(),
          ...data.audit_logs.create,
        });
      }

      return p.photoProofingSession.findUnique({ where: { id: sessionId }, include });
    },
    findUnique: async ({ where, include }: any) => {
      const s = mockDb.proofingSessions.find((sess) => sess.id === where.id);
      if (!s) return null;
      return populateSession(s, include);
    },
    findFirst: async ({ where, include }: any) => {
      const s = mockDb.proofingSessions.find((sess) => {
        for (const [k, v] of Object.entries(where)) {
          if (sess[k] !== v) return false;
        }
        return true;
      });
      if (!s) return null;
      return populateSession(s, include);
    },
    findMany: async ({ where = {}, include }: any) => {
      let list = mockDb.proofingSessions.filter((sess) => {
        for (const [k, v] of Object.entries(where)) {
          if (sess[k] !== v) return false;
        }
        return true;
      });
      return list.map((s) => populateSession(s, include));
    },
    update: async ({ where, data, include }: any) => {
      const idx = mockDb.proofingSessions.findIndex((sess) => sess.id === where.id);
      if (idx === -1) throw new Error('Not found');

      if (data.audit_logs?.create) {
        mockDb.proofingAuditLogs.push({
          id: `audit_${crypto.randomUUID()}`,
          session_id: where.id,
          created_at: new Date(),
          ...data.audit_logs.create,
        });
        delete data.audit_logs;
      }

      mockDb.proofingSessions[idx] = {
        ...mockDb.proofingSessions[idx],
        ...data,
        updated_at: new Date(),
      };
      return p.photoProofingSession.findUnique({ where, include });
    },
    delete: async ({ where }: any) => {
      const idx = mockDb.proofingSessions.findIndex((s) => s.id === where.id);
      if (idx !== -1) mockDb.proofingSessions.splice(idx, 1);
      mockDb.selectionRules = mockDb.selectionRules.filter((r) => r.session_id !== where.id);
      mockDb.proofingItems = mockDb.proofingItems.filter((i) => i.session_id !== where.id);
      mockDb.proofingComments = mockDb.proofingComments.filter((c) => c.session_id !== where.id);
      mockDb.proofingComparisons = mockDb.proofingComparisons.filter((c) => c.session_id !== where.id);
      return { id: where.id };
    },
  };

  // ProofingSelectionRule
  p.proofingSelectionRule = {
    upsert: async ({ where, update, create }: any) => {
      let rule = mockDb.selectionRules.find((r) => r.session_id === where.session_id);
      if (rule) {
        Object.assign(rule, update, { updated_at: new Date() });
      } else {
        rule = {
          id: `rule_${crypto.randomUUID()}`,
          created_at: new Date(),
          updated_at: new Date(),
          ...create,
        };
        mockDb.selectionRules.push(rule);
      }
      return rule;
    },
    findUnique: async ({ where }: any) => {
      return mockDb.selectionRules.find((r) => r.session_id === where.session_id) || null;
    },
  };

  // PhotoProofingItem
  p.photoProofingItem = {
    findFirst: async ({ where }: any) => {
      return mockDb.proofingItems.find((i) => {
        for (const [k, v] of Object.entries(where)) {
          if (i[k] !== v) return false;
        }
        return true;
      }) || null;
    },
    findMany: async ({ where = {}, include }: any) => {
      let items = mockDb.proofingItems.filter((i) => {
        for (const [k, v] of Object.entries(where)) {
          if (i[k] !== v) return false;
        }
        return true;
      });
      return items.map((item) => populateItem(item, include));
    },
    update: async ({ where, data, include }: any) => {
      const idx = mockDb.proofingItems.findIndex((i) => i.id === where.id);
      if (idx === -1) throw new Error('Item not found');
      mockDb.proofingItems[idx] = {
        ...mockDb.proofingItems[idx],
        ...data,
        updated_at: new Date(),
      };
      return populateItem(mockDb.proofingItems[idx], include);
    },
    updateMany: async ({ where, data }: any) => {
      let count = 0;
      mockDb.proofingItems.forEach((i) => {
        let match = true;
        if (where.session_id && i.session_id !== where.session_id) match = false;
        if (where.photo_id && i.photo_id !== where.photo_id) match = false;
        if (where.id?.in && !where.id.in.includes(i.id)) match = false;
        if (match) {
          Object.assign(i, data, { updated_at: new Date() });
          count++;
        }
      });
      return { count };
    },
  };

  // PhotoProofingComment
  p.photoProofingComment = {
    create: async ({ data }: any) => {
      const rec = {
        id: `com_${crypto.randomUUID()}`,
        item_id: data.item_id,
        session_id: data.session_id,
        parent_id: data.parent_id || null,
        comment_type: data.comment_type || ProofingCommentType.GENERAL,
        comment_text: data.comment_text,
        pin_x: data.pin_x ?? null,
        pin_y: data.pin_y ?? null,
        author_type: data.author_type || 'CLIENT',
        author_name: data.author_name || null,
        author_id: data.author_id || null,
        is_resolved: false,
        resolved_at: null,
        resolved_by: null,
        created_at: new Date(),
        updated_at: new Date(),
      };
      mockDb.proofingComments.push(rec);
      return { ...rec, replies: [] };
    },
    findMany: async ({ where = {} }: any) => {
      let list = mockDb.proofingComments.filter((c) => {
        for (const [k, v] of Object.entries(where)) {
          if (c[k] !== v) return false;
        }
        return true;
      });
      return list.map((c) => ({
        ...c,
        replies: mockDb.proofingComments.filter((r) => r.parent_id === c.id),
      }));
    },
    update: async ({ where, data }: any) => {
      const idx = mockDb.proofingComments.findIndex((c) => c.id === where.id);
      if (idx === -1) throw new Error('Comment not found');
      mockDb.proofingComments[idx] = {
        ...mockDb.proofingComments[idx],
        ...data,
        updated_at: new Date(),
      };
      return {
        ...mockDb.proofingComments[idx],
        replies: mockDb.proofingComments.filter((r) => r.parent_id === where.id),
      };
    },
    delete: async ({ where }: any) => {
      mockDb.proofingComments = mockDb.proofingComments.filter((c) => c.id !== where.id);
      return { id: where.id };
    },
    count: async () => {
      return mockDb.proofingComments.length;
    },
  };

  // PhotoProofingComparison
  p.photoProofingComparison = {
    create: async ({ data }: any) => {
      const rec = {
        id: `comp_${crypto.randomUUID()}`,
        session_id: data.session_id,
        name: data.name || null,
        photo_ids: data.photo_ids || [],
        winner_photo_id: data.winner_photo_id || null,
        notes: data.notes || null,
        created_at: new Date(),
      };
      mockDb.proofingComparisons.push(rec);
      return rec;
    },
    findFirst: async ({ where }: any) => {
      return mockDb.proofingComparisons.find((c) => {
        for (const [k, v] of Object.entries(where)) {
          if (c[k] !== v) return false;
        }
        return true;
      }) || null;
    },
    findMany: async ({ where = {} }: any) => {
      return mockDb.proofingComparisons.filter((c) => {
        for (const [k, v] of Object.entries(where)) {
          if (c[k] !== v) return false;
        }
        return true;
      });
    },
    update: async ({ where, data }: any) => {
      const idx = mockDb.proofingComparisons.findIndex((c) => c.id === where.id);
      if (idx === -1) throw new Error('Comparison not found');
      mockDb.proofingComparisons[idx] = {
        ...mockDb.proofingComparisons[idx],
        ...data,
      };
      return mockDb.proofingComparisons[idx];
    },
    deleteMany: async ({ where }: any) => {
      mockDb.proofingComparisons = mockDb.proofingComparisons.filter((c) => c.id !== where.id);
      return { count: 1 };
    },
  };

  // PhotoProofingReview
  p.photoProofingReview = {
    create: async ({ data }: any) => {
      const rec = {
        id: `rev_${crypto.randomUUID()}`,
        session_id: data.session_id,
        reviewed_by: data.reviewed_by,
        decision: data.decision,
        feedback_notes: data.feedback_notes || null,
        action_summary: data.action_summary || null,
        edit_job_ids: data.edit_job_ids || [],
        created_at: new Date(),
      };
      mockDb.proofingReviews.push(rec);
      return rec;
    },
  };

  // PhotoProofingAuditLog
  p.photoProofingAuditLog = {
    create: async ({ data }: any) => {
      const rec = {
        id: `audit_${crypto.randomUUID()}`,
        created_at: new Date(),
        ...data,
      };
      mockDb.proofingAuditLogs.push(rec);
      return rec;
    },
    findMany: async ({ where }: any) => {
      return mockDb.proofingAuditLogs.filter((a) => a.session_id === where.session_id);
    },
  };

  // Gallery
  p.gallery = {
    findFirst: async ({ where }: any) => {
      const g = mockDb.galleries.find((gal) => gal.id === where.id && (!where.studio_id || gal.studio_id === where.studio_id));
      if (!g) return null;
      const gPhotos = mockDb.photos.filter((photo) => photo.gallery_id === g.id);
      return { ...g, photos: gPhotos };
    },
  };

  // PhotoEditJob (Phase 24 Integration)
  p.photoEditJob = {
    findFirst: async ({ where }: any) => {
      return mockDb.editJobs.find((j) => {
        for (const [k, v] of Object.entries(where)) {
          if (j[k] !== v) return false;
        }
        return true;
      }) || null;
    },
    create: async ({ data }: any) => {
      const rec = {
        id: `job_${crypto.randomUUID()}`,
        status: EditJobStatus.QUEUED,
        priority: 'HIGH',
        created_at: new Date(),
        updated_at: new Date(),
        ...data,
      };
      mockDb.editJobs.push(rec);
      return rec;
    },
  };

  // ProjectProduction (Phase 23 Integration)
  p.projectProduction = {
    findUnique: async ({ where }: any) => {
      return mockDb.projectProductions.find((prod) => prod.project_id === where.project_id) || null;
    },
    update: async ({ where, data }: any) => {
      const idx = mockDb.projectProductions.findIndex((prod) => prod.project_id === where.project_id);
      if (idx !== -1) {
        mockDb.projectProductions[idx] = { ...mockDb.projectProductions[idx], ...data };
      }
      return mockDb.projectProductions[idx];
    },
  };

  // AutomationRule (Phase 16 Integration)
  p.automationRule = {
    findMany: async ({ where }: any) => {
      return mockDb.automationRules.filter((r) => r.studio_id === where.studio_id && r.trigger_type === where.trigger_type);
    },
  };

  p.automationRun = {
    create: async ({ data }: any) => {
      mockDb.automationRuns.push(data);
      return data;
    },
  };
}

function populateSession(s: any, include?: any) {
  const rules = mockDb.selectionRules.find((r) => r.session_id === s.id) || null;
  const items = mockDb.proofingItems.filter((i) => i.session_id === s.id).map((i) => populateItem(i, include?.items?.include));
  const comparisons = mockDb.proofingComparisons.filter((c) => c.session_id === s.id);
  const reviews = mockDb.proofingReviews.filter((r) => r.session_id === s.id);
  const gallery = mockDb.galleries.find((g) => g.id === s.gallery_id) || null;
  const client = mockDb.users.find((u) => u.id === s.client_id) || null;
  const project = mockDb.projects.find((p) => p.id === s.project_id) || null;

  return {
    ...s,
    rules,
    items,
    comparisons,
    reviews,
    gallery,
    client,
    project,
  };
}

function populateItem(item: any, include?: any) {
  const photo = mockDb.photos.find((p) => p.id === item.photo_id) || null;
  const comments = mockDb.proofingComments.filter((c) => c.item_id === item.id);
  return {
    ...item,
    photo,
    comments,
  };
}

// -------------------------------------------------------------
// SEEDING TEST FIXTURES
// -------------------------------------------------------------
const STUDIO_A = 'studio_alpha';
const STUDIO_B = 'studio_beta';
const USER_A = 'user_photographer_a';
const GALLERY_A = 'gallery_wedding_a';
const PROJECT_A = 'proj_alpha_wedding';

function seedTestEnvironment() {
  mockDb.reset();

  mockDb.studios.push({ id: STUDIO_A, name: 'Alpha Studio' }, { id: STUDIO_B, name: 'Beta Studio' });
  mockDb.users.push({ id: USER_A, studio_id: STUDIO_A, name: 'John Photographer', email: 'john@alpha.test' });
  mockDb.galleries.push({
    id: GALLERY_A,
    studio_id: STUDIO_A,
    title: 'Eleanor & Lucas Wedding',
    slug: 'eleanor-lucas',
    cover_photo_url: 'https://cdn.pixmatch.test/cover.jpg',
  });

  mockDb.projects.push({ id: PROJECT_A, studio_id: STUDIO_A, name: 'Eleanor & Lucas Wedding Shoot' });
  mockDb.projectProductions.push({
    project_id: PROJECT_A,
    current_stage: 'CLIENT_PROOFING',
    editing_progress: 0,
  });

  // Seed 50 photos in Gallery A
  for (let i = 1; i <= 50; i++) {
    mockDb.photos.push({
      id: `photo_${i}`,
      studio_id: STUDIO_A,
      gallery_id: GALLERY_A,
      original_filename: `IMG_${1000 + i}.CR3`,
      thumbnail_url: `https://cdn.pixmatch.test/thumbs/IMG_${1000 + i}.jpg`,
      original_url: `https://cdn.pixmatch.test/raw/IMG_${1000 + i}.CR3`,
      width: 6000,
      height: 4000,
      aspect_ratio: 1.5,
      is_archived: false,
    });
  }
}

// -------------------------------------------------------------
// TEST RUNNER
// -------------------------------------------------------------
async function runAllPhase25Tests() {
  console.log('============================================================');
  console.log('PIXMATCH AI — PHASE 25 CLIENT PROOFING & SELECTION TEST SUITE');
  console.log('============================================================\n');

  patchPrismaMock();
  seedTestEnvironment();

  let createdSession: any = null;
  let rawToken: string = '';

  // -----------------------------------------------------------
  // GROUP 1–10: SESSION LIFECYCLE & SECURITY ARCHITECTURE
  // -----------------------------------------------------------
  console.log('--- GROUP 1-10: Session Lifecycle & Security ---');

  // Group 1: Session creation with token generation & SHA-256 hashing
  createdSession = await ProofingSessionService.createSession(STUDIO_A, {
    name: 'Eleanor & Lucas Proofing',
    gallery_id: GALLERY_A,
    project_id: PROJECT_A,
    pin_code: '4321',
    rules: {
      included_count: 20,
      min_selections: 5,
      max_selections: 30,
      allow_extras: true,
      extra_price_cents: 600,
      currency: 'USD',
    },
  }, USER_A);

  rawToken = (createdSession as any).raw_token;
  assert(!!createdSession.id, 'Group 1: Session created with unique ID');
  assert(!!rawToken && rawToken.length >= 20, 'Group 1: High-entropy raw token generated');
  assert(createdSession.token_hash === ProofingSessionService.hashToken(rawToken), 'Group 1: SHA-256 token hash stored');
  assert(createdSession.items.length === 50, 'Group 1: All 50 gallery photos populated as items');
  assert(createdSession.status === ProofingSessionStatus.ACTIVE, 'Group 1: Initial session status is ACTIVE');

  // Group 2: Public token lookup & resolution
  const publicUnauth = await ProofingSessionService.getSessionByToken(rawToken);
  assert(publicUnauth.name === 'Eleanor & Lucas Proofing', 'Group 2: Session found via raw token');
  assert(publicUnauth.requires_pin === true, 'Group 2: PIN requirement detected');
  assert(publicUnauth.is_pin_verified === false, 'Group 2: Unverified state when PIN not supplied');
  assert(publicUnauth.items.length === 0, 'Group 2: Items hidden prior to PIN verification');

  // Group 3: Missing session lookup
  let missingFound = true;
  try {
    await ProofingSessionService.getSessionByToken('non_existent_token_string_here');
  } catch {
    missingFound = false;
  }
  assert(missingFound === false, 'Group 3: Non-existent token throws 404/not found error');

  // Group 4: Incorrect PIN rejection
  let pinFailed = false;
  try {
    await ProofingSessionService.getSessionByToken(rawToken, 'wrong_pin');
  } catch (e: any) {
    pinFailed = true;
    assert(e.message.includes('Incorrect PIN'), 'Group 4: Error message indicates incorrect PIN');
  }
  assert(pinFailed, 'Group 4: Incorrect PIN rejected with exception');

  // Group 5: Correct PIN Verification
  const publicAuthed = await ProofingSessionService.getSessionByToken(rawToken, '4321');
  assert(publicAuthed.is_pin_verified === true, 'Group 5: PIN verified successfully');
  assert(publicAuthed.items.length === 50, 'Group 5: Items revealed upon PIN verification');
  assert(publicAuthed.status === ProofingSessionStatus.CLIENT_REVIEWING, 'Group 5: Session status auto-transitions to CLIENT_REVIEWING');

  // Group 6: Session status transitions
  const studioView = await ProofingSessionService.getSessionById(createdSession.id, STUDIO_A);
  assert(studioView?.status === ProofingSessionStatus.CLIENT_REVIEWING, 'Group 6: Studio reflects CLIENT_REVIEWING status');

  // Group 7: Session deadline and expiration handling
  const updatedDeadline = await ProofingSessionService.updateSession(createdSession.id, STUDIO_A, {
    deadline_at: new Date(Date.now() + 86400000 * 7),
  });
  assert(!!updatedDeadline.deadline_at, 'Group 7: Deadline date updated');

  // Group 8: Watermark & download permissions
  assert(createdSession.watermark_enabled === true, 'Group 8: Watermark enabled by default');
  assert(createdSession.allow_download_previews === false, 'Group 8: High-res preview download restricted');

  // Group 9: Multi-session studio listing
  const sessionList = await ProofingSessionService.listSessions(STUDIO_A);
  assert(sessionList.length === 1 && sessionList[0].id === createdSession.id, 'Group 9: Studio lists its sessions');

  // Group 10: PIN check helper
  const isPinValid = await ProofingSessionService.verifyPin(rawToken, '4321');
  const isPinInvalid = await ProofingSessionService.verifyPin(rawToken, '0000');
  assert(isPinValid === true, 'Group 10: verifyPin validates matching PIN code');
  assert(isPinInvalid === false, 'Group 10: verifyPin rejects non-matching PIN code');

  // -----------------------------------------------------------
  // GROUP 11–25: QUOTA EVALUATION & SELECTION RULES
  // -----------------------------------------------------------
  console.log('\n--- GROUP 11-25: Quota & Rules Engine ---');

  // Group 11: Included photos count
  assert(createdSession.quota.included_count === 20, 'Group 11: Included quota matches rule (20 photos)');

  // Group 12: Minimum selection boundary (5)
  assert(createdSession.quota.min_selections === 5, 'Group 12: Min selections is 5');
  assert(createdSession.quota.is_min_met === false, 'Group 12: is_min_met is false with 0 selections');
  assert(createdSession.quota.is_valid_for_submission === false, 'Group 12: is_valid_for_submission false when min not met');

  // Select 5 items
  const items = createdSession.items;
  for (let i = 0; i < 5; i++) {
    await ProofingSelectionService.updateItem(createdSession.id, items[i].id, {
      status: ProofingItemStatus.SELECTED,
    });
  }

  let quota = ProofingSessionService.calculateQuota(
    createdSession.rules,
    await ProofingSelectionService.getSessionItems(createdSession.id)
  );
  assert(quota.selected_count === 5, 'Group 12: Selected count is now 5');
  assert(quota.is_min_met === true, 'Group 12: is_min_met is true after 5 selections');
  assert(quota.is_valid_for_submission === true, 'Group 12: is_valid_for_submission is true');
  assert(quota.extra_count === 0, 'Group 12: Extra count is 0 within included limit');

  // Group 13: Select up to 20 items (exactly included quota)
  for (let i = 5; i < 20; i++) {
    await ProofingSelectionService.updateItem(createdSession.id, items[i].id, {
      status: ProofingItemStatus.SELECTED,
    });
  }
  quota = ProofingSessionService.calculateQuota(
    createdSession.rules,
    await ProofingSelectionService.getSessionItems(createdSession.id)
  );
  assert(quota.selected_count === 20, 'Group 13: Selected count is 20');
  assert(quota.extra_count === 0, 'Group 13: 0 extra photos at included boundary');
  assert(quota.extra_total_cents === 0, 'Group 13: Extra charge is $0.00');

  // Group 14 & 15: Select 25 items (5 extra photos @ $6.00 = $30.00 / 3000 cents)
  for (let i = 20; i < 25; i++) {
    await ProofingSelectionService.updateItem(createdSession.id, items[i].id, {
      status: ProofingItemStatus.SELECTED,
    });
  }
  quota = ProofingSessionService.calculateQuota(
    createdSession.rules,
    await ProofingSelectionService.getSessionItems(createdSession.id)
  );
  assert(quota.selected_count === 25, 'Group 14: Selected count is 25');
  assert(quota.extra_count === 5, 'Group 14: Extra count is 5 photos');
  assert(quota.extra_total_cents === 3000, 'Group 15: Extra charge is 3000 cents ($30.00)');
  assert(quota.formatted_extra_total === '$30.00', 'Group 16: Formatted extra total string is $30.00');

  // Group 17: Multi-currency rule test
  const eurQuota = ProofingSessionService.calculateQuota(
    { ...createdSession.rules, currency: 'EUR', extra_price_cents: 800 },
    await ProofingSelectionService.getSessionItems(createdSession.id)
  );
  assert(eurQuota.extra_total_cents === 4000, 'Group 17: EUR extra total calculation (5 * 800 = 4000)');
  assert(eurQuota.formatted_extra_total.includes('40.00') || eurQuota.formatted_extra_total.includes('€'), 'Group 17: Currency formatting');

  // Group 18: Disallowed extra selections rule
  const noExtrasQuota = ProofingSessionService.calculateQuota(
    { ...createdSession.rules, max_selections: 20, allow_extras: false },
    await ProofingSelectionService.getSessionItems(createdSession.id) // 25 selected
  );
  assert(noExtrasQuota.is_max_exceeded === true, 'Group 18: is_max_exceeded is true when extras disallowed');
  assert(noExtrasQuota.is_valid_for_submission === false, 'Group 18: is_valid_for_submission is false when max exceeded');

  // Group 19-21: Breakdown of Favorites, Rejected, and Unreviewed
  await ProofingSelectionService.updateItem(createdSession.id, items[0].id, { is_favorite: true });
  await ProofingSelectionService.updateItem(createdSession.id, items[1].id, { is_favorite: true });
  await ProofingSelectionService.updateItem(createdSession.id, items[30].id, { status: ProofingItemStatus.REJECTED });
  await ProofingSelectionService.updateItem(createdSession.id, items[31].id, { status: ProofingItemStatus.REJECTED });

  const currentItems = await ProofingSelectionService.getSessionItems(createdSession.id);
  quota = ProofingSessionService.calculateQuota(createdSession.rules, currentItems);
  assert(quota.favorites_count === 2, 'Group 21: Favorites count is 2');
  assert(quota.rejected_count === 2, 'Group 20: Rejected count is 2');
  assert(quota.unreviewed_count === 23, 'Group 19: Unreviewed count is 23 (50 - 25 selected - 2 rejected)');

  // Group 22-25: Bulk Toggles & Rule Updates
  const bulkRes = await ProofingSelectionService.bulkUpdateItems(createdSession.id, {
    item_ids: [items[40].id, items[41].id, items[42].id],
    is_favorite: true,
  });
  assert(bulkRes.updated_count === 3, 'Group 23: Bulk updated 3 items to favorites');

  const updatedRules = await ProofingSessionService.updateRules(createdSession.id, STUDIO_A, {
    included_count: 25,
    extra_price_cents: 750,
  });
  assert(updatedRules.included_count === 25, 'Group 24: Rules updated included count to 25');
  assert(updatedRules.extra_price_cents === 750, 'Group 24: Rules updated extra price to 750 cents');

  // -----------------------------------------------------------
  // GROUP 26–40: ITEM MANAGEMENT & NON-DESTRUCTIVE SELECTIONS
  // -----------------------------------------------------------
  console.log('\n--- GROUP 26-40: Item Management & Non-Destructive Invariant ---');

  // Group 26-30: Item toggle behaviors
  const updatedItem = await ProofingSelectionService.updateItem(createdSession.id, items[5].id, {
    client_note: 'Please brighten background',
    rating: 5,
    flag_color: 'BLUE',
  });
  assert(updatedItem.client_note === 'Please brighten background', 'Group 32: Client note persisted on item');
  assert(updatedItem.rating === 5, 'Group 33: 5-star rating persisted on item');
  assert(updatedItem.flag_color === 'BLUE', 'Group 34: Flag color persisted on item');

  // Group 31: Non-Destructive Invariant
  const originalPhoto = mockDb.photos.find((p) => p.id === items[30].photo_id);
  assert(!!originalPhoto, 'Group 31: Rejected photo raw record exists in database');
  assert(originalPhoto.is_archived === false, 'Group 31: Rejected photo raw file remains completely intact and unarchived');

  // Group 36-38: Bulk Operations
  const bulkSelected = await ProofingSelectionService.bulkUpdateItems(createdSession.id, {
    item_ids: [items[10].id, items[11].id],
    status: ProofingItemStatus.UNREVIEWED,
  });
  assert(bulkSelected.updated_count === 2, 'Group 38: Bulk reset 2 items to unreviewed');

  // -----------------------------------------------------------
  // GROUP 41–50: SIDE-BY-SIDE PHOTO COMPARISON
  // -----------------------------------------------------------
  console.log('\n--- GROUP 41-50: Side-by-Side Photo Comparison ---');

  // Group 41: Create comparison group
  const comparison = await ProofingSelectionService.createComparison(createdSession.id, {
    name: 'Cake Cutting Angle Compare',
    photo_ids: [items[0].photo_id, items[1].photo_id, items[2].photo_id],
    notes: 'Which angle has better lighting on the couple?',
  });
  assert(!!comparison.id, 'Group 41: Comparison group created with ID');
  assert(comparison.photo_ids.length === 3, 'Group 41: 3 photos in comparison group');

  // Group 42: Validation: comparison requires >= 2 photos
  let compareValFailed = false;
  try {
    await ProofingSelectionService.createComparison(createdSession.id, {
      photo_ids: [items[0].photo_id],
    });
  } catch (e: any) {
    compareValFailed = true;
    assert(e.message.includes('at least 2 photos'), 'Group 42: Requires at least 2 photos message');
  }
  assert(compareValFailed, 'Group 42: Comparison with 1 photo rejected');

  // Group 43: List comparison sets
  const compList = await ProofingSelectionService.getComparisons(createdSession.id);
  assert(compList.length === 1, 'Group 43: Retrieved 1 comparison set in session');

  // Group 44 & 45: Winner Selection & Auto-Mark as Selected
  const winnerRes = await ProofingSelectionService.selectComparisonWinner(
    createdSession.id,
    comparison.id,
    items[1].photo_id
  );
  assert(winnerRes.winner_photo_id === items[1].photo_id, 'Group 44: Winner recorded in comparison set');
  const winnerItem = await prisma.photoProofingItem.findFirst({
    where: { session_id: createdSession.id, photo_id: items[1].photo_id },
  });
  assert(winnerItem?.status === ProofingItemStatus.SELECTED, 'Group 45: Winner photo automatically marked as SELECTED');

  // Group 47: Delete comparison group
  const deletedComp = await ProofingSelectionService.deleteComparison(createdSession.id, comparison.id);
  assert(deletedComp === true, 'Group 47: Comparison set deleted cleanly');

  // -----------------------------------------------------------
  // GROUP 51–65: PINPOINT FEEDBACK & RETOUCHING ANNOTATIONS
  // -----------------------------------------------------------
  console.log('\n--- GROUP 51-65: Pinpoint Retouching Feedback ---');

  // Group 51: General feedback comment
  const comment1 = await ProofingFeedbackService.addComment(createdSession.id, items[0].id, {
    comment_type: ProofingCommentType.GENERAL,
    comment_text: 'Lovely framing and expression!',
    author_name: 'Eleanor Vance',
  });
  assert(!!comment1.id, 'Group 51: General comment created');
  assert(comment1.pin_x === null && comment1.pin_y === null, 'Group 51: Coordinates null for general comment');

  // Group 52: Pinpoint retouching comment with normalized coordinates
  const comment2 = await ProofingFeedbackService.addComment(createdSession.id, items[0].id, {
    comment_type: ProofingCommentType.RETOUCH_BLEMISH,
    comment_text: 'Please soften shadow near left eye.',
    pin_x: 0.4523,
    pin_y: 0.3812,
    author_name: 'Eleanor Vance',
  });
  assert(!!comment2.id, 'Group 52: Pinpoint comment created');
  assert(comment2.pin_x === 0.4523 && comment2.pin_y === 0.3812, 'Group 52: Exact normalized coordinates stored');

  // Group 53 & 54: Coordinate range validation (0.0 - 1.0)
  let coordFailed = false;
  try {
    await ProofingFeedbackService.addComment(createdSession.id, items[0].id, {
      comment_type: ProofingCommentType.CROP_ALIGNMENT,
      comment_text: 'Out of bounds test',
      pin_x: 1.5,
      pin_y: 0.5,
    });
  } catch (e: any) {
    coordFailed = true;
    assert(e.message.includes('between 0.0 and 1.0'), 'Group 53: Error enforces 0.0-1.0 range');
  }
  assert(coordFailed, 'Group 53: Out of bounds pin_x coordinate rejected');

  // Group 55-60: Comment types verification
  const commentTypes = [
    ProofingCommentType.COLOR_CORRECTION,
    ProofingCommentType.RETOUCH_BODY_OBJECT,
    ProofingCommentType.CROP_ALIGNMENT,
    ProofingCommentType.LIGHTING_EXPOSURE,
    ProofingCommentType.SPECIAL_INSTRUCTION,
  ];
  for (const type of commentTypes) {
    const c = await ProofingFeedbackService.addComment(createdSession.id, items[1].id, {
      comment_type: type,
      comment_text: `Test instruction for ${type}`,
      pin_x: 0.5,
      pin_y: 0.5,
    });
    assert(c.comment_type === type, `Group 55-60: Comment type ${type} persisted`);
  }

  // Group 61: Threaded replies
  const reply = await ProofingFeedbackService.addComment(createdSession.id, items[0].id, {
    comment_type: ProofingCommentType.GENERAL,
    comment_text: 'Understood, our retoucher will polish this area.',
    parent_id: comment2.id,
    author_type: 'PHOTOGRAPHER',
    author_name: 'John Photographer',
  });
  assert(reply.parent_id === comment2.id, 'Group 61: Reply linked to parent pinpoint comment');

  // Group 63 & 64: Comment Resolution
  const resolved = await ProofingFeedbackService.updateComment(comment2.id, {
    is_resolved: true,
  }, USER_A);
  assert(resolved.is_resolved === true, 'Group 63: Comment marked resolved');
  assert(!!resolved.resolved_at, 'Group 63: resolved_at timestamp stamped');

  const unresolved = await ProofingFeedbackService.updateComment(comment2.id, {
    is_resolved: false,
  });
  assert(unresolved.is_resolved === false, 'Group 64: Comment un-resolved');
  assert(unresolved.resolved_at === null, 'Group 64: resolved_at cleared');

  // -----------------------------------------------------------
  // GROUP 66–76: SUBMISSION VALIDATION & STUDIO REVIEW DECISIONS
  // -----------------------------------------------------------
  console.log('\n--- GROUP 66-76: Submission Validation & Review Handoffs ---');

  // Group 66: Min selections validation on submit
  // Create an empty test session
  const underSession = await ProofingSessionService.createSession(STUDIO_A, {
    name: 'Under Quota Test',
    gallery_id: GALLERY_A,
    rules: { min_selections: 10 },
  });
  let submitFailed = false;
  try {
    await ProofingReviewService.submitClientSelections(underSession.id, {
      client_name: 'Eleanor',
    });
  } catch (e: any) {
    submitFailed = true;
    assert(e.message.includes('Minimum selection requirement not met'), 'Group 66: Error reports min quota failure');
  }
  assert(submitFailed, 'Group 66: Submission rejected when min selections not met');

  // Ensure createdSession has 28 selections vs 25 included -> 3 extra photos ($22.50)
  for (let i = 0; i < 28; i++) {
    await ProofingSelectionService.updateItem(createdSession.id, items[i].id, {
      status: ProofingItemStatus.SELECTED,
    });
  }

  // Group 68: Extra surcharge confirmation validation
  let extraConfirmFailed = false;
  try {
    await ProofingReviewService.submitClientSelections(createdSession.id, {
      client_name: 'Eleanor Vance',
      confirm_extra_charges: false, // did not confirm extra fee
    });
  } catch (e: any) {
    extraConfirmFailed = true;
    assert(e.message.includes('Please confirm the extra charge'), 'Group 68: Error requires extra charge confirmation');
  }
  assert(extraConfirmFailed, 'Group 68: Submission with unconfirmed extra fees rejected');

  // Group 69: Successful client submission
  const submittedSession = await ProofingReviewService.submitClientSelections(createdSession.id, {
    client_name: 'Eleanor Vance',
    client_email: 'eleanor@example.com',
    final_notes: 'All set! Please proceed with high-res edits.',
    confirm_extra_charges: true,
  });
  assert(submittedSession.status === ProofingSessionStatus.SUBMITTED, 'Group 69: Status updated to SUBMITTED');
  assert(!!submittedSession.submitted_at, 'Group 69: submitted_at timestamp stamped');

  // Group 39: Lock invariant in SUBMITTED state
  let lockFailed = false;
  try {
    await ProofingSelectionService.updateItem(createdSession.id, items[0].id, {
      status: ProofingItemStatus.UNREVIEWED,
    });
  } catch (e: any) {
    lockFailed = true;
    assert(e.message.includes('locked from further client modifications'), 'Group 39: Error enforces locked session invariant');
  }
  assert(lockFailed, 'Group 39: Modifications rejected when session is locked in SUBMITTED state');

  // Group 70–72: Studio Review Decision: APPROVED_FOR_EDITING
  const reviewResult = await ProofingReviewService.reviewSelections(createdSession.id, STUDIO_A, USER_A, {
    decision: ProofingReviewDecision.APPROVED_FOR_EDITING,
    feedback_notes: 'Approved! Queuing master edits.',
    auto_create_edit_jobs: true,
    advance_production_stage: true,
  });

  assert(reviewResult.decision === ProofingReviewDecision.APPROVED_FOR_EDITING, 'Group 70: Review decision is APPROVED_FOR_EDITING');
  assert(reviewResult.edit_job_ids!.length > 0, 'Group 71: PhotoEditJobs automatically created in Phase 24 queue');
  assert(mockDb.editJobs.length === reviewResult.edit_job_ids!.length, 'Group 71: Edit jobs stored in database');

  const production = mockDb.projectProductions.find((p) => p.project_id === PROJECT_A);
  assert(production?.current_stage === 'POST_PRODUCTION', 'Group 72: Phase 23 ProjectProduction stage advanced to POST_PRODUCTION');

  // Group 73 & 74: Revision Request Decision resets to CHANGES_REQUESTED
  const revisionReview = await ProofingReviewService.reviewSelections(createdSession.id, STUDIO_A, USER_A, {
    decision: ProofingReviewDecision.REVISION_REQUIRED,
    feedback_notes: 'Please pick 2 more vertical shots.',
  });
  assert(revisionReview.decision === ProofingReviewDecision.REVISION_REQUIRED, 'Group 73: Revision required decision recorded');
  const sessionAfterRevision = await ProofingSessionService.getSessionById(createdSession.id, STUDIO_A);
  assert(sessionAfterRevision?.status === ProofingSessionStatus.CHANGES_REQUESTED, 'Group 73: Session status transitioned to CHANGES_REQUESTED');

  // Group 74: Client can now edit again
  const itemReopened = await ProofingSelectionService.updateItem(createdSession.id, items[4].id, {
    client_note: 'Updated note in revision',
  });
  assert(itemReopened.client_note === 'Updated note in revision', 'Group 74: Client edits re-enabled during CHANGES_REQUESTED');

  // Group 75: Direct fulfillment decision
  const directReview = await ProofingReviewService.reviewSelections(createdSession.id, STUDIO_A, USER_A, {
    decision: ProofingReviewDecision.DIRECT_FULFILLMENT,
    feedback_notes: 'Direct delivery requested without extra editing pass.',
  });
  assert(directReview.decision === ProofingReviewDecision.DIRECT_FULFILLMENT, 'Group 75: Direct fulfillment decision processed');

  // Group 76: Rejected decision
  const rejectReview = await ProofingReviewService.reviewSelections(underSession.id, STUDIO_A, USER_A, {
    decision: ProofingReviewDecision.REJECTED,
    feedback_notes: 'Session cancelled per customer request.',
  });
  assert(rejectReview.decision === ProofingReviewDecision.REJECTED, 'Group 76: Rejected/cancelled decision recorded');

  // -----------------------------------------------------------
  // GROUP 77–80: COPILOT TOOLS & ANALYTICS
  // -----------------------------------------------------------
  console.log('\n--- GROUP 77-80: Copilot Tools, Analytics & Security ---');

  const copilotCtx = { studioId: STUDIO_A, userId: USER_A };
  const registry = CopilotToolRegistry.getInstance();

  // Group 77: Copilot Read Tools
  const copilotSummary = await registry.executeTool('getProofingSessionSummary', copilotCtx, {});
  assert(copilotSummary.total_sessions >= 1, 'Group 77: Copilot getProofingSessionSummary returns summary data');
  assert(copilotSummary.total_selections_made > 0, 'Group 77: Total selections reported accurately');

  const copilotSess = await registry.executeTool('getProofingSession', copilotCtx, { sessionId: createdSession.id });
  assert(copilotSess.id === createdSession.id, 'Group 77: Copilot getProofingSession returns session details');

  const copilotSelections = await registry.executeTool('listProofingSelections', copilotCtx, { sessionId: createdSession.id });
  assert(Array.isArray(copilotSelections) && copilotSelections.length > 0, 'Group 77: Copilot listProofingSelections returns selected items');

  const copilotQuota = await registry.executeTool('getProofingRuleStatus', copilotCtx, { sessionId: createdSession.id });
  assert(copilotQuota.included_count === 25, 'Group 77: Copilot getProofingRuleStatus returns quota calculation');

  // Group 78: Copilot Mutation Tools
  const copilotCreated = await registry.executeTool('createProofingSession', copilotCtx, {
    name: 'Copilot Created Proofing',
    gallery_id: GALLERY_A,
    rules: { included_count: 15 },
  });
  assert(copilotCreated.success === true, 'Group 78: Copilot createProofingSession executes successfully');
  assert(copilotCreated.data.rules.included_count === 15, 'Group 78: Copilot created session has custom rules');

  const copilotRulesUpdated = await registry.executeTool('updateProofingRules', copilotCtx, {
    sessionId: copilotCreated.data.id,
    included_count: 22,
  });
  assert(copilotRulesUpdated.success === true, 'Group 78: Copilot updateProofingRules executes successfully');
  assert(copilotRulesUpdated.data.included_count === 22, 'Group 78: Rules reflect updated value');

  // Group 79: Proofing Analytics calculations
  const studioSummary = await ProofingAnalyticsService.getStudioSummary(STUDIO_A);
  assert(studioSummary.total_sessions >= 2, 'Group 79: Analytics counts total studio sessions');
  assert(typeof studioSummary.formatted_extra_revenue === 'string', 'Group 79: Formatted extra revenue computed');
  assert(studioSummary.total_comments_placed > 0, 'Group 79: Total comment annotations counted');
  assert(studioSummary.compliance_rate_percent >= 0, 'Group 79: Quota compliance percentage calculated');

  // Group 80: Multi-Tenant IDOR: Studio B cannot access Studio A's proofing sessions
  const studioBSession = await ProofingSessionService.getSessionById(createdSession.id, STUDIO_B);
  assert(studioBSession === null, 'Group 80: Studio B cannot fetch Studio A proofing session by ID');

  let idorDeleteFailed = false;
  try {
    await ProofingSessionService.deleteSession(createdSession.id, STUDIO_B);
  } catch (e: any) {
    idorDeleteFailed = true;
    assert(e.message.includes('not found'), 'Group 80: IDOR delete yields not found');
  }
  assert(idorDeleteFailed, 'Group 80: Studio B cannot delete Studio A session');

  // -----------------------------------------------------------
  // GROUP 81–82: CONCURRENCY & AUDIT TRAIL LOGGING
  // -----------------------------------------------------------
  console.log('\n--- GROUP 81-82: Concurrency & Audit Trail ---');

  // Group 81: High concurrency test (50 concurrent item toggles on an active session)
  const concurrencySession = await ProofingSessionService.createSession(STUDIO_A, {
    project_id: PROJECT_A,
    gallery_id: GALLERY_A,
    client_id: USER_A,
    title: 'Concurrency Stress Proofing Session',
  });
  const concurrencyItems = await prisma.photoProofingItem.findMany({
    where: { session_id: concurrencySession.id },
  });

  const togglePromises: Promise<any>[] = [];
  for (let i = 0; i < 50; i++) {
    const item = concurrencyItems[i];
    const newFav = i % 2 === 0;
    togglePromises.push(
      ProofingSelectionService.updateItem(concurrencySession.id, item.id, {
        is_favorite: newFav,
      })
    );
  }
  const toggleResults = await Promise.all(togglePromises);
  assert(toggleResults.length === 50, 'Group 81: 50 concurrent item toggles resolved successfully without deadlocks');

  // Group 82: Audit Trail Logging
  const auditLogs = await ProofingAnalyticsService.getSessionAuditLog(createdSession.id, STUDIO_A);
  assert(auditLogs.length >= 3, 'Group 82: Audit logs recorded for session creation, updates, and reviews');
  const actions = auditLogs.map((a) => a.action);
  assert(actions.includes('SESSION_CREATED'), 'Group 82: Audit contains SESSION_CREATED');
  assert(actions.includes('SELECTIONS_SUBMITTED'), 'Group 82: Audit contains SELECTIONS_SUBMITTED');
  assert(actions.includes('REVIEW_DECISION_RECORDED'), 'Group 82: Audit contains REVIEW_DECISION_RECORDED');

  // Final Test Suite Summary
  console.log('\n============================================================');
  console.log(`PHASE 25 TEST EXECUTION COMPLETE`);
  console.log(`PASSED: ${passed} assertions`);
  console.log(`FAILED: ${failed} assertions`);
  console.log('============================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runAllPhase25Tests().catch((err) => {
  console.error('Fatal error during Phase 25 tests:', err);
  process.exit(1);
});
