# PIXMATCH AI — PHASE 33: STUDIO FINANCIAL OPERATIONS & PROFITABILITY 2.0

## 1. Executive Overview

Phase 33 introduces **Studio Financial Operations & Profitability 2.0** for Pixmatch AI. This subsystem provides comprehensive, enterprise-grade financial accounting, accounts receivable (AR), accounts payable (AP), vendor lifecycle management, expense approval workflows, real-time job/booking/project profitability tracking, cash flow forecasting, multi-account reconciliation, and automated financial reporting.

### Core Architectural Guarantees:
- **Integer Minor Units (Cents)**: All monetary values are strictly represented and calculated in integer cents to completely avoid floating-point rounding errors and precision degradation.
- **Strict Multi-Tenant Isolation**: Studio financial accounts, expenses, vendors, receivables, payables, budgets, audit records, and reconciliations are scoped strictly by `studio_id`. Cross-studio access is denied across all endpoints.
- **Client Portal Isolation**: Clients in the portal never have access to studio internal expenses, vendor records, profit margins, cost of goods sold (COGS), studio accounts, or internal financial notes.
- **Formula & CSV Injection Resistance**: Export engines sanitize cells starting with `=`, `+`, `-`, `@`, `\t`, `\r` with single-quote escaping (`'`).
- **Idempotency & Concurrency Safety**: Expense creation, expense payment, receivable generation, and reconciliation operations utilize transactional locks and idempotency keys to eliminate double debits or duplicate financial entries.
- **Payment Reconciliation & Auditing**: Strict audit trail on every financial status transition with immutable logging (`StudioFinancialAudit`).

---

## 2. Database Models & Schema

The following Prisma models power Phase 33 in `packages/database/prisma/schema.prisma`:

1. **`StudioFinancialAccount`**: Bank, credit card, cash, payment processor accounts with balance tracking, routing details, and status.
2. **`StudioExpenseCategory`**: Tax-deductible categorization, default GL codes, and active status.
3. **`StudioVendor`**: Vendor and contractor profiles, tax IDs, payment terms, contact details, and expense linkage.
4. **`StudioExpense`**: Core expense records with approval state machines (`DRAFT`, `PENDING_APPROVAL`, `APPROVED`, `PAID`, `VOID`, `REJECTED`), tax amount, receipt URL, project/booking linkage, and anti-self-approval enforcement.
5. **`StudioExpensePayment`**: Record of ledger disbursements against approved expenses, tracking source account, method, transaction reference, and idempotency key.
6. **`StudioReceivable`**: Invoices and receivables derived from contracts (Phase 21), bookings (Phase 22), and fulfillment orders (Phase 26) with aging buckets (`CURRENT`, `OVERDUE_30`, `OVERDUE_60`, `OVERDUE_90_PLUS`).
7. **`StudioPayable`**: Unpaid bills and vendor liabilities with due dates, payment status, and aging.
8. **`StudioBudget`**: Periodic and annual studio budgets by department/category.
9. **`StudioBudgetEntry`**: Granular budget lines with planned vs. actual variance calculations.
10. **`StudioFinancialAudit`**: Immutable audit log of all financial entity creations, modifications, approvals, payments, and void actions.
11. **`StudioFinancialReconciliation`**: Bank statement reconciliation engine matching ledger entries against bank closing balances.

---

## 3. Financial Source-of-Truth Integrations

Phase 33 bridges existing system operations into a unified financial ledger without duplicating authoritative sources:

- **Phase 18 (Business Intelligence)**: Receives aggregated revenue, expense totals, and net margin data from Phase 33 ledger records.
- **Phase 21 (Contracts, Proposals & Bookings)**: Invoices and milestone payment schedules automatically generate `StudioReceivable` records upon contract acceptance.
- **Phase 22 (Studio Scheduling & Calendar)**: Booking deposits and session balances link directly to `booking_id` on receivables.
- **Phase 26 (Fulfillment & Print Operations)**: Lab wholesale print costs and shipping fees register as COGS expenses, while client print order revenues register as receivables, providing true end-to-end margin tracking per order.

---

## 4. API Endpoints & Routes

Registered under `/api/finance` and `/api/v1/finance`:

### Accounts
- `GET /api/finance/accounts` - List studio financial accounts
- `POST /api/finance/accounts` - Create a financial account
- `GET /api/finance/accounts/:id` - Get account details
- `PATCH /api/finance/accounts/:id` - Update account metadata

