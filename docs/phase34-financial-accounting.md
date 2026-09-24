# PIXMATCH AI — PHASE 34
# STUDIO FINANCIAL ACCOUNTING & GENERAL LEDGER 2.0
# TECHNICAL ARCHITECTURE & OPERATIONAL MANUAL

## 1. Executive Summary & Overview

Phase 34 delivers a production-grade, multi-tenant Double-Entry Accounting and General Ledger (GL) system for Pixmatch AI. Operating directly on top of the operational sub-ledgers (Invoices, Payments, Expenses, Fulfillment COGS, Retainer Liabilities, and Sales Taxes), this ledger layer provides real-time financial tracking, mathematical equilibrium, immutable posting workflows, period locking, and full auditability.

---

## 2. Core Accounting Invariants

Every financial event in the system adheres strictly to the following fundamental invariants:

1. **Double-Entry Equilibrium**:
   $$\sum \text{Debits} = \sum \text{Credits}$$
   Every posted journal entry must balance exactly to zero across all debit and credit legs.
2. **Balance Sheet Equation**:
   $$\text{Assets} = \text{Liabilities} + \text{Equity} + (\text{Revenue} - \text{Expenses})$$
3. **Integer Minor-Unit Currency**:
   All monetary values are stored and calculated as non-negative integer cents (minor units), eliminating all floating-point rounding errors.
4. **Immutability of Posted Records**:
   Once a journal entry is marked `POSTED`, its dates, accounts, and lines are permanently read-only.
5. **Reversal Inversion Protocol**:
   Mistakes are corrected by creating an exact inverted counter-entry (`reversal_of_entry_id`) with full audit reason logging, leaving the original record intact for audit trails.
6. **Accounting Period Controls**:
   Posting into `CLOSED` or `LOCKED` periods is rejected. Reopening a closed period requires an explicit, audited reason. Locked periods cannot be reopened.
7. **CSV / Formula Injection Defense**:
   All financial exports sanitize leading formula triggers (`=`, `+`, `-`, `@`, `\t`, `\r`) with single-quote escaping.

---

## 3. Data Models (`schema.prisma`)

```prisma
model StudioChartOfAccount {
  id              String   @id @default(uuid())
  studio_id       String
  code            String   // e.g. "1000", "4000"
  name            String   // e.g. "Cash & Cash Equivalents"
  account_type    String   // ASSET, LIABILITY, EQUITY, REVENUE, COGS, EXPENSE, OTHER_INCOME, OTHER_EXPENSE
  normal_balance  String   // DEBIT or CREDIT
  parent_id       String?
  description     String?
  is_active       Boolean  @default(true)
  is_system       Boolean  @default(false)
  currency        String   @default("USD")
  created_at      DateTime @default(now())
  updated_at      DateTime @updatedAt
}

model StudioAccountingMapping {
  id                String   @id @default(uuid())
  studio_id         String
  event_type        String   // INVOICE_ISSUED, PAYMENT_RECEIVED, EXPENSE_PAID, FULFILLMENT_COGS, etc.
  debit_account_id  String
  credit_account_id String
  description       String?
  is_active         Boolean  @default(true)
  created_at        DateTime @default(now())
  updated_at        DateTime @updatedAt
}

model StudioJournalEntry {
  id                    String   @id @default(uuid())
  studio_id             String
  entry_number          String   // JE-2026-00001
  entry_date            DateTime
  posting_date          DateTime?
  description           String
  reference_type        String?  // INVOICE, PAYMENT, EXPENSE, PAYROLL, MANUAL, etc.
  reference_id          String?
  source_event_type     String?
  status                String   @default("DRAFT") // DRAFT, POSTED, REVERSED, VOID
  total_debit_minor     Int      @default(0)
  total_credit_minor    Int      @default(0)
  currency              String   @default("USD")
  is_manual             Boolean  @default(false)
  created_by            String?
  posted_by             String?
  reversed_at           DateTime?
  reversal_of_entry_id  String?
  idempotency_key       String?
  created_at            DateTime @default(now())
  updated_at            DateTime @updatedAt
}

model StudioJournalEntryLine {
  id                String   @id @default(uuid())
  studio_id         String
  journal_entry_id  String
  account_id        String
  line_order        Int      @default(0)
  description       String?
  debit_minor       Int      @default(0)
  credit_minor      Int      @default(0)
  currency          String   @default("USD")
  exchange_rate     Float    @default(1.0)
  base_debit_minor  Int      @default(0)
  base_credit_minor Int      @default(0)
  created_at        DateTime @default(now())
}

model StudioAccountingPeriod {
  id          String   @id @default(uuid())
  studio_id   String
  name        String   // e.g. "Q3 2026", "September 2026"
  start_date  DateTime
  end_date    DateTime
  status      String   @default("OPEN") // OPEN, CLOSED, LOCKED
  closed_at   DateTime?
  closed_by   String?
  created_at  DateTime @default(now())
  updated_at  DateTime @updatedAt
}

model StudioAccountingAudit {
  id          String   @id @default(uuid())
  studio_id   String
  entity_type String
  entity_id   String
  action      String   // CREATE_ACCOUNT, POST_JOURNAL_ENTRY, REVERSE_JOURNAL_ENTRY, etc.
  actor_id    String?
  old_data    Json?
  new_data    Json?
  reason      String?
  created_at  DateTime @default(now())
}
```

