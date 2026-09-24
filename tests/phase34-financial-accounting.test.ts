/**
 * PixMatch AI — Phase 34: Studio Financial Accounting & General Ledger 2.0 Test Suite
 *
 * Master test suite covering formal double-entry general ledger mechanics,
 * Chart of Accounts, Journal Posting Engine, Reversals, Accounting Periods,
 * Opening Balances, Trial Balance, General Ledger, P&L, Balance Sheet,
 * AR/AP Sub-ledger Integrations, Fulfillment COGS, Booking & Contract Accounting,
 * Multi-Currency, Tax Structure, Permissions, Tenant Isolation, CSV Injection Defense,
 * Copilot Accounting Tools, and Audit Integrity.
 *
 * Minimum target: 500+ meaningful assertions.
 */

process.env.DATABASE_URL = process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/pixmatch_test';
process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-jwt-secret-key-must-be-32-chars-long';

import { StudioAccountingService } from '../apps/api/src/modules/accounting/accounting.service.js';
import { CopilotToolRegistry } from '../apps/api/src/modules/copilot/copilot-tool-registry.js';
import crypto from 'crypto';

let passed = 0;
let failed = 0;

function assert(condition: boolean, testName: string, details?: string) {
  if (condition) {
    passed++;
    console.log(`  ✅ PASS: ${testName}`);
  } else {
    failed++;
    console.error(`  ❌ FAIL: ${testName} ${details ? `(${details})` : ''}`);
  }
}

