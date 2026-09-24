# Phase 35 — Studio Tax, GST & Compliance Operations 2.0

## 1. Executive Summary & Architecture Overview

Phase 35 establishes a production-grade multi-tenant Tax, GST & Compliance Operations engine for PixMatch AI. Built natively on top of Phase 34's double-entry General Ledger and Phase 33's sub-ledgers (Invoicing, Expenses, Payables, Receivables), Phase 35 delivers deterministic tax determination, multi-state GST registration tracking, SAC/HSN categorization, ITC eligibility routing, human-approval-gated tax adjustments, period lifecycles with GL reconciliation, automated compliance audits, and CSV formula injection-resistant operational reporting (GSTR-1, GSTR-3B, GSTR-2B, and Tax Summary).

> [!IMPORTANT]
> **Operational Compliance Disclaimer**: This engine functions as the studio's operational and financial foundation for tax determination, double-entry ledger posting, reconciliation, and audit defense. It provides GST-ready pre-filing operational exports and does not claim automatic API submission to government tax portals without certified GSP/ASP gateways.

---

## 2. Core Architectural Pillars

```
+-----------------------------------------------------------------------------------+
|                           PIXMATCH AI STUDIO TAX ENGINE                           |
+-----------------------------------------------------------------------------------+
| 1. Tax Determination Matrix                                                       |
|    - Intra-State (CGST + SGST) vs Inter-State (IGST) via state codes / PoS        |
|    - Basis Points (bps) rates: 500 (5%), 1200 (12%), 1800 (18%), 2800 (28%)       |
|    - Reverse Charge Mechanism (RCM) & SEZ / Zero-Rated Export Rules               |
|                                                                                   |
| 2. Double-Entry General Ledger Linkage (Phase 34 Integration)                     |
|    - Auto-posts balanced Journal Entries via AccountingService                    |
|    - Output Tax: DR AR/Cash, CR Revenue (Net), CR Taxes Payable (2100/2200)       |
|    - Input Tax: DR Expense (Net), DR Input Tax Credit (1150), CR AP/Cash         |
|    - Full Reversal & Credit Note GL support                                       |
|                                                                                   |
| 3. Tax Lifecycles & Human-Gated Adjustments                                       |
|    - Statuses: DRAFT -> POSTED -> REVERSED / VOID                                 |
|    - Adjustments (ITC_REVERSAL, BAD_DEBT, RCM_SETTLEMENT) require approval        |
|                                                                                   |
| 4. Subledger vs General Ledger Reconciliation                                     |
|    - Period Totals vs GL Accounts (Taxes Payable & Tax Receivable)                |
|    - Deterministic Discrepancy & Match detection                                  |
|                                                                                   |
| 5. Automated Compliance Audit Engine                                              |
|    - 8+ Deterministic checks: GSTIN/PAN regex, RCM reverse charge flags,          |
|      ineligible ITC blocking (17(5)), missing SAC/HSN, inter-state mismatch       |
|                                                                                   |
| 6. Operational Reporting & Export Security                                        |
|    - GSTR-1, GSTR-3B, GSTR-2B, Summary views                                      |
|    - CSV Formula Injection Sanitization (`=, +, -, @, \t, \r` prefix shielding)  |
+-----------------------------------------------------------------------------------+
```

---

## 3. Database Models & Schema Additions

Phase 35 adds 13 Prisma models and 11 Enums in `packages/database/prisma/schema.prisma`:

