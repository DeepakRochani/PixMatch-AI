# Phase 19: AI Business Growth & Marketing Intelligence

## Overview
Phase 19 equips **PixMatch AI** with a proactive, transparent, and compliant business growth engine for professional photography studios. It leverages historical client and gallery data to identify revenue expansion and client re-engagement opportunities without relying on synthetic assumptions or violating privacy boundaries.

---

## Core Architectural Principles & Hard Constraints

1. **Strict Human Approval Gate:**
   - No marketing campaign or communication can be dispatched or scheduled without explicit studio human approval (`approved_by`, `approved_at`).
   - Any subsequent modification to a campaign's title, subject, body, or audience segmentation criteria **immediately resets approval to `null`** and forces status back to `DRAFT`.

2. **Zero Fake Financial Projections & Predictive Guarantees:**
   - Revenue and performance metrics reflect only real, verified transactions and attributed conversions.
   - Gallery views, downloads, or favorites are never treated as assumed income.
   - Predictive outcome probabilities or guaranteed conversion percentages are strictly prohibited. The `confidence_score` represents transparent **evidence quality** (0.00–1.00).

3. **Biometric Isolation Guarantee:**
   - Facial recognition data, embeddings, and face vectors are **strictly isolated** from marketing and growth targeting.
   - Segmentation is conducted purely on non-biometric business metadata (e.g., booking recency, package history, milestone intervals).

4. **Suppression, Consent & Unsubscribe Safety:**
   - Integrated with Phase 11 `EmailSuppression`, `NotificationPreference`, and unsubscribe mechanisms.
   - Suppressed or unsubscribed clients are automatically filtered during recipient resolution and validated again at real-time dispatch.

5. **Mathematical Safety & Zero-Division Protection:**
   - Delivery rate, open rate, click rate, conversion rate, unsubscribe rate, bounce rate, and campaign ROI calculations always return `null` instead of `NaN` or `Infinity` when base counts are zero.

6. **Formula-Safe CSV Export:**
   - Recipient and campaign data exported to CSV sanitize cells starting with `=`, `+`, `-`, `@`, `\t`, or `\r` to prevent spreadsheet injection attacks.

---

## Data Models & Schema (`packages/database/prisma/schema.prisma`)

### Enums
- `GrowthOpportunityType`: `CLIENT_REACTIVATION`, `SEASONAL_UPSELL`, `PACKAGE_UPGRADE`, `MILESTONE_ANNIVERSARY`, `REFERRAL_REQUEST`, `PRINT_PROMOTION`, `HOLIDAY_SPECIAL`, `REVIEW_REQUEST`.
- `GrowthOpportunityPriority`: `LOW`, `MEDIUM`, `HIGH`, `CRITICAL`, `URGENT`.
- `GrowthOpportunityStatus`: `OPEN`, `IN_PROGRESS`, `DISMISSED`, `COMPLETED`, `EXPIRED`.
- `MarketingCampaignType`: `EMAIL`, `SMS`, `PORTAL_BANNER`, `IN_APP_NOTIFICATION`.
- `MarketingCampaignStatus`: `DRAFT`, `PENDING_APPROVAL`, `APPROVED`, `SCHEDULED`, `SENDING`, `SENT`, `PAUSED`, `CANCELLED`, `FAILED`.
- `MarketingRecipientStatus`: `PENDING`, `QUEUED`, `SENT`, `DELIVERED`, `OPENED`, `CLICKED`, `CONVERTED`, `BOUNCED`, `UNSUBSCRIBED`, `SUPPRESSED`, `FAILED`.

### Models
- `GrowthOpportunity`: Studio-level AI-identified revenue opportunity with confidence scores, recommended actions, and expiration dates.
- `MarketingCampaign`: Campaign specification with audience segmentation criteria, email templates, human approval audit fields, and aggregated deliverability counters.
- `MarketingCampaignRecipient`: Individual recipient tracking with HMAC signed open/click tokens, status transitions, and attributed conversion values.

---

## Backend Services (`apps/api/src/modules/growth/`)

