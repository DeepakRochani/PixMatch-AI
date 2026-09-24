/**
 * PIXMatch AI — Phase 18 Automated Test Suite
 * Studio Business Intelligence & Revenue Intelligence
 *
 * Test Groups:
 * Group 1: Transaction Creation & Input Validation (Amounts, Enums, Dates)
 * Group 2: Multi-Tenant Scoping & Strict IDOR Defenses
 * Group 3: Financial Mutations, Soft-Delete & Voiding Audit Trail (Zero Hard-Delete)
 * Group 4: Zero Fake Financial Data Verification (Zero-data guarantees)
 * Group 5: Revenue, Expense, & Profit Aggregations (Net profit, margins, AOV)
 * Group 6: MoM Growth & Time Trend Modeling
 * Group 7: Package & Service Category Performance
 * Group 8: Gallery-to-Business Funnel Linking & Turnaround Velocity
 * Group 9: Client Lifetime Value & Revenue Summaries
 * Group 10: Business Goal Lifecycle & Automatic Progress Recalculation
 * Group 11: Deterministic Statistical Forecasting & Confidence Intervals
 * Group 12: Financial Anomaly Detection & Insights Lifecycle
 * Group 13: Formula-Safe CSV Export & Injection Protections
 * Group 14: Super Admin Studio Business Telemetry
 */

process.env.DATABASE_URL = process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/pixmatch_test';
process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-jwt-secret-key-must-be-32-chars-long';

import {
  BusinessTransactionType,
  BusinessTransactionStatus,
  BusinessGoalPeriodType,
  BusinessGoalMetricType,
  BusinessGoalStatus,
  BusinessInsightType,
  BusinessInsightSeverity,
  BusinessInsightStatus,
  BusinessForecastMetric,
  BusinessForecastPeriod,
  BusinessForecastConfidence,
} from '@pixmatch/types';

import { BusinessTransactionService } from '../apps/api/src/modules/business/business-transaction.service.js';
import { BusinessAggregationService } from '../apps/api/src/modules/business/business-aggregation.service.js';
import { BusinessGoalService } from '../apps/api/src/modules/business/business-goal.service.js';
import { BusinessForecastService } from '../apps/api/src/modules/business/business-forecast.service.js';
import { BusinessInsightService } from '../apps/api/src/modules/business/business-insight.service.js';
import { BusinessAdminService } from '../apps/api/src/modules/business/business-admin.service.js';
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
// IN-MEMORY MOCK DATABASE FOR STUDIO BUSINESS INTELLIGENCE
// =============================================================