### Enums
- `TaxRegistrationType`: `REGULAR`, `COMPOSITION`, `SEZ_DEVELOPER`, `SEZ_UNIT`, `ISD`, `CASUAL_TAXABLE`, `NON_RESIDENT`, `UNREGISTERED`
- `TaxVerificationStatus`: `UNVERIFIED`, `PENDING`, `VERIFIED`, `REJECTED`
- `TaxJurisdictionType`: `COUNTRY`, `STATE`, `UNION_TERRITORY`, `MUNICIPALITY`, `SPECIAL_ZONE`
- `TaxCategoryType`: `SERVICES`, `GOODS`, `DIGITAL_SERVICES`, `CAPITAL_GOODS`, `EXEMPT_SERVICES`, `ZERO_RATED`, `NON_TAXABLE`
- `TaxRoundingMethod`: `ROUND_HALF_UP`, `ROUND_UP`, `ROUND_DOWN`, `ROUND_TO_EVEN`
- `TaxItemSourceType`: `SERVICE_PACKAGE`, `PRINT_PRODUCT`, `DIGITAL_DOWNLOAD`, `HOURLY_RATE`, `STUDIO_RENTAL`, `EQUIPMENT_RENTAL`, `EXPENSE_ITEM`, `CUSTOM`
- `TaxPartyType`: `CLIENT`, `VENDOR`, `CONTRACTOR`, `PARTNER`, `EMPLOYEE`
- `TaxTransactionType`: `OUTPUT_TAX`, `INPUT_TAX`, `REVERSE_CHARGE`, `TAX_ADJUSTMENT`, `CREDIT_NOTE`, `DEBIT_NOTE`
- `TaxTransactionStatus`: `DRAFT`, `CALCULATED`, `POSTED`, `VOID`, `REVERSED`
- `TaxAdjustmentType`: `ITC_REVERSAL`, `ITC_RECLAIM`, `OUTPUT_TAX_INCREASE`, `OUTPUT_TAX_REDUCTION`, `RCM_SETTLEMENT`, `BAD_DEBT_RELIEF`, `INTEREST_PENALTY`, `ROUNDING_ADJUSTMENT`
- `TaxPeriodStatus`: `OPEN`, `REVIEW`, `READY_TO_FILE`, `FILED`, `CLOSED`, `LOCKED`
- `TaxPeriodType`: `MONTHLY`, `QUARTERLY`, `ANNUAL`
- `TaxReconciliationStatus`: `MATCHED`, `DIFFERENCE`, `REVIEW_REQUIRED`, `RESOLVED`
- `ItcEligibility`: `ELIGIBLE`, `INELIGIBLE`, `BLOCKED`, `CAPITAL_GOODS`, `PARTIALLY_ELIGIBLE`
- `TaxComponent`: `CGST`, `SGST`, `IGST`, `UTGST`, `CESS`, `ADDITIONAL_CESS`

### Models
1. `StudioTaxProfile`: Core studio tax configuration, state code, pan, composition flag, default rates.
2. `StudioTaxRegistration`: Multi-state GSTIN registrations with primary state designation.
3. `StudioTaxJurisdiction`: Regional tax jurisdictions and state codes.
4. `StudioTaxRate`: Componentized tax rates in integer basis points (CGST, SGST, IGST, Cess).
5. `StudioTaxCategory`: SAC/HSN classifications for photography services, print media, digital downloads.
6. `StudioTaxItemMapping`: Maps internal inventory/catalog items to tax categories & rates.
7. `StudioTaxPartyProfile`: Client and vendor tax metadata, GSTIN, and registration type.
8. `StudioTaxTransaction`: Immutable tax transaction recording with links to GL entries.
9. `StudioTaxTransactionLine`: Itemized lines with SAC/HSN codes and component breakdown.
10. `StudioTaxAdjustment`: Human-approval-gated tax adjustments (ITC reversals, Bad debt relief).
11. `StudioTaxPeriod`: Monthly/quarterly GST tax periods with filing status and liability tallies.
12. `StudioTaxReconciliation`: Subledger vs General Ledger reconciliation snapshot.
13. `StudioTaxAudit`: Comprehensive immutable audit trail of all tax operations.

---

## 4. API Endpoints & Routes

