# Phase 18: Studio Business Intelligence & Revenue Intelligence

## 1. Overview & Vision
Phase 18 introduces an enterprise-grade **Studio Business Intelligence & Revenue Intelligence** engine to PixMatch AI. It empowers professional photography studios to track client earnings, manage operational and package expenses, benchmark package profit margins, forecast cash flow using deterministic statistical algorithms, and establish business milestones.

---

## 2. Core Architecture Principles

### 2.1. Strict Separation: Platform Billing vs Studio Business Revenue
- **Platform Billing (SaaS)**: PixMatch subscription plans (e.g. Free, Starter, Pro, Studio Enterprise, add-ons) and usage billing.
- **Studio Business Revenue**: The commercial earnings of the photographer (e.g. Wedding packages, print sales, commercial licenses, headshots) and operational expenses (subcontractors, studio rental, lab printing, travel).
- The two financial domains never collide in queries or metrics.

### 2.2. Zero Fake Financial Data Guarantee
- **No Synthetic Inference**: PixMatch AI never fabricates or estimates revenue from gallery views, downloads, favorites, or photo counts.
- If a studio has zero recorded transactions, `has_financial_data` is strictly `false`, all aggregates are returned as `0.00`, and the UI displays `"Business revenue data not available yet"` with an actionable prompt to record transactions.

### 2.3. Deterministic Statistical Forecasting
- **Zero LLM Numerical Hallucination**: AI models and Copilot never generate or invent financial forecasts.
- Projections use a combination of **Weighted Linear Trend Regression** and **Weighted Moving Average** over historical monthly intervals.
- Confidence intervals (Upper/Lower bounds) are calculated from historical standard deviations.
- If fewer than 3 historical periods are available, the engine reports `LOW` confidence score and flags `"Insufficient historical data"`.

### 2.4. Comprehensive Anomaly Detection
- Compares recent monthly metrics against a **3-month rolling baseline**.
- Triggers actionable insight events with severity ratings (`INFO`, `WARNING`, `CRITICAL`):
  - `REVENUE_DROP`: Revenue drops by >25% compared to baseline.
  - `REVENUE_SPIKE`: Revenue surges by >35% compared to baseline.
  - `EXPENSE_SURGE`: Operating expenses increase by >30% compared to baseline.
  - `HIGH_MARGIN_SERVICE`: High profit margins (>70%) identified for promotion.
  - `TURNAROUND_INCREASE`: Delivery times exceed average by >50%.

### 2.5. Multi-Tenant Isolation & IDOR Defenses
- All queries, mutations, goal tracking, forecasts, and insights require strict `studio_id` matching in database queries.
- Linking client profiles (`client_id`) or galleries (`gallery_id`) belonging to other studios is rejected with `404/403`.

### 2.6. Financial Mutations & Soft-Delete Voiding Audit Trail
- **Zero Hard Deletes**: Financial transactions are immutable once created.
- Voiding a transaction requires a non-empty `void_reason`.
- Voided transactions are preserved with `is_void = true`, `void_reason`, `voided_at`, and `voided_by`.
- All operations (`CREATE`, `UPDATE`, `VOID`, `CREATE_GOAL`, `UPDATE_GOAL`, `DELETE_GOAL`) write immutable entries into `StudioBusinessAuditLog`.

### 2.7. Formula-Safe CSV Export
- Prepending single quote `'` to fields starting with dangerous formula triggers (`=`, `+`, `-`, `@`, `\t`, `\r`) to protect photographers against spreadsheet formula injection (CSV Injection / Formula Injection).

---

## 3. Database Schema

