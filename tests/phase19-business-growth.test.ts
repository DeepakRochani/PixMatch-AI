/**
 * PIXMatch AI — Phase 19 Automated Test Suite
 * AI Business Growth & Marketing Intelligence
 *
 * Test Groups:
 * Group 1: Opportunity Engine & Evidence Quality Confidence Scoring
 * Group 2: Client Reactivation 0–100 Deterministic Scoring & Recency Inactivity
 * Group 3: Marketing Campaign CRUD & Invalidation of Human Approval on Edit
 * Group 4: Strict Human Approval Gate & Dispatch Safety (Zero Auto-Send)
 * Group 5: Real-time Suppression & Consent Enforcement at Dispatch
 * Group 6: Safe Tracking: HMAC Tokens, Open Pixel, Click Redirect, Conversion Attribution
 * Group 7: Mathematical Safety & Zero-Division Protections (Rates & ROI)
 * Group 8: Zero Synthetic Revenue & Zero Fake Predictive Probabilities Guarantees
 * Group 9: Biometric Isolation Guarantee (Zero Face Vectors in Segmentation)
 * Group 10: Service Growth & Quarterly Seasonal Patterns (Q1–Q4)
 * Group 11: Growth Goals Tracking & Progress Recalculation
 * Group 12: Formula-Safe Recipient & Campaign CSV Export
 * Group 13: Super Admin Aggregate Growth & Marketing Telemetry
 * Group 14: Copilot Growth Tool Registry & Intent Resolution
 */

process.env.DATABASE_URL = process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/pixmatch_test';
process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-jwt-secret-key-must-be-32-chars-long';

import {
  GrowthOpportunityType,
  GrowthOpportunityPriority,
  GrowthOpportunityStatus,
  MarketingCampaignChannel,
  MarketingCampaignStatus,
  MarketingRecipientStatus,
} from '@pixmatch/types';

import { prisma } from '@pixmatch/database';
import { GrowthOpportunityService } from '../apps/api/src/modules/growth/growth-opportunity.service.js';
import { ClientReactivationService } from '../apps/api/src/modules/growth/client-reactivation.service.js';
import { MarketingCampaignService } from '../apps/api/src/modules/growth/marketing-campaign.service.js';
import { CampaignExecutionService } from '../apps/api/src/modules/growth/campaign-execution.service.js';
import { GrowthPerformanceService } from '../apps/api/src/modules/growth/growth-performance.service.js';
import { ServiceGrowthService } from '../apps/api/src/modules/growth/service-growth.service.js';
import { GrowthAdminService } from '../apps/api/src/modules/growth/growth-admin.service.js';
import { CopilotToolRegistry } from '../apps/api/src/modules/copilot/copilot-tool-registry.js';
import { DeterministicCopilotProvider } from '../apps/api/src/modules/copilot/copilot-llm-provider.js';

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
// IN-MEMORY MOCK DATABASE FOR GROWTH & MARKETING INTELLIGENCE
// =============================================================