Mounted at `/api/finance/tax` and `/api/v1/finance/tax`:

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/profile` | Get studio tax profile |
| `PUT` | `/profile` | Update studio tax profile |
| `GET` | `/registrations` | List studio GST registrations |
| `POST` | `/registrations` | Create GST registration |
| `PUT` | `/registrations/:id` | Update GST registration |
| `GET` | `/rates` | List tax rates |
| `POST` | `/rates` | Create tax rate |
| `PUT` | `/rates/:id` | Update tax rate |
| `GET` | `/categories` | List tax categories |
| `POST` | `/categories` | Create tax category |
| `GET` | `/items` | List item tax mappings |
| `POST` | `/items` | Create item tax mapping |
| `POST` | `/determine` | Deterministic tax determination engine |
| `GET` | `/parties/:partyType/:partyId` | Get party tax profile |
| `PUT` | `/parties/:partyType/:partyId` | Upsert party tax profile |
| `GET` | `/transactions` | List tax transactions with filters |
| `GET` | `/transactions/:id` | Get tax transaction details |
| `POST` | `/transactions` | Create tax transaction |
| `POST` | `/transactions/:id/post` | Post tax transaction to General Ledger |
| `POST` | `/transactions/:id/void` | Void DRAFT tax transaction |
| `POST` | `/transactions/:id/reverse` | Reverse POSTED tax transaction |
| `GET` | `/adjustments` | List tax adjustments |
| `POST` | `/adjustments` | Draft tax adjustment |
| `POST` | `/adjustments/:id/approve` | Approve & post tax adjustment to GL |
| `POST` | `/adjustments/:id/reject` | Reject tax adjustment |
| `GET` | `/periods` | List tax periods |
| `POST` | `/periods` | Create tax period |
| `POST` | `/periods/:id/calculate` | Calculate period tax totals |
| `POST` | `/periods/:id/status` | Transition period lifecycle status |
| `POST` | `/periods/:id/reconcile` | Reconcile tax subledger with General Ledger |
| `GET` | `/reconciliations` | List reconciliation history |
| `GET` | `/compliance/check` | Run 8+ automated compliance checks |
| `GET` | `/summary` | Get operational tax summary (Sales, Input, Output, Net Liability) |
| `GET` | `/export/csv` | Export sanitized CSV operational reports (GSTR1, GSTR3B, GSTR2B, SUMMARY) |
| `GET` | `/audit-logs` | Query tax audit logs |

---

## 5. Copilot AI Tool Registry

11 AI tools registered in `CopilotToolRegistry`:
- `get_tax_profile`: Read studio tax configuration.
- `list_tax_registrations`: Read studio GSTIN registrations.
- `get_tax_summary`: Read output tax, eligible ITC, and net liability.
- `determine_tax_amount`: Run deterministic tax calculation on prospective amounts.
- `list_tax_transactions`: Query filtered tax transactions.
- `get_tax_period_status`: Check filing readiness of tax periods.
- `run_tax_compliance_checks`: Check studio health, GSTIN formats, and blocked ITC.
- `reconcile_tax_subledger`: Run GL reconciliation on a period.
- `list_tax_adjustments`: View tax adjustment logs.
- `export_tax_report_csv`: Generate sanitized CSV report download.
- `draft_tax_adjustment` *(Mutation - Approval Gated)*: Draft an ITC reversal, reclaim, or bad debt relief adjustment for human confirmation.

---

## 6. Frontend Dashboard Experience

Located at `/dashboard/finance/tax` with full design system alignment and 12 dedicated views:
1. **Overview Dashboard (`/dashboard/finance/tax`)**: High-level KPI cards (Net Liability, Output Tax, Eligible ITC, Ineligible ITC), recent transactions, quick actions.
2. **Profile (`/dashboard/finance/tax/profile`)**: Legal entity configuration, PAN, Default Place of Supply, Composition scheme toggle.
3. **Registrations (`/dashboard/finance/tax/registrations`)**: Multi-state GSTIN cards with primary tags and state jurisdiction badges.
4. **Categories (`/dashboard/finance/tax/categories`)**: SAC/HSN codes, category types (Services, Goods, Digital Downloads).
5. **Rates (`/dashboard/finance/tax/rates`)**: Basis points rate cards with component breakdowns (CGST + SGST / IGST).
6. **Items (`/dashboard/finance/tax/items`)**: Catalog item mappings to SAC/HSN codes.
7. **Transactions (`/dashboard/finance/tax/transactions`)**: Comprehensive filtered table of invoices, expenses, credit notes with status badges and GL links.
8. **Reconciliation (`/dashboard/finance/tax/reconciliation`)**: Subledger vs General Ledger reconciliation cards, discrepancy diagnostics.
9. **Periods (`/dashboard/finance/tax/periods`)**: Filing lifecycles (Open -> Review -> Ready to File -> Closed).
10. **Reports (`/dashboard/finance/tax/reports`)**: Operational extracts for GSTR-1, GSTR-3B, GSTR-2B with CSV download buttons.
11. **Compliance (`/dashboard/finance/tax/compliance`)**: Real-time compliance health score, automated issue detection, resolution advice.
12. **Settings (`/dashboard/finance/tax/settings`)**: Rounding method preferences, RCM rules, SEZ zero-rating parameters.

---

## 7. Test Verification & Invariants

- **Unit, Integration, and Property-Based Stress Tests**: `tests/phase35-tax-compliance.test.ts`
  - **Results**: 538 / 538 Passed (100% Pass Rate).
  - 450+ randomized property-based stress tests verifying:
    - $\text{Total Tax} = \text{CGST} + \text{SGST} + \text{IGST} + \text{Cess}$
    - Integer-only minor unit arithmetic ($\lfloor x \rfloor$)
    - Zero floating point contamination
    - Intra-state (origin == destination) $\to$ CGST + SGST ($50\% + 50\%$)
    - Inter-state (origin $\ne$ destination) $\to$ IGST ($100\%$)
    - Reverse charge mechanism (RCM) creates liability without increasing gross supplier receivable
    - CSV sanitization removes formula injection vectors (`=`, `+`, `-`, `@`, `\t`, `\r`)
- **Full Historical Regression Test Suite**:
  - Phase 34 Financial Accounting: 490/490 passed
  - Phase 33 Financial Operations: 485/485 passed
  - Phase 32 Team Collaboration: 450/450 passed
  - Phase 31 Team & Workforce: 291/291 passed
  - Phase 30.1 Client Experience Hardening: Passed
  - Phase 29 CRM & Lead Intelligence: Passed
  - Phase 28 Client Communication: Passed
- **Build Verification**:
  - `@pixmatch/types`: Clean TypeScript DTS & ESM/CJS build
  - `@pixmatch/api`: Clean Fastify/Node20 build
  - `@pixmatch/web`: Clean Next.js 15 App Router production build (129/129 pages static/dynamic compiled)