```prisma
// Phase 18: Studio Business Intelligence

enum BusinessTransactionType {
  INCOME
  EXPENSE
  REFUND
}

enum BusinessTransactionStatus {
  PENDING
  COMPLETED
  CANCELLED
  FAILED
}

enum BusinessGoalPeriodType {
  MONTHLY
  QUARTERLY
  YEARLY
  CUSTOM
}

enum BusinessGoalMetricType {
  REVENUE
  PROFIT
  BOOKINGS_COUNT
  GALLERIES_DELIVERED
  AVERAGE_ORDER_VALUE
}

enum BusinessGoalStatus {
  IN_PROGRESS
  ACHIEVED
  MISSED
  CANCELLED
}

enum BusinessInsightType {
  REVENUE_DROP
  REVENUE_SPIKE
  EXPENSE_SURGE
  UNPAID_INVOICE_AGING
  TURNAROUND_INCREASE
  ENGAGEMENT_DIP
  HIGH_MARGIN_SERVICE
  LOW_MARGIN_SERVICE
}

enum BusinessInsightSeverity {
  INFO
  WARNING
  CRITICAL
}

enum BusinessInsightStatus {
  ACTIVE
  ACKNOWLEDGED
  RESOLVED
  DISMISSED
}

enum BusinessForecastMetric {
  REVENUE
  EXPENSES
  NET_PROFIT
  BOOKINGS
}

enum BusinessForecastPeriod {
  NEXT_MONTH
  NEXT_QUARTER
  NEXT_YEAR
}

enum BusinessForecastConfidence {
  HIGH
  MEDIUM
  LOW
}

model StudioBusinessTransaction {
  id               String                    @id @default(uuid())
  studio_id        String
  studio           Studio                    @relation(fields: [studio_id], references: [id], onDelete: Cascade)
  gallery_id       String?
  gallery          Gallery?                  @relation(fields: [gallery_id], references: [id], onDelete: SetNull)
  client_id        String?
  client           Client?                   @relation(fields: [client_id], references: [id], onDelete: SetNull)
  
  type             BusinessTransactionType   @default(INCOME)
  category         String
  amount           Float
  currency         String                    @default("USD")
  status           BusinessTransactionStatus @default(COMPLETED)
  payment_method   String?
  reference_number String?
  transaction_date DateTime                  @default(now())
  description      String?
  service_type     String?
  notes            String?
  tags             String[]                  @default([])
  
  is_void          Boolean                   @default(false)
  void_reason      String?
  voided_at        DateTime?
  voided_by        String?
  
  created_by       String?
  created_at       DateTime                  @default(now())
  updated_at       DateTime                  @updatedAt

  audit_logs       StudioBusinessAuditLog[]

  @@index([studio_id, transaction_date])
  @@index([studio_id, type])
  @@index([studio_id, category])
  @@index([studio_id, client_id])
  @@index([studio_id, gallery_id])
  @@index([studio_id, is_void])
}

model StudioBusinessGoal {
  id                 String                 @id @default(uuid())
  studio_id          String
  studio             Studio                 @relation(fields: [studio_id], references: [id], onDelete: Cascade)
  title              String
  metric_type        BusinessGoalMetricType
  target_value       Float
  current_value      Float                  @default(0)
  currency           String                 @default("USD")
  period_type        BusinessGoalPeriodType @default(MONTHLY)
  start_date         DateTime
  end_date           DateTime
  status             BusinessGoalStatus     @default(IN_PROGRESS)
  achieved_at        DateTime?
  progress_pct       Float                  @default(0)
  notes              String?
  created_at         DateTime               @default(now())
  updated_at         DateTime               @updatedAt

  @@index([studio_id, status])
  @@index([studio_id, metric_type])
}

model StudioBusinessInsight {
  id                 String                  @id @default(uuid())
  studio_id          String
  studio             Studio                  @relation(fields: [studio_id], references: [id], onDelete: Cascade)
  insight_type       BusinessInsightType
  title              String
  description        String
  severity           BusinessInsightSeverity @default(INFO)
  status             BusinessInsightStatus   @default(ACTIVE)
  metric_value       Float?
  baseline_value     Float?
  change_percentage  Float?
  recommendation     String?
  metadata           Json?
  created_at         DateTime                @default(now())
  acknowledged_at    DateTime?
  resolved_at        DateTime?

  @@index([studio_id, status])
  @@index([studio_id, severity])
}

model StudioBusinessForecast {
  id                 String                     @id @default(uuid())
  studio_id          String
  studio             Studio                     @relation(fields: [studio_id], references: [id], onDelete: Cascade)
  metric             BusinessForecastMetric
  period             BusinessForecastPeriod
  projected_value    Float
  lower_bound        Float
  upper_bound        Float
  confidence_score   Float
  confidence_level   BusinessForecastConfidence @default(MEDIUM)
  historical_points  Int
  model_used         String
  breakdown          Json?
  created_at         DateTime                   @default(now())

  @@index([studio_id, metric, period])
}

model StudioBusinessAuditLog {
  id                 String                     @id @default(uuid())
  studio_id          String
  studio             Studio                     @relation(fields: [studio_id], references: [id], onDelete: Cascade)
  transaction_id     String?
  transaction        StudioBusinessTransaction? @relation(fields: [transaction_id], references: [id], onDelete: SetNull)
  user_id            String?
  action             String
  entity_type        String                     @default("TRANSACTION")
  entity_id          String
  old_values         Json?
  new_values         Json?
  ip_address         String?
  user_agent         String?
  created_at         DateTime                   @default(now())

  @@index([studio_id, transaction_id])
  @@index([studio_id, created_at])
}
```