function setupMockDatabase() {
  const studios: any[] = [
    { id: 'studio-1', name: 'Apex Photography', slug: 'apex-photography', currency: 'USD' },
    { id: 'studio-2', name: 'Solstice Studio', slug: 'solstice-studio', currency: 'USD' },
    { id: 'studio-empty', name: 'New Studio (No Campaigns)', slug: 'new-studio', currency: 'USD' },
  ];

  const clients: any[] = [
    {
      id: 'client-active',
      studio_id: 'studio-1',
      name: 'Olivia Wilde',
      email: 'olivia@example.com',
      created_at: new Date('2025-01-01T00:00:00Z'),
      deleted_at: null,
      engagement_profile: { engagement_score: 85, state: 'ACTIVE' },
    },
    {
      id: 'client-dormant-recent',
      studio_id: 'studio-1',
      name: 'Marcus Vance',
      email: 'marcus@example.com',
      created_at: new Date('2025-03-01T00:00:00Z'),
      deleted_at: null,
      engagement_profile: { engagement_score: 45, state: 'DORMANT' },
    },
    {
      id: 'client-dormant-long',
      studio_id: 'studio-1',
      name: 'Sarah Connor',
      email: 'sarah@example.com',
      created_at: new Date('2024-06-01T00:00:00Z'),
      deleted_at: null,
      engagement_profile: { engagement_score: 20, state: 'INACTIVE' },
    },
    {
      id: 'client-suppressed',
      studio_id: 'studio-1',
      name: 'Unsubscribed Client',
      email: 'unsub@example.com',
      created_at: new Date('2025-01-01T00:00:00Z'),
      deleted_at: null,
      engagement_profile: { engagement_score: 30, state: 'DORMANT' },
    },
    {
      id: 'client-studio2',
      studio_id: 'studio-2',
      name: 'Foreign Client',
      email: 'foreign@example.com',
      created_at: new Date('2025-02-01T00:00:00Z'),
      deleted_at: null,
      engagement_profile: { engagement_score: 60, state: 'ACTIVE' },
    },
  ];

  const galleries: any[] = [
    {
      id: 'gal-recent',
      studio_id: 'studio-1',
      title: 'Wilde Wedding 2026',
      published_at: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000), // 15 days ago
      created_at: new Date('2026-08-01T00:00:00Z'),
      deleted_at: null,
      analytics: { views_count: 120, downloads_count: 45, favorites_count: 30 },
      client_insights: [],
    },
    {
      id: 'gal-marcus',
      studio_id: 'studio-1',
      title: 'Marcus Portrait Session',
      published_at: new Date(Date.now() - 75 * 24 * 60 * 60 * 1000), // 75 days ago (Dormant Recent)
      created_at: new Date('2026-06-01T00:00:00Z'),
      deleted_at: null,
      analytics: { views_count: 50, downloads_count: 10, favorites_count: 5 },
      client_insights: [],
    },
    {
      id: 'gal-sarah',
      studio_id: 'studio-1',
      title: 'Sarah Milestone Shoot',
      published_at: new Date(Date.now() - 220 * 24 * 60 * 60 * 1000), // 220 days ago (Dormant Long)
      created_at: new Date('2025-12-01T00:00:00Z'),
      deleted_at: null,
      analytics: { views_count: 200, downloads_count: 80, favorites_count: 60 },
      client_insights: [],
    },
  ];

  const clientGalleries: any[] = [
    { client_id: 'client-active', gallery_id: 'gal-recent', gallery: galleries[0] },
    { client_id: 'client-dormant-recent', gallery_id: 'gal-marcus', gallery: galleries[1] },
    { client_id: 'client-dormant-long', gallery_id: 'gal-sarah', gallery: galleries[2] },
  ];

  const businessTransactions: any[] = [
    {
      id: 'tx-1',
      studio_id: 'studio-1',
      client_id: 'client-active',
      gallery_id: 'gal-recent',
      amount: 3500.0,
      transaction_type: 'INCOME',
      category: 'Wedding Photography',
      date: new Date('2026-08-01T00:00:00Z'),
      is_void: false,
    },
    {
      id: 'tx-2',
      studio_id: 'studio-1',
      client_id: 'client-dormant-recent',
      gallery_id: 'gal-marcus',
      amount: 850.0,
      transaction_type: 'INCOME',
      category: 'Portrait & Family',
      date: new Date('2026-06-01T00:00:00Z'),
      is_void: false,
    },
    {
      id: 'tx-3',
      studio_id: 'studio-1',
      client_id: 'client-dormant-long',
      gallery_id: 'gal-sarah',
      amount: 1500.0,
      transaction_type: 'INCOME',
      category: 'Commercial & Product',
      date: new Date('2025-12-01T00:00:00Z'),
      is_void: false,
    },
  ];

  const suppressions: any[] = [
    {
      id: 'sup-1',
      studio_id: 'studio-1',
      email: 'unsub@example.com',
      reason: 'UNSUBSCRIBED',
      created_at: new Date('2026-01-01T00:00:00Z'),
    },
  ];

  const notificationPreferences: any[] = [
    {
      id: 'pref-1',
      studio_id: 'studio-1',
      client_id: 'client-suppressed',
      marketing_emails: false,
    },
  ];

  let opportunities: any[] = [];
  let campaigns: any[] = [];
  let recipients: any[] = [];
  let goals: any[] = [];
  let auditLogs: any[] = [];

  const mockDb: any = {
    studio: {
      findMany: async () => studios,
      findUnique: async ({ where }: any) => studios.find(s => s.id === where.id),
      findFirst: async ({ where }: any) => studios.find(s => s.id === where.id),
      count: async ({ where }: any = {}) => {
        if (where?.marketing_campaigns?.some) {
          const activeStudioIds = new Set(campaigns.map(c => c.studio_id));
          return activeStudioIds.size;
        }
        return studios.length;
      },
    },
    client: {
      findMany: async ({ where, include }: any = {}) => {
        let res = clients;
        if (where?.studio_id) res = res.filter(c => c.studio_id === where.studio_id);
        if (where?.id?.in) res = res.filter(c => where.id.in.includes(c.id));
        if (where?.deleted_at === null) res = res.filter(c => c.deleted_at === null);
        return res.map(c => ({
          ...c,
          engagement_profile: c.engagement_profile,
          galleries: clientGalleries.filter(cg => cg.client_id === c.id),
          business_transactions: businessTransactions.filter(tx => tx.client_id === c.id && !tx.is_void),
        }));
      },
      findUnique: async ({ where }: any) => clients.find(c => c.id === where.id),
      findFirst: async ({ where }: any) => clients.find(c => c.id === where.id && (!where.studio_id || c.studio_id === where.studio_id)),
      count: async () => clients.length,
    },
    gallery: {
      findMany: async ({ where }: any = {}) => {
        let res = galleries;
        if (where?.studio_id) res = res.filter(g => g.studio_id === where.studio_id);
        if (where?.deleted_at === null) res = res.filter(g => g.deleted_at === null);
        return res.map(g => ({
          ...g,
          client_galleries: clientGalleries.filter(cg => cg.gallery_id === g.id).map(cg => ({
            client: clients.find(c => c.id === cg.client_id),
          })),
        }));
      },
      findUnique: async ({ where }: any) => galleries.find(g => g.id === where.id),
      findFirst: async ({ where }: any) => galleries.find(g => g.id === where.id),
      count: async () => galleries.length,
    },
    studioBusinessTransaction: {
      findMany: async ({ where }: any = {}) => {
        let res = businessTransactions;
        if (where?.studio_id) res = res.filter(t => t.studio_id === where.studio_id);
        if (where?.is_void !== undefined) res = res.filter(t => t.is_void === where.is_void);
        if (where?.transaction_type) res = res.filter(t => t.transaction_type === where.transaction_type);
        return res;
      },
      count: async () => businessTransactions.length,
    },
    emailSuppression: {
      findMany: async ({ where }: any = {}) => {
        let res = suppressions;
        if (where?.studio_id) res = res.filter(s => s.studio_id === where.studio_id);
        if (where?.email?.in) res = res.filter(s => where.email.in.includes(s.email));
        return res;
      },
      findFirst: async ({ where }: any = {}) => {
        return suppressions.find(s => s.email.toLowerCase() === where.email.toLowerCase()) || null;
      },
    },
    notificationPreference: {
      findMany: async ({ where }: any = {}) => {
        let res = notificationPreferences;
        if (where?.studio_id) res = res.filter(p => p.studio_id === where.studio_id);
        return res;
      },
      findFirst: async ({ where }: any = {}) => {
        return notificationPreferences.find(p => p.studio_id === where.studio_id && p.client_id === where.client_id) || null;
      },
    },
    clientInsight: {
      findMany: async () => [],
      findFirst: async () => null,
    },
    growthOpportunity: {
      create: async ({ data }: any) => {
        const item = {
          id: `opp-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
          status: GrowthOpportunityStatus.OPEN,
          created_at: new Date(),
          updated_at: new Date(),
          ...data,
        };
        opportunities.push(item);
        return item;
      },
      findMany: async ({ where, orderBy, take, skip }: any = {}) => {
        let res = opportunities;
        if (where?.studio_id) res = res.filter(o => o.studio_id === where.studio_id);
        if (where?.type) res = res.filter(o => o.type === where.type);
        if (where?.status) {
          if (typeof where.status === 'string') res = res.filter(o => o.status === where.status);
          else if (where.status.in) res = res.filter(o => where.status.in.includes(o.status));
          else if (where.status.not) res = res.filter(o => o.status !== where.status.not);
        }
        if (where?.priority) res = res.filter(o => o.priority === where.priority);
        const mapped = res.map(o => ({
          ...o,
          client: clients.find(c => c.id === o.client_id) || null,
          gallery: galleries.find(g => g.id === o.gallery_id) || null,
        }));
        if (skip !== undefined || take !== undefined) {
          const s = skip || 0;
          const t = take || mapped.length;
          return mapped.slice(s, s + t);
        }
        return mapped;
      },
      findFirst: async (args: any = {}) => {
        const list = await mockDb.growthOpportunity.findMany(args);
        return list[0] || null;
      },
      findUnique: async ({ where }: any = {}) => {
        const item = opportunities.find(o => o.id === where.id);
        if (!item) return null;
        return {
          ...item,
          client: clients.find(c => c.id === item.client_id) || null,
          gallery: galleries.find(g => g.id === item.gallery_id) || null,
        };
      },
      update: async ({ where, data }: any) => {
        const idx = opportunities.findIndex(o => o.id === where.id);
        if (idx === -1) throw new Error('Opportunity not found');
        opportunities[idx] = { ...opportunities[idx], ...data, updated_at: new Date() };
        return opportunities[idx];
      },
      count: async ({ where }: any = {}) => {
        let res = opportunities;
        if (where?.studio_id) res = res.filter(o => o.studio_id === where.studio_id);
        if (where?.status) {
          if (typeof where.status === 'string') res = res.filter(o => o.status === where.status);
          else if (where.status.in) res = res.filter(o => where.status.in.includes(o.status));
        }
        return res.length;
      },
    },
    marketingCampaign: {
      create: async ({ data }: any) => {
        const item = {
          id: `camp-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
          status: MarketingCampaignStatus.DRAFT,
          channel: MarketingCampaignChannel.EMAIL,
          approved_by: null,
          approved_at: null,
          recipients_count: 0,
          sent_count: 0,
          delivered_count: 0,
          opens_count: 0,
          clicks_count: 0,
          conversions_count: 0,
          attributed_revenue: 0,
          cost: 0,
          created_at: new Date(),
          updated_at: new Date(),
          ...data,
        };
        campaigns.push(item);
        return {
          ...item,
          studio: studios.find(s => s.id === item.studio_id),
          recipients: [],
        };
      },
      findMany: async ({ where, include, orderBy, take, skip }: any = {}) => {
        let res = campaigns;
        if (where?.id) res = res.filter(c => c.id === where.id);
        if (where?.studio_id) res = res.filter(c => c.studio_id === where.studio_id);
        if (where?.status) {
          if (typeof where.status === 'string') res = res.filter(c => c.status === where.status);
          else if (where.status.in) res = res.filter(c => where.status.in.includes(c.status));
        }
        const mapped = res.map(c => ({
          ...c,
          studio: studios.find(s => s.id === c.studio_id),
          recipients: recipients.filter(r => r.campaign_id === c.id),
        }));
        if (skip !== undefined || take !== undefined) {
          const s = skip || 0;
          const t = take || mapped.length;
          return mapped.slice(s, s + t);
        }
        return mapped;
      },
      findFirst: async (args: any = {}) => {
        const list = await mockDb.marketingCampaign.findMany(args);
        return list[0] || null;
      },
      findUnique: async ({ where }: any = {}) => {
        const item = campaigns.find(c => c.id === where.id);
        if (!item) return null;
        return {
          ...item,
          studio: studios.find(s => s.id === item.studio_id),
          recipients: recipients.filter(r => r.campaign_id === item.id).map(r => ({
            ...r,
            client: clients.find(c => c.id === r.client_id) || null,
          })),
        };
      },
      update: async ({ where, data }: any) => {
        const idx = campaigns.findIndex(c => c.id === where.id);
        if (idx === -1) throw new Error('Campaign not found');
        campaigns[idx] = { ...campaigns[idx], ...data, updated_at: new Date() };
        return {
          ...campaigns[idx],
          studio: studios.find(s => s.id === campaigns[idx].studio_id),
          recipients: recipients.filter(r => r.campaign_id === campaigns[idx].id),
        };
      },
      delete: async ({ where }: any) => {
        const idx = campaigns.findIndex(c => c.id === where.id);
        if (idx === -1) throw new Error('Campaign not found');
        const removed = campaigns.splice(idx, 1)[0];
        recipients = recipients.filter(r => r.campaign_id !== where.id);
        return removed;
      },
      count: async ({ where }: any = {}) => {
        let res = campaigns;
        if (where?.studio_id) res = res.filter(c => c.studio_id === where.studio_id);
        if (where?.status) res = res.filter(c => c.status === where.status);
        return res.length;
      },
    },
    marketingCampaignRecipient: {
      createMany: async ({ data }: any) => {
        const items = data.map((d: any) => ({
          id: `rec-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
          status: MarketingRecipientStatus.PENDING,
          conversion_value: null,
          created_at: new Date(),
          updated_at: new Date(),
          ...d,
        }));
        recipients.push(...items);
        return { count: items.length };
      },
      deleteMany: async ({ where }: any = {}) => {
        const initial = recipients.length;
        if (where?.campaign_id) {
          recipients = recipients.filter(r => r.campaign_id !== where.campaign_id);
        }
        return { count: initial - recipients.length };
      },
      findMany: async ({ where, orderBy, take, skip }: any = {}) => {
        let res = recipients;
        if (where?.id) res = res.filter(r => r.id === where.id);
        if (where?.campaign_id) res = res.filter(r => r.campaign_id === where.campaign_id);
        if (where?.status) {
          if (typeof where.status === 'string') res = res.filter(r => r.status === where.status);
          else if (where.status.in) res = res.filter(r => where.status.in.includes(r.status));
        }
        const mapped = res.map(r => ({
          ...r,
          client: clients.find(c => c.id === r.client_id) || null,
        }));
        if (skip !== undefined || take !== undefined) {
          const s = skip || 0;
          const t = take || mapped.length;
          return mapped.slice(s, s + t);
        }
        return mapped;
      },
      findFirst: async (args: any = {}) => {
        const list = await mockDb.marketingCampaignRecipient.findMany(args);
        return list[0] || null;
      },
      findUnique: async ({ where }: any = {}) => {
        const item = recipients.find(r => r.id === where.id);
        if (!item) return null;
        return {
          ...item,
          client: clients.find(c => c.id === item.client_id) || null,
          campaign: campaigns.find(c => c.id === item.campaign_id) || null,
        };
      },
      update: async ({ where, data }: any) => {
        const idx = recipients.findIndex(r => r.id === where.id);
        if (idx === -1) throw new Error('Recipient not found');
        recipients[idx] = { ...recipients[idx], ...data, updated_at: new Date() };
        return recipients[idx];
      },
      count: async ({ where }: any = {}) => {
        let res = recipients;
        if (where?.campaign_id) res = res.filter(r => r.campaign_id === where.campaign_id);
        if (where?.status) res = res.filter(r => r.status === where.status);
        return res.length;
      },
    },
    studioBusinessGoal: {
      create: async ({ data }: any) => {
        const item = {
          id: `goal-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
          current_value: 0,
          status: 'IN_PROGRESS',
          created_at: new Date(),
          updated_at: new Date(),
          ...data,
        };
        goals.push(item);
        return item;
      },
      findMany: async ({ where }: any = {}) => {
        let res = goals;
        if (where?.studio_id) res = res.filter(g => g.studio_id === where.studio_id);
        if (where?.status) res = res.filter(g => g.status === where.status);
        return res;
      },
      findFirst: async ({ where }: any = {}) => {
        return goals.find(g => g.studio_id === where.studio_id && (!where.id || g.id === where.id)) || null;
      },
      update: async ({ where, data }: any) => {
        const idx = goals.findIndex(g => g.id === where.id);
        if (idx === -1) throw new Error('Goal not found');
        goals[idx] = { ...goals[idx], ...data, updated_at: new Date() };
        return goals[idx];
      },
      count: async ({ where }: any = {}) => {
        let res = goals;
        if (where?.studio_id) res = res.filter(g => g.studio_id === where.studio_id);
        return res.length;
      },
    },
    auditLog: {
      create: async ({ data }: any) => {
        const item = { id: `audit-${Date.now()}`, ...data, created_at: new Date() };
        auditLogs.push(item);
        return item;
      },
      findMany: async () => auditLogs,
    },
  };

  // Monkey-patch global Prisma singleton to use in-memory state
  Object.assign(prisma, mockDb);

  return {
    mockDb,
    studios,
    clients,
    galleries,
    opportunities,
    campaigns,
    recipients,
    goals,
    suppressions,
  };
}

// =============================================================
// RUN PHASE 19 COMPREHENSIVE TESTS
// =============================================================

async function runPhase19Tests() {
  console.log('\n=============================================================');
  console.log('🧪 PIXMATCH AI — PHASE 19 AUTOMATED TEST SUITE');
  console.log('AI Business Growth & Marketing Intelligence');
  console.log('=============================================================\n');

  const { mockDb, clients, recipients, suppressions } = setupMockDatabase();

  // -------------------------------------------------------------
  // GROUP 1: OPPORTUNITY ENGINE & EVIDENCE QUALITY CONFIDENCE SCORING
  // -------------------------------------------------------------
  console.log('--- GROUP 1: Opportunity Engine & Evidence Quality Confidence Scoring ---');
  {
    const scanResult = await GrowthOpportunityService.scanOpportunities('studio-1');
    assert(scanResult.generated > 0, `Generated ${scanResult.generated} growth opportunities`);

    const { opportunities: opps } = await GrowthOpportunityService.listOpportunities('studio-1', {});
    assert(opps.length > 0, `Retrieved ${opps.length} opportunities for studio-1`);

    // Verify all generated opportunities have transparent evidence-based confidence
    for (const opp of opps) {
      assert(opp.confidence_score >= 0 && opp.confidence_score <= 1, `Confidence score bounded 0-1: ${opp.confidence_score}`);
      assert(opp.description.length > 0, 'Description provided and grounded in client data');
      assert(opp.recommended_action.length > 0, 'Action recommendation provided');
      assert(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL', 'URGENT'].includes(opp.priority), `Valid priority enum: ${opp.priority}`);
      assert(opp.status === GrowthOpportunityStatus.OPEN, 'Initial status is OPEN');
    }

    // Status transition: IN_PROGRESS
    const inProgressOpp = await GrowthOpportunityService.updateStatus(
      'studio-1',
      opps[0].id,
      GrowthOpportunityStatus.IN_PROGRESS
    );
    assert(inProgressOpp.status === GrowthOpportunityStatus.IN_PROGRESS, 'Opportunity status updated to IN_PROGRESS');

    // Status transition: COMPLETED
    const completedOpp = await GrowthOpportunityService.updateStatus(
      'studio-1',
      opps[0].id,
      GrowthOpportunityStatus.COMPLETED
    );
    assert(completedOpp.status === GrowthOpportunityStatus.COMPLETED, 'Opportunity status updated to COMPLETED');

    // Verify tenant isolation on opportunities
    try {
      await GrowthOpportunityService.updateStatus('studio-2', opps[0].id, GrowthOpportunityStatus.COMPLETED);
      assert(false, 'Cross-studio opportunity mutation should fail with IDOR protection');
    } catch (err: any) {
      assert(true, 'IDOR protection prevented cross-studio opportunity mutation');
    }
  }

  // -------------------------------------------------------------
  // GROUP 2: CLIENT REACTIVATION 0–100 SCORING & INACTIVITY WINDOWS
  // -------------------------------------------------------------
  console.log('\n--- GROUP 2: Client Reactivation 0–100 Scoring & Inactivity Windows ---');
  {
    const candidates = await ClientReactivationService.getReactivationCandidates('studio-1', {
      minDaysInactive: 30,
    });
    assert(candidates.length >= 2, `Identified ${candidates.length} reactivation candidates`);

    // Check candidate properties
    const marcus = candidates.find(c => c.client_id === 'client-dormant-recent');
    assert(marcus !== undefined, 'Found recent dormant candidate (Marcus)');
    if (marcus) {
      assert(marcus.reengagement_score > 0, `Deterministic reactivation score computed: ${marcus.reengagement_score}`);
      assert(marcus.days_inactive >= 60, `Inactivity days is ${marcus.days_inactive}`);
      assert(marcus.recorded_revenue > 0, `Verified spend is $${marcus.recorded_revenue}`);
      assert(marcus.suppression_status === 'AVAILABLE', 'Candidate is available / not suppressed');
      assert(marcus.recommended_angle.length > 0, `Recommended angle: ${marcus.recommended_angle}`);
    }

    const sarah = candidates.find(c => c.client_id === 'client-dormant-long');
    assert(sarah !== undefined, 'Found long dormant candidate (Sarah)');
    if (sarah) {
      assert(sarah.days_inactive >= 180, `Days inactive: ${sarah.days_inactive}`);
    }

    // Suppressed client verification in candidates
    const suppressedClient = candidates.find(c => c.client_id === 'client-suppressed');
    if (suppressedClient) {
      assert(suppressedClient.suppression_status === 'UNSUBSCRIBED', 'Suppressed client correctly flagged in candidate pool');
    }
  }

  // -------------------------------------------------------------
  // GROUP 3: MARKETING CAMPAIGN CRUD & APPROVAL INVALIDATION ON EDIT
  // -------------------------------------------------------------
  console.log('\n--- GROUP 3: Marketing Campaign CRUD & Invalidation of Human Approval on Edit ---');
  let campaignId = '';
  {
    // Create new campaign draft
    const campaign = await MarketingCampaignService.createDraft(
      'studio-1',
      'user-admin-1',
      {
        name: 'Spring Reactivation Blast',
        objective: 'CLIENT_REACTIVATION',
        channel: MarketingCampaignChannel.EMAIL,
        subject: 'Special Priority Booking for Spring Portraits',
        content: 'Hello {{client_name}}, we would love to welcome you back for portraits!',
        preview_text: 'Priority booking dates are now open.',
        offer_text: 'Complimentary fine art print with booking.',
        segment_definition: {
          min_days_inactive: 60,
          client_ids: ['client-dormant-recent', 'client-dormant-long'],
        },
      }
    );

    campaignId = campaign.id;
    assert(campaign.id.startsWith('camp-'), `Created campaign draft: ${campaign.id}`);
    assert(campaign.status === MarketingCampaignStatus.DRAFT, 'Initial status is strictly DRAFT');
    assert(campaign.approved_by === null, 'approved_by is initially null');
    assert(campaign.approved_at === null, 'approved_at is initially null');
    assert(campaign.recipient_count === 2 || (campaign as any).recipients?.length === 2, `Recipient count resolved: ${campaign.recipient_count}`);

    // Approve the campaign
    const approved = await MarketingCampaignService.approveCampaign('studio-1', campaignId, 'user-admin-1');
    assert(approved.status === MarketingCampaignStatus.APPROVED, 'Campaign status changed to APPROVED');
    assert(approved.approved_by === 'user-admin-1', 'approved_by recorded');
    assert(approved.approved_at !== null, 'approved_at timestamp recorded');

    // EDIT CAMPAIGN CONTENT -> MUST STRICTLY INVALIDATE APPROVAL
    const updated = await MarketingCampaignService.updateDraft('studio-1', campaignId, {
      subject: 'Updated: Special Priority Booking for Spring Portraits 2026',
    });

    assert(updated.status === MarketingCampaignStatus.DRAFT, 'Editing content reset status back to DRAFT');
    assert(updated.approved_by === null, 'Editing content cleared approved_by to null');
    assert(updated.approved_at === null, 'Editing content cleared approved_at to null');
  }

  // -------------------------------------------------------------
  // GROUP 4: STRICT HUMAN APPROVAL GATE & DISPATCH SAFETY
  // -------------------------------------------------------------
  console.log('\n--- GROUP 4: Strict Human Approval Gate & Dispatch Safety ---');
  {
    // 1. Try to dispatch unapproved campaign -> MUST THROW ERROR
    try {
      await CampaignExecutionService.dispatchCampaign('studio-1', campaignId);
      assert(false, 'Dispatching unapproved draft should fail');
    } catch (err: any) {
      assert(err.message.includes('human approval'), 'Error enforces explicit human approval requirement');
    }

    // 2. Try to schedule unapproved campaign -> MUST THROW ERROR
    try {
      await MarketingCampaignService.scheduleCampaign('studio-1', campaignId, new Date('2026-10-01T00:00:00Z'));
      assert(false, 'Scheduling unapproved draft should fail');
    } catch (err: any) {
      assert(err.message.includes('approved'), 'Scheduling enforces approval gate');
    }

    // 3. Explicitly approve campaign
    const approved = await MarketingCampaignService.approveCampaign('studio-1', campaignId, 'user-admin-1');
    assert(approved.status === MarketingCampaignStatus.APPROVED, 'Campaign re-approved');
  }

  // -------------------------------------------------------------
  // GROUP 5: REAL-TIME SUPPRESSION & CONSENT ENFORCEMENT AT DISPATCH
  // -------------------------------------------------------------
  console.log('\n--- GROUP 5: Real-time Suppression & Consent Enforcement at Dispatch ---');
  {
    // Re-approve campaign
    await MarketingCampaignService.approveCampaign('studio-1', campaignId, 'user-admin-1');

    // Add Marcus to suppression right before dispatch to simulate real-time mid-flight unsubscribe
    suppressions.push({
      id: 'sup-marcus',
      studio_id: 'studio-1',
      email: 'marcus@example.com',
      reason: 'UNSUBSCRIBED',
      created_at: new Date(),
    });

    // Dispatch campaign
    const dispatchResult = await CampaignExecutionService.dispatchCampaign('studio-1', campaignId);
    assert(dispatchResult.sent >= 1, `Sent to valid clients: ${dispatchResult.sent}`);
    assert(dispatchResult.suppressed >= 1, `Suppressed/unsubscribed client was skipped: ${dispatchResult.suppressed}`);

    // Verify recipient status in database
    const allRecipients = await mockDb.marketingCampaignRecipient.findMany({ where: { campaign_id: campaignId } });
    const suppressedRec = allRecipients.find((r: any) => r.client_id === 'client-dormant-recent');
    assert(suppressedRec !== undefined, 'Suppressed recipient record exists');
    if (suppressedRec) {
      assert(suppressedRec.status === MarketingRecipientStatus.SUPPRESSED, 'Suppressed recipient marked SUPPRESSED');
      assert(suppressedRec.error_message?.includes('Suppressed'), 'Suppression reason recorded');
    }
  }

  // -------------------------------------------------------------
  // GROUP 6: SAFE TRACKING: HMAC TOKENS, OPEN PIXEL, CLICK & CONVERSION
  // -------------------------------------------------------------
  console.log('\n--- GROUP 6: Safe Tracking: HMAC Tokens, Open Pixel, Click & Conversion ---');
  {
    const recipients = await mockDb.marketingCampaignRecipient.findMany({
      where: { campaign_id: campaignId, status: MarketingRecipientStatus.DELIVERED },
    });
    assert(recipients.length > 0, 'Found delivered recipients');

    const targetRecipient = recipients[0];

    // 1. Generate tracking token
    const openToken = CampaignExecutionService.generateTrackingToken(targetRecipient.id, 'open');
    assert(typeof openToken === 'string' && openToken.length > 20, 'HMAC tracking token generated');

    const parsed = CampaignExecutionService.verifyTrackingToken(openToken);
    assert(parsed.valid === true, 'HMAC tracking token verified successfully');
    assert(parsed.recipientId === targetRecipient.id, 'Token matches recipient ID');
    assert(parsed.action === 'open', 'Token matches action');

    // 2. Open Tracking Pixel
    const openSuccess = await CampaignExecutionService.recordOpen(openToken);
    assert(openSuccess === true, 'Recorded email open');

    const openedRec = await mockDb.marketingCampaignRecipient.findUnique({ where: { id: targetRecipient.id } });
    assert(openedRec.status === MarketingRecipientStatus.OPENED, 'Recipient status updated to OPENED');
    assert(openedRec.opened_at !== null, 'opened_at recorded');

    // 3. Click Tracking
    const clickToken = CampaignExecutionService.generateTrackingToken(targetRecipient.id, 'click');
    const clickResult = await CampaignExecutionService.recordClick(clickToken);
    assert(clickResult.success === true, 'Recorded email link click');

    const clickedRec = await mockDb.marketingCampaignRecipient.findUnique({ where: { id: targetRecipient.id } });
    assert(clickedRec.status === MarketingRecipientStatus.CLICKED, 'Recipient status updated to CLICKED');
    assert(clickedRec.clicked_at !== null, 'clicked_at recorded');

    // 4. Conversion Attribution
    const convertedSuccess = await CampaignExecutionService.recordConversion(
      targetRecipient.id,
      1200.0,
      'BOOKING'
    );
    assert(convertedSuccess === true, 'Recorded conversion');

    const convertedRec = await mockDb.marketingCampaignRecipient.findUnique({ where: { id: targetRecipient.id } });
    assert(convertedRec.status === MarketingRecipientStatus.CONVERTED, 'Recipient status updated to CONVERTED');
    assert(convertedRec.conversion_value === 1200.0, 'Conversion value attributed ($1200)');
  }

  // -------------------------------------------------------------
  // GROUP 7: MATHEMATICAL SAFETY & ZERO-DIVISION PROTECTIONS
  // -------------------------------------------------------------
  console.log('\n--- GROUP 7: Mathematical Safety & Zero-Division Protections ---');
  {
    // Test performance metrics on empty studio
    const emptyPerf = await GrowthPerformanceService.getOverview('studio-empty');
    assert(emptyPerf.aggregate_metrics.delivery_rate_pct === null, 'Delivery rate is null when 0 sent (no NaN)');
    assert(emptyPerf.aggregate_metrics.open_rate_pct === null, 'Open rate is null when 0 delivered (no NaN)');
    assert(emptyPerf.aggregate_metrics.click_rate_pct === null, 'Click rate is null when 0 opens (no NaN)');
    assert(emptyPerf.aggregate_metrics.conversion_rate_pct === null, 'Conversion rate is null when 0 clicks (no NaN)');
    assert(emptyPerf.aggregate_metrics.campaign_roi_pct === null, 'ROI is null when 0 cost (no division by zero)');
    assert(emptyPerf.total_campaigns === 0, 'Total campaigns is 0');
    assert(emptyPerf.total_attributed_revenue === 0, 'Total attributed revenue is 0');

    // Test performance metrics on active studio
    const activePerf = await GrowthPerformanceService.getOverview('studio-1');
    assert(typeof activePerf.total_attributed_revenue === 'number', `Attributed revenue is a number: $${activePerf.total_attributed_revenue}`);
    assert(activePerf.total_conversions > 0, `Total conversions > 0: ${activePerf.total_conversions}`);
    assert(activePerf.aggregate_metrics.delivery_rate_pct !== null, 'Delivery rate is calculated for active studio');
  }

  // -------------------------------------------------------------
  // GROUP 8: ZERO SYNTHETIC REVENUE & ZERO FAKE PREDICTIVE PROBABILITIES
  // -------------------------------------------------------------
  console.log('\n--- GROUP 8: Zero Synthetic Revenue & Zero Fake Predictive Probabilities ---');
  {
    // Verify that gallery views/downloads/favorites do NOT invent revenue
    const { opportunities: opps } = await GrowthOpportunityService.listOpportunities('studio-1', {});
    for (const opp of opps) {
      assert(opp.confidence_score <= 1 && opp.confidence_score >= 0, 'Confidence score represents evidence quality only');
      assert(!opp.description.includes('guaranteed outcome'), 'Zero guaranteed outcome claims');
      assert(!opp.description.includes('100% chance'), 'Zero fake probability percentages in description');
    }

    // Verified revenue matches strictly verified transactions/conversions
    const studio1Overview = await GrowthPerformanceService.getOverview('studio-1');
    assert(studio1Overview.total_attributed_revenue === 1200.0, 'Attributed revenue matches exactly verified conversion ($1200.0)');
  }

  // -------------------------------------------------------------
  // GROUP 9: BIOMETRIC ISOLATION GUARANTEE
  // -------------------------------------------------------------
  console.log('\n--- GROUP 9: Biometric Isolation Guarantee ---');
  {
    const preview = await MarketingCampaignService.previewRecipients('studio-1', {
      min_days_inactive: 60,
    });

    assert(Array.isArray(preview.eligible_recipients), 'Eligible recipients returned');
    for (const rec of preview.eligible_recipients) {
      // Ensure no face embeddings or biometric metadata exist in recipient payloads
      assert((rec as any).face_embedding === undefined, 'Zero face embeddings in recipient payload');
      assert((rec as any).face_vector === undefined, 'Zero face vectors in recipient payload');
      assert((rec as any).biometric_id === undefined, 'Zero biometric identifiers in recipient payload');
      assert(typeof rec.client_id === 'string', 'Recipient segmented strictly by client_id & business metadata');
    }
  }

  // -------------------------------------------------------------
  // GROUP 10: SERVICE GROWTH & QUARTERLY SEASONAL PATTERNS
  // -------------------------------------------------------------
  console.log('\n--- GROUP 10: Service Growth & Quarterly Seasonal Patterns ---');
  {
    const serviceAnalysis = await ServiceGrowthService.getServiceGrowth('studio-1');
    assert(Array.isArray(serviceAnalysis.services), 'Services breakdown returned');
    assert(serviceAnalysis.services.length > 0, 'Services analyzed for studio');

    for (const s of serviceAnalysis.services) {
      assert(typeof s.total_revenue === 'number', `Service revenue is number: $${s.total_revenue}`);
      assert(typeof s.booking_frequency === 'number', `Booking frequency is number: ${s.booking_frequency}`);
      assert(s.seasonal_pattern !== undefined, 'Seasonal pattern defined for service');
      assert(s.seasonal_pattern.peak_quarter !== undefined, `Peak quarter identified: ${s.seasonal_pattern.peak_quarter}`);
    }
  }

  // -------------------------------------------------------------
  // GROUP 11: GROWTH GOALS TRACKING & PROGRESS RECALCULATION
  // -------------------------------------------------------------
  console.log('\n--- GROUP 11: Growth Goals Tracking & Progress Recalculation ---');
  {
    const goal = await GrowthPerformanceService.createGoal('studio-1', {
      title: 'Q3 Revenue Target',
      metric_type: 'ATTRIBUTED_REVENUE',
      target_value: 5000.0,
      period: 'QUARTERLY',
      start_date: new Date('2026-07-01T00:00:00Z'),
      end_date: new Date('2026-09-30T00:00:00Z'),
    });

    assert(goal.id.startsWith('goal-'), `Created growth goal: ${goal.id}`);
    assert(goal.target_value === 5000.0, 'Target value is $5000');
    assert(goal.status === 'IN_PROGRESS', 'Goal is IN_PROGRESS');

    const goals = await GrowthPerformanceService.listGoals('studio-1');
    assert(goals.length > 0, 'Retrieved active studio growth goals');
  }

  // -------------------------------------------------------------
  // GROUP 12: FORMULA-SAFE RECIPIENT & CAMPAIGN CSV EXPORT
  // -------------------------------------------------------------
  console.log('\n--- GROUP 12: Formula-Safe Recipient & Campaign CSV Export ---');
  {
    // Inject formula attack in client name
    clients.push({
      id: 'client-malicious',
      studio_id: 'studio-1',
      name: '=cmd|’ /C calc’!A0',
      email: '+1234567@malicious.com',
      deleted_at: null,
      created_at: new Date(),
    });
    recipients.push({
      id: 'rec-malicious',
      campaign_id: campaignId,
      client_id: 'client-malicious',
      email: '+1234567@malicious.com',
      client_name: '=cmd|’ /C calc’!A0',
      status: MarketingRecipientStatus.PENDING,
      error_message: '@SUM(1,2,3) payload',
      created_at: new Date(),
    });

    const csv = await MarketingCampaignService.exportRecipientsCsv('studio-1', campaignId);
    assert(typeof csv === 'string', 'CSV generated as string');
    assert(csv.includes('Recipient ID,Client Name,Client Email,Status'), 'CSV contains standard headers');
    assert(csv.includes("''=cmd") || csv.includes("'\=cmd") || csv.includes("'=cmd"), 'Formula starting with = is sanitized');
    assert(csv.includes("'+1234567"), 'Formula starting with + is sanitized');
  }

  // -------------------------------------------------------------
  // GROUP 13: SUPER ADMIN AGGREGATE GROWTH TELEMETRY
  // -------------------------------------------------------------
  console.log('\n--- GROUP 13: Super Admin Aggregate Growth Telemetry ---');
  {
    const adminTelemetry = await GrowthAdminService.getGrowthTelemetry();
    assert(adminTelemetry.total_studios >= 2, `Total studios: ${adminTelemetry.total_studios}`);
    assert(adminTelemetry.studios_with_growth_adoption >= 1, `Adoption studios: ${adminTelemetry.studios_with_growth_adoption}`);
    assert(adminTelemetry.growth_adoption_rate_pct > 0, `Adoption rate: ${adminTelemetry.growth_adoption_rate_pct}%`);
    assert(adminTelemetry.total_campaigns_created >= 1, `Total campaigns created: ${adminTelemetry.total_campaigns_created}`);
    assert(adminTelemetry.total_campaigns_approved >= 1, `Total campaigns approved: ${adminTelemetry.total_campaigns_approved}`);
    assert(adminTelemetry.total_attributed_growth_revenue > 0, `Attributed growth revenue: $${adminTelemetry.total_attributed_growth_revenue}`);
    assert(Array.isArray(adminTelemetry.top_growth_studios), 'Top growth studios array returned');
    assert(adminTelemetry.top_growth_studios.length >= 1, 'Top growth studio identified');
    assert(adminTelemetry.top_growth_studios[0].studio_id === 'studio-1', 'Studio-1 ranked as top growth studio');
  }

  // -------------------------------------------------------------
  // GROUP 14: COPILOT GROWTH TOOL REGISTRY & INTENT RESOLUTION
  // -------------------------------------------------------------
  console.log('\n--- GROUP 14: Copilot Growth Tool Registry & Intent Resolution ---');
  {
    const copilotRegistry = new CopilotToolRegistry(mockDb as any);
    const tools = copilotRegistry.getAvailableTools();

    assert(tools.some(t => t.name === 'getGrowthOpportunities'), 'Copilot getGrowthOpportunities tool registered');
    assert(tools.some(t => t.name === 'scanGrowthOpportunities'), 'Copilot scanGrowthOpportunities tool registered');
    assert(tools.some(t => t.name === 'getClientReactivations'), 'Copilot getClientReactivations tool registered');
    assert(tools.some(t => t.name === 'getMarketingCampaigns'), 'Copilot getMarketingCampaigns tool registered');
    assert(tools.some(t => t.name === 'getCampaignPerformance'), 'Copilot getCampaignPerformance tool registered');
    assert(tools.some(t => t.name === 'getGrowthPerformanceOverview'), 'Copilot getGrowthPerformanceOverview tool registered');
    assert(tools.some(t => t.name === 'getServiceGrowthAnalysis'), 'Copilot getServiceGrowthAnalysis tool registered');
    assert(tools.some(t => t.name === 'getSeasonalDemandPatterns'), 'Copilot getSeasonalDemandPatterns tool registered');

    // Execute growth copilot tool
    const oppResult = await copilotRegistry.executeTool('getGrowthOpportunities', {}, { studioId: 'studio-1', userId: 'user-1' });
    assert(Array.isArray(oppResult.opportunities), 'Executed getGrowthOpportunities tool successfully');

    // Test Copilot LLM provider prompt handling with growth intent
    const copilotProvider = new DeterministicCopilotProvider(copilotRegistry);
    const promptResponse = await copilotProvider.generateResponse('Which past clients should we re-engage for spring portraits?', {
      studioId: 'studio-1',
      userId: 'user-1',
    });
    assert(promptResponse.suggestedActions.length > 0, 'Copilot suggested actions returned for growth query');
  }

  // =============================================================
  // SUMMARY
  // =============================================================
  console.log('\n=============================================================');
  console.log(`🏁 PHASE 19 TEST RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log('=============================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runPhase19Tests().catch((err) => {
  console.error('Unhandled test suite error:', err);
  process.exit(1);
});
