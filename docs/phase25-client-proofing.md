# PixMatch AI — Phase 25: Client Proofing & Selection

## Overview
Phase 25 establishes a comprehensive, high-security, collaborative client proofing and selection workspace. It bridges culled gallery photos directly into client-facing review portals, providing real-time quota calculations, side-by-side comparison sets, pinpoint retouching coordinates, and photographer review workflows that hand off cleanly into Phase 24 editing queues and Phase 23 production DAGs.

---

## Key Architecture & Core Invariants

### 1. High-Entropy Token Auth & PIN Protection Gate
- **Public URL Token**: Generated via `crypto.randomBytes(32).toString('hex')` (256-bit entropy).
- **Token Hashing**: Tokens are SHA-256 hashed before storage; client portal lookups match `token_hash = sha256(raw_token)` to prevent plain-text exposure in databases or logs.
- **PIN Verification**: Optional studio-configured 4–6 digit alphanumeric PIN codes stored as SHA-256 hashes.
  - Portals verify PIN before disclosing item manifests or photo URLs.
  - First valid PIN entry auto-transitions session status from `ACTIVE` to `CLIENT_REVIEWING`.

### 2. Selection Quotas & Dynamic Extra Pricing Engine
- **Included Quotas**: Studio sets `included_photos_count` (e.g. 20 photos included with package).
- **Selection Boundaries**:
  - `min_photos_count`: Enforces minimum selections required before submission is unlocked.
  - `max_photos_count`: Optional hard ceiling on selections.
- **Extra Photos Billing**:
  - Automatically calculates extra selections: $\max(0, \text{SelectedCount} - \text{IncludedCount})$.
  - Dynamically calculates extra charge in studio currency (e.g. $\$6.00 \times \text{Extras}$).
  - When `allow_extra_purchases = false`, selections beyond the included count block submission.
  - Submissions with extra charges require explicit `accept_extra_charges = true` client confirmation.

### 3. Non-Destructive Proofing Invariant
- Client rejection or de-selection of photos updates proofing item status to `REJECTED` or `UNREVIEWED`.
- Master raw photos, EXIF metadata, and storage objects remain completely intact and unarchived.

### 4. Normalized Coordinate Pinpoint Retouching Feedback
- **Pinpoint Retouch Pins**: Clients and photographers drop visual feedback pins onto photos using normalized $(x, y)$ coordinates in the range $[0.0, 1.0]$ relative to image dimensions.
- **Comment Categories**:
  - `GENERAL`: General image-level feedback.
  - `COLOR_CORRECTION`: Warmth, skin tones, contrast adjustments.
  - `RETOUCH_BODY_OBJECT`: Blemish removal, flyaway hair, object removal.
  - `CROP_ALIGNMENT`: Horizon leveling, aspect ratio adjustment.
  - `LIGHTING_EXPOSURE`: Shadow lifting, highlight recovery.
  - `SPECIAL_INSTRUCTION`: Custom client artistic instructions.
- **Threaded Resolution**: Pinpoint pins support threaded replies (`parent_id`) and status toggling (`is_resolved`, `resolved_at`).

### 5. Side-by-Side Photo Comparison Engine
- Clients group 2 to 4 photos into interactive comparison sets.
- Interactive side-by-side or split slider UI enables side-by-side pixel inspection.
- Selecting a "Winner" automatically tags the winning photo as `SELECTED` within the session.

### 6. Downstream Phase 24 & Phase 23 Handoffs
When a photographer reviews submitted selections with `APPROVED_FOR_EDITING`:
1. **Phase 24 Editing Queue**: Automatically provisions `PhotoEditJob` records for all selected photos in the session.
2. **Phase 23 Production DAG**: Automatically advances `ProjectProduction.current_stage` to `POST_PRODUCTION`.
3. **Audit Logging**: Logs immutable `PhotoProofingAuditLog` entries recording actor, action, and timestamp.

---

## Database Models & Enums

### Enums
- `ProofingSessionStatus`: `ACTIVE`, `CLIENT_REVIEWING`, `SUBMITTED`, `CHANGES_REQUESTED`, `APPROVED`, `EXPIRED`, `CANCELLED`
- `ProofingItemStatus`: `UNREVIEWED`, `FAVORITE`, `SELECTED`, `REJECTED`
- `ProofingCommentType`: `GENERAL`, `COLOR_CORRECTION`, `RETOUCH_BODY_OBJECT`, `CROP_ALIGNMENT`, `LIGHTING_EXPOSURE`, `SPECIAL_INSTRUCTION`
- `ProofingReviewDecision`: `APPROVED_FOR_EDITING`, `REVISION_REQUIRED`, `DIRECT_FULFILLMENT`, `REJECTED`

