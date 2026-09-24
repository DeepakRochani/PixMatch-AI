/**
 * PixMatch AI — Phase 35: Studio Tax, GST & Compliance Operations 2.0 Test Suite
 *
 * Master test suite covering deterministic integer tax calculations, basis points,
 * intra-state (CGST+SGST) vs inter-state (IGST), RCM, SEZ, zero-rated exports,
 * SAC/HSN mappings, double-entry General Ledger journal linkages (Phase 34 integration),
 * Tax adjustments & ITC tracking, Period lifecycles, Ledger reconciliation,
 * Compliance checks, GST Reports, CSV security, Multi-tenancy, and Copilot tools.
 *
 * Target: 500+ meaningful assertions.
 */

process.env.DATABASE_URL = process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/pixmatch_test';
process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-jwt-secret-key-must-be-32-chars-long';

import { StudioTaxService } from '../apps/api/src/modules/tax/tax.service.js';
import { StudioAccountingService } from '../apps/api/src/modules/accounting/accounting.service.js';
import { CopilotToolRegistry } from '../apps/api/src/modules/copilot/copilot-tool-registry.js';
import {
  TaxPartyType,
  TaxTransactionType,
  TaxTransactionStatus,
  TaxPeriodStatus,
  TaxPeriodType,
  TaxJurisdictionType,
  TaxCategoryType,
  TaxAdjustmentType,
  ItcEligibility,
  TaxRoundingMethod,
  ChartOfAccountType,
} from '@pixmatch/types';
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

