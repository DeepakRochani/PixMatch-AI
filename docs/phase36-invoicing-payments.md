# PIXMATCH AI — PHASE 36: STUDIO BUSINESS PAYMENTS, INVOICING & COLLECTIONS 2.0

## Executive Summary
Phase 36 delivers an enterprise-grade commercial billing, payment routing, and collection orchestration infrastructure tailored for high-volume creative studios, photography businesses, and agency networks.

The system natively bridges:
1. **Upstream Commercial Sources**: Contracts & Proposals (Phase 21), Bookings & Shoots (Phase 22), Fulfillment Orders (Phase 26).
2. **Downstream Double-Entry Financial Engine**: Sub-ledgers & Receivables (`StudioReceivable`, Phase 33), General Ledger Journal Entries (`AccountingService`, Phase 34), Automated Tax Engine & HSN/SAC compliance (`StudioTaxService`, Phase 35).
3. **Customer Touchpoints**: CSPRNG-shielded public payment checkout portals (`/pay/[token]`), human-in-the-loop AI Copilot collection tools, and automated reminder queues.

---

## Key Architectural Principles

### 1. Integer Minor Units & Basis Points
- All monetary amounts are strictly persisted and calculated as integer minor units (e.g. paise for INR, cents for USD) to eliminate IEEE 754 floating-point rounding errors.
- Percentage discounts and tax rates utilize basis points (`1000 bps = 10.00%`, `1800 bps = 18.00%`).

### 2. Multi-Gateway Payment Abstraction
- Unified gateway interface (`IPaymentGatewayProvider`) supporting:
  - **Mock Gateway**: Local testing and test assertions.
  - **Stripe Gateway**: Dynamic Payment Intents, hosted Checkout sessions, webhook verification.
  - **Razorpay Gateway**: Orders API, Payment verification, webhook signature HMAC validation.
- Dynamic gateway resolution via `PaymentGatewayFactory` based on studio configuration.

### 3. Public Payment Portal & CSPRNG Security
- Public checkout links (`/pay/[token]`) operate on 256-bit CSPRNG tokens (`crypto.randomBytes(32).toString('hex')`).
- Tokens are hashed with SHA-256 prior to database persistence and lookup to protect against token leakage and unauthorized invoice scanning.

### 4. Downstream GL & Subledger Synchronization
- Every invoice issuance automatically updates accounts receivable sub-ledgers.
- Every successful payment reconciliation generates real-time balanced double-entry General Ledger journal entries (Debit: Cash/Gateway Clearing, Credit: Accounts Receivable / Unearned Revenue).
- Tax lines are synchronized with Phase 35 Tax Engine tables for GSTR-1 and sales tax return audits.

### 5. Copilot AI Integration with Human Gating
- Read-only tools provide deep commercial telemetry to studio staff and AI assistants.
- Mutating tools (`draft_invoice`, `draft_payment_reminder`, `draft_collection_message`) enforce `is_draft: true` and `requires_human_approval: true` to prevent unapproved outbound financial communications or modifications.

---

## Data Model & Entity Relations (`packages/database/prisma/schema.prisma`)

```prisma
model StudioInvoice {
  id                    String                   @id @default(uuid())
  studio_id             String
  client_id             String
  invoice_number        String                   // e.g. INV-2026-0001
  status                StudioInvoiceStatus      @default(DRAFT)
  issue_date            DateTime                 @default(now())
  due_date              DateTime
  currency              String                   @default("INR")
  subtotal_minor        Int                      @default(0)
  tax_minor             Int                      @default(0)
  discount_minor        Int                      @default(0)
  total_minor           Int                      @default(0)
  amount_paid_minor     Int                      @default(0)
  balance_due_minor     Int                      @default(0)
  source_type           StudioInvoiceSourceType?
  source_id             String?
  notes                 String?
  terms                 String?
  lines                 StudioInvoiceLine[]
  payments              StudioInvoicePayment[]
  payment_requests      StudioPaymentRequest[]
  installments          StudioInvoiceInstallment[]
  receipts              StudioInvoiceReceipt[]
  credit_notes          StudioInvoiceCreditNote[]
  debit_notes           StudioInvoiceDebitNote[]
  collection_tasks      StudioCollectionTask[]
  payment_promises      StudioPaymentPromise[]
  audits                StudioInvoiceAudit[]

  @@unique([studio_id, invoice_number])
  @@index([studio_id, client_id, status])
}
```