### Expense Categories & Vendors
- `GET /api/finance/categories` - List expense categories
- `POST /api/finance/categories` - Create expense category
- `GET /api/finance/vendors` - List vendors
- `POST /api/finance/vendors` - Create vendor
- `PATCH /api/finance/vendors/:id` - Update vendor

### Expenses & Approvals
- `GET /api/finance/expenses` - List expenses with filters
- `POST /api/finance/expenses` - Submit expense
- `GET /api/finance/expenses/:id` - Get expense details
- `POST /api/finance/expenses/:id/approve` - Approve expense (anti-self-approval enforced)
- `POST /api/finance/expenses/:id/reject` - Reject expense
- `POST /api/finance/expenses/:id/pay` - Record payment against expense (idempotent)
- `POST /api/finance/expenses/:id/void` - Void expense

### Receivables & Payables
- `GET /api/finance/receivables` - List receivables with aging breakdown
- `POST /api/finance/receivables` - Create receivable
- `POST /api/finance/receivables/:id/pay` - Record receivable payment
- `GET /api/finance/payables` - List payables with aging breakdown
- `POST /api/finance/payables` - Create payable

### Budgets & Profitability
- `GET /api/finance/budgets` - List budgets
- `POST /api/finance/budgets` - Create budget
- `GET /api/finance/profitability/project/:projectId` - Calculate project profitability & net margin
- `GET /api/finance/profitability/booking/:bookingId` - Calculate booking profitability
- `GET /api/finance/cash-flow` - Get cash flow analysis & forecast

### Reconciliation & Reports
- `POST /api/finance/reconciliation` - Start reconciliation session
- `POST /api/finance/reconciliation/:id/complete` - Reconcile statement balance
- `GET /api/finance/reports/pnl` - Generate Profit & Loss statement
- `GET /api/finance/reports/export` - Export financial records as sanitized CSV

---

## 5. Copilot Tool Registry

The following 10 Copilot tools are registered and verified in `apps/api/src/modules/copilot/copilot-tool-registry.ts`:

1. `get_financial_dashboard` - High-level metrics (income, expenses, net profit, cash balance, unpaid invoices).
2. `get_outstanding_receivables` - Lists unpaid receivables with client information and aging.
3. `get_overdue_receivables` - Filters specifically for past-due receivables.
4. `get_upcoming_payables` - Lists upcoming vendor bills and liabilities.
5. `get_project_profitability` - Detailed revenue vs. direct labor + COGS expenses + margin % for a project.
6. `get_cash_flow_summary` - 30/60/90 day cash inflows, outflows, and projected net runway.
7. `get_expense_summary` - Expense breakdown categorized by tax-deductible categories.
8. `get_budget_variance` - Compares planned budget vs. real ledger spending.
9. `search_financial_transactions` - Full-text transaction lookup across payments, expenses, and invoices.
10. `draft_payment_followup` - Generates draft client reminder messages (`is_draft: true`, `requires_human_approval: true`).

---

## 6. Frontend Dashboard Routes

Located under `apps/web/src/app/dashboard/finance/`:

- `/dashboard/finance` - Overview & KPIs
- `/dashboard/finance/accounts` - Bank & processor account management
- `/dashboard/finance/expenses` - Expense submission, receipt uploads, approval queues
- `/dashboard/finance/vendors` - Vendor directory & 1099 tracking
- `/dashboard/finance/receivables` - Invoices, aging tables, payment recording
- `/dashboard/finance/payables` - Vendor bills & due date tracking
- `/dashboard/finance/budgets` - Budget planning & variance tracking
- `/dashboard/finance/profitability` - Job & project margin analytics
- `/dashboard/finance/cash-flow` - Runway, inflows, outflows, projections
- `/dashboard/finance/reconciliation` - Bank statement reconciliation
- `/dashboard/finance/reports` - P&L generation & CSV export

All routes share the responsive navigation bar component `FinanceNavTabs.tsx` supporting desktop, tablet, and mobile layouts.

---

## 7. Verification & Regression Results

- **Phase 33 Financial Operations Suite**: 485 Passed, 0 Failed
- **Phase 32 Team Collaboration Suite**: 450 Passed, 0 Failed
- **Phase 31 Team Workforce Suite**: 523 Passed, 0 Failed
- **Phase 30.1 Client Experience Hardening**: 348 Passed, 0 Failed
- **Phase 30 Client Experience**: 331 Passed, 0 Failed
- **Phase 29 CRM & Client 360**: 338 Passed, 0 Failed
- **Phase 28 Client Communication**: 291 Passed, 0 Failed
- **Prisma Schema Validation**: Valid 🚀
- **Web App Typecheck**: 0 Errors
