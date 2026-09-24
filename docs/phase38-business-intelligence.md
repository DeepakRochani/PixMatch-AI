# Phase 38: Studio Business Intelligence, Forecasting & Decision Intelligence 2.0

## 1. Executive Summary

Phase 38 delivers a comprehensive, read-only analytics, forecasting, and decision-intelligence platform for creative photography and videography studios. The system aggregates real-time data across all operational and financial subsystems (Phases 18–37) to calculate accurate key performance indicators (KPIs), generate statistical revenue forecasts, model deterministic cash flow horizons, classify project delivery and financial risks, analyze studio-wide team capacity, and simulate isolated what-if business scenarios.

---

## 2. Core Architectural Principles & Invariants

1. **Non-Negotiable Read-Only Boundary**:
   - The BI subsystem never triggers autonomous mutations (no automatic price adjustments, no invoice generation, no tax filings, and no ledger postings).
   - All scenario simulations run in isolated in-memory contexts with `is_simulation: true` and the `SCENARIO_NOT_ACTUAL` label.
2. **Strict Multi-Tenant Scoping**:
   - Every KPI, query, forecast, and report is strictly scoped by `studio_id`.
   - Cross-tenant leakage is strictly prevented and validated across all endpoints and database queries.
3. **Integer Minor Unit Currency & Basis Points**:
   - 100% of financial values are represented in integer minor units (paise/cents) to eliminate floating-point arithmetic errors.
   - All margin and utilization percentages are stored and calculated in basis points ($1 \text{ bps} = 0.01\%$, $10000 \text{ bps} = 100\%$).
4. **Division-by-Zero Safety**:
   - Period comparison formula: $\text{change} = \text{current} - \text{previous}$; $\text{percentage} = (\text{change} / |\text{previous}|) \times 100$.
   - When $\text{previous} = 0$, `percentage_change` returns `null` (never `NaN` or `Infinity`).
   - Break-even formula safely returns `null` with a descriptive risk message when contribution margin rate $\le 0$.
5. **Team Capacity Intelligence Without Individual Ranking**:
   - Capacity metrics calculate studio-wide aggregate workload hours, available hours, and capacity utilization.
   - Strictly NO individual employee performance rankings ("best/worst employee") are exposed.
6. **CSV Formula Injection Defense**:
   - All CSV export cells starting with dangerous characters (`=`, `+`, `-`, `@`, `\t`, `\r`, `\n`) are sanitized with a leading single quote (`'`) to neutralize spreadsheet formula execution vulnerabilities.
7. **Production Truth & Zero Mock Fallbacks**:
   - When data is insufficient or empty, the system displays `"No data available"` or `"Insufficient historical data"` rather than fabricated demo figures.

---

## 3. Data Sources & Source of Truth Matrix

| KPI / Intelligence Dimension | Source Subsystem | Source Entity / Table |
|---|---|---|
| Invoiced Revenue & Gross Billed | Phase 36 Invoicing & Payments | `StudioInvoice` (`total_minor`, `status`, `issue_date`) |
| Collected Cash & Inflow Velocity | Phase 36 Invoicing & Payments | `StudioInvoicePayment` (`amount_minor`, `payment_date`) |
| Accounts Receivable (Open / Overdue) | Phase 36 Invoicing & Payments | `StudioInvoice` (`balance_minor`, `due_date`, `status`) |
| Direct Costs (COGS) & Operating Expenses | Phase 33 & 34 Financial Ops & Ledger | `StudioExpense` (`amount_minor`, `is_cogs`, `category`) |
| Cash Account Balances | Phase 34 Financial Accounting | `StudioFinancialAccount` (`current_balance_minor`) |
| Tax Liabilities & Filings | Phase 35 Tax & Compliance | `StudioTaxPeriod` (`tax_liability_minor`, `due_date`) |
| Active Projects & Margins | Phase 20 Studio Operations | `StudioProject` (`revenue_minor`, `cogs_minor`, `budget_minor`) |
| Sales Pipeline & Lead Conversion | Phase 29 CRM | `StudioLead` (`estimated_value_minor`, `probability_pct`, `status`) |
| Confirmed Bookings & Inflows | Phase 22 Studio Scheduling | `StudioBookingRequest` (`total_minor`, `booking_date`, `status`) |
| Studio Workforce & Capacity | Phase 31 Team Management | `StudioMember` (`is_active`, `tasks`, `calendar_events`) |

---

## 4. Forecasting Engines

### 4.1 Statistical Revenue Forecasting (`RevenueForecastService`)

The engine supports 4 statistical models configured per studio preference:
- **Weighted Moving Average (WMA)**: Applies linear weighting ($w_i = i / \sum i$) giving higher weight to recent months.
- **Simple Moving Average (SMA)**: Unweighted average of trailing $N$ historical months ($N=3, 6$).
- **Exponential Smoothing (EXP)**: Computes $S_t = \alpha \cdot Y_t + (1-\alpha) \cdot S_{t-1}$ with smoothing parameter $\alpha = 0.3$.
- **Linear Trend Regression (LINEAR_TREND)**: Fits least-squares linear trend $y = mx + b$ over historical periods.