---

## API Endpoints (`apps/api/src/modules/invoicing/invoicing.controller.ts`)

| Method | Route | Description |
|---|---|---|
| `POST` | `/api/v1/finance/invoicing/invoices` | Create invoice with deterministic lines and tax calculation |
| `GET` | `/api/v1/finance/invoicing/invoices` | List invoices with status, client, date, and search filters |
| `GET` | `/api/v1/finance/invoicing/invoices/:id` | Get comprehensive invoice details with lines, payments, and receipts |
| `POST` | `/api/v1/finance/invoicing/invoices/:id/issue` | Issue invoice, synchronize AR subledger, and log audit |
| `POST` | `/api/v1/finance/invoicing/invoices/:id/void` | Void unpaid invoice with cancellation audit |
| `POST` | `/api/v1/finance/invoicing/invoices/:id/payments` | Record offline/manual payment (Cash, Bank Transfer, Cheque, POS) |
| `POST` | `/api/v1/finance/invoicing/invoices/:id/payment-requests` | Create CSPRNG public checkout link |
| `GET` | `/api/v1/finance/invoicing/pay/:token` | Public payment portal resolution |
| `POST` | `/api/v1/finance/invoicing/pay/:token/process` | Public payment submission via gateway |
| `POST` | `/api/v1/finance/invoicing/invoices/:id/credit-notes` | Issue credit note with balance reduction / refund GL |
| `POST` | `/api/v1/finance/invoicing/invoices/:id/debit-notes` | Issue debit note for additional billable charges |
| `GET` | `/api/v1/finance/invoicing/invoices/:id/pdf` | Generate high-res print-ready HTML5/PDF document |
| `GET` | `/api/v1/finance/invoicing/export/csv` | Safe CSV export with formula injection shielding |
| `GET` | `/api/v1/finance/invoicing/aging-report` | 30/60/90+ day AR aging analytics |
| `POST` | `/api/v1/finance/invoicing/overdue-engine/run` | Run daily overdue status transition and task generator |
| `POST` | `/api/v1/finance/invoicing/collection-tasks` | Create manual collection workflow item |
| `POST` | `/api/v1/finance/invoicing/payment-promises` | Record client promise-to-pay commitment |
| `GET` | `/api/v1/finance/invoicing/settings` | Get studio billing settings, numbering prefixes, and gateway defaults |
| `PUT` | `/api/v1/finance/invoicing/settings` | Update invoice sequences and payment terms |
| `POST` | `/api/v1/finance/invoicing/webhooks/:gateway` | Process idempotent external gateway webhooks |

---

## Test Verification Summary
- **Test File**: `tests/phase36-invoicing-payments.test.ts`
- **Total Assertions**: **582 PASSED | 0 FAILED**
- **Battery Coverage**:
  - Numbering Sequence Integrity
  - Deterministic Line & Subtotal Math
  - Basis Points Percentage Calculations
  - Upstream Source Conversions (Contract, Booking, Order)
  - Invoice Lifecycle State Transitions (DRAFT -> ISSUED -> PARTIALLY_PAID -> PAID / VOID / OVERDUE)
  - CSPRNG Public Payment Requests & Hash Lookup
  - Gateway Mock, Stripe & Razorpay Integrations
  - Partial Payments, Balances & Real-Time Receipt Generation
  - Multi-Stage Installment Schedules
  - Credit Notes, Debit Notes & GL Refunds
  - Overdue Evaluation Engine
  - Collections Tasks & Payment Promises
  - Payment Reminder Templates
  - HTML5/PDF Rendering & Safe CSV Formula Neutralization
  - Idempotent Webhook Processing
  - Strict Multi-Tenant Isolation
  - Copilot AI Registry (12 Invoicing Tools with Human Approval Flags)
  - 450 Minor Unit Calculation Invariant Battery