---

## 4. Default Standard Chart of Accounts (COA)

Every studio initializes with GAAP-aligned standard photography studio accounts:
- **1000**: Cash & Cash Equivalents (Asset, Normal: DEBIT)
- **1010**: Operating Bank Account (Asset, Normal: DEBIT)
- **1100**: Accounts Receivable (Asset, Normal: DEBIT)
- **1200**: Studio Photography Equipment (Asset, Normal: DEBIT)
- **1210**: Accumulated Depreciation - Equipment (Asset/Contra, Normal: CREDIT)
- **2000**: Accounts Payable (Liability, Normal: CREDIT)
- **2100**: Unearned Client Retainers (Liability, Normal: CREDIT)
- **2200**: Sales Tax Payable (Liability, Normal: CREDIT)
- **3000**: Owner's Capital / Equity (Equity, Normal: CREDIT)
- **3100**: Retained Earnings (Equity, Normal: CREDIT)
- **4000**: Photography Session Revenue (Revenue, Normal: CREDIT)
- **4100**: Print & Album Sales Revenue (Revenue, Normal: CREDIT)
- **4200**: Commercial Licensing Revenue (Revenue, Normal: CREDIT)
- **5000**: Lab Print & Album Production Cost (COGS, Normal: DEBIT)
- **5100**: Contractor & Second Shooter Labor (COGS, Normal: DEBIT)
- **6000**: Studio Rent & Facilities (Expense, Normal: DEBIT)
- **6100**: Software Subscriptions & AI Compute (Expense, Normal: DEBIT)
- **6200**: Marketing & Client Acquisition (Expense, Normal: DEBIT)

---

## 5. API Endpoints

All endpoints are mounted at `/api/finance/accounting` and `/api/v1/finance/accounting`:
- `GET /accounts` & `POST /accounts`: Manage Chart of Accounts
- `GET /mappings` & `PUT /mappings/:eventType`: Configure event routing
- `GET /journal-entries` & `POST /journal-entries`: List and draft journal entries
- `GET /journal-entries/:id` & `PUT /journal-entries/:id/lines`: View and edit draft lines
- `POST /journal-entries/:id/post`: Post draft entry to ledger
- `POST /journal-entries/:id/reverse`: Reverse posted entry with inversion
- `POST /journal-entries/:id/void`: Void draft entry
- `GET /periods` & `POST /periods`: Manage accounting periods
- `POST /periods/:id/close`, `/reopen`, `/lock`: Period lifecycle controls
- `POST /opening-balance`: Setup historical opening balances
- `GET /trial-balance`: Real-time Trial Balance report
- `GET /general-ledger`: Detailed general ledger with running balances
- `GET /accounts/:id/activity`: Single account ledger activity
- `GET /reports/profit-loss`: Revenue, COGS, Gross Margin, Operating Expenses, Net Income
- `GET /reports/balance-sheet`: Assets, Liabilities, Owner Equity, Retained Earnings
- `GET /reports/export/csv`: Formula-sanitized CSV export

---

## 6. Copilot Tool Registry (11 Tools)

Registered in `apps/api/src/modules/copilot/copilot-tool-registry.ts`:
1. `get_chart_of_accounts`: Read-only COA lookup
2. `get_trial_balance`: Read-only trial balance status
3. `get_general_ledger`: Read-only general ledger report
4. `get_profit_and_loss`: Read-only P&L statement
5. `get_balance_sheet`: Read-only Balance Sheet report
6. `get_account_activity`: Read-only account transactions
7. `list_accounting_periods`: Read-only period listing
8. `list_journal_entries`: Read-only journal entry lookup
9. `get_journal_entry`: Read-only single journal entry detail
10. `get_accounting_mappings`: Read-only subledger mapping lookup
11. `draft_journal_entry`: Mutation tool for drafting journal entries (**Human confirmation strictly required before posting**; autonomous posting/reversal blocked).

---

## 7. Frontend User Interface

Located in `apps/web/src/app/dashboard/finance/accounting/`:
- `/dashboard/finance/accounting`: Overview & financial equilibrium KPI widgets
- `/dashboard/finance/accounting/chart-of-accounts`: Interactive COA tree & drawer
- `/dashboard/finance/accounting/journal-entries`: Journal entry filterable table & detail
- `/dashboard/finance/accounting/journal-entries/new`: Interactive double-entry composer
- `/dashboard/finance/accounting/trial-balance`: Live balancing visualizer with delta indicators
- `/dashboard/finance/accounting/general-ledger`: Full ledger register with running balances
- `/dashboard/finance/accounting/profit-loss`: Multi-step P&L with margin analytics
- `/dashboard/finance/accounting/balance-sheet`: Balanced Assets vs. Liabilities + Equity sheet
- `/dashboard/finance/accounting/periods`: Period locking & closing controls
- `/dashboard/finance/accounting/settings`: Operational event mapping configurator
- `AccountingNavTabs.tsx`: Unified tabbed navigation bar for all accounting views
- Integrated with `FinanceNavTabs.tsx` for seamless navigation across Invoices, Expenses, Payroll, and Ledger.