function createMockDb() {
  const studios: any[] = [
    { id: 'studio-1', name: 'Apex Photography', slug: 'apex-photography', currency: 'USD' },
    { id: 'studio-2', name: 'Solstice Studio', slug: 'solstice-studio', currency: 'USD' },
    { id: 'studio-empty', name: 'New Studio (No Transactions)', slug: 'new-studio', currency: 'USD' },
  ];

  const clients: any[] = [
    {
      id: 'client-1',
      studio_id: 'studio-1',
      name: 'Olivia Wilde',
      email: 'olivia@example.com',
      created_at: new Date('2026-01-01T00:00:00Z'),
    },
    {
      id: 'client-2',
      studio_id: 'studio-1',
      name: 'Marcus Vance',
      email: 'marcus@example.com',
      created_at: new Date('2026-02-01T00:00:00Z'),
    },
    {
      id: 'client-studio2',
      studio_id: 'studio-2',
      name: 'Foreign Client',
      email: 'foreign@example.com',
      created_at: new Date('2026-02-01T00:00:00Z'),
    },
  ];

  const galleries: any[] = [
    {
      id: 'gal-1',
      studio_id: 'studio-1',
      title: 'Wilde Wedding',
      published_at: new Date('2026-06-15T00:00:00Z'),
      created_at: new Date('2026-06-10T00:00:00Z'),
      is_published: true,
    },
    {
      id: 'gal-2',
      studio_id: 'studio-1',
      title: 'Vance Corporate Event',
      published_at: new Date('2026-07-20T00:00:00Z'),
      created_at: new Date('2026-07-15T00:00:00Z'),
      is_published: true,
    },
    {
      id: 'gal-3',
      studio_id: 'studio-1',
      title: 'Wilde Maternity Shoot',
      published_at: new Date('2026-08-10T00:00:00Z'),
      created_at: new Date('2026-08-05T00:00:00Z'),
      is_published: true,
    },
    {
      id: 'gal-studio2',
      studio_id: 'studio-2',
      title: 'Studio 2 Session',
      published_at: new Date('2026-08-01T00:00:00Z'),
      created_at: new Date('2026-07-28T00:00:00Z'),
      is_published: true,
    },
  ];

  let transactions: any[] = [];
  let goals: any[] = [];
  let insights: any[] = [];
  let forecasts: any[] = [];
  let auditLogs: any[] = [];

  const db: any = {
    studio: {
      findMany: async () => studios,
      findUnique: async ({ where }: any) => studios.find((s) => s.id === where.id),
      findFirst: async ({ where }: any) => studios.find((s) => s.id === where.id),
      count: async () => studios.length,
    },
    client: {
      findMany: async ({ where }: any) => {
        let res = clients;
        if (where?.studio_id) res = res.filter((c) => c.studio_id === where.studio_id);
        if (where?.id?.in) res = res.filter((c) => where.id.in.includes(c.id));
        return res;
      },
      findUnique: async ({ where }: any) => clients.find((c) => c.id === where.id),
      findFirst: async ({ where }: any) => {
        return clients.find((c) => {
          if (where.id && c.id !== where.id) return false;
          if (where.studio_id && c.studio_id !== where.studio_id) return false;
          return true;
        });
      },
    },
    gallery: {
      findMany: async ({ where }: any) => {
        let res = galleries;
        if (where?.studio_id) res = res.filter((g) => g.studio_id === where.studio_id);
        if (where?.id?.in) res = res.filter((g) => where.id.in.includes(g.id));
        return res;
      },
      findUnique: async ({ where }: any) => galleries.find((g) => g.id === where.id),
      findFirst: async ({ where }: any) => {
        return galleries.find((g) => {
          if (where.id && g.id !== where.id) return false;
          if (where.studio_id && g.studio_id !== where.studio_id) return false;
          return true;
        });
      },
    },
    studioBusinessTransaction: {
      create: async ({ data }: any) => {
        const item = {
          id: `tx-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
          is_void: false,
          void_reason: null,
          voided_at: null,
          created_at: new Date(),
          updated_at: new Date(),
          ...data,
        };
        transactions.push(item);
        return {
          ...item,
          client: clients.find((c) => c.id === item.client_id) || null,
          gallery: galleries.find((g) => g.id === item.gallery_id) || null,
        };
      },
      findMany: async ({ where, orderBy, take, skip }: any = {}) => {
        let res = transactions;
        if (where?.id) res = res.filter((t) => t.id === where.id);
        if (where?.studio_id) {
          if (typeof where.studio_id === 'string') {
            res = res.filter((t) => t.studio_id === where.studio_id);
          } else if (where.studio_id.in) {
            res = res.filter((t) => where.studio_id.in.includes(t.studio_id));
          }
        }
        if (where?.client_id) res = res.filter((t) => t.client_id === where.client_id);
        if (where?.gallery_id) res = res.filter((t) => t.gallery_id === where.gallery_id);
        if (where?.type) res = res.filter((t) => t.type === where.type);
        if (where?.category) res = res.filter((t) => t.category === where.category);
        if (where?.is_void !== undefined) res = res.filter((t) => t.is_void === where.is_void);
        if (where?.date) {
          if (where.date.gte) res = res.filter((t) => new Date(t.date || t.transaction_date) >= new Date(where.date.gte));
          if (where.date.lte) res = res.filter((t) => new Date(t.date || t.transaction_date) <= new Date(where.date.lte));
        }
        if (where?.transaction_date) {
          if (where.transaction_date.gte) res = res.filter((t) => new Date(t.transaction_date || t.date) >= new Date(where.transaction_date.gte));
          if (where.transaction_date.lte) res = res.filter((t) => new Date(t.transaction_date || t.date) <= new Date(where.transaction_date.lte));
        }
        if (orderBy?.date === 'desc' || orderBy?.transaction_date === 'desc') {
          res.sort((a, b) => new Date(b.transaction_date || b.date).getTime() - new Date(a.transaction_date || a.date).getTime());
        } else if (orderBy?.date === 'asc' || orderBy?.transaction_date === 'asc') {
          res.sort((a, b) => new Date(a.transaction_date || a.date).getTime() - new Date(b.transaction_date || b.date).getTime());
        }
        const mapped = res.map((item) => ({
          ...item,
          client: clients.find((c) => c.id === item.client_id) || null,
          gallery: galleries.find((g) => g.id === item.gallery_id) || null,
        }));
        if (skip !== undefined || take !== undefined) {
          const s = skip || 0;
          const t = take || mapped.length;
          return mapped.slice(s, s + t);
        }
        return mapped;
      },
      findFirst: async ({ where }: any) => {
        const list = await db.studioBusinessTransaction.findMany({ where });
        return list[0] || null;
      },
      findUnique: async ({ where }: any) => {
        const item = transactions.find((t) => t.id === where.id);
        if (!item) return null;
        return {
          ...item,
          client: clients.find((c) => c.id === item.client_id) || null,
          gallery: galleries.find((g) => g.id === item.gallery_id) || null,
        };
      },
      update: async ({ where, data }: any) => {
        const idx = transactions.findIndex((t) => t.id === where.id);
        if (idx === -1) throw new Error('Transaction not found');
        transactions[idx] = { ...transactions[idx], ...data, updated_at: new Date() };
        return {
          ...transactions[idx],
          client: clients.find((c) => c.id === transactions[idx].client_id) || null,
          gallery: galleries.find((g) => g.id === transactions[idx].gallery_id) || null,
        };
      },
      count: async ({ where }: any = {}) => {
        const list = await db.studioBusinessTransaction.findMany({ where });
        return list.length;
      },
    },
    studioBusinessGoal: {
      create: async ({ data }: any) => {
        const item = {
          id: `goal-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
          current_value: 0,
          status: BusinessGoalStatus.IN_PROGRESS,
          created_at: new Date(),
          updated_at: new Date(),
          ...data,
        };
        goals.push(item);
        return item;
      },
      findMany: async ({ where }: any = {}) => {
        let res = goals;
        if (where?.studio_id) res = res.filter((g) => g.studio_id === where.studio_id);
        if (where?.status) res = res.filter((g) => g.status === where.status);
        return res;
      },
      findFirst: async ({ where }: any) => {
        return goals.find((g) => {
          if (where.id && g.id !== where.id) return false;
          if (where.studio_id && g.studio_id !== where.studio_id) return false;
          return true;
        }) || null;
      },
      update: async ({ where, data }: any) => {
        const idx = goals.findIndex((g) => g.id === where.id);
        if (idx === -1) throw new Error('Goal not found');
        goals[idx] = { ...goals[idx], ...data, updated_at: new Date() };
        return goals[idx];
      },
      delete: async ({ where }: any) => {
        const idx = goals.findIndex((g) => g.id === where.id);
        if (idx === -1) throw new Error('Goal not found');
        const removed = goals.splice(idx, 1)[0];
        return removed;
      },
      count: async ({ where }: any = {}) => {
        let res = goals;
        if (where?.studio_id) res = res.filter((g) => g.studio_id === where.studio_id);
        return res.length;
      },
    },
    studioBusinessInsight: {
      create: async ({ data }: any) => {
        const item = {
          id: `ins-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
          status: BusinessInsightStatus.ACTIVE,
          created_at: new Date(),
          ...data,
        };
        insights.push(item);
        return item;
      },
      findMany: async ({ where }: any = {}) => {
        let res = insights;
        if (where?.studio_id) res = res.filter((i) => i.studio_id === where.studio_id);
        if (where?.status) res = res.filter((i) => i.status === where.status);
        return res;
      },
      findFirst: async ({ where }: any) => {
        return insights.find((i) => {
          if (where.id && i.id !== where.id) return false;
          if (where.studio_id && i.studio_id !== where.studio_id) return false;
          return true;
        }) || null;
      },
      update: async ({ where, data }: any) => {
        const idx = insights.findIndex((i) => i.id === where.id);
        if (idx === -1) throw new Error('Insight not found');
        insights[idx] = { ...insights[idx], ...data };
        return insights[idx];
      },
      count: async ({ where }: any = {}) => {
        let res = insights;
        if (where?.studio_id) res = res.filter((i) => i.studio_id === where.studio_id);
        return res.length;
      },
    },
    studioBusinessForecast: {
      create: async ({ data }: any) => {
        const item = {
          id: `fc-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
          created_at: new Date(),
          ...data,
        };
        forecasts.push(item);
        return item;
      },
      findMany: async ({ where }: any = {}) => {
        let res = forecasts;
        if (where?.studio_id) res = res.filter((f) => f.studio_id === where.studio_id);
        return res;
      },
      count: async () => forecasts.length,
    },
    studioBusinessAuditLog: {
      create: async ({ data }: any) => {
        const item = {
          id: `audit-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
          created_at: new Date(),
          ...data,
        };
        auditLogs.push(item);
        return item;
      },
      findMany: async ({ where }: any = {}) => {
        let res = auditLogs;
        if (where?.studio_id) res = res.filter((a) => a.studio_id === where.studio_id);
        if (where?.transaction_id) res = res.filter((a) => a.transaction_id === where.transaction_id);
        return res;
      },
      count: async () => auditLogs.length,
    },
  };

  return { db, transactions, goals, insights, forecasts, auditLogs };
}

// =============================================================
// RUN PHASE 18 COMPREHENSIVE TESTS
// =============================================================

async function runPhase18Tests() {
  console.log('\n=============================================================');
  console.log('🧪 RUNNING PHASE 18: STUDIO BUSINESS INTELLIGENCE TEST SUITE');
  console.log('=============================================================\n');

  const { db, transactions, goals, insights, auditLogs } = createMockDb();

  const txService = new BusinessTransactionService(db);
  const aggService = new BusinessAggregationService(db);
  const goalService = new BusinessGoalService(db);
  const forecastService = new BusinessForecastService(db);
  const insightService = new BusinessInsightService(db);
  const adminService = new BusinessAdminService(db);

  // -------------------------------------------------------------
  // GROUP 1: TRANSACTION CREATION & VALIDATION
  // -------------------------------------------------------------
  console.log('--- GROUP 1: Transaction Creation & Input Validation ---');
  {
    // Valid Income Transaction
    const incomeTx = await txService.createTransaction('studio-1', {
      type: BusinessTransactionType.INCOME,
      category: 'Wedding Photography Package',
      amount: 3500.0,
      currency: 'USD',
      date: new Date('2026-06-15T00:00:00Z'),
      client_id: 'client-1',
      gallery_id: 'gal-1',
      service_type: 'Wedding',
      description: 'Full day wedding coverage + album',
    });

    assert(Boolean(incomeTx.id), 'Valid income transaction created');
    assert(incomeTx.amount === 3500.0, 'Correct transaction amount recorded');
    assert(incomeTx.type === BusinessTransactionType.INCOME, 'Correct transaction type INCOME');
    assert(incomeTx.status === BusinessTransactionStatus.COMPLETED, 'Default status is COMPLETED');
    assert(incomeTx.is_void === false, 'Transaction is not void');

    // Valid Expense Transaction
    const expenseTx = await txService.createTransaction('studio-1', {
      type: BusinessTransactionType.EXPENSE,
      category: 'Second Shooter Subcontractor',
      amount: 600.0,
      currency: 'USD',
      date: new Date('2026-06-16T00:00:00Z'),
      gallery_id: 'gal-1',
      description: 'Second photographer fee for wedding',
    });
    assert(expenseTx.type === BusinessTransactionType.EXPENSE, 'Expense transaction created');
    assert(expenseTx.amount === 600.0, 'Expense amount is 600');

    // Invalid negative amount rejection
    let negativeRejected = false;
    try {
      await txService.createTransaction('studio-1', {
        type: BusinessTransactionType.INCOME,
        category: 'Invalid',
        amount: -100,
        date: new Date(),
      });
    } catch (err: any) {
      negativeRejected = err.message.includes('positive');
    }
    assert(negativeRejected, 'Negative transaction amount strictly rejected');

    // Invalid zero amount rejection
    let zeroRejected = false;
    try {
      await txService.createTransaction('studio-1', {
        type: BusinessTransactionType.INCOME,
        category: 'Invalid',
        amount: 0,
        date: new Date(),
      });
    } catch (err: any) {
      zeroRejected = err.message.includes('positive');
    }
    assert(zeroRejected, 'Zero transaction amount strictly rejected');

    // Missing category rejection
    let missingCategoryRejected = false;
    try {
      await txService.createTransaction('studio-1', {
        type: BusinessTransactionType.INCOME,
        category: '',
        amount: 500,
        date: new Date(),
      });
    } catch (err: any) {
      missingCategoryRejected = err.message.toLowerCase().includes('category');
    }
    assert(missingCategoryRejected, 'Empty category strictly rejected');

    // Missing date rejection
    let missingDateRejected = false;
    try {
      await txService.createTransaction('studio-1', {
        type: BusinessTransactionType.INCOME,
        category: 'Test',
        amount: 500,
        date: undefined as any,
      });
    } catch (err: any) {
      missingDateRejected = err.message.toLowerCase().includes('date');
    }
    assert(missingDateRejected, 'Missing transaction date strictly rejected');

    // Foreign currency handling / normalized uppercase
    const eurTx = await txService.createTransaction('studio-1', {
      type: BusinessTransactionType.INCOME,
      category: 'Commercial Shoot',
      amount: 1200.0,
      currency: 'eur',
      date: new Date('2026-07-01T00:00:00Z'),
    });
    assert(eurTx.currency === 'EUR', 'Currency normalized to uppercase EUR');
  }

  // -------------------------------------------------------------
  // GROUP 2: MULTI-TENANT SCOPING & IDOR DEFENSES
  // -------------------------------------------------------------
  console.log('\n--- GROUP 2: Multi-Tenant Scoping & Strict IDOR Defenses ---');
  {
    // Studio 2 cannot create transaction linking Studio 1's client
    let foreignClientBlocked = false;
    try {
      await txService.createTransaction('studio-2', {
        type: BusinessTransactionType.INCOME,
        category: 'Unauthorized Client Link',
        amount: 1000,
        date: new Date(),
        client_id: 'client-1', // Belongs to studio-1
      });
    } catch (err: any) {
      foreignClientBlocked = err.message.includes('Client not found');
    }
    assert(foreignClientBlocked, 'IDOR Defense: Studio cannot link clients belonging to other studios');

    // Studio 2 cannot create transaction linking Studio 1's gallery
    let foreignGalleryBlocked = false;
    try {
      await txService.createTransaction('studio-2', {
        type: BusinessTransactionType.INCOME,
        category: 'Unauthorized Gallery Link',
        amount: 1000,
        date: new Date(),
        gallery_id: 'gal-1', // Belongs to studio-1
      });
    } catch (err: any) {
      foreignGalleryBlocked = err.message.includes('Gallery not found');
    }
    assert(foreignGalleryBlocked, 'IDOR Defense: Studio cannot link galleries belonging to other studios');

    // Studio 2 cannot fetch Studio 1's transaction
    const studio1Tx = (await txService.listTransactions('studio-1')).transactions[0];
    let crossStudioFetchBlocked = false;
    try {
      await txService.getTransaction('studio-2', studio1Tx.id);
    } catch (err: any) {
      crossStudioFetchBlocked = err.message.includes('not found');
    }
    assert(crossStudioFetchBlocked, 'IDOR Defense: Studio 2 cannot retrieve Studio 1 transaction details');

    // Studio 2 cannot update Studio 1's transaction
    let crossStudioUpdateBlocked = false;
    try {
      await txService.updateTransaction('studio-2', studio1Tx.id, {
        description: 'Malicious modification',
      });
    } catch (err: any) {
      crossStudioUpdateBlocked = err.message.includes('not found');
    }
    assert(crossStudioUpdateBlocked, 'IDOR Defense: Studio 2 cannot update Studio 1 transactions');

    // Studio 2 cannot void Studio 1's transaction
    let crossStudioVoidBlocked = false;
    try {
      await txService.voidTransaction('studio-2', studio1Tx.id, 'Fraudulent void attempt', 'user-2');
    } catch (err: any) {
      crossStudioVoidBlocked = err.message.includes('not found');
    }
    assert(crossStudioVoidBlocked, 'IDOR Defense: Studio 2 cannot void Studio 1 transactions');

    // Studio 2 list query returns zero Studio 1 transactions
    const studio2Transactions = await txService.listTransactions('studio-2');
    assert(studio2Transactions.transactions.length === 0, 'Tenant Isolation: Studio 2 sees 0 transactions from Studio 1');
  }

  // -------------------------------------------------------------
  // GROUP 3: FINANCIAL MUTATIONS, SOFT-DELETE & VOIDING AUDIT TRAIL
  // -------------------------------------------------------------
  console.log('\n--- GROUP 3: Financial Mutations, Soft-Delete & Voiding Audit Trail ---');
  {
    // Create a temporary transaction to void
    const txToVoid = await txService.createTransaction('studio-1', {
      type: BusinessTransactionType.INCOME,
      category: 'Mistaken Entry Package',
      amount: 999.0,
      date: new Date('2026-07-10T00:00:00Z'),
      description: 'Entered by error',
    });

    // Void transaction without reason is rejected
    let emptyReasonRejected = false;
    try {
      await txService.voidTransaction('studio-1', txToVoid.id, '', 'user-1');
    } catch (err: any) {
      emptyReasonRejected = err.message.includes('Void reason');
    }
    assert(emptyReasonRejected, 'Voiding requires a mandatory non-empty reason');

    // Successfully void transaction with audit trail
    const voidedTx = await txService.voidTransaction('studio-1', txToVoid.id, 'Duplicate invoice created in error', 'user-admin-1');
    assert(voidedTx.is_void === true, 'Transaction marked as void');
    assert(voidedTx.void_reason === 'Duplicate invoice created in error', 'Void reason recorded');
    assert(Boolean(voidedTx.voided_at), 'Void timestamp recorded');

    // Double voiding is rejected
    let doubleVoidRejected = false;
    try {
      await txService.voidTransaction('studio-1', txToVoid.id, 'Second void attempt', 'user-1');
    } catch (err: any) {
      doubleVoidRejected = err.message.includes('already voided');
    }
    assert(doubleVoidRejected, 'Cannot void an already voided transaction');

    // Updating a voided transaction is rejected
    let updateVoidRejected = false;
    try {
      await txService.updateTransaction('studio-1', txToVoid.id, {
        amount: 500,
      });
    } catch (err: any) {
      updateVoidRejected = err.message.includes('Cannot modify a voided');
    }
    assert(updateVoidRejected, 'Cannot modify voided transactions');

    // Immutable Audit Log Verification
    const logs = await txService.getAuditLogs('studio-1', txToVoid.id);
    assert(logs.length >= 2, `Audit trail recorded creation and voiding (${logs.length} entries)`);
    assert(logs.some((l) => l.action === 'VOID'), 'VOID action exists in audit log');
    assert(logs.some((l) => l.action === 'CREATE'), 'CREATE action exists in audit log');
  }

  // -------------------------------------------------------------
  // GROUP 4: ZERO FAKE FINANCIAL DATA VERIFICATION
  // -------------------------------------------------------------
  console.log('\n--- GROUP 4: Zero Fake Financial Data Verification ---');
  {
    // Studio with no transactions should return ZERO financial metrics
    const emptyOverview = await aggService.getBusinessOverview('studio-empty');
    assert(emptyOverview.has_financial_data === false, 'has_financial_data is false for empty studio');
    assert(emptyOverview.total_revenue === 0, 'Total revenue is strictly 0.00');
    assert(emptyOverview.total_expenses === 0, 'Total expenses is strictly 0.00');
    assert(emptyOverview.net_profit === 0, 'Net profit is strictly 0.00');
    assert(emptyOverview.profit_margin === 0, 'Profit margin is strictly 0%');
    assert(emptyOverview.total_transactions_count === 0, 'Transaction count is 0');
    assert(emptyOverview.average_order_value === 0, 'AOV is 0.00');

    // Profitability on empty studio
    const emptyProfitability = await aggService.getProfitabilityAnalysis('studio-empty');
    assert(emptyProfitability.has_financial_data === false, 'Profitability has_financial_data is false');
    assert(emptyProfitability.revenue_breakdown.length === 0, 'Empty revenue breakdown');
    assert(emptyProfitability.expense_breakdown.length === 0, 'Empty expense breakdown');

    // Funnel on empty studio
    const emptyFunnel = await aggService.getGalleryCommercialFunnel('studio-empty');
    assert(emptyFunnel.total_revenue === 0, 'Funnel total revenue is 0');
    assert(emptyFunnel.monetized_galleries_count === 0, 'Monetized galleries count is 0');

    // Services breakdown on empty studio
    const emptyServices = await aggService.getServicePerformance('studio-empty');
    assert(emptyServices.services.length === 0, 'Service breakdown has 0 entries');
  }

  // Populate realistic multi-month financial records for Studio 1
  // Jan 2026: Revenue 4000, Expense 1000 => Net 3000
  // Feb 2026: Revenue 4500, Expense 1200 => Net 3300
  // Mar 2026: Revenue 5000, Expense 1100 => Net 3900
  // Apr 2026: Revenue 5500, Expense 1500 => Net 4000
  // May 2026: Revenue 6000, Expense 1400 => Net 4600
  // Jun 2026: Revenue 7000, Expense 1800 => Net 5200 (includes earlier 3500 wedding)
  // Jul 2026: Revenue 6500, Expense 1600 => Net 4900
  // Aug 2026: Revenue 8000, Expense 2000 => Net 6000
  await txService.createTransaction('studio-1', {
    type: BusinessTransactionType.INCOME,
    category: 'Wedding Photography Package',
    amount: 3500.0,
    date: new Date('2026-06-20T00:00:00Z'),
    client_id: 'client-1',
    gallery_id: 'gal-1',
    service_type: 'Wedding',
  });
  await txService.createTransaction('studio-1', {
    type: BusinessTransactionType.EXPENSE,
    category: 'Equipment Rental',
    amount: 1200.0,
    date: new Date('2026-06-22T00:00:00Z'),
  });

  // Jan - May history
  const monthsData = [
    { m: '2026-01-15', rev: 4000, exp: 1000, cat: 'Portrait Session', serv: 'Portrait' },
    { m: '2026-02-15', rev: 4500, exp: 1200, cat: 'Commercial Shoot', serv: 'Commercial' },
    { m: '2026-03-15', rev: 5000, exp: 1100, cat: 'Wedding Photography Package', serv: 'Wedding' },
    { m: '2026-04-15', rev: 5500, exp: 1500, cat: 'Corporate Event', serv: 'Event' },
    { m: '2026-05-15', rev: 6000, exp: 1400, cat: 'Wedding Photography Package', serv: 'Wedding' },
    { m: '2026-07-15', rev: 5300, exp: 1600, cat: 'Corporate Event', serv: 'Event', client: 'client-2', gal: 'gal-2' },
    { m: '2026-08-15', rev: 8000, exp: 2000, cat: 'Wedding Photography Package', serv: 'Wedding', client: 'client-1', gal: 'gal-3' },
  ];

  for (const item of monthsData) {
    await txService.createTransaction('studio-1', {
      type: BusinessTransactionType.INCOME,
      category: item.cat,
      amount: item.rev,
      date: new Date(`${item.m}T00:00:00Z`),
      client_id: item.client || 'client-1',
      gallery_id: item.gal || undefined,
      service_type: item.serv,
    });
    await txService.createTransaction('studio-1', {
      type: BusinessTransactionType.EXPENSE,
      category: 'Operating Supplies',
      amount: item.exp,
      date: new Date(`${item.m}T00:00:00Z`),
    });
  }

  // -------------------------------------------------------------
  // GROUP 5: REVENUE, EXPENSE, & PROFIT AGGREGATIONS
  // -------------------------------------------------------------
  console.log('\n--- GROUP 5: Revenue, Expense, & Profit Aggregations ---');
  {
    const overview = await aggService.getBusinessOverview('studio-1');
    assert(overview.has_financial_data === true, 'has_financial_data is true for active studio');
    assert(overview.total_revenue > 0, `Total revenue aggregated correctly: $${overview.total_revenue}`);
    assert(overview.total_expenses > 0, `Total expenses aggregated correctly: $${overview.total_expenses}`);
    assert(overview.net_profit === overview.total_revenue - overview.total_expenses, `Net profit equation matches: $${overview.net_profit}`);
    assert(overview.profit_margin > 0 && overview.profit_margin < 100, `Profit margin calculated: ${overview.profit_margin}%`);
    assert(overview.average_order_value > 0, `Average order value calculated: $${overview.average_order_value}`);
    assert(overview.recent_transactions.length > 0, 'Recent transactions list populated');

    // Verify voided transactions are EXCLUDED from financial totals
    const voidedInDb = transactions.filter((t) => t.studio_id === 'studio-1' && t.is_void);
    assert(voidedInDb.length > 0, 'Voided transactions exist in database');
    const sumActiveIncome = transactions
      .filter((t) => t.studio_id === 'studio-1' && !t.is_void && t.type === 'INCOME')
      .reduce((sum, t) => sum + t.amount, 0);
    assert(overview.total_revenue === sumActiveIncome, `Active revenue matches DB without voided items ($${overview.total_revenue})`);
  }

  // -------------------------------------------------------------
  // GROUP 6: MOM GROWTH & TIME TREND MODELING
  // -------------------------------------------------------------
  console.log('\n--- GROUP 6: MoM Growth & Time Trend Modeling ---');
  {
    const overview = await aggService.getBusinessOverview('studio-1');
    assert(typeof overview.revenue_growth_mom === 'number', `MoM revenue growth calculated: ${overview.revenue_growth_mom}%`);
    assert(typeof overview.profit_growth_mom === 'number', `MoM profit growth calculated: ${overview.profit_growth_mom}%`);
    assert(Array.isArray(overview.monthly_trends), 'Monthly trend array returned');
    assert(overview.monthly_trends.length >= 6, `Monthly trend covers ${overview.monthly_trends.length} periods`);

    const latestMonth = overview.monthly_trends[overview.monthly_trends.length - 1];
    assert(latestMonth.revenue > 0, `Latest month revenue is positive: $${latestMonth.revenue}`);
    assert(latestMonth.net_profit > 0, `Latest month profit is positive: $${latestMonth.net_profit}`);
  }

  // -------------------------------------------------------------
  // GROUP 7: PACKAGE & SERVICE CATEGORY PERFORMANCE
  // -------------------------------------------------------------
  console.log('\n--- GROUP 7: Package & Service Category Performance ---');
  {
    const services = await aggService.getServicePerformance('studio-1');
    assert(services.services.length > 0, `Identified ${services.services.length} distinct service categories`);

    const weddingService = services.services.find((s) => s.service_type === 'Wedding');
    assert(Boolean(weddingService), 'Wedding service categorized');
    assert(weddingService!.revenue >= 10000, `Wedding total revenue tracked: $${weddingService!.revenue}`);
    assert(weddingService!.job_count >= 3, `Wedding job count tracked: ${weddingService!.job_count}`);
    assert(weddingService!.net_profit > 0, `Wedding net profit tracked: $${weddingService!.net_profit}`);
    assert(weddingService!.profit_margin > 0, `Wedding profit margin calculated: ${weddingService!.profit_margin}%`);
    assert(weddingService!.average_revenue_per_job > 0, `Wedding ARPJ tracked: $${weddingService!.average_revenue_per_job}`);

    // Profitability breakdowns
    const prof = await aggService.getProfitabilityAnalysis('studio-1');
    assert(prof.revenue_breakdown.length > 0, 'Revenue categories broken down');
    assert(prof.expense_breakdown.length > 0, 'Expense categories broken down');
    const totalRevPct = prof.revenue_breakdown.reduce((s, r) => s + r.percentage, 0);
    assert(Math.round(totalRevPct) === 100, `Revenue percentages sum to 100% (sum=${totalRevPct})`);
    const totalExpPct = prof.expense_breakdown.reduce((s, e) => s + e.percentage, 0);
    assert(Math.round(totalExpPct) === 100, `Expense percentages sum to 100% (sum=${totalExpPct})`);
  }

  // -------------------------------------------------------------
  // GROUP 8: GALLERY-TO-BUSINESS FUNNEL LINKING
  // -------------------------------------------------------------
  console.log('\n--- GROUP 8: Gallery-to-Business Funnel Linking ---');
  {
    const funnel = await aggService.getGalleryCommercialFunnel('studio-1');
    assert(funnel.total_galleries >= 3, `Total galleries tracked: ${funnel.total_galleries}`);
    assert(funnel.monetized_galleries_count >= 2, `Monetized galleries tracked: ${funnel.monetized_galleries_count}`);
    assert(funnel.monetization_rate > 0, `Monetization rate calculated: ${funnel.monetization_rate}%`);
    assert(funnel.average_revenue_per_gallery > 0, `Average revenue per gallery: $${funnel.average_revenue_per_gallery}`);
    assert(funnel.average_turnaround_days >= 0, `Average turnaround tracked: ${funnel.average_turnaround_days} days`);
    assert(Array.isArray(funnel.galleries), 'Gallery breakdown list returned');

    const monGal = funnel.galleries.find((g) => g.gallery_id === 'gal-1');
    assert(Boolean(monGal), 'Gallery 1 linked in commercial funnel');
    assert(monGal!.revenue > 0, `Gallery 1 revenue tracked: $${monGal!.revenue}`);
    assert(monGal!.net_profit > 0, `Gallery 1 profit tracked: $${monGal!.net_profit}`);
    assert(monGal!.turnaround_days === 5, `Turnaround calculated: ${monGal!.turnaround_days} days`);
  }

  // -------------------------------------------------------------
  // GROUP 9: CLIENT LIFETIME VALUE & REVENUE SUMMARIES
  // -------------------------------------------------------------
  console.log('\n--- GROUP 9: Client Lifetime Value & Revenue Summaries ---');
  {
    const clientSummaries = await aggService.getClientRevenueSummaries('studio-1');
    assert(clientSummaries.length >= 2, `Client summaries populated (${clientSummaries.length} clients)`);

    const olivia = clientSummaries.find((c) => c.client_id === 'client-1');
    assert(Boolean(olivia), 'Client Olivia found in summary');
    assert(olivia!.total_bookings >= 2, `Olivia bookings count: ${olivia!.total_bookings}`);
    assert(olivia!.net_revenue > 0, `Olivia net revenue: $${olivia!.net_revenue}`);
    assert(olivia!.average_order_value > 0, `Olivia AOV: $${olivia!.average_order_value}`);
    assert(olivia!.is_repeat_client === true, 'Olivia identified as repeat client');

    const marcus = clientSummaries.find((c) => c.client_id === 'client-2');
    assert(Boolean(marcus), 'Client Marcus found in summary');
    assert(marcus!.total_bookings === 1, 'Marcus bookings count: 1');
    assert(marcus!.is_repeat_client === false, 'Marcus is not repeat client');
  }

  // -------------------------------------------------------------
  // GROUP 10: BUSINESS GOAL LIFECYCLE & AUTO-PROGRESS
  // -------------------------------------------------------------
  console.log('\n--- GROUP 10: Business Goal Lifecycle & Auto-Progress ---');
  {
    // Create Revenue Target Goal
    const goal1 = await goalService.createGoal('studio-1', {
      title: 'Q3 2026 Revenue Target',
      metric_type: BusinessGoalMetricType.REVENUE,
      period_type: BusinessGoalPeriodType.QUARTERLY,
      target_value: 20000.0,
      start_date: new Date('2026-07-01T00:00:00Z'),
      end_date: new Date('2026-09-30T23:59:59Z'),
      currency: 'USD',
    });

    assert(Boolean(goal1.id), 'Business goal created');
    assert(goal1.target_value === 20000.0, 'Target value is $20,000');
    assert(goal1.metric_type === BusinessGoalMetricType.REVENUE, 'Metric type is REVENUE');

    // List and recalculate progress against recorded transactions
    const goalsList = await goalService.listGoals('studio-1');
    assert(goalsList.length >= 1, 'Goal returned in list');

    const recalculated = goalsList.find((g) => g.id === goal1.id);
    assert(Boolean(recalculated), 'Recalculated goal found');
    assert(recalculated!.current_value > 0, `Actual current value tracked: $${recalculated!.current_value}`);
    assert(recalculated!.progress_percentage > 0, `Progress percentage calculated: ${recalculated!.progress_percentage}%`);

    // Create Booking Count Goal
    const bookingGoal = await goalService.createGoal('studio-1', {
      title: 'Annual 10 Bookings Target',
      metric_type: BusinessGoalMetricType.BOOKINGS_COUNT,
      period_type: BusinessGoalPeriodType.YEARLY,
      target_value: 10,
      start_date: new Date('2026-01-01T00:00:00Z'),
      end_date: new Date('2026-12-31T23:59:59Z'),
    });
    const bookingGoalsList = await goalService.listGoals('studio-1');
    const recBooking = bookingGoalsList.find((g) => g.id === bookingGoal.id);
    assert(recBooking!.current_value >= 5, `Booking count actual progress: ${recBooking!.current_value} jobs`);

    // Update Goal Target
    const updatedGoal = await goalService.updateGoal('studio-1', goal1.id, {
      target_value: 25000.0,
    });
    assert(updatedGoal.target_value === 25000.0, 'Goal target updated to $25,000');

    // Delete Goal
    const deleteRes = await goalService.deleteGoal('studio-1', bookingGoal.id);
    assert(deleteRes.success === true, 'Goal deleted successfully');
  }

  // -------------------------------------------------------------
  // GROUP 11: DETERMINISTIC STATISTICAL FORECASTING
  // -------------------------------------------------------------
  console.log('\n--- GROUP 11: Deterministic Statistical Forecasting ---');
  {
    // Forecast with sufficient historical periods (Studio 1 has 8 months)
    const revForecast = await forecastService.generateForecast(
      'studio-1',
      BusinessForecastMetric.REVENUE,
      BusinessForecastPeriod.NEXT_MONTH
    );

    assert(Boolean(revForecast), 'Forecast generated');
    assert(revForecast.projected_value > 0, `Projected revenue calculated: $${revForecast.projected_value}`);
    assert(revForecast.lower_bound < revForecast.projected_value, `Lower bound ($${revForecast.lower_bound}) < Projected`);
    assert(revForecast.upper_bound > revForecast.projected_value, `Upper bound ($${revForecast.upper_bound}) > Projected`);
    assert(revForecast.confidence_score >= 0.5 && revForecast.confidence_score <= 1.0, `Confidence score bounded: ${revForecast.confidence_score}`);
    assert(revForecast.confidence_level === BusinessForecastConfidence.HIGH || revForecast.confidence_level === BusinessForecastConfidence.MEDIUM, `Confidence level: ${revForecast.confidence_level}`);
    assert(revForecast.model_used.includes('Weighted Linear Trend') || revForecast.model_used.includes('Moving Average'), `Model: ${revForecast.model_used}`);

    // Forecast for Profit
    const profitForecast = await forecastService.generateForecast(
      'studio-1',
      BusinessForecastMetric.NET_PROFIT,
      BusinessForecastPeriod.NEXT_QUARTER
    );
    assert(profitForecast.projected_value > 0, `Projected quarterly profit: $${profitForecast.projected_value}`);

    // Insufficient data handling (Studio Empty has 0 periods)
    const emptyForecast = await forecastService.generateForecast(
      'studio-empty',
      BusinessForecastMetric.REVENUE,
      BusinessForecastPeriod.NEXT_MONTH
    );
    assert(emptyForecast.confidence_level === BusinessForecastConfidence.LOW, 'Zero history yields LOW confidence');
    assert(emptyForecast.confidence_score === 0, 'Zero history yields 0 confidence score');
    assert(emptyForecast.model_used.includes('Insufficient data'), 'Indicates insufficient data');
  }

  // -------------------------------------------------------------
  // GROUP 12: ANOMALY DETECTION & INSIGHTS LIFECYCLE
  // -------------------------------------------------------------
  console.log('\n--- GROUP 12: Anomaly Detection & Insights Lifecycle ---');
  {
    // Generate Insights from recorded data
    const newInsights = await insightService.generateInsights('studio-1');
    assert(Array.isArray(newInsights), 'Insight scan completed');
    assert(newInsights.length >= 1, `Generated ${newInsights.length} actionable insights`);

    const activeInsights = await insightService.listInsights('studio-1');
    assert(activeInsights.length >= 1, 'Active insights retrieved');
    const firstInsight = activeInsights[0];

    // Acknowledge Insight
    const acked = await insightService.updateInsightStatus('studio-1', firstInsight.id, BusinessInsightStatus.ACKNOWLEDGED);
    assert(acked.status === BusinessInsightStatus.ACKNOWLEDGED, 'Insight status updated to ACKNOWLEDGED');

    // Resolve Insight
    const resolved = await insightService.updateInsightStatus('studio-1', firstInsight.id, BusinessInsightStatus.RESOLVED);
    assert(resolved.status === BusinessInsightStatus.RESOLVED, 'Insight status updated to RESOLVED');

    // Dismiss Insight
    const dismissed = await insightService.updateInsightStatus('studio-1', firstInsight.id, BusinessInsightStatus.DISMISSED);
    assert(dismissed.status === BusinessInsightStatus.DISMISSED, 'Insight status updated to DISMISSED');

    // IDOR on Insights: Studio 2 cannot modify Studio 1 insights
    let idorInsightBlocked = false;
    try {
      await insightService.updateInsightStatus('studio-2', firstInsight.id, BusinessInsightStatus.RESOLVED);
    } catch (err: any) {
      idorInsightBlocked = err.message.includes('not found');
    }
    assert(idorInsightBlocked, 'IDOR Defense: Studio 2 cannot modify Studio 1 insights');
  }

  // -------------------------------------------------------------
  // GROUP 13: FORMULA-SAFE CSV EXPORT & INJECTION PROTECTIONS
  // -------------------------------------------------------------
  console.log('\n--- GROUP 13: Formula-Safe CSV Export & Injection Protections ---');
  {
    // Create malicious transactions with injection payloads
    await txService.createTransaction('studio-1', {
      type: BusinessTransactionType.INCOME,
      category: '=cmd|’ /C calc’!A0', // Excel command injection
      amount: 100.0,
      date: new Date('2026-08-01T00:00:00Z'),
      description: '+100*200 - Dangerous formula injection',
      notes: '@SUM(1,2,3) malicious formula',
    });
    await txService.createTransaction('studio-1', {
      type: BusinessTransactionType.INCOME,
      category: '@SUM(1,2,3) malicious formula',
      amount: 50.0,
      date: new Date('2026-08-02T00:00:00Z'),
      description: 'Another injection attack vector',
    });

    const csvData = await txService.exportTransactionsCsv('studio-1');
    assert(typeof csvData === 'string', 'CSV generated as string');
    assert(csvData.includes('Transaction ID,Date,Type,Category,Amount'), 'CSV contains headers');

    // Verify sanitization: leading =, +, -, @, \t, \r must be prefixed with single quote '
    assert(csvData.includes("''=cmd") || csvData.includes("'\=cmd") || csvData.includes("'=cmd"), 'Formula starting with = sanitized');
    assert(csvData.includes("'+100"), 'Formula starting with + sanitized');
    assert(csvData.includes("'@SUM"), 'Formula starting with @ sanitized');

    // Format verification
    const lines = csvData.trim().split('\n');
    assert(lines.length >= 5, `CSV has ${lines.length} lines`);
  }

  // -------------------------------------------------------------
  // GROUP 14: SUPER ADMIN STUDIO BUSINESS TELEMETRY
  // -------------------------------------------------------------
  console.log('\n--- GROUP 14: Super Admin Studio Business Telemetry ---');
  {
    const adminOverview = await adminService.getAdminBusinessOverview();
    assert(adminOverview.total_studios_count >= 2, `Admin total studios: ${adminOverview.total_studios_count}`);
    assert(adminOverview.studios_with_business_data >= 1, `Monetizing studios tracked: ${adminOverview.studios_with_business_data}`);
    assert(adminOverview.platform_gross_studio_revenue > 0, `Platform gross studio revenue: $${adminOverview.platform_gross_studio_revenue}`);
    assert(adminOverview.platform_net_studio_profit > 0, `Platform net studio profit: $${adminOverview.platform_net_studio_profit}`);
    assert(adminOverview.platform_average_margin > 0, `Platform avg margin: ${adminOverview.platform_average_margin}%`);
    assert(Array.isArray(adminOverview.top_earning_studios), 'Top earning studios list returned');
    assert(adminOverview.top_earning_studios.length >= 1, 'Top earner identified');

    const topEarner = adminOverview.top_earning_studios[0];
    assert(topEarner.studio_id === 'studio-1', 'Studio 1 is top earner');
    assert(topEarner.total_revenue > 0, `Top earner revenue: $${topEarner.total_revenue}`);
  }

  // -------------------------------------------------------------
  // COPILOT TOOL INTEGRATION VERIFICATION
  // -------------------------------------------------------------
  console.log('\n--- BONUS: Copilot Business Tool Registry & Intent Resolution ---');
  {
    const copilotRegistry = new CopilotToolRegistry(db as any);
    const tools = copilotRegistry.getAvailableTools();
    assert(tools.some((t) => t.name === 'getBusinessOverview'), 'Copilot getBusinessOverview tool registered');
    assert(tools.some((t) => t.name === 'getRevenueSummary'), 'Copilot getRevenueSummary tool registered');
    assert(tools.some((t) => t.name === 'getProfitabilitySummary'), 'Copilot getProfitabilitySummary tool registered');
    assert(tools.some((t) => t.name === 'getBusinessForecast'), 'Copilot getBusinessForecast tool registered');
    assert(tools.some((t) => t.name === 'getBusinessGoals'), 'Copilot getBusinessGoals tool registered');
    assert(tools.some((t) => t.name === 'getBusinessInsights'), 'Copilot getBusinessInsights tool registered');

    // Execute Copilot Business Overview tool
    const copilotResult = await copilotRegistry.executeTool('getBusinessOverview', {}, { studioId: 'studio-1', userId: 'user-1' });
    assert(copilotResult.total_revenue > 0, 'Copilot tool executed successfully with real studio financial data');

    // Test Copilot LLM provider prompt handling with business intent
    const copilotProvider = new DeterministicCopilotProvider(copilotRegistry);
    const promptResponse = await copilotProvider.generateResponse('What is our total revenue and profit this month?', {
      studioId: 'studio-1',
      userId: 'user-1',
    });
    assert(promptResponse.suggestedActions.length > 0, 'Copilot suggested actions returned');
  }

  // =============================================================
  // SUMMARY
  // =============================================================
  console.log('\n=============================================================');
  console.log(`🏁 PHASE 18 TEST RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log('=============================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runPhase18Tests().catch((err) => {
  console.error('Unhandled test suite error:', err);
  process.exit(1);
});