1. **`GrowthOpportunityService`**:
   - `scanOpportunities(studioId)`: Analyzes client booking histories and seasonal trends to generate actionable opportunities.
   - `listOpportunities(studioId, filters)`: Paginated and filterable opportunity retrieval.
   - `updateOpportunityStatus(studioId, id, status)`: Tenant-isolated state updates.

2. **`ClientReactivationService`**:
   - `getReactivationCandidates(studioId, filters)`: Computes deterministic 0–100 re-engagement scores based on spend, inactivity days, and previous gallery counts while checking real-time suppression.

3. **`MarketingCampaignService`**:
   - `createDraft(studioId, userId, dto)`: Creates draft campaigns with audience preview.
   - `updateCampaign(studioId, id, dto)`: Updates campaign specs and strictly resets approval state.
   - `approveCampaign(studioId, id, userId)`: Records human approval.
   - `previewRecipients(studioId, criteria)`: Resolves eligible clients respecting suppression lists.
   - `exportRecipientsCsv(studioId, id)`: Formula-safe CSV export.

4. **`CampaignExecutionService`**:
   - `dispatchCampaign(studioId, id)`: Executes sending via `EmailService.sendEmail` with unsubscribe tokens and HMAC tracking.
   - `recordOpen(recipientId, token)` / `recordClick(recipientId, token, targetUrl)`: HMAC-authenticated engagement tracking.
   - `recordConversion(recipientId, value, type)`: Attributed revenue tracking.

5. **`GrowthPerformanceService`**:
   - `getOverview(studioId)`: Studio-level growth KPIs, total attributed revenue, active opportunities, and seasonal alerts.
   - `getCampaignPerformance(studioId, campaignId)`: Deep funnel breakdown and safe ROI calculations.
   - `listGoals(studioId)` / `createGoal(studioId, dto)`: Business growth milestone tracking.

6. **`ServiceGrowthService`**:
   - `getServiceGrowth(studioId)`: Package-level revenue breakdown and quarterly seasonal patterns (Q1-Q4).

7. **`GrowthAdminService`**:
   - `getGrowthTelemetry()`: Platform-wide adoption rates, top growth studios, and aggregated revenue.

8. **`Copilot Integration` (`apps/api/src/modules/copilot/`)**:
   - Registered 8 growth tools: `getGrowthOpportunities`, `scanGrowthOpportunities`, `getClientReactivations`, `getMarketingCampaigns`, `getCampaignPerformance`, `getGrowthPerformanceOverview`, `getServiceGrowthAnalysis`, `getSeasonalDemandPatterns`.
   - Deterministic conversational growth intents for natural language queries like *"Which past clients should we re-engage for spring portraits?"*.

---

## Frontend Web Application (`apps/web/`)

- **`/dashboard/growth`**: Growth Command Center featuring live KPIs, opportunity cards, quick actions, and seasonal alerts.
- **`/dashboard/growth/reactivation`**: Client Reactivation Hub with deterministic 0–100 score distribution, suppression status badges, and 1-click campaign creation.
- **`/dashboard/growth/campaigns`**: Campaign Management List with approval status badges, engagement rates, and recipient counts.
- **`/dashboard/growth/campaigns/new`**: AI Campaign Builder with client preview and suppression counters.
- **`/dashboard/growth/campaigns/[id]`**: Campaign Detail with human approval controls, HMAC test simulator, and recipient table.
- **`/dashboard/growth/services`**: Services & Seasonal Demand dashboard displaying quarterly volume/revenue shares (Q1–Q4).
- **`/dashboard/growth/performance`**: Performance Analytics with zero-division protected KPIs, net revenue, ROI metrics, and growth goals.
- **`/dashboard/admin/growth`**: Super Admin Platform Growth Telemetry.

---

## Verification & Testing
- **Test Suite:** `npm run test:phase19` (129 passing assertions across 14 test groups).
- **Monorepo Build:** `npm run build` (Clean build across `@pixmatch/types`, `@pixmatch/database`, `@pixmatch/api`, `@pixmatch/web` with 62 static Next.js routes).