---

## 4. REST API Reference

Registered under `/api/v1/business` and `/api/business`:

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/transactions` | List studio business transactions with filtering & pagination |
| `POST` | `/transactions` | Record a new commercial revenue or operational expense transaction |
| `GET` | `/transactions/:id` | Get details of a single transaction |
| `PATCH` | `/transactions/:id` | Update non-void transaction details |
| `POST` | `/transactions/:id/void` | Void a transaction with mandatory `void_reason` |
| `GET` | `/transactions/:id/audit-logs` | Retrieve immutable audit trail for a transaction |
| `GET` | `/transactions/export/csv` | Download formula-safe CSV export |
| `GET` | `/overview` | Studio financial overview KPIs (Revenue, Expenses, Net Profit, Margins, AOV, MoM Growth) |
| `GET` | `/revenue` | Revenue breakdown by category and monthly time trends |
| `GET` | `/expenses` | Operational expense breakdown by category |
| `GET` | `/profitability` | Profitability analysis with service margin comparison |
| `GET` | `/services` | Package & service performance metrics (Revenue, Profit, Margin, ARPJ, Volume) |
| `GET` | `/funnel` | Gallery-to-commercial funnel and turnaround velocity metrics |
| `GET` | `/clients` | Client revenue summaries, lifetime value, and repeat rates |
| `GET` | `/goals` | List studio targets with real-time automatic progress recalculation |
| `POST` | `/goals` | Create a new studio business milestone target |
| `PATCH` | `/goals/:id` | Update target value, status, or milestone window |
| `DELETE` | `/goals/:id` | Delete a goal target |
| `GET` | `/forecast` | Generate deterministic statistical projection |
| `GET` | `/insights` | List actionable anomaly detection insights |
| `POST` | `/insights/scan` | Trigger immediate diagnostic anomaly scan |
| `PATCH` | `/insights/:id/status` | Update insight status (`ACKNOWLEDGED`, `RESOLVED`, `DISMISSED`) |
| `GET` | `/admin/overview` | Super Admin aggregate platform-wide studio business telemetry |

---

## 5. Copilot AI Tool Suite

The AI Copilot has access to grounded business tools with multi-tenant scoping:
1. `getBusinessOverview`: Queries studio financial KPIs and margins.
2. `getRevenueSummary`: Analyzes revenue categories and historical trends.
3. `getExpenseSummary`: Summarizes operating costs and category distribution.
4. `getProfitabilitySummary`: Evaluates profit margins and highest/lowest performing services.
5. `getBusinessGoals`: Tracks milestones and progress against recorded numbers.
6. `getBusinessForecast`: Generates statistical projections for revenue and cash flow.
7. `getBusinessInsights`: Surface financial anomalies and cost surges.
8. `getServicePerformance`: Compares photography packages by average revenue and profit.
9. `getClientBusinessSummary`: Queries client lifetime bookings and order values.

---

## 6. Frontend Navigation & Pages

- `/dashboard/business`: Executive Business Hub & KPI Summary
- `/dashboard/business/revenue`: Revenue Analytics, Category Breakdown & Transaction History
- `/dashboard/business/performance`: Service & Package Commercial Performance
- `/dashboard/business/clients`: Client Lifetime Value (LTV) & Repeat Client Summaries
- `/dashboard/business/profitability`: Profit Margin Analysis & Operational Cost Ratios
- `/dashboard/business/goals`: Business Targets & Auto-Progress Tracker
- `/dashboard/business/forecast`: Statistical Cash Flow & Revenue Forecast Modeling
- `/dashboard/business/insights`: Anomaly Detection & Financial Insights Feed
- `/dashboard/admin/business`: Super Admin Aggregate Studio Economy Telemetry

---

## 7. Verification & QA Status
- **Automated Tests**: 136 / 136 Phase 18 tests passing (100%).
- **Full Monorepo Regression**: All phases (2 through 18) passing with 0 errors.
- **Monorepo Build**: `@pixmatch/database`, `@pixmatch/types`, `@pixmatch/api`, and `@pixmatch/web` built with 0 errors (all 55 static pages generated).
