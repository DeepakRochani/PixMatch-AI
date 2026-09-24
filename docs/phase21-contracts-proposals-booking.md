# PixMatch AI — Phase 21: Contracts, Proposals & Client Booking Portal

## Overview & Architecture

Phase 21 introduces an end-to-end commercial lifecycle engine for photographers and creative studios:

```
LEAD (Phase 20)
  ↓
PROPOSAL (Draft → Sent → Viewed → Accepted/Rejected)
  ↓
CONTRACT (Draft → Sent → Viewed → Electronically Acknowledged)
  ↓
APPROVAL & BOOKING CONFIRMATION (Atomic Transaction)
  ↓
PAYMENT SCHEDULE (Retainer / Installments → Phase 18 Revenue)
  ↓
PROJECT & OPERATIONS (Phase 20 Scaffolding, Tasks & Milestones)
```

The system empowers photographers to maintain complete control while providing clients with a responsive, frictionless, mobile-first portal experience requiring no full PixMatch account sign-up.

---

## 1. Proposal Management & Revision Architecture

### Schema & Data Structures
- **`StudioProposal`**: Central entity capturing the quotation with tenant-scoped isolation (`studio_id`), collision-safe auto-numbering (`PROP-YYYY-XXXX-HASH`), status lifecycle (`DRAFT`, `SENT`, `VIEWED`, `ACCEPTED`, `REJECTED`, `EXPIRED`, `VOIDED`), line-item financial subtotals, discounts, tax calculations, and optional client negotiation terms.
- **`StudioProposalItem`**: Itemized service definitions (Photography Packages, Extra Photographers, Drone Coverage, Fine Art Albums) with unit pricing, quantities, discounts, and optional client selection flags.
- **`StudioProposalRevision`**: Append-only snapshot ledger recording immutable JSON versions (`revision_number`, `snapshot_data`, `created_by`, `created_at`) whenever accepted or sent proposals undergo material modifications.

### Unique Collision-Safe Numbering
- Uses a deterministic combination of year prefix, zero-padded studio sequence, and high-entropy cryptographic hex suffixes (e.g. `PROP-2026-0001-A4F9`).
- Transaction-protected and isolated per tenant.

---

## 2. Contract Lifecycle, Templates & Integrity

### Schema & Data Structures
- **`StudioContract`**: Document record tracking legal terms, template linkages, client identifiers, project linkages, and signing status (`DRAFT`, `SENT`, `VIEWED`, `SIGNED`, `DECLINED`, `EXPIRED`, `VOIDED`).
- **`StudioContractTemplate`**: Reusable contract archetypes categorised by shoot type (`WEDDING`, `PORTRAIT`, `COMMERCIAL`, `EVENT`, `GENERAL`), with automatic extraction of template variables.

### Safe Template Variables
- Supports strict white-listed placeholder substitutions:
  - `{{studio_name}}`
  - `{{client_name}}`
  - `{{client_email}}`
  - `{{project_name}}`
  - `{{project_date}}`
  - `{{project_location}}`
  - `{{proposal_number}}`
  - `{{contract_number}}`
  - `{{total_amount}}`
  - `{{deposit_amount}}`
  - `{{payment_due_date}}`
- Unknown variables and executable script tags are stripped and sanitized during rendering.

### Electronic Acknowledgement & SHA-256 Signature Integrity
- Captures client legal name, email, IP address, user-agent metadata, and exact timestamp upon acknowledgement.
- Generates an immutable SHA-256 cryptographic audit hash across:
  $$\text{Hash} = \text{SHA-256}(\text{contract\_id} \,\|\, \text{content} \,\|\, \text{signer\_name} \,\|\, \text{signer\_email} \,\|\, \text{signed\_at})$$
- Once acknowledged, contracts become strictly immutable. Modifications require voiding and drafting a new version.

---

## 3. Public Client Portals & Security

### Routes
1. **Proposal Portal**: `/portal/proposal/[token]`
2. **Contract Portal**: `/portal/contract/[token]`
3. **Booking Portal**: `/portal/booking/[token]`

### Cryptographic Token Security
- Tokens are high-entropy 32-byte cryptographically random hex strings.
- Stored hashed at rest using SHA-256 (`token_hash`), preventing plaintext leakage in database dumps.
- Enforces strict revocation flags and expiration timestamps.
- Zero IDOR vulnerabilities: public endpoints authorize solely via validated tokens, never accepting raw `studio_id` or `client_id` parameters.

---

## 4. Atomic Booking Confirmation & Operational Scaffolding

### Workflow
When a proposal is accepted and a contract is signed, the photographer confirms the booking:
1. **Atomic Transaction**:
   - Transitions `StudioLead` status to `BOOKED` (or `WON`).
   - Creates or updates `StudioProject` status to `BOOKED`.
   - Auto-scaffolds default operational milestones (Preparation, Production, Curation & AI Processing, Final Gallery Delivery).
   - Generates structured `ProjectPaymentSchedule` installments.
   - Dispatches transactional booking confirmation emails via `EmailService`.

---

## 5. Payment Schedule & Financial Reconciliation

### Structured Installments
- Supports flexible payment schedules (Retainer/Deposit, Milestone, Delivery Balance, Custom).
- Automatic status transitions: `PENDING`, `PARTIAL`, `PAID`, `OVERDUE`, `CANCELLED`.
- **Phase 18 Integration**: Recording a payment creates an audited `StudioBusinessTransaction` income record. Unpaid proposals and contracts never count as realized business revenue.

---

## 6. Multi-System Integrations

### Email & Notification Integration (Phase 11)
- Leverages `EmailService` for all transactional messages: proposal invitations, client acceptances, contract signing alerts, booking confirmations, and payment reminders.
- Respects `EmailSuppression` and `NotificationPreference`.

### Copilot Integration (Phase 15)
8 Phase 21 tools registered with the Copilot AI engine:
1. `listProposals`: List studio proposals with status and client filtering.
2. `createProposal`: Draft itemized proposals.
3. `sendProposal`: Send proposals and generate public portal links.
4. `listContracts`: Retrieve studio contracts.
5. `createContract`: Scaffold contracts from templates and proposals.
6. `sendContract`: Dispatch contracts for electronic acknowledgement.
7. `confirmBooking`: Atomically confirm bookings and generate projects.
8. `getBookingPipelineSummary`: Summarize active proposals, contracts, and revenue.

### Automation Engine (Phase 16)
- Event triggers: `PROPOSAL_SENT`, `PROPOSAL_ACCEPTED`, `CONTRACT_SIGNED`, `BOOKING_CONFIRMED`, `PAYMENT_DUE`.

### Client 360 & CRM (Phase 17)
- Client profile views aggregate complete proposal histories, signed contracts, payment schedules, and verified portal engagement.

### Business & Growth Intelligence (Phases 18 & 19)
- Tracks commercial metrics: proposal acceptance rates, time-to-booking, average proposal value, and booking pipeline conversion funnels.

---

## 7. Legal Disclaimer & Limitations

> [!IMPORTANT]
> **Legal Disclaimer:**
> PixMatch AI provides document workflow tools, templates, and electronic acknowledgement mechanisms. PixMatch does not provide legal advice. Photographers and studios should review contracts and terms with an appropriate legal professional for their jurisdiction and business requirements.