### Prisma Models
- `PhotoProofingSession`: Core session entity with token hashes, PIN hashes, watermark settings, and deadlines.
- `ProofingSelectionRule`: Quotas, pricing, extra purchase toggles, and currencies.
- `PhotoProofingItem`: Photo mapping with status, rating (1–5), notes, and color flags.
- `PhotoProofingComment`: Image-level and $(x,y)$ pinpoint annotations with threaded discussions.
- `PhotoProofingComparison`: Comparison candidate sets and winner photo declarations.
- `PhotoProofingReview`: Photographer review decisions, review notes, and approval timestamps.
- `PhotoProofingAuditLog`: Immutable audit trail for session lifecycle and client actions.

---

## API Routes & Endpoints

### Public Client Portal
- `GET /portal/proofing/:token`: Retrieve session manifest (gated by PIN).
- `POST /portal/proofing/:token/verify-pin`: Verify client access PIN code.
- `PATCH /portal/proofing/:token/items/:itemId`: Update selection, favorite, rating, or client notes.
- `POST /portal/proofing/:token/items/batch`: Batch update multiple items.
- `POST /portal/proofing/:token/items/:itemId/comments`: Add pinpoint or general comment.
- `POST /portal/proofing/:token/comparisons`: Create side-by-side comparison group.
- `POST /portal/proofing/:token/submit`: Validate quotas and submit final selections.

### Studio Management & Review
- `POST /studios/:studioId/proofing/sessions`: Create proofing session for project/gallery.
- `GET /studios/:studioId/proofing/sessions`: List studio proofing sessions.
- `GET /studios/:studioId/proofing/sessions/:sessionId`: Get complete session details.
- `PATCH /studios/:studioId/proofing/sessions/:sessionId/rules`: Update selection quotas and pricing.
- `POST /studios/:studioId/proofing/sessions/:sessionId/reviews`: Record photographer review decision.
- `GET /studios/:studioId/proofing/analytics`: Studio-wide proofing metrics & turnaround velocity.

---

## Copilot Tool Registry (10 Tools)

| Tool Name | Type | Requires Approval | Purpose |
| :--- | :--- | :--- | :--- |
| `getProofingSessionSummary` | Read | No | Studio-wide proofing statistics & selection velocity |
| `getProofingSession` | Read | No | Query proofing session details, rules, and counts |
| `listProofingSelections` | Read | No | List client favorites and selected photos |
| `getProofingComments` | Read | No | Query pinpoint and general retouch comments |
| `getProofingRuleStatus` | Read | No | Check quota compliance and extra charge totals |
| `createProofingSession` | Mutation | **Yes** | Create new proofing session for gallery/project |
| `updateProofingRules` | Mutation | **Yes** | Update quota limits, extra price, or deadlines |
| `submitClientSelections` | Mutation | **Yes** | Client submission with quota validation |
| `approveProofingSelections` | Mutation | **Yes** | Approve selections & trigger Phase 24/23 jobs |
| `requestProofingChanges` | Mutation | **Yes** | Send revision request back to client |

---

## Automation Triggers (Phase 16 Integration)
- `PROOFING_SESSION_ACTIVATED`: Emitted when studio publishes/activates a session.
- `PROOFING_DEADLINE_APPROACHING`: Emitted 48 hours before session deadline.
- `PROOFING_SELECTIONS_SUBMITTED`: Emitted when client finalizes and submits their selections.
- `PROOFING_SELECTIONS_APPROVED`: Emitted when studio approves selections for editing.
- `PROOFING_EXTRA_PURCHASE_INTENT`: Emitted when client selects photos exceeding included quota.

---

## Test Verification Matrix
- **Test File**: `tests/phase25-client-proofing.test.ts`
- **Execution Command**: `npm run test:phase25`
- **Results**: 115 passed assertions, 0 failed, 82 test groups verified.
- **Regression Suite**: `npm test` passed cleanly with 0 regressions across all Phases 1–25.