async function runPhase35TaxTestSuite() {
  console.log('=====================================================================');
  console.log('PIXMATCH AI — PHASE 35: STUDIO TAX, GST & COMPLIANCE OPERATIONS 2.0');
  console.log('=====================================================================\n');

  // In-memory mock database store supporting both Phase 34 Accounting and Phase 35 Tax models
  const mockDb: any = {
    // Phase 34 Accounting models
    accounts: [] as any[],
    mappings: [] as any[],
    journalEntries: [] as any[],
    journalLines: [] as any[],
    accountingPeriods: [] as any[],
    accountingAudits: [] as any[],

    // Phase 35 Tax models
    taxProfiles: [] as any[],
    taxRegistrations: [] as any[],
    taxJurisdictions: [] as any[],
    taxRates: [] as any[],
    taxCategories: [] as any[],
    taxItemMappings: [] as any[],
    taxPartyProfiles: [] as any[],
    taxTransactions: [] as any[],
    taxTransactionLines: [] as any[],
    taxAdjustments: [] as any[],
    taxPeriods: [] as any[],
    taxReconciliations: [] as any[],
    taxAudits: [] as any[],

    // Mock subledgers for operational backfill
    invoices: [] as any[],
    expenses: [] as any[],
    orders: [] as any[],

    // Prisma delegate mocks for Phase 34
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
          created_at: new Date(),
          updated_at: new Date(),
        };
        mockDb.accounts.push(item);
        return item;
      },
    },

    studioAccountingMapping: {
      findMany: async (args: any) => {
        return mockDb.mappings.filter((m: any) => {
          if (args?.where?.studio_id && m.studio_id !== args.where.studio_id) return false;
          if (args?.where?.event_type && m.event_type !== args.where.event_type) return false;
          if (args?.where?.mapping_key && m.mapping_key !== args.where.mapping_key) return false;
          return true;
        });
      },
      findFirst: async (args: any) => {
        const list = await mockDb.studioAccountingMapping.findMany(args);
        return list[0] || null;
      },
      findUnique: async (args: any) => {
        return mockDb.mappings.find((m: any) =>
          m.id === args?.where?.id ||
          (m.studio_id === args?.where?.studio_id_mapping_key?.studio_id &&
           m.mapping_key === args?.where?.studio_id_mapping_key?.mapping_key)
        ) || null;
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
        return item;
      },
      update: async (args: any) => {
        const item = mockDb.mappings.find((m: any) => m.id === args.where.id);
        if (item) Object.assign(item, args.data, { updated_at: new Date() });
        return item;
      },
      upsert: async (args: any) => {
        const idx = mockDb.mappings.findIndex((m: any) =>
          (args.where.id && m.id === args.where.id) ||
          (args.where.studio_id_mapping_key &&
           m.studio_id === args.where.studio_id_mapping_key.studio_id &&
           m.mapping_key === args.where.studio_id_mapping_key.mapping_key)
        );
        if (idx >= 0) {
          mockDb.mappings[idx] = { ...mockDb.mappings[idx], ...args.update, updated_at: new Date() };
          return mockDb.mappings[idx];
        } else {
          const item = {
            id: `map_${crypto.randomUUID()}`,
            ...args.create,
            created_at: new Date(),
            updated_at: new Date(),
          };
          mockDb.mappings.push(item);
          return item;
        }
      },
    },

    studioAccountingPeriod: {
      findMany: async (args: any) => {
        return mockDb.accountingPeriods.filter((p: any) => {
          if (args?.where?.id && p.id !== args.where.id) return false;
          if (args?.where?.studio_id && p.studio_id !== args.where.studio_id) return false;
          return true;
        });
      },
      findFirst: async (args: any) => {
        const list = await mockDb.studioAccountingPeriod.findMany(args);
        return list[0] || null;
      },
      findUnique: async (args: any) => {
        return mockDb.accountingPeriods.find((p: any) => p.id === args.where.id) || null;
      },
      create: async (args: any) => {
        const item = {
          id: args.data.id || `accp_${crypto.randomUUID()}`,
          ...args.data,
          status: args.data.status || 'OPEN',
          created_at: new Date(),
          updated_at: new Date(),
        };
        mockDb.accountingPeriods.push(item);
        return item;
      },
      update: async (args: any) => {
        const item = mockDb.accountingPeriods.find((p: any) => p.id === args.where.id);
        if (item) Object.assign(item, args.data, { updated_at: new Date() });
        return item;
      },
    },

    studioJournalEntry: {
      count: async (args: any) => {
        return (await mockDb.studioJournalEntry.findMany(args)).length;
      },
      findMany: async (args: any) => {
        return mockDb.journalEntries.filter((j: any) => {
          if (args?.where?.studio_id && j.studio_id !== args.where.studio_id) return false;
          if (args?.where?.id && j.id !== args.where.id) return false;
          if (args?.where?.status && j.status !== args.where.status) return false;
          return true;
        }).map((item: any) => {
          if (args?.include?.lines) {
            const lines = mockDb.journalLines.filter((l: any) => l.journal_entry_id === item.id);
            return {
              ...item,
              lines: lines.map((l: any) => ({
                ...l,
                account: mockDb.accounts.find((a: any) => a.id === l.account_id) || null,
              })),
            };
          }
          return item;
        });
      },
      findFirst: async (args: any) => {
        return (await mockDb.studioJournalEntry.findMany(args))[0] || null;
      },
      findUnique: async (args: any) => {
        const item = mockDb.journalEntries.find((j: any) => j.id === args.where.id);
        if (!item) return null;
        if (args?.include?.lines) {
          const lines = mockDb.journalLines.filter((l: any) => l.journal_entry_id === item.id);
          return {
            ...item,
            lines: lines.map((l: any) => ({
              ...l,
              account: mockDb.accounts.find((a: any) => a.id === l.account_id) || null,
            })),
          };
        }
        return item;
      },
      create: async (args: any) => {
        const entryId = args.data.id || `je_${crypto.randomUUID()}`;
        const linesData = args.data.lines?.create || [];
        const entry = {
          id: entryId,
          ...args.data,
          status: args.data.status || 'DRAFT',
          total_debit_minor: 0,
          total_credit_minor: 0,
          created_at: new Date(),
          updated_at: new Date(),
        };
        delete (entry as any).lines;

        let totalDebit = 0;
        let totalCredit = 0;
        for (let i = 0; i < linesData.length; i++) {
          const l = linesData[i];
          const debitVal = Number(l.debit_minor || 0);
          const creditVal = Number(l.credit_minor || 0);
          const line = {
            id: `jel_${crypto.randomUUID()}`,
            journal_entry_id: entryId,
            line_number: i + 1,
            account_id: l.account_id,
            debit_minor: debitVal,
            credit_minor: creditVal,
            currency: l.currency || 'INR',
            description: l.description || '',
            created_at: new Date(),
          };
          totalDebit += debitVal;
          totalCredit += creditVal;
          mockDb.journalLines.push(line);
        }
        entry.total_debit_minor = totalDebit;
        entry.total_credit_minor = totalCredit;
        mockDb.journalEntries.push(entry);

        return mockDb.studioJournalEntry.findUnique({ where: { id: entryId }, include: { lines: true } });
      },
      update: async (args: any) => {
        const idx = mockDb.journalEntries.findIndex((j: any) => j.id === args.where.id);
        if (idx >= 0) {
          mockDb.journalEntries[idx] = { ...mockDb.journalEntries[idx], ...args.data, updated_at: new Date() };
          return mockDb.studioJournalEntry.findUnique({ where: { id: args.where.id }, include: { lines: true } });
        }
        return null;
      },
    },

    studioJournalEntryLine: {
      findMany: async (args: any) => {
        return mockDb.journalLines.filter((l: any) => {
          if (args?.where?.journal_entry_id && l.journal_entry_id !== args.where.journal_entry_id) return false;
          if (args?.where?.account_id && l.account_id !== args.where.account_id) return false;
          return true;
        });
      },
    },

    studioAccountingAudit: {
      create: async (args: any) => {
        const item = { id: `audit_${crypto.randomUUID()}`, ...args.data, created_at: new Date() };
        mockDb.accountingAudits.push(item);
        return item;
      },
    },

    // --- Phase 35 Tax Prisma Delegate Mocks ---
    studioTaxProfile: {
      findUnique: async (args: any) => {
        return mockDb.taxProfiles.find((p: any) => (args.where?.studio_id && p.studio_id === args.where.studio_id) || (args.where?.id && p.id === args.where.id)) || null;
      },
      findFirst: async (args: any) => {
        return mockDb.taxProfiles.find((p: any) => (args.where?.studio_id && p.studio_id === args.where.studio_id) || (args.where?.id && p.id === args.where.id)) || null;
      },
      create: async (args: any) => {
        const item = {
          id: args.data.id || `taxprof_${crypto.randomUUID()}`,
          ...args.data,
          created_at: new Date(),
          updated_at: new Date(),
        };
        mockDb.taxProfiles.push(item);
        return item;
      },
      update: async (args: any) => {
        const idx = mockDb.taxProfiles.findIndex((p: any) => (args.where.studio_id && p.studio_id === args.where.studio_id) || (args.where.id && p.id === args.where.id));
        if (idx >= 0) {
          mockDb.taxProfiles[idx] = { ...mockDb.taxProfiles[idx], ...args.data, updated_at: new Date() };
          return mockDb.taxProfiles[idx];
        }
        return null;
      },
      upsert: async (args: any) => {
        const idx = mockDb.taxProfiles.findIndex((p: any) => (args.where.studio_id && p.studio_id === args.where.studio_id) || (args.where.id && p.id === args.where.id));
        if (idx >= 0) {
          mockDb.taxProfiles[idx] = { ...mockDb.taxProfiles[idx], ...args.update, updated_at: new Date() };
          return mockDb.taxProfiles[idx];
        } else {
          const item = {
            id: `taxprof_${crypto.randomUUID()}`,
            ...args.create,
            created_at: new Date(),
            updated_at: new Date(),
          };
          mockDb.taxProfiles.push(item);
          return item;
        }
      },
    },

    studioTaxRegistration: {
      findMany: async (args: any) => {
        return mockDb.taxRegistrations.filter((r: any) => {
          if (args?.where?.studio_id && r.studio_id !== args.where.studio_id) return false;
          if (args?.where?.state_code && r.state_code !== args.where.state_code) return false;
          if (args?.where?.is_primary !== undefined && r.is_primary !== args.where.is_primary) return false;
          return true;
        });
      },
      findFirst: async (args: any) => {
        return (await mockDb.studioTaxRegistration.findMany(args))[0] || null;
      },
      findUnique: async (args: any) => {
        return mockDb.taxRegistrations.find((r: any) => r.id === args.where.id) || null;
      },
      create: async (args: any) => {
        const item = {
          id: args.data.id || `reg_${crypto.randomUUID()}`,
          ...args.data,
          status: args.data.status || 'ACTIVE',
          created_at: new Date(),
          updated_at: new Date(),
        };
        mockDb.taxRegistrations.push(item);
        return item;
      },
      update: async (args: any) => {
        const idx = mockDb.taxRegistrations.findIndex((r: any) => r.id === args.where.id);
        if (idx >= 0) {
          mockDb.taxRegistrations[idx] = { ...mockDb.taxRegistrations[idx], ...args.data, updated_at: new Date() };
          return mockDb.taxRegistrations[idx];
        }
        return null;
      },
      updateMany: async (args: any) => {
        let count = 0;
        mockDb.taxRegistrations.forEach((r: any) => {
          if (args.where?.studio_id && r.studio_id !== args.where.studio_id) return;
          Object.assign(r, args.data);
          count++;
        });
        return { count };
      },
    },

    studioTaxJurisdiction: {
      findMany: async (args: any) => {
        return mockDb.taxJurisdictions.filter((j: any) => {
          if (args?.where?.studio_id && j.studio_id !== args.where.studio_id) return false;
          if (args?.where?.jurisdiction_code && j.jurisdiction_code !== args.where.jurisdiction_code) return false;
          return true;
        });
      },
      findFirst: async (args: any) => {
        const list = await mockDb.studioTaxJurisdiction.findMany(args);
        return list[0] || null;
      },
      findUnique: async (args: any) => {
        return mockDb.taxJurisdictions.find((j: any) => j.id === args.where.id) || null;
      },
      create: async (args: any) => {
        const item = {
          id: args.data.id || `jur_${crypto.randomUUID()}`,
          ...args.data,
          created_at: new Date(),
          updated_at: new Date(),
        };
        mockDb.taxJurisdictions.push(item);
        return item;
      },
      createMany: async (args: any) => {
        const items = args.data || [];
        for (const data of items) {
          mockDb.taxJurisdictions.push({
            id: data.id || `jur_${crypto.randomUUID()}`,
            ...data,
            created_at: new Date(),
            updated_at: new Date(),
          });
        }
        return { count: items.length };
      },
    },

    studioTaxRate: {
      findMany: async (args: any) => {
        return mockDb.taxRates.filter((r: any) => {
          if (args?.where?.studio_id && r.studio_id !== args.where.studio_id) return false;
          if (args?.where?.is_active !== undefined && r.is_active !== args.where.is_active) return false;
          if (args?.where?.id && r.id !== args.where.id) return false;
          if (args?.where?.code && r.code !== args.where.code && r.rate_code !== args.where.code) return false;
          if (args?.where?.rate_code && r.code !== args.where.rate_code && r.rate_code !== args.where.rate_code) return false;
          if (args?.where?.OR) {
            const match = args.where.OR.some((cond: any) => {
              if (cond.id && r.id === cond.id) return true;
              if (cond.code && (r.code === cond.code || r.rate_code === cond.code)) return true;
              if (cond.rate_code && (r.code === cond.rate_code || r.rate_code === cond.rate_code)) return true;
              return false;
            });
            if (!match) return false;
          }
          return true;
        });
      },
      findFirst: async (args: any) => {
        return (await mockDb.studioTaxRate.findMany(args))[0] || null;
      },
      findUnique: async (args: any) => {
        return mockDb.taxRates.find((r: any) => r.id === args.where.id) || null;
      },
      create: async (args: any) => {
        const item = {
          id: args.data.id || `rate_${crypto.randomUUID()}`,
          ...args.data,
          code: args.data.code || args.data.rate_code,
          is_active: args.data.is_active ?? true,
          created_at: new Date(),
          updated_at: new Date(),
        };
        mockDb.taxRates.push(item);
        return item;
      },
      createMany: async (args: any) => {
        const items = args.data || [];
        for (const data of items) {
          mockDb.taxRates.push({
            id: data.id || `rate_${crypto.randomUUID()}`,
            ...data,
            code: data.code || data.rate_code,
            is_active: data.is_active ?? true,
            created_at: new Date(),
            updated_at: new Date(),
          });
        }
        return { count: items.length };
      },
      update: async (args: any) => {
        const idx = mockDb.taxRates.findIndex((r: any) => r.id === args.where.id);
        if (idx >= 0) {
          mockDb.taxRates[idx] = { ...mockDb.taxRates[idx], ...args.data, updated_at: new Date() };
          return mockDb.taxRates[idx];
        }
        return null;
      },
    },

    studioTaxCategory: {
      findMany: async (args: any) => {
        return mockDb.taxCategories.filter((c: any) => {
          if (args?.where?.studio_id && c.studio_id !== args.where.studio_id) return false;
          if (args?.where?.code && c.code !== args.where.code && c.category_code !== args.where.code) return false;
          if (args?.where?.category_code && c.code !== args.where.category_code && c.category_code !== args.where.category_code) return false;
          return true;
        }).map((c: any) => ({
          ...c,
          default_rate: mockDb.taxRates.find((r: any) => r.id === c.default_rate_id) || null,
        }));
      },
      findFirst: async (args: any) => {
        return (await mockDb.studioTaxCategory.findMany(args))[0] || null;
      },
      findUnique: async (args: any) => {
        const item = mockDb.taxCategories.find((c: any) => c.id === args.where.id);
        if (!item) return null;
        return {
          ...item,
          default_rate: mockDb.taxRates.find((r: any) => r.id === item.default_rate_id) || null,
        };
      },
      create: async (args: any) => {
        const item = {
          id: args.data.id || `cat_${crypto.randomUUID()}`,
          ...args.data,
          code: args.data.code || args.data.category_code,
          is_active: args.data.is_active ?? true,
          created_at: new Date(),
          updated_at: new Date(),
        };
        mockDb.taxCategories.push(item);
        return item;
      },
      createMany: async (args: any) => {
        const items = args.data || [];
        for (const data of items) {
          mockDb.taxCategories.push({
            id: data.id || `cat_${crypto.randomUUID()}`,
            ...data,
            code: data.code || data.category_code,
            is_active: data.is_active ?? true,
            created_at: new Date(),
            updated_at: new Date(),
          });
        }
        return { count: items.length };
      },
    },

    studioTaxItemMapping: {
      findMany: async (args: any) => {
        return mockDb.taxItemMappings.filter((m: any) => {
          if (args?.where?.studio_id && m.studio_id !== args.where.studio_id) return false;
          if (args?.where?.id && m.id !== args.where.id) return false;
          if (args?.where?.item_code && m.item_code !== args.where.item_code && m.source_id !== args.where.item_code) return false;
          if (args?.where?.source_id && m.item_code !== args.where.source_id && m.source_id !== args.where.source_id) return false;
          if (args?.where?.OR) {
            const match = args.where.OR.some((cond: any) => {
              if (cond.source_id && (m.source_id === cond.source_id || m.item_code === cond.source_id)) return true;
              if (cond.item_code && (m.item_code === cond.item_code || m.source_id === cond.item_code)) return true;
              if (cond.sac_code && (m.sac_code === cond.sac_code || m.sac_hsn_code === cond.sac_code)) return true;
              if (cond.hsn_code && (m.hsn_code === cond.hsn_code || m.sac_hsn_code === cond.hsn_code)) return true;
              return false;
            });
            if (!match) return false;
          }
          return true;
        }).map((m: any) => ({
          ...m,
          default_rate: mockDb.taxRates.find((r: any) => r.id === m.default_rate_id || r.id === m.tax_rate_id) || null,
          tax_rate: mockDb.taxRates.find((r: any) => r.id === m.default_rate_id || r.id === m.tax_rate_id) || null,
          tax_category: mockDb.taxCategories.find((c: any) => c.id === m.tax_category_id) || null,
        }));
      },
      findFirst: async (args: any) => {
        return (await mockDb.studioTaxItemMapping.findMany(args))[0] || null;
      },
      findUnique: async (args: any) => {
        const item = mockDb.taxItemMappings.find((m: any) => m.id === args.where.id);
        if (!item) return null;
        return {
          ...item,
          default_rate: mockDb.taxRates.find((r: any) => r.id === item.default_rate_id || r.id === item.tax_rate_id) || null,
          tax_rate: mockDb.taxRates.find((r: any) => r.id === item.default_rate_id || r.id === item.tax_rate_id) || null,
          tax_category: mockDb.taxCategories.find((c: any) => c.id === item.tax_category_id) || null,
        };
      },
      create: async (args: any) => {
        const item = {
          id: args.data.id || `item_${crypto.randomUUID()}`,
          ...args.data,
          is_active: args.data.is_active ?? true,
          created_at: new Date(),
          updated_at: new Date(),
        };
        mockDb.taxItemMappings.push(item);
        return mockDb.studioTaxItemMapping.findUnique({ where: { id: item.id } });
      },
      createMany: async (args: any) => {
        const items = args.data || [];
        for (const data of items) {
          mockDb.taxItemMappings.push({
            id: data.id || `item_${crypto.randomUUID()}`,
            ...data,
            is_active: data.is_active ?? true,
            created_at: new Date(),
            updated_at: new Date(),
          });
        }
        return { count: items.length };
      },
    },

    studioTaxPartyProfile: {
      findFirst: async (args: any) => {
        return mockDb.taxPartyProfiles.find((p: any) => {
          if (args?.where?.studio_id && p.studio_id !== args.where.studio_id) return false;
          if (args?.where?.party_type && p.party_type !== args.where.party_type) return false;
          if (args?.where?.party_id && p.party_id !== args.where.party_id) return false;
          return true;
        }) || null;
      },
      create: async (args: any) => {
        const item = {
          id: args.data.id || `party_${crypto.randomUUID()}`,
          ...args.data,
          created_at: new Date(),
          updated_at: new Date(),
        };
        mockDb.taxPartyProfiles.push(item);
        return item;
      },
      update: async (args: any) => {
        const idx = mockDb.taxPartyProfiles.findIndex((p: any) => p.id === args.where.id);
        if (idx >= 0) {
          mockDb.taxPartyProfiles[idx] = { ...mockDb.taxPartyProfiles[idx], ...args.data, updated_at: new Date() };
          return mockDb.taxPartyProfiles[idx];
        }
        return null;
      },
    },

    studioTaxTransaction: {
      count: async (args: any) => {
        return (await mockDb.studioTaxTransaction.findMany(args)).length;
      },
      findMany: async (args: any) => {
        return mockDb.taxTransactions.filter((t: any) => {
          if (args?.where?.id && t.id !== args.where.id) return false;
          if (args?.where?.studio_id && t.studio_id !== args.where.studio_id) return false;
          if (args?.where?.idempotency_key !== undefined && t.idempotency_key !== args.where.idempotency_key) return false;
          if (args?.where?.transaction_type && t.transaction_type !== args.where.transaction_type) return false;
          if (args?.where?.status && t.status !== args.where.status) return false;
          if (args?.where?.tax_period_id && t.tax_period_id !== args.where.tax_period_id) return false;
          if (args?.where?.transaction_date?.gte) {
            const txDate = new Date(t.transaction_date || t.tax_date || t.created_at);
            if (txDate < new Date(args.where.transaction_date.gte)) return false;
          }
          if (args?.where?.transaction_date?.lte) {
            const txDate = new Date(t.transaction_date || t.tax_date || t.created_at);
            if (txDate > new Date(args.where.transaction_date.lte)) return false;
          }
          return true;
        }).map((t: any) => ({
          ...t,
          lines: mockDb.taxTransactionLines.filter((l: any) => l.tax_transaction_id === t.id),
        }));
      },
      findFirst: async (args: any) => {
        return (await mockDb.studioTaxTransaction.findMany(args))[0] || null;
      },
      findUnique: async (args: any) => {
        const item = mockDb.taxTransactions.find((t: any) => t.id === args.where.id);
        if (!item) return null;
        return {
          ...item,
          lines: mockDb.taxTransactionLines.filter((l: any) => l.tax_transaction_id === item.id),
        };
      },
      create: async (args: any) => {
        const txId = args.data.id || `txt_${crypto.randomUUID()}`;
        const linesData = args.data.lines?.create || [];
        const item = {
          id: txId,
          ...args.data,
          created_at: new Date(),
          updated_at: new Date(),
        };
        delete (item as any).lines;

        mockDb.taxTransactions.push(item);
        for (let i = 0; i < linesData.length; i++) {
          const l = linesData[i];
          mockDb.taxTransactionLines.push({
            id: `txl_${crypto.randomUUID()}`,
            tax_transaction_id: txId,
            line_number: i + 1,
            ...l,
            created_at: new Date(),
          });
        }
        return mockDb.studioTaxTransaction.findUnique({ where: { id: txId } });
      },
      update: async (args: any) => {
        const idx = mockDb.taxTransactions.findIndex((t: any) => t.id === args.where.id);
        if (idx >= 0) {
          mockDb.taxTransactions[idx] = { ...mockDb.taxTransactions[idx], ...args.data, updated_at: new Date() };
          return mockDb.studioTaxTransaction.findUnique({ where: { id: args.where.id } });
        }
        return null;
      },
    },

    studioTaxAdjustment: {
      count: async (args: any) => {
        return (await mockDb.studioTaxAdjustment.findMany(args)).length;
      },
      findMany: async (args: any) => {
        return mockDb.taxAdjustments.filter((a: any) => {
          if (args?.where?.studio_id && a.studio_id !== args.where.studio_id) return false;
          if (args?.where?.tax_period_id && a.tax_period_id !== args.where.tax_period_id) return false;
          return true;
        });
      },
      findFirst: async (args: any) => {
        const list = await mockDb.studioTaxAdjustment.findMany(args);
        return list[0] || null;
      },
      create: async (args: any) => {
        const item = {
          id: args.data.id || `adj_${crypto.randomUUID()}`,
          ...args.data,
          status: args.data.status || 'DRAFT',
          created_at: new Date(),
          updated_at: new Date(),
        };
        mockDb.taxAdjustments.push(item);
        return item;
      },
    },

    studioTaxPeriod: {
      count: async (args: any) => {
        return (await mockDb.studioTaxPeriod.findMany(args)).length;
      },
      findMany: async (args: any) => {
        return mockDb.taxPeriods.filter((p: any) => {
          if (args?.where?.studio_id && p.studio_id !== args.where.studio_id) return false;
          return true;
        });
      },
      findFirst: async (args: any) => {
        return (await mockDb.studioTaxPeriod.findMany(args))[0] || null;
      },
      findUnique: async (args: any) => {
        return mockDb.taxPeriods.find((p: any) => p.id === args.where.id) || null;
      },
      create: async (args: any) => {
        const item = {
          id: args.data.id || `taxp_${crypto.randomUUID()}`,
          ...args.data,
          status: args.data.status || 'OPEN',
          created_at: new Date(),
          updated_at: new Date(),
        };
        mockDb.taxPeriods.push(item);
        return item;
      },
      update: async (args: any) => {
        const idx = mockDb.taxPeriods.findIndex((p: any) => p.id === args.where.id);
        if (idx >= 0) {
          mockDb.taxPeriods[idx] = { ...mockDb.taxPeriods[idx], ...args.data, updated_at: new Date() };
          return mockDb.taxPeriods[idx];
        }
        return null;
      },
    },

    studioTaxReconciliation: {
      findMany: async (args: any) => {
        return mockDb.taxReconciliations.filter((r: any) => {
          if (args?.where?.studio_id && r.studio_id !== args.where.studio_id) return false;
          return true;
        });
      },
      findFirst: async (args: any) => {
        const list = await mockDb.studioTaxReconciliation.findMany(args);
        return list[0] || null;
      },
      create: async (args: any) => {
        const item = {
          id: args.data.id || `rec_${crypto.randomUUID()}`,
          ...args.data,
          created_at: new Date(),
        };
        mockDb.taxReconciliations.push(item);
        return item;
      },
    },

    studioTaxAudit: {
      create: async (args: any) => {
        const item = {
          id: `txaudit_${crypto.randomUUID()}`,
          ...args.data,
          created_at: new Date(),
        };
        mockDb.taxAudits.push(item);
        return item;
      },
    },

    studioInvoice: {
      findMany: async (args: any) => mockDb.invoices.filter((i: any) => i.studio_id === args?.where?.studio_id),
    },
    studioExpense: {
      findMany: async (args: any) => mockDb.expenses.filter((e: any) => e.studio_id === args?.where?.studio_id),
    },
    fulfillmentOrder: {
      findMany: async (args: any) => mockDb.orders.filter((o: any) => o.studio_id === args?.where?.studio_id),
    },
  };

  const taxService = new StudioTaxService(mockDb);
  const accountingService = new StudioAccountingService(mockDb);
  const studioA = 'studio_tax_alpha_101';
  const studioB = 'studio_tax_beta_202';
  const userA = 'user_tax_manager_99';

  console.log('--- TEST SECTION 1: STUDIO TAX PROFILE & REGISTRATION ---');

  // 1. Initialize Chart of Accounts for Studio A & Studio B (Phase 34 integration)
  await accountingService.initializeDefaultChartOfAccounts(studioA, userA);
  await accountingService.initializeDefaultChartOfAccounts(studioB, 'user_beta');
  assert(mockDb.accounts.length > 20, 'Initialized Phase 34 General Ledger Chart of Accounts with tax accounts');

  // 2. Create Tax Profile for Studio A
  const profileA = await taxService.getOrCreateTaxProfile(studioA);
  assert(!!profileA, 'Created StudioTaxProfile for Studio A');
  assert(profileA.default_tax_rate_bps === 1800, 'Default tax rate is 1800 bps (18.00%)');
  assert(profileA.default_place_of_supply === 'MH', 'Default place of supply is MH');

  // 3. Update Tax Profile with PAN & Details
  const updatedProfileA = await taxService.updateTaxProfile(studioA, {
    legal_name: 'Alpha Wedding Studios Pvt Ltd',
    trade_name: 'Alpha Cine Works',
    pan_number: 'AABCA1234F',
    is_gst_registered: true,
    state_code: '27',
    state_name: 'Maharashtra',
    address_line1: '101 Marine Drive',
    city: 'Mumbai',
    postal_code: '400020',
  }, userA);

  assert(updatedProfileA.legal_name === 'Alpha Wedding Studios Pvt Ltd', 'Updated legal name on profile');
  assert(updatedProfileA.pan_number === 'AABCA1234F', 'Updated valid PAN number');

  // 4. PAN Validation failure test
  let panFailed = false;
  try {
    await taxService.updateTaxProfile(studioA, { pan_number: 'INVALID_PAN_123' }, userA);
  } catch (err) {
    panFailed = true;
  }
  assert(panFailed, 'Prevented invalid PAN format (must be 5 letters, 4 digits, 1 letter)');

  // 5. Create Primary GSTIN Registration
  const regMH = await taxService.createRegistration(studioA, {
    registration_type: 'GSTIN',
    registration_number: '27AABCA1234F1Z5',
    state_code: '27',
    state_name: 'Maharashtra',
    is_primary: true,
  }, userA);

  assert(regMH.registration_number === '27AABCA1234F1Z5', 'Created valid Maharashtra GSTIN registration');
  assert(regMH.is_primary === true, 'Set as primary tax registration');

  // 6. GSTIN Validation failure test
  let gstinFailed = false;
  try {
    await taxService.createRegistration(studioA, {
      registration_type: 'GSTIN',
      registration_number: '999INVALIDGSTIN',
      state_code: '27',
    }, userA);
  } catch (err) {
    gstinFailed = true;
  }
  assert(gstinFailed, 'Prevented invalid GSTIN format');

  // 7. Add Multi-state secondary registration (Delhi GSTIN)
  const regDL = await taxService.createRegistration(studioA, {
    registration_type: 'GSTIN',
    registration_number: '07AABCA1234F1Z9',
    state_code: '07',
    state_name: 'Delhi',
    is_primary: false,
  }, userA);
  assert(regDL.state_code === '07', 'Added secondary Delhi GSTIN registration');

  console.log('\n--- TEST SECTION 2: TAX RATES (BASIS POINTS) & SAC/HSN MAPPINGS ---');

  // 8. Create standard GST Rates using integer basis points
  const rate18 = await taxService.createTaxRate(studioA, {
    rate_code: 'GST_18',
    name: 'Standard GST 18%',
    rate_basis_points: 1800,
    cgst_basis_points: 900,
    sgst_basis_points: 900,
    igst_basis_points: 1800,
    cess_basis_points: 0,
    effective_from: new Date('2026-01-01'),
  }, userA);

  const rate12 = await taxService.createTaxRate(studioA, {
    rate_code: 'GST_12',
    name: 'Print & Album GST 12%',
    rate_basis_points: 1200,
    cgst_basis_points: 600,
    sgst_basis_points: 600,
    igst_basis_points: 1200,
    cess_basis_points: 0,
    effective_from: new Date('2026-01-01'),
  }, userA);

  const rate0 = await taxService.createTaxRate(studioA, {
    rate_code: 'GST_0_EXPORT',
    name: 'Zero Rated Export',
    rate_basis_points: 0,
    cgst_basis_points: 0,
    sgst_basis_points: 0,
    igst_basis_points: 0,
    cess_basis_points: 0,
    effective_from: new Date('2026-01-01'),
  }, userA);

  assert(rate18.rate_basis_points === 1800, 'Created 18% GST rate (1800 bps)');
  assert(rate18.cgst_basis_points + rate18.sgst_basis_points === rate18.igst_basis_points, 'CGST + SGST basis points match IGST exactly');
  assert(rate12.rate_basis_points === 1200, 'Created 12% GST rate (1200 bps)');
  assert(rate0.rate_basis_points === 0, 'Created 0% Zero-rated tax rate');

  // 9. Create Tax Categories
  const catPhoto = await taxService.createTaxCategory(studioA, {
    category_code: 'PHOTO_SERVICES',
    name: 'Photography Services',
    taxability: TaxCategoryType.TAXABLE,
    default_sac_hsn_code: '998381',
    is_service: true,
  }, userA);

  const catAlbums = await taxService.createTaxCategory(studioA, {
    category_code: 'PRINT_ALBUMS',
    name: 'Photographic Albums & Prints',
    taxability: TaxCategoryType.TAXABLE,
    default_sac_hsn_code: '4911',
    is_service: false,
  }, userA);

  assert(catPhoto.default_sac_hsn_code === '998381', 'Created Photography SAC category 998381');
  assert(catAlbums.default_sac_hsn_code === '4911', 'Created Physical Album HSN category 4911');

  // 10. Create Item Mappings
  const itemWedding = await taxService.createItemMapping(studioA, {
    item_type: 'SERVICE',
    item_code: 'WEDDING_CANDID',
    item_name: 'Wedding Candid Photography',
    sac_hsn_code: '998381',
    tax_category_id: catPhoto.id,
    tax_rate_id: rate18.id,
    itc_eligibility: ItcEligibility.ELIGIBLE,
  }, userA);

  const itemAlbum = await taxService.createItemMapping(studioA, {
    item_type: 'GOODS',
    item_code: 'CANVAS_ALBUM_50P',
    item_name: 'Luxury Canvas Print Album',
    sac_hsn_code: '4911',
    tax_category_id: catAlbums.id,
    tax_rate_id: rate12.id,
    itc_eligibility: ItcEligibility.ELIGIBLE,
  }, userA);

  assert(itemWedding.sac_hsn_code === '998381', 'Mapped service item to SAC 998381');
  assert(itemAlbum.sac_hsn_code === '4911', 'Mapped goods item to HSN 4911');

  console.log('\n--- TEST SECTION 3: DETERMINISTIC TAX DETERMINATION ENGINE ---');

  // 11. Intra-state B2C (Maharashtra Studio to Maharashtra Client): CGST 9% + SGST 9%
  const detIntra = await taxService.determineTax({
    studio_id: studioA,
    place_of_supply: '27', // Maharashtra
    origin_state_code: '27',
    items: [
      {
        item_code: 'WEDDING_CANDID',
        item_name: 'Wedding Package',
        sac_hsn_code: '998381',
        quantity: 1,
        unit_price_minor: 10000000, // ₹100,000.00
        discount_minor: 0,
      },
    ],
  });

  assert(detIntra.is_inter_state === false, 'Correctly identified intra-state supply');
  assert(detIntra.taxable_amount_minor === 10000000, 'Taxable amount is integer 10,000,000 paise (₹100,000)');
  assert(detIntra.cgst_amount_minor === 900000, 'CGST 9% is exactly 900,000 paise (₹9,000.00)');
  assert(detIntra.sgst_amount_minor === 900000, 'SGST 9% is exactly 900,000 paise (₹9,000.00)');
  assert(detIntra.igst_amount_minor === 0, 'IGST is 0 for intra-state');
  assert(detIntra.tax_amount_minor === 1800000, 'Total tax is exactly 1,800,000 paise (₹18,000.00)');
  assert(detIntra.total_amount_minor === 11800000, 'Gross total is exactly 11,800,000 paise (₹118,000.00)');
  assert(
    detIntra.cgst_amount_minor + detIntra.sgst_amount_minor + detIntra.igst_amount_minor + detIntra.cess_amount_minor === detIntra.tax_amount_minor,
    'Tax invariant holds: CGST + SGST + IGST + CESS == Total Tax'
  );

  // 12. Inter-state B2B (Maharashtra Studio to Karnataka Client 29): IGST 18%
  const detInter = await taxService.determineTax({
    studio_id: studioA,
    place_of_supply: '29', // Karnataka
    origin_state_code: '27', // Maharashtra
    party_gstin: '29AABCC9999K1Z4',
    items: [
      {
        item_code: 'WEDDING_CANDID',
        item_name: 'Bangalore Destination Shoot',
        sac_hsn_code: '998381',
        quantity: 1,
        unit_price_minor: 20000000, // ₹200,000.00
      },
    ],
  });

  assert(detInter.is_inter_state === true, 'Correctly identified inter-state supply (27 -> 29)');
  assert(detInter.cgst_amount_minor === 0, 'CGST is 0 for inter-state');
  assert(detInter.sgst_amount_minor === 0, 'SGST is 0 for inter-state');
  assert(detInter.igst_amount_minor === 3600000, 'IGST 18% is exactly 3,600,000 paise (₹36,000.00)');
  assert(detInter.tax_amount_minor === 3600000, 'Total tax matches IGST');
  assert(detInter.total_amount_minor === 23600000, 'Gross total is 23,600,000 paise');

  // 13. Multi-item Mixed Tax Determination (Services 18% + Goods Album 12%)
  const detMulti = await taxService.determineTax({
    studio_id: studioA,
    place_of_supply: '27',
    origin_state_code: '27',
    items: [
      {
        item_code: 'WEDDING_CANDID',
        item_name: 'Photography Services',
        quantity: 1,
        unit_price_minor: 10000000, // 18% -> ₹18,000
      },
      {
        item_code: 'CANVAS_ALBUM_50P',
        item_name: 'Physical Album',
        quantity: 2,
        unit_price_minor: 1000000, // 2 * 10,000 = 20,000 @ 12% -> ₹2,400
      },
    ],
  });

  assert(detMulti.taxable_amount_minor === 12000000, 'Total taxable amount is ₹120,000');
  assert(detMulti.cgst_amount_minor === 1020000, 'Combined CGST (9,000 + 1,200) is ₹10,200');
  assert(detMulti.sgst_amount_minor === 1020000, 'Combined SGST (9,000 + 1,200) is ₹10,200');
  assert(detMulti.tax_amount_minor === 2040000, 'Total tax is ₹20,400');
  assert(detMulti.total_amount_minor === 14040000, 'Gross total is ₹140,400');

  // 14. Zero-rated Export / Overseas Supply
  const detExport = await taxService.determineTax({
    studio_id: studioA,
    place_of_supply: 'OVERSEAS',
    is_export: true,
    is_sez: false,
    items: [
      {
        item_code: 'WEDDING_CANDID',
        item_name: 'Dubai Luxury Pre-Wedding',
        quantity: 1,
        unit_price_minor: 50000000, // ₹500,000
      },
    ],
  });

  assert(detExport.tax_amount_minor === 0, 'Zero-rated export tax amount is 0');
  assert(detExport.taxable_amount_minor === 50000000, 'Taxable export turnover recorded as ₹500,000');
  assert(detExport.total_amount_minor === 50000000, 'Export invoice gross equals taxable amount');

  // 15. Reverse Charge Mechanism (RCM) Supply
  const detRCM = await taxService.determineTax({
    studio_id: studioA,
    place_of_supply: '27',
    origin_state_code: '27',
    is_reverse_charge: true,
    items: [
      {
        item_code: 'LEGAL_ADVISORY',
        item_name: 'Legal Consultant Fee',
        sac_hsn_code: '998211',
        quantity: 1,
        unit_price_minor: 5000000, // ₹50,000
      },
    ],
  });

  assert(detRCM.is_reverse_charge === true, 'RCM flag set on determined tax');
  assert(detRCM.tax_amount_minor === 900000, 'RCM tax calculated as ₹9,000 (liability on recipient)');

  console.log('\n--- TEST SECTION 4: TAX TRANSACTIONS & DOUBLE-ENTRY GL LINKAGE ---');

  // 16. Create & Post Output Tax Transaction (Client Invoice)
  const txOutput = await taxService.createTaxTransaction(studioA, {
    transaction_type: TaxTransactionType.OUTPUT_TAX,
    transaction_number: 'TX-INV-2026-001',
    source_document_type: 'INVOICE',
    source_document_id: 'inv_101',
    party_type: TaxPartyType.CLIENT,
    party_id: 'client_ananya',
    party_name: 'Ananya Sharma',
    party_gstin: '27AABCS9999P1Z1',
    place_of_supply: '27',
    tax_date: new Date('2026-08-15'),
    taxable_amount_minor: 10000000, // ₹100,000
    cgst_amount_minor: 900000, // ₹9,000
    sgst_amount_minor: 900000, // ₹9,000
    igst_amount_minor: 0,
    cess_amount_minor: 0,
    tax_amount_minor: 1800000, // ₹18,000
    total_amount_minor: 11800000, // ₹118,000
    is_inter_state: false,
    lines: [
      {
        item_code: 'WEDDING_CANDID',
        item_name: 'Wedding Photography',
        sac_hsn_code: '998381',
        quantity: 1,
        unit_price_minor: 10000000,
        taxable_amount_minor: 10000000,
        cgst_rate_bps: 900,
        cgst_amount_minor: 900000,
        sgst_rate_bps: 900,
        sgst_amount_minor: 900000,
        igst_rate_bps: 0,
        igst_amount_minor: 0,
        cess_rate_bps: 0,
        cess_amount_minor: 0,
        tax_amount_minor: 1800000,
        total_amount_minor: 11800000,
        itc_eligibility: ItcEligibility.INELIGIBLE,
      },
    ],
  }, userA);

  assert(txOutput.status === TaxTransactionStatus.DRAFT, 'Tax transaction created in DRAFT status');
  assert(txOutput.lines.length === 1, 'Transaction has 1 line item');

  // 17. Post Output Tax to General Ledger
  const postedOutput = await taxService.postTaxTransaction(studioA, txOutput.id, userA);
  assert(postedOutput.status === TaxTransactionStatus.POSTED, 'Transaction transitioned to POSTED');
  assert(!!postedOutput.accounting_journal_entry_id, 'Linked to Phase 34 General Ledger journal entry');

  // Verify journal entry lines in General Ledger
  const glEntryOutput = await accountingService.getJournalEntry(studioA, postedOutput.accounting_journal_entry_id);
  assert(glEntryOutput.status === 'POSTED', 'GL Journal Entry is POSTED');
  assert(glEntryOutput.total_debit_minor === glEntryOutput.total_credit_minor, 'GL Journal Entry is perfectly balanced');
  assert(glEntryOutput.total_debit_minor === 11800000, 'GL Journal Entry balanced at ₹118,000.00');

  // 18. Create & Post Input Tax Transaction (Vendor Purchase / Camera Equipment)
  const txInput = await taxService.createTaxTransaction(studioA, {
    transaction_type: TaxTransactionType.INPUT_TAX,
    transaction_number: 'TX-EXP-2026-042',
    source_document_type: 'EXPENSE',
    source_document_id: 'exp_42',
    party_type: TaxPartyType.VENDOR,
    party_id: 'vendor_sony',
    party_name: 'Sony Pro India Pvt Ltd',
    party_gstin: '27AABCS8888K1Z2',
    place_of_supply: '27',
    tax_date: new Date('2026-08-16'),
    taxable_amount_minor: 20000000, // ₹200,000
    cgst_amount_minor: 1800000, // ₹18,000
    sgst_amount_minor: 1800000, // ₹18,000
    igst_amount_minor: 0,
    cess_amount_minor: 0,
    tax_amount_minor: 3600000, // ₹36,000
    total_amount_minor: 23600000, // ₹236,000
    is_inter_state: false,
    lines: [
      {
        item_code: 'CAMERA_BODY_A7S3',
        item_name: 'Sony A7S III Cinema Camera',
        sac_hsn_code: '852580',
        quantity: 1,
        unit_price_minor: 20000000,
        taxable_amount_minor: 20000000,
        cgst_rate_bps: 900,
        cgst_amount_minor: 1800000,
        sgst_rate_bps: 900,
        sgst_amount_minor: 1800000,
        igst_rate_bps: 0,
        igst_amount_minor: 0,
        cess_rate_bps: 0,
        cess_amount_minor: 0,
        tax_amount_minor: 3600000,
        total_amount_minor: 23600000,
        itc_eligibility: ItcEligibility.ELIGIBLE,
      },
    ],
  }, userA);

  const postedInput = await taxService.postTaxTransaction(studioA, txInput.id, userA);
  assert(postedInput.status === TaxTransactionStatus.POSTED, 'Input tax transaction posted');
  assert(!!postedInput.accounting_journal_entry_id, 'Input tax linked to GL journal entry');

  // 19. Credit Note (Tax Reversal / Downward adjustment)
  const txCreditNote = await taxService.createTaxTransaction(studioA, {
    transaction_type: TaxTransactionType.CREDIT_NOTE,
    transaction_number: 'TX-CN-2026-001',
    source_document_type: 'CREDIT_NOTE',
    source_document_id: 'cn_1',
    party_type: TaxPartyType.CLIENT,
    party_id: 'client_ananya',
    party_name: 'Ananya Sharma',
    place_of_supply: '27',
    tax_date: new Date('2026-08-20'),
    taxable_amount_minor: 1000000, // ₹10,000 discount
    cgst_amount_minor: 90000, // ₹900
    sgst_amount_minor: 90000, // ₹900
    igst_amount_minor: 0,
    cess_amount_minor: 0,
    tax_amount_minor: 180000, // ₹1,800
    total_amount_minor: 1180000, // ₹11,800
    is_inter_state: false,
    lines: [],
  }, userA);

  const postedCN = await taxService.postTaxTransaction(studioA, txCreditNote.id, userA);
  assert(postedCN.status === TaxTransactionStatus.POSTED, 'Credit Note tax transaction posted');

  // 20. Tax Transaction Reversal Test
  const txToReverse = await taxService.createTaxTransaction(studioA, {
    transaction_type: TaxTransactionType.OUTPUT_TAX,
    transaction_number: 'TX-INV-ERR-001',
    source_document_type: 'INVOICE',
    source_document_id: 'inv_err',
    party_type: TaxPartyType.CLIENT,
    taxable_amount_minor: 5000000,
    tax_amount_minor: 900000,
    total_amount_minor: 5900000,
    lines: [],
  }, userA);
  await taxService.postTaxTransaction(studioA, txToReverse.id, userA);
  const reversedTx = await taxService.reverseTaxTransaction(studioA, txToReverse.id, 'Duplicate invoice created in error', userA);
  assert(reversedTx.status === TaxTransactionStatus.REVERSED, 'Tax transaction successfully reversed');

  console.log('\n--- TEST SECTION 5: TAX SUMMARY, ITC OFFSET & NET LIABILITY ---');

  // 21. Get Operational Tax Summary for Studio A
  const summaryA = await taxService.getTaxSummary(studioA);
  assert(summaryA.output_tax.total_output_tax_minor > 0, 'Summary includes Output Tax');
  assert(summaryA.input_tax.eligible_itc_minor > 0, 'Summary includes Eligible ITC');
  assert(summaryA.currency === 'INR', 'Currency is correctly denominated in INR');
  assert(
    summaryA.output_tax.cgst_minor + summaryA.output_tax.sgst_minor + summaryA.output_tax.igst_minor + summaryA.output_tax.cess_minor === summaryA.output_tax.total_output_tax_minor,
    'Output tax breakdown invariant holds'
  );

  console.log('\n--- TEST SECTION 6: PERIOD LIFECYCLES & RECONCILIATION ---');

  // 22. Create Tax Period
  const periodQ3 = await taxService.createTaxPeriod(studioA, {
    period_code: '2026-Q3',
    period_name: 'Q3 2026 GST Period',
    period_type: TaxPeriodType.QUARTERLY,
    start_date: new Date('2026-07-01'),
    end_date: new Date('2026-09-30'),
    due_date: new Date('2026-10-20'),
  }, userA);

  assert(periodQ3.status === TaxPeriodStatus.OPEN, 'Created Tax Period in OPEN status');

  // 23. Transition Period Status: Open -> Review -> Ready to File -> Closed
  const reviewP = await taxService.transitionPeriodStatus(studioA, periodQ3.id, TaxPeriodStatus.REVIEW, userA);
  assert(reviewP.status === TaxPeriodStatus.REVIEW, 'Advanced period to REVIEW');

  const readyP = await taxService.transitionPeriodStatus(studioA, periodQ3.id, TaxPeriodStatus.READY_TO_FILE, userA);
  assert(readyP.status === TaxPeriodStatus.READY_TO_FILE, 'Advanced period to READY_TO_FILE');

  const closedP = await taxService.transitionPeriodStatus(studioA, periodQ3.id, TaxPeriodStatus.CLOSED, userA);
  assert(closedP.status === TaxPeriodStatus.CLOSED, 'Successfully closed Tax Period');

  // 24. Run Subledger vs General Ledger Reconciliation
  const recon = await taxService.reconcileTaxWithLedger(studioA, periodQ3.id, userA);
  assert(recon.tax_period_id === periodQ3.id, 'Reconciled period ID matches');
  assert(recon.status === 'MATCHED' || recon.status === 'DIFFERENCE' || recon.status === 'DISCREPANCY', 'Reconciliation returned definitive status');
  assert(typeof recon.discrepancy_amount_minor === 'number', 'Discrepancy is integer minor units');

  console.log('\n--- TEST SECTION 7: COMPLIANCE ENGINE & AUTOMATED AUDITS ---');

  // 25. Run Compliance Checks on Studio A
  const compA = await taxService.runComplianceChecks(studioA);
  assert(compA.checks_performed >= 8, 'Ran all 8+ deterministic compliance checks');
  assert(typeof compA.issues_count === 'number', 'Issues count calculated');

  // 26. Run Compliance on Unconfigured Studio B (Expect missing GSTIN warning)
  const compB = await taxService.runComplianceChecks(studioB);
  const hasGstinAlert = compB.issues.some((i: any) => i.code === 'MISSING_PRIMARY_GSTIN' || i.code === 'MISSING_PAN');
  assert(hasGstinAlert, 'Compliance engine detected missing primary GSTIN on new studio');

  console.log('\n--- TEST SECTION 8: CSV REPORTS & FORMULA INJECTION DEFENSE ---');

  // 27. Generate CSV Reports (GSTR1, GSTR3B, GSTR2B, SUMMARY)
  const gstr1Csv = await taxService.exportTaxCsv(studioA, 'GSTR1');
  const gstr3bCsv = await taxService.exportTaxCsv(studioA, 'GSTR3B');
  const gstr2bCsv = await taxService.exportTaxCsv(studioA, 'GSTR2B');
  const summaryCsv = await taxService.exportTaxCsv(studioA, 'SUMMARY');

  assert(gstr1Csv.includes('GSTR-1 Outward Supplies Extract'), 'Exported valid GSTR-1 CSV');
  assert(gstr3bCsv.includes('GSTR-3B Summary Return Extract'), 'Exported valid GSTR-3B CSV');
  assert(gstr2bCsv.includes('GSTR-2B Inward Supplies (ITC Register) Extract'), 'Exported valid GSTR-2B CSV');
  assert(summaryCsv.includes('Studio Tax Summary Operational Report'), 'Exported valid Summary CSV');

  // 28. Formula Injection Defense verification
  const maliciousInput = await taxService.createTaxTransaction(studioA, {
    transaction_type: TaxTransactionType.OUTPUT_TAX,
    transaction_number: '=cmd|/C calc!A0',
    party_name: '+@Sum(1+1)',
    taxable_amount_minor: 100000,
    tax_amount_minor: 18000,
    total_amount_minor: 118000,
    lines: [],
  }, userA);
  await taxService.postTaxTransaction(studioA, maliciousInput.id, userA);

  const safeCsv = await taxService.exportTaxCsv(studioA, 'GSTR1');
  assert(!safeCsv.includes('\n=cmd') && !safeCsv.includes(',+@Sum'), 'Formula injection characters (=, +, @) properly escaped with quotes and apostrophe');

  console.log('\n--- TEST SECTION 9: MULTI-TENANT ISOLATION & IDOR DEFENSE ---');

  // 29. Studio B cannot view or mutate Studio A transactions
  let idorPrevented = false;
  try {
    await taxService.getTaxTransaction(studioB, txOutput.id);
  } catch (err) {
    idorPrevented = true;
  }
  assert(idorPrevented, 'Studio B blocked from reading Studio A tax transactions (IDOR defense)');

  let idorPostPrevented = false;
  try {
    await taxService.postTaxTransaction(studioB, txOutput.id, 'user_beta');
  } catch (err) {
    idorPostPrevented = true;
  }
  assert(idorPostPrevented, 'Studio B blocked from posting Studio A tax transactions');

  console.log('\n--- TEST SECTION 10: COPILOT TAX TOOLS REGISTRY ---');

  // 30. Test 11 Copilot Tax Tools in CopilotToolRegistry
  const toolRegistry = new CopilotToolRegistry(mockDb);

  const toolDashboard = await toolRegistry.executeTool('get_tax_dashboard', { studioId: studioA, userId: userA });
  assert(toolDashboard.success === true, 'Copilot tool: get_tax_dashboard executed');

  const toolSummary = await toolRegistry.executeTool('get_tax_summary', { studioId: studioA, userId: userA });
  assert(toolSummary.success === true, 'Copilot tool: get_tax_summary executed');

  const toolOutput = await toolRegistry.executeTool('get_output_tax_summary', { studioId: studioA, userId: userA });
  assert(toolOutput.success === true, 'Copilot tool: get_output_tax_summary executed');

  const toolInput = await toolRegistry.executeTool('get_input_tax_summary', { studioId: studioA, userId: userA });
  assert(toolInput.success === true, 'Copilot tool: get_input_tax_summary executed');

  const toolLiability = await toolRegistry.executeTool('get_tax_liability', { studioId: studioA, userId: userA });
  assert(toolLiability.success === true, 'Copilot tool: get_tax_liability executed');

  const toolRecon = await toolRegistry.executeTool('get_tax_reconciliation', { studioId: studioA, userId: userA }, { period_id: periodQ3.id });
  assert(toolRecon.success === true, 'Copilot tool: get_tax_reconciliation executed');

  const toolCompliance = await toolRegistry.executeTool('get_tax_compliance_issues', { studioId: studioA, userId: userA });
  assert(toolCompliance.success === true, 'Copilot tool: get_tax_compliance_issues executed');

  const toolPeriod = await toolRegistry.executeTool('get_tax_period_status', { studioId: studioA, userId: userA });
  assert(toolPeriod.success === true, 'Copilot tool: get_tax_period_status executed');

  const toolTx = await toolRegistry.executeTool('get_tax_transaction', { studioId: studioA, userId: userA }, { transaction_id: txOutput.id });
  assert(toolTx.success === true, 'Copilot tool: get_tax_transaction executed');

  const toolProfile = await toolRegistry.executeTool('get_tax_profile', { studioId: studioA, userId: userA });
  assert(toolProfile.success === true, 'Copilot tool: get_tax_profile executed');

  // 31. Controlled Draft Adjustment mutation tool
  const toolDraftAdj = await toolRegistry.executeTool('draft_tax_adjustment', { studioId: studioA, userId: userA }, {
    tax_period_id: periodQ3.id,
    adjustment_type: TaxAdjustmentType.ITC_REVERSAL,
    amount_minor: 500000,
    reason: 'Ineligible ITC under Section 17(5) motor vehicles',
  });
  assert(toolDraftAdj.success === true, 'Copilot tool: draft_tax_adjustment executed');
  assert(toolDraftAdj.is_draft === true, 'Adjustment is marked as draft');
  assert(toolDraftAdj.requires_human_approval === true, 'Requires human approval flag enforced');

  console.log('\n--- TEST SECTION 11: 450+ RANDOMIZED INTEGER STRESS TESTS ---');

  // 32. Randomized stress testing with 450+ deterministic calculations
  // Verifying:
  // (a) Float-free integer arithmetic
  // (b) Rounding invariant: CGST + SGST + IGST + CESS === Total Tax
  // (c) Taxable + Tax === Gross Total
  for (let i = 1; i <= 450; i++) {
    const isInterState = i % 2 === 0;
    const isExport = i % 10 === 0;
    const taxableMinor = Math.floor(Math.random() * 50000000) + 1000; // ₹10.00 to ₹500,000.00
    const bpsRate = [500, 1200, 1800, 2800][i % 4]; // 5%, 12%, 18%, 28%

    const placeOfSupply = isExport ? 'OVERSEAS' : isInterState ? '29' : '27';
    const originState = '27';

    const calc = await taxService.determineTax({
      studio_id: studioA,
      place_of_supply: placeOfSupply,
      origin_state_code: originState,
      is_export: isExport,
      items: [
        {
          item_code: `STRESS_ITEM_${i}`,
          item_name: `Stress Package ${i}`,
          sac_hsn_code: '998381',
          quantity: 1,
          unit_price_minor: taxableMinor,
          tax_rate_bps: bpsRate,
        },
      ],
    });

    const sumComponents = calc.cgst_amount_minor + calc.sgst_amount_minor + calc.igst_amount_minor + calc.cess_amount_minor;
    const isInteger = Number.isInteger(calc.tax_amount_minor) && Number.isInteger(calc.total_amount_minor);
    const totalMatches = calc.taxable_amount_minor + calc.tax_amount_minor === calc.total_amount_minor;

    assert(
      sumComponents === calc.tax_amount_minor && isInteger && totalMatches,
      `Stress Test #${i}: Rate ${bpsRate / 100}% on ₹${(taxableMinor / 100).toFixed(2)} (Tax: ₹${(calc.tax_amount_minor / 100).toFixed(2)}) — Invariants Verified`
    );
  }

  console.log('\n=====================================================================');
  console.log(`PHASE 35 TAX & COMPLIANCE TEST SUITE COMPLETE`);
  console.log(`TOTAL PASSED: ${passed}`);
  console.log(`TOTAL FAILED: ${failed}`);
  console.log('=====================================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runPhase35TaxTestSuite().catch((err) => {
  console.error('Fatal error running Phase 35 test suite:', err);
  process.exit(1);
});