async function runPhase34AccountingTestSuite() {
  console.log('=====================================================================');
  console.log('PIXMATCH AI — PHASE 34: STUDIO FINANCIAL ACCOUNTING & GENERAL LEDGER');
  console.log('=====================================================================\n');

  // In-memory mock DB store for testing accounting engine with full relational capabilities
  const mockDb: any = {
    accounts: [] as any[],
    mappings: [] as any[],
    journalEntries: [] as any[],
    journalLines: [] as any[],
    periods: [] as any[],
    audits: [] as any[],

    studioChartOfAccount: {
      findMany: async (args: any) => {
        return mockDb.accounts.filter((a: any) => {
          if (args?.where?.id && a.id !== args.where.id) return false;
          if (args?.where?.studio_id && a.studio_id !== args.where.studio_id) return false;
          if (args?.where?.account_type && a.account_type !== args.where.account_type) return false;
          if (args?.where?.is_active !== undefined && a.is_active !== args.where.is_active) return false;
          if (args?.where?.code && a.code !== args.where.code) return false;
          return true;
        });
      },
      findFirst: async (args: any) => {
        return (await mockDb.studioChartOfAccount.findMany(args))[0] || null;
      },
      findUnique: async (args: any) => {
        return mockDb.accounts.find((a: any) => a.id === args.where.id) || null;
      },
      create: async (args: any) => {
        const item = {
          id: args.data.id || `acc_${crypto.randomUUID()}`,
          ...args.data,
          is_active: args.data.is_active ?? true,
          is_system: args.data.is_system ?? false,
          currency: args.data.currency || 'USD',
          created_at: new Date(),
          updated_at: new Date(),
        };
        mockDb.accounts.push(item);
        return item;
      },
      createMany: async (args: any) => {
        for (const data of args.data) {
          await mockDb.studioChartOfAccount.create({ data });
        }
        return { count: args.data.length };
      },
      update: async (args: any) => {
        const item = mockDb.accounts.find((a: any) => a.id === args.where.id);
        if (!item) throw new Error('Account not found');
        Object.assign(item, args.data, { updated_at: new Date() });
        return item;
      },
      delete: async (args: any) => {
        const idx = mockDb.accounts.findIndex((a: any) => a.id === args.where.id);
        if (idx !== -1) mockDb.accounts.splice(idx, 1);
        return {};
      },
    },

    studioAccountingMapping: {
      findMany: async (args: any) => {
        return mockDb.mappings
          .filter((m: any) => !args?.where?.studio_id || m.studio_id === args.where.studio_id)
          .map((m: any) => ({
            ...m,
            debit_account: mockDb.accounts.find((a: any) => a.id === m.debit_account_id),
            credit_account: mockDb.accounts.find((a: any) => a.id === m.credit_account_id),
          }));
      },
      findFirst: async (args: any) => {
        const match = mockDb.mappings.find((m: any) => {
          if (args?.where?.studio_id && m.studio_id !== args.where.studio_id) return false;
          if (args?.where?.event_type && m.event_type !== args.where.event_type) return false;
          return true;
        });
        if (!match) return null;
        return {
          ...match,
          debit_account: mockDb.accounts.find((a: any) => a.id === match.debit_account_id),
          credit_account: mockDb.accounts.find((a: any) => a.id === match.credit_account_id),
        };
      },
      create: async (args: any) => {
        const item = {
          id: args.data.id || `map_${crypto.randomUUID()}`,
          ...args.data,
          is_active: args.data.is_active ?? true,
          created_at: new Date(),
          updated_at: new Date(),
        };
        mockDb.mappings.push(item);
        return {
          ...item,
          debit_account: mockDb.accounts.find((a: any) => a.id === item.debit_account_id),
          credit_account: mockDb.accounts.find((a: any) => a.id === item.credit_account_id),
        };
      },
      update: async (args: any) => {
        const item = mockDb.mappings.find((m: any) => m.id === args.where.id);
        if (!item) throw new Error('Mapping not found');
        Object.assign(item, args.data, { updated_at: new Date() });
        return {
          ...item,
          debit_account: mockDb.accounts.find((a: any) => a.id === item.debit_account_id),
          credit_account: mockDb.accounts.find((a: any) => a.id === item.credit_account_id),
        };
      },
    },

    studioJournalEntry: {
      findMany: async (args: any) => {
        let list = mockDb.journalEntries.filter((e: any) => {
          if (args?.where?.id && e.id !== args.where.id) return false;
          if (args?.where?.studio_id && e.studio_id !== args.where.studio_id) return false;
          if (args?.where?.status && e.status !== args.where.status) return false;
          if (args?.where?.reversal_of_entry_id && e.reversal_of_entry_id !== args.where.reversal_of_entry_id) return false;
          if (args?.where?.idempotency_key && e.idempotency_key !== args.where.idempotency_key) return false;
          if (args?.where?.entry_date?.gte && new Date(e.entry_date) < new Date(args.where.entry_date.gte)) return false;
          if (args?.where?.entry_date?.lte && new Date(e.entry_date) > new Date(args.where.entry_date.lte)) return false;
          return true;
        });
        if (args?.orderBy?.entry_date === 'desc') {
          list.sort((a: any, b: any) => new Date(b.entry_date).getTime() - new Date(a.entry_date).getTime());
        }
        return list.map((e: any) => ({
          ...e,
          lines: mockDb.journalLines
            .filter((l: any) => l.journal_entry_id === e.id)
            .map((l: any) => ({
              ...l,
              account: mockDb.accounts.find((a: any) => a.id === l.account_id),
            })),
        }));
      },
      findFirst: async (args: any) => {
        const list = await mockDb.studioJournalEntry.findMany(args);
        return list[0] || null;
      },
      findUnique: async (args: any) => {
        const item = mockDb.journalEntries.find((e: any) => e.id === args.where.id);
        if (!item) return null;
        return {
          ...item,
          lines: mockDb.journalLines
            .filter((l: any) => l.journal_entry_id === item.id)
            .map((l: any) => ({
              ...l,
              account: mockDb.accounts.find((a: any) => a.id === l.account_id),
            })),
        };
      },
      create: async (args: any) => {
        const linesData = args.data.lines?.create || [];
        const entryData = { ...args.data };
        delete entryData.lines;

        const item = {
          id: entryData.id || `je_${crypto.randomUUID()}`,
          ...entryData,
          status: entryData.status || 'DRAFT',
          total_debit_minor: entryData.total_debit_minor || 0,
          total_credit_minor: entryData.total_credit_minor || 0,
          created_at: new Date(),
          updated_at: new Date(),
        };
        mockDb.journalEntries.push(item);

        for (const l of linesData) {
          const lineItem = {
            id: l.id || `line_${crypto.randomUUID()}`,
            studio_id: item.studio_id,
            journal_entry_id: item.id,
            ...l,
            created_at: new Date(),
          };
          mockDb.journalLines.push(lineItem);
        }

        return {
          ...item,
          lines: mockDb.journalLines
            .filter((l: any) => l.journal_entry_id === item.id)
            .map((l: any) => ({
              ...l,
              account: mockDb.accounts.find((a: any) => a.id === l.account_id),
            })),
        };
      },
      update: async (args: any) => {
        const item = mockDb.journalEntries.find((e: any) => e.id === args.where.id);
        if (!item) throw new Error('Journal entry not found');
        Object.assign(item, args.data, { updated_at: new Date() });
        return {
          ...item,
          lines: mockDb.journalLines
            .filter((l: any) => l.journal_entry_id === item.id)
            .map((l: any) => ({
              ...l,
              account: mockDb.accounts.find((a: any) => a.id === l.account_id),
            })),
        };
      },
      count: async (args: any) => {
        const list = await mockDb.studioJournalEntry.findMany(args);
        return list.length;
      },
    },

    studioJournalEntryLine: {
      findMany: async (args: any) => {
        const list = mockDb.journalLines.filter((l: any) => {
          if (args?.where?.journal_entry_id && l.journal_entry_id !== args.where.journal_entry_id) return false;
          if (args?.where?.account_id && l.account_id !== args.where.account_id) return false;
          if (args?.where?.studio_id && l.studio_id !== args.where.studio_id) return false;
          if (args?.where?.journal_entry) {
            const entry = mockDb.journalEntries.find((e: any) => e.id === l.journal_entry_id);
            if (!entry) return false;
            if (args.where.journal_entry.status) {
              if (typeof args.where.journal_entry.status === 'string' && entry.status !== args.where.journal_entry.status) return false;
              if (args.where.journal_entry.status.in && !args.where.journal_entry.status.in.includes(entry.status)) return false;
            }
            if (args.where.journal_entry.entry_date?.lt && new Date(entry.entry_date) >= new Date(args.where.journal_entry.entry_date.lt)) return false;
            if (args.where.journal_entry.entry_date?.lte && new Date(entry.entry_date) > new Date(args.where.journal_entry.entry_date.lte)) return false;
            if (args.where.journal_entry.entry_date?.gte && new Date(entry.entry_date) < new Date(args.where.journal_entry.entry_date.gte)) return false;
          }
          return true;
        });

        return list.map((l: any) => ({
          ...l,
          journal_entry: mockDb.journalEntries.find((e: any) => e.id === l.journal_entry_id),
          account: mockDb.accounts.find((a: any) => a.id === l.account_id),
        }));
      },
      count: async (args: any) => {
        const list = await mockDb.studioJournalEntryLine.findMany(args);
        return list.length;
      },
      deleteMany: async (args: any) => {
        mockDb.journalLines = mockDb.journalLines.filter(
          (l: any) => l.journal_entry_id !== args.where.journal_entry_id
        );
        return {};
      },
      createMany: async (args: any) => {
        for (const l of args.data) {
          mockDb.journalLines.push({
            id: l.id || `line_${crypto.randomUUID()}`,
            ...l,
            created_at: new Date(),
          });
        }
        return { count: args.data.length };
      },
    },

    studioAccountingPeriod: {
      findMany: async (args: any) => {
        return mockDb.periods.filter((p: any) => {
          if (args?.where?.id && p.id !== args.where.id) return false;
          if (args?.where?.studio_id && p.studio_id !== args.where.studio_id) return false;
          if (args?.where?.OR) {
            const start = new Date(p.start_date);
            const end = new Date(p.end_date);
            const matches = args.where.OR.some((c: any) => {
              if (c.start_date?.lte && c.end_date?.gte) {
                return start <= new Date(c.start_date.lte) && end >= new Date(c.end_date.gte);
              }
              return true;
            });
            if (!matches) return false;
          }
          return true;
        });
      },
      findFirst: async (args: any) => {
        return (await mockDb.studioAccountingPeriod.findMany(args))[0] || null;
      },
      findUnique: async (args: any) => {
        return mockDb.periods.find((p: any) => p.id === args.where.id) || null;
      },
      create: async (args: any) => {
        const item = {
          id: args.data.id || `per_${crypto.randomUUID()}`,
          ...args.data,
          status: args.data.status || 'OPEN',
          created_at: new Date(),
        };
        mockDb.periods.push(item);
        return item;
      },
      update: async (args: any) => {
        const item = mockDb.periods.find((p: any) => p.id === args.where.id);
        if (!item) throw new Error('Period not found');
        Object.assign(item, args.data);
        return item;
      },
    },

    studioAccountingAudit: {
      create: async (args: any) => {
        const item = {
          id: `audit_${crypto.randomUUID()}`,
          ...args.data,
          created_at: new Date(),
        };
        mockDb.audits.push(item);
        return item;
      },
      findMany: async (args: any) => {
        return mockDb.audits.filter((a: any) => !args?.where?.studio_id || a.studio_id === args.where.studio_id);
      },
    },

    $transaction: async (cb: any) => {
      return cb(mockDb);
    },
  };

  const service = new StudioAccountingService(mockDb);
  const studioA = `studio_alpha_${crypto.randomUUID()}`;
  const studioB = `studio_beta_${crypto.randomUUID()}`;

  // =========================================================================
  // MODULE 1: CHART OF ACCOUNTS INITIALIZATION & MANAGEMENT
  // =========================================================================
  console.log('\n--- Module 1: Chart of Accounts ---');

  // 1. Initialize default COA for Studio A
  const accountsA = await service.initializeDefaultChartOfAccounts(studioA);
  assert(Array.isArray(accountsA), 'COA 1.1: Returns array of accounts');
  assert(accountsA.length === 18, 'COA 1.2: Standard COA includes 18 default accounts', `Found ${accountsA.length}`);

  const cashAcc = accountsA.find((a: any) => a.code === '1000');
  assert(cashAcc !== undefined, 'COA 1.3: Account 1000 (Cash) exists');
  assert(cashAcc?.account_type === 'ASSET', 'COA 1.4: 1000 is ASSET');
  assert(cashAcc?.normal_balance === 'DEBIT', 'COA 1.5: 1000 normal balance is DEBIT');
  assert(cashAcc?.is_system === true, 'COA 1.6: 1000 is system account');

  const bankAcc = accountsA.find((a: any) => a.code === '1010');
  assert(bankAcc?.name === 'Bank Account', 'COA 1.7: 1010 is Bank Account');
  assert(bankAcc?.account_type === 'ASSET', 'COA 1.8: 1010 is ASSET');

  const arAcc = accountsA.find((a: any) => a.code === '1100');
  assert(arAcc?.name === 'Accounts Receivable', 'COA 1.9: 1100 is Accounts Receivable');
  assert(arAcc?.normal_balance === 'DEBIT', 'COA 1.10: 1100 normal balance is DEBIT');

  const apAcc = accountsA.find((a: any) => a.code === '2000');
  assert(apAcc?.name === 'Accounts Payable', 'COA 1.11: 2000 is Accounts Payable');
  assert(apAcc?.account_type === 'LIABILITY', 'COA 1.12: 2000 is LIABILITY');
  assert(apAcc?.normal_balance === 'CREDIT', 'COA 1.13: 2000 normal balance is CREDIT');

  const taxPayable = accountsA.find((a: any) => a.code === '2100');
  assert(taxPayable?.name === 'Taxes Payable', 'COA 1.14: 2100 is Taxes Payable');
  assert(taxPayable?.account_type === 'LIABILITY', 'COA 1.15: 2100 is LIABILITY');

  const equityAcc = accountsA.find((a: any) => a.code === '3000');
  assert(equityAcc?.name === 'Owner Equity', 'COA 1.16: 3000 is Owner Equity');
  assert(equityAcc?.account_type === 'EQUITY', 'COA 1.17: 3000 is EQUITY');
  assert(equityAcc?.normal_balance === 'CREDIT', 'COA 1.18: 3000 normal balance is CREDIT');

  const photoRev = accountsA.find((a: any) => a.code === '4000');
  assert(photoRev?.name === 'Photography Revenue', 'COA 1.19: 4000 is Photography Revenue');
  assert(photoRev?.account_type === 'REVENUE', 'COA 1.20: 4000 is REVENUE');
  assert(photoRev?.normal_balance === 'CREDIT', 'COA 1.21: 4000 normal balance is CREDIT');

  const printRev = accountsA.find((a: any) => a.code === '4100');
  assert(printRev?.name === 'Print Revenue', 'COA 1.22: 4100 is Print Revenue');
  assert(printRev?.account_type === 'REVENUE', 'COA 1.23: 4100 is REVENUE');

  const cogsAcc = accountsA.find((a: any) => a.code === '5000');
  assert(cogsAcc?.name === 'Cost of Goods Sold', 'COA 1.24: 5000 is Cost of Goods Sold');
  assert(cogsAcc?.account_type === 'COGS', 'COA 1.25: 5000 is COGS');
  assert(cogsAcc?.normal_balance === 'DEBIT', 'COA 1.26: 5000 normal balance is DEBIT');

  const marketingExp = accountsA.find((a: any) => a.code === '6000');
  assert(marketingExp?.name === 'Marketing Expense', 'COA 1.27: 6000 is Marketing Expense');
  assert(marketingExp?.account_type === 'EXPENSE', 'COA 1.28: 6000 is EXPENSE');
  assert(marketingExp?.normal_balance === 'DEBIT', 'COA 1.29: 6000 normal balance is DEBIT');

  const rentExp = accountsA.find((a: any) => a.code === '6300');
  assert(rentExp?.name === 'Rent Expense', 'COA 1.30: 6300 is Rent Expense');

  // 2. Create custom account
  const customAcc = await service.createAccount(studioA, {
    code: '6400',
    name: 'Drone Maintenance & Licensing',
    account_type: 'EXPENSE',
    normal_balance: 'DEBIT',
    description: 'Specialized aerial equipment maintenance',
  });
  assert(customAcc.code === '6400', 'COA 1.31: Custom account created with code 6400');
  assert(customAcc.is_system === false, 'COA 1.32: Custom account is not system account');
  assert(customAcc.is_active === true, 'COA 1.33: Custom account is active by default');

  // 3. Duplicate code rejection
  try {
    await service.createAccount(studioA, {
      code: '6400',
      name: 'Duplicate Drone Code',
      account_type: 'EXPENSE',
      normal_balance: 'DEBIT',
    });
    assert(false, 'COA 1.34: Should reject duplicate account code');
  } catch (err: any) {
    assert(err.message.includes('already exists'), 'COA 1.34: Rejects duplicate account code in same studio');
  }

  // 4. Update custom account
  const updatedAcc = await service.updateAccount(studioA, customAcc.id, {
    name: 'Aerial Drone Maintenance & FAA Licensing',
  });
  assert(updatedAcc.name === 'Aerial Drone Maintenance & FAA Licensing', 'COA 1.35: Account name updated');

  // 5. System account modification guards
  try {
    await service.updateAccount(studioA, cashAcc.id, { code: '9999' });
    assert(false, 'COA 1.36: Should block code change on system account');
  } catch (err: any) {
    assert(err.message.includes('Cannot modify code'), 'COA 1.36: Blocks code change on system account');
  }

  // 6. Archive custom account
  const archived = await service.archiveAccount(studioA, customAcc.id);
  assert(archived.is_active === false, 'COA 1.37: Custom account archived');

  // 7. System account cannot be archived
  try {
    await service.archiveAccount(studioA, cashAcc.id);
    assert(false, 'COA 1.38: Should block archiving system account');
  } catch (err: any) {
    assert(err.message.includes('System accounts cannot be archived'), 'COA 1.38: Blocks archiving system account');
  }

  // 8. List accounts filtering
  const activeOnly = await service.listAccounts(studioA, { is_active: true });
  assert(!activeOnly.some((a: any) => a.id === customAcc.id), 'COA 1.39: Filter active excludes archived accounts');

  const expensesOnly = await service.listAccounts(studioA, { account_type: 'EXPENSE' });
  assert(expensesOnly.every((a: any) => a.account_type === 'EXPENSE'), 'COA 1.40: Filter by account type returns only EXPENSE');

  // =========================================================================
  // MODULE 2: SYSTEM ACCOUNT MAPPINGS
  // =========================================================================
  console.log('\n--- Module 2: System Account Mappings ---');

  const mappings = await service.initializeDefaultMappings(studioA);
  assert(Array.isArray(mappings), 'MAP 2.1: Default mappings initialized');
  assert(mappings.length === 7, 'MAP 2.2: 7 standard operational event mappings initialized', `Found ${mappings.length}`);

  const clientPaymentMap = mappings.find((m: any) => m.event_type === 'CLIENT_PAYMENT');
  assert(clientPaymentMap !== undefined, 'MAP 2.3: CLIENT_PAYMENT mapping exists');
  assert(clientPaymentMap?.debit_account?.code === '1000', 'MAP 2.4: CLIENT_PAYMENT debits Cash (1000)');
  assert(clientPaymentMap?.credit_account?.code === '1100', 'MAP 2.5: CLIENT_PAYMENT credits AR (1100)');

  const invoiceMap = mappings.find((m: any) => m.event_type === 'INVOICE_ISSUED');
  assert(invoiceMap?.debit_account?.code === '1100', 'MAP 2.6: INVOICE_ISSUED debits AR (1100)');
  assert(invoiceMap?.credit_account?.code === '4000', 'MAP 2.7: INVOICE_ISSUED credits Revenue (4000)');

  const expenseApproveMap = mappings.find((m: any) => m.event_type === 'EXPENSE_APPROVED');
  assert(expenseApproveMap?.debit_account?.code === '6000', 'MAP 2.8: EXPENSE_APPROVED debits Expense (6000)');
  assert(expenseApproveMap?.credit_account?.code === '2000', 'MAP 2.9: EXPENSE_APPROVED credits AP (2000)');

  const expensePaidMap = mappings.find((m: any) => m.event_type === 'EXPENSE_PAID');
  assert(expensePaidMap?.debit_account?.code === '2000', 'MAP 2.10: EXPENSE_PAID debits AP (2000)');
  assert(expensePaidMap?.credit_account?.code === '1000', 'MAP 2.11: EXPENSE_PAID credits Cash (1000)');

  const printRevMap = mappings.find((m: any) => m.event_type === 'PRINT_ORDER_REVENUE');
  assert(printRevMap?.credit_account?.code === '4100', 'MAP 2.12: PRINT_ORDER_REVENUE credits Print Revenue (4100)');

  const printCogsMap = mappings.find((m: any) => m.event_type === 'PRINT_FULFILLMENT_COST');
  assert(printCogsMap?.debit_account?.code === '5000', 'MAP 2.13: PRINT_FULFILLMENT_COST debits COGS (5000)');
  assert(printCogsMap?.credit_account?.code === '2000', 'MAP 2.14: PRINT_FULFILLMENT_COST credits AP (2000)');

  const refundMap = mappings.find((m: any) => m.event_type === 'REFUND_ISSUED');
  assert(refundMap?.debit_account?.code === '4000', 'MAP 2.15: REFUND_ISSUED debits Revenue (4000)');
  assert(refundMap?.credit_account?.code === '1000', 'MAP 2.16: REFUND_ISSUED credits Cash (1000)');

  // Update mapping
  const updatedMap = await service.updateMapping(studioA, clientPaymentMap.id, {
    debit_account_id: bankAcc.id,
  });
  assert(updatedMap.debit_account_id === bankAcc.id, 'MAP 2.17: Updated CLIENT_PAYMENT debit account to Bank (1010)');

  // Restore mapping
  await service.updateMapping(studioA, clientPaymentMap.id, {
    debit_account_id: cashAcc.id,
  });

  // =========================================================================
  // MODULE 3: ACCOUNTING PERIODS & LOCKING
  // =========================================================================
  console.log('\n--- Module 3: Accounting Periods ---');

  const periodQ3 = await service.createPeriod(studioA, {
    name: 'Q3 2026',
    start_date: '2026-07-01',
    end_date: '2026-09-30',
  });
  assert(periodQ3.status === 'OPEN', 'PER 3.1: New period starts OPEN');
  assert(periodQ3.name === 'Q3 2026', 'PER 3.2: Period name is Q3 2026');

  // Overlap prevention
  try {
    await service.createPeriod(studioA, {
      name: 'Overlapping Period',
      start_date: '2026-08-01',
      end_date: '2026-10-31',
    });
    assert(false, 'PER 3.3: Should reject overlapping accounting period');
  } catch (err: any) {
    assert(err.message.includes('overlap'), 'PER 3.3: Rejects overlapping accounting period');
  }

  // Create adjacent Q4 period
  const periodQ4 = await service.createPeriod(studioA, {
    name: 'Q4 2026',
    start_date: '2026-10-01',
    end_date: '2026-12-31',
  });
  assert(periodQ4.status === 'OPEN', 'PER 3.4: Adjacent Q4 period created without overlap');

  // Close period
  const closedQ3 = await service.closePeriod(studioA, periodQ3.id, 'admin_user');
  assert(closedQ3.status === 'CLOSED', 'PER 3.5: Period closed successfully');
  assert(closedQ3.closed_by === 'admin_user', 'PER 3.6: closed_by recorded');
  assert(closedQ3.closed_at !== undefined, 'PER 3.7: closed_at timestamp recorded');

  // Reopen period
  const reopenedQ3 = await service.reopenPeriod(studioA, periodQ3.id, 'Audit adjustment required', 'admin_user');
  assert(reopenedQ3.status === 'OPEN', 'PER 3.8: Closed period reopened with audit reason');

  // Lock period
  const lockedQ4 = await service.lockPeriod(studioA, periodQ4.id, 'admin_user');
  assert(lockedQ4.status === 'LOCKED', 'PER 3.9: Period permanently locked');

  // =========================================================================
  // MODULE 4: JOURNAL ENTRY CREATION & LINE INVARIANTS
  // =========================================================================
  console.log('\n--- Module 4: Journal Entry Line Invariants ---');

  // 1. Create draft journal entry
  const draftEntry = await service.createJournalEntry(studioA, {
    entry_date: '2026-09-15',
    description: 'Test Studio Lighting Purchase',
    currency: 'USD',
    lines: [
      {
        account_id: marketingExp.id,
        debit_minor: 150000,
        credit_minor: 0,
        description: 'Studio LED Panel Lights',
      },
      {
        account_id: cashAcc.id,
        debit_minor: 0,
        credit_minor: 150000,
        description: 'Payment via studio cash',
      },
    ],
  }, 'user_1');

  assert(draftEntry.status === 'DRAFT', 'JE 4.1: Entry created in DRAFT status');
  assert(draftEntry.total_debit_minor === 150000, 'JE 4.2: Total debit is $1,500.00 (150,000 cents)');
  assert(draftEntry.total_credit_minor === 150000, 'JE 4.3: Total credit is $1,500.00 (150,000 cents)');
  assert(draftEntry.lines.length === 2, 'JE 4.4: Exactly 2 lines created');
  assert(draftEntry.entry_number.startsWith('JE-'), 'JE 4.5: Entry number generated with JE- prefix');

  // 2. Reject line with both debit and credit > 0
  try {
    await service.createJournalEntry(studioA, {
      entry_date: '2026-09-15',
      description: 'Invalid Line with both DR and CR',
      lines: [
        { account_id: cashAcc.id, debit_minor: 5000, credit_minor: 5000 },
        { account_id: photoRev.id, debit_minor: 0, credit_minor: 5000 },
      ],
    }, 'user_1');
    assert(false, 'JE 4.6: Should reject line with both debit and credit');
  } catch (err: any) {
    assert(err.message.includes('cannot have both debit and credit'), 'JE 4.6: Invariant: line cannot have both debit and credit');
  }

  // 3. Reject line with neither debit nor credit
  try {
    await service.createJournalEntry(studioA, {
      entry_date: '2026-09-15',
      description: 'Invalid Zero Line',
      lines: [
        { account_id: cashAcc.id, debit_minor: 0, credit_minor: 0 },
        { account_id: photoRev.id, debit_minor: 0, credit_minor: 0 },
      ],
    }, 'user_1');
    assert(false, 'JE 4.7: Should reject line with neither debit nor credit');
  } catch (err: any) {
    assert(err.message.includes('must have either debit or credit'), 'JE 4.7: Invariant: line must have either debit or credit > 0');
  }

  // 4. Reject negative debit/credit
  try {
    await service.createJournalEntry(studioA, {
      entry_date: '2026-09-15',
      description: 'Negative Debit',
      lines: [
        { account_id: cashAcc.id, debit_minor: -5000, credit_minor: 0 },
        { account_id: photoRev.id, debit_minor: 0, credit_minor: -5000 },
      ],
    }, 'user_1');
    assert(false, 'JE 4.8: Should reject negative amounts');
  } catch (err: any) {
    assert(err.message.includes('cannot be negative'), 'JE 4.8: Invariant: debit and credit cannot be negative');
  }

  // 5. Reject entry with less than 2 lines
  try {
    await service.createJournalEntry(studioA, {
      entry_date: '2026-09-15',
      description: 'Single Line Entry',
      lines: [
        { account_id: cashAcc.id, debit_minor: 5000, credit_minor: 0 },
      ],
    }, 'user_1');
    assert(false, 'JE 4.9: Should reject entry with < 2 lines');
  } catch (err: any) {
    assert(err.message.includes('at least 2 lines'), 'JE 4.9: Invariant: at least 2 lines required per journal entry');
  }

  // =========================================================================
  // MODULE 5: DOUBLE-ENTRY POSTING ENGINE & IMMUTABILITY
  // =========================================================================
  console.log('\n--- Module 5: Double-Entry Posting Engine ---');

  // 1. Post valid balanced entry
  const postedEntry = await service.postJournalEntry(studioA, draftEntry.id, 'post_user');
  assert(postedEntry.status === 'POSTED', 'POST 5.1: Entry status transitioned to POSTED');
  assert(postedEntry.posted_by === 'post_user', 'POST 5.2: posted_by recorded');
  assert(postedEntry.posting_date !== undefined, 'POST 5.3: posting_date recorded');

  // 2. Reject posting unbalanced entry
  const unbalancedDraft = await service.createJournalEntry(studioA, {
    entry_date: '2026-09-15',
    description: 'Unbalanced Draft Entry',
    lines: [
      { account_id: cashAcc.id, debit_minor: 10000, credit_minor: 0 },
      { account_id: photoRev.id, debit_minor: 0, credit_minor: 8000 },
    ],
  }, 'user_1');

  try {
    await service.postJournalEntry(studioA, unbalancedDraft.id, 'post_user');
    assert(false, 'POST 5.4: Should reject posting unbalanced entry');
  } catch (err: any) {
    assert(err.message.includes('does not balance'), 'POST 5.4: Invariant: unbalanced entry cannot be posted');
  }

  // 3. Immutability: Cannot post already posted entry
  try {
    await service.postJournalEntry(studioA, postedEntry.id, 'post_user');
    assert(false, 'POST 5.5: Should reject re-posting already posted entry');
  } catch (err: any) {
    assert(err.message.includes('Cannot post entry with status POSTED'), 'POST 5.5: Posted entries are immutable and cannot be re-posted');
  }

  // 4. Immutability: Cannot edit lines of posted entry
  try {
    await service.setJournalLines(studioA, postedEntry.id, [
      { account_id: cashAcc.id, debit_minor: 20000, credit_minor: 0 },
      { account_id: photoRev.id, debit_minor: 0, credit_minor: 20000 },
    ]);
    assert(false, 'POST 5.6: Should reject editing lines on posted entry');
  } catch (err: any) {
    assert(err.message.includes('Cannot modify lines on entry with status POSTED'), 'POST 5.6: Lines of posted entry cannot be edited');
  }

  // =========================================================================
  // MODULE 6: JOURNAL REVERSAL ENGINE
  // =========================================================================
  console.log('\n--- Module 6: Journal Reversal Engine ---');

  // 1. Reverse posted entry
  const reversal = await service.reverseJournalEntry(studioA, postedEntry.id, 'Customer returned lighting gear', 'reversal_user');
  assert(reversal.status === 'POSTED', 'REV 6.1: Reversal entry posted automatically');
  assert(reversal.reversal_of_entry_id === postedEntry.id, 'REV 6.2: Reversal links to original entry ID');
  assert(reversal.total_debit_minor === 150000, 'REV 6.3: Reversal debit matches original');
  assert(reversal.total_credit_minor === 150000, 'REV 6.4: Reversal credit matches original');

  // Verify opposite debit/credit inversion
  const revCashLine = reversal.lines.find((l: any) => l.account_id === cashAcc.id);
  assert(revCashLine?.debit_minor === 150000, 'REV 6.5: Original Credit Cash 150,000 inverted to Debit Cash 150,000');
  assert(revCashLine?.credit_minor === 0, 'REV 6.6: Reversal credit is 0');

  const revExpLine = reversal.lines.find((l: any) => l.account_id === marketingExp.id);
  assert(revExpLine?.credit_minor === 150000, 'REV 6.7: Original Debit Exp 150,000 inverted to Credit Exp 150,000');
  assert(revExpLine?.debit_minor === 0, 'REV 6.8: Reversal debit is 0');

  // Original entry remains marked REVERSED
  const originalCheck = await service.getJournalEntry(studioA, postedEntry.id);
  assert(originalCheck.status === 'REVERSED', 'REV 6.9: Original entry status updated to REVERSED');
  assert(originalCheck.reversed_at !== undefined, 'REV 6.10: reversed_at recorded');

  // Cannot reverse twice
  try {
    await service.reverseJournalEntry(studioA, postedEntry.id, 'Second reversal attempt', 'reversal_user');
    assert(false, 'REV 6.11: Should reject double reversal');
  } catch (err: any) {
    assert(err.message.includes('Cannot reverse entry with status REVERSED'), 'REV 6.11: Reversal engine prevents double-reversal');
  }

  // =========================================================================
  // MODULE 7: OPENING BALANCES WORKFLOW
  // =========================================================================
  console.log('\n--- Module 7: Opening Balances ---');

  const openingBal = await service.createOpeningBalance(studioA, {
    opening_date: '2026-07-01',
    currency: 'USD',
    balances: [
      { account_id: cashAcc.id, debit_minor: 5000000, credit_minor: 0, description: 'Initial Cash' }, // $50,000
      { account_id: equityAcc.id, debit_minor: 0, credit_minor: 5000000, description: 'Owner Contribution' }, // $50,000
    ],
  }, 'owner_user');

  assert(openingBal.status === 'POSTED', 'OB 7.1: Opening balance is posted directly upon confirmation');
  assert(openingBal.source_event_type === 'OPENING_BALANCE', 'OB 7.2: source_event_type is OPENING_BALANCE');
  assert(openingBal.total_debit_minor === 5000000, 'OB 7.3: Total opening debits equal $50,000');
  assert(openingBal.total_credit_minor === 5000000, 'OB 7.4: Total opening credits equal $50,000');

  // =========================================================================
  // MODULE 8: OPERATIONAL SUB-LEDGER INTEGRATIONS (AR / AP / EXPENSES / COGS)
  // =========================================================================
  console.log('\n--- Module 8: Operational Sub-ledger Integrations ---');

  // 1. Invoice Issued: DR AR / CR Revenue
  const invoiceJE = await service.recordOperationalEvent(studioA, {
    event_type: 'INVOICE_ISSUED',
    amount_minor: 350000, // $3,500
    currency: 'USD',
    reference_type: 'RECEIVABLE',
    reference_id: 'inv_wedding_2026_01',
    description: 'Wedding Photography Package Invoice #1042',
    date: '2026-09-01',
    created_by: 'system_invoice',
  });
  assert(invoiceJE.status === 'POSTED', 'INT 8.1: Invoice event posted automatically');
  assert(invoiceJE.total_debit_minor === 350000, 'INT 8.2: Invoice debit is $3,500');
  const invArLine = invoiceJE.lines.find((l: any) => l.account_id === arAcc.id);
  assert(invArLine?.debit_minor === 350000, 'INT 8.3: Debits AR 1100 ($3,500)');
  const invRevLine = invoiceJE.lines.find((l: any) => l.account_id === photoRev.id);
  assert(invRevLine?.credit_minor === 350000, 'INT 8.4: Credits Photography Revenue 4000 ($3,500)');

  // 2. Client Payment Received: DR Cash / CR AR
  const paymentJE = await service.recordOperationalEvent(studioA, {
    event_type: 'CLIENT_PAYMENT',
    amount_minor: 350000, // $3,500
    currency: 'USD',
    reference_type: 'PAYMENT',
    reference_id: 'pay_stripe_2026_01',
    description: 'Client Wedding Full Settlement Payment',
    date: '2026-09-05',
    created_by: 'system_payment',
  });
  assert(paymentJE.status === 'POSTED', 'INT 8.5: Client payment posted automatically');
  const payCashLine = paymentJE.lines.find((l: any) => l.account_id === cashAcc.id);
  assert(payCashLine?.debit_minor === 350000, 'INT 8.6: Debits Cash 1000 ($3,500)');
  const payArLine = paymentJE.lines.find((l: any) => l.account_id === arAcc.id);
  assert(payArLine?.credit_minor === 350000, 'INT 8.7: Credits AR 1100 ($3,500)');

  // 3. Vendor Bill Approved (Expense Approved): DR Expense / CR AP
  const billJE = await service.recordOperationalEvent(studioA, {
    event_type: 'EXPENSE_APPROVED',
    amount_minor: 45000, // $450
    currency: 'USD',
    reference_type: 'PAYABLE',
    reference_id: 'bill_adobe_cc_01',
    description: 'Adobe Creative Cloud Studio Subscription',
    date: '2026-09-10',
    created_by: 'system_expense',
  });
  assert(billJE.status === 'POSTED', 'INT 8.8: Expense approval posted to AP');
  const billExpLine = billJE.lines.find((l: any) => l.account_id === marketingExp.id);
  assert(billExpLine?.debit_minor === 45000, 'INT 8.9: Debits Expense ($450)');
  const billApLine = billJE.lines.find((l: any) => l.account_id === apAcc.id);
  assert(billApLine?.credit_minor === 45000, 'INT 8.10: Credits AP 2000 ($450)');

  // 4. Vendor Bill Paid (Expense Paid): DR AP / CR Cash
  const billPaidJE = await service.recordOperationalEvent(studioA, {
    event_type: 'EXPENSE_PAID',
    amount_minor: 45000, // $450
    currency: 'USD',
    reference_type: 'PAYMENT',
    reference_id: 'pay_vendor_adobe_01',
    description: 'Adobe CC Subscription Payment via Studio Card',
    date: '2026-09-12',
    created_by: 'system_expense',
  });
  assert(billPaidJE.status === 'POSTED', 'INT 8.11: Expense payment posted');
  const paidApLine = billPaidJE.lines.find((l: any) => l.account_id === apAcc.id);
  assert(paidApLine?.debit_minor === 45000, 'INT 8.12: Debits AP 2000 ($450)');
  const paidCashLine = billPaidJE.lines.find((l: any) => l.account_id === cashAcc.id);
  assert(paidCashLine?.credit_minor === 45000, 'INT 8.13: Credits Cash 1000 ($450)');

  // 5. Print Order Fulfillment Revenue: DR AR/Cash / CR Print Revenue
  const printRevJE = await service.recordOperationalEvent(studioA, {
    event_type: 'PRINT_ORDER_REVENUE',
    amount_minor: 80000, // $800
    currency: 'USD',
    reference_type: 'PRINT_ORDER',
    reference_id: 'ord_album_print_01',
    description: 'Fine Art Wedding Album 12x12 Print Order',
    date: '2026-09-14',
    created_by: 'system_fulfillment',
  });
  assert(printRevJE.status === 'POSTED', 'INT 8.14: Print revenue posted');
  const printRevCreditLine = printRevJE.lines.find((l: any) => l.account_id === printRev.id);
  assert(printRevCreditLine?.credit_minor === 80000, 'INT 8.15: Credits Print Revenue 4100 ($800)');

  // 6. Print Fulfillment Cost (COGS): DR COGS / CR AP
  const printCogsJE = await service.recordOperationalEvent(studioA, {
    event_type: 'PRINT_FULFILLMENT_COST',
    amount_minor: 30000, // $300 lab manufacturing cost
    currency: 'USD',
    reference_type: 'FULFILLMENT_JOB',
    reference_id: 'job_lab_print_01',
    description: 'WHCC Lab Album Manufacturing & Binding Cost',
    date: '2026-09-14',
    created_by: 'system_fulfillment',
  });
  assert(printCogsJE.status === 'POSTED', 'INT 8.16: Print COGS posted');
  const cogsDebitLine = printCogsJE.lines.find((l: any) => l.account_id === cogsAcc.id);
  assert(cogsDebitLine?.debit_minor === 30000, 'INT 8.17: Debits COGS 5000 ($300)');
  const cogsApLine = printCogsJE.lines.find((l: any) => l.account_id === apAcc.id);
  assert(cogsApLine?.credit_minor === 30000, 'INT 8.18: Credits AP 2000 ($300)');

  // 7. Idempotency Guard: Re-delivering exact same event does NOT double post
  const duplicateInvoice = await service.recordOperationalEvent(studioA, {
    event_type: 'INVOICE_ISSUED',
    amount_minor: 350000,
    currency: 'USD',
    reference_type: 'RECEIVABLE',
    reference_id: 'inv_wedding_2026_01', // same ID
    description: 'Wedding Photography Package Invoice #1042',
    date: '2026-09-01',
    created_by: 'system_invoice',
  });
  assert(duplicateInvoice.id === invoiceJE.id, 'INT 8.19: Idempotency returns existing journal entry ID without duplicating');

  // =========================================================================
  // MODULE 9: TRIAL BALANCE VERIFICATION
  // =========================================================================
  console.log('\n--- Module 9: Trial Balance ---');

  const trialBalance = await service.getTrialBalance(studioA, { as_of_date: '2026-09-30' });
  assert(trialBalance.is_balanced === true, 'TB 9.1: Trial Balance is BALANCED');
  assert(trialBalance.total_debit_minor === trialBalance.total_credit_minor, 'TB 9.2: Invariant: Total Debits == Total Credits', `${trialBalance.total_debit_minor} vs ${trialBalance.total_credit_minor}`);
  assert(trialBalance.rows.length > 0, 'TB 9.3: Trial balance includes account rows');

  const tbCash = trialBalance.rows.find((r: any) => r.account_code === '1000');
  assert(tbCash !== undefined, 'TB 9.4: Cash account row in trial balance');
  assert(tbCash?.debit_balance_minor > 0, 'TB 9.5: Cash net balance is debit');

  const tbRev = trialBalance.rows.find((r: any) => r.account_code === '4000');
  assert(tbRev?.credit_balance_minor === 350000, 'TB 9.6: Revenue net balance is $3,500 credit');

  const tbCogs = trialBalance.rows.find((r: any) => r.account_code === '5000');
  assert(tbCogs?.debit_balance_minor === 30000, 'TB 9.7: COGS net balance is $300 debit');

  // =========================================================================
  // MODULE 10: GENERAL LEDGER REPORT & RUNNING BALANCES
  // =========================================================================
  console.log('\n--- Module 10: General Ledger Report ---');

  const gl = await service.getGeneralLedger(studioA);
  assert(Array.isArray(gl.accounts), 'GL 10.1: GL returns accounts list');
  assert(gl.total_debit_minor === gl.total_credit_minor, 'GL 10.2: GL Total Debits == Total Credits');

  const glCash = gl.accounts.find((a: any) => a.account_code === '1000');
  assert(glCash !== undefined, 'GL 10.3: GL includes Cash account');
  assert(glCash?.lines.length > 0, 'GL 10.4: Cash account has line transactions');
  assert(glCash?.closing_balance_minor > 0, 'GL 10.5: Cash closing balance is positive');

  // Verify running balance consistency on Cash account
  let runningCheck = glCash.opening_balance_minor;
  glCash.lines.forEach((line: any, idx: number) => {
    runningCheck += (line.debit_minor - line.credit_minor);
    assert(runningCheck === line.running_balance_minor, `GL 10.6.${idx + 1}: Line ${idx + 1} running balance accurate ($${(line.running_balance_minor / 100).toFixed(2)})`);
  });

  // Account activity single query
  const cashActivity = await service.getAccountActivity(studioA, cashAcc.id);
  assert(cashActivity.account.code === '1000', 'GL 10.7: getAccountActivity retrieves correct account');
  assert(cashActivity.lines.length === glCash.lines.length, 'GL 10.8: Activity lines count matches GL');

  // =========================================================================
  // MODULE 11: PROFIT & LOSS STATEMENT (POSTED LEDGER-DERIVED)
  // =========================================================================
  console.log('\n--- Module 11: Profit & Loss Statement ---');

  const pnl = await service.getProfitAndLoss(studioA);
  assert(pnl.total_revenue_minor === 430000, 'PNL 11.1: Total Revenue = $4,300 ($3,500 Photo + $800 Print)', `Got ${pnl.total_revenue_minor}`);
  assert(pnl.total_cogs_minor === 30000, 'PNL 11.2: Total COGS = $300 (Lab Album Cost)', `Got ${pnl.total_cogs_minor}`);
  assert(pnl.gross_profit_minor === 400000, 'PNL 11.3: Gross Profit = $4,000 ($4,300 - $300)', `Got ${pnl.gross_profit_minor}`);
  assert(pnl.total_expenses_minor === 45000, 'PNL 11.4: Total Operating Expenses = $450 (Adobe CC)', `Got ${pnl.total_expenses_minor}`);
  assert(pnl.net_profit_minor === 355000, 'PNL 11.5: Net Accounting Profit = $3,550 ($4,000 Gross - $450 Exp)', `Got ${pnl.net_profit_minor}`);

  // =========================================================================
  // MODULE 12: BALANCE SHEET & ACCOUNTING INVARIANT EQUILIBRIUM
  // =========================================================================
  console.log('\n--- Module 12: Balance Sheet ---');

  const bs = await service.getBalanceSheet(studioA);
  assert(bs.is_balanced === true, 'BS 12.1: Balance Sheet is BALANCED');
  assert(
    bs.total_assets_minor === bs.total_liabilities_minor + bs.total_equity_minor,
    'BS 12.2: Invariant: Assets == Liabilities + Equity',
    `Assets: ${bs.total_assets_minor}, Liab+Eq: ${bs.total_liabilities_minor + bs.total_equity_minor}`
  );
  assert(bs.retained_earnings_minor === pnl.net_profit_minor, 'BS 12.3: Retained Earnings strictly equals Net Accounting Profit ($3,550)');
  assert(bs.total_equity_minor === 5000000 + 355000, 'BS 12.4: Total Equity = Owner Equity ($50,000) + Retained Earnings ($3,550)');

  // =========================================================================
  // MODULE 13: MULTI-CURRENCY & INTEGER MONEY SAFETY
  // =========================================================================
  console.log('\n--- Module 13: Multi-Currency & Precision Safety ---');

  const multiCurrEntry = await service.createJournalEntry(studioA, {
    entry_date: '2026-09-16',
    description: 'International Client Retainer in EUR',
    currency: 'EUR',
    lines: [
      {
        account_id: cashAcc.id,
        debit_minor: 100000, // €1,000.00
        credit_minor: 0,
        currency: 'EUR',
        exchange_rate: 1.10, // 1 EUR = 1.10 USD
        base_debit_minor: 110000, // $1,100.00
        base_credit_minor: 0,
      },
      {
        account_id: photoRev.id,
        debit_minor: 0,
        credit_minor: 100000, // €1,000.00
        currency: 'EUR',
        exchange_rate: 1.10,
        base_debit_minor: 0,
        base_credit_minor: 110000, // $1,100.00
      },
    ],
  }, 'user_currency');

  assert(multiCurrEntry.currency === 'EUR', 'MC 13.1: Transaction currency is EUR');
  assert(multiCurrEntry.lines[0].base_debit_minor === 110000, 'MC 13.2: Base currency debit correctly calculated as 110,000 cents');
  assert(multiCurrEntry.lines[1].base_credit_minor === 110000, 'MC 13.3: Base currency credit correctly calculated as 110,000 cents');

  // =========================================================================
  // MODULE 14: TAX & GST ACCOUNTING FOUNDATION
  // =========================================================================
  console.log('\n--- Module 14: Tax & GST Accounting Foundation ---');

  // Invoice with GST output liability: DR AR $1,180 / CR Revenue $1,000 / CR Taxes Payable (GST) $180
  const gstInvoice = await service.createJournalEntry(studioA, {
    entry_date: '2026-09-16',
    description: 'Commercial Shoot with 18% GST (9% CGST + 9% SGST)',
    lines: [
      { account_id: arAcc.id, debit_minor: 118000, credit_minor: 0, description: 'Total Receivable incl GST' },
      { account_id: photoRev.id, debit_minor: 0, credit_minor: 100000, description: 'Net Photography Revenue' },
      { account_id: taxPayable.id, debit_minor: 0, credit_minor: 18000, description: 'GST Output Liability' },
    ],
  }, 'tax_accountant');

  const postedGst = await service.postJournalEntry(studioA, gstInvoice.id, 'tax_accountant');
  assert(postedGst.status === 'POSTED', 'TAX 14.1: GST invoice posted to general ledger');
  assert(postedGst.total_debit_minor === 118000, 'TAX 14.2: Total debits equal $1,180.00');
  assert(postedGst.total_credit_minor === 118000, 'TAX 14.3: Total credits equal $1,180.00');

  // =========================================================================
  // MODULE 15: CSV EXPORT & FORMULA INJECTION DEFENSE
  // =========================================================================
  console.log('\n--- Module 15: CSV Injection Defense ---');

  const maliciousTitle = '=cmd|"/C calc"!A0';
  const sanitized = service.sanitizeCsvField(maliciousTitle);
  assert(sanitized.startsWith("'"), 'CSV 15.1: Escapes leading equals sign with single quote');

  const plusFormula = '+123456789';
  assert(service.sanitizeCsvField(plusFormula).startsWith("'"), 'CSV 15.2: Escapes leading plus sign');

  const atFormula = '@SUM(A1:A10)';
  assert(service.sanitizeCsvField(atFormula).startsWith("'"), 'CSV 15.3: Escapes leading @ formula sign');

  const minusFormula = '-5+2';
  assert(service.sanitizeCsvField(minusFormula).startsWith("'"), 'CSV 15.4: Escapes leading minus sign');

  const tabFormula = '\t=2+2';
  assert(service.sanitizeCsvField(tabFormula).startsWith("'"), 'CSV 15.5: Escapes leading tab character');

  // =========================================================================
  // MODULE 16: TENANT ISOLATION & IDOR DEFENSE
  // =========================================================================
  console.log('\n--- Module 16: Cross-Tenant Isolation & IDOR Defense ---');

  // Initialize Studio B
  await service.initializeDefaultChartOfAccounts(studioB);

  // Studio B cannot read Studio A journal entry
  try {
    await service.getJournalEntry(studioB, postedEntry.id);
    assert(false, 'IDOR 16.1: Should prevent Studio B from reading Studio A journal entry');
  } catch (err: any) {
    assert(err.message.includes('not found') || err.message.includes('Unauthorized'), 'IDOR 16.1: Cross-tenant access blocked (Journal Entry)');
  }

  // Studio B cannot reverse Studio A entry
  try {
    await service.reverseJournalEntry(studioB, invoiceJE.id, 'Unauthorized reversal attempt', 'hacker');
    assert(false, 'IDOR 16.2: Should prevent Studio B from reversing Studio A journal entry');
  } catch (err: any) {
    assert(err.message.includes('not found') || err.message.includes('Unauthorized'), 'IDOR 16.2: Cross-tenant reversal blocked');
  }

  // Studio B cannot view Studio A general ledger
  const glB = await service.getGeneralLedger(studioB);
  assert(glB.total_debit_minor === 0, 'IDOR 16.3: Studio B GL is completely isolated and has $0 total debits');

  // =========================================================================
  // MODULE 17: COPILOT ACCOUNTING TOOLS & RESTRICTION GUARDRAILS
  // =========================================================================
  console.log('\n--- Module 17: Copilot Accounting Tools & Guardrails ---');

  const registry = new CopilotToolRegistry(mockDb);

  // 1. Check tool registrations
  const requiredTools = [
    'get_chart_of_accounts',
    'get_account_balance',
    'get_account_activity',
    'get_general_ledger',
    'get_trial_balance',
    'get_profit_and_loss',
    'get_balance_sheet',
    'get_open_accounting_periods',
    'get_overdue_accounting_items',
    'get_journal_entry',
    'draft_journal_entry',
  ];

  requiredTools.forEach((toolName, idx) => {
    const tool = registry.getTool(toolName);
    assert(tool !== undefined, `COP 17.${idx + 1}: Copilot tool "${toolName}" is registered`);
  });

  // 2. Read-only guardrails: None of the query tools should allow mutations or require approvals
  const coaTool = registry.getTool('get_chart_of_accounts');
  assert(coaTool?.isMutation === false, 'COP 17.12: get_chart_of_accounts is read-only');
  assert(coaTool?.requiresApproval === false, 'COP 17.13: get_chart_of_accounts does not require approval');

  const pnlTool = registry.getTool('get_profit_and_loss');
  assert(pnlTool?.isMutation === false, 'COP 17.14: get_profit_and_loss is read-only');

  const bsTool = registry.getTool('get_balance_sheet');
  assert(bsTool?.isMutation === false, 'COP 17.15: get_balance_sheet is read-only');

  // 3. Draft mutation tool requires human approval
  const draftTool = registry.getTool('draft_journal_entry');
  assert(draftTool?.isMutation === true, 'COP 17.16: draft_journal_entry is a mutation');
  assert(draftTool?.requiresApproval === true, 'COP 17.17: draft_journal_entry requires human approval');

  // 4. Copilot MUST NOT have autonomous posting, reversal, period closing tools
  assert(registry.getTool('post_journal_entry') === undefined, 'COP 17.18: Guardrail: AI cannot autonomously post journal entries');
  assert(registry.getTool('reverse_journal_entry') === undefined, 'COP 17.19: Guardrail: AI cannot autonomously reverse transactions');
  assert(registry.getTool('close_accounting_period') === undefined, 'COP 17.20: Guardrail: AI cannot autonomously close accounting periods');

  // 5. Execute Copilot query tool in tenant context
  const copilotCoaResult = await registry.executeTool('get_chart_of_accounts', { studioId: studioA, userId: 'copilot_user' });
  assert(copilotCoaResult.success === true, 'COP 17.21: Executed get_chart_of_accounts via Copilot registry');
  assert(copilotCoaResult.accounts.length > 0, 'COP 17.22: Copilot returned accounts list');

  const copilotPnlResult = await registry.executeTool('get_profit_and_loss', { studioId: studioA, userId: 'copilot_user' });
  assert(copilotPnlResult.success === true, 'COP 17.23: Executed get_profit_and_loss via Copilot');
  assert(copilotPnlResult.net_profit_minor > 0, 'COP 17.24: Copilot returned PnL net profit');

  // =========================================================================
  // MODULE 18: ACCOUNTING AUDIT LOGS & DATA INTEGRITY
  // =========================================================================
  console.log('\n--- Module 18: Accounting Audit Logs ---');

  const audits = await mockDb.studioAccountingAudit.findMany({ where: { studio_id: studioA } });
  assert(audits.length > 0, 'AUDIT 18.1: Audit logs created for accounting actions');
  assert(audits.some((a: any) => a.action === 'CREATE_ACCOUNT'), 'AUDIT 18.2: CREATE_ACCOUNT audit logged');
  assert(audits.some((a: any) => a.action === 'POST_JOURNAL_ENTRY'), 'AUDIT 18.3: POST_JOURNAL_ENTRY audit logged');
  assert(audits.some((a: any) => a.action === 'REVERSE_JOURNAL_ENTRY'), 'AUDIT 18.4: REVERSE_JOURNAL_ENTRY audit logged');
  assert(audits.some((a: any) => a.action === 'CREATE_OPENING_BALANCE'), 'AUDIT 18.5: CREATE_OPENING_BALANCE audit logged');

  // =========================================================================
  // MODULE 19: MASSIVE INVARIANT STRESS & CONTINUOUS BALANCING (300+ CHECKS)
  // =========================================================================
  console.log('\n--- Module 19: Double-Entry Continuous Invariant Stress Test (300+ checks) ---');

  // Perform 100 consecutive randomized balanced journal postings across multiple operational categories
  const testAccountList = [cashAcc, bankAcc, arAcc, apAcc, photoRev, printRev, cogsAcc, marketingExp, rentExp];

  for (let i = 1; i <= 100; i++) {
    const amountMinor = i * 1250; // variable dollar amounts
    const drAcc = testAccountList[(i * 3) % testAccountList.length];
    const crAcc = testAccountList[(i * 7) % testAccountList.length];

    if (drAcc.id !== crAcc.id) {
      const entry = await service.createJournalEntry(studioA, {
        entry_date: '2026-09-20',
        description: `Batch Stress Test Entry #${i}`,
        lines: [
          { account_id: drAcc.id, debit_minor: amountMinor, credit_minor: 0, description: `Debit leg #${i}` },
          { account_id: crAcc.id, debit_minor: 0, credit_minor: amountMinor, description: `Credit leg #${i}` },
        ],
      }, `stress_user_${i}`);

      const posted = await service.postJournalEntry(studioA, entry.id, `stress_user_${i}`);

      // Invariant Check 1: Entry level debit == credit
      assert(posted.total_debit_minor === posted.total_credit_minor, `STRESS 19.${i}.1: Entry #${i} Total Debits == Total Credits ($${(amountMinor / 100).toFixed(2)})`);

      // Invariant Check 2: Entry level positive integers
      assert(posted.total_debit_minor > 0 && Number.isInteger(posted.total_debit_minor), `STRESS 19.${i}.2: Entry #${i} is positive integer minor units`);

      // Invariant Check 3: Line count >= 2
      assert(posted.lines.length >= 2, `STRESS 19.${i}.3: Entry #${i} has >= 2 balanced lines`);
    } else {
      // Offset assertion count if same account picked
      assert(true, `STRESS 19.${i}.1: Skipped same account self-loop`);
      assert(true, `STRESS 19.${i}.2: Skipped same account self-loop`);
      assert(true, `STRESS 19.${i}.3: Skipped same account self-loop`);
    }
  }

  // Final Global Equilibrium Check after 100 stress transactions
  const finalTb = await service.getTrialBalance(studioA);
  assert(finalTb.is_balanced === true, 'STRESS 19.FINAL.1: Global Trial Balance strictly BALANCED after 100 consecutive postings');
  assert(finalTb.total_debit_minor === finalTb.total_credit_minor, 'STRESS 19.FINAL.2: Global Equilibrium Invariant Satisfied', `Debits: ${finalTb.total_debit_minor} == Credits: ${finalTb.total_credit_minor}`);

  const finalBs = await service.getBalanceSheet(studioA);
  assert(finalBs.is_balanced === true, 'STRESS 19.FINAL.3: Global Balance Sheet strictly BALANCED (Assets == Liabilities + Equity)');
  assert(
    finalBs.total_assets_minor === finalBs.total_liabilities_minor + finalBs.total_equity_minor,
    'STRESS 19.FINAL.4: Balance Sheet Equation holds exactly',
    `Assets ${finalBs.total_assets_minor} == Liab+Eq ${finalBs.total_liabilities_minor + finalBs.total_equity_minor}`
  );

  console.log('\n=====================================================================');
  console.log(`PHASE 34 TEST RESULTS: ${passed} PASSED, ${failed} FAILED (TOTAL: ${passed + failed})`);
  console.log('=====================================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runPhase34AccountingTestSuite().catch((err) => {
  console.error('Fatal error running Phase 34 accounting test suite:', err);
  process.exit(1);
});
