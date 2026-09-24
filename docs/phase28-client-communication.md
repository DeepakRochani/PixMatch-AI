# Phase 28 — Client Communication & Relationship Center

## 1. Executive Summary

Phase 28 delivers a secure, multi-channel, and multi-tenant communication ecosystem for PixMatch AI. It unifies client messaging across in-app threads, emails, SMS, and zero-login client portals while providing studios with collaborative features such as internal staff notes, saved replies with `/shortcuts`, message templates with safe variable interpolation, automated anti-spam defenses, and Copilot AI assistant tooling.

---

## 2. Architecture & Database Schema

### 2.1 Prisma Models & Enums

- **Enums**:
  - `ConversationStatus`: `OPEN`, `PENDING_STUDIO`, `PENDING_CLIENT`, `RESOLVED`, `ARCHIVED`
  - `ConversationPriority`: `LOW`, `NORMAL`, `HIGH`, `URGENT`
  - `MessageSenderType`: `STUDIO_USER`, `CLIENT`, `SYSTEM`
  - `ClientCommunicationChannel`: `IN_APP`, `EMAIL`, `SMS`, `PORTAL`
  - `MessageDeliveryStatus`: `PENDING`, `SENT`, `DELIVERED`, `FAILED`, `BOUNCED`
  - `AttachmentStatus`: `PENDING`, `READY`, `QUARANTINED`, `DELETED`

- **Database Tables**:
  - `ClientConversation`: Multi-tenant thread roots linked to `Studio`, `Client`, `StudioProject`, `Gallery`, and `FulfillmentOrder`.
  - `ClientConversationParticipant`: Studio staff and clients attached to conversation threads.
  - `ClientMessage`: Messages with parent-child threading, channel metadata, delivery status, and `is_internal_note` segregation.
  - `ClientMessageAttachment`: Security-scanned file attachments with whitelist validation and 25MB limits.
  - `ClientMessageRead`: Read receipts tracking per-user and per-client reads.
  - `ClientSavedReply`: Fast-reply canned responses with normalized `/shortcuts` and usage analytics.
  - `ClientMessageTemplate`: Standardized message templates with safe variable interpolation.
  - `ClientCommunicationAssignment`: Staff assignment audit history.
  - `ClientCommunicationAuditLog`: Complete audit trail of conversation, message, template, and staff events.

---

## 3. Backend Services & Security Features

### 3.1 Services (`apps/api/src/modules/communication/`)

1. **`ClientConversationService`**:
   - Thread CRUD with multi-tenant isolation.
   - Status workflow transitions (`OPEN` -> `PENDING_STUDIO` / `PENDING_CLIENT` -> `RESOLVED` / `ARCHIVED`).
   - Priority escalations and tagging (`wedding`, `vip`, `album`, etc.).
   - Participant and staff assignment management.
   - Read state and unread counter resets.

2. **`ClientMessageService`**:
   - Multi-channel message sending (`IN_APP`, `EMAIL`, `SMS`, `PORTAL`).
   - Parent message reply-to hierarchy.
   - Strict internal staff note segregation (`is_internal_note = true` is never returned in client portal queries).
   - Message modification with audit trailing and `is_edited` flag.
   - Soft-deletion with `deleted_at`.
   - Read receipt logging and unread counter increments.

3. **`ClientAttachmentService`**:
   - Strict MIME type whitelisting (`image/jpeg`, `image/png`, `image/webp`, `image/heic`, `application/pdf`, `text/plain`, `application/vnd.openxmlformats-officedocument.wordprocessingml.document`, `application/vnd.openxmlformats-officedocument.spreadsheetml.sheet`).
   - File size ceiling: 25MB (26,214,400 bytes).
   - Filename sanitization protecting against directory traversal (`../`) and control characters.
   - Anti-malware / executable quarantine handling.

4. **`SavedReplyService`**:
   - Quick canned responses with normalized prefix `/` shortcuts.
   - Studio-scoped unique shortcuts (`@@unique([studio_id, shortcut])`).
   - Usage counter incrementation.

5. **`MessageTemplateService`**:
   - Whitelisted variable interpolation: `clientName`, `projectName`, `galleryName`, `orderNumber`, `studioName`, `deliveryStatus`.
   - HTML entity escaping preventing Cross-Site Scripting (XSS).
   - Automatic variable extraction on creation.

6. **`CommunicationAnalyticsService`**:
   - Aggregated KPIs: total conversations, total messages, response time averages, resolution time averages, and distributions by category/status/priority.

7. **`CommunicationAuditService`**:
   - Comprehensive event logging (`CONVERSATION_CREATED`, `MESSAGE_SENT`, `MESSAGE_EDITED`, `STAFF_ASSIGNED`, etc.).

---

## 4. Cross-Phase Integrations

1. **Phase 11 (Preferences & Communications)**:
   - Email suppression honoring and multi-channel preference routing.
2. **Phase 15 (Copilot AI Assistant)**:
   - 6 registered tools:
     - `listClientConversations`
     - `getClientConversation`
     - `getUnansweredClientMessages`
     - `summarizeClientConversation`
     - `draftClientReply` (with prompt-injection defense)
     - `getCommunicationStatus`
3. **Phase 16 (Automation Engine)**:
   - Workflow trigger integration on `CLIENT_MESSAGE_RECEIVED`, `STUDIO_MESSAGE_RECEIVED`, `CONVERSATION_UNANSWERED`, `CONVERSATION_RESOLVED`.
4. **Phase 17 (Client 360 & Intelligence)**:
   - Augmented `Client360Service` returning `communication_summary` and `recent_communications`.
5. **Phase 27 (Client Portal)**:
   - Zero-login token-based client messaging endpoints.
   - Strict exclusion of internal studio notes.

---

## 5. Anti-Spam & Rate Limiting

- **Duplicate Defense**: Messages with identical content from the same sender within 3 seconds are rejected.
- **Velocity Limit**: Capped at 20 messages per minute per sender.

---

## 6. Verification & Test Suite

The master test suite `tests/phase28-client-communication.test.ts` validates all 16 modules:
- Module 1: Conversation Lifecycle & Multi-Tenant Isolation
- Module 2: Participant & Staff Assignment Architecture
- Module 3: Message Creation, Channels, & Threading
- Module 4: Internal Notes Security & Strict Segregation
- Module 5: Rate Limiting & Anti-Spam Defense
- Module 6: Attachment Security & File Whitelist Validation
- Module 7: Message Modification, Soft Deletion, & Audit Trail
- Module 8: Saved Replies (Canned Responses) & Shortcuts
- Module 9: Message Templates & Safe Variable Interpolation
- Module 10: Read Receipts & Unread Counter Calculations
- Module 11: Communication Analytics & Operational KPIs
- Module 12: Cross-Phase Integration — Client 360 Timeline
- Module 13: Cross-Phase Integration — Automation Engine Triggers
- Module 14: Cross-Phase Integration — Client Portal Zero-Login Messaging
- Module 15: Cross-Phase Integration — Copilot AI Assistant Tools
- Module 16: Error Handling, Validation, IDOR & Edge Cases

**Test Outcome:** 184 / 184 assertions passing (100% pass rate).