Confidence levels are assigned based on history depth:
- $\ge 6$ historical months $\rightarrow$ `HIGH` confidence.
- $3–5$ historical months $\rightarrow$ `MEDIUM` confidence.
- $< 3$ historical months $\rightarrow$ `LOW` confidence with explicit warning and null error bounds.

### 4.2 Deterministic Multi-Horizon Cash Flow (`CashForecastService`)

Projects cash balances across 4 deterministic time horizons:
- **7-Day Outlook**: Known receivables and payables due within 7 days.
- **30-Day Outlook**: Scheduled invoices, booking deposits, and fixed monthly operational burn.
- **60-Day Outlook**: Confirmed project milestones, scheduled expenses, and quarterly tax liabilities.
- **90-Day Outlook**: Weighted pipeline collections, recurring subscriptions, and baseline payroll.

**Deficit Detection**: When projected ending cash drops below zero or the configured `minimum_cash_reserve_minor`, `cash_risk_detected: true` is raised with actionable shortfall notes.

---

## 5. Project Risk & Performance Engine (`ProjectRiskService`)

Each project is evaluated against 5 risk vectors to assign an operational status:
- **`ON_TRACK`**: Gross profit margin $\ge 30\%$, budget variance within 10%, deadline in future.
- **`FINANCIAL_RISK`**: Profit margin $< 20\%$ or actual costs exceed allocated budget by $> 10\%$.
- **`DELIVERY_RISK`**: Current date past scheduled project deadline with unfinished tasks.
- **`PAYMENT_RISK`**: Invoiced milestone overdue by $> 15$ days with high outstanding balance.
- **`COMPLETED`**: All milestones delivered and fully collected.

---

## 6. Team Capacity Intelligence (`CapacityIntelligenceService`)

- Computes total studio capacity: $\text{Available Hours} = \text{Active Members} \times 22 \text{ days} \times 8 \text{ hrs} - \text{Approved Leave Hours}$.
- Aggregates workload commitments: $\text{Allocated Hours} = \text{Assigned Task Hours} + \text{Scheduled Shoot Hours}$.
- Computes utilization: $\text{Utilization BPS} = (\text{Allocated Hours} / \text{Available Hours}) \times 10000$.
- Evaluates capacity status: `AVAILABLE` ($<70\%$), `OPTIMAL` ($70\%-85\%$), `CONSTRAINED` ($85\%-100\%$), `OVERLOADED` ($>100\%$).
- Preserves member privacy by suppressing individual employee rankings.

---

## 7. Isolated Scenario Simulator & Break-Even Analysis

### 7.1 What-If Scenario Planner (`ScenarioPlannerService`)
Allows studio owners to test business adjustments in a safe sandbox:
- **Price Adjustments**: Changes in average project pricing ($+10\%, +20\%, -10\%$).
- **Volume Fluctuations**: Projected changes in booking volume.
- **Cost Structure Adjustments**: Direct COGS adjustments vs fixed overhead changes.
- **Marketing Spend & Acquisition**: Simulates additional ad budget and conversion yields.

### 7.2 Break-Even Engine (`BreakEvenService`)
- $\text{Contribution Margin Rate} = 1 - (\text{Variable Cost Ratio BPS} / 10000)$.
- $\text{Break-Even Revenue} = \text{Fixed Costs} / \text{Contribution Margin Rate}$.
- $\text{Break-Even Projects} = \lceil \text{Break-Even Revenue} / \text{Average Project Value} \rceil$.
- If Contribution Margin Rate $\le 0$, the engine returns `is_achievable: false`, `break_even_revenue_minor: null`, and a warning message.

---

## 8. Copilot Tool Registry & Guardrails

Phase 38 registers 21 specialized tools within the Copilot Tool Registry:
- **18 Read-Only Intelligence Tools**: `get_business_dashboard`, `get_business_kpis`, `get_revenue_trend`, `get_profit_trend`, `get_cash_forecast`, `get_revenue_forecast`, `get_pipeline_forecast`, `get_booking_forecast`, `get_project_performance`, `get_project_risks`, `get_team_capacity`, `get_business_alerts`, `get_decision_insights`, `compare_business_periods`, `run_business_scenario`, `get_break_even_analysis`, `get_business_scorecard`, `get_management_summary`.
- **3 Draft Mutation Tools**: `draft_management_summary`, `draft_business_review`, `draft_accountant_questions`.
  - Configured with `isMutation: true` and `requiresApproval: true` to prevent unapproved automated distribution.

---

## 9. Verification & Regression Metrics

- **Phase 38 Master Test Suite**: 783 passing assertions across 10 sections.
- **Phase 28–37 Regression Test Suite**: 100% pass rate across all financial, CRM, team, and communications modules.
- **Zero Type & Schema Errors**: Clean build verified across `@pixmatch/types`, `@pixmatch/database`, `@pixmatch/api`, and `@pixmatch/web`.
